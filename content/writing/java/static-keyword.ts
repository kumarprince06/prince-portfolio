import type { Lesson } from "../types";

export const staticKeyword: Lesson = {
  slug: "static-keyword",
  date: "2026-10-27",
  title: "Static Keyword",
  description:
    "What `static` really means in Java: class-level fields, methods, blocks and imports, exactly when class initialization runs, why constants go stale in jars nobody rebuilt, where HotSpot keeps static fields, and how one shared copy behaves across threads and class loaders, down to the bytecode.",
  tags: ["Core Java", "OOP", "static", "Class Loading"],
  sections: [
    {
      title: "What Static Means",
      blocks: [
        {
          type: "paragraph",
          text: "Everything in the last two lessons belonged to an object. Classes and Objects gave every object its own fields, and Constructors showed how each one gets its starting values. But some things in a company's payroll system don't belong to any one employee: how many employees have been hired so far, the standard working hours, a date formatter every request uses, a helper that rounds a salary to the nearest rupee. Creating an object just to reach those would be odd, and giving every object its own copy would be wrong.",
        },
        {
          type: "paragraph",
          text: "`static` is how Java says **this member belongs to the class itself, not to any object of it**. A static field exists once per class (more exactly, once per class per class loader, which matters later). A static method runs without an object, so it has no `this`. A static block runs once, when the class is initialized.",
        },
        {
          type: "paragraph",
          text: "The syntax is the easy part. What made this worth a full lesson for me is what happens underneath: exactly when static code runs, why a constant can go stale in a jar nobody rebuilt, why a static `SimpleDateFormat` corrupts dates under load, and how one class can end up with two different values for the same static field. Those are the interview questions I expect, and the bugs I'd expect to meet in a real service.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The keyword comes from C, where it meant two things. A local variable declared `static` keeps its value between calls, because it lives for the whole run of the program. A function or global variable declared `static` is private to its source file. When C++ added classes, it reused the same word for a third meaning: a `static` data member is shared by all objects of the class, and a `static` member function is called without an object.",
        },
        {
          type: "paragraph",
          text: "Smalltalk-80 solved the same need differently. Classes there are objects themselves, so \"class-side\" methods are simply methods of the class object, and class variables are shared by the class and all its instances. Java kept a trace of that idea: as I show below, HotSpot stores static fields inside the `Employee.class` object.",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (1996) took the C++ meaning with one big difference: there are no global variables and no free functions at all. Everything lives in a class, so `static` became the only way to have program-wide state, or a function that needs no object. It's also why the entry point is `public static void main(String[] args)`: the launcher has to call something before any object exists. C's other meanings didn't come along. Java has no static local variables.",
        },
        {
          type: "table",
          headers: ["Version", "What changed for static"],
          rows: [
            ["Java 1.0 (1996)", "Static fields, static methods and `static {}` initializer blocks; `main` is `public static`"],
            ["Java 1.1 (1997)", "Nested classes: static nested classes and inner classes, plus instance initializer blocks"],
            ["Java 5 (2004)", "`import static` (JSR 201, together with enums, autoboxing and the for-each loop)"],
            ["Java 7 (2011)", "Interned strings moved out of PermGen into the heap"],
            ["Java 8 (2014)", "PermGen removed and class metadata moved to Metaspace (JEP 122); static methods allowed in interfaces"],
            ["Java 9 (2017)", "Private and private static methods in interfaces (JEP 213)"],
            ["Java 16 (2021)", "Inner classes may declare static members, and nested records are implicitly static (JEP 395)"],
            ["Java 21 (2023)", "Instance `main` methods as a preview feature (JEP 445)"],
            ["Java 25 (2025)", "Instance `main` methods final (JEP 512): `main` no longer has to be static"],
          ],
        },
        {
          type: "paragraph",
          text: "I checked the Java 16 change with `javac --release 15`, which compiles as the older language. An inner class `Order.Line` with a `static int created` counter compiles and runs on JDK 21, while as Java 15 it fails with `Illegal static declaration in inner class Order.Line` and the note `modifier 'static' is only allowed in constant variable declarations`.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a class as an apartment building and its objects as the flats in it.",
        },
        {
          type: "list",
          items: [
            "Each **flat** is an object. It has its own electricity meter, its own furniture, its own door number. Those are instance fields: two flats with the same layout still show different readings on their meters.",
            "The **notice board in the lobby** is a static field. There is one per building, every resident sees the same board, and a note pinned by flat 2B is read by flat 7A. That's what makes it useful, and also why two residents rewriting the same note at the same moment can make a mess of it.",
            "The **security desk** is a static method. I can call the desk without being inside any flat, and it can answer building-wide questions like how many flats are occupied. It can't tell me what's in flat 4C's fridge unless I tell it which flat to look in. A static method has no `this`, so to reach instance data it needs an object reference handed to it.",
            "The building is **opened once**, before the first resident moves in: water connected, notice board put up. That's class initialization, running the static blocks. In Java it happens lazily, on first real use, and exactly once.",
            "The **sign by the lift** says \"maximum 4 people\". Every new resident copies it into their handbook on move-in day. If the society later changes the limit to 6, residents with old handbooks keep following 4 until they get a reprint. That's constant inlining: callers copy the value at compile time and keep it until they're recompiled.",
            "A **second building from the same blueprint**, put up by a different developer, has its own lobby and its own notice board. Same plan, separate copies. That's the same class loaded by two class loaders.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks: in a real building, ringing the desk \"from flat 4C\" at least needs someone in 4C. In Java, `employee.summary()` works even when `employee` is `null`, because the flat is ignored completely and the call goes straight to the class. And unlike a lobby, a static field is only shared inside one running JVM. Two instances of the same service share nothing.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "What can be static",
        },
        {
          type: "table",
          headers: ["Declaration", "static allowed?", "What it means"],
          rows: [
            ["Field", "Yes", "One copy per class (per class loader), shared by all its objects"],
            ["Method", "Yes", "Called without an object; no `this`, no `super`; compiled to `invokestatic`"],
            ["Initializer block `static { }`", "Yes", "Runs once, when the class is initialized"],
            ["Nested class", "Yes", "No hidden link to an outer object. Nested records, enums and interfaces are static automatically"],
            ["Method in an interface (Java 8+)", "Yes", "Called only as `InterfaceName.method()`; not inherited by implementing classes"],
            ["Import", "`import static`", "Brings static members into scope by their simple name"],
            ["Top-level class", "No", "`modifier static not allowed here`"],
            ["Constructor", "No", "`modifier static not allowed here`"],
            ["Local variable", "No", "`illegal start of expression`"],
            ["Abstract method", "No", "`illegal combination of modifiers: abstract and static`"],
          ],
        },
        {
          type: "heading",
          text: "Class members and instance members",
        },
        {
          type: "table",
          headers: ["", "Static (class) member", "Instance member"],
          rows: [
            ["How many copies", "One per class, per class loader", "One per object"],
            ["Exists from", "Class initialization", "`new`"],
            ["Accessed as", "`Employee.headcount`, `Employee.summary()`", "`asha.tasks`, `asha.describe()`"],
            ["Has `this`", "No", "Yes, in local slot 0"],
            ["Bytecode", "`getstatic`, `putstatic`, `invokestatic`", "`getfield`, `putfield`, `invokevirtual`"],
            ["Stored (HotSpot)", "Inside the class's `java.lang.Class` object", "Inside each object"],
            ["Lives until", "The class is unloaded, usually never", "The object is unreachable"],
          ],
        },
        {
          type: "heading",
          text: "One class, one counter",
        },
        {
          type: "paragraph",
          text: "This `Employee` class is the one I use for the rest of the lesson. `headcount` is static, `name` and `tasks` are per object:",
        },
        {
          type: "code",
          language: "java",
          title: "Employee.java",
          code: `public class Employee {
    public static int headcount;           // class-level: one copy for the whole class
    private final String name;             // instance-level: one copy per Employee object
    private int tasks;

    public Employee(String name) {
        this.name = name;
        headcount++;                       // every constructor call bumps the same counter
    }

    public void completeTask() {
        tasks++;                           // this.tasks: only this employee's counter
    }

    public String describe() {             // instance method: has a this
        return name + ": tasks=" + tasks;
    }

    public static String summary() {       // static method: no this, only class-level state
        return headcount + " employees hired";
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "EmployeeCount.java",
          code: `public class EmployeeCount {
    public static void main(String[] args) {
        Employee asha = new Employee("Asha");
        Employee ravi = new Employee("Ravi");

        asha.completeTask();
        asha.completeTask();
        asha.completeTask();
        ravi.completeTask();

        System.out.println(asha.describe());
        System.out.println(ravi.describe());
        System.out.println(Employee.summary());
        System.out.println("Employee.headcount = " + Employee.headcount);
    }
}`,
        },
        {
          type: "output",
          text: `Asha: tasks=3
Ravi: tasks=1
2 employees hired
Employee.headcount = 2`,
        },
        {
          type: "paragraph",
          text: "Two objects, two `tasks` counters, and one `headcount` counter that both constructors bumped. `Employee.summary()` didn't need an object at all. Instance code can use static members freely (the constructor does `headcount++`), but not the other way round.",
        },
        {
          type: "heading",
          text: "The static context rule",
        },
        {
          type: "paragraph",
          text: "Static code runs without a current object, so it can't name an instance member without saying which object it means. This is the first compile error almost everyone meets, usually in `main`:",
        },
        {
          type: "code",
          language: "java",
          title: "StaticContext.java",
          code: `public class StaticContext {
    private int tasks;

    void completeTask() {
        tasks++;
    }

    public static void main(String[] args) {
        completeTask();
        System.out.println(tasks);
        System.out.println(this.tasks);
    }
}`,
        },
        {
          type: "output",
          text: `StaticContext.java:9: error: non-static method completeTask() cannot be referenced from a static context
        completeTask();
        ^
StaticContext.java:10: error: non-static variable tasks cannot be referenced from a static context
        System.out.println(tasks);
                           ^
StaticContext.java:11: error: non-static variable this cannot be referenced from a static context
        System.out.println(this.tasks);
                           ^
3 errors`,
        },
        {
          type: "paragraph",
          text: "Inside an instance method, `tasks` is shorthand for `this.tasks`. In `main` there is no `this`, and `javac` says exactly that in the third error: `this` itself is the \"non-static variable\". The fix is never to make everything static. It's to get an object and go through it: `StaticContext ctx = new StaticContext(); ctx.completeTask();` compiles, and `ctx.tasks` is then 1.",
        },
        {
          type: "heading",
          text: "Constants",
        },
        {
          type: "paragraph",
          text: "A **constant variable** (JLS 4.12.4) is a `final` variable of a primitive type or `String`, initialized with a constant expression (JLS 15.29): literals, other constants, and operators on them. Made `static`, it's what people mean by \"a constant\", named in `UPPER_SNAKE_CASE`. The distinction matters because `javac` copies a constant's value into every class that uses it, which the section on constants below turns into a real bug.",
        },
        {
          type: "table",
          headers: ["Declaration", "Constant variable?", "Why"],
          rows: [
            ["`static final int MAX_ITEMS = 50;`", "Yes", "Primitive, literal initializer"],
            ["`static final String CURRENCY = \"INR\";`", "Yes", "`String`, literal initializer"],
            ["`static final int MAX_BULK = MAX_ITEMS * 10;`", "Yes", "An expression made only of constants"],
            ["`static final long LOADED_AT = System.nanoTime();`", "No", "A method call is not a constant expression"],
            ["`static final Integer GIFT_WRAP_FEE = 30;`", "No", "`Integer` is neither a primitive nor `String`"],
            ["`static final List<String> CITIES = List.of(\"Pune\");`", "No", "A reference to an object; `final` freezes the reference, not the list"],
          ],
        },
        {
          type: "heading",
          text: "Static methods, blocks and imports",
        },
        {
          type: "list",
          items: [
            "**Static methods** have no `this` and no `super`, can't be `abstract`, and are picked at compile time. A subclass method with the same signature **hides** the parent's instead of overriding it. The section on static methods below shows what that does at runtime.",
            "**Static blocks** (`static { ... }`) can appear any number of times. Together with the static field initializers they run top to bottom, once, when the class is initialized. They can't throw checked exceptions: reading a file in one fails with `unreported exception IOException; must be caught or declared to be thrown`, and a block that always throws doesn't compile either (`initializer must be able to complete normally`).",
            "**Static imports** (`import static java.lang.Math.max;` or `import static java.util.concurrent.TimeUnit.*;`) let me write `max(a, b)` instead of `Math.max(a, b)`. They're great for a few well-known names, like JUnit's `assertEquals`, and a readability problem when a reader can't tell where a name came from. Common Mistakes has the two compile errors they cause.",
          ],
        },
        {
          type: "heading",
          text: "Static nested classes and static interface methods, briefly",
        },
        {
          type: "paragraph",
          text: "A `static` nested class is a normal class living in another class's namespace, with no hidden reference to an outer object, so static code can create it. An inner (non-static) class gets the outer object as a hidden constructor parameter: `javap -p` shows `Outer$Inner(Outer)` against `Outer$Nested()`. The Nested and Inner Classes lesson covers all four kinds. Since Java 8 an interface can also have static methods, usually factories like `Comparator.naturalOrder()`, but unlike a class's they are **not inherited**: the Interfaces lesson owns that, and Common Mistakes shows the errors.",
        },
        {
          type: "heading",
          text: "Why main is static",
        },
        {
          type: "paragraph",
          text: "The Methods lesson covered the short answer: the launcher calls `main` before any object of the class exists, so it can't be an instance method. Java 25 changed that. With JEP 512 the launcher picks a `main` method (one with a `String[]` parameter first, otherwise one with no parameters), and if the one it picks isn't static, it creates an object with the class's no-argument constructor and calls `main` on that object:",
        },
        {
          type: "code",
          language: "java",
          title: "ShopApp.java",
          code: `public class ShopApp {
    private final String city = "Pune";

    void main() {                                    // not static, no String[] parameter
        System.out.println("opening the shop in " + city + " from an instance main");
        System.out.println("this = " + getClass().getSimpleName() + " object");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# JDK 25
javac ShopApp.java && java ShopApp
# JDK 21
javac ShopApp.java && java ShopApp`,
        },
        {
          type: "output",
          text: `opening the shop in Pune from an instance main
this = ShopApp object

Error: Main method not found in class ShopApp, please define the main method as:
   public static void main(String[] args)
or a JavaFX application class must extend javafx.application.Application`,
        },
        {
          type: "paragraph",
          text: "So on Java 25 `main` doesn't have to be static, but the reason it traditionally was hasn't changed: someone has to create the first object, and on JDK 25 the launcher simply does it for me. Every production codebase I'd expect to work on still uses `public static void main(String[] args)`, and on JDK 21 it's the only form that runs without `--enable-preview`.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "To see what `static` turns into, I wrote a class with one of each kind of static member, and a separate class that uses them:",
        },
        {
          type: "code",
          language: "java",
          title: "Tariff.java",
          code: `public class Tariff {
    public static final int BASE_CHARGE = 50;            // compile-time constant
    public static final String CURRENCY = "INR";         // also a constant: String literal
    public static final long LOADED_AT = System.nanoTime(); // static final, but NOT a constant
    public static int quotes;                            // plain static field

    static {
        System.out.println("Tariff static block running");
    }

    public static int quote(int units) {                 // an electricity bill estimate
        quotes++;
        return BASE_CHARGE + units * 12;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "TariffUser.java",
          code: `public class TariffUser {
    public static void main(String[] args) {
        int base = Tariff.BASE_CHARGE;              // constant: javac copies 50 in here
        String currency = Tariff.CURRENCY;          // constant: javac copies "INR" in here
        System.out.println("base charge: " + base + " " + currency);
        System.out.println("quote: " + Tariff.quote(10));       // first active use of Tariff
        System.out.println("quotes so far: " + Tariff.quotes);
    }
}`,
        },
        {
          type: "output",
          text: `base charge: 50 INR
Tariff static block running
quote: 170
quotes so far: 1`,
        },
        {
          type: "paragraph",
          text: "The static block printed **after** the base charge. Reading `BASE_CHARGE` didn't initialize `Tariff`; calling `quote` did. The class file explains why (trimmed to the flags, attributes and code):",
        },
        {
          type: "code",
          language: "bash",
          code: "javac Tariff.java TariffUser.java && javap -v -p Tariff",
        },
        {
          type: "output",
          text: `  public static final int BASE_CHARGE;
    flags: (0x0019) ACC_PUBLIC, ACC_STATIC, ACC_FINAL
    ConstantValue: int 50
  public static final java.lang.String CURRENCY;
    flags: (0x0019) ACC_PUBLIC, ACC_STATIC, ACC_FINAL
    ConstantValue: String INR
  public static final long LOADED_AT;
    flags: (0x0019) ACC_PUBLIC, ACC_STATIC, ACC_FINAL
  public static int quotes;
    flags: (0x0009) ACC_PUBLIC, ACC_STATIC
  ...
  public static int quote(int);
    flags: (0x0009) ACC_PUBLIC, ACC_STATIC
      stack=3, locals=1, args_size=1
         0: getstatic     #7                  // Field quotes:I
         3: iconst_1
         4: iadd
         5: putstatic     #7                  // Field quotes:I
         8: bipush        50
        ...
  static {};
    flags: (0x0008) ACC_STATIC
         0: invokestatic  #13                 // Method java/lang/System.nanoTime:()J
         3: putstatic     #19                 // Field LOADED_AT:J
         6: getstatic     #23                 // Field java/lang/System.out:Ljava/io/PrintStream;
         9: ldc           #27                 // String Tariff static block running
        11: invokevirtual #29                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
        14: return`,
        },
        {
          type: "list",
          items: [
            "`static` is a single bit in the class file: `ACC_STATIC`, `0x0008`. It's set on all four fields, on `quote`, and on the method shown as `static {}`, which is the class initializer named `<clinit>` in the class file. `public static` is `0x0009`, and adding `final` makes it `0x0019`.",
            "The two constants carry a **`ConstantValue` attribute** with their value. `LOADED_AT` is also `static final`, but its initializer calls a method, so it has no `ConstantValue` and is assigned by `putstatic` inside `static {}` instead.",
            "`static {}` holds every static initializer that has code, in source order: first `LOADED_AT`, then my `println`. The constants aren't in it at all; the JVM sets them from `ConstantValue` before any of `<clinit>` runs.",
            "`quote` has `args_size=1`: just `units`, in slot 0. There's no `this`. `quotes++` is three separate steps, `getstatic`, `iadd`, `putstatic`, which is exactly why a static counter loses updates under threads later in this lesson.",
            "Even inside `Tariff` itself, `BASE_CHARGE` became `bipush 50`. `javac` never reads a constant through its field.",
          ],
        },
        {
          type: "paragraph",
          text: "The user class is where the constants really disappear:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c TariffUser",
        },
        {
          type: "output",
          text: `  public static void main(java.lang.String[]);
    Code:
       0: bipush        50
       2: istore_1
       3: ldc           #9                  // String INR
       5: astore_2
       ...
      22: bipush        10
      24: invokestatic  #27                 // Method Tariff.quote:(I)I
      ...
      38: getstatic     #34                 // Field Tariff.quotes:I
      ...`,
        },
        {
          type: "paragraph",
          text: "`Tariff.BASE_CHARGE` compiled to `bipush 50` and `Tariff.CURRENCY` to `ldc \"INR\"`. There's no reference to the `Tariff` class anywhere in those lines, so nothing for the JVM to load. `Tariff.quote` became `invokestatic` and `Tariff.quotes` became `getstatic`, both naming the class. The JVM's own log shows the order:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:class+load=info,class+init=info TariffUser | grep -E "Tariff|^[^[]"`,
        },
        {
          type: "output",
          text: `[0.036s][info][class,load] TariffUser source: file:/.../tariff/
[0.036s][info][class,init] Start class verification for: TariffUser
[0.036s][info][class,init] End class verification for: TariffUser
[0.036s][info][class,init] 312 Initializing 'TariffUser'(no method) (0x00007bcfbc000800) by thread "main"
base charge: 50 INR
[0.059s][info][class,load] Tariff source: file:/.../tariff/
[0.059s][info][class,init] Start class verification for: Tariff
[0.059s][info][class,init] End class verification for: Tariff
[0.059s][info][class,init] 414 Initializing 'Tariff' (0x00007bcfbc000a08) by thread "main"
Tariff static block running
quote: 170
quotes so far: 1`,
        },
        {
          type: "paragraph",
          text: "`Tariff` wasn't even **loaded** until after `base charge: 50 INR` was printed. Then load, verify and initialize happened back to back at the `invokestatic`. `(no method)` next to `TariffUser` means it has no `<clinit>` to run. The number before `Initializing` is a running count of class initializers the JVM has called, and the hex value is the address of the class's metadata; both vary from run to run.",
        },
        {
          type: "heading",
          text: "What the JVM does at the first static access",
        },
        {
          type: "paragraph",
          text: "The JVM specification (JVMS 5.5) names exactly four instructions that initialize their class if it isn't initialized yet: `new`, `getstatic`, `putstatic` and `invokestatic`. The other triggers are reflection, initializing a subclass, being the main class at startup, method handles that do the same four things, and, for an interface with default methods, initializing a class that implements it. Initialization itself follows JLS 12.4.2, which in short is:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Take the class's **initialization lock**.",
            "If another thread is initializing the class right now, release the lock and wait until it's done.",
            "If **this** thread is already initializing it (a recursive request, like a static initializer that ends up touching its own class), return immediately. The caller sees whatever values are there so far.",
            "If it's already initialized, return. If it's marked **erroneous** from an earlier failure, throw `NoClassDefFoundError`.",
            "Otherwise mark it \"in progress by this thread\", release the lock, set the `ConstantValue` constants, and initialize the superclass first.",
            "Run `<clinit>`: every static field initializer and static block, in textual order, as one block.",
            "If it completes, mark the class initialized and wake any waiting threads. If it throws, wrap anything that isn't an `Error` in `ExceptionInInitializerError`, mark the class erroneous, wake the waiters, and throw.",
          ],
        },
        {
          type: "paragraph",
          text: "Step 2 is why the holder idiom is thread-safe, step 3 is why a static field can be read before its initializer runs, and steps 4 and 7 are the `ExceptionInInitializerError` and `NoClassDefFoundError` pair. All three get a runnable demo below. After initialization, the resolved constant pool entry remembers where the field is, so a `getstatic` on a hot path is just a load from a fixed offset in one object.",
        },
      ],
    },
    {
      title: "Where Static Fields Live",
      blocks: [
        {
          type: "paragraph",
          text: "The classic interview answer is \"static variables live in PermGen, with the class\". That answer is out of date. Since JDK 8 removed PermGen (JEP 122), HotSpot keeps class metadata, meaning methods, bytecode, the constant pool and the field layout, in Metaspace in native memory, while the **values** of static fields sit inside the class's `java.lang.Class` object, its **mirror**, which is an ordinary object on the heap. The string pool had already moved to the heap in JDK 7. The JVM specification doesn't prescribe any of this. It's how HotSpot does it.",
        },
        {
          type: "image",
          src: "/images/java/static-keyword-class-mirror.svg",
          alt: "Metaspace holds the Employee class metadata defined by the app loader and a second copy defined by a plugin loader. On the heap, Employee objects Asha (tasks 3) and Ravi (tasks 1) have class pointers to the app loader's Employee, whose java.lang.Class mirror holds static int headcount = 2 at offset 112. The plugin's Employee has its own mirror with headcount = 1 and one object, Kiran.",
          caption: "Instance fields live in each object, static fields in the class's mirror. A second class loader means a second class, with its own statics.",
        },
        {
          type: "paragraph",
          text: "I didn't want to repeat that from memory, so I asked HotSpot. `Unsafe.staticFieldBase` returns the object a static field is stored in, and `staticFieldOffset` its position inside that object:",
        },
        {
          type: "code",
          language: "java",
          title: "StaticHome.java",
          code: `import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class StaticHome {
    public static void main(String[] args) throws Exception {
        Field f = Unsafe.class.getDeclaredField("theUnsafe");
        f.setAccessible(true);
        Unsafe unsafe = (Unsafe) f.get(null);

        Field headcount = Employee.class.getDeclaredField("headcount");   // static
        Field tasks = Employee.class.getDeclaredField("tasks");           // instance

        Object home = unsafe.staticFieldBase(headcount);
        System.out.println("static 'headcount' lives in: " + home);
        System.out.println("is that Employee.class itself? " + (home == Employee.class));
        System.out.println("offset inside that object:    " + unsafe.staticFieldOffset(headcount));
        System.out.println("instance 'tasks' offset:      " + unsafe.objectFieldOffset(tasks)
                + " inside every Employee object");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Employee.java StaticHome.java && java StaticHome",
        },
        {
          type: "output",
          text: `static 'headcount' lives in: class Employee
is that Employee.class itself? true
offset inside that object:    112
instance 'tasks' offset:      12 inside every Employee object`,
        },
        {
          type: "list",
          items: [
            "The container of `headcount` is `Employee.class` itself, and the field sits at offset 112, after the `Class` object's own fields. `tasks` is at offset 12 in every `Employee`, right after the 12-byte object header from the Memory Allocation lesson.",
            "`javac` warned four times that `Unsafe is internal proprietary API`, and `-Xlint:deprecation` adds that all three offset methods are deprecated. On JDK 25 the same program still prints `true` (the offset is 120 there), but the JVM also prints `WARNING: A terminally deprecated method in sun.misc.Unsafe has been called`. It's fine for a look inside, not for real code.",
          ],
        },
        {
          type: "paragraph",
          text: "Since the value lives in the mirror, objects don't carry it. With the per-thread allocation counter from the Memory Allocation lesson, a class holding an `int quantity` and a **static** `double taxRate` allocated 16 bytes per object (12-byte header plus `quantity`). The same class with an **instance** `taxRate` allocated 24, and a million of each measured 16.0 MB against 24.0 MB. That's the right trade when each object really needs its own rate, and pure waste when the value is the same for all of them.",
        },
        {
          type: "heading",
          text: "Static fields keep things alive",
        },
        {
          type: "paragraph",
          text: "A class stays loaded as long as its class loader is alive, and the application class loader lives as long as the JVM. So anything referenced from a static field of an application class is reachable forever, and the GC treats it as live, like a local in a running frame. That's the mechanism behind the `FareCacheLeak` example in the Memory Allocation lesson: a `static HashMap` that only grows ends in `OutOfMemoryError`, and the path to GC roots in the heap dump ends at the static field.",
        },
        {
          type: "paragraph",
          text: "\"Forever\" has one exception, and it shows that statics really belong to their class. A class from a custom loader can be **unloaded** once the loader, its classes and their objects are all unreachable, and its static fields go with it. I loaded `Employee` through a throwaway `URLClassLoader` (the same setup as `TwoCopies` below), created one employee, let every reference to the loader go out of scope and called `System.gc()`. With `-Xlog:class+unload=info` the JVM printed `unloading class Employee`, and that copy's `headcount = 1` was gone. The application loader's own `Employee`, loaded only afterwards, started from 0. App servers rely on this for redeploys, and one leaked reference to the old loader is how they leak Metaspace instead, as the Class Loading lesson describes.",
        },
      ],
    },
    {
      title: "Static Methods Are Bound at Compile Time",
      blocks: [
        {
          type: "paragraph",
          text: "An instance call is decided at runtime from the object (`invokevirtual` and overriding). A static call is decided by `javac` from the declared type, and the object, if there even is one, plays no part. Two consequences of that surprise people.",
        },
        {
          type: "heading",
          text: "Calling a static method through a reference",
        },
        {
          type: "code",
          language: "java",
          title: "NullReceiver.java",
          code: `public class NullReceiver {
    static class Money {
        static String currency() {
            return "INR";
        }
    }

    static Money lookup() {
        System.out.println("lookup() ran");
        return null;
    }

    public static void main(String[] args) {
        Money money = null;
        System.out.println(money.currency());       // static call through a null reference
        System.out.println(lookup().currency());    // the expression still runs, then is thrown away
    }
}`,
        },
        {
          type: "output",
          text: `INR
lookup() ran
INR`,
        },
        {
          type: "paragraph",
          text: "No `NullPointerException`, even though `money` is `null`. It compiles without complaint by default; with `-Xlint:static`, `javac` says what it really thinks:",
        },
        {
          type: "code",
          language: "bash",
          code: "javac -Xlint:static NullReceiver.java",
        },
        {
          type: "output",
          text: `NullReceiver.java:15: warning: [static] static method should be qualified by type name, Money, instead of by an expression
        System.out.println(money.currency());       // static call through a null reference
                                ^
NullReceiver.java:16: warning: [static] static method should be qualified by type name, Money, instead of by an expression
        System.out.println(lookup().currency());    // the expression still runs, then is thrown away
                                   ^
2 warnings`,
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c NullReceiver",
        },
        {
          type: "output",
          text: `       5: aload_1
       6: pop
       7: invokestatic  #21                 // Method NullReceiver$Money.currency:()Ljava/lang/String;
       ...
      16: invokestatic  #27                 // Method lookup:()LNullReceiver$Money;
      19: pop
      20: invokestatic  #21                 // Method NullReceiver$Money.currency:()Ljava/lang/String;`,
        },
        {
          type: "list",
          items: [
            "`aload_1` followed by `pop`: the reference is loaded and immediately thrown away, then `invokestatic` calls `currency()` with no receiver. Nothing ever dereferences `money`, so there's nothing to throw. This is JLS 15.12.4.1: for a static method, the expression before the dot is evaluated and its result discarded.",
            "\"Evaluated\" still matters. `lookup()` ran and printed before its result was popped, so side effects in the expression happen.",
            "Static fields behave the same. `asha.headcount` compiles to a `getstatic` on `Employee`, and `-Xlint:static` warns `static variable should be qualified by type name, Employee, instead of by an expression`.",
          ],
        },
        {
          type: "heading",
          text: "Hiding is not overriding",
        },
        {
          type: "code",
          language: "java",
          title: "Hiding.java",
          code: `public class Hiding {
    static class Shape {
        static String kind() { return "Shape.kind() (static)"; }
        String describe()    { return "Shape.describe() (instance)"; }
    }

    static class Circle extends Shape {
        static String kind() { return "Circle.kind() (static)"; }       // hides Shape.kind()
        @Override
        String describe()    { return "Circle.describe() (instance)"; } // overrides
    }

    public static void main(String[] args) {
        Shape shape = new Circle();              // declared type Shape, object is a Circle
        System.out.println(shape.kind());        // chosen by javac from the declared type
        System.out.println(shape.describe());    // chosen at runtime from the object
        System.out.println(Circle.kind());
        System.out.println(((Circle) shape).kind());
    }
}`,
        },
        {
          type: "output",
          text: `Shape.kind() (static)
Circle.describe() (instance)
Circle.kind() (static)
Circle.kind() (static)`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c Hiding | grep -E "invoke(static|virtual).*(kind|describe)"`,
        },
        {
          type: "output",
          text: `      13: invokestatic  #16                 // Method Hiding$Shape.kind:()Ljava/lang/String;
      23: invokevirtual #28                 // Method Hiding$Shape.describe:()Ljava/lang/String;
      32: invokestatic  #31                 // Method Hiding$Circle.kind:()Ljava/lang/String;
      46: invokestatic  #31                 // Method Hiding$Circle.kind:()Ljava/lang/String;`,
        },
        {
          type: "list",
          items: [
            "Same object, two different answers. `shape.kind()` ran `Shape`'s version because `shape` is declared as `Shape`, and `javac` wrote `invokestatic Hiding$Shape.kind` into the class file. The object being a `Circle` never mattered.",
            "`shape.describe()` is also written against `Shape`, but as `invokevirtual`, so the JVM looks at the actual object at runtime and runs `Circle`'s override.",
            "Casting to `Circle` changes the declared type, so the cast version picks `Circle.kind()`. Again a compile-time decision.",
            "JLS 8.4.8.2 calls this **hiding**. `Circle.kind()` hides `Shape.kind()`; both exist, and the type written in the code chooses. The Polymorphism lesson comes back to this, because only instance methods take part in dynamic dispatch.",
          ],
        },
        {
          type: "paragraph",
          text: "`javac` won't let the two kinds mix. These are the messages I got from three one-line changes to `Circle`:",
        },
        {
          type: "table",
          headers: ["If Circle declares", "javac says"],
          rows: [
            ["`@Override` on its static `kind()`", "`static methods cannot be annotated with @Override`"],
            ["An instance `kind()` where `Shape`'s is static", "`kind() in Circle cannot override kind() in Shape` / `overridden method is static`"],
            ["A static `kind()` where `Shape`'s is an instance method", "`kind() in Circle cannot override kind() in Shape` / `overriding method is static`"],
          ],
        },
      ],
    },
    {
      title: "Class Initialization in Depth",
      blocks: [
        {
          type: "paragraph",
          text: "The Class Loading lesson separated **loading** from **initialization**. Here I only care about initialization, because that's when static code runs. JLS 12.4.1 says a class is initialized immediately before the first time one of these happens: an instance is created, a static method it declares is called, a static field it declares is assigned, or a static field it declares is read and that field is **not** a constant variable. Reflection that asks for it, initializing a subclass, and being the main class count too. Everything else, including just mentioning the class, doesn't.",
        },
        {
          type: "paragraph",
          text: "I wanted one program that proves every case, with a static block in each class that prints when it runs:",
        },
        {
          type: "code",
          language: "java",
          title: "InitTriggers.java",
          code: `public class InitTriggers {
    static { System.out.println("[init] InitTriggers, before main"); }

    static class Config  { static final int MAX_SEATS = 4;  static { init("Config"); } }
    static class Product {                                  static { init("Product"); } }
    static class Ledger  {                                  static { init("Ledger"); } }
    static class Pricing { static int base() { return 50; } static { init("Pricing"); } }
    static class Tax     { static double rate = 0.18;       static { init("Tax"); } }
    static class Stats   { static int visits;               static { init("Stats"); } }
    static class Invoice {                                  static { init("Invoice"); } }
    static class Vehicle { static int wheels = 4;           static { init("Vehicle"); } }
    static class Bike extends Vehicle {                     static { init("Bike"); } }
    static class Account {                                  static { init("Account"); } }
    static class SavingsAccount extends Account {           static { init("SavingsAccount"); } }

    static void init(String name) {
        System.out.println("     [init] " + name);
    }

    public static void main(String[] args) throws Exception {
        ClassLoader app = InitTriggers.class.getClassLoader();

        System.out.println("-- no initialization --");
        System.out.println(" 1. constant:             " + Config.MAX_SEATS);
        System.out.println(" 2. array of the type:    " + new Product[4].length);
        System.out.println(" 3. class literal:        " + Product.class.getSimpleName());
        System.out.println(" 4. loadClass:            " + app.loadClass("InitTriggers$Ledger").getSimpleName());
        System.out.println(" 5. forName(name, false): " + Class.forName("InitTriggers$Ledger", false, app).getSimpleName());

        System.out.println("-- initialization --");
        System.out.println(" 6. new Product()");
        new Product();
        System.out.println(" 7. static method");
        Pricing.base();
        System.out.println(" 8. read a static field");
        double r = Tax.rate;
        System.out.println(" 9. write a static field");
        Stats.visits = 1;
        System.out.println("10. Class.forName(name)");
        Class.forName("InitTriggers$Invoice");
        System.out.println("11. new subclass");
        new SavingsAccount();
        System.out.println("12. inherited static field via subclass name");
        int w = Bike.wheels;
        System.out.println("13. second use of everything");
        new Product();
        Pricing.base();
        new SavingsAccount();
        System.out.println("done");
    }
}`,
        },
        {
          type: "output",
          text: `[init] InitTriggers, before main
-- no initialization --
 1. constant:             4
 2. array of the type:    4
 3. class literal:        Product
 4. loadClass:            Ledger
 5. forName(name, false): Ledger
-- initialization --
 6. new Product()
     [init] Product
 7. static method
     [init] Pricing
 8. read a static field
     [init] Tax
 9. write a static field
     [init] Stats
10. Class.forName(name)
     [init] Invoice
11. new subclass
     [init] Account
     [init] SavingsAccount
12. inherited static field via subclass name
     [init] Vehicle
13. second use of everything
done`,
        },
        {
          type: "list",
          items: [
            "Cases 1 to 5 printed no `[init]` line. Running again with `-Xlog:class+load` showed `InitTriggers$Product` loaded at case 2, because `anewarray` needs the class, and `InitTriggers$Ledger` at case 4, neither initialized. `Config` never appeared in the log at all: `javac` folded `MAX_SEATS` into the string literal, so at runtime `InitTriggers` doesn't mention `Config`.",
            "Cases 6 to 10 each initialized their class exactly at the line that needed it.",
            "Case 11: `new SavingsAccount()` initialized `Account` first, then `SavingsAccount`. A superclass is always initialized before its subclass.",
            "Case 12 is the subtle one. `Bike.wheels` compiled to `getstatic InitTriggers$Bike.wheels`, and the log showed `Vehicle` and `Bike` both loaded, but only `Vehicle` was initialized, because `wheels` is declared in `Vehicle`. A static field access initializes only the class that declares the field, whatever name it was reached through.",
            "Case 13 printed nothing: each static block runs once per class. And before all of it, the main class itself was initialized before `main` started.",
          ],
        },
        {
          type: "heading",
          text: "One <clinit>, in textual order",
        },
        {
          type: "paragraph",
          text: "Static field initializers and static blocks run in the order they're written, as one method. To make the order visible, every initializer here calls a method that prints the current values:",
        },
        {
          type: "code",
          language: "java",
          title: "ClinitOrder.java",
          code: `public class ClinitOrder {
    static int a = step("field a = 1", 1);
    static { step("static block 1", 0); }
    static int b = step("field b = a + 1", a + 1);
    static { step("static block 2", 0); }

    static int step(String what, int value) {
        System.out.println(what + "   (a=" + a + ", b=" + b + ")");
        return value;
    }

    public static void main(String[] args) {
        System.out.println("main: a=" + a + ", b=" + b);
    }
}`,
        },
        {
          type: "output",
          text: `field a = 1   (a=0, b=0)
static block 1   (a=1, b=0)
field b = a + 1   (a=1, b=0)
static block 2   (a=1, b=2)
main: a=1, b=2`,
        },
        {
          type: "paragraph",
          text: "`javap -c ClinitOrder` shows a single `static {}` method: `ldc \"field a = 1\"` ... `putstatic a`, then `ldc \"static block 1\"`, then `field b`, then `static block 2`, in source order. While `field a = 1` was running, both fields were still `0`, the default that preparation gave them, and `b` stayed `0` until its own line ran. Moving the second static block above `b` would change the output, which is why I keep static initialization in one place and in dependency order.",
        },
        {
          type: "heading",
          text: "Reading a static field too early",
        },
        {
          type: "paragraph",
          text: "Using a static field by its simple name above its declaration, as in `static int minPrice = basePrice + 10;` followed by `static int basePrice = 50;`, fails with `illegal forward reference` (JLS 8.3.3). The rule is purely about the simple name. Qualify it with the class name and it compiles, then quietly reads the field before it's assigned:",
        },
        {
          type: "code",
          language: "java",
          title: "ForwardRef.java",
          code: `public class ForwardRef {
    static int minPrice = ForwardRef.basePrice + 10;   // qualified name: compiles, reads basePrice too early
    static int basePrice = 50;

    public static void main(String[] args) {
        System.out.println("minPrice = " + minPrice + ", basePrice = " + basePrice);
    }
}`,
        },
        {
          type: "output",
          text: "minPrice = 10, basePrice = 50",
        },
        {
          type: "paragraph",
          text: "`basePrice` was still `0` when `minPrice`'s initializer ran, so the minimum price came out as 10 rupees. The same thing happens without any trick when a static initializer calls a method that reads a later field, as `ClinitOrder` did, or creates an instance whose constructor reads one, the `Preparation` example in the Class Loading lesson. One variation behaves differently: when I made `basePrice` a `static final int`, the same program printed `minPrice = 60, basePrice = 50`, because a constant is copied in by `javac` and never read at runtime.",
        },
      ],
    },
    {
      title: "Initialization Is Locked: Singletons and Poisoned Classes",
      blocks: [
        {
          type: "paragraph",
          text: "Step 2 of the initialization procedure says that while one thread runs a class's `<clinit>`, every other thread that needs the class waits. That one guarantee gives a lazy, thread-safe singleton for free. I raced eight threads against two versions of a price catalog: a lazy singleton written by hand, and the **initialization-on-demand holder** idiom:",
        },
        {
          type: "code",
          language: "java",
          title: "LazySingletons.java",
          code: `import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

public class LazySingletons {
    static final AtomicInteger built = new AtomicInteger();

    // Broken: check-then-act on a static field, with no lock
    static class BrokenCatalog {
        private static BrokenCatalog instance;

        private BrokenCatalog() {
            built.incrementAndGet();
            pause(50);                                   // loading prices takes a moment
        }

        static BrokenCatalog getInstance() {
            if (instance == null) {                      // several threads can see null here
                instance = new BrokenCatalog();
            }
            return instance;
        }
    }

    // Holder idiom: the JVM's class-initialization lock does the work
    static class PriceCatalog {
        static { System.out.println("  PriceCatalog class initialized"); }

        private PriceCatalog() {
            built.incrementAndGet();
            pause(50);
        }

        static String version() { return "prices-v7"; }  // does not build the catalog

        private static class Holder {
            static final PriceCatalog INSTANCE = new PriceCatalog();
        }

        static PriceCatalog getInstance() {
            return Holder.INSTANCE;                       // first call initializes Holder, once
        }
    }

    static void race(String label, Supplier<Object> getter) throws InterruptedException {
        built.set(0);
        Set<Object> seen = ConcurrentHashMap.newKeySet();
        Thread[] requests = new Thread[8];
        for (int i = 0; i < 8; i++) {
            requests[i] = new Thread(() -> seen.add(getter.get()));
            requests[i].start();
        }
        for (Thread t : requests) t.join();
        System.out.println("  " + label + ": constructions=" + built.get()
                + ", distinct instances=" + seen.size());
    }

    static void pause(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    public static void main(String[] args) throws Exception {
        race("broken", BrokenCatalog::getInstance);
        System.out.println("  version: " + PriceCatalog.version());
        race("holder", PriceCatalog::getInstance);
    }
}`,
        },
        {
          type: "output",
          text: `  broken: constructions=8, distinct instances=8
  PriceCatalog class initialized
  version: prices-v7
  holder: constructions=1, distinct instances=1`,
        },
        {
          type: "list",
          items: [
            "**Broken:** all eight threads saw `instance == null` before the first constructor finished, so the expensive catalog was built eight times and every thread walked away with its own copy. Three more runs built it 8 times every time, and once only 7 distinct instances came back, because a thread returned the object a later thread had just written over its own. It's still a race: the `pause(50)` only widens the window enough to hit it every time. Without it, the bug shows up rarely, which is worse.",
            "**Holder:** `PriceCatalog.version()` initialized `PriceCatalog` (its static block printed) but didn't build the catalog, because `INSTANCE` lives in the nested `Holder` class. The first `getInstance()` initialized `Holder`, and the threads that arrived while it was running waited on the init lock. One construction, one instance, and no `synchronized` or `volatile` in the code.",
            "`-Xlog:class+init=info` shows it from the JVM's side: a single line, `Initializing 'LazySingletons$PriceCatalog$Holder' ... by thread \"Thread-8\"`. Which thread wins varies between runs.",
          ],
        },
        {
          type: "paragraph",
          text: "Other correct options: an eager `static final INSTANCE = new PriceCatalog()` directly in the class (simplest, if building it early is fine), an `enum` with a single constant (shown in the Examples), or double-checked locking, which is only correct with the field declared `volatile`. In a Spring application I'd use none of these by hand: a bean is a singleton per container by default, and the container decides when it's created.",
        },
        {
          type: "heading",
          text: "When a static initializer throws",
        },
        {
          type: "paragraph",
          text: "Step 7 of the procedure has a nasty consequence: a class whose `<clinit>` fails is marked erroneous, permanently, for that class loader. This is a configuration class with a typo in a value, used once per request:",
        },
        {
          type: "code",
          language: "java",
          title: "PoisonedClass.java",
          code: `import java.util.Map;

public class PoisonedClass {
    static class TaxConfig {
        // As if read from a config file with a typo: "2,5" instead of "2.5"
        static final Map<String, String> RAW = Map.of("tax.cess.percent", "2,5");
        static final double CESS = Double.parseDouble(RAW.get("tax.cess.percent"));

        static double cess() { return CESS; }
    }

    public static void main(String[] args) {
        for (int request = 1; request <= 3; request++) {
            try {
                System.out.println("request " + request + ": cess = " + TaxConfig.cess());
            } catch (Throwable t) {
                System.out.println("request " + request + ": " + t);
                System.out.println("           cause: " + t.getCause());
            }
        }
        TaxConfig.cess();                      // not caught this time: the full stack trace
    }
}`,
        },
        {
          type: "output",
          text: `request 1: java.lang.ExceptionInInitializerError
           cause: java.lang.NumberFormatException: For input string: "2,5"
request 2: java.lang.NoClassDefFoundError: Could not initialize class PoisonedClass$TaxConfig
           cause: java.lang.ExceptionInInitializerError: Exception java.lang.NumberFormatException: For input string: "2,5" [in thread "main"]
request 3: java.lang.NoClassDefFoundError: Could not initialize class PoisonedClass$TaxConfig
           cause: java.lang.ExceptionInInitializerError: Exception java.lang.NumberFormatException: For input string: "2,5" [in thread "main"]
Exception in thread "main" java.lang.NoClassDefFoundError: Could not initialize class PoisonedClass$TaxConfig
\tat PoisonedClass.main(PoisonedClass.java:21)
Caused by: java.lang.ExceptionInInitializerError: Exception java.lang.NumberFormatException: For input string: "2,5" [in thread "main"]
\tat java.base/jdk.internal.math.FloatingDecimal.readJavaFormatString(FloatingDecimal.java:2054)
\tat java.base/jdk.internal.math.FloatingDecimal.parseDouble(FloatingDecimal.java:110)
\tat java.base/java.lang.Double.parseDouble(Double.java:792)
\tat PoisonedClass$TaxConfig.<clinit>(PoisonedClass.java:7)
\tat PoisonedClass.main(PoisonedClass.java:15)`,
        },
        {
          type: "list",
          items: [
            "Only the **first** use got `ExceptionInInitializerError`, wrapping the real `NumberFormatException`. Every use after that got `NoClassDefFoundError: Could not initialize class`. The JVM doesn't retry `<clinit>`; the class stays broken until the JVM (or its class loader) is replaced.",
            "In a web service that looks like this: one 500 with the real cause in the log, then thousands of 500s that all say `NoClassDefFoundError`, which sounds like a missing JAR and isn't. The first error usually scrolled out of view long ago.",
            "JDK 21 helps a little. The later `NoClassDefFoundError`s carry a cause that records the original exception, the thread it happened in, and the original stack trace down to `TaxConfig.<clinit>` at line 7. The `toString()` alone still doesn't mention it, which is why the Class Loading lesson's advice to scroll up for the first `ExceptionInInitializerError` still stands.",
            "If `<clinit>` throws an `Error` itself, it isn't wrapped. When I threw a simulated `OutOfMemoryError` from a static block, the first use got `java.lang.OutOfMemoryError: simulated` as is, and the second use the same `NoClassDefFoundError`. Only non-`Error` exceptions become `ExceptionInInitializerError`.",
          ],
        },
        {
          type: "heading",
          text: "Initialization can deadlock",
        },
        {
          type: "paragraph",
          text: "The same lock can deadlock. I gave two nested classes, `Prices` and `Taxes`, static initializers that read each other's static field (with a 100 ms pause in each), and started one thread on each. Both hung forever. `jcmd <pid> Thread.print` showed both threads as `RUNNABLE`, not `BLOCKED`, there was no `Found one Java-level deadlock` section, and the only clue was one line in each stack:",
        },
        {
          type: "output",
          text: `\tat InitDeadlock$Prices.<clinit>(InitDeadlock.java:6)
\t- waiting on the Class initialization monitor for InitDeadlock$Taxes
...
\tat InitDeadlock$Taxes.<clinit>(InitDeadlock.java:14)
\t- waiting on the Class initialization monitor for InitDeadlock$Prices`,
        },
        {
          type: "paragraph",
          text: "On a single thread the same cycle doesn't hang. It hits step 3, the recursive request, and silently reads a default instead: `Taxes` saw `Prices.BASE` as `0.0` halfway through, so its multiplier came out as `1.0` instead of `1.18`. A hang or a wrong value, so static initializers that reach into other classes' statics are something I avoid.",
        },
      ],
    },
    {
      title: "Constants Are Copied Into the Caller",
      blocks: [
        {
          type: "paragraph",
          text: "JLS 13.1 requires that a reference to a constant variable is resolved at compile time to its value, and that no reference to the field remains in the compiled class. `Tariff` showed the consequence inside one build. The real damage is across builds, so I compiled two classes, changed one, and recompiled only that one:",
        },
        {
          type: "code",
          language: "java",
          title: "Shipping.java (v1)",
          code: `public class Shipping {
    public static final int RETURN_FEE = 50;                     // compile-time constant
    public static final Integer GIFT_WRAP_FEE = 30;              // static final, but not a constant
    public static int returnFee() { return 50; }                 // a method: always asks Shipping
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Checkout.java",
          code: `public class Checkout {
    public static void main(String[] args) {
        System.out.println("constant field:     " + Shipping.RETURN_FEE);
        System.out.println("non-constant field: " + Shipping.GIFT_WRAP_FEE);
        System.out.println("static method:      " + Shipping.returnFee());
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Shipping.java (v2)",
          code: `public class Shipping {
    public static final int RETURN_FEE = 75;
    public static final Integer GIFT_WRAP_FEE = 45;
    public static int returnFee() { return 75; }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Shipping.java Checkout.java && java Checkout     # v1 of Shipping
# edit Shipping.java to v2, recompile ONLY Shipping
javac Shipping.java && java Checkout
# rebuild both
javac Shipping.java Checkout.java && java Checkout`,
        },
        {
          type: "output",
          text: `constant field:     50
non-constant field: 30
static method:      50

constant field:     50
non-constant field: 45
static method:      75

constant field:     75
non-constant field: 45
static method:      75`,
        },
        {
          type: "code",
          language: "bash",
          code: `# Checkout as compiled against v1
javap -c Checkout | grep -E "ldc|getstatic.*Shipping|invokestatic.*Shipping"`,
        },
        {
          type: "output",
          text: `       3: ldc           #15                 // String constant field:     50
      11: getstatic     #23                 // Field Shipping.GIFT_WRAP_FEE:Ljava/lang/Integer;
      25: invokestatic  #31                 // Method Shipping.returnFee:()I`,
        },
        {
          type: "list",
          items: [
            "After recompiling only `Shipping`, the **constant** still said 50 while the other two said 45 and 75. The new `Shipping.class` was right there on the class path; `Checkout` just never asks it.",
            "`javap` shows why. The 50 isn't even an `int` in `Checkout` anymore: `javac` folded `\"constant field:     \" + 50` into one string literal. The non-constant `Integer` is a real `getstatic` and the method is a real `invokestatic`, both resolved against whatever `Shipping.class` is present at runtime.",
            "JLS 13.4.9 says this outright: changing the value of a constant doesn't affect existing binaries that use it. Only recompiling the users fixes it, which the third run shows.",
            "So a `public static final` primitive or `String` is part of a class's binary contract. If a value might ever change between releases (fees, limits, feature flags, URLs), I don't make it a compile-time constant: I expose it through a method, or better, read it from configuration at runtime.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "Not every static final is inlined",
          text: "Only constant variables are copied: a primitive or `String`, `final`, initialized with a constant expression. `static final Integer`, `static final long STARTED = System.nanoTime()` and `static final List<String>` are ordinary fields read with `getstatic`. The production section shows the same bug spread across two JARs.",
        },
      ],
    },
    {
      title: "Who Shares a Static Field",
      blocks: [
        {
          type: "heading",
          text: "Every thread shares it",
        },
        {
          type: "paragraph",
          text: "A static field is one memory location for the whole JVM, so every thread reads and writes the same one. A request counter is the classic example. I put three counters in one method and called it from a fixed pool of eight threads, the way a web server's worker threads would:",
        },
        {
          type: "code",
          language: "java",
          title: "RequestCounter.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

public class RequestCounter {
    static long plain;                                   // shared by every thread, no protection
    static final AtomicLong ATOMIC = new AtomicLong();   // one atomic variable
    static final LongAdder ADDER = new LongAdder();      // striped cells, summed on read

    static void handleRequest() {
        plain++;                                         // read, add, write back: three steps
        ATOMIC.incrementAndGet();
        ADDER.increment();
    }

    public static void main(String[] args) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(8);    // like 8 request threads
        for (int t = 0; t < 8; t++) {
            pool.submit(() -> {
                for (int i = 0; i < 1_000_000; i++) {
                    handleRequest();
                }
            });
        }
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.MINUTES);

        System.out.println("expected:   8000000");
        System.out.println("long++:     " + plain);
        System.out.println("AtomicLong: " + ATOMIC.get());
        System.out.println("LongAdder:  " + ADDER.sum());
    }
}`,
        },
        {
          type: "output",
          text: `expected:   8000000
long++:     7537007
AtomicLong: 8000000
LongAdder:  8000000

# two more runs: long++ gave 7490414 and 7493126, the other two 8000000 every time`,
        },
        {
          type: "list",
          items: [
            "`plain++` is `getstatic`, `lconst_1`, `ladd`, `putstatic`. Two threads can read the same value, both add one, and both write back the same result: one request is lost. About 6% of them vanished here, a different number every run, with no exception anywhere.",
            "`AtomicLong.incrementAndGet` does the read-modify-write as one atomic CPU operation. `LongAdder` spreads increments over several cells and adds them up when read, which scales much better when many threads update at once (measured in Performance).",
            "`static final` didn't help and wouldn't: `final` freezes the reference `ATOMIC`, not the object it points to. Whether a static object is safe to share depends entirely on that object's class. That's the whole production section of this lesson in one sentence.",
            "A `static synchronized` method locks the `Class` object. In a quick check, `Thread.holdsLock(SyncLock.class)` was `true` inside one, and `javap -v` showed its flags as `(0x0028) ACC_STATIC, ACC_SYNCHRONIZED`. That's one lock for the whole class, shared by every caller, which is correct but serializes everything. Locks, atomics and the Java memory model get their own treatment in the Multithreading and Concurrency track later.",
          ],
        },
        {
          type: "heading",
          text: "Every class loader gets its own copy",
        },
        {
          type: "paragraph",
          text: "\"One copy per class\" really means one copy per **runtime class**, and the JVM identifies a class by its name **and** its defining class loader. Two loaders that each define `Employee` produce two classes, with two mirrors and two sets of statics. I loaded the same `Employee.class` file through a second loader whose parent is the platform loader, so it can't delegate to the app loader:",
        },
        {
          type: "code",
          language: "java",
          title: "TwoCopies.java",
          code: `import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;

public class TwoCopies {
    public static void main(String[] args) throws Exception {
        new Employee("Asha");                            // the app loader's Employee
        new Employee("Ravi");

        // A second loader over the SAME directory. Its parent is the platform loader,
        // so it can't delegate to the app loader and defines its own Employee class.
        URL classes = Path.of("classes").toUri().toURL();
        try (URLClassLoader plugin = new URLClassLoader("plugin", new URL[] {classes},
                ClassLoader.getPlatformClassLoader())) {
            Class<?> copy = plugin.loadClass("Employee");
            Object kiran = copy.getConstructor(String.class).newInstance("Kiran");

            System.out.println("app    Employee.headcount = " + Employee.headcount);
            System.out.println("plugin Employee.headcount = " + copy.getField("headcount").get(null));
            System.out.println("same name: " + copy.getName().equals(Employee.class.getName())
                    + ", same class: " + (copy == Employee.class));

            Employee e = (Employee) kiran;               // Employee here means the app loader's Employee
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d classes Employee.java TwoCopies.java
java -cp classes TwoCopies`,
        },
        {
          type: "output",
          text: `app    Employee.headcount = 2
plugin Employee.headcount = 1
same name: true, same class: false
Exception in thread "main" java.lang.ClassCastException: class Employee cannot be cast to class Employee (Employee is in unnamed module of loader 'plugin' @33909752; Employee is in unnamed module of loader 'app')
\tat TwoCopies.main(TwoCopies.java:23)`,
        },
        {
          type: "list",
          items: [
            "Same bytes, same name, two independent counters: 2 for the app's `Employee`, 1 for the plugin's. The plugin's `Employee` ran its own initialization and has its own mirror, exactly as in the diagram above.",
            "The cast failed with the famous \"`Employee` cannot be cast to `Employee`\". The message names both loaders, which is the first thing I'd read in a production trace like this. (The `@33909752` is the loader's identity hash and changes every run.)",
            "Where this happens for real: app servers give each web app its own loader, so two apps in one Tomcat each have their own copy of a library's static caches. Plugin systems do the same on purpose. Hot-reload tools like Spring Boot DevTools load my classes in a restart loader, so an object created by one loader and cast by code from another fails exactly like this. The Class Loading lesson has the loader side of the story.",
          ],
        },
      ],
    },
    {
      title: "Utility Classes, Factories and Dependency Injection",
      blocks: [
        {
          type: "heading",
          text: "Utility classes",
        },
        {
          type: "paragraph",
          text: "A class with only static methods and no state is a **utility class**. The JDK's are `Math`, `Collections`, `Objects` and `Arrays`. The convention is a `final` class with a `private` constructor, so nobody can instantiate or extend it:",
        },
        {
          type: "code",
          language: "java",
          title: "PriceMath.java",
          code: `import java.util.Arrays;
import java.util.Collections;
import java.util.Objects;

public final class PriceMath {                      // final: nothing can extend it
    private PriceMath() {                           // private: nothing can instantiate it
        throw new AssertionError("PriceMath is a utility class");
    }

    public static long roundToRupee(double amount) {
        return Math.round(amount);
    }

    public static double withTax(double price, double taxRate) {
        if (taxRate < 0) {
            throw new IllegalArgumentException("negative tax rate: " + taxRate);
        }
        return price * (1 + taxRate);
    }

    public static void main(String[] args) {
        System.out.println(roundToRupee(withTax(170, 0.18)));
        for (Class<?> c : new Class<?>[] {Math.class, Collections.class, Objects.class, PriceMath.class}) {
            System.out.println(c.getSimpleName() + " constructors: "
                    + Arrays.toString(c.getDeclaredConstructors()));
        }
    }
}`,
        },
        {
          type: "output",
          text: `201
Math constructors: [private java.lang.Math()]
Collections constructors: [private java.util.Collections()]
Objects constructors: [private java.util.Objects()]
PriceMath constructors: [private PriceMath()]`,
        },
        {
          type: "paragraph",
          text: "170 plus 18% tax is 200.6, rounded to 201. Without the private constructor, `javac` would add a public default one, and `new PriceMath()` would compile into a pointless object. With it, `new PriceMath()` from another class fails with `PriceMath() has private access in PriceMath`. The `AssertionError` only matters for reflection or a careless call from inside the class itself.",
        },
        {
          type: "paragraph",
          text: "A static method that returns an instance, like `List.of(...)`, `Integer.valueOf(127)` or `LocalDate.of(2026, 11, 1)`, is a **static factory**: it has a name, can return a cached object instead of a new one, and can return a subtype. The Constructors lesson covers when to prefer one, and `CityRegistry` in the Examples is a small caching factory.",
        },
        {
          type: "heading",
          text: "Static, singleton, or a Spring bean?",
        },
        {
          type: "paragraph",
          text: "When logic needs exactly one shared instance, static methods, a hand-written singleton and a Spring bean all deliver it. They differ in tests: a static call is welded into its callers, a singleton is looked up by its callers, and a bean is handed to them. I tried it with real Spring (Maven coordinates `org.springframework:spring-context`, version 6.2.11). The instance version takes its discount policy through the constructor, so Spring can wire the real one and a unit test can pass any other. The static version can't be rewired at all. I also put `@Autowired` on a static field to see what Spring does with it:",
        },
        {
          type: "code",
          language: "java",
          title: "PriceWiring.java",
          code: `import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

public class PriceWiring {
    interface DiscountPolicy {
        double multiplier(String tier);
    }

    static class FestiveDiscount implements DiscountPolicy {
        public double multiplier(String tier) { return tier.equals("gold") ? 0.8 : 0.9; }
    }

    // Static version: the policy is welded in
    static class StaticPrices {
        static long price(String tier, int items) {
            return Math.round((50 + items * 12) * new FestiveDiscount().multiplier(tier));
        }
    }

    // Instance version: the policy comes in through the constructor
    static class PriceService {
        private final DiscountPolicy discount;

        PriceService(DiscountPolicy discount) { this.discount = discount; }

        long price(String tier, int items) {
            return Math.round((50 + items * 12) * discount.multiplier(tier));
        }
    }

    static class LegacyCheckout {
        @Autowired
        static DiscountPolicy policy;                    // trying to inject into a static field
    }

    @Configuration
    static class AppConfig {
        @Bean DiscountPolicy discountPolicy() { return new FestiveDiscount(); }
        @Bean PriceService priceService(DiscountPolicy discount) { return new PriceService(discount); }
        @Bean LegacyCheckout legacyCheckout() { return new LegacyCheckout(); }
    }

    public static void main(String[] args) {
        try (var context = new AnnotationConfigApplicationContext(AppConfig.class)) {
            System.out.println("Spring bean: " + context.getBean(PriceService.class).price("gold", 10));
            System.out.println("unit test:   " + new PriceService(tier -> 1.0).price("gold", 10));
            System.out.println("static call: " + StaticPrices.price("gold", 10));
            System.out.println("@Autowired static field: " + LegacyCheckout.policy);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# $SPRING = spring-context 6.2.11 and its dependencies from ~/.m2
javac -cp "$SPRING" PriceWiring.java
java -cp "$SPRING:." PriceWiring`,
        },
        {
          type: "output",
          text: `Nov 13, 2026 12:03:56 AM org.springframework.beans.factory.annotation.AutowiredAnnotationBeanPostProcessor lambda$buildAutowiringMetadata$1
INFO: Autowired annotation is not supported on static fields: static PriceWiring$DiscountPolicy PriceWiring$LegacyCheckout.policy
Spring bean: 136
unit test:   170
static call: 136
@Autowired static field: null`,
        },
        {
          type: "list",
          items: [
            "The Spring-wired `PriceService` gave (50 + 10 × 12) × 0.8 = 136 for a gold customer. The \"unit test\" line built the same class with a lambda policy of 1.0 and got 170, no Spring needed. `StaticPrices.price` returns 136 in every test forever, because the policy is created inside it.",
            "`@Autowired` on a static field is **not** injected. Spring logged one INFO line and moved on, and the field stayed `null`. In a real service that's a `NullPointerException` waiting for the first request. Spring injects into objects it manages, and a static field doesn't belong to any object.",
            "Mockito can replace a static method inside a test with `Mockito.mockStatic`, and some legacy code needs that. I treat needing it as a sign that the static method should have been an injected instance.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `TariffUser` from the Internal Working section, from `javac` to the last `println`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time:** `javac` resolves `Tariff.BASE_CHARGE` and finds a constant variable, so it writes `bipush 50` into `TariffUser.main`, and `ldc \"INR\"` for `CURRENCY`. No reference to either field is kept.",
            "`Tariff.quote(10)` names a static method, so `javac` emits `invokestatic Tariff.quote:(I)I`. `Tariff.quotes` becomes `getstatic Tariff.quotes:I`. Both keep a symbolic reference to `Tariff`.",
            "**Run time:** the launcher loads `TariffUser`, initializes it (no `<clinit>`, so nothing runs) and calls `main`.",
            "`bipush 50` and `ldc \"INR\"` run without touching `Tariff`, and `base charge: 50 INR` prints. `Tariff` isn't even loaded yet.",
            "The first `invokestatic` resolves `Tariff.quote`. The app class loader loads `Tariff`, and the JVM links it: verification, then preparation, which gives `quotes` and `LOADED_AT` their default 0.",
            "`invokestatic` is one of the four initializing instructions, so the JVM takes `Tariff`'s init lock and runs `<clinit>`: `LOADED_AT = System.nanoTime()`, then the static block prints `Tariff static block running`. `Tariff` is marked initialized and the lock released.",
            "`quote(10)` runs in a new frame with `units` in slot 0 and no `this`. `getstatic` and `putstatic` bump `quotes` to 1 inside `Tariff`'s mirror, and it returns 50 + 120 = 170.",
            "`getstatic Tariff.quotes` finds the class initialized and reads 1 from the mirror: no lock, no `<clinit>`, just a load.",
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
          title: "StaticSyntax.java",
          code: `import static java.lang.Math.max;                        // static import of one method
import static java.util.concurrent.TimeUnit.MINUTES;     // static import of an enum constant

import java.util.HashMap;
import java.util.Map;

public class StaticSyntax {
    public static final int MIN_ORDER = 50;               // constant: static final + constant value
    private static int quotes;                            // class-level, starts at 0
    private static final Map<String, Double> TAX = new HashMap<>();

    static {                                              // static block: runs once, at class init
        TAX.put("books", 0.05);
        TAX.put("electronics", 0.18);
    }

    static long quote(String category, int qty) {         // static method: no this
        quotes++;
        return Math.round(max(MIN_ORDER, qty * 12) * (1 + TAX.getOrDefault(category, 0.12)));
    }

    static class Receipt {                                // static nested class: no outer object
        private final String line;
        Receipt(String category, long amount) { line = category + ": Rs " + amount; }
        @Override public String toString() { return line; }
    }

    interface Rounding {
        long round(double amount);

        static Rounding nearestRupee() {                  // static method in an interface
            return Math::round;
        }
    }

    public static void main(String[] args) {              // static: called before any object exists
        System.out.println(quote("electronics", 10));     // unqualified, inside the class
        System.out.println(StaticSyntax.quote("books", 3)); // qualified with the class name
        System.out.println(new Receipt("books", 53));     // no StaticSyntax object needed
        System.out.println(Rounding.nearestRupee().round(99.5));
        System.out.println("quotes=" + quotes + ", session timeout=" + MINUTES.toSeconds(5) + "s");
    }
}`,
        },
        {
          type: "output",
          text: `142
53
books: Rs 53
100
quotes=2, session timeout=300s`,
        },
        {
          type: "paragraph",
          text: "Electronics, 10 items: `max(50, 120)` plus 18% tax is 141.6, rounded to 142. Books, 3 items: the minimum order wins, `max(50, 36)` plus 5% is 52.5, rounded to 53. `quotes` reached 2 across both calls because there's only one of it. `max` and `MINUTES` came in through static imports, and `Rounding.nearestRupee()` had to be called on the interface name.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "A shared ID generator",
        },
        {
          type: "paragraph",
          text: "Every order needs a unique id. The counter belongs to the class, the id it hands out belongs to each object:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderIds.java",
          code: `import java.util.concurrent.atomic.AtomicLong;

public class OrderIds {
    static class Order {
        private static final AtomicLong NEXT_ID = new AtomicLong(1001);   // one counter for all orders
        private final long id;                                           // one id per order
        private final String customer;

        Order(String customer) {
            this.id = NEXT_ID.getAndIncrement();       // atomic: safe from many request threads
            this.customer = customer;
        }

        static long issued() {
            return NEXT_ID.get() - 1001;
        }

        @Override
        public String toString() {
            return "Order#" + id + " for " + customer;
        }
    }

    public static void main(String[] args) {
        System.out.println(new Order("Asha"));
        System.out.println(new Order("Ravi"));
        System.out.println(new Order("Meera"));
        System.out.println("ids issued: " + Order.issued());
    }
}`,
        },
        {
          type: "output",
          text: `Order#1001 for Asha
Order#1002 for Ravi
Order#1003 for Meera
ids issued: 3`,
        },
        {
          type: "diagram",
          text: ` Order's mirror (one)              Order objects (one per new)
┌──────────────────────────┐      ┌────────────────────────────┐
│ static final NEXT_ID ──┐ │      │ id 1001   customer "Asha"  │
└────────────────────────┼─┘      ├────────────────────────────┤
                         ▼        │ id 1002   customer "Ravi"  │
               ┌──────────────┐   ├────────────────────────────┤
               │ AtomicLong   │   │ id 1003   customer "Meera" │
               │ value = 1004 │   └────────────────────────────┘
               └──────────────┘
  every constructor reads and      each object keeps the id
  bumps the same counter           it was handed`,
          caption: "The static field holds the counter; the instance field holds the counter's value at the moment of new.",
        },
        {
          type: "paragraph",
          text: "`NEXT_ID` is `final`, but the `AtomicLong` it points to keeps changing, which is fine because `AtomicLong` is built for exactly that. With a plain `static long` and `next++`, two request threads could hand out the same id, the lost-update bug from `RequestCounter`.",
        },
        {
          type: "heading",
          text: "Static and instance initializers",
        },
        {
          type: "paragraph",
          text: "The Constructors lesson owns the full initialization order. The static part of it fits in one program:",
        },
        {
          type: "code",
          language: "java",
          title: "InitKinds.java",
          code: `public class InitKinds {
    static int created = log("static field initializer", 0);
    static { log("static block", 0); }

    int id = log("instance field initializer", ++created);
    { log("instance block, id=" + id, 0); }

    InitKinds() {
        log("constructor body", 0);
    }

    static int log(String what, int value) {
        System.out.println("  " + what);
        return value;
    }

    public static void main(String[] args) {
        System.out.println("main starts");
        new InitKinds();
        System.out.println("second object");
        new InitKinds();
    }
}`,
        },
        {
          type: "output",
          text: `  static field initializer
  static block
main starts
  instance field initializer
  instance block, id=1
  constructor body
second object
  instance field initializer
  instance block, id=2
  constructor body`,
        },
        {
          type: "paragraph",
          text: "Static initializers ran once, before `main`, because `InitKinds` is the main class. Instance initializers and the constructor body ran for each `new`, after the class was fully initialized, which is why `++created` can rely on static state. The exception is a static initializer that creates an instance of its own class: then instance code runs in the middle of static initialization, the `Preparation` trap from the Class Loading lesson.",
        },
        {
          type: "heading",
          text: "A static factory with a cache",
        },
        {
          type: "code",
          language: "java",
          title: "CityRegistry.java",
          code: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class CityRegistry {
    static final class City {
        // Bounded by the number of cities the shop delivers to, so this static cache can't grow forever
        private static final Map<String, City> BY_NAME = new ConcurrentHashMap<>();
        private final String name;

        private City(String name) {                       // only the factory can create cities
            this.name = name;
            System.out.println("  creating City(" + name + ")");
        }

        static City of(String name) {                     // static factory: may return an existing object
            return BY_NAME.computeIfAbsent(name.toLowerCase(), key -> new City(name));
        }

        @Override
        public String toString() {
            return "City(" + name + ")";
        }
    }

    public static void main(String[] args) {
        City a = City.of("Kolkata");
        City b = City.of("kolkata");
        City c = City.of("Pune");
        System.out.println(a + " " + b + " " + c);
        System.out.println("a == b: " + (a == b));
        System.out.println("Integer.valueOf(127) twice, same object: "
                + (Integer.valueOf(127) == Integer.valueOf(127)));
    }
}`,
        },
        {
          type: "output",
          text: `  creating City(Kolkata)
  creating City(Pune)
City(Kolkata) City(Kolkata) City(Pune)
a == b: true
Integer.valueOf(127) twice, same object: true`,
        },
        {
          type: "paragraph",
          text: "Three calls, two objects: `of(\"kolkata\")` returned the existing Kolkata object, so `a == b`. A constructor can't do that, since `new` always creates. `Integer.valueOf` is the JDK's version of the same idea, with its -128 to 127 cache from the Memory Allocation lesson. The comment on `BY_NAME` matters: a static cache keyed by a small fixed set is fine, while the same cache keyed by request ids is exactly the unbounded static map that ran out of memory in the Memory Allocation lesson.",
        },
        {
          type: "heading",
          text: "An enum singleton",
        },
        {
          type: "code",
          language: "java",
          title: "EnumSingleton.java",
          code: `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class EnumSingleton {
    enum TaxTable {
        INSTANCE;                                        // a public static final field, set in <clinit>

        private final Map<String, Double> byCategory = new ConcurrentHashMap<>();

        TaxTable() {
            System.out.println("  TaxTable built");
        }

        void set(String category, double rate) { byCategory.put(category, rate); }

        double rate(String category) { return byCategory.getOrDefault(category, 0.18); }
    }

    public static void main(String[] args) {
        System.out.println("main started");
        TaxTable.INSTANCE.set("books", 0.05);
        System.out.println("books " + TaxTable.INSTANCE.rate("books")
                + ", toys " + TaxTable.INSTANCE.rate("toys"));
        System.out.println("same object: " + (TaxTable.INSTANCE == TaxTable.valueOf("INSTANCE")));
    }
}`,
        },
        {
          type: "output",
          text: `main started
  TaxTable built
books 0.05, toys 0.18
same object: true`,
        },
        {
          type: "paragraph",
          text: "`javap -c -p 'EnumSingleton$TaxTable'` shows what an enum constant really is: `public static final EnumSingleton$TaxTable INSTANCE`, assigned in `static {}` by `new`, `invokespecial <init>(\"INSTANCE\", 0)` and `putstatic INSTANCE`. So the enum singleton gets the same guarantees as the holder idiom: built once, lazily (`TaxTable built` printed after `main started`), under the init lock. Enums also can't be instantiated by reflection or duplicated by deserialization, which is why Effective Java recommends this form for plain-Java singletons.",
        },
      ],
    },
    {
      title: "When to Use Static (and When Not To)",
      blocks: [
        {
          type: "paragraph",
          text: "My default is an instance member, and I need a reason to make something static. The reason is always the same: the thing genuinely belongs to the class, the same for every object and every caller. The capstone lesson, When to Use What in Java OOP, puts this next to the other design choices of the phase; this is the static slice of it.",
        },
        {
          type: "table",
          headers: ["What I'm writing", "Choice", "Why"],
          rows: [
            ["A value that never changes (`MAX_ITEMS`, `CURRENCY`)", "`static final` constant", "One value for everyone. If it may change between releases, a method or config instead, because constants are inlined"],
            ["A pure function of its arguments (`PriceMath.roundToRupee`)", "Static method in a utility class", "No state to share, nothing worth swapping in a test"],
            ["Named creation or a cache of immutable objects (`City.of`)", "Static factory", "Can return existing objects or subtypes; a constructor can't"],
            ["A thread-safe immutable helper (`DateTimeFormatter`, `Pattern`)", "`private static final` field", "Built once, shared safely by every thread"],
            ["Data that differs per object (an employee's tasks, an account's interest rate)", "Instance field", "Each object needs its own copy"],
            ["Data for one request or one call", "Local variable or parameter", "A static field is shared by every request thread"],
            ["Logic with dependencies or settings (pricing, payments, notifications)", "Instance method on an injected bean", "Swappable in tests, configurable per environment"],
            ["Mutable shared state (counters, caches, registries)", "Avoid; if unavoidable, thread-safe and bounded", "Shared by all threads and alive for the whole JVM"],
            ["Exactly one instance of a service", "A Spring bean; holder idiom or enum in plain Java", "The container manages creation; no global lookup"],
          ],
        },
        {
          type: "diagram",
          text: `Is it different for each object?
  yes -> instance field or instance method
  no  -> Does it need collaborators, config, or a fake in tests?
           yes -> instance method on an injected object (a bean)
           no  -> Is it mutable state?
                    yes -> avoid static; if unavoidable: private,
                           thread-safe (AtomicLong, ConcurrentHashMap)
                           and bounded
                    no  -> a value?    fixed forever    -> constant
                                       may change later -> method
                                                           or config
                           behaviour?  pure function    -> static
                                       named creation   -> static
                                                           factory`,
          caption: "The questions I ask, in order, before typing static.",
        },
        {
          type: "list",
          items: [
            "If a method reads no instance state and I'd never want a different implementation in a test, it can be static. `PriceMath.withTax` qualifies.",
            "If it needs a repository, an HTTP client, a clock or a setting, it's an instance method, and those come in through the constructor. Static methods can't be swapped, so they make the code that calls them untestable in isolation.",
            "`static final` freezes a reference, not an object. A static field is only safe to share if what it points to is immutable or thread-safe.",
            "A static mutable field is a global variable with a class name in front. I need a very good reason, and then it gets `AtomicLong`, `ConcurrentHashMap`, or a bound.",
          ],
        },
        {
          type: "paragraph",
          text: "A **right** choice: `PriceMath.roundToRupee` is static because rounding has no state and no alternatives, and `City.of` is a static factory because cities are a small fixed set worth sharing. A **wrong** choice, which I'd expect to see at least once in any codebase: a per-object setting stored in a static field. Here two kinds of bank account each pass their own interest rate to the constructor:",
        },
        {
          type: "code",
          language: "java",
          title: "RateClash.java",
          code: `public class RateClash {
    // Wrong: a per-account setting stored in a static field
    static class StaticRateAccount {
        private static double interestRate;               // ONE value, shared by every instance
        private final String type;

        StaticRateAccount(String type, double interestRate) {
            this.type = type;
            StaticRateAccount.interestRate = interestRate; // the newest account overwrites the others
        }

        long yearlyInterest(long balance) { return Math.round(balance * interestRate); }
    }

    // Right: each account owns its rate
    static class Account {
        private final String type;
        private final double interestRate;

        Account(String type, double interestRate) {
            this.type = type;
            this.interestRate = interestRate;
        }

        long yearlyInterest(long balance) { return Math.round(balance * interestRate); }
    }

    public static void main(String[] args) {
        StaticRateAccount savings = new StaticRateAccount("savings", 0.04);
        StaticRateAccount current = new StaticRateAccount("current", 0.0);
        System.out.println("static:   savings on 10000 = " + savings.yearlyInterest(10_000)
                + ", current on 10000 = " + current.yearlyInterest(10_000));

        Account savings2 = new Account("savings", 0.04);
        Account current2 = new Account("current", 0.0);
        System.out.println("instance: savings on 10000 = " + savings2.yearlyInterest(10_000)
                + ", current on 10000 = " + current2.yearlyInterest(10_000));
    }
}`,
        },
        {
          type: "output",
          text: `static:   savings on 10000 = 0, current on 10000 = 0
instance: savings on 10000 = 400, current on 10000 = 0`,
        },
        {
          type: "list",
          items: [
            "Opening the current account overwrote the rate for the savings account, so savings earned 0 instead of 400 on a balance of 10,000. No error, just wrong money, and which rate survives depends on which account happened to be created last.",
            "The fix was one keyword: without `static`, each `Account` keeps its own rate. Per-object data belongs in instance fields, and here it could also be `final`.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Using an instance member from static code",
        },
        {
          type: "paragraph",
          text: "`StaticContext` above showed the method and field versions. The version that confuses people most is creating an inner class from `main`:",
        },
        {
          type: "code",
          language: "java",
          title: "Order.java",
          code: `public class Order {
    class Line {                                 // inner class: needs an Order object
        int qty;
    }

    public static void main(String[] args) {
        Line line = new Line();
    }
}`,
        },
        {
          type: "output",
          text: `Order.java:7: error: non-static variable this cannot be referenced from a static context
        Line line = new Line();
                    ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`new Line()` really means `this.new Line()`, and `main` has no `this`. If a `Line` doesn't need its `Order`, the fix is `static class Line`; if it does, `new Order().new Line()`.",
        },
        {
          type: "heading",
          text: "Expecting a static method to be overridden",
        },
        {
          type: "paragraph",
          text: "`Hiding` printed `Shape.kind() (static)` for a `Circle` object: whenever the declared type is the parent, the parent's static method runs. Behaviour that varies by subclass has to be an instance method.",
        },
        {
          type: "heading",
          text: "A static import that a member hides",
        },
        {
          type: "code",
          language: "java",
          title: "ShadowedImport.java",
          code: `import static java.lang.Math.max;

public class ShadowedImport {
    static int max(int[] prices) {                 // a member named max
        int best = 0;
        for (int p : prices) best = Math.max(best, p);
        return best;
    }

    public static void main(String[] args) {
        System.out.println(max(new int[] {120, 340, 90}));
        System.out.println(max(3, 7));             // meant Math.max
    }
}`,
        },
        {
          type: "output",
          text: `ShadowedImport.java:12: error: method max in class ShadowedImport cannot be applied to given types;
        System.out.println(max(3, 7));             // meant Math.max
                           ^
  required: int[]
  found:    int,int
  reason: actual and formal argument lists differ in length
1 error`,
        },
        {
          type: "paragraph",
          text: "A member of the class shadows a static import of the same name (JLS 6.4.1), so `Math.max(int, int)` isn't even considered. The opposite problem shows up with two on-demand imports: `import static java.lang.Integer.*;` plus `import static java.lang.Long.*;` and a bare `MAX_VALUE` gives `reference to MAX_VALUE is ambiguous`, `both variable MAX_VALUE in Long and variable MAX_VALUE in Integer match`. I import single, well-known names, and never two wildcards that overlap.",
        },
        {
          type: "heading",
          text: "Calling an interface's static method like a class's",
        },
        {
          type: "paragraph",
          text: "For an interface `DiscountPolicy` with `static DiscountPolicy flat(long amount)` and a class `SeasonalDiscount implements DiscountPolicy`, `SeasonalDiscount.flat(99)` fails with `cannot find symbol` (`symbol: method flat(int)`, `location: class SeasonalDiscount`), and `seasonal.flat(99)` on an instance fails with `illegal static interface method call` / `the receiver expression should be replaced with the type qualifier 'DiscountPolicy'`. Exactly the opposite of class statics, which `NullReceiver` called through a `null` reference. Interface static methods aren't inherited (JLS 8.4.8), so only `DiscountPolicy.flat(99)` works.",
        },
        {
          type: "heading",
          text: "Per-request or per-object data in a static field",
        },
        {
          type: "paragraph",
          text: "`RateClash` lost an account's interest rate to the next constructor call, and the production section below loses whole receipts to a shared formatter. Both come from the same habit: making something static because it was convenient to reach, not because it belongs to the class.",
        },
        {
          type: "heading",
          text: "Thinking static final means immutable, or bounded",
        },
        {
          type: "paragraph",
          text: "`public static final List<String> CITIES = new ArrayList<>();` can't be reassigned, but any code can `CITIES.add(...)` or `clear()` it, from any thread, and nothing ever removes what's added. A shared static collection should be truly immutable (`List.of`, `Map.of`), or private, thread-safe and bounded. The cache-leak reproduction in the Memory Allocation lesson ran a 64 MB heap out of memory in under 10,000 requests with an unbounded static map.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Default to instance members. Make something static only when it truly belongs to the class: constants, pure functions, factories.",
            "Call statics through the class name (`Employee.summary()`), never through a reference, and compile with `-Xlint:static` (or the IDE's equivalent inspection) to catch it.",
            "Keep static fields `private`, and `final` whenever possible. A public mutable static is a global variable.",
            "Share only immutable or thread-safe objects through static fields: `DateTimeFormatter`, `Pattern`, a fully configured Jackson `ObjectMapper`. Never `SimpleDateFormat`, `StringBuilder`, `HashMap` or a `java.util.Random` that tests need to control.",
            "Use compile-time constants only for values that can never change between releases. Anything that might change goes in a method or in configuration, so callers don't need a rebuild.",
            "Keep static initializers short and unable to fail. Parsing config, opening connections or calling other classes' statics belongs in normal startup code, where an exception is readable and retryable.",
            "For a lazy singleton in plain Java, use the holder idiom or an enum. In Spring, let the container own it.",
            "Give utility classes a `private` constructor and make them `final`.",
            "Bound every static collection, or don't make it static.",
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
            "**Static calls aren't meaningfully faster.** `invokestatic` needs no receiver and no dispatch, but HotSpot's JIT also inlines instance calls whenever profiling sees only one or two receiver classes, which is most of them. The Methods lesson showed an 8-byte method inlined into its hot caller. Making methods static \"for speed\" trades testability for nothing measurable.",
            "**A static field costs zero bytes per object.** Measured above: 16 bytes per object with `taxRate` static, 24 with it as an instance field, 16 MB against 24 MB per million objects.",
            "**Static final fields are constants to the JIT.** Once a class is initialized, HotSpot's compilers treat its `static final` fields as constants and fold them into the compiled code, so a `static final boolean DEBUG = false` check disappears entirely. Instance `final` fields generally don't get this treatment.",
            "**Class initialization is a one-time cost**, paid by the first caller, which is part of why the first request through a new code path is slower. After that, a `getstatic` is a plain load from the mirror.",
            "**Contended static counters are slow.** Every thread updating one `AtomicLong` fights over a single cache line. In a test with 8 threads doing 10 million increments each, three rounds took 809, 785 and 942 ms with a static `AtomicLong`, and 82, 49 and 52 ms with a static `LongAdder`. Those numbers are from my machine (16 hardware threads) and vary run to run, but a 10x gap under contention is typical. For a counter that's read rarely, like a metrics counter, `LongAdder` is the better choice.",
          ],
        },
      ],
    },
    {
      title: "Static in Production",
      blocks: [
        {
          type: "paragraph",
          text: "The static bug I'd most expect to meet in a real backend is a `static final SimpleDateFormat`. It looks like an efficient, reusable constant, so it often gets shared by every request thread. This reproduces a ride-hailing receipt service parsing and re-formatting trip pickup times on a fixed pool of 8 threads, the shared legacy formatter against the `java.time` one:",
        },
        {
          type: "code",
          language: "java",
          title: "ReceiptDates.java",
          code: `import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class ReceiptDates {
    // Shared by every request thread. SimpleDateFormat keeps its working state in fields.
    static final SimpleDateFormat LEGACY = new SimpleDateFormat("yyyy-MM-dd HH:mm");
    // Immutable, documented as thread-safe: fine to share as a static final.
    static final DateTimeFormatter MODERN = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    interface RoundTrip {
        String apply(String pickupTime) throws Exception;    // parse, then format back
    }

    static void handleReceipts(String label, RoundTrip roundTrip) throws InterruptedException {
        String[] pickups = {"2026-11-01 08:15", "2026-11-02 21:40", "2026-11-03 06:05", "2026-11-04 13:30",
                            "2026-11-05 19:55", "2026-11-06 23:10", "2026-11-07 10:45", "2026-11-08 17:20"};
        AtomicInteger wrong = new AtomicInteger();
        AtomicInteger failed = new AtomicInteger();
        Map<String, String> firstOfEach = new ConcurrentHashMap<>();
        ExecutorService pool = Executors.newFixedThreadPool(8);          // 8 request threads
        for (String pickup : pickups) {
            pool.submit(() -> {
                for (int i = 0; i < 10_000; i++) {
                    try {
                        String back = roundTrip.apply(pickup);
                        if (!back.equals(pickup)) {
                            wrong.incrementAndGet();
                            firstOfEach.putIfAbsent("wrong date", pickup + " came back as " + back);
                        }
                    } catch (Exception e) {
                        failed.incrementAndGet();
                        firstOfEach.putIfAbsent(e.getClass().getSimpleName(), e.toString());
                    }
                }
            });
        }
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.MINUTES);
        System.out.println(label + ": " + wrong + " wrong dates, " + failed + " exceptions (80000 receipts)");
        new TreeMap<>(firstOfEach).values().forEach(s -> System.out.println("    " + s));
    }

    public static void main(String[] args) throws InterruptedException {
        handleReceipts("static SimpleDateFormat ", s -> LEGACY.format(LEGACY.parse(s)));
        handleReceipts("static DateTimeFormatter", s -> LocalDateTime.parse(s, MODERN).format(MODERN));
    }
}`,
        },
        {
          type: "output",
          text: `static SimpleDateFormat : 54674 wrong dates, 19509 exceptions (80000 receipts)
    java.lang.ArrayIndexOutOfBoundsException: Index -1 out of bounds for length 19
    java.lang.NumberFormatException: For input string: ""
    2026-11-08 17:20 came back as 2026-11-00 21:40
static DateTimeFormatter: 0 wrong dates, 0 exceptions (80000 receipts)

# second run
static SimpleDateFormat : 54062 wrong dates, 21314 exceptions (80000 receipts)
    java.lang.ArrayIndexOutOfBoundsException: Index -1 out of bounds for length 19
    java.lang.NumberFormatException: For input string: "11.11E2.11E0"
    2026-11-01 08:15 came back as 0030-11-04 13:30
static DateTimeFormatter: 0 wrong dates, 0 exceptions (80000 receipts)`,
        },
        {
          type: "list",
          items: [
            "With the shared `SimpleDateFormat`, over 90% of receipts came back wrong or threw. The exact counts and the garbage strings change every run, and a real service with fewer concurrent requests would fail far less often, which makes it harder to find. Dates like `2026-11-00 21:40` or the year `0030` are other threads' digits mixed into this thread's parse.",
            "The cause: `SimpleDateFormat` (through its `Calendar` and number formatter) keeps intermediate parse and format state in **instance fields**. One static instance means every thread writes into the same fields at once. Its Javadoc says it isn't synchronized and recommends separate instances per thread.",
            "The fix is a `static final DateTimeFormatter`: immutable and documented as thread-safe, so one shared instance is exactly right. 0 errors in 80,000 receipts, every run. The other fixes, a new `SimpleDateFormat` per call or a `ThreadLocal<SimpleDateFormat>`, only make sense where legacy `Date` APIs can't be replaced.",
            "The lesson I take from it: `static final` on a field says nothing about thread safety. The object's class decides, and the check is one look at its Javadoc.",
          ],
        },
        {
          type: "heading",
          text: "The constant that didn't change",
        },
        {
          type: "paragraph",
          text: "The second scenario is the `Shipping` and `Checkout` inlining demo, framed the way it would happen in a ride-hailing backend with real artifacts. Pricing rules live in a shared `fare-rules` JAR as a `Fare` class; a billing service is built against version 1.0. Ops raise the cancellation fee in 1.1, the new JAR is deployed, and the billing service isn't rebuilt because \"only the rules changed\":",
        },
        {
          type: "code",
          language: "java",
          title: "Fare.java (v1)",
          code: `public class Fare {
    public static final int CANCELLATION_FEE = 50;               // compile-time constant
    public static final Integer NIGHT_SURCHARGE = 30;            // static final, but not a constant
    public static int cancellationFee() { return 50; }           // a method: always asks Fare
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Billing.java",
          code: `public class Billing {
    public static void main(String[] args) {
        System.out.println("constant field:     " + Fare.CANCELLATION_FEE);
        System.out.println("non-constant field: " + Fare.NIGHT_SURCHARGE);
        System.out.println("static method:      " + Fare.cancellationFee());
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Fare.java (v2)",
          code: `public class Fare {
    public static final int CANCELLATION_FEE = 75;
    public static final Integer NIGHT_SURCHARGE = 45;
    public static int cancellationFee() { return 75; }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d rules-1.0 v1/Fare.java && jar cf fare-rules-1.0.jar -C rules-1.0 .
javac -cp fare-rules-1.0.jar -d billing Billing.java && jar cf billing-service.jar -C billing .
javac -d rules-1.1 v2/Fare.java && jar cf fare-rules-1.1.jar -C rules-1.1 .

java -cp fare-rules-1.1.jar:billing-service.jar Billing     # deployed: new rules, old billing
java -cp billing-service.jar Billing                        # no rules JAR at all`,
        },
        {
          type: "output",
          text: `constant field:     50
non-constant field: 45
static method:      75

constant field:     50
Exception in thread "main" java.lang.NoClassDefFoundError: Fare
\tat Billing.main(Billing.java:4)
Caused by: java.lang.ClassNotFoundException: Fare
\t...`,
        },
        {
          type: "list",
          items: [
            "With the 1.1 rules JAR on the class path, billing still charged the old cancellation fee of 50 while the two non-constant values picked up 45 and 75. Nothing fails and nothing logs; the money is just wrong.",
            "The second run is the proof of where the 50 lives: with **no** rules JAR at all, the constant line still printed, and only the first real field access failed. The value was copied into `billing-service.jar` at build time.",
            "Prevention: values that can change don't belong in compile-time constants. They come from configuration (`@ConfigurationProperties`, environment, a pricing service) or at least from a method. Where shared constants are unavoidable, every consumer is rebuilt when they change, which a build tool's dependency graph can enforce.",
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
              question: "What does the `static` keyword mean in Java?",
              answer:
                "It makes a member belong to the class instead of to any object. A static field has one copy shared by every instance, a static method runs without an object, and a static block runs once, when the class is initialized.\n\nIn the class file it's a single flag, `ACC_STATIC`, and static members are used through `getstatic`, `putstatic` and `invokestatic` instead of the instance instructions. In my `EmployeeCount` run, two `Employee` objects kept their own `tasks` (3 and 1) but shared one `headcount` counter, which ended at 2.",
            },
            {
              question: "What is the difference between a static variable and an instance variable?",
              answer:
                "A static variable has one copy per class, created when the class is initialized. An instance variable has one copy per object, created by `new`. Static variables are reached through the class name, instance variables through a reference.\n\nIn HotSpot they also live in different places. `Unsafe.staticFieldBase` returned `Employee.class` itself for `headcount`, at offset 112, while `tasks` sat at offset 12 inside every `Employee`. Making a field static also removes it from every object: 16 bytes per object instead of 24 in my measurement.",
            },
            {
              question: "Can a static method access instance variables or call instance methods?",
              answer:
                "Not directly. A static method has no `this`, so there's no object whose fields it could mean. It can use instance members through an explicit reference: a parameter, or an object it creates.\n\n`javac` rejected the direct form in `StaticContext` with `non-static method completeTask() cannot be referenced from a static context`, and even `this.tasks` failed with `non-static variable this cannot be referenced from a static context`. Creating an object and calling through it fixed both.",
            },
            {
              question: "Why is `main` static?",
              answer:
                "Because the launcher has to call it before any object of the class exists, and only a static method can be called without an object. The JVM loads and initializes the main class and then calls `main` directly.\n\nJava 25 relaxed this with JEP 512: if the chosen `main` isn't static, the launcher creates an object with the no-argument constructor and calls `main` on it. My `ShopApp` with an instance `void main()` ran on JDK 25 and failed on JDK 21 with `Main method not found in class ShopApp`.",
            },
            {
              question: "When does a static block run, and how many times?",
              answer:
                "Once per class per class loader, when the class is initialized: right before the first instance creation, static method call or non-constant static field access, or when it's the main class or initialized through reflection.\n\nNot at load time, and not at startup. In `TariffUser`, `Tariff`'s static block printed only after `base charge: 50 INR`, because reading the constant `BASE_CHARGE` never touched the class; the first `Tariff.quote(10)` did. In `InitTriggers`, the second round of uses printed nothing new.",
            },
            {
              question: "Can a top-level class be static?",
              answer:
                "No. On a class, `static` means \"doesn't need an instance of the enclosing class\", which means nothing for a class with no enclosing class. `public static class BankAccount` at the top level fails with `modifier static not allowed here`.\n\nOnly nested classes can be static, like `StaticSyntax.Receipt`, which `main` created without any `StaticSyntax` object. Nested records, enums and interfaces are static automatically; I confirmed it with `Modifier.isStatic` on each.",
            },
            {
              question: "Can you call a static method through an object reference? What if the reference is null?",
              answer:
                "Yes, it compiles, and the object is ignored: `javac` emits the same `invokestatic` as for `ClassName.method()`. Even a `null` reference doesn't throw, because nothing is ever dereferenced.\n\nIn `NullReceiver`, `money.currency()` with `money == null` printed `INR`. `javap` showed `aload_1`, `pop`, `invokestatic`, and `-Xlint:static` warned `static method should be qualified by type name`. The expression is still evaluated, so `lookup().currency()` ran `lookup()` first.",
            },
            {
              question: "What is a static import, and when does it hurt readability?",
              answer:
                "`import static` (Java 5) brings static members into scope so they can be used without the class name: `import static java.lang.Math.max;` lets me write `max(a, b)`.\n\nIt hurts when a reader can't tell where a name comes from, and it breaks in two ways I hit. A class member with the same name shadows it: `ShadowedImport` failed on `max(3, 7)` because the class's own `max(int[])` won. And two overlapping wildcards make a name ambiguous: `reference to MAX_VALUE is ambiguous`. I keep it for a few well-known names, like test assertions.",
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
              question: "Can static methods be overridden?",
              answer:
                "No. A static method with the same signature in a subclass **hides** the parent's method. Which one runs is decided at compile time from the declared type, not at runtime from the object.\n\nIn `Hiding`, `Shape shape = new Circle()` printed `Shape.kind() (static)` for the static method but `Circle.describe() (instance)` for the instance one. `javap` showed `invokestatic Hiding$Shape.kind` against `invokevirtual`, and `@Override` on the static method fails with `static methods cannot be annotated with @Override`.",
            },
            {
              question: "In what order do static field initializers and static blocks run?",
              answer:
                "Top to bottom, in the order they're written, as if they were one block, and only once. `javac` merges them all into a single `<clinit>` method, which `javap` prints as `static {}`.\n\n`ClinitOrder` printed `field a = 1`, `static block 1`, `field b = a + 1`, `static block 2`, and showed that while `a`'s initializer ran, `b` was still its default `0`. Compile-time constants are the exception: they're set from `ConstantValue` before `<clinit>` and don't appear in it.",
            },
            {
              question: "What is the order of static initializers, instance initializers and the constructor?",
              answer:
                "Static initializers run once, when the class is initialized. Then, for every `new`, the instance field initializers and instance blocks run in textual order, followed by the rest of the constructor body. Superclasses go first at both levels.\n\n`InitKinds` printed `static field initializer` and `static block` before `main starts`, then `instance field initializer`, `instance block`, `constructor body` for each of the two objects. The Constructors lesson has the full order including `super(...)`.",
            },
            {
              question: "What triggers class initialization, and what doesn't?",
              answer:
                "Creating an instance, calling a static method, assigning a static field, reading a static field that isn't a constant, reflection such as `Class.forName(name)`, initializing a subclass, and being the main class. Not: reading a compile-time constant, creating an array of the type, a `.class` literal, `ClassLoader.loadClass`, or `Class.forName(name, false, loader)`.\n\n`InitTriggers` proved each case with a printing static block per class. The subtle one was `Bike.wheels`: since `wheels` is declared in `Vehicle`, only `Vehicle` was initialized, although the log showed `Bike` loaded.",
            },
            {
              question: "Where are static variables stored?",
              answer:
                "In HotSpot, static field values live inside the class's `java.lang.Class` object, its mirror, which is a normal heap object. The class metadata (methods, bytecode, constant pool) is in Metaspace. The old answer was PermGen, which JDK 8 removed (JEP 122); interned strings had already moved to the heap in JDK 7.\n\nI checked it with `Unsafe.staticFieldBase` on `Employee.headcount`: it returned `Employee.class` itself, with the field at offset 112. The JVM specification doesn't fix a location, so this is HotSpot's answer.",
            },
            {
              question: "Is a static variable thread-safe?",
              answer:
                "No. There's one copy for the whole JVM, every thread reads and writes the same memory, and a read-modify-write like `count++` loses updates. `static` says nothing about synchronization, and `final` only freezes the reference.\n\n`RequestCounter` lost about 6% of 8,000,000 increments with a plain `static long` on 8 threads, while `AtomicLong` and `LongAdder` were exact every run. `javap` shows why: `count++` is `getstatic`, add, `putstatic`, and another thread can run between them.",
            },
            {
              question: "What is the difference between a compile-time constant and any other static final field?",
              answer:
                "A compile-time constant is a `final` primitive or `String` initialized with a constant expression. It gets a `ConstantValue` attribute, and `javac` copies its value into every class that uses it. Other `static final` fields, like a `static final Integer` or one set by a method call, are ordinary fields read with `getstatic`.\n\n`TariffUser` compiled `Tariff.BASE_CHARGE` to `bipush 50`, and `Tariff` wasn't even loaded until a method call. In the separate-compilation demo, recompiling only `Shipping` left `Checkout` printing the old 50, while the `static final Integer` picked up its new value.",
            },
            {
              question: "What is a utility class, and why does it have a private constructor?",
              answer:
                "A class with only static methods and no state, like `Math`, `Collections` or `Objects`. The private constructor stops anyone creating a meaningless instance, and making the class `final` stops subclassing.\n\nWithout it, `javac` adds a public default constructor. With it, `new PriceMath()` fails with `PriceMath() has private access in PriceMath`. Reflection showed the JDK does the same: `private java.lang.Math()`, `private java.util.Collections()`, `private java.util.Objects()`.",
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
              question: "Explain ExceptionInInitializerError versus NoClassDefFoundError \"Could not initialize class\".",
              answer:
                "If a static initializer throws an exception, the code that triggered initialization gets `ExceptionInInitializerError` wrapping it, and the class is marked erroneous for that class loader. Every later use gets `NoClassDefFoundError: Could not initialize class X`, because the JVM never retries `<clinit>`.\n\n`PoisonedClass` showed it with a typo, `\"2,5\"`, as a tax cess percentage: request 1 got the `ExceptionInInitializerError` caused by `NumberFormatException`, requests 2 and 3 the `NoClassDefFoundError`. On JDK 21 the later errors carry the original exception and stack as their cause, though their message doesn't. An `Error` thrown from `<clinit>` isn't wrapped at all.",
            },
            {
              question: "How does the holder idiom give a thread-safe lazy singleton without synchronized?",
              answer:
                "The instance sits in a static field of a private nested `Holder` class, so it's created when `Holder` is initialized, on the first `getInstance()` call. The JVM runs class initialization once, under a lock, and makes other threads wait until it's done (JLS 12.4.2), so there's no race to write code against.\n\nIn `LazySingletons`, eight threads called `PriceCatalog.getInstance()` together: one construction, one instance. Calling `PriceCatalog.version()` first initialized `PriceCatalog` without building the catalog, which is why the holder is a separate class. `-Xlog:class+init` showed `Holder` initialized once, by one thread.",
            },
            {
              question: "What is wrong with `if (instance == null) instance = new PriceCatalog();` as a singleton?",
              answer:
                "It's a check-then-act race. Several threads can see `null` before any of them assigns, and each builds its own instance. Without `volatile`, a thread can also see the reference before it sees the object's fields fully written.\n\nMy broken version built the catalog 8 times for 8 threads, and they ended up with 8 different objects. The correct options are an eager `static final` field, the holder idiom, an enum, or double-checked locking with a `volatile` field; in Spring, a singleton-scoped bean.",
            },
            {
              question: "What bytecode does `ref.staticMethod()` produce, and why doesn't a null `ref` throw?",
              answer:
                "`javac` evaluates `ref`, discards it with `pop`, and emits `invokestatic` against the declared type. JLS 15.12.4.1 says that for a static invocation the target expression is evaluated and its result discarded, so nothing is dereferenced and nothing can throw.\n\n`javap -c NullReceiver` showed exactly `aload_1`, `pop`, `invokestatic NullReceiver$Money.currency`. Because the expression is still evaluated, `lookup().currency()` ran `lookup()` and then popped its result.",
            },
            {
              question: "Is a static field really one per JVM?",
              answer:
                "No, one per class per class loader. The JVM identifies a class by its name and its defining loader, so the same `.class` file defined by two loaders gives two classes, two mirrors and two independent sets of statics.\n\n`TwoCopies` printed `app Employee.headcount = 2` and `plugin Employee.headcount = 1` in one JVM, and the cast failed with `class Employee cannot be cast to class Employee`, naming both loaders. When I let the plugin loader become unreachable and forced a GC, `-Xlog:class+unload` showed its `Employee` unloaded, statics and all.",
            },
            {
              question: "How can a static field be read before its initializer has run?",
              answer:
                "By any path that reads it while `<clinit>` is still running on the same thread: a qualified forward reference, a method called from an initializer, or a constructor called from a static initializer. The JVM treats it as a recursive request and returns, so the field still holds its default from preparation.\n\n`ForwardRef` declared `minPrice = ForwardRef.basePrice + 10` before `basePrice = 50` and got `minPrice = 10`; the unqualified form fails with `illegal forward reference`. With `basePrice` as a `static final int`, it printed 60, because the constant was inlined.",
            },
            {
              question: "Why doesn't reading `Bike.wheels` initialize `Bike`, when `wheels` is declared in `Vehicle`?",
              answer:
                "Because a static field access initializes only the class that declares the field, whatever name it's reached through (JLS 12.4.1). `javac` writes the reference against `Bike`, but field resolution finds `wheels` in `Vehicle`, and only `Vehicle` must be initialized.\n\n`InitTriggers` case 12 printed only `[init] Vehicle`. `javap` showed `getstatic InitTriggers$Bike.wheels`, and `-Xlog:class+load` showed `Bike` loaded but not initialized, so a static block in `Bike` that someone expects to run that way never does.",
            },
            {
              question: "Can class initialization deadlock, and how would you spot it?",
              answer:
                "Yes. If class A's static initializer needs class B and B's needs A, and two threads start from opposite ends, each holds one class \"in progress\" and waits for the other forever.\n\nWhen I reproduced it, `jcmd Thread.print` showed both threads as `RUNNABLE`, there was no `Found one Java-level deadlock` section, and the only clue was `waiting on the Class initialization monitor for InitDeadlock$Taxes` in a stack. On a single thread the same cycle didn't hang; it read a default instead and computed a multiplier of 1.0 instead of 1.18.",
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
              question: "Receipts sometimes show impossible dates, and the logs have random NumberFormatExceptions under load. The code has a `static final SimpleDateFormat`. What's happening?",
              answer:
                "`SimpleDateFormat` isn't thread-safe: it keeps intermediate parse and format state in instance fields, and the static field shares one instance between all request threads, so concurrent calls corrupt each other. `final` only stops reassignment.\n\n`ReceiptDates` reproduced it on 8 threads: over 90% of 80,000 receipts were wrong or threw, with dates like `2026-11-00 21:40` and `NumberFormatException: For input string: \"\"`. A `static final DateTimeFormatter`, immutable and thread-safe, gave 0 errors. Where legacy `Date` code can't change, a new instance per call or a `ThreadLocal` works.",
            },
            {
              question: "A shared library changed a public constant and the new JAR was deployed, but a service still uses the old value. Why?",
              answer:
                "It was a compile-time constant, so `javac` copied the value into the service's own classes when the service was built. The service never reads the field at runtime, so replacing the library JAR changes nothing until the service is recompiled.\n\nIn the production section, with `fare-rules-1.1.jar` deployed, the billing service still charged a cancellation fee of 50 while the non-constant values updated, and it even printed 50 with no rules JAR on the class path at all. The fix is rebuilding the consumers; the prevention is keeping changeable values out of constants, in configuration or behind a method.",
            },
            {
              question: "Heap usage grows until OutOfMemoryError, and the heap dump shows one huge HashMap whose path to GC roots ends at a static field. What do you do?",
              answer:
                "A static field of an application class is reachable for the life of the JVM, so a static map that only ever gets `put` calls is a leak. I'd find what writes to it, then bound it (an LRU `LinkedHashMap`, or Caffeine with a maximum size and expiry), key it by something finite, or move it into a bean with a proper lifecycle.\n\nThe Memory Allocation lesson's `FareCacheLeak` is this case exactly: a `static HashMap` keyed by request died on a 64 MB heap, while the bounded version kept 1,000 entries and finished. `CityRegistry` here is the safe kind of static cache, keyed by a small fixed set of cities.",
            },
            {
              question: "After adding a plugin mechanism, logs show `ClassCastException: class Employee cannot be cast to class Employee`, and some counters look reset. Explain.",
              answer:
                "Two class loaders each defined their own `Employee`. Same name, different classes: an object of one can't be cast to the other, and each copy has its own static fields, so a counter or cache kept in a static is split in two.\n\n`TwoCopies` showed both symptoms in one run: `headcount` was 2 in the app's `Employee` and 1 in the plugin's, and the cast failed with a message naming the loaders `'plugin'` and `'app'`. I'd print `getClassLoader()` for both sides, then fix delegation so shared types always come from one parent loader.",
            },
            {
              question: "Right after a deploy, the first request fails with ExceptionInInitializerError and every request after it with NoClassDefFoundError: Could not initialize class. What's your approach?",
              answer:
                "Find the first error. It carries the real cause from the static initializer, usually bad configuration or an unavailable dependency. The later errors only say the class is unusable, because the JVM marked it erroneous and won't retry, so fixing the cause needs a restart, not just a config reload.\n\n`PoisonedClass` reproduced it with `\"2,5\"` as a tax cess percentage. On JDK 21 the later `NoClassDefFoundError`s include the original `NumberFormatException` and its stack as their cause, which helps once the first error has scrolled away. Longer term, I'd move the parsing out of the static initializer into startup code that fails fast with a readable message.",
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
            "Write `Student.java` with an instance field `name` and a `static int count` that the constructor increments. Create three students, print `Student.count`, then print `count` through one of the students. Compile with `javac -Xlint:static`.",
            "Add `static void show() { System.out.println(name); }` to `Student` and compile. Read the error, then fix it by giving `show` a `Student` parameter.",
            "Write `Base` and `Child extends Base`, each with a `static String who()` and an instance `String me()` that return their class name. With `Base b = new Child();`, predict `b.who()` and `b.me()` before running.",
            "Write `Order` with a static field initializer, a static block, an instance block and a constructor, each printing what it is. Create two orders in `main`, predicting the output first.",
            "Create `Limits` with `static final int MAX = 5;` and a static block that prints `Limits init`. Print `Limits.MAX` from another class. Then change the field to `static final Integer MAX = 5;` and run again.",
            "Write `Rates` with `public static final int PER_UNIT = 12;` and `Quote`, which prints `Rates.PER_UNIT * 10`. Compile both and run `Quote`. Change `PER_UNIT` to 15, recompile only `Rates`, run `Quote`, then recompile `Quote` and run it again.",
            "Start 4 threads that each run `count++` 100,000 times on a `static int count`, join them and print `count`. Then change `count` to a static `AtomicInteger`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `3` twice, and `-Xlint:static` warns `static variable should be qualified by type name, Student, instead of by an expression`. Step 2 fails with `non-static variable name cannot be referenced from a static context`. In step 3 the static call answers `Base` and the instance call answers `Child`. Step 4 prints `static field initializer` and `static block` once, then `instance block` and `constructor` for each order. Step 5 prints just `5`, with no `Limits init`, until `MAX` becomes an `Integer`; then `Limits init` appears before the `5`. Step 6 prints `120`, still `120` after recompiling only `Rates`, and `150` once `Quote` is recompiled. Step 7 prints a number well below 400,000 that changes every run (between about 113,000 and 153,000 across my runs), and exactly `400000` with the `AtomicInteger`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `STATIC     belongs to the class, not to any object
           field: one copy per class, PER CLASS LOADER
           method: no this, invokestatic, bound by javac
           block: runs once, inside <clinit>, top to bottom

CONTEXT    static code can't touch instance members
           "non-static ... cannot be referenced from a
            static context"   -> go through an object

CALLS      ref.m() for static m: aload, pop, invokestatic
           null ref is fine; -Xlint:static warns
           same signature in a subclass = HIDING

INIT       new / getstatic / putstatic / invokestatic,
           reflection, subclass init, the main class
           NOT: constants, new X[n], X.class, loadClass
           one thread runs <clinit>, the others wait
           throws -> EIIE once, then NoClassDefFoundError

CONSTANTS  final primitive/String = constant expression
           ConstantValue; value copied into callers
           change it -> rebuild every user

MEMORY     HotSpot: values in the Class mirror (heap)
           metadata in Metaspace (PermGen gone in JDK 8)
           reachable as long as the class loader lives

THREADS    one copy for all threads: count++ loses
           updates -> AtomicLong / LongAdder
           static final != thread-safe (SimpleDateFormat)

USE FOR    constants, pure functions, factories,
           immutable helpers. NOT per-object or
           per-request data, NOT services with deps`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Static means one copy per class per loader, no `this`, and binding at compile time. Almost every surprise in this lesson, from `null` receivers to hiding to two `Employee` counters, follows from one of those three.",
            "Static state is global state: shared by every thread, alive as long as its class, and invisible in method signatures. I keep `static` for constants, pure functions, factories and immutable helpers, and give everything else to objects.",
            "The next lesson, Encapsulation, is about doing that well: keeping an object's state private, deciding exactly how it may change, and making objects immutable where possible, which is also what makes them safe to share.",
          ],
        },
      ],
    },
  ],
};
