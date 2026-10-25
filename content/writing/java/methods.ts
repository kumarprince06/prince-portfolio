import type { Lesson } from "../types";

export const methods: Lesson = {
  slug: "methods",
  date: "2026-10-23",
  title: "Methods",
  description:
    "How Java methods are declared, called and resolved: parameters and return values, why Java is strictly pass-by-value, overloading and varargs, and what a call really does to the JVM stack, down to the bytecode.",
  tags: ["Core Java", "Methods", "JVM", "Bytecode"],
  sections: [
    {
      title: "What a Method Is",
      blocks: [
        {
          type: "paragraph",
          text: "Up to the Loops lesson, almost everything I wrote lived inside one method, `main`. That works for twenty lines. It stops working the moment the same logic is needed in two places, because copy-paste means a bug fixed in one copy stays alive in the other.",
        },
        {
          type: "paragraph",
          text: "A **method** is a named block of code that does one job. It can take inputs (parameters), and it can hand back one result (a return value). I write the logic once, give it a name, and call it from wherever it's needed. That's also the main tool for breaking a big program into pieces small enough to read.",
        },
        {
          type: "paragraph",
          text: "The reason this lesson goes deeper than syntax: every method call pushes a **frame** onto the thread's JVM stack, the memory area from the JVM lesson. Once I could see that frame in `javap` output, two things stopped being mysterious. One is the classic interview trap, \"is Java pass by value or by reference?\". The other is how to read a stack trace, which is literally a printout of those frames.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Reusable blocks of code are as old as programming. Early languages called them subroutines, procedures or functions, and Java's syntax for them comes straight from C and C++: return type, name, parameter list in parentheses, body in braces.",
        },
        {
          type: "paragraph",
          text: "Java made a few deliberate changes. Every method has to belong to a class or interface. There are no free-floating functions like in C++, which is why even `main` sits inside a class. Java also dropped default parameter values, pointer parameters and C++ reference parameters (`int&`). The result is simpler and safer, and there's exactly one parameter-passing rule: by value. Overloading, which Java kept, covers part of what default parameters were used for.",
        },
        {
          type: "paragraph",
          text: "Even the newer \"just write a method\" style keeps the rule. JDK 21 has a preview of top-level methods in a source file (finalized in JDK 25 as compact source files), and the compiler quietly wraps them in a class:",
        },
        {
          type: "code",
          language: "java",
          title: "Hello.java (no class declaration)",
          code: `String greet(String name) {
    return "Hello, " + name;
}

void main() {
    System.out.println(greet("methods"));
    System.out.println(getClass().getName());
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java --enable-preview --source 21 Hello.java",
        },
        {
          type: "output",
          text: `Note: Hello.java uses preview features of Java SE 21.
Note: Recompile with -Xlint:preview for details.
Hello, methods
Hello`,
        },
        {
          type: "paragraph",
          text: "`getClass()` works because `greet` and `main` are instance methods of an implicitly declared class named `Hello`. Still a class underneath.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a method as a vending machine.",
        },
        {
          type: "list",
          items: [
            "The label on the machine is the method name. It says what it does.",
            "The coin slot is the parameter list. It only accepts the right kind of coins (types), in the right number.",
            "The item that drops out is the return value. Exactly one item, or nothing at all for a `void` machine that just prints a receipt.",
            "The mechanism inside is hidden. I don't need to know how it works to use it, and it can be rebuilt without changing the slot or the label.",
          ],
        },
        {
          type: "paragraph",
          text: "The part that maps onto pass-by-value: the machine never gets my wallet. It gets the coins I hand it. If I hand it a key to my locker (a reference), it can open the locker and rearrange what's inside, but it can't swap my key for a different one. That one sentence is most of this lesson.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Anatomy of a method",
        },
        {
          type: "code",
          language: "java",
          code: `public static int add(int a, int b) {
    return a + b;
}`,
        },
        {
          type: "table",
          headers: ["Part", "Example", "Purpose"],
          rows: [
            ["Access modifier", "`public`", "Who can call it. Access control gets its own lesson later"],
            ["`static`", "`static`", "Belongs to the class, so it's called without an object. Previewed below"],
            ["Return type", "`int`", "The type of value handed back, or `void` for nothing"],
            ["Name", "`add`", "How it's called. camelCase, usually a verb"],
            ["Parameters", "`int a, int b`", "Inputs, each with a declared type. Can be empty: `()`"],
            ["Body", "`{ return a + b; }`", "The code that runs on each call"],
          ],
        },
        {
          type: "paragraph",
          text: "The method **signature**, in the JLS sense, is the name plus the parameter types: `add(int, int)`. The return type is not part of it, and neither are parameter names, modifiers or the `throws` clause. That's why two methods can't differ only by return type.",
        },
        {
          type: "callout",
          tone: "note",
          title: "The JVM sees it differently",
          text: "In the class file, a method is identified by its name and **descriptor**, and the descriptor does include the return type: `add` is `(II)I`, two ints in, an int out. The JVM itself would allow two methods that differ only in return type, and `javac` actually generates such pairs as bridge methods for generics. The Java language is what forbids it in source.",
        },
        {
          type: "heading",
          text: "Parameters and arguments",
        },
        {
          type: "list",
          items: [
            "**Parameters** are the variables declared in the method: `a` and `b`. They're local variables of the method, initialized from the call.",
            "**Arguments** are the values given at the call site: in `add(3, 4)`, `3` and `4`. Any expression works, including another call: `add(add(1, 2), 3)`.",
          ],
        },
        {
          type: "heading",
          text: "Return values",
        },
        {
          type: "list",
          items: [
            "`return value;` hands one value back and ends the method immediately. The value has to be assignable to the declared return type.",
            "A `void` method can use a bare `return;` to leave early.",
            "A non-void method must return (or throw) on every path the compiler can see. Otherwise it's a `missing return statement` error.",
            "A statement right after a `return` in the same block can never run, and `javac` rejects it as an `unreachable statement`.",
            "A method returns at most one value. To hand back several, I return an object that holds them: an array, a small class, or since Java 16 a `record`.",
          ],
        },
        {
          type: "heading",
          text: "Pass by value, always",
        },
        {
          type: "paragraph",
          text: "Java has one parameter-passing rule: the method's parameter is a new variable, initialized with a **copy of the argument's value** (JLS 15.12.4.5). There are no exceptions, but what \"the value\" is depends on the type:",
        },
        {
          type: "list",
          items: [
            "For a primitive, the value is the number, `char` or `boolean` itself. Changing the parameter changes only the method's copy. The caller's variable can't be touched.",
            "For a reference type, the value is the **reference**, the pointer to an object on the heap. The parameter and the caller's variable are now two separate variables pointing at the same object. Changing the object through the parameter (`arr[0] = 99`, `list.add(x)`) is visible to the caller. Reassigning the parameter (`arr = new int[3]`) only repoints the method's copy.",
          ],
        },
        {
          type: "paragraph",
          text: "So \"Java passes objects by reference\" is wrong. Objects aren't passed at all. References are passed, by value. In a real pass-by-reference language, the method would get an alias for the caller's variable and could reassign it. Java has no way to do that. This is the same sharing I saw when assigning one array variable to another in the Variables lesson, just across a method boundary.",
        },
        {
          type: "heading",
          text: "Overloading",
        },
        {
          type: "paragraph",
          text: "Several methods in a class can share a name if their parameter lists differ in number, types or order of types:",
        },
        {
          type: "code",
          language: "java",
          code: `static int add(int a, int b)          { return a + b; }
static double add(double a, double b) { return a + b; }
static int add(int a, int b, int c)   { return a + b + c; }`,
        },
        {
          type: "paragraph",
          text: "`javac` picks the overload at **compile time**, from the static types of the arguments, and writes that exact choice into the bytecode as a descriptor (`add:(II)I` or `add:(DD)D`). When no overload matches exactly, it searches in three phases (JLS 15.12.2), and stops at the first phase that finds anything:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Phase 1:** no boxing, no varargs. Only exact matches and widening primitive conversions (`int` to `long`, `long` to `double`, `char` to `int`) or subtype references.",
            "**Phase 2:** boxing and unboxing allowed (`int` to `Integer`), still no varargs.",
            "**Phase 3:** varargs allowed.",
          ],
        },
        {
          type: "paragraph",
          text: "Within a phase, if several methods apply, the **most specific** one wins (`int` beats `long`, `String` beats `Object`). If none is more specific than the others, it's a compile error: `reference to ... is ambiguous`. I show all three phases with real output in the examples.",
        },
        {
          type: "heading",
          text: "Varargs",
        },
        {
          type: "paragraph",
          text: "`static int sum(int... nums)` accepts zero or more `int` arguments. Inside, `nums` doesn't just behave like an `int[]`, it **is** one: the descriptor is `([I)I`, and the call site builds the array. A varargs parameter must be the last one, and a method can have only one.",
        },
        {
          type: "heading",
          text: "static versus instance, a preview",
        },
        {
          type: "paragraph",
          text: "A `static` method belongs to the class and is called without an object, like `main` or `Math.max`. An instance method needs an object and gets a hidden extra parameter, `this`, which I'll show sitting in local slot 0 in the bytecode. Classes and objects get their own lessons, so every example here is `static` except where I'm showing that difference.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "I wanted to see exactly what a call compiles to, so I started with the smallest possible one:",
        },
        {
          type: "code",
          language: "java",
          title: "AddCall.java",
          code: `public class AddCall {
    static int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        int result = add(3, 4);
        System.out.println(result);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac AddCall.java && javap -c -v AddCall",
        },
        {
          type: "output",
          text: `  #7 = Methodref          #8.#9          // AddCall.add:(II)I
  #8 = Class              #10            // AddCall
  #9 = NameAndType        #11:#12        // add:(II)I
  ...
  static int add(int, int);
    descriptor: (II)I
    flags: (0x0008) ACC_STATIC
    Code:
      stack=2, locals=2, args_size=2
         0: iload_0
         1: iload_1
         2: iadd
         3: ireturn

  public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: (0x0009) ACC_PUBLIC, ACC_STATIC
    Code:
      stack=2, locals=2, args_size=1
         0: iconst_3
         1: iconst_4
         2: invokestatic  #7                  // Method add:(II)I
         5: istore_1
         6: getstatic     #13                 // Field java/lang/System.out:Ljava/io/PrintStream;
         9: iload_1
        10: invokevirtual #19                 // Method java/io/PrintStream.println:(I)V
        13: return`,
        },
        {
          type: "paragraph",
          text: "Trimmed to the interesting parts, here's what I read from it:",
        },
        {
          type: "list",
          items: [
            "`descriptor: (II)I` is the JVM's name for the method's shape. The call site doesn't say \"call add\", it says \"call constant pool entry #7\", which is `AddCall.add:(II)I`. That symbolic reference gets resolved the first time the instruction runs, the same lazy resolution from the Class Loading lesson.",
            "`stack=2, locals=2, args_size=2` are sizes `javac` worked out at compile time. `add` needs at most two values on its operand stack at once (for `iadd`), and two local variable slots, both taken by its parameters. So the JVM knows how big the frame is before it creates it.",
            "In `main`, `iconst_3` and `iconst_4` push the arguments onto `main`'s operand stack, and `invokestatic` makes the call. `main` has `locals=2`: slot 0 is `args`, slot 1 is `result`.",
            "Inside `add`, the parameters are already sitting in slots 0 and 1. `iload_0` and `iload_1` push them, `iadd` adds them, and `ireturn` hands the top of the stack back.",
            "Back in `main`, the result is on `main`'s operand stack, and `istore_1` stores it into `result`.",
          ],
        },
        {
          type: "heading",
          text: "What's in a frame",
        },
        {
          type: "paragraph",
          text: "Each call gets a new frame on the calling thread's JVM stack. The JVM specification gives a frame three parts:",
        },
        {
          type: "list",
          items: [
            "**Local variable array:** fixed size (`locals=`), indexed from 0. Parameters come first, in order, then the method's other locals. `long` and `double` take two slots each.",
            "**Operand stack:** fixed maximum depth (`stack=`). Bytecode works by pushing and popping here: arguments for the next call, intermediate results, the return value.",
            "**Frame data:** a reference to the current class's runtime constant pool (to resolve things like `#7`), plus what's needed to return: where the caller's frame is and where to continue in the caller's bytecode.",
          ],
        },
        {
          type: "paragraph",
          text: "On `invokestatic`, the JVM pops the arguments off the caller's operand stack and they become the initial values of the callee's first local variables. That's pass-by-value at the instruction level. The callee gets its own slots, and nothing in it points back at the caller's variables.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "My old notes said the arguments are \"physically moved\"",
          text: "That's the specification's model, and it's the right way to think about semantics. HotSpot's interpreter is cleverer: it lays the new frame's local variable area over the caller's operand stack slots that already hold the arguments, so nothing is copied at all. JIT-compiled code usually passes arguments in CPU registers. The observable rule doesn't change. The callee's parameters are its own variables, and the caller's variables are unreachable from it.",
        },
        {
          type: "heading",
          text: "Slot 0 in an instance method is this",
        },
        {
          type: "paragraph",
          text: "To see `this`, the two-slot types and the slot numbering together, I compiled an instance method with `-g` so `javap` would print the local variable table:",
        },
        {
          type: "code",
          language: "java",
          title: "Slots.java",
          code: `public class Slots {
    private double rate = 12.5;

    double fare(int km, long waitSec, String city) {
        double total = km * rate + waitSec / 60.0;
        return city.equals("Kolkata") ? total : total * 1.1;
    }

    public static void main(String[] args) {
        System.out.println(new Slots().fare(10, 120L, "Kolkata"));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac -g Slots.java && javap -c -v -p Slots",
        },
        {
          type: "output",
          text: `  double fare(int, long, java.lang.String);
    descriptor: (IJLjava/lang/String;)D
    flags: (0x0000)
    Code:
      stack=6, locals=7, args_size=4
         0: iload_1
         1: i2d
         2: aload_0
         3: getfield      #9                  // Field rate:D
         ...
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0      38     0  this   LSlots;
            0      38     1    km   I
            0      38     2 waitSec   J
            0      38     4  city   Ljava/lang/String;
           16      22     5 total   D`,
        },
        {
          type: "list",
          items: [
            "`this` is slot 0, an implicit first parameter. That's why `aload_0` followed by `getfield rate` is how `rate` is read. A static method has no `this`, so its parameters start at slot 0, as in `add`.",
            "`waitSec` is a `long`, so it takes slots 2 and 3, and `city` lands in slot 4. Same for `total`, a `double` in slots 5 and 6. That's how `locals=7` adds up.",
            "`args_size=4` counts arguments including `this` (this, km, waitSec, city), not slots. The descriptor `(IJLjava/lang/String;)D` doesn't mention `this` at all.",
          ],
        },
        {
          type: "heading",
          text: "The five invoke instructions",
        },
        {
          type: "paragraph",
          text: "`invokestatic` is only one of five call instructions. I put one of each kind of call in a single class:",
        },
        {
          type: "code",
          language: "java",
          title: "Invokes.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.function.IntUnaryOperator;

public class Invokes {
    private int base = 10;

    static int twice(int x) { return x * 2; }          // static
    int plusBase(int x) { return x + base; }            // instance
    private int secret() { return 42; }                 // private instance

    @Override
    public String toString() { return "Invokes:" + super.toString().length(); }

    public static void main(String[] args) {
        int a = twice(5);                       // invokestatic
        Invokes inv = new Invokes();            // invokespecial <init>
        int b = inv.plusBase(1);                // invokevirtual
        int c = inv.secret();                   // private: see below
        List<Integer> list = new ArrayList<>();
        list.add(a + b + c);                    // invokeinterface
        IntUnaryOperator op = x -> x + 1;       // invokedynamic
        System.out.println(list + " " + op.applyAsInt(1));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p Invokes | grep invoke`,
        },
        {
          type: "output",
          text: `       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       1: invokespecial #13                 // Method java/lang/Object.toString:()Ljava/lang/String;
       4: invokevirtual #17                 // Method java/lang/String.length:()I
       7: invokedynamic #23,  0             // InvokeDynamic #0:makeConcatWithConstants:(I)Ljava/lang/String;
       1: invokestatic  #27                 // Method twice:(I)I
       9: invokespecial #31                 // Method "<init>":()V
      15: invokevirtual #32                 // Method plusBase:(I)I
      20: invokevirtual #35                 // Method secret:()I
      29: invokespecial #40                 // Method java/util/ArrayList."<init>":()V
      42: invokestatic  #41                 // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
      45: invokeinterface #47,  2           // InterfaceMethod java/util/List.add:(Ljava/lang/Object;)Z
      51: invokedynamic #53,  0             // InvokeDynamic #1:applyAsInt:()Ljava/util/function/IntUnaryOperator;
      ...`,
        },
        {
          type: "table",
          headers: ["Instruction", "Used for", "Target picked"],
          rows: [
            ["`invokestatic`", "Static methods", "At link time. No object, no dispatch"],
            ["`invokevirtual`", "Instance methods on a class type", "At runtime, from the object's actual class (overriding)"],
            ["`invokeinterface`", "Instance methods through an interface type", "At runtime, from the object's actual class"],
            ["`invokespecial`", "Constructors (`<init>`), `super.method()` calls", "At link time, no override lookup"],
            ["`invokedynamic`", "Lambdas, string concatenation (Java 9+), records' `toString`/`equals`/`hashCode`", "On first run, by a bootstrap method that links a call site"],
          ],
        },
        {
          type: "paragraph",
          text: "Two things in that output I didn't expect. The `list.add(a + b + c)` line shows autoboxing as a plain `invokestatic Integer.valueOf` before the interface call. And `\"Invokes:\" + ...` isn't a `StringBuilder` chain anymore, it's an `invokedynamic` to `makeConcatWithConstants`, which is how `javac` has compiled string `+` since Java 9.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Private methods are not invokespecial anymore",
          text: "My notes, and plenty of older articles, say private methods are called with `invokespecial`. On JDK 21 the call to `secret()` is `invokevirtual`. Since Java 11 (JEP 181, nest-based access control), `javac` emits `invokevirtual` for private instance methods, and the JVM still knows a private method can't be overridden, so there's no real dispatch. `invokespecial` is left for constructors and `super.` calls.",
        },
        {
          type: "heading",
          text: "The return instructions",
        },
        {
          type: "paragraph",
          text: "Return comes in a family, typed like the load and store instructions from the Type Casting lesson:",
        },
        {
          type: "code",
          language: "java",
          title: "Returns.java",
          code: `public class Returns {
    static boolean ok()    { return true; }
    static char grade()    { return 'A'; }
    static int count()     { return 7; }
    static long big()      { return 7L; }
    static float ratio()   { return 0.5f; }
    static double price()  { return 9.99; }
    static String name()   { return "trip"; }
    static int[] ids()     { return new int[] {1, 2}; }
    static void log()      { }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c Returns | grep -E "static|return"`,
        },
        {
          type: "output",
          text: `  static boolean ok();
       1: ireturn
  static char grade();
       2: ireturn
  static int count();
       2: ireturn
  static long big();
       3: lreturn
  static float ratio();
       2: freturn
  static double price();
       3: dreturn
  static java.lang.String name();
       2: areturn
  static int[] ids();
      11: areturn
  static void log();
       0: return`,
        },
        {
          type: "paragraph",
          text: "(I dropped the default constructor's `return` from the top.) Six instructions: `ireturn`, `lreturn`, `freturn`, `dreturn`, `areturn` and plain `return`. My notes left out `freturn`, and didn't mention that `boolean`, `byte`, `char` and `short` all use `ireturn`, because the JVM works on them as `int`s. Each typed return pops a value of that kind from the callee's operand stack, the frame is discarded, and the value is pushed onto the caller's operand stack. Having one per type lets the verifier check, before the code ever runs, that a method declared to return `double` really returns a two-slot `double` and not a reference.",
        },
        {
          type: "heading",
          text: "A call in pseudo-code",
        },
        {
          type: "paragraph",
          text: "Putting it together, this is the spec's model of a static call. My original version copied argument `i` into slot `i`, which is wrong as soon as there's a `long`, a `double` or an implicit `this`:",
        },
        {
          type: "code",
          language: "text",
          code: `invoke(method, callerFrame):
    frame = new Frame(method.maxLocals, method.maxStack)

    // arguments come off the caller's operand stack, last one first
    slot = method.isStatic ? 0 : 1          // slot 0 is 'this' otherwise
    for each parameter p, left to right:
        frame.locals[slot] = value popped for p   // a copy: a number,
        slot += (p is long or double) ? 2 : 1     // or a reference

    if not static: frame.locals[0] = receiver reference

    thread.stack.push(frame)                // StackOverflowError if no room
    result = run(method.bytecode, frame)
    thread.stack.pop()                      // all locals gone
    if result exists: callerFrame.operandStack.push(result)
    continue caller after the invoke instruction`,
        },
        {
          type: "paragraph",
          text: "There's no operation in that model, or in the real JVM, that hands a method the caller's variable itself. Only values cross the boundary.",
        },
      ],
    },
    {
      title: "The Call in One Picture",
      blocks: [
        {
          type: "diagram",
          text: ` BEFORE CALL        DURING add(3, 4)      AFTER RETURN
┌──────────────┐   ┌──────────────┐     ┌──────────────┐
│ main    ◄TOP │   │ add     ◄TOP │     │ main    ◄TOP │
│  0 args      │   │  0 a = 3     │     │  0 args      │
│  1 result ?  │   │  1 b = 4     │     │  1 result 7  │
│ ops: 3, 4    │   │ ops: 3, 4 →7 │     │ ops: (empty) │
└──────────────┘   ├──────────────┤     └──────────────┘
                   │ main         │      add's frame is
                   │  0 args      │      gone, with a
                   │  1 result ?  │      and b in it
                   └──────────────┘`,
          caption:
            "The thread's JVM stack. The top frame is always the method running right now; everything below it is waiting for a return.",
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
            "`main` is running. Its frame is the top frame on the main thread's stack.",
            "`main` evaluates the arguments left to right and pushes them onto its operand stack (`iconst_3`, `iconst_4`).",
            "`invokestatic #7` runs. The first time, the JVM resolves `AddCall.add:(II)I` to the actual method.",
            "The JVM creates a frame for `add` sized from its `locals=` and `stack=`, and the two argument values become locals 0 and 1.",
            "The new frame becomes the top frame and the thread's PC register now points at `add`'s first instruction.",
            "`add` runs using only its own frame: `iload_0`, `iload_1`, `iadd`.",
            "`ireturn` pops the result, discards `add`'s frame, and pushes `7` onto `main`'s operand stack.",
            "Execution continues in `main` right after the invoke instruction, at `istore_1`.",
          ],
        },
        {
          type: "paragraph",
          text: "If `add` threw an exception instead of returning, its frame would be discarded the same way, and the JVM would look for a handler in `main`'s frame, then the one below, and so on. That unwinding is what produces a stack trace.",
        },
      ],
    },
    {
      title: "Frames in Memory",
      blocks: [
        {
          type: "paragraph",
          text: "Stack versus heap gets its own lesson later in this phase. Here I only need the part methods depend on. A chain of calls stacks frames on top of each other:",
        },
        {
          type: "diagram",
          text: `main() calls a(), a() calls b(), b() calls c()

        ┌──────────────┐
        │ c frame      │ ◄ running
        ├──────────────┤
        │ b frame      │   waiting for c to return
        ├──────────────┤
        │ a frame      │   waiting for b to return
        ├──────────────┤
        │ main frame   │   waiting for a to return
        └──────────────┘
         one stack per thread`,
          caption:
            "Each frame holds only its own method's locals, which is why a local in a() is invisible inside b().",
        },
        {
          type: "paragraph",
          text: "That's the memory-level reason behind the scope rule from the Variables lesson: a local variable belongs to one frame, and no other method can name it. It also means locals don't survive between calls. Each call starts with a fresh frame:",
        },
        {
          type: "code",
          language: "java",
          title: "FreshLocals.java",
          code: `public class FreshLocals {
    static int calls = 0;                    // static field: lives with the class

    static void visit() {
        int local = 0;                       // new slot in a new frame every call
        local++;
        calls++;
        System.out.println("local = " + local + ", calls = " + calls);
    }

    public static void main(String[] args) {
        visit();
        visit();
        visit();
    }
}`,
        },
        {
          type: "output",
          text: `local = 1, calls = 1
local = 1, calls = 2
local = 1, calls = 3`,
        },
        {
          type: "heading",
          text: "How deep can it go",
        },
        {
          type: "paragraph",
          text: "A thread's stack has a fixed maximum size, 1 MB by default on 64-bit Linux (`ThreadStackSize = 1024` in `-XX:+PrintFlagsFinal`). When a call needs a frame and there's no room left, the JVM throws `StackOverflowError`. It's an `Error`, at runtime, never a compile error. Almost always the cause is recursion that doesn't stop. I measured how deep two recursive methods get, one with a tiny frame and one with eight `long` slots of parameters and locals:",
        },
        {
          type: "code",
          language: "java",
          title: "Depth.java",
          code: `public class Depth {
    static int depth = 0;

    static void small() {
        depth++;
        small();
    }

    static void big(long a, long b, long c, long d) {
        long e = a + 1, f = b + 1, g = c + 1, h = d + 1;
        depth++;
        big(e, f, g, h);
    }

    public static void main(String[] args) {
        try { small(); } catch (StackOverflowError err) {
            System.out.println("small(): " + depth);
        }
        depth = 0;
        try { big(1, 2, 3, 4); } catch (StackOverflowError err) {
            System.out.println("big(...): " + depth);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java Depth              # default 1 MB stack, run five times
java -Xss512k Depth
java -Xss4m Depth
java -Xint Depth        # interpreter only, no JIT`,
        },
        {
          type: "table",
          headers: ["Run", "small()", "big(...)"],
          rows: [
            ["default, five runs", "25,171 / 22,206 / 22,239 / 21,148 / 22,231", "7,870 / 8,483 / 8,830 / 7,355 / 8,624"],
            ["`-Xss512k`, three runs", "8,942 / 8,406 / 8,366", "2,197 / 2,932 / 2,838"],
            ["`-Xss4m`, three runs", "101,162 / 101,150 / 221,552", "42,096 / 85,274 / 67,464"],
            ["`-Xint`, three runs", "10,732 every time", "4,372 every time"],
          ],
        },
        {
          type: "list",
          items: [
            "Bigger frames mean fewer of them fit. `big` got roughly a third of `small`'s depth with the same stack.",
            "`-Xss` scales it. Half the stack gave well under half the depth (the guard zones at the end of the stack are a fixed cost), four times the stack gave four to ten times the depth.",
            "With the JIT on, the numbers jump around between runs. Compiled frames are smaller than interpreted ones, so the depth depends on when the JIT replaced the interpreted frames. With `-Xint` the numbers were identical on every run, and smaller.",
          ],
        },
        {
          type: "paragraph",
          text: "These are numbers from my machine on JDK 21. They'll be different on yours, and they vary run to run, which is exactly why no code should depend on a particular recursion depth.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "SyntaxTour.java",
          code: `public class SyntaxTour {
    // Parameters and a return value
    static int square(int n) {
        return n * n;
    }

    // void: does something, returns nothing
    static void greet(String name) {
        if (name == null || name.isBlank()) {
            return;                      // early exit from a void method
        }
        System.out.println("Hello, " + name);
    }

    // Overloads: same name, different parameter lists
    static int max(int a, int b)          { return a > b ? a : b; }
    static double max(double a, double b) { return a > b ? a : b; }

    // Varargs: nums is a real int[]
    static int sum(int... nums) {
        int total = 0;
        for (int n : nums) total += n;
        return total;
    }

    public static void main(String[] args) {
        System.out.println(square(5));
        greet("Prince");
        greet("");
        System.out.println(max(3, 7) + " " + max(2.5, 1.5));
        System.out.println(sum(1, 2, 3) + " " + sum() + " " + sum(new int[] {4, 5}));
    }
}`,
        },
        {
          type: "output",
          text: `25
Hello, Prince
7 2.5
6 0 9`,
        },
        {
          type: "paragraph",
          text: "`greet(\"\")` printed nothing because of the early `return`. `sum()` returned `0`: with no arguments, `nums` is an empty array, not `null`. And `sum(new int[] {4, 5})` shows a varargs method also takes an array directly. `javap` makes it obvious why: the call sites build the array themselves. For `sum(1, 2, 3)` that's `iconst_3`, `newarray int` and a store per element; for `sum()` it's a fresh `new int[0]`:",
        },
        {
          type: "output",
          text: `  static int sum(int...);
    descriptor: ([I)I
    flags: (0x0088) ACC_STATIC, ACC_VARARGS
  ...
      49: iconst_3
      50: newarray       int
      52: dup
      53: iconst_0
      54: iconst_1
      55: iastore
      ...
      64: invokestatic  #59                 // Method sum:([I)I
      67: iconst_0
      68: newarray       int
      70: invokestatic  #59                 // Method sum:([I)I`,
        },
        {
          type: "paragraph",
          text: "The same `javap` run shows `max(3, 7)` compiled to `invokestatic max:(II)I` and `max(2.5, 1.5)` to `max:(DD)D`. The overload choice is already fixed in the class file.",
        },
        {
          type: "paragraph",
          text: "Why the return type is written before the name: the compiler needs to know what type a call expression produces to type-check the code around it, like `int r = square(5);` or `square(5) + 1`.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "The basic call",
        },
        {
          type: "code",
          language: "java",
          title: "MethodBasics.java",
          code: `public class MethodBasics {
    static int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        int total = add(10, 20);
        System.out.println(total);
        add(3, 4);                       // compiles, result thrown away
        System.out.println(add(add(1, 2), 3));
    }
}`,
        },
        {
          type: "output",
          text: `30
6`,
        },
        {
          type: "paragraph",
          text: "`add(3, 4);` on its own line is legal. A method call is allowed as a statement and the result is just dropped (in the bytecode, a `pop`). That's fine for a method called for its side effect, and a silent bug for one that's called for its result.",
        },
        {
          type: "heading",
          text: "Pass by value, three ways",
        },
        {
          type: "code",
          language: "java",
          title: "PassByValueDemo.java",
          code: `import java.util.Arrays;

public class PassByValueDemo {
    static void tryToChange(int x) {
        x = 99;                          // changes the parameter's own slot only
    }

    static void changeArray(int[] arr) {
        arr[0] = 99;                     // writes into the array both sides point at
    }

    static void reassignArray(int[] arr) {
        arr = new int[] {7, 8, 9};       // points the parameter somewhere new
        arr[0] = 100;                    // and edits the new array, not the caller's
    }

    public static void main(String[] args) {
        int a = 5;
        tryToChange(a);
        System.out.println("a       = " + a);

        int[] nums = {1, 2, 3};
        changeArray(nums);
        System.out.println("nums    = " + Arrays.toString(nums));

        int[] other = {1, 2, 3};
        reassignArray(other);
        System.out.println("other   = " + Arrays.toString(other));
    }
}`,
        },
        {
          type: "output",
          text: `a       = 5
nums    = [99, 2, 3]
other   = [1, 2, 3]`,
        },
        {
          type: "paragraph",
          text: "Three different results, one rule: the method always gets a copy of the argument's value.",
        },
        {
          type: "list",
          items: [
            "`tryToChange` got a copy of `5` in its slot 0 and overwrote that copy. `main`'s `a` never moved.",
            "`changeArray` got a copy of the reference. Both copies point at the same heap array, so writing `arr[0]` is visible to `main`.",
            "`reassignArray` also got a copy of the reference, then pointed its copy at a new array. The write to `arr[0]` went into the new array, which was garbage the moment the method returned. `main`'s `other` still points at the original.",
          ],
        },
        {
          type: "diagram",
          text: `inside reassignArray, after  arr = new int[] {7, 8, 9}

 main frame            heap
┌─────────────┐      ┌──────────────┐
│ other  ─────┼─────►│ [1, 2, 3]    │  untouched
└─────────────┘      └──────────────┘
 reassignArray frame
┌─────────────┐      ┌──────────────┐
│ arr    ─────┼─────►│ [100, 8, 9]  │  dies with the frame
└─────────────┘      └──────────────┘`,
          caption: "Two variables, two copies of a reference. Repointing one leaves the other alone.",
        },
        {
          type: "heading",
          text: "Proving it's the same object",
        },
        {
          type: "paragraph",
          text: "To check that the parameter really refers to the caller's object until it's reassigned, I printed `System.identityHashCode`, which is stable for one object for its whole life:",
        },
        {
          type: "code",
          language: "java",
          title: "SameObject.java",
          code: `public class SameObject {
    static void inspect(StringBuilder param) {
        System.out.println("param  -> " + System.identityHashCode(param));
        param.append(" + edited");
        param = new StringBuilder("brand new");
        System.out.println("param  -> " + System.identityHashCode(param) + " after reassign");
    }

    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("original");
        System.out.println("caller -> " + System.identityHashCode(sb));
        inspect(sb);
        System.out.println("caller -> " + System.identityHashCode(sb) + " \\"" + sb + "\\"");
    }
}`,
        },
        {
          type: "output",
          text: `caller -> 705927765
param  -> 705927765
param  -> 312714112 after reassign
caller -> 705927765 "original + edited"`,
        },
        {
          type: "paragraph",
          text: "Same identity going in, so the `append` hit the caller's object. After the reassignment the parameter referred to a different object, and the caller was not affected. (The numbers are from my run and change every time.)",
        },
        {
          type: "heading",
          text: "Why swap is impossible",
        },
        {
          type: "code",
          language: "java",
          title: "Swap.java",
          code: `public class Swap {
    static void swap(int x, int y) {
        int t = x; x = y; y = t;
    }

    static void swap(String x, String y) {
        String t = x; x = y; y = t;
    }

    // What actually works: swap two slots of something both sides share
    static void swap(int[] arr, int i, int j) {
        int t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }

    public static void main(String[] args) {
        int a = 1, b = 2;
        swap(a, b);
        System.out.println(a + " " + b);

        String s = "left", t = "right";
        swap(s, t);
        System.out.println(s + " " + t);

        int[] pair = {1, 2};
        swap(pair, 0, 1);
        System.out.println(pair[0] + " " + pair[1]);
    }
}`,
        },
        {
          type: "output",
          text: `1 2
left right
2 1`,
        },
        {
          type: "paragraph",
          text: "The first two swaps work perfectly on the method's own copies and then those copies disappear with the frame. A swap of two caller variables would need the method to write into the caller's slots, and Java has no way to express that. The third version works because it doesn't swap variables, it swaps the contents of one shared object.",
        },
        {
          type: "heading",
          text: "Overload resolution, phase by phase",
        },
        {
          type: "paragraph",
          text: "Same call, `m(5)` with an `int`, against three sets of overloads. Each nested class removes the winner of the previous one:",
        },
        {
          type: "code",
          language: "java",
          title: "Phases.java",
          code: `public class Phases {
    static class AllThree {
        static String m(long x)    { return "m(long)    widening"; }
        static String m(Integer x) { return "m(Integer) boxing"; }
        static String m(int... x)  { return "m(int...)  varargs"; }
    }

    static class NoLong {
        static String m(Integer x) { return "m(Integer) boxing"; }
        static String m(int... x)  { return "m(int...)  varargs"; }
    }

    static class OnlyVarargs {
        static String m(int... x)  { return "m(int...)  varargs"; }
    }

    static class Printer {
        static String print(int x)    { return "print(int)"; }
        static String print(double x) { return "print(double)"; }
    }

    public static void main(String[] args) {
        System.out.println(AllThree.m(5));
        System.out.println(NoLong.m(5));
        System.out.println(OnlyVarargs.m(5));

        System.out.println(Printer.print(5));
        System.out.println(Printer.print(5L));
        System.out.println(Printer.print('A'));
        System.out.println(Printer.print(5.0f));
    }
}`,
        },
        {
          type: "output",
          text: `m(long)    widening
m(Integer) boxing
m(int...)  varargs
print(int)
print(double)
print(int)
print(double)`,
        },
        {
          type: "list",
          items: [
            "With all three available, `m(long)` wins even though `m(Integer)` looks like a \"closer\" type. Widening is allowed in phase 1, boxing only in phase 2, and phase 1 already found a match.",
            "Without `m(long)`, phase 1 finds nothing and phase 2 picks `m(Integer)`. Varargs is only ever the last resort.",
            "`print(5L)`: a `long` can't narrow to `int`, but it can widen to `double`, so `print(double)` runs.",
            "`print('A')`: `char` widens to `int`, and `int` is more specific than `double`, so `print(int)` wins and the method sees `65`.",
          ],
        },
        {
          type: "heading",
          text: "The declared type picks the overload, not the object",
        },
        {
          type: "code",
          language: "java",
          title: "StaticType.java",
          code: `public class StaticType {
    static String describe(Object o) { return "describe(Object)"; }
    static String describe(String s) { return "describe(String)"; }

    public static void main(String[] args) {
        String s = "hello";
        Object o = s;                       // same object, different declared type
        System.out.println(describe(s));
        System.out.println(describe(o));
        System.out.println(o.toString().equals(s.toString()));
        System.out.println(describe(null));
    }
}`,
        },
        {
          type: "output",
          text: `describe(String)
describe(Object)
true
describe(String)`,
        },
        {
          type: "paragraph",
          text: "`s` and `o` refer to the same `String`, but `describe(o)` calls the `Object` version, because overloads are chosen at compile time from the declared type. `o.toString()` is the opposite case: which `toString` runs is decided at runtime by `invokevirtual`, from the actual object. That's overriding, and it belongs with classes and inheritance. And `describe(null)` picks `String` because `null` fits both and `String` is more specific than `Object`.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Saying Java passes objects by reference",
        },
        {
          type: "paragraph",
          text: "`reassignArray` and `swap` above are the proof that it doesn't. If objects were passed by reference, the caller's variable would have been replaced. What's true is narrower: the method can mutate an object the caller also references.",
        },
        {
          type: "heading",
          text: "A path with no return",
        },
        {
          type: "code",
          language: "java",
          title: "MissingReturn.java",
          code: `public class MissingReturn {
    static String band(int score) {
        if (score >= 90) {
            return "A";
        } else if (score >= 75) {
            return "B";
        }
    }
}`,
        },
        {
          type: "output",
          text: `MissingReturn.java:8: error: missing return statement
    }
    ^
1 error`,
        },
        {
          type: "paragraph",
          text: "A score of 50 falls through both branches. The compiler does flow analysis on every path, so the fix is a final `return` (or `throw`) after the `if`, or turning the last `else if` into an `else`.",
        },
        {
          type: "heading",
          text: "Overloading by return type only",
        },
        {
          type: "code",
          language: "java",
          title: "ReturnOnly.java",
          code: `public class ReturnOnly {
    static int parse(String s)    { return Integer.parseInt(s); }
    static long parse(String s)   { return Long.parseLong(s); }
}`,
        },
        {
          type: "output",
          text: `ReturnOnly.java:3: error: method parse(String) is already defined in class ReturnOnly
    static long parse(String s)   { return Long.parseLong(s); }
                ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The error message says it directly: the signature is `parse(String)` for both. A call like `parse(\"5\");`, used as a statement, would give the compiler nothing to choose by. The JDK solves this with different names, `parseInt` and `parseLong`.",
        },
        {
          type: "heading",
          text: "Code after a return",
        },
        {
          type: "code",
          language: "java",
          title: "Unreachable.java",
          code: `public class Unreachable {
    static int half(int n) {
        return n / 2;
        System.out.println("done");
    }
}`,
        },
        {
          type: "output",
          text: `Unreachable.java:4: error: unreachable statement
        System.out.println("done");
        ^
1 error`,
        },
        {
          type: "heading",
          text: "Overloads that make a call ambiguous",
        },
        {
          type: "code",
          language: "java",
          title: "Ambiguous.java",
          code: `public class Ambiguous {
    static void pay(Integer amount, int tip) { }
    static void pay(int amount, Integer tip) { }

    public static void main(String[] args) {
        pay(100, 10);
    }
}`,
        },
        {
          type: "output",
          text: `Ambiguous.java:6: error: reference to pay is ambiguous
        pay(100, 10);
        ^
  both method pay(Integer,int) in Ambiguous and method pay(int,Integer) in Ambiguous match
1 error`,
        },
        {
          type: "paragraph",
          text: "Neither applies in phase 1, both apply in phase 2 with one boxing each, and neither is more specific. Declaring the overloads compiles fine. The error only shows up at the first call that hits the tie, which is what makes it annoying in a shared utility class.",
        },
        {
          type: "heading",
          text: "Ignoring a return value",
        },
        {
          type: "paragraph",
          text: "`add(3, 4);` compiles and does nothing useful. The more dangerous version is with immutable types: `name.trim();` or `date.plusDays(1);` on their own lines return a new object and leave the original unchanged. The fix is `name = name.trim();`.",
        },
        {
          type: "heading",
          text: "Expecting locals to remember anything",
        },
        {
          type: "paragraph",
          text: "Every call gets a new frame, as `FreshLocals` showed: `local` was `1` every time. State that has to outlive a call belongs in a field or gets passed in and returned.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "One method, one job. If I can't name it without \"and\", it's probably two methods.",
            "Name methods as verbs (`calculateFare`, `assignDriver`). Boolean methods read best with `is`, `has` or `can` (`isValid`, `hasCapacity`).",
            "Keep methods short enough to read in one go. Long methods usually hide a few smaller named steps.",
            "Keep parameter lists short. Three or four same-typed parameters in a row (`int, int, int, int`) invite swapped arguments. Group related values into a small object; a `record` is perfect for this.",
            "Don't mutate arguments silently. If a method changes a list or array it was given, make that obvious in its name (`sortInPlace`) or its Javadoc, or work on a copy.",
            "Prefer returning a value over writing into a parameter. `int[] counts = countBy(list)` is clearer than `fillCounts(list, counts)`.",
            "Avoid overloads that are one boxing step apart (`m(int)` next to `m(Integer)`, or `m(long)` next to `m(Integer)`). The phase rules above decide which runs, and readers shouldn't need them.",
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
            "A call has a small cost: pushing arguments, setting up a frame, and tearing it down. In interpreted code that's real. In hot code, the JIT usually removes it.",
            "**Inlining** is the main reason. When a call site is hot, C2 replaces the call with the callee's body, so there's no frame at all, and then optimizes the combined code as one unit. By default it inlines any callee up to 35 bytes of bytecode (`MaxInlineSize`), and hot callees up to 325 bytes (`FreqInlineSize`), nested up to 15 levels deep (`MaxInlineLevel`). Those are the values `-XX:+PrintFlagsFinal` showed on my JDK 21.",
            "Virtual calls can be inlined too. If profiling sees only one or two receiver classes at a call site, the JIT inlines those with a cheap type check. Call sites that see many classes (megamorphic) stay real calls.",
            "Varargs allocates. Every `sum(1, 2, 3)` builds a new `int[]`, and `sum()` builds an empty one, as `javap` showed. It's tiny, and escape analysis often removes it, but it's why APIs like `List.of` have fixed-argument overloads for up to ten elements before falling back to varargs.",
            "Deep recursion is the real risk, not call overhead. Each level costs a frame, and the stack limit is fixed per thread.",
          ],
        },
        {
          type: "paragraph",
          text: "I wanted to see inlining happen rather than take it on trust, so I called a tiny method in a hot loop:",
        },
        {
          type: "code",
          language: "java",
          title: "Inline.java",
          code: `public class Inline {
    static int fare(int km) {
        return 50 + km * 12;
    }

    static long total(int n) {
        long sum = 0;
        for (int i = 0; i < n; i++) {
            sum += fare(i % 40);
        }
        return sum;
    }

    public static void main(String[] args) {
        long result = 0;
        for (int round = 0; round < 20_000; round++) {
            result += total(1_000);
        }
        System.out.println(result);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining -XX:+PrintCompilation Inline`,
        },
        {
          type: "output",
          text: `...
24    6       3       Inline::fare (8 bytes)
24    7       4       Inline::fare (8 bytes)
25    6       3       Inline::fare (8 bytes)   made not entrant
26    8 %     3       Inline::total @ 4 (28 bytes)
                              @ 14   Inline::fare (8 bytes)   inline
26    9       3       Inline::total (28 bytes)
                              @ 14   Inline::fare (8 bytes)   inline
26   10 %     4       Inline::total @ 4 (28 bytes)
28    8 %     3       Inline::total @ 4 (28 bytes)   made not entrant
                              @ 14   Inline::fare (8 bytes)   inline (hot)
29   11       4       Inline::total (28 bytes)
30    9       3       Inline::total (28 bytes)   made not entrant
                              @ 14   Inline::fare (8 bytes)   inline (hot)
5680000000`,
        },
        {
          type: "paragraph",
          text: "`fare` is 8 bytes of bytecode, and the call at bytecode offset 14 of `total` was inlined at every compilation: first by C1 (tier 3), then by C2 (tier 4), marked `(hot)`. The `%` lines are on-stack replacement, compiling the loop while it's still running. Further up in the same log, JDK methods show the other side: `StringLatin1::hashCode (52 bytes) callee is too large`. So splitting code into small, well-named methods costs close to nothing once the code is hot, and small methods are actually the easiest ones for the JIT to inline.",
        },
      ],
    },
    {
      title: "Methods in Production",
      blocks: [
        {
          type: "list",
          items: [
            "A Spring Boot service is mostly methods calling methods: a controller method calls a service method, which calls a repository method. Each of those calls is a frame on the request thread's stack.",
            "A **stack trace** is a printout of those frames at the moment of the exception, top frame first. The first line under the exception is where it was thrown, and the frames below are the callers that were waiting.",
            "Spring's `@Transactional`, `@Cacheable` and `@Async` work through proxies. A call from another bean goes through the proxy, but a call from one method of a bean to another method of the **same** bean (`this.save()`) is a plain `invokevirtual` on the target object and skips the proxy, so the annotation on the inner method is silently ignored. The fix is to move the method into another bean, or to call it through the proxy.",
            "Overloading is all over the JDK. `System.out.println` has ten overloads (`boolean`, `char`, `int`, `long`, `float`, `double`, `char[]`, `String`, `Object`, and none), and `javac` picks one per call site. That's why `println('A')` prints `A` but `println('A' + 1)` prints `66`.",
            "Pass-by-value confusion causes real bugs, usually as a helper that mutates a collection it was given while the caller assumes it's untouched. The scenario questions below have a runnable version.",
          ],
        },
        {
          type: "paragraph",
          text: "Here's a small chain shaped like controller, service and repository, with a lookup that returns `null` for an unknown id:",
        },
        {
          type: "code",
          language: "java",
          title: "TraceDemo.java",
          code: `import java.util.Map;

public class TraceDemo {
    static final Map<Long, String> DRIVERS = Map.of(1L, "Asha", 2L, "Ravi");

    // "controller"
    static String handle(String idParam) {
        long id = Long.parseLong(idParam);
        return "Assigned " + assignDriver(id);
    }

    // "service"
    static String assignDriver(long id) {
        String name = findName(id);
        return name.toUpperCase();
    }

    // "repository"
    static String findName(long id) {
        return DRIVERS.get(id);              // null for an unknown id
    }

    public static void main(String[] args) {
        System.out.println(handle("1"));
        System.out.println(handle("7"));
    }
}`,
        },
        {
          type: "output",
          text: `Assigned ASHA
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.toUpperCase()" because "<local2>" is null
	at TraceDemo.assignDriver(TraceDemo.java:15)
	at TraceDemo.handle(TraceDemo.java:9)
	at TraceDemo.main(TraceDemo.java:25)`,
        },
        {
          type: "list",
          items: [
            "Reading it top-down: the NPE happened in `assignDriver` at line 15, which was called from `handle` at line 9, which was called from `main` at line 25. Three frames, exactly the stack at that moment.",
            "`findName` isn't in the trace. It had already returned `null` and its frame was gone. The bug is in the frame that **used** the bad value, but the cause is often in a call that already finished.",
            "`<local2>` is the local variable slot. `id` is a `long` and takes slots 0 and 1, so `name` is slot 2. Compiled with `javac -g`, the message names it: `because \"name\" is null`. Maven and Gradle compile with debug info by default, which is why production NPEs usually show real names.",
          ],
        },
        {
          type: "paragraph",
          text: "In a real Spring trace there are dozens of framework frames (proxies, filters, Tomcat) between my own. The trick is to scan for my own package names, take the topmost one as where it happened, and walk down to see how it got there. For a `Caused by:` section, the root cause is the last one.",
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
              question: "What is a method?",
              answer:
                "A named block of code inside a class that does one task. It can take parameters and can return one value, or nothing if it's `void`.\n\nThe point is reuse and structure: write the logic once and call it by name from anywhere. Under the hood, each call gets its own frame on the thread's stack, which I could see in `javap` as the `stack=` and `locals=` sizes `javac` computes for every method.",
            },
            {
              question: "What are the parts of a method declaration?",
              answer:
                "Modifiers like `public` and `static`, the return type, the name, the parameter list in parentheses, an optional `throws` clause, and the body. For `public static int add(int a, int b) { return a + b; }`, that's `public static`, `int`, `add`, `(int a, int b)` and the braces.\n\nOf those, only the name and the parameter types make up the signature. In the class file the method is identified by name and descriptor, `add:(II)I`, which also includes the return type.",
            },
            {
              question: "What's the difference between a parameter and an argument?",
              answer:
                "A parameter is the variable declared in the method definition. An argument is the actual value passed at the call. In `add(3, 4)`, `3` and `4` are arguments, and `a` and `b` are parameters.\n\nAt the bytecode level it's quite literal: the arguments are pushed onto the caller's operand stack, and they become the initial values of the callee's local variable slots, which are the parameters.",
            },
            {
              question: "What does `void` mean as a return type?",
              answer:
                "That the method doesn't return a value. It's called for what it does, like printing or saving, not for a result. It can still use a bare `return;` to leave early.\n\nIn bytecode, a void method ends with the plain `return` instruction instead of a typed one like `ireturn`, and nothing gets pushed onto the caller's operand stack.",
            },
            {
              question: "What does the `return` statement do?",
              answer:
                "It ends the method immediately and, in a non-void method, hands a value back to the caller. Any statement right after it in the same block is a compile error, `unreachable statement`, which I got when I put a `println` after one.\n\nMechanically, the typed return instruction pops the value off the method's operand stack, the frame is discarded, and the value is pushed onto the caller's operand stack, where the next instruction, like `istore_1`, picks it up.",
            },
            {
              question: "Can a method return more than one value directly?",
              answer:
                "No, one value at most. To return several, I wrap them in one object: an array, a small class, or a `record`, which is the cleanest option since Java 16.\n\nThe JVM reflects that: every return instruction returns a single value. `record FareResult(double amount, String currency)` and returning that is the idiomatic way, and it gives the values names too.",
            },
            {
              question: "What is method overloading?",
              answer:
                "Several methods in the same class with the same name but different parameter lists, different in number, types or order of types. `System.out.println` is the classic example, with overloads for `int`, `String`, `Object` and more.\n\nThe compiler picks one per call site from the arguments' static types, and the choice is baked into the bytecode. In my `SyntaxTour`, `max(3, 7)` compiled to `max:(II)I` and `max(2.5, 1.5)` to `max:(DD)D`.",
            },
            {
              question: "Is the return type part of a method's signature?",
              answer:
                "Not in Java's definition. The signature is the name and parameter types, so two methods that differ only by return type don't compile. I tried `int parse(String)` next to `long parse(String)` and got \"method parse(String) is already defined\".\n\nThe nuance worth knowing is that the JVM's method descriptor does include the return type, like `(II)I`. The JVM allows methods that differ only in return type, and `javac` generates them itself as bridge methods for generics. The restriction is a language rule.",
            },
            {
              question: "What does `static` mean on a method, at a basic level?",
              answer:
                "The method belongs to the class, not to an object, so I can call it as `ClassName.method()` without creating anything. `main` is static because the JVM has to call it before any object exists.\n\nIn bytecode it's called with `invokestatic`, and it has no `this`. Its parameters start at local slot 0, while in an instance method slot 0 is `this`. I saw that in the local variable table with `javap`.",
            },
            {
              question: "What is a varargs parameter?",
              answer:
                "A parameter declared with `...`, like `int... nums`, that accepts zero or more arguments of that type. It has to be the last parameter, and there can be only one.\n\nInside the method it's a real array: the descriptor is `([I)I`, and the caller builds the array. `javap` showed `newarray int` before each call, including `new int[0]` for `sum()`, which is why the parameter is never `null` when called with no arguments.",
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
              question: "Is Java pass by value or pass by reference? Explain precisely.",
              answer:
                "Always pass by value. The parameter is a new variable initialized with a copy of the argument's value. For a primitive that's the number. For an object type, it's the reference, so the method gets a copy of the pointer, not the object and not the caller's variable.\n\nThat's why a method can change an object's contents and the caller sees it, but can't make the caller's variable point somewhere else. In my `SameObject` test, the parameter had the caller's identity hash code until I reassigned it, and after that the caller still had the original object, with the appended text.",
            },
            {
              question: "If you pass an array to a method and modify an element, does the caller see it? Why?",
              answer:
                "Yes. The method gets a copy of the reference, and both copies point to the same array on the heap, so `arr[0] = 99` writes into the one array that both sides see.\n\nIn my `PassByValueDemo`, `changeArray` turned `[1, 2, 3]` into `[99, 2, 3]` in `main`. Nothing was passed by reference; two variables just held the same pointer.",
            },
            {
              question: "If you reassign the array parameter to a new array inside the method, does the caller see it? Why not?",
              answer:
                "No. Reassigning only changes the method's own copy of the reference, in its own frame. The caller's variable is a different slot in a different frame and still points at the original array.\n\nIn my test, `reassignArray` pointed `arr` at `{7, 8, 9}` and even wrote `100` into it, and `main` still printed `[1, 2, 3]`. The new array became garbage when the method returned.",
            },
            {
              question: "What bytecode instruction is used to call a static method?",
              answer:
                "`invokestatic`, followed by a constant pool index that refers to the class, name and descriptor, like `invokestatic #7 // Method add:(II)I`.\n\nIt's one of five: `invokevirtual` for instance methods on a class type, `invokeinterface` through an interface type, `invokespecial` for constructors and `super.` calls, and `invokedynamic` for lambdas and string concatenation. Since Java 11, private instance methods use `invokevirtual`, not `invokespecial` as older material says. I checked that with `javap` on JDK 21.",
            },
            {
              question: "What happens to a method's local variables when it returns?",
              answer:
                "They're gone. They live in the method's frame, and the frame is discarded on return, or when an exception unwinds through it. The next call gets a fresh frame.\n\nMy `FreshLocals` program printed `local = 1` on all three calls while a static counter went 1, 2, 3. Objects that a local pointed to are a separate matter: they're on the heap and live as long as something still references them, like a returned value.",
            },
            {
              question: "What happens to the JVM stack when method A calls method B?",
              answer:
                "A new frame for B is pushed on top of A's frame on the same thread's stack, sized from B's `locals=` and `stack=`. A's frame stays where it is, with A's position saved, waiting.\n\nB's arguments come off A's operand stack into B's first local slots. When B returns, its frame is popped and the result, if any, goes onto A's operand stack, and A continues right after the invoke instruction.",
            },
            {
              question: "Why can't you overload methods based only on return type?",
              answer:
                "Because the compiler picks an overload from the call's arguments, and the return type isn't visible from the call. With `parse(\"5\");` as a statement, or `Object o = parse(\"5\")`, there'd be no way to choose. So the JLS makes the signature just name plus parameter types, and two methods with the same signature are a duplicate.\n\n`javac` reported \"method parse(String) is already defined\" when I tried. The JDK's own answer is different names: `Integer.parseInt` and `Long.parseLong`.",
            },
            {
              question: "When does the compiler decide which overloaded method to call: compile time or runtime?",
              answer:
                "Compile time, from the static (declared) types of the arguments. The exact descriptor is written into the bytecode.\n\nMy `StaticType` example shows it: the same `String` object went to `describe(String)` through a `String` variable and to `describe(Object)` through an `Object` variable. What happens at runtime is a different thing, overriding: for instance methods, `invokevirtual` picks the implementation from the object's actual class. But it only chooses among overrides of the overload `javac` already fixed.",
            },
            {
              question: "What compile error do you get if a non-void method has a path with no return?",
              answer:
                "`missing return statement`, reported at the closing brace of the method. `javac` checks every path through the code, so an `if`/`else if` chain without a final `else` is enough to trigger it.\n\nMy `band(int score)` example returned on `>= 90` and `>= 75` only, and failed at line 8. A path that ends in `throw` is fine, since it never reaches the end of the method.",
            },
            {
              question: "What is a StackOverflowError, and what usually causes it?",
              answer:
                "An `Error` the JVM throws when a thread needs a new frame and its stack has no room left. It happens at runtime, never at compile time. The usual cause is recursion without a working base case. Very deep but correct recursion can hit it too.\n\nI measured it: a trivial recursive method got about 21,000 to 25,000 levels deep on the default 1 MB stack, and the number changed every run because JIT-compiled frames are smaller than interpreted ones. The stack trace is the giveaway, the same line repeated over and over.",
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
              question: "Explain pass by value at the stack-frame level: what exactly is copied, and where?",
              answer:
                "The caller evaluates each argument and pushes the resulting value onto its own operand stack: an `int`, a `double`, or a reference. On the invoke instruction, those values become the initial contents of the callee's local variable slots, starting at slot 0 for a static method or slot 1 after `this` for an instance method. So what's copied is the value in the variable, never the variable, and never the object a reference points to.\n\nIn HotSpot's interpreter there isn't even a physical copy: the callee's local area is laid over the caller's argument slots. But the slots now belong to the callee's frame, and nothing in the callee refers back to the caller's locals. That's why `tryToChange(a)` couldn't change `a`.",
            },
            {
              question: "Why does Java's \"pass the reference by value\" model make swap(a, b) impossible for two objects (or two ints) inside a method?",
              answer:
                "Because a swap has to change which values the caller's two variables hold, and a method never gets access to the caller's variables, only copies of their values. Swapping the copies works perfectly and then the frame is thrown away.\n\nMy `Swap` program printed `1 2` and `left right` after the swaps. What works is swapping the contents of a shared object, like two elements of an array, which printed `2 1`. Or returning the new pair, for example as a record.",
            },
            {
              question: "How does the JVM resolve which overload to call when no exact match exists (widening, boxing, varargs priority)?",
              answer:
                "Strictly speaking it's `javac`, not the JVM, at compile time. JLS 15.12.2 has three phases. Phase 1 allows only widening primitive and reference conversions, no boxing or varargs. Phase 2 adds boxing and unboxing. Phase 3 adds varargs. It stops at the first phase with any applicable method and then picks the most specific; if there's no single most specific, it's an ambiguity error.\n\nI ran `m(5)` against `m(long)`, `m(Integer)` and `m(int...)`: widening to `long` won. Without `m(long)`, boxing won. Only with varargs alone did varargs run. And `pay(Integer, int)` next to `pay(int, Integer)` with `pay(100, 10)` gave \"reference to pay is ambiguous\".",
            },
            {
              question: "What is method inlining, and why does it make \"many small methods\" a non-issue for performance?",
              answer:
                "Inlining is the JIT replacing a call with the body of the called method, so there's no frame, no argument passing and no return, and the combined code gets optimized together. HotSpot inlines small methods (35 bytes of bytecode by default) at any call site, and hot ones up to 325 bytes.\n\nWith `-XX:+PrintInlining` I watched an 8-byte `fare` method get inlined into its hot caller by both C1 and C2. Small methods are the easiest case. What blocks inlining is huge methods, very deep call chains, and megamorphic virtual calls, not having many small methods.",
            },
            {
              question: "Explain the family of *return bytecode instructions and why each type has its own.",
              answer:
                "There are six: `ireturn` for `int` and everything the JVM treats as int (`boolean`, `byte`, `char`, `short`), `lreturn`, `freturn`, `dreturn`, `areturn` for any reference including arrays, and `return` for void. I compiled one method per type and `javap` showed exactly that mapping.\n\nThe JVM's instruction set is typed so the verifier can prove type safety statically. With a typed return, it can check before running anything that the value on top of the operand stack matches the method's declared return type, and that a `long` or `double` is treated as the two-slot value it is.",
            },
            {
              question: "How do arguments get from the caller's operand stack into the callee's local variable slots?",
              answer:
                "The caller pushes them in order, left to right, then executes the invoke instruction. The JVM resolves the method, allocates a frame with its `locals=` and `stack=` sizes, and the argument values, popped from the caller's operand stack, become the callee's locals: `this` in slot 0 for an instance method, then each parameter, with `long` and `double` taking two slots.\n\nIn my `Slots` example, `fare(int km, long waitSec, String city)` had `this` in 0, `km` in 1, `waitSec` in 2 and 3, and `city` in 4. In HotSpot's interpreter the callee's local area overlaps the caller's argument slots, so it's done without moving any bytes.",
            },
            {
              question: "What's the relationship between the JVM stack's depth limit and the size of each frame?",
              answer:
                "The limit is in bytes, not frames. Each thread's stack has a fixed size (`-Xss`, 1 MB by default on 64-bit Linux), so the maximum depth is roughly that size divided by the frame size. Methods with more locals and a bigger operand stack get fewer levels.\n\nIn my test, a method with eight `long` slots only got about a third as deep as a trivial one. `-Xss4m` multiplied the depth, `-Xss512k` cut it. And with the JIT on, the same program gave different depths each run, because compiled frames are smaller than interpreted ones. With `-Xint` it was the same every time.",
            },
            {
              question: "Why are parameters occupying the first local-variable slots, and what occupies slot 0 in an instance method?",
              answer:
                "Because that's how the call hands them over: the JVM specification says the arguments become the callee's first local variables, in order. The parameters are just locals that happen to be initialized by the caller, and the method's own locals come after them.\n\nIn an instance method, slot 0 is `this`, the receiver, passed as a hidden first argument. That's why instance methods start with `aload_0` before a `getfield`, and why `javap` reported `args_size=4` for a three-parameter instance method.",
            },
            {
              question: "How would you read a stack trace from a production exception to find the originating call?",
              answer:
                "Top to bottom. The first `at` line is where the exception was thrown, and every line below is a caller that was waiting on the one above. I scan for the first frame in our own packages, because the top is often JDK or framework code, and with `Caused by:` chains the root cause is the last one.\n\nOne thing to remember is that methods that already returned aren't in the trace. In my `TraceDemo`, the NPE was in `assignDriver`, but the `null` came from `findName`, which had already returned and wasn't listed. The helpful NPE message even pointed at the slot, `<local2>`, or `name` once compiled with `-g`.",
            },
            {
              question: "Why is a recursive method conceptually a \"method calling itself,\" yet mechanically just another frame push?",
              answer:
                "Because the JVM doesn't care who the callee is. A recursive call is an ordinary `invokestatic` or `invokevirtual` that happens to name the current method, and it gets a new, separate frame with its own copies of the parameters and locals, just like calling any other method.\n\nThat's why each level has its own `n`, and why recursion depth is limited by the stack. Java doesn't do tail-call elimination, so even a call in tail position keeps the frame. My `Depth` program overflowed after about 22,000 levels on the default stack.",
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
              question: "A teammate says \"Java passes objects by reference.\" Demonstrate with a short example why that's inaccurate.",
              answer:
                "I'd show a method that reassigns its parameter: `static void reset(int[] arr) { arr = new int[3]; }`. With pass by reference, the caller's array would now be the new one. In Java it isn't, the caller still has the old array.\n\nThat's what my `reassignArray` test printed: `[1, 2, 3]`, unchanged. The accurate sentence is \"Java passes references by value\". The method can mutate the object both sides share, but can't rebind the caller's variable.",
            },
            {
              question: "A utility method sorts a list passed to it, and the caller is surprised their original list changed. Explain what happened and how to avoid it.",
              answer:
                "The method got a copy of the reference to the same `ArrayList`, and `Collections.sort` sorts in place, so it reordered the caller's list. Nothing about pass-by-value prevents mutation of a shared object.\n\nI reproduced it: `topFare` returned `340` and left the caller's list as `[340, 120, 90]` instead of arrival order. A version that copies first, `new ArrayList<>(fares)`, left it as `[120, 340, 90]`. Besides copying inside the method, the caller can pass `List.copyOf(...)`, which makes the mutation fail loudly with `UnsupportedOperationException`, and the method's name should say if it mutates.",
            },
            {
              question: "Your code compiles, but at runtime it dies with StackOverflowError. What's your first suspicion, and how do you confirm it?",
              answer:
                "Recursion that doesn't terminate: a missing or unreachable base case, or two methods calling each other, which in Spring is sometimes a pair of beans or a `toString`/`equals` that recurses through a bidirectional relationship like two JPA entities referencing each other.\n\nTo confirm, I look at the stack trace. It's the same one or two lines repeating. The trace is capped at 1024 frames by default, so the bottom with the entry point may be cut off. If the recursion is legitimately deep, I'd rewrite it as a loop before raising `-Xss`, because the depth is not even stable run to run, as my measurements showed.",
            },
            {
              question: "Two overloads exist, print(int) and print(double). You call print(5). Which runs, and why? What about print(5L)?",
              answer:
                "`print(5)` runs `print(int)`. Both apply in phase 1, `int` exactly and `double` by widening, and `int` is more specific. `print(5L)` runs `print(double)`, because a `long` can't narrow to `int`, but it can widen to `double`.\n\nI ran exactly this and got `print(int)` and `print(double)`. `print('A')` also picked `print(int)`, since `char` widens to `int`. One catch with the `5L` case: a `long` above 2^53 loses precision when it widens to `double`, silently.",
            },
            {
              question: "A method with five parameters of the same type keeps getting called with arguments in the wrong order. What design change would you propose?",
              answer:
                "Stop passing them as five positional values of one type. I'd group them into a parameter object, usually a `record` like `TripRequest(long riderId, long driverId, long pickupZone, ...)` built with named accessors or a builder, or use small distinct types (`RiderId`, `DriverId`) so a swap is a compile error instead of a bug.\n\nThe compiler only checks types and count, and `(long, long, long, long, long)` accepts any order. It's the same lesson as the overload rules: if correctness depends on argument position alone, the type system can't help.",
            },
          ],
        },
        {
          type: "paragraph",
          text: "For the sorting scenario, this is the program I ran:",
        },
        {
          type: "code",
          language: "java",
          title: "SortSurprise.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SortSurprise {
    // Looks like a read-only helper, but sorts the caller's list in place
    static int topFare(List<Integer> fares) {
        Collections.sort(fares, Collections.reverseOrder());
        return fares.get(0);
    }

    // Safer: work on a copy, the caller's list is never touched
    static int topFareSafe(List<Integer> fares) {
        List<Integer> copy = new ArrayList<>(fares);
        copy.sort(Collections.reverseOrder());
        return copy.get(0);
    }

    public static void main(String[] args) {
        List<Integer> arrivalOrder = new ArrayList<>(List.of(120, 340, 90));
        System.out.println(topFareSafe(arrivalOrder) + " " + arrivalOrder);
        System.out.println(topFare(arrivalOrder) + " " + arrivalOrder);

        List<Integer> locked = List.copyOf(arrivalOrder);
        try {
            topFare(locked);
        } catch (UnsupportedOperationException e) {
            System.out.println("immutable list: " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `340 [120, 340, 90]
340 [340, 120, 90]
immutable list: java.lang.UnsupportedOperationException`,
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
            "Write `MethodsDemo.java` with a method that takes two `int`s and returns their sum. Call it with `15` and `27` and print the result.",
            "Add a `void` method that takes a `String` name and prints a greeting. Call it twice with different names.",
            "Add two overloads of `multiply`, one for `int` and one for `double`. Call `multiply(6, 7)` and `multiply(2.5, 4.0)` and print both.",
            "Write a method that sets its `int` parameter to `1000`. Call it with a variable holding `10`, then print the variable.",
            "Write two methods that take an `int[]`: one sets `arr[0] = 42`, the other reassigns `arr` to `new int[] {0, 0, 0}`. Call both on `{1, 2, 3}`, printing with `Arrays.toString` after each.",
            "Before running steps 4 and 5, write your predicted output as a comment, and a comment explaining what was copied in each call. Then run it and compare. Bonus: run `javap -c MethodsDemo` and find the `invokestatic` for each overload.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: `42`, `Hello, Asha!` and `Hello, Ravi!` (or your names), then `42` and `10.0` from the two `multiply` overloads. The variable still prints `10`. The array prints `[42, 2, 3]` after the first method, and still `[42, 2, 3]` after the reassigning one, because only the method's copy of the reference was repointed. In `javap`, the two `multiply` calls show up as `multiply:(II)I` and `multiply:(DD)D`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `ANATOMY    modifiers  returnType  name(params) { body }
SIGNATURE  name + parameter types   (return type: no)
DESCRIPTOR JVM's view, includes return:  add:(II)I

PASSING    always by value
           primitive -> copy of the value
           reference -> copy of the pointer
             mutate the object       caller sees it
             reassign the parameter  caller doesn't

OVERLOADS  chosen by javac from declared types
           1 widening  2 boxing  3 varargs
           tie -> "reference to m is ambiguous"

CALLS      invokestatic   static methods
           invokevirtual  instance (and private, 11+)
           invokeinterface  via an interface type
           invokespecial  <init>, super.m()
           invokedynamic  lambdas, string +

FRAME      locals (params first, this = slot 0,
           long/double = 2 slots) + operand stack
           + frame data;  sizes: stack= locals=
RETURN     ireturn lreturn freturn dreturn areturn return

STACK      one per thread, -Xss (1 MB default)
           too deep -> StackOverflowError at runtime`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "If someone says Java passes objects by reference: no. It passes references by value, and a method can't rebind the caller's variable.",
            "Overloading is a compile-time decision on declared types. Overriding is the runtime one, and it comes with classes and inheritance.",
            "A call is a frame push and a return is a frame pop. Stack traces, recursion limits and local-variable scope all follow from that. The full stack-versus-heap picture gets its own lesson.",
          ],
        },
      ],
    },
  ],
};
