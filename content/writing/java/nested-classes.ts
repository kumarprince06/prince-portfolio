import type { Lesson } from "../types";

export const nestedClasses: Lesson = {
  slug: "nested-classes",
  date: "2026-11-08",
  title: "Nested and Inner Classes",
  description:
    "The four kinds of nested classes in Java (static nested, inner, local and anonymous), what javac secretly adds to each one (this$0, val$ fields, nestmates), how anonymous classes differ from lambdas down to the hidden classes the JVM spins at run time, and how an inner-class listener leaks its whole outer object.",
  tags: ["Core Java", "OOP", "Inner Classes", "Anonymous Classes", "Lambdas"],
  sections: [
    {
      title: "What Nested Classes Are",
      blocks: [
        {
          type: "paragraph",
          text: "Every class in this phase so far has been top-level: declared directly in a source file. I've been cheating since the Methods lesson, though. `Phases` declared `static class AllThree` inside itself, and the Memory Allocation lesson measured a `record Point` declared inside `AllocSize`. Those are **nested classes**, and I used them without saying what they are or what they cost.",
        },
        {
          type: "paragraph",
          text: "A nested class is any class declared inside the body of another class or interface. Java has four kinds: **static nested** classes, **inner** classes (non-static members), **local** classes declared inside a method, and **anonymous** classes declared and instantiated in a single expression. They look like small syntax variations. They aren't. An inner class object carries a hidden reference to another object, a local class carries copies of local variables, and the JVM has no idea any of them were nested at all.",
        },
        {
          type: "paragraph",
          text: "The Object Class Methods lesson was about what every object inherits. This one adds something an object can carry that never appears in my source code. It sits under a lot of everyday backend code: builders like `Car.Builder`, request DTOs declared inside a controller, iterators, comparators, callbacks and listeners. It also sits under one of the classic Java memory leaks, a listener that keeps a whole window of data alive through a field nobody wrote.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Classes inside classes are older than Java. Simula 67, the language that introduced classes, inherited ALGOL 60's block structure, so a class could be declared inside another class or procedure and use the variables around it. C++ took nesting in a much narrower form: a C++ nested class is a scoping device with no hidden link to any object of the enclosing class, which is what Java calls a static nested class. Smalltalk went the other way, with blocks: small pieces of code that capture the variables around them. That's the ancestor of lambdas.",
        },
        {
          type: "paragraph",
          text: "Java 1.0, released in January 1996, had none of this. Every class was top-level. JDK 1.1 (February 1997) added nested and inner classes, described in a separate Inner Classes Specification. The pressure came from AWT 1.1's new event model: every button and text field needed listener objects, and writing a top-level class for each one was unbearable. Anonymous classes gave Java something close to closures without adding function types to the language.",
        },
        {
          type: "paragraph",
          text: "The design choice that shapes everything below: **the JVM didn't change**. `javac` compiles every nested class into an ordinary class file with a `$` in its name, adds hidden fields for the outer object and for captured values, and records the original nesting in a new `InnerClasses` class file attribute so reflection and other compilers can see it. Until Java 11 it even generated `access$000`-style bridge methods so nested classes could reach each other's private members, because to the JVM they were unrelated classes.",
        },
        {
          type: "table",
          headers: ["Version", "What changed for nested classes"],
          rows: [
            ["JDK 1.1 (1997)", "Static nested, inner, local and anonymous classes; `Outer.this`; `outer.new Inner()`; the `InnerClasses` attribute"],
            ["Java 5 (2004)", "`EnclosingMethod` attribute; `Class.isAnonymousClass()`, `isLocalClass()`, `isMemberClass()`, `getSimpleName()`, `getEnclosingMethod()`"],
            ["Java 8 (2014)", "Lambdas (JSR 335). Captured locals only need to be **effectively** final; before, they had to be declared `final`"],
            ["Java 9", "Diamond `<>` with anonymous classes (JEP 213)"],
            ["Java 11", "Nest-based access control (JEP 181): `NestHost` and `NestMembers` replace the `access$` bridge methods"],
            ["Java 15", "Hidden classes (JEP 371), which the JDK now uses for the classes behind lambdas"],
            ["Java 16", "Records (JEP 395): inner classes may declare static members; local records, enums and interfaces"],
            ["JDK 18", "`javac` stops storing the outer reference in inner classes that never use it (when compiling for release 18 or later)"],
            ["Java 25", "Flexible constructor bodies (JEP 513): statements before `super(...)`, but still no `new Inner()` there"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The picture I use is an airline flight and the paperwork around it.",
        },
        {
          type: "list",
          items: [
            "A **flight** (6E-201, Kolkata to Pune, on one particular day) is an outer object. The `Flight` class describes all flights; each instance is one actual flight.",
            "A **seat code** like 12A is a static nested class. The format belongs to flights, so it's filed under that name (`Flight.SeatCode`), but writing down 12A doesn't need any particular flight.",
            "A **boarding pass** is an inner class. It's printed for one specific flight, so there's no making one without a flight (`flight.new BoardingPass()`). The flight number and date are printed on it, which is the hidden `this$0` reference, and it gets its holder into places only that flight's passengers can go: the outer object's private members.",
            "A **delay notice** printed at the gate during one incident is a local class. It exists only inside that event (one method call) and carries a printed copy of the facts as they stood. Java insists those facts never change afterwards, so the printout can't go stale: that's the effectively-final rule.",
            "A **handwritten sign** taped up once, \"Gate changed to 14\", is an anonymous class: written on the spot, used once, never referred to by name.",
            "A **spoken announcement** is a lambda: one instruction, and no printed sheet left behind, the way a lambda leaves no class file.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a boarding pass doesn't stop the airline from retiring the plane. In Java it does. As long as an inner object is reachable, its outer object is reachable through `this$0`, along with everything the outer object holds. That's the leak in the production section. And an airline keeps a passenger list, but a Java outer object keeps no list of its inner objects. The reference only goes one way, from inner to outer. Nesting is about names and access, not containment: the boarding pass object isn't stored inside the flight object on the heap.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The four kinds",
        },
        {
          type: "table",
          headers: ["Kind", "Needs an outer instance?", "Uses outer instance members directly?", "Can declare static members?", "Typical use"],
          rows: [
            ["Static nested (`static class X` as a member)", "No", "No, only through an object reference", "Yes", "Builders, `Map.Entry`-style helpers, nodes, grouped DTOs"],
            ["Inner (`class X` as a member, no `static`)", "Yes, fixed when it's created", "Yes", "Since Java 16 (before: only constants)", "Iterators and views over the outer object's state"],
            ["Local (`class X` inside a block)", "Only when declared in an instance method or initializer", "Yes in an instance context, plus effectively final locals", "Since Java 16", "A helper one method needs more than once"],
            ["Anonymous (`new T(...) { ... }`)", "Only when created in an instance context", "Yes in an instance context, plus effectively final locals", "Since Java 16", "A one-off implementation with state, several methods or an abstract superclass"],
          ],
        },
        {
          type: "paragraph",
          text: "The JLS vocabulary is precise. A **nested** class is any class declared inside another one. An **inner** class is a nested class that is not explicitly or implicitly static (JLS 8.1.3). So member inner classes, local classes and anonymous classes are all inner classes, and \"static inner class\" is technically a contradiction, even though everyone says it.",
        },
        {
          type: "callout",
          tone: "note",
          title: "Implicitly static",
          text: "A nested **record**, **enum** or **interface** is always static, with or without the keyword, and so is any class declared inside an interface. Since Java 16 the same goes for local records, enums and interfaces. That's why the `record Point` in the Memory Allocation lesson never needed `static`: a record can't capture an outer object.",
        },
        {
          type: "heading",
          text: "Access rules",
        },
        {
          type: "list",
          items: [
            "Private access goes both ways inside a top-level class. The outer class can use a nested class's private members, and every nested class can use the outer class's private members, at any depth (JLS 6.6.1 allows private access anywhere inside the top-level class that encloses the declaration).",
            "A static nested class uses the outer class's **static** members directly, but its instance members only through an object reference, like any other class would.",
            "Inside an inner class, an outer field `x` really means `Outer.this.x`. The compiler inserts the `Outer.this` when the name isn't shadowed, and I write it myself when it is.",
            "Member classes can be `private`, `protected`, `public` or package-private, and can be `static`. A top-level class can only be `public` or package-private and can never be `static`. Local and anonymous classes take no access modifier at all.",
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "One class file per class, nested or not",
        },
        {
          type: "paragraph",
          text: "To see what `javac` really produces, I put one of each kind into a single class, plus a lambda for comparison:",
        },
        {
          type: "code",
          language: "java",
          title: "Store.java",
          code: `public class Store {
    private int sold = 0;

    static class Address {                                // static nested
        String city = "Kolkata";
    }

    class Cashier {                                       // inner (member)
        void sell() { sold++; }
    }

    void run(int maxItems) {
        class Limit {                                     // local
            boolean allowed(int count) { return count < maxItems; }
        }
        Runnable audit = new Runnable() {                 // anonymous
            @Override
            public void run() { System.out.println("sold = " + sold); }
        };
        Runnable hello = () -> System.out.println("lambda");   // no class file

        new Cashier().sell();
        System.out.println(new Limit().allowed(2));
        audit.run();
        hello.run();
        System.out.println(new Address().city);
    }

    public static void main(String[] args) {
        new Store().run(3);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Store.java && ls *.class && java Store",
        },
        {
          type: "output",
          text: `Store$1.class
Store$1Limit.class
Store$Address.class
Store$Cashier.class
Store.class
true
sold = 1
lambda
Kolkata`,
        },
        {
          type: "list",
          items: [
            "Five class files from one source file. Member classes are named `Outer$Name`. A local class gets `Outer$`, a number and its name (`Store$1Limit`), because two methods could each declare a local class called `Limit`. An anonymous class gets just a number, in order of appearance: `Store$1`.",
            "The lambda has no class file at all. I come back to where it went at the end of this section. Deeper nesting just adds more `$`: an `Item` inside `Order` inside `NullOuter` compiled to `NullOuter$Order$Item.class` when I tried it.",
          ],
        },
        {
          type: "heading",
          text: "The hidden fields",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p 'Store$Address' 'Store$Cashier' 'Store$1Limit' 'Store$1'   # \"Compiled from\" lines dropped",
        },
        {
          type: "output",
          text: `class Store$Address {
  java.lang.String city;
  Store$Address();
}
class Store$Cashier {
  final Store this$0;
  Store$Cashier(Store);
  void sell();
}
class Store$1Limit {
  final int val$maxItems;
  Store$1Limit();
  boolean allowed(int);
}
class Store$1 implements java.lang.Runnable {
  final Store this$0;
  Store$1(Store);
  public void run();
}`,
        },
        {
          type: "list",
          items: [
            "`Store$Address`, the static nested class, is an ordinary class. Nothing in it points at `Store`.",
            "`Store$Cashier`, the inner class, has a field I never wrote, `final Store this$0`, and its no-argument constructor became `Store$Cashier(Store)`. That's the outer instance, passed in and stored. `sold++` inside it compiles to `this$0.sold++`.",
            "`Store$1Limit`, the local class, has `final int val$maxItems`: a copy of the `maxItems` parameter it uses. Its constructor looks empty here, but it isn't; the real one is below.",
            "`Store$1`, the anonymous `Runnable`, has its own `this$0`, because its `run()` reads `sold`.",
          ],
        },
        {
          type: "heading",
          text: "The constructors javac writes",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -v 'Store$Cashier'      # trimmed
javap -p -v 'Store$1Limit'       # trimmed`,
        },
        {
          type: "output",
          text: `  final Store this$0;
    flags: (0x1010) ACC_FINAL, ACC_SYNTHETIC

  Store$Cashier(Store);
    descriptor: (LStore;)V
    Code:
         0: aload_0
         1: aload_1
         2: putfield      #1                  // Field this$0:LStore;
         5: aload_0
         6: invokespecial #7                  // Method java/lang/Object."<init>":()V
         9: return
---
  Store$1Limit();
    descriptor: (LStore;I)V
    MethodParameters:
      Name                           Flags
      <no name>                      final mandated
      <no name>                      final synthetic
    Signature: #12                          // ()V
EnclosingMethod: #24.#26                // Store.run`,
        },
        {
          type: "list",
          items: [
            "`this$0` is flagged `ACC_SYNTHETIC`: made up by the compiler, with no counterpart in the source.",
            "The constructor stores `this$0` **before** calling `Object.<init>`. Java source couldn't do that before Java 25 (the Constructors lesson covers flexible constructor bodies), but the JVM has always allowed a constructor to assign its own class's fields before the super call. `javac` relies on that, so the outer reference is already set if a superclass constructor calls an overridden method.",
            "The local class's real descriptor is `(LStore;I)V`: the outer instance plus the captured `int`. `MethodParameters` marks the first one **mandated** (the language requires an outer instance) and the second **synthetic** (an implementation detail). `javap -p` printed `Store$1Limit()` because `javac` also writes a `Signature` attribute holding the source-level shape, `()V`.",
            "`Limit` receives the `Store` object but never stores it. There's no `this$0` field in its listing. It doesn't use the outer object, and `javac` noticed. That's newer behaviour, and it gets its own heading below.",
            "`EnclosingMethod` records that `Limit` was declared in `Store.run`. That's where `getEnclosingMethod()` gets its answer.",
          ],
        },
        {
          type: "heading",
          text: "Where the nesting is recorded",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -v Store      # the attributes at the end, one long descriptor shortened",
        },
        {
          type: "output",
          text: `NestMembers:
  Store$Cashier
  Store$Address
  Store$1
  Store$1Limit
BootstrapMethods:
  0: #82 REF_invokeStatic java/lang/invoke/LambdaMetafactory.metafactory:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #78 ()V
      #79 REF_invokeStatic Store.lambda$run$0:()V
      #78 ()V
InnerClasses:
  #13;                                    // class Store$1
  #90= #22 of #8;                         // Cashier=class Store$Cashier of class Store
  #91= #34;                               // Limit=class Store$1Limit
  static #92= #53 of #8;                  // Address=class Store$Address of class Store
  public static final #97= #93 of #95;    // Lookup=class java/lang/invoke/MethodHandles$Lookup of class java/lang/invoke/MethodHandles`,
        },
        {
          type: "list",
          items: [
            "`InnerClasses` lists each nested class with its simple name, its outer class (members only) and its **source-level** modifiers. The word `static` for `Address` exists only here. `Store$Address.class` itself carries ordinary top-level flags, because to the JVM there's no such thing as a static class. `Modifier.isStatic(Address.class.getModifiers())` reads this attribute.",
            "`NestMembers` here, plus `NestHost: class Store` in every nested class file, is nest-based access control (JEP 181, Java 11). The JVM treats the whole nest as one unit for `private` access, so `Cashier` reads the private `sold` field with a plain `getfield`, and no `access$000` method exists. The Encapsulation lesson compiles the same kind of code with `--release 8` and shows the bridge methods this replaced.",
            "The nest host is always the top-level class, however deep the nesting goes.",
            "`BootstrapMethods` is the lambda's recipe, coming up next.",
          ],
        },
        {
          type: "heading",
          text: "Unused outer references are dropped (JDK 18+)",
        },
        {
          type: "paragraph",
          text: "`Limit` without a `this$0` made me suspicious, so I compiled inner classes that do and don't touch the outer object:",
        },
        {
          type: "code",
          language: "java",
          title: "Screen.java",
          code: `import java.io.Serializable;

public class Screen {
    private final byte[] cache = new byte[1024];

    class UsesOuter implements Runnable {
        public void run() { System.out.println(cache.length); }
    }

    class IgnoresOuter implements Runnable {
        public void run() { System.out.println("tick"); }
    }

    class SerialIgnoresOuter implements Runnable, Serializable {
        public void run() { System.out.println("tick"); }
    }

    Runnable anonIgnores() {
        return new Runnable() { public void run() { System.out.println("tick"); } };
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Screen.java
javap -p 'Screen$UsesOuter' 'Screen$IgnoresOuter' 'Screen$SerialIgnoresOuter' 'Screen$1' | grep -E "^class|this|\\(Screen\\)"
javac --release 17 -d r17 Screen.java
javap -p -cp r17 'Screen$IgnoresOuter' 'Screen$1' | grep -E "^class|this|\\(Screen\\)"`,
        },
        {
          type: "output",
          text: `class Screen$UsesOuter implements java.lang.Runnable {
  final Screen this$0;
  Screen$UsesOuter(Screen);
class Screen$IgnoresOuter implements java.lang.Runnable {
  Screen$IgnoresOuter(Screen);
class Screen$SerialIgnoresOuter implements java.lang.Runnable,java.io.Serializable {
  final Screen this$0;
  Screen$SerialIgnoresOuter(Screen);
class Screen$1 implements java.lang.Runnable {
  Screen$1(Screen);
# --release 17
class Screen$IgnoresOuter implements java.lang.Runnable {
  final Screen this$0;
  Screen$IgnoresOuter(Screen);
class Screen$1 implements java.lang.Runnable {
  final Screen this$0;
  Screen$1(Screen);`,
        },
        {
          type: "list",
          items: [
            "Compiled by `javac` 21 for release 21, only the class that actually reads `cache` keeps `this$0`; the anonymous `Screen$1`, which ignores it, has none either. The constructors still take a `Screen`: the language rule \"an inner class needs an outer instance\" hasn't changed, only whether the reference is kept.",
            "The `Serializable` one keeps the field even though it's unused, because dropping it would change the serialized form.",
            "With `--release 17` the field is back on every inner and anonymous class. I also tried `--release 18`, and the fields were gone again, so the cut-off is a target of 18. A library built for Java 17, still a very common baseline, carries `this$0` in every inner class whether it's used or not, so an anonymous listener that never mentions its outer object still pins it. I don't rely on the optimisation either way: when a class shouldn't hold its outer object, I make it static.",
          ],
        },
        {
          type: "heading",
          text: "Lambdas: no class file, a hidden class at run time",
        },
        {
          type: "paragraph",
          text: "The lambda in `Store` became `private static void lambda$run$0()` in `Store.class` (`javap -p` lists it) plus that `BootstrapMethods` entry. To see what exists at run time, I compared an anonymous class with two lambdas, one capturing nothing and one reading a field:",
        },
        {
          type: "code",
          language: "java",
          title: "LambdaClasses.java",
          code: `import java.util.function.IntSupplier;

public class LambdaClasses {
    private int base = 50;

    IntSupplier anonymous() {
        return new IntSupplier() {
            public int getAsInt() { return 42; }
        };
    }

    IntSupplier constant() { return () -> 42; }          // captures nothing
    IntSupplier usesField() { return () -> base + 1; }   // captures this

    public static void main(String[] args) {
        LambdaClasses o = new LambdaClasses();
        IntSupplier a1 = o.anonymous(), a2 = o.anonymous();
        IntSupplier c1 = o.constant(),  c2 = o.constant();
        IntSupplier f1 = o.usesField(), f2 = o.usesField();

        System.out.println("anonymous: " + a1.getClass().getName() + "  same object? " + (a1 == a2));
        System.out.println("constant : " + c1.getClass().getName() + "  same object? " + (c1 == c2));
        System.out.println("usesField: " + f1.getClass().getName() + "  same object? " + (f1 == f2));
        System.out.println("hidden? anonymous=" + a1.getClass().isHidden() + " lambda=" + c1.getClass().isHidden());
        System.out.println("anonymous class? " + a1.getClass().isAnonymousClass() + " / " + c1.getClass().isAnonymousClass());
        System.out.println("synthetic? " + a1.getClass().isSynthetic() + " / " + c1.getClass().isSynthetic());
    }
}`,
        },
        {
          type: "output",
          text: `anonymous: LambdaClasses$1  same object? false
constant : LambdaClasses$$Lambda/0x0000785c40000c48  same object? true
usesField: LambdaClasses$$Lambda/0x0000785c40001800  same object? false
hidden? anonymous=false lambda=true
anonymous class? true / false
synthetic? false / true`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p LambdaClasses | grep lambda
javap -c -p LambdaClasses | grep "InvokeDynamic.*getAsInt"
java -Xlog:class+load LambdaClasses | grep LambdaClasses     # path shortened`,
        },
        {
          type: "output",
          text: `  private int lambda$usesField$1();
  private static int lambda$constant$0();
       0: invokedynamic #18,  0             // InvokeDynamic #0:getAsInt:()Ljava/util/function/IntSupplier;
       1: invokedynamic #22,  0             // InvokeDynamic #1:getAsInt:(LLambdaClasses;)Ljava/util/function/IntSupplier;
[0.028s][info][class,load] LambdaClasses source: file:/.../
[0.029s][info][class,load] LambdaClasses$1 source: file:/.../
[0.033s][info][class,load] LambdaClasses$$Lambda/0x000074e0f0000c48 source: LambdaClasses
[0.036s][info][class,load] LambdaClasses$$Lambda/0x000074e0f0001800 source: LambdaClasses`,
        },
        {
          type: "list",
          items: [
            "Each lambda body became a private method of the enclosing class. `lambda$constant$0` is `static` because it uses nothing from the object; `lambda$usesField$1` is an instance method because it reads `base`.",
            "The lambda expression itself is an `invokedynamic`. The first time it runs, the bootstrap method `LambdaMetafactory.metafactory` generates a small class implementing `IntSupplier` and links the call site to it. The capturing one's descriptor, `(LLambdaClasses;)`, shows `this` being passed in. A lambda captures the enclosing object only when its body uses it.",
            "That generated class is a **hidden class** (JEP 371): defined at run time from bytes in memory, `isHidden()` true, no class file anywhere. The JDK names it `<target class>$$Lambda` and the JVM appends `/0x...`, a suffix that changes every run. The class-load log shows the difference: `LambdaClasses$1` came from a file, the lambda classes came from `LambdaClasses` itself. (The addresses and timestamps are from my runs.)",
            "Identity: the anonymous class gave a new object per call, as `new` always does. The non-capturing lambda returned the **same** object twice, because HotSpot links that call site to one pre-built instance. The capturing lambda needs a fresh object to hold each captured value. JLS 15.27.4 deliberately allows either a new or an existing object, so the reuse is HotSpot behaviour, not a guarantee to build on.",
            "A small trap for reflection-based code: `isAnonymousClass()` is `false` for the lambda class. It's a hidden top-level class, not an anonymous one.",
          ],
        },
      ],
    },
    {
      title: "Static Nested Classes",
      blocks: [
        {
          type: "paragraph",
          text: "A static nested class is a top-level class that happens to be filed under another class's name. It has no outer instance, so `new Outer.Nested()` works anywhere the class is visible, and its objects are as independent as any others. What it gets from the nesting is the name, which says where it belongs, and private access to the outer class.",
        },
        {
          type: "code",
          language: "java",
          title: "PriceApi.java",
          code: `import java.util.List;

public class PriceApi {
    private static final double SHIPPING = 50.0;         // private static
    private final double discount;                      // per-instance state

    PriceApi(double discount) { this.discount = discount; }

    // Grouping DTOs under the API they belong to (records: implicitly static)
    record QuoteRequest(String product, int quantity, double unitPrice) {}
    record QuoteResponse(String item, List<PriceLine> lines, double total) {}
    record PriceLine(String label, double amount) {}     // a Map.Entry-style pair

    // A static nested worker: needs no PriceApi object to exist
    static class Calculator {
        QuoteResponse quote(QuoteRequest req, PriceApi api) {
            double items = req.quantity() * req.unitPrice();
            double off = items * api.discount;                      // instance field: via an object
            List<PriceLine> lines = List.of(
                new PriceLine("items", items),
                new PriceLine("discount", off),
                new PriceLine("shipping", SHIPPING));                // private static: used directly
            double total = items - off + SHIPPING;
            return new QuoteResponse(req.quantity() + " x " + req.product(), lines, total);
        }
    }

    public static void main(String[] args) {
        PriceApi.Calculator calc = new PriceApi.Calculator();      // no PriceApi instance needed
        PriceApi.QuoteRequest req = new PriceApi.QuoteRequest("Keyboard", 2, 300.0);
        System.out.println(calc.quote(req, new PriceApi(0.10)).lines());
        System.out.println(calc.quote(req, new PriceApi(0.25)).total());
    }
}`,
        },
        {
          type: "output",
          text: `[PriceLine[label=items, amount=600.0], PriceLine[label=discount, amount=60.0], PriceLine[label=shipping, amount=50.0]]
500.0`,
        },
        {
          type: "list",
          items: [
            "`Calculator` reads `SHIPPING`, a `private static` constant, directly. It belongs to the class, and the nest grants private access.",
            "`discount` is an instance field, so `Calculator` reads it through an object: `api.discount`, private but allowed. When I wrote plain `discount` there instead, `javac` said `non-static variable discount cannot be referenced from a static context`, the same error a static method gets.",
            "`QuoteRequest` and `QuoteResponse` are records, so they're static without the keyword. Grouping a feature's request and response types inside it keeps them out of the package namespace, and `PriceApi.QuoteRequest` at a call site says exactly what it is.",
            "`PriceLine` is the `Map.Entry` pattern: a small pair type that only makes sense next to its outer class and needs no instance of it.",
          ],
        },
        {
          type: "paragraph",
          text: "The JDK is full of these. I printed `Modifier.toString(Class.forName(name).getModifiers())` for a few, which reports the source-level modifiers from the `InnerClasses` attribute: `public abstract static interface` for `Map.Entry`, `static` for `HashMap.Node` (the bucket nodes from the HashMap Internals lesson), `private static` for `LinkedList.Node`, `public static` for `AbstractMap.SimpleEntry` and `public static final` for the enum `Thread.State`. The one exception I picked was `ArrayList.Itr`, reported as just `private`: an inner class. `javap -p` shows why, `final java.util.ArrayList this$0`, because an iterator has to read its own list's elements and `modCount`.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "Static is my default",
          text: "If a nested class doesn't need the outer object, `static` says so, removes the hidden reference, and lets the class be created without one. Effective Java (3rd edition, Item 24) gives the same rule: favour static member classes over non-static ones. I only drop `static` when I can say why every instance needs its outer object.",
        },
      ],
    },
    {
      title: "Inner Classes",
      blocks: [
        {
          type: "paragraph",
          text: "An inner class is the opposite case: every instance is tied, permanently, to one instance of the outer class, chosen when it's created. Inside the inner class, the outer object's fields and methods are in scope as if they were its own.",
        },
        {
          type: "code",
          language: "java",
          title: "Department.java",
          code: `public class Department {
    private final String name;
    private int headcount = 0;

    Department(String name) { this.name = name; }

    class Employee {
        private final String name;                         // same name as Department.name

        Employee(String name) { this.name = name; }

        void join() {
            headcount++;                                   // really Department.this.headcount++
            System.out.println(name + " joined " + Department.this.name + ", headcount: " + headcount);
        }
    }

    Employee hire(String person) {
        return new Employee(person);                       // inside: this.new Employee(person)
    }

    public static void main(String[] args) {
        Department sales = new Department("Sales");
        Department support = new Department("Support");

        Department.Employee e1 = sales.new Employee("Asha");   // outside: name the outer object
        Department.Employee e2 = sales.hire("Ravi");
        Department.Employee e3 = support.new Employee("Meera");

        e1.join();
        e2.join();
        e3.join();
    }
}`,
        },
        {
          type: "output",
          text: `Asha joined Sales, headcount: 1
Ravi joined Sales, headcount: 2
Meera joined Support, headcount: 1`,
        },
        {
          type: "list",
          items: [
            "`sales.new Employee(\"Asha\")` is the syntax from outside, or from any static method: the outer object goes in front of `new`. Inside an instance method of `Department`, plain `new Employee(person)` means `this.new Employee(person)`.",
            "Asha and Ravi share `sales`, so they incremented the same `headcount`. Meera belongs to `support` and started from 1. Each employee object reaches **its** department through its own `this$0`.",
            "`Employee` declares its own `name`, which shadows `Department.name`. Plain `name` means the employee's field; `Department.this.name` reaches the outer one. `Department.this` is the qualified `this`: the enclosing instance of type `Department`.",
            "An `Employee` object can never move to another department. `this$0` is `final`, set once in the constructor. (A real HR model would make the department a normal field, so people can transfer. Here the point is the mechanism.)",
          ],
        },
        {
          type: "heading",
          text: "What the hidden reference keeps alive",
        },
        {
          type: "paragraph",
          text: "That `this$0` is invisible in the source, and it's a strong reference like any other. Say an `EditorWindow` holds a 4 MB `byte[] imageCache` and registers a save listener on an app-wide `EventBus.LISTENERS`, a `static` list. If the listener is an inner class, `SaveBanner`, the list holds the listener, the listener holds the window, and the window holds the 4 MB, long after the window is closed. If it's a static nested class, `SaveText`, that copies only the `docId` it needs, the closed window has no path from the list and can be collected:",
        },
        {
          type: "image",
          src: "/images/java/nested-classes-hidden-outer-reference.svg",
          alt: "Two reference chains starting at the static EventBus.LISTENERS list. Left: the list holds an inner-class SaveBanner whose synthetic this$0 field points to the closed EditorWindow doc-1, which holds a 4 MB byte array imageCache, so everything stays reachable. Right: the list holds a static nested SaveText holding only the String docId; the EditorWindow and its 4 MB array are drawn dashed as unreachable and collectable.",
          caption: "The leak is one hidden field long. The static list is a GC root; whatever the listener can reach, the GC must keep.",
        },
        {
          type: "paragraph",
          text: "The production section reproduces exactly this chain with a real program on a 64 MB heap, and shows the `OutOfMemoryError` it ends in.",
        },
        {
          type: "heading",
          text: "Static members inside inner classes (Java 16)",
        },
        {
          type: "paragraph",
          text: "Until Java 16, an inner class couldn't declare static members other than compile-time constants. JEP 395, the records JEP, removed the restriction, mainly so inner classes could contain records, which are implicitly static. This compiles and runs on JDK 21:",
        },
        {
          type: "code",
          language: "java",
          title: "Order.java",
          code: `public class Order {
    private final String id;

    Order(String id) { this.id = id; }

    class Item {
        static int created = 0;                    // a static field in an inner class
        final String product;
        final int quantity;

        Item(String product, int quantity) {
            this.product = product;
            this.quantity = quantity;
            created++;
        }

        @Override
        public String toString() { return id + ": " + quantity + " x " + product; }
    }

    public static void main(String[] args) {
        Order order = new Order("O-101");
        System.out.println(order.new Item("Keyboard", 1));
        System.out.println(order.new Item("Mouse", 2));
        System.out.println("items created: " + Order.Item.created);
    }
}`,
        },
        {
          type: "output",
          text: `O-101: 1 x Keyboard
O-101: 2 x Mouse
items created: 2`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac --release 15 -d r15 Order.java",
        },
        {
          type: "output",
          text: `Order.java:7: error: Illegal static declaration in inner class Order.Item
        static int created = 0;                    // a static field in an inner class
                   ^
  modifier 'static' is only allowed in constant variable declarations
1 error`,
        },
        {
          type: "paragraph",
          text: "A constant like `static final int MAX_ITEMS = 50;` was always allowed, which is what \"only allowed in constant variable declarations\" refers to. Static methods were rejected the same way before Java 16. The counter belongs to the class `Order$Item`, not to any order: every `Item` of every `Order` shares it.",
        },
        {
          type: "paragraph",
          text: "Java 25's flexible constructor bodies (JEP 513) didn't change the outer-instance rule. A constructor may now run statements before `super(...)`, but when I compiled a constructor that did `new StaticHelper();` and then `new Helper();` (an inner class of the same class) before `super();` with JDK 25's `javac`, the static nested one was accepted and the inner one failed with `cannot reference this before supertype constructor has been called`. Creating an inner object needs `this` as its outer instance, and `this` isn't usable until the superclass constructor has run.",
        },
      ],
    },
    {
      title: "Local Classes and Captured Variables",
      blocks: [
        {
          type: "paragraph",
          text: "A local class is declared inside a method, or any block, and its name exists only from its declaration to the end of that block. It can use the enclosing instance, if there is one, and the method's local variables and parameters, as long as they're **effectively final**: never assigned again after initialization.",
        },
        {
          type: "code",
          language: "java",
          title: "DueNotices.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

public class DueNotices {
    static Supplier<String> dueNotice(String member, int days) {
        class Notice implements Supplier<String> {
            @Override
            public String get() { return member + ", your library book is due in " + days + " days"; }
        }
        return new Notice();                    // dueNotice's frame is gone right after this
    }

    public static void main(String[] args) {
        List<Supplier<String>> pending = new ArrayList<>();
        pending.add(dueNotice("Asha", 4));
        pending.add(dueNotice("Ravi", 7));
        for (Supplier<String> s : pending) {
            System.out.println(s.get());        // both calls returned long ago
        }
    }
}`,
        },
        {
          type: "output",
          text: `Asha, your library book is due in 4 days
Ravi, your library book is due in 7 days`,
        },
        {
          type: "paragraph",
          text: "`Notice.get()` reads `member` and `days`, but by the time it runs, `dueNotice` has returned and its frame, which held those parameters, is gone (the Methods lesson's frames). The values survived because they were **copied** into each `Notice` object when it was created:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p 'DueNotices$1Notice'
javap -c -p DueNotices     # just dueNotice`,
        },
        {
          type: "output",
          text: `class DueNotices$1Notice implements java.util.function.Supplier<java.lang.String> {
  final java.lang.String val$member;
  final int val$days;
  DueNotices$1Notice();
  public java.lang.String get();
  public java.lang.Object get();
}
  static java.util.function.Supplier<java.lang.String> dueNotice(java.lang.String, int);
    Code:
       0: new           #7                  // class DueNotices$1Notice
       3: dup
       4: aload_0
       5: iload_1
       6: invokespecial #9                  // Method DueNotices$1Notice."<init>":(Ljava/lang/String;I)V
       9: areturn`,
        },
        {
          type: "paragraph",
          text: "There they are: `val$member` and `val$days`, filled from constructor arguments (`aload_0` and `iload_1` push the parameters before `invokespecial`). No `this$0` and no outer parameter this time, because `dueNotice` is static: there's no enclosing instance to pass. (The second `get()` returning `Object` is a bridge method for generics, which the Polymorphism lesson explains.)",
        },
        {
          type: "heading",
          text: "Why effectively final",
        },
        {
          type: "paragraph",
          text: "Once the value is copied, there are two variables: the local in the frame and the field in the object. If either could change, they'd disagree, and the same name would mean different values inside and outside the class. Java rules that out by requiring that the local never changes, so the copy is indistinguishable from the original. Before Java 8 the variable had to be declared `final`; since Java 8 it's enough that it's never reassigned. Both ways of breaking the rule fail to compile:",
        },
        {
          type: "code",
          language: "java",
          title: "CaptureRules.java",
          code: `public class CaptureRules {
    public static void main(String[] args) {
        int count = 0;
        class Tally {
            void add() { count++; }                       // writes the captured local
        }
        new Tally().add();

        String city = "Kolkata";
        Runnable greet = new Runnable() {
            public void run() { System.out.println("Orders from " + city); }
        };
        city = "Pune";                                    // reassigned after capture
        greet.run();
    }
}`,
        },
        {
          type: "output",
          text: `CaptureRules.java:5: error: local variables referenced from an inner class must be final or effectively final
            void add() { count++; }                       // writes the captured local
                         ^
CaptureRules.java:11: error: local variables referenced from an inner class must be final or effectively final
            public void run() { System.out.println("Orders from " + city); }
                                                                    ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "The second error points at the **use** inside the anonymous class, not at `city = \"Pune\"`, which is the line I'd actually have to change. The assignment is what made `city` not effectively final; the use is where that becomes illegal. For a lambda the message says `referenced from a lambda expression` instead.",
        },
        {
          type: "heading",
          text: "The mutable box, and why I avoid it",
        },
        {
          type: "paragraph",
          text: "The standard workaround is to capture a final reference to something mutable: `int[] cancelled = {0}; Runnable cancel = () -> cancelled[0]++;` compiles, and after two `cancel.run()` calls `cancelled[0]` was 2. The reference is copied; the array isn't. It works, but it's a shared mutable variable smuggled past the rule that was protecting me. If that lambda ever runs on another thread, in a `parallel()` stream or an executor, the plain `int[]` increments race with each other. When I need a count I'd rather return it (`stream().count()`), or use an `AtomicInteger` or `LongAdder` when it really is shared state.",
        },
        {
          type: "heading",
          text: "Local records, enums and interfaces (Java 16)",
        },
        {
          type: "paragraph",
          text: "Java 16 also allowed records, enums and interfaces to be declared locally. They're implicitly static, so unlike local classes they can't capture anything. When I declared `record LineTotal(String product, int quantity)` inside an instance method `report(double taxRate)` of an `Invoice` class and had its `total()` read the outer field `unitPrice` and the parameter `taxRate`, both uses failed, starting with `non-static variable unitPrice cannot be referenced from a static context` (and the same for `taxRate`). That's a feature: a local record is a pure data carrier with no hidden fields, which makes it ideal for naming an intermediate shape inside one method, like `RegionStats` in the Examples. With `--release 15`, the same `javac` rejects local enums with `enum classes must not be local` and local interfaces with `interface not allowed here`.",
        },
      ],
    },
    {
      title: "Anonymous Classes",
      blocks: [
        {
          type: "paragraph",
          text: "An anonymous class declares a class and creates its only instance in one expression. It can extend a class, passing arguments to that class's constructor, or implement exactly one interface. Its body can have fields, methods and initializer blocks like any class. What it can't have is a name, so it can't have a constructor either; an instance initializer block does that job.",
        },
        {
          type: "code",
          language: "java",
          title: "HappyHour.java",
          code: `import java.util.List;

public class HappyHour {
    record Order(String id, int hour, double amount) {}

    abstract static class DiscountRule {
        private final String name;

        DiscountRule(String name) { this.name = name; }

        abstract boolean applies(Order order);
        abstract double adjust(double amount);

        String name() { return name; }
    }

    public static void main(String[] args) {
        DiscountRule happyHour = new DiscountRule("happy hour") {   // args go to DiscountRule(String)
            private int applied = 0;                               // state of its own

            {                                                      // no constructors: an initializer
                System.out.println("created rule: " + name());
            }

            @Override
            boolean applies(Order order) { return order.hour() >= 17 && order.hour() < 19; }

            @Override
            double adjust(double amount) {
                applied++;
                return Math.round(amount * 0.8 * 100) / 100.0;
            }

            @Override
            public String toString() { return name() + " applied " + applied + " time(s)"; }
        };

        List<Order> orders = List.of(new Order("O-1", 17, 180), new Order("O-2", 14, 220),
                                     new Order("O-3", 18, 310));
        for (Order o : orders) {
            double amount = happyHour.applies(o) ? happyHour.adjust(o.amount()) : o.amount();
            System.out.println(o.id() + " at " + o.hour() + "h -> " + amount);
        }
        System.out.println(happyHour);
        System.out.println(happyHour.getClass().getName() + " extends " + happyHour.getClass().getSuperclass().getName());
    }
}`,
        },
        {
          type: "output",
          text: `created rule: happy hour
O-1 at 17h -> 144.0
O-2 at 14h -> 220.0
O-3 at 18h -> 248.0
happy hour applied 2 time(s)
HappyHour$1 extends HappyHour$DiscountRule`,
        },
        {
          type: "list",
          items: [
            "`new DiscountRule(\"happy hour\") { ... }` passes the name to the abstract class's constructor. The anonymous class has no constructor of its own; its `{ ... }` initializer block ran during creation, which is why \"created rule\" printed first.",
            "It implements two abstract methods and keeps a counter across calls. A lambda can do neither: it can only implement an interface with exactly one abstract method, and it has no fields.",
            "Its class is `HappyHour$1`, a real subclass of `HappyHour$DiscountRule`, with its own class file. When I printed `getSimpleName()` for it, I got an empty string, which is worth knowing before building log labels or metric names from class names.",
          ],
        },
        {
          type: "paragraph",
          text: "To confirm the lambda half of that, I tried `Discount half = price -> price / 2;` where `Discount` is an abstract class with one abstract method, and a lambda for an interface `PricingRule` with two abstract methods. The first failed with `incompatible types: Discount is not a functional interface`; the second with `PricingRule is not a functional interface` plus `multiple non-overriding abstract methods found in interface PricingRule`. An abstract class never qualifies, even with a single abstract method, because a lambda isn't a subclass of anything. And since Java 9 (JEP 213) an anonymous class can use the diamond, `new Comparator<>() { ... }`, as in Syntax at a Glance below; `javac --release 8` rejects that with `'<>' with anonymous inner classes is not supported in -source 8`.",
        },
      ],
    },
    {
      title: "Anonymous Classes vs Lambdas",
      blocks: [
        {
          type: "paragraph",
          text: "Most anonymous classes in pre-Java 8 code are single-method interface implementations that should be lambdas now. The Lambda Expressions lesson in the Java 8 track covers lambdas themselves. Here I care about what changes when converting one into the other, starting with the difference that actually causes bugs, `this`:",
        },
        {
          type: "code",
          language: "java",
          title: "ProfileCard.java",
          code: `public class ProfileCard {
    private final String owner = "Asha";

    @Override
    public String toString() { return "ProfileCard(" + owner + ")"; }

    void show() {
        Runnable anon = new Runnable() {
            @Override
            public void run() {
                System.out.println("anonymous: this = " + this);
                System.out.println("anonymous: ProfileCard.this = " + ProfileCard.this);
            }

            @Override
            public String toString() { return "the anonymous Runnable"; }
        };
        Runnable lambda = () -> System.out.println("lambda   : this = " + this);

        anon.run();
        lambda.run();
    }

    public static void main(String[] args) {
        new ProfileCard().show();
    }
}`,
        },
        {
          type: "output",
          text: `anonymous: this = the anonymous Runnable
anonymous: ProfileCard.this = ProfileCard(Asha)
lambda   : this = ProfileCard(Asha)`,
        },
        {
          type: "paragraph",
          text: "Inside an anonymous class, `this` is the anonymous object, and reaching the outer one takes `ProfileCard.this`. A lambda doesn't create a new scope or a new object identity in the source: `this` inside it means exactly what it means on the line before, the `ProfileCard`. The Common Mistakes section has a listener that breaks because of exactly this during a conversion.",
        },
        {
          type: "table",
          headers: ["", "Anonymous class", "Lambda"],
          rows: [
            ["Can implement", "Any interface, or extend any non-final class", "A functional interface only"],
            ["Abstract methods", "Any number", "Exactly one, and it can't be generic"],
            ["`this` means", "The anonymous object", "The enclosing instance"],
            ["Own fields, initializers", "Yes", "No"],
            ["Redeclaring a local's name", "Allowed: the body is a new scope", "Compile error: same scope as the method"],
            ["Class file", "One per class (`Outer$1.class`)", "None; a hidden class spun at run time"],
            ["Object per evaluation", "Always a new one", "New when capturing; HotSpot reuses one when not"],
            ["Holds the outer instance", "When created in an instance context and (for release 18+ targets) used, or `Serializable`", "Only when the body uses `this` or instance members"],
          ],
        },
        {
          type: "paragraph",
          text: "Two rows are easy to miss. For `interface Converter { <T> T convert(Object raw, Class<T> type); }`, an anonymous class works, but a lambda fails with `invalid functional descriptor for lambda expression`, because a lambda has no syntax for declaring a type parameter. And a lambda parameter can't reuse a local's name: `String city = \"Kolkata\";` followed by `city -> city.toUpperCase()` fails with `variable city is already defined in method main(String[])`, while an anonymous `Function` with `apply(String city)` compiles and shadows the local. So converting an anonymous class to a lambda sometimes needs a rename, and the reverse never does.",
        },
      ],
    },
    {
      title: "Shadowing and Name Resolution",
      blocks: [
        {
          type: "paragraph",
          text: "Nested scopes mean the same simple name can exist at several levels at once. The rule is the familiar one, the innermost declaration wins, and the qualified forms reach outwards. I put `name` at four levels to see every case:",
        },
        {
          type: "code",
          language: "java",
          title: "Company.java",
          code: `public class Company {
    String name = "1: field of Company";

    class Department {
        String name = "2: field of Department";

        void hire(String name) {                           // 3: parameter
            class Badge {
                String name = "4: field of Badge";

                void print() {
                    System.out.println(name);                    // innermost wins
                    System.out.println(this.name);               // Badge's field
                    System.out.println(Department.this.name);    // the inner class's field
                    System.out.println(Company.this.name);       // the outer class's field
                }
            }
            new Badge().print();
            System.out.println(name);                            // back in hire: the parameter
        }
    }

    public static void main(String[] args) {
        Company outer = new Company();
        Company.Department d = outer.new Department();
        d.hire("3: parameter of hire");
    }
}`,
        },
        {
          type: "output",
          text: `4: field of Badge
4: field of Badge
2: field of Department
1: field of Company
3: parameter of hire`,
        },
        {
          type: "list",
          items: [
            "Inside `Badge.print()`, plain `name` is `Badge`'s own field, the innermost declaration, and `this.name` is the same field.",
            "`Department.this.name` and `Company.this.name` walk outwards through the enclosing instances. `Badge` is a local class inside an instance method of an inner class, so it has a chain of outer objects to walk.",
            "The parameter is the one name I can't reach from inside `Badge`. Fields have qualified names; parameters and local variables don't. Once something shadows a local, no syntax can name it, so in real code I'd rename one of them.",
            "Back in `hire`, outside `Badge`, `name` is the parameter again.",
          ],
        },
        {
          type: "heading",
          text: "Methods hide by name, not by signature",
        },
        {
          type: "paragraph",
          text: "Methods follow a stricter rule (JLS 15.12.1). The compiler first finds the innermost class that has **any** member method with the name being called, and then only considers that class's methods. I tested it with a class `AuditLog` that has `void log(int amount)`, and an inner class `Audit` that declares `void log(String msg)`. Inside `Audit`, `log(250)` failed with `incompatible types: int cannot be converted to String`: the inner `log` hid the outer one completely, whatever the parameter types. Overloading doesn't reach across nesting levels. Writing `AuditLog.this.log(250)` compiled and printed `amount 250`.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `sales.new Employee(\"Asha\")` and `e1.join()` from the `Department` program, through `javac` and then the JVM. I checked the bytecode steps with `javap -c -p` on both class files.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time.** `javac` finds `Employee` declared as a member of `Department` without `static`, so it's an inner class. It will become its own class file, `Department$Employee.class`.",
            "In `join()`, `headcount` and `Department.this.name` resolve to fields of the enclosing `Department`. `javac` rewrites both as accesses through a synthetic field `final Department this$0`, and keeps that field because it's used.",
            "The constructor `Employee(String name)` gets an extra first parameter: its descriptor becomes `(LDepartment;Ljava/lang/String;)V`. The generated code stores `this$0`, calls `Object.<init>`, then runs `this.name = name`.",
            "At the creation site, `javac` emits `new Department$Employee`, `dup`, `aload_1` (`sales`), `dup` plus `invokestatic Objects.requireNonNull` plus `pop` as a null check, `ldc \"Asha\"`, and `invokespecial Department$Employee.<init>(LDepartment;Ljava/lang/String;)V`. Thanks to that check, a null outer object fails on the creation line: when I tried `Order missing = null; missing.new Item();` in a small test, the `NullPointerException` came from `Objects.requireNonNull`, instead of an object being built with a null `this$0`.",
            "It writes `NestHost: class Department` into `Department$Employee.class`, and `NestMembers` and an `InnerClasses` entry into `Department.class`.",
            "**Run time.** The first `new Department$Employee` makes the JVM load `Department$Employee.class` exactly like a top-level class: find the file, link, verify. Nothing about it is \"inner\" to the JVM.",
            "The JVM allocates the object, zeroes its fields, and runs the constructor: `this$0 = sales`, then `Object.<init>`, then `this.name = \"Asha\"`.",
            "`e1.join()` runs `headcount++` as `aload_0`, `getfield this$0`, `dup`, `getfield headcount`, `iconst_1`, `iadd`, `putfield headcount`. The field is `private` in `Department`; the access check passes because both classes belong to the same nest.",
            "`Department.this.name` is `getfield this$0` followed by `getfield name`, so Asha's line prints the Sales department's name.",
            "From now on, as long as `e1` is reachable, `sales` is reachable too, through `this$0`. Nothing in `sales` points back at `e1`.",
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
          title: "NestedSyntax.java",
          code: `import java.util.Comparator;

public class NestedSyntax {
    private static int prices = 0;                 // private static: every nested class can use it
    private final String city;                     // instance field: only inner code can use it directly

    NestedSyntax(String city) { this.city = city; }

    // 1. Static nested class: no outer instance
    static class Price {
        final int amount;
        Price(int amount) { this.amount = amount; prices++; }
    }

    // 2. Inner class: every instance is tied to one NestedSyntax
    class Branch {
        final String name;
        Branch(String name) { this.name = name; }
        String label() { return name + ", " + city; }          // reads the outer's private field
    }

    // Nested records, enums and interfaces are implicitly static
    record Point(int x, int y) {}
    enum Size { SMALL, MEDIUM, LARGE }
    interface Notifier { void send(String msg); }

    void show(int discountPercent) {
        // 3. Local class: visible only in this block, captures discountPercent
        class Discount {
            int apply(int amount) { return amount - amount * discountPercent / 100; }
        }

        // 4. Anonymous class: a one-off implementation, declared and instantiated at once
        Comparator<Price> cheapestFirst = new Comparator<>() {
            @Override
            public int compare(Price a, Price b) { return Integer.compare(a.amount, b.amount); }
        };

        // The lambda form of a one-method interface
        Notifier email = msg -> System.out.println("EMAIL: " + msg);

        Price a = new Price(220), b = new Price(140);
        Price cheaper = cheapestFirst.compare(a, b) <= 0 ? a : b;
        Branch branch = new Branch("Park Street");             // inside: this.new Branch(...)
        email.send(branch.label() + " | " + Size.MEDIUM + " | " + new Point(3, 4));
        email.send("cheapest " + cheaper.amount + ", after discount " + new Discount().apply(cheaper.amount));
    }

    public static void main(String[] args) {
        NestedSyntax.Price p = new NestedSyntax.Price(180);    // static nested: no outer object
        NestedSyntax pune = new NestedSyntax("Pune");
        NestedSyntax.Branch branch = pune.new Branch("Baner");  // inner: outer object first
        System.out.println(p.amount + " | " + branch.label());

        new NestedSyntax("Kolkata").show(25);
        System.out.println("prices created: " + prices);
    }
}`,
        },
        {
          type: "output",
          text: `180 | Baner, Pune
EMAIL: Park Street, Kolkata | MEDIUM | Point[x=3, y=4]
EMAIL: cheapest 140, after discount 105
prices created: 3`,
        },
        {
          type: "paragraph",
          text: "`ls *.class` after compiling showed eight files: `NestedSyntax.class`, `NestedSyntax$Price`, `$Branch`, `$Point`, `$Size`, `$Notifier`, `$1Discount` and `$1` (the anonymous comparator). Nothing for the lambda. `prices` counted three because the `Price` constructor, inside the static nested class, incremented the outer class's private static field directly.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "An inner class as an iterator",
        },
        {
          type: "paragraph",
          text: "This is the textbook case for an inner class, and the same shape as `ArrayList.Itr`: an iterator that walks its own collection's private array.",
        },
        {
          type: "code",
          language: "java",
          title: "Bookshelf.java",
          code: `import java.util.Iterator;
import java.util.NoSuchElementException;

public class Bookshelf implements Iterable<String> {
    private final String genre;
    private final String[] books = new String[8];
    private int size = 0;

    Bookshelf(String genre) { this.genre = genre; }

    void add(String title) { books[size++] = title; }

    @Override
    public Iterator<String> iterator() {
        return new ShelfIterator();                  // means this.new ShelfIterator()
    }

    // Inner class: each iterator belongs to one shelf and reads its private fields
    private class ShelfIterator implements Iterator<String> {
        private int cursor = 0;                      // the iterator's own state

        @Override
        public boolean hasNext() { return cursor < size; }

        @Override
        public String next() {
            if (!hasNext()) throw new NoSuchElementException(genre + " shelf exhausted");
            return genre + ": " + books[cursor++];
        }
    }

    public static void main(String[] args) {
        Bookshelf fiction = new Bookshelf("Fiction");
        fiction.add("Dune");
        fiction.add("Emma");
        Bookshelf history = new Bookshelf("History");
        history.add("SPQR");

        Iterator<String> it = fiction.iterator();
        System.out.println(it.next());
        fiction.add("Ulysses");                      // the iterator sees it: it reads size live
        while (it.hasNext()) System.out.println(it.next());

        for (String b : history) System.out.println(b);
    }
}`,
        },
        {
          type: "output",
          text: `Fiction: Dune
Fiction: Emma
Fiction: Ulysses
History: SPQR`,
        },
        {
          type: "list",
          items: [
            "Each iterator keeps only its own `cursor`. Everything else, `books`, `size` and `genre`, it reads from its shelf through `this$0`, so two iterators over two shelves never mix.",
            "Adding Ulysses after the iterator was created was visible to it, because an inner class reads the outer object's **current** fields, not copies. That's the opposite of a local class capturing a local variable. `ArrayList.Itr` adds a `modCount` check on top of this exact shape and fails fast instead, as the Iterators: Fail-Fast and Fail-Safe lesson in the Collections track shows.",
            "`javap -p` on `Bookshelf$ShelfIterator` showed `final Bookshelf this$0` and `private Bookshelf$ShelfIterator(Bookshelf)`. The constructor is private because the class is, and the outer class can still call it directly: nestmates again.",
          ],
        },
        {
          type: "diagram",
          text: ` main's frame           heap
┌─────────────┐      ┌───────────────────────────┐
│ fiction ────┼─────►│ Bookshelf "Fiction"       │◄──────┐
│             │      │ books [Dune, Emma,        │       │
│             │      │        Ulysses]   size 3  │       │
│ history ────┼──┐   └───────────────────────────┘       │
│             │  │   ┌───────────────────────────┐       │
│ it ─────────┼─┐└──►│ Bookshelf "History"       │       │
└─────────────┘ │    │ books [SPQR]      size 1  │       │
                │    └───────────────────────────┘       │
                │    ┌───────────────────────────┐       │
                └───►│ ShelfIterator             │       │
                     │ cursor 3                  │       │
                     │ this$0 ───────────────────┼───────┘
                     └───────────────────────────┘`,
          caption: "The iterator points at its shelf through `this$0`. The shelf has no field pointing back at its iterators.",
        },
        {
          type: "heading",
          text: "A local record for an intermediate result",
        },
        {
          type: "paragraph",
          text: "Grouping orders by region produces an intermediate shape (region, count, average) that nothing outside the method cares about. A local record gives it a name and real accessors without adding a type to the package:",
        },
        {
          type: "code",
          language: "java",
          title: "SalesReport.java",
          code: `import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

public class SalesReport {
    record Order(String region, double amount, int items) {}

    static void topRegions(List<Order> orders, int minItems) {
        record RegionStats(String region, long orders, double avgAmount) {}   // exists only in this method

        orders.stream()
            .filter(o -> o.items() >= minItems)                            // the lambda captures minItems
            .collect(Collectors.groupingBy(Order::region))
            .entrySet().stream()
            .map(e -> new RegionStats(e.getKey(), e.getValue().size(),
                    e.getValue().stream().mapToDouble(Order::amount).average().orElse(0)))
            .sorted(Comparator.comparingLong(RegionStats::orders).reversed()
                              .thenComparing(RegionStats::region))
            .forEach(System.out::println);
    }

    public static void main(String[] args) {
        List<Order> orders = List.of(
            new Order("East", 180, 3), new Order("West", 240, 5),
            new Order("East", 220, 4), new Order("North", 90, 1),
            new Order("West", 160, 2), new Order("East", 140, 2));
        topRegions(orders, 2);
    }
}`,
        },
        {
          type: "output",
          text: `RegionStats[region=East, orders=3, avgAmount=180.0]
RegionStats[region=West, orders=2, avgAmount=200.0]`,
        },
        {
          type: "paragraph",
          text: "North's only order had one item, below `minItems`, so it never reached the grouping. The record compiled to `SalesReport$1RegionStats.class`, numbered like a local class. The capturing happens in the lambdas around it (`minItems` in the filter), never in the record, which is what I want from a data carrier.",
        },
        {
          type: "heading",
          text: "Two generations of a Comparator",
        },
        {
          type: "paragraph",
          text: "Sorting products by rating (best first) and then by price (cheapest first), written the way it would have been before Java 8, and with comparator combinators:",
        },
        {
          type: "code",
          language: "java",
          title: "ProductSort.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class ProductSort {
    record Product(String name, double rating, int price) {}

    public static void main(String[] args) {
        List<Product> products = List.of(
            new Product("Kettle", 4.6, 1800), new Product("Toaster", 4.2, 1500),
            new Product("Blender", 4.6, 1400), new Product("Iron", 3.9, 900));

        // Pre-Java 8 style: an anonymous class, compiled to ProductSort$1.class
        Comparator<Product> anonymous = new Comparator<Product>() {
            @Override
            public int compare(Product a, Product b) {
                int byRating = Double.compare(b.rating(), a.rating());     // best first
                return byRating != 0 ? byRating : Integer.compare(a.price(), b.price());
            }
        };

        // A lambda with the same body would work too. What I'd actually write:
        Comparator<Product> composed = Comparator.comparingDouble(Product::rating).reversed()
                                                 .thenComparingInt(Product::price);

        for (Comparator<Product> c : List.of(anonymous, composed)) {
            List<Product> sorted = new ArrayList<>(products);
            sorted.sort(c);
            System.out.println(sorted.stream().map(Product::name).toList());
        }
    }
}`,
        },
        {
          type: "output",
          text: `[Blender, Kettle, Toaster, Iron]
[Blender, Kettle, Toaster, Iron]`,
        },
        {
          type: "paragraph",
          text: "Same order both times: Blender and Kettle tie on 4.6, and the cheaper Blender wins. Compiling produced `ProductSort.class`, `ProductSort$Product.class` and `ProductSort$1.class`, the last one for the anonymous comparator; a lambda with the same body would add no file. The composed version is the one I'd keep: no comparison to get backwards, and the sort keys read in order. The Comparable and Comparator lesson in the Collections track covers these combinators.",
        },
        {
          type: "heading",
          text: "A one-shot listener: where an anonymous class still wins",
        },
        {
          type: "paragraph",
          text: "A listener that should fire once and then unregister itself needs a reference to itself. An anonymous class has one, `this`. A lambda doesn't: inside a lambda, `this` is the enclosing object. I wrote both, as I might when converting old code:",
        },
        {
          type: "code",
          language: "java",
          title: "OneShot.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class OneShot {
    interface OrderListener { void onEvent(String event); }

    static final List<OrderListener> LISTENERS = new ArrayList<>();

    void subscribeAnonymous() {
        LISTENERS.add(new OrderListener() {
            @Override
            public void onEvent(String event) {
                System.out.println("anonymous got " + event);
                LISTENERS.remove(this);                 // this = the listener: removes itself
            }
        });
    }

    void subscribeLambda() {
        LISTENERS.add(event -> {
            System.out.println("lambda got " + event);
            LISTENERS.remove(this);                     // this = the OneShot object: removes nothing
        });
    }

    static void publish(String event) {
        for (OrderListener l : List.copyOf(LISTENERS)) l.onEvent(event);
        System.out.println("listeners left: " + LISTENERS.size());
    }

    public static void main(String[] args) {
        OneShot page = new OneShot();
        page.subscribeAnonymous();
        publish("ORDER_PLACED");
        page.subscribeLambda();
        publish("ORDER_PLACED");
        publish("ORDER_SHIPPED");
    }
}`,
        },
        {
          type: "output",
          text: `anonymous got ORDER_PLACED
listeners left: 0
lambda got ORDER_PLACED
listeners left: 1
lambda got ORDER_SHIPPED
listeners left: 1`,
        },
        {
          type: "paragraph",
          text: "The anonymous listener removed itself after its first event. The lambda version compiled without a warning, because `List.remove` takes an `Object`, and then tried to remove the `OneShot` object, which was never in the list. It kept firing, and in a long-running service it would pile up exactly like the leak in the production section. A lambda that needs to refer to itself should be a named or anonymous class instead, or the code should keep the reference it registered and remove that. (`publish` iterates over `List.copyOf(...)` so a listener can remove itself mid-loop without a `ConcurrentModificationException`.)",
        },
      ],
    },
    {
      title: "When to Use Nested Classes (and Which Kind)",
      blocks: [
        {
          type: "paragraph",
          text: "My starting point is a top-level class. I nest only when a type is meaningless without one other class, and then the real question is which kind. This is the flow I follow:",
        },
        {
          type: "diagram",
          text: `Does anything outside this one class use the type?
├─ yes ──► top-level class, record, enum or interface
└─ no, it only makes sense next to one class
   │
   ├─ Does each instance need a specific outer object?
   │   ├─ no ──► static nested
   │   │         (Builder, Entry/Node, request/response records)
   │   └─ yes ─► Is it handed to anything that can outlive
   │             the outer object (registry, cache, thread)?
   │             ├─ no ──► inner class (iterator, view)
   │             └─ yes ─► static nested, holding only the
   │                       fields it needs
   │
   └─ Is it a one-off implementation inside one method?
       ├─ one abstract method of an interface
       │      ──► lambda or method reference
       ├─ state, several methods, or an abstract class
       │      ──► anonymous class
       └─ needed twice in the method, or plain data
              ──► local class, or a local record`,
          caption: "Static nested is the default branch. Inner classes and capturing callbacks need a reason.",
        },
        {
          type: "table",
          headers: ["Situation", "Choice", "Why"],
          rows: [
            ["`Car` with four optional fields", "Static nested `Builder`", "It exists before the car does, and nest access lets it call the private constructor"],
            ["Request and response bodies used only by `OrderController`", "Nested records", "Implicitly static, so Jackson can create them"],
            ["Walking a `Bookshelf`'s private array", "Private inner iterator", "Each iterator needs its own shelf's live fields"],
            ["A save listener on an app-wide event bus", "Static nested listener holding the document id, unregistered on close", "The bus outlives every window"],
            ["Sort products by rating, then price", "`Comparator.comparing...` or a lambda", "One method, no state"],
            ["A discount rule with `applies`, `adjust` and a counter", "Anonymous subclass, or a named class once it's reused or tested", "Two methods and state rule out a lambda"],
            ["Per-region totals inside one report method", "Local record", "Names an intermediate shape and carries no hidden fields"],
            ["`RegionStats` needed by two services", "Top-level record", "Nested in one service, it would make the other depend on that service"],
          ],
        },
        {
          type: "list",
          items: [
            "Write `static` first. Remove it only when I can say why every instance needs the outer object.",
            "Never hand an inner object, an anonymous class created in an instance method, or a lambda that uses `this` to something that lives longer than the outer object, unless keeping the outer object alive that long is the intent.",
            "Lambdas and method references for one-method callbacks; an anonymous class only for state, several methods or an abstract supertype; a named class once it's longer than a screen or needs its own tests.",
            "If a nested type is imported all over the codebase, it wanted to be top-level. Nesting expresses belonging, not package organisation.",
          ],
        },
        {
          type: "paragraph",
          text: "One right and one wrong choice from this lesson. `Car.Builder` as a `public static final` nested class is right: nothing about building a car needs an existing car. `EditorWindow.SaveBanner` as an inner class registered on a static bus is wrong: the bus outlives the window and drags it along, the chain from the Inner Classes diagram, which the production section turns into an `OutOfMemoryError`. The When to Use What in Java OOP lesson puts this choice next to the rest of the phase's, like strategy classes versus lambdas and records versus classes.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Creating an inner object without an outer one",
        },
        {
          type: "paragraph",
          text: "A builder that lost its `static`, used from its own `main` and from another class:",
        },
        {
          type: "code",
          language: "java",
          title: "Car.java",
          code: `public class Car {
    private final String color;

    private Car(Builder b) { this.color = b.color; }

    class Builder {                                   // forgot static
        private String color;
        Builder color(String c) { this.color = c; return this; }
        Car build() { return new Car(this); }
    }

    public static void main(String[] args) {
        Car car = new Builder().color("Red").build();
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "BuilderUser.java",
          code: `public class BuilderUser {
    public static void main(String[] args) {
        Car car = new Car.Builder().color("Red").build();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Car.java BuilderUser.java",
        },
        {
          type: "output",
          text: `Car.java:13: error: non-static variable this cannot be referenced from a static context
        Car car = new Builder().color("Red").build();
                  ^
BuilderUser.java:3: error: an enclosing instance that contains Car.Builder is required
        Car car = new Car.Builder().color("Red").build();
                  ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "Both errors say the same thing: `Builder` is an inner class, so every `new Builder()` needs a `Car` to attach to, and a static method has none. The first message is confusing until I read it as \"I needed `this` to use as the outer instance\". The fix is the missing `static`, not `new Car(...).new Builder()`: a builder that needs a finished car defeats its purpose.",
        },
        {
          type: "heading",
          text: "A request DTO declared without static",
        },
        {
          type: "paragraph",
          text: "Request bodies are often declared inside the controller that uses them. Without `static`, Jackson can't create them, because the only constructor takes the controller instance. I reproduced it with Jackson 2.21.7 (`com.fasterxml.jackson.core:jackson-databind`):",
        },
        {
          type: "code",
          language: "java",
          title: "OrderController.java",
          code: `import com.fasterxml.jackson.databind.ObjectMapper;

public class OrderController {
    class OrderRequest {                                       // forgot static
        public String product;
        public int quantity;
    }

    record OrderRequestBody(String product, int quantity) {}    // implicitly static

    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        String json = "{\\"product\\":\\"Keyboard\\",\\"quantity\\":2}";
        System.out.println(mapper.readValue(json, OrderRequestBody.class));
        try {
            mapper.readValue(json, OrderRequest.class);
        } catch (Exception e) {
            System.out.println(e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp "$JACKSON" OrderController.java
java -cp "$JACKSON:." OrderController`,
        },
        {
          type: "output",
          text: `OrderRequestBody[product=Keyboard, quantity=2]
InvalidDefinitionException: Cannot construct instance of \`OrderController$OrderRequest\`: non-static inner classes like this can only by instantiated using default, no-argument constructor
 at [Source: REDACTED (\`StreamReadFeature.INCLUDE_SOURCE_IN_LOCATION\` disabled); line: 1, column: 2]`,
        },
        {
          type: "paragraph",
          text: "(`$JACKSON` is the classpath of `jackson-databind`, `jackson-core` and `jackson-annotations`; the typo \"can only by instantiated\" is in Jackson's message.) The record parsed fine, and a `static class OrderRequest` worked too when I tried it. `OrderRequest` doesn't even use the controller, so on JDK 21 it has no `this$0` field (`javap -p` shows only `OrderController$OrderRequest(OrderController)` as its constructor), but that constructor still takes an `OrderController`, and that's what Jackson can't satisfy. In a Spring controller this surfaces as a failed request body conversion on the first real request, not at startup.",
        },
        {
          type: "heading",
          text: "Capturing a classic for-loop counter",
        },
        {
          type: "paragraph",
          text: "`for (int i = 0; i < names.size(); i++) tasks.add(() -> System.out.println(\"notify \" + names.get(i)));` fails with `local variables referenced from a lambda expression must be final or effectively final`, because `i++` reassigns the one `i`. The enhanced `for` declares a fresh variable per iteration, so `for (String name : names) tasks.add(() -> System.out.println(\"notify \" + name));` compiles, and so does copying the counter into `int index = i;` inside the loop body. I ran both fixes, and each notified Asha, Ravi and Meera in order.",
        },
        {
          type: "heading",
          text: "Double brace initialization",
        },
        {
          type: "paragraph",
          text: "`return new HashMap<>() {{ put(\"Kolkata\", 40); put(\"Pune\", 60); }};` looks like a neat map literal. The outer braces are an anonymous subclass of `HashMap` and the inner ones its instance initializer, so every such map is a new class file and its class isn't `HashMap`. I put one in an instance method of a `ShippingConfig` class that also held a 5 MB `byte[]`: `getClass().getName()` printed `ShippingConfig$1`, and `javap -p 'ShippingConfig$1'` showed `final ShippingConfig this$0`. The initializer never touches `ShippingConfig`, but `HashMap` is `Serializable`, so `javac` keeps the field anyway, and every caller holding this \"constant\" map keeps the 5 MB alive. `Map.of(\"Kolkata\", 40, \"Pune\", 60)` has none of these problems and is immutable.",
        },
        {
          type: "heading",
          text: "Three more, covered above",
        },
        {
          type: "list",
          items: [
            "Converting an anonymous class to a lambda when its body uses `this` to mean the callback object: `OneShot` in the Examples kept a listener registered forever.",
            "Calling an outer method from an inner class that declares a method with the same name: the comb rule from Shadowing and Name Resolution hides every outer overload.",
            "Serializing inner, local or anonymous classes. Java's serialization specification strongly discourages it: the synthetic fields and class names are compiler-specific, and the outer object gets serialized along with the inner one. The Serialization lesson later in this track covers it; anything `Serializable` should be top-level or static nested.",
          ],
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Make nested classes `static` unless each instance needs the outer object, and be able to say why when it does.",
            "Declare request and response DTOs as records or static nested classes, never as inner classes.",
            "Use lambdas or method references for single-method callbacks, and `Comparator` combinators instead of hand-written `compare` bodies.",
            "Give anything registered with a long-lived component (event bus, scheduler, cache, executor) an unregister path, and let it capture only what it needs.",
            "Keep anonymous and inner classes short. One that grows past a screen deserves a name and its own tests.",
            "Use `Map.of`, `List.of` or a static initializer instead of double brace initialization.",
            "Don't count on `javac` dropping an unused `this$0`. Libraries built for release 17 or earlier keep it, and a single new outer-field access brings it back.",
            "Avoid reusing names across nesting levels. Needing `Outer.this.x` often means two things share a name that shouldn't.",
            "Use a local record for intermediate data inside one method instead of `Object[]` or `Map<String, Object>`.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "At run time nested classes are ordinary classes, so most of their costs are the costs of any class. The one per-object cost specific to them is the hidden reference:",
        },
        {
          type: "table",
          headers: ["One object of", "JDK 21", "JDK 25, compact headers"],
          rows: [
            ["Static nested class, one `int`", "16 bytes", "16 bytes"],
            ["Inner class, one `int` + `this$0`", "24 bytes", "16 bytes"],
            ["Static nested class, two `int`s", "24 bytes", "16 bytes"],
            ["Inner class, two `int`s + `this$0`", "24 bytes", "24 bytes"],
          ],
        },
        {
          type: "paragraph",
          text: "I measured these the same way as `AllocSize` in the Memory Allocation lesson: `ThreadMXBean.getThreadAllocatedBytes` before and after a single `new`, after a warm-up, with inner classes that read an outer field so they really keep `this$0`. The last column is JDK 25 with `-XX:+UseCompactObjectHeaders` (JEP 519); JDK 25 with default flags matched JDK 21.",
        },
        {
          type: "list",
          items: [
            "`this$0` is one 4-byte compressed reference. Whether it costs anything depends on padding: 8 extra bytes for the one-`int` class on JDK 21 and nothing for the two-`int` class, while with compact headers (8 bytes instead of 12) it's the other way round. The bytes are rarely what matters; the retention is.",
            "Every nested, local and anonymous class is a full class: a class file, loading, verification and its own metadata in Metaspace. Lambdas don't ship class files, but the first execution of each lambda expression runs the bootstrap method and spins a hidden class, which costs more than loading a small class file. After that the call site is linked.",
            "Calls through a lambda or an anonymous class are the same `invokeinterface`, and the JIT can inline either. I don't pick one over the other for call speed.",
            "A non-capturing lambda allocated nothing per evaluation on HotSpot (the same object came back twice in `LambdaClasses`). A capturing lambda or an anonymous class allocates one small object per evaluation, which escape analysis can remove when it doesn't escape (the Memory Allocation lesson).",
          ],
        },
      ],
    },
    {
      title: "Nested Classes in Production",
      blocks: [
        {
          type: "paragraph",
          text: "The nested-class bug I'd most expect in a long-running service is a listener leak. Picture a ride-tracking screen object, server-side, holding a 4 MB tile cache and registering a status listener on an app-wide event bus. The listener is an inner class, because reading `rideId` directly was convenient. Screens get closed, but nothing unregisters the listener. I reproduced it on a 64 MB heap, with the fixes as modes:",
        },
        {
          type: "code",
          language: "java",
          title: "RideScreenLeak.java",
          code: `import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

public class RideScreenLeak {
    interface RideStatusListener { void onStatus(String rideId, String status); }

    // App-wide event bus: a static list, alive as long as the JVM
    static final List<RideStatusListener> LISTENERS = new ArrayList<>();

    static class RideScreen {
        private final String rideId;
        private final byte[] mapTiles = new byte[4 * 1024 * 1024];   // 4 MB tile cache
        private RideStatusListener listener;

        RideScreen(String rideId) { this.rideId = rideId; }

        // Leaky: an inner class, so it carries this$0, the whole screen
        class StatusBanner implements RideStatusListener {
            public void onStatus(String id, String status) {
                if (id.equals(rideId)) System.out.println("banner " + rideId + ": " + status);
            }
        }

        // Fixed: static nested, holds only the id it needs
        static class StatusText implements RideStatusListener {
            private final String rideId;
            StatusText(String rideId) { this.rideId = rideId; }
            public void onStatus(String id, String status) {
                if (id.equals(rideId)) System.out.println("text " + rideId + ": " + status);
            }
        }

        void open(String mode) {
            listener = mode.equals("leaky") ? new StatusBanner() : new StatusText(rideId);
            LISTENERS.add(listener);
        }

        void close(String mode) {
            if (mode.equals("unregister")) LISTENERS.remove(listener);
        }
    }

    public static void main(String[] args) {
        String mode = args[0];                        // leaky | nested | unregister

        RideScreen first = new RideScreen("R-1");
        first.open(mode);
        for (RideStatusListener l : LISTENERS) l.onStatus("R-1", "DRIVER_ASSIGNED");
        first.close(mode);
        WeakReference<RideScreen> probe = new WeakReference<>(first);
        first = null;                                 // the rider left the screen
        System.gc();
        System.out.println("R-1 screen collected after close? " + (probe.get() == null));

        int i = 2;
        try {
            for (; i <= 1_000; i++) {                 // a thousand more riders open and close it
                RideScreen s = new RideScreen("R-" + i);
                s.open(mode);
                s.close(mode);
            }
            System.out.println("closed 1000 screens, listeners=" + LISTENERS.size());
        } catch (OutOfMemoryError e) {                // caught only to print where it died
            System.out.println("OutOfMemoryError at screen R-" + i + ", listeners=" + LISTENERS.size());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac RideScreenLeak.java
java -Xmx64m RideScreenLeak leaky
java -Xmx64m RideScreenLeak nested
java -Xmx64m RideScreenLeak unregister`,
        },
        {
          type: "output",
          text: `# leaky
banner R-1: DRIVER_ASSIGNED
R-1 screen collected after close? false
OutOfMemoryError at screen R-13, listeners=12
# nested
text R-1: DRIVER_ASSIGNED
R-1 screen collected after close? true
closed 1000 screens, listeners=1000
# unregister
text R-1: DRIVER_ASSIGNED
R-1 screen collected after close? true
closed 1000 screens, listeners=0`,
        },
        {
          type: "list",
          items: [
            "**leaky:** this is the chain from the diagram in Inner Classes, with a `RideScreen` in place of the `EditorWindow`. The first screen was still reachable after close and an explicit `System.gc()`, so the `WeakReference` probe never cleared. Every closed screen kept its 4 MB of tiles, and the heap ran out at screen R-13 with 12 screens retained. Three runs gave the same output.",
            "The chain is in the class files. `javap -p` on `RideScreenLeak$RideScreen$StatusBanner` showed `final RideScreenLeak$RideScreen this$0`. The static list is a GC root, the list holds the banner, the banner holds the screen, the screen holds `mapTiles`. In a heap dump, that's the path to GC roots I'd look for, with `StatusBanner` sitting between the list and the screen.",
            "**nested:** `StatusText` has only `private final java.lang.String rideId`, no `this$0`, so each screen was collectable right after close and 1,000 screens ran fine. The list still grew to 1,000 entries: a much smaller leak, but still a leak.",
            "**unregister:** removing the listener in `close()` kept the list empty. That's the real fix. The static nested class is what keeps a forgotten unregister from costing 4 MB a time.",
            "An anonymous listener or a lambda that reads `rideId` leaks the same way, because both capture the screen. A lambda that only uses a local copy (`String id = rideId;` before it) captures just the string. And I catch `OutOfMemoryError` here only to print where it died; a real service should fail fast with `-XX:+ExitOnOutOfMemoryError` and a heap dump, as in the Memory Allocation lesson.",
          ],
        },
        {
          type: "heading",
          text: "A builder as a static nested class",
        },
        {
          type: "paragraph",
          text: "The Methods lesson's scenario questions showed why a long list of same-typed positional parameters invites swapped arguments. A ride request has two required fields and four optional ones (vehicle type, promo code, scheduled time, notes), the classic case for a builder. The builder is a static nested class: it has to exist before any `RideRequest` does, and nesting gives it the private constructor.",
        },
        {
          type: "code",
          language: "java",
          title: "RideRequest.java",
          code: `import java.time.LocalDateTime;
import java.util.Objects;
import java.util.function.Supplier;

public final class RideRequest {
    public enum VehicleType { BIKE, AUTO, MINI, SEDAN }

    private final String pickup, drop, promoCode, notes;
    private final VehicleType vehicleType;
    private final LocalDateTime scheduledAt;                     // null means "now"

    private RideRequest(Builder b) {                             // only build() can call this
        pickup = b.pickup;
        drop = b.drop;
        vehicleType = b.vehicleType;
        promoCode = b.promoCode;
        scheduledAt = b.scheduledAt;
        notes = b.notes;
    }

    public static Builder builder(String pickup, String drop) { return new Builder(pickup, drop); }

    @Override
    public String toString() {
        return pickup + " -> " + drop + ", " + vehicleType
            + (promoCode == null ? "" : ", promo=" + promoCode)
            + (scheduledAt == null ? ", now" : ", scheduled")
            + (notes == null ? "" : ", notes=" + notes);
    }

    public static final class Builder {
        private final String pickup, drop;                       // required
        private VehicleType vehicleType = VehicleType.MINI;      // optional, with a default
        private String promoCode, notes;
        private LocalDateTime scheduledAt;

        private Builder(String pickup, String drop) {
            this.pickup = Objects.requireNonNull(pickup, "pickup is required");
            this.drop = Objects.requireNonNull(drop, "drop is required");
        }

        public Builder vehicleType(VehicleType v)   { vehicleType = Objects.requireNonNull(v); return this; }
        public Builder promoCode(String code)       { promoCode = code; return this; }
        public Builder scheduledAt(LocalDateTime t) { scheduledAt = t; return this; }
        public Builder notes(String text)           { notes = text; return this; }

        public RideRequest build() {                             // every rule in one place
            if (pickup.equalsIgnoreCase(drop))
                throw new IllegalStateException("pickup and drop are the same: " + pickup);
            if (promoCode != null && !promoCode.matches("[A-Z0-9]{4,12}"))
                throw new IllegalStateException("bad promo code: " + promoCode);
            if (scheduledAt != null && scheduledAt.isBefore(LocalDateTime.now()))
                throw new IllegalStateException("scheduledAt is in the past");
            if (notes != null && notes.length() > 140)
                throw new IllegalStateException("notes longer than 140 characters");
            return new RideRequest(this);
        }
    }

    static void attempt(String label, Supplier<RideRequest> request) {
        try {
            System.out.println(label + ": " + request.get());
        } catch (IllegalStateException | NullPointerException e) {
            System.out.println(label + ": rejected, " + e.getMessage());
        }
    }

    public static void main(String[] args) {
        attempt("minimal", () -> builder("Salt Lake Sector V", "Howrah Station").build());
        attempt("full", () -> builder("Hinjewadi", "Pune Airport")
            .vehicleType(VehicleType.SEDAN)
            .promoCode("PUNE50")
            .notes("Two suitcases")
            .scheduledAt(LocalDateTime.now().plusHours(3))
            .build());
        attempt("same place", () -> builder("Park Street", "park street").build());
        attempt("bad promo", () -> builder("Park Street", "New Town").promoCode("free-ride!").build());
        attempt("past time", () -> builder("Park Street", "New Town")
            .scheduledAt(LocalDateTime.now().minusMinutes(5)).build());
        attempt("no drop", () -> builder("Park Street", null).build());
    }
}`,
        },
        {
          type: "output",
          text: `minimal: Salt Lake Sector V -> Howrah Station, MINI, now
full: Hinjewadi -> Pune Airport, SEDAN, promo=PUNE50, scheduled, notes=Two suitcases
same place: rejected, pickup and drop are the same: Park Street
bad promo: rejected, bad promo code: free-ride!
past time: rejected, scheduledAt is in the past
no drop: rejected, drop is required`,
        },
        {
          type: "list",
          items: [
            "Required fields go through `builder(pickup, drop)`, so a missing drop fails before `build()` is even reachable, with the message `drop is required`. Optional fields have defaults (`MINI`) or stay null.",
            "Every value is named at the call site. A promo code can't be swapped with the notes the way two adjacent `String` parameters in a six-argument constructor can.",
            "`build()` is the one place where cross-field rules live, and all three rejections happened before any `RideRequest` existed. The class is immutable and its only constructor is private.",
            "`Builder` calls the private `RideRequest(Builder)` constructor and `RideRequest` reads the builder's private fields; both work because they're nestmates. When I removed `static` from `Builder`, the `new Builder(pickup, drop)` inside the static `builder(...)` method failed with `non-static variable this cannot be referenced from a static context`.",
            "Lombok's `@Builder` generates the same shape. On a small `Promo` class with Lombok 1.18.40, `javap -v` on the generated `Promo$PromoBuilder` showed `public static` in its `InnerClasses` entry.",
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
              question: "What is a nested class, and what are the four kinds?",
              answer:
                "A class declared inside another class or interface. The four kinds are static nested classes, inner (non-static member) classes, local classes declared inside a block, and anonymous classes declared and instantiated in one expression.\n\nThe JLS calls the last three inner classes, because none of them is static. In my `Store` example, one of each compiled to its own class file: `Store$Address`, `Store$Cashier`, `Store$1Limit` and `Store$1`.",
            },
            {
              question: "What's the difference between a static nested class and an inner class?",
              answer:
                "An inner class instance is tied to one instance of the outer class and uses its members directly. A static nested class has no outer instance at all; it's a normal class filed under the outer class's name.\n\nThe difference is a real field. `javap -p` showed `final Store this$0` and a constructor taking a `Store` for the inner `Cashier`, and nothing of the sort for the static `Address`.",
            },
            {
              question: "Can a static nested class access the outer class's instance fields?",
              answer:
                "Not directly, because there's no outer instance to read them from. It can use the outer class's static members directly, private ones included, and instance members through an object reference.\n\nIn `PriceApi`, `Calculator` used the private static `SHIPPING` directly and read the private instance field `discount` as `api.discount`. Plain `discount` failed with `non-static variable discount cannot be referenced from a static context`.",
            },
            {
              question: "How do you create an instance of an inner class from outside the outer class, or from main?",
              answer:
                "With an outer object in front of `new`: `sales.new Employee(\"Asha\")`. Inside an instance method of the outer class, plain `new Employee(...)` works, because it means `this.new Employee(...)`.\n\nWriting `new Builder()` for an inner class in a static `main` fails with `non-static variable this cannot be referenced from a static context`: the compiler wants `this` as the outer instance, and a static method has none. From another class, the error is `an enclosing instance that contains Car.Builder is required`.",
            },
            {
              question: "What is an anonymous class, and when would you still use one?",
              answer:
                "A class without a name, declared and instantiated in one expression, that extends one class or implements one interface. I still use one when a lambda can't do the job: an abstract class as the supertype, more than one method, state of its own, or a callback that needs to refer to itself.\n\n`HappyHour` is the first kind of case: an anonymous `DiscountRule` passed a name to the abstract class's constructor, implemented `applies` and `adjust`, and counted how often it was applied. `OneShot` is the last kind: only the anonymous listener could unregister itself with `this`.",
            },
            {
              question: "What is a local class?",
              answer:
                "A class declared inside a method or other block. Its name exists only in that block. It can use the enclosing instance when the method isn't static, and the method's effectively final locals and parameters.\n\nIn `DueNotices`, the local class `Notice` read the parameters `member` and `days`, and `javap` showed them copied into fields named `val$member` and `val$days`. That copy is how it could still print them after the method had returned.",
            },
            {
              question: "What does `Outer.this` mean?",
              answer:
                "The enclosing instance of type `Outer`, seen from inside an inner class. Plain `this` is the inner object; `Outer.this` is the object it belongs to. I need it when a name is shadowed, or to pass the outer object somewhere.\n\n`Employee` had its own `name` field, so `name` was the person's name and `Department.this.name` was the department's. In the bytecode, `Department.this` is just `getfield this$0`.",
            },
            {
              question: "Are nested enums, records and interfaces static?",
              answer:
                "Yes, always, whether or not `static` is written, and since Java 16 the same holds for local records, enums and interfaces. None of them can capture an outer instance or local variables.\n\nReflection on JDK classes reported `public static final` for the enum `Thread.State` and `public abstract static interface` for `Map.Entry`. And a local record that read an outer field failed with `non-static variable unitPrice cannot be referenced from a static context`.",
            },
            {
              question: "Can a nested class use the outer class's private members, and can the outer class use the nested class's?",
              answer:
                "Yes, both ways. Private access in Java is scoped to the whole top-level class, so the outer class and every class nested in it, at any depth, can use each other's private fields, methods and constructors.\n\nIn `Bookshelf`, the inner `ShelfIterator` read the private `books` and `size`, and `Bookshelf.iterator()` called `new ShelfIterator()`, whose constructor `javap -p` showed as `private`. Since Java 11 the JVM allows this directly because the classes are nestmates; before that, `javac` generated `access$` bridge methods.",
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
              question: "Why must captured local variables be effectively final?",
              answer:
                "Because they're copied. A local class, anonymous class or lambda can outlive the method's frame, so the captured value is copied into the object (a `val$x` field) when it's created. If the local could change afterwards, the copy and the original would disagree, so Java forbids changing it.\n\n`DueNotices` returned `Notice` objects that printed `member` and `days` long after `dueNotice` had returned. Breaking the rule in `CaptureRules` gave `local variables referenced from an inner class must be final or effectively final`, reported at the use inside the class, not at the reassignment.",
            },
            {
              question: "What are the differences between an anonymous class and a lambda?",
              answer:
                "A lambda only implements a functional interface whose one abstract method isn't generic; an anonymous class can extend a class or implement any interface, with fields and several methods. Inside an anonymous class `this` is the anonymous object; inside a lambda it's the enclosing instance. An anonymous class has its own class file, while a lambda becomes a private method plus an `invokedynamic`, with a hidden class created at run time.\n\n`ProfileCard` printed \"the anonymous Runnable\" for `this` in the anonymous class and `ProfileCard(Asha)` in the lambda, and `LambdaClasses` showed `LambdaClasses$1` next to `LambdaClasses$$Lambda/0x...`.",
            },
            {
              question: "Can an inner class have static members? Since when?",
              answer:
                "Yes, since Java 16. JEP 395, the records JEP, removed the rule that inner classes could only declare static constant variables, mainly so they could contain records. Local and anonymous classes got the same freedom.\n\n`Order.Item` with a static counter compiled and ran on JDK 21 and printed `items created: 2`. Compiled with `--release 15`, the same file failed with `Illegal static declaration in inner class Order.Item` and `modifier 'static' is only allowed in constant variable declarations`.",
            },
            {
              question: "How many class files does javac produce for nested classes, and how are they named?",
              answer:
                "One per class, nested or not. Member classes become `Outer$Inner.class`, local classes `Outer$1Local.class` (with a number, because two methods may declare local classes with the same name), anonymous classes `Outer$1.class`, `Outer$2.class` in order of appearance, and deeper nesting adds more `$`. Lambdas produce none.\n\n`Store.java` produced five files, `Store`, `Store$Address`, `Store$Cashier`, `Store$1Limit` and `Store$1`, and nothing for its lambda.",
            },
            {
              question: "Can an anonymous class have a constructor?",
              answer:
                "No, there's no name to give one. It passes arguments to its superclass's constructor in the `new` expression and does its own setup in an instance initializer block.\n\n`new DiscountRule(\"happy hour\") { ... }` passed the name to `DiscountRule(String)`, and the `{ ... }` block in the body printed \"created rule: happy hour\" during creation, before anything else ran.",
            },
            {
              question: "When would you use a static nested class?",
              answer:
                "When a type belongs with one class but needs no particular instance of it: builders, `Map.Entry`-style entries and nodes, and request or response types only that class uses. It's also my default for any nested class until an instance genuinely needs the outer object.\n\n`Car.Builder` has to be static so it exists before any car does, and nesting still lets it call the private `Car(Builder)` constructor; without `static`, `new Builder()` in `main` didn't compile. In the JDK, reflection reported `static` for `HashMap.Node` and `private static` for `LinkedList.Node`.",
            },
            {
              question: "Why can't a lambda implement an abstract class, even one with a single abstract method?",
              answer:
                "Because a lambda can only target a functional interface. It isn't a subclass of anything, so it can't inherit an abstract class's fields, constructors or concrete methods.\n\n`price -> price / 2` for an abstract class `Discount` failed with `Discount is not a functional interface`, and for a two-method interface the message added `multiple non-overriding abstract methods found in interface PricingRule`. An anonymous class handles both cases.",
            },
            {
              question: "What does `this` refer to inside an anonymous class, and why does it matter when converting to a lambda?",
              answer:
                "The anonymous object itself, whereas in a lambda `this` is the enclosing instance. Code that uses `this` to mean the callback object changes meaning silently when converted, and still compiles if the method accepts an `Object`.\n\n`OneShot` showed it: the anonymous listener ran `LISTENERS.remove(this)` and the list went to 0. The lambda version ran the same line, tried to remove the `OneShot` object instead, and kept firing with one listener left.",
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
              question: "How does an inner class reach its outer instance at the bytecode level?",
              answer:
                "Through a synthetic field, `final Outer this$0`. `javac` adds an outer-instance parameter to every constructor, stores it in `this$0` before the superclass constructor runs, and rewrites outer member accesses as `this$0.member`. At the creation site it passes the outer reference, null-checked with `Objects.requireNonNull`.\n\n`javap -v` on `Store$Cashier` showed the field flagged `ACC_FINAL, ACC_SYNTHETIC` and the constructor doing `putfield this$0` before `invokespecial Object.<init>`. In `Department`, `sales.new Employee(\"Asha\")` compiled to `dup`, `invokestatic Objects.requireNonNull` and `pop` before the constructor call.",
            },
            {
              question: "Does every inner class instance hold a reference to its outer object?",
              answer:
                "Not any more. When compiling for release 18 or later, `javac` leaves out `this$0` if the class never uses the outer instance, unless the class is `Serializable`. The constructor still receives the outer object; it just isn't stored.\n\nIn `Screen`, only `UsesOuter` and the `Serializable` class kept `this$0` on JDK 21. With `--release 17`, every inner and anonymous class had it again, so a library built for Java 17 still pins outer objects whether it uses them or not.",
            },
            {
              question: "How did nested classes access each other's private members before Java 11, and what changed?",
              answer:
                "Before Java 11 the JVM saw them as unrelated classes, so `javac` generated synthetic bridge methods like `access$000` for private members used across the boundary. Java 11's nest-based access control (JEP 181) added the `NestHost` and `NestMembers` attributes, and the JVM now allows private access anywhere inside a nest.\n\n`javap -v Store` listed all four nested classes under `NestMembers`, each nested class had `NestHost: class Store`, and `Cashier` read the private `sold` field with a plain `getfield`. The Encapsulation lesson shows the `--release 8` bridge methods.",
            },
            {
              question: "How is a lambda compiled, and what is its class at run time?",
              answer:
                "The body becomes a private method of the enclosing class (`lambda$name$0`, static unless it uses `this`), and the expression becomes an `invokedynamic` whose bootstrap method is `LambdaMetafactory.metafactory`. The first time it runs, the bootstrap spins a hidden class implementing the interface and links the call site to it.\n\n`LambdaClasses` printed `LambdaClasses$$Lambda/0x...` with `isHidden()` true, and `-Xlog:class+load` showed it defined with `source: LambdaClasses` rather than loaded from a file, unlike `LambdaClasses$1`.",
            },
            {
              question: "Is a non-capturing lambda a singleton?",
              answer:
                "On HotSpot it effectively is, per call site: the call site is linked to one pre-built instance, so evaluating the same non-capturing lambda twice gives the same object. A capturing lambda gets a new object per evaluation. JLS 15.27.4 allows either behaviour, so code must not depend on it, for example with `==` or by locking on a lambda.\n\n`LambdaClasses` printed `same object? true` for `() -> 42`, `false` for `() -> base + 1`, and `false` for the anonymous class, as `new` always gives.",
            },
            {
              question: "Where is \"static\" recorded for a static nested class, given that the JVM has no static classes?",
              answer:
                "In the `InnerClasses` attribute, which stores each nested class's simple name, its outer class and its source-level modifiers. The nested class file's own access flags are ordinary top-level flags.\n\n`javap -v Store` showed `static #92= #53 of #8; // Address=class Store$Address of class Store`. Reflection's `getModifiers()` reads that entry, which is how `Thread$State` reported `public static final` in my check.",
            },
            {
              question: "What does an inner class instance cost in memory compared with a static nested one?",
              answer:
                "One reference, 4 bytes with compressed oops, which alignment padding may or may not absorb. The bigger cost is retention: everything the outer object references stays reachable for as long as the inner object is.\n\nI measured on JDK 21: a static nested class with one `int` was 16 bytes and the inner version 24; with two `int`s both were 24. The production example was the retention side: each closed 4 MB `RideScreen` stayed alive because a tiny listener held `this$0`.",
            },
            {
              question: "Why can a method in an inner class hide an outer method with a different signature?",
              answer:
                "Because method lookup across nesting levels is by name first (JLS 15.12.1). The compiler picks the innermost class that has any method with that name and only then does overload resolution among that class's methods. Outer overloads are never considered.\n\nIn my `AuditLog` test, an inner `log(String)` made `log(250)` fail with `incompatible types: int cannot be converted to String`, even though the outer class had `log(int)`. Writing `AuditLog.this.log(250)` fixed it.",
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
              question: "In the production example, a heap dump would show thousands of closed RideScreen objects retained through a listener registered on a static event bus. What happened, and how do you fix it?",
              answer:
                "The listener was an inner (or anonymous) class created inside `RideScreen`, so it holds `this$0` to its screen, and the static bus holds the listener. Screens are closed but never unregistered, so each one stays reachable from a GC root with all its data. The fix is to unregister on close, and to make the listener a static nested class, or a lambda, that captures only what it needs, like the ride id.\n\n`RideScreenLeak` reproduced it: with the inner listener the first screen was never collected and the run hit `OutOfMemoryError` at screen R-13 on a 64 MB heap. The static nested listener let every screen be collected, and unregistering kept the list empty.",
            },
            {
              question: "You're converting anonymous Comparator classes to lambdas across a codebase. What do you check?",
              answer:
                "That each one really is a single stateless method, that its body doesn't use `this` to mean the comparator, and that no lambda parameter name clashes with a local in the enclosing method. Then I check whether it should become `Comparator.comparing(...)` rather than a lambda copying the same arithmetic.\n\n`ProductSort` gave the same order from the anonymous and the composed version, and the composed one has no hand-written comparison to get backwards. The two ways a mechanical conversion breaks are the `this` change from `OneShot` and the `variable city is already defined` error from the comparison table.",
            },
            {
              question: "Design a builder for a request with two required fields and four optional ones, like the ride request in the production example.",
              answer:
                "A `public static final class Builder` nested inside an immutable `RideRequest`: required fields as parameters of a `builder(pickup, drop)` factory, defaults for optional ones, fluent setters, and a `build()` that checks every cross-field rule before calling the private `RideRequest(Builder)` constructor.\n\nIt has to be static, because it exists before any request does, and nest access lets it call the private constructor. My `RideRequest` rejected identical pickup and drop, a malformed promo code, a past `scheduledAt` and a null drop, each with its own message. Without `static`, the `new Builder(...)` in the static factory failed to compile.",
            },
            {
              question: "Jackson throws \"non-static inner classes like this can only by instantiated using default, no-argument constructor\" for a request body. What's wrong?",
              answer:
                "The DTO is declared inside another class without `static`, so it's an inner class whose only constructor takes the outer instance, and Jackson has no outer object to pass. Making it `static`, or a record, which is implicitly static, fixes it.\n\nI reproduced it with Jackson 2.21.7: `OrderController$OrderRequest` failed with exactly that `InvalidDefinitionException`, while a nested record parsed the same JSON into `OrderRequestBody[product=Keyboard, quantity=2]`.",
            },
            {
              question: "A teammate builds constant maps with double brace initialization inside a Spring bean. What's your review comment?",
              answer:
                "Each `new HashMap<>() {{ ... }}` is a new anonymous subclass of `HashMap` with its own class file, and because it's created in an instance method it holds the bean through `this$0`. `HashMap` is `Serializable`, so `javac` keeps that field even when the initializer doesn't use it. I'd ask for `Map.of(...)`, which is immutable and adds no class.\n\nIn my `ShippingConfig` test, the map's class was `ShippingConfig$1` and `javap -p` showed `final ShippingConfig this$0`, so the returned map kept a 5 MB buffer in its outer object reachable.",
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
            "Write `Garage.java` with a private `city` field, a nested `record Spec(String model, int seats)` and an inner class `Car` whose `describe()` returns its plate plus `\" in \" + city`. In `main`, create a `Spec` with `new Garage.Spec(\"Dzire\", 4)` and a car with `garage.new Car(\"WB-02-1234\")` for a Kolkata garage, and print both on one line.",
            "Change the car line in `main` to plain `new Car(\"WB-02-1234\")`, compile, read the error, and put it back.",
            "Add `Runnable reminder(int minutes)` returning an anonymous `Runnable` that prints `service due in <minutes> min`, then a `whoAmI()` method that prints `this` from an anonymous `Runnable` and from a lambda, and a `toString()` returning `Garage(<city>)`. Before compiling, write down the class files you expect, then check with `ls *.class`.",
            "Run `javap -p 'Garage$Car'` and find the hidden field. Make `describe()` stop reading `city`, recompile and run `javap` again. Then recompile with `--release 17` and run it a third time.",
            "In `reminder`, store the anonymous class in a variable, add `minutes++;` after it, and return the variable. Compile, read the error, then undo it.",
            "Call `garage.reminder(30).run()` and `garage.whoAmI()` from `main`.",
            "Add `static Supplier<String> ping() { return () -> \"ping\"; }` and `static Supplier<String> ping(String to) { return () -> \"ping \" + to; }`, then print `ping() == ping()` and `ping(\"Asha\") == ping(\"Asha\")`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `Spec[model=Dzire, seats=4] WB-02-1234 in Kolkata`. Step 2 fails with `non-static variable this cannot be referenced from a static context`. Step 3 gives five class files: `Garage`, `Garage$Spec`, `Garage$Car`, `Garage$1` and `Garage$2`, one per anonymous class in order of appearance and none for the lambda. In step 4, `final Garage this$0` is there at first, disappears once `describe()` no longer reads `city` (the constructor still shows `Garage$Car(Garage, java.lang.String)`), and comes back with `--release 17`. Step 5 fails with `local variables referenced from an inner class must be final or effectively final`. Step 6 prints `service due in 30 min`, then `anonymous: Garage$2@` followed by a hash that changes every run (`Garage$1` if `whoAmI` comes first in the file), then `lambda: Garage(Kolkata)`. Step 7 printed `true` and then `false` on JDK 21: HotSpot reused the non-capturing lambda, and the capturing one was a new object each time.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `KINDS     static nested  member, static        no outer object
          inner          member, no static     hidden this$0
          local          declared in a block   captures val$x
          anonymous      new T(...) { ... }    Outer$1.class
          nested record / enum / interface: always static

CREATE    new Outer.Nested()       outer.new Inner()
          inside the outer class:  new Inner() == this.new Inner()
REACH OUT Outer.this.field         (the qualified this)

CAPTURE   locals are copied into the object at creation
          so they must be final or effectively final

JAVAC     Outer$Inner  Outer$1Local  Outer$1   (one file each)
          this$0 dropped if unused: release 18+, not Serializable
          NestHost / NestMembers (Java 11): no access$000
          InnerClasses attribute keeps names and "static"

LAMBDA    private lambda$m$0 + invokedynamic -> hidden class
          this = enclosing object, functional interfaces only
          non-capturing: one instance on HotSpot (not promised)

JAVA 16   static members in inner classes
          local records, enums, interfaces (capture nothing)

LEAK      static registry -> inner listener -> this$0
          -> outer object -> everything it holds
          fix: static nested + only what it needs, unregister`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Static nested is the default. An inner class is a deliberate choice that puts a hidden `this$0` in every instance, and an anonymous class or lambda created in an instance method can capture the outer object too.",
            "Captured locals are copies, which is the whole reason for the effectively-final rule. Lambdas differ from anonymous classes in `this`, scope, class files and object identity, and those differences are what break mechanical conversions.",
            "Next is When to Use What in Java OOP, the capstone of this phase. It puts this lesson's choice (static nested, inner, anonymous class or lambda) next to the others: interface or abstract class, inheritance or composition, record or class, and walks through a pricing-and-payments design.",
          ],
        },
      ],
    },
  ],
};
