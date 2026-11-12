import type { Lesson } from "../types";

export const constructors: Lesson = {
  slug: "constructors",
  date: "2026-10-31",
  title: "Constructors",
  description:
    "How a Java object gets from zeroed memory to a valid state: default, overloaded and chained constructors, the exact initialization order down to `<init>` bytecode, why calling an overridable method from a constructor sees nulls, Java 25's flexible constructor bodies, final fields, static factories, builders, records, and what Spring and Jackson need from a constructor.",
  tags: ["Core Java", "OOP", "Constructors", "Initialization"],
  sections: [
    {
      title: "What a Constructor Is",
      blocks: [
        {
          type: "paragraph",
          text: "The Classes and Objects lesson showed that `new Order()` gives me an object with its own copy of every field. What it skipped is the moment in between: the object exists, its memory is reserved, and every field is still `0`, `false` or `null`. Something has to turn that blank object into an order with a customer, a delivery address and a list of items. That something is the **constructor**.",
        },
        {
          type: "paragraph",
          text: "A constructor is a block of code that runs exactly once per object, right after the memory is allocated, and its job is to put the new object into a **valid state**. If a `BankAccount` must never have a negative balance or a missing owner, the constructor is the one place where I can check that before anyone else gets a reference. Done there, the rule (an **invariant**) holds from the object's first moment instead of being re-checked by every method that touches it.",
        },
        {
          type: "paragraph",
          text: "Most of what goes wrong with constructors isn't syntax. It's ordering: which code runs first when a class extends another, what an overridden method sees while the parent is still being built, what happens to an object whose constructor throws. So this lesson goes from the basic forms down to the `<init>` methods in the bytecode, then through Java 25's flexible constructor bodies, and ends with what Spring and Jackson expect from my constructors.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Simula 67, the first object-oriented language, already had the idea. A class declaration took parameters, and its body was a list of statements that ran when an object was generated with `new`. For a subclass (a \"prefixed\" class, in Simula's terms), the parent's statements ran first, up to the keyword `inner`, which marked where the subclass's statements slotted in (at the end, if the parent didn't write it). That's the shape Java still has: parameters in, initialization code runs once, parent part before child part.",
        },
        {
          type: "paragraph",
          text: "Smalltalk-80 went a different way. It has no constructors in the language at all. An object is created by sending a message to its class, like `Point x: 3 y: 4`, and `x:y:` is just a class-side method that creates and initializes the instance. That's the ancestor of the **static factory method** later in this lesson.",
        },
        {
          type: "paragraph",
          text: "C++ gave constructors the syntax Java copied: a member function named after the class, with no return type, called automatically on creation, base class first. Java 1.0 kept that syntax and the default constructor, and dropped a lot around it:",
        },
        {
          type: "list",
          items: [
            "No destructors. The garbage collector frees memory, so there's nothing for a destructor to do. Java had `finalize()` instead, which turned out badly and is now deprecated for removal.",
            "No member initializer lists. Fields get values from initializers, initializer blocks or plain assignments in the body, and a call to another constructor goes in the body as `this(...)` or `super(...)`.",
            "No default argument values. Overloaded constructors that delegate to one main constructor with `this(...)` cover the same need.",
            "Virtual calls behave differently. In C++, a virtual call inside a base class constructor runs the base version, because the object isn't a derived object yet. In Java the object is a `Car` from its first moment, so a call from `Vehicle`'s constructor runs `Car`'s override, before `Car`'s fields are set. That difference has its own section below.",
          ],
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "Constructors, default constructor, `this(...)`/`super(...)` as the first statement", "The basic rules in this lesson"],
            ["Java 1.1 (1997)", "Inner and anonymous classes, instance initializer blocks, blank finals", "Anonymous classes can't declare constructors, so they got initializer blocks"],
            ["Java 5 (2004)", "New memory model (JSR 133), enums, `Integer.valueOf` cache", "Final fields became safe to share across threads after construction"],
            ["Java 9 (2017)", "`List.of`, `Set.of`, `Map.of` (JEP 269); `finalize` deprecated", "The JDK leaning on static factories instead of public constructors"],
            ["Java 16 (2021)", "Records (JEP 395), after previews in 14 and 15", "Canonical and compact constructors"],
            ["Java 18 (2022)", "Finalization deprecated for removal (JEP 421)", "The finalizer route to a half-built object is on its way out"],
            ["Java 22 to 24", "Statements before `super(...)` previewed (JEP 447, 482, 492)", "Three rounds of preview before it was final"],
            ["Java 25 (2025)", "Flexible constructor bodies, final (JEP 513)", "Code before `this(...)`/`super(...)`, with strict limits"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The picture I use is a car coming off an assembly line.",
        },
        {
          type: "list",
          items: [
            "The plant reserves a bay with a bare, empty body shell in it, with mounting points for every part the finished model will have. That's `new`: memory for **all** the fields, the parent's and the child's, reserved at once and zeroed.",
            "The stations run base first: chassis and platform (`Object`), then the generic vehicle station that fits wheels and a number plate (`Vehicle`), then the model station that fits the seats and the model-specific trim (`Car`). That's the `super(...)` chain.",
            "Each station has a work order: the parts list for that model. That's the constructor's parameters.",
            "Final inspection at the end of the line is validation. A car that fails is scrapped and never reaches the dealer. That's a constructor throwing: the caller never gets a reference.",
            "The keys are handed to the buyer only after the line is finished. That's the reference returned by `new` only after every constructor in the chain has completed.",
            "A dealer that sells from stock instead of building to order is a static factory: `Integer.valueOf(100)` hands back an already-built object when it can.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks: a real station can't operate parts that haven't been installed yet. In Java it can. The vehicle station can call a method that the car overrides, and that method happily reads the car's seat count while the seats are still empty mounting points (`0` or `null`). The analogy also has no photographer, while Java does: a constructor can hand `this` to someone else (a registry, a listener list, another thread) before inspection, and if inspection then fails, the photo of a half-built car is still out there. Both are sections below.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Anatomy of a constructor",
        },
        {
          type: "code",
          language: "java",
          code: `public Order(String customerId, String address) {
    this.customerId = Objects.requireNonNull(customerId);
    this.address = address;
    this.status = Status.PLACED;
}`,
        },
        {
          type: "table",
          headers: ["Part", "Example", "Rule"],
          rows: [
            ["Access modifier", "`public`", "`public`, `protected`, `private` or none (annotations are fine too). No other modifier compiles"],
            ["Name", "`Order`", "Exactly the class name. Anything else needs a return type and is a method"],
            ["Return type", "(none)", "Not even `void`. Writing one turns it into an ordinary method"],
            ["Parameters", "`(String customerId, String address)`", "Any list. Several constructors can coexist if their lists differ (overloading)"],
            ["`throws` clause", "`throws IOException`", "Allowed, same as methods"],
            ["Body", "`{ ... }`", "May start with `this(...)` or `super(...)`. If it starts with neither, `javac` inserts `super()`"],
          ],
        },
        {
          type: "heading",
          text: "Constructor versus method",
        },
        {
          type: "table",
          headers: ["", "Constructor", "Method"],
          rows: [
            ["Name", "Must be the class name", "Any identifier"],
            ["Return type", "None", "Required (`void` or a type)"],
            ["Called how", "Only through `new`, `this(...)`, `super(...)` or reflection", "By name, any number of times"],
            ["Runs", "Once per object, during creation", "Whenever called"],
            ["Inherited", "No. Constructors are not members (JLS 8.2)", "Yes, if accessible"],
            ["Overridden", "Never", "Instance methods, unless `final` or `private`"],
            ["`static`, `final`, `abstract`, `synchronized`, `native`", "None allowed", "All allowed"],
            ["Generated if missing", "Yes, the default constructor", "No"],
            ["In bytecode", "A method named `<init>` returning `V`", "Its own name"],
          ],
        },
        {
          type: "paragraph",
          text: "The modifier rule has a reason for each word, and JLS 8.8.3 spells them out. `static` makes no sense because a constructor always works on an object. `final` exists to stop overriding, and constructors aren't inherited, so there's nothing to stop. An `abstract` constructor could never be implemented. `synchronized` would lock an object no other thread can see yet. `javac` rejects all four with the same kind of message:",
        },
        {
          type: "code",
          language: "java",
          title: "BadModifiers.java",
          code: `public class BadModifiers {
    static BadModifiers() { }
    final BadModifiers(int a) { }
    abstract BadModifiers(long a) { }
    synchronized BadModifiers(String a) { }
}`,
        },
        {
          type: "output",
          text: `BadModifiers.java:2: error: modifier static not allowed here
    static BadModifiers() { }
           ^
BadModifiers.java:3: error: modifier final not allowed here
    final BadModifiers(int a) { }
          ^
BadModifiers.java:4: error: modifier abstract not allowed here
    abstract BadModifiers(long a) { }
             ^
BadModifiers.java:5: error: modifier synchronized not allowed here
    synchronized BadModifiers(String a) { }
                 ^
4 errors`,
        },
        {
          type: "heading",
          text: "The kinds of constructor",
        },
        {
          type: "list",
          items: [
            "**Default constructor:** the one `javac` writes when a class declares none. No parameters, calls `super()`, same access as the class.",
            "**No-arg constructor:** one I write myself with no parameters. Same shape as the default one, but explicit, and it can contain code.",
            "**Parameterized constructor:** takes the values the object needs. Most real constructors are this kind.",
            "**Copy constructor:** takes another instance of the same class and builds an independent copy.",
            "**Private constructor:** callable only inside the class (and its nest), for utility classes, singletons and static factories.",
            "**Canonical and compact constructors:** the record versions, covered in the Records section.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Objects that skip their constructor",
          text: "Two JDK mechanisms create an object without running its class's constructor. `Object.clone()` copies the fields of an existing object, which the Object Class Methods lesson covers. Java serialization does the same on the way back in: for a `Serializable` class it runs only the no-arg constructor of the first superclass that isn't `Serializable`. When I deserialized an `Order extends Base implements Serializable`, only `Base()` printed. Records are the exception, they're always deserialized through their canonical constructor.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "A constructor is a method named <init>",
        },
        {
          type: "paragraph",
          text: "I wrote a class with all the pieces that end up in a constructor: a static field, an instance field initializer, an instance initializer block, a main constructor and a second one that delegates with `this(...)`:",
        },
        {
          type: "code",
          language: "java",
          title: "Order.java",
          code: `public class Order {
    private static long nextId = 1000;           // static initializer: runs once, in <clinit>

    private final long id;
    private String status = "PLACED";            // instance field initializer
    private final int quantity;

    {                                            // instance initializer block
        id = nextId++;
    }

    public Order(int quantity) {
        this.quantity = quantity;
    }

    public Order() {
        this(1);
    }

    public static void main(String[] args) {
        Order a = new Order(6);
        Order b = new Order();
        System.out.println(a.id + " " + a.status + " " + a.quantity);
        System.out.println(b.id + " " + b.status + " " + b.quantity);
    }
}`,
        },
        {
          type: "output",
          text: `1000 PLACED 6
1001 PLACED 1`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Order.java && javap -c -p Order`,
        },
        {
          type: "output",
          text: `  public Order(int);
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: aload_0
       5: ldc           #7                  // String PLACED
       7: putfield      #9                  // Field status:Ljava/lang/String;
      10: aload_0
      11: getstatic     #15                 // Field nextId:J
      14: dup2
      15: lconst_1
      16: ladd
      17: putstatic     #15                 // Field nextId:J
      20: putfield      #19                 // Field id:J
      23: aload_0
      24: iload_1
      25: putfield      #22                 // Field quantity:I
      28: return

  public Order();
    Code:
       0: aload_0
       1: iconst_1
       2: invokespecial #26                 // Method "<init>":(I)V
       5: return

  public static void main(java.lang.String[]);
    Code:
       0: new           #10                 // class Order
       3: dup
       4: bipush        6
       6: invokespecial #26                 // Method "<init>":(I)V
       9: astore_1
      ...

  static {};
    Code:
       0: ldc2_w        #46                 // long 1000l
       3: putstatic     #15                 // Field nextId:J
       6: return`,
        },
        {
          type: "paragraph",
          text: "This listing explains most of the lesson, so I went through it line by line:",
        },
        {
          type: "list",
          items: [
            "`javap` prints the constructors as `public Order(int)`, but the calls show their real name: `\"<init>\":(I)V`. Every constructor becomes a method called `<init>` with a `void` descriptor. The angle brackets make it an invalid Java identifier, so no source code can call it by name. Only `new`, `this(...)`, `super(...)` and reflection reach it.",
            "`new Order(6)` is `new`, `dup`, the arguments, then `invokespecial`. `new` allocates the zeroed object and pushes a reference, `dup` copies the reference, `bipush 6` pushes the argument, and `invokespecial <init>:(I)V` consumes one copy as `this` (local slot 0) with `6` as the parameter. The other copy is left for `astore_1`. Constructors are always called with `invokespecial`, never with virtual dispatch.",
            "`Order(int)` starts with `aload_0` and `invokespecial Object.\"<init>\":()V`. I never wrote `super()`. `javac` inserted it, because a constructor that doesn't start with `this(...)` or `super(...)` gets an implicit `super()`.",
            "Right after the `super()` call, at offsets 4 to 20, come the field initializer (`status = \"PLACED\"`) and the instance initializer block (`id = nextId++`), in the order they appear in the source. **javac copied them into this constructor.** There is no separate \"initializer\" method in the class file.",
            "`Order()` contains none of that. It's four instructions: push `this`, push `1`, call `Order(int)`, return. A constructor that starts with `this(...)` doesn't get the initializers, because the constructor it delegates to will run them. If both had them, `status` would be assigned twice and `nextId` would jump by two for every `new Order()`. The output shows `1000` and `1001`, one increment each.",
            "`static {}` is the class initializer, named `<clinit>` in the constant pool. It holds the static field initializers and static blocks, and the JVM runs it once, when the class is initialized. The Static Keyword lesson covers when that happens.",
          ],
        },
        {
          type: "paragraph",
          text: "`javap -v` adds each one's descriptor and flags: `(I)V` and `ACC_PUBLIC` for `Order(int)`, `()V` for `Order()`, and `ACC_STATIC` for `static {}`. The JVM enforces the modifier rule a second time. The class file format (JVMS 4.6) allows an `<init>` method at most one access flag plus `ACC_VARARGS`, `ACC_STRICT` and `ACC_SYNTHETIC`. I flipped the `ACC_STATIC` bit on a compiled `public Price()` with a few lines of Python, and JDK 21 refused to load the class: `java.lang.ClassFormatError: Method <init> in class Price has illegal modifiers: 0x9`.",
        },
        {
          type: "paragraph",
          text: "The verifier adds one more rule: every `<init>` except `Object`'s must call another `<init>` of the same class or of its direct superclass before it uses the object (JVMS 4.10.2.4). Until that call, `this` has a special verifier type, `uninitializedThis`, and the only things allowed on it are that call and writes to fields declared in the class itself. `javac` has relied on that exception for inner classes for a long time. When I ran `javap -c -p` on an inner class `Shop$Offer`, its constructor stored the hidden outer reference with `putfield this$0` at offset 2, before `invokespecial Object.<init>` at offset 6. So Java 25's flexible constructor bodies didn't need a JVM change. They let source code do what `javac` was already emitting.",
        },
        {
          type: "callout",
          tone: "note",
          title: "Final fields and other threads",
          text: "JLS 17.5 gives final fields a special guarantee. When a constructor finishes, its writes to the object's `final` fields are \"frozen\", and any thread that obtains a reference to the object **after** that point is guaranteed to see those values, even with no `volatile` and no lock, and even if the reference reached it through a data race. The guarantee covers the final field and what it points to as of the end of the constructor, and nothing else: non-final fields have no such promise. It also only holds if `this` didn't escape during construction. A thread that got the reference from inside the constructor can still see the zeroed value. That's one more reason for the registry rule later in this lesson.",
        },
      ],
    },
    {
      title: "The Default Constructor and the void Trap",
      blocks: [
        {
          type: "paragraph",
          text: "If a class declares no constructor at all, `javac` declares one for it (JLS 8.8.9): no parameters, no `throws` clause, and a body that is just `super();`. It's real code in the class file, not a runtime trick:",
        },
        {
          type: "code",
          language: "java",
          title: "Customer.java",
          code: `public class Customer {
    String name;
    int points = 5;
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Customer.java && javap -c Customer",
        },
        {
          type: "output",
          text: `public class Customer {
  java.lang.String name;

  int points;

  public Customer();
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: aload_0
       5: iconst_5
       6: putfield      #7                  // Field points:I
       9: return
}`,
        },
        {
          type: "paragraph",
          text: "In the class file it isn't empty, though. After the call to `Object.<init>` comes the field initializer, `points = 5`, copied in exactly as it would be into a hand-written constructor. `name` has no initializer, so it stays at the `null` the allocation gave it.",
        },
        {
          type: "paragraph",
          text: "The generated constructor gets the same access as the class. I checked it with four nested classes, since only nested classes can be `private` or `protected`: `javap -p` showed `DefaultAccess$PackageLevel()` with no modifier, `private DefaultAccess$PrivateLevel()`, `protected DefaultAccess$ProtectedLevel()` and `public DefaultAccess$PublicLevel()`. Enums are the exception. An enum's constructor is always `private` (JLS 8.9.2), generated or written, and a package-level `enum Status` got `private DefaultAccess$Status()`.",
        },
        {
          type: "heading",
          text: "Declaring any constructor removes the default",
        },
        {
          type: "paragraph",
          text: "The default constructor exists only while the class declares none. The moment I add `Order(String customer)`, `new Order()` stops compiling:",
        },
        {
          type: "code",
          language: "java",
          title: "NoDefault.java",
          code: `public class NoDefault {
    static class Order {
        private final String customer;

        Order(String customer) {          // declaring this removes the default one
            this.customer = customer;
        }
    }

    public static void main(String[] args) {
        Order placed = new Order("Asha");
        Order empty = new Order();
    }
}`,
        },
        {
          type: "output",
          text: `NoDefault.java:12: error: constructor Order in class Order cannot be applied to given types;
        Order empty = new Order();
                      ^
  required: String
  found:    no arguments
  reason: actual and formal argument lists differ in length
1 error`,
        },
        {
          type: "paragraph",
          text: "In a small program the compiler catches it. The painful version is a class that a framework creates by reflection, like a JPA entity or a Jackson DTO. Someone adds a convenience constructor, every call site still compiles, and the failure moves to runtime. The production section shows Jackson's version of that error.",
        },
        {
          type: "heading",
          text: "void Order() is a method",
        },
        {
          type: "paragraph",
          text: "A constructor has no return type. Adding one, even `void`, makes it an ordinary method that happens to share the class's name, and Java allows that:",
        },
        {
          type: "code",
          language: "java",
          title: "VoidTrap.java",
          code: `public class VoidTrap {
    static class Order {
        String status = "NEW";

        void Order() {                    // looks like a constructor, is a method
            status = "PLACED";
        }
    }

    public static void main(String[] args) {
        Order order = new Order();
        System.out.println(order.status);
        order.Order();                    // only runs when called like a method
        System.out.println(order.status);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac -Xlint:all VoidTrap.java && java VoidTrap",
        },
        {
          type: "output",
          text: `NEW
PLACED`,
        },
        {
          type: "paragraph",
          text: "No error and no warning, even with `-Xlint:all`. `new Order()` used the default constructor, because the class still declares no constructor, and printed `NEW`. The \"constructor\" only ran when I called it explicitly as `order.Order()`. Static analysis tools (IntelliJ's inspections, SpotBugs) can flag a method named like its class; `javac` doesn't.",
        },
      ],
    },
    {
      title: "Overloading, this(...) and super(...)",
      blocks: [
        {
          type: "paragraph",
          text: "Constructors overload exactly like methods: same name, different parameter lists, and `javac` picks one at compile time from the argument types, with the same widening, boxing and varargs phases from the Methods lesson. Overloads are how Java gets by without default argument values. The usual design is one **main constructor** that assigns every field and validates, and shorter overloads that fill in defaults and delegate to it with `this(...)`:",
        },
        {
          type: "code",
          language: "java",
          title: "EmployeeChain.java",
          code: `public class EmployeeChain {
    static class Employee {
        final String name;
        final String department;
        final long salary;

        Employee(String name, String department, long salary) {   // the one that does the work
            System.out.println("  Employee(name, department, salary) assigns the fields");
            this.name = name;
            this.department = department;
            this.salary = salary;
        }

        Employee(String name, String department) {
            this(name, department, 50_000);
            System.out.println("  Employee(name, department) resumes after this(...)");
        }

        Employee(String name) {
            this(name, "Engineering");
            System.out.println("  Employee(name) resumes after this(...)");
        }
    }

    public static void main(String[] args) {
        System.out.println("new Employee(\\"Asha\\"):");
        Employee asha = new Employee("Asha");
        System.out.println(asha.name + " / " + asha.department + " / salary " + asha.salary);
    }
}`,
        },
        {
          type: "output",
          text: `new Employee("Asha"):
  Employee(name, department, salary) assigns the fields
  Employee(name, department) resumes after this(...)
  Employee(name) resumes after this(...)
Asha / Engineering / salary 50000`,
        },
        {
          type: "diagram",
          text: `new Employee("Asha")
 │
 ├─► Employee(name)             this(name, "Engineering")  calls go down
 │    ├─► Employee(name, dept)  this(name, dept, 50_000)
 │    │    ├─► Employee(name, dept, salary)
 │    │    │     super()  ──► Object()
 │    │    │     assigns name, department, salary          bodies finish
 │    │    └── rest of Employee(name, dept)                bottom-up
 │    └── rest of Employee(name)
 └─ reference returned`,
          caption: "A this(...) chain: the deepest constructor's body runs first, then each caller's remaining statements.",
        },
        {
          type: "paragraph",
          text: "All three `final` fields are assigned in one place. A delegating constructor can't assign them again (it would be a second assignment), and it doesn't need to. When a rule changes, like rejecting a negative salary, it changes in one constructor.",
        },
        {
          type: "heading",
          text: "First statement, one call, no cycles",
        },
        {
          type: "paragraph",
          text: "Before Java 25, `this(...)` or `super(...)` had to be the very first statement (Java 22 to 24 relaxed that only as a preview feature). Even a harmless log line in front of it fails on JDK 21:",
        },
        {
          type: "code",
          language: "java",
          title: "ThisNotFirst.java",
          code: `public class ThisNotFirst {
    private final String department;

    ThisNotFirst(String department) {
        this.department = department;
    }

    ThisNotFirst() {
        System.out.println("defaulting department");
        this("Engineering");
    }
}`,
        },
        {
          type: "output",
          text: `ThisNotFirst.java:10: error: call to this must be first statement in constructor
        this("Engineering");
            ^
1 error`,
        },
        {
          type: "paragraph",
          text: "A constructor gets at most one explicit constructor call. `this(4);` followed by `super();` fails on JDK 21 with `call to super must be first statement in constructor`: the delegated constructor already calls `super(...)`, and a second call would initialize the parent part twice. And `javac` refuses delegation that goes in a circle, which would otherwise recurse until the stack overflowed:",
        },
        {
          type: "code",
          language: "java",
          title: "Loop.java",
          code: `public class Loop {
    Loop() {
        this(4);
    }

    Loop(int size) {
        this();
    }
}`,
        },
        {
          type: "output",
          text: `Loop.java:7: error: recursive constructor invocation
        this();
        ^
1 error`,
        },
        {
          type: "paragraph",
          text: "On JDK 25 the first rule is relaxed (next sections). `ThisNotFirst` compiles there, because the `println` doesn't touch the object. The `this(4); super();` pair still fails, with a different message, `redundant explicit constructor invocation`, and `Loop` fails exactly as before.",
        },
        {
          type: "heading",
          text: "super(...) and the implicit super()",
        },
        {
          type: "paragraph",
          text: "Every constructor except `Object`'s ends up calling a superclass constructor, directly with `super(...)` or through a `this(...)` chain. When a constructor starts with neither, `javac` inserts `super()`, the no-arg one. That's fine while the parent has a no-arg constructor. When it doesn't, the inserted call has nothing to call:",
        },
        {
          type: "code",
          language: "java",
          title: "ImplicitSuper.java",
          code: `public class ImplicitSuper {
    static class Vehicle {
        final String plate;

        Vehicle(String plate) {
            this.plate = plate;
        }
    }

    static class Car extends Vehicle {
        final int seats;

        Car(int seats) {                 // javac inserts super() here
            this.seats = seats;
        }
    }
}`,
        },
        {
          type: "output",
          text: `ImplicitSuper.java:13: error: constructor Vehicle in class Vehicle cannot be applied to given types;
        Car(int seats) {                 // javac inserts super() here
                       ^
  required: String
  found:    no arguments
  reason: actual and formal argument lists differ in length
1 error`,
        },
        {
          type: "paragraph",
          text: "The caret points at the opening brace, where the invisible `super()` lives. If `Car` declared no constructor at all, the same error points at `static class Car extends Vehicle {`, because the generated default constructor makes the same call. Both confuse people the first time, since the line they point at contains no call. The fix is an explicit `super(plate)` with a value the subclass has. The Inheritance lesson has more on what a subclass does and doesn't inherit.",
        },
      ],
    },
    {
      title: "Initialization Order, All of It",
      blocks: [
        {
          type: "paragraph",
          text: "This is the part interviews like to turn into a predict-the-output question, so I wanted the exact order from a real run rather than a rule I half remember. The complete sequence for `new Car(...)` where `Car extends Vehicle`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Class initialization, once per class.** If `Car` isn't initialized yet, the JVM initializes `Vehicle` first, then `Car`. Each runs its `<clinit>`: static field initializers and static blocks in textual order. The Static Keyword lesson covers what triggers this.",
            "**Allocate and zero.** One block of heap memory for all fields of `Object`, `Vehicle` and `Car`, every field set to `0`, `false` or `null`.",
            "**Call the constructor** chosen by `javac` for the arguments, `Car(int)`.",
            "**Run `this(...)` or `super(...)` first**, recursively, all the way up to `Object`'s constructor. (On Java 25, a constructor's prologue runs before its `super(...)`.)",
            "**On the way back down, for each class from the top:** its instance field initializers and instance initializer blocks in textual order, then the rest of its constructor body.",
            "**`new` completes** and the caller gets the reference.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "InitOrder.java",
          code: `public class InitOrder {
    static String log(String step) {
        System.out.println(step);
        return step;
    }

    static class Vehicle {
        static String maker = log("Vehicle: static field initializer");
        static {
            log("Vehicle: static block");
        }

        String plate = log("  Vehicle: instance field initializer");
        {
            log("  Vehicle: instance initializer block");
        }

        Vehicle() {
            super();                                     // Object.<init>, written out for clarity
            log("  Vehicle: constructor body");
        }
    }

    static class Car extends Vehicle {
        static String category = log("Car: static field initializer");
        static {
            log("Car: static block");
        }

        String model = log("  Car: instance field initializer");
        {
            log("  Car: instance initializer block");
        }

        Car(int seats) {
            super();
            log("  Car: constructor body, seats = " + seats);
        }
    }

    public static void main(String[] args) {
        log("main: first new Car(4)");
        new Car(4);
        log("main: second new Car(6)");
        new Car(6);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac InitOrder.java && java InitOrder",
        },
        {
          type: "output",
          text: `main: first new Car(4)
Vehicle: static field initializer
Vehicle: static block
Car: static field initializer
Car: static block
  Vehicle: instance field initializer
  Vehicle: instance initializer block
  Vehicle: constructor body
  Car: instance field initializer
  Car: instance initializer block
  Car: constructor body, seats = 4
main: second new Car(6)
  Vehicle: instance field initializer
  Vehicle: instance initializer block
  Vehicle: constructor body
  Car: instance field initializer
  Car: instance initializer block
  Car: constructor body, seats = 6`,
        },
        {
          type: "list",
          items: [
            "The static lines appear once, on the first `new Car(4)`, parent before child. The second `new` skips them entirely. Neither class was initialized when `main` started, because nested classes are initialized on first use, not along with `InitOrder`.",
            "Everything instance-level repeats for every `new`, `Vehicle`'s part complete before any of `Car`'s part starts. That's the `super()` call at the top of `Car`'s compiled constructor, followed by `Car`'s initializers that `javac` copied in after it.",
            "Within one class, the field initializer printed before the initializer block because it comes first in the source. If I swap them in the source, the output swaps too. Textual order is the whole rule, and it's also why a field initializer can't read a field declared below it by its simple name: `int total = base + 50; int base = 200;` fails with `illegal forward reference`.",
            "`Car`'s constructor body is last of all, so it's the only code that sees a fully initialized `Car`.",
          ],
        },
        {
          type: "image",
          src: "/images/java/constructors-init-timeline.svg",
          alt: "Timeline of new Car(4): class initialization once, then allocation and zeroing, Car's constructor calling super(), Vehicle's constructor calling Object's, Vehicle's body calling the overridden describe() while Car's seats is 0 and category is null, then Car's field initializer setting category to SEDAN, Car's body setting seats to 4, and finally the reference returned to the caller.",
          caption: "The same order applied to the next section's program: step 4 is where an overridden method sees a Car whose own fields are still zero.",
        },
      ],
    },
    {
      title: "Overridable Methods in Constructors",
      blocks: [
        {
          type: "paragraph",
          text: "The order above has a consequence that bites in real code. During step 4, the object is already a `Car`, so dynamic dispatch already picks `Car`'s overrides, but none of `Car`'s initializers or constructor body has run yet:",
        },
        {
          type: "code",
          language: "java",
          title: "OverrideTrap.java",
          code: `public class OverrideTrap {
    static class Vehicle {
        Vehicle() {
            System.out.println("Vehicle constructor sees: " + describe());
        }

        String describe() {                     // overridable
            return "a vehicle";
        }
    }

    static class Car extends Vehicle {
        private final int seats;
        private String category = "SEDAN";
        private final String fuel = "CNG";      // a constant variable: inlined by javac

        Car(int seats) {
            super();
            this.seats = seats;
        }

        @Override
        String describe() {
            return category + ", " + seats + " seats, " + fuel;
        }
    }

    public static void main(String[] args) {
        Car car = new Car(4);
        System.out.println("After new returns:        " + car.describe());
    }
}`,
        },
        {
          type: "output",
          text: `Vehicle constructor sees: null, 0 seats, CNG
After new returns:        SEDAN, 4 seats, CNG`,
        },
        {
          type: "list",
          items: [
            "`Vehicle()` called `describe()`, and `invokevirtual` dispatched to `Car.describe()`, because the object's class is `Car` from the moment `new` allocated it.",
            "`category` printed `null` even though its declaration says `= \"SEDAN\"`. That initializer is compiled into `Car`'s constructor after the `super()` call, so it hadn't run yet.",
            "`seats` printed `0`, and it's a `final` field. The same final field was observed with two different values, `0` and then `4`. Nothing in the language stops a read before the assignment when the read happens inside a method.",
            "`fuel` printed `CNG` both times, which looks like it contradicts the rest. It doesn't. A `final` field of a primitive or `String` type initialized with a compile-time constant is a **constant variable**, and `javac` replaces a read of it by simple name, like `fuel` here, with the constant itself.",
          ],
        },
        {
          type: "paragraph",
          text: "`javap -c -p 'OverrideTrap$Car'` shows both effects. In `Car(int)`, the `putfield` for `category` is at offset 7, after `invokespecial Vehicle.\"<init>\"` at offset 1 has already run and already called `describe()`. And `describe()` reads `category` and `seats` with `getfield`, but there's no `getfield` for `fuel`: the concatenation is `makeConcatWithConstants:(Ljava/lang/String;I)`, one `String` and one `int`, with `\"CNG\"` baked into the recipe. Effective Java's rule follows from all this: a constructor must not call overridable methods, directly or indirectly. A method called from a constructor should be `private`, `final` or `static`.",
        },
        {
          type: "heading",
          text: "The Java 25 fix: assign before super()",
        },
        {
          type: "paragraph",
          text: "With flexible constructor bodies, `Car` can assign its own fields **before** calling `super()`, so they're already set when `Vehicle`'s constructor calls back into the override. The field must not have an initializer (that would still run after `super()`), so `category` gets a plain assignment instead:",
        },
        {
          type: "code",
          language: "java",
          title: "EarlyFields.java",
          code: `public class EarlyFields {
    static class Vehicle {
        Vehicle() {
            System.out.println("Vehicle constructor sees: " + describe());
        }

        String describe() {
            return "a vehicle";
        }
    }

    static class Car extends Vehicle {
        private final int seats;
        private final String category;          // no initializer: assigned in the prologue

        Car(int seats) {
            this.seats = seats;                  // prologue: legal from Java 25
            this.category = "SEDAN";
            super();
        }

        @Override
        String describe() {
            return category + ", " + seats + " seats";
        }
    }

    public static void main(String[] args) {
        Car car = new Car(4);
        System.out.println("After new returns:        " + car.describe());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# JDK 25
javac EarlyFields.java && java EarlyFields`,
        },
        {
          type: "output",
          text: `Vehicle constructor sees: SEDAN, 4 seats
After new returns:        SEDAN, 4 seats`,
        },
        {
          type: "paragraph",
          text: "The same file on JDK 21:",
        },
        {
          type: "output",
          text: `EarlyFields.java:19: error: call to super must be first statement in constructor
            super();
                 ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Before Java 25 the options were to not call the overridable method from the constructor, to make it `private` or `final`, or to pass the subclass's values up through `super(...)` arguments so the parent doesn't need to call down at all. Those are still the better designs. The Java 25 version fixes a parent class I can't change.",
        },
      ],
    },
    {
      title: "Flexible Constructor Bodies in Java 25",
      blocks: [
        {
          type: "paragraph",
          text: "JEP 513, final in Java 25 after three previews, splits a constructor body around its explicit `this(...)` or `super(...)` call. The statements before it are the **prologue**, the ones after it the **epilogue**. The epilogue is what a constructor body always was. The prologue runs in an \"early construction context\" where the object exists but must not be used, because its parent part isn't initialized yet.",
        },
        {
          type: "paragraph",
          text: "The most common use is validating or preparing arguments before the parent's constructor does any work. Before Java 25 that logic had to hide in a static method called inside the `super(...)` argument list:",
        },
        {
          type: "code",
          language: "java",
          title: "ValidateFirst.java",
          code: `public class ValidateFirst {
    static class Vehicle {
        final String plate;

        Vehicle(String plate) {
            this.plate = plate;
            System.out.println("  Vehicle(" + plate + ") ran");
        }
    }

    // Java 21: validation has to hide inside a static helper in the super(...) argument
    static class Car21 extends Vehicle {
        final int seats;

        Car21(String plate, int seats) {
            super(checkedPlate(plate, seats));
            this.seats = seats;
        }

        private static String checkedPlate(String plate, int seats) {
            if (seats < 1 || seats > 7) throw new IllegalArgumentException("seats: " + seats);
            return plate.strip().toUpperCase();
        }
    }

    // Java 25: plain statements before super(...)
    static class Car25 extends Vehicle {
        final int seats;

        Car25(String plate, int seats) {
            if (seats < 1 || seats > 7) {
                throw new IllegalArgumentException("seats: " + seats);
            }
            String normalised = plate.strip().toUpperCase();
            this.seats = seats;
            super(normalised);
        }
    }

    public static void main(String[] args) {
        System.out.println("Car25 ok:");
        Car25 car = new Car25(" wb-02-ab-1234 ", 4);
        System.out.println("  " + car.plate + ", " + car.seats + " seats");
        System.out.println("Car25 bad:");
        try {
            new Car25("WB-02-AB-9999", 12);
        } catch (IllegalArgumentException e) {
            System.out.println("  rejected, Vehicle never ran: " + e.getMessage());
        }
        System.out.println("Car21 bad:");
        try {
            new Car21("WB-02-AB-9999", 12);
        } catch (IllegalArgumentException e) {
            System.out.println("  rejected, Vehicle never ran: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# JDK 25
javac ValidateFirst.java && java ValidateFirst && javap -c -p 'ValidateFirst$Car25'`,
        },
        {
          type: "output",
          text: `Car25 ok:
  Vehicle(WB-02-AB-1234) ran
  WB-02-AB-1234, 4 seats
Car25 bad:
  rejected, Vehicle never ran: seats: 12
Car21 bad:
  rejected, Vehicle never ran: seats: 12
...
  ValidateFirst$Car25(java.lang.String, int);
    Code:
         0: iload_2
         ...
        24: athrow
         ...
        32: astore_3
        33: aload_0
        34: iload_2
        35: putfield      #20                 // Field seats:I
        38: aload_0
        39: aload_3
        40: invokespecial #26                 // Method ValidateFirst$Vehicle."<init>":(Ljava/lang/String;)V
        43: return`,
        },
        {
          type: "list",
          items: [
            "Both versions reject 12 seats before `Vehicle`'s constructor prints anything. The Java 25 one just reads like normal code.",
            "The bytecode is the shape the JVM always accepted: checks, a local variable, a `putfield` into the class's own field, and only then `invokespecial Vehicle.<init>`. It's the same pattern `javac` used for `this$0` in the Internal Working section.",
            "To confirm there was no JVM change, I took the class files `javac` 25 produced, changed their major version from 69 to 65 (Java 21's) with a two-byte edit, and ran them on JDK 21. They loaded, passed verification and printed the same output. Only the language rule was new.",
          ],
        },
        {
          type: "heading",
          text: "What the prologue may and may not do",
        },
        {
          type: "paragraph",
          text: "The rule is that the prologue may not use the object under construction, except to assign its own fields. I tried the usual temptations on JDK 25:",
        },
        {
          type: "code",
          language: "java",
          title: "PrologueRules.java",
          code: `public class PrologueRules {
    static class Vehicle {
        Vehicle(String plate) { }
    }

    static class Car extends Vehicle {
        private final int seats;
        private String category = "SEDAN";

        Car(String plate, int seats) {
            this.seats = seats;                      // OK: assign my own field
            System.out.println(this.seats);          // reads a field
            String clean = normalise(plate);         // calls an instance method
            this.category = "SUV";                   // field has an initializer
            super(clean);
        }

        String normalise(String plate) {
            return plate.strip().toUpperCase();
        }
    }
}`,
        },
        {
          type: "output",
          text: `PrologueRules.java:12: error: cannot reference this before supertype constructor has been called
            System.out.println(this.seats);          // reads a field
                               ^
PrologueRules.java:13: error: cannot reference normalise(String) before supertype constructor has been called
            String clean = normalise(plate);         // calls an instance method
                           ^
PrologueRules.java:14: error: cannot assign initialized field 'category' before supertype constructor has been called
            this.category = "SUV";                   // field has an initializer
                ^
3 errors`,
        },
        {
          type: "table",
          headers: ["In the prologue", "Allowed?"],
          rows: [
            ["Use parameters and local variables, `if`, loops, `throw`", "Yes"],
            ["Call static methods, create other objects", "Yes"],
            ["Assign a field of this class that has no initializer", "Yes"],
            ["Read any field of `this`, even one just assigned", "No"],
            ["Call an instance method, or pass `this` anywhere", "No"],
            ["Use `super.field` or `super.method()`", "No"],
            ["Assign a field that has an initializer", "No, the initializer would overwrite it after `super()`"],
            ["`return`", "No, the parent constructor must still run"],
          ],
        },
        {
          type: "paragraph",
          text: "One more detail: a Java 25 constructor still contains at most one explicit constructor call, and it can't sit inside an `if` or a loop. Moving it lower in the body is allowed, making it conditional is not.",
        },
      ],
    },
    {
      title: "final Fields and Definite Assignment",
      blocks: [
        {
          type: "paragraph",
          text: "A `final` field without an initializer is a **blank final**. The compiler's definite assignment analysis (JLS chapter 16) checks that every constructor assigns it exactly once on every path. Both ways of getting that wrong are compile errors:",
        },
        {
          type: "code",
          language: "java",
          title: "FinalFields.java",
          code: `public class FinalFields {
    static class BankAccount {
        private final String owner;
        private final long balance;

        BankAccount(String owner, long balance) {
            this.owner = owner;
            if (balance > 0) {
                this.balance = balance;
            }
        }

        BankAccount(String owner) {
            this.owner = owner;
            this.balance = 0;
            this.balance = 100;
        }
    }
}`,
        },
        {
          type: "output",
          text: `FinalFields.java:11: error: variable balance might not have been initialized
        }
        ^
FinalFields.java:16: error: variable balance might already have been assigned
            this.balance = 100;
                ^
2 errors`,
        },
        {
          type: "list",
          items: [
            "The first error points at the constructor's closing brace: the path where `balance <= 0` reaches the end without assigning it.",
            "The second is a double assignment. A final field gets one value per object, and the compiler checks every path to make sure.",
            "A blank final can also be assigned in an instance initializer block, as `Order`'s `id` was. Then no constructor may assign it.",
            "A constructor that starts with `this(...)` must not assign blank finals at all. The constructor it delegates to does that.",
            "`static final` fields follow the same rules at class level: assigned exactly once, in their declaration or in a static block.",
          ],
        },
        {
          type: "paragraph",
          text: "That makes `final` the cheapest constructor checker I have. If every field that shouldn't change is `final`, then forgetting to set one in a new constructor is a compile error instead of a `null` that shows up three services later. The \"final\" only guards against assignment, though. `OverrideTrap` showed a final `seats` read as `0` before its assignment, and a `final List` can still have elements added to it. The Encapsulation lesson covers that difference.",
        },
      ],
    },
    {
      title: "Private Constructors and Static Factories",
      blocks: [
        {
          type: "paragraph",
          text: "A `private` constructor can only be called from inside the class (and its nestmates, so from nested classes in the same top-level class too). That sounds like a way to make a class useless, and it has three real uses.",
        },
        {
          type: "heading",
          text: "Utility classes: no instances at all",
        },
        {
          type: "code",
          language: "java",
          title: "UtilityDemo.java",
          code: `final class PriceMath {
    private PriceMath() {                                 // no instances, ever
        throw new AssertionError("PriceMath is a utility class");
    }

    static long withTax(long paise, double rate) {
        return Math.round(paise * (1 + rate));
    }
}

public class UtilityDemo {
    public static void main(String[] args) {
        System.out.println(PriceMath.withTax(24_000, 0.18));
        PriceMath math = new PriceMath();
    }
}`,
        },
        {
          type: "output",
          text: `UtilityDemo.java:14: error: PriceMath() has private access in PriceMath
        PriceMath math = new PriceMath();
                         ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Without the private constructor, the default one would be generated and anyone could write `new PriceMath()`. The `AssertionError` inside covers the one path the compiler can't block, reflection, which the Examples section tries. `java.lang.Math` and `java.util.Collections` both have a private no-arg constructor for the same reason (`javap -p` shows `private java.lang.Math()`), though theirs are empty.",
        },
        {
          type: "heading",
          text: "Singletons",
        },
        {
          type: "paragraph",
          text: "A private constructor plus one static instance is a singleton. The Static Keyword lesson covers the lazy holder idiom, and an `enum` with a single constant is the version Effective Java recommends, because the JVM itself guarantees one instance, even against reflection and serialization. In Spring code I rarely write either: a bean is a singleton by default, with an ordinary constructor.",
        },
        {
          type: "heading",
          text: "Static factory methods",
        },
        {
          type: "paragraph",
          text: "The third use is the most important one. The constructor goes private and creation goes through static methods that call it. I gave a `Money` type two factories and a cached zero, then checked what the JDK's own factories return:",
        },
        {
          type: "code",
          language: "java",
          title: "Factories.java",
          code: `import java.util.List;
import java.util.Optional;

public class Factories {
    static final class Money {
        private static final Money ZERO = new Money(0);
        private final long paise;

        private Money(long paise) {                       // nobody outside can call new Money(...)
            this.paise = paise;
        }

        static Money ofPaise(long paise) {
            if (paise < 0) throw new IllegalArgumentException("negative: " + paise);
            return paise == 0 ? ZERO : new Money(paise);   // cached instance for zero
        }

        static Money ofRupees(long rupees) {
            return ofPaise(Math.multiplyExact(rupees, 100));
        }

        @Override
        public String toString() {
            return String.format("Rs %d.%02d", paise / 100, paise % 100);
        }
    }

    public static void main(String[] args) {
        System.out.println(Money.ofRupees(250) + ", " + Money.ofPaise(4_550));
        System.out.println("same zero: " + (Money.ofPaise(0) == Money.ofRupees(0)));

        Integer a = Integer.valueOf(127), b = Integer.valueOf(127);
        Integer c = Integer.valueOf(128), d = Integer.valueOf(128);
        System.out.println("valueOf(127) cached: " + (a == b) + ", valueOf(128) cached: " + (c == d));
        System.out.println("same empty Optional: " + (Optional.empty() == Optional.empty()));

        System.out.println(List.of().getClass().getName());
        System.out.println(List.of("Asha").getClass().getName());
        System.out.println(List.of("Asha", "Ravi", "Meera").getClass().getName());
    }
}`,
        },
        {
          type: "output",
          text: `Rs 250.00, Rs 45.50
same zero: true
valueOf(127) cached: true, valueOf(128) cached: false
same empty Optional: true
java.util.ImmutableCollections$ListN
java.util.ImmutableCollections$List12
java.util.ImmutableCollections$ListN`,
        },
        {
          type: "paragraph",
          text: "That output covers the four advantages of a static factory over a public constructor:",
        },
        {
          type: "list",
          items: [
            "**A name.** `new Money(250)` doesn't say whether 250 is rupees or paise. `ofRupees(250)` and `ofPaise(4_550)` do, and two constructors with the same parameter types couldn't even coexist.",
            "**Caching.** A constructor always creates a new object. A factory can return an existing one: `ofPaise(0) == ofRupees(0)` was `true`, and `Integer.valueOf` returns cached objects for -128 to 127, which is why `127` compared equal with `==` and `128` didn't. `Optional.empty()` returns one shared instance.",
            "**A subtype.** `List.of` is declared to return `List`, and it picked `List12` for one element and `ListN` for zero or three. The caller never names either class.",
            "**A hidden class.** `ImmutableCollections$ListN` isn't public. The JDK can rename it, merge it or replace it in the next release without breaking anyone, because no caller ever wrote `new ListN(...)`.",
          ],
        },
        {
          type: "paragraph",
          text: "The costs are real too. A class with only private constructors can't be subclassed, which is often the point. And factories are harder to find than constructors, which is why the JDK sticks to naming conventions: `of`, `from`, `valueOf`, `getInstance`, `newInstance`, `copyOf`.",
        },
      ],
    },
    {
      title: "When a Constructor Throws",
      blocks: [
        {
          type: "paragraph",
          text: "Throwing from a constructor is the right way to reject bad input: the `new` expression completes abruptly, and the caller never gets a reference to the half-built object. The memory was allocated, but with nothing pointing at it, it's ordinary garbage. That guarantee has one hole. If the constructor already handed `this` to someone else, that someone still has it:",
        },
        {
          type: "code",
          language: "java",
          title: "LeakyRegistry.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class LeakyRegistry {
    static final List<Employee> DIRECTORY = new ArrayList<>();

    static class Employee {
        final String name;
        final String email;

        Employee(String name, String email) {
            DIRECTORY.add(this);                         // 'this' escapes before the checks
            this.name = name;
            if (email == null || email.isBlank()) {
                throw new IllegalArgumentException("email required for " + name);
            }
            this.email = email;
        }

        @Override
        public String toString() {
            return name + "/" + email;
        }
    }

    public static void main(String[] args) {
        new Employee("Asha", "asha@example.com");
        Employee ravi = null;
        try {
            ravi = new Employee("Ravi", " ");
        } catch (IllegalArgumentException e) {
            System.out.println("caught: " + e.getMessage());
        }
        System.out.println("ravi      = " + ravi);
        System.out.println("directory = " + DIRECTORY);
    }
}`,
        },
        {
          type: "output",
          text: `caught: email required for Ravi
ravi      = null
directory = [Asha/asha@example.com, Ravi/null]`,
        },
        {
          type: "list",
          items: [
            "The caller's view is correct: `ravi` is still `null`, the assignment never happened.",
            "The registry's view is not. It holds an `Employee` whose constructor failed, with a `null` in a `final` field that was supposed to be validated. Any code that mails everyone in `DIRECTORY` would hit a `null` address.",
            "The same leak happens with `listeners.add(this)`, `executor.submit(this::run)` or starting a thread from a constructor. In the threaded versions, the other thread can run before the constructor finishes and see fields assigned after the hand-off still at zero, and the JLS 17.5 final-field guarantee doesn't cover a reference obtained during construction.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix is to construct first and publish after. Validation moves to the top of the constructor, and registration moves out of it into a factory that only sees fully built objects:",
        },
        {
          type: "code",
          language: "java",
          code: `private Employee(String name, String email) {
    if (email == null || email.isBlank()) {              // validate first
        throw new IllegalArgumentException("email required for " + name);
    }
    this.name = name;
    this.email = email;
}

static Employee hire(String name, String email) {
    Employee employee = new Employee(name, email);       // fully built...
    DIRECTORY.add(employee);                             // ...then published
    return employee;
}`,
        },
        {
          type: "paragraph",
          text: "With that version, a failed `hire(\"Meera\", \"\")` left nothing in the list when I ran it: the directory still held only `Asha/asha@example.com`.",
        },
        {
          type: "callout",
          tone: "note",
          title: "The finalizer hole",
          text: "Finalization is deprecated for removal (JEP 421) but still on by default, and it opens a second hole. I wrote a class whose constructor threw on a blank email, and a subclass whose `finalize()` saved `this` in a static field. On both JDK 21 and JDK 25 the subclass got the object back after a GC, with `email = null`; with `--finalization=disabled` on JDK 25 it didn't. JLS 12.6.1 says an object only becomes finalizable once `Object`'s constructor has completed, so security-sensitive classes throw **before** reaching it: with the static-helper-in-`super(...)` trick on Java 21, or a plain check in the prologue on Java 25.",
        },
      ],
    },
    {
      title: "Telescoping Constructors and the Builder",
      blocks: [
        {
          type: "paragraph",
          text: "Overloads that delegate are fine for two or three parameters. Past that, the pattern grows into **telescoping constructors**: one constructor per combination of optional values, each passing defaults down. The call sites become rows of positional values where a swapped pair still compiles. The usual fix is a **builder**, a small mutable helper (here a static nested class) with one named method per optional value:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderRequests.java",
          code: `public class OrderRequests {
    static final class OrderRequest {
        private final String customerId, shipTo, billTo, shipping;
        private final int quantity;
        private final boolean giftWrap;

        OrderRequest(String customerId, String shipTo, String billTo) {        // telescoping
            this(customerId, shipTo, billTo, "STANDARD", 1, false);
        }

        OrderRequest(String customerId, String shipTo, String billTo,
                     String shipping, int quantity, boolean giftWrap) {
            if (giftWrap && quantity > 2) {
                throw new IllegalArgumentException("gift wrap takes at most 2 items");
            }
            this.customerId = customerId;
            this.shipTo = shipTo;
            this.billTo = billTo;
            this.shipping = shipping;
            this.quantity = quantity;
            this.giftWrap = giftWrap;
        }

        static Builder builder(String customerId, String shipTo, String billTo) {
            return new Builder(customerId, shipTo, billTo);
        }

        @Override
        public String toString() {
            return customerId + ": ship to " + shipTo + ", bill to " + billTo + ", " + shipping
                + " x" + quantity + (giftWrap ? ", gift-wrapped" : "");
        }

        static final class Builder {
            private final String customerId, shipTo, billTo;   // required: in the constructor
            private String shipping = "STANDARD";               // optional: defaults
            private int quantity = 1;
            private boolean giftWrap;

            private Builder(String customerId, String shipTo, String billTo) {
                this.customerId = customerId;
                this.shipTo = shipTo;
                this.billTo = billTo;
            }

            Builder shipping(String s)   { shipping = s; return this; }
            Builder quantity(int q)      { quantity = q; return this; }
            Builder giftWrap(boolean g)  { giftWrap = g; return this; }

            OrderRequest build() {
                return new OrderRequest(customerId, shipTo, billTo, shipping, quantity, giftWrap);
            }
        }
    }

    public static void main(String[] args) {
        System.out.println(new OrderRequest("C-17", "Kolkata", "Pune"));
        System.out.println(new OrderRequest("C-17", "Kolkata", "Pune", "EXPRESS", 2, true));
        System.out.println(new OrderRequest("C-17", "Pune", "Kolkata", "EXPRESS", 2, true));
        System.out.println(OrderRequest.builder("C-17", "Kolkata", "Pune")
            .shipping("EXPRESS").quantity(2).giftWrap(true).build());
        try {
            OrderRequest.builder("C-18", "Delhi", "Delhi").giftWrap(true).quantity(4).build();
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `C-17: ship to Kolkata, bill to Pune, STANDARD x1
C-17: ship to Kolkata, bill to Pune, EXPRESS x2, gift-wrapped
C-17: ship to Pune, bill to Kolkata, EXPRESS x2, gift-wrapped
C-17: ship to Kolkata, bill to Pune, EXPRESS x2, gift-wrapped
rejected: gift wrap takes at most 2 items`,
        },
        {
          type: "list",
          items: [
            "The third line is the telescoping problem in one row: the shipping and billing addresses are both `String`, I swapped them, and it compiled and ran. Nothing reads `\"EXPRESS\", 2, true` and tells me which value is which, either.",
            "The builder call names every optional value, and anything not named keeps its default. Required values stay in the builder's own constructor, so they can't be forgotten.",
            "Validation lives in `OrderRequest`'s main constructor, so it holds no matter which path created the object. The builder only collects values; the rejected gift-wrapped order of four items was stopped by the same check.",
            "The built `OrderRequest` is still immutable. All the mutability is in the short-lived builder. The Performance section measures what that extra object costs: no extra allocation at all, once the JIT has compiled the code.",
          ],
        },
        {
          type: "paragraph",
          text: "Lombok's `@Builder` and records with a hand-written builder are common in Spring code. The Nested and Inner Classes lesson looks at why the builder is a `static` nested class, and the Design Patterns track covers the pattern itself.",
        },
      ],
    },
    {
      title: "Records and Their Constructors",
      blocks: [
        {
          type: "paragraph",
          text: "A record declares its state in the header, `record Price(String currency, long paise)`, and the compiler generates a **canonical constructor** with exactly those parameters that assigns every field. I can replace it, but usually I want to add checks, not rewrite assignments. That's what the **compact canonical constructor** is for: no parameter list, and the field assignments happen automatically at the end:",
        },
        {
          type: "code",
          language: "java",
          title: "RecordPrices.java",
          code: `public class RecordPrices {
    record Price(String currency, long paise) {
        Price {                                          // compact canonical constructor
            currency = currency == null ? "INR" : currency.strip().toUpperCase();
            if (paise < 0) {
                throw new IllegalArgumentException("negative price: " + paise);
            }
        }                                                // fields are assigned here, after the body

        Price(long paise) {                              // any other constructor must call this(...)
            this("INR", paise);
        }
    }

    public static void main(String[] args) {
        System.out.println(new Price(" inr ", 24_550));
        System.out.println(new Price(9_900));
        System.out.println(new Price(null, 0));
        try {
            new Price("INR", -100);
        } catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Price[currency=INR, paise=24550]
Price[currency=INR, paise=9900]
Price[currency=INR, paise=0]
rejected: negative price: -100`,
        },
        {
          type: "paragraph",
          text: "Inside the compact constructor, `currency` and `paise` are the **parameters**, not the fields. Reassigning the parameter is how normalization works: `\" inr \"` became `INR`. `javap -c -p 'RecordPrices$Price'` shows where the field assignments went. The canonical constructor starts with `invokespecial java/lang/Record.\"<init>\"` (every record extends `java.lang.Record`), then my code, including an `astore_1` that writes the normalized currency back into the parameter slot, and only at offsets 43 and 48, after my last line, the two `putfield`s. So validation and normalization always happen before any field is set.",
        },
        {
          type: "paragraph",
          text: "`Price(long)` compiled to nothing but a delegation: push `this`, `\"INR\"` and `paise`, call the canonical `<init>:(Ljava/lang/String;J)V`, return. That's mandatory: every non-canonical record constructor must delegate with `this(...)`, so all creation funnels through the canonical constructor and its checks. Leaving it out is a compile error:",
        },
        {
          type: "code",
          language: "java",
          title: "PriceNoThis.java",
          code: `public record PriceNoThis(String currency, long paise) {
    public PriceNoThis(long paise) {
        System.out.println("INR by default");
    }
}`,
        },
        {
          type: "output",
          text: `PriceNoThis.java:2: error: constructor is not canonical, so its first statement must invoke another constructor of class PriceNoThis
    public PriceNoThis(long paise) {
           ^
1 error`,
        },
        {
          type: "paragraph",
          text: "On JDK 25 the message drops \"its first statement\" (`constructor is not canonical, so it must invoke another constructor`), because a prologue may now come first. `javap -v` also showed that the canonical constructor carries a `MethodParameters` attribute naming `currency` and `paise`, flagged `mandated`, even without the `-parameters` compiler flag. Between that and `Class.getRecordComponents()`, a record's constructor parameter names are always available at runtime, which is why Jackson can feed JSON into a record's canonical constructor without any annotations (production section).",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `Car car = new Car(4);` from `OverrideTrap`, the program in the diagram above, from source to the moment `main` holds the reference:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time.** `javac` picks the overload `Car(int)` from the argument types, the same way it picks a method overload, and emits `new`, `dup`, `iconst_4`, `invokespecial Car.\"<init>\":(I)V`, `astore_1`.",
            "**Compile time.** `Car(int)` becomes `<init>(I)V`: the explicit `super()` becomes `aload_0, invokespecial Vehicle.\"<init>\":()V`, followed by the field initializers for `category` and `fuel`, then the body's `putfield seats`. `Vehicle()` gets an implicit call to `Object.<init>`, and its `describe()` call becomes `invokevirtual`.",
            "**Compile time.** In `Car.describe()`, the read of the constant variable `fuel` is replaced by the literal `\"CNG\"`.",
            "**Run time.** The first time `new` runs, the class reference is resolved and the JVM initializes `Vehicle`, then `Car`, if that hasn't happened yet. Neither has static code, so nothing is printed.",
            "`new` allocates one block sized for every field in the hierarchy, zeroes it, writes the header and pushes the reference. `dup` copies it.",
            "`invokespecial Car.<init>(I)V` creates a frame with the reference in slot 0 (`this`) and `4` in slot 1.",
            "`Car.<init>` first calls `Vehicle.<init>`, which first calls `Object.<init>`, a single `return`.",
            "Back in `Vehicle.<init>`, `invokevirtual describe` looks the method up on the object's actual class, `Car`. `Car.describe()` reads `category = null` and `seats = 0`, and `Vehicle`'s constructor prints `null, 0 seats, CNG`.",
            "`Vehicle.<init>` returns. `Car.<init>` stores `category = \"SEDAN\"` and `fuel = \"CNG\"`, then `seats = 4`, and returns. The end of this constructor is where JLS 17.5 freezes the final fields `seats` and `fuel`.",
            "Back in `main`, `astore_1` stores the second copy of the reference in `car`. Only now does the caller hold the new object.",
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
          title: "ConstructorSyntax.java",
          code: `public class ConstructorSyntax {
    static class Vehicle {
        final String plate;

        Vehicle(String plate) {                          // parameterized
            this.plate = plate;
        }
    }

    static class Car extends Vehicle {
        static int built;
        final int seats;
        String status = "PARKED";                        // field initializer
        {
            built++;                                     // instance initializer block
        }

        Car(String plate, int seats) {                   // the main constructor
            super(plate);                                // explicit super(...)
            if (seats < 1) throw new IllegalArgumentException("seats: " + seats);
            this.seats = seats;
        }

        Car(String plate) {                              // overload, delegates with this(...)
            this(plate, 4);
        }

        Car(Car other) {                                 // copy constructor
            this(other.plate, other.seats);
        }

        private Car() {                                  // private: only the factory uses it
            this("UNREGISTERED");
        }

        static Car placeholder() {                       // static factory
            return new Car();
        }
    }

    record Price(String currency, long paise) {
        Price {                                          // compact canonical constructor
            if (paise < 0) throw new IllegalArgumentException("paise: " + paise);
        }

        Price(long paise) {                              // must delegate with this(...)
            this("INR", paise);
        }
    }

    public static void main(String[] args) {
        Car a = new Car("WB-02-1234", 6);
        Car b = new Car("WB-02-5678");
        Car c = new Car(a);
        Car d = Car.placeholder();
        System.out.println(a.plate + "/" + a.seats + " " + b.plate + "/" + b.seats + " "
            + c.plate + "/" + c.seats + " " + d.plate + "/" + d.status);
        System.out.println("built " + Car.built + ", " + new Price(9_900));

        Runnable ping = new Runnable() {                 // anonymous: no constructor, only a block
            final String city;
            {
                city = "Pune";
            }

            public void run() { System.out.println("ping from " + city); }
        };
        ping.run();
    }
}`,
        },
        {
          type: "output",
          text: `WB-02-1234/6 WB-02-5678/4 WB-02-1234/6 UNREGISTERED/PARKED
built 4, Price[currency=INR, paise=9900]
ping from Pune`,
        },
        {
          type: "paragraph",
          text: "`built 4` is the instance block counting four `Car` objects, one per `new`, even though `b`, `c` and `d` went through delegating constructors. The block was copied only into `Car(String, int)`, and every path ends there. The anonymous `Runnable` shows the one kind of class that can't declare a constructor at all, because it has no name to give one. Its initializer block is how it sets a `final` field.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Invariants at birth: setters versus a constructor",
        },
        {
          type: "paragraph",
          text: "The same bank account written twice: once JavaBean-style with a no-arg constructor and setters, once with a constructor that refuses bad input.",
        },
        {
          type: "code",
          language: "java",
          title: "AccountInvariants.java",
          code: `import java.util.Objects;

public class AccountInvariants {
    // Can exist half-built: fields start empty and wait for setters
    static class BeanAccount {
        private String owner;
        private long balancePaise;

        void setOwner(String owner) { this.owner = owner; }
        void setBalancePaise(long balancePaise) { this.balancePaise = balancePaise; }
        String label() { return owner.toUpperCase() + ": Rs " + balancePaise / 100; }
    }

    // Can only exist valid: checked once, at birth, and nothing can undo it
    static final class BankAccount {
        private final String owner;
        private final long balancePaise;

        BankAccount(String owner, long balancePaise) {
            this.owner = Objects.requireNonNull(owner, "owner");
            if (balancePaise < 0) {
                throw new IllegalArgumentException("balance cannot be negative: " + balancePaise);
            }
            this.balancePaise = balancePaise;
        }

        String label() { return owner.toUpperCase() + ": Rs " + balancePaise / 100; }
    }

    public static void main(String[] args) {
        BeanAccount bean = new BeanAccount();
        bean.setBalancePaise(-50_000);                 // accepted without a word
        try {
            System.out.println(bean.label());
        } catch (NullPointerException e) {
            System.out.println("bean:    " + e.getMessage());
        }
        System.out.println("account: " + new BankAccount("asha", 25_000).label());
        try {
            new BankAccount("ravi", -50_000);
        } catch (IllegalArgumentException e) {
            System.out.println("account: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `bean:    Cannot invoke "String.toUpperCase()" because "this.owner" is null
account: ASHA: Rs 250
account: balance cannot be negative: -50000`,
        },
        {
          type: "paragraph",
          text: "The bean accepted a negative balance and then blew up far from the real mistake, a missing `setOwner` call. The `BankAccount` refused the bad value at the only moment it could arrive, and every `BankAccount` that exists is valid by construction, so `label()` never needs a null check.",
        },
        {
          type: "heading",
          text: "Copy constructor versus clone()",
        },
        {
          type: "code",
          language: "java",
          title: "CopyCourse.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class CopyCourse {
    static class Course implements Cloneable {
        static int constructorRuns = 0;
        final String title;
        final List<String> students;

        Course(String title, List<String> students) {
            constructorRuns++;
            this.title = title;
            this.students = new ArrayList<>(students);    // never keep the caller's list
        }

        Course(Course other) {                            // copy constructor
            this(other.title, other.students);
        }

        @Override
        public Course clone() {
            try {
                return (Course) super.clone();            // field-by-field, no constructor
            } catch (CloneNotSupportedException e) {
                throw new AssertionError(e);
            }
        }

        @Override
        public String toString() {
            return title + " " + students;
        }
    }

    public static void main(String[] args) {
        Course original = new Course("Java 101", List.of("Asha", "Ravi"));
        Course copy = new Course(original);
        Course cloned = original.clone();

        copy.students.add("Meera");
        cloned.students.add("Kabir");

        System.out.println("original: " + original);
        System.out.println("copy:     " + copy);
        System.out.println("cloned:   " + cloned);
        System.out.println("constructor runs: " + Course.constructorRuns);
    }
}`,
        },
        {
          type: "output",
          text: `original: Java 101 [Asha, Ravi, Kabir]
copy:     Java 101 [Asha, Ravi, Meera]
cloned:   Java 101 [Asha, Ravi, Kabir]
constructor runs: 2`,
        },
        {
          type: "diagram",
          text: ` stack           heap
┌──────────┐    ┌───────────────────┐    ┌─────────────────────┐
│ original ┼──► │ Course "Java 101" │    │ ArrayList           │
│          │    │ students ─────────┼───►│ [Asha, Ravi, Kabir] │
│          │    └───────────────────┘ ┌─►│                     │
│          │    ┌───────────────────┐ │  └─────────────────────┘
│ cloned ──┼──► │ Course "Java 101" │ │
│          │    │ students ─────────┼─┘
│          │    └───────────────────┘
│          │    ┌───────────────────┐    ┌─────────────────────┐
│ copy ────┼──► │ Course "Java 101" │    │ ArrayList (its own) │
│          │    │ students ─────────┼───►│ [Asha, Ravi, Meera] │
└──────────┘    └───────────────────┘    └─────────────────────┘`,
          caption: "clone() copied the reference to the list; the copy constructor built a new list.",
        },
        {
          type: "list",
          items: [
            "The copy constructor is an ordinary constructor, so it reuses the main one through `this(...)`, which copies the list. Adding `Meera` to the copy left the original alone.",
            "`clone()` copied the fields one by one, including the reference to the same `ArrayList`, so `Kabir` showed up in the original too. And `constructor runs: 2` proves the clone was created without running any constructor, so a check in the constructor would never have seen it.",
            "`clone()` also can't assign a `final` field after copying (fields are already set when `super.clone()` returns), so a deep clone of a class with final fields needs reflection or a constructor anyway. The Object Class Methods lesson has the full story. My default is a copy constructor or a static `copyOf` factory.",
          ],
        },
        {
          type: "heading",
          text: "Reflection: how frameworks call constructors",
        },
        {
          type: "paragraph",
          text: "Frameworks never write `new MyClass(...)`, because they didn't know the class at compile time. They look up a `Constructor` object and invoke it. Access rules still apply, until `setAccessible(true)` switches them off for classes in my own (unnamed) module:",
        },
        {
          type: "code",
          language: "java",
          title: "ReflectiveNew.java",
          code: `import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;

class Employee {
    private final String name;

    private Employee(String name) {
        this.name = name;
        System.out.println("  Employee(\\"" + name + "\\") ran");
    }

    @Override
    public String toString() {
        return "Employee " + name;
    }
}

final class PriceMath {
    private PriceMath() {
        throw new AssertionError("PriceMath is a utility class");
    }
}

public class ReflectiveNew {
    public static void main(String[] args) throws Exception {
        Constructor<Employee> ctor = Employee.class.getDeclaredConstructor(String.class);
        System.out.println(ctor);
        try {
            ctor.newInstance("Asha");
        } catch (IllegalAccessException e) {
            System.out.println("  " + e.getMessage());
        }

        ctor.setAccessible(true);                   // what frameworks do
        Employee asha = ctor.newInstance("Asha");
        System.out.println("  got " + asha);

        Constructor<PriceMath> util = PriceMath.class.getDeclaredConstructor();
        util.setAccessible(true);
        try {
            util.newInstance();
        } catch (InvocationTargetException e) {
            System.out.println("  wrapped: " + e.getCause());
        }
    }
}`,
        },
        {
          type: "output",
          text: `private Employee(java.lang.String)
  class ReflectiveNew cannot access a member of class Employee with modifiers "private"
  Employee("Asha") ran
  got Employee Asha
  wrapped: java.lang.AssertionError: PriceMath is a utility class`,
        },
        {
          type: "paragraph",
          text: "A private constructor stops honest code, not reflection. That's why the utility class throws: the `AssertionError` still fired, wrapped in an `InvocationTargetException` the way reflection wraps anything a constructor throws. Frameworks do a version of this lookup-then-invoke: Jackson and Hibernate with a no-arg constructor or a declared creator, Spring with the constructor whose parameters it can satisfy from other beans.",
        },
        {
          type: "heading",
          text: "Enum constructors run once per constant",
        },
        {
          type: "code",
          language: "java",
          title: "CarTypes.java",
          code: `public class CarTypes {
    enum CarType {
        HATCHBACK(4, 3), SEDAN(5, 4), SUV(7, 5);

        final int seats;
        final int doors;

        CarType(int seats, int doors) {                  // implicitly private
            this.seats = seats;
            this.doors = doors;
            System.out.println("  constructed " + name() + ", ordinal " + ordinal());
        }
    }

    public static void main(String[] args) {
        System.out.println("main starts");
        System.out.println("SEDAN seats: " + CarType.SEDAN.seats);
        System.out.println("SUV doors: " + CarType.SUV.doors);
        System.out.println("valueOf: " + CarType.valueOf("HATCHBACK").seats);
    }
}`,
        },
        {
          type: "output",
          text: `main starts
  constructed HATCHBACK, ordinal 0
  constructed SEDAN, ordinal 1
  constructed SUV, ordinal 2
SEDAN seats: 5
SUV doors: 5
valueOf: 4`,
        },
        {
          type: "paragraph",
          text: "All three constants were built when `CarType` was initialized, on the first access to `SEDAN`, and never again. `javap -c -p 'CarTypes$CarType'` shows why: the constants are created in `static {}`, the class initializer, with `new`, `dup` and `invokespecial \"<init>\":(Ljava/lang/String;III)V`. That descriptor has two parameters I never declared, the constant's name and ordinal, passed up to `java.lang.Enum`'s constructor, which is why `name()` already worked inside mine. And `new CarType(...)` anywhere is rejected with `enum classes may not be instantiated`.",
        },
      ],
    },
    {
      title: "When to Use a Constructor, a Factory or a Builder",
      blocks: [
        {
          type: "paragraph",
          text: "Every object starts in some constructor. The design question is what callers see: the constructor itself, a named static method in front of it, or a builder. This is how I decide, and the capstone lesson, When to Use What in Java OOP, puts the same choice next to the other OOP decisions.",
        },
        {
          type: "table",
          headers: ["Situation", "Reach for", "Example"],
          rows: [
            ["A few required values with one obvious meaning", "Public constructor", "`new BankAccount(\"asha\", 25_000)`"],
            ["A plain data carrier that needs validation", "Record with a compact constructor", "`record Price(String currency, long paise)`"],
            ["Same parameter types, different meanings", "Named static factories", "`Money.ofRupees(250)`, `Money.ofPaise(4_550)`"],
            ["Instances can be shared or cached", "Static factory", "`Money.ofPaise(0)` returning `ZERO`"],
            ["The class to create depends on the input", "Static factory returning an interface", "`PaymentMethod.fromToken(token)` below"],
            ["Four or more parameters, or several optional ones", "Builder", "`OrderRequest.builder(...).quantity(2).build()`"],
            ["An independent copy of an existing object", "Copy constructor or `copyOf` factory", "`new Course(other)`"],
            ["No instances should exist", "Private constructor that throws", "`PriceMath`"],
            ["Creation needs I/O or must register the object", "Factory method or a service, not the constructor", "`Employee.hire(...)`"],
            ["A framework creates it (JSON, JPA)", "Record or `@JsonCreator`; no-arg constructor for JPA", "A JSON request DTO (see the production section)"],
          ],
        },
        {
          type: "diagram",
          text: `Need a new object?
 │
 ├─ Should instances exist at all? ── no ──► private constructor
 │
 ├─ Same values can be shared, or the class
 │  depends on the input? ──────── yes ──► static factory
 │
 ├─ 4+ parameters, optional ones, or
 │  same-typed values in a row? ── yes ──► builder (or record + builder)
 │
 ├─ Two ways to read the same types
 │  (rupees vs paise)? ─────────── yes ──► named static factories
 │
 └─ otherwise ─────────────────────────► constructor
                                          (a record if it's just data)`,
          caption: "Top to bottom, first match wins. Validation goes in the constructor in every branch.",
        },
        {
          type: "list",
          items: [
            "Start with a constructor. Move to a factory only for a concrete reason: a name, a cache, a subtype, or a choice of class.",
            "Keep one constructor that assigns and validates everything. Every other constructor, factory or builder ends up calling it.",
            "A constructor computes and assigns. It doesn't do I/O, start threads, register `this` anywhere or call overridable methods.",
            "If two adjacent parameters have the same type and swapping them would be a bug, the call site needs names: a builder, a parameter record, or small value types like `CustomerId`.",
          ],
        },
        {
          type: "heading",
          text: "A right choice and a wrong one",
        },
        {
          type: "list",
          items: [
            "**Right:** `Money.ofRupees(250)` instead of `new Money(25_000)`. The unit is in the name, so the 100x bug of passing rupees where paise were expected can't hide in a call site.",
            "**Wrong:** the six-value `new OrderRequest(...)` with the shipping and billing addresses swapped. It compiled, ran, and would ship the parcel to the billing address. A builder or `ShipTo`/`BillTo` value types would have made it unwritable.",
            "**Wrong in the other direction:** a builder for `record Location(double lat, double lng)`. Two required values don't need one, and a builder makes it possible to forget `lat` and silently get `0.0`, which moves a Kolkata store to the equator, somewhere in the Indian Ocean.",
          ],
        },
        {
          type: "paragraph",
          text: "The case where a constructor simply can't do the job is choosing the class at runtime. A constructor always produces exactly its own class, while a factory can return any implementation:",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentMethods.java",
          code: `public class PaymentMethods {
    interface PaymentMethod {
        // A constructor always produces exactly its own class. A factory can choose.
        static PaymentMethod fromToken(String token) {
            if (token.contains("@")) return new Upi(token);
            if (token.length() == 16 && token.chars().allMatch(Character::isDigit)) {
                return new Card(token.substring(12));
            }
            if (token.startsWith("NB-")) return new NetBanking(token.substring(3));
            throw new IllegalArgumentException("unknown payment token: " + token);
        }
    }

    record Upi(String vpa) implements PaymentMethod { }
    record Card(String last4) implements PaymentMethod { }
    record NetBanking(String customerId) implements PaymentMethod { }

    public static void main(String[] args) {
        for (String token : new String[] {"asha@okbank", "4111111111111111", "NB-ravi"}) {
            System.out.println(PaymentMethod.fromToken(token));
        }
        try {
            PaymentMethod.fromToken("cash");
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Upi[vpa=asha@okbank]
Card[last4=1111]
NetBanking[customerId=ravi]
unknown payment token: cash`,
        },
        {
          type: "paragraph",
          text: "The caller only knows `PaymentMethod`. Adding gift cards means one more record and one more line in `fromToken`, and no caller changes. Each record can still validate in its own compact constructor, so the factory decides **which** object to build and the constructor decides whether it's **valid**.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Assigning a parameter to itself",
        },
        {
          type: "code",
          language: "java",
          title: "SelfAssign.java",
          code: `public class SelfAssign {
    static class Price {
        long paise;
        String currency;

        Price(long paise, String currency) {
            paise = paise;                     // assigns the parameter to itself
            currency = currency;
        }
    }

    public static void main(String[] args) {
        Price price = new Price(24_550, "INR");
        System.out.println(price.paise + " " + price.currency);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac -Xlint:all SelfAssign.java && java SelfAssign",
        },
        {
          type: "output",
          text: "0 null",
        },
        {
          type: "paragraph",
          text: "The parameter shadows the field, so `paise = paise` reads and writes the parameter. No warning, even with `-Xlint:all`, and the fields keep their zero values. Making both fields `final` turns the same typo into a compile error, `variable paise might not have been initialized`, at the constructor's closing brace. Only `paise` is reported, because `javac` reports one error per source position; after I fixed it, the next compile reported `currency`. The real fix is `this.paise = paise;`.",
        },
        {
          type: "heading",
          text: "Returning a value",
        },
        {
          type: "code",
          language: "java",
          title: "ReturnValue.java",
          code: `public class ReturnValue {
    private final long paise;

    ReturnValue(long paise) {
        this.paise = paise;
        return this;
    }
}`,
        },
        {
          type: "output",
          text: `ReturnValue.java:6: error: incompatible types: unexpected return value
        return this;
               ^
1 error`,
        },
        {
          type: "paragraph",
          text: "A bare `return;` is allowed for leaving a constructor early, a value is not. The `new` expression's value is always the new object, and the constructor itself is a `void` method in the class file.",
        },
        {
          type: "heading",
          text: "Assigning a field in a compact constructor",
        },
        {
          type: "code",
          language: "java",
          title: "CompactAssign.java",
          code: `public record CompactAssign(String currency, long paise) {
    public CompactAssign {
        this.paise = Math.max(0, paise);
    }
}`,
        },
        {
          type: "output",
          text: `CompactAssign.java:3: error: cannot assign a value to final variable paise
        this.paise = Math.max(0, paise);
            ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The compiler owns the field assignments in a compact constructor and adds them at the end. The fix is to reassign the parameter, `paise = Math.max(0, paise);`, as `RecordPrices` did with `currency`.",
        },
        {
          type: "heading",
          text: "The ones shown earlier",
        },
        {
          type: "list",
          items: [
            "`void Order()` is a method. `VoidTrap` printed `NEW`: the default constructor ran, the \"constructor\" didn't.",
            "Calling an overridable method from a constructor. `OverrideTrap` printed `null, 0 seats` for a `Car` that was built with `SEDAN` and 4 seats.",
            "Adding a parameterized constructor and losing the default one. `NoDefault` failed to compile; with frameworks the same change fails at runtime instead.",
            "Publishing `this` before validation. `LeakyRegistry` kept `Ravi/null` in the directory after his constructor threw.",
            "Expecting the implicit `super()` to find a parameterized parent constructor. `ImplicitSuper` pointed the error at a line with no visible call.",
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
            "Make the constructor establish every invariant, and make every field that shouldn't change `final`. Then an object that exists is an object that's valid.",
            "Validate arguments first, before assigning anything or calling anything. On Java 25 that includes before `super(...)`.",
            "Keep one main constructor. Other constructors delegate with `this(...)`, and factories and builders call it, so the checks live in one place.",
            "Never call an overridable method from a constructor. Use `private`, `final` or `static` helpers.",
            "Never let `this` escape: no registries, listeners, executors or thread starts inside a constructor. Construct, then publish from outside.",
            "Copy mutable arguments (`new ArrayList<>(students)`) instead of storing the caller's collection.",
            "Keep constructors cheap: no I/O, no network calls, no heavy computation. Spring creates singletons at startup, so a slow constructor is a slow deploy.",
            "Prefer named static factories when the parameter types don't explain themselves, and a builder past three or four parameters.",
            "For data carriers, use a record and put validation and normalization in a compact constructor.",
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
            "Allocation itself is cheap: a pointer bump in the thread's TLAB, covered in the Memory Allocation lesson. A constructor adds only the code I put in it.",
            "To the JIT, a constructor is an ordinary method. With `-XX:+PrintInlining` I watched C2 compile a hot loop doing `new Car(\"WB\")` through a `this(...)` and `super(...)` chain: `Car::<init> (7 bytes)`, `Car::<init> (11 bytes)`, `Vehicle::<init> (10 bytes)` and `Object::<init> (1 bytes)` were all marked `inline (hot)`, so the whole chain became part of the caller's compiled code.",
            "HotSpot's JIT puts a memory barrier at the end of a constructor that writes `final` fields, to implement the JLS 17.5 guarantee. On x86 it compiles to nothing, because the hardware already keeps stores in order; on ARM it's a real, cheap instruction. I haven't measured it, and I wouldn't drop `final` to save it.",
            "Reflection-based creation (Jackson, Hibernate, Spring) costs more per call than `new`, but frameworks look up and cache `Constructor` objects once. Since JDK 18, core reflection is built on method handles (JEP 416).",
            "A static factory that caches saves the allocation completely, as `Integer.valueOf` does for -128 to 127.",
          ],
        },
        {
          type: "paragraph",
          text: "The question I actually get asked is whether a builder's extra object matters. I measured bytes allocated per call, with the same `ThreadMXBean` counter as in the Memory Allocation lesson, after a warm-up so the JIT had compiled everything:",
        },
        {
          type: "code",
          language: "java",
          title: "CreationCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.function.LongFunction;

public class CreationCost {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;                                  // keeps every result reachable

    record Quote(String product, long paise, int quantity) { }

    static final class QuoteBuilder {
        private String product;
        private long paise;
        private int quantity = 1;

        QuoteBuilder product(String p) { product = p; return this; }
        QuoteBuilder paise(long p)     { paise = p; return this; }
        QuoteBuilder quantity(int q)   { quantity = q; return this; }
        Quote build()                  { return new Quote(product, paise, quantity); }
    }

    static Quote viaConstructor(long paise) {
        return new Quote("Laptop", paise, 2);
    }

    static Quote viaBuilder(long paise) {
        return new QuoteBuilder().product("Laptop").paise(paise).quantity(2).build();
    }

    static long bytesPerCall(LongFunction<?> f) {
        for (int i = 0; i < 300_000; i++) sink = f.apply(i);   // warm up: let C2 compile it
        long id = Thread.currentThread().threadId();
        long before = MX.getThreadAllocatedBytes(id);
        for (int i = 0; i < 1_000_000; i++) sink = f.apply(i);
        return (MX.getThreadAllocatedBytes(id) - before) / 1_000_000;
    }

    public static void main(String[] args) {
        System.out.println("new Quote(...):        " + bytesPerCall(CreationCost::viaConstructor) + " bytes per call");
        System.out.println("builder, then build(): " + bytesPerCall(CreationCost::viaBuilder) + " bytes per call");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java CreationCost                          # three runs, same numbers each time
java -XX:-DoEscapeAnalysis CreationCost    # same with escape analysis off`,
        },
        {
          type: "output",
          text: `new Quote(...):        32 bytes per call
builder, then build(): 32 bytes per call

# -XX:-DoEscapeAnalysis
new Quote(...):        32 bytes per call
builder, then build(): 64 bytes per call`,
        },
        {
          type: "list",
          items: [
            "A `Quote` is 32 bytes (12 of header, 4 + 8 + 4 of fields, padded to a multiple of 8). With the JIT's defaults, the builder version allocated exactly the same 32 bytes: the builder never escaped `viaBuilder`, so C2 replaced it with plain local values (scalar replacement, from the Memory Allocation lesson).",
            "With escape analysis off, the builder's own 32 bytes came back, 64 per call. `-Xint` gave the same 64. So the builder's cost exists in cold code and disappears in hot code.",
            "These are allocation counts, not timings, and they were identical across runs on my JDK 21. On JDK 25 with `-XX:+UseCompactObjectHeaders` (JEP 519, a product option that's off by default), the same program printed 24 bytes for both lines, because the header shrinks from 12 bytes to 8. The direction doesn't change: once compiled, the builder adds no allocation.",
          ],
        },
      ],
    },
    {
      title: "Constructors in Production",
      blocks: [
        {
          type: "paragraph",
          text: "In a Spring Boot ride-hailing backend I write very few `new` expressions for services and DTOs. Spring creates the services, Jackson creates request and response objects, Hibernate creates entities. All three have to call some constructor, and each has rules about which one. These are the two cases I'd expect to hit first. I ran them against the real libraries without Spring Boot, so the container's behaviour is visible.",
        },
        {
          type: "heading",
          text: "Spring: constructor injection versus field injection",
        },
        {
          type: "code",
          language: "java",
          title: "RideWiring.java",
          code: `import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

public class RideWiring {
    static class FareCalculator {
        long quotePaise(int km) {
            return 5_000 + km * 1_200L;
        }
    }

    static class DriverRepository {
        String nearest(String zone) {
            return "Asha";
        }
    }

    // Constructor injection: one constructor, final fields, no @Autowired needed
    static class RideService {
        private final FareCalculator fares;
        private final DriverRepository drivers;

        RideService(FareCalculator fares, DriverRepository drivers) {
            this.fares = fares;
            this.drivers = drivers;
        }

        String book(String zone, int km) {
            return drivers.nearest(zone) + ", Rs " + fares.quotePaise(km) / 100;
        }
    }

    // Field injection: Spring fills the fields after the constructor has run
    static class FieldInjectedRideService {
        @Autowired private FareCalculator fares;
        @Autowired private DriverRepository drivers;

        String book(String zone, int km) {
            return drivers.nearest(zone) + ", Rs " + fares.quotePaise(km) / 100;
        }
    }

    public static void main(String[] args) {
        try (var ctx = new AnnotationConfigApplicationContext(FareCalculator.class,
                DriverRepository.class, RideService.class, FieldInjectedRideService.class)) {
            System.out.println("Spring, constructor: " + ctx.getBean(RideService.class).book("Salt Lake", 8));
            System.out.println("Spring, field:       " + ctx.getBean(FieldInjectedRideService.class).book("Salt Lake", 8));
        }

        // A plain unit test: no container, just new
        var fakeFares = new FareCalculator();
        var fakeDrivers = new DriverRepository();
        System.out.println("Test, constructor:   " + new RideService(fakeFares, fakeDrivers).book("Salt Lake", 8));
        System.out.println("Test, field:         " + new FieldInjectedRideService().book("Salt Lake", 8));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# $SPRING = org.springframework:spring-context:6.2.11 and its dependencies (spring-core,
# spring-beans, spring-aop, spring-expression, spring-jcl, micrometer-observation)
javac -cp "$SPRING" RideWiring.java && java -cp "$SPRING:." RideWiring`,
        },
        {
          type: "output",
          text: `Spring, constructor: Asha, Rs 146
Spring, field:       Asha, Rs 146
Test, constructor:   Asha, Rs 146
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "RideWiring$DriverRepository.nearest(String)" because "this.drivers" is null
	at RideWiring$FieldInjectedRideService.book(RideWiring.java:38)
	at RideWiring.main(RideWiring.java:53)`,
        },
        {
          type: "list",
          items: [
            "Inside the container both versions work. For `RideService`, Spring found the only constructor and passed in the two beans. No `@Autowired` is needed on a class with a single constructor; Spring has autowired it implicitly since 4.3.",
            "For the field-injected version, Spring called the default constructor, then set the private fields by reflection. The object existed, invalid, between those two steps.",
            "The unit test is where it shows. `new FieldInjectedRideService()` compiled and returned an object with both dependencies `null`, and the NPE named `this.drivers`. Nothing in the class's API says it needs a container to be usable.",
            "With constructor injection the dependencies are `final`, the object can't exist without them, and a test passes fakes straight into the constructor. A constructor that grows to eight parameters is also a visible signal that the class does too much; eight `@Autowired` fields are easy to miss. That's why Spring's own documentation advises constructor injection for required dependencies.",
          ],
        },
        {
          type: "heading",
          text: "A circular dependency fails at startup",
        },
        {
          type: "paragraph",
          text: "Constructor injection has one more consequence. Two beans that need each other in their constructors can't both be created first:",
        },
        {
          type: "code",
          language: "java",
          title: "CircularRides.java",
          code: `import org.springframework.context.annotation.AnnotationConfigApplicationContext;

public class CircularRides {
    static class DispatchService {
        private final PricingService pricing;

        DispatchService(PricingService pricing) {
            this.pricing = pricing;
        }
    }

    static class PricingService {
        private final DispatchService dispatch;            // only wanted the open-request count

        PricingService(DispatchService dispatch) {
            this.dispatch = dispatch;
        }
    }

    public static void main(String[] args) {
        try (var ctx = new AnnotationConfigApplicationContext(DispatchService.class, PricingService.class)) {
            System.out.println("started");
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null) root = root.getCause();
            System.out.println("thrown:     " + e.getClass().getName());
            System.out.println("root cause: " + root.getClass().getName());
            System.out.println(root.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `... org.springframework.context.support.AbstractApplicationContext refresh
WARNING: Exception encountered during context initialization - cancelling refresh attempt: org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'circularRides.DispatchService': Unsatisfied dependency expressed through constructor parameter 0: Error creating bean with name 'circularRides.PricingService': Unsatisfied dependency expressed through constructor parameter 0: Error creating bean with name 'circularRides.DispatchService': Requested bean is currently in creation: Is there an unresolvable circular reference or an asynchronous initialization dependency?
thrown:     org.springframework.beans.factory.UnsatisfiedDependencyException
root cause: org.springframework.beans.factory.BeanCurrentlyInCreationException
Error creating bean with name 'circularRides.DispatchService': Requested bean is currently in creation: Is there an unresolvable circular reference or an asynchronous initialization dependency?`,
        },
        {
          type: "list",
          items: [
            "The first two lines are Spring's own log (the timestamp trimmed). Read left to right, the chain is the story: creating `DispatchService` needed constructor parameter 0, a `PricingService`; creating that needed its parameter 0, a `DispatchService`, which was \"currently in creation\". Neither constructor can run first, so the context refuses to start.",
            "That's the useful outcome: the service dies at startup, in CI, not under traffic. With field injection, plain Spring quietly wires the same cycle by injecting an early reference after construction. I tried the two classes with `@Autowired` fields and the context started. Calling `setAllowCircularReferences(false)` on the context, which is Spring Boot's default since 2.6, turned that into the same `BeanCurrentlyInCreationException`.",
            "The real fix is a design change. `PricingService` only needed the number of open requests, so that moves into a `DemandTracker` bean that both services depend on. When I ran that version, the context started and printed `Salt Lake: 42 open, surge x1.5`.",
            "`@Lazy` on one constructor parameter also breaks the cycle: Spring injected a CGLIB proxy (`PricingService$$SpringCGLIB$$0`) and resolved the real bean on first use. `ObjectProvider<PricingService>` works too. Both hide the cycle rather than remove it, so I'd only use them as a stopgap.",
          ],
        },
        {
          type: "heading",
          text: "Jackson: a DTO with no usable constructor",
        },
        {
          type: "paragraph",
          text: "Jackson (`com.fasterxml.jackson.core:jackson-databind` 2.21.7) creates objects the same way frameworks always do: find a constructor it knows how to call, call it, then fill in what's left. An immutable fare-quote DTO with only a parameterized constructor gives it nothing to work with:",
        },
        {
          type: "code",
          language: "java",
          title: "QuoteParsing.java",
          code: `import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;

public class QuoteParsing {
    // Only a parameterized constructor, no annotations
    static class FareQuote {
        private final String zone;
        private final long paise;

        FareQuote(String zone, long paise) {
            this.zone = zone;
            this.paise = paise;
        }

        public String getZone() { return zone; }
        public long getPaise() { return paise; }
    }

    // Fix 1: a record. Jackson reads the canonical constructor's component names
    record FareQuoteRecord(String zone, long paise) { }

    // Fix 2: tell Jackson which constructor to use and which JSON property feeds each parameter
    static class AnnotatedFareQuote {
        private final String zone;
        private final long paise;

        @JsonCreator
        AnnotatedFareQuote(@JsonProperty("zone") String zone, @JsonProperty("paise") long paise) {
            this.zone = zone;
            this.paise = paise;
        }

        @Override
        public String toString() {
            return "AnnotatedFareQuote[" + zone + ", " + paise + "]";
        }
    }

    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        String json = "{\\"zone\\":\\"Salt Lake\\",\\"paise\\":24550}";

        try {
            mapper.readValue(json, FareQuote.class);
        } catch (Exception e) {
            System.out.println(e.getClass().getName());
            System.out.println(e.getMessage());
        }
        System.out.println(mapper.readValue(json, FareQuoteRecord.class));
        System.out.println(mapper.readValue(json, AnnotatedFareQuote.class));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# $JACKSON = jackson-databind 2.21.7, jackson-core 2.21.7, jackson-annotations 2.21
javac -cp "$JACKSON" QuoteParsing.java && java -cp "$JACKSON:." QuoteParsing`,
        },
        {
          type: "output",
          text: `com.fasterxml.jackson.databind.exc.InvalidDefinitionException
Cannot construct instance of \`QuoteParsing$FareQuote\` (no Creators, like default constructor, exist): cannot deserialize from Object value (no delegate- or property-based Creator)
 at [Source: REDACTED (\`StreamReadFeature.INCLUDE_SOURCE_IN_LOCATION\` disabled); line: 1, column: 2]
FareQuoteRecord[zone=Salt Lake, paise=24550]
AnnotatedFareQuote[Salt Lake, 24550]`,
        },
        {
          type: "list",
          items: [
            "The message is precise once I know the vocabulary. A **Creator** is anything Jackson can call to make an instance: a default constructor, or a constructor or factory whose parameters it can map to JSON properties. `FareQuote(String, long)` qualifies as neither, because nothing tells Jackson that the first parameter is `zone`. It's an `InvalidDefinitionException`, a problem with the class, not the JSON.",
            "**Fix 1, a record.** Jackson has supported records since 2.12 and calls the canonical constructor, so a compact constructor's validation runs for every deserialized quote too. For a DTO this is my default.",
            "**Fix 2, `@JsonCreator` with `@JsonProperty`** on each parameter, for a class that can't be a record. The fields stay `final` and the constructor's checks still run.",
            "Spring Boot changes the picture a little: it registers Jackson's `ParameterNamesModule`, and its Maven and Gradle setups compile with `-parameters`. With both, Jackson can use a single constructor with no annotations. I checked that combination with the module on my classpath: compiled with `-parameters`, `FareQuote` deserialized; compiled without it, the same \"no Creators\" error came back. So this error tends to appear when a DTO moves into a module built differently.",
            "Adding a no-arg constructor plus setters also makes the error go away, at the cost of every guarantee from this lesson.",
          ],
        },
        {
          type: "paragraph",
          text: "JPA works the same way, and I didn't run it here because it needs a database; the Spring Data JPA and Hibernate track will. Hibernate creates an entity through its no-arg constructor and then sets fields from the result set. The JPA specification requires that constructor to be `public` or `protected`. I make it `protected`: Hibernate can call it, and application code can't create an empty `Ride` by accident.",
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
              question: "What is a constructor, and why does Java need one?",
              answer:
                "A special block of code, named after the class with no return type, that runs once when an object is created and puts it into a valid state: assigning fields, checking arguments, establishing invariants.\n\nThe memory itself already exists by then. `new` allocates and zeroes the object, and `invokespecial <init>` runs the constructor on it. My `BankAccount` example shows the point: its constructor rejected a negative balance, so no invalid `BankAccount` could ever exist, while the setter-based version accepted `-50000` without complaint.",
            },
            {
              question: "Can a constructor return a value?",
              answer:
                "No. It has no return type, not even `void`, and `return this;` fails with `incompatible types: unexpected return value`. A bare `return;` to leave early is allowed.\n\nThe value of a `new` expression is always the new object, produced by the `new` instruction before the constructor runs. In the class file the constructor is an `<init>` method with a `V` (void) descriptor, like `(I)V` for `Order(int)`.",
            },
            {
              question: "What is the default constructor, and when does the compiler provide it?",
              answer:
                "A no-arg constructor that `javac` generates only when the class declares no constructor at all. It calls `super()`, runs the field initializers, and has the same access as the class (JLS 8.8.9). For enums it's private.\n\n`javap -c Customer` on a class with no constructor showed `public Customer()` with `invokespecial Object.<init>` and a `putfield` for `points = 5`. Declaring any constructor removes it, which is why `new Order()` failed with `constructor Order in class Order cannot be applied to given types` once I added `Order(String)`.",
            },
            {
              question: "How is a constructor different from a method?",
              answer:
                "It must have the class's name, has no return type, runs only during object creation (through `new`, `this(...)`, `super(...)` or reflection), isn't inherited, can't be overridden, and can't be `static`, `final`, `abstract` or `synchronized`. The compiler generates one if I write none.\n\nIn bytecode it's a method named `<init>`, called with `invokespecial`. The name isn't a legal Java identifier, so no source code can call it like a method.",
            },
            {
              question: "What is constructor overloading?",
              answer:
                "Several constructors in one class with different parameter lists. `javac` picks one at compile time from the argument types, with the same rules as method overloading.\n\nThe usual design is one main constructor that assigns and validates, and shorter overloads that delegate with `this(...)`. In `EmployeeChain`, `new Employee(\"Asha\")` went through two delegations and the three-argument constructor assigned every field.",
            },
            {
              question: "Is a constructor inherited?",
              answer:
                "No. Constructors aren't members of a class (JLS 8.2), so a subclass gets none of its parent's. If `Vehicle` has `Vehicle(String plate)`, `Car` doesn't get a `Car(String)` constructor.\n\nWhat a subclass does is **call** the parent's constructor through `super(...)`, explicitly or implicitly. When `Car(int seats)` didn't call one and `Vehicle` had no no-arg constructor, the implicit `super()` failed to compile.",
            },
            {
              question: "Can a constructor be private, static, final or abstract?",
              answer:
                "It can be private, and that's common: utility classes, singletons and static factories. It can't be static, final, abstract or synchronized; `javac` says `modifier static not allowed here`, and the same for the other three.\n\nThe reasons are in JLS 8.8.3: a constructor always works on an object (so not static), isn't inherited (so final is meaningless), must have a body (so not abstract), and nobody else can see the object yet (so synchronized is pointless). The JVM checks it too: when I set `ACC_STATIC` on a compiled `<init>`, loading failed with `ClassFormatError: ... has illegal modifiers: 0x9`.",
            },
            {
              question: "What happens if I write `void Order()` inside class `Order`?",
              answer:
                "It compiles, but it's a method, not a constructor, because it has a return type. `new Order()` uses the default constructor and never calls it.\n\nIn my `VoidTrap` test, `new Order()` left `status` at `NEW`, and only an explicit `order.Order()` changed it to `PLACED`. `javac -Xlint:all` gave no warning at all.",
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
              question: "What's the difference between `this(...)` and `super(...)`?",
              answer:
                "`this(...)` calls another constructor of the same class, `super(...)` calls a constructor of the direct superclass. Before Java 25 either had to be the first statement, and a constructor can contain at most one of them.\n\nIf a constructor has neither, `javac` inserts `super()`. In `Order`, the main constructor started with `invokespecial Object.<init>`, while `Order()` was just `this(1)`: push `this`, push `1`, call `Order(int)`.",
            },
            {
              question: "What happens if the superclass has no no-arg constructor?",
              answer:
                "Every subclass constructor must call one of the existing parent constructors explicitly with `super(...)`. Otherwise the implicit `super()` has nothing to call and compilation fails.\n\nThe error is `constructor Vehicle in class Vehicle cannot be applied to given types`, with `required: String` and `found: no arguments`. It points at the subclass constructor's opening brace, or at the class declaration if the subclass relies on the default constructor, which confuses people because neither line contains a call.",
            },
            {
              question: "Predict the order of static blocks, instance blocks and constructors for a parent and child, with two `new Child()` calls.",
              answer:
                "Static initialization runs once, parent before child: parent statics, child statics. Then for each `new`: parent instance initializers and blocks, parent constructor body, child instance initializers and blocks, child constructor body. Within a class, initializers and blocks run in textual order.\n\nMy `InitOrder` run printed the four static lines only before the first `new Car(4)`, then the same six instance lines for each object, `Vehicle` complete before `Car` started. The mechanism is that `javac` copies the initializers into each constructor right after its `super(...)` call.",
            },
            {
              question: "What is an instance initializer block, and how does javac implement it?",
              answer:
                "A bare `{ ... }` block in a class body that runs for every new object, after the superclass constructor and in textual order with the field initializers. Anonymous classes rely on it because they can't declare constructors.\n\nThere's no separate method for it in the class file: `javac` copies the block's code into every constructor that calls `super(...)`. In `Order`, `id = nextId++` appeared inside `Order(int)` right after `Object.<init>`, and not in `Order()`, which delegates with `this(1)`. That's why the IDs went `1000`, `1001`, not up by two.",
            },
            {
              question: "What is a copy constructor, and why prefer it over `clone()`?",
              answer:
                "A constructor that takes another instance of the same class and builds an independent copy, like `Course(Course other)`. It's ordinary code: it can make deep copies, assign final fields, validate, and it doesn't need `Cloneable` or casts.\n\nIn `CopyCourse`, the copy constructor gave the copy its own list, while `clone()` shared the original's list, so a student added to the clone appeared in the original. A static counter also showed the clone was created without running any constructor.",
            },
            {
              question: "What happens if a constructor throws an exception?",
              answer:
                "The `new` expression completes abruptly and the caller never receives a reference; the allocated object becomes garbage. Any assignment like `ravi = new Employee(...)` doesn't happen.\n\nThe catch is `this` escaping before the throw. My `LeakyRegistry` added `this` to a static list as its first line, then threw on a blank email: `ravi` stayed `null`, but the list still held `Ravi/null`, a half-built employee with a null final field. The fix is to validate first and publish from outside the constructor.",
            },
            {
              question: "What are static factory methods, and what do they offer over constructors?",
              answer:
                "Static methods that return an instance, usually with a private constructor behind them, like `List.of`, `Integer.valueOf` or `Optional.empty`.\n\nThey can have names (`Money.ofRupees` versus `ofPaise`), return cached objects (`Integer.valueOf(127) == Integer.valueOf(127)` was `true`, `128` was `false`), return a subtype (`List.of` gave `List12` or `ListN`), and keep the implementation class hidden. The downsides are that a class with only private constructors can't be subclassed and factories are less discoverable.",
            },
            {
              question: "How do `final` fields interact with constructors?",
              answer:
                "Every blank final instance field must be assigned exactly once on every path through every constructor (or in an initializer block). Missing a path gives `variable balance might not have been initialized`, assigning twice gives `might already have been assigned`.\n\nThat makes `final` a compile-time check that each constructor finishes the job. It also gives the JLS 17.5 visibility guarantee to other threads after construction. It doesn't stop reads before the assignment, though: in `OverrideTrap` a final `seats` was read as `0` from the superclass constructor.",
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
              question: "Why is calling an overridable method from a constructor dangerous?",
              answer:
                "Because the object is already its subclass type while the parent's constructor runs, so dynamic dispatch reaches the subclass override before the subclass's initializers and constructor body have run. The override sees `0`, `false` and `null`.\n\n`OverrideTrap` printed `null, 0 seats` from `Vehicle`'s constructor for a `Car` built with `SEDAN` and 4 seats. A `final String fuel = \"CNG\"` still printed correctly only because it's a constant variable that `javac` inlines. C++ differs here: a virtual call in a base constructor runs the base version.",
            },
            {
              question: "What are flexible constructor bodies in Java 25?",
              answer:
                "JEP 513, final in Java 25: statements may appear before `this(...)` or `super(...)`. That prologue can validate and compute arguments and assign fields of the class that have no initializer, but can't otherwise use `this`: no field reads, no instance method calls, no `super.` access, no `return`.\n\nOn JDK 25 I validated seats and normalized a plate before `super(...)`, and assigning `seats` and `category` before `super()` fixed `OverrideTrap`. The errors for the forbidden cases read like `cannot reference this before supertype constructor has been called`. No JVM change was needed: the same class files ran on JDK 21 after I patched their version number.",
            },
            {
              question: "What does `new Order()` compile to in bytecode?",
              answer:
                "`new` (allocate a zeroed object of the class, push the reference), `dup` (copy it), then `invokespecial Order.\"<init>\":()V`, which consumes one copy as `this`. The remaining copy is what the expression evaluates to, stored with `astore` or returned.\n\nThe split matters: by the time the constructor's first instruction runs, the object exists with default values. The constructor itself starts with `aload_0` and `invokespecial` of the superclass `<init>`, inserted by `javac` if I didn't write `super()`.",
            },
            {
              question: "Why aren't field initializers copied into a constructor that starts with `this(...)`?",
              answer:
                "Because the constructor it delegates to will run them. A `this(...)` chain always ends in a constructor that calls `super(...)`, and that's the one `javac` copies the initializers into, so each runs exactly once per object.\n\n`javap` on `Order` showed `status = \"PLACED\"` and `id = nextId++` inside `Order(int)` and nothing but a delegation in `Order()`. If both had them, `nextId` would advance twice per `new Order()`, and a blank final assigned in a block would be assigned twice.",
            },
            {
              question: "What guarantee does the Java Memory Model give for final fields set in a constructor?",
              answer:
                "JLS 17.5: once the constructor finishes, any thread that obtains a reference to the object afterwards sees the correctly initialized values of its final fields, and of objects reachable through them as of that point, even if the reference was shared through a data race.\n\nIt holds only if `this` didn't escape during construction, and it says nothing about non-final fields. That's one reason immutable value objects with final fields are safe to share without locks, and another reason not to register `this` from a constructor, as `LeakyRegistry` did.",
            },
            {
              question: "How do a record's compact constructor and its other constructors work?",
              answer:
                "The compact canonical constructor has no parameter list; inside it, the component names are the parameters, and `javac` appends the field assignments after my code. So I validate or normalize by checking or reassigning parameters, and assigning `this.paise` directly is an error, `cannot assign a value to final variable paise`.\n\nAny other record constructor must delegate with `this(...)` so that every instance goes through the canonical one. Without it, `javac` reports `constructor is not canonical, so its first statement must invoke another constructor` on JDK 21. In `RecordPrices`, `\" inr \"` became `INR` and `-100` was rejected.",
            },
            {
              question: "Why does Spring recommend constructor injection?",
              answer:
                "Because the constructor then establishes the bean's invariants like any other object: dependencies are `final`, never `null`, and the class works without a container, which makes it testable with plain `new`. It also makes circular dependencies fail at startup instead of being silently wired.\n\nIn the production section's `RideWiring`, the field-injected service worked inside Spring and threw `NullPointerException ... because \"this.drivers\" is null` in a plain test. A class with one constructor doesn't even need `@Autowired` since Spring 4.3.",
            },
            {
              question: "Why do JPA entities need a no-arg constructor?",
              answer:
                "Because the provider creates the entity before it knows the field values: it instantiates through the no-arg constructor by reflection, then populates fields from the result set, and for lazy loading it may create proxy subclasses that call it too. The JPA specification requires that constructor to be `public` or `protected`.\n\nI make it `protected` so application code can't create an empty entity, and keep a proper constructor for real use. It's the same reason as Jackson's \"no Creators\" error in this lesson: the framework instantiates first and fills fields afterwards.",
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
              question: "A new endpoint fails with \"Cannot construct instance of `FareQuote` (no Creators, like default constructor, exist)\". What happened and how do you fix it?",
              answer:
                "Jackson found no constructor it could call: there's no no-arg constructor, and it can't tell which JSON property goes to which constructor parameter. Often the class used to have a no-arg constructor until someone added a parameterized one, or it moved to a module compiled without `-parameters`.\n\nI'd turn it into a record, which Jackson 2.12+ deserializes through the canonical constructor, or add `@JsonCreator` with `@JsonProperty` on each parameter. Both worked in the production section's `QuoteParsing` and kept the fields `final`. I'd avoid \"fixing\" it with a no-arg constructor and setters.",
            },
            {
              question: "After a refactor, the Spring app fails at startup with `BeanCurrentlyInCreationException`. How do you approach it?",
              answer:
                "It's a constructor-injection cycle. The `UnsatisfiedDependencyException` message lists the chain: bean A's constructor parameter needs B, B's needs A. Neither constructor can run first, so Spring stops, which is better than finding out under load.\n\nI'd look at what B actually uses from A and move that into a third bean both depend on, as `DemandTracker` did for `DispatchService` and `PricingService` in the production example. `@Lazy` on a parameter or an `ObjectProvider` also starts the context (I saw Spring inject a CGLIB proxy), but I'd treat those as a stopgap.",
            },
            {
              question: "A teammate's class has a constructor with 9 parameters, several of them `String`. What would you suggest?",
              answer:
                "Positional arguments of the same type are a bug waiting to happen: in `OrderRequests`, swapping the shipping and billing addresses compiled and ran. I'd first ask whether the class does too much and some parameters belong together in a value object (an `Address`, a `Money`).\n\nFor what remains, a builder with required values in its constructor and named methods for the optional ones, with validation still in the target's constructor, or small types like `CustomerId` and `ShipTo` so a swap fails to compile. If it's a Spring bean, nine dependencies usually means the class should be split.",
            },
            {
              question: "An `Employee` class registers itself with an event bus in its constructor, and sometimes handlers see half-initialized employees. Why?",
              answer:
                "The constructor publishes `this` before it finishes. Any handler that runs on another thread, or any code that reads the registry after a later constructor statement throws, can see fields still at their zero values, and the JLS 17.5 final-field guarantee doesn't apply to a reference obtained during construction.\n\n`LeakyRegistry` reproduced the simplest version: a failed constructor left `Ravi/null` in the directory. The fix is to construct completely, then register from outside, for example in a static factory like `Employee.hire` or in the code that creates the employee.",
            },
            {
              question: "Logs show a subclass's overridden method logging `null` during startup, but the field is clearly initialized in its declaration. What's going on?",
              answer:
                "The superclass constructor is calling that overridable method. It runs before the subclass's field initializers, which `javac` placed after the `super()` call, so the override sees the zeroed field.\n\nThe proper fix is to stop calling overridable methods from the constructor: make the method `private` or `final`, or pass the needed value up through `super(...)`. On Java 25, if the parent can't be changed, the subclass can assign the field (without an initializer) before `super()`, which is what `EarlyFields` did.",
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
            "Write `Product.java` with fields `String name` and `long pricePaise = 5_000` and no constructor. Compile it and run `javap -c Product` to find the constructor nobody wrote.",
            "Add `Product(String name, long pricePaise)` that rejects a negative price, and a `main` that calls `new Product()`. Compile and read the error.",
            "Add a no-arg `Product()` that delegates with `this(\"Unknown\", 5_000)`, plus an instance initializer block that prints `init block`. Create `new Product()` and `new Product(\"Lamp\", 24_000)`, then run `javap -c Product` and find which constructor contains the block's code.",
            "Write `Vehicle` and `Car extends Vehicle`, each with a static block, an instance block and a constructor that print, and call `new Car()` twice. Write down the predicted output before running it.",
            "Make `Vehicle`'s constructor call a method `describe()` that `Car` overrides to print a field declared as `String model = \"Dzire\";`. Run it on JDK 21. Then, on JDK 25, make `model` a blank `final` assigned before `super()` and run again.",
            "Write `record Price(String currency, long paise)` with a compact constructor that uppercases the currency and rejects negative paise. Print `new Price(\"inr\", 9_900)`, then try `new Price(\"INR\", -1)` and read the stack trace.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: in step 1, `javap` shows `public Product()` calling `Object.\"<init>\"` and then storing `5000` into `pricePaise` with `ldc2_w` and `putfield`. Step 2 fails with `constructor Product in class Product cannot be applied to given types;`, followed by `required: String,long` and a `found:` line saying `no arguments`. In step 3, `init block` prints twice, once per object, and `javap` shows the `ldc \"init block\"` only inside `Product(java.lang.String, long)`. Step 4 prints `Vehicle static block` and `Car static block` once, then `Vehicle instance block`, `Vehicle constructor`, `Car instance block`, `Car constructor` for each object. Step 5 prints `model = null` on JDK 21 and `model = Dzire` on JDK 25. Step 6 prints `Price[currency=INR, paise=9900]`, and the exception's stack trace names the constructor by its bytecode name, `at Prices$Price.<init>(...)` if the record is nested in a class called `Prices`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `CONSTRUCTOR  ClassName(params) { ... }   no return type, not void
             modifiers: public protected private (none else)
             not inherited, not overridden; bytecode name <init>

DEFAULT      only if no constructor declared; calls super();
             same access as class (enum: private)
             void Order() is a METHOD

CHAINING     this(...) same class, super(...) parent
             at most one; first statement before Java 25
             none written -> javac inserts super()

ORDER        once per class: statics, parent first (<clinit>)
             per new: allocate + zero
                      super chain up to Object
                      initializers + blocks, then body,
                      parent part fully before child part

TRAPS        overridable call in constructor sees 0/null
             'this' escaping before validation
             adding a constructor removes the default one

FINAL        assigned exactly once on every path
             JLS 17.5: visible to all threads after <init>

ALTERNATIVES static factory: name, cache, subtype, hidden class
             builder: many/optional params, swap-proof
             record: canonical + compact (validate, normalize)

FRAMEWORKS   Spring: constructor injection, final deps
             Jackson: record or @JsonCreator
             JPA: protected no-arg constructor`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A constructor's job is to turn zeroed memory into a valid object, once. Validate first, assign final fields, and don't let `this` or an overridable call leak out before it's done.",
            "The order is mechanical once I've seen the bytecode: `super(...)` first, then the initializers `javac` copied in, then the body, parent before child, with statics once per class.",
            "Several things in this lesson only made sense through class-level state: the `nextId` counter in `Order`, the cached `ZERO`, the `<clinit>` that built the enum constants. The next lesson, Static Keyword, covers exactly that side of a class: static fields, methods and blocks, and when class initialization actually runs.",
          ],
        },
      ],
    },
  ],
};
