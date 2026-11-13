import type { Lesson } from "../types";

export const enums: Lesson = {
  slug: "enums",
  date: "2026-11-13",
  title: "Enums: Constants, Fields and Methods",
  description:
    "Java enums on JDK 21 from the inside: the int-constant pattern they replaced, name, ordinal, values and valueOf and their traps, fields, constructors and methods, constant-specific bodies that compile to sealed anonymous subclasses, what javac generates (a final class extending Enum, $VALUES, a values() that clones, a private constructor with hidden name and ordinal), switch on enums through the $SwitchMap class and Java 21 exhaustive switch expressions that throw MatchException when a constant is added later, why enums can't be extended, created or reflected into existence, the 40-byte cost of every values() call, and trip statuses stored by ordinal that corrupted a ride-hailing database.",
  tags: ["Core Java", "Enums", "Type Safety", "Bytecode"],
  sections: [
    {
      title: "What an Enum Is",
      blocks: [
        {
          type: "paragraph",
          text: "The Generics phase ended on `Result<T>`, a sealed type with exactly two kinds of value. An **enum** is the simplest version of that idea: a type with a fixed, named set of instances, listed in its declaration. `enum VehicleType { AUTO, MINI, SEDAN, SUV }` creates a type with exactly four values, and no code anywhere can create a fifth.",
        },
        {
          type: "paragraph",
          text: "Enums replace the old pattern of `static final int` constants, which were type-unsafe, printed as numbers and broke silently when values were reused. But an enum isn't just a named number. Each constant is a full **object** of a real class: it can have fields, a constructor, methods, and even its own method bodies, and it implements `Comparable` and `Serializable` for free. The compiler knows the complete list of constants, which makes `switch` over an enum checkable and makes `==` the correct comparison.",
        },
        {
          type: "paragraph",
          text: "This lesson covers declaring and using enums, adding state and behaviour, what `javac` generates for them (read with `javap`), how `switch` on an enum really works, and the rules that keep the set of instances fixed. The next lesson, EnumSet, EnumMap and Enum Patterns, covers the specialised collections and the design patterns built on enums: state machines, strategies and singletons.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 to 1.4 had no enums. The usual approach was the **int enum pattern**: `public static final int AUTO = 0;`. Joshua Bloch's first edition of *Effective Java* (2001) described a better **typesafe enum pattern**: a class with a private constructor and a fixed set of `public static final` instances. JSR 201, led by Bloch, turned that pattern into a language feature in Java 5 (2004), along with `EnumSet` and `EnumMap`.",
        },
        {
          type: "paragraph",
          text: "C enums are just named integers: an `enum Color` value can be assigned any `int`, and two enums with overlapping values are interchangeable. Java made every enum a class, so the compiler rejects a wrong type, and constants can carry data and code. Kotlin's `enum class` and C#'s `enum` (still integer-based) sit on either side of that design.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "`enum` (JSR 201), `java.lang.Enum`, `EnumSet`, `EnumMap`, `switch` on enums", "Everything in this phase"],
            ["Java 7 (2011)", "`switch` on strings", "Strings got the hash-then-equals switch; enums kept their ordinal-based one"],
            ["Java 14 (2020)", "Switch expressions and `->` labels (JEP 361)", "Exhaustive `switch` over an enum without `default`"],
            ["Java 16 (2021)", "Records; local enums allowed (JEP 395)", "Enums can be declared inside a method"],
            ["Java 17 (2021)", "Sealed classes (JEP 409)", "Enums with constant bodies are compiled as sealed classes"],
            ["Java 21 (2023)", "Pattern matching for `switch` (JEP 441): qualified enum constants as case labels, `MatchException`", "`case Status.STARTED ->` in a switch over a sealed interface"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of the ride types on a ride-hailing app's booking screen.",
        },
        {
          type: "list",
          items: [
            "The **enum type is the booking screen's fixed menu**: Auto, Mini, Sedan, SUV. A rider picks one of them; they can't type in \"helicopter\".",
            "**Each constant is a real tile on that menu**, not just a number: it has a picture, a seat count and a fare per kilometre. Those are the enum's **fields**, and \"estimate the fare\" is its **method**.",
            "The **ordinal is the tile's position** on the screen. It's handy for drawing the menu in order, but if the product team inserts a new tile in the middle, every tile after it moves. Saving \"the rider picked tile 2\" in a database is the production bug at the end of this lesson; saving \"the rider picked Sedan\" isn't.",
            "**`==` works** because there is only one Sedan tile. Two people holding \"Sedan\" are pointing at the same tile, not two copies of it.",
            "**Adding a new ride type** means shipping a new version of the app. Code that has a decision for every ride type (a `switch` expression) has to be updated too, and Java 21 refuses to compile it until it is, or throws `MatchException` if an old compiled version meets the new type.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real booking screen can be configured from a server at run time. An enum can't: its constants are fixed when the class is compiled. Ride types that change without a release belong in a database table, not an enum.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "What every enum gets",
        },
        {
          type: "table",
          headers: ["Member", "Where it comes from", "What it does"],
          rows: [
            ["`name()`", "`java.lang.Enum`, final", "The constant's identifier exactly as declared: `\"SEDAN\"`"],
            ["`toString()`", "`Enum`, overridable", "Returns `name()` unless overridden"],
            ["`ordinal()`", "`Enum`, final", "Position in the declaration, from 0"],
            ["`compareTo(E)`", "`Enum`, final; `Comparable<E>`", "Compares ordinals: declaration order"],
            ["`equals`, `hashCode`", "`Enum`, final", "Identity-based; `equals` is `==`"],
            ["`getDeclaringClass()`", "`Enum`, final", "The enum type, even for constants with a body"],
            ["`values()`", "Generated by `javac`", "A **new** array of all constants, in order"],
            ["`valueOf(String)`", "Generated by `javac`", "The constant with that exact name, or `IllegalArgumentException`"],
            ["`Enum.valueOf(Class, String)`", "`Enum`, static", "The generic version, used by `valueOf`"],
          ],
        },
        {
          type: "heading",
          text: "The rules",
        },
        {
          type: "list",
          items: [
            "Every enum implicitly extends `java.lang.Enum<E>`, so it **can't extend another class**. It **can implement interfaces**.",
            "An enum is implicitly `final` (unless a constant has a body), so **nothing can extend an enum**.",
            "Constructors are implicitly `private`. Writing `public` is a compile error; there's no way to call `new` on an enum from anywhere.",
            "The constants must come first in the body, separated by commas, ending with a `;` if anything follows.",
            "A nested enum is implicitly `static`. Enums can be top-level, nested, or (since Java 16) local to a method.",
            "Enums can't be generic: `enum Box<T>` isn't allowed.",
            "Enums are `Comparable` (by ordinal) and `Serializable` (by name, as the next lesson shows).",
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "To see what an enum really is, I compiled one with fields, a constructor, methods and a static lookup map, and read it back with `javap`:",
        },
        {
          type: "code",
          language: "java",
          title: "VehicleType.java",
          code: `import java.util.HashMap;
import java.util.Map;

public enum VehicleType {
    AUTO("AT", 3, 3_000, 1_200),
    MINI("MN", 4, 5_000, 1_400),
    SEDAN("SD", 4, 8_000, 1_800),
    SUV("SV", 6, 12_000, 2_400);

    private final String code;          // what the partner API sends
    private final int seats;
    private final int baseFarePaise;
    private final int perKmPaise;

    // Always private (implicitly): nobody outside can create a VehicleType
    VehicleType(String code, int seats, int baseFarePaise, int perKmPaise) {
        this.code = code;
        this.seats = seats;
        this.baseFarePaise = baseFarePaise;
        this.perKmPaise = perKmPaise;
    }

    public int seats() { return seats; }

    public int farePaise(double km) {
        return baseFarePaise + (int) Math.round(km * perKmPaise);
    }

    // Lookup by code, built once when the class is initialised
    private static final Map<String, VehicleType> BY_CODE = new HashMap<>();
    static {
        for (VehicleType t : values()) BY_CODE.put(t.code, t);
    }

    public static VehicleType fromCode(String code) {
        VehicleType t = BY_CODE.get(code);
        if (t == null) throw new IllegalArgumentException("unknown vehicle code " + code);
        return t;
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac VehicleType.java && javap -p VehicleType",
        },
        {
          type: "output",
          text: `Compiled from "VehicleType.java"
public final class VehicleType extends java.lang.Enum<VehicleType> {
  public static final VehicleType AUTO;
  public static final VehicleType MINI;
  public static final VehicleType SEDAN;
  public static final VehicleType SUV;
  private final java.lang.String code;
  private final int seats;
  private final int baseFarePaise;
  private final int perKmPaise;
  private static final java.util.Map<java.lang.String, VehicleType> BY_CODE;
  private static final VehicleType[] $VALUES;
  public static VehicleType[] values();
  public static VehicleType valueOf(java.lang.String);
  private VehicleType(java.lang.String, int, int, int);
  public int seats();
  public int farePaise(double);
  public static VehicleType fromCode(java.lang.String);
  private static VehicleType[] $values();
  static {};
}`,
        },
        {
          type: "image",
          src: "/images/java/enums-compiled-class.svg",
          alt: "Left, the source enum VehicleType with constants AUTO(\"AT\", 3, ...), MINI, SEDAN and SUV and a constructor taking code and seats. Right, the compiled class: public final class VehicleType extends Enum<VehicleType>, with public static final fields AUTO, MINI, SEDAN, SUV, a private static final $VALUES array, values() returning $VALUES.clone(), valueOf calling Enum.valueOf, a private constructor taking name and ordinal before the declared parameters and calling super(name, ordinal), and a static initialiser that creates the four constants in order. Below, the four objects on the heap, each with its name, ordinal, code and seats.",
          caption: "An enum is a final class whose only instances are created by its own static initialiser.",
        },
        {
          type: "list",
          items: [
            "**`public final class VehicleType extends java.lang.Enum<VehicleType>`**: an ordinary class, `final`, with `Enum` as its superclass. There's nothing an enum can do that a class couldn't; `javac` writes the boilerplate and enforces the rules.",
            "**Each constant is a `public static final` field** holding one instance.",
            "**`$VALUES`** is a private static array of all constants in declaration order, filled by a synthetic `$values()` method.",
            "**`values()` and `valueOf(String)`** are generated methods; they aren't in `Enum`, which is why they don't appear in its Javadoc.",
          ],
        },
        {
          type: "heading",
          text: "values() clones, valueOf delegates",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p -c VehicleType",
        },
        {
          type: "output",
          text: `  public static VehicleType[] values();
    Code:
       0: getstatic     #16                 // Field $VALUES:[LVehicleType;
       3: invokevirtual #20                 // Method "[LVehicleType;".clone:()Ljava/lang/Object;
       6: checkcast     #21                 // class "[LVehicleType;"
       9: areturn
  public static VehicleType valueOf(java.lang.String);
    Code:
       0: ldc           #1                  // class VehicleType
       2: aload_0
       3: invokestatic  #25                 // Method java/lang/Enum.valueOf:(Ljava/lang/Class;Ljava/lang/String;)Ljava/lang/Enum;
       6: checkcast     #1                  // class VehicleType
       9: areturn`,
        },
        {
          type: "paragraph",
          text: "`values()` returns `$VALUES.clone()`, a **new array on every call**, because arrays are mutable and a caller could otherwise overwrite `values()[0]` for everyone. The Performance section measures what that costs. `valueOf` calls `Enum.valueOf(VehicleType.class, name)`, which looks the name up in a map the `Class` object builds lazily on first use and then caches.",
        },
        {
          type: "heading",
          text: "The hidden name and ordinal parameters",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -s VehicleType | grep -A1 'private VehicleType('
javap -p -c VehicleType      # the constructor and static {}`,
        },
        {
          type: "output",
          text: `  private VehicleType(java.lang.String, int, int, int);
    descriptor: (Ljava/lang/String;ILjava/lang/String;III)V

  private VehicleType(java.lang.String, int, int, int);
    Code:
       0: aload_0
       1: aload_1
       2: iload_2
       3: invokespecial #31                 // Method java/lang/Enum."<init>":(Ljava/lang/String;I)V
       6: aload_0
       7: aload_3
       8: putfield      #35                 // Field code:Ljava/lang/String;
      11: aload_0
      12: iload         4
      14: putfield      #39                 // Field seats:I
      ...
  static {};
    Code:
       0: new           #1                  // class VehicleType
       3: dup
       4: ldc           #74                 // String AUTO
       6: iconst_0
       7: ldc           #75                 // String AT
       9: iconst_3
      10: sipush        3000
      13: sipush        1200
      16: invokespecial #77                 // Method "<init>":(Ljava/lang/String;ILjava/lang/String;III)V
      19: putstatic     #3                  // Field AUTO:LVehicleType;
      22: new           #1                  // class VehicleType
      ...
      86: putstatic     #13                 // Field SUV:LVehicleType;
      89: invokestatic  #89                 // Method $values:()[LVehicleType;
      92: putstatic     #16                 // Field $VALUES:[LVehicleType;
      95: new           #93                 // class java/util/HashMap
      ...
     102: putstatic     #55                 // Field BY_CODE:Ljava/util/Map;
     105: invokestatic  #98                 // Method values:()[LVehicleType;
      ...
     143: return`,
        },
        {
          type: "list",
          items: [
            "The constructor I wrote takes four parameters, but its **descriptor** takes six: `(String, int, String, int, int, int)`. `javac` adds the constant's **name** and **ordinal** in front and passes them to `Enum`'s constructor with `super(name, ordinal)`. That's where `name()` and `ordinal()` come from; `Enum` stores them in final fields.",
            "**`static {}` creates the constants in declaration order**: `new VehicleType(\"AUTO\", 0, \"AT\", 3, 3000, 1200)`, store in `AUTO`, then `MINI` with ordinal 1, and so on. The ordinal is literally an `iconst_0`, `iconst_1`... pushed by `javac`: the position in the source.",
            "**Then `$VALUES`, then my other static fields.** `BY_CODE` is created at offset 95, after all four constants. So inside a constructor, `BY_CODE` is still `null`, which is why `javac` forbids an enum constructor from touching its static fields (Common Mistakes shows the error). Static lookup maps are filled in a `static` block that runs afterwards, as here.",
            "Class initialisation is thread-safe and happens once, so the constants are created exactly once, before any code can use them. That's the basis of the enum singleton in the next lesson.",
          ],
        },
        {
          type: "heading",
          text: "Constant-specific bodies are subclasses",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentMethod.java",
          code: `public enum PaymentMethod {
    CASH {
        @Override long chargePaise(long farePaise) { return farePaise; }
    },
    CARD {
        @Override long chargePaise(long farePaise) { return farePaise + Math.round(farePaise * 0.02); }   // 2% fee
    },
    WALLET {
        @Override long chargePaise(long farePaise) { return Math.max(0, farePaise - 2_000); }            // Rs 20 off
    };

    abstract long chargePaise(long farePaise);
}`,
        },
        {
          type: "code",
          language: "java",
          title: "UsePayment.java",
          code: `public class UsePayment {
    public static void main(String[] args) {
        for (PaymentMethod m : PaymentMethod.values()) {
            System.out.printf("%-6s Rs %.2f   getClass %-16s getDeclaringClass %s%n",
                    m, m.chargePaise(14_500) / 100.0, m.getClass().getName(), m.getDeclaringClass().getSimpleName());
        }
        System.out.println(PaymentMethod.CARD.getClass() == PaymentMethod.class);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac PaymentMethod.java UsePayment.java && java UsePayment
ls *.class
javap -p PaymentMethod | head -3
javap -p 'PaymentMethod$2' | head -3
javap -v PaymentMethod | grep -A4 PermittedSubclasses`,
        },
        {
          type: "output",
          text: `CASH   Rs 145.00   getClass PaymentMethod$1  getDeclaringClass PaymentMethod
CARD   Rs 147.90   getClass PaymentMethod$2  getDeclaringClass PaymentMethod
WALLET Rs 125.00   getClass PaymentMethod$3  getDeclaringClass PaymentMethod
false
PaymentMethod$1.class
PaymentMethod$2.class
PaymentMethod$3.class
PaymentMethod.class
UsePayment.class
Compiled from "PaymentMethod.java"
public abstract class PaymentMethod extends java.lang.Enum<PaymentMethod> {
  public static final PaymentMethod CASH;
Compiled from "PaymentMethod.java"
final class PaymentMethod$2 extends PaymentMethod {
  private PaymentMethod$2(java.lang.String, int);
PermittedSubclasses:
  PaymentMethod$1
  PaymentMethod$2
  PaymentMethod$3`,
        },
        {
          type: "list",
          items: [
            "A constant with a body `{ ... }` becomes an **anonymous subclass** of the enum: `PaymentMethod$1`, `$2`, `$3`, each in its own class file. The enum itself becomes `abstract` instead of `final`, and each subclass is `final`.",
            "On JDK 17 and later, `javac` writes a **`PermittedSubclasses`** attribute, so the enum is effectively a sealed class: only those three subclasses can exist. Nothing outside the file can extend it.",
            "`CARD.getClass()` is `PaymentMethod$2`, not `PaymentMethod`. Code that does `x.getClass() == PaymentMethod.class` breaks as soon as one constant gets a body. `getDeclaringClass()` always returns the enum type, and `EnumSet`/`EnumMap` use it internally.",
            "`abstract long chargePaise(...)` forces every constant to implement the method: forgetting one is a compile error, not a runtime surprise.",
          ],
        },
      ],
    },
    {
      title: "Why Not int Constants",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "IntConstants.java",
          code: `public class IntConstants {
    // Before Java 5: the "int enum pattern"
    static final int AUTO = 0;
    static final int MINI = 1;
    static final int SEDAN = 2;

    static final int PENDING = 0;      // a different "enum" with the same values
    static final int PAID = 1;

    static int baseFare(int vehicleType) {
        switch (vehicleType) {
            case AUTO: return 30;
            case MINI: return 50;
            case SEDAN: return 80;
            default: throw new IllegalArgumentException("unknown vehicle " + vehicleType);
        }
    }

    public static void main(String[] args) {
        System.out.println(baseFare(MINI));
        System.out.println(baseFare(PAID));            // a payment status: compiles, wrong answer
        System.out.println("logged as: " + SEDAN);     // prints a number
        try {
            System.out.println(baseFare(7));           // any int compiles
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `50
50
logged as: 2
unknown vehicle 7`,
        },
        {
          type: "list",
          items: [
            "**No type safety.** `baseFare(PAID)` passed a payment status where a vehicle type was expected. It compiled, and silently priced the ride as a Mini.",
            "**Meaningless output.** Logs and debuggers show `2`, not `SEDAN`.",
            "**Any int is accepted.** `baseFare(7)` compiles; the check only happens at run time, if someone remembered to write it.",
            "**Constants are compiled into callers.** `static final int` values are inlined by `javac`, so changing `SEDAN = 2` to `3` doesn't affect already-compiled classes until they're recompiled.",
            "**No namespace and no behaviour.** `AUTO` and `PENDING` are both just `0`, and there's nowhere to put `seats()` or `farePaise()`.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "EnumTypeSafe.java",
          code: `public class EnumTypeSafe {
    enum VehicleType { AUTO, MINI, SEDAN }
    enum PaymentStatus { PENDING, PAID }

    static int baseFare(VehicleType type) {
        return switch (type) {
            case AUTO -> 30;
            case MINI -> 50;
            case SEDAN -> 80;
        };
    }

    public static void main(String[] args) {
        baseFare(PaymentStatus.PAID);
        baseFare(7);
    }
}`,
        },
        {
          type: "output",
          text: `EnumTypeSafe.java:14: error: incompatible types: PaymentStatus cannot be converted to VehicleType
        baseFare(PaymentStatus.PAID);
                              ^
EnumTypeSafe.java:15: error: incompatible types: int cannot be converted to VehicleType
        baseFare(7);
                 ^
Note: Some messages have been simplified; recompile with -Xdiags:verbose to get full output
2 errors`,
        },
        {
          type: "paragraph",
          text: "Both mistakes are now compile errors, and the `switch` needs no `default` because the compiler knows `VehicleType` has exactly three constants.",
        },
      ],
    },
    {
      title: "Using Enums: name, ordinal, values, valueOf",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "EnumBasics.java",
          code: `import java.util.Arrays;

public class EnumBasics {
    enum VehicleType { AUTO, MINI, SEDAN, SUV }

    public static void main(String[] args) {
        VehicleType t = VehicleType.SEDAN;
        System.out.println(t + " name=" + t.name() + " ordinal=" + t.ordinal());
        System.out.println(Arrays.toString(VehicleType.values()));
        System.out.println(VehicleType.valueOf("MINI") == VehicleType.MINI);
        System.out.println(t.compareTo(VehicleType.AUTO) + " " + t.compareTo(VehicleType.SUV));
        System.out.println(t.getClass().getName() + " " + t.getDeclaringClass().getSimpleName()
                + " " + (t instanceof Comparable) + " " + (t instanceof java.io.Serializable));
        System.out.println(t.getClass().getSuperclass());

        VehicleType none = null;
        System.out.println("== with null is safe: " + (none == VehicleType.AUTO));

        for (String input : new String[] {"mini", "BIKE", null}) {
            try {
                System.out.println(VehicleType.valueOf(input));
            } catch (IllegalArgumentException | NullPointerException e) {
                System.out.println(e.getClass().getSimpleName() + ": " + e.getMessage());
            }
        }
        System.out.println(VehicleType.values() == VehicleType.values());
    }
}`,
        },
        {
          type: "output",
          text: `SEDAN name=SEDAN ordinal=2
[AUTO, MINI, SEDAN, SUV]
true
2 -1
EnumBasics$VehicleType VehicleType true true
class java.lang.Enum
== with null is safe: false
IllegalArgumentException: No enum constant EnumBasics.VehicleType.mini
IllegalArgumentException: No enum constant EnumBasics.VehicleType.BIKE
NullPointerException: Name is null
false`,
        },
        {
          type: "list",
          items: [
            "`toString()` and `name()` both give `SEDAN` here. `toString` can be overridden for display (\"Sedan (4 seats)\"); `name` can't, which makes it the right choice for storage and parsing.",
            "`compareTo` is the difference of ordinals: SEDAN (2) minus AUTO (0) is 2. Sorting enums sorts them in declaration order.",
            "`==` is the correct comparison and is null-safe: there's exactly one instance per constant, `equals` is final and identical to `==`, and `none == AUTO` is simply `false` where `none.equals(AUTO)` would throw.",
            "`valueOf` is **exact**: case-sensitive, no trimming. `\"mini\"` fails, and `null` throws `NullPointerException` with the message \"Name is null\". Input from users or other systems needs a tolerant parser (Example 2).",
            "`values() == values()` is `false`: each call returns a new array, as the bytecode showed.",
          ],
        },
      ],
    },
    {
      title: "Fields, Constructors and Methods",
      blocks: [
        {
          type: "paragraph",
          text: "The `VehicleType` from Internal Working, used from another class:",
        },
        {
          type: "code",
          language: "java",
          title: "UseVehicleType.java",
          code: `public class UseVehicleType {
    public static void main(String[] args) {
        for (VehicleType t : VehicleType.values()) {
            System.out.printf("%-6s seats %d  8.5 km = Rs %.2f%n", t, t.seats(), t.farePaise(8.5) / 100.0);
        }
        System.out.println(VehicleType.fromCode("SD") + " " + VehicleType.valueOf("SEDAN"));
        try {
            VehicleType.fromCode("BK");
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `AUTO   seats 3  8.5 km = Rs 132.00
MINI   seats 4  8.5 km = Rs 169.00
SEDAN  seats 4  8.5 km = Rs 233.00
SUV    seats 6  8.5 km = Rs 324.00
SEDAN SEDAN
unknown vehicle code BK`,
        },
        {
          type: "list",
          items: [
            "Each constant passes its own arguments to the constructor: `SEDAN(\"SD\", 4, 8_000, 1_800)`. The data about a vehicle type lives with the type, instead of in `switch` statements scattered across the code.",
            "Fields should be `private final`. Enum constants are shared by the whole application (they're singletons), so mutable state in an enum is global mutable state, with all the thread-safety problems that implies.",
            "`fromCode` looks up the external code (`\"SD\"`) in a map built once in a `static` block. That decouples the stable external representation from the Java name, which matters for storage and APIs, as the production section shows.",
            "Methods work like in any class. Here `farePaise` uses the constant's own fields; with 8.5 km, a Sedan is 8,000 + 15,300 paise = Rs 233.",
          ],
        },
      ],
    },
    {
      title: "Enums in switch",
      blocks: [
        {
          type: "heading",
          text: "How switch on an enum compiles: $SwitchMap",
        },
        {
          type: "code",
          language: "java",
          title: "Status.java",
          code: `public enum Status { REQUESTED, ACCEPTED, STARTED, COMPLETED }`,
        },
        {
          type: "code",
          language: "java",
          title: "Dispatch.java",
          code: `public class Dispatch {
    // Classic switch statement
    static String classic(Status s) {
        switch (s) {
            case REQUESTED: return "finding a driver";
            case ACCEPTED: return "driver on the way";
            default: return "other";
        }
    }

    // Java 21 switch expression: exhaustive, no default
    static String modern(Status s) {
        return switch (s) {
            case REQUESTED -> "finding a driver";
            case ACCEPTED -> "driver on the way";
            case STARTED -> "on trip";
            case COMPLETED -> "done";
        };
    }

    public static void main(String[] args) {
        for (Status s : Status.values()) System.out.println(s + ": " + classic(s) + " / " + modern(s));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Status.java Dispatch.java && java Dispatch
ls *.class
javap -c Dispatch
javap -c -p 'Dispatch$1'`,
        },
        {
          type: "output",
          text: `REQUESTED: finding a driver / finding a driver
ACCEPTED: driver on the way / driver on the way
STARTED: other / on trip
COMPLETED: other / done
Dispatch$1.class
Dispatch.class
Status.class
  static java.lang.String classic(Status);
    Code:
       0: getstatic     #7                  // Field Dispatch$1.$SwitchMap$Status:[I
       3: aload_0
       4: invokevirtual #13                 // Method Status.ordinal:()I
       7: iaload
       8: lookupswitch  { // 2
                     1: 36
                     2: 39
               default: 42
          }
...
class Dispatch$1 {
  static final int[] $SwitchMap$Status;

  static {};
    Code:
       0: invokestatic  #1                  // Method Status.values:()[LStatus;
       3: arraylength
       4: newarray       int
       6: putstatic     #7                  // Field $SwitchMap$Status:[I
       9: getstatic     #7                  // Field $SwitchMap$Status:[I
      12: getstatic     #13                 // Field Status.REQUESTED:LStatus;
      15: invokevirtual #17                 // Method Status.ordinal:()I
      18: iconst_1
      19: iastore
      20: goto          24
      23: astore_0
      24: getstatic     #7                  // Field $SwitchMap$Status:[I
      27: getstatic     #23                 // Field Status.ACCEPTED:LStatus;
      30: invokevirtual #17                 // Method Status.ordinal:()I
      33: iconst_2
      34: iastore
      ...`,
        },
        {
          type: "list",
          items: [
            "`javac` didn't switch on `ordinal()` directly. It generated a helper class, `Dispatch$1`, with an `int[]` called `$SwitchMap$Status`: at run time, its static initialiser maps each constant's **current** ordinal to a case number (REQUESTED to 1, ACCEPTED to 2).",
            "The `switch` then does `$SwitchMap$Status[s.ordinal()]` and a `lookupswitch` on the case number.",
            "Why the indirection? The ordinals are read when `Dispatch` runs, not when it's compiled. If `Status` is recompiled with its constants reordered, the old `Dispatch.class` still finds the right cases, because the map is rebuilt from the real ordinals by name. Each mapping is wrapped in a `try`/`catch NoSuchFieldError` (the `astore_0` at offset 23), so a removed constant doesn't crash the map.",
            "The cost is one array load per `switch`, which the JIT handles easily.",
          ],
        },
        {
          type: "heading",
          text: "Adding a constant: compile error or MatchException",
        },
        {
          type: "paragraph",
          text: "Then I added `DRIVER_ARRIVED` to `Status` and recompiled **only** `Status.java`, the way a library update or a partial redeploy would:",
        },
        {
          type: "code",
          language: "java",
          title: "Status.java",
          code: `public enum Status { REQUESTED, ACCEPTED, DRIVER_ARRIVED, STARTED, COMPLETED }`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Status.java && java Dispatch
javac Dispatch.java`,
        },
        {
          type: "output",
          text: `REQUESTED: finding a driver / finding a driver
ACCEPTED: driver on the way / driver on the way
Exception in thread "main" java.lang.MatchException
	at Dispatch.modern(Dispatch.java:13)
	at Dispatch.main(Dispatch.java:22)

Dispatch.java:13: error: the switch expression does not cover all possible input values
        return switch (s) {
               ^
1 error`,
        },
        {
          type: "list",
          items: [
            "**At compile time**, the exhaustive switch expression protects me: recompiling `Dispatch` against the new `Status` fails with \"does not cover all possible input values\". Every switch that needs a decision for the new constant is found by the compiler. A `default` branch would have hidden all of them.",
            "**At run time**, the old compiled `Dispatch` met a constant it had never seen. The classic statement would have fallen into its `default`. The switch expression has no `default`, so `javac` had generated one that throws `MatchException` (Java 21; earlier releases threw `IncompatibleClassChangeError`). Silent wrong behaviour is impossible.",
            "That's the argument for exhaustive switch expressions without `default` over enums: adding a constant becomes a compile error everywhere it matters, and a loud error anywhere that wasn't recompiled.",
          ],
        },
      ],
    },
    {
      title: "What Enums Don't Allow",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "EnumRules.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class EnumRules {
    enum Zone {
        SALT_LAKE, NEW_TOWN;

        static final List<Zone> ALL = new ArrayList<>();
        Zone() {
            ALL.add(this);                                   // 1. static field from the constructor
        }
    }

    enum Base { A }
    static class Child extends Base { }                      // 2. extending an enum

    static void make() {
        Zone z = new Zone();                                 // 3. creating an instance
    }
}`,
        },
        {
          type: "output",
          text: `EnumRules.java:15: error: cannot inherit from final Base
    static class Child extends Base { }                      // 2. extending an enum
                               ^
EnumRules.java:10: error: illegal reference to static field from initializer
            ALL.add(this);                                   // 1. static field from the constructor
            ^
EnumRules.java:15: error: enum classes are not extensible
    static class Child extends Base { }                      // 2. extending an enum
           ^
EnumRules.java:18: error: enum classes may not be instantiated
        Zone z = new Zone();                                 // 3. creating an instance
                 ^
4 errors`,
        },
        {
          type: "list",
          items: [
            "**1. Static fields from the constructor.** The constants are created first in `static {}`, before `ALL` is assigned, so `ALL` would be `null` at that moment. `javac` rejects the reference instead of letting it throw `NullPointerException` during class initialisation. Fill such collections in a `static` block after the constants, as `VehicleType.BY_CODE` does.",
            "**2. Extending an enum.** Enums are final (or sealed when constants have bodies). The set of instances is closed.",
            "**3. `new`.** Only the enum's own static initialiser creates instances.",
            "**`enum Cab extends Object`** doesn't even parse: an enum's superclass is always `Enum`, and the only clause allowed after the name is `implements`.",
          ],
        },
        {
          type: "paragraph",
          text: "Reflection can't get around the rule either:",
        },
        {
          type: "code",
          language: "java",
          title: "CloneAndReflect.java",
          code: `import java.lang.reflect.Constructor;

public class CloneAndReflect {
    enum Zone { SALT_LAKE, NEW_TOWN }

    public static void main(String[] args) throws Exception {
        Constructor<Zone> c = Zone.class.getDeclaredConstructor(String.class, int.class);
        c.setAccessible(true);
        try {
            c.newInstance("PARK_ST", 2);
        } catch (IllegalArgumentException e) {
            System.out.println("reflection: " + e.getMessage());
        }
        System.out.println(java.util.Arrays.toString(Zone.values()));
    }
}`,
        },
        {
          type: "output",
          text: `reflection: Cannot reflectively create enum objects
[SALT_LAKE, NEW_TOWN]`,
        },
        {
          type: "paragraph",
          text: "The constructor is found (with the hidden `String` and `int` parameters) and made accessible, but `Constructor.newInstance` checks whether the class is an enum and refuses. `Enum.clone()` is `final` and throws `CloneNotSupportedException`, and deserialization resolves constants by name to the existing instances. Together, those three rules are why an enum is the most robust way to write a singleton, covered in the next lesson.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing the first use of `VehicleType` in `UseVehicleType.main`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**First active use.** `VehicleType.values()` is a static method call, which triggers class initialisation of `VehicleType` (the Class Loading lesson's rules). The JVM takes the class's initialisation lock, so any other thread that uses `VehicleType` at the same moment waits.",
            "**Superclass first.** `java.lang.Enum` is already initialised (the JDK uses enums during startup).",
            "**Constants in order.** `static {}` runs: `new VehicleType(\"AUTO\", 0, \"AT\", 3, 3000, 1200)`. The constructor first calls `Enum(String name, int ordinal)`, which stores `\"AUTO\"` and `0`, then sets `code`, `seats` and the fares. The reference goes into the static field `AUTO`. The same for `MINI` (1), `SEDAN` (2), `SUV` (3).",
            "**`$VALUES`.** `$values()` builds `{AUTO, MINI, SEDAN, SUV}` and stores it in `$VALUES`.",
            "**Other statics.** `BY_CODE` is created, and the `static` block calls `values()` (a clone of `$VALUES`) to fill it: `\"AT\"` to AUTO, and so on. Class initialisation completes and the lock is released.",
            "**`values()` in `main`** returns another fresh clone of `$VALUES`, and the loop calls `seats()` and `farePaise(8.5)` on each constant: ordinary virtual calls on ordinary objects.",
            "**`fromCode(\"SD\")`** is a `HashMap` lookup returning the `SEDAN` instance. `valueOf(\"SEDAN\")` goes through `Enum.valueOf`, whose name-to-constant map is built on first use and cached in the `Class` object. Both return the same object, so `==` holds.",
            "**For the rest of the program** those four objects are the only `VehicleType` instances that will ever exist. They're reachable from static fields, so they're never garbage-collected while the class is loaded.",
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
          code: `import java.util.Arrays;
import java.util.function.IntBinaryOperator;

public class SyntaxTour {
    // 1. simplest form
    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

    // 2. fields, constructor, methods; the constant list ends with ;
    enum Tier {
        BASIC(0), PLUS(10), PRO(25);
        private final int discountPercent;
        Tier(int d) { discountPercent = d; }
        int apply(int paise) { return paise * (100 - discountPercent) / 100; }
    }

    // 3. constant-specific bodies
    enum Light {
        RED { Light next() { return GREEN; } },
        GREEN { Light next() { return YELLOW; } },
        YELLOW { Light next() { return RED; } };
        abstract Light next();
    }

    // 4. implementing an interface, behaviour passed as a lambda
    enum Op implements IntBinaryOperator {
        ADD((a, b) -> a + b), MUL((a, b) -> a * b);
        private final IntBinaryOperator f;
        Op(IntBinaryOperator f) { this.f = f; }
        public int applyAsInt(int a, int b) { return f.applyAsInt(a, b); }
    }

    public static void main(String[] args) {
        Day d = Day.SAT;
        boolean weekend = switch (d) { case SAT, SUN -> true; default -> false; };     // 5. switch expression
        System.out.println(d + " weekend=" + weekend + " ordinal=" + d.ordinal() + " " + Day.valueOf("FRI"));

        System.out.println(Tier.PRO.apply(20_000) + " " + Light.YELLOW.next() + " " + Op.MUL.applyAsInt(6, 7));

        for (Tier t : Tier.values()) System.out.print(t.name().toLowerCase() + " ");    // 6. iterating
        System.out.println();

        if (d == Day.SAT) System.out.println("compare with ==");                        // 7. comparing
        System.out.println(Day.values().length + " " + Day.MON.compareTo(Day.WED) + " " + Arrays.toString(Tier.values()));
    }
}`,
        },
        {
          type: "output",
          text: `SAT weekend=true ordinal=5 FRI
15000 RED 42
basic plus pro
compare with ==
7 -2 [BASIC, PLUS, PRO]`,
        },
        {
          type: "paragraph",
          text: "In a `switch`, case labels are written without the type name (`case SAT`), because the selector's type is known. `case SAT, SUN ->` combines constants. The weekend switch has a `default` deliberately: it's a yes/no question where new days (there won't be any) would mean \"not weekend\". For switches that need a decision per constant, I leave `default` out.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Fare adjustments with a lambda per constant",
        },
        {
          type: "code",
          language: "java",
          title: "FareRules.java",
          code: `import java.util.function.LongUnaryOperator;

public class FareRules {
    // Each constant carries its rule as a lambda
    enum Adjustment {
        NONE(f -> f),
        NIGHT(f -> f + f / 4),                       // +25% after 11 pm
        RAIN(f -> f + 3_000),                        // flat Rs 30
        LOYALTY(f -> Math.max(0, f - f / 10));       // -10%

        private final LongUnaryOperator rule;
        Adjustment(LongUnaryOperator rule) { this.rule = rule; }
        long apply(long farePaise) { return rule.applyAsLong(farePaise); }
    }

    public static void main(String[] args) {
        long fare = 20_000;
        for (Adjustment a : Adjustment.values()) {
            System.out.printf("%-8s Rs %.2f%n", a, a.apply(fare) / 100.0);
        }
        long combined = fare;
        for (Adjustment a : new Adjustment[] {Adjustment.NIGHT, Adjustment.RAIN, Adjustment.LOYALTY}) combined = a.apply(combined);
        System.out.printf("NIGHT then RAIN then LOYALTY: Rs %.2f%n", combined / 100.0);
    }
}`,
        },
        {
          type: "output",
          text: `NONE     Rs 200.00
NIGHT    Rs 250.00
RAIN     Rs 230.00
LOYALTY  Rs 180.00
NIGHT then RAIN then LOYALTY: Rs 252.00`,
        },
        {
          type: "paragraph",
          text: "Passing a lambda to the constructor gives each constant its own behaviour without an anonymous subclass per constant: no extra class files, and `getClass()` stays the enum type. Constant-specific bodies are still the better fit when the behaviour is long, or needs several methods. Chaining shows the order matters: 200 → 250 → 280 → 252.",
        },
        {
          type: "heading",
          text: "Example 2: Parsing user input safely",
        },
        {
          type: "code",
          language: "java",
          title: "SafeParse.java",
          code: `import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class SafeParse {
    enum VehicleType { AUTO, MINI, SEDAN, SUV }

    // Built once: name in upper case -> constant
    private static final Map<String, VehicleType> BY_NAME = Arrays.stream(VehicleType.values())
            .collect(Collectors.toUnmodifiableMap(Enum::name, Function.identity()));

    static Optional<VehicleType> parse(String input) {
        if (input == null) return Optional.empty();
        return Optional.ofNullable(BY_NAME.get(input.strip().toUpperCase(Locale.ROOT)));
    }

    public static void main(String[] args) {
        for (String in : new String[] {"sedan", " Mini ", "BIKE", null, "suv"}) {
            System.out.printf("%-8s -> %s%n", in == null ? "null" : "\\"" + in + "\\"", parse(in));
        }
        VehicleType chosen = parse("bike").orElse(VehicleType.MINI);
        System.out.println("default when unknown: " + chosen);
    }
}`,
        },
        {
          type: "output",
          text: `"sedan"  -> Optional[SEDAN]
" Mini " -> Optional[MINI]
"BIKE"   -> Optional.empty
null     -> Optional.empty
"suv"    -> Optional[SUV]
default when unknown: MINI`,
        },
        {
          type: "paragraph",
          text: "`valueOf` throws on anything that isn't an exact name, which is right for trusted data and wrong for user input. This parser strips whitespace, upper-cases with `Locale.ROOT` (the Turkish-locale trap from the Strings lesson), and returns an `Optional` instead of throwing, so the caller decides what an unknown value means. The map is built once and is unmodifiable.",
        },
        {
          type: "heading",
          text: "Example 3: Ordered roles and compareTo",
        },
        {
          type: "code",
          language: "java",
          title: "Roles.java",
          code: `public class Roles {
    // Declared from least to most privileged: order is part of the meaning
    enum Role {
        RIDER, DRIVER, SUPPORT, ADMIN;

        boolean atLeast(Role required) { return compareTo(required) >= 0; }
    }

    static void refund(Role caller) {
        if (!caller.atLeast(Role.SUPPORT)) throw new SecurityException(caller + " cannot issue refunds");
        System.out.println(caller + " issued a refund");
    }

    public static void main(String[] args) {
        for (Role r : Role.values()) {
            try {
                refund(r);
            } catch (SecurityException e) {
                System.out.println(e.getMessage());
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `RIDER cannot issue refunds
DRIVER cannot issue refunds
SUPPORT issued a refund
ADMIN issued a refund`,
        },
        {
          type: "paragraph",
          text: "When the declaration order **is** the meaning (severity levels, privilege levels, sizes), `compareTo` reads naturally. The comment saying so is important: someone adding `FINANCE` must know that its position grants or denies permissions. Where order isn't inherently linear, an explicit field (`int level`) or an `EnumSet` of permissions per role (next lesson) is safer.",
        },
      ],
    },
    {
      title: "When to Use an Enum",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Why"],
          rows: [
            ["A fixed set of values known at compile time (statuses, types, directions, units)", "An enum", "Type-safe, readable, exhaustive switches"],
            ["Values that change without a release (cities, promotions, ride types configured by ops)", "A database table or config, loaded into a class", "Enums need a code change and deploy to add a value"],
            ["A fixed set where each value has data", "Enum with `private final` fields", "Data lives with the constant"],
            ["Each value behaves differently", "Constant-specific bodies, or a lambda per constant", "No `switch` scattered across the codebase"],
            ["A closed set of types with different data per case", "A sealed interface with records", "Enums have the same fields for every constant"],
            ["Exactly one instance of something", "A single-constant enum (next lesson)", "Reflection- and serialization-proof"],
            ["Storing or sending the value", "`name()` or an explicit code field", "Never `ordinal()`"],
            ["Bit flags (`READ | WRITE`)", "`EnumSet` (next lesson)", "Type-safe and as fast as an `int` mask"],
          ],
        },
        {
          type: "paragraph",
          text: "The difference between an enum and a sealed interface with records is worth knowing: `enum PaymentMethod { CASH, CARD }` has exactly one `CARD`, with the same fields as `CASH`. `sealed interface Payment permits Cash, Card` with `record Card(String last4, String network)` allows many different `Card` values, each with its own data. Status-like things are enums; message-like things are sealed records.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Storing or relying on ordinal()",
        },
        {
          type: "paragraph",
          text: "The ordinal is the position in the source file. Inserting, removing or reordering constants changes it. Persisting it, sending it over the network, or indexing external arrays with it ties stored data to the source layout. The production section shows the damage. Use `name()` or an explicit code field; inside the JVM, use `EnumMap` instead of `array[e.ordinal()]`.",
        },
        {
          type: "heading",
          text: "Using valueOf on external input",
        },
        {
          type: "paragraph",
          text: "`VehicleType.valueOf(request.getParameter(\"type\"))` throws `IllegalArgumentException` for `\"sedan\"`, `\" SEDAN\"` or any new value, and `NullPointerException` for a missing parameter, often surfacing as a 500 error. Parse tolerantly at the boundary, as in Example 2, and return a 400 for unknown values.",
        },
        {
          type: "heading",
          text: "A default branch in a switch that must handle every constant",
        },
        {
          type: "paragraph",
          text: "`default -> 0` compiles today and silently gives the wrong answer for the constant added next year. Leave `default` out of switch expressions over enums, so the compiler flags every switch that needs updating, and old compiled code throws `MatchException` instead of misbehaving.",
        },
        {
          type: "heading",
          text: "Mutable fields in an enum",
        },
        {
          type: "paragraph",
          text: "`SEDAN.setBaseFare(9_000)` changes the fare for every user and thread in the application, without synchronization. Enum fields should be `final`. Configuration that changes at run time belongs in a separate object or service.",
        },
        {
          type: "heading",
          text: "Accessing static fields from the constructor",
        },
        {
          type: "paragraph",
          text: "Rejected by `javac` (\"illegal reference to static field from initializer\") because constants are constructed before other static fields are initialised. Build lookup maps in a `static` block after the constants.",
        },
        {
          type: "heading",
          text: "Comparing classes instead of constants",
        },
        {
          type: "paragraph",
          text: "`m.getClass() == PaymentMethod.class` is `false` for constants with a body, because they're anonymous subclasses (`PaymentMethod$2`). Use `instanceof PaymentMethod`, `getDeclaringClass()`, or simply `==` on the constants.",
        },
        {
          type: "heading",
          text: "Calling values() in a hot loop",
        },
        {
          type: "paragraph",
          text: "Each call allocates a new array. Cache it in a `private static final` field when it's used repeatedly; the Performance section measures the difference.",
        },
        {
          type: "heading",
          text: "Overriding toString and then parsing it with valueOf",
        },
        {
          type: "paragraph",
          text: "If `toString()` returns `\"Sedan\"`, `valueOf(t.toString())` throws, because `valueOf` only knows `name()`. Use `name()` for anything that will be parsed back, and `toString()` only for display.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use enums for every closed set of values known at compile time; never `int` or `String` constants.",
            "Compare with `==`, not `equals`: it's null-safe and says what's meant.",
            "Keep fields `private final`; treat enums as immutable singletons.",
            "Persist and transmit `name()` or a dedicated stable code, never `ordinal()`. With JPA, use `@Enumerated(EnumType.STRING)`; the default is `ORDINAL`.",
            "Give enums with external representations an explicit `code` field and a `fromCode` lookup built once in a `static` block.",
            "Write switch expressions over enums without `default`, so new constants become compile errors.",
            "Put behaviour that varies by constant into the enum (methods, constant bodies, lambdas) instead of repeating `switch` statements elsewhere.",
            "Parse external strings tolerantly (strip, `Locale.ROOT`, `Optional`) instead of calling `valueOf` directly.",
            "Cache `values()` in a static field if it's used in a hot path.",
            "Use `EnumSet` and `EnumMap` instead of `HashSet`/`HashMap` with enum keys (next lesson).",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Enums are among the cheapest objects in Java: they exist once, comparisons are reference checks, and `switch` is an array lookup. The one hidden cost is `values()`:",
        },
        {
          type: "code",
          language: "java",
          title: "ValuesCost.java",
          code: `import java.lang.management.ManagementFactory;

public class ValuesCost {
    enum Status { REQUESTED, ACCEPTED, DRIVER_ARRIVED, STARTED, COMPLETED, CANCELLED }
    static final Status[] STATUSES = Status.values();                 // copied once

    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static int sink;

    public static void main(String[] args) {
        for (int i = 0; i < 100_000; i++) { sink += Status.values().length; sink += STATUSES.length; }   // warm up
        long before = MX.getCurrentThreadAllocatedBytes();
        for (int i = 0; i < 1_000_000; i++) sink += Status.values()[i % 6].ordinal();
        long viaValues = MX.getCurrentThreadAllocatedBytes() - before;
        before = MX.getCurrentThreadAllocatedBytes();
        for (int i = 0; i < 1_000_000; i++) sink += STATUSES[i % 6].ordinal();
        long viaCache = MX.getCurrentThreadAllocatedBytes() - before;
        System.out.printf("1,000,000 x values()[i] : %,d bytes allocated%n", viaValues);
        System.out.printf("1,000,000 x cached[i]   : %,d bytes allocated%n", viaCache);
    }
}`,
        },
        {
          type: "output",
          text: `1,000,000 x values()[i] : 40,000,000 bytes allocated
1,000,000 x cached[i]   : 0 bytes allocated`,
        },
        {
          type: "list",
          items: [
            "Each `values()` call allocated a 40-byte array (a 16-byte header plus six 4-byte references), and the JIT didn't eliminate it here; the interpreter (`-Xint`) gave the same 40 MB. A cached array costs nothing.",
            "This matters for code like \"look up a constant by ordinal for every message\" or `for (Status s : Status.values())` inside a per-request loop. It doesn't matter for a loop that runs a few times.",
            "**`==` vs `equals`**: `Enum.equals` is final and is `this == other`, so both cost the same once inlined; `==` is preferred for readability and null-safety, not speed.",
            "**`switch`** costs one `$SwitchMap` array load plus a table or lookup switch. A chain of `if (s == A) ... else if (s == B)` is also fast; the switch is mostly about exhaustiveness checking.",
            "**`valueOf`** is a hash lookup in a map cached in the `Class`, built on first use. A hand-written `fromCode` map costs the same.",
            "**Memory**: each constant is one object for the life of the class loader. A few hundred constants are nothing; an enum generated from a table with tens of thousands of rows is a sign the data belongs in a map loaded at startup.",
          ],
        },
      ],
    },
    {
      title: "Enums in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend stores trips in a relational database. The `status` column was mapped with JPA's `@Enumerated` and no argument, whose default is `EnumType.ORDINAL`, so it held 0 to 4. A year later, product asks for a new status shown to riders, \"Driver arrived\", and a developer adds `DRIVER_ARRIVED` after `ACCEPTED`, where it belongs in the trip's lifecycle. The release goes out. Within minutes, support sees completed trips showing \"on trip\" in the app and cancelled trips being billed. I rebuilt the effect without a database: the status column is a map, and each release is its own enum:",
        },
        {
          type: "code",
          language: "java",
          title: "OrdinalInDb.java",
          code: `import java.util.LinkedHashMap;
import java.util.Map;

public class OrdinalInDb {
    // Release 1: the status column stores ordinal()
    enum TripStatusV1 { REQUESTED, ACCEPTED, STARTED, COMPLETED, CANCELLED }

    // Release 2: a product change adds DRIVER_ARRIVED "where it belongs", after ACCEPTED
    enum TripStatusV2 { REQUESTED, ACCEPTED, DRIVER_ARRIVED, STARTED, COMPLETED, CANCELLED }

    // The fix: a stable code that is stored instead of the ordinal
    enum TripStatus {
        REQUESTED("REQ"), ACCEPTED("ACC"), DRIVER_ARRIVED("ARR"), STARTED("STA"), COMPLETED("COM"), CANCELLED("CAN");
        final String code;
        TripStatus(String code) { this.code = code; }
        static TripStatus fromCode(String c) {
            for (TripStatus s : values()) if (s.code.equals(c)) return s;
            throw new IllegalArgumentException("unknown status code " + c);
        }
    }

    public static void main(String[] args) {
        // Rows written by release 1: trip id -> status column
        Map<String, Integer> statusColumn = new LinkedHashMap<>();
        statusColumn.put("T-101", TripStatusV1.STARTED.ordinal());
        statusColumn.put("T-102", TripStatusV1.COMPLETED.ordinal());
        statusColumn.put("T-103", TripStatusV1.CANCELLED.ordinal());
        System.out.println("stored: " + statusColumn);

        // Release 2 reads the same rows
        for (var row : statusColumn.entrySet()) {
            TripStatusV1 written = TripStatusV1.values()[row.getValue()];
            TripStatusV2 read = TripStatusV2.values()[row.getValue()];
            System.out.printf("%s written as %-9s read back as %s%n", row.getKey(), written, read);
        }
        try {
            TripStatusV1.values()[5].name();
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("and a V2 row (CANCELLED = 5) read by a V1 instance: " + e.getMessage());
        }

        // With stable codes, reordering or inserting constants changes nothing
        Map<String, String> codeColumn = new LinkedHashMap<>();
        codeColumn.put("T-201", TripStatus.STARTED.code);
        codeColumn.put("T-202", TripStatus.CANCELLED.code);
        codeColumn.forEach((id, code) -> System.out.println(id + " stored " + code + " read back as " + TripStatus.fromCode(code)));
    }
}`,
        },
        {
          type: "output",
          text: `stored: {T-101=2, T-102=3, T-103=4}
T-101 written as STARTED   read back as DRIVER_ARRIVED
T-102 written as COMPLETED read back as STARTED
T-103 written as CANCELLED read back as COMPLETED
and a V2 row (CANCELLED = 5) read by a V1 instance: Index 5 out of bounds for length 5
T-201 stored STA read back as STARTED
T-202 stored CAN read back as CANCELLED`,
        },
        {
          type: "list",
          items: [
            "**Every existing row shifted by one.** STARTED became DRIVER_ARRIVED, COMPLETED became STARTED, CANCELLED became COMPLETED, with no error anywhere. That last one is the expensive kind: cancelled trips read as completed get billed.",
            "**The rollout makes it worse.** During a rolling deploy, old and new instances run side by side. A new instance writes CANCELLED as 5; an old instance reading it crashes with `ArrayIndexOutOfBoundsException`, or, for a different combination, silently reads the wrong status.",
            "**Why nothing caught it.** The code change was a one-line, correct-looking enum edit. Unit tests create trips and read them back in the same version, so they always pass. Only data written by the **previous** version reveals the bug.",
            "**The fix.** Store something that doesn't depend on declaration order: `@Enumerated(EnumType.STRING)` stores `name()`, or an explicit `code` with a JPA `AttributeConverter`, as `TripStatus` does here. Then inserting and reordering constants is safe; only renaming needs care, and a stable code survives that too.",
            "**Repairing the data.** Rows written before the release are correct for the old mapping, rows written after for the new one, so the repair needs the deployment timestamp: a migration that rewrites old rows' integers to codes, run before any new code reads them. This is why the column type should be decided right the first time.",
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
              question: "What is an enum in Java, and why use it instead of int constants?",
              answer:
                "An enum is a type with a fixed set of named instances, declared with `enum`, like `enum VehicleType { AUTO, MINI, SEDAN }`. Compared with `static final int` constants it gives type safety (a `PaymentStatus` can't be passed where a `VehicleType` is expected, and `7` can't either; both are compile errors), readable output (`SEDAN` instead of `2`), a namespace, exhaustive `switch` checking, and a place for fields and methods. In my `IntConstants` example, `baseFare(PAID)` compiled and priced a ride as a Mini.",
            },
            {
              question: "Can an enum have a constructor? Can it be public?",
              answer:
                "Yes, an enum can have constructors, fields and methods. The constructor is always private (implicitly if no modifier is written); `public` or `protected` is a compile error. It can only be called by the constant declarations, like `SEDAN(\"SD\", 4, 8_000, 1_800)`. That's how the set of instances stays fixed.",
            },
            {
              question: "Should enums be compared with == or equals()?",
              answer:
                "`==`. There's exactly one instance per constant, `Enum.equals` is final and implemented as `==`, so both give the same answer, but `==` is null-safe (`status == Status.DONE` is just `false` when `status` is `null`, while `status.equals(...)` throws) and is checked at compile time for incompatible enum types.",
            },
            {
              question: "What do values(), valueOf() and ordinal() do?",
              answer:
                "`values()` returns a new array of all constants in declaration order. `valueOf(String)` returns the constant with exactly that name, throwing `IllegalArgumentException` for an unknown name and `NullPointerException` for `null`; it's case-sensitive. `ordinal()` returns the constant's zero-based position in the declaration. `values()` and `valueOf` are generated by the compiler; `ordinal()` is a final method of `java.lang.Enum`.",
            },
            {
              question: "Can an enum extend a class or implement an interface?",
              answer:
                "It can't extend a class: every enum implicitly extends `java.lang.Enum`, and Java has single inheritance. It can implement any number of interfaces, like `enum Op implements IntBinaryOperator`. And no class can extend an enum: `javac` reports \"cannot inherit from final\" and \"enum classes are not extensible\".",
            },
            {
              question: "Can you use an enum in a switch?",
              answer:
                "Yes. Case labels use the bare constant names (`case SEDAN ->`). With a switch expression and no `default`, the compiler checks that every constant is covered, so adding a constant later makes every incomplete switch a compile error. It's one of the main advantages of enums over int or String constants.",
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
              question: "What does javac generate for an enum?",
              answer:
                "A `final` class extending `java.lang.Enum<E>` (or an abstract, sealed one if constants have bodies), with one `public static final` field per constant, a private static `$VALUES` array, generated `values()` (returning `$VALUES.clone()`) and `valueOf(String)` (calling `Enum.valueOf`), a private constructor with two extra leading parameters for name and ordinal, and a static initialiser that creates the constants in declaration order. `javap -p VehicleType` shows all of it.",
            },
            {
              question: "Why shouldn't you persist ordinal() in a database?",
              answer:
                "Because the ordinal is the position in the source file, and adding, removing or reordering constants changes it for every constant after the change. Rows written earlier are then read as different constants with no error. In my rebuild, inserting `DRIVER_ARRIVED` turned STARTED into DRIVER_ARRIVED, COMPLETED into STARTED and CANCELLED into COMPLETED. Persist `name()` (`@Enumerated(EnumType.STRING)` in JPA, whose default is `ORDINAL`) or an explicit stable code.",
            },
            {
              question: "What are constant-specific method bodies, and how are they compiled?",
              answer:
                "A constant can have its own class body overriding methods: `CARD { long chargePaise(long f) { ... } }`, usually implementing an abstract method declared by the enum. Each such constant compiles to an anonymous subclass (`PaymentMethod$2`), the enum becomes abstract, and on JDK 17+ it lists those classes in `PermittedSubclasses`. Consequence: `CARD.getClass()` is `PaymentMethod$2`, so use `getDeclaringClass()` to get the enum type.",
            },
            {
              question: "Why can't an enum constructor access the enum's static fields?",
              answer:
                "Because the constants are created first in the static initialiser, before any other static field is initialised. A static `List` would still be `null` while the constructors run, so `javac` rejects the reference with \"illegal reference to static field from initializer\". The standard fix is a `static` block after the constants that iterates `values()` to fill lookup maps, as `VehicleType.BY_CODE` does.",
            },
            {
              question: "Why does values() return a new array each time?",
              answer:
                "Arrays are mutable. If `values()` returned the internal `$VALUES` array, any caller could write `values()[0] = null` and break every other user of the enum. So the generated `values()` returns `$VALUES.clone()`. The cost is an allocation per call, 40 bytes for six constants in my measurement, so hot code should cache the result in a `static final` array.",
            },
            {
              question: "How do you convert a String to an enum safely?",
              answer:
                "`valueOf` is only safe for trusted, exact names. For external input, normalise it (`strip()`, `toUpperCase(Locale.ROOT)`) and look it up in a map built once from `values()`, returning `Optional` (or throwing a domain exception that becomes a 400). For external codes that differ from Java names, add a `code` field and a `fromCode` lookup.",
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
              question: "How does a switch on an enum compile?",
              answer:
                "For a classic switch, `javac` generates a synthetic class (`Dispatch$1`) with an `int[] $SwitchMap$Status`, filled at run time by mapping each constant's current ordinal to a case number, each mapping guarded against `NoSuchFieldError`. The switch reads `$SwitchMap$Status[s.ordinal()]` and does a `lookupswitch`. The indirection makes compiled switches robust to constants being reordered or removed in a later version of the enum.",
            },
            {
              question: "What happens if a constant is added to an enum but a class with an exhaustive switch expression isn't recompiled?",
              answer:
                "The switch expression has no `default`, so `javac` generated a hidden one that throws. When the new constant reaches the old code, it throws `MatchException` on Java 21 (earlier releases: `IncompatibleClassChangeError`). I reproduced it by adding `DRIVER_ARRIVED` and recompiling only the enum. Recompiling the switch then fails with \"the switch expression does not cover all possible input values\", so the bug is caught either at compile time or loudly at run time, never silently.",
            },
            {
              question: "Can reflection create a new instance of an enum?",
              answer:
                "No. The constructor can be found (with its hidden `String` and `int` parameters) and made accessible, but `Constructor.newInstance` checks for enum classes and throws `IllegalArgumentException: Cannot reflectively create enum objects`. Combined with `Enum.clone()` throwing and deserialization resolving constants by name, it guarantees the declared constants are the only instances.",
            },
            {
              question: "When are enum constants created, and is it thread-safe?",
              answer:
                "When the enum class is initialised, on its first active use: a static method call such as `values()`, or access to a constant. The static initialiser creates them in declaration order. Class initialisation is performed once, under the class's initialisation lock, so other threads wait and then see fully constructed constants. That's what makes enum constants safe singletons without any synchronization in user code.",
            },
            {
              question: "Enum or sealed interface with records: how do you choose?",
              answer:
                "An enum has a fixed set of **instances**, each with the same fields: one `CARD`, one `CASH`. A sealed interface has a fixed set of **types**, each a record that can have many instances with different data: many `Card(last4, network)` values. Both give exhaustive switches. I use enums for statuses, categories and flags, and sealed records for messages and results that carry per-value data, like `Result<T>` from the Generics lesson.",
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
              question: "Right after a release that added one enum constant, completed trips show as \"on trip\" and cancelled trips are being billed. What do you suspect and do?",
              answer:
                "That the status is persisted by ordinal (often JPA's default `@Enumerated` = `ORDINAL`) and the new constant was inserted before existing ones, shifting every stored value. `OrdinalInDb` reproduces exactly this: each status read back as the one before it.\n\nImmediately: roll back, or deploy a mapping that reads old rows correctly, and stop writes from the mixed versions. Then switch the column to `EnumType.STRING` or a stable code with a converter, and migrate existing rows using the release timestamp to know which mapping each row was written with. Finally, add a test that reads fixtures written by the previous version.",
            },
            {
              question: "A REST endpoint returns 500 errors for some requests with \"No enum constant ...\" in the logs. How do you fix it properly?",
              answer:
                "The code calls `Enum.valueOf` on request data, which throws `IllegalArgumentException` for wrong case, extra spaces, new values from clients, and `NullPointerException` when the field is missing. Those are client errors, not server errors.\n\nI'd parse at the boundary with a tolerant lookup (strip, `Locale.ROOT` upper-case, a map from `values()` or codes) that returns `Optional`, and map unknown values to a 400 with a message listing accepted values. With Spring, a custom `Converter<String, VehicleType>` or Jackson's case-insensitive enum feature does this in one place.",
            },
            {
              question: "A teammate adds a new PaymentMethod constant, all tests pass, and in production some payments fall through to \"unsupported\". Why didn't the compiler catch it?",
              answer:
                "Because the switches over `PaymentMethod` have a `default` branch (or are `if`/`else` chains), so the compiler considers them complete and the new constant quietly takes the default path. Tests pass because nobody had written one for the new constant in those code paths.\n\nI'd convert the switches that need a decision per constant into switch expressions without `default`, so the compiler lists every one that must be updated; or move the behaviour into the enum itself as an abstract method, so a new constant can't compile without implementing it.",
            },
            {
              question: "Profiling shows millions of small arrays allocated from Status.values() inside a message handler. What's going on, and what's the fix?",
              answer:
                "The generated `values()` returns `$VALUES.clone()`, a new array on every call, and the JIT doesn't reliably eliminate it. Code like `Status.values()[code]` per message allocates an array per message: 40 bytes for six constants, 40 MB per million calls in my measurement.\n\nThe fix is a `private static final Status[] VALUES = Status.values();` used everywhere in the hot path (0 bytes allocated in the same test). If the lookup is really by an external number, I'd also check it isn't relying on `ordinal()`, and use a code field with a lookup map instead.",
            },
            {
              question: "Ops wants to add new vehicle types (e.g. \"Bike Taxi\" in one city) without a deployment. The current code has enum VehicleType. What do you recommend?",
              answer:
                "An enum isn't the right model for values that change without a release: its constants are fixed at compile time, and adding one means a code change, a build and a deploy, plus updating every exhaustive switch.\n\nI'd move vehicle types into a database table or configuration, loaded at startup into a `VehicleType` record or class (code, seats, fares), looked up by code in a map, with behaviour driven by data (fare per km, capacity) rather than per-type code. An enum can still model the small, truly fixed things around it, such as a `PricingModel { PER_KM, FLAT }` that the data refers to.",
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
            "Declare `enum Planet { MERCURY, VENUS, EARTH }`, print `name()`, `ordinal()` and `compareTo(EARTH)` for each, and `Planet.valueOf(\"earth\")`.",
            "Add a field `double massKg` with a constructor, and a method returning the mass relative to Earth. Print it for each constant.",
            "Compile the enum and run `javap -p Planet` and `javap -p -s Planet | grep -A1 'private Planet'`. Find `$VALUES` and the hidden constructor parameters.",
            "Write a switch expression over `Planet` without `default`. Add `MARS` to the enum, recompile only the enum, run the old class, then recompile the switch.",
            "Give one constant a body `{ }` that overrides `toString()`, and print `getClass()` and `getDeclaringClass()` for every constant.",
            "In the constructor, try adding `this` to a `static final List<Planet>` declared in the enum. Read the error, then fill the list in a `static` block instead.",
            "Print `Planet.values() == Planet.values()` and explain the result.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints ordinals 0, 1, 2 and `compareTo` values -2, -1, 0, then `IllegalArgumentException: No enum constant Planet.earth`. Step 3 shows `public static final Planet MERCURY;`... `private static final Planet[] $VALUES;` and a descriptor beginning `(Ljava/lang/String;I`. Step 4 runs until `MARS` reaches the old switch and throws `MatchException`; recompiling gives \"the switch expression does not cover all possible input values\". Step 5 shows `Planet$1` for the constant with a body and `Planet` for the others, while `getDeclaringClass()` is `Planet` for all. Step 6 fails with \"illegal reference to static field from initializer\". Step 7 prints `false`: each call clones `$VALUES`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHAT        a type with a FIXED set of named instances (Java 5, JSR 201)
            replaces int constants: type-safe, readable, namespaced

GENERATED   final class X extends Enum<X>  (abstract + sealed if bodies)
            public static final X A, B, C;  private static X[] $VALUES
            values()  -> $VALUES.clone()  (new array each call!)
            valueOf() -> Enum.valueOf(X.class, name)  exact, case-sensitive
            private X(String name, int ordinal, ...your params)
            static {}: constants in order, THEN other statics

API         name()  ordinal()  compareTo (by ordinal)  getDeclaringClass()
            equals/hashCode = identity -> compare with ==

ADD STATE   fields private final; constructor implicitly private
            constant bodies -> anonymous subclasses X$1, X$2 ...
            or a lambda per constant

SWITCH      classic: $SwitchMap int[] built from ordinals at run time
            switch expression, no default: exhaustive at compile time,
            MatchException if an unknown constant arrives (Java 21)

CAN'T       extend a class / be extended / new / clone / reflect
            touch static fields in the constructor / be generic

STORE       name() or a stable code, NEVER ordinal()
            JPA: @Enumerated(EnumType.STRING)  (default ORDINAL!)`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "An enum is a final class whose instances are created once, in declaration order, by its own static initialiser, and can never be created any other way. That's why `==` works, why switches can be exhaustive, and why enums make good singletons.",
            "The ordinal is an implementation detail of that initialiser, not data: store and send names or explicit codes, use `EnumMap` instead of ordinal-indexed arrays, and leave `default` out of switches that must handle every constant.",
            "The next lesson, EnumSet, EnumMap and Enum Patterns, covers the collections built for enums (a bit vector and an array, measured against `HashSet` and `HashMap`), enums implementing interfaces, state machines, the enum singleton, and what happens when a JSON feed sends a constant you don't have.",
          ],
        },
      ],
    },
  ],
};
