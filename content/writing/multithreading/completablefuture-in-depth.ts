import type { Lesson } from "../types";

export const completableFutureInDepth: Lesson = {
  slug: "completablefuture-in-depth",
  date: "2026-11-14",
  title: "CompletableFuture in Depth: Threads, Composition and Errors",
  description:
    "CompletableFuture opened up on JDK 21: the volatile result field and the Treiber stack of Completion objects read live with reflection, all 34 nested classes from UniApply to Signaller, thenApply versus thenApplyAsync in javap, postComplete caught in a thread dump and flattening a million-stage chain without a StackOverflowError (while a recursive thenCompose overflowed at 2,000), which thread really runs each callback (the completing thread paid 306 ms inside complete(), and a race picked main anywhere from 0.3% to 55% of the time), the common ForkJoinPool with 7 threads on 8 cores and the ThreadPerTaskExecutor fallback whose threads are not daemons, thenCompose and thenCombine wiring, allOf that waits 600 ms for a failure known at 50 ms, the exact rules for CompletionException wrapping, exceptionallyCompose, join that ignores interrupts, cancel that never travels upstream, obtrudeValue, a session future that retained 172 MB of dead callbacks, and a matching service whose p50 went from 354 ms to 55 ms by moving one callback off the HTTP client's I/O thread.",
  tags: ["Multithreading", "CompletableFuture", "Async", "ForkJoinPool"],
  sections: [
    {
      title: "What CompletableFuture in Depth Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Semaphore, Phaser and Exchanger, finished the synchronizers: tools that make threads **wait for each other**. This phase is about the opposite style, where nobody waits. A request starts slow work, attaches what should happen next, and lets whichever thread finishes the work carry the result forward. In Java that style is `CompletableFuture`, and the Java 8 track's lesson CompletableFuture already covered the everyday API: `supplyAsync`, `thenApply`, `thenCompose`, `thenCombine`, `allOf`, `exceptionally`, `handle`, `join` and `get`, the basic thread rules, and a first look at the stack of callbacks. I won't repeat those basics here.",
        },
        {
          type: "paragraph",
          text: "This lesson goes underneath them. I read the class with `javap`, walked its internal callback stack with reflection while it was live, caught `postComplete` in a thread dump, and measured the things that decide behaviour in a real service: **which thread runs a callback** and what that costs, how the shared `ForkJoinPool.commonPool()` is configured (and the single-CPU fallback that quietly creates a thread per task), how composition is wired (`thenCompose`, `thenCombine`, `allOf`, `anyOf`), and the exact rules for how exceptions get wrapped in `CompletionException` and unwrapped again.",
        },
        {
          type: "paragraph",
          text: "The last part is about the sharp edges: `join` that can't be interrupted, `cancel` that doesn't travel upstream, `obtrudeValue` that rewrites history, and **dependent stage leaks**, where callbacks attached to a long-lived future pile up forever. The next lesson, Timeouts, Fallbacks, Fan-out and Choosing Executors, builds on all of this to make a fan-out request survive a slow dependency.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "`CompletableFuture` came out of Doug Lea's JSR 166 work and shipped in Java 8 together with lambdas. Its design borrows from promise libraries (Guava's `ListenableFuture`, Scala's `Future`, JavaScript promises), with one Java-specific twist: every stage is both a value holder (`Future`) and a pipeline builder (`CompletionStage`), and the callbacks live in a lock-free stack inside the future rather than in a separate listener list. Java 9's JEP 266 added the timeout and executor methods, and later releases added a handful of methods without changing the internals much. Diffing `javap -p` of JDK 17 and JDK 21 shows the same fields and the same 34 nested classes; the only new methods are Java 19's `resultNow`, `exceptionNow` and `state`.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "`Future`, `FutureTask`, `ExecutorService`", "Blocking `get()` only; no callbacks"],
            ["Java 7 (2011)", "`ForkJoinPool`, `ForkJoinTask`", "Every `Completion` is a `ForkJoinTask`, so it can be run by the pool directly"],
            ["Java 8 (2014)", "`CompletableFuture`, `CompletionStage`, `ForkJoinPool.commonPool()`; `obtrudeValue`, `getNumberOfDependents`", "The whole design: `result`, `stack`, `postComplete`, the async default executor"],
            ["Java 9 (2017, JEP 266)", "`orTimeout`, `completeOnTimeout`, `delayedExecutor`, `completeAsync`, `failedFuture`, `copy`, `minimalCompletionStage`, `defaultExecutor`, `newIncompleteFuture`", "Defensive copies and read-only views; timeouts (next lesson)"],
            ["Java 12 (2019)", "`exceptionallyAsync`, `exceptionallyCompose`, `exceptionallyComposeAsync`", "Recovering with another async call, on a chosen thread"],
            ["Java 19 (2022)", "`Future.state()`, `resultNow()`, `exceptionNow()`", "Inspecting a future without blocking or catching"],
            ["Java 21 (2023)", "Virtual threads (JEP 444); `CompletableFuture` itself unchanged", "Changes which executor I pass, not how stages work"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "A ride request at a dispatch office in Salt Lake, with one clipboard per booking.",
        },
        {
          type: "list",
          items: [
            "**The `result` field is the box at the top of the clipboard** where the dispatcher writes the assigned driver. It's written once, in ink. Anyone who comes later just reads it.",
            "**The `stack` is a spike of notes** below it: \"SMS Asha when assigned\", \"start the fare meter\", \"if nobody accepts, issue a voucher\". Each new note is pushed onto the spike on top of the others.",
            "**`complete(\"Ravi\")` is the dispatcher writing the name**, and then, before going back to the phone, pulling every note off the spike and doing it. That's why the person who completes the booking pays for all the notes (`postComplete`).",
            "**A note pinned after the name is written** isn't spiked at all: whoever brought it reads the name and does the task on the spot. That's the caller-thread rule.",
            "**An `Async` note says \"hand this to the back office\"**: the dispatcher only passes it through the hatch (an executor) instead of doing it.",
            "**A note pinned on a clipboard that's never filled in** stays on the spike forever. A clipboard kept for a driver's whole shift, with a note added for every ride offer, eventually can't hold any more. That's the dependent stage leak.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real dispatcher can cross out a name and write another. `complete` can't, which is the point of the CAS on `result`, but `obtrudeValue` can, and notes that were already done don't get redone. Also, a real spike is read top to bottom by one person; in the JVM, the spike can be pushed onto by many threads at once without a lock, and two threads can both try to fire the same note, which is why each note has its own one-shot claim flag.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/completablefuture-in-depth-stack.svg",
          alt: "Left: a CompletableFuture called fare with two volatile fields: Object result, which is null, the value 18000, or an AltResult, and Completion stack, which points to a vertical linked list of Completion nodes. From top (newest) to bottom (oldest): UniWhenComplete, BiApply from thenCombine, UniExceptionally, UniAccept, UniApply, then next equals null. A box explains the push: c.next = stack, then STACK.compareAndSet(this, old, c), retried on failure; it's a lock-free LIFO Treiber stack, and the other input of thenCombine, eta, holds a CoCompletion pointing at the same BiApply. Right: what complete(18000) does on thread T: 1, CAS result from null to 18000, only the first wins and a second complete returns false; 2, postComplete pops the top node with a CAS and calls tryFire(NESTED); 3, a sync node runs fn right there on T, an async node calls executor.execute(node); 4, if that completed a dependent with waiters, it loops over that dependent's stack too, without recursion, so 1,000,000 chained stages caused no StackOverflowError. Bottom: a table of which thread runs fn: thenApply on a pending source runs on the thread that completes the source (complete took 306 ms for three callbacks); thenApply on a completed source runs on the caller (when attached right after supplyAsync, main won between 0.3% and 55% of attempts); thenApplyAsync(fn) uses the common pool, 7 threads on 8 cores, or a new thread per task if parallelism is below 2; thenApplyAsync(fn, ex) always uses ex, a hop costing about 29 microseconds at p50 to an idle thread; thenCombine runs on the thread completing the second input, and a fired orTimeout runs callbacks on CompletableFutureDelayScheduler.",
          caption: "A CompletableFuture is one write-once result and a lock-free stack of waiting callbacks; whoever completes it runs the callbacks.",
        },
        {
          type: "heading",
          text: "The pieces and where they live",
        },
        {
          type: "table",
          headers: ["Piece", "What it is", "Where I saw it"],
          rows: [
            ["`volatile Object result`", "`null` until done; then the value, or an `AltResult` holding `null` or the exception", "`javap -p`, `StackPeek`"],
            ["`volatile Completion stack`", "Treiber stack of waiting callbacks, newest on top", "`StackPeek` walked it by reflection"],
            ["`Completion`", "Abstract node: `next` pointer, `tryFire(mode)`, `isLive()`; extends `ForkJoinTask<Void>`, implements `Runnable`", "`javap -p` of the nested class"],
            ["`UniCompletion`", "A node with one source: `executor`, `dep` (the future it completes), `src`", "Parent of `UniApply`, `UniAccept`, `UniCompose`, `UniExceptionally`, ..."],
            ["`BiCompletion`", "Two sources (`snd` added): `BiApply`, `BiAccept`, `BiRun`, `OrApply`, `BiRelay`", "`thenCombine`, `applyToEither`, `allOf`"],
            ["`Signaller`", "The node a blocked `join`/`get` pushes; implements `ForkJoinPool.ManagedBlocker`", "Why `join` inside the common pool adds threads"],
            ["`AsyncSupply`, `AsyncRun`", "The task `supplyAsync`/`runAsync` submits; checks `result == null` before running", "Next lesson: queued work is skipped after a timeout"],
            ["`ASYNC_POOL`", "`ForkJoinPool.commonPool()`, or `ThreadPerTaskExecutor` if parallelism < 2", "`CommonPoolCheck`"],
          ],
        },
        {
          type: "heading",
          text: "The three firing modes",
        },
        {
          type: "table",
          headers: ["Constant", "Value", "Used when", "Effect"],
          rows: [
            ["`SYNC`", "0", "`unipush` finds the source completed just after pushing a node (the attach race), so the attaching thread fires it", "Run now, on the attaching thread, then run the dependent's own waiters"],
            ["`ASYNC`", "1", "An executor thread runs the `Completion` it was handed", "Run `fn`, complete `dep`, run `dep`'s dependents"],
            ["`NESTED`", "-1", "`postComplete` fires a node while draining another future's stack", "Run `fn`, complete `dep`, but **return** `dep` instead of draining it, so the caller's loop does it without recursion"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The JDK on this machine has a broken `src.zip` link, so as in the earlier lessons I read the class the way the JVM sees it: fields and constants with `javap -p -constants`, logic with `javap -c`, and live state with reflection (which needs `--add-opens java.base/java.util.concurrent=ALL-UNNAMED`).",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p -constants java.util.concurrent.CompletableFuture   # fields and the first methods",
        },
        {
          type: "output",
          text: `public class java.util.concurrent.CompletableFuture<T> implements java.util.concurrent.Future<T>, java.util.concurrent.CompletionStage<T> {
  volatile java.lang.Object result;
  volatile java.util.concurrent.CompletableFuture$Completion stack;
  static final java.util.concurrent.CompletableFuture$AltResult NIL;
  private static final boolean USE_COMMON_POOL;
  private static final java.util.concurrent.Executor ASYNC_POOL;
  static final int SYNC = 0;
  static final int ASYNC = 1;
  static final int NESTED = -1;
  private static final java.lang.invoke.VarHandle RESULT;
  private static final java.lang.invoke.VarHandle STACK;
  private static final java.lang.invoke.VarHandle NEXT;
  final boolean internalComplete(java.lang.Object);
  final boolean tryPushStack(java.util.concurrent.CompletableFuture$Completion);
  final void pushStack(java.util.concurrent.CompletableFuture$Completion);
  ...
  final void postComplete();
  final void cleanStack();
  final void unipush(java.util.concurrent.CompletableFuture$Completion);
  ...`,
        },
        {
          type: "list",
          items: [
            "**Two instance fields, that's all.** A `CompletableFuture` is 24 bytes: header, `result`, `stack`. No lock, no list of listeners, no reference to the thread running its work, which is why `cancel(true)` can't interrupt anyone.",
            "**`RESULT`, `STACK` and `NEXT` are `VarHandle`s**, the CAS tool from the lesson CAS, Atomic Classes, LongAdder and VarHandle. Every state change in the class is a `compareAndSet` on one of those three.",
            "**`NIL`** is the shared `AltResult` for a `null` value, because a `null` in `result` means \"not done\".",
            "**`USE_COMMON_POOL` and `ASYNC_POOL`** are decided once, in the static initialiser, from the common pool's parallelism. Changing the pool's size later can't change them.",
          ],
        },
        {
          type: "heading",
          text: "34 nested classes",
        },
        {
          type: "code",
          language: "java",
          title: "Nested.java",
          code: `import java.util.Arrays;
import java.util.Comparator;
import java.util.concurrent.CompletableFuture;
public class Nested {
    public static void main(String[] args) {
        Class<?>[] nested = CompletableFuture.class.getDeclaredClasses();
        Arrays.sort(nested, Comparator.comparing(Class::getSimpleName));
        for (Class<?> c : nested) System.out.println(c.getSimpleName() + " extends " + (c.getSuperclass()==null?"-":c.getSuperclass().getSimpleName()));
        System.out.println(nested.length);
    }
}`,
        },
        {
          type: "output",
          text: `AltResult extends Object
AnyOf extends Completion
AsyncRun extends ForkJoinTask
AsyncSupply extends ForkJoinTask
AsynchronousCompletionTask extends -
BiAccept extends BiCompletion
BiApply extends BiCompletion
BiCompletion extends UniCompletion
BiRelay extends BiCompletion
BiRun extends BiCompletion
Canceller extends Object
CoCompletion extends Completion
Completion extends ForkJoinTask
DelayedCompleter extends Object
DelayedExecutor extends Object
Delayer extends Object
MinimalStage extends CompletableFuture
OrAccept extends BiCompletion
OrApply extends BiCompletion
OrRun extends BiCompletion
Signaller extends Completion
TaskSubmitter extends Object
ThreadPerTaskExecutor extends Object
Timeout extends Object
UniAccept extends UniCompletion
UniApply extends UniCompletion
UniCompletion extends Completion
UniCompose extends UniCompletion
UniComposeExceptionally extends UniCompletion
UniExceptionally extends UniCompletion
UniHandle extends UniCompletion
UniRelay extends UniCompletion
UniRun extends UniCompletion
UniWhenComplete extends UniCompletion
34`,
        },
        {
          type: "paragraph",
          text: "Almost every public method has its own node class: `thenApply` makes a `UniApply`, `thenCompose` a `UniCompose`, `exceptionallyCompose` a `UniComposeExceptionally`, `thenCombine` a `BiApply`, `applyToEither` an `OrApply`. `Delayer`, `Timeout`, `Canceller`, `DelayedExecutor` and `TaskSubmitter` implement the Java 9 timeout machinery, which the next lesson opens. Three of them in detail:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p 'java.util.concurrent.CompletableFuture$Completion' \\
         'java.util.concurrent.CompletableFuture$UniCompletion' \\
         'java.util.concurrent.CompletableFuture$UniApply'`,
        },
        {
          type: "output",
          text: `abstract class java.util.concurrent.CompletableFuture$Completion extends java.util.concurrent.ForkJoinTask<java.lang.Void> implements java.lang.Runnable, java.util.concurrent.CompletableFuture$AsynchronousCompletionTask {
  volatile java.util.concurrent.CompletableFuture$Completion next;
  abstract java.util.concurrent.CompletableFuture<?> tryFire(int);
  abstract boolean isLive();
  public final void run();
  public final boolean exec();
  ...
}
abstract class java.util.concurrent.CompletableFuture$UniCompletion<T, V> extends java.util.concurrent.CompletableFuture$Completion {
  java.util.concurrent.Executor executor;
  java.util.concurrent.CompletableFuture<V> dep;
  java.util.concurrent.CompletableFuture<T> src;
  final boolean claim();
  final boolean isLive();
}
final class java.util.concurrent.CompletableFuture$UniApply<T, V> extends java.util.concurrent.CompletableFuture$UniCompletion<T, V> {
  java.util.function.Function<? super T, ? extends V> fn;
  final java.util.concurrent.CompletableFuture<V> tryFire(int);
}`,
        },
        {
          type: "list",
          items: [
            "**A `Completion` is a `ForkJoinTask` and a `Runnable`.** When an async stage fires, the node itself is handed to `executor.execute(node)`: no wrapper object, and if the executor is a `ForkJoinPool` it goes straight into a work queue.",
            "**`UniCompletion` holds `src`, `dep` and `executor`.** `dep` is the future that `thenApply` returned to me. `isLive()` is `dep != null`; firing sets `dep` to `null`, which is how a fired node is recognised as dead.",
            "**`claim()`** is the one-shot guard: it CASes the node's `ForkJoinTask` tag from 0 to 1, so two threads racing to fire the same node can't both run `fn`. For an async node, the winner also nulls `executor` and calls `execute`, so the function runs exactly once, on the executor.",
            "**`UniApply` adds only `fn`**. Each `then...` call costs one new future (24 bytes) plus one node (40 bytes for a `UniApply`), which matches the 79 bytes per stage I measure in the Performance section.",
          ],
        },
        {
          type: "heading",
          text: "Walking the stack while it's live",
        },
        {
          type: "paragraph",
          text: "The Java 8 lesson saw the stack only through `toString()` (\"3 dependents\"). With reflection I can read the nodes themselves:",
        },
        {
          type: "code",
          language: "java",
          title: "StackPeek.java",
          code: `import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

public class StackPeek {
    static Field STACK, NEXT, RESULT;

    static List<String> stackOf(CompletableFuture<?> f) throws Exception {
        List<String> names = new ArrayList<>();
        for (Object c = STACK.get(f); c != null; c = NEXT.get(c)) names.add(c.getClass().getSimpleName());
        return names;
    }

    public static void main(String[] args) throws Exception {
        Class<?> cf = CompletableFuture.class;
        STACK = cf.getDeclaredField("stack");   STACK.setAccessible(true);
        RESULT = cf.getDeclaredField("result"); RESULT.setAccessible(true);
        NEXT = Class.forName("java.util.concurrent.CompletableFuture$Completion").getDeclaredField("next");
        NEXT.setAccessible(true);

        CompletableFuture<Integer> fare = new CompletableFuture<>();   // fare in paise, not known yet
        CompletableFuture<Integer> eta = new CompletableFuture<>();
        fare.thenApply(p -> p + 2_000);                                  // UniApply
        fare.thenAccept(p -> { });                                       // UniAccept
        fare.exceptionally(ex -> 0);                                     // UniExceptionally
        fare.thenCombine(eta, (p, m) -> p + "/" + m);                    // BiApply (+ CoCompletion on eta)
        fare.whenComplete((p, ex) -> { });                               // UniWhenComplete
        System.out.println("fare.stack (top first): " + stackOf(fare));
        System.out.println("eta.stack:              " + stackOf(eta));
        System.out.println("fare.result:            " + RESULT.get(fare));

        fare.complete(18_000);
        System.out.println("after complete: result=" + RESULT.get(fare) + ", stack=" + stackOf(fare));
        System.out.println("eta.stack still:        " + stackOf(eta));

        CompletableFuture<String> nothing = new CompletableFuture<>();
        nothing.complete(null);
        Object alt = RESULT.get(nothing);
        System.out.println("null result stored as:  " + alt.getClass().getSimpleName());
        CompletableFuture<String> failed = CompletableFuture.failedFuture(new IllegalStateException("maps down"));
        Object failAlt = RESULT.get(failed);
        Field ex = failAlt.getClass().getDeclaredField("ex"); ex.setAccessible(true);
        System.out.println("failure stored as:      " + failAlt.getClass().getSimpleName() + "(" + ex.get(failAlt) + ")");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --add-opens java.base/java.util.concurrent=ALL-UNNAMED StackPeek",
        },
        {
          type: "output",
          text: `fare.stack (top first): [UniWhenComplete, BiApply, UniExceptionally, UniAccept, UniApply]
eta.stack:              [CoCompletion]
fare.result:            null
after complete: result=18000, stack=[]
eta.stack still:        [CoCompletion]
null result stored as:  AltResult
failure stored as:      AltResult(java.lang.IllegalStateException: maps down)`,
        },
        {
          type: "list",
          items: [
            "**Five calls, five node types, newest on top**: a Treiber stack, the lock-free LIFO stack from the CAS lesson.",
            "**`thenCombine` registered on both inputs**: the `BiApply` on `fare`, and on `eta` a small `CoCompletion` that points at the same `BiApply`. Whichever input finishes second fires it.",
            "**After `complete(18000)`, `fare`'s stack was empty**, but `eta` still held its `CoCompletion`: the `BiApply` was tried when `fare` completed, found `eta` not done, and stayed waiting. It will run when `eta` completes.",
            "**`null` and failures are both `AltResult`s**: `NIL` for `null`, and one with `ex` set for a failure. A plain value is stored as itself, so the common path allocates nothing extra.",
          ],
        },
        {
          type: "heading",
          text: "thenApply versus thenApplyAsync in bytecode",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p java.util.concurrent.CompletableFuture   # thenApply, thenApplyAsync and uniApplyStage",
        },
        {
          type: "output",
          text: `  public <U> java.util.concurrent.CompletableFuture<U> thenApply(java.util.function.Function<? super T, ? extends U>);
       0: aload_0
       1: aconst_null
       2: aload_1
       3: invokevirtual #455                // Method uniApplyStage:(Ljava/util/concurrent/Executor;Ljava/util/function/Function;)...
  public <U> java.util.concurrent.CompletableFuture<U> thenApplyAsync(java.util.function.Function<? super T, ? extends U>);
       0: aload_0
       1: aload_0
       2: invokevirtual #378                // Method defaultExecutor:()Ljava/util/concurrent/Executor;
       5: aload_1
       6: invokevirtual #455                // Method uniApplyStage:(...)
  public <U> java.util.concurrent.CompletableFuture<U> thenApplyAsync(java.util.function.Function<? super T, ? extends U>, java.util.concurrent.Executor);
       0: aload_0
       1: aload_2
       2: invokestatic  #423                // Method screenExecutor:(Ljava/util/concurrent/Executor;)Ljava/util/concurrent/Executor;
       5: aload_1
       6: invokevirtual #455                // Method uniApplyStage:(...)
  private <V> java.util.concurrent.CompletableFuture<V> uniApplyStage(java.util.concurrent.Executor, java.util.function.Function<? super T, ? extends V>);
...
      12: aload_0
      13: getfield      #124                // Field result:Ljava/lang/Object;
...
      18: ifnull        29
...
      25: invokevirtual #137                // Method uniApplyNow:(...)
      28: areturn
      29: aload_0
      30: invokevirtual #141                // Method newIncompleteFuture:()Ljava/util/concurrent/CompletableFuture;
...
      36: new           #145                // class java/util/concurrent/CompletableFuture$UniApply
...
      48: invokevirtual #150                // Method unipush:(Ljava/util/concurrent/CompletableFuture$Completion;)V
      51: aload         4
      53: areturn`,
        },
        {
          type: "list",
          items: [
            "**All three are the same method with a different executor**: `null` for `thenApply`, `defaultExecutor()` (which returns `ASYNC_POOL`) for `thenApplyAsync(fn)`, and my executor, passed through `screenExecutor`, for the two-argument form. \"Async\" is nothing more than a non-null executor in the node.",
            "**`screenExecutor` has a surprise**: if the common pool has parallelism below 2 and I explicitly pass `ForkJoinPool.commonPool()`, it silently substitutes `ASYNC_POOL`, the thread-per-task executor. Passing the common pool by name doesn't guarantee the common pool.",
            "**`uniApplyStage` reads `result` first.** If it's already set, `uniApplyNow` runs the function immediately (sync) or submits it (async), without ever pushing a node. Only a pending future gets a `UniApply` pushed with `unipush`.",
          ],
        },
        {
          type: "heading",
          text: "Pushing: tryPushStack and the double check",
        },
        {
          type: "output",
          text: `  final boolean tryPushStack(java.util.concurrent.CompletableFuture$Completion);
    Code:
       0: aload_0
       1: getfield      #13                 // Field stack:Ljava/util/concurrent/CompletableFuture$Completion;
       4: astore_2
       5: getstatic     #17                 // Field NEXT:Ljava/lang/invoke/VarHandle;
...
      10: invokevirtual #20                 // Method java/lang/invoke/VarHandle.set:(Ljava/util/concurrent/CompletableFuture$Completion;Ljava/util/concurrent/CompletableFuture$Completion;)V
      13: getstatic     #24                 // Field STACK:Ljava/lang/invoke/VarHandle;
...
      19: invokevirtual #27                 // Method java/lang/invoke/VarHandle.compareAndSet:(Ljava/util/concurrent/CompletableFuture;Ljava/util/concurrent/CompletableFuture$Completion;Ljava/util/concurrent/CompletableFuture$Completion;)Z
      22: ireturn
  final void unipush(java.util.concurrent.CompletableFuture$Completion);
    Code:
...
       6: invokevirtual #30                 // Method tryPushStack:(Ljava/util/concurrent/CompletableFuture$Completion;)Z
       9: ifne          30
      12: aload_0
      13: getfield      #124                // Field result:Ljava/lang/Object;
      16: ifnull        4
      19: getstatic     #17                 // Field NEXT:Ljava/lang/invoke/VarHandle;
...
      24: invokevirtual #128                // Method java/lang/invoke/VarHandle.set:(Ljava/util/concurrent/CompletableFuture$Completion;Ljava/lang/Void;)V
      27: goto          30
      30: aload_0
      31: getfield      #124                // Field result:Ljava/lang/Object;
      34: ifnull        43
      37: aload_1
      38: iconst_0
      39: invokevirtual #110                // Method java/util/concurrent/CompletableFuture$Completion.tryFire:(I)Ljava/util/concurrent/CompletableFuture;
      42: pop
      43: return`,
        },
        {
          type: "list",
          items: [
            "**`tryPushStack` (offsets 1 to 19)**: read `stack`, set the new node's `next` to it with `NEXT.set`, then `STACK.compareAndSet(this, old, node)`. That's the whole Treiber push; it returns `false` if another thread pushed first.",
            "**`unipush` offsets 6 to 16**: if the push failed, read `result`; still `null` means just retry (jump back to 4). If the future completed meanwhile, unlink the node (`NEXT.set(c, null)`, offset 24) and stop pushing.",
            "**Offsets 31 to 39**: after a push, read `result` once more, and if it's set, call `tryFire(0)`, which is `SYNC`.",
          ],
        },
        {
          type: "paragraph",
          text: "That's the race the Java 8 lesson described in words. `unipush` pushes the node, then reads `result` again. If the future completed between the first check in `uniApplyStage` and the push, the completing thread may already have drained the stack and missed this node, so the attaching thread fires it itself with `tryFire(SYNC)`. If both threads try, `claim()` lets exactly one of them run it. This is why the thread that runs a plain `thenApply` is decided by timing, which the next section measures.",
        },
        {
          type: "heading",
          text: "postComplete, caught in a thread dump",
        },
        {
          type: "code",
          language: "java",
          title: "DumpPostComplete.java",
          code: `import java.util.concurrent.CompletableFuture;

public class DumpPostComplete {
    public static void main(String[] args) throws Exception {
        CompletableFuture<Integer> eta = new CompletableFuture<>();
        eta.thenApply(m -> m * 60)
           .thenAccept(s -> { try { Thread.sleep(3_000); } catch (InterruptedException e) { } });
        Thread dispatcher = new Thread(() -> eta.complete(7), "dispatcher");
        dispatcher.start();
        dispatcher.join();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java DumpPostComplete &
jcmd $(pgrep -f DumpPostComplete) Thread.print | grep -A12 '"dispatcher"'`,
        },
        {
          type: "output",
          text: `"dispatcher" #20 [2014076] prio=5 os_prio=0 cpu=0.57ms elapsed=1.20s tid=0x00007082dc176c80 nid=2014076 waiting on condition  [0x00007082dbffe000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.lang.Thread.sleep0(java.base@21.0.13.0.3/Native Method)
	at java.lang.Thread.sleep(java.base@21.0.13.0.3/Thread.java:509)
	at DumpPostComplete.lambda$main$1(DumpPostComplete.java:7)
	at DumpPostComplete$$Lambda/0x000070826c000c48.accept(Unknown Source)
	at java.util.concurrent.CompletableFuture$UniAccept.tryFire(java.base@21.0.13.0.3/CompletableFuture.java:718)
	at java.util.concurrent.CompletableFuture.postComplete(java.base@21.0.13.0.3/CompletableFuture.java:510)
	at java.util.concurrent.CompletableFuture.complete(java.base@21.0.13.0.3/CompletableFuture.java:2179)
	at DumpPostComplete.lambda$main$2(DumpPostComplete.java:8)
	at DumpPostComplete$$Lambda/0x000070826c001800.run(Unknown Source)
	at java.lang.Thread.runWith(java.base@21.0.13.0.3/Thread.java:1596)
	at java.lang.Thread.run(java.base@21.0.13.0.3/Thread.java:1583)`,
        },
        {
          type: "list",
          items: [
            "**The thread named `dispatcher` is inside `complete()`**, inside `postComplete()`, running my `thenAccept` lambda. `complete` hasn't returned, and won't for three seconds. Whoever calls `complete` (an HTTP client's I/O thread, a Kafka consumer, a timer) is the thread that runs every callback that was waiting.",
            "**There's no `UniApply` frame between `postComplete` and `UniAccept`.** The `thenApply` ran first and finished, and the `thenAccept` was attached to *its* future, not to `eta`. A naive implementation would fire it from inside `UniApply.tryFire`, one stack frame deeper per stage. Instead, `postComplete` fires nodes in `NESTED` mode: `UniApply.tryFire(NESTED)` completes its `dep` and returns it, and `postComplete` pushes that future's waiters onto its own loop. The chain is walked iteratively.",
          ],
        },
        {
          type: "paragraph",
          text: "That flattening is what lets very long chains complete safely. The opposite case, recursion that I write myself with `thenCompose` on futures that are already complete, has no such protection:",
        },
        {
          type: "code",
          language: "java",
          title: "DeepChain.java",
          code: `import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

public class DeepChain {
    // a retry-style loop written with thenCompose on futures that are already complete
    static CompletableFuture<Integer> attempt(int n, int limit) {
        if (n == limit) return CompletableFuture.completedFuture(n);
        return CompletableFuture.completedFuture(n).thenCompose(x -> attempt(x + 1, limit));
    }

    public static void main(String[] args) {
        CompletableFuture<Integer> start = new CompletableFuture<>();
        CompletableFuture<Integer> end = start;
        for (int i = 0; i < 1_000_000; i++) end = end.thenApply(x -> x + 1);   // a million pending stages
        long t = System.nanoTime();
        start.complete(0);
        System.out.println("1,000,000-stage chain: " + end.join() + " in " + (System.nanoTime() - t) / 1_000_000 + " ms, no StackOverflowError");

        for (int limit : new int[] {1_000, 10_000, 100_000}) {
            try {
                System.out.println("recursive thenCompose depth " + limit + ": " + attempt(0, limit).join());
            } catch (CompletionException e) {
                System.out.println("recursive thenCompose depth " + limit + ": " + e.getClass().getSimpleName()
                    + " caused by " + e.getCause().getClass().getSimpleName());
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `1,000,000-stage chain: 1000000 in 279 ms, no StackOverflowError
recursive thenCompose depth 1000: 1000
recursive thenCompose depth 10000: CompletionException caused by StackOverflowError
recursive thenCompose depth 100000: CompletionException caused by StackOverflowError`,
        },
        {
          type: "list",
          items: [
            "**A million pending `thenApply` stages completed in one `complete(0)` call** (93 to 287 ms across my runs, on a busy machine), all on `main`, with no deep stack: `postComplete`'s loop again.",
            "**The recursive `thenCompose` overflowed**, because each `thenCompose` on an already-complete future calls my function right away, which calls `thenCompose` again, all on one stack. 1,000 levels worked; in a separate run 2,000 already failed with the default 1 MB thread stack, and with `-Xss8m` 10,000 worked and 100,000 failed.",
            "**The `StackOverflowError` didn't crash anything.** `thenCompose` catches `Throwable` from my function and stores it in the returned future, so `join()` threw `CompletionException` caused by `StackOverflowError`. An `Error` that normally kills a thread became a failed future. Recursive retry loops are where this shows up in real code; the Examples section fixes one with `thenComposeAsync`.",
          ],
        },
      ],
    },
    {
      title: "Which Thread Runs a Callback",
      blocks: [
        {
          type: "paragraph",
          text: "The Java 8 lesson showed the two basic cases with a latch. Here are the cases that cause production incidents: the completing thread paying for a whole chain, a chain that hops between executors, `thenCombine`, and the race when a callback is attached while the work is finishing.",
        },
        {
          type: "code",
          language: "java",
          title: "CallbackThreads.java",
          code: `import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.*;

public class CallbackThreads {
    static String who() { return Thread.currentThread().getName(); }

    public static void main(String[] args) throws Exception {
        ExecutorService maps = Executors.newSingleThreadExecutor(r -> new Thread(r, "maps-io"));
        ExecutorService pricing = Executors.newSingleThreadExecutor(r -> new Thread(r, "pricing"));

        // 1. whoever calls complete() pays for every callback attached before it
        CompletableFuture<Integer> eta = new CompletableFuture<>();
        eta.thenApply(m -> { sleep(100); System.out.println("  step 1 on " + who()); return m; })
           .thenApply(m -> { sleep(100); System.out.println("  step 2 on " + who()); return m; })
           .thenAccept(m -> { sleep(100); System.out.println("  step 3 on " + who()); });
        Thread dispatcher = new Thread(() -> {
            long t = System.nanoTime();
            eta.complete(7);
            System.out.println("complete() returned after " + (System.nanoTime() - t) / 1_000_000 + " ms on " + who());
        }, "dispatcher");
        dispatcher.start();
        dispatcher.join();

        // 2. thenApplyAsync hops; the plain thenApply after it stays on the hop's thread
        CompletableFuture.supplyAsync(() -> who(), maps)
            .thenApplyAsync(prev -> prev + " -> " + who(), pricing)
            .thenApply(prev -> prev + " -> " + who())
            .thenApplyAsync(prev -> prev + " -> " + who(), maps)
            .thenAccept(path -> System.out.println("path: " + path)).join();

        // 3. thenCombine runs on the thread that completes the SECOND input
        CompletableFuture<Integer> fare = CompletableFuture.supplyAsync(() -> { sleep(50); return 18_000; }, pricing);
        CompletableFuture<Integer> km = CompletableFuture.supplyAsync(() -> { sleep(150); return 9; }, maps);
        fare.thenCombine(km, (f, k) -> "combine ran on " + who()).thenAccept(System.out::println).join();

        // 4. a race: attach right after supplyAsync, 10,000 times
        Map<String, Integer> ranOn = new TreeMap<>();
        for (int i = 0; i < 10_000; i++) {
            String t = CompletableFuture.supplyAsync(() -> 1, maps).thenApply(x -> who()).join();
            ranOn.merge(t, 1, Integer::sum);
        }
        System.out.println("thenApply attached immediately ran on: " + ranOn);
        maps.shutdown();
        pricing.shutdown();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `  step 1 on dispatcher
  step 2 on dispatcher
  step 3 on dispatcher
complete() returned after 306 ms on dispatcher
path: maps-io -> pricing -> pricing -> maps-io
combine ran on maps-io
thenApply attached immediately ran on: {main=5445, maps-io=4555}`,
        },
        {
          type: "list",
          items: [
            "**`complete()` took 306 ms** to return, because the dispatcher ran three 100 ms callbacks before returning (306 to 310 ms in four runs). If the dispatcher is a single event-loop thread, every other event waits for my callbacks. This is the root of the production story at the end of this lesson.",
            "**The hop path**: `supplyAsync` ran on `maps-io`, `thenApplyAsync(..., pricing)` moved to `pricing`, the plain `thenApply` after it **stayed on `pricing`** (it was attached before that stage finished, so the thread that completed it ran it), and the last `thenApplyAsync(..., maps)` hopped back. A non-async stage inherits whatever thread the previous stage finished on.",
            "**`thenCombine` ran on `maps-io`**, the thread that finished the second (slower) input. The fare finished first on `pricing` and only marked half the `BiApply` ready.",
            "**The race**: `supplyAsync(() -> 1, maps).thenApply(...)` ten thousand times. Sometimes `maps-io` finished the trivial supplier before `main` attached the callback (so `main` ran it), sometimes not. Over ten runs `main` won between 26 and 5,445 times out of 10,000. It depends on scheduling, load from other processes and JIT state, so code must not care which of the two it gets.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "The rule I use",
          text: "A non-async callback runs on **someone else's thread**, chosen by timing: the completer's, or mine. So a plain `thenApply`/`thenAccept` must be short, non-blocking and safe to run on any thread, including an I/O event loop or the JVM-wide timeout thread. Anything slow, blocking, or touching thread-confined state gets the `Async` variant with an executor I chose.",
        },
        {
          type: "heading",
          text: "What a hop costs",
        },
        {
          type: "paragraph",
          text: "The price of the `Async` variant is a hand-off. I timed 20,000 single stages each way (measured in the Performance section): an inline `thenApply` on a completed future took 0.3 µs at p50, and a `thenApplyAsync` to an idle single-thread executor or the common pool took about 29 µs at p50, almost all of it waking a parked thread. For a 25 ms CPU callback that's nothing; for a one-line mapping that's 100 times slower than running it inline.",
        },
      ],
    },
    {
      title: "The Common ForkJoinPool",
      blocks: [
        {
          type: "paragraph",
          text: "Every `*Async` method without an executor goes to `ASYNC_POOL`. ThreadPoolExecutor Internals: Queues, Rejection and Sizing showed the common pool being shared with parallel streams; here I check exactly how `CompletableFuture` decides what `ASYNC_POOL` is, on three machine shapes:",
        },
        {
          type: "code",
          language: "java",
          title: "CommonPoolCheck.java",
          code: `import java.lang.reflect.Field;
import java.util.Set;
import java.util.concurrent.*;

public class CommonPoolCheck {
    public static void main(String[] args) throws Exception {
        ForkJoinPool common = ForkJoinPool.commonPool();
        System.out.println("availableProcessors     " + Runtime.getRuntime().availableProcessors());
        System.out.println("common parallelism      " + ForkJoinPool.getCommonPoolParallelism());
        System.out.println("parallelism property    " + System.getProperty("java.util.concurrent.ForkJoinPool.common.parallelism"));
        System.out.println("asyncMode (FIFO)        " + common.getAsyncMode());

        Field useCommon = CompletableFuture.class.getDeclaredField("USE_COMMON_POOL");
        Field asyncPool = CompletableFuture.class.getDeclaredField("ASYNC_POOL");
        useCommon.setAccessible(true);
        asyncPool.setAccessible(true);
        System.out.println("USE_COMMON_POOL         " + useCommon.get(null));
        System.out.println("ASYNC_POOL              " + asyncPool.get(null).getClass().getName());
        System.out.println("defaultExecutor()       " + new CompletableFuture<>().defaultExecutor().getClass().getSimpleName());

        Set<String> names = ConcurrentHashMap.newKeySet();
        CountDownLatch all = new CountDownLatch(12);
        for (int i = 0; i < 12; i++) {
            CompletableFuture.runAsync(() -> {
                Thread t = Thread.currentThread();
                names.add(t.getName() + (t.isDaemon() ? " (daemon)" : ""));
                all.countDown();
                try { all.await(2, TimeUnit.SECONDS); } catch (InterruptedException e) { }
            });
        }
        all.await(3, TimeUnit.SECONDS);
        System.out.println("12 blocking runAsync tasks ran on " + names.size() + " threads, e.g. " + names.iterator().next());
        System.out.println("common pool size now    " + common.getPoolSize());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `O="--add-opens java.base/java.util.concurrent=ALL-UNNAMED"
java $O CommonPoolCheck                                                      # 8 cores
java $O -XX:ActiveProcessorCount=2 CommonPoolCheck                           # a 2-CPU container
java $O -Djava.util.concurrent.ForkJoinPool.common.parallelism=32 CommonPoolCheck`,
        },
        {
          type: "output",
          text: `availableProcessors     8
common parallelism      7
parallelism property    null
asyncMode (FIFO)        false
USE_COMMON_POOL         true
ASYNC_POOL              java.util.concurrent.ForkJoinPool
defaultExecutor()       ForkJoinPool
12 blocking runAsync tasks ran on 7 threads, e.g. ForkJoinPool.commonPool-worker-5 (daemon)
common pool size now    7

availableProcessors     2
common parallelism      1
parallelism property    null
asyncMode (FIFO)        false
USE_COMMON_POOL         false
ASYNC_POOL              java.util.concurrent.CompletableFuture$ThreadPerTaskExecutor
defaultExecutor()       ThreadPerTaskExecutor
12 blocking runAsync tasks ran on 12 threads, e.g. Thread-3
common pool size now    0

availableProcessors     8
common parallelism      32
parallelism property    32
asyncMode (FIFO)        false
USE_COMMON_POOL         true
ASYNC_POOL              java.util.concurrent.ForkJoinPool
defaultExecutor()       ForkJoinPool
12 blocking runAsync tasks ran on 12 threads, e.g. ForkJoinPool.commonPool-worker-5 (daemon)
common pool size now    12`,
        },
        {
          type: "list",
          items: [
            "**8 cores gives parallelism 7** (cores minus one, because the thread that starts a fork-join computation helps run it). Twelve tasks that block ran on 7 threads; the other five waited their turn. The pool's threads are daemons named `ForkJoinPool.commonPool-worker-N`.",
            "**On a 2-CPU container, parallelism is 1**, so `USE_COMMON_POOL` is `false` and `ASYNC_POOL` is `ThreadPerTaskExecutor`: every `supplyAsync` without an executor starts a brand-new `Thread-N`. Twelve tasks, twelve threads, and the common pool never started at all (size 0). I got the same with `-Djava.util.concurrent.ForkJoinPool.common.parallelism=1` on 8 cores.",
            "**The property overrides the CPU count**: with 32, all twelve ran at once. It's read once, when the common pool is first created, so it must be a JVM flag, not something set from code after startup.",
            "**`asyncMode` is `false`**: the common pool's workers take their own queued tasks LIFO, which suits divide-and-conquer, not fairness. `CompletableFuture` tasks submitted from outside the pool go into shared submission queues and are taken FIFO, but nothing promises ordering between them.",
          ],
        },
        {
          type: "paragraph",
          text: "The single-CPU fallback changes more than speed. `ThreadPerTaskExecutor` threads are ordinary non-daemon threads, so the \"fire and forget\" behaviour from the Java 8 lesson's `LostOutput` example flips:",
        },
        {
          type: "code",
          language: "java",
          title: "DaemonOrNot.java",
          code: `import java.util.concurrent.CompletableFuture;

public class DaemonOrNot {
    public static void main(String[] args) {
        CompletableFuture.runAsync(() -> {
            Thread t = Thread.currentThread();
            sleep(200);
            System.out.println("SMS sent from " + t.getName().replaceAll("\\\\d+$", "N") + ", daemon=" + t.isDaemon());
        });
        System.out.println("main returns");
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java DaemonOrNot
java -XX:ActiveProcessorCount=2 DaemonOrNot`,
        },
        {
          type: "output",
          text: `main returns
---
main returns
SMS sent from Thread-N, daemon=false`,
        },
        {
          type: "paragraph",
          text: "On my 8-core laptop the SMS is silently lost when `main` returns: daemon threads don't keep the JVM alive. In a 2-CPU container the same program sends it, because the thread-per-task thread is a non-daemon and the JVM waits for it. (The `---` is from my shell, between the two runs.) A batch job tested on a laptop and deployed to a small container behaves differently, in thread count, in memory, and in shutdown. One more reason to always pass an executor.",
        },
      ],
    },
    {
      title: "Composition: thenCompose, thenCombine, allOf and anyOf",
      blocks: [
        {
          type: "paragraph",
          text: "The Java 8 lesson covered what these do. What matters in depth is **when** the returned future completes and **how failures move** through them.",
        },
        {
          type: "code",
          language: "java",
          title: "ComposeDeep.java",
          code: `import java.util.concurrent.*;

public class ComposeDeep {
    static String who() { return Thread.currentThread().getName(); }

    public static void main(String[] args) {
        ExecutorService riders = Executors.newSingleThreadExecutor(r -> new Thread(r, "rider-db"));
        ExecutorService drivers = Executors.newSingleThreadExecutor(r -> new Thread(r, "driver-search"));

        CompletableFuture<String> rider = CompletableFuture.supplyAsync(() -> { sleep(50); return "Asha"; }, riders);

        CompletableFuture<CompletableFuture<String>> nested =
            rider.thenApply(r -> CompletableFuture.supplyAsync(() -> { sleep(100); return "Ravi for " + r; }, drivers));
        CompletableFuture<String> flat =
            rider.thenCompose(r -> CompletableFuture.supplyAsync(() -> { sleep(100); return "Ravi for " + r; }, drivers));

        // the outer future of thenApply is done as soon as the INNER one is merely started
        CompletableFuture<?> inner = nested.join();
        System.out.println("nested done=" + nested.isDone() + ", inner done=" + inner.isDone());
        System.out.println("flat: " + flat.thenApply(d -> d + " (next stage on " + who() + ")").join());

        // failure inside compose: thrown vs returned
        CompletableFuture<String> thrown = rider.thenCompose(r -> { throw new IllegalStateException("no drivers"); });
        CompletableFuture<String> returned = rider.thenCompose(r -> CompletableFuture.failedFuture(new IllegalStateException("no drivers")));
        CompletableFuture<String> nullInner = rider.thenCompose(r -> null);
        for (CompletableFuture<String> f : java.util.List.of(thrown, returned, nullInner)) {
            try { f.join(); } catch (CompletionException e) { System.out.println("join -> " + e.getCause()); }
        }
        riders.shutdown();
        drivers.shutdown();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `nested done=true, inner done=false
flat: Ravi for Asha (next stage on driver-search)
join -> java.lang.IllegalStateException: no drivers
join -> java.lang.IllegalStateException: no drivers
join -> java.lang.NullPointerException: Cannot invoke "java.util.concurrent.CompletionStage.toCompletableFuture()" because the return value of "java.util.function.Function.apply(Object)" is null`,
        },
        {
          type: "list",
          items: [
            "**`thenApply` with an async function completes too early.** `nested.join()` returned as soon as the driver search had been *started*: `nested` was done, the inner future wasn't. Code that waits on `nested` thinks the work is finished. This is the real danger of the nesting mistake, more than the ugly type.",
            "**`thenCompose` completes when the inner future completes**, through a `UniRelay` node it pushes on the inner future. So the stage after it ran on `driver-search`, the thread that completed the *inner* future. After a `thenCompose`, my next non-async callback runs on whatever thread the other service's future completes on.",
            "**Throwing and returning a failed future look the same downstream**: both end up as `CompletionException(IllegalStateException)` at `join`.",
            "**Returning `null` from a `thenCompose` function is a bug the JDK reports late**: the returned stage fails with a `NullPointerException` from inside `CompletableFuture`. Return `CompletableFuture.completedFuture(null)` when there's nothing to do.",
          ],
        },
        {
          type: "heading",
          text: "allOf waits for everything, even after a failure",
        },
        {
          type: "code",
          language: "java",
          title: "AllAnyDeep.java",
          code: `import java.util.List;
import java.util.concurrent.*;

public class AllAnyDeep {
    static long t0 = System.nanoTime();
    static long ms() { return (System.nanoTime() - t0) / 1_000_000; }

    static CompletableFuture<Integer> call(String name, long delay, boolean fail, ExecutorService io) {
        return CompletableFuture.supplyAsync(() -> {
            sleep(delay);
            if (fail) throw new IllegalStateException(name + " down");
            return (int) delay;
        }, io);
    }

    // fail as soon as any input fails, instead of waiting for all
    static CompletableFuture<Void> allOfFailFast(List<? extends CompletableFuture<?>> fs) {
        CompletableFuture<Void> all = CompletableFuture.allOf(fs.toArray(new CompletableFuture[0]));
        for (CompletableFuture<?> f : fs) f.whenComplete((v, ex) -> { if (ex != null) all.completeExceptionally(ex); });
        return all;
    }

    public static void main(String[] args) {
        ExecutorService io = Executors.newFixedThreadPool(8);
        List<CompletableFuture<Integer>> calls = List.of(call("surge", 50, true, io), call("fare", 300, false, io), call("eta", 600, false, io));
        t0 = System.nanoTime();
        try { CompletableFuture.allOf(calls.toArray(new CompletableFuture[0])).join(); }
        catch (CompletionException e) { System.out.println("allOf failed at " + ms() + " ms: " + e.getCause().getMessage()); }

        List<CompletableFuture<Integer>> again = List.of(call("surge", 50, true, io), call("fare", 300, false, io), call("eta", 600, false, io));
        t0 = System.nanoTime();
        try { allOfFailFast(again).join(); }
        catch (CompletionException e) { System.out.println("fail-fast failed at " + ms() + " ms: " + e.getCause().getMessage()); }

        t0 = System.nanoTime();
        try { CompletableFuture.anyOf(call("surge", 50, true, io), call("fare", 300, false, io)).join(); }
        catch (CompletionException e) { System.out.println("anyOf failed at " + ms() + " ms: " + e.getCause().getMessage()); }

        System.out.println("allOf()  done? " + CompletableFuture.allOf().isDone());
        System.out.println("anyOf()  done? " + CompletableFuture.anyOf().isDone() + " (and never will be)");

        CompletableFuture<?>[] eight = new CompletableFuture<?>[8];
        for (int i = 0; i < 8; i++) eight[i] = new CompletableFuture<>();
        CompletableFuture.allOf(eight);
        System.out.println("allOf(8 pending): dependents on input 0 = " + eight[0].getNumberOfDependents()
            + ", on input 7 = " + eight[7].getNumberOfDependents());
        io.shutdown();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `allOf failed at 600 ms: surge down
fail-fast failed at 50 ms: surge down
anyOf failed at 50 ms: surge down
allOf()  done? true
anyOf()  done? false (and never will be)
allOf(8 pending): dependents on input 0 = 1, on input 7 = 1`,
        },
        {
          type: "list",
          items: [
            "**`allOf` failed at 600 ms**, although `surge` had failed at 50 ms. It completes only when **every** input is done, and then takes the failure. For a request that's going to fail anyway, that's 550 ms of waiting for nothing.",
            "**The fail-fast version** adds a `whenComplete` on each input that completes the combined future exceptionally the moment one fails. It failed at 50 ms. The other calls keep running, as always; it just stops waiting for them.",
            "**`anyOf` takes the first completion, success or failure**: the 50 ms failure beat the 300 ms success. If I want \"the first success\", I need a different helper (complete a result future on success, fail only when all have failed).",
            "**Edge cases**: `allOf()` with no inputs is already complete; `anyOf()` with no inputs never completes. A fan-out over an empty list of drivers that uses `anyOf` hangs forever, so I check for empty input first.",
            "**`allOf` builds a balanced tree** (`andTree`, of `BiRelay` nodes), so each input carries exactly one dependent, whatever the number of inputs.",
          ],
        },
      ],
    },
    {
      title: "Errors: Wrapping, Recovery and exceptionallyCompose",
      blocks: [
        {
          type: "paragraph",
          text: "The Java 8 lesson said \"the `ex` is usually a `CompletionException`, call `getCause()`\". \"Usually\" hides real rules, and getting them wrong means `instanceof TimeoutException` checks that never match. I tested every way an exception can enter and leave a chain:",
        },
        {
          type: "code",
          language: "java",
          title: "Wrapping.java",
          code: `import java.util.concurrent.*;

public class Wrapping {
    static String describe(Throwable ex) {
        return ex.getCause() == null ? ex.getClass().getSimpleName()
            : ex.getClass().getSimpleName() + "(" + ex.getCause().getClass().getSimpleName() + ")";
    }

    public static void main(String[] args) throws Exception {
        IllegalStateException down = new IllegalStateException("surge down");

        CompletableFuture<Integer> thrown = CompletableFuture.supplyAsync(() -> { throw down; });
        thrown.exceptionally(ex -> { System.out.println("1 supplier threw, same stage sees:     " + describe(ex)); return 0; }).join();

        CompletableFuture<Integer> completed = new CompletableFuture<>();
        completed.completeExceptionally(down);
        completed.exceptionally(ex -> { System.out.println("2 completeExceptionally, same stage:   " + describe(ex)); return 0; });
        completed.thenApply(x -> x + 1)
                 .exceptionally(ex -> { System.out.println("3 ...one stage further down:         " + describe(ex)); return 0; });

        CompletableFuture<Integer> own = CompletableFuture.supplyAsync(() -> { throw new CompletionException(down); });
        own.exceptionally(ex -> { System.out.println("4 supplier threw CompletionException:  " + describe(ex)); return 0; }).join();

        try { completed.join(); } catch (CompletionException e) { System.out.println("5 join():                             " + describe(e)); }
        try { completed.get(); } catch (ExecutionException e) { System.out.println("6 get():                              " + describe(e)); }

        CompletableFuture<Integer> cancelled = new CompletableFuture<>();
        CompletableFuture<Integer> next = cancelled.thenApply(x -> x + 1);
        cancelled.cancel(false);
        try { cancelled.join(); } catch (CancellationException e) { System.out.println("7 join() on cancelled:                " + describe(e)); }
        try { next.join(); } catch (CompletionException e) { System.out.println("8 join() on its dependent:            " + describe(e)); }
        System.out.println("  dependent isCancelled=" + next.isCancelled() + ", isCompletedExceptionally=" + next.isCompletedExceptionally());

        // whenComplete that itself throws
        CompletableFuture<Integer> a = CompletableFuture.<Integer>failedFuture(down)
            .whenComplete((v, ex) -> { throw new IllegalArgumentException("logger broke"); });
        a.exceptionally(ex -> {
            System.out.println("9 whenComplete threw on a failure:    " + describe(ex) + ", suppressed " + ex.getCause().getSuppressed()[0].getMessage());
            return 0; }).join();
        CompletableFuture<Integer> b = CompletableFuture.completedFuture(5)
            .whenComplete((v, ex) -> { throw new IllegalArgumentException("logger broke"); });
        b.exceptionally(ex -> { System.out.println("10 whenComplete threw on a success:   " + describe(ex)); return 0; }).join();
    }
}`,
        },
        {
          type: "output",
          text: `1 supplier threw, same stage sees:     CompletionException(IllegalStateException)
2 completeExceptionally, same stage:   IllegalStateException
3 ...one stage further down:         CompletionException(IllegalStateException)
4 supplier threw CompletionException:  CompletionException(IllegalStateException)
5 join():                             CompletionException(IllegalStateException)
6 get():                              ExecutionException(IllegalStateException)
7 join() on cancelled:                CancellationException
8 join() on its dependent:            CompletionException(CancellationException)
  dependent isCancelled=false, isCompletedExceptionally=true
9 whenComplete threw on a failure:    CompletionException(IllegalStateException), suppressed logger broke
10 whenComplete threw on a success:   CompletionException(IllegalArgumentException)`,
        },
        {
          type: "table",
          headers: ["How the failure got in", "What a callback on that stage sees", "Further down the chain"],
          rows: [
            ["The supplier or a function **threw** `e`", "`CompletionException(e)`", "`CompletionException(e)`"],
            ["`completeExceptionally(e)` or `failedFuture(e)`", "`e` itself, **unwrapped** (case 2)", "`CompletionException(e)` (case 3)"],
            ["The function threw a `CompletionException`", "That same `CompletionException`, not double-wrapped (case 4)", "The same"],
            ["`cancel()`", "`CancellationException`; `join` throws it directly (case 7)", "`CompletionException(CancellationException)`, and the dependent is **not** `isCancelled()` (case 8)"],
          ],
        },
        {
          type: "list",
          items: [
            "**So an unwrap helper is mandatory**: `ex instanceof CompletionException && ex.getCause() != null ? ex.getCause() : ex`. Checking `ex instanceof TimeoutException` directly works on the stage that `orTimeout` completed, and silently fails one stage later.",
            "**`join` keeps the wrapper, `get` swaps it**: `join` throws the stored `CompletionException`; `get` takes its cause and wraps that in `ExecutionException`. The root cause is the same object either way.",
            "**`whenComplete` that throws**: if the stage had failed, the original failure wins and the new exception is added to it with `addSuppressed` (case 9). Note that it was added to *my* `IllegalStateException` object, which is shared: a stack trace logged later shows a suppressed \"logger broke\" from a different part of the code. If the stage had succeeded, the `whenComplete` exception becomes the result (case 10). A broken logging callback can turn a successful fare into a failed one.",
          ],
        },
        {
          type: "heading",
          text: "Recovering: exceptionallyCompose, handle, exceptionallyAsync",
        },
        {
          type: "code",
          language: "java",
          title: "Recovery.java",
          code: `import java.util.concurrent.*;

public class Recovery {
    static String who() { return Thread.currentThread().getName(); }

    static CompletableFuture<Integer> liveSurgePercent(String zone, ExecutorService io) {
        return CompletableFuture.supplyAsync(() -> {
            if (zone.equals("NEW-TOWN")) throw new IllegalStateException("surge service 503");
            return 40;
        }, io);
    }

    static CompletableFuture<Integer> cachedSurgePercent(String zone, ExecutorService cacheIo) {
        return CompletableFuture.supplyAsync(() -> 25, cacheIo);         // last known value, from Redis say
    }

    static Throwable unwrap(Throwable ex) {
        return ex instanceof CompletionException && ex.getCause() != null ? ex.getCause() : ex;
    }

    public static void main(String[] args) {
        ExecutorService io = Executors.newFixedThreadPool(2, r -> new Thread(r, "surge-io"));
        ExecutorService cacheIo = Executors.newFixedThreadPool(1, r -> new Thread(r, "cache-io"));

        for (String zone : new String[] {"SALT-LAKE", "NEW-TOWN"}) {
            CompletableFuture<Integer> surge = liveSurgePercent(zone, io)
                .exceptionallyCompose(ex -> {                                  // Java 12: fallback is itself async
                    System.out.println("  " + zone + ": live failed (" + unwrap(ex).getMessage() + "), asking the cache");
                    return cachedSurgePercent(zone, cacheIo);
                })
                .whenComplete((v, ex) -> System.out.println("  " + zone + ": metric recorded, failed=" + (ex != null)));
            System.out.println(zone + " surge " + surge.join() + "%");
        }

        CompletableFuture<Integer> broken = liveSurgePercent("NEW-TOWN", io);
        broken.exceptionally(ex -> -1).join();
        System.out.println("state()=" + broken.state() + ", exceptionNow()=" + broken.exceptionNow());
        CompletableFuture<Integer> ok = liveSurgePercent("SALT-LAKE", io);
        ok.join();
        System.out.println("state()=" + ok.state() + ", resultNow()=" + ok.resultNow());

        CompletableFuture<String> typed = liveSurgePercent("NEW-TOWN", io)
            .handle((v, ex) -> ex == null ? "SURGE " + v : "NO_SURGE because " + unwrap(ex).getClass().getSimpleName());
        System.out.println(typed.join());

        CompletableFuture<Integer> asyncFallback = liveSurgePercent("NEW-TOWN", io)
            .exceptionallyAsync(ex -> { System.out.println("exceptionallyAsync ran on " + who()); return 0; }, cacheIo);
        asyncFallback.join();
        io.shutdown();
        cacheIo.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `  SALT-LAKE: metric recorded, failed=false
SALT-LAKE surge 40%
  NEW-TOWN: live failed (surge service 503), asking the cache
  NEW-TOWN: metric recorded, failed=false
NEW-TOWN surge 25%
state()=FAILED, exceptionNow()=java.lang.IllegalStateException: surge service 503
state()=SUCCESS, resultNow()=40
NO_SURGE because IllegalStateException
exceptionallyAsync ran on cache-io`,
        },
        {
          type: "list",
          items: [
            "**`exceptionallyCompose` (Java 12) is `thenCompose` for the failure path**: the fallback is itself async (a cache read here), and the result is flattened. Before Java 12 this took `handle(...)` returning a future, then `thenCompose(x -> x)`.",
            "**The metric callback saw `failed=false` for NEW-TOWN**: by then the chain had recovered. Position matters. A `whenComplete` before the recovery sees the failure; after it, the fallback value.",
            "**`state()`, `exceptionNow()` and `resultNow()` (Java 19)** read a finished future without `try`/`catch` or blocking. `exceptionNow()` returned the unwrapped `IllegalStateException`. Both throw `IllegalStateException` if the future isn't in the matching state, so they're for code that has already checked.",
            "**`exceptionallyAsync(fn, executor)`** runs the recovery on a thread I pick. That matters when the failure is a timeout, because otherwise the recovery runs on the JVM's single timeout thread (next lesson).",
          ],
        },
      ],
    },
    {
      title: "join vs get, Cancellation and obtrude",
      blocks: [
        {
          type: "heading",
          text: "join can't be interrupted",
        },
        {
          type: "code",
          language: "java",
          title: "InterruptWait.java",
          code: `import java.util.concurrent.*;

public class InterruptWait {
    public static void main(String[] args) throws Exception {
        CompletableFuture<String> driver = new CompletableFuture<>();   // never completed by anyone else

        Thread viaGet = new Thread(() -> {
            long t = System.nanoTime();
            try {
                driver.get();
            } catch (InterruptedException e) {
                System.out.println("get():  InterruptedException after " + (System.nanoTime() - t) / 1_000_000 + " ms");
            } catch (ExecutionException e) {
                System.out.println("get():  " + e);
            }
        }, "via-get");

        Thread viaJoin = new Thread(() -> {
            long t = System.nanoTime();
            String d = driver.join();
            System.out.println("join(): returned \\"" + d + "\\" after " + (System.nanoTime() - t) / 1_000_000
                + " ms, interrupted flag " + Thread.currentThread().isInterrupted());
        }, "via-join");

        viaGet.start();
        viaJoin.start();
        Thread.sleep(100);
        viaGet.interrupt();
        viaJoin.interrupt();
        viaGet.join();
        Thread.sleep(400);
        System.out.println("via-join still waiting: " + viaJoin.getState());
        driver.complete("Ravi");
        viaJoin.join();
    }
}`,
        },
        {
          type: "output",
          text: `get():  InterruptedException after 100 ms
via-join still waiting: WAITING
join(): returned "Ravi" after 522 ms, interrupted flag true`,
        },
        {
          type: "list",
          items: [
            "**`get()` responded to the interrupt** in 100 ms with `InterruptedException`.",
            "**`join()` ignored it** and kept waiting until the value arrived 522 ms after it started (522 and 531 ms in two runs). It did restore the interrupt flag afterwards (`interrupted flag true`), so code that checks the flag later still sees it.",
            "**Why it matters**: `ExecutorService.shutdownNow()` works by interrupting, and the lesson Thread States, join, sleep, interrupt and Daemon Threads relied on interrupts for clean shutdown. A worker blocked in `join()` on a future that never completes can't be stopped that way. In a worker that must stay stoppable, I use `get(timeout, unit)`, or better, don't block at all.",
            "**Inside a `ForkJoinPool` worker**, `join` and `get` don't just park: they go through the `Signaller` node, a `ManagedBlocker`, and the pool may start a spare thread to keep its parallelism. The next lesson measures that, including the point where it runs out of spares.",
          ],
        },
        {
          type: "heading",
          text: "cancel travels down, never up",
        },
        {
          type: "code",
          language: "java",
          title: "CancelDirection.java",
          code: `import java.util.concurrent.*;

public class CancelDirection {
    public static void main(String[] args) throws Exception {
        ExecutorService maps = Executors.newSingleThreadExecutor(r -> new Thread(r, "maps-io"));
        CountDownLatch done = new CountDownLatch(1);

        CompletableFuture<Integer> route = CompletableFuture.supplyAsync(() -> {
            sleep(300);
            System.out.println("route call finished anyway on " + Thread.currentThread().getName()
                + ", interrupted=" + Thread.currentThread().isInterrupted());
            done.countDown();
            return 9;
        }, maps);
        CompletableFuture<String> eta = route.thenApply(km -> km * 3 + " min");
        CompletableFuture<String> shown = eta.thenApply(s -> "ETA " + s);

        System.out.println("eta.cancel(true)   -> " + eta.cancel(true));
        System.out.println("route  cancelled=" + route.isCancelled() + " done=" + route.isDone());
        System.out.println("eta    cancelled=" + eta.isCancelled());
        System.out.println("shown  cancelled=" + shown.isCancelled() + " exceptionally=" + shown.isCompletedExceptionally());
        done.await();
        System.out.println("route  result=" + route.join() + ", eta.complete(\\"late\\") -> " + eta.complete("late"));
        maps.shutdown();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { System.out.println("interrupted!"); }
    }
}`,
        },
        {
          type: "output",
          text: `eta.cancel(true)   -> true
route  cancelled=false done=false
eta    cancelled=true
shown  cancelled=false exceptionally=true
route call finished anyway on maps-io, interrupted=false
route  result=9, eta.complete("late") -> false`,
        },
        {
          type: "list",
          items: [
            "**Cancelling the middle stage did nothing to the stage it depends on**: `route` wasn't cancelled and its call ran to completion with `9`. A stage doesn't know which futures feed it in any way that would let it cancel them.",
            "**Downstream, the cancellation arrived as an ordinary failure**: `shown` completed exceptionally with `CompletionException(CancellationException)` but is not `isCancelled()`.",
            "**Nothing was interrupted**, with `mayInterruptIfRunning = true`: `cancel` is just `completeExceptionally(new CancellationException())`. Stopping the real work needs the work's own handle; the next lesson builds a cancellation chain that does reach the running call.",
          ],
        },
        {
          type: "heading",
          text: "obtrudeValue rewrites a completed future",
        },
        {
          type: "code",
          language: "java",
          title: "Obtrude.java",
          code: `import java.util.concurrent.CompletableFuture;

public class Obtrude {
    public static void main(String[] args) {
        CompletableFuture<Integer> fare = new CompletableFuture<>();
        CompletableFuture<String> receipt = fare.thenApply(p -> "receipt for " + p + " paise");

        fare.complete(18_000);
        System.out.println("complete(19_500) -> " + fare.complete(19_500) + ", fare=" + fare.join());

        fare.obtrudeValue(19_500);                                   // forcibly overwrite
        System.out.println("after obtrudeValue: fare=" + fare.join() + ", " + receipt.join());
        System.out.println("new dependent sees: " + fare.thenApply(p -> "receipt for " + p + " paise").join());

        fare.obtrudeException(new IllegalStateException("fare revoked"));
        System.out.println("after obtrudeException: isCompletedExceptionally=" + fare.isCompletedExceptionally()
            + ", receipt still " + receipt.join());
    }
}`,
        },
        {
          type: "output",
          text: `complete(19_500) -> false, fare=18000
after obtrudeValue: fare=19500, receipt for 18000 paise
new dependent sees: receipt for 19500 paise
after obtrudeException: isCompletedExceptionally=true, receipt still receipt for 18000 paise`,
        },
        {
          type: "paragraph",
          text: "`obtrudeValue` and `obtrudeException` skip the CAS and overwrite `result` unconditionally. Callbacks that already ran keep their old answer, so after one call the system holds two truths: a receipt for 18,000 paise and a fare of 19,500. The Javadoc says they're for error recovery; I've only seen them justified in tests. Real code that hands futures to other teams can protect itself from `complete`, `obtrude` and `cancel` by others:",
        },
        {
          type: "code",
          language: "java",
          title: "Defensive.java",
          code: `import java.util.concurrent.*;

public class Defensive {
    public static void main(String[] args) {
        CompletableFuture<Integer> internal = new CompletableFuture<>();       // the fare engine's own future

        CompletableFuture<Integer> leaked = internal;                          // handed out as is
        CompletionStage<Integer> minimal = internal.minimalCompletionStage();  // Java 9
        CompletableFuture<Integer> copy = internal.copy();                     // Java 9

        try { ((CompletableFuture<Integer>) minimal).complete(1); }
        catch (UnsupportedOperationException e) { System.out.println("minimal stage: complete() -> UnsupportedOperationException"); }
        copy.complete(1);
        System.out.println("copy.complete(1) -> internal done? " + internal.isDone());
        leaked.complete(1);
        System.out.println("leaked.complete(1) -> internal done? " + internal.isDone() + ", value " + internal.join());
    }
}`,
        },
        {
          type: "output",
          text: `minimal stage: complete() -> UnsupportedOperationException
copy.complete(1) -> internal done? false
leaked.complete(1) -> internal done? true, value 1`,
        },
        {
          type: "paragraph",
          text: "`minimalCompletionStage()` returns a `MinimalStage` subclass whose completion methods throw `UnsupportedOperationException`; `copy()` returns a dependent future, so completing it can't touch the original. A library that returns its internal future as is lets any caller decide the result for everyone.",
        },
      ],
    },
    {
      title: "Dependent Stage Leaks",
      blocks: [
        {
          type: "paragraph",
          text: "Every `then...` on a pending future pushes a node that holds the function, the lambda's captured variables and the dependent future. The node leaves the stack only when the **source** completes. If the source lives for hours and never completes, every callback ever attached to it stays reachable, even after the dependent future itself was completed or cancelled.",
        },
        {
          type: "code",
          language: "java",
          title: "SessionLeak.java",
          code: `import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

public class SessionLeak {
    static long usedMb() {
        System.gc();
        Runtime rt = Runtime.getRuntime();
        return (rt.totalMemory() - rt.freeMemory()) >> 20;
    }

    public static void main(String[] args) {
        int offers = 200_000;
        long base = usedMb();

        // Leaky: every ride offer hangs a callback on the shift-long session future
        CompletableFuture<Void> sessionClosed = new CompletableFuture<>();
        for (int i = 0; i < offers; i++) {
            CompletableFuture<String> offer = new CompletableFuture<>();
            CompletableFuture<Void> cancelOnLogout = sessionClosed.thenRun(() -> offer.cancel(false));
            offer.complete("accepted " + i);              // the offer finishes in seconds...
            cancelOnLogout.cancel(false);                 // ...and even cancelling the callback doesn't unhook it
        }
        System.out.printf("leaky:  dependents=%,d  retained=%d MB%n", sessionClosed.getNumberOfDependents(), usedMb() - base);

        // Fixed: one callback for the whole session, offers register and unregister in a set
        long base2 = usedMb();
        CompletableFuture<Void> session2 = new CompletableFuture<>();
        Set<CompletableFuture<String>> live = ConcurrentHashMap.newKeySet();
        session2.thenRun(() -> live.forEach(o -> o.cancel(false)));
        for (int i = 0; i < offers; i++) {
            CompletableFuture<String> offer = new CompletableFuture<>();
            live.add(offer);
            offer.whenComplete((v, ex) -> live.remove(offer));
            offer.complete("accepted " + i);
        }
        System.out.printf("fixed:  dependents=%,d  live offers=%d  retained=%d MB%n",
            session2.getNumberOfDependents(), live.size(), usedMb() - base2);
        System.out.println("both shifts still open: " + !(sessionClosed.isDone() || session2.isDone()));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx512m SessionLeak
jcmd <pid> GC.class_histogram | head   # taken at the end of the leaky loop, in a separate run`,
        },
        {
          type: "output",
          text: `leaky:  dependents=200,000  retained=172 MB
fixed:  dependents=1  live offers=0  retained=0 MB
both shifts still open: true

 num     #instances         #bytes  class name (module)
-------------------------------------------------------
   1:        200006       54401336  [J (java.base@21.0.13.0.3)
   2:        401163       38547144  [Ljava.lang.Object; (java.base@21.0.13.0.3)
   3:        201145       28845792  [I (java.base@21.0.13.0.3)
   4:        200005       16000336  [S (java.base@21.0.13.0.3)
   5:        400003        9600072  java.util.concurrent.CompletableFuture (java.base@21.0.13.0.3)
   6:        200001        8000040  java.util.concurrent.CompletableFuture$UniRun (java.base@21.0.13.0.3)
   7:        200000        8000000  java.util.concurrent.CancellationException (java.base@21.0.13.0.3)
   8:        209508        6803600  [B (java.base@21.0.13.0.3)
   9:        209422        5026128  java.lang.String (java.base@21.0.13.0.3)
  10:        200001        3200016  java.util.concurrent.CompletableFuture$AltResult (java.base@21.0.13.0.3)`,
        },
        {
          type: "list",
          items: [
            "**200,000 ride offers left 200,000 `UniRun` nodes on the session future**, about 860 bytes each. Every offer had finished, and I had even cancelled the dependent `cancelOnLogout` future: the node still sat on `sessionClosed`'s stack, because only completing `sessionClosed` drains it.",
            "**Most of the 172 MB was cancellation stack traces**: `[J`, `[Ljava.lang.Object;`, `[I` and `[S` are the backtrace arrays of 200,000 `CancellationException`s. My attempt to \"clean up\" by cancelling made each leaked node five times heavier. With 1,000,000 offers, the same loop ran out of a 512 MB heap.",
            "**The JDK does clean up some cases**: in a separate probe (`LeakProbe` in my scratch files), a million `anyOf(work, neverDone)` calls left 0 dependents on `neverDone`, because `AnyOf.tryFire` calls `cleanStack()` on the other inputs when one wins (it's in its `javap -c`). A million `neverDone.thenRun(...)` followed by completing the dependent left all million. Plain `then...` nodes are only removed when their source completes.",
            "**The fix is structural**: one callback for the whole session, plus a set of live offers that each offer removes itself from when it finishes. One dependent, zero retained.",
          ],
        },
        {
          type: "paragraph",
          text: "Where this pattern shows up: a \"shutdown\" or \"session closed\" future used as a cancellation signal, a config-reload future that never fires, a `CompletableFuture` used as a one-time latch that some code path never completes, and `applyToEither(neverDone.thenApply(...))` written once per request. The giveaway in production is `getNumberOfDependents()` on a long-lived future growing with traffic, or `CompletableFuture$Uni*` classes climbing in the histogram.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `drivers.thenApply(MatchCallbacks::scoreDrivers)` from the production example, where `drivers` is a pending future that the `http-io` thread will complete:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`thenApply` calls `uniApplyStage(null, fn)`.** The executor is `null`, so this will be a synchronous stage.",
            "**`uniApplyStage` reads `drivers.result`: `null`.** The response hasn't arrived. It creates the dependent with `newIncompleteFuture()` and a `UniApply(null, dep, drivers, fn)`.",
            "**`unipush` pushes the node**: `node.next = stack`, then `STACK.compareAndSet(drivers, old, node)`. If the CAS fails (another thread pushed at the same moment), it rereads and retries, unless `result` became non-null meanwhile.",
            "**`unipush` rereads `result`.** Still `null`, so it returns, and `thenApply` returns `dep` to the request code without having run anything.",
            "**30 ms later, `http-io` calls `drivers.complete(etas)`.** `completeValue` CASes `result` from `null` to the array; only one completion can win.",
            "**`complete` calls `postComplete()`** on `http-io`. It pops the `UniApply` with a CAS on `stack` and calls `tryFire(NESTED)`.",
            "**`tryFire` calls `claim()`**: the CAS on the node's tag succeeds, the executor is `null`, so the function runs **right here on `http-io`**: 25 ms of scoring while the I/O thread delivers nothing else.",
            "**`dep` is completed with the score**, `tryFire` returns `dep` (NESTED mode), and `postComplete` continues with `dep`'s own waiters (the latency-recording `thenApply`) in the same loop.",
            "**Only then does `complete()` return** and `http-io` go back to delivering the next response. With `thenApplyAsync(fn, cpu)`, step 7 would instead call `cpu.execute(node)` and return within microseconds.",
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
          title: "CfTour.java",
          code: `import java.util.List;
import java.util.concurrent.*;

public class CfTour {
    public static void main(String[] args) {
        ExecutorService io = Executors.newFixedThreadPool(4, r -> new Thread(r, "tour-io"));

        // 1. start: on my executor; completeAsync fills a future I created myself (Java 9)
        CompletableFuture<String> rider = CompletableFuture.supplyAsync(() -> "Asha", io);
        CompletableFuture<Integer> km = new CompletableFuture<Integer>().completeAsync(() -> 9, io);

        // 2. compose (dependent async step) and combine (independent results)
        CompletableFuture<String> driver = rider.thenCompose(r -> CompletableFuture.supplyAsync(() -> "Ravi for " + r, io));
        CompletableFuture<Long> fare = km.thenApply(k -> 5_000L + k * 1_400L);               // paise
        CompletableFuture<String> offer = driver.thenCombine(fare, (d, p) -> d + ", " + p + " paise");
        System.out.println("1 " + offer.join());

        // 3. errors: recover with another async call (Java 12), or map value-or-error with handle
        CompletableFuture<Integer> surge = CompletableFuture.<Integer>failedFuture(new IllegalStateException("503"))
            .exceptionallyCompose(ex -> CompletableFuture.supplyAsync(() -> 25, io));
        String label = CompletableFuture.<Integer>failedFuture(new IllegalStateException("503"))
            .handle((v, ex) -> ex == null ? "surge " + v : "no surge (" + ex.getMessage() + ")").join();
        System.out.println("2 surge fallback " + surge.join() + "%, " + label);

        // 4. many at once: allOf, then read each future (join no longer blocks)
        List<CompletableFuture<Integer>> etas = List.of(
            CompletableFuture.supplyAsync(() -> 4, io), CompletableFuture.supplyAsync(() -> 7, io), CompletableFuture.supplyAsync(() -> 3, io));
        int best = CompletableFuture.allOf(etas.toArray(new CompletableFuture[0]))
            .thenApply(v -> etas.stream().mapToInt(CompletableFuture::join).min().getAsInt()).join();
        System.out.println("3 best ETA " + best + " min");

        // 5. inspecting without blocking (Java 19), and handing out a read-only view (Java 9)
        System.out.println("4 " + offer.state() + " " + offer.resultNow().length() + " chars, " + surge.state());
        CompletionStage<String> view = offer.minimalCompletionStage();
        System.out.println("5 view is a " + view.getClass().getSimpleName() + ", toCompletableFuture done=" + view.toCompletableFuture().isDone());

        // 6. join vs get: same failure, different wrapper
        CompletableFuture<Integer> failed = CompletableFuture.failedFuture(new IllegalStateException("maps down"));
        try { failed.join(); } catch (CompletionException e) { System.out.println("6 join -> CompletionException(" + e.getCause().getMessage() + ")"); }
        try { failed.get(); } catch (ExecutionException | InterruptedException e) { System.out.println("7 get  -> " + e.getClass().getSimpleName() + "(" + e.getCause().getMessage() + ")"); }
        io.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `1 Ravi for Asha, 17600 paise
2 surge fallback 25%, no surge (503)
3 best ETA 3 min
4 SUCCESS 26 chars, SUCCESS
5 view is a MinimalStage, toCompletableFuture done=true
6 join -> CompletionException(maps down)
7 get  -> ExecutionException(maps down)`,
        },
        {
          type: "paragraph",
          text: "Line 2 shows the wrapping rule from the Errors section: `handle` on a `failedFuture` got the raw `IllegalStateException`, so `ex.getMessage()` is just `503`. Had the failure come from a supplier that threw, the message would have been `java.lang.IllegalStateException: 503`, the `CompletionException`'s message. Line 4 uses `resultNow()` only after `join()` has guaranteed completion.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Turning a callback API into a CompletableFuture",
        },
        {
          type: "paragraph",
          text: "Many SDKs (maps, payments, push notifications) offer callbacks rather than futures. The bridge is one new `CompletableFuture` per call, completed from the callback, and the rest of the code composes as usual:",
        },
        {
          type: "code",
          language: "java",
          title: "CallbackBridge.java",
          code: `import java.util.concurrent.*;

public class CallbackBridge {
    // A third-party maps SDK with a callback API, running callbacks on its own thread
    interface RouteCallback { void onRoute(int km); void onError(Exception e); }

    static class MapsSdk {
        private final ExecutorService sdkThread = Executors.newSingleThreadExecutor(r -> new Thread(r, "maps-sdk"));
        void route(String from, String to, RouteCallback cb) {
            sdkThread.execute(() -> {
                if (to.equals("NOWHERE")) cb.onError(new IllegalArgumentException("unknown place " + to));
                else cb.onRoute(from.length() + to.length());
            });
        }
        void shutdown() { sdkThread.shutdown(); }
    }

    // The bridge: one new CompletableFuture per call, completed from the callback
    static CompletableFuture<Integer> routeKm(MapsSdk sdk, String from, String to) {
        CompletableFuture<Integer> cf = new CompletableFuture<>();
        try {
            sdk.route(from, to, new RouteCallback() {
                public void onRoute(int km) { cf.complete(km); }
                public void onError(Exception e) { cf.completeExceptionally(e); }
            });
        } catch (RuntimeException e) {
            cf.completeExceptionally(e);                      // the SDK threw before calling us back
        }
        return cf;
    }

    public static void main(String[] args) {
        MapsSdk sdk = new MapsSdk();
        ExecutorService pricing = Executors.newFixedThreadPool(2, r -> new Thread(r, "pricing"));

        CompletableFuture<String> quote = routeKm(sdk, "SALT-LAKE", "NEW-TOWN")
            .thenApplyAsync(km -> km + " km, " + (5_000 + km * 1_400) + " paise, priced on "
                + Thread.currentThread().getName(), pricing);        // never price on the SDK's thread
        System.out.println(quote.join());

        routeKm(sdk, "SALT-LAKE", "NOWHERE")
            .exceptionally(ex -> {
                System.out.println("error seen as " + ex.getClass().getSimpleName() + ": " + ex.getMessage());
                return -1;
            }).join();
        sdk.shutdown();
        pricing.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `17 km, 28800 paise, priced on pricing
error seen as IllegalArgumentException: unknown place NOWHERE`,
        },
        {
          type: "list",
          items: [
            "**Both callback paths complete the future**, and the `try`/`catch` covers an SDK that throws synchronously instead of calling `onError`. A bridge that forgets one path leaves a future that never completes, and anything waiting on it waits forever.",
            "**`complete` is called on `maps-sdk`**, so any plain `thenApply` would run on the SDK's thread. `thenApplyAsync(..., pricing)` moves the work off it: the output says `priced on pricing`.",
            "**The error arrived unwrapped** (`IllegalArgumentException`, not `CompletionException`), because `completeExceptionally` stores it as is and `exceptionally` was attached to that same stage. One stage further down it would be wrapped.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: An async loop that doesn't overflow",
        },
        {
          type: "paragraph",
          text: "Offering a ride to drivers one by one until someone accepts is a loop where each step is async. Written recursively with `thenCompose`, it works while the offers are real network calls, and overflows the stack the day the answers come from a cache:",
        },
        {
          type: "code",
          language: "java",
          title: "OfferInOrder.java",
          code: `import java.util.List;
import java.util.concurrent.*;
import java.util.function.Function;
import java.util.stream.IntStream;

public class OfferInOrder {
    static final ExecutorService DISPATCH = Executors.newFixedThreadPool(2, r -> new Thread(r, "dispatch"));

    // Offer the ride to drivers one at a time until someone accepts
    static CompletableFuture<String> offerInOrder(List<String> drivers, int i,
                                                  Function<String, CompletableFuture<Boolean>> offer, boolean hop) {
        if (i == drivers.size()) return CompletableFuture.failedFuture(new IllegalStateException("nobody accepted"));
        String d = drivers.get(i);
        Function<Boolean, CompletableFuture<String>> next = accepted -> accepted
            ? CompletableFuture.completedFuture(d)
            : offerInOrder(drivers, i + 1, offer, hop);
        return hop ? offer.apply(d).thenComposeAsync(next, DISPATCH) : offer.apply(d).thenCompose(next);
    }

    public static void main(String[] args) {
        List<String> drivers = IntStream.range(0, 5_000).mapToObj(i -> "driver-" + i).toList();
        String lastOne = drivers.get(drivers.size() - 1);

        // a real offer: answered later, on another thread
        Function<String, CompletableFuture<Boolean>> remote = d -> CompletableFuture.supplyAsync(() -> d.equals("driver-3"), DISPATCH);
        System.out.println("remote offers:            " + offerInOrder(drivers, 0, remote, false).join());

        // answered instantly from a cache of "busy" flags: every future is already complete
        Function<String, CompletableFuture<Boolean>> cached = d -> CompletableFuture.completedFuture(d.equals(lastOne));
        try {
            System.out.println("cached, thenCompose:      " + offerInOrder(drivers, 0, cached, false).join());
        } catch (CompletionException e) {
            System.out.println("cached, thenCompose:      " + e.getCause().getClass().getSimpleName());
        }
        System.out.println("cached, thenComposeAsync: " + offerInOrder(drivers, 0, cached, true).join());
        DISPATCH.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `remote offers:            driver-3
cached, thenCompose:      StackOverflowError
cached, thenComposeAsync: driver-4999`,
        },
        {
          type: "list",
          items: [
            "**With remote offers, each `thenCompose` function ran later, on a fresh `dispatch` thread stack**, so the recursion never deepened.",
            "**With cached answers, every future was already complete**, so `thenCompose` called the next step immediately on the same stack, 5,000 levels deep, and the chain failed with `StackOverflowError` (wrapped, as `DeepChain` showed).",
            "**`thenComposeAsync(next, DISPATCH)`** forces each step through the executor, which resets the stack each time. 5,000 cached refusals, and `driver-4999` accepted. The cost is one hop per step, which for an offer loop is irrelevant.",
          ],
        },
        {
          type: "heading",
          text: "Example 3: allSettled, every result and every error",
        },
        {
          type: "paragraph",
          text: "`allOf` either succeeds or throws the first failure it found. For a surge dashboard across zones I want every outcome, so I convert each future into a value that can't fail:",
        },
        {
          type: "code",
          language: "java",
          title: "AllSettled.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.stream.Collectors;

public class AllSettled {
    sealed interface Settled<T> permits Ok, Failed { }
    record Ok<T>(T value) implements Settled<T> { }
    record Failed<T>(Throwable error) implements Settled<T> { }

    static Throwable unwrap(Throwable ex) {
        return ex instanceof CompletionException && ex.getCause() != null ? ex.getCause() : ex;
    }

    // Wait for every future, never throw, keep each outcome
    static <T> CompletableFuture<List<Settled<T>>> allSettled(List<CompletableFuture<T>> futures) {
        List<CompletableFuture<Settled<T>>> settled = futures.stream()
            .map(f -> f.handle((v, ex) -> ex == null ? (Settled<T>) new Ok<>(v) : new Failed<T>(unwrap(ex))))
            .toList();
        return CompletableFuture.allOf(settled.toArray(new CompletableFuture[0]))
            .thenApply(v -> settled.stream().map(CompletableFuture::join).toList());
    }

    public static void main(String[] args) {
        ExecutorService io = Executors.newFixedThreadPool(4);
        Map<String, Integer> zones = Map.of("SALT-LAKE", 40, "NEW-TOWN", -1, "PARK-STREET", 10, "HOWRAH", -1);
        List<String> names = zones.keySet().stream().sorted().toList();
        List<CompletableFuture<Integer>> calls = names.stream()
            .map(z -> CompletableFuture.supplyAsync(() -> {
                if (zones.get(z) < 0) throw new IllegalStateException(z + " surge 503");
                return zones.get(z);
            }, io))
            .toList();

        List<Settled<Integer>> results = allSettled(calls).join();
        for (int i = 0; i < names.size(); i++) System.out.println(names.get(i) + " -> " + results.get(i));
        Map<Boolean, Long> split = results.stream().collect(Collectors.partitioningBy(r -> r instanceof Ok, Collectors.counting()));
        System.out.println("ok " + split.get(true) + ", failed " + split.get(false));
        io.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `HOWRAH -> Failed[error=java.lang.IllegalStateException: HOWRAH surge 503]
NEW-TOWN -> Failed[error=java.lang.IllegalStateException: NEW-TOWN surge 503]
PARK-STREET -> Ok[value=10]
SALT-LAKE -> Ok[value=40]
ok 2, failed 2`,
        },
        {
          type: "paragraph",
          text: "`handle` turns each outcome into a `Settled` value, so the combined `allOf` can't fail, and the `join` calls inside `thenApply` never block or throw. The unwrap step matters: without it, every `Failed` would hold a `CompletionException` whose message repeats the class name of the cause.",
        },
      ],
    },
    {
      title: "When to Use Which Method",
      blocks: [
        {
          type: "table",
          headers: ["Need", "Use", "Avoid"],
          rows: [
            ["Cheap, non-blocking transform of a result", "`thenApply` (runs inline, ~0.3 µs)", "`thenApplyAsync` by default (~29 µs hop)"],
            ["Slow, blocking or CPU-heavy step", "`thenApplyAsync(fn, myExecutor)`", "Plain `thenApply`, which may run on an I/O or timer thread"],
            ["Next step is itself async", "`thenCompose` (or `thenComposeAsync` in loops)", "`thenApply`, which completes when the inner call has only started"],
            ["Two independent results", "`thenCombine`", "`join` one, then start the other"],
            ["Wait for all, fail fast", "`allOf` plus `whenComplete` per input that fails the result", "Plain `allOf`, which waits for the slowest even after a failure"],
            ["Every outcome, never throw", "`handle` per future, then `allOf` (allSettled)", "`allOf` plus `try`/`catch` per `join`"],
            ["Fallback that is itself async", "`exceptionallyCompose` (Java 12)", "`handle` returning a future, then `thenCompose(x -> x)`"],
            ["Wait from a stoppable worker", "`get(timeout, unit)`", "`join()`, which ignores interrupts"],
            ["Read a finished future", "`state()`, `resultNow()`, `exceptionNow()` (Java 19)", "`isDone()` plus `get()` in a `try`"],
            ["Hand a future to other code", "`minimalCompletionStage()` or `copy()`", "Returning the internal future"],
            ["Wrap a callback API", "`new CompletableFuture<>()` completed from both callbacks", "Blocking on a latch inside `supplyAsync`"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Heavy work in a plain thenApply",
        },
        {
          type: "paragraph",
          text: "It runs on whichever thread completes the source: an HTTP client's event loop, a Kafka consumer, the timeout thread. The production section measured p50 going from 55 ms to 354 ms for every request, because 25 ms of scoring ran on the single I/O thread.",
        },
        {
          type: "heading",
          text: "Checking ex instanceof SomeException without unwrapping",
        },
        {
          type: "code",
          language: "java",
          code: `// Works on the stage that failed, silently false one stage later
.exceptionally(ex -> ex instanceof TimeoutException ? cached : rethrow(ex))

// Unwrap first
.exceptionally(ex -> unwrap(ex) instanceof TimeoutException ? cached : rethrow(ex))`,
        },
        {
          type: "heading",
          text: "Assuming allOf fails fast",
        },
        {
          type: "paragraph",
          text: "It waits for every input. My test failed at 600 ms for a failure known at 50 ms. Add a `whenComplete` per input if the request should fail early.",
        },
        {
          type: "heading",
          text: "anyOf on an empty list",
        },
        {
          type: "paragraph",
          text: "`CompletableFuture.anyOf()` never completes. A request that picks \"the first driver to respond\" from an empty list of nearby drivers hangs until its timeout, or forever without one.",
        },
        {
          type: "heading",
          text: "Expecting cancel to reach upstream or interrupt anything",
        },
        {
          type: "paragraph",
          text: "Cancelling a dependent leaves its source running; cancelling a source never interrupts the thread running its supplier. `CancelDirection` showed the route call finishing with `interrupted=false` after `cancel(true)`.",
        },
        {
          type: "heading",
          text: "Blocking with join where the thread must stay stoppable",
        },
        {
          type: "paragraph",
          text: "`join` ignores interrupts (`InterruptWait`), so `shutdownNow()` can't stop a worker blocked in `join` on a future that never completes. Use `get` with a timeout, or compose instead of blocking.",
        },
        {
          type: "heading",
          text: "Attaching per-request callbacks to a long-lived future",
        },
        {
          type: "paragraph",
          text: "Each node stays until the source completes. `SessionLeak` retained 172 MB for 200,000 offers. Keep one callback on the long-lived future, and track per-request state in a collection that requests remove themselves from.",
        },
        {
          type: "heading",
          text: "Recursion with thenCompose on futures that may already be complete",
        },
        {
          type: "paragraph",
          text: "It recurses on the caller's stack. Use `thenComposeAsync` for loops whose steps may complete synchronously (caches, retries that fail fast).",
        },
        {
          type: "heading",
          text: "Not passing an executor, and testing only on a laptop",
        },
        {
          type: "paragraph",
          text: "The default executor is the 7-thread common pool on my machine, and a thread per task on a 1 or 2-CPU container, with non-daemon threads. The same code has different concurrency, memory use and shutdown behaviour depending on the machine.",
        },
        {
          type: "heading",
          text: "A whenComplete that can throw",
        },
        {
          type: "paragraph",
          text: "On a successful stage, an exception from a `whenComplete` logging callback replaces the value with a failure (case 10 in `Wrapping`). Wrap logging callbacks in their own `try`/`catch`.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Pass an executor to every `supplyAsync`/`runAsync`, and to every `*Async` stage that does real work. Treat the no-executor overloads as a code-review flag.",
            "Keep non-async callbacks tiny and non-blocking; assume they run on a thread you don't own.",
            "Write one `unwrap(Throwable)` helper and use it everywhere an exception is inspected, logged or mapped to an HTTP status.",
            "Return `minimalCompletionStage()` or `copy()` from public APIs; never hand out a future that callers can `complete` or `obtrude`.",
            "Bridge callback APIs with a future completed on **every** path: success, error, and synchronous throw.",
            "Use `thenComposeAsync` (or an explicit loop on an executor) for async loops whose steps can complete immediately.",
            "Never attach per-request callbacks to a long-lived future; watch `getNumberOfDependents()` on any future that lives longer than a request.",
            "Prefer composition over blocking. Where blocking is unavoidable, use `get(timeout, unit)`, not `join()`, and never block inside the common pool (the next lesson measures why).",
            "Put `whenComplete` metrics where they measure what you mean: before recovery to count failures, after it to count served responses.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Two questions: what does a stage cost, and what does a hop to an executor cost? Best of 7 runs of 200,000 stages, with bytes allocated on the calling thread:",
        },
        {
          type: "code",
          language: "java",
          title: "StageCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.concurrent.*;
import java.util.function.IntSupplier;

public class StageCost {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static final int N = 200_000;

    static void report(String label, IntSupplier work) {
        long best = Long.MAX_VALUE, bytes = 0;
        for (int r = 0; r < 7; r++) {
            long a = MX.getCurrentThreadAllocatedBytes();
            long t = System.nanoTime();
            work.getAsInt();
            best = Math.min(best, System.nanoTime() - t);
            bytes = MX.getCurrentThreadAllocatedBytes() - a;
        }
        System.out.printf("%-44s %7.0f ns/stage  %4d bytes/stage (caller thread)%n", label, (double) best / N, bytes / N);
    }

    public static void main(String[] args) {
        ExecutorService one = Executors.newSingleThreadExecutor();

        report("plain loop, x + 1", () -> { int x = 0; for (int i = 0; i < N; i++) x = x + 1; return x; });
        report("thenApply on a completed future", () -> {
            CompletableFuture<Integer> f = CompletableFuture.completedFuture(0);
            for (int i = 0; i < N; i++) f = f.thenApply(x -> x + 1);
            return f.join();
        });
        report("thenApply chain built first, then complete()", () -> {
            CompletableFuture<Integer> start = new CompletableFuture<>();
            CompletableFuture<Integer> f = start;
            for (int i = 0; i < N; i++) f = f.thenApply(x -> x + 1);
            start.complete(0);
            return f.join();
        });
        report("thenApplyAsync chain, one executor thread", () -> {
            CompletableFuture<Integer> f = CompletableFuture.completedFuture(0);
            for (int i = 0; i < N; i++) f = f.thenApplyAsync(x -> x + 1, one);
            return f.join();
        });
        report("thenApplyAsync chain, common pool", () -> {
            CompletableFuture<Integer> f = CompletableFuture.completedFuture(0);
            for (int i = 0; i < N; i++) f = f.thenApplyAsync(x -> x + 1);
            return f.join();
        });
        one.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `plain loop, x + 1                                  0 ns/stage     0 bytes/stage (caller thread)
thenApply on a completed future                   16 ns/stage    39 bytes/stage (caller thread)
thenApply chain built first, then complete()      78 ns/stage    79 bytes/stage (caller thread)
thenApplyAsync chain, one executor thread        254 ns/stage    64 bytes/stage (caller thread)
thenApplyAsync chain, common pool                190 ns/stage    64 bytes/stage (caller thread)`,
        },
        {
          type: "list",
          items: [
            "**A stage on a completed future costs about 16 ns and 39 bytes**: one 24-byte future plus a boxed `Integer` (16 bytes); no node is pushed because the result is already there.",
            "**A pending stage costs 61 to 78 ns and 79 bytes**: the future, a 40-byte `UniApply` node, the `Integer`, plus the CAS push and later the pop in `postComplete`.",
            "**A chain of async stages cost 190 to 316 ns per stage** across my three runs, with the worker thread busy the whole time (so no wake-up per stage). The caller allocated 64 bytes per stage; the `Integer` was allocated on the worker.",
            "The empty loop shows 0 ns because the JIT folded it; it's there as a sanity check, not a comparison.",
          ],
        },
        {
          type: "paragraph",
          text: "A hop when the target thread is idle is a different story, because the thread has to be woken:",
        },
        {
          type: "code",
          language: "java",
          title: "HopLatency.java",
          code: `import java.util.Arrays;
import java.util.concurrent.*;

public class HopLatency {
    public static void main(String[] args) {
        ExecutorService one = Executors.newSingleThreadExecutor();
        ExecutorService[] targets = {null, one, ForkJoinPool.commonPool()};
        String[] names = {"thenApply (no hop)", "thenApplyAsync(fn, single thread)", "thenApplyAsync(fn) common pool"};
        for (int round = 0; round < 2; round++) {
            for (int k = 0; k < 3; k++) {
                long[] lat = new long[20_000];
                for (int i = 0; i < lat.length; i++) {
                    CompletableFuture<Integer> done = CompletableFuture.completedFuture(i);
                    long t = System.nanoTime();
                    int v = (targets[k] == null ? done.thenApply(x -> x + 1) : done.thenApplyAsync(x -> x + 1, targets[k])).join();
                    lat[i] = System.nanoTime() - t;
                    if (v != i + 1) throw new AssertionError();
                    if (i % 100 == 0) LockSupportPause.pause();          // let the worker go idle sometimes
                }
                Arrays.sort(lat);
                if (round == 1) System.out.printf("%-36s p50 %6.1f us   p99 %6.1f us%n", names[k], lat[lat.length / 2] / 1e3, lat[lat.length * 99 / 100] / 1e3);
            }
        }
        one.shutdown();
    }
}
class LockSupportPause { static void pause() { java.util.concurrent.locks.LockSupport.parkNanos(200_000); } }`,
        },
        {
          type: "output",
          text: `thenApply (no hop)                   p50    0.3 us   p99    5.0 us
thenApplyAsync(fn, single thread)    p50   29.0 us   p99   71.7 us
thenApplyAsync(fn) common pool       p50   28.6 us   p99   60.5 us`,
        },
        {
          type: "paragraph",
          text: "About 29 µs at p50 for a hop to a parked thread, in all three runs, against 0.3 µs inline: roughly 100 times. The p99 varied from 60 to 254 µs between runs, which is the scheduler and the other benchmarks on this machine. These are `System.nanoTime` measurements on one loaded 8-core machine, not JMH, so I trust the ratios and the orders of magnitude, not the exact numbers. The conclusion: hops are cheap next to any I/O call or a 25 ms computation, and expensive next to a field access. Put the `Async` where the work is, not on every stage.",
        },
      ],
    },
    {
      title: "CompletableFuture in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-matching service in Kolkata asks a geo service for nearby drivers through an async HTTP client, then scores the candidates (ETA model, acceptance probability, fare) before offering the ride. The HTTP client, like many Netty-based clients, completes response futures on a small number of event-loop (I/O) threads. After a release that added a better (and heavier) scoring model, p50 matching latency in SALT-LAKE went from about 55 ms to over 350 ms, CPU was low, and the geo service's own latency hadn't changed. A thread dump showed the I/O thread inside `postComplete`, running `scoreDrivers`.",
        },
        {
          type: "paragraph",
          text: "I rebuilt it with one `http-io` thread standing in for the client's event loop, 30 ms geo responses, a 25 ms CPU-bound scorer, and a request every 10 ms:",
        },
        {
          type: "code",
          language: "java",
          title: "MatchCallbacks.java",
          code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.*;

public class MatchCallbacks {
    // Stands in for an async HTTP client: ONE selector thread completes every response future
    static final ScheduledExecutorService HTTP_IO =
        Executors.newSingleThreadScheduledExecutor(r -> new Thread(r, "http-io"));

    static CompletableFuture<int[]> fetchNearbyDrivers(String zone) {
        CompletableFuture<int[]> response = new CompletableFuture<>();
        HTTP_IO.schedule(() -> response.complete(new int[] {120, 340, 90, 560}), 30, TimeUnit.MILLISECONDS);
        return response;
    }

    static String scoreDrivers(int[] etasInSeconds) {        // ~25 ms of CPU: ranking, fare, ETA model
        long end = System.nanoTime() + 25_000_000;
        double x = 0;
        while (System.nanoTime() < end) x += Math.sqrt(x + 1);
        return "best ETA " + Arrays.stream(etasInSeconds).min().getAsInt() + " s" + (x < 0 ? "!" : "");
    }

    static void run(String label, boolean hop, ExecutorService cpu) throws Exception {
        List<CompletableFuture<Long>> requests = new ArrayList<>();
        for (int i = 0; i < 40; i++) {
            long start = System.nanoTime();
            CompletableFuture<int[]> drivers = fetchNearbyDrivers("SALT-LAKE");
            CompletableFuture<String> best = hop
                ? drivers.thenApplyAsync(MatchCallbacks::scoreDrivers, cpu)
                : drivers.thenApply(MatchCallbacks::scoreDrivers);
            requests.add(best.thenApply(s -> (System.nanoTime() - start) / 1_000_000));
            Thread.sleep(10);                                     // a request every 10 ms
        }
        long[] ms = requests.stream().mapToLong(CompletableFuture::join).sorted().toArray();
        System.out.printf("%-40s p50 %4d ms   p90 %4d ms   max %4d ms%n", label, ms[ms.length / 2], ms[ms.length * 9 / 10], ms[ms.length - 1]);
    }

    public static void main(String[] args) throws Exception {
        ExecutorService cpu = Executors.newFixedThreadPool(4, r -> new Thread(r, "match-cpu"));
        run("warm-up", true, cpu);
        run("thenApply (scoring on http-io)", false, cpu);
        run("thenApplyAsync(score, match-cpu x4)", true, cpu);
        HTTP_IO.shutdown();
        cpu.shutdown();
    }
}`,
        },
        {
          type: "output",
          text: `warm-up                                  p50   55 ms   p90   56 ms   max   81 ms
thenApply (scoring on http-io)           p50  354 ms   p90  590 ms   max  635 ms
thenApplyAsync(score, match-cpu x4)      p50   55 ms   p90   55 ms   max   55 ms`,
        },
        {
          type: "list",
          items: [
            "**Before**: the callback was attached while the response was pending, so `http-io` ran it inside `complete()`. One thread did 25 ms of scoring per request, at one request every 10 ms: it could only keep up with 40 a second, so responses queued behind each other. p50 354 ms, max 635 ms, stable across three runs (351 to 354 ms p50).",
            "**After**: one word changed, `thenApplyAsync(MatchCallbacks::scoreDrivers, cpu)` with 4 named `match-cpu` threads. `http-io` only hands the node to the pool and returns to delivering responses. p50 and p90 55 ms (30 ms network plus 25 ms scoring), max 55 to 56 ms.",
            "**Why it was invisible in testing**: with one request at a time, both versions take 55 ms. The plain `thenApply` was only wrong under concurrency, and the problem was a thread, not CPU or the network.",
            "**How it was found**: CPU was low and the dependency was fast, which pointed at queueing. The thread dump showed `http-io` in `CompletableFuture.postComplete` → `UniApply.tryFire` → `scoreDrivers`: the same frames as `DumpPostComplete`.",
          ],
        },
        {
          type: "paragraph",
          text: "What I took from it:",
        },
        {
          type: "list",
          items: [
            "Know which thread completes every future you depend on. For HTTP clients, database drivers and message consumers it's usually a small, shared, latency-critical pool.",
            "Any callback that does more than a field access goes through `*Async` with a named executor sized for that work (CPU-bound here, so about the core count).",
            "Name pools so a thread dump answers \"who is running this?\" immediately: `match-cpu`, `http-io`, not `pool-3-thread-1`.",
            "Test async code under concurrent load, not one request at a time; thread confusion only shows up as queueing.",
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
              question: "What's the difference between thenApply and thenApplyAsync?",
              answer:
                "Only the thread that runs the function. `thenApply` runs it on the thread that completes the previous stage, or on the caller if that stage is already done. `thenApplyAsync(fn)` always submits it to the default executor (the common pool), and `thenApplyAsync(fn, ex)` to `ex`. In bytecode, all three call the same `uniApplyStage` with a `null`, default or given executor. In my tests the inline version cost about 0.3 µs and a hop to an idle thread about 29 µs at p50.",
            },
            {
              question: "Which thread pool does CompletableFuture use by default, and how big is it?",
              answer:
                "`ForkJoinPool.commonPool()`, with parallelism of CPU count minus one: 7 on my 8-core machine. It can be changed with `-Djava.util.concurrent.ForkJoinPool.common.parallelism`. If the parallelism is below 2 (one or two CPUs), `CompletableFuture` doesn't use the common pool at all and starts a new non-daemon thread per task (`ThreadPerTaskExecutor`); I saw twelve tasks create twelve `Thread-N` threads with `-XX:ActiveProcessorCount=2`.",
            },
            {
              question: "What's the difference between thenCompose and thenApply when the function returns a future?",
              answer:
                "`thenApply` gives a `CompletableFuture<CompletableFuture<T>>`, and the outer future completes as soon as the inner call has been **started**. In my test the outer was done while the inner wasn't. `thenCompose` flattens it and completes only when the inner future completes. Use `thenCompose` whenever the function returns a stage.",
            },
            {
              question: "What's the difference between join() and get()?",
              answer:
                "Both block. `get()` throws checked `ExecutionException` (with the cause unwrapped from `CompletionException`) and `InterruptedException`. `join()` throws the unchecked `CompletionException` and **ignores interrupts**: in my test `get` threw `InterruptedException` after 100 ms, while `join` kept waiting until the value arrived and only restored the interrupt flag. Both throw `CancellationException` directly for a cancelled future.",
            },
            {
              question: "What do exceptionally, handle and whenComplete each do with a failure?",
              answer:
                "`exceptionally` runs only on failure and returns a replacement value. `handle` runs always, sees value or exception, and returns a new value of any type. `whenComplete` runs always but passes the original outcome through; if it throws, the original failure wins (with the new exception added as suppressed), but on a successful stage its exception replaces the value.",
            },
            {
              question: "Does cancel(true) stop the running task?",
              answer:
                "No. It completes the future with a `CancellationException`; `mayInterruptIfRunning` has no effect because a `CompletableFuture` has no reference to the thread running its supplier. It also doesn't travel upstream: cancelling a dependent stage left its source running to completion in my test, and the stages after it failed with `CompletionException(CancellationException)` without being `isCancelled()`.",
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
              question: "When is an exception wrapped in CompletionException, and when isn't it?",
              answer:
                "If a supplier or function **throws** `e`, the stage stores `CompletionException(e)`. If `e` arrives through `completeExceptionally(e)` or `failedFuture(e)`, callbacks on that same stage see `e` unwrapped, and stages further down see `CompletionException(e)`. A thrown `CompletionException` isn't double-wrapped. Cancellation is `CancellationException` on the cancelled stage and `CompletionException(CancellationException)` below it. So inspection code must unwrap first.",
            },
            {
              question: "Does allOf fail as soon as one input fails?",
              answer:
                "No. It completes only when every input is done, then reports a failure if any failed. My test failed at 600 ms for a failure that happened at 50 ms. For fail-fast, attach `whenComplete` to each input that completes the combined future exceptionally; that version failed at 50 ms. Note also that `allOf()` with no arguments is complete immediately and `anyOf()` with none never completes.",
            },
            {
              question: "Which thread runs the function passed to thenCombine?",
              answer:
                "The thread that completes the second of the two inputs (or the caller, if both are done when `thenCombine` is called). `thenCombine` puts a `BiApply` on the first input's stack and a `CoCompletion` pointing to it on the second's; whichever completion finds both results present runs it. In my test, fare finished first on `pricing`, distance second on `maps-io`, and the function ran on `maps-io`.",
            },
            {
              question: "What is exceptionallyCompose and when do you need it?",
              answer:
                "A Java 12 method: on failure, it calls a function that returns another `CompletionStage`, and flattens it, like `thenCompose` for the error path. It's for fallbacks that are themselves async, such as reading the last known surge from a cache when the live service fails. Before Java 12 it took `handle` returning a future followed by `thenCompose(x -> x)`. There are also `exceptionallyAsync` and `exceptionallyComposeAsync` to choose the thread.",
            },
            {
              question: "Why can join() inside a ForkJoinPool task behave differently from join() on a normal thread?",
              answer:
                "Blocking `join`/`get` push a `Signaller` node, which implements `ForkJoinPool.ManagedBlocker`. On a fork-join worker, `managedBlock` lets the pool start a compensating spare thread so its parallelism doesn't drop. That keeps the pool working but means the thread count can grow far beyond the parallelism, up to a limit, after which `join` throws `RejectedExecutionException`. The next lesson measures both.",
            },
            {
              question: "What do obtrudeValue and obtrudeException do, and why are they dangerous?",
              answer:
                "They overwrite `result` without the CAS, even on a completed future. Callbacks that already ran keep the old value; new ones see the new value. In my test a receipt said 18,000 paise while the fare said 19,500. They exist for error recovery; in practice I keep them out of production code and hand out `minimalCompletionStage()` or `copy()` so other code can't call them on my futures.",
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
              question: "Describe the internal structure of a CompletableFuture.",
              answer:
                "Two volatile fields: `result` (`null` until done, then the value, or an `AltResult` holding `null` or the exception) and `stack`, a Treiber stack of `Completion` nodes, one per waiting callback, each with a `next` pointer. All updates are CAS through the `RESULT`, `STACK` and `NEXT` `VarHandle`s. Nodes are typed per operation: `UniApply`, `UniAccept`, `UniCompose`, `BiApply`, `OrApply`, `Signaller` and so on, 34 nested classes in all. A `Completion` extends `ForkJoinTask<Void>` and implements `Runnable`, so an async node is passed to `executor.execute` itself.",
            },
            {
              question: "How does postComplete avoid a StackOverflowError on long chains?",
              answer:
                "It fires nodes in `NESTED` mode. A nested `tryFire` runs the function and completes its dependent, but instead of draining the dependent's stack recursively it returns the dependent, and `postComplete` adds that future's waiters to its own loop. My million-stage `thenApply` chain completed from one `complete(0)` call with no deep stack, and a thread dump showed `UniAccept.tryFire` called directly from `postComplete` with no `UniApply` frame in between. Recursion I write myself (a `thenCompose` that calls itself on completed futures) has no such protection and overflowed at 2,000 levels.",
            },
            {
              question: "Explain the race between attaching a callback and completing the future.",
              answer:
                "`uniApplyStage` checks `result`; if `null`, it pushes a node with `unipush`, which then checks `result` again. If the future completed in between, the completer may already have drained the stack, so the attacher fires the node itself with `tryFire(SYNC)`. Both may try, so each node has a one-shot `claim()` (a CAS on the `ForkJoinTask` tag). The outcome decides the thread: in 10,000 attempts per run, `main` ran the callback anywhere from 26 to 5,445 times.",
            },
            {
              question: "What exactly is the ThreadPerTaskExecutor fallback, and what changes when it's active?",
              answer:
                "In its static initialiser, `CompletableFuture` sets `USE_COMMON_POOL` to `ForkJoinPool.getCommonPoolParallelism() > 1`; if false, `ASYNC_POOL` is a `ThreadPerTaskExecutor` that does `new Thread(r).start()` per task. `screenExecutor` even replaces an explicitly passed `commonPool()` with it. Consequences I measured: unbounded thread creation (12 tasks, 12 threads), the common pool never starts, and the threads are non-daemon, so fire-and-forget work that's lost on an 8-core box keeps a 2-CPU JVM alive until it finishes.",
            },
            {
              question: "Why can a long-lived future cause a memory leak, and which cases does the JDK clean up?",
              answer:
                "Each `then...` node stays on the source's stack until the source completes, holding the lambda and the dependent future, even if the dependent was completed or cancelled. My session future accumulated 200,000 `UniRun` nodes and 172 MB (mostly `CancellationException` backtraces). The JDK does clean some cases: `AnyOf` nodes call `cleanStack()` on the other inputs when one wins, and a million `anyOf(done, never)` calls left 0 dependents. Plain `then...` nodes aren't removed. The fix is one callback on the long-lived future and per-request state elsewhere.",
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
              question: "After adding a heavier scoring step in a thenApply, matching latency went from 55 ms to 350 ms p50, CPU is low and the downstream geo service is as fast as before. What do you check?",
              answer:
                "Which thread runs the new step. Low CPU with high latency means queueing; a thread dump during load will show the async HTTP client's I/O thread inside `CompletableFuture.postComplete` → `UniApply.tryFire` → the scorer, because the callback was attached before the response arrived. My rebuild with one I/O thread, 25 ms scoring and a request every 10 ms showed p50 354 ms. Changing to `thenApplyAsync(score, cpuPool)` with 4 named threads brought it back to 55 ms. Then I'd audit other plain callbacks on futures completed by I/O threads.",
            },
            {
              question: "A batch job exits early on developer laptops and some notifications are never sent, but in the 2-CPU production container the same job sends everything and sometimes takes minutes to shut down. Why?",
              answer:
                "It uses `runAsync` without an executor. On 8 cores that's the common pool, whose daemon threads don't keep the JVM alive, so work in flight when `main` returns is lost. On 2 CPUs the common pool's parallelism is 1, so `CompletableFuture` uses `ThreadPerTaskExecutor`: a new non-daemon thread per task, and the JVM waits for all of them. My `DaemonOrNot` printed nothing on 8 cores and `SMS sent ... daemon=false` with `-XX:ActiveProcessorCount=2`. Fix: an explicit executor, `join` on the combined future before exit, and a proper shutdown.",
            },
            {
              question: "Heap usage on the driver-session service grows through each driver's shift and drops when they log out. The histogram shows CompletableFuture$UniRun and CancellationException growing. What's happening?",
              answer:
                "Per-offer callbacks are being attached to a shift-long future, like `sessionClosed.thenRun(() -> offer.cancel(false))`. Each node stays on `sessionClosed`'s stack until logout, and cancelling the dependent doesn't remove it. My rebuild kept 200,000 nodes and 172 MB, most of it the backtraces of the `CancellationException`s created by the attempted cleanup. Confirm with `getNumberOfDependents()` on the session future. Fix: one callback per session plus a set of live offers that remove themselves in `whenComplete`; that version kept 1 dependent and 0 MB.",
            },
            {
              question: "An error-mapping layer returns 500 for timeouts that should be 504, even though the code checks ex instanceof TimeoutException. Why?",
              answer:
                "The check only works on the stage `orTimeout` completed, where the `TimeoutException` is stored unwrapped. Any stage after it (a `thenApply`, a `thenCombine`) sees `CompletionException(TimeoutException)`, so `instanceof` is false. The fix is a single `unwrap` helper used before every check; I'd also add a test that triggers a timeout through the full chain, not just on the first stage.",
            },
            {
              question: "A retry helper written with recursive thenCompose works in staging, but in production it sometimes fails with a CompletionException caused by StackOverflowError. What changed?",
              answer:
                "In production some attempts complete synchronously, from a cache or a circuit breaker that fails fast, so each `thenCompose` calls the next attempt immediately on the same stack. In staging every attempt was a real network call that completed later on another thread, which reset the stack each time. My `DeepChain` overflowed at 2,000 levels with the default stack and `OfferInOrder` overflowed with 5,000 cached answers. Fix: `thenComposeAsync` with an executor (or delayed retries via `delayedExecutor`), which ran all 5,000 steps fine.",
            },
            {
              question: "During a graceful shutdown, shutdownNow() returns but awaitTermination times out; a thread dump shows workers WAITING in CompletableFuture.join. What's wrong and what do you change?",
              answer:
                "`join` ignores interrupts, so the interrupts sent by `shutdownNow()` don't release workers waiting on futures that will never complete (for example, a downstream call whose own executor already shut down). My `InterruptWait` test showed `join` waiting on past the interrupt until the value arrived. Change the blocking points to `get(timeout, unit)`, which throws `InterruptedException`, or remove the blocking by composing; and make sure every future has a completion path during shutdown (complete or fail pending ones explicitly).",
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
            "Run `StackPeek` and add `fare.thenCompose(p -> CompletableFuture.completedFuture(p))` before the other callbacks. Which node type appears, and where in the stack?",
            "Run `CallbackThreads` three times and compare the last line. Then add `Thread.sleep(1)` inside the supplier of the race loop and run it again.",
            "Run `CommonPoolCheck` with `-XX:ActiveProcessorCount=1` and with `-Djava.util.concurrent.ForkJoinPool.common.parallelism=2`.",
            "In `Wrapping`, replace `completed.thenApply(x -> x + 1)` with `completed.thenApplyAsync(x -> x + 1)`. Does case 3 change?",
            "Run `DeepChain` with `-Xss8m`.",
            "In `InterruptWait`, change `driver.join()` to `driver.get(1, TimeUnit.SECONDS)` (adding the imports and catches) and interrupt it after 100 ms.",
            "In `MatchCallbacks`, make the request interval 30 ms instead of 10 ms and compare the two versions again.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 shows a `UniCompose` at the bottom of the stack (it was attached first, so it's the oldest). Step 2 shows `main` winning anywhere from a few dozen to several thousand times; with the 1 ms sleep, `maps-io` almost never finishes first, so the callback runs on `maps-io` nearly every time (I got `{maps-io=10000}`). Step 3: parallelism 1 selects `ThreadPerTaskExecutor` (12 threads, `Thread-N`), parallelism 2 keeps the common pool, with the twelve blocking tasks running on 2 threads. Step 4: case 3 still prints `CompletionException(IllegalStateException)`, because the async stage wraps the source's failure the same way. Step 5 prints 10000 for the second depth and still fails at 100,000. Step 6 throws `InterruptedException` after about 100 ms instead of waiting. Step 7: with a request every 30 ms the single I/O thread keeps up (25 ms of scoring per 30 ms), so both versions report about 55 ms; the bug only appears when the arrival rate exceeds what one thread can score.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `INSIDE       volatile result: null | value | AltResult(null or ex)
             volatile stack: Treiber stack of Completion nodes (CAS push)
             34 nested classes: UniApply, BiApply, Signaller, Delayer...
             Completion extends ForkJoinTask, implements Runnable

COMPLETE     CAS result (first wins) -> postComplete() on THAT thread
             NESTED mode: walk dependents in a loop, no recursion
             1M-stage chain fine; recursive thenCompose overflowed at 2,000

THREADS      thenX         completer's thread, or caller if already done (a race)
             thenXAsync    defaultExecutor() = common pool (cores - 1 = 7)
                           parallelism < 2 -> ThreadPerTaskExecutor, non-daemon
             thenCombine   thread completing the SECOND input
             hop to idle thread ~29 us p50; inline ~0.3 us

COMPOSE      thenApply(async fn) -> done when inner only STARTED
             thenCompose -> next stage runs on the inner future's thread
             allOf waits for ALL (600 ms vs 50 ms); anyOf() never completes

ERRORS       thrown -> CompletionException(e); completeExceptionally(e) -> e
             one stage down -> always wrapped: unwrap before instanceof
             exceptionallyCompose (12), state/resultNow/exceptionNow (19)

WAIT/CANCEL  join ignores interrupts; get throws InterruptedException
             cancel: never upstream, never interrupts, dependents not isCancelled
             obtrudeValue rewrites result; hand out minimalCompletionStage/copy

LEAKS        nodes leave only when the SOURCE completes
             per-request thenRun on a shift-long future: 200k nodes, 172 MB`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A `CompletableFuture` is a write-once result plus a lock-free stack of callbacks, and whoever completes it runs every non-async callback. Almost every surprise in this lesson (slow I/O threads, races, leaks, overflows) follows from that one design.",
            "In practice: pass an executor everywhere, keep plain callbacks trivial, unwrap exceptions before inspecting them, never block with `join` where interrupts matter, and never hang per-request callbacks on a long-lived future.",
            "Next comes Timeouts, Fallbacks, Fan-out and Choosing Executors: `orTimeout` and `completeOnTimeout` and the single JVM-wide thread that fires them, fallbacks and partial results for a fare/ETA/surge fan-out, why blocking calls starve the common pool, bulkheads per dependency, cancellation that really stops work, and retries with `delayedExecutor`.",
          ],
        },
      ],
    },
  ],
};
