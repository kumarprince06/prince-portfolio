import type { Lesson } from "../types";

export const interfaces: Lesson = {
  slug: "interfaces",
  date: "2026-11-09",
  title: "Interfaces",
  description:
    "Java interfaces as contracts and as types: implicit modifiers, default, static and private methods, the diamond rules, functional, marker and sealed interfaces, the full interface vs abstract class comparison, evolving a published interface safely, and how invokeinterface, itables and JDK dynamic proxies let Spring Data hand me an implementation nobody wrote.",
  tags: ["Core Java", "OOP", "Interfaces", "Default Methods", "Proxies"],
  sections: [
    {
      title: "What an Interface Is",
      blocks: [
        {
          type: "paragraph",
          text: "The Abstraction lesson used abstract classes to hide the how behind a partial implementation, with `AbstractList` as the model: a parent that does the shared work and leaves a few methods open. That works until a class needs two parents. A `WalletGateway` that already extends the bank's `LedgerClient` can't also extend an `AbstractPaymentGateway`, because a Java class has exactly one superclass.",
        },
        {
          type: "paragraph",
          text: "An **interface** is the other half of abstraction in Java. It names a set of methods a type promises to support, without saying how and without holding any per-object state. A class can implement as many interfaces as it likes, from anywhere in the hierarchy. And an interface is a **type** in its own right: I can declare variables, fields, parameters and return values of it, and any implementing object fits.",
        },
        {
          type: "code",
          language: "java",
          code: `interface PaymentGateway {                    // the contract: what, not how
    Receipt charge(String orderId, long amount);
}

class CheckoutService {
    private final PaymentGateway gateway;     // typed by the interface
    CheckoutService(PaymentGateway gateway) { this.gateway = gateway; }
}`,
        },
        {
          type: "paragraph",
          text: "That second part is why interfaces run through every backend codebase. `List<Order> orders = new ArrayList<>()` works against `List`, not `ArrayList`. A Spring service takes a `PaymentGateway` in its constructor and never learns which provider it got. A Spring Data repository is an interface nobody implements by hand at all; the implementation is generated while the application starts. By the end of these notes I want to be able to explain each of those down to the bytecode.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Separating what an object can do from how it does it is older than Java, but the languages before it mostly tied the two together.",
        },
        {
          type: "list",
          items: [
            "**Simula 67** introduced classes, subclasses and virtual procedures that a subclass could redefine. The type and the implementation were one thing: to be usable where a `Vehicle` was expected, an object had to be a subclass of `Vehicle`.",
            "**Smalltalk-80** talked about an object's protocol, the set of messages it understands. Any object that understood the right messages would do, but nothing checked that before the program ran.",
            "**C++** (2.0, 1989) added multiple inheritance and abstract classes with pure virtual functions, `virtual double area() = 0;`. A class made only of pure virtual functions is an interface in all but name. Multiple inheritance of classes with fields also brought the **diamond problem**: a class that inherits one base through two paths gets two copies of its fields unless the base is declared `virtual`.",
            "**Objective-C** at NeXT had formal protocols: a named list of methods any class could adopt, whatever its superclass. They're the closest ancestor of Java's interface and are usually named as its inspiration.",
          ],
        },
        {
          type: "paragraph",
          text: "Java 1.0 (1996) took a clear position: **single inheritance of classes, multiple inheritance of interfaces**. A class gets one superclass, with its fields and code, and any number of interfaces, which in 1.0 could hold only abstract methods and constants. Inheriting the same method signature twice can't produce two copies of a field or two competing bodies, so the C++ diamond couldn't happen. Everything since has loosened that, carefully:",
        },
        {
          type: "table",
          headers: ["Version", "What changed for interfaces"],
          rows: [
            ["1.0 (1996)", "`interface`, `implements`, abstract methods and constants. `Cloneable` is already a marker interface"],
            ["1.1 (1997)", "`Serializable` and `java.util.EventListener`, two more markers"],
            ["1.3 (2000)", "`java.lang.reflect.Proxy`: classes that implement interfaces, generated at run time"],
            ["1.4 (2002)", "`RandomAccess`, the marker for lists with fast `get(i)`"],
            ["5 (2004)", "Generic interfaces like `Comparable<T>`, and annotations (JSR 175), the alternative to markers"],
            ["6 (2006)", "`@Override` allowed on methods that implement an interface method"],
            ["8 (2014)", "`default` and `static` methods, functional interfaces and `@FunctionalInterface` (JSR 335)"],
            ["9 (2017)", "`private` and `private static` interface methods (JEP 213)"],
            ["16 (2021)", "Records (JEP 395), which implement interfaces through their accessors, and `InvocationHandler.invokeDefault` for proxies"],
            ["17 (2021)", "Sealed classes and interfaces (JEP 409), after previews in 15 and 16"],
            ["21 (2023)", "Record patterns and pattern matching for `switch` (JEPs 440 and 441), which make sealed interfaces exhaustive"],
          ],
        },
        {
          type: "paragraph",
          text: "Java 8 changed the most, and the Java 8 track's Default and Static Interface Methods lesson tells that story: why `Collection` needed `stream()` and `removeIf()` without breaking every collection class ever written. Here I focus on the rules and on what the JVM does with them. Nothing about interfaces changed between Java 17 and Java 25. I re-ran the main programs of this lesson on JDK 25 (Temurin 25.0.5) and got the same results, apart from one error message I point out where it appears.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The picture I use is a professional certificate, like a first-aid certificate.",
        },
        {
          type: "list",
          items: [
            "**The certificate is the interface.** It lists what a holder can do: check breathing, do CPR, dress a wound. It says nothing about who the holder is or how they learned. Those listed skills are the abstract methods.",
            "**A person holding it is an implementing class.** Asha is a schoolteacher and holds a first-aid certificate and a fire-safety certificate. One person, several certificates (several interfaces), but only one set of parents (one superclass).",
            "**An employer asking for \"a certified first-aider\" is programming to the interface.** Any holder will do, and one can replace another without rewriting the job description. That's a constructor taking `Notifier` instead of `EmailNotifier`.",
            "**The standard procedure printed in the handbook is a default method.** Holders follow it unless they have their own better way, which is overriding.",
            "**The certifying body's helpline printed on the card is a static method.** It belongs to the body, not the holder. Nobody phones Asha to reach the certification board, which is why a static interface method is called through the interface's name only.",
            "**The certificate holds no belongings.** It can't keep a patient list; it has no state, so an interface has no instance fields and no constructor.",
            "**Two handbooks that prescribe different procedures for the same emergency** are the diamond problem. Asha can't follow both, so she has to choose explicitly. Java makes the class override the method and pick with `A.super.m()`.",
            "**A \"background-checked\" stamp that lists no skills at all** is a marker interface, like `Serializable`.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real certificate is issued only after someone checks the holder can actually do CPR. `javac` only checks that methods with the right names and types exist, not that they do the right thing. The meaning of a contract, like `compareTo` agreeing with `equals`, lives in Javadoc and tests. And a person can earn a certificate halfway through a career, while a class's interfaces are fixed when it's compiled. The exception is a proxy: a brand-new class generated at run time to hold a certificate nobody planned for.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Anatomy of an interface",
        },
        {
          type: "code",
          language: "java",
          code: `public sealed interface PaymentGateway extends Named, Comparable<PaymentGateway>
        permits CardGateway, UpiGateway {
    int MAX_RETRIES = 3;                                      // constant
    Receipt charge(String orderId, long amount);              // abstract
    default boolean supportsRefund() { return false; }        // default (8)
    static PaymentGateway cheapest(List<PaymentGateway> all) { return all.get(0); }  // static (8)
    private void audit(String event) { }                     // private (9)
}`,
        },
        {
          type: "table",
          headers: ["Part", "Example", "Notes"],
          rows: [
            ["Modifiers", "`public sealed`", "Top level: `public` or package-private. `abstract` is implied and allowed but redundant"],
            ["Keyword and name", "`interface PaymentGateway`", "A noun for a role, or an adjective in -able for a capability (`Comparable`, `Runnable`)"],
            ["`extends`", "`Named, Comparable<PaymentGateway>`", "Any number of interfaces, never a class"],
            ["`permits`", "`CardGateway, UpiGateway`", "Only with `sealed` (Java 17)"],
            ["Body", "the braces", "Constants, abstract, default, static and private methods, nested types"],
          ],
        },
        {
          type: "heading",
          text: "What an interface can contain",
        },
        {
          type: "table",
          headers: ["Member", "Since", "Implicit modifiers", "Body", "Inherited by implementing classes"],
          rows: [
            ["Abstract method", "1.0", "`public abstract`", "No", "Yes, and must be implemented, or the class is `abstract`"],
            ["Constant", "1.0", "`public static final`", "Initializer required", "Yes, usable by its simple name"],
            ["`default` method", "8", "`public`", "Yes", "Yes, and can be overridden"],
            ["`static` method", "8", "`public`", "Yes", "**No**, not even by sub-interfaces"],
            ["`private` method", "9", "none", "Yes", "No; a helper for the interface's own methods"],
            ["`private static` method", "9", "none", "Yes", "No; a helper usable from static methods too"],
            ["Nested class or interface", "1.1", "`public static`", "n/a", "Yes, as a member type"],
          ],
        },
        {
          type: "paragraph",
          text: "I didn't want to trust that column from memory. In `ShippingPolicy`, in the Internal Working section, I wrote no modifiers on the constant or the abstract method, and `javap -v` shows javac recorded `ACC_PUBLIC, ACC_STATIC, ACC_FINAL` and `ACC_PUBLIC, ACC_ABSTRACT` for them anyway. Reflection agrees: on a test interface with no modifiers written, `Modifier.toString` printed `public static final` for a field, `public abstract` for an abstract method and plain `public` for a default (with `isDefault()` returning `true`), and a nested interface came out as `public abstract static interface`.",
        },
        {
          type: "heading",
          text: "What an interface can't contain",
        },
        {
          type: "paragraph",
          text: "I tried each forbidden member in a file of its own:",
        },
        {
          type: "code",
          language: "java",
          code: `// NoState.java
interface Account {
    long balance;                                // instance field?
}

// NoCtor.java
interface Account {
    Account() { }                                // constructor?
}

// NoInit.java
interface Account {
    { System.out.println("init"); }
}

// NoProtected.java
interface Account {
    protected long balance();
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac NoState.java; javac NoCtor.java; javac NoInit.java; javac NoProtected.java`,
        },
        {
          type: "output",
          text: `NoState.java:2: error: = expected
    long balance;                                // instance field?
                ^
1 error
NoCtor.java:2: error: <identifier> expected
    Account() { }                                // constructor?
           ^
1 error
NoInit.java:2: error: initializers not allowed in interfaces
    { System.out.println("init"); }
    ^
1 error
NoProtected.java:2: error: modifier protected not allowed here
    protected long balance();
                   ^
1 error`,
        },
        {
          type: "list",
          items: [
            "**No instance fields.** `long balance;` isn't rejected as \"no fields allowed\". It's parsed as a constant, which must be initialized, hence `= expected`. Every interface field is `public static final`, so there is no per-object state to declare.",
            "**No constructors.** javac reads `Account` as a return type and then expects a method name, hence `<identifier> expected`: an interface body has no such thing as a constructor declaration, because there's never an object of just the interface to construct. Implementing classes run their own constructors, and those chain to their superclass, never to an interface.",
            "**No initializer blocks**, instance or `static`. (javac still writes a `static {}` method into the class file when a field needs code to initialize, as the next section shows.)",
            "**No `protected`, `final`, `synchronized` or `native` methods.** I tried `final` and `synchronized` too: `modifier final not allowed here` and `modifier synchronized not allowed here`. A default can't be `final` because a default is a fallback, and a class must always be able to override it.",
          ],
        },
        {
          type: "heading",
          text: "Implementing and extending",
        },
        {
          type: "list",
          items: [
            "`class Manager extends Employee implements Payable, Comparable<Manager>`: `extends` comes first and names at most one class, then any number of interfaces.",
            "A concrete class must implement every abstract method of every interface it implements, directly or through a superclass, or be declared `abstract`. Otherwise: `Manager is not abstract and does not override abstract method ...`.",
            "The implementing method must be `public`, because interface methods are. Forgetting `public` is the most common interface compile error, and Common Mistakes shows it.",
            "An interface can `extend` any number of interfaces: `interface Product extends Identified, Rateable`. It can't extend a class (`interface expected here`) and it can't `implement` anything (`'{' expected`).",
            "Listing an interface twice through different paths is harmless. If `SmsNotifier extends Notifier`, then `class Alerts implements Notifier, SmsNotifier` has one `Notifier`, not two copies, because there are no fields to copy.",
            "Interfaces are inherited down the class hierarchy. If `Employee implements Payable`, then every subclass of `Employee` is a `Payable` too.",
          ],
        },
        {
          type: "heading",
          text: "An interface is a type",
        },
        {
          type: "list",
          items: [
            "It can be the type of a variable, field, parameter, return value, array element or type argument: `List<Payable>`, `Payable[]`, `<T extends Comparable<T>>`.",
            "It can't be instantiated: `new Account()` fails with `Account is abstract; cannot be instantiated`, the message reflecting the `ACC_ABSTRACT` flag every interface carries. An anonymous class (`new Account() { ... }`) or, for a functional interface, a lambda creates an object of a class that implements it.",
            "`instanceof` and casts work with interface types. A cast from a non-final class to an interface the class doesn't implement still compiles, because a subclass might implement it; only if the class is `final` does javac reject it: with `final class Point`, `(Printable) point` gave `incompatible types: Point cannot be converted to Printable`.",
          ],
        },
        {
          type: "heading",
          text: "Programming to interfaces",
        },
        {
          type: "paragraph",
          text: "\"Program to an interface, not an implementation\" means declaring variables, fields and parameters with the interface type and naming the concrete class only where the object is created. The declared type decides which methods I can call, at compile time. The object decides which body runs, at run time:",
        },
        {
          type: "code",
          language: "java",
          title: "ListOnly.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class ListOnly {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>();
        names.add("Asha");
        names.trimToSize();
    }
}`,
        },
        {
          type: "output",
          text: `ListOnly.java:8: error: cannot find symbol
        names.trimToSize();
             ^
  symbol:   method trimToSize()
  location: variable names of type List<String>
1 error`,
        },
        {
          type: "paragraph",
          text: "The object really is an `ArrayList` and has `trimToSize()`, but `names` only promises a `List`. That's the trade: I give up implementation-specific methods, and in return every caller works with any `List`, the implementation can change in one line, and tests can pass in something else. When I genuinely need `ArrayList`-only behaviour, that's a sign the variable should be declared as `ArrayList`, and only in the one place that needs it.",
        },
        {
          type: "heading",
          text: "Modifiers on the interface itself",
        },
        {
          type: "table",
          headers: ["On a top-level interface", "Allowed?", "What javac said when I tried it"],
          rows: [
            ["`public` or nothing", "Yes", "Public, or package-private"],
            ["`abstract`", "Yes, redundant", "Compiles; every interface is abstract anyway"],
            ["`sealed`, `non-sealed`", "Yes (17+)", "`non-sealed` only with a sealed supertype: `non-sealed modifier not allowed here`"],
            ["`final`", "No", "`illegal combination of modifiers: interface and final`"],
            ["`private`, `protected`, `static`", "No", "`modifier private not allowed here` (and the same for the other two)"],
          ],
        },
        {
          type: "paragraph",
          text: "Inside a class, a member interface can be `private` or `protected` and is implicitly `static`, since an interface never needs an enclosing instance.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "What javac writes for an interface",
        },
        {
          type: "paragraph",
          text: "An interface compiles to an ordinary `.class` file. To see how it differs from a class, I wrote one with every kind of member and put `main` inside the interface itself, which is legal because it's just a static interface method:",
        },
        {
          type: "code",
          language: "java",
          title: "ShippingPolicy.java",
          code: `import java.util.List;

public interface ShippingPolicy {
    int BASE_COST = 50;                                        // a constant
    List<String> REMOTE_REGIONS = List.of("Ladakh", "Andaman"); // static, but not a constant

    long cost(int kg);                                         // abstract

    default long costTo(String region, int kg) {               // default (Java 8)
        return isRemote(region) ? cost(kg) * 3 / 2 : cost(kg);
    }

    static ShippingPolicy perKg(int rate) {                    // static (Java 8)
        return kg -> BASE_COST + (long) kg * rate;
    }

    private boolean isRemote(String region) {                  // private (Java 9)
        return REMOTE_REGIONS.contains(region);
    }

    static void main(String[] args) {                          // yes, main can live here
        ShippingPolicy standard = ShippingPolicy.perKg(12);
        System.out.println(standard.cost(10) + " " + standard.costTo("Ladakh", 10));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac ShippingPolicy.java && java ShippingPolicy && javap -v -p ShippingPolicy`,
        },
        {
          type: "output",
          text: `170 255
public interface ShippingPolicy
  minor version: 0
  major version: 65
  flags: (0x0601) ACC_PUBLIC, ACC_INTERFACE, ACC_ABSTRACT
  this_class: #2                          // ShippingPolicy
  super_class: #61                        // java/lang/Object
  interfaces: 0, fields: 2, methods: 7, attributes: 3
  ...
  public static final int BASE_COST;
    descriptor: I
    flags: (0x0019) ACC_PUBLIC, ACC_STATIC, ACC_FINAL
    ConstantValue: int 50

  public static final java.util.List<java.lang.String> REMOTE_REGIONS;
    descriptor: Ljava/util/List;
    flags: (0x0019) ACC_PUBLIC, ACC_STATIC, ACC_FINAL
    ...
  public abstract long cost(int);
    descriptor: (I)J
    flags: (0x0401) ACC_PUBLIC, ACC_ABSTRACT

  public default long costTo(java.lang.String, int);
    descriptor: (Ljava/lang/String;I)J
    flags: (0x0001) ACC_PUBLIC
    Code:
      stack=4, locals=3, args_size=3
         0: aload_0
         1: aload_1
         2: invokeinterface #1,  2            // InterfaceMethod isRemote:(Ljava/lang/String;)Z
        ...
  public static ShippingPolicy perKg(int);
    descriptor: (I)LShippingPolicy;
    flags: (0x0009) ACC_PUBLIC, ACC_STATIC
  ...
  private boolean isRemote(java.lang.String);
    descriptor: (Ljava/lang/String;)Z
    flags: (0x0002) ACC_PRIVATE
  ...
  private static long lambda$perKg$0(int, int);
    flags: (0x100a) ACC_PRIVATE, ACC_STATIC, ACC_SYNTHETIC
    Code:
         0: ldc2_w        #53                 // long 50l
  ...
  static {};
    flags: (0x0008) ACC_STATIC
    Code:
         0: ldc           #37                 // String Ladakh
         2: ldc           #55                 // String Andaman
         4: invokestatic  #57                 // InterfaceMethod java/util/List.of:(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;
         7: putstatic     #18                 // Field REMOTE_REGIONS:Ljava/util/List;
        10: return`,
        },
        {
          type: "paragraph",
          text: "`10 kg × 12 + 50 = 170`, and Ladakh is a remote region, so `170 × 3 / 2 = 255`. The listing is trimmed to the lines I discuss; the constant pool alone was over a hundred entries. What I read from it:",
        },
        {
          type: "list",
          items: [
            "`flags: (0x0601) ACC_PUBLIC, ACC_INTERFACE, ACC_ABSTRACT`. The JVM specification requires `ACC_ABSTRACT` on every interface, which is why writing `abstract interface` is legal and pointless.",
            "`super_class` is `java/lang/Object`. The class file format demands that for interfaces, even though an interface doesn't extend `Object` in the language. The language gets a similar effect another way: JLS 9.2 says an interface implicitly declares abstract versions of `Object`'s public methods, which is why `policy.hashCode()` compiles on a variable of an interface type.",
            "`BASE_COST` is `ACC_PUBLIC, ACC_STATIC, ACC_FINAL` with a `ConstantValue: int 50` attribute; I wrote none of those modifiers. The JVM assigns such a field straight from the attribute, without running any bytecode. Callers don't even read the field: `lambda$perKg$0` starts with `ldc2_w 50l`, the constant copied in (and already widened to `long`). The Static Keyword lesson covers why that matters when a constant changes.",
            "`REMOTE_REGIONS` is also `public static final`, but `List.of(...)` isn't a compile-time constant, so there's no `ConstantValue`. Instead javac generated a `static {}` method, `<clinit>`, inside the interface. Source code can't contain a static block in an interface, but the class file gets one whenever a field needs code to initialize.",
            "`cost` is `ACC_PUBLIC, ACC_ABSTRACT` with no `Code` attribute.",
            "`costTo` is only `ACC_PUBLIC`, with a `Code` attribute. There's no \"default\" flag in the class file at all. `javap` prints the word because the method is a public, non-abstract, non-static method in an interface, which the JVM has allowed since class file version 52 (Java 8).",
            "`perKg` is `ACC_PUBLIC, ACC_STATIC`, and its lambda became a `private static` synthetic method inside the interface. The private `isRemote` is `ACC_PRIVATE`, and `costTo` calls it with `invokeinterface`, the interface counterpart of private class methods being called with `invokevirtual` since Java 11.",
            "`major version: 65` is JDK 21's class file version. JDK 25's `javac` writes 69.",
          ],
        },
        {
          type: "heading",
          text: "When an interface's static code runs",
        },
        {
          type: "paragraph",
          text: "That `<clinit>` raised a question I'd never thought about: when does it run? Initializing a class initializes its superclass first. For interfaces JLS 12.4.1 adds a twist: initializing a class does **not** initialize the interfaces it implements, unless an interface declares a default method. I checked:",
        },
        {
          type: "code",
          language: "java",
          title: "InterfaceInit.java",
          code: `public class InterfaceInit {
    static String log(String name) {
        System.out.println("  initializing " + name);
        return name;
    }

    interface Rated { String TAG = log("Rated"); }                  // no defaults
    interface Tracked {
        String TAG = log("Tracked");
        default String where() { return "somewhere"; }             // has a default
    }

    static class Book implements Rated { static { log("Book"); } }
    static class Parcel implements Tracked { static { log("Parcel"); } }

    public static void main(String[] args) {
        System.out.println("new Book()");
        new Book();
        System.out.println("new Parcel()");
        new Parcel();
        System.out.println("read Rated.TAG");
        System.out.println("  value " + Rated.TAG);
    }
}`,
        },
        {
          type: "output",
          text: `new Book()
  initializing Book
new Parcel()
  initializing Tracked
  initializing Parcel
read Rated.TAG
  initializing Rated
  value Rated`,
        },
        {
          type: "list",
          items: [
            "`new Book()` initialized `Book` only. `Rated`'s field initializer didn't run, because `Rated` has no default methods.",
            "`new Parcel()` initialized `Tracked` first, then `Parcel`. A default method's body could read the interface's static fields, so they have to be ready before an instance exists.",
            "`Rated` was initialized only when I read `Rated.TAG`, its first real use. JDK 25 printed exactly the same.",
          ],
        },
        {
          type: "paragraph",
          text: "So an interface field with a side effect in its initializer runs later than I'd guess, or never. One more reason to keep interface fields to real constants.",
        },
        {
          type: "heading",
          text: "Call sites: which instruction calls what",
        },
        {
          type: "paragraph",
          text: "Next, the calling side. One interface, one implementation, and calls made through different declared types:",
        },
        {
          type: "code",
          language: "java",
          title: "CallSites.java",
          code: `interface PriceRule {
    long price(long qty, int extras);

    default String label() { return "standard"; }

    static PriceRule flat(long amount) { return (qty, extras) -> amount; }
}

class BulkPrice implements PriceRule {
    public long price(long qty, int extras) { return 50 + qty * 18 + extras * 2L; }

    @Override
    public String label() { return "bulk over " + PriceRule.super.label(); }
}

public class CallSites {
    public static void main(String[] args) {
        PriceRule rule = new BulkPrice();        // declared as the interface
        BulkPrice bulk = new BulkPrice();        // declared as the class
        System.out.println(rule.price(10, 5));
        System.out.println(bulk.price(10, 5));
        System.out.println(PriceRule.flat(99).price(3, 0));
        System.out.println(rule.label());
        System.out.println(rule.hashCode() == System.identityHashCode(rule));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac CallSites.java && java CallSites && javap -c CallSites BulkPrice | grep invoke`,
        },
        {
          type: "output",
          text: `240
240
99
bulk over standard
true
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: invokespecial #9                  // Method BulkPrice."<init>":()V
      12: invokespecial #9                  // Method BulkPrice."<init>":()V
      24: invokeinterface #18,  4           // InterfaceMethod PriceRule.price:(JI)J
      29: invokevirtual #24                 // Method java/io/PrintStream.println:(J)V
      40: invokevirtual #30                 // Method BulkPrice.price:(JI)J
      43: invokevirtual #24                 // Method java/io/PrintStream.println:(J)V
      52: invokestatic  #33                 // InterfaceMethod PriceRule.flat:(J)LPriceRule;
      59: invokeinterface #18,  4           // InterfaceMethod PriceRule.price:(JI)J
      64: invokevirtual #24                 // Method java/io/PrintStream.println:(J)V
      71: invokeinterface #39,  1           // InterfaceMethod PriceRule.label:()Ljava/lang/String;
      76: invokevirtual #43                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      83: invokeinterface #46,  1           // InterfaceMethod PriceRule.hashCode:()I
      89: invokestatic  #50                 // Method java/lang/System.identityHashCode:(Ljava/lang/Object;)I
     100: invokevirtual #54                 // Method java/io/PrintStream.println:(Z)V
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       1: invokespecial #13                 // InterfaceMethod PriceRule.label:()Ljava/lang/String;
       4: invokedynamic #19,  0             // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;)Ljava/lang/String;`,
        },
        {
          type: "table",
          headers: ["Source", "Instruction", "What it means"],
          rows: [
            ["`rule.price(10, 5)`, `rule` declared `PriceRule`", "`invokeinterface #18, 4`", "Dispatched at run time through the receiver class's itable"],
            ["`bulk.price(10, 5)`, `bulk` declared `BulkPrice`", "`invokevirtual`", "Same object, same body. The declared type, not the object, picked the instruction"],
            ["`PriceRule.flat(99)`", "`invokestatic` on an `InterfaceMethod` ref", "No receiver and no dispatch"],
            ["`PriceRule.super.label()`", "`invokespecial` on an `InterfaceMethod` ref", "Exactly `PriceRule`'s default body, skipping `BulkPrice`'s override"],
            ["`rule.hashCode()`", "`invokeinterface PriceRule.hashCode`", "An `Object` method called through an interface type"],
          ],
        },
        {
          type: "paragraph",
          text: "`invokeinterface` is the only invoke instruction with extra operands. In `#18, 4`, the 4 is a **count** of argument slots including the receiver: 1 for `rule`, 2 for the `long`, 1 for the `int`. The JVM specification says plainly that this can be derived from the method descriptor and that the redundancy is historical. A fourth operand byte follows, which must be zero. The offsets show the size: the `invokeinterface` at 24 is followed by an instruction at 29, five bytes, while the `invokevirtual` at 40 is followed by one at 43, three bytes.",
        },
        {
          type: "heading",
          text: "How HotSpot finds the method: vtables and itables",
        },
        {
          type: "paragraph",
          text: "Choosing the instruction is javac's job. Finding the code at run time is the JVM's, and this is where interface calls have historically cost a little more than class calls.",
        },
        {
          type: "list",
          items: [
            "Every loaded class gets a **vtable**, an array of pointers to its virtual methods, where an inherited or overridden method keeps the same index in every subclass. So `invokevirtual` resolves to an index once, and each call is: load the receiver's class, load the entry at that index, jump.",
            "That trick can't work for interfaces. `BulkPrice` and some unrelated class can both implement `PriceRule` alongside completely different superclasses and other interfaces, so `price` can't have one index that's valid in all of them.",
            "So each class also gets an **itable**: a list of (interface, offset) pairs, one per interface the class implements, followed by one block of method pointers per interface. `invokeinterface` knows the interface and the method's position inside that interface's block, but it has to find the block first, by scanning the receiver class's list for `PriceRule`. That scan is the historical extra cost.",
          ],
        },
        {
          type: "diagram",
          text: `BulkPrice, as HotSpot lays it out (simplified)

 vtable                         itable
┌──────────────────────┐       ┌────────────┬──────────┐
│ Object's methods     │       │ PriceRule  │ offset ──┼──┐
│ ...                  │       ├────────────┼──────────┤  │
│ BulkPrice.price      │       │ (end)      │          │  │
│ BulkPrice.label      │       └────────────┴──────────┘  │
└──────────────────────┘        PriceRule block ◄─────────┘
                               ┌──────────────────────────┐
 invokevirtual BulkPrice.price │ price -> BulkPrice.price │
   = one indexed load          │ label -> BulkPrice.label │
                               └──────────────────────────┘
 invokeinterface PriceRule.price
   = find PriceRule in the list, then index into its block`,
          caption: "A class that didn't override label() would have PriceRule.label, the default body, in that slot: HotSpot fills it while linking the class.",
        },
        {
          type: "paragraph",
          text: "The JIT removes most of that cost. Compiled code at a call site that has only ever seen one receiver class doesn't search any table: it compares the receiver's class with the expected one and calls, or inlines, the target directly. The Polymorphism lesson showed this for class hierarchies; I ran the same experiment on an interface call site:",
        },
        {
          type: "code",
          language: "java",
          title: "InterfaceInlining.java",
          code: `interface Pricing { long price(int qty); }

class Standard implements Pricing { public long price(int qty) { return 50 + qty * 12L; } }
class Premium implements Pricing { public long price(int qty) { return 80 + qty * 20L; } }
class Economy implements Pricing { public long price(int qty) { return 30 + qty * 8L; } }

public class InterfaceInlining {
    static long total(Pricing p, int n) {
        long sum = 0;
        for (int i = 0; i < n; i++) {
            sum += p.price(i % 40);                  // one interface call site
        }
        return sum;
    }

    public static void main(String[] args) {
        Pricing[] seen = args.length == 0
                ? new Pricing[] { new Standard() }                                 // one class
                : new Pricing[] { new Standard(), new Premium(), new Economy() };  // three classes
        long result = 0;
        for (int round = 0; round < 30_000; round++) {
            result += total(seen[round % seen.length], 1_000);
        }
        System.out.println(result);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining InterfaceInlining | grep -E "@ 18|^[0-9]+$"
java -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining InterfaceInlining mixed | grep -E "@ 18|^[0-9]+$"
java -Xlog:vtablestubs=trace:stdout:none InterfaceInlining
java -Xlog:vtablestubs=trace:stdout:none InterfaceInlining mixed`,
        },
        {
          type: "output",
          text: `                              @ 18   Standard::price (11 bytes)   callee uses too much stack
                              @ 18   Standard::price (11 bytes)   callee uses too much stack
                              @ 18   Standard::price (11 bytes)   inline (hot)
                              @ 18   Standard::price (11 bytes)   inline (hot)
8520000000
                              @ 18   Pricing::price (0 bytes)   no static binding
                              @ 18   Pricing::price (0 bytes)   no static binding
                              @ 18   Pricing::price (0 bytes)   virtual call
                              @ 18   Pricing::price (0 bytes)   virtual call
9400000000
8520000000
itable #0 at 0x0000713c6fd88c10: size: 134, estimate: 256, slop area: 122
9400000000`,
        },
        {
          type: "list",
          items: [
            "Offset 18 is the `invokeinterface Pricing.price` in `total`. Each run printed four decisions for it: two from C1, the quick first-tier compiler, and two from C2 (one for the normal compile and one for the on-stack replacement of the running loop).",
            "With only `Standard` ever seen, C1 declined (`callee uses too much stack`) and C2 inlined `Standard::price` straight into `total`: `inline (hot)`. At that point the interface call costs nothing at all, not even a call.",
            "With three classes rotating through the same site, C1 said `no static binding` and C2 said `virtual call`: the site is megamorphic and stays a real dispatch.",
            "`-Xlog:vtablestubs=trace` shows what that dispatch is. The one-class run created no stub. The three-class run created exactly one itable stub, 134 bytes of machine code that does the itable scan on every call. I ran both versions twice more with the same result; only the address changed. On JDK 25 the stub was 131 bytes.",
          ],
        },
        {
          type: "heading",
          text: "Dynamic proxies: a class generated at run time",
        },
        {
          type: "paragraph",
          text: "The last piece of machinery is the one frameworks lean on hardest. `java.lang.reflect.Proxy.newProxyInstance` takes a class loader, a list of interfaces and an `InvocationHandler`, and returns an object of a class that **didn't exist when the program was compiled**. Every call on it lands in the handler's `invoke(proxy, method, args)`:",
        },
        {
          type: "code",
          language: "java",
          title: "ProxyPeek.java",
          code: `import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Modifier;
import java.lang.reflect.Proxy;
import java.util.Arrays;

public class ProxyPeek {
    public interface EmployeeLookup {
        String nameOf(long employeeId);

        default String greet(long employeeId) { return "Hello, " + nameOf(employeeId); }
    }

    public static void main(String[] args) {
        InvocationHandler handler = (proxy, method, methodArgs) -> {
            System.out.println("  handler: " + method.getName() + " args=" + Arrays.toString(methodArgs));
            if (method.isDefault()) {
                return InvocationHandler.invokeDefault(proxy, method, methodArgs);   // Java 16+
            }
            return switch (method.getName()) {
                case "nameOf" -> (Long) methodArgs[0] == 7L ? "Asha" : "unknown";
                case "toString" -> "an EmployeeLookup nobody wrote";
                case "hashCode" -> 42;
                case "equals" -> proxy == methodArgs[0];
                default -> throw new UnsupportedOperationException(method.getName());
            };
        };

        EmployeeLookup lookup = (EmployeeLookup) Proxy.newProxyInstance(
                EmployeeLookup.class.getClassLoader(),
                new Class<?>[] { EmployeeLookup.class },
                handler);

        Class<?> c = lookup.getClass();
        System.out.println("class:      " + c.getName());
        System.out.println("modifiers:  " + Modifier.toString(c.getModifiers()));
        System.out.println("superclass: " + c.getSuperclass().getName());
        System.out.println("interfaces: " + Arrays.toString(c.getInterfaces()));
        System.out.println("module:     " + c.getModule().getName());
        System.out.println(lookup.nameOf(7));
        System.out.println(lookup.greet(7));
        System.out.println(lookup);
    }
}`,
        },
        {
          type: "output",
          text: `class:      jdk.proxy1.$Proxy0
modifiers:  public final
superclass: java.lang.reflect.Proxy
interfaces: [interface ProxyPeek$EmployeeLookup]
module:     jdk.proxy1
  handler: nameOf args=[7]
Asha
  handler: greet args=[7]
  handler: nameOf args=[7]
Hello, Asha
  handler: toString args=null
an EmployeeLookup nobody wrote`,
        },
        {
          type: "list",
          items: [
            "The class is `jdk.proxy1.$Proxy0`: `public final`, extends `java.lang.reflect.Proxy`, implements exactly the interface I passed, and lives in a module the JDK created for it, `jdk.proxy1`. When the interface isn't public, the proxy has to live in the interface's own package instead, and with my package-private test interface the name was plain `$Proxy0`.",
            "`toString()` went through the handler too, with `args` as `null` because it takes no arguments. Proxies route `equals`, `hashCode` and `toString` to the handler; the other `Object` methods, like `getClass`, are `final` and never reach it.",
            "`greet` is a default method, and the handler got it like any other. `InvocationHandler.invokeDefault` (Java 16) runs the default body, and the log shows that body's own call to `nameOf` coming back through the proxy.",
          ],
        },
        {
          type: "paragraph",
          text: "The JDK can write the generated class to disk, so I disassembled it:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Djdk.proxy.ProxyGenerator.saveGeneratedFiles=true ProxyPeek > /dev/null
javap -p -c 'jdk/proxy1/$Proxy0.class'`,
        },
        {
          type: "output",
          text: `public final class jdk.proxy1.$Proxy0 extends java.lang.reflect.Proxy implements ProxyPeek$EmployeeLookup {
  private static final java.lang.reflect.Method m0;
  private static final java.lang.reflect.Method m1;
  private static final java.lang.reflect.Method m2;
  private static final java.lang.reflect.Method m3;
  private static final java.lang.reflect.Method m4;
  ...
  public final java.lang.String nameOf(long);
    Code:
       0: aload_0
       1: getfield      #24                 // Field java/lang/reflect/Proxy.h:Ljava/lang/reflect/InvocationHandler;
       4: aload_0
       5: getstatic     #67                 // Field m3:Ljava/lang/reflect/Method;
       8: iconst_1
       9: anewarray     #49                 // class java/lang/Object
      12: dup
      13: iconst_0
      14: lload_1
      15: invokestatic  #73                 // Method java/lang/Long.valueOf:(J)Ljava/lang/Long;
      18: aastore
      19: invokeinterface #32,  4           // InterfaceMethod java/lang/reflect/InvocationHandler.invoke:(Ljava/lang/Object;Ljava/lang/reflect/Method;[Ljava/lang/Object;)Ljava/lang/Object;
      24: checkcast     #62                 // class java/lang/String
      27: areturn
      ...
    Exception table:
       from    to  target type
           0    28    28   Class java/lang/Error
           0    28    28   Class java/lang/RuntimeException
           0    28    29   Class java/lang/Throwable`,
        },
        {
          type: "paragraph",
          text: "(I removed the blank lines between the fields.) Every generated method has the same shape: box the arguments into an `Object[]` (`Long.valueOf` for the `long`), call `h.invoke(this, m3, args)`, and `checkcast` the result back to the declared return type. `m0` to `m2` are `hashCode`, `equals` and `toString`, and `m3` and `m4` are the interface's methods, all looked up once with `getMethod` in the proxy's static initializer. `nameOf` declares no checked exceptions, so its exception table rethrows `Error` and `RuntimeException` as they are and wraps any other `Throwable` in `UndeclaredThrowableException`. This one generated class is the trick behind Spring Data repositories, Feign clients and Spring AOP's JDK proxies, and the production section builds a small Spring Data on top of it.",
        },
      ],
    },
    {
      title: "Default, Static and Private Methods: The Rules",
      blocks: [
        {
          type: "paragraph",
          text: "The Java 8 track's Default and Static Interface Methods lesson covers why these exist. The short version shows up in any collection class written before Java 8: it implements only what `Collection` required at the time, and Java 8 added methods to `Collection` and `Iterable` anyway.",
        },
        {
          type: "code",
          language: "java",
          title: "LegacyCollection.java",
          code: `import java.lang.reflect.Method;
import java.util.AbstractCollection;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;

// Written the pre-Java 8 way: only iterator() and size(), nothing about streams
class OnlineUsers extends AbstractCollection<String> {
    private final List<String> names = new ArrayList<>(List.of("Asha", "Ravi", "Imran", "Meera"));

    @Override public Iterator<String> iterator() { return names.iterator(); }
    @Override public int size() { return names.size(); }
}

public class LegacyCollection {
    public static void main(String[] args) {
        OnlineUsers users = new OnlineUsers();
        System.out.println(users.stream().filter(n -> n.length() == 4).toList());  // default
        users.removeIf(n -> n.startsWith("I"));                                    // default
        List<String> left = new ArrayList<>();
        users.forEach(left::add);                                                  // default
        System.out.println(left);

        System.out.println(Arrays.stream(Collection.class.getMethods())
                .filter(Method::isDefault).map(Method::getName).sorted().toList());
    }
}`,
        },
        {
          type: "output",
          text: `[Asha, Ravi]
[Asha, Ravi, Meera]
[forEach, parallelStream, removeIf, spliterator, stream, toArray]`,
        },
        {
          type: "paragraph",
          text: "`OnlineUsers` writes two methods, and `stream()`, `removeIf()` and `forEach()` ran anyway, as defaults. Had Java 8 added them as abstract methods, every class implementing `Collection` outside the JDK would have stopped compiling, and old compiled ones would have thrown `AbstractMethodError` on the first call. The last line is the list of defaults `Collection` has on JDK 21: the five from Java 8 (`forEach` arrives through `Iterable`) plus `toArray(IntFunction)` from Java 11.",
        },
        {
          type: "table",
          headers: ["", "`default`", "`static`", "`private`", "`private static`"],
          rows: [
            ["Since", "8", "8", "9", "9"],
            ["Access", "always `public`", "`public`", "private", "private"],
            ["Has `this`", "Yes, the implementing object", "No", "Yes", "No"],
            ["Inherited by implementing classes and sub-interfaces", "Yes", "**No**", "No", "No"],
            ["Can be overridden", "Yes", "No", "No", "No"],
            ["Called as", "`obj.m()`, or `X.super.m()` from an implementer", "`TaxRule.m()` only", "Only inside the interface", "Only inside the interface"],
          ],
        },
        {
          type: "heading",
          text: "Static interface methods are not inherited",
        },
        {
          type: "code",
          language: "java",
          title: "TaxTable.java",
          code: `interface TaxRule {
    static double rateFor(String category) { return category.equals("luxury") ? 0.28 : 0.18; }
}

interface ImportTaxRule extends TaxRule { }

public class TaxTable implements ImportTaxRule {
    public static void main(String[] args) {
        System.out.println(TaxRule.rateFor("luxury"));          // fine
        System.out.println(ImportTaxRule.rateFor("luxury"));    // sub-interface
        System.out.println(TaxTable.rateFor("luxury"));         // implementing class
        System.out.println(rateFor("luxury"));                  // unqualified, inside it
    }
}`,
        },
        {
          type: "output",
          text: `TaxTable.java:10: error: cannot find symbol
        System.out.println(ImportTaxRule.rateFor("luxury"));    // sub-interface
                                        ^
  symbol:   method rateFor(String)
  location: interface ImportTaxRule
TaxTable.java:11: error: cannot find symbol
        System.out.println(TaxTable.rateFor("luxury"));         // implementing class
                                   ^
  symbol:   method rateFor(String)
  location: class TaxTable
TaxTable.java:12: error: cannot find symbol
        System.out.println(rateFor("luxury"));                  // unqualified, inside it
                           ^
  symbol:   method rateFor(String)
  location: class TaxTable
3 errors`,
        },
        {
          type: "paragraph",
          text: "Static methods of a superclass **are** inherited, so this one surprised me. The reason is the diamond again: a class can implement many interfaces, and if two of them had a static `of()`, `MyClass.of()` would be ambiguous. Not inheriting them removes the question, and it's what lets the JDK put `List.of`, `Map.of` and `Comparator.comparing` on interfaces with no risk. Calling one through a variable of the interface type fails too, with `illegal static interface method call`; the Java 8 track's lesson shows that error.",
        },
        {
          type: "paragraph",
          text: "Private methods (Java 9) let defaults share code without publishing it, like `isRemote` in `ShippingPolicy`. They're invisible outside the interface, including to implementing classes: a class implementing `ShippingPolicy` that calls `isRemote(\"Ladakh\")` gets `cannot find symbol`, not an access error, because a private interface method isn't inherited at all. And no default may stand in for an `Object` method: `default String toString()` is a compile error, because a class's `toString` would always win over it.",
        },
      ],
    },
    {
      title: "Default Methods and the Diamond Problem",
      blocks: [
        {
          type: "image",
          src: "/images/java/interfaces-default-resolution.svg",
          alt: "Decision diagram for default-method resolution. Rule 1: if the class or any superclass declares m(), even abstractly, the class method wins (OldAlerts runs LegacyGateway.channel()). Rule 2: otherwise, if one default is the most specific, it wins (OrderAlerts and MixedAlerts run SmsNotifier.channel()). Rule 3: otherwise, with unrelated defaults or a default plus an abstract method, javac rejects the class until it overrides m(), optionally calling MapsSdk.super.healthCheck(). A small diamond shows TwoVendors implementing MapsSdk and PaymentsSdk, both with a default healthCheck(). Side notes: static interface methods never conflict, duplicate constants make the simple name ambiguous, and a conflict that appears after compilation throws IncompatibleClassChangeError when called.",
          caption: "The order I check the rules in. The class and interface names are the ones from the programs below.",
        },
        {
          type: "paragraph",
          text: "Defaults brought a small version of the C++ diamond back: a class can now inherit two **bodies** for one method. Fields still can't clash, because interfaces have no instance fields. JLS 8.4.8 settles method conflicts with three rules, applied in order. Rules 1 and 2, with one case that catches people out:",
        },
        {
          type: "code",
          language: "java",
          title: "ResolutionRules.java",
          code: `interface Notifier {
    default String channel() { return "Notifier default: email"; }
}

interface SmsNotifier extends Notifier {
    @Override
    default String channel() { return "SmsNotifier default: sms"; }   // more specific
}

class LegacyGateway {
    public String channel() { return "LegacyGateway class method"; }
}

class EmailOnly implements Notifier { }                              // declares nothing itself

class OrderAlerts implements Notifier, SmsNotifier { }               // rule 2
class OldAlerts extends LegacyGateway implements SmsNotifier { }     // rule 1
class MixedAlerts extends EmailOnly implements SmsNotifier { }       // which one?

public class ResolutionRules {
    public static void main(String[] args) {
        System.out.println("OrderAlerts: " + new OrderAlerts().channel());
        System.out.println("OldAlerts:   " + new OldAlerts().channel());
        System.out.println("MixedAlerts: " + new MixedAlerts().channel());
    }
}`,
        },
        {
          type: "output",
          text: `OrderAlerts: SmsNotifier default: sms
OldAlerts:   LegacyGateway class method
MixedAlerts: SmsNotifier default: sms`,
        },
        {
          type: "list",
          items: [
            "**Rule 2, the most specific default wins.** `OrderAlerts` lists both interfaces, but `SmsNotifier extends Notifier` and overrides `channel()`, so its default is more specific. No error; listing `Notifier` again changes nothing.",
            "**Rule 1, a class always wins.** `OldAlerts` gets `channel()` from `LegacyGateway`, a class that has never heard of `Notifier`. Only the signature has to match. This holds even for an `abstract` method in a superclass, which forces subclasses to implement it and hides the default.",
            "**The trap.** `MixedAlerts`'s superclass `EmailOnly` implements `Notifier` but doesn't **declare** `channel()`; it only inherits the default. Rule 1 is about methods declared in classes, so it doesn't apply, and rule 2 picks `SmsNotifier`'s default over `Notifier`'s even though `Notifier` came in through the superclass.",
          ],
        },
        {
          type: "heading",
          text: "Rule 3: unrelated defaults",
        },
        {
          type: "paragraph",
          text: "What the rules can't settle is two interfaces that don't know about each other, which is exactly what two vendors' SDKs look like:",
        },
        {
          type: "code",
          language: "java",
          title: "TwoVendors.java",
          code: `interface MapsSdk {                                   // vendor A's library
    default String healthCheck() { return "maps ok"; }
}

interface PaymentsSdk {                               // vendor B's library
    default String healthCheck() { return "payments ok"; }
}

public class TwoVendors implements MapsSdk, PaymentsSdk {
    public static void main(String[] args) {
        System.out.println(new TwoVendors().healthCheck());
    }
}`,
        },
        {
          type: "output",
          text: `TwoVendors.java:9: error: types MapsSdk and PaymentsSdk are incompatible;
public class TwoVendors implements MapsSdk, PaymentsSdk {
       ^
  class TwoVendors inherits unrelated defaults for healthCheck() from types MapsSdk and PaymentsSdk
1 error`,
        },
        {
          type: "paragraph",
          text: "The fix is to override and decide. Inside the override, `X.super.m()` calls one specific interface's default:",
        },
        {
          type: "code",
          language: "java",
          title: "TwoVendorsFixed.java",
          code: `interface MapsSdk {
    default String healthCheck() { return "maps ok"; }
}

interface PaymentsSdk {
    default String healthCheck() { return "payments ok"; }
}

public class TwoVendorsFixed implements MapsSdk, PaymentsSdk {
    @Override
    public String healthCheck() {                     // I decide, explicitly
        return MapsSdk.super.healthCheck() + ", " + PaymentsSdk.super.healthCheck();
    }

    public static void main(String[] args) {
        System.out.println(new TwoVendorsFixed().healthCheck());
    }
}`,
        },
        {
          type: "output",
          text: `maps ok, payments ok`,
        },
        {
          type: "paragraph",
          text: "`X.super.m()` compiles to `invokespecial` on an `InterfaceMethod` ref, the same instruction `super.m()` uses in a class, as the `CallSites` listing showed for `PriceRule.super.label()`: no dispatch, exactly that interface's body. `X` must be a direct superinterface of the class; the Java 8 track's lesson shows the two errors when it isn't.",
        },
        {
          type: "paragraph",
          text: "Half a diamond is rule 3 too. A default from one interface doesn't implement an abstract method with the same signature from an unrelated one: with `interface Priced { long price(); }` and `interface FlatPriced { default long price() { return 50; } }`, a class implementing both got `HalfDiamond is not abstract and does not override abstract method price() in Priced`, and declaring it `abstract` changed the message to `types FlatPriced and Priced are incompatible; class HalfDiamond inherits abstract and default for price() from types FlatPriced and Priced`. Either way, the class has to write `price()` itself.",
        },
        {
          type: "heading",
          text: "When the conflict appears after compilation",
        },
        {
          type: "paragraph",
          text: "javac only sees the interfaces as they are on the day it compiles. The Java 8 track's Default and Static Interface Methods lesson shows the full experiment, and I repeated it with this lesson's names. `ShopApp implements MapsSdk, PaymentsSdk` was compiled while only `MapsSdk` had a default `healthCheck()`. Then I recompiled just `PaymentsSdk` with a default of its own, the way a vendor upgrade would. The old `ShopApp.class` still loaded and its other methods worked, but calling `healthCheck()` threw `IncompatibleClassChangeError: Conflicting default methods: MapsSdk.healthCheck PaymentsSdk.healthCheck`, from a frame `at ShopApp.healthCheck(ShopApp.java)` with no line number. HotSpot applied rule 3 while linking the class, couldn't pick a body, and generated a method that only throws. JDK 25 did exactly the same, and recompiling `ShopApp` turned it back into the compile error above.",
        },
        {
          type: "heading",
          text: "Constants don't resolve, they collide",
        },
        {
          type: "code",
          language: "java",
          title: "SameConstant.java",
          code: `interface SmallBox { int MAX_ITEMS = 4; }
interface LargeBox { int MAX_ITEMS = 6; }

public class SameConstant implements SmallBox, LargeBox {
    public static void main(String[] args) {
        System.out.println(MAX_ITEMS);
    }
}`,
        },
        {
          type: "output",
          text: `SameConstant.java:6: error: reference to MAX_ITEMS is ambiguous
        System.out.println(MAX_ITEMS);
                           ^
  both variable MAX_ITEMS in SmallBox and variable MAX_ITEMS in LargeBox match
1 error`,
        },
        {
          type: "paragraph",
          text: "There's no rule to pick one. The class compiles as long as nothing uses the simple name, and `SmallBox.MAX_ITEMS + \" \" + LargeBox.MAX_ITEMS` printed `4 6`. It's a small taste of why constants don't belong in interfaces that classes implement, which Common Mistakes comes back to.",
        },
      ],
    },
    {
      title: "Functional, Marker and Sealed Interfaces",
      blocks: [
        {
          type: "heading",
          text: "Functional interfaces",
        },
        {
          type: "paragraph",
          text: "An interface with exactly one abstract method is a **functional interface**, and a lambda or method reference can implement it. The Java 8 track's Lambda Expressions and Functional Interfaces lessons cover them in full; here are only the interface rules. `@FunctionalInterface` is optional, but with it javac checks the count:",
        },
        {
          type: "code",
          language: "java",
          title: "TooManyAbstract.java",
          code: `@FunctionalInterface
interface PriceCalculator {
    long price(int qty);
    long priceWithTax(int qty, int taxPercent);       // a second abstract method
}`,
        },
        {
          type: "output",
          text: `TooManyAbstract.java:1: error: Unexpected @FunctionalInterface annotation
@FunctionalInterface
^
  PriceCalculator is not a functional interface
    multiple non-overriding abstract methods found in interface PriceCalculator
1 error`,
        },
        {
          type: "paragraph",
          text: "Defaults and statics don't count, and neither does an abstract method that matches a public `Object` method, since every implementation already has one from `Object`. That's how `Comparator` declares `equals` and stays functional; adding `boolean equals(Object other);` to `PriceCalculator` with a single `price` method compiled without complaint. The object a lambda creates belongs to a hidden class the JVM generates at run time, which implements the interface: the `ShippingStrategies` example below prints `isHidden()` for one. So a lambda, like a proxy, is a class nobody wrote; the Lambda Expressions lesson shows the `invokedynamic` behind it.",
        },
        {
          type: "heading",
          text: "Marker interfaces",
        },
        {
          type: "paragraph",
          text: "A **marker interface** has no methods at all. Implementing it tags the class, and some code checks the tag with `instanceof`. The three famous ones: `Serializable`, without which `ObjectOutputStream` throws `NotSerializableException` (the Serialization lesson later in this track); `Cloneable`, without which `Object.clone()` throws `CloneNotSupportedException` (the next lesson, Object Class Methods); and `RandomAccess`, which says a `List` has fast `get(i)`, like `ArrayList` and unlike `LinkedList`.",
        },
        {
          type: "paragraph",
          text: "`RandomAccess` is the one I wanted to see working, because the JDK uses it to choose an algorithm. The JDK 21 package on my machine ships without sources, so I read `java/util/Collections.java` from JDK 25's `lib/src.zip`:",
        },
        {
          type: "code",
          language: "java",
          code: `private static final int BINARYSEARCH_THRESHOLD   = 5000;

public static <T>
int binarySearch(List<? extends Comparable<? super T>> list, T key) {
    if (list instanceof RandomAccess || list.size()<BINARYSEARCH_THRESHOLD)
        return Collections.indexedBinarySearch(list, key);
    else
        return Collections.iteratorBinarySearch(list, key);
}`,
        },
        {
          type: "paragraph",
          text: "`shuffle`, `reverse`, `fill`, `rotate` and `copy` have the same kind of check. To watch it decide, I made two lists that differ only in the marker, and counted the calls to `get`:",
        },
        {
          type: "code",
          language: "java",
          title: "RandomAccessCheck.java",
          code: `import java.util.AbstractList;
import java.util.Collections;
import java.util.List;
import java.util.RandomAccess;

public class RandomAccessCheck {
    // The numbers 0..size-1, computed on demand, counting every get(i)
    static class Numbers extends AbstractList<Integer> {
        private final int size;
        int gets;
        Numbers(int size) { this.size = size; }
        @Override public Integer get(int index) { gets++; return index; }
        @Override public int size() { return size; }
    }

    // Identical, plus one marker interface with no methods
    static class IndexedNumbers extends Numbers implements RandomAccess {
        IndexedNumbers(int size) { super(size); }
    }

    public static void main(String[] args) {
        for (Numbers numbers : List.of(new Numbers(100_000), new IndexedNumbers(100_000))) {
            int found = Collections.binarySearch(numbers, 73_421);
            System.out.printf("%-14s RandomAccess=%-5b index=%d  get() calls=%,d%n",
                    numbers.getClass().getSimpleName(), numbers instanceof RandomAccess, found, numbers.gets);
        }
    }
}`,
        },
        {
          type: "output",
          text: `Numbers        RandomAccess=false index=73421  get() calls=100,002
IndexedNumbers RandomAccess=true  index=73421  get() calls=16`,
        },
        {
          type: "paragraph",
          text: "Same data, same answer: 100,002 calls against 16. Without the marker, `binarySearch` assumed `get(i)` might be slow and walked a `ListIterator` back and forth instead, and `AbstractList`'s iterator calls `get` for every step. With the marker it did a real binary search. An empty interface changed the algorithm, and the output was the same on JDK 25. The flip side is that the marker is a promise the compiler can't check: tagging a list whose `get(i)` is slow sends it down the indexed path anyway.",
        },
        {
          type: "table",
          headers: ["", "Marker interface", "Annotation"],
          rows: [
            ["Defines a type", "Yes: `void save(Serializable s)` is checked by javac", "No"],
            ["Checked by", "`instanceof` at run time, or the compiler where it's a parameter type", "Reflection at run time, or an annotation processor at build time"],
            ["Can mark", "Classes and interfaces only", "Classes, methods, fields, parameters, packages, modules"],
            ["Inherited by subclasses", "Always", "Only class annotations marked `@Inherited`"],
            ["Can carry data", "No", "Yes: `@Table(name = \"orders\")`"],
            ["JDK examples", "`Serializable`, `Cloneable`, `RandomAccess`", "`@FunctionalInterface`, `@Deprecated`, `@Override`"],
          ],
        },
        {
          type: "paragraph",
          text: "My rule: if code should be able to say \"give me one of these\" in a method signature, it's a marker interface. If it's metadata for a framework or a tool, it's an annotation. `ObjectOutputStream.writeObject` takes `Object` rather than `Serializable`, which is the classic case of a marker type that wasn't used as a type, so the check only happens at run time.",
        },
        {
          type: "heading",
          text: "Sealed interfaces",
        },
        {
          type: "paragraph",
          text: "A **sealed** interface (Java 17) lists exactly which classes may implement it. With records as the implementations, it models a closed set of outcomes, and `switch` can check that every one is handled. The Inheritance lesson covers the sealed rules and the Polymorphism lesson covers exhaustive `switch`; here's the interface flavour:",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentResults.java",
          code: `import java.util.Arrays;
import java.util.List;

public class PaymentResults {
    sealed interface PaymentResult permits Paid, Declined, Pending { }

    record Paid(String txnId, long amount) implements PaymentResult { }
    record Declined(String reason) implements PaymentResult { }
    record Pending(int retryInSeconds) implements PaymentResult { }

    static String describe(PaymentResult result) {
        return switch (result) {                       // no default branch needed
            case Paid p -> "paid " + p.amount() + " (" + p.txnId() + ")";
            case Declined d -> "declined: " + d.reason();
            case Pending(int seconds) -> "pending, retry in " + seconds + "s";
        };
    }

    public static void main(String[] args) {
        List<PaymentResult> results =
                List.of(new Paid("TXN-81", 240), new Declined("insufficient balance"), new Pending(30));
        for (PaymentResult r : results) System.out.println(describe(r));
        System.out.println("sealed=" + PaymentResult.class.isSealed() + " permits "
                + Arrays.stream(PaymentResult.class.getPermittedSubclasses()).map(Class::getSimpleName).toList());
    }
}`,
        },
        {
          type: "output",
          text: `paid 240 (TXN-81)
declined: insufficient balance
pending, retry in 30s
sealed=true permits [Paid, Declined, Pending]`,
        },
        {
          type: "paragraph",
          text: "`javap -v 'PaymentResults$PaymentResult'` shows how the JVM enforces it: the interface's flags are the usual `ACC_INTERFACE, ACC_ABSTRACT`, plus a `PermittedSubclasses` attribute listing `PaymentResults$Paid`, `PaymentResults$Declined` and `PaymentResults$Pending`. Leaving `Pending` out of the `switch` gives `the switch expression does not cover all possible input values`, and a record `Refunded` that implements the interface without being listed gives `class is not allowed to extend sealed class: PaymentResult (as it is not listed in its 'permits' clause)`. I also compiled a `Refunded` against an unsealed version and swapped the sealed one in afterwards: the JVM refused to load it, with `IncompatibleClassChangeError: class Refunded cannot implement sealed interface PaymentResult`.",
        },
      ],
    },
    {
      title: "Interface vs Abstract Class",
      blocks: [
        {
          type: "paragraph",
          text: "The comparison every interview asks for, in full, as of Java 21 (Java 25 didn't change any of it):",
        },
        {
          type: "table",
          headers: ["", "Interface", "Abstract class"],
          rows: [
            ["How a class uses it", "`implements` (an interface `extends` it)", "`extends`"],
            ["How many per class", "Any number", "One"],
            ["Instance fields (state)", "None; every field is `public static final`", "Any fields, any access"],
            ["Constructors", "None", "Yes, run through the subclass's `super(...)` chain"],
            ["Initializer blocks", "None (javac still writes `<clinit>` for non-constant fields)", "Instance and static initializers"],
            ["Abstract methods", "Implicitly `public abstract`", "Must say `abstract`; `public`, `protected` or package-private"],
            ["Concrete instance methods", "`default` (8+), always `public`, never `final`", "Any access; can be `final` or `synchronized`"],
            ["Static methods", "Yes (8+), not inherited", "Yes, inherited"],
            ["Private methods", "Yes (9+)", "Yes"],
            ["`protected` or package-private members", "No", "Yes"],
            ["Implementing `equals`, `hashCode`, `toString`", "No (only abstract redeclarations)", "Yes"],
            ["Multiple inheritance", "Of type, and of behaviour through defaults", "No"],
            ["Sealed", "Yes (17+)", "Yes (17+)"],
            ["Lambda target", "Yes, if it has one abstract method", "No"],
            ["Adding a method later", "A default is binary compatible; an abstract method breaks implementers", "A concrete method is safe; an abstract method breaks subclasses"],
            ["Class file flags", "`ACC_INTERFACE, ACC_ABSTRACT` (0x0600)", "`ACC_SUPER, ACC_ABSTRACT` (0x0420)"],
            ["Calls through its type", "`invokeinterface` (itable)", "`invokevirtual` (vtable)"],
            ["Typical role", "A contract or capability that unrelated classes share", "A partial implementation, with state, for one family of classes"],
          ],
        },
        {
          type: "paragraph",
          text: "(Both flag values are from `javap -v` on the two types in the next program, which are package-private, hence no `ACC_PUBLIC`.) The JDK's answer to \"which one?\" is usually **both**: an interface as the type, plus an optional skeletal abstract class with the boring parts. `List` and `AbstractList`, `Map` and `AbstractMap`, `Collection` and `AbstractCollection`. Callers depend on the interface; implementers may extend the skeleton or not. The same shape for payment providers:",
        },
        {
          type: "code",
          language: "java",
          title: "Gateways.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Gateways {
    record Receipt(String gateway, String orderId, long amount, boolean ok, String note) { }

    // The type everything else depends on
    interface PaymentGateway {
        String name();
        Receipt charge(String orderId, long amount);
    }

    // Skeletal implementation: the shared, boring parts, like AbstractList for List
    abstract static class AbstractPaymentGateway implements PaymentGateway {
        private final String name;
        private final List<String> audit = new ArrayList<>();      // state: needs a class

        protected AbstractPaymentGateway(String name) { this.name = name; }

        @Override public final String name() { return name; }

        @Override
        public final Receipt charge(String orderId, long amount) {   // the template
            if (amount <= 0) return new Receipt(name, orderId, amount, false, "invalid amount");
            Receipt receipt = doCharge(orderId, amount);
            audit.add(orderId + (receipt.ok() ? " ok" : " failed"));
            return receipt;
        }

        protected abstract Receipt doCharge(String orderId, long amount);   // the one varying step

        List<String> audit() { return List.copyOf(audit); }
    }

    static class CardGateway extends AbstractPaymentGateway {
        CardGateway() { super("card"); }
        @Override protected Receipt doCharge(String orderId, long amount) {
            return new Receipt(name(), orderId, amount, true, "auth 4821");
        }
    }

    static class UpiGateway extends AbstractPaymentGateway {
        UpiGateway() { super("upi"); }
        @Override protected Receipt doCharge(String orderId, long amount) {
            return new Receipt(name(), orderId, amount, true, "collect request sent");
        }
    }

    // Already extends another class, so the skeleton is out of reach. The interface still fits.
    static class LedgerClient {
        long balanceOf(String customer) { return 150; }
    }

    static class WalletGateway extends LedgerClient implements PaymentGateway {
        @Override public String name() { return "wallet"; }
        @Override public Receipt charge(String orderId, long amount) {
            boolean ok = balanceOf("Asha") >= amount;
            return new Receipt(name(), orderId, amount, ok, ok ? "debited" : "insufficient balance");
        }
    }

    public static void main(String[] args) {
        List<PaymentGateway> gateways = List.of(new CardGateway(), new UpiGateway(), new WalletGateway());
        for (PaymentGateway gateway : gateways) {
            System.out.println(gateway.charge("O-1001", 240));
        }
        CardGateway card = new CardGateway();
        System.out.println(card.charge("O-1002", 0));
        card.charge("O-1003", 120);
        System.out.println("card audit: " + card.audit());
    }
}`,
        },
        {
          type: "output",
          text: `Receipt[gateway=card, orderId=O-1001, amount=240, ok=true, note=auth 4821]
Receipt[gateway=upi, orderId=O-1001, amount=240, ok=true, note=collect request sent]
Receipt[gateway=wallet, orderId=O-1001, amount=240, ok=false, note=insufficient balance]
Receipt[gateway=card, orderId=O-1002, amount=0, ok=false, note=invalid amount]
card audit: [O-1003 ok]`,
        },
        {
          type: "list",
          items: [
            "`PaymentGateway` is the type. `main` holds a `List<PaymentGateway>` and never names a concrete class when it uses them.",
            "`AbstractPaymentGateway` holds what an interface can't: a `name` field set by a constructor, an `audit` list, and a `final` template method that validates, delegates to `doCharge` and records the result. The zero-amount charge never reached `doCharge` or the audit.",
            "`WalletGateway` already extends `LedgerClient`, so it can't use the skeleton. If the abstract class were the only type, the wallet couldn't be a payment gateway at all. With the interface as the type, it implements `PaymentGateway` directly and fits in the same list.",
          ],
        },
        {
          type: "paragraph",
          text: "The short version I keep in my head: the interface says **what** callers can rely on, the abstract class shares **how** for the implementations that want it. When the shared code can be written purely in terms of the interface's own methods, it doesn't even need the abstract class; a default method is enough. The When to Use section below turns this into a decision flow.",
        },
      ],
    },
    {
      title: "Evolving a Published Interface",
      blocks: [
        {
          type: "paragraph",
          text: "Once an interface is published, in a shared library or a module other teams implement, every change is a compatibility question. **Source** compatibility asks whether code still compiles; **binary** compatibility asks whether code compiled earlier still links and runs. I tested both with separate compilation. Version 1 of a small shipping library, and an implementer compiled once against it:",
        },
        {
          type: "code",
          language: "java",
          title: "ShippingRule.java (v1)",
          code: `public interface ShippingRule {
    long cost(int kg);
}`,
        },
        {
          type: "code",
          language: "java",
          title: "ExpressShipping.java (compiled once, against v1)",
          code: `public class ExpressShipping implements ShippingRule {
    public long cost(int kg) { return 60 + kg * 15L; }
}`,
        },
        {
          type: "paragraph",
          text: "Version 2 adds a default method. I recompiled only the interface and a new caller, and left `ExpressShipping.class` exactly as it was:",
        },
        {
          type: "code",
          language: "java",
          title: "ShippingRule.java (v2)",
          code: `public interface ShippingRule {
    long cost(int kg);

    default String describe() {                       // added in v2
        return getClass().getSimpleName() + ", 10 kg = " + cost(10);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Billing.java (v2)",
          code: `public class Billing {
    public static void main(String[] args) {
        ShippingRule rule = new ExpressShipping();     // ExpressShipping.class is still the v1 build
        System.out.println(rule.cost(10));
        System.out.println(rule.describe());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out v1/ShippingRule.java v1/ExpressShipping.java
javac -d out -cp out v2/ShippingRule.java v2/Billing.java
java -cp out Billing`,
        },
        {
          type: "output",
          text: `210
ExpressShipping, 10 kg = 210`,
        },
        {
          type: "paragraph",
          text: "The old class picked up `describe()` without being touched: HotSpot put the default into `ExpressShipping`'s itable when it linked the class. Version 3 adds an **abstract** method, and the caller uses it:",
        },
        {
          type: "code",
          language: "java",
          title: "ShippingRule.java (v3)",
          code: `public interface ShippingRule {
    long cost(int kg);

    default String describe() {
        return getClass().getSimpleName() + ", 10 kg = " + cost(10);
    }

    String currency();                                // added in v3, abstract
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Billing.java (v3)",
          code: `public class Billing {
    public static void main(String[] args) {
        ShippingRule rule = new ExpressShipping();     // ExpressShipping.class is still the v1 build
        System.out.println(rule.cost(10));
        System.out.println(rule.describe());
        System.out.println(rule.currency());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out -cp out v3/ShippingRule.java v3/Billing.java
java -cp out Billing
javac -d out -cp out v1/ExpressShipping.java   # the implementer rebuilds against v3`,
        },
        {
          type: "output",
          text: `210
ExpressShipping, 10 kg = 210
Exception in thread "main" java.lang.AbstractMethodError: Receiver class ExpressShipping does not define or inherit an implementation of the resolved method 'abstract java.lang.String currency()' of interface ShippingRule.
	at Billing.main(Billing.java:6)
v1/ExpressShipping.java:1: error: ExpressShipping is not abstract and does not override abstract method currency() in ShippingRule
public class ExpressShipping implements ShippingRule {
       ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`ExpressShipping.class` still loaded, and `cost` and `describe` still worked. Nothing failed until the moment `currency()` was called. That's the dangerous part: an incompatible interface change can sit unnoticed in production until a rarely used path calls the new method. Rebuilding the implementer turns it into a compile error, which is the version I'd much rather meet. This is the interface flavour of what the Abstraction lesson showed for abstract classes: adding an abstract method to a published type breaks binary compatibility for every implementer, at the first call rather than at load time.",
        },
        {
          type: "callout",
          tone: "note",
          title: "JDK 25 words it differently",
          text: "The same classes on JDK 25 fail with the same `AbstractMethodError`, but with the message `Method ExpressShipping.currency()Ljava/lang/String; is abstract` and one more frame, `at ExpressShipping.currency(ExpressShipping.java)`, with no line number. With `-Xlog:defaultmethods=debug`, both JDK 21 and JDK 25 log `Created 1 overpass methods` for `ExpressShipping`: a generated `currency()` whose only job is to throw. On JDK 25 that generated method is what ran.",
        },
        {
          type: "heading",
          text: "How I'd add a method to a published interface",
        },
        {
          type: "list",
          items: [
            "As a `default`, when a sensible implementation can be written from the other methods. That's binary compatible for every implementer, in the common case where no other interface brings a default with the same signature.",
            "When no sensible default exists, a default that throws `UnsupportedOperationException` with a clear message, the way Java 8 turned `Iterator.remove()` into a default. Implementers keep compiling, and a caller that needs the method finds out at the first call with a readable error instead of an `AbstractMethodError`.",
            "Or a new interface that extends the old one (`TrackedShippingRule extends ShippingRule`), which implementers opt into, with callers checking `instanceof` where they need it.",
            "A default can still break source compatibility: an implementer that already has a method with the same signature but a different return type or weaker access stops compiling, and a default that matches one from another interface gives the run-time conflict shown in the diamond section. So before adding one to a widely implemented interface, I'd search the implementers for the name.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `rule.price(10, 5)` from `CallSites` through compile time and run time:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "javac checks `PriceRule rule = new BulkPrice();`. `BulkPrice` implements `PriceRule`, so the assignment is a widening reference conversion: no cast, no check at run time.",
            "When it compiled `BulkPrice`, javac had already checked that every abstract method of `PriceRule` has a `public` implementation, and compiled `PriceRule.super.label()` to `invokespecial`.",
            "For `rule.price(10, 5)`, javac looks the method up in the declared type, `PriceRule`, not in `BulkPrice`. It picks `price(long, int)`, widens `10` to `long`, and emits `invokeinterface #18, 4` naming `PriceRule.price:(JI)J`.",
            "At run time, `new BulkPrice` loads `BulkPrice`, which loads its superinterface `PriceRule`. Linking builds `BulkPrice`'s vtable and itable; default-method processing finds no empty interface slot, since `BulkPrice` declares both `price` and `label`.",
            "Initializing `BulkPrice` initializes `PriceRule` too, because `PriceRule` declares a default method, the rule `InterfaceInit` showed.",
            "The first time `invokeinterface #18` executes, the JVM resolves the `InterfaceMethodref`: `PriceRule` must be an interface and must have `price:(JI)J`.",
            "Each execution, the JVM takes the receiver, a `BulkPrice`, finds `PriceRule`'s block in its itable, takes the `price` entry, `BulkPrice.price`, and pushes a frame with `this`, `qty` (two slots) and `extras`.",
            "`BulkPrice.price` computes `50 + 10 × 18 + 5 × 2 = 240` and returns it with `lreturn`; the frame is popped and `240` lands on `main`'s operand stack for `println`.",
            "If this call site turns hot and keeps seeing only `BulkPrice`, the JIT compiles it into a class check plus the inlined body of `BulkPrice.price`, and the itable isn't consulted any more, as `InterfaceInlining` showed.",
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
          title: "InterfaceSyntax.java",
          code: `import java.util.List;

public class InterfaceSyntax {
    interface Identified { String id(); }                              // one abstract method

    interface Rateable {
        int MAX_STARS = 5;                                             // constant
        double rating();                                               // abstract
        default String stars() { return rounded() + "/" + MAX_STARS; } // default
        static Rateable unrated() { return () -> 0.0; }                // static
        private long rounded() { return Math.min(MAX_STARS, Math.round(rating())); } // private
    }

    interface Product extends Identified, Rateable {                   // extends two interfaces
        default String card() { return id() + " " + stars(); }
    }

    sealed interface Shape permits Circle, Square { }                  // sealed (Java 17)
    record Circle(double radius) implements Shape { }
    record Square(double side) implements Shape { }

    abstract static class Item { abstract String name(); }

    static class Book extends Item implements Product {                // extends, then implements
        public String id() { return "B-17"; }
        public double rating() { return 4.6; }
        String name() { return "Clean Code"; }
        @Override public String stars() { return "*" + Product.super.stars(); }  // X.super.m()
    }

    interface Repository<T, ID> { T findById(ID id); }                // generic interface

    public static void main(String[] args) {
        Product book = new Book();                                     // interface as a type
        System.out.println(book.card());
        System.out.println(Rateable.unrated().stars());

        Identified anon = new Identified() {                           // anonymous class
            public String id() { return "B-anon"; }
        };
        Identified lambda = () -> "B-lambda";                          // lambda
        Repository<String, Integer> names = List.of("Asha", "Ravi")::get;  // method reference
        System.out.println(anon.id() + " " + lambda.id() + " " + names.findById(1));

        Object o = book;
        if (o instanceof Rateable r && r.rating() > 4.5) {             // instanceof pattern
            System.out.println("top rated " + r.stars());
        }

        Shape shape = new Square(3);
        System.out.println(switch (shape) {                            // exhaustive, no default
            case Circle c -> "circle, radius " + c.radius();
            case Square sq -> "square, area " + sq.side() * sq.side();
        });
        System.out.println(Rateable.MAX_STARS + " " + (book instanceof Identified));
    }
}`,
        },
        {
          type: "output",
          text: `B-17 *5/5
0/5
B-anon B-lambda Ravi
top rated *5/5
square, area 9.0
5 true`,
        },
        {
          type: "list",
          items: [
            "`Product.super.stars()` works even though `Product` doesn't declare `stars()`: it inherits the default from `Rateable`, and `Product` is a direct superinterface of `Book`. The override adds the `*`, and `card()`, a default in `Product`, picks up the override, because `stars()` inside it is an ordinary virtual call on `this`.",
            "`List.of(\"Asha\", \"Ravi\")::get` implements `Repository<String, Integer>`: `findById(1)` unboxes the `Integer` and calls `get(1)`. Any method with a compatible shape can implement a functional interface.",
            "`4.6` rounds to `5`, and the `private` helper caps it at `MAX_STARS`. `Rateable.unrated()` is a static factory returning a lambda, so its rating is `0.0`.",
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Capabilities: one class, several interfaces",
        },
        {
          type: "paragraph",
          text: "A book can be shipped, rated and taxed; a laptop can be shipped and taxed; an online course can only be rated. Each capability gets its own small interface, and each method asks only for the capability it needs:",
        },
        {
          type: "code",
          language: "java",
          title: "Capabilities.java",
          code: `import java.util.List;

public class Capabilities {
    interface Shippable { double weightKg(); }
    interface Rateable { double rating(); }
    interface Taxable { long tax(long price); }

    // A record's accessors are public methods, so weightKg() and rating() implement the interfaces
    record Book(String title, double weightKg, double rating) implements Shippable, Rateable, Taxable {
        public long tax(long price) { return price * 5 / 100; }
    }

    record Laptop(String model, double weightKg) implements Shippable, Taxable {
        public long tax(long price) { return price * 18 / 100; }
    }

    record Course(String title, double rating) implements Rateable { }

    static double shippingWeight(List<? extends Shippable> parcel) {
        return parcel.stream().mapToDouble(Shippable::weightKg).sum();
    }

    static double averageRating(List<? extends Rateable> items) {
        return items.stream().mapToDouble(Rateable::rating).average().orElse(0);
    }

    public static void main(String[] args) {
        Book book = new Book("Clean Code", 0.5, 4.8);
        Laptop laptop = new Laptop("ThinkPad", 1.5);
        Course course = new Course("Java Basics", 4.2);

        System.out.println("parcel weight " + shippingWeight(List.of(book, laptop)) + " kg");
        System.out.println("average rating " + averageRating(List.of(book, course)));

        for (Object item : List.of(book, laptop, course)) {
            String tax = item instanceof Taxable t ? String.valueOf(t.tax(1000)) : "-";
            System.out.printf("%-7s shippable=%-5b rateable=%-5b tax on 1000: %s%n",
                    item.getClass().getSimpleName(), item instanceof Shippable, item instanceof Rateable, tax);
        }
    }
}`,
        },
        {
          type: "output",
          text: `parcel weight 2.0 kg
average rating 4.5
Book    shippable=true  rateable=true  tax on 1000: 50
Laptop  shippable=true  rateable=false tax on 1000: 180
Course  shippable=false rateable=true  tax on 1000: -`,
        },
        {
          type: "paragraph",
          text: "Records implement interfaces neatly: the accessors are public methods, so `weightKg()` and `rating()` satisfy `Shippable` and `Rateable` with no extra code. `shippingWeight` accepts anything `Shippable`, including classes that don't exist yet, and passing it a `Course` would be a compile error rather than a bug a test has to catch.",
        },
        {
          type: "diagram",
          text: `               Shippable    Rateable    Taxable
               weightKg()   rating()    tax(price)
Book               ●            ●           ●
Laptop             ●                        ●
Course                          ●

shippingWeight(List<? extends Shippable>)  takes Book, Laptop
averageRating(List<? extends Rateable>)    takes Book, Course`,
          caption: "Interfaces slice the domain by what objects can do, not by what they are.",
        },
        {
          type: "heading",
          text: "One interface, four ways to implement it",
        },
        {
          type: "code",
          language: "java",
          title: "ShippingStrategies.java",
          code: `import java.util.LinkedHashMap;
import java.util.Map;

public class ShippingStrategies {
    interface ShippingCost { long cost(int kg, int km); }

    static class StandardShipping implements ShippingCost {             // a named class
        public long cost(int kg, int km) { return 50 + kg * 12L + km; }
    }

    static long overseasCost(int kg, int km) { return 300 + kg * 15L; }

    public static void main(String[] args) {
        Map<String, ShippingCost> byOption = new LinkedHashMap<>();
        byOption.put("standard", new StandardShipping());
        byOption.put("express", new ShippingCost() {                     // an anonymous class
            public long cost(int kg, int km) {
                return Math.round(new StandardShipping().cost(kg, km) * 1.25);
            }
        });
        byOption.put("economy", (kg, km) -> 30 + kg * 8L);               // a lambda
        byOption.put("overseas", ShippingStrategies::overseasCost);      // a method reference

        for (Map.Entry<String, ShippingCost> e : byOption.entrySet()) {
            Class<?> c = e.getValue().getClass();
            String kind = c.isAnonymousClass() ? "anonymous class"
                    : c.isHidden() ? "hidden class from a lambda or method ref"
                    : "named class " + c.getSimpleName();
            System.out.printf("%-8s 12 kg, 20 km = %3d   (%s)%n", e.getKey(), e.getValue().cost(12, 20), kind);
        }
    }
}`,
        },
        {
          type: "output",
          text: `standard 12 kg, 20 km = 214   (named class StandardShipping)
express  12 kg, 20 km = 268   (anonymous class)
economy  12 kg, 20 km = 126   (hidden class from a lambda or method ref)
overseas 12 kg, 20 km = 480   (hidden class from a lambda or method ref)`,
        },
        {
          type: "paragraph",
          text: "The map's callers see one type and can't tell a named class from a lambda. A lambda or method reference is the lightest way to implement a one-method interface; an anonymous class can hold state or several methods; a named class can be reused and tested on its own. The Nested and Inner Classes lesson compares anonymous classes and lambdas properly.",
        },
        {
          type: "heading",
          text: "Interfaces the language itself calls",
        },
        {
          type: "code",
          language: "java",
          title: "OrderHistory.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

public class OrderHistory {
    record Order(String id, long total) implements Comparable<Order> {
        public int compareTo(Order other) { return Long.compare(total, other.total); }   // sort by total
    }

    // Iterable is what the enhanced for loop asks for
    static class History implements Iterable<Order> {
        private final List<Order> orders = new ArrayList<>();
        void add(Order order) { orders.add(order); }
        public Iterator<Order> iterator() { return Collections.unmodifiableList(orders).iterator(); }
    }

    // AutoCloseable is what try-with-resources asks for
    static class ExportFile implements AutoCloseable {
        ExportFile() { System.out.println("export opened"); }
        void write(Order order) { System.out.println("  wrote " + order.id() + " " + order.total()); }
        public void close() { System.out.println("export closed"); }
    }

    public static void main(String[] args) {
        History history = new History();
        history.add(new Order("O-3", 310));
        history.add(new Order("O-1", 240));
        history.add(new Order("O-2", 180));

        try (ExportFile export = new ExportFile()) {
            for (Order order : history) {
                export.write(order);
            }
        }

        List<Order> byTotal = new ArrayList<>();
        history.forEach(byTotal::add);             // forEach is a default method of Iterable
        Collections.sort(byTotal);                 // works because Order is Comparable
        System.out.println(byTotal.stream().map(Order::id).toList());
    }
}`,
        },
        {
          type: "output",
          text: `export opened
  wrote O-3 310
  wrote O-1 240
  wrote O-2 180
export closed
[O-2, O-1, O-3]`,
        },
        {
          type: "paragraph",
          text: "The enhanced `for` loop accepts anything `Iterable`; `javap -c` showed it compiled to a call to `History.iterator()` and then `invokeinterface` calls to `Iterator.hasNext()` and `next()`. `try`-with-resources accepts anything `AutoCloseable`, and the bytecode had two `close()` call sites, one for the normal exit and one for the exception path. `Collections.sort` needs `Comparable`. And `history.forEach` is a default method of `Iterable`, yet it compiled to `invokevirtual History.forEach`: the declared type was the class, and that decides the instruction even for an inherited default.",
        },
        {
          type: "heading",
          text: "Swapping implementations behind List and Map",
        },
        {
          type: "code",
          language: "java",
          title: "SwapImplementations.java",
          code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.CopyOnWriteArrayList;

public class SwapImplementations {
    record Order(String id, String city, long total) { }

    // Written against the interfaces only: any List in, any Map to fill
    static Map<String, Long> totalByCity(List<Order> orders, Map<String, Long> into) {
        for (Order order : orders) {
            into.merge(order.city(), order.total(), Long::sum);
        }
        return into;
    }

    public static void main(String[] args) {
        List<Order> source = List.of(new Order("O-1", "Pune", 180), new Order("O-2", "Mumbai", 240),
                new Order("O-3", "Pune", 95), new Order("O-4", "Delhi", 310), new Order("O-5", "Chennai", 150));

        List<List<Order>> lists = List.of(new ArrayList<>(source), new LinkedList<>(source),
                                          new CopyOnWriteArrayList<>(source), source);
        for (List<Order> orders : lists) {
            System.out.printf("%-20s -> %s%n", orders.getClass().getSimpleName(),
                    totalByCity(orders, new TreeMap<>()));
        }
        System.out.printf("%-20s -> %s%n", "(HashMap to fill)", totalByCity(source, new HashMap<>()));
    }
}`,
        },
        {
          type: "output",
          text: `ArrayList            -> {Chennai=150, Delhi=310, Mumbai=240, Pune=275}
LinkedList           -> {Chennai=150, Delhi=310, Mumbai=240, Pune=275}
CopyOnWriteArrayList -> {Chennai=150, Delhi=310, Mumbai=240, Pune=275}
ListN                -> {Chennai=150, Delhi=310, Mumbai=240, Pune=275}
(HashMap to fill)    -> {Delhi=310, Chennai=150, Pune=275, Mumbai=240}`,
        },
        {
          type: "paragraph",
          text: "`totalByCity` only knows `List` and `Map`, so it ran unchanged on four list classes, including `ListN`, the JDK-internal class behind `List.of` that I never named anywhere. The `HashMap` line came out in a different order, and that's the contract working as designed: `Map` promises no order, `TreeMap` adds sorting, and the method relies on neither.",
        },
      ],
    },
    {
      title: "When to Use an Interface (and When Not To)",
      blocks: [
        {
          type: "paragraph",
          text: "The question I ask isn't \"interface or not?\" but \"who needs to depend on this without knowing the class, and how many implementations will there really be?\" The flow I follow:",
        },
        {
          type: "diagram",
          text: `Must some caller depend on this behaviour without
knowing which class provides it?
│
├─ no ──► a concrete class (or a record). Extract an
│         interface later, when a second implementation
│         or a boundary actually appears.
│
└─ yes ─► Is it exactly one operation?
          ├─ yes ─► a functional interface: lambdas and method
          │         refs implement it (or reuse Function,
          │         Supplier, Predicate)
          └─ no ──► Is the set of implementations closed and
                    known up front (results, states, events)?
                    ├─ yes ─► sealed interface + records,
                    │         handled by an exhaustive switch
                    └─ no ──► an interface. Do implementations
                              share state, a constructor or a
                              fixed algorithm?
                              ├─ yes ─► add a skeletal
                              │         abstract class
                              └─ no ──► interface alone, with
                                        defaults for helpers`,
          caption: "Callers get the interface; implementers get the abstract class only if it saves them work.",
        },
        {
          type: "table",
          headers: ["Situation", "Reach for", "Why"],
          rows: [
            ["SMS, payment or maps vendor", "An interface (a port)", "Several implementations, swapped by config, faked in tests"],
            ["Payment outcome: paid, declined, pending", "Sealed interface + records", "Closed set; javac checks every `switch` covers it"],
            ["Discount rule, retry policy, one-method strategy", "Functional interface, or an existing `java.util.function` type", "A lambda per strategy, no class files to write"],
            ["Providers that share validation, auditing and a constructor", "Interface + skeletal abstract class", "Shared code without taking the interface type away"],
            ["Metadata for a framework", "Annotation", "Can carry values; no type needed"],
            ["A tag that code should require by type", "Marker interface", "javac checks it in signatures"],
            ["`Order`, `Price`, `Address`: one implementation, ever", "A class or record", "An interface would add indirection and nothing else"],
            ["Constants shared by many classes", "A `final` class or an enum, used with `import static`", "Implementing a constants interface leaks them into the class's API"],
          ],
        },
        {
          type: "list",
          items: [
            "Depend on interfaces at boundaries: across modules, vendors and I/O, and anywhere a test needs a fake.",
            "Don't create an interface just because a class exists. `OrderService` plus `OrderServiceImpl`, one implementation for years, is ceremony: Spring injects concrete classes, and Mockito mocks them.",
            "Keep interfaces small and named after the role (`NotificationSender`, not `NotificationManagerInterface`). A class can implement several small ones; one fat interface forces every implementer to write methods it doesn't need.",
            "Let callers see the interface, and offer the abstract class as an optional helper for implementers.",
            "Use defaults to evolve an interface or to offer conveniences built from the abstract methods, never to fake state.",
          ],
        },
        {
          type: "paragraph",
          text: "Right: `PaymentGateway` as an interface, with card, UPI and wallet implementations and an in-memory fake for tests; `PaymentResult` as a sealed interface over records. Wrong: an `OrderIdGenerator` interface whose only implementation never changes, and, the expensive one, an abstract class as the only type for payment providers. The wallet provider already extends the bank's `LedgerClient`:",
        },
        {
          type: "code",
          language: "java",
          title: "WalletProvider.java",
          code: `abstract class PaymentProvider {                    // chosen as the base type for every provider
    protected final String name;
    protected PaymentProvider(String name) { this.name = name; }
    abstract boolean charge(String orderId, long amount);
}

class LedgerClient {                                // the bank's existing base class
    long balanceOf(String customer) { return 150; }
}

public class WalletProvider extends LedgerClient, PaymentProvider {
    boolean charge(String orderId, long amount) { return balanceOf("Asha") >= amount; }
}`,
        },
        {
          type: "output",
          text: `WalletProvider.java:11: error: '{' expected
public class WalletProvider extends LedgerClient, PaymentProvider {
                                                ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The parser stops at the comma: one superclass, full stop. `Gateways.java` above is the fix: `PaymentGateway` as the interface everyone depends on, `AbstractPaymentGateway` as an optional skeleton, and `WalletGateway extends LedgerClient implements PaymentGateway`. The When to Use What in Java OOP lesson puts this choice next to the other decisions of this phase.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Forgetting public on the implementing method",
        },
        {
          type: "code",
          language: "java",
          title: "ForgotPublic.java",
          code: `interface Shape {
    double area();
}

public class ForgotPublic implements Shape {
    double area() { return 3.0 * 4.0; }               // no 'public'
}`,
        },
        {
          type: "output",
          text: `ForgotPublic.java:6: error: area() in ForgotPublic cannot implement area() in Shape
    double area() { return 3.0 * 4.0; }               // no 'public'
           ^
  attempting to assign weaker access privileges; was public
1 error`,
        },
        {
          type: "paragraph",
          text: "In the interface, `area` is implicitly `public`; in the class, no modifier means package-private, which is weaker. Writing `@Override` on implementations doesn't fix this, but it does catch the related mistake of a typo in the name.",
        },
        {
          type: "heading",
          text: "Asking for the concrete type in a signature",
        },
        {
          type: "code",
          language: "java",
          title: "ConcreteParam.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class ConcreteParam {
    record Order(String id, long total) { }

    static long revenue(ArrayList<Order> orders) {             // asks for one implementation
        return orders.stream().mapToLong(Order::total).sum();
    }

    public static void main(String[] args) {
        List<Order> today = List.of(new Order("O-1", 240), new Order("O-2", 180));
        System.out.println(revenue(today));
    }
}`,
        },
        {
          type: "output",
          text: `ConcreteParam.java:13: error: incompatible types: List<Order> cannot be converted to ArrayList<Order>
        System.out.println(revenue(today));
                                   ^
Note: Some messages have been simplified; recompile with -Xdiags:verbose to get full output
1 error`,
        },
        {
          type: "paragraph",
          text: "`revenue` only reads, so it should accept `List<Order>`, or even `Collection<Order>`. Callers then pass whatever they have, and nobody copies an immutable list into an `ArrayList` just to satisfy a signature.",
        },
        {
          type: "heading",
          text: "Mutable \"constants\" in an interface",
        },
        {
          type: "code",
          language: "java",
          title: "MutableConstant.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class MutableConstant {
    interface CalendarRules {
        List<String> HOLIDAYS = new ArrayList<>(List.of("2026-01-26"));   // final reference only
    }

    static class ReportJob implements CalendarRules {
        void run() { HOLIDAYS.add("2026-03-04"); }      // a "temporary" hack
    }

    public static void main(String[] args) {
        System.out.println("before: " + CalendarRules.HOLIDAYS);
        new ReportJob().run();
        System.out.println("after:  " + CalendarRules.HOLIDAYS);

        List<String> fixed = List.of("2026-01-26");
        try {
            fixed.add("2026-03-04");
        } catch (UnsupportedOperationException e) {
            System.out.println("with List.of: " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `before: [2026-01-26]
after:  [2026-01-26, 2026-03-04]
with List.of: java.lang.UnsupportedOperationException`,
        },
        {
          type: "paragraph",
          text: "`public static final` freezes the reference, not the list. Every class in the JVM now sees a holiday that one job added. An interface field holding a mutable object is global mutable state with a respectable-looking name; `List.of` makes the mistake fail loudly instead.",
        },
        {
          type: "heading",
          text: "The constant interface anti-pattern",
        },
        {
          type: "paragraph",
          text: "Implementing an interface only to use its constants by their simple names. The constants become part of the class's public type and of every subclass, two such interfaces can collide (the `reference to MAX_ITEMS is ambiguous` error in the diamond section), and since the values are inlined into callers, changing one needs every user recompiled. The JDK has old examples, like `java.io.ObjectStreamConstants`, and Effective Java (Item 22) names it an anti-pattern. Constants belong in a `final` class with a private constructor, or in an enum, used through `import static`.",
        },
        {
          type: "heading",
          text: "Casting a framework's proxy to the implementation class",
        },
        {
          type: "paragraph",
          text: "When Spring adds `@Transactional` or `@Cacheable` behaviour to a bean that implements an interface, it may hand out a JDK proxy, and a JDK proxy only implements the interfaces. I reproduced it with Spring AOP's `ProxyFactory` from Spring Framework 6.2.11, the same class Spring uses internally:",
        },
        {
          type: "code",
          language: "java",
          title: "SpringProxyCast.java",
          code: `import org.aopalliance.intercept.MethodInterceptor;
import org.springframework.aop.framework.ProxyFactory;

public class SpringProxyCast {
    public interface PriceService { long quote(int qty); }

    public static class DefaultPriceService implements PriceService {
        public long quote(int qty) { return 50 + qty * 12L; }
    }

    public static void main(String[] args) {
        ProxyFactory factory = new ProxyFactory(new DefaultPriceService());   // finds PriceService
        factory.addAdvice((MethodInterceptor) call -> {
            System.out.println("  [tx begin] " + call.getMethod().getName());
            try { return call.proceed(); } finally { System.out.println("  [tx commit]"); }
        });
        PriceService bean = (PriceService) factory.getProxy();
        System.out.println(bean.getClass().getName());
        System.out.println(bean.quote(10));
        DefaultPriceService impl = (DefaultPriceService) bean;               // what breaks
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp "$SPRING" SpringProxyCast.java && java -cp "$SPRING:." SpringProxyCast`,
        },
        {
          type: "output",
          text: `jdk.proxy1.$Proxy0
  [tx begin] quote
  [tx commit]
170
Exception in thread "main" java.lang.ClassCastException: class jdk.proxy1.$Proxy0 cannot be cast to class SpringProxyCast$DefaultPriceService (jdk.proxy1.$Proxy0 is in module jdk.proxy1 of loader 'app'; SpringProxyCast$DefaultPriceService is in unnamed module of loader 'app')
	at SpringProxyCast.main(SpringProxyCast.java:20)`,
        },
        {
          type: "paragraph",
          text: "(`$SPRING` is the classpath of `spring-context` 6.2.11 and its dependencies, `spring-aop` among them.) The proxy is a `PriceService`, never a `DefaultPriceService`. The fix is to depend on the interface, which is the point of having one. With `factory.setProxyTargetClass(true)` Spring generates a CGLIB subclass instead, `SpringProxyCast$DefaultPriceService$$SpringCGLIB$$0` when I tried it, and the cast succeeds. Spring Boot's AOP auto-configuration turns that on by default (`spring.aop.proxy-target-class` is `true` unless set otherwise; I checked the annotations in `spring-boot-autoconfigure` 3.5.6), so in Boot this mostly bites when that property is switched off. Spring Data repositories are JDK proxies either way, as the production section shows.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Name interfaces after roles or capabilities (`PaymentGateway`, `Shippable`), not `IPaymentGateway` or `PaymentGatewayInterface`. The name callers type most should be the interface's.",
            "Keep them small. Several focused interfaces beat one that every implementer half-implements; that's the interface segregation principle in one line.",
            "Declare fields, parameters and return types with the interface (`List`, `Map`, `PaymentGateway`), and name the concrete class only where the object is created.",
            "Put `@Override` on every implementing method. It catches typos and signature drift when the interface changes.",
            "Document the contract, not just the signature: what the method promises, what it may throw, whether it may return `null`. javac checks only the shape.",
            "Use defaults to evolve published interfaces and for helpers built from the abstract methods. Keep them stateless, and document whether implementers should override (the JDK uses an `@implSpec` Javadoc tag for that).",
            "Put factories and helpers on the interface as `static` methods (`ShippingPolicy.perKg`), and shared code between defaults in `private` methods.",
            "Keep constants out of interfaces that classes implement, and keep mutable objects out of interface fields entirely.",
            "Before adding anything to a widely implemented interface, add it as a default and search the implementers for clashing names.",
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
            "Once the JIT has seen a call site, an interface call costs the same as a class call. My one-implementation run showed C2 inlining `Standard::price` at the `invokeinterface` site: no table lookup and no call at all. Two receiver classes are still inlined behind type checks, as for class calls.",
            "Megamorphic interface call sites, three or more classes, stay real calls through an itable stub. That's slightly more work than a megamorphic `invokevirtual` (a scan of the receiver's interface list, then an indexed load, against a single indexed load), and the stub showed up only in the three-class run. It matters in a few hot loops, not in request-level code.",
            "Default methods cost the same as any interface method. HotSpot picks the default for each class once, while linking it, and puts it in the itable; there's no search per call.",
            "Static interface methods are `invokestatic`, the cheapest call there is.",
            "Type checks against interfaces (`instanceof Shippable`, casts) search the class's list of secondary supertypes instead of comparing a fixed position in the superclass chain. JDK 23 replaced the old single-entry cache for that search with a hashed table (JDK-8180450), which helps hot code that checks one object against many interfaces; I haven't measured it myself.",
            "A dynamic proxy call allocates an `Object[]` for the arguments and boxes primitives, as the `$Proxy0` bytecode showed, then goes through the handler and usually reflection. That's noise next to a database round trip, and the wrong tool for a tight loop.",
            "Lambdas and anonymous classes both end up as classes implementing the interface. Once linked, calling through either costs the same.",
          ],
        },
      ],
    },
    {
      title: "Interfaces in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Two places where interfaces carry real weight in a ride-hailing backend: the boundary to external vendors, and repositories that a framework implements for me.",
        },
        {
          type: "heading",
          text: "Ports and adapters for notifications",
        },
        {
          type: "paragraph",
          text: "In ports-and-adapters terms, the ride flow owns a **port**, an interface that states what it needs in its own words, and each vendor gets an **adapter** that implements it. This is the bug that design prevents, the fix, and a test-style check that runs with no network:",
        },
        {
          type: "code",
          language: "java",
          title: "NotificationDispatch.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class NotificationDispatch {
    record Rider(String name, String phone, String email, String pushToken) {}

    // The port: what the ride flow needs, in its own words
    interface NotificationSender {
        String channel();
        void send(Rider rider, String text);            // throws when the vendor is down
    }

    // Adapters. In a real service each one wraps a vendor SDK or an HTTP client.
    static class SmsSender implements NotificationSender {
        boolean gatewayDown;                            // flipped to simulate an outage
        public String channel() { return "sms"; }
        public void send(Rider r, String text) {
            if (gatewayDown) throw new IllegalStateException("SMS gateway timed out");
            System.out.println("  [sms to " + r.phone() + "] " + text);
        }
    }

    static class EmailSender implements NotificationSender {
        public String channel() { return "email"; }
        public void send(Rider r, String text) { System.out.println("  [email to " + r.email() + "] " + text); }
    }

    static class PushSender implements NotificationSender {
        public String channel() { return "push"; }
        public void send(Rider r, String text) { System.out.println("  [push to " + r.pushToken() + "] " + text); }
    }

    // Before: the ride flow is welded to one concrete vendor class
    static class HardWiredNotifier {
        private final SmsSender sms;
        HardWiredNotifier(SmsSender sms) { this.sms = sms; }
        void driverArriving(Rider r, String driver) { sms.send(r, driver + " is arriving"); }
    }

    // After: depends only on the port, and falls back channel by channel
    static class RideNotifier {
        private final List<NotificationSender> senders;
        RideNotifier(List<NotificationSender> senders) { this.senders = List.copyOf(senders); }

        String driverArriving(Rider r, String driver) {
            for (NotificationSender sender : senders) {
                try {
                    sender.send(r, driver + " is arriving");
                    return sender.channel();
                } catch (RuntimeException e) {
                    System.out.println("  " + sender.channel() + " failed: " + e.getMessage());
                }
            }
            return "nothing";
        }
    }

    // A fake for tests: records messages instead of sending them
    static class InMemorySender implements NotificationSender {
        final List<String> sent = new ArrayList<>();
        private final String channel;
        private final boolean failing;
        InMemorySender(String channel, boolean failing) { this.channel = channel; this.failing = failing; }
        public String channel() { return channel; }
        public void send(Rider r, String text) {
            if (failing) throw new IllegalStateException("fake outage");
            sent.add(r.name() + ": " + text);
        }
    }

    public static void main(String[] args) {
        Rider asha = new Rider("Asha", "+91-98300-11111", "asha@example.com", "device-7f3a");
        SmsSender sms = new SmsSender();
        sms.gatewayDown = true;

        System.out.println("before (hard-wired to SMS):");
        try {
            new HardWiredNotifier(sms).driverArriving(asha, "Ravi");
        } catch (IllegalStateException e) {
            System.out.println("  ride flow broke: " + e.getMessage());
        }

        System.out.println("after (depends on NotificationSender):");
        RideNotifier notifier = new RideNotifier(List.of(sms, new PushSender(), new EmailSender()));
        System.out.println("  delivered via " + notifier.driverArriving(asha, "Ravi"));

        System.out.println("test with fakes, no network:");
        InMemorySender smsFake = new InMemorySender("sms", true);
        InMemorySender pushFake = new InMemorySender("push", false);
        String used = new RideNotifier(List.of(smsFake, pushFake)).driverArriving(asha, "Ravi");
        if (!used.equals("push") || !pushFake.sent.equals(List.of("Asha: Ravi is arriving"))) {
            throw new AssertionError("fallback broken: " + used + " " + pushFake.sent);
        }
        System.out.println("  fallback test passed, push fake recorded " + pushFake.sent);
    }
}`,
        },
        {
          type: "output",
          text: `before (hard-wired to SMS):
  ride flow broke: SMS gateway timed out
after (depends on NotificationSender):
  sms failed: SMS gateway timed out
  [push to device-7f3a] Ravi is arriving
  delivered via push
test with fakes, no network:
  sms failed: fake outage
  fallback test passed, push fake recorded [Asha: Ravi is arriving]`,
        },
        {
          type: "list",
          items: [
            "**Before:** `HardWiredNotifier` holds an `SmsSender`, so an SMS gateway timeout surfaced as an exception inside the ride flow. A driver assignment could fail because a text message couldn't be sent.",
            "**After:** `RideNotifier` knows only `List<NotificationSender>`. It tried SMS, logged the failure and delivered by push. A WhatsApp channel tomorrow is one new adapter, with no change to `RideNotifier`.",
            "**The test:** two in-memory fakes, one failing on purpose, and an assertion on what the push fake recorded. No network, no mocking library. That's the payoff of depending on the interface.",
          ],
        },
        {
          type: "paragraph",
          text: "In a Spring Boot service the adapters are beans, and `RideNotifier`'s constructor takes `List<NotificationSender>`, which Spring fills with every bean implementing the interface. I tried the tempting alternative against real Spring Framework 6.2.11 (`org.springframework:spring-context`): a constructor asking for a single `NotificationSender` while `SmsSender` and `PushSender` were both registered. The context refused to start with `NoUniqueBeanDefinitionException: ... expected single matching bean but found 2`, while the `List` version started and received both, in registration order. When one specific implementation is meant, `@Primary` or `@Qualifier` says so.",
        },
        {
          type: "heading",
          text: "A mini Spring Data: repositories nobody implements",
        },
        {
          type: "paragraph",
          text: "Spring Data JPA lets me declare `interface RideRepository extends JpaRepository<Ride, Long>` with methods like `List<Ride> findByCity(String city)` and never write the class. The mechanism is the JDK proxy from Internal Working. To be sure I understood it, I built the smallest version: an interface, and one handler that derives a query from each method's name and runs it against an in-memory table.",
        },
        {
          type: "code",
          language: "java",
          title: "MiniSpringData.java",
          code: `import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MiniSpringData {
    public record Ride(long id, String city, String status, long fare) {}

    // All I write is the interface. No class in this program implements it.
    public interface RideRepository {
        List<Ride> findByCity(String city);
        List<Ride> findByStatus(String status);
        long countByStatus(String status);
    }

    public interface TypoRepository {
        List<Ride> findByCitty(String city);            // typo in the property name
    }

    // One parsed method: "findBy" or "countBy", plus the record accessor to compare
    record DerivedQuery(boolean count, Method accessor) {
        Object run(List<Ride> table, Object value) throws ReflectiveOperationException {
            List<Ride> hits = new ArrayList<>();
            for (Ride ride : table) {
                if (accessor.invoke(ride).equals(value)) hits.add(ride);
            }
            return count ? (Object) (long) hits.size() : hits;     // a long method needs a Long
        }
    }

    static DerivedQuery derive(Method m) {
        String name = m.getName();
        boolean count = name.startsWith("countBy");
        String prefix = count ? "countBy" : "findBy";
        if (!name.startsWith(prefix)) throw new IllegalStateException("can't derive a query from " + name);
        String property = Character.toLowerCase(name.charAt(prefix.length())) + name.substring(prefix.length() + 1);
        try {
            return new DerivedQuery(count, Ride.class.getMethod(property));
        } catch (NoSuchMethodException e) {
            throw new IllegalStateException("No property '" + property + "' found for type 'Ride' in "
                    + m.getDeclaringClass().getSimpleName() + "." + name);
        }
    }

    // What the framework does: parse every method up front, then answer calls from the table
    static <T> T repository(Class<T> repoType, List<Ride> table) {
        Map<Method, DerivedQuery> queries = new HashMap<>();
        for (Method m : repoType.getMethods()) queries.put(m, derive(m));   // fails fast, like startup

        InvocationHandler handler = (proxy, method, args) -> switch (method.getName()) {
            case "toString" -> repoType.getSimpleName() + " over " + table.size() + " rides";
            case "hashCode" -> System.identityHashCode(proxy);
            case "equals" -> proxy == args[0];
            default -> queries.get(method).run(table, args[0]);
        };
        return repoType.cast(Proxy.newProxyInstance(repoType.getClassLoader(), new Class<?>[] { repoType }, handler));
    }

    public static void main(String[] args) {
        List<Ride> table = List.of(
                new Ride(1, "Kolkata", "COMPLETED", 240), new Ride(2, "Pune", "ONGOING", 180),
                new Ride(3, "Kolkata", "ONGOING", 310), new Ride(4, "Kolkata", "CANCELLED", 0));

        RideRepository rides = repository(RideRepository.class, table);
        System.out.println(rides.getClass().getName() + " implements "
                + Arrays.toString(rides.getClass().getInterfaces()));
        System.out.println(rides);
        System.out.println("Kolkata rides: " + rides.findByCity("Kolkata").stream().map(Ride::id).toList());
        System.out.println("ongoing count: " + rides.countByStatus("ONGOING"));
        System.out.println("cancelled:     " + rides.findByStatus("CANCELLED"));

        try {
            repository(TypoRepository.class, table);
        } catch (IllegalStateException e) {
            System.out.println("startup failed: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `jdk.proxy1.$Proxy0 implements [interface MiniSpringData$RideRepository]
RideRepository over 4 rides
Kolkata rides: [1, 3, 4]
ongoing count: 2
cancelled:     [Ride[id=4, city=Kolkata, status=CANCELLED, fare=0]]
startup failed: No property 'citty' found for type 'Ride' in TypoRepository.findByCitty`,
        },
        {
          type: "image",
          src: "/images/java/interfaces-proxy-dispatch.svg",
          alt: "Flow of rides.findByCity(\"Kolkata\") through a JDK dynamic proxy: my code calls invokeinterface RideRepository.findByCity; the generated class jdk.proxy1.$Proxy0, which extends java.lang.reflect.Proxy and implements RideRepository, packs the arguments into an Object array and calls h.invoke(this, m3, args); the InvocationHandler looks up the query parsed from the method name (findBy plus City maps to city()) and filters the in-memory table of four rides; the result [1, 3, 4] returns along the same path and is checkcast to List. Below, a comparison with Spring Data JPA: ProxyFactory.getProxy instead of Proxy.newProxyInstance, PartTree instead of derive(), a JPA query through the EntityManager instead of an in-memory filter, and a PropertyReferenceException at startup for a typo like findByCitty.",
          caption: "Spring Data JPA has the same shape, with an EntityManager where my in-memory table is.",
        },
        {
          type: "list",
          items: [
            "`rides` is a `jdk.proxy1.$Proxy0` that implements `RideRepository`. No class in the program implements the interface; all three methods ran through one `InvocationHandler`.",
            "`derive()` parses each method name once, when the repository is created, and maps `findByCity` to the record accessor `city()`. The typo repository failed right there, before any request could reach it, which is the equivalent of a Spring Boot app refusing to start instead of failing on the first call in production.",
            "`countByStatus` returns `long`, so the handler must return a `Long`: the generated method unboxes with a `checkcast`. In a separate test, a handler that returned an `Integer` for a `long` method failed at the call with `ClassCastException: class java.lang.Integer cannot be cast to class java.lang.Long`, with a stack frame `at jdk.proxy1/jdk.proxy1.$Proxy0.countByStatus(Unknown Source)`. Hence the `(long)` cast.",
          ],
        },
        {
          type: "paragraph",
          text: "The real thing does the same at a larger scale. I disassembled spring-data-commons 3.5.4: `RepositoryFactorySupport` builds each repository with Spring AOP's `ProxyFactory`, sets a `SimpleJpaRepository` as the target for the CRUD methods, sets the repository interface, adds interceptors including `QueryExecutorMethodInterceptor`, and calls `getProxy`. Derived queries are parsed from the method name by `PartTree` into a JPA query that runs through the `EntityManager`. I also ran the real parser on my typo: `new PartTree(\"findByCitty\", Ride.class)` threw `PropertyReferenceException: No property 'citty' found for type 'Ride'; Did you mean 'city'`. In a Spring Boot app that exception comes out while the repository bean is being created, so the application fails to start, which is exactly the behaviour my `repository()` copies.",
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
              question: "What is an interface in Java?",
              answer:
                "A reference type that declares a contract: methods a class promises to provide, plus constants and, since Java 8, default and static methods. A class implements it with `implements`, and any implementing object can be used wherever the interface type is expected.\n\nIt's a real type for both the compiler and the JVM. `javap -v` showed my `ShippingPolicy` as a class file with `ACC_INTERFACE` and `ACC_ABSTRACT`, and calls through an interface-typed variable compile to `invokeinterface`.",
            },
            {
              question: "Why use an interface instead of just a concrete class?",
              answer:
                "So callers can depend on what an object does without knowing which class does it. That lets me swap implementations, run several side by side, and pass fakes in tests.\n\nIn the production example, `NotificationDispatch`, the version hard-wired to `SmsSender` broke the ride flow when the SMS gateway was down, while `RideNotifier`, which only knows `NotificationSender`, fell back to push, and its test ran on in-memory fakes. Where there will only ever be one implementation, I don't add an interface.",
            },
            {
              question: "Can an interface have constructors, instance variables or fields?",
              answer:
                "No constructors and no instance variables. It can have fields, but every one is implicitly `public static final`: a constant shared by everybody, not state per object.\n\njavac's errors make it concrete: `long balance;` in an interface failed with `= expected`, because it's parsed as a constant that needs a value, and `Account() { }` failed with `<identifier> expected`. There's never an object of just the interface to construct; implementing classes run their own constructors.",
            },
            {
              question: "What are the implicit modifiers of interface members?",
              answer:
                "Abstract methods are `public abstract`, fields `public static final`, default methods `public`, static methods `public` unless declared `private`, and nested types `public static`. `protected`, `final`, `synchronized` and package-private members aren't allowed.\n\nI checked with reflection on an interface where I wrote no modifiers: the field printed `public static final`, the abstract method printed `public abstract`, the default printed `public` with `isDefault()` true, and the nested interface printed `public abstract static interface`.",
            },
            {
              question: "Can a class implement multiple interfaces? Can it extend multiple classes?",
              answer:
                "It can implement any number of interfaces but extend only one class: `class Book extends Item implements Product`, with `extends` first.\n\nJava allows multiple inheritance of type but not of state, which avoids the C++ problem of inheriting two copies of a base class's fields. When I tried `class WalletProvider extends LedgerClient, PaymentProvider`, javac stopped at the comma with `'{' expected`.",
            },
            {
              question: "Can an interface extend another interface? Several? A class?",
              answer:
                "Yes, one or several: `interface Product extends Identified, Rateable`. It can't extend a class, and it can't use `implements`.\n\n`interface Savings extends BankAccount` with `BankAccount` a class gave `interface expected here`, and `interface Savings implements Account` gave `'{' expected`. A class implementing the sub-interface must implement the abstract methods of all of them, as `Book` did in my syntax program.",
            },
            {
              question: "What is a default method, and why was it added?",
              answer:
                "A method with a body in an interface, marked `default`, which implementing classes inherit and may override. Java 8 added it so interfaces could gain methods without breaking existing implementations, most famously `stream()`, `removeIf()` and `forEach()` on `Collection` and `Iterable`.\n\nMy `OnlineUsers` class implements only `iterator()` and `size()`, the pre-Java 8 way, and all three still worked on it. In the class file a default is just a public, non-abstract method with code; there's no default flag.",
            },
            {
              question: "Are static interface methods inherited by implementing classes?",
              answer:
                "No, unlike static methods of a superclass. They're called through the interface name only, like `TaxRule.rateFor(\"luxury\")`.\n\nIn my `TaxTable` program, calling it through a sub-interface, through the implementing class, and unqualified inside that class gave three `cannot find symbol` errors. The reason is the diamond: a class can implement many interfaces, and two inherited statics with the same signature would be ambiguous.",
            },
            {
              question: "What is a functional interface?",
              answer:
                "An interface with exactly one abstract method, which a lambda or method reference can implement. Defaults, statics and abstract redeclarations of `Object`'s public methods don't count, which is why `Comparator` is functional although it declares `equals`.\n\n`@FunctionalInterface` is optional but makes javac check it: my `PriceCalculator` with two abstract methods failed with `Unexpected @FunctionalInterface annotation`. And the lambda's runtime class turned out to be a hidden class that implements the interface.",
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
              question: "What are private interface methods for?",
              answer:
                "Sharing code between default and static methods without making it part of the public contract. They came in Java 9 (JEP 213), and `private static` ones can be called from static methods too.\n\nIn `ShippingPolicy`, the private `isRemote` serves the default `costTo`; it's `ACC_PRIVATE` in the class file and called with `invokeinterface`. An implementing class can't see it at all: calling it gave `cannot find symbol`, because private interface methods aren't inherited.",
            },
            {
              question: "Explain the diamond problem with default methods and how Java resolves it.",
              answer:
                "A class inherits two bodies for one method from different interfaces. Three rules apply in order: a method declared in the class or a superclass wins, even an abstract one; otherwise the most specific default wins, so a sub-interface beats its parent; otherwise it's a compile error and the class must override.\n\nIn my programs, `OldAlerts` used `LegacyGateway`'s class method, `OrderAlerts` used `SmsNotifier`'s more specific default, and `TwoVendors` failed with `types MapsSdk and PaymentsSdk are incompatible`. The fix overrode `healthCheck()` and called `MapsSdk.super.healthCheck()` and `PaymentsSdk.super.healthCheck()`.",
            },
            {
              question: "A superclass implements an interface with a default, and the subclass also implements a more specific sub-interface. Which default runs?",
              answer:
                "The more specific interface's default. Rule 1 covers only methods **declared** in a class; a superclass that merely inherits a default doesn't count as declaring it.\n\nMy `MixedAlerts extends EmailOnly implements SmsNotifier`, where `EmailOnly implements Notifier` without declaring `channel()`, printed `SmsNotifier default: sms`. Had `EmailOnly` declared `channel()` itself, its version would have won.",
            },
            {
              question: "How do you call a particular interface's default method from an implementing class?",
              answer:
                "With `InterfaceName.super.method()`, inside the class's override. The interface must be a direct superinterface of the class.\n\nIt compiles to `invokespecial` on an `InterfaceMethod` ref, the same instruction as `super.m()` in a class, so there's no dynamic dispatch: `javap` on `TwoVendorsFixed` showed `invokespecial ... InterfaceMethod MapsSdk.healthCheck` and the same for `PaymentsSdk`, and the program printed `maps ok, payments ok`.",
            },
            {
              question: "What is a marker interface, and how does it compare with an annotation?",
              answer:
                "An interface with no methods that tags a class, checked with `instanceof`: `Serializable`, `Cloneable`, `RandomAccess`. Unlike an annotation it defines a type, so javac can check it in a method signature, and it's always inherited. Annotations can carry values and can mark methods, fields and parameters too.\n\n`Collections.binarySearch` checks `list instanceof RandomAccess` to choose its algorithm. My two lists that differed only in that marker found the same index, one with 100,002 `get()` calls and the other with 16.",
            },
            {
              question: "What are the differences between an interface and an abstract class?",
              answer:
                "An interface has no instance state and no constructors, its members are public apart from private helpers, and a class can implement many. An abstract class can have fields of any access, constructors, `protected` and `final` methods, and a class extends only one. Interfaces have had default and static methods since Java 8 and private ones since 9; only an interface can be a lambda target, and both can be sealed since 17.\n\nIn practice I use both: the interface as the type callers see, and an optional skeletal abstract class for shared state and a template method, like `List` and `AbstractList`. In my `Gateways` example, `WalletGateway` already extended `LedgerClient` and could still implement `PaymentGateway`.",
            },
            {
              question: "Can a top-level interface be final, private or protected?",
              answer:
                "No. A top-level interface is `public` or package-private, and `abstract` is allowed but redundant. `final` contradicts the whole point of an interface, which is to be implemented.\n\njavac said `illegal combination of modifiers: interface and final` for `final interface Account` and `modifier private not allowed here` for `private`. Inside a class, though, a member interface may be `private` or `protected`, and it's implicitly `static`.",
            },
            {
              question: "What is a sealed interface, and when would you use one?",
              answer:
                "An interface that lists the only classes allowed to implement it, with `permits` (Java 17). I'd use it for a closed set of variants like payment results or order states, usually with records as the implementations, so that a `switch` over it is exhaustive without a `default`.\n\nMy `PaymentResults` switch covered `Paid`, `Declined` and `Pending` with no default branch. Dropping a case gave `the switch expression does not cover all possible input values`, and an unlisted `Refunded` record gave `class is not allowed to extend sealed class`. The JVM enforces it too, through the `PermittedSubclasses` attribute.",
            },
            {
              question: "Why write `List<Order> orders = new ArrayList<>()` instead of `ArrayList<Order> orders = new ArrayList<>()`?",
              answer:
                "So the rest of the code depends only on the `List` contract, and the implementation can change in the one place the object is created. Methods taking `List` accept any list, including immutable ones from `List.of`.\n\nThe cost is that only `List`'s methods are visible: `names.trimToSize()` failed with `cannot find symbol ... location: variable names of type List<String>`. The opposite mistake, a parameter typed `ArrayList<Order>`, rejected a `List.of(...)` argument with `incompatible types: List<Order> cannot be converted to ArrayList<Order>`.",
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
              question: "What bytecode does a call through an interface type compile to, and what is the count operand?",
              answer:
                "`invokeinterface`, with a constant pool index to an `InterfaceMethodref`, a count and a zero byte. The same call through a class type is `invokevirtual`; a static interface method is `invokestatic` on an `InterfaceMethodref`, and `X.super.m()` is `invokespecial`.\n\nThe count is the number of argument slots including the receiver. In `CallSites`, `rule.price(10, 5)` with a `long` and an `int` became `invokeinterface #18, 4`: 1 + 2 + 1. The JVM spec calls it redundant with the descriptor and historical, and the instruction is five bytes long against `invokevirtual`'s three.",
            },
            {
              question: "Why were interface calls historically slower than virtual calls, and are they still?",
              answer:
                "Because of how the method is found. A virtual method keeps the same vtable index in every subclass, so `invokevirtual` is one indexed load. An interface method has no index valid across all implementers, so `invokeinterface` first scans the receiver class's itable for the interface's block, then indexes into it.\n\nThe JIT hides that at most call sites: with one receiver class, C2 inlined `Standard::price` straight through the `invokeinterface` in my test (`inline (hot)`). Only a megamorphic site pays: with three classes, C2 reported `virtual call`, and `-Xlog:vtablestubs` showed one itable stub being generated.",
            },
            {
              question: "Is adding a default method to a published interface always safe?",
              answer:
                "No. It's binary compatible for implementers in the common case, but it can still break things. If another interface a class implements has a default with the same signature, the class no longer compiles, and an already-compiled class fails at run time. An implementer with a same-named method that has a different return type or weaker access stops compiling too.\n\nI reproduced the run-time case: `ShopApp`, compiled against v1 of two SDKs, worked until `PaymentsSdk` v2 added `healthCheck()`, then the call threw `IncompatibleClassChangeError: Conflicting default methods: MapsSdk.healthCheck PaymentsSdk.healthCheck`.",
            },
            {
              question: "What happens at run time when an interface gains an abstract method and an old implementation is used?",
              answer:
                "The old class still loads, and every existing method keeps working. Only a call to the new method fails, with `AbstractMethodError`.\n\nWith `ExpressShipping` compiled against v1 of `ShippingRule` and v3 adding `currency()`, `cost` and `describe` ran, and `currency()` threw `AbstractMethodError: Receiver class ExpressShipping does not define or inherit an implementation of the resolved method 'abstract java.lang.String currency()' of interface ShippingRule.` on JDK 21. JDK 25 threw the same error from a generated overpass method. Recompiling `ExpressShipping` turned it into a compile error, which is much better.",
            },
            {
              question: "How does a JDK dynamic proxy work?",
              answer:
                "`Proxy.newProxyInstance(loader, interfaces, handler)` generates a class at run time that extends `java.lang.reflect.Proxy` and implements the given interfaces. Each interface method, and `equals`, `hashCode` and `toString`, packs its arguments into an `Object[]`, calls `handler.invoke(proxy, method, args)` and casts the result back.\n\nMine was `jdk.proxy1.$Proxy0`, `public final`, in a module of its own. Saved with `-Djdk.proxy.ProxyGenerator.saveGeneratedFiles=true`, its `nameOf(long)` boxed the `long` with `Long.valueOf`, called `h.invoke(this, m3, args)` with `invokeinterface` and ended in `checkcast String`. Since Java 16 a handler can run a default method's own body with `InvocationHandler.invokeDefault`.",
            },
            {
              question: "How does Spring Data implement a repository interface nobody wrote a class for?",
              answer:
                "It builds a proxy for the interface when the repository is created. In spring-data-commons, `RepositoryFactorySupport` uses Spring's `ProxyFactory` with a `SimpleJpaRepository` as the target for CRUD methods and interceptors such as `QueryExecutorMethodInterceptor` for query methods. Derived query methods are parsed from their names by `PartTree` ahead of time and run as JPA queries.\n\nThe `MiniSpringData` from the production section did the same with a bare JDK proxy: it parsed `findByCity` into the accessor `city()` when the repository was created, and `findByCitty` failed right then. The real `PartTree` threw `PropertyReferenceException: No property 'citty' found for type 'Ride'; Did you mean 'city'`, which in Spring Boot stops the application from starting.",
            },
            {
              question: "When is an interface initialized?",
              answer:
                "On its first real use, such as reading a non-constant static field. Initializing a class that implements it does **not** initialize it, unless the interface declares a default method (JLS 12.4.1). Reading a compile-time constant doesn't either, since the value is inlined.\n\nIn `InterfaceInit`, `new Book()` didn't run `Rated`'s field initializer, `new Parcel()` initialized `Tracked` before `Parcel` because `Tracked` has a default, and `Rated` was initialized only when I read `Rated.TAG`. JDK 25 printed the same.",
            },
            {
              question: "What does javac write into the class file for an interface and its members?",
              answer:
                "The interface gets `ACC_INTERFACE` and `ACC_ABSTRACT`, with `java/lang/Object` as `super_class`. Constants are `ACC_PUBLIC ACC_STATIC ACC_FINAL` fields with a `ConstantValue` attribute, abstract methods are `ACC_PUBLIC ACC_ABSTRACT` with no code, a default is just `ACC_PUBLIC` with a `Code` attribute, and statics are `ACC_PUBLIC ACC_STATIC`.\n\nAll of that came from `javap -v` on `ShippingPolicy`. Two details I didn't expect: there's no default flag at all, and a non-constant field like `REMOTE_REGIONS = List.of(...)` makes javac generate a `static {}` method inside the interface, although source code can't contain a static block there.",
            },
            {
              question: "Why can't a default method implement `equals`, `hashCode` or `toString`?",
              answer:
                "Because it could never run. Every class inherits those from `Object`, and a class method always beats an interface default, so javac rejects the declaration instead of letting it look like it works: `default method toString in interface Shape overrides a member of java.lang.Object`. Redeclaring them as abstract is allowed, which is how `Comparator` documents `equals`.\n\nIt's the same rule that made `OldAlerts` use `LegacyGateway.channel()` over the interface defaults in my resolution example. Equality logic belongs in the class, which is the subject of the next lesson, Object Class Methods.",
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
              question: "You need to add a method to an interface that 40 classes across several teams implement. How do you do it?",
              answer:
                "As a default method, so all 40 keep compiling and the already-deployed ones keep running, and teams override it when they can do better. If no sensible default exists, the default throws `UnsupportedOperationException` with a clear message, or I add a sub-interface that implementers opt into.\n\nAdding it as abstract is the trap: my `ExpressShipping`, compiled against the old version, loaded and ran until the new method was called, then threw `AbstractMethodError`. Before merging I'd also search the implementers for the method name, since a different return type or weaker access would break their build, and a matching default in another interface they implement would fail at run time.",
            },
            {
              question: "Two vendor SDKs your service uses both add a default healthCheck() to interfaces your class implements. What happens, and how do you fix it?",
              answer:
                "If the class is recompiled, javac rejects it: `types MapsSdk and PaymentsSdk are incompatible; class ... inherits unrelated defaults for healthCheck()`. If only the jars are upgraded, the class still loads and the call fails at run time with `IncompatibleClassChangeError: Conflicting default methods`, which I reproduced with `ShopApp`.\n\nThe fix is to override `healthCheck()` in my class and decide explicitly, calling one parent with `MapsSdk.super.healthCheck()` or combining both, as `TwoVendorsFixed` did. Longer term I'd keep vendor interfaces out of my domain classes and wrap each SDK in my own adapter, so a vendor upgrade can't collide inside one class.",
            },
            {
              question: "Would you model payment providers with an interface or an abstract class?",
              answer:
                "An interface as the type, `PaymentGateway`, plus an optional skeletal `AbstractPaymentGateway` for providers that share validation, auditing and a constructor. Callers and injection points depend only on the interface.\n\nAn abstract class as the only type breaks as soon as one provider needs a different superclass: `class WalletProvider extends LedgerClient, PaymentProvider` doesn't compile. In `Gateways`, card and UPI extended the skeleton, the wallet implemented the interface directly while extending `LedgerClient`, and all three sat in one `List<PaymentGateway>`.",
            },
            {
              question: "A colleague casts an injected Spring bean to its implementation class and gets a ClassCastException that mentions jdk.proxy. Why?",
              answer:
                "The bean is a JDK dynamic proxy. It implements the bean's interfaces, but it is not an instance of the implementation class. Spring creates one when it adds behaviour like transactions or caching through interface-based proxying.\n\nI reproduced it with Spring's `ProxyFactory`: the cast threw `class jdk.proxy1.$Proxy0 cannot be cast to class SpringProxyCast$DefaultPriceService`. The real fix is to depend on the interface. Class-based proxying (`proxyTargetClass`, Spring Boot's default) produces a CGLIB subclass that makes the cast work, but needing the cast at all is the smell.",
            },
            {
              question: "A teammate wants an interface plus an Impl class for every service, \"for testability\". Do you agree?",
              answer:
                "Not by default. An interface pays off at boundaries and wherever several implementations exist or are expected: vendors, repositories, strategies. For a service with one implementation it adds a file and an extra hop in every code navigation; Spring injects concrete classes, and Mockito can mock them.\n\nWhere a seam really helps tests, as with `NotificationSender` in the production section, the interface earns its place: `RideNotifier`'s fallback test ran on two in-memory fakes. Elsewhere I'd extract an interface the day a second implementation appears, which is a cheap refactoring.",
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
            "In `InterfacesDemo.java`, write `interface Rateable` with `double rating()`, a default `boolean isTopRated()` returning `rating() >= 4.5`, and `static Rateable of(double r)` returning `() -> r`. Implement it with `record Book(String title, double rating)` and with a `class Employee` that has a `rating` field and a `public double rating()` method. Print `isTopRated()` for a 4.8 `Employee`, a 4.2 `Book` and `Rateable.of(3.0)`.",
            "Change `Rateable.of(3.0)` to `Employee.of(3.0)` and compile. Read the error, then change it back.",
            "Remove `public` from `Employee.rating()` and compile. Read the error, then put it back.",
            "In `PhoneLocator.java`, add `interface Gps { default String locate() { return \"gps\"; } }`, `interface Beacon { default String locate() { return \"beacon\"; } }` and `public class PhoneLocator implements Gps, Beacon` with a `main` that prints `new PhoneLocator().locate()`. Compile it, read the error, then fix it with an override that returns `Gps.super.locate() + \"+\" + Beacon.super.locate()`.",
            "Back in `InterfacesDemo`, create a `Proxy` for `Rateable` whose handler returns `5.0` for `rating` and calls `InvocationHandler.invokeDefault(proxy, method, args)` for default methods. Print the proxy's class name and its `isTopRated()`. Then move `Rateable` into its own file as a `public interface` and print the name again.",
            "Run `javap -c InterfacesDemo` and find every call to `isTopRated`. Before looking, predict which instruction each one uses.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `true`, `false` and `false`. Step 2 fails with `cannot find symbol`, `symbol: method of(double)`, `location: class Employee`, because static interface methods aren't inherited. Step 3 fails with `rating() in Employee cannot implement rating() in Rateable` and `attempting to assign weaker access privileges; was public`. Step 4 fails with `types Gps and Beacon are incompatible`, `class PhoneLocator inherits unrelated defaults for locate() from types Gps and Beacon`, and after the fix prints `gps+beacon`. Step 5 prints `$Proxy0 true` while `Rateable` is package-private, because the proxy must live in the interface's own package, and `jdk.proxy1.$Proxy0 true` once it's public. In step 6, the calls on the `Employee` and `Book` variables are `invokevirtual Employee.isTopRated` and `invokevirtual Book.isTopRated`, even though the method is a default, because the declared types are classes; the calls through `Rateable` are `invokeinterface ... Rateable.isTopRated:()Z` with a count of 1, just the receiver.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `INTERFACE   a contract and a type; no state, no constructors
MEMBERS     abstract   -> public abstract
            constant   -> public static final (ConstantValue)
            default    -> public, with a body          (8)
            static     -> public, NOT inherited        (8)
            private    -> helpers for the above        (9)
CLASS FILE  ACC_INTERFACE | ACC_ABSTRACT, super_class Object
            no "default" flag: public + non-abstract + Code
CALLS       via interface   invokeinterface #n, count
            via class       invokevirtual (even for a default)
            Iface.m()       invokestatic  on InterfaceMethodref
            X.super.m()     invokespecial on InterfaceMethodref
DIAMOND     1 class wins   2 most specific default wins
            3 else compile error -> override, X.super.m()
            conflict after compile -> IncompatibleClassChange
EVOLVING    + default   -> old implementers keep running
            + abstract  -> AbstractMethodError when called
KINDS       functional (1 abstract), marker (0), sealed (permits)
VS ABSTRACT many vs one, no state vs state, type vs skeleton
PROXY       Proxy.newProxyInstance -> jdk.proxy1.$Proxy0
            every call -> InvocationHandler.invoke(...)`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "An interface is a contract and a type: callers depend on it, classes promise it, and since Java 8 it can carry behaviour through defaults, but never state.",
            "When defaults collide, a class wins, then the most specific interface, and otherwise I override and choose with `X.super.m()`. When a published interface changes, a new default keeps old implementers running, while a new abstract method fails at the first call.",
            "Every implementation inherits `equals`, `hashCode` and `toString` from `Object`, which is exactly why no interface may supply them as defaults. Those methods, and the contracts `HashMap` and `HashSet` depend on, are the next lesson: Object Class Methods.",
          ],
        },
      ],
    },
  ],
};
