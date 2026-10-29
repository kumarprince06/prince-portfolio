import type { Lesson } from "../types";

export const functionalInterfaces: Lesson = {
  slug: "functional-interfaces",
  date: "2026-10-29",
  title: "Functional Interfaces",
  description:
    "The types that make lambdas possible: what counts as a functional interface, what `@FunctionalInterface` really checks, the whole `java.util.function` family with its primitive versions, and how `andThen`, `compose`, `and` and `negate` are built from default methods, with the boxing cost measured.",
  tags: ["Java 8", "Functional Interfaces", "Lambdas", "Functional Programming"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a school attendance register. Each line has exactly one box to fill: present or absent. Because there's only one box, nobody has to ask \"which box do you mean?\".",
        },
        {
          type: "paragraph",
          text: "A **functional interface** is a Java interface with exactly one empty method to fill in, like that one box. Because there's only one, a lambda can fill it in without naming the method. `Predicate<Integer>` is one of them: its single method `test` takes a value and answers true or false.",
        },
        {
          type: "paragraph",
          text: "I use them all the time without noticing. Every lambda needs one of these as its \"shape\", and Java already ships ready-made ones like `Predicate`, `Function`, `Consumer` and `Supplier`, so I rarely write my own.",
        },
        {
          type: "code",
          language: "java",
          code: `Predicate<Integer> canVote = age -> age >= 18;
System.out.println(canVote.test(20));
System.out.println(canVote.test(15));`,
        },
        {
          type: "output",
          text: `true
false`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "One empty method to fill means a lambda can fill it, and that's all a functional interface is.",
        },
      ],
    },
    {
      title: "What Functional Interfaces Are",
      blocks: [
        {
          type: "paragraph",
          text: "The Lambda Expressions lesson kept running into the same rule: a lambda can only go where a **functional interface** is expected. This lesson is about that other half of the deal.",
        },
        {
          type: "paragraph",
          text: "A functional interface is an interface with **exactly one abstract method**. That's the whole definition. `Runnable` has `run()`, `Comparator<T>` has `compare(T, T)`, `Function<T, R>` has `apply(T)`. Because there's only one method to fill in, a lambda can fill it in without saying which method it means.",
        },
        {
          type: "paragraph",
          text: "An interface can still have any number of `default` and `static` methods and stay functional. Those already have bodies, so they don't need filling in. They're actually where most of the useful tricks live: `andThen`, `compose`, `and`, `or`, `negate`. By the end of this lesson I want to be able to read the JDK's own `Function.andThen` in bytecode and see that it's just another lambda.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java had single-method interfaces long before it had lambdas. People called them **SAM types** (single abstract method):",
        },
        {
          type: "list",
          items: [
            "`Runnable` (Java 1.0), \"something to run on a thread\".",
            "`ActionListener` (Java 1.1), \"what to do when this button is clicked\".",
            "`Comparator` (Java 1.2), \"how to order two things\".",
            "`Callable` (Java 5), \"something to run that returns a value and may throw\".",
          ],
        },
        {
          type: "paragraph",
          text: "Java 8 (2014) didn't invent a new kind of type for lambdas. It made these existing SAM interfaces the target, and gave the idea a name. Three things arrived together:",
        },
        {
          type: "list",
          items: [
            "The `@FunctionalInterface` annotation, so the compiler can check the one-abstract-method rule for me.",
            "The `java.util.function` package with 43 general-purpose interfaces, so I don't have to invent `interface IntToBoolean` for every project. Libraries like Guava had their own `Function` and `Predicate` before, and every library's were incompatible.",
            "**Default methods** in interfaces. Without them, adding `andThen` to `Function` or `forEach` to `Iterable` would have broken every class that already implemented those interfaces.",
          ],
        },
        {
          type: "paragraph",
          text: "The package has barely changed since. Java 11 added the static `Predicate.not`. Everything else in this lesson is Java 8.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "A functional interface is a **wall socket**.",
        },
        {
          type: "list",
          items: [
            "The socket has one shape: three round pins, a certain size. That shape is the single abstract method: what goes in, what comes out.",
            "Any appliance with a matching plug works: a kettle, a phone charger, a fan. The socket doesn't care what the appliance does inside. That's the lambda: any code with the right shape fits.",
            "The socket might have a switch and a little light on it. Those are extra features built in, not things the appliance has to provide. That's a default method.",
            "A socket with two different plug holes that both must be used at once wouldn't accept a single plug. An interface with two abstract methods can't take a lambda.",
          ],
        },
        {
          type: "paragraph",
          text: "`java.util.function` is the box of standard socket types at the hardware shop. Before buying a custom socket, I check the standard ones first.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/functional-interfaces-family.svg",
          alt: "The four core functional interfaces with their shapes: Supplier () to T, Consumer T to void, Function T to R, Predicate T to boolean, plus BiFunction, UnaryOperator and BinaryOperator, and a note on primitive versions like IntPredicate",
          caption: "Read each interface as input → output: **Supplier**, **Consumer**, **Function** and **Predicate** cover most lambdas, and the primitive versions avoid boxing.",
        },
        {
          type: "heading",
          text: "A custom functional interface",
        },
        {
          type: "paragraph",
          text: "A cab fare rule: \"given a fare, return the new fare\". One abstract method, plus a default and a static that come along for free:",
        },
        {
          type: "code",
          language: "java",
          title: "FareRuleDemo.java",
          code: `@FunctionalInterface
interface FareRule {
    int apply(int fare);                                  // the one abstract method

    default FareRule then(FareRule next) {                // defaults don't count
        return fare -> next.apply(apply(fare));
    }

    static FareRule flat(int amount) {                    // statics don't count
        return fare -> fare + amount;
    }
}

public class FareRuleDemo {
    public static void main(String[] args) {
        FareRule night = fare -> fare + fare / 4;         // 25% extra
        FareRule toll = FareRule.flat(30);
        System.out.println(night.apply(200));
        System.out.println(night.then(toll).apply(200));
    }
}`,
        },
        {
          type: "output",
          text: `250
280`,
        },
        {
          type: "paragraph",
          text: "`then` is the interesting line. It's a default method that returns a **new** lambda: \"first apply me, then apply `next` to my result\". Night charge first (200 becomes 250), then the toll (280). That's exactly how the JDK's `andThen` works, as I'll show in Internal Working.",
        },
        {
          type: "heading",
          text: "What @FunctionalInterface checks",
        },
        {
          type: "paragraph",
          text: "The annotation is optional. Any interface with one abstract method works with lambdas, annotated or not. What it adds is a compile-time check, so nobody can quietly add a second abstract method later and break every lambda that uses the interface:",
        },
        {
          type: "code",
          language: "java",
          title: "TwoMethods.java",
          code: `@FunctionalInterface
interface OrderHandler {
    void accept(String order);
    void reject(String order);
}`,
        },
        {
          type: "output",
          text: `TwoMethods.java:1: error: Unexpected @FunctionalInterface annotation
@FunctionalInterface
^
  OrderHandler is not a functional interface
    multiple non-overriding abstract methods found in interface OrderHandler
1 error`,
        },
        {
          type: "paragraph",
          text: "It's like `@Override`: it doesn't change what the code does, it just makes the compiler hold me to my intention.",
        },
        {
          type: "heading",
          text: "Methods from Object don't count",
        },
        {
          type: "paragraph",
          text: "Here's one my notes got wrong. `Comparator` declares **two** abstract methods, yet it's a functional interface:",
        },
        {
          type: "code",
          language: "java",
          title: "ObjectMethods.java",
          code: `import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.Comparator;

public class ObjectMethods {
    public static void main(String[] args) {
        Arrays.stream(Comparator.class.getDeclaredMethods())
              .filter(m -> Modifier.isAbstract(m.getModifiers()))
              .map(Method::getName)
              .sorted()
              .forEach(name -> System.out.println("abstract: " + name));

        Comparator<String> byLength = (a, b) -> a.length() - b.length();
        System.out.println(byLength.compare("tea", "coffee"));
    }
}`,
        },
        {
          type: "output",
          text: `abstract: compare
abstract: equals
-3`,
        },
        {
          type: "paragraph",
          text: "`boolean equals(Object)` is redeclared in `Comparator` only to attach Javadoc to it. Every object already has a public `equals` from `Object`, so a lambda never needs to supply one. The JLS (9.8) says abstract methods matching public `Object` methods (`equals`, `hashCode`, `toString`) are ignored when counting.",
        },
        {
          type: "heading",
          text: "The method can't be generic",
        },
        {
          type: "paragraph",
          text: "The interface can be generic (`Function<T, R>`), but its single method can't have its own type parameter, because a lambda has no syntax to declare one:",
        },
        {
          type: "code",
          language: "java",
          title: "GenericMethod.java",
          code: `import java.util.List;

interface Picker {
    <T> T pick(List<T> items);
}

public class GenericMethod {
    public static void main(String[] args) {
        Picker first = items -> items.get(0);
    }
}`,
        },
        {
          type: "output",
          text: `GenericMethod.java:9: error: incompatible types: invalid functional descriptor for lambda expression
        Picker first = items -> items.get(0);
                       ^
    method <T>(List<T>)T in interface Picker is generic
  where T is a type-variable:
    T extends Object declared in method <T>pick(List<T>)
1 error`,
        },
        {
          type: "paragraph",
          text: "`Picker` is still a functional interface, and a method reference or an anonymous class can implement it. Only lambdas are ruled out. The fix is to move the type parameter up to the interface: `interface Picker<T> { T pick(List<T> items); }`.",
        },
        {
          type: "heading",
          text: "The java.util.function family",
        },
        {
          type: "paragraph",
          text: "I wanted the real count rather than \"about 40\", so I listed the package straight out of the JDK's runtime image:",
        },
        {
          type: "code",
          language: "java",
          title: "CountPackage.java",
          code: `import java.net.URI;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

public class CountPackage {
    public static void main(String[] args) throws Exception {
        Path dir = FileSystems.getFileSystem(URI.create("jrt:/"))
                .getPath("modules", "java.base", "java", "util", "function");
        try (Stream<Path> files = Files.list(dir)) {
            var names = files.map(p -> p.getFileName().toString().replace(".class", ""))
                    .filter(n -> !n.contains("$")).sorted().toList();
            System.out.println(names.size() + " interfaces");
            System.out.println(names);
        }
    }
}`,
        },
        {
          type: "output",
          text: `43 interfaces
[BiConsumer, BiFunction, BiPredicate, BinaryOperator, BooleanSupplier, Consumer, DoubleBinaryOperator, DoubleConsumer, DoubleFunction, DoublePredicate, DoubleSupplier, DoubleToIntFunction, DoubleToLongFunction, DoubleUnaryOperator, Function, IntBinaryOperator, IntConsumer, IntFunction, IntPredicate, IntSupplier, IntToDoubleFunction, IntToLongFunction, IntUnaryOperator, LongBinaryOperator, LongConsumer, LongFunction, LongPredicate, LongSupplier, LongToDoubleFunction, LongToIntFunction, LongUnaryOperator, ObjDoubleConsumer, ObjIntConsumer, ObjLongConsumer, Predicate, Supplier, ToDoubleBiFunction, ToDoubleFunction, ToIntBiFunction, ToIntFunction, ToLongBiFunction, ToLongFunction, UnaryOperator]`,
        },
        {
          type: "paragraph",
          text: "43 on JDK 21, the same 43 as in Java 8. It looks like a lot, but it's really seven ideas, plus primitive versions of them. These are the seven, with a food-order example each:",
        },
        {
          type: "table",
          headers: ["Interface", "Method", "Shape", "Everyday meaning"],
          rows: [
            ["`Predicate<T>`", "`boolean test(T)`", "T → boolean", "\"Is this dish vegetarian?\""],
            ["`Function<T, R>`", "`R apply(T)`", "T → R", "\"What does this dish cost?\""],
            ["`Consumer<T>`", "`void accept(T)`", "T → nothing", "\"Send this dish to the kitchen.\""],
            ["`Supplier<T>`", "`T get()`", "nothing → T", "\"What's today's special?\""],
            ["`BiFunction<T, U, R>`", "`R apply(T, U)`", "T, U → R", "\"Bill for this dish times this quantity.\""],
            ["`UnaryOperator<T>`", "`T apply(T)`", "T → T", "\"Make this dish spicy.\" Same type in and out"],
            ["`BinaryOperator<T>`", "`T apply(T, T)`", "T, T → T", "\"Add two amounts.\" Two of a type into one"],
          ],
        },
        {
          type: "paragraph",
          text: "`UnaryOperator<T>` is just `Function<T, T>` with a shorter name; it literally `extends Function<T, T>`. Same for `BinaryOperator<T>`, which extends `BiFunction<T, T, T>`. There are also `BiPredicate` and `BiConsumer` for two arguments. There's no `TriFunction`: past two arguments, the JDK expects me to write my own interface or group the arguments into an object.",
        },
        {
          type: "heading",
          text: "Primitive specialisations",
        },
        {
          type: "paragraph",
          text: "Generics only work with objects, so a `Function<Integer, Integer>` has to box every `int` into an `Integer` and back. To avoid that, most of the 43 are versions of the seven ideas for `int`, `long` and `double`. The names follow a pattern once I saw it:",
        },
        {
          type: "table",
          headers: ["Pattern", "Meaning", "Examples"],
          rows: [
            ["`IntXxx`", "Takes an `int`", "`IntPredicate`, `IntFunction<R>`, `IntConsumer`, `IntUnaryOperator`, `IntBinaryOperator`"],
            ["`ToIntXxx`", "Returns an `int`", "`ToIntFunction<T>`, `ToIntBiFunction<T, U>`"],
            ["`IntToLongXxx`", "Takes an `int`, returns a `long`", "`IntToLongFunction`, `IntToDoubleFunction`"],
            ["`ObjIntConsumer<T>`", "Takes an object and an `int`", "`ObjLongConsumer`, `ObjDoubleConsumer`"],
            ["`XxxSupplier`", "Returns a primitive", "`IntSupplier`, `LongSupplier`, `DoubleSupplier`, `BooleanSupplier`"],
          ],
        },
        {
          type: "paragraph",
          text: "Only `int`, `long` and `double` get versions (plus `BooleanSupplier`). There's no `CharPredicate` or `FloatFunction`: smaller types widen to `int`, `float` widens to `double`, and every extra primitive would have multiplied the package size. The method names change too, so it's always clear which one I'm calling: `applyAsInt`, `applyAsDouble`, `getAsBoolean`.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "A functional interface is a normal interface",
        },
        {
          type: "paragraph",
          text: "There's nothing special in the class file. `@FunctionalInterface` has runtime retention, but the JVM ignores it; it's only for `javac` and tools. When a lambda targets an interface, `LambdaMetafactory` generates a class that implements it, as shown in the Lambda Expressions lesson. So what's worth looking inside is the default methods, because they're what make composition work.",
        },
        {
          type: "heading",
          text: "How andThen and compose are implemented",
        },
        {
          type: "paragraph",
          text: "I disassembled `Function` straight from the JDK:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p java.util.function.Function",
        },
        {
          type: "output",
          text: `Compiled from "Function.java"
public interface java.util.function.Function<T, R> {
  public abstract R apply(T);

  public default <V> java.util.function.Function<V, R> compose(java.util.function.Function<? super V, ? extends T>);
    Code:
       0: aload_1
       1: invokestatic  #1                  // Method java/util/Objects.requireNonNull:(Ljava/lang/Object;)Ljava/lang/Object;
       4: pop
       5: aload_0
       6: aload_1
       7: invokedynamic #7,  0              // InvokeDynamic #0:apply:(Ljava/util/function/Function;Ljava/util/function/Function;)Ljava/util/function/Function;
      12: areturn

  public default <V> java.util.function.Function<T, V> andThen(java.util.function.Function<? super R, ? extends V>);
    Code:
       0: aload_1
       1: invokestatic  #1                  // Method java/util/Objects.requireNonNull:(Ljava/lang/Object;)Ljava/lang/Object;
       4: pop
       5: aload_0
       6: aload_1
       7: invokedynamic #11,  0             // InvokeDynamic #1:apply:(Ljava/util/function/Function;Ljava/util/function/Function;)Ljava/util/function/Function;
      12: areturn

  public static <T> java.util.function.Function<T, T> identity();
    Code:
       0: invokedynamic #12,  0             // InvokeDynamic #2:apply:()Ljava/util/function/Function;
       5: areturn

  private static java.lang.Object lambda$identity$2(java.lang.Object);
    Code:
       0: aload_0
       1: areturn

  private java.lang.Object lambda$andThen$1(java.util.function.Function, java.lang.Object);
    Code:
       0: aload_1
       1: aload_0
       2: aload_2
       3: invokeinterface #15,  2           // InterfaceMethod apply:(Ljava/lang/Object;)Ljava/lang/Object;
       8: invokeinterface #15,  2           // InterfaceMethod apply:(Ljava/lang/Object;)Ljava/lang/Object;
      13: areturn

  private java.lang.Object lambda$compose$0(java.util.function.Function, java.lang.Object);
    Code:
       0: aload_0
       1: aload_1
       2: aload_2
       3: invokeinterface #15,  2           // InterfaceMethod apply:(Ljava/lang/Object;)Ljava/lang/Object;
       8: invokeinterface #15,  2           // InterfaceMethod apply:(Ljava/lang/Object;)Ljava/lang/Object;
      13: areturn
}`,
        },
        {
          type: "paragraph",
          text: "That's the complete interface, and it's small. Translated back to Java, it matches the JDK source:",
        },
        {
          type: "code",
          language: "java",
          code: `default <V> Function<T, V> andThen(Function<? super R, ? extends V> after) {
    Objects.requireNonNull(after);
    return (T t) -> after.apply(apply(t));
}

default <V> Function<V, R> compose(Function<? super V, ? extends T> before) {
    Objects.requireNonNull(before);
    return (V v) -> apply(before.apply(v));
}

static <T> Function<T, T> identity() {
    return t -> t;
}`,
        },
        {
          type: "paragraph",
          text: "Reading the bytecode line by line:",
        },
        {
          type: "list",
          items: [
            "`Objects.requireNonNull(after)` runs **right away**, when the pipeline is built, not when it's used. A `null` step fails early. That's a design choice I'll come back to in Common Mistakes.",
            "`aload_0; aload_1; invokedynamic ...apply:(Function;Function;)Function;` creates a capturing lambda. It captures two things: `this` (the first function) and `after`. So composing doesn't run anything; it builds a new small object that holds both functions.",
            "`lambda$andThen$1` is an instance method (slot 0 is `this`) taking `after` and `t`. It pushes `after` (`aload_1`), then `this` and `t`, calls `this.apply(t)` with the first `invokeinterface`, and passes the result to `after.apply(...)` with the second. First me, then after.",
            "`lambda$compose$0` is the mirror image: it pushes `this` first, calls `before.apply(v)` first, and passes the result to `this.apply(...)`. First before, then me.",
            "`identity()` is a non-capturing lambda, `t -> t`, so on HotSpot every call returns the same object. `Function.identity() == Function.identity()` printed `true` when I tried it, but just like any lambda identity, that's an implementation detail.",
          ],
        },
        {
          type: "paragraph",
          text: "So `f.andThen(g).andThen(h)` builds a little chain of objects: an outer lambda holding (inner lambda, `h`), where the inner one holds (`f`, `g`). Calling `apply` walks down the chain. It's the composite pattern, written with lambdas.",
        },
        {
          type: "heading",
          text: "Predicate.and short-circuits like &&",
        },
        {
          type: "output",
          text: `  public default java.util.function.Predicate<T> and(java.util.function.Predicate<? super T>);
    Code:
       0: aload_1
       1: invokestatic  #1                  // Method java/util/Objects.requireNonNull:(Ljava/lang/Object;)Ljava/lang/Object;
       4: pop
       5: aload_0
       6: aload_1
       7: invokedynamic #7,  0              // InvokeDynamic #0:test:(Ljava/util/function/Predicate;Ljava/util/function/Predicate;)Ljava/util/function/Predicate;
      12: areturn

  private boolean lambda$and$0(java.util.function.Predicate, java.lang.Object);
    Code:
       0: aload_0
       1: aload_2
       2: invokeinterface #32,  2           // InterfaceMethod test:(Ljava/lang/Object;)Z
       7: ifeq          24
      10: aload_1
      11: aload_2
      12: invokeinterface #32,  2           // InterfaceMethod test:(Ljava/lang/Object;)Z
      17: ifeq          24
      20: iconst_1
      21: goto          25
      24: iconst_0
      25: ireturn`,
        },
        {
          type: "paragraph",
          text: "Same structure, and the lambda body is `(t) -> test(t) && other.test(t)`. The `ifeq 24` right after the first `test` is the `&&`: if the first predicate says false, it jumps straight to `iconst_0` and the second predicate is never called. `or` short-circuits the same way, and `negate` is just `t -> !test(t)`.",
        },
        {
          type: "heading",
          text: "Where boxing happens",
        },
        {
          type: "paragraph",
          text: "Generics are erased, so at the bytecode level `Function.apply` takes an `Object` and returns an `Object`. I compiled the same lambda twice, once as `Function<Integer, Integer>` and once as `IntUnaryOperator`:",
        },
        {
          type: "code",
          language: "java",
          title: "Boxing.java",
          code: `import java.util.function.Function;
import java.util.function.IntUnaryOperator;

public class Boxing {
    public static void main(String[] args) {
        Function<Integer, Integer> boxed = km -> km * 12;
        IntUnaryOperator primitive = km -> km * 12;
        int a = boxed.apply(10);
        int b = primitive.applyAsInt(10);
        System.out.println(a + " " + b);
    }
}`,
        },
        {
          type: "output",
          text: `120 120`,
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p Boxing     # trimmed",
        },
        {
          type: "output",
          text: `      12: aload_1
      13: bipush        10
      15: invokestatic  #15                 // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
      18: invokeinterface #21,  2           // InterfaceMethod java/util/function/Function.apply:(Ljava/lang/Object;)Ljava/lang/Object;
      23: checkcast     #16                 // class java/lang/Integer
      26: invokevirtual #26                 // Method java/lang/Integer.intValue:()I
      29: istore_3
      30: aload_2
      31: bipush        10
      33: invokeinterface #30,  2           // InterfaceMethod java/util/function/IntUnaryOperator.applyAsInt:(I)I
      38: istore        4
  ...
  private static int lambda$main$1(int);
    Code:
       0: iload_0
       1: bipush        12
       3: imul
       4: ireturn

  private static java.lang.Integer lambda$main$0(java.lang.Integer);
    Code:
       0: aload_0
       1: invokevirtual #26                 // Method java/lang/Integer.intValue:()I
       4: bipush        12
       6: imul
       7: invokestatic  #15                 // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
      10: areturn`,
        },
        {
          type: "paragraph",
          text: "For the boxed version, one call does four extra steps: `Integer.valueOf` to box `10` at the call site, `intValue` to unbox it inside the lambda, `Integer.valueOf` again to box the result, then a `checkcast` and `intValue` back at the call site (the `checkcast` is there because erased `apply` returns `Object`). The primitive version is just `iload`, `imul`, `ireturn`. `Integer.valueOf` only returns cached objects for -128 to 127; anything else is a new allocation.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "The seven core interfaces, each in one line, on a food stall:",
        },
        {
          type: "code",
          language: "java",
          title: "CoreFamily.java",
          code: `import java.util.function.*;

public class CoreFamily {
    public static void main(String[] args) {
        Predicate<String> isVeg = dish -> !dish.contains("chicken");      // T -> boolean
        Function<String, Integer> price = dish -> dish.length() * 10;      // T -> R
        Consumer<String> kitchen = dish -> System.out.println("cooking " + dish); // T -> void
        Supplier<String> todaysSpecial = () -> "paneer roll";              // () -> T
        BiFunction<String, Integer, String> bill = (dish, qty) -> qty + " x " + dish;
        UnaryOperator<String> spicy = dish -> dish + " (spicy)";           // T -> T
        BinaryOperator<Integer> total = (a, b) -> a + b;                   // (T, T) -> T

        String dish = todaysSpecial.get();
        System.out.println(isVeg.test(dish) + " " + isVeg.test("chicken roll"));
        System.out.println(price.apply(dish));
        kitchen.accept(spicy.apply(dish));
        System.out.println(bill.apply(dish, 2));
        System.out.println(total.apply(110, 40));
    }
}`,
        },
        {
          type: "output",
          text: `true false
110
cooking paneer roll (spicy)
2 x paneer roll
150`,
        },
        {
          type: "paragraph",
          text: "The pricing rule is silly on purpose (ten rupees per letter, so \"paneer roll\" is 110). The point is the method each interface uses: `test`, `apply`, `accept`, `get`. Mixing those up is the most common compile error with this package.",
        },
        {
          type: "heading",
          text: "The primitive versions",
        },
        {
          type: "code",
          language: "java",
          title: "Primitives.java",
          code: `import java.util.function.*;

public class Primitives {
    public static void main(String[] args) {
        IntPredicate longRide = km -> km > 20;                 // int -> boolean
        IntUnaryOperator fare = km -> 50 + km * 12;            // int -> int
        IntBinaryOperator addTip = (amount, tip) -> amount + tip;
        ToIntFunction<String> seats = car -> car.equals("SUV") ? 6 : 4;  // T -> int
        IntFunction<String> label = n -> n + " km";            // int -> R
        IntToDoubleFunction inMiles = km -> km * 0.621371;     // int -> double
        ObjIntConsumer<String> log = (driver, trips) -> System.out.println(driver + ": " + trips);
        BooleanSupplier surgeOn = () -> true;

        System.out.println(longRide.test(25) + " " + fare.applyAsInt(10) + " " + addTip.applyAsInt(170, 20));
        System.out.println(seats.applyAsInt("SUV") + " " + label.apply(8) + " " + inMiles.applyAsDouble(10));
        log.accept("Asha", 12);
        System.out.println(surgeOn.getAsBoolean());
    }
}`,
        },
        {
          type: "output",
          text: `true 170 190
6 8 km 6.21371
Asha: 12
true`,
        },
        {
          type: "heading",
          text: "Composition methods",
        },
        {
          type: "table",
          headers: ["On", "Method", "Result"],
          rows: [
            ["`Function`", "`f.andThen(g)`", "`x -> g(f(x))`: f first"],
            ["`Function`", "`f.compose(g)`", "`x -> f(g(x))`: g first"],
            ["`Function`", "`Function.identity()`", "`x -> x`"],
            ["`Predicate`", "`p.and(q)`, `p.or(q)`", "Short-circuit `&&` and `||`"],
            ["`Predicate`", "`p.negate()`", "`!p`"],
            ["`Predicate`", "`Predicate.not(p)` (Java 11)", "Same as `negate`, but static, handy with method references"],
            ["`Predicate`", "`Predicate.isEqual(x)`", "`y -> Objects.equals(x, y)`, null-safe"],
            ["`Consumer`", "`c.andThen(d)`", "Run c, then d, same input"],
            ["`BiFunction`", "`f.andThen(g)`", "Two inputs into f, its result into g"],
            ["`UnaryOperator`", "`UnaryOperator.identity()`", "`x -> x`, typed as `UnaryOperator`"],
            ["`BinaryOperator`", "`minBy(cmp)`, `maxBy(cmp)`", "Pick the smaller or larger by a `Comparator`"],
          ],
        },
        {
          type: "paragraph",
          text: "`Supplier` has no composition methods at all, and the primitive interfaces have only some of them (`IntPredicate` has `and`, `or`, `negate`; `IntUnaryOperator` has `andThen` and `compose`).",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Composition in action",
        },
        {
          type: "paragraph",
          text: "A cab fare with a toll and a \"double it\" rule, and a menu filter. The order of `andThen` and `compose` changes the answer:",
        },
        {
          type: "code",
          language: "java",
          title: "Compose.java",
          code: `import java.util.function.*;

public class Compose {
    public static void main(String[] args) {
        Function<Integer, Integer> addToll = fare -> fare + 30;
        Function<Integer, Integer> doubleIt = fare -> fare * 2;

        System.out.println(addToll.andThen(doubleIt).apply(100));  // (100 + 30) * 2
        System.out.println(addToll.compose(doubleIt).apply(100));  // (100 * 2) + 30
        System.out.println(Function.<Integer>identity().apply(100));

        Predicate<String> isVeg = d -> !d.contains("chicken");
        Predicate<String> isCheap = d -> d.length() < 10;
        System.out.println(isVeg.and(isCheap).test("dosa"));
        System.out.println(isVeg.or(isCheap).test("chicken"));
        System.out.println(isVeg.negate().test("dosa"));
        System.out.println(Predicate.not(isVeg).test("chicken biryani"));   // Java 11
        System.out.println(Predicate.isEqual("tea").test("tea"));

        Consumer<String> print = s -> System.out.println("print " + s);
        Consumer<String> sms = s -> System.out.println("sms " + s);
        print.andThen(sms).accept("order #7");

        BinaryOperator<Integer> cheaper = BinaryOperator.minBy(Integer::compare);
        System.out.println(cheaper.apply(180, 150));
        UnaryOperator<String> same = UnaryOperator.identity();
        System.out.println(same.apply("unchanged"));
    }
}`,
        },
        {
          type: "output",
          text: `260
230
100
true
true
false
true
true
print order #7
sms order #7
150
unchanged`,
        },
        {
          type: "list",
          items: [
            "`andThen` reads left to right, in the order things happen: toll, then double, 260. `compose` reads like maths, `addToll(doubleIt(x))`: double first, then toll, 230. I mostly use `andThen` because it reads in the order things happen.",
            "`isVeg.or(isCheap).test(\"chicken\")` is `true` because \"chicken\" is 7 letters, so it's \"cheap\" by this toy rule even though it's not veg.",
            "`Function.<Integer>identity()` needs the explicit type here only because I call `apply` on it directly. Passed into a method that expects a `Function`, inference handles it.",
            "`Consumer.andThen` passes the **same** input to both: printing the order and texting it. It's a handy way to add a side step like logging.",
          ],
        },
        {
          type: "heading",
          text: "Your own interface for checked exceptions",
        },
        {
          type: "paragraph",
          text: "The standard interfaces can't throw checked exceptions. When I have a method that reads a file, the clean way is a tiny interface of my own that declares the exception, plus a helper that converts it into a normal `Function`:",
        },
        {
          type: "code",
          language: "java",
          title: "Throwing.java",
          code: `import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.function.Function;

public class Throwing {
    @FunctionalInterface
    interface ThrowingFunction<T, R> {
        R apply(T t) throws IOException;
    }

    // Turns a "throws IOException" function into a plain Function
    static <T, R> Function<T, R> unchecked(ThrowingFunction<T, R> f) {
        return t -> {
            try {
                return f.apply(t);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        };
    }

    static String readMenu(String file) throws IOException {
        if (file.startsWith("missing")) throw new IOException("no such file: " + file);
        return "menu of " + file;
    }

    public static void main(String[] args) {
        List<String> files = List.of("stall-1.txt", "missing.txt");
        try {
            files.stream().map(unchecked(file -> readMenu(file))).forEach(menu -> System.out.println(menu));
        } catch (UncheckedIOException e) {
            System.out.println("failed: " + e.getCause().getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `menu of stall-1.txt
failed: no such file: missing.txt`,
        },
        {
          type: "paragraph",
          text: "The lambda `file -> readMenu(file)` targets `ThrowingFunction`, whose method says `throws IOException`, so it compiles. `unchecked` wraps it in a regular `Function` that turns the checked exception into `UncheckedIOException`, keeping the original as the cause, so nothing is swallowed.",
        },
        {
          type: "heading",
          text: "Supplier for laziness",
        },
        {
          type: "paragraph",
          text: "A `Supplier` is a value I haven't computed yet. That's useful when computing it is expensive and might not be needed. The classic Java 8 example is `Optional.orElse` against `orElseGet`:",
        },
        {
          type: "code",
          language: "java",
          title: "LazySupplier.java",
          code: `import java.util.Optional;

public class LazySupplier {
    static String callDriverApi() {
        System.out.println("  (slow API call made)");
        return "nearest driver";
    }

    public static void main(String[] args) {
        Optional<String> cached = Optional.of("cached driver");

        System.out.println("orElse:");
        System.out.println(cached.orElse(callDriverApi()));             // argument runs first
        System.out.println("orElseGet:");
        System.out.println(cached.orElseGet(() -> callDriverApi()));    // Supplier, never called
    }
}`,
        },
        {
          type: "output",
          text: `orElse:
  (slow API call made)
cached driver
orElseGet:
cached driver`,
        },
        {
          type: "paragraph",
          text: "`orElse(callDriverApi())` makes the slow call **before** `orElse` even starts, because Java evaluates arguments first, and then throws the result away because the cache had a value. `orElseGet` takes a `Supplier`, the instruction rather than the result, and only calls it when the `Optional` is empty. Same idea as `Map.computeIfAbsent` and logging APIs that take a `Supplier<String>` for the message.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Mixing up andThen and compose",
        },
        {
          type: "paragraph",
          text: "Same two steps, 260 versus 230 in the example above. When the order matters (and with money it always does), I use `andThen` and read it as \"then\". If a teammate's code uses `compose`, I read it from right to left.",
        },
        {
          type: "heading",
          text: "A null step in a pipeline",
        },
        {
          type: "code",
          language: "java",
          title: "NullAndThen.java",
          code: `import java.util.function.Function;

public class NullAndThen {
    public static void main(String[] args) {
        Function<Integer, Integer> addToll = fare -> fare + 30;
        Function<Integer, Integer> discount = null;          // forgot to configure
        Function<Integer, Integer> pipeline = addToll.andThen(discount);
        System.out.println("built pipeline");
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.NullPointerException
	at java.base/java.util.Objects.requireNonNull(Objects.java:233)
	at java.base/java.util.function.Function.andThen(Function.java:87)
	at NullAndThen.main(NullAndThen.java:7)`,
        },
        {
          type: "paragraph",
          text: "It fails while **building** the pipeline, on line 7, before any fare is calculated. That's the `requireNonNull` I saw at the top of `andThen` in the bytecode. It's a good thing: without it, the NPE would show up much later, inside some ride's fare calculation, far from where the mistake was made. When a step is optional, I use `Function.identity()` instead of `null`.",
        },
        {
          type: "heading",
          text: "Using Function<Integer, Integer> for numbers in hot code",
        },
        {
          type: "paragraph",
          text: "It compiles and gives the same answer, but every call boxes. The Performance section measures it. In code that runs a million times, `IntUnaryOperator`, `ToIntFunction` and friends are the right choice.",
        },
        {
          type: "heading",
          text: "Calling the wrong method name",
        },
        {
          type: "list",
          items: [
            "`supplier.apply()` instead of `supplier.get()`, or `predicate.apply(x)` instead of `predicate.test(x)`.",
            "`intOp.apply(5)` instead of `intOp.applyAsInt(5)`. The primitive versions have their own names on purpose.",
            "`consumer.accept(x)` expecting a value back. A `Consumer` returns nothing; if I need a result, it should be a `Function`.",
          ],
        },
        {
          type: "heading",
          text: "Inventing an interface that already exists",
        },
        {
          type: "paragraph",
          text: "`interface Validator<T> { boolean validate(T t); }` is a `Predicate<T>` without `and`, `or` and `negate`, and it won't plug into `removeIf` or `filter`. A custom interface is worth it only when it adds something: a domain name that makes code clearer, a `throws` clause, a third parameter, or extra default methods.",
        },
        {
          type: "heading",
          text: "Adding a second abstract method to a shared interface",
        },
        {
          type: "paragraph",
          text: "Every lambda written against it stops compiling. That's what `@FunctionalInterface` is for: put it on every interface meant for lambdas, and the mistake gets caught in the interface's own file instead of in fifty callers.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Look in `java.util.function` first. If the shape exists there, use it; callers already know it and it works with the JDK's methods.",
            "Annotate custom functional interfaces with `@FunctionalInterface`. It documents the intent and the compiler enforces it.",
            "Use primitive specialisations (`IntPredicate`, `ToIntFunction`, `IntBinaryOperator`) for numbers in anything performance-sensitive.",
            "Give a custom interface a domain name when it helps readers: `FareRule` says more than `UnaryOperator<Integer>` in a pricing class. It can even extend the standard one to keep its default methods.",
            "Build pipelines with `andThen` so the code reads in the order things happen, and use `Function.identity()` rather than `null` for \"no step\".",
            "Accept the most general type in parameters: `Predicate<? super T>` and `Function<? super T, ? extends R>`, as the JDK does, so callers can pass a `Predicate<Object>` where a `Predicate<String>` is expected.",
            "Don't overload a method on two functional interfaces with the same shape; a lambda can't choose between them.",
            "Keep the lambdas you put into these interfaces free of side effects, except for `Consumer`, which exists for side effects.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The only real cost specific to functional interfaces is boxing. I measured the bytes allocated by a million calls through each version, using the per-thread allocation counter from `com.sun.management.ThreadMXBean`:",
        },
        {
          type: "code",
          language: "java",
          title: "BoxingCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.function.Function;
import java.util.function.IntUnaryOperator;

public class BoxingCost {
    static final com.sun.management.ThreadMXBean MX =
            (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();

    public static void main(String[] args) {
        Function<Integer, Integer> boxed = km -> km * 12;
        IntUnaryOperator primitive = km -> km * 12;

        long before = MX.getCurrentThreadAllocatedBytes();
        long sum1 = 0;
        for (int km = 0; km < 1_000_000; km++) sum1 += boxed.apply(km);
        long boxedBytes = MX.getCurrentThreadAllocatedBytes() - before;

        before = MX.getCurrentThreadAllocatedBytes();
        long sum2 = 0;
        for (int km = 0; km < 1_000_000; km++) sum2 += primitive.applyAsInt(km);
        long primitiveBytes = MX.getCurrentThreadAllocatedBytes() - before;

        System.out.println("same answer: " + (sum1 == sum2));
        System.out.printf("Function<Integer,Integer>: %,d bytes%n", boxedBytes);
        System.out.printf("IntUnaryOperator:          %,d bytes%n", primitiveBytes);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java BoxingCost         # three runs
java -Xint BoxingCost   # interpreter only, two runs`,
        },
        {
          type: "table",
          headers: ["Run", "`Function<Integer, Integer>`", "`IntUnaryOperator`"],
          rows: [
            ["Default (JIT on), run 1", "8,540,688 bytes", "0 bytes"],
            ["Default, run 2", "8,824,880 bytes", "0 bytes"],
            ["Default, run 3", "9,087,408 bytes", "0 bytes"],
            ["`-Xint`, both runs", "31,997,944 bytes", "0 bytes"],
          ],
        },
        {
          type: "list",
          items: [
            "With the interpreter, the boxed version allocated almost exactly 32 bytes per call: two 16-byte `Integer` objects, one for the argument and one for the result. The few thousand bytes short of 32 million are the small values that hit the `Integer` cache.",
            "With the JIT on, it dropped to about 8.5 to 9 MB and changed every run. Once the loop was compiled, inlining plus escape analysis removed most of the boxes; what's left was allocated before the JIT kicked in. The JIT can rescue boxed code, but only sometimes, and I can't count on it.",
            "The primitive version allocated nothing in every run.",
            "These are my numbers on JDK 21; they'll vary by machine and run. The 32-bytes-per-call figure is the stable part.",
          ],
        },
        {
          type: "paragraph",
          text: "Composition has a small cost too: each `andThen` adds one object and one extra interface call per `apply`. For a chain of three fare rules that's nothing. For a pipeline rebuilt on every request it's still small, but building it once and reusing it (in a field, say) is free and clearer.",
        },
      ],
    },
    {
      title: "Functional Interfaces in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A realistic, small case: quoting a cab fare. There's a base fare, then a few rules applied in order: a night charge, a cap for long trips, and a first-ride coupon. Each rule is a `UnaryOperator<Integer>` (fare in, fare out), the conditions are `Predicate`s, and `andThen` lines them up in the order they apply:",
        },
        {
          type: "code",
          language: "java",
          title: "FareService.java",
          code: `import java.util.function.Predicate;
import java.util.function.UnaryOperator;

// In a Spring app: @Service, with the rules coming from config
public class FareService {
    record Ride(int km, boolean night, boolean firstRide) {}

    private final Predicate<Ride> isLong = ride -> ride.km() > 20;
    private final Predicate<Ride> hasCoupon = ride -> ride.firstRide();

    public int quote(Ride ride) {
        UnaryOperator<Integer> nightCharge = fare -> ride.night() ? fare + fare / 4 : fare;
        UnaryOperator<Integer> longTripCap = fare -> isLong.test(ride) ? Math.min(fare, 400) : fare;
        UnaryOperator<Integer> coupon = fare -> hasCoupon.test(ride) ? fare - 50 : fare;

        int base = 50 + ride.km() * 12;
        return nightCharge.andThen(longTripCap).andThen(coupon).apply(base);
    }

    public static void main(String[] args) {
        FareService service = new FareService();
        System.out.println(service.quote(new Ride(10, false, false)));
        System.out.println(service.quote(new Ride(10, true, false)));
        System.out.println(service.quote(new Ride(30, true, true)));
    }
}`,
        },
        {
          type: "output",
          text: `170
212
350`,
        },
        {
          type: "list",
          items: [
            "10 km by day: 50 + 10 × 12 = 170, no rule changes it.",
            "10 km at night: 170 plus a quarter (42, integer division) = 212.",
            "30 km at night, first ride: base 410, night charge to 512, capped at 400, minus the 50 coupon = 350. The order matters: with the coupon before the cap, it would have been 400.",
            "`record Ride` is Java 16; on Java 8 it would be a small class with three final fields and getters.",
            "Each rule is one line and does one thing. Adding a \"rain surcharge\" is one more `UnaryOperator` and one more `andThen`, without touching the others.",
          ],
        },
        {
          type: "paragraph",
          text: "In a real codebase I'd use `BigDecimal` or integer paise for money, and the rules might be Spring beans collected into a `List<UnaryOperator<Fare>>` and reduced with `andThen`. In the ride-booking backend I've worked on (RideX), functional interfaces also show up as `Predicate`s for driver eligibility (online, nearby, right vehicle type) combined with `and`, and as `Supplier`s for values that are only fetched when needed.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "Spring uses them everywhere",
          text: "Spring's own APIs are full of functional interfaces: `TransactionCallback` for `TransactionTemplate.execute`, `RowMapper` for `JdbcTemplate`, `ObjectProvider.getIfAvailable(Supplier)`, and Spring Cloud Function, which turns a plain `Function<T, R>` bean into an HTTP endpoint or message handler.",
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
              question: "What is a functional interface?",
              answer:
                "An interface with exactly one abstract method. It can have any number of default and static methods. Examples are `Runnable`, `Comparator`, `Callable`, and everything in `java.util.function`.\n\nIt's the only kind of type a lambda or method reference can be converted to, because with one abstract method there's no doubt which method the lambda implements, and the interface supplies the parameter and return types.",
            },
            {
              question: "Is the @FunctionalInterface annotation required?",
              answer:
                "No. Any interface with a single abstract method works with lambdas, annotated or not; `Runnable` worked with lambdas without anyone changing it in a way that mattered.\n\nThe annotation asks the compiler to check the rule. If someone adds a second abstract method, the interface itself fails with \"Unexpected @FunctionalInterface annotation ... multiple non-overriding abstract methods found\", instead of every lambda that uses it breaking.",
            },
            {
              question: "Can a functional interface have default and static methods?",
              answer:
                "Yes, as many as it likes. Only abstract methods count. `Function` has `andThen` and `compose` as defaults and `identity` as a static, and it's still functional.\n\nThose default methods are what make composition possible: they build new lambdas out of existing ones.",
            },
            {
              question: "Name the main interfaces in java.util.function and their methods.",
              answer:
                "`Predicate<T>` with `boolean test(T)`, `Function<T, R>` with `R apply(T)`, `Consumer<T>` with `void accept(T)`, `Supplier<T>` with `T get()`, `BiFunction<T, U, R>` with `R apply(T, U)`, `UnaryOperator<T>` (a `Function<T, T>`), and `BinaryOperator<T>` (a `BiFunction<T, T, T>`). There are also `BiPredicate` and `BiConsumer`.\n\nThe rest of the 43 are primitive versions of these for `int`, `long` and `double`, like `IntPredicate`, `ToIntFunction` and `IntBinaryOperator`.",
            },
            {
              question: "What's the difference between Function and UnaryOperator?",
              answer:
                "`UnaryOperator<T>` extends `Function<T, T>`. It's a `Function` whose input and output types are the same, like \"make this dish spicy\" from `String` to `String`. Same for `BinaryOperator<T>` and `BiFunction<T, T, T>`.\n\nIt saves repeating the type and says something about intent. It also has its own `identity()` returning a `UnaryOperator`, which matters for methods like `List.replaceAll` that take a `UnaryOperator`.",
            },
            {
              question: "What's the difference between Consumer and Supplier?",
              answer:
                "They're opposites. A `Consumer<T>` takes a value and returns nothing, `accept(T)`, used for side effects like printing or saving. A `Supplier<T>` takes nothing and returns a value, `get()`, used to produce something on demand.\n\nSupplier's big use is laziness: `Optional.orElseGet(supplier)` only calls it when needed, while `orElse(value)` evaluates the value up front. In my test, `orElse` made a slow API call even though the result was thrown away.",
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
              question: "Comparator has two abstract methods, compare and equals. How is it a functional interface?",
              answer:
                "Because abstract methods that match public methods of `Object` don't count (JLS 9.8). Every implementing object already inherits `equals` from `Object`, so a lambda never has to provide it. `Comparator` redeclares `equals` only to document it.\n\nI checked with reflection: `Comparator.class` reports both `compare` and `equals` as abstract, and a lambda still works. The same applies to `hashCode` and `toString`.",
            },
            {
              question: "What's the difference between andThen and compose?",
              answer:
                "The order. `f.andThen(g)` runs `f` first, then `g` on its result: `g(f(x))`. `f.compose(g)` runs `g` first: `f(g(x))`.\n\nWith `addToll` (+30) and `doubleIt` (×2) on 100, `andThen` gave 260 and `compose` gave 230. In the bytecode they're mirror images: `lambda$andThen$1` calls `this.apply` first, `lambda$compose$0` calls `before.apply` first.",
            },
            {
              question: "Why can't a lambda implement an interface whose method is generic?",
              answer:
                "Because lambda syntax has nowhere to declare a type parameter. For `interface Picker { <T> T pick(List<T> items); }`, the lambda `items -> items.get(0)` gives \"invalid functional descriptor for lambda expression ... method <T>(List<T>)T in interface Picker is generic\".\n\nThe interface is still functional, so a method reference to a generic method or an anonymous class works. The usual fix is to make the interface generic instead: `Picker<T>`.",
            },
            {
              question: "Why is there no TriFunction or CharPredicate in the JDK?",
              answer:
                "To keep the package from exploding. Every extra arity or primitive type multiplies the number of interfaces. The JDK stopped at two arguments and at `int`, `long` and `double`, since `byte`, `short` and `char` widen to `int` and `float` widens to `double`. Even so, it's 43 interfaces.\n\nFor three arguments, I write my own `@FunctionalInterface` or, usually better, group the arguments into an object or record.",
            },
            {
              question: "How do you use a lambda that throws a checked exception with the standard interfaces?",
              answer:
                "The standard methods like `apply` and `accept` don't declare checked exceptions, so the lambda can't throw one directly. Either catch it inside the lambda and rethrow it unchecked, or define a small `ThrowingFunction<T, R>` whose `apply` declares `throws IOException` and a helper that wraps it into a `Function`, rethrowing as `UncheckedIOException`.\n\nThe important part is to keep the original exception as the cause, so the stack trace and message survive. My `unchecked` helper did that, and the caller printed \"no such file: missing.txt\" from `getCause()`.",
            },
            {
              question: "What happens if you pass null to andThen?",
              answer:
                "It throws `NullPointerException` immediately, when the composed function is built, not when it's called. `andThen` starts with `Objects.requireNonNull(after)`, which I saw as the first instructions in its bytecode.\n\nThat's deliberate fail-fast design. Otherwise the error would appear much later, at the first `apply`, far from the mistake. For an optional step, pass `Function.identity()`.",
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
              question: "How is Function.andThen implemented?",
              answer:
                "It's a default method that checks `after` isn't null and returns a new lambda: `(T t) -> after.apply(apply(t))`. In bytecode, it's `requireNonNull`, then an `invokedynamic` that captures `this` and `after`, and a private `lambda$andThen$1` that calls `this.apply(t)` and passes the result to `after.apply`.\n\nSo composing doesn't run anything. It builds a small object holding two functions, and a long chain is a nest of such objects that `apply` walks through.",
            },
            {
              question: "Does Predicate.and short-circuit?",
              answer:
                "Yes. Its lambda is `t -> test(t) && other.test(t)`, and in the bytecode there's an `ifeq` right after the first `test` call that jumps to `iconst_0`, skipping the second predicate when the first is false. `or` short-circuits the same way when the first is true.\n\nThat matters when the second predicate is expensive or would fail on some inputs, like a null check followed by a method call.",
            },
            {
              question: "Why do primitive functional interfaces exist? What does boxing actually cost?",
              answer:
                "Generics only work with reference types, and after erasure `Function.apply` takes and returns `Object`. So a `Function<Integer, Integer>` call boxes the argument with `Integer.valueOf`, unboxes it in the lambda, boxes the result, and the caller does a `checkcast` and `intValue`. I saw all four in `javap`.\n\nI measured a million calls: with the interpreter, almost exactly 32 bytes per call, two 16-byte `Integer`s; with the JIT, about 8.5 to 9 MB, varying by run, because escape analysis removed some of it. `IntUnaryOperator` allocated zero bytes every time.",
            },
            {
              question: "What does the JVM do with the @FunctionalInterface annotation at runtime?",
              answer:
                "Nothing. It has runtime retention, so reflection can see it, but the JVM doesn't use it. It's only a compile-time check for `javac`, like `@Override`.\n\nA functional interface is an ordinary interface in the class file. What makes lambdas work is `LambdaMetafactory` generating a class that implements whichever interface the lambda targets, annotated or not.",
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
            "Write a `Predicate<Integer>` for \"fare above 200\" and another for \"fare is even\". Test 240, 199 and 300 against `and`, `or` and `negate` versions. Predict each result before running.",
            "Write two `Function<String, String>`s: `trim` and `toUpperCase`. Apply them to `\"  masala chai \"` with `andThen` and with `compose`. Does the order matter here? Then add a third function that appends \"!\" and check again.",
            "Write a `@FunctionalInterface` called `TipCalculator` with `int tip(int bill)`, add a default method `withMinimum(int min)` that returns a new `TipCalculator` never giving less than `min`. Try adding a second abstract method and read the error.",
            "Rewrite a `Function<Integer, Integer>` that squares a number as an `IntUnaryOperator`. Run `javap -c -p` on both and find the `Integer.valueOf` calls that disappear.",
            "Use `BinaryOperator.maxBy` with a `Comparator` to pick the longer of two dish names.",
            "Write a `Supplier<String>` that prints \"computing\" and returns a value. Pass it to `Optional.of(\"x\").orElseGet(...)` and `Optional.empty().orElseGet(...)`. Which one prints?",
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Answer for 1",
              answer:
                "With `above200 = f -> f > 200` and `even = f -> f % 2 == 0`: 240 is `true` for `and`, `or`, and `false` for `above200.negate()`. 199 is `false` for `and` and `or`, and `true` for the negated one. 300 is like 240.\n\nThe interesting check is 199 with `and`: because of short-circuiting, `even` is never even called.",
            },
            {
              question: "Answer for 2",
              answer:
                "For trim and uppercase, the order doesn't matter: `andThen` and `compose` both give `MASALA CHAI`. Some steps simply commute.\n\nThe \"!\" step does care. `trim.andThen(up).andThen(bang)` gives `MASALA CHAI!`, but `bang.andThen(trim).andThen(up)` gives `MASALA CHAI !` with a stray space: the \"!\" was added after the trailing space, so `trim` no longer sees that space at the end.",
            },
            {
              question: "Hint for 3",
              answer:
                "The default method can return a lambda that calls the original: `return bill -> Math.max(min, tip(bill));`. That's the same pattern as `andThen` in the JDK.\n\nWith a second abstract method, the error is \"Unexpected @FunctionalInterface annotation\" followed by \"multiple non-overriding abstract methods found in interface TipCalculator\".",
            },
            {
              question: "Answer for 6",
              answer:
                "Only the empty `Optional` prints \"computing\". `orElseGet` calls the supplier only when there's no value. Swap in `orElse(supplier.get())` and both print, because the argument is evaluated before `orElse` runs.",
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
          text: `DEFINITION   interface with exactly ONE abstract method
             defaults, statics, Object's public methods don't count
             @FunctionalInterface = compile-time check only

CORE SEVEN   Predicate<T>        test(T)      T -> boolean
             Function<T,R>       apply(T)     T -> R
             Consumer<T>         accept(T)    T -> void
             Supplier<T>         get()        () -> T
             BiFunction<T,U,R>   apply(T,U)   T,U -> R
             UnaryOperator<T>    apply(T)     T -> T
             BinaryOperator<T>   apply(T,T)   T,T -> T

PRIMITIVES   IntXxx (takes int)  ToIntXxx (returns int)
             int, long, double only; 43 interfaces in total
             applyAsInt / applyAsDouble / getAsBoolean

COMPOSE      f.andThen(g)  = g(f(x))   f first
             f.compose(g)  = f(g(x))   g first
             p.and(q) p.or(q)  short-circuit;  p.negate()
             Predicate.not(p) (11)   Function.identity()

INSIDE       default method + requireNonNull + capturing lambda
             composing builds objects; apply walks the chain
BOXING       Function<Integer,Integer>: ~32 bytes/call (interpreted)
             IntUnaryOperator: 0`,
          caption: "Functional interfaces on one screen.",
        },
        {
          type: "list",
          items: [
            "A functional interface is just an interface with one abstract method; the annotation only asks the compiler to enforce it.",
            "Seven shapes cover almost everything; the other 36 interfaces are primitive versions to avoid boxing.",
            "Composition methods are ordinary default methods that return new lambdas. `andThen` runs left to right, `compose` right to left.",
            "Use primitive versions for numbers in hot code, and `Supplier` when a value might not be needed.",
          ],
        },
      ],
    },
  ],
};
