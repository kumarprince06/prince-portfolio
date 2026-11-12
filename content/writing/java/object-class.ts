import type { Lesson } from "../types";

export const objectClass: Lesson = {
  slug: "object-class",
  date: "2026-11-10",
  title: "Object Class Methods",
  description:
    "Every method java.lang.Object gives every class and array: the equals and hashCode contracts and how breaking them loses entries in a HashSet, toString without leaking card numbers, getClass versus instanceof, why clone and finalize are best avoided, wait and notify, records' generated methods, and where the identity hash code really lives in the object header.",
  tags: ["Core Java", "OOP", "equals", "hashCode", "toString"],
  sections: [
    {
      title: "What the Object Class Is",
      blocks: [
        {
          type: "paragraph",
          text: "The Interfaces lesson was about contracts a class signs up for on purpose, with `implements`. Every class also signs one it never writes down. A class with no `extends` clause extends `java.lang.Object`, every other class extends it indirectly, and so does every array type. So every object in a running JVM carries the same small set of methods: `equals`, `hashCode`, `toString`, `getClass`, `clone`, `finalize`, `wait`, `notify` and `notifyAll`.",
        },
        {
          type: "paragraph",
          text: "What makes this lesson matter more than its size suggests is who calls those methods. I rarely call `hashCode` myself, but `HashSet`, `HashMap`, `List.contains`, every logging call, the debugger, Jackson and Hibernate call them on my objects all day. If `equals` and `hashCode` disagree, a `HashSet` quietly keeps duplicates. If `toString` prints a card number, it ends up in the logs. Both compile cleanly, usually pass a unit test, and show up in production.",
        },
        {
          type: "paragraph",
          text: "So I go through every method: the contracts the Javadoc spells out, what the JVM does underneath (the identity hash code in the object header, records' `invokedynamic`), and the failures I could reproduce, ending with three production bugs that each trace back to one of these methods.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Simula 67 introduced classes, objects and subclasses, but it had no single root class. Smalltalk-80 did: everything was an object, and class `Object` at the top of the hierarchy gave every object `=` (equality, identity by default), `hash`, `printString`, `copy` and `class`. Smalltalk programmers already lived with the rule this lesson keeps coming back to: a class that redefines `=` has to redefine `hash` too, because hashed collections depend on both. C++ went the other way: no common root, equality by overloading `operator==`, and no standard hash table until `std::unordered_map` in C++11.",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (January 1996) took Smalltalk's side. `java.lang.Object` was the root, with `equals`, `hashCode`, `toString`, `getClass`, `clone` and `finalize`, and `Hashtable` relied on `equals` and `hashCode` from day one. It also put a **monitor** in every object, the idea from Hoare's and Brinch Hansen's work on monitors, which is why `wait`, `notify` and `notifyAll` live on `Object` and not on a lock class.",
        },
        {
          type: "paragraph",
          text: "Most of what came later changed how these methods are written and used, not the methods themselves:",
        },
        {
          type: "table",
          headers: ["Version", "What changed around Object's methods"],
          rows: [
            ["Java 1.2 (1998)", "The Collections Framework: `HashMap` and `HashSet` made the `equals`/`hashCode` contract central to everyday code"],
            ["Java 5 (2004)", "`@Override` arrived with annotations; generics gave `getClass()` its special return type `Class<? extends |X|>`"],
            ["Java 6", "`@Override` also allowed on methods that implement an interface method"],
            ["Java 7", "`java.util.Objects`: `equals`, `hash`, `hashCode`, `toString`, `requireNonNull`"],
            ["Java 9", "`finalize()` deprecated; `java.lang.ref.Cleaner` added as the replacement"],
            ["Java 16", "Records final (JEP 395, previewed in 14 and 15) with generated `equals`, `hashCode` and `toString`; pattern matching for `instanceof` final (JEP 394), which shortened every hand-written `equals`; JEP 390 warnings for synchronizing on value-based classes"],
            ["JDK 18", "JEP 421: finalization deprecated **for removal**, plus `--finalization=disabled`"],
            ["JDK 19", "`Objects.toIdentityString`"],
            ["JDK 25", "Compact object headers become a product flag (JEP 519), which changes where the identity hash sits in the header; `String`'s cached hash field gains `@Stable`"],
          ],
        },
        {
          type: "paragraph",
          text: "One thing that has not happened yet: Project Valhalla's value classes (JEP 401), which would give some classes no identity at all and change what `==` means for them. JDK 25 doesn't have them. `javac --enable-preview --release 25` rejects `value class Money {}` as a syntax error, so everything in this lesson assumes every object has an identity.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I picture the customer records room of a bank branch.",
        },
        {
          type: "list",
          items: [
            "Every customer file arrives with the same standard cover sheet, whether or not the branch customised it. That's `Object`: every class inherits the same methods, overridden or not.",
            "The **label on the folder** is `toString()`. The default label is the records room's internal token, something like `CustomerFile@7a81197d`, which tells a person nothing. A good label says `Customer[name=Asha, account=****4321]`, and it never shows the full PAN or card number, because labels get photocopied into every report.",
            "**\"Is this the same customer?\"** is `equals()`. By default the answer is yes only if it's literally the same folder in my hand (identity). The bank's real rule is different: same PAN, same customer, even if the folders are different (value equality).",
            "**Which drawer the file goes in** is `hashCode()`. It must be computed from the same thing the \"same customer\" rule uses. If the drawer came from the folder's colour while sameness came from the PAN, a clerk would look in the wrong drawer, find nothing, and open a duplicate account. That's `equals` without `hashCode`.",
            "**Correcting the PAN on a file while it sits in the old drawer** means nobody can find it again, although it's still physically there. That's mutating a field used by `hashCode` while the object is in a `HashSet`.",
            "**A token number stapled to the folder** the first time anyone needs one is the identity hash code. It's issued once and kept on the folder, and it has nothing to do with which shelf the folder is on, which matters because folders get moved between shelves (the garbage collector moves objects).",
            "**Photocopying a folder** is `clone()`. The copy has its own pages, but a locker key inside is copied as a key: both folders now open the same locker. That's a shallow copy.",
            "**The archive clerk who might phone before shredding a file** is `finalize()`. Maybe soon, maybe weeks later, maybe never, so nobody should depend on the call.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a bank decides sameness centrally, and a duplicate account is an error someone eventually notices. In Java, every class makes up its own rule, the compiler accepts any `equals` and any `hashCode` together, and a `HashSet` holding two \"equal\" objects never complains. Nothing checks the contract except the bugs that follow.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Every class and every array",
        },
        {
          type: "paragraph",
          text: "`class Car {}` compiles to `class Car extends Object`. Interfaces don't extend `Object`, but JLS 9.2 gives every interface type the public methods of `Object`, so `Runnable r = ...; r.toString()` compiles. Arrays are objects with `Object` as their superclass. I listed what `Object` actually declares on JDK 21 with reflection:",
        },
        {
          type: "code",
          language: "java",
          title: "ObjectMethods.java",
          code: `import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.Comparator;
import java.util.stream.Collectors;

public class ObjectMethods {
    public static void main(String[] args) {
        Method[] methods = Object.class.getDeclaredMethods();
        Arrays.sort(methods, Comparator.comparing(Method::getName)
                                       .thenComparing(Method::getParameterCount));
        for (Method m : methods) {
            String params = Arrays.stream(m.getParameterTypes())
                                  .map(Class::getSimpleName)
                                  .collect(Collectors.joining(", "));
            System.out.printf("%-22s %-8s %s(%s)%n", Modifier.toString(m.getModifiers()),
                              m.getReturnType().getSimpleName(), m.getName(), params);
        }
        System.out.println(methods.length + " methods, superclass: " + Object.class.getSuperclass());
        System.out.println("int[] extends " + int[].class.getSuperclass().getName()
                + ", implements " + Arrays.toString(int[].class.getInterfaces()));
    }
}`,
        },
        {
          type: "output",
          text: `protected native       Object   clone()
public                 boolean  equals(Object)
protected              void     finalize()
public final native    Class    getClass()
public native          int      hashCode()
public final native    void     notify()
public final native    void     notifyAll()
public                 String   toString()
public final           void     wait()
public final           void     wait(long)
public final           void     wait(long, int)
private final native   void     wait0(long)
12 methods, superclass: null
int[] extends java.lang.Object, implements [interface java.lang.Cloneable, interface java.io.Serializable]`,
        },
        {
          type: "list",
          items: [
            "Eleven methods a class can see, plus a private `wait0`. My old notes said `wait(long)` is native. On JDK 21 it's a final Java method that calls the private native `wait0`, which is how the JDK hooks virtual-thread handling into it.",
            "Six are `final` (`getClass`, `notify`, `notifyAll` and the three `wait`s), so a class can't change them. The other five, `equals`, `hashCode`, `toString`, `clone` and `finalize`, are designed to be overridden, and `clone` and `finalize` are `protected`.",
            "`Object.class.getSuperclass()` is `null`: the hierarchy stops here. And `int[]` really extends `Object` and implements `Cloneable` and `Serializable`, which is why every array has a working `clone()`.",
          ],
        },
        {
          type: "table",
          headers: ["Method", "Default behaviour", "Override it?"],
          rows: [
            ["`equals(Object)`", "`this == obj`, identity", "For value types, always with `hashCode`"],
            ["`hashCode()`", "Identity hash code, stored in the object header", "Whenever `equals` is overridden"],
            ["`toString()`", "`getClass().getName() + \"@\" + Integer.toHexString(hashCode())`", "Almost always, without secrets"],
            ["`getClass()`", "The runtime class, a `Class` object", "Can't, it's `final`"],
            ["`clone()`", "Shallow field-by-field copy, only if the class implements `Cloneable`", "Rarely; copy constructors are better"],
            ["`finalize()`", "Does nothing; deprecated for removal", "Never in new code"],
            ["`wait`/`notify`/`notifyAll`", "Wait for or signal a condition on the object's monitor", "Can't, they're `final`"],
          ],
        },
        {
          type: "heading",
          text: "== versus equals",
        },
        {
          type: "paragraph",
          text: "On references, `==` asks one question: are these the same object? It compares the references themselves and can't be overridden. `equals` is an ordinary method. Its default implementation in `Object` is literally `return (this == obj);`, and a class overrides it to say when two **different** objects mean the same value. `String`, `Integer`, `BigDecimal`, `LocalDate`, `List` and records all do.",
        },
        {
          type: "heading",
          text: "The equals contract",
        },
        {
          type: "paragraph",
          text: "The Javadoc of `Object.equals` requires an equivalence relation on non-null references:",
        },
        {
          type: "list",
          items: [
            "**Reflexive:** `x.equals(x)` is `true`.",
            "**Symmetric:** `x.equals(y)` is `true` exactly when `y.equals(x)` is.",
            "**Transitive:** if `x.equals(y)` and `y.equals(z)`, then `x.equals(z)`.",
            "**Consistent:** repeated calls give the same answer as long as the fields `equals` uses don't change.",
            "**Non-null:** `x.equals(null)` is `false`, never an exception.",
          ],
        },
        {
          type: "heading",
          text: "The hashCode contract",
        },
        {
          type: "list",
          items: [
            "During one execution, `hashCode()` returns the same value for an object as long as the information `equals` uses doesn't change. Across runs it may differ.",
            "**Equal objects must have equal hash codes.** This is the rule hash-based collections rely on, and the one that breaks when `equals` is overridden alone.",
            "Unequal objects **may** share a hash code. It's legal, it just makes hash tables slower.",
          ],
        },
        {
          type: "paragraph",
          text: "And `toString` has a softer contract: \"a concise but informative representation that is easy for a person to read\", with the recommendation that every class overrides it.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Where the identity hash code lives",
        },
        {
          type: "paragraph",
          text: "The Memory Allocation lesson showed every object starting with a header: an 8-byte mark word and a class pointer. The mark word is where `Object.hashCode()` keeps its answer. I wanted to see that rather than believe it, so I read the mark word straight out of the object with `sun.misc.Unsafe`, the same internal API that lesson used for field offsets:",
        },
        {
          type: "code",
          language: "java",
          title: "MarkWord.java",
          code: `import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class MarkWord {
    static class Book { String title = "Dune"; }

    static class Employee {
        String id = "E-7";
        @Override public int hashCode() { return id.hashCode(); }
    }

    public static void main(String[] args) throws Exception {
        Field f = Unsafe.class.getDeclaredField("theUnsafe");
        f.setAccessible(true);
        Unsafe u = (Unsafe) f.get(null);

        Book book = new Book();
        System.out.printf("new Book             mark %016x%n", u.getLong(book, 0L));
        int h = System.identityHashCode(book);
        long mark = u.getLong(book, 0L);
        System.out.printf("identityHashCode     mark %016x  hash %08x  bits 8-38 %08x%n",
                mark, h, (mark >>> 8) & 0x7FFFFFFF);
        synchronized (book) {
            System.out.printf("inside synchronized  mark %016x  hash %08x%n",
                    u.getLong(book, 0L), System.identityHashCode(book));
        }
        Employee employee = new Employee();
        employee.hashCode();                                // overridden: the header is untouched
        System.out.printf("Employee.hashCode()  mark %016x%n", u.getLong(employee, 0L));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac MarkWord.java && java MarkWord",
        },
        {
          type: "output",
          text: `MarkWord.java:2: warning: Unsafe is internal proprietary API and may be removed in a future release
import sun.misc.Unsafe;
               ^
...
4 warnings
new Book             mark 0000000000000001
identityHashCode     mark 0000005cad808601  hash 5cad8086  bits 8-38 5cad8086
inside synchronized  mark 000079e1ca1fe910  hash 5cad8086
Employee.hashCode()  mark 0000000000000001`,
        },
        {
          type: "list",
          items: [
            "A new object's mark word was just `1`: the low two bits `01` mean unlocked, and there's no hash yet. Allocation doesn't compute one.",
            "The first `System.identityHashCode` call generated `5cad8086` and wrote it into the header. It sits in bits 8 to 38, exactly where HotSpot's `markWord.hpp` for JDK 21 puts it: `unused:25 hash:31 -->| unused_gap:1 age:4 unused_gap:1 lock:2`. Every later call reads it back, so the value is stable for the object's whole life, even though the GC moves the object around.",
            "Inside `synchronized`, the mark word turned into something that looks like an address (it changes from run to run), with low bits `00`. JDK 21 uses stack locking by default (`LockingMode = 1` in `-XX:+PrintFlagsFinal`): the original header is copied into a lock record on the thread's stack and the mark word points to it. `identityHashCode` still returned `5cad8086`, read from the displaced copy.",
            "`Employee` overrides `hashCode`, so calling it never touched the header. The identity hash only exists for objects someone asks it of, through `Object.hashCode()`, `System.identityHashCode` or the default `toString`.",
          ],
        },
        {
          type: "paragraph",
          text: "On JDK 25 (stderr dropped, because it now warns about `Unsafe` memory access) the header has changed shape:",
        },
        {
          type: "code",
          language: "bash",
          code: `jdk-25/bin/java MarkWord 2>/dev/null
jdk-25/bin/java -XX:+UseCompactObjectHeaders MarkWord 2>/dev/null`,
        },
        {
          type: "output",
          text: `new Book             mark 0000000000000001
identityHashCode     mark 000003ea4c8d6801  hash 7d4991ad  bits 8-38 6a4c8d68
inside synchronized  mark 000003ea4c8d6800  hash 7d4991ad
Employee.hashCode()  mark 0000000000000001

new Book             mark 0104040000000001
identityHashCode     mark 010404db69ac3001  hash 1b6d3586  bits 8-38 5b69ac30
inside synchronized  mark 010404db69ac3000  hash 1b6d3586
Employee.hashCode()  mark 01041c0000000001`,
        },
        {
          type: "paragraph",
          text: "My bits 8-38 check fails: JDK 25's `markWord.hpp` reads `unused:22 hash:31 -->| unused_gap:4 age:4 self-fwd:1 lock:2`, the gap commented as reserved for Valhalla, so the hash starts at bit 11 (`000003ea4c8d6801 >>> 11` is exactly `7d4991ad`). Locking only flipped the low bits to `00`, because JDK 25 defaults to lightweight locking (`LockingMode = 2`), which leaves the header in place. And with compact object headers (JEP 519, a product flag in JDK 25, off by default) the class pointer moves into the top 22 bits, which is why `Book`'s and `Employee`'s mark words start differently.",
        },
        {
          type: "heading",
          text: "It isn't the memory address",
        },
        {
          type: "paragraph",
          text: "\"The default `hashCode` is the object's address\" is one of the most repeated claims about Java, and on HotSpot it isn't true by default. The generator is chosen by an experimental flag, and `-XX:+UnlockExperimentalVMOptions -XX:+PrintFlagsFinal` shows `intx hashCode = 5` on JDK 21. In HotSpot's `synchronizer.cpp`, `get_next_hash` treats mode 5 as Marsaglia's xor-shift generator with per-thread state; mode 4 is the address, mode 3 a global counter and mode 2 always 1. I can't run C++ source, but I can run the modes:",
        },
        {
          type: "code",
          language: "java",
          title: "HashModes.java",
          code: `public class HashModes {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 4; i++) {
            Object o = new Object();
            sb.append(Integer.toHexString(System.identityHashCode(o))).append(' ');
        }
        System.out.println(sb.toString().trim());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java HashModes
java -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 HashModes
java -XX:+UnlockExperimentalVMOptions -XX:hashCode=3 HashModes
java -XX:+UnlockExperimentalVMOptions -XX:hashCode=4 HashModes`,
        },
        {
          type: "output",
          text: `2a139a55 15db9742 6d06d69c 7852e922
1 1 1 1
16 17 18 19
1f8144b8 1f814640 1f8146b8 1f8146f8`,
        },
        {
          type: "list",
          items: [
            "Mode 4 is what an address-based hash looks like: values a few hundred bytes apart, because the objects were allocated next to each other (the exact values shift a little between runs). The default values bear no relation to each other, and mode 3 shows the JDK had already handed out 15 identity hashes during startup.",
            "The default values were identical on every run on my machine (`15db9742` will look familiar to anyone who has printed a plain object), because each thread's generator starts from seeds HotSpot sets at thread creation. So identity hashes aren't addresses and aren't secure random numbers; they're only promised to be stable for one object during one run.",
          ],
        },
        {
          type: "heading",
          text: "What javac generates for a record",
        },
        {
          type: "paragraph",
          text: "A record gets `equals`, `hashCode` and `toString` without me writing them. I expected `javac` to generate ordinary bytecode for them, field by field. It doesn't:",
        },
        {
          type: "code",
          language: "java",
          title: "Price.java",
          code: `public record Price(String currency, int paise) {
    public static void main(String[] args) {
        Price a = new Price("INR", 24500);
        Price b = new Price("INR", 24500);
        System.out.println(a + " " + a.equals(b) + " " + (a.hashCode() == b.hashCode()));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Price.java && java Price && javap -c -p Price && javap -v -p Price",
        },
        {
          type: "output",
          text: `Price[currency=INR, paise=24500] true true

public final class Price extends java.lang.Record {
  ...
  public final java.lang.String toString();
       1: invokedynamic #52,  0             // InvokeDynamic #1:toString:(LPrice;)Ljava/lang/String;
  public final int hashCode();
       1: invokedynamic #56,  0             // InvokeDynamic #1:hashCode:(LPrice;)I
  public final boolean equals(java.lang.Object);
       2: invokedynamic #59,  0             // InvokeDynamic #1:equals:(LPrice;Ljava/lang/Object;)Z
  ...
BootstrapMethods:
  ...
  1: #87 REF_invokeStatic java/lang/runtime/ObjectMethods.bootstrap:(...)Ljava/lang/Object;
    Method arguments:
      #8 Price
      #77 currency;paise
      #79 REF_getField Price.currency:Ljava/lang/String;
      #80 REF_getField Price.paise:I`,
        },
        {
          type: "list",
          items: [
            "Each method body is a single `invokedynamic`, and all three use bootstrap method #1, `ObjectMethods.bootstrap`, passing the record class, the component names as one string (`currency;paise`) and a field getter per component.",
            "On the first call, the bootstrap builds a method handle that compares, hashes or prints those fields and links the call site to it permanently. The execution flow section traces exactly when.",
            "The algorithm lives in the JDK, not in my class file, so already-compiled records benefit if the JDK improves it. That's also why the `Record` Javadoc calls the hashing algorithm unspecified.",
          ],
        },
        {
          type: "heading",
          text: "A hand-written equals, for comparison",
        },
        {
          type: "code",
          language: "java",
          title: "Book.java",
          code: `public final class Book {
    private final String isbn;
    private final int edition;

    public Book(String isbn, int edition) {
        this.isbn = isbn;
        this.edition = edition;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Book other)) return false;
        return edition == other.edition && isbn.equals(other.isbn);
    }

    @Override
    public int hashCode() {
        return 31 * isbn.hashCode() + edition;
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Book.java && javap -c -p Book",
        },
        {
          type: "output",
          text: `  public boolean equals(java.lang.Object);
    Code:
       0: aload_0
       1: aload_1
       2: if_acmpne     7
       5: iconst_1
       6: ireturn
       7: aload_1
       8: instanceof    #8                  // class Book
      11: ifeq          22
      14: aload_1
      15: checkcast     #8                  // class Book
      18: astore_2
      ...
      25: getfield      #13                 // Field edition:I
      ...
      32: if_icmpne     53
      ...
      43: invokevirtual #17                 // Method java/lang/String.equals:(Ljava/lang/Object;)Z
      ...

  public int hashCode();
    Code:
       0: bipush        31
       ...
       6: invokevirtual #23                 // Method java/lang/String.hashCode:()I
       9: imul
       ...
      14: iadd
      15: ireturn`,
        },
        {
          type: "list",
          items: [
            "`this == o` is `if_acmpne`, a plain reference comparison: the cheapest possible exit.",
            "`o instanceof Book other` compiled to `instanceof` followed by `checkcast` into local slot 2. `instanceof` returns false for `null`, so the pattern also covers the \"`equals(null)` is false\" rule without a separate check.",
            "I compared the `int` first. `if_icmpne` is one instruction, while `String.equals` is a call, so cheap and likely-to-differ fields first is a small, free win.",
          ],
        },
        {
          type: "heading",
          text: "String caches its hash",
        },
        {
          type: "paragraph",
          text: "`String.hashCode()` reads every character, so `String` remembers the result. JDK 21's class file has two private fields for it, and `hashCode()` only computes when both are still at their defaults (`javap -c -p java.lang.String`, trimmed):",
        },
        {
          type: "output",
          text: `  private int hash;
  private boolean hashIsZero;
  ...
  public int hashCode();
       1: getfield      #19                 // Field hash:I
       ...
      10: getfield      #23                 // Field hashIsZero:Z
      13: ifne          58
      ...                                   // compute with StringLatin1 or StringUTF16
      47: putfield      #23                 // Field hashIsZero:Z
      ...
      55: putfield      #19                 // Field hash:I`,
        },
        {
          type: "paragraph",
          text: "`hashIsZero` exists because 0 is a legitimate hash (`\"\".hashCode()` is 0), and without it such a string would be rehashed on every call. Reading the fields with reflection (it needs `--add-opens java.base/java.lang=ALL-UNNAMED`), a fresh `\"Kolkata\"` showed `hash=0` before the first `hashCode()` and `hash=1124159915` after. The JDK 25 source explains why there's no lock: the fields are subject to a benign data race, only one of them is ever written for a given string, and the computation is idempotent, so a thread that reads a stale 0 just computes the same value again. On JDK 25 the `hash` field also carries the JDK-internal `@Stable` annotation, which it doesn't on JDK 21.",
        },
      ],
    },
    {
      title: "toString: What an Object Says About Itself",
      blocks: [
        {
          type: "paragraph",
          text: "String concatenation, `println`, every log statement, the debugger's variable view and most exception messages turn objects into text through `toString()`. For `\"order \" + order`, string conversion calls `order.toString()`, and uses `\"null\"` for a null reference instead of throwing. So the default is what ends up in logs whenever nobody overrode it:",
        },
        {
          type: "code",
          language: "java",
          title: "DefaultToString.java",
          code: `import java.util.Arrays;
import java.util.List;
import java.util.Objects;

public class DefaultToString {
    static class Customer {
        final String name;
        Customer(String name) { this.name = name; }
    }

    static class FixedHash {
        @Override public int hashCode() { return 42; }
    }

    record Price(String currency, int paise) {}

    public static void main(String[] args) {
        Customer asha = new Customer("Asha");
        System.out.println(asha);
        System.out.println(asha.getClass().getName() + "@" + Integer.toHexString(asha.hashCode()));
        System.out.println(new FixedHash());
        System.out.println(Objects.toIdentityString(new FixedHash()));
        System.out.println(new Price("INR", 24500));
        System.out.println(List.of(new Price("INR", 18000), new Price("USD", 299)));

        int[] scores = {4, 8, 15};
        String[] cities = {"Kolkata", "Pune"};
        int[][] grid = {{1, 2}, {3, 4}};
        System.out.println(scores + "  " + cities);
        System.out.println(Arrays.toString(scores) + "  " + Arrays.toString(cities));
        System.out.println(Arrays.toString(grid) + "  " + Arrays.deepToString(grid));
    }
}`,
        },
        {
          type: "output",
          text: `DefaultToString$Customer@15db9742
DefaultToString$Customer@15db9742
DefaultToString$FixedHash@2a
DefaultToString$FixedHash@266474c2
Price[currency=INR, paise=24500]
[Price[currency=INR, paise=18000], Price[currency=USD, paise=299]]
[I@816f27d  [Ljava.lang.String;@87aac27
[4, 8, 15]  [Kolkata, Pune]
[[I@3e3abc88, [I@6ce253f1]  [[1, 2], [3, 4]]`,
        },
        {
          type: "paragraph",
          text: "The hex values are identity hash codes from my run. The format itself comes from `Object.toString()`, which on JDK 21 compiles to a `StringBuilder` chain (`javap -c java.lang.Object`):",
        },
        {
          type: "output",
          text: `  public java.lang.String toString();
    Code:
       ...
       8: invokevirtual #7                  // Method getClass:()Ljava/lang/Class;
      11: invokevirtual #13                 // Method java/lang/Class.getName:()Ljava/lang/String;
      ...
      17: ldc           #23                 // String @
      ...
      23: invokevirtual #25                 // Method hashCode:()I
      26: invokestatic  #29                 // Method java/lang/Integer.toHexString:(I)Ljava/lang/String;
      ...`,
        },
        {
          type: "list",
          items: [
            "`getClass().getName() + \"@\" + Integer.toHexString(hashCode())`, and my hand-built version printed the identical string. A nested class shows up with its binary name, `DefaultToString$Customer`.",
            "`hashCode()` is called with `invokevirtual`, so an overridden one is used: `FixedHash` printed `@2a`, which is 42 in hex. `Objects.toIdentityString` (JDK 19) prints the same format with the real identity hash.",
            "A record prints `Price[currency=INR, paise=24500]`, and collections print their elements' `toString`. The `Record` Javadoc warns the format may change and shouldn't be parsed.",
            "Arrays never override `toString`. `[I` is the JVM's name for `int[]` and `[Ljava.lang.String;` for `String[]`. `Arrays.toString` handles one level and `Arrays.deepToString` handles nested arrays.",
          ],
        },
        {
          type: "heading",
          text: "What I put in a toString",
        },
        {
          type: "list",
          items: [
            "The fields that identify the object and the state I'd want in a log line. For an entity, `Order[id=O-1001, status=SHIPPED]` is usually enough.",
            "**Never secrets or personal data:** card numbers, CVVs, passwords, tokens, OTPs, full phone numbers. `toString` output lands in logs, exception messages and error trackers, which are kept for years and read by far more people than the database. The production section shows the fix.",
            "Not the whole object graph. Children that print their parent recurse until `StackOverflowError` (the Association, Aggregation and Composition lesson shows that trap), and on a JPA entity a lazy collection can trigger a query.",
            "Nothing expensive, no side effects, and nothing that code parses. A machine-readable form is a separate method or a JSON mapping.",
          ],
        },
      ],
    },
    {
      title: "equals: Identity, Equality and the Contract",
      blocks: [
        {
          type: "paragraph",
          text: "The `EmployeeEquality` example later shows `==` against `equals` on plain objects and strings. Here I focus on writing `equals`, because every rule in the contract has a classic way to break it.",
        },
        {
          type: "heading",
          text: "A correct equals, step by step",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Declare exactly `public boolean equals(Object o)` with `@Override`. Any other parameter type is an overload, which is the trap at the end of this section.",
            "`if (this == o) return true;` is cheap, and it keeps `x.equals(x)` true even for odd field values like `NaN` or a null id.",
            "Check the type: `if (!(o instanceof Book other)) return false;`. `instanceof` is false for `null`, so the non-null rule comes for free. The alternative, `getClass() != o.getClass()`, needs an explicit null check; which one to use is the next heading.",
            "Compare the fields that define the value: primitives with `==`, except `float` and `double`, which need `Float.compare` and `Double.compare`; references with `equals`, or `Objects.equals` when they can be null; arrays with `Arrays.equals`.",
            "Use exactly the same fields in `hashCode`.",
            "Prefer fields that don't change while the object sits in a hash-based collection, ideally `final` ones.",
          ],
        },
        {
          type: "paragraph",
          text: "`Book` in the internal working section is that recipe in about five lines, and its bytecode showed each step.",
        },
        {
          type: "heading",
          text: "getClass() or instanceof?",
        },
        {
          type: "paragraph",
          text: "For a `final` class both checks give the same answer. They differ when a subclass adds a field, and the textbook case is `Point` with a `ColorPoint` subclass. With `instanceof` in both classes:",
        },
        {
          type: "code",
          language: "java",
          title: "PointColor.java",
          code: `public class PointColor {
    static class Point {
        final int x, y;
        Point(int x, int y) { this.x = x; this.y = y; }

        @Override
        public boolean equals(Object o) {
            return o instanceof Point p && x == p.x && y == p.y;
        }

        @Override
        public int hashCode() { return 31 * x + y; }
    }

    // Attempt 1: a ColorPoint only equals another ColorPoint with the same color
    static class ColorPoint extends Point {
        final String color;
        ColorPoint(int x, int y, String color) { super(x, y); this.color = color; }

        @Override
        public boolean equals(Object o) {
            return o instanceof ColorPoint cp && super.equals(cp) && color.equals(cp.color);
        }
    }

    // Attempt 2: against a plain Point, ignore the color
    static class LenientColorPoint extends Point {
        final String color;
        LenientColorPoint(int x, int y, String color) { super(x, y); this.color = color; }

        @Override
        public boolean equals(Object o) {
            if (!(o instanceof Point)) return false;
            if (!(o instanceof LenientColorPoint cp)) return o.equals(this);   // plain Point
            return super.equals(cp) && color.equals(cp.color);
        }
    }

    public static void main(String[] args) {
        Point p = new Point(1, 2);
        ColorPoint cp = new ColorPoint(1, 2, "red");
        System.out.println("p.equals(cp)     " + p.equals(cp));
        System.out.println("cp.equals(p)     " + cp.equals(p) + "   <- symmetry broken");

        LenientColorPoint red = new LenientColorPoint(1, 2, "red");
        LenientColorPoint blue = new LenientColorPoint(1, 2, "blue");
        System.out.println("red.equals(p)    " + red.equals(p));
        System.out.println("p.equals(blue)   " + p.equals(blue));
        System.out.println("red.equals(blue) " + red.equals(blue) + "  <- transitivity broken");
    }
}`,
        },
        {
          type: "output",
          text: `p.equals(cp)     true
cp.equals(p)     false   <- symmetry broken
red.equals(p)    true
p.equals(blue)   true
red.equals(blue) false  <- transitivity broken`,
        },
        {
          type: "list",
          items: [
            "`Point.equals` accepts any `Point`, including a `ColorPoint`, and compares coordinates. `ColorPoint.equals` rejects a plain `Point`. So the answer depends on which object is the receiver, and a collection decides that, not me: `list.contains(x)` calls `x.equals(element)`.",
            "Ignoring the color against plain points fixes symmetry and breaks transitivity: red equals `p`, `p` equals blue, red doesn't equal blue.",
            "Effective Java (Item 10) puts it as a rule: there's no way to extend an instantiable class, add a value field, and keep the `equals` contract while using `instanceof`.",
          ],
        },
        {
          type: "paragraph",
          text: "The usual escape is `getClass()`: objects can only be equal if their runtime classes are identical.",
        },
        {
          type: "code",
          language: "java",
          code: `@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    Point p = (Point) o;
    return x == p.x && y == p.y;
}`,
        },
        {
          type: "list",
          items: [
            "Symmetry comes back: a `Point` and a `ColorPoint` are unequal in both directions, and a `ColorPoint.equals` that calls `super.equals(o)` first can safely cast, because the classes are already proven identical.",
            "The price is substitutability. A `LabeledPoint extends Point` that adds only a method, no state, is still never equal to a `Point` at the same coordinates, so it can't stand in for one in a set. That's the Liskov substitution problem from the Inheritance lesson.",
            "Frameworks create subclasses I never wrote. Hibernate's lazy-loading proxies are generated subclasses of the entity, so a `getClass()`-based `equals` says a proxy never equals the real object.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "What I actually do",
          text: "Make value classes `final`, or make them records. Then `instanceof` and `getClass()` agree, nobody can subclass and break symmetry, and the debate disappears. Records are final, and their generated `equals` only accepts the same record class.",
        },
        {
          type: "heading",
          text: "The equals(Order) overload trap",
        },
        {
          type: "code",
          language: "java",
          title: "OverloadTrap.java",
          code: `import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

public class OverloadTrap {
    static final class Order {
        final String id;
        Order(String id) { this.id = id; }

        // Looks like an override. It's an overload: equals(Order), not equals(Object)
        public boolean equals(Order other) {
            return other != null && id.equals(other.id);
        }

        @Override
        public int hashCode() { return id.hashCode(); }
    }

    public static void main(String[] args) {
        Order a = new Order("O-1001");
        Order b = new Order("O-1001");
        Object sameB = b;

        System.out.println("a.equals(b)          " + a.equals(b));
        System.out.println("a.equals((Object) b) " + a.equals(sameB));
        System.out.println("List.contains        " + List.of(a).contains(b));
        Set<Order> set = new HashSet<>();
        set.add(a);
        System.out.println("HashSet.contains     " + set.contains(b));
        System.out.println("Objects.equals       " + Objects.equals(a, b));
    }
}`,
        },
        {
          type: "output",
          text: `a.equals(b)          true
a.equals((Object) b) false
List.contains        false
HashSet.contains     false
Objects.equals       false`,
        },
        {
          type: "list",
          items: [
            "`a.equals(b)` is true because `javac` picks overloads from static types, as in the Methods lesson. Both are `Order`, so `equals(Order)` is the most specific match.",
            "The moment the static type is `Object`, the only candidate is `equals(Object)`, which `Order` never overrode. That's `Object`'s identity check, so false.",
            "Every collection method takes `Object` and calls `equals(Object)`. `HashSet` even found the right bucket, because `hashCode` was correct, and then asked the wrong `equals`.",
          ],
        },
        {
          type: "paragraph",
          text: "`@Override` turns this into a compile error. I replaced the comment line above `equals(Order)` with the annotation and compiled again:",
        },
        {
          type: "output",
          text: `OverloadTrap.java:11: error: method does not override or implement a method from a supertype
        @Override
        ^
1 error`,
        },
      ],
    },
    {
      title: "hashCode: The Other Half of equals",
      blocks: [
        {
          type: "paragraph",
          text: "A hash-based collection never compares a key with every element. It uses `hashCode()` to pick a bucket and only calls `equals` on the few entries in that bucket whose stored hash matches. The HashMap Internals lesson in the Collections track covers buckets and resizing; for this lesson one consequence matters: if two equal objects have different hash codes, the collection never even asks `equals`.",
        },
        {
          type: "image",
          src: "/images/java/object-class-hash-buckets.svg",
          alt: "Two equal Address objects, 12 Park Street, Kolkata 700016. On the left, with only equals overridden, their identity hash codes 692404036 and 1554874502 send them to buckets 1 and 11 of a 16-bucket table, so the set keeps both. On the right, with hashCode from Objects.hash, both hash to 1177777548 and land in bucket 15, where equals finds the match and the second add returns false.",
          caption: "Without a matching hashCode, equal objects land in different buckets and equals is never consulted.",
        },
        {
          type: "code",
          language: "java",
          title: "MissingHashCode.java",
          code: `import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class MissingHashCode {
    static final class Address {
        final String street, city, pin;

        Address(String street, String city, String pin) {
            this.street = street;
            this.city = city;
            this.pin = pin;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Address a)) return false;
            return street.equals(a.street) && city.equals(a.city) && pin.equals(a.pin);
        }
        // no hashCode(): Object's identity hash code is used
    }

    // The bucket a 16-bucket HashMap would pick (the HashMap Internals lesson has the details)
    static int bucket(Object key) {
        int h = key.hashCode();
        return (h ^ (h >>> 16)) & 15;
    }

    public static void main(String[] args) {
        Address first = new Address("12 Park Street", "Kolkata", "700016");
        Address second = new Address("12 Park Street", "Kolkata", "700016");

        System.out.println("first.equals(second)  " + first.equals(second));
        System.out.println("hash codes            " + first.hashCode() + " / " + second.hashCode());
        System.out.println("buckets               " + bucket(first) + " / " + bucket(second));

        Set<Address> addressBook = new HashSet<>();
        addressBook.add(first);
        System.out.println("add(second)           " + addressBook.add(second));
        System.out.println("size                  " + addressBook.size());

        Map<Address, String> residentOf = new HashMap<>();
        residentOf.put(first, "Asha");
        System.out.println("get(second)           " + residentOf.get(second));
    }
}`,
        },
        {
          type: "output",
          text: `first.equals(second)  true
hash codes            692404036 / 1554874502
buckets               1 / 11
add(second)           true
size                  2
get(second)           null`,
        },
        {
          type: "list",
          items: [
            "`equals` said true, but the identity hash codes sent the two addresses to buckets 1 and 11. The set kept both, and the map couldn't find the resident stored under an equal address.",
            "Landing in the same bucket wouldn't have saved it. JDK 21's `HashMap.getNode` compares the stored hash first (an `if_icmpne` in `javap -c java.util.HashMap`) and only calls `equals` when the hashes match.",
            "The two identity hashes are from my run. The outcome doesn't depend on them: two distinct identity hashes give the same result in any bucket.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix is one method (plus `import java.util.Objects;`). With it, the same program printed:",
        },
        {
          type: "code",
          language: "java",
          code: `@Override
public int hashCode() {
    return Objects.hash(street, city, pin);
}`,
        },
        {
          type: "output",
          text: `first.equals(second)  true
hash codes            1177777548 / 1177777548
buckets               15 / 15
add(second)           false
size                  1
get(second)           Asha`,
        },
        {
          type: "heading",
          text: "Mutable fields: the element that gets lost",
        },
        {
          type: "paragraph",
          text: "The contract allows `hashCode` to change when a field used by `equals` changes. A `HashSet` doesn't: it stores each element under the hash it had when it went in.",
        },
        {
          type: "code",
          language: "java",
          title: "MutableKeyLost.java",
          code: `import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public class MutableKeyLost {
    static final class Employee {
        final String id;
        String department;                            // mutable, and part of equals/hashCode

        Employee(String id, String department) {
            this.id = id;
            this.department = department;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Employee e && id.equals(e.id) && department.equals(e.department);
        }

        @Override
        public int hashCode() { return Objects.hash(id, department); }

        @Override
        public String toString() { return id + "@" + department; }
    }

    public static void main(String[] args) {
        Set<Employee> team = new HashSet<>();
        Employee ravi = new Employee("E-42", "Sales");
        team.add(ravi);
        System.out.println("contains before transfer  " + team.contains(ravi));

        ravi.department = "Marketing";                // mutated while inside the set
        System.out.println("contains after transfer   " + team.contains(ravi));
        System.out.println("remove after transfer     " + team.remove(ravi));
        System.out.println("size                      " + team.size());
        System.out.println("iteration still sees      " + team);
        System.out.println("a linear scan finds       " + team.stream().anyMatch(ravi::equals));
        System.out.println("removeIf by id            " + team.removeIf(e -> e.id.equals("E-42"))
                + ", size " + team.size());
    }
}`,
        },
        {
          type: "output",
          text: `contains before transfer  true
contains after transfer   false
remove after transfer     false
size                      1
iteration still sees      [E-42@Marketing]
a linear scan finds       true
removeIf by id            true, size 0`,
        },
        {
          type: "list",
          items: [
            "After the transfer, `contains` and `remove` compute the hash of (E-42, Marketing) and look there, while the entry sits where (E-42, Sales) hashed to, with that old hash stored beside it.",
            "The element hasn't gone anywhere: `size` counts it, iteration prints it, and a linear scan with `equals` finds it. Only the hash lookup is broken.",
            "`removeIf` still worked, because it walks the set with an iterator, and the iterator removes the node it's standing on using the node's stored hash. In a long-running service nobody calls that, so entries like this pile up as a leak.",
          ],
        },
        {
          type: "paragraph",
          text: "The rule I follow: fields used by `hashCode` must not change while the object is inside a hash-based collection, and the easiest way to guarantee that is to make them `final`.",
        },
        {
          type: "heading",
          text: "Objects.hash or 31 * h by hand",
        },
        {
          type: "paragraph",
          text: "`Objects.hash(a, b, c)` is `Arrays.hashCode(new Object[] {a, b, c})`: start at 1, then `result = 31 * result + (e == null ? 0 : e.hashCode())` for each element, which is exactly what the JDK 21 bytecode of `Arrays.hashCode(Object[])` does. The manual version is the same loop, unrolled, without the array:",
        },
        {
          type: "code",
          language: "java",
          code: `@Override
public int hashCode() {
    int result = customerId.hashCode();
    result = 31 * result + productId.hashCode();
    result = 31 * result + Long.hashCode(placedAtMillis);   // primitives via the wrapper's static hashCode
    return result;
}`,
        },
        {
          type: "list",
          items: [
            "`Objects.hash` is shorter and null-safe, but it's varargs: every call allocates an `Object[]` and boxes every primitive argument. In the performance section it cost 48 bytes per call, even after the JIT had compiled it.",
            "Why 31: it's an odd prime, `31 * h` can be computed as `(h << 5) - h`, and `String.hashCode()` uses the same multiplier. Its Javadoc defines the result as `s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]`.",
            "The two versions give different numbers for the same fields, because `Objects.hash` starts at 1. That's fine: a hash code only has to be consistent with `equals` within one run.",
            "For `long`, `double` and `boolean` fields, `Long.hashCode(x)`, `Double.hashCode(x)` and `Boolean.hashCode(x)` beat casting to `int`, which would throw away the high bits.",
          ],
        },
        {
          type: "paragraph",
          text: "And unequal objects can share a hash code. `\"Aa\"` and `\"BB\"` both hash to 2112, as the `HashCollisions` example shows. It's legal; it only costs speed, because `equals` has to sort out every object in a shared bucket.",
        },
      ],
    },
    {
      title: "Records, Arrays and Generated Equality",
      blocks: [
        {
          type: "paragraph",
          text: "The `Record` Javadoc defines the generated `equals` precisely: the argument must be an instance of the same record class, reference components are compared as `Objects.equals(this.c, r.c)` would, and primitive components as the wrapper's `compare` method would (`Double.compare` for a `double`). The hashing algorithm is explicitly unspecified. That definition has one sharp edge: `Objects.equals` on two arrays is reference equality, because arrays don't override `equals`.",
        },
        {
          type: "code",
          language: "java",
          title: "RecordArrays.java",
          code: `import java.util.Arrays;
import java.util.List;

public class RecordArrays {
    record Route(int[] stops) {}

    // Fix 1: keep the array, but compare, hash and print its contents
    record ArrayRoute(int[] stops) {
        ArrayRoute { stops = stops.clone(); }

        @Override public int[] stops() { return stops.clone(); }
        @Override public boolean equals(Object o) {
            return o instanceof ArrayRoute r && Arrays.equals(stops, r.stops);
        }
        @Override public int hashCode() { return Arrays.hashCode(stops); }
        @Override public String toString() { return "ArrayRoute[stops=" + Arrays.toString(stops) + "]"; }
    }

    // Fix 2: use an immutable List, which already has value equality
    record ListRoute(List<Integer> stops) {
        ListRoute { stops = List.copyOf(stops); }
    }

    public static void main(String[] args) {
        Route a = new Route(new int[] {4, 8, 15});
        Route b = new Route(new int[] {4, 8, 15});
        System.out.println(a.equals(b) + " " + (a.hashCode() == b.hashCode()) + " " + a);

        ArrayRoute c = new ArrayRoute(new int[] {4, 8, 15});
        ArrayRoute d = new ArrayRoute(new int[] {4, 8, 15});
        System.out.println(c.equals(d) + " " + (c.hashCode() == d.hashCode()) + " " + c);

        ListRoute e = new ListRoute(List.of(4, 8, 15));
        ListRoute f = new ListRoute(List.of(4, 8, 15));
        System.out.println(e.equals(f) + " " + (e.hashCode() == f.hashCode()) + " " + e);
    }
}`,
        },
        {
          type: "output",
          text: `false false Route[stops=[I@6b884d57]
true true ArrayRoute[stops=[4, 8, 15]]
true true ListRoute[stops=[4, 8, 15]]`,
        },
        {
          type: "list",
          items: [
            "Two `Route`s with the same stops aren't equal, hash differently and print as `[I@6b884d57`. A `HashSet<Route>` would treat every route as unique, which is exactly what deduplication code doesn't expect from a record.",
            "`ArrayRoute` fixes all three methods by hand, and also copies the array on the way in and out, because otherwise anyone holding the array could change the record's \"value\" after it went into a set. The Encapsulation lesson covers those defensive copies.",
            "`ListRoute` is the version I'd actually write. `List.copyOf` gives an immutable list with value equality, and the generated methods just work.",
          ],
        },
        {
          type: "paragraph",
          text: "The \"wrapper's compare\" rule also means a record treats `double` components differently from `==`: a record holding `NaN` equals another holding `NaN`, and `0.0` doesn't equal `-0.0`. That's the opposite of `==` in both cases, and the common mistakes section shows a hand-written `equals` going wrong in exactly those two places.",
        },
        {
          type: "paragraph",
          text: "Out of curiosity I compared hashes: for the three-`String` `Address` record in the execution flow section, the record's `hashCode` was 1177747757, and `Objects.hash` over the same three fields gave 1177777548. The difference is 29,791, which is 31³, consistent with the JDK 25 source of `ObjectMethods` starting its `31 * h` loop at 0 instead of 1. Since the Javadoc calls the algorithm unspecified, I'd never rely on it.",
        },
      ],
    },
    {
      title: "Entity Equality: The JPA Trap",
      blocks: [
        {
          type: "paragraph",
          text: "A JPA entity's identity is its database id, and with a generated id it doesn't exist until the entity is persisted and flushed. Building `equals` and `hashCode` from that id is the obvious move, and it breaks in two ways. No Hibernate is needed to see it: a plain class whose id is assigned by a `save` method behaves the same.",
        },
        {
          type: "code",
          language: "java",
          title: "EntityEquality.java",
          code: `import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

public class EntityEquality {
    // Shaped like a JPA entity: id stays null until the database assigns it on save
    abstract static class OrderEntity {
        Long id;
        final String orderNumber;                     // assigned when the order is placed
        OrderEntity(String orderNumber) { this.orderNumber = orderNumber; }
    }

    // 1. The naive version: equality and hash from the generated id
    static class ByGeneratedId extends OrderEntity {
        ByGeneratedId(String ref) { super(ref); }
        @Override public boolean equals(Object o) {
            return o instanceof ByGeneratedId r && Objects.equals(id, r.id);
        }
        @Override public int hashCode() { return Objects.hashCode(id); }
    }

    // 2. Fix: a business key that exists from the start and never changes
    static class ByBusinessKey extends OrderEntity {
        ByBusinessKey(String ref) { super(ref); }
        @Override public boolean equals(Object o) {
            return o instanceof ByBusinessKey r && orderNumber.equals(r.orderNumber);
        }
        @Override public int hashCode() { return orderNumber.hashCode(); }
    }

    // 3. Fix: id-based equals that never matches a null id, with a constant hash
    static class ByIdConstantHash extends OrderEntity {
        ByIdConstantHash(String ref) { super(ref); }
        @Override public boolean equals(Object o) {
            if (this == o) return true;
            return o instanceof ByIdConstantHash r && id != null && id.equals(r.id);
        }
        @Override public int hashCode() { return ByIdConstantHash.class.hashCode(); }
    }

    static long nextId = 1000;
    static void save(OrderEntity order) { order.id = ++nextId; }  // what persist + flush does to the id

    static void check(String name, Function<String, OrderEntity> newOrder) {
        Set<OrderEntity> orders = new HashSet<>();
        OrderEntity first = newOrder.apply("ORD-7781");
        OrderEntity second = newOrder.apply("ORD-7782");
        orders.add(first);
        orders.add(second);
        int sizeBeforeSave = orders.size();
        save(first);
        System.out.printf("%-17s size before save %d, contains(first) after save %b%n",
                name, sizeBeforeSave, orders.contains(first));
    }

    public static void main(String[] args) {
        check("ByGeneratedId", ByGeneratedId::new);
        check("ByBusinessKey", ByBusinessKey::new);
        check("ByIdConstantHash", ByIdConstantHash::new);
    }
}`,
        },
        {
          type: "output",
          text: `ByGeneratedId     size before save 1, contains(first) after save false
ByBusinessKey     size before save 2, contains(first) after save true
ByIdConstantHash  size before save 2, contains(first) after save true`,
        },
        {
          type: "list",
          items: [
            "**Two different unsaved orders were equal**, because both ids were `null`, so the second was never added. In a real mapping that's a `Set<OrderItem>` with cascade where one of two new items silently disappears.",
            "**After saving, the set lost the order it held.** The hash went from `Objects.hashCode(null)`, which is 0, to the hash of 1001: the mutable-field problem again, except the database did the mutating.",
            "**Business key:** `orderNumber` exists from construction and never changes, so nothing moves. This is the best option whenever the domain has such a key: an order number, an ISBN, an employee number, a UUID assigned in the constructor.",
            "**Id with a constant hash:** equal only when both ids are non-null and the same (plus `this == o`, so reflexivity survives an unsaved entity), and a hash that ignores the id entirely. It's correct, but every entity of the type lands in one bucket. Fine for a dozen items in an order; the performance section measured what it does to 10,000 objects.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Two more things I'd check in a real JPA codebase",
          text: "Hibernate can hand out lazy proxies, generated subclasses of the entity whose fields stay uninitialised until a method is called on them. That's why entity `equals` methods usually use `instanceof` and getters rather than `getClass()` and direct field access. And Lombok's `@Data` or `@EqualsAndHashCode` on an entity generates both methods from every field, including the generated id and lazy collections. The Spring Data JPA and Hibernate track covers both properly.",
        },
      ],
    },
    {
      title: "getClass: The Runtime Class",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "GetClassDemo.java",
          code: `import java.net.URL;
import java.net.URLClassLoader;

public class GetClassDemo {
    public static class Vehicle {}
    static class Car extends Vehicle {}

    public static void main(String[] args) throws Exception {
        Vehicle v1 = new Vehicle();
        Vehicle v2 = new Car();                         // declared Vehicle, really a Car
        Object scores = new int[] {4, 8, 15};

        System.out.println(v1.getClass().getName() + ", " + v2.getClass().getName());
        System.out.println("same Class object: " + (v1.getClass() == new Vehicle().getClass()));
        System.out.println("v2 instanceof Vehicle: " + (v2 instanceof Vehicle)
                + ", v2.getClass() == Vehicle.class: " + (v2.getClass() == Vehicle.class));
        System.out.println(scores.getClass().getName() + " extends " + scores.getClass().getSuperclass().getName());

        // Load the same class file again through a second, unrelated loader
        URL here = GetClassDemo.class.getProtectionDomain().getCodeSource().getLocation();
        try (URLClassLoader other = new URLClassLoader(new URL[] {here}, null)) {
            Class<?> again = other.loadClass("GetClassDemo$Vehicle");
            Object stranger = again.getDeclaredConstructor().newInstance();
            System.out.println("same name: " + again.getName().equals(Vehicle.class.getName())
                    + ", same Class: " + (again == Vehicle.class)
                    + ", instanceof Vehicle: " + (stranger instanceof Vehicle));
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac GetClassDemo.java && java GetClassDemo",
        },
        {
          type: "output",
          text: `GetClassDemo$Vehicle, GetClassDemo$Car
same Class object: true
v2 instanceof Vehicle: true, v2.getClass() == Vehicle.class: false
[I extends java.lang.Object
same name: true, same Class: false, instanceof Vehicle: false`,
        },
        {
          type: "list",
          items: [
            "`getClass()` reports the object's runtime class, not the variable's declared type: `v2` is declared `Vehicle` and answers `Car`.",
            "There's one `Class` object per class per class loader, so two `Vehicle` instances share it and `==` is the right way to compare classes.",
            "`instanceof` accepts subclasses, `getClass() == Vehicle.class` doesn't. That's the whole difference between the two `equals` styles above.",
            "Loading the same class file through a second loader (parent `null`, so it couldn't delegate to the application loader) created a second, separate `Vehicle` class. Same name, different `Class`, and its instance isn't `instanceof Vehicle`. A class's identity is its name plus its defining loader, as the Class Loading lesson explained. `Vehicle` had to be `public`: without that, the reflective constructor call failed with `IllegalAccessException`, because the two `Vehicle`s are in different runtime packages.",
          ],
        },
        {
          type: "paragraph",
          text: "`getClass()` is `final`, and the compiler types it specially: for an expression of static type `T` it returns `Class<? extends |T|>`, where `|T|` is the erasure of `T`. A `Vehicle` variable might hold a subclass, so `Class<? extends Vehicle> c = vehicle.getClass();` compiles, while assigning it to a `Class<Vehicle>` fails with `incompatible types: Class<CAP#1> cannot be converted to Class<Vehicle>`.",
        },
      ],
    },
    {
      title: "clone and Why I Avoid It",
      blocks: [
        {
          type: "paragraph",
          text: "`Object.clone()` is `protected` and native. It allocates a new object of the same runtime class and copies every field as is, without running a constructor. Before that, it checks one thing: whether the class implements `Cloneable`, an interface with no methods at all. So a marker interface changes the behaviour of a protected method in another class, which is about as indirect as Java gets.",
        },
        {
          type: "code",
          language: "java",
          title: "CloneDemo.java",
          code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class CloneDemo {
    // Forgot "implements Cloneable"
    static class Invoice {
        int paise = 24500;
        Invoice copy() throws CloneNotSupportedException { return (Invoice) super.clone(); }
    }

    static class ShoppingCart implements Cloneable {
        String customerId;
        List<String> items = new ArrayList<>();

        ShoppingCart(String customerId) { this.customerId = customerId; }

        ShoppingCart(ShoppingCart other) {                   // copy constructor: a deep copy
            this.customerId = other.customerId;
            this.items = new ArrayList<>(other.items);
        }

        @Override
        public ShoppingCart clone() {
            try {
                return (ShoppingCart) super.clone();         // field-by-field: shallow
            } catch (CloneNotSupportedException e) {
                throw new AssertionError(e);                 // can't happen, we're Cloneable
            }
        }
    }

    public static void main(String[] args) {
        try {
            new Invoice().copy();
        } catch (CloneNotSupportedException e) {
            System.out.println("Invoice: " + e);
        }

        ShoppingCart original = new ShoppingCart("asha");
        original.items.add("Laptop");
        ShoppingCart cloned = original.clone();
        ShoppingCart copied = new ShoppingCart(original);
        cloned.items.add("Mouse");                           // edits the shared list
        System.out.println("original " + original.items + ", same list? " + (cloned.items == original.items));
        System.out.println("copied   " + copied.items + ", same list? " + (copied.items == original.items));

        int[] prices = {120, 340};
        int[] pricesCopy = prices.clone();                   // no cast, no checked exception
        pricesCopy[0] = 999;
        int[][] grid = {{1, 2}, {3, 4}};
        int[][] gridCopy = grid.clone();
        gridCopy[0][0] = 99;                                 // inner arrays are shared
        System.out.println(Arrays.toString(prices) + " " + Arrays.deepToString(grid));
    }
}`,
        },
        {
          type: "output",
          text: `Invoice: java.lang.CloneNotSupportedException: CloneDemo$Invoice
original [Laptop, Mouse], same list? true
copied   [Laptop], same list? false
[120, 340] [[99, 2], [3, 4]]`,
        },
        {
          type: "list",
          items: [
            "`Invoice` called `super.clone()` without implementing `Cloneable` and got `CloneNotSupportedException`, with the class name as the message.",
            "`ShoppingCart` overrides `clone()` as `public` with a covariant return type, so callers don't need a cast. The copy is shallow: the `items` reference was copied, so the clone and the original share one `ArrayList`, and adding an item to the clone changed the original.",
            "The copy constructor makes the deep copy explicit: no exception, no cast, and it would also work with `final` fields. The Constructors lesson covers copy constructors and static factories in detail.",
            "Arrays override `clone()` as public, returning the same array type with no checked exception. For `int[]` that's a full copy; for `int[][]` only the outer array is copied, so `gridCopy[0][0] = 99` changed `grid` too.",
          ],
        },
        {
          type: "paragraph",
          text: "Why I don't write `clone()` methods: `super.clone()` copies `final` fields as they are, and a `final` field can't be reassigned afterwards (`copy.items = new ArrayList<>(items)` inside `clone()` fails with `cannot assign a value to final variable items`), so a class with a final mutable field can't be deep-copied this way. It also skips constructors, so any validation they do never runs; it throws a checked exception that a correct class never throws; and every class in the hierarchy has to cooperate. Effective Java (Item 13) reaches the same verdict. For arrays, `clone()` is fine.",
        },
      ],
    },
    {
      title: "finalize and What Replaced It",
      blocks: [
        {
          type: "paragraph",
          text: "`finalize()` was meant to run before the garbage collector reclaims an object, to release native resources like file handles or sockets. It has been deprecated since Java 9 and, since JDK 18 (JEP 421), deprecated for removal. JDK 21's `Object.class` records both (`javap -v -p java.lang.Object`):",
        },
        {
          type: "output",
          text: `  protected void finalize() throws java.lang.Throwable;
    ...
    Deprecated: true
    RuntimeVisibleAnnotations:
      0: #117(#118=s#119,#120=Z#121)
        java.lang.Deprecated(
          since="9"
          forRemoval=true
        )`,
        },
        {
          type: "paragraph",
          text: "When I overrode `finalize()` in a small `LegacySocket` class, `javac` printed `warning: [removal] finalize() in Object has been deprecated and marked for removal` for the override and again for the `super.finalize()` call, with no `-Xlint` flag: removal warnings are on by default. The finalizer only printed its message because I forced a GC and waited; nothing says when it runs, or whether it runs before the JVM exits. Run with `--finalization=disabled` (added by JEP 421), it never ran at all, which is the switch JEP 421 suggests for testing whether code still depends on finalizers.",
        },
        {
          type: "paragraph",
          text: "JEP 421 lists the reasons: **unpredictable latency** (it runs whenever the GC gets around to it), **unconstrained behaviour** (a finalizer can resurrect its object by storing `this` somewhere), **always enabled** (every object of a class with a non-empty `finalize` costs the GC extra work, even if it was closed properly), and **unspecified threading** (it runs on a thread the code doesn't control).",
        },
        {
          type: "paragraph",
          text: "What replaced it is two things. `try`-with-resources and `AutoCloseable` for the normal path, which releases the resource at a known point. And `java.lang.ref.Cleaner` (Java 9) as a safety net for when someone forgets to close:",
        },
        {
          type: "code",
          language: "java",
          title: "CleanerDemo.java",
          code: `import java.lang.ref.Cleaner;

public class CleanerDemo {
    static final Cleaner CLEANER = Cleaner.create();

    static final class PrinterSession implements AutoCloseable {
        // The cleanup state. Static, so it can't accidentally hold 'this' and keep it alive.
        private static final class Release implements Runnable {
            private final String user;
            Release(String user) { this.user = user; }
            @Override public void run() { System.out.println("printer released by " + user); }
        }

        private final Cleaner.Cleanable cleanable;

        PrinterSession(String user) {
            System.out.println("printer reserved by " + user);
            this.cleanable = CLEANER.register(this, new Release(user));
        }

        @Override
        public void close() { cleanable.clean(); }          // runs Release at most once
    }

    public static void main(String[] args) throws InterruptedException {
        try (PrinterSession session = new PrinterSession("ravi")) {
            System.out.println("printing report");
        }

        new PrinterSession("asha");                          // never closed: a bug
        System.gc();
        Thread.sleep(200);
        System.out.println("main done");
    }
}`,
        },
        {
          type: "output",
          text: `printer reserved by ravi
printing report
printer released by ravi
printer reserved by asha
printer released by asha
main done`,
        },
        {
          type: "list",
          items: [
            "The `try` block released Ravi's printer at a known moment, when it ended. `Cleanable.clean()` runs the action at most once, so the safety net can never release it a second time.",
            "Asha's session was never closed, and the `Cleaner` released it only because I forced a GC, the same timing dependency `finalize` had. That's why it's a safety net, not the plan.",
            "`Release` is a static nested class holding only what the cleanup needs. The `Cleaner` Javadoc is explicit: if the action refers to the registered object, that object never becomes phantom reachable and the action never runs automatically. A lambda that mentions `this` is the easy way to get that wrong; the Nested and Inner Classes lesson shows why inner classes capture it.",
          ],
        },
      ],
    },
    {
      title: "wait, notify and notifyAll",
      blocks: [
        {
          type: "paragraph",
          text: "Every object has a monitor, and `synchronized (obj)` acquires it. Inside, `obj.wait()` releases the monitor and suspends the thread until another thread calls `obj.notify()` (wake one waiter) or `obj.notifyAll()` (wake them all). A woken thread has to re-acquire the monitor before `wait()` returns. All three methods require the caller to own that object's monitor at the moment of the call:",
        },
        {
          type: "code",
          language: "java",
          title: "Mailbox.java",
          code: `public class Mailbox {
    private final Object lock = new Object();
    private String message;                               // guarded by lock

    String awaitMessage() throws InterruptedException {
        synchronized (lock) {
            while (message == null) {                     // a loop, never a plain if
                lock.wait();                              // releases lock while waiting
            }
            return message;
        }
    }

    void deliver(String text) {
        synchronized (lock) {
            message = text;
            lock.notifyAll();
        }
    }

    public static void main(String[] args) throws InterruptedException {
        Mailbox mailbox = new Mailbox();
        try {
            mailbox.lock.notify();                        // not holding the monitor
        } catch (IllegalMonitorStateException e) {
            System.out.println(e);
        }

        Thread reader = new Thread(() -> {
            try {
                System.out.println("reader got " + mailbox.awaitMessage());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        reader.start();
        Thread.sleep(100);                                // let the reader start waiting
        mailbox.deliver("invoice ready");
        reader.join();
    }
}`,
        },
        {
          type: "output",
          text: `java.lang.IllegalMonitorStateException: current thread is not owner
reader got invoice ready`,
        },
        {
          type: "list",
          items: [
            "Calling `notify()` without holding the monitor threw `IllegalMonitorStateException: current thread is not owner`. `wait()` behaves the same way.",
            "`wait()` sits in a `while` loop that re-checks the condition. The `Object.wait` Javadoc warns that spurious wakeups can happen, and another thread may change the condition between the notify and this thread getting the monitor back. Even without the sleep, the loop makes the program correct: if `deliver` ran first, the reader never waits.",
            "`notifyAll()` is the safer default. `notify()` wakes one arbitrary waiter, which is only right when every waiter waits for the same thing and any one of them can proceed.",
            "The lock is a `private final Object`, so no other code can synchronize on it or notify it by accident.",
          ],
        },
        {
          type: "paragraph",
          text: "It should be a plain object. Synchronizing on an `Integer` field made `javac` print `warning: [synchronization] attempt to synchronize on an instance of a value-based class` (JEP 390, Java 16): `Integer.valueOf(4)` returns a cached instance, so unrelated code locking on \"its\" `4` would share one monitor.",
        },
        {
          type: "paragraph",
          text: "Virtual threads changed one thing between the two LTS releases. I parked a virtual thread in `wait()` with the scheduler limited to one carrier (`-Djdk.virtualThreadScheduler.parallelism=1 -Djdk.virtualThreadScheduler.maxPoolSize=1`) and started a second virtual thread. On JDK 21 the second one couldn't run until `notifyAll` released the first, because a virtual thread waiting in `wait()` stays pinned to its carrier. On JDK 25 it ran immediately; the change came with JEP 491 in JDK 24. That's as far as this lesson goes: in application code I'd reach for `java.util.concurrent` (`BlockingQueue`, `CountDownLatch`, `CompletableFuture`) before raw `wait`/`notify`, and the Multithreading and Concurrency track covers monitors properly.",
        },
      ],
    },
    {
      title: "The java.util.Objects Helpers",
      blocks: [
        {
          type: "paragraph",
          text: "`java.util.Objects` is a static utility class, and most of it exists to make the methods of `Object` null-safe. The `@since` tags in the JDK source:",
        },
        {
          type: "table",
          headers: ["Method", "Since", "What it does"],
          rows: [
            ["`equals(a, b)`", "7", "`true` if both are null, `false` if only one is, else `a.equals(b)`"],
            ["`hashCode(o)`", "7", "0 for null, else `o.hashCode()`"],
            ["`hash(values...)`", "7", "`Arrays.hashCode` of the varargs array"],
            ["`toString(o)`, `toString(o, nullDefault)`", "7", "`String.valueOf(o)`, or the default for null"],
            ["`requireNonNull(obj)`, `requireNonNull(obj, message)`", "7", "Throws `NullPointerException` right away, with my message"],
            ["`requireNonNull(obj, Supplier<String>)`", "8", "Same, but builds the message only when it fails"],
            ["`isNull(o)`, `nonNull(o)`", "8", "Predicates meant for method references like `filter(Objects::nonNull)`"],
            ["`requireNonNullElse`, `requireNonNullElseGet`", "9", "The value, or a default when it's null"],
            ["`checkIndex(index, length)`", "9", "Bounds check that throws `IndexOutOfBoundsException`"],
            ["`toIdentityString(o)`", "19", "The default `toString` format, ignoring overrides"],
          ],
        },
        {
          type: "code",
          language: "java",
          title: "ObjectsHelpers.java",
          code: `import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

public class ObjectsHelpers {
    record Employee(String id, String name) {
        Employee {
            Objects.requireNonNull(id, "employee id must not be null");
        }
    }

    public static void main(String[] args) {
        String coupon = null;
        System.out.println(Objects.equals(coupon, null) + " " + Objects.equals(coupon, "SAVE10"));
        System.out.println(Objects.hashCode(coupon) + " " + Objects.hash("Kolkata", 42) + " " + Objects.hash());
        System.out.println(Objects.toString(coupon, "no coupon") + " / " + Objects.toString(coupon));

        List<String> cities = Stream.of("Kolkata", null, "Pune")
                                    .filter(Objects::nonNull)
                                    .toList();
        System.out.println(cities + " " + Objects.isNull(coupon));
        System.out.println(Objects.requireNonNullElse(coupon, "NONE"));

        try {
            new Employee(null, "Ravi");
        } catch (NullPointerException e) {
            System.out.println(e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `true false
0 489220000 1
no coupon / null
[Kolkata, Pune] true
NONE
java.lang.NullPointerException: employee id must not be null`,
        },
        {
          type: "list",
          items: [
            "`Objects.equals(coupon, \"SAVE10\")` with a null `coupon` returned false; `coupon.equals(\"SAVE10\")` would have thrown a `NullPointerException`.",
            "`Objects.hash()` with no arguments is 1, the starting value of the loop. `Objects.hash(\"Kolkata\", 42)` is `31 * (31 * 1 + 1124159915) + 42`, which wraps around to 489220000; 1124159915 is the `\"Kolkata\".hashCode()` from the string hash cache check in the internal working section.",
            "`requireNonNull` in the record's compact constructor rejects the bad value at the moment of construction, with a message naming the field, instead of letting a `NullPointerException` surface three layers later in some `equals` call.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "To tie the pieces together I traced one deduplication: two equal addresses, as a record, added to a `HashSet`. With class-loading logging on, the moment the record's methods get linked is visible:",
        },
        {
          type: "code",
          language: "java",
          title: "FirstCall.java",
          code: `import java.util.HashSet;
import java.util.Set;

public class FirstCall {
    record Address(String street, String city, String pin) {}

    public static void main(String[] args) {
        Address first = new Address("12 Park Street", "Kolkata", "700016");
        Address second = new Address("12 Park Street", "Kolkata", "700016");
        Set<Address> addressBook = new HashSet<>();
        System.out.println("before the first add");
        System.out.println("add(first) " + addressBook.add(first));
        System.out.println("add(second) " + addressBook.add(second) + ", size " + addressBook.size()
                + ", hash " + second.hashCode());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac FirstCall.java
java -Xlog:class+load FirstCall | grep -E "Address |before|add\\(|ObjectMethods "`,
        },
        {
          type: "output",
          text: `[0.028s][info][class,load] FirstCall$Address source: file:/.../FirstCall/
before the first add
[0.028s][info][class,load] java.lang.runtime.ObjectMethods source: jrt:/java.base
add(first) true
add(second) false, size 1, hash 1177747757`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Compile time.** `javac` turns `record Address(...)` into a `final` class extending `java.lang.Record`, with three `private final` fields, a canonical constructor, three accessors, and `toString`, `hashCode` and `equals` bodies that are each one `invokedynamic` to `ObjectMethods.bootstrap`. In `main`, both `addressBook.add(...)` calls compile to `invokeinterface java/util/Set.add`, because the variable's type is `Set`.",
            "**Class loading.** `FirstCall$Address` is loaded when the first `new Address` runs. Two objects are allocated; their mark words hold no hash yet.",
            "**`add(first)`.** `HashSet.add` calls `HashMap.put(first, PRESENT)`, which calls `HashMap.hash(first)`, which calls `first.hashCode()` through `invokevirtual Object.hashCode`. Virtual dispatch finds the record's override.",
            "**First `invokedynamic`.** That call site has never run, so the JVM calls `ObjectMethods.bootstrap` with the record class, the name `hashCode`, the component names `street;city;pin` and three field getters. That is the moment `java.lang.runtime.ObjectMethods` loads in the log. The bootstrap builds a method handle that combines the three `String` hashes and returns a call site, and the JVM links this instruction to it permanently.",
            "**Bucket.** The handle returns 1177747757. `HashMap` spreads it (`h ^ (h >>> 16)`), finds an empty bucket, stores a node holding the key and that hash, and `put` returns `null`, so `add` returns `true`.",
            "**`add(second)`.** The `hashCode` call site is already linked, so no bootstrap this time: same hash, same bucket. The node's stored hash matches and the keys aren't the same reference, so `HashMap` calls `second.equals(first)`. That's a different `invokedynamic`, so it bootstraps now, with the name `equals`. The handle checks the argument is an `Address` and compares the three components with `Objects.equals` semantics: `true`.",
            "**Result.** `put` finds the existing key, keeps `first` as the key, and returns the old value `PRESENT`, which isn't null, so `add` returns `false`. The set still holds only `first`, and every later `equals`, `hashCode` or `toString` on an `Address` goes straight through its linked call site.",
          ],
        },
        {
          type: "paragraph",
          text: "Counting the log lines between the prints (I used `awk`), the first add loaded 202 classes, most from the JDK's CDS archive plus generated `LambdaForm` classes, and the second add another 38 for the `equals` bootstrap. The counts were identical on three runs. That one-time linking cost is measured in the performance section.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "ObjectSyntaxTour.java",
          code: `import java.util.Objects;

public class ObjectSyntaxTour {
    static final class BankAccount {
        private final String owner;
        private final long balancePaise;

        BankAccount(String owner, long balancePaise) {
            this.owner = Objects.requireNonNull(owner, "owner");
            this.balancePaise = balancePaise;
        }

        BankAccount(BankAccount other) {                    // copy constructor instead of clone()
            this(other.owner, other.balancePaise);
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;                     // 1. same object
            if (!(o instanceof BankAccount a)) return false; // 2. type check, also false for null
            return balancePaise == a.balancePaise           // 3. primitives with ==
                    && owner.equals(a.owner);               //    references with equals
        }

        @Override
        public int hashCode() {
            return Objects.hash(owner, balancePaise);       // exactly the fields equals uses
        }

        @Override
        public String toString() {
            return "BankAccount[owner=" + owner + ", balancePaise=" + balancePaise + "]";
        }
    }

    record Price(String currency, int paise) {}             // all three generated

    public static void main(String[] args) {
        BankAccount asha = new BankAccount("asha", 50_000);
        BankAccount copy = new BankAccount(asha);
        System.out.println(asha + " equals copy: " + asha.equals(copy) + ", == copy: " + (asha == copy));
        System.out.println("same hash: " + (asha.hashCode() == copy.hashCode())
                + ", same class: " + (asha.getClass() == copy.getClass()));
        System.out.println(new Price("INR", 18000).equals(new Price("INR", 18000)) + " " + new Price("INR", 18000));
        System.out.println(asha.equals(null) + " " + Objects.equals(null, asha) + " "
                + Objects.toString(null, "n/a") + " " + (System.identityHashCode(null) == 0));
    }
}`,
        },
        {
          type: "output",
          text: `BankAccount[owner=asha, balancePaise=50000] equals copy: true, == copy: false
same hash: true, same class: true
true Price[currency=INR, paise=18000]
false false n/a true`,
        },
        {
          type: "paragraph",
          text: "Everything in one place: the three overrides with `@Override`, the same two fields in `equals` and `hashCode`, a copy constructor where `clone()` would have gone, a record that writes all three itself, `getClass()` comparing runtime classes, and the null-safe helpers. The last `true` is `System.identityHashCode(null)`, which is defined to return 0.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "== versus equals",
        },
        {
          type: "paragraph",
          text: "The first thing I check when someone says two objects \"are the same\": same object, or same value?",
        },
        {
          type: "code",
          language: "java",
          title: "EmployeeEquality.java",
          code: `import java.util.Objects;

public class EmployeeEquality {
    static class PlainEmployee {
        final String id;
        PlainEmployee(String id) { this.id = id; }
    }

    static final class Employee {
        final String id;
        Employee(String id) { this.id = id; }

        @Override public boolean equals(Object o) {
            return o instanceof Employee e && id.equals(e.id);
        }
        @Override public int hashCode() { return id.hashCode(); }
    }

    public static void main(String[] args) {
        PlainEmployee p1 = new PlainEmployee("E-7"), p2 = new PlainEmployee("E-7");
        System.out.println("plain:    == " + (p1 == p2) + ", equals " + p1.equals(p2));

        Employee e1 = new Employee("E-7"), e2 = new Employee("E-7"), alias = e1;
        System.out.println("override: == " + (e1 == e2) + ", equals " + e1.equals(e2)
                + ", alias == " + (alias == e1));

        String literal = "Kolkata";
        String built = new StringBuilder("Kol").append("kata").toString();
        System.out.println("strings:  == " + (literal == built) + ", equals " + literal.equals(built));

        Employee missing = null;
        System.out.println("e1.equals(null) " + e1.equals(missing)
                + ", Objects.equals(null, e1) " + Objects.equals(missing, e1));
        System.out.println(missing.equals(e1));
    }
}`,
        },
        {
          type: "output",
          text: `plain:    == false, equals false
override: == false, equals true, alias == true
strings:  == false, equals true
e1.equals(null) false, Objects.equals(null, e1) false
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "EmployeeEquality$Employee.equals(Object)" because "<local8>" is null
	at EmployeeEquality.main(EmployeeEquality.java:34)`,
        },
        {
          type: "paragraph",
          text: "Without an override, `equals` is `==`, so two employees with the same id are \"different\". With it, they're equal and still two objects. Strings follow the same rule: a string built at runtime is a different object from the pooled literal. And `equals` can't be called on `null` at all, which is the case `Objects.equals` exists for. (`<local8>` is the slot of `missing`, since I compiled without `-g`.)",
        },
        {
          type: "diagram",
          text: ` main's frame              heap
┌─────────────┐      ┌──────────────┐
│ e1    ●─────┼──┬──►│ Employee #1  │
│ alias ●─────┼──┘   │  id ●────────┼──┐
│ e2    ●─────┼──┐   └──────────────┘  │   ┌─────────┐
└─────────────┘  │   ┌──────────────┐  ├──►│ "E-7"   │
                 └──►│ Employee #2  │  │   │ pooled  │
                     │  id ●────────┼──┘   └─────────┘
                     └──────────────┘

 e1 == alias     true    one object, two references
 e1 == e2        false   two objects
 e1.equals(e2)   true    same id value (even the same String)`,
          caption: "== compares the arrows. equals compares what's at the end of them, however the class defines it.",
        },
        {
          type: "heading",
          text: "An equals that hashCode doesn't agree with",
        },
        {
          type: "paragraph",
          text: "Department names typed into an HR form come in any case. Making `equals` case-insensitive and forgetting that `hashCode` must agree is an easy slip:",
        },
        {
          type: "code",
          language: "java",
          title: "DepartmentNames.java",
          code: `import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class DepartmentNames {
    // equals ignores case, hashCode doesn't: equal objects, different hash codes
    static final class LooseDepartment {
        final String name;
        LooseDepartment(String name) { this.name = name; }
        @Override public boolean equals(Object o) {
            return o instanceof LooseDepartment d && name.equalsIgnoreCase(d.name);
        }
        @Override public int hashCode() { return name.hashCode(); }
    }

    // Normalise once, then equals and hashCode use the same value
    record Department(String name) {
        Department {
            name = name.toLowerCase(Locale.ROOT);
        }
    }

    public static void main(String[] args) {
        List<String> typedByHr = List.of("Sales", "SALES", "sales");

        Set<LooseDepartment> loose = new HashSet<>();
        typedByHr.forEach(n -> loose.add(new LooseDepartment(n)));
        System.out.println("LooseDepartment equal? "
                + new LooseDepartment("Sales").equals(new LooseDepartment("SALES"))
                + ", set size " + loose.size());

        Set<Department> departments = new HashSet<>();
        typedByHr.forEach(n -> departments.add(new Department(n)));
        System.out.println("Department set " + departments);
    }
}`,
        },
        {
          type: "output",
          text: `LooseDepartment equal? true, set size 3
Department set [Department[name=sales]]`,
        },
        {
          type: "paragraph",
          text: "Three departments that `equals` calls identical, three entries in the set, because `\"Sales\".hashCode()` and `\"SALES\".hashCode()` differ. The rule behind it: `hashCode` must be computed from the same notion of equality as `equals`. Normalising once in the constructor makes that automatic, and `Locale.ROOT` keeps `toLowerCase` from depending on the server's locale.",
        },
        {
          type: "heading",
          text: "Unequal objects, equal hash codes",
        },
        {
          type: "code",
          language: "java",
          title: "HashCollisions.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class HashCollisions {
    public static void main(String[] args) {
        System.out.println("\\"Aa\\" " + "Aa".hashCode() + ", \\"BB\\" " + "BB".hashCode()
                + ", equal? " + "Aa".equals("BB"));
        System.out.println("0L " + Long.hashCode(0L) + ", -1L " + Long.hashCode(-1L));

        Map<String, String> promoOwner = new HashMap<>();
        promoOwner.put("Aa", "Asha");
        promoOwner.put("BB", "Ravi");
        promoOwner.put("AaAa", "Meera");
        promoOwner.put("BBBB", "Kabir");
        System.out.println("AaAa " + "AaAa".hashCode() + ", BBBB " + "BBBB".hashCode()
                + ", AaBB " + "AaBB".hashCode());
        System.out.println(promoOwner.get("Aa") + " " + promoOwner.get("BB") + " "
                + promoOwner.get("AaAa") + " " + promoOwner.get("BBBB") + " " + promoOwner.get("AaBB"));
    }
}`,
        },
        {
          type: "output",
          text: `"Aa" 2112, "BB" 2112, equal? false
0L 0, -1L 0
AaAa 2031744, BBBB 2031744, AaBB 2031744
Asha Ravi Meera Kabir null`,
        },
        {
          type: "paragraph",
          text: "`'A' * 31 + 'a'` and `'B' * 31 + 'B'` are both 2112, and any string built from those two-character blocks collides too. `Long.hashCode` folds the two 32-bit halves together with XOR, so 0 and -1 both give 0. The map still returned the right owner for every key, and `null` for `AaBB`, which shares the hash but was never added: once the hashes match, `equals` makes the decision. Collisions cost time, never correctness.",
        },
        {
          type: "heading",
          text: "Equal amounts that aren't equal",
        },
        {
          type: "code",
          language: "java",
          title: "PriceEquality.java",
          code: `import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

public class PriceEquality {
    public static void main(String[] args) {
        BigDecimal fromApp = new BigDecimal("245.0");
        BigDecimal fromDb = new BigDecimal("245.00");

        System.out.println("equals " + fromApp.equals(fromDb) + ", compareTo " + fromApp.compareTo(fromDb));
        System.out.println("hash codes " + fromApp.hashCode() + " / " + fromDb.hashCode());

        List<BigDecimal> prices = List.of(fromApp, fromDb);
        Set<BigDecimal> hashed = new HashSet<>(prices);
        Set<BigDecimal> sorted = new TreeSet<>(prices);
        System.out.println("HashSet " + hashed.size() + ", TreeSet " + sorted.size());

        System.out.println("stripped equal? " + fromApp.stripTrailingZeros().equals(fromDb.stripTrailingZeros()));
    }
}`,
        },
        {
          type: "output",
          text: `equals false, compareTo 0
hash codes 75951 / 759502
HashSet 2, TreeSet 1
stripped equal? true`,
        },
        {
          type: "paragraph",
          text: "`BigDecimal.equals` compares value **and** scale, so 245.0 and 245.00 aren't equal, while `compareTo` says they're the same number. A `HashSet` uses `equals` and kept two prices; a `TreeSet` uses `compareTo` and kept one. Nothing here is broken, `BigDecimal` documents it, but it's why I normalise money (`stripTrailingZeros`, or `setScale(2)` for rupees) before using it as a key, or store paise in a `long`. The Comparable and Comparator lesson calls this \"consistent with equals\".",
        },
      ],
    },
    {
      title: "When to Override Object's Methods (and When Not To)",
      blocks: [
        {
          type: "paragraph",
          text: "Most of the bugs in this lesson come from one decision made casually: what equality means for a class. My test is a single question: if I had a second object with exactly the same data, would it be the same thing?",
        },
        {
          type: "diagram",
          text: `Would a second object with the same data be "the same thing"?
│
├─ no: services, repositories, handlers, threads, connections
│      → keep Object's identity equals and hashCode
│
└─ yes
   │
   ├─ a pure value (price, address, point, request payload)
   │     → a record, or a final class overriding both
   │       from every value field, all of them final
   │
   └─ a thing with an identity that outlives field changes
      (order, employee, bank account, user session)
         ├─ stable business key → equals and hashCode on the key
         └─ only a generated id → id-based equals, null never
                                  equal, constant hashCode`,
          caption: "How I decide what equals should mean before writing it.",
        },
        {
          type: "table",
          headers: ["Kind of class", "equals / hashCode", "toString", "Example"],
          rows: [
            ["Value object", "Record, or override both from all value fields", "Generated, or custom with masking", "`record Price(String currency, long paise)`"],
            ["Entity with a business key", "Override both, on the key only", "Id and status", "`Order` by `orderNumber`, `Book` by ISBN"],
            ["Entity with only a generated id", "Id-based `equals`, constant `hashCode`; or don't override", "Id", "A JPA `OrderItem`"],
            ["Service, repository, Spring bean", "Don't override: identity is right", "Default, or a short name", "`OrderService`, `PriceCalculator`"],
            ["Mutable object used as a key", "Only immutable fields, or don't use it as a key", "Anything useful", "`UserSession` by `userId`"],
            ["Enum", "Can't: `equals` and `hashCode` are `final` in `Enum`", "`name()` is usually fine", "`PaymentMode.CARD`"],
          ],
        },
        {
          type: "heading",
          text: "Rules of thumb",
        },
        {
          type: "list",
          items: [
            "Override `equals` and `hashCode` together, from the same fields, or not at all.",
            "Values become records. A record gets all three methods right, except for array components.",
            "Classes that are mostly behaviour (services, controllers, Spring beans) keep identity equality. Two `PriceCalculator` instances aren't \"equal\" in any useful sense.",
            "Fields that change while the object sits in a `HashSet` or as a `HashMap` key never go into `hashCode`.",
            "`getClass()` in `equals` only for a deliberately open hierarchy whose subclasses add state. Otherwise the class is `final` and uses `instanceof`.",
            "`toString` for anything that appears in logs, with sensitive fields masked. Never `clone()` in new code (copy constructors and factories), never `finalize()` (`try`-with-resources, `Cleaner` as a safety net), and `java.util.concurrent` before `wait`/`notify`.",
          ],
        },
        {
          type: "heading",
          text: "One class, three choices",
        },
        {
          type: "paragraph",
          text: "A logged-in user's session is the case where all three answers look plausible. The session is mutable (the current page changes with every click), the browser reconnects after network drops, and logout arrives as an event carrying only the user id. I ran the same sequence against each choice:",
        },
        {
          type: "code",
          language: "java",
          title: "OnlineUsers.java",
          code: `import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.function.BiFunction;

public class OnlineUsers {
    abstract static class Session {
        final String userId;
        String page;                                   // changes with every click
        Session(String userId, String page) { this.userId = userId; this.page = page; }
    }

    // Choice A: the IDE's "generate equals and hashCode" with every field ticked
    static class AllFields extends Session {
        AllFields(String id, String page) { super(id, page); }
        @Override public boolean equals(Object o) {
            return o instanceof AllFields s && userId.equals(s.userId) && page.equals(s.page);
        }
        @Override public int hashCode() { return Objects.hash(userId, page); }
    }

    // Choice B: equality from the one field that identifies the user
    static class ByUserId extends Session {
        ByUserId(String id, String page) { super(id, page); }
        @Override public boolean equals(Object o) {
            return o instanceof ByUserId s && userId.equals(s.userId);
        }
        @Override public int hashCode() { return userId.hashCode(); }
    }

    // Choice C: no override at all, so Object's identity equality
    static class Identity extends Session {
        Identity(String id, String page) { super(id, page); }
    }

    static void simulate(String name, BiFunction<String, String, Session> connect) {
        Set<Session> online = new HashSet<>();
        Session session = connect.apply("ravi", "/home");
        online.add(session);
        session.page = "/cart";                                 // a click
        online.add(connect.apply("ravi", "/cart"));             // reconnect after a network drop
        online.remove(connect.apply("ravi", "/cart"));          // logout event, built from the payload
        System.out.printf("%-11s online after logout: %d%n", name, online.size());
    }

    public static void main(String[] args) {
        simulate("all fields", AllFields::new);
        simulate("userId", ByUserId::new);
        simulate("identity", Identity::new);
    }
}`,
        },
        {
          type: "output",
          text: `all fields  online after logout: 1
userId      online after logout: 0
identity    online after logout: 2`,
        },
        {
          type: "list",
          items: [
            "**All fields (wrong):** the click changed the first session's hash while it was in the set, the reconnect added a second entry, and logout removed only that one. A ghost Ravi stayed online and would keep getting push notifications.",
            "**Identity (wrong here):** nothing got lost, but the reconnect created a second object for the same user, and the logout event built a third that matched neither. Two Ravis online.",
            "**User id (right):** the click doesn't touch the hash, the reconnect is recognised as the same user, and logout finds it. The session's identity is the user, and the page is just its current state.",
          ],
        },
        {
          type: "paragraph",
          text: "For contrast, a `Price` is the opposite case: two prices of ₹245 are interchangeable, nothing about a price changes after it's calculated, so it's a record and the question never comes up. The capstone lesson, When to Use What in Java OOP, puts this decision next to the other modelling choices of the phase.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Overriding equals without hashCode",
        },
        {
          type: "paragraph",
          text: "The classic, and `MissingHashCode` above showed the result: `equals` true, `add` true, set size 2, and `get` returning `null` for an equal key. Many IDEs and static analysers flag a class that overrides one without the other; `javac` doesn't.",
        },
        {
          type: "heading",
          text: "Overloading equals instead of overriding it",
        },
        {
          type: "paragraph",
          text: "`equals(Order other)` compiles, works in a direct call, and fails inside every collection, as `OverloadTrap` showed. `@Override` turns it into `method does not override or implement a method from a supertype`.",
        },
        {
          type: "heading",
          text: "Casting without a type check",
        },
        {
          type: "code",
          language: "java",
          title: "CastingEquals.java",
          code: `import java.util.List;

public class CastingEquals {
    static final class Order {
        final String id;
        Order(String id) { this.id = id; }

        @Override
        public boolean equals(Object o) {
            Order other = (Order) o;                      // no type check, no null check
            return id.equals(other.id);
        }

        @Override
        public int hashCode() { return id.hashCode(); }
    }

    public static void main(String[] args) {
        List<Object> recent = List.of("O-1001", new Order("O-1001"));
        System.out.println(new Order("O-1001").equals(new Order("O-1001")));
        System.out.println(recent.contains(new Order("O-1001")));
    }
}`,
        },
        {
          type: "output",
          text: `true
Exception in thread "main" java.lang.ClassCastException: class java.lang.String cannot be cast to class CastingEquals$Order (java.lang.String is in module java.base of loader 'bootstrap'; CastingEquals$Order is in unnamed module of loader 'app')
	at CastingEquals$Order.equals(CastingEquals.java:10)
	at java.base/java.util.ImmutableCollections$List12.indexOf(ImmutableCollections.java:598)
	at java.base/java.util.ImmutableCollections$AbstractImmutableList.contains(ImmutableCollections.java:331)
	at CastingEquals.main(CastingEquals.java:21)`,
        },
        {
          type: "paragraph",
          text: "Fine between two orders, but `contains` compared my order with every element, starting with a `String`, and `equals` blew up instead of returning `false`. `equals(null)` would have thrown a `NullPointerException` the same way. The `instanceof` pattern fixes both in one line.",
        },
        {
          type: "heading",
          text: "Comparing double fields with ==",
        },
        {
          type: "code",
          language: "java",
          title: "DoubleEquals.java",
          code: `import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class DoubleEquals {
    static final class Temperature {
        final double celsius;
        Temperature(double celsius) { this.celsius = celsius; }

        @Override public boolean equals(Object o) {
            return o instanceof Temperature t && celsius == t.celsius;   // == on a double
        }
        @Override public int hashCode() { return Double.hashCode(celsius); }
    }

    record Reading(double celsius) {}

    public static void main(String[] args) {
        Temperature unknown = new Temperature(Double.NaN);
        List<Temperature> list = new ArrayList<>(List.of(unknown));
        System.out.println("unknown.equals(unknown)    " + unknown.equals(unknown));
        System.out.println("list.contains(unknown)     " + list.contains(unknown));

        Set<Temperature> set = new HashSet<>(List.of(new Temperature(0.0)));
        System.out.println("0.0 equals -0.0            " + new Temperature(0.0).equals(new Temperature(-0.0)));
        System.out.println("set.add(-0.0)              " + set.add(new Temperature(-0.0)) + ", size " + set.size());

        Reading nan = new Reading(Double.NaN);
        System.out.println("record NaN equals NaN      " + nan.equals(new Reading(Double.NaN)));
        System.out.println("record 0.0 equals -0.0     " + new Reading(0.0).equals(new Reading(-0.0)));
    }
}`,
        },
        {
          type: "output",
          text: `unknown.equals(unknown)    false
list.contains(unknown)     false
0.0 equals -0.0            true
set.add(-0.0)              true, size 2
record NaN equals NaN      true
record 0.0 equals -0.0     false`,
        },
        {
          type: "list",
          items: [
            "`NaN == NaN` is false, so the object isn't equal to itself, and an `ArrayList` couldn't find the very object it held. (A `HashSet` would have, through its `==` shortcut, which only hides the bug.)",
            "`0.0 == -0.0` is true, but `Double.hashCode` gives 0 and -2147483648 for them: equal objects, different hash codes, two entries.",
            "`Double.compare` fixes both, and that's exactly what the record used, per the `Record` Javadoc.",
          ],
        },
        {
          type: "heading",
          text: "Overriding what can't be overridden",
        },
        {
          type: "paragraph",
          text: "Three compile errors I collected while writing this, each with its reason:",
        },
        {
          type: "list",
          items: [
            "`new Employee().clone()` on a class that doesn't override `clone()` fails with `clone() has protected access in Object`, even from the same file. A class has to override it as `public` before anyone else can call it.",
            "Overriding `equals` in an enum fails with `equals(Object) in PaymentMode cannot override equals(Object) in Enum` and `overridden method is final`. Each constant is a singleton, so identity is the only sensible equality. `getClass()` fails the same way against `Object`, so no class can lie about its type.",
            "A `default String toString()` in an interface fails with `default method toString in interface Printable overrides a member of java.lang.Object`. A class always inherits `Object`'s version, and class methods beat interface defaults, so such a default could never run.",
          ],
        },
        {
          type: "heading",
          text: "Comparing strings with ==",
        },
        {
          type: "paragraph",
          text: "`EmployeeEquality` printed `== false, equals true` for two strings with the same text. `==` sometimes \"works\" on literals because they're pooled, which is exactly how the bug survives tests and then fails on strings from a request body or a database.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Put `@Override` on every `equals`, `hashCode` and `toString`. It's the cheapest bug detector in this lesson.",
            "Override `equals` and `hashCode` together, from exactly the same fields, and have one unit test assert that equal objects have equal hash codes.",
            "Model values as records, or as `final` classes with `final` fields. Use `List.copyOf` rather than arrays for collection components.",
            "In `equals`: `this == o` first, then the `instanceof` pattern, then fields, with `Double.compare`/`Float.compare` for floating point and `Objects.equals` for nullable references.",
            "Never let `hashCode` depend on a field that changes while the object is inside a hash-based collection.",
            "For JPA entities, use a business key if the domain has one; otherwise id-based `equals` that never matches a null id, with a constant `hashCode`.",
            "Write `toString` for anything that reaches a log. Identifying fields only, sensitive values masked, no object graphs.",
            "Keep `equals` consistent with `compareTo` for anything that might go into both a `HashSet` and a `TreeSet`, or document that it isn't, as `BigDecimal` does.",
            "Copy constructors or static factories instead of `clone()`; `try`-with-resources instead of `finalize()`, with `Cleaner` only as a safety net.",
            "Lock on a `private final Object`, never on boxed values or strings, and prefer `java.util.concurrent` to `wait`/`notify`.",
            "Never persist identity hash codes or treat them as unique ids. They're only stable for one object during one run.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "These methods sit on hot paths: every `HashMap.get` calls `hashCode` once and usually `equals` once. Three costs were worth measuring. Allocation counts are exact; the timings are from my machine on JDK 21 and will differ on yours.",
        },
        {
          type: "heading",
          text: "Objects.hash allocates on every call",
        },
        {
          type: "code",
          language: "java",
          title: "HashCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.Objects;

public class HashCost {
    static final com.sun.management.ThreadMXBean MX =
            (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();

    static final class Manual {
        final String city; final long pinCode;
        Manual(String city, long pinCode) { this.city = city; this.pinCode = pinCode; }
        @Override public int hashCode() { return 31 * city.hashCode() + Long.hashCode(pinCode); }
    }

    static final class ViaObjects {
        final String city; final long pinCode;
        ViaObjects(String city, long pinCode) { this.city = city; this.pinCode = pinCode; }
        @Override public int hashCode() { return Objects.hash(city, pinCode); }
    }

    record AsRecord(String city, long pinCode) {}

    static int sink;

    static long bytesPerCall(Object key, int calls) {
        long id = Thread.currentThread().threadId();
        long before = MX.getThreadAllocatedBytes(id);
        for (int i = 0; i < calls; i++) sink += key.hashCode();
        return (MX.getThreadAllocatedBytes(id) - before) / calls;
    }

    public static void main(String[] args) {
        Object manual = new Manual("Kolkata", 700_091L);
        Object viaObjects = new ViaObjects("Kolkata", 700_091L);
        Object record = new AsRecord("Kolkata", 700_091L);
        Object[] keys = {manual, viaObjects, record};
        for (Object k : keys) bytesPerCall(k, 1);                    // load and link everything once
        System.out.printf("first 1,000 calls:  manual %d, Objects.hash %d, record %d bytes/call%n",
                bytesPerCall(manual, 1_000), bytesPerCall(viaObjects, 1_000), bytesPerCall(record, 1_000));
        for (int i = 0; i < 50; i++) for (Object k : keys) bytesPerCall(k, 100_000);
        System.out.printf("after warm-up:      manual %d, Objects.hash %d, record %d bytes/call%n",
                bytesPerCall(manual, 1_000_000), bytesPerCall(viaObjects, 1_000_000), bytesPerCall(record, 1_000_000));
    }
}`,
        },
        {
          type: "output",
          text: `first 1,000 calls:  manual 0, Objects.hash 48, record 0 bytes/call
after warm-up:      manual 0, Objects.hash 48, record 0 bytes/call`,
        },
        {
          type: "list",
          items: [
            "48 bytes per `Objects.hash` call: a 24-byte `Object[2]` for the varargs and a 24-byte `Long` for the boxed `pinCode` (700091 is far outside the `Long` cache of -128 to 127). Same result on three runs.",
            "Escape analysis didn't remove it, even after warm-up. I also tried a version where the call site only ever saw `ViaObjects`, and it still allocated 48 bytes per call. Short-lived garbage is cheap for the GC, but for a key hashed millions of times a second the manual formula is free.",
            "The record allocated nothing. Its generated `hashCode` hashes the `long` component through a primitive hasher, with no boxing and no array.",
          ],
        },
        {
          type: "heading",
          text: "A record's first call pays for linking",
        },
        {
          type: "paragraph",
          text: "I timed `hashCode()` with `System.nanoTime()` on two small records. Over three runs, the very first record method call in the JVM took 31 to 44 ms, the first call on a second record class about half a millisecond, and every later call a few microseconds. The big number is one-time infrastructure, loading `ObjectMethods` and generating the method-handle classes the execution flow section counted. Irrelevant to throughput, visible in a CLI tool or a cold serverless start.",
        },
        {
          type: "heading",
          text: "A bad hashCode turns lookups into scans",
        },
        {
          type: "code",
          language: "java",
          title: "ConstantHash.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class ConstantHash {
    static long equalsCalls;

    static final class EmployeeId {
        final int value;
        final boolean constantHash;
        EmployeeId(int value, boolean constantHash) { this.value = value; this.constantHash = constantHash; }

        @Override public boolean equals(Object o) {
            equalsCalls++;
            return o instanceof EmployeeId e && value == e.value;
        }
        @Override public int hashCode() { return constantHash ? 42 : Integer.hashCode(value); }
    }

    static void lookups(boolean constantHash) {
        Map<EmployeeId, String> departmentOf = new HashMap<>();
        for (int i = 0; i < 10_000; i++) departmentOf.put(new EmployeeId(i, constantHash), "dept-" + i % 7);
        equalsCalls = 0;
        long start = System.nanoTime();
        for (int i = 0; i < 10_000; i++) departmentOf.get(new EmployeeId(i, constantHash));
        System.out.printf("%-18s %,11d equals calls for 10,000 gets, %,d ms%n",
                constantHash ? "hashCode() = 42" : "Integer.hashCode", equalsCalls,
                (System.nanoTime() - start) / 1_000_000);
    }

    public static void main(String[] args) {
        lookups(false);
        lookups(true);
    }
}`,
        },
        {
          type: "output",
          text: `Integer.hashCode        10,000 equals calls for 10,000 gets, 1 ms
hashCode() = 42     50,014,999 equals calls for 10,000 gets, 365 ms`,
        },
        {
          type: "list",
          items: [
            "With a good hash, each `get` found its key with exactly one `equals` call. With a constant hash, 10,000 gets needed about fifty million, roughly n²/2. The counts were identical on every run; the time ranged from about 300 to 700 ms against 1 to 3 ms, depending on what else my machine was running.",
            "Java 8's tree bins don't rescue this case. They order entries by hash and then by `compareTo`, and these keys have one hash and aren't `Comparable`, so a lookup still searches the whole bin. The HashMap Internals lesson covers tree bins.",
            "That's the price of the constant-`hashCode` entity pattern from the JPA section: harmless for a dozen items in an order, a disaster for a set of 10,000 entities.",
          ],
        },
        {
          type: "paragraph",
          text: "Two costs are close to zero by design. `String` computes its hash once and caches it, so `String` keys are cheap to rehash. And the identity hash is generated once, on first request, and then read from the header. What remains is my own `equals` and `hashCode`, which run on every lookup and should be as cheap as the fields allow.",
        },
      ],
    },
    {
      title: "Object Methods in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Three problems I'd expect in a ride-hailing backend, each traced to one of `Object`'s methods. The first and third use Jackson 2.21.7 (`com.fasterxml.jackson.core:jackson-databind`), which is what Spring Boot uses to turn HTTP bodies into objects and back.",
        },
        {
          type: "heading",
          text: "1. The double tap that dispatched two drivers",
        },
        {
          type: "paragraph",
          text: "A rider taps \"Book\" twice on a laggy network and the app sends the same request body twice. The dispatcher keeps a `HashSet` of pending requests precisely to ignore duplicates. Each body is deserialized into a new object:",
        },
        {
          type: "code",
          language: "java",
          title: "DuplicateDispatch.java",
          code: `import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashSet;
import java.util.Set;

public class DuplicateDispatch {
    // First version: Jackson fills public fields, equality is Object's identity
    public static class RideRequestV1 {
        public String riderId;
        public String pickup;
        public String drop;
    }

    // The fix: a record, so equals and hashCode come from the three components
    public record RideRequest(String riderId, String pickup, String drop) {}

    static final ObjectMapper MAPPER = new ObjectMapper();

    static <T> void dispatchAll(Class<T> type, String... bodies) throws Exception {
        Set<T> pending = new HashSet<>();
        for (String body : bodies) {
            T request = MAPPER.readValue(body, type);     // a new object for every HTTP body
            if (pending.add(request)) {
                System.out.println("  dispatching " + request);
            } else {
                System.out.println("  duplicate tap ignored");
            }
        }
        System.out.println("  drivers notified: " + pending.size());
    }

    public static void main(String[] args) throws Exception {
        String tap = "{\\"riderId\\":\\"asha-17\\",\\"pickup\\":\\"Salt Lake\\",\\"drop\\":\\"Howrah\\"}";
        System.out.println("class without equals/hashCode:");
        dispatchAll(RideRequestV1.class, tap, tap);
        System.out.println("record:");
        dispatchAll(RideRequest.class, tap, tap);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp "$JACKSON" DuplicateDispatch.java
java -cp "$JACKSON:." DuplicateDispatch`,
        },
        {
          type: "output",
          text: `class without equals/hashCode:
  dispatching DuplicateDispatch$RideRequestV1@76a3e297
  dispatching DuplicateDispatch$RideRequestV1@6121c9d6
  drivers notified: 2
record:
  dispatching RideRequest[riderId=asha-17, pickup=Salt Lake, drop=Howrah]
  duplicate tap ignored
  drivers notified: 1`,
        },
        {
          type: "list",
          items: [
            "`$JACKSON` holds the `jackson-databind`, `jackson-core` and `jackson-annotations` jars from my local Maven repository. Jackson has supported records since 2.12, through the canonical constructor.",
            "The deduplication logic was fine. The request class had no notion of equality, so two identical bodies became two \"different\" requests and two drivers got one booking. The log line didn't help: `RideRequestV1@76a3e297` (an identity hash from my run) doesn't say which rider it was.",
            "The record fixed both with one line: value equality from the components and a readable `toString`.",
            "In a real dispatcher I'd add an idempotency key generated once per booking attempt and deduplicate on that with an expiry, so a rider who wants a second identical ride an hour later still can. And entries must leave the set once a ride is assigned, or it's the leak from the Memory Allocation lesson.",
          ],
        },
        {
          type: "heading",
          text: "2. A cache keyed by a mutable location",
        },
        {
          type: "paragraph",
          text: "Finding nearby drivers is an expensive geo query, so the service caches results per location. The rider's session object holds one `Location` and updates it in place on every GPS ping to avoid allocating, and that same object is used as the cache key:",
        },
        {
          type: "code",
          language: "java",
          title: "NearbyDriverCache.java",
          code: `import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class NearbyDriverCache {
    // Mutable: a rider's session updates it in place on every GPS ping
    static final class Location {
        double lat, lng;
        Location(double lat, double lng) { this.lat = lat; this.lng = lng; }
        void moveTo(double lat, double lng) { this.lat = lat; this.lng = lng; }

        @Override public boolean equals(Object o) {
            return o instanceof Location l && Double.compare(lat, l.lat) == 0 && Double.compare(lng, l.lng) == 0;
        }
        @Override public int hashCode() { return Objects.hash(lat, lng); }
        @Override public String toString() { return lat + "," + lng; }
    }

    // Immutable key: a grid cell of about 100 m, computed once per request
    record GridCell(long latCell, long lngCell) {
        static GridCell of(Location l) {
            return new GridCell(Math.round(l.lat * 1000), Math.round(l.lng * 1000));
        }
    }

    static int geoQueries = 0;

    static List<String> queryDriversNear(Object where) {      // the expensive geo query
        geoQueries++;
        return List.of("drivers near " + where);
    }

    public static void main(String[] args) {
        Location asha = new Location(22.5867, 88.4171);         // Salt Lake
        Map<Location, List<String>> byLocation = new HashMap<>();
        byLocation.computeIfAbsent(asha, NearbyDriverCache::queryDriversNear);
        asha.moveTo(22.5958, 88.4795);                          // ping: Asha is now in New Town
        Location ravi = new Location(22.5867, 88.4171);         // Ravi asks from Salt Lake
        byLocation.computeIfAbsent(ravi, NearbyDriverCache::queryDriversNear);
        byLocation.computeIfAbsent(asha, NearbyDriverCache::queryDriversNear);
        System.out.println("mutable keys:   " + geoQueries + " geo queries, " + byLocation.size()
                + " entries, keys " + byLocation.keySet());

        geoQueries = 0;
        asha.moveTo(22.5867, 88.4171);                          // start over in Salt Lake
        Map<GridCell, List<String>> byCell = new HashMap<>();
        byCell.computeIfAbsent(GridCell.of(asha), NearbyDriverCache::queryDriversNear);
        asha.moveTo(22.5958, 88.4795);
        byCell.computeIfAbsent(GridCell.of(ravi), NearbyDriverCache::queryDriversNear);
        byCell.computeIfAbsent(GridCell.of(asha), NearbyDriverCache::queryDriversNear);
        System.out.println("immutable keys: " + geoQueries + " geo queries, " + byCell.size()
                + " entries, keys " + byCell.keySet());
    }
}`,
        },
        {
          type: "output",
          text: `mutable keys:   3 geo queries, 3 entries, keys [22.5958,88.4795, 22.5867,88.4171, 22.5958,88.4795]
immutable keys: 2 geo queries, 2 entries, keys [GridCell[latCell=22596, lngCell=88480], GridCell[latCell=22587, lngCell=88417]]`,
        },
        {
          type: "list",
          items: [
            "Ravi's Salt Lake request should have been a hit. The Salt Lake entry sat in the right bucket with the right stored hash, but its key object now said New Town, so `equals` failed and the query ran again.",
            "Asha's New Town request missed too and stored a second entry whose key is the **same object** as the first. The printed key set shows one `HashMap` holding two equal keys, which a map should never contain.",
            "Every ping strands another entry that can't be found or evicted, so the hit rate falls while the size grows.",
            "The fix is an immutable key computed at request time. A rounded grid cell is also what makes the cache useful, since nearby riders share an entry, and as a record of two `long`s its `equals` and `hashCode` are correct by construction.",
          ],
        },
        {
          type: "heading",
          text: "3. A card number in the logs",
        },
        {
          type: "paragraph",
          text: "The payment service logs every charge, and the charge is a record. A record's generated `toString` prints every component, which is perfect for a fare and dangerous for a payment:",
        },
        {
          type: "code",
          language: "java",
          title: "PaymentLogging.java",
          code: `import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;

public class PaymentLogging {
    record LeakyCharge(String rideId, String cardNumber, String riderPhone, long amountPaise) {}

    record Charge(String rideId, String cardNumber, String riderPhone, long amountPaise) {
        @Override
        public String toString() {
            return "Charge[rideId=" + rideId + ", card=" + mask(cardNumber, 4)
                    + ", phone=" + mask(riderPhone, 2) + ", amountPaise=" + amountPaise + "]";
        }
    }

    static String mask(String value, int visible) {
        if (value == null) return "null";
        String digits = value.replaceAll("\\\\D", "");
        int keep = Math.min(visible, digits.length());
        return "*".repeat(digits.length() - keep) + digits.substring(digits.length() - keep);
    }

    static void log(Object message) {
        System.out.println("INFO  PaymentService - charging " + message);
    }

    public static void main(String[] args) throws Exception {
        log(new LeakyCharge("R-1001", "4111 1111 1111 1111", "+91 98300 43210", 24500));

        Charge charge = new Charge("R-1001", "4111 1111 1111 1111", "+91 98300 43210", 24500);
        log(charge);
        log(List.of(charge));                                   // collections print elements with toString
        System.out.println(new ObjectMapper().writeValueAsString(charge));   // JSON never calls toString
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp "$JACKSON" PaymentLogging.java
java -cp "$JACKSON:." PaymentLogging`,
        },
        {
          type: "output",
          text: `INFO  PaymentService - charging LeakyCharge[rideId=R-1001, cardNumber=4111 1111 1111 1111, riderPhone=+91 98300 43210, amountPaise=24500]
INFO  PaymentService - charging Charge[rideId=R-1001, card=************1111, phone=**********10, amountPaise=24500]
INFO  PaymentService - charging [Charge[rideId=R-1001, card=************1111, phone=**********10, amountPaise=24500]]
{"rideId":"R-1001","cardNumber":"4111 1111 1111 1111","riderPhone":"+91 98300 43210","amountPaise":24500}`,
        },
        {
          type: "list",
          items: [
            "The first line is the bug: a full card and phone number in a log file, which then travels to log aggregation, backups and dashboards. Card data in logs is a PCI DSS audit finding. (4111 1111 1111 1111 is a well-known test card number.)",
            "The overridden `toString` masked both, including inside the `List`, because collections print their elements with `toString`.",
            "The catch is the last line: Jackson serializes through the accessors and never calls `toString`, so the JSON still carries everything. Masking `toString` protects logs, not API responses or messages to other services.",
            "The deeper fix is not holding the raw number at all: the payment gateway tokenizes the card and the backend only sees a token. Where a sensitive value must exist, a small wrapper type with a masked `toString` (a `CardNumber` record) protects every log line that prints it.",
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
              question: "What is java.lang.Object, and which methods does it give every class?",
              answer:
                "It's the root of every class hierarchy and of every array type: a class with no `extends` clause extends `Object`. It gives every object `equals`, `hashCode`, `toString`, `getClass`, `clone`, `finalize`, three `wait` overloads, `notify` and `notifyAll`.\n\nWhen I listed `Object.class.getDeclaredMethods()` on JDK 21 I got 12: those 11 plus a private native `wait0` that `wait(long)` calls. Six are `final` (`getClass`, `notify`, `notifyAll` and the `wait`s), so only `equals`, `hashCode`, `toString`, `clone` and `finalize` can be overridden.",
            },
            {
              question: "What's the difference between == and equals()?",
              answer:
                "For references, `==` checks whether both point to the same object, while `equals()` checks whether two objects are meaningfully equal, as the class defines it. `Object`'s default `equals` is just `==`, so they only differ once a class overrides `equals`.\n\nIn my `EmployeeEquality` run, two plain employees with id E-7 were unequal both ways, while two employees with an overridden `equals` gave `== false` and `equals true`. A runtime-built \"Kolkata\" was `==`-different from the literal but `equals` to it.",
            },
            {
              question: "What does the default toString() print?",
              answer:
                "`getClass().getName() + \"@\" + Integer.toHexString(hashCode())`, for example `DefaultToString$Customer@15db9742`. It's useful to the JVM and useless to a person reading a log.\n\nIt calls the virtual `hashCode()`, so an overridden hash shows up: my `FixedHash` class returning 42 printed `@2a`. Records generate a readable `toString`, and arrays don't override it at all, which is why an `int[]` prints `[I@...` and needs `Arrays.toString`.",
            },
            {
              question: "Why must you override hashCode() whenever you override equals()?",
              answer:
                "Because equal objects must have equal hash codes, and hash-based collections depend on it. Without an override, two equal objects keep different identity hash codes, so `HashMap` and `HashSet` look in the wrong bucket and never call `equals`.\n\nMy `MissingHashCode` run: `equals` returned true, but the set accepted the duplicate (size 2) and `map.get` returned `null` for an equal key. Adding a `hashCode` over the same three fields fixed both.",
            },
            {
              question: "Can two unequal objects have the same hash code?",
              answer:
                "Yes. That's a collision, and it's legal: the contract only says equal objects must hash equally, not that unequal ones must differ. Collisions cost lookup time, never correctness, because `equals` decides within a bucket.\n\n`\"Aa\"` and `\"BB\"` both hash to 2112, and `Long.hashCode` gives 0 for both `0L` and `-1L`. In my `HashCollisions` map, four colliding keys all returned their own values, and the colliding but absent `AaBB` returned `null`.",
            },
            {
              question: "What does getClass() return?",
              answer:
                "The `Class` object of the object's runtime class, not the declared type of the variable. A `Vehicle v2 = new Car()` reports `Car`.\n\nThere's one `Class` object per class per class loader, so comparing two vehicles' `getClass()` with `==` was true. When I loaded the same class file through a second loader, the name matched but the `Class` objects didn't, and its instance wasn't `instanceof Vehicle`.",
            },
            {
              question: "What does Cloneable do, given that it has no methods?",
              answer:
                "It's a marker that changes how `Object.clone()` behaves: if the class implements it, `clone()` returns a field-by-field copy; if not, `clone()` throws `CloneNotSupportedException`.\n\nMy `Invoice` class called `super.clone()` without it and got `java.lang.CloneNotSupportedException: CloneDemo$Invoice`. Arrays implement `Cloneable`, which is why every array has a public `clone()`.",
            },
            {
              question: "Which Object methods does a record generate?",
              answer:
                "`equals`, `hashCode` and `toString`, all derived from the components. `equals` accepts only the same record class and compares component by component, `hashCode` combines the component hashes, and `toString` prints `Name[component=value, ...]`.\n\n`new Price(\"INR\", 24500)` printed `Price[currency=INR, paise=24500]`, and two equal prices were equal with equal hashes. `javap` showed each of the three as a single `invokedynamic` to `ObjectMethods.bootstrap`.",
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
              question: "State the equals contract.",
              answer:
                "Reflexive (`x.equals(x)`), symmetric (`x.equals(y)` exactly when `y.equals(x)`), transitive, consistent while the compared fields don't change, and `x.equals(null)` is false, never an exception.\n\nEach rule has a classic failure. My `PointColor` program broke symmetry (`p.equals(cp)` true, `cp.equals(p)` false) and, with a lenient fix, transitivity. A `double` field compared with `==` broke reflexivity for `NaN`, so an `ArrayList` couldn't find an object it held.",
            },
            {
              question: "State the hashCode contract.",
              answer:
                "Consistent within one execution while the `equals` fields don't change; equal objects must have equal hash codes; unequal objects may collide. Values may differ between runs.\n\nThe middle rule is the one that breaks. Comparing doubles with `==` but hashing with `Double.hashCode` made `0.0` and `-0.0` equal with hashes 0 and -2147483648, and a `HashSet` kept both.",
            },
            {
              question: "getClass() or instanceof in equals: which, and why?",
              answer:
                "For a final class or a record, `instanceof`: it's shorter, handles `null`, and with no subclasses it agrees with `getClass()`. In an open hierarchy, `instanceof` breaks symmetry once a subclass adds state, while `getClass()` keeps symmetry but makes a subclass instance unequal to its parent even when it adds nothing.\n\n`PointColor` showed the `instanceof` failure. My default is to make value classes final or records so the question never comes up. JPA entities lean to `instanceof` because Hibernate's proxies are subclasses.",
            },
            {
              question: "What goes wrong if equals is declared as equals(Order other)?",
              answer:
                "It's an overload, not an override. Calls where both static types are `Order` use it, but every collection calls `equals(Object)`, which is still `Object`'s identity check.\n\nIn `OverloadTrap`, `a.equals(b)` was true while `List.contains`, `HashSet.contains` and `Objects.equals` all returned false. `@Override` turns it into a compile error: \"method does not override or implement a method from a supertype\".",
            },
            {
              question: "What happens to a HashSet element if you change a field its hashCode uses?",
              answer:
                "It gets lost: still in the set, but unfindable by hash. `contains` and `remove` compute the new hash and look in the wrong place, while the entry sits under the old hash stored in its node.\n\nIn `MutableKeyLost`, `contains` and `remove` both returned false, `size` stayed 1 and iteration still printed the element. Only `removeIf`, which removes through the iterator using the stored hash, got it out. The cure is immutable fields in `hashCode`.",
            },
            {
              question: "Is the default hashCode() the object's memory address?",
              answer:
                "Not on modern HotSpot by default. It's generated on first request, by default with a per-thread xor-shift generator (mode 5 of the experimental `hashCode` flag), and stored in the mark word so it stays stable while the GC moves the object.\n\nWith `-XX:hashCode=4`, the address mode, consecutive objects got values a few hundred bytes apart; with the default they looked unrelated. Reading the header with `Unsafe`, a new object's mark word was `0x1`, and after `System.identityHashCode` it held the hash in bits 8 to 38 on JDK 21.",
            },
            {
              question: "Objects.hash() or a hand-written 31 * h formula?",
              answer:
                "Both are correct. `Objects.hash` is shorter and null-safe, but it's varargs, so every call allocates an `Object[]` and boxes primitives. The hand-written version allocates nothing.\n\nI measured 48 bytes per `Objects.hash(city, pinCode)` call, a 24-byte array plus a 24-byte `Long`, unchanged after JIT warm-up, against 0 for the manual formula and for a record. For a key hashed millions of times I'd write it by hand or use a record.",
            },
            {
              question: "Why is clone() considered broken, and what do you use instead?",
              answer:
                "A marker interface changes a protected method's behaviour, the copy is shallow, constructors are skipped, a checked exception has to be caught that never happens in a correct class, and `final` fields can't be deep-copied because they can't be reassigned after `super.clone()`. Copy constructors or static factories do the job explicitly.\n\nIn `CloneDemo` the clone shared the `items` list with the original, so adding an item to the copy changed both, while the copy constructor's `new ArrayList` kept them apart. Arrays are the exception: their `clone()` is public and fine, though shallow for nested arrays.",
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
              question: "Where is the identity hash code stored, and when is it computed?",
              answer:
                "In the mark word of the object header, computed lazily the first time `Object.hashCode()`, `System.identityHashCode` or the default `toString` asks. Allocation doesn't compute it, and an overridden `hashCode` never touches the header.\n\nOn JDK 21 a fresh object's mark word was `0x1`; after hashing it was `0x5cad808601`, with the hash `5cad8086` in bits 8 to 38. Under a stack lock the mark word pointed to the lock record and the hash still came back unchanged. On JDK 25 the hash starts at bit 11, and with compact headers the class pointer shares the same 64 bits.",
            },
            {
              question: "How does a record implement equals, hashCode and toString in bytecode?",
              answer:
                "Each method is one `invokedynamic` whose bootstrap is `java.lang.runtime.ObjectMethods.bootstrap`, given the record class, the component names and a getter handle per component. On first execution it builds a method handle and links the call site permanently.\n\n`javap` on `Price` showed exactly that, with `currency;paise` and two `REF_getField` handles. With `-Xlog:class+load`, `ObjectMethods` loaded at the first `hashCode` call, not at startup, and that very first linkage took 31 to 44 ms on my machine, with later calls in microseconds.",
            },
            {
              question: "Why does a record with an array component have surprising equality?",
              answer:
                "The generated `equals` compares reference components the way `Objects.equals` would, and arrays inherit identity `equals`. So two records holding different arrays with the same contents are unequal, hash differently, and print as `[I@...`.\n\n`RecordArrays` showed two `Route(new int[] {4, 8, 15})` as unequal. The fixes are overriding the three methods with `Arrays.equals`, `Arrays.hashCode` and `Arrays.toString` plus defensive copies, or using `List.copyOf`, which already has value equality.",
            },
            {
              question: "How does HashMap use hashCode and equals on a lookup?",
              answer:
                "It hashes the key, spreads it with `h ^ (h >>> 16)`, picks a bucket, and for each node there checks the stored hash first, then reference identity, then `equals`. `equals` only runs when the stored hash matches.\n\nThat's why `equals` without `hashCode` fails even inside one bucket, and why a constant `hashCode` is legal but slow: my `ConstantHash` test needed 50,014,999 `equals` calls for 10,000 gets, against 10,000 with `Integer.hashCode`. JDK 21's `HashMap.getNode` bytecode shows the `if_icmpne` on the stored hash before `invokevirtual equals`.",
            },
            {
              question: "How should a JPA entity implement equals and hashCode?",
              answer:
                "With a business key that exists from construction and never changes, such as an order number or a UUID assigned in the constructor. Without one, id-based `equals` that never treats a null id as equal (keeping `this == o` for reflexivity), with a `hashCode` that ignores the id, typically a constant.\n\nMy simulation showed the naive id-based version failing twice: two unsaved orders were \"equal\" so one was dropped, and after `save` the set no longer contained the first. Both fixes passed. Use `instanceof` rather than `getClass()`, because Hibernate proxies are subclasses.",
            },
            {
              question: "Why was finalize() deprecated, and what replaced it?",
              answer:
                "JEP 421 lists unpredictable latency, unconstrained behaviour (a finalizer can resurrect its object), an always-on cost and unspecified threading. It's been deprecated since Java 9 and for removal since JDK 18. The replacements are `try`-with-resources for deterministic release and `java.lang.ref.Cleaner` as a safety net.\n\n`javac` flags any override with a `[removal]` warning. My `CleanerDemo` released the closed printer session at the end of the `try` block, and the forgotten one only after a forced GC, which is why `Cleaner` is a backstop. Its action must not reference the registered object, or it never runs.",
            },
            {
              question: "Why are wait and notify on Object, and what's required to call them?",
              answer:
                "Java 1.0 gave every object a monitor, and `wait`/`notify` are the condition operations on it, so they live on `Object` and are `final`. The caller must own that object's monitor, meaning it's inside `synchronized` on that same object, or the call throws `IllegalMonitorStateException`.\n\n`Mailbox`'s bare `notify()` threw \"current thread is not owner\". The waiting side loops on its condition because of spurious wakeups. And on JDK 21 a virtual thread waiting in `wait()` pinned its carrier in my test, while on JDK 25 it didn't.",
            },
            {
              question: "Why can 245.0 and 245.00 be different keys in a HashSet but the same in a TreeSet?",
              answer:
                "`BigDecimal.equals` compares value and scale, while `compareTo` compares only the value. `HashSet` uses `equals`, `TreeSet` uses `compareTo`, so `BigDecimal`'s natural ordering is inconsistent with `equals`, which its Javadoc documents.\n\n`PriceEquality` printed `HashSet 2, TreeSet 1`, with hash codes 75951 and 759502. For money used as a key I normalise the scale first or store paise in a `long`.",
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
              question: "HashSet.contains returns false for an object you just added. How do you debug it?",
              answer:
                "If it's the same reference, the hash changed: a field used by `hashCode` was mutated after the add, because `HashMap`'s identity shortcut would otherwise find it. If it's an equal copy, `equals` and `hashCode` disagree, or `equals` is an overload like `equals(Order)`.\n\nI'd print `hashCode()` before and after the suspect operation, check for `@Override` and an `Object` parameter, and check that both methods use the same immutable fields. `MutableKeyLost`, `MissingHashCode` and `OverloadTrap` each reproduce one of these causes.",
            },
            {
              question: "In the production scenario, riders report two drivers arriving for one booking, and logs show the request handled twice. What's your theory?",
              answer:
                "Duplicate taps reaching a deduplication set whose request class doesn't override `equals` and `hashCode`. Every HTTP body becomes a new object, so identity equality never sees a duplicate.\n\n`DuplicateDispatch` reproduced it with Jackson: the plain class dispatched twice, logged as `RideRequestV1@76a3e297` and `@6121c9d6`, and the record printed \"duplicate tap ignored\". I'd ship the record, then add a client idempotency key with an expiry and make sure entries leave the set after assignment.",
            },
            {
              question: "A security review finds card numbers in application logs. How do you fix it, and what else do you check?",
              answer:
                "Find the `toString` that prints them, often a record's generated one or Lombok's, and mask it, or better, wrap the number in a type whose `toString` masks it, or tokenize so the backend never holds it. Then deal with the logs that already contain it.\n\nIn `PaymentLogging`, the masked `toString` fixed the log lines and the `List` printing, but Jackson's JSON still had the full number, because serialization uses accessors. So I'd also check API responses, events sent to other services and exception messages.",
            },
            {
              question: "In the production scenario, a nearby-drivers cache's hit rate keeps dropping while its size grows. What's your first suspicion?",
              answer:
                "Mutable keys: key objects changed after insertion, stranding entries that can't be found or evicted. I'd check whether the key class hashes mutable fields and whether code reuses key objects, like a `Location` updated in place on GPS pings.\n\nIn `NearbyDriverCache` the mutable version made 3 geo queries and 3 entries instead of 2, and its key set printed the same New Town location twice. An immutable `GridCell` record computed per request made 2 queries and kept 2 entries.",
            },
            {
              question: "A JPA entity added to a Set before saving can't be found in that Set after the commit. Explain and fix it.",
              answer:
                "Its `hashCode` comes from the generated id, which was `null` when it went into the set and a number after the flush, so the set looks under the wrong hash. It's the mutable-key problem with the database doing the mutating.\n\n`EntityEquality` printed `contains(first) after save false` for the id-based version, which had also merged two unsaved orders into one. A business key, or id-based `equals` with a constant `hashCode`, printed `true` and kept both orders.",
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
            "Write a `Customer` class with `final String name` and `final String phone` and no overrides. Print `new Customer(\"Asha\", \"98300 43210\")`, then compare two such customers with `==` and `equals`.",
            "Override only `equals`, with `@Override` and the `instanceof` pattern. Add two equal customers to a `HashSet` and print its size.",
            "Add `hashCode` with `Objects.hash(name, phone)` and print the size again. Then make `name` non-final, add a customer to a new `HashSet`, change its name, and print `contains`, `remove` and `size`.",
            "Turn `Customer` into a record and print one, plus an `equals` comparison of two equal customers. Then override `toString` in the record so the phone shows only its last two digits.",
            "Write `record Route(int[] stops)` and compare two routes built from `new int[] {1, 2}`. Change the component to `List<Integer>` and compare again.",
            "Give a `Cloneable` class a `List<String> items` field holding \"Laptop\" and a `clone()` that calls `super.clone()`. Add \"Mouse\" to the clone's list and print the original's list. Bonus: run `javap -c -p` on the record from step 4 before overriding `toString`, and run a program printing `System.identityHashCode(new Object())` with `-XX:+UnlockExperimentalVMOptions -XX:hashCode=2`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints something like `Customer@2a139a55` (the hex varies), then `false` for both comparisons. Step 2 gives size 2, and step 3 size 1, then `false`, `false` and `1` for the mutated customer. Step 4 prints `Customer[name=Asha, phone=98300 43210]` and `true`, then `Customer[name=Asha, phone=********10]`. Step 5 prints `false`, then `true` with the `List`. Step 6 prints `[Laptop, Mouse]`: the original changed. In the bonus, `javap` shows three `invokedynamic` instructions, and with `hashCode=2` every identity hash is `1`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `OBJECT     root of every class and array; 11 methods + private wait0
FINAL      getClass  notify  notifyAll  wait (x3)
OVERRIDE   equals  hashCode  toString   (clone, finalize: don't)

==         same object?        equals   same value? (default: ==)
EQUALS     reflexive symmetric transitive consistent, null -> false
           this == o, instanceof pattern, fields, Double.compare
HASHCODE   equal objects -> equal hashes; collisions are legal
           same fields as equals, none that change inside a set
           HashMap: bucket -> stored hash -> == -> equals
IDENTITY   lazy, kept in the mark word, not the address
           JDK 21: bits 8-38   JDK 25: from bit 11
TOSTRING   Class@hexhash by default; ids yes, secrets never
RECORDS    indy -> ObjectMethods.bootstrap; arrays by reference
ENTITIES   business key, or id equals + constant hashCode
CLONE      Cloneable marker, protected, shallow -> copy constructor
FINALIZE   for removal (JEP 421) -> try-with-resources, Cleaner
WAIT       own the monitor or IllegalMonitorStateException;
           loop on the condition; prefer java.util.concurrent`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "If someone says the default `hashCode` is the memory address: on HotSpot it's a generated number, written into the object header the first time it's needed and stable after that.",
            "`equals` and `hashCode` are one decision: the same immutable fields, `@Override` on both, and for values a record that makes the decision for me.",
            "Several fixes here leaned on small helper types: the `Cleaner`'s static `Release` class, records declared inside other classes. The next lesson, Nested and Inner Classes, is about exactly those: static nested, inner, local and anonymous classes, and why an inner class quietly holds a reference to its outer object.",
          ],
        },
      ],
    },
  ],
};
