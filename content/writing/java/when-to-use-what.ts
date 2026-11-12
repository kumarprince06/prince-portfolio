import type { Lesson } from "../types";

export const whenToUseWhat: Lesson = {
  slug: "when-to-use-what",
  date: "2026-11-10",
  title: "When to Use What in Java OOP",
  description:
    "The decision guide that closes the OOP phase: interface vs abstract class vs concrete class, inheritance vs composition vs association, class vs record vs enum vs sealed type, static vs instance, constructor vs factory vs builder, overriding vs pattern matching, mutability, nested classes vs lambdas and when not to abstract at all, each with everyday examples run on JDK 21, and ending in a worked pricing-and-payments design for a ride-hailing backend.",
  tags: ["Core Java", "OOP", "Design", "Interfaces", "Abstract Classes"],
  sections: [
    {
      title: "Why This Lesson Exists",
      blocks: [
        {
          type: "paragraph",
          text: "Eleven lessons into this phase, I know what every OOP construct in Java does. Each lesson ended with its own \"When to Use\" section, and the Nested and Inner Classes lesson covered the last kind of type Java has. What none of them could do alone is weigh the options against each other, and that's where I actually get stuck when I design a class. The hard question is never \"what does `abstract` do?\". It's \"should this be abstract at all?\"",
        },
        {
          type: "paragraph",
          text: "It's also the question design-round interviews keep returning to. The classic is \"when would you use an interface and when an abstract class?\", and its honest answer changed in Java 8, when interfaces got method bodies. Right behind it come composition versus inheritance, records versus classes, sealed types versus polymorphism, and builders versus constructors.",
        },
        {
          type: "paragraph",
          text: "So this lesson is a set of decision guides. Each one has a table or a decision flow, my rules of thumb, a right and a wrong choice built from everyday examples (orders, payments, employees, notifications), and the name of the lesson that teaches the details. It ends with one realistic backend module, pricing and payments, designed step by step with every choice pointing back to a guide, plus a \"what if\" showing where future changes land.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Almost none of these rules started with Java. The ideas came from research and from people who had maintained large object-oriented systems, and Java's features slowly caught up with them.",
        },
        {
          type: "table",
          headers: ["Year", "Source", "The idea I still use"],
          rows: [
            ["1967", "Simula 67 (Dahl and Nygaard)", "Classes, subclasses and virtual procedures: inheritance and overriding start here"],
            ["1970s", "Smalltalk (Xerox PARC)", "Everything is an object and code sends messages. What matters is what an object responds to, not its class"],
            ["1985", "C++ (Stroustrup)", "Classes for systems programming. Multiple inheritance and abstract classes (pure virtual functions) followed in version 2.0, in 1989"],
            ["1987", "Barbara Liskov, \"Data Abstraction and Hierarchy\", OOPSLA keynote", "A subtype must work wherever its supertype is expected"],
            ["1988", "Bertrand Meyer, Object-Oriented Software Construction", "The open-closed principle: open for extension, closed for modification"],
            ["1994", "Gamma, Helm, Johnson and Vlissides, Design Patterns", "\"Program to an interface, not an implementation\" and \"favor object composition over class inheritance\", plus Strategy, Template Method and Decorator"],
            ["1994", "Liskov and Wing, \"A Behavioral Notion of Subtyping\"", "The precise version: substitutability is about behaviour (preconditions, postconditions, invariants), not just matching signatures"],
            ["1996", "Java 1.0", "Single inheritance of classes, multiple inheritance of interfaces, `abstract` classes. A deliberate step away from C++'s multiple inheritance"],
            ["2000", "Robert C. Martin, \"Design Principles and Design Patterns\"", "The five principles later abbreviated SOLID. The acronym itself is usually credited to Michael Feathers, a few years later"],
            ["2001, 2018", "Joshua Bloch, Effective Java (1st and 3rd editions)", "In the 3rd edition: Item 17 \"Minimize mutability\", Item 18 \"Favor composition over inheritance\", Item 19 \"Design and document for inheritance or else prohibit it\", Item 20 \"Prefer interfaces to abstract classes\""],
          ],
        },
        {
          type: "paragraph",
          text: "Java's own releases kept moving the answers. These are the ones that changed a decision in this lesson:",
        },
        {
          type: "list",
          items: [
            "**Java 1.1:** nested, inner, local and anonymous classes.",
            "**Java 5:** `enum` types (JSR 201), together with generics.",
            "**Java 8:** lambdas, and `default` and `static` methods in interfaces (JSR 335). From here on an interface can carry code, which is why the interface-versus-abstract-class answer changed.",
            "**Java 9:** `private` methods in interfaces.",
            "**Java 16:** records (JEP 395) and pattern matching for `instanceof` (JEP 394).",
            "**Java 17:** sealed classes and interfaces (JEP 409).",
            "**Java 21:** pattern matching for `switch` (JEP 441) and record patterns (JEP 440), so a sealed type can be handled by an exhaustive `switch`.",
            "**Java 22:** unnamed variables and patterns, as in `case Card _ ->` (JEP 456).",
            "**Java 25:** flexible constructor bodies (JEP 513), compact source files and instance main methods (JEP 512), and compact object headers as a product feature (JEP 519). The first one removes an old reason for static factories, as the constructor guide shows.",
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The picture that holds all of these choices for me is a high street full of shops.",
        },
        {
          type: "list",
          items: [
            "A **sign on the door**, like \"UPI accepted\", is an **interface**. It promises a capability and says nothing about how. A tea stall, a pharmacy and a petrol pump carry the same sign, one shop can carry many signs, and a customer only looks for the sign.",
            "A **franchise** is an **abstract class**. Headquarters supplies the equipment, the shared stock and a fixed order of steps for every order (the template method). The franchisee fills in only the local parts (the abstract methods). A shop can join only one franchise, and when headquarters changes the manual, every outlet changes with it, which is the fragile base class problem.",
            "An **independent shop** is a **concrete class**. For one shop, building a franchise system first is pure overhead.",
            "**Hiring a delivery company** instead of becoming one is **composition**. The shop has a delivery partner and can switch partners next month. It didn't have to turn into a logistics business to get deliveries.",
            "The **printed bill** is a **record**: just values, and two bills with the same lines and total are interchangeable as data. A **customer** is an entity: two customers named Asha are still two people.",
            "The **list of table sizes**, two, four or six, is an **enum**. The **payment counter** is a **sealed interface**: cash, card or UPI, each with different details, a closed list the cashier must know how to handle completely.",
            "The **calculator at the counter** is a **static utility**. It remembers nothing between sums, so nobody needs their own.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real shop can belong to two franchise systems, and a Java class can extend only one class. A sign on the door carries no equipment, but since Java 8 an interface can carry `default` methods, which is like a sign that comes with a card machine attached, still with no stock behind it (no instance fields). And an inspector checks what a shop actually does, while `javac` only checks that the promised methods exist. Whether an implementation honours the meaning of the contract, the Liskov part, is on me.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The constructs and what each one is for",
        },
        {
          type: "table",
          headers: ["Construct", "What I use it for", "Instance state", "Equality", "Since"],
          rows: [
            ["Interface", "A capability or contract with several implementations, possibly unrelated", "None (`static final` constants only)", "Whatever implementations define", "1.0; `default`/`static` 8, `private` 9"],
            ["Abstract class", "Shared state and code for one family, or a fixed sequence of steps", "Yes", "Identity unless overridden", "1.0"],
            ["Concrete class", "Entities, services, anything with one implementation", "Yes", "Identity unless overridden", "1.0"],
            ["Record", "A value: data compared by value", "`final` fields, one per component", "Generated from all components", "16"],
            ["Enum", "A fixed set of named constants with the same shape", "Yes, per constant", "Identity, one object per constant", "5"],
            ["Sealed interface + records", "A closed set of variants that carry different data", "Per variant", "Per variant (records: by value)", "17; exhaustive `switch` 21"],
            ["Static nested class", "A helper that only makes sense with its outer class, like a builder", "Yes", "Identity unless overridden", "1.1"],
            ["Lambda, method reference", "A one-off implementation of a functional interface", "Captured values only", "Identity, which nothing should rely on", "8"],
          ],
        },
        {
          type: "heading",
          text: "The whole decision in one picture",
        },
        {
          type: "paragraph",
          text: "Most new types I write go through the same few questions. This is the flow I use, with the types from this lesson placed where they landed:",
        },
        {
          type: "image",
          src: "/images/java/when-to-use-what-decision-flow.svg",
          alt: "A decision flowchart. The first question is whether the type is mainly data compared by value. On the data side: a fixed list of named constants leads to enum (OrderStatus, ShippingSpeed); a closed set of variants with their own data leads to a sealed interface with records (PaymentMethod with Card, Upi and NetBanking, and OrderEvent); otherwise a record (Money, Receipt, Address). On the behaviour side: if callers should not see only a contract, a concrete class (Order, OrderService, TaxCalculator); if they should, and implementations share state or a fixed sequence of steps, an interface plus an abstract skeleton (PaymentGateway plus AbstractPaymentGateway); otherwise an interface (ShippingCostPolicy, PricingRule, Channel).",
          caption: "Blue leaves model data, orange leaves model behaviour. Each guide below takes one branch and adds the rules the picture can't show.",
        },
        {
          type: "heading",
          text: "Where each decision is taught",
        },
        {
          type: "table",
          headers: ["Decision", "Section here", "Lesson with the details"],
          rows: [
            ["Interface, abstract class or concrete class", "Interface, Abstract Class or Concrete Class?", "Interfaces, Abstraction"],
            ["Inheritance, composition, association", "Inheritance, Composition or Association?", "Inheritance; Association, Aggregation and Composition"],
            ["Class, record, enum or sealed type", "Class, Record, Enum or Sealed Type?", "Classes and Objects, Object Class Methods"],
            ["Static, instance or bean", "Static, Instance or Singleton Bean?", "Static Keyword"],
            ["Constructor, factory or builder", "Constructor, Factory, Builder or Copy?", "Constructors"],
            ["Overriding, pattern matching, strategies", "Overriding, Pattern Matching, Strategies or if/else?", "Polymorphism"],
            ["Mutable or immutable", "Mutable or Immutable?", "Encapsulation"],
            ["Nested class, lambda or top-level class", "Nested Class, Lambda or Top-Level Class?", "Nested and Inner Classes"],
            ["Access levels", "Which Access Level?", "Packages and Access Modifiers (Phase 6)"],
            ["Not abstracting at all", "When Not to Abstract", "Abstraction, Interfaces"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "What each construct compiles to",
        },
        {
          type: "paragraph",
          text: "Every choice in this lesson becomes something concrete in the class file. To see them side by side, I put one of each construct in a single source file. That's only for the listing; in real code each top-level type gets its own file.",
        },
        {
          type: "code",
          language: "java",
          title: "Kinds.java",
          code: `import java.util.function.LongUnaryOperator;

interface ShippingPolicy { long cost(int kg); }

abstract class BasePolicy implements ShippingPolicy {
    public long cost(int kg) { return base() + kg * perKg(); }
    abstract long base();
    abstract long perKg();
}

final class ExpressPolicy extends BasePolicy {
    long base()  { return 50; }
    long perKg() { return 12; }
    @Override public long cost(int kg) { return super.cost(kg) + 5; }
}

record Money(long paise, String currency) {}

enum Size { SMALL, MEDIUM, LARGE }

sealed interface PaymentMethod permits Card, Upi {}
record Card(String last4) implements PaymentMethod {}
record Upi(String vpa) implements PaymentMethod {}

public class Kinds {
    static long roundToRupee(long paise) { return (paise + 50) / 100 * 100; }

    static String label(PaymentMethod m) {
        return switch (m) {                          // sealed: no default needed
            case Card c -> "card " + c.last4();
            case Upi u  -> "upi " + u.vpa();
        };
    }

    public static void main(String[] args) {
        ShippingPolicy viaInterface = new ExpressPolicy();
        BasePolicy viaAbstract = new ExpressPolicy();
        ExpressPolicy viaClass = new ExpressPolicy();
        long a = viaInterface.cost(10);              // interface type
        long b = viaAbstract.cost(10);               // abstract class type
        long c = viaClass.cost(10);                  // concrete class type
        long d = roundToRupee(17_549);               // static
        LongUnaryOperator withTax = x -> x * 118 / 100;   // lambda
        Runnable done = new Runnable() {             // anonymous class
            public void run() { System.out.println("done"); }
        };
        System.out.println(a + " " + b + " " + c + " " + d + " " + withTax.applyAsLong(a));
        System.out.println(label(new Upi("asha@okbank")));
        done.run();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Kinds.java && echo *.class && java Kinds`,
        },
        {
          type: "output",
          text: `BasePolicy.class Card.class ExpressPolicy.class Kinds$1.class Kinds.class Money.class PaymentMethod.class ShippingPolicy.class Size.class Upi.class
175 175 175 17500 206
upi asha@okbank
done`,
        },
        {
          type: "list",
          items: [
            "Every type became its own class file, and so did the anonymous class, as `Kinds$1.class`.",
            "The lambda produced no class file. `javac` compiled its body into a private static method, `lambda$main$0`, and the class that implements `LongUnaryOperator` is generated at run time, the first time that line runs.",
            "All three calls printed `175`: whatever type the variable is declared as, the object is an `ExpressPolicy`, and its `cost` runs.",
          ],
        },
        {
          type: "paragraph",
          text: "Then I asked `javap` for each type's header and access flags:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -v ShippingPolicy BasePolicy ExpressPolicy Money Size PaymentMethod \\
  | grep -E "^([a-z]+ )*(class|interface) [A-Z]|^  flags|^Record|^PermittedSubclasses|^  (Card|Upi)$"`,
        },
        {
          type: "output",
          text: `interface ShippingPolicy
  flags: (0x0600) ACC_INTERFACE, ACC_ABSTRACT
abstract class BasePolicy implements ShippingPolicy
  flags: (0x0420) ACC_SUPER, ACC_ABSTRACT
final class ExpressPolicy extends BasePolicy
  flags: (0x0030) ACC_FINAL, ACC_SUPER
final class Money extends java.lang.Record
  flags: (0x0030) ACC_FINAL, ACC_SUPER
Record:
final class Size extends java.lang.Enum<Size>
  flags: (0x4030) ACC_FINAL, ACC_SUPER, ACC_ENUM
interface PaymentMethod
  flags: (0x0600) ACC_INTERFACE, ACC_ABSTRACT
PermittedSubclasses:
  Card
  Upi`,
        },
        {
          type: "list",
          items: [
            "An interface is `ACC_INTERFACE, ACC_ABSTRACT`. An abstract class is `ACC_ABSTRACT` without `ACC_INTERFACE`: still a class, with fields and constructors, that just can't be instantiated.",
            "A record is a `final` class that extends `java.lang.Record`, plus a `Record` attribute listing its components (`long paise`, `String currency`). An enum is a `final` class that extends `java.lang.Enum<Size>` and carries `ACC_ENUM`.",
            "`sealed` is nothing more than the `PermittedSubclasses` attribute, and the JVM enforces it too, not only `javac`. I compiled a `Rogue` class against a non-sealed `PaymentMethod`, swapped in the sealed version, and loading `Rogue` failed with `java.lang.IncompatibleClassChangeError: class Rogue cannot implement sealed interface PaymentMethod`.",
          ],
        },
        {
          type: "heading",
          text: "One call of each kind",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p Kinds BasePolicy ExpressPolicy | grep -E "invoke|^  [a-z].*\\(|^[a-z].*\\{"`,
        },
        {
          type: "output",
          text: `public class Kinds {
  ...
  public static void main(java.lang.String[]);
       4: invokespecial #44                 // Method ExpressPolicy."<init>":()V
      ...
      27: invokeinterface #45,  2           // InterfaceMethod ShippingPolicy.cost:(I)J
      37: invokevirtual #51                 // Method BasePolicy.cost:(I)J
      45: invokevirtual #54                 // Method ExpressPolicy.cost:(I)J
      53: invokestatic  #57                 // Method roundToRupee:(J)J
      58: invokedynamic #63,  0             // InvokeDynamic #3:applyAsLong:()Ljava/util/function/LongUnaryOperator;
      69: invokespecial #69                 // Method Kinds$1."<init>":()V
      89: invokeinterface #76,  3           // InterfaceMethod java/util/function/LongUnaryOperator.applyAsLong:(J)J
      ...
     114: invokestatic  #93                 // Method label:(LPaymentMethod;)Ljava/lang/String;
      ...
abstract class BasePolicy implements ShippingPolicy {
  ...
  public long cost(int);
       1: invokevirtual #7                  // Method base:()J
       7: invokevirtual #13                 // Method perKg:()J
  ...
final class ExpressPolicy extends BasePolicy {
  ...
  public long cost(int);
       2: invokespecial #11                 // Method BasePolicy.cost:(I)J`,
        },
        {
          type: "table",
          headers: ["Call in the source", "Instruction", "How the target is found"],
          rows: [
            ["`viaInterface.cost(10)`, declared as `ShippingPolicy`", "`invokeinterface`", "At run time, from the receiver's class, through its interface method table (itable)"],
            ["`viaAbstract.cost(10)` and `viaClass.cost(10)`", "`invokevirtual`", "At run time, from a fixed slot in the receiver class's vtable. Abstract, concrete or `final` makes no difference to the instruction"],
            ["`base()` inside `BasePolicy.cost`", "`invokevirtual`", "The same: calling an abstract method is an ordinary virtual call"],
            ["`roundToRupee(17_549)`", "`invokestatic`", "At link time. No receiver at all"],
            ["`new ExpressPolicy()`, `super.cost(kg)`", "`invokespecial`", "At link time, exactly the method named, with no override lookup"],
            ["`x -> x * 118 / 100`", "`invokedynamic`", "The first execution runs a bootstrap method (`LambdaMetafactory`) that links the call site. After that it just produces the lambda object"],
          ],
        },
        {
          type: "paragraph",
          text: "What that costs: in the interpreter, `invokeinterface` does a little more work than `invokevirtual`, because a class can implement many interfaces and the method has to be found in the right itable, while a vtable slot is a fixed index. Once a call site is hot, the JIT profiles which receiver classes actually show up there. With one class (monomorphic) or two (bimorphic), it inlines the target behind a cheap type check, and the instruction that started it stops mattering: a monomorphic interface call costs the same as a class call. The Polymorphism lesson shows this with `-XX:+PrintInlining`. I ran the same check with an interface-typed and a class-typed call in one loop, and C2 printed `inline (hot)` for both.",
        },
        {
          type: "paragraph",
          text: "So performance is almost never a reason to pick a class over an interface. Call sites that see three or more receiver classes (megamorphic) usually stay real dispatches, but that comes from the design having many implementations in play, not from the keyword.",
        },
        {
          type: "heading",
          text: "What each choice costs per object",
        },
        {
          type: "paragraph",
          text: "The other worry I hear is memory: does a record cost more than a hand-written class? I measured with the per-thread allocation counter from the Memory Allocation lesson, and added lambdas and an anonymous class, because the nested-class guide needs those numbers too:",
        },
        {
          type: "code",
          language: "java",
          title: "SameSize.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.function.LongSupplier;

public class SameSize {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;                          // keeps each object reachable

    record MoneyRecord(long paise, String currency) {}

    static final class MoneyClass {              // the same two fields, written by hand
        private final long paise;
        private final String currency;
        MoneyClass(long paise, String currency) { this.paise = paise; this.currency = currency; }
        long paise() { return paise; }
        String currency() { return currency; }
        // equals, hashCode and toString would add code to the class, not bytes to each object
    }

    static long bytes(Runnable r) {
        long id = Thread.currentThread().threadId();
        long before = MX.getThreadAllocatedBytes(id);
        r.run();
        return MX.getThreadAllocatedBytes(id) - before;
    }

    public static void main(String[] args) {
        long price = 25_000;
        Runnable[] all = {
            () -> sink = new MoneyRecord(25_000, "INR"),
            () -> sink = new MoneyClass(25_000, "INR"),
            () -> sink = (LongSupplier) () -> 42,            // non-capturing lambda
            () -> sink = (LongSupplier) () -> price,         // lambda capturing a long
            () -> sink = new LongSupplier() {                // anonymous class, same body
                public long getAsLong() { return 42; }
            }
        };
        String[] names = { "record MoneyRecord", "final class MoneyClass", "lambda, no capture",
                           "lambda capturing price", "anonymous class" };
        for (int round = 0; round < 3; round++) for (Runnable r : all) bytes(r);   // load classes first
        long base = bytes(() -> {});
        for (int i = 0; i < all.length; i++) {
            System.out.printf("%-24s %d bytes%n", names[i], bytes(all[i]) - base);
        }
    }
}`,
        },
        {
          type: "output",
          text: `record MoneyRecord       24 bytes
final class MoneyClass   24 bytes
lambda, no capture       0 bytes
lambda capturing price   24 bytes
anonymous class          16 bytes`,
        },
        {
          type: "list",
          items: [
            "The record and the hand-written class are both 24 bytes: 12 bytes of header, 8 for the `long`, 4 for the compressed `String` reference. A record's generated `equals`, `hashCode` and `toString` are code shared by the class, not bytes in each object. I got the same two numbers on every run.",
            "The non-capturing lambda allocated nothing. The JVM creates that object once and hands back the same one every time the expression runs.",
            "The capturing lambda is a new object each time: a header plus the captured `long`, 24 bytes. The anonymous class was a new 16-byte object on every evaluation, even with nothing to capture (it's created in a static method, so there isn't even an outer `this`).",
          ],
        },
        {
          type: "paragraph",
          text: "On JDK 25 with `-XX:+UseCompactObjectHeaders` (JEP 519), the record and the class were still 24 bytes each (an 8-byte header, 8 + 4 for the fields, 20 rounded up to 24), while the capturing lambda dropped to 16 bytes and the anonymous object to 8. Either way, choosing between a record and a class is about meaning, not size.",
        },
      ],
    },
    {
      title: "Interface, Abstract Class or Concrete Class?",
      blocks: [
        {
          type: "paragraph",
          text: "This is the question I was asked most, and the one the whole phase builds toward. My short answer: an interface says **what** something can do, an abstract class shares **how** a family of classes does it, and a concrete class is what I write when I don't need either yet. Since Java 8, interfaces can hold code too, so the real difference is no longer \"methods with bodies or without\". It's **state** and **inheritance**: an abstract class can hold fields and constructors, and a class can extend only one of them.",
        },
        {
          type: "heading",
          text: "The compact comparison",
        },
        {
          type: "table",
          headers: ["", "Interface", "Abstract class"],
          rows: [
            ["Instance fields", "None, only `public static final` constants", "Any"],
            ["Constructors", "None", "Yes, run through `super(...)`"],
            ["How many per class", "Implement as many as needed", "Extend exactly one"],
            ["Methods with bodies", "`default` and `static` (Java 8), `private` (Java 9)", "Any"],
            ["`final` methods, a fixed template", "Not allowed", "Allowed"],
            ["Member access", "`public` methods, or `private` helpers", "Any level, including `protected` hooks"],
            ["Implemented by a lambda", "Yes, with exactly one abstract method", "Never"],
            ["Adding a method later", "A `default` method keeps old implementations compiling", "A concrete method keeps subclasses compiling, but can clash with one they already have"],
            ["Call through it in bytecode", "`invokeinterface`", "`invokevirtual`"],
          ],
        },
        {
          type: "paragraph",
          text: "The Interfaces lesson has the full table, including diamond resolution and sealed interfaces.",
        },
        {
          type: "heading",
          text: "How I decide",
        },
        {
          type: "diagram",
          text: `Will callers depend on this without knowing the
implementation? (several implementations, a fake in
tests, an outside system behind it)
 │
 ├─ no ──► CONCRETE CLASS. Final unless it was designed
 │         for extension. Extract an interface when a
 │         second implementation really shows up.
 │
 └─ yes ─► INTERFACE: the type every caller uses.
            │
            Do the implementations share state, or a fixed
            sequence of steps (validate, retry, audit)?
            │
            ├─ no ──► the interface alone. With one abstract
            │         method, lambdas can implement it.
            │
            └─ yes ─► interface + ABSTRACT SKELETON with a
                      final template method: the List +
                      AbstractList shape. Implementations
                      may extend it; nobody is forced to.`,
          caption: "The flow I run for behaviour types. Data types go through the records-and-enums guide instead.",
        },
        {
          type: "heading",
          text: "Rules of thumb",
        },
        {
          type: "list",
          items: [
            "Callers depend on interfaces; implementations may extend a skeleton. That's Effective Java's Item 20, \"Prefer interfaces to abstract classes\", and it's how the JDK pairs `List` with `AbstractList` and `Map` with `AbstractMap`.",
            "If the implementations share no fields and no fixed sequence of steps, an abstract class adds nothing except the single-inheritance limit.",
            "If unrelated classes need the capability (an `Order`, a `BankAccount` and an `Employee` can all be `Auditable`), only an interface works, because each of them may already extend something else.",
            "If the type has exactly one abstract method, keep it an interface so a lambda can implement it. That single decision makes tests and one-off variations much cheaper.",
            "`default` methods exist to evolve an interface without breaking its implementers. They can't hold state, because an interface has no instance fields, so they can only call other methods. Shared state is still the abstract class's job.",
            "A `final` public method that calls `protected abstract` hooks is the template method. Without `final`, a subclass can override the whole sequence and skip the step that mattered.",
            "With one implementation and nothing outside the codebase behind it, a concrete class is enough. Extracting an interface later is a mechanical IDE refactoring, as long as every caller lives in my own codebase.",
          ],
        },
        {
          type: "heading",
          text: "The same gateway, three ways",
        },
        {
          type: "paragraph",
          text: "To make it concrete, I wrote the payment gateway each way and sent the same charge twice, which is what a checkout page does when a request times out and the browser retries. The one rule every gateway must keep: an idempotency key is never charged twice.",
        },
        {
          type: "code",
          language: "java",
          title: "GatewayThreeWays.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class GatewayThreeWays {
    record Charge(String key, long paise) {}

    // Way 1: a concrete class, used directly. Fine while there's one provider.
    static final class OnlyProvider {
        private final Map<String, String> done = new HashMap<>();
        long debited;

        String charge(Charge c) {
            if (done.containsKey(c.key())) return done.get(c.key());   // a retry: same receipt
            debited += c.paise();                                      // the provider's API call
            done.put(c.key(), "rcpt-" + c.key());
            return done.get(c.key());
        }
    }

    // Way 2: an interface only. Every provider repeats the rule, and one forgets it.
    interface Contract { String charge(Charge c); }

    static final class HastyProvider implements Contract {
        long debited;

        public String charge(Charge c) {
            debited += c.paise();
            return "rcpt-" + c.key();
        }
    }

    // Way 3: an abstract class. The rule lives once, in a final template method.
    abstract static class GatewayBase {
        private final Map<String, String> done = new HashMap<>();
        long debited;

        public final String charge(Charge c) {
            if (done.containsKey(c.key())) return done.get(c.key());
            debited += c.paise();
            done.put(c.key(), callProvider(c));
            return done.get(c.key());
        }

        protected abstract String callProvider(Charge c);         // the only step that varies
    }

    static final class HastyOnBase extends GatewayBase {
        protected String callProvider(Charge c) { return "rcpt-" + c.key(); }
    }

    // What I'd ship: an interface for callers, and the abstract class as a skeleton behind it
    interface PaymentGateway { String charge(Charge c); }

    static final class PrimaryGateway extends GatewayBase implements PaymentGateway {
        protected String callProvider(Charge c) { return "primary-" + c.key(); }
    }

    public static void main(String[] args) {
        Charge pay = new Charge("order-42", 25_000);   // the checkout page sends it twice

        OnlyProvider only = new OnlyProvider();
        only.charge(pay); only.charge(pay);
        HastyProvider hasty = new HastyProvider();
        hasty.charge(pay); hasty.charge(pay);
        HastyOnBase onBase = new HastyOnBase();
        onBase.charge(pay); onBase.charge(pay);
        PrimaryGateway primary = new PrimaryGateway();
        PaymentGateway gateway = primary;
        gateway.charge(pay); gateway.charge(pay);
        PaymentGateway fake = c -> "fake-" + c.key();  // a test double is one lambda

        System.out.println("concrete class : debited " + only.debited);
        System.out.println("interface only : debited " + hasty.debited);
        System.out.println("abstract class : debited " + onBase.debited);
        System.out.println("both           : debited " + primary.debited + ", fake says " + fake.charge(pay));
    }
}`,
        },
        {
          type: "output",
          text: `concrete class : debited 25000
interface only : debited 50000
abstract class : debited 25000
both           : debited 25000, fake says fake-order-42`,
        },
        {
          type: "list",
          items: [
            "**Concrete class:** correct, and the simplest. With one provider and no need to fake it, I'd stop here.",
            "**Interface only:** `HastyProvider` compiled without a warning and debited 500 rupees for a 250-rupee order. An interface can't make implementations repeat a rule, so every new provider is one more chance to forget it.",
            "**Abstract class:** the rule lives in the `final` `charge()`, so the same hasty subclass couldn't skip it. `callProvider` is the only step a provider writes.",
            "**Both:** callers only ever see `PaymentGateway`, providers extend the skeleton, and the test double is a one-line lambda, which no abstract class can be.",
          ],
        },
        {
          type: "paragraph",
          text: "What I'd ship is the combination, as soon as there's a second provider or I need to fake the provider in tests, which for payments is from day one. The production design at the end of this lesson uses exactly that pair, `PaymentGateway` and `AbstractPaymentGateway`, with retries added to the template. If the skeleton only saved a few duplicated lines, I'd keep the interface alone. It earns its place here because idempotency is a rule that must not be possible to forget.",
        },
        {
          type: "heading",
          text: "Right and wrong",
        },
        {
          type: "list",
          items: [
            "**Right:** `ShippingCostPolicy` as an interface. Each shipping speed's policy is a small record implementing it, the policies share nothing, and a test can pass `kg -> Money.inr(10_000)`.",
            "**Right:** `PaymentGateway` plus `AbstractPaymentGateway`, for the reason the run above showed.",
            "**Wrong:** an `abstract class NotificationSender` as the base of the SMS, email and push senders. They share no state and no steps, so the abstract class only uses up each sender's one chance to extend something else, and rules out lambdas. The `Channel` interface in the Examples section is the right shape.",
            "**Wrong:** an `EmployeeBonusService` interface plus `EmployeeBonusServiceImpl` for a calculation with one implementation, one caller and nothing external behind it. Two files and an `Impl` suffix for a choice nobody will ever make. When Not to Abstract has the details.",
          ],
        },
      ],
    },
    {
      title: "Inheritance, Composition or Association?",
      blocks: [
        {
          type: "paragraph",
          text: "Whenever one class needs another, the relationship takes one of five shapes. The Inheritance lesson and the Association, Aggregation and Composition lesson cover them in depth, with the lifecycle and heap pictures. This is how I pick between them.",
        },
        {
          type: "table",
          headers: ["Relationship", "The question that picks it", "In Java", "Example"],
          rows: [
            ["Inheritance (is-a)", "Is every B usable anywhere an A is expected, and was A designed to be extended?", "`class B extends A`", "`CardGateway extends AbstractPaymentGateway`"],
            ["Composition (owns)", "Does B create the part, keep it to itself and decide when it's gone?", "A `private final` field created inside B", "An `Order` and its `OrderItem`s; a `Car` and its `Engine`"],
            ["Aggregation (has, shared)", "Is the part part of B's whole, but does it exist on its own and arrive from outside?", "A field filled from a constructor argument or an `add` method", "A `Department` and its `Employee`s"],
            ["Association (knows)", "Does B need a lasting link to a peer it doesn't own?", "A field holding a reference or an id", "An `Order` and its `Customer`"],
            ["Dependency (uses)", "Does B need A only during one call?", "A parameter or a local variable", "`OrderService.pay` using the `PaymentMethod` passed in"],
          ],
        },
        {
          type: "diagram",
          text: `Class B wants something from class A.

Is every B truly an A (usable wherever an A is, with
no surprises), AND was A built to be extended?
 ├─ yes ──► B extends A
 └─ no ───► Does B need A after the current call returns?
             ├─ no ──► DEPENDENCY: pass A in as a parameter
             └─ yes ─► Does B create A, keep it private and
                       decide when it dies?
                        ├─ yes ──► COMPOSITION (private field)
                        └─ no ───► Is A a part of B's whole?
                                    ├─ yes ──► AGGREGATION
                                    └─ no ───► ASSOCIATION`,
          caption: "Inheritance is the first question only because it's the one to rule out early.",
        },
        {
          type: "heading",
          text: "Rules of thumb",
        },
        {
          type: "list",
          items: [
            "Inherit only when both halves hold: real substitutability (the Liskov principle) and a parent designed for it, with documented hooks. Effective Java's Item 19 says to design and document for inheritance or else prohibit it, which in practice means `final` or `sealed` for everything else.",
            "Reusing code is never a reason to extend on its own. That's Item 18, \"Favor composition over inheritance\": a field and a delegating call reuse the code without inheriting every public method and every future change of the parent.",
            "A subclass that overrides an inherited method to throw `UnsupportedOperationException` is announcing that the is-a was false. The `NoBaseService` example shows what that costs.",
            "Between composition, aggregation and association the code looks almost the same. The real question is ownership: who creates the object, who else may hold it, and who decides when it's gone.",
            "Across aggregates, I'd rather hold an id than the object, such as an `Order` keeping `customerId`. It keeps object graphs small and avoids the bidirectional `toString` and `equals` recursion the Association, Aggregation and Composition lesson demonstrates.",
          ],
        },
        {
          type: "heading",
          text: "Right and wrong",
        },
        {
          type: "list",
          items: [
            "**Right:** a minimum charge as a record that wraps any `ShippingCostPolicy`, `record WithMinimum(ShippingCostPolicy inner, Money minimum)`, instead of a subclass of one particular policy. It works with every policy that exists today and every one written later, and none of them changes. The production design uses exactly this wrapper.",
            "**Wrong:** `class PaymentService extends BaseEntityService<Payment>`, to reuse `save` and `findById`. It also inherits `deleteById`, and in the Examples section a generic admin job used it to delete a payment.",
          ],
        },
      ],
    },
    {
      title: "Class, Record, Enum or Sealed Type?",
      blocks: [
        {
          type: "paragraph",
          text: "This is the decision Java 16 and 17 changed most for me. Before records and sealed types, everything was a class, and the difference between an entity and a value lived only in comments.",
        },
        {
          type: "table",
          headers: ["What I'm modelling", "Construct", "Equality", "Examples in this lesson"],
          rows: [
            ["An entity: an identity and a lifecycle, changing over time", "Class with private state and intention-revealing methods", "Identity (keep `Object`'s), or by an id fixed at creation", "`Order`, `Customer`, `BankAccount`"],
            ["A value: defined completely by its data", "Record, or a final class with final fields", "By value, generated from all components", "`Money`, `Receipt`, `Address`"],
            ["A fixed set of named constants with the same shape", "Enum", "Identity, one object per constant", "`OrderStatus`, `ShippingSpeed`"],
            ["A closed set of variants with different data", "Sealed interface + records", "By value, per variant", "`PaymentMethod`, `OrderEvent`"],
            ["An open set of variants others will add", "Interface, implemented by classes or records", "Up to each implementation", "`ShippingCostPolicy`, `PricingRule`"],
          ],
        },
        {
          type: "diagram",
          text: `Is it identified by WHO it is? (it changes over time,
and two with identical data are still two things)
 ├─ yes ──► CLASS (entity). Keep identity equality, or
 │          equals on an id fixed at creation. Change state
 │          only through methods that check the rules.
 └─ no ───► A value, identified by WHAT it holds.
             Is it one of a fixed list of named constants?
              ├─ yes ──► ENUM
              └─ no ───► Do the variants carry different data,
                         and is the list of variants closed?
                          ├─ yes ──► SEALED INTERFACE + RECORDS
                          └─ no ───► RECORD (one shape), or an
                                     open INTERFACE if others
                                     will add variants`,
          caption: "The data side of the flowchart, with the entity question in front.",
        },
        {
          type: "heading",
          text: "Rules of thumb",
        },
        {
          type: "list",
          items: [
            "Values get value equality; entities keep identity. Overriding `equals` on an entity over its mutable fields breaks hash-based collections the moment the state changes. The Object Class Methods lesson shows the `HashSet` failure, and Common Mistakes below shows the record version of it.",
            "An enum when every constant has the same fields. Per-constant data goes in enum fields, per-constant behaviour in methods, and `EnumMap` and `EnumSet` come for free.",
            "A sealed interface with records when the variants carry different data and I want the compiler to check every `switch`. A card has `last4`, UPI has a VPA, net banking has a bank code; squeezing those into one enum with nullable fields is exactly the bug this construct removes.",
            "A class with a `type` field and fields that are only valid for some types, a tagged class, is what all three replace. Effective Java's Item 23 is \"Prefer class hierarchies to tagged classes\"; from Java 17 that hierarchy can be a sealed one.",
          ],
        },
        {
          type: "paragraph",
          text: "Here's a tagged class next to the sealed version:",
        },
        {
          type: "code",
          language: "java",
          title: "TaggedVsSealed.java",
          code: `public class TaggedVsSealed {
    // Wrong: one class, a type tag, and fields that are only sometimes meaningful
    static final class PaymentInfo {
        final String type;          // "CARD", "UPI" or "NETBANKING"
        final String cardLast4;     // CARD only
        final String upiVpa;        // UPI only
        PaymentInfo(String type, String cardLast4, String upiVpa) {
            this.type = type; this.cardLast4 = cardLast4; this.upiVpa = upiVpa;
        }
    }

    static String label(PaymentInfo p) {
        if (p.type.equals("CARD")) return "card ending " + p.cardLast4;
        if (p.type.equals("UPI")) return "UPI " + p.upiVpa.toLowerCase();
        return "unknown method";                       // NETBANKING quietly ends up here
    }

    // Right: a closed set of variants, each holding exactly its own data
    sealed interface PaymentMethod permits Card, Upi, NetBanking {}

    record Card(String last4) implements PaymentMethod {
        Card {
            if (!last4.matches("\\\\d{4}")) throw new IllegalArgumentException("bad last4: " + last4);
        }
    }

    record Upi(String vpa) implements PaymentMethod {
        Upi {
            if (!vpa.contains("@")) throw new IllegalArgumentException("bad VPA: " + vpa);
        }
    }

    record NetBanking(String bankCode) implements PaymentMethod {}

    static String label(PaymentMethod m) {
        return switch (m) {                            // no default: the compiler checks all three
            case Card c       -> "card ending " + c.last4();
            case Upi u        -> "UPI " + u.vpa();
            case NetBanking n -> "net banking, " + n.bankCode();
        };
    }

    public static void main(String[] args) {
        System.out.println(label(new PaymentInfo("NETBANKING", null, null)));
        try {
            System.out.println(label(new PaymentInfo("UPI", null, null)));
        } catch (NullPointerException e) {
            System.out.println("NPE at payment time: " + e.getMessage());
        }

        System.out.println(label(new NetBanking("SBIN")));
        System.out.println(new Upi("asha@okbank").equals(new Upi("asha@okbank")));
        try {
            new Upi("asha");
        } catch (IllegalArgumentException e) {
            System.out.println("rejected at construction: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `unknown method
NPE at payment time: Cannot invoke "String.toLowerCase()" because "<parameter1>.upiVpa" is null
net banking, SBIN
true
rejected at construction: bad VPA: asha`,
        },
        {
          type: "list",
          items: [
            "The tagged version called net banking an `unknown method` without any warning, and a UPI row missing its VPA failed only at payment time, with an NPE pointing at `<parameter1>.upiVpa` (compiled with `javac -g`, it names `p.upiVpa`).",
            "The sealed version has no `default` branch, so the compiler checks that `Card`, `Upi` and `NetBanking` are all handled. Each record holds only its own data, and the compact constructor rejected `asha` as a VPA when the object was created, far away from the payment code.",
            "Two `Upi` records with the same VPA are equal: value equality, generated by the compiler.",
          ],
        },
        {
          type: "heading",
          text: "Right and wrong",
        },
        {
          type: "list",
          items: [
            "**Right:** `Money` as a record, `Order` as a class, `OrderStatus` as an enum, `PaymentMethod` as a sealed interface. Each construct matches what the thing is.",
            "**Wrong:** `Order` as a record. Every state change becomes a new object with different equality, and a `Set` of open orders ends up holding two versions of order 42. Common Mistakes has the run.",
          ],
        },
      ],
    },
    {
      title: "Static, Instance or Singleton Bean?",
      blocks: [
        {
          type: "paragraph",
          text: "The Static Keyword lesson covers how `static` works. The decision is about what the code depends on.",
        },
        {
          type: "table",
          headers: ["Choose", "When", "Example"],
          rows: [
            ["`static` method", "A pure function of its arguments: no state, no I/O, no reason to swap it in a test", "`Rounding.toNearestRupee`, `isHappyHour(int hour)`"],
            ["`static final` constant", "A value fixed for the life of the program", "`MAX_ITEMS_PER_ORDER = 50`"],
            ["Instance method", "It needs the object's state, or it must be polymorphic", "`account.withdraw(amount)`, `policy.cost(kg)`"],
            ["Singleton bean (one instance, injected)", "A stateless service with dependencies (a clock, a repository, a gateway) that tests replace and frameworks proxy", "`OrderService`, `HappyHourDiscount`"],
            ["`static` mutable field", "Almost never: it's shared by every thread and invisible in every signature", "None in this design"],
          ],
        },
        {
          type: "list",
          items: [
            "If a static method reads the clock, a file, the network, a system property or a static mutable field, it isn't pure, and it will be painful in tests. That's my signal to turn it into an instance method on an object that receives its dependencies through the constructor.",
            "A singleton bean isn't a static class. Spring creates one instance and injects it, so a test can construct it with fakes, and proxies for `@Transactional` or `@Cacheable` can wrap it. A `static` method can't be replaced or proxied.",
            "Effective Java's advice to prefer dependency injection to hardwiring resources says the same thing from the other side.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "HappyHour.java",
          code: `import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;

public class HappyHour {
    // Pure: same inputs, same output, no state. A static method is the right tool.
    static boolean isHappyHour(int hour) {
        return hour >= 16 && hour < 19;
    }

    // Wrong: static, but secretly depends on the real clock
    static int staticDiscountPercent() {
        return isHappyHour(LocalTime.now().getHour()) ? 20 : 0;
    }

    // Right: an instance whose dependency is passed in through the constructor
    static final class HappyHourDiscount {
        private final Clock clock;
        HappyHourDiscount(Clock clock) { this.clock = clock; }
        int percent() { return isHappyHour(LocalTime.now(clock).getHour()) ? 20 : 0; }
    }

    public static void main(String[] args) {
        ZoneId kolkata = ZoneId.of("Asia/Kolkata");
        HappyHourDiscount evening = new HappyHourDiscount(Clock.fixed(Instant.parse("2026-11-12T12:00:00Z"), kolkata));
        HappyHourDiscount night = new HappyHourDiscount(Clock.fixed(Instant.parse("2026-11-12T20:00:00Z"), kolkata));
        System.out.println("17:30 IST -> " + evening.percent() + "% off");
        System.out.println("01:30 IST -> " + night.percent() + "% off");
        System.out.println("static, whenever I ran it -> " + staticDiscountPercent() + "% off");
    }
}`,
        },
        {
          type: "output",
          text: `17:30 IST -> 20% off
01:30 IST -> 0% off
static, whenever I ran it -> 0% off`,
        },
        {
          type: "list",
          items: [
            "`isHappyHour` stays static: it's pure, and testing it is just calling it.",
            "`staticDiscountPercent()` printed `0% off` because I ran it at midnight IST. At 17:30 the same code says `20% off`, so a test asserting either value fails for part of every day.",
            "`HappyHourDiscount` takes a `Clock`, so a test pins time with `Clock.fixed`, and production passes `Clock.systemDefaultZone()` or lets Spring inject a single `Clock` bean.",
          ],
        },
        {
          type: "heading",
          text: "Right and wrong",
        },
        {
          type: "list",
          items: [
            "**Right:** `Rounding.toNearestRupee` as a static method in a final utility class with a private constructor, and `OrderService` as an injected singleton.",
            "**Wrong:** a static `HappyHourDiscount.percent()` that reads the real clock, or a `static Map` cache inside a \"utility\" class, which quietly becomes mutable state shared by every request thread.",
          ],
        },
      ],
    },
    {
      title: "Constructor, Factory, Builder or Copy?",
      blocks: [
        {
          type: "paragraph",
          text: "The Constructors lesson covers the mechanics. The choice depends mostly on how many parameters there are, which of them are optional, and whether creating the object needs a name.",
        },
        {
          type: "table",
          headers: ["Use", "When", "Example"],
          rows: [
            ["Constructor", "A few parameters, all required, one obvious way to build it", "`new Order(id, customer)`"],
            ["Static factory", "Creation needs a name (two ways from the same parameter types), caching or sharing instances, returning a subtype or an interface, or normalising input first", "`Money.ofRupees(250)`, `List.of(...)`, `Optional.empty()`"],
            ["Builder", "Four or more parameters, several optional, call sites that should read like named arguments, checks across fields at `build()`", "`CheckoutRequest.builder()...build()`"],
            ["Copy constructor or copy factory", "A defensive copy of something mutable", "`new ArrayList<>(list)`, `List.copyOf(list)`"],
            ["Record canonical constructor", "A value object; a compact constructor validates and normalises", "`record Money(long paise, String currency)`"],
          ],
        },
        {
          type: "paragraph",
          text: "Effective Java opens with exactly these two: Item 1, \"Consider static factory methods instead of constructors\", and Item 2, \"Consider a builder when faced with many constructor parameters\". The sharpest reason for a factory is that constructors have no names, so two of them can't share a parameter list. The moment I want both \"from paise\" and \"from rupees\" from a `long`:",
        },
        {
          type: "code",
          language: "java",
          title: "Price.java",
          code: `public class Price {
    private final long paise;

    public Price(long paise) { this.paise = paise; }

    public Price(long rupees) { this.paise = rupees * 100; }   // same signature: (long)
}`,
        },
        {
          type: "output",
          text: `Price.java:6: error: constructor Price(long) is already defined in class Price
    public Price(long rupees) { this.paise = rupees * 100; }   // same signature: (long)
           ^
1 error`,
        },
        {
          type: "paragraph",
          text: "With named factories on a record, the meaning moves into the name, and a factory can also hand back a cached object:",
        },
        {
          type: "code",
          language: "java",
          title: "MoneyFactories.java",
          code: `public class MoneyFactories {
    record Money(long paise, String currency) {
        private static final Money ZERO_INR = new Money(0, "INR");

        Money {                                          // validation in one place
            if (paise < 0) throw new IllegalArgumentException("negative amount: " + paise);
            if (!currency.matches("[A-Z]{3}")) throw new IllegalArgumentException("currency: " + currency);
        }

        static Money ofPaise(long paise) {               // a name, and a cached zero
            return paise == 0 ? ZERO_INR : new Money(paise, "INR");
        }

        static Money ofRupees(long rupees) {             // same parameter type, different meaning
            return ofPaise(Math.multiplyExact(rupees, 100));
        }
    }

    public static void main(String[] args) {
        Money a = Money.ofRupees(250);
        Money b = Money.ofPaise(25_000);
        System.out.println(a + " equals " + b + ": " + a.equals(b));
        System.out.println("zero is one shared object: " + (Money.ofPaise(0) == Money.ofRupees(0)));
        try {
            Money.ofRupees(-5);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Money[paise=25000, currency=INR] equals Money[paise=25000, currency=INR]: true
zero is one shared object: true
negative amount: -500`,
        },
        {
          type: "list",
          items: [
            "`ofRupees(250)` and `ofPaise(25_000)` say what the number means, and they produced equal values.",
            "`ofPaise(0)` returned the same cached object both times. A constructor always creates a new object; a factory gets to choose.",
            "The validation stays in the compact constructor, so every path, factories included, goes through it. That's why `ofRupees(-5)` failed with `-500`: the rupees were converted first, then validated.",
            "The limit: a record's canonical constructor can't be made private, so anyone can bypass the factories with `new Money(...)`. When I must force every caller through a factory, for caching or interning, I use a final class with a private constructor instead. Common Mistakes shows the compile error.",
          ],
        },
        {
          type: "paragraph",
          text: "Java 25 removed one old reason for factories. Before JEP 513 (flexible constructor bodies), a subclass constructor couldn't run a check before `super(...)`. I tried `if (maxAttempts < 1) throw new IllegalArgumentException(...); super(\"upi\", maxAttempts);` in a gateway subclass: JDK 21 rejected it with `call to super must be first statement in constructor`, and JDK 25 compiled it and threw my exception for `0`. The Constructors lesson has the full rules.",
        },
        {
          type: "heading",
          text: "Right and wrong",
        },
        {
          type: "list",
          items: [
            "**Right:** a builder for `CheckoutRequest`, which has a few required fields (customer, shipping address) and optional ones with defaults (coupon, gift wrap, delivery slot), and a plain constructor for `Order`, whose two arguments are both required.",
            "**Wrong:** a telescoping set of `CheckoutRequest` constructors taking five `String`s, where swapping the billing and shipping addresses compiles fine, or a builder for a two-field `Money` value.",
          ],
        },
      ],
    },
    {
      title: "Overriding, Pattern Matching, Strategies or if/else?",
      blocks: [
        {
          type: "paragraph",
          text: "When behaviour varies by type, Java gives me four tools, and the Polymorphism lesson covers how each one works. Which one fits depends on what's more likely to grow: the list of types or the list of operations.",
        },
        {
          type: "table",
          headers: ["Technique", "Adding a type", "Adding an operation", "I use it when", "Example"],
          rows: [
            ["Overriding (a method on each type)", "One new class, nothing else changes", "Edit every class", "Behaviour belongs to the type and new types keep coming", "`ShippingCostPolicy.cost` on each policy"],
            ["`switch` over a sealed type", "Every switch must change, and the compiler lists them", "One new method with a switch", "The variants are fixed and many operations live elsewhere (routing, receipts, reporting)", "`OrderService.pay` over `PaymentMethod`"],
            ["Map of strategies", "One new entry", "Change the strategy interface", "The choice is data: per country, per shipping speed, per experiment flag", "`EnumMap<ShippingSpeed, ShippingCostPolicy>`"],
            ["Plain `if`/`else`", "Edit the method", "Edit the method", "Two or three stable cases in one place", "`total < minimum ? minimum : total`"],
          ],
        },
        {
          type: "diagram",
          text: `                 charge()  receipt()   refund()    <- operations
types   Card       x          x           x
        Upi        x          x           x
        NetBanking x          x           x

Overriding groups the code by ROW, one class per type:
  new type       -> one new class                   cheap
  new operation  -> a new method in every class     expensive

A sealed switch groups it by COLUMN, one method per operation:
  new operation  -> one new method with a switch    cheap
  new type       -> every switch changes, and javac
                    lists each one                  checked`,
          caption: "The expression problem in one grid: no layout makes both directions cheap.",
        },
        {
          type: "paragraph",
          text: "That trade-off has a name, the **expression problem**: a design is usually open for new types or open for new operations, rarely both. Polymorphism makes types cheap to add. A sealed hierarchy with pattern matching makes operations cheap to add and turns a new type into a list of compile errors, which is a feature when a forgotten case costs money.",
        },
        {
          type: "heading",
          text: "Rules of thumb",
        },
        {
          type: "list",
          items: [
            "Behaviour that belongs to the thing itself, like a shipping policy pricing a parcel or a shape computing its area, is a method on the type.",
            "Operations on a closed set that live outside it, like routing a payment, rendering a receipt or mapping to an API response, are a `switch` over the sealed type with **no** `default` branch.",
            "A choice driven by configuration or data is a map from a key to a strategy, built and validated at startup.",
            "Two stable cases are an `if`. A strategy interface for `if (items.isEmpty())` is ceremony.",
            "On Java 22 and later I'd write `case Card _ ->` when the pattern variable isn't used (JEP 456). JDK 21 still treats `_` as a preview feature and rejects it without `--enable-preview`.",
          ],
        },
        {
          type: "heading",
          text: "Right and wrong",
        },
        {
          type: "list",
          items: [
            "**Right:** shipping-cost policies as polymorphic strategies looked up in an `EnumMap`, and payment routing as an exhaustive switch over `PaymentMethod`. When a new payment method arrives later, the compiler finds the routing switch for me; the production section shows the error.",
            "**Wrong:** a `switch` with a `default` branch over a sealed type, or an `instanceof` chain ending in `else`. A new variant quietly falls into the default; Common Mistakes shows a cash-on-delivery order charged to a card that way.",
          ],
        },
      ],
    },
    {
      title: "Mutable or Immutable?",
      blocks: [
        {
          type: "paragraph",
          text: "My default is immutable, and the Encapsulation lesson shows the tools: `final` fields, records, defensive copies, and the difference between unmodifiable and immutable. Mutability needs a reason.",
        },
        {
          type: "table",
          headers: ["Situation", "My choice", "Why"],
          rows: [
            ["Values: money, coordinates, quotes, requests", "Immutable, usually a record", "Safe to share, cache and use as map keys; no defensive copies"],
            ["Entities with a lifecycle: an order, a bank account", "Mutable through methods that enforce the transitions, no public setters", "The state really changes; the methods keep it valid"],
            ["JPA entities", "Mutable, non-final class with a no-arg constructor", "The persistence provider instantiates and fills them, so records can't be entities"],
            ["Builders and accumulators", "Mutable, confined to one method or thread", "They exist to be filled in and then produce an immutable result"],
            ["Hot loops and buffers", "Mutable: `StringBuilder`, reused arrays", "Only when a measurement says the allocation matters"],
            ["Anything shared between threads", "Immutable, or a concurrent type", "An object nobody can change needs no locking"],
          ],
        },
        {
          type: "list",
          items: [
            "Effective Java's Item 17, \"Minimize mutability\": make a class immutable unless there's a good reason not to, and if it must be mutable, keep its possible states few and checked.",
            "Mutable entities change through intention-revealing methods (`order.markPaid(receipt)`, `order.ship(trackingId)`, `account.withdraw(amount)`) that check the current state. A public `setStatus` lets any caller skip the rules.",
            "Records are only shallowly immutable. A record holding a `List` should copy it in the compact constructor with `List.copyOf`.",
            "Short-lived immutable objects are cheap: a TLAB pointer bump, often removed entirely by escape analysis, as the Memory Allocation lesson measured. Performance is rarely the real reason for mutability.",
            "**Right:** `Money`, `Receipt` and `CheckoutRequest` as records, and `Order` mutable only through `markPaid` and `ship`.",
            "**Wrong:** a mutable `PriceQuote` cached and shared between customers, where applying one customer's coupon through a setter changes the price the next customer sees.",
          ],
        },
      ],
    },
    {
      title: "Nested Class, Lambda or Top-Level Class?",
      blocks: [
        {
          type: "paragraph",
          text: "The Nested and Inner Classes lesson covers the four kinds of nested class and the leak an inner class can cause. The decision comes down to who uses the class and whether it needs an enclosing instance.",
        },
        {
          type: "table",
          headers: ["Kind", "Use it when", "Example"],
          rows: [
            ["Top-level class", "Several classes use it, or it's a domain concept in its own right", "`Order`, `OrderService`"],
            ["Static nested class", "It only makes sense next to its outer class and needs no outer instance", "`CheckoutRequest.Builder`"],
            ["Inner (non-static) class", "It needs the outer instance's state, like an iterator over the outer object's data. Rare", "An iterator over a playlist's songs"],
            ["Local class", "A named helper used inside one method only", "Rare in practice"],
            ["Anonymous class", "A one-off implementation of an interface with several methods, or one that needs its own fields", "Older callback code"],
            ["Lambda or method reference", "A one-off implementation of a functional interface", "`kg -> Money.inr(10_000)`, `String::toUpperCase`"],
          ],
        },
        {
          type: "list",
          items: [
            "Static nested is the default for a nested class. An inner class carries a hidden reference to its outer object (`this$0`) and keeps it alive as long as the inner object lives. Effective Java's Item 24: \"Favor static member classes over nonstatic\".",
            "Lambdas over anonymous classes for functional interfaces, Item 42. In my `SameSize` run the non-capturing lambda allocated nothing while the anonymous class allocated 16 bytes per evaluation, and the lambda didn't even leave a class file behind.",
            "A lambda longer than three or four lines reads better as a named method plus a method reference.",
            "When a nested class starts being used from other packages, it has become a top-level class.",
            "**Right:** the `Builder` as a static nested class of `CheckoutRequest`, and a one-day promotion rule as a lambda.",
            "**Wrong:** an inner (non-static) builder, which can't be created without an instance of the very object it's supposed to build, or an anonymous `Comparator<Employee>` in code that's already on Java 8 or later.",
          ],
        },
      ],
    },
    {
      title: "Which Access Level?",
      blocks: [
        {
          type: "paragraph",
          text: "Packages and access modifiers get their own phase next, so here I only need the decision rule: **start at `private` and widen deliberately**.",
        },
        {
          type: "table",
          headers: ["Level", "Visible to", "My default for"],
          rows: [
            ["`private`", "The same top-level class, including its nested classes", "Every field and every helper method"],
            ["package-private (no keyword)", "The same package", "Collaborators inside one feature package"],
            ["`protected`", "The same package, plus subclasses anywhere", "Hooks designed for extension, like `callProvider` in the gateway skeleton"],
            ["`public`", "Everyone", "The API: interfaces and value types that other packages use"],
          ],
        },
        {
          type: "list",
          items: [
            "Fields are `private`, always. A record's components are private final fields with public accessors, which is the right default for a value.",
            "Widening later is a compatible change; narrowing later breaks every caller that already uses the member. That asymmetry is why the default is the narrowest level. It's Effective Java's Item 15, \"Minimize the accessibility of classes and members\".",
            "`protected` is a promise to every future subclass, so it belongs only on hooks I've designed and documented, never on fields.",
            "With the module system, a `public` class in a package its module doesn't export still isn't reachable from other modules. Phase 6 covers packages and modules properly.",
          ],
        },
      ],
    },
    {
      title: "When Not to Abstract",
      blocks: [
        {
          type: "paragraph",
          text: "Every guide so far has a branch that ends in \"no abstraction\", and this is where I see the most over-building. The common pattern is an `OrderService` interface whose only implementation is `OrderServiceImpl`, written out of habit for every class in the codebase.",
        },
        {
          type: "table",
          headers: ["A one-implementation interface IS worth it when", "It ISN'T worth it when"],
          rows: [
            ["It's a port to an outside system (payment provider, SMS vendor, maps API, message broker), so tests swap in a fake and a second vendor is realistic", "The implementation is my own logic with one caller"],
            ["It's a published API that other teams or modules compile against, and the interface is the stability boundary", "It exists \"to be able to mock it\": Mockito mocks classes, and since Mockito 5 even final classes by default"],
            ["A framework needs one: Spring Data repositories, JDK dynamic proxies, `ServiceLoader`", "It exists \"for Spring proxies\": Spring proxies plain classes by subclassing them, and Spring Boot does that by default"],
            ["It breaks a dependency cycle: the domain owns the interface and infrastructure implements it", "\"We might need another implementation someday\""],
          ],
        },
        {
          type: "paragraph",
          text: "The proxy argument is the one I hear most, so I checked it against real Spring: Spring Framework 6.2.11, from `org.springframework:spring-context`, which brings in `spring-aop` and its `ProxyFactory`. A `MethodInterceptor` stands in for what `@Transactional` adds around a call.",
        },
        {
          type: "code",
          language: "java",
          title: "ProxyWithoutInterface.java",
          code: `import org.aopalliance.intercept.MethodInterceptor;
import org.springframework.aop.framework.ProxyFactory;

public class ProxyWithoutInterface {
    // No interface: just a class, the way I'd write a service with one implementation
    public static class OrderService {
        public String place(String customer) { return "order placed for " + customer; }
    }

    // An interface with one implementation, the IFoo/FooImpl shape
    public interface PaymentService { String charge(long paise); }

    public static class PaymentServiceImpl implements PaymentService {
        public String charge(long paise) { return "charged " + paise; }
    }

    public static void main(String[] args) {
        MethodInterceptor tx = call -> {                 // what @Transactional adds around a call
            System.out.println("  begin " + call.getMethod().getName());
            Object result = call.proceed();
            System.out.println("  commit");
            return result;
        };

        ProxyFactory forClass = new ProxyFactory(new OrderService());
        forClass.addAdvice(tx);
        OrderService orders = (OrderService) forClass.getProxy();
        System.out.println(orders.getClass().getName());
        System.out.println(orders.place("Asha"));

        ProxyFactory forInterface = new ProxyFactory(new PaymentServiceImpl());
        forInterface.addAdvice(tx);
        Object payments = forInterface.getProxy();
        System.out.println(payments.getClass().getName());
        System.out.println(((PaymentService) payments).charge(25_000));
        System.out.println("instanceof PaymentServiceImpl: " + (payments instanceof PaymentServiceImpl));

        forInterface.setProxyTargetClass(true);          // what Spring Boot does by default
        Object bootStyle = forInterface.getProxy();
        System.out.println(bootStyle.getClass().getName());
        System.out.println("instanceof PaymentServiceImpl: " + (bootStyle instanceof PaymentServiceImpl));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# Maven: org.springframework:spring-context:6.2.11 ($SPRING holds the jars it pulls in)
javac -cp "$SPRING" ProxyWithoutInterface.java
java -cp "$SPRING:." ProxyWithoutInterface`,
        },
        {
          type: "output",
          text: `ProxyWithoutInterface$OrderService$$SpringCGLIB$$0
  begin place
  commit
order placed for Asha
jdk.proxy1.$Proxy0
  begin charge
  commit
charged 25000
instanceof PaymentServiceImpl: false
ProxyWithoutInterface$PaymentServiceImpl$$SpringCGLIB$$0
instanceof PaymentServiceImpl: true`,
        },
        {
          type: "list",
          items: [
            "The class with no interface was proxied by generating a subclass at run time (`$$SpringCGLIB$$0`), and the interceptor ran around `place`. No interface needed.",
            "For the interface-plus-`Impl` pair, Spring's default is a JDK dynamic proxy, `jdk.proxy1.$Proxy0`, which implements `PaymentService` but is **not** a `PaymentServiceImpl`. In an application context, a bean that injects the `Impl` type then fails at startup. I tried it with a small context, and the root cause was a `BeanNotOfRequiredTypeException`: the bean was expected to be the `Impl` \"but was actually of type 'jdk.proxy2.$Proxy5'\".",
            "With `setProxyTargetClass(true)`, the setting Spring Boot's AOP auto-configuration uses by default, even the class with an interface got a CGLIB proxy, and that proxy is an instance of the `Impl`. In a Spring Boot app, the interface is not what makes `@Transactional` work.",
            "The catch for my \"final unless designed for extension\" rule: CGLIB can't subclass a `final` class. When I made `OrderService` final, `getProxy()` threw `AopConfigException: Could not generate CGLIB subclass of class ProxyWithoutInterface$OrderService: Common causes of this problem include using a final class or a non-visible class`. Spring beans that get proxied have to stay non-final.",
          ],
        },
        {
          type: "heading",
          text: "Speculative generality",
        },
        {
          type: "paragraph",
          text: "The other half of over-abstraction is structural: an `AbstractVehicle` with one subclass, a factory for one strategy, a generic `BaseEntityService<T>` under every service. My rule of thumb is the rule of three. Write it concretely the first time, notice the duplication the second time, and extract the abstraction the third time, when I can see what actually varies. An abstraction designed from a single example usually captures the wrong axis of change, and then every real change has to fight it.",
        },
        {
          type: "list",
          items: [
            "**Right:** `PaymentGateway` as an interface from day one, even with one provider, because it's a port to an external system and tests must never call the real provider.",
            "**Right:** `TaxCalculator` as a plain class. It's our own code with one implementation and nothing outside the process behind it, and an interface would only add a file.",
            "**Wrong:** `IOrderService` plus `OrderServiceImpl` for the orchestration service. One implementation, only our own controllers call it, and Spring proxies it fine without the interface.",
          ],
        },
      ],
    },
    {
      title: "SOLID, Mapped onto These Choices",
      blocks: [
        {
          type: "paragraph",
          text: "The Design Patterns track covers SOLID properly, later. Mapped onto this lesson's decisions, it's short:",
        },
        {
          type: "table",
          headers: ["Principle", "In plain words", "Where it shows up here"],
          rows: [
            ["Single responsibility", "A class has one reason to change", "`OrderService` orchestrates; shipping costs live in `ShippingCostPolicy`, payment rules in the gateway skeleton, rounding in `Rounding`"],
            ["Open-closed", "New behaviour by adding code, not editing working code", "A new shipping speed is a new map entry; a new payment provider is a new subclass; a new pricing rule is one more entry in a list"],
            ["Liskov substitution", "A subtype works wherever its parent is expected", "The first question of the inheritance guide; an override that throws `UnsupportedOperationException` fails it"],
            ["Interface segregation", "Small, focused interfaces; nobody depends on methods they don't use", "One-method interfaces such as `ShippingCostPolicy`, `Channel` and `PricingRule`, each implementable by a lambda"],
            ["Dependency inversion", "High-level policy depends on abstractions it owns; details implement them", "`OrderService` receives `ShippingCostPolicy` and `PaymentGateway` through its constructor, and providers implement them"],
          ],
        },
        {
          type: "paragraph",
          text: "None of the five says \"add an interface everywhere\". Dependency inversion in particular is about direction: the domain owns `PaymentGateway`, and the provider adapter depends on it, not the other way round. The production section applies all five to one module.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "One run of `Kinds.main` from Internal Working, traced end to end. It's a small program, but it passes through every kind of call this lesson's choices compile to: an interface, an abstract class, a concrete class, a static method, a constructor, a lambda, an anonymous class and a switch over a sealed interface. The one piece of bytecode I haven't shown yet is the sealed switch in `label`:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac Kinds.java && javap -c -p Kinds`,
        },
        {
          type: "output",
          text: `  static java.lang.String label(PaymentMethod);
    Code:
       0: aload_0
       1: dup
       2: invokestatic  #11                 // Method java/util/Objects.requireNonNull:(Ljava/lang/Object;)Ljava/lang/Object;
      ...
      11: invokedynamic #17,  0             // InvokeDynamic #0:typeSwitch:(Ljava/lang/Object;I)I
      16: lookupswitch  { // 2
                     0: 54
                     1: 71
               default: 44
          }
      44: new           #21                 // class java/lang/MatchException
      ...
      53: athrow
      54: aload_1
      55: checkcast     #26                 // class Card
      ...
      71: aload_1
      72: checkcast     #36                 // class Upi
      ...
      79: invokevirtual #38                 // Method Upi.vpa:()Ljava/lang/String;`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time, the types.** `javac` writes one class file per type. `ShippingPolicy` gets `ACC_INTERFACE`, `BasePolicy` gets `ACC_ABSTRACT`, and `sealed interface PaymentMethod permits Card, Upi` becomes a `PermittedSubclasses` attribute. Each permitted type must implement `PaymentMethod` and be `final`, `sealed` or `non-sealed`; records are implicitly `final`, so `Card` and `Upi` qualify.",
            "**Compile time, the calls.** The instruction is chosen from the **declared** type of the variable, not the object: `viaInterface.cost(10)` becomes `invokeinterface`, `viaAbstract.cost(10)` and `viaClass.cost(10)` become `invokevirtual`, `roundToRupee` and `label` become `invokestatic`, constructors and `super.cost(kg)` become `invokespecial`, and the lambda becomes `invokedynamic`.",
            "**Compile time, the switch.** The two cases cover every permitted subtype, so `label` needs no `default`. `javac` compiles it into a null check, an `invokedynamic` to `SwitchBootstraps.typeSwitch` that returns a case index, and a `lookupswitch` on that index. The `default: 44` it adds itself throws `MatchException`, for a subtype that turns up at run time without `Kinds` having been recompiled.",
            "**Run time, `new ExpressPolicy()`.** Before the first instance can exist, the JVM loads `ExpressPolicy` together with its superclass `BasePolicy`, which in turn brings in its superinterface `ShippingPolicy`. Then `invokespecial` runs the constructor chain: `ExpressPolicy.<init>`, `BasePolicy.<init>`, `Object.<init>`.",
            "**The interface call.** `invokeinterface ShippingPolicy.cost` looks at the receiver's class, `ExpressPolicy`, and finds its `cost` through the interface method table. `ExpressPolicy.cost` calls `super.cost(kg)` with `invokespecial`, which runs exactly `BasePolicy.cost` with no override lookup.",
            "**The abstract steps.** Inside `BasePolicy.cost`, `base()` and `perKg()` are ordinary `invokevirtual` calls that dispatch to `ExpressPolicy`: 50 + 10 × 12 = 170, plus 5 from the override, gives `175`. The two `invokevirtual` calls through `BasePolicy` and `ExpressPolicy` variables reach the same method on the same kind of object and print `175` too.",
            "**The static call.** `invokestatic roundToRupee` has no receiver and nothing to look up at run time: (17,549 + 50) / 100 × 100 is `17500` in integer arithmetic.",
            "**The lambda.** The first time the `invokedynamic` runs, its bootstrap method, `LambdaMetafactory`, generates a hidden class that implements `LongUnaryOperator` by calling the private `lambda$main$0`. The lambda captures nothing, so on HotSpot the call site hands back one shared instance from then on, which is why `SameSize` measured 0 bytes for it. `applyAsLong(175)` is 175 × 118 / 100, which truncates to `206`.",
            "**The anonymous class.** `Kinds$1` is an ordinary class file, loaded the first time `new Kinds$1()` runs, and every evaluation of that expression creates a new object, as the `SameSize` run measured.",
            "**The sealed switch.** `label(new Upi(\"asha@okbank\"))` passes the null check, and the `typeSwitch` call site is linked once by its bootstrap method. It returns `1`, the index of the `Upi` case, so `lookupswitch` jumps to offset 71, where `checkcast` and the `vpa()` accessor take the record apart, and the program prints `upi asha@okbank`.",
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
          title: "OopSyntax.java",
          code: `import java.util.List;
import java.util.function.UnaryOperator;

public class OopSyntax {
    // Interface: abstract, default, static and private methods
    interface Notifier {
        String send(String to, String text);                           // abstract
        default String sendAll(List<String> to, String text) {          // default, Java 8
            return String.join(" | ", to.stream().map(t -> send(t, tidy(text))).toList());
        }
        static Notifier console() { return (to, text) -> to + ": " + text; }   // static, Java 8
        private String tidy(String text) { return text.strip(); }       // private, Java 9
    }

    // Abstract class: state, a constructor, a final template method and a hook
    abstract static class Report {
        private final String title;
        Report(String title) { this.title = title; }
        final String render() { return "[" + title + "] " + body(); }
        protected abstract String body();
    }

    // Concrete class, closed to further extension
    static final class DailyReport extends Report {
        DailyReport() { super("daily"); }
        @Override protected String body() { return "orders=42"; }
    }

    // Record: a compact constructor and a static factory
    record GeoPoint(double lat, double lon) {
        GeoPoint {
            if (lat < -90 || lat > 90) throw new IllegalArgumentException("lat " + lat);
        }
        static GeoPoint of(double lat, double lon) { return new GeoPoint(lat, lon); }
    }

    // Enum: a field, a constructor and a method per constant set
    enum RoomType {
        SINGLE(1), DOUBLE(2), FAMILY(4);
        private final int beds;
        RoomType(int beds) { this.beds = beds; }
        boolean fits(int guests) { return guests <= beds; }
    }

    // Sealed interface with records, matched exhaustively
    sealed interface Promo permits PercentOff, FlatOff {}
    record PercentOff(int percent) implements Promo {}
    record FlatOff(long paise) implements Promo {}

    static long apply(Promo promo, long price) {
        return switch (promo) {
            case PercentOff(int p) when p >= 100 -> 0;                  // record pattern with a guard
            case PercentOff(int p) -> price - price * p / 100;
            case FlatOff(long off) -> Math.max(0, price - off);
        };
    }

    // Static nested class
    static final class Counter {
        private int n;
        int next() { return ++n; }
    }

    public static void main(String[] args) {
        Notifier sms = Notifier.console();
        System.out.println(sms.sendAll(List.of("Asha", "Ravi"), "  order shipped  "));
        System.out.println(new DailyReport().render());
        System.out.println(GeoPoint.of(22.57, 88.36));
        System.out.println(RoomType.SINGLE.fits(2) + " " + RoomType.DOUBLE.fits(2));
        System.out.println(apply(new PercentOff(10), 20_000) + " " + apply(new FlatOff(5_000), 20_000)
                + " " + apply(new PercentOff(100), 20_000));

        UnaryOperator<String> upper = String::toUpperCase;               // method reference
        Counter counter = new Counter();
        Runnable tick = new Runnable() {                                 // anonymous class
            public void run() { counter.next(); }
        };
        tick.run();
        tick.run();
        System.out.println(upper.apply("kolkata") + " " + counter.next());
    }
}`,
        },
        {
          type: "output",
          text: `Asha: order shipped | Ravi: order shipped
[daily] orders=42
GeoPoint[lat=22.57, lon=88.36]
false true
18000 15000 0
KOLKATA 3`,
        },
        {
          type: "paragraph",
          text: "Every form in one file: the four kinds of interface method, an abstract class with a `final` template method, a `final` subclass, a record with a compact constructor and a factory, an enum with a field and a method, a sealed interface matched with record patterns and a `when` guard, a static nested class, a method reference and an anonymous class. `PercentOff(100)` hit the guarded case and produced `0`. Cases are tried top to bottom, so the guarded one has to come first; when I swapped the two, `javac` refused with `this case label is dominated by a preceding case label`.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "A notification system: one interface, composed",
        },
        {
          type: "paragraph",
          text: "The design question I'd expect in an interview: notify customers by push, SMS or email, with a fallback. The channels share no state and no steps, and each talks to a different vendor, so they're an interface. Which channels a message uses is data, so it's a map:",
        },
        {
          type: "code",
          language: "java",
          title: "Notifications.java",
          code: `import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public class Notifications {
    record Customer(String name, String phone, String email, String pushToken) {}

    interface Channel { boolean send(Customer to, String text); }   // a port to an outside vendor

    enum Topic { ORDER_SHIPPED, RECEIPT }

    static final class Notifier {                        // has channels, tried in order
        private final Map<Topic, List<Channel>> routes;

        Notifier(Map<Topic, List<Channel>> routes) { this.routes = new EnumMap<>(routes); }

        void deliver(Customer customer, Topic topic, String text) {
            for (Channel channel : routes.get(topic)) {
                if (channel.send(customer, text)) return;   // the first channel that works wins
            }
            System.out.println("  undelivered " + topic + " for " + customer.name());
        }
    }

    public static void main(String[] args) {
        // In production each channel is a vendor adapter class; lambdas keep the demo short
        Channel push = (to, text) -> {
            if (to.pushToken() == null) return false;    // app uninstalled, no token
            System.out.println("  push  -> " + to.name() + ": " + text);
            return true;
        };
        Channel sms = (to, text) -> { System.out.println("  sms   -> " + to.phone() + ": " + text); return true; };
        Channel email = (to, text) -> { System.out.println("  email -> " + to.email() + ": " + text); return true; };

        Notifier notifier = new Notifier(Map.of(
                Topic.ORDER_SHIPPED, List.of(push, sms),
                Topic.RECEIPT, List.of(email)));

        Customer asha = new Customer("Asha", "98XXXXXX01", "asha@example.com", "tok-81f2");
        Customer ravi = new Customer("Ravi", "98XXXXXX02", "ravi@example.com", null);
        notifier.deliver(asha, Topic.ORDER_SHIPPED, "order 1042 has shipped");
        notifier.deliver(ravi, Topic.ORDER_SHIPPED, "order 1043 has shipped");
        notifier.deliver(asha, Topic.RECEIPT, "INR 1,499.00 paid by UPI");
    }
}`,
        },
        {
          type: "output",
          text: `  push  -> Asha: order 1042 has shipped
  sms   -> 98XXXXXX02: order 1043 has shipped
  email -> asha@example.com: INR 1,499.00 paid by UPI`,
        },
        {
          type: "diagram",
          text: `             Notifier (composition: it holds the routes)
             ORDER_SHIPPED -> [push, sms]
             RECEIPT       -> [email]
                     │ tries each channel in order
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
  ┌─────────┐   ┌─────────┐   ┌─────────┐
  │  push   │   │   sms   │   │  email  │   each implements Channel,
  └─────────┘   └─────────┘   └─────────┘   one vendor behind each`,
          caption: "Adding WhatsApp is one more Channel and one more entry in a route. Notifier never changes.",
        },
        {
          type: "list",
          items: [
            "Asha has a push token, so push succeeded and the loop stopped. Ravi has none, push returned `false`, and SMS took over. The receipt went by email only, because that's its route.",
            "An interface rather than an abstract class, because the channels share nothing. If the vendor adapters later share retry logic, a skeleton can go under the interface, exactly like the payment gateway.",
            "Composition rather than inheritance: `Notifier` has channels; it isn't one. And the `Topic` enum keys an `EnumMap`, the map-of-strategies tool from the varying-behaviour guide.",
          ],
        },
        {
          type: "heading",
          text: "Tax, coupon and shipping rules: strategies in a list",
        },
        {
          type: "paragraph",
          text: "Checkout pricing rules change often and are owned by people outside engineering. I model each rule as a record implementing one functional interface, and the pricing pipeline as a list, so the order of the rules is visible in one place:",
        },
        {
          type: "code",
          language: "java",
          title: "PricingRules.java",
          code: `import java.util.List;

public class PricingRules {
    record Cart(int items, long subtotalPaise, String couponCode) {}

    interface PricingRule { long apply(long paise, Cart cart); }

    record Tax(int percent) implements PricingRule {
        public long apply(long paise, Cart c) { return paise + paise * percent / 100; }
    }

    record Coupon(String code, int percentOff, long maxOffPaise) implements PricingRule {
        public long apply(long paise, Cart c) {
            if (!code.equals(c.couponCode())) return paise;
            return paise - Math.min(paise * percentOff / 100, maxOffPaise);
        }
    }

    record ShippingFee(long freeFromPaise, long feePaise) implements PricingRule {
        public long apply(long paise, Cart c) { return paise >= freeFromPaise ? paise : paise + feePaise; }
    }

    static long price(List<PricingRule> rules, Cart cart) {
        long total = cart.subtotalPaise();
        for (PricingRule rule : rules) total = rule.apply(total, cart);
        return total;
    }

    static String inr(long paise) { return "INR " + paise / 100 + "." + String.format("%02d", paise % 100); }

    public static void main(String[] args) {
        Cart cart = new Cart(3, 89_900, "FIRST20");
        Tax gst = new Tax(18);
        Coupon first = new Coupon("FIRST20", 20, 15_000);
        ShippingFee shipping = new ShippingFee(99_900, 4_900);
        PricingRule giftWrap = (paise, c) -> paise + 3_000L * c.items();   // a one-off rule as a lambda

        System.out.println("subtotal           " + inr(cart.subtotalPaise()));
        System.out.println("tax then coupon    " + inr(price(List.of(gst, first, shipping), cart)));
        System.out.println("coupon then tax    " + inr(price(List.of(first, gst, shipping), cart)));
        System.out.println("plus gift wrap     " + inr(price(List.of(first, gst, giftWrap, shipping), cart)));
    }
}`,
        },
        {
          type: "output",
          text: `subtotal           INR 899.00
tax then coupon    INR 959.82
coupon then tax    INR 932.82
plus gift wrap     INR 1022.82`,
        },
        {
          type: "list",
          items: [
            "A subtotal of INR 899.00 with 18% tax, a 20% coupon capped at 150 rupees, and a 49-rupee shipping fee below 999 rupees. Tax first charged 18% on the full 899 and then took the capped 150 off, giving 959.82; the coupon first took 150 off, so tax was charged on 749 only, giving 932.82. The same three rules, 27 rupees apart. The order is a business decision, so it lives in one list instead of being buried in nested calls.",
            "Each rule is a record: its configuration is its data, it prints itself for logs, and two rules with the same settings are equal.",
            "The gift wrap charge, 30 rupees per item, is a lambda, because the interface has one method. A rule that lives for one festive week doesn't need a class, and adding it never touched `price`. That's the open-closed principle with no framework at all.",
          ],
        },
        {
          type: "heading",
          text: "Enum or sealed interface: an order's status and its events",
        },
        {
          type: "paragraph",
          text: "An order's status and the events that change it look alike, but they need different constructs. Every status has the same shape, so it's an enum. Each event carries different data, so it's a sealed interface of records:",
        },
        {
          type: "code",
          language: "java",
          title: "EnumOrSealed.java",
          code: `import java.util.List;

public class EnumOrSealed {
    // A fixed set of constants with the same shape: an enum, with its rules inside it
    enum OrderStatus {
        PLACED, PAID, SHIPPED, DELIVERED, CANCELLED;

        boolean canMoveTo(OrderStatus next) {
            return switch (this) {
                case PLACED  -> next == PAID || next == CANCELLED;
                case PAID    -> next == SHIPPED || next == CANCELLED;
                case SHIPPED -> next == DELIVERED;
                case DELIVERED, CANCELLED -> false;
            };
        }
    }

    // A closed set of variants that carry different data: a sealed interface of records
    sealed interface OrderEvent permits Paid, Shipped, Delivered, Cancelled {}
    record Paid(String method, long amountPaise) implements OrderEvent {}
    record Shipped(String carrier, String trackingId) implements OrderEvent {}
    record Delivered() implements OrderEvent {}
    record Cancelled(String by, String reason) implements OrderEvent {}

    static OrderStatus statusAfter(OrderEvent event) {
        return switch (event) {
            case Paid p      -> OrderStatus.PAID;
            case Shipped s   -> OrderStatus.SHIPPED;
            case Delivered d -> OrderStatus.DELIVERED;
            case Cancelled c -> OrderStatus.CANCELLED;
        };
    }

    static String describe(OrderEvent event) {
        return switch (event) {
            case Paid(String method, long amount)       -> "INR " + amount / 100 + " paid by " + method;
            case Shipped(String carrier, String id)     -> "shipped with " + carrier + ", tracking " + id;
            case Delivered()                            -> "delivered";
            case Cancelled(String by, String reason)    -> "cancelled by " + by + ": " + reason;
        };
    }

    public static void main(String[] args) {
        OrderStatus status = OrderStatus.PLACED;
        List<OrderEvent> events = List.of(new Paid("UPI", 149_900), new Shipped("ShipFast", "SF-7781"),
                new Delivered(), new Cancelled("customer", "changed mind"));
        for (OrderEvent event : events) {
            OrderStatus next = statusAfter(event);
            if (!status.canMoveTo(next)) {
                System.out.println("rejected  " + status + " -> " + next);
                continue;
            }
            status = next;
            System.out.println(status + "  " + describe(event));
        }
    }
}`,
        },
        {
          type: "output",
          text: `PAID  INR 1499 paid by UPI
SHIPPED  shipped with ShipFast, tracking SF-7781
DELIVERED  delivered
rejected  DELIVERED -> CANCELLED`,
        },
        {
          type: "list",
          items: [
            "`OrderStatus` holds its transition rules in `canMoveTo`, an exhaustive switch over `this`. The cancellation after delivery was rejected by the enum itself, not by `if`s scattered across services.",
            "Each event record carries only its own data: a payment method and an amount, a carrier and a tracking id, who cancelled and why. Squeezing those into one enum would need nullable fields, the tagged-class problem from the data guide.",
            "`describe` takes the records apart with record patterns. Neither switch has a `default`, so a new event type would be a compile error in both.",
          ],
        },
        {
          type: "heading",
          text: "The BaseEntityService trap",
        },
        {
          type: "paragraph",
          text: "A proposal I'd push back on in a review: every service extends one generic base class so that CRUD comes for free.",
        },
        {
          type: "code",
          language: "java",
          title: "NoBaseService.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class NoBaseService {
    record Payment(long id, long paise) {}

    // The proposal: every service extends one generic base class
    abstract static class BaseEntityService<T> {
        protected final Map<Long, T> store = new HashMap<>();
        public void save(long id, T entity) { store.put(id, entity); }
        public T findById(long id) { return store.get(id); }
        public void deleteById(long id) { store.remove(id); }     // so every service can delete
    }

    static final class PaymentService extends BaseEntityService<Payment> {}

    // Patching it: the subtype refuses what the base type promised
    static final class GuardedPaymentService extends BaseEntityService<Payment> {
        @Override public void deleteById(long id) {
            throw new UnsupportedOperationException("payments are never deleted");
        }
    }

    // A generic admin cleanup job, written against the base type
    static void purge(BaseEntityService<?> service, long id) { service.deleteById(id); }

    // The fix: only the operations the domain allows, with the storage composed in
    static final class PaymentLedger {
        private final Map<Long, Payment> store = new HashMap<>();
        void record(Payment p) { store.put(p.id(), p); }
        Payment find(long id) { return store.get(id); }
    }

    public static void main(String[] args) {
        PaymentService payments = new PaymentService();
        payments.save(7, new Payment(7, 22_800));
        purge(payments, 7);
        System.out.println("inherited delete : payment 7 is " + payments.findById(7));

        GuardedPaymentService guarded = new GuardedPaymentService();
        guarded.save(7, new Payment(7, 22_800));
        try {
            purge(guarded, 7);
        } catch (UnsupportedOperationException e) {
            System.out.println("override to throw: " + e.getMessage() + ", found only at run time");
        }

        PaymentLedger ledger = new PaymentLedger();
        ledger.record(new Payment(7, 22_800));
        System.out.println("composition      : " + ledger.find(7) + ", and there's no delete to call");
    }
}`,
        },
        {
          type: "output",
          text: `inherited delete : payment 7 is null
override to throw: payments are never deleted, found only at run time
composition      : Payment[id=7, paise=22800], and there's no delete to call`,
        },
        {
          type: "paragraph",
          text: "The composition version can't even be handed to the generic job. Adding `purge(ledger, 7);` as the last line of `main`:",
        },
        {
          type: "output",
          text: `NoBaseService.java:51: error: incompatible types: PaymentLedger cannot be converted to BaseEntityService<?>
        purge(ledger, 7);
              ^
Note: Some messages have been simplified; recompile with -Xdiags:verbose to get full output
1 error`,
        },
        {
          type: "list",
          items: [
            "`PaymentService` never declared `deleteById`, yet the generic job deleted payment 7 through it. Inheritance handed it every public method of the base, including the one its domain forbids.",
            "Overriding to throw is the usual patch, and it's worse: the base type promises that deletion works, the subtype breaks the promise, and the failure appears at run time in whatever code trusted the base type. That's a Liskov violation in one line.",
            "`PaymentLedger` holds its storage in a field instead of inheriting it. It offers exactly the operations payments allow, and the misuse became a compile error.",
          ],
        },
      ],
    },
    {
      title: "The Decision Checklist",
      blocks: [
        {
          type: "paragraph",
          text: "When I design a new class, this is the list I run, top to bottom. It's the whole lesson on one screen, and each line agrees with the \"When to Use\" section of the lesson that owns it.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**What is it?** An entity (identity, lifecycle), a value (data), a fixed set of constants, a closed set of variants, or a behaviour? That picks class, record, enum, sealed interface or interface.",
            "**Who needs to swap it?** Nobody (no second implementation, no fake, no outside system): a concrete class. Somebody: an interface that callers depend on.",
            "**Do the implementations share state or a fixed sequence of steps?** Then an abstract skeleton under the interface, with a `final` template method.",
            "**Is it really an is-a?** `extends` only when it's substitutable and the parent was designed for it. Otherwise, hold the other object in a field.",
            "**Who owns what it holds?** Created and kept private: composition. Passed in and shared: aggregation or association, often by id.",
            "**What will grow, types or operations?** Types: a polymorphic method. Operations on a closed set: an exhaustive `switch` with no `default`. A data-driven choice: a map of strategies. Two stable cases: an `if`.",
            "**Does it need state or dependencies?** Neither: a `static` method. Dependencies: an instance with constructor injection.",
            "**How is it created?** Few required arguments: a constructor. A name, caching or a subtype: a static factory. Many optional parts: a builder.",
            "**Can it be immutable?** By default, yes. Mutable only for entities (through rule-checking methods), JPA, builders and measured hot paths.",
            "**Where does it live?** Top-level if it's shared, static nested if it belongs to one class, a lambda if it's a one-off functional interface.",
            "**Who can see it?** `private` first, widened on purpose.",
            "**Does the abstraction have a second user today?** If every answer to \"who needs to swap it?\" is \"someday\", I write the concrete class and wait.",
          ],
        },
        {
          type: "heading",
          text: "Symptoms, and the move I'd make",
        },
        {
          type: "table",
          headers: ["When I see", "I reach for"],
          rows: [
            ["The same `if (type == ...)` chain in several places", "A sealed interface with exhaustive switches, or a polymorphic method"],
            ["A class with fields that are `null` for some kinds of object", "A sealed interface with one record per kind"],
            ["A subclass overriding a method to throw", "Composition: the is-a was false"],
            ["A static method that reads the clock or a static map", "An instance with the dependency injected"],
            ["A constructor with five parameters of the same type", "A builder, or small value types for each argument"],
            ["`FooImpl` with one implementation and nothing outside behind it", "Deleting the interface"],
            ["A 2,000-line service with ten injected dependencies", "A split by reason to change: strategies, ports and a thin orchestrator"],
          ],
        },
        {
          type: "heading",
          text: "Right and wrong",
        },
        {
          type: "list",
          items: [
            "**Right:** `PaymentMethod` went through questions 1 and 6 and became a sealed interface with an exhaustive switch. When a new payment method arrives, the compiler points at every switch to update.",
            "**Wrong:** answering question 2 with \"someday\" and building `IShippingService`, `ShippingServiceImpl`, `AbstractShippingStrategy` and a `ShippingStrategyFactory` for a single flat-rate formula. Question 12 exists to stop exactly that.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Modelling an entity as a record",
        },
        {
          type: "code",
          language: "java",
          title: "EntityAsRecord.java",
          code: `import java.util.LinkedHashSet;
import java.util.Set;

public class EntityAsRecord {
    enum Status { PLACED, PAID }

    record Order(long id, Status status) {
        Order pay() { return new Order(id, Status.PAID); }         // a "change" is a new value
    }

    public static void main(String[] args) {
        Set<Order> open = new LinkedHashSet<>();
        Order placed = new Order(42, Status.PLACED);
        open.add(placed);
        Order paid = placed.pay();
        open.add(paid);
        System.out.println(open.size() + " open orders: " + open);
        System.out.println("same order? " + placed.equals(paid));
    }
}`,
        },
        {
          type: "output",
          text: `2 open orders: [Order[id=42, status=PLACED], Order[id=42, status=PAID]]
same order? false`,
        },
        {
          type: "paragraph",
          text: "A record's equality is its data, so the paid order is no longer \"the same order\", and the set now holds two orders with id 42. Anything keyed by the old value, a map entry, a cache, a set of open orders, silently goes stale. An entity needs identity: a class whose state changes in place through methods that check the rules.",
        },
        {
          type: "heading",
          text: "A default branch in a switch over a sealed type",
        },
        {
          type: "code",
          language: "java",
          title: "DefaultHides.java",
          code: `public class DefaultHides {
    sealed interface PaymentMethod permits Card, Upi, CashOnDelivery {}
    record Card(String last4) implements PaymentMethod {}
    record Upi(String vpa) implements PaymentMethod {}
    record CashOnDelivery() implements PaymentMethod {}     // added months later

    static String settle(PaymentMethod m) {
        return switch (m) {
            case Card c -> "charge card ending " + c.last4();
            case Upi u  -> "collect via UPI " + u.vpa();
            default     -> "charge the card on file";       // written when only Card and Upi existed
        };
    }

    public static void main(String[] args) {
        System.out.println(settle(new CashOnDelivery()));
    }
}`,
        },
        {
          type: "output",
          text: `charge the card on file`,
        },
        {
          type: "paragraph",
          text: "The `default` was written when only `Card` and `Upi` existed. When `CashOnDelivery` was added, nothing failed to compile, and a cash-on-delivery order was charged to the card on file. Without the `default`, adding `CashOnDelivery` would have been a compile error at exactly this switch. The same goes for an `instanceof` chain that ends in a plain `else`.",
        },
        {
          type: "heading",
          text: "An abstract class where a lambda was wanted",
        },
        {
          type: "code",
          language: "java",
          title: "NotFunctional.java",
          code: `public class NotFunctional {
    abstract static class PricingRule {
        abstract long apply(long paise);
    }

    public static void main(String[] args) {
        PricingRule withTax = paise -> paise * 118 / 100;
        System.out.println(withTax.apply(20_000));
    }
}`,
        },
        {
          type: "output",
          text: `NotFunctional.java:7: error: incompatible types: PricingRule is not a functional interface
        PricingRule withTax = paise -> paise * 118 / 100;
                              ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Lambdas only target functional interfaces. A rule type with one abstract method and no state should be an interface, which is what `PricingRule` is in the Examples, where the gift wrap charge was a one-line lambda.",
        },
        {
          type: "heading",
          text: "Trying to hide a record's constructor",
        },
        {
          type: "code",
          language: "java",
          title: "HiddenConstructor.java",
          code: `public class HiddenConstructor {
    record Money(long paise, String currency) {
        private Money {                                  // force everyone through ofPaise()
            if (paise < 0) throw new IllegalArgumentException("negative amount");
        }

        static Money ofPaise(long paise) { return new Money(paise, "INR"); }
    }
}`,
        },
        {
          type: "output",
          text: `HiddenConstructor.java:3: error: invalid canonical constructor in record Money
        private Money {                                  // force everyone through ofPaise()
                ^
  (attempting to assign stronger access privileges; was package)
1 error`,
        },
        {
          type: "paragraph",
          text: "A record's canonical constructor must be at least as accessible as the record itself, package-private here, so it can't be `private`. If every caller must go through a factory, for caching or interning, the type should be a final class with a private constructor.",
        },
        {
          type: "heading",
          text: "An interface for every class, and inheritance for reuse",
        },
        {
          type: "paragraph",
          text: "Neither of these fails to compile, which is why they spread. An `IFoo` with one `FooImpl` and nothing outside behind it adds a file and a name for a decision nobody makes; When Not to Abstract has the Spring evidence. Extending a class to reuse its code inherits everything it does now and everything it will do later; `NoBaseService` has the run.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Pick the construct that matches what the thing is: entity, value, constant, closed variant or behaviour. Most of the other decisions follow from that.",
            "Depend on interfaces at the boundaries (ports to outside systems, published APIs) and on concrete classes inside a module.",
            "Put rules every implementation must follow in a `final` template method of an abstract skeleton, under an interface.",
            "Make classes `final` unless they're designed for extension, except Spring beans that get CGLIB proxies.",
            "Prefer composition; keep inheritance for real is-a relationships with designed hooks.",
            "Use records for values, with validation in the compact constructor, and classes with rule-checking methods for entities.",
            "Model closed sets of variants as sealed interfaces, and switch over them with no `default`.",
            "Keep `static` for pure functions and constants; anything with dependencies gets constructor injection.",
            "Use factories for named or cached creation, builders for many optional parameters, and constructors for the rest.",
            "Default to immutable, `private` and concrete. Every step away from those defaults needs a reason I can say out loud.",
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
            "An interface call compiles to `invokeinterface` and a class call to `invokevirtual`. Once the call site is hot and monomorphic, the JIT inlines both the same way, as the Internal Working section and the Polymorphism lesson show. Megamorphic call sites usually stay real dispatches, which is a property of the design, not of the keyword.",
            "A record and an equivalent final class have the same layout: 24 bytes each for `(long, String)` on JDK 21 in my measurement, and still 24 on JDK 25 with compact object headers. Generated `equals`, `hashCode` and `toString` are linked once per call site through `invokedynamic`.",
            "A non-capturing lambda allocated nothing per evaluation in my run. A lambda capturing a `long` was a 24-byte object each time, and an anonymous class a 16-byte object each time. Escape analysis often removes even those in hot code.",
            "Each enum constant is one shared object, and `EnumMap` is backed by an array indexed by `ordinal()`, which makes it smaller and faster than a `HashMap` with the same enum keys.",
            "A pattern `switch` is linked once by `SwitchBootstraps.typeSwitch`, then it's a type test and a `tableswitch`. I haven't measured a difference between it and a virtual call that would change a design, so I choose between them for the expression-problem reasons, not for speed.",
            "Immutable values mean more short-lived objects, which are cheap TLAB allocations and often eliminated altogether; the Memory Allocation lesson measured both. What costs real time is long-lived garbage and contended shared state, and immutability reduces the second.",
            "Over-abstraction has a cost too, just not in CPU time: deeper stack traces, more proxies, and more files to read when something breaks in production.",
          ],
        },
      ],
    },
    {
      title: "OOP Design in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Here's the module the guides were building toward: pricing and payments for the ride-hailing backend. Quote a fare per vehicle type, book a ride, complete it with the real distance, and take payment by card, UPI or wallet, with the UPI provider timing out once and the rider's app retrying. Every piece is one decision from this lesson:",
        },
        {
          type: "table",
          headers: ["Piece", "Construct", "Why, and which guide"],
          rows: [
            ["`Money`", "Record, validated in the compact constructor", "A value: equal by amount and currency, immutable, safe to share (data guide)"],
            ["`Rounding`", "Final class, private constructor, one static method", "A pure function with nothing to swap (static guide)"],
            ["`VehicleType`, `RideStatus`", "Enums", "Fixed sets of constants with the same shape (data guide)"],
            ["`FarePolicy`, `PerKm`, `WithMinimum`", "Interface, implemented by records, picked from an `EnumMap`", "Behaviour that varies by vehicle type and is chosen by data; `WithMinimum` wraps any policy (interface, composition and varying-behaviour guides)"],
            ["`PaymentMethod`: `Card`, `Upi`, `Wallet`", "Sealed interface with records", "A closed set of variants with different data, routed by an exhaustive switch (data and varying-behaviour guides)"],
            ["`PaymentGateway`, `AbstractPaymentGateway`", "Interface plus abstract skeleton with a `final` template method", "Callers see a contract; providers share idempotency and retries (interface guide)"],
            ["`WalletLedger`", "Final class, no interface", "Our own code with one implementation (When Not to Abstract)"],
            ["`RideRequest.Builder`", "Static nested builder on a record", "Required and optional fields, readable call sites (constructor and nested-class guides)"],
            ["`Ride`", "Final class, private state, checked transitions", "An entity with identity and a lifecycle (data and mutability guides)"],
            ["`RideService`", "Final class, every dependency passed to its constructor", "One implementation that orchestrates; it depends on interfaces for everything that varies (static guide, When Not to Abstract)"],
          ],
        },
        {
          type: "diagram",
          text: `                          RideService
             one implementation, dependencies injected
   ┌────────────────┬────────────────┬────────────────┐
   ▼                ▼                ▼                ▼
EnumMap          PaymentGateway   PaymentGateway   WalletLedger
<VehicleType,    (cards)          (upi)            plain class,
 FarePolicy>        │                │             no interface
   │                ▼                ▼
PerKm,           CardNetwork-     UpiSwitch-
WithMinimum      Gateway          Gateway
(records)           └──── extends ───┘
               AbstractPaymentGateway
               final charge(): idempotency, retries
               abstract callProvider(): one per provider

values    Money, Receipt, RideRequest (records)
entity    Ride: ASSIGNED -> COMPLETED -> PAID
variants  PaymentMethod = Card | Upi | Wallet (sealed)`,
          caption: "RideService knows interfaces, records and one plain class. No provider or policy class appears in its code.",
        },
        {
          type: "code",
          language: "java",
          title: "PricingAndPayments.java",
          code: `import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;

public class PricingAndPayments {
    // 1. Value object: validated once, equal by value, immutable
    record Money(long paise, String currency) {
        Money {
            if (paise < 0) throw new IllegalArgumentException("negative amount: " + paise);
            if (!currency.matches("[A-Z]{3}")) throw new IllegalArgumentException("bad currency: " + currency);
        }
        static Money inr(long paise) { return new Money(paise, "INR"); }
        Money plus(Money o) { return new Money(Math.addExact(paise, o.paise), currency); }
        Money times(int n) { return new Money(Math.multiplyExact(paise, n), currency); }
        @Override public String toString() { return currency + " " + paise / 100 + "." + String.format("%02d", paise % 100); }
    }

    // 2. Static utility: a pure function with nothing to swap in a test
    static final class Rounding {
        private Rounding() {}
        static Money toNearestRupee(Money m) { return new Money((m.paise() + 50) / 100 * 100, m.currency()); }
    }

    // 3. A fixed set of constants
    enum VehicleType { AUTO, MINI, SEDAN }

    // 4. Strategy: one fare policy per vehicle type, picked from a map
    interface FarePolicy { Money quote(int km); }

    record PerKm(Money base, Money perKm) implements FarePolicy {
        public Money quote(int km) { return base.plus(perKm.times(km)); }
    }

    record WithMinimum(FarePolicy inner, Money minimum) implements FarePolicy {   // wraps another policy
        public Money quote(int km) {
            Money fare = inner.quote(km);
            return fare.paise() < minimum.paise() ? minimum : fare;
        }
    }

    // 5. A closed set of variants, each with its own data
    sealed interface PaymentMethod permits Card, Upi, Wallet {}
    record Card(String last4) implements PaymentMethod {}
    record Upi(String vpa) implements PaymentMethod {}
    record Wallet(long walletId) implements PaymentMethod {}

    // 6. An interface for callers, a skeleton with a final template method for providers
    record Receipt(String id, Money amount, int attempts) {}

    interface PaymentGateway { Receipt charge(String key, Money amount, String instrument); }

    static final class TransientFailure extends RuntimeException {
        TransientFailure(String message) { super(message); }
    }

    abstract static class AbstractPaymentGateway implements PaymentGateway {
        private final Map<String, Receipt> done = new HashMap<>();   // production: a unique key in the DB
        private final String name;
        private final int maxAttempts;

        AbstractPaymentGateway(String name, int maxAttempts) { this.name = name; this.maxAttempts = maxAttempts; }

        @Override
        public final Receipt charge(String key, Money amount, String instrument) {
            Receipt earlier = done.get(key);
            if (earlier != null) return earlier;                   // the same request again
            for (int attempt = 1; ; attempt++) {
                try {
                    Receipt receipt = new Receipt(callProvider(key, amount, instrument), amount, attempt);
                    done.put(key, receipt);
                    return receipt;
                } catch (TransientFailure e) {
                    System.out.println("  [" + name + "] attempt " + attempt + " failed: " + e.getMessage());
                    if (attempt == maxAttempts) throw e;
                }
            }
        }

        protected abstract String callProvider(String key, Money amount, String instrument);
    }

    static final class CardNetworkGateway extends AbstractPaymentGateway {
        CardNetworkGateway() { super("card", 3); }
        protected String callProvider(String key, Money amount, String last4) { return "CARD-" + key; }
    }

    static final class UpiSwitchGateway extends AbstractPaymentGateway {
        int calls;
        UpiSwitchGateway() { super("upi", 3); }
        protected String callProvider(String key, Money amount, String vpa) {
            if (++calls == 1) throw new TransientFailure("timeout");     // the first call times out
            return "UPI-" + key;
        }
    }

    // Our own ledger: one implementation, so no interface
    static final class WalletLedger {
        private final Map<Long, Long> balances = new HashMap<>(Map.of(9001L, 50_000L));
        Receipt debit(long walletId, String key, Money amount) {
            long balance = balances.getOrDefault(walletId, 0L);
            if (balance < amount.paise()) throw new IllegalStateException("wallet " + walletId + " is short");
            balances.put(walletId, balance - amount.paise());
            return new Receipt("WALLET-" + key, amount, 1);
        }
    }

    // 7. A builder for a request with required and optional parts
    record RideRequest(String rider, String pickup, String drop, VehicleType vehicle, String promoCode) {
        static Builder builder() { return new Builder(); }

        static final class Builder {
            private String rider, pickup, drop, promoCode;
            private VehicleType vehicle = VehicleType.MINI;              // a sensible default
            Builder rider(String r) { rider = r; return this; }
            Builder from(String p) { pickup = p; return this; }
            Builder to(String d) { drop = d; return this; }
            Builder vehicle(VehicleType v) { vehicle = v; return this; }
            Builder promo(String code) { promoCode = code; return this; }
            RideRequest build() {
                if (rider == null || pickup == null || drop == null)
                    throw new IllegalStateException("rider, pickup and drop are required");
                return new RideRequest(rider, pickup, drop, vehicle, promoCode);
            }
        }
    }

    // 8. Entity: identity equality, state changes only through methods that check the rules
    enum RideStatus { ASSIGNED, COMPLETED, PAID }

    static final class Ride {
        private final long id;
        private final RideRequest request;
        private final String driver;
        private RideStatus status = RideStatus.ASSIGNED;
        private Money fare;
        private Receipt receipt;

        Ride(long id, RideRequest request, String driver) { this.id = id; this.request = request; this.driver = driver; }

        void complete(Money fare) { require(RideStatus.ASSIGNED); this.fare = fare; status = RideStatus.COMPLETED; }

        void markPaid(Receipt r) {
            if (status == RideStatus.PAID && r.equals(receipt)) return;     // the same payment, reported twice
            require(RideStatus.COMPLETED);
            receipt = r;
            status = RideStatus.PAID;
        }

        private void require(RideStatus expected) {
            if (status != expected) throw new IllegalStateException("ride " + id + " is " + status + ", expected " + expected);
        }

        @Override public String toString() { return "ride " + id + " " + status + ", " + request.rider() + " with " + driver; }
    }

    // 9. A service that depends on interfaces, all passed in through the constructor
    static final class RideService {
        private final Map<VehicleType, FarePolicy> policies;
        private final PaymentGateway cards, upi;
        private final WalletLedger wallets;
        private final Map<Long, Ride> rides = new HashMap<>();         // production: a repository
        private long nextId = 1;

        RideService(Map<VehicleType, FarePolicy> policies, PaymentGateway cards, PaymentGateway upi, WalletLedger wallets) {
            if (!policies.keySet().containsAll(EnumSet.allOf(VehicleType.class)))
                throw new IllegalArgumentException("no fare policy for " + EnumSet.complementOf(EnumSet.copyOf(policies.keySet())));
            this.policies = new EnumMap<>(policies);
            this.cards = cards;
            this.upi = upi;
            this.wallets = wallets;
        }

        Money quote(VehicleType type, int km) { return Rounding.toNearestRupee(policies.get(type).quote(km)); }

        Ride book(RideRequest request, String driver) {
            Ride ride = new Ride(nextId++, request, driver);
            rides.put(ride.id, ride);
            return ride;
        }

        Money complete(long rideId, int km) {
            Ride ride = rides.get(rideId);
            ride.complete(quote(ride.request.vehicle(), km));
            return ride.fare;
        }

        Receipt pay(long rideId, PaymentMethod method) {
            Ride ride = rides.get(rideId);
            String key = "ride-" + rideId;
            Receipt receipt = switch (method) {
                case Card c   -> cards.charge(key, ride.fare, c.last4());
                case Upi u    -> upi.charge(key, ride.fare, u.vpa());
                case Wallet w -> wallets.debit(w.walletId(), key, ride.fare);
            };
            ride.markPaid(receipt);
            return receipt;
        }
    }

    public static void main(String[] args) {
        Map<VehicleType, FarePolicy> policies = new EnumMap<>(VehicleType.class);
        policies.put(VehicleType.AUTO, new PerKm(Money.inr(2_500), Money.inr(1_100)));
        policies.put(VehicleType.MINI, new PerKm(Money.inr(4_000), Money.inr(1_345)));
        policies.put(VehicleType.SEDAN, new WithMinimum(new PerKm(Money.inr(6_000), Money.inr(1_800)), Money.inr(15_000)));
        UpiSwitchGateway upi = new UpiSwitchGateway();
        RideService service = new RideService(policies, new CardNetworkGateway(), upi, new WalletLedger());

        Map<VehicleType, Money> quotes = new EnumMap<>(VehicleType.class);
        for (VehicleType type : VehicleType.values()) quotes.put(type, service.quote(type, 12));
        System.out.println("quotes, 12 km : " + quotes);

        Ride ride = service.book(RideRequest.builder().rider("Asha").from("Salt Lake").to("Park Street").build(), "Ravi");
        System.out.println("booked        : " + ride);
        System.out.println("completed     : 14 km, " + service.complete(ride.id, 14));
        Receipt receipt = service.pay(ride.id, new Upi("asha@okbank"));
        System.out.println("paid          : " + receipt);
        Receipt retried = service.pay(ride.id, new Upi("asha@okbank"));      // the app retries
        System.out.println("paid again    : same receipt " + (retried == receipt) + ", UPI calls " + upi.calls);

        Ride sedan = service.book(RideRequest.builder().rider("Imran").from("Howrah").to("Esplanade")
                .vehicle(VehicleType.SEDAN).build(), "Meera");
        System.out.println("completed     : 3 km, " + service.complete(sedan.id, 3) + " (sedan minimum)");
        System.out.println("paid          : " + service.pay(sedan.id, new Wallet(9001)));

        try { service.complete(ride.id, 5); }
        catch (IllegalStateException e) { System.out.println("rejected      : " + e.getMessage()); }
        try { Money.inr(-100); }
        catch (IllegalArgumentException e) { System.out.println("rejected      : " + e.getMessage()); }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac PricingAndPayments.java && java PricingAndPayments`,
        },
        {
          type: "output",
          text: `quotes, 12 km : {AUTO=INR 157.00, MINI=INR 201.00, SEDAN=INR 276.00}
booked        : ride 1 ASSIGNED, Asha with Ravi
completed     : 14 km, INR 228.00
  [upi] attempt 1 failed: timeout
paid          : Receipt[id=UPI-ride-1, amount=INR 228.00, attempts=2]
paid again    : same receipt true, UPI calls 2
completed     : 3 km, INR 150.00 (sedan minimum)
paid          : Receipt[id=WALLET-ride-2, amount=INR 150.00, attempts=1]
rejected      : ride 1 is PAID, expected ASSIGNED
rejected      : negative amount: -100`,
        },
        {
          type: "list",
          items: [
            "Three strategies from one map produced the quotes. MINI at 12 km is 40 + 12 × 13.45 = 201.40, rounded to the nearest rupee by the static utility: INR 201.00. The 14 km trip came to 228.30 and was charged 228.00. The sedan's `WithMinimum` turned a 114-rupee, 3 km trip into the 150-rupee minimum.",
            "The UPI provider timed out once. The template method in `AbstractPaymentGateway` retried, and the receipt records `attempts=2`; `UpiSwitchGateway` contains no retry code at all.",
            "The app's retry got the same receipt object back, with no third provider call (`UPI calls 2`). Idempotency lives in the `final` `charge()`, so no provider can forget it.",
            "`Ride` refused to complete a paid ride, and `Money` refused a negative amount. Each rule lives inside the type that owns it, so no caller can skip it.",
            "`RideService` never names `UpiSwitchGateway`, `PerKm` or any provider class. Swapping one is a change to the wiring in `main`, which in a Spring app is the container's job. If `RideService` became a `@Service` with `@Transactional`, it would have to drop `final` for the CGLIB proxy, as the Spring run showed.",
          ],
        },
        {
          type: "heading",
          text: "What if the requirements change?",
        },
        {
          type: "paragraph",
          text: "The real test of a design is where the next change lands. I made each of these changes to the program and ran it again.",
        },
        {
          type: "paragraph",
          text: "**A new vehicle type, BIKE.** One enum constant and one line of wiring, `policies.put(VehicleType.BIKE, km -> Money.inr(1_500 + 700L * km));`, which can be a lambda because `FarePolicy` has one method. When I added only the constant and forgot the policy, the check in `RideService`'s constructor failed at startup, not at the first bike booking:",
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.IllegalArgumentException: no fare policy for [BIKE]
\tat PricingAndPayments$RideService.<init>(PricingAndPayments.java:167)
\tat PricingAndPayments.main(PricingAndPayments.java:207)`,
        },
        {
          type: "paragraph",
          text: "**A new payment method, Cash.** I added `Cash` to the `permits` clause and a record under `Wallet`, and changed nothing else:",
        },
        {
          type: "code",
          language: "java",
          code: `sealed interface PaymentMethod permits Card, Upi, Wallet, Cash {}
record Card(String last4) implements PaymentMethod {}
record Upi(String vpa) implements PaymentMethod {}
record Wallet(long walletId) implements PaymentMethod {}
record Cash() implements PaymentMethod {}`,
        },
        {
          type: "output",
          text: `PricingAndPayments.java:192: error: the switch expression does not cover all possible input values
            Receipt receipt = switch (method) {
                              ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The compiler found the one switch that routes payments. The fix is one case, `case Cash c -> new Receipt(\"CASH-\" + key, ride.fare, 1);`, and every other switch over `PaymentMethod` in a codebase would fail the same way until it's handled. With a `default` branch, as in Common Mistakes, this would have compiled and charged cash rides to a card.",
        },
        {
          type: "paragraph",
          text: "**A new UPI provider.** One subclass, and one changed argument where the service is wired:",
        },
        {
          type: "code",
          language: "java",
          code: `static final class BackupUpiGateway extends AbstractPaymentGateway {
    BackupUpiGateway() { super("upi-backup", 3); }
    protected String callProvider(String key, Money amount, String vpa) { return "UPI2-" + key; }
}

// in main, the only other line that changes
RideService service = new RideService(policies, new CardNetworkGateway(), new BackupUpiGateway(), new WalletLedger());`,
        },
        {
          type: "list",
          items: [
            "Each change touched exactly one place, plus wiring. `RideService`, `AbstractPaymentGateway` and the other providers didn't change, and the backup provider got idempotency and retries without writing any; its receipt came back as `UPI2-ride-1` with `attempts=1`.",
            "Where the compiler could help, it did: the sealed switch. Where it couldn't, a map lookup, the design fails at startup instead of in a rider's trip.",
            "The compiler only protects code that gets recompiled. I compiled a small `Router` with a two-case switch over a sealed type, then recompiled only the sealed interface with a third subtype. Running the old `Router` with the new subtype threw `java.lang.MatchException` from the synthetic default `javac` had added. In a multi-module build, every module that switches over the type must be rebuilt.",
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
              question: "What's the difference between an interface and an abstract class, and when do you use each?",
              answer:
                "An interface defines a contract, what a type can do; an abstract class shares state and code across one family. I use an interface when callers should depend on a capability that has several, possibly unrelated, implementations, and an abstract class when those implementations share fields or a fixed sequence of steps. Often both: the interface for callers and the abstract class as an optional skeleton, like `List` and `AbstractList`.\n\nSince Java 8 interfaces can have `default` and `static` methods, so \"bodies or no bodies\" is no longer the difference; state and single inheritance are. In my `GatewayThreeWays` run, an interface-only provider forgot the idempotency check and debited 50,000 paise for a 25,000-paise order, while the abstract skeleton's `final charge()` made that impossible.",
            },
            {
              question: "What do is-a and has-a mean, and how do they map to Java code?",
              answer:
                "Is-a is inheritance, `class B extends A`, for when every B can be used wherever an A is expected. Has-a is a field: B holds a reference to an A, which is composition, aggregation or association depending on who owns the A.\n\nThe test I use for is-a is substitutability, not how the sentence sounds. In my `NoBaseService` example, \"a payment service is an entity service\" sounded fine, but `PaymentService` inherited `deleteById`, and a generic job deleted payment 7 through it. Holding the storage in a field instead turned the same call into a compile error.",
            },
            {
              question: "What is a record, and when would you use one?",
              answer:
                "A record is a transparent carrier for immutable data. `record Money(long paise, String currency)` gets private final fields, a canonical constructor, accessors, and `equals`, `hashCode` and `toString` based on all components. I use records for values, things defined entirely by their data: money, coordinates, requests, receipts.\n\nNot for entities. In my `EntityAsRecord` run, an `Order` record's \"status change\" created a new value, and a set of open orders ended up with two orders with id 42. Records also can't make their canonical constructor private, so a type that must force callers through a factory needs a final class.",
            },
            {
              question: "When should a method be static?",
              answer:
                "When it's a pure function of its arguments: no instance state, no I/O, nothing a test would want to replace. `Rounding.toNearestRupee(Money)` and `isHappyHour(int hour)` are good examples.\n\nThe warning sign is a static method that reads the clock, a file, the network or a static mutable field. My `staticDiscountPercent()` read `LocalTime.now()`, printed `0% off` at midnight and would print `20% off` at 17:30, so no test could pin it down. The fix was an instance class, `HappyHourDiscount`, with a `Clock` passed into its constructor, and `Clock.fixed` in tests.",
            },
            {
              question: "When would you use an enum?",
              answer:
                "For a fixed, known set of named constants that all have the same shape, like `OrderStatus` or `ShippingSpeed`. Each constant is one shared object, it can carry fields and methods, and it works with `EnumMap`, `EnumSet` and exhaustive switches.\n\nIn my `EnumOrSealed` example, `OrderStatus.canMoveTo` keeps the transition rules inside the enum, and it rejected `DELIVERED -> CANCELLED`. When the variants need different data, as the order events did, I use a sealed interface of records instead.",
            },
            {
              question: "What does \"program to an interface, not an implementation\" mean?",
              answer:
                "That code should depend on the contract it needs rather than a concrete class: declare `List<Order>`, not `ArrayList<Order>`, and have a service hold a `PaymentGateway`, not a specific provider. It comes from the 1994 Design Patterns book.\n\nThe payoff is that implementations can change without touching callers: in the production section's ride-hailing design, adding a backup UPI provider changed one argument in `main` and nothing in `RideService`. It doesn't mean every class needs its own interface, only that dependencies which may vary should be typed by a contract.",
            },
            {
              question: "Why start with `private` for fields and methods?",
              answer:
                "Because widening access later is a compatible change and narrowing it later breaks every caller. Starting narrow keeps my options open, and private state is what lets a class protect its invariants.\n\nIn the production section, `Ride` keeps `status`, `fare` and `receipt` private, so the only way to change them is through `complete` and `markPaid`, which check the current state. That's why completing a paid ride failed with `ride 1 is PAID, expected ASSIGNED` instead of quietly corrupting the ride.",
            },
            {
              question: "What does \"favour composition over inheritance\" mean?",
              answer:
                "Reuse behaviour by holding an object in a field and delegating to it, instead of extending its class. Composition depends only on the other object's public contract; inheritance also depends on its implementation details and hands every public method on to the subclass.\n\nIn the production section, the sedan's minimum fare is `WithMinimum`, a record that wraps any `FarePolicy`, instead of a `SedanFare extends PerKm`. It works with every policy, present and future, and `PerKm` didn't change. Inheritance is still right for a real is-a with designed hooks, like the providers extending `AbstractPaymentGateway`.",
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
              question: "What's the difference between association, aggregation and composition?",
              answer:
                "All three are has-a relationships held in fields, and they differ in ownership. Association: an object knows another it doesn't own, like an `Order` and its `Customer`. Aggregation: a whole-part relationship where the part exists on its own and can be shared, like a `Department` and its `Employee`s. Composition: the whole creates the part, keeps it private and ends its life, like an `Order` and its `OrderItem`s.\n\nIn code they can look identical, so I look at who creates the object and who else holds it. The Association, Aggregation and Composition lesson has the lifecycle and heap demos; in my decision flow the deciding question is \"does B create A, keep it private and decide when it dies?\"",
            },
            {
              question: "When would you use a builder, a constructor or a static factory?",
              answer:
                "A constructor for a few required parameters with one obvious meaning. A static factory when creation needs a name, can return a cached instance or a subtype, or has to normalise input. A builder when there are many parameters, several of them optional, and call sites should read like named arguments.\n\nI hit the naming problem directly: `Price(long paise)` next to `Price(long rupees)` doesn't compile, \"constructor Price(long) is already defined\". As factories, `Money.ofPaise` and `Money.ofRupees` read clearly, and `ofPaise(0)` returned the same cached object every time. The production section's `RideRequest` has a static nested builder because it has required and optional parts.",
            },
            {
              question: "When should you override equals and hashCode, and when should you keep identity?",
              answer:
                "Override them for values, where two objects with the same data are interchangeable; keep `Object`'s identity equality for entities, where two objects with the same data are still different things. A record gives value equality automatically. For an entity, the only common alternative is equality on an immutable id assigned at creation.\n\nThe failure mode is equality over mutable state. In my `EntityAsRecord` run, an order record that changed status became a different value, and a set of open orders held two orders with id 42. The Object Class Methods lesson shows the classic `HashSet` version, where the changed object can't even be found any more.",
            },
            {
              question: "Enum or sealed interface: how do you choose?",
              answer:
                "An enum when the set of constants is fixed and every constant has the same shape: the same fields and methods. A sealed interface with records when the set of variants is closed but each one carries different data.\n\nIn `EnumOrSealed`, `OrderStatus` is an enum with its transition rules inside, while the `OrderEvent` records carry a payment method and an amount, a carrier and a tracking id, or who cancelled and why. Forcing the events into an enum would need nullable fields, the tagged-class problem my `TaggedVsSealed` run showed: net banking labelled `unknown method`, and an NPE at payment time.",
            },
            {
              question: "When is mutability acceptable?",
              answer:
                "For entities with a real lifecycle, as long as changes go through methods that enforce the rules; for JPA entities, which the provider instantiates and fills; for builders and accumulators confined to one method or thread; and for hot paths where a measurement shows that allocation matters.\n\nIn the production section, `Ride` is mutable, but only through `complete` and `markPaid`, which check the current status. Values like `Money` and `Receipt` are records, so they can be cached, shared between threads and used as map keys without defensive copies.",
            },
            {
              question: "Since Java 8 interfaces can have default methods. Is the abstract class obsolete?",
              answer:
                "No. Default methods give interfaces behaviour, not state: no instance fields, no constructors, no `final` methods and no `protected` hooks. Anything that needs those, such as a shared idempotency map or a template method subclasses can't override, still needs an abstract class.\n\nWhat changed is the starting point. I begin with an interface and add an abstract skeleton under it only when implementations share state or a fixed sequence. `AbstractPaymentGateway` is that case: its `done` map and `maxAttempts` are fields, and `charge()` is `final`.",
            },
            {
              question: "What is the template method pattern, and why should the template method be final?",
              answer:
                "A base-class method fixes the sequence of steps and calls hooks for the parts that vary. `AbstractPaymentGateway.charge()` checks idempotency, calls `callProvider` and retries transient failures, and each provider writes only `callProvider`.\n\nIt should be `final` because the sequence is the point. When I tried to override `charge` in a subclass, `javac` refused with \"overridden method is final\". Without `final`, a subclass could replace the whole method and skip the idempotency check, which is exactly the double charge the interface-only version produced.",
            },
            {
              question: "When do you use a map of strategies instead of polymorphism or a switch?",
              answer:
                "When the choice is driven by data rather than by an object's type: per shipping speed, per country, per experiment flag. The map is built and validated at startup, and the code that uses it just looks up and calls.\n\nIn the production design, an `EnumMap<VehicleType, FarePolicy>` picks the policy, and the policies themselves are polymorphic. Adding BIKE was one enum constant and one `policies.put`. When I forgot the `put`, the constructor check failed at startup with `no fare policy for [BIKE]` rather than at the first bike booking.",
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
              question: "When do you use sealed types and pattern matching instead of polymorphism?",
              answer:
                "When the set of variants is closed and the operations live outside the types. Polymorphism is open for new types and closed for new operations; a sealed hierarchy with exhaustive switches is the reverse. That's the expression problem, and the choice depends on which direction is more likely to change.\n\nIn the production section, payment methods are fixed by the business and many operations switch on them (routing, receipts, refunds), so `PaymentMethod` is sealed. When I added `Cash`, `javac` reported \"the switch expression does not cover all possible input values\" at the routing switch. Fare policies keep multiplying and each one knows how to quote, so they're polymorphic.",
            },
            {
              question: "Why is the IFoo/FooImpl pattern often ceremony, and when isn't it?",
              answer:
                "An interface with one implementation, used only by my own code, decouples nothing: a change to the method still changes both files. The usual reasons have expired, too: Mockito mocks classes, and Spring proxies classes with CGLIB, which Spring Boot uses by default.\n\nI checked the proxy part with Spring 6.2.11: a class with no interface got a `$$SpringCGLIB$$0` proxy and the interceptor ran. The interface-plus-`Impl` pair even set a trap: its JDK proxy wasn't an `Impl`, and injecting the `Impl` type failed with `BeanNotOfRequiredTypeException`. It isn't ceremony for ports to outside systems, published APIs, framework-required interfaces like Spring Data repositories, or breaking a dependency cycle.",
            },
            {
              question: "How does SOLID map onto these design choices?",
              answer:
                "Single responsibility decides how to split classes; open-closed is served by polymorphism and maps of strategies; Liskov substitution is the test for inheritance; interface segregation favours small, often one-method, interfaces; dependency inversion is interfaces owned by the domain plus constructor injection.\n\nIn the production design: `RideService` orchestrates while fares, payment rules and rounding live elsewhere; a new vehicle type is a new map entry; providers are substitutable for `AbstractPaymentGateway`; `FarePolicy` has one method, so a lambda fits; and `RideService` receives its policies and gateways through its constructor.",
            },
            {
              question: "Is a single-implementation interface over-engineering?",
              answer:
                "It depends on what's behind it. If it's a port to something outside my process, like a payment provider or an SMS vendor, no: tests need a fake, and a second vendor is a real possibility. If it's my own domain logic with one caller, usually yes.\n\nIn the production design, `PaymentGateway` was an interface from day one, even with one provider, because tests must never charge a real card, while `WalletLedger` stayed a plain class: our own code, one implementation. The rule of three helps too: I extract an abstraction when I see the third variation, not when I imagine the second.",
            },
            {
              question: "Does choosing an interface over a class cost performance?",
              answer:
                "Not in a way that should drive the design. An interface-typed call compiles to `invokeinterface` and a class-typed call to `invokevirtual`, and the interpreter does slightly more work for the first. Once the call site is hot and sees one receiver class, the JIT inlines both the same way.\n\nI checked with `-XX:+PrintInlining`: an interface-typed and a class-typed call in the same loop both showed `inline (hot)` under C2. Call sites that see many receiver classes stay real dispatches, but that's a consequence of having many implementations in play, not of the interface keyword.",
            },
            {
              question: "What is the Liskov Substitution Principle in practice, and how do you spot a violation?",
              answer:
                "Code written against a supertype must keep working, without surprises, when it's given any subtype. It's about behaviour, not signatures: a subtype can't demand more from callers or promise less than its supertype does.\n\nThe smell I look for is an override that throws `UnsupportedOperationException` or silently does nothing. In my `NoBaseService` run, `GuardedPaymentService` overrode `deleteById` to throw, so the generic job failed at run time with \"payments are never deleted\". The fix wasn't a better override; it was dropping the inheritance.",
            },
            {
              question: "Why does Effective Java say \"design and document for inheritance or else prohibit it\"?",
              answer:
                "Because a subclass depends on its parent's implementation details, such as which methods call which, and those details change. A class not designed for extension makes no promises about them, so any change can break a subclass: the fragile base class problem. Prohibiting means `final`, or `sealed` with a fixed list of subclasses.\n\nIn my designs the classes meant for extension are explicit skeletons like `AbstractPaymentGateway`, with a `final` template method and one `protected abstract` hook, and everything else is `final`. The exception I ran into is Spring beans that get CGLIB proxies: making `OrderService` final in my Spring run made `ProxyFactory` throw `AopConfigException`.",
            },
            {
              question: "Is a record heavier at run time than a hand-written class?",
              answer:
                "No. A record is a final class with final fields, so its instances have the same layout as the equivalent hand-written class. Its `equals`, `hashCode` and `toString` are generated code, linked through `invokedynamic`, not data in each object.\n\nI measured `record MoneyRecord(long paise, String currency)` and an equivalent final class with the per-thread allocation counter: both were 24 bytes on JDK 21, and both stayed 24 on JDK 25 with compact object headers. The choice is about meaning and value equality, not size.",
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
              question: "Design a notification system that sends SMS, email and push notifications.",
              answer:
                "I'd make `Channel` an interface with one implementation per vendor, because channels share no state and each talks to a different outside system, which also makes each one a port tests can fake. A `Notifier` composes them: a map from message topic to an ordered list of channels, trying each until one succeeds. Customer contact details are a record.\n\nI built that in the Examples: Asha got a push, Ravi had no push token so push returned `false` and SMS took over, and the receipt went by email only. Adding a channel is one class plus one route entry. If the vendor adapters later share retry logic, an abstract skeleton goes under the interface.",
            },
            {
              question: "Design payment providers that share retry and idempotency logic.",
              answer:
                "A `PaymentGateway` interface for callers and an `AbstractPaymentGateway` skeleton with a `final` `charge()` template method that does the idempotency check and the retries, calling one `protected abstract callProvider` hook per provider. Payment methods are a sealed interface, routed by an exhaustive switch.\n\nIn the production run, the UPI provider timed out once, the skeleton retried, and the receipt said `attempts=2`; the app's retry got the same receipt with no third provider call. In `GatewayThreeWays`, the interface-only version without a skeleton debited the same order twice. In a real system the idempotency map becomes a unique key in the database.",
            },
            {
              question: "Design the discount, tax and shipping rules for a shop's checkout.",
              answer:
                "One functional interface, `PricingRule`, each rule a record holding its configuration, and the pricing pipeline an ordered list of rules. The order is a business decision, so it lives in one visible list, and one-off rules can be lambdas.\n\nIn my `PricingRules` run, the same tax, coupon and shipping rules gave INR 959.82 with tax first and INR 932.82 with the coupon first. A gift wrap charge was one lambda added to the list, and `price` never changed. For real I'd load the list from configuration and validate it at startup.",
            },
            {
              question: "You inherit a 2,000-line God service class. How do you refactor it?",
              answer:
                "Split it by reason to change, behind a safety net. First characterisation tests around its public methods. Then extract pure calculations into small static functions or value types, varying behaviour into strategies, outside systems into ports with adapters, and state rules into the entities they belong to, leaving a thin orchestrating service that receives its collaborators through its constructor.\n\nThe production design is the shape I'd aim for: `RideService` only orchestrates, fare rules are `FarePolicy` strategies, providers sit behind `PaymentGateway`, rounding is a pure static function, and a ride's state rules live in `Ride`. I'd move one responsibility per change and keep the tests green after each step.",
            },
            {
              question: "A teammate proposes a BaseEntityServiceImpl<T> that every service must extend. What do you say?",
              answer:
                "I'd push back: it's inheritance for code reuse. Every service inherits every public method of the base, including operations its domain forbids, and every service is coupled to one class that breaks them all when it changes. Generic CRUD belongs in a repository that each service holds in a field, next to domain methods that say what's actually allowed.\n\nI ran the proposal in `NoBaseService`: a generic admin job deleted payment 7 through the inherited `deleteById`. Overriding it to throw only moved the failure to run time. With composition, `PaymentLedger` had no delete at all, and passing it to the job was a compile error: \"PaymentLedger cannot be converted to BaseEntityService<?>\".",
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
            "In `GatewayThreeWays.java`, add a method to `HastyOnBase` that overrides `charge`, adds to `debited` and calls `callProvider` directly. Compile it and read the error.",
            "In the production section's `PricingAndPayments.java`, add `Cash` to the `permits` clause and `record Cash() implements PaymentMethod {}`, and compile. Then add `case Cash c -> new Receipt(\"CASH-\" + key, ride.fare, 1);` to the switch in `pay`, and pay the sedan ride with `new Cash()` instead of the wallet.",
            "In `PricingAndPayments.java` again, add `BIKE` to `VehicleType`, and in `main` add `policies.put(VehicleType.BIKE, km -> Money.inr(1_500 + 700L * km));` before the service is created. Run it and look at the quotes line.",
            "In `HappyHour.java`, add two more fixed clocks at `2026-11-12T10:30:00Z` and `2026-11-12T13:30:00Z` and print their discounts. Work out the IST times before running it.",
            "In `ProxyWithoutInterface.java`, make `OrderService` `final` and run it again with Spring on the classpath.",
            "In `EnumOrSealed.java`, change the four patterns in `statusAfter` to `case Paid _ ->`, `case Shipped _ ->` and so on. Compile with JDK 21, then with JDK 22 or later.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 fails with `charge(Charge) in HastyOnBase cannot override charge(Charge) in GatewayBase` and `overridden method is final`. Step 2 first fails with `the switch expression does not cover all possible input values` at the `switch (method)` line; after the new case, the last payment line prints `Receipt[id=CASH-ride-2, amount=INR 150.00, attempts=1]`. Step 3 ends the quotes with `BIKE=INR 99.00` (15 + 12 × 7). Step 4 prints a discount of `20` for 16:00 IST and `0` for 19:00 IST, because `isHappyHour` includes the start hour and excludes the end hour. Step 5 throws `AopConfigException: Could not generate CGLIB subclass of class ProxyWithoutInterface$OrderService` before anything else is printed. Step 6 fails on JDK 21 with `unnamed variables are a preview feature and are disabled by default`; on JDK 25 it compiles and prints the same four lines as before.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `INTERFACE      what it can do; several, unrelated implementations;
               a lambda fits if it has one abstract method
ABSTRACT CLASS shared state + final template method, under an
               interface (List + AbstractList)
CONCRETE CLASS one implementation, nothing outside: stop here
RECORD         values, equal by data; validate in compact ctor
ENUM           fixed constants, all the same shape
SEALED+RECORDS closed variants, different data; switch, no default
CLASS (entity) identity + lifecycle; state changes via methods

EXTENDS        true is-a AND designed for it; otherwise final
FIELD          reuse = composition; ownership decides between
               composition / aggregation / association
STATIC         pure functions and constants; deps -> injection
CREATE         ctor (few, required) | factory (name, cache)
               | builder (many, optional)
VARY           by type -> override | closed set -> sealed switch
               | data -> map of strategies | two cases -> if
DEFAULTS       immutable, private, final, concrete
DON'T          IFoo/FooImpl without a port; Base<T> for reuse
COST           interface call == class call once inlined;
               record == class (24 B for long + String)`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Interface or abstract class: an interface for the contract callers use, an abstract skeleton under it only for shared state or a fixed sequence, and a concrete class when there's nothing to choose between yet.",
            "Most other decisions follow from naming what the thing is (entity, value, constant set, closed variants or behaviour) and from asking what will grow, types or operations.",
            "Almost every guide ended with \"start `private`, widen deliberately\", and that's the next phase: Packages and Access Modifiers (Phase 6) covers the access levels, packages and modules that decide who gets to see each of these types.",
          ],
        },
      ],
    },
  ],
};
