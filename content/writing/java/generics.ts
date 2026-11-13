import type { Lesson } from "../types";

export const generics: Lesson = {
  slug: "generics",
  date: "2026-11-13",
  title: "Generics: Classes, Methods and Bounded Types",
  description:
    "What Java generics are and what javac does with them on JDK 21: the raw-type ClassCastException generics were invented to stop, generic classes, interfaces, records and methods, the diamond and type inference, bounded and multiply-bounded type parameters, type erasure read straight from javap (Object fields, inserted checkcasts, the Signature attribute), why List<String> and List<Integer> are the same class, name clashes and bridge methods, everything erasure forbids (new T(), T.class, List<int>, generic exceptions) and the Class<T> workaround, the boxing cost measured, and a raw-typed legacy config that broke surge pricing in a ride-hailing backend.",
  tags: ["Core Java", "Generics", "Type Erasure", "Type Safety"],
  sections: [
    {
      title: "What Generics Are",
      blocks: [
        {
          type: "paragraph",
          text: "The Arrays phase ended on a compile error: `new T[10]` gives \"generic array creation\", because a generic type isn't known at run time. This phase explains that sentence. **Generics** let a class, interface or method take a **type as a parameter**, the way a method takes a value as a parameter. `List<String>` is a `List` whose element type parameter `E` is `String`; `Map<String, Integer>` fixes `K` and `V`; `Optional<Fare>` fixes `T`.",
        },
        {
          type: "paragraph",
          text: "The point is to move type errors from run time to compile time. Without generics, a `List` holds `Object`s, every read needs a cast, and putting the wrong thing in is only discovered when someone casts it later, possibly in a different part of the program. With generics, the compiler knows the element type, rejects `add(42)` on a `List<String>`, and writes the cast for me. The code is safer, shorter and self-documenting: `Map<String, List<Fare>>` says exactly what it holds.",
        },
        {
          type: "paragraph",
          text: "Java implements generics by **type erasure**: the compiler checks the types and then removes them, so the JVM runs the same code for `List<String>` and `List<Integer>`. Almost every surprising rule about generics follows from that one design decision, and this lesson reads it straight out of `javap`. The next lesson, Wildcards, Variance and Type Erasure in Depth, covers `? extends`, `? super`, PECS, heap pollution and reading generic types back with reflection.",
        },
      ],
    },
    {
      title: "Where They Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 to 1.4 had no generics. Collections held `Object`, and the element type lived in comments and variable names. In 1998 Martin Odersky and Philip Wadler designed **Pizza** and then **Generic Java (GJ)**, extensions of Java with type parameters that compiled to ordinary bytecode by erasing them. GJ became the basis of JSR 14, and generics shipped in Java 5 in 2004. Odersky also wrote the `javac` that compiled them, and later created Scala.",
        },
        {
          type: "paragraph",
          text: "Erasure was chosen for **migration compatibility**. Millions of lines of code used raw `List` and `Map`, and libraries were compiled against them. With erasure, a generic `ArrayList<E>` is still the same `java.util.ArrayList` class, so old code calling new libraries, and new code calling old libraries, kept working without recompiling. C# made the opposite choice in .NET 2.0 (2005): reified generics, where `List<int>` and `List<string>` are different runtime types, at the cost of a split between old and new collection classes.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "Generics (JSR 14), autoboxing, enhanced `for`, varargs", "Everything in this phase; collections retrofitted with type parameters"],
            ["Java 7 (2011)", "Diamond `<>`", "`new HashMap<>()` instead of repeating the type arguments"],
            ["Java 8 (2014)", "Generalised target-type inference (JEP 101); lambdas", "`Collections.emptyList()` and lambdas infer from where they're used"],
            ["Java 9 (2017)", "Diamond with anonymous classes", "`new Comparator<>() { ... }`"],
            ["Java 10 (2018)", "`var`", "`var map = new HashMap<String, List<Fare>>();`"],
            ["Java 16 (2021)", "Records (JEP 395)", "Generic records: `record Pair<A, B>(A first, B second)`"],
            ["Java 17 (2021)", "Sealed classes (JEP 409)", "Generic sealed hierarchies like `Result<T>`"],
            ["Java 21 (2023)", "Record patterns (JEP 440), pattern matching for `switch` (JEP 441)", "`case Ok<String>(String v) ->` deconstructs a generic record"],
          ],
        },
        {
          type: "paragraph",
          text: "Project Valhalla plans to allow primitive type arguments (`List<int>`) and specialised generics in a future release; nothing of it is in Java 21. Until then, the restrictions and boxing costs in this lesson apply.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of storage boxes in a warehouse.",
        },
        {
          type: "list",
          items: [
            "A **raw `List` is an unlabelled box**. Anyone can put anything in. The person who opens it later has to guess what's inside, and finds out they guessed wrong only when they try to use it: the `ClassCastException`.",
            "A **`List<String>` is a box with a label**, \"strings only\", and a checker at the door (`javac`) who refuses anything else. Whoever takes items out can trust the label; they don't need to inspect each item.",
            "A **type parameter `T` is the blank on a label printer**: `Box<T>` is the design, `Box<String>` and `Box<Fare>` are the printed labels.",
            "A **bound like `<T extends Number>`** is a rule on the blank: only number types can be written in.",
            "**Type erasure** is the warehouse removing all labels after the door check, to keep using its old, unlabelled boxes. The goods are still right, because the checker did its job at the door, but nobody inside the warehouse can read a label any more. That's why `new T()` and `instanceof List<String>` can't work at run time.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real warehouse can't sneak goods past the door. Java can: a raw type or an unchecked cast skips the checker, and the wrong item is discovered much later, by whoever takes it out. That's the production bug at the end of this lesson.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The vocabulary",
        },
        {
          type: "table",
          headers: ["Term", "Example", "Meaning"],
          rows: [
            ["Type parameter", "`T` in `class Box<T>`", "The placeholder declared by a generic class, interface or method"],
            ["Type argument", "`String` in `Box<String>`", "The actual type supplied when it's used"],
            ["Generic type", "`Box<T>`, `List<E>`", "A class or interface with type parameters"],
            ["Parameterized type", "`Box<String>`, `Map<String, Integer>`", "A generic type with its arguments filled in"],
            ["Raw type", "`Box`, `List`", "A generic type used without arguments: generics switched off, for old code"],
            ["Generic method", "`static <T> T first(List<T> l)`", "A method with its own type parameters, declared before the return type"],
            ["Bounded type parameter", "`<T extends Number>`", "Restricts which type arguments are allowed"],
            ["Wildcard", "`List<?>`, `List<? extends Number>`", "An unknown type argument; the next lesson"],
            ["Erasure", "`T` becomes `Object` (or its bound)", "What `javac` turns generic code into"],
          ],
        },
        {
          type: "heading",
          text: "Naming conventions",
        },
        {
          type: "table",
          headers: ["Name", "Used for", "JDK example"],
          rows: [
            ["`T`, `U`, `S`", "Any type", "`Optional<T>`, `Function<T, R>`"],
            ["`E`", "Element of a collection", "`List<E>`, `Set<E>`"],
            ["`K`, `V`", "Key and value", "`Map<K, V>`"],
            ["`R`", "Result / return type", "`Function<T, R>`"],
            ["`N`", "Number", "Rare in the JDK; common in examples"],
          ],
        },
        {
          type: "paragraph",
          text: "Single capital letters make type parameters easy to tell apart from class names. Anything longer (`<Entity>`) looks like a real class and confuses readers.",
        },
        {
          type: "heading",
          text: "Where type parameters can be declared",
        },
        {
          type: "list",
          items: [
            "**On a class, interface or record**: `class Box<T>`, `interface Repository<T, ID>`, `record Pair<A, B>(A first, B second)`. The parameter is in scope for all instance members.",
            "**On a method or constructor**: `static <T> T first(List<T> items)`. The parameter is in scope only inside that method, and is usually inferred from the arguments at each call.",
            "Not on enums, exceptions, anonymous classes or lambdas, and a class's type parameter can't be used in its `static` members, because statics are shared by every parameterization.",
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Type erasure, read from javap",
        },
        {
          type: "paragraph",
          text: "I compiled a minimal generic class, a bounded one, and a caller, then disassembled all three on JDK 21:",
        },
        {
          type: "code",
          language: "java",
          title: "Box.java",
          code: `public class Box<T> {
    private T value;
    public Box(T value) { this.value = value; }
    public T get() { return value; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "NumberBox.java",
          code: `public class NumberBox<T extends Number> {
    private T value;
    public NumberBox(T value) { this.value = value; }
    public T get() { return value; }
    public double doubled() { return value.doubleValue() * 2; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "UseBox.java",
          code: `public class UseBox {
    static int length() {
        Box<String> b = new Box<>("Asha");
        String s = b.get();
        return s.length();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Box.java NumberBox.java UseBox.java
javap -p -c Box
javap -p -c NumberBox
javap -c UseBox`,
        },
        {
          type: "output",
          text: `public class Box<T> {
  private T value;

  public Box(T);
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: aload_0
       5: aload_1
       6: putfield      #7                  // Field value:Ljava/lang/Object;
       9: return

  public T get();
    Code:
       0: aload_0
       1: getfield      #7                  // Field value:Ljava/lang/Object;
       4: areturn
}`,
        },
        {
          type: "output",
          text: `  public double doubled();
    Code:
       0: aload_0
       1: getfield      #7                  // Field value:Ljava/lang/Number;
       4: invokevirtual #13                 // Method java/lang/Number.doubleValue:()D
       7: ldc2_w        #19                 // double 2.0d
      10: dmul`,
        },
        {
          type: "output",
          text: `  static int length();
    Code:
       0: new           #7                  // class Box
       3: dup
       4: ldc           #9                  // String Asha
       6: invokespecial #11                 // Method Box."<init>":(Ljava/lang/Object;)V
       9: astore_0
      10: aload_0
      11: invokevirtual #14                 // Method Box.get:()Ljava/lang/Object;
      14: checkcast     #18                 // class java/lang/String
      17: astore_1
      18: aload_1
      19: invokevirtual #20                 // Method java/lang/String.length:()I
      22: ireturn
}`,
        },
        {
          type: "image",
          src: "/images/java/generics-erasure.svg",
          alt: "Left, the source of class Box<T> with a T field and T get(), and a caller Box<String> b = new Box<>(\"Asha\"); String s = b.get(). Middle, javac does four things: type-checks every use, erases T to its bound, inserts casts at use sites, and keeps a Signature attribute. Right, the bytecode: Box.class has value of type Object and get returning Object, with Signature ()TT; the caller calls Box.get returning Object and then checkcast java/lang/String. List<String> and List<Integer> share one class, java.util.ArrayList.",
          caption: "Generics are a compile-time feature. The type argument guides javac's checks, then disappears into Object and a cast.",
        },
        {
          type: "list",
          items: [
            "**`T` became `Object`** in the bytecode: the field is `value:Ljava/lang/Object;` and the constructor takes `(Ljava/lang/Object;)V`. `javap` still prints `T` in the header lines because it reads the Signature attribute; the instructions use the erased types.",
            "**A bounded `T` becomes its bound.** In `NumberBox<T extends Number>` the field is a `Number`, which is why `value.doubleValue()` compiles to a direct `invokevirtual Number.doubleValue` with no cast. That's the practical reason for bounds: they let generic code call methods of the bound.",
            "**The cast moved to the caller.** `b.get()` returns `Object`, and `javac` inserted `checkcast String` right after it. I never wrote that cast; generics write it for me, and only where a typed value is needed.",
            "**The `new Box<>(\"Asha\")`** is a plain `new Box`: there's no type argument anywhere in the instruction.",
          ],
        },
        {
          type: "heading",
          text: "The Signature attribute",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -v Box | grep Signature",
        },
        {
          type: "output",
          text: `  #13 = Utf8               Signature
  #14 = Utf8               TT;
  #18 = Utf8               (TT;)V
  #21 = Utf8               ()TT;
  #22 = Utf8               <T:Ljava/lang/Object;>Ljava/lang/Object;
    Signature: #18                          // (TT;)V
    Signature: #21                          // ()TT;
Signature: #22                          // <T:Ljava/lang/Object;>Ljava/lang/Object;`,
        },
        {
          type: "paragraph",
          text: "Erasure doesn't delete the generic **declarations**. The class file keeps a `Signature` attribute for the class (`<T:Ljava/lang/Object;>`: one type parameter bounded by `Object`), each field (`TT;`: \"the type variable T\") and each method (`()TT;`). The JVM ignores it when executing code. `javac` reads it when compiling code against this class, so it knows `Box` is generic, and reflection reads it through `getGenericType()`, which is how frameworks like Jackson and Spring recover `List<Fare>` from a field declaration. What's erased is the type argument of each **object**: a `Box` object doesn't know it was created as `Box<String>`.",
        },
        {
          type: "heading",
          text: "One class for every parameterization",
        },
        {
          type: "code",
          language: "java",
          title: "SameClass.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class SameClass {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>();
        List<Integer> fares = new ArrayList<>();
        System.out.println(names.getClass() == fares.getClass());
        System.out.println(names.getClass().getName());
        System.out.println(java.util.Arrays.toString(ArrayList.class.getTypeParameters()));
    }
}`,
        },
        {
          type: "output",
          text: `true
java.util.ArrayList
[E]`,
        },
        {
          type: "paragraph",
          text: "There's one `ArrayList` class, loaded once, shared by every element type. `ArrayList<String>.class` doesn't even compile. The class knows it has a type parameter named `E`, but no object knows what `E` was for it. Compare arrays: `String[]` and `Integer[]` are different runtime classes, which is exactly why arrays can check `ArrayStoreException` at run time and generics can't.",
        },
        {
          type: "heading",
          text: "Name clashes",
        },
        {
          type: "code",
          language: "java",
          title: "NameClash.java",
          code: `import java.util.List;

public class NameClash {
    void process(List<String> names) { }
    void process(List<Integer> fares) { }
}`,
        },
        {
          type: "output",
          text: `NameClash.java:5: error: name clash: process(List<Integer>) and process(List<String>) have the same erasure
    void process(List<Integer> fares) { }
         ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Both methods erase to `process(List)`, and a class file can't hold two methods with the same name and descriptor, so overloading on type arguments alone is impossible. The fix is different names (`processNames`, `processFares`) or different parameter types.",
        },
        {
          type: "heading",
          text: "Bridge methods",
        },
        {
          type: "code",
          language: "java",
          title: "Fare.java",
          code: `public class Fare implements Comparable<Fare> {
    final int paise;
    Fare(int paise) { this.paise = paise; }

    @Override
    public int compareTo(Fare other) {
        return Integer.compare(paise, other.paise);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Bridge.java",
          code: `import java.lang.reflect.Method;

public class Bridge {
    @SuppressWarnings({"rawtypes", "unchecked"})
    public static void main(String[] args) {
        for (Method m : Fare.class.getDeclaredMethods()) {
            System.out.println(m + "  bridge=" + m.isBridge() + " synthetic=" + m.isSynthetic());
        }
        Comparable raw = new Fare(100);
        try {
            raw.compareTo("not a fare");          // goes through the bridge method
        } catch (ClassCastException e) {
            System.out.println("ClassCastException: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Fare.java Bridge.java
javap -p -c Fare
java Bridge`,
        },
        {
          type: "output",
          text: `  public int compareTo(java.lang.Object);
    Code:
       0: aload_0
       1: aload_1
       2: checkcast     #8                  // class Fare
       5: invokevirtual #19                 // Method compareTo:(LFare;)I
       8: ireturn

public int Fare.compareTo(Fare)  bridge=false synthetic=false
public int Fare.compareTo(java.lang.Object)  bridge=true synthetic=true
ClassCastException: class java.lang.String cannot be cast to class Fare (java.lang.String is in module java.base of loader 'bootstrap'; Fare is in unnamed module of loader 'app')`,
        },
        {
          type: "list",
          items: [
            "`Comparable<T>.compareTo(T)` erases to `compareTo(Object)`. My method is `compareTo(Fare)`, a different descriptor, so without help it wouldn't override the interface method at the bytecode level and code calling `Comparable.compareTo` would never reach it.",
            "`javac` generates a **bridge method** `compareTo(Object)` that casts its argument to `Fare` and calls my method. Reflection reports it as `bridge=true synthetic=true`: it exists in the class file but not in my source.",
            "The bridge's `checkcast` is where a wrongly typed argument fails. Through a raw `Comparable`, passing a `String` compiled, then failed inside the bridge. Bridges are how erasure and overriding coexist; they also appear for covariant return types.",
          ],
        },
      ],
    },
    {
      title: "Before Generics: Raw Types",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "BeforeGenerics.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class BeforeGenerics {
    // Java 1.4 style: a raw List, the element type lives only in a comment
    static List zoneNames() {                 // List of String
        List names = new ArrayList();
        names.add("SALT-LAKE");
        names.add("NEW-TOWN");
        names.add(Integer.valueOf(42));       // nothing stops this
        return names;
    }

    public static void main(String[] args) {
        List names = zoneNames();
        for (int i = 0; i < names.size(); i++) {
            String zone = (String) names.get(i);    // the cast the caller must remember
            System.out.println(zone.toLowerCase());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac BeforeGenerics.java && java BeforeGenerics`,
        },
        {
          type: "output",
          text: `Note: BeforeGenerics.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
salt-lake
new-town
Exception in thread "main" java.lang.ClassCastException: class java.lang.Integer cannot be cast to class java.lang.String (java.lang.Integer and java.lang.String are in module java.base of loader 'bootstrap')
	at BeforeGenerics.main(BeforeGenerics.java:17)`,
        },
        {
          type: "list",
          items: [
            "The bug is on line 10, where an `Integer` goes in. The failure is on line 17, in a different method, where someone casts it. In a real program those two lines can be in different modules, written by different teams, months apart.",
            "Every reader of a raw list has to write the cast, and has to know the element type from documentation.",
            "Raw types still compile on Java 21, for compatibility. `javac` only prints a two-line note; `-Xlint:rawtypes,unchecked` shows each one.",
          ],
        },
        {
          type: "code",
          language: "bash",
          code: "javac -Xlint:rawtypes,unchecked BeforeGenerics.java",
        },
        {
          type: "output",
          text: `BeforeGenerics.java:6: warning: [rawtypes] found raw type: List
    static List zoneNames() {                 // List of String
           ^
  missing type arguments for generic class List<E>
  where E is a type-variable:
    E extends Object declared in interface List
BeforeGenerics.java:7: warning: [rawtypes] found raw type: List
        List names = new ArrayList();
        ^
  missing type arguments for generic class List<E>
  where E is a type-variable:
    E extends Object declared in interface List
...`,
        },
        {
          type: "paragraph",
          text: "With generics, the same mistake is a compile error on the line that causes it:",
        },
        {
          type: "code",
          language: "java",
          title: "WithGenerics.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class WithGenerics {
    static List<String> zoneNames() {
        List<String> names = new ArrayList<>();
        names.add("SALT-LAKE");
        names.add(Integer.valueOf(42));
        return names;
    }
}`,
        },
        {
          type: "output",
          text: `WithGenerics.java:8: error: incompatible types: Integer cannot be converted to String
        names.add(Integer.valueOf(42));
                                 ^
Note: Some messages have been simplified; recompile with -Xdiags:verbose to get full output
1 error`,
        },
      ],
    },
    {
      title: "Generic Classes, Interfaces and Methods",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "GenericTypes.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class GenericTypes {
    // A generic class: T is a type parameter
    static final class Box<T> {
        private T value;
        Box(T value) { this.value = value; }
        T get() { return value; }
        void set(T value) { this.value = value; }
        @Override public String toString() { return "Box[" + value + "]"; }
    }

    // Two type parameters
    record Pair<K, V>(K key, V value) { }

    // A generic interface
    interface Repository<T, ID> {
        void save(T item);
        Optional<T> findById(ID id);
    }

    record Driver(String id, String name) { }

    static final class InMemoryDrivers implements Repository<Driver, String> {
        private final List<Driver> all = new ArrayList<>();
        public void save(Driver d) { all.add(d); }
        public Optional<Driver> findById(String id) {
            return all.stream().filter(d -> d.id().equals(id)).findFirst();
        }
    }

    // A generic method: <T> before the return type
    static <T> T firstOrDefault(List<T> items, T fallback) {
        return items.isEmpty() ? fallback : items.get(0);
    }

    static <K, V> Pair<V, K> swap(Pair<K, V> p) {
        return new Pair<>(p.value(), p.key());
    }

    public static void main(String[] args) {
        Box<String> name = new Box<>("Asha");          // diamond: <String> inferred
        String n = name.get();                          // no cast
        Box<Integer> fare = new Box<>(120);             // autoboxed int
        fare.set(fare.get() + 30);
        System.out.println(name + " " + n.length() + " " + fare);

        Pair<String, Integer> p = new Pair<>("SALT-LAKE", 70);
        System.out.println(p + " -> " + swap(p));

        Repository<Driver, String> repo = new InMemoryDrivers();
        repo.save(new Driver("D1", "Ravi"));
        System.out.println(repo.findById("D1").map(Driver::name).orElse("none") + " "
                + repo.findById("D9").isPresent());

        System.out.println(firstOrDefault(List.of("Kolkata", "Pune"), "?") + " "
                + firstOrDefault(List.<Integer>of(), -1));
        System.out.println(GenericTypes.<String>firstOrDefault(new ArrayList<>(), "explicit witness"));

        var boxes = new ArrayList<Box<String>>();       // var + generics
        boxes.add(name);
        System.out.println(boxes);
    }
}`,
        },
        {
          type: "output",
          text: `Box[Asha] 4 Box[150]
Pair[key=SALT-LAKE, value=70] -> Pair[key=70, value=SALT-LAKE]
Ravi false
Kolkata -1
explicit witness
[Box[Asha]]`,
        },
        {
          type: "list",
          items: [
            "**A generic class** declares its parameters after the name. Every instance member can use `T`; `Box<String>` and `Box<Integer>` are two parameterizations of one class.",
            "**A class implementing a generic interface** usually fixes the arguments: `InMemoryDrivers implements Repository<Driver, String>`, so its methods take a `Driver` and a `String`. It could also stay generic: `class InMemory<T> implements Repository<T, String>`. Spring Data's `JpaRepository<T, ID>` is exactly this pattern.",
            "**A generic method** declares `<T>` before its return type. `firstOrDefault` works on any list without the class being generic, and `T` is inferred at each call: `String` for the first call, `Integer` for the second. `swap` shows type parameters moving: `Pair<K, V>` in, `Pair<V, K>` out.",
            "**The explicit type witness** `GenericTypes.<String>firstOrDefault(...)` and `List.<Integer>of()` supply the type argument by hand. It's rarely needed since Java 8's inference, but it's the fix when inference can't work something out.",
            "**Type arguments must be reference types**: `Box<int>` is an error, so `Box<Integer>` autoboxes. `fare.get() + 30` unboxes, adds and boxes again.",
          ],
        },
      ],
    },
    {
      title: "Bounded Type Parameters",
      blocks: [
        {
          type: "paragraph",
          text: "An unbounded `T` is erased to `Object`, so inside a generic method only `Object`'s methods are available on a `T`. A **bound** says which types are allowed, and in return makes their methods available:",
        },
        {
          type: "code",
          language: "java",
          title: "Bounded.java",
          code: `import java.math.BigDecimal;
import java.util.List;

public class Bounded {
    // Upper bound: T must be a Number, so doubleValue() is available
    static <T extends Number> double total(List<T> amounts) {
        double sum = 0;
        for (T a : amounts) sum += a.doubleValue();
        return sum;
    }

    // T must be comparable to itself
    static <T extends Comparable<T>> T max(List<T> items) {
        T best = items.get(0);
        for (T t : items) if (t.compareTo(best) > 0) best = t;
        return best;
    }

    // Multiple bounds: a class first, then interfaces, joined with &
    static <T extends Number & Comparable<T>> T clampMax(T value, T limit) {
        return value.compareTo(limit) > 0 ? limit : value;
    }

    // A bounded generic class
    static final class Stats<T extends Number> {
        private final List<T> values;
        Stats(List<T> values) { this.values = values; }
        double average() { return values.isEmpty() ? 0 : total(values) / values.size(); }
    }

    public static void main(String[] args) {
        System.out.println(total(List.of(60, 70, 80)) + " " + total(List.of(1.5, 2.5))
                + " " + total(List.of(new BigDecimal("10.25"), new BigDecimal("0.75"))));
        System.out.println(max(List.of("Pune", "Kolkata", "Delhi")) + " " + max(List.of(3, 9, 4)));
        System.out.println(clampMax(250, 200) + " " + clampMax(1.5, 2.0));
        System.out.println(new Stats<>(List.of(120, 85, 240)).average());
    }
}`,
        },
        {
          type: "output",
          text: `210.0 4.0 11.0
Pune 9
200 1.5
148.33333333333334`,
        },
        {
          type: "list",
          items: [
            "`extends` in a bound means \"is a subtype of\", for classes **and** interfaces: `<T extends Comparable<T>>`, never `implements`.",
            "`<T extends Comparable<T>>` is a **recursive bound**: `T` must be comparable to its own type. It's how `max` can call `compareTo` on two `T`s. `String` and `Integer` both qualify. The next lesson shows why the JDK writes `Comparable<? super T>` instead.",
            "**Multiple bounds** use `&`. At most one may be a class, and it must come first: `<T extends Number & Comparable<T>>`. `T` erases to the **first** bound, `Number`.",
            "A bound on a class (`Stats<T extends Number>`) applies to every use of the class.",
          ],
        },
        {
          type: "paragraph",
          text: "Breaking a bound is a compile error at the call or declaration:",
        },
        {
          type: "code",
          language: "java",
          title: "BoundErrors.java",
          code: `import java.util.List;

public class BoundErrors {
    static <T extends Number> double total(List<T> amounts) { return 0; }
    static final class Stats<T extends Number> { }

    public static void main(String[] args) {
        total(List.of("60", "70"));
        Stats<String> s = null;
    }
}`,
        },
        {
          type: "output",
          text: `BoundErrors.java:8: error: method total in class BoundErrors cannot be applied to given types;
        total(List.of("60", "70"));
        ^
  required: List<T>
  found:    List<String>
  reason: inference variable E has incompatible bounds
    upper bounds: Number,Object
    lower bounds: String
  where T,E are type-variables:
    T extends Number declared in method <T>total(List<T>)
    E extends Object declared in method <E>of(E,E)
BoundErrors.java:9: error: type argument String is not within bounds of type-variable T
        Stats<String> s = null;
              ^
  where T is a type-variable:
    T extends Number declared in class Stats
2 errors`,
        },
        {
          type: "paragraph",
          text: "Generic error messages look intimidating, but they have a pattern: \"upper bounds\" are what the declaration requires (`Number`), \"lower bounds\" are what the call supplies (`String`), and the error says they can't both be satisfied.",
        },
      ],
    },
    {
      title: "Type Inference and the Diamond",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Inference.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

public class Inference {
    static <T> T pick(T a, T b) { return Math.random() < 2 ? a : b; }

    public static void main(String[] args) {
        Map<String, List<Integer>> faresByZone = new HashMap<>();   // diamond (Java 7)
        faresByZone.computeIfAbsent("SALT-LAKE", z -> new ArrayList<>()).add(70);
        System.out.println(faresByZone);

        List<String> empty = Collections.emptyList();                 // inferred from the target type
        System.out.println(empty.size());

        var mixed = List.of(1, 2.5);                                  // T = Number & Comparable<...>
        Number first = mixed.get(0);
        System.out.println(first + " " + mixed.get(1).getClass().getSimpleName());

        Comparable<?> c = pick("Asha", 42);                           // T = Object & Serializable & Comparable<...> ...
        System.out.println(c);
    }
}`,
        },
        {
          type: "output",
          text: `{SALT-LAKE=[70]}
0
1 Double
Asha`,
        },
        {
          type: "list",
          items: [
            "**The diamond** `new HashMap<>()` takes its type arguments from the declared type on the left. Without it (Java 5 and 6) the arguments were written twice: `new HashMap<String, List<Integer>>()`.",
            "**Target typing**: `Collections.emptyList()` has no arguments to infer from, so `javac` uses the assignment target, `List<String>`. Since Java 8 this works in method arguments too.",
            "**Inference picks the most specific common supertype.** `List.of(1, 2.5)` has an `Integer` and a `Double`; the closest type both satisfy is roughly `Number & Comparable<...>` (an intersection type that can't be written in source). With `var`, that's the type `mixed` gets, so `mixed.get(0)` is a `Number`.",
            "`pick(\"Asha\", 42)` infers an intersection of `String`'s and `Integer`'s common supertypes, including `Serializable` and `Comparable<...>`, so assigning the result to a `Comparable<?>` compiles. When inference produces something odd, an explicit type witness or a typed variable fixes it.",
          ],
        },
        {
          type: "paragraph",
          text: "Inference never invents a conversion, though. With a target type that doesn't fit, it fails with a precise reason:",
        },
        {
          type: "code",
          language: "java",
          title: "InferenceError.java",
          code: `import java.util.List;

public class InferenceError {
    public static void main(String[] args) {
        List<Integer> fares = List.of(1, 2.5);
    }
}`,
        },
        {
          type: "output",
          text: `InferenceError.java:5: error: incompatible types: inference variable E has incompatible bounds
        List<Integer> fares = List.of(1, 2.5);
                                     ^
    equality constraints: Integer
    lower bounds: Double,Integer
  where E is a type-variable:
    E extends Object declared in method <E>of(E,E)
1 error`,
        },
      ],
    },
    {
      title: "What Generics Can't Do",
      blocks: [
        {
          type: "paragraph",
          text: "Every one of these restrictions follows from erasure: at run time there's no `T` to use.",
        },
        {
          type: "code",
          language: "java",
          title: "Restrictions.java",
          code: `import java.util.List;

public class Restrictions<T> {
    static T shared;                                   // 1. static field of type T
    T make() { return new T(); }                       // 2. new T()
    Class<?> type() { return T.class; }                // 3. T.class
    boolean check(Object o) { return o instanceof List<String>; }   // 4. instanceof a parameterized type
    List<int> fares;                                   // 5. primitive type argument
    static class Problem<T> extends Exception { }      // 6. generic exception class
}`,
        },
        {
          type: "output",
          text: `Restrictions.java:4: error: non-static type variable T cannot be referenced from a static context
    static T shared;                                   // 1. static field of type T
           ^
Restrictions.java:8: error: unexpected type
    List<int> fares;                                   // 5. primitive type argument
         ^
  required: reference
  found:    int
Restrictions.java:5: error: unexpected type
    T make() { return new T(); }                       // 2. new T()
                          ^
  required: class
  found:    type parameter T
  where T is a type-variable:
    T extends Object declared in class Restrictions
Restrictions.java:6: error: cannot select from a type variable
    Class<?> type() { return T.class; }                // 3. T.class
                              ^
Restrictions.java:7: error: Object cannot be safely cast to List<String>
    boolean check(Object o) { return o instanceof List<String>; }   // 4. instanceof a parameterized type
                                     ^
Restrictions.java:9: error: a generic class may not extend java.lang.Throwable
    static class Problem<T> extends Exception { }      // 6. generic exception class
                                    ^
6 errors`,
        },
        {
          type: "table",
          headers: ["Not allowed", "Why", "What I do instead"],
          rows: [
            ["`static T field`", "One static field is shared by `Box<String>` and `Box<Integer>`; it can't be both", "A generic static method, or an instance field"],
            ["`new T()`", "The erased code would be `new Object()`; the JVM doesn't know `T`", "Pass a `Class<T>` or a `Supplier<T>`"],
            ["`T.class`", "There's no class object for a type variable", "Pass a `Class<T>` token"],
            ["`o instanceof List<String>`", "A list object doesn't know its type argument", "`o instanceof List<?> l`, then check elements"],
            ["`List<int>`", "Type arguments erase to `Object`, and `int` isn't an object", "`List<Integer>`, or `int[]` / `IntStream` for performance"],
            ["`class Problem<T> extends Exception`", "`catch` dispatches on the runtime class, which can't distinguish `Problem<String>` from `Problem<Integer>`", "A non-generic exception with a typed field"],
            ["`new T[10]`, `new List<String>[10]`", "Arrays need their component type at run time (the Arrays lesson)", "`List<T>`, or `(T[]) new Object[n]` kept private"],
            ["Overloads differing only in type arguments", "Same erasure: name clash", "Different method names"],
          ],
        },
        {
          type: "heading",
          text: "The Class<T> token",
        },
        {
          type: "code",
          language: "java",
          title: "TypeToken.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class TypeToken {
    // Pass the Class object: the classic workaround for new T() and T.class
    static <T> T create(Class<T> type) throws ReflectiveOperationException {
        return type.getDeclaredConstructor().newInstance();
    }

    static <T> List<T> onlyOfType(List<?> mixed, Class<T> type) {
        List<T> out = new ArrayList<>();
        for (Object o : mixed) if (type.isInstance(o)) out.add(type.cast(o));
        return out;
    }

    public static void main(String[] args) throws Exception {
        StringBuilder sb = create(StringBuilder.class);
        sb.append("made by reflection");
        System.out.println(sb);
        List<Object> mixed = List.of("Asha", 42, "Ravi", 3.5);
        List<String> names = onlyOfType(mixed, String.class);
        System.out.println(names);

        Object o = List.of("x");
        if (o instanceof List<?> list) System.out.println("a List of size " + list.size());
    }
}`,
        },
        {
          type: "output",
          text: `made by reflection
[Asha, Ravi]
a List of size 1`,
        },
        {
          type: "paragraph",
          text: "`Class<T>` is itself generic: `String.class` has type `Class<String>`. Passing it gives the method a runtime object that represents `T`, so it can create instances, check with `isInstance` and cast with `cast`, all typed. The JDK uses this pattern in `EnumSet.noneOf(Class<E>)`, `Collections.checkedList(list, Class<E>)` and `ServiceLoader.load(Class<S>)`; JPA's `entityManager.find(Driver.class, id)` is the same idea. For types like `List<Fare>`, a `Class` isn't enough; the next lesson builds a super type token for that.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `UseBox.length()` from the Internal Working section, from source to result:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Parse and attribute.** `javac` reads `Box<String> b = new Box<>(\"Asha\");`. The diamond takes `String` from the declared type. The constructor's parameter type is `T`, substituted to `String`, and `\"Asha\"` is a `String`, so the call type-checks.",
            "**Check the read.** `String s = b.get();` : `get()` returns `T`, which is `String` for this `b`, so assigning it to a `String` is fine. Had I written `Integer s = b.get();`, this is where the compile error would come from.",
            "**Erase.** `Box<String>` becomes `Box`, `T` becomes `Object`. The constructor call becomes `invokespecial Box.<init>(Object)`, and `get()` becomes `invokevirtual Box.get()Object`.",
            "**Insert the cast.** The erased `get()` returns `Object`, but the source assigns it to a `String`, so `javac` emits `checkcast String` after the call. The `Signature` attributes for `Box` were already in `Box.class`; `UseBox.class` stores only erased descriptors at the call site.",
            "**Run: construct.** The JVM allocates a `Box` (one `Object` field), runs the constructor and stores the reference to `\"Asha\"`. Nothing in the object records `String`.",
            "**Run: get and cast.** `get()` returns the field as an `Object`. `checkcast` verifies the object really is a `String`, which it is, so the reference goes into `s`. If something had polluted the box through a raw type, this is the instruction that would throw `ClassCastException`.",
            "**Run: length.** `s.length()` is an ordinary `String` call, and `length()` returns 4. The JIT typically removes the `checkcast` once profiling shows it always succeeds, so the generic version runs as fast as hand-written code.",
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
          title: "SyntaxTour.java",
          code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;

public class SyntaxTour {
    // 1. generic class, with a generic constructor inside
    static class Holder<T> {
        final T value;
        Holder(T value) { this.value = value; }
        <S> Holder(S source, Function<S, T> convert) { this.value = convert.apply(source); }
    }

    // 2. generic record and generic interface
    record Pair<A, B>(A first, B second) { }
    interface Mapper<I, O> { O map(I in); }

    // 3. generic static factory method
    static <T> List<T> listOf2(T a, T b) {
        List<T> l = new ArrayList<>();
        l.add(a);
        l.add(b);
        return l;
    }

    // 4. bounded and multiple bounds
    static <T extends Comparable<T>> boolean ordered(T a, T b) { return a.compareTo(b) <= 0; }
    static <T extends CharSequence & Comparable<T>> T longer(T a, T b) { return a.length() >= b.length() ? a : b; }

    public static void main(String[] args) {
        Holder<String> h1 = new Holder<>("Asha");                        // diamond
        Holder<Integer> h2 = new Holder<>("120", Integer::parseInt);      // generic constructor
        Pair<String, Integer> p = new Pair<>("SALT-LAKE", 70);
        Mapper<String, Integer> len = String::length;
        System.out.println(h1.value + " " + (h2.value + 1) + " " + p + " " + len.map("Kolkata"));

        List<String> two = listOf2("a", "b");
        List<Number> nums = SyntaxTour.<Number>listOf2(1, 2.5);          // explicit type witness
        System.out.println(two + " " + nums + " " + ordered(3, 7) + " " + longer("Pune", "Delhi"));

        Comparator<String> byLength = new Comparator<>() {               // diamond with an anonymous class (Java 9)
            @Override public int compare(String a, String b) { return Integer.compare(a.length(), b.length()); }
        };
        List<String> cities = new ArrayList<>(List.of("Kolkata", "Pune", "Delhi"));
        cities.sort(byLength);
        System.out.println(cities);

        var holders = new ArrayList<Holder<String>>();                    // var with an explicit type argument
        holders.add(h1);
        System.out.println(holders.get(0).value);
    }
}`,
        },
        {
          type: "output",
          text: `Asha 121 Pair[first=SALT-LAKE, second=70] 7
[a, b] [1, 2.5] true Delhi
[Pune, Delhi, Kolkata]
Asha`,
        },
        {
          type: "paragraph",
          text: "A **generic constructor** (`<S> Holder(S source, ...)`) has its own type parameter, independent of the class's `T`; it's rare but legal. `var` with a diamond (`var x = new ArrayList<>();`) would infer `ArrayList<Object>`, so with `var` I write the type argument on the right.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: A generic Result type with sealed records and pattern matching",
        },
        {
          type: "code",
          language: "java",
          title: "ResultType.java",
          code: `import java.util.List;
import java.util.function.Function;

public class ResultType {
    // A generic result type: either a value or an error, never both
    sealed interface Result<T> permits Ok, Err { }
    record Ok<T>(T value) implements Result<T> { }
    record Err<T>(String message) implements Result<T> { }

    static <T, R> Result<R> map(Result<T> r, Function<T, R> f) {
        return switch (r) {
            case Ok<T> ok -> new Ok<>(f.apply(ok.value()));
            case Err<T> err -> new Err<>(err.message());
        };
    }

    record Fare(String zone, int paise) { }

    static Result<Fare> quote(String zone) {
        return switch (zone) {
            case "SALT-LAKE" -> new Ok<>(new Fare(zone, 7_000));
            case "NEW-TOWN" -> new Ok<>(new Fare(zone, 8_000));
            default -> new Err<>("unknown zone " + zone);
        };
    }

    public static void main(String[] args) {
        for (String zone : List.of("SALT-LAKE", "DUM-DUM")) {
            Result<String> shown = map(quote(zone), f -> "Rs " + f.paise() / 100);
            String text = switch (shown) {
                case Ok<String>(String v) -> "quote: " + v;
                case Err<String>(String m) -> "error: " + m;
            };
            System.out.println(text);
        }
    }
}`,
        },
        {
          type: "output",
          text: `quote: Rs 70
error: unknown zone DUM-DUM`,
        },
        {
          type: "paragraph",
          text: "Generics, sealed types and records together on Java 21. `Result<T>` can only be `Ok<T>` or `Err<T>`, so the `switch` needs no `default`: the compiler knows it's exhaustive. `map` turns a `Result<Fare>` into a `Result<String>` without unwrapping it by hand, and record patterns (`case Ok<String>(String v)`) take the value out with its type. The Exception Handling Best Practices lesson compared this style with exceptions.",
        },
        {
          type: "heading",
          text: "Example 2: A typesafe heterogeneous container",
        },
        {
          type: "code",
          language: "java",
          title: "TypedContainer.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class TypedContainer {
    // Typesafe heterogeneous container: the Class object is the key and the type token
    static final class RequestContext {
        private final Map<Class<?>, Object> values = new HashMap<>();

        <T> void put(Class<T> type, T value) {
            values.put(type, type.cast(value));          // cast checks raw-type misuse at insert time
        }

        <T> T get(Class<T> type) {
            return type.cast(values.get(type));          // safe: the map only holds matching pairs
        }
    }

    record UserId(String value) { }
    record TraceId(String value) { }

    public static void main(String[] args) {
        RequestContext ctx = new RequestContext();
        ctx.put(UserId.class, new UserId("U-77"));
        ctx.put(TraceId.class, new TraceId("t-9f3a"));
        ctx.put(Integer.class, 3);                       // retry count

        UserId user = ctx.get(UserId.class);             // no cast at the call site
        int retries = ctx.get(Integer.class);
        System.out.println(user + " " + ctx.get(TraceId.class) + " retries=" + retries);
        System.out.println("missing: " + ctx.get(String.class));
    }
}`,
        },
        {
          type: "output",
          text: `UserId[value=U-77] TraceId[value=t-9f3a] retries=3
missing: null`,
        },
        {
          type: "paragraph",
          text: "A pattern from *Effective Java* (item 33): a map that holds values of **different** types, each retrievable with its own type, with no cast at the call site. The `Class<T>` key both identifies the entry and carries the type for `cast`. Request contexts, plugin registries and Spring's `ApplicationContext.getBean(Class<T>)` work this way.",
        },
        {
          type: "heading",
          text: "Example 3: A generic min/max with a Comparator",
        },
        {
          type: "code",
          language: "java",
          title: "MinMax.java",
          code: `import java.util.Comparator;
import java.util.List;

public class MinMax {
    record Range<T>(T min, T max) { }

    static <T> Range<T> minMax(List<T> items, Comparator<T> order) {
        if (items.isEmpty()) throw new IllegalArgumentException("empty");
        T min = items.get(0), max = items.get(0);
        for (T t : items) {
            if (order.compare(t, min) < 0) min = t;
            if (order.compare(t, max) > 0) max = t;
        }
        return new Range<>(min, max);
    }

    record Trip(String id, int fare) { }

    public static void main(String[] args) {
        System.out.println(minMax(List.of(120, 85, 240), Comparator.naturalOrder()));
        System.out.println(minMax(List.of("Pune", "Kolkata", "Goa"), Comparator.comparing(String::length)));
        List<Trip> trips = List.of(new Trip("T1", 120), new Trip("T2", 60), new Trip("T3", 300));
        Range<Trip> r = minMax(trips, Comparator.comparingInt(Trip::fare));
        System.out.println(r.min().id() + " " + r.max().id());
    }
}`,
        },
        {
          type: "output",
          text: `Range[min=85, max=240]
Range[min=Goa, max=Kolkata]
T2 T3`,
        },
        {
          type: "paragraph",
          text: "One method, written once, for numbers, strings and trips. Taking a `Comparator<T>` instead of bounding `T extends Comparable<T>` means it works for types with no natural order and for any ordering I choose. The generic record `Range<T>` returns both results with their real type, instead of an `Object[]`.",
        },
      ],
    },
    {
      title: "When to Use Generics",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "What I write", "Why"],
          rows: [
            ["A container or wrapper that holds \"some type\" (box, cache, page, result)", "A generic class `Page<T>`", "Type-safe for every element type, written once"],
            ["An algorithm that works on many types (max, first, swap, group)", "A generic method `<T> ...`", "No need to make the class generic"],
            ["The algorithm needs methods of the type (compare, add numbers)", "A bounded parameter `<T extends Comparable<T>>`, or a `Comparator<T>` argument", "Bounds unlock methods; a comparator is more flexible"],
            ["Code that only works with one type", "No generics", "`List<Fare> loadFares()` is clearer than `<T> List<T> load()`"],
            ["Creating instances or checking types at run time", "A `Class<T>` or `Supplier<T>` parameter", "Erasure removes `T` at run time"],
            ["Returning several values", "A generic record `Pair<A, B>`, or better a named record", "Typed fields instead of `Object[]`"],
            ["Old code with raw types", "Add type arguments; use `-Xlint:rawtypes,unchecked` to find them", "Each raw type is an unchecked hole"],
          ],
        },
        {
          type: "paragraph",
          text: "My rule: make the API generic when the **same logic** really applies to several types, and keep it concrete otherwise. A `Repository<T, ID>` interface is worth it because every entity uses the same operations; a `FareCalculator<T>` with only one `T` ever used is ceremony.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Using raw types",
        },
        {
          type: "paragraph",
          text: "`List names = new ArrayList();` compiles, turns off every generic check for that variable, and moves type errors to run time. It also spreads: calling a method on a raw type erases the generic types of its return value too. The only legitimate uses left are class literals (`List.class`) and `instanceof List`; everywhere else write `List<String>`, or `List<?>` when the type really is unknown.",
        },
        {
          type: "heading",
          text: "Ignoring unchecked warnings",
        },
        {
          type: "paragraph",
          text: "`Note: ... uses unchecked or unsafe operations` is easy to scroll past. Each unchecked warning marks a place where the compiler can no longer guarantee type safety. Compile with `-Xlint:unchecked`, fix what can be fixed, and put `@SuppressWarnings(\"unchecked\")` on the **smallest** scope (one variable declaration) with a comment explaining why the cast is safe. A class-level suppression hides every future problem too.",
        },
        {
          type: "heading",
          text: "Expecting a type argument at run time",
        },
        {
          type: "paragraph",
          text: "`new T()`, `T.class`, `instanceof List<String>` and `catch (MyException<T> e)` don't compile, and `list.getClass()` says `ArrayList` whatever the element type. Pass a `Class<T>` or `Supplier<T>` when the type is needed at run time.",
        },
        {
          type: "heading",
          text: "Overloading on type arguments",
        },
        {
          type: "paragraph",
          text: "`process(List<String>)` and `process(List<Integer>)` clash because they erase to the same signature, as `NameClash` showed. Use different method names.",
        },
        {
          type: "heading",
          text: "Writing implements in a bound, or putting an interface first",
        },
        {
          type: "paragraph",
          text: "Bounds always use `extends`, even for interfaces, and a class bound must come first: `<T extends Number & Comparable<T>>`, not `<T extends Comparable<T> & Number>`.",
        },
        {
          type: "heading",
          text: "Using the class's T in a static method",
        },
        {
          type: "paragraph",
          text: "A static method of `Box<T>` can't see `T`. If it needs a type parameter, it declares its own: `static <U> Box<U> of(U value)`. Reusing the name `T` for a method's own parameter compiles, but it **shadows** the class's `T` and confuses readers.",
        },
        {
          type: "heading",
          text: "Assuming List<Integer> is a List<Number>",
        },
        {
          type: "paragraph",
          text: "It isn't, even though `Integer` is a `Number`, and `List<Object>` doesn't accept a `List<String>`. This invariance and the wildcards that solve it are the core of the next lesson.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Never use raw types in new code. Compile with `-Xlint:all` (or at least `rawtypes,unchecked`) and treat the warnings as errors in CI.",
            "Use the diamond and inference; write explicit type arguments only where they help a reader or inference fails.",
            "Prefer generic methods to generic classes when only one operation needs the type parameter.",
            "Use bounds to express real requirements (`<T extends Comparable<? super T>>`), and accept a `Comparator<T>` when callers may want other orderings.",
            "Use single-letter type parameter names with the usual meanings (`T`, `E`, `K`, `V`, `R`).",
            "Pass a `Class<T>` or `Supplier<T>` when the type is needed at run time; don't rely on reflection hacks to recover `T`.",
            "Suppress unchecked warnings on the smallest possible scope, with a comment proving the cast is safe.",
            "Prefer `List<T>` over `T[]` in generic code, and records with type parameters over `Object[]` or `Map<String, Object>` for structured results.",
            "Use primitive-specialised types (`int[]`, `IntStream`, `OptionalInt`) on hot numeric paths: type arguments are always boxed.",
            "Wrap legacy raw collections with `Collections.checkedList`/`checkedMap` while migrating, so a wrong insert fails at the insert.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Generics themselves cost nothing at run time: the bytecode is the same as hand-written code with `Object` and casts, and the JIT removes the casts that always succeed. The real cost is **boxing**, because type arguments must be reference types. I summed 10 million values held in an `int[]` and in a `List<Integer>`, best of 10 runs:",
        },
        {
          type: "code",
          language: "java",
          title: "BoxingCost.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.function.LongSupplier;

public class BoxingCost {
    static long best(LongSupplier s) {
        long best = Long.MAX_VALUE, check = 0;
        for (int i = 0; i < 10; i++) {
            long t = System.nanoTime();
            check += s.getAsLong();
            best = Math.min(best, System.nanoTime() - t);
        }
        if (check == 42) System.out.print("");
        return best / 1_000_000;
    }

    public static void main(String[] args) {
        int n = 10_000_000;
        int[] prim = new int[n];
        List<Integer> boxed = new ArrayList<>(n);
        for (int i = 0; i < n; i++) { prim[i] = i % 1000 + 200; boxed.add(prim[i]); }

        System.out.println("int[]          sum: " + best(() -> { long s = 0; for (int v : prim) s += v; return s; }) + " ms");
        System.out.println("List<Integer>  sum: " + best(() -> { long s = 0; for (int v : boxed) s += v; return s; }) + " ms");
        System.out.println("List<Integer>  stream mapToLong:" + best(() -> boxed.stream().mapToLong(Integer::longValue).sum()) + " ms");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xmx2g BoxingCost",
        },
        {
          type: "output",
          text: `int[]          sum: 2 ms
List<Integer>  sum: 13 ms
List<Integer>  stream mapToLong:14 ms`,
        },
        {
          type: "list",
          items: [
            "The `List<Integer>` was about **6 times slower** to sum: every element is a separate `Integer` object, reached through a reference, then unboxed. The `int[]` is one contiguous block, and the JIT vectorises the loop. A previous run gave 2, 14 and 14 ms.",
            "Memory follows the same pattern, as the Arrays lesson measured: 4 bytes per `int` against 4 + 16 bytes per `Integer` (values from -128 to 127 are cached and shared; most of these values, 200 to 1,199, aren't).",
            "Converting to a stream doesn't help when the source is already boxed: `mapToLong` still unboxes each element. Primitive streams help when the data starts primitive (`Arrays.stream(int[])`, `IntStream.range`).",
            "Casts inserted by erasure are almost free: `checkcast` on a type the JIT has already seen is folded away or reduced to a single comparison.",
            "Bridge methods add one extra call that the JIT inlines immediately.",
          ],
        },
      ],
    },
    {
      title: "Generics in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend applies surge pricing in certain zones. The list of surge zones comes from a config loader written in 2008, before the codebase used generics, and it still returns a raw `List`. The newer pricing service wraps it in a `List<String>` with an unchecked conversion, and works for years. Then an admin job is added that syncs surge zones from the database, where zones have numeric IDs. Overnight, every price request in the city starts failing with `ClassCastException` in the pricing code, which nobody had touched.",
        },
        {
          type: "code",
          language: "java",
          title: "SurgeZones.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SurgeZones {
    // Legacy config loader, written before generics and never updated
    static final class LegacyConfig {
        @SuppressWarnings("rawtypes")
        private final List surgeZones = new ArrayList();
        @SuppressWarnings("rawtypes")
        List surgeZones() { return surgeZones; }
    }

    // New code: typed, trusts the legacy API with an unchecked conversion
    static final class Pricing {
        private final List<String> zones;
        @SuppressWarnings("unchecked")
        Pricing(LegacyConfig config) { this.zones = config.surgeZones(); }

        double multiplier(String pickupZone) {
            for (String z : zones) {                       // the hidden cast happens here
                if (z.equals(pickupZone)) return 1.5;
            }
            return 1.0;
        }
    }

    // An admin job added months later: zone IDs come from the database as Integer
    @SuppressWarnings({"rawtypes", "unchecked"})
    static void adminSync(List zones, int zoneIdFromDb) {
        zones.add(zoneIdFromDb);
    }

    @SuppressWarnings("unchecked")
    public static void main(String[] args) {
        LegacyConfig config = new LegacyConfig();
        config.surgeZones().add("SALT-LAKE");
        Pricing pricing = new Pricing(config);
        System.out.println("before sync: " + pricing.multiplier("NEW-TOWN"));

        adminSync(config.surgeZones(), 1042);              // the real bug: no error here
        try {
            pricing.multiplier("NEW-TOWN");                // fails far away, in pricing
        } catch (ClassCastException e) {
            System.out.println("pricing failed: " + e.getMessage().substring(0, 70) + "...");
            System.out.println("  at " + e.getStackTrace()[0]);
        }

        // Diagnosis: wrap the list so every insert is type-checked
        List<String> checked = Collections.checkedList(new ArrayList<>(), String.class);
        checked.add("SALT-LAKE");
        try {
            adminSync(checked, 1042);                      // now it fails at the source
        } catch (ClassCastException e) {
            System.out.println("checked list: " + e.getMessage());
            System.out.println("  at " + e.getStackTrace()[2]);
        }
    }
}`,
        },
        {
          type: "output",
          text: `before sync: 1.0
pricing failed: class java.lang.Integer cannot be cast to class java.lang.String (java...
  at SurgeZones$Pricing.multiplier(SurgeZones.java:21)
checked list: Attempt to insert class java.lang.Integer element into collection with element type class java.lang.String
  at SurgeZones.adminSync(SurgeZones.java:31)`,
        },
        {
          type: "list",
          items: [
            "**The failure points at the victim, not the culprit.** The stack trace says `Pricing.multiplier`, line 21, the `for (String z : zones)` loop, where `javac` inserted a `checkcast String`. The code that put an `Integer` in is in `adminSync`, which has finished long before. The on-call engineer debugging pricing will find nothing wrong in pricing.",
            "**How it got past the compiler.** Two holes: the raw `List` returned by the legacy loader, and the unchecked conversion to `List<String>` in `Pricing`, with its warning suppressed. Each is \"just a warning\"; together they let a `List<String>` hold an `Integer`. This is called **heap pollution**, and the next lesson covers it in depth.",
            "**Finding the culprit.** `Collections.checkedList(list, String.class)` returns a wrapper whose `add` checks every element at run time. With it in place, the same bad call failed **in `adminSync`**, with a message naming both types. It's the fastest way to find who pollutes a collection: wrap it, reproduce, read the stack trace.",
            "**The fix.** Give the legacy loader a real type (`List<String> surgeZones()`), and have the admin job convert zone IDs to zone names at its own boundary. Remove the `@SuppressWarnings(\"unchecked\")` on the constructor: once the source is typed, it isn't needed.",
            "**Preventing the next one.** Build with `-Xlint:rawtypes,unchecked -Werror` and fix the legacy code once, instead of allowing raw types and suppressions to accumulate. Static analysis (Error Prone, SonarQube) flags raw types and broad suppressions too.",
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
              question: "What are generics, and why were they added to Java?",
              answer:
                "Generics let classes, interfaces and methods take types as parameters, like `List<String>` or `Map<String, Integer>`. They were added in Java 5 to catch type errors at compile time instead of run time, and to remove manual casts.\n\nBefore generics, a `List` held `Object`s: putting an `Integer` into a list meant for strings compiled fine and failed later with `ClassCastException` wherever someone cast it, as `BeforeGenerics` showed. With `List<String>`, the same `add` is a compile error on the line that causes it.",
            },
            {
              question: "What is the diamond operator?",
              answer:
                "`<>` in `new HashMap<>()`, added in Java 7. It tells the compiler to infer the type arguments from the context, usually the declared type on the left, so `Map<String, List<Integer>> m = new HashMap<>();` doesn't repeat `<String, List<Integer>>`. Since Java 9 it also works with anonymous classes.",
            },
            {
              question: "Can you use primitives as type arguments, like List<int>?",
              answer:
                "No. Type arguments must be reference types, because generic code is erased to `Object` (or the bound), and an `int` isn't an object. Use the wrapper, `List<Integer>`, and autoboxing converts between them. For performance-critical numeric code, use `int[]` or `IntStream` instead: summing a `List<Integer>` was about 6 times slower than an `int[]` in my test. Project Valhalla may allow `List<int>` in a future release.",
            },
            {
              question: "What is a generic method, and how is it declared?",
              answer:
                "A method with its own type parameters, declared in angle brackets before the return type: `static <T> T firstOrDefault(List<T> items, T fallback)`. The class doesn't need to be generic. The type argument is usually inferred from the arguments at each call, and can be given explicitly with a type witness: `Util.<String>firstOrDefault(...)`.",
            },
            {
              question: "What is a raw type?",
              answer:
                "A generic type used without type arguments, like `List` instead of `List<String>`. It exists only for compatibility with pre-Java 5 code. Using it switches off generic type checking for that variable, so wrong types get in silently, and `javac` only warns. In new code, raw types should never be used, except in class literals (`List.class`) and `instanceof`.",
            },
            {
              question: "What does <T extends Number> mean?",
              answer:
                "It's a bounded type parameter: `T` can only be `Number` or a subclass (`Integer`, `Double`, `BigDecimal`...). In return, code can call `Number`'s methods on a `T`, such as `doubleValue()`. After erasure, `T` becomes `Number` in the bytecode. `extends` is used for interfaces too: `<T extends Comparable<T>>`.",
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
              question: "What is type erasure?",
              answer:
                "The way Java implements generics: `javac` uses the type arguments to check the code, then removes them. Type parameters are replaced by their bound (`Object` if unbounded), and casts are inserted where typed values are used. `javap` on my `Box<T>` showed the field as `Object`, and the caller of `get()` had a `checkcast String` I never wrote.\n\nAs a result, `List<String>` and `List<Integer>` are the same runtime class, and an object doesn't know its type argument. It was chosen so generic code would be compatible with the huge amount of pre-generics code and libraries.",
            },
            {
              question: "Why can't you write new T() or T.class?",
              answer:
                "Because of erasure: at run time there's no `T`, only its bound, so the JVM wouldn't know which class to instantiate or return. `new T()` would erase to `new Object()`. The workaround is to pass the type in: a `Class<T>` (`type.getDeclaredConstructor().newInstance()`) or a `Supplier<T>` (`Foo::new`), as `TypeToken.create(StringBuilder.class)` did.",
            },
            {
              question: "What is a bridge method?",
              answer:
                "A synthetic method `javac` generates so that overriding still works after erasure. `Fare implements Comparable<Fare>` declares `compareTo(Fare)`, but the interface method erases to `compareTo(Object)`. `javac` adds `compareTo(Object)` that casts to `Fare` and calls mine. Reflection reports it with `isBridge() == true`; calling it with a `String` through a raw `Comparable` threw `ClassCastException` inside the bridge.",
            },
            {
              question: "Why can't you overload process(List<String>) and process(List<Integer>)?",
              answer:
                "Both erase to `process(List)`. A class file can't contain two methods with the same name and erased descriptor, so `javac` reports \"name clash: ... have the same erasure\". Use different method names.",
            },
            {
              question: "What is the difference between a generic class and a generic method?",
              answer:
                "A generic class's type parameter (`class Box<T>`) is fixed when the object is created (`new Box<String>`) and shared by all its instance members. A generic method's parameter (`<T> T first(List<T>)`) is chosen at each call, usually by inference, and exists only within that method. Static methods can't use the class's type parameter, so static generic code always uses generic methods (`static <T> List<T> of(T...)`).",
            },
            {
              question: "Can a type parameter have multiple bounds?",
              answer:
                "Yes, joined with `&`: `<T extends Number & Comparable<T>>`. At most one bound can be a class, and it must come first; the rest are interfaces. `T` can then use the methods of all of them, and it erases to the first bound. `clampMax(250, 200)` used both `Number` and `compareTo`.",
            },
            {
              question: "What does Collections.checkedList do, and when would you use it?",
              answer:
                "It wraps a list so every insertion checks the element's runtime class, throwing `ClassCastException` at the `add` itself. Generic checks are compile-time only, so raw types or unchecked casts can sneak a wrong element in, and the failure normally appears later at a read. I'd use it while debugging heap pollution or around legacy raw-typed code: in `SurgeZones`, it moved the failure from the pricing loop to the admin job that actually inserted the `Integer`.",
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
              question: "If types are erased, how does reflection know a field is List<String>?",
              answer:
                "Erasure removes type arguments from objects and from executed bytecode, but the **declarations** are kept in the class file's `Signature` attribute: for the class, each field and each method. `javap -v Box` shows `Signature: ()TT;` for `get`. Reflection reads it with `Field.getGenericType()`, `Method.getGenericReturnType()` and `Class.getGenericSuperclass()`. What's lost is the type argument of an individual object: a `new ArrayList<String>()` can't tell you `String`.",
            },
            {
              question: "What does a bounded type parameter erase to, and why does it matter?",
              answer:
                "To its first bound. `NumberBox<T extends Number>` has a `Number` field in the bytecode, and `value.doubleValue()` compiles to a direct `invokevirtual Number.doubleValue` without a cast. With multiple bounds, the erasure is the first one, which is why `Collections.max` is declared `<T extends Object & Comparable<? super T>>`: its erased return type stays `Object`, matching the pre-generics signature for binary compatibility. `javap -s` shows it as `(Ljava/util/Collection;)Ljava/lang/Object;`.",
            },
            {
              question: "Why can't a generic class extend Throwable?",
              answer:
                "Exception handling is a runtime mechanism: `catch (MyException<String> e)` would have to distinguish `MyException<String>` from `MyException<Integer>`, but both are the same class after erasure, so the JVM couldn't choose between two `catch` blocks. `javac` therefore reports \"a generic class may not extend java.lang.Throwable\". An exception can still have a field of a generic type, set through a non-generic class.",
            },
            {
              question: "Do generics have a runtime cost?",
              answer:
                "Almost none in themselves: erased bytecode is the same as hand-written code with `Object` and casts, and the JIT removes `checkcast`s that always succeed and inlines bridge methods. The real cost is boxing, since type arguments must be objects: summing 10 million values took 13 ms from a `List<Integer>` against 2 ms from an `int[]`, plus five times the memory.",
            },
            {
              question: "How did Java's generics design differ from C#'s, and what did each gain?",
              answer:
                "Java erases type arguments; C# (since .NET 2.0) reifies them, so `List<int>` and `List<string>` are distinct runtime types. Java gained full compatibility: existing raw code and libraries kept working with the same classes, no duplicate collection hierarchy. It gave up runtime type information (`new T()`, `instanceof List<String>`, generic arrays) and primitive specialisation, which is why `List<Integer>` boxes. C# allows `new T()` with a constraint, `typeof(T)`, and unboxed `List<int>`, but needed new generic collection classes alongside the old ones.",
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
              question: "Production throws ClassCastException inside a for-each loop over a List<String> in code nobody has changed. The list comes from an older module. How do you find the cause?",
              answer:
                "A `List<String>` can only contain a non-`String` through heap pollution: a raw type or an unchecked cast somewhere let an `Integer` (or anything else) in. The stack trace shows where the hidden `checkcast` failed, the reader, not where the wrong element was added.\n\nTo find the writer, I'd wrap the list with `Collections.checkedList(list, String.class)` where it's created (or where the old module hands it over), reproduce, and read the new stack trace, which points at the `add`. That's exactly what moved the failure from `Pricing.multiplier` to `adminSync` in `SurgeZones`. Then I'd fix the raw type at the source and remove the `@SuppressWarnings(\"unchecked\")` that hid it.",
            },
            {
              question: "A teammate's generic DAO has a method <T> T findById(Object id) and calls new T() to build entities. It doesn't compile. How would you redesign it?",
              answer:
                "`new T()` can't work because `T` is erased. The DAO needs a runtime representation of the type: make it `class JdbcDao<T>` with a constructor parameter `Class<T> type` (or a `Supplier<T> factory`), store it, and use `type.getDeclaredConstructor().newInstance()` or `factory.get()`. That's how JPA works: `entityManager.find(Driver.class, id)`.\n\nI'd also question the signature: `<T> T findById(Object id)` lets each caller pick any `T`, so `Fare f = dao.findById(1)` compiles even if it returns a `Driver`. Putting `T` on the class (`JdbcDao<Driver>`) and the ID type as a second parameter (`ID id`) makes wrong calls compile errors.",
            },
            {
              question: "You're migrating an old library that returns raw Map and List everywhere. Changing all callers at once isn't possible. What's your plan?",
              answer:
                "Generify from the inside out, keeping binary compatibility. Adding type arguments to the library's signatures (`Map<String, List<Zone>>` instead of `Map`) doesn't change the erased descriptors, so already-compiled callers keep working; callers that recompile get warnings or errors that show real type mismatches, which is the point.\n\nWhile migrating, I'd compile with `-Xlint:rawtypes,unchecked` and track the warning count down, wrap collections that cross the old boundary in `Collections.checkedList`/`checkedMap` so bad inserts fail where they happen, and keep each `@SuppressWarnings(\"unchecked\")` on a single statement with a comment. Once a module is clean, I'd turn on `-Werror` for it so it stays clean.",
            },
            {
              question: "Code review: a utility method is declared <T> T getConfig(String key) and callers write int timeout = getConfig(\"timeout\"). Is that a good API?",
              answer:
                "No. The method lets the caller choose `T` freely, so the return value is effectively an unchecked cast: `int timeout = getConfig(\"timeout\")` compiles even if the stored value is the string `\"30s\"`, and fails with `ClassCastException` at the caller (or `NullPointerException` while unboxing a missing key). Generics there only hide the cast.\n\nBetter: take the type as an argument and check it, `<T> T getConfig(String key, Class<T> type)` returning `type.cast(value)`, like the typesafe container in Example 2; or provide typed accessors (`getInt`, `getDuration`) that parse and validate; or, best for configuration, bind it once to a typed record at startup so mistakes fail when the application starts.",
            },
            {
              question: "A hot path sums millions of fares from a List<Integer>, and profiling shows a lot of time in Integer.intValue and high allocation. What would you change?",
              answer:
                "Generics require reference types, so every fare is an `Integer` object that has to be dereferenced and unboxed, and each new value creates garbage. In my test, summing 10 million values took 13 ms from a `List<Integer>` and 2 ms from an `int[]`.\n\nI'd store the fares as an `int[]` or `long[]` (paise fit in a `long`), or produce them as an `IntStream`/`LongStream` from the start, and keep `List<Integer>` for small or non-critical collections. If a resizable primitive list is really needed, a small `IntList` class wrapping an `int[]` with `Arrays.copyOf` for growth, or a primitive-collections library, avoids the boxing.",
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
            "Write `class Pair<A, B>` with `first()`, `second()` and a `static <A, B> Pair<A, B> of(A a, B b)` factory. Create a `Pair<String, Integer>` with `Pair.of(\"Asha\", 120)` and print both parts without casts.",
            "Write `static <T extends Comparable<T>> T min(List<T> items)` and call it with a list of `String`s and a list of `Integer`s. Then call it with a `List<Object>` and read the error.",
            "Compile your `Pair` class and run `javap -p -c Pair`. Find the erased field types, then run `javap -v Pair | grep Signature`.",
            "Print `new ArrayList<String>().getClass() == new ArrayList<Integer>().getClass()`.",
            "Write `List raw = new ArrayList(); raw.add(1); List<String> s = raw; String x = s.get(0);`. Compile with `-Xlint:unchecked`, run it, and note which line throws.",
            "Write `class Holder<T> { T make() { return new T(); } }`, read the error, and fix it with a `Supplier<T>` constructor parameter.",
            "Make a class implement `Comparable<YourClass>`, compile it, and use reflection to print every declared method with `isBridge()`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 needs no casts anywhere, and the factory infers `<String, Integer>`. Step 2 returns the alphabetically first string and the smallest number; `List<Object>` fails because `Object` isn't `Comparable<Object>`. Step 3 shows `java.lang.Object` fields and `Signature` entries with `TA;` and `TB;`. Step 4 prints `true`. Step 5 compiles with two unchecked warnings (\"unchecked call to add(E) as a member of the raw type List\" and \"unchecked conversion\") and throws `ClassCastException` on `s.get(0)`, the read, not the `add`. Step 6 gives \"unexpected type, required: class, found: type parameter T\"; with `Supplier<T>` it becomes `factory.get()`. Step 7 lists two `compareTo` methods, one with `isBridge() == true`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHAT       types as parameters: List<String>, Map<K, V>, <T> T first(...)
           compile-time type safety, no manual casts (Java 5, JSR 14)

DECLARE    class Box<T>      interface Repo<T, ID>   record Pair<A, B>
           static <T> T first(List<T> l)   <- before the return type
           new Box<>("x")    diamond (7), anonymous classes too (9)
           Util.<String>first(...)          explicit type witness

BOUNDS     <T extends Number>               methods of the bound usable
           <T extends Comparable<T>>        recursive bound
           <T extends Number & Comparable<T>>  class first, then &

ERASURE    T -> Object (or first bound) in bytecode
           casts (checkcast) inserted at use sites
           Signature attribute keeps declarations (reflection, javac)
           List<String>.getClass() == List<Integer>.getClass()
           bridge methods keep overriding working

CAN'T      new T()  T.class  static T  List<int>  instanceof List<String>
           new T[]  generic exceptions  overloads with same erasure
           -> pass Class<T> or Supplier<T>

RAW TYPES  List without <...>: checks off, warnings only
           heap pollution -> CCE at the READ, far from the bug
           Collections.checkedList finds the WRITE

COST       erasure ~free; boxing is the cost (List<Integer> ~6x slower)`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Generics let the compiler know what a container holds or a method works on, so type mistakes become compile errors and casts disappear from my code. `javac` then erases the types: the JVM runs `Object` code with inserted casts, plus bridge methods.",
            "Erasure explains every restriction: no `new T()`, no `T.class`, no primitive type arguments, no overloading on type arguments, and one runtime class for every parameterization. A `Class<T>` or `Supplier<T>` brings the type back where it's needed.",
            "The next lesson, Wildcards, Variance and Type Erasure in Depth, answers the question this one left open: why a `List<Integer>` isn't a `List<Number>`, and how `? extends`, `? super` and PECS make generic APIs flexible. It also covers heap pollution in full and recovering `List<Fare>` at run time, with a real Jackson bug.",
          ],
        },
      ],
    },
  ],
};
