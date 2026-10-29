import type { Lesson } from "../types";

export const completableFuture: Lesson = {
  slug: "completable-future",
  date: "2026-10-29",
  title: "CompletableFuture",
  description:
    "How Java 8's CompletableFuture lets me start slow work in the background and say what happens next, without blocking: chaining, combining, error handling, timeouts, which thread really runs each callback, and the stack of waiting callbacks inside every future.",
  tags: ["Java 8", "Concurrency", "CompletableFuture", "Async"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "When I order food on an app, I don't stand at the restaurant door until it's cooked. I place the order and go back to watching TV. When it's ready, it gets delivered, and the app tells me.",
        },
        {
          type: "paragraph",
          text: "A **CompletableFuture** works like that order. I start some slow work on another thread (a separate worker running at the same time), and I get back an object that will hold the result later. I can also attach the next step, like `thenApply`, which runs by itself once the result is ready.",
        },
        {
          type: "paragraph",
          text: "I use it when my code has to wait on slow things, like calling another server, and I don't want my program to sit idle. `join()` is me finally opening the door and taking the food.",
        },
        {
          type: "code",
          language: "java",
          code: `CompletableFuture<String> order = CompletableFuture
        .supplyAsync(() -> "Paneer pizza")          // cooked on another thread
        .thenApply(food -> food + " delivered");    // runs when it's ready
System.out.println("Watching TV while I wait...");
System.out.println(order.join());`,
        },
        {
          type: "output",
          text: `Watching TV while I wait...
Paneer pizza delivered`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "A CompletableFuture is a result that arrives later, and I can say what to do with it before it arrives.",
        },
      ],
    },
    {
      title: "What CompletableFuture Is",
      blocks: [
        {
          type: "paragraph",
          text: "Think of ordering at a busy tea stall. I pay, I get a token, and I step aside. I don't stand at the counter staring at the kettle. When my tea is ready, they call my number, and then I add sugar, pick up a biscuit and walk off. The token is the promise of a result that doesn't exist yet.",
        },
        {
          type: "paragraph",
          text: "A **CompletableFuture** is that token in Java. It stands for a value that some other thread is still working on: a reply from a maps API, a database row, a payment status. The important part is the \"then\" bit. I can say **what should happen when the result arrives** (`thenApply`, `thenAccept`, `thenCombine`) without blocking my thread while I wait.",
        },
        {
          type: "paragraph",
          text: "It lives in `java.util.concurrent`, it came with Java 8, and it implements two interfaces: the old `Future` (so `get()` still works) and the new `CompletionStage` (all the `then...` methods). This lesson goes through the everyday methods first, and then opens the class up to see the stack of callbacks it keeps inside, because that's what decides which thread runs my code.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 5 gave us `ExecutorService` and `Future`. I could submit a job to a thread pool and get a `Future` back. But a `Future` can only do three useful things: tell me if it's done, cancel, and `get()`, which **blocks** until the value is there. There's no way to say \"when it's done, do this\". Here's the tea stall with a plain `Future`:",
        },
        {
          type: "code",
          language: "java",
          title: "FutureLimits.java",
          code: `import java.util.concurrent.*;

public class FutureLimits {
    public static void main(String[] args) throws Exception {
        ExecutorService kitchen = Executors.newFixedThreadPool(2);

        Future<String> order = kitchen.submit(() -> {
            Thread.sleep(300);                  // cooking
            return "masala dosa";
        });

        System.out.println("done yet? " + order.isDone());
        String food = order.get();              // main thread just waits here
        System.out.println("got " + food);
        System.out.println("done yet? " + order.isDone());
        kitchen.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `done yet? false
got masala dosa
done yet? true`,
        },
        {
          type: "paragraph",
          text: "It works, but `get()` is me standing at the counter. Things `Future` couldn't do:",
        },
        {
          type: "list",
          items: [
            "Attach a callback (\"when ready, add chutney\") without blocking a thread.",
            "Chain steps, where step 2 needs step 1's result.",
            "Combine two futures (\"when both the fare and the ETA are ready\").",
            "Handle an error in the pipeline instead of catching `ExecutionException` at the very end.",
            "Complete it by hand, from my own code, for example from a callback-based library.",
          ],
        },
        {
          type: "paragraph",
          text: "Libraries filled the gap first: Guava's `ListenableFuture`, Netty's futures, and Doug Lea's work in the JSR 166 group. `CompletableFuture` came out of that JSR 166 work and shipped in **Java 8 (2014)**, the same release as lambdas, which is what makes all the `then...(x -> ...)` calls readable. Java 9 added timeouts (`orTimeout`, `completeOnTimeout`) and `delayedExecutor`. Java 21 added virtual threads, which change how I'd pick an executor, and I come back to that near the end.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "A food delivery order mapped onto this class really well for me:",
        },
        {
          type: "list",
          items: [
            "Placing the order is `supplyAsync(...)`. The restaurant (another thread) starts cooking, and I get an order id straight away (the future).",
            "\"When it's cooked, pack it\" is `thenApply`. It takes the food and turns it into something else.",
            "\"When it's packed, notify me\" is `thenAccept`. It uses the value and returns nothing.",
            "\"When the food and the rider are both ready, start the delivery\" is `thenCombine`.",
            "\"Find the restaurant first, then place the order there\" is `thenCompose`: the second step is itself an async job that needs the first one's answer.",
            "\"If the restaurant cancels, give me a voucher\" is `exceptionally`.",
            "\"If it takes more than 40 minutes, give up\" is `orTimeout`.",
          ],
        },
        {
          type: "paragraph",
          text: "And the part that took me longest: the order slip pinned on the kitchen board is the **stack of dependents**. Every \"when it's ready, do X\" I add is another note pinned on that board. Whoever finishes cooking reads the notes and does them. If the food was already cooked when I pinned the note, I do it myself, right away. That one picture explains which thread runs my callbacks.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/completablefuture-fan-out.svg",
          alt: "A quote request fans out to Maps ETA, base fare and surge calls running in parallel on an executor; surge falls back to 1.0 with completeOnTimeout; thenCombine and allOf join the results into a quote response guarded by orTimeout",
          caption: "Start independent calls with `supplyAsync` on your pool, join them with `thenCombine` or `allOf`, and use `completeOnTimeout`/`orTimeout` so one slow call cannot hang the request.",
        },
        {
          type: "heading",
          text: "Starting work: supplyAsync and runAsync",
        },
        {
          type: "table",
          headers: ["Method", "Takes", "Returns", "Use it for"],
          rows: [
            ["`supplyAsync(supplier)`", "`Supplier<T>`", "`CompletableFuture<T>`", "Work that produces a value: fetch a fare"],
            ["`runAsync(runnable)`", "`Runnable`", "`CompletableFuture<Void>`", "Work with no result: send an SMS"],
            ["`completedFuture(value)`", "a value", "an already-done future", "Tests, cache hits, fallbacks"],
            ["`new CompletableFuture<>()`", "nothing", "an empty future", "Completing it myself later with `complete(v)`"],
          ],
        },
        {
          type: "paragraph",
          text: "Both `supplyAsync` and `runAsync` have a second version that takes an `Executor`. Without one, the work runs on `ForkJoinPool.commonPool()`, a pool shared by the whole JVM, the same one parallel streams use. On my 16-core machine it has 15 threads (CPU count minus one). There's a special case I only learned by testing: if that parallelism is less than 2, `CompletableFuture` doesn't use the common pool at all and starts a **new thread per task** instead.",
        },
        {
          type: "heading",
          text: "Doing something with the result",
        },
        {
          type: "table",
          headers: ["Method", "Gets", "Returns", "Like"],
          rows: [
            ["`thenApply(fn)`", "the value", "a new value", "`map` on a stream"],
            ["`thenAccept(consumer)`", "the value", "nothing (`Void`)", "`forEach`"],
            ["`thenRun(runnable)`", "nothing", "nothing (`Void`)", "\"after that, do this\""],
            ["`thenCompose(fn)`", "the value", "another future, flattened", "`flatMap`"],
            ["`thenCombine(other, fn)`", "both values", "a new value", "a zip of two results"],
          ],
        },
        {
          type: "paragraph",
          text: "Every one of these returns a **new** `CompletableFuture`. The original isn't changed. That's why the calls chain: each step is a new future that depends on the one before it.",
        },
        {
          type: "heading",
          text: "Waiting for many",
        },
        {
          type: "list",
          items: [
            "`allOf(f1, f2, f3)` finishes when all of them finish. It returns `CompletableFuture<Void>`, so I read the values from the original futures afterwards.",
            "`anyOf(f1, f2, f3)` finishes with the first one that finishes, value or error. It returns `CompletableFuture<Object>`, so the type is lost.",
          ],
        },
        {
          type: "heading",
          text: "Errors",
        },
        {
          type: "table",
          headers: ["Method", "Runs when", "Can change the result?"],
          rows: [
            ["`exceptionally(fn)`", "only on failure", "Yes, returns a fallback value"],
            ["`handle((value, ex) -> ...)`", "always", "Yes, returns whatever it wants"],
            ["`whenComplete((value, ex) -> ...)`", "always", "No, it's for logging or cleanup. The original value or error passes through"],
          ],
        },
        {
          type: "heading",
          text: "The Async variants",
        },
        {
          type: "paragraph",
          text: "Nearly every `then...` method comes in three forms: `thenApply(fn)`, `thenApplyAsync(fn)` and `thenApplyAsync(fn, executor)`. The difference is only **which thread runs fn**. The plain version runs it on whichever thread completes the previous step, or on my own thread if that step is already done. The `Async` version always hands it to an executor: the common pool, or the one I pass.",
        },
        {
          type: "heading",
          text: "Getting the value out",
        },
        {
          type: "table",
          headers: ["Method", "Blocks?", "On failure throws"],
          rows: [
            ["`get()`", "yes", "`ExecutionException` (checked), plus `InterruptedException`"],
            ["`get(timeout, unit)`", "up to the timeout", "same, plus `TimeoutException`"],
            ["`join()`", "yes", "`CompletionException` (unchecked)"],
            ["`getNow(fallback)`", "no", "returns the fallback if not done yet"],
            ["`resultNow()` (Java 19+)", "no", "`IllegalStateException` if not completed normally"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/completablefuture-threads.svg",
          alt: "Decision diagram for which thread runs a callback: if the future is not done yet, the thread that completes it; if already done, the caller thread; with thenApplyAsync, an executor thread, defaulting to ForkJoinPool.commonPool",
          caption: "A plain `thenApply` runs on whichever thread completes the future, or on the caller if it is already done; the `*Async` versions always hand off to an executor.",
        },
        {
          type: "paragraph",
          text: "I wanted to know what's actually inside the object, because the thread rules only made sense once I'd seen it. I read `CompletableFuture.java` from the JDK 21 source and then wrote small programs to check each claim.",
        },
        {
          type: "heading",
          text: "Two fields do all the work",
        },
        {
          type: "code",
          language: "java",
          title: "Inside CompletableFuture (simplified from the JDK source)",
          code: `public class CompletableFuture<T> implements Future<T>, CompletionStage<T> {
    volatile Object result;     // null = not done yet; otherwise the value or an AltResult
    volatile Completion stack;  // the waiting callbacks, newest on top

    static final class AltResult { final Throwable ex; }  // wraps null values and errors
}`,
        },
        {
          type: "list",
          items: [
            "`result` is `null` while the work is still running. When it finishes, it's set **once**, with a compare-and-set (CAS). A normal value goes in as is. A `null` value or an exception is wrapped in an `AltResult`, so that `null` can keep meaning \"not done yet\".",
            "`stack` is a linked list of `Completion` objects, one per callback that's waiting. `thenApply` adds a `UniApply`, `thenAccept` a `UniAccept`, `thenCombine` a `BiApply`, and so on. New ones are pushed on top with CAS too, so there's no lock anywhere.",
            "Each `Completion` knows its source future, the function to run, the new future it should complete, and the executor (if it's an `Async` variant).",
          ],
        },
        {
          type: "paragraph",
          text: "Because the result is set with a CAS, only the first `complete` wins. Everything after that is ignored and returns `false`. I could see both the stack and the one-shot result from outside, using `toString()` and `getNumberOfDependents()`:",
        },
        {
          type: "code",
          language: "java",
          title: "Dependents.java",
          code: `import java.util.concurrent.CompletableFuture;

public class Dependents {
    // toString() is "CompletableFuture@<hash>[state]"; keep just the state
    static String state(CompletableFuture<?> f) {
        String s = f.toString();
        return s.substring(s.indexOf('['));
    }

    public static void main(String[] args) {
        CompletableFuture<String> order = new CompletableFuture<>();   // nobody is cooking yet
        System.out.println(state(order));

        order.thenRun(() -> System.out.println("  SMS the customer"));
        order.thenRun(() -> System.out.println("  update the app"));
        order.thenRun(() -> System.out.println("  print the bill"));
        System.out.println(state(order));

        System.out.println("complete(): " + order.complete("ready"));
        System.out.println(state(order) + ", dependents=" + order.getNumberOfDependents());
        System.out.println("complete() again: " + order.complete("late") + ", value: " + order.join());
    }
}`,
        },
        {
          type: "output",
          text: `[Not completed]
[Not completed, 3 dependents]
  print the bill
  update the app
  SMS the customer
complete(): true
[Completed normally], dependents=0
complete() again: false, value: ready`,
        },
        {
          type: "list",
          items: [
            "Three `thenRun` calls pushed three `Completion` objects: `3 dependents`.",
            "`complete(\"ready\")` set `result`, and then, **on the same thread, before returning**, ran all three callbacks. That's why the three lines print before `complete(): true`.",
            "They ran newest first: \"print the bill\" was added last and ran first. That's the stack popping. I would never rely on that order in real code (the docs promise no order), but it's a nice proof that it really is a stack.",
            "The second `complete(\"late\")` returned `false` and the value stayed `ready`.",
          ],
        },
        {
          type: "heading",
          text: "postComplete: who runs the callbacks",
        },
        {
          type: "paragraph",
          text: "When a future gets its result, the completing thread calls an internal method, `postComplete()`. In plain words, it does this:",
        },
        {
          type: "code",
          language: "text",
          code: `postComplete():
    while the stack (of this future, or of a future it just completed) is not empty:
        pop one Completion
        run it:
            if it's an Async completion -> hand it to its executor and move on
            else                        -> run the function right here, on this thread
        if running it completed another future that also has waiters,
            keep going with that future's stack too (no recursion, so long chains
            can't overflow the stack)`,
        },
        {
          type: "paragraph",
          text: "And when I attach a callback, `thenApply` first checks `result`. If it's already set, there's nothing to wait for, so it runs the function **immediately, on my thread**. If not, it pushes a `Completion` and then checks again, in case the result arrived in between. That double-check is how it avoids a callback being lost in a race.",
        },
        {
          type: "heading",
          text: "Seeing the thread rules",
        },
        {
          type: "paragraph",
          text: "Thread names normally vary from run to run, so I gave my threads fixed names and used a latch to control exactly when the cook finishes. That makes this output the same every time:",
        },
        {
          type: "code",
          language: "java",
          title: "WhoRuns.java",
          code: `import java.util.concurrent.*;

public class WhoRuns {
    static String who() { return Thread.currentThread().getName(); }

    public static void main(String[] args) throws Exception {
        ExecutorService kitchen = Executors.newSingleThreadExecutor(r -> new Thread(r, "cook"));
        ExecutorService waiters = Executors.newSingleThreadExecutor(r -> new Thread(r, "waiter"));
        CountDownLatch go = new CountDownLatch(1);

        // 1. Callback attached BEFORE the result exists
        CompletableFuture<String> dosa = CompletableFuture.supplyAsync(() -> {
            await(go);                                   // hold the cook until we're ready
            return "dosa";
        }, kitchen);
        CompletableFuture<Void> early = dosa.thenAccept(d -> System.out.println("early callback ran on: " + who()));
        go.countDown();                                  // let the cook finish
        early.join();

        // 2. Callback attached AFTER the result exists
        dosa.thenAccept(d -> System.out.println("late callback ran on:  " + who())).join();

        // 3. Async variant with my own executor
        dosa.thenAcceptAsync(d -> System.out.println("async callback ran on: " + who()), waiters).join();

        // 4. Async variant with no executor: common pool
        dosa.thenAcceptAsync(d -> System.out.println("default async on pool: " + who().startsWith("ForkJoinPool.commonPool-worker-"))).join();

        kitchen.shutdown();
        waiters.shutdown();
    }

    static void await(CountDownLatch l) {
        try { l.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `early callback ran on: cook
late callback ran on:  main
async callback ran on: waiter
default async on pool: true`,
        },
        {
          type: "list",
          items: [
            "**Case 1:** the callback was pinned on the board before the dosa was ready, so the thread that finished cooking (`cook`) ran it inside `postComplete`.",
            "**Case 2:** the dosa was already done, so `thenAccept` ran the lambda on the spot, on `main`, the thread that called `thenAccept`.",
            "**Case 3:** `thenAcceptAsync(..., waiters)` always goes to the executor I gave it.",
            "**Case 4:** `thenAcceptAsync` with no executor goes to the common pool. The worker number changes between runs, which is why I only printed whether the name starts with `ForkJoinPool.commonPool-worker-`.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "My old notes said \"thenApply runs on the same thread as supplyAsync\"",
          text: "Only sometimes. It runs on the thread that **completes** the previous stage if the callback was registered in time, and on the **caller's** thread if the stage was already finished. In a real app the timing decides, so the plain `thenApply` can end up running on a request thread, a pool thread, or an HTTP client's I/O thread. If the callback is slow or blocking, I use the `Async` version with my own executor so I know where it runs.",
        },
        {
          type: "heading",
          text: "How exceptions travel",
        },
        {
          type: "paragraph",
          text: "If the supplier throws, the future's `result` becomes an `AltResult` holding the exception, wrapped in a `CompletionException`. Every dependent stage sees that, skips its function (a `thenApply` doesn't run on failure), and passes the same failure on to its own future.",
        },
        {
          type: "paragraph",
          text: "The error flows down the chain until something like `exceptionally` or `handle` turns it back into a value. That's why in the examples below, `whenComplete` sees a `CompletionException` and not my original `IllegalStateException`: I have to call `getCause()` to get the real one.",
        },
      ],
    },
    {
      title: "The Chain in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `supplyAsync(fetchFare)          thenApply(addTip)          thenAccept(print)
┌─────────────────────┐       ┌───────────────────┐       ┌──────────────────┐
│ CF #1               │       │ CF #2             │       │ CF #3            │
│ result: null ──► 180│──────►│ result: null ► 200│──────►│ result: null ► ✓ │
│ stack: [UniApply]   │       │ stack: [UniAccept]│       │ stack: []        │
└─────────────────────┘       └───────────────────┘       └──────────────────┘
          ▲
   pool thread sets result = 180 (CAS), then postComplete():
     pops UniApply  -> runs addTip  -> completes CF #2
     CF #2 has a waiter -> pops UniAccept -> runs print -> completes CF #3
   all on the same pool thread, because none of these are Async`,
          caption: "Each then... call makes a new future and pins a Completion on the previous one. Completing the first one walks the whole chain.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "FirstCf.java",
          code: `import java.util.concurrent.CompletableFuture;

public class FirstCf {
    public static void main(String[] args) {
        CompletableFuture<String> order =
            CompletableFuture.supplyAsync(() -> "masala dosa")   // cook it in the background
                .thenApply(food -> food + " with chutney")       // then add a side
                .thenApply(String::toUpperCase);                 // then label it

        order.thenAccept(food -> System.out.println("Serving: " + food))
             .join();                                            // wait for the whole chain
        System.out.println("Done");
    }
}`,
        },
        {
          type: "output",
          text: `Serving: MASALA DOSA WITH CHUTNEY
Done`,
        },
        {
          type: "paragraph",
          text: "I `join()` the **last** stage, the `thenAccept`, not `order`. If I had joined `order` instead, `main` could wake up the moment the value was set, possibly before the pool thread got round to running the print callback, and the two lines could swap. Joining the end of the chain waits for everything.",
        },
        {
          type: "code",
          language: "java",
          title: "The methods I use most, side by side",
          code: `CompletableFuture<Integer> fare = CompletableFuture.supplyAsync(() -> 180);       // start
CompletableFuture<Void>    sms  = CompletableFuture.runAsync(() -> sendSms());     // start, no value

fare.thenApply(f -> f + 20);                              // transform
fare.thenAccept(f -> System.out.println(f));              // consume
fare.thenRun(() -> System.out.println("done"));           // just run after
fare.thenCompose(f -> applyCoupon(f));                    // next async step
fare.thenCombine(eta, (f, e) -> f + " in " + e + " min"); // merge two

fare.exceptionally(ex -> 150);                            // fallback on error
fare.handle((f, ex) -> ex == null ? f : 150);             // value or error
fare.whenComplete((f, ex) -> log(f, ex));                 // peek, can't change

fare.orTimeout(1, TimeUnit.SECONDS);                      // Java 9+: fail if slow
fare.completeOnTimeout(150, 1, TimeUnit.SECONDS);         // Java 9+: default if slow

CompletableFuture.allOf(a, b, c).join();                  // wait for all
CompletableFuture.anyOf(a, b, c).join();                  // first one wins
fare.join();                                              // block, unchecked
fare.get();                                               // block, checked`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "thenApply, thenAccept, thenRun: a cab fare",
        },
        {
          type: "paragraph",
          text: "After a ride, the app gets the fare, adds the tip, shows \"Pay 200\", then says thanks. Three steps, three methods, each picked by what goes in and what comes out:",
        },
        {
          type: "code",
          language: "java",
          title: "ApplyAcceptRun.java",
          code: `import java.util.concurrent.CompletableFuture;

public class ApplyAcceptRun {
    public static void main(String[] args) {
        CompletableFuture<Integer> fare = CompletableFuture.supplyAsync(() -> 180);

        CompletableFuture<Integer> withTip = fare.thenApply(f -> f + 20);   // value in, value out
        CompletableFuture<Void> printed  = withTip.thenAccept(f -> System.out.println("Pay " + f));
        CompletableFuture<Void> thanked  = printed.thenRun(() -> System.out.println("Thanks for riding"));

        thanked.join();
        System.out.println(withTip.join() + " " + printed.join() + " " + thanked.join());
    }
}`,
        },
        {
          type: "output",
          text: `Pay 200
Thanks for riding
200 null null`,
        },
        {
          type: "paragraph",
          text: "The last line is the tell. `withTip` holds `200`, but `printed` and `thanked` are `CompletableFuture<Void>`, and the only value of type `Void` is `null`. Once I `thenAccept`, the value is gone from the chain.",
        },
        {
          type: "heading",
          text: "thenCompose versus thenCombine: booking a driver",
        },
        {
          type: "paragraph",
          text: "Real life: I can't look for a driver until I know who the rider is (one step **depends** on the other). But the ETA and the driver search don't depend on each other at all (they're **independent**). `thenCompose` is for the first case and `thenCombine` for the second:",
        },
        {
          type: "code",
          language: "java",
          title: "ComposeCombine.java",
          code: `import java.util.concurrent.CompletableFuture;

public class ComposeCombine {
    static CompletableFuture<String> findDriver(String rider) {
        return CompletableFuture.supplyAsync(() -> "Ravi for " + rider);
    }
    static CompletableFuture<Integer> etaMinutes() {
        return CompletableFuture.supplyAsync(() -> 4);
    }

    public static void main(String[] args) {
        CompletableFuture<String> rider = CompletableFuture.supplyAsync(() -> "Asha");

        // thenApply with an async function: a future inside a future
        CompletableFuture<CompletableFuture<String>> nested = rider.thenApply(r -> findDriver(r));
        System.out.println("nested:   " + nested.join().join());

        // thenCompose flattens it: step 2 depends on step 1
        CompletableFuture<String> driver = rider.thenCompose(r -> findDriver(r));
        System.out.println("compose:  " + driver.join());

        // thenCombine: two independent jobs, merge when both finish
        String msg = driver.thenCombine(etaMinutes(), (d, eta) -> d + ", arriving in " + eta + " min").join();
        System.out.println("combine:  " + msg);
    }
}`,
        },
        {
          type: "output",
          text: `nested:   Ravi for Asha
compose:  Ravi for Asha
combine:  Ravi for Asha, arriving in 4 min`,
        },
        {
          type: "list",
          items: [
            "`thenApply(r -> findDriver(r))` works, but the type is `CompletableFuture<CompletableFuture<String>>` and I needed `.join().join()`. That's the classic sign I wanted `thenCompose`.",
            "`thenCompose` is the `flatMap` of futures: the function returns a future, and the result is flattened into one.",
            "`thenCombine` started `etaMinutes()` straight away, alongside the driver search, and merged the two results when both were done.",
          ],
        },
        {
          type: "heading",
          text: "allOf and anyOf: comparing cab apps",
        },
        {
          type: "paragraph",
          text: "I ask three cab apps for a price at once. For the cheapest, I need **all** answers. For \"just get me any car quickly\", I take the **first** answer:",
        },
        {
          type: "code",
          language: "java",
          title: "AllAny.java",
          code: `import java.util.List;
import java.util.concurrent.CompletableFuture;

public class AllAny {
    static CompletableFuture<Integer> quote(String app, int price, long delayMs) {
        return CompletableFuture.supplyAsync(() -> {
            sleep(delayMs);
            return price;
        });
    }

    public static void main(String[] args) {
        List<CompletableFuture<Integer>> quotes = List.of(
            quote("AppA", 210, 100), quote("AppB", 185, 300), quote("AppC", 240, 50));

        CompletableFuture<Void> all = CompletableFuture.allOf(quotes.toArray(new CompletableFuture[0]));
        int cheapest = all.thenApply(v -> quotes.stream().mapToInt(CompletableFuture::join).min().getAsInt()).join();
        System.out.println("cheapest of all: " + cheapest);

        Object first = CompletableFuture.anyOf(
            quote("Slow", 999, 1000), quote("Fast", 199, 10)).join();
        System.out.println("first to answer: " + first);
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `cheapest of all: 185
first to answer: 199`,
        },
        {
          type: "paragraph",
          text: "`allOf` gives back a `CompletableFuture<Void>`, so inside `thenApply` I go back to the original list and `join()` each one. Those joins don't block, because `allOf` already guaranteed they're all done. `anyOf` gives an `Object`, so in real code I'd cast it. I made the delays 10 ms against 1000 ms so the winner is the same every run.",
        },
        {
          type: "heading",
          text: "exceptionally, handle, whenComplete: when the surge service is down",
        },
        {
          type: "paragraph",
          text: "Everyday version: if the surge-pricing service fails, I still want to show a price, just without surge. Three ways to react:",
        },
        {
          type: "code",
          language: "java",
          title: "Errors.java",
          code: `import java.util.concurrent.CompletableFuture;

public class Errors {
    static CompletableFuture<Integer> surge(boolean fail) {
        return CompletableFuture.supplyAsync(() -> {
            if (fail) throw new IllegalStateException("surge service down");
            return 2;
        });
    }

    public static void main(String[] args) {
        // exceptionally: only runs on failure, gives a fallback value
        int a = surge(true).exceptionally(ex -> 1).join();
        System.out.println("exceptionally -> " + a);

        // handle: always runs, sees either the value or the error
        String b = surge(true).handle((v, ex) -> ex == null ? "x" + v : "fallback, because " + ex.getMessage()).join();
        System.out.println("handle        -> " + b);

        // whenComplete: always runs, but can't change the result
        try {
            surge(true).whenComplete((v, ex) -> System.out.println("whenComplete saw: " + ex.getClass().getSimpleName())).join();
        } catch (Exception e) {
            System.out.println("join threw:     " + e.getClass().getSimpleName() + " / cause " + e.getCause().getClass().getSimpleName());
        }
    }
}`,
        },
        {
          type: "output",
          text: `exceptionally -> 1
handle        -> fallback, because java.lang.IllegalStateException: surge service down
whenComplete saw: CompletionException
join threw:     CompletionException / cause IllegalStateException`,
        },
        {
          type: "list",
          items: [
            "`exceptionally` turned the failure into `1` (no surge). On success it would be skipped entirely.",
            "`handle` gets both arguments, and exactly one of them is meaningful. Look at the message, though: `java.lang.IllegalStateException: surge service down`. The `ex` I got is a `CompletionException` wrapping my exception, and its message is the cause's `toString()`. For the clean message, `ex.getCause().getMessage()`.",
            "`whenComplete` saw the error but couldn't fix it, so `join()` still threw. It's a peek, for logging or metrics.",
          ],
        },
        {
          type: "heading",
          text: "join versus get: sending an OTP",
        },
        {
          type: "code",
          language: "java",
          title: "JoinVsGet.java",
          code: `import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

public class JoinVsGet {
    public static void main(String[] args) throws InterruptedException {
        CompletableFuture<String> otp = CompletableFuture.supplyAsync(() -> {
            throw new IllegalArgumentException("bad phone number");
        });

        try {
            otp.get();                                   // checked exceptions
        } catch (ExecutionException e) {
            System.out.println("get()  -> " + e.getClass().getSimpleName() + ": " + e.getCause().getMessage());
        }
        try {
            otp.join();                                  // unchecked
        } catch (RuntimeException e) {
            System.out.println("join() -> " + e.getClass().getSimpleName() + ": " + e.getCause().getMessage());
        }
        System.out.println("getNow -> " + new CompletableFuture<String>().getNow("not ready"));
    }
}`,
        },
        {
          type: "output",
          text: `get()  -> ExecutionException: bad phone number
join() -> CompletionException: bad phone number
getNow -> not ready`,
        },
        {
          type: "paragraph",
          text: "Same failure, two wrappers. `get()` comes from the old `Future` interface, so it throws checked exceptions, which don't fit inside lambdas. `join()` throws the unchecked `CompletionException`, which is why I use it inside streams like `map(CompletableFuture::join)`. In both cases the real exception is `getCause()`.",
        },
        {
          type: "heading",
          text: "Timeouts (Java 9+): the slow surge service",
        },
        {
          type: "paragraph",
          text: "A good shopkeeper doesn't wait forever for the supplier. After a while he either says \"sorry, not today\" or offers a substitute. Java 9 added both:",
        },
        {
          type: "code",
          language: "java",
          title: "Timeouts.java",
          code: `import java.util.concurrent.*;

public class Timeouts {
    static CompletableFuture<Integer> slowSurgeService() {
        return CompletableFuture.supplyAsync(() -> {
            sleep(2_000);                           // the service is having a bad day
            return 3;
        });
    }

    public static void main(String[] args) {
        // Java 9+: give up and use a default
        int surge = slowSurgeService().completeOnTimeout(1, 200, TimeUnit.MILLISECONDS).join();
        System.out.println("completeOnTimeout -> " + surge);

        // Java 9+: give up and fail
        try {
            slowSurgeService().orTimeout(200, TimeUnit.MILLISECONDS).join();
        } catch (CompletionException e) {
            System.out.println("orTimeout -> " + e.getCause().getClass().getSimpleName());
        }

        // Java 9+: run something later, without a scheduler of my own
        Executor inHalfASecond = CompletableFuture.delayedExecutor(500, TimeUnit.MILLISECONDS);
        CompletableFuture.runAsync(() -> System.out.println("reminder: your cab is here"), inHalfASecond).join();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `completeOnTimeout -> 1
orTimeout -> TimeoutException
reminder: your cab is here`,
        },
        {
          type: "paragraph",
          text: "Both timeout methods work by completing the future from a small internal scheduler thread when the time is up. They **don't stop** the slow task: the sleeping thread in `slowSurgeService` kept running for its full two seconds, it's just that nobody was waiting for its answer anymore. In Java 8 itself there's no `orTimeout`, so people used `get(timeout, unit)` (which blocks) or a `ScheduledExecutorService` that called `completeExceptionally` on the future.",
        },
        {
          type: "heading",
          text: "Cancellation doesn't stop the work",
        },
        {
          type: "code",
          language: "java",
          title: "CancelDemo.java",
          code: `import java.util.concurrent.*;

public class CancelDemo {
    public static void main(String[] args) throws Exception {
        CountDownLatch finished = new CountDownLatch(1);

        CompletableFuture<String> booking = CompletableFuture.supplyAsync(() -> {
            sleep(300);
            System.out.println("task still finished its work, interrupted=" + Thread.currentThread().isInterrupted());
            finished.countDown();
            return "booked";
        });

        System.out.println("cancel(true) -> " + booking.cancel(true));
        System.out.println("isCancelled=" + booking.isCancelled() + ", isCompletedExceptionally=" + booking.isCompletedExceptionally());
        try {
            booking.join();
        } catch (CancellationException e) {
            System.out.println("join() -> CancellationException");
        }
        finished.await();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { System.out.println("never printed"); }
    }
}`,
        },
        {
          type: "output",
          text: `cancel(true) -> true
isCancelled=true, isCompletedExceptionally=true
join() -> CancellationException
task still finished its work, interrupted=false`,
        },
        {
          type: "paragraph",
          text: "This surprised me. `cancel(true)` returned `true`, the future says it's cancelled, and `join()` throws `CancellationException`. But the task itself never got interrupted. It slept its full 300 ms and finished its work. The Javadoc says it plainly: the `mayInterruptIfRunning` argument \"has no effect in this implementation\".",
        },
        {
          type: "paragraph",
          text: "A `CompletableFuture` doesn't know which thread is running its supplier, so it can't interrupt it. `cancel` just completes the future with a `CancellationException`. If the work must really stop (say, cancel a booking API call), the task has to check a flag itself, or I use something that supports interruption, like a plain `Future` from `ExecutorService.submit`.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Forgetting to wait, so the work silently disappears",
        },
        {
          type: "code",
          language: "java",
          title: "LostOutput.java",
          code: `import java.util.concurrent.CompletableFuture;

public class LostOutput {
    public static void main(String[] args) {
        CompletableFuture.runAsync(() -> {
            sleep(100);
            System.out.println("OTP sent");          // runs on a daemon thread
        });
        System.out.println("main is done");
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `main is done`,
        },
        {
          type: "paragraph",
          text: "\"OTP sent\" never printed. Common pool threads are **daemon** threads, and the JVM exits when only daemon threads are left. In a small program the fix is to `join()`. In a web server the JVM keeps running, so this one shows up mostly in tests and command-line jobs.",
        },
        {
          type: "heading",
          text: "Errors that nobody ever sees",
        },
        {
          type: "code",
          language: "java",
          title: "Swallowed.java",
          code: `import java.util.concurrent.CompletableFuture;

public class Swallowed {
    public static void main(String[] args) throws Exception {
        CompletableFuture.runAsync(() -> {
            throw new IllegalStateException("payment gateway down");
        });
        Thread.sleep(200);
        System.out.println("no stack trace anywhere");

        CompletableFuture.runAsync(() -> { throw new IllegalStateException("payment gateway down"); })
            .exceptionally(ex -> { System.out.println("logged: " + ex.getCause().getMessage()); return null; })
            .join();
    }
}`,
        },
        {
          type: "output",
          text: `no stack trace anywhere
logged: payment gateway down`,
        },
        {
          type: "paragraph",
          text: "The first exception went into the future's `result` field and stayed there. No log line, no stack trace, because nobody ever looked at the future. A fire-and-forget `runAsync` needs at least a `whenComplete` or `exceptionally` that logs.",
        },
        {
          type: "heading",
          text: "Blocking calls on the common pool",
        },
        {
          type: "paragraph",
          text: "The common pool is sized for CPU work, roughly one thread per core. If I put slow HTTP or database calls on it, they sit on those few threads doing nothing, and everything else using the pool (other requests, parallel streams) queues behind them. I simulated a small server with `-XX:ActiveProcessorCount=3`, which gives a common pool of 2 threads:",
        },
        {
          type: "code",
          language: "java",
          title: "Starve.java",
          code: `import java.util.List;
import java.util.concurrent.*;
import java.util.stream.IntStream;

public class Starve {
    public static void main(String[] args) {
        System.out.println("common pool threads: " + ForkJoinPool.getCommonPoolParallelism());
        long start = System.nanoTime();
        List<CompletableFuture<Void>> calls = IntStream.range(0, 6)
            .mapToObj(i -> CompletableFuture.runAsync(() -> sleep(500)))   // blocking work on the common pool
            .toList();
        calls.forEach(CompletableFuture::join);
        System.out.println("6 x 500 ms calls took ~" + Math.round((System.nanoTime() - start) / 1e8) * 100 + " ms");
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:ActiveProcessorCount=3 Starve
java Starve                               # all 16 cores
java -XX:ActiveProcessorCount=1 Starve`,
        },
        {
          type: "output",
          text: `common pool threads: 2
6 x 500 ms calls took ~1500 ms
common pool threads: 15
6 x 500 ms calls took ~500 ms
common pool threads: 1
6 x 500 ms calls took ~500 ms`,
        },
        {
          type: "list",
          items: [
            "With 2 pool threads, six half-second calls ran two at a time: about 1.5 s instead of 0.5 s. On a small cloud container that's exactly what happens in production.",
            "With 16 cores it looked fine, which is why this bug hides on a developer laptop.",
            "The single-core run is the surprise. Parallelism 1 is below 2, so `CompletableFuture` skipped the common pool and started a new thread for every task, and all six ran at once. That's the `ThreadPerTaskExecutor` fallback in the source, and it's not something to depend on either.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix is to pass my own executor for anything that waits on I/O. (Timings are rounded to the nearest 100 ms and were stable across my runs, but they're still timings.)",
        },
        {
          type: "heading",
          text: "thenApply where thenCompose was meant",
        },
        {
          type: "paragraph",
          text: "If the function I pass returns a `CompletableFuture`, `thenApply` gives me a future of a future, like `nested` in the booking example. Then a `.join()` returns another future rather than the value, and code that \"waits\" doesn't actually wait for the inner work. Function returns a future, use `thenCompose`.",
        },
        {
          type: "heading",
          text: "Calling join() too early",
        },
        {
          type: "code",
          language: "java",
          code: `// Looks parallel, is sequential: each join waits before the next call even starts
int fare = CompletableFuture.supplyAsync(this::fetchFare).join();
int eta  = CompletableFuture.supplyAsync(this::fetchEta).join();

// Parallel: start both first, then wait
CompletableFuture<Integer> fareF = CompletableFuture.supplyAsync(this::fetchFare);
CompletableFuture<Integer> etaF  = CompletableFuture.supplyAsync(this::fetchEta);
int fare2 = fareF.join();
int eta2  = etaF.join();`,
        },
        {
          type: "heading",
          text: "Expecting cancel or a timeout to stop the work",
        },
        {
          type: "paragraph",
          text: "As `CancelDemo` showed, the future gets cancelled, but the thread keeps going. Same with `orTimeout`. The slow call still holds a pool thread and a connection until it finishes on its own. The real fix is a timeout on the client itself too (HTTP client read timeout, JDBC query timeout).",
        },
        {
          type: "heading",
          text: "Losing request context",
        },
        {
          type: "paragraph",
          text: "`ThreadLocal` values like the logged-in user, a trace id in MDC, or Spring's transaction and security context belong to the request thread. Code inside `supplyAsync` runs on a different thread and doesn't see them. I either pass the values in explicitly, or use an executor that copies the context (Spring has `TaskDecorator` for this).",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Pass your own `Executor` for I/O work (HTTP, DB, file). Keep the common pool for short CPU work.",
            "Give the executor's threads a clear name (`fare-io-1`), so thread dumps and logs make sense.",
            "Every fire-and-forget future gets an `exceptionally` or `whenComplete` that logs. Otherwise failures vanish.",
            "Put a timeout on every remote call: `orTimeout` or `completeOnTimeout` on Java 9+, plus a timeout on the client itself, because the future timing out doesn't stop the call.",
            "Start all independent calls first, then combine (`thenCombine`, `allOf`). Don't `join()` in the middle of a chain.",
            "Use `thenCompose` when the function returns a future, `thenApply` when it returns a plain value.",
            "Use `join()` inside lambdas and streams, `get(timeout, unit)` when you want a checked exception and a hard limit.",
            "Unwrap `CompletionException` with `getCause()` before logging or mapping to an HTTP error.",
            "Keep callbacks short and non-blocking. If a callback is slow, use the `Async` variant with an executor so it doesn't run on some random I/O thread.",
            "Don't rely on the order of several callbacks attached to the same future. My `Dependents` run showed them going newest first, and that's an implementation detail.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The whole point is waiting for several slow things at the same time instead of one after another. Three calls of 300 ms each:",
        },
        {
          type: "code",
          language: "java",
          title: "SeqVsParallel.java",
          code: `import java.util.concurrent.CompletableFuture;

public class SeqVsParallel {
    static int call(int value) {            // each "service" takes 300 ms
        sleep(300);
        return value;
    }

    public static void main(String[] args) {
        long t0 = System.nanoTime();
        int seq = call(1) + call(2) + call(3);
        long seqMs = (System.nanoTime() - t0) / 1_000_000;

        long t1 = System.nanoTime();
        CompletableFuture<Integer> a = CompletableFuture.supplyAsync(() -> call(1));
        CompletableFuture<Integer> b = CompletableFuture.supplyAsync(() -> call(2));
        CompletableFuture<Integer> c = CompletableFuture.supplyAsync(() -> call(3));
        int par = a.join() + b.join() + c.join();
        long parMs = (System.nanoTime() - t1) / 1_000_000;

        System.out.println("sequential: " + seq + " in ~" + Math.round(seqMs / 100.0) * 100 + " ms");
        System.out.println("parallel:   " + par + " in ~" + Math.round(parMs / 100.0) * 100 + " ms");
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `sequential: 6 in ~900 ms
parallel:   6 in ~300 ms`,
        },
        {
          type: "paragraph",
          text: "The total becomes the slowest call instead of the sum. That's the main win, and it's about **latency**, not CPU. A few other things I keep in mind:",
        },
        {
          type: "list",
          items: [
            "Each stage is a small object (the new future plus a `Completion`). For a handful of remote calls per request that's nothing. For millions of tiny in-memory steps, a plain loop is faster.",
            "Non-async callbacks are cheap: no thread switch, they just run on whichever thread is already there. `Async` variants cost a hand-off to an executor, so I use them when I need control over the thread, not by default.",
            "Thread pools for I/O need sizing. A pool of 8 can have at most 8 calls in flight. Too small and requests queue; too big and the downstream service gets flooded.",
            "Under load, the common-pool starvation from `Starve.java` is the most common performance bug I've seen with this class.",
          ],
        },
        {
          type: "heading",
          text: "Java 21: virtual threads as the executor",
        },
        {
          type: "paragraph",
          text: "Sizing I/O pools is a guessing game. Java 21's virtual threads are cheap enough to have one per task, and a virtual thread that blocks on I/O doesn't hold an OS thread. They plug straight into `CompletableFuture` as an executor:",
        },
        {
          type: "code",
          language: "java",
          title: "Virtual.java",
          code: `import java.util.List;
import java.util.concurrent.*;
import java.util.stream.IntStream;

public class Virtual {
    public static void main(String[] args) {
        try (ExecutorService perTask = Executors.newVirtualThreadPerTaskExecutor()) {   // Java 21
            List<CompletableFuture<Boolean>> calls = IntStream.range(0, 1_000)
                .mapToObj(i -> CompletableFuture.supplyAsync(() -> {
                    sleep(1_000);                      // pretend this is a slow HTTP call
                    return Thread.currentThread().isVirtual();
                }, perTask))
                .toList();
            long start = System.nanoTime();
            long virtual = calls.stream().filter(CompletableFuture::join).count();
            long secs = Math.round((System.nanoTime() - start) / 1e9);
            System.out.println(virtual + " calls ran on virtual threads, total wait about " + secs + " s");
        }
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `1000 calls ran on virtual threads, total wait about 1 s`,
        },
        {
          type: "paragraph",
          text: "A thousand one-second \"calls\", all waiting at once, finished in about a second, with no pool size to tune. On Java 21 that's my default executor for I/O fan-out. Two notes: with virtual threads, plain blocking code (`call()` one after another in a simple method) is often readable enough that I don't need `CompletableFuture` at all; and structured concurrency (`StructuredTaskScope`) is still a preview in Java 21, so I don't use it in production code yet.",
        },
      ],
    },
    {
      title: "CompletableFuture in Production",
      blocks: [
        {
          type: "paragraph",
          text: "The most common real use I've seen is **fan-out**: one request needs answers from two or three other services, and they don't depend on each other. My example is a cab fare quote. It needs the trip distance from a maps service and the surge multiplier from a pricing service. Rules I'd want in a real backend:",
        },
        {
          type: "list",
          items: [
            "Both calls run at the same time, on a dedicated I/O pool, not the common pool.",
            "Distance is essential. If maps is slow (over 500 ms) or down, the quote fails.",
            "Surge is optional. If pricing is slow (over 300 ms) or down, quote the base price instead of failing the whole request.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "FareQuoteService.java",
          code: `import java.util.concurrent.*;

public class FareQuoteService {
    private final ExecutorService ioPool = Executors.newFixedThreadPool(8);   // not the common pool

    record Quote(double km, double surge, double fare, String note) {}

    Quote quote(String from, String to) {
        CompletableFuture<Double> distance = CompletableFuture
            .supplyAsync(() -> mapsKm(from, to), ioPool)
            .orTimeout(500, TimeUnit.MILLISECONDS);                  // no distance, no fare: fail
        CompletableFuture<Double> surge = CompletableFuture
            .supplyAsync(this::surgeMultiplier, ioPool)
            .completeOnTimeout(1.0, 300, TimeUnit.MILLISECONDS)      // slow? assume no surge
            .exceptionally(ex -> 1.0);                               // broken? same

        return distance.thenCombine(surge, (km, s) ->
                new Quote(km, s, Math.round((50 + km * 12) * s), s == 1.0 ? "base price" : "surge"))
            .join();
    }

    double mapsKm(String from, String to) { sleep(100); return 8.5; }
    double surgeMultiplier()              { sleep(2_000); return 1.8; }   // today it's slow

    public static void main(String[] args) {
        FareQuoteService service = new FareQuoteService();
        System.out.println(service.quote("Salt Lake", "Park Street"));
        service.ioPool.shutdownNow();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `Quote[km=8.5, surge=1.0, fare=152.0, note=base price]`,
        },
        {
          type: "list",
          items: [
            "Both `supplyAsync` calls start right away on `ioPool`, so the request waits for the slower of the two (capped at 300 ms for surge), not for both added up.",
            "The surge service took 2 seconds, so `completeOnTimeout` stepped in after 300 ms with `1.0`. The rider got a quote of 152 (`50 + 8.5 * 12`) instead of an error.",
            "`exceptionally(ex -> 1.0)` covers the other failure, where the pricing service throws instead of being slow.",
            "`distance` uses `orTimeout`, so if maps fails, `thenCombine` fails too and `join()` throws a `CompletionException`. In a Spring controller, a `@ControllerAdvice` would unwrap it and return a 503.",
            "`shutdownNow()` is only there so this demo exits without waiting for the slow surge thread. In a Spring app the pool would be a `@Bean` (a `ThreadPoolTaskExecutor`) that Spring shuts down.",
          ],
        },
        {
          type: "paragraph",
          text: "In a Spring service I'd also return the `CompletableFuture<Quote>` from the controller instead of calling `join()`. Spring MVC supports that return type, and it frees the request thread while the calls are running. On my RideX project I used the same shape for the quote screen: a few independent lookups started together, each with its own timeout and fallback.",
        },
        {
          type: "callout",
          tone: "note",
          title: "What about @Async?",
          text: "Spring's `@Async` methods can return `CompletableFuture<T>`. Spring runs the method on its task executor and hands back the future. It's the same class underneath, just with Spring choosing the thread. The same-bean proxy rule from the Methods lesson applies: calling an `@Async` method from inside the same bean runs it synchronously.",
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
              question: "What is CompletableFuture, and what problem does it solve over Future?",
              answer:
                "It's a `Future` that I can also attach callbacks to and complete by hand. It implements both `Future` and `CompletionStage`. A plain `Future` only lets me check `isDone()`, cancel, or block on `get()`.\n\nWith `CompletableFuture` I can describe the whole pipeline up front: transform the result (`thenApply`), chain another async call (`thenCompose`), combine two results (`thenCombine`), recover from errors (`exceptionally`), and add timeouts. None of that needs a thread sitting blocked in `get()`.",
            },
            {
              question: "What's the difference between supplyAsync and runAsync?",
              answer:
                "`supplyAsync` takes a `Supplier<T>` and returns `CompletableFuture<T>`, for work that produces a value, like fetching a fare. `runAsync` takes a `Runnable` and returns `CompletableFuture<Void>`, for work that only has an effect, like sending an SMS.\n\nBoth run on `ForkJoinPool.commonPool()` unless I pass an `Executor` as the second argument, which I should do for anything that blocks on I/O.",
            },
            {
              question: "Explain thenApply, thenAccept and thenRun.",
              answer:
                "They differ in what goes in and what comes out. `thenApply` takes the value and returns a new value, like `map`. `thenAccept` takes the value and returns nothing. `thenRun` gets nothing and returns nothing, it just runs afterwards.\n\nIn my fare example, `thenApply(f -> f + 20)` gave `200`, and the futures from `thenAccept` and `thenRun` both joined to `null`, because their type is `CompletableFuture<Void>`.",
            },
            {
              question: "What's the difference between thenCompose and thenCombine?",
              answer:
                "`thenCompose` is for **dependent** steps: the next async call needs the previous result, like finding a driver for a rider I just looked up. The function returns a future, and `thenCompose` flattens it, like `flatMap`.\n\n`thenCombine` is for **independent** work: two futures running at the same time, and a function that merges both results when they're done, like driver plus ETA. Using `thenApply` where `thenCompose` was meant gives a `CompletableFuture<CompletableFuture<T>>`.",
            },
            {
              question: "What's the difference between allOf and anyOf?",
              answer:
                "`allOf` completes when every future is done and returns `CompletableFuture<Void>`, so I read each value from the original futures afterwards (their `join()` doesn't block by then). If any of them failed, the `allOf` future fails too.\n\n`anyOf` completes with whichever future finishes first, value or exception, and returns `CompletableFuture<Object>`, so I have to cast. Note it doesn't cancel the others.",
            },
            {
              question: "What's the difference between join() and get()?",
              answer:
                "Both block until the result is ready. `get()` comes from `Future` and throws checked exceptions: `ExecutionException` and `InterruptedException`. `join()` throws an unchecked `CompletionException`, which makes it usable inside lambdas and streams.\n\nIn both cases the real error is `getCause()`. In my OTP example, `get()` threw `ExecutionException` and `join()` threw `CompletionException`, both with the cause \"bad phone number\".",
            },
            {
              question: "Which thread pool does CompletableFuture use by default?",
              answer:
                "`ForkJoinPool.commonPool()`, shared by the whole JVM, including parallel streams. Its size is the number of CPUs minus one, 15 on my 16-core machine.\n\nOne edge case: if the common pool's parallelism is less than 2 (a single-CPU container, for example), `CompletableFuture` uses a new thread per task instead. I saw that with `-XX:ActiveProcessorCount=1`.",
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
              question: "Explain exceptionally, handle and whenComplete.",
              answer:
                "`exceptionally` runs only on failure and returns a fallback value. `handle` always runs, gets both the value and the exception (one of them is null), and returns a new value. `whenComplete` always runs too, but its return is ignored: the original value or exception passes through unchanged, so it's for logging and cleanup.\n\nIn my surge example, `exceptionally` gave `1`, `handle` gave a fallback string, and after `whenComplete` the `join()` still threw.",
            },
            {
              question: "Why does my exception show up as CompletionException?",
              answer:
                "Because when a stage fails, the future stores the exception wrapped in a `CompletionException`, and that's what dependent stages and `join()` see. So in `handle`, `whenComplete` or `exceptionally`, the `ex` argument is usually a `CompletionException`, and its message is the cause's `toString()`, like `java.lang.IllegalStateException: surge service down`.\n\nI call `getCause()` before logging or mapping to an HTTP status. One exception: if I call `completeExceptionally(e)` directly on a future, a callback on that same future gets `e` unwrapped.",
            },
            {
              question: "Which thread runs a non-async callback like thenApply?",
              answer:
                "It depends on timing. If the previous stage is still running when I attach the callback, the thread that completes that stage runs it. If the stage is already complete, the thread calling `thenApply` runs it immediately.\n\nIn `WhoRuns` I controlled the timing with a latch: the early callback ran on `cook`, the late one on `main`. That's why slow work belongs in `thenApplyAsync` with an executor.",
            },
            {
              question: "What's the difference between thenApply and thenApplyAsync?",
              answer:
                "Only the thread. `thenApply` runs on the completing thread or the caller. `thenApplyAsync(fn)` always submits `fn` to the common pool, and `thenApplyAsync(fn, executor)` to my executor.\n\nI use the async variant when the callback is slow or blocking, or when I must not run it on the thread that completed the future, for example an HTTP client's I/O thread. Otherwise the plain one is cheaper because there's no hand-off.",
            },
            {
              question: "Does cancel(true) interrupt the running task?",
              answer:
                "No. The Javadoc says `mayInterruptIfRunning` has no effect in this implementation. `cancel` just completes the future with a `CancellationException`, so `isCancelled()` is true and `join()` throws. The task keeps running.\n\nMy `CancelDemo` showed it: after `cancel(true)` returned `true`, the task still finished its 300 ms sleep, with `interrupted=false`. To really stop work, the task has to check a flag, or I use a plain `Future` from `ExecutorService.submit`, whose `cancel(true)` does interrupt.",
            },
            {
              question: "How do you add a timeout to a CompletableFuture?",
              answer:
                "On Java 9+, `orTimeout(time, unit)` fails the future with `TimeoutException`, and `completeOnTimeout(value, time, unit)` completes it with a default. On Java 8 there's `get(time, unit)`, which blocks, or a `ScheduledExecutorService` that calls `completeExceptionally` after a delay.\n\nIn every version, a timeout on the future doesn't stop the underlying call. The slow thread keeps running, so the HTTP or JDBC client needs its own timeout as well.",
            },
            {
              question: "Why is it risky to run blocking calls on the common pool?",
              answer:
                "It has about one thread per core and it's shared with the whole JVM. Blocking calls park those few threads, and everything else queues up.\n\nWith `-XX:ActiveProcessorCount=3` my six 500 ms calls took 1.5 s instead of 0.5 s, because the pool only had 2 threads. On my 16-core laptop it looked fine. That's why I pass a dedicated executor, or on Java 21 a virtual-thread-per-task executor, for I/O.",
            },
            {
              question: "A fire-and-forget runAsync throws. What happens?",
              answer:
                "Nothing visible. The exception is stored in the future's result, and if nobody calls `join()`, `get()` or attaches an `exceptionally`/`whenComplete`, it's never logged. There's no uncaught exception handler involved, because the exception never escapes the thread.\n\nMy `Swallowed` example printed no stack trace at all until I added `exceptionally` with a log line.",
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
              question: "How is a CompletableFuture implemented internally?",
              answer:
                "Two volatile fields: `result`, which is null until completion and then holds the value (or an `AltResult` wrapping null or an exception), and `stack`, a lock-free linked stack of `Completion` objects, one per waiting callback.\n\nBoth are updated with compare-and-set. That's why only the first `complete` wins, and why there's no lock. `toString()` even shows it: `[Not completed, 3 dependents]` before completion, `[Completed normally]` after.",
            },
            {
              question: "What happens when a CompletableFuture completes?",
              answer:
                "The completing thread CASes the value into `result`, then calls `postComplete()`. That pops the `Completion` objects off the stack one by one and fires each: a non-async one runs its function right there, an async one is submitted to its executor. If firing a completion completes another future with its own waiters, it keeps going with that one, in a loop rather than recursion, so long chains don't overflow the stack.\n\nIn my `Dependents` run, all three `thenRun` callbacks printed before `complete()` returned, newest first.",
            },
            {
              question: "What's the race between attaching a callback and completion, and how is it handled?",
              answer:
                "The future could complete right after `thenApply` checked that it wasn't done, but before the callback was pushed. Then nobody would ever run the callback.\n\nThe code handles it by pushing the `Completion` and then checking `result` again. If the result has arrived meanwhile, the attaching thread runs the completion itself. Each `Completion` can only be claimed once (another CAS), so it never runs twice either.",
            },
            {
              question: "Why does CompletableFuture wrap null results in AltResult?",
              answer:
                "Because `result == null` means \"not completed yet\". A supplier that legitimately returns `null` must be stored as something non-null, so it becomes a shared `AltResult` with no exception. Failures use `AltResult` with the exception.\n\nThat's also how `thenAccept` and `thenRun` futures work: they complete with a `null` value, which is why joining them returns `null`.",
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
            "**Tea order.** Use `supplyAsync` to return `\"tea\"`, then `thenApply` to add `\" with sugar\"`, then `thenAccept` to print it. Join the last stage. Hint: join the `thenAccept` future, not the first one.",
            "**Rider then driver.** Write `findRider()` returning `CompletableFuture<String>` and `findDriver(String rider)` returning another future. Chain them so the result type is `CompletableFuture<String>`, not a nested one. Hint: `thenCompose`.",
            "**Fare plus ETA.** Start a fare future (`180`) and an ETA future (`5`) in parallel and print `\"180 rupees, 5 min\"`. Hint: `thenCombine`.",
            "**Cheapest of three.** Start three price futures with different sleeps. Use `allOf` and then print the minimum. Hint: `quotes.stream().mapToInt(CompletableFuture::join).min()`.",
            "**Down service.** Make a supplier that throws `IllegalStateException(\"down\")`. Recover with `exceptionally` returning `0`, and separately with `handle` that prints `ex.getCause().getMessage()`.",
            "**Slow service.** Make a supplier that sleeps 2 seconds. Use `completeOnTimeout` to fall back after 200 ms. Then print something from inside the supplier after the sleep and check that it still printed (add a short sleep at the end of `main`).",
            "**Who ran it?** Print `Thread.currentThread().getName()` inside `thenApply` twice: once attached before the supplier finishes (make the supplier sleep 200 ms), once attached after `join()`. Predict both names first.",
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Solution sketch for exercise 2",
              answer:
                "`CompletableFuture<String> driver = findRider().thenCompose(rider -> findDriver(rider));` then `System.out.println(driver.join());`.\n\nWith `thenApply` instead, the type would be `CompletableFuture<CompletableFuture<String>>` and printing `join()` would print a future object, something like `CompletableFuture@1b6d3586[Completed normally]`, instead of the driver name.",
            },
            {
              question: "Solution sketch for exercise 6",
              answer:
                "`slow().completeOnTimeout(-1, 200, TimeUnit.MILLISECONDS).join()` returns `-1` after about 200 ms. Then `Thread.sleep(2500)` in `main` lets the supplier wake up, and its print still appears.\n\nThat's the point of the exercise: the timeout completed the future, it didn't stop the work.",
            },
            {
              question: "Expected answer for exercise 7",
              answer:
                "The first callback, attached while the supplier was still sleeping, prints a common pool name like `ForkJoinPool.commonPool-worker-1` (the number varies). The second, attached after `join()`, prints `main`, because the future was already complete and the caller ran it directly.",
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
          text: `START      supplyAsync(supplier [, executor])   -> CF<T>
           runAsync(runnable [, executor])      -> CF<Void>
           default executor: ForkJoinPool.commonPool() (CPUs - 1)

THEN       thenApply   value -> value          (map)
           thenAccept  value -> nothing
           thenRun     nothing -> nothing
           thenCompose value -> CF<U>, flattened (flatMap)  dependent
           thenCombine (a, b) -> value                      independent
MANY       allOf -> CF<Void>      anyOf -> CF<Object>

ERRORS     exceptionally  failure only, fallback value
           handle         always, can change result
           whenComplete   always, can't change result
           ex is usually CompletionException -> getCause()

TIMEOUT    orTimeout / completeOnTimeout / delayedExecutor  (Java 9+)
           none of them stop the running task; cancel(true) doesn't either

WAIT       join()  CompletionException (unchecked)
           get()   ExecutionException  (checked)

INSIDE     volatile result  (null = not done, AltResult = null/error)
           volatile stack   of Completion, LIFO, CAS-pushed
           complete -> CAS result -> postComplete() pops and fires

THREADS    thenX      completing thread, or caller if already done
           thenXAsync common pool, or the executor given
           I/O work  -> own executor (Java 21: virtual threads)`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A `CompletableFuture` is a token for a result that's coming, plus a list of \"when it's ready, do this\" notes. Completing it runs the notes.",
            "Pick the method by shape: value to value is `thenApply`, value to future is `thenCompose`, two independent results is `thenCombine`.",
            "Own executor for I/O, a timeout on every remote call, and a logged error on every fire-and-forget future. Those three rules prevent most of the production problems I've seen.",
          ],
        },
      ],
    },
  ],
};
