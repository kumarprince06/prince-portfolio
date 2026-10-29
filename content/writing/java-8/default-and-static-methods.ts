import type { Lesson } from "../types";

export const defaultAndStaticMethods: Lesson = {
  slug: "default-and-static-methods",
  date: "2026-10-29",
  title: "Default and Static Interface Methods",
  description:
    "Why Java 8 let interfaces carry code: default methods that let List and Collection grow forEach and stream without breaking anyone, the rules for diamond conflicts and X.super.m(), static and private interface methods, and how the JVM actually links them.",
  tags: ["Core Java", "Java 8", "Interfaces", "Default Methods", "Bytecode"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "Picture a food delivery app that wants to add a \"tip\" message to every restaurant's page. If every restaurant had to update its own menu first, half of them never would. So the app adds the message with a normal default text, and any restaurant can change it later if it wants.",
        },
        {
          type: "paragraph",
          text: "A **default method** is that default text in Java. It's a method with a real body inside an interface, so every class that implements the interface gets it for free and can still replace it. A **static method** in an interface is a helper that belongs to the interface itself, called like `Restaurant.appName()`.",
        },
        {
          type: "paragraph",
          text: "I use default methods to add something new to an interface without breaking every class that already uses it. That's exactly how Java 8 added `forEach` and `stream` to old interfaces like `List`.",
        },
        {
          type: "code",
          language: "java",
          code: `interface Restaurant {
    String name();
    default String tipMessage() { return name() + ": tip is optional"; }
    static String appName() { return "FoodNow"; }
}

Restaurant dosaCorner = () -> "Dosa Corner";
System.out.println(Restaurant.appName());
System.out.println(dosaCorner.tipMessage());`,
        },
        {
          type: "output",
          text: `FoodNow
Dosa Corner: tip is optional`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "A default method lets an interface grow a new method without breaking the classes that already implement it.",
        },
      ],
    },
    {
      title: "What Default and Static Interface Methods Are",
      blocks: [
        {
          type: "paragraph",
          text: "Before Java 8, an interface was a pure promise. It listed method names and said \"whoever implements me must write all of these\". It couldn't contain a single line of real code, apart from constants.",
        },
        {
          type: "paragraph",
          text: "Java 8 changed that with two additions:",
        },
        {
          type: "list",
          items: [
            "A **default method** is an instance method with a body, marked with the `default` keyword. Every class that implements the interface gets it for free, and can override it if it wants something different.",
            "A **static method** on an interface is a helper that belongs to the interface itself. It's called as `InterfaceName.method()`, and implementing classes do **not** inherit it.",
          ],
        },
        {
          type: "paragraph",
          text: "Java 9 then added **private** interface methods, so default methods could share helper code without exposing it. Here's the smallest example I could write with the first two:",
        },
        {
          type: "code",
          language: "java",
          title: "TeaStall.java",
          code: `interface Shop {
    String name();

    default String greeting() {                 // every shop gets this for free
        return "Welcome to " + name() + "!";
    }

    static Shop named(String name) {            // a factory on the interface itself
        return () -> name;
    }
}

public class TeaStall implements Shop {
    public String name() { return "Raju's Tea Stall"; }

    public static void main(String[] args) {
        System.out.println(new TeaStall().greeting());
        System.out.println(Shop.named("Corner Bakery").greeting());
    }
}`,
        },
        {
          type: "output",
          text: `Welcome to Raju's Tea Stall!
Welcome to Corner Bakery!`,
        },
        {
          type: "paragraph",
          text: "`TeaStall` only wrote `name()`, yet it has a working `greeting()`. The default method calls the abstract `name()`, and whichever class is behind the interface supplies it. `Shop.named(...)` is a static method that builds a `Shop` from a lambda, since `Shop` has exactly one abstract method.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Default methods weren't added because someone wanted interfaces to look like abstract classes. They were added because of lambdas.",
        },
        {
          type: "paragraph",
          text: "Project Lambda (JSR 335) was building lambdas and streams for Java 8. A stream API is useless if you can't get a stream out of the collections people already have, so `Collection` needed a `stream()` method, `Iterable` needed `forEach`, `List` needed `sort`, and `Map` needed things like `getOrDefault` and `merge`.",
        },
        {
          type: "paragraph",
          text: "The problem: adding an abstract method to an interface breaks **every class that implements it**. Not just `ArrayList` in the JDK, which the JDK team could fix, but every custom `List` in every library and company codebase in the world. Those classes would suddenly fail to compile, and old compiled jars would fail at runtime with `AbstractMethodError` when someone called the new method.",
        },
        {
          type: "paragraph",
          text: "So the interface had to be able to ship the method **with a body**. The early drafts called them \"defender methods\" and \"virtual extension methods\". The name that stuck was default methods, because the body is the default an implementation gets unless it says otherwise.",
        },
        {
          type: "paragraph",
          text: "I checked which `Collection` methods on my JDK 21 are defaults:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap java.util.Collection | grep -E "default|static"`,
        },
        {
          type: "output",
          text: `  public default <T> T[] toArray(java.util.function.IntFunction<T[]>);
  public default boolean removeIf(java.util.function.Predicate<? super E>);
  public default java.util.Spliterator<E> spliterator();
  public default java.util.stream.Stream<E> stream();
  public default java.util.stream.Stream<E> parallelStream();`,
        },
        {
          type: "paragraph",
          text: "`toArray(IntFunction)` is a Java 11 addition, the other four are Java 8. These are the methods that let me write this on any collection, including ones written before 2014:",
        },
        {
          type: "code",
          language: "java",
          title: "Evolve.java",
          code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Evolve {
    public static void main(String[] args) {
        List<String> orders = new ArrayList<>(List.of("tea", "samosa", "coffee"));
        orders.forEach(o -> System.out.println("order: " + o));   // Iterable.forEach
        orders.removeIf(o -> o.startsWith("s"));                   // Collection.removeIf
        System.out.println(orders);
        orders.sort(null);                                          // List.sort
        System.out.println(orders);

        Map<String, Integer> stock = new HashMap<>();
        System.out.println(stock.getOrDefault("tea", 0));          // Map.getOrDefault
        stock.merge("tea", 1, Integer::sum);
        stock.merge("tea", 1, Integer::sum);                        // Map.merge
        System.out.println(stock);
    }
}`,
        },
        {
          type: "output",
          text: `order: tea
order: samosa
order: coffee
[tea, coffee]
[coffee, tea]
0
{tea=2}`,
        },
        {
          type: "paragraph",
          text: "Static interface methods came in the same release for a related reason. Before Java 8, helpers for an interface had to live in a separate utility class: `Collection` had `Collections`, `Path` had `Paths`. With static methods allowed, helpers could live where they belong, which is how we got `Comparator.comparing` (8), `List.of` and `Map.of` (9), and `Predicate.not` (11).",
        },
        {
          type: "paragraph",
          text: "Private interface methods arrived in Java 9 (JEP 213). With only public defaults, two defaults that shared some logic had to either duplicate it or expose a public helper nobody was meant to call.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of an interface as the **franchise rulebook** of a tea chain.",
        },
        {
          type: "list",
          items: [
            "Before Java 8, the rulebook only listed duties: \"every outlet must brew tea, must take payment\". Each outlet had to work out every duty itself.",
            "One day head office wants every outlet to also \"print a GST receipt\". If they just add that as a new duty, every outlet that hasn't implemented it is suddenly breaking the rules overnight.",
            "So head office adds it **with a standard procedure attached**: \"if you don't have your own way, do it like this\". Outlets that already print receipts keep their own way (they override). Everyone else follows the standard procedure. That's a default method.",
            "Head office also keeps a helpline number in the rulebook: \"call this to find the nearest outlet\". It belongs to the chain, not to any outlet. You don't call it on Raju's stall, you call it on the chain. That's a static interface method.",
            "Some standard procedures share steps, like \"check stock\". Head office writes that step once, in a section only the procedures can refer to. That's a private interface method.",
          ],
        },
        {
          type: "paragraph",
          text: "The diamond problem fits the same picture. If an outlet signs up with two chains whose rulebooks both have a standard receipt procedure, and they differ, nobody can guess which one applies. The outlet has to write down its own choice. Java forces exactly that.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "What an interface can contain now",
        },
        {
          type: "table",
          headers: ["Member", "Since", "Has a body?", "Inherited by implementers?", "Notes"],
          rows: [
            ["Abstract method", "1.0", "No", "Yes, must be implemented", "Implicitly `public abstract`"],
            ["Constant field", "1.0", "Initializer", "Yes", "Implicitly `public static final`. No instance fields, ever"],
            ["`default` method", "8", "Yes", "Yes, can be overridden", "Implicitly `public`. Can call other interface methods through `this`"],
            ["`static` method", "8", "Yes", "**No**", "Called only as `Interface.method()`. Implicitly `public` unless `private`"],
            ["`private` method", "9", "Yes", "No", "Helper for defaults and statics. `private static` is allowed too"],
          ],
        },
        {
          type: "paragraph",
          text: "Some modifiers are not allowed on a default method: it can't be `static`, `final`, `synchronized`, `private` or `protected`. The `final` rule surprised me at first, but it's deliberate: a default is a fallback, and the class must always be able to override it.",
        },
        {
          type: "heading",
          text: "The three conflict rules",
        },
        {
          type: "paragraph",
          text: "Once interfaces have code, a class can inherit two different bodies for the same method. JLS 8.4.8 and 9.4.1 settle it with three rules, applied in order:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Classes win.** A method declared in the class or any superclass beats every interface default, even if that class method is `abstract`.",
            "**The more specific interface wins.** If interface `Cab extends Vehicle` and both have `horn()`, `Cab`'s version is used, because it already overrides `Vehicle`'s.",
            "**Otherwise it's a compile error.** If two unrelated interfaces both provide a default, the class must override the method. Inside the override it can pick one with `InterfaceName.super.method()`.",
          ],
        },
        {
          type: "heading",
          text: "X.super.m()",
        },
        {
          type: "paragraph",
          text: "`super.m()` in a class calls the superclass's version. `Lift.super.ride(to)` is the interface version of that: \"call the default `ride` that `Lift` provides, not my own\". `Lift` must be a **direct** superinterface of the class (or interface) where the call appears. The examples show the two compile errors you get when it isn't.",
        },
        {
          type: "heading",
          text: "Interface versus abstract class",
        },
        {
          type: "table",
          headers: ["", "Interface with defaults", "Abstract class"],
          rows: [
            ["State (instance fields)", "No, only constants", "Yes"],
            ["Constructors", "No", "Yes"],
            ["How many can a class extend", "Any number", "One"],
            ["Method access", "`public`, or `private` helpers", "Any: `protected`, package-private, ..."],
            ["`final` methods", "No", "Yes"],
            ["Can override `equals`/`hashCode`/`toString`", "No (compile error)", "Yes"],
            ["Good for", "A capability many unrelated classes share", "A partial implementation with shared state"],
          ],
        },
        {
          type: "paragraph",
          text: "My rule of thumb: if the shared code needs a field, it belongs in an abstract class. If it can be written purely in terms of the interface's other methods, like `greeting()` calling `name()`, a default method is fine.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/default-method-resolution.svg",
          alt: "Diamond diagram: interfaces A and B both declare default hello(), class C implements both and must override hello(), calling A.super.hello(); beside it the three resolution rules: class wins, more specific interface wins, otherwise override",
          caption: "When two interfaces give the same default, the class wins first, then the more specific interface, and otherwise you must override and pick with `A.super.hello()`.",
        },
        {
          type: "paragraph",
          text: "I wanted to know whether default methods are some kind of compiler trick, like lambdas being turned into hidden classes. So I wrote an interface with all four kinds of members, a lift with a floor check:",
        },
        {
          type: "code",
          language: "java",
          title: "Lift.java",
          code: `public interface Lift {
    int floors();                                   // abstract

    default String ride(int to) {                   // default (Java 8)
        return check(to) ? "Going to " + to : "No floor " + to;
    }

    static Lift of(int floors) {                    // static (Java 8)
        return () -> floors;
    }

    private boolean check(int to) {                 // private (Java 9)
        return to >= 0 && to <= floors();
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Building.java",
          code: `public class Building implements Lift {
    public int floors() { return 10; }

    @Override
    public String ride(int to) {
        return "[Building] " + Lift.super.ride(to);   // call the interface's version
    }

    public static void main(String[] args) {
        Lift a = Lift.of(5);
        System.out.println(a.ride(3));
        System.out.println(a.ride(7));
        System.out.println(new Building().ride(7));
    }
}`,
        },
        {
          type: "output",
          text: `Going to 3
No floor 7
[Building] Going to 7`,
        },
        {
          type: "heading",
          text: "A default method is just an interface method with Code",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p Lift`,
        },
        {
          type: "output",
          text: `Compiled from "Lift.java"
public interface Lift {
  public abstract int floors();

  public default java.lang.String ride(int);
    Code:
       0: aload_0
       1: iload_1
       2: invokeinterface #1,  2            // InterfaceMethod check:(I)Z
       7: ifeq          19
      10: iload_1
      11: invokedynamic #7,  0              // InvokeDynamic #0:makeConcatWithConstants:(I)Ljava/lang/String;
      16: goto          25
      19: iload_1
      20: invokedynamic #11,  0             // InvokeDynamic #1:makeConcatWithConstants:(I)Ljava/lang/String;
      25: areturn

  public static Lift of(int);
    Code:
       0: iload_0
       1: invokedynamic #12,  0             // InvokeDynamic #2:floors:(I)LLift;
       6: areturn

  private boolean check(int);
    Code:
       0: iload_1
       1: iflt          18
       4: iload_1
       5: aload_0
       6: invokeinterface #16,  1           // InterfaceMethod floors:()I
      11: if_icmpgt     18
      14: iconst_1
      15: goto          19
      18: iconst_0
      19: ireturn

  private static int lambda$of$0(int);
    Code:
       0: iload_0
       1: ireturn
}`,
        },
        {
          type: "paragraph",
          text: "What I read from it:",
        },
        {
          type: "list",
          items: [
            "There is no hidden helper class. `ride` sits inside `Lift.class` with a normal `Code` attribute, exactly like a method in a class. `aload_0` is `this`, the object behind the interface, and `iload_1` is `to`.",
            "`javap` prints the word `default`, but that's `javap` being friendly. In the class file there is no \"default\" flag at all. I checked with `javap -v`:",
          ],
        },
        {
          type: "output",
          text: `  public abstract int floors();
    flags: (0x0401) ACC_PUBLIC, ACC_ABSTRACT
  public default java.lang.String ride(int);
    flags: (0x0001) ACC_PUBLIC
  public static Lift of(int);
    flags: (0x0009) ACC_PUBLIC, ACC_STATIC
  private boolean check(int);
    flags: (0x0002) ACC_PRIVATE`,
        },
        {
          type: "list",
          items: [
            "A default method is simply a public, non-abstract, non-static method in an interface. The JVM spec has allowed that since class file version 52 (Java 8). The `default` keyword exists only in the language, to make the intent obvious in source.",
            "The lambda in `of` became `private static lambda$of$0` **inside the interface**. Before Java 8, an interface couldn't have had that.",
            "The private `check` is called with `invokeinterface`, not `invokespecial`. Since Java 11 (nest-based access), `javac` emits `invokeinterface` for private interface methods, the same way it emits `invokevirtual` for private class methods. The JVM knows a private method can't be overridden, so nothing is actually looked up at runtime.",
          ],
        },
        {
          type: "heading",
          text: "The call sites",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p Building | grep invoke`,
        },
        {
          type: "output",
          text: `       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       2: invokespecial #7                  // InterfaceMethod Lift.ride:(I)Ljava/lang/String;
       5: invokedynamic #13,  0             // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;)Ljava/lang/String;
       1: invokestatic  #17                 // InterfaceMethod Lift.of:(I)LLift;
      10: invokeinterface #7,  2            // InterfaceMethod Lift.ride:(I)Ljava/lang/String;
      15: invokevirtual #27                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      24: invokeinterface #7,  2            // InterfaceMethod Lift.ride:(I)Ljava/lang/String;
      29: invokevirtual #27                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      39: invokespecial #35                 // Method "<init>":()V
      44: invokevirtual #36                 // Method ride:(I)Ljava/lang/String;
      47: invokevirtual #27                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V`,
        },
        {
          type: "table",
          headers: ["Source", "Bytecode", "What the JVM does"],
          rows: [
            ["`a.ride(3)` (a is a `Lift`)", "`invokeinterface Lift.ride`", "Finds `ride` for the object's real class at runtime. For the lambda-made `Lift` that's the default body"],
            ["`new Building().ride(7)`", "`invokevirtual ride`", "Normal virtual call on a class type. `Building`'s override runs"],
            ["`Lift.of(5)`", "`invokestatic InterfaceMethod Lift.of`", "Static call. Note the constant is an `InterfaceMethod` ref, which needs class file version 52+"],
            ["`Lift.super.ride(to)`", "`invokespecial InterfaceMethod Lift.ride`", "Calls exactly `Lift`'s body, skipping `Building`'s override. No dynamic lookup"],
          ],
        },
        {
          type: "paragraph",
          text: "`X.super.m()` reuses the same instruction as `super.m()` in a class, `invokespecial`, just pointing at an interface method ref. The JVM spec adds one check here: for `invokespecial` on an interface method, the interface must be a direct superinterface of the current class. That's the bytecode-level reason for the \"direct superinterface\" rule in the language.",
        },
        {
          type: "heading",
          text: "Who picks the default: HotSpot's default-method processing",
        },
        {
          type: "paragraph",
          text: "When the JVM links a class, it builds that class's method table (vtable for class methods, itable for interface methods). For every interface method the class doesn't implement itself, HotSpot has to choose a default body to put there. It logs that work under the `defaultmethods` tag. I ran the resolution-rules example from the next section with logging on:",
        },
        {
          type: "code",
          language: "java",
          title: "Rules.java",
          code: `interface Vehicle {
    default String horn() { return "Vehicle: beep"; }
}

interface Cab extends Vehicle {
    default String horn() { return "Cab: honk honk"; }      // more specific
}

class Machine {
    public String horn() { return "Machine: class method"; }
}

class CityCab implements Vehicle, Cab { }                    // rule 2: Cab wins

class OldCab extends Machine implements Cab { }              // rule 1: class wins

public class Rules {
    public static void main(String[] args) {
        System.out.println(new CityCab().horn());
        System.out.println(new OldCab().horn());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:defaultmethods=debug:stdout:none Rules`,
        },
        {
          type: "output",
          text: `Class CityCab requires default method processing
CityCab
  java/lang/Object
  Vehicle
  Cab
    Vehicle
Slots that need filling:
  horn()Ljava/lang/String;
  Looking for default methods for slot horn()Ljava/lang/String;
Creating defaults and overpasses...
for slot: horn()Ljava/lang/String;
  Selected method: Cab.horn()Ljava/lang/String;
Created 0 overpass methods
Created 1 default  methods
Default method processing complete
Cab: honk honk
Class OldCab requires default method processing
OldCab
  Machine
    java/lang/Object
  Cab
    Vehicle
Slots that need filling:
Default method processing complete
Machine: class method`,
        },
        {
          type: "paragraph",
          text: "(I trimmed the earlier lines about `Vehicle` and `Cab` themselves, and `:stdout:none` removes the timestamps.) This is the most useful thing I found while studying this topic:",
        },
        {
          type: "list",
          items: [
            "For `CityCab`, HotSpot walked the hierarchy, saw an empty slot for `horn()`, and **selected** `Cab.horn()`, the most specific one. It then put that method into `CityCab`'s table. From then on, calling `horn()` on a `CityCab` is an ordinary table lookup.",
            "For `OldCab`, the list of slots to fill is **empty**. `Machine.horn()` already filled it, so the interface default was never even considered. That's \"classes win\", seen from inside the JVM.",
            "The decision happens once, at link time, not on every call.",
          ],
        },
        {
          type: "heading",
          text: "Overpass methods: when the JVM finds a conflict javac never saw",
        },
        {
          type: "paragraph",
          text: "`javac` refuses to compile a class that inherits two unrelated defaults. But classes and interfaces are compiled separately. What if a library adds a default **after** my class was compiled? I tried it. Version 1: `Card` has a default `pay()`, `Upi` is empty, and `Shop implements Card, Upi`:",
        },
        {
          type: "code",
          language: "java",
          title: "v1: Card.java, Upi.java, Shop.java",
          code: `public interface Card {
    default String pay() { return "card"; }
}

public interface Upi { }

public class Shop implements Card, Upi {
    public static void main(String[] args) {
        System.out.println(new Shop().pay());
    }
}`,
        },
        {
          type: "output",
          text: `card`,
        },
        {
          type: "paragraph",
          text: "Then I \"upgraded the library\": recompiled only `Upi` with its own default, and left `Shop.class` untouched:",
        },
        {
          type: "code",
          language: "java",
          title: "v2: Upi.java",
          code: `public interface Upi {
    default String pay() { return "upi"; }   // added in a library upgrade
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d v1 v2/Upi.java && cd v1 && java -Xlog:defaultmethods=debug:stdout:none Shop`,
        },
        {
          type: "output",
          text: `Class Shop requires default method processing
Shop
  java/lang/Object
  Card
  Upi
Slots that need filling:
  pay()Ljava/lang/String;
  Looking for default methods for slot pay()Ljava/lang/String;
'Conflicting default methods: Card.pay Upi.pay'
Creating defaults and overpasses...
for slot: pay()Ljava/lang/String;
  java/lang/IncompatibleClassChangeError: Conflicting default methods: Card.pay Upi.pay
Created 1 overpass methods
Created 0 default  methods
Default method processing complete
Exception in thread "main" java.lang.IncompatibleClassChangeError: Conflicting default methods: Card.pay Upi.pay
	at Shop.pay(Shop.java)
	at Shop.main(Shop.java:3)`,
        },
        {
          type: "paragraph",
          text: "HotSpot couldn't pick a body, so it generated an **overpass method**: a small synthetic `Shop.pay()` whose only job is to throw `IncompatibleClassChangeError`. That's why the stack trace shows a frame `at Shop.pay(Shop.java)` with no line number. There is no such method in my source. The class loaded fine, and the error only appeared when `pay()` was actually called.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "My old notes said default methods make adding methods \"100% safe\"",
          text: "They make it source compatible and binary compatible in the common case, where only one interface supplies the method. They don't make it conflict-free. Adding a default to a widely used interface can break, at runtime, any class that also implements another interface with the same method. The JDK team checks for exactly this before adding defaults to core interfaces.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "the shapes, in one interface",
          code: `public interface PaymentMethod {
    int MAX_RETRIES = 3;                              // public static final, a constant

    String name();                                    // abstract: implementers must write it

    default String receipt(int amount) {              // default: inherited, can be overridden
        return name() + " paid " + rupees(amount);
    }

    static PaymentMethod cash() {                     // static: PaymentMethod.cash()
        return () -> "Cash";
    }

    private String rupees(int amount) {               // private (Java 9): helper for defaults
        return "Rs " + amount;
    }
}

class Upi implements PaymentMethod {
    public String name() { return "UPI"; }

    @Override
    public String receipt(int amount) {              // must stay public
        return PaymentMethod.super.receipt(amount) + " (instant)";
    }
}`,
        },
        {
          type: "list",
          items: [
            "`default` goes before the return type, where `static` would go.",
            "An override of a default must be `public`, because interface methods are always public.",
            "`PaymentMethod.super.receipt(amount)` only works inside a class or interface that directly implements or extends `PaymentMethod`.",
            "Static interface methods are called through the interface name only: `PaymentMethod.cash()`, never `new Upi().cash()` or `Upi.cash()`.",
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "The diamond: two payment options, one checkout",
        },
        {
          type: "paragraph",
          text: "Everyday version first: a shop counter that accepts both card and UPI. Both payment companies hand the shop a \"standard way to pay\". When a customer just says \"I'll pay\", which one does the shop use? Java won't guess:",
        },
        {
          type: "code",
          language: "java",
          title: "Diamond.java",
          code: `interface CardPayment {
    default String pay() { return "paid by card"; }
}

interface UpiPayment {
    default String pay() { return "paid by UPI"; }
}

public class Diamond implements CardPayment, UpiPayment {
    public static void main(String[] args) {
        System.out.println(new Diamond().pay());
    }
}`,
        },
        {
          type: "output",
          text: `Diamond.java:9: error: types CardPayment and UpiPayment are incompatible;
public class Diamond implements CardPayment, UpiPayment {
       ^
  class Diamond inherits unrelated defaults for pay() from types CardPayment and UpiPayment
1 error`,
        },
        {
          type: "paragraph",
          text: "The fix is to override `pay()` and say what I mean. I can call either parent's version, or both:",
        },
        {
          type: "code",
          language: "java",
          title: "Checkout.java",
          code: `interface CardPayment {
    default String pay() { return "paid by card"; }
}

interface UpiPayment {
    default String pay() { return "paid by UPI"; }
}

public class Checkout implements CardPayment, UpiPayment {
    @Override
    public String pay() {
        return UpiPayment.super.pay() + " (card as backup: " + CardPayment.super.pay() + ")";
    }

    public static void main(String[] args) {
        System.out.println(new Checkout().pay());
    }
}`,
        },
        {
          type: "output",
          text: `paid by UPI (card as backup: paid by card)`,
        },
        {
          type: "heading",
          text: "Rule 1 and rule 2 in action",
        },
        {
          type: "paragraph",
          text: "The `Rules.java` program from Internal Working printed this:",
        },
        {
          type: "output",
          text: `Cab: honk honk
Machine: class method`,
        },
        {
          type: "list",
          items: [
            "`CityCab implements Vehicle, Cab`: no conflict error, because `Cab extends Vehicle` and already overrides `horn()`. The more specific interface wins. Listing `Vehicle` again in `implements` changes nothing.",
            "`OldCab extends Machine implements Cab`: `Machine` is a class, and a class method always beats an interface default, even though `Machine` doesn't implement `Cab` at all. The method just has to match by signature.",
          ],
        },
        {
          type: "heading",
          text: "X.super only reaches a direct parent",
        },
        {
          type: "paragraph",
          text: "Like a child who can ask a parent but not skip straight to the grandparent. Here `Cab` extends `Vehicle`, and the class only implements `Cab`:",
        },
        {
          type: "code",
          language: "java",
          title: "NotDirect.java",
          code: `interface Vehicle {
    default String horn() { return "beep"; }
}

interface Cab extends Vehicle { }

public class NotDirect implements Cab {
    public String horn() { return Vehicle.super.horn(); }
}`,
        },
        {
          type: "output",
          text: `NotDirect.java:8: error: not an enclosing class: Vehicle
    public String horn() { return Vehicle.super.horn(); }
                                         ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The message is confusing because `Vehicle.super` is also the syntax for inner classes reaching an outer class's super. Adding `Vehicle` to the `implements` list doesn't help either, because `Vehicle` is already covered by `Cab`:",
        },
        {
          type: "code",
          language: "java",
          title: "Redundant.java (same interfaces, class changed)",
          code: `public class Redundant implements Cab, Vehicle {
    public String horn() { return Vehicle.super.horn(); }
}`,
        },
        {
          type: "output",
          text: `Redundant.java:8: error: bad type qualifier Vehicle in default super call
    public String horn() { return Vehicle.super.horn(); }
                                         ^
  redundant interface Vehicle is extended by Cab
1 error`,
        },
        {
          type: "paragraph",
          text: "The reason for the rule: if `Cab` overrides `horn()`, a class implementing `Cab` shouldn't be able to bypass that override and reach the older `Vehicle` version. The correct call here is `Cab.super.horn()`.",
        },
        {
          type: "heading",
          text: "Static interface methods are not inherited",
        },
        {
          type: "code",
          language: "java",
          title: "StaticNotInherited.java",
          code: `interface Fare {
    static int base() { return 50; }
}

public class StaticNotInherited implements Fare {
    public static void main(String[] args) {
        System.out.println(Fare.base());                 // fine
        System.out.println(StaticNotInherited.base());   // not inherited
    }
}`,
        },
        {
          type: "output",
          text: `StaticNotInherited.java:8: error: cannot find symbol
        System.out.println(StaticNotInherited.base());   // not inherited
                                             ^
  symbol:   method base()
  location: class StaticNotInherited
1 error`,
        },
        {
          type: "paragraph",
          text: "Static methods in a **superclass** are inherited, so this was a surprise. The reason is the diamond again: a class can implement many interfaces, and if two had a static `base()`, `StaticNotInherited.base()` would be ambiguous. Not inheriting them avoids the problem entirely. Even calling it through a variable of the interface type is rejected:",
        },
        {
          type: "code",
          language: "java",
          title: "ViaInstance.java",
          code: `interface Fare {
    static int base() { return 50; }
}

public class ViaInstance {
    public static void main(String[] args) {
        Fare f = null;
        System.out.println(f.base());
    }
}`,
        },
        {
          type: "output",
          text: `ViaInstance.java:8: error: illegal static interface method call
        System.out.println(f.base());
                                 ^
  the receiver expression should be replaced with the type qualifier 'Fare'
1 error`,
        },
        {
          type: "paragraph",
          text: "That's stricter than classes, where `instance.staticMethod()` compiles with only a lint warning. I like this one.",
        },
        {
          type: "heading",
          text: "Defaults on functional interfaces",
        },
        {
          type: "paragraph",
          text: "Most of the default methods I use every day are on functional interfaces: `Comparator`, `Predicate`, `Function`. They let me build a bigger rule out of small ones, like sorting a tea-stall menu by price (highest first), then by name:",
        },
        {
          type: "code",
          language: "java",
          title: "MenuSort.java",
          code: `import java.util.Comparator;
import java.util.List;
import java.util.function.Predicate;

public class MenuSort {
    record Item(String name, int price, boolean veg) { }

    public static void main(String[] args) {
        List<Item> menu = List.of(new Item("Samosa", 15, true), new Item("Chicken roll", 60, false),
                                  new Item("Tea", 10, true), new Item("Paneer roll", 60, true));

        Comparator<Item> byPrice = Comparator.comparingInt(Item::price);       // static
        Comparator<Item> order = byPrice.reversed().thenComparing(Item::name); // defaults
        menu.stream().sorted(order).forEach(i -> System.out.println(i.price() + " " + i.name()));

        Predicate<Item> veg = Item::veg;
        Predicate<Item> cheap = i -> i.price() < 20;
        System.out.println(menu.stream().filter(veg.and(cheap.negate())).map(Item::name).toList());
        System.out.println(menu.stream().filter(Predicate.not(veg)).map(Item::name).toList());
    }
}`,
        },
        {
          type: "output",
          text: `60 Chicken roll
60 Paneer roll
15 Samosa
10 Tea
[Paneer roll]
[Chicken roll]`,
        },
        {
          type: "list",
          items: [
            "`Comparator.comparingInt` is a **static** factory on the interface. `reversed()` and `thenComparing()` are **defaults** that return a new comparator wrapping this one.",
            "`veg.and(cheap.negate())` reads as \"veg and not cheap\", which is only the paneer roll. `and` and `negate` are defaults on `Predicate`.",
            "`Predicate.not(veg)` is a static method added in Java 11, mainly so method references can be negated: `filter(Predicate.not(String::isBlank))`.",
            "A functional interface may have any number of defaults and statics. Only the count of **abstract** methods has to be exactly one.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Trying to give toString, equals or hashCode a default",
        },
        {
          type: "code",
          language: "java",
          title: "ObjectDefault.java",
          code: `interface Order {
    default String toString() { return "an order"; }
}`,
        },
        {
          type: "output",
          text: `ObjectDefault.java:2: error: default method toString in interface Order overrides a member of java.lang.Object
    default String toString() { return "an order"; }
                   ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Every class already inherits `toString` from `Object`, and \"classes win\". The default could never run, so the compiler rejects it rather than let me think it works. Declaring `String toString();` as **abstract** in an interface is allowed, which is how `Comparator` documents `equals`.",
        },
        {
          type: "heading",
          text: "Overriding a default with weaker access",
        },
        {
          type: "code",
          language: "java",
          title: "Weaker.java",
          code: `interface Printer {
    default void print() { System.out.println("printing"); }
}

public class Weaker implements Printer {
    void print() { System.out.println("my print"); }   // package-private
}`,
        },
        {
          type: "output",
          text: `Weaker.java:6: error: print() in Weaker cannot implement print() in Printer
    void print() { System.out.println("my print"); }   // package-private
         ^
  attempting to assign weaker access privileges; was public
1 error`,
        },
        {
          type: "paragraph",
          text: "This one bites in real code when a library adds a default whose name matches a non-public helper method some class already had. The class stops compiling after the library upgrade.",
        },
        {
          type: "heading",
          text: "Using a default method as a place to keep state",
        },
        {
          type: "paragraph",
          text: "Interfaces can't have instance fields, so people sometimes fake it with a `static` map keyed by `this`. That leaks memory and is shared across every instance and thread. If the behaviour needs state, it's an abstract class or a separate object, not a default method.",
        },
        {
          type: "heading",
          text: "Calling a static interface method through the class",
        },
        {
          type: "paragraph",
          text: "`StaticNotInherited.base()` and `f.base()` both failed above. Always write `Fare.base()`.",
        },
        {
          type: "heading",
          text: "Assuming a default is the efficient version",
        },
        {
          type: "paragraph",
          text: "A default is written only in terms of the interface's other methods, so it's often the slowest correct version. `Iterable.forEach` uses an iterator. `ArrayList` overrides it to loop over its array directly. If I write a custom collection, I should override defaults where I can do better. I checked which classes bother:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap java.util.ArrayList | grep -E "forEach|removeIf|sort"
javap java.util.LinkedList | grep -E "forEach|removeIf|sort( |\\()"`,
        },
        {
          type: "output",
          text: `  public void forEach(java.util.function.Consumer<? super E>);
  public boolean removeIf(java.util.function.Predicate<? super E>);
  boolean removeIf(java.util.function.Predicate<? super E>, int, int);
  public void sort(java.util.Comparator<? super E>);`,
        },
        {
          type: "paragraph",
          text: "`ArrayList` overrides all three. `LinkedList` printed nothing, so it uses the inherited defaults.",
        },
        {
          type: "heading",
          text: "Taking a default away by accident (or on purpose)",
        },
        {
          type: "paragraph",
          text: "An abstract class can re-declare a default as `abstract`, and then every subclass must implement it again. That's \"classes win\" applied to an abstract method:",
        },
        {
          type: "code",
          language: "java",
          title: "Reabstract.java",
          code: `interface Notifier {
    default String send(String msg) { return "SMS: " + msg; }
}

abstract class StrictNotifier implements Notifier {
    public abstract String send(String msg);          // take the default away
}

public class Reabstract extends StrictNotifier {
    public String send(String msg) { return "Email: " + msg; }

    public static void main(String[] args) {
        System.out.println(new Reabstract().send("OTP 4821"));
    }
}`,
        },
        {
          type: "output",
          text: `Email: OTP 4821`,
        },
        {
          type: "paragraph",
          text: "Useful when the default would be wrong for a whole family of classes. Surprising when it happens by accident in a shared base class.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use defaults mainly to **evolve** an interface that already has implementations, or to offer convenience methods built purely on the abstract ones (`greeting()` on top of `name()`, `reversed()` on top of `compare()`).",
            "Keep defaults small and stateless. If a default needs a field, the design wants an abstract class or composition.",
            "Document what the default does, so implementers know whether to override it. The JDK uses an `@implSpec` Javadoc tag for exactly this.",
            "When a class inherits two defaults, resolve it explicitly with `X.super.m()` and a comment explaining the choice.",
            "Put factories and helpers for an interface on the interface as `static` methods (`Shop.named`, `PaymentMethod.cash`) instead of a separate `Shops` utility class.",
            "Use `private` interface methods (Java 9+) for shared code between defaults, instead of a public default nobody should call.",
            "Before adding a default to an interface other teams implement, search for classes with a method of the same name. Different return type or weaker access will break their build, and two unrelated defaults will break them at runtime.",
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
            "A default method call costs the same as any interface call. The `defaultmethods` log showed HotSpot copying the selected default into the class's method table at link time, so there's no extra search on each call.",
            "Through an interface type it's `invokeinterface`, through a class type `invokevirtual`. The JIT treats both the same way: with one or two receiver classes seen at a call site, it inlines the target behind a cheap type check. A default body is inlined just like a class method.",
            "The real cost is algorithmic, not the call. A default only sees the interface's public methods, so `Iterable.forEach` must create an `Iterator`, while `ArrayList.forEach` loops over the array. Override defaults when your class can do better.",
            "Static interface methods are `invokestatic`, the cheapest call there is.",
            "The \"which default wins\" decision and any `IncompatibleClassChangeError` overpass are made once per class, during linking, not per call.",
          ],
        },
      ],
    },
    {
      title: "Default Methods in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Real-life version first. A ride app sends a login OTP. The words in the message are the same for everyone (\"Your ride OTP is 4821...\"), but how it travels is different: SMS goes through an SMS gateway, email goes through a mail server. So the interface owns the shared part as a default, and each channel only writes the delivery part.",
        },
        {
          type: "paragraph",
          text: "This is the kind of service a ride-booking backend like my RideX project has. I wrote it as plain Java so it runs on its own, with comments where Spring would come in:",
        },
        {
          type: "code",
          language: "java",
          title: "OtpDemo.java",
          code: `import java.util.List;

interface OtpSender {
    String channel();                              // "SMS", "EMAIL", ...
    void deliver(String to, String text);          // each channel does this its own way

    // Shared behaviour: every sender builds the message the same way.
    default void sendOtp(String to, String code) {
        deliver(to, "Your ride OTP is " + code + ". Valid for 5 minutes.");
        System.out.println("log: OTP sent via " + channel() + " to " + mask(to));
    }

    // Small helper that belongs with the interface.
    static String mask(String to) {
        return "*".repeat(Math.max(0, to.length() - 4)) + to.substring(Math.max(0, to.length() - 4));
    }
}

class SmsSender implements OtpSender {
    public String channel() { return "SMS"; }
    public void deliver(String to, String text) { System.out.println("[sms gateway] " + text); }
}

class EmailSender implements OtpSender {
    public String channel() { return "EMAIL"; }
    public void deliver(String to, String text) { System.out.println("[mail] subject=Your OTP body=" + text); }
}

// @Service in a Spring app; Spring would inject every OtpSender bean as a List.
class OtpService {
    private final List<OtpSender> senders;

    OtpService(List<OtpSender> senders) { this.senders = senders; }

    void sendLoginOtp(String channel, String to, String code) {
        senders.stream()
               .filter(s -> s.channel().equals(channel))
               .findFirst()
               .orElseThrow(() -> new IllegalArgumentException("No sender for " + channel))
               .sendOtp(to, code);
    }
}

public class OtpDemo {
    public static void main(String[] args) {
        OtpService service = new OtpService(List.of(new SmsSender(), new EmailSender()));
        service.sendLoginOtp("SMS", "9876543210", "4821");
        service.sendLoginOtp("EMAIL", "asha@example.com", "7390");
    }
}`,
        },
        {
          type: "output",
          text: `[sms gateway] Your ride OTP is 4821. Valid for 5 minutes.
log: OTP sent via SMS to ******3210
[mail] subject=Your OTP body=Your ride OTP is 7390. Valid for 5 minutes.
log: OTP sent via EMAIL to ************.com`,
        },
        {
          type: "list",
          items: [
            "`sendOtp` is the default. The message text and the log line are written once, so the wording can't drift between channels.",
            "`deliver` and `channel` are abstract, the only parts each channel really differs in.",
            "`OtpSender.mask` is static: it's about OTP senders, but doesn't need any particular sender. Nobody can accidentally override it.",
            "Adding WhatsApp later means one new class with two short methods. `OtpService` doesn't change, because Spring would just inject one more bean into the list.",
            "If one channel ever needs different text (say, a shorter SMS for a carrier limit), that class overrides `sendOtp` and can still call `OtpSender.super.sendOtp(...)` for the parts it wants to keep.",
          ],
        },
        {
          type: "paragraph",
          text: "Other places I see defaults in real Spring code: Spring's own callback interfaces moved to defaults in Spring 5 (`WebMvcConfigurer` replaced the old `WebMvcConfigurerAdapter` abstract class, so I implement only the methods I need), and Spring Data repository interfaces can declare default methods that combine the generated query methods.",
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
              question: "What is a default method, and why was it added in Java 8?",
              answer:
                "A default method is an interface method with a body, marked `default`. Implementing classes inherit it and can override it.\n\nIt was added so existing interfaces could get new methods without breaking every implementation. Lambdas and streams needed `Collection.stream()`, `Iterable.forEach`, `List.sort` and `Map.merge`, and adding those as abstract methods would have broken every custom collection ever written.",
            },
            {
              question: "What is a static interface method? Is it inherited?",
              answer:
                "A method with a body that belongs to the interface itself, called as `Interface.method()`, like `Comparator.comparing` or `List.of`.\n\nIt's not inherited by implementing classes or sub-interfaces. `ImplClass.method()` and `instance.method()` are both compile errors, the second one as \"illegal static interface method call\". This avoids ambiguity when a class implements several interfaces that each have a static method with the same name.",
            },
            {
              question: "Why were private interface methods added in Java 9?",
              answer:
                "So default and static methods can share helper code without making the helper part of the public API. In Java 8 every interface method was public, so shared logic had to be duplicated or exposed.\n\nBoth `private` and `private static` are allowed. Private instance methods can be called from defaults, private static ones from statics and defaults.",
            },
            {
              question: "Can a default method be final, synchronized or static?",
              answer:
                "No to all three. Not `final`, because a default is meant to be a fallback a class can always override. Not `synchronized`, because locking is an implementation decision and an interface doesn't own any state to protect. And `default` and `static` contradict each other, one is an instance method and the other isn't.\n\nIt also can't override `equals`, `hashCode` or `toString` from `Object`, because a class method always wins over a default, so it could never run.",
            },
            {
              question: "What is the difference between an interface with default methods and an abstract class?",
              answer:
                "An abstract class can have instance fields, constructors, `protected` and `final` methods, and a class can extend only one. An interface can't have state or constructors, its methods are public or private, and a class can implement many.\n\nSo default methods give interfaces behaviour, but not state. If the shared code needs a field, I use an abstract class. If it can be written purely on top of the interface's other methods, a default is fine.",
            },
            {
              question: "Does adding a default method to an interface break existing implementations?",
              answer:
                "Usually not, which is the whole point. Old compiled classes keep working and pick up the new default.\n\nIt can still break things in three cases: a class already has a method with the same signature but a different return type, or weaker access (compile error on recompile); or a class implements another interface that has a default with the same signature, which gives `IncompatibleClassChangeError: Conflicting default methods` at runtime when the method is called. I reproduced the last one by recompiling only the library interface.",
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
              question: "A class implements two interfaces with the same default method. What happens, and how do you fix it?",
              answer:
                "Compile error: \"types A and B are incompatible; class C inherits unrelated defaults for m() from types A and B\".\n\nThe class must override `m()`. Inside, it can delegate to one or both with `A.super.m()` and `B.super.m()`. My `Checkout` example returned `UpiPayment.super.pay()` plus `CardPayment.super.pay()`.",
            },
            {
              question: "A superclass has a method m(), and an interface the subclass implements has a default m(). Which one runs?",
              answer:
                "The class method. Rule one is \"classes win\": any method declared in the class hierarchy beats an interface default, even if the superclass never heard of the interface and even if the class method is abstract.\n\nIn my `Rules` example, `OldCab extends Machine implements Cab` printed `Machine: class method`, and HotSpot's `defaultmethods` log showed no slot left to fill for `OldCab` at all.",
            },
            {
              question: "Interface B extends A and both define default m(). Class C implements A, B. Is that a conflict?",
              answer:
                "No. B's version is more specific because B already overrides A's, so C gets B's `m()`. Listing A again in `implements` doesn't change anything.\n\nThe JVM log for my `CityCab` showed exactly this: \"Selected method: Cab.horn()\".",
            },
            {
              question: "Can you call A.super.m() if A is a grandparent interface?",
              answer:
                "No. The qualifier must be a direct superinterface. With `class C implements B` and `B extends A`, `A.super.m()` gives \"not an enclosing class: A\". Adding A to the implements list gives \"bad type qualifier A in default super call: redundant interface A is extended by B\".\n\nThe rule prevents a class from skipping B's override and reaching an older version. At the bytecode level, `invokespecial` on an interface method also requires a direct superinterface.",
            },
            {
              question: "Can a functional interface have default methods?",
              answer:
                "Yes, any number, and static ones too. Only the number of abstract methods must be exactly one. `Comparator` has `reversed` and `thenComparing` as defaults and `comparing` as a static factory, and `Predicate` has `and`, `or` and `negate`.\n\nAbstract methods that match public `Object` methods, like `boolean equals(Object)` in `Comparator`, don't count towards that one either.",
            },
            {
              question: "Can an abstract class or sub-interface remove a default method?",
              answer:
                "Yes. An abstract class can re-declare it as `public abstract`, and a sub-interface can re-declare it without a body. After that, concrete classes below must implement it again.\n\nMy `StrictNotifier` did that to `Notifier.send`, so `Reabstract` had to write its own `send`.",
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
              question: "How is a default method represented in the class file?",
              answer:
                "As a normal method in the interface's class file, with a `Code` attribute and the `ACC_PUBLIC` flag but not `ACC_ABSTRACT`. There's no \"default\" flag. `javap -v` showed `flags: (0x0001) ACC_PUBLIC` for my `ride` method, while the abstract `floors` had `ACC_PUBLIC, ACC_ABSTRACT`.\n\nInterfaces with method bodies need class file version 52 (Java 8) or higher, and so do `invokestatic` and `invokespecial` calls that point at interface methods.",
            },
            {
              question: "Which bytecode instructions are used for default, static and X.super calls?",
              answer:
                "A call through an interface type is `invokeinterface`, whether the target ends up being a default or an override. A static interface method is `invokestatic` with an `InterfaceMethod` constant. `X.super.m()` is `invokespecial` with an `InterfaceMethod` constant, which calls exactly X's body without dynamic lookup.\n\nPrivate interface methods are called with `invokeinterface` since Java 11, because of nest-based access. My `Lift.ride` called `check` that way.",
            },
            {
              question: "How does the JVM decide which default method a class gets?",
              answer:
                "At link time. When HotSpot builds a class's method tables, it finds interface methods the class hierarchy doesn't implement and, for each one, selects the maximally specific default. That method is put into the class's table, so later calls are plain table lookups.\n\n`-Xlog:defaultmethods=debug` shows it: \"Slots that need filling\", \"Selected method: Cab.horn()\", \"Created 1 default methods\".",
            },
            {
              question: "What is an overpass method?",
              answer:
                "A method HotSpot generates itself when default-method selection fails at runtime, for example because two unrelated interfaces both supply a default that the class doesn't override. The overpass just throws an error, `IncompatibleClassChangeError` for a conflict like this one.\n\n`javac` would have rejected such a class, so this only happens with separate compilation. I triggered it by adding a default to one interface after compiling the class. The stack trace showed `at Shop.pay(Shop.java)` with no line number: the overpass method.",
            },
            {
              question: "Are default methods slower than class methods?",
              answer:
                "Not in any way that matters. The selected default lives in the class's method table like any inherited method, and the JIT inlines monomorphic interface calls behind a type check just like virtual ones.\n\nWhat can be slower is the algorithm. A default is written only against the public interface, which is why `ArrayList` overrides `forEach`, `removeIf` and `sort`, while `LinkedList` keeps the defaults.",
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
            "Write a `Greeter` interface with an abstract `String name()` and a default `String hello()` that returns `\"Hello, \" + name()`. Implement it in two classes and print both greetings. Hint: the default can call the abstract method.",
            "Add a static `Greeter.of(String name)` that returns a `Greeter` built from a lambda. Try calling it as `MyGreeter.of(\"x\")` and read the compile error.",
            "Make two interfaces, `Bell` and `Horn`, each with a default `String sound()`. Implement both in a `Bicycle` class, read the compile error, then fix it by returning `Bell.super.sound() + \" and \" + Horn.super.sound()`.",
            "Give a superclass `Toy` a public `String sound()` method and make `class RubberDuck extends Toy implements Bell`. Predict which `sound()` runs, then check.",
            "Run `javap -c -p` on your interface and find the default method's `Code`. Then run `javap -v` and compare its flags with the abstract method's.",
            "Reproduce the overpass: compile an interface `A` with a default `m()`, an empty interface `B`, and `class C implements A, B` with a `main` calling `m()`. Then add a default `m()` to `B`, recompile only `B`, and run `C` again with `-Xlog:defaultmethods=debug`.",
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Solution sketch for exercise 4",
              answer:
                "`RubberDuck` gets `Toy.sound()`. Classes win, so the default in `Bell` is never selected, and `-Xlog:defaultmethods=debug` shows an empty \"Slots that need filling\" list for `RubberDuck`.\n\nIf `Toy.sound()` were package-private or had a different return type, it would no longer be a plain win: the compiler would complain about weaker access or an incompatible return type instead.",
            },
            {
              question: "Solution sketch for exercise 6",
              answer:
                "The first run prints A's result. After recompiling only `B`, running `C` throws `IncompatibleClassChangeError: Conflicting default methods: A.m B.m`, and the log says \"Created 1 overpass methods\".\n\nRecompiling `C` too turns it into the usual compile error, \"inherits unrelated defaults\", which is the safer place to find out.",
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
          text: `INTERFACE MEMBERS
  abstract      void m();            1.0   must implement
  constant      int X = 1;           1.0   public static final
  default       default void m(){}   8     inherited, overridable
  static        static T of(){}      8     NOT inherited: I.of()
  private       private void h(){}   9     helper for defaults

WHO WINS
  1 class or superclass method      (even abstract)
  2 most specific interface         (B extends A -> B)
  3 else compile error -> override, pick with  A.super.m()
       A.super only for a DIRECT superinterface

CAN'T
  default final / synchronized / static
  default equals / hashCode / toString
  instance fields in an interface

BYTECODE
  default      normal method, ACC_PUBLIC, has Code
  I.m()        invokestatic   InterfaceMethod
  i.m()        invokeinterface
  A.super.m()  invokespecial  InterfaceMethod
  conflict at runtime -> overpass -> IncompatibleClassChangeError`,
          caption: "The interface rules I want in my head before an interview.",
        },
        {
          type: "list",
          items: [
            "Default methods exist so interfaces can evolve. That's how `forEach`, `stream`, `removeIf` and `Map.merge` reached every collection in Java 8.",
            "Static interface methods keep factories and helpers on the interface, and they're deliberately not inherited.",
            "Conflicts: classes win, then the more specific interface, otherwise override and choose with `X.super.m()`.",
            "Under the hood a default is just a public interface method with code. HotSpot picks the default once per class at link time, and makes an overpass that throws when it can't.",
          ],
        },
      ],
    },
  ],
};
