import type { Lesson } from "../types";

export const methodReferences: Lesson = {
  slug: "method-references",
  date: "2026-10-29",
  title: "Method References",
  description:
    "The `::` shorthand for a lambda that only calls an existing method: the four kinds, constructor and array constructor references, how they compile straight to a method handle with no synthetic method, the eager null check that surprises people, and when a plain lambda is clearer.",
  tags: ["Java 8", "Method References", "Lambdas", "Functional Programming"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "When I call my mother, I don't type her number digit by digit. I tap \"Mom\" in my contacts. The phone already knows the number, so tapping the name is shorter and I can't get a digit wrong.",
        },
        {
          type: "paragraph",
          text: "A **method reference** is tapping the name. If my lambda only calls a method that already exists, like `name -> System.out.println(name)`, I can just name that method instead: `System.out::println`. The `::` means \"use this method\".",
        },
        {
          type: "paragraph",
          text: "I use it when it makes the line easier to read. It does exactly the same job as the lambda it replaces.",
        },
        {
          type: "code",
          language: "java",
          code: `List<String> students = List.of("Asha", "Ravi", "Meena");
students.forEach(name -> System.out.println(name)); // lambda
students.forEach(System.out::println);              // method reference`,
        },
        {
          type: "output",
          text: `Asha
Ravi
Meena
Asha
Ravi
Meena`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "If a lambda just passes its input to one existing method, `Class::method` says the same thing shorter.",
        },
      ],
    },
    {
      title: "What Method References Are",
      blocks: [
        {
          type: "paragraph",
          text: "At a busy restaurant I don't explain the recipe to the waiter. I point at the menu: \"number 4, please\". The kitchen already knows how to make number 4. Pointing is shorter than describing, and there's no chance of describing it slightly wrong.",
        },
        {
          type: "paragraph",
          text: "A **method reference** is pointing at the menu. Very often a lambda does nothing except call one method that already exists, passing its arguments straight through: `name -> System.out.println(name)`, or `s -> Integer.parseInt(s)`. A method reference says the same thing by naming the method: `System.out::println`, `Integer::parseInt`.",
        },
        {
          type: "paragraph",
          text: "It isn't a new feature with new powers. Everything a method reference does, a lambda can do. It's a shorthand, and like a lambda it needs a functional interface as its target. But it's compiled a little differently, and there are two behaviours where it's not the same as the lambda it replaces. Those two are what this lesson is really about.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Method references came in Java 8 (2014), in the same JSR 335 as lambdas. Once lambdas existed, it was obvious that a huge share of them would just forward to one method, so the designers added a way to write that directly. The `::` was chosen to look like C++'s scope operator: \"the `parseInt` that belongs to `Integer`\".",
        },
        {
          type: "list",
          items: [
            "**Java 8:** the four kinds of method reference, constructor references (`ArrayList::new`) and array constructor references (`String[]::new`).",
            "**Java 8:** APIs designed to take them, like `Comparator.comparing(Driver::rating)` and `Stream.toArray(String[]::new)`.",
            "**Java 9:** `javac` started using `Objects.requireNonNull` for the null check on a bound receiver (Java 8's `javac` used a call to `getClass()` for the same purpose). More on that check below.",
            "**Java 11:** `Predicate.not`, mainly so a method reference can be negated: `filter(Predicate.not(String::isBlank))`, and `Collection.toArray(IntFunction)`, so `list.toArray(String[]::new)` works without a stream.",
          ],
        },
        {
          type: "paragraph",
          text: "The language rules haven't changed since Java 8. What changed is the JDK filling in methods that make method references more useful.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of the four kinds of method reference as four ways to ask for something at a tea stall:",
        },
        {
          type: "list",
          items: [
            "**Static method,** `Integer::parseInt`: \"Use the standard recipe from the book.\" Nobody in particular does it; it's a rule anyone can follow.",
            "**Instance method of a particular object,** `ravi::makeTea`: \"Ask Ravi to make it.\" One specific person, chosen now.",
            "**Instance method of an arbitrary object,** `Cup::wash`: \"Each cup, wash yourself.\" Whichever cup comes along is the one that does the work. The cup arrives later, as the input.",
            "**Constructor,** `Cup::new`: \"Bring me a new cup.\"",
          ],
        },
        {
          type: "paragraph",
          text: "The difference between the second and third is the one that confuses people, and the tea stall makes it clear: is the worker chosen now (Ravi), or does each item handle itself when it arrives (each cup)?",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/method-reference-kinds.svg",
          alt: "Table of the four method reference kinds with examples and equivalent lambdas: static Integer::parseInt, bound System.out::println, unbound String::toUpperCase, constructor ArrayList::new",
          caption: "Every method reference is shorthand for a lambda that calls one method; the kind decides where the receiver comes from.",
        },
        {
          type: "heading",
          text: "The four kinds",
        },
        {
          type: "code",
          language: "java",
          title: "FourKinds.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.function.*;

public class FourKinds {
    public static void main(String[] args) {
        // 1. Static method:              Class::staticMethod
        Function<String, Integer> parse = Integer::parseInt;        // s -> Integer.parseInt(s)

        // 2. Instance method of a particular object:  object::method
        String stall = "Ravi's Tea";
        Predicate<String> sameStall = stall::equals;                 // s -> stall.equals(s)

        // 3. Instance method of an arbitrary object:  Class::instanceMethod
        Function<String, String> shout = String::toUpperCase;        // s -> s.toUpperCase()
        BiFunction<String, String, Boolean> starts = String::startsWith; // (s, p) -> s.startsWith(p)

        // 4. Constructor:                Class::new
        Supplier<List<String>> newOrderList = ArrayList::new;        // () -> new ArrayList<>()

        System.out.println(parse.apply("120") + 30);
        System.out.println(sameStall.test("Ravi's Tea") + " " + sameStall.test("Asha's Tea"));
        System.out.println(shout.apply("one masala chai"));
        System.out.println(starts.apply("chai latte", "chai"));
        List<String> orders = newOrderList.get();
        orders.add("samosa");
        System.out.println(orders);
    }
}`,
        },
        {
          type: "output",
          text: `150
true false
ONE MASALA CHAI
true
[samosa]`,
        },
        {
          type: "table",
          headers: ["Kind", "Syntax", "Equivalent lambda", "Who supplies the object"],
          rows: [
            ["Static", "`Integer::parseInt`", "`s -> Integer.parseInt(s)`", "No object; all arguments go to the method"],
            ["Bound (particular object)", "`stall::equals`", "`s -> stall.equals(s)`", "Fixed when the reference is created"],
            ["Unbound (arbitrary object)", "`String::toUpperCase`", "`s -> s.toUpperCase()`", "The **first argument** becomes the object"],
            ["Constructor", "`ArrayList::new`", "`() -> new ArrayList<>()`", "A new object is created"],
          ],
        },
        {
          type: "heading",
          text: "The unbound kind shifts the arguments",
        },
        {
          type: "paragraph",
          text: "This is the one to slow down on. `String::startsWith` is an instance method that takes one parameter (the prefix). Yet it fits a `BiFunction<String, String, Boolean>`, which takes **two**. That's because with an unbound reference, the first argument of the interface method becomes the object the method is called on, and the rest become its arguments: `(s, p) -> s.startsWith(p)`. So an unbound reference always needs one more parameter in the interface than the method itself has.",
        },
        {
          type: "paragraph",
          text: "`String::toUpperCase` takes no arguments, so it fits a one-argument `Function<String, String>`: the one argument is the string to uppercase.",
        },
        {
          type: "heading",
          text: "Constructor and array constructor references",
        },
        {
          type: "paragraph",
          text: "`ClassName::new` refers to a constructor, and which constructor depends on the target: `Supplier<ArrayList<String>>` picks `new ArrayList<>()`, while `IntFunction<ArrayList<String>>` picks `new ArrayList<>(int capacity)`. Arrays have their own form, `Type[]::new`, which fits an `IntFunction`: given a length, make an array. Its main use is getting a properly typed array out of a collection:",
        },
        {
          type: "code",
          language: "java",
          title: "ArrayCtor.java",
          code: `import java.util.List;
import java.util.function.IntFunction;

public class ArrayCtor {
    public static void main(String[] args) {
        List<String> riders = List.of("Asha", "Ravi", "Bo");

        Object[] plain = riders.toArray();                    // Object[], not String[]
        String[] typed = riders.stream().toArray(String[]::new);
        String[] alsoTyped = riders.toArray(String[]::new);   // Java 11

        IntFunction<int[]> seatMap = int[]::new;
        System.out.println(plain.getClass().getSimpleName() + " " + typed.getClass().getSimpleName()
                + " " + alsoTyped.length + " " + seatMap.apply(6).length);
    }
}`,
        },
        {
          type: "output",
          text: `Object[] String[] 3 6`,
        },
        {
          type: "paragraph",
          text: "`toArray()` with no argument can only make an `Object[]`, because generics are erased and the list doesn't know it holds `String`s at runtime. Passing `String[]::new` hands it a way to build the right kind of array.",
        },
        {
          type: "heading",
          text: "The compiler still picks overloads",
        },
        {
          type: "paragraph",
          text: "A method reference names a method but not its parameter types, so when the method is overloaded, `javac` picks the overload from the target's shape. Sometimes it can't:",
        },
        {
          type: "code",
          language: "java",
          title: "AmbiguousRef.java",
          code: `import java.util.function.Function;

public class AmbiguousRef {
    public static void main(String[] args) {
        Function<Integer, String> label = Integer::toString;
    }
}`,
        },
        {
          type: "output",
          text: `AmbiguousRef.java:5: error: incompatible types: invalid method reference
        Function<Integer, String> label = Integer::toString;
                                          ^
    reference to toString is ambiguous
      both method toString(int) in Integer and method toString() in Integer match
1 error`,
        },
        {
          type: "paragraph",
          text: "`Integer::toString` could be the static `Integer.toString(int)` (with the argument unboxed), or the unbound instance method `toString()` called on the `Integer` argument. Both fit `Function<Integer, String>`. A lambda says which one I mean: `n -> n.toString()` or `n -> Integer.toString(n)`. Or `String::valueOf`, which has no such clash here.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "No synthetic method",
        },
        {
          type: "paragraph",
          text: "For a lambda, `javac` moves the body into a private `lambda$main$0` method, as the Lambda Expressions lesson showed. For a method reference, there's no body to move: the method already exists. I ran `javap -c -p` on `FourKinds` and searched for `lambda$`:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p FourKinds | grep -E 'invokedynamic|lambda\\$|requireNonNull'`,
        },
        {
          type: "output",
          text: `       0: invokedynamic #7,  0              // InvokeDynamic #0:apply:()Ljava/util/function/Function;
      11: invokestatic  #13                 // Method java/util/Objects.requireNonNull:(Ljava/lang/Object;)Ljava/lang/Object;
      15: invokedynamic #19,  0             // InvokeDynamic #1:test:(Ljava/lang/String;)Ljava/util/function/Predicate;
      21: invokedynamic #23,  0             // InvokeDynamic #2:apply:()Ljava/util/function/Function;
      28: invokedynamic #24,  0             // InvokeDynamic #3:apply:()Ljava/util/function/BiFunction;
      35: invokedynamic #27,  0             // InvokeDynamic #4:get:()Ljava/util/function/Supplier;
      84: invokedynamic #62,  0             // InvokeDynamic #5:makeConcatWithConstants:(ZZ)Ljava/lang/String;`,
        },
        {
          type: "paragraph",
          text: "Five method references, five `invokedynamic`s (the sixth is string concatenation), and not a single `lambda$` method. Only one `invokedynamic` takes an argument: `test:(Ljava/lang/String;)...Predicate`, the bound `stall::equals`, which captures `stall`. The other four capture nothing.",
        },
        {
          type: "heading",
          text: "The method handle points straight at the target",
        },
        {
          type: "paragraph",
          text: "The bootstrap table shows where each `invokedynamic` leads. Same `LambdaMetafactory.metafactory` as a lambda, but the method handle argument is the real JDK method:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -v -p FourKinds     # BootstrapMethods, metafactory descriptor shortened",
        },
        {
          type: "output",
          text: `BootstrapMethods:
  0: #106 REF_invokeStatic java/lang/invoke/LambdaMetafactory.metafactory:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #113 (Ljava/lang/Object;)Ljava/lang/Object;
      #114 REF_invokeStatic java/lang/Integer.parseInt:(Ljava/lang/String;)I
      #119 (Ljava/lang/String;)Ljava/lang/Integer;
  1: #106 REF_invokeStatic java/lang/invoke/LambdaMetafactory.metafactory:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #121 (Ljava/lang/Object;)Z
      #122 REF_invokeVirtual java/lang/String.equals:(Ljava/lang/Object;)Z
      #126 (Ljava/lang/String;)Z
  2: #106 REF_invokeStatic java/lang/invoke/LambdaMetafactory.metafactory:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #113 (Ljava/lang/Object;)Ljava/lang/Object;
      #128 REF_invokeVirtual java/lang/String.toUpperCase:()Ljava/lang/String;
      #133 (Ljava/lang/String;)Ljava/lang/String;
  3: #106 REF_invokeStatic java/lang/invoke/LambdaMetafactory.metafactory:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #135 (Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
      #136 REF_invokeVirtual java/lang/String.startsWith:(Ljava/lang/String;)Z
      #140 (Ljava/lang/String;Ljava/lang/String;)Ljava/lang/Boolean;
  4: #106 REF_invokeStatic java/lang/invoke/LambdaMetafactory.metafactory:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #142 ()Ljava/lang/Object;
      #143 REF_newInvokeSpecial java/util/ArrayList."<init>":()V
      #147 ()Ljava/util/List;`,
        },
        {
          type: "list",
          items: [
            "Static references become `REF_invokeStatic` handles (`Integer.parseInt`).",
            "Both bound and unbound instance references become `REF_invokeVirtual` handles (`String.equals`, `String.toUpperCase`). The difference between them isn't in the handle at all, it's in whether the receiver is captured at the `invokedynamic`.",
            "Constructor references become `REF_newInvokeSpecial`, meaning \"`new` plus call `<init>`\".",
            "Look at the shapes for `parseInt`: the method returns `I` (an `int`), but the specialised shape says it should return `Ljava/lang/Integer;`. The metafactory is allowed to bridge that gap with boxing, which leads to the next step.",
          ],
        },
        {
          type: "heading",
          text: "The generated classes",
        },
        {
          type: "paragraph",
          text: "I dumped the runtime classes with `-Djdk.invoke.LambdaMetafactory.dumpProxyClassFiles=true` (JDK 21). Here are the first two, for `Integer::parseInt` and `stall::equals`:",
        },
        {
          type: "output",
          text: `final class FourKinds$$Lambda implements java.util.function.Function {
  private FourKinds$$Lambda();
    Code:
       0: aload_0
       1: invokespecial #10                 // Method java/lang/Object."<init>":()V
       4: return

  public java.lang.Object apply(java.lang.Object);
    Code:
       0: aload_1
       1: checkcast     #14                 // class java/lang/String
       4: invokestatic  #20                 // Method java/lang/Integer.parseInt:(Ljava/lang/String;)I
       7: invokestatic  #24                 // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
      10: areturn
}
final class FourKinds$$Lambda implements java.util.function.Predicate {
  private final java.lang.String arg$1;

  private FourKinds$$Lambda(java.lang.String);
    Code:
       0: aload_0
       1: invokespecial #13                 // Method java/lang/Object."<init>":()V
       4: aload_0
       5: aload_1
       6: putfield      #15                 // Field arg$1:Ljava/lang/String;
       9: return

  public boolean test(java.lang.Object);
    Code:
       0: aload_0
       1: getfield      #15                 // Field arg$1:Ljava/lang/String;
       4: aload_1
       5: checkcast     #19                 // class java/lang/String
       8: invokevirtual #22                 // Method java/lang/String.equals:(Ljava/lang/Object;)Z
      11: ireturn
}`,
        },
        {
          type: "list",
          items: [
            "For `Integer::parseInt`, `apply` casts the argument to `String`, calls `parseInt` **directly**, and boxes the `int` with `Integer.valueOf`. With a lambda there'd be one more hop: `apply` would call `lambda$main$0`, which would call `parseInt`.",
            "For `stall::equals`, the receiver `stall` is stored in `private final String arg$1`, exactly like a captured variable in a lambda. `test` loads it and calls `equals` on it.",
            "The other three (not shown) follow the same pattern: `toUpperCase` and `startsWith` cast their arguments and call the method on the first one (with `Boolean.valueOf` for `startsWith`'s `boolean`), and the `Supplier` does `new ArrayList` and `invokespecial <init>`.",
          ],
        },
        {
          type: "paragraph",
          text: "One visible effect of the missing hop is in stack traces. I made the same call fail through a lambda and through a method reference and printed the non-JDK frames:",
        },
        {
          type: "code",
          language: "java",
          title: "TraceRef.java",
          code: `import java.util.function.Function;

public class TraceRef {
    public static void main(String[] args) {
        Function<String, Integer> byLambda = s -> Integer.parseInt(s);
        Function<String, Integer> byRef = Integer::parseInt;
        try { byLambda.apply("12km"); } catch (NumberFormatException e) { show(e); }
        try { byRef.apply("12km"); } catch (NumberFormatException e) { show(e); }
    }

    static void show(Exception e) {
        for (StackTraceElement f : e.getStackTrace()) {
            if (!f.getClassName().startsWith("java.")) System.out.println("  at " + f);
        }
        System.out.println();
    }
}`,
        },
        {
          type: "output",
          text: `  at TraceRef.lambda$main$0(TraceRef.java:5)
  at TraceRef.main(TraceRef.java:7)

  at TraceRef.main(TraceRef.java:8)`,
        },
        {
          type: "paragraph",
          text: "The lambda adds its `lambda$main$0` frame. The method reference goes from the hidden `$$Lambda` class (left out of traces by default) straight into `Integer.parseInt`.",
        },
        {
          type: "heading",
          text: "The eager null check on a bound receiver",
        },
        {
          type: "paragraph",
          text: "Back in the `javap` of `main`, just before the bound reference's `invokedynamic`:",
        },
        {
          type: "output",
          text: `       6: ldc           #11                 // String Ravi\\'s Tea
       8: astore_2
       9: aload_2
      10: dup
      11: invokestatic  #13                 // Method java/util/Objects.requireNonNull:(Ljava/lang/Object;)Ljava/lang/Object;
      14: pop
      15: invokedynamic #19,  0             // InvokeDynamic #1:test:(Ljava/lang/String;)Ljava/util/function/Predicate;`,
        },
        {
          type: "paragraph",
          text: "`javac` loads `stall`, duplicates it, null-checks the copy, and passes the original to the factory. The JLS (15.13.3) requires this: for `expr::method`, the expression is evaluated and checked for null **when the reference is created**. A lambda only checks when its body runs. That difference is real and visible:",
        },
        {
          type: "code",
          language: "java",
          title: "NullReceiver.java",
          code: `import java.util.function.Supplier;

public class NullReceiver {
    public static void main(String[] args) {
        String driverName = null;                          // no driver assigned yet

        Supplier<Integer> lambda = () -> driverName.length();
        System.out.println("lambda created fine");

        Supplier<Integer> ref = driverName::length;         // NPE right here
        System.out.println("method ref created fine");
    }
}`,
        },
        {
          type: "output",
          text: `lambda created fine
Exception in thread "main" java.lang.NullPointerException
	at java.base/java.util.Objects.requireNonNull(Objects.java:233)
	at NullReceiver.main(NullReceiver.java:10)`,
        },
        {
          type: "paragraph",
          text: "The lambda would only fail if someone called `get()`. The method reference fails on line 10, at creation, and \"method ref created fine\" never prints. The `requireNonNull` frame in the trace is the instruction I saw in `javap`.",
        },
        {
          type: "heading",
          text: "The receiver is evaluated once",
        },
        {
          type: "paragraph",
          text: "The same rule has a second effect: the expression before `::` runs once, when the reference is created, not on each call. A lambda re-evaluates it every time:",
        },
        {
          type: "code",
          language: "java",
          title: "EvaluatedOnce.java",
          code: `import java.util.function.Supplier;

public class EvaluatedOnce {
    static int counter = 0;

    static String nextToken() {
        counter++;
        System.out.println("  nextToken() called, counter = " + counter);
        return "T" + counter;
    }

    public static void main(String[] args) {
        System.out.println("method reference:");
        Supplier<String> ref = nextToken()::toLowerCase;      // nextToken() runs now, once
        System.out.println(ref.get() + " " + ref.get());

        System.out.println("lambda:");
        Supplier<String> lambda = () -> nextToken().toLowerCase();  // runs on every get()
        System.out.println(lambda.get() + " " + lambda.get());
    }
}`,
        },
        {
          type: "output",
          text: `method reference:
  nextToken() called, counter = 1
t1 t1
lambda:
  nextToken() called, counter = 2
  nextToken() called, counter = 3
t2 t3`,
        },
        {
          type: "paragraph",
          text: "Like a bank token machine: the method reference took one token at the door and keeps showing it. The lambda takes a new token every time it's asked. Neither is wrong; they just mean different things, and swapping one for the other in a refactor can change behaviour.",
        },
        {
          type: "heading",
          text: "When javac does generate a synthetic method",
        },
        {
          type: "paragraph",
          text: "Not every method reference can be a direct handle. I found three cases where `javac` quietly turns it back into a lambda:",
        },
        {
          type: "code",
          language: "java",
          title: "Synth.java",
          code: `import java.util.function.*;

public class Synth {
    static class Base {
        String greet() { return "hello from Base"; }
    }

    static class Child extends Base {
        @Override
        String greet() { return "hello from Child"; }

        Supplier<String> parent() { return super::greet; }       // super::method
    }

    static String join(String... parts) { return String.join("-", parts); }

    public static void main(String[] args) {
        IntFunction<String[]> seats = String[]::new;             // array constructor
        BiFunction<String, String, String> pair = Synth::join;   // varargs method
        System.out.println(seats.apply(4).length);
        System.out.println(pair.apply("cab", "42"));
        System.out.println(new Child().parent().get());
    }
}`,
        },
        {
          type: "output",
          text: `4
cab-42
hello from Base`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p Synth && javap -c -p 'Synth$Child'     # only the synthetic methods`,
        },
        {
          type: "output",
          text: `  private static java.lang.String lambda$main$1(java.lang.String, java.lang.String);
    Code:
       0: iconst_2
       1: anewarray     #10                 // class java/lang/String
       4: dup
       5: iconst_0
       6: aload_0
       7: aastore
       8: dup
       9: iconst_1
      10: aload_1
      11: aastore
      12: invokestatic  #66                 // Method join:([Ljava/lang/String;)Ljava/lang/String;
      15: areturn

  private static java.lang.String[] lambda$main$0(int);
    Code:
       0: iload_0
       1: anewarray     #10                 // class java/lang/String
       4: areturn

  private java.lang.String lambda$parent$0();
    Code:
       0: aload_0
       1: invokespecial #13                 // Method Synth$Base.greet:()Ljava/lang/String;
       4: areturn`,
        },
        {
          type: "list",
          items: [
            "`String[]::new`: there's no constructor method for arrays, only the `anewarray` instruction, so there's nothing for a method handle to point at. `javac` writes `lambda$main$0(int)` that does `anewarray`.",
            "`Synth::join` with two `String`s into a varargs method: something has to pack the arguments into a `String[]`. The synthetic method builds the array, then calls `join`.",
            "`super::greet`: it must call `Base.greet` even though `Child` overrides it, which needs `invokespecial`. The synthetic method is an instance method of `Child` that does exactly that, which is why the output says \"hello from Base\".",
          ],
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "table",
          headers: ["Form", "Example", "Same as", "Typical target"],
          rows: [
            ["`Class::staticMethod`", "`Math::max`", "`(a, b) -> Math.max(a, b)`", "`IntBinaryOperator`"],
            ["`object::method`", "`System.out::println`", "`x -> System.out.println(x)`", "`Consumer<String>`"],
            ["`this::method`", "`this::alert`", "`x -> this.alert(x)`", "`Consumer<String>`"],
            ["`super::method`", "`super::greet`", "`() -> super.greet()`", "`Supplier<String>`"],
            ["`Class::instanceMethod`", "`String::length`", "`s -> s.length()`", "`ToIntFunction<String>`"],
            ["`Class::instanceMethod` (2 args)", "`String::compareTo`", "`(a, b) -> a.compareTo(b)`", "`Comparator<String>`"],
            ["`Class::new`", "`StringBuilder::new`", "`() -> new StringBuilder()`", "`Supplier<StringBuilder>`"],
            ["`Class::new` (with arg)", "`StringBuilder::new`", "`s -> new StringBuilder(s)`", "`Function<String, StringBuilder>`"],
            ["`Type[]::new`", "`int[]::new`", "`n -> new int[n]`", "`IntFunction<int[]>`"],
          ],
        },
        {
          type: "paragraph",
          text: "`System.out::println` is the bound kind, even though it looks static: `System.out` is a field holding one particular `PrintStream` object, evaluated once. And there are no parentheses or arguments after `::`, ever. `Integer::parseInt(\"5\")` is not valid Java.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "paragraph",
          text: "A list of cab drivers: sort them, print their names, alert about the busy ones, and add up their trips. Every step uses a method reference:",
        },
        {
          type: "code",
          language: "java",
          title: "Examples.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class Examples {
    record Driver(String name, double rating, int trips) {}

    private final List<String> alerts = new ArrayList<>();

    void alert(String message) { alerts.add("ALERT: " + message); }

    void run() {
        List<Driver> drivers = new ArrayList<>(List.of(
                new Driver("Ravi", 4.6, 120), new Driver("Asha", 4.9, 80), new Driver("Bo", 4.6, 300)));

        drivers.sort(Comparator.comparing(Driver::rating).reversed()
                               .thenComparing(Driver::name));
        drivers.stream().map(Driver::name).forEach(System.out::println);

        drivers.stream().filter(d -> d.trips() > 100)
               .map(Driver::name)
               .forEach(this::alert);                    // bound to this object
        System.out.println(alerts);

        int totalTrips = drivers.stream().mapToInt(Driver::trips).sum();
        System.out.println(totalTrips);
    }

    public static void main(String[] args) {
        new Examples().run();
    }
}`,
        },
        {
          type: "output",
          text: `Asha
Bo
Ravi
[ALERT: Bo, ALERT: Ravi]
500`,
        },
        {
          type: "list",
          items: [
            "`Comparator.comparing(Driver::rating)` reads almost like English: compare by rating. `.reversed()` puts the best first, and `.thenComparing(Driver::name)` breaks the tie between Ravi and Bo (both 4.6) alphabetically.",
            "`Driver::name` is the unbound kind: each driver in the stream is the object `name()` is called on. Record accessors are perfect for this.",
            "`System.out::println` and `this::alert` are bound: the `PrintStream` and the current `Examples` object are fixed when the reference is created.",
            "`mapToInt(Driver::trips)` targets a `ToIntFunction<Driver>`, so the `int` result is never boxed.",
            "The `filter` uses a lambda on purpose. `d -> d.trips() > 100` compares against a number, and no existing method does that. Forcing a method reference here would mean writing an `isBusy` method just for the syntax.",
          ],
        },
        {
          type: "heading",
          text: "Where a method reference compiles and the lambda doesn't",
        },
        {
          type: "paragraph",
          text: "One surprise from that example. I tried swapping `Driver::rating` for a lambda:",
        },
        {
          type: "code",
          language: "java",
          title: "Reversed.java",
          code: `import java.util.Comparator;

public class Reversed {
    record Driver(String name, double rating) {}

    public static void main(String[] args) {
        Comparator<Driver> byRef = Comparator.comparing(Driver::rating).reversed();
        Comparator<Driver> byLambda = Comparator.comparing(d -> d.rating()).reversed();
    }
}`,
        },
        {
          type: "output",
          text: `Reversed.java:8: error: cannot find symbol
        Comparator<Driver> byLambda = Comparator.comparing(d -> d.rating()).reversed();
                                                                 ^
  symbol:   method rating()
  location: variable d of type Object
Reversed.java:8: error: incompatible types: Comparator<Object> cannot be converted to Comparator<Driver>
        Comparator<Driver> byLambda = Comparator.comparing(d -> d.rating()).reversed();
                                                                                    ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "The `.reversed()` call is the problem. `Comparator.comparing(...)` is no longer the expression being assigned, so the target type `Comparator<Driver>` doesn't flow into it, and the lambda's `d` falls back to `Object`. `Driver::rating` works anyway because the method reference itself names the class: the compiler can read `Driver` straight off it (the JLS calls this an exact method reference). With a lambda, the fix is a typed parameter, `(Driver d) -> d.rating()`, or `Comparator.<Driver, Double>comparing(...)`.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Expecting this::method to be the same object twice",
        },
        {
          type: "paragraph",
          text: "A bound method reference captures its receiver, so every evaluation creates a new object. That breaks the classic subscribe and unsubscribe pattern:",
        },
        {
          type: "code",
          language: "java",
          title: "Unsubscribe.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

public class Unsubscribe {
    private final List<Consumer<String>> listeners = new ArrayList<>();

    void onRideBooked(String rideId) { System.out.println("notify rider: " + rideId); }

    void demo() {
        listeners.add(this::onRideBooked);
        Consumer<String> sameLooking = this::onRideBooked;   // a second, different object
        listeners.remove(sameLooking);
        System.out.println("after remove: " + listeners.size());

        listeners.clear();
        Consumer<String> handler = this::onRideBooked;       // keep one reference
        listeners.add(handler);
        listeners.remove(handler);
        System.out.println("after remove: " + listeners.size());
    }

    public static void main(String[] args) {
        new Unsubscribe().demo();
    }
}`,
        },
        {
          type: "output",
          text: `after remove: 1
after remove: 0`,
        },
        {
          type: "paragraph",
          text: "The first `remove` did nothing: the two `this::onRideBooked` objects are different, and lambda objects don't override `equals`. The fix is to create the reference once, keep it in a field or variable, and use that same object to add and remove. (I also tried passing `this::onRideBooked` straight into `remove`, and it didn't compile: `remove` takes an `Object`, which isn't a functional interface.)",
        },
        {
          type: "heading",
          text: "Turning a lambda into a method reference without checking the receiver",
        },
        {
          type: "paragraph",
          text: "IDEs offer \"replace lambda with method reference\" as a one-click fix. For `() -> driver.getName()`, that becomes `driver::getName`, which now throws at creation if `driver` is `null`, and evaluates `driver` only once. Usually fine, occasionally a behaviour change, as `NullReceiver` and `EvaluatedOnce` showed.",
        },
        {
          type: "heading",
          text: "Mixing up the bound and unbound kinds",
        },
        {
          type: "list",
          items: [
            "`String::length` takes the string as its input. `name::length` (with a variable `name`) takes nothing and always measures `name`. One fits `ToIntFunction<String>`, the other `IntSupplier`.",
            "Writing `Driver::getName` where the code needs a specific driver's name, or `driver::getName` where it needs \"each driver's name\". The compile error usually mentions the wrong number of arguments.",
          ],
        },
        {
          type: "heading",
          text: "Ambiguous references to overloaded methods",
        },
        {
          type: "paragraph",
          text: "`Integer::toString` with a `Function<Integer, String>` is the textbook case shown above. When the compiler says \"reference to ... is ambiguous\", a lambda that spells out the call is the clearest fix.",
        },
        {
          type: "heading",
          text: "Forcing a method reference where a lambda reads better",
        },
        {
          type: "paragraph",
          text: "A method reference is clearer only when it's a plain pass-through. These are better as lambdas:",
        },
        {
          type: "code",
          language: "java",
          code: `ride -> ride.getRider().getPhone()           // a chain of calls
fare -> fare > 200                           // an operator or a comparison
name -> name.substring(0, 3)                 // extra arguments of my own
(a, b) -> b.compareTo(a)                     // arguments in a different order
order -> "Order " + order.getId() + " ready" // building a value`,
        },
        {
          type: "paragraph",
          text: "Each of these could be a method reference only by writing a new helper method with a name. Sometimes that's worth it (a well-named `Ride::riderPhone` helper might be used in many places). Often it just moves one line of logic away from where it's read.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use a method reference when a lambda only forwards its arguments, unchanged and in the same order, to one existing method. `map(Driver::name)` beats `map(d -> d.name())`.",
            "Use a lambda when there's anything else: an operator, a constant, a chain, reordered arguments, or an overload the compiler can't pick.",
            "Prefer the forms that read like English in builder-style APIs: `Comparator.comparing(Driver::rating).thenComparing(Driver::name)`.",
            "Use `Type[]::new` to get a typed array from a collection or stream, instead of an `Object[]` and a cast.",
            "Pull a long lambda out into a well-named private method and pass `this::validateRide` or `RideRules::isEligible`. The stream reads as a list of steps, and the method can be tested on its own.",
            "When you need to remove a listener later, store the method reference in a field once; never rely on two evaluations of `this::handler` being equal.",
            "Be aware of the eager null check. If the receiver might legitimately be `null` at creation and only set later, a lambda is the correct choice.",
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
            "A method reference is linked exactly like a lambda: an `invokedynamic`, bootstrapped once per call site by `LambdaMetafactory`, which spins a hidden class. The first-use cost is the same.",
            "It saves one call in most cases: the generated class calls the target directly instead of going through a `lambda$...` method. That's one frame fewer in stack traces, and one less method for the JIT to inline, though the JIT inlines a tiny forwarding method easily, so in practice the runtime speed is the same.",
            "It saves one synthetic method in the class file per reference. A small win for class size, nothing more.",
            "Static, unbound and constructor references capture nothing, so on HotSpot they share one instance per call site, like non-capturing lambdas.",
            "Bound references (`obj::method`, `this::method`) capture their receiver, so each evaluation allocates a small object, like a capturing lambda. In a hot loop, create it once outside the loop.",
            "Boxing still applies. `Integer::parseInt` into a `Function<String, Integer>` boxes every result, as the dumped class showed with `Integer.valueOf`. `ToIntFunction<String> p = Integer::parseInt` doesn't.",
          ],
        },
      ],
    },
    {
      title: "Method References in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A small, very typical backend task: an end-of-day report of paid order totals per city. The repository hands over today's orders; the service filters, groups and sums them. Almost every step is a method reference:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderReport.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

// In a Spring app: @Service, with the orders coming from a repository
public class OrderReport {
    record Order(String id, String city, int amount, boolean paid) {
        boolean isPaid() { return paid; }
    }

    public Map<String, Integer> paidTotalsByCity(List<Order> todaysOrders) {
        return todaysOrders.stream()
                .filter(Order::isPaid)                          // skip unpaid orders
                .collect(Collectors.groupingBy(
                        Order::city,                            // key: the city
                        TreeMap::new,                           // sorted map, stable output
                        Collectors.summingInt(Order::amount))); // value: total amount
    }

    public static void main(String[] args) {
        List<Order> orders = List.of(
                new Order("o1", "Pune", 250, true),
                new Order("o2", "Kolkata", 180, true),
                new Order("o3", "Pune", 400, false),
                new Order("o4", "Kolkata", 320, true),
                new Order("o5", "Delhi", 150, true));
        new OrderReport().paidTotalsByCity(orders)
                .forEach((city, total) -> System.out.println(city + ": Rs " + total));
    }
}`,
        },
        {
          type: "output",
          text: `Delhi: Rs 150
Kolkata: Rs 500
Pune: Rs 250`,
        },
        {
          type: "list",
          items: [
            "`Order::isPaid` is an unbound reference used as a `Predicate<Order>`: \"each order, are you paid?\". Pune's unpaid 400 order is dropped, so Pune shows 250, not 650.",
            "`Order::city` is the grouping key, a `Function<Order, String>`.",
            "`TreeMap::new` is a constructor reference used as a `Supplier`, telling `groupingBy` which kind of map to build. A `TreeMap` keeps cities sorted, so the report is in the same order every day.",
            "`Collectors.summingInt(Order::amount)` takes a `ToIntFunction<Order>`, so the amounts are added as `int`s with no boxing per order.",
            "The last `forEach` is a lambda, because it builds a string from two values. A method reference wouldn't help there.",
          ],
        },
        {
          type: "paragraph",
          text: "The method body reads top to bottom as the business rule: paid orders, grouped by city, amounts summed. In the ride-booking backend I work on (RideX), this same shape turns up for daily trip summaries and payout reports, along with `map(TripDto::from)` to convert entities to response objects and `orElseThrow(RideNotFoundException::new)` on `Optional` lookups.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "Spring-flavoured method references",
          text: "Spring code is full of them: `repository.findById(id).map(RideDto::from).orElseThrow(...)`, `jdbcTemplate.query(sql, this::mapRow)` with a `RowMapper`, and `@Bean` methods that return `Function` beans referencing a service method.",
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
              question: "What is a method reference?",
              answer:
                "A shorthand for a lambda that only calls one existing method with the same arguments. `Integer::parseInt` means `s -> Integer.parseInt(s)`, and `System.out::println` means `x -> System.out.println(x)`.\n\nLike a lambda, it has no type of its own and needs a functional interface as its target. It can't do anything a lambda can't; it's about readability.",
            },
            {
              question: "What are the four kinds of method reference?",
              answer:
                "A static method, `Integer::parseInt`. An instance method of a particular object, `stall::equals` or `System.out::println`, where the object is fixed when the reference is created. An instance method of an arbitrary object of a type, `String::toUpperCase`, where the first argument becomes the object. And a constructor, `ArrayList::new`.\n\nArray constructor references like `String[]::new` are usually listed with constructors.",
            },
            {
              question: "What's the difference between String::length and str::length?",
              answer:
                "`String::length` is unbound: it takes a string as its input and returns that string's length, so it fits `ToIntFunction<String>` or `Function<String, Integer>`. `str::length` is bound to one particular string: it takes no input and always returns `str`'s length, so it fits `IntSupplier` or `Supplier<Integer>`.\n\nThe bound one also evaluates `str` and null-checks it at the moment the reference is created.",
            },
            {
              question: "How does a constructor reference know which constructor to call?",
              answer:
                "From the target type's method shape, like overload resolution. `Supplier<ArrayList<String>>` takes no arguments, so `ArrayList::new` means the no-argument constructor. `IntFunction<ArrayList<String>>` takes an `int`, so it means `new ArrayList<>(int capacity)`. `Function<Collection<String>, ArrayList<String>>` picks the copy constructor.\n\nIn the bootstrap table it shows up as a `REF_newInvokeSpecial` handle to the chosen `<init>`.",
            },
            {
              question: "What is an array constructor reference and where is it used?",
              answer:
                "`Type[]::new`, like `String[]::new` or `int[]::new`. It fits an `IntFunction`: given a length, it returns a new array of that type and size.\n\nIts main use is getting a correctly typed array: `stream.toArray(String[]::new)`, or since Java 11 `list.toArray(String[]::new)`. Plain `toArray()` returns `Object[]`, because generics are erased and the collection can't know its element type at runtime. I printed the class names to confirm: `Object[]` versus `String[]`.",
            },
            {
              question: "When should you use a lambda instead of a method reference?",
              answer:
                "When the lambda does anything besides forward its arguments to one method: a comparison like `fare -> fare > 200`, extra arguments like `s -> s.substring(0, 3)`, a chain of calls, arguments in a different order, or building a value.\n\nAlso when the method is overloaded in a way the compiler can't resolve, like `Integer::toString` for a `Function<Integer, String>`, and when the receiver might be null at creation time or should be re-evaluated on every call.",
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
              question: "Is a bound method reference exactly equivalent to the lambda it replaces?",
              answer:
                "Not quite. For `expr::method`, `expr` is evaluated once, when the reference is created, and checked for null right then. The lambda `() -> expr.method()` evaluates `expr` every time it's called, and only fails when called.\n\nI showed both. With a null `driverName`, the lambda was created fine, but `driverName::length` threw a `NullPointerException` from `Objects.requireNonNull` on its own line. And `nextToken()::toLowerCase` called `nextToken()` once and returned `t1 t1`, while the lambda called it per `get()` and returned `t2 t3`.",
            },
            {
              question: "Why does `Comparator.comparing(Driver::rating).reversed()` compile but the same with `d -> d.rating()` doesn't?",
              answer:
                "Because the call to `.reversed()` means `comparing(...)` isn't in an assignment context anymore, so the target type `Comparator<Driver>` doesn't flow into it. A lambda with an untyped parameter then has nothing to infer `T` from, and `d` becomes `Object`: \"cannot find symbol method rating() location: variable d of type Object\".\n\n`Driver::rating` is an exact method reference: it names the class, so the compiler infers `T = Driver` from the reference itself. Typing the lambda parameter, `(Driver d) -> d.rating()`, fixes the lambda version.",
            },
            {
              question: "Why is `Integer::toString` ambiguous as a Function<Integer, String>?",
              answer:
                "Because two methods fit. The static `Integer.toString(int)` fits with the argument unboxed, and the instance method `toString()` fits as an unbound reference with the `Integer` argument as the receiver. Neither is more specific, so `javac` reports \"reference to toString is ambiguous ... both method toString(int) in Integer and method toString() in Integer match\".\n\nA lambda picks one explicitly: `n -> n.toString()` or `n -> Integer.toString(n)`.",
            },
            {
              question: "Can you remove a listener with listeners.remove(this::onEvent)?",
              answer:
                "No. A bound method reference captures `this`, so each evaluation creates a new object, and these objects don't override `equals`. My test added `this::onRideBooked`, removed a second `this::onRideBooked`, and the list still had one listener. Passing the reference straight to `remove` doesn't even compile, because `remove` takes an `Object`, which isn't a functional interface.\n\nThe fix is to store the reference once in a field and use that same object for both add and remove.",
            },
            {
              question: "System.out::println: which kind is it, and why does it matter?",
              answer:
                "It's a bound instance method reference, not a static one. `System.out` is a static field that holds a `PrintStream` object, and `println` is an instance method on it. The field is read once, when the reference is created.\n\nIt matters in one real case: if code later calls `System.setOut(...)` to redirect output, a `System.out::println` created earlier keeps printing to the old stream, while `x -> System.out.println(x)` follows the change. I tested it: after redirecting into a buffer, the reference still printed \"via ref\" to the console, and only the lambda's \"via lambda\" landed in the buffer.",
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
              question: "How does a method reference compile? Is it different from a lambda?",
              answer:
                "Both become an `invokedynamic` bootstrapped by `LambdaMetafactory.metafactory`. The difference is that a lambda's body is first moved into a private synthetic `lambda$...` method, and the method handle points at that. A method reference usually needs no synthetic method: the handle points straight at the real method, like `REF_invokeStatic java/lang/Integer.parseInt` or `REF_newInvokeSpecial java/util/ArrayList.\"<init>\"`.\n\nIn `javap -c -p` of a class with five method references, I found five `invokedynamic`s and zero `lambda$` methods. At runtime, the generated class calls the target directly, so stack traces have one frame fewer.",
            },
            {
              question: "When does javac still generate a synthetic method for a method reference?",
              answer:
                "When a direct method handle can't express the call. I confirmed three cases with `javap`: an array constructor reference (`String[]::new`), because arrays are created with the `anewarray` instruction, not a constructor; a varargs method referenced with separate arguments, because something has to pack them into an array; and `super::method`, which needs an `invokespecial` from the subclass.\n\nIn each case `javac` writes a `lambda$...` method, just as if I had written the lambda myself.",
            },
            {
              question: "What does javac emit for a bound receiver, and why?",
              answer:
                "It evaluates the receiver expression, duplicates it, calls `Objects.requireNonNull` on the copy, and passes the receiver to the `invokedynamic` as a captured value. I saw `aload_2; dup; invokestatic Objects.requireNonNull; pop; invokedynamic ...test:(Ljava/lang/String;)...Predicate` in `javap`.\n\nThe JLS requires the null check at creation time for `expr::method`. Java 8's `javac` did the same check with a call to `getClass()`; since Java 9 it uses `requireNonNull`. In the generated class, the receiver is a `private final` field, `arg$1`, exactly like a captured variable.",
            },
            {
              question: "Who does the boxing when Integer::parseInt is used as a Function<String, Integer>?",
              answer:
                "The class generated by `LambdaMetafactory`. The method handle returns an `int`, and the bootstrap arguments record that the specialised shape returns `Integer`. The metafactory is allowed to adapt between them.\n\nIn the dumped class, `apply` did `checkcast String`, `invokestatic Integer.parseInt`, then `invokestatic Integer.valueOf` and `areturn`. Using `ToIntFunction<String>` instead avoids the boxing completely.",
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
            "Rewrite each lambda as a method reference, or decide it shouldn't be one: `s -> s.trim()`, `s -> System.out.println(s)`, `() -> new HashMap<String, Integer>()`, `n -> n * 2`, `(a, b) -> a.compareToIgnoreCase(b)`, `s -> Integer.valueOf(s)`.",
            "Make a `List<String>` of five cities and turn it into a `String[]` with `toArray(String[]::new)`. Print the array's class with `getClass().getSimpleName()`, and compare with `toArray()`.",
            "Write a `record Dish(String name, int price)` and sort a list of dishes by price, then by name, using only method references and `Comparator` methods.",
            "Create `String waiter = null;` and write `Supplier<Integer> s = waiter::length;`. Predict the line where it fails, then change it to a lambda and see when it fails instead.",
            "Compile a class with one lambda `s -> s.isEmpty()` and one method reference `String::isEmpty`, and run `javap -c -p` on it. Count the `lambda$` methods.",
            "Add a listener with `this::handle` to a list and try to remove it with another `this::handle`. Then fix it by storing the reference in a field.",
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Answer for 1",
              answer:
                "`String::trim`, `System.out::println`, `HashMap::new`, and `String::compareToIgnoreCase` (unbound, the first argument is the receiver). `s -> Integer.valueOf(s)` becomes `Integer::valueOf`, which compiles fine for a `Function<String, Integer>` because only `valueOf(String)` fits a `String` argument.\n\n`n -> n * 2` should stay a lambda: there's no existing method that doubles a number, and writing one just for the syntax doesn't help.",
            },
            {
              question: "Hint for 3",
              answer:
                "`dishes.sort(Comparator.comparingInt(Dish::price).thenComparing(Dish::name));`. Using `comparingInt` avoids boxing the price. If you add `.reversed()` after `comparingInt(Dish::price)`, it still compiles because `Dish::price` is an exact method reference.",
            },
            {
              question: "Answer for 4 and 5",
              answer:
                "For 4, the method reference fails on its own line with a `NullPointerException` from `Objects.requireNonNull`, before `get()` is ever called. The lambda `() -> waiter.length()` is created fine and only fails when you call `get()`.\n\nFor 5, you'll find exactly one `lambda$` method, for the lambda. The method reference's bootstrap entry points straight at `REF_invokeVirtual java/lang/String.isEmpty:()Z`.",
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
          text: `WHAT        shorthand for a lambda that only forwards to one method
            needs a functional interface target, like any lambda

FOUR KINDS  Class::staticMethod     Integer::parseInt   s -> Integer.parseInt(s)
            object::method          stall::equals       s -> stall.equals(s)
            Class::instanceMethod   String::length      s -> s.length()
            Class::new              ArrayList::new      () -> new ArrayList<>()
            Type[]::new             String[]::new       n -> new String[n]

UNBOUND     first argument becomes the receiver  (one extra param)
BOUND       receiver evaluated ONCE at creation + null-checked THEN
            new object per evaluation -> this::m != this::m

COMPILES TO invokedynamic + LambdaMetafactory, handle -> real method
            REF_invokeStatic / REF_invokeVirtual / REF_newInvokeSpecial
            no lambda$ method, except: T[]::new, varargs, super::m

PREFER A    operators, constants, chains, reordered args,
LAMBDA      ambiguous overloads, receiver that may be null`,
          caption: "Method references on one screen.",
        },
        {
          type: "list",
          items: [
            "A method reference points at an existing method instead of describing it; use it when a lambda is a plain pass-through.",
            "Watch the bound kind: the receiver is evaluated and null-checked once, when the reference is created.",
            "It compiles to the same `invokedynamic` as a lambda but usually skips the synthetic method, so traces are shorter.",
            "When it needs a helper method or a cast to compile, the lambda was clearer all along.",
          ],
        },
      ],
    },
  ],
};
