import type { Lesson } from "../types";

export const inheritance: Lesson = {
  slug: "inheritance",
  date: "2026-11-04",
  title: "Inheritance",
  description:
    "How one Java class extends another: what a subclass really inherits (private fields included, constructors not), super and constructor chaining, fields that hide instead of override, final and sealed hierarchies, the object layout and bytecode underneath, and why composition beats inheritance for code reuse, with the double-counting set and an LSP violation run for real.",
  tags: ["Core Java", "OOP", "Inheritance", "super", "Composition"],
  sections: [
    {
      title: "What Inheritance Is",
      blocks: [
        {
          type: "paragraph",
          text: "The Encapsulation lesson drew a boundary around one class: private state, a small public surface, and invariants nothing outside can break. Every class I've written so far has stood on its own. Model anything with families of similar things and that stops being true quickly. A car, a bike and a truck all have an id, a plate, a seat count and a rental price, and writing those three times means fixing every bug three times.",
        },
        {
          type: "paragraph",
          text: "**Inheritance** is Java's way of saying one class is a more specific kind of another. `class Car extends Vehicle` makes `Car` a **subclass** (child, derived class) of `Vehicle`, its **superclass** (parent, base class). Every `Car` object gets `Vehicle`'s fields and methods, and the `Car` class only writes down what's different: extra fields, extra methods, and methods whose behaviour it replaces.",
        },
        {
          type: "paragraph",
          text: "That gives two things, and the second matters more. The first is **reuse**: code written once in `Vehicle` works for every kind of vehicle. The second is **substitutability**: a `Car` **is a** `Vehicle`, so it can go anywhere a `Vehicle` is expected (a parameter, a list, a return value) without that code knowing. The is-a promise is also where every inheritance bug in this lesson comes from. When a subclass can't keep the promise, the code that trusted it breaks.",
        },
        {
          type: "paragraph",
          text: "So this lesson covers the mechanics (what a subclass really gets, `super`, overriding basics, fields that don't override, `final` and `sealed`), what `javac` and HotSpot do with all of it, and the uncomfortable part: why the most repeated advice about inheritance is to use less of it, and when it really is the right tool. Dynamic dispatch, the runtime half of the story, belongs to the Polymorphism lesson.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Inheritance is older than Java by almost thirty years. **Simula 67**, designed by Ole-Johan Dahl and Kristen Nygaard at the Norwegian Computing Center for writing simulations, introduced classes, objects and subclasses. A Simula class could be declared with another class as its \"prefix\", which is a subclass in everything but name, and procedures marked `virtual` could be redefined further down, the ancestor of overriding.",
        },
        {
          type: "paragraph",
          text: "**Smalltalk**, built by Alan Kay's group at Xerox PARC through the 1970s and published as Smalltalk-80, made everything an object, used single inheritance, and put one class, `Object`, at the root of the whole hierarchy. Java's single-rooted design comes from there. **C++** grew out of Bjarne Stroustrup's \"C with Classes\" (1979), which brought Simula's classes to C. C++ 2.0 (1989) added multiple inheritance, together with virtual base classes to cope with the diamond it creates.",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (1996) took the Smalltalk shape with C++ syntax: exactly one superclass per class, every class ultimately extending `java.lang.Object`, and multiple inheritance only of **type**, through interfaces, never of state. `final` classes and `protected` were there from the start, and so was the decision to make `String` final. The later changes mostly made inheritance safer or easier to control:",
        },
        {
          type: "table",
          headers: ["Release", "What it changed"],
          rows: [
            ["Java 1.0 (1996)", "`extends`, single inheritance, the `Object` root, `final`, `protected`, interfaces"],
            ["Java 5 (2004)", "`@Override`, covariant return types, generics (and the bridge methods they need)"],
            ["Java 6 (2006)", "`@Override` also allowed on a method that implements an interface method"],
            ["Java 8 (2014)", "Default methods: interfaces can carry code (JSR 335)"],
            ["Java 16 (2021)", "Records (JEP 395): implicitly `final`, always extend `java.lang.Record`"],
            ["Java 17 (2021)", "Sealed classes (JEP 409), after previews in 15 (JEP 360) and 16 (JEP 397)"],
            ["Java 25 (2025)", "Flexible constructor bodies (JEP 513): statements before `super(...)`, after previews in 22, 23 and 24 (JEPs 447, 482, 492)"],
          ],
        },
        {
          type: "paragraph",
          text: "The design advice has a history too. The Gang of Four's Design Patterns (1994) put it as \"favor object composition over class inheritance\". Barbara Liskov's 1987 keynote \"Data Abstraction and Hierarchy\" described what a subtype must preserve, later formalised with Jeannette Wing (1994), and that's what is now called the Liskov Substitution Principle. Joshua Bloch's Effective Java turned both into Java rules (items 18 and 19 in the third edition): favour composition over inheritance, and design and document for inheritance or else prohibit it. All three come back later in this lesson as programs I ran.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of inheritance as a franchise: a tea chain's head office and its outlets.",
        },
        {
          type: "list",
          items: [
            "Head office's **operations manual** is the superclass. It lists the standard equipment every outlet has (fields) and the standard procedures every outlet follows (methods).",
            "Each **outlet** is a subclass. It gets the whole manual without rewriting it, and adds its own local menu items (new fields and methods).",
            "An outlet can swap a standard recipe for its own version (overriding), or follow the standard recipe and add a local garnish on top (`super.method()`).",
            "Head office's **safe** sits inside every outlet, but only head-office procedures can open it. That's a private field: present in every subclass object, reachable only through the superclass's own methods.",
            "**Opening day** runs head office's checklist first, then the outlet's own. And an outlet can't simply reuse head office's opening procedure as its own; it has to write one that starts by calling head office's (constructors aren't inherited, and `super(...)` runs first).",
            "A customer who walks into any outlet expects the chain's standard (substitutability). An outlet that refuses the card payments the brand advertises breaks that promise, which is the Liskov Substitution Principle in one sentence.",
            "Some procedures are stamped \"do not change\" (final methods), some brands don't franchise at all (final classes), and some only franchise to a named list of partners (sealed classes with `permits`).",
            "When head office rewrites the manual, every outlet changes overnight, ready or not. That's the fragile base class problem.",
            "An outlet has one parent brand, but it can hold several certifications at once, such as food safety or a payments licence. That's single inheritance of classes and multiple inheritance of interfaces.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a franchise is two businesses, but a `Car` object is **one** object. The `Vehicle` part isn't a separate object somewhere else; its fields are bytes inside the same block of heap memory, which the next sections measure. An outlet can also switch brands, while a Java class's superclass is fixed when it's compiled, and an object can never change its class at all. That last point turns out to matter a lot when I model users who are customers today and sellers tomorrow.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Anatomy of a subclass",
        },
        {
          type: "code",
          language: "java",
          code: `class Car extends Vehicle {                  // Car is a Vehicle: exactly one direct superclass
    private final int doors;                // new state, on top of Vehicle's

    Car(long id, String plate, int doors) {
        super(id, plate);                    // Vehicle's constructor runs first
        this.doors = doors;
    }

    @Override
    String describe() {                      // replaces Vehicle.describe() for every Car
        return super.describe() + ", " + doors + " doors";   // ...by building on it
    }
}`,
        },
        {
          type: "heading",
          text: "What a subclass inherits",
        },
        {
          type: "table",
          headers: ["Member", "Inherited?", "In practice"],
          rows: [
            ["`public` and `protected` fields and methods", "Yes", "Usable in the subclass as if it had declared them"],
            ["Package-private members", "Only within the same package", "Packages and Access Modifiers (Phase 6) has the rules"],
            ["`private` fields", "No (JLS 8.2)", "Not by name. The field still exists inside every subclass object, and inherited methods use it"],
            ["`private` methods", "No", "A same-named method in the subclass is a new, unrelated method, not an override"],
            ["Constructors", "No", "They aren't members at all. Each class declares its own, and each must call a superclass constructor"],
            ["Instance and static initializer blocks", "No", "They run only while their own class is constructed or initialized"],
            ["`static` fields and methods", "Yes, as members", "Reachable through the subclass's name, but there's still one copy, and static methods are hidden, never overridden"],
          ],
        },
        {
          type: "heading",
          text: "The rules in one list",
        },
        {
          type: "list",
          items: [
            "A class has exactly one direct superclass. `extends A, B` doesn't even parse.",
            "No `extends` clause means `extends Object`. Enums extend `java.lang.Enum` and records extend `java.lang.Record`, and neither may name a superclass of its own.",
            "A class can't extend a `final` class, a sealed class that doesn't permit it, or itself through any cycle (`javac` reports `cyclic inheritance involving Car`).",
            "Every constructor begins by calling a superclass constructor: explicitly with `super(...)`, indirectly through `this(...)`, or implicitly with a `super()` that `javac` inserts.",
            "A subclass can add fields and methods, override inherited instance methods, and hide fields and static methods. It can't remove anything it inherited, or make an inherited method less accessible.",
          ],
        },
        {
          type: "heading",
          text: "Kinds of inheritance",
        },
        {
          type: "diagram",
          text: ` SINGLE         MULTILEVEL          HIERARCHICAL

 Vehicle        Vehicle                  Vehicle
    ▲              ▲                ┌───────┼───────┐
    │              │                │       │       │
   Car            Car              Car     Bike    Truck
                   ▲
                   │
               LuxuryCar

 MULTIPLE OF CLASSES: no          MULTIPLE OF TYPE: yes, via interfaces

     Car        Boat              Car    Chargeable   Trackable
      ▲          ▲                 ▲         ▲            ▲
      └────┬─────┘                 └─────────┼────────────┘
     AmphibiousCar                       ElectricCar
     (compile error)`,
          caption: "Arrows point from the subclass to what it extends or implements.",
        },
        {
          type: "heading",
          text: "Why Java has no multiple inheritance of classes",
        },
        {
          type: "diagram",
          text: `               Vehicle
            { fuelLevel }
             Vehicle(...)
            ▲            ▲
            │            │
           Car          Boat
       describe()    describe()
            ▲            ▲
            └─────┬──────┘
            AmphibiousCar
     one fuelLevel or two?
     whose describe() runs?
     who calls Vehicle(...), and how many times?`,
          caption: "The diamond: three questions that single inheritance never has to answer.",
        },
        {
          type: "paragraph",
          text: "C++ answers the diamond with rules. By default an `AmphibiousCar` contains two separate `Vehicle` parts, each with its own `fuelLevel`. Declaring the bases `virtual` merges them into one shared part, and then the most-derived class has to construct that shared `Vehicle` itself. An ambiguous call has to be qualified by hand. Java's designers sidestepped all of it: state and constructors come from exactly one superclass, so every object has one chain of constructors and one copy of each inherited field. Interfaces carry only the useful part, being several types at once. Default methods (Java 8) brought back a small form of the method question, and Java settles it with explicit rules and a compile error when two defaults clash; that's in the Interfaces lesson. The class version simply doesn't parse:",
        },
        {
          type: "code",
          language: "java",
          title: "MultipleExtends.java",
          code: `class Vehicle { }
class Tracked { }

class Car extends Vehicle, Tracked { }

public class MultipleExtends { }`,
        },
        {
          type: "output",
          text: `MultipleExtends.java:4: error: '{' expected
class Car extends Vehicle, Tracked { }
                         ^
1 error`,
        },
        {
          type: "heading",
          text: "Upcasting and downcasting, a first look",
        },
        {
          type: "paragraph",
          text: "Because a `Car` is a `Vehicle`, a `Car` reference converts to `Vehicle` with no cast. That's **upcasting**, and it's always safe. Going the other way, **downcasting**, needs an explicit cast, because the compiler can't know that a given `Vehicle` really is a `Car`:",
        },
        {
          type: "code",
          language: "java",
          title: "CastIntro.java",
          code: `class Vehicle {
    String describe() { return "vehicle"; }
}

class Car extends Vehicle {
    @Override
    String describe() { return "car"; }

    String openTrunk() { return "trunk open"; }
}

class Bike extends Vehicle { }

public class CastIntro {
    public static void main(String[] args) {
        Vehicle v = new Car();                 // upcast: implicit, always safe
        System.out.println(v.describe());
        // v.openTrunk();                   // compile error: Vehicle has no openTrunk()

        Car car = (Car) v;                     // downcast: I promise it's a Car, and it is
        System.out.println(car.openTrunk());

        Vehicle other = new Bike();
        Car wrong = (Car) other;               // compiles, fails at run time
        System.out.println(wrong.openTrunk());
    }
}`,
        },
        {
          type: "output",
          text: `car
trunk open
Exception in thread "main" java.lang.ClassCastException: class Bike cannot be cast to class Car (Bike and Car are in unnamed module of loader 'app')
	at CastIntro.main(CastIntro.java:24)`,
        },
        {
          type: "list",
          items: [
            "`v.describe()` printed `car`: the declared type is `Vehicle`, but the object is a `Car`, and the method that runs belongs to the object. The declared type still limits what I can **call**. Uncommenting `v.openTrunk()` fails with `cannot find symbol ... location: variable v of type Vehicle`, even though the object has that method.",
            "The bad downcast compiled, because a `Vehicle` variable might hold a `Car`, and failed at run time when the JVM's `checkcast` saw a `Bike`. The Polymorphism lesson covers casting properly, including `instanceof` patterns that make this check and cast in one step.",
          ],
        },
        {
          type: "heading",
          text: "is-a or has-a",
        },
        {
          type: "table",
          headers: ["Relationship", "The question", "In Java", "Example"],
          rows: [
            ["is-a", "Can it stand in everywhere the other is used?", "`extends` or `implements`", "A `Car` is a `Vehicle`"],
            ["has-a", "Does it hold or use one?", "A field (or a parameter)", "An `Order` has a `Customer`; a `Car` has an `Engine`"],
          ],
        },
        {
          type: "paragraph",
          text: "Most of the bad inheritance I've read about is a has-a relationship written as is-a, usually to borrow some methods. The next lesson, Association, Aggregation and Composition, is entirely about the has-a side.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "1. One object, the superclass's fields first",
        },
        {
          type: "paragraph",
          text: "The analogy said a `Car` is one object, not a `Vehicle` plus a `Car`. To check that, and to see what happens to a private field the subclass can't even name, I read the field offsets back from the running JVM with `Unsafe.objectFieldOffset`, the same technique as in the Memory Allocation lesson, and measured each object's size with the per-thread allocation counter:",
        },
        {
          type: "code",
          language: "java",
          title: "CarLayout.java",
          code: `import java.lang.management.ManagementFactory;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import sun.misc.Unsafe;

class Vehicle {
    private long id;          // private: Car can't name it, but every Car carries it
    int seats;
}

class Car extends Vehicle {
    int doors;
    String plate;
}

class FlatCar {               // the fields Car can see, with no superclass and no id
    int seats;
    int doors;
    String plate;
}

public class CarLayout {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;

    static long bytes(Runnable r) {
        long id = Thread.currentThread().threadId();
        long before = MX.getThreadAllocatedBytes(id);
        r.run();
        return MX.getThreadAllocatedBytes(id) - before;
    }

    public static void main(String[] args) throws Exception {
        Field f = Unsafe.class.getDeclaredField("theUnsafe");
        f.setAccessible(true);
        Unsafe u = (Unsafe) f.get(null);

        List<Field> fields = new ArrayList<>();
        for (Class<?> c = Car.class; c != Object.class; c = c.getSuperclass()) {
            fields.addAll(List.of(c.getDeclaredFields()));     // Car's, then Vehicle's
        }
        fields.sort(Comparator.comparingLong(u::objectFieldOffset));
        for (Field field : fields) {
            System.out.printf("offset %2d  %-6s %-6s from %s%s%n",
                u.objectFieldOffset(field), field.getType().getSimpleName(), field.getName(),
                field.getDeclaringClass().getSimpleName(),
                Modifier.isPrivate(field.getModifiers()) ? " (private)" : "");
        }

        Runnable[] all = { () -> sink = new Vehicle(), () -> sink = new Car(), () -> sink = new FlatCar() };
        String[] names = { "new Vehicle()", "new Car()", "new FlatCar()" };
        for (int round = 0; round < 3; round++) for (Runnable r : all) bytes(r);   // load classes first
        long base = bytes(() -> {});
        for (int i = 0; i < all.length; i++) {
            System.out.printf("%-14s %d bytes%n", names[i], bytes(all[i]) - base);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac CarLayout.java        # 4 warnings: Unsafe is internal proprietary API
java CarLayout
java -XX:-UseCompressedClassPointers -XX:-UseCompressedOops CarLayout`,
        },
        {
          type: "output",
          text: `offset 12  int    seats  from Vehicle
offset 16  long   id     from Vehicle (private)
offset 24  int    doors  from Car
offset 28  String plate  from Car
new Vehicle()  24 bytes
new Car()      32 bytes
new FlatCar()  24 bytes

offset 16  long   id     from Vehicle (private)
offset 24  int    seats  from Vehicle
offset 28  int    doors  from Car
offset 32  String plate  from Car
new Vehicle()  32 bytes
new Car()      40 bytes
new FlatCar()  32 bytes`,
        },
        {
          type: "image",
          src: "/images/java/inheritance-car-layout.svg",
          alt: "Layout of new Car() on JDK 21: a 12-byte header, then Vehicle's part (int seats at offset 12, the private long id at offset 16), then Car's part (int doors at 24, the String reference plate at 28), 32 bytes in total. A side panel shows Object, Vehicle and Car connected by extends arrows, and constructor calls going up from Car to Vehicle to Object.",
          caption: "Vehicle's part is laid out first and keeps the same offsets in every subclass. Car's fields are appended after it, and the private id is there whether Car can see it or not.",
        },
        {
          type: "list",
          items: [
            "**One object, one header.** There's a single 12-byte header whose class pointer says `Car`. `Vehicle`'s fields sit right after it, `Car`'s fields after those. Nothing in memory marks where the `Vehicle` part ends; the offsets are just numbers the JVM computed when each class was loaded.",
            "**The private field is really there.** `id` is at offset 16 inside every `Car`, even though `Car`'s code can't mention it. `FlatCar` has exactly the fields `Car` can see and is 24 bytes; `Car` is 32. Those 8 bytes are the inherited private `long`.",
            "**HotSpot reorders within a class, not across the boundary here.** `Vehicle` declares `id` before `seats`, but `seats` went to offset 12 to fill the 4-byte gap after the header, the same trick the Memory Allocation lesson showed. `Vehicle` alone is 24 bytes, and `Car` continues at 24.",
            "**Gaps at the end get used.** With compression off, the header is 16 bytes, `Vehicle`'s part ends at 28 and the object would round up to 32. `Car`'s `doors` went straight into that 4-byte tail at 28 instead of starting a new 8-byte slot.",
          ],
        },
        {
          type: "paragraph",
          text: "\"Superclass fields first\" is the rule people quote. The precise version is that the superclass's layout is kept intact: `Vehicle`'s fields have the same offsets in a `Vehicle` and in every subclass, which is what lets code compiled against `Vehicle` read them at a fixed offset. Subclass fields go after that, **or into holes the superclass left**. I checked with a superclass holding only a `long id`: the `long` needs an 8-aligned address, so it went to 16 and left 12 to 15 empty, and the subclass's `int doors` landed at 12, in front of the inherited field. HotSpot's field layout code has filled holes this way since it was rewritten in JDK 15 (JDK-8237767). `id` itself didn't move, so the guarantee that matters still holds.",
        },
        {
          type: "callout",
          tone: "note",
          title: "JDK 25: compact object headers",
          text: "With `-XX:+UseCompactObjectHeaders` (a product flag since JDK 25, JEP 519), the header is 8 bytes. Running `CarLayout` on JDK 25 with that flag printed `id` at 8, `seats` at 16, `doors` at 20 and `plate` at 24: the private `long` now fits right after the header, and the superclass part still comes first. `Car` stayed at 32 bytes: its fields now end at 28, and that rounds up to 32. JDK 25 also printed a warning that `sun.misc.Unsafe::objectFieldOffset` is terminally deprecated, which is expected for this kind of experiment.",
        },
        {
          type: "heading",
          text: "2. What super(...) and super.describe() compile to",
        },
        {
          type: "paragraph",
          text: "Next I compiled the `Car` from the anatomy above, with a `Vehicle` that has a private `id`, a `describe()` and a `seatsFor` method that `Car` doesn't override:",
        },
        {
          type: "code",
          language: "java",
          title: "SuperCalls.java",
          code: `class Vehicle {
    private final long id;
    protected final String plate;

    Vehicle(long id, String plate) {
        this.id = id;
        this.plate = plate;
    }

    String describe() {
        return "vehicle " + id + " (" + plate + ")";
    }

    int seatsFor(int people) {                  // inherited by Car, not overridden
        return Math.min(people, 4);
    }
}

class Car extends Vehicle {
    private final int doors;

    Car(long id, String plate, int doors) {
        super(id, plate);                       // Vehicle's part first
        this.doors = doors;
    }

    @Override
    String describe() {
        return super.describe() + ", " + doors + " doors";
    }
}

public class SuperCalls {
    public static void main(String[] args) {
        Car car = new Car(7L, "WB-02-AB-1234", 4);
        Vehicle v = car;
        System.out.println(v.describe());
        System.out.println(car.seatsFor(6));
    }
}`,
        },
        {
          type: "output",
          text: `vehicle 7 (WB-02-AB-1234), 4 doors
4`,
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c Car",
        },
        {
          type: "output",
          text: `class Car extends Vehicle {
  Car(long, java.lang.String, int);
    Code:
       0: aload_0
       1: lload_1
       2: aload_3
       3: invokespecial #1                  // Method Vehicle."<init>":(JLjava/lang/String;)V
       6: aload_0
       7: iload         4
       9: putfield      #7                  // Field doors:I
      12: return

  java.lang.String describe();
    Code:
       0: aload_0
       1: invokespecial #13                 // Method Vehicle.describe:()Ljava/lang/String;
       4: aload_0
       5: getfield      #7                  // Field doors:I
       8: invokedynamic #17,  0             // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;I)Ljava/lang/String;
      13: areturn
}`,
        },
        {
          type: "list",
          items: [
            "The constructor's first act is `aload_0` (push `this`), then the arguments `id` (a `long`, so `lload_1` covers slots 1 and 2) and `plate` (slot 3), then `invokespecial Vehicle.\"<init>\"`. Only after `Vehicle`'s constructor returns does `Car` store its own `doors`. Parent first is not a convention; it's the order of the instructions.",
            "`super.describe()` is `invokespecial Vehicle.describe`. `invokespecial` picks the method statically, searching from the superclass up, with no dispatch on the object's run-time class. That's what `super.` has to mean: through normal dispatch, the call would find `Car.describe` again and recurse forever.",
            "`Vehicle`'s own constructor (not shown) starts with `aload_0` and `invokespecial java/lang/Object.\"<init>\":()V`. Every constructor chain ends in `Object`.",
          ],
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c SuperCalls      # main only",
        },
        {
          type: "output",
          text: `      10: invokespecial #13                 // Method Car."<init>":(JLjava/lang/String;I)V
      ...
      20: invokevirtual #22                 // Method Vehicle.describe:()Ljava/lang/String;
      ...
      32: invokevirtual #34                 // Method Car.seatsFor:(I)I`,
        },
        {
          type: "list",
          items: [
            "`v.describe()` is `invokevirtual Vehicle.describe`. The call site names the declared type, `Vehicle`, and still ran `Car`'s version: `invokevirtual` picks the implementation from the object's actual class at run time. That's the normal call; the `super.` call is the special one.",
            "`car.seatsFor(6)` compiled to `Car.seatsFor:(I)I`, even though `Car` doesn't declare `seatsFor` (`javap -p Car` lists only the constructor and `describe`). `javac` writes the declared type of the receiver into the call (JLS 13.1), and leaves finding the method to the JVM.",
          ],
        },
        {
          type: "heading",
          text: "3. Finding an inherited method: resolution walks up",
        },
        {
          type: "paragraph",
          text: "The first time `invokevirtual Car.seatsFor` runs, the JVM resolves the symbolic reference (JVMS 5.4.3.3): look in `Car` for a method named `seatsFor` with descriptor `(I)I`; if it isn't there, repeat in the direct superclass, `Vehicle`, and so on up to `Object`, then check superinterfaces. Here it stops at `Vehicle`. If nothing matches anywhere, linking fails with `NoSuchMethodError`. Field references (`getfield`, `getstatic`) are resolved by a similar search (JVMS 5.4.3.2), which checks the class, then its superinterfaces, then the superclass chain.",
        },
        {
          type: "paragraph",
          text: "Writing `Car` rather than `Vehicle` into the call is deliberate. If a later version of `Car` adds its own `seatsFor`, callers pick it up without being recompiled, and if `seatsFor` moves from `Vehicle` up into a new superclass, they keep working too. Binary compatibility across library versions depends on resolution being done late, by name, at link time.",
        },
        {
          type: "paragraph",
          text: "Resolution is how the JVM finds a method by name once. For the fast per-call choice of which override to run, HotSpot gives every class a **vtable**, an array of method pointers built when the class is linked. A subclass's vtable starts as a copy of its parent's: inherited methods keep their slot numbers, an override replaces the entry in its slot, and new methods are appended. That's why `invokevirtual` on a `Vehicle` reference can jump through a fixed slot whatever the actual class is. The Polymorphism lesson takes dispatch, vtables and inline caches apart properly.",
        },
        {
          type: "heading",
          text: "4. The superclass is one entry in the class file",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -v Car | grep -E "^  flags|this_class|super_class|interfaces:"
javap -v Vehicle | grep -E "this_class|super_class"`,
        },
        {
          type: "output",
          text: `  flags: (0x0020) ACC_SUPER
  this_class: #8                          // Car
  super_class: #2                         // Vehicle
  interfaces: 0, fields: 1, methods: 2, attributes: 3

  this_class: #8                          // Vehicle
  super_class: #2                         // java/lang/Object`,
        },
        {
          type: "list",
          items: [
            "`super_class` is an index into the constant pool, pointing at a `Class` entry. That's the whole inheritance relationship as far as the class file is concerned: one index. JVMS 4.1 allows it to be zero only for `java.lang.Object`. Even an interface's class file has `super_class` set to `java/lang/Object` (I checked one), although `Runnable.class.getSuperclass()` returns `null`.",
            "`fields: 1, methods: 2`: the class file for `Car` holds only what `Car` declares, `doors`, the constructor and `describe`. Nothing is copied from `Vehicle`. Inheritance is assembled by the JVM when it loads the class, not by `javac` duplicating code.",
            "`Vehicle` has no `extends` in its source, and `javac` recorded `java/lang/Object` as its superclass. Plain `javap Vehicle` prints `class Vehicle {` because it hides the default, but `-v` shows what's really there.",
            "`ACC_SUPER` (0x0020) is a historical flag. It selects the modern semantics of `invokespecial` for `super.` calls, where the method is looked up starting at the current class's direct superclass. `javac` has set it for decades, and since Java SE 8 the JVM treats every class as if it were set (JVMS 4.1).",
          ],
        },
      ],
    },
    {
      title: "What a Subclass Gets (and What It Doesn't)",
      blocks: [
        {
          type: "paragraph",
          text: "The table in the Technical Picture is the rule. These are the four cases where I wanted to see the compiler's actual reaction, because each one is a common interview question and a common surprise.",
        },
        {
          type: "heading",
          text: "Private fields: inherited physically, not by name",
        },
        {
          type: "code",
          language: "java",
          title: "PrivateAccess.java",
          code: `class Vehicle {
    private long id = 7L;

    long id() { return id; }
}

class Car extends Vehicle {
    String tag() { return "car-" + id; }
}

public class PrivateAccess {
    public static void main(String[] args) {
        System.out.println(new Car().tag());
    }
}`,
        },
        {
          type: "output",
          text: `PrivateAccess.java:8: error: id has private access in Vehicle
    String tag() { return "car-" + id; }
                                   ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The compiler knows exactly which field I mean, which is why the message says \"has private access\" rather than \"cannot find symbol\". It just won't let `Car` touch it. Replacing `id` with the inherited `id()` method compiles and prints `car-7`. So is a private field inherited? By the JLS's definition of membership, no (JLS 8.2). Physically, yes: `CarLayout` showed the private `id` sitting at offset 16 of every `Car`, costing 8 bytes each. Both answers are worth giving in an interview, in that order.",
        },
        {
          type: "heading",
          text: "Constructors are not inherited",
        },
        {
          type: "code",
          language: "java",
          title: "NoInheritedConstructor.java",
          code: `class Vehicle {
    final int seats;

    Vehicle(int seats) { this.seats = seats; }
}

class Car extends Vehicle {
    Car() { super(4); }
}

public class NoInheritedConstructor {
    public static void main(String[] args) {
        System.out.println(new Car(4).seats);
    }
}`,
        },
        {
          type: "output",
          text: `NoInheritedConstructor.java:13: error: constructor Car in class Car cannot be applied to given types;
        System.out.println(new Car(4).seats);
                           ^
  required: no arguments
  found:    int
  reason: actual and formal argument lists differ in length
1 error`,
        },
        {
          type: "paragraph",
          text: "`Vehicle(int)` exists, but `Car` only has the constructors it declares, here `Car()`. Constructors aren't members, so they're never inherited, and that's deliberate: a `Vehicle(int)` constructor knows how to initialise a `Vehicle`, not the fields `Car` adds. If `new Car(4)` could call it, `Car`'s own fields would be skipped. The fix is to declare `Car(int seats) { super(seats); }`.",
        },
        {
          type: "paragraph",
          text: "The mirror image catches people more often. If a subclass declares no constructor at all, `javac` gives it a default one whose body is just `super();`. That only compiles if the superclass has a no-arg constructor:",
        },
        {
          type: "code",
          language: "java",
          title: "ImplicitSuper.java",
          code: `class Vehicle {
    final int seats;

    Vehicle(int seats) { this.seats = seats; }
}

class Bike extends Vehicle { }                 // javac adds: Bike() { super(); }

public class ImplicitSuper {
    public static void main(String[] args) {
        System.out.println(new Bike().seats);
    }
}`,
        },
        {
          type: "output",
          text: `ImplicitSuper.java:7: error: constructor Vehicle in class Vehicle cannot be applied to given types;
class Bike extends Vehicle { }                 // javac adds: Bike() { super(); }
^
  required: int
  found:    no arguments
  reason: actual and formal argument lists differ in length
1 error`,
        },
        {
          type: "paragraph",
          text: "The error points at the class declaration, because that's where the invisible default constructor lives. Adding a constructor with parameters to a superclass that had none breaks every subclass relying on that default, which is one of the quieter ways a base-class change ripples outwards.",
        },
        {
          type: "heading",
          text: "Static members: reachable, but not polymorphic",
        },
        {
          type: "code",
          language: "java",
          title: "StaticThroughSubclass.java",
          code: `class Vehicle {
    static int registered = 0;

    Vehicle() {
        registered++;
    }

    static String category() {
        return "vehicle";
    }

    String label() {
        return category() + " #" + registered;
    }
}

class Car extends Vehicle {
    static String category() {               // hides Vehicle.category(), doesn't override it
        return "car";
    }
}

public class StaticThroughSubclass {
    public static void main(String[] args) {
        new Car();
        new Car();
        new Vehicle();
        System.out.println("Car.registered     = " + Car.registered);
        System.out.println("Vehicle.registered = " + Vehicle.registered);

        Vehicle v = new Car();
        System.out.println("Car.category()     = " + Car.category());
        System.out.println("v.category()       = " + v.category());
        System.out.println("v.label()          = " + v.label());
    }
}`,
        },
        {
          type: "output",
          text: `Car.registered     = 3
Vehicle.registered = 3
Car.category()     = car
v.category()       = vehicle
v.label()          = vehicle #4`,
        },
        {
          type: "list",
          items: [
            "`Car.registered` and `Vehicle.registered` are the same single field. Static fields belong to the class that declares them; reaching one through a subclass name doesn't create a copy per subclass.",
            "`v.category()` printed `vehicle`, although the object is a `Car`. Static calls are bound at compile time from the declared type: `javap` shows `invokestatic Vehicle.category` for that line and `invokestatic Car.category` for `Car.category()`. `Car.category()` **hides** `Vehicle.category()`; nothing is overridden, so there's no dispatch.",
            "`v.label()` is an instance method, so it did dispatch, but the `category()` call inside `Vehicle` was bound to `Vehicle.category` when `Vehicle` was compiled. It printed `vehicle #4`. A subclass can't change what a superclass's static call means.",
            "Calling a static method through an instance compiles without complaint by default. `javac -Xlint:static` flags it: `static method should be qualified by type name, Vehicle, instead of by an expression`.",
          ],
        },
        {
          type: "paragraph",
          text: "One more twist, verified with a `static` block in each class: reading `Car.registered` initializes `Vehicle` but **not** `Car`, because a static field access initializes only the class that declares the field (JLS 12.4.1). The Static Keyword lesson has the full list of initialization triggers and the rules for method hiding.",
        },
        {
          type: "heading",
          text: "protected in one paragraph",
        },
        {
          type: "paragraph",
          text: "`protected` opens a member to subclasses, including subclasses in other packages, and to every class in the same package. It's meant for hooks a subclass needs and ordinary callers don't, like a `plate` field the subclass formats or a method it's expected to override. The catch is in other packages: a subclass there can use the protected member only on itself or on objects of its own type. When I put `Vehicle` in `com.example.vehicles` and `Car` in `com.example.cars`, `seats` and `this.seats` compiled inside `Car`, but `other.seats` on a `Vehicle` parameter failed with `seats has protected access in Vehicle`. Packages and Access Modifiers (Phase 6) has the full rules; for this lesson, `protected` is part of a class's API to its subclasses, and it deserves the same care as `public`.",
        },
      ],
    },
    {
      title: "super: Calling Up the Chain",
      blocks: [
        {
          type: "paragraph",
          text: "`super` has three jobs, and all of them point at the direct superclass:",
        },
        {
          type: "table",
          headers: ["Form", "Where", "What it does"],
          rows: [
            ["`super(args)`", "First statement of a constructor (JDK 21)", "Runs a superclass constructor on this object before the rest of the body"],
            ["`super.method(args)`", "Any instance method or constructor", "Calls the superclass's version, skipping this class's override"],
            ["`super.field`", "Any instance method or constructor", "Reads the superclass's field when this class hides it with a field of the same name"],
          ],
        },
        {
          type: "paragraph",
          text: "Here are the first two across three levels, with each constructor announcing when its body finishes:",
        },
        {
          type: "code",
          language: "java",
          title: "SuperChain.java",
          code: `class Vehicle {
    protected final String plate;

    Vehicle(String plate) {
        this.plate = plate;
        System.out.println("Vehicle(" + plate + ") done");
    }

    String describe() {
        return "vehicle " + plate;
    }
}

class Car extends Vehicle {
    Car(String plate) {
        super(plate);                              // must reach Vehicle first
        System.out.println("Car(" + plate + ") done");
    }

    @Override
    String describe() {
        return super.describe() + ", 4 wheels";    // extend, don't replace
    }
}

class ElectricCar extends Car {
    private final int batteryKwh;

    ElectricCar(String plate, int batteryKwh) {
        super(plate);
        this.batteryKwh = batteryKwh;
        System.out.println("ElectricCar(" + plate + ", " + batteryKwh + ") done");
    }

    @Override
    String describe() {
        return super.describe() + ", " + batteryKwh + " kWh battery";
    }
}

public class SuperChain {
    public static void main(String[] args) {
        ElectricCar car = new ElectricCar("WB-02-AB-1234", 75);
        System.out.println(car.describe());
    }
}`,
        },
        {
          type: "output",
          text: `Vehicle(WB-02-AB-1234) done
Car(WB-02-AB-1234) done
ElectricCar(WB-02-AB-1234, 75) done
vehicle WB-02-AB-1234, 4 wheels, 75 kWh battery`,
        },
        {
          type: "list",
          items: [
            "`new ElectricCar(...)` called `ElectricCar`'s constructor first, but `Vehicle`'s body finished first. Each constructor's first instruction is the call upwards, so the calls go up `ElectricCar`, `Car`, `Vehicle`, `Object` and the bodies complete on the way back down. By the time `ElectricCar`'s body runs, the `Vehicle` and `Car` parts of the object are fully built and safe to use. The Constructors lesson places field initializers and instance initializer blocks into this order.",
            "Each `describe()` calls `super.describe()` and adds one piece. That's the difference between **extending** behaviour and **replacing** it: an electric car's description is a car's description plus the battery, so if `Vehicle.describe()` changes its format, every level picks it up.",
            "`super.describe()` in `ElectricCar` means `Car`'s version, the direct superclass. There's no `super.super.describe()`; `javac` rejects it with `<identifier> expected`. Skipping a level would let `ElectricCar` bypass whatever `Car` does on top of `Vehicle`, which is exactly the kind of invariant `Car` exists to keep.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "super(...) first, and what Java 25 relaxed",
          text: "Up to Java 24 the explicit constructor call has to be the very first statement; on JDK 21, anything before it fails with `call to super must be first statement in constructor`. Java 25's flexible constructor bodies (JEP 513) allow statements before `super(...)`: validating or computing arguments, and assigning this class's own fields, but nothing else that touches `this`. The Constructors lesson covers the feature. Common Mistakes below shows the inheritance bug it finally fixes.",
        },
      ],
    },
    {
      title: "Overriding Basics and @Override",
      blocks: [
        {
          type: "paragraph",
          text: "An instance method in a subclass with the same name and parameter types as an inherited one **overrides** it: for objects of the subclass, the new body runs instead, even when the call is made from code in the superclass. That last part is what makes overriding powerful. `Vehicle` can write the rental formula once and let each subclass supply only the numbers that differ:",
        },
        {
          type: "code",
          language: "java",
          title: "RentalOverride.java",
          code: `import java.util.List;

class Vehicle {
    double baseFee() { return 40.0; }
    double perDay()  { return 12.0; }

    final double rentalCost(int days) {            // written once, used by every subclass
        return baseFee() + days * perDay();
    }
}

class Bike extends Vehicle {
    @Override
    double perDay() { return 6.0; }                // same signature: replaces Vehicle's version
}

class Truck extends Vehicle {
    @Override
    double baseFee() { return 60.0; }

    @Override
    double perDay() { return 20.0; }
}

public class RentalOverride {
    public static void main(String[] args) {
        List<Vehicle> vehicles = List.of(new Vehicle(), new Bike(), new Truck());
        for (Vehicle v : vehicles) {
            System.out.println(v.getClass().getSimpleName() + " 10 days -> " + v.rentalCost(10));
        }
    }
}`,
        },
        {
          type: "output",
          text: `Vehicle 10 days -> 160.0
Bike 10 days -> 100.0
Truck 10 days -> 260.0`,
        },
        {
          type: "paragraph",
          text: "`rentalCost` lives only in `Vehicle` and is `final`, so no subclass can change the formula itself. The calls to `baseFee()` and `perDay()` inside it are `invokevirtual`, so for a `Bike` they reach `Bike.perDay()`: 40 + 10 × 6 = 100. The loop never asks what kind of vehicle it has. (A `final` method calling overridable ones is the template method pattern in miniature; the Abstraction lesson builds it out properly.)",
        },
        {
          type: "heading",
          text: "What @Override does",
        },
        {
          type: "paragraph",
          text: "`@Override` changes nothing at run time. It's an instruction to `javac`: \"this method must override or implement something from a supertype, and if it doesn't, fail.\" That turns a typo (`perday` instead of `perDay`), a wrong parameter type or a superclass rename into a compile error, instead of a new method that silently never runs. Common Mistakes has the silent version with a wrong price. I put it on every override, and so does every style guide I've read.",
        },
        {
          type: "paragraph",
          text: "The Polymorphism lesson owns the full overriding rules and how the JVM picks the method at run time: an override can't be less accessible, its return type must be the same or a subtype (covariant returns, and the bridge methods behind them), it can't throw broader checked exceptions, and `private`, `static` and `final` methods can't be overridden at all (the static and final cases are both shown in this lesson). Here the point is simpler: only instance methods take part. Fields don't, which surprises people.",
        },
      ],
    },
    {
      title: "Fields Are Hidden, Not Overridden",
      blocks: [
        {
          type: "paragraph",
          text: "If a subclass declares a field with the same name as an inherited one, it doesn't replace it. It adds a second field, and the name now refers to one or the other depending on the **declared** type at the access site:",
        },
        {
          type: "code",
          language: "java",
          title: "FieldHiding.java",
          code: `class Vehicle {
    String type = "vehicle";

    String describe() {
        return "Vehicle.describe() sees type = " + type;
    }
}

class Car extends Vehicle {
    String type = "car";                           // a second field; Vehicle.type is still there

    @Override
    String describe() {
        return "Car.describe() sees type = " + type + ", super.type = " + super.type;
    }

    String parentView() {
        return super.describe();
    }
}

public class FieldHiding {
    public static void main(String[] args) {
        Car car = new Car();
        Vehicle v = car;                           // one object, two declared types

        System.out.println("v.type           = " + v.type);
        System.out.println("car.type         = " + car.type);
        System.out.println("((Car) v).type   = " + ((Car) v).type);
        System.out.println("v.describe()     -> " + v.describe());
        System.out.println("car.parentView() -> " + car.parentView());
    }
}`,
        },
        {
          type: "output",
          text: `v.type           = vehicle
car.type         = car
((Car) v).type   = car
v.describe()     -> Car.describe() sees type = car, super.type = vehicle
car.parentView() -> Vehicle.describe() sees type = vehicle`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c FieldHiding | grep -E "getfield|invokevirtual.*(describe|parentView)"`,
        },
        {
          type: "output",
          text: `      14: getfield      #16                 // Field Vehicle.type:Ljava/lang/String;
      29: getfield      #32                 // Field Car.type:Ljava/lang/String;
      47: getfield      #32                 // Field Car.type:Ljava/lang/String;
      62: invokevirtual #35                 // Method Vehicle.describe:()Ljava/lang/String;
      77: invokevirtual #40                 // Method Car.parentView:()Ljava/lang/String;`,
        },
        {
          type: "diagram",
          text: `one Car object on the heap

┌──────────────────────────────────────┐
│ header (class pointer → Car)         │
├──────────────────────────────────────┤
│ Vehicle.type ──► "vehicle"           │ ◄─ v.type, super.type,
│                                      │    and any code in Vehicle
├──────────────────────────────────────┤
│ Car.type     ──► "car"               │ ◄─ car.type, ((Car) v).type,
└──────────────────────────────────────┘    and any code in Car`,
          caption: "Two fields with the same name in one object. The declared type decides which one a name refers to.",
        },
        {
          type: "list",
          items: [
            "`v.type` compiled to `getfield Vehicle.type`. Field access is resolved entirely at compile time from the declared type of `v`; there's no dispatch on the object, so the object being a `Car` doesn't matter.",
            "`v.describe()` compiled to `invokevirtual Vehicle.describe` and still ran `Car.describe()`. Same variable, same object, opposite behaviour: methods dispatch, fields don't.",
            "Inside `Vehicle.describe()`, `type` means `Vehicle.type`, always. That's why `parentView()` printed `vehicle` for a `Car`. Code in a superclass can never see a subclass's hiding field.",
          ],
        },
        {
          type: "paragraph",
          text: "Hiding a field is almost always a mistake, usually a subclass that wanted to \"override\" a default value. The fix is to keep fields `private` and expose them through methods, or to pass the value up through the constructor (`super(\"car\")`), so there's only one field. Private fields can't be hidden from code that can't see them anyway, which is one more reason to keep them private.",
        },
      ],
    },
    {
      title: "Object: The Root of Every Class",
      blocks: [
        {
          type: "paragraph",
          text: "Every class without an `extends` clause extends `java.lang.Object`, so every chain of superclasses ends there. I walked a few chains with `getSuperclass()`:",
        },
        {
          type: "code",
          language: "java",
          title: "ObjectRoot.java",
          code: `class Vehicle { }
class Car extends Vehicle { }

public class ObjectRoot {
    static String chain(Class<?> c) {
        StringBuilder sb = new StringBuilder(c.getTypeName());
        for (Class<?> s = c.getSuperclass(); s != null; s = s.getSuperclass()) {
            sb.append(" -> ").append(s.getTypeName());
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        System.out.println(chain(Car.class));
        System.out.println(chain(Integer.class));
        System.out.println(chain(int[].class));
        System.out.println(chain(Car[].class));
        System.out.println(chain(Runnable.class) + "   (interface: no superclass)");
        System.out.println(chain(int.class) + "   (primitive: no superclass)");

        Object o = new int[] {1, 2, 3};             // arrays are Objects
        System.out.println(o instanceof Cloneable && o instanceof java.io.Serializable);

        Object anything = new Car();                // every reference converts to Object
        System.out.println(anything.getClass().getName() + " " + anything.equals(anything));
    }
}`,
        },
        {
          type: "output",
          text: `Car -> Vehicle -> java.lang.Object
java.lang.Integer -> java.lang.Number -> java.lang.Object
int[] -> java.lang.Object
Car[] -> java.lang.Object
java.lang.Runnable   (interface: no superclass)
int   (primitive: no superclass)
true
Car true`,
        },
        {
          type: "list",
          items: [
            "Classes end at `Object`, whether the chain is one step or several.",
            "**Arrays** are objects too. The superclass of `int[]` and of `Car[]` is `Object` (not `Object[]`), and every array also implements `Cloneable` and `java.io.Serializable` (JLS 4.10.3).",
            "**Interfaces** report no superclass, though an interface type still converts to `Object` and every `Object` method can be called through it. **Primitives** aren't objects, so `int.class` has no superclass either.",
            "Every constructor chain ends at `Object`'s no-arg constructor, which is empty. `javap -c` showed `invokespecial java/lang/Object.\"<init>\":()V` at the top of `Vehicle`'s constructor, and `javap -v` showed `super_class: java/lang/Object` for a class with no `extends`.",
          ],
        },
        {
          type: "paragraph",
          text: "So every class inherits `Object`'s eleven public and protected methods. The Object Class Methods lesson covers each in depth, including how to override `equals` and `hashCode` correctly. What matters here is which ones can be overridden:",
        },
        {
          type: "table",
          headers: ["Method", "Override it?", "Note"],
          rows: [
            ["`equals(Object)`, `hashCode()`", "Yes, together", "Identity by default; value classes override both"],
            ["`toString()`", "Yes", "Default is `ClassName@hexHash`"],
            ["`clone()`", "Yes (it's `protected`)", "Needs `Cloneable`, or it throws `CloneNotSupportedException`"],
            ["`finalize()`", "Don't", "Deprecated since Java 9, deprecated for removal since Java 18 (JEP 421)"],
            ["`getClass()`", "No, `final`", "Returns the run-time class, `Car` for a `Car` held in a `Vehicle` variable"],
            ["`wait()` (three overloads), `notify()`, `notifyAll()`", "No, `final`", "Monitor methods; the Multithreading track covers them"],
          ],
        },
      ],
    },
    {
      title: "Controlling Inheritance: final and sealed",
      blocks: [
        {
          type: "paragraph",
          text: "By default any non-final class can be extended by anyone who can see it, and any non-final, non-private instance method can be overridden. Java has two tools to say no, and since Java 17 a third to say \"only these\".",
        },
        {
          type: "heading",
          text: "final classes",
        },
        {
          type: "code",
          language: "java",
          title: "FinalString.java",
          code: `class PlateNumber extends String { }

public class FinalString { }`,
        },
        {
          type: "output",
          text: `FinalString.java:1: error: cannot inherit from final String
class PlateNumber extends String { }
                          ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`String` is `final` because its immutability is load-bearing. Strings are `HashMap` keys, class names the class loader looks up, file paths and URLs that security checks validate. If a subclass could make a \"string\" whose content changes after the check, or whose `equals` and `hashCode` behave differently, none of that could be trusted. Being final also lets the JDK cache the hash code, share literals in the string pool, and lets HotSpot treat `String` methods as intrinsics. `Integer`, `Long` and the other wrappers are final for the same immutability reasons, and so are records. Enums are implicitly final unless a constant has its own body; then the enum is implicitly sealed instead, which I confirmed with `isSealed()` returning `true` and the constant's class `PaymentMode$1` listed as its only permitted subclass.",
        },
        {
          type: "heading",
          text: "final methods",
        },
        {
          type: "code",
          language: "java",
          title: "FinalMethod.java",
          code: `class Vehicle {
    final double rentalCost(int days) { return 40 + days * 12.0; }
}

class Car extends Vehicle {
    @Override
    double rentalCost(int days) { return 0; }      // a "free rentals" bug, if this compiled
}

public class FinalMethod { }`,
        },
        {
          type: "output",
          text: `FinalMethod.java:7: error: rentalCost(int) in Car cannot override rentalCost(int) in Vehicle
    double rentalCost(int days) { return 0; }      // a "free rentals" bug, if this compiled
           ^
  overridden method is final
1 error`,
        },
        {
          type: "paragraph",
          text: "A final method keeps a class open for extension while locking the parts that guard an invariant, like the rental formula in `RentalOverride`. It's also the safe kind of method to call from a constructor, for reasons Common Mistakes makes concrete. Performance isn't a reason to use it, as the Performance section shows.",
        },
        {
          type: "heading",
          text: "sealed classes (Java 17)",
        },
        {
          type: "paragraph",
          text: "`final` is all or nothing. A **sealed** class names exactly which classes may extend it, and each of those must say how the line continues: `final` (stops), `sealed` (another closed list), or `non-sealed` (open to anyone again).",
        },
        {
          type: "code",
          language: "java",
          title: "SealedVehicles.java",
          code: `import java.util.Arrays;

sealed class Vehicle permits Car, Bike, Truck { }

final class Car extends Vehicle { }             // closed: nothing extends Car

non-sealed class Bike extends Vehicle { }       // reopened: anyone may extend Bike
class ElectricBike extends Bike { }

sealed class Truck extends Vehicle permits DumpTruck { }
final class DumpTruck extends Truck { }

public class SealedVehicles {
    public static void main(String[] args) {
        System.out.println("Vehicle sealed? " + Vehicle.class.isSealed());
        System.out.println("permits: " + Arrays.toString(
            Arrays.stream(Vehicle.class.getPermittedSubclasses()).map(Class::getSimpleName).toArray()));
        System.out.println("Bike sealed? " + Bike.class.isSealed()
            + ", ElectricBike's parent: " + ElectricBike.class.getSuperclass().getSimpleName());
    }
}`,
        },
        {
          type: "output",
          text: `Vehicle sealed? true
permits: [Car, Bike, Truck]
Bike sealed? false, ElectricBike's parent: Bike`,
        },
        {
          type: "paragraph",
          text: "A class that isn't on the list is rejected at its own declaration:",
        },
        {
          type: "code",
          language: "java",
          title: "NotPermitted.java",
          code: `sealed class Vehicle permits Car, Bike { }
final class Car extends Vehicle { }
final class Bike extends Vehicle { }

final class Scooter extends Vehicle { }         // not in the permits list

public class NotPermitted { }`,
        },
        {
          type: "output",
          text: `NotPermitted.java:5: error: class is not allowed to extend sealed class: Vehicle (as it is not listed in its 'permits' clause)
final class Scooter extends Vehicle { }         // not in the permits list
      ^
1 error`,
        },
        {
          type: "list",
          items: [
            "Leaving the modifier off a permitted subclass (`class Car extends Vehicle`) fails with `sealed, non-sealed or final modifiers expected`. The choice has to be explicit.",
            "Permitted subclasses must be in the same module as the sealed class, or in the same package if the code is in the unnamed module. The `permits` clause can be left out when they're all in the same source file, as `Truck` and `DumpTruck` could have been.",
            "In the class file, sealing is a `PermittedSubclasses` attribute: `javap -v Vehicle` listed `Car`, `Bike` and `Truck` under it. `non-sealed` leaves no trace at all. `Bike`'s class file simply has neither `ACC_FINAL` nor `PermittedSubclasses`, which is what \"open\" means. JDK 21's plain `javap` doesn't even print the word `sealed`.",
            "Sealing is about who may **extend** a class, not who may **use** it. Any code can still hold a `Vehicle` reference. The payoff comes in the Polymorphism lesson: a `switch` over a sealed hierarchy can be checked for exhaustiveness, with no `default` branch.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "The JVM checks again at load time",
          text: "`javac` enforces `final` and `sealed`, but class files can come from anywhere, so the JVM checks again when it loads a subclass. I compiled a `Car extends Vehicle` that ran fine, then made `Vehicle` final and recompiled only `Vehicle`. Running `Car` failed before any of its code ran: `java.lang.IncompatibleClassChangeError: class Car cannot inherit from final class Vehicle`. Sealing `Vehicle` with a `permits` list that left out an already-compiled `Scooter` gave `class Scooter cannot inherit from sealed class Vehicle`. Same family of error as a method that disappeared between library versions: the class files no longer agree with each other.",
        },
      ],
    },
    {
      title: "Composition over Inheritance",
      blocks: [
        {
          type: "paragraph",
          text: "Inheritance couples a subclass to its superclass's **implementation**, not just its API. When I extend a class, my overrides get called from inside the superclass's own code, in whatever pattern that code happens to use today. If I don't control that code, I don't control when my methods run. Effective Java's item 18 shows it with a set that counts insertions, and I ran it with city names.",
        },
        {
          type: "heading",
          text: "The counting set that counts wrong",
        },
        {
          type: "code",
          language: "java",
          title: "InstrumentedHashSet.java",
          code: `import java.util.Collection;
import java.util.HashSet;
import java.util.List;

// Effective Java, item 18: looks right, counts wrong
public class InstrumentedHashSet<E> extends HashSet<E> {
    private int addCount = 0;                  // attempted insertions, for a metric

    @Override
    public boolean add(E e) {
        addCount++;
        return super.add(e);
    }

    @Override
    public boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return super.addAll(c);
    }

    public int getAddCount() {
        return addCount;
    }

    public static void main(String[] args) {
        InstrumentedHashSet<String> cities = new InstrumentedHashSet<>();
        cities.addAll(List.of("Kolkata", "Pune", "Delhi"));
        System.out.println("added 3, addCount = " + cities.getAddCount());
    }
}`,
        },
        {
          type: "output",
          text: "added 3, addCount = 6",
        },
        {
          type: "paragraph",
          text: "Three cities, six counted. `HashSet` doesn't declare `addAll` at all (`javap -p java.util.HashSet` lists `add` but no `addAll`), so `super.addAll` runs the version inherited from `AbstractCollection`, and `javap -c java.util.AbstractCollection` shows what that loop does with each element: `aload_0`, then `invokevirtual add`.",
        },
        {
          type: "diagram",
          text: `cities.addAll([Kolkata, Pune, Delhi])

InstrumentedHashSet.addAll(c)        addCount += 3            → 3
 └─ super.addAll(c)                  AbstractCollection.addAll
     └─ for each e: this.add(e)      invokevirtual on this object
         └─ InstrumentedHashSet.add  addCount++  (three times) → 6
             └─ super.add(e)         HashSet.add stores it`,
          caption: "Self-use: the superclass calls back into my override, so the batch is counted twice.",
        },
        {
          type: "paragraph",
          text: "`aload_0` then `invokevirtual add` is a call on `this`, and `this` is my subclass, so it dispatches to my `add`. That's **self-use**: a class calling its own overridable methods. Whether `addAll` uses `add` is an implementation detail that `HashSet`'s documentation doesn't promise either way. The obvious patches all depend on it. Dropping my `addAll` override gives the right count today, but only because of the self-use, and it breaks silently if a future JDK adds a fast path. Rewriting `addAll` to loop over `add` myself reimplements part of the superclass. And neither patch protects me if a later version adds some new method that inserts elements without going through `add` at all.",
        },
        {
          type: "heading",
          text: "The fix: wrap it instead",
        },
        {
          type: "code",
          language: "java",
          title: "InstrumentedSet.java",
          code: `import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

// A reusable forwarding class: every Set method passes straight to the wrapped set
class ForwardingSet<E> implements Set<E> {
    private final Set<E> s;
    ForwardingSet(Set<E> s) { this.s = s; }

    public void clear()                         { s.clear(); }
    public boolean contains(Object o)           { return s.contains(o); }
    public boolean isEmpty()                    { return s.isEmpty(); }
    public int size()                           { return s.size(); }
    public Iterator<E> iterator()               { return s.iterator(); }
    public boolean add(E e)                     { return s.add(e); }
    public boolean remove(Object o)             { return s.remove(o); }
    public boolean containsAll(Collection<?> c) { return s.containsAll(c); }
    public boolean addAll(Collection<? extends E> c) { return s.addAll(c); }
    public boolean removeAll(Collection<?> c)   { return s.removeAll(c); }
    public boolean retainAll(Collection<?> c)   { return s.retainAll(c); }
    public Object[] toArray()                   { return s.toArray(); }
    public <T> T[] toArray(T[] a)               { return s.toArray(a); }
    @Override public boolean equals(Object o)   { return s.equals(o); }
    @Override public int hashCode()             { return s.hashCode(); }
    @Override public String toString()          { return s.toString(); }
}

// The wrapper: has-a Set, adds counting, and HashSet's internals can't call back into it
public class InstrumentedSet<E> extends ForwardingSet<E> {
    private int addCount = 0;

    public InstrumentedSet(Set<E> s) { super(s); }

    @Override
    public boolean add(E e) {
        addCount++;
        return super.add(e);
    }

    @Override
    public boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return super.addAll(c);
    }

    public int getAddCount() {
        return addCount;
    }

    public static void main(String[] args) {
        InstrumentedSet<String> cities = new InstrumentedSet<>(new HashSet<>());
        cities.addAll(List.of("Kolkata", "Pune", "Delhi"));
        System.out.println("added 3, addCount = " + cities.getAddCount() + ", " + cities);
    }
}`,
        },
        {
          type: "output",
          text: "added 3, addCount = 3, [Delhi, Kolkata, Pune]",
        },
        {
          type: "list",
          items: [
            "`InstrumentedSet` **has** a `Set` instead of **being** a `HashSet`. Its `addAll` forwards to the wrapped set's `addAll`, and when `HashSet` loops over `add` internally, that's the wrapped set's own `add`, not mine. Nothing can call back into the wrapper, so the count is 3 whatever `HashSet` does inside.",
            "It still **is a** `Set` (through the interface), so it goes anywhere a `Set` is expected, and it wraps any implementation: `new InstrumentedSet<>(new TreeSet<>())` works unchanged. This shape is the **decorator** pattern; the Design Patterns track covers it.",
            "`ForwardingSet` extends nothing but `Object`, and `InstrumentedSet` extends `ForwardingSet`, a class I wrote and control. Inheritance isn't the problem; inheriting from code I don't own, across a boundary that isn't designed for it, is.",
            "The costs are real but small: sixteen one-line forwarding methods, written once. Wrappers also don't fit callback frameworks, where the wrapped object hands out a reference to itself and the wrapper is bypassed (the \"SELF problem\" in Effective Java).",
          ],
        },
        {
          type: "heading",
          text: "The fragile base class",
        },
        {
          type: "paragraph",
          text: "The counting set breaks because of how the superclass works today. The more general problem is that a superclass can change tomorrow and break subclasses that didn't change at all. To show it without hand-waving, I compiled a subclass against one version of a shipping-cost library and then swapped in the next version without recompiling the subclass:",
        },
        {
          type: "code",
          language: "java",
          title: "BaseShipping.java (v1)",
          code: `public class BaseShipping {
    public double total(int kg) {
        return 50 + kg * 12.0;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "ExpressShipping.java",
          code: `public class ExpressShipping extends BaseShipping {
    // The fixed express fee, a helper of my own
    public double surcharge() {
        return 150.0;
    }

    @Override
    public double total(int kg) {
        return super.total(kg) + surcharge();
    }

    public static void main(String[] args) {
        System.out.println("Express parcel, 20 kg: " + new ExpressShipping().total(20));
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "BaseShipping.java (v2)",
          code: `public class BaseShipping {
    public double total(int kg) {
        return 50 + kg * 12.0 + surcharge();
    }

    // New in v2: a hook for fuel or holiday surcharges, zero by default
    public double surcharge() {
        return 0.0;
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac BaseShipping.java ExpressShipping.java     # BaseShipping v1
java ExpressShipping
# the library ships v2: only BaseShipping.class changes
javac BaseShipping.java                          # BaseShipping v2
java ExpressShipping`,
        },
        {
          type: "output",
          text: `Express parcel, 20 kg: 440.0
Express parcel, 20 kg: 590.0`,
        },
        {
          type: "list",
          items: [
            "With v1: 50 + 20 × 12 = 290, plus my 150 express fee = 440.0. Correct.",
            "With v2, nobody touched `ExpressShipping`, and the same parcel costs 590.0. The library's new `surcharge()` has the same signature as my private-purpose helper, so my method now **overrides** it. `BaseShipping.total` calls `surcharge()`, dispatch lands in my class, and the express fee is charged inside `super.total(kg)` and again on top: 50 + 240 + 150 + 150.",
            "Recompiling `ExpressShipping` against v2 doesn't help. I tried, with `-Xlint:all`: no error, no warning, still 590.0. `@Override` couldn't have warned me either, because my method was written before the base method existed. An IDE inspection for a missing `@Override` would flag it, but `javac` won't.",
            "The real failure is coupling. `ExpressShipping` depended on `BaseShipping`'s internal calls. A version where the express fee lives in a separate object that **uses** a `BaseShipping` (`base.total(kg) + fee`) can't be hijacked like this, because nothing in the library can dispatch into it.",
          ],
        },
        {
          type: "paragraph",
          text: "That's the **fragile base class** problem: a superclass can't be changed safely without knowing every subclass, and the subclass can't be written safely without knowing the superclass's internals. Inside one codebase, where both sides change together and the tests cover both, it's manageable. Across a library boundary it's a trap, which is exactly why Effective Java's item 19 says to design and document a class for inheritance, or else prohibit it with `final`.",
        },
      ],
    },
    {
      title: "The Liskov Substitution Principle",
      blocks: [
        {
          type: "paragraph",
          text: "The LSP says that code written against a type must keep working, correctly and without surprises, when handed any subtype of it. Not just \"compiles\" (the compiler guarantees that) but behaves: a subtype mustn't demand more from callers (stronger preconditions), deliver less (weaker postconditions), break the supertype's invariants, or throw failures the supertype's contract doesn't allow. Here's a violation in a payments flow:",
        },
        {
          type: "code",
          language: "java",
          title: "RefundBatch.java",
          code: `import java.util.List;

class Payment {
    final String id;
    final double amount;

    Payment(String id, double amount) {
        this.id = id;
        this.amount = amount;
    }

    String refund() {
        return "refunded " + amount + " to " + id;
    }
}

class CardPayment extends Payment {
    CardPayment(String id, double amount) { super(id, amount); }
}

class CashPayment extends Payment {
    CashPayment(String id, double amount) { super(id, amount); }

    @Override
    String refund() {                                     // breaks Payment's promise
        throw new UnsupportedOperationException("cash can't be refunded automatically: " + id);
    }
}

public class RefundBatch {
    // Written against Payment, so it trusts that every Payment can be refunded
    static void refundAll(List<Payment> payments) {
        for (Payment p : payments) {
            System.out.println(p.refund());
        }
    }

    public static void main(String[] args) {
        refundAll(List.of(
            new CardPayment("pay-101", 240.0),
            new CashPayment("pay-102", 180.0),
            new CardPayment("pay-103", 90.0)));
    }
}`,
        },
        {
          type: "output",
          text: `refunded 240.0 to pay-101
Exception in thread "main" java.lang.UnsupportedOperationException: cash can't be refunded automatically: pay-102
	at CashPayment.refund(RefundBatch.java:26)
	at RefundBatch.refundAll(RefundBatch.java:34)
	at RefundBatch.main(RefundBatch.java:39)`,
        },
        {
          type: "list",
          items: [
            "`refundAll` is correct for the type it was written against, and it failed halfway: `pay-101` refunded, `pay-102` blew up, and `pay-103` was never attempted. In a real batch job that's the worst outcome, a partial run that someone has to reconcile by hand.",
            "Nothing warned anyone. `CashPayment` compiles because overriding only checks signatures, never promises. The `extends Payment` claim was false the day it was written.",
            "The usual \"fix\" makes it worse: `if (p instanceof CashPayment) continue;` in every caller. Now each caller must know every subclass, and the next non-refundable payment type breaks them all again. Substitutability was the whole point of the hierarchy.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix is to stop promising what isn't true for every subtype. I moved `refund()` out of `Payment` into a subclass that only refundable payments extend, and pointed the batch at that type:",
        },
        {
          type: "code",
          language: "java",
          code: `class Payment { /* id, amount: no refund() here */ }
class RefundablePayment extends Payment { String refund() { /* ... */ } }
class CardPayment extends RefundablePayment { /* ... */ }
class UpiPayment extends RefundablePayment { /* ... */ }
class CashPayment extends Payment { /* nothing to break */ }

static void refundAll(List<? extends RefundablePayment> payments) { /* same loop */ }`,
        },
        {
          type: "paragraph",
          text: "When I ran that version, the card and UPI refunds both printed and the cash payment went to a manual queue explicitly. Passing a cash payment to `refundAll` no longer compiles, so the mistake is a type error instead of a half-finished batch. A capability interface (`interface Refundable`) is the more flexible version of the same idea, since a class can implement several of them; the Interfaces lesson picks that up.",
        },
        {
          type: "paragraph",
          text: "The textbook violation is `Square extends Rectangle`. Mathematically a square is a rectangle, but if `Rectangle` has `setWidth` and `setHeight`, a `Square` must change both together, and code that sets width 5 and height 4 and expects area 20 gets 16. \"Is-a\" in the real world isn't enough; the subtype has to honour the supertype's **behaviour**. The JDK has its own documented exception: `List.add` is an \"optional operation\", so `List.of(...).add(x)` throws `UnsupportedOperationException`. That's allowed because the `List` contract says so up front, and it's still a frequent production surprise.",
        },
        {
          type: "paragraph",
          text: "My quick test before writing `extends`: would every caller of the superclass be happy with this subclass without knowing it's there? An override that throws `UnsupportedOperationException`, does nothing where the parent acts, rejects inputs the parent accepts, or needs the parent's own methods kept away from its state (the square's width and height) all fail that test.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `SuperCalls` from Internal Working, from source to its two lines of output:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time.** `javac` reads `class Car extends Vehicle`, checks that `Vehicle` exists, isn't `final` and isn't sealed against `Car`, and records it as `super_class` in `Car.class`. `Car.class` contains only `Car`'s own members: `doors`, the constructor and `describe`.",
            "In `Car`'s constructor, `javac` matches `super(id, plate)` to `Vehicle(long, String)` and emits `aload_0`, the arguments and `invokespecial Vehicle.\"<init>\"` before the `putfield` for `doors`.",
            "`super.describe()` becomes `invokespecial Vehicle.describe`. In `main`, `v.describe()` becomes `invokevirtual Vehicle.describe` (the declared type) and `car.seatsFor(6)` becomes `invokevirtual Car.seatsFor`, though `Car` doesn't declare it.",
            "**Run time.** The JVM loads `SuperCalls` and verifies `main`. Storing a `Car` into a `Vehicle` variable has to be proven type-safe, so the verifier loads `Car`, and `Vehicle` finishes loading first, because a class can't be created before its superclass.",
            "`new Car` triggers initialization of `Car`, and initializing a class initializes its superclass first: `Vehicle`, then `Car` (JLS 12.4.2). Neither has a static initializer, so the log says `(no method)`.",
            "`new` allocates one object sized for every field in the chain (`Vehicle`'s `id` and `plate`, `Car`'s `doors`), zeroed, with a header whose class pointer says `Car`.",
            "`invokespecial Car.<init>` runs. Its first call is `Vehicle.<init>`, whose first call is `Object.<init>`. `Object`'s body returns at once, `Vehicle`'s stores `id` and `plate`, then `Car`'s stores `doors`.",
            "`v.describe()`: `invokevirtual` resolves `Vehicle.describe` once, then selects by the object's actual class and runs `Car.describe()`.",
            "Inside it, `invokespecial Vehicle.describe` runs `Vehicle`'s body, which may read the private `id` because it's `Vehicle`'s own code. `Car` appends the door count and the first line prints.",
            "`car.seatsFor(6)`: resolving `Car.seatsFor` finds nothing in `Car`, walks up to `Vehicle.seatsFor`, and `Math.min(6, 4)` prints `4`.",
          ],
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:class+load,class+init=info SuperCalls    # app classes only, paths shortened; times and addresses vary`,
        },
        {
          type: "output",
          text: `[0.026s][info][class,load] SuperCalls source: file:.../
[0.027s][info][class,init] Start class verification for: SuperCalls
[0.027s][info][class,load] Vehicle source: file:.../
[0.027s][info][class,load] Car source: file:.../
[0.027s][info][class,init] End class verification for: SuperCalls
[0.027s][info][class,init] 312 Initializing 'SuperCalls'(no method) (0x00007bb768000800) by thread "main"
[0.027s][info][class,init] Start class verification for: Vehicle
[0.027s][info][class,init] End class verification for: Vehicle
[0.027s][info][class,init] Start class verification for: Car
[0.027s][info][class,init] End class verification for: Car
[0.027s][info][class,init] 313 Initializing 'Vehicle'(no method) (0x00007bb768000a08) by thread "main"
[0.027s][info][class,init] 314 Initializing 'Car'(no method) (0x00007bb768000c28) by thread "main"
vehicle 7 (WB-02-AB-1234), 4 doors
4`,
        },
        {
          type: "paragraph",
          text: "The detail I didn't expect: `Vehicle` and `Car` were loaded in the middle of verifying `SuperCalls`, before `main` ran at all, because the verifier had to check that a `Car` is assignable to `Vehicle`. Loading and initialization are separate steps, and only `new Car` triggered initialization, superclass first.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "InheritanceSyntax.java",
          code: `import java.util.List;

sealed class Vehicle permits Car, Bike {              // sealed: only Car and Bike may extend it
    protected final String plate;                     // protected: visible to subclasses

    Vehicle(String plate) {
        this.plate = plate;
    }

    String describe() {
        return "vehicle " + plate;
    }

    final String tag() {                              // final method: no subclass can override it
        return "[" + plate + "]";
    }
}

final class Car extends Vehicle {                     // extends + final: the line stops here
    private final int seats;

    Car(String plate, int seats) {
        super(plate);                                 // super(...): the parent's constructor first
        this.seats = seats;
    }

    @Override                                         // checked by the compiler
    String describe() {
        return super.describe() + ", " + seats + " seats";   // super.method(): extend, don't replace
    }
}

non-sealed class Bike extends Vehicle {               // non-sealed: open again below Bike
    Bike(String plate) {
        super(plate);
    }
}

public class InheritanceSyntax {
    public static void main(String[] args) {
        List<Vehicle> vehicles = List.of(new Car("WB-02-AB-1234", 4), new Bike("MH-12-XY-9876"));
        for (Vehicle v : vehicles) {                     // upcast: a Car is a Vehicle, no cast needed
            String extra = (v instanceof Car car) ? " " + car.tag() : "";   // checked downcast
            System.out.println(v.describe() + extra);
        }
        Object root = vehicles.get(0);                   // every class ends at Object
        System.out.println(root.getClass().getSuperclass().getSuperclass());
    }
}`,
        },
        {
          type: "output",
          text: `vehicle WB-02-AB-1234, 4 seats [WB-02-AB-1234]
vehicle MH-12-XY-9876
class java.lang.Object`,
        },
        {
          type: "paragraph",
          text: "Every form from this lesson in one file: `extends`, `super(...)`, `super.method()`, `@Override`, `protected`, a `final` method, a `final` class, and a `sealed` class with a `final` and a `non-sealed` subclass. `v instanceof Car car` is the pattern-matching form of a checked downcast (Java 16); the Polymorphism lesson covers it.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Multilevel: each level builds on the one above",
        },
        {
          type: "paragraph",
          text: "A luxury car rents for whatever a car costs, times 1.5, and a car costs whatever a vehicle costs plus an insurance fee. Each level states only its own rule:",
        },
        {
          type: "code",
          language: "java",
          title: "LuxuryCarDemo.java",
          code: `class Vehicle {
    double rentalCost(int days) {
        return 40 + days * 12.0;                      // base fee + per day
    }
}

class Car extends Vehicle {
    @Override
    double rentalCost(int days) {
        return super.rentalCost(days) + 25;           // + insurance fee
    }
}

class LuxuryCar extends Car {
    @Override
    double rentalCost(int days) {
        return super.rentalCost(days) * 1.5;          // luxury multiplier on top of everything
    }
}

public class LuxuryCarDemo {
    public static void main(String[] args) {
        Vehicle rental = new LuxuryCar();
        System.out.println("luxury, 10 days: " + rental.rentalCost(10));
        System.out.println("car, 10 days:    " + new Car().rentalCost(10));
        System.out.println("is a LuxuryCar, Car, Vehicle: " + (rental instanceof LuxuryCar)
            + " " + (rental instanceof Car) + " " + (rental instanceof Vehicle));
        System.out.println("a plain Car is a LuxuryCar: " + (new Car() instanceof LuxuryCar));
        System.out.println("exact class is Car: " + (rental.getClass() == Car.class));
    }
}`,
        },
        {
          type: "output",
          text: `luxury, 10 days: 277.5
car, 10 days:    185.0
is a LuxuryCar, Car, Vehicle: true true true
a plain Car is a LuxuryCar: false
exact class is Car: false`,
        },
        {
          type: "diagram",
          text: `rental.rentalCost(10)              rental is a LuxuryCar
 └─ LuxuryCar.rentalCost(10)       super...(10) * 1.5   = 277.5
     └─ Car.rentalCost(10)         super...(10) + 25    = 185.0
         └─ Vehicle.rentalCost(10) 40 + 10 * 12.0       = 160.0`,
          caption: "Calls go down the super chain; results come back up, each level adding its part.",
        },
        {
          type: "paragraph",
          text: "is-a is transitive: a `LuxuryCar` is a `Car` and a `Vehicle`, but a plain `Car` isn't a `LuxuryCar`. And `instanceof` asks a different question from `getClass() ==`: the first is \"is it this type or a subtype?\", the second is \"is it exactly this class?\". Mixing them up is a classic source of broken `equals` methods, which the Object Class Methods lesson covers.",
        },
        {
          type: "heading",
          text: "Hierarchical: one catch for a family of failures",
        },
        {
          type: "paragraph",
          text: "Exception classes are where I use inheritance most in backend code, because `catch` clauses match on the hierarchy:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderExceptions.java",
          code: `class OrderException extends RuntimeException {
    OrderException(String message) {
        super(message);                               // Throwable stores it; getMessage() is inherited
    }
}

class OutOfStockException extends OrderException {
    OutOfStockException(String product) {
        super(product + " is out of stock");
    }
}

class PaymentDeclinedException extends OrderException {
    final String paymentId;

    PaymentDeclinedException(String paymentId) {
        super("payment " + paymentId + " declined");
        this.paymentId = paymentId;
    }
}

public class OrderExceptions {
    static void placeOrder(String product, String paymentId) {
        if (product.equals("monitor")) throw new OutOfStockException(product);
        if (paymentId.startsWith("bad")) throw new PaymentDeclinedException(paymentId);
        System.out.println("order placed for " + product);
    }

    public static void main(String[] args) {
        String[][] orders = { {"keyboard", "pay-1"}, {"monitor", "pay-2"}, {"mouse", "bad-3"} };
        for (String[] o : orders) {
            try {
                placeOrder(o[0], o[1]);
            } catch (PaymentDeclinedException e) {    // most specific first
                System.out.println("ask for another card (" + e.paymentId + ")");
            } catch (OrderException e) {              // catches every other order failure
                System.out.println(e.getClass().getSimpleName() + ": " + e.getMessage());
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `order placed for keyboard
OutOfStockException: monitor is out of stock
ask for another card (bad-3)`,
        },
        {
          type: "diagram",
          text: `RuntimeException
      ▲
OrderException ◄── catch (OrderException e) handles everything below
      ▲
      ├── OutOfStockException
      └── PaymentDeclinedException ◄── caught first, on its own`,
          caption: "A catch clause is an is-a test: it handles its class and every subclass.",
        },
        {
          type: "paragraph",
          text: "This is inheritance used well: a genuine is-a family, no shared mutable state, and callers who rely on the hierarchy. Each constructor passes its message up with `super(...)` to `Throwable`, and `getMessage()` is inherited. Order matters: with `catch (OrderException e)` first, the `PaymentDeclinedException` clause can never run, and `javac` rejects it with `exception PaymentDeclinedException has already been caught`. Exception Handling, later in this track, goes further.",
        },
        {
          type: "heading",
          text: "Extending a class that was designed for it",
        },
        {
          type: "paragraph",
          text: "Not every JDK class is a trap to extend. `LinkedHashMap` documents a `protected` hook, `removeEldestEntry`, along with exactly when it's called: after every insertion. That makes a small most-recently-used cache of product searches a safe subclass:",
        },
        {
          type: "code",
          language: "java",
          title: "RecentSearchesDemo.java",
          code: `import java.util.LinkedHashMap;
import java.util.Map;

// LinkedHashMap documents removeEldestEntry as a hook for subclasses
class RecentSearches extends LinkedHashMap<String, Integer> {
    private final int limit;

    RecentSearches(int limit) {
        super(16, 0.75f, true);                  // access order: most recently used last
        this.limit = limit;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<String, Integer> eldest) {
        return size() > limit;                   // called after every insertion
    }
}

public class RecentSearchesDemo {
    public static void main(String[] args) {
        RecentSearches searches = new RecentSearches(3);
        for (String term : new String[] {"laptop", "phone", "headphones", "phone", "charger"}) {
            searches.merge(term, 1, Integer::sum);
        }
        System.out.println(searches);
    }
}`,
        },
        {
          type: "output",
          text: "{headphones=1, phone=2, charger=1}",
        },
        {
          type: "paragraph",
          text: "The second `phone` search moved it to the most-recent end, and inserting `charger` pushed the size to 4, so the hook evicted the least recently used, `laptop`. The contrast with `InstrumentedHashSet` is the whole point: here the superclass **promises** when it calls my override, so the subclass doesn't depend on an accident of the implementation. The Memory Allocation lesson used the same hook, as an anonymous subclass, for a bounded cache.",
        },
        {
          type: "heading",
          text: "Inheritance mistakes in the JDK itself",
        },
        {
          type: "paragraph",
          text: "`Properties` and `Stack` date from Java 1.0, and both extend a general-purpose collection to borrow its storage. Effective Java uses them as the standard examples of is-a that isn't true:",
        },
        {
          type: "code",
          language: "java",
          title: "JdkInheritanceMistakes.java",
          code: `import java.io.StringWriter;
import java.util.Properties;
import java.util.Stack;

public class JdkInheritanceMistakes {
    public static void main(String[] args) throws Exception {
        // Properties extends Hashtable<Object, Object>, so Hashtable's put is public too
        Properties config = new Properties();
        config.setProperty("shipping.base", "50");
        config.put("shipping.perKg", 12);                 // an Integer, not a String
        System.out.println("getProperty(shipping.base)  = " + config.getProperty("shipping.base"));
        System.out.println("getProperty(shipping.perKg) = " + config.getProperty("shipping.perKg"));
        System.out.println("get(shipping.perKg)         = " + config.get("shipping.perKg"));
        try {
            config.store(new StringWriter(), null);
        } catch (ClassCastException e) {
            System.out.println("store() failed: " + e.getMessage());
        }

        // Stack extends Vector, so every List operation works on a "stack"
        Stack<String> undo = new Stack<>();
        undo.push("type Asha");
        undo.push("type Ravi");
        undo.add(0, "delete line 42");                    // inserted at the bottom
        System.out.println("stack  = " + undo);
        System.out.println("pop()  = " + undo.pop());
        System.out.println("get(0) = " + undo.get(0));
    }
}`,
        },
        {
          type: "output",
          text: `getProperty(shipping.base)  = 50
getProperty(shipping.perKg) = null
get(shipping.perKg)         = 12
store() failed: class java.lang.Integer cannot be cast to class java.lang.String (java.lang.Integer and java.lang.String are in module java.base of loader 'bootstrap')
stack  = [delete line 42, type Asha, type Ravi]
pop()  = type Ravi
get(0) = delete line 42`,
        },
        {
          type: "list",
          items: [
            "`Properties` is meant to map `String` to `String`, but inheriting from `Hashtable` made `put(Object, Object)` part of its public API. One `put` with an `Integer` and the object is in a state its own methods can't handle: `getProperty` quietly returns `null`, `get` returns `12`, and `store()` blows up with a `ClassCastException`.",
            "`Stack` is meant to be last-in, first-out, but inheriting from `Vector` exposes `add(0, x)`, `get(i)` and `remove(i)`. Nothing stopped me inserting at the bottom. The JDK documentation now points to `Deque` (`ArrayDeque`) for stacks.",
            "Neither can be fixed without breaking code that already calls the inherited methods. A superclass's public methods become the subclass's public methods forever, which is the strongest argument for composition when the is-a isn't real.",
          ],
        },
      ],
    },
    {
      title: "When to Use Inheritance (and When Not To)",
      blocks: [
        {
          type: "paragraph",
          text: "Everything above boils down to a small number of questions. I run through them in this order before typing `extends`:",
        },
        {
          type: "diagram",
          text: `I want class B to reuse A, or to be a kind of A
│
├─ Is every B usable everywhere an A is, keeping A's promises?
│     no ───► composition: B has an A and forwards to it
│
├─ Can an object's "kind" change while it lives? (customer → seller)
│     yes ──► composition: roles or profile objects in fields
│
├─ Is A mine to change, or designed and documented for extension?
│     no ───► wrap A (forwarding / decorator), don't extend it
│
├─ Is the set of kinds fixed and known up front?
│     yes ──► sealed A permits B, C  (or an enum, or records)
│
├─ Does A only describe a capability, with no shared state?
│     yes ──► an interface (the Interfaces lesson)
│
└─ Otherwise: B extends A. Keep it shallow, and final where it ends.`,
          caption: "Inheritance is the last answer in the list, not the first.",
        },
        {
          type: "table",
          headers: ["Situation", "Use", "Why"],
          rows: [
            ["Entities that share identity and audit fields and the rules around them (`Order`, `Customer`, `Product`)", "`extends` a base class", "One rule in one place, and every subtype honours it (Production below has the full version)"],
            ["A family of failures callers handle together", "`extends RuntimeException`", "`catch` matches on the hierarchy"],
            ["Adding behaviour to a library class (`HashSet`, `LinkedBlockingQueue`)", "Composition, forwarding", "Self-use and future versions can't reach into a wrapper"],
            ["A class documented for extension (`LinkedHashMap.removeEldestEntry`)", "`extends`, overriding only the documented hooks", "The superclass promises when it calls them"],
            ["Roles that change over time (customer, seller, admin)", "Composition: a set of roles, profile objects", "An object can never change its class"],
            ["A fixed set of variants (`Car`, `Bike`, `Truck`)", "A sealed hierarchy", "Closed for extension, and switches can be exhaustive"],
            ["A capability unrelated classes share (refundable, trackable)", "An interface", "Multiple inheritance of type, no shared state"],
            ["A class nobody has designed for subclassing", "`final`", "Effective Java item 19: design for it or prohibit it"],
          ],
        },
        {
          type: "list",
          items: [
            "Inherit for is-a **with** substitutability, never just to reuse a few methods.",
            "Extend only classes I own, or classes documented for extension. Wrap everything else.",
            "Keep hierarchies shallow: two or three levels. Every level is more internals that subclasses depend on.",
            "Make a class `final` until I've designed it for extension, then open it deliberately, or seal it.",
            "If an override throws `UnsupportedOperationException` or does nothing, the hierarchy is wrong.",
            "If the \"type\" can change during an object's life, it's state, not a class.",
          ],
        },
        {
          type: "heading",
          text: "A right choice and a wrong choice",
        },
        {
          type: "paragraph",
          text: "The right choice is a shared base class for persisted entities: every `Order`, `Customer` and `Product` really is an entity with an id and timestamps, the rule \"`updatedAt` never goes backwards\" applies to all of them, and nothing about it changes at run time. The Production section builds exactly that `BaseEntity`. The wrong choice I'd expect to see is modelling the users of a marketplace by subclass, `CustomerAccount` and `SellerAccount` extending `UserAccount`. It looks like is-a, but Asha is a customer who decides to open a shop:",
        },
        {
          type: "code",
          language: "java",
          title: "UserRoles.java",
          code: `import java.util.EnumSet;
import java.util.Set;

// Wrong: the role is the class, and an object can never change its class
class UserAccount {
    final long id;
    final String name;
    int storeCredit;

    UserAccount(long id, String name) {
        this.id = id;
        this.name = name;
    }
}

class CustomerAccount extends UserAccount {
    CustomerAccount(long id, String name) { super(id, name); }
}

class SellerAccount extends UserAccount {
    final String storeName;

    SellerAccount(long id, String name, String storeName) {
        super(id, name);
        this.storeName = storeName;
    }
}

// Right: one User that has roles and role data, which can change at run time
enum Role { CUSTOMER, SELLER, ADMIN }

record SellerProfile(String storeName, double rating) { }

class User {
    final long id;
    final String name;
    int storeCredit;
    private final Set<Role> roles = EnumSet.of(Role.CUSTOMER);
    private SellerProfile sellerProfile;              // null until they start selling

    User(long id, String name) {
        this.id = id;
        this.name = name;
    }

    void startSelling(SellerProfile profile) {
        sellerProfile = profile;
        roles.add(Role.SELLER);
    }

    boolean can(Role role) {
        return roles.contains(role);
    }

    @Override
    public String toString() {
        return name + " #" + id + " " + roles + " credit=" + storeCredit
            + (sellerProfile != null ? " store=" + sellerProfile.storeName() : "");
    }
}

public class UserRoles {
    public static void main(String[] args) {
        CustomerAccount asha = new CustomerAccount(101, "Asha");
        asha.storeCredit = 500;
        // Asha opens a shop. A CustomerAccount can't become a SellerAccount,
        // so inheritance leaves one option: a second account
        SellerAccount ashaSelling = new SellerAccount(102, "Asha", "Asha Books");
        System.out.println("inheritance: #" + asha.id + " credit=" + asha.storeCredit
            + " and #" + ashaSelling.id + " credit=" + ashaSelling.storeCredit);

        User user = new User(101, "Asha");
        user.storeCredit = 500;
        user.startSelling(new SellerProfile("Asha Books", 4.9));
        System.out.println("composition: " + user + ", can sell? " + user.can(Role.SELLER));
    }
}`,
        },
        {
          type: "output",
          text: `inheritance: #101 credit=500 and #102 credit=0
composition: Asha #101 [CUSTOMER, SELLER] credit=500 store=Asha Books, can sell? true`,
        },
        {
          type: "list",
          items: [
            "With subclasses, becoming a seller means a second object with a second id, so Asha's store credit is split across #101 and #102, her order history across two accounts, and every query has to stitch them back together. Admin access would be a third account, or a class like `AdminSellerAccount` for every combination.",
            "With composition, Asha is one `User` whose roles and seller data are parts it **has**. Opening a shop is a method call, not a new identity. The `SellerProfile` lives and dies with the user, which the next lesson calls composition in the strict sense.",
            "Inheritance still has a place in that model: `User` itself could extend a `BaseEntity` for its id and timestamps. Use inheritance for what an object **is** for its whole life, and fields for what it **has** or **does** at the moment.",
          ],
        },
        {
          type: "paragraph",
          text: "The capstone lesson, When to Use What in Java OOP, puts this decision next to the others from this phase (interface or abstract class, record or class, constructor or factory) and works through a pricing-and-payments design with all of them.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Calling an overridable method from a constructor",
        },
        {
          type: "code",
          language: "java",
          title: "HalfBuilt.java",
          code: `class Shape {
    Shape() {
        System.out.println("Shape() logs: " + describe());   // calls an overridable method
    }

    String describe() {
        return "a shape";
    }
}

class Circle extends Shape {
    private final String color;
    private final double radius;

    Circle(String color, double radius) {
        super();                     // Shape() runs first, on a Circle whose fields are still zero
        this.color = color;
        this.radius = radius;
    }

    @Override
    String describe() {
        return color + " circle, radius " + radius;
    }
}

public class HalfBuilt {
    public static void main(String[] args) {
        Circle circle = new Circle("red", 1.5);
        System.out.println("after construction: " + circle.describe());
    }
}`,
        },
        {
          type: "output",
          text: `Shape() logs: null circle, radius 0.0
after construction: red circle, radius 1.5`,
        },
        {
          type: "paragraph",
          text: "`Shape()` runs before `Circle`'s constructor body, but `describe()` dispatches to `Circle`'s override, which reads fields nobody has assigned yet. Two `final` fields were observed with two different values: `null` and `0.0` first, `red` and `1.5` later. If the override had called `color.toUpperCase()`, construction would have died with a `NullPointerException`. The rule from Effective Java's item 19: constructors must not call overridable methods. Call `private`, `final` or `static` helpers instead, or do the work after construction.",
        },
        {
          type: "paragraph",
          text: "Java 25 adds a second way out. With flexible constructor bodies (JEP 513), a constructor may assign its own fields before calling `super(...)`:",
        },
        {
          type: "code",
          language: "java",
          code: `    Circle(String color, double radius) {
        this.color = color;          // JDK 25: fields assigned before super(...)
        this.radius = radius;
        super();
    }`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac HalfBuilt.java                                           # JDK 21
jdk-25/bin/javac HalfBuilt.java && jdk-25/bin/java HalfBuilt   # JDK 25`,
        },
        {
          type: "output",
          text: `HalfBuilt.java:18: error: call to super must be first statement in constructor
        super();
             ^
1 error

Shape() logs: red circle, radius 1.5
after construction: red circle, radius 1.5`,
        },
        {
          type: "paragraph",
          text: "JDK 21 rejects the reordered constructor; JDK 25 compiles it, and the superclass's call now sees real values. It only helps when the subclass is mine to edit, so the old rule still stands. JDK 21 also added `javac -Xlint:this-escape`. In my single-file demo it stayed silent, because it only checks classes that code in other packages could extend; with a public `Shape` in a `com.example.shapes` package it warned: `possible 'this' escape before subclass is fully initialized`.",
        },
        {
          type: "heading",
          text: "A misspelled override, and no @Override",
        },
        {
          type: "code",
          language: "java",
          title: "OverrideTypo.java",
          code: `class Vehicle {
    double perDay() { return 12.0; }

    double rentalCost(int days) {
        return 40 + days * perDay();
    }
}

class Bike extends Vehicle {
    double perday() { return 6.0; }             // lowercase d: a brand-new method
}

public class OverrideTypo {
    public static void main(String[] args) {
        Vehicle bike = new Bike();
        System.out.println("bike, 10 days: " + bike.rentalCost(10));
    }
}`,
        },
        {
          type: "output",
          text: "bike, 10 days: 160.0",
        },
        {
          type: "paragraph",
          text: "A bike rental priced at the vehicle rate, 160.0 instead of 100.0, with no error anywhere: `perday()` is a new method that nothing calls. Adding `@Override` above it turns the bug into a compile error:",
        },
        {
          type: "output",
          text: `OverrideTypo.java:10: error: method does not override or implement a method from a supertype
    @Override
    ^
1 error`,
        },
        {
          type: "heading",
          text: "Expecting fields, static methods and constructors to behave like methods",
        },
        {
          type: "paragraph",
          text: "Three versions of one mistake, all shown earlier: `v.type` printed `vehicle` for a `Car` because fields are picked by the declared type, `v.category()` printed `vehicle` because static calls are bound at compile time, and `new Car(4)` didn't compile because `Vehicle(int)` isn't inherited. Only instance methods dispatch on the object.",
        },
        {
          type: "heading",
          text: "Extending a class to borrow its code",
        },
        {
          type: "paragraph",
          text: "`InstrumentedHashSet` counting 6 for 3, and `Properties` returning `null` for a value it holds, both come from inheriting an implementation instead of a role. If the honest description is \"uses a `HashSet`\" rather than \"is a set\", it's a field.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use `extends` for is-a with substitutability, and a field for has-a. Reusing code is never enough reason to inherit.",
            "Keep fields `private` in a base class. Give subclasses `protected` methods to call or override, not `protected` fields to write.",
            "Put `@Override` on every override.",
            "To extend behaviour, call `super.method()` and add to it, and document whether overrides are expected to call `super`.",
            "Never call an overridable method from a constructor. Call `private`, `final` or `static` helpers.",
            "Make classes `final` unless they're designed for extension. When one is, document its self-use (which overridable methods it calls, and when), the way `LinkedHashMap` documents `removeEldestEntry`. Use `sealed` for a closed family.",
            "Don't extend concrete library classes (collections, `Hashtable`, `Thread`) to add behaviour. Wrap them.",
            "Keep hierarchies shallow, and don't hide fields or static methods.",
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
            "**Memory per instance.** Every inherited field is in every object, used or not, private or not. `Car` was 32 bytes against 24 for the same visible fields without the superclass; across a million cached cars that's about 8 MB for an `id` nothing in `Car` reads. Classes allocated in bulk deserve a layout check.",
            "**Field access.** Offsets are fixed when classes load, and a superclass's fields keep their offsets in every subclass, so reading `seats` through a `Car` is the same single load as through a `Vehicle`, at any depth.",
            "**Method calls.** A non-overridden inherited method is still called with `invokevirtual`, but HotSpot's class hierarchy analysis lets the JIT treat it as final while no loaded class overrides it, and inline it. Loading an overriding subclass later deoptimizes the code that relied on that.",
            "**Class loading.** Each superclass is loaded, verified and initialized once, before the subclass, as the Execution Flow log showed. A one-time cost, not a per-object one.",
          ],
        },
        {
          type: "paragraph",
          text: "I wanted to see the class hierarchy analysis being undone, so I warmed up a call site with only `Shipping` loaded, then loaded a subclass that overrides `perKg()`:",
        },
        {
          type: "code",
          language: "java",
          title: "ChaDemo.java",
          code: `class Shipping {
    int perKg() { return 12; }
}

class ExpressShipping extends Shipping {
    @Override
    int perKg() { return 18; }
}

public class ChaDemo {
    static int total(Shipping s, int kg) {
        return 50 + kg * s.perKg();                 // a virtual call
    }

    static long run(Shipping s) {
        long sum = 0;
        for (int i = 0; i < 2_000_000; i++) sum += total(s, i % 40);
        return sum;
    }

    public static void main(String[] args) throws Exception {
        System.out.println("standard: " + run(new Shipping()));
        System.out.println("loading ExpressShipping");
        Shipping express = (Shipping) Class.forName("ExpressShipping").getDeclaredConstructor().newInstance();
        System.out.println("express:  " + run(express));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:dependencies=debug ChaDemo     # trimmed`,
        },
        {
          type: "output",
          text: `standard: 568000000
loading ExpressShipping
[0.058s][debug][dependencies] Failed dependency of type leaf_type
[0.058s][debug][dependencies]   context = Shipping
[0.058s][debug][dependencies]   witness = ExpressShipping
[0.058s][info ][dependencies] Marked for deoptimization
[0.058s][info ][dependencies]   dependee = ExpressShipping
...
[0.058s][debug][dependencies] Failed dependency of type unique_concrete_method_4
[0.058s][debug][dependencies]   context = Shipping
[0.058s][debug][dependencies]   method  = {method} {0x00007ce1b4400b20} 'perKg' '()I' in 'Shipping'
...
[0.058s][debug][dependencies]   witness = ExpressShipping
[0.058s][info ][dependencies] Marked for deoptimization
[0.058s][info ][dependencies]   dependee = ExpressShipping
express:  802000000`,
        },
        {
          type: "paragraph",
          text: "Before `ExpressShipping` existed, `-XX:+PrintInlining` showed `Shipping::perKg (3 bytes)   inline` at the call in `total`. The moment `ExpressShipping` was loaded, before any of its code ran, HotSpot reported failed dependencies, assumptions it had compiled in about the hierarchy (that `Shipping` had no subclasses, and that `perKg` had one implementation), and marked the code built on them for deoptimization. Recompiled code first showed `Shipping::perKg (3 bytes)   no static binding`, then C2 inlined both `Shipping::perKg` and `ExpressShipping::perKg` behind a type check, each marked `inline (hot)`. Timestamps and the number of methods marked change from run to run. The practical conclusion: marking methods `final` for speed buys nothing in HotSpot. `final` is a design decision.",
        },
      ],
    },
    {
      title: "Inheritance in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Two cases I'd expect in any ride-hailing backend: one where inheritance is the right tool, and one where it quietly corrupts a metric.",
        },
        {
          type: "heading",
          text: "The good use: a base class for entities",
        },
        {
          type: "paragraph",
          text: "Every persisted entity (rides, drivers, riders, payments) has an id and creation and update timestamps, and one rule applies to all of them: `updatedAt` never moves backwards, so an old event replayed from a queue can't overwrite newer state. That's state plus an invariant that every subtype shares for its whole life, which is exactly what inheritance is for. In JPA this is a `@MappedSuperclass`; the shape is the same without it:",
        },
        {
          type: "code",
          language: "java",
          title: "BaseEntityDemo.java",
          code: `import java.time.Instant;
import java.util.List;

// In a Spring Data JPA codebase this class would carry @MappedSuperclass,
// and id would carry @Id. Nothing below needs JPA to run.
abstract class BaseEntity {
    private final long id;
    private final Instant createdAt;
    private Instant updatedAt;

    protected BaseEntity(long id, Instant now) {
        this.id = id;
        this.createdAt = now;
        this.updatedAt = now;
    }

    // The one place the "updatedAt never goes backwards" rule lives
    protected final void touch(Instant now) {
        if (now.isBefore(updatedAt)) {
            throw new IllegalArgumentException("stale update for id " + id + ": " + now + " < " + updatedAt);
        }
        updatedAt = now;
    }

    public long getId()           { return id; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

class Ride extends BaseEntity {
    private String status = "REQUESTED";

    Ride(long id, Instant now) { super(id, now); }

    void start(Instant now) {
        touch(now);                                   // check first, then change state
        status = "STARTED";
    }

    @Override
    public String toString() { return "Ride " + getId() + " " + status; }
}

class Driver extends BaseEntity {
    private boolean online;

    Driver(long id, Instant now) { super(id, now); }

    void goOnline(Instant now) {
        touch(now);
        online = true;
    }

    @Override
    public String toString() { return "Driver " + getId() + (online ? " online" : " offline"); }
}

public class BaseEntityDemo {
    // Written once for every entity: it only uses what BaseEntity promises
    static void audit(List<? extends BaseEntity> entities) {
        for (BaseEntity e : entities) {
            System.out.println(e + ", created " + e.getCreatedAt() + ", updated " + e.getUpdatedAt());
        }
    }

    public static void main(String[] args) {
        Instant t0 = Instant.parse("2026-11-04T09:00:00Z");
        Ride ride = new Ride(42, t0);
        Driver driver = new Driver(7, t0);

        driver.goOnline(t0.plusSeconds(60));
        ride.start(t0.plusSeconds(300));
        audit(List.of(ride, driver));

        try {
            ride.start(t0.plusSeconds(120));          // an old event replayed from a queue
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Ride 42 STARTED, created 2026-11-04T09:00:00Z, updated 2026-11-04T09:05:00Z
Driver 7 online, created 2026-11-04T09:00:00Z, updated 2026-11-04T09:01:00Z
rejected: stale update for id 42: 2026-11-04T09:02:00Z < 2026-11-04T09:05:00Z`,
        },
        {
          type: "list",
          items: [
            "`audit` is written once against `BaseEntity` and works for rides and drivers; a `Payment` entity added later costs nothing here. That's substitutability earning its keep.",
            "The invariant lives in one `protected final` method. Subclasses can call `touch` but can't override it, and can't write `updatedAt` directly because it's private. The replayed 09:02 event was rejected for ride 42, and it would be for any entity.",
            "`abstract` only stops anyone creating a bare `BaseEntity` (the Abstraction lesson covers it). With `@MappedSuperclass`, JPA maps these fields into each entity's own table, and the base class gets no table of its own; the Spring Data JPA and Hibernate track goes into the mapping.",
            "What doesn't belong in it: behaviour only some entities need. The day `BaseEntity` grows a `softDelete()` or a `cacheKey()`, it's on its way to becoming the deep `BaseService` hierarchy from the scenario questions.",
          ],
        },
        {
          type: "heading",
          text: "The bad use: a queue subclass that double-counts",
        },
        {
          type: "paragraph",
          text: "The dispatch service keeps ride requests in a `LinkedBlockingQueue`, and the team wants a metric for how many requests entered dispatch. The quickest-looking change is to extend the queue and count in the two methods dispatch calls: `offer` for live requests and `addAll` for the scheduled-rides batch.",
        },
        {
          type: "code",
          language: "java",
          title: "DispatchMetrics.java",
          code: `import java.util.Collection;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicLong;

record RideRequest(long id, String zone) { }

// Before: the queue IS-A LinkedBlockingQueue, with a metric on the two methods dispatch calls
class CountingRequestQueue extends LinkedBlockingQueue<RideRequest> {
    final AtomicLong enqueued = new AtomicLong();          // stands in for a Micrometer Counter

    @Override
    public boolean offer(RideRequest r) {                  // live requests
        enqueued.incrementAndGet();
        return super.offer(r);
    }

    @Override
    public boolean addAll(Collection<? extends RideRequest> batch) {   // scheduled rides
        enqueued.addAndGet(batch.size());
        return super.addAll(batch);
    }
}

// After: the queue HAS-A BlockingQueue and exposes only what dispatch needs
class DispatchQueue {
    private final BlockingQueue<RideRequest> queue = new LinkedBlockingQueue<>();
    private final AtomicLong enqueued = new AtomicLong();

    boolean submit(RideRequest r) {
        boolean accepted = queue.offer(r);
        if (accepted) enqueued.incrementAndGet();
        return accepted;
    }

    void submitAll(List<RideRequest> batch) {
        for (RideRequest r : batch) submit(r);
    }

    RideRequest next() throws InterruptedException { return queue.take(); }
    int size()                                      { return queue.size(); }
    long enqueuedCount()                            { return enqueued.get(); }
}

public class DispatchMetrics {
    public static void main(String[] args) throws InterruptedException {
        List<RideRequest> scheduled = List.of(
            new RideRequest(2, "Pune-East"), new RideRequest(3, "Pune-West"), new RideRequest(4, "Kolkata-North"));

        CountingRequestQueue before = new CountingRequestQueue();
        before.offer(new RideRequest(1, "Kolkata-South"));
        before.addAll(scheduled);
        System.out.println("extends: size = " + before.size() + ", enqueued metric = " + before.enqueued.get());

        DispatchQueue after = new DispatchQueue();
        after.submit(new RideRequest(1, "Kolkata-South"));
        after.submitAll(scheduled);
        System.out.println("has-a:   size = " + after.size() + ", enqueued metric = " + after.enqueuedCount());
        System.out.println("next:    " + after.next());
    }
}`,
        },
        {
          type: "output",
          text: `extends: size = 4, enqueued metric = 7
has-a:   size = 4, enqueued metric = 4
next:    RideRequest[id=1, zone=Kolkata-South]`,
        },
        {
          type: "list",
          items: [
            "Four requests entered the queue and the metric said 7. `LinkedBlockingQueue` inherits `addAll` from `AbstractQueue`, whose loop calls `add`, which calls `offer`, and `offer` is my override. The three-request batch was counted once in `addAll` and again per element. On a dashboard that looks like dispatch load nearly doubling whenever the batch runs, and someone scales up for traffic that doesn't exist.",
            "It's the `InstrumentedHashSet` bug in production clothes, through a different library class. The pattern to recognise: overriding two methods of a class I don't own, where one might call the other.",
            "The subclass also exposed everything else a queue has: `clear()`, `drainTo()`, `remove(Object)`, `iterator()`. Any code could change the queue behind the counter's back. `DispatchQueue` exposes three methods, counts in exactly one place, and reported 4.",
            "The fix didn't need a forwarding class with every `BlockingQueue` method. When callers don't need the wrapper to **be** a queue, a narrow class with domain methods (`submit`, `submitAll`, `next`) is simpler than a full decorator.",
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
              question: "What is inheritance in Java?",
              answer:
                "A way for one class, the subclass, to take over the fields and methods of another, the superclass, with `extends`, and add or change only what's different. It models an is-a relationship: a `Car` is a `Vehicle`.\n\nIt gives code reuse and, more importantly, substitutability: a `Car` can be used anywhere a `Vehicle` is expected. In my `RentalOverride` example a single `rentalCost(int)` in `Vehicle` priced a `Vehicle`, a `Bike` and a `Truck` correctly for 10 days (160.0, 100.0 and 260.0) because each subclass supplied only its own rates.",
            },
            {
              question: "What types of inheritance does Java support?",
              answer:
                "For classes: single (`Car extends Vehicle`), multilevel (`LuxuryCar extends Car`, which extends `Vehicle`) and hierarchical (`Car`, `Bike` and `Truck` all extending `Vehicle`). Multiple and hybrid inheritance exist only through interfaces.\n\nA class has exactly one direct superclass: `class Car extends Vehicle, Tracked` doesn't even parse, and `javac` reports `'{' expected`. A class can implement any number of interfaces, which is multiple inheritance of type without inheriting state.",
            },
            {
              question: "Why doesn't Java support multiple inheritance of classes?",
              answer:
                "To avoid the diamond problem with state and constructors. If `AmphibiousCar` extended both `Car` and `Boat`, which both extend `Vehicle`, it would be unclear whether it has one `fuelLevel` or two, whose `describe()` runs, and who calls `Vehicle`'s constructor and how many times.\n\nC++ answers that with virtual base classes and explicit qualification. Java keeps one superclass, so every object has one constructor chain and one copy of each inherited field, and uses interfaces for being several types at once. Default methods brought a small version of the method question back in Java 8, and the compiler forces a resolution when two defaults clash.",
            },
            {
              question: "What is `super` used for?",
              answer:
                "Three things: `super(...)` calls a superclass constructor at the start of a constructor, `super.method()` calls the superclass's version of an overridden method, and `super.field` reads a superclass field that a subclass field hides.\n\nIn `SuperChain`, each `describe()` called `super.describe()` and appended its part, giving `vehicle WB-02-AB-1234, 4 wheels, 75 kWh battery`. In bytecode, `super.describe()` is `invokespecial Vehicle.describe`, which skips dynamic dispatch, while a normal call is `invokevirtual`.",
            },
            {
              question: "Are constructors inherited?",
              answer:
                "No. Constructors aren't members (JLS 8.2), so they're never inherited. Each class declares its own, and each must call a superclass constructor first, explicitly with `super(...)` or through the `super()` that `javac` inserts.\n\nWith only `Car()` declared, `new Car(4)` failed with `constructor Car in class Car cannot be applied to given types`, although `Vehicle(int)` exists. And a `Bike` with no constructor at all didn't compile, because its default constructor calls `super()` and `Vehicle` only had `Vehicle(int)`.",
            },
            {
              question: "Are private members inherited?",
              answer:
                "Not as members: the subclass can't name them, and `javac` reports `id has private access in Vehicle`. But private fields are physically part of every subclass object, and inherited non-private methods still use them; `tag()` printed `car-7` once it called the inherited `id()` instead.\n\nI measured it: a `Car` whose superclass has a private `long id` is 32 bytes, while a class with only the fields `Car` can see is 24, and `Unsafe.objectFieldOffset` put `id` at offset 16 inside the `Car`.",
            },
            {
              question: "Is `Object` the superclass of every class? What about arrays and interfaces?",
              answer:
                "Every class's superclass chain ends at `java.lang.Object`; a class with no `extends` gets it as its direct superclass, and its constructor starts with `invokespecial java/lang/Object.\"<init>\"`. Arrays have `Object` as their superclass too, and also implement `Cloneable` and `Serializable`. Interfaces have no superclass, though any interface-typed value is still an `Object`.\n\n`getSuperclass()` gave `Car -> Vehicle -> java.lang.Object` and `int[] -> java.lang.Object`, and `null` for `Runnable` and `int`. `javap -v` shows `super_class: java/lang/Object` for a class with no `extends`, which plain `javap` hides.",
            },
            {
              question: "What is method overriding, and what does `@Override` do?",
              answer:
                "Overriding is an instance method in a subclass with the same signature as an inherited one; for subclass objects the new version runs, even when the call comes from superclass code. `@Override` asks the compiler to verify that the method really overrides something.\n\nWithout it, my `Bike` with a typo, `perday()` instead of `perDay()`, compiled and charged 160.0 for a 10-day rental instead of 100.0, because the new method was never called. With `@Override` added, `javac` failed with `method does not override or implement a method from a supertype`.",
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
              question: "In what order do constructors run in a class hierarchy?",
              answer:
                "Calls go up, bodies come down. `new ElectricCar(...)` enters `ElectricCar`'s constructor, whose first action is calling `Car`'s, which calls `Vehicle`'s, which calls `Object`'s; then the bodies finish from the top: `Object`, `Vehicle`, `Car`, `ElectricCar`.\n\n`SuperChain` printed `Vehicle(...) done`, `Car(...) done`, `ElectricCar(...) done` in that order, and `javap -c Car` in Internal Working shows why: `invokespecial Vehicle.\"<init>\"` comes before the `putfield` of `Car`'s own field. Field initializers and instance initializer blocks run right after the super call returns, as the Constructors lesson details.",
            },
            {
              question: "Can static methods be overridden?",
              answer:
                "No. A static method with the same signature in a subclass hides the parent's; static calls are bound at compile time from the declared type and never dispatched on the object.\n\nWith `Vehicle v = new Car()`, `v.category()` printed `vehicle` and `javap` showed `invokestatic Vehicle.category` for it, while `Car.category()` printed `car`. The Static Keyword lesson covers method hiding fully.",
            },
            {
              question: "Can private or final methods be overridden?",
              answer:
                "No to both. A private method isn't inherited, so a same-named method in a subclass is a new, unrelated method. A final method can't be overridden by design.\n\nWhen I tried to override a final `rentalCost(int)`, `javac` reported `rentalCost(int) in Car cannot override rentalCost(int) in Vehicle` and `overridden method is final`. Because neither kind can be overridden, both are safe to call from a constructor, unlike ordinary instance methods.",
            },
            {
              question: "What is field hiding? Are fields polymorphic?",
              answer:
                "Fields aren't polymorphic. A subclass field with the same name as an inherited one adds a second field and hides the first, and which one a name means is decided at compile time from the declared type.\n\nWith `Vehicle v = new Car()`, `v.type` printed `vehicle` while `v.describe()` ran `Car`'s method. `javap` showed `getfield Vehicle.type` for the field and `invokevirtual` for the method, and the object really held both fields.",
            },
            {
              question: "What does a final class mean, and why is `String` final?",
              answer:
                "A final class can't be extended: `class PlateNumber extends String` fails with `cannot inherit from final String`.\n\n`String` is final because its immutability is relied on everywhere: `HashMap` keys, the string pool, class names, file paths that security checks validate. A subclass that changed its content or its `equals` after a check would break all of that. Being final also lets the JDK cache the hash code and HotSpot treat `String` methods as intrinsics.",
            },
            {
              question: "What are sealed classes?",
              answer:
                "A Java 17 feature (JEP 409): a class or interface names exactly which classes may extend it with `permits`, and each permitted subclass must be `final`, `sealed` or `non-sealed`.\n\nAn unlisted subclass fails with `class is not allowed to extend sealed class: Vehicle (as it is not listed in its 'permits' clause)`, and a missing modifier with `sealed, non-sealed or final modifiers expected`. In the class file it's a `PermittedSubclasses` attribute, and the JVM checks it again at load time with an `IncompatibleClassChangeError`.",
            },
            {
              question: "What are upcasting and downcasting?",
              answer:
                "Upcasting converts a subclass reference to a superclass type, `Vehicle v = new Car()`; it's implicit and always safe. Downcasting goes back, `(Car) v`; it needs an explicit cast and is checked at run time.\n\nIn `CastIntro`, casting a `Vehicle` that was really a `Bike` compiled and then threw `ClassCastException: class Bike cannot be cast to class Car`. Through `v` I also couldn't call `openTrunk()`: the declared type limits what can be called, the object decides which override runs.",
            },
            {
              question: "What's the difference between is-a and has-a, and why prefer composition for reuse?",
              answer:
                "is-a is inheritance: the subclass can stand in wherever the superclass is used. has-a is a field: one object holds or uses another, like an `Order` with a `Customer` or a `Car` with an `Engine`. Composition (has-a plus forwarding) is preferred for reuse because it depends only on the other class's public API, not on its internals.\n\n`InstrumentedHashSet extends HashSet` counted 6 for 3 added cities because `HashSet`'s inherited `addAll` calls `add`; `InstrumentedSet`, which holds a `Set` and forwards to it, counted 3.",
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
              question: "How is a subclass object laid out in memory?",
              answer:
                "As one object with one header, then the superclass's fields, then the subclass's. The superclass's layout is kept intact, so its fields have the same offsets in every subclass, and subclass fields go after it or into holes it left.\n\nFor `Car extends Vehicle` on JDK 21: a 12-byte header, `seats` at 12, the private `id` at 16, `doors` at 24 and `plate` at 28, 32 bytes in all. With compressed pointers off, `doors` went into the 4-byte gap at the end of `Vehicle`'s part, and with JDK 25's compact headers the offsets shifted down but the order held.",
            },
            {
              question: "What bytecode does `super.method()` compile to, and how does it differ from a normal call?",
              answer:
                "`invokespecial`, naming the superclass's method, for example `invokespecial Vehicle.describe`. A normal instance call is `invokevirtual`, which selects the implementation by the receiver's run-time class.\n\nIt has to skip dispatch: inside `Car.describe()`, a dispatched call to `describe` would land in `Car.describe()` again and recurse forever. Constructors use `invokespecial` too: `Car`'s begins with `aload_0`, the arguments, then `invokespecial Vehicle.\"<init>\"`.",
            },
            {
              question: "How does the JVM find an inherited method that the subclass doesn't declare?",
              answer:
                "Through method resolution (JVMS 5.4.3.3), done when the call site first runs: look in the named class, then each superclass up to `Object`, then superinterfaces. If nothing matches, it's a `NoSuchMethodError`.\n\n`car.seatsFor(6)` compiled to `invokevirtual Car.seatsFor:(I)I` even though `javap -p Car` lists no `seatsFor`; the JVM found it in `Vehicle`. `javac` names the receiver's static type rather than the declaring class, so the call keeps working if `Car` later overrides the method or it moves up the hierarchy.",
            },
            {
              question: "Why does `InstrumentedHashSet` count wrong, and what does that teach about inheritance?",
              answer:
                "Self-use: `HashSet` inherits `addAll` from `AbstractCollection`, which loops and calls `add` on `this`, and `this` is the subclass, so my overridden `add` counted each element again after my `addAll` had already counted the batch.\n\nThree cities gave `addCount = 6`, and `javap -c java.util.AbstractCollection` shows `aload_0` and `invokevirtual add` in that loop. A subclass depends on the superclass's implementation, not only its API. The wrapper version can't be called back into, and counted 3.",
            },
            {
              question: "What is the fragile base class problem?",
              answer:
                "A superclass change that's harmless on its own can break subclasses that didn't change, because subclasses depend on the superclass's internal behaviour, such as which of its methods call which others.\n\n`ExpressShipping` charged 440.0 for a 20 kg parcel against `BaseShipping` v1. `BaseShipping` v2 added a `surcharge()` hook called from `total()`, my existing helper with the same signature became an override without anyone touching it, and the same parcel cost 590.0. Recompiling with `-Xlint:all` gave no warning.",
            },
            {
              question: "Explain the Liskov Substitution Principle with a violation.",
              answer:
                "Code written against a type must keep working correctly with every subtype: no stronger preconditions, no weaker postconditions, no broken invariants, and no failures the supertype's contract doesn't allow.\n\n`CashPayment extends Payment` threw `UnsupportedOperationException` from `refund()`. A `refundAll(List<Payment>)` batch refunded `pay-101`, crashed on `pay-102` and never reached `pay-103`. Moving `refund()` into a `RefundablePayment` subtype turned the mistake into a compile error.",
            },
            {
              question: "Why shouldn't a constructor call an overridable method?",
              answer:
                "Because the superclass constructor runs before the subclass's fields are assigned, so an override that reads them sees default values, even for `final` fields.\n\n`Shape()` called `describe()`, overridden in `Circle`, and logged `null circle, radius 0.0`; after construction the same call returned `red circle, radius 1.5`. On JDK 25 (JEP 513), assigning the fields before `super()` fixed it, and on JDK 21 `javac -Xlint:this-escape` flags the pattern in public classes of a named package.",
            },
            {
              question: "Do deep class hierarchies cost anything at run time?",
              answer:
                "Little in speed. Field offsets are fixed at class load, so an inherited field is one load at any depth, and the JIT inlines inherited methods that nothing overrides, using class hierarchy analysis. The real costs are memory, because every inherited field is in every instance, and coupling.\n\nIn `ChaDemo`, loading a subclass that overrides `perKg()` made HotSpot log `Failed dependency of type unique_concrete_method_4` and deoptimize code that had assumed a single implementation. And each `Car` paid 8 bytes for a private superclass field it never reads.",
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
              question: "In the dispatch service from the production section, the dashboard shows more queued ride requests than the queue has ever held. The queue class extends `LinkedBlockingQueue` and counts in `offer()` and `addAll()`. What's going on?",
              answer:
                "Self-use in the superclass. `LinkedBlockingQueue` inherits `addAll` from `AbstractQueue`, which calls `add`, which calls `offer`, so every batched request was counted once by my `addAll` and again by my `offer`.\n\nMy `DispatchMetrics` reproduction in the production section queued 4 requests and the metric said 7. I'd replace the subclass with a `DispatchQueue` that holds a `BlockingQueue` and counts in its own `submit` method; it reported 4, and it also stops other code calling `clear()` or `drainTo()` behind the metric's back.",
            },
            {
              question: "After a shared library upgrade, express parcels are overcharged, although nobody touched the express shipping code. How could inheritance cause that?",
              answer:
                "The library's base class probably added a method with the same signature as one in our subclass and started calling it. Our method silently became an override, so the library now calls into our code.\n\nThat's what `BaseShipping` v2 did: its new `surcharge()` hook collided with my `surcharge()` helper, and a 20 kg express parcel went from 440.0 to 590.0. Renaming the helper to `expressFee()` brought it back to 440.0. Longer term I'd hold a shipping calculator instead of extending it, so library internals can't dispatch into our class.",
            },
            {
              question: "A codebase has `BaseService` → `CrudService` → `AuditedCrudService` → `CachedAuditedCrudService` → `OrderService`, and changes to the base keep breaking services. What would you do?",
              answer:
                "Flatten it. Auditing, caching and CRUD aren't a chain of is-a relationships, but inheritance forces them into one line, and every level couples everything below it to its internals. I'd turn each concern into a small collaborator (a repository, an audit log, a cache), inject them into `OrderService` through its constructor, and have it delegate.\n\nIt's the same move as `InstrumentedSet`, which gets its behaviour by holding a `Set` rather than extending `HashSet`, so changes inside the set can't reach it. I'd keep at most one shallow base class for what every entity or service really shares, like the `BaseEntity` in the production section.",
            },
            {
              question: "In the ride-hailing backend from the production section, how would you model Driver, Rider and Admin users?",
              answer:
                "As one `User` with roles and role-specific data in fields, not as `Driver`, `Rider` and `Admin` subclasses. A person can ride and drive, or start driving later, and a Java object can never change its class.\n\nIt's the same decision as `UserRoles` in When to Use: the subclass version forced Asha into two accounts, #101 with 500 in store credit and #102 with 0, while the composition version kept one account with roles `[CUSTOMER, SELLER]` and a `SellerProfile`, and granting `ADMIN` later was one method call. For riders and drivers I'd use a `DriverProfile` the same way, and the shared id and timestamps would still come from the production section's `BaseEntity`.",
            },
            {
              question: "A subclass overrides an inherited method just to throw `UnsupportedOperationException`. What's wrong, and how do you fix it?",
              answer:
                "It's an LSP violation: callers written against the superclass will call the method and fail, and the only workaround is `instanceof` checks in every caller, which defeats the point of the hierarchy.\n\nMy `CashPayment.refund()` stopped a refund batch after one of three payments. The fix is to put the method only where it's true: a `RefundablePayment` subtype (or a `Refundable` interface) for card and UPI payments, so the batch accepts only those and passing a cash payment doesn't compile.",
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
            "Copy `CarLayout` and add `boolean electric;` to `Car` only. Before running, write down the offset you expect for every field and the size of a `Car`.",
            "In `SuperChain`, delete the `super(plate);` line from `Car`'s constructor and compile. Which constructor does the error complain about, and why there?",
            "Rewrite `FieldHiding` with a single `type` field: give `Vehicle` a `Vehicle(String type)` constructor and a no-arg one that calls `this(\"vehicle\")`, delete `Car`'s field, and have `Car()` call `super(\"car\")`. Print `v.type` and `car.parentView()` again.",
            "Delete the `addAll` override from `InstrumentedHashSet` and run it. Then write down why a correct count now is not a real fix.",
            "Put `BaseShipping` v2 next to `ExpressShipping`, rename the subclass's helper from `surcharge()` to `expressFee()` in both places, recompile and run.",
            "Add a `grant(Role role)` method to `User` in `UserRoles`, grant Asha `ADMIN` after she starts selling, and print her again.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: in step 1, `seats` (12), `id` (16) and `doors` (24) don't move, but `electric` lands at 28 and pushes `plate` to 32, so a `Car` grows from 32 to 40 bytes. HotSpot placed the `boolean` before the reference, and one `boolean` cost 8 bytes. Step 2 fails at `SuperChain.java:15` with `constructor Vehicle in class Vehicle cannot be applied to given types` (`required: String`, `found: no arguments`): with the explicit call gone, `javac` inserted `super()` into `Car`'s constructor, and `Vehicle` has no no-arg constructor. Step 3 prints `v.type = car` and `Vehicle.describe() sees type = car`: one field, so every view agrees. Step 4 prints `addCount = 3`, but only because `AbstractCollection.addAll` happens to call `add`; the subclass now silently depends on that. Step 5 prints `Express parcel, 20 kg: 440.0` again, since nothing in the library dispatches into `expressFee()`. Step 6 prints `[CUSTOMER, SELLER, ADMIN]` for the same account, #101, with the store credit still at 500.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `EXTENDS    class Car extends Vehicle      one direct superclass
           no extends → Object; enum → Enum; record → Record
GETS       public + protected members (package-private: same pkg)
NOT        constructors, initializer blocks, private members by name
           (private fields still sit inside every Car: 8 bytes)
STATIC     reachable through Car, one copy, hidden not overridden
SUPER      super(...)  first; calls go up, bodies finish down
           super.m()   invokespecial, no dispatch, no super.super
OVERRIDE   same signature, instance methods only, add @Override
FIELDS     hidden, never overridden: v.type uses the declared type
LAYOUT     header | Vehicle's fields | Car's fields (+ gap filling)
CLASSFILE  super_class = one index; only Object has none
RESOLVE    invokevirtual Car.seatsFor → found in Vehicle
CONTROL    final class, final method, sealed ... permits
           each permitted: final | sealed | non-sealed
CASTS      upcast implicit; bad downcast → ClassCastException
REUSE      library class? wrap it (InstrumentedSet: 3, not 6)
LSP        subtypes keep the supertype's promises, or don't extend`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A subclass object is one object that contains its superclass's state, private fields included, and inherits its behaviour, but not its constructors, and fields and static methods never dispatch on the object.",
            "Inherit for a real is-a that every subclass honours, from code I control or code designed for it. To reuse someone else's class, hold it and forward to it: the double-counting set, the 590.0 express parcel and the queue metric that said 7 for 4 were all caused by superclass code the subclass didn't control.",
            "Inheritance is one relationship between classes. The next lesson, Association, Aggregation and Composition, covers the has-a relationships most of a domain model is made of: who holds a reference to whom, who owns whom, and whose lifetime ends with whose.",
          ],
        },
      ],
    },
  ],
};
