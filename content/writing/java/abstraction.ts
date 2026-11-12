import type { Lesson } from "../types";

export const abstraction: Lesson = {
  slug: "abstraction",
  date: "2026-11-07",
  title: "Abstraction",
  description:
    "Exposing what a type does while hiding how: abstract classes and abstract methods down to ACC_ABSTRACT in the class file, why an abstract class has a constructor, the Template Method pattern proven on AbstractList and InputStream, AbstractMethodError from separate compilation, leaky abstractions, and a payment gateway built the way I'd build it.",
  tags: ["Core Java", "OOP", "Abstraction", "Abstract Classes", "Template Method"],
  sections: [
    {
      title: "What Abstraction Is",
      blocks: [
        {
          type: "paragraph",
          text: "The Polymorphism lesson ended with one reference type standing in for many classes, and the JVM picking the right method at run time. That's the mechanism. This lesson is about the design decision that makes the mechanism worth having: choosing what a caller is allowed to know.",
        },
        {
          type: "paragraph",
          text: "**Abstraction** means exposing what something does while hiding how it does it. When the checkout code in an online shop calls `processor.pay(order)`, it needs to know that the payment succeeded, failed or was rejected. It doesn't need to know whether the money moves through a card network, UPI or the customer's bank account, and it shouldn't have to change when a fourth way is added.",
        },
        {
          type: "paragraph",
          text: "Java has two tools built for this: **abstract classes** and **interfaces**. This lesson covers the idea itself, abstract classes and abstract methods down to the class file, the Template Method pattern that abstract classes are best at, and the point where every abstraction starts to leak. Interfaces get the next lesson; the line between the two gets a short preview here.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The idea is older than object-oriented programming. In 1972 David Parnas published \"On the Criteria To Be Used in Decomposing Systems into Modules\", arguing that each module should hide a design decision that's likely to change behind an interface that isn't. In 1974 Barbara Liskov and Stephen Zilles described **abstract data types**: a type defined by the operations it offers, not by how it stores its data. Liskov's language CLU was built around that idea.",
        },
        {
          type: "paragraph",
          text: "The object-oriented version arrived in steps. Simula 67 introduced classes, subclasses and **virtual** procedures, so a superclass could call a procedure that a subclass supplies. Smalltalk-80 had no keyword for it at all: a method meant to be overridden just called `self subclassResponsibility`, which raises an error at run time if a subclass forgot. C++ moved the check to compile time. Release 2.0 in 1989 added pure virtual functions, `virtual double area() = 0;`, and a class that has one can't be instantiated.",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (1996) made it a keyword. `abstract` marks a class that can't be instantiated and a method that has no body, `javac` enforces both, and the class file carries an `ACC_ABSTRACT` flag so the JVM can check again at run time. Some of the oldest classes in the JDK use it: `java.io.InputStream` has been an abstract class with an abstract `read()` since 1.0.",
        },
        {
          type: "paragraph",
          text: "Two later events shaped how abstract classes get used. The 1994 \"Design Patterns\" book by Gamma, Helm, Johnson and Vlissides named the **Template Method** pattern, still the best reason to write an abstract class. And the Collections Framework in Java 1.2 (1998) shipped skeletal implementations, `AbstractCollection`, `AbstractList`, `AbstractSequentialList`, `AbstractSet` and `AbstractMap`, so writing a new collection meant filling in two or three methods. In 2002 Joel Spolsky gave the downside a name: \"The Law of Leaky Abstractions\".",
        },
        {
          type: "paragraph",
          text: "Recent versions moved the line between abstract classes and interfaces. Java 8 added default methods to interfaces (JEP 126, part of Project Lambda), Java 9 added private interface methods (JEP 213), and Java 17 finalized sealed classes (JEP 409), so an abstract class can list exactly which classes may extend it. Java 25 finalized flexible constructor bodies (JEP 513): a subclass can now set its own fields before calling `super(...)`, which defuses the oldest abstract-class trap. That one is in Common Mistakes.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The analogy I keep coming back to is driving a car.",
        },
        {
          type: "list",
          items: [
            "The **controls** (steering wheel, accelerator, brake, gear selector) are the public methods. They say what I want, turn, go, stop, and nothing about how it happens.",
            "What's **under the bonnet**, a petrol engine, a CNG kit or an electric motor, is the implementation. I drive all of them the same way, and a mechanic can swap the engine without retraining me. My driving depends on the controls, not on the engine. That's abstraction.",
            "**\"A car\" as a category** is an abstract class. No showroom sells \"a car\"; it sells a specific model with a specific engine. `new Car()` makes no sense, `new ElectricHatchback()` does.",
            "The parts every model shares, chassis, steering column, brakes, the seat-belt warning, are designed once and fitted to every model: the abstract class's fields, constructor and concrete methods. The chassis is built for every car even though nobody orders \"just a chassis\", the same way an abstract class's constructor runs for every subclass object.",
            "The **engine bay** is left for each model to fill: the abstract method. A model without an engine never leaves the factory, like a concrete class that doesn't implement every abstract method never compiles.",
            "The **start-up sequence** is fixed by the manufacturer: foot on the brake, press start, self-check, then the model-specific part (crank the engine or power up the motor), then the dashboard goes green. A fixed sequence with one model-specific step is the Template Method pattern.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: an electric car's range drops in cold weather and at highway speed, and suddenly the person behind the wheel has to think about the battery. That's a leaky abstraction, and it gets its own section. Java is also stricter than any factory: `javac` refuses a missing implementation at compile time and the JVM checks again at run time, which no car buyer gets. And a car model is a class while each car on the road is an object; the analogy blurs that line, which is harmless here but wouldn't be in the Classes and Objects lesson.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "What and how, at every level",
        },
        {
          type: "paragraph",
          text: "Abstraction isn't one layer. Every layer is the \"what\" for the code above it and the \"how\" for the code below it. A `List` is a good example because I can see all three levels from a terminal:",
        },
        {
          type: "diagram",
          text: ` MY CODE     List<String> names = ...;   names.get(2)
             knows get, add, size, iterator. Nothing else.
 ──────────────────────────────── the List contract ──────
 ArrayList   transient Object[] elementData;  int size;
             get(i): check the index, return elementData[i]
 ──────────────────────────────── the JVM's object model ─
 HEAP        one Object[]: 16-byte header (mark word, class
             pointer, length), then a 4-byte compressed
             reference per slot, each pointing at a String`,
          caption: "Each layer is the \"what\" for the one above and the \"how\" for the one below. The heap numbers are JDK 21 defaults.",
        },
        {
          type: "paragraph",
          text: "`javap -p java.util.ArrayList` confirms the middle layer: it lists `transient java.lang.Object[] elementData;` and `private int size;`. One level down from `List`, an `ArrayList` really is an array and a count. My code never sees either, and keeps working if the JDK changes them.",
        },
        {
          type: "paragraph",
          text: "In an interview, \"how is abstraction achieved in Java?\" expects \"abstract classes and interfaces\". That's right, because those two let me write code against a type whose implementation hasn't been chosen yet. But it isn't the whole toolbox: every well-named method hides its steps (`Collections.sort` doesn't say which sort it runs), a class with private fields hides its representation, and a module hides whole packages (`jdk.internal.*` isn't exported from `java.base`).",
        },
        {
          type: "heading",
          text: "Abstraction vs encapsulation",
        },
        {
          type: "paragraph",
          text: "These two get mixed up because both \"hide\" something. They hide different things for different reasons:",
        },
        {
          type: "table",
          headers: ["", "Abstraction", "Encapsulation"],
          rows: [
            ["The question", "What does it do?", "Who may touch its state?"],
            ["Level", "Design: the shape of a type and its contract", "Implementation: how one class guards its data"],
            ["What it hides", "Complexity and choice: which algorithm, provider or data structure", "State and representation: fields, internal arrays, counters"],
            ["Main Java tools", "Abstract classes, interfaces, well-named methods", "`private` fields, access modifiers, immutability, modules"],
            ["Checked by", "The type system: callers compile against the abstract type", "Access control in `javac`, and access checks in the JVM"],
            ["Protects", "Callers, from details that may change", "The object, from callers that would break its invariants"],
            ["When it's missing", "Callers tied to one implementation; every change ripples out", "Invalid state set from outside: a negative balance, a `null` name"],
            ["Example below", "`PaymentMethod.pay(...)`: checkout can't tell an account from cash", "`BankAccount.balancePaise` is private, and `pay` refuses to overdraw"],
          ],
        },
        {
          type: "paragraph",
          text: "The clearest way I found to see the difference is one small program that has both. `PaymentMethod` is the abstraction; `BankAccount` encapsulates its balance:",
        },
        {
          type: "code",
          language: "java",
          title: "BothIdeas.java",
          code: `abstract class PaymentMethod {                    // abstraction: WHAT a payment method does
    abstract boolean pay(long paise);
}

class BankAccount extends PaymentMethod {
    private long balancePaise;                    // encapsulation: nobody outside can touch it

    BankAccount(long openingPaise) {
        this.balancePaise = Math.max(0, openingPaise);
    }

    @Override
    boolean pay(long paise) {
        if (paise <= 0 || paise > balancePaise) {
            return false;                         // the invariant: balance never goes negative
        }
        balancePaise -= paise;
        return true;
    }

    long balancePaise() {
        return balancePaise;
    }
}

class CashOnDelivery extends PaymentMethod {
    @Override
    boolean pay(long paise) {
        System.out.println("  courier collects Rs " + paise / 100 + " in cash");
        return true;
    }
}

public class BothIdeas {
    // Knows only the abstraction: no idea which payment method it got
    static void checkout(PaymentMethod method, long totalPaise) {
        boolean ok = method.pay(totalPaise);
        System.out.println(method.getClass().getSimpleName() + " pay(" + totalPaise + ") -> " + ok);
    }

    public static void main(String[] args) {
        BankAccount asha = new BankAccount(20_000);
        checkout(asha, 15_000);
        checkout(asha, 15_000);                   // only 5,000 left
        checkout(new CashOnDelivery(), 15_000);
        System.out.println("Asha's account: " + asha.balancePaise() + " paise");
        // asha.balancePaise = -500;              // compile error: private access
    }
}`,
        },
        {
          type: "output",
          text: `BankAccount pay(15000) -> true
BankAccount pay(15000) -> false
  courier collects Rs 150 in cash
CashOnDelivery pay(15000) -> true
Asha's account: 5000 paise`,
        },
        {
          type: "paragraph",
          text: "With the last line uncommented, `javac` stops it:",
        },
        {
          type: "output",
          text: `BothIdeas.java:47: error: balancePaise has private access in BankAccount
        asha.balancePaise = -500;                // compile error: private access
            ^
1 error`,
        },
        {
          type: "list",
          items: [
            "`checkout` is written against `PaymentMethod` and has no idea which class it got. That's abstraction: the caller depends on what, not how. Adding a `CardOnFile` class later wouldn't change a line of `checkout`.",
            "`BankAccount` keeps `balancePaise` private and only changes it through `pay`, which refuses to overdraw. That's encapsulation: the second `pay(15000)` returned `false` instead of leaving the balance at -10,000.",
            "Neither replaces the other. Abstraction without encapsulation gives a clean type whose state anyone can corrupt; encapsulation without abstraction gives a safe class that every caller is welded to. The Encapsulation lesson goes deep on the second half.",
          ],
        },
        {
          type: "heading",
          text: "The rules, in one place",
        },
        {
          type: "code",
          language: "java",
          code: `public abstract class Vehicle {               // abstract: can't be instantiated
    protected final String plate;             // state shared by every subclass

    protected Vehicle(String plate) {         // constructor, reached through super(...)
        this.plate = plate;
    }

    public abstract int rentalPrice(int days); // abstract: no body, just a semicolon

    public final String quote(int days) {     // concrete and final: calls the abstract step
        return plate + " -> Rs " + rentalPrice(days);
    }
}`,
        },
        {
          type: "paragraph",
          text: "The short version of the rules. An abstract class can't be instantiated with `new`, but it can have constructors, instance and static fields, concrete, `static`, `final` and `private` methods, and even `main`; it can implement an interface without implementing its methods, and it can't be `final`. An abstract method has no body, can't be `private`, `static` or `final`, and forces every concrete subclass to override it with the same parameter types, a compatible return type and access at least as wide. The sections after Internal Working show each rule, mostly by breaking it.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "What javac writes into the class file",
        },
        {
          type: "paragraph",
          text: "To see what `abstract` turns into, I compiled a minimal hierarchy and disassembled it:",
        },
        {
          type: "code",
          language: "java",
          title: "VehicleBytecode.java",
          code: `abstract class Vehicle {
    protected final String plate;

    Vehicle(String plate) {
        this.plate = plate;
    }

    abstract int rentalPrice(int days);

    String quote(int days) {
        return plate + " -> Rs " + rentalPrice(days);
    }
}

class Car extends Vehicle {
    Car(String plate) {
        super(plate);
    }

    @Override
    int rentalPrice(int days) {
        return 500 + 1500 * days;
    }
}

public class VehicleBytecode {
    public static void main(String[] args) {
        Vehicle v = new Car("WB-01");
        System.out.println(v.quote(3));
    }
}`,
        },
        {
          type: "output",
          text: `WB-01 -> Rs 5000`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac VehicleBytecode.java && javap -v -p Vehicle`,
        },
        {
          type: "output",
          text: `abstract class Vehicle
  minor version: 0
  major version: 65
  flags: (0x0420) ACC_SUPER, ACC_ABSTRACT
  ...
  Vehicle(java.lang.String);
    descriptor: (Ljava/lang/String;)V
    flags: (0x0000)
    Code:
      stack=2, locals=2, args_size=2
         0: aload_0
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V
         4: aload_0
         5: aload_1
         6: putfield      #7                  // Field plate:Ljava/lang/String;
         9: return

  abstract int rentalPrice(int);
    descriptor: (I)I
    flags: (0x0400) ACC_ABSTRACT

  java.lang.String quote(int);
    ...
         6: invokevirtual #13                 // Method rentalPrice:(I)I
    ...`,
        },
        {
          type: "paragraph",
          text: "I cut the constant pool, the `plate` field, the line-number tables and most of `quote`. What's left says four things:",
        },
        {
          type: "list",
          items: [
            "The class carries `ACC_ABSTRACT` (0x0400). `ACC_SUPER` (0x0020) is on every class `javac` writes; since Java 8 the JVM treats it as set regardless, so it means nothing here.",
            "`rentalPrice` has `ACC_ABSTRACT` and **no `Code` attribute at all**. Not an empty body: no body. The JVM specification (4.7.3) forbids a `Code` attribute on an abstract method, and any method that has one has real bytecode to run.",
            "The abstract class still has a real constructor, `Vehicle(java.lang.String)`, with bytecode: call `Object.<init>`, then store `plate`. Its name in the class file is `<init>`, like any constructor.",
            "`quote` calls `rentalPrice` with an ordinary `invokevirtual` on `Vehicle.rentalPrice`. The base class doesn't know which subclass will answer, and the bytecode doesn't need to.",
          ],
        },
        {
          type: "paragraph",
          text: "Interfaces carry the same flag: `javap -v java.util.List` shows `flags: (0x0601) ACC_PUBLIC, ACC_INTERFACE, ACC_ABSTRACT`, while `java.util.AbstractList` shows `(0x0421) ACC_PUBLIC, ACC_SUPER, ACC_ABSTRACT`. At the class-file level an interface is an abstract type with one more flag, which is where the Interfaces lesson picks up.",
        },
        {
          type: "paragraph",
          text: "The other two classes show who actually calls that constructor:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c Car VehicleBytecode`,
        },
        {
          type: "output",
          text: `class Car extends Vehicle {
  Car(java.lang.String);
    Code:
       0: aload_0
       1: aload_1
       2: invokespecial #1                  // Method Vehicle."<init>":(Ljava/lang/String;)V
       5: return
  ...
  public static void main(java.lang.String[]);
    Code:
       0: new           #7                  // class Car
       3: dup
       4: ldc           #9                  // String WB-01
       6: invokespecial #11                 // Method Car."<init>":(Ljava/lang/String;)V
      ...
      15: invokevirtual #20                 // Method Vehicle.quote:(I)Ljava/lang/String;
      ...`,
        },
        {
          type: "paragraph",
          text: "The only `new` in the whole program is `new #7 // class Car`. `Vehicle`'s constructor runs because `Car`'s constructor calls it with `invokespecial`, on the `Car` object that `new` already allocated. That's the full answer to \"if it can't be instantiated, why does it have a constructor?\": a constructor doesn't create an object, it initializes one, and every `Car` has a `Vehicle` part that needs initializing.",
        },
        {
          type: "heading",
          text: "Instantiating it anyway, through reflection",
        },
        {
          type: "paragraph",
          text: "Reflection skips `javac`, so I tried calling the abstract class's constructor directly:",
        },
        {
          type: "code",
          language: "java",
          title: "ReflectNew.java",
          code: `import java.lang.reflect.Constructor;

abstract class Vehicle {
    Vehicle(String plate) {
        System.out.println("Vehicle constructor ran for " + plate);
    }

    abstract int rentalPrice(int days);
}

public class ReflectNew {
    public static void main(String[] args) throws Exception {
        Constructor<Vehicle> ctor = Vehicle.class.getDeclaredConstructor(String.class);
        try {
            ctor.newInstance("WB-02");
        } catch (InstantiationException e) {
            System.out.println("newInstance on Vehicle: " + e);
            System.out.println("thrown by: " + e.getStackTrace()[0].getClassName());
        }
    }
}`,
        },
        {
          type: "output",
          text: `newInstance on Vehicle: java.lang.InstantiationException
thrown by: jdk.internal.reflect.InstantiationExceptionConstructorAccessorImpl`,
        },
        {
          type: "paragraph",
          text: "`Constructor.newInstance` threw `java.lang.InstantiationException`, a checked exception with no message, and the constructor's `println` never ran: the check happens before any constructor code. The top stack frame is telling: for an abstract class, the JDK's reflection factory hands out an accessor whose only job is to throw. The same call on a concrete subclass's constructor works, and runs `Vehicle`'s constructor as part of it, exactly as `new` does.",
        },
        {
          type: "heading",
          text: "When javac's check isn't enough: AbstractMethodError",
        },
        {
          type: "paragraph",
          text: "`javac` checks one compilation. The JVM links classes that may have been compiled months apart, for example an application's subclass against a newer version of a library's base class. To see what happens when those disagree, I compiled three files, then changed only the base class:",
        },
        {
          type: "code",
          language: "java",
          title: "Vehicle.java (v1)",
          code: `public abstract class Vehicle {
    public abstract int rentalPrice(int days);

    public String quote(int days) {
        return "Rs " + rentalPrice(days);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Car.java (compiled against v1)",
          code: `public class Car extends Vehicle {
    @Override
    public int rentalPrice(int days) {
        return 500 + 1500 * days;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Main.java (compiled against v1)",
          code: `public class Main {
    public static void main(String[] args) {
        Vehicle v = new Car();
        System.out.println("created a " + v.getClass().getName());
        System.out.println(v.quote(3));
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Vehicle.java (v2)",
          code: `public abstract class Vehicle {
    public abstract int rentalPrice(int days);

    public abstract int insurance(int days);    // new in v2

    public String quote(int days) {
        return "Rs " + (rentalPrice(days) + insurance(days));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Vehicle.java Car.java Main.java && java Main
# replace Vehicle.java with v2, recompile only that file
javac Vehicle.java && java Main`,
        },
        {
          type: "output",
          text: `created a Car
Rs 5000

created a Car
Exception in thread "main" java.lang.AbstractMethodError: Receiver class Car does not define or inherit an implementation of the resolved method 'abstract int insurance(int)' of abstract class Vehicle.
	at Vehicle.quote(Vehicle.java:7)
	at Main.main(Main.java:5)`,
        },
        {
          type: "list",
          items: [
            "`new Car()` still worked: the old `Car.class` loaded and linked fine against the new `Vehicle`. The JVM doesn't refuse a concrete class just because it inherits an abstract method it never implemented.",
            "The failure came at the call, inside `Vehicle.quote` at line 7 of v2, on the `invokevirtual` for `insurance`. Method selection walked `Car` and its superclasses and found only the abstract declaration. The JVM specification's rule for `invokevirtual` is exactly that: if selection lands on an abstract method, throw `AbstractMethodError`.",
            "It's an `Error`, a `LinkageError` subclass, not an `Exception`, and the message names the receiver class, the method and where it was declared, which is all I'd need to find the stale JAR.",
          ],
        },
        {
          type: "paragraph",
          text: "Recompiling `Car` against v2 turns it back into a compile error, which is why this only ever shows up with separately compiled code: a library upgraded under an old plugin, or two JARs built against different versions of a shared module.",
        },
        {
          type: "output",
          text: `Car.java:1: error: Car is not abstract and does not override abstract method insurance(int) in Vehicle
public class Car extends Vehicle {
       ^
1 error`,
        },
        {
          type: "paragraph",
          text: "So why both checks? `javac` sees source and can refuse the class outright, but it only knows the versions on the compile-time classpath. The JVM sees whatever class files are on the runtime classpath, and the JVM specification lets it load and link a concrete class that inherits an unimplemented abstract method, so it has to check at the one moment it can't avoid: when a call selects a method and finds no body. The library-side fix is to add the new method as a concrete one with a safe default, `public int insurance(int days) { return 0; }`. I recompiled only `Vehicle.java` with that version, and the old `Car.class` printed `Rs 5000` again. Old subclasses inherit the default, new ones override it. It's the same reason Java 8 gave interfaces default methods: adding an abstract method to a published type breaks everyone who extends it.",
        },
        {
          type: "heading",
          text: "The same check for new: InstantiationError",
        },
        {
          type: "paragraph",
          text: "The reverse change, making an existing concrete class abstract, breaks callers that create instances. I compiled a `Billing` class that does `new Tariff()` against a concrete `Tariff`, then added `abstract` to `Tariff` and recompiled only that file. `Billing` printed its first line and died with `java.lang.InstantiationError: Tariff`, at the line with `new`. This time the `new` instruction itself refused: when it resolves its class and finds `ACC_ABSTRACT`, it throws. JLS 13.4.1 describes exactly this pair: `InstantiationError` at link time, or `InstantiationException` through reflection as `ReflectNew` showed. Error for linkage, Exception for the reflective call.",
        },
      ],
    },
    {
      title: "Abstract Classes in Depth",
      blocks: [
        {
          type: "heading",
          text: "No new, ever",
        },
        {
          type: "code",
          language: "java",
          title: "NoVehicle.java",
          code: `abstract class Vehicle {
    abstract int rentalPrice(int days);
}

public class NoVehicle {
    public static void main(String[] args) {
        Vehicle v = new Vehicle();
    }
}`,
        },
        {
          type: "output",
          text: `NoVehicle.java:7: error: Vehicle is abstract; cannot be instantiated
        Vehicle v = new Vehicle();
                    ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The caret points at `new`, not at the variable. Declaring `Vehicle v` is legal and is the whole point of the type: variables, parameters, fields and return types can all be `Vehicle`. Only the creation expression is refused. An anonymous subclass is the one way to write `new Vehicle(...)` followed by a body, `new Vehicle() { int rentalPrice(int days) { return 0; } }`, because that creates an instance of a new, unnamed concrete subclass, not of `Vehicle`. The Nested and Inner Classes lesson covers anonymous classes; Syntax at a Glance shows one compiling to its own `$1.class` file.",
        },
        {
          type: "heading",
          text: "Constructors run for every subclass object",
        },
        {
          type: "code",
          language: "java",
          title: "ConstructorOrder.java",
          code: `abstract class Vehicle {
    private final String plate;

    protected Vehicle(String plate) {
        System.out.println("1. Vehicle constructor, building a " + getClass().getSimpleName());
        this.plate = plate;
    }

    String plate() {
        return plate;
    }

    abstract int rentalPrice(int days);
}

class Car extends Vehicle {
    Car(String plate) {
        super(plate);
        System.out.println("2. Car constructor, plate already set: " + plate());
    }

    @Override
    int rentalPrice(int days) {
        return 500 + 1500 * days;
    }
}

public class ConstructorOrder {
    public static void main(String[] args) {
        Vehicle v = new Car("WB-01");
        System.out.println("3. done: " + v.plate() + " for 3 days costs " + v.rentalPrice(3));
    }
}`,
        },
        {
          type: "output",
          text: `1. Vehicle constructor, building a Car
2. Car constructor, plate already set: WB-01
3. done: WB-01 for 3 days costs 5000`,
        },
        {
          type: "list",
          items: [
            "Line 1 says \"building a Car\": inside the abstract class's own constructor, `getClass()` already returns `Car`. There is exactly one object, created by `new Car`, and `Vehicle`'s constructor is initializing the `Vehicle` part of it.",
            "The `Vehicle` part is fully initialized before the rest of `Car`'s constructor runs, so `plate()` already works on line 2. That's the normal superclass-first order; the Constructors lesson covers every step of it, initializer blocks included.",
            "This is what the constructor of an abstract class is for: setting and validating the state every subclass shares, written once. I made it `protected`, the usual convention, since only subclasses can call it anyway. The JDK does the same: `AbstractList`'s constructor is `protected` and its Javadoc reads \"Sole constructor. (For invocation by subclass constructors, typically implicit.)\"",
          ],
        },
        {
          type: "heading",
          text: "Everything else is allowed",
        },
        {
          type: "paragraph",
          text: "Apart from `new`, an abstract class can hold anything a normal class can: instance and static fields, static methods, `final` and `private` methods, nested types, even `main`. The Syntax at a Glance program has all of them in one file, and it's an abstract class that launches itself with `java AbstractSyntax`, because a `static` `main` never needs an instance.",
        },
        {
          type: "callout",
          tone: "note",
          title: "Java 25: an instance main is a different story",
          text: "JDK 25 finalized instance main methods (JEP 512). I put one in an abstract class, `public abstract class Launcher { void main() { ... } }`, and the JDK 25 launcher refused it: `Error: abstract class Launcher can not be instantiated`, then `please use a concrete class`. To call an instance `main`, the launcher has to create an object first. A `static void main()` in an abstract class ran fine on JDK 25.",
        },
      ],
    },
    {
      title: "Abstract Methods and Their Rules",
      blocks: [
        {
          type: "heading",
          text: "A concrete subclass must implement every abstract method",
        },
        {
          type: "code",
          language: "java",
          title: "MissingPrice.java",
          code: `abstract class Vehicle {
    abstract int rentalPrice(int days);
}

class Car extends Vehicle {
    int rentalPrice(long days) {        // looks like an implementation, isn't one
        return (int) (500 + 1500 * days);
    }
}

public class MissingPrice {
    public static void main(String[] args) {
        System.out.println(new Car().rentalPrice(3));
    }
}`,
        },
        {
          type: "output",
          text: `MissingPrice.java:5: error: Car is not abstract and does not override abstract method rentalPrice(int) in Vehicle
class Car extends Vehicle {
^
1 error`,
        },
        {
          type: "paragraph",
          text: "`rentalPrice(long)` is a different method, an overload, because the parameter type differs. So `Car` still inherits `rentalPrice(int)` with no body, and a concrete class can't have that. The two ways out are the ones the message suggests: implement `rentalPrice(int)`, or declare `Car` abstract too and let its own subclasses do it. With `@Override` on `rentalPrice(long)`, `javac` adds a second, more direct error, `method does not override or implement a method from a supertype`. That's why I put `@Override` on every implementation.",
        },
        {
          type: "heading",
          text: "A body, or no body",
        },
        {
          type: "paragraph",
          text: "The two body rules mirror each other, and `javac` words them clearly. `abstract int rentalPrice(int days) { return 0; }` fails with `abstract methods cannot have a body`; a plain `String plate();` in a class fails with `missing method body, or declare abstract`. An abstract method inside a class that isn't declared abstract gets a message that names the class twice, which confused me the first time: `class NotAbstract { abstract int rentalPrice(int days); }` fails with `NotAbstract is not abstract and does not override abstract method rentalPrice(int) in NotAbstract`.",
        },
        {
          type: "heading",
          text: "Modifiers that contradict abstract",
        },
        {
          type: "code",
          language: "java",
          title: "IllegalCombos.java",
          code: `abstract class Vehicle {
    private abstract int basePrice();
    static abstract int perDay();
    final abstract int rentalPrice(int days);
}

final abstract class Bike {
}`,
        },
        {
          type: "output",
          text: `IllegalCombos.java:7: error: illegal combination of modifiers: abstract and final
final abstract class Bike {
               ^
IllegalCombos.java:2: error: illegal combination of modifiers: abstract and private
    private abstract int basePrice();
                         ^
IllegalCombos.java:3: error: illegal combination of modifiers: abstract and static
    static abstract int perDay();
                        ^
IllegalCombos.java:4: error: illegal combination of modifiers: abstract and final
    final abstract int rentalPrice(int days);
                       ^
4 errors`,
        },
        {
          type: "table",
          headers: ["Combination", "Why it can never work"],
          rows: [
            ["`private abstract`", "`abstract` means a subclass must supply the body. A private method isn't visible to subclasses, so nothing could ever override it"],
            ["`static abstract`", "A static method belongs to the class and is bound at compile time with `invokestatic`. There's no object whose class could supply a body, so `Vehicle.perDay()` would have nothing to run"],
            ["`final abstract` method", "`final` forbids overriding; `abstract` requires it. One says never, the other says always"],
            ["`final abstract` class", "An abstract class is useless without a subclass, and a final class can't have one"],
            ["`synchronized`, `native`, `strictfp`", "All three describe a body: a lock held while it runs, code written in C, floating-point mode. An abstract method has no body to describe. I tried each and got the same `illegal combination` error"],
          ],
        },
        {
          type: "paragraph",
          text: "`protected abstract` and package-private abstract are both fine, and `protected abstract` is what I use for template steps: subclasses must see the method, callers outside the hierarchy don't need to.",
        },
        {
          type: "heading",
          text: "An abstract class with no abstract methods",
        },
        {
          type: "paragraph",
          text: "Sometimes `abstract` is there only to stop direct instantiation, because an instance of the base class would compile, run and do nothing useful. The classic case is the servlet base class. I checked it in Tomcat 11.0.21's copy of the Jakarta Servlet API, the current home of what used to be `javax.servlet.http.HttpServlet`:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -cp tomcat-embed-core-11.0.21.jar jakarta.servlet.http.HttpServlet | grep abstract`,
        },
        {
          type: "output",
          text: `public abstract class jakarta.servlet.http.HttpServlet extends jakarta.servlet.GenericServlet {`,
        },
        {
          type: "paragraph",
          text: "The only `abstract` is on the class. `GenericServlet` declares `service(ServletRequest, ServletResponse)` abstract, `HttpServlet` implements it, and every `doXxx` method has a default body. In the Tomcat source, `doGet`, `doPost`, `doPut`, `doDelete` and `doPatch` all answer 405 Method Not Allowed (400 for HTTP/1.0) with messages like \"HTTP method GET is not supported by this URL\"; only `doHead`, `doOptions` and `doTrace` do real work. A plain `HttpServlet` would reject almost every request, so the class is abstract to say \"subclass me and override what you support\". `java.awt.event.MouseAdapter` is the JDK's own example: abstract, with eight empty methods and a `protected` constructor, so a listener overrides only the one or two events it cares about.",
        },
        {
          type: "heading",
          text: "Re-abstracting a concrete method",
        },
        {
          type: "paragraph",
          text: "An abstract method can override a concrete one. `Object.toString()` has a body, but an abstract class can declare `@Override public abstract String toString();` and every concrete subclass then has to write its own. I tried it with an `abstract class LogEvent` and a subclass that had no `toString`, and `javac` refused it even though `Object` supplies one: `OrderShipped is not abstract and does not override abstract method toString() in LogEvent`. I'd use that for event types whose `toString` ends up in logs, where `LogEvent@1b6d3586` is useless when I'm reading them.",
        },
      ],
    },
    {
      title: "The Template Method Pattern",
      blocks: [
        {
          type: "paragraph",
          text: "An abstract class earns its place when the algorithm is the same for every subclass and only some steps differ. The \"Design Patterns\" definition, in my words: put the skeleton of the algorithm in one method of the base class, defer some steps to subclasses, and let subclasses redefine those steps without changing the order they run in.",
        },
        {
          type: "table",
          headers: ["Part", "Declared as", "Written by"],
          rows: [
            ["Template method", "`public final`, in the abstract class", "The base class. It fixes the order of the steps"],
            ["Abstract steps", "`protected abstract`", "Every concrete subclass, no choice"],
            ["Hooks", "`protected`, concrete, with a default (often empty)", "Subclasses, only if they want to"],
            ["Helpers", "`private`", "The base class only"],
          ],
        },
        {
          type: "diagram",
          text: ` ShippingRule (abstract)                 CourierShipping
 ┌──────────────────────────────────┐    ┌────────────────────────┐
 │ final cost(kg, express)          │    │                        │
 │   baseCost() + perKg() * kg ─────┼───>│ baseCost()  50         │
 │                                  │    │ perKg()     12         │
 │   if express: expressCost(c) ────┼─ ─>│ (default: +25%)        │
 │   max(c, minimumCost()) ─────────┼───>│ minimumCost()  120     │
 └──────────────────────────────────┘    └────────────────────────┘
   the base class calls down              the subclass never calls up`,
          caption: "Solid arrows: steps the subclass supplies. Dashed: a hook it left at the default.",
        },
        {
          type: "paragraph",
          text: "The direction of the calls is the point. The base class calls the subclass, not the other way round, which is why it's often called the Hollywood principle: \"don't call us, we'll call you\". `ShippingTemplate` in the Examples is that diagram as running code. The better proof is that the JDK has been built this way since its first versions.",
        },
        {
          type: "heading",
          text: "Proof from the JDK: AbstractList",
        },
        {
          type: "paragraph",
          text: "`AbstractList` is the template method pattern at scale. Its Javadoc says that to implement an unmodifiable list, I only need `get(int)` and `size()`. I wrote a list of invoice numbers that computes each element instead of storing it, and counted how often my `get` was called:",
        },
        {
          type: "code",
          language: "java",
          title: "InvoiceNumbers.java",
          code: `import java.util.AbstractList;
import java.util.List;
import java.util.Objects;
import java.util.RandomAccess;

public class InvoiceNumbers extends AbstractList<String> implements RandomAccess {
    private final int first;
    private final int count;
    int getCalls = 0;

    InvoiceNumbers(int first, int count) {
        this.first = first;
        this.count = count;
    }

    @Override
    public String get(int index) {                 // abstract in AbstractList
        getCalls++;
        Objects.checkIndex(index, count);
        return "INV-" + (first + index);
    }

    @Override
    public int size() {                            // abstract in AbstractCollection
        return count;
    }

    public static void main(String[] args) {
        InvoiceNumbers invoices = new InvoiceNumbers(1001, 5);
        List<String> same = List.of("INV-1001", "INV-1002", "INV-1003", "INV-1004", "INV-1005");

        System.out.println("toString  " + invoices);
        invoices.getCalls = 0;
        System.out.println("contains  " + invoices.contains("INV-1003") + " after " + invoices.getCalls + " calls to get");
        System.out.println("indexOf   " + invoices.indexOf("INV-1004"));
        System.out.println("subList   " + invoices.subList(1, 3));
        System.out.println("equals    " + invoices.equals(same) + ", same hashCode: " + (invoices.hashCode() == same.hashCode()));

        StringBuilder ids = new StringBuilder();
        for (String number : invoices) {           // iterator() is inherited too
            ids.append(number.substring(4)).append(' ');
        }
        System.out.println("for-each  " + ids.toString().trim());

        try {
            invoices.add("INV-1006");
        } catch (UnsupportedOperationException e) {
            System.out.println("add       " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `toString  [INV-1001, INV-1002, INV-1003, INV-1004, INV-1005]
contains  true after 3 calls to get
indexOf   3
subList   [INV-1002, INV-1003]
equals    true, same hashCode: true
for-each  1001 1002 1003 1004 1005
add       java.lang.UnsupportedOperationException`,
        },
        {
          type: "list",
          items: [
            "I wrote two methods. `toString`, `contains`, `indexOf`, `subList`, `equals`, `hashCode` and `iterator` all came from `AbstractList` and `AbstractCollection`.",
            "`contains(\"INV-1003\")` made exactly three calls to `get`: the inherited iterator walked indices 0, 1 and 2 and stopped at the match. Every inherited method is built on my `get`, which is why the Javadoc says `AbstractList` is for \"random access\" data such as an array, and points sequential data at `AbstractSequentialList`, which does the reverse and builds `get(i)` on top of an iterator.",
            "`equals(List.of(...))` was `true` and the hash codes matched. The `List` contract defines both element by element, and `AbstractList` implements the contract, so a 30-line list is interchangeable with the JDK's own.",
            "`add` threw `UnsupportedOperationException`. That's a hook with a refusing default: `add(int, E)`, `set` and `remove` throw unless overridden. The Javadoc's recipe is `get` and `size` for an unmodifiable list, plus `set` for a modifiable one, plus `add` and `remove` for a variable-size one.",
            "I also marked it `RandomAccess`, a marker interface promising that `get(i)` is fast. It matters in the Leaky Abstractions section.",
          ],
        },
        {
          type: "heading",
          text: "Proof from the JDK: InputStream",
        },
        {
          type: "paragraph",
          text: "`InputStream` has exactly one abstract method, `read()`, which returns one byte as an `int` from 0 to 255, or -1 at the end. Everything else is built on it:",
        },
        {
          type: "code",
          language: "java",
          title: "MessageStream.java",
          code: `import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MessageStream extends InputStream {
    private final byte[] data;
    private int pos = 0;
    int readCalls = 0;

    MessageStream(String text) {
        this.data = text.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public int read() {                            // the only method I wrote
        readCalls++;
        return pos < data.length ? data[pos++] & 0xFF : -1;
    }

    public static void main(String[] args) throws IOException {
        MessageStream in = new MessageStream("order=42 customer=Asha total=170");

        byte[] first = new byte[8];
        int n = in.read(first);                    // inherited read(byte[])
        System.out.println("read(byte[])  -> " + n + " bytes: " + new String(first, 0, n, StandardCharsets.UTF_8));

        in.skip(1);                                // inherited skip(long)
        byte[] rest = in.readAllBytes();           // inherited readAllBytes()
        System.out.println("readAllBytes  -> " + new String(rest, StandardCharsets.UTF_8));
        System.out.println("bytes in the message: " + in.data.length + ", calls to my read(): " + in.readCalls);
    }
}`,
        },
        {
          type: "output",
          text: `read(byte[])  -> 8 bytes: order=42
readAllBytes  -> customer=Asha total=170
bytes in the message: 32, calls to my read(): 34`,
        },
        {
          type: "list",
          items: [
            "`read(byte[])`, `skip` and `readAllBytes` all worked from one 3-line method.",
            "32 bytes cost 34 calls: one per byte, plus two that returned -1, one inside the inherited `read(byte[], int, int)` and one when `readAllBytes` asked again to confirm the end.",
            "The `@implSpec` of `read(byte[], int, int)` says the default \"simply calls the method read() repeatedly\" and that subclasses are encouraged to provide a more efficient implementation. `ByteArrayInputStream` and `FileInputStream` both override it. A template's default steps are correct, not necessarily fast.",
          ],
        },
        {
          type: "heading",
          text: "In frameworks",
        },
        {
          type: "list",
          items: [
            "`HttpServlet.service(HttpServletRequest, HttpServletResponse)` is a template. In the Tomcat source it switches on the HTTP method and calls `doGet`, `doPost`, `doPut` and the rest: hooks, with the defaults from the previous section.",
            "Spring's `OncePerRequestFilter.doFilter` does the bookkeeping (has this request already passed this filter? is this an async or error dispatch?) and then calls `protected abstract void doFilterInternal(...)`, the only method a custom filter writes. `javap` shows `doFilter` as `public final` in spring-web 6.1.5 but plain `public` in 6.2.11, so not skipping the bookkeeping is now a convention there rather than a guarantee.",
            "Spring JDBC's `AbstractRoutingDataSource` is a complete `DataSource` with one abstract step, `protected abstract Object determineCurrentLookupKey()`. Returning a tenant id, or \"replica\" for read-only work, is how one service routes queries to different databases.",
            "Spring's own startup is a template. `AbstractApplicationContext.refresh()` runs a fixed sequence of twelve steps, from `prepareRefresh` to `finishRefresh`, calling abstract steps and hooks along the way.",
          ],
        },
        {
          type: "paragraph",
          text: "`javap` on spring-context 6.2.11 shows the shape: `refresh()` is a public method, `postProcessBeanFactory` and `onRefresh` are protected hooks whose bytecode is a single `return`, and `refreshBeanFactory()`, `getBeanFactory()` and `closeBeanFactory()` are abstract (the first two are used during `refresh`, the third on shutdown). Spring Boot's `ServletWebServerApplicationContext` overrides `onRefresh`, and `javap -c` on spring-boot 3.5.0 shows what it does there: `super.onRefresh()`, then `createWebServer()`, which is where the embedded Tomcat starts. `GenericApplicationContext` implements the three abstract steps and marks all three `final`: the pattern applied twice.",
        },
        {
          type: "heading",
          text: "Template method or callback?",
        },
        {
          type: "paragraph",
          text: "Spring's `JdbcTemplate` has \"template\" in its name, but it's a concrete class, not abstract. The varying step is passed in, as a `RowMapper` lambda, instead of being written in a subclass. Same skeleton-plus-one-step idea, built with composition instead of inheritance. Which one I'd reach for is in the When to Use section.",
        },
      ],
    },
    {
      title: "Abstract Class or Interface? A Preview",
      blocks: [
        {
          type: "paragraph",
          text: "The Interfaces lesson has the full side-by-side table and the decision guide. The short version: an abstract class can hold **state** (instance fields), constructors and members at any access level, and a class can extend only **one** of them. An interface holds no instance state, a class can implement **many**, and since Java 8 it can carry default methods. So an abstract class describes what a family of classes **is** and shares how they work; an interface describes what a class **can do**.",
        },
        {
          type: "list",
          items: [
            "Do the implementations need shared fields, or a constructor that validates them? That points to an abstract class.",
            "Could unrelated classes need this capability, or would one class need several such capabilities? That points to an interface.",
            "Is it a type other teams will implement? Usually both: an interface as the type, and an abstract class as an optional skeleton, the way `List` and `AbstractList` work. `SkeletalShipping` in the Examples does the same with shipping costs.",
          ],
        },
      ],
    },
    {
      title: "Leaky Abstractions",
      blocks: [
        {
          type: "paragraph",
          text: "Spolsky's law is one sentence: \"All non-trivial abstractions, to some degree, are leaky.\" An abstraction hides how something is done. It can't fully hide how much it costs, or how it fails, and those are exactly the details that surface under load.",
        },
        {
          type: "paragraph",
          text: "My favourite small example is `List.get(i)`. The method is identical on every list, and the cost isn't: `ArrayList.get` is an array read, `LinkedList.get` walks node by node from the nearer end. So the most ordinary loop in Java is O(n) on one list and O(n²) on the other:",
        },
        {
          type: "code",
          language: "java",
          title: "LeakyList.java",
          code: `import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.RandomAccess;

public class LeakyList {
    static long sumByIndex(List<Integer> prices) {
        long total = 0;
        for (int i = 0; i < prices.size(); i++) {
            total += prices.get(i);                // reads like an O(1) array access
        }
        return total;
    }

    static long sumByIterator(List<Integer> prices) {
        long total = 0;
        for (int price : prices) {
            total += price;
        }
        return total;
    }

    static void time(String label, List<Integer> prices, boolean byIndex) {
        long start = System.nanoTime();
        long total = byIndex ? sumByIndex(prices) : sumByIterator(prices);
        long ms = (System.nanoTime() - start) / 1_000_000;
        System.out.printf("%-10s %-8s total=%d  %,6d ms%n", label, byIndex ? "get(i)" : "for-each", total, ms);
    }

    public static void main(String[] args) {
        int n = Integer.parseInt(args[0]);
        List<Integer> array = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            array.add(100 + i % 400);
        }
        List<Integer> linked = new LinkedList<>(array);

        System.out.println("ArrayList is RandomAccess:  " + (array instanceof RandomAccess));
        System.out.println("LinkedList is RandomAccess: " + (linked instanceof RandomAccess));
        time("ArrayList", array, true);
        time("LinkedList", linked, true);
        time("ArrayList", array, false);
        time("LinkedList", linked, false);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx256m LeakyList 50000
java -Xmx256m LeakyList 100000`,
        },
        {
          type: "output",
          text: `ArrayList is RandomAccess:  true
LinkedList is RandomAccess: false
ArrayList  get(i)   total=14975000       5 ms
LinkedList get(i)   total=14975000     699 ms
ArrayList  for-each total=14975000       5 ms
LinkedList for-each total=14975000       2 ms

ArrayList is RandomAccess:  true
LinkedList is RandomAccess: false
ArrayList  get(i)   total=29950000       7 ms
LinkedList get(i)   total=29950000   2,883 ms
ArrayList  for-each total=29950000       5 ms
LinkedList for-each total=29950000       2 ms`,
        },
        {
          type: "list",
          items: [
            "These are rough single-shot timings from my machine on JDK 21, with other JVMs running, so only the shape matters. Over several runs, `LinkedList` with `get(i)` took 0.6 to 0.75 seconds at 50,000 elements and 2.4 to 2.9 seconds at 100,000. Everything else stayed under 10 ms.",
            "Doubling the size made the `LinkedList` loop about four times slower. That's the O(n²) showing through: each `get(i)` walks up to n/2 nodes, and the loop does it n times.",
            "The for-each loop fixed it for both lists, because it uses the list's own iterator, which knows how to step to the next node. Same abstraction, same result, a few hundred times less work.",
          ],
        },
        {
          type: "paragraph",
          text: "The JDK knows about this leak and patches it with a marker. `RandomAccess` has no methods; it only says \"`get(i)` is cheap here\", and generic algorithms check for it. `javap -c java.util.Collections` on JDK 21 shows `binarySearch` starting with `instanceof java/util/RandomAccess` and a comparison against `sipush 5000` (`BINARYSEARCH_THRESHOLD`): a `RandomAccess` list, or any list under 5,000 elements, gets an index-based search, and anything else gets an iterator-based one. The abstraction leaked, so the library added a second, tiny abstraction to describe the cost.",
        },
        {
          type: "heading",
          text: "Other leaks I'd expect in a backend",
        },
        {
          type: "list",
          items: [
            "**ORM lazy loading.** `order.getCustomer().getName()` looks like two getters. With a lazily loaded JPA association it's a SQL query, and in a loop over 100 orders it's the N+1 problem: one query for the orders, then one per order. The Spring Data JPA and Hibernate track covers the fixes.",
            "**Remote calls behind a local-looking interface.** `inventoryClient.stockFor(sku)` reads like a method call, but it can take two seconds, time out or half-succeed. No interface hides latency and partial failure, which is why timeouts and retries end up in the caller anyway.",
            "**Collections with surprising costs.** `ConcurrentLinkedQueue.size()` is O(n); its Javadoc says, in so many words, that unlike in most collections it is NOT a constant-time operation.",
          ],
        },
        {
          type: "paragraph",
          text: "What I do about it: know the abstraction one level down, at least for the ones on a hot path; put the cost in the contract when I write an abstraction (a Javadoc line, or a marker like `RandomAccess`); and measure before trusting either.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `VehicleBytecode` from Internal Working, from source to the printed `WB-01 -> Rs 5000`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`javac` reads `Vehicle`. It's declared `abstract`, so `rentalPrice` may have no body. It writes `ACC_ABSTRACT` on the class and on `rentalPrice`, and gives `rentalPrice` no `Code` attribute.",
            "`javac` checks `Car`. It isn't abstract, so it needs a body for every abstract method it inherits. `rentalPrice(int)` is there with a matching signature, so it compiles. Without it: `Car is not abstract and does not override abstract method rentalPrice(int) in Vehicle`.",
            "`javac` compiles `Car`'s constructor: `super(plate)` becomes `invokespecial Vehicle.<init>(String)`.",
            "`javac` checks `new Car(\"WB-01\")` in `main`. `Car` isn't abstract, so the creation is allowed; `new Vehicle(...)` would fail right here. `v.quote(3)` compiles against the declared type, as `invokevirtual Vehicle.quote`.",
            "At run time, the first `new` resolves `Car`. Loading `Car` loads its superclass `Vehicle` first, and `Object` before that, the order from the Class Loading lesson.",
            "The `new` instruction checks that `Car` isn't abstract (an abstract class here means `InstantiationError`), allocates a `Car` object with room for the inherited `plate` field, and zeroes it.",
            "`invokespecial Car.<init>` runs, and its first instruction runs `Vehicle.<init>` on the same object, which runs `Object.<init>`. Then `plate` is stored and control returns to `Car`'s constructor.",
            "`v.quote(3)` runs `invokevirtual Vehicle.quote`. `Car` doesn't override it, so the selected method is the inherited `Vehicle.quote`.",
            "Inside `quote`, `invokevirtual Vehicle.rentalPrice` names `Vehicle`, but selection starts at the object's actual class, `Car`, and finds `Car.rentalPrice`, which returns 500 + 1500 × 3 = 5000. Had selection found only the abstract declaration, as with the stale `Car.class` earlier, this is where `AbstractMethodError` would be thrown.",
            "`quote` builds `\"WB-01 -> Rs 5000\"` with the `invokedynamic` string concatenation, returns it, and `main` prints it.",
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
          title: "AbstractSyntax.java",
          code: `interface Priced {
    int price(int days);
}

abstract class Rental implements Priced {            // abstract; Priced.price left open
    private static int created = 0;                  // static field
    protected final String rentalId;                 // instance field

    protected Rental(String rentalId) {              // constructor, runs via subclasses
        this.rentalId = rentalId;
        created++;
    }

    protected abstract int perDay();                 // abstract method: no body

    public final String receipt(int days) {          // final template method
        return label() + price(days) + note();
    }

    protected String note() {                        // hook with a default
        return "";
    }

    private String label() {                         // private helper
        return rentalId + ": Rs ";
    }

    static int created() {                           // static method
        return created;
    }
}

abstract class MemberRental extends Rental {         // abstract subclass: fills in some steps
    protected MemberRental(String rentalId) { super(rentalId); }

    @Override
    public int price(int days) { return 40 + perDay() * days; }   // implements Priced.price

    @Override
    protected String note() { return " (member)"; }
}

class BikeRental extends MemberRental {              // concrete: nothing left abstract
    BikeRental(String rentalId) { super(rentalId); }

    @Override
    protected int perDay() { return 7; }
}

public abstract class AbstractSyntax {               // even the launcher can be abstract
    public static void main(String[] args) {
        Rental bike = new BikeRental("RN-1");
        Rental promo = new Rental("RN-2") {          // anonymous subclass
            @Override public int price(int days) { return 99; }
            @Override protected int perDay() { return 0; }
        };
        System.out.println(bike.receipt(10));
        System.out.println(promo.receipt(10));
        System.out.println("rentals created: " + Rental.created());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac AbstractSyntax.java && ls *.class && java AbstractSyntax`,
        },
        {
          type: "output",
          text: `AbstractSyntax$1.class
AbstractSyntax.class
BikeRental.class
MemberRental.class
Priced.class
Rental.class
RN-1: Rs 110 (member)
RN-2: Rs 99
rentals created: 2`,
        },
        {
          type: "list",
          items: [
            "`Rental` implements `Priced` without implementing `price`, which is legal only because `Rental` is abstract. `MemberRental` supplies `price` but leaves `perDay` open, so it has to stay abstract too. `BikeRental` is the first class with nothing left abstract.",
            "`new Rental(\"RN-2\") { ... }` compiled to `AbstractSyntax$1.class`, a real subclass. Both rentals ran `Rental`'s constructor, so `created()` returned 2.",
            "`java AbstractSyntax` launched an abstract class: `main` is static, so no instance was ever needed.",
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Shipping rules with abstract steps and hooks",
        },
        {
          type: "paragraph",
          text: "The smallest template I could write: a `final` template method, two abstract steps, two hooks with defaults, and three shipping methods that use them differently.",
        },
        {
          type: "code",
          language: "java",
          title: "ShippingTemplate.java",
          code: `abstract class ShippingRule {
    // The template method: final, so no subclass can change the order of the steps
    public final int cost(int kg, boolean express) {
        int cost = baseCost() + perKg() * kg;       // abstract steps
        if (express) {
            cost = expressCost(cost);               // hook with a default
        }
        return Math.max(cost, minimumCost());       // hook with a default
    }

    protected abstract int baseCost();

    protected abstract int perKg();

    protected int expressCost(int cost) {           // hook: 25% extra unless overridden
        return cost * 125 / 100;
    }

    protected int minimumCost() {                   // hook: no minimum unless overridden
        return 0;
    }
}

class PostShipping extends ShippingRule {
    protected int baseCost() { return 30; }
    protected int perKg() { return 11; }
}

class CourierShipping extends ShippingRule {
    protected int baseCost() { return 50; }
    protected int perKg() { return 12; }

    @Override
    protected int minimumCost() { return 120; }
}

class FreightShipping extends ShippingRule {
    protected int baseCost() { return 20; }
    protected int perKg() { return 6; }

    @Override
    protected int expressCost(int cost) { return cost + 10; }   // flat express charge
}

public class ShippingTemplate {
    public static void main(String[] args) {
        ShippingRule[] rules = { new PostShipping(), new CourierShipping(), new FreightShipping() };
        for (ShippingRule rule : rules) {
            System.out.printf("%-15s 2 kg: %3d   10 kg: %3d   10 kg express: %3d%n",
                    rule.getClass().getSimpleName(),
                    rule.cost(2, false), rule.cost(10, false), rule.cost(10, true));
        }
    }
}`,
        },
        {
          type: "output",
          text: `PostShipping    2 kg:  52   10 kg: 140   10 kg express: 175
CourierShipping 2 kg: 120   10 kg: 170   10 kg express: 212
FreightShipping 2 kg:  32   10 kg:  80   10 kg express:  90`,
        },
        {
          type: "list",
          items: [
            "Every rule ran the same sequence: base plus per-kg, then the express step, then the minimum. None of them could reorder it, because `cost` is `final`.",
            "`PostShipping` wrote only the two abstract steps and took both hook defaults: 140 normally, 175 express (25% extra).",
            "`CourierShipping` overrode the `minimumCost` hook. A 2 kg parcel computed 74 and was charged 120.",
            "`FreightShipping` overrode the `expressCost` hook with a flat Rs 10, so 80 became 90 instead of 100.",
          ],
        },
        {
          type: "heading",
          text: "A notification sender for SMS, email and push",
        },
        {
          type: "paragraph",
          text: "The same message goes out through three channels with one shared rule: only urgent channels during quiet hours, 22:00 to 07:00. The rule lives in the template; each channel writes how it formats and delivers.",
        },
        {
          type: "code",
          language: "java",
          title: "NotificationDemo.java",
          code: `import java.time.LocalTime;

abstract class NotificationSender {
    // The template: every channel runs the same steps in the same order
    public final void send(String userId, String message, LocalTime now) {
        boolean quietHours = now.isAfter(LocalTime.of(22, 0)) || now.isBefore(LocalTime.of(7, 0));
        if (quietHours && !urgent()) {
            System.out.println(getClass().getSimpleName() + " held for " + userId + " until 07:00");
            return;
        }
        deliver(userId, format(message));
    }

    protected abstract String format(String message);

    protected abstract void deliver(String to, String body);

    protected boolean urgent() {                    // hook: most channels wait for morning
        return false;
    }
}

class SmsSender extends NotificationSender {
    protected String format(String m) { return m.length() <= 160 ? m : m.substring(0, 157) + "..."; }
    protected void deliver(String to, String body) { System.out.println("SMS to " + to + ": " + body); }

    @Override
    protected boolean urgent() { return true; }     // SMS carries alerts, so it goes out at night
}

class EmailSender extends NotificationSender {
    protected String format(String m) { return "[Order update] " + m; }
    protected void deliver(String to, String body) { System.out.println("Email to " + to + ": " + body); }
}

class PushSender extends NotificationSender {
    protected String format(String m) { return "{\\"title\\":\\"Order update\\",\\"body\\":\\"" + m + "\\"}"; }
    protected void deliver(String to, String body) { System.out.println("Push to " + to + ": " + body); }
}

public class NotificationDemo {
    public static void main(String[] args) {
        NotificationSender[] senders = { new SmsSender(), new EmailSender(), new PushSender() };
        for (LocalTime now : new LocalTime[] { LocalTime.of(14, 30), LocalTime.of(23, 15) }) {
            System.out.println("-- " + now);
            for (NotificationSender sender : senders) {
                sender.send("asha", "Order 1042 is out for delivery", now);
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `-- 14:30
SMS to asha: Order 1042 is out for delivery
Email to asha: [Order update] Order 1042 is out for delivery
Push to asha: {"title":"Order update","body":"Order 1042 is out for delivery"}
-- 23:15
SMS to asha: Order 1042 is out for delivery
EmailSender held for asha until 07:00
PushSender held for asha until 07:00`,
        },
        {
          type: "paragraph",
          text: "At 14:30 all three delivered, each in its own format. At 23:15 only SMS went out, because `SmsSender` overrode the `urgent()` hook; email and push took the default and were held. In a real service `deliver` would call an SMS provider, an SMTP server and a push service, which is exactly the part that differs per channel and exactly what the abstract methods capture.",
        },
        {
          type: "heading",
          text: "An interface plus a skeletal implementation",
        },
        {
          type: "paragraph",
          text: "This is the `List` plus `AbstractList` arrangement in my own code: callers depend on the `ShippingCalculator` interface, and most implementations extend an abstract skeleton for the shared logic.",
        },
        {
          type: "code",
          language: "java",
          title: "SkeletalShipping.java",
          code: `import java.util.List;

record Parcel(String id, int km, int kg) {}

interface ShippingCalculator {                        // the type callers depend on
    long cost(Parcel parcel);

    long total(List<Parcel> parcels);
}

// Skeletal implementation: the shared work, with one step left open
abstract class AbstractShippingCalculator implements ShippingCalculator {
    @Override
    public final long cost(Parcel parcel) {
        long cost = distanceCost(parcel.km()) + 2L * parcel.kg();
        return Math.max(cost, minimumCost());
    }

    @Override
    public long total(List<Parcel> parcels) {
        return parcels.stream().mapToLong(this::cost).sum();
    }

    protected abstract long distanceCost(int km);

    protected long minimumCost() {                    // hook
        return 0;
    }
}

class CityShipping extends AbstractShippingCalculator {
    protected long distanceCost(int km) { return 50 + 12L * km; }

    @Override
    protected long minimumCost() { return 80; }
}

class IntercityShipping extends AbstractShippingCalculator {
    protected long distanceCost(int km) { return 150 + 15L * km; }
}

class FlatShipping implements ShippingCalculator {    // doesn't need the skeleton at all
    public long cost(Parcel parcel) { return 199; }
    public long total(List<Parcel> parcels) { return 199L * parcels.size(); }
}

public class SkeletalShipping {
    public static void main(String[] args) {
        List<Parcel> parcels = List.of(new Parcel("P-1", 2, 0), new Parcel("P-2", 18, 5));
        for (ShippingCalculator calc : List.of(new CityShipping(), new IntercityShipping(), new FlatShipping())) {
            System.out.printf("%-17s %d + %d = %d%n", calc.getClass().getSimpleName(),
                    calc.cost(parcels.get(0)), calc.cost(parcels.get(1)), calc.total(parcels));
        }
    }
}`,
        },
        {
          type: "output",
          text: `CityShipping      80 + 276 = 356
IntercityShipping 180 + 430 = 610
FlatShipping      199 + 199 = 398`,
        },
        {
          type: "diagram",
          text: `          «interface» ShippingCalculator    callers see only this
           cost(Parcel)   total(List<Parcel>)
             ▲                       ▲
             │ implements            │ implements
 AbstractShippingCalculator       FlatShipping
  cost()  final: distance          writes both methods,
          + weight, minimum        no skeleton needed
  total() loops over cost()
  distanceCost()  abstract
  minimumCost()   hook, 0
      ▲               ▲
  CityShipping    IntercityShipping
  minimum 80      no minimum`,
          caption: "The interface is the contract; the abstract class is an optional convenience.",
        },
        {
          type: "paragraph",
          text: "`CityShipping` and `IntercityShipping` wrote one method each, plus the minimum hook for the city, and got `cost` and `total` from the skeleton; the 2 km city parcel computed 74 and was raised to 80. `FlatShipping` implements the interface directly, which is the reason to keep both types instead of only the abstract class. Effective Java calls this a skeletal implementation (Item 20, \"Prefer interfaces to abstract classes\"), and `AbstractList`, `AbstractSet` and `AbstractMap` are the JDK's versions.",
        },
        {
          type: "heading",
          text: "Callers never see the implementation class",
        },
        {
          type: "paragraph",
          text: "An abstract class with a static factory can hide its subclasses completely. `EnumSet` is the JDK's example, and the same trick works for an order-id generator:",
        },
        {
          type: "code",
          language: "java",
          title: "HiddenImplementations.java",
          code: `import java.util.EnumSet;

public class HiddenImplementations {
    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

    // The same idea in my own code: callers only ever see the abstract type
    public abstract static class OrderIdSource {
        public abstract long next();

        public static OrderIdSource create(int shard) {
            return shard == 0 ? new SequentialIds() : new ShardedIds(shard);
        }

        private static final class SequentialIds extends OrderIdSource {
            private long last = 1000;
            @Override public long next() { return ++last; }
        }

        private static final class ShardedIds extends OrderIdSource {
            private final long shard;
            private long sequence = 0;
            ShardedIds(long shard) { this.shard = shard; }
            @Override public long next() { return shard * 1_000_000 + ++sequence; }
        }
    }

    public static void main(String[] args) {
        EnumSet<Day> weekend = EnumSet.of(Day.SAT, Day.SUN);
        System.out.println(weekend + " is really a " + weekend.getClass().getName());

        OrderIdSource local = OrderIdSource.create(0);
        OrderIdSource puneShard = OrderIdSource.create(7);
        System.out.println(local.next() + ", " + local.next() + " from " + local.getClass().getSimpleName());
        System.out.println(puneShard.next() + ", " + puneShard.next() + " from " + puneShard.getClass().getSimpleName());
    }
}`,
        },
        {
          type: "output",
          text: `[SAT, SUN] is really a java.util.RegularEnumSet
1001, 1002 from SequentialIds
7000001, 7000002 from ShardedIds`,
        },
        {
          type: "paragraph",
          text: "`EnumSet` is abstract, and `EnumSet.of` returned a `java.util.RegularEnumSet`, a package-private class I can't even name in my code. For an enum with more than 64 constants it returns a `JumboEnumSet` instead; I checked with a 65-constant enum. `OrderIdSource.create` does the same with two `private` subclasses, so callers can only ever hold an `OrderIdSource`, and I could replace `ShardedIds` entirely without any caller recompiling. The Constructors lesson covers static factories in more depth.",
        },
      ],
    },
    {
      title: "When to Use an Abstract Class (and When Not To)",
      blocks: [
        {
          type: "paragraph",
          text: "An abstract class is the most constraining tool in this phase: a class gets exactly one superclass, and a subclass is coupled to every `protected` detail of it. So I reach for one when these hold together: several classes share **state and code**, not just a method signature; there's a fixed **algorithm** where only some steps vary; the base needs a **constructor** to validate shared state; and every variant genuinely **is a** kind of the base, in a hierarchy I control.",
        },
        {
          type: "table",
          headers: ["Situation", "Reach for", "Why"],
          rows: [
            ["Shared state and code, one or two steps differ", "Abstract class with a `final` template method", "Shared logic is written once and no subclass can skip a step"],
            ["A capability unrelated classes offer (`Comparable`, a listener)", "Interface", "No shared state needed, and a class can have many"],
            ["A type other teams implement, plus shared helpers", "Interface and an abstract skeleton", "Callers depend on the interface; implementers may use the skeleton"],
            ["Variations that combine, or are picked at run time", "Composition: a strategy interface or a lambda", "One small object per variation, not a subclass per combination"],
            ["One implementation, and no second one in sight", "A concrete class", "An abstract layer with one subclass is ceremony"],
            ["A closed set of variants known up front", "A `sealed` abstract class or interface", "The compiler checks exhaustive `switch`es (Polymorphism lesson)"],
            ["A base class that does nothing useful alone", "Abstract class, even with no abstract methods", "`abstract` stops direct instantiation (`HttpServlet`)"],
          ],
        },
        {
          type: "diagram",
          text: ` Several classes share fields AND code?
   ├─ no ──> Is it a capability (can-do), maybe many per class?
   │           ├─ yes ──> interface
   │           └─ no ───> one implementation? concrete class
   └─ yes ─> Do the variations stack or get picked at run time?
               ├─ yes ──> composition: interface + small objects
               └─ no ───> Is each variant really a kind of the base?
                           ├─ no ──> composition
                           └─ yes ─> abstract class, final template
                                     (+ interface if others implement)`,
          caption: "The questions I ask, in the order I ask them.",
        },
        {
          type: "list",
          items: [
            "Make the template method `final` and the steps `protected abstract`. If a subclass can skip a step, the base class guarantees nothing.",
            "Prefer a hook with a sensible default over another abstract method. Every abstract method is a tax on every subclass, now and in every future version.",
            "Keep hierarchies shallow. One abstract layer is usually enough; three means opening three files to understand one call.",
            "Wait for the second implementation, ideally the third, before extracting the abstract class. Two similar classes can be a coincidence; three show where the real seams are. Martin Fowler's \"Refactoring\" popularised this as the rule of three.",
            "If people outside my codebase will implement the type, publish an interface and offer the abstract class as an optional skeleton.",
          ],
        },
        {
          type: "paragraph",
          text: "**A right choice:** `NotificationSender` from the Examples. SMS, email and push share the quiet-hours rule and the format-then-deliver order, and differ in exactly two steps. An abstract class with a `final` `send` means a fourth channel can't forget the quiet-hours check. The payment gateways in the production section are the same decision with more at stake.",
        },
        {
          type: "paragraph",
          text: "**A wrong choice:** discounts look similar, but festival, first-order and corporate discounts **combine**, and an inheritance hierarchy needs a class per combination:",
        },
        {
          type: "code",
          language: "java",
          title: "DiscountDesign.java",
          code: `import java.util.List;

public class DiscountDesign {
    // Wrong choice: an abstract class and one subclass per combination
    abstract static class Discount {
        abstract long apply(long price);
    }

    static class FestivalDiscount extends Discount {
        long apply(long price) { return price * 90 / 100; }              // 10% off
    }

    static class FirstOrderDiscount extends Discount {
        long apply(long price) { return Math.max(0, price - 50); }       // Rs 50 off
    }

    static class FestivalFirstOrderDiscount extends FestivalDiscount {   // and one per pair...
        @Override
        long apply(long price) { return Math.max(0, super.apply(price) - 50); }   // copied rule
    }

    // Right choice: small rules, composed per customer at run time
    interface DiscountRule {
        long apply(long price);
    }

    static long price(long price, List<DiscountRule> rules) {
        for (DiscountRule rule : rules) {
            price = rule.apply(price);
        }
        return price;
    }

    public static void main(String[] args) {
        System.out.println("subclass, festival + first order: " + new FestivalFirstOrderDiscount().apply(300));

        DiscountRule festival = price -> price * 90 / 100;
        DiscountRule firstOrder = price -> Math.max(0, price - 50);
        DiscountRule corporate = price -> price * 80 / 100;
        System.out.println("composed, festival + first order: " + price(300, List.of(festival, firstOrder)));
        System.out.println("composed, corporate + festival:   " + price(300, List.of(corporate, festival)));
        System.out.println("composed, all three:              "
                + price(300, List.of(corporate, festival, firstOrder)));
    }
}`,
        },
        {
          type: "output",
          text: `subclass, festival + first order: 220
composed, festival + first order: 220
composed, corporate + festival:   216
composed, all three:              166`,
        },
        {
          type: "paragraph",
          text: "The subclass gave the right answer, 220, but only for one pair, and only by copying the first-order rule into `FestivalFirstOrderDiscount`. Three kinds of discount have seven non-empty combinations, so that design ends at seven classes with rules copied between them. The composed version is three lambdas and a loop: any combination is a `List` built per customer at run time, and the order is explicit. My rule of thumb from it: an abstract class is for one varying step inside a fixed algorithm; composition is for variations that stack. The When to Use What in Java OOP lesson puts this next to every other choice in the phase.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Calling an abstract method from the constructor",
        },
        {
          type: "code",
          language: "java",
          title: "ConstructorTrap.java",
          code: `abstract class PaymentGateway {
    protected PaymentGateway() {
        // Calls abstract methods before the subclass has set its fields
        System.out.println("registering " + name() + " with a " + timeoutMs() + " ms timeout");
    }

    abstract String name();

    abstract int timeoutMs();
}

class StripeGateway extends PaymentGateway {
    private final String region;
    private final int timeoutMs;

    StripeGateway(String region, int timeoutMs) {
        super();                          // PaymentGateway() runs here, fields still unset
        this.region = region;
        this.timeoutMs = timeoutMs;
    }

    @Override String name() { return "stripe-" + region; }

    @Override int timeoutMs() { return timeoutMs; }
}

public class ConstructorTrap {
    public static void main(String[] args) {
        StripeGateway g = new StripeGateway("ap-south-1", 2_000);
        System.out.println("after construction: " + g.name() + ", " + g.timeoutMs() + " ms");
    }
}`,
        },
        {
          type: "output",
          text: `registering stripe-null with a 0 ms timeout
after construction: stripe-ap-south-1, 2000 ms`,
        },
        {
          type: "paragraph",
          text: "The base constructor runs before the subclass's constructor body, so the overridden `name()` and `timeoutMs()` ran on an object whose fields were still `null` and `0`. Nothing crashed: it just registered a gateway called `stripe-null` with no timeout, which is the worst kind of bug. The classic fixes are to pass the values up (`super(name, timeoutMs)`) and keep them in the base class, or to move the call out of the constructor into a factory method. On JDK 25 there's a third, from flexible constructor bodies (JEP 513): assign the subclass's fields before `super()`.",
        },
        {
          type: "code",
          language: "java",
          code: `    StripeGateway(String region, int timeoutMs) {
        this.region = region;             // JDK 25: allowed before super() (JEP 513)
        this.timeoutMs = timeoutMs;
        super();                          // PaymentGateway() now sees both fields
    }`,
        },
        {
          type: "output",
          text: `# JDK 25
registering stripe-ap-south-1 with a 2000 ms timeout
after construction: stripe-ap-south-1, 2000 ms

# the same file on JDK 21
ConstructorTrap.java:19: error: call to super must be first statement in constructor
        super();                          // PaymentGateway() now sees both fields
             ^
1 error`,
        },
        {
          type: "heading",
          text: "Leaving the template method overridable",
        },
        {
          type: "code",
          language: "java",
          title: "BypassedTemplate.java",
          code: `import java.util.HashSet;
import java.util.Set;

abstract class Gateway {
    private final Set<String> seenKeys = new HashSet<>();

    String charge(String key, long paise) {             // meant to be the only way in, not final
        return seenKeys.add(key) ? doCharge(paise) : "duplicate " + key + " rejected";
    }

    abstract String doCharge(long paise);
}

class QuickGateway extends Gateway {
    @Override
    String charge(String key, long paise) {             // "simplified" by a subclass
        return doCharge(paise);
    }

    @Override
    String doCharge(long paise) {
        return "charged Rs " + paise / 100;
    }
}

public class BypassedTemplate {
    public static void main(String[] args) {
        Gateway gateway = new QuickGateway();
        System.out.println(gateway.charge("order-42", 25_000));
        System.out.println(gateway.charge("order-42", 25_000));   // app retried the same order
    }
}`,
        },
        {
          type: "output",
          text: `charged Rs 250
charged Rs 250`,
        },
        {
          type: "paragraph",
          text: "Order 42 was charged twice, because a subclass overrode the template and skipped the step that mattered. Declaring it `final String charge(...)` turns that into a compile error:",
        },
        {
          type: "output",
          text: `BypassedTemplate.java:16: error: charge(String,long) in QuickGateway cannot override charge(String,long) in Gateway
    String charge(String key, long paise) {             // "simplified" by a subclass
           ^
  overridden method is final
1 error`,
        },
        {
          type: "heading",
          text: "Five more, briefly",
        },
        {
          type: "list",
          items: [
            "**No `super(...)` call.** If the abstract class only has a constructor with parameters, every subclass constructor must call it. A `Bike() { ... }` with no call gets an implicit `super()` that doesn't exist: `constructor Vehicle in class Vehicle cannot be applied to given types;` with `required: String` and `found:    no arguments`, pointing at the subclass constructor.",
            "**Narrowing access.** Implementing `public abstract int rentalPrice(int days)` as package-private `int rentalPrice(int days)` fails with `attempting to assign weaker access privileges; was public`. Code holding a `Vehicle` must be able to call `rentalPrice` on any subclass. Widening (`protected abstract` implemented as `public`) is fine.",
            "**Half an anonymous subclass.** `new ShippingRule() { int baseCost() { return 0; } }` against an abstract class with two abstract methods fails, because the anonymous class is concrete and must implement both. The message names the generated class: `<anonymous HalfAnonymous$1> is not abstract and does not override abstract method perKg() in ShippingRule`.",
            "**Adding an abstract method to a published base class.** Every subclass in the codebase stops compiling, and every subclass compiled elsewhere fails at run time with `AbstractMethodError`, as Internal Working showed. For a class other teams extend, the new method goes in as a concrete method with a safe default.",
            "**Abstracting too early.** An `AbstractShippingCalculator` with one subclass, an interface with one implementation, and a factory for it: three types to read for one behaviour. No compiler catches it, and it costs something on every change. I write the concrete class and extract the abstraction when the second implementation actually arrives.",
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
            "Template methods `public final`, steps `protected abstract`, hooks `protected` with safe defaults.",
            "Keep an abstract class's constructor `protected`, use it to validate the shared state once, and never call an overridable method from it.",
            "Put `@Override` on every implementation. It turns an accidental overload, like `rentalPrice(long)` for `rentalPrice(int)`, into a compile error.",
            "Document each abstract method's contract: what it must do, what it may assume, what it costs. Subclass authors only see the contract (Effective Java Item 19: design and document for inheritance, or else prohibit it).",
            "In a published class, add hooks, not abstract methods. A new abstract method breaks every existing subclass.",
            "Pair a public interface `X` with an optional skeleton `AbstractX`, the JDK's naming convention.",
            "Don't let an abstract base become a dumping ground (`BaseService` with thirty helpers). Helpers that don't belong to the template go in a separate class the subclasses can use.",
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
            "Calling an abstract method costs the same as any virtual call: `invokevirtual` on the base class's method, resolved through the receiver's class. Being abstract adds nothing at the call site.",
            "HotSpot's JIT inlines these calls the same way it inlines other virtual calls: when a call site only ever sees one or two receiver classes, it inlines them behind a type check, and with class hierarchy analysis it can skip the check while only one implementation is loaded. The Polymorphism lesson shows inline caches and the megamorphic case.",
            "A `final` template method can't be overridden, so the JIT can bind it directly, and the template plus its small steps usually end up compiled as one block of code.",
            "The costs that matter are in the defaults and in what the abstraction hides: `MessageStream` made 34 virtual calls for 32 bytes because it inherited the per-byte `read(byte[], int, int)`, and the `LinkedList` loop above took seconds instead of milliseconds. Neither is about the call itself.",
            "Abstract classes don't change object size: a `Car` object carries the `Vehicle` fields it inherits, laid out as the Memory Allocation lesson showed, and no per-object pointer to the superclass.",
          ],
        },
      ],
    },
    {
      title: "Abstraction in Production",
      blocks: [
        {
          type: "paragraph",
          text: "The scenario: the ride-hailing backend charges riders through more than one payment provider. Each integration was written as its own class with its own `charge`, and the safety logic around the provider call was copied from one to the next. This is the shape I'd expect to find, and the bug it grows:",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentsBefore.java",
          code: `import java.util.HashSet;
import java.util.Set;

public class PaymentsBefore {
    record PaymentRequest(String rideId, String idempotencyKey, long amountPaise) {}

    // Each provider class has its own charge(), and the copies have drifted apart
    static class RazorpayGateway {
        private final Set<String> seenKeys = new HashSet<>();

        String charge(PaymentRequest r) {
            if (r.amountPaise() <= 0) return "REJECTED invalid amount";
            if (!seenKeys.add(r.idempotencyKey())) return "REJECTED duplicate key " + r.idempotencyKey();
            return "CHARGED pay_" + r.rideId();               // the provider call
        }
    }

    static class StripeGateway {                              // copied later, key check lost
        int chargesAtProvider = 0;

        String charge(PaymentRequest r) {
            if (r.amountPaise() <= 0) return "REJECTED invalid amount";
            chargesAtProvider++;
            return "CHARGED ch_" + r.rideId();                // the provider call
        }
    }

    public static void main(String[] args) {
        RazorpayGateway razorpay = new RazorpayGateway();
        StripeGateway stripe = new StripeGateway();
        PaymentRequest ride101 = new PaymentRequest("ride-101", "key-101", 25_000);
        PaymentRequest ride202 = new PaymentRequest("ride-202", "key-202", 18_000);

        System.out.println("razorpay " + razorpay.charge(ride101));
        System.out.println("razorpay " + razorpay.charge(ride101));   // app timed out and retried
        System.out.println("stripe   " + stripe.charge(ride202));
        System.out.println("stripe   " + stripe.charge(ride202));     // app timed out and retried
        System.out.println("ride-202 charged at the provider: " + stripe.chargesAtProvider + " times");
    }
}`,
        },
        {
          type: "output",
          text: `razorpay CHARGED pay_ride-101
razorpay REJECTED duplicate key key-101
stripe   CHARGED ch_ride-202
stripe   CHARGED ch_ride-202
ride-202 charged at the provider: 2 times`,
        },
        {
          type: "list",
          items: [
            "`RazorpayGateway` rejected the retried `ride-101` because its copy of `charge` checks the idempotency key.",
            "`StripeGateway` was written later from a trimmed copy, and the key check didn't survive. The app timed out waiting for the first response, retried with the same key, and ride-202 was charged twice. Nothing threw; the only symptom is a second debit on Asha's statement. Retries and validation drift the same way between copies.",
            "The bug isn't one missing `if`. The safety steps lived in every provider class, so every new provider was another chance to forget one.",
          ],
        },
        {
          type: "image",
          src: "/images/java/abstraction-template-method.svg",
          alt: "AbstractPaymentGateway.charge() is final and runs six steps: validate the amount, check the idempotency key, call the abstract doCharge() with retries on TransientGatewayException up to maxAttempts(), record metrics, call the onCharged hook, and log the outcome. RazorpayGateway and StripeGateway implement only doCharge(); a third provider, WalletGateway, would be one new class.",
          caption: "The fix: the base class owns the order of the steps, each provider owns one step.",
        },
        {
          type: "paragraph",
          text: "The fix moves every shared step into an abstract base class with a `final` template method, and leaves each provider exactly one job:",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentGateways.java",
          code: `import java.math.BigDecimal;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class PaymentGateways {
    record PaymentRequest(String rideId, String idempotencyKey, long amountPaise) {}

    static class TransientGatewayException extends RuntimeException {
        TransientGatewayException(String message) {
            super(message);
        }
    }

    abstract static class AbstractPaymentGateway {
        private static final long MAX_PAISE = 500_000;                // Rs 5,000 per ride
        private final Set<String> seenKeys = ConcurrentHashMap.newKeySet();
        private final AtomicInteger charged = new AtomicInteger();
        private final AtomicInteger rejected = new AtomicInteger();
        private final AtomicInteger failed = new AtomicInteger();
        private final AtomicInteger retries = new AtomicInteger();

        // The template method: final, so every provider gets the same safety steps
        public final String charge(PaymentRequest request) {
            if (request.amountPaise() <= 0 || request.amountPaise() > MAX_PAISE) {
                rejected.incrementAndGet();
                return log(request, "REJECTED invalid amount");
            }
            if (!seenKeys.add(request.idempotencyKey())) {
                rejected.incrementAndGet();
                return log(request, "REJECTED duplicate key " + request.idempotencyKey());
            }
            for (int attempt = 1; ; attempt++) {
                try {
                    String reference = doCharge(request);                 // the subclass's step
                    charged.incrementAndGet();
                    onCharged(request, reference);
                    return log(request, "CHARGED " + reference + " on attempt " + attempt);
                } catch (TransientGatewayException e) {
                    if (attempt >= maxAttempts()) {
                        failed.incrementAndGet();
                        seenKeys.remove(request.idempotencyKey());        // let a later retry in
                        return log(request, "FAILED after " + attempt + " attempts: " + e.getMessage());
                    }
                    retries.incrementAndGet();
                    log(request, "attempt " + attempt + " failed (" + e.getMessage() + "), retrying");
                }
            }
        }

        protected abstract String name();

        protected abstract String doCharge(PaymentRequest request);

        protected int maxAttempts() {                                     // hook
            return 3;
        }

        protected void onCharged(PaymentRequest request, String reference) {   // hook: no-op
        }

        public final String metrics() {
            return name() + ": charged=" + charged + " rejected=" + rejected
                    + " failed=" + failed + " retries=" + retries;
        }

        private String log(PaymentRequest request, String outcome) {
            BigDecimal rupees = BigDecimal.valueOf(request.amountPaise(), 2);
            System.out.printf("[%-8s] %s Rs %s %s%n", name(), request.rideId(), rupees, outcome);
            return outcome;
        }
    }

    // Simulated providers: no network, just enough behaviour to exercise the template
    static class RazorpayGateway extends AbstractPaymentGateway {
        protected String name() { return "razorpay"; }

        protected String doCharge(PaymentRequest request) {
            return "pay_" + request.rideId();
        }
    }

    static class StripeGateway extends AbstractPaymentGateway {
        private int calls = 0;

        protected String name() { return "stripe"; }

        protected String doCharge(PaymentRequest request) {
            if (++calls == 1) {
                throw new TransientGatewayException("503 from provider");   // blips once
            }
            return "ch_" + request.rideId();
        }
    }

    public static void main(String[] args) {
        AbstractPaymentGateway razorpay = new RazorpayGateway();
        AbstractPaymentGateway stripe = new StripeGateway();

        razorpay.charge(new PaymentRequest("ride-101", "key-101", 25_000));
        stripe.charge(new PaymentRequest("ride-202", "key-202", 18_000));
        stripe.charge(new PaymentRequest("ride-202", "key-202", 18_000));   // app retried
        razorpay.charge(new PaymentRequest("ride-103", "key-103", -500));   // client bug

        System.out.println(razorpay.metrics());
        System.out.println(stripe.metrics());
    }
}`,
        },
        {
          type: "output",
          text: `[razorpay] ride-101 Rs 250.00 CHARGED pay_ride-101 on attempt 1
[stripe  ] ride-202 Rs 180.00 attempt 1 failed (503 from provider), retrying
[stripe  ] ride-202 Rs 180.00 CHARGED ch_ride-202 on attempt 2
[stripe  ] ride-202 Rs 180.00 REJECTED duplicate key key-202
[razorpay] ride-103 Rs -5.00 REJECTED invalid amount
razorpay: charged=1 rejected=1 failed=0 retries=0
stripe: charged=1 rejected=1 failed=0 retries=1`,
        },
        {
          type: "list",
          items: [
            "`ride-202` hit the simulated 503, was retried by the base class and charged on attempt 2, and `StripeGateway` contains no retry code at all.",
            "The app's retry of `ride-202` was rejected by the idempotency check before `doCharge` ran. The provider was called twice for that ride, one 503 and one success, and charged once. A real system would store the first result and return it for the duplicate key, so the app shows \"paid\" instead of an error, and would keep the keys in the database or Redis rather than a per-instance `Set`, so every instance of the service sees them.",
            "The `-500` from a client bug never reached a provider. Every gateway gets the same validation because no gateway can override `charge`.",
            "`metrics()` shows what each gateway counted. In a Spring Boot service these would be Micrometer counters tagged by provider; the shape is the same. A real retry would also back off between attempts and pass the same idempotency key to the provider, so a retry after a timeout can't double-charge on their side either.",
          ],
        },
        {
          type: "paragraph",
          text: "Adding a third provider, the in-app wallet, touches one new class and nothing else:",
        },
        {
          type: "code",
          language: "java",
          code: `    static class WalletGateway extends AbstractPaymentGateway {
        protected String name() { return "wallet"; }

        protected String doCharge(PaymentRequest request) {
            return "wlt_" + request.rideId();          // debit the in-app wallet ledger
        }

        @Override
        protected int maxAttempts() { return 1; }      // fail fast, no retries
    }`,
        },
        {
          type: "paragraph",
          text: "I dropped it into `PaymentGateways` and charged one ride through it: `[wallet  ] ride-301 Rs 99.00 CHARGED wlt_ride-301 on attempt 1`. Not the template, not the other providers and not the callers changed. With Spring, each gateway would be a `@Component(\"razorpay\")` and so on, and a router would take `Map<String, AbstractPaymentGateway>` in its constructor. I checked that against spring-context 6.2.11 (`org.springframework:spring-context`): the map arrived keyed by bean name as `[razorpay, stripe, wallet]`, so the router doesn't change for a new provider either.",
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
              question: "What is abstraction?",
              answer:
                "Exposing what something does while hiding how it does it. The caller works with a small, stable set of operations and doesn't depend on the implementation behind them.\n\nThe payoff is that the implementation can change without the caller changing. In my `BothIdeas` example, `checkout` only knew `PaymentMethod.pay`, and it worked unchanged for a `BankAccount` and for `CashOnDelivery`; a third payment method wouldn't touch it either.",
            },
            {
              question: "How is abstraction achieved in Java?",
              answer:
                "Mainly with abstract classes and interfaces, because both let code be written against a type whose implementation is chosen later. An abstract class can also share state and code; an interface describes a capability that many unrelated classes can have.\n\nIt isn't only those two keywords, though. A well-named method hides its steps, private fields hide representation, and modules hide whole packages. The `List` diagram in this lesson has three levels: my code sees `get` and `size`, `ArrayList` is an `Object[]` and a count, and below that is the heap layout.",
            },
            {
              question: "What is an abstract class?",
              answer:
                "A class declared with `abstract`. It can't be instantiated with `new`, it may declare abstract methods that subclasses must implement, and otherwise it's a normal class: fields, constructors, concrete, static and final methods.\n\nIt's meant to be the shared base of a family. My `Vehicle` held the `plate` field, the constructor and `quote`, and left `rentalPrice` to each subclass. In the class file it's just a class with the `ACC_ABSTRACT` flag.",
            },
            {
              question: "Can you create an object of an abstract class?",
              answer:
                "No. `new Vehicle()` is a compile error, \"Vehicle is abstract; cannot be instantiated\", with the caret on `new`. Declaring a variable of the abstract type is fine and is the whole point.\n\nAn anonymous subclass looks like an exception but isn't: `new Rental(\"RN-2\") { ... }` in my `AbstractSyntax` compiled to `AbstractSyntax$1.class`, a concrete subclass, and that's what got instantiated. Reflection can't get around it either: `Constructor.newInstance` threw `InstantiationException`.",
            },
            {
              question: "What is an abstract method?",
              answer:
                "A method declared with `abstract` and no body, just a semicolon: `abstract int rentalPrice(int days);`. It says that every concrete subclass must supply the implementation.\n\nA class with even one abstract method must itself be abstract, and `javac` rejects a concrete subclass that doesn't implement it: \"Car is not abstract and does not override abstract method rentalPrice(int) in Vehicle\". In `javap -v` it shows `ACC_ABSTRACT` and no `Code` attribute at all.",
            },
            {
              question: "Can an abstract class have a constructor? Why, if it can't be instantiated?",
              answer:
                "Yes. A constructor doesn't create an object, it initializes one, and every subclass object has an abstract-class part that needs initializing: its fields, and any validation of them.\n\nIn `javap` the only `new` was `new Car`; `Car`'s constructor then called `Vehicle.<init>` with `invokespecial`. My `ConstructorOrder` run printed \"Vehicle constructor, building a Car\" first, because `getClass()` already returns the subclass inside the base constructor. I make such constructors `protected`, as `AbstractList` does.",
            },
            {
              question: "Does an abstract class need at least one abstract method?",
              answer:
                "No. `abstract` on a class with no abstract methods is legal, and it's used to stop direct instantiation of a base class that would do nothing useful on its own.\n\n`HttpServlet` is the classic case: `javap` on Tomcat 11's copy shows the class as abstract with no abstract methods, and its `doGet`, `doPost` and friends default to a 405 error. The JDK's `MouseAdapter` is the same idea, with eight empty listener methods.",
            },
            {
              question: "What happens if a subclass doesn't implement all inherited abstract methods?",
              answer:
                "It doesn't compile, unless the subclass is declared abstract too, in which case the obligation passes to its own subclasses.\n\nThe classic slip is an accidental overload: my `MissingPrice` declared `rentalPrice(long)` instead of `rentalPrice(int)` and got \"Car is not abstract and does not override abstract method rentalPrice(int) in Vehicle\". In `AbstractSyntax`, `MemberRental` stayed abstract because it left `perDay` open, and `BikeRental` was the first concrete class.",
            },
            {
              question: "Can an abstract class have static methods, final methods or a main method?",
              answer:
                "Yes to all three. Static and final methods don't need overriding, so nothing about `abstract` conflicts with them, and a static `main` needs no instance.\n\nMy `AbstractSyntax` launcher is itself an abstract class, and `java AbstractSyntax` ran it. The one twist is JDK 25's instance `main` (JEP 512): in an abstract class the launcher refused with \"abstract class Launcher can not be instantiated\", because it has to create an object to call it.",
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
              question: "What's the difference between abstraction and encapsulation?",
              answer:
                "Abstraction is a design-level idea about what a type does: it hides complexity and implementation choices behind a contract. Encapsulation is an implementation-level idea about who may touch an object's state: it hides fields and guards invariants with access control.\n\nOne program showed both: `PaymentMethod` was the abstraction that `checkout` depended on, and `BankAccount` encapsulated `balancePaise`, so the second `pay(15000)` returned `false` instead of going negative. Abstract classes and interfaces are the tools for the first; `private`, access modifiers and immutability for the second.",
            },
            {
              question: "Can an abstract method be private, static or final?",
              answer:
                "No, all three are compile errors: \"illegal combination of modifiers: abstract and private\", and the same for `static` and `final`. Each one contradicts \"a subclass must supply the body\".\n\nA private method isn't visible to subclasses, so nothing could override it. A static method is bound at compile time with `invokestatic`, with no object whose class could supply a body. `final` forbids overriding, which `abstract` requires. `synchronized`, `native` and `strictfp` fail the same way, because they describe a body that doesn't exist.",
            },
            {
              question: "Can a class be both abstract and final?",
              answer:
                "No. `final abstract class Bike` fails with \"illegal combination of modifiers: abstract and final\". An abstract class is only useful through a subclass, and a final class can't have one.\n\nIf the goal is \"nobody may instantiate or extend this\", as with a utility class, the tool is a `final` class with a private constructor, not `abstract`.",
            },
            {
              question: "When would you use an abstract class instead of an interface?",
              answer:
                "When the implementations share state and code, need a constructor to set it up, and follow a fixed algorithm where only some steps vary. An interface is the better fit for a capability that unrelated classes can have, especially since a class can implement many interfaces but extend only one class.\n\nOften it's both, the way `List` and `AbstractList` work: the interface is the type callers use, the abstract class an optional skeleton. My `SkeletalShipping` had `FlatShipping` implement the interface directly while two others used the skeleton. The Interfaces lesson has the full comparison.",
            },
            {
              question: "What is the Template Method pattern? Where does the JDK use it?",
              answer:
                "A base class method that fixes the order of an algorithm's steps and leaves some steps to subclasses as abstract methods or hooks. The base calls the subclass, not the other way round.\n\n`AbstractList` is the best proof: my `InvoiceNumbers` wrote only `get` and `size`, and inherited `contains`, `indexOf`, `subList`, `equals`, `hashCode`, `toString` and the iterator. `InputStream` builds `read(byte[])`, `skip` and `readAllBytes` on the abstract `read()`. In frameworks, `HttpServlet.service` calls `doGet` and `doPost`, and Spring's `OncePerRequestFilter` leaves `doFilterInternal` abstract.",
            },
            {
              question: "Why should the template method be final?",
              answer:
                "Because the template is the guarantee. If a subclass can override it, it can skip or reorder the steps the base class exists to enforce.\n\nIn my `BypassedTemplate`, `QuickGateway` overrode a non-final `charge` and dropped the duplicate-key check, and `order-42` was charged twice. With `final` the same subclass failed to compile: \"overridden method is final\". Spring's `OncePerRequestFilter.doFilter` is an interesting case: `final` in spring-web 6.1.5, but not in 6.2.11.",
            },
            {
              question: "What's the difference between an abstract step and a hook?",
              answer:
                "An abstract step has no body, so every concrete subclass must implement it. A hook is a concrete `protected` method with a default, often empty, that a subclass may override if it wants.\n\nIn `ShippingTemplate`, `baseCost` and `perKg` were abstract, while `expressCost` (25% extra) and `minimumCost` (0) were hooks. `PostShipping` took both defaults, `CourierShipping` overrode the minimum to 120, and `FreightShipping` replaced the express rule with a flat Rs 10. Hooks are also how I add behaviour to a published base class without breaking subclasses.",
            },
            {
              question: "What goes wrong if the abstract class's constructor calls an abstract method?",
              answer:
                "The call goes to the subclass's override before the subclass's constructor body has run, so the override sees default field values: `null`, `0`, `false`. It usually doesn't crash, which makes it worse.\n\nMy `ConstructorTrap` registered \"stripe-null with a 0 ms timeout\". The fixes are to pass the values to `super(...)` and keep them in the base, or move the call out of the constructor. On JDK 25, flexible constructor bodies (JEP 513) allow assigning the subclass fields before `super()`, which printed the right values; JDK 21 rejects that with \"call to super must be first statement in constructor\".",
            },
            {
              question: "Can an abstract class implement an interface without implementing its methods?",
              answer:
                "Yes. An abstract class may leave any inherited abstract method unimplemented; the first concrete class below it has to supply them.\n\nIn `AbstractSyntax`, `Rental implements Priced` without writing `price`, `MemberRental` wrote `price`, and `BikeRental` filled in the last abstract step, `perDay`. `AbstractList` does the same with `List.get` and `Collection.size`.",
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
              question: "What does `abstract` look like in the class file?",
              answer:
                "An `ACC_ABSTRACT` flag (0x0400) on the class and on each abstract method, and abstract methods have no `Code` attribute at all. The JVM specification (4.7.3) forbids one on an abstract method.\n\n`javap -v` on my `Vehicle` showed `flags: (0x0420) ACC_SUPER, ACC_ABSTRACT` for the class and `flags: (0x0400) ACC_ABSTRACT` for `rentalPrice`, with nothing under it. The constructor was still there as `<init>` with real bytecode, and `quote` called `rentalPrice` with a plain `invokevirtual`. An interface carries the same flag plus `ACC_INTERFACE`: `List` showed 0x0601.",
            },
            {
              question: "What is AbstractMethodError, and how can it happen if javac checks every subclass?",
              answer:
                "A `LinkageError` the JVM throws when a call's method selection lands on an abstract method, meaning the receiver's class has no implementation. `javac` prevents that within one compilation, but classes compiled at different times can disagree.\n\nI compiled `Vehicle`, `Car` and `Main`, then added `abstract int insurance(int)` to `Vehicle` and recompiled only that file. `new Car()` still worked; the call from `quote` failed with \"Receiver class Car does not define or inherit an implementation of the resolved method 'abstract int insurance(int)' of abstract class Vehicle\". In practice it means a stale JAR compiled against an older base class.",
            },
            {
              question: "Why does the JVM have to check abstract methods at run time at all?",
              answer:
                "Because the JVM never sees source, only class files, and those can come from different builds. `javac` only knows the versions on the compile-time classpath; the JVM links whatever is on the runtime classpath, and it's allowed to load a concrete class that inherits an unimplemented abstract method.\n\nSo the check happens at the latest possible moment, when a call actually selects a method and finds no body, which is why my old `Car.class` loaded fine and only failed at the call to `insurance`. Changing the new method to a concrete one with a default made the same old class work again, printing `Rs 5000`.",
            },
            {
              question: "What's the difference between InstantiationException and InstantiationError?",
              answer:
                "Both mean \"tried to instantiate something abstract\". `InstantiationException` is a checked exception from reflection, such as `Constructor.newInstance` on an abstract class. `InstantiationError` is a linkage error from the `new` bytecode, when a class that was concrete at compile time is abstract at run time.\n\nI saw both: `ReflectNew` caught `InstantiationException` thrown by `InstantiationExceptionConstructorAccessorImpl` before the constructor's `println` could run, and a `Billing` class compiled against a concrete `Tariff` died with `java.lang.InstantiationError: Tariff` after I made `Tariff` abstract. JLS 13.4.1 describes exactly this pair.",
            },
            {
              question: "Is calling an abstract method slower than calling a concrete one?",
              answer:
                "No. The call site is the same `invokevirtual` against the declared type, and the JVM selects the implementation from the receiver's class exactly as for any overridable method. Being abstract adds nothing.\n\nHotSpot treats it like any virtual call: a call site that sees one or two receiver classes gets inlined behind a type check, and class hierarchy analysis can drop the check while only one implementation is loaded. The real costs in this lesson came from what abstractions hid, like `MessageStream` making 34 calls to `read()` for 32 bytes.",
            },
            {
              question: "How does AbstractList let you write a full List with two methods, and what is RandomAccess for?",
              answer:
                "`AbstractList` and `AbstractCollection` implement every other `List` method in terms of `get(int)` and `size()`, so `contains`, `indexOf`, `equals` and the iterator all call down into those two. Mutators are hooks that throw `UnsupportedOperationException` until overridden.\n\nThat design assumes `get(i)` is cheap. `RandomAccess` is a marker that says so: `Collections.binarySearch` checks `instanceof RandomAccess` and the 5,000-element threshold before choosing an index-based search. My `InvoiceNumbers` made only three `get` calls for `contains(\"INV-1003\")`, and I marked it `RandomAccess` because its `get` is a computation, not a walk.",
            },
            {
              question: "What is a leaky abstraction? Give a concrete example.",
              answer:
                "An abstraction whose hidden details, usually cost or failure modes, show through and force the caller to know about the implementation after all. Spolsky's law says every non-trivial abstraction leaks to some degree.\n\n`List.get(i)` is the cleanest example: it's O(1) on `ArrayList` and O(n) on `LinkedList`. My index loop over a 100,000-element `LinkedList` took about 2.9 seconds against a few milliseconds for `ArrayList` (rough timings from my machine), and a for-each loop fixed it. ORM lazy loading causing N+1 queries is the backend version.",
            },
            {
              question: "Can an abstract method override a concrete method?",
              answer:
                "Yes. A subclass can re-declare an inherited concrete method as abstract, which forces every concrete class below it to write its own implementation, even though a superclass already had one.\n\nI declared `@Override public abstract String toString();` in an abstract `LogEvent`, and a subclass with no `toString` failed with \"OrderShipped is not abstract and does not override abstract method toString() in LogEvent\", even though `Object.toString` exists. It's a cheap way to make sure every event type logs something useful.",
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
              question: "You need to add a method to a base class that many teams extend. How do you do it safely?",
              answer:
                "As a concrete method with a safe default, not as an abstract one. An abstract method breaks every subclass: those compiled with the change stop compiling, and those compiled elsewhere fail at run time with `AbstractMethodError`.\n\nThat's exactly what my separate-compilation demo showed: adding abstract `insurance(int)` broke the old `Car.class` at the call, and replacing it with `public int insurance(int days) { return 0; }` made the same old class print `Rs 5000` again. Subclasses that care override it. It's the same reason Java 8 added default methods to interfaces.",
            },
            {
              question: "Design a NotificationSender that supports SMS, email and push.",
              answer:
                "An abstract `NotificationSender` with a `final` `send` that holds the shared policy, plus `protected abstract` steps for what differs per channel, `format` and `deliver`, and a hook such as `urgent()` with a default. Callers depend only on `NotificationSender`.\n\nMy `NotificationDemo` did exactly that: at 14:30 all three channels delivered in their own formats, and at 23:15 only SMS went out, because `SmsSender` overrode `urgent()` and the quiet-hours rule lived in the template. A new channel is one class, and it can't skip the quiet-hours check. If other teams supplied channels, I'd also publish an interface and keep the abstract class as a skeleton.",
            },
            {
              question: "A report endpoint got slow after someone changed a List implementation. How would you investigate?",
              answer:
                "I'd suspect a leaky abstraction: code that's correct for any `List` but relies on one implementation's cost, most often `list.get(i)` in an index loop over what is now a `LinkedList`, which turns O(n) into O(n²). A profiler or a thread dump during the slow request would show time inside `LinkedList.node`.\n\n`LeakyList` reproduced it: doubling the size made the `LinkedList` index loop about four times slower, while the for-each version stayed at a couple of milliseconds. The fix is iterating with for-each or an iterator, or choosing `ArrayList`. Where the type isn't under my control, checking `instanceof RandomAccess` is what the JDK itself does.",
            },
            {
              question: "In the ride-hailing payment service, a newly added provider double-charged riders on app retries. How do you stop the next provider from making the same mistake?",
              answer:
                "Move every shared safety step out of the provider classes and into an abstract base with a `final` template method: validation, the idempotency check, retries, metrics and logging. Each provider then implements only `doCharge`, and nobody can override `charge` to skip a step.\n\nIn my production example, `PaymentsBefore` charged ride-202 twice because the trimmed `StripeGateway` copy lost the key check. After the refactor, the retried ride-202 was rejected as a duplicate before `doCharge` ran, and the simulated 503 was retried by the base class. The in-app wallet provider was one new class. With several service instances, the keys would live in the database or Redis.",
            },
            {
              question: "A teammate wants to add an AbstractBaseService and an interface in front of a class that has one implementation. What do you say?",
              answer:
                "I'd hold off. An abstract layer with a single subclass adds files and indirection and buys nothing yet; the right seams only become clear when a second, ideally third, implementation exists. Extracting an abstract class or interface later is a mechanical refactoring.\n\nThe exception is a real boundary, such as a payment provider or a type other teams will implement, where the interface is the point from day one. Otherwise I'd write the concrete class and wait, the same way my discount example showed that an inheritance hierarchy is the wrong shape when the variations combine.",
            },
            {
              question: "Discounts can combine (festival, first order, corporate). Would you model them with an abstract Discount class and subclasses?",
              answer:
                "No. Subclassing needs a class per combination, and the rules get copied between them. Small `DiscountRule` objects composed in a list cover every combination with one class or lambda per rule.\n\nMy `DiscountDesign` showed both: `FestivalFirstOrderDiscount` got the right 220, but only by copying the first-order rule, while the composed version produced 220, 216 and 166 for three different combinations from three lambdas and a loop. Abstract classes fit one varying step inside a fixed algorithm; stacking variations is composition's job.",
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
            "Write `ShapesDemo.java` with an `abstract class Shape` that has `abstract double area()` and a concrete `String describe()` returning `getClass().getSimpleName() + \" area \" + area()`. Add `Circle` (a radius) and `Rectangle` (width and height), then print `new Circle(1).describe()` and `new Rectangle(2, 3).describe()`.",
            "In `main`, try `Shape s = new Shape();` and read the compile error. Note where the caret points.",
            "Give `Shape` a `protected` constructor that prints `\"Shape constructor for \" + getClass().getSimpleName()`. Before running, predict what it prints for each shape.",
            "Add `abstract double perimeter();` to `Shape` and implement it only in `Circle`. Read the error for `Rectangle`, then implement it there too.",
            "Make `describe()` `final`, then try overriding it in `Circle`. Read the error.",
            "Split `Shape`, a `Circle` and a small `Main` into three public files and compile them together. Then add `public abstract String name();` to `Shape`, change `describe()` to call `name()`, recompile only `Shape.java`, and run `Main` again.",
            "Run `javap -v Shape` and find `area` in the output. Check its flags, and check whether it has a `Code:` section.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `Circle area 3.141592653589793` and `Rectangle area 6.0`. Step 2 fails with `Shape is abstract; cannot be instantiated`, caret under `new`. In step 3 each shape's constructor line comes first and names the subclass: `Shape constructor for Circle`, then `Shape constructor for Rectangle`, because `getClass()` already returns the real class. Step 4 gives `Rectangle is not abstract and does not override abstract method perimeter() in Shape`, and step 5 gives `describe() in Circle cannot override describe() in Shape` with `overridden method is final`. In step 6 the first run prints `Circle area 3.141592653589793` for a circle of radius 1, and the second dies with `java.lang.AbstractMethodError: Receiver class Circle does not define or inherit an implementation of the resolved method 'abstract java.lang.String name()' of abstract class Shape.` In step 7, `area` shows `flags: (0x0401) ACC_PUBLIC, ACC_ABSTRACT` and no `Code:` section.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `ABSTRACTION  expose WHAT, hide HOW; callers depend on the type
             tools: abstract classes, interfaces (+ methods,
             private fields, modules)
vs ENCAPS.   abstraction = design, hides complexity
             encapsulation = implementation, guards state

ABSTRACT     no new:  "X is abstract; cannot be instantiated"
CLASS        has constructors (run via super), fields, static,
             final, private methods, even main; can't be final
             anonymous subclass = new concrete class ($1)
ABSTRACT     no body; class must be abstract; concrete subclass
METHOD       must implement or: "is not abstract and does not
             override abstract method m() in X"
             never private / static / final (or synchronized,
             native, strictfp): "illegal combination"

CLASS FILE   ACC_ABSTRACT (0x0400), no Code attribute,
             <init> still there, called with invokespecial
RUN TIME     reflection          -> InstantiationException
             new on stale class  -> InstantiationError
             stale subclass call -> AbstractMethodError

TEMPLATE     public final skeleton -> protected abstract steps
METHOD       + protected hooks with defaults
             JDK: AbstractList (get + size), InputStream (read)
LEAKS        List.get(i): O(1) ArrayList, O(n) LinkedList
             add methods to published bases as hooks`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Abstraction is a design decision about what callers may know; abstract classes and interfaces are how Java turns that decision into types the compiler checks.",
            "An abstract class earns its place with shared state plus a `final` template method; when variations combine, composition wins, and when a type is a capability, an interface does.",
            "Interfaces are the other half of abstraction, and the next lesson: default and static methods, diamond resolution, the full interface-versus-abstract-class table, and how Spring builds repository implementations from an interface alone.",
          ],
        },
      ],
    },
  ],
};
