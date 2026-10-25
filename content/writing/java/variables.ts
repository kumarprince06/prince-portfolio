import type { Lesson } from "../types";

export const variables: Lesson = {
  slug: "variables",
  date: "2026-09-20",
  title: "Variables",
  description:
    "What a Java variable really is: the kinds of variables, where each one lives in the JVM, how `javac` turns locals into numbered slots, definite assignment, scope versus lifetime, `var`, and why locals are thread-safe while fields are not.",
  tags: ["Core Java", "Variables", "JVM", "Bytecode"],
  sections: [
    {
      title: "What a Variable Is",
      blocks: [
        {
          type: "paragraph",
          text: "Everything so far was about the machinery around my code: how it compiles, how classes get loaded, how the JVM runs them. This lesson starts on the language itself, and the first building block is the variable.",
        },
        {
          type: "paragraph",
          text: "A **variable** is a named storage location with a fixed type. The name lets me refer to it, the type limits what can go in it, and the value is whatever it holds right now. Without variables a program could only work with hardcoded values. It couldn't remember a user's input, keep a running total, or hold the result of one calculation for the next line.",
        },
        {
          type: "paragraph",
          text: "The reason I wanted to go deeper than the textbook definition: the memory diagrams from the JVM lesson (stack frames, heap, Metaspace) were abstract boxes until now. Variables are what actually sit in those boxes. Once I know which kind of variable lives where, a lot of later topics follow directly: why local variables are thread-safe, why a field in a Spring singleton isn't, why a deep recursion overflows the stack, and why the compiler forces me to assign a local before reading it but never complains about a field.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "list",
          items: [
            "The idea of a named variable is much older than Java. **FORTRAN** (1957) let programmers name memory locations instead of using raw addresses, and even typed them implicitly by first letter: names starting with `I` to `N` were integers, everything else was real. **C** (1972) made the declaration explicit, `int count;`, and a variable there is essentially a named piece of memory you can take the address of.",
            "Java (1.0 shipped in January 1996) deliberately copied C's declaration syntax, `type name = value;`, so the large C and C++ crowd of the 1990s would feel at home.",
            "What Java changed is the safety around it. There are no pointers to variables and no address arithmetic. Fields and array elements always start at a default value instead of whatever garbage was in memory. Local variables have to be **definitely assigned** before they're read, and the compiler proves it. Types are checked strictly at compile time, during `javac`'s attribution phase I looked at in the Compilation Process lesson.",
            "The syntax kept evolving. Java 8 added **effectively final** locals, so lambdas can capture a variable without it being declared `final`. Java 9 made a single `_` a keyword. Java 10 added `var` for local type inference (JEP 286). Java 21 previewed **unnamed variables** written as `_` (JEP 443), and Java 22 made them final (JEP 456).",
          ],
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a variable as a labelled box on a warehouse shelf.",
        },
        {
          type: "list",
          items: [
            "The **label** (`age`, `userName`) is the variable's name, how I refer to it.",
            "The **kind of box** is the type. A box built for an `int` takes an `int` and nothing else, and the box can't be swapped for a different kind later.",
            "The **contents** (`25`) are the value. I can open the box and swap them at any time, unless the box is sealed with `final`.",
            "The **shelf position** is the actual memory location. In C I could ask for it with `&`. In Java I never see it. The JVM and `javac` decide where it goes.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks is objects. A variable of type `List<String>` doesn't hold a list. It holds a **reference** to a list that lives somewhere else, on the heap. Two variables can hold references to the same list, so it's more like two boxes each containing the same warehouse ticket. Copying a variable copies the ticket, not the goods. I show that with real output in the next section, because it's the source of a lot of confused bugs.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Declaration, initialization, assignment",
        },
        {
          type: "code",
          language: "java",
          code: `int age;        // declaration: name + type, no value yet
age = 25;       // first assignment, also called initialization
int total = 0;  // declaration and initialization in one statement
total = 40;     // assignment: same variable, new value`,
        },
        {
          type: "list",
          items: [
            "The **type** is fixed at the declaration and can never change. That is what \"statically typed\" means in practice.",
            "The **name** is an identifier that follows Java's naming rules, which I cover in the syntax section.",
            "The **value** is optional at the declaration for a local, but the local has to be assigned before anything reads it.",
          ],
        },
        {
          type: "heading",
          text: "The kinds of variables",
        },
        {
          type: "paragraph",
          text: "Most notes talk about three categories. The JLS (§4.12.3) actually lists eight kinds of variables, and it's worth knowing they exist, because method parameters and array elements behave like one of the main three:",
        },
        {
          type: "table",
          headers: ["Kind", "Declared", "How many copies", "Default value?"],
          rows: [
            ["Local variable", "inside a method, constructor or block", "one per call, per thread", "No, must be assigned"],
            ["Method, constructor, lambda parameter", "in the parameter list", "one per call", "No, the caller supplies it"],
            ["Exception parameter", "`catch (IOException e)`", "one per caught exception", "No, the thrown exception"],
            ["Instance variable (field)", "in a class, without `static`", "one per object", "Yes: `0`, `false`, `null`"],
            ["Class variable (static field)", "in a class, with `static`", "one per class (per class loader)", "Yes: `0`, `false`, `null`"],
            ["Array component", "`new int[3]`", "one per element", "Yes: `0`, `false`, `null`"],
          ],
        },
        {
          type: "paragraph",
          text: "Parameters are really locals that arrive already assigned, and they sit in the same slots as locals (more on slots below). Array components behave like fields: they live inside an object on the heap and start at defaults. So the three-way split of local, instance and static is still the useful mental model, as long as I remember parameters go with locals.",
        },
        {
          type: "heading",
          text: "Where each one lives",
        },
        {
          type: "table",
          headers: ["Kind", "Where (HotSpot)", "Lives until"],
          rows: [
            ["Local / parameter", "a slot in the current method's stack frame, on the thread's own JVM stack", "the method returns (the name stops being usable at the end of its block)"],
            ["Instance variable", "inside the object, on the heap", "the object becomes unreachable and is collected"],
            ["Static variable", "inside the class's `java.lang.Class` object, on the heap", "the class is unloaded, which for normal app classes means the JVM exits"],
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Static variables are not in Metaspace",
          text: "My old notes put static variables in the Method Area/Metaspace. In HotSpot they've been stored inside the class's `Class` object on the heap since JDK 7, before PermGen was even removed in 8. Metaspace holds the class **metadata**: the field layout says a static `int` called `totalDogsCreated` exists, but its value lives in the heap mirror. The \"one shared copy\" part of the notes is still exactly right.",
        },
        {
          type: "heading",
          text: "Default values, and who gives them",
        },
        {
          type: "paragraph",
          text: "Fields and array elements are never uninitialized. They start at zero for their type: `0` for numbers, `0.0` for floating point, `'\\u0000'` for `char`, `false` for `boolean`, `null` for references. I printed all of them:",
        },
        {
          type: "code",
          language: "java",
          title: "Defaults.java",
          code: `public class Defaults {
    static int requestCount;
    static boolean ready;
    static String region;

    int retries;
    double rate;
    char grade;
    Object owner;

    public static void main(String[] args) {
        System.out.println("static:   " + requestCount + " " + ready + " " + region);
        Defaults d = new Defaults();
        System.out.println("instance: " + d.retries + " " + d.rate + " "
            + (int) d.grade + " " + d.owner);
        int[] slots = new int[3];
        System.out.println("array:    " + slots[0] + slots[1] + slots[2]);
    }
}`,
        },
        {
          type: "output",
          text: `static:   0 false null
instance: 0 0.0 0 null
array:    000`,
        },
        {
          type: "paragraph",
          text: "The defaults come from two different places, though. Static fields get them during the **preparation** step of linking, which I covered in the Class Loading lesson. Instance fields and array elements get them when the object is allocated: the `new` instruction hands back memory that's already zeroed, before any constructor runs.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Instance defaults don't come from preparation",
          text: "My notes said both instance and static variables get their defaults during Preparation. Only static fields do. Preparation happens once per class, before any object exists. Instance fields are zeroed as part of each object's allocation.",
        },
        {
          type: "heading",
          text: "Scope versus lifetime",
        },
        {
          type: "paragraph",
          text: "These two get mixed up a lot. **Scope** is a compile-time idea: the region of source code where a name can be used. For a local that's from its declaration to the end of the enclosing block `{ }`. **Lifetime** is a runtime idea: how long the storage exists. A local's slot exists for the whole time its method's frame is on the stack. A field lives as long as its object, a static field as long as its class. A variable can be out of scope while its storage still exists, and that matters in the internal-working section.",
        },
        {
          type: "heading",
          text: "Primitive variables hold values, reference variables hold references",
        },
        {
          type: "code",
          language: "java",
          title: "RefDemo.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class RefDemo {
    public static void main(String[] args) {
        int a = 5;
        int b = a;          // copies the value 5
        b = 99;
        System.out.println("a = " + a + ", b = " + b);

        List<String> first = new ArrayList<>();
        List<String> second = first;     // copies the reference, not the list
        second.add("order-1");
        System.out.println("first = " + first + ", same object? " + (first == second));

        second = new ArrayList<>();      // repoint second only
        second.add("order-2");
        System.out.println("first = " + first + ", second = " + second);
    }
}`,
        },
        {
          type: "output",
          text: `a = 5, b = 99
first = [order-1], same object? true
first = [order-1], second = [order-2]`,
        },
        {
          type: "paragraph",
          text: "Changing `b` didn't touch `a`, because each holds its own `5`. Adding through `second` showed up in `first`, because both held a reference to the same list. Reassigning `second` only changed what `second` points to. The Data Types lesson goes deeper into primitives versus references, but this is the rule I keep in my head: **a variable never contains an object.**",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The interesting part of variables is what `javac` and the JVM do with them, and the three kinds get very different treatment. Locals lose their names entirely and become numbered slots. Fields keep their names and are reached through the constant pool.",
        },
        {
          type: "heading",
          text: "Locals become numbered slots",
        },
        {
          type: "paragraph",
          text: "Every stack frame has a **local variable array** (JVMS §2.6.1). Its size, `max_locals`, is computed by `javac` and written into the method's `Code` attribute. In a static method, parameters fill the first slots starting at 0. In an instance method, slot 0 is `this`. Then `javac` hands out slots to locals in the order they're declared. The JVM never sees a variable name. I compiled this with `-g` so `javap` would show the debug table that maps slots back to names:",
        },
        {
          type: "code",
          language: "java",
          title: "Slots.java",
          code: `public class Slots {
    public static void main(String[] args) {
        int x = 5;
        int y = 10;
        int big = 1000;
        long total = x + y;
        int later;
        later = 7;
        System.out.println(total + big + later);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -g Slots.java
javap -c -l Slots`,
        },
        {
          type: "output",
          text: `  public static void main(java.lang.String[]);
    Code:
       0: iconst_5
       1: istore_1
       2: bipush        10
       4: istore_2
       5: sipush        1000
       8: istore_3
       9: iload_1
      10: iload_2
      11: iadd
      12: i2l
      13: lstore        4
      15: bipush        7
      17: istore        6
      19: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
      22: lload         4
      ...
    LineNumberTable:
      line 3: 0
      line 4: 2
      line 5: 5
      line 6: 9
      line 8: 15
      line 9: 19
      line 10: 34
    LocalVariableTable:
      Start  Length  Slot  Name   Signature
          0      35     0  args   [Ljava/lang/String;
          2      33     1     x   I
          5      30     2     y   I
          9      26     3   big   I
         15      20     4 total   J
         19      16     6 later   I`,
        },
        {
          type: "paragraph",
          text: "The program printed `1022`. What I read from the bytecode:",
        },
        {
          type: "list",
          items: [
            "`int x = 5;` is exactly two instructions: `iconst_5` pushes 5 onto the operand stack, `istore_1` pops it into slot 1. Slot 0 is `args`.",
            "How the constant gets pushed depends on its size: `iconst_5` for -1 to 5, `bipush` for a byte-sized value like 10, `sipush` for 1000, and `ldc` from the constant pool for anything bigger.",
            "`total` is a `long`, so it takes **two** slots, 4 and 5. That's why `later` lands in slot 6. `long` and `double` always take two slots; everything else, including references, takes one.",
            "`int later;` produced **no bytecode at all**. There's no line 7 in the `LineNumberTable`. A declaration without a value doesn't do anything at runtime. The slot was already part of the frame.",
            "`javap -v` reports `locals=7` for `main`: slots 0 to 6. The frame is created with all seven slots when `main` is entered.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "The slot array isn't an Object[]",
          text: "My notes modelled the frame as `Object[] localVariableSlots`, with a slot reserved each time a declaration runs. Both parts are off. Slots are untyped 32-bit cells; the verifier tracks what type each one holds at each instruction, and the instruction itself says how to read it (`iload`, `lload`, `aload`). And slots aren't reserved at runtime one by one: the whole array is sized from `max_locals` when the frame is pushed, and `javac` picked every index at compile time.",
        },
        {
          type: "heading",
          text: "Block scope is a compiler idea, slots get reused",
        },
        {
          type: "code",
          language: "java",
          title: "Scope.java",
          code: `public class Scope {
    public static void main(String[] args) {
        int counter = 0;
        if (args.length == 0) {
            int bonus = 5;
            counter += bonus;
        }
        int penalty = 2;
        counter -= penalty;
        System.out.println(counter);
    }
}`,
        },
        {
          type: "output",
          text: `    LocalVariableTable:
      Start  Length  Slot  Name   Signature
          9       4     2 bonus   I
          0      27     0  args   [Ljava/lang/String;
          2      25     1 counter   I
         15      12     2 penalty   I`,
        },
        {
          type: "paragraph",
          text: "`bonus` and `penalty` share **slot 2**. Once the `if` block closes, `bonus` is out of scope, so `javac` reuses its slot for `penalty`, and `main` needs only `locals=3` instead of 4. There's no separate frame for the `if` block. It's one frame for the whole method, and \"you can't use `bonus` after the brace\" is purely a compile-time rule. It printed `3`.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "A block doesn't get its own stack frame",
          text: "My notes explained \"a variable declared in an `if` block can't be used outside it\" with the stack frame. That's not quite it. Frames exist per method call, not per block. The `if` block's variable has a slot in the same frame, and that slot can even still hold the old value. The compiler just refuses to resolve the name outside the block, and is free to reuse the slot.",
        },
        {
          type: "heading",
          text: "Constant locals don't even get a slot",
        },
        {
          type: "code",
          language: "java",
          title: "FinalLocal.java",
          code: `public class FinalLocal {
    public static void main(String[] args) {
        final int limit = 3;
        int attempts = 2;
        System.out.println(attempts < limit);
    }
}`,
        },
        {
          type: "output",
          text: `  public static void main(java.lang.String[]);
    Code:
       0: iconst_2
       1: istore_1
       2: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
       5: iload_1
       6: iconst_3
       7: if_icmpge     14
      ...`,
        },
        {
          type: "paragraph",
          text: "`attempts` took slot 1. `limit` took nothing: a `final` local initialized with a compile-time constant is a **constant variable** (JLS §4.12.4), and `javac` replaced every use with `iconst_3`. Same idea as the inlined `static final` constant in the Class Loading lesson.",
        },
        {
          type: "heading",
          text: "Locals, fields and statics at the bytecode level",
        },
        {
          type: "paragraph",
          text: "To compare the three kinds side by side, I incremented one of each in a single method:",
        },
        {
          type: "code",
          language: "java",
          title: "Access.java",
          code: `public class Access {
    static int hits;     // static field
    int balance;         // instance field

    void touch() {
        int local = 1;
        local++;
        balance++;
        hits++;
    }
}`,
        },
        {
          type: "output",
          text: `  void touch();
    Code:
       0: iconst_1
       1: istore_1
       2: iinc          1, 1
       5: aload_0
       6: dup
       7: getfield      #7                  // Field balance:I
      10: iconst_1
      11: iadd
      12: putfield      #7                  // Field balance:I
      15: getstatic     #13                 // Field hits:I
      18: iconst_1
      19: iadd
      20: putstatic     #13                 // Field hits:I
      23: return`,
        },
        {
          type: "list",
          items: [
            "**Local:** `local` is slot 1 (slot 0 is `this`), and `local++` is a single `iinc 1, 1` that bumps the slot in place. No name, no lookup.",
            "**Instance field:** `aload_0` loads `this`, then `getfield #7` reads the field at a fixed offset inside that object, then `putfield` writes it back. One extra hop: through the reference, to the heap.",
            "**Static field:** `getstatic #13` and `putstatic #13`. No object needed. The first time this instruction runs, the JVM resolves `#13` to the field inside `Access`'s `Class` object, and if `Access` isn't initialized yet, this is the active use that initializes it.",
            "Neither field increment is a single operation. It's read, add, write. That's the root of every lost-update race on a shared field, which I show in the production section.",
          ],
        },
        {
          type: "heading",
          text: "After the JIT",
        },
        {
          type: "paragraph",
          text: "Everything above is the bytecode, which is what the interpreter runs. Once the JIT compiles a hot method, the slot array mostly disappears: C2 keeps locals in CPU registers and only spills to the native stack when it runs out of them. Fields can be kept in registers too, across a loop, as long as the compiler can prove nothing in between can change them (no `volatile`, no synchronization, no call it can't see through). And with **escape analysis**, an object that never leaves the method can be scalar-replaced, so its fields turn into plain locals and the heap allocation never happens. \"Locals on the stack, objects on the heap\" is the model the JVM spec guarantees, not a literal description of compiled code.",
        },
      ],
    },
    {
      title: "The Memory Picture",
      blocks: [
        {
          type: "paragraph",
          text: "To put real data in the JVM lesson's memory diagram, I used a small `Dog` class with one of each kind of variable:",
        },
        {
          type: "code",
          language: "java",
          title: "Dog.java",
          code: `public class Dog {
    static int totalDogsCreated;     // class variable: one copy
    String name;                     // instance variable: one per object

    Dog(String name) {               // name here is a constructor parameter
        this.name = name;
        totalDogsCreated++;
    }

    String describe() {
        String label = name + " (dog " + totalDogsCreated + ")";  // local
        return label;
    }

    public static void main(String[] args) {
        Dog rex = new Dog("Rex");
        Dog max = new Dog("Max");
        System.out.println(rex.describe());
        System.out.println(max.describe());
        System.out.println("rex.name = " + rex.name + ", max.name = " + max.name);
        System.out.println("Dog.totalDogsCreated = " + Dog.totalDogsCreated);
    }
}`,
        },
        {
          type: "output",
          text: `Rex (dog 2)
Max (dog 2)
rex.name = Rex, max.name = Max
Dog.totalDogsCreated = 2`,
        },
        {
          type: "paragraph",
          text: "Two objects, two different `name` values, one `totalDogsCreated` that both see as `2`. Here is the memory at the moment `rex.describe()` is running (the `locals` numbers are from `javap -v`):",
        },
        {
          type: "diagram",
          text: `JVM STACK  (thread "main", grows downward here)
┌──────────────────────────────────────────────┐
│ frame: Dog.main            locals = 3        │
│   slot 0  args  ──► String[0]   (heap)       │
│   slot 1  rex   ──► Dog #1      (heap)       │
│   slot 2  max   ──► Dog #2      (heap)       │
├──────────────────────────────────────────────┤
│ frame: Dog.describe        locals = 2        │
│   slot 0  this  ──► Dog #1                   │
│   slot 1  label ──► "Rex (dog 2)"            │
│   operand stack: scratch for each instr.     │
└──────────────────────────────────────────────┘
  describe's frame is popped when it returns

HEAP
┌──────────────────────────────────────────────┐
│ Dog #1    name ──► "Rex"                     │
│ Dog #2    name ──► "Max"                     │
│ Class object for Dog                         │
│   static totalDogsCreated = 2   (one copy)   │
└──────────────────────────────────────────────┘

METASPACE  (native memory)
┌──────────────────────────────────────────────┐
│ Dog metadata: field layout, methods,         │
│ bytecode, constant pool. No field values.    │
└──────────────────────────────────────────────┘`,
          caption:
            "Slots hold primitives or references. Objects, including the strings, are always on the heap (unless the JIT eliminates them).",
        },
        {
          type: "paragraph",
          text: "The constructor's bytecode shows the instance and static writes going to different places:",
        },
        {
          type: "output",
          text: `  Dog(java.lang.String);
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: aload_0
       5: aload_1
       6: putfield      #7                  // Field name:Ljava/lang/String;
       9: getstatic     #13                 // Field totalDogsCreated:I
      12: iconst_1
      13: iadd
      14: putstatic     #13                 // Field totalDogsCreated:I
      17: return`,
        },
        {
          type: "paragraph",
          text: "`aload_1` is the constructor parameter `name` from slot 1, and `putfield` copies it into the field of the object in slot 0. Same name in the source, two completely different variables: one dies with the constructor's frame, the other lives as long as the `Dog`.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            "At compile time, `javac` checks every variable's type, checks every local is definitely assigned before it's read, assigns each local a slot index, and records `max_locals` and `max_stack` for each method.",
            "When a method is called, the JVM pushes a new frame onto the calling thread's stack, sized from those two numbers. The arguments are copied into the first slots (after `this` for an instance method). The other slots exist but hold nothing meaningful yet.",
            "An assignment like `x = 5` pushes the value onto the operand stack and stores it into the slot (`iconst_5`, `istore_1`). A declaration without a value does nothing at runtime.",
            "Every later read of `x` in that method is a load from the same slot (`iload_1`). The verifier has already proved it was written first.",
            "Fields are reached differently: `getfield`/`putfield` through an object reference for instance fields, `getstatic`/`putstatic` through the class for statics. The first execution of each such instruction resolves its constant pool entry.",
            "When the method returns, its frame is popped and every local in it is gone. Any objects those locals pointed to stay on the heap until nothing references them, and then the garbage collector can reclaim them.",
            "Instance fields live as long as their object. Static fields live as long as their class, which for classes from the built-in loaders is the life of the JVM.",
          ],
        },
      ],
    },
    {
      title: "Syntax and Naming Rules",
      blocks: [
        {
          type: "heading",
          text: "Declaring variables",
        },
        {
          type: "code",
          language: "java",
          title: "Declarations.java (excerpt)",
          code: `int age;                // declared, not yet assigned
age = 25;               // first assignment
int total = 100;        // declared and initialized
int a, b, c;            // three ints, none assigned
int x = 5, y = 10;      // two ints, each with a value
int p = 1, q, r = 3;    // legal, but q has no value
final int maxRetries = 3;
var count = 0;          // Java 10+: type inferred as int`,
        },
        {
          type: "paragraph",
          text: "I compiled these inside a `main` and printed the assigned ones (`25 100 5 10 1 3 3 0`). The compiler had no problem with `a`, `b`, `c` and `q` never being assigned, because nothing read them. Reading one would be an error.",
        },
        {
          type: "heading",
          text: "Naming rules",
        },
        {
          type: "list",
          items: [
            "The first character must be a \"Java letter\": a Unicode letter, `$`, `_`, or another currency symbol or connecting character (`Character.isJavaIdentifierStart`). After that, digits are allowed too. Never a digit first, or `2fast` would look like the start of a number.",
            "A name can't be one of the reserved keywords (`class`, `int`, `public`, ...) or the literals `true`, `false` and `null`.",
            "A single `_` is not a valid name. It has been a keyword since Java 9. On Java 22+ it declares an **unnamed variable**, one that can't be read (preview in 21).",
            "Contextual keywords like `var`, `record` and `yield` **can** be variable names. They only mean something special in specific positions.",
            "Names are case-sensitive: `age` and `Age` are two different variables.",
            "Convention, not a compiler rule: `camelCase` for variables (`userName`, `totalCount`), `UPPER_SNAKE_CASE` for `static final` constants. `user_name` compiles fine and will get flagged in code review.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "GoodNames.java",
          code: `public class GoodNames {
    public static void main(String[] args) {
        int $price = 499;
        int _retries = 3;
        int café = 2;            // any Unicode letter works
        int var = 10;            // var is a reserved type name, not a keyword
        int record = 1, yield = 2;
        int age = 30, Age = 31;  // two different variables
        System.out.println($price + " " + _retries + " " + café + " " + var
            + " " + record + " " + yield + " " + age + " " + Age);
    }
}`,
        },
        {
          type: "output",
          text: "499 3 2 10 1 2 30 31",
        },
        {
          type: "paragraph",
          text: "All legal, though I wouldn't ship any of the first four. And the illegal ones, compiled with JDK 21's `javac`:",
        },
        {
          type: "code",
          language: "java",
          title: "BadNames.java",
          code: `public class BadNames {
    public static void main(String[] args) {
        int 2fast = 1;
        int class = 2;
        int _ = 3;
    }
}`,
        },
        {
          type: "output",
          text: `BadNames.java:3: error: not a statement
        int 2fast = 1;
        ^
BadNames.java:3: error: ';' expected
        int 2fast = 1;
           ^
BadNames.java:4: error: not a statement
        int class = 2;
        ^
BadNames.java:4: error: ';' expected
        int class = 2;
           ^
BadNames.java:4: error: <identifier> expected
        int class = 2;
                 ^
BadNames.java:5: error: unnamed variables are a preview feature and are disabled by default.
        int _ = 3;
            ^
  (use --enable-preview to enable unnamed variables)
6 errors`,
        },
        {
          type: "paragraph",
          text: "The parser doesn't say \"bad variable name\". It sees `int` followed by something that can't be an identifier and gets confused, so the messages are about statements and semicolons. The `_` message is JDK 21 specific: on JDK 17 the same line says `as of release 9, '_' is a keyword, and may not be used as an identifier`, and on JDK 22+ the line compiles.",
        },
        {
          type: "heading",
          text: "var: inferred, still static",
        },
        {
          type: "paragraph",
          text: "`var` (Java 10) lets the compiler infer a local's type from its initializer. It's only for locals with an initializer, loop variables, try-with-resources and (since Java 11) lambda parameters. Not fields, method parameters or return types. The variable is exactly as statically typed as if I'd written the type. The bytecode proves it:",
        },
        {
          type: "code",
          language: "java",
          title: "VarSame.java",
          code: `import java.util.ArrayList;

public class VarSame {
    public static void main(String[] args) {
        int a = 10;
        var b = 10;
        ArrayList<String> c = new ArrayList<>();
        var d = new ArrayList<String>();
    }
}`,
        },
        {
          type: "output",
          text: `       0: bipush        10
       2: istore_1
       3: bipush        10
       5: istore_2
       6: new           #7                  // class java/util/ArrayList
       9: dup
      10: invokespecial #9                  // Method java/util/ArrayList."<init>":()V
      13: astore_3
      14: new           #7                  // class java/util/ArrayList
      17: dup
      18: invokespecial #9                  // Method java/util/ArrayList."<init>":()V
      21: astore        4
      23: return`,
        },
        {
          type: "paragraph",
          text: "`a` and `b` compile identically, and so do `c` and `d`. `var` exists only in the source. The type is still locked once it's inferred:",
        },
        {
          type: "code",
          language: "java",
          title: "VarBad.java",
          code: `public class VarBad {
    public static void main(String[] args) {
        var count = 10;
        count = "ten";
        var nothing;
        var empty = null;
    }
}`,
        },
        {
          type: "output",
          text: `VarBad.java:4: error: incompatible types: String cannot be converted to int
        count = "ten";
                ^
VarBad.java:5: error: cannot infer type for local variable nothing
        var nothing;
            ^
  (cannot use 'var' on variable without initializer)
VarBad.java:6: error: cannot infer type for local variable empty
        var empty = null;
            ^
  (variable initializer is 'null')
3 errors`,
        },
        {
          type: "heading",
          text: "Unnamed variables",
        },
        {
          type: "paragraph",
          text: "Sometimes a variable has to exist syntactically but I never read it: a loop that only counts, or a `catch` that doesn't need the exception. Java 22 lets me write `_` there. On JDK 21 it needs `--enable-preview`:",
        },
        {
          type: "code",
          language: "java",
          title: "Unnamed.java",
          code: `import java.util.List;

public class Unnamed {
    public static void main(String[] args) {
        int rows = 0;
        for (var _ : List.of("a", "b", "c")) {
            rows++;
        }
        try {
            Integer.parseInt("abc");
        } catch (NumberFormatException _) {
            System.out.println("not a number");
        }
        System.out.println("rows = " + rows);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 21 --enable-preview Unnamed.java
java --enable-preview Unnamed`,
        },
        {
          type: "output",
          text: `not a number
rows = 3`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "The basics",
        },
        {
          type: "code",
          language: "java",
          title: "VariableBasics.java",
          code: `public class VariableBasics {
    public static void main(String[] args) {
        int age = 26;
        String name = "Prince";
        System.out.println(name + " is " + age + " years old.");
    }
}`,
        },
        {
          type: "output",
          text: "Prince is 26 years old.",
        },
        {
          type: "paragraph",
          text: "`age` holds the value `26` directly in slot 1. `name` holds a reference in slot 2 to a `String` object that came from the class's constant pool.",
        },
        {
          type: "heading",
          text: "Reassignment",
        },
        {
          type: "code",
          language: "java",
          title: "VariableReassignment.java",
          code: `public class VariableReassignment {
    public static void main(String[] args) {
        int score = 0;
        System.out.println("Initial score: " + score);

        score = 10;             // same variable, new value
        System.out.println("After round 1: " + score);

        score = score + 15;     // read, add, write back
        System.out.println("After round 2: " + score);
    }
}`,
        },
        {
          type: "output",
          text: `Initial score: 0
After round 1: 10
After round 2: 25`,
        },
        {
          type: "paragraph",
          text: "Every assignment overwrites the same slot. No new variable is created. `score = score + 15` reads the slot onto the operand stack, adds, and stores the result back into the same slot.",
        },
        {
          type: "heading",
          text: "Definite assignment through branches",
        },
        {
          type: "paragraph",
          text: "The compiler doesn't need the value at the declaration. It needs to prove every path assigns before the read. That's why the declare-now, assign-in-branches pattern works, and it even works with `final`:",
        },
        {
          type: "code",
          language: "java",
          title: "Definite2.java",
          code: `public class Definite2 {
    public static void main(String[] args) {
        final String env;
        if (args.length > 0) {
            env = args[0];
        } else {
            env = "dev";
        }
        System.out.println("env = " + env);

        int n;
        if (true) {
            n = 1;
        }
        System.out.println("n = " + n);   // compiles: the constant true counts
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java Definite2
java Definite2 prod`,
        },
        {
          type: "output",
          text: `env = dev
n = 1
env = prod
n = 1`,
        },
        {
          type: "paragraph",
          text: "`final` means assigned exactly once, not assigned at the declaration. The `if (true)` case surprised me: the definite-assignment rules (JLS chapter 16) treat a constant `true` condition specially, so `javac` knows the branch always runs. With a non-constant condition the same code is an error, as the next section shows.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Reading a local before assigning it",
        },
        {
          type: "paragraph",
          text: "Locals have no default value. Unlike fields, the compiler rejects any read it can't prove comes after an assignment:",
        },
        {
          type: "code",
          language: "java",
          title: "Uninit.java",
          code: `public class Uninit {
    public static void main(String[] args) {
        int x;
        System.out.println(x);
    }
}`,
        },
        {
          type: "output",
          text: `Uninit.java:4: error: variable x might not have been initialized
        System.out.println(x);
                           ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The realistic version is an assignment on only some paths:",
        },
        {
          type: "code",
          language: "java",
          title: "Definite.java (excerpt)",
          code: `static String broken(int code) {
    String result;
    if (code >= 500) {
        result = "server error";
    }
    return result;              // not assigned when code < 500
}`,
        },
        {
          type: "output",
          text: `Definite.java:17: error: variable result might not have been initialized
        return result;              // not assigned when code < 500
               ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The fix is an `else` branch, or initializing at the declaration. I'd avoid \"fixing\" it with `String result = null;` just to silence the compiler, because that turns a compile error into a possible `NullPointerException` later.",
        },
        {
          type: "heading",
          text: "Confusing declaration with initialization",
        },
        {
          type: "paragraph",
          text: "`int x;` declares, `x = 5;` assigns. They can be on one line or many lines apart. As the `Slots` bytecode showed, only the assignment does anything at runtime.",
        },
        {
          type: "heading",
          text: "Trying to change a variable's type",
        },
        {
          type: "code",
          language: "java",
          title: "TypeLocked.java",
          code: `public class TypeLocked {
    public static void main(String[] args) {
        int x = 5;
        x = "hello";
    }
}`,
        },
        {
          type: "output",
          text: `TypeLocked.java:4: error: incompatible types: String cannot be converted to int
        x = "hello";
            ^
1 error`,
        },
        {
          type: "paragraph",
          text: "This comes from `javac`'s attribution phase, the type-checking pass from the Compilation Process lesson. The same thing happens with `var`, since the inferred type is just as fixed.",
        },
        {
          type: "heading",
          text: "Using a variable outside its block",
        },
        {
          type: "code",
          language: "java",
          title: "VariableScopeDemo.java (first try)",
          code: `public class VariableScopeDemo {
    public static void main(String[] args) {
        int counter = 0;
        if (true) {
            int insideIf = 42;
            System.out.println("inside: " + insideIf);
        }
        System.out.println(insideIf);
    }
}`,
        },
        {
          type: "output",
          text: `VariableScopeDemo.java:8: error: cannot find symbol
        System.out.println(insideIf);
                           ^
  symbol:   variable insideIf
  location: class VariableScopeDemo
1 error`,
        },
        {
          type: "paragraph",
          text: "\"cannot find symbol\": by line 8 the name simply doesn't exist any more. If the value is needed after the block, the variable has to be declared before it.",
        },
        {
          type: "heading",
          text: "Redeclaring a name in a nested block",
        },
        {
          type: "code",
          language: "java",
          title: "NoRedeclare.java",
          code: `public class NoRedeclare {
    public static void main(String[] args) {
        int count = 1;
        if (count > 0) {
            int count = 2;
        }
    }
}`,
        },
        {
          type: "output",
          text: `NoRedeclare.java:5: error: variable count is already defined in method main(String[])
            int count = 2;
                ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Java, unlike C, doesn't let an inner block's local hide an outer local of the same method. A local **can** hide a field, though, which leads to the next mistake.",
        },
        {
          type: "heading",
          text: "Shadowing a field and assigning to yourself",
        },
        {
          type: "code",
          language: "java",
          title: "Shadowing.java",
          code: `public class Shadowing {
    String status = "field";

    void bug(String status) {
        status = status;            // assigns the parameter to itself
    }

    void fix(String status) {
        this.status = status;       // field = parameter
    }

    void show() {
        String status = "local";
        System.out.println(status + " / " + this.status);
    }

    public static void main(String[] args) {
        Shadowing s = new Shadowing();
        s.bug("ACTIVE");
        System.out.println("after bug: " + s.status);
        s.fix("ACTIVE");
        System.out.println("after fix: " + s.status);
        s.show();
    }
}`,
        },
        {
          type: "output",
          text: `after bug: field
after fix: ACTIVE
local / ACTIVE`,
        },
        {
          type: "paragraph",
          text: "Inside `bug`, `status` means the parameter, because the innermost declaration wins. `javap -c` shows exactly what that line does: `aload_1`, `astore_1`. Slot 1 copied to slot 1. The field is never touched. It compiles without a warning, and an IDE inspection is usually what catches it.",
        },
        {
          type: "heading",
          text: "Modifying a local inside a lambda",
        },
        {
          type: "code",
          language: "java",
          title: "Capture.java",
          code: `import java.util.List;

public class Capture {
    public static void main(String[] args) {
        int total = 0;
        List.of(1, 2, 3).forEach(n -> total += n);
    }
}`,
        },
        {
          type: "output",
          text: `Capture.java:6: error: local variables referenced from a lambda expression must be final or effectively final
        List.of(1, 2, 3).forEach(n -> total += n);
                                      ^
1 error`,
        },
        {
          type: "paragraph",
          text: "A lambda gets a **copy** of each captured local's value, not access to the slot. The lambda might run later or on another thread, after the frame is gone. So Java only allows capturing locals that never change after assignment. The usual fix is to not mutate at all: `List.of(1, 2, 3).stream().mapToInt(Integer::intValue).sum()`.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Declare a local as close as possible to its first use, and in the smallest block that needs it. Short scopes are easier to read, and `javac` can reuse the slot afterwards.",
            "Initialize at the declaration whenever the value is known. When it depends on branches, declare it without a value (ideally `final`) and let definite assignment check every branch, instead of a dummy `= null` or `= 0`.",
            "Use descriptive names (`retryCount`, not `rc`). Short names are fine for tiny scopes where the meaning is universal, like `i` in a loop or `e` in a `catch`.",
            "Make locals and fields `final` when they don't change. For fields especially, `final` documents intent and gives safe publication guarantees under the Java Memory Model, which is why constructor-injected Spring dependencies are usually `private final`.",
            "Use `var` when the type is obvious from the right-hand side (`var orders = new ArrayList<Order>();`). Write the type when it isn't (`var result = service.process(request);` hides what `result` is).",
            "Keep mutable state out of `static` fields. A static field is one copy for the whole JVM, shared by every thread and every request.",
            "Use `this.field = field` in constructors and setters, and turn on the IDE inspection for self-assignment.",
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
            "In the interpreter, a local read is one instruction on a slot index (`iload_1`), while an instance field read is `aload_0` plus `getfield`, through the reference to an offset in the heap object. A static read is a `getstatic` on the class. Locals are the cheapest.",
            "After JIT compilation the gap mostly closes. Locals live in registers, and C2 can keep a field in a register across a loop when nothing in between can change it. Where it can't (a `volatile` field, a call it can't inline, a lock), each access is a real memory load. Copying a field into a local before a hot loop is occasionally worth it, but I'd measure with JMH before doing it by hand.",
            "Locals cost no garbage collection work. The frame is popped and it's gone. Objects that locals point to are a different story, unless escape analysis removes the allocation.",
            "Frame size depends on `max_locals` and `max_stack`, and the thread's stack has a fixed size (`-Xss`, 1 MB by default on 64-bit Linux; `ThreadStackSize = 1024` on my JDK). Bigger frames means fewer of them fit before `StackOverflowError`.",
          ],
        },
        {
          type: "paragraph",
          text: "I tested that last point with one recursive method using a single `int` slot and one using twenty-two slots:",
        },
        {
          type: "code",
          language: "java",
          title: "FrameSize.java",
          code: `public class FrameSize {
    static int depth;

    static void lean(int n) {
        depth++;
        lean(n + 1);
    }

    static void heavy(long n) {
        long a = n + 1, b = a + 1, c = b + 1, d = c + 1, e = d + 1;
        long f = e + 1, g = f + 1, h = g + 1, i = h + 1, j = i + 1;
        depth++;
        heavy(a + b + c + d + e + f + g + h + i + j);
    }

    public static void main(String[] args) {
        try { lean(0); } catch (StackOverflowError err) {
            System.out.println("lean frames:  " + depth);
        }
        depth = 0;
        try { heavy(0); } catch (StackOverflowError err) {
            System.out.println("heavy frames: " + depth);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java FrameSize
java -Xint FrameSize`,
        },
        {
          type: "output",
          text: `lean frames:  22084
heavy frames: 10240
lean frames:  9838
heavy frames: 3577`,
        },
        {
          type: "paragraph",
          text: "`javap -v` reports `locals=1` for `lean` and `locals=22` for `heavy` (eleven `long`s at two slots each). With the default mixed mode the heavy version got about half as deep, and the numbers moved by a few hundred between runs (I also saw 21845/9695 and 22231/9902), because some frames are interpreted and some JIT-compiled, and compiled frames have a different size. With `-Xint`, everything interpreted, the ratio was close to 3 to 1. In real code this only matters for deep recursion. A normal Spring request is a few hundred frames deep and nowhere near the limit.",
        },
      ],
    },
    {
      title: "Variables in Production",
      blocks: [
        {
          type: "list",
          items: [
            "Every method parameter, intermediate result and loop counter in a Spring controller or service is a local, in the frame of the thread handling that request. Each request thread has its own stack, so two concurrent requests never share a local.",
            "Spring beans are singletons by default: **one** object shared by every request thread. Its fields are therefore shared mutable state. That's why services keep only `private final` dependencies as fields and put per-request data in locals and parameters.",
            "A `static` mutable field is even more shared: one copy per class loader, across all threads and all objects. Counters, caches and \"current user\" holders as plain statics are a classic source of race conditions. The thread-safe tools are `AtomicLong`/`LongAdder`, `ConcurrentHashMap`, or `ThreadLocal` for genuinely per-thread state (which is how Spring's `SecurityContextHolder` and transaction synchronization work by default).",
            "Local means the **variable** is thread-confined, not the object. A local that refers to a shared object, like a field's `List` or a cached entity, gives no protection at all.",
            "`static final` constants (`private static final int MAX_RETRIES = 3;`) and `private static final Logger log = ...` are the normal, safe use of statics: shared, but never reassigned.",
          ],
        },
        {
          type: "paragraph",
          text: "To see the difference, I ran the same counting method on two threads. Each call counts a million in a local and also bumps a shared static:",
        },
        {
          type: "code",
          language: "java",
          title: "Counters.java",
          code: `public class Counters {
    static int sharedHits = 0;           // one copy for every thread

    static int countLocally() {
        int count = 0;                   // one copy per call, per thread
        for (int i = 0; i < 1_000_000; i++) {
            count++;
            sharedHits++;
        }
        return count;
    }

    public static void main(String[] args) throws InterruptedException {
        int[] results = new int[2];
        Thread t1 = new Thread(() -> results[0] = countLocally());
        Thread t2 = new Thread(() -> results[1] = countLocally());
        t1.start(); t2.start();
        t1.join(); t2.join();
        System.out.println("t1 local count: " + results[0]);
        System.out.println("t2 local count: " + results[1]);
        System.out.println("shared static:  " + sharedHits + " (expected 2000000)");
    }
}`,
        },
        {
          type: "output",
          text: `t1 local count: 1000000
t2 local count: 1000000
shared static:  1111058 (expected 2000000)`,
        },
        {
          type: "paragraph",
          text: "The locals were right every time. The static lost almost half its updates, and a different amount each run (I got `1062701` and `1026604` on the next two). `sharedHits++` is the `getstatic`, `iadd`, `putstatic` sequence from the `Access` bytecode, and two threads interleaving those three steps overwrite each other's work. Swapping the field for an `AtomicInteger` and calling `incrementAndGet()` fixes it. The `results` array is also worth a look: the lambda can't assign to a captured local, but it can write into an array element on the heap, and `join()` makes those writes visible to `main`.",
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
              question: "What is a variable?",
              answer:
                "A named storage location with a fixed type that holds a value the program can read and change. The name is for me, the type limits what can go in, and the value is whatever's in it right now.\n\nI'd add where it lives, because that's what makes the answer stronger: a local is a slot in the method's stack frame, an instance variable is inside an object on the heap, and a static variable is one copy that belongs to the class. When I ran `javap` on a small method, the local names were gone entirely, just slot numbers like `istore_1`.",
            },
            {
              question: "What are the three components of a variable declaration?",
              answer:
                "Type, name and an optional initial value: `int age = 25;`. The type is fixed from that moment, the name has to be a legal identifier, and the value can come later for a local, as long as it's assigned before it's read.\n\nWith `var` the type is still there, just inferred from the initializer. `var b = 10;` compiled to exactly the same `bipush 10`, `istore` as `int a = 10;` when I compared them with `javap`.",
            },
            {
              question: "Name the three categories of variables in Java.",
              answer:
                "Local variables, declared inside a method or block. Instance variables, non-static fields, one copy per object. Static (class) variables, one copy per class.\n\nThe JLS actually lists eight kinds, adding method, constructor and lambda parameters, exception parameters and array components. But parameters behave like locals and array elements behave like fields, so the three-way split is the useful model.",
            },
            {
              question: "Can a local variable's type change after declaration?",
              answer:
                "No. The type is fixed at the declaration, that's what static typing means. Assigning a value of an incompatible type is a compile error.\n\nWhen I tried `int x = 5; x = \"hello\";`, `javac` said `incompatible types: String cannot be converted to int`. Same with `var count = 10; count = \"ten\";`, because `var` infers `int` once and that's it.",
            },
            {
              question: "What happens if you try to use a local variable before assigning it a value?",
              answer:
                "It doesn't compile. Locals have no default value, and the compiler has to prove every path assigns them before they're read.\n\nThe error is `variable x might not have been initialized`. The case that bites in real code is an assignment inside an `if` with no `else`. I got exactly that error on a `return result;` where `result` was only set when `code >= 500`.",
            },
            {
              question: "Is Java case-sensitive for variable names?",
              answer:
                "Yes. `age` and `Age` are two different variables.\n\nI declared both in the same method with different values and printed `30 31`. It's legal, but it's a terrible idea to do on purpose. Convention keeps it from happening anyway: variables are `camelCase`, classes are `PascalCase`.",
            },
            {
              question: "Can a variable name start with a digit?",
              answer:
                "No. It has to start with a letter, `$`, `_` or another currency or connecting character. Digits are allowed after the first character, like `order2`.\n\nThe reason is the parser: `2fast` looks like the start of a number. The compiler error isn't even about names. For `int 2fast = 1;` I got `not a statement` and `';' expected`. Also, a lone `_` isn't allowed: it's been a keyword since Java 9, and on JDK 21 the error says unnamed variables are a preview feature.",
            },
            {
              question: "What naming convention do Java variables typically follow?",
              answer:
                "`camelCase`: lowercase first word, capital first letter for each word after, like `userName` or `totalCount`. `static final` constants are `UPPER_SNAKE_CASE`, like `MAX_RETRIES`.\n\nThe compiler doesn't enforce any of it. `user_name` compiles fine. But the whole ecosystem follows it, and linters like Checkstyle and Sonar flag it, so breaking it stands out in review.",
            },
            {
              question: "What's the difference between declaration and initialization?",
              answer:
                "Declaration introduces the name and type: `int x;`. Initialization is the first assignment of a value: `x = 5;`. They can be one statement, `int x = 5;`, or separated.\n\nAt runtime only the assignment exists. In my `Slots` example, `int later;` produced no bytecode at all, there wasn't even a line-number entry for it. `later = 7;` became `bipush 7`, `istore 6`.",
            },
            {
              question: "Can you declare multiple variables of the same type on one line?",
              answer:
                "Yes: `int a, b, c;` or `int x = 5, y = 10;`. Each one can have its own initializer or none.\n\nThe trap is that `int p = 1, q, r = 3;` leaves `q` unassigned, which is easy to miss when reading. I mostly write one declaration per line, which is also what most style guides ask for.",
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
              question: "Where do local variables physically live in JVM memory?",
              answer:
                "In the local variable array of the current method's frame, on the calling thread's JVM stack. Each slot holds a primitive value or a reference. `long` and `double` take two slots.\n\nFor primitives that's the value itself, for objects it's only the reference, the object is on the heap. In `Slots`, `x` was slot 1 and the `long` `total` took slots 4 and 5. One nuance: once the JIT compiles the method, those locals usually live in CPU registers instead.",
            },
            {
              question: "Where do instance variables physically live in JVM memory?",
              answer:
                "Inside the object they belong to, on the heap. Each object has its own copy, at a fixed offset in the object's layout.\n\nThe bytecode reaches them through a reference: `aload_0` then `getfield`. In my `Dog` example, two objects held `\"Rex\"` and `\"Max\"` in their own `name` fields at the same time. The exception is when escape analysis proves an object never leaves a method; then the JIT can drop the allocation and keep its fields in registers.",
            },
            {
              question: "Where do static variables physically live in JVM memory?",
              answer:
                "In HotSpot, inside the class's `java.lang.Class` object on the heap, since JDK 7. Metaspace only holds the class metadata, like the field layout, not the values.\n\nA lot of notes, my own included, put them in the method area or Metaspace. The part that's right is that there's one copy per class. They're accessed with `getstatic` and `putstatic` and don't need an object. In `Dog`, both objects saw `totalDogsCreated = 2`.",
            },
            {
              question: "Why do local variables have no default value, while instance/static variables do?",
              answer:
                "Because the compiler can prove assignment for locals and can't for fields. A local is only visible inside one method body, so `javac` can analyse every path. A field can be read from any method, in any order, from any thread, so instead the JVM guarantees it starts zeroed.\n\nIt's also a deliberate safety choice. A local you forgot to assign is almost always a bug, so Java makes it a compile error rather than silently giving it `0`. The bytecode verifier enforces the same rule: it rejects code that loads a slot that hasn't been stored to.",
            },
            {
              question: "What happens to a local variable's memory when its containing method returns?",
              answer:
                "The whole frame is popped, so every local in it is gone. There's nothing to free and no GC involved, the stack pointer just moves back.\n\nWhat isn't gone is any object those locals referred to. That stays on the heap until nothing else references it. And if a lambda captured the local, it captured a copy of the value, which is exactly why Java requires captured locals to be effectively final.",
            },
            {
              question: "Why are local variables generally faster to access than instance variables?",
              answer:
                "In bytecode, a local is one instruction on a slot (`iload_1`). An instance field needs the object reference first and then a `getfield` at an offset in a heap object, one extra indirection. My `Access` example showed `local++` as a single `iinc 1, 1`, while `balance++` took five instructions.\n\nAfter JIT compilation the gap mostly disappears, because locals sit in registers and fields often get cached in registers too. It only stays when the JIT can't prove the field is unchanged, like with `volatile` fields or calls it can't inline.",
            },
            {
              question: "How many copies of a static variable exist, regardless of how many objects are created?",
              answer:
                "One per class, even with zero objects. To be precise, one per loaded class, so if two class loaders each load the same class, each copy of the class has its own static.\n\nIn my `Dog` run, both objects incremented the same `totalDogsCreated` and it printed `2` everywhere. The class-loader detail is what lets Tomcat give two web apps separate statics for the same class name.",
            },
            {
              question: "How many copies of an instance variable exist, if you create three objects of the same class?",
              answer:
                "Three, one inside each object. Changing one object's field doesn't affect the others.\n\nIn `Dog`, `rex.name` and `max.name` were `Rex` and `Max` at the same time. The field is declared once in the class, and every `new` allocates space for it in the new object, zeroed until the constructor sets it.",
            },
            {
              question: "Trace the bytecode-level steps of what happens when `int x = 5;` executes.",
              answer:
                "`javac` already gave `x` a slot, say slot 1 in a static `main` where slot 0 is `args`. At runtime two instructions run: `iconst_5` pushes the int 5 onto the frame's operand stack, and `istore_1` pops it into local slot 1.\n\nThat's exactly what `javap -c` showed for my `Slots` class. The push instruction depends on the value: `bipush 10` for a small number, `sipush 1000` for a bigger one, `ldc` for anything that doesn't fit in a short. The declaration itself doesn't execute anything, the slot was part of the frame from the start.",
            },
            {
              question: "Why does each thread having its own JVM Stack make local variables inherently thread-safe?",
              answer:
                "Because each call gets its own frame on its own thread's stack, so no other thread can even name that slot. Two threads running the same method each have their own copy of every local.\n\nIn my `Counters` test, two threads each counted to a million in a local and both got exactly `1000000`, while a shared static they both incremented ended at `1111058`. The caveat: the variable is thread-confined, but if it references a shared object, that object is not protected at all.",
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
              question: "Explain precisely why the compiler enforces \"definite assignment\" for local variables but not instance variables.",
              answer:
                "Definite assignment (JLS chapter 16) is a flow analysis inside one body of code. For a local, the whole lifetime is inside one method, so `javac` can follow every branch and loop and prove a write comes before each read. For a field it can't: any method can read it, in any order, from any thread, possibly before the constructor finishes. So the language makes fields safe a different way, by having the JVM zero them.\n\nThere is one place definite assignment does apply to fields: `final` fields. A `final` instance field must be definitely assigned by the end of every constructor, and a `static final` by the end of static initialization. And the analysis is smart about constants: my `if (true) { n = 1; }` compiled, while the same shape with a real condition failed.",
            },
            {
              question: "How does the JVM determine the \"slot index\" for a given local variable within a stack frame?",
              answer:
                "It doesn't, `javac` does. Slots start with `this` (for instance methods) and the parameters, then `javac` gives each local the next free index as it's declared, with `long` and `double` taking two. The index is baked into the instructions, like `istore_1` or `lstore 4`, and the JVM just follows them.\n\n`javac` also reuses slots. In my `Scope` example, `bonus` inside an `if` and `penalty` after it both used slot 2, so `max_locals` was 3 instead of 4. Names only survive in the optional `LocalVariableTable`, which `javac` writes with `-g` for debuggers.",
            },
            {
              question: "What's the relationship between a method's local variable count and its stack frame size?",
              answer:
                "Directly proportional for the interpreter. Each method's `Code` attribute has `max_locals` and `max_stack`, and an interpreted frame is roughly that many slots plus a fixed header. JIT-compiled frames are laid out by the compiler, with registers and spill slots, so their size isn't exactly `max_locals`.\n\nI measured it: a recursive method with `locals=1` got 9838 frames deep with `-Xint`, one with `locals=22` only got 3577. In mixed mode it was 22084 versus 10240, varying a bit between runs because some frames were compiled.",
            },
            {
              question: "Why might excessive local variable usage in a very deep call chain matter for stack size limits (StackOverflowError)?",
              answer:
                "Because the thread stack is a fixed size, set by `-Xss` (1 MB by default on 64-bit Linux). Every frame takes space proportional to its locals and operand stack, so bigger frames means fewer of them before `StackOverflowError`.\n\nIt only matters for deep recursion, like recursive tree walks or badly bounded recursion on user input. My `FrameSize` test roughly halved its depth by going from one slot to twenty-two. Normal request handling is a few hundred frames deep, so I'd fix the recursion (make it iterative) before tuning `-Xss`.",
            },
            {
              question: "Explain how static variable access differs at the bytecode level from local variable access.",
              answer:
                "A local is accessed by slot index with typed instructions like `iload_1`, `istore_1` or `iinc`. No name, no lookup, nothing to resolve. A static field is `getstatic #13` or `putstatic #13`, where `#13` is a field reference in the constant pool naming the class, field and type.\n\nThe first time that instruction runs, the JVM resolves the reference to the actual field, and if the class isn't initialized yet, that access triggers its initialization. After that, compiled code reads it at a fixed address inside the `Class` object. In my `Access` example, `hits++` was `getstatic`, `iconst_1`, `iadd`, `putstatic`, four instructions and not atomic.",
            },
            {
              question: "Why does Java's static type system (locking a variable's type at declaration) prevent certain classes of runtime bugs that dynamically-typed languages are more prone to?",
              answer:
                "Because a whole class of mistakes is caught before the program runs: putting a string where a number goes, calling a method that doesn't exist on that type, misspelling a field. In a dynamic language those show up at runtime, often only on the path that triggers them.\n\nMy `x = \"hello\"` attempt never got past `javac`. The bytecode verifier backs this up at load time, so even hand-crafted bytecode can't treat an `int` slot as a reference. It doesn't catch everything, `null` and bad casts still fail at runtime, but it makes refactoring and IDE tooling far more reliable.",
            },
            {
              question: "How does the JIT compiler potentially optimize local variable access differently from instance variable access?",
              answer:
                "Locals are private to the frame, so C2 can freely keep them in registers, reorder, or eliminate them. Nothing else can observe them. Fields can be seen by other threads, so the JIT can only cache a field in a register when the Java Memory Model allows it: no `volatile`, no synchronization, no unknown calls in between.\n\nEscape analysis blurs the line: if an object never escapes a method, C2 can scalar-replace it, turning its fields into locals and skipping the heap allocation. The flip side is the classic bug where a non-volatile `boolean running` field is hoisted out of a loop and the loop never sees another thread's update.",
            },
            {
              question: "What's the performance/design tradeoff between passing many parameters (many local variables) versus passing one object encapsulating them?",
              answer:
                "Performance-wise it's usually a wash. Many parameters means more slots and more values to copy per call, but compiled code passes the first several arguments in registers. One object means an allocation, but if the object doesn't escape and the call is inlined, escape analysis often removes it.\n\nThe design side matters more. Six `String` parameters are easy to pass in the wrong order and the compiler can't help. A parameter object, which is a natural fit for a `record`, gives the values names and types, and adding a field later doesn't break every caller. I'd decide on readability and only change for performance with a profiler showing a real problem.",
            },
            {
              question: "Explain how variable shadowing (a local variable with the same name as an instance variable) is resolved by the compiler.",
              answer:
                "Scope rules: the innermost declaration wins. Inside a method, a simple name like `status` resolves to a local or parameter first, then to a field. To reach the shadowed field you write `this.status` (or `ClassName.field` for a static).\n\nThe bug this causes is self-assignment. In my `Shadowing` class, `status = status;` compiled to `aload_1`, `astore_1`, parameter copied onto itself, and the field kept `\"field\"`. Java does forbid one kind of shadowing: a local can't redeclare another local of the same method in a nested block, that's `variable count is already defined`.",
            },
            {
              question: "Why is understanding the Stack/Heap distinction for variables foundational to understanding thread-safety in concurrent Java code?",
              answer:
                "Because thread-safety is about shared mutable state, and the stack/heap split tells you what's shared. Stacks are per thread, so locals and parameters are never shared. The heap is shared, so fields, static fields and array elements are reachable by any thread that has a reference.\n\nThat's the whole reasoning behind stateless Spring singletons: per-request data in locals, only `final` collaborators in fields. My `Counters` run showed it: locals gave exactly a million on each thread, and the static lost close to half its increments. And the second step is remembering a local can point to a shared heap object, so locals alone don't make code safe.",
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
              question: "You declare `int total;` inside a method but the compiler refuses to compile a line that reads `total` before any assignment. Explain exactly why.",
              answer:
                "`total` is a local, and locals have no default value. The compiler runs definite assignment analysis and found at least one path where `total` is read without having been assigned, so it reports `variable total might not have been initialized`.\n\nIt's not about whether that path happens in practice, it's about whether `javac` can prove it. An assignment inside an `if` without an `else` fails, even if I know the condition is always true at runtime. The fix is to initialize it (`int total = 0;` for a sum) or make sure every branch assigns it.",
            },
            {
              question: "Two threads are each running the same method, which declares a local variable `count`. Are these two `count` variables the same memory location or different ones? Explain.",
              answer:
                "Different. Each thread has its own JVM stack, each call pushes its own frame, and `count` is a slot in that frame. Same slot number, completely separate memory.\n\nThat's what my `Counters` test showed: two threads each ran `count++` a million times on their local and each returned exactly `1000000`. Even a recursive call on a single thread gets a separate `count` per call.",
            },
            {
              question: "You have a `static int requestCounter` in a class, and 100 different objects of that class each increment it. What's the final value logic, and why is there only \"one\" counter?",
              answer:
                "There's one counter because a static field belongs to the class, not to any object. All 100 objects read and write the same field in the class's `Class` object. If they increment it once each on one thread, it ends at exactly 100.\n\nIf those increments happen on multiple threads, it can end lower, because `requestCounter++` is `getstatic`, `iadd`, `putstatic` and two threads can overwrite each other. My two-thread test lost about half of two million increments. For a real request counter I'd use `AtomicLong` or `LongAdder`, or better, a Micrometer counter.",
            },
            {
              question: "A colleague asks why a variable declared inside an `if` block can't be accessed outside that block. Explain using the stack frame concept.",
              answer:
                "I'd actually correct the premise a bit: it's not the stack frame, it's scope. There's one frame per method call, and the `if` block's variable has a slot in that same frame. The compiler simply doesn't let the name be used after the closing brace, and the error is `cannot find symbol`.\n\nThe frame does explain why the rule is cheap: since the variable can't be named after the block, `javac` can reuse its slot. In my `Scope` example, `bonus` inside the `if` and `penalty` after it shared slot 2. If the value is needed later, declare the variable before the block.",
            },
            {
              question: "Someone claims \"instance variables and local variables are basically the same thing, just declared in different places.\" Explain what's actually different beyond just location.",
              answer:
                "Almost everything. Locals are per call and per thread, live in a stack slot, die when the method returns, have no default and must be definitely assigned, can't have access modifiers, and are accessed by slot number. Instance variables are per object, live inside the object on the heap, live as long as the object, start at `0`/`false`/`null`, can be `private`/`public`, and are accessed through `getfield` with a reference.\n\nThe practical difference is sharing. A local is never visible to another thread. An instance field of a shared object, like a Spring singleton, is visible to every thread that uses it. Mixing those two up is how you get race conditions in a service.",
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
            "Write `VariableScopeDemo.java` with a local `int counter = 0;` in `main`.",
            "Inside an `if (true) { }` block, declare another local and print it. Then try to print it after the block, compile, and note the exact error.",
            "Remove that line. Increment `counter` three times, printing it after each increment.",
            "Add a comment explaining why the block's variable couldn't be used outside it. Bonus: compile with `javac -g` and run `javap -c -l` to see which slot each variable got.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "VariableScopeDemo.java",
          code: `public class VariableScopeDemo {
    public static void main(String[] args) {
        int counter = 0;
        if (true) {
            // insideIf's scope ends at the closing brace. Its slot sits in
            // main's frame the whole time, but javac won't resolve the name
            // outside the block, and may reuse the slot for something else.
            int insideIf = 42;
            System.out.println("inside: " + insideIf);
        }
        counter++;
        System.out.println("counter = " + counter);
        counter++;
        System.out.println("counter = " + counter);
        counter++;
        System.out.println("counter = " + counter);
    }
}`,
        },
        {
          type: "paragraph",
          text: "What to expect: step 2 fails with `error: cannot find symbol` pointing at `insideIf`, with `symbol: variable insideIf`. After removing that line the program prints `inside: 42`, then `counter = 1`, `counter = 2`, `counter = 3`. In the bonus, `counter` is slot 1 and `insideIf` slot 2, all in the one frame for `main`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `DECLARE   type name = value;   type is fixed forever
          var x = 10;   inferred, still int (locals only)

KINDS     local / param   slot in the method's frame
                          per call, per thread, no default
          instance        inside the object, on the heap
                          one per object, starts 0/false/null
          static          inside the Class object, on heap
                          one per class (per loader)

RULES     locals must be definitely assigned before read
          scope = compile time (block), lifetime = runtime
          inner block can't redeclare a local; it CAN
          shadow a field -> use this.field
          lambdas capture effectively final locals only

BYTECODE  int x = 5;   iconst_5, istore_1
          local++      iinc 1, 1
          field        aload_0, getfield / putfield
          static       getstatic / putstatic
          long/double  two slots; declaration alone: nothing

NAMES     letter, $ or _ first; no keywords; not "_"
          camelCase; UPPER_SNAKE for static final

SEE IT    javac -g X.java && javap -c -l X`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A variable never contains an object, only a primitive value or a reference.",
            "Locals are slots chosen by `javac`, not names the JVM looks up, and only assignments produce bytecode.",
            "Locals are thread-confined, fields and statics are shared. That one fact explains most of what goes wrong in concurrent backend code.",
          ],
        },
      ],
    },
  ],
};
