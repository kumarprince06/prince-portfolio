import type { Lesson } from "../types";

export const streamsApi: Lesson = {
  slug: "streams-api",
  date: "2026-10-29",
  title: "Streams API",
  description:
    "How Java 8 streams really work: lazy pipelines, intermediate and terminal operations, short-circuiting, primitive streams and parallel streams, traced down to the linked pipeline stages and the Sink chain inside the JDK.",
  tags: ["Core Java", "Java 8", "Streams", "Functional Programming", "Collections"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "After an exam, a teacher takes the pile of answer sheets, keeps only the ones with 50 or more marks, and counts them. Pick up, keep some, count. Each step is simple, and they happen one after another.",
        },
        {
          type: "paragraph",
          text: "A **stream** lets me write that kind of job the same way in Java: start from a list, add steps like `filter` (keep some) and `map` (change each one), and finish with one step like `count` or `collect` that gives me the answer. I describe **what** I want, and the stream does the looping for me.",
        },
        {
          type: "paragraph",
          text: "I use streams whenever I'd otherwise write a `for` loop with an `if` inside and a counter outside. The stream version reads like the sentence I'd say out loud.",
        },
        {
          type: "code",
          language: "java",
          code: `List<Integer> marks = List.of(45, 82, 67, 30, 91);
long passed = marks.stream()
        .filter(mark -> mark >= 50)
        .count();
System.out.println("Passed: " + passed);`,
        },
        {
          type: "output",
          text: `Passed: 3`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "A stream is a source, a few steps, and one final step that gives the answer, and nothing runs until that final step.",
        },
      ],
    },
    {
      title: "What the Streams API Is",
      blocks: [
        {
          type: "paragraph",
          text: "Before Java 8, every \"take this list, keep some items, change them, add them up\" job was a `for` loop with an `if` inside and a running total outside. It works, but the **what** (keep the completed trips, sum their fares) is buried inside the **how** (an index, a temporary list, a mutable total).",
        },
        {
          type: "paragraph",
          text: "A **stream** is a way to describe that job as a pipeline of steps: a source, zero or more **intermediate operations** like `filter` and `map`, and exactly one **terminal operation** like `sum`, `collect` or `forEach` that produces the result. The stream doesn't store anything. It pulls elements from the source, pushes them through the steps, and is used up when the terminal operation finishes.",
        },
        {
          type: "code",
          language: "java",
          code: `double total = trips.stream()                       // source
        .filter(t -> t.status().equals("COMPLETED"))    // intermediate
        .mapToDouble(Trip::fare)                        // intermediate
        .sum();                                         // terminal`,
        },
        {
          type: "paragraph",
          text: "Three things make streams more than \"a shorter loop\", and they're the core of this lesson. They are **lazy**: nothing runs until the terminal operation. They are **fused**: each element goes through all the steps before the next element starts, so there's no temporary list between `filter` and `map`.",
        },
        {
          type: "paragraph",
          text: "And they can **short-circuit**: `findFirst` or `limit` stop pulling from the source as soon as they have enough. I prove all three with real traces below, and then open the JDK classes that make it happen.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Streams arrived in Java 8 (March 2014), together with lambdas, as part of JSR 335 (\"Project Lambda\"). The two were designed as a pair: lambdas without a library to pass them to would have been a curiosity, and a pipeline library without lambdas would have needed an anonymous inner class for every `filter`.",
        },
        {
          type: "paragraph",
          text: "The ideas weren't new. Unix pipes (`cat orders | grep tea | wc -l`) had been chaining small steps for decades. Functional languages had `map`, `filter` and `reduce`. C# had LINQ since 2007, and Scala's collections had lazy views. What Java needed was a way to bolt this onto twenty years of existing collections without breaking any of them.",
        },
        {
          type: "paragraph",
          text: "Two Java 8 decisions made that possible. **Default methods** let `Collection` gain a `stream()` method without breaking every class that implements it. And the team chose to put the pipeline in a **separate** type, `java.util.stream.Stream`, rather than adding lazy `filter` and `map` methods to `List` itself. A `List` stays an eager, stored collection. A `Stream` is a one-shot, lazy view of a computation. The parallel side was built on the Fork/Join framework that Java 7 had already shipped.",
        },
        {
          type: "paragraph",
          text: "Later versions kept adding to it: `takeWhile`, `dropWhile`, `ofNullable` and a three-argument `iterate` in Java 9, `Stream.toList()` in Java 16, and `mapMulti` in Java 16 too. I mark each one with its version when it shows up.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a stream as the assembly line at a busy tea stall.",
        },
        {
          type: "list",
          items: [
            "The **source** is the order queue. Orders come off it one at a time.",
            "Each **intermediate operation** is a person on the line. One checks the order is valid (`filter`), one pours the tea (`map`), one adds sugar (`map` again). Each person handles one cup and passes it on.",
            "The **terminal operation** is the counter where cups are handed out or the cash is totalled. Here's the key part: until a customer is actually waiting at the counter, nobody on the line moves. Setting up the line is free. That's laziness.",
            "One cup travels the whole line before the next cup starts. Nobody pours fifty cups and leaves them on a tray for the next person. That's loop fusion.",
            "If the customer only wanted the first cup of masala tea, the line stops the moment that cup is ready, even if a hundred orders are still in the queue. That's short-circuiting.",
            "The odd one out is the person who has to **sort** cups by size. They can't pass anything on until they've seen every cup. That's a stateful operation, and it behaves differently.",
          ],
        },
        {
          type: "paragraph",
          text: "And once the stall closes for the day, it closes. To serve again tomorrow you set up a new line. A stream can be used only once.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Sources",
        },
        {
          type: "table",
          headers: ["Source", "Example", "Notes"],
          rows: [
            ["A collection", "`list.stream()`, `set.parallelStream()`", "The most common. Default method on `Collection`"],
            ["An array", "`Arrays.stream(arr)`, `Stream.of(a, b, c)`", "`Arrays.stream(int[])` gives an `IntStream`"],
            ["A range", "`IntStream.range(0, 10)`", "`range` excludes the end, `rangeClosed` includes it"],
            ["Infinite", "`Stream.iterate(1, n -> n + 1)`, `Stream.generate(supplier)`", "Must be cut with `limit`, `takeWhile` or a short-circuit op"],
            ["Files and text", "`Files.lines(path)`, `str.chars()`, `pattern.splitAsStream(s)`", "`Files.lines` holds a file open: use try-with-resources"],
            ["Nothing or one", "`Stream.empty()`, `Stream.ofNullable(x)` (Java 9)", "`ofNullable` is empty for `null`, one element otherwise"],
          ],
        },
        {
          type: "heading",
          text: "Intermediate versus terminal",
        },
        {
          type: "paragraph",
          text: "An **intermediate** operation returns another `Stream` and does no work yet. A **terminal** operation returns something that isn't a stream (a number, a list, an `Optional`, or `void`) and is the trigger that makes the whole pipeline run. The quick test: if the method returns `Stream`, `IntStream`, `LongStream` or `DoubleStream`, it's intermediate.",
        },
        {
          type: "table",
          headers: ["Kind", "Operations"],
          rows: [
            ["Intermediate, stateless", "`filter`, `map`, `mapToInt`/`mapToObj`/..., `flatMap`, `peek`, `boxed`, `mapMulti` (16)"],
            ["Intermediate, stateful", "`distinct`, `sorted`, `limit`, `skip`, `takeWhile` (9), `dropWhile` (9)"],
            ["Terminal", "`forEach`, `forEachOrdered`, `collect`, `reduce`, `count`, `min`, `max`, `sum`, `average`, `toArray`, `toList` (16)"],
            ["Terminal, short-circuiting", "`anyMatch`, `allMatch`, `noneMatch`, `findFirst`, `findAny`"],
            ["Intermediate, short-circuiting", "`limit`, `takeWhile`"],
          ],
        },
        {
          type: "heading",
          text: "Stateless versus stateful",
        },
        {
          type: "paragraph",
          text: "A **stateless** operation can decide what to do with an element by looking at that element alone. `filter` asks \"is this cup valid?\" and doesn't care about any other cup. A **stateful** operation needs to remember something about elements it has already seen.",
        },
        {
          type: "paragraph",
          text: "`distinct` remembers every element so far, `limit` counts how many it has let through, and `sorted` has to see **all** of them before it can release the smallest. Stateful operations are where memory use and parallel cost come from.",
        },
        {
          type: "heading",
          text: "Short-circuiting",
        },
        {
          type: "paragraph",
          text: "A short-circuiting operation can finish without looking at the whole source. `anyMatch` stops at the first `true`, `findFirst` at the first element, `limit(5)` after five. This is what makes an infinite source like `Stream.iterate` usable at all.",
        },
        {
          type: "heading",
          text: "The rules a lambda in a stream must follow",
        },
        {
          type: "list",
          items: [
            "**Non-interfering:** don't modify the source while the stream runs. Adding to the list you're streaming over throws `ConcurrentModificationException` (shown in Common Mistakes).",
            "**Stateless where possible:** a `map` whose result depends on some outside counter gives different answers in parallel.",
            "**No side effects that matter:** `peek` and `forEach` are for things like logging. Building results by adding to an outside list from inside a lambda is the classic parallel bug. Use `collect` instead.",
            "**Associative** for `reduce`: `(a + b) + c` must equal `a + (b + c)`, and the identity must really be an identity (`0` for sum, not `10`).",
          ],
        },
        {
          type: "heading",
          text: "Primitive streams",
        },
        {
          type: "paragraph",
          text: "`Stream<Integer>` holds `Integer` objects, so every number is boxed. `IntStream`, `LongStream` and `DoubleStream` hold raw `int`, `long` and `double` values and add number-only methods: `sum()`, `average()`, `summaryStatistics()`, `range()`. I move between the worlds with `mapToInt`/`mapToDouble` (objects to primitives), `boxed()` (primitives to wrapper objects) and `mapToObj` (primitives to any object).",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/stream-pipeline.svg",
          alt: "Stream pipeline of orders through filter, map, sorted and collect; intermediate stages are lazy, and when collect runs each order flows one at a time through the sink chain, with sorted buffering everything before emitting",
          caption: "Intermediate operations only build stages; `collect` starts the work, items flow one by one, and `sorted` is a barrier that must see everything first.",
        },
        {
          type: "paragraph",
          text: "My old notes said \"a stream is like an iterator\". That's half true, and the wrong half matters. An iterator is **pulled** by the caller one `next()` at a time. A stream pipeline is **pushed**: the terminal operation hands the source a chain of consumers, and the source pushes each element into the front of that chain. To see this for real, I started with laziness.",
        },
        {
          type: "heading",
          text: "Proof 1: nothing runs before the terminal operation",
        },
        {
          type: "code",
          language: "java",
          title: "LazyTrace.java",
          code: `import java.util.List;
import java.util.stream.Stream;

public class LazyTrace {
    public static void main(String[] args) {
        List<String> orders = List.of("tea", "coffee", "samosa", "juice");

        Stream<String> pipeline = orders.stream()
                .filter(o -> { System.out.println("filter " + o); return o.length() > 3; })
                .map(o -> { System.out.println("map    " + o); return o.toUpperCase(); });
        System.out.println("pipeline built, nothing ran yet");

        pipeline.forEach(o -> System.out.println("served " + o));
    }
}`,
        },
        {
          type: "output",
          text: `pipeline built, nothing ran yet
filter tea
filter coffee
map    coffee
served COFFEE
filter samosa
map    samosa
served SAMOSA
filter juice
map    juice
served JUICE`,
        },
        {
          type: "paragraph",
          text: "Two things in that output are the whole idea of streams:",
        },
        {
          type: "list",
          items: [
            "The first line printed is \"pipeline built\". Calling `filter` and `map` only **described** the work. The lambdas didn't run until `forEach` asked for results.",
            "The order is vertical, not horizontal. It isn't \"filter all four, then map the survivors\". Each order goes filter, map, served, and only then does the next one start. `tea` failed the filter, so it never reached `map`. No temporary list exists between the steps. This is **loop fusion**: the pipeline behaves like one loop with all the steps inside its body.",
          ],
        },
        {
          type: "heading",
          text: "Proof 2: short-circuiting stops the source",
        },
        {
          type: "code",
          language: "java",
          title: "ShortCircuit.java",
          code: `import java.util.List;

public class ShortCircuit {
    public static void main(String[] args) {
        List<Integer> fares = List.of(80, 120, 450, 90, 600);

        Integer firstBig = fares.stream()
                .peek(f -> System.out.println("checking " + f))
                .filter(f -> f > 300)
                .findFirst()
                .orElse(-1);
        System.out.println("first big fare = " + firstBig);
    }
}`,
        },
        {
          type: "output",
          text: `checking 80
checking 120
checking 450
first big fare = 450`,
        },
        {
          type: "paragraph",
          text: "`90` and `600` were never even looked at. With a loop I'd have written `break`. With a stream, `findFirst` tells the source to stop.",
        },
        {
          type: "heading",
          text: "Proof 3: a stateful operation is a barrier",
        },
        {
          type: "code",
          language: "java",
          title: "SortedBarrier.java",
          code: `import java.util.List;

public class SortedBarrier {
    public static void main(String[] args) {
        List<Integer> tokens = List.of(30, 10, 20);

        tokens.stream()
                .peek(t -> System.out.println("arrived  " + t))
                .sorted()
                .peek(t -> System.out.println("released " + t))
                .forEach(t -> System.out.println("served   " + t));
    }
}`,
        },
        {
          type: "output",
          text: `arrived  30
arrived  10
arrived  20
released 10
served   10
released 20
served   20
released 30
served   30`,
        },
        {
          type: "paragraph",
          text: "Before `sorted`, elements flow one at a time. At `sorted`, everything piles up, because the smallest token might be the last one to arrive. After `sorted` releases them, they flow one at a time again. So fusion holds **between** barriers, and every `sorted` (and, in a softer way, `distinct`) is a point where the whole stream is buffered in memory.",
        },
        {
          type: "heading",
          text: "The pipeline is a linked list of stages",
        },
        {
          type: "paragraph",
          text: "So where does the \"description\" live before the terminal operation? Each call like `filter` creates a new **stage** object and links it to the previous one. All of them extend the package-private class `java.util.stream.AbstractPipeline` (through `ReferencePipeline` for object streams, or `IntPipeline`, `LongPipeline`, `DoublePipeline`). `javap -p` shows its fields on JDK 21:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p java.util.stream.AbstractPipeline",
        },
        {
          type: "output",
          text: `  private final java.util.stream.AbstractPipeline sourceStage;
  private final java.util.stream.AbstractPipeline previousStage;
  protected final int sourceOrOpFlags;
  private java.util.stream.AbstractPipeline nextStage;
  private int depth;
  private int combinedFlags;
  private java.util.Spliterator<?> sourceSpliterator;
  private boolean linkedOrConsumed;
  private boolean parallel;
  ...`,
        },
        {
          type: "paragraph",
          text: "I read those private fields with reflection to watch a pipeline being built. This needs `--add-opens`, because `java.base` doesn't open its internals to my code:",
        },
        {
          type: "code",
          language: "java",
          title: "Stages.java",
          code: `import java.lang.reflect.Field;
import java.util.List;
import java.util.stream.Stream;

public class Stages {
    static Object read(Object stage, String name) throws Exception {
        Field f = Class.forName("java.util.stream.AbstractPipeline").getDeclaredField(name);
        f.setAccessible(true);
        return f.get(stage);
    }

    static void show(String label, Stream<?> s) throws Exception {
        Object prev = read(s, "previousStage");
        System.out.printf("%-8s %-22s depth=%s previous=%s%n", label,
                s.getClass().getName().replace("java.util.stream.", ""), read(s, "depth"),
                prev == null ? "null" : prev.getClass().getName().replace("java.util.stream.", ""));
    }

    public static void main(String[] args) throws Exception {
        Stream<String> head = List.of("tea", "coffee", "juice").stream();
        Stream<String> filtered = head.filter(o -> o.length() > 3);
        Stream<Integer> mapped = filtered.map(String::length);
        Stream<Integer> sorted = mapped.sorted();

        show("head", head);
        show("filter", filtered);
        show("map", mapped);
        show("sorted", sorted);
        System.out.println("same source? " + (read(sorted, "sourceStage") == head));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.stream=ALL-UNNAMED Stages",
        },
        {
          type: "output",
          text: `head     ReferencePipeline$Head depth=0 previous=null
filter   ReferencePipeline$2    depth=1 previous=ReferencePipeline$Head
map      ReferencePipeline$3    depth=2 previous=ReferencePipeline$2
sorted   SortedOps$OfRef        depth=3 previous=ReferencePipeline$3
same source? true`,
        },
        {
          type: "list",
          items: [
            "`list.stream()` made a `ReferencePipeline$Head`, the source stage. It holds the source's `Spliterator` and nothing else.",
            "`filter` and `map` made anonymous subclasses (`$2` and `$3` are the order they appear in `ReferencePipeline.java`). Each one stores its lambda and a pointer back to the stage before it. `depth` counts how many operations sit between it and the source.",
            "`sorted` made a `SortedOps$OfRef`, a named class, because stateful operations need more machinery.",
            "Every stage points to the same `sourceStage`, the head. That's how the terminal operation, called on the last stage, finds the source.",
          ],
        },
        {
          type: "paragraph",
          text: "Without `--add-opens`, the same program fails with `InaccessibleObjectException: ... module java.base does not \"opens java.util.stream\" to unnamed module`. Fair enough: none of this is public API, and it's only here to look at.",
        },
        {
          type: "heading",
          text: "Sinks: how the terminal operation wires the stages together",
        },
        {
          type: "paragraph",
          text: "Each stage knows how to do one thing: given the **downstream** consumer, build a consumer that does my step and then hands the result downstream. That consumer type is `java.util.stream.Sink`, a `Consumer` with three extra methods:",
        },
        {
          type: "output",
          text: `interface java.util.stream.Sink<T> extends java.util.function.Consumer<T> {
  public default void begin(long);
  public default void end();
  public default boolean cancellationRequested();
  public default void accept(int);
  public default void accept(long);
  public default void accept(double);
}`,
        },
        {
          type: "paragraph",
          text: "`begin(size)` is called before the first element (with the size, or `-1` if unknown), `accept` once per element, `end()` after the last one, and `cancellationRequested()` is how a short-circuiting operation says \"I have enough\". The `accept(int)` variants let primitive streams push values without boxing. Each stage implements an abstract method `opWrapSink(flags, downstreamSink)`. For `map`, the sink it returns is, in spirit:",
        },
        {
          type: "code",
          language: "java",
          title: "What map's opWrapSink builds (simplified)",
          code: `new Sink.ChainedReference<P_OUT, R>(downstream) {
    public void accept(P_OUT u) {
        downstream.accept(mapper.apply(u));     // do my step, push the result on
    }
};`,
        },
        {
          type: "paragraph",
          text: "And `filter`'s sink is `if (predicate.test(u)) downstream.accept(u);`. When a terminal operation like `forEach` runs, `AbstractPipeline.wrapSink` walks the stages from the **last** one back to the source, and each one wraps the sink built so far. The terminal operation's own sink ends up innermost, and the first operation's sink ends up outermost. Then `copyInto` pushes the source into that outermost sink:",
        },
        {
          type: "code",
          language: "text",
          title: "wrapAndCopyInto, in pseudo-code",
          code: `wrapAndCopyInto(terminalSink, spliterator):
    sink = terminalSink
    for stage = lastStage; stage.depth > 0; stage = stage.previousStage:
        sink = stage.opWrapSink(stage.previousStage.combinedFlags, sink)

    if pipeline has no SHORT_CIRCUIT flag:
        sink.begin(spliterator.getExactSizeIfKnown())
        spliterator.forEachRemaining(sink)          // the one real loop
        sink.end()
    else:
        sink.begin(...)
        while (!sink.cancellationRequested() && spliterator.tryAdvance(sink)) { }
        sink.end()`,
        },
        {
          type: "paragraph",
          text: "That's the loop fusion from Proof 1, in code: one loop, in the source's spliterator, pushing each element through nested `accept` calls. I didn't want to take the nesting on trust, so I printed the call stack from inside a `map` lambda:",
        },
        {
          type: "code",
          language: "java",
          title: "SinkChain.java",
          code: `import java.util.List;

public class SinkChain {
    public static void main(String[] args) {
        List.of("tea").stream()
                .filter(o -> true)
                .map(o -> {
                    for (StackTraceElement e : new Throwable().getStackTrace()) {
                        System.out.println(e.getClassName() + "." + e.getMethodName());
                    }
                    return o;
                })
                .forEach(o -> { });
    }
}`,
        },
        {
          type: "output",
          text: `SinkChain.lambda$main$1
java.util.stream.ReferencePipeline$3$1.accept
java.util.stream.ReferencePipeline$2$1.accept
java.util.AbstractList$RandomAccessSpliterator.forEachRemaining
java.util.stream.AbstractPipeline.copyInto
java.util.stream.AbstractPipeline.wrapAndCopyInto
java.util.stream.ForEachOps$ForEachOp.evaluateSequential
java.util.stream.ForEachOps$ForEachOp$OfRef.evaluateSequential
java.util.stream.AbstractPipeline.evaluate
java.util.stream.ReferencePipeline.forEach
SinkChain.main`,
        },
        {
          type: "paragraph",
          text: "Reading from the bottom up, this is the whole mechanism:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`main` calls `forEach` on the last stage.",
            "`forEach` builds a `ForEachOp` (the terminal operation) and calls `evaluate`, which picks the sequential path.",
            "`wrapAndCopyInto` wraps the sinks, then `copyInto` starts the loop.",
            "`RandomAccessSpliterator.forEachRemaining` is the single loop over the source list (`List.of` lists use this spliterator).",
            "It calls `accept` on the outermost sink, `ReferencePipeline$2$1`, the sink built by the `filter` stage `$2`.",
            "The filter sink calls `accept` on the `map` sink, `ReferencePipeline$3$1`.",
            "The map sink calls my lambda. After it returns, it would call the `forEach` sink.",
          ],
        },
        {
          type: "paragraph",
          text: "No intermediate collection anywhere, just method calls nested as deep as the pipeline is long. Once the JIT inlines those small `accept` methods, it's very close to the hand-written loop.",
        },
        {
          type: "paragraph",
          text: "Stateful operations use `begin` and `end`. The `sorted` sink's `accept` just adds to a buffer, and its `end()` sorts the buffer and only then calls `downstream.begin`, `downstream.accept` for each element, and `downstream.end`. That's exactly the barrier from Proof 3.",
        },
        {
          type: "heading",
          text: "StreamOpFlag: what each stage knows about the data",
        },
        {
          type: "paragraph",
          text: "The `sourceOrOpFlags` and `combinedFlags` fields hold bits from the internal enum `StreamOpFlag`. On JDK 21 it has six: `DISTINCT`, `SORTED`, `ORDERED`, `SIZED`, `SHORT_CIRCUIT` and `SIZE_ADJUSTING`. The source starts the flags from its spliterator (an `ArrayList` is `ORDERED` and `SIZED`).",
        },
        {
          type: "paragraph",
          text: "Each operation then **sets**, **clears** or **preserves** flags: `filter` clears `SIZED` (it can't know how many survive), `map` clears `SORTED` and `DISTINCT` but keeps `SIZED`, `sorted` sets `SORTED`, `distinct` sets `DISTINCT`, `limit` sets `SHORT_CIRCUIT`. Each stage's `combinedFlags` is its own flags merged over the previous stage's.",
        },
        {
          type: "paragraph",
          text: "The flags aren't public, but a stream's `spliterator()` reports them as `Spliterator` characteristics, so I could watch them change:",
        },
        {
          type: "code",
          language: "java",
          title: "Flags.java",
          code: `import java.util.*;
import java.util.stream.Stream;

public class Flags {
    static String flags(Stream<?> s) {
        int c = s.spliterator().characteristics();
        List<String> out = new ArrayList<>();
        if ((c & Spliterator.ORDERED) != 0) out.add("ORDERED");
        if ((c & Spliterator.DISTINCT) != 0) out.add("DISTINCT");
        if ((c & Spliterator.SORTED) != 0) out.add("SORTED");
        if ((c & Spliterator.SIZED) != 0) out.add("SIZED");
        return out.toString();
    }

    public static void main(String[] args) {
        List<Integer> fares = new ArrayList<>(List.of(300, 100, 200));
        System.out.println("list            " + flags(fares.stream()));
        System.out.println("list.map        " + flags(fares.stream().map(f -> f + 10)));
        System.out.println("list.filter     " + flags(fares.stream().filter(f -> f > 150)));
        System.out.println("list.sorted     " + flags(fares.stream().sorted()));
        System.out.println("list.distinct   " + flags(fares.stream().distinct()));
        System.out.println("hashSet         " + flags(new HashSet<>(fares).stream()));
        System.out.println("treeSet         " + flags(new TreeSet<>(fares).stream()));
    }
}`,
        },
        {
          type: "output",
          text: `list            [ORDERED, SIZED]
list.map        [ORDERED, SIZED]
list.filter     [ORDERED]
list.sorted     [ORDERED, SORTED, SIZED]
list.distinct   [ORDERED, DISTINCT]
hashSet         [DISTINCT, SIZED]
treeSet         [ORDERED, DISTINCT, SORTED, SIZED]`,
        },
        {
          type: "paragraph",
          text: "`filter` dropped `SIZED`, `sorted` added `SORTED`, a `HashSet` has no `ORDERED` (no defined order), and a `TreeSet` already arrives sorted and distinct. The library uses these flags to skip work. If the flags already say `SORTED` in natural order, `sorted()` doesn't wrap a sink at all. If they say `DISTINCT`, `distinct()` is a no-op. And since Java 9, if they say `SIZED`, `count()` doesn't run the pipeline:",
        },
        {
          type: "code",
          language: "java",
          title: "CountSkips.java",
          code: `import java.util.List;

public class CountSkips {
    public static void main(String[] args) {
        List<String> riders = List.of("Asha", "Ravi", "Meera");

        long a = riders.stream()
                .peek(r -> System.out.println("peek " + r))
                .count();
        System.out.println("count = " + a);

        long b = riders.stream()
                .peek(r -> System.out.println("peek " + r))
                .filter(r -> r.length() == 4)
                .count();
        System.out.println("count after filter = " + b);
    }
}`,
        },
        {
          type: "output",
          text: `count = 3
peek Asha
peek Ravi
peek Meera
count after filter = 2`,
        },
        {
          type: "paragraph",
          text: "The first `peek` never printed. The pipeline was still `SIZED` (`peek` keeps the size), so `count()` asked the source for its size and returned `3` without pushing a single element. After `filter`, the size is unknown and the pipeline has to run. On Java 8 the first `peek` **would** have printed. That's the reason the `peek` Javadoc says it's for debugging, and why a `peek` with important side effects is a bug waiting for a JDK upgrade.",
        },
        {
          type: "heading",
          text: "Spliterator: the source's iterator that can split",
        },
        {
          type: "paragraph",
          text: "Every stream source is a `Spliterator` (\"splittable iterator\"). It has `tryAdvance(action)` to push one element, `forEachRemaining(action)` to push the rest, `estimateSize()`, `characteristics()`, and the method that makes parallel streams possible: `trySplit()`, which hands off a part of the remaining elements as a new spliterator and keeps the rest. For an `ArrayList` it splits at the midpoint:",
        },
        {
          type: "code",
          language: "java",
          title: "SplitDemo.java",
          code: `import java.util.*;

public class SplitDemo {
    public static void main(String[] args) {
        List<Integer> tokens = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6, 7, 8));
        Spliterator<Integer> right = tokens.spliterator();
        Spliterator<Integer> left = right.trySplit();      // takes the first half
        Spliterator<Integer> leftLeft = left.trySplit();

        print("leftLeft", leftLeft);
        print("left    ", left);
        print("right   ", right);
    }

    static void print(String name, Spliterator<Integer> s) {
        List<Integer> seen = new ArrayList<>();
        long size = s.estimateSize();
        s.forEachRemaining(seen::add);
        System.out.println(name + " size=" + size + " " + seen);
    }
}`,
        },
        {
          type: "output",
          text: `leftLeft size=2 [1, 2]
left     size=2 [3, 4]
right    size=4 [5, 6, 7, 8]`,
        },
        {
          type: "paragraph",
          text: "`trySplit` returns the **prefix** and keeps the suffix, which is how encounter order survives splitting: the left piece always holds earlier elements. Array-backed sources split perfectly in O(1). A `LinkedList` or a `Stream.iterate` can't jump to the middle, so their spliterators split badly (they copy a batch into an array), which is one reason parallel streams over them are slow.",
        },
        {
          type: "heading",
          text: "How a parallel stream uses all of this",
        },
        {
          type: "paragraph",
          text: "`.parallel()` just sets the `parallel` flag on the source stage. Nothing else changes until the terminal operation, which calls `evaluateParallel` instead of `evaluateSequential`. Roughly:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "The terminal operation creates a Fork/Join task (a subclass of the internal `AbstractTask`) holding the whole spliterator and submits it to `ForkJoinPool.commonPool()`.",
            "A task splits its spliterator with `trySplit` and forks one half as a new task, until a piece is small enough. The target is about `size / (parallelism * 4)` elements per leaf, so there are roughly four leaves per worker thread, which leaves room for work-stealing to balance uneven pieces.",
            "Each leaf runs the same `wrapAndCopyInto` as a sequential stream, but on its own small spliterator, with its own sink chain and its own result container.",
            "As leaves finish, their parent combines the two partial results: adding two sums, merging two lists left-then-right, keeping the first non-empty `findFirst` result from the leftmost leaf. The root task's result is the answer.",
          ],
        },
        {
          type: "paragraph",
          text: "Stateful operations are the hard part in parallel. `sorted` has to collect everything and sort it (in parallel, with `Arrays.parallelSort`). `limit(10)` on an **ordered** parallel stream has to know which ten elements come first in encounter order, so pieces have to wait for pieces to their left. That's why ordered `limit`, `skip` and `findFirst` can be slower in parallel than sequentially, and why `unordered()` or `findAny` can help when order doesn't matter.",
        },
      ],
    },
    {
      title: "The Pipeline in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `BUILD TIME (no work)                 RUN TIME (terminal op called)

 list.stream()   Head      depth 0     wrapSink, last stage first:
     .filter(p)  Stage $2  depth 1       forEachSink
     .map(f)     Stage $3  depth 2       mapSink(forEachSink)
     .forEach(c) terminal ───────────►   filterSink(mapSink(forEachSink))
                                                 ▲
  each stage: previousStage ◄─┐           spliterator.forEachRemaining(sink)
              sourceStage = Head             one element at a time:
              combinedFlags                  filter ─► map ─► forEach`,
          caption:
            "Stages are linked while I write the chain. Sinks are built in reverse when the terminal operation runs, and the source pushes each element through all of them.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "Every example in the rest of this lesson uses one tiny data set: today's trips at a cab company. (`record` is Java 16 syntax, which I use only to keep the data class short. The stream code itself is plain Java 8 unless I say otherwise.)",
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
          title: "Cheat sheet (fragments)",
          code: `trips.stream()                          // from a collection
Arrays.stream(array)                    // from an array
Stream.of("tea", "coffee")              // from values
IntStream.rangeClosed(1, 10)            // 1..10

.filter(t -> t.fare() > 200)            // keep matching
.map(Trip::city)                        // transform each
.flatMap(order -> order.items().stream())  // one-to-many, flattened
.distinct()  .sorted()  .sorted(comparator)
.limit(5)    .skip(10)  .peek(System.out::println)
.mapToDouble(Trip::fare)                // to a DoubleStream

.collect(Collectors.toList())           // gather (next lesson)
.toList()                               // Java 16, unmodifiable
.forEach(System.out::println)
.count()  .min(cmp)  .max(cmp)
.reduce(0.0, Double::sum)
.anyMatch(p)  .allMatch(p)  .noneMatch(p)
.findFirst()  .findAny()                // Optional<T>`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "filter, map, distinct, sorted, limit, skip",
        },
        {
          type: "paragraph",
          text: "Everyday version: from today's trip sheet, I want the ids of completed trips over ₹200, the list of cities we worked in, the two biggest fares, and \"page 2\" of the trip list for a screen that shows two rows at a time.",
        },
        {
          type: "code",
          language: "java",
          title: "BasicOps.java",
          code: `import java.util.List;
import java.util.stream.Collectors;

public class BasicOps {
    public static void main(String[] args) {
        List<Trips.Trip> trips = Trips.TODAY;

        List<String> bigCompleted = trips.stream()
                .filter(t -> t.status().equals("COMPLETED"))   // keep some
                .filter(t -> t.fare() > 200)
                .map(Trips.Trip::id)                           // Trip -> String
                .collect(Collectors.toList());
        System.out.println("big completed: " + bigCompleted);

        List<String> cities = trips.stream()
                .map(Trips.Trip::city)
                .distinct()                                    // drop repeats
                .sorted()
                .collect(Collectors.toList());
        System.out.println("cities: " + cities);

        List<Double> top2 = trips.stream()
                .map(Trips.Trip::fare)
                .sorted((a, b) -> Double.compare(b, a))         // highest first
                .limit(2)
                .collect(Collectors.toList());
        System.out.println("top 2 fares: " + top2);

        List<String> page2 = trips.stream()
                .map(Trips.Trip::id)
                .skip(2).limit(2)                               // "page" 2, size 2
                .collect(Collectors.toList());
        System.out.println("page 2: " + page2);
    }
}`,
        },
        {
          type: "output",
          text: `big completed: [T1, T2, T4]
cities: [Delhi, Kolkata, Mumbai]
top 2 fares: [610.0, 480.0]
page 2: [T3, T4]`,
        },
        {
          type: "list",
          items: [
            "Two `filter` calls in a row are fine. They fuse into the same loop, so it's a readability choice, not a cost.",
            "`distinct` uses `equals` and `hashCode`, and keeps the **first** occurrence of each value in encounter order.",
            "`sorted` with no argument uses natural order (it throws `ClassCastException` if the elements aren't `Comparable`). With a comparator, I sorted fares highest first. `Comparator.reverseOrder()` would say the same thing more readably.",
            "`skip(n).limit(m)` is the stream version of `OFFSET n LIMIT m`. Fine for in-memory lists. For database data, the paging belongs in the query.",
          ],
        },
        {
          type: "heading",
          text: "map versus flatMap",
        },
        {
          type: "paragraph",
          text: "Everyday version: three tables at the tea stall each give a list of items. `map` gives me three lists. `flatMap` empties all three lists onto one tray.",
        },
        {
          type: "code",
          language: "java",
          title: "FlatMapDemo.java",
          code: `import java.util.List;
import java.util.stream.Collectors;

public class FlatMapDemo {
    public static void main(String[] args) {
        List<List<String>> ordersPerTable = List.of(
                List.of("tea", "samosa"),
                List.of("coffee"),
                List.of("tea", "biscuit"));

        List<List<String>> withMap = ordersPerTable.stream()
                .map(table -> table)                   // still one list per table
                .collect(Collectors.toList());
        List<String> withFlatMap = ordersPerTable.stream()
                .flatMap(table -> table.stream())       // one flat stream of items
                .collect(Collectors.toList());

        System.out.println("map:     " + withMap);
        System.out.println("flatMap: " + withFlatMap);
        System.out.println("distinct items: " + withFlatMap.stream().distinct().count());
    }
}`,
        },
        {
          type: "output",
          text: `map:     [[tea, samosa], [coffee], [tea, biscuit]]
flatMap: [tea, samosa, coffee, tea, biscuit]
distinct items: 4`,
        },
        {
          type: "paragraph",
          text: "The rule I use: `map` is one-in, one-out. `flatMap` is one-in, zero-or-more-out, and the function has to return a **stream**, which `flatMap` then splices into the main stream. Internally, `flatMap`'s sink calls the function, gets a small stream, and pushes each of its elements into the downstream sink.",
        },
        {
          type: "heading",
          text: "reduce",
        },
        {
          type: "paragraph",
          text: "Everyday version: the cashier at the end of the day starts with an empty drawer (`0`) and adds each bill to it. `reduce` folds all elements into one value with a combining function.",
        },
        {
          type: "code",
          language: "java",
          title: "ReduceDemo.java",
          code: `import java.util.List;
import java.util.Optional;

public class ReduceDemo {
    public static void main(String[] args) {
        List<Double> fares = List.of(220.0, 480.0, 90.0);

        double total = fares.stream().reduce(0.0, (a, b) -> a + b);   // identity + op
        Optional<Double> max = fares.stream().reduce(Double::max);       // no identity
        Optional<Double> none = List.<Double>of().stream().reduce(Double::max);

        System.out.println("total = " + total);
        System.out.println("max   = " + max);
        System.out.println("empty = " + none);

        int letters = List.of("tea", "coffee").stream()
                .reduce(0, (sum, word) -> sum + word.length(), Integer::sum);
        System.out.println("letters = " + letters);
    }
}`,
        },
        {
          type: "output",
          text: `total = 790.0
max   = Optional[480.0]
empty = Optional.empty
letters = 9`,
        },
        {
          type: "list",
          items: [
            "`reduce(identity, op)` returns a plain value. For an empty stream it returns the identity.",
            "`reduce(op)` has no starting value, so for an empty stream there's nothing to return, hence `Optional`.",
            "The three-argument form, `reduce(identity, accumulator, combiner)`, is for when the result type differs from the element type, here `String` elements folded into an `int`. The combiner merges two partial results, and it's only actually called in a parallel stream. In real code I'd write `mapToInt(String::length).sum()` instead. It's clearer.",
          ],
        },
        {
          type: "heading",
          text: "anyMatch, allMatch, noneMatch, findFirst",
        },
        {
          type: "code",
          language: "java",
          title: "MatchFind.java",
          code: `import java.util.List;

public class MatchFind {
    public static void main(String[] args) {
        List<Trips.Trip> trips = Trips.TODAY;

        System.out.println("any cancelled?  " + trips.stream().anyMatch(t -> t.status().equals("CANCELLED")));
        System.out.println("all above 50?   " + trips.stream().allMatch(t -> t.fare() > 50));
        System.out.println("none in Pune?   " + trips.stream().noneMatch(t -> t.city().equals("Pune")));
        System.out.println("first Mumbai:   " + trips.stream().filter(t -> t.city().equals("Mumbai")).findFirst().map(Trips.Trip::id));
        System.out.println("first Pune:     " + trips.stream().filter(t -> t.city().equals("Pune")).findFirst());

        List<Trips.Trip> empty = List.of();
        System.out.println("empty allMatch:  " + empty.stream().allMatch(t -> t.fare() > 1_000_000));
        System.out.println("empty anyMatch:  " + empty.stream().anyMatch(t -> true));
    }
}`,
        },
        {
          type: "output",
          text: `any cancelled?  true
all above 50?   true
none in Pune?   true
first Mumbai:   Optional[T4]
first Pune:     Optional.empty
empty allMatch:  true
empty anyMatch:  false`,
        },
        {
          type: "paragraph",
          text: "The last two lines surprised me the first time. `allMatch` on an empty stream is `true` for **any** condition (\"every trip in an empty list is over a million rupees\" is vacuously true), and `anyMatch` is always `false`. That's standard logic, but it bites in validation code like `if (items.stream().allMatch(Item::isPaid)) ship();` with an empty cart. `findFirst` returns the first in encounter order. `findAny` may return any element, which is cheaper in parallel.",
        },
        {
          type: "heading",
          text: "Primitive streams",
        },
        {
          type: "paragraph",
          text: "Everyday version: if I'm only counting coins, I don't need to put each coin in its own envelope first. `IntStream` and friends work with raw numbers, no `Integer` envelopes.",
        },
        {
          type: "code",
          language: "java",
          title: "PrimitiveStreams.java",
          code: `import java.util.IntSummaryStatistics;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class PrimitiveStreams {
    public static void main(String[] args) {
        System.out.println(IntStream.range(1, 5).sum());          // 1..4
        System.out.println(IntStream.rangeClosed(1, 5).sum());    // 1..5

        double total = Trips.TODAY.stream()
                .mapToDouble(Trips.Trip::fare)                    // DoubleStream, no boxing
                .sum();
        System.out.println("total fare = " + total);

        IntSummaryStatistics stats = IntStream.of(12, 7, 30, 18).summaryStatistics();
        System.out.println(stats);

        System.out.println(IntStream.of(5, 9).average());        // OptionalDouble
        System.out.println(IntStream.empty().average());

        List<Integer> boxed = IntStream.rangeClosed(1, 3).boxed().collect(Collectors.toList());
        List<String> seats = IntStream.rangeClosed(1, 3).mapToObj(n -> "Seat-" + n).collect(Collectors.toList());
        System.out.println(boxed + " " + seats);
        System.out.println("tea".chars().mapToObj(c -> (char) c).collect(Collectors.toList()));
    }
}`,
        },
        {
          type: "output",
          text: `10
15
total fare = 1850.0
IntSummaryStatistics{count=4, sum=67, min=7, average=16.750000, max=30}
OptionalDouble[7.0]
OptionalDouble.empty
[1, 2, 3] [Seat-1, Seat-2, Seat-3]
[t, e, a]`,
        },
        {
          type: "list",
          items: [
            "`sum()` on an empty primitive stream is `0`, but `average()`, `min()` and `max()` return `OptionalInt`/`OptionalDouble`, because there's no honest average of nothing.",
            "`summaryStatistics()` computes count, sum, min, average and max in **one pass**. Calling `sum()` and then `max()` would need two streams, since a stream can't be reused.",
            "`IntStream` has no `collect(Collectors.toList())`. I have to `boxed()` first, or use `mapToObj`.",
            "`String.chars()` is an `IntStream` of character codes. Without the `(char)` cast, `mapToObj(c -> c)` would print `[116, 101, 97]`.",
          ],
        },
        {
          type: "heading",
          text: "Infinite streams: iterate and generate",
        },
        {
          type: "paragraph",
          text: "Everyday version: a bank's token machine. It will happily print tokens forever. I decide when to stop taking them.",
        },
        {
          type: "code",
          language: "java",
          title: "InfiniteStreams.java",
          code: `import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

public class InfiniteStreams {
    public static void main(String[] args) {
        List<Integer> tokens = Stream.iterate(101, n -> n + 1)   // 101, 102, 103 ... forever
                .limit(4)
                .collect(Collectors.toList());
        System.out.println(tokens);

        List<String> otps = Stream.generate(() -> "****")        // same supplier every time
                .limit(3)
                .collect(Collectors.toList());
        System.out.println(otps);

        // Java 9: iterate with a stop condition, like a for loop
        System.out.println(IntStream.iterate(1, n -> n <= 100, n -> n * 3)
                .boxed().collect(Collectors.toList()));
    }
}`,
        },
        {
          type: "output",
          text: `[101, 102, 103, 104]
[****, ****, ****]
[1, 3, 9, 27, 81]`,
        },
        {
          type: "paragraph",
          text: "`iterate(seed, next)` builds each element from the previous one. `generate(supplier)` calls the supplier fresh each time, which suits random values or ids. Both only work because `limit` short-circuits. The Java 9 `iterate(seed, hasNext, next)` reads exactly like `for (n = 1; n <= 100; n = n * 3)`.",
        },
        {
          type: "heading",
          text: "Java 9 and 16 additions",
        },
        {
          type: "paragraph",
          text: "Everyday version: a lift queue. `takeWhile` lets people in while they're under the weight limit and closes the doors at the first person who isn't, even if lighter people are behind them. `filter` would let in every light person from anywhere in the queue.",
        },
        {
          type: "code",
          language: "java",
          title: "Java9Plus.java",
          code: `import java.util.List;
import java.util.stream.Stream;

public class Java9Plus {
    public static void main(String[] args) {
        List<Integer> waitMinutes = List.of(2, 4, 9, 3, 1);

        System.out.println("takeWhile: " + waitMinutes.stream().takeWhile(m -> m < 5).toList());
        System.out.println("dropWhile: " + waitMinutes.stream().dropWhile(m -> m < 5).toList());
        System.out.println("filter:    " + waitMinutes.stream().filter(m -> m < 5).toList());

        String promo = null;
        System.out.println("ofNullable: " + Stream.ofNullable(promo).count());

        List<Integer> fixed = waitMinutes.stream().map(m -> m * 2).toList();   // Java 16
        try {
            fixed.add(10);
        } catch (UnsupportedOperationException e) {
            System.out.println("toList() is unmodifiable: " + e);
        }
        System.out.println(Stream.of("a", null).toList());                   // nulls allowed
    }
}`,
        },
        {
          type: "output",
          text: `takeWhile: [2, 4]
dropWhile: [9, 3, 1]
filter:    [2, 4, 3, 1]
ofNullable: 0
toList() is unmodifiable: java.lang.UnsupportedOperationException
[a, null]`,
        },
        {
          type: "list",
          items: [
            "`takeWhile` (Java 9) stops at the first `9`. `3` and `1` are never taken, unlike with `filter`. It's short-circuiting, so it also works on infinite streams.",
            "`dropWhile` (Java 9) is the mirror: skip while the condition holds, then pass **everything** after, including `3` and `1`.",
            "Both only make sense on an ordered stream. On an unordered one (a `HashSet` stream) the result isn't defined.",
            "`Stream.ofNullable(x)` (Java 9) is empty for `null`. It's handy inside `flatMap` to skip nulls without an `if`.",
            "`Stream.toList()` (Java 16) returns an **unmodifiable** list and allows `null` elements. `collect(Collectors.toList())` returns a list with no promise about mutability (it's an `ArrayList` today). The Collectors lesson compares all three list options.",
          ],
        },
        {
          type: "heading",
          text: "A stream is single-use",
        },
        {
          type: "code",
          language: "java",
          title: "SingleUse.java",
          code: `import java.util.List;
import java.util.stream.Stream;

public class SingleUse {
    public static void main(String[] args) {
        Stream<String> menu = List.of("tea", "coffee").stream();
        System.out.println(menu.count());
        try {
            menu.forEach(System.out::println);
        } catch (IllegalStateException e) {
            System.out.println(e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `2
java.lang.IllegalStateException: stream has already been operated upon or closed`,
        },
        {
          type: "paragraph",
          text: "That's the `linkedOrConsumed` field from the `javap` listing. It's set when a stage gets a next stage or a terminal operation, and checked on the next call. The same exception fires if I call `filter` twice on the same stream variable to branch it. To reuse a pipeline, I keep the **source** (the list) or a `Supplier<Stream<T>>` and create a fresh stream each time.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Forgetting the terminal operation",
        },
        {
          type: "paragraph",
          text: "A pipeline without a terminal operation is just a description. It compiles, runs, and does nothing:",
        },
        {
          type: "code",
          language: "java",
          title: "Mistakes.java",
          code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Mistakes {
    public static void main(String[] args) {
        List<String> queue = new ArrayList<>(List.of("Asha", "Ravi"));
        try {
            queue.stream().forEach(name -> queue.add(name + "-guest"));
        } catch (RuntimeException e) {
            System.out.println("1) " + e);
        }

        int[] seats = {4, 2, 6};
        System.out.println("2) Arrays.asList(int[]) size = " + Arrays.asList(seats).size());
        System.out.println("   Arrays.stream(int[]) max  = " + Arrays.stream(seats).max().getAsInt());

        List.of("tea", "coffee").stream().map(String::toUpperCase);   // no terminal op
        System.out.println("3) the map above never ran");
    }
}`,
        },
        {
          type: "output",
          text: `1) java.util.ConcurrentModificationException
2) Arrays.asList(int[]) size = 1
   Arrays.stream(int[]) max  = 6
3) the map above never ran`,
        },
        {
          type: "list",
          items: [
            "**1) Modifying the source inside the stream.** The `ArrayList` spliterator checks the list's modification count after the loop and throws. Build a new list with `collect` instead.",
            "**2) `Arrays.asList(int[])` or `Stream.of(int[])`.** Generics can't hold `int`, so the whole array becomes **one** element of type `int[]`. For primitive arrays use `Arrays.stream(arr)` or `IntStream.of(...)`.",
            "**3) No terminal operation.** Also a common review comment: a `peek` or `map` used for its side effect, with nothing at the end.",
          ],
        },
        {
          type: "heading",
          text: "Using peek or map for side effects",
        },
        {
          type: "paragraph",
          text: "`CountSkips` above showed `peek` being skipped entirely on JDK 9+. The same can happen to a `map`. Side effects that must happen (saving, sending, charging) belong in `forEach`, or better, in a plain loop where the intent is obvious.",
        },
        {
          type: "heading",
          text: "Calling get() on an Optional",
        },
        {
          type: "paragraph",
          text: "`trips.stream().filter(...).findFirst().get()` throws `NoSuchElementException` the day nothing matches. Use `orElse`, `orElseThrow(() -> new TripNotFoundException(id))`, `map`, or `ifPresent`.",
        },
        {
          type: "heading",
          text: "Wrong order of operations",
        },
        {
          type: "list",
          items: [
            "`sorted()` before `filter()` sorts elements that are about to be thrown away. Filter first.",
            "`map(expensive).filter(cheap)` runs the expensive function on everything. If the condition doesn't need the mapped value, filter first.",
            "`limit` after `sorted` is fine (top N). `limit` before `sorted` gives the first N in arrival order, then sorts those, which is a different answer.",
          ],
        },
        {
          type: "heading",
          text: "Collecting into a shared list from inside the stream",
        },
        {
          type: "paragraph",
          text: "`stream.forEach(results::add)` works sequentially, so it looks fine in tests. In parallel it loses elements or throws, as I show in the Performance section. `collect` is always correct, in both modes.",
        },
        {
          type: "heading",
          text: "Reusing a stream",
        },
        {
          type: "paragraph",
          text: "Storing a `Stream` in a field or passing it to two methods ends in `IllegalStateException: stream has already been operated upon or closed`. Pass the collection or a `Supplier<Stream<T>>`.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "One operation per line, aligned on the dots. A pipeline then reads top to bottom like a recipe.",
            "Prefer method references (`Trip::city`) when they're clearer, and small named methods (`.filter(this::isPayable)`) instead of long multi-line lambdas.",
            "Keep lambdas pure: no writes to outside variables, no changes to the source. Java already forces captured local variables to be effectively final, and that's a hint, not an obstacle to work around with one-element arrays.",
            "Use primitive streams for numbers: `mapToDouble(Trip::fare).sum()`, not `map(Trip::fare).reduce(0.0, Double::sum)`.",
            "Filter early, sort late, and put the cheapest filter first.",
            "Return `List` or `Optional` from methods, not `Stream`, unless the caller really needs laziness. A returned stream can be consumed only once and may hold resources.",
            "Close streams that hold resources: `try (Stream<String> lines = Files.lines(path)) { ... }`. Collection-backed streams don't need closing.",
            "Don't force everything into a stream. A loop with an early `return`, a checked exception, or three mutable counters is often clearer as a loop. Streams are a tool for data transformations, not a replacement for every `for`.",
            "Stay sequential by default. Reach for `parallel()` only after measuring, for the reasons below.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "My old notes said \"streams are faster than loops\". They aren't, in general. A sequential stream does the same work as a loop plus a few layers of small method calls (the sinks), which the JIT usually inlines away for hot code. For small collections, the setup of the pipeline objects is a noticeable share of the cost.",
        },
        {
          type: "paragraph",
          text: "So the honest summary is: roughly the same as a loop when the code is hot, a bit slower when it's cold, and the readability is the real reason to use them. I'm not putting timings here, because a fair comparison needs JMH with warmup, and single `System.nanoTime` runs mostly measure the JIT.",
        },
        {
          type: "heading",
          text: "Boxing",
        },
        {
          type: "paragraph",
          text: "`Stream<Integer>` and `Stream<Double>` allocate a wrapper object per element (outside the small `Integer` cache of -128 to 127), and every arithmetic step unboxes and reboxes. `IntStream`/`LongStream`/`DoubleStream` keep raw values and their sinks have `accept(int)` and friends, so a pipeline like `mapToDouble(Trip::fare).sum()` moves no objects at all. This is the single biggest easy win.",
        },
        {
          type: "heading",
          text: "Stateful operations",
        },
        {
          type: "list",
          items: [
            "`sorted` buffers the **whole** stream in memory before releasing anything, as `SortedBarrier` showed. It's O(n log n) time and O(n) space, and it kills short-circuiting: `sorted().findFirst()` still sorts everything. `min(comparator)` gives the same answer in one pass with no buffer.",
            "`distinct` keeps a `HashSet` of everything seen (O(n) memory). On an ordered parallel stream it's expensive, because it must keep the first occurrence in encounter order.",
            "`limit`/`skip` are cheap sequentially, expensive on ordered parallel streams.",
          ],
        },
        {
          type: "heading",
          text: "Parallel streams and the common pool",
        },
        {
          type: "paragraph",
          text: "Everyday version: opening more billing counters at a bank helps when there's a long queue of slow customers. It doesn't help for three customers, and it makes things worse if all the counters share one pen.",
        },
        {
          type: "code",
          language: "java",
          title: "ParallelPool.java",
          code: `import java.util.concurrent.ForkJoinPool;

public class ParallelPool {
    public static void main(String[] args) {
        System.out.println("cores:               " + Runtime.getRuntime().availableProcessors());
        System.out.println("common pool threads: " + ForkJoinPool.commonPool().getParallelism());
    }
}`,
        },
        {
          type: "output",
          text: `cores:               16
common pool threads: 15`,
        },
        {
          type: "paragraph",
          text: "(On my 16-core machine. Yours will differ.) The common pool has `cores - 1` workers because the calling thread joins in and does work too. The important part is that this pool is **shared by the whole JVM**: every parallel stream, every `CompletableFuture.supplyAsync` without an executor. One parallel stream that blocks on HTTP or JDBC calls ties up those threads for everyone. The size can be changed with `-Djava.util.concurrent.ForkJoinPool.common.parallelism=N`, which affects the whole JVM.",
        },
        {
          type: "heading",
          text: "The shared-state bug, for real",
        },
        {
          type: "code",
          language: "java",
          title: "SharedListBug.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class SharedListBug {
    public static void main(String[] args) {
        List<Integer> unsafe = new ArrayList<>();
        try {
            IntStream.range(0, 10_000).parallel().forEach(unsafe::add);   // side effect!
            System.out.println("shared ArrayList size: " + unsafe.size());
        } catch (RuntimeException e) {
            System.out.println("shared ArrayList blew up: " + e.getClass().getSimpleName());
        }

        List<Integer> safe = IntStream.range(0, 10_000).parallel()
                .boxed().collect(Collectors.toList());
        System.out.println("collect size:          " + safe.size());
    }
}`,
        },
        {
          type: "paragraph",
          text: "I ran it five times. The shared list size is different every run because it's a data race, and on another machine it could also throw `ArrayIndexOutOfBoundsException`, which is why the `catch` is there:",
        },
        {
          type: "table",
          headers: ["Run", "shared ArrayList size", "collect size"],
          rows: [
            ["1", "7391", "10000"],
            ["2", "7222", "10000"],
            ["3", "7111", "10000"],
            ["4", "5953", "10000"],
            ["5", "8076", "10000"],
          ],
        },
        {
          type: "paragraph",
          text: "Thousands of elements silently lost, no exception. Two threads read the same `size`, both write into the same slot, both increment. `collect` is correct because each leaf task fills its **own** list and the lists are merged afterwards, which is the combiner story in the Collectors lesson.",
        },
        {
          type: "heading",
          text: "A wrong identity only shows up in parallel",
        },
        {
          type: "code",
          language: "java",
          title: "BadIdentity.java",
          code: `import java.util.stream.IntStream;

public class BadIdentity {
    public static void main(String[] args) {
        int sequential = IntStream.rangeClosed(1, 4).reduce(10, Integer::sum);
        int parallel   = IntStream.rangeClosed(1, 4).parallel().reduce(10, Integer::sum);
        System.out.println("sequential: " + sequential);
        System.out.println("parallel:   " + parallel);
    }
}`,
        },
        {
          type: "output",
          text: `sequential: 20
parallel:   50`,
        },
        {
          type: "paragraph",
          text: "Someone wanted \"a base fee of 10 plus the fares\" and put the 10 in as the identity. Sequentially it's added once. In parallel, every leaf starts from the identity: here the four numbers were split into four leaves, so the 10 was added four times (40 + 10 = 50). The exact wrong number depends on how the source was split. The identity must satisfy `op(identity, x) == x`. The fix is `10 + stream.sum()`.",
        },
        {
          type: "heading",
          text: "Order costs something",
        },
        {
          type: "code",
          language: "java",
          title: "OrderedOrNot.java",
          code: `import java.util.List;

public class OrderedOrNot {
    public static void main(String[] args) {
        List<String> queue = List.of("A", "B", "C", "D", "E", "F");
        StringBuilder any = new StringBuilder();
        queue.parallelStream().forEach(c -> { synchronized (any) { any.append(c); } });
        StringBuilder ordered = new StringBuilder();
        queue.parallelStream().forEachOrdered(ordered::append);
        System.out.println("forEach:        " + any);
        System.out.println("forEachOrdered: " + ordered);
        System.out.println("parallel toList " + queue.parallelStream().map(String::toLowerCase).toList());
    }
}`,
        },
        {
          type: "output",
          text: `forEach:        DFEABC
forEachOrdered: ABCDEF
parallel toList [a, b, c, d, e, f]`,
        },
        {
          type: "paragraph",
          text: "The `forEach` line came out as `DFEABC`, `DFEABC` and `DFEACB` on three runs. It varies, and that's the point: parallel `forEach` makes no ordering promise. `forEachOrdered` and `toList()` keep encounter order even in parallel, because the merge step puts left results before right ones. That costs some waiting, which is fine for collecting and wasteful if order didn't matter.",
        },
        {
          type: "heading",
          text: "When a parallel stream is worth trying",
        },
        {
          type: "list",
          items: [
            "Lots of data (tens of thousands of elements or more) **or** expensive work per element. The often-quoted rule of thumb is that N times the cost per element should be large, around 10,000 simple operations or more, before parallel has a chance.",
            "A source that splits well: arrays, `ArrayList`, `IntStream.range`, `HashMap` key sets. Not `LinkedList`, `Stream.iterate`, or `Files.lines` on a huge file without care.",
            "Pure CPU work with no I/O, no locks and no shared mutable state.",
            "Cheap combining: `sum`, `count`, `max`, `toList`. Merging big maps in `groupingBy` can eat the gain (the Collectors lesson covers `groupingByConcurrent`).",
            "Not inside a web request thread on a busy server. The request threads are already giving the CPU plenty to do, and the common pool is shared.",
          ],
        },
      ],
    },
    {
      title: "Streams in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A simple, realistic job: the driver app has a \"Today\" screen showing how many paid trips I've done, what I earned, and my best trip. In a Spring service, the trips come from a repository and the method is a few stream steps. This is the core of it, runnable on its own:",
        },
        {
          type: "code",
          language: "java",
          title: "DriverEarningsService.java",
          code: `import java.util.Comparator;
import java.util.List;
import java.util.Optional;

// @Service in the real app; the trips would come from a repository
public class DriverEarningsService {
    record Earnings(String driverId, int trips, double total, Optional<String> bestTripId) { }

    Earnings todayFor(String driverId, List<Trips.Trip> todaysTrips) {
        List<Trips.Trip> paid = todaysTrips.stream()
                .filter(t -> t.driverId().equals(driverId))
                .filter(t -> t.status().equals("COMPLETED"))
                .toList();

        double total = paid.stream().mapToDouble(Trips.Trip::fare).sum();
        Optional<String> best = paid.stream()
                .max(Comparator.comparingDouble(Trips.Trip::fare))
                .map(Trips.Trip::id);
        return new Earnings(driverId, paid.size(), total, best);
    }

    public static void main(String[] args) {
        DriverEarningsService service = new DriverEarningsService();
        System.out.println(service.todayFor("D2", Trips.TODAY));
        System.out.println(service.todayFor("D1", Trips.TODAY));
        System.out.println(service.todayFor("D9", Trips.TODAY));
    }
}`,
        },
        {
          type: "output",
          text: `Earnings[driverId=D2, trips=2, total=570.0, bestTripId=Optional[T2]]
Earnings[driverId=D1, trips=1, total=220.0, bestTripId=Optional[T1]]
Earnings[driverId=D9, trips=0, total=0.0, bestTripId=Optional.empty]`,
        },
        {
          type: "list",
          items: [
            "The two `filter` lines say exactly what counts: this driver, completed only. `T3` was cancelled, so driver `D1` shows one trip, not two.",
            "I collect the paid trips once with `toList()` and stream that list twice, because a stream can't be reused. For two cheap passes over a short list this is clearer than one clever pass.",
            "`mapToDouble(...).sum()` gives `0.0` for a driver with no trips, and `max` gives `Optional.empty`, so a brand-new driver (`D9`) gets a correct empty screen instead of an exception.",
            "`max(comparator)` finds the best trip in one pass without sorting.",
            "In a real app the money would be `BigDecimal` (or paise in a `long`), not `double`. Then the sum becomes `map(Trip::fare).reduce(BigDecimal.ZERO, BigDecimal::add)`.",
            "The filtering by driver and date belongs in the database query when the table is big. The stream is for shaping a result that's already small.",
          ],
        },
        {
          type: "paragraph",
          text: "Other places streams show up all the time in a backend: mapping entities to DTOs (`entities.stream().map(TripDto::from).toList()`), building a lookup map before a loop to avoid N+1 queries, validating a batch (`anyMatch` for the first invalid row), and reading a CSV upload with `Files.lines` inside try-with-resources. Grouping and reports are the Collectors lesson.",
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
              question: "What is a stream, and how is it different from a collection?",
              answer:
                "A collection stores elements. A stream is a pipeline of operations over a source: it stores nothing, computes on demand, and can be consumed only once. A collection is eager, a stream is lazy.\n\nAnother difference is iteration. With a collection I iterate externally (a `for` loop pulls each element). With a stream, the library iterates internally: the terminal operation makes the source push each element through the steps.",
            },
            {
              question: "What's the difference between intermediate and terminal operations?",
              answer:
                "Intermediate operations like `filter`, `map` and `sorted` return a new stream and do no work yet. They only add a stage to the pipeline. A terminal operation like `collect`, `forEach`, `count` or `findFirst` returns a non-stream result and triggers the execution of the whole pipeline.\n\nA pipeline has exactly one terminal operation, at the end. In my `LazyTrace` run, \"pipeline built, nothing ran yet\" printed before any filter or map output, because the lambdas only ran when `forEach` was called.",
            },
            {
              question: "What does it mean that streams are lazy?",
              answer:
                "Intermediate operations don't process anything when called. They record what to do, and the work happens when a terminal operation pulls the results. And it only does as much work as the terminal operation needs.\n\nThat's what makes short-circuiting and infinite streams possible. `Stream.iterate(1, n -> n + 1).limit(4)` only ever computes four elements.",
            },
            {
              question: "What's the difference between map and flatMap?",
              answer:
                "`map` transforms each element into exactly one element. `flatMap` transforms each element into a stream of zero or more elements and flattens all of those into one stream.\n\nWith three tables' order lists, `map` gave me a list of three lists, and `flatMap(List::stream)` gave one list of five items. Typical uses are \"all items across all orders\" or splitting lines into words.",
            },
            {
              question: "What is the difference between findFirst and findAny?",
              answer:
                "`findFirst` returns the first element in encounter order. `findAny` may return any element. Sequentially they usually return the same thing, but in parallel `findAny` can return whichever element a thread found first, which is cheaper because it doesn't have to wait for the leftmost piece.\n\nI use `findFirst` when order means something (the earliest booking) and `findAny` when I only need \"some match\".",
            },
            {
              question: "Why do IntStream, LongStream and DoubleStream exist?",
              answer:
                "To avoid boxing. `Stream<Integer>` holds `Integer` objects, and arithmetic on them unboxes and reboxes. The primitive streams hold raw values and have number methods: `sum`, `average`, `summaryStatistics`, `range`.\n\nInternally their sinks have `accept(int)`, `accept(long)` and `accept(double)` methods, so values flow through the pipeline without ever becoming objects. I convert with `mapToInt`/`mapToDouble`, and back with `boxed` or `mapToObj`.",
            },
            {
              question: "Can a stream be reused?",
              answer:
                "No. After a terminal operation, or after another stage has been chained onto it, the stream is consumed. Using it again throws `IllegalStateException: stream has already been operated upon or closed`, which is what my `SingleUse` program printed.\n\nTo run another pipeline, I create a new stream from the source, or keep a `Supplier<Stream<T>>`.",
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
              question: "What does this print: list.stream().peek(System.out::println).count() ?",
              answer:
                "On Java 9 and later, usually nothing from `peek`, just the count. If the pipeline is still `SIZED` (a list source with no `filter` or `flatMap`), `count()` takes the size from the source and doesn't traverse at all. On Java 8, it printed every element.\n\nMy `CountSkips` run showed both cases on JDK 21: no `peek` output before a `filter`, and all three lines once a `filter` was in the pipeline. It's why `peek` is documented as a debugging aid and shouldn't carry real side effects.",
            },
            {
              question: "What do allMatch and anyMatch return on an empty stream?",
              answer:
                "`allMatch` returns `true` and `noneMatch` returns `true`, whatever the predicate. `anyMatch` returns `false`. It's vacuous truth: there's no element that fails the condition.\n\nIt matters in business checks like \"ship if all items are paid\". With an empty cart, `allMatch` says yes, so the code also needs an explicit `isEmpty()` check.",
            },
            {
              question: "Why might reduce give a different answer in parallel?",
              answer:
                "Because in parallel each piece starts from the identity and partial results are combined. If the identity isn't a true identity, or the operation isn't associative, the answer depends on how the data was split.\n\nMy `BadIdentity` example used `reduce(10, Integer::sum)` on 1 to 4: `20` sequentially, `50` in parallel, because the 10 got added once per leaf. Subtraction is the classic non-associative example: `(a - b) - c` isn't `a - (b - c)`.",
            },
            {
              question: "Is filter-then-map the same as map-then-filter?",
              answer:
                "Not always in meaning, and rarely in cost. If the filter needs the original element, they're not interchangeable at all. When they are, filtering first means the map function runs only on the survivors.\n\nBecause of loop fusion, neither order creates a temporary list, so the only cost difference is how many times each lambda runs.",
            },
            {
              question: "Does sorted().findFirst() stop early?",
              answer:
                "No. `sorted` is a stateful barrier: it must see every element before it can know which is smallest. So the whole stream is buffered and sorted, and then `findFirst` takes one element.\n\n`min(comparator)` gives the same answer in a single pass with O(1) memory. My `SortedBarrier` trace showed every element \"arrive\" before the first one was \"released\".",
            },
            {
              question: "What's wrong with collecting results with forEach(list::add)?",
              answer:
                "It's a side effect on shared mutable state. Sequentially it happens to work. In parallel, several threads call `ArrayList.add` at once, which isn't thread-safe: elements get lost or it throws.\n\nMy `SharedListBug` run lost between about 2,000 and 4,000 of 10,000 elements, a different number every run, with no exception. `collect(Collectors.toList())` or `toList()` is correct in both modes.",
            },
            {
              question: "What's the difference between Stream.toList() and collect(Collectors.toList())?",
              answer:
                "`Stream.toList()` (Java 16) returns an unmodifiable list, allows nulls, and is a little shorter and often faster because it can size the array up front. `Collectors.toList()` (Java 8) makes no promise about the list type or mutability. Today it's an `ArrayList`, and code that adds to it depends on an implementation detail.\n\n`Collectors.toUnmodifiableList()` (Java 10) is unmodifiable too but rejects nulls. Switching a codebase from `collect(toList())` to `toList()` can break callers that modify the result.",
            },
            {
              question: "How is takeWhile different from filter?",
              answer:
                "`filter` checks every element and keeps all that match. `takeWhile` (Java 9) takes elements only until the first one that fails, and then stops completely, even if later elements would match.\n\nFor `[2, 4, 9, 3, 1]` with `< 5`, `filter` gave `[2, 4, 3, 1]` and `takeWhile` gave `[2, 4]`. `takeWhile` is short-circuiting, so it can end an infinite stream, and it's meant for ordered data like a sorted list or time-ordered events.",
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
              question: "What happens internally when you chain stream operations?",
              answer:
                "Each intermediate call creates a new pipeline stage object, a subclass of `AbstractPipeline`, that stores the operation's lambda and links to the previous stage. The first stage is `ReferencePipeline$Head`, holding the source spliterator. Every stage knows the source stage, its depth and its combined flags.\n\nI checked it with reflection: `filter` created `ReferencePipeline$2` at depth 1, `map` created `ReferencePipeline$3` at depth 2, and `sorted` a `SortedOps$OfRef` at depth 3, all pointing to the same head. No element is touched until a terminal operation is evaluated.",
            },
            {
              question: "What is a Sink, and how does the terminal operation use it?",
              answer:
                "`Sink` is an internal `Consumer` with `begin(size)`, `accept`, `end()` and `cancellationRequested()`. Each stage can wrap a downstream sink with its own logic: filter's sink calls `downstream.accept` only if the predicate passes, map's passes the mapped value.\n\nThe terminal operation creates its sink, then `wrapSink` walks the stages from last to first, each wrapping the sink so far. The source's spliterator then pushes elements into the outermost sink with `forEachRemaining`. A stack trace from inside a `map` lambda showed exactly that: `forEachRemaining`, then the filter sink's `accept`, then the map sink's `accept`, then my lambda.",
            },
            {
              question: "How does loop fusion work, and why does it matter?",
              answer:
                "All stateless operations between barriers run inside one loop, the source spliterator's `forEachRemaining`. Each element goes through every step via nested `accept` calls before the next element is read. No intermediate collection is created between `filter` and `map`.\n\nIt matters for memory (no temporary lists), for short-circuiting (the loop can stop at any element), and for speed once the JIT inlines the small sink methods. Stateful operations like `sorted` break the fusion: they buffer everything, then start a new pass downstream.",
            },
            {
              question: "What are StreamOpFlags used for?",
              answer:
                "They're internal bits (`DISTINCT`, `SORTED`, `ORDERED`, `SIZED`, `SHORT_CIRCUIT`, and `SIZE_ADJUSTING` on JDK 21) describing what's known about the stream at each stage. The source sets them from its spliterator characteristics, and each operation sets, clears or preserves them: `filter` clears `SIZED`, `sorted` sets `SORTED`.\n\nThe library uses them to skip work: `sorted()` on an already-sorted stream does nothing, `distinct()` on a distinct one does nothing, and `count()` on a `SIZED` pipeline returns the size without traversing. I watched them change through `stream.spliterator().characteristics()`.",
            },
            {
              question: "What is a Spliterator?",
              answer:
                "The \"splittable iterator\" every stream is built on. It pushes elements with `tryAdvance` and `forEachRemaining`, reports `estimateSize` and characteristics like `ORDERED`, `SIZED` and `SORTED`, and can `trySplit` itself into two parts for parallel processing.\n\nAn `ArrayList` spliterator splits at the midpoint and hands back the first half, so encounter order is preserved. On a list of eight, two splits gave pieces `[1, 2]`, `[3, 4]` and `[5, 6, 7, 8]`. Sources that can't jump to the middle, like `LinkedList`, split poorly.",
            },
            {
              question: "How does a parallel stream execute?",
              answer:
                "`parallel()` only sets a flag. The terminal operation then runs as a Fork/Join task in `ForkJoinPool.commonPool()`. Tasks recursively `trySplit` the source until pieces are small, about `size / (parallelism * 4)`, so there are roughly four pieces per worker for work-stealing. Each leaf runs the normal sequential sink chain on its piece, and parent tasks combine child results, left before right when order matters.\n\nThe common pool has `availableProcessors() - 1` threads (15 on my 16-core machine) because the calling thread helps too, and it's shared by the whole JVM.",
            },
            {
              question: "When should you not use parallel streams?",
              answer:
                "Small data or cheap per-element work, where splitting and merging cost more than they save. Sources that split badly, like `LinkedList` or `Stream.iterate`. Anything that blocks, like HTTP or database calls, because it starves the shared common pool. Pipelines with shared mutable state or order-sensitive stateful operations like `limit` on ordered data.\n\nAnd inside request-handling code on a busy server, where all cores are already in use. Parallel streams are for big CPU-bound batch work, and only after measuring with something like JMH.",
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
              question: "Given a list of trips, return the ids of completed trips with a fare above 200, highest fare first.",
              answer:
                "`trips.stream().filter(t -> t.status().equals(\"COMPLETED\")).filter(t -> t.fare() > 200).sorted(Comparator.comparingDouble(Trip::fare).reversed()).map(Trip::id).toList()`\n\nFilter before sorting so fewer elements are sorted, and map to the id last because the sort needs the fare. On my data set this gives `[T4, T2, T1]`.",
            },
            {
              question: "Find the second-highest distinct fare.",
              answer:
                "`trips.stream().map(Trip::fare).distinct().sorted(Comparator.reverseOrder()).skip(1).findFirst()`, which returns an `Optional<Double>`, empty if there's fewer than two distinct fares.\n\nThis sorts everything, which is fine for small lists. For a huge list, a one-pass loop tracking the top two values is O(n) instead of O(n log n).",
            },
            {
              question: "Count the words in a list of sentences.",
              answer:
                "`lines.stream().flatMap(line -> Arrays.stream(line.split(\"\\\\s+\"))).filter(w -> !w.isEmpty()).count()`\n\n`flatMap` turns each line into a stream of words and joins them into one stream. The `filter` drops the empty string that `split` produces for a line with leading spaces.",
            },
            {
              question: "Generate the first 10 multiples of 7 without a loop.",
              answer:
                "`IntStream.rangeClosed(1, 10).map(n -> n * 7).boxed().toList()`, or `Stream.iterate(7, n -> n + 7).limit(10).toList()`.\n\nThe `IntStream` version avoids boxing until the end and splits well if it ever went parallel. The `iterate` version reads like the definition but can't be parallelized well because each element depends on the previous one.",
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
          text: "All of these use the `Trips` class from Syntax at a Glance. Write each one, predict the output, then run it.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Total fare of **cancelled** trips. Hint: `filter`, then `mapToDouble`, then `sum`.",
            "The first five even numbers from an infinite `Stream.iterate`. Hint: `filter` before `limit`. What happens if you swap them?",
            "The sum of 1 to 100 with no loop. Hint: `IntStream.rangeClosed`.",
            "Every distinct word from two sentences, sorted. Hint: `flatMap` with `Stream.of(line.split(\" \"))`.",
            "How many different drivers worked today. Hint: `map`, `distinct`, `count`.",
            "The average fare in Delhi. Hint: `average()` returns an `OptionalDouble`. Why not a plain `double`?",
            "Add `peek` calls to exercise 1 and check that each trip goes through every step before the next trip starts.",
            "Take `SharedListBug`, run it a few times, then fix it two ways: with `collect`, and with `Collections.synchronizedList`. Which one is the right fix, and why?",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "StreamSolutions.java (exercises 1 to 6)",
          code: `import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

public class StreamSolutions {
    public static void main(String[] args) {
        System.out.println(Trips.TODAY.stream().filter(t -> t.status().equals("CANCELLED"))
                .mapToDouble(Trips.Trip::fare).sum());
        System.out.println(Stream.iterate(1, n -> n + 1).filter(n -> n % 2 == 0).limit(5)
                .collect(Collectors.toList()));
        System.out.println(IntStream.rangeClosed(1, 100).sum());
        List<String> lines = List.of("one tea please", "two tea and one samosa");
        System.out.println(lines.stream().flatMap(l -> Stream.of(l.split(" ")))
                .distinct().sorted().collect(Collectors.toList()));
        System.out.println(Trips.TODAY.stream().map(Trips.Trip::driverId).distinct().count());
        System.out.println(Trips.TODAY.stream().filter(t -> t.city().equals("Delhi"))
                .mapToDouble(Trips.Trip::fare).average());
    }
}`,
        },
        {
          type: "output",
          text: `450.0
[2, 4, 6, 8, 10]
5050
[and, one, please, samosa, tea, two]
3
OptionalDouble[285.0]`,
        },
        {
          type: "qa",
          items: [
            {
              question: "Exercise 2: what happens if limit comes before filter?",
              answer:
                "`Stream.iterate(1, n -> n + 1).limit(5).filter(n -> n % 2 == 0)` gives `[2, 4]`. `limit` takes the first five numbers (1 to 5), and only then are the odd ones dropped.\n\nOrder matters for stateful operations. If the filter could never match (say `n < 0`) with `limit` after it, the stream would run forever, because `limit` never gets its five elements.",
            },
            {
              question: "Exercise 8: which fix is right?",
              answer:
                "`collect(Collectors.toList())` (or `toList()`). A synchronized list makes the size correct, but every thread now queues for one lock, so the parallel stream is slower than a sequential one, and the order of the elements is still random.\n\n`collect` gives each leaf its own list and merges them in order at the end, so there's no lock and no lost elements.",
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
          text: `PIPELINE   source -> intermediate* -> ONE terminal
LAZY       nothing runs until the terminal op
FUSED      one element through all steps, then the next
SHORT      findFirst/anyMatch/limit/takeWhile stop early

STATELESS  filter map flatMap peek mapToX boxed
STATEFUL   sorted distinct limit skip   (sorted = barrier)
TERMINAL   collect toList(16) forEach reduce count
           min max sum average  any/all/noneMatch  findX

INSIDE     stages: Head -> $2 -> $3 ... (AbstractPipeline)
           terminal: wrapSink last->first, then
           spliterator.forEachRemaining(outermostSink)
           flags: ORDERED SIZED SORTED DISTINCT SHORT_CIRCUIT

PRIMITIVE  IntStream/LongStream/DoubleStream: no boxing
           mapToInt  boxed  mapToObj  summaryStatistics
EMPTY      allMatch=true  anyMatch=false  average=empty

PARALLEL   commonPool (cores-1), trySplit, combine
           no shared state, no blocking, measure first
JAVA 9+    takeWhile dropWhile ofNullable iterate(s,p,n)
JAVA 16    toList() unmodifiable, nulls ok`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A stream is a lazy description of work over a source. The terminal operation builds a chain of sinks and the source pushes each element through it, one at a time.",
            "Stateless steps fuse into one loop. Stateful steps like `sorted` buffer everything, and short-circuiting steps stop the source early.",
            "Keep lambdas pure, prefer primitive streams for numbers, and treat `parallel()` as an optimization to prove, not a default. Collecting results properly is the next lesson: Collectors.",
          ],
        },
      ],
    },
  ],
};
