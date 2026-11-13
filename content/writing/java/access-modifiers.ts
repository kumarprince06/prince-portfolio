import type { Lesson } from "../types";

export const accessModifiers: Lesson = {
  slug: "access-modifiers",
  date: "2026-11-07",
  title: "Access Modifiers",
  description:
    "How Java's four access levels really work, private, package-private, protected and public on members, constructors and types, with every cell of the classic table proved by javac, the JLS 6.6.2 protected rule, access-aware overriding and the illegal modifier combinations, down to class-file access flags, the JVM's link-time and verifier checks, reflection on JDK 21, and a Spring cache that never hit because its method was private.",
  tags: ["Core Java", "Access Modifiers", "Encapsulation", "protected"],
  sections: [
    {
      title: "What Access Modifiers Are",
      blocks: [
        {
          type: "paragraph",
          text: "The Packages lesson gave every class a full name and a home, and it ended on a boundary: some members are visible to the whole package and nothing outside it. That boundary is one of four. An **access modifier** decides which other code is allowed to name a class, field, method or constructor at all. Java has three keywords for it, `private`, `protected` and `public`, plus a fourth level that has no keyword: leaving the modifier out gives **package-private** access.",
        },
        {
          type: "paragraph",
          text: "The Encapsulation lesson used access modifiers as a tool: private state, public operations that keep the invariants. It showed the classic table, the `IllegalAccessError` a stale class file gets from the JVM, nestmates and what reflection can still do. This lesson is about the tool itself. I wanted every cell of that table proved by a compiler error rather than taken on trust, the strange `protected` rule that most people get wrong in interviews, how access interacts with inheritance and overriding, what the class file records, and where the JVM checks it again.",
        },
        {
          type: "paragraph",
          text: "The reason it matters beyond syntax is that access is how a codebase says what it promises. A `public` method is a promise to every caller in every package. A package-private class is a private detail of one feature. `protected` is a promise to every subclass anyone will ever write. Getting these wrong doesn't fail a build; it shows up a year later as an internal class another team depends on, or a cache annotation that silently does nothing. The production section rebuilds that second bug with real Spring.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The Encapsulation lesson covered the older history: Parnas and information hiding in 1972, Simula 67's later `hidden` and `protected`, Smalltalk's per-object privacy, and C++'s `public`, `private` and `protected` sections. Java 1.0 (January 1996) took the three C++ keywords, dropped C++'s `friend`, and made the package the unit of trust instead: a member with no modifier is visible to every class in its package. Java's `protected` also differs from C++'s, because it includes that whole package.",
        },
        {
          type: "paragraph",
          text: "Some of the earliest Java compilers also accepted a fifth combination, `private protected`, meaning subclasses only, without the package. It was dropped early and isn't in any edition of the Java Language Specification, starting with the first one in 1996. Today it's just an illegal combination:",
        },
        {
          type: "output",
          text: `IllegalCombos.java:7: error: illegal combination of modifiers: private and protected
    private protected int f;
                          ^`,
        },
        {
          type: "paragraph",
          text: "The other design choice that shapes this lesson: access is part of the class file, not just the source. Each member's modifier is stored as bits in its `access_flags`, and the JVM checks those bits itself when it links a class, because it can't assume the class file came from a compiler that followed the rules. Everything since 1.0 has been built on those two layers.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "Four access levels; package-private as the default", "The table in this lesson has been the same since"],
            ["JDK 1.1 (1997)", "Nested and inner classes, which can be `private` or `protected`", "The JVM had no idea about nesting, so `javac` added package-private `access$000` bridges to reach private members"],
            ["Java 1.2 (1998)", "`AccessibleObject.setAccessible`", "Reflection can switch the access check off for one member"],
            ["Java 8 (2014)", "Default and static methods in interfaces", "Interface methods with bodies, still implicitly `public`"],
            ["Java 9 (2017)", "Private interface methods (JEP 213); modules (JEP 261)", "Interfaces get private helpers; `public` stops meaning \"everywhere\" once a package isn't exported"],
            ["Java 11 (2018)", "Nest-based access control (JEP 181)", "Nested classes reach each other's private members without bridges"],
            ["Java 16 and 17 (2021)", "Strong encapsulation of JDK internals by default (JEP 396), then without a switch (JEP 403); sealed classes final in 17 (JEP 409)", "`setAccessible` on a JDK private member fails unless the package is opened; `sealed` and `non-sealed` join the non-access modifiers"],
            ["Java 17 (2021)", "Always-strict floating point (JEP 306)", "`strictfp` is still legal but now only earns a warning"],
            ["Java 20 (2023)", "`java.lang.reflect.AccessFlag` and `Class.accessFlags()`", "Reflection can return access flags as an enum set instead of an `int`"],
            ["Java 25 (2025)", "Compact source files and instance main methods (JEP 512)", "A `main` method no longer has to be `public`"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a company's office building with key cards.",
        },
        {
          type: "list",
          items: [
            "A **class** is one department's room, and `private` is the locked cabinet inside it. Every member of that department has the cabinet key, and the key opens every cabinet in that room, not only the one at their own desk. That's private being per class, not per object.",
            "A **package** is a floor. Package-private is the floor's common room: anyone whose desk is on that floor walks in, whatever their department.",
            "`protected` is the floor's common room plus the company's **franchise branches** in other cities (subclasses in other packages). A franchise manager can open the protected cabinets, but only the ones at their own branch or at branches that franchise from them, never the head office's or a sibling franchise's. That's the JLS 6.6.2 rule this lesson spends a section on.",
            "`public` is the **lobby**. Anyone off the street can come in and use it.",
            "The **badge reader at every door** is `javac`. The **security guard** who checks badges again when someone actually walks through is the JVM's link-time check. A visitor holding an old badge printed before the rules changed (a class file compiled against an older library) gets past nobody: the guard stops them with an `IllegalAccessError`.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down. In a real building, you can't put your desk on a floor just by saying so. In Java, on the classpath, any JAR can declare `package shop;` and get package-private access to `shop`. The Package-Private section shows the same trick letting unit tests in, and the two ways to lock it: sealed JARs and modules. And the building has a master key: reflection with `setAccessible(true)` opens my own classes' private members without any badge. Access modifiers are a design boundary the compiler and JVM enforce, not a security boundary against code already running in the same JVM.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The four levels",
        },
        {
          type: "table",
          headers: ["Modifier", "Same class (and its nest)", "Same package", "Subclass in another package", "Anywhere else"],
          rows: [
            ["`private`", "Yes", "No", "No", "No"],
            ["none (package-private)", "Yes", "Yes", "No", "No"],
            ["`protected`", "Yes", "Yes", "Yes, through its own type only", "No"],
            ["`public`", "Yes", "Yes", "Yes", "Yes (across modules only if the package is exported)"],
          ],
        },
        {
          type: "paragraph",
          text: "Each level is strictly wider than the one above it: `private` ⊂ package-private ⊂ `protected` ⊂ `public`. That ordering is what \"an override can't reduce visibility\" refers to later. The next section but one proves all sixteen cells with a two-package program.",
        },
        {
          type: "image",
          src: "/images/java/access-modifiers-visibility-rings.svg",
          alt: "Nested rings around one class, shop.Product, which declares private long costPaise, int stock, protected long pricePaise and public String name. The innermost box, Product itself, is where private is visible: only code inside Product and its nest. The next ring is package shop, where shop.Inventory, not a subclass, sees stock, pricePaise and name. The protected ring adds outlet.SaleProduct, a subclass in another package, which sees pricePaise and name, but protected only through this or a SaleProduct reference; product.pricePaise through a Product reference is denied by JLS 6.6.2. The outer public ring holds outlet.Checkout, unrelated to Product, which sees only name. A note says javac rejects every other cell and the JVM checks again at link time.",
          caption: "The same four fields from four places. Each ring lets in one more access level, and the protected ring comes with the own-type condition.",
        },
        {
          type: "heading",
          text: "How the compiler decides (JLS 6.6.1)",
        },
        {
          type: "paragraph",
          text: "For a member of a class `C`, `javac` asks one question per use, and it's always about where the **code** is written, never about which object is involved:",
        },
        {
          type: "list",
          items: [
            "**public**: accessible, provided the type it belongs to is accessible too. A public method of a package-private class is unreachable from other packages, because the class name itself isn't.",
            "**private**: accessible only if the use is inside the body of the **top-level class** that encloses the declaration. That's why nested classes can read each other's private members (the nest).",
            "**package-private**: accessible only from code in the same package as `C`.",
            "**protected**: accessible from the same package, and from the body of a subclass `S` in another package, with an extra condition on instance members: the expression on the left of the dot must be `S` or a subclass of `S` (JLS 6.6.2).",
          ],
        },
        {
          type: "heading",
          text: "Where each modifier can go",
        },
        {
          type: "table",
          headers: ["Declaration", "Allowed access modifiers", "Default with none written"],
          rows: [
            ["Top-level class, interface, enum, record", "`public` or none", "Package-private"],
            ["Member class, interface, enum, record", "All four", "Package-private (inside an interface: `public`)"],
            ["Field", "All four", "Package-private (inside an interface: `public static final`)"],
            ["Method", "All four", "Package-private (inside an interface: `public`, or `private` if declared so)"],
            ["Constructor", "All four", "Package-private; an enum's constructors are always `private`"],
            ["Default constructor `javac` adds", "Not written", "Same access as the class (JLS 8.8.9)"],
            ["Local variable, parameter", "None", "Not applicable: visible only in its block"],
            ["Local class, local record, anonymous class", "None", "Not applicable"],
            ["Interface member", "`public`, or `private` for methods (Java 9+)", "`public`; `protected` is an error"],
          ],
        },
        {
          type: "paragraph",
          text: "Two rules of thumb fall out of the table. Only members get the full set of four, because only members have something between \"my file\" and \"everyone\" that makes sense. And the defaults differ by context: package-private in a class, `public` in an interface, `private` for an enum's constructor. The Where Each Modifier Is Allowed section shows the real errors for the illegal spots.",
        },
        {
          type: "heading",
          text: "A note on vocabulary",
        },
        {
          type: "paragraph",
          text: "The JLS calls the no-keyword level **package access**. People also say default access, package-private or package-level; they all mean the same thing. \"Default\" got more confusing in Java 8, because the `default` keyword on an interface method has nothing to do with access, and a default method is `public`.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Access flags in the class file",
        },
        {
          type: "paragraph",
          text: "I compiled a class with one field, one method and one nested class at each level, plus a second package-private top-level class in the same file:",
        },
        {
          type: "code",
          language: "java",
          title: "Counter.java",
          code: `public class Counter {
    private int hidden;
    int shared;
    protected int inherited;
    public int open;

    private void reset() { }
    void bump() { }
    protected void onChange() { }
    public int value() { return open; }

    private static class Snapshot { }
    protected static class Listener { }
    static class Batch { }
    public static class Report { }
}

class CounterHelper { }`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Counter.java && ls *.class
javap -v -p Counter          # trimmed to the flags and InnerClasses`,
        },
        {
          type: "output",
          text: `Counter$Batch.class
Counter$Listener.class
Counter$Report.class
Counter$Snapshot.class
Counter.class
CounterHelper.class

  flags: (0x0021) ACC_PUBLIC, ACC_SUPER
  private int hidden;
    flags: (0x0002) ACC_PRIVATE
  int shared;
    flags: (0x0000)
  protected int inherited;
    flags: (0x0004) ACC_PROTECTED
  public int open;
    flags: (0x0001) ACC_PUBLIC
  public Counter();
    flags: (0x0001) ACC_PUBLIC
  private void reset();
    flags: (0x0002) ACC_PRIVATE
  void bump();
    flags: (0x0000)
  protected void onChange();
    flags: (0x0004) ACC_PROTECTED
  public int value();
    flags: (0x0001) ACC_PUBLIC
InnerClasses:
  public static #35= #26 of #8;           // Report=class Counter$Report of class Counter
  static #36= #28 of #8;                  // Batch=class Counter$Batch of class Counter
  protected static #37= #30 of #8;        // Listener=class Counter$Listener of class Counter
  private static #38= #32 of #8;          // Snapshot=class Counter$Snapshot of class Counter`,
        },
        {
          type: "table",
          headers: ["Flag", "Value", "Means"],
          rows: [
            ["`ACC_PUBLIC`", "`0x0001`", "`public`"],
            ["`ACC_PRIVATE`", "`0x0002`", "`private` (members and the `InnerClasses` entry only)"],
            ["`ACC_PROTECTED`", "`0x0004`", "`protected` (members and the `InnerClasses` entry only)"],
            ["none of the three", "`0x0000`", "Package-private: the absence of a flag, not a flag"],
            ["`ACC_SUPER`", "`0x0020`", "On every class `javac` emits; about `invokespecial` semantics, not access"],
          ],
        },
        {
          type: "list",
          items: [
            "Package-private has no bit of its own. `int shared` and `void bump()` are `(0x0000)`, and the JVM treats \"none of public, private, protected\" as package access (JVM specification 4.5 and 4.6 allow at most one of the three).",
            "`javac` added a default constructor, `public Counter()`, with `ACC_PUBLIC` because the class is public. That's JLS 8.8.9: the default constructor gets the class's access.",
            "`Counter` is `(0x0021) ACC_PUBLIC, ACC_SUPER`. `CounterHelper`, the second top-level class, came out as `(0x0020) ACC_SUPER` in its own `CounterHelper.class`: package-private, again by the absence of `ACC_PUBLIC`.",
          ],
        },
        {
          type: "heading",
          text: "A private class doesn't exist at the JVM level",
        },
        {
          type: "paragraph",
          text: "For a top-level class, JVMS 4.1 only defines `ACC_PUBLIC`. There's no way to write `ACC_PRIVATE` on a class file's own flags. So what happens to `private static class Snapshot`?",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -v -p 'Counter$Snapshot'     # trimmed
javap -p 'Counter$Listener' 'Counter$Batch'`,
        },
        {
          type: "output",
          text: `class Counter$Snapshot
  minor version: 0
  major version: 65
  flags: (0x0020) ACC_SUPER
  ...
  private Counter$Snapshot();
    descriptor: ()V
    flags: (0x0002) ACC_PRIVATE
...
NestHost: class Counter
InnerClasses:
  private static #17= #7 of #14;          // Snapshot=class Counter$Snapshot of class Counter

public class Counter$Listener {
  protected Counter$Listener();
}
class Counter$Batch {
  Counter$Batch();
}`,
        },
        {
          type: "list",
          items: [
            "`Counter$Snapshot.class` itself is `(0x0020) ACC_SUPER`: package-private. The word `private` survives only in the `InnerClasses` attribute, which is metadata for compilers and reflection.",
            "`protected static class Listener` became a **public** class file, `public class Counter$Listener`. A protected nested class has to be reachable from subclasses in other packages, and the closest class-level flag is `ACC_PUBLIC`.",
            "Each default constructor took the source-level access of its class: `private Counter$Snapshot()`, `protected Counter$Listener()`, package-private `Counter$Batch()`. That private constructor is why nothing outside the nest can instantiate `Snapshot`, even though the class file is package-private.",
            "What actually keeps `Snapshot` private is `javac` refusing to compile references to it from outside `Counter`, plus nestmate rules for its private members. The Nested and Inner Classes lesson takes the `InnerClasses`, `NestHost` and `NestMembers` attributes apart, and the Encapsulation lesson shows the pre-Java 11 `access$000` bridges they replaced.",
          ],
        },
        {
          type: "paragraph",
          text: "Reflection reads the source-level modifiers from `InnerClasses`, not the class file flags. I checked with both the old `Modifier` API and the `AccessFlag` set added in Java 20:",
        },
        {
          type: "code",
          language: "java",
          title: "NestedFlags.java",
          code: `import java.lang.reflect.Modifier;

public class NestedFlags {
    private static class Snapshot { }
    protected static class Listener { }
    static class Batch { }
    public static class Report { }

    public static void main(String[] args) {
        for (Class<?> c : new Class<?>[] {Snapshot.class, Listener.class, Batch.class, Report.class}) {
            System.out.printf("%-10s modifiers: %-17s accessFlags(): %s%n",
                    c.getSimpleName(), "\\"" + Modifier.toString(c.getModifiers()) + "\\"", c.accessFlags());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Snapshot   modifiers: "private static"  accessFlags(): [PRIVATE, STATIC]
Listener   modifiers: "protected static" accessFlags(): [PROTECTED, STATIC]
Batch      modifiers: "static"          accessFlags(): [STATIC]
Report     modifiers: "public static"   accessFlags(): [PUBLIC, STATIC]`,
        },
        {
          type: "heading",
          text: "The JVM's own check at link time (JVMS 5.4.4)",
        },
        {
          type: "paragraph",
          text: "A call site in a class file is a symbolic reference: class name, member name, descriptor. It says nothing about access. The first time an instruction like `new`, `getfield` or `invokevirtual` runs, the JVM resolves the reference and checks it against the target's flags. JVMS 5.4.4 lists the rules, and they mirror the JLS: a class is accessible if it's public, or in the same run-time package; a member is accessible if it's public, or protected with a subclass relation, or package-private in the same run-time package, or private in the same class or nest.",
        },
        {
          type: "paragraph",
          text: "The Encapsulation lesson triggered the member check with a field that became `private`. Here's the class check: a library made a public class package-private, and only the library was recompiled.",
        },
        {
          type: "code",
          language: "java",
          title: "engines/Engine.java (v1)",
          code: `package engines;

public class Engine {                       // v1: public
    public String start() {
        return "engine started";
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "engines/Engine.java (v2)",
          code: `package engines;

class Engine {                              // v2: package-private
    public String start() {
        return "engine started";
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "repair/Mechanic.java",
          code: `package repair;

import engines.Engine;

public class Mechanic {
    public static void main(String[] args) {
        System.out.println("mechanic ready");
        Engine engine = new Engine();
        System.out.println(engine.start());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# v1/engines/Engine.java, v2/engines/Engine.java, app/repair/Mechanic.java
javac -d out v1/engines/Engine.java app/repair/Mechanic.java && java -cp out repair.Mechanic
javac -d out v2/engines/Engine.java && java -cp out repair.Mechanic    # only the library changed
javac -d out -cp out app/repair/Mechanic.java                          # now recompile the caller`,
        },
        {
          type: "output",
          text: `mechanic ready
engine started

mechanic ready
Exception in thread "main" java.lang.IllegalAccessError: failed to access class engines.Engine from class repair.Mechanic (engines.Engine and repair.Mechanic are in unnamed module of loader 'app')
\tat repair.Mechanic.main(Mechanic.java:8)

app/repair/Mechanic.java:3: error: Engine is not public in engines; cannot be accessed from outside package
import engines.Engine;
              ^
app/repair/Mechanic.java:8: error: Engine is not public in engines; cannot be accessed from outside package
        Engine engine = new Engine();
        ^
app/repair/Mechanic.java:8: error: Engine is not public in engines; cannot be accessed from outside package
        Engine engine = new Engine();
                            ^
3 errors`,
        },
        {
          type: "list",
          items: [
            "`mechanic ready` printed before the error. The check isn't done when `Mechanic` is loaded; it's done when the `new` at line 8 first resolves `engines/Engine`. That's lazy resolution from the Class Loading lesson.",
            "The message names both classes and the module and loader they live in. \"Same run-time package\" in JVMS terms means the same package name **and** the same class loader, which the Packages lesson covers.",
            "Recompiling the caller turns the runtime failure into three compile errors, one for the import and two for line 8 (the type and the constructor call).",
          ],
        },
        {
          type: "heading",
          text: "How the verifier enforces the protected rule",
        },
        {
          type: "paragraph",
          text: "The protected rule has a part the link-time check can't see: which **object** the instruction touches. That part lives in the bytecode verifier (JVMS 4.10.1.8). To trigger it, I compiled a subclass in another package that reads a field through a parent-typed reference while the field was `public`, then made the field `protected` and recompiled only the parent:",
        },
        {
          type: "code",
          language: "java",
          title: "shapes/Shape.java (v1)",
          code: `package shapes;

public class Shape {
    public int sides = 4;                 // v1: public
}`,
        },
        {
          type: "code",
          language: "java",
          title: "shapes/Shape.java (v2)",
          code: `package shapes;

public class Shape {
    protected int sides = 4;              // v2: narrowed to protected
}`,
        },
        {
          type: "code",
          language: "java",
          title: "paint/Square.java",
          code: `package paint;

import shapes.Shape;

public class Square extends Shape {
    static int sidesOf(Shape other) {
        return other.sides;               // legal in v1, illegal in v2
    }

    public static void main(String[] args) {
        System.out.println("own: " + new Square().sides);
        System.out.println("other: " + sidesOf(new Shape()));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out v1/shapes/Shape.java app/paint/Square.java && java -cp out paint.Square
javac -d out v2/shapes/Shape.java && java -cp out paint.Square`,
        },
        {
          type: "output",
          text: `own: 4
other: 4

Error: Unable to initialize main class paint.Square
Caused by: java.lang.VerifyError: Bad access to protected data in getfield
Exception Details:
  Location:
    paint/Square.sidesOf(Lshapes/Shape;)I @1: getfield
  Reason:
    Type 'shapes/Shape' (current frame, stack[0]) is not assignable to 'paint/Square'
  Current Frame:
    bci: @1
    flags: { }
    locals: { 'shapes/Shape' }
    stack: { 'shapes/Shape' }
  Bytecode:
    0000000: 2ab4 0007 ac`,
        },
        {
          type: "list",
          items: [
            "This time not even `own: 4` printed. A `VerifyError` happens while the class is being linked, before `main` runs. The verifier walks `sidesOf`, sees a `getfield` on a protected field declared in a superclass from another run-time package, and checks the type of the object on the operand stack: `shapes/Shape`, which is not assignable to `paint/Square`.",
            "`javap -c` shows the two accesses differ in bytecode: `new Square().sides` compiles to `getfield #20 // Field sides:I` (qualified by `Square`), and `other.sides` to `getfield #7 // Field shapes/Shape.sides:I`. The verifier only cares about the stack type, which is what the JLS rule says in source terms.",
            "Out of curiosity I turned remote verification off with the diagnostic flags `-XX:+UnlockDiagnosticVMOptions -XX:-BytecodeVerificationRemote`. The program then printed `own: 4` and `other: 4`: the resolution check in JVMS 5.4.4 passed, because `Shape` is a superclass of `Square`, and only the verifier knew about the object rule. That's an experiment, not something to run with.",
            "Recompiling `Square` against v2 gives the source-level version: `app/paint/Square.java:7: error: sides has protected access in Shape`.",
          ],
        },
        {
          type: "heading",
          text: "Access also decides what overrides what",
        },
        {
          type: "paragraph",
          text: "Access isn't only checked, it's used. JVMS 5.4.5 defines overriding so that a method only overrides a package-private method from the same run-time package and never overrides a private one, and when `invokevirtual` picks which method runs, JVMS 5.4.6 selects a resolved private method directly, without looking for overrides. The Access and Inheritance section shows a method that looks like an override, compiles without a warning, and is never called through the parent.",
        },
      ],
    },
    {
      title: "Proving Every Cell of the Table",
      blocks: [
        {
          type: "paragraph",
          text: "Two packages, four classes: `shop.Product` declares one field at each level, `shop.Inventory` is a neighbour in the same package, `outlet.SaleProduct` is a subclass in another package, and `outlet.Checkout` is unrelated code in another package. Every line marked `DENIED` is a cell of the table that should say no.",
        },
        {
          type: "diagram",
          text: `src/
├── shop/
│   ├── Product.java       the class under test
│   └── Inventory.java     same package, not a subclass
└── outlet/
    ├── SaleProduct.java   subclass, other package
    └── Checkout.java      no relation, other package`,
          caption: "The source tree. javac -d out puts the classes under out/shop and out/outlet.",
        },
        {
          type: "code",
          language: "java",
          title: "shop/Product.java",
          code: `package shop;

public class Product {
    private long costPaise = 7_000;          // private
    int stock = 12;                           // package-private (no keyword)
    protected long pricePaise = 10_000;      // protected
    public String name = "Kettle";           // public

    public String describe() {               // same class: all four
        return name + " cost=" + costPaise + " stock=" + stock + " price=" + pricePaise;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "shop/Inventory.java",
          code: `package shop;

public class Inventory {                     // same package, not a subclass
    public static String check(Product p) {
        long cost = p.costPaise;             // DENIED: private
        return p.name + " stock=" + p.stock + " price=" + p.pricePaise;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "outlet/SaleProduct.java",
          code: `package outlet;

import shop.Product;

public class SaleProduct extends Product {  // subclass, another package
    public String label() {
        long cost = costPaise;               // DENIED: private
        int left = stock;                    // DENIED: package-private
        return name + " on sale at " + pricePaise * 80 / 100;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "outlet/Checkout.java",
          code: `package outlet;

import shop.Inventory;
import shop.Product;

public class Checkout {                      // another package, not a subclass
    public static void main(String[] args) {
        Product p = new Product();
        long cost = p.costPaise;             // DENIED: private
        int left = p.stock;                  // DENIED: package-private
        long price = p.pricePaise;           // DENIED: protected
        System.out.println("class:      " + p.describe());
        System.out.println("package:    " + Inventory.check(p));
        System.out.println("subclass:   " + new SaleProduct().label());
        System.out.println("world:      " + p.name);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out src/shop/*.java src/outlet/*.java`,
        },
        {
          type: "output",
          text: `src/shop/Inventory.java:5: error: costPaise has private access in Product
        long cost = p.costPaise;             // DENIED: private
                     ^
src/outlet/Checkout.java:9: error: costPaise has private access in Product
        long cost = p.costPaise;             // DENIED: private
                     ^
src/outlet/Checkout.java:10: error: stock is not public in Product; cannot be accessed from outside package
        int left = p.stock;                  // DENIED: package-private
                    ^
src/outlet/Checkout.java:11: error: pricePaise has protected access in Product
        long price = p.pricePaise;           // DENIED: protected
                      ^
src/outlet/SaleProduct.java:7: error: costPaise has private access in Product
        long cost = costPaise;               // DENIED: private
                    ^
src/outlet/SaleProduct.java:8: error: stock is not public in Product; cannot be accessed from outside package
        int left = stock;                    // DENIED: package-private
                   ^
6 errors`,
        },
        {
          type: "paragraph",
          text: "Exactly six errors, one per \"No\" in the table, and none for the ten \"Yes\" cells. Then I deleted the six marked lines and ran it:",
        },
        {
          type: "code",
          language: "bash",
          code: `sed -i '/DENIED/d' src/shop/*.java src/outlet/*.java
javac -d out src/shop/*.java src/outlet/*.java && java -cp out outlet.Checkout`,
        },
        {
          type: "output",
          text: `class:      Kettle cost=7000 stock=12 price=10000
package:    Kettle stock=12 price=10000
subclass:   Kettle on sale at 8000
world:      Kettle`,
        },
        {
          type: "table",
          headers: ["Accessed from", "costPaise (private)", "stock (none)", "pricePaise (protected)", "name (public)"],
          rows: [
            ["`Product.describe`", "Yes", "Yes", "Yes", "Yes"],
            ["`Inventory` (same package)", "error", "Yes", "Yes", "Yes"],
            ["`SaleProduct` (subclass, other package)", "error", "error", "Yes", "Yes"],
            ["`Checkout` (other package)", "error", "error", "error", "Yes"],
          ],
        },
        {
          type: "list",
          items: [
            "The three error messages are worth recognising on sight: \"has private access in\", \"is not public in ...; cannot be accessed from outside package\" for package-private, and \"has protected access in\".",
            "`Inventory` read `p.pricePaise` without being a subclass. Protected includes the package, which is the most common surprise about it.",
            "`SaleProduct` read `pricePaise` through `this` (implicitly). The next question, what happens through a `Product` reference, is where protected gets strange.",
          ],
        },
      ],
    },
    {
      title: "private in Depth",
      blocks: [
        {
          type: "heading",
          text: "Private belongs to the class, not the object",
        },
        {
          type: "paragraph",
          text: "The Encapsulation lesson showed this with `transferTo` writing `other.balance`: the JLS rule for `private` asks only where the code is written, never whose object it is. One more quick case, an `Employee` reading another `Employee`'s private salary, which is exactly what `compareTo` and `equals` need, then the flip side:",
        },
        {
          type: "code",
          language: "java",
          title: "SalaryCompare.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

class Employee implements Comparable<Employee> {
    private final String name;
    private final long salary;

    Employee(String name, long salary) {
        this.name = name;
        this.salary = salary;
    }

    boolean earnsMoreThan(Employee other) {
        return salary > other.salary;              // another object's private field
    }

    @Override
    public int compareTo(Employee other) {
        return Long.compare(salary, other.salary); // same again
    }

    @Override
    public String toString() {
        return name;
    }
}

public class SalaryCompare {
    public static void main(String[] args) {
        Employee asha = new Employee("Asha", 90_000);
        Employee ravi = new Employee("Ravi", 75_000);
        System.out.println("Asha earns more than Ravi: " + asha.earnsMoreThan(ravi));

        List<Employee> team = new ArrayList<>(List.of(asha, ravi, new Employee("Meera", 82_000)));
        Collections.sort(team);
        System.out.println("by salary: " + team);
    }
}`,
        },
        {
          type: "output",
          text: `Asha earns more than Ravi: true
by salary: [Ravi, Meera, Asha]`,
        },
        {
          type: "paragraph",
          text: "`Employee` and `SalaryCompare` are separate top-level classes here on purpose. If `Employee` were nested inside `SalaryCompare`, `main` could read `asha.salary` too, because the whole nest shares private access. The flip side of \"per class\": a subclass is a different class, so it can't see the private field it physically carries in every object:",
        },
        {
          type: "code",
          language: "java",
          title: "ManagerPeek.java",
          code: `class Employee {
    private long salary = 90_000;
}

class Manager extends Employee {
    long bonus() {
        return salary / 10;                        // inherited? no
    }
}

public class ManagerPeek { }`,
        },
        {
          type: "output",
          text: `ManagerPeek.java:7: error: salary has private access in Employee
        return salary / 10;                        // inherited? no
               ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Every `Manager` object still has the `salary` slot in its memory layout (the Inheritance lesson drew that layout), and `Employee`'s own methods still use it. It just isn't a **member** of `Manager`: JLS 8.2 says private members are not inherited. If `Manager` needs the value, `Employee` decides how, with a getter or a protected method.",
        },
        {
          type: "heading",
          text: "Private constructors",
        },
        {
          type: "paragraph",
          text: "A private constructor means only code inside the class (and its nest) can run `new`. I use it for four different jobs:",
        },
        {
          type: "code",
          language: "java",
          title: "PrivateConstructors.java",
          code: `import java.util.HashMap;
import java.util.Map;

final class Units {                                   // 1. utility class: no instances
    private Units() {
        throw new AssertionError("Units has no instances");
    }

    static long rupeesToPaise(long rupees) {
        return rupees * 100;
    }
}

final class Temperature {                             // 2. static factory with a cache
    private static final Map<Integer, Temperature> CACHE = new HashMap<>();
    private final int celsius;

    private Temperature(int celsius) {
        this.celsius = celsius;
    }

    static Temperature of(int celsius) {
        return CACHE.computeIfAbsent(celsius, Temperature::new);
    }

    @Override
    public String toString() {
        return celsius + " C";
    }
}

class Rectangle {                                     // 3. one private constructor all others call
    private final double width;
    private final double height;
    private final String kind;

    private Rectangle(double width, double height, String kind) {
        if (width <= 0 || height <= 0) {
            throw new IllegalArgumentException(kind + " needs positive sides");
        }
        this.width = width;
        this.height = height;
        this.kind = kind;
    }

    Rectangle(double width, double height) {
        this(width, height, "rectangle");
    }

    static Rectangle square(double side) {
        return new Rectangle(side, side, "square");
    }

    @Override
    public String toString() {
        return kind + " " + width + "x" + height;
    }
}

abstract class Shape {                                // 4. only nested classes can extend it
    private Shape() { }

    abstract double area();

    static final class Circle extends Shape {
        private final double r;
        Circle(double r) { this.r = r; }
        double area() { return Math.PI * r * r; }
    }

    static final class Square extends Shape {
        private final double side;
        Square(double side) { this.side = side; }
        double area() { return side * side; }
    }
}

public class PrivateConstructors {
    public static void main(String[] args) {
        System.out.println("1. " + Units.rupeesToPaise(250) + " paise");

        Temperature a = Temperature.of(21);
        Temperature b = Temperature.of(21);
        System.out.println("2. " + a + ", same object: " + (a == b));

        System.out.println("3. " + new Rectangle(3, 4) + " and " + Rectangle.square(5));
        try {
            Rectangle.square(-1);
        } catch (IllegalArgumentException e) {
            System.out.println("   " + e.getMessage());
        }

        Shape s = new Shape.Square(3);
        System.out.println("4. " + s.getClass().getSimpleName() + " area " + s.area());
    }
}`,
        },
        {
          type: "output",
          text: `1. 25000 paise
2. 21 C, same object: true
3. rectangle 3.0x4.0 and square 5.0x5.0
   square needs positive sides
4. Square area 9.0`,
        },
        {
          type: "list",
          items: [
            "**Utility class.** Without the private constructor, `javac` would add a default one with the class's access, and anyone in the package could write `new Units()`. The `AssertionError` also stops the class's own code from instantiating it by accident. `java.lang.Math` and `java.util.Collections` both have a private constructor for the same reason.",
            "**Static factory.** `Temperature.of(21)` returned the same object twice, so the class controls identity, caching and validation. `Integer.valueOf` and `List.of` are the JDK versions.",
            "**Chaining.** The one private constructor holds the validation, and the public paths (`new Rectangle(w, h)` and `square`) go through it. Callers can't pass an arbitrary `kind`.",
            "**Closed hierarchy.** A subclass constructor must call a superclass constructor, and only nestmates can call `Shape()`, so only `Circle` and `Square` can ever extend `Shape`. Since Java 17, `sealed` says that directly; this is the older trick, and it still works.",
            "The singleton is the fifth classic use, and the Reflection section shows it isn't airtight.",
          ],
        },
        {
          type: "paragraph",
          text: "From outside the class, each of those constructors is an error, including the implicit `super()` call a subclass makes:",
        },
        {
          type: "code",
          language: "java",
          title: "PrivateErrors.java",
          code: `class Units {
    private Units() { }
}

class Money {
    private Money() { }
}

class Rupee extends Money { }

class LinkedStack {
    private static class Node {
        int value;
    }

    Node top() {
        return new Node();
    }
}

public class PrivateErrors {
    public static void main(String[] args) {
        Units u = new Units();
        LinkedStack.Node n = new LinkedStack().top();
        var v = new LinkedStack().top();
        System.out.println(v.value);
    }
}`,
        },
        {
          type: "output",
          text: `PrivateErrors.java:9: error: Money() has private access in Money
class Rupee extends Money { }
^
PrivateErrors.java:23: error: Units() has private access in Units
        Units u = new Units();
                  ^
PrivateErrors.java:24: error: Node has private access in LinkedStack
        LinkedStack.Node n = new LinkedStack().top();
                   ^
PrivateErrors.java:26: error: Node.value is defined in an inaccessible class or interface
        System.out.println(v.value);
                            ^
4 errors`,
        },
        {
          type: "list",
          items: [
            "`Rupee` failed at its declaration line, because the compiler-generated `Rupee()` constructor calls `super()`, and `Money()` is private.",
            "A private nested class can't even be **named** outside its top-level class: `LinkedStack.Node` is an error.",
            "Line 25 is the odd one: `var v = new LinkedStack().top();` compiled. `top()` is package-private, so anyone in the package can call it and hold the result, and `var` never has to write the type's name. Using the object failed on the next line with \"defined in an inaccessible class or interface\". A non-private method that returns a private type is a design smell; it should return a public interface or be private itself. The Examples section has a `LinkedStack` that gets this right.",
            "Inside the nest, private means nothing between the classes: a nested class reads the outer class's private fields, and the outer class reads the nested class's private fields and calls its private constructor. On Java 11 and later that works through `NestHost` and `NestMembers` attributes, with no generated methods; the Encapsulation lesson shows the `access$000` bridges it replaced, and Nested and Inner Classes has the `javap` detail.",
          ],
        },
      ],
    },
    {
      title: "Package-Private: The Default",
      blocks: [
        {
          type: "paragraph",
          text: "Package-private is what a class, field, method or constructor gets when I write no modifier. It's visible to every class in the same package and to nothing else, including subclasses in other packages, as `SaleProduct` found out with `stock`.",
        },
        {
          type: "paragraph",
          text: "Why it's the default: Java's designers made the package the unit of trust. Classes in one package are usually written and changed together, by the same people, so letting them see each other's details is cheap, while anything wider needs a deliberate keyword. Effective Java's Item 15 puts the consequence well: once a class or member is `public`, it's part of the API forever, but a package-private one can be changed or deleted in the next release without breaking anyone outside the package.",
        },
        {
          type: "heading",
          text: "Hiding implementation classes, and testing them",
        },
        {
          type: "paragraph",
          text: "The Packages lesson built the package-by-feature version of this: a public `OrderService` as the feature's entry point, a package-private `OrderRepository` behind it, and a `Shortcut` class in another package that `javac` stopped at the import with \"OrderRepository is not public in com.shop.order\". I won't repeat that run. The part it left for this lesson is the question everyone asks next: if the implementation classes are package-private, how do the tests reach them?",
        },
        {
          type: "diagram",
          text: `src/main/java/
└── orders/
    ├── OrderService.java          public: the feature's API
    └── PriceCalculator.java       package-private
src/test/java/
└── orders/
    └── PriceCalculatorTest.java   same package, other source root`,
          caption: "The Maven and Gradle layout: main and test code are separate directories that share package names.",
        },
        {
          type: "code",
          language: "java",
          title: "orders/PriceCalculator.java",
          code: `package orders;

class PriceCalculator {                              // package-private: an implementation detail
    long total(int quantity, long unitPaise) {
        long gross = quantity * unitPaise;
        return quantity >= 10 ? gross * 95 / 100 : gross;   // 5% off bulk orders
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "orders/PriceCalculatorTest.java",
          code: `package orders;                                      // same package, different source root

public class PriceCalculatorTest {
    public static void main(String[] args) {
        PriceCalculator calc = new PriceCalculator();  // package-private: allowed here
        check(calc.total(2, 5_000) == 10_000, "no discount below 10 units");
        check(calc.total(10, 5_000) == 47_500, "5% off at 10 units");
        System.out.println("PriceCalculatorTest: 2 checks passed");
    }

    static void check(boolean ok, String name) {
        if (!ok) throw new AssertionError(name);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out/main src/main/java/orders/PriceCalculator.java
javac -d out/test -cp out/main src/test/java/orders/PriceCalculatorTest.java
java -cp out/main:out/test orders.PriceCalculatorTest`,
        },
        {
          type: "output",
          text: `PriceCalculatorTest: 2 checks passed`,
        },
        {
          type: "list",
          items: [
            "The test compiled into a different output directory, from a different source root, and still used `PriceCalculator`. Access is about the **package name** (and, at run time, the class loader), not about directories. That's exactly how JUnit tests under `src/test/java` test package-private code in Maven and Gradle builds.",
            "Nothing had to be widened for the test, so `PriceCalculator` can still be renamed, merged or rewritten without anyone outside `orders` noticing. In a package-by-layer design (`service`, `repository`), it would have to be `public` just so the layers could call each other.",
          ],
        },
        {
          type: "heading",
          text: "Anyone can join a package",
        },
        {
          type: "paragraph",
          text: "The mechanism that lets tests in lets anything in. Any JAR on the classpath can declare `package orders;` and call `PriceCalculator`, as long as the same class loader defines it (a run-time package is the package name plus the loader, as the Packages lesson showed). Two features close that door. A JAR can mark its packages `Sealed: true` in the manifest, and the Packages lesson got `SecurityException: sealing violation` when another folder tried to add a class to a sealed package. Modules go further and refuse split packages outright, which the Java Modules lesson covers. Without either, package-private is a convention the compiler enforces, not a wall.",
        },
      ],
    },
    {
      title: "protected in Depth",
      blocks: [
        {
          type: "paragraph",
          text: "`protected` is package access **plus** access from subclasses in other packages. The plus part has conditions that are easy to state wrong, so I built one program that tries every case: a `Vehicle` in package `vehicles`, and `Car`, `Bike` and a `Workshop` in package `garage`.",
        },
        {
          type: "code",
          language: "java",
          title: "vehicles/Vehicle.java",
          code: `package vehicles;

public class Vehicle {
    protected int mileage;                       // protected instance field
    protected static int built;                  // protected static field

    protected Vehicle(int mileage) {             // protected constructor
        this.mileage = mileage;
        built++;
    }

    protected String service() {                 // protected instance method
        return getClass().getSimpleName() + " serviced at " + mileage + " km";
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "garage/Car.java",
          code: `package garage;

import vehicles.Vehicle;

public class Car extends Vehicle {
    public Car(int mileage) {
        super(mileage);                           // OK: protected constructor via super(...)
    }

    public int gap(Car other) {
        return other.mileage - this.mileage;      // OK: both are Car references
    }

    void rules(Car car, Vehicle vehicle, Bike bike) {
        int own = mileage;                        // OK: inherited, through this
        int viaCar = car.mileage;                 // OK: a Car reference
        int viaVehicle = vehicle.mileage;         // DENIED: a Vehicle reference
        int viaBike = bike.mileage;               // DENIED: a sibling subclass
        String s = vehicle.service();             // DENIED: methods follow the same rule
        String t = car.service();                 // OK
        int count = Vehicle.built;                // OK: static members are exempt
    }

    public static int builtSoFar() {
        return Vehicle.built;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "garage/Bike.java",
          code: `package garage;

import vehicles.Vehicle;

public class Bike extends Vehicle {
    public Bike(int mileage) {
        super(mileage);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "garage/Workshop.java",
          code: `package garage;

import vehicles.Vehicle;

public class Workshop {
    public static void main(String[] args) {
        Car a = new Car(12_000);
        Car b = new Car(15_500);
        System.out.println("gap: " + a.gap(b));
        System.out.println("built: " + Car.builtSoFar());

        Vehicle plain = new Vehicle(100);                    // DENIED: protected constructor
        Vehicle anon = new Vehicle(300) { };                 // OK: anonymous subclass
        System.out.println("anonymous subclass: " + anon.getClass().getName());
        System.out.println("built: " + Car.builtSoFar());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out src/vehicles/*.java src/garage/*.java`,
        },
        {
          type: "output",
          text: `src/garage/Car.java:17: error: mileage has protected access in Vehicle
        int viaVehicle = vehicle.mileage;         // DENIED: a Vehicle reference
                                ^
src/garage/Car.java:18: error: mileage has protected access in Vehicle
        int viaBike = bike.mileage;               // DENIED: a sibling subclass
                          ^
src/garage/Car.java:19: error: service() has protected access in Vehicle
        String s = vehicle.service();             // DENIED: methods follow the same rule
                          ^
src/garage/Workshop.java:12: error: Vehicle(int) has protected access in Vehicle
        Vehicle plain = new Vehicle(100);                    // DENIED: protected constructor
                        ^
4 errors`,
        },
        {
          type: "code",
          language: "bash",
          code: `sed -i '/DENIED/d' src/garage/*.java
javac -d out src/vehicles/*.java src/garage/*.java && java -cp out garage.Workshop`,
        },
        {
          type: "output",
          text: `gap: 3500
built: 2
anonymous subclass: garage.Workshop$1
built: 3`,
        },
        {
          type: "heading",
          text: "The rule, JLS 6.6.2.1",
        },
        {
          type: "paragraph",
          text: "Inside the body of a subclass `S` in another package, a protected instance field or method of the parent can be accessed through `this`, `super`, a bare name, or an expression whose type is `S` or a subclass of `S`. Through any other type, including the parent itself and sibling subclasses, it's an error. In this program `S` is `Car`, so `car.mileage` is fine, while `vehicle.mileage` and `bike.mileage` are not, even though all three objects have the field.",
        },
        {
          type: "diagram",
          text: `             Vehicle            protected int mileage
            /       \\
         Car         Bike       (both in package garage)

 code inside Car:    this.mileage      OK   (Car)
                     car.mileage       OK   (Car)
                     vehicle.mileage   NO   (could be any Vehicle)
                     bike.mileage      NO   (Bike is not a Car)
                     Vehicle.built     OK   (static: no object)`,
          caption: "A subclass in another package may use protected instance members only on objects it knows are its own kind.",
        },
        {
          type: "paragraph",
          text: "The reason is that `protected` is a contract between a class and **its** subclasses about the subclass's own implementation. `Car` is responsible for how a `Car` uses `mileage`; it has no business adjusting a `Bike`'s mileage, whose invariants `Bike` maintains. A `Vehicle` reference might point at a `Bike`, so it's rejected too. Without this rule, any class could read any protected member of any object by declaring a throwaway subclass and passing the object in as the parent type.",
        },
        {
          type: "list",
          items: [
            "**Static members are exempt.** `Vehicle.built` worked from `Car`: there's no object whose implementation `Car` might not own, so the own-type condition only applies to instance members.",
            "**Inside the same package, none of this applies.** `Workshop` could have read `vehicle.mileage` if it were in package `vehicles`, subclass or not. The condition only kicks in for the cross-package subclass case.",
            "**Constructors (JLS 6.6.2.2).** From another package, a protected constructor can only be called by a subclass constructor through `super(...)`, or by creating an anonymous subclass, `new Vehicle(300) { }`. A plain `new Vehicle(100)` failed even though it's a direct, unqualified call. `built: 3` shows the anonymous subclass really ran the protected constructor.",
            "**At run time** the JVM enforces the object part again, in the verifier, as `Square` showed in Internal Working.",
          ],
        },
        {
          type: "heading",
          text: "The rule hiding in plain sight: Object.clone()",
        },
        {
          type: "paragraph",
          text: "Every class is a subclass of `Object`, which lives in `java.lang`, and `Object.clone()` is `protected`. That makes `clone()` the most common place people hit JLS 6.6.2 without knowing its name:",
        },
        {
          type: "code",
          language: "java",
          title: "CloneCall.java",
          code: `import java.util.Arrays;

class Point {
    int x = 1, y = 2;
}

public class CloneCall {
    public static void main(String[] args) throws Exception {
        int[] scores = {90, 75};
        int[] copy = scores.clone();              // arrays: clone() is public
        System.out.println(Arrays.toString(copy));

        Point p = new Point();
        Object q = p.clone();                     // Point didn't override it
    }
}`,
        },
        {
          type: "output",
          text: `CloneCall.java:14: error: clone() has protected access in Object
        Object q = p.clone();                     // Point didn't override it
                    ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`CloneCall` is a subclass of `Object` in a different package, so it may call `clone()` only on a `CloneCall`. A `Point` isn't one. Arrays are the exception: JLS 10.7 gives every array type a `public` `clone()` override. A class that wants to be cloneable from outside overrides `clone()` as `public` (widening is allowed) and implements `Cloneable`; the Object Class Methods lesson covers the rest of that contract.",
        },
        {
          type: "heading",
          text: "protected is wider than it looks",
        },
        {
          type: "paragraph",
          text: "Because `protected` includes package access, a protected member is visible to every class in its package plus every subclass anyone ever writes, in any package. The Encapsulation lesson showed a non-subclass in the same package writing `account.balance = -1` through a protected field. My rule: `protected` goes on methods I've designed as extension points, and never on fields.",
        },
      ],
    },
    {
      title: "public and the File-Name Rule",
      blocks: [
        {
          type: "paragraph",
          text: "`public` is the simple level: any code that can see the type can use the member. Two details are less simple. A public member of a non-public class is only as visible as its class. And in the module system, `public` only reaches other modules if the package is exported, which is the Java Modules lesson's subject.",
        },
        {
          type: "paragraph",
          text: "The rule everyone learns first is that a `public` top-level class must live in a file with its name:",
        },
        {
          type: "code",
          language: "java",
          title: "Wrong.java",
          code: `public class Right {
}`,
        },
        {
          type: "output",
          text: `Wrong.java:1: error: class Right is public, should be declared in a file named Right.java
public class Right {
       ^
1 error`,
        },
        {
          type: "list",
          items: [
            "So a file has at most one public top-level type: adding `public class Another` to `TwoPublic.java` gives the same error, \"class Another is public, should be declared in a file named Another.java\". It can have any number of package-private ones, as `Counter.java` did with `CounterHelper`, and each still compiles to its own `.class` file.",
            "Strictly, JLS 7.6 says a host system that stores packages in a file system **may** enforce this; `javac` always does. The point is lookup: when `javac` needs `shop.Product`, it can go straight to `shop/Product.java` instead of scanning every file in the package.",
            "A file with no public type can have any name. `PrivateErrors.java` above contained four package-private top-level classes and one public one, named after the file.",
          ],
        },
        {
          type: "heading",
          text: "main no longer has to be public (JDK 25)",
        },
        {
          type: "paragraph",
          text: "For thirty years the launcher demanded `public static void main(String[])`. JEP 512, final in Java 25, relaxed the launch protocol: `main` can be package-private or protected (not private), static or instance, with or without the `String[]` parameter. I compiled the same class with JDK 21's `javac` and ran it on both runtimes:",
        },
        {
          type: "code",
          language: "java",
          title: "Launch.java",
          code: `class Launch {
    static void main(String[] args) {
        System.out.println("package-private static main");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Launch.java && java Launch           # JDK 21
$JDK25/bin/java Launch                      # same class file, JDK 25`,
        },
        {
          type: "output",
          text: `Error: Main method not found in class Launch, please define the main method as:
   public static void main(String[] args)
or a JavaFX application class must extend javafx.application.Application

package-private static main`,
        },
        {
          type: "paragraph",
          text: "Same bytes, different launcher. On JDK 25 a `private static void main` still gets the \"Main method not found\" message, so the rule is \"not private\", not \"anything goes\". This only changes how the launcher finds the entry point; it changes nothing about access checks anywhere else.",
        },
      ],
    },
    {
      title: "Where Each Modifier Is Allowed",
      blocks: [
        {
          type: "paragraph",
          text: "The table in The Technical Picture says where each modifier can go. These are the real errors for the places it can't.",
        },
        {
          type: "heading",
          text: "Top-level types: public or nothing",
        },
        {
          type: "code",
          language: "java",
          title: "PrivateTop.java",
          code: `private class PrivateTop {
}`,
        },
        {
          type: "output",
          text: `PrivateTop.java:1: error: modifier private not allowed here
private class PrivateTop {
        ^
1 error`,
        },
        {
          type: "code",
          language: "java",
          title: "ProtectedTop.java",
          code: `protected class ProtectedTop {
}`,
        },
        {
          type: "output",
          text: `ProtectedTop.java:1: error: modifier protected not allowed here
protected class ProtectedTop {
          ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Both make sense once I ask \"private to what?\". A member is private to its enclosing class, but a top-level class has no enclosing class, and the narrowest meaningful scope above it is the package, which is what no modifier already gives. `protected` would mean \"the package plus subclasses of... the package?\", which has no meaning either.",
        },
        {
          type: "heading",
          text: "Local variables and local classes: nothing",
        },
        {
          type: "code",
          language: "java",
          title: "LocalAccess.java",
          code: `public class LocalAccess {
    void run() {
        private int count = 0;
    }
}`,
        },
        {
          type: "output",
          text: `LocalAccess.java:3: error: illegal start of expression
        private int count = 0;
        ^
LocalAccess.java:5: error: class, interface, enum, or record expected
}
^
2 errors`,
        },
        {
          type: "paragraph",
          text: "A local class with an access modifier, `private class Helper { }` inside a method, fails with exactly the same two errors. These are parse errors, not access errors: the parser doesn't expect `private` at the start of a statement, gets confused, and then stumbles over the method's closing brace too, hence the second error. Locals don't need access control because their scope already limits them to one block, and a local variable lives in one stack frame, as the Methods lesson showed. Only `final` (and annotations) can go on a local variable; a local class can be `final` or `abstract` (or the now-redundant `strictfp`), but never `static` or an access modifier (JLS 14.3).",
        },
        {
          type: "heading",
          text: "Interface members: public, or private methods",
        },
        {
          type: "code",
          language: "java",
          title: "InterfaceRules.java",
          code: `interface Printer {
    protected void print(String s);
    private void helper();
    final void flush();
}
public class InterfaceRules { }`,
        },
        {
          type: "output",
          text: `InterfaceRules.java:2: error: modifier protected not allowed here
    protected void print(String s);
                   ^
InterfaceRules.java:4: error: modifier final not allowed here
    final void flush();
               ^
InterfaceRules.java:3: error: missing method body, or declare abstract
    private void helper();
                 ^
3 errors`,
        },
        {
          type: "list",
          items: [
            "`protected` is never allowed in an interface. Interface methods are implicitly `public` unless declared `private`; fields are implicitly `public static final`; member types are implicitly `public static`.",
            "`private` is allowed on methods since Java 9, but a private method needs a body: nobody else could ever implement it. The Access and Inheritance section uses one.",
            "Package-private interface methods don't exist; leaving out the modifier means `public`. That's the opposite of a class, and it's why forgetting `public` on the implementing method is a compile error.",
          ],
        },
        {
          type: "heading",
          text: "Enum constructors: private only",
        },
        {
          type: "code",
          language: "java",
          title: "PublicEnumCtor.java",
          code: `enum Coin {
    HEADS, TAILS;

    public Coin() { }
}

public class PublicEnumCtor { }`,
        },
        {
          type: "output",
          text: `PublicEnumCtor.java:4: error: modifier public not allowed here
    public Coin() { }
           ^
1 error`,
        },
        {
          type: "paragraph",
          text: "An enum's constants are its only instances, so its constructors are private whether I write `private` or nothing (JLS 8.9.2). The Examples section shows `javap` reporting `private` on a constructor declared without a modifier. Records have the opposite rule: the canonical constructor must be at least as accessible as the record (JLS 8.10.4), so only a `private` nested record can have a `private` canonical constructor.",
        },
      ],
    },
    {
      title: "Access and Inheritance",
      blocks: [
        {
          type: "paragraph",
          text: "A subclass inherits members according to their access (JLS 8.2 and 8.4.8): public and protected members always, package-private members only if the subclass is in the same package, and private members never. \"Not inherited\" has a consequence that surprised me: a method with the same signature in the subclass isn't an override, it's an unrelated method. To see it, I put one method at each of three levels into an `Invoice`, behind a `final` public `print`:",
        },
        {
          type: "code",
          language: "java",
          title: "billing/Invoice.java",
          code: `package billing;

public class Invoice {
    private String header() {                 // private: not inherited
        return "INVOICE";
    }

    String discountNote() {                   // package-private: inherited only inside billing
        return "no discount";
    }

    protected long taxPaise(long amount) {    // protected: inherited everywhere
        return amount * 18 / 100;
    }

    public final String print(long amount) {
        return header() + " | " + discountNote() + " | tax " + taxPaise(amount);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "billing/StaffInvoice.java",
          code: `package billing;

public class StaffInvoice extends Invoice {   // same package
    String header() {                         // a new method, not an override
        return "STAFF INVOICE";
    }

    @Override
    String discountNote() {                   // a real override
        return "staff discount 10%";
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "store/ExportInvoice.java",
          code: `package store;

import billing.Invoice;
import billing.StaffInvoice;

public class ExportInvoice extends Invoice {  // another package
    public String discountNote() {            // looks like an override; is not one
        return "export discount 5%";
    }

    @Override
    protected long taxPaise(long amount) {    // a real override
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(new Invoice().print(1_000));
        System.out.println(new StaffInvoice().print(1_000));
        System.out.println(new ExportInvoice().print(1_000));
        System.out.println(new ExportInvoice().discountNote());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -Xlint:all -d out src/billing/*.java src/store/*.java && java -cp out store.ExportInvoice`,
        },
        {
          type: "output",
          text: `INVOICE | no discount | tax 180
INVOICE | staff discount 10% | tax 180
INVOICE | no discount | tax 0
export discount 5%`,
        },
        {
          type: "list",
          items: [
            "`StaffInvoice.header()` never ran: the header stayed `INVOICE`. `Invoice.header()` is private, so `print` always calls `Invoice`'s own version. In `javap -c`, all three calls in `print` are `invokevirtual`, but when the resolved method is private, JVMS 5.4.6 selects it directly and never looks for an override.",
            "`StaffInvoice.discountNote()` did override, because it's in the same package. `@Override` compiled.",
            "`ExportInvoice.discountNote()` is the trap. It's `public`, same name, same signature, and `javac -Xlint:all` compiled it without a single warning. But `Invoice.discountNote()` is package-private and `ExportInvoice` is in another package, so it was never inherited and can't be overridden. `print` still said `no discount`, while calling it directly said `export discount 5%`.",
            "`taxPaise` is protected, so the override in another package worked: `tax 0`.",
          ],
        },
        {
          type: "paragraph",
          text: "`@Override` is what catches it. I added it to `discountNote()` in a copy of `ExportInvoice` under `bad/store` and compiled that against `out`:",
        },
        {
          type: "output",
          text: `bad/store/ExportInvoice.java:7: error: method does not override or implement a method from a supertype
    @Override
    ^
1 error`,
        },
        {
          type: "heading",
          text: "An override can't reduce visibility",
        },
        {
          type: "paragraph",
          text: "The Polymorphism lesson covered this from the caller's side: code that holds a parent reference may call anything the parent allows, so an override can keep or widen access but never narrow it. One line to recap it with the real error:",
        },
        {
          type: "code",
          language: "java",
          title: "Weaker.java",
          code: `class Shape {
    protected double area() { return 0; }
}

class Circle extends Shape {
    double area() { return 3.14; }
}

public class Weaker { }`,
        },
        {
          type: "output",
          text: `Weaker.java:6: error: area() in Circle cannot override area() in Shape
    double area() { return 3.14; }
           ^
  attempting to assign weaker access privileges; was protected
1 error`,
        },
        {
          type: "table",
          headers: ["Parent method", "Override may be", "Override may not be"],
          rows: [
            ["`public`", "`public`", "`protected`, package-private, `private`"],
            ["`protected`", "`protected`, `public`", "package-private, `private`"],
            ["package-private (same package only)", "package-private, `protected`, `public`", "`private`"],
            ["`private`", "Not overridable; any same-named method is new", "Not applicable"],
          ],
        },
        {
          type: "heading",
          text: "Interface members and private interface methods",
        },
        {
          type: "paragraph",
          text: "Interface methods are implicitly `public`, so an implementing method must be `public` too (Common Mistakes has the error). Java 8 gave interfaces default methods, and Java 9 (JEP 213) let them share code through private methods that implementors never see:",
        },
        {
          type: "code",
          language: "java",
          title: "LoggerDemo.java",
          code: `interface Logger {
    int MAX_LENGTH = 40;                          // implicitly public static final

    void log(String line);                        // implicitly public abstract

    default void info(String message) {           // implicitly public
        log(format("INFO", message));
    }

    default void warn(String message) {
        log(format("WARN", message));
    }

    private String format(String level, String message) {   // Java 9: private
        return "[" + level + "] " + trim(message);
    }

    private static String trim(String message) {               // private static
        return message.length() <= MAX_LENGTH ? message : message.substring(0, MAX_LENGTH) + "...";
    }
}

class ConsoleLogger implements Logger {
    @Override
    public void log(String line) {                // must be public
        System.out.println(line);
    }
}

public class LoggerDemo {
    public static void main(String[] args) {
        Logger logger = new ConsoleLogger();
        logger.info("Order 42 placed by Asha");
        logger.warn("Stock for SKU-7 is below the reorder level of 5 units");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac LoggerDemo.java && java LoggerDemo
javap -v -p Logger | grep -E "^  [a-z].*;$|^    flags"`,
        },
        {
          type: "output",
          text: `[INFO] Order 42 placed by Asha
[WARN] Stock for SKU-7 is below the reorder lev...
  public static final int MAX_LENGTH;
    flags: (0x0019) ACC_PUBLIC, ACC_STATIC, ACC_FINAL
  public abstract void log(java.lang.String);
    flags: (0x0401) ACC_PUBLIC, ACC_ABSTRACT
  public default void info(java.lang.String);
    flags: (0x0001) ACC_PUBLIC
  public default void warn(java.lang.String);
    flags: (0x0001) ACC_PUBLIC
  private java.lang.String format(java.lang.String, java.lang.String);
    flags: (0x0002) ACC_PRIVATE
  private static java.lang.String trim(java.lang.String);
    flags: (0x000a) ACC_PRIVATE, ACC_STATIC`,
        },
        {
          type: "list",
          items: [
            "Every implicit modifier is explicit in the class file: the constant is `0x0019` (`ACC_PUBLIC | ACC_STATIC | ACC_FINAL`) and the abstract method `0x0401` (`ACC_PUBLIC | ACC_ABSTRACT`). A default method is just a public non-abstract method; `javap` prints the word `default` because the method is in an interface and has a body.",
            "`format` and `trim` are `ACC_PRIVATE`. `ConsoleLogger` can't call them, can't override them, and the interface can change them freely. Before Java 9, the shared code had to be a public default method (part of the API) or a static method in a separate utility class.",
            "The Default and Static Interface Methods lesson in the Java 8 track covers the resolution rules for defaults.",
          ],
        },
      ],
    },
    {
      title: "Access Modifiers vs Non-Access Modifiers",
      blocks: [
        {
          type: "paragraph",
          text: "Access modifiers answer \"who can use this\". Every other modifier answers a different question: does it belong to the class (`static`), can it change or be overridden (`final`), does it have a body (`abstract`, `native`), how do threads see it (`synchronized`, `volatile`), is it serialized (`transient`), who may extend it (`sealed`, `non-sealed`). They combine freely with the access modifiers, but not always with each other.",
        },
        {
          type: "table",
          headers: ["Modifier", "Top-level class", "Nested class", "Method", "Field", "Meaning"],
          rows: [
            ["`static`", "No", "Yes", "Yes", "Yes", "Belongs to the class, not an instance"],
            ["`final`", "Yes", "Yes", "Yes", "Yes", "Can't be extended / overridden / reassigned"],
            ["`abstract`", "Yes", "Yes", "Yes", "No", "No instances / no body"],
            ["`synchronized`", "No", "No", "Yes", "No", "Holds the object's (or class's) monitor while running"],
            ["`volatile`", "No", "No", "No", "Yes", "Reads and writes are visible across threads"],
            ["`transient`", "No", "No", "No", "Yes", "Skipped by Java serialization"],
            ["`native`", "No", "No", "Yes", "No", "Body is in platform code (JNI)"],
            ["`strictfp`", "Yes", "Yes", "Yes", "No", "Redundant since Java 17; only a warning now"],
            ["`sealed`, `non-sealed`", "Yes", "Yes", "No", "No", "Controls which classes may extend it (Java 17)"],
          ],
        },
        {
          type: "paragraph",
          text: "The illegal combinations follow from the meanings. I put the classic ones in one file:",
        },
        {
          type: "code",
          language: "java",
          title: "IllegalCombos.java",
          code: `public abstract class IllegalCombos {
    private abstract void a();
    static abstract void b();
    final abstract void c();
    abstract synchronized void d();
    abstract native void e();
    private protected int f;
    public private int g;
    final volatile int h = 1;
}`,
        },
        {
          type: "output",
          text: `IllegalCombos.java:2: error: illegal combination of modifiers: abstract and private
    private abstract void a();
                          ^
IllegalCombos.java:3: error: illegal combination of modifiers: abstract and static
    static abstract void b();
                         ^
IllegalCombos.java:4: error: illegal combination of modifiers: abstract and final
    final abstract void c();
                        ^
IllegalCombos.java:5: error: illegal combination of modifiers: abstract and synchronized
    abstract synchronized void d();
                               ^
IllegalCombos.java:6: error: illegal combination of modifiers: abstract and native
    abstract native void e();
                         ^
IllegalCombos.java:7: error: illegal combination of modifiers: private and protected
    private protected int f;
                          ^
IllegalCombos.java:8: error: illegal combination of modifiers: public and private
    public private int g;
                       ^
IllegalCombos.java:9: error: illegal combination of modifiers: final and volatile
    final volatile int h = 1;
                       ^
8 errors`,
        },
        {
          type: "table",
          headers: ["Combination", "Why it's illegal"],
          rows: [
            ["`abstract` + `private`", "An abstract method must be overridden, and a private method can't be"],
            ["`abstract` + `static`", "Static methods aren't dispatched on an object, so nothing could supply the body"],
            ["`abstract` + `final`", "One says \"must override\", the other \"can't override\""],
            ["`abstract` + `synchronized` / `native`", "Both describe a body (its locking, its implementation), and an abstract method has none"],
            ["Two access modifiers", "A member has exactly one access level"],
            ["`final` + `volatile`", "`volatile` is about seeing writes from other threads; a final field is never written after construction"],
          ],
        },
        {
          type: "paragraph",
          text: "Three more I checked: `sealed final class` gives \"illegal combination of modifiers: final and sealed\" (a sealed class exists to have permitted subclasses); `transient` and `volatile` on a method give \"modifier transient not allowed here\" and \"modifier volatile not allowed here\"; and `public strictfp class Strict` compiles, but JDK 21 prints `warning: [strictfp] as of release 17, all floating-point expressions are evaluated strictly and 'strictfp' is not required`.",
        },
      ],
    },
    {
      title: "Reflection and Access",
      blocks: [
        {
          type: "paragraph",
          text: "Reflection has its own access check, done at run time on every `Field.get`, `Method.invoke` or `Constructor.newInstance`, against the caller's class. `setAccessible(true)` turns that check off for one reflective object, if the module system allows it. The Encapsulation lesson did this to a private field. Here it's private methods and constructors, which is where it gets interesting:",
        },
        {
          type: "code",
          language: "java",
          title: "ReflectiveAccess.java",
          code: `import java.lang.reflect.Constructor;
import java.lang.reflect.Method;

class Printer {
    private static final Printer INSTANCE = new Printer();
    private static int created;

    private Printer() {
        created++;
    }

    static Printer get() {
        return INSTANCE;
    }

    private String render(String doc) {
        return "<" + doc + ">";
    }

    static int created() {
        return created;
    }
}

enum Spooler {
    INSTANCE
}

public class ReflectiveAccess {
    public static void main(String[] args) throws Exception {
        Method render = Printer.class.getDeclaredMethod("render", String.class);
        try {
            render.invoke(Printer.get(), "report");             // no setAccessible
        } catch (IllegalAccessException e) {
            System.out.println("1. " + e.getMessage());
        }

        render.setAccessible(true);                              // same module: allowed
        System.out.println("2. " + render.invoke(Printer.get(), "report"));

        Constructor<Printer> ctor = Printer.class.getDeclaredConstructor();
        ctor.setAccessible(true);
        Printer second = ctor.newInstance();                     // a second "singleton"
        System.out.println("3. same object? " + (second == Printer.get())
                + ", constructor ran " + Printer.created() + " times");

        Constructor<Spooler> enumCtor = Spooler.class.getDeclaredConstructor(String.class, int.class);
        enumCtor.setAccessible(true);
        try {
            enumCtor.newInstance("COPY", 1);
        } catch (IllegalArgumentException e) {
            System.out.println("4. " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac ReflectiveAccess.java && java ReflectiveAccess`,
        },
        {
          type: "output",
          text: `1. class ReflectiveAccess cannot access a member of class Printer with modifiers "private"
2. <report>
3. same object? false, constructor ran 2 times
4. Cannot reflectively create enum objects`,
        },
        {
          type: "list",
          items: [
            "**1.** `getDeclaredMethod` happily **found** the private method; finding isn't using. `invoke` without `setAccessible` threw the checked `IllegalAccessException`, with a message naming the caller, the target and the modifier.",
            "**2.** `ReflectiveAccess` and `Printer` are in the same (unnamed) module, so `setAccessible(true)` simply worked.",
            "**3.** The private constructor didn't protect the singleton: reflection made a second `Printer`, and the static counter shows the constructor really ran twice. A private constructor stops honest code, not reflection.",
            "**4.** An enum singleton is the exception. `Constructor.newInstance` refuses enum classes outright (enum constructors take the hidden name and ordinal parameters, hence `String.class, int.class`). That's why Effective Java recommends a single-element enum for a singleton that has to survive reflection, and serialization too.",
            "Across a module boundary it's different. The Encapsulation lesson ran `setAccessible(true)` on `String.value` and got `InaccessibleObjectException`, because `java.base` doesn't open `java.lang` to classpath code (JEP 396 and 403), until `--add-opens java.base/java.lang=ALL-UNNAMED` was added. `trySetAccessible()` is the variant that returns `false` instead of throwing. The Java Modules lesson covers when a package is open and to whom.",
            "JDK 25 printed the same four lines.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Public is not enough if the class is not",
          text: "The reflective check looks at the class as well as the member, exactly as `javac` does. A `public` method of a package-private class, called through `Method.invoke` from another package, throws `IllegalAccessException` with the message ending `with modifiers \"public\"`: the method is public, its class isn't. `setAccessible(true)` lifts that check too. That's why frameworks that call into user classes call `setAccessible`, and why, once the code is in a named module, the package has to be opened to them, which the Java Modules lesson covers.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing the four-cell program, from `javac -d out src/shop/*.java src/outlet/*.java` to the last line of output, after the `DENIED` lines were removed:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`javac` reads `outlet/Checkout.java`, sees `import shop.Product`, and checks that the **class** `shop.Product` is accessible from package `outlet`. It's `public`, so the import is fine. If it weren't, the import line itself would fail, as `Mechanic`'s did once `Engine` lost `public`.",
            "For each member use it applies JLS 6.6.1 to the code's location. In the version with the `DENIED` lines, `p.pricePaise` in `Checkout` fails: protected, other package, and `Checkout` isn't a subclass of `Product`.",
            "In `SaleProduct.label()`, the bare name `pricePaise` means `this.pricePaise`. `SaleProduct` is a subclass in another package and the qualifier's type is `SaleProduct`, so JLS 6.6.2 is satisfied. `javac` emits `getfield #13 // Field pricePaise:J`, a reference qualified by `SaleProduct` itself.",
            "`javac` writes each field's access into `Product.class` as flags: `costPaise` `0x0002`, `stock` `0x0000`, `pricePaise` `0x0004`, `name` `0x0001`. The call sites in other classes record only names and descriptors.",
            "`java -cp out outlet.Checkout` starts. The application class loader loads `Checkout` and links it. The verifier walks its bytecode; there are no protected accesses in `Checkout` to check.",
            "`main` executes `new #7 // class shop/Product`. The JVM resolves `shop/Product`, checks it's public (JVMS 5.4.4), and caches the resolved entry.",
            "`new SaleProduct()` loads and links `SaleProduct`. Its verifier pass finds the protected `getfield pricePaise` in `label()` and checks the object on the stack is a `SaleProduct` (it's `this`), so the class verifies.",
            "When `label()` first runs, `getfield #13` resolves `pricePaise`: found in `Product`, protected, and `SaleProduct` is a subclass, so access is granted and the result is cached. Later executions of the same instruction don't repeat the check.",
            "`getfield shop/Product.name` in `main` resolves to a public field, and the program prints its four lines.",
          ],
        },
        {
          type: "paragraph",
          text: "Two checks at compile time (class, then member), and three kinds at run time (class resolution, member resolution, verification), each done once per class or per constant-pool entry. That's why access control has no per-call cost, which the Performance section shows in a JIT log.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "AccessSyntax.java",
          code: `public class AccessSyntax {                           // top-level: public or nothing
    private int a = 1;                                // fields: any of the four
    int b = 2;
    protected int c = 3;
    public int d = 4;

    private AccessSyntax() { }                        // constructors: any of the four
    public AccessSyntax(int d) {
        this();
        this.d = d;
    }

    private int twice(int x) { return 2 * x; }       // methods: any of the four
    int sum() { return a + b + c + d; }
    protected String name() { return "syntax"; }
    public String describe() { return name() + " sum=" + sum() + " twice=" + twice(sum()); }

    private static class Cache { }                    // member types: any of the four
    static class Helper { }
    protected interface Callback { void done(); }
    public enum Level { LOW, HIGH }

    interface Greeter {                               // interface members: public by default
        String greet(String who);                     // implicitly public abstract
        default String politely(String who) { return wrap(greet(who)); }
        private String wrap(String s) { return "(" + s + ")"; }   // private allowed (Java 9)
    }

    public static void main(String[] args) {
        int local = 10;                               // locals: no access modifier
        class Local {                                 // local classes: none either
            int get() { return local; }
        }
        AccessSyntax s = new AccessSyntax(40);
        Greeter g = who -> "hello " + who;
        System.out.println(s.describe());
        System.out.println(g.politely("Asha") + " " + new Local().get() + " " + Level.HIGH);
        System.out.println(new Cache().getClass().getName() + ", " + new TopHelper().getClass().getName());
    }
}

class TopHelper { }                                   // second top-level type: package-private`,
        },
        {
          type: "output",
          text: `syntax sum=46 twice=92
(hello Asha) 10 HIGH
AccessSyntax$Cache, TopHelper`,
        },
        {
          type: "paragraph",
          text: "The order in a declaration is conventional, not required: annotations, then the access modifier, then `static`, `final` and the rest, then the type. `static public void main` compiles too, but `public static` is what every style guide and every reader expects. `main` can create a `Cache` and call the private constructor `AccessSyntax()` (through `this()`) because it's all one class.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "A private nested class behind a public API",
        },
        {
          type: "paragraph",
          text: "This is the `LinkedStack` from the private section done properly: the node type and the chain are private, and the public methods never mention `Node`.",
        },
        {
          type: "code",
          language: "java",
          title: "LinkedStackDemo.java",
          code: `import java.util.NoSuchElementException;

class LinkedStack {
    private static final class Node {             // nobody outside LinkedStack can name it
        private final String value;
        private final Node next;

        private Node(String value, Node next) {
            this.value = value;
            this.next = next;
        }
    }

    private Node top;                             // the chain itself is private
    private int size;

    public void push(String value) {
        top = new Node(value, top);               // Node's private constructor: same nest
        size++;
    }

    public String pop() {
        if (top == null) {
            throw new NoSuchElementException("stack is empty");
        }
        String value = top.value;                 // Node's private field: same nest
        top = top.next;
        size--;
        return value;
    }

    public int size() {
        return size;
    }
}

public class LinkedStackDemo {
    public static void main(String[] args) {
        LinkedStack books = new LinkedStack();
        books.push("Clean Code");
        books.push("Effective Java");
        books.push("Java Concurrency in Practice");
        System.out.println("size " + books.size());
        System.out.println(books.pop());
        System.out.println(books.pop());
        System.out.println("size " + books.size());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac LinkedStackDemo.java && java LinkedStackDemo && javap -p 'LinkedStack$Node' LinkedStack`,
        },
        {
          type: "output",
          text: `size 3
Java Concurrency in Practice
Effective Java
size 1
Compiled from "LinkedStackDemo.java"
final class LinkedStack$Node {
  private final java.lang.String value;
  private final LinkedStack$Node next;
  private LinkedStack$Node(java.lang.String, LinkedStack$Node);
}
Compiled from "LinkedStackDemo.java"
class LinkedStack {
  private LinkedStack$Node top;
  private int size;
  LinkedStack();
  public void push(java.lang.String);
  public java.lang.String pop();
  public int size();
}`,
        },
        {
          type: "diagram",
          text: `         what LinkedStackDemo can use        what only LinkedStack sees
        ┌──────────────────────────┐        ┌──────────────────────────┐
        │ push(String)      public │        │ top, size        private │
        │ pop()             public │ ─────► │ Node             private │
        │ size()            public │        │  value, next     private │
        │ new LinkedStack() pkg    │        │  Node(...)       private │
        └──────────────────────────┘        └──────────────────────────┘
          the API: can't change              the implementation: free
          without breaking callers           to become an array tomorrow`,
          caption: "Everything to the right can be replaced, for example by an array-backed stack, without touching a single caller.",
        },
        {
          type: "paragraph",
          text: "`LinkedStack` reads `Node`'s private fields and calls its private constructor, and `javap` shows no `access$` methods anywhere: on Java 11 and later that's nestmate access. The `Node` class file is package-private and `final`; `private` lives in `InnerClasses`, as with `Counter$Snapshot`.",
        },
        {
          type: "heading",
          text: "A class designed for inheritance",
        },
        {
          type: "paragraph",
          text: "Each access level has a job in a template-method base class: `public final` for the fixed algorithm, `protected abstract` for the required hook, `protected` for an optional hook, `private` for everything else.",
        },
        {
          type: "code",
          language: "java",
          title: "ReportDemo.java",
          code: `import java.util.List;

abstract class Report {
    private final String title;                       // private: subclasses can't rename it

    protected Report(String title) {                  // protected: only subclasses construct one
        this.title = title;
    }

    public final String render() {                    // public final: the fixed sequence
        StringBuilder out = new StringBuilder(header());
        for (String row : rows()) {
            out.append("\\n  ").append(row);
        }
        return out.append("\\n").append(footer()).toString();
    }

    protected abstract List<String> rows();           // protected abstract: the required hook

    protected String footer() {                       // protected: an optional hook
        return "-- end --";
    }

    private String header() {                         // private: an implementation detail
        return "== " + title.toUpperCase() + " ==";
    }
}

class SalaryReport extends Report {
    SalaryReport() {
        super("salaries");
    }

    @Override
    protected List<String> rows() {
        return List.of("Asha 90000", "Meera 82000", "Ravi 75000");
    }
}

class StockReport extends Report {
    StockReport() {
        super("stock");
    }

    @Override
    protected List<String> rows() {
        return List.of("Kettle 12", "Toaster 0");
    }

    @Override
    public String footer() {                          // widened from protected: allowed
        return "-- 1 item out of stock --";
    }
}

public class ReportDemo {
    public static void main(String[] args) {
        System.out.println(new SalaryReport().render());
        System.out.println(new StockReport().render());
    }
}`,
        },
        {
          type: "output",
          text: `== SALARIES ==
  Asha 90000
  Meera 82000
  Ravi 75000
-- end --
== STOCK ==
  Kettle 12
  Toaster 0
-- 1 item out of stock --`,
        },
        {
          type: "paragraph",
          text: "`StockReport` widened `footer()` to `public`, which is legal, and now any caller can ask a `StockReport` for its footer directly; that's a decision `StockReport` made for itself, and the base class can't stop it. What subclasses can't do is change the sequence (`render` is `final`), skip the header (it's `private`) or change the title after construction.",
        },
        {
          type: "heading",
          text: "A builder that is the only way in",
        },
        {
          type: "code",
          language: "java",
          title: "BuilderDemo.java",
          code: `import java.util.ArrayList;
import java.util.List;

final class Order {
    private final String customer;
    private final List<String> items;
    private final boolean giftWrap;

    private Order(Builder b) {                        // only the Builder can call this
        this.customer = b.customer;                   // reads the Builder's private fields
        this.items = List.copyOf(b.items);
        this.giftWrap = b.giftWrap;
    }

    static Builder forCustomer(String customer) {
        return new Builder(customer);
    }

    @Override
    public String toString() {
        return customer + " " + items + (giftWrap ? " (gift wrapped)" : "");
    }

    static final class Builder {
        private final String customer;
        private final List<String> items = new ArrayList<>();
        private boolean giftWrap;

        private Builder(String customer) {            // only Order.forCustomer creates one
            this.customer = customer;
        }

        Builder item(String sku) {
            items.add(sku);
            return this;
        }

        Builder giftWrap() {
            giftWrap = true;
            return this;
        }

        Order build() {
            if (items.isEmpty()) {
                throw new IllegalStateException("an order needs at least one item");
            }
            return new Order(this);                   // Order's private constructor: same nest
        }
    }
}

public class BuilderDemo {
    public static void main(String[] args) {
        Order order = Order.forCustomer("Asha").item("BOOK-12").item("PEN-3").giftWrap().build();
        System.out.println(order);
        try {
            Order.forCustomer("Ravi").build();
        } catch (IllegalStateException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Asha [BOOK-12, PEN-3] (gift wrapped)
rejected: an order needs at least one item`,
        },
        {
          type: "paragraph",
          text: "Private access runs both ways here. `Order`'s constructor reads `b.customer`, a private field of the nested `Builder`, and `Builder.build()` calls `Order`'s private constructor. The only path to an `Order` is `forCustomer(...)...build()`, so the \"at least one item\" check can't be skipped.",
        },
        {
          type: "heading",
          text: "Enum constructors are private even without the keyword",
        },
        {
          type: "code",
          language: "java",
          title: "EnumAccess.java",
          code: `enum Size {
    SMALL(250), MEDIUM(350), LARGE(500);

    private final int ml;

    Size(int ml) {                                    // no modifier, and still private
        this.ml = ml;
    }

    int ml() {
        return ml;
    }
}

public class EnumAccess {
    public static void main(String[] args) throws Exception {
        for (Size s : Size.values()) {
            System.out.println(s + " " + s.ml() + " ml");
        }
        var ctor = Size.class.getDeclaredConstructor(String.class, int.class, int.class);
        System.out.println("constructor: " + ctor);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac EnumAccess.java && java EnumAccess && javap -p Size | grep "Size("`,
        },
        {
          type: "output",
          text: `SMALL 250 ml
MEDIUM 350 ml
LARGE 500 ml
constructor: private Size(java.lang.String,int,int)
  private Size(int);`,
        },
        {
          type: "paragraph",
          text: "Reflection and `javap` both say `private`, though the source has no modifier. Reflection also shows the real parameter list, `(String, int, int)`: `javac` adds the constant's name and ordinal in front of my `int ml`, which is why `ReflectiveAccess` asked for `(String.class, int.class)` on an enum with no parameters of its own.",
        },
      ],
    },
    {
      title: "When to Use Each Access Level (and When to Widen)",
      blocks: [
        {
          type: "paragraph",
          text: "The capstone lesson, When to Use What in Java OOP, gave the rule in one line: **start at `private` and widen deliberately**. Widening later is a compatible change; narrowing later breaks every caller that already uses the member, as the `IllegalAccessError` runs in Internal Working showed. Here's the longer version I actually apply.",
        },
        {
          type: "table",
          headers: ["What I'm declaring", "Access I give it", "Why"],
          rows: [
            ["Any field", "`private` (a constant may be `public static final` if its type is immutable)", "State is the implementation; methods are the contract"],
            ["A helper method used by one class", "`private`", "Free to change or delete"],
            ["A class or method used only by its feature package", "package-private", "Hidden from other packages, still reachable from same-package tests"],
            ["A method subclasses are meant to override or call", "`protected`, documented, often `final` on the caller side", "A promise to every future subclass"],
            ["A constructor of a class meant only for extension", "`protected`", "Subclasses can construct it; nobody else can `new` it"],
            ["The feature's entry point, interfaces, value types", "`public`", "The deliberate API"],
            ["A constructor I want to control", "`private`, with a static factory", "Caching, validation, a fixed set of subclasses"],
            ["A nested helper type", "`private static`", "Can't leak into any signature or caller"],
          ],
        },
        {
          type: "diagram",
          text: `Who needs this member?
│
├─ only this class ──────────────────────────► private
│
├─ classes in the same package ──────────────► package-private
│   (collaborators, same-package tests)
│
├─ subclasses in other packages ─► is the class designed
│                                  and documented for
│                                  inheritance?
│                                  ├─ yes ─► protected (a method,
│                                  │         not a field)
│                                  └─ no ──► don't widen; make it
│                                            final or compose instead
│
└─ code in other packages ─► is it part of the API I'm willing
                             to support for as long as the
                             class exists?
                             ├─ yes ─► public
                             └─ no ──► keep it package-private and
                                       expose a smaller public method`,
          caption: "The question is always who needs it, never who might find it handy.",
        },
        {
          type: "list",
          items: [
            "Widen one step at a time, for a named caller. \"Someone might need it\" isn't a caller.",
            "A `public` class doesn't need `public` members. Its constructor or half its methods can stay package-private.",
            "`protected` fields are almost never right. A subclass that needs the state gets a `protected` method that keeps the rules; the next example shows the difference in output.",
            "When the module system is in play, `public` plus an unexported package is \"public inside my module only\". The Java Modules lesson covers it.",
          ],
        },
        {
          type: "heading",
          text: "A wrong choice and a right choice",
        },
        {
          type: "paragraph",
          text: "A late fee on a bank account. In the wrong version the balance is `protected` so the subclass can \"just subtract\"; in the right one the balance is private and the subclass gets a `protected final` operation that keeps the rule:",
        },
        {
          type: "code",
          language: "java",
          title: "AccessChoice.java",
          code: `// Wrong choice: the state is protected, so every subclass (and the package) owns the rule
class LeakyAccount {
    protected long balance = 5_000;

    public void withdraw(long amount) {
        if (amount > balance) {
            throw new IllegalStateException("insufficient funds");
        }
        balance -= amount;
    }
}

class LeakyLateFee extends LeakyAccount {
    void chargeLateFee(long fee) {
        balance -= fee;                               // skips the check in withdraw
    }
}

// Right choice: private state, and a protected final operation that keeps the rule
class BankAccount {
    private long balance = 5_000;

    public void withdraw(long amount) {
        debit(amount);
    }

    protected final void debit(long amount) {         // designed for subclasses, can't be overridden
        if (amount <= 0 || amount > balance) {
            throw new IllegalStateException("cannot debit " + amount + " from " + balance);
        }
        balance -= amount;
    }

    public long balance() {
        return balance;
    }
}

class LateFeeAccount extends BankAccount {
    void chargeLateFee(long fee) {
        debit(fee);                                   // the only way in
    }
}

public class AccessChoice {
    public static void main(String[] args) {
        LeakyLateFee leaky = new LeakyLateFee();
        leaky.chargeLateFee(7_000);
        System.out.println("wrong: balance is now " + leaky.balance);

        LateFeeAccount account = new LateFeeAccount();
        try {
            account.chargeLateFee(7_000);
        } catch (IllegalStateException e) {
            System.out.println("right: " + e.getMessage() + ", balance still " + account.balance());
        }
    }
}`,
        },
        {
          type: "output",
          text: `wrong: balance is now -2000
right: cannot debit 7000 from 5000, balance still 5000`,
        },
        {
          type: "list",
          items: [
            "**Wrong:** `protected` made `balance` part of the contract with every subclass, so the rule \"never below zero\" had to be re-implemented by each one, and `LeakyLateFee` didn't. `main` also read `leaky.balance` directly, because protected includes the package.",
            "**Right:** the subclass got exactly one capability, `debit`, and `final` stops it from being overridden into something that skips the check. The rule lives in one place, and the subclass's bug became an exception instead of a negative balance.",
          ],
        },
        {
          type: "heading",
          text: "What about tests?",
        },
        {
          type: "list",
          items: [
            "**Test through the API first.** Most private methods are covered by testing the public method that calls them. If a private method is complicated enough to need its own tests, that's often a sign it wants to be its own package-private class, like `PriceCalculator`.",
            "**Same-package tests for package-private code.** Put the test in the same package under `src/test/java`, as `PriceCalculatorTest` did. Nothing has to be widened.",
            "**Don't widen to `public` for a test.** A member made public \"for testing\" is public for everyone, forever. If something has to be widened, package-private is as far as it goes; Guava's `@VisibleForTesting` annotation documents why, though it changes nothing about access itself.",
            "**Don't test private methods with reflection.** `setAccessible(true)` in a test ties the test to a method name the class is free to rename, and it stops working on module boundaries.",
            "With JPMS, tests are usually patched into the module (`--patch-module`) so same-package access still works; build tools handle that.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Forgetting public when implementing an interface",
        },
        {
          type: "code",
          language: "java",
          title: "NoPublic.java",
          code: `interface Notifier {
    void send(String message);
}

class EmailNotifier implements Notifier {
    void send(String message) {
        System.out.println("email: " + message);
    }
}

public class NoPublic { }`,
        },
        {
          type: "output",
          text: `NoPublic.java:6: error: send(String) in EmailNotifier cannot implement send(String) in Notifier
    void send(String message) {
         ^
  attempting to assign weaker access privileges; was public
1 error`,
        },
        {
          type: "paragraph",
          text: "In the interface, no modifier means `public`. In the class, no modifier means package-private, which is narrower. The fix is `public void send`, and `@Override` on it is free insurance.",
        },
        {
          type: "heading",
          text: "Reading a protected member through the parent type",
        },
        {
          type: "paragraph",
          text: "`vehicle.mileage` inside `Car` failed with \"mileage has protected access in Vehicle\", although `Car` extends `Vehicle`. In another package, a subclass may use protected instance members only through its own type. The fix is either to operate on `this` (or a `Car`), or, if the class really needs another vehicle's data, a public method on `Vehicle` that exposes what's safe. `p.clone()` failing with \"clone() has protected access in Object\" is the same mistake.",
        },
        {
          type: "heading",
          text: "Expecting a package-private method to be overridden from another package",
        },
        {
          type: "paragraph",
          text: "`ExportInvoice.discountNote()` compiled without a warning, even under `-Xlint:all`, and `print` kept saying `no discount`. The JVM only lets a method override a package-private one from the same run-time package. Putting `@Override` on every override turns this silent bug into \"method does not override or implement a method from a supertype\". If cross-package overriding is intended, the parent method must be `protected`.",
        },
        {
          type: "heading",
          text: "Assuming private and same-named means overridden",
        },
        {
          type: "paragraph",
          text: "`StaffInvoice.header()` never ran; `print` stayed with `INVOICE`. A private method is invisible to subclasses, so a method with the same name is a brand-new method. Calls inside the parent always go to the parent's private version.",
        },
        {
          type: "heading",
          text: "Making things public because it was easier",
        },
        {
          type: "paragraph",
          text: "The IDE suggests \"make public\" whenever a call doesn't compile. Accepting it from another package is how an implementation class like `PriceCalculator` ends up in another team's code. Once that happens, its signature can't change without breaking them. When the compiler says \"is not public in ...; cannot be accessed from outside package\", the first question is whether the caller should be using it at all.",
        },
        {
          type: "heading",
          text: "Leaking a private type through a non-private method",
        },
        {
          type: "paragraph",
          text: "`LinkedStack.top()` in `PrivateErrors` returned a private `Node` from a package-private method. Callers could hold it with `var` but every use failed with \"Node.value is defined in an inaccessible class or interface\". Either the method is private too, or it returns a public type.",
        },
        {
          type: "heading",
          text: "Thinking private is security",
        },
        {
          type: "paragraph",
          text: "`ReflectiveAccess` called a private method and built a second \"singleton\" in a few lines. Within one module, `private` keeps honest code honest. Secrets in memory need other protection, and singletons that must survive reflection should be enums.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Start every member at `private` and every class at package-private. Widen one step at a time, for a caller I can name.",
            "Keep fields `private`. Give subclasses `protected` methods, not `protected` fields.",
            "Make one class per feature `public` and keep its collaborators package-private. A package with every class public has no inside.",
            "Design for inheritance or prohibit it: a class with `protected` hooks documents them; any other class is `final` or has no accessible constructor.",
            "Put `@Override` on every override. It's the only thing that catches an \"override\" of a package-private or private method.",
            "Don't return or accept a type that's less accessible than the method itself.",
            "Test package-private code from the same package; don't widen to `public` for tests.",
            "Treat narrowing access as a breaking change. If a public member has to go, deprecate it first; callers compiled against it will otherwise fail at run time with `IllegalAccessError`.",
            "Use `setAccessible(true)` only in framework-style code that genuinely needs it, with a comment saying why.",
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
            "Access control costs nothing per call. `javac` checks at compile time; the JVM checks once per constant-pool entry at resolution, and the verifier once per class. After that, a `getfield` on a private field and on a public field are the same instruction.",
            "Private methods can't be overridden, so the JIT knows the exact target. Non-final public methods are usually just as cheap: HotSpot's class hierarchy analysis sees that no loaded subclass overrides them and inlines anyway, and deoptimizes if such a subclass loads later.",
            "Reflection has a real cost on each call, and an access check is part of it unless `setAccessible(true)` has been called. Since JDK 18 (JEP 416), `Method.invoke` and `Field.get` are implemented with method handles. Frameworks cache their reflective objects for this reason.",
            "A Spring proxy adds an interceptor chain to each intercepted call. That's small next to the work a cache or transaction saves, but it's why only the methods that need advice should carry the annotations.",
          ],
        },
        {
          type: "paragraph",
          text: "To check the first two claims, I called four identical methods, one per access level, in a hot loop:",
        },
        {
          type: "code",
          language: "java",
          title: "InlineAccess.java",
          code: `public class InlineAccess {
    private int privateTax(int paise) { return paise * 18 / 100; }
    int packageTax(int paise) { return paise * 18 / 100; }
    protected int protectedTax(int paise) { return paise * 18 / 100; }
    public int publicTax(int paise) { return paise * 18 / 100; }

    long run(int n) {
        long sum = 0;
        for (int i = 0; i < n; i++) {
            sum += privateTax(i) + packageTax(i) + protectedTax(i) + publicTax(i);
        }
        return sum;
    }

    public static void main(String[] args) {
        InlineAccess calc = new InlineAccess();
        long total = 0;
        for (int round = 0; round < 20_000; round++) {
            total += calc.run(1_000);
        }
        System.out.println(total);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p InlineAccess | grep "invokevirtual.*Tax"
java -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining -XX:+PrintCompilation InlineAccess`,
        },
        {
          type: "output",
          text: `      15: invokevirtual #7                  // Method privateTax:(I)I
      21: invokevirtual #13                 // Method packageTax:(I)I
      28: invokevirtual #16                 // Method protectedTax:(I)I
      35: invokevirtual #19                 // Method publicTax:(I)I
...
48   17       4       InlineAccess::run (50 bytes)
51   15       3       InlineAccess::run (50 bytes)   made not entrant
                              @ 15   InlineAccess::privateTax (8 bytes)   inline (hot)
                              @ 21   InlineAccess::packageTax (8 bytes)   inline (hot)
                              @ 28   InlineAccess::protectedTax (8 bytes)   inline (hot)
                              @ 35   InlineAccess::publicTax (8 bytes)   inline (hot)
7153600000`,
        },
        {
          type: "paragraph",
          text: "All four calls are the same `invokevirtual` in the bytecode (private ones too, since Java 11), and C2 inlined all four, marked `(hot)`. The C1 compilation earlier in the log inlined all four as well. The first column is milliseconds since start-up and differs between runs and machines. So access level is a design decision, never a performance one.",
        },
      ],
    },
    {
      title: "Access Modifiers in Production",
      blocks: [
        {
          type: "paragraph",
          text: "The access bug I'd most expect in a Spring backend isn't a compile error. It's an annotation that silently does nothing because of where the method sits. In a ride-hailing fare service, quoting a fare calls a slow pricing engine, so the quote is cached with `@Cacheable`, and the receipt email after a trip is sent with `@Async`. Both annotations work through a **proxy**: Spring registers a generated subclass of the bean (a CGLIB proxy) whose overriding methods run the cache or executor logic and then call the real method. A proxy can only intercept a call that's an override it was able to generate, made on the proxy itself.",
        },
        {
          type: "paragraph",
          text: "I built both the bug and the fix with real Spring Framework 6.2.11 (Maven `org.springframework:spring-context:6.2.11`, which brings `spring-aop`, `spring-beans`, `spring-core` and `spring-expression`). `$SPRING` below is the classpath of those JARs.",
        },
        {
          type: "code",
          language: "java",
          title: "FareQuotes.java",
          code: `import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.aop.support.AopUtils;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

public class FareQuotes {

    // The slow part: a pricing engine call. It counts how often it really runs.
    public static class PricingEngine {
        private final AtomicInteger calls = new AtomicInteger();

        public long price(String zone, int km) {
            calls.incrementAndGet();
            long base = 5_000 + km * 1_200L;
            return zone.equals("AIRPORT") ? base + 15_000 : base;
        }

        public int calls() {
            return calls.get();
        }
    }

    // BEFORE: the cached method is private and reached through this
    public static class FareServiceBefore {
        private final PricingEngine engine;

        public FareServiceBefore(PricingEngine engine) {
            this.engine = engine;
        }

        public long fareFor(String zone, int km) {
            return quote(zone, km);
        }

        @Cacheable("quotes")
        private long quote(String zone, int km) {
            return engine.price(zone, km);
        }

        public String receipt(String rideId) {
            return send(rideId);
        }

        @Async
        private String send(String rideId) {
            return rideId + " receipt sent on " + Thread.currentThread().getName();
        }
    }

    // AFTER: public methods on separate beans, called through their proxies
    public static class FareQuoter {
        private final PricingEngine engine;

        public FareQuoter(PricingEngine engine) {
            this.engine = engine;
        }

        @Cacheable("quotes")
        public long quote(String zone, int km) {
            return engine.price(zone, km);
        }
    }

    public static class ReceiptSender {
        @Async
        public CompletableFuture<String> send(String rideId) {
            return CompletableFuture.completedFuture(
                    rideId + " receipt sent on " + Thread.currentThread().getName());
        }
    }

    public static class FareServiceAfter {
        private final FareQuoter quoter;
        private final ReceiptSender sender;

        public FareServiceAfter(FareQuoter quoter, ReceiptSender sender) {
            this.quoter = quoter;
            this.sender = sender;
        }

        public long fareFor(String zone, int km) {
            return quoter.quote(zone, km);
        }

        public String receipt(String rideId) {
            return sender.send(rideId).join();
        }
    }

    @Configuration
    @EnableCaching
    @EnableAsync
    public static class AppConfig {
        @Bean
        public CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("quotes");
        }

        @Bean
        public ThreadPoolTaskExecutor taskExecutor() {
            ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
            executor.setCorePoolSize(2);
            executor.setThreadNamePrefix("receipts-");
            return executor;
        }

        @Bean
        public PricingEngine pricingEngine() {
            return new PricingEngine();
        }

        @Bean
        public FareServiceBefore fareServiceBefore(PricingEngine engine) {
            return new FareServiceBefore(engine);
        }

        @Bean
        public FareQuoter fareQuoter(PricingEngine engine) {
            return new FareQuoter(engine);
        }

        @Bean
        public ReceiptSender receiptSender() {
            return new ReceiptSender();
        }

        @Bean
        public FareServiceAfter fareServiceAfter(FareQuoter quoter, ReceiptSender sender) {
            return new FareServiceAfter(quoter, sender);
        }
    }

    public static void main(String[] args) {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            PricingEngine engine = ctx.getBean(PricingEngine.class);
            Thread.currentThread().setName("http-nio-8080-exec-1");   // pretend this is a request thread

            FareServiceBefore before = ctx.getBean(FareServiceBefore.class);
            System.out.println("BEFORE  bean class: " + before.getClass().getSimpleName());
            for (int i = 0; i < 3; i++) {
                before.fareFor("AIRPORT", 12);
            }
            System.out.println("BEFORE  3 quotes -> engine calls: " + engine.calls());
            System.out.println("BEFORE  " + before.receipt("ride-7"));

            FareServiceAfter after = ctx.getBean(FareServiceAfter.class);
            FareQuoter quoter = ctx.getBean(FareQuoter.class);
            System.out.println("AFTER   quoter is a proxy: " + AopUtils.isAopProxy(quoter));
            int start = engine.calls();
            for (int i = 0; i < 3; i++) {
                after.fareFor("AIRPORT", 12);
            }
            after.fareFor("CITY", 5);
            System.out.println("AFTER   4 quotes, 2 distinct -> engine calls: " + (engine.calls() - start));
            System.out.println("AFTER   " + after.receipt("ride-7"));
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp "$SPRING" FareQuotes.java
java -cp "$SPRING:." FareQuotes`,
        },
        {
          type: "output",
          text: `BEFORE  bean class: FareQuotes$FareServiceBefore$$SpringCGLIB$$0
BEFORE  3 quotes -> engine calls: 3
BEFORE  ride-7 receipt sent on http-nio-8080-exec-1
AFTER   quoter is a proxy: true
AFTER   4 quotes, 2 distinct -> engine calls: 2
AFTER   ride-7 receipt sent on receipts-1`,
        },
        {
          type: "list",
          items: [
            "**Spring did create a proxy for the broken bean**: its class is `FareServiceBefore$$SpringCGLIB$$0`. It saw `@Cacheable` and `@Async` on the class's methods and wrapped the bean. So \"is it a proxy?\" isn't enough to know the annotations work.",
            "**The cache never hit.** Three identical airport quotes made three pricing engine calls. CGLIB builds a subclass, and a subclass can't override a private method, so the proxy has no `quote` to intercept. The call `quote(zone, km)` inside `fareFor` is a call on `this`, the real target object, with nothing in between.",
            "**The async send ran on the request thread**: `http-nio-8080-exec-1`, the name I gave `main`'s thread to stand in for a Tomcat worker. In a real service that's the HTTP request waiting for an email to go out, with no error anywhere.",
            "**Making them public isn't enough on its own.** I changed both methods in `FareServiceBefore` to `public` and ran it again: still three engine calls and still `http-nio-8080-exec-1`, because `fareFor` calls `quote` on `this`, which skips the proxy. That's self-invocation, the same trap the Methods lesson mentioned for `@Transactional`.",
            "**The fix** moves each advised method to its own bean and calls it through the injected reference, which is the proxy: four quotes with two distinct keys made two engine calls, and the receipt went out on `receipts-1`, a thread from the executor. An `@Async` method returns `void` or a `Future`; `send` returns a `CompletableFuture` so the caller can wait for it.",
            "**Package-private works too, private never does.** When I made `FareQuoter.quote` and `ReceiptSender.send` package-private, Spring 6.2.11 still intercepted both (two engine calls, `receipts-1`), because CGLIB can override package-private methods from a proxy class in the same package. JDK interface-based proxies only see interface methods, which are public. `public` is the safe choice for anything a framework must intercept.",
          ],
        },
        {
          type: "paragraph",
          text: "`@Transactional` follows the same rules, which makes this bug worse there: a private or self-invoked `@Transactional` method runs with no transaction at all, so a failure halfway through can leave the earlier writes committed. The Spring Framework track covers proxies in detail; the access-modifier lesson is that `private` means \"not interceptable\", and a framework annotation on a private method is a mistake whether or not anything complains.",
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
              question: "What are the four access modifiers in Java, and what is the scope of each?",
              answer:
                "`private`: only inside the declaring top-level class (including its nested classes). Package-private, with no keyword: the same package. `protected`: the same package plus subclasses in other packages. `public`: everywhere the type is visible.\n\nEach level contains the one before it. In my two-package program, `Product` declared one field at each level and `javac` produced exactly six errors, one for each \"No\" in the 4-by-4 table, and the remaining ten accesses compiled and ran.",
            },
            {
              question: "What is default (package-private) access?",
              answer:
                "It's what a class, field, method or constructor gets when no access modifier is written: visible to every class in the same package and nothing else, including subclasses in other packages. The JLS calls it package access.\n\nIn the class file it isn't even a flag: `javap -v` printed `flags: (0x0000)` for `int shared` and `void bump()`. Inside an interface the default is different, `public`.",
            },
            {
              question: "Can a top-level class be private or protected?",
              answer:
                "No. A top-level class can only be `public` or package-private. `private class PrivateTop` and `protected class ProtectedTop` both failed with \"modifier private not allowed here\" and \"modifier protected not allowed here\".\n\nThere's nothing for them to mean: private is relative to an enclosing class, and a top-level class has none. The class file format agrees; it only has `ACC_PUBLIC` for a top-level class. Nested classes can use all four.",
            },
            {
              question: "What's the difference between protected and package-private?",
              answer:
                "Both give access to the whole package. `protected` adds subclasses in other packages, with the condition that they use protected instance members through their own type.\n\nIn my program, `SaleProduct` in package `outlet` could read the protected `pricePaise` but got \"stock is not public in Product; cannot be accessed from outside package\" for the package-private `stock`. And `Inventory`, a non-subclass in package `shop`, read both.",
            },
            {
              question: "Can a private method be overridden?",
              answer:
                "No. Private methods aren't inherited, so a subclass method with the same signature is a new, unrelated method. Calls inside the parent always go to the parent's own private method.\n\n`StaffInvoice` declared its own `header()`, and `Invoice.print()` still printed `INVOICE`. Adding `@Override` to such a method is a compile error, which is the easiest way to catch it.",
            },
            {
              question: "What are private constructors used for?",
              answer:
                "To control who creates instances: utility classes that should have none (`Math`, `Collections`), static factories that cache or validate (`Integer.valueOf`), singletons, a single private constructor that all public paths delegate to, and closed hierarchies where only nested classes can extend.\n\nIn `PrivateConstructors`, `Temperature.of(21)` returned the same object twice, and `Shape` could only be extended by its nested `Circle` and `Square`. From outside, `new Units()` gave \"Units() has private access in Units\".",
            },
            {
              question: "What access do interface members have?",
              answer:
                "Methods are implicitly `public` (abstract, default or static) unless declared `private`, which is allowed since Java 9. Fields are implicitly `public static final`, and member types `public static`. `protected` is never allowed.\n\n`javap` on my `Logger` interface showed `0x0019` for the constant, `0x0401 ACC_PUBLIC, ACC_ABSTRACT` for `log`, and `ACC_PRIVATE` for the `format` helper that the default methods share.",
            },
            {
              question: "Can a local variable have an access modifier?",
              answer:
                "No. Its scope is already one block, so access control has nothing to add. Only `final` and annotations are allowed on locals, and local classes can't have access modifiers either.\n\n`private int count = 0;` inside a method gave \"illegal start of expression\", a parse error, plus a confused follow-up error at the closing brace.",
            },
            {
              question: "Why must a public class be in a file with the same name?",
              answer:
                "Because `javac` enforces it: `public class Right` in `Wrong.java` failed with \"class Right is public, should be declared in a file named Right.java\". That's also why a file can have at most one public top-level class.\n\nThe point is lookup: the compiler can find `shop.Product` at `shop/Product.java` without scanning the package. Package-private top-level classes can share a file, as `CounterHelper` did in `Counter.java`.",
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
              question: "Explain the protected access rule across packages (JLS 6.6.2).",
              answer:
                "In a subclass `S` in another package, a protected instance member can be used only through `this`, `super`, or an expression of type `S` or a subtype of `S`. Through the parent type or a sibling subclass, it's an error. Static protected members and anything in the same package aren't affected.\n\nIn `Car`, `car.mileage` compiled, but `vehicle.mileage` and `bike.mileage` both gave \"mileage has protected access in Vehicle\", while `Vehicle.built` (static) was fine. The reason: `protected` lets `Car` manage its own implementation, not reach into a `Bike`'s.",
            },
            {
              question: "Can a subclass reduce or widen visibility when overriding?",
              answer:
                "It can keep or widen it, never reduce it. Code holding a parent reference is allowed to call the method, so the subclass can't take that away.\n\n`double area()` overriding `protected double area()` failed with \"attempting to assign weaker access privileges; was protected\". In `ReportDemo`, `StockReport` widened `footer()` from `protected` to `public` without complaint.",
            },
            {
              question: "Is private access per object or per class?",
              answer:
                "Per class, or more exactly per top-level class and its nest. Any code inside the class can access the private members of any instance of it.\n\n`Employee.earnsMoreThan(other)` and `compareTo` read `other.salary` directly, and the team sorted to `[Ravi, Meera, Asha]`. A subclass, on the other hand, can't read the private field even on itself: `Manager` got \"salary has private access in Employee\".",
            },
            {
              question: "What's the difference between access modifiers and non-access modifiers?",
              answer:
                "Access modifiers (`private`, `protected`, `public`, or none) decide who can use a declaration. Non-access modifiers describe what it is or how it behaves: `static`, `final`, `abstract`, `synchronized`, `volatile`, `transient`, `native`, `strictfp`, `sealed`, `non-sealed`.\n\nA declaration has exactly one access level but can have several non-access modifiers, and some of those clash with each other or with an access level. In the class file they're all bits in the same `access_flags` word, like `0x0019` for `public static final`.",
            },
            {
              question: "Which modifier combinations are illegal, and why?",
              answer:
                "`abstract` with `private`, `static` or `final` (an abstract method must be overridden, and those can't be), `abstract` with `synchronized` or `native` (they describe a body it doesn't have), two access modifiers, `final` with `volatile`, and `sealed` with `final`.\n\nMy `IllegalCombos` file produced eight \"illegal combination of modifiers\" errors, including \"private and protected\": the `private protected` that some of the earliest compilers accepted is long gone.",
            },
            {
              question: "Can you access private fields or methods with reflection?",
              answer:
                "Yes, within the same module, with `setAccessible(true)`. Without it, `Method.invoke` throws `IllegalAccessException`; across a module boundary that isn't opened, `setAccessible` itself throws `InaccessibleObjectException`.\n\nI got \"class ReflectiveAccess cannot access a member of class Printer with modifiers \"private\"\" first, then `<report>` after `setAccessible`. On a JDK internal like `String.value`, the Encapsulation lesson's run threw `InaccessibleObjectException` until `--add-opens java.base/java.lang=ALL-UNNAMED` was added.",
            },
            {
              question: "Is a package-private method inherited by a subclass in another package?",
              answer:
                "No. It's only inherited within its own package, so a subclass elsewhere can declare a method with the same signature and it won't override anything. The JVM's overriding rule (JVMS 5.4.5) checks the run-time package too.\n\n`ExportInvoice.discountNote()` compiled without a warning even under `-Xlint:all`, yet `print()` kept saying `no discount`. `@Override` turns it into an error. Making the parent's method `protected` makes it a real override.",
            },
            {
              question: "How can code in another package use a protected constructor?",
              answer:
                "Only from a subclass constructor through `super(...)`, or by creating an anonymous subclass, `new Vehicle(300) { }`. A plain `new Vehicle(100)` is an error, even from a subclass (JLS 6.6.2.2).\n\nIn `Workshop`, `new Vehicle(100)` gave \"Vehicle(int) has protected access in Vehicle\", while the anonymous subclass compiled, printed `garage.Workshop$1`, and bumped the constructor counter to 3.",
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
              question: "How are access modifiers represented in a class file?",
              answer:
                "As bits in each class's, field's and method's `access_flags`: `ACC_PUBLIC` 0x0001, `ACC_PRIVATE` 0x0002, `ACC_PROTECTED` 0x0004, and package-private as the absence of all three. A top-level class can only carry `ACC_PUBLIC`.\n\n`javap -v -p Counter` showed exactly that, with `(0x0000)` for the package-private field and method. Nested classes keep their source modifiers in the `InnerClasses` attribute: `private static` for `Snapshot`, whose own class file is package-private.",
            },
            {
              question: "What does the JVM check at run time, and when?",
              answer:
                "When a symbolic reference is resolved, the first time an instruction like `new`, `getfield` or `invokevirtual` uses it, the JVM applies JVMS 5.4.4: is the class accessible, and is the member accessible from the referring class? A failure is an `IllegalAccessError`. The result is cached, so it's once per reference.\n\nWhen `Engine` became package-private and only the library was recompiled, `Mechanic` printed `mechanic ready` and then failed at line 8 with \"failed to access class engines.Engine from class repair.Mechanic\". The check was lazy, at the first `new`.",
            },
            {
              question: "How does the JVM enforce the protected own-type rule?",
              answer:
                "In the bytecode verifier (JVMS 4.10.1.8). For a `getfield`, `putfield` or invoke on a protected member declared in a superclass in another run-time package, the object on the operand stack must be the current class or a subclass. The resolution check alone can't see that.\n\nAfter I narrowed `Shape.sides` to protected, `Square` failed before `main` with `VerifyError: Bad access to protected data in getfield ... Type 'shapes/Shape' ... is not assignable to 'paint/Square'`. With remote verification disabled as an experiment, the same program ran, which shows the verifier was the only thing enforcing it.",
            },
            {
              question: "What happens to a private or protected nested class at the class-file level?",
              answer:
                "The class file can't say private or protected for a class, so `javac` writes the nearest real flags: a private nested class becomes package-private, a protected one becomes public. The source modifiers are kept in the `InnerClasses` attribute, and the default constructor gets the source access.\n\n`Counter$Snapshot` had `flags: (0x0020) ACC_SUPER` but a `private Counter$Snapshot()` constructor and `private static` in `InnerClasses`. `Counter$Listener` came out as `public class`. Reflection's `getModifiers()` and `accessFlags()` read `InnerClasses`, which is why they printed `private static` and `[PROTECTED, STATIC]`.",
            },
            {
              question: "How do nested classes access each other's private members, before and after Java 11?",
              answer:
                "Before Java 11, the JVM treated them as unrelated classes, so `javac` generated package-private synthetic `access$000` methods to reach private members, which widened access for the whole package. Since Java 11 (JEP 181), the class files carry `NestHost` and `NestMembers` attributes, and the JVM's access check allows private access between nestmates directly.\n\nIn `LinkedStackDemo`, `LinkedStack` reads `Node`'s private fields and calls its private constructor, and `javap -p` showed no `access$` methods at all. The Encapsulation lesson shows the `--release 8` output with the bridges.",
            },
            {
              question: "What does setAccessible(true) do, and when does it fail?",
              answer:
                "It suppresses the reflective access check for that one `Field`, `Method` or `Constructor` object. Since Java 9 it's itself checked against modules: it works within the caller's module, on packages that are open to it, and on public members of public classes in exported packages, and throws `InaccessibleObjectException` otherwise. `trySetAccessible()` returns `false` instead of throwing.\n\nOn my own `Printer` it worked and even built a second singleton. On the private `String.value` field, the Encapsulation lesson's run threw \"module java.base does not \"opens java.lang\" to unnamed module\" until `--add-opens java.base/java.lang=ALL-UNNAMED` was added.",
            },
            {
              question: "Why can reflection break a private-constructor singleton, and what resists it?",
              answer:
                "Because `getDeclaredConstructor()` plus `setAccessible(true)` can call a private constructor like any other. An enum singleton resists it: `Constructor.newInstance` refuses to instantiate enum classes at all, and enums also handle serialization correctly.\n\n`ReflectiveAccess` printed `same object? false, constructor ran 2 times` for the `Printer` singleton and \"Cannot reflectively create enum objects\" for the `Spooler` enum, even after `setAccessible(true)` on its `(String, int)` constructor.",
            },
            {
              question: "Is package-private a security boundary?",
              answer:
                "Not on the classpath. Any JAR can declare classes in the same package and get package access, which is exactly how tests in `src/test/java` see package-private code. Two things harden it: sealed packages in a JAR manifest, and modules, which forbid split packages.\n\n`PriceCalculatorTest` reached the package-private `PriceCalculator` from a separate source root and output directory just by declaring `package orders;`. Any other JAR could do the same. And within one module, reflection with `setAccessible(true)` bypasses every level anyway, as `ReflectiveAccess` showed.",
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
              question: "A @Cacheable (or @Transactional) method seems to be ignored: the cache never hits. What do you check?",
              answer:
                "First, whether the method is private or called through `this` from the same bean. Spring's proxies intercept only methods they can override and only calls that go through the proxy, so a private method, or any self-invoked method, runs without the advice and without any error.\n\nIn the fare service, three identical quotes made three pricing engine calls even though the bean was a `$$SpringCGLIB$$0` proxy. Moving `quote` to a separate `FareQuoter` bean with a public method and calling it through the injected reference cut it to two calls for four quotes, one per distinct key.",
            },
            {
              question: "Another team started using an internal helper class of yours because it was public. Now you can't change it. What do you do, and how do you prevent it next time?",
              answer:
                "Short term, treat it as API: deprecate it, give them a supported public entry point that covers their use case, and remove the old class after a release or two. Changing it in place would break them at compile time, or at run time with `IllegalAccessError` if their build isn't recompiled.\n\nTo prevent it, keep implementation classes package-private inside a feature package, like `PriceCalculator`, so another package gets \"is not public in ...; cannot be accessed from outside package\" at the import, as `Mechanic` did with `Engine`. Across JARs, a module that exports only the API package makes even public internals unreachable.",
            },
            {
              question: "A codebase has made nearly everything public \"so the tests can reach it\". How would you fix that?",
              answer:
                "Move the tests into the same package as the code under `src/test/java` and narrow the production classes and methods back to package-private, starting with classes nothing outside the package uses. Most private helpers don't need direct tests; testing the public method covers them.\n\n`PriceCalculatorTest` lived in a separate source root and output directory but in package `orders`, and called the package-private `PriceCalculator` directly: \"2 checks passed\". If something is complex enough to need its own tests, it's usually a package-private class waiting to be extracted.",
            },
            {
              question: "After upgrading a library, the application compiles but fails at run time with IllegalAccessError. What happened?",
              answer:
                "The library narrowed the access of something the application's already-compiled classes use: a field made private, a class made package-private, a method made protected. The JVM rechecks access when it resolves the reference and throws `IllegalAccessError`. It usually means the application wasn't recompiled against the new version, or two versions of the library are on the classpath.\n\nMy `Mechanic` printed `mechanic ready` and then failed at line 8 once `Engine` lost `public`, and recompiling it turned that into three compile errors. Recompiling against the new version shows every affected call site at once.",
            },
            {
              question: "A subclass overrides a method, but the parent's code keeps calling the parent's version. Why might that be?",
              answer:
                "The parent method is probably private, or package-private with the subclass in a different package. In both cases the subclass's method doesn't override anything; it's a new method that only callers of the subclass type reach. A `static` method would behave similarly, through hiding.\n\nThat's `ExportInvoice.discountNote()`: calling it directly printed `export discount 5%`, but `Invoice.print()` printed `no discount`. Adding `@Override` gives \"method does not override or implement a method from a supertype\", and making the parent method `protected` fixes the design.",
            },
            {
              question: "A base class exposes a protected balance field and a subclass drove an account negative. How would you redesign it?",
              answer:
                "Make the field private and give subclasses a `protected final` operation that enforces the rule, so the invariant lives in one place and can't be overridden away. Subclasses get a capability, not the state.\n\nIn `AccessChoice`, the protected-field version ended at `balance is now -2000`, while the redesigned `LateFeeAccount` was stopped by `debit` with \"cannot debit 7000 from 5000, balance still 5000\".",
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
            "Build the four-cell program from this lesson. Add `void restock(int units) { stock += units; }` (no modifier) to `shop.Product`, call `p.restock(5)` from `outlet.Checkout`, and compile.",
            "In `outlet.SaleProduct`, add `long priceGap(Product other) { return pricePaise - other.pricePaise; }`. Compile it, then change the parameter type to `SaleProduct` and compile again.",
            "Write `interface Shape { double area(); }` and `class Circle implements Shape` with `double area() { return 3.14; }`, without `public`. Compile it.",
            "Put `private class Draft { }` alone in `Draft.java` and compile.",
            "Write `Badge.java` with `private int a; int b; protected int c; public int d;`, compile it, and before running `javap -v -p Badge`, write down the four flag values you expect.",
            "Write a class `Library` with `private String secretShelf()` returning `\"rare books\"`, and a `LibraryPeek` class that calls it with `getDeclaredMethod` and `invoke`, first without and then with `setAccessible(true)`.",
            "Create `vehicles.Vehicle` with a package-private `String horn()` returning `\"beep\"` and a public `honk()` that returns `horn()`. In package `garage`, write `Truck extends Vehicle` with `public String horn()` returning `\"HONK\"`, and print `t.honk() + \" \" + t.horn()`. Then make `Vehicle.horn()` protected and run it again.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 fails with `restock(int) is not public in Product; cannot be accessed from outside package`. Step 2 fails with `pricePaise has protected access in Product` at `other.pricePaise`, and compiles once the parameter is a `SaleProduct`. Step 3 gives `area() in Circle cannot implement area() in Shape` followed by `attempting to assign weaker access privileges; was public`. Step 4 gives `modifier private not allowed here`. Step 5 shows `(0x0002) ACC_PRIVATE`, `(0x0000)`, `(0x0004) ACC_PROTECTED` and `(0x0001) ACC_PUBLIC`. Step 6 prints `class LibraryPeek cannot access a member of class Library with modifiers \"private\"`, then `rare books`. Step 7 prints `beep HONK` the first time, because `Truck.horn()` doesn't override a package-private method from another package, and `HONK HONK` once `horn()` is protected.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `LEVELS     private < package-private < protected < public
           private      the top-level class and its nest
           (none)       the package          flag 0x0000
           protected    package + subclasses elsewhere,
                        instance members via own type only
           public       everyone (exported packages only,
                        across modules)

WHERE      top-level type   public or none
           members          all four
           locals, local classes   none
           interfaces       public (default), private methods
           enum ctors       always private

INHERIT    private never inherited, never overridden
           package-private: only inside its package
           override: same or wider access, never narrower

FLAGS      ACC_PUBLIC 0x1  ACC_PRIVATE 0x2  ACC_PROTECTED 0x4
           nested private/protected live in InnerClasses

CHECKS     javac             JLS 6.6, compile errors
           JVM resolution    JVMS 5.4.4 -> IllegalAccessError
           verifier          protected rule -> VerifyError
           reflection        IllegalAccessException,
                             InaccessibleObjectException (modules)

ILLEGAL    abstract + private / static / final /
           synchronized / native, final + volatile,
           two access levels, sealed + final

SPRING     private or self-invoked @Cacheable, @Async,
           @Transactional: silently not intercepted`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Access is decided by where the code is written, never by which object it touches, with one exception: the `protected` own-type rule for subclasses in other packages.",
            "Start every member at `private`, keep implementation classes package-private, use `protected` only for designed extension points, and make `public` a deliberate API. Narrowing later breaks callers, at compile time or with `IllegalAccessError` at run time.",
            "In this lesson `public` still meant \"everyone who can see the package\". The next lesson, Java Modules (JPMS), adds a layer above packages where a public class in an unexported package is invisible to other modules, and where `setAccessible` stops at any package that isn't opened, not just the JDK's.",
          ],
        },
      ],
    },
  ],
};
