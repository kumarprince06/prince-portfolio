import type { Lesson } from "../types";

export const encapsulation: Lesson = {
  slug: "encapsulation",
  date: "2026-11-02",
  title: "Encapsulation",
  description:
    "What encapsulation really is in Java, an object's state kept together with its invariants and changed only through operations that enforce them, from access modifiers, JavaBeans getters and setters, immutability, defensive copies and records down to how javac, the JVM and nestmates enforce private, what reflection can still do on JDK 21, and a Jackson password leak and a wallet race fixed in code.",
  tags: ["Core Java", "OOP", "Encapsulation", "Immutability", "Records"],
  sections: [
    {
      title: "What Encapsulation Is",
      blocks: [
        {
          type: "paragraph",
          text: "The Static Keyword lesson split state into what belongs to the class and what belongs to each object, and the Constructors lesson made sure an object starts life valid. Neither of them stops another class from reaching into a finished object and setting a field to nonsense. That's the job of encapsulation.",
        },
        {
          type: "paragraph",
          text: "The definition I use: **encapsulation** means keeping an object's state together with the rules about that state (its **invariants**), and letting outside code change the state only through operations that enforce those rules. A bank account's balance never goes negative, not because every caller remembers to check, but because the only code that can write the balance is the account's own `debit`, and `debit` checks.",
        },
        {
          type: "paragraph",
          text: "What it is not: \"make the fields private and generate a getter and a setter for each\". That turns `account.balance = x` into `account.setBalance(x)`, which is the same hole with more typing. I reproduce exactly that hole below, with real output. Private fields are the tool; the invariants are the point.",
        },
        {
          type: "paragraph",
          text: "The lesson goes from the rules (access modifiers, invariants, getters and setters, immutability, records) down to the machinery: how `javac` and the JVM both enforce `private`, how nested classes are let in, and what reflection can still do on JDK 21. It ends with two production-style bugs rebuilt in code: an API that leaks password hashes through getters, and a wallet that goes negative under concurrent payments.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "The idea is older than object-oriented languages. In 1972 David Parnas published \"On the Criteria To Be Used in Decomposing Systems into Modules\", arguing that each module should hide a design decision that's likely to change, such as a data format or an algorithm, behind an interface, so the decision can change without touching the rest of the system. He called it **information hiding**. The price example later in this lesson, where rupees stored as a `double` become paise stored as a `long` without any caller noticing, is that argument in thirty lines of Java.",
        },
        {
          type: "paragraph",
          text: "Simula 67 introduced classes and objects, but as far as I can tell from its histories, the original definition let any code holding a reference read or assign an object's attributes, and the `hidden` and `protected` specifiers came in later revisions. Smalltalk went to the other extreme: an object's instance variables are visible only to that object's own methods, and the only way in is to send it a message. C++ settled on the vocabulary Java borrowed: `public`, `private` and `protected` sections in a class, checked by the compiler, plus `friend` for exceptions.",
        },
        {
          type: "paragraph",
          text: "Java 1.0 (1996) took the C++ keywords, dropped `friend`, and added a fourth level, package-private, which is what a member gets when no modifier is written. The design choice that matters most for this lesson is that access is checked twice: by `javac`, and again by the JVM when it links a class, because the JVM can't assume a class file came from a compiler that followed the rules. The Internal Working section shows the JVM's check firing on a class that compiled without complaint.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["JDK 1.1 (1997)", "Inner classes; the JavaBeans spec and `java.beans`", "Nested classes needed synthetic `access$` bridge methods to reach private members; `getX` / `isX` / `setX` became the convention frameworks rely on"],
            ["Java 1.2 (1998)", "Collections framework with `Collections.unmodifiableList`; `AccessibleObject.setAccessible`", "Read-only views of collections; reflection that can switch access checks off"],
            ["Java 9 (2017)", "Module system (JEP 261), most JDK internals encapsulated (JEP 260), `List.of` (JEP 269)", "Whole packages can be hidden; reflective access to JDK internals started printing warnings"],
            ["Java 10 (2018)", "`List.copyOf`, `Set.copyOf`, `Map.copyOf`", "One call for an immutable defensive copy"],
            ["Java 11 (2018)", "Nest-based access control (JEP 181)", "Nested classes reach each other's private members without bridges"],
            ["Java 16 (2021)", "Records final (JEP 395, previewed in 14 and 15); illegal access denied by default (JEP 396)", "Immutable data carriers in one line; `--illegal-access=deny` became the default"],
            ["Java 17 (2021)", "JDK internals strongly encapsulated (JEP 403)", "`--illegal-access` removed; only `--add-opens` opens an internal package"],
            ["Java 25 (2025)", "Flexible constructor bodies (JEP 513)", "A constructor can validate its arguments before `super(...)`; the Constructors lesson covers it"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The picture I use is a bank branch with a counter.",
        },
        {
          type: "list",
          items: [
            "The **vault** behind the counter is the private state: the balance. Customers never walk into it.",
            "The **counter window** is the set of public methods. A deposit slip is `credit`, a withdrawal slip is `debit`, a passbook update is `balance()`. The slip is the parameter list, the receipt is the return value.",
            "The **teller's rules** are the invariants and preconditions: no withdrawal beyond the balance, no slip with a zero or negative amount, and an account's currency never changes. They're checked at the window, every time, for every customer.",
            "A customer doesn't ask \"how much is in the vault?\" and then reach in and take it. They hand over a slip and the teller decides. That's **tell, don't ask**.",
            "The bank can move from cash drawers to a computerised ledger without changing a single slip. That's changing the internal representation without breaking callers.",
            "The **guard at the vault door** is the JVM's own access check. Someone who slips past the front desk (`javac`) with an old, forged slip (a class file compiled against an older version) is still stopped at the door, with an `IllegalAccessError`.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down. In a bank, each account feels like it has its own vault. In Java, privacy is per **class**, not per object: code inside `BankAccount` can open any other `BankAccount`'s vault, which the Examples section shows with a transfer method. And the building has a master key. Reflection with `setAccessible(true)` opens my own classes' private fields without going through the counter at all, and only the JDK's own vaults have a lock that key doesn't fit unless the JVM was started with `--add-opens`. So `private` is a design boundary that the compiler and JVM enforce, not a security boundary against code already running in the same JVM.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Two parts: bundling and hiding",
        },
        {
          type: "list",
          items: [
            "**Bundling**: the state and the operations on it live in one class. The rule \"a debit may not exceed the balance\" sits next to the balance, not in the six services that debit accounts.",
            "**Hiding**: access modifiers stop outside code from touching the state directly, so the bundled operations are the only way in. Without hiding, bundling is a suggestion.",
          ],
        },
        {
          type: "image",
          src: "/images/java/encapsulation-boundary.svg",
          alt: "A BankAccount object drawn as a dashed boundary. Inside, private state: long balance 18000 paise and String currency INR, final, with no setters. On the boundary, three public operations, balance(), credit(amount) and debit(amount), each passing through a check (read only; amount > 0; amount > 0 and amount <= balance) before reaching the state. A Checkout class outside calls the three operations. A rejected debit of 25000 throws IllegalStateException and leaves the balance at 18000. Code outside that writes account.balance = -500 directly is stopped by javac with 'balance has private access in BankAccount', and a stale class file is stopped by the JVM with IllegalAccessError.",
          caption: "Outside code only gets the three operations. A direct write is stopped twice: by javac, and by the JVM if an old class file gets past the compiler. The next section shows both with real runs.",
        },
        {
          type: "heading",
          text: "Invariants, preconditions and postconditions",
        },
        {
          type: "paragraph",
          text: "An **invariant** is a condition that holds for every object of the class whenever none of its methods is running: after the constructor finishes, and before and after every public call. Inside a method it can be broken for a moment, as long as it's restored before the method returns or throws. A **precondition** is what a single call requires from its caller, and a **postcondition** is what the call promises in return. For the bank account in this lesson:",
        },
        {
          type: "table",
          headers: ["Rule", "Kind", "Where it's enforced"],
          rows: [
            ["Balance is never negative", "Class invariant", "`debit` checks before it writes"],
            ["Currency is fixed when the account is opened", "Class invariant", "`private final` field, no setter"],
            ["An amount must be positive", "Precondition of `credit` and `debit`", "`requirePositive`, which throws `IllegalArgumentException`"],
            ["A successful debit lowers the balance by exactly `amount`", "Postcondition of `debit`", "The single write at the end of `debit`"],
          ],
        },
        {
          type: "paragraph",
          text: "Encapsulation is what makes those rules checkable at all. If the balance is private, the only code that can break an invariant is in one file, and I can read all of it.",
        },
        {
          type: "heading",
          text: "Access modifiers in one table",
        },
        {
          type: "table",
          headers: ["Modifier", "Same class (and its nest)", "Same package", "Subclass in another package", "Anywhere else"],
          rows: [
            ["`private`", "Yes", "No", "No", "No"],
            ["none (package-private)", "Yes", "Yes", "No", "No"],
            ["`protected`", "Yes", "Yes", "Yes, through its own type", "No"],
            ["`public`", "Yes", "Yes", "Yes", "Yes"],
          ],
        },
        {
          type: "list",
          items: [
            "Members (fields, methods, constructors, nested types) can use all four. A top-level class can only be `public` or package-private. Local variables take no access modifier at all.",
            "\"Its nest\" means the top-level class plus every class nested inside it. A nested class can use the private members of its enclosing class and the other way round, which the Internal Working section takes apart.",
            "`protected` is wider than it sounds: it includes the whole package, not just subclasses. Common Mistakes has the real output.",
            "With modules, `public` only reaches other modules if the package is exported. That, the full `protected` rule, and packages in general belong to the Packages and Access Modifiers lesson in Phase 6, later in this track.",
          ],
        },
        {
          type: "heading",
          text: "Private belongs to the class, not the object",
        },
        {
          type: "paragraph",
          text: "Java's access check asks one question: is the code doing the access written inside the class (or nest) that declares the member? It never asks which object is being accessed. So `BankAccount.transferTo(BankAccount other, long amount)` can write `other.balance` directly. That's deliberate: it's what lets `equals`, `compareTo` and copy constructors read the other object's private fields. Smalltalk is the contrast, where privacy is per object and even another instance of the same class has to send a message.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The JVM checks access again",
        },
        {
          type: "paragraph",
          text: "To prove the JVM doesn't just trust `javac`, I compiled a caller against a class with a public field, then changed the field to private and recompiled only that class. This is what happens when a library changes underneath code that was compiled against an older version.",
        },
        {
          type: "code",
          language: "java",
          title: "Invoice.java (v1)",
          code: `public class Invoice {
    public long paise;                        // v1: anyone can read and write it

    public Invoice(long paise) {
        this.paise = paise;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Billing.java",
          code: `public class Billing {
    public static void main(String[] args) {
        Invoice invoice = new Invoice(24_500);
        System.out.println("Billing " + invoice.paise + " paise");
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Invoice.java (v2)",
          code: `public class Invoice {
    private long paise;                       // v2: the library made it private

    public Invoice(long paise) {
        this.paise = paise;
    }

    public long paise() {
        return paise;
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Invoice.java Billing.java && java Billing     # with v1
# replace Invoice.java with v2, recompile only Invoice
javac Invoice.java && java Billing
# now recompile Billing too
javac Billing.java`,
        },
        {
          type: "output",
          text: `Billing 24500 paise

Exception in thread "main" java.lang.IllegalAccessError: class Billing tried to access private field Invoice.paise (Billing and Invoice are in unnamed module of loader 'app')
	at Billing.main(Billing.java:4)

Billing.java:4: error: paise has private access in Invoice
        System.out.println("Billing " + invoice.paise + " paise");
                                               ^
1 error`,
        },
        {
          type: "list",
          items: [
            "Access modifiers survive compilation as bits in each member's `access_flags`. `javap -v -p Invoice` printed `flags: (0x0001) ACC_PUBLIC` for v1's field and `flags: (0x0002) ACC_PRIVATE` for v2's. On a class with one field at each level I got `0x0004` for `protected` and `0x0000`, no flag at all, for package-private.",
            "`Billing.class` contains `getfield #20 // Field Invoice.paise:J`, a symbolic reference: a class name, a field name and a descriptor. It records nothing about whether the field is public. The flags live only in `Invoice.class`.",
            "The first time that `getfield` runs, the JVM **resolves** the reference: it finds `paise` in the loaded `Invoice` and checks the access flags against the class doing the access (JVM specification, section 5.4.4). `ACC_PRIVATE` plus a different class means `IllegalAccessError`, a `LinkageError`, thrown at the exact line that touched the field.",
            "The message is precise enough to debug from: who tried, which member, and which module and class loader both classes came from.",
            "Once `Billing` is recompiled, `javac` refuses it with the familiar compile error. The runtime error only exists because two class files were compiled at different times, which is why it usually shows up after a dependency upgrade.",
          ],
        },
        {
          type: "heading",
          text: "Nestmates: how a nested class reaches a private field",
        },
        {
          type: "paragraph",
          text: "A nested class compiles to its own class file, `Order$Receipt.class`. To the JVM, that's a different class from `Order`, so how does it read `Order`'s private field without an `IllegalAccessError`?",
        },
        {
          type: "code",
          language: "java",
          title: "Order.java",
          code: `public class Order {
    private long totalPaise;

    Order(long totalPaise) {
        this.totalPaise = totalPaise;
    }

    static class Receipt {
        static String line(Order order) {
            return "Total: " + order.totalPaise + " paise";  // Order's private field
        }
    }

    public static void main(String[] args) {
        System.out.println(Receipt.line(new Order(24_500)));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Order.java && java Order
javap -p Order
javap -v Order | grep -A1 "^NestMembers"
javap -v 'Order$Receipt' | grep "^NestHost"
javap -c 'Order$Receipt' | grep totalPaise`,
        },
        {
          type: "output",
          text: `Total: 24500 paise
Compiled from "Order.java"
public class Order {
  private long totalPaise;
  Order(long);
  public static void main(java.lang.String[]);
}
NestMembers:
  Order$Receipt
NestHost: class Order
       1: getfield      #7                  // Field Order.totalPaise:J`,
        },
        {
          type: "paragraph",
          text: "On JDK 21, `Order.class` carries a `NestMembers` attribute listing `Order$Receipt`, and `Order$Receipt.class` carries a `NestHost` attribute pointing back. `Receipt` reads the field with a plain `getfield`, and the JVM's access check allows it because both classes claim the same nest and the host confirms it. Reflection sees the same thing: `Class.forName(\"Order$Receipt\").getNestHost()` printed `Order` for me, and `isNestmateOf` printed `true`. Compiling the same source for Java 8 shows how it used to work:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 8 Order.java
javap -p Order
javap -c 'Order$Receipt' | grep access`,
        },
        {
          type: "output",
          text: `warning: [options] source value 8 is obsolete and will be removed in a future release
warning: [options] target value 8 is obsolete and will be removed in a future release
warning: [options] To suppress warnings about obsolete options, use -Xlint:-options.
3 warnings
Compiled from "Order.java"
public class Order {
  private long totalPaise;
  Order(long);
  public static void main(java.lang.String[]);
  static long access$000(Order);
}
      13: invokestatic  #16                 // Method Order.access$000:(LOrder;)J`,
        },
        {
          type: "list",
          items: [
            "Before Java 11, the JVM had no idea `Receipt` was nested in `Order`, so `javac` faked it: it added a synthetic static method `access$000` to `Order` that returns the field, and compiled `order.totalPaise` in `Receipt` into a call to it.",
            "`javap -v -p` gives the bridge's flags as `(0x1008) ACC_STATIC, ACC_SYNTHETIC`, with no `ACC_PRIVATE`, and its body is just `aload_0`, `getfield totalPaise`, `lreturn`. It was package-private, so **any** class in the package could call `Order.access$000` from bytecode and read the private field. JEP 181 calls these \"accessibility-broadening bridge methods\", and removing them was one of its goals.",
            "Nestmates (Java 11) moved the knowledge into the class files themselves: no bridges, no widened access, one less method call. The three warnings `javac` printed for `--release 8` are a reminder of how old the bridge model is.",
            "The consequence for encapsulation: the real unit of privacy is the **nest**. In every demo in this lesson where `main` sits in an outer class and the domain class is nested inside it, `main` could legally touch the private fields. I don't let it, and in the demos where it matters (`Checkout`, `Billing`) the classes are separate top-level classes.",
          ],
        },
        {
          type: "heading",
          text: "Reflection and strong encapsulation",
        },
        {
          type: "paragraph",
          text: "Reflection can ask for a private member by name. Whether it can then use it depends on whose member it is:",
        },
        {
          type: "code",
          language: "java",
          title: "ReflectionPeek.java",
          code: `import java.lang.reflect.Field;
import java.util.Arrays;

class BankAccount {
    private long balancePaise = 50_000;
}

public class ReflectionPeek {
    public static void main(String[] args) throws Exception {
        BankAccount account = new BankAccount();
        Field balance = BankAccount.class.getDeclaredField("balancePaise");
        try {
            balance.getLong(account);                      // no setAccessible yet
        } catch (IllegalAccessException e) {
            System.out.println(e.getMessage());
        }

        balance.setAccessible(true);                       // my own class: allowed
        balance.setLong(account, -100_000);                // no invariant check runs
        System.out.println("balance via reflection: " + balance.getLong(account));

        Field value = String.class.getDeclaredField("value");
        try {
            value.setAccessible(true);                     // a JDK internal
            System.out.println("String.value of Pune: " + Arrays.toString((byte[]) value.get("Pune")));
        } catch (RuntimeException e) {
            System.out.println(e.getClass().getName() + ": " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java ReflectionPeek
java --add-opens java.base/java.lang=ALL-UNNAMED ReflectionPeek`,
        },
        {
          type: "output",
          text: `class ReflectionPeek cannot access a member of class BankAccount with modifiers "private"
balance via reflection: -100000
java.lang.reflect.InaccessibleObjectException: Unable to make field private final byte[] java.lang.String.value accessible: module java.base does not "opens java.lang" to unnamed module @266474c2

# --add-opens java.base/java.lang=ALL-UNNAMED
class ReflectionPeek cannot access a member of class BankAccount with modifiers "private"
balance via reflection: -100000
String.value of Pune: [80, 117, 110, 101]`,
        },
        {
          type: "list",
          items: [
            "Reflection does its own access check at run time. Without `setAccessible(true)`, reading the private field threw `IllegalAccessException`, the checked reflection cousin of `IllegalAccessError`.",
            "On my own class, `setAccessible(true)` simply worked, and I set the balance to minus a thousand rupees without `debit` ever running. Within my own code, `private` keeps honest code honest; it doesn't stop code that decides to use reflection.",
            "On `String.value`, it threw `InaccessibleObjectException`. `java.base` doesn't open `java.lang` to my code, so since JDK 16 (JEP 396) the answer is no by default, and since JDK 17 (JEP 403) there's no global switch: running with `--illegal-access=permit` only added `OpenJDK 64-Bit Server VM warning: Ignoring option --illegal-access=permit; support was removed in 17.0` and then failed the same way. The `@266474c2` is the unnamed module's identity hash code and differs between machines and runs.",
            "`--add-opens java.base/java.lang=ALL-UNNAMED` opens that one package to classpath code, and then the internals are mine: the Latin-1 bytes of `\"Pune\"`. This is the flag older libraries document when they need deep reflection on JDK classes. JDK 25 gave me the same three results.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "final is final for records, not for ordinary classes",
          text: "I repeated the trick on two `private final long paise` fields. On an ordinary `final class`, `setAccessible(true)` followed by `setLong(price, 1)` changed the value. On a record component it threw `IllegalAccessException: Can not set final long field PriceRecord.paise to (long)1`, even though `setAccessible(true)` had succeeded. That's the documented rule in `Field.set`: a final field is writable through reflection only if it's non-static and its class is neither a hidden class nor a record. JDK 21 and JDK 25 behaved the same.",
        },
        {
          type: "heading",
          text: "What javac generates for a record",
        },
        {
          type: "code",
          language: "java",
          title: "PriceQuote.java",
          code: `public record PriceQuote(String sku, long paise) {
    public PriceQuote {
        if (paise <= 0) {
            throw new IllegalArgumentException("price must be positive: " + paise);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac PriceQuote.java && javap -p PriceQuote
javap -c -p PriceQuote      # trimmed to toString
javap -v -p PriceQuote      # trimmed to the record's bootstrap method`,
        },
        {
          type: "output",
          text: `Compiled from "PriceQuote.java"
public final class PriceQuote extends java.lang.Record {
  private final java.lang.String sku;
  private final long paise;
  public PriceQuote(java.lang.String, long);
  public final java.lang.String toString();
  public final int hashCode();
  public final boolean equals(java.lang.Object);
  public java.lang.String sku();
  public long paise();
}

  public final java.lang.String toString();
    Code:
       0: aload_0
       1: invokedynamic #26,  0             // InvokeDynamic #1:toString:(LPriceQuote;)Ljava/lang/String;
       6: areturn

BootstrapMethods:
  ...
  1: #65 REF_invokeStatic java/lang/runtime/ObjectMethods.bootstrap:(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/TypeDescriptor;Ljava/lang/Class;Ljava/lang/String;[Ljava/lang/invoke/MethodHandle;)Ljava/lang/Object;
    Method arguments:
      #17 PriceQuote
      #55 sku;paise
      #57 REF_getField PriceQuote.sku:Ljava/lang/String;
      #58 REF_getField PriceQuote.paise:J`,
        },
        {
          type: "list",
          items: [
            "A record is an ordinary class with a fixed shape: `final`, extending `java.lang.Record`, one `private final` field per component, and a public accessor per component named after it (`paise()`, not `getPaise()`).",
            "In the full `javap -c` listing of the constructor, the compact constructor's check runs first (offsets 4 to 23: `lcmp`, `ifgt`, and the `athrow`), and the two `putfield` instructions `javac` adds come **after** it, at offsets 26 and 31. A record that fails validation never has its fields written.",
            "`toString`, `equals` and `hashCode` are one `invokedynamic` each, bootstrapped by `java.lang.runtime.ObjectMethods` with the component names and a direct field getter (`REF_getField`) per component. They read the fields, not the accessors, so overriding an accessor doesn't change equality. The Object Class Methods lesson covers what these methods promise.",
            "`javap -v` also shows a `Record` attribute listing the components, which is how reflection's `getRecordComponents()` and serialization frameworks learn the record's shape.",
          ],
        },
      ],
    },
    {
      title: "Invariants: A Bank Account That Protects Itself",
      blocks: [
        {
          type: "paragraph",
          text: "This is the bank account I'd expect from a codebase where encapsulation was done by the IDE: private fields, then \"Generate getters and setters\". Four pieces of code use it, written at different times by different people. All amounts are in paise (100 paise to the rupee):",
        },
        {
          type: "code",
          language: "java",
          title: "OpenAccount.java",
          code: `// Private fields, a getter and a setter for each: looks encapsulated
class BeanAccount {
    private String currency = "INR";
    private long balance;                                  // paise

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public long getBalance() { return balance; }
    public void setBalance(long balance) { this.balance = balance; }
}

public class OpenAccount {
    public static void main(String[] args) {
        BeanAccount asha = new BeanAccount();
        asha.setBalance(50_000);                           // Rs. 500 deposit

        // Card payment: asks, then decides. The rule lives in this caller.
        long payment = 32_000;
        if (asha.getBalance() >= payment) {
            asha.setBalance(asha.getBalance() - payment);
        }

        // Annual fee job, written later by someone else: never asks
        long annualFee = 25_000;
        asha.setBalance(asha.getBalance() - annualFee);

        // Cashback job: a "credit" read from a bad config value
        long cashback = -5_000;
        asha.setBalance(asha.getBalance() + cashback);

        // A display "fix"
        asha.setCurrency("USD");

        System.out.println("balance: " + asha.getBalance() + " paise, currency: " + asha.getCurrency());
    }
}`,
        },
        {
          type: "output",
          text: `balance: -12000 paise, currency: USD`,
        },
        {
          type: "list",
          items: [
            "The card payment checked the balance. The annual-fee job didn't, and the cashback job \"credited\" a negative number. Every line compiles, and by the getters-and-setters definition the class is encapsulated.",
            "The rule \"never negative\" exists in exactly one caller, as an `if`. Nothing enforces it, and the result is an account owing Rs. 120 that no code path will ever notice.",
            "The currency was supposed to be fixed for the account's whole life. One setter call changed it, and every amount in the account now means something else.",
          ],
        },
        {
          type: "paragraph",
          text: "The encapsulated version moves the rules into the class and deletes the setters. `BankAccount` and `Checkout` are separate top-level classes here, so `Checkout` really can't touch the fields:",
        },
        {
          type: "code",
          language: "java",
          title: "Checkout.java",
          code: `import java.util.Objects;

class BankAccount {
    private final String currency;                         // invariant: fixed at creation
    private long balance;                                  // invariant: never negative (paise)

    public BankAccount(String currency) {
        this.currency = Objects.requireNonNull(currency, "currency");
    }

    public void credit(long amount) {
        requirePositive(amount);                           // precondition
        balance = Math.addExact(balance, amount);          // overflow throws, never wraps
    }

    public void debit(long amount) {
        requirePositive(amount);
        if (amount > balance) {
            throw new IllegalStateException("insufficient balance: has " + balance + ", needs " + amount);
        }
        balance -= amount;
    }

    public long balance() { return balance; }

    public String currency() { return currency; }

    private static void requirePositive(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("amount must be positive: " + amount);
        }
    }
}

public class Checkout {
    public static void main(String[] args) {
        BankAccount asha = new BankAccount("INR");
        asha.credit(50_000);                               // Rs. 500 deposit
        asha.debit(32_000);                                // card payment: tell, don't ask

        try {
            asha.debit(25_000);                            // annual fee: more than she has
        } catch (IllegalStateException e) {
            System.out.println(e);
        }
        try {
            asha.credit(-5_000);                           // the bad cashback config again
        } catch (IllegalArgumentException e) {
            System.out.println(e);
        }
        System.out.println("balance: " + asha.balance() + " paise, currency: " + asha.currency());
    }
}`,
        },
        {
          type: "output",
          text: `java.lang.IllegalStateException: insufficient balance: has 18000, needs 25000
java.lang.IllegalArgumentException: amount must be positive: -5000
balance: 18000 paise, currency: INR`,
        },
        {
          type: "list",
          items: [
            "`debit(25_000)` with 18,000 in the account threw before writing anything, so the balance stayed at 18000. The bad cashback failed its precondition. Both problems surfaced at the moment they happened, with a message that says what was wrong.",
            "I use the split the JDK itself uses: `IllegalArgumentException` when the argument is bad no matter what (a negative amount), `IllegalStateException` when the argument is fine but the object's current state doesn't allow it (not enough balance).",
            "There's no `setCurrency`, and the field is `final`, so the currency invariant isn't checked anywhere. It can't be broken, which is better than checked.",
            "`Math.addExact` throws `ArithmeticException` on `long` overflow instead of silently wrapping to a huge negative number. Unlikely for a bank account, but free.",
          ],
        },
        {
          type: "heading",
          text: "Auditing every write with javap",
        },
        {
          type: "paragraph",
          text: "Because `balance` is private, the only `putfield` instructions that can ever succeed against it live in `BankAccount.class` itself. `javap` lists every one of them:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p BankAccount | grep -E "^  [a-z].*\\(|putfield"`,
        },
        {
          type: "output",
          text: `  public BankAccount(java.lang.String);
      14: putfield      #17                 // Field currency:Ljava/lang/String;
  public void credit(long);
      13: putfield      #26                 // Field balance:J
  public void debit(long);
      38: putfield      #26                 // Field balance:J
  public long balance();
  public java.lang.String currency();
  private static void requirePositive(long);`,
        },
        {
          type: "paragraph",
          text: "Three writes in the whole program: the currency once, in the constructor, and the balance once each in `credit` and `debit`. In `debit`, the comparison is at offsets 9 and 10 (`lcmp`, `ifle`), the `athrow` at 30, and the single `putfield` at 38, after the check. Reflection, JNI and nestmates are the only ways around that list, and `BankAccount` has no nested classes. That's what \"the invariant is enforced in one place\" means in bytecode.",
        },
        {
          type: "heading",
          text: "Tell, don't ask",
        },
        {
          type: "paragraph",
          text: "Compare the two card payments. `OpenAccount` asks for the balance, decides outside the account, and writes the result back with a setter. `Checkout` says `debit(32_000)` and lets the account decide. The asking version has a second bug hiding in it: between the `getBalance()` and the `setBalance(...)`, another thread can debit the same account. The Encapsulation in Production section runs exactly that race, on a wallet.",
        },
      ],
    },
    {
      title: "Getters, Setters and the JavaBeans Convention",
      blocks: [
        {
          type: "paragraph",
          text: "Getters and setters aren't a language feature. They're a naming convention from the JavaBeans specification (1997), which defines a **property** by its methods, not its fields: if a class has `getName()`, it has a readable property `name`, whether or not a field called `name` exists. Tools and frameworks discover properties by looking for those method names with reflection.",
        },
        {
          type: "table",
          headers: ["Property", "Read method", "Write method"],
          rows: [
            ["`String name`", "`getName()`", "`setName(String)`"],
            ["`boolean available`", "`isAvailable()` (`getAvailable()` also allowed)", "`setAvailable(boolean)`"],
            ["`Boolean verified` (wrapper)", "`getVerified()`; `isVerified()` is not a bean getter", "`setVerified(Boolean)`"],
            ["read-only `rating`", "`getRating()`", "none"],
          ],
        },
        {
          type: "paragraph",
          text: "To see what a framework sees, I asked both `java.beans.Introspector` and Jackson about the same class:",
        },
        {
          type: "code",
          language: "java",
          title: "BeanProperties.java",
          code: `import com.fasterxml.jackson.databind.ObjectMapper;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;

public class BeanProperties {
    public static class EmployeeBean {
        private String name = "Asha";
        private boolean available = true;
        private Boolean verified = true;
        private double rating = 4.8;
        private String phone = "+91-98300-00000";

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public boolean isAvailable() { return available; }
        public void setAvailable(boolean available) { this.available = available; }
        public Boolean isVerified() { return verified; }       // Boolean wrapper with "is"
        public double getRating() { return rating; }           // getter only: read-only
        public String getDisplayName() { return "Employee " + name; } // no field behind it
    }

    public static void main(String[] args) throws Exception {
        for (PropertyDescriptor p : Introspector.getBeanInfo(EmployeeBean.class, Object.class)
                                                .getPropertyDescriptors()) {
            System.out.printf("%-12s read=%-17s write=%s%n", p.getName(),
                p.getReadMethod() == null ? "-" : p.getReadMethod().getName() + "()",
                p.getWriteMethod() == null ? "-" : p.getWriteMethod().getName() + "(...)");
        }
        System.out.println(new ObjectMapper().writeValueAsString(new EmployeeBean()));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# Maven: com.fasterxml.jackson.core:jackson-databind:2.21.7 (brings jackson-core and jackson-annotations)
javac -cp "$JACKSON" BeanProperties.java && java -cp "$JACKSON:." BeanProperties`,
        },
        {
          type: "output",
          text: `available    read=isAvailable()     write=setAvailable(...)
displayName  read=getDisplayName()  write=-
name         read=getName()         write=setName(...)
rating       read=getRating()       write=-
{"name":"Asha","available":true,"verified":true,"rating":4.8,"displayName":"Employee Asha"}`,
        },
        {
          type: "list",
          items: [
            "Every property came from a method name. `displayName` has no field at all, and `phone` has a field but no getter, so to both tools it doesn't exist.",
            "`rating` has a getter and no setter, so it's read-only to anything that goes through the bean API.",
            "`verified` is missing from the Introspector's list: its `isVerified()` returns `Boolean`, and the spec only allows `is` for primitive `boolean`. Jackson 2.21.7 serialized it anyway. Frameworks don't agree on that edge case, which is reason enough to write `getVerified()` for wrapper types.",
            "The JSON followed the getters, not the fields. That's the whole story behind the password-hash leak in the production section.",
          ],
        },
        {
          type: "heading",
          text: "Why frameworks want them",
        },
        {
          type: "list",
          items: [
            "**Jackson** serializes through getters and deserializes through setters, fields or a constructor. Records use their canonical constructor: Jackson 2.21.7 read `{\"name\":\"Asha\",\"rating\":4.8}` straight into a record for me, with no annotations.",
            "**JPA** has two modes. With mapping annotations on fields (field access), Hibernate reads and writes the fields directly and needs no setters at all. With annotations on getters (property access), it goes through getters and setters. Either way the spec asks for a public or protected no-arg constructor and a class that isn't `final`, which is also why a record can't be an entity.",
            "**Spring** binds request parameters (`@ModelAttribute`) and configuration through setters by default, using the same JavaBeans machinery (`BeanWrapper`, `DataBinder`), and can bind through constructors too.",
            "Template engines and expression languages turn `employee.name` into a call to `getName()`.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "Setters are an entry point for request data",
          text: "Spring's `DataBinder`, which Spring MVC uses for `@ModelAttribute`, writes every request parameter that matches a writable property. I bound `name=Ravi&verified=true` with Spring 6.2.11's real `DataBinder` into an employee profile form. With a `setVerified` generated \"for completeness\", the employee came out `verified=true`. Without the setter, `verified` was read-only and the binder skipped it (silently, because `ignoreUnknownFields` defaults to `true`; with it set to `false` the bind threw `NotWritablePropertyException: ... Bean property 'verified' is not writable`). That's the **mass assignment** bug, and the clean fix is to bind onto a request record that only has the fields a user may send.",
        },
        {
          type: "heading",
          text: "When a setter is harmful",
        },
        {
          type: "list",
          items: [
            "When the field has an invariant (a balance, an order status). The setter is a way around the rule. Replace it with operations named after the business action: `debit`, `ship`, `suspend`.",
            "When fields must change together. Separate setters for a product's `totalStars` and `reviewCount` let a caller update one and not the other; one `addReview(stars)` method that validates and updates both keeps the average honest.",
            "When the field is identity or fixed for life: an `id`, a `currency`, a `createdAt`. Make it `final` and set it in the constructor.",
            "When the setter only exists for a framework. Most have an alternative: field access in JPA, constructor and record binding in Jackson and Spring.",
          ],
        },
        {
          type: "paragraph",
          text: "Setters are fine for genuinely free-form data with no rules, such as a display name or a notification preference, and even then a setter is a method, so it can normalise and validate. The Syntax at a Glance program has a `setName` that strips spaces.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Lombok's @Data on an entity",
          text: "`@Data` generates a getter for every field, a setter for every non-final field, a required-arguments constructor, `toString`, and `equals`/`hashCode` over all fields. On a JPA entity that's a setter for the `id` and for every column with a rule, an `equals`/`hashCode` that changes when the entity is modified or gets its generated id (so it gets lost inside a `HashSet`), and a `toString` that walks lazy associations and, with a bidirectional relationship, recurses until `StackOverflowError`. I'd use `@Getter` and write the operations by hand.",
        },
      ],
    },
    {
      title: "Changing the Representation Without Breaking Callers",
      blocks: [
        {
          type: "paragraph",
          text: "The strongest argument for encapsulation is the one Parnas made: it lets a decision change without touching the code that depends on it. Money in a `double` is a bad decision (the Data Types lesson showed `0.1 + 0.2` printing `0.30000000000000004`), so here's a price class that made it, with every field private and a clean API:",
        },
        {
          type: "code",
          language: "java",
          title: "Price.java (v1)",
          code: `public final class Price {
    private final double rupees;                 // v1: rupees as a double

    public Price(double rupees) {
        if (rupees < 0) {
            throw new IllegalArgumentException("price cannot be negative: " + rupees);
        }
        this.rupees = rupees;
    }

    public Price plus(Price other) {
        return new Price(rupees + other.rupees);
    }

    public Price times(double multiplier) {      // markups, tax
        return new Price(rupees * multiplier);
    }

    public double rupees() {
        return rupees;
    }

    @Override
    public String toString() {
        return "Rs. " + rupees;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "PriceSlip.java",
          code: `public class PriceSlip {
    public static void main(String[] args) {
        Price total = new Price(89.90).plus(new Price(10.20));   // item + delivery fee
        System.out.println("total:        " + total);
        System.out.println("equals 100.10? " + (total.rupees() == 100.10));

        Price marked = new Price(145.20).times(1.5);
        System.out.println("markup 1.5x:  " + marked);

        Price cashback = new Price(0);
        for (int i = 0; i < 10; i++) {
            cashback = cashback.plus(new Price(0.10));
        }
        System.out.println("10 cashbacks: " + cashback);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac Price.java PriceSlip.java && java PriceSlip && md5sum PriceSlip.class",
        },
        {
          type: "output",
          text: `total:        Rs. 100.10000000000001
equals 100.10? false
markup 1.5x:  Rs. 217.79999999999998
10 cashbacks: Rs. 0.9999999999999999
c3cf0f3b39fad3d17291cd8a023e0bb1  PriceSlip.class`,
        },
        {
          type: "paragraph",
          text: "Every line is wrong in a way a customer would screenshot. Because the field is private, the fix is entirely inside `Price`: store whole paise in a `long`, convert once at the boundary, and keep every public signature exactly as it was.",
        },
        {
          type: "code",
          language: "java",
          title: "Price.java (v2)",
          code: `public final class Price {
    private final long paise;                    // v2: whole paise, exact

    public Price(double rupees) {                // same public constructor as v1
        this(Math.round(rupees * 100));          // rounding happens once, here
    }

    private Price(long paise) {                  // private, and it takes paise
        if (paise < 0) {
            throw new IllegalArgumentException("price cannot be negative: " + paise / 100.0);
        }
        this.paise = paise;
    }

    public Price plus(Price other) {
        return new Price(Math.addExact(paise, other.paise));
    }

    public Price times(double multiplier) {
        return new Price(Math.round(paise * multiplier));
    }

    public double rupees() {                     // same method, now derived
        return paise / 100.0;
    }

    public long paise() {                        // new in v2, for new callers
        return paise;
    }

    @Override
    public String toString() {
        return String.format("Rs. %d.%02d", paise / 100, paise % 100);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# replace Price.java with v2 and recompile ONLY Price
javac Price.java && java PriceSlip && md5sum PriceSlip.class`,
        },
        {
          type: "output",
          text: `total:        Rs. 100.10
equals 100.10? true
markup 1.5x:  Rs. 217.80
10 cashbacks: Rs. 1.00
c3cf0f3b39fad3d17291cd8a023e0bb1  PriceSlip.class`,
        },
        {
          type: "list",
          items: [
            "`PriceSlip.class` wasn't recompiled, as the identical checksum shows, and its output is now right. Nothing in it referred to the field, only to `Price.<init>(D)V`, `plus`, `times` and `rupees()D` (plus `toString`, which string concatenation calls at run time), and all of those still exist with the same descriptors.",
            "The private constructor takes paise and the public one takes rupees. The overloads can't be confused from outside, because `PriceSlip` can't see the private one; recompiling `PriceSlip` against v2 still picked `Price(double)` and gave the same output.",
            "v2 adds `paise()` for new code. Adding a method is binary compatible; removing one or changing its signature isn't (JLS chapter 13). Once callers have moved to `paise()`, `rupees()` can be deprecated on its own schedule.",
            "The rounding policy now lives in two lines of one file. If finance wants banker's rounding, nothing else changes.",
            "Had the original been `public double rupees;`, this fix would mean editing every caller, including the ones in other teams' services that I can't even see.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "Round, don't cast",
          text: "v2's constructor uses `Math.round`, not `(long)`. When I printed `4.35 * 100` it came out as `434.99999999999994`, so a cast truncates it to `434` paise and quietly loses one, while `Math.round` gives `435`. With the conversion in one constructor, that's one line to get right instead of one per caller.",
        },
      ],
    },
    {
      title: "Immutability",
      blocks: [
        {
          type: "paragraph",
          text: "The strongest form of encapsulation is an object whose state can't change at all after construction. Its invariants are checked once, in the constructor, and then hold forever, so it can be cached, shared between threads and used as a map key without copying. `String`, `Integer`, `BigDecimal`, `LocalDate` and every list from `List.of` are immutable.",
        },
        {
          type: "heading",
          text: "The rules",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "No methods that modify state. A \"change\" returns a new object, like `Price.plus` or `BigDecimal.add`.",
            "Make the class `final`, or give it only private constructors and static factories, so no subclass can add mutable state or override an accessor.",
            "Make every field `private` and `final`.",
            "Copy mutable inputs in the constructor, and never hand out a reference to a mutable field: copy it on the way out, or store an immutable version in the first place.",
            "Don't let `this` escape during construction (the Constructors lesson has the details).",
          ],
        },
        {
          type: "paragraph",
          text: "These are essentially Effective Java's rules for minimizing mutability, and a record (two sections down) follows most of them automatically. The rest of this section is about the ways an object that looks immutable isn't.",
        },
        {
          type: "heading",
          text: "A final reference is not an immutable object",
        },
        {
          type: "code",
          language: "java",
          title: "FinalIsNotImmutable.java",
          code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class FinalIsNotImmutable {
    static final List<String> OPEN_BRANCHES = new ArrayList<>(List.of("Salt Lake", "Howrah"));

    public static void main(String[] args) {
        final int[] prices = {120, 340};
        prices[0] = 0;                             // fine: the array itself isn't final

        OPEN_BRANCHES.add("Park Street");          // fine: the list isn't final either
        OPEN_BRANCHES.remove("Howrah");

        System.out.println(Arrays.toString(prices) + " " + OPEN_BRANCHES);
    }
}`,
        },
        {
          type: "output",
          text: `[0, 340] [Salt Lake, Park Street]`,
        },
        {
          type: "paragraph",
          text: "`final` applies to the variable: it can't be pointed at a different object. Adding `OPEN_BRANCHES = new ArrayList<>();` to `main` is the only thing it stops, with `cannot assign a value to static final variable OPEN_BRANCHES`. The object on the other end of the reference is as mutable as its class allows. An immutable object needs `final` fields **and** field types that are immutable or never exposed.",
        },
        {
          type: "heading",
          text: "Unmodifiable view or copy",
        },
        {
          type: "paragraph",
          text: "When a class holds a mutable collection, its getter has three choices. I put all three on one team class:",
        },
        {
          type: "code",
          language: "java",
          title: "TeamRoster.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class TeamRoster {
    static class Team {
        private final List<String> members = new ArrayList<>();

        void join(String member) {
            members.add(member);
        }

        List<String> membersLeaky()    { return members; }                                // the field itself
        List<String> membersView()     { return Collections.unmodifiableList(members); }  // read-only window
        List<String> membersSnapshot() { return List.copyOf(members); }                   // frozen copy
    }

    public static void main(String[] args) {
        Team backend = new Team();
        backend.join("Asha");
        backend.join("Ravi");

        List<String> view = backend.membersView();
        List<String> snapshot = backend.membersSnapshot();

        backend.membersLeaky().clear();            // some caller "just tidying up"
        backend.join("Imran");

        System.out.println("view:     " + view);
        System.out.println("snapshot: " + snapshot);
        try {
            view.add("Meera");
        } catch (UnsupportedOperationException e) {
            System.out.println("view.add: " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `view:     [Imran]
snapshot: [Asha, Ravi]
view.add: java.lang.UnsupportedOperationException`,
        },
        {
          type: "diagram",
          text: `                 Team (private field)
                ┌───────────────────────┐
 membersLeaky() │ members: ArrayList    │◄── caller holds the field:
 ──────────────►│ [Imran]               │    clear() wiped Asha, Ravi
                └───────────────────────┘
                           ▲
 membersView()  ┌──────────┴────────────┐
 ──────────────►│ unmodifiable wrapper  │    reads go through to the
                │ (no copy, 24 bytes)   │    live list, writes throw
                └───────────────────────┘
 membersSnapshot()
                ┌───────────────────────┐
 ──────────────►│ List.copyOf: own data │    frozen at call time:
                │ [Asha, Ravi]          │    [Asha, Ravi] forever
                └───────────────────────┘`,
          caption: "Leaky, view, snapshot: three getters, three different contracts. The 24 bytes are measured in the Performance section.",
        },
        {
          type: "list",
          items: [
            "`membersLeaky()` handed out the field, and one `clear()` from outside emptied the team. That's not a read; it's a write the class never agreed to.",
            "The view refused `add`, but it still changed under its holder: it showed `[Imran]`, a list its holder never touched. `Collections.unmodifiableList` is a read-only **window** onto the live list. Unmodifiable through this reference doesn't mean unchanging.",
            "The snapshot kept `[Asha, Ravi]`. `List.copyOf` copied the elements into a new immutable list, so later changes to the team don't reach it.",
            "Which one is right depends on the contract: a snapshot when callers need a stable result (my default), a view when they need to see live changes and won't iterate while another thread writes. The Collections Utilities and Immutable Collections lesson covers both types in depth.",
          ],
        },
        {
          type: "paragraph",
          text: "Arrays are the worst case, because an array is always mutable: a class that stores one has to copy it on the way in and on the way out. The leaderboard program in the Examples section was changed twice from outside despite being `final` with a `private final` field.",
        },
        {
          type: "paragraph",
          text: "Rule 2 is the least obvious one. A class with only `private final` fields can still be subclassed, and the subclass can override the accessors with something mutable; the last program in the Examples section does exactly that to a price. Declaring the class `final` turns the subclass into a compile error, `cannot inherit from final Price`.",
        },
      ],
    },
    {
      title: "Records: Immutable Data With Less Code",
      blocks: [
        {
          type: "paragraph",
          text: "A **record** (previewed in Java 14 and 15, final in Java 16 with JEP 395) is the immutable-class recipe written for me by the compiler: a `final` class, a `private final` field per component, a public accessor per component, a canonical constructor, and `equals`, `hashCode` and `toString` based on the components. The Internal Working section showed the bytecode. What matters for encapsulation is where my own code goes:",
        },
        {
          type: "code",
          language: "java",
          title: "RecordRules.java",
          code: `public class RecordRules {
    record Review(String productId, int stars) {
        Review {                                           // compact canonical constructor
            if (stars < 1 || stars > 5) {
                throw new IllegalArgumentException("stars must be 1 to 5, got " + stars);
            }
            productId = productId.strip();                 // reassigns the parameter, not the field
        }
    }

    record Branch(String code, String city) {
        Branch(String code) {                              // any other constructor must delegate
            this(code, "Kolkata");
        }
    }

    public static void main(String[] args) {
        Review review = new Review("  SKU-42 ", 5);
        System.out.println(review + " -> productId()=" + review.productId() + ", stars()=" + review.stars());
        System.out.println("equal to a fresh one: " + review.equals(new Review("SKU-42", 5)));
        System.out.println(new Branch("SL-1"));
        try {
            new Review("SKU-7", 6);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Review[productId=SKU-42, stars=5] -> productId()=SKU-42, stars()=5
equal to a fresh one: true
Branch[code=SL-1, city=Kolkata]
stars must be 1 to 5, got 6`,
        },
        {
          type: "list",
          items: [
            "The compact constructor (`Review { ... }`, no parameter list) is where validation and normalisation go. It runs before the fields are assigned, and assigning to the parameter (`productId = productId.strip()`) changes what gets stored. The stored id is `SKU-42` without the spaces.",
            "Accessors are named after the components: `productId()` and `stars()`, not `getProductId()`. Jackson and most current frameworks understand them; very old JavaBeans-only tools don't.",
            "Any extra constructor has to start with `this(...)`, so every path into a record goes through the canonical constructor and its checks. That's the record version of \"invariants are established in one place\".",
            "Equality is by value: a freshly built `Review(\"SKU-42\", 5)` is `equal` to the normalised one.",
          ],
        },
        {
          type: "heading",
          text: "Shallow immutability",
        },
        {
          type: "paragraph",
          text: "A record's fields are `final`, but a `final` field holding a mutable list is the problem from two headings ago. A course with a list of students:",
        },
        {
          type: "code",
          language: "java",
          title: "RecordShallow.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class RecordShallow {
    record Course(String code, List<String> students) {}

    record SafeCourse(String code, List<String> students) {
        SafeCourse {
            students = List.copyOf(students);              // copy in; also rejects null students
        }
    }

    public static void main(String[] args) {
        List<String> students = new ArrayList<>(List.of("Asha", "Ravi"));
        Course course = new Course("CS-101", students);
        SafeCourse safe = new SafeCourse("CS-101", students);

        students.add("Meera");                             // the caller's list changes later
        course.students().remove("Asha");                  // a reader edits through the accessor

        System.out.println(course);
        System.out.println(safe);
        try {
            safe.students().add("Kabir");
        } catch (UnsupportedOperationException e) {
            System.out.println("safe.students().add -> " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `Course[code=CS-101, students=[Ravi, Meera]]
SafeCourse[code=CS-101, students=[Asha, Ravi]]
safe.students().add -> java.lang.UnsupportedOperationException`,
        },
        {
          type: "list",
          items: [
            "The plain record stored the caller's `ArrayList` as is. It picked up `Meera` from the caller and lost `Asha` through its own accessor. Its `hashCode` changed with it, which breaks it as a `HashMap` key (the Object Class Methods lesson shows that failure).",
            "One line in the compact constructor, `students = List.copyOf(students)`, made the record deeply immutable for a list of strings. The accessor then returns an unmodifiable list, so no copy is needed on the way out.",
            "For an array component, the fix is a `clone()` in the compact constructor **and** an overridden accessor that returns a clone, and `equals` still compares the arrays by reference. I avoid array components in records.",
          ],
        },
        {
          type: "heading",
          text: "What a record can't do",
        },
        {
          type: "code",
          language: "java",
          title: "SalePrice.java",
          code: `class BasePrice {
    long paise;
}

public record SalePrice(long paise, int discountPercent) extends BasePrice {}`,
        },
        {
          type: "output",
          text: `SalePrice.java:5: error: '{' expected
public record SalePrice(long paise, int discountPercent) extends BasePrice {}
                                                        ^
1 error`,
        },
        {
          type: "code",
          language: "java",
          title: "CachedQuote.java",
          code: `public record CachedQuote(String sku, long paise) {
    private int views;                                     // per-object counter
}`,
        },
        {
          type: "output",
          text: `CachedQuote.java:2: error: field declaration must be static
    private int views;                                     // per-object counter
                ^
  (consider replacing field with record component)
1 error`,
        },
        {
          type: "list",
          items: [
            "No `extends`: a record already extends `java.lang.Record`, and the parser doesn't even accept the clause, hence the plain `'{' expected`. A record can `implement` interfaces.",
            "No instance fields beyond the components, and no instance initializer blocks. All of a record's state is in its header, which is exactly what makes `equals` and `toString` complete. Static fields and methods are allowed.",
            "A record is implicitly `final`, so the subclass trick in the Examples section (`FinalClassMatters`) can't happen to it.",
            "Its fields can't be assigned outside the canonical constructor: a `reset()` method doing `this.paise = 0` fails with `cannot assign a value to final variable paise` (Common Mistakes has it).",
          ],
        },
      ],
    },
    {
      title: "Encapsulation and Thread Safety (a Preview)",
      blocks: [
        {
          type: "paragraph",
          text: "Thread safety is a property of how state is accessed, and encapsulation decides where state can be accessed from. If `balance` is a public field, every caller in the codebase would have to agree on a lock, and one forgetful caller breaks it. If `balance` is private and only `credit` and `debit` touch it, making those two methods `synchronized` makes the whole class thread-safe, because there's no third path to the field.",
        },
        {
          type: "list",
          items: [
            "The check and the write happen together inside the class, so no caller can split them. The production section's `synchronized tryDebit` does exactly that and kills the check-then-act race it reproduces.",
            "Immutable objects need no locks at all. The Java Memory Model also gives `final` fields a special guarantee (JLS 17.5): once the constructor finishes, any thread that sees the object sees the final fields' values, as long as `this` didn't escape during construction.",
            "The Static Keyword lesson made the same point from the other side: a `public static` mutable field is shared by every thread and guarded by nobody. Locks, `volatile`, atomics and the memory model belong to the Multithreading and Concurrency track, later.",
          ],
        },
      ],
    },
    {
      title: "Encapsulation, Data Hiding and Abstraction",
      blocks: [
        {
          type: "table",
          headers: ["Idea", "Question it answers", "Main tools in Java"],
          rows: [
            ["Data hiding", "Who can touch this field?", "`private` and the other access modifiers"],
            ["Encapsulation", "How does this object keep its state valid?", "Private state plus operations that enforce invariants; immutability; defensive copies"],
            ["Abstraction", "What does a caller need to know to use this?", "Interfaces and abstract classes that expose what something does, not how"],
          ],
        },
        {
          type: "paragraph",
          text: "Data hiding is a mechanism, and encapsulation is what I use it for. `BeanAccount` hides its data and isn't encapsulated, because its setters let any caller break the rules. Abstraction works at a different level: a `PaymentProcessor` interface lets an order service charge a card without knowing which provider is behind it, while encapsulation keeps each provider's internal state consistent. They usually appear together, which is why they get confused. The Abstraction lesson has the full comparison with its own examples.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `asha.debit(25_000)` from `Checkout`, with 18,000 paise in the account, through compile time and run time:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**javac, name lookup.** For `asha.debit(25_000)`, `javac` finds `debit(long)` in `BankAccount` and checks that `Checkout` may access it. It's `public`, so it compiles. Had I written `asha.balance -= 25_000`, compilation would stop here with `balance has private access in BankAccount`.",
            "**javac, code generation.** The call becomes `invokevirtual #22 // Method BankAccount.debit:(J)V`. The class file records the class, name and descriptor, but not the access level, which lives only in `BankAccount.class`.",
            "**Class loading.** When `Checkout.main` runs, `BankAccount` is loaded on first use (the `new BankAccount(...)`) from whatever `BankAccount.class` is on the classpath at run time, which isn't necessarily the one `javac` saw.",
            "**Resolution and the JVM's access check.** The first time the `invokevirtual` executes, the JVM resolves `BankAccount.debit:(J)V` and checks its flags against `Checkout`. If a newer `BankAccount.class` had made `debit` private, this is where `IllegalAccessError` would be thrown, exactly as it was for `Billing`.",
            "**The call.** A frame is pushed for `debit`: `this` in slot 0, `amount` (a `long`) in slots 1 and 2.",
            "**The precondition.** `requirePositive(25_000)` passes.",
            "**The invariant check.** `lcmp` compares 25,000 with 18,000 and the branch at offset 10 doesn't skip, so the method builds an `IllegalStateException` with the message `insufficient balance: has 18000, needs 25000` and executes `athrow`. The `putfield` at offset 38 never runs.",
            "**Unwinding.** `debit`'s frame is discarded, the JVM finds the matching `catch (IllegalStateException e)` in `main`, and the message is printed. The account object on the heap is exactly as it was: balance 18000, currency INR.",
          ],
        },
        {
          type: "paragraph",
          text: "Steps 1 and 4 are the two access checks from the boundary diagram. Step 7 is the part encapsulation adds on top: the rule itself, sitting between the caller and the only write.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "EncapsulationTour.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class EncapsulationTour {
    static class BankAccount {                             // 1. state plus the rules about it
        private final String currency;                     // private final: fixed at creation
        private long balance;                              // private: only BankAccount writes it

        BankAccount(String currency) { this.currency = currency; }

        public void credit(long paise) {                   // public operation that enforces a rule
            requirePositive(paise);
            balance += paise;
        }
        public long balance() { return balance; }          // read access, no write access
        protected String label() { return currency + " account"; }              // subclasses + package
        void audit() { System.out.println(label() + " holds " + balance); }     // package-private

        private static void requirePositive(long paise) {  // private helper, not API
            if (paise <= 0) throw new IllegalArgumentException("amount must be positive: " + paise);
        }
    }

    static class EmployeeProfile {                         // 2. JavaBeans: getX, isX, setX
        private String name;
        private boolean available;
        public String getName() { return name; }
        public void setName(String name) { this.name = name.strip(); }   // a setter can normalise
        public boolean isAvailable() { return available; }
        public void setAvailable(boolean available) { this.available = available; }
    }

    static final class ReadingList {                       // 3. immutable: final, copy in
        private final List<String> books;
        ReadingList(List<String> books) { this.books = List.copyOf(books); }
        List<String> books() { return books; }
    }

    record Quote(String sku, long paise) {                 // 4. a record, validated
        Quote {
            if (paise <= 0) throw new IllegalArgumentException("paise must be positive: " + paise);
        }
    }

    public static void main(String[] args) {
        BankAccount account = new BankAccount("INR");
        account.credit(50_000);
        account.audit();

        EmployeeProfile profile = new EmployeeProfile();
        profile.setName("  Ravi ");
        profile.setAvailable(true);
        System.out.println(profile.getName() + " available=" + profile.isAvailable());

        List<String> books = new ArrayList<>(List.of("Clean Code", "Effective Java"));
        ReadingList list = new ReadingList(books);
        books.clear();                                     // doesn't reach the ReadingList
        System.out.println(list.books());

        Quote quote = new Quote("SKU-7", 18_500);
        System.out.println(quote + " " + quote.paise());
    }
}`,
        },
        {
          type: "output",
          text: `INR account holds 50000
Ravi available=true
[Clean Code, Effective Java]
Quote[sku=SKU-7, paise=18500] 18500`,
        },
        {
          type: "paragraph",
          text: "All four access levels appear on `BankAccount`'s members, and all four styles of class appear in one file: a guarded mutable class, a JavaBean, a hand-written immutable class and a record. `main` never touches a private field, although as a member of the same nest it legally could.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Privacy is per class: a transfer between accounts",
        },
        {
          type: "paragraph",
          text: "Asha pays Ravi back for a shared dinner. The transfer method writes the other account's private balance directly, which is legal because the code is inside `BankAccount`:",
        },
        {
          type: "code",
          language: "java",
          title: "TransferDemo.java",
          code: `public class TransferDemo {
    static class BankAccount {
        private final String owner;
        private long balance;                              // paise, never negative

        BankAccount(String owner, long balance) { this.owner = owner; this.balance = balance; }

        void transferTo(BankAccount other, long amount) {
            if (amount <= 0 || amount > balance) {
                throw new IllegalArgumentException(owner + " cannot send " + amount + " (balance " + balance + ")");
            }
            balance -= amount;
            other.balance += amount;                       // another BankAccount's private field
        }

        @Override
        public String toString() { return owner + "=" + balance; }
    }

    public static void main(String[] args) {
        BankAccount asha = new BankAccount("Asha", 50_000);
        BankAccount ravi = new BankAccount("Ravi", 10_000);

        asha.transferTo(ravi, 20_000);                     // Asha pays Ravi back for a shared dinner
        System.out.println(asha + " " + ravi);
        try {
            ravi.transferTo(asha, 90_000);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
        System.out.println(asha + " " + ravi);
    }
}`,
        },
        {
          type: "output",
          text: `Asha=30000 Ravi=30000
Ravi cannot send 90000 (balance 30000)
Asha=30000 Ravi=30000`,
        },
        {
          type: "paragraph",
          text: "Both sides of the transfer change inside one method of the class that owns the rule, so the total money in the system is conserved by construction. The failed transfer threw before either balance moved. If `transferTo` lived in some `TransferService` instead, it would need setters on `BankAccount`, and the setters would be open to everyone.",
        },
        {
          type: "heading",
          text: "Tell, don't ask: an order's lifecycle",
        },
        {
          type: "paragraph",
          text: "An order moves through states, and only some moves are legal. With a public `setStatus`, any service could jump an order from `PLACED` to `DELIVERED` without it ever being paid for or shipped. Encapsulated, the legal moves are the methods:",
        },
        {
          type: "diagram",
          text: `         pay(amount)         ship(courier)          deliver()
 PLACED ────────────► PAID ────────────► SHIPPED ─────────► DELIVERED
   │                   │
   │ cancel()          │ cancel()
   ▼                   ▼
 CANCELLED ◄───────────┘

 any other call  ──►  IllegalStateException, state unchanged`,
          caption: "The state machine is the invariant. Each arrow is one method, and each method checks where it starts from.",
        },
        {
          type: "code",
          language: "java",
          title: "OrderLifecycle.java",
          code: `public class OrderLifecycle {
    enum Status { PLACED, PAID, SHIPPED, DELIVERED, CANCELLED }

    static class Order {
        private final String id;
        private Status status = Status.PLACED;
        private long amount;                               // set once, by pay (paise)
        private String courier;                            // set once, by ship

        Order(String id) { this.id = id; }

        void pay(long amount) {
            require(Status.PLACED, "pay for");
            if (amount <= 0) throw new IllegalArgumentException(id + ": amount must be positive, got " + amount);
            this.amount = amount;
            status = Status.PAID;
        }

        void ship(String courier) {
            require(Status.PAID, "ship");
            this.courier = courier;
            status = Status.SHIPPED;
        }

        void deliver() {
            require(Status.SHIPPED, "deliver");
            status = Status.DELIVERED;
        }

        void cancel() {
            if (status != Status.PLACED && status != Status.PAID) {
                throw new IllegalStateException(id + ": cannot cancel an order that is " + status);
            }
            status = Status.CANCELLED;
        }

        private void require(Status expected, String action) {
            if (status != expected) {
                throw new IllegalStateException(id + ": cannot " + action + " an order that is " + status);
            }
        }

        @Override
        public String toString() {
            return id + " " + status + (amount == 0 ? "" : ", paid " + amount)
                    + (courier == null ? "" : ", shipped by " + courier);
        }
    }

    public static void main(String[] args) {
        Order order = new Order("O-7");
        order.pay(31_000);
        order.ship("Ravi");
        attempt(order::cancel);                            // too late to cancel
        order.deliver();
        System.out.println(order);
        attempt(() -> order.ship("Imran"));                // can't ship a delivered order again

        Order other = new Order("O-8");
        attempt(other::deliver);                           // never paid or shipped
        other.cancel();
        System.out.println(other);
    }

    static void attempt(Runnable action) {
        try { action.run(); } catch (RuntimeException e) { System.out.println("rejected: " + e.getMessage()); }
    }
}`,
        },
        {
          type: "output",
          text: `rejected: O-7: cannot cancel an order that is SHIPPED
O-7 DELIVERED, paid 31000, shipped by Ravi
rejected: O-7: cannot ship an order that is DELIVERED
rejected: O-8: cannot deliver an order that is PLACED
O-8 CANCELLED`,
        },
        {
          type: "paragraph",
          text: "Three illegal moves were rejected with messages that name the order and its state, and none of them changed anything. The invariants that come with the state machine (a delivered order was paid a positive amount and has a courier; a cancelled order never shipped) hold because `amount` and `courier` are only written by the methods that also move the status. Callers don't ask \"what's the status?\" and decide; they tell the order what happened, and the order decides whether that's possible.",
        },
        {
          type: "heading",
          text: "Arrays leak both ways: a leaderboard",
        },
        {
          type: "paragraph",
          text: "A leaderboard holds its top three names in an array. The first version is `final`, with a `private final` field and no setters; the second also copies at both ends:",
        },
        {
          type: "code",
          language: "java",
          title: "ArrayLeak.java",
          code: `import java.util.Arrays;

public class ArrayLeak {
    static final class Leaderboard {
        private final String[] top;

        Leaderboard(String... top) { this.top = top; }               // keeps the caller's array
        String[] top() { return top; }                               // hands out its own array
    }

    static final class SafeLeaderboard {
        private final String[] top;

        SafeLeaderboard(String... top) { this.top = top.clone(); }   // copy in
        String[] top() { return top.clone(); }                       // copy out
    }

    public static void main(String[] args) {
        String[] input = {"Asha", "Ravi", "Meera"};
        Leaderboard leaky = new Leaderboard(input);
        SafeLeaderboard safe = new SafeLeaderboard(input);

        input[1] = "Imran";                        // the caller reuses its array
        leaky.top()[0] = "Kabir";                  // another caller edits what it got back
        safe.top()[0] = "Kabir";

        System.out.println("leaky: " + Arrays.toString(leaky.top()));
        System.out.println("safe:  " + Arrays.toString(safe.top()));
    }
}`,
        },
        {
          type: "output",
          text: `leaky: [Kabir, Imran, Meera]
safe:  [Asha, Ravi, Meera]`,
        },
        {
          type: "paragraph",
          text: "`Leaderboard` is `final` with a `private final` field and no setters, and it was still changed twice from outside: once through the array it was given, once through the array it returned. An array is always mutable, so a class that holds one has to copy on the way in and on the way out. `clone()` is enough for an array of immutable elements like strings; for an array of mutable objects it's only a shallow copy. Usually I'd rather store a `List.copyOf(Arrays.asList(top))` and avoid the question.",
        },
        {
          type: "heading",
          text: "Why an immutable class has to be final",
        },
        {
          type: "paragraph",
          text: "Checkout code receives a `Price`, shows the customer the amount, and charges later. `Price` has a `private final` field and no setters, but it isn't `final`:",
        },
        {
          type: "code",
          language: "java",
          title: "FinalClassMatters.java",
          code: `public class FinalClassMatters {
    static class Price {                                   // meant to be immutable, but not final
        private final long paise;

        Price(long paise) { this.paise = paise; }

        long paise() { return paise; }
    }

    static class SneakyPrice extends Price {
        long current;

        SneakyPrice(long paise) {
            super(paise);
            current = paise;
        }

        @Override
        long paise() { return current; }                   // replaces the "immutable" getter
    }

    public static void main(String[] args) {
        SneakyPrice sneaky = new SneakyPrice(24_500);
        Price quoted = sneaky;                             // checkout code only sees a Price
        long shownToCustomer = quoted.paise();

        sneaky.current = 99_900;
        System.out.println("shown " + shownToCustomer + ", charged " + quoted.paise());
    }
}`,
        },
        {
          type: "output",
          text: `shown 24500, charged 99900`,
        },
        {
          type: "paragraph",
          text: "`Price`'s own field never changed, but code holding a `Price` reference can't know whether the object is a `Price` or a subclass that overrides `paise()`. The customer was shown 24500 and charged 99900. Declaring it `static final class Price` makes the subclass a compile error, `cannot inherit from final Price`, which I got when I tried. Records are implicitly final, so they can't be attacked this way. The Inheritance lesson covers `final` and `sealed` classes properly.",
        },
      ],
    },
    {
      title: "When to Encapsulate (and How Much)",
      blocks: [
        {
          type: "paragraph",
          text: "Private fields aren't a decision; every field starts private. The decisions are how much behaviour goes behind them, whether the object changes at all, and what a getter hands out. This is how I choose. The capstone lesson, When to Use What in Java OOP, puts these choices next to the ones from the rest of this phase.",
        },
        {
          type: "table",
          headers: ["What I'm modelling", "What I write", "Why"],
          rows: [
            ["A value: price quote, money, product code, rating", "A `record` (or a `final` class) validated in its constructor", "Immutable, shareable, checked once"],
            ["Something with a lifecycle and rules: bank account, order, coupon campaign", "A class with private fields and operations named after business actions; no setters for fields with rules", "Every rule lives in one class"],
            ["An API request or response body", "A `record` DTO, separate from the entity", "It lists exactly what crosses the boundary"],
            ["A JPA entity", "Private fields, a protected no-arg constructor, getters, behaviour methods; setters only for free-form fields", "JPA needs a mutable, non-final class; behaviour keeps it honest"],
            ["A form or config object with no rules", "Getters and setters, or a record if the framework binds constructors", "Nothing to protect, so ceremony buys nothing"],
            ["A helper used inside one class", "A private nested record or small class", "No outside callers to defend against"],
            ["A collection returned by a getter", "`List.copyOf` snapshot by default; an unmodifiable view only when callers need live data; never the field", "`TeamRoster` showed all three"],
            ["A constant", "`public static final` of an immutable type (`String`, `List.of`, a record), never an array", "`SupportedCities` in Common Mistakes"],
            ["The access level of a new member", "`private`; package-private for collaborators and tests; `protected` only for a designed extension point; `public` for the API", "Widening later is easy; narrowing breaks callers"],
          ],
        },
        {
          type: "diagram",
          text: `Does the state change after construction?
│
├─ no ──► record, validated in the compact constructor
│         (or a final class with private final fields)
│
└─ yes ─► are there rules about how it may change?
          │
          ├─ yes ─► private fields + named operations
          │         (debit, ship, deliver), no setters
          │         for those fields
          │
          └─ no ──► getters and setters are fine
                    (forms, config, simple DTOs)

Will instances be shared (cache, static field, map key, threads)?
          └─► make them immutable, or make one class own every
              access and synchronise there`,
          caption: "The decision I actually make for each new class.",
        },
        {
          type: "list",
          items: [
            "Start private and without setters. When a caller asks for a setter, ask what it's trying to do; usually it needs an operation (`suspend(reason)`) rather than a field write (`setStatus(\"SUSPENDED\")`).",
            "If two fields must change together, neither gets a setter.",
            "If a getter would return something mutable, return a copy or an unmodifiable type, and copy mutable inputs in the constructor.",
            "If an object will be shared, make it immutable. If it can't be, make it the only code that touches its state.",
            "Don't encapsulate for ceremony. A private nested record used by one method doesn't need defensive copies, and a test fixture doesn't need an invariant check.",
          ],
        },
        {
          type: "heading",
          text: "A wrong choice and a right choice",
        },
        {
          type: "paragraph",
          text: "A price-quote cache keyed by product. The wrong version caches a mutable bean; the right one caches a record. Asha has a 50% coupon, Ravi has none:",
        },
        {
          type: "code",
          language: "java",
          title: "QuoteCache.java",
          code: `import java.util.HashMap;
import java.util.Map;

public class QuoteCache {
    // Wrong choice: a mutable bean, cached and shared by every request
    static class MutableQuote {
        private final String sku;
        private long paise;

        MutableQuote(String sku, long paise) {
            this.sku = sku;
            this.paise = paise;
        }

        long getPaise() { return paise; }

        void setPaise(long paise) { this.paise = paise; }
    }

    // Right choice: an immutable value; a discount produces a new quote
    record Quote(String sku, long paise) {
        Quote {
            if (paise <= 0) {
                throw new IllegalArgumentException("paise must be positive: " + paise);
            }
        }

        Quote withDiscount(int percent) {
            return new Quote(sku, paise - paise * percent / 100);
        }
    }

    static final Map<String, MutableQuote> MUTABLE_CACHE = new HashMap<>();
    static final Map<String, Quote> CACHE = new HashMap<>();

    public static void main(String[] args) {
        MUTABLE_CACHE.put("SKU-7", new MutableQuote("SKU-7", 20_000));
        CACHE.put("SKU-7", new Quote("SKU-7", 20_000));

        // Request 1: Asha has a 50% coupon
        MutableQuote forAsha = MUTABLE_CACHE.get("SKU-7");
        forAsha.setPaise(forAsha.getPaise() / 2);          // "only for this customer"
        Quote ashaQuote = CACHE.get("SKU-7").withDiscount(50);
        System.out.println("Asha pays:              " + ashaQuote.paise());

        // Request 2: Ravi, no coupon
        System.out.println("mutable quote for Ravi: " + MUTABLE_CACHE.get("SKU-7").getPaise());
        System.out.println("record quote for Ravi:  " + CACHE.get("SKU-7").paise());
    }
}`,
        },
        {
          type: "output",
          text: `Asha pays:              10000
mutable quote for Ravi: 10000
record quote for Ravi:  20000`,
        },
        {
          type: "list",
          items: [
            "**Wrong:** the coupon code called a setter on the object the cache hands to everyone, so Ravi, and every customer after him buying SKU-7, got Asha's discount. Nothing threw; the cache simply held a different price.",
            "**Right:** `withDiscount` returned a new `Quote` for Asha, and the cached one couldn't change because nothing can change a record's fields. The reason is the rule from the decision flow: anything that goes into a cache, a static field or a map key should be immutable.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Reaching for a private field from another class",
        },
        {
          type: "code",
          language: "java",
          title: "PrivateAccess.java",
          code: `class BankAccount {
    private long balance;
}

public class PrivateAccess {
    public static void main(String[] args) {
        BankAccount account = new BankAccount();
        account.balance = -500;
    }
}`,
        },
        {
          type: "output",
          text: `PrivateAccess.java:8: error: balance has private access in BankAccount
        account.balance = -500;
               ^
1 error`,
        },
        {
          type: "paragraph",
          text: "That's the compiler doing its job. The mistake is the usual \"fix\": adding `setBalance` so the line compiles. The right fix is asking which operation the caller meant, a `debit` or a `credit`, and calling that.",
        },
        {
          type: "heading",
          text: "Validating in the constructor but not in the setter",
        },
        {
          type: "code",
          language: "java",
          title: "RatingSetter.java",
          code: `public class RatingSetter {
    static class Product {
        private final String name;
        private double rating;

        Product(String name, double rating) {
            if (rating < 1.0 || rating > 5.0) {
                throw new IllegalArgumentException("rating out of range: " + rating);
            }
            this.name = name;
            this.rating = rating;
        }

        public double getRating() { return rating; }

        public void setRating(double rating) { this.rating = rating; }   // generated, no check
    }

    public static void main(String[] args) {
        try {
            new Product("Kettle", 7.5);
        } catch (IllegalArgumentException e) {
            System.out.println("constructor: " + e.getMessage());
        }
        Product kettle = new Product("Kettle", 4.6);
        kettle.setRating(7.5);                             // the same bad value, through the side door
        System.out.println("setter: rating is now " + kettle.getRating());
    }
}`,
        },
        {
          type: "output",
          text: `constructor: rating out of range: 7.5
setter: rating is now 7.5`,
        },
        {
          type: "paragraph",
          text: "Every path that writes a field has to enforce the same rule. Either the setter validates too, or, better here, there's no setter at all: the rating is derived from individual reviews, added through an `addReview(stars)` method that rejects anything outside 1 to 5.",
        },
        {
          type: "heading",
          text: "Arrays in public static final constants",
        },
        {
          type: "code",
          language: "java",
          title: "SupportedCities.java",
          code: `import java.util.Arrays;
import java.util.List;

public class SupportedCities {
    static class Config {
        public static final String[] CITIES = {"Kolkata", "Pune"};         // looks constant
        public static final List<String> CITY_LIST = List.of("Kolkata", "Pune");
    }

    public static void main(String[] args) {
        Config.CITIES[1] = "Mumbai";                       // compiles, and every reader sees it
        System.out.println(Arrays.toString(Config.CITIES));
        try {
            Config.CITY_LIST.set(1, "Mumbai");
        } catch (UnsupportedOperationException e) {
            System.out.println("List.of: " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `[Kolkata, Mumbai]
List.of: java.lang.UnsupportedOperationException`,
        },
        {
          type: "paragraph",
          text: "`final` froze the reference, not the array, so any class could change the JVM-wide list of supported cities. A non-empty array is never a safe public constant; `List.of` is.",
        },
        {
          type: "heading",
          text: "Thinking protected means \"subclasses only\"",
        },
        {
          type: "code",
          language: "java",
          title: "ProtectedLeak.java",
          code: `class Account {
    protected long balance = 50_000;                       // "only subclasses can touch this"
}

public class ProtectedLeak {                               // not a subclass, just the same package
    public static void main(String[] args) {
        Account account = new Account();
        account.balance = -1;
        System.out.println("balance: " + account.balance);
    }
}`,
        },
        {
          type: "output",
          text: `balance: -1`,
        },
        {
          type: "paragraph",
          text: "`protected` includes package access, so every class in the package can write the field. A `protected` field is part of the class's API for every subclass and every neighbour; I keep fields `private` and, if subclasses need something, give them a `protected` method that keeps the rules.",
        },
        {
          type: "heading",
          text: "Trying to modify a record",
        },
        {
          type: "code",
          language: "java",
          title: "QuoteReset.java",
          code: `public record QuoteReset(String sku, long paise) {
    void reset() {
        this.paise = 0;
    }
}`,
        },
        {
          type: "output",
          text: `QuoteReset.java:3: error: cannot assign a value to final variable paise
        this.paise = 0;
            ^
1 error`,
        },
        {
          type: "paragraph",
          text: "A record's fields are `final`. A record \"changes\" the way `Quote.withDiscount` in `QuoteCache` does: by returning a new instance built through the canonical constructor.",
        },
        {
          type: "heading",
          text: "Three from earlier sections",
        },
        {
          type: "list",
          items: [
            "**A getter and a setter for every field.** `BeanAccount` ended at `balance: -12000 paise, currency: USD` after three ordinary callers. A setter on a field with a rule is the same hole as a public field.",
            "**Returning the internal collection, or treating a view as a snapshot.** One `membersLeaky().clear()` emptied a team from outside, and the read-only view later printed `[Imran]`, a list its holder never touched. Return `List.copyOf(field)` unless callers really need a live view.",
            "**Calling a final field immutable.** `FinalIsNotImmutable` printed `[0, 340] [Salt Lake, Park Street]` after changing a `final` array and a `static final` list. `final` is about the variable; immutability is about the object.",
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
            "Make every field `private`, and `final` unless it has a reason to change.",
            "Establish the invariants in the constructor, and fail there with a clear message if the arguments can't satisfy them.",
            "Name mutators after business operations (`debit`, `ship`, `cancel`), not fields. Each one checks before it writes.",
            "Use `IllegalArgumentException` for a bad argument and `IllegalStateException` for a call the object's current state doesn't allow.",
            "Copy mutable inputs **before** validating them, and validate the copy, so another thread can't change the input between the check and the copy. The JDK does the same: for three or more elements, `List.copyOf` ends in `ImmutableCollections.listFromArray`, whose source (I read the JDK 25 copy) says \"copy and check manually to avoid TOCTOU\".",
            "Prefer immutable types for values: records, `java.time`, `List.copyOf`. Copy what you can't make immutable.",
            "Keep entities and API types separate. A response record is an allowlist of what leaves the service.",
            "Prefer the narrowest access that works. Package-private is a fine default for classes that only their package uses, and it's still unit-testable from the same package.",
            "Treat `setAccessible(true)` and `--add-opens` as exceptions that need a comment, not tools.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The usual worry is that a getter costs a method call every time. I ran a hot loop over 1,000 accounts through a plain accessor:",
        },
        {
          type: "code",
          language: "java",
          title: "Accessor.java",
          code: `public class Accessor {
    static class Account {
        private long balance;
        Account(long balance) { this.balance = balance; }
        long balance() { return balance; }                 // a plain getter, 5 bytes of bytecode
    }

    static long sum(Account[] accounts) {
        long total = 0;
        for (Account a : accounts) total += a.balance();
        return total;
    }

    public static void main(String[] args) {
        Account[] accounts = new Account[1_000];
        for (int i = 0; i < accounts.length; i++) accounts[i] = new Account(i);
        long result = 0;
        for (int round = 0; round < 20_000; round++) result += sum(accounts);
        System.out.println(result);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining -XX:+PrintCompilation Accessor",
        },
        {
          type: "output",
          text: `...
45   13       1       Accessor$Account::balance (5 bytes)
47   14 %     3       Accessor::sum @ 11 (40 bytes)
                              @ 27   Accessor$Account::balance (5 bytes)   inline
48   15       3       Accessor::sum (40 bytes)
                              @ 27   Accessor$Account::balance (5 bytes)   inline
48   16 %     4       Accessor::sum @ 11 (40 bytes)
51   14 %     3       Accessor::sum @ 11 (40 bytes)   made not entrant
                              @ 27   Accessor$Account::balance (5 bytes)   accessor
52   17       4       Accessor::sum (40 bytes)
55   15       3       Accessor::sum (40 bytes)   made not entrant
                              @ 27   Accessor$Account::balance (5 bytes)   accessor
9990000000`,
        },
        {
          type: "list",
          items: [
            "C1 (tier 3) inlined `balance()` into `sum`, and C2 (tier 4) inlined it too, labelling it `accessor`: it recognises trivial getters. Once the code is hot, `a.balance()` costs the same as reading a public field.",
            "`balance()` on its own was compiled at tier 1, the level HotSpot uses for trivial methods that aren't worth profiling. The first column is milliseconds since start-up and differs between runs and machines.",
            "So the choice between a field and an accessor is a design decision, never a performance one. The Methods lesson shows the inlining limits behind this.",
          ],
        },
        {
          type: "paragraph",
          text: "Defensive copies do cost something, and it's measurable. I used the per-thread allocation counter the Memory Allocation lesson used for object sizes, on six ways a getter can return a collection:",
        },
        {
          type: "code",
          language: "java",
          title: "CopyCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

public class CopyCost {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;                                    // keeps each result reachable

    static long bytes(Supplier<Object> getter) {
        long id = Thread.currentThread().threadId();
        long before = MX.getThreadAllocatedBytes(id);
        sink = getter.get();
        return MX.getThreadAllocatedBytes(id) - before;
    }

    public static void main(String[] args) {
        List<String> members = new ArrayList<>();
        for (int i = 0; i < 10; i++) members.add("employee-" + i);
        List<String> frozen = List.copyOf(members);
        String[] top = {"Asha", "Ravi", "Meera"};

        Map<String, Supplier<Object>> getters = new LinkedHashMap<>();
        getters.put("return the field", () -> members);
        getters.put("Collections.unmodifiableList", () -> Collections.unmodifiableList(members));
        getters.put("new ArrayList<>(10 elements)", () -> new ArrayList<>(members));
        getters.put("List.copyOf(10-element ArrayList)", () -> List.copyOf(members));
        getters.put("List.copyOf(already immutable)", () -> List.copyOf(frozen));
        getters.put("top.clone(), 3 elements", () -> top.clone());

        for (int round = 0; round < 3; round++) getters.values().forEach(CopyCost::bytes);  // warm up
        long base = bytes(() -> null);
        getters.forEach((name, getter) -> System.out.printf("%-34s %3d bytes%n", name, bytes(getter) - base));
    }
}`,
        },
        {
          type: "output",
          text: `return the field                     0 bytes
Collections.unmodifiableList        24 bytes
new ArrayList<>(10 elements)        80 bytes
List.copyOf(10-element ArrayList)  136 bytes
List.copyOf(already immutable)       0 bytes
top.clone(), 3 elements             32 bytes`,
        },
        {
          type: "list",
          items: [
            "The view is one small wrapper object: 12 bytes of header and two 4-byte references, rounded to 24. Cheap, but it's a window, not a copy.",
            "`List.copyOf` of a 10-element `ArrayList` allocated 136 bytes: two 56-byte `Object[10]` arrays (one from `toArray()`, one made while null-checking each element) plus the 24-byte list. That's more than `new ArrayList<>(members)` at 80, the price of a list that can't be changed by anyone.",
            "`List.copyOf` of a list that's already immutable allocated nothing and returned the same object, so copying defensively at every boundary is free once the data is immutable.",
            "These numbers are deterministic for the default flags on JDK 21 (compressed oops and class pointers), and JDK 25 printed the same table. Allocation like this is cheap in a TLAB, as the Memory Allocation lesson showed; it only matters in very hot paths or with large collections, where returning an immutable list stored once beats copying on every call.",
          ],
        },
        {
          type: "list",
          items: [
            "Immutable objects mean more short-lived allocations (every `Price.plus` builds a new price). Young-generation collection handles short-lived garbage cheaply, and escape analysis can remove allocations that never leave a method, which the Memory Allocation lesson measured.",
            "A record's `toString`, `equals` and `hashCode` go through `invokedynamic`, so each call site pays a one-time bootstrap the first time it runs. After that it's ordinary linked code.",
            "An uncontended `synchronized` method is cheap; a contended one makes threads wait, which is the point. Keep the critical section short: `tryDebit` in the production section checks and writes, and the slow `fraudCheck` call happens outside the lock.",
          ],
        },
      ],
    },
    {
      title: "Encapsulation in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Two bugs I'd expect in a ride-hailing backend, both caused by state that was encapsulated on paper only.",
        },
        {
          type: "heading",
          text: "An API that leaks whatever its getters expose",
        },
        {
          type: "paragraph",
          text: "When a Spring MVC controller returns an object, Jackson writes it to the response (in Spring Framework 6, through `MappingJackson2HttpMessageConverter`). Jackson doesn't care that the fields are private; it serializes every public getter. Here's a driver entity, what Jackson does with it, and the fix:",
        },
        {
          type: "code",
          language: "java",
          title: "DriverApi.java",
          code: `import com.fasterxml.jackson.databind.ObjectMapper;

public class DriverApi {
    // The entity: private fields and a getter for each, which the ORM and other services use
    public static class Driver {
        private final long id;
        private final String name;
        private final String phone;
        private final String passwordHash;
        private final double rating;

        public Driver(long id, String name, String phone, String passwordHash, double rating) {
            this.id = id;
            this.name = name;
            this.phone = phone;
            this.passwordHash = passwordHash;
            this.rating = rating;
        }

        public long getId() { return id; }
        public String getName() { return name; }
        public String getPhone() { return phone; }
        public String getPasswordHash() { return passwordHash; }
        public double getRating() { return rating; }
    }

    // The fix: the API gets its own type, holding only what a rider may see
    public record DriverResponse(String name, double rating) {
        static DriverResponse from(Driver d) {
            return new DriverResponse(d.getName(), d.getRating());
        }
    }

    public static void main(String[] args) throws Exception {
        ObjectMapper json = new ObjectMapper();
        Driver asha = new Driver(42, "Asha", "+91-98300-12345",
                "$2a$10$Qx8sYpW3rTn6vLmZk1HdOe7cFgJ2bN5aU9iE4oR0tS3yV6wX8zA1u", 4.8);

        System.out.println("entity:   " + json.writeValueAsString(asha));
        System.out.println("response: " + json.writeValueAsString(DriverResponse.from(asha)));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# Maven: com.fasterxml.jackson.core:jackson-databind:2.21.7
javac -cp "$JACKSON" DriverApi.java && java -cp "$JACKSON:." DriverApi`,
        },
        {
          type: "output",
          text: `entity:   {"id":42,"name":"Asha","phone":"+91-98300-12345","passwordHash":"$2a$10$Qx8sYpW3rTn6vLmZk1HdOe7cFgJ2bN5aU9iE4oR0tS3yV6wX8zA1u","rating":4.8}
response: {"name":"Asha","rating":4.8}`,
        },
        {
          type: "paragraph",
          text: "The other common fix keeps returning the entity and annotates the two getters (`com.fasterxml.jackson.annotation.JsonIgnore`):",
        },
        {
          type: "code",
          language: "java",
          code: `@JsonIgnore
public String getPhone() { return phone; }

@JsonIgnore
public String getPasswordHash() { return passwordHash; }`,
        },
        {
          type: "output",
          text: `entity:   {"id":42,"name":"Asha","rating":4.8}`,
        },
        {
          type: "list",
          items: [
            "**What happened:** the entity was encapsulated against Java code and wide open to a serializer. Every public getter is part of a class's API, and Jackson is one more caller, one that writes everything it can read to the network.",
            "**`DriverResponse` is the fix I'd ship.** It's an allowlist: the response holds the two fields someone chose to expose, so a `getBankAccount()` added to the entity next year doesn't leak by default. It also gives the API its own contract, so renaming an entity field can't silently change the JSON.",
            "**`@JsonIgnore` is a denylist.** It works until someone adds a sensitive getter and forgets the annotation, it ties the persistence class to one JSON format, and it does nothing for a generated `toString()` that ends up in a log line.",
            "The same leak happens through `log.info(\"{}\", driver)` with a generated `toString`, and through caches that serialize whole objects. The fix is the same: a dedicated type for whatever leaves the boundary.",
          ],
        },
        {
          type: "heading",
          text: "A wallet that goes negative under concurrent payments",
        },
        {
          type: "paragraph",
          text: "The second bug is `OpenAccount`'s check-then-act, this time on a rider's wallet under load. Two payment requests for the same rider arrive together, which retries and double taps make routine, and each wallet holds exactly one fare. The `fraudCheck` sleep stands in for the network call real code makes between reading the balance and writing it:",
        },
        {
          type: "code",
          language: "java",
          title: "WalletRace.java",
          code: `import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

public class WalletRace {
    static class OpenWallet {                              // before: callers check, then write
        public long balance;                               // paise
    }

    static class Wallet {                                  // after: check and write under one lock
        private long balance;

        Wallet(long balance) { this.balance = balance; }

        synchronized boolean tryDebit(long amount) {
            if (amount <= 0) throw new IllegalArgumentException("amount must be positive: " + amount);
            if (balance < amount) return false;            // declined, nothing changes
            balance -= amount;
            return true;
        }

        synchronized long balance() { return balance; }
    }

    static final long FARE = 10_000;                       // Rs. 100; each wallet holds exactly one fare
    static final int TRIALS = 500;

    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        int overdrawn = 0, twoRidesOneDebit = 0, safeBad = 0;
        for (int t = 0; t < TRIALS; t++) {
            // Two payment requests for the same rider arrive together, e.g. an app retry
            OpenWallet open = new OpenWallet();
            open.balance = FARE;
            AtomicInteger charged = new AtomicInteger();
            race(pool, () -> {
                if (open.balance >= FARE) {                // check ...
                    fraudCheck();
                    open.balance -= FARE;                  // ... then act
                    charged.incrementAndGet();
                }
            });
            if (open.balance < 0) overdrawn++;
            else if (charged.get() == 2) twoRidesOneDebit++;

            Wallet safe = new Wallet(FARE);
            AtomicInteger safeCharged = new AtomicInteger();
            race(pool, () -> {
                fraudCheck();
                if (safe.tryDebit(FARE)) safeCharged.incrementAndGet();
            });
            if (safe.balance() != 0 || safeCharged.get() != 1) safeBad++;
        }
        pool.shutdown();
        System.out.println("public field: " + overdrawn + " overdrawn, " + twoRidesOneDebit
                + " paid two rides with one debit, out of " + TRIALS);
        System.out.println("encapsulated: " + safeBad + " bad outcomes out of " + TRIALS);
    }

    // Stands in for the network call real code makes between the check and the write
    static void fraudCheck() {
        try { Thread.sleep(1); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    // Runs the same task on two threads released at the same moment, and waits for both
    static void race(ExecutorService pool, Runnable task) throws Exception {
        CyclicBarrier start = new CyclicBarrier(2);
        Runnable gated = () -> {
            try { start.await(); } catch (Exception e) { throw new IllegalStateException(e); }
            task.run();
        };
        Future<?> a = pool.submit(gated);
        Future<?> b = pool.submit(gated);
        a.get();
        b.get();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java WalletRace      # three runs; the split between the two failure kinds varies",
        },
        {
          type: "output",
          text: `public field: 476 overdrawn, 24 paid two rides with one debit, out of 500
encapsulated: 0 bad outcomes out of 500
public field: 468 overdrawn, 32 paid two rides with one debit, out of 500
encapsulated: 0 bad outcomes out of 500
public field: 450 overdrawn, 50 paid two rides with one debit, out of 500
encapsulated: 0 bad outcomes out of 500`,
        },
        {
          type: "list",
          items: [
            "With the public field, **every** trial went wrong, in two ways. Most wallets were overdrawn: both requests passed the check and both subtracted, leaving -10000. The rest paid for two rides with one debit: both threads read 10000 and both wrote 0, so one write was lost. The split varies by run and machine; the total doesn't, because the 1 ms gap dwarfs the time between the two requests.",
            "With the sleep removed, three runs of 20,000 trials gave 1, 0 and 0 overdrawn wallets on my machine. That's the dangerous version of this bug: rare enough to pass every test, frequent enough at production volume.",
            "The encapsulated wallet had zero bad outcomes: in every trial one debit succeeded and the other was declined. Callers can't split the check from the write anymore, because both happen inside `tryDebit` under the wallet's lock, while the slow call stays outside it.",
            "`synchronized` only protects one JVM. With several service instances and the balance in a database, the same method would do the check and the write in one statement, `UPDATE wallet SET balance = balance - ? WHERE id = ? AND balance >= ?`, and treat zero updated rows as declined. The Multithreading and Concurrency and Spring Data JPA and Hibernate tracks cover the machinery; the encapsulation part doesn't change: one method owns the rule.",
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
              question: "What is encapsulation?",
              answer:
                "Keeping an object's state together with the rules about that state, and letting outside code change the state only through methods that enforce those rules. Private fields are the mechanism; protected invariants are the goal.\n\nIn my `Checkout` example, `BankAccount` has a private `balance` that only `credit` and `debit` write, each checking first. A debit of 25,000 against 18,000 threw `IllegalStateException` and the balance stayed at 18000, and `javap` showed just three field writes in the whole class.",
            },
            {
              question: "How do you achieve encapsulation in Java?",
              answer:
                "Make fields `private` (and `final` where they never change), establish a valid state in the constructor, and expose operations that check their rules before writing instead of a setter per field. Getters return values or copies, never internal mutable objects.\n\n`Checkout`'s `BankAccount` has all of it: a `private final` currency with no setter, a balance changed only by `credit` and `debit`, and a private `requirePositive` helper that isn't part of the API. For collections, the getter returns `List.copyOf(...)`, not the field, as `TeamRoster` showed.",
            },
            {
              question: "Why should fields be private?",
              answer:
                "So only the class's own code can change them. That gives one place to enforce invariants, the freedom to change the representation later, and one place to add locking.\n\n`OpenAccount` shows the alternative: with a setter on the balance, three ordinary callers left it at -12000 paise with the currency changed to USD. And `Price` could switch from `double` rupees to `long` paise without recompiling a single caller only because the field was private.",
            },
            {
              question: "What are the four access levels in Java?",
              answer:
                "`private` (the class and its nest), package-private with no keyword (the package), `protected` (the package plus subclasses elsewhere) and `public` (everyone). A top-level class can only be `public` or package-private.\n\nThey survive into the class file as access flags: `javap -v` showed `0x0002 ACC_PRIVATE`, `0x0004 ACC_PROTECTED`, `0x0001 ACC_PUBLIC`, and `0x0000` for package-private. The full rules, including `protected` across packages and modules, are in the Packages and Access Modifiers lesson in Phase 6.",
            },
            {
              question: "What are the benefits of encapsulation?",
              answer:
                "Invariants enforced in one place, internals that can change without breaking callers, thread safety that can be added inside one class, and a smaller surface that leaks less. It also makes a class easier to test, because its rules are in its own methods.\n\nEach has a run in this lesson: `BankAccount` rejected a bad debit, `Price` changed representation while `PriceSlip.class` kept the same checksum, the synchronized `tryDebit` had zero bad outcomes in 500 racing trials, and `DriverResponse` kept a password hash out of the JSON.",
            },
            {
              question: "What is a class invariant?",
              answer:
                "A condition that holds for every object of the class whenever none of its methods is running: after construction, and before and after every public call. A method may break it briefly inside, but restores it before it returns or throws.\n\nFor the bank account, the invariants are \"balance is never negative\" and \"currency never changes\". \"Amount must be positive\" is a precondition of `credit` and `debit`, not an invariant. If only those two methods write the balance, they're the only places the invariant can break.",
            },
            {
              question: "What are getters and setters, and what's the naming convention?",
              answer:
                "Methods that read and write a property: `getName()`, `setName(String)`, and `isAvailable()` for a primitive `boolean`. The convention comes from the JavaBeans specification, and frameworks find properties by these names using reflection.\n\nWhen I ran `java.beans.Introspector` on an `EmployeeBean`, it found `displayName` from a getter with no field behind it, ignored `phone`, which had a field but no getter, and missed `verified` because its `isVerified()` returned the `Boolean` wrapper. The methods define the property, not the fields.",
            },
            {
              question: "What is an immutable object? Give examples from the JDK.",
              answer:
                "An object whose state can't change after construction; any \"change\" returns a new object. `String`, `Integer` and the other wrappers, `BigDecimal`, `LocalDate`, `Instant`, and the lists from `List.of` and `List.copyOf` are immutable.\n\nMy `Price` is one: `plus` and `times` return new prices, so adding ten cashbacks built ten new objects and never changed one. In `QuoteCache`, the immutable `Quote` record is what kept a cached price from being changed by one customer's coupon.",
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
              question: "Is a class with a getter and a setter for every field encapsulated?",
              answer:
                "Usually not. The fields are hidden, but if a setter can put the object into an invalid state, the rules still live in the callers. That's data hiding without encapsulation.\n\n`BeanAccount` had private fields and full getters and setters, and three callers left it at -12000 paise in USD. Setters are fine for fields with no rules; anything with an invariant needs operations like `debit` that check first.",
            },
            {
              question: "What's the difference between data hiding and encapsulation?",
              answer:
                "Data hiding is the mechanism: restricting who can access a field, with `private` and the other modifiers. Encapsulation is the design goal it serves: bundling state with the operations that keep it valid, so the rules can't be bypassed.\n\nThe first doesn't guarantee the second, as `BeanAccount` shows. The second needs the first: `BankAccount`'s rules only hold because `balance` is private, which `javac` enforced with `balance has private access in BankAccount`.",
            },
            {
              question: "What are the rules for writing an immutable class?",
              answer:
                "No mutators; a `final` class (or only private constructors); every field `private final`; mutable inputs copied in the constructor and mutable fields never returned without a copy; and `this` never leaked from the constructor.\n\n`SafeLeaderboard` in `ArrayLeak` follows them, cloning its array in and out, while `Leaderboard`, identical except for the copies, was changed twice from outside. `FinalClassMatters` shows why the class has to be `final`: a subclass overriding the getter meant a customer was shown 24500 and charged 99900.",
            },
            {
              question: "What's the difference between final and immutable?",
              answer:
                "`final` is about a variable: it can't be reassigned. Immutable is about an object: its state can't change. A `final` reference can point to a perfectly mutable object.\n\n`FinalIsNotImmutable` changed a `final int[]` and a `static final ArrayList` and printed `[0, 340] [Salt Lake, Park Street]`. The only thing `final` stopped was reassignment: `cannot assign a value to static final variable OPEN_BRANCHES`.",
            },
            {
              question: "What's the difference between an unmodifiable collection and an immutable one?",
              answer:
                "`Collections.unmodifiableList(list)` is a read-only view: writes through it throw, but changes to the underlying list show through. `List.of` and `List.copyOf` build lists that own their data and never change.\n\nIn `TeamRoster`, a view taken while the team held Asha and Ravi later printed `[Imran]`, while the `List.copyOf` snapshot still printed `[Asha, Ravi]`; both threw `UnsupportedOperationException` on `add`. The view cost 24 bytes, the copy 136 bytes for ten elements.",
            },
            {
              question: "What is a defensive copy, and where do you make one?",
              answer:
                "A copy of a mutable object made at the class boundary, so outside code can't change the class's state through a shared reference. Copy mutable inputs in the constructor or setter, and copy mutable fields before returning them, unless they're already stored in an immutable form.\n\n`ArrayLeak` shows both directions: `Leaderboard` kept the caller's array and returned its own, and ended up as `[Kabir, Imran, Meera]`, while `SafeLeaderboard` cloned in and out and stayed `[Asha, Ravi, Meera]`. Copy first, then validate the copy.",
            },
            {
              question: "What do records give you, and what are their limits?",
              answer:
                "A `final` class with a `private final` field and a public accessor per component, a canonical constructor, and value-based `equals`, `hashCode` and `toString`; the compact constructor is where validation goes. The limits: no `extends`, no instance fields beyond the components, and only shallow immutability.\n\n`record SalePrice(...) extends BasePrice` failed with `'{' expected`, and an extra instance field failed with `field declaration must be static`. `Course` picked up `Meera` from the caller's list until `List.copyOf` in the compact constructor fixed it.",
            },
            {
              question: "Why do frameworks need the JavaBeans conventions?",
              answer:
                "Because they discover properties by method name at run time. Jackson serializes getters, Spring's `DataBinder` writes through setters, expression languages turn `employee.name` into `getName()`, and JPA uses getters and setters when it's configured for property access.\n\nThe flip side is that every public accessor is visible to them. Jackson put a field-less `displayName` into my JSON and left out `phone`, which had no getter, and Spring's real `DataBinder` set `verified=true` from a request parameter only because a `setVerified` existed.",
            },
            {
              question: "Can one object access another object's private fields?",
              answer:
                "Yes, as long as the code doing it is in the same class (or nest). Java's access control is per class, not per object: it checks where the code is written, not which instance it touches.\n\n`TransferDemo`'s `transferTo` writes `other.balance` directly, and that's what makes `equals`, `compareTo` and copy constructors possible. Smalltalk is the contrast: there, instance variables are private to each object.",
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
              question: "Is access control enforced only by the compiler?",
              answer:
                "No. `javac` checks it, and the JVM checks it again when it resolves a field or method reference at run time, because it can't assume the class files were compiled together.\n\nI compiled `Billing` against an `Invoice` with a public field, made the field private, and recompiled only `Invoice`. `Billing` then failed with `java.lang.IllegalAccessError: class Billing tried to access private field Invoice.paise`, a `LinkageError` thrown at the first execution of the `getfield`.",
            },
            {
              question: "Can reflection break encapsulation? What changed in JDK 16 and 17?",
              answer:
                "For my own classes on the classpath, yes: `setAccessible(true)` switches the check off, and I set a private account balance to -100000 without any invariant running. For JDK internals, no: JDK 16 (JEP 396) denied that access by default, and JDK 17 (JEP 403) removed the `--illegal-access` switch altogether.\n\n`setAccessible(true)` on `String.value` threw `InaccessibleObjectException: ... module java.base does not \"opens java.lang\" to unnamed module`, and JDK 21 printed that it ignored `--illegal-access=permit`. Only `--add-opens java.base/java.lang=ALL-UNNAMED` opened it.",
            },
            {
              question: "What are nestmates, and what problem did they solve?",
              answer:
                "Java 11's nest-based access control (JEP 181). The outer class lists its nested classes in a `NestMembers` attribute, each nested class names its `NestHost`, and the JVM lets nestmates use each other's private members directly.\n\nBefore that, `javac` generated package-private synthetic bridges. Compiling `Order` with `--release 8` produced `static long access$000(Order)`, flagged `ACC_STATIC, ACC_SYNTHETIC`, which any class in the package could call. Compiled normally on JDK 21, `Receipt` used a plain `getfield Order.totalPaise` and no bridge existed.",
            },
            {
              question: "How does a record implement equals, hashCode and toString?",
              answer:
                "Each is a single `invokedynamic` whose bootstrap method is `java.lang.runtime.ObjectMethods.bootstrap`, given the record class, the component names and a field-getter method handle per component. The implementation is built the first time each call site runs.\n\n`javap -v` on `PriceQuote` showed the bootstrap arguments `sku;paise` and two `REF_getField` handles. Because they read the fields directly, overriding an accessor doesn't change equality. The Object Class Methods lesson covers what equality should mean.",
            },
            {
              question: "Can a final field be changed through reflection?",
              answer:
                "For an ordinary class, yes: after `setAccessible(true)`, `Field.set` can write a non-static `final` field. For records and hidden classes, no: `Field.set` refuses even after `setAccessible(true)` succeeds, and the same Javadoc rule excludes static finals.\n\nI tried both on a `private final long paise`. The ordinary class's field changed to 1; the record threw `IllegalAccessException: Can not set final long field PriceRecord.paise to (long)1`, on JDK 21 and JDK 25.",
            },
            {
              question: "How does encapsulation make thread safety possible?",
              answer:
                "If the state is private and only a few methods touch it, those methods are the only places that need synchronization, and a check plus the write that depends on it can run under one lock. With a public field, every caller would have to agree on a lock.\n\nIn `WalletRace`, callers doing check-then-act on a public balance overdrew or double-charged in all 500 racing trials on my machine; the encapsulated `synchronized tryDebit` had none. Immutable objects go further: they need no lock, and the memory model guarantees other threads see their `final` fields once construction finishes.",
            },
            {
              question: "Do getters and setters hurt performance?",
              answer:
                "Not in hot code. HotSpot inlines trivial accessors, so a getter call compiles to the same field load as direct access.\n\nWith `-XX:+PrintInlining`, a 5-byte `balance()` was inlined into its caller by C1 and by C2, which labelled it `accessor`. Where encapsulation does cost something is copying: `List.copyOf` of a 10-element `ArrayList` allocated 136 bytes, while `List.copyOf` of an already immutable list allocated nothing.",
            },
            {
              question: "What's the difference between encapsulation and abstraction?",
              answer:
                "Encapsulation is about how an object keeps its own state valid: private state and operations that enforce invariants. Abstraction is about what a caller needs to know: the essential behaviour, usually behind an interface or abstract class, with the implementation hidden.\n\nA `PaymentProcessor` interface is abstraction; each implementation keeping its own token and retry state private and consistent is encapsulation. They work together, and the Abstraction lesson has the full comparison.",
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
              question: "In the production example, an API response leaks drivers' password hashes and phone numbers. What happened, and how do you fix it?",
              answer:
                "The controller returned the entity, and Jackson serializes every public getter, so `getPasswordHash()` and `getPhone()` went straight into the JSON. Private fields didn't help: the getters are public API, and Jackson is just another caller.\n\nI reproduced it with Jackson 2.21.7, where the entity's JSON contained `phone` and `passwordHash`. The fix I'd ship is a `DriverResponse(String name, double rating)` record built from the entity, which printed `{\"name\":\"Asha\",\"rating\":4.8}` and won't leak getters added later. `@JsonIgnore` on the two getters also works, but it's a denylist.",
            },
            {
              question: "A rider's wallet balance went negative in production. How do you investigate and fix it?",
              answer:
                "I'd look for check-then-act on the balance outside the wallet: code that reads the balance, decides, then writes, with two requests for the same wallet interleaving in between. App retries and double taps make simultaneous requests routine.\n\n`WalletRace` reproduced it: with a 1 ms gap between check and write, all 500 trials overdrew or double-charged. The fix is one wallet operation that checks and writes together: a `synchronized tryDebit` within one JVM, and with several instances on one database, a conditional `UPDATE ... WHERE balance >= ?` or a row lock behind that same method.",
            },
            {
              question: "Prices are stored as double rupees and totals are off by fractions of a paisa. How do you move to long paise without breaking callers?",
              answer:
                "Keep every public signature and change only the private representation: store `long paise`, convert once in the existing constructor with `Math.round(rupees * 100)`, derive `rupees()` from the paise, and add `paise()` for new code. Deprecate the `double` API later.\n\nI did exactly that with `Price` and recompiled only `Price.java`. The untouched `PriceSlip.class`, same md5, went from `Rs. 100.10000000000001` to `Rs. 100.10`, because the descriptors it links against didn't change.",
            },
            {
              question: "After a library upgrade, the service fails with IllegalAccessError. What happened?",
              answer:
                "A class compiled against the old version of the library is accessing a member that's no longer accessible in the new one, usually a field or method that became private. `javac` never saw that combination; the JVM caught it while resolving the reference.\n\nThat's the `Billing` and `Invoice` demo: `class Billing tried to access private field Invoice.paise`, with both classes' loaders in the message. I'd find which jar each class came from, look for two versions of the library on the classpath (`mvn dependency:tree`), align them, and recompile against the version that actually ships.",
            },
            {
              question: "One customer's coupon discount started showing up for every customer buying the same product. What's your first suspect?",
              answer:
                "A shared mutable object, such as a cached quote, that one request modified in place with a setter instead of creating a new object for that customer.\n\n`QuoteCache` reproduces it: the coupon code halved the cached `MutableQuote`, and Ravi got 10000 instead of 20000. With a `Quote` record, `withDiscount` returned a new object for Asha and the cache kept 20000. Anything that goes into a cache should be immutable.",
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
            "Write a `BankAccount` with a private `balance` and `credit` and `debit` methods that enforce the rules, plus a separate top-level class `Main` in the same file. In `main`, write `account.balance = -500;` and compile. Then replace that line with `credit(50_000)`, `debit(32_000)`, and a `debit(25_000)` inside a `try` that prints the exception.",
            "Reproduce the `IllegalAccessError`: an `Invoice` with a public field, a `Billing` that reads it, both compiled together. Make the field private, recompile only `Invoice`, and run `Billing`.",
            "Write a `Team` that holds an `ArrayList` of members, with three getters: one returning the field, one returning `Collections.unmodifiableList`, one returning `List.copyOf`. Take a view and a snapshot, then clear the list through the first getter and add a new member. Print both.",
            "Write `record Course(String code, List<String> students)`, change the list you passed in after construction, and print the record. Then add a compact constructor with `students = List.copyOf(students);` and run it again.",
            "Run `javap -p` on your record, then `javap -v Course | grep ObjectMethods`.",
            "Compile a class with a static nested class that reads the outer class's private field, once normally and once with `--release 8`. Compare `javap -p` on the outer class.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 fails to compile with `balance has private access in BankAccount`, and then prints `java.lang.IllegalStateException` with a message showing a balance of 18000 (the exact wording is whatever your `debit` builds). Step 2 prints `java.lang.IllegalAccessError: class Billing tried to access private field Invoice.paise`. In step 3 the view shows only the new member and the snapshot still shows the original two. In step 4 the record shows the changed list the first time and the original list the second time. Step 5 lists `private final` fields and accessors named after the components, and the `grep` finds a `REF_invokeStatic java/lang/runtime/ObjectMethods.bootstrap` line. In step 6, only the `--release 8` build has a `static ... access$000(...)` method.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `ENCAPSULATION  state + its rules in one class; outside code changes
               state only through operations that check first
NOT            "a getter and a setter for every field"

ACCESS         private < package-private < protected < public
               private = the class and its nest
               protected also means the whole package
               checked by javac AND by the JVM at link time
               (stale class file -> IllegalAccessError)

INVARIANTS     set up in the constructor, checked before each write
               bad argument -> IllegalArgumentException
               wrong state  -> IllegalStateException
TELL           account.debit(amount), not get/compute/setBalance

IMMUTABLE      final class, private final fields, no setters,
               copy mutable inputs in, never hand mutable out
               final reference != immutable object
COLLECTIONS    unmodifiableList = view, sees later changes
               List.copyOf = copy, free if already immutable
RECORDS        private final fields, name() accessors, compact
               constructor validates; final, no extends, no
               instance fields; shallow unless you List.copyOf

JVM            flags 0x0001 public, 0x0002 private, 0x0004
               protected; nestmates (Java 11) replaced access$000
REFLECTION     own classes: setAccessible works
               JDK internals: InaccessibleObjectException since
               JDK 16/17, unless --add-opens`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "If someone says encapsulation means getters and setters: it means invariants. Private fields are only the tool, and a setter on a field with a rule is the same hole as a public field.",
            "Immutable values (records with copied components) and entities with named operations cover most classes. Anything shared, cached or used as a key should be immutable, and anything that leaves the service should go through its own response type.",
            "Next comes Inheritance, where a subclass gets its parent's `protected` members and can override its methods, which is exactly where `final` classes and private fields stop being theoretical.",
          ],
        },
      ],
    },
  ],
};
