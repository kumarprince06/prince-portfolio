import type { Lesson } from "../types";

export const polymorphism: Lesson = {
  slug: "polymorphism",
  date: "2026-11-06",
  title: "Polymorphism",
  description:
    "How one Java call site runs different code for different objects: overloading versus overriding, every overriding rule with its real compile error, casting and pattern matching over sealed types, and how javac, HotSpot's vtables and the JIT's inline caches make dynamic dispatch cheap.",
  tags: ["Core Java", "OOP", "Polymorphism", "Dynamic Dispatch", "JIT"],
  sections: [
    {
      title: "What Polymorphism Is",
      blocks: [
        {
          type: "paragraph",
          text: "The Association, Aggregation and Composition lesson ended with objects holding references to other objects: an `Order` has a `Customer`, a `CheckoutService` holds a `PaymentProcessor`. The Inheritance lesson before it gave me classes that extend other classes. Polymorphism is what makes both of those pay off. It lets code written once, against a general type, work correctly with objects of many specific types, including types that didn't exist when the code was written.",
        },
        {
          type: "paragraph",
          text: "The short version I keep in my head is **one call site, many behaviours**. `v.toll(10)` is one line of code and one bytecode instruction, but it computes a bike toll for a `Bike`, a car toll for a `Car`, and whatever `toll` means for a class someone adds next year. The word is Greek for \"many forms\".",
        },
        {
          type: "paragraph",
          text: "Java has two mechanisms that get called polymorphism, and they happen at completely different times:",
        },
        {
          type: "list",
          items: [
            "**Compile-time polymorphism** is overloading: several methods with the same name and different parameter lists. `javac` picks one from the declared types of the arguments and writes that choice into the bytecode. The Methods lesson covered how it chooses (exact match and widening, then boxing, then varargs), so here I only need the result: the choice is frozen before the program runs.",
            "**Runtime polymorphism** is overriding plus dynamic dispatch: a subclass replaces an inherited instance method, and the JVM picks the implementation from the actual class of the object, every time the call runs.",
          ],
        },
        {
          type: "paragraph",
          text: "Most of this lesson is about the second kind, because that's where the rules, the bytecode, HotSpot's vtables and the JIT's tricks live, and it's what interviewers mean by \"polymorphism\". By the end I want to be able to predict which method runs for any call, explain how the JVM makes that choice in a few machine instructions, and know when a `switch` over a sealed type is the better tool.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The word reached programming before object orientation did. Christopher Strachey's 1967 lecture notes, Fundamental Concepts in Programming Languages, split it into **ad hoc polymorphism**, where one name has a separate implementation per type (overloading), and **parametric polymorphism**, where one implementation works for any type (what generics do). In 1985 Luca Cardelli and Peter Wegner added **inclusion polymorphism**: an object of a subtype can be used wherever its supertype is expected. Object-oriented languages are built on that third kind, and it's what this lesson calls runtime polymorphism.",
        },
        {
          type: "paragraph",
          text: "The mechanism came from Simula 67, designed by Ole-Johan Dahl and Kristen Nygaard in Oslo. It had classes, subclasses and **virtual** procedures that a subclass could redefine, which is where C++'s `virtual` keyword got its name. Smalltalk, at Xerox PARC, went all the way: every operation is a message sent to an object, and the receiver's class always decides what runs. Making that fast produced the techniques in the Internal Working section. L. Peter Deutsch and Allan Schiffman described inline caches for Smalltalk-80 in 1984, and the Self project (Urs Hölzle, Craig Chambers and David Ungar) added polymorphic inline caches in 1991, then adaptive optimisation and deoptimisation.",
        },
        {
          type: "paragraph",
          text: "C++ took virtual functions from Simula and implemented them with a per-class table of function pointers, the vtable. It made dispatch opt-in: a member function is only dispatched on the object's class if it's declared `virtual`.",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (1996) flipped that default. Every instance method that isn't `static`, `private` or `final` can be overridden and is dispatched on the object's class. Java kept single inheritance for classes, used interfaces for multiple supertypes, and left out operator overloading. The JVM that made all those virtual calls cheap came from the Self lineage: Sun bought Animorphic Systems in 1997, whose Strongtalk VM had been built by Self veterans, and that work shipped as HotSpot in 1999 and became the default JVM in JDK 1.3.",
        },
        {
          type: "paragraph",
          text: "Since then, the language has kept adding tools around dispatch:",
        },
        {
          type: "table",
          headers: ["Version", "What arrived", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "`@Override`, covariant return types, generics", "Checked overriding; bridge methods start appearing in class files"],
            ["Java 6", "`@Override` allowed on interface implementations", "The annotation works wherever an override does"],
            ["Java 8", "Default methods in interfaces", "Interfaces can carry dispatched code (the Interfaces lesson)"],
            ["Java 16", "Pattern matching for `instanceof` (JEP 394), records (JEP 395)", "Test, cast and bind in one step"],
            ["Java 17", "Sealed classes and interfaces (JEP 409)", "A closed set of subtypes the compiler knows about"],
            ["Java 21", "Pattern matching for `switch` (JEP 441), record patterns (JEP 440)", "Exhaustive, data-oriented dispatch"],
            ["Java 22", "Unnamed variables and patterns, `_` (JEP 456)", "Ignoring record components inside patterns"],
            ["Java 25", "Flexible constructor bodies (JEP 513); primitive patterns still a preview (JEP 507)", "Fixes one constructor dispatch trap; `case int k` still needs `--enable-preview`"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The picture I use is a power socket on a wall.",
        },
        {
          type: "list",
          items: [
            "The **socket** is the declared type. It knows one contract: a plug of the right shape goes in, and power flows when it's switched on. That's `Vehicle v` and its `toll(int)` method.",
            "Whatever is **plugged in** is the runtime object: a kettle, a phone charger, a fan. The socket doesn't know which.",
            "**Switching on** is the call. Same switch, same wiring, and the kettle boils, the charger charges, the fan spins. The appliance decides what happens, not the socket. That's dynamic dispatch.",
            "The **plug shape** is checked when I plug in, not when I switch on. A three-pin plug doesn't go into a two-pin socket at all. That's a compile error, caught before anything runs.",
            "A **power strip** with a USB port, a two-pin and a three-pin socket is overloading. Which one I use is decided by the plug in my hand, before any power flows.",
            "Using a feature the socket knows nothing about, like a fan's speed dial, means looking at the appliance itself: \"if this is a fan, set it to 3\". That's `instanceof` and a downcast. Assuming the kettle is a fan and reaching for its dial is a `ClassCastException`.",
            "Adding a new appliance, say an EV charger, needs no rewiring of the house. That's the payoff the production section is about: new types without editing old code.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: in real life I look at the actual plug. Java's overload choice looks at the **label** on the variable, not the object, so a three-pin plug in a bag labelled \"two-pin\" would be sent to the two-pin socket. The puzzle in the Overloading Meets Overriding section is exactly that. And an appliance carries its own machinery, while a Java object doesn't carry its methods at all. It carries a pointer to its class, and every `Car` object shares one copy of `Car.toll`. Internal Working shows that pointer doing the dispatching.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Declared type and runtime class",
        },
        {
          type: "paragraph",
          text: "Every reference expression has two types. The **declared (static) type** is what the compiler sees: the type of the variable, parameter, field or method return. The **runtime class** is the class of the object the reference points to while the code runs. In `Vehicle v = new Car();` the declared type of `v` is `Vehicle` and the runtime class is `Car`. The runtime class is always the declared type or one of its subtypes; that guarantee is what makes the assignment legal.",
        },
        {
          type: "paragraph",
          text: "Almost every polymorphism question is settled by one rule with two halves:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**The compiler uses the declared type.** It decides which methods can be called at all and, if the name is overloaded, which overload (which exact signature) is called. That choice is written into the bytecode.",
            "**The JVM uses the runtime class.** For an instance method that can be overridden, it runs the most specific override of that exact signature found in the object's class, decided again every time the call executes.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "How I answer \"which method runs?\"",
          text: "Always in that order: first the overload, from the declared types of the receiver and the arguments; then the override, from the runtime class of the receiver only. Fields, `static` methods and `private` methods stop after the first step.",
        },
        {
          type: "heading",
          text: "The two kinds side by side",
        },
        {
          type: "table",
          headers: ["", "Overloading", "Overriding"],
          rows: [
            ["Also called", "Compile-time polymorphism, static binding", "Runtime polymorphism, dynamic dispatch, late binding"],
            ["What differs", "The parameter list", "The implementation; the signature stays the same"],
            ["Where", "Same class, or inherited plus new in a subclass", "A subclass, or a class implementing an interface"],
            ["Chosen by", "`javac`, from declared argument types", "The JVM, from the receiver's runtime class"],
            ["In the bytecode", "A fixed descriptor per call site", "One instruction that reaches different code"],
            ["Return type", "Free to differ", "Same, or a subtype for references (covariant)"],
            ["`static`, `private`, `final`", "Can all be overloaded", "Can't be overridden"],
          ],
        },
        {
          type: "heading",
          text: "What takes part in dispatch",
        },
        {
          type: "table",
          headers: ["Member", "Overridable?", "What happens instead"],
          rows: [
            ["Instance method (not `private`, `static` or `final`)", "Yes", "Dispatched on the runtime class"],
            ["`final` instance method", "No", "Compile error: \"overridden method is final\""],
            ["`private` method", "No", "Not inherited; a same-named method in a subclass is unrelated"],
            ["`static` method", "No", "Hidden: the declared type picks it (Static Keyword lesson)"],
            ["Field", "No", "Hidden: the declared type picks it (Inheritance lesson)"],
            ["Constructor", "No", "Not inherited at all; each class declares its own (Constructors lesson)"],
          ],
        },
        {
          type: "heading",
          text: "The overriding rules",
        },
        {
          type: "paragraph",
          text: "JLS 8.4.8 defines when an instance method overrides one from a supertype, and what it must then respect. Each row is demonstrated with a real compiler message in The Overriding Rules, One by One:",
        },
        {
          type: "table",
          headers: ["Rule", "Allowed", "What javac says otherwise"],
          rows: [
            ["Name and parameter types", "Exactly the same, after generic erasure", "Nothing: a different list is an overload, a separate method"],
            ["Return type", "Same primitive or `void`; same reference type or a subtype", "\"return type int is not compatible with double\""],
            ["Access", "Same or wider: package-private, then `protected`, then `public`", "\"attempting to assign weaker access privileges; was public\""],
            ["Checked exceptions", "The same ones, subclasses of them, fewer, or none", "\"overridden method does not throw Exception\""],
            ["Unchecked exceptions", "Anything", "Never an error"],
            ["`final` parent method", "Nothing", "\"overridden method is final\""],
            ["`static` on one side only", "Nothing", "\"overridden method is static\" or \"overriding method is static\""],
            ["`@Override`", "Optional, and worth using everywhere", "\"method does not override or implement a method from a supertype\""],
          ],
        },
        {
          type: "heading",
          text: "Anatomy of an override",
        },
        {
          type: "code",
          language: "java",
          code: `class Vehicle {
    protected Quote quote(int km) throws TollLookupException { ... }
}

class Car extends Vehicle {
    @Override                                    // ask javac to check it really overrides
    public PremiumQuote quote(int km)            // wider access, covariant return
            throws RouteClosedException {        // narrower checked exception
        Quote base = super.quote(km);            // the parent's version, no dispatch
        ...
    }
}`,
        },
        {
          type: "paragraph",
          text: "Here `PremiumQuote` extends `Quote` and `RouteClosedException` extends `TollLookupException`. Every choice in that signature goes in the direction that keeps a caller holding a `Vehicle` safe: it can still call the method, it still gets a `Quote`, and it can't be surprised by a checked exception it wasn't told about. That's the Liskov substitution idea from the Inheritance lesson, enforced by the compiler.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Which instruction a call becomes",
        },
        {
          type: "paragraph",
          text: "The Methods lesson listed the five invoke instructions. Polymorphism lives in two of them, and two others are the non-polymorphic contrast. I put all four kinds of call in one program:",
        },
        {
          type: "code",
          language: "java",
          title: "DispatchKinds.java",
          code: `interface Pricing {
    double toll(int km);
}

class Vehicle implements Pricing {
    public double toll(int km) { return 30 + km * 10.0; }
    static double gst(double amount) { return amount * 0.05; }
}

class Car extends Vehicle {
    @Override
    public double toll(int km) {
        return super.toll(km) + 20;                 // the parent's version, plus a car premium
    }
}

public class DispatchKinds {
    public static void main(String[] args) {
        Vehicle v = new Car();
        Pricing p = v;                              // an upcast: no instruction at all
        double a = v.toll(10);                      // class-typed call
        double b = p.toll(10);                      // interface-typed call
        double c = Vehicle.gst(a);                  // static call
        System.out.println(a + " " + b + " " + c);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac DispatchKinds.java && java DispatchKinds && javap -c DispatchKinds Car",
        },
        {
          type: "output",
          text: `150.0 150.0 7.5
  ...
  public static void main(java.lang.String[]);
    Code:
       0: new           #7                  // class Car
       3: dup
       4: invokespecial #9                  // Method Car."<init>":()V
       7: astore_1
       8: aload_1
       9: astore_2
      10: aload_1
      11: bipush        10
      13: invokevirtual #10                 // Method Vehicle.toll:(I)D
      16: dstore_3
      17: aload_2
      18: bipush        10
      20: invokeinterface #16,  2           // InterfaceMethod Pricing.toll:(I)D
      25: dstore        5
      27: dload_3
      28: invokestatic  #19                 // Method Vehicle.gst:(D)D
      ...
class Car extends Vehicle {
  ...
  public double toll(int);
    Code:
       0: aload_0
       1: iload_1
       2: invokespecial #7                  // Method Vehicle.toll:(I)D
       5: ldc2_w        #11                 // double 20.0d
       8: dadd
       9: dreturn
}`,
        },
        {
          type: "list",
          items: [
            "`invokevirtual #10 // Method Vehicle.toll:(I)D`: the class file names **Vehicle**, the declared type, not `Car`. `javac` doesn't know or care what `v` will point to. Finding `Car.toll` is the JVM's job, at run time.",
            "`invokeinterface Pricing.toll:(I)D` is the same call through an interface-typed variable. Same object, same result, `150.0`, but a different instruction, because the JVM finds interface methods differently (itables, below). The `2` after the index is the argument count in slots, receiver included.",
            "`Pricing p = v;` compiled to `aload_1`, `astore_2`: a plain copy of the reference. An upcast generates no check, because the compiler already proved it safe.",
            "`invokestatic Vehicle.gst` is settled when the call is linked. There's no receiver, so there's nothing to dispatch on.",
            "`super.toll(km)` inside `Car` is `invokespecial Vehicle.toll`. `invokespecial` never looks at the object's class, which is exactly what `super` means: run the parent's version even though `this` is a `Car`. If it dispatched, `super.toll` would land back in `Car.toll` and recurse forever.",
          ],
        },
        {
          type: "heading",
          text: "How HotSpot finds the method: the vtable",
        },
        {
          type: "paragraph",
          text: "The JVM specification says what `invokevirtual` must select (JVMS 5.4.6): starting from the object's class and walking up through its superclasses, the first method that overrides the resolved one. It doesn't say how. Walking the hierarchy on every call would be slow, so HotSpot works the answer out once per class, when the class is linked, and stores it in a **virtual method table**, the vtable: an array of method pointers at the end of the class's metadata in Metaspace. It's built like this:",
        },
        {
          type: "list",
          items: [
            "Start with a copy of the superclass's vtable, so every inherited method keeps its slot number.",
            "For each method that overrides an inherited one, replace the pointer in that slot.",
            "For each new overridable method, append a slot.",
            "`static` methods, `private` methods and constructors never get a slot, and neither does a `final` method that doesn't override anything. Each of those has exactly one possible target, so calls go straight to it.",
          ],
        },
        {
          type: "paragraph",
          text: "The first time an `invokevirtual` runs, HotSpot resolves `Vehicle.toll:(I)D` to a slot number and caches it. After that, every execution is the same three steps, whatever the object turns out to be: load the class pointer from the object's header, load the method pointer at that slot of the class's vtable, jump to it. A handful of machine instructions, and it doesn't matter how deep the hierarchy is.",
        },
        {
          type: "paragraph",
          text: "I didn't want to take that on trust, so I read the vtables out of a running JVM with HotSpot's Serviceability Agent, the internal library behind `jhsdb`. The same program runs twice: once as the target, which loads the classes and waits, and once as the inspector, which attaches to the target and prints each vtable:",
        },
        {
          type: "code",
          language: "java",
          title: "VtableDump.java",
          code: `import sun.jvm.hotspot.HotSpotAgent;
import sun.jvm.hotspot.debugger.Address;
import sun.jvm.hotspot.oops.InstanceKlass;
import sun.jvm.hotspot.oops.Metadata;
import sun.jvm.hotspot.oops.Method;
import sun.jvm.hotspot.runtime.VM;

class Vehicle {
    public double toll(int km) { return 30 + km * 10.0; }
    public String describe() { return getClass().getSimpleName() + " " + toll(10); }
}

class Car extends Vehicle {
    @Override public double toll(int km) { return 50 + km * 14.0; }
    public int doors() { return 4; }
}

class Bike extends Vehicle {
    @Override public double toll(int km) { return 20 + km * 6.0; }
}

public class VtableDump {
    public static void main(String[] args) throws Exception {
        if (args[0].equals("target")) {                 // the JVM being inspected
            for (Vehicle v : new Vehicle[] {new Vehicle(), new Car(), new Bike()}) v.describe();
            Thread.sleep(60_000);
            return;
        }
        int pid = Integer.parseInt(args[0]);            // the inspector: attach the Serviceability Agent
        HotSpotAgent agent = new HotSpotAgent();
        agent.attach(pid);
        try {
            VM vm = VM.getVM();
            for (String name : new String[] {"Vehicle", "Car", "Bike"}) {
                InstanceKlass k = (InstanceKlass) vm.getClassLoaderDataGraph().find(name);
                Address vtable = k.getAddress().addOffsetTo(InstanceKlass.getHeaderSize());
                System.out.println(name + ": " + k.getVtableLen() + " slots");
                for (int i = 0; i < k.getVtableLen(); i++) {
                    Method m = (Method) Metadata.instantiateWrapperFor(vtable.getAddressAt(i * 8L));
                    System.out.printf("  [%d] %s.%s%n", i,
                        m.getMethodHolder().getName().asString(), m.getName().asString());
                }
            }
        } finally {
            agent.detach();
            ProcessHandle.of(pid).ifPresent(ProcessHandle::destroy);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `SA="--add-modules jdk.hotspot.agent"
for p in sun.jvm.hotspot sun.jvm.hotspot.debugger sun.jvm.hotspot.oops \\
         sun.jvm.hotspot.runtime sun.jvm.hotspot.classfile; do
  SA="$SA --add-exports jdk.hotspot.agent/$p=ALL-UNNAMED"
done
javac $SA VtableDump.java
# start the target, then turn this subshell into the inspector, so the
# inspector is the target's parent: Ubuntu only lets a parent attach
(java VtableDump target & sleep 1; exec java $SA VtableDump $!)`,
        },
        {
          type: "output",
          text: `Vehicle: 7 slots
  [0] java/lang/Object.finalize
  [1] java/lang/Object.equals
  [2] java/lang/Object.toString
  [3] java/lang/Object.hashCode
  [4] java/lang/Object.clone
  [5] Vehicle.toll
  [6] Vehicle.describe
Car: 8 slots
  ...                                  (slots 0 to 4 identical)
  [5] Car.toll
  [6] Vehicle.describe
  [7] Car.doors
Bike: 7 slots
  ...
  [5] Bike.toll
  [6] Vehicle.describe`,
        },
        {
          type: "list",
          items: [
            "Slots 0 to 4 are the five methods of `Object` that can be overridden. `getClass`, `notify`, `notifyAll` and `wait` are `final`, so they have no slot. Every class's vtable starts with these five, because every vtable starts as a copy of its parent's.",
            "`Vehicle` appended `toll` as slot 5 and `describe` as slot 6.",
            "`Car` kept all seven and **replaced** slot 5 with `Car.toll`. Slot 6 is still `Vehicle.describe`, inherited unchanged. `doors` is new, so it was appended as slot 7. `Bike` replaced the same slot 5 with `Bike.toll`.",
            "So `v.toll(10)` means \"call slot 5\" for every `Vehicle`, whatever its class. When I added a `final`, a `private` and a `static` method to `Vehicle` and ran it again, its vtable stayed at 7 slots.",
            "The order of the new slots inside one class is HotSpot's choice, not declaration order: it sorts each class's methods by the address of their name symbols when it parses the class. I don't rely on the numbers, only on the fact that an override reuses its parent's slot.",
            "Attaching needs permission to trace the process. With Ubuntu's default `kernel.yama.ptrace_scope = 1`, my first attempt, where the inspector was a sibling of the target, failed with `ptrace(PTRACE_ATTACH, ..) failed for 77161: Operation not permitted`. Starting the inspector as the target's parent fixed it.",
          ],
        },
        {
          type: "image",
          src: "/images/java/polymorphism-dynamic-dispatch.svg",
          alt: "One call site, v.toll(10), compiled to invokevirtual Vehicle.toll:(I)D and resolved to vtable slot 5. In the top lane v points to a Car object whose class pointer leads to Car's vtable with 8 slots: slots 0 to 4 for Object's methods, slot 5 replaced by Car.toll, slot 6 Vehicle.describe, slot 7 the new Car.doors, and slot 5 leads to Car.toll's code returning 190.0. In the bottom lane v points to a Bike object whose vtable has 7 slots, slot 5 replaced by Bike.toll, leading to code returning 80.0.",
          caption: "The same instruction and the same slot number for both objects. Only the class pointer in the header differs, and that's enough to reach different code.",
        },
        {
          type: "callout",
          tone: "note",
          title: "Package-private methods got an extra slot",
          text: "My first run used package-private methods (no `public`), and `Car` had 9 slots: `Car.toll` replaced slot 5 **and** appeared again in a new slot 7, and `Bike` had 8. HotSpot gives every package-private method a slot of its own, because whether a package-private method can be overridden depends on each subclass's package, so a class further down in another package may need to override it separately. Public and protected methods don't need that, which is why the program above uses them.",
        },
        {
          type: "heading",
          text: "Interface calls use itables",
        },
        {
          type: "paragraph",
          text: "Slot numbers can't work the same way for interfaces. A class can implement any number of interfaces, so `Pricing.toll` can't own slot 5 in every class that implements it. Each class therefore also gets an **itable**: for every interface it implements, a block of method pointers in that interface's method order. `invokeinterface` first finds the `Pricing` block in the receiver's class, a short search through the class's list of interfaces, and then indexes into it. The extra search is why a megamorphic interface call costs a little more than a megamorphic virtual call; in hot code the JIT usually removes both, as the next part shows. The Interfaces lesson covers itables and default methods properly.",
        },
        {
          type: "heading",
          text: "Covariant returns need a bridge method",
        },
        {
          type: "paragraph",
          text: "In the class file, a method is identified by its name and **descriptor**, and the descriptor includes the return type. So as far as the JVM is concerned, `Car.quote:(I)LPremiumQuote;` doesn't override `Vehicle.quote:(I)LQuote;` at all. `javac` closes that gap by generating an extra method:",
        },
        {
          type: "code",
          language: "java",
          title: "Bridges.java",
          code: `import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Comparator;

class Quote {
    final double amount;
    Quote(double amount) { this.amount = amount; }
}

class PremiumQuote extends Quote {
    final double multiplier;
    PremiumQuote(double base, double multiplier) {
        super(base * multiplier);
        this.multiplier = multiplier;
    }
}

class Vehicle {
    Quote quote(int km) { return new Quote(30 + km * 10.0); }
}

class Car extends Vehicle {
    @Override
    PremiumQuote quote(int km) {                    // covariant return: a subtype of Quote
        return new PremiumQuote(50 + km * 14.0, 1.5);
    }
}

class Price implements Comparable<Price> {
    final long paise;
    Price(long paise) { this.paise = paise; }

    @Override
    public int compareTo(Price other) {             // generic override: Comparable<T>.compareTo(T)
        return Long.compare(paise, other.paise);
    }
}

public class Bridges {
    public static void main(String[] args) {
        Vehicle v = new Car();
        Quote q = v.quote(10);                      // compiled against Vehicle.quote: returns Quote
        PremiumQuote sq = new Car().quote(10);      // no cast needed through a Car reference
        System.out.println(q.amount + " " + sq.multiplier);

        for (Class<?> c : new Class<?>[] {Car.class, Price.class}) {
            Arrays.stream(c.getDeclaredMethods())
                  .sorted(Comparator.comparing(Method::toString))
                  .forEach(m -> System.out.println(m + (m.isBridge() ? "   <- bridge" : "")));
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Bridges.java && java Bridges && javap -p -v Car",
        },
        {
          type: "output",
          text: `285.0 1.5
PremiumQuote Car.quote(int)
Quote Car.quote(int)   <- bridge
public int Price.compareTo(Price)
public int Price.compareTo(java.lang.Object)   <- bridge
  ...
  PremiumQuote quote(int);
    descriptor: (I)LPremiumQuote;
    flags: (0x0000)
    ...
  Quote quote(int);
    descriptor: (I)LQuote;
    flags: (0x1040) ACC_BRIDGE, ACC_SYNTHETIC
    Code:
      stack=2, locals=2, args_size=2
         0: aload_0
         1: iload_1
         2: invokevirtual #18                 // Method quote:(I)LPremiumQuote;
         5: areturn`,
        },
        {
          type: "list",
          items: [
            "`Car` has two `quote(int)` methods in its class file. The one I wrote returns `PremiumQuote`. The bridge, flagged `ACC_BRIDGE` and `ACC_SYNTHETIC`, has `Vehicle`'s descriptor, so it's the one that takes over `Vehicle.quote`'s vtable slot. All it does is call the real method and return the result.",
            "`v.quote(10)` compiles to `invokevirtual Vehicle.quote:(I)LQuote;` and lands in the bridge. `new Car().quote(10)` compiles to `Car.quote:(I)LPremiumQuote;` and skips it. That's what covariant returns buy: through a `Car` reference, no cast.",
            "Generics produce the same thing. `Comparable<T>.compareTo(T)` erases to `compareTo(Object)`, so `Price` got a bridge `compareTo(java.lang.Object)`, flagged `ACC_PUBLIC, ACC_BRIDGE, ACC_SYNTHETIC`, that does `checkcast Price` and calls the real method. The Generics phase later in this track covers erasure.",
            "This is the follow-up to the Methods lesson's note that the JVM allows two methods differing only in return type. Here `javac` relies on it.",
          ],
        },
        {
          type: "heading",
          text: "What the JIT does with a virtual call",
        },
        {
          type: "paragraph",
          text: "A vtable call is cheap, but it blocks the optimisation that matters most. The JIT can't inline a method unless it knows which method it is, and inlining is what lets it optimise the caller and callee as one piece of code. HotSpot has two ways to find out.",
        },
        {
          type: "paragraph",
          text: "**Class hierarchy analysis (CHA).** If only one loaded class implements a method, a call to it can only go there. C2 binds the call directly and records a dependency: this compiled code assumes `toll` has a single implementation. If a class that breaks the assumption is loaded later, the compiled code is thrown away. I watched that happen:",
        },
        {
          type: "code",
          language: "java",
          title: "ChaDemo.java",
          code: `abstract class Vehicle {
    abstract double toll(int km);
}

class Car extends Vehicle  { double toll(int km) { return 50 + km * 14.0; } }
class Bike extends Vehicle { double toll(int km) { return 20 + km * 6.0; } }

public class ChaDemo {
    static double total(Vehicle v, int count) {
        double sum = 0;
        for (int i = 0; i < count; i++) {
            sum += v.toll(i % 30);
        }
        return sum;
    }

    public static void main(String[] args) throws Exception {
        Vehicle car = new Car();                    // Bike is not loaded yet
        double result = 0;
        for (int round = 0; round < 20_000; round++) {
            result += total(car, 1_000);
        }
        System.out.println("hot with only Car loaded: " + result);
        Thread.sleep(200);
        System.out.println("loading Bike...");
        Class.forName("Bike");                      // load it, but never call its toll
        Thread.sleep(200);
        System.out.println("done");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+UnlockDiagnosticVMOptions -XX:+PrintCompilation -XX:+PrintInlining ChaDemo \\
  | grep -E "toll|ChaDemo::total|loading|done|hot with"`,
        },
        {
          type: "output",
          text: `26   11       3       Car::toll (11 bytes)
26   12       4       Car::toll (11 bytes)
26   11       3       Car::toll (11 bytes)   made not entrant
28   13 %     3       ChaDemo::total @ 5 (31 bytes)
                              @ 18   Vehicle::toll (0 bytes)   no static binding
28   14       3       ChaDemo::total (31 bytes)
                              @ 18   Vehicle::toll (0 bytes)   no static binding
28   15 %     4       ChaDemo::total @ 5 (31 bytes)
30   13 %     3       ChaDemo::total @ 5 (31 bytes)   made not entrant
                              @ 18   Car::toll (11 bytes)   inline (hot)
30   16       4       ChaDemo::total (31 bytes)
32   14       3       ChaDemo::total (31 bytes)   made not entrant
                              @ 18   Car::toll (11 bytes)   inline (hot)
hot with only Car loaded: 5.032E9
loading Bike...
260   15 %     4       ChaDemo::total @ 5 (31 bytes)   made not entrant
260   16       4       ChaDemo::total (31 bytes)   made not entrant
done`,
        },
        {
          type: "list",
          items: [
            "The third column is the tier: 3 is C1's quick version with profiling counters, 4 is C2. `%` marks an on-stack replacement, a compilation of the loop while it's running. `@ 18` is the bytecode offset of the `invokevirtual` inside `total`.",
            "C1 didn't inline the call (`no static binding`). C2 inlined `Car::toll` straight away, and without a `TypeProfile` line under it. It didn't need the profile, because CHA had proved there was only one `toll` to call.",
            "`Class.forName(\"Bike\")` loaded `Bike` without ever calling it, and at 260 ms (the first column is milliseconds since startup, and varies from run to run) both C2 versions of `total` were **made not entrant**: discarded, because the proof they were built on stopped being true. Had `total` stayed hot, C2 would have compiled it again with two implementations in mind.",
          ],
        },
        {
          type: "paragraph",
          text: "**Receiver type profiles.** When CHA can't help because several implementations are loaded, C2 looks at what the call site has actually seen. While a method runs in the interpreter and in C1's profiling tier, each virtual call site records the classes of its receivers: up to two classes with a count each (`TypeProfileWidth = 2` on my JDK 21), plus a count for everything else. I ran one hot loop with one, two and three classes flowing through the same call site:",
        },
        {
          type: "code",
          language: "java",
          title: "CallSiteShapes.java",
          code: `abstract class Vehicle {
    abstract double toll(int km);
}

class Bike extends Vehicle  { double toll(int km) { return 20 + km * 6.0; } }
class Bus extends Vehicle   { double toll(int km) { return 30 + km * 11.0; } }
class Truck extends Vehicle { double toll(int km) { return 50 + km * 15.0; } }
class Van extends Vehicle   { double toll(int km) { return 45 + km * 13.0; } }

public class CallSiteShapes {
    static double total(Vehicle[] vehicles, int km) {
        double sum = 0;
        for (Vehicle v : vehicles) {
            sum += v.toll(km);                          // the call site being watched
        }
        return sum;
    }

    public static void main(String[] args) {
        int kinds = Integer.parseInt(args[0]);          // how many classes reach the call site
        Vehicle[] all = {new Bike(), new Bus(), new Truck(), new Van()};
        Vehicle[] vehicles = new Vehicle[1_000];
        for (int i = 0; i < vehicles.length; i++) {
            vehicles[i] = all[i % kinds];
        }
        double result = 0;
        for (int round = 0; round < 20_000; round++) {
            result += total(vehicles, round % 30);
        }
        System.out.println(kinds + " kind(s): " + result);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac CallSiteShapes.java
for k in 1 2 3; do
  echo "# $k"
  java -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining CallSiteShapes $k | grep -E "toll|TypeProfile|kind"
done`,
        },
        {
          type: "output",
          text: `# 1
                              @ 31   Vehicle::toll (0 bytes)   no static binding
                              @ 31   Vehicle::toll (0 bytes)   no static binding
                              @ 31   Bike::toll (11 bytes)   inline (hot)
                               \\-> TypeProfile (57150/57150 counts) = Bike
                              @ 31   Bike::toll (11 bytes)   inline (hot)
                               \\-> TypeProfile (941789/941789 counts) = Bike
1 kind(s): 2.1394E9
# 2
                              @ 31   Vehicle::toll (0 bytes)   no static binding
                              @ 31   Vehicle::toll (0 bytes)   no static binding
                              @ 31   Bike::toll (11 bytes)   inline (hot)
                              @ 31   Bus::toll (11 bytes)   inline (hot)
                               \\-> TypeProfile (27581/55163 counts) = Bus
                               \\-> TypeProfile (27582/55163 counts) = Bike
                              @ 31   Bike::toll (11 bytes)   inline (hot)
                              @ 31   Bus::toll (11 bytes)   inline (hot)
                               \\-> TypeProfile (354729/709458 counts) = Bus
                               \\-> TypeProfile (354729/709458 counts) = Bike
2 kind(s): 2.96415E9
# 3
                              @ 31   Vehicle::toll (0 bytes)   no static binding
                              @ 31   Vehicle::toll (0 bytes)   no static binding
                              @ 31   Vehicle::toll (0 bytes)   virtual call
                              @ 31   Vehicle::toll (0 bytes)   virtual call
3 kind(s): 3.7573138E9`,
        },
        {
          type: "list",
          items: [
            "**Monomorphic (one class seen):** C2 inlined `Bike::toll`, and `TypeProfile (57150/57150 counts) = Bike` says every receiver at that site was a `Bike`. Four classes are loaded, so CHA can't prove anything; instead the compiled code checks the class pointer once, and if anything other than a `Bike` ever arrives, it deoptimises back to the interpreter.",
            "**Bimorphic (two classes):** `Bike::toll` and `Bus::toll` were both inlined, about half the counts each, behind a two-way class check.",
            "**Megamorphic (three classes):** `Vehicle::toll (0 bytes) virtual call`. Nothing inlined; the call goes through the vtable every time. Four classes looked the same.",
            "Each shape shows up twice because both C1 and C2 compiled `total` twice, once as an on-stack replacement and once as a normal method. The counts are from one run and change every time.",
          ],
        },
        {
          type: "paragraph",
          text: "Two more things I checked. A skewed megamorphic site still gets help: with the fill line changed to `vehicles[i] = i % 100 < 95 ? all[0] : all[1 + i % 3];`, so 95% of receivers are `Bike`s and the rest are spread over three classes, C2 inlined `Bike::toll` (`TypeProfile (52916/55701 counts) = Bike`) and kept a virtual call for the others. With `< 80` it gave up and printed `virtual call`. The cut-off is `TypeProfileMajorReceiverPercent`, 90 by default on my JDK 21. And a call that stays a call in compiled code goes through an **inline cache**: the call site remembers the receiver class it last saw and jumps straight to that class's method after one comparison, and switches to the vtable lookup once a second class turns up.",
        },
      ],
    },
    {
      title: "Declared Type vs Runtime Type",
      blocks: [
        {
          type: "paragraph",
          text: "Here's the two-halves rule from the Technical Picture in code. `v` is declared as `Vehicle` and points first at a `Car`, then at a `Bike`:",
        },
        {
          type: "code",
          language: "java",
          title: "DeclaredVsRuntime.java",
          code: `class Vehicle {
    String name() { return "vehicle"; }
    double toll(int km) { return 30 + km * 10.0; }
    String describe() { return name() + ": " + toll(10) + " for 10 km"; }
}

class Car extends Vehicle {
    @Override String name() { return "car"; }
    @Override double toll(int km) { return 50 + km * 14.0; }
    int doors() { return 4; }                       // exists only on Car
}

class Bike extends Vehicle {
    @Override String name() { return "bike"; }
    @Override double toll(int km) { return 20 + km * 6.0; }
}

public class DeclaredVsRuntime {
    public static void main(String[] args) {
        Vehicle v = new Car();                           // declared type Vehicle, runtime class Car
        System.out.println(v.toll(10));                  // Car's toll
        System.out.println(v.describe());                // Vehicle's describe, calling Car's name and toll
        System.out.println(v.getClass().getName());

        v = new Bike();                                  // same variable, different object
        System.out.println(v.describe());

        if (v instanceof Car car) {                      // the only way to reach doors() through v
            System.out.println(car.doors());
        } else {
            System.out.println(v.name() + " has no doors()");
        }
    }
}`,
        },
        {
          type: "output",
          text: `190.0
car: 190.0 for 10 km
Car
bike: 80.0 for 10 km
bike has no doors()`,
        },
        {
          type: "list",
          items: [
            "`v.toll(10)` printed `190.0`, the car formula, although `v` is declared as `Vehicle`.",
            "`v.describe()` is the more interesting line. `describe` exists only in `Vehicle` and isn't overridden, yet it printed `car: 190.0`. Inside `describe`, `name()` and `toll(10)` are calls on `this`, and `this` is a `Car`, so they dispatch to Car's versions. Parent code calling overridable methods on `this` is how the template method pattern works, which the Abstraction lesson builds on.",
            "`getClass()` reports the runtime class. The variable's declared type never changes; what it points to does.",
            "`doors()` exists only on `Car`. Reaching it through `v` takes a runtime check first, here a type pattern.",
          ],
        },
        {
          type: "paragraph",
          text: "Calling `doors()` directly on `v` doesn't compile, even when `v` really holds a `Car`:",
        },
        {
          type: "code",
          language: "java",
          title: "OnlyDeclared.java",
          code: `class Vehicle {
    double toll(int km) { return 30 + km * 10.0; }
}

class Car extends Vehicle {
    @Override
    double toll(int km) { return 50 + km * 14.0; }
    int doors() { return 4; }
}

public class OnlyDeclared {
    public static void main(String[] args) {
        Vehicle v = new Car();
        System.out.println(v.toll(10));
        System.out.println(v.doors());
    }
}`,
        },
        {
          type: "output",
          text: `OnlyDeclared.java:15: error: cannot find symbol
        System.out.println(v.doors());
                            ^
  symbol:   method doors()
  location: variable v of type Vehicle
1 error`,
        },
        {
          type: "paragraph",
          text: "\"location: variable v of type Vehicle\" is the declared-type half of the rule. `javac` searched `Vehicle` and its supertypes and nothing else. If I find myself needing `doors()` through `Vehicle` references all over the code, the method probably belongs on `Vehicle` (with `Bike` returning `0`), and more casts would be the wrong fix.",
        },
        {
          type: "heading",
          text: "Fields and static methods don't take part",
        },
        {
          type: "paragraph",
          text: "The Inheritance lesson showed field hiding and the Static Keyword lesson showed static method hiding. The one-line version is that only instance methods are dispatched on the runtime class. Side by side:",
        },
        {
          type: "code",
          language: "java",
          title: "NotPolymorphic.java",
          code: `class Vehicle {
    String type = "vehicle";
    static String category() { return "Vehicle.category()"; }
    String kind() { return "Vehicle.kind()"; }
}

class Car extends Vehicle {
    String type = "car";                                 // hides Vehicle.type
    static String category() { return "Car.category()"; }  // hides Vehicle.category()
    @Override String kind() { return "Car.kind()"; }     // overrides
}

public class NotPolymorphic {
    public static void main(String[] args) {
        Vehicle v = new Car();
        System.out.println(v.type);
        System.out.println(v.category());
        System.out.println(v.kind());
        System.out.println(((Car) v).type);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac NotPolymorphic.java && java NotPolymorphic
javap -c NotPolymorphic | grep -E "getfield|invoke.*(category|kind)"`,
        },
        {
          type: "output",
          text: `vehicle
Vehicle.category()
Car.kind()
car
      12: getfield      #16                 // Field Vehicle.type:Ljava/lang/String;
      23: invokestatic  #28                 // Method Vehicle.category:()Ljava/lang/String;
      33: invokevirtual #32                 // Method Vehicle.kind:()Ljava/lang/String;
      46: getfield      #35                 // Field Car.type:Ljava/lang/String;`,
        },
        {
          type: "paragraph",
          text: "The bytecode explains all four lines. A field read is `getfield` on the declared type's field, and a static call is `invokestatic` on the declared type's method; both are settled at compile time. Only `kind()` became `invokevirtual`. The cast in `((Car) v).type` changes the declared type, so it reads Car's field.",
        },
      ],
    },
    {
      title: "The Overriding Rules, One by One",
      blocks: [
        {
          type: "heading",
          text: "The signature has to match exactly",
        },
        {
          type: "paragraph",
          text: "An override needs the same name and the same parameter types. Anything else is an overload: a separate method that happens to share the name. `toll(Integer)` instead of `toll(int)` looks harmless:",
        },
        {
          type: "code",
          language: "java",
          title: "OverloadByAccident.java",
          code: `class Vehicle {
    double toll(int km) { return 30 + km * 10.0; }
}

class Car extends Vehicle {
    double toll(Integer km) { return 50 + km * 14.0; }   // meant to override, actually overloads
}

public class OverloadByAccident {
    public static void main(String[] args) {
        Vehicle v = new Car();
        Car c = new Car();
        System.out.println(v.toll(10));
        System.out.println(c.toll(10));
        System.out.println(c.toll(Integer.valueOf(10)));
    }
}`,
        },
        {
          type: "output",
          text: `130.0
130.0
190.0`,
        },
        {
          type: "paragraph",
          text: "Two of the three calls silently ran the vehicle formula on a `Car`. `v.toll(10)` can only see `Vehicle.toll(int)`, and `Car` never overrode it. `c.toll(10)` sees both methods, and phase 1 of overload resolution (no boxing, from the Methods lesson) picks the inherited `toll(int)`. Only an explicit `Integer` reaches the new method. Adding `@Override` turns the mistake into a compile error:",
        },
        {
          type: "code",
          language: "java",
          code: `class Car extends Vehicle {
    @Override
    double toll(Integer km) { return 50 + km * 14.0; }   // meant to override, actually overloads
}`,
        },
        {
          type: "output",
          text: `OverloadByAccident.java:6: error: method does not override or implement a method from a supertype
    @Override
    ^
1 error`,
        },
        {
          type: "paragraph",
          text: "A misspelled name, `fair(int km)` under `@Override`, gets exactly the same error. That's the whole job of the annotation: it changes \"I hope this overrides something\" into something the compiler checks.",
        },
        {
          type: "heading",
          text: "Return type, access, exceptions, final and static",
        },
        {
          type: "paragraph",
          text: "The other rules apply once the signature matches. `javac` treats a same-signature method as an attempted override, with or without `@Override`, and checks it. I broke every rule in one file:",
        },
        {
          type: "code",
          language: "java",
          title: "OverrideRules.java",
          code: `class TollLookupException extends Exception { }

class Vehicle {
    public double toll(int km) throws TollLookupException { return 30 + km * 10.0; }
    final double roadTax() { return 5.0; }
    static double baseToll() { return 30.0; }
    double parkingFee() { return 10.0; }
}

class Car extends Vehicle {
    public int toll(int km) { return 50 + km * 14; }               // int, not double
}

class Bike extends Vehicle {
    double toll(int km) { return 20 + km * 6.0; }                  // no longer public
}

class Bus extends Vehicle {
    public double toll(int km) throws Exception { return 25 + km * 11.0; }
}

class Truck extends Vehicle {
    double roadTax() { return 0.0; }                               // final in Vehicle
    double baseToll() { return 50.0; }                             // static in Vehicle
    static double parkingFee() { return 0.0; }                     // instance in Vehicle
}

public class OverrideRules { }`,
        },
        {
          type: "output",
          text: `OverrideRules.java:11: error: toll(int) in Car cannot override toll(int) in Vehicle
    public int toll(int km) { return 50 + km * 14; }               // int, not double
               ^
  return type int is not compatible with double
OverrideRules.java:15: error: toll(int) in Bike cannot override toll(int) in Vehicle
    double toll(int km) { return 20 + km * 6.0; }                  // no longer public
           ^
  attempting to assign weaker access privileges; was public
OverrideRules.java:19: error: toll(int) in Bus cannot override toll(int) in Vehicle
    public double toll(int km) throws Exception { return 25 + km * 11.0; }
                  ^
  overridden method does not throw Exception
OverrideRules.java:23: error: roadTax() in Truck cannot override roadTax() in Vehicle
    double roadTax() { return 0.0; }                               // final in Vehicle
           ^
  overridden method is final
OverrideRules.java:24: error: baseToll() in Truck cannot override baseToll() in Vehicle
    double baseToll() { return 50.0; }                             // static in Vehicle
           ^
  overridden method is static
OverrideRules.java:25: error: parkingFee() in Truck cannot override parkingFee() in Vehicle
    static double parkingFee() { return 0.0; }                     // instance in Vehicle
                  ^
  overriding method is static
6 errors`,
        },
        {
          type: "list",
          items: [
            "**Return type.** For primitives and `void` it must be identical. For references it can be a subtype, the covariant return the bridge-method demo used. `int` isn't a subtype of `double`; widening conversions don't count here.",
            "**Access.** A caller holding a `Vehicle` is allowed to call `toll`, so a subclass can't take that away. Widening is fine: package-private to `protected` to `public`. Interface methods are implicitly `public`, so forgetting `public` on an implementation fails the same way: \"send(String) in SmsNotifier cannot implement send(String) in Notifier ... attempting to assign weaker access privileges; was public\".",
            "**Checked exceptions.** Callers of `Vehicle.toll` were told to handle `TollLookupException` and nothing broader. An override may throw that, a subclass of it, nothing at all, or any unchecked exception; I compiled all three of those variants without complaint. Exception Handling, later in this track, covers checked versus unchecked.",
            "**`final`.** `roadTax()` is a promise that every vehicle computes it the same way. That's a design statement, not a speed trick: as `ChaDemo` showed, C2 already binds a call directly when only one implementation is loaded.",
            "**`static`.** A static method can't be overridden, so an instance method can't replace it, and a static method can't replace an instance one. A static method with the same signature in a subclass hides the parent's instead, which the Static Keyword lesson demonstrated.",
          ],
        },
        {
          type: "heading",
          text: "private methods are not overridden",
        },
        {
          type: "paragraph",
          text: "This one doesn't give a compile error, which is what makes it dangerous:",
        },
        {
          type: "code",
          language: "java",
          title: "PrivateRule.java",
          code: `class Vehicle {
    private String code() { return "VEH"; }

    String label() { return "[" + code() + "]"; }
}

class Car extends Vehicle {
    String code() { return "CAR"; }                      // a new method, not an override
}

public class PrivateRule {
    public static void main(String[] args) {
        Car car = new Car();
        System.out.println(car.label());
        System.out.println(car.code());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac PrivateRule.java && java PrivateRule && javap -c -p Vehicle | grep -A3 "String label"`,
        },
        {
          type: "output",
          text: `[VEH]
CAR
  java.lang.String label();
    Code:
       0: aload_0
       1: invokevirtual #9                  // Method code:()Ljava/lang/String;`,
        },
        {
          type: "paragraph",
          text: "`label()` ran on a `Car` and still called `Vehicle`'s private `code()`. A private method isn't inherited, so `Car.code()` doesn't override it; the two just share a name. The bytecode is the surprising part: since Java 11 the call is `invokevirtual`, not `invokespecial` (the Methods lesson showed this), yet nothing is dispatched. JVMS 5.4.6 says that when the resolved method is private, it is the selected method, full stop. Putting `@Override` on `Car.code()` gives \"method does not override or implement a method from a supertype\", which is the quickest way to find out.",
        },
      ],
    },
    {
      title: "Overloading Meets Overriding",
      blocks: [
        {
          type: "paragraph",
          text: "When a call is both overloaded and overridden, both halves of the rule apply, one after the other. This is the classic predict-the-output puzzle. `OnlineShop` overrides `greet(Customer)` and adds a new overload for `PremiumCustomer`:",
        },
        {
          type: "code",
          language: "java",
          title: "OverloadMeetsOverride.java",
          code: `class Customer { }
class PremiumCustomer extends Customer { }

class Shop {
    String greet(Customer c) { return "Shop.greet(Customer)"; }
}

class OnlineShop extends Shop {
    @Override
    String greet(Customer c) { return "OnlineShop.greet(Customer)"; }

    String greet(PremiumCustomer p) { return "OnlineShop.greet(PremiumCustomer)"; }   // new overload
}

public class OverloadMeetsOverride {
    public static void main(String[] args) {
        Shop shop = new OnlineShop();
        OnlineShop online = new OnlineShop();
        Customer asCustomer = new PremiumCustomer();
        PremiumCustomer premium = new PremiumCustomer();

        System.out.println("1  " + shop.greet(premium));
        System.out.println("2  " + online.greet(premium));
        System.out.println("3  " + online.greet(asCustomer));
        System.out.println("4  " + shop.greet(asCustomer));
        System.out.println("5  " + online.greet((PremiumCustomer) asCustomer));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac OverloadMeetsOverride.java && java OverloadMeetsOverride
javap -c OverloadMeetsOverride | grep greet`,
        },
        {
          type: "output",
          text: `1  OnlineShop.greet(Customer)
2  OnlineShop.greet(PremiumCustomer)
3  OnlineShop.greet(Customer)
4  OnlineShop.greet(Customer)
5  OnlineShop.greet(PremiumCustomer)
      39: invokevirtual #19                 // Method Shop.greet:(LCustomer;)Ljava/lang/String;
      56: invokevirtual #35                 // Method OnlineShop.greet:(LPremiumCustomer;)Ljava/lang/String;
      72: invokevirtual #39                 // Method OnlineShop.greet:(LCustomer;)Ljava/lang/String;
      88: invokevirtual #19                 // Method Shop.greet:(LCustomer;)Ljava/lang/String;
     107: invokevirtual #35                 // Method OnlineShop.greet:(LPremiumCustomer;)Ljava/lang/String;`,
        },
        {
          type: "paragraph",
          text: "Line 1 is the one people get wrong. The object is an `OnlineShop`, the argument is a `PremiumCustomer`, and `OnlineShop` has a `greet(PremiumCustomer)`, yet `greet(Customer)` ran. Step by step:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time, overload.** The declared type of `shop` is `Shop`, so `javac` only searches `Shop` for `greet`. It finds one method, `greet(Customer)`, and a `PremiumCustomer` argument fits it by widening. The call is fixed as `Shop.greet:(LCustomer;)`, the first `invokevirtual` in the listing. `OnlineShop.greet(PremiumCustomer)` was never a candidate, because `Shop` doesn't have it.",
            "**Run time, override.** The JVM looks for the override of `greet(Customer)` in the receiver's class, `OnlineShop`, and finds `OnlineShop.greet(Customer)`. It never considers the argument's runtime class at all.",
            "Line 2 is different only because the declared type is `OnlineShop`. Now `javac` sees both overloads, and `greet(PremiumCustomer)` is more specific, so it's chosen.",
            "Lines 3 and 4 pass `asCustomer`, declared as `Customer`. The object really is a `PremiumCustomer`, but overloads go by declared types, so both pick `greet(Customer)`, and dispatch on the `OnlineShop` receiver gives `OnlineShop.greet(Customer)`.",
            "Line 5's cast changes the declared type of the argument, so `greet(PremiumCustomer)` wins at compile time.",
          ],
        },
        {
          type: "paragraph",
          text: "This is **single dispatch**: Java chooses at run time on one object only, the receiver, and uses the declared types of the arguments. Languages with multiple dispatch, like Common Lisp's CLOS or Julia, choose on the runtime types of all the arguments. In Java the classic workaround is the visitor pattern (double dispatch: the argument calls back into the receiver), and since Java 21 a pattern `switch` on the argument usually reads better. The fix I'd reach for first is simpler still: don't overload a method on parameter types that are related by inheritance. `greetPremium(PremiumCustomer)` can't be confused with anything.",
        },
      ],
    },
    {
      title: "Casting and instanceof",
      blocks: [
        {
          type: "diagram",
          text: `             Vehicle            upcast (Car -> Vehicle):
            ┌───┴───┐           implicit, always safe, no instruction
           Car     Bike
            │                   downcast (Vehicle -> Car):
        ElectricCar             explicit (Car) v, checkcast at run time,
                                ClassCastException if v is not a Car

         sideways (Bike -> Car): compile error, can never succeed`,
          caption: "Casting never changes the object. It only changes the declared type the compiler works with.",
        },
        {
          type: "code",
          language: "java",
          title: "Casting.java",
          code: `class Vehicle {
    double toll(int km) { return 30 + km * 10.0; }
}

class Car extends Vehicle {
    @Override double toll(int km) { return 50 + km * 14.0; }
    int doors() { return 4; }
}

class Bike extends Vehicle {
    @Override double toll(int km) { return 20 + km * 6.0; }
    boolean helmetIncluded() { return true; }
}

public class Casting {
    public static void main(String[] args) {
        Car car = new Car();
        Vehicle v = car;                                 // upcast: implicit, always safe
        Car back = (Car) v;                              // downcast: explicit, checked at run time
        System.out.println(back == car);

        Vehicle other = new Bike();
        try {
            Car wrong = (Car) other;                     // compiles: a Vehicle *might* be a Car
            System.out.println(wrong.doors());
        } catch (ClassCastException e) {
            System.out.println(e.getMessage());
        }

        for (Vehicle each : new Vehicle[] {car, other}) {
            if (each instanceof Car c && c.doors() > 2) {      // test, cast and bind in one step
                System.out.println("car, doors " + c.doors());
            } else if (each instanceof Bike b) {
                System.out.println("bike, helmet " + b.helmetIncluded());
            }
        }

        Vehicle none = null;
        System.out.println(none instanceof Car);         // false, never a NullPointerException
        Car stillNull = (Car) none;                      // casting null always succeeds
        System.out.println(stillNull);
    }
}`,
        },
        {
          type: "output",
          text: `true
class Bike cannot be cast to class Car (Bike and Car are in unnamed module of loader 'app')
car, doors 4
bike, helmet true
false
null`,
        },
        {
          type: "list",
          items: [
            "`back == car` is `true`: the downcast returned the same object. No conversion happens; a reference cast only tells the compiler to treat the reference as a narrower type.",
            "`(Car) other` compiled, because a `Vehicle` might be a `Car`, and failed at run time. The JDK's message names both classes and their module and class loader, which matters when the same class name has been loaded by two different loaders.",
            "`each instanceof Car c` is pattern matching for `instanceof` (Java 16, JEP 394). It tests, casts and binds `c` in one step, and `c` is usable on the right of `&&` because that side only runs when the test passed.",
            "`null instanceof Car` is `false`, and casting `null` succeeds. That's why the `instanceof` test is also a null check, and a cast isn't.",
          ],
        },
        {
          type: "paragraph",
          text: "In the bytecode, the upcast was `aload_1`, `astore_2` again, and every downcast or pattern became a `checkcast` (with an `instanceof` before it for the patterns): `11: checkcast #7 // class Car`. `checkcast` is the instruction that throws `ClassCastException`. The JIT can often prove a cast safe and remove it, but semantically it's a real check every time.",
        },
        {
          type: "heading",
          text: "Where the binding variable is in scope",
        },
        {
          type: "paragraph",
          text: "A pattern variable exists only where the compiler can prove the match succeeded. That gives a neat early-return style, and an error when the proof is missing. The same file shows a cast between siblings, which `javac` rejects outright:",
        },
        {
          type: "code",
          language: "java",
          title: "CastErrors.java",
          code: `class Vehicle {
    double toll(int km) { return 30 + km * 10.0; }
}

class Car extends Vehicle {
    int doors() { return 4; }
}

class Bike extends Vehicle { }

public class CastErrors {
    static String early(Vehicle v) {
        if (!(v instanceof Car c)) {
            return "not a car";
        }
        return "doors " + c.doors();                     // fine: v must be a Car here
    }

    static String broken(Vehicle v) {
        if (v instanceof Car c || v.toll(1) > 100) {
            return "doors " + c.doors();                 // c is not in scope here
        }
        return "no doors";
    }

    static Car impossible(Bike bike) {
        return (Car) bike;                               // siblings: this can never succeed
    }
}`,
        },
        {
          type: "output",
          text: `CastErrors.java:21: error: cannot find symbol
            return "doors " + c.doors();                 // c is not in scope here
                              ^
  symbol:   variable c
  location: class CastErrors
CastErrors.java:27: error: incompatible types: Bike cannot be converted to Car
        return (Car) bike;                               // siblings: this can never succeed
                     ^
2 errors`,
        },
        {
          type: "list",
          items: [
            "In `early`, `c` is in scope after the `if`, because the only way past it is a successful match. This is flow scoping, and it's the form I use most for guard clauses.",
            "In `broken`, the body runs if **either** side is true, so `v` may not be a `Car`, and `c` simply doesn't exist there.",
            "A `Bike` can never be a `Car` (classes have single inheritance and neither extends the other), so `javac` refuses the cast. Casting to an interface is different: a non-final class might have a subclass that implements it, so the compiler usually has to allow it.",
            "Java 21 also accepts patterns that always match, like `car instanceof Vehicle v` with `car` declared as `Car`. With `--release 17`, the same line fails with \"unconditional patterns in instanceof are not supported in -source 17\".",
          ],
        },
      ],
    },
    {
      title: "Pattern Matching for switch and Sealed Types",
      blocks: [
        {
          type: "paragraph",
          text: "Overriding puts the behaviour on each class. Java 21 added a second way to dispatch on type that puts all the cases in one place: a `switch` with type patterns (JEP 441) and record patterns (JEP 440), over a **sealed** hierarchy whose subtypes the compiler knows. Payment gateway webhooks are a good fit, because the event types are fixed by the gateway and the handling belongs to my service, not to the events:",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentWebhook.java",
          code: `import java.util.List;

sealed interface PaymentEvent permits Captured, Failed, Refunded { }

record Captured(String orderId, long paise) implements PaymentEvent { }
record Failed(String orderId, String reason, boolean retryable) implements PaymentEvent { }
record Refunded(String orderId, long paise) implements PaymentEvent { }

public class PaymentWebhook {
    static String handle(PaymentEvent event) {
        return switch (event) {
            case Captured(String order, long paise) when paise >= 500_000 ->
                    "hold " + order + " for review: " + paise / 100 + " rupees";
            case Captured(String order, long paise) ->
                    "mark " + order + " paid: " + paise / 100 + " rupees";
            case Failed(String order, String reason, boolean retryable) when retryable ->
                    "retry " + order + " (" + reason + ")";
            case Failed f ->
                    "ask customer to change method for " + f.orderId() + ": " + f.reason();
            case Refunded(var order, var paise) ->
                    "credit account for " + order + ": " + paise / 100 + " rupees";
        };                                               // no default: the compiler checked every case
    }

    public static void main(String[] args) {
        List<PaymentEvent> events = List.of(
                new Captured("O-101", 24_000),
                new Captured("O-102", 650_000),
                new Failed("O-103", "gateway timeout", true),
                new Failed("O-104", "card declined", false),
                new Refunded("O-105", 8_000));
        events.forEach(e -> System.out.println(handle(e)));
    }
}`,
        },
        {
          type: "output",
          text: `mark O-101 paid: 240 rupees
hold O-102 for review: 6500 rupees
retry O-103 (gateway timeout)
ask customer to change method for O-104: card declined
credit account for O-105: 80 rupees`,
        },
        {
          type: "list",
          items: [
            "`sealed ... permits` lists every direct subtype, so the compiler knows the hierarchy is complete. Records are implicitly `final`, so nothing can extend them either.",
            "A record pattern like `Captured(String order, long paise)` checks the type and pulls the components out through the accessors in one step. `var` works for component types too, as in the `Refunded` case.",
            "`when` adds a guard. If it's false, matching continues with the next case, which is how the second `Captured` case catches the small amounts.",
            "There's no `default`, and none is needed: every permitted subtype is covered, and the switch is **exhaustive**. The payoff comes when the hierarchy changes.",
            "A `null` event throws `NullPointerException` (the bytecode starts with `Objects.requireNonNull`), unless the switch has a `case null` branch.",
          ],
        },
        {
          type: "heading",
          text: "Adding a new event type",
        },
        {
          type: "paragraph",
          text: "When the gateway starts sending chargebacks, I add a permitted record and nothing else:",
        },
        {
          type: "code",
          language: "java",
          code: `sealed interface PaymentEvent permits Captured, Failed, Refunded, Chargeback { }
record Chargeback(String orderId, long paise, String disputeId) implements PaymentEvent { }`,
        },
        {
          type: "output",
          text: `PaymentWebhook.java:12: error: the switch expression does not cover all possible input values
        return switch (event) {
               ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The compiler found every switch that now misses a case. That's the whole point of combining sealed types with an exhaustive switch, and it only works without a `default` branch; Common Mistakes shows what a `default` does here.",
        },
        {
          type: "heading",
          text: "When the switch isn't recompiled",
        },
        {
          type: "paragraph",
          text: "The compile error only protects code that gets recompiled. To see what happens otherwise, as when one module or service ships before another, I split the events and the switch into separate files:",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentEvent.java (v1)",
          code: `sealed interface PaymentEvent permits Captured, Refunded { }

record Captured(String orderId, long paise) implements PaymentEvent { }
record Refunded(String orderId, long paise) implements PaymentEvent { }`,
        },
        {
          type: "code",
          language: "java",
          title: "Ledger.java",
          code: `public class Ledger {
    static String post(PaymentEvent event) {
        return switch (event) {
            case Captured c -> "credit " + c.paise() + " for " + c.orderId();
            case Refunded r -> "debit " + r.paise() + " for " + r.orderId();
        };
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "PaymentEvent.java (v2)",
          code: `sealed interface PaymentEvent permits Captured, Refunded, Chargeback { }

record Captured(String orderId, long paise) implements PaymentEvent { }
record Refunded(String orderId, long paise) implements PaymentEvent { }
record Chargeback(String orderId, long paise, String disputeId) implements PaymentEvent { }`,
        },
        {
          type: "code",
          language: "java",
          title: "Gateway.java",
          code: `public class Gateway {
    public static void main(String[] args) {
        System.out.println(Ledger.post(new Captured("O-201", 24_000)));
        System.out.println(Ledger.post(new Chargeback("O-202", 24_000, "D-77")));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac PaymentEvent.java Ledger.java     # v1: the switch is exhaustive
# replace PaymentEvent.java with v2, rebuild it and the new caller only
javac PaymentEvent.java Gateway.java
java Gateway
javac Ledger.java                       # what rebuilding Ledger would have said`,
        },
        {
          type: "output",
          text: `credit 24000 for O-201
Exception in thread "main" java.lang.MatchException
\tat Ledger.post(Ledger.java:3)
\tat Gateway.main(Gateway.java:4)

Ledger.java:3: error: the switch expression does not cover all possible input values
        return switch (event) {
               ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The stale `Ledger.class` met a `Chargeback` it had never heard of and threw `java.lang.MatchException`, new in Java 21. `javac` compiles an exhaustive pattern switch with a hidden fallback branch that throws it, because exhaustiveness is a compile-time promise that a later class change can break. So the rule for adding a subtype is: rebuild everything that switches on the hierarchy before anything starts producing the new type.",
        },
        {
          type: "heading",
          text: "Two ways to dispatch on type",
        },
        {
          type: "table",
          headers: ["", "Overriding (OO dispatch)", "Pattern switch over a sealed type"],
          rows: [
            ["Where the logic lives", "In each class", "In one method, per operation"],
            ["Adding a new type", "One new class; no existing code changes", "Every switch must handle it; the compiler lists them"],
            ["Adding a new operation", "A new method in every class", "One new method with one switch"],
            ["Set of types", "Open: anyone can add a subclass", "Closed: `permits` lists them all"],
            ["Best for", "Behaviour that belongs to the type: tolls, notifications, payment gateways", "Data owned by someone else: events, messages, parsed JSON, ASTs"],
            ["Safety net", "Abstract methods force an implementation", "Exhaustiveness check, `MatchException` at run time"],
          ],
        },
        {
          type: "paragraph",
          text: "That table is the old **expression problem**: one style makes new types cheap, the other makes new operations cheap. My rule of thumb is that behaviour which belongs to a type goes on the type, and decisions that belong to one consumer of the data (a webhook handler, a report, an analytics export) go in that consumer's switch. Java 22 made the data-oriented style tidier with unnamed patterns: on JDK 25, `case Captured(_, long paise) ->` compiles and runs, while JDK 21 still rejects `_` as a preview feature.",
        },
      ],
    },
    {
      title: "Polymorphism Inside Constructors",
      blocks: [
        {
          type: "paragraph",
          text: "The object's class is fixed the moment `new` allocates it, before any constructor runs. So a virtual call from a superclass constructor already dispatches to the subclass, whose fields haven't been assigned yet. The Constructors lesson walks through the full initialization order; this is the dispatch side of it:",
        },
        {
          type: "code",
          language: "java",
          title: "ConstructorTrap.java",
          code: `class Vehicle {
    Vehicle() {
        System.out.println("Vehicle() sees toll(10) = " + toll(10));   // a virtual call
    }

    double toll(int km) { return 30 + km * 10.0; }
}

class Car extends Vehicle {
    private final double perKm;

    Car(double perKm) {
        super();                                         // Vehicle() runs before the next line
        this.perKm = perKm;
        System.out.println("Car() sees toll(10) = " + toll(10));
    }

    @Override
    double toll(int km) { return 50 + km * perKm; }
}

public class ConstructorTrap {
    public static void main(String[] args) {
        new Car(14.0);
    }
}`,
        },
        {
          type: "output",
          text: `Vehicle() sees toll(10) = 50.0
Car() sees toll(10) = 190.0`,
        },
        {
          type: "paragraph",
          text: "`Vehicle()` called `Car.toll`, and `perKm` was still `0.0`, its default, even though it's a `final` field. Nothing failed; the toll was just wrong. Java 25 made a cleaner fix possible with flexible constructor bodies (JEP 513): a constructor may assign its own fields before calling `super(...)`.",
        },
        {
          type: "code",
          language: "java",
          title: "ConstructorFix25.java",
          code: `class Vehicle {
    Vehicle() {
        System.out.println("Vehicle() sees toll(10) = " + toll(10));
    }

    double toll(int km) { return 30 + km * 10.0; }
}

class Car extends Vehicle {
    private final double perKm;

    Car(double perKm) {
        this.perKm = perKm;                              // Java 25: allowed before super()
        super();
        System.out.println("Car() sees toll(10) = " + toll(10));
    }

    @Override
    double toll(int km) { return 50 + km * perKm; }
}

public class ConstructorFix25 {
    public static void main(String[] args) {
        new Car(14.0);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `$JDK25/bin/javac ConstructorFix25.java && $JDK25/bin/java ConstructorFix25   # JDK 25.0.5
javac ConstructorFix25.java                                                     # JDK 21`,
        },
        {
          type: "output",
          text: `Vehicle() sees toll(10) = 190.0
Car() sees toll(10) = 190.0

ConstructorFix25.java:14: error: call to super must be first statement in constructor
        super();
             ^
1 error`,
        },
        {
          type: "paragraph",
          text: "On JDK 25 the field was set before `Vehicle()` ran, so both lines saw `190.0`. On JDK 21 the same file doesn't compile. Even with Java 25 available, the rule I follow is the older one: a constructor should only call methods that can't be overridden (`private`, `static` or `final`). The JEP 513 fix works only if the subclass author knows to use it.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `Vehicle v = new Car();` and `v.toll(10)` from `DispatchKinds`, from source to result:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`javac` compiles `v.toll(10)`. The declared type of `v` is `Vehicle`, so it searches `Vehicle` and its supertypes for methods named `toll`, finds `toll(int)`, checks that `10` fits and that the method is accessible, and notes the result type, `double`.",
            "`toll` is an instance method that isn't `private`, `static` or `final`, so the call needs dispatch. `javac` emits `invokevirtual #10 // Method Vehicle.toll:(I)D`. The class file names `Vehicle`, never `Car`.",
            "Compiling `Car`, `javac` sees that `toll(int)` matches `Vehicle.toll(int)`, so it's an override, and checks the rules: return type `double`, access `public`, no new checked exceptions. `super.toll(km)` becomes `invokespecial Vehicle.toll`.",
            "At run time, `new Car` needs `Car` loaded, which loads `Vehicle` (and `Object`) first. Linking `Car` builds its vtable: a copy of `Vehicle`'s, with the `toll` slot pointing at `Car.toll`.",
            "`invokespecial Car.<init>` runs the constructors. `v` now holds a reference to an object whose header points at `Car`.",
            "The first time `invokevirtual #10` executes, the JVM resolves `Vehicle.toll:(I)D`: it finds the method in `Vehicle`, checks access, and caches the slot number.",
            "On every execution, the JVM pops the argument and the receiver, throws `NullPointerException` if the receiver is `null`, reads the class pointer from the object's header, takes the method at the cached slot of `Car`'s vtable, and invokes `Car.toll` in a new frame.",
            "`Car.toll` calls `Vehicle.toll` through `invokespecial` (no dispatch), gets `130.0`, adds `20` and returns `150.0` to `main`.",
            "If the call site gets hot, C2 compiles the caller and, using CHA or the receiver profile, inlines `Car.toll` behind a class check. From then on the vtable isn't consulted at all.",
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
          title: "PolymorphismSyntax.java",
          code: `import java.util.List;

class Price {
    final double amount;
    Price(double amount) { this.amount = amount; }

    @Override                                            // overriding Object.toString
    public String toString() { return "Price " + amount; }
}

class SalePrice extends Price {
    SalePrice(double amount) { super(amount); }

    @Override
    public String toString() { return "Sale" + super.toString(); }    // reuse the parent's version
}

class Pricer {
    Price quote(int units) { return new Price(30 + units * 10.0); }
    Price quote(int units, double discount) {                           // overload
        return new Price((30 + units * 10.0) * (1 - discount));
    }
}

class SalePricer extends Pricer {
    @Override
    SalePrice quote(int units) { return new SalePrice((30 + units * 10.0) * 0.8); }   // covariant
}

sealed interface Vehicle permits Bike, Car { }           // a closed set of types
record Bike(int helmets) implements Vehicle { }
record Car(boolean ac) implements Vehicle { }

public class PolymorphismSyntax {
    static String describe(Vehicle v) {
        return switch (v) {                              // pattern switch, no default needed
            case Bike(int helmets) when helmets > 1 -> "bike with a spare helmet";
            case Bike b -> "bike";
            case Car(boolean ac) -> ac ? "AC car" : "car";
        };
    }

    public static void main(String[] args) {
        Pricer p = new SalePricer();                     // upcast
        System.out.println(p.quote(10));                 // override picked at run time
        System.out.println(p.quote(10, 0.25));           // overload picked at compile time

        Object o = p.quote(5);
        if (o instanceof SalePrice s) {                  // type pattern
            System.out.println("sale amount " + s.amount);
        }
        SalePricer sp = (SalePricer) p;                  // downcast
        SalePrice direct = sp.quote(1);                  // no cast needed thanks to the covariant return
        System.out.println(direct);

        for (Vehicle v : List.of(new Bike(2), new Bike(1), new Car(true))) {
            System.out.println(describe(v));
        }
    }
}`,
        },
        {
          type: "output",
          text: `SalePrice 104.0
Price 97.5
sale amount 64.0
SalePrice 32.0
bike with a spare helmet
bike
AC car`,
        },
        {
          type: "paragraph",
          text: "Every form in one place: `@Override` on a class method and on `Object.toString`, `super.toString()` to extend rather than replace, an overload next to an override, a covariant return that lets `sp.quote(1)` return a `SalePrice` without a cast, an upcast, a downcast, a type pattern, and a pattern switch with record patterns and a guard. `println(p.quote(10))` also shows the JDK's own dispatch: `println(Object)` calls `toString()` on whatever it's given, and got `SalePrice`'s version.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "One loop over many notification channels",
        },
        {
          type: "paragraph",
          text: "The most common shape of runtime polymorphism in a backend: a list of implementations of one interface, and one loop that doesn't know which is which.",
        },
        {
          type: "code",
          language: "java",
          title: "NotificationFanout.java",
          code: `import java.util.List;

interface Notifier {
    String channel();
    boolean send(String customerId, String message);
}

class SmsNotifier implements Notifier {
    public String channel() { return "sms"; }
    public boolean send(String customerId, String message) {
        String text = message.length() > 30 ? message.substring(0, 27) + "..." : message;   // SMS is short
        System.out.println("  sms  -> " + customerId + ": " + text);
        return true;
    }
}

class PushNotifier implements Notifier {
    public String channel() { return "push"; }
    public boolean send(String customerId, String message) {
        if (customerId.startsWith("guest-")) {               // guests have no app installed
            return false;
        }
        System.out.println("  push -> " + customerId + ": " + message);
        return true;
    }
}

class EmailNotifier implements Notifier {
    public String channel() { return "email"; }
    public boolean send(String customerId, String message) {
        System.out.println("  mail -> " + customerId + "@example.com: [Order update] " + message);
        return true;
    }
}

public class NotificationFanout {
    static int fanOut(List<Notifier> notifiers, String customerId, String message) {
        int delivered = 0;
        for (Notifier n : notifiers) {                       // one call site, three behaviours
            if (n.send(customerId, message)) {
                delivered++;
            } else {
                System.out.println("  " + n.channel() + " skipped for " + customerId);
            }
        }
        return delivered;
    }

    public static void main(String[] args) {
        List<Notifier> notifiers = List.of(new SmsNotifier(), new PushNotifier(), new EmailNotifier());
        System.out.println("asha:");
        System.out.println("delivered " + fanOut(notifiers, "asha", "Your order 1042 has shipped and arrives on Friday"));
        System.out.println("guest-17:");
        System.out.println("delivered " + fanOut(notifiers, "guest-17", "Order shipped"));
    }
}`,
        },
        {
          type: "output",
          text: `asha:
  sms  -> asha: Your order 1042 has shipped...
  push -> asha: Your order 1042 has shipped and arrives on Friday
  mail -> asha@example.com: [Order update] Your order 1042 has shipped and arrives on Friday
delivered 3
guest-17:
  sms  -> guest-17: Order shipped
  push skipped for guest-17
  mail -> guest-17@example.com: [Order update] Order shipped
delivered 2`,
        },
        {
          type: "diagram",
          text: ` List<Notifier>        objects on the heap       code that runs
┌──────────┐
│ [0]  ────┼───────►  SmsNotifier    ──────►  SmsNotifier.send
│ [1]  ────┼───────►  PushNotifier   ──────►  PushNotifier.send
│ [2]  ────┼───────►  EmailNotifier  ──────►  EmailNotifier.send
└──────────┘

 for (Notifier n : notifiers) n.send(customerId, message)
   one call site, one invokeinterface Notifier.send`,
          caption: "The list holds three references of declared type Notifier. Each object's class decides what send means.",
        },
        {
          type: "paragraph",
          text: "Each channel made its own decision: SMS truncated the text, push refused a guest, email added a subject. `fanOut` has no `if` on the channel type, so a WhatsApp notifier would be one new class and one more element in the list. With three classes, this call site is megamorphic, which is fine: notification sending is dominated by network I/O, not by a few nanoseconds of dispatch.",
        },
        {
          type: "heading",
          text: "super chains through three levels",
        },
        {
          type: "code",
          language: "java",
          title: "SalaryChain.java",
          code: `class Employee {
    double pay(int hours) {
        return 30 + hours * 10.0;
    }
}

class Manager extends Employee {
    @Override
    double pay(int hours) {
        return super.pay(hours) + 40;                    // extend the parent's rule
    }
}

class Director extends Manager {
    @Override
    double pay(int hours) {
        return super.pay(hours) * 1.25;                  // extend Manager's rule, which extends Employee's
    }
}

class TeamLead extends Manager {
    // no override: inherits Manager.pay
}

public class SalaryChain {
    public static void main(String[] args) {
        Employee[] staff = {new Employee(), new Manager(), new Director(), new TeamLead()};
        for (Employee e : staff) {
            System.out.printf("%-10s %6.1f%n", e.getClass().getSimpleName(), e.pay(10));
        }
    }
}`,
        },
        {
          type: "output",
          text: `Employee    130.0
Manager     170.0
Director    212.5
TeamLead    170.0`,
        },
        {
          type: "paragraph",
          text: "Dispatch always starts at the most specific class. For `Director`, `pay` ran `Director.pay`, whose `super.pay` ran `Manager.pay`, whose `super.pay` ran `Employee.pay`: (130 + 40) × 1.25 = 212.5. `TeamLead` has no override, so its vtable slot still points at `Manager.pay`. `super` is always relative to the class the code is written in, not to the object's class; that's why each `invokespecial` names a fixed parent.",
        },
        {
          type: "heading",
          text: "Lambdas are polymorphism too",
        },
        {
          type: "code",
          language: "java",
          title: "DiscountRules.java",
          code: `import java.util.LinkedHashMap;
import java.util.Map;

@FunctionalInterface
interface DiscountRule {
    double apply(double price);
}

public class DiscountRules {
    static double clearance(double price) {
        return price * 0.5;
    }

    public static void main(String[] args) {
        Map<String, DiscountRule> rules = new LinkedHashMap<>();
        rules.put("none", price -> price);                            // a lambda
        rules.put("member", price -> price * 0.9);                    // another lambda
        rules.put("clearance", DiscountRules::clearance);             // a method reference
        rules.put("capped", new DiscountRule() {                      // an anonymous class
            @Override
            public double apply(double price) {
                return Math.max(price * 0.7, price - 50);
            }
        });

        for (Map.Entry<String, DiscountRule> e : rules.entrySet()) {
            DiscountRule rule = e.getValue();
            System.out.printf("%-10s %6.1f   %s%n", e.getKey(), rule.apply(200),
                    rule.getClass().getName());
        }
    }
}`,
        },
        {
          type: "output",
          text: `none        200.0   DiscountRules$$Lambda/0x00007e93f0000c08
member      180.0   DiscountRules$$Lambda/0x00007e93f0001800
clearance   100.0   DiscountRules$$Lambda/0x00007e93f0001a20
capped      150.0   DiscountRules$1`,
        },
        {
          type: "paragraph",
          text: "Each lambda and method reference became an object of its own generated class implementing `DiscountRule`, and `rule.apply(200)` is an ordinary interface call that dispatches to whichever class the object has. The `$$Lambda/0x...` names are hidden classes spun up at run time, and the hex part changes every run. The anonymous class is a normal compiled class, `DiscountRules$1`. For a one-method strategy, a lambda is the lightest way to get runtime polymorphism; the Lambda Expressions lesson in the Java 8 track covers how they're linked through `invokedynamic`.",
        },
        {
          type: "heading",
          text: "The JDK calling my overrides",
        },
        {
          type: "code",
          language: "java",
          title: "JdkCallsMe.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

class Order implements Comparable<Order> {
    private final String id;
    private final double total;

    Order(String id, double total) {
        this.id = id;
        this.total = total;
    }

    @Override
    public int compareTo(Order other) {                  // called by Collections.sort
        return Double.compare(total, other.total);
    }

    @Override
    public String toString() {                           // called by println and List.toString
        return id + "(" + total + ")";
    }
}

public class JdkCallsMe {
    public static void main(String[] args) {
        List<Order> orders = new ArrayList<>(List.of(
                new Order("O1", 240.0), new Order("O2", 95.5), new Order("O3", 410.0)));
        Collections.sort(orders);                        // JDK code, compiled long before Order existed
        System.out.println(orders);
        System.out.println(Collections.max(orders));
        Object o = orders.get(0);
        System.out.println("as Object: " + o);
    }
}`,
        },
        {
          type: "output",
          text: `[O2(95.5), O1(240.0), O3(410.0)]
O3(410.0)
as Object: O2(95.5)`,
        },
        {
          type: "paragraph",
          text: "`Collections.sort` and `ArrayList.toString` were compiled into the JDK long before `Order` existed, yet they called `Order.compareTo` and `Order.toString`. That's the deepest reason polymorphism matters: a library written against `Comparable` and `Object` works with my classes without being recompiled. Spring, Jackson and every framework in a backend rely on it. Even `\"as Object: \" + o` dispatched to `Order.toString` through a reference declared as `Object`.",
        },
      ],
    },
    {
      title: "When to Use Polymorphism (and When Not To)",
      blocks: [
        {
          type: "paragraph",
          text: "Overriding is not the only way to vary behaviour by type, and it isn't always the best one. These are the choices I weigh, with a typical case for each:",
        },
        {
          type: "table",
          headers: ["Situation", "Reach for", "Example"],
          rows: [
            ["Behaviour differs by type, and new types keep arriving", "An interface (or abstract class) and one overriding class per type", "`area()` per `Shape`, a `Notifier` per channel, a `PaymentProcessor` per payment gateway"],
            ["A closed set of data types, and new operations keep arriving", "A sealed interface of records and a pattern `switch` in each consumer", "Gateway `PaymentEvent`s handled by the ledger, the refund job and the reports"],
            ["Only numbers differ by type", "A record or enum holding the numbers, ideally from config", "Base price and per-kg rate per shipping method, a tax rate per country"],
            ["The behaviour is chosen at run time, per customer or per campaign", "A strategy object looked up by key and injected", "A `DiscountPolicy` per campaign, switched without a deploy"],
            ["The same operation on unrelated argument types", "Overloading, or distinct names when the types are related", "`print(String)` and `print(Image)`; never `greet(Customer)` next to `greet(PremiumCustomer)`"],
            ["A one-off type check at a boundary", "An `instanceof` pattern", "Unwrapping an exception's cause, a deserialised `Object`, `equals`"],
          ],
        },
        {
          type: "diagram",
          text: `Does behaviour (not just data) differ by type?
 ├─ no ──► one class + a record, enum or map of the values
 └─ yes ─► What gets added more often?
            ├─ new types ────────► interface + overriding (strategy)
            │                      Spring: inject List<Policy>
            └─ new operations ───► Is the set of types closed?
                                    ├─ yes ─► sealed + records +
                                    │         exhaustive switch
                                    └─ no ──► overriding, or a visitor`,
          caption: "The decision flow I run through. The capstone lesson, When to Use What in Java OOP, puts it next to the interface, abstract class and composition choices.",
        },
        {
          type: "list",
          items: [
            "If adding a type means editing code that has nothing to do with that type, the dispatch is in the wrong place.",
            "A method that answers a question about the type (`area`, `toll`, `channel`) belongs on the type. A decision that belongs to one consumer (how the ledger books a chargeback) belongs in that consumer's switch.",
            "No hierarchy for a single implementation. One class is fine until the second behaviour actually arrives; the Abstraction lesson calls that not abstracting too early.",
            "Never put `default` in a switch over a sealed type I own. It switches off the one check that made the switch safe.",
            "Overloads are for convenience variants of one operation. If the parameter types are related by inheritance, I use different names.",
            "Inheritance is not required for polymorphism. An interface, or a lambda for a one-method interface, gives the same dispatch without tying the classes into a hierarchy, which is why most of my strategies are interfaces.",
          ],
        },
        {
          type: "paragraph",
          text: "A right choice and a wrong one from the same checkout code. Right: a `DiscountPolicy` interface with one class per discount algorithm, because a bulk discount and a loyalty discount are computed by genuinely different code. Wrong: `StandardShipping`, `ExpressShipping` and `OvernightShipping` subclasses whose only difference is two numbers. That's data, and adding a shipping method should be a config change, not a new class. In this program the rates are a record in a map, and only the discount algorithms use polymorphism:",
        },
        {
          type: "code",
          language: "java",
          title: "PricingChoice.java",
          code: `import java.util.List;
import java.util.Map;

record ShippingRate(double base, double perKg) {         // what varies is data: a record
    double cost(double kg) { return base + perKg * kg; }
}

interface DiscountPolicy {                               // what varies is the algorithm: polymorphism
    double discount(double subtotal, int items, int loyaltyYears);
}

class NoDiscount implements DiscountPolicy {
    public double discount(double subtotal, int items, int years) { return 0; }
}

class BulkDiscount implements DiscountPolicy {
    public double discount(double subtotal, int items, int years) {
        if (items >= 10) return subtotal * 0.15;
        if (items >= 5) return subtotal * 0.05;
        return 0;
    }
}

class LoyaltyDiscount implements DiscountPolicy {
    public double discount(double subtotal, int items, int years) {
        return Math.min(100, subtotal * 0.04 * years);   // 4% per year, capped at 100
    }
}

public class PricingChoice {
    public static void main(String[] args) {
        Map<String, ShippingRate> rates = Map.of(        // a new shipping method is one more entry
                "STANDARD", new ShippingRate(40, 10),
                "EXPRESS", new ShippingRate(80, 15),
                "OVERNIGHT", new ShippingRate(150, 20));
        double shipping = rates.get("EXPRESS").cost(8);
        System.out.println("EXPRESS for 8 kg: " + shipping);

        double subtotal = 1200;                          // 12 items, a customer of 3 years
        List<DiscountPolicy> policies = List.of(new NoDiscount(), new BulkDiscount(), new LoyaltyDiscount());
        for (DiscountPolicy policy : policies) {
            double d = policy.discount(subtotal, 12, 3);
            System.out.printf("%-16s -%5.1f -> total %.1f%n",
                    policy.getClass().getSimpleName(), d, subtotal - d + shipping);
        }
    }
}`,
        },
        {
          type: "output",
          text: `EXPRESS for 8 kg: 200.0
NoDiscount       -  0.0 -> total 1400.0
BulkDiscount     -180.0 -> total 1220.0
LoyaltyDiscount  -100.0 -> total 1300.0`,
        },
        {
          type: "paragraph",
          text: "Three shipping methods cost three map entries and zero classes. Three discount rules cost three classes, because the same order of 12 items for a three-year customer really is computed three different ways: nothing, 15% for ten or more items, and 4% per year capped at 100. A fourth campaign with its own rule would be a fourth class; a change to the express per-kg rate would be data.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Expecting the argument's runtime class to pick the overload",
        },
        {
          type: "paragraph",
          text: "Line 1 of `OverloadMeetsOverride` printed `OnlineShop.greet(Customer)` for a `PremiumCustomer` argument, because overloads are chosen from declared types and only the receiver is dispatched at run time. The fix is to stop overloading on parameter types related by inheritance.",
        },
        {
          type: "heading",
          text: "Overloading when I meant to override",
        },
        {
          type: "paragraph",
          text: "`toll(Integer)` next to an inherited `toll(int)` printed the vehicle toll, `130.0`, for a `Car` in `OverloadByAccident`. `@Override` on every override turns this into a compile error.",
        },
        {
          type: "heading",
          text: "instanceof chains in the wrong order",
        },
        {
          type: "code",
          language: "java",
          title: "InstanceofChain.java",
          code: `class Vehicle { }
class Bike extends Vehicle { }
class Car extends Vehicle { }
class ElectricCar extends Car { }                        // added later

public class InstanceofChain {
    static double perKm(Vehicle v) {
        if (v instanceof Bike) {
            return 6;
        } else if (v instanceof Car) {
            return 14;
        } else if (v instanceof ElectricCar) {                 // added with ElectricCar, never reached
            return 12;
        }
        return 0;
    }

    public static void main(String[] args) {
        for (Vehicle v : new Vehicle[] {new Bike(), new Car(), new ElectricCar()}) {
            System.out.println(v.getClass().getSimpleName() + " per km: " + perKm(v));
        }
    }
}`,
        },
        {
          type: "output",
          text: `Bike per km: 6.0
Car per km: 14.0
ElectricCar per km: 14.0`,
        },
        {
          type: "paragraph",
          text: "An `ElectricCar` is a `Car`, so it matched the second branch and the new branch is dead code. `javac` said nothing. The same order in a pattern switch is a compile error:",
        },
        {
          type: "code",
          language: "java",
          title: "SwitchOrder.java",
          code: `class Vehicle { }
class Bike extends Vehicle { }
class Car extends Vehicle { }
class ElectricCar extends Car { }

public class SwitchOrder {
    static double perKm(Vehicle v) {
        return switch (v) {
            case Bike b -> 6;
            case Car c -> 14;
            case ElectricCar e -> 12;
            default -> 0;
        };
    }
}`,
        },
        {
          type: "output",
          text: `SwitchOrder.java:11: error: this case label is dominated by a preceding case label
            case ElectricCar e -> 12;
                 ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Better still is no type test at all: a `perKm()` method on each class can't be ordered wrongly.",
        },
        {
          type: "heading",
          text: "A default branch in a switch over a sealed type",
        },
        {
          type: "code",
          language: "java",
          title: "DefaultHides.java",
          code: `sealed interface PaymentEvent permits Captured, Refunded, Chargeback { }
record Captured(String orderId, long paise) implements PaymentEvent { }
record Refunded(String orderId, long paise) implements PaymentEvent { }
record Chargeback(String orderId, long paise, String disputeId) implements PaymentEvent { }  // added later

public class DefaultHides {
    static String handle(PaymentEvent event) {
        return switch (event) {
            case Captured c -> "mark " + c.orderId() + " paid";
            case Refunded r -> "credit account for " + r.orderId();
            default -> "ignored";                        // written "just in case", now swallows chargebacks
        };
    }

    public static void main(String[] args) {
        System.out.println(handle(new Captured("O-301", 24_000)));
        System.out.println(handle(new Chargeback("O-302", 24_000, "D-81")));
    }
}`,
        },
        {
          type: "output",
          text: `mark O-301 paid
ignored`,
        },
        {
          type: "paragraph",
          text: "It compiled cleanly after `Chargeback` was added, and a disputed payment was silently ignored. Without the `default`, `javac` would have reported \"the switch expression does not cover all possible input values\", as in the pattern matching section.",
        },
        {
          type: "heading",
          text: "Downcasting without checking",
        },
        {
          type: "paragraph",
          text: "`(Car) other` on a `Bike` compiled and then threw \"class Bike cannot be cast to class Car\" in `Casting`. A downcast is a claim the compiler can't verify. An `instanceof` pattern makes the check explicit; needing many of them usually means a method is missing from the parent type.",
        },
        {
          type: "heading",
          text: "Calling an overridable method from a constructor",
        },
        {
          type: "paragraph",
          text: "`ConstructorTrap` printed `toll(10) = 50.0` from `Vehicle()`, because `Car.toll` ran before `perKm` was assigned. Constructors should call only `private`, `static` or `final` methods.",
        },
        {
          type: "heading",
          text: "Expecting fields or static methods to dispatch",
        },
        {
          type: "paragraph",
          text: "`v.type` printed `vehicle` and `v.category()` printed `Vehicle.category()` for a `Car` in `NotPolymorphic`. Fields should be private and reached through methods, which do dispatch, and static methods should be called through the class name so nobody expects otherwise.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Put `@Override` on every override, including interface implementations and `toString`. It costs nothing and turns signature slips into compile errors.",
            "Declare variables, parameters and fields with the most general type that offers what the code needs: `List<Notifier>`, `PaymentProcessor`, `Shape`. The concrete class should appear only where the object is created, or in Spring's wiring.",
            "Keep the substitutability promise. An override should accept everything the parent accepts and guarantee everything it guarantees; the compiler checks the signature, but only I can check the behaviour (the Inheritance lesson's LSP section).",
            "Prefer a method on the type over `instanceof` checks in the callers. Keep `instanceof` patterns for boundaries: deserialisation, exception handling, `equals`.",
            "For a closed set of data types, use a sealed interface, records and an exhaustive switch without `default`, and rebuild every consumer when a subtype is added.",
            "Don't overload methods on parameter types related by inheritance; use different names.",
            "Never call overridable methods from constructors.",
            "Make classes or methods `final` when they aren't designed for extension, for correctness rather than speed. Sealed hierarchies are the middle ground when a few known subclasses are intended.",
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
            "A virtual call that isn't inlined costs a few loads and an indirect jump: class pointer, vtable slot, branch. An interface call adds the itable search.",
            "C2 inlines a virtual call when CHA proves a single implementation, or when the receiver profile shows one or two classes (behind a class check), or one class at 90% or more. `CallSiteShapes` and `ChaDemo` showed each case.",
            "Megamorphic call sites, three or more receiver classes with none dominant, stay real calls through the vtable or itable. The real cost is less the lookup than the lost optimisation: the JIT can't see through the call, so it can't optimise the caller and callee together.",
            "`final` on methods and classes isn't needed for speed. With CHA, a method that has one implementation is bound directly anyway, and loading a second one deoptimises safely.",
            "A pattern switch isn't a chain of `instanceof` tests in the bytecode. `javap -c` on `PaymentWebhook` shows `invokedynamic typeSwitch` (bootstrapped by `java.lang.runtime.SwitchBootstraps.typeSwitch` with the case classes as arguments), then a `tableswitch` on the index it returns. A failed `when` guard stores the next case index and jumps back to the `invokedynamic`.",
          ],
        },
        {
          type: "paragraph",
          text: "For a rough idea of the size of the effect, I timed the `total` loop from `CallSiteShapes` after a warm-up:",
        },
        {
          type: "code",
          language: "java",
          title: "DispatchTiming.java",
          code: `abstract class Vehicle {
    abstract double toll(int km);
}

class Bike extends Vehicle  { double toll(int km) { return 20 + km * 6.0; } }
class Bus extends Vehicle   { double toll(int km) { return 30 + km * 11.0; } }
class Truck extends Vehicle { double toll(int km) { return 50 + km * 15.0; } }
class Van extends Vehicle   { double toll(int km) { return 45 + km * 13.0; } }

public class DispatchTiming {
    static double total(Vehicle[] vehicles, int km) {
        double sum = 0;
        for (Vehicle v : vehicles) {
            sum += v.toll(km);
        }
        return sum;
    }

    public static void main(String[] args) {
        int kinds = Integer.parseInt(args[0]);
        Vehicle[] all = {new Bike(), new Bus(), new Truck(), new Van()};
        Vehicle[] vehicles = new Vehicle[1_000];
        for (int i = 0; i < vehicles.length; i++) {
            vehicles[i] = all[i % kinds];
        }
        double sink = 0;
        for (int round = 0; round < 50_000; round++) {       // warm-up: let C2 compile total
            sink += total(vehicles, round % 30);
        }
        long start = System.nanoTime();
        for (int round = 0; round < 200_000; round++) {
            sink += total(vehicles, round % 30);
        }
        long ns = System.nanoTime() - start;
        System.out.printf("%d kind(s): %.2f ns per call (%s)%n",
                kinds, ns / (200_000.0 * vehicles.length), sink > 0 ? "ok" : "?");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `for k in 1 2 3 4; do java DispatchTiming $k; done      # three rounds`,
        },
        {
          type: "table",
          headers: ["Receiver classes at the call site", "Run 1", "Run 2", "Run 3"],
          rows: [
            ["1 (monomorphic, inlined)", "1.00 ns", "1.03 ns", "1.07 ns"],
            ["2 (bimorphic, inlined)", "1.13 ns", "1.18 ns", "0.98 ns"],
            ["3 (megamorphic, virtual call)", "4.97 ns", "4.60 ns", "4.79 ns"],
            ["4 (megamorphic, virtual call)", "5.09 ns", "4.72 ns", "4.99 ns"],
          ],
        },
        {
          type: "paragraph",
          text: "These are my machine's numbers on JDK 21, from a hand-rolled loop rather than JMH, with other JVMs running at the same time, so treat them as rough. The shape held in all three rounds: inlined sites cost about a nanosecond per call, megamorphic ones roughly four to five times more. In absolute terms that's about 5 ns per call, which matters only in loops doing millions of calls per request. For a service call that waits on a database or a payment gateway, dispatch cost is noise; design for clarity first, and measure with a profiler before restructuring for it.",
        },
      ],
    },
    {
      title: "Polymorphism in Production",
      blocks: [
        {
          type: "paragraph",
          text: "The design problem I'd expect in a ride-hailing backend that grew quickly: vehicle types are strings, and every service that cares about the type has its own `switch` on them. When EV launched, pricing and payouts were updated, and the rides service's cancellation-fee switch wasn't. Here are those three services as three methods:",
        },
        {
          type: "code",
          language: "java",
          title: "FareSwitchBefore.java",
          code: `import java.util.List;

public class FareSwitchBefore {
    // pricing-service: updated when EV launched
    static double fare(String type, double km) {
        return switch (type) {
            case "BIKE"  -> 20 + 6 * km;
            case "AUTO"  -> Math.max(40, 25 + 11 * km);
            case "SEDAN" -> 50 + 15 * km;
            case "EV"    -> 45 + 13 * km;
            default      -> throw new IllegalArgumentException("unknown vehicle type " + type);
        };
    }

    // rides-service: nobody remembered this one
    static double cancellationFee(String type) {
        return switch (type) {
            case "BIKE"  -> 10;
            case "AUTO"  -> 20;
            case "SEDAN" -> 50;
            default      -> 0;                           // looked harmless when it was written
        };
    }

    // payouts-service: updated for EV
    static double commissionRate(String type) {
        if (type.equals("BIKE") || type.equals("AUTO")) return 0.10;
        if (type.equals("SEDAN") || type.equals("EV")) return 0.20;
        throw new IllegalArgumentException("unknown vehicle type " + type);
    }

    public static void main(String[] args) {
        for (String type : List.of("BIKE", "AUTO", "SEDAN", "EV")) {
            double fare = fare(type, 8);
            System.out.printf("%-5s fare %5.1f  cancel fee %4.1f  driver gets %5.1f%n",
                    type, fare, cancellationFee(type), fare * (1 - commissionRate(type)));
        }
    }
}`,
        },
        {
          type: "output",
          text: `BIKE  fare  68.0  cancel fee 10.0  driver gets  61.2
AUTO  fare 113.0  cancel fee 20.0  driver gets 101.7
SEDAN fare 170.0  cancel fee 50.0  driver gets 136.0
EV    fare 149.0  cancel fee  0.0  driver gets 119.2`,
        },
        {
          type: "list",
          items: [
            "EV riders could cancel for free. Nothing crashed and nothing was logged; the `default -> 0` branch did exactly what it was written to do, for a type that didn't exist when it was written.",
            "The knowledge \"what an EV is\" was spread over three services, in three different styles (a switch expression, another one with a silent default, an `if` chain). A string type gives the compiler nothing to check.",
            "A test for each switch wouldn't have helped unless someone had remembered to add an EV case to it, which is the same thing they forgot in the code.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix is to make each vehicle type one class that answers every question about itself, and to let the compiler insist on the answers. With Spring (`org.springframework:spring-context:6.2.11` in Maven), each policy is a `@Component`, and the service takes all of them in its constructor:",
        },
        {
          type: "code",
          language: "java",
          title: "FareApp.java",
          code: `package fares;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

interface FarePolicy {
    String vehicleType();
    double fare(double km);
    double cancellationFee();
    double commissionRate();
}

@Component
class BikePolicy implements FarePolicy {
    public String vehicleType()     { return "BIKE"; }
    public double fare(double km)   { return 20 + 6 * km; }
    public double cancellationFee() { return 10; }
    public double commissionRate()  { return 0.10; }
}

@Component
class AutoPolicy implements FarePolicy {
    public String vehicleType()     { return "AUTO"; }
    public double fare(double km)   { return Math.max(40, 25 + 11 * km); }   // minimum fare
    public double cancellationFee() { return 20; }
    public double commissionRate()  { return 0.10; }
}

@Component
class SedanPolicy implements FarePolicy {
    public String vehicleType()     { return "SEDAN"; }
    public double fare(double km)   { return 50 + 15 * km; }
    public double cancellationFee() { return 50; }
    public double commissionRate()  { return 0.20; }
}

@Component
class EvPolicy implements FarePolicy {                     // the EV launch: this class, nothing else
    public String vehicleType()     { return "EV"; }
    public double fare(double km)   { return 45 + 13 * km; }
    public double cancellationFee() { return 40; }
    public double commissionRate()  { return 0.20; }
}

@Service
class FareService {
    private final Map<String, FarePolicy> byType;

    FareService(List<FarePolicy> policies) {               // every FarePolicy bean Spring found
        System.out.println("injected " + policies.stream()
                .map(p -> p.getClass().getSimpleName()).toList());
        this.byType = policies.stream()
                .collect(Collectors.toMap(FarePolicy::vehicleType, Function.identity()));
    }

    FarePolicy policyFor(String vehicleType) {
        FarePolicy policy = byType.get(vehicleType);
        if (policy == null) {
            throw new IllegalArgumentException("no fare policy for " + vehicleType);
        }
        return policy;
    }
}

public class FareApp {
    public static void main(String[] args) {
        try (var context = new AnnotationConfigApplicationContext("fares")) {
            FareService fares = context.getBean(FareService.class);
            for (String type : List.of("BIKE", "AUTO", "SEDAN", "EV")) {
                FarePolicy p = fares.policyFor(type);        // one lookup, then plain virtual calls
                double fare = p.fare(8);
                System.out.printf("%-5s fare %5.1f  cancel fee %4.1f  driver gets %5.1f%n",
                        type, fare, p.cancellationFee(), fare * (1 - p.commissionRate()));
            }
            try {
                fares.policyFor("TRUCK");
            } catch (IllegalArgumentException e) {
                System.out.println(e.getMessage());
            }
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp "$SPRING" -d out FareApp.java       # $SPRING: the spring-context 6.2.11 jars
java -cp "$SPRING:out" fares.FareApp`,
        },
        {
          type: "output",
          text: `injected [AutoPolicy, BikePolicy, EvPolicy, SedanPolicy]
BIKE  fare  68.0  cancel fee 10.0  driver gets  61.2
AUTO  fare 113.0  cancel fee 20.0  driver gets 101.7
SEDAN fare 170.0  cancel fee 50.0  driver gets 136.0
EV    fare 149.0  cancel fee 40.0  driver gets 119.2
no fare policy for TRUCK`,
        },
        {
          type: "paragraph",
          text: "If whoever writes `EvPolicy` forgets the cancellation fee, the build stops instead of production:",
        },
        {
          type: "output",
          text: `FareApp.java:43: error: EvPolicy is not abstract and does not override abstract method cancellationFee() in FarePolicy
class EvPolicy implements FarePolicy {                     // the EV launch: this class, nothing else
^
1 error`,
        },
        {
          type: "list",
          items: [
            "**The bug:** a `default` branch in one of three scattered switches gave a new type a wrong value silently. **The fix:** one class per vehicle type, and an interface whose abstract methods every type must implement. The same table came out, except EV's cancellation fee is now `40.0`, and the missing-method version doesn't compile.",
            "**Spring found the implementations itself.** Component scanning of the `fares` package registered the four `@Component` classes, and the constructor parameter `List<FarePolicy>` received every bean of that type, in the order the scan found them (alphabetical here). Launching EV meant adding `EvPolicy` and nothing else; `FareService` didn't change. If order mattered, `@Order` on the policies would set it.",
            "**The map is built once, at startup.** After that, each request is a hash lookup and plain interface calls. Unknown types fail loudly: `fares.policyFor(\"TRUCK\")` threw, and the program printed the message `no fare policy for TRUCK` after the table.",
            "**Duplicates fail fast too.** When I added a second `@Component` claiming `SEDAN`, the context refused to start, with `Caused by: java.lang.IllegalStateException: Duplicate key SEDAN (attempted merging values fares.NightSedanPolicy@78aab498 and fares.SedanPolicy@5dd6264)` under a `BeanCreationException` (the hex values are identity hash codes and change every run). A startup failure is far cheaper than two policies fighting over the same rides.",
            "Spring can also inject a `Map<String, FarePolicy>` keyed by bean name. I prefer keying by `vehicleType()`, so the key is part of the contract rather than a class-naming convention.",
          ],
        },
        {
          type: "paragraph",
          text: "The payment webhook from the pattern matching section is the other half of the same design: there the set of event types is owned by the gateway, so a sealed hierarchy with an exhaustive switch in each consumer is the better fit, and the compile error (or `MatchException` for a stale build) protects it the way abstract methods protect `FarePolicy`.",
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
              question: "What is polymorphism in Java?",
              answer:
                "The ability of one call, written against a general type, to run different code depending on the actual object. One call site, many behaviours. In Java it shows up as overloading, chosen at compile time, and overriding, chosen at run time.\n\nThe runtime kind is what makes it useful: code written once against `Vehicle` works for every subclass, including ones written later. In `DeclaredVsRuntime`, the same variable `v` printed `car: 190.0 for 10 km` while it held a `Car`, and `bike: 80.0 for 10 km` after I pointed it at a `Bike`, through the same `describe()` call.",
            },
            {
              question: "What are the two kinds of polymorphism in Java?",
              answer:
                "Compile-time polymorphism, which is method overloading, and runtime polymorphism, which is method overriding plus dynamic dispatch. The first is decided by `javac`, the second by the JVM each time the call runs.\n\nThe bytecode shows the split. An overload choice is frozen into the call site as an exact descriptor, like `Shop.greet:(LCustomer;)` in `OverloadMeetsOverride`. An overridable call is one `invokevirtual` that reached `OnlineShop.greet(Customer)` at run time, even though the class file names `Shop`.",
            },
            {
              question: "What's the difference between overloading and overriding?",
              answer:
                "Overloading is several methods with the same name and different parameter lists, picked by the compiler from the declared argument types. Overriding is a subclass giving its own body to an inherited instance method with the same signature, picked by the JVM from the receiver's runtime class.\n\nThe other differences follow from that. An overload can have any return type, access or exceptions, and `static`, `private` and `final` methods can all be overloaded. An override must keep the signature, return the same type or a subtype, not reduce access and not add broader checked exceptions, and `static`, `private` and `final` methods can't be overridden. The Technical Picture has them side by side in a table.",
            },
            {
              question: "What does @Override do, and is it required?",
              answer:
                "It asks the compiler to confirm that the method really overrides or implements a method from a supertype. It isn't required, but without it a signature slip silently becomes an overload.\n\nThat's exactly what `OverloadByAccident` did: `toll(Integer)` in `Car` didn't override `toll(int)`, so `v.toll(10)` printed the vehicle's `130.0` instead of the car's `190.0`. With `@Override`, the same code failed with \"method does not override or implement a method from a supertype\". A misspelled name gets the same error.",
            },
            {
              question: "What are upcasting and downcasting?",
              answer:
                "Upcasting is treating a subclass reference as its supertype, `Vehicle v = car;`. It's implicit and always safe. Downcasting goes the other way, `Car c = (Car) v;`. It needs an explicit cast and is checked at run time.\n\nIn the bytecode, the upcast was just `aload_1`, `astore_2`, a copy of the reference, while every downcast became a `checkcast` instruction. That instruction is what throws `ClassCastException` when the object isn't really a `Car`. Neither kind changes the object; in `Casting`, `back == car` printed `true`.",
            },
            {
              question: "Can a static method be overridden?",
              answer:
                "No. A static method with the same signature in a subclass hides the parent's method; it doesn't override it. Which one runs is decided by the declared type at compile time.\n\nIn `NotPolymorphic`, `v.category()` on a `Car` printed `Vehicle.category()`, and `javap` showed `invokestatic Vehicle.category`. Mixing the two is a compile error: an instance method can't replace a static one (\"overridden method is static\") and a static method can't replace an instance one (\"overriding method is static\").",
            },
            {
              question: "Can private or final methods be overridden?",
              answer:
                "No to both, but they fail differently. A `final` method gives a compile error, \"overridden method is final\". A `private` method isn't inherited, so a same-named method in a subclass compiles fine and is simply unrelated.\n\nThe private case is the one that surprises people. In `PrivateRule`, `label()` called `code()` on a `Car` and still got `Vehicle`'s private version, printing `[VEH]`, while calling `car.code()` directly printed `CAR`. Putting `@Override` on the subclass method is the quickest way to find out.",
            },
            {
              question: "Can constructors be overridden?",
              answer:
                "No. Constructors aren't inherited at all, so there's nothing to override. Each class declares its own, and a subclass constructor always runs a superclass constructor first through `super(...)`, written or implicit.\n\nWhat a constructor can do is call an overridable method, and that call does dispatch. In `ConstructorTrap`, `Vehicle()` called `toll(10)` and reached `Car.toll` before `Car`'s field was assigned, printing `50.0` instead of `190.0`. The Constructors lesson covers the initialization order behind it.",
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
              question: "What is dynamic method dispatch?",
              answer:
                "The mechanism that picks an overriding method at run time from the class of the object the call is made on, not from the declared type of the variable. It's how runtime polymorphism works.\n\n`javac` compiles `v.toll(10)` to `invokevirtual Vehicle.toll:(I)D`, naming only the declared type. JVMS 5.4.6 then says the JVM selects the first override found by walking up from the receiver's class. In `DispatchKinds` that was `Car.toll`, which printed `150.0`.",
            },
            {
              question: "Are fields polymorphic?",
              answer:
                "No. A field with the same name in a subclass hides the parent's field, and which one is read depends on the declared type of the reference. Only instance methods are dispatched.\n\nIn `NotPolymorphic`, `v.type` printed `vehicle` for a `Car`, because it compiled to `getfield Vehicle.type`. `((Car) v).type` printed `car`, because the cast changed the declared type. That's one more reason to keep fields private and read them through methods, which do dispatch.",
            },
            {
              question: "What is a covariant return type?",
              answer:
                "An overriding method may declare a return type that's a subtype of the parent method's return type. It arrived in Java 5 and only applies to reference types; primitives must match exactly.\n\nIn `Bridges`, `Vehicle.quote` returns `Quote` and `Car.quote` returns `PremiumQuote`, so `new Car().quote(10)` gave me a `PremiumQuote` with no cast. Because the class file identifies methods by descriptor, including the return type, `javac` also generated a bridge method to make the override work for callers holding a `Vehicle`.",
            },
            {
              question: "What are the exception rules when overriding a method?",
              answer:
                "An override may throw the same checked exceptions as the parent, subclasses of them, fewer, or none. It can't add a new or broader checked exception. Unchecked exceptions are unrestricted.\n\nThe reason is substitutability: a caller holding a `Vehicle` only handles what `Vehicle.toll` declares. In `OverrideRules`, `Bus.toll` declaring `throws Exception` failed with \"overridden method does not throw Exception\", while variants that threw the same exception, a subclass of it, or nothing compiled cleanly.",
            },
            {
              question: "What are the access-modifier rules for overriding?",
              answer:
                "An override can keep the same access or widen it (package-private to `protected` to `public`), but never narrow it. Anything a caller of the parent could call, it must still be able to call on the subclass.\n\nMaking `Bike.toll` package-private when `Vehicle.toll` is `public` gave \"attempting to assign weaker access privileges; was public\". The common real case is an interface implementation without `public`, since interface methods are implicitly `public`: \"send(String) in SmsNotifier cannot implement send(String) in Notifier\".",
            },
            {
              question: "What causes ClassCastException, and how do you avoid it?",
              answer:
                "A downcast to a class the object isn't an instance of. The cast compiles because the declared type might be that class, and the `checkcast` instruction fails at run time.\n\nThe JDK's message is specific: `class Bike cannot be cast to class Car (Bike and Car are in unnamed module of loader 'app')` in `Casting`. I avoid it by testing first with an `instanceof` pattern, and even better by not needing the cast: if callers keep downcasting to reach a method, that method usually belongs on the parent type.",
            },
            {
              question: "How does pattern matching for instanceof work, and where is the binding variable in scope?",
              answer:
                "`v instanceof Car c` tests the type, casts and binds the result to `c` in one step. It was finalized in Java 16 by JEP 394. The variable is in scope only where the compiler can prove the test succeeded, which is called flow scoping.\n\nSo `c` works on the right of `&&`, and after `if (!(v instanceof Car c)) return ...;` it's usable for the rest of the method. In `CastErrors`, using `c` inside `if (v instanceof Car c || v.toll(1) > 100)` failed with \"cannot find symbol ... variable c\", because that branch also runs when `v` isn't a `Car`. Also, `null instanceof Car` is `false`, so the test doubles as a null check.",
            },
            {
              question: "If a superclass method calls another method on this, which version runs?",
              answer:
                "The most specific override for the object's runtime class. A call on `this` is an ordinary virtual call, even from inside the parent's code.\n\nIn `DeclaredVsRuntime`, `describe()` is defined only in `Vehicle`, but on a `Car` it printed `car: 190.0 for 10 km`, because its calls to `name()` and `toll(10)` dispatched to `Car`'s versions. That's the basis of the template method pattern in the Abstraction lesson, and also the root of the constructor trap.",
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
              question: "How does HotSpot implement a virtual method call?",
              answer:
                "With a vtable per class: an array of method pointers built when the class is linked. It starts as a copy of the superclass's vtable, an override replaces the pointer in its parent's slot, and new overridable methods are appended. A call is then: load the class pointer from the object's header, load the method at the resolved slot, jump.\n\nI read the real tables with the Serviceability Agent in `VtableDump`. `Vehicle` had 7 slots, five from `Object` plus `toll` and `describe`. `Car` had 8, with slot 5 replaced by `Car.toll` and `doors` appended as slot 7, and `Bike` replaced the same slot 5. The JVM specification only defines which method must be selected; the vtable is HotSpot's way of doing it fast.",
            },
            {
              question: "How is invokeinterface different from invokevirtual?",
              answer:
                "`invokeinterface` is used when the declared type is an interface. Fixed slot numbers can't work there, because a class can implement any number of interfaces in any order, so HotSpot also gives each class an itable: one block of method pointers per implemented interface. The call first finds the interface's block in the receiver's class, then indexes into it.\n\nIn `DispatchKinds`, the same `Car` object reached through `Pricing p` compiled to `invokeinterface Pricing.toll:(I)D` and through `Vehicle v` to `invokevirtual Vehicle.toll:(I)D`, with the same result. In hot code the JIT usually inlines both, so the extra search mostly matters at megamorphic interface call sites.",
            },
            {
              question: "What is a bridge method, and when does javac generate one?",
              answer:
                "A synthetic method `javac` adds so that an override still works at the JVM level when the descriptors differ, which happens with covariant return types and with generic overrides after erasure. It has the parent's descriptor and just calls the real method.\n\nWith `javap -p -v`, `Car` had two `quote(int)` methods: mine returning `PremiumQuote`, and one returning `Quote` with `flags: (0x1040) ACC_BRIDGE, ACC_SYNTHETIC` that did `invokevirtual quote:(I)LPremiumQuote;`. `Price implements Comparable<Price>` got a bridge `compareTo(java.lang.Object)` that does `checkcast Price` first. Reflection reports them through `Method.isBridge()`.",
            },
            {
              question: "Does polymorphism hurt performance?",
              answer:
                "Usually not measurably. The JIT inlines virtual calls when class hierarchy analysis proves one implementation, or when the call site's receiver profile shows one or two classes, so most hot calls aren't virtual calls at all. The cost appears at megamorphic sites, three or more receiver classes with none dominant, where the call stays an indirect call and blocks inlining.\n\n`PrintInlining` showed it in `CallSiteShapes`: `Bike::toll` inlined with one class, `Bike::toll` and `Bus::toll` both inlined with two, and `virtual call` with three. My rough timing was about 1 ns per call when inlined and about 5 ns megamorphic. That only matters in tight loops; next to a database call it's noise.",
            },
            {
              question: "What is class hierarchy analysis, and what happens when a new subclass is loaded later?",
              answer:
                "CHA is C2 using the set of currently loaded classes to prove that a virtual call has only one possible target, then binding and inlining it directly. The compiled code records that assumption as a dependency.\n\nIf a class that breaks it is loaded, HotSpot deoptimizes: the dependent compiled code is made not entrant and execution falls back until it's recompiled. In `ChaDemo`, C2 inlined `Car::toll` with no type profile, and loading `Bike` with `Class.forName`, without ever calling it, made both compiled versions of `total` \"made not entrant\". That's why `final` isn't needed for speed.",
            },
            {
              question: "What do invokevirtual, invokeinterface, invokespecial and invokestatic mean for dispatch?",
              answer:
                "`invokevirtual` and `invokeinterface` dispatch on the receiver's runtime class, through a class-typed or an interface-typed reference. `invokespecial` never dispatches; it's used for constructors and `super.m()` calls, which must run one specific method. `invokestatic` has no receiver at all.\n\n`DispatchKinds` had all four. `super.toll(km)` inside `Car` was `invokespecial Vehicle.toll`; if it dispatched, it would land back in `Car.toll` and recurse forever. One wrinkle: since Java 11, a call to a private method in the same class is `invokevirtual`, as `PrivateRule` showed, but JVMS 5.4.6 says a resolved private method is simply the selected one, so nothing is dispatched.",
            },
            {
              question: "How does a pattern switch over a sealed type work, and what happens if a subtype is added without recompiling it?",
              answer:
                "`javac` checks that the cases cover every permitted subtype, so no `default` is needed, and compiles the switch to an `invokedynamic` bootstrapped by `SwitchBootstraps.typeSwitch` followed by a `tableswitch` on the case index it returns. Guards that fail jump back with the next index. It also adds a hidden fallback that throws `MatchException`.\n\nIf I add `Chargeback` and recompile, every switch that doesn't handle it fails with \"the switch expression does not cover all possible input values\". If the switch's class isn't recompiled, as in my `Ledger` and `Gateway` demo, the stale code throws `java.lang.MatchException` when a `Chargeback` arrives. So exhaustiveness is a compile-time promise, and every consumer has to be rebuilt before anything produces the new type.",
            },
            {
              question: "Why is calling an overridable method from a constructor dangerous, and what did Java 25 change?",
              answer:
                "The object's class is fixed when `new` allocates it, so a virtual call in the superclass constructor already runs the subclass override, before the subclass constructor has assigned its fields. The override sees default values, even for `final` fields.\n\n`ConstructorTrap` printed `Vehicle() sees toll(10) = 50.0` because `perKm` was still `0.0`. Java 25's flexible constructor bodies (JEP 513) let the subclass assign its fields before `super()`, and on JDK 25 `ConstructorFix25` printed `190.0` twice; JDK 21 rejects it with \"call to super must be first statement in constructor\". I still follow the older rule: constructors call only `private`, `static` or `final` methods.",
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
              question: "A service has the same switch on a type string copied into several places, and adding a new type keeps breaking one of them. How would you fix it?",
              answer:
                "Turn the type string into a type: one interface with a method for every question the switches answer, and one class per type. The compiler then refuses a new type that doesn't answer every question, and no caller needs to change.\n\nThat's the production section's example. The scattered switches gave EV rides a cancellation fee of `0.0` through a forgotten `default`. With a `FarePolicy` interface, a missing method was a compile error, and with Spring injecting `List<FarePolicy>` into `FareService`, launching EV meant adding one `@Component` class. The constructor printed `injected [AutoPolicy, BikePolicy, EvPolicy, SedanPolicy]`, with no registration code anywhere.",
            },
            {
              question: "`Shop` has `greet(Customer)`; `OnlineShop` overrides it and adds `greet(PremiumCustomer)`. What does `Shop shop = new OnlineShop(); shop.greet(new PremiumCustomer())` print?",
              answer:
                "`OnlineShop.greet(Customer)`. Not the `PremiumCustomer` overload, even though both the receiver and the argument would match it.\n\nTwo steps, at two different times. At compile time, `javac` looks only in `Shop`, the declared type of `shop`, finds just `greet(Customer)`, and fixes the call as `Shop.greet:(LCustomer;)`. At run time, the JVM looks for the override of that exact signature in `OnlineShop` and runs it. The argument's runtime class is never considered, because Java dispatches on the receiver only. `OverloadMeetsOverride` printed exactly that on its first line.",
            },
            {
              question: "The payment gateway announces a new event type. How do you add it without silently mishandling it anywhere?",
              answer:
                "Model the events as a sealed interface of records and handle them with pattern switches that have no `default`. Adding the record to `permits` then makes every switch that doesn't handle it a compile error, and I rebuild and deploy every consumer before anything starts producing the new event.\n\nI saw both failure modes. In `DefaultHides`, a \"just in case\" `default` compiled cleanly and turned a chargeback into `ignored`. In the `Ledger` demo, a consumer compiled against the old hierarchy threw `MatchException` at run time. Without the `default`, `javac` reported \"the switch expression does not cover all possible input values\" at each switch.",
            },
            {
              question: "After `ElectricCar extends Car` was added, electric cars are charged the `Car` toll rate. The code has no errors. What's wrong?",
              answer:
                "An `instanceof` chain checks `Car` before `ElectricCar`. An `ElectricCar` is a `Car`, so the earlier branch matches and the new branch is unreachable, and `javac` doesn't warn about it in an if-else chain.\n\n`InstanceofChain` printed `ElectricCar per km: 14.0`. The same order in a pattern switch is a compile error, \"this case label is dominated by a preceding case label\". The real fix is to remove the type test: a `tollPerKm()` method that `ElectricCar` overrides can't be ordered wrongly.",
            },
            {
              question: "A checkout must pick a payment processor at run time by the customer's chosen method, and new methods are added often. How would you design it in Spring?",
              answer:
                "A `PaymentProcessor` interface with a `method()` key and the operations, one `@Component` per method, and a service that takes `List<PaymentProcessor>` in its constructor and builds a map from key to processor once at startup. Each request is then a map lookup followed by plain interface calls.\n\nIt's the same shape as the production section's `FareService`. A new method is one new class. An unknown key fails loudly, as `no fare policy for TRUCK` did, and two beans claiming the same key stop the context at startup, which I saw as `IllegalStateException: Duplicate key SEDAN`. I key by a method on the interface rather than by bean name, so the key is part of the contract.",
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
            "Write `ShapesDemo.java` with a class `Shape` that has `double area()` returning `0` and `String describe()` returning `getClass().getSimpleName() + \" area \" + area()`. Add `Circle(double r)` and `Rectangle(double w, double h)` that override `area()` with `@Override`. Loop over `List.of(new Circle(1), new Rectangle(2, 3), new Shape())` and print `describe()` for each.",
            "In `Rectangle`, misspell the method as `aera()` and keep `@Override`. Compile and read the error. Then remove `@Override`, compile again, and predict what the `Rectangle` line prints before running it.",
            "Add `class Printer { String print(Object o) { ... } }` and `class LaserPrinter extends Printer` that overrides `print(Object)` and adds `print(String s)`, each returning its own class and parameter type as text. With `Printer p = new LaserPrinter();`, predict and then print `p.print(\"hi\")`, `((LaserPrinter) p).print(\"hi\")` and `p.print(42)`.",
            "At the end of `main`, write `Shape s = new Circle(1); Rectangle r = (Rectangle) s;` and run it. Then rewrite it with an `instanceof` pattern so it prints a message instead of failing.",
            "Run `javap -c ShapesDemo | grep invoke` and find the instructions for the `describe()` call and the three `print` calls. Which class does each one name?",
            "In a separate folder, write `SealedShapes.java` with `sealed interface Shape permits Circle, Square`, two records, and a method `area(Shape s)` that uses a pattern `switch` with no `default`. Then add `Triangle(double base, double height)` to the `permits` list as a record, without touching the switch, and compile.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: `Circle area 3.141592653589793`, `Rectangle area 6.0` and `Shape area 0.0`. The misspelling fails with \"method does not override or implement a method from a supertype\"; without `@Override` it compiles and the rectangle prints `Rectangle area 0.0`, because `aera()` is a new method and `Shape.area()` was never overridden. The printer calls print `LaserPrinter.print(Object)`, `LaserPrinter.print(String)` and `LaserPrinter.print(Object)`: the `Printer` reference only knows `print(Object)`, and the cast changes which overload `javac` picks. The bad cast throws `ClassCastException: class Circle cannot be cast to class Rectangle (Circle and Rectangle are in unnamed module of loader 'app')`. In `javap`, the `describe()` call is `invokevirtual ... Shape.describe`, the first and third `print` calls name `Printer.print:(Ljava/lang/Object;)`, and only the cast one names `LaserPrinter.print:(Ljava/lang/String;)`. The sealed version fails with \"the switch expression does not cover all possible input values\" until `Triangle` gets a case.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `IDEA        one call site, many behaviours
COMPILE     overloading: javac picks the signature from the
            DECLARED types of receiver and arguments
RUN TIME    overriding: the JVM picks the body from the
            RUNTIME class of the receiver only
NOT VIRTUAL fields, static, private, constructors
            (final methods: can't be overridden)

OVERRIDE    same name + parameter types (else: an overload)
            return: same, or a subtype   (bridge method)
            access: same or wider
            checked exceptions: same, narrower or none
            @Override on every one

CASTS       upcast: implicit, no instruction
            downcast: checkcast -> ClassCastException
            if (v instanceof Car c) ...    Java 16, JEP 394
SWITCH      sealed + records + patterns + when
            exhaustive, no default       Java 21, JEP 440/441
            stale build -> MatchException

INVOKE      invokevirtual    class type     -> vtable slot
            invokeinterface  interface type -> itable
            invokespecial    super, <init>  -> no dispatch
            invokestatic     static         -> no receiver
JIT         1 or 2 classes seen: inlined behind a check
            3+ (none >= 90%): megamorphic virtual call
CONSTRUCTOR never call overridable methods from one`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Which method runs is always two decisions: `javac` picks the overload from declared types, then the JVM picks the override from the receiver's runtime class. Fields, static and private methods stop after the first.",
            "Behaviour that belongs to a type goes on the type and is dispatched; a closed set of data types handled by one consumer fits a sealed hierarchy and an exhaustive switch without `default`.",
            "Every override so far had a parent with a real body to fall back on. The next lesson, Abstraction, is about parents that deliberately don't have one: abstract classes and methods that define what must exist and leave how to the subclasses.",
          ],
        },
      ],
    },
  ],
};
