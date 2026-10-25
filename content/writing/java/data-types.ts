import type { Lesson } from "../types";

export const dataTypes: Lesson = {
  slug: "data-types",
  date: "2026-09-26",
  title: "Data Types",
  description:
    "Java's eight primitive types and reference types: what the language guarantees about each, how they look in bytecode and memory, why copying an array doesn't copy it, and what boxing really costs.",
  tags: ["Core Java", "Data Types", "Primitives", "Memory"],
  sections: [
    {
      title: "What Data Types Are",
      blocks: [
        {
          type: "paragraph",
          text: "Every variable in the Variables lesson had a type, `int`, `String` and so on, and I treated those as a given. This lesson opens them up.",
        },
        {
          type: "paragraph",
          text: "A **data type** tells the compiler and the JVM three things about a value: which values are allowed, which operations make sense on it, and how it is represented. Java is statically typed, so every variable and every expression has a type known at compile time, and `javac` rejects code that doesn't fit before anything runs.",
        },
        {
          type: "paragraph",
          text: "Types are why `int x = \"hello\";` fails at compile time instead of at 2 a.m. in production, why `+` means addition for two `int`s and concatenation when one side is a `String`, and why the JVM knows whether a local is one stack slot or two. They also explain something that confused me early on: why copying an `int` gives me an independent copy, but copying an array gives me a second name for the same array.",
        },
        {
          type: "paragraph",
          text: "Java splits its types into exactly two kinds. **Primitive types** are the eight built-in value types (`byte`, `short`, `int`, `long`, `float`, `double`, `char`, `boolean`). **Reference types** are everything else: classes, interfaces, arrays, enums, records. A primitive variable holds the value itself. A reference variable holds a reference to an object.",
        },
      ],
    },
    {
      title: "Where They Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java's type rules were a reaction to C. In C, the standard only sets **minimum** ranges: an `int` must hold at least -32767 to 32767 (16 bits), a `long` at least 32 bits. The actual width is left to the compiler and the target. `int` was 16 bits on many old DOS compilers and 32 bits on most modern ones, and `long` is 64 bits on 64-bit Linux but 32 bits on 64-bit Windows. Code that silently assumed one size broke when it moved. C99 later added exact-width types like `int32_t`, but plain `int` is still \"at least this big\".",
        },
        {
          type: "paragraph",
          text: "Java's designers took the opposite route from 1.0: every primitive type has one exact range and one exact behaviour, written into the Java Language Specification (JLS §4.2) and mirrored in the JVM specification. An `int` is a 32-bit two's-complement integer on Windows, Linux and macOS, on 32-bit and 64-bit hardware, on every JVM. That is the concrete meaning of \"architecture neutral\" from the Features of Java lesson.",
        },
        {
          type: "paragraph",
          text: "The other early decision was to keep primitives at all. Smalltalk, and later Python and Ruby, made everything an object, including numbers. Java kept numbers as plain values that live directly in variables and arrays, with no object header and no garbage collection, and added wrapper classes (`Integer`, `Double`, ...) for when an object is needed. Autoboxing between the two arrived in Java 5. That split is a performance trade-off, and I measure what it costs further down.",
        },
        {
          type: "callout",
          tone: "note",
          text: "The split is still being worked on. Java 10's `var` changed nothing about it (the type is still fixed at compile time, just inferred). Primitive types in patterns, `instanceof` and `switch` have been in preview since JDK 23. And Project Valhalla is working on value classes, objects without identity that the JVM can lay out flat like primitives. None of that is in Java 21, and everything in this lesson is current there.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of it as shipping containers and shipping labels.",
        },
        {
          type: "list",
          items: [
            "Before containers were standardized, every port used different box sizes and loading was a mess. That's C, where `int` can be a different size on a different machine.",
            "Java's primitives are a fixed catalogue of container sizes. A `byte` always holds 8 bits of cargo, an `int` 32, a `long` 64, at every port in the world. No negotiation.",
            "A reference type isn't a container at all. It's a **label** with the address of a warehouse (the heap) where the actual cargo, the object, is stored. The label is small and the same size whether the warehouse holds one `Integer` or a million-element `ArrayList`.",
            "Copying a container gives me a second container with the same cargo. Copying a label gives me a second label pointing at the **same** warehouse. If someone rearranges the warehouse using either label, both see it.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks: the container size is about the range of values, not necessarily the bytes the JVM uses to store it. A `byte` local variable takes a full slot in the stack frame, same as an `int`. I show that in the bytecode below.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The eight primitive types",
        },
        {
          type: "table",
          headers: ["Type", "Bits", "Values", "Default", "Literal"],
          rows: [
            ["`byte`", "8", "-128 to 127", "`0`", "`(byte) 10` or a fitting constant"],
            ["`short`", "16", "-32,768 to 32,767", "`0`", "a fitting constant"],
            ["`int`", "32", "about ±2.1 billion", "`0`", "`42`, `0xFF`, `0b1010`, `1_000`"],
            ["`long`", "64", "about ±9.2 × 10^18", "`0L`", "`42L`"],
            ["`float`", "32", "IEEE 754 single, ~7 digits", "`0.0f`", "`3.14f`"],
            ["`double`", "64", "IEEE 754 double, ~15-16 digits", "`0.0d`", "`3.14`, `1.5e3`"],
            ["`char`", "16", "0 to 65,535, a UTF-16 code unit", "`'\\u0000'`", "`'A'`, `'\\n'`, `'\\u0041'`"],
            ["`boolean`", "not specified", "`true`, `false`", "`false`", "`true`"],
          ],
        },
        {
          type: "paragraph",
          text: "The integer types are signed two's complement. `char` is the only unsigned one. I didn't want to copy ranges from a table, so I asked the wrapper classes, which define them as constants:",
        },
        {
          type: "code",
          language: "java",
          title: "Ranges.java",
          code: `public class Ranges {
    public static void main(String[] args) {
        System.out.printf("%-7s %5s  %-22s %s%n", "type", "bits", "min", "max");
        System.out.printf("%-7s %5d  %-22d %d%n", "byte",  Byte.SIZE,    Byte.MIN_VALUE,    Byte.MAX_VALUE);
        System.out.printf("%-7s %5d  %-22d %d%n", "short", Short.SIZE,   Short.MIN_VALUE,   Short.MAX_VALUE);
        System.out.printf("%-7s %5d  %-22d %d%n", "int",   Integer.SIZE, Integer.MIN_VALUE, Integer.MAX_VALUE);
        System.out.printf("%-7s %5d  %-22d %d%n", "long",  Long.SIZE,    Long.MIN_VALUE,    Long.MAX_VALUE);
        System.out.printf("%-7s %5d  %-22d %d%n", "char",  Character.SIZE,
            (int) Character.MIN_VALUE, (int) Character.MAX_VALUE);
        System.out.printf("%-7s %5d  %-22s %s%n", "float", Float.SIZE,   Float.MIN_VALUE,   Float.MAX_VALUE);
        System.out.printf("%-7s %5d  %-22s %s%n", "double", Double.SIZE, Double.MIN_VALUE,  Double.MAX_VALUE);
        System.out.println("boolean has no SIZE constant: " + Boolean.TRUE + " / " + Boolean.FALSE);
    }
}`,
        },
        {
          type: "output",
          text: `type     bits  min                    max
byte        8  -128                   127
short      16  -32768                 32767
int        32  -2147483648            2147483647
long       64  -9223372036854775808   9223372036854775807
char       16  0                      65535
float      32  1.4E-45                3.4028235E38
double     64  4.9E-324               1.7976931348623157E308
boolean has no SIZE constant: true / false`,
        },
        {
          type: "paragraph",
          text: "One trap in that output: `Float.MIN_VALUE` and `Double.MIN_VALUE` are the smallest **positive** values, not the most negative ones. The most negative `double` is `-Double.MAX_VALUE`.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "boolean is not \"1 bit\"",
          text: "My old notes said `boolean` is \"1 bit conceptually, often 1 byte\". The JLS only says it has two values, `true` and `false`, and gives it no size. The JVM spec goes further: there are no bytecode instructions for `boolean` at all. `boolean` locals and fields are handled as `int` values 0 and 1, and `boolean[]` uses the same instructions as `byte[]`, one byte per element in HotSpot. A `boolean` field in HotSpot also takes one byte. Nothing in Java stores a lone `boolean` in one bit; `java.util.BitSet` is what to use for that.",
        },
        {
          type: "heading",
          text: "char is a UTF-16 code unit, not a character",
        },
        {
          type: "paragraph",
          text: "Calling `char` \"a single Unicode character\" was true in 1996, when Unicode fit in 16 bits. Since Java 5, a `char` is a UTF-16 **code unit**. Most characters I'd type, including `₹`, are one code unit. Anything outside the Basic Multilingual Plane, like most emoji, is a pair of `char`s (a surrogate pair). I show that in the examples.",
        },
        {
          type: "heading",
          text: "Reference types",
        },
        {
          type: "paragraph",
          text: "Everything that isn't one of the eight: `String`, arrays (even `int[]`), every class and interface, enums and records. A reference variable holds either `null` or a **reference** to an object on the heap. The JVM spec doesn't say what a reference looks like inside. In HotSpot it is a pointer, usually a compressed 32-bit one, but Java never lets me see it, do arithmetic on it or cast a number into it. That's the difference from a C pointer.",
        },
        {
          type: "table",
          headers: ["", "Primitive", "Reference"],
          rows: [
            ["The variable holds", "the value itself", "`null` or a reference to an object"],
            ["Can be `null`", "no, never", "yes"],
            ["Default as a field or array element", "`0`, `0.0`, `false`, `'\\u0000'`", "`null`"],
            ["Copying with `=`", "copies the value", "copies the reference; one object, two names"],
            ["`==` compares", "values", "whether both refer to the same object"],
            ["Has methods", "no (`5.toString()` doesn't exist)", "yes"],
            ["Usable as a generic type argument", "no (`List<int>` doesn't compile)", "yes"],
          ],
        },
        {
          type: "heading",
          text: "Default values, and where there are none",
        },
        {
          type: "paragraph",
          text: "Fields and array elements start at a default value. I declared one static field of each kind and printed them without assigning anything:",
        },
        {
          type: "code",
          language: "java",
          title: "Defaults.java",
          code: `public class Defaults {
    static byte b; static short s; static int i; static long l;
    static float f; static double d; static char c; static boolean flag;
    static String name; static int[] numbers;

    public static void main(String[] args) {
        System.out.println("byte=" + b + " short=" + s + " int=" + i + " long=" + l);
        System.out.println("float=" + f + " double=" + d + " boolean=" + flag);
        System.out.println("char as int=" + (int) c);
        System.out.println("String=" + name + " int[]=" + numbers);
        int[] arr = new int[3]; String[] strs = new String[2];
        System.out.println("int[] element=" + arr[1] + " String[] element=" + strs[0]);
    }
}`,
        },
        {
          type: "output",
          text: `byte=0 short=0 int=0 long=0
float=0.0 double=0.0 boolean=false
char as int=0
String=null int[]=null
int[] element=0 String[] element=null`,
        },
        {
          type: "paragraph",
          text: "Local variables are different: they get **no** default. The compiler's definite-assignment check refuses to let me read one before I assign it:",
        },
        {
          type: "code",
          language: "java",
          title: "LocalNoDefault.java",
          code: `public class LocalNoDefault {
    public static void main(String[] args) {
        int total;
        System.out.println(total);
    }
}`,
        },
        {
          type: "output",
          text: `LocalNoDefault.java:4: error: variable total might not have been initialized
        System.out.println(total);
                           ^
1 error`,
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "The sizes in the table are about **values**: what range a type can hold and how arithmetic on it behaves. How many bytes the JVM actually uses to store a variable is a separate question, and the bytecode answers it.",
        },
        {
          type: "heading",
          text: "Locals live in slots, not in \"exactly 1 byte\"",
        },
        {
          type: "paragraph",
          text: "I compiled one local of every type with `-g` so `javap` would show the local variable table:",
        },
        {
          type: "code",
          language: "java",
          title: "Slots.java",
          code: `public class Slots {
    public static void main(String[] args) {
        byte b = 10;
        short s = 1000;
        int i = 100000;
        long l = 10000000000L;
        float f = 3.14f;
        double d = 3.14159;
        char c = 'A';
        boolean flag = true;
        String name = "Prince";
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
       0: bipush        10
       2: istore_1
       3: sipush        1000
       6: istore_2
       7: ldc           #7                  // int 100000
       9: istore_3
      10: ldc2_w        #8                  // long 10000000000l
      13: lstore        4
      15: ldc           #10                 // float 3.14f
      17: fstore        6
      19: ldc2_w        #11                 // double 3.14159d
      22: dstore        7
      24: bipush        65
      26: istore        9
      28: iconst_1
      29: istore        10
      31: ldc           #13                 // String Prince
      33: astore        11
      35: return
    ...
    LocalVariableTable:
      Start  Length  Slot  Name   Signature
          0      36     0  args   [Ljava/lang/String;
          3      33     1     b   B
          7      29     2     s   S
         10      26     3     i   I
         15      21     4     l   J
         19      17     6     f   F
         24      12     7     d   D
         28       8     9     c   C
         31       5    10  flag   Z
         35       1    11  name   Ljava/lang/String;`,
        },
        {
          type: "paragraph",
          text: "What I read from it:",
        },
        {
          type: "list",
          items: [
            "`byte`, `short`, `char` and `boolean` are all stored with `istore`, the `int` instruction, and each takes one slot, exactly like `i`. The JVM's operand stack and local variables have no smaller unit than an `int`. The narrow types only matter in fields and arrays, and in what `javac` lets me assign.",
            "`long` and `double` take **two** slots each: `l` is in slot 4 and the next variable starts at 6, `d` is in 7 and the next starts at 9. The JVM spec defines it that way, and they have their own instructions (`lstore`, `dstore`, `ldc2_w`).",
            "`boolean flag = true` became `iconst_1`. At the bytecode level `true` is just the `int` 1.",
            "`'A'` became `bipush 65`. A `char` literal is a number.",
            "The reference `name` takes one slot, the same as an `int`, and `astore` (\"a\" for address) puts the reference there. The string data is not in the frame at all.",
            "The `Signature` column has the type descriptors the class file uses: `B S I J F D C Z` for the primitives (`J` for long, `Z` for boolean), `L...;` for classes and `[` for arrays.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "The compiler doesn't reserve \"exactly the type's size\"",
          text: "My old notes had pseudo-code where the compiler reserves exactly 1 byte for a `byte` local and 4 for an `int`. In reality `javac` assigns **slot numbers**, one per variable or two for `long` and `double`, and the JVM decides how wide a slot physically is (on 64-bit HotSpot an interpreter slot is 8 bytes). After the JIT compiles the method, a local may not be in memory at all, just in a CPU register.",
        },
        {
          type: "heading",
          text: "boolean has no instructions of its own",
        },
        {
          type: "code",
          language: "java",
          title: "Flags.java",
          code: `public class Flags {
    boolean active;
    byte level;

    void update() {
        boolean[] seen = new boolean[4];
        seen[1] = true;
        active = seen[1];
        level = 3;
    }
}`,
        },
        {
          type: "output",
          text: `  void update();
    Code:
       0: iconst_4
       1: newarray       boolean
       3: astore_1
       4: aload_1
       5: iconst_1
       6: iconst_1
       7: bastore
       8: aload_0
       9: aload_1
      10: iconst_1
      11: baload
      12: putfield      #7                  // Field active:Z
      15: aload_0
      16: iconst_3
      17: putfield      #13                 // Field level:B
      20: return`,
        },
        {
          type: "paragraph",
          text: "The array is created as a real `boolean` array (`newarray boolean`), but it's written and read with `bastore` and `baload`, the **byte** array instructions. The field keeps its own descriptor, `active:Z` versus `level:B`, so reflection and the verifier still know it's a `boolean`. That is exactly what JVM spec §2.3.4 describes.",
        },
        {
          type: "heading",
          text: "Copying a primitive vs copying a reference",
        },
        {
          type: "code",
          language: "java",
          title: "Copy.java",
          code: `public class Copy {
    public static void main(String[] args) {
        int a = 10;
        int b = a;
        int[] arr1 = {1, 2, 3};
        int[] arr2 = arr1;
        arr2[0] = 99;
    }
}`,
        },
        {
          type: "output",
          text: `       0: bipush        10
       2: istore_1          // a = 10
       3: iload_1
       4: istore_2          // b = a: copy the int
       5: iconst_3
       6: newarray       int  // the ONE array, on the heap
       ...
      20: astore_3          // arr1 = reference to it
      21: aload_3
      22: astore        4   // arr2 = arr1: copy the reference
      24: aload         4
      26: iconst_0
      27: bipush        99
      29: iastore           // write into the shared array`,
        },
        {
          type: "paragraph",
          text: "(Trimmed; the comments are mine.) Both assignments compile to the same shape, load from one slot and store into another. The difference is what's in the slot. For `b = a`, it's the number 10, so `b` gets its own 10. For `arr2 = arr1`, it's a reference, so `arr2` gets a second copy of the reference, and there's still only one `newarray` in the whole method.",
        },
        {
          type: "heading",
          text: "How big is a reference?",
        },
        {
          type: "paragraph",
          text: "Inside the frame, one slot. Inside objects and arrays on the heap, 64-bit HotSpot uses **compressed oops** by default whenever the heap is below about 32 GB, so a reference field or array element is 4 bytes instead of 8. I checked my JVM's flags:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+PrintFlagsFinal -version | grep -E " UseCompressedOops | UseCompressedClassPointers | ObjectAlignmentInBytes "`,
        },
        {
          type: "output",
          text: `     int ObjectAlignmentInBytes                   = 8                              {product lp64_product} {default}
     bool UseCompressedClassPointers               = true                           {product lp64_product} {default}
     bool UseCompressedOops                        = true                           {product lp64_product} {ergonomic}`,
        },
        {
          type: "paragraph",
          text: "The reference size doesn't depend on the object. A reference to a 16-byte `Integer` and a reference to a 4 MB array are the same 4 bytes. The heap snapshot in the Performance section shows this directly: an `Integer[]` of a million elements is 4,000,016 bytes.",
        },
      ],
    },
    {
      title: "What Lives Where",
      blocks: [
        {
          type: "diagram",
          text: `  main() frame (JVM stack)            HEAP
┌──────────────────────────┐
│ slot 1  age      = 26    │
│ slot 2  isActive = 1     │      ┌──────────────────────┐
│ slot 3  name  ───────────┼─────▶│ String "Prince"      │
│ slot 4  arr1  ─────┐     │      │  header, hash, coder │
│ slot 5  arr2  ───┐ │     │      │  value ──▶ byte[6]   │
└──────────────────┼─┼─────┘      └──────────────────────┘
                   │ │            ┌──────────────────────┐
                   └─┴───────────▶│ int[3] {99, 2, 3}    │
                                  │  header, length = 3  │
                                  └──────────────────────┘`,
          caption: "Primitives sit in their slots. References are arrows. Two arrows can point at one object.",
        },
        {
          type: "paragraph",
          text: "`age` and `isActive` need nothing from the heap; their whole existence is the slot. `name` is two things: a reference in the frame and a `String` object on the heap (since Java 9 a `String` stores its text in a `byte[]`, Latin-1 when it can, which is why I drew the extra arrow). `arr1` and `arr2` are two slots holding the same reference.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "\"Primitives live on the stack\" is only half true",
          text: "A primitive **local** lives in the frame. A primitive **field** lives inside its object, so `Order.quantity` is on the heap with the rest of the `Order`. An `int[]`'s elements are on the heap too. The rule is that a primitive is stored inline wherever its variable is, and a reference type always involves an object somewhere else. (The JIT can blur even that with escape analysis, putting an object's fields in registers when the object never escapes a method.)",
        },
        {
          type: "paragraph",
          text: "When I print a reference, I don't get an address either:",
        },
        {
          type: "code",
          language: "java",
          title: "RefPrint.java",
          code: `public class RefPrint {
    public static void main(String[] args) {
        int[] numbers = {1, 2, 3};
        int[] same = numbers;
        System.out.println(numbers);
        System.out.println(same);
        System.out.println(Integer.toHexString(System.identityHashCode(numbers)));
    }
}`,
        },
        {
          type: "output",
          text: `[I@2a139a55
[I@2a139a55
2a139a55`,
        },
        {
          type: "paragraph",
          text: "`[I` is the class name of `int[]`, and `2a139a55` is the identity hash code, a number the JVM generates once and stores in the object header. It's the same for both variables because there's one object. It is not a memory address; the GC moves objects around and the hash stays the same.",
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
            "`javac` reads the declaration and its type. It checks the initializer against the type (`char c = \"A\"` fails here) and picks the instructions: `i...` for `int`, `byte`, `short`, `char` and `boolean`, `l...`, `f...`, `d...` for the others, `a...` for references.",
            "`javac` assigns the local a slot number: one slot, or two for `long` and `double`. The method's total (`max_locals`) is written into the class file, so the JVM knows how big to make each frame.",
            "At runtime, calling the method pushes a frame with that many slots. Nothing is written to a local until the code assigns it, which is why the compiler insists on definite assignment.",
            "For a primitive, the value is pushed (`bipush`, `ldc`, ...) and stored straight into the slot.",
            "For a reference, the object is created first: `new` plus a constructor call, `newarray` for an array, or for a string literal, `ldc` returns the interned `String` from the string pool. Then the reference is stored in the slot.",
            "Reading a primitive local gives the value. Reading a reference gives the reference, and field access, method calls or array indexing then follow it to the object (a `null` reference fails right there with `NullPointerException`).",
            "When the method returns, the frame is gone, primitives and references with it. The objects stay on the heap until nothing refers to them, and then the GC reclaims them.",
          ],
        },
      ],
    },
    {
      title: "Syntax and Literals",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Syntax.java (excerpt)",
          code: `// Primitive declarations
byte b = 10;
short s = 1000;
int i = 100000;
long l = 10000000000L;      // L: the literal itself is a long
float f = 3.14f;            // f: without it, 3.14 is a double
double d = 3.14159;
char c = 'A';               // single quotes
boolean flag = true;

// Reference declarations
String name = "Prince";
int[] numbers = {1, 2, 3};
Dog myDog = new Dog();

// Other literal forms
int hex = 0xFF;
int bin = 0b1010;
int oct = 017;              // leading 0 means octal
long million = 1_000_000L;
double sci = 1.5e3;
char tab = '\\t', uni = '\\u0041';`,
        },
        {
          type: "paragraph",
          text: "Wrapped in a class with a nested `Dog` and printed, these give:",
        },
        {
          type: "output",
          text: `10 1000 100000 10000000000 3.14 3.14159 A true
255 10 15 1000000 1500.0 [	] A
Prince 3 true`,
        },
        {
          type: "paragraph",
          text: "`017` printing `15` is the one that would bite me in real code: a leading zero makes an integer literal octal. Underscores (Java 7+) are only for readability and are allowed between digits. Use an uppercase `L`; a lowercase `l` looks like a `1`.",
        },
        {
          type: "heading",
          text: "Why L and f exist",
        },
        {
          type: "paragraph",
          text: "Every literal has a type of its own, before the compiler looks at the variable. A whole number without a suffix is an `int`. A decimal number without a suffix is a `double`. So `10000000000` without `L` is an `int` literal that doesn't fit in an `int`, and `javac` rejects it while reading the literal, before assignment is even considered:",
        },
        {
          type: "code",
          language: "java",
          title: "LongLiteral.java",
          code: `public class LongLiteral {
    public static void main(String[] args) {
        long l = 10000000000;
    }
}`,
        },
        {
          type: "output",
          text: `LongLiteral.java:3: error: integer number too large
        long l = 10000000000;
                 ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`float` has the opposite problem. `19.99` is a valid `double`, but putting a `double` into a `float` may lose precision, and Java never does a lossy conversion silently:",
        },
        {
          type: "code",
          language: "java",
          title: "FloatLiteral.java",
          code: `public class FloatLiteral {
    public static void main(String[] args) {
        float price = 19.99;
    }
}`,
        },
        {
          type: "output",
          text: `FloatLiteral.java:3: error: incompatible types: possible lossy conversion from double to float
        float price = 19.99;
                      ^
1 error`,
        },
        {
          type: "paragraph",
          text: "So why does `byte b = 10;` compile, when `10` is an `int`? There's a special rule (JLS §5.2): if the right side is a **constant expression** of type `int` and its value fits in the target `byte`, `short` or `char`, the narrowing is allowed. Going the other way, `int` to `float`, is a widening conversion and always allowed, even if it can round:",
        },
        {
          type: "code",
          language: "java",
          title: "ByteOk.java",
          code: `public class ByteOk {
    public static void main(String[] args) {
        byte ok = 100;        // constant fits in byte: allowed
        byte tooBig = 200;    // constant doesn't fit
        float fromInt = 3;    // int to float is widening: allowed
    }
}`,
        },
        {
          type: "output",
          text: `ByteOk.java:4: error: incompatible types: possible lossy conversion from int to byte
        byte tooBig = 200;    // constant doesn't fit
                      ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Only line 4 fails. The full rules for widening, narrowing and casts are the topic of the Type Casting lesson.",
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
          title: "DataTypesBasics.java",
          code: `public class DataTypesBasics {
    public static void main(String[] args) {
        int age = 26;
        double salary = 55000.50;
        char grade = 'A';
        boolean isEmployed = true;

        System.out.println("Age: " + age);
        System.out.println("Salary: " + salary);
        System.out.println("Grade: " + grade);
        System.out.println("Employed: " + isEmployed);
    }
}`,
        },
        {
          type: "output",
          text: `Age: 26
Salary: 55000.5
Grade: A
Employed: true`,
        },
        {
          type: "paragraph",
          text: "`55000.50` prints as `55000.5`. A `double` stores a number, not the way I typed it, and `Double.toString` prints the shortest form that identifies it. Formatting for display is a `String.format(\"%.2f\", salary)` job.",
        },
        {
          type: "heading",
          text: "Copying a value vs copying a reference",
        },
        {
          type: "code",
          language: "java",
          title: "PrimitiveVsReference.java",
          code: `public class PrimitiveVsReference {
    public static void main(String[] args) {
        int a = 10;
        int b = a;          // copies the value
        b = 20;
        System.out.println("a = " + a + ", b = " + b);

        int[] arr1 = {1, 2, 3};
        int[] arr2 = arr1;  // copies the reference, not the array
        arr2[0] = 99;
        System.out.println("arr1[0] = " + arr1[0] + ", same array? " + (arr1 == arr2));

        int[] arr3 = arr1.clone();  // a real copy
        arr3[0] = -1;
        System.out.println("arr1[0] = " + arr1[0] + ", arr3[0] = " + arr3[0]
            + ", same array? " + (arr1 == arr3));
    }
}`,
        },
        {
          type: "output",
          text: `a = 10, b = 20
arr1[0] = 99, same array? true
arr1[0] = 99, arr3[0] = -1, same array? false`,
        },
        {
          type: "paragraph",
          text: "This is the most important practical consequence of the whole lesson. `b` is an independent copy. `arr2` is a second name for the one array, so writing through it changes what `arr1` sees, and `==` confirms they're the same object. `clone()` (or `Arrays.copyOf`) makes an actual second array. For an array of objects, `clone()` is shallow: it copies the references, not the objects they point to.",
        },
        {
          type: "heading",
          text: "Java passes everything by value, including references",
        },
        {
          type: "code",
          language: "java",
          title: "PassByValue.java",
          code: `public class PassByValue {
    static void bump(int n)        { n = n + 1; }
    static void bumpFirst(int[] a) { a[0] = a[0] + 1; }
    static void replace(int[] a)   { a = new int[] {100}; }

    public static void main(String[] args) {
        int count = 5;
        bump(count);
        System.out.println("count = " + count);

        int[] counts = {5};
        bumpFirst(counts);
        System.out.println("counts[0] after bumpFirst = " + counts[0]);

        replace(counts);
        System.out.println("counts[0] after replace   = " + counts[0]);
    }
}`,
        },
        {
          type: "output",
          text: `count = 5
counts[0] after bumpFirst = 6
counts[0] after replace   = 6`,
        },
        {
          type: "paragraph",
          text: "The method gets a copy of whatever is in the caller's variable. For `count`, that's the number, so `bump` changes only its own copy. For `counts`, it's the reference, so `bumpFirst` can change the shared array. But `replace` only reassigns its own copy of the reference, and the caller never sees the new array. If Java were pass-by-reference, the last line would print `100`. The Methods lesson goes deeper on this.",
        },
        {
          type: "heading",
          text: "char is a number, and sometimes half a character",
        },
        {
          type: "code",
          language: "java",
          title: "CharDemo.java",
          code: `public class CharDemo {
    public static void main(String[] args) {
        char a = 'A';
        System.out.println(a + 1);            // char promoted to int
        System.out.println((char) (a + 1));
        char c = 66;                          // int constant that fits: allowed
        System.out.println(c);

        String rupee = "₹";
        String emoji = "😀";
        System.out.println(rupee.length() + " " + emoji.length() + " "
            + emoji.codePointCount(0, emoji.length()));
        System.out.printf("U+%04X U+%04X -> code point U+%X%n",
            (int) emoji.charAt(0), (int) emoji.charAt(1), emoji.codePointAt(0));
    }
}`,
        },
        {
          type: "output",
          text: `66
B
B
1 2 1
U+D83D U+DE00 -> code point U+1F600`,
        },
        {
          type: "paragraph",
          text: "`'A' + 1` is `66`, not `B`, because arithmetic promotes `char` to `int` (more on that in the Operators lesson). And the emoji is one character to a human but two `char`s to Java: a high surrogate `D83D` and a low surrogate `DE00`. `length()` counts `char`s; `codePointCount` counts actual characters. Anything that truncates or reverses user text by `char` index can split an emoji in half.",
        },
        {
          type: "heading",
          text: "Floating point is binary, not decimal",
        },
        {
          type: "code",
          language: "java",
          title: "FloatDemo.java",
          code: `import java.math.BigDecimal;

public class FloatDemo {
    public static void main(String[] args) {
        System.out.println(0.1 + 0.2);
        System.out.println(0.1f + 0.2f);
        System.out.println(16_777_217f);              // 2^24 + 1
        System.out.println((double) 0.1f);
        System.out.println(1.0 / 0 + " " + -1.0 / 0 + " " + 0.0 / 0);
        System.out.println(new BigDecimal("0.10").add(new BigDecimal("0.20")));
        System.out.println(Integer.MAX_VALUE + 1);
        System.out.println(Long.MAX_VALUE + 1);
    }
}`,
        },
        {
          type: "output",
          text: `0.30000000000000004
0.3
1.6777216E7
0.10000000149011612
Infinity -Infinity NaN
0.30
-2147483648
-9223372036854775808`,
        },
        {
          type: "list",
          items: [
            "`0.1` has no exact binary representation, so `0.1 + 0.2` is slightly off. The `float` version printing `0.3` isn't more accurate; its rounding error just happens to land on the `float` closest to 0.3.",
            "`float` has a 24-bit significand, so above 2^24 (16,777,216) it can't even represent every whole number. `16_777_217f` became `16777216`.",
            "Widening `0.1f` to `double` exposes the error the `float` already had.",
            "Floating-point division by zero doesn't throw; it gives `Infinity` or `NaN`. Integer division by zero throws `ArithmeticException`.",
            "`BigDecimal` built from strings does exact decimal arithmetic. That's the type for money.",
            "Integer overflow doesn't throw either. It wraps around silently. `Math.addExact` is the version that throws.",
          ],
        },
        {
          type: "heading",
          text: "== on references compares identity",
        },
        {
          type: "code",
          language: "java",
          title: "RefEquality.java",
          code: `public class RefEquality {
    public static void main(String[] args) {
        String a = "Prince";
        String b = "Prince";
        String c = new String("Prince");
        System.out.println(a == b);
        System.out.println(a == c);
        System.out.println(a.equals(c));
    }
}`,
        },
        {
          type: "output",
          text: `true
false
true`,
        },
        {
          type: "paragraph",
          text: "`a == b` is `true` only because both literals come from the same interned string in the string pool. `new String(...)` forces a separate object, so `==` says `false` even though the text is identical. For any reference type, `equals` compares content and `==` compares \"same object\".",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Double quotes for a char",
        },
        {
          type: "code",
          language: "java",
          title: "CharQuotes.java",
          code: `public class CharQuotes {
    public static void main(String[] args) {
        char c = "A";
    }
}`,
        },
        {
          type: "output",
          text: `CharQuotes.java:3: error: incompatible types: String cannot be converted to char
        char c = "A";
                 ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`\"A\"` is a `String`, a reference type, even with one character in it. `'A'` is a `char`.",
        },
        {
          type: "heading",
          text: "Assigning null to a primitive",
        },
        {
          type: "code",
          language: "java",
          title: "NullPrimitive.java",
          code: `public class NullPrimitive {
    public static void main(String[] args) {
        int count = null;
    }
}`,
        },
        {
          type: "output",
          text: `NullPrimitive.java:3: error: incompatible types: <null> cannot be converted to int
        int count = null;
                    ^
1 error`,
        },
        {
          type: "paragraph",
          text: "A primitive has no \"no value\" state. The compiler catches the literal case. The dangerous case is at runtime: unboxing a `null` `Integer` into an `int` compiles fine and throws `NullPointerException`. That shows up when an entity field is `Integer` (nullable column) and the code does `int qty = order.getQuantity();`.",
        },
        {
          type: "heading",
          text: "Using int as a boolean, the C way",
        },
        {
          type: "code",
          language: "java",
          title: "IntAsBoolean.java",
          code: `public class IntAsBoolean {
    public static void main(String[] args) {
        int active = 1;
        if (active) {
            System.out.println("active");
        }
    }
}`,
        },
        {
          type: "output",
          text: `IntAsBoolean.java:4: error: incompatible types: int cannot be converted to boolean
        if (active) {
            ^
1 error`,
        },
        {
          type: "paragraph",
          text: "In C, any non-zero number is true. In Java, `boolean` and the numeric types don't convert to each other at all, not even with a cast. Even though the JVM stores `true` as `1` internally, the language doesn't let me treat it as a number.",
        },
        {
          type: "heading",
          text: "Forgetting the suffix",
        },
        {
          type: "paragraph",
          text: "`long l = 10000000000;` and `float price = 19.99;` both fail to compile, as shown above. A sneakier version compiles fine: `long millisPerYear = 365 * 24 * 60 * 60 * 1000;`. Every operand is an `int`, so the multiplication overflows as `int` before the result is widened to `long`. Writing `1000L` on any one operand fixes it.",
        },
        {
          type: "heading",
          text: "Thinking `=` copies an array or object",
        },
        {
          type: "paragraph",
          text: "`int[] copy = original;` copies the reference, as `PrimitiveVsReference` showed. The same applies to a `List`, a DTO, anything. Use `clone()`, `Arrays.copyOf`, `List.copyOf` or a copy constructor when an independent copy is needed.",
        },
        {
          type: "heading",
          text: "Using double for money",
        },
        {
          type: "paragraph",
          text: "`0.1 + 0.2` printed `0.30000000000000004`. Summing thousands of prices as `double` drifts. Use `BigDecimal` (created from a `String`, not from a `double`) or store amounts as a `long` count of the smallest unit, like paise or cents.",
        },
        {
          type: "heading",
          text: "Treating char as \"one character\"",
        },
        {
          type: "paragraph",
          text: "`\"😀\".length()` is `2`. Code that loops over `charAt` or cuts a string at a fixed index works for ASCII test data and breaks on real user input. `codePoints()` iterates whole characters.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Default to `int` for whole numbers and `double` for general decimals. Use `long` when a value can pass about 2.1 billion: database IDs, epoch milliseconds, byte counts, money in minor units.",
            "Use `BigDecimal` for money and anything else that must be exact in decimal.",
            "Use `byte` and `short` for large arrays of small values or for binary data (`byte[]` for I/O). For a single local or field, they save nothing worth the casts.",
            "Use `boolean` for true/false, never an `int` with 0 and 1.",
            "Prefer primitives over wrappers unless I need `null` or a collection. In entities, a wrapper (`Long id`, `Integer quantity`) is the honest type for a nullable column; in calculations, a primitive.",
            "Before assigning an array, list or object, ask whether I want a second name or a second copy.",
            "Compare references with `equals`, not `==`, unless I really mean \"same object\".",
            "Write `L` in uppercase, and put it on the first operand of any arithmetic that might overflow `int`.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Primitives are cheap because there's nothing behind them: no allocation, no object header, no pointer to follow, nothing for the GC to track. A wrapper like `Integer` is a full object. I wanted a real number instead of a guess, so I filled an `int[]` and an `Integer[]` with the same million values and asked the JVM for a heap histogram while the program was paused:",
        },
        {
          type: "code",
          language: "java",
          title: "BoxCost.java",
          code: `public class BoxCost {
    public static void main(String[] args) throws Exception {
        int n = 1_000_000;
        int[] primitives = new int[n];
        Integer[] boxed = new Integer[n];
        for (int i = 0; i < n; i++) {
            primitives[i] = i + 1000;
            boxed[i] = i + 1000;          // autoboxing: Integer.valueOf, outside the cache
        }
        System.out.println("ready " + primitives.length + " " + boxed.length);
        Thread.sleep(8000);               // time for jcmd to take a histogram
        System.out.println(primitives[0] + boxed[0]);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:+UseSerialGC BoxCost &
jcmd <pid> GC.class_histogram | head -8`,
        },
        {
          type: "output",
          text: ` num     #instances         #bytes  class name (module)
-------------------------------------------------------
   1:       1000262       16004192  java.lang.Integer (java.base@21.0.12.1)
   2:          1339        4043760  [I (java.base@21.0.12.1)
   3:             2        4001056  [Ljava.lang.Integer; (java.base@21.0.12.1)
   4:          8091         354384  [B (java.base@21.0.12.1)
   5:          8010         192240  java.lang.String (java.base@21.0.12.1)`,
        },
        {
          type: "list",
          items: [
            "`java.lang.Integer`: 16,004,192 bytes for 1,000,262 objects, exactly **16 bytes each**. That's a 12-byte object header (8-byte mark word plus a 4-byte compressed class pointer), the 4-byte `int` value, and no padding needed since 16 is already a multiple of 8.",
            "`[Ljava.lang.Integer;`: two arrays. Mine is 16 bytes of header and length plus a million 4-byte compressed references, 4,000,016 bytes. The other 1,040 bytes are the JDK's `Integer` cache array (256 entries, -128 to 127).",
            "`[I`: my `int[]` accounts for 4,000,016 of those bytes. The rest are small JDK arrays.",
            "So a million `int`s cost about **4 MB**. A million `Integer`s cost about **20 MB**: 4 MB of references plus 16 MB of objects, five times as much, plus GC work and a pointer to follow on every read.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          text: "These are HotSpot numbers on 64-bit JDK 21 with default flags. With a heap over ~32 GB, compressed oops turn off and references become 8 bytes. JDK 24's compact object headers (JEP 450, experimental) shrink the header to 8 bytes. The ratio changes, the lesson doesn't.",
        },
        {
          type: "list",
          items: [
            "In hot loops, a boxed accumulator (`Long sum = 0L; sum += x;`) allocates a new object on almost every iteration. A primitive `long` doesn't.",
            "`IntStream`, `LongStream` and `DoubleStream` exist so stream code can avoid boxing. `mapToInt(...).sum()` beats `map(...).reduce(0, Integer::sum)`.",
            "Collections can only hold objects, so a `List<Integer>` of a million numbers pays the full boxed cost. Where it matters, a primitive array or a primitive-collection library avoids it.",
            "Picking `byte` over `int` for one local variable saves nothing, since both take a slot. The narrow types pay off only in big arrays and in objects that exist by the million.",
          ],
        },
      ],
    },
    {
      title: "Data Types in Production",
      blocks: [
        {
          type: "list",
          items: [
            "**IDs and timestamps are `long`.** A table that grows past 2,147,483,647 rows overflows an `int` primary key, and `System.currentTimeMillis()` already needs 41 bits. JPA entities usually use `Long id` (the wrapper, since `null` means \"not saved yet\").",
            "**Money is `BigDecimal`** mapped to a SQL `DECIMAL`/`NUMERIC` column, or a `long` of minor units. A `double` price column is a code-review red flag.",
            "**Wrappers at the edges, primitives inside.** JSON fields and nullable database columns map naturally to `Integer`/`Long`/`Boolean`, because \"missing\" is a real state. Jackson deserializes a missing field into an `int` as `0` and into an `Integer` as `null`, and those mean different things to the business.",
            "**Shared mutable objects are a classic bug source.** A list handed to two services, or a cached object that a caller modifies, is the same \"two names, one array\" situation from the examples. This is a big reason for returning `List.copyOf(...)`, using records and immutable DTOs, and not exposing internal arrays from getters.",
            "**`byte[]` is everywhere** in I/O: request bodies, file uploads, Kafka message payloads, hashing and encryption APIs all work on raw bytes.",
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
              question: "Name Java's 8 primitive types.",
              answer:
                "`byte`, `short`, `int`, `long` for whole numbers, `float` and `double` for floating point, `char` for UTF-16 code units, and `boolean`.\n\nEverything else is a reference type, including `String` and every array, even `int[]`. When I printed an `int[]` it came out as `[I@2a139a55`, a class name and a hash, because the array is an object.",
            },
            {
              question: "What's the size (in bytes) of int? Of long? Of byte?",
              answer:
                "`int` is 4 bytes (32 bits), `long` is 8 (64 bits), `byte` is 1 (8 bits), on every platform. `Integer.SIZE`, `Long.SIZE` and `Byte.SIZE` print 32, 64 and 8.\n\nOne nuance I'd add if there's time: that's the size of the value. In the bytecode a `byte` local still takes a full slot, just like an `int`. I saw both stored with `istore` in `javap`.",
            },
            {
              question: "What's the difference between a primitive type and a reference type?",
              answer:
                "A primitive variable holds the value itself. A reference variable holds a reference to an object on the heap, or `null`.\n\nThat changes how copying works. When I did `int b = a` and changed `b`, `a` stayed `10`. When I did `int[] arr2 = arr1` and wrote `arr2[0] = 99`, `arr1[0]` was `99` too, and `arr1 == arr2` was `true`, because there was only ever one array.",
            },
            {
              question: "Can a primitive variable be null?",
              answer:
                "No. A primitive always holds a value of its type; there's no \"empty\" state. `int count = null;` doesn't compile: \"<null> cannot be converted to int\".\n\nThe runtime version of the same problem is unboxing. `Integer boxed = null; int x = boxed;` compiles and throws `NullPointerException`, which is why I'm careful with wrapper-typed entity fields.",
            },
            {
              question: "What's the default value of an int instance variable? Of a reference type instance variable?",
              answer:
                "`0` for an `int` field, `null` for a reference field. The same goes for static fields and array elements. In general numeric types default to zero, `boolean` to `false` and `char` to `'\\u0000'`.\n\nLocal variables get no default at all. I tried printing an unassigned local `int total` and `javac` stopped with \"variable total might not have been initialized\".",
            },
            {
              question: "Why does `char c = \"A\";` fail to compile?",
              answer:
                "Because `\"A\"` is a `String`, a reference type, and a `String` can't be assigned to a `char`. The error is literally \"String cannot be converted to char\".\n\nSingle quotes make a `char` literal: `'A'`. Under the hood that's just the number 65; `javap` showed `char c = 'A'` compiled to `bipush 65`.",
            },
            {
              question: "What suffix is required for a long literal that exceeds int's range?",
              answer:
                "`L`, as in `10000000000L`. Lowercase `l` works but looks like a `1`, so I always use uppercase.\n\nWithout it, the literal is an `int`, and `javac` rejects it with \"integer number too large\" before it even looks at the `long` variable.",
            },
            {
              question: "What suffix is required for a float literal?",
              answer:
                "`f` or `F`, as in `3.14f`. Without it, a decimal literal is a `double`.\n\n`float price = 19.99;` fails with \"possible lossy conversion from double to float\", because narrowing a `double` to a `float` can lose precision and Java won't do that implicitly.",
            },
            {
              question: "Is String a primitive or a reference type?",
              answer:
                "A reference type. It's a class, `java.lang.String`, and the variable holds a reference to a `String` object on the heap.\n\nIt gets some special treatment: literals, `+` concatenation, and a string pool. That's why `\"Prince\" == \"Prince\"` was `true` in my test but `\"Prince\" == new String(\"Prince\")` was `false`. For content, it's `equals`.",
            },
            {
              question: "What's the default type Java assumes for a decimal literal like 3.14 (no suffix)?",
              answer:
                "`double`. Whole-number literals default to `int`, decimals to `double`.\n\nThat's also why `double` is the natural default in code: `double d = 3.14;` needs nothing extra, and `float` needs the `f`. In the bytecode, `3.14159` was loaded with `ldc2_w` as a `double` constant, and `3.14f` with plain `ldc` as a `float`.",
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
              question: "Precisely explain how Java guarantees int is always 4 bytes, regardless of platform.",
              answer:
                "The Java Language Specification defines `int` as a 32-bit signed two's-complement integer (JLS §4.2), and the JVM specification defines the same type and the instructions for it. A JVM that behaved differently would fail the compatibility tests (the TCK) and couldn't call itself Java. `javac` and the JVM both implement that one definition, so there's nothing left for the platform to decide.\n\nThe guarantee is about the value: the range and the overflow behaviour. `Integer.MAX_VALUE + 1` gave `-2147483648` on my machine and will on any JVM. How the bytes sit in memory, in a slot or a register, is still up to the implementation.",
            },
            {
              question: "What does a reference type variable actually store — the object itself, or something else?",
              answer:
                "Something else: a reference, or `null`. The object itself is on the heap. In HotSpot the reference is a pointer, usually a compressed 4-byte one, but the language doesn't expose it.\n\nIn `javap`, `String name = \"Prince\"` compiled to `ldc` then `astore 11`: one slot holding the reference. The text isn't in the frame at all. Printing the variable of an array gives `[I@2a139a55`, which is a type name and identity hash, not an address.",
            },
            {
              question: "If you copy a primitive variable's value into another variable, are they independent afterward?",
              answer:
                "Yes, completely. `int b = a` copies the number into `b`'s own slot. Changing `b` later has no effect on `a`.\n\nThe bytecode is `iload_1, istore_2`: read slot 1, write slot 2. In my test, `a` stayed `10` after `b = 20`.",
            },
            {
              question: "If you copy a reference variable's value into another variable, are they independent afterward? Explain.",
              answer:
                "The variables are independent, but the object isn't copied. `arr2 = arr1` copies the reference, so both variables point at one array. Changing the array through either is visible through both. Reassigning one variable (`arr2 = new int[3]`) doesn't affect the other, though.\n\nIn `javap`, `arr2 = arr1` is `aload_3, astore 4`, the same shape as copying an `int`, and there's only one `newarray` instruction in the method. I confirmed it at runtime: `arr1 == arr2` printed `true`.",
            },
            {
              question: "Why does modifying an array through one reference variable affect another reference variable pointing to the same array?",
              answer:
                "Because there's only one array. Both variables hold a reference to the same heap object, and `arr2[0] = 99` writes into that object, not into the variable.\n\nIt's like two people having the same house address: one repaints the door, and the other sees a different door. In my run, `arr1[0]` was `99` after writing through `arr2`. With `arr1.clone()`, the write didn't show up in `arr1`, because `clone` made a second array.",
            },
            {
              question: "What's the memory cost difference between a primitive int and its Heap-allocated equivalent?",
              answer:
                "An `int` is 4 bytes inline. An `Integer` on 64-bit HotSpot is a 16-byte object (12-byte header, 4-byte value), plus a 4-byte reference to point at it, so about 20 bytes and one extra pointer hop.\n\nI measured it with `jcmd GC.class_histogram`: a million `Integer`s were exactly 16,004,192 bytes for 1,000,262 objects, 16 each, and the `Integer[]` holding them was another 4 MB. The same million values in an `int[]` were 4 MB total.",
            },
            {
              question: "Why did Java choose to guarantee fixed primitive sizes instead of leaving them platform-dependent like C?",
              answer:
                "Because portability was the point of Java. Bytecode is compiled once and run on any JVM, so the meaning of an `int` can't depend on the machine running it. In C, the standard only sets a minimum range, so code that assumed 32-bit `int` or 64-bit `long` broke when it moved; `long` is still 32 bits on 64-bit Windows.\n\nThe cost is that Java can't use a \"natural\" machine word size, but since modern CPUs all handle 32- and 64-bit values well, that cost is basically nothing.",
            },
            {
              question: "What happens if you try to assign a double literal directly to a float variable without a cast?",
              answer:
                "It doesn't compile: \"incompatible types: possible lossy conversion from double to float\". `double` to `float` is a narrowing conversion, and Java only does narrowing implicitly for constant `int` values that fit into `byte`, `short` or `char`.\n\nThe fix is `19.99f` or an explicit `(float) 19.99`. The precision loss is real: `(double) 0.1f` printed `0.10000000149011612` for me.",
            },
            {
              question: "Where does the actual data of a String object live — the Stack or the Heap?",
              answer:
                "The heap. The variable holds a reference; the `String` object, and the `byte[]` inside it that has the characters, are on the heap. String literals are interned in the string pool, which has also been on the heap since Java 7.\n\nThat's why `a == b` was `true` for two `\"Prince\"` literals in my test: both referenced the same pooled object.",
            },
            {
              question: "Why can primitive variables never hold null?",
              answer:
                "Because `null` is a reference value meaning \"no object\", and a primitive variable doesn't hold a reference. Its bits are the value, and every bit pattern of an `int` is a valid number, so there's nothing left over to mean \"empty\".\n\nWhen I need \"no value\" I use the wrapper (`Integer`), `OptionalInt`, or a sentinel. In JPA entities the wrapper is the usual choice, because the column can be `NULL`.",
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
              question: "Explain the exact tradeoff Java made by having primitives NOT be objects, versus a fully object-oriented language where everything (even numbers) is an object.",
              answer:
                "Java gained speed and memory efficiency: an `int` is 4 bytes stored inline, arithmetic compiles to single instructions like `iadd`, and there's nothing to allocate or collect. It lost uniformity: primitives have no methods, can't be `null`, and can't be generic type arguments, so we need wrappers, autoboxing and special streams like `IntStream`.\n\nMy measurement shows the stakes. A million `Integer`s took about 20 MB against 4 MB for `int[]`. Languages where everything is an object often hide this with tricks (small integers cached or tagged), and Java's long-term fix is Project Valhalla's value classes, which aren't in Java 21.",
            },
            {
              question: "How does the JVM's fixed reference/pointer size remain constant regardless of the size of the object being pointed to?",
              answer:
                "Because a reference only stores where the object starts, not the object. An address is the same width whether the object behind it is 16 bytes or 16 MB. The object's own header tells the JVM its class, and from that its size and layout.\n\nOn 64-bit HotSpot with a heap under about 32 GB, `UseCompressedOops` is on, so references in objects and arrays are 4 bytes: a 32-bit offset scaled by the 8-byte object alignment. My million-element `Integer[]` was exactly 16 + 4 × 1,000,000 bytes.",
            },
            {
              question: "Why does assigning arr2 = arr1 (two array reference variables) NOT create a new array, and what real-world bug pattern does this commonly cause?",
              answer:
                "Arrays are objects, and assignment copies the variable's content, which is a reference. Only `new`, `newarray`, `clone()` or a copy method create a new array. `javap` showed `arr2 = arr1` as just `aload_3, astore 4`.\n\nThe bug pattern is aliasing: a getter returns an internal array or list and the caller modifies it, or the same list is passed to two components that each think they own it, or a cached object gets modified by one request and the change leaks to the next. The fixes are defensive copies (`clone`, `List.copyOf`) and immutable types.",
            },
            {
              question: "Explain precisely why Java requires explicit suffixes (L, f) for literals that would otherwise default to a smaller/different type.",
              answer:
                "Because a literal's type comes from the literal alone, not from the variable it's assigned to. A plain whole number is an `int`, a plain decimal is a `double`. For `long`, `10000000000` isn't a valid `int`, so it's an error at the literal itself: \"integer number too large\". For `float`, `19.99` is a valid `double`, but `double` to `float` is a lossy narrowing, which assignment doesn't do implicitly.\n\nThe suffix gives the literal the right type from the start. `javap` shows the result: `10000000000L` became an `ldc2_w` of a `long` constant, `3.14f` an `ldc` of a `float`. The sneaky case is arithmetic like `365 * 24 * 60 * 60 * 1000`, which compiles and overflows as `int` unless one operand has an `L`.",
            },
            {
              question: "How does the distinction between primitives and references affect method parameter passing (a preview of pass-by-value, which the Methods lesson covers properly)?",
              answer:
                "Java is always pass-by-value. The method gets a copy of the caller's variable. For a primitive that's a copy of the number, so the method can't change the caller's variable. For a reference it's a copy of the reference, so the method can change the **object**, but it can't make the caller's variable point somewhere else.\n\nI tested all three: `bump(count)` left `count` at `5`, `bumpFirst(counts)` changed `counts[0]` to `6`, and `replace(counts)`, which assigned a new array to its parameter, left the caller's array at `6`. Under pass-by-reference that last one would print `100`.",
            },
            {
              question: "Why might using primitive types instead of wrapper classes matter significantly in high-throughput, performance-critical backend code?",
              answer:
                "Every boxed value is a heap object: 16 bytes for an `Integer`, an allocation, a pointer to follow, and more work for the GC. In a hot path that runs millions of times, like a boxed `Long sum` in a loop or a `Map<Long, Long>` of counters, that turns into allocation pressure, cache misses and more frequent GC pauses.\n\nThe 5x memory difference I measured (20 MB vs 4 MB for a million values) is the visible part. The fixes are primitive locals, primitive streams (`mapToLong(...).sum()`), primitive arrays, and primitive-specialized collections when the data set is large.",
            },
            {
              question: "What JVM specification guarantee makes Java's primitive type sizes different from C's compiler-dependent sizes?",
              answer:
                "The JVM spec (§2.3) defines each numeric type exactly: `byte`, `short`, `int`, `long` as 8, 16, 32 and 64-bit two's-complement, `char` as 16-bit unsigned, and `float` and `double` as IEEE 754 single and double precision. The instruction set is typed to match (`iadd`, `ladd`, `fadd`, `dadd`), so the same bytecode computes the same result everywhere. The JLS says the same at the language level.\n\nC's standard only gives minimum ranges and leaves the rest to the implementation. Java leaves the in-memory representation to the JVM but fixes the values and the arithmetic, which is the part a program can observe.",
            },
            {
              question: "Explain how garbage collection interacts differently with primitive local variables versus Heap-allocated reference objects.",
              answer:
                "Primitive locals aren't garbage-collected at all. They live in the stack frame and disappear when the method returns. Objects live on the heap and are reclaimed only when no reference reaches them.\n\nReference locals matter to the GC in a different way: they're **roots**. While a frame holds a reference, the object it points to stays alive. The GC uses stack maps to know which slots hold references and which hold plain numbers, since an `int` that happens to look like an address must not keep anything alive. A primitive field inside an object is collected with its object.",
            },
            {
              question: "Why is boolean's exact bit-size not strictly specified by the JVM spec, unlike the other seven primitives?",
              answer:
                "Because it never needs to be observable. The JLS defines `boolean` only by its two values, and the JVM spec has no `boolean` instructions: locals and fields are handled as `int` 0 and 1, and `boolean` arrays use the byte-array instructions. Leaving the storage open lets each JVM pick what's efficient.\n\nI saw it in `javap`: `boolean flag = true` was `iconst_1, istore 10`, and `seen[1] = true` on a `boolean[]` used `bastore`. In HotSpot that means one byte per array element and per field. A true 1-bit representation would need bit masking on every access, which is what `BitSet` does on purpose.",
            },
            {
              question: "If you were designing a memory-constrained embedded Java application, how would understanding primitive type sizes influence your data structure choices?",
              answer:
                "I'd count bytes where there are many of something. Primitive arrays instead of wrapper collections, since an `Integer` in a list costs about 20 bytes against 4 in an `int[]`. The narrowest type that fits for large arrays: `byte[]` or `short[]` for sensor readings, `BitSet` for flags instead of `boolean[]`. And parallel primitive arrays instead of millions of small objects, each with a 12-byte header.\n\nI wouldn't bother narrowing single locals, because a `byte` local still takes a full slot. And I'd check the actual JVM's object layout and reference size rather than assume desktop HotSpot numbers.",
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
              question: "A colleague copies an array (`int[] copy = original;`) expecting an independent copy, then is confused why modifying copy also changed original. Explain what actually happened.",
              answer:
                "`copy = original` copied the reference, not the array. There's one array on the heap and two variables pointing at it, so a write through `copy` is a write to the same array `original` sees. `copy == original` would print `true`.\n\nFor a real copy: `original.clone()` or `Arrays.copyOf(original, original.length)`. I tested `clone()`: writing `-1` into the clone left the original untouched and `==` was `false`. For arrays of objects, both are shallow copies, so the objects inside are still shared.",
            },
            {
              question: "You're asked to store a user's account balance that could be a very large number (billions). Which primitive type would you choose, and why?",
              answer:
                "If it must be a primitive, `long`, storing the balance in the smallest currency unit (paise or cents). `int` tops out at 2,147,483,647, which isn't even enough for 2.2 crore rupees in paise, while `long` goes to about 9.2 × 10^18. Never `float` or `double`, because binary floating point can't represent amounts like 0.10 exactly; I got `0.30000000000000004` for `0.1 + 0.2`.\n\nIn a real backend I'd actually use `BigDecimal` mapped to a `DECIMAL` column, which is exact, carries a scale, and is what most banking and billing code uses. `long` minor units are the faster alternative when the currency's precision is fixed.",
            },
            {
              question: "Someone writes `float price = 19.99;` and gets a compile error. Explain exactly why, and how to fix it.",
              answer:
                "`19.99` without a suffix is a `double` literal. Assigning a `double` to a `float` is a narrowing conversion that can lose precision, and Java doesn't do that implicitly, so `javac` says \"possible lossy conversion from double to float\".\n\nFix it with `19.99f`, or declare `price` as `double`. For a price I'd go further and use `BigDecimal`, since neither `float` nor `double` stores 19.99 exactly.",
            },
            {
              question: "A teammate asks why Java doesn't just make every type an object like Python does. What performance-related answer would you give, based on this lesson?",
              answer:
                "Because objects have overhead that plain numbers don't. An `int` is 4 bytes inline and `a + b` is one `iadd` instruction. An `Integer` is a 16-byte heap object with a header, behind a reference, which has to be allocated, followed on every read and eventually collected.\n\nI measured a million values: 4 MB as `int[]`, about 20 MB as `Integer[]`. Java's designers kept primitives for that reason and added wrappers and autoboxing for the places where an object is needed, like collections. Project Valhalla is working on closing the gap without giving up the speed.",
            },
            {
              question: "Explain to a junior developer why `int x = 10; int y = x; y = 20;` leaves x unchanged, but a similar pattern with arrays does NOT leave the original unchanged.",
              answer:
                "Both lines copy what's in the variable. For `int`, what's in the variable is the number itself, so `y` gets its own 10, and changing `y` touches only `y`. For an array, what's in the variable is a reference to the array, so the copy is a second reference to the same array.\n\nThe important detail is that `y = 20` and `arr2[0] = 99` are different operations. `y = 20` replaces what's in the variable. `arr2[0] = 99` follows the reference and changes the array. If you did `arr2 = new int[3]` instead, that would also leave `arr1` alone, just like the `int` case. I'd show them the `javap` output, where both copies are a load and a store, and the difference is only what's in the slot.",
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
            "Write `DataTypesDemo.java` that declares one variable of each of the 8 primitive types with a realistic value (use `L` and `f` where needed) and prints all of them.",
            "Declare `int[] original = {10, 20, 30};`, assign it to `int[] copy`, set `copy[0] = 99`, and print `original[0]` and `copy[0]`.",
            "Add a comment in your own words explaining why `original` changed.",
            "Bonus: replace the assignment with `original.clone()` and run it again. Then compile with `javac -g` and look at `javap -c -l DataTypesDemo`: which variables take two slots?",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: my version with `floors = 12`, `seats = 4500`, `population = 1_400_000`, `bookings = 12_000_000_000L`, `rating = 4.5f`, `fare = 249.75`, `grade = 'B'` and `surge = false` printed `12 4500 1400000 12000000000` and `4.5 249.75 B false`. The array lines print `original[0] = 99, copy[0] = 99`, because both variables hold the same reference. With `clone()`, `original[0]` stays `10`. In `javap`, the `long` and the `double` are the only primitives that take two slots.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `PRIMITIVES  byte 8   short 16   int 32   long 64   (signed)
            float 32  double 64  (IEEE 754)
            char 16   (unsigned UTF-16 code unit)
            boolean   (true/false, size not specified)
LITERALS    42 is int, 3.14 is double
            42L long, 3.14f float, 'A' char, "A" String
            byte b = 10 ok: constant that fits
DEFAULTS    fields/arrays: 0, 0.0, false, '\\u0000', null
            locals: none, must assign before use

REFERENCE   variable holds null or a reference
            object lives on the heap
            = copies the reference, == compares identity

BYTECODE    byte/short/char/boolean/int: i-instructions
            long/double: 2 slots   references: a-instructions
            boolean[] uses baload/bastore

COSTS       int 4 B inline   Integer 16 B object + 4 B ref
            1M ints: 4 MB    1M Integers: ~20 MB

PASSING     always by value; a reference is copied too`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Primitive sizes are fixed by the JLS and JVM spec, as ranges and behaviour. That's the real meaning of \"architecture neutral\", not \"4 bytes on 64-bit\".",
            "A primitive variable holds a value, a reference variable holds a reference. Copying either copies what's in the variable, which is why arrays and objects end up shared.",
            "Use `long` for IDs and timestamps, `BigDecimal` for money, and primitives over wrappers in hot code.",
          ],
        },
      ],
    },
  ],
};
