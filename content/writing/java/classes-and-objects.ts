import type { Lesson } from "../types";

export const classesAndObjects: Lesson = {
  slug: "classes-and-objects",
  date: "2026-10-25",
  title: "Classes and Objects",
  description:
    "What a class and an object really are in Java: fields and methods bundled into a type, `new` and reference variables, aliasing and helpful NullPointerExceptions, `this` as local slot 0, identity versus equality, how many objects `new String(\"book\")` creates, and a measured proof that methods are never copied into objects, down to the bytecode and the object header.",
  tags: ["Core Java", "OOP", "Classes", "Objects"],
  sections: [
    {
      title: "What Classes and Objects Are",
      blocks: [
        {
          type: "paragraph",
          text: "Everything I wrote in Phases 1 to 4 had one shape: `static` methods that take loose values and hand back a result. An order total was `total(quantity, unitPrice, discountPercent)`, three numbers that only meant something because I remembered which was which. Nothing held them together, nothing stopped a caller from passing them in the wrong order, and every method that needed \"the order\" needed all three passed in again.",
        },
        {
          type: "code",
          language: "java",
          code: `// Phases 1 to 4: data travels as loose values, behaviour is a static method
static int total(int quantity, int unitPrice, int discountPercent) {
    return quantity * unitPrice * (100 - discountPercent) / 100;
}
int t = total(3, 120, 10);              // which number was the discount again?

// From this phase on: the data and the code that uses it travel together
Order order = new Order("Asha", 3, 120, 10);
int u = order.total();                  // the order knows its own numbers`,
        },
        {
          type: "paragraph",
          text: "A **class** bundles the state (fields) and the behaviour (methods) that belong together, and gives the bundle a name that is also a type. An **object** is one concrete instance of a class at runtime: it has its own copy of the state, it runs the class's methods, and it has an identity that no other object shares. That bundling is what object-oriented programming is built on, and this phase is all about it.",
        },
        {
          type: "paragraph",
          text: "OOP is usually described by four pillars, and each one gets its own lesson in this phase:",
        },
        {
          type: "list",
          items: [
            "**Encapsulation:** keeping an object's state private and changing it only through methods that protect its rules. The Encapsulation lesson.",
            "**Inheritance:** a class extending another one and reusing its fields and methods. The Inheritance lesson.",
            "**Polymorphism:** one method call that does different things depending on the object's actual class. The Polymorphism lesson.",
            "**Abstraction:** exposing what an object does and hiding how it does it. The Abstraction lesson, with the Interfaces lesson for Java's main tool for it.",
          ],
        },
        {
          type: "paragraph",
          text: "This lesson is the floor under all four. What a class and an object are, what `new` and a reference actually do, what `this` is, how identity differs from equality, and, measured on the heap and read from the bytecode, why an object carries only its fields and never its methods. The Methods, Memory Allocation and Stack vs Heap lessons already showed frames, `new` and the heap from the memory side. Here the same machinery shows up from the object side.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Classes and objects are older than Java by almost thirty years. **Simula 67**, designed by Ole-Johan Dahl and Kristen Nygaard at the Norwegian Computing Center in Oslo for writing simulations, introduced the class, the object created from it with `new`, subclasses and virtual procedures. Even the split between a variable and the object it refers to was there: Simula declared references with `ref(...)` and assigned them with a separate operator, `:-`, so copying a reference never looked like copying a value.",
        },
        {
          type: "paragraph",
          text: "**Smalltalk**, built at Xerox PARC through the 1970s by Alan Kay, Dan Ingalls, Adele Goldberg and others, pushed the idea to its end: everything is an object, numbers and classes included, and all computation is objects sending messages to each other. Alan Kay is usually credited with the term \"object-oriented\". Smalltalk-80 was the version that left PARC.",
        },
        {
          type: "paragraph",
          text: "**C++** brought classes to systems programming. Bjarne Stroustrup started \"C with Classes\" at Bell Labs in 1979, borrowing the class concept from Simula, and it was renamed C++ in 1983. A C++ object can live on the stack, in static storage or on the heap, and assigning one object variable to another copies the whole object unless pointers or references are involved.",
        },
        {
          type: "paragraph",
          text: "Java 1.0, released in January 1996, took C++'s syntax and made a set of simpler choices that still define how objects behave today:",
        },
        {
          type: "list",
          items: [
            "**Every object is created with `new` and lives on the heap.** There are no stack objects and no objects embedded by value in other objects.",
            "**A variable of a class type always holds a reference.** Assignment copies the reference, never the object, so two variables can share one object. There's no pointer arithmetic, no address-of operator and no `->`.",
            "**Every class except `Object` has exactly one superclass**, and the chain ends at `java.lang.Object`, so every object has `equals`, `hashCode`, `toString` and `getClass`.",
            "**Fields are always initialized**, to zero, `false` or `null`, before any code sees them, and dereferencing `null` throws `NullPointerException` instead of crashing the process.",
            "**No destructors and no `delete`.** The garbage collector frees objects nobody can reach.",
            "**Every method belongs to a class or interface**, and instance methods are overridable by default, unlike C++, where that takes `virtual`.",
          ],
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "Classes, single inheritance, interfaces, references, GC", "Everything in this lesson"],
            ["Java 1.1 (1997)", "Inner and nested classes, reflection", "Why one source file can produce many `.class` files"],
            ["Java 14 (2020)", "Helpful NullPointerException messages, JEP 358, on by default from Java 15", "NPEs name the exact `null` reference"],
            ["Java 16 (2021)", "Records, JEP 395 (previewed in 14 and 15)", "A short way to write a class that only carries data"],
            ["Java 21 (2023)", "Unnamed classes and instance main methods, JEP 445, preview", "A program without a class declaration"],
            ["Java 25 (2025)", "Compact source files and instance main methods final, JEP 512; compact object headers as a product option, JEP 519", "The implicit class is standard; the object header can shrink from 12 bytes to 8"],
          ],
        },
        {
          type: "paragraph",
          text: "Even Java 25's \"no class needed\" style keeps the rule that everything is a class. This file has no class declaration, a field, and an instance `main`:",
        },
        {
          type: "code",
          language: "java",
          title: "PriceCheck.java",
          code: `int shipping = 40;

int total(int items) {
    return shipping + items * 120;
}

void main() {
    IO.println("total for 3 items: " + total(3));
    IO.println("running in class " + getClass().getName());
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# JDK 25
java PriceCheck.java
javac PriceCheck.java && javap -p PriceCheck`,
        },
        {
          type: "output",
          text: `total for 3 items: 400
running in class PriceCheck
Compiled from "PriceCheck.java"
final class PriceCheck {
  int shipping;
  PriceCheck();
  int total(int);
  void main();
}`,
        },
        {
          type: "paragraph",
          text: "On JDK 25, `javac` wrapped the file in an implicitly declared `final class PriceCheck` with a default constructor, and `shipping` became an ordinary instance field. To call the instance `main`, the launcher created a `PriceCheck` object first. So the newest, most script-like Java is still a class and an object underneath.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The picture I use is an architect's blueprint for a housing society, and the houses built from it.",
        },
        {
          type: "list",
          items: [
            "The **blueprint** is the class. It says every house has a kitchen, two bedrooms and a balcony (the fields), and how things in a house work: how to open the gate, how to switch on the water pump (the methods). Nobody lives in a blueprint.",
            "Each **house** built from it is an object. All of them have the same layout, but one has blue walls and three residents and the next has white walls and one. Same fields, different values.",
            "The **construction crew** is `new`. It builds a house on an empty plot (the heap) and hands back the address.",
            "The **address on a slip of paper** is a reference. I can copy the slip and give it to three people. That doesn't build three houses: all three slips lead to the same one, and if one person repaints it, the others see the new paint. That's aliasing.",
            "A **blank slip** is `null`. Following it leads nowhere, which is what a `NullPointerException` is.",
            "Two houses with the same paint and the same furniture are still **two houses**. That's identity versus equality.",
            "The **blueprint is filed once** at the municipal office, and every house has a plaque saying which blueprint it was built from. That's the class metadata in Metaspace and the class pointer in each object's header. The instructions are not photocopied into every house.",
            "When no slip anywhere carries a house's address, nobody can ever visit it again, and the society eventually **clears the plot**. That's garbage collection.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks down: a real house doesn't run the blueprint's instructions by itself. In Java, the method code always runs **on** one particular object, which arrives as the hidden parameter `this`. A new Java object also starts completely empty, every field zero or `null`, before its constructor fills anything in, while a house is built with its walls. And an address is fixed, but the garbage collector can move objects around the heap and quietly update every reference, which is why a reference is not a raw memory address that a program could print or keep.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "A class: a blueprint and a type",
        },
        {
          type: "code",
          language: "java",
          title: "Order.java",
          code: `public class Order {                          // class declaration
    private final String customer;            // fields: the state of each Order
    private int items;
    private boolean placed;

    public Order(String customer) {           // constructor: runs once per new Order
        this.customer = customer;
    }

    public void place(int items) {            // instance methods: the behaviour
        this.items = items;
        this.placed = true;
    }

    public int total() {
        return 40 + items * 120;              // 40 shipping plus 120 per item
    }

    public static void main(String[] args) {
        Order asha = new Order("Asha");       // two objects from one class
        Order ravi = new Order("Ravi");
        asha.place(3);
        System.out.println(asha.customer + ": " + asha.items + " items, total " + asha.total() + ", placed " + asha.placed);
        System.out.println(ravi.customer + ": " + ravi.items + " items, total " + ravi.total() + ", placed " + ravi.placed);
    }
}`,
        },
        {
          type: "output",
          text: `Asha: 3 items, total 400, placed true
Ravi: 0 items, total 40, placed false`,
        },
        {
          type: "table",
          headers: ["Part", "Example", "What it is"],
          rows: [
            ["Class declaration", "`public class Order`", "Names a new type. `public` makes it usable from other packages (access gets its own lesson in Phase 6)"],
            ["Fields", "`private int items;`", "Variables declared in the class body. Every object gets its own copy (unless the field is `static`, which the Static Keyword lesson covers)"],
            ["Constructor", "`public Order(String customer)`", "Code that runs when an object is created. Same name as the class, no return type. The Constructors lesson owns them"],
            ["Instance methods", "`void place(int items)`", "Behaviour that runs on one particular object, reachable inside as `this`"],
          ],
        },
        {
          type: "paragraph",
          text: "A class is also a **type**. Once `Order` exists, it can be used everywhere a type goes: a local variable `Order order`, a parameter `void ship(Order order)`, a return type `Order find(long id)`, an array `Order[]`, a type argument `List<Order>`. The compiler then checks every use: `order.place(3)` compiles only because `Order` declares a `place(int)`.",
        },
        {
          type: "heading",
          text: "An object: identity, state and behaviour",
        },
        {
          type: "paragraph",
          text: "An object is created at runtime by `new`, on the heap. It has three things. **State**: its own values for every instance field. **Behaviour**: the class's methods, which run with this object as `this`. **Identity**: it is one specific object, distinct from every other, even one with identical field values. The `main` above created two objects from one class and printed both.",
        },
        {
          type: "paragraph",
          text: "`asha.place(3)` changed only Asha's order. Ravi's object still has the values it was created with: `items` is `0` and `placed` is `false`, the defaults every field gets on allocation, which the Memory Allocation lesson traced to the JVM zeroing the memory. Both objects ran the same `total()` code and got different answers, 400 and 40, because the code reads `items` from whichever object it was called on.",
        },
        {
          type: "heading",
          text: "One public class per file, one .class file per class",
        },
        {
          type: "paragraph",
          text: "A source file can declare any number of top-level classes, but at most one of them can be `public`, and that one must be in a file named after it. JLS 7.6 allows a compiler to enforce this when sources live in a file system, and `javac` does:",
        },
        {
          type: "code",
          language: "java",
          title: "Employees.java",
          code: `public class Employee {
    String name;
}`,
        },
        {
          type: "output",
          text: `Employees.java:1: error: class Employee is public, should be declared in a file named Employee.java
public class Employee {
       ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The rule exists so the compiler can find a public class from its name alone: `Employee` must be in `Employee.java`. Going the other way, every class compiles to its own `.class` file, nested and anonymous ones included, so one `.java` file can produce many `.class` files. I list them in the Internal Working section below.",
        },
        {
          type: "heading",
          text: "Instance fields versus local variables",
        },
        {
          type: "table",
          headers: ["", "Instance field", "Local variable"],
          rows: [
            ["Declared", "In the class body, outside any method", "Inside a method, constructor or block, including parameters"],
            ["One per", "Object", "Call of the method"],
            ["Lives in", "The object, on the heap", "The method's frame, on the thread's stack"],
            ["Lifetime", "As long as the object is reachable", "Until the block or method ends"],
            ["Starts as", "`0`, `0.0`, `false`, `'\\u0000'` or `null`", "Nothing: reading it before assigning is a compile error"],
            ["Modifiers", "Access modifiers, `static`, `final`, `transient`, `volatile`", "Only `final`"],
          ],
        },
        {
          type: "paragraph",
          text: "The default values are not a language nicety. They come from `new` zeroing the object's memory, as the Memory Allocation lesson showed with `Defaults.java`, while a frame's slots are not zeroed, so `javac` insists on **definite assignment** for locals instead. The two meet in the most common beginner bug of this phase: a field of a class type quietly starts as `null`.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "What javac writes for a class",
        },
        {
          type: "paragraph",
          text: "I compiled the `Order` class from the anatomy above with `-g`, so the class file keeps local variable names, and read it back with `javap -v -p` (`-p` includes private members):",
        },
        {
          type: "code",
          language: "bash",
          code: "javac -g Order.java && javap -v -p Order",
        },
        {
          type: "output",
          text: `public class Order
  minor version: 0
  major version: 65
  flags: (0x0021) ACC_PUBLIC, ACC_SUPER
  this_class: #8                          // Order
  super_class: #2                         // java/lang/Object
  interfaces: 0, fields: 3, methods: 4, attributes: 3
Constant pool:
   #1 = Methodref          #2.#3          // java/lang/Object."<init>":()V
   #7 = Fieldref           #8.#9          // Order.customer:Ljava/lang/String;
  #13 = Fieldref           #8.#14         // Order.items:I
  #17 = Fieldref           #8.#18         // Order.placed:Z
  #23 = Methodref          #8.#24         // Order."<init>":(Ljava/lang/String;)V
  #28 = Methodref          #8.#29         // Order.place:(I)V
  #38 = Methodref          #8.#39         // Order.total:()I
  ...
{
  private final java.lang.String customer;
    descriptor: Ljava/lang/String;
    flags: (0x0012) ACC_PRIVATE, ACC_FINAL

  private int items;
    descriptor: I
    flags: (0x0002) ACC_PRIVATE

  private boolean placed;
    descriptor: Z
    flags: (0x0002) ACC_PRIVATE

  public Order(java.lang.String);
    descriptor: (Ljava/lang/String;)V
    flags: (0x0001) ACC_PUBLIC
    Code:
      stack=2, locals=2, args_size=2
         0: aload_0
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V
         4: aload_0
         5: aload_1
         6: putfield      #7                  // Field customer:Ljava/lang/String;
         9: return
      ...

  public void place(int);
    descriptor: (I)V
    flags: (0x0001) ACC_PUBLIC
    Code:
      stack=2, locals=2, args_size=2
         0: aload_0
         1: iload_1
         2: putfield      #13                 // Field items:I
         5: aload_0
         6: iconst_1
         7: putfield      #17                 // Field placed:Z
        10: return
      ...
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0      11     0  this   LOrder;
            0      11     1 items   I

  public int total();
    descriptor: ()I
    flags: (0x0001) ACC_PUBLIC
    Code:
      stack=3, locals=1, args_size=1
         0: bipush        40
         2: aload_0
         3: getfield      #13                 // Field items:I
         6: bipush        120
         8: imul
         9: iadd
        10: ireturn
      ...

  public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: (0x0009) ACC_PUBLIC, ACC_STATIC
    Code:
      stack=5, locals=3, args_size=1
         0: new           #8                  // class Order
         3: dup
         4: ldc           #21                 // String Asha
         6: invokespecial #23                 // Method "<init>":(Ljava/lang/String;)V
         9: astore_1
        10: new           #8                  // class Order
        ...
        19: astore_2
        20: aload_1
        21: iconst_3
        22: invokevirtual #28                 // Method place:(I)V
        ...`,
        },
        {
          type: "paragraph",
          text: "Trimmed to the parts about classes and objects, this is what I read from it:",
        },
        {
          type: "list",
          items: [
            "`super_class: #2 // java/lang/Object`. I never wrote `extends`, and the class file names `Object` anyway. The constructor's first instruction after `aload_0` is `invokespecial Object.<init>`, the superclass constructor running before mine, which the Constructors lesson takes apart.",
            "`fields: 3, methods: 4`. The class file holds a table of field declarations and a table of methods: the constructor (`<init>`), `place`, `total` and `main`. A field entry is only a name, a **descriptor** and flags. `Ljava/lang/String;` means a `String` reference, `I` an `int`, `Z` a `boolean`. `0x0012` is `ACC_PRIVATE` (0x0002) plus `ACC_FINAL` (0x0010). No values: values exist only in objects.",
            "Every field access in code goes through a **`Fieldref`** in the constant pool, like `#13 = Fieldref Order.items:I`, and every call through a **`Methodref`**, like `#28 = Methodref Order.place:(I)V`. These are symbolic: class, name and descriptor as text. The JVM resolves each one to a real field offset or method the first time it runs, the lazy resolution from the Class Loading lesson.",
            "`putfield #13` writes `items` and `getfield #13` reads it. Both need an object reference on the operand stack first, and inside an instance method that reference is `aload_0`. Local slot 0 holds `this`.",
            "`place(int)` has `args_size=2`: `this` and `items`. Even `total()`, which has no parameters, has `args_size=1`; that one argument is `this`.",
            "`new #8` allocates the object, `dup` keeps a second copy of the reference, `ldc` pushes `\"Asha\"`, and `invokespecial #23` runs the constructor on the already-allocated object. One line of Java, two separate steps, exactly as the Memory Allocation lesson showed. The second `new` at offset 10 does the same for Ravi, using the same `#8` and `#23`.",
          ],
        },
        {
          type: "heading",
          text: "this is local 0, and the receiver goes first",
        },
        {
          type: "paragraph",
          text: "The local variable table under `place` names the slots: `this` is a real local variable of type `Order` in slot 0, filled in by the caller like any parameter, and `items` is slot 1. Look back at `main` for the other side of it: `aload_1` pushes `asha`, `iconst_3` pushes the argument, and only then `invokevirtual #28` makes the call. The **receiver is pushed first**, so it lands in the callee's slot 0 and the arguments follow it from slot 1. `this.items = items` is therefore no magic: `aload_0` is the object, `iload_1` is the parameter, `putfield` writes one into the other.",
        },
        {
          type: "heading",
          text: "From the object to its class: the class pointer",
        },
        {
          type: "paragraph",
          text: "The class file says what an `Order` looks like. At runtime, each `Order` object is a block of heap memory that starts with a header: an 8-byte **mark word** and, with compressed class pointers (the default), a 4-byte **class pointer**. I wanted to see that class pointer, so I read the first bytes of real objects with `sun.misc.Unsafe`, the same internal API the Memory Allocation lesson used for field offsets:",
        },
        {
          type: "code",
          language: "java",
          title: "HeaderPeek.java",
          code: `import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class HeaderPeek {
    static class Order {
        String customer;
        int items;
        boolean placed;

        Order(String customer) { this.customer = customer; }
        void place(int items) { this.items = items; this.placed = true; }
        int total() { return 40 + items * 120; }
    }

    static class Customer {
        String name;
        int points;
    }

    public static void main(String[] args) throws Exception {
        Field f = Unsafe.class.getDeclaredField("theUnsafe");
        f.setAccessible(true);
        Unsafe u = (Unsafe) f.get(null);

        for (String name : new String[] {"items", "placed", "customer"}) {
            System.out.println("Order." + name + " at offset " + u.objectFieldOffset(Order.class.getDeclaredField(name)));
        }

        Order asha = new Order("Asha");
        Order same = asha;                                 // a second reference, no new object
        Order ravi = new Order("Ravi");
        Order meera = new Order("Meera");
        asha.place(3);
        meera.place(2);

        String[] names = { "asha", "same", "ravi", "meera", "customer" };
        Object[] refs = { asha, same, ravi, meera, new Customer() };
        for (int i = 0; i < refs.length; i++) {
            int classPointer = u.getInt(refs[i], 8L);      // 4 bytes right after the 8-byte mark word
            System.out.printf("%-9s%-9sclass pointer 0x%08x%n",
                names[i], refs[i].getClass().getSimpleName(), classPointer);
        }
        System.out.println("asha == same: " + (asha == same));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac HeaderPeek.java && java HeaderPeek",
        },
        {
          type: "output",
          text: `Order.items at offset 12
Order.placed at offset 16
Order.customer at offset 20
asha     Order    class pointer 0x01000a08
same     Order    class pointer 0x01000a08
ravi     Order    class pointer 0x01000a08
meera    Order    class pointer 0x01000a08
customer Customer class pointer 0x01000c28
asha == same: true`,
        },
        {
          type: "list",
          items: [
            "Fields start at offset 12, right after the 12-byte header, and the JVM chose the order: `items` at 12, `placed` at 16, `customer` at 20. That's 24 bytes per `Order` with the 4-byte compressed reference. Field layout is decided once per class, when it's loaded.",
            "Every `Order` carries the **same** class pointer, and the `Customer` carries a different one. The value is a compressed 32-bit pointer that the JVM decodes to the address of the class's metadata in Metaspace (in HotSpot, its `InstanceKlass`, where the field layout, the method table and each method's bytecode hang off). The exact numbers are from my machine and could differ on another JVM build. They didn't change between runs here.",
            "`javac` printed four warnings that `Unsafe` is internal proprietary API, which is fair. I'd never use it outside an experiment like this one.",
          ],
        },
        {
          type: "paragraph",
          text: "That class pointer is the whole link between an object and its methods. When `invokevirtual` runs `asha.place(3)`, the JVM takes the receiver, follows its class pointer to the class metadata, and finds the code there. Which class's code, when subclasses override methods, is the Polymorphism lesson's subject. For this lesson, the important consequence is that the object itself holds nothing but its header and its field values. The picture below is drawn from this exact run.",
        },
        {
          type: "image",
          src: "/images/java/classes-and-objects-one-class-many-objects.svg",
          alt: "The main frame on the stack holds four references: asha and same both point to Order object 1, ravi points to Order object 2, meera to Order object 3. Each 24-byte Order object on the heap holds a header with class pointer 0x01000a08 and its own items, placed and customer values at offsets 12, 16 and 20. All three class pointers lead to one class Order entry in Metaspace that holds the field layout and the method code for Order(String), place(int) and total().",
          caption: "Objects hold field values and a class pointer. The field layout and the method code exist once, in the class metadata.",
        },
        {
          type: "heading",
          text: "One source file, many class files",
        },
        {
          type: "paragraph",
          text: "Since every class compiles to its own `.class` file, a source file with nested types produces a small crowd of them. I put one of each kind in a single file:",
        },
        {
          type: "code",
          language: "java",
          title: "Shop.java",
          code: `import java.util.function.IntSupplier;

public class Shop {
    static class Shelf { }                         // static nested class
    class Cart { }                                 // inner class
    record Price(int amount) { }                   // nested record
    enum Status { PLACED, SHIPPED }                // nested enum
    interface Notifier { void send(String msg); }  // nested interface

    void checkout() {
        class Attempt { }                          // local class
        Notifier email = new Notifier() {          // anonymous class
            public void send(String msg) { System.out.println("Email: " + msg); }
        };
        IntSupplier days = () -> 4;                // lambda
        email.send(new Attempt().getClass().getName() + ", delivery in " + days.getAsInt() + " days");
    }

    public static void main(String[] args) {
        new Shop().checkout();
    }
}

class ReturnPolicy { }                             // a second top-level class, not public`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Shop.java && ls -1 *.class
java Shop
java -Xlog:class+load Shop | grep -oE "(Shop|ReturnPolicy)\\S* source: \\w+"`,
        },
        {
          type: "output",
          text: `ReturnPolicy.class
Shop$1Attempt.class
Shop$1.class
Shop$Cart.class
Shop$Notifier.class
Shop$Price.class
Shop$Shelf.class
Shop$Status.class
Shop.class

Email: Shop$1Attempt, delivery in 4 days

Shop source: file
Shop$Notifier source: file
Shop$1 source: file
Shop$$Lambda/0x00007d7434001000 source: Shop
Shop$1Attempt source: file`,
        },
        {
          type: "list",
          items: [
            "Nine class files from one source file. Nested types are named `Outer$Inner`, anonymous classes `Outer$1`, `Outer$2` in order, and local classes get a number too, `Outer$1Attempt`, because two methods could each declare a local class called `Attempt`. The Nested and Inner Classes lesson covers each kind.",
            "The lambda produced **no** class file. Its class was generated at runtime, as the `Shop$$Lambda/0x...` hidden class in the load log (that address-like suffix differs every run).",
            "`Shelf`, `Cart`, `Price`, `Status` and `ReturnPolicy` were never loaded at all, because nothing used them. Classes load on first use, one `.class` file at a time.",
          ],
        },
      ],
    },
    {
      title: "References: Declaring, Sharing and null",
      blocks: [
        {
          type: "heading",
          text: "Declaring a variable creates no object",
        },
        {
          type: "paragraph",
          text: "`Order order;` and `new Order(\"Asha\")` are two different things. The first is a **declaration**: it reserves a variable that can hold a reference to an `Order`. The second is an **instantiation**: it creates the object and produces a reference to it. Only `new` creates objects. For a local variable, using it before anything is assigned doesn't even compile:",
        },
        {
          type: "code",
          language: "java",
          title: "Uninit.java",
          code: `public class Uninit {
    static class Order {
        int items;
    }

    public static void main(String[] args) {
        Order order;                   // declared, but no object yet
        System.out.println(order.items);
    }
}`,
        },
        {
          type: "output",
          text: `Uninit.java:8: error: variable order might not have been initialized
        System.out.println(order.items);
                           ^
1 error`,
        },
        {
          type: "paragraph",
          text: "That's definite assignment again. The same declaration as a **field**, `Order current;` inside some class, compiles fine and quietly holds `null` until something assigns it, so the mistake moves from compile time to runtime.",
        },
        {
          type: "heading",
          text: "Several references, one object",
        },
        {
          type: "paragraph",
          text: "Assigning one reference variable to another copies the reference, the same way passing it to a method does (the Methods lesson). Both variables then point at one object, and a change made through either is visible through both. That's **aliasing**. Reassigning one of them, or setting it to `null`, moves only that one arrow and never touches the object. The first example below traces all three steps with a diagram, and the production section shows what aliasing costs in a real domain model.",
        },
        {
          type: "heading",
          text: "null and the NullPointerException",
        },
        {
          type: "paragraph",
          text: "`null` is the reference that refers to no object. Any field read or method call through it fails, because there is no object to read from or to pass as `this`:",
        },
        {
          type: "code",
          language: "java",
          title: "NullOrder.java",
          code: `public class NullOrder {
    static class Order {
        int items = 3;
        int total() { return 40 + items * 120; }
    }

    public static void main(String[] args) {
        Order order = null;                    // a reference variable that refers to nothing
        System.out.println("before the call");
        System.out.println(order.total());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac NullOrder.java && java NullOrder
javac -g NullOrder.java && java NullOrder`,
        },
        {
          type: "output",
          text: `before the call
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "NullOrder$Order.total()" because "<local1>" is null
\tat NullOrder.main(NullOrder.java:10)

# compiled with -g
before the call
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "NullOrder$Order.total()" because "order" is null
\tat NullOrder.main(NullOrder.java:10)`,
        },
        {
          type: "list",
          items: [
            "This is the **helpful NullPointerException** message (JEP 358, on by default since Java 15). The JVM works out from the bytecode which reference was `null`. Without debug info it can only say `<local1>`, slot 1 of `main`'s frame. With `-g`, it has the local variable table and says `\"order\"`. Maven and Gradle compile with debug info by default, so real services usually get the names.",
            "The trace has one frame, `main`, line 10. `total()` never started: the `invokevirtual` checked its receiver, found `null`, and threw before any frame for `total` existed. That's also why `this` can never be `null` inside a method, which comes up again below.",
            "`NullOrder$Order` is how the nested class's name looks to the JVM, the same `$` naming as the class files above.",
          ],
        },
        {
          type: "heading",
          text: "An array of objects is an array of references",
        },
        {
          type: "paragraph",
          text: "`new Employee[3]` creates **one** object, an array with three slots, and every slot holds `null`. It creates zero `Employee`s. The classic NPE follows from forgetting that:",
        },
        {
          type: "code",
          language: "java",
          title: "TeamRoster.java",
          code: `import java.util.Arrays;

public class TeamRoster {
    static class Employee {
        String name;
        Employee(String name) { this.name = name; }
    }

    public static void main(String[] args) {
        Employee[] team = new Employee[3];         // one array object, three null references, zero Employees
        System.out.println(Arrays.toString(team));
        team[0] = new Employee("Asha");
        team[2] = new Employee("Ravi");            // slot 1 was never filled
        for (int i = 0; i < team.length; i++) {
            System.out.println(team[i].name.toUpperCase());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac TeamRoster.java && java TeamRoster
javac -g TeamRoster.java && java TeamRoster`,
        },
        {
          type: "output",
          text: `[null, null, null]
ASHA
Exception in thread "main" java.lang.NullPointerException: Cannot read field "name" because "<local1>[<local2>]" is null
\tat TeamRoster.main(TeamRoster.java:15)

# compiled with -g
[null, null, null]
ASHA
Exception in thread "main" java.lang.NullPointerException: Cannot read field "name" because "team[i]" is null
\tat TeamRoster.main(TeamRoster.java:15)`,
        },
        {
          type: "paragraph",
          text: "`Arrays.toString` printed the truth before anything failed: three `null`s. Slot 1 was never filled, so on the second iteration `team[i]` is `null` and reading `.name` through it throws. With `-g` the message even shows the expression, `team[i]`. An `int[]` would have held zeros; an array of a class type holds references, and the default reference is `null`. The fix is to fill every slot before use, or to skip and report empty ones, or better, to use a `List` and only add real employees.",
        },
      ],
    },
    {
      title: "Instance Methods and this",
      blocks: [
        {
          type: "paragraph",
          text: "An instance method always runs on one object, the **receiver**: in `employee.moveTo(\"Pune\")`, the receiver is whatever `employee` refers to. Inside the method, that object is `this`. Most of the time it's implicit: a plain `office` inside an `Employee` method means `this.office`. It becomes visible in three situations, all in one program:",
        },
        {
          type: "code",
          language: "java",
          title: "ThisDemo.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class ThisDemo {
    static class Team {
        private final List<String> members = new ArrayList<>();

        void register(Employee employee) {
            members.add(employee.name);
        }
    }

    static class Employee {
        private final String name;
        private String office = "none";

        Employee(String name) {
            this.name = name;                  // this.name is the field, name is the parameter
        }

        Employee moveTo(String office) {
            this.office = office;
            return this;                       // hand back the same object, so calls can chain
        }

        Employee join(Team team) {
            team.register(this);               // pass this object to another object
            return this;
        }

        String describe() {
            return name + " in " + office;     // plain name means this.name here
        }
    }

    public static void main(String[] args) {
        Team team = new Team();
        Employee ravi = new Employee("Ravi").moveTo("Pune").join(team);
        Employee asha = new Employee("Asha").join(team);
        System.out.println(ravi.describe());
        System.out.println(asha.describe());
        System.out.println("team: " + team.members);
    }
}`,
        },
        {
          type: "output",
          text: `Ravi in Pune
Asha in none
team: [Ravi, Asha]`,
        },
        {
          type: "list",
          items: [
            "**Resolving shadowing.** In the constructor and in `moveTo`, the parameter has the same name as the field, and inside the method the nearer declaration wins. `office` alone means the parameter, `this.office` means the field. Without `this.`, the assignment would copy the parameter onto itself, a mistake I show in Common Mistakes.",
            "**Returning `this`.** `moveTo` and `join` return the object they were called on, so `new Employee(\"Ravi\").moveTo(...).join(...)` is three calls on one object. That's a fluent API, the style of `StringBuilder.append` and of most builders.",
            "**Passing `this`.** `team.register(this)` hands the current object to another object, which can then call methods on it or read what it's allowed to. A real team class would keep the `Employee` reference itself; this one only records the name. Asha never called `moveTo`, so her office is still the initializer value, `\"none\"`.",
          ],
        },
        {
          type: "heading",
          text: "No this in a static context",
        },
        {
          type: "paragraph",
          text: "A `static` method belongs to the class and runs with no receiver at all, so it has no slot 0 to put `this` in. `main` is static, which is why it can't touch instance members directly:",
        },
        {
          type: "code",
          language: "java",
          title: "StaticThis.java",
          code: `public class StaticThis {
    int items = 3;

    int total() {
        return 40 + items * 120;
    }

    public static void main(String[] args) {
        System.out.println(this.items);
        System.out.println(total());
    }
}`,
        },
        {
          type: "output",
          text: `StaticThis.java:9: error: non-static variable this cannot be referenced from a static context
        System.out.println(this.items);
                           ^
StaticThis.java:10: error: non-static method total() cannot be referenced from a static context
        System.out.println(total());
                           ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "The second error is the one beginners hit most: calling an instance method from `main` as if it were a function. The question the compiler is really asking is \"total of **which** order?\". The fix is to create an object and call the method on it: `new StaticThis().total()`, or, in a real program, to move the logic into a class that `main` instantiates. The Static Keyword lesson covers static in full.",
        },
        {
          type: "heading",
          text: "this can't be reassigned, and it's never null",
        },
        {
          type: "code",
          language: "java",
          title: "ThisAssign.java",
          code: `public class ThisAssign {
    int items;

    void reset() {
        this = new ThisAssign();
    }
}`,
        },
        {
          type: "output",
          text: `ThisAssign.java:5: error: cannot assign to 'this'
        this = new ThisAssign();
        ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`this` is not a variable I declared. It's the receiver the caller passed in, and the language makes it read-only: an object can change its own fields, but it can't turn itself into a different object. It's also never `null`. The only way to run an instance method is to call it on a reference, and `invokevirtual` throws the `NullPointerException` at the call site, before the method starts, when that reference is `null`, as the `NullOrder` trace showed. So a check like `if (this == null)` is dead code.",
        },
      ],
    },
    {
      title: "Methods Are Not Copied Into Objects",
      blocks: [
        {
          type: "paragraph",
          text: "A common mental model is that every object carries its own copy of its class's methods. It doesn't, and I wanted proof rather than a diagram. Using the allocation counter from the Memory Allocation lesson, I measured two classes with the same two fields, one with no methods and one with thirty:",
        },
        {
          type: "code",
          language: "java",
          title: "MethodsNotCopied.java",
          code: `import java.lang.management.ManagementFactory;

public class MethodsNotCopied {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;                       // keeps each object reachable, so it is really allocated

    static class Lean {                       // two fields, no methods
        int count;
        String name;
    }

    static class Busy {                       // the same two fields, thirty methods
        int count;
        String name;
        int m01() { return count + 1; }  int m02() { return count + 2; }  int m03() { return count + 3; }
        int m04() { return count + 4; }  int m05() { return count + 5; }  int m06() { return count + 6; }
        int m07() { return count + 7; }  int m08() { return count + 8; }  int m09() { return count + 9; }
        int m10() { return count + 10; } int m11() { return count + 11; } int m12() { return count + 12; }
        int m13() { return count + 13; } int m14() { return count + 14; } int m15() { return count + 15; }
        int m16() { return count + 16; } int m17() { return count + 17; } int m18() { return count + 18; }
        int m19() { return count + 19; } int m20() { return count + 20; } int m21() { return count + 21; }
        int m22() { return count + 22; } int m23() { return count + 23; } int m24() { return count + 24; }
        int m25() { return count + 25; } int m26() { return count + 26; } int m27() { return count + 27; }
        int m28() { return count + 28; } int m29() { return count + 29; } int m30() { return count + 30; }
    }

    static long bytes(boolean busy) {
        long id = Thread.currentThread().threadId();
        long before = MX.getThreadAllocatedBytes(id);
        sink = busy ? new Busy() : new Lean();
        return MX.getThreadAllocatedBytes(id) - before;
    }

    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) { bytes(false); bytes(true); }   // load both classes first
        System.out.println("Lean: " + Lean.class.getDeclaredMethods().length + " methods, "
            + bytes(false) + " bytes per object");
        System.out.println("Busy: " + Busy.class.getDeclaredMethods().length + " methods, "
            + bytes(true) + " bytes per object");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac MethodsNotCopied.java && java MethodsNotCopied
wc -c 'MethodsNotCopied$Lean.class' 'MethodsNotCopied$Busy.class'`,
        },
        {
          type: "output",
          text: `Lean: 0 methods, 24 bytes per object
Busy: 30 methods, 24 bytes per object
 346 MethodsNotCopied$Lean.class
1917 MethodsNotCopied$Busy.class
2263 total`,
        },
        {
          type: "list",
          items: [
            "Both objects are **24 bytes**: 12 bytes of header, 4 for `count`, 4 for the compressed `name` reference. Thirty methods added nothing. The result was identical on every run, and the same with `-Xint`, so it isn't a JIT effect.",
            "The methods did cost something, once: `Busy.class` is 1,917 bytes against 346 for `Lean.class`. When the class loads, its parsed form, bytecode included, lives in Metaspace, paid **per class**, not per object. A million `Busy` objects would still be 24 MB of objects.",
            "The warm-up loop matters. When I measured the very first `new Lean()` and `new Busy()` before anything else had touched the two classes, they came out at 2,960 and 5,576 bytes, because those calls also loaded the classes, which allocates the `Class` object and other objects on the heap. The first run of anything measures class loading, not the thing itself.",
          ],
        },
        {
          type: "paragraph",
          text: "The reason is what the bytecode showed earlier. Method code doesn't need a copy per object because it never contains any object's data: it reads and writes fields through `this`, which arrives as a parameter. One copy of `total()` serves every `Order` that will ever exist, the same way one copy of `Math.max` serves every pair of numbers. Only **instance fields** are per object, and they are exactly what the 24 bytes hold.",
        },
        {
          type: "callout",
          tone: "note",
          title: "What an object does not contain",
          text: "No methods, no constructor, no `static` fields (those belong to the class), no field names or types (those are in the class metadata, the object only has values at fixed offsets) and no other objects: a field of class type is a reference (4 bytes with compressed oops), never an embedded object.",
        },
      ],
    },
    {
      title: "Identity, Equality and getClass",
      blocks: [
        {
          type: "paragraph",
          text: "Every object has an **identity**: it's one specific object, and `==` on two references asks exactly one question, \"do these point to the same object?\". Whether two objects are **equal**, meaning they represent the same value, is a separate question that the class itself has to answer by overriding `equals`. A class that doesn't override it inherits `Object.equals`, which is just `==`:",
        },
        {
          type: "code",
          language: "java",
          title: "Identity.java",
          code: `public class Identity {
    static void show(String label, Object value) {
        System.out.printf("%-36s %s%n", label, value);
    }

    public static void main(String[] args) {
        Employee a = new Employee("Asha", 50000);
        Employee b = new Employee("Asha", 50000);   // same field values, separate object
        Employee c = a;                             // same object, second reference

        show("a == b", a == b);
        show("a == c", a == c);
        show("a.equals(b)", a.equals(b));
        show("a.equals(c)", a.equals(c));
        show("a", a);
        show("identity hash of a, in hex", Integer.toHexString(System.identityHashCode(a)));

        show("a.getClass() == b.getClass()", a.getClass() == b.getClass());
        show("a.getClass() == Employee.class", a.getClass() == Employee.class);

        Employee boss = new Manager("Ravi", 90000);
        show("boss instanceof Employee", boss instanceof Employee);
        show("boss.getClass() == Employee.class", boss.getClass() == Employee.class);
        show("boss.getClass().getName()", boss.getClass().getName());
    }
}

class Employee {
    String name;
    int salary;

    Employee(String name, int salary) {
        this.name = name;
        this.salary = salary;
    }
}

class Manager extends Employee {                    // a subclass: the Inheritance lesson's topic
    Manager(String name, int salary) {
        super(name, salary);
    }
}`,
        },
        {
          type: "output",
          text: `a == b                               false
a == c                               true
a.equals(b)                          false
a.equals(c)                          true
a                                    Employee@7ea987ac
identity hash of a, in hex           7ea987ac
a.getClass() == b.getClass()         true
a.getClass() == Employee.class       true
boss instanceof Employee             true
boss.getClass() == Employee.class    false
boss.getClass().getName()            Manager`,
        },
        {
          type: "list",
          items: [
            "`a` and `b` have identical fields and are still different objects, so `a == b` is `false`, and so is `a.equals(b)`: `Employee` doesn't override `equals`, and `Object.equals` is identity. A class that should compare by value, like a money amount, has to say so. The Object Class Methods lesson owns `equals` and `hashCode` and how to write them correctly; records, previewed below, generate them.",
            "Printing `a` called the inherited `Object.toString`, which is the class name, `@`, and the **identity hash code** in hex. The next line proves it: the same `7ea987ac`. The hash itself varies between machines and runs.",
            "`getClass()` returns the object's runtime class as a `java.lang.Class` object, and there is one `Class` object per loaded class, so `a.getClass() == b.getClass()` is `true` and `== Employee.class` works too. The precise rule is one per class **per class loader**: the Class Loading lesson showed two loaders defining two different `Class` objects for the same `.class` file.",
            "`getClass()` and `instanceof` answer different questions. `instanceof Employee` is true for an `Employee` or any subclass of it, so for the `Manager` it's `true`. `getClass() == Employee.class` demands the exact class and says `false`. Most code wants `instanceof`; the exact check matters mostly inside `equals` implementations.",
            "The source file has three top-level classes and only one is `public`. That's legal, and it's why the output says `Employee@...` instead of `Identity$Employee@...`.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "The hash in Employee@7ea987ac is not an address",
          text: "Plenty of tutorials say the default `toString` prints the object's memory address. To check, I read a fresh object's 8-byte mark word with `Unsafe` before and after calling `System.identityHashCode` on JDK 21. Before, it was `0x0000000000000001`, the plain unlocked pattern. After, it was `0x0000005cad808601`: the hash `0x5cad8086` had been written into bits 8 to 38, and `toString` printed `@5cad8086`. So the identity hash is a number HotSpot generates on first request (by default from a per-thread pseudo-random generator) and stores in the header, which is why it survives the GC moving the object. On JDK 25 the same experiment found it in bits 11 to 41 instead, so the position is an implementation detail; the idea is not.",
        },
      ],
    },
    {
      title: "How Many Objects Does new String(\"book\") Create?",
      blocks: [
        {
          type: "paragraph",
          text: "The classic interview answer is \"two: one in the string pool and one on the heap\". I wanted to count rather than recite, so I measured each step with the allocation counter, running each piece of code twice:",
        },
        {
          type: "code",
          language: "java",
          title: "HowManyObjects.java",
          code: `import java.lang.management.ManagementFactory;

public class HowManyObjects {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;                                  // keeps each result reachable

    static void run(int step) {
        switch (step) {
            case 0 -> sink = "warm-up";                  // only used to warm up this path
            case 1 -> sink = "book";                     // just the literal: an ldc instruction
            case 2 -> sink = new String("book");         // the literal, then new String(...)
            case 3 -> sink = new String(new char[] {'b', 'o', 'o', 'k'});
        }
    }

    static long bytes(int step) {
        long id = Thread.currentThread().threadId();
        long before = MX.getThreadAllocatedBytes(id);
        run(step);
        return MX.getThreadAllocatedBytes(id) - before;
    }

    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) bytes(0);            // the measuring code allocates nothing after this
        System.out.println("\\"book\\", first time it runs     " + bytes(1) + " bytes");
        System.out.println("\\"book\\", second time            " + bytes(1) + " bytes");
        System.out.println("new String(\\"book\\")             " + bytes(2) + " bytes");
        System.out.println("new String(\\"book\\") again       " + bytes(2) + " bytes");
        System.out.println("new String(char[] {...})       " + bytes(3) + " bytes");
        System.out.println("new String(\\"book\\") == \\"book\\"   " + (new String("book") == "book"));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac HowManyObjects.java && java HowManyObjects`,
        },
        {
          type: "output",
          text: `"book", first time it runs     48 bytes
"book", second time            0 bytes
new String("book")             24 bytes
new String("book") again       24 bytes
new String(char[] {...})       72 bytes
new String("book") == "book"   false`,
        },
        {
          type: "list",
          items: [
            "**The literal costs 48 bytes once.** The first time the `ldc \"book\"` instruction ran, the JVM resolved the constant: it created a `String` (24 bytes) and its `byte[]` holding the four Latin-1 bytes (16 + 4, rounded to 24), and interned it. Every later run returned that pooled object and allocated nothing.",
            "**`new String(\"book\")` costs 24 bytes every time.** That's exactly one `String` object. No array was allocated, so the new string can't have copied the text.",
            "**The `char[]` version costs 72 bytes:** the `char[]` (24), a fresh `byte[]` the constructor compresses the text into (24), and the `String` (24). That's what a string with its own copy of the data costs.",
            "The results were the same with `-Xint` and on JDK 25, so it isn't the JIT optimizing anything away.",
          ],
        },
        {
          type: "paragraph",
          text: "The missing array is explained by the constructor itself. I disassembled `String(String)` from JDK 21's own `java.base`:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p java.lang.String | grep -A20 "public java.lang.String(java.lang.String);"`,
        },
        {
          type: "output",
          text: `  public java.lang.String(java.lang.String);
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: aload_0
       5: aload_1
       6: getfield      #9                  // Field value:[B
       9: putfield      #9                  // Field value:[B
      ...
      36: return`,
        },
        {
          type: "paragraph",
          text: "The same `aload_0`, `getfield`, `putfield` pattern as my `Order` constructor: it copies the **reference** to the literal's `byte[] value`, and the elided lines repeat the pattern for the three small fields `coder`, `hash` and `hashIsZero`. Since strings are immutable, sharing the array is safe. So the precise answer is:",
        },
        {
          type: "list",
          items: [
            "**Each execution** of `new String(\"book\")` creates exactly **one** object, the new `String`.",
            "**The first execution** in a JVM where no equal string was interned yet also causes the literal to be created and pooled: one more `String` plus its `byte[]`. That happens once per JVM, not once per execution.",
            "What \"two objects\" gets right: two distinct `String` objects are involved, the pooled one and the new one, which is why `new String(\"book\") == \"book\"` is `false`. What it gets wrong: it counts the literal as if it were created every time, it ignores the `byte[]` objects, and it implies the text is copied, when the new `String` shares the pooled one's array.",
          ],
        },
        {
          type: "paragraph",
          text: "And the practical answer: `new String(\"...\")` with a literal is never needed. It spends 24 bytes to produce a second object with the same immutable value.",
        },
      ],
    },
    {
      title: "The Life of an Object",
      blocks: [
        {
          type: "paragraph",
          text: "An object's life has four stages. It's **created** by `new`: memory reserved in the thread's TLAB, zeroed, header written, constructor run. It's **used** for as long as at least one reference to it is reachable from a GC root: a local in some live frame, a static field, or a field of another reachable object. It becomes **unreachable** the moment the last such path disappears, because a frame was popped, a variable was reassigned or an object holding it became unreachable itself. Nothing happens to it at that moment. It's **collected** later, when a garbage collection runs over its part of the heap and finds no path to it. There's no destructor and no `delete`. The Stack vs Heap lesson's `Lifetime` example showed it with two objects created the same way: the one a local in `main` still referenced survived a GC, and the one held only by a weak reference was cleared.",
        },
      ],
    },
    {
      title: "Designing Classes",
      blocks: [
        {
          type: "paragraph",
          text: "Knowing the syntax doesn't say which classes to write. The approach I use is to read the requirement out loud and listen for the nouns and the verbs: \"A **customer** places an **order** for some **products**. Each line of the order, an **order item**, records the product, the quantity and the unit price. When the order is placed, its **total** is computed and charged through a **payment processor**, and each product's stock goes down.\"",
        },
        {
          type: "table",
          headers: ["Word in the requirement", "Becomes", "Holds", "Does"],
          rows: [
            ["order", "class `Order`", "customer, items, status, total", "`addItem(product, qty)`, `place()`, `cancel(reason)`"],
            ["customer", "class `Customer`", "name, email, address", "`changeAddress(address)`"],
            ["product", "class `Product`", "name, price, stock", "`reserve(qty)`"],
            ["order item", "small class or record `OrderItem`", "product, quantity, unit price", "`subtotal()`"],
            ["total", "a value (a number, or a small `Money` type with currency)", "amount", "nothing much"],
            ["payment processor", "interface `PaymentProcessor` (a service)", "its connection settings", "`charge(customer, amount)`"],
          ],
        },
        {
          type: "paragraph",
          text: "Two rules turn that table into good classes rather than just many classes:",
        },
        {
          type: "list",
          items: [
            "**Behaviour lives next to the data it uses.** `place()` belongs on `Order`, because it reads and changes the order's own items, status and total. If an order's status can only change inside `Order`, then only `Order` has to get the rules right: no placing an order twice, no placing an empty one. A class like that is a **rich** domain class. The opposite, an **anemic** class with a getter and a setter per field and all the rules in services around it, compiles just as well but lets any caller put the object into any state. The production section has both versions running.",
            "**Cohesion.** Everything in a class should be about the one thing the class is named after. An `Order` that also formats emails and parses CSV files has three reasons to change. When I can't describe a class without the word \"and\", or its fields split into groups that different methods use, it's two classes.",
          ],
        },
        {
          type: "paragraph",
          text: "Some of those nouns are not really entities. A `Money` amount or an `Address` has no identity worth tracking: two amounts of 400 rupees are interchangeable. For those, Java 16 added **records**, a compact way to declare a class that only carries data. The Encapsulation lesson covers them properly; this is just a preview of how little code they take:",
        },
        {
          type: "code",
          language: "java",
          title: "MoneyPreview.java",
          code: `public class MoneyPreview {
    record Money(int amount, String currency) { }

    public static void main(String[] args) {
        Money m1 = new Money(400, "INR");
        Money m2 = new Money(400, "INR");
        System.out.println(m1);
        System.out.println((m1 == m2) + " " + m1.equals(m2) + " " + m1.amount());
    }
}`,
        },
        {
          type: "output",
          text: `Money[amount=400, currency=INR]
false true 400`,
        },
        {
          type: "paragraph",
          text: "One line declared a class with two `private final` fields, a constructor, accessors, and a value-based `equals`, `hashCode` and `toString`. Note the second line: `m1 == m2` is still `false`, because they're two objects. A record changes what **equality** means, not identity.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `Order.java` from the anatomy, from `javac` to the last line of output:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time.** `javac Order.java` checks that the public class `Order` is in `Order.java`, then writes `Order.class`: three field entries (name, descriptor, flags), four methods with their bytecode, and a constant pool of symbolic references.",
            "For `new Order(\"Asha\")`, `javac` picks the constructor `<init>:(Ljava/lang/String;)V` and emits `new`, `dup`, `ldc \"Asha\"`, `invokespecial`, then `astore_1` for the variable `asha`. Ravi's line gets the same instructions, ending in `astore_2`.",
            "For `asha.place(3)`, it checks that the declared type of `asha`, `Order`, has a `place(int)` (otherwise: `cannot find symbol`) and emits `aload_1`, `iconst_3`, `invokevirtual Order.place:(I)V`.",
            "**Run time.** `java Order` has the application class loader load `Order.class`. Its metadata (field layout, method code, constant pool) goes into Metaspace, its `Class` object onto the heap, and `main` starts with `args` in slot 0.",
            "`new` reserves 24 bytes in the thread's TLAB, zeroes them (`customer` is `null`, `items` is `0`, `placed` is `false`) and writes the header, including the class pointer to `Order`'s metadata.",
            "`invokespecial` runs the constructor in a new frame with the new object as `this` in slot 0 and `\"Asha\"` in slot 1. It calls `Object`'s constructor, then `putfield customer`. Back in `main`, `astore_1` stores the reference in `asha`. Ravi's object goes through the same steps into slot 2.",
            "`aload_1`, `iconst_3`, `invokevirtual`: receiver first, argument second. The JVM checks the receiver isn't `null`, follows its class pointer to find `place`, and pushes a frame with `this` in slot 0 and `items = 3` in slot 1.",
            "`place` runs `aload_0, iload_1, putfield items` and `aload_0, iconst_1, putfield placed`: two writes into Asha's object, at offsets 12 and 16. Ravi's object is never touched. `return` pops the frame.",
            "The `println` lines call `total()` on each object. The same bytecode reads `items` with `getfield` from whichever object is `this`, so it returns `400` for Asha and `40` for Ravi.",
            "`main` returns, and its frame, with `asha` and `ravi` in it, is gone. Nothing references the two `Order`s anymore, so they're garbage, collected whenever a GC next covers their region (here the JVM simply exits first). `Order`'s metadata stays as long as its class loader does.",
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
          title: "ClassSyntax.java",
          code: `public class ClassSyntax {
    static class Order {
        private final String customer;           // field, assigned once in the constructor
        private int items;                       // field, default 0
        private String status = "NEW";           // field with an initializer

        Order(String customer) {                 // constructor (next lesson)
            this.customer = customer;
        }

        Order place(int items) {                 // instance method returning this
            this.items = items;
            this.status = "PLACED";
            return this;
        }

        int total() {                            // instance method reading fields
            return 40 + items * 120;
        }

        String status() {
            return status;
        }
    }

    public static void main(String[] args) {
        Order a;                                 // declaration only: no object yet
        a = new Order("Asha");                   // instantiation: object on the heap
        var b = new Order("Ravi");               // var: the type Order is inferred
        Order c = a;                             // a second reference to the same object
        Order none = null;                       // a reference to nothing

        a.place(3);                              // call through one reference...
        System.out.println(c.total() + " " + c.status());   // ...visible through the other

        System.out.println(new Order("Meera").place(2).total());  // create, use, discard

        Order[] orders = { a, b, new Order("Kabir") };        // array of references
        Order[] empty = new Order[2];                         // two nulls
        System.out.println(orders.length + " " + empty[0] + " " + (none == null));

        System.out.println((a == c) + " " + (a == b) + " " + (a.getClass() == b.getClass()));
        System.out.println(a instanceof Order);
    }
}`,
        },
        {
          type: "output",
          text: `400 PLACED
280
3 null true
true false true
true`,
        },
        {
          type: "paragraph",
          text: "`new Order(\"Meera\").place(2).total()` is an object nobody keeps a reference to: created, used for one chain of calls, and garbage on the next line. That's completely normal Java, and for small objects like this the JIT's escape analysis can often avoid the heap allocation entirely, as the Memory Allocation lesson measured.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Two references, then one, then none",
        },
        {
          type: "paragraph",
          text: "Aliasing, reassignment and `null`, one step at a time, with a bank account because a balance that changes behind my back is the clearest kind of surprise:",
        },
        {
          type: "code",
          language: "java",
          title: "Aliasing.java",
          code: `public class Aliasing {
    static class BankAccount {
        String owner;
        int balance;

        BankAccount(String owner, int balance) {
            this.owner = owner;
            this.balance = balance;
        }

        String describe() {
            return owner + "/" + balance;
        }
    }

    public static void main(String[] args) {
        BankAccount first = new BankAccount("Asha", 1000);
        BankAccount second = first;             // copies the reference, not the object
        second.balance = 300;                   // one object, so first sees it too
        System.out.println("1: first=" + first.describe() + " second=" + second.describe()
            + " same=" + (first == second));

        second = new BankAccount("Ravi", 500);  // repoints second; first is untouched
        System.out.println("2: first=" + first.describe() + " second=" + second.describe()
            + " same=" + (first == second));

        first = null;                           // the Asha account now has no references
        System.out.println("3: first=" + first + " second=" + second.describe());
    }
}`,
        },
        {
          type: "output",
          text: `1: first=Asha/300 second=Asha/300 same=true
2: first=Asha/300 second=Ravi/500 same=false
3: first=null second=Ravi/500`,
        },
        {
          type: "diagram",
          text: `after step 1:  second = first;  second.balance = 300;

  main frame               heap
 ┌──────────────┐        ┌─────────────────────────┐
 │ first   ●────┼──┬────►│ BankAccount{Asha, 300}  │
 │ second  ●────┼──┘     └─────────────────────────┘
 └──────────────┘

after step 3:  second = new BankAccount("Ravi", 500);  first = null;

 ┌──────────────┐        ┌─────────────────────────┐
 │ first   null │        │ BankAccount{Asha, 300}  │ ◄ no references
 │ second  ●────┼──┐     └─────────────────────────┘   left: garbage
 └──────────────┘  │     ┌─────────────────────────┐
                   └────►│ BankAccount{Ravi, 500}  │
                         └─────────────────────────┘`,
          caption: "Assignment copies arrows, never boxes. Changing a box is visible through every arrow; moving an arrow changes nothing else.",
        },
        {
          type: "list",
          items: [
            "Step 1: `second = first` created no `BankAccount`. Writing `second.balance` changed the only object there is, so `first.balance` reads 300.",
            "Step 2: reassigning `second` moved one arrow. The Asha object didn't change and `first` still points at it.",
            "Step 3: `first = null` didn't destroy anything either. It removed the last reference to the Asha account, which made that object unreachable, so the garbage collector can take it whenever it next runs.",
          ],
        },
        {
          type: "heading",
          text: "Passing an object to a method",
        },
        {
          type: "paragraph",
          text: "The Methods lesson showed pass-by-value with arrays. With objects it's the same rule, and it explains both lines of this output:",
        },
        {
          type: "code",
          language: "java",
          title: "PassAccount.java",
          code: `public class PassAccount {
    static class BankAccount {
        String owner;
        int balance;

        BankAccount(String owner, int balance) {
            this.owner = owner;
            this.balance = balance;
        }
    }

    static void addInterest(BankAccount account) {
        account.balance = account.balance * 105 / 100;     // changes the caller's object
    }

    static void replace(BankAccount account) {
        account = new BankAccount("Someone else", 999);    // changes only this method's copy of the reference
        account.balance = 0;
    }

    public static void main(String[] args) {
        BankAccount account = new BankAccount("Asha", 1000);
        addInterest(account);
        System.out.println(account.owner + " " + account.balance);
        replace(account);
        System.out.println(account.owner + " " + account.balance);
    }
}`,
        },
        {
          type: "output",
          text: `Asha 1050
Asha 1050`,
        },
        {
          type: "paragraph",
          text: "`addInterest` reached Asha's account through its copy of the reference and changed the balance to 1050, which `main` sees. `replace` pointed its own copy at a new object, so everything after that line happened to an object `main` never knew about, which became garbage when `replace` returned.",
        },
        {
          type: "heading",
          text: "Private means private to the class, not to the object",
        },
        {
          type: "paragraph",
          text: "A method of `Rectangle` can read the private fields of **another** `Rectangle`. Access control in Java is checked per class, at compile time, not per object:",
        },
        {
          type: "code",
          language: "java",
          title: "SameSize.java",
          code: `public class SameSize {
    public static void main(String[] args) {
        Rectangle a = new Rectangle("door", 90, 210);
        Rectangle b = new Rectangle("poster", 90, 210);
        Rectangle c = new Rectangle("window", 120, 150);

        System.out.println(a.sameSizeAs(b) + " " + a.sameSizeAs(c) + " " + (a == b));
        System.out.println(a.compareWith(b));
        System.out.println(a.compareWith(c));
    }
}

class Rectangle {
    private final String name;
    private final int width;
    private final int height;

    Rectangle(String name, int width, int height) {
        this.name = name;
        this.width = width;
        this.height = height;
    }

    boolean sameSizeAs(Rectangle other) {
        return width == other.width && height == other.height;   // other's private fields: same class, allowed
    }

    String compareWith(Rectangle other) {
        if (!sameSizeAs(other)) {
            return name + " and " + other.name + " differ: " + width + "x" + height
                + " vs " + other.width + "x" + other.height;
        }
        return name + " and " + other.name + " are both " + width + "x" + height;
    }
}`,
        },
        {
          type: "output",
          text: `true false false
door and poster are both 90x210
door and window differ: 90x210 vs 120x150`,
        },
        {
          type: "paragraph",
          text: "`sameSizeAs` reads `other.width` without any getter, because the code is inside `Rectangle`. From `main`, which is in another class, the same `a.width` doesn't compile: `width has private access in Rectangle`. So the comparison logic lives with the data, and the door and the poster compare equal by size while still being two objects (`a == b` is `false`). This is also the reason `equals` methods can compare private fields of the other object directly.",
        },
        {
          type: "heading",
          text: "A copied list still shares its objects",
        },
        {
          type: "paragraph",
          text: "Collections hold references, exactly like arrays. Copying a list copies the references:",
        },
        {
          type: "code",
          language: "java",
          title: "ShallowSnapshot.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class ShallowSnapshot {
    static class Product {
        String name;
        int price;

        Product(String name, int price) {
            this.name = name;
            this.price = price;
        }

        @Override
        public String toString() {               // overriding toString is the Object Class Methods lesson's topic
            return name + "/" + price;
        }
    }

    public static void main(String[] args) {
        List<Product> cart = new ArrayList<>();
        cart.add(new Product("Pen", 20));
        cart.add(new Product("Notebook", 60));

        List<Product> snapshot = List.copyOf(cart);  // a new list holding the same references

        cart.get(0).price = 25;                      // change an object both lists point to
        cart.remove(1);                              // change the structure of one list only

        System.out.println("cart     " + cart);
        System.out.println("snapshot " + snapshot);
        System.out.println("same Pen object? " + (cart.get(0) == snapshot.get(0)));
    }
}`,
        },
        {
          type: "output",
          text: `cart     [Pen/25]
snapshot [Pen/25, Notebook/60]
same Pen object? true`,
        },
        {
          type: "paragraph",
          text: "`List.copyOf` made a second, unmodifiable list, so removing the notebook from `cart` didn't touch the snapshot. But both lists point at the same `Product` objects, so the pen's new price of 25 shows up in the \"snapshot\" too. That's a **shallow** copy. A real point-in-time snapshot of mutable objects needs copies of the objects themselves, or objects that can't change. The Collections Utilities and Immutable Collections lesson has the list side of this; the Encapsulation lesson has the object side.",
        },
      ],
    },
    {
      title: "When to Use a Class (and When Not To)",
      blocks: [
        {
          type: "paragraph",
          text: "In Java everything ends up inside some class, so the real question is narrower: when does a piece of data deserve its own class, with objects that own state and behaviour, and when is something else the better fit? This is how I decide, consistent with the When to Use What in Java OOP lesson that collects these decisions for the whole phase:",
        },
        {
          type: "table",
          headers: ["What I have", "Reach for", "Example"],
          rows: [
            ["Data plus rules about how it may change, and an identity that lasts (a lifecycle)", "A class with private fields and methods that enforce the rules; one object per real thing", "`Order`, `BankAccount`, `Employee`"],
            ["A value defined entirely by its data, not changed after creation", "A record (the Encapsulation lesson)", "`Money`, `Address`, `Point`"],
            ["A fixed, known set of values", "An enum (later in this track)", "order status, T-shirt size"],
            ["A calculation that needs no state", "A static method (the Static Keyword lesson)", "interest on an amount, distance between two points"],
            ["A service with dependencies but no per-request state", "A class with one shared instance, usually a Spring bean", "`OrderService`, `PaymentService`"],
            ["Several interchangeable behaviours", "An interface (the Interfaces lesson)", "`PaymentProcessor` with UPI and card implementations"],
            ["Data from outside whose shape I don't control", "A `Map` or `JsonNode` only at the edge, converted to a class right away", "a partner's webhook payload"],
          ],
        },
        {
          type: "diagram",
          text: `Does it have state that belongs together?
 ├─ no ──► static method (stateless helper)
 └─ yes ─► Is it only a value, compared by its data?
            ├─ yes ─► record            (Money, Address)
            └─ no ──► Is the set of values fixed and known?
                       ├─ yes ─► enum   (OrderStatus)
                       └─ no ──► class with private fields and
                                 methods that guard its rules
                                 (Order, BankAccount)`,
          caption: "The first questions I ask before writing a new type.",
        },
        {
          type: "list",
          items: [
            "If the same two or three values keep travelling together through parameter lists (`quantity`, `unitPrice`, `discountPercent`), they want to be one object.",
            "If a method mostly reads another object's getters to compute something about it, the method belongs in that other class.",
            "If a class has no fields, it doesn't need instances. Creating `new PriceCalculator()` just to call one stateless method is ceremony.",
            "Per-request data lives in objects created per request, or in locals, never in fields of a shared singleton. The Stack vs Heap lesson's production example got about 8% of its results wrong from exactly that.",
            "A domain concept never becomes a `Map<String, Object>`. The keys turn into strings the compiler can't check.",
          ],
        },
        {
          type: "heading",
          text: "Wrong choice: an order as a Map",
        },
        {
          type: "paragraph",
          text: "That last rule is the wrong choice I'd watch for in code that grew out of JSON handling. An order kept as a map, with one typo in a key:",
        },
        {
          type: "code",
          language: "java",
          title: "MapOrder.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class MapOrder {
    static int total(Map<String, Object> order) {
        int items = (Integer) order.get("itemCount");   // string key, cast, unboxing
        return 40 + items * 120;
    }

    public static void main(String[] args) {
        Map<String, Object> order = new HashMap<>();
        order.put("customer", "Asha");
        order.put("itemcount", 3);                      // lowercase c: a different key
        System.out.println("built an order with " + order.size() + " entries");
        System.out.println(total(order));
    }
}`,
        },
        {
          type: "output",
          text: `built an order with 2 entries
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because the return value of "java.util.Map.get(Object)" is null
\tat MapOrder.total(MapOrder.java:6)
\tat MapOrder.main(MapOrder.java:15)`,
        },
        {
          type: "heading",
          text: "Right choice: an order as a class",
        },
        {
          type: "paragraph",
          text: "It compiled, it ran, and it failed only when the total was computed, far from the line with the typo. The same mistake in a class is caught before the program exists:",
        },
        {
          type: "code",
          language: "java",
          title: "TypedOrder.java",
          code: `public class TypedOrder {
    static class Order {
        final String customer;
        final int itemCount;

        Order(String customer, int itemCount) {
            this.customer = customer;
            this.itemCount = itemCount;
        }

        int total() {
            return 40 + itemcount * 120;               // the same typo as in MapOrder
        }
    }

    public static void main(String[] args) {
        System.out.println(new Order("Asha", 3).total());
    }
}`,
        },
        {
          type: "output",
          text: `TypedOrder.java:12: error: cannot find symbol
            return 40 + itemcount * 120;               // the same typo as in MapOrder
                        ^
  symbol:   variable itemcount
  location: class Order
1 error`,
        },
        {
          type: "paragraph",
          text: "With the typo fixed it prints `400`. The class also documents itself: a reader sees exactly which fields an order has and what types they are, the IDE can rename `itemCount` everywhere at once, and every caller gets completion instead of guessing key names. The map version gives up all of that to save one small class.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Forgetting this. when a parameter shadows a field",
        },
        {
          type: "code",
          language: "java",
          title: "ShadowedItems.java",
          code: `public class ShadowedItems {
    static class Order {
        int items;

        Order(int items) {
            items = items;           // assigns the parameter to itself; the field stays 0
        }

        int total() {
            return 40 + items * 120;
        }
    }

    public static void main(String[] args) {
        System.out.println(new Order(3).total());
    }
}`,
        },
        {
          type: "output",
          text: "40",
        },
        {
          type: "paragraph",
          text: "Inside the constructor, `items` means the parameter, on both sides. The field was never assigned, kept its default `0`, and the total came out as the shipping charge alone. `javac` compiled it without a single warning, even with `-Xlint:all`. The fix is `this.items = items;`. IDE inspections usually flag an assignment of a variable to itself, which is one more reason to read their warnings.",
        },
        {
          type: "heading",
          text: "Making per-object data static",
        },
        {
          type: "code",
          language: "java",
          title: "SharedCustomer.java",
          code: `public class SharedCustomer {
    static class Order {
        static String customer;      // static: ONE variable for the whole class, not one per Order
        int items;

        Order(String customer, int items) {
            Order.customer = customer;
            this.items = items;
        }
    }

    public static void main(String[] args) {
        Order first = new Order("Asha", 3);
        Order second = new Order("Ravi", 5);
        System.out.println(first.customer + " " + first.items + ", " + second.customer + " " + second.items);
    }
}`,
        },
        {
          type: "output",
          text: "Ravi 3, Ravi 5",
        },
        {
          type: "paragraph",
          text: "`items` is an instance field, so each order kept its own. `customer` is `static`, so there's only one, stored with the class, and the second constructor overwrote the first order's customer. `first.customer` compiles because Java allows reaching a static field through a reference, which hides the bug: plain `javac` said nothing, and only `-Xlint:static` warned `static variable should be qualified by type name, Order, instead of by an expression`. State that describes one object is an instance field.",
        },
        {
          type: "heading",
          text: "The others, already shown above",
        },
        {
          type: "list",
          items: [
            "**Using a reference before `new`.** A local gives `variable order might not have been initialized` (`Uninit`); a field compiles and holds `null` until it throws.",
            "**Assuming `new Employee[3]` creates employees.** It creates three `null` slots: `Cannot read field \"name\" because \"team[i]\" is null` (`TeamRoster`).",
            "**Calling an instance method from `main` directly.** `non-static method total() cannot be referenced from a static context` (`StaticThis`). Create the object first.",
            "**Expecting assignment to copy the object.** `second = first` shares one object (`Aliasing`), and `List.copyOf` shares every element (`ShallowSnapshot`).",
            "**Comparing objects with `==` to mean \"same data\".** Two employees with identical fields gave `a == b` `false`, and so did `equals` until the class defines it (`Identity`).",
            "**Naming the file differently from its public class.** `class Employee is public, should be declared in a file named Employee.java` (`Employees`).",
            "**Writing `new String(\"...\")`.** 24 bytes per call for a duplicate of an immutable value (`HowManyObjects`).",
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
            "Name classes after nouns from the domain (`Order`, `BankAccount`) and methods after what they do (`place`, `withdraw`). A class name ending in `Manager`, `Helper` or `Util` usually means its behaviour was never given a proper home.",
            "Keep behaviour next to the data it changes. `order.place()` that enforces the rules beats a setter per field and the rules scattered across services.",
            "Make fields `private`, and `final` wherever the value never changes after construction. The Encapsulation lesson covers the why in full.",
            "Create objects fully initialized, so nothing ever sees a half-built `Order`. The Constructors lesson is about exactly that.",
            "Don't share a mutable object between owners that don't know about each other. Copy it at the boundary, or make it immutable so sharing is safe.",
            "Use `equals` to compare values, and give value-like classes a proper `equals` and `hashCode` (or make them records). Keep `==` for \"is this the same object\".",
            "Prefer a `List` of real objects over an array with `null` slots for domain collections.",
            "Keep debug info in compiled classes (`-g`, the Maven and Gradle default) so production NPE messages name the variable instead of `<local1>`.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Every number here was measured in this lesson on JDK 21 with the defaults (compressed oops and class pointers, G1), except where it says JDK 25:",
        },
        {
          type: "table",
          headers: ["Fact", "Measured", "What it means"],
          rows: [
            ["Object header", "12 bytes: 8 mark word + 4 class pointer; first field at offset 12", "Every object pays it, even one with no fields"],
            ["An `Order` with an `int`, a `boolean` and a reference", "24 bytes", "Fields only, rounded up to a multiple of 8"],
            ["Thirty extra methods", "0 bytes per object; 1,571 more bytes of class file, once", "Split code into as many methods as reads well"],
            ["`-XX:-UseCompressedOops`, what a heap over about 32 GB gets", "`Lean` still 24 bytes; `HeaderPeek`'s `Order` 32, with `customer` moved to offset 24", "Every reference field doubles to 8 bytes"],
            ["Compressed oops and class pointers both off", "32 bytes for `Lean`", "The header grows to 16 bytes too"],
            ["JDK 25, `-XX:+UseCompactObjectHeaders`", "16 bytes for `Lean`; the three-field `Order` stays 24", "An 8-byte header; whether that saves memory depends on the fields"],
            ["`new String(\"book\")`", "24 bytes per call; the literal, 48 bytes once", "Never needed"],
          ],
        },
        {
          type: "code",
          language: "bash",
          code: `# JDK 21
java -XX:-UseCompressedOops MethodsNotCopied
java -XX:-UseCompressedOops -XX:-UseCompressedClassPointers MethodsNotCopied
# JDK 25
java MethodsNotCopied
java -XX:+UseCompactObjectHeaders MethodsNotCopied`,
        },
        {
          type: "output",
          text: `Lean: 0 methods, 24 bytes per object
Busy: 30 methods, 24 bytes per object

Lean: 0 methods, 32 bytes per object
Busy: 30 methods, 32 bytes per object

Lean: 0 methods, 24 bytes per object
Busy: 30 methods, 24 bytes per object

Lean: 0 methods, 16 bytes per object
Busy: 30 methods, 16 bytes per object`,
        },
        {
          type: "list",
          items: [
            "Past about 32 GB of heap the JVM can't use compressed oops, but class pointers stay compressed. For `Lean` that changed nothing visible: 12 + 4 + an 8-byte reference is exactly 24. `HeaderPeek`'s three-field `Order` did grow, from 24 to 32 bytes, because with `-XX:-UseCompressedOops` its reference moved to offset 24. I also started both programs with a real `-Xmx40g`: `-XX:+PrintFlagsFinal` showed `UseCompressedOops` off by default and `UseCompressedClassPointers` still on, with the same sizes. Whether an object grows depends on how its fields pack, which is why the Memory Allocation lesson warned about crossing 32 GB.",
            "Turning both compressions off made the header 16 bytes as well: 16 + 4 + 8 = 28, rounded to 32.",
            "JDK 25 still defaults to the 12-byte header, so its first run matched JDK 21. Compact object headers (JEP 519) fold the class pointer into the mark word, and in JDK 25 they're a supported option that has to be switched on. For a cache holding a million `Lean`-shaped objects, that's 24 MB down to 16 MB. It isn't automatic, though: a three-field `Order` (`int`, `boolean`, reference) measured 24 bytes on JDK 25 with and without the flag, because 8 + 4 + 1 + 4 = 17 still rounds up to 24.",
            "The method count never mattered in any configuration. Calls to instance methods are cheap too: a call site that only ever sees one class gets inlined by the JIT, as the Methods lesson saw with `-XX:+PrintInlining`. Call sites that see many classes are the Polymorphism lesson's subject.",
            "Creating objects is cheap (a TLAB pointer bump); keeping many of them alive is what costs, in memory per object times the number of objects, and in GC work. The sizes above follow from the layout rules, while the class pointer and hash values printed earlier are specific to my machine and run.",
          ],
        },
      ],
    },
    {
      title: "Classes and Objects in Production",
      blocks: [
        {
          type: "paragraph",
          text: "The object-level bug I'd most expect in a ride-hailing domain model is aliasing. Airport pickups use saved points: the `Location` for \"CCU Gate 1\" is created once at startup and reused for every airport booking. When a rider drags the pickup pin, the code takes the ride's pickup and moves it. Here's a reproduction, with Jackson rendering the rides the way the rides API would return them:",
        },
        {
          type: "code",
          language: "java",
          title: "SharedPickup.java",
          code: `import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;

public class SharedPickup {
    // A mutable location: anyone holding a reference can move it
    public static class Location {
        private final String label;
        private double lat;
        private double lng;

        public Location(String label, double lat, double lng) {
            this.label = label;
            this.lat = lat;
            this.lng = lng;
        }

        public void moveTo(double lat, double lng) {
            this.lat = lat;
            this.lng = lng;
        }

        public String getLabel() { return label; }
        public double getLat() { return lat; }
        public double getLng() { return lng; }
    }

    public static class Ride {
        private final String id;
        private final String rider;
        private final Location pickup;      // final: this reference can't change, but the Location can

        public Ride(String id, String rider, Location pickup) {
            this.id = id;
            this.rider = rider;
            this.pickup = pickup;           // stores the caller's reference, no copy
        }

        public String getId() { return id; }
        public String getRider() { return rider; }
        public Location getPickup() { return pickup; }
    }

    // A saved pickup point, created once at startup and reused for every airport booking
    static final Location AIRPORT_GATE_1 = new Location("CCU Gate 1", 22.6547, 88.4467);

    public static void main(String[] args) throws Exception {
        Ride asha = new Ride("R-101", "Asha", AIRPORT_GATE_1);
        Ride ravi = new Ride("R-102", "Ravi", AIRPORT_GATE_1);

        asha.getPickup().moveTo(22.6559, 88.4474);   // Asha drags her pin to the arrivals exit

        ObjectMapper json = new ObjectMapper();
        for (Ride ride : List.of(asha, ravi)) {
            System.out.println(json.writeValueAsString(ride));       // what the rides API returns
        }
        System.out.println("same Location object? " + (asha.getPickup() == ravi.getPickup()));
        System.out.println("saved preset now: " + AIRPORT_GATE_1.getLat() + ", " + AIRPORT_GATE_1.getLng());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# Maven: com.fasterxml.jackson.core:jackson-databind:2.21.7
# $JACKSON holds the jackson-databind, jackson-core and jackson-annotations jars
javac -cp "$JACKSON" SharedPickup.java
java -cp "$JACKSON:." SharedPickup`,
        },
        {
          type: "output",
          text: `{"id":"R-101","rider":"Asha","pickup":{"label":"CCU Gate 1","lat":22.6559,"lng":88.4474}}
{"id":"R-102","rider":"Ravi","pickup":{"label":"CCU Gate 1","lat":22.6559,"lng":88.4474}}
same Location object? true
saved preset now: 22.6559, 88.4474`,
        },
        {
          type: "list",
          items: [
            "Asha moved her pin, and Ravi's pickup moved with it, because both rides hold a reference to the one `AIRPORT_GATE_1` object. Ravi's driver would now be routed to the arrivals exit. No exception, no log line, and the JSON looks perfectly valid.",
            "Worse, the saved preset itself moved. Every airport ride booked after this starts at the wrong place until the service restarts.",
            "`final` didn't help. `private final Location pickup` stops the field from pointing at a different object; it says nothing about changes inside the object it points to.",
            "No single line is wrong. The design hands one mutable object to several owners. The fix is either that each owner gets its own copy, or that the object can't change.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix I'd choose makes `Location` immutable, as a record, so moving a pickup means pointing this ride at a **new** `Location`. Sharing the preset then becomes safe, because nobody can change it:",
        },
        {
          type: "code",
          language: "java",
          title: "SharedPickupFixed.java",
          code: `import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;

public class SharedPickupFixed {
    // Immutable: no setters, no moveTo. "Moving" creates a new Location.
    public record Location(String label, double lat, double lng) {
        Location movedTo(double newLat, double newLng) {
            return new Location(label, newLat, newLng);
        }
    }

    public static class Ride {
        private final String id;
        private final String rider;
        private Location pickup;            // not final: the ride can switch to a new Location

        public Ride(String id, String rider, Location pickup) {
            this.id = id;
            this.rider = rider;
            this.pickup = pickup;           // sharing is safe now: nobody can change it
        }

        public void movePickup(double lat, double lng) {
            this.pickup = pickup.movedTo(lat, lng);      // a new object, for this ride only
        }

        public String getId() { return id; }
        public String getRider() { return rider; }
        public Location getPickup() { return pickup; }
    }

    static final Location AIRPORT_GATE_1 = new Location("CCU Gate 1", 22.6547, 88.4467);

    public static void main(String[] args) throws Exception {
        Ride asha = new Ride("R-101", "Asha", AIRPORT_GATE_1);
        Ride ravi = new Ride("R-102", "Ravi", AIRPORT_GATE_1);

        asha.movePickup(22.6559, 88.4474);

        ObjectMapper json = new ObjectMapper();
        for (Ride ride : List.of(asha, ravi)) {
            System.out.println(json.writeValueAsString(ride));
        }
        System.out.println("same Location object? " + (asha.getPickup() == ravi.getPickup()));
        System.out.println("saved preset now: " + AIRPORT_GATE_1.lat() + ", " + AIRPORT_GATE_1.lng());
    }
}`,
        },
        {
          type: "output",
          text: `{"id":"R-101","rider":"Asha","pickup":{"label":"CCU Gate 1","lat":22.6559,"lng":88.4474}}
{"id":"R-102","rider":"Ravi","pickup":{"label":"CCU Gate 1","lat":22.6547,"lng":88.4467}}
same Location object? false
saved preset now: 22.6547, 88.4467`,
        },
        {
          type: "list",
          items: [
            "Only Asha's ride points at the new location. Ravi's still points at the preset, and the preset kept its coordinates.",
            "Jackson serialized the record through its accessors (`label()`, `lat()`, `lng()`), so the JSON has the same shape as before and API clients see no difference.",
            "The smaller fix, if `Location` had to stay mutable, is copying on the way in: `this.pickup = new Location(pickup.getLabel(), pickup.getLat(), pickup.getLng());` in the `Ride` constructor. I ran that variant too, and Ravi's pickup stayed at 22.6547, 88.4467. It works, but every future constructor and setter has to remember to copy, while an immutable class can't get it wrong. The Encapsulation lesson covers both techniques properly.",
          ],
        },
        {
          type: "heading",
          text: "Rich versus anemic, running",
        },
        {
          type: "paragraph",
          text: "The second production problem is where the behaviour lives. The same ride rules, written twice: once as an anemic `RideRecord` with a getter and a setter per field and the logic in services, once as a rich `Ride` whose `complete(km)` computes the fare and changes the status together:",
        },
        {
          type: "code",
          language: "java",
          title: "RideCompletion.java",
          code: `public class RideCompletion {
    enum Status { STARTED, COMPLETED }              // enums get their own lesson later

    // ---- Anemic: a bag of getters and setters; the rules live elsewhere ----
    static class RideRecord {
        private final String id;
        private Status status = Status.STARTED;
        private int km;
        private int fare;

        RideRecord(String id) { this.id = id; }

        String getId() { return id; }
        Status getStatus() { return status; }
        void setStatus(Status status) { this.status = status; }
        int getKm() { return km; }
        void setKm(int km) { this.km = km; }
        int getFare() { return fare; }
        void setFare(int fare) { this.fare = fare; }
    }

    static class TripService {                      // one place that completes rides
        void complete(RideRecord ride, int km) {
            ride.setKm(km);
            ride.setFare(50 + km * 12);
            ride.setStatus(Status.COMPLETED);
        }
    }

    static class SupportConsole {                   // another place, written later by someone else
        void forceClose(RideRecord ride) {
            ride.setStatus(Status.COMPLETED);       // forgot the fare
        }
    }

    // ---- Rich: the data and the rule that changes it live together ----
    static class Ride {
        private final String id;
        private Status status = Status.STARTED;
        private int km;
        private int fare;

        Ride(String id) { this.id = id; }

        void complete(int km) {
            if (status != Status.STARTED) {
                throw new IllegalStateException(id + " is already " + status);
            }
            if (km <= 0) {
                throw new IllegalArgumentException("km must be positive, got " + km);
            }
            this.km = km;
            this.fare = 50 + km * 12;
            this.status = Status.COMPLETED;
        }

        String summary() { return id + " " + status + " " + km + " km, fare " + fare; }
    }

    static String summary(RideRecord r) {
        return r.getId() + " " + r.getStatus() + " " + r.getKm() + " km, fare " + r.getFare();
    }

    public static void main(String[] args) {
        TripService trips = new TripService();
        SupportConsole support = new SupportConsole();

        RideRecord r1 = new RideRecord("R-201");
        trips.complete(r1, 12);
        trips.complete(r1, 20);                     // completed twice: second call silently wins
        RideRecord r2 = new RideRecord("R-202");
        support.forceClose(r2);                     // completed with no fare
        System.out.println("anemic: " + summary(r1));
        System.out.println("anemic: " + summary(r2));

        Ride r3 = new Ride("R-301");
        r3.complete(12);
        System.out.println("rich:   " + r3.summary());
        try {
            r3.complete(20);
        } catch (IllegalStateException e) {
            System.out.println("rich:   rejected, " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `anemic: R-201 COMPLETED 20 km, fare 290
anemic: R-202 COMPLETED 0 km, fare 0
rich:   R-301 COMPLETED 12 km, fare 194
rich:   rejected, R-301 is already COMPLETED`,
        },
        {
          type: "list",
          items: [
            "`R-201` was completed twice, and the second call silently replaced 12 km and 194 with 20 km and 290. If the second call was a duplicate carrying a wrong meter reading, the rider is charged 290 for a 12 km trip, and nothing records that it happened. Nothing in `RideRecord` knows that completing is a one-time transition.",
            "`R-202` is `COMPLETED` with a fare of 0. The support tool was written later and only set the status, because the rule \"completing computes the fare\" lived in `TripService`, not in the ride. With a setter on every field, every new caller is a new chance to break the rules.",
            "The rich `Ride` has no setters. The only way to complete it is `complete(km)`, which checks the status, computes the fare and changes the status in one place, and it refused the second completion. A support action would be its own method on `Ride`, like `cancel(reason)`, with its own rules next to the others.",
            "Services don't disappear in a rich model. A Spring `@Service` still loads the ride from the repository, calls `ride.complete(km)`, saves it and publishes an event. It just stops making decisions that belong to the ride.",
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
              question: "What is the difference between a class and an object?",
              answer:
                "A class is the definition: it declares the fields every instance will have and the methods that work on them, and it's also a type. An object is one instance of that class, created at runtime with `new`, with its own values for those fields.\n\nOne class, many objects: in my `Order` program, `asha` and `ravi` were two objects of one class. After `asha.place(3)`, Asha's order had 3 items and a total of 400, while Ravi's still had the defaults, 0 items and a total of 40.",
            },
            {
              question: "What does the `new` keyword do?",
              answer:
                "It creates an object: the JVM reserves memory for it on the heap, zeroes its fields, writes its header, runs the constructor and produces a reference to it. Apart from special routes like string literals, `clone()` and deserialization, it's how objects get created.\n\nIn bytecode it's two steps, which `javap` showed for `Order`: `new #8` allocates and pushes the reference, `dup` copies it, and `invokespecial Order.<init>` runs the constructor on the already-allocated object. `astore_1` then stores the reference in the variable.",
            },
            {
              question: "What's the difference between `Order o;` and `Order o = new Order(...);`?",
              answer:
                "The first only declares a reference variable and creates nothing. The second also creates an `Order` object and stores a reference to it in `o`.\n\nUsing the first as a local before assigning it doesn't compile: my `Uninit` program failed with `variable order might not have been initialized`. As a field, the same declaration compiles and holds `null`, so the mistake shows up later as a `NullPointerException`.",
            },
            {
              question: "What default values do fields get, and do local variables get them too?",
              answer:
                "Fields get zero values: `0`, `0.0`, `false`, `'\\u0000'` and `null` for references. Local variables get nothing, and reading one before assigning it is a compile error.\n\nThe difference is mechanical: `new` zeroes the object's memory before the constructor runs, while a frame's slots aren't zeroed, so `javac` enforces definite assignment instead. Ravi's order in my `Order` program showed `items` `0` and `placed` `false` without anyone assigning them.",
            },
            {
              question: "What is `this`?",
              answer:
                "A reference to the object the current instance method or constructor was called on, the receiver. It's how a method reaches its own fields (`this.items`), hands the object to someone else (`team.register(this)`) or returns it for chaining (`return this`).\n\nIt's a real local variable: the local variable table in `javap -v` (compiled with `-g`) showed `this` in slot 0 of `place`, typed `LOrder;`, with the parameter `items` in slot 1. The caller passes it implicitly, by pushing the receiver before the arguments.",
            },
            {
              question: "Can you call an instance method from `main` without creating an object?",
              answer:
                "No. `main` is static, so there's no `this` to call it on, and `javac` rejects it with `non-static method total() cannot be referenced from a static context`.\n\nThe compiler is really asking \"total of which object?\". The fix is to create one and call the method on it, like `new StaticThis().total()`. Using `this.items` in `main` fails the same way: `non-static variable this cannot be referenced from a static context`.",
            },
            {
              question: "What is the difference between `==` and `equals()` for objects?",
              answer:
                "`==` compares references: it's `true` only when both point to the same object. `equals()` is meant to compare values, but only does so if the class overrides it; the version inherited from `Object` is just `==`.\n\nIn my `Identity` program, two `Employee`s with identical fields gave `false` for both `==` and `equals`, because `Employee` doesn't override `equals`. The same object through two references gave `true` for both. `String` and records override `equals` to compare contents.",
            },
            {
              question: "What happens when you run `Order o = null; o.total();`?",
              answer:
                "It throws a `NullPointerException` at the call, because there's no object to call `total()` on. The method never starts.\n\nSince Java 15 the message says exactly what was `null`. My `NullOrder` printed `Cannot invoke \"NullOrder$Order.total()\" because \"<local1>\" is null`, and after `javac -g` it named the variable: `because \"order\" is null`. The stack trace contained only `main`, which shows `total` never got a frame.",
            },
            {
              question: "What does printing an object show if its class doesn't override `toString`?",
              answer:
                "The class name, `@`, and the object's identity hash code in hex, like `Employee@7ea987ac`. That's `Object.toString()`.\n\nThe hex part is the same number `System.identityHashCode` returns, which my `Identity` output showed on the next line, and it isn't a memory address. For anything that ends up in logs, I'd override `toString` or use a record, whose generated `toString` lists the fields.",
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
              question: "Where do objects live, and where do the variables that refer to them live?",
              answer:
                "Objects always live on the heap. A variable lives where it's declared: a local or parameter in its method's frame on the stack, an instance field inside its object, a static field with its class.\n\nSo for `Order asha = new Order(\"Asha\")` in `main`, the variable `asha` is slot 1 of `main`'s frame and holds only a reference, and the 24-byte `Order` is on the heap. Its `customer` field is a reference too, 4 bytes inside the object, to a `String` that is a separate heap object.",
            },
            {
              question: "Are methods copied into each object?",
              answer:
                "No. An object holds only its header and its instance fields. Method code exists once per class, in the class metadata, and every object uses that one copy, arriving as `this`.\n\nI measured it: two fields and no methods was 24 bytes per object, the same two fields with thirty methods was also 24 bytes, on JIT and `-Xint` runs alike. The thirty methods made the class file 1,571 bytes bigger, paid once per class.",
            },
            {
              question: "How many `.class` files does one source file produce?",
              answer:
                "One per class or interface declared in it, including nested, inner, local and anonymous classes, records, enums and extra top-level classes. Lambdas are the exception: they get no class file, because their class is generated at runtime.\n\nMy `Shop.java` produced nine: `Shop`, five nested types, `Shop$1` for the anonymous class, `Shop$1Attempt` for the local class and the second top-level class `ReturnPolicy`. The lambda only appeared in the class-load log, as the hidden class `Shop$$Lambda/0x...`.",
            },
            {
              question: "What is aliasing, and why does it cause bugs?",
              answer:
                "Two or more references to the same object. A change made through one is visible through all of them, which becomes a bug as soon as one owner doesn't expect the others to change it.\n\nIn my `Aliasing` program, `second = first` followed by `second.balance = 300` made `first.balance` 300 too, because no second account ever existed. The production section shows the expensive version: two rides sharing one mutable `Location`, so moving one rider's pickup moved the other's.",
            },
            {
              question: "What does `new Employee[3]` create?",
              answer:
                "One object: an array with three slots, each holding `null`. No `Employee` exists until each slot is assigned a `new Employee(...)`.\n\nMy `TeamRoster` printed `[null, null, null]` right after creating it, then failed on the unfilled slot with `Cannot read field \"name\" because \"team[i]\" is null`. An `int[3]` would hold zeros; an array of a class type holds references, and the default reference is `null`.",
            },
            {
              question: "Can `this` be null? Can you assign to it?",
              answer:
                "Neither. `this` is never `null`, because an instance method can only be invoked on a reference, and `invokevirtual` throws `NullPointerException` before the method starts when that reference is `null`. And it's read-only: `this = new ThisAssign();` fails with `cannot assign to 'this'`.\n\nThe `NullOrder` trace shows the first part: the exception came from `main`, at the call, and `total` never appeared. So `if (this == null)` inside a method is dead code.",
            },
            {
              question: "Why must a public class be in a file with the same name?",
              answer:
                "Because `javac` enforces it, which JLS 7.6 allows when sources live in a file system. A public top-level class `Employee` must be in `Employee.java`, so the compiler can find its source from the name alone, and a file can have only one public top-level class.\n\nMy `Employees.java` containing `public class Employee` failed with `class Employee is public, should be declared in a file named Employee.java`. Non-public top-level classes can share a file, like `Employee` and `Manager` in `Identity.java`, though I'd normally give each its own.",
            },
            {
              question: "What's the difference between `getClass()` and `instanceof`?",
              answer:
                "`instanceof` asks whether the object is of a type or any subtype of it. `getClass()` returns the exact runtime class, so comparing it with `==` accepts that class and nothing else.\n\nFor a `Manager`, a subclass of `Employee`, my `Identity` program printed `true` for `boss instanceof Employee` and `false` for `boss.getClass() == Employee.class`. Most code wants `instanceof`; exact `getClass()` checks mostly show up inside `equals`, which the Object Class Methods lesson discusses.",
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
              question: "How many objects does `new String(\"book\")` create?",
              answer:
                "Each execution creates exactly one, the new `String`. The first execution in a JVM where `\"book\"` isn't interned yet also creates the pooled literal, a `String` plus its `byte[]`, but that happens once per JVM, not per execution.\n\nI measured it: the first run of the literal allocated 48 bytes (a 24-byte `String` and a 24-byte `byte[]`), later runs 0, and every `new String(\"book\")` 24 bytes. `javap` on JDK 21's `String(String)` shows why there's no new array: it copies the reference to the literal's `byte[] value`. So \"two objects\" is true only of the first execution, and it ignores the arrays.",
            },
            {
              question: "What bytecode does `this.items = items;` compile to?",
              answer:
                "`aload_0` pushes `this`, `iload_1` pushes the parameter, and `putfield #13` stores it into the object, where `#13` is the constant pool entry `Fieldref Order.items:I`. Reading a field is `aload_0` followed by `getfield`.\n\nThat's straight from the `javap -v` listing of `Order.place`. The `Fieldref` is symbolic, just class, name and descriptor, and the JVM resolves it to a fixed offset the first time it runs: 12 for `items`, as `HeaderPeek` measured.",
            },
            {
              question: "How does `asha.place(3)` find the code to run?",
              answer:
                "The caller pushes the receiver, then the arguments, and executes `invokevirtual` on a `Methodref`, `Order.place:(I)V`. The JVM resolves that symbolic reference once; on each call it null-checks the receiver, follows the class pointer in its header to the class metadata, and selects the method there, which may be an override from a subclass.\n\nIn `Order`'s bytecode it's `aload_1`, `iconst_3`, `invokevirtual #28`. In `HeaderPeek` every `Order` carried the same class pointer (`0x01000a08` in my run), so they all reach the same code. How subclasses change the selection is the Polymorphism lesson.",
            },
            {
              question: "Where is `this` stored while an instance method runs?",
              answer:
                "In local variable slot 0 of the method's frame, like a parameter. The caller pushes the receiver before the arguments, and the invoke instruction turns them into the new frame's first locals.\n\nThe local variable table of `place(int)` listed `this` in slot 0 with type `LOrder;` and `items` in slot 1, and `args_size=2` counts both. `total()` has no parameters and still shows `args_size=1`: that one argument is `this`.",
            },
            {
              question: "What is in an object's header, and what does the class pointer point to?",
              answer:
                "On 64-bit HotSpot with the default compressed class pointers: an 8-byte mark word (identity hash once computed, GC age, lock bits) and a 4-byte class pointer. The class pointer leads to the class's metadata in Metaspace, with the field layout, the method table and the bytecode.\n\nI read both with `Unsafe` in `HeaderPeek`: fields started at offset 12, right after the header, and three `Order`s carried an identical class pointer while a `Customer` carried a different one. On JDK 25, `-XX:+UseCompactObjectHeaders` (JEP 519) merges both into one 8-byte header, and my two-field object went from 24 to 16 bytes.",
            },
            {
              question: "Is the hash in `Employee@7ea987ac` a memory address?",
              answer:
                "No. It's the identity hash code, which HotSpot generates the first time it's requested, by default from a per-thread pseudo-random generator, and stores in the object's mark word, so it survives the GC moving the object.\n\nWhen I read a fresh object's mark word with `Unsafe` on JDK 21, it was `0x1`; after `System.identityHashCode` it held the hash `0x5cad8086` in bits 8 to 38, and `toString` printed `@5cad8086`. Since objects move, an address-based hash couldn't stay stable anyway.",
            },
            {
              question: "Is there exactly one `Class` object per class?",
              answer:
                "One per class per class loader. Within one loader, every object of a class returns the same `Class` object from `getClass()`, so `a.getClass() == b.getClass()` is `true`. The same `.class` file defined by two different loaders makes two distinct classes, each with its own `Class` object.\n\nMy `Identity` program printed `true` for both `a.getClass() == b.getClass()` and `a.getClass() == Employee.class`. The Class Loading lesson covered the two-loader case, which is where puzzling `ClassCastException`s between \"identical\" classes come from.",
            },
            {
              question: "What did Java 25 change about classes and objects?",
              answer:
                "Two things in this lesson's scope. Compact source files and instance main methods became final (JEP 512), so a file with no class declaration compiles to an implicitly declared `final` class. And compact object headers became a product option (JEP 519): with `-XX:+UseCompactObjectHeaders` the header is 8 bytes instead of 12. It's not the default.\n\n`javap` on my `PriceCheck.java` showed `final class PriceCheck` with a default constructor and `shipping` as an ordinary instance field. My two-field object measured 24 bytes on JDK 25 by default and 16 with compact headers. The model didn't change: still classes, still objects with headers and fields.",
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
              question: "In the ride-hailing production example, Asha moved her airport pickup pin, and Ravi's driver was routed to her new spot. How would you find and fix the cause?",
              answer:
                "I'd suspect aliasing: two rides holding a reference to one mutable `Location`. I'd look at how pickups are created, for shared presets, caches or a reference copied from another ride, and confirm with `ride1.getPickup() == ride2.getPickup()`. My `SharedPickup` reproduction printed `true`, and the saved preset itself had moved.\n\nThe fix is to stop sharing mutable state: make `Location` immutable, a record, so moving a pickup replaces the ride's reference with a new object, or at least copy it in the `Ride` constructor. With the record, Ravi's pickup and the preset both stayed at 22.6547, 88.4467.",
            },
            {
              question: "A nightly job that loads the employee roster into an `Employee[]` crashes with a NullPointerException on some nights only. What's your first suspicion?",
              answer:
                "That the array is sized from one number, like the expected head count, but filled from another, the rows actually loaded, leaving `null` slots whenever fewer rows arrive. `new Employee[n]` creates `n` null references and zero employees.\n\nThe helpful NPE message usually confirms it: my `TeamRoster` said `Cannot read field \"name\" because \"team[i]\" is null`. I'd switch to a `List<Employee>` that contains only the employees actually loaded, or check that every slot was filled before using the array.",
            },
            {
              question: "In the same production example, support reports completed rides with a fare of 0, and a few rides completed twice. The ride class has a getter and a setter for every field. What would you change?",
              answer:
                "Move the rules into the class. Completing a ride should be one method, `complete(km)`, that checks the current status, computes the fare and sets the status together, with no public setters left to bypass it.\n\nMy `RideCompletion` reproduced both reports with the anemic version: `R-201` completed twice with the second call silently winning, and `R-202` force-closed with fare 0 by another service. In the rich version the second `complete` threw `R-301 is already COMPLETED`, and there was simply no setter for closing a ride without a fare.",
            },
            {
              question: "A duplicate-request check `if (incoming == existing)` never detects duplicates, even when the logged request bodies are identical. Why?",
              answer:
                "`==` compares references, and every request is deserialized into a new object, so two requests are never the same object, whatever they contain. The check needs value equality: `equals`, which the class has to define, or a record, which generates it.\n\nIn `Identity`, two `Employee`s with identical fields gave `false` for `==` and even for `equals`, because `Employee` didn't override it. In `MoneyPreview`, two equal records gave `false` for `==` and `true` for `equals`. For deduplication I'd usually compare a request id rather than whole objects.",
            },
            {
              question: "After a refactor, every order in a batch report shows the same customer name, the last one processed, while the item counts are correct. What happened?",
              answer:
                "Most likely the customer field became `static`, so all orders share one variable and the last constructor call wins. The correct item counts are the clue: those are still instance fields, one per object.\n\nMy `SharedCustomer` printed `Ravi 3, Ravi 5` for orders created for Asha and Ravi. Plain `javac` gave no warning; only `-Xlint:static` flagged `first.customer` as a static field reached through an instance. Making `customer` an instance field fixes it.",
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
            "Write `EmployeeDemo.java` with a nested `Employee` class: fields `name`, `rating` (a `double`), `active` and `office` (initialized to `\"none\"`), a constructor taking the name, and a method `activate()` that sets `active` to `true`. Create Asha and Ravi, activate only Asha, and print each employee's `name` and `active`.",
            "Add `Employee alias = asha; alias.rating = 4.9;` and print `asha.rating`. Then `alias = ravi; alias.rating = 4.2;` and print both ratings. Write down the prediction first.",
            "Make `activate()` return `this`, add `moveTo(String office)` that also returns `this`, and a `describe()` method returning `name + \" in \" + office + \", active \" + active`. Print `new Employee(\"Meera\").activate().moveTo(\"Pune\").describe()`.",
            "Print `asha` directly, then `asha.getClass() == ravi.getClass()`.",
            "Create `Employee[] team = new Employee[3]`, put `asha` in slot 0 and `ravi` in slot 2, and print `team[i].name.length()` in a loop. Read the exception message, then recompile with `javac -g` and compare.",
            "Add an instance method `int activeCount()` to `EmployeeDemo` itself (not to `Employee`) and call it from `main` as plain `activeCount()`. Read the compile error, then fix it with `new EmployeeDemo().activeCount()`.",
            "Before running `ls *.class`, predict which class files `javac EmployeeDemo.java` produced.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `Asha true` and `Ravi false`. Step 2 prints `4.9`, then `4.9 4.2`: the alias changed Asha's object, and after being repointed, Ravi's. Step 3 prints `Meera in Pune, active true`. Step 4 prints `EmployeeDemo$Employee@` followed by a hex identity hash (mine was `5ca881b5`; it differs between machines and runs), then `true`. Step 5 prints `4` for Asha and then fails with `Cannot read field \"name\" because \"<local4>[<local5>]\" is null` (the slot numbers depend on how many locals come first; in mine `args`, `asha`, `ravi` and `alias` took slots 0 to 3), and with `-g`, `because \"team[i]\" is null`. Step 6 fails with `non-static method activeCount() cannot be referenced from a static context` until the object is created. Step 7 lists exactly two files: `EmployeeDemo.class` and `EmployeeDemo$Employee.class`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `CLASS      blueprint + type: fields, methods, constructors
           one public top-level class per file, named after it
           every class, nested too -> its own .class file
OBJECT     made by new, on the heap: header + its own field values
           identity (==), state (fields), behaviour (class code)
REFERENCE  Order o;  declares, creates nothing
           o2 = o1 copies the reference -> aliasing
           o.total() on null -> NPE: because "o" is null
           new Order[3] -> 3 nulls, 0 Orders
THIS       the receiver, local slot 0, never null, read-only
           none in static code: "cannot be referenced from
           a static context"
BYTECODE   new, dup, invokespecial <init>
           aload_0 = this, getfield / putfield via Fieldref
           invokevirtual: receiver pushed first
MEMORY     12-byte header + fields: int + boolean + ref = 24
           methods: 0 bytes per object, once per class
           JDK 25 compact headers: 8-byte header
           (int + ref: 24 -> 16; int + boolean + ref: still 24)
IDENTITY   == same object; default equals is ==
           toString = Name@identityHash (not an address)
           getClass(): one Class per class per loader
STRING     new String("book"): 1 object per run,
           literal + byte[] once per JVM`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "If someone says every object carries its methods: no. An object is a header plus its own field values; the code exists once per class, and `this` tells it which object to work on.",
            "Most early OOP bugs are reference bugs: a shared mutable object (aliasing), a `null` that was never replaced by a `new`, or `==` where `equals` was meant.",
            "Next comes Constructors: how an object gets from zeroed memory to a valid state, in what order its fields are initialized, and how `this(...)`, `super(...)` and static factories fit in.",
          ],
        },
      ],
    },
  ],
};
