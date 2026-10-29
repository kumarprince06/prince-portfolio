import type { Lesson } from "../types";

export const coreJavaQuestions: Lesson = {
  slug: "core-java-interview-questions",
  date: "2026-10-29",
  title: "Core Java Interview Questions",
  description: "The core Java questions that open almost every interview: OOP, pass-by-value, static and final, immutability, equals and hashCode, Strings, exceptions, generics, enums and Java 9 to 21 features. It also covers the internals interviewers like to probe, plus output-based trick questions run for real on JDK 21.",
  tags: [
    "Interview",
    "Java",
    "Core Java",
    "OOP",
  ],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        {
          type: "paragraph",
          text: "These are the core Java questions that open almost every Java interview, written the way I'd answer them out loud. Try answering each one yourself before you open it. A ⭐ marks the ones that come up most often.",
        },
        {
          type: "paragraph",
          text: "Each answer starts with a simple, everyday picture and then goes into the detail an interviewer pushes for. Near the end there's a set of output-based trick questions, all run for real on JDK 21.",
        },
      ],
    },
    {
      title: "OOP Pillars",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What are the four pillars of OOP?",
              answer: "**Encapsulation** means keeping data private and exposing only safe actions. A bank account has a private balance, and the only way to change it is `deposit()` or `withdraw()`, which check the rules. Nobody can set the balance to -500 directly.\n\n**Abstraction** means showing what something does and hiding how. I press a lift button and the lift comes; I don't need to know about the motor. In code, my checkout calls `paymentGateway.charge(amount)` without knowing which provider is underneath.\n\n**Inheritance** means a class reuses and extends another: `ElectricCar extends Car` gets everything a car has and adds charging.\n\n**Polymorphism** means one call, many behaviours. `notifier.send(message)` sends an SMS, an email or a push notification depending on which object is behind it.",
            },
            {
              question: "What are the two kinds of polymorphism?",
              answer: "Compile-time polymorphism is method overloading: same name, different parameters, and the compiler picks the version from the argument types.\n\nRuntime polymorphism is method overriding: a subclass replaces a parent method, and the JVM picks the version from the actual object at runtime. That's dynamic dispatch, done with the `invokevirtual` instruction and a per-class method table.",
            },
            {
              question: "Why is Java not 100% object-oriented?",
              answer: "Because of primitives (`int`, `double`, `boolean` and the rest), which are plain values and not objects, kept for speed and memory. And because `static` members belong to the class rather than any object. Wrapper classes like `Integer` exist to bridge primitives into the object world.",
            },
            {
              question: "Composition vs inheritance: why prefer composition?",
              answer: "Inheritance is \"is-a\", and it ties me tightly to the parent. If the parent changes, every child can break, and I inherit methods I never wanted.\n\nComposition is \"has-a\": a class holds another object and delegates to it. A food delivery app has a payment service rather than being one. I can swap the payment service, mock it in tests, and change it at runtime.\n\nSo I use inheritance only for a real \"is-a\" relationship where the parent was designed for extension, and composition everywhere else. Spring code is almost all composition: a service has a repository injected.",
            },
            {
              question: "Why doesn't Java allow multiple inheritance of classes?",
              answer: "Because of the diamond problem. If `C` extends both `A` and `B` and both have `hello()`, which one does `C` get? And whose fields come along? Java avoids that ambiguity by allowing only one parent class.\n\nInterfaces can still be multiply implemented. If two default methods clash, the compiler makes me override the method and choose, for example with `A.super.hello()`.",
            },
          ],
        },
      ],
    },
    {
      title: "Classes, Interfaces and Access",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Abstract class vs interface?",
              answer: "An interface is a contract: \"what you can do\". A tea stall, a cafe and a hotel can all promise `serveTea()` in completely different ways. A class can implement many interfaces. Since Java 8 they can have `default` and `static` methods, and since Java 9 `private` ones, but they still have no instance state and no constructors.\n\nAn abstract class is a partly built thing: \"what you are\". It can have fields, constructors and shared logic, but a class can extend only one.\n\nMy rule: start with an interface. Use an abstract class when implementations really share state or a common algorithm, like a base report class that does the header and footer and lets each subclass fill in the body (the Template Method pattern).",
            },
            {
              question: "⭐ Overloading vs overriding?",
              answer: "**Overloading** is the same method name with different parameters in the same class, like `calculateFare(km)` and `calculateFare(km, surge)`. It's resolved at compile time from the argument types. The return type alone can't overload a method.\n\n**Overriding** is a subclass redefining a parent method with the same signature. It's resolved at runtime from the actual object. The override can't reduce visibility, can't throw broader checked exceptions, and may return a subtype (a covariant return type). `@Override` makes the compiler check that I really overrode something.",
            },
            {
              question: "Can static, private or final methods be overridden?",
              answer: "No. A `static` method in a subclass with the same signature only hides the parent's; which one runs depends on the reference type, not the object. A `private` method isn't inherited, so a same-named method in the child is just a new method. A `final` method is explicitly locked against overriding.",
            },
            {
              question: "Can I overload or override `main`?",
              answer: "I can overload it as much as I like, but the JVM only starts `public static void main(String[] args)`. Since it's static, it can't be overridden, only hidden. (Java 21 previewed simpler instance main methods, but the classic answer is what interviewers expect.)",
            },
            {
              question: "What are the access modifiers, from most to least restrictive?",
              answer: "`private` is visible only inside the class. Default (no keyword) is package-private: visible inside the same package. `protected` is the same package plus subclasses in other packages. `public` is visible everywhere.\n\nA top-level class can only be `public` or package-private.",
            },
            {
              question: "Can a constructor be private, final or static?",
              answer: "Private, yes. It's used for singletons, utility classes and static factories like `List.of`, so callers can't create objects freely. Final or static, no. Constructors aren't inherited, so `final` means nothing, and they exist to set up a new object, so `static` makes no sense.",
            },
            {
              question: "What is the difference between `this()` and `super()`?",
              answer: "`this(...)` calls another constructor of the same class, and `super(...)` calls the parent's constructor. Either must be the first statement, so a constructor can't use both. If I write neither, the compiler inserts `super()`, which is why a parent without a no-args constructor forces children to call `super(...)` explicitly.",
            },
            {
              question: "What are the types of nested classes?",
              answer: "A **static nested** class has no link to an outer object; it's good for helpers like a `Builder`. An **inner** (non-static) class holds a hidden reference to its outer object, which can keep the outer object alive and leak memory. A **local** class is defined inside a method. An **anonymous** class is a one-off implementation, mostly replaced by lambdas today.",
            },
            {
              question: "What is a marker interface?",
              answer: "An interface with no methods that just tags a class, like `Serializable` or `Cloneable`. The JVM or a library checks `instanceof` and behaves differently. Today an annotation usually does that job better.",
            },
            {
              question: "What are the methods of `Object`?",
              answer: "`equals`, `hashCode`, `toString`, `getClass`, `clone`, `wait` (three overloads), `notify`, `notifyAll` and `finalize`, which has been deprecated since Java 9 and marked for removal. Every class inherits these.",
            },
          ],
        },
      ],
    },
    {
      title: "Pass-by-Value",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ Is Java pass-by-value or pass-by-reference?",
              answer: "Always pass-by-value. For objects, the value that gets copied is the reference, like handing someone a photocopy of your house address. They can use the address to go and repaint your house, and you'll see the new paint. But if they cross out the address on their copy and write a different one, your copy doesn't change.\n\nIn code: inside `void change(Car c)`, `c.setColour(\"red\")` changes the caller's object, because both copies point to the same car. `c = new Car()` only changes the local copy, and the caller still has the old car.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "static void change(Car car) {\n    car.setColour(\"red\");    // caller sees this: same object\n    car = new Car(\"blue\");   // caller does NOT see this: local copy only\n}",
          title: "Same object, copied reference",
        },
        {
          type: "qa",
          items: [
            {
              question: "Then how do I \"swap\" two integers in a method?",
              answer: "I can't, not for the caller's variables, because the method only gets copies. I'd return a new value (a record or an array) or swap elements inside an array or object both sides share. This question is just pass-by-value in disguise.",
            },
          ],
        },
      ],
    },
    {
      title: "static and final",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What does the `static` keyword mean?",
              answer: "`static` means \"belongs to the class, not to each object\". Think of a school: each student has a name, but the school's name is shared by all of them.\n\nA static field is one copy shared by all instances, like a counter. A static method is called without an object and has no `this`. A static block runs once when the class is initialised. A static nested class has no hidden reference to an outer object.\n\nThe trap in servers: a static mutable field is shared by every request thread in the JVM, so it must be thread-safe or, better, not exist.",
            },
            {
              question: "⭐ `final` vs `finally` vs `finalize`?",
              answer: "`final` is a keyword. A final variable can't be reassigned, a final method can't be overridden, and a final class can't be extended.\n\n`finally` is a block after `try`/`catch` that runs whether or not an exception happened. It's for cleanup.\n\n`finalize()` was a method the GC might call before collecting an object. It ran late or never, slowed down GC, and is deprecated for removal. I use try-with-resources, or `Cleaner` for native resources.",
            },
            {
              question: "Does a `final` reference make the object immutable?",
              answer: "No. `final List<String> items = new ArrayList<>();` stops me pointing `items` at another list, but `items.add(\"x\")` works fine. `final` locks the reference, not the object, like a nameplate screwed to one house where people can still move furniture inside. For a truly fixed list, use `List.of(...)` or `List.copyOf(...)`.",
            },
          ],
        },
      ],
    },
    {
      title: "Immutability",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ How do I create an immutable class?",
              answer: "Make the class `final` so nobody can subclass it and add mutability. Make every field `private final` and set it in the constructor. Provide no setters. And defensively copy any mutable field on the way in and on the way out: `this.stops = List.copyOf(stops)`, otherwise the caller can still change the list they passed in.\n\nA `record` does most of this for me, but a record holding a `List` is only as immutable as that list, so I still copy it in a compact constructor.",
            },
            {
              question: "Why are immutable objects useful?",
              answer: "They're automatically thread-safe, since nobody can change them, so they can be shared freely without locks. They make safe `HashMap` keys and set elements, because their hash can't change. And they're easier to reason about: once checked, they stay valid. `String`, `Integer`, `LocalDate` and `BigDecimal` are all immutable for these reasons.",
            },
            {
              question: "What is the difference between a shallow copy and a deep copy?",
              answer: "A shallow copy copies the fields, so nested objects are shared. Copy an order shallowly and both copies point to the same item list; add an item to one and it shows in both. A deep copy also copies the nested objects.\n\n`clone()` is shallow by default and awkward to get right (the `Cloneable` marker, a checked exception, no constructor call), so I prefer a copy constructor or a static factory like `Order.copyOf(other)`.",
            },
          ],
        },
      ],
    },
    {
      title: "equals and hashCode",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ What is the `equals` and `hashCode` contract?",
              answer: "If two objects are equal by `equals`, they must have the same `hashCode`. The reverse isn't required: unequal objects may share a hash code. That's a collision, and it's allowed.\n\n`equals` must also be reflexive, symmetric, transitive and consistent, and `x.equals(null)` must be false.",
            },
            {
              question: "⭐ What breaks if I override `equals` but not `hashCode`?",
              answer: "Hash collections stop working. Two \"equal\" objects get different default hash codes, land in different buckets, and `HashMap.get` with an equal key returns null. A `HashSet` happily stores both \"duplicates\".\n\nIt's like a library that files books by colour code and finds them by title. If two copies of the same title get different colour codes, you'll look on the wrong shelf. So I always override both, using the same fields, or let a `record` or the IDE generate them.",
            },
            {
              question: "⭐ What is the difference between `==` and `equals()`?",
              answer: "For primitives, `==` compares values. For objects, `==` checks whether both references point to the same object, while `equals()` compares content if the class overrides it.\n\nTwo ₹100 notes are equal in value (`equals`) but are not the same piece of paper (`==`). For strings and wrapper types like `Integer`, always use `equals`.",
            },
          ],
        },
      ],
    },
    {
      title: "Strings",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "⭐ `String` vs `StringBuilder` vs `StringBuffer`?",
              answer: "`String` is immutable: every \"change\" makes a new string. `StringBuilder` is mutable and fast but not thread-safe; it's what I use to build a string in a loop. `StringBuffer` is the old synchronized version, safe across threads but slower, and rarely needed since a string is almost never built by several threads at once.",
            },
            {
              question: "⭐ Why is `String` immutable?",
              answer: "Four good reasons. The string pool can safely share one copy of each literal. Security: a file path, URL or class name can't be changed after it was checked. Thread safety: strings can be shared freely. And hash caching: the hash code is computed once and stored, which makes strings fast `HashMap` keys.",
            },
            {
              question: "⭐ What is the string pool? How many objects does `new String(\"abc\")` create?",
              answer: "The pool is a table of string literals inside the heap (since Java 7). Each literal is stored once and reused, so `\"abc\" == \"abc\"` is true.\n\n`new String(\"abc\")` creates up to two objects: the literal `\"abc\"` in the pool, if it wasn't there already, and always a new object on the heap. `intern()` returns the pooled copy.",
            },
            {
              question: "How does string concatenation with `+` work internally?",
              answer: "Since Java 9, `a + b + c` compiles to one `invokedynamic` call to `StringConcatFactory`, which builds the result efficiently in one go. Before that, it compiled to a `StringBuilder` chain.\n\nThe catch is loops: `result += item` in a loop still creates a new string every round, so it's O(n²) for long loops. One `StringBuilder` outside the loop fixes it.",
            },
            {
              question: "How does `String.hashCode()` work?",
              answer: "It's `s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]`. 31 is an odd prime, and the JIT can turn `31 * h` into `(h << 5) - h`. Because the string is immutable, the result is cached in a field after the first call, so every later call is free.",
            },
            {
              question: "Why use `char[]` instead of `String` for passwords?",
              answer: "A `String` stays in memory until the GC collects it, and could show up in a heap dump. A `char[]` can be wiped right after use with `Arrays.fill(password, '0')`. It's a defence-in-depth point; in practice frameworks often don't follow it.",
            },
          ],
        },
      ],
    },
    {
      title: "Exceptions",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What does the exception hierarchy look like?",
              answer: "Everything starts at `Throwable`. Below it, `Error` covers serious JVM problems I shouldn't catch, like `OutOfMemoryError` and `StackOverflowError`. `Exception` covers problems an application may handle.\n\nUnder `Exception`, the checked exceptions (like `IOException` and `SQLException`) must be caught or declared. `RuntimeException` and its children (like `NullPointerException`, `IllegalArgumentException` and `IllegalStateException`) are unchecked.",
            },
            {
              question: "⭐ Checked vs unchecked exceptions?",
              answer: "Checked exceptions are checked by the compiler: I must catch them or declare them with `throws`. They're for expected, recoverable problems, like a file that isn't there.\n\nUnchecked exceptions (`RuntimeException`) usually mean a bug or a broken business rule, and nothing forces me to handle them.\n\nMost modern code, Spring included, prefers unchecked exceptions, because checked ones leak into every method signature on the way up. A common pattern is a few custom unchecked exceptions like `OrderNotFoundException`, mapped to HTTP status codes in one global handler.",
            },
            {
              question: "`throw` vs `throws`?",
              answer: "`throw` actually throws an exception object: `throw new IllegalArgumentException(\"amount must be positive\")`. `throws` in a method signature declares which checked exceptions the method might pass to its caller.",
            },
            {
              question: "Does `finally` always run?",
              answer: "Almost always: after a normal finish, after a `return` in `try`, and after an exception. It doesn't run if `System.exit()` is called, the JVM crashes or is killed, or the thread runs forever inside `try`.",
            },
            {
              question: "What happens if both `try` and `finally` contain a `return`?",
              answer: "The `finally` return wins. It silently throws away the `try` value, and even an exception that was on its way out. That's why returning from `finally` is a bug pattern; the compiler warns about it with `-Xlint`.",
            },
            {
              question: "How does try-with-resources work?",
              answer: "Anything that implements `AutoCloseable` and is declared in the `try (...)` header gets closed automatically, in reverse order of opening, even if an exception is thrown. It's like a hotel that collects every room key at checkout, whether you leave happy or in a hurry.\n\nThe compiler turns it into a `try`/`finally` that calls `close()`. If both the body and `close()` throw, the close exception is attached to the main one with `addSuppressed()`, so neither is lost.",
            },
            {
              question: "Should a custom exception be checked or unchecked?",
              answer: "Usually unchecked: `class PaymentFailedException extends RuntimeException`. And always keep the cause when wrapping: `super(message, cause)`. Without it, the original stack trace, which is the part that says what actually went wrong, is lost.",
            },
            {
              question: "What are the exception rules for overriding methods?",
              answer: "An overriding method can't throw new or broader checked exceptions than the parent declares, because callers that use the parent type wouldn't be ready for them. It can throw fewer, narrower ones, or none, and any unchecked exceptions.",
            },
            {
              question: "`ClassNotFoundException` vs `NoClassDefFoundError`?",
              answer: "`ClassNotFoundException` is a checked exception from dynamic loading, like `Class.forName(\"x.Y\")`, when the class can't be found.\n\n`NoClassDefFoundError` is an `Error`: the class was there at compile time but is missing at runtime, or its static initialiser failed earlier. It's usually a classpath or dependency-version problem.",
            },
            {
              question: "What are good exception-handling practices?",
              answer: "Don't swallow exceptions with an empty `catch`. Don't use exceptions for normal flow. Catch the most specific type I can handle. Log once, at the boundary, not at every layer on the way up. Keep the cause when wrapping. And never send stack traces to API clients, only a safe message and an error code.",
            },
          ],
        },
      ],
    },
    {
      title: "Generics and Type Erasure",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "Why do we need generics?",
              answer: "To get type safety at compile time and drop the casts. Before generics, a `List` held `Object`s, so I could put a `String` in and later cast it to `Integer` and crash at runtime. `List<String>` makes the compiler refuse the wrong type up front.\n\nThink of labelled jars in a kitchen: a jar marked \"sugar\" only takes sugar, so nobody gets salt in their tea.",
            },
            {
              question: "What is type erasure?",
              answer: "Generics exist only at compile time. The compiler checks the types, then erases them: `List<String>` and `List<Integer>` both become plain `List` in the bytecode, and the compiler inserts casts where values are read.\n\nThat's why at runtime I can't write `new T()`, `T.class`, `instanceof List<String>` or `new T[10]`, and why I can't overload `process(List<String>)` with `process(List<Integer>)`: after erasure they're the same method. It was done for backward compatibility with pre-Java 5 code.",
            },
            {
              question: "What are bridge methods?",
              answer: "Small methods the compiler generates so overriding still works after erasure. If `class Price implements Comparable<Price>` has `compareTo(Price p)`, erasure means the interface method is `compareTo(Object o)`. The compiler adds a hidden `compareTo(Object)` that casts and calls `compareTo(Price)`. They show up in `javap` and stack traces.",
            },
            {
              question: "What do `? extends T` and `? super T` mean? (PECS)",
              answer: "PECS: Producer Extends, Consumer Super.\n\n`List<? extends Number>` is a list I read from. It produces Numbers, so I can read any element as a `Number`, but I can't add to it, because it might really be a `List<Integer>` or a `List<Double>`.\n\n`List<? super Integer>` is a list I write to. It consumes Integers, so I can add an `Integer`, but reading only gives `Object`. `Collections.copy(List<? super T> dest, List<? extends T> src)` uses both.",
            },
            {
              question: "Is `List<Integer>` a subtype of `List<Number>`?",
              answer: "No. Generics are invariant. If it were allowed, I could pass a `List<Integer>` as a `List<Number>`, add a `Double` into it, and corrupt the original list. Arrays are covariant (`Integer[]` is a `Number[]`), which is why that same mistake with arrays compiles and then throws `ArrayStoreException` at runtime.",
            },
          ],
        },
      ],
    },
    {
      title: "Enums",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What can a Java enum do?",
              answer: "Much more than a list of constants. A Java enum is a full class: it can have fields, a private constructor, methods, per-constant behaviour, and it can implement interfaces. `OrderStatus.DELIVERED.isFinal()` is a natural way to put behaviour next to the value.\n\n`EnumMap` and `EnumSet` are very fast collections keyed by an enum, backed by an array and a bit vector. And `values()`, `valueOf(\"DELIVERED\")` and `ordinal()` come for free, though I never store `ordinal()` in a database, because reordering the constants would change it.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "enum OrderStatus {\n    PLACED, PREPARING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED;\n\n    boolean isFinal() {\n        return this == DELIVERED || this == CANCELLED;\n    }\n}",
          title: "An enum with a little behaviour",
        },
        {
          type: "qa",
          items: [
            {
              question: "How does an enum work internally?",
              answer: "The compiler turns it into a `final` class extending `java.lang.Enum`, with one `public static final` field per constant, created in the static initialiser. The JVM runs class initialisation only once, in a thread-safe way, so each constant exists exactly once. That's why an enum is the safest singleton: reflection can't call its constructor, and deserialization returns the existing constant.",
            },
            {
              question: "⭐ How do I write a thread-safe singleton?",
              answer: "The simplest is an enum: `enum AppConfig { INSTANCE; }`. A lazy one uses the holder idiom: a private static nested class holds the instance, and the JVM's class-loading guarantee creates it once, on first use, without any locks.\n\nIf someone asks for double-checked locking, the field must be `volatile`. Without it, another thread could see a reference to a half-constructed object. In Spring I rarely write singletons myself, since beans are singletons per container by default.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "class Registry {\n    private Registry() {}\n    private static class Holder { static final Registry INSTANCE = new Registry(); }\n    static Registry get() { return Holder.INSTANCE; }\n}\n\nclass Cache {\n    private static volatile Cache instance;   // volatile is required\n    static Cache get() {\n        if (instance == null) {\n            synchronized (Cache.class) {\n                if (instance == null) instance = new Cache();\n            }\n        }\n        return instance;\n    }\n}",
          title: "Holder idiom and double-checked locking",
        },
      ],
    },
    {
      title: "Java 9 to 21",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What is a `record`? (Java 16)",
              answer: "A short way to declare an immutable data carrier. `record Point(double lat, double lng) {}` gives me private final fields, a constructor, accessors `lat()` and `lng()`, and `equals`, `hashCode` and `toString` based on all the fields.\n\nI can add methods, static factories, and a compact constructor for validation, like `if (lat < -90 || lat > 90) throw ...`. Records are ideal for DTOs, API responses and map keys. They're a poor fit for JPA entities, which need a no-args constructor, mutability and proxying.",
            },
            {
              question: "What is `var`? (Java 10)",
              answer: "Local-variable type inference: `var orders = new ArrayList<Order>();`. The compiler works out the type from the right-hand side, and the variable is still statically typed; it's not JavaScript's `var`.\n\nIt only works for local variables with an initialiser, and in loops and lambda parameters. Not fields, method parameters or return types. I use it when the type is obvious from the right-hand side and spell it out when it isn't.",
            },
            {
              question: "What are switch expressions? (Java 14)",
              answer: "A `switch` that returns a value and uses arrows. There's no fall-through, so no forgotten `break`. Several labels can share one arrow (`case SAT, SUN ->`), `yield` returns a value from a block, and for an enum the compiler checks that every case is covered.",
            },
          ],
        },
        {
          type: "code",
          language: "java",
          code: "int deliveryFee = switch (zone) {\n    case CITY -> 30;\n    case SUBURB, AIRPORT -> 60;\n    case OUTSTATION -> {\n        logLongDistance();\n        yield 150;\n    }\n};",
          title: "A switch expression",
        },
        {
          type: "qa",
          items: [
            {
              question: "What are text blocks? (Java 15)",
              answer: "Multi-line string literals between `\"\"\"` markers. They keep SQL, JSON and HTML readable without `\\n` and `+` everywhere, and they strip the common indentation automatically.",
            },
            {
              question: "What are sealed classes? (Java 17)",
              answer: "A way to say exactly which classes may extend or implement a type: `sealed interface Payment permits Cash, Card, Upi {}`. Nobody else can add a fourth kind.\n\nThe pay-off comes with `switch` pattern matching: the compiler knows every possible case, so a `switch` over a `Payment` needs no `default`. If I later add `Wallet` to the permits list, every switch that misses it stops compiling, which is exactly what I want.",
            },
            {
              question: "What is pattern matching? (Java 16 to 21)",
              answer: "For `instanceof` (Java 16): `if (shape instanceof Circle c) { return c.radius(); }`, with no separate cast line.\n\nFor `switch` (Java 21): `case Circle c -> ...`, `case Square s -> ...`, plus guards like `case Circle c when c.radius() > 10 -> ...`, and `case null`.\n\nRecord patterns (Java 21) take records apart inline: `case Point(double x, double y) -> ...`. Together with sealed types, it's a clean way to handle \"one of these kinds\" data.",
            },
            {
              question: "What are virtual threads? (Java 21)",
              answer: "Very lightweight threads managed by the JVM instead of the operating system. A normal platform thread is like a full-time waiter who stands next to the table while the kitchen cooks. A virtual thread is a waiter who takes the order, goes to serve other tables while the food cooks, and comes back when it's ready.\n\nTechnically, when a virtual thread blocks on I/O, it unmounts from its carrier OS thread, and the carrier runs another virtual thread. So I can have a million of them, and simple blocking code scales like async code.\n\nThey help with I/O-heavy work, like many requests waiting on HTTP or the database. They don't help CPU-bound work. Watch for pinning: before JDK 24, blocking inside `synchronized` held on to the carrier. Heavy `ThreadLocal` use costs memory per thread. And they don't add database connections; a million virtual threads still share a pool of, say, 10.",
            },
            {
              question: "Which Java versions are LTS?",
              answer: "8, 11, 17, 21 and 25. Most production systems I see run 17 or 21 now.",
            },
          ],
        },
      ],
    },
    {
      title: "Internals Interviewers Like",
      blocks: [
        {
          type: "qa",
          items: [
            {
              question: "What does autoboxing compile to? Why is `Integer` 127 == 127 but 128 != 128?",
              answer: "`Integer x = 127` compiles to `Integer.valueOf(127)`, and `valueOf` returns cached objects for -128 to 127 (the `IntegerCache`). So two boxed 127s are the same object and `==` is true. 128 is outside the cache, so each `valueOf` makes a new object and `==` is false.\n\nThe upper limit can be raised with `-XX:AutoBoxCacheMax`, which is one more reason to compare wrappers with `equals`, never `==`. Unboxing is `x.intValue()`, which is why unboxing a null `Integer` throws a `NullPointerException`.",
            },
            {
              question: "How does `switch` on a `String` work?",
              answer: "The compiler switches on `s.hashCode()`, which is fast integer matching, and inside each case calls `equals()` to make sure it isn't just a hash collision. Then it jumps to the real case body. A null string throws a `NullPointerException` in the old switch, since `hashCode()` is called on it.",
            },
            {
              question: "How does the enhanced `for` loop work?",
              answer: "On a collection, `for (Order o : orders)` becomes `Iterator<Order> it = orders.iterator(); while (it.hasNext()) { Order o = it.next(); ... }`. That's why removing from the list inside it trips the iterator's `modCount` check and throws `ConcurrentModificationException`. On an array it becomes a plain index loop.",
            },
            {
              question: "How are lambdas implemented?",
              answer: "Not as anonymous classes. The compiler moves the lambda body into a private method in the same class and emits an `invokedynamic` instruction where the lambda is created.\n\nThe first time that line runs, the JVM calls a bootstrap method, `LambdaMetafactory`, which generates a small class implementing the functional interface on the fly and links the call site. After that, the call site is fast. A lambda that captures nothing is created once and reused, so it costs almost nothing.",
            },
            {
              question: "What does the compiler generate for a `record`?",
              answer: "A `final` class extending `java.lang.Record`, with private final fields, a canonical constructor, one accessor per component, and `equals`, `hashCode` and `toString` built from all components (through `invokedynamic` and `ObjectMethods`). I can see it all with `javap -p`.",
            },
            {
              question: "What is the order of initialisation when I create an object of a subclass?",
              answer: "Once, at class initialisation: the parent's static fields and static blocks, then the child's. Then for every `new`: the parent's instance fields and instance blocks, then the parent constructor, then the child's instance fields and blocks, then the child constructor.\n\nA trap: if the parent constructor calls an overridden method, the child's version runs before the child's fields are set, so it sees nulls and zeros.",
            },
          ],
        },
      ],
    },
    {
      title: "Output and Trick Questions",
      blocks: [
        {
          type: "paragraph",
          text: "All of these come from one program, compiled and run on JDK 21. I try to predict each line before reading the output.",
        },
        {
          type: "code",
          language: "java",
          code: "static int pick() {\n    try { return 1; } finally { System.out.println(\"finally runs\"); }\n}\n\npublic static void main(String[] args) {\n    Integer a = 127, b = 127;\n    Integer c = 128, d = 128;\n    System.out.println(a == b);\n    System.out.println(c == d);\n    System.out.println(c.equals(d));\n\n    String s1 = \"hi\", s2 = \"hi\", s3 = new String(\"hi\");\n    System.out.println(s1 == s2);\n    System.out.println(s1 == s3);\n    System.out.println(s1 == s3.intern());\n\n    System.out.println(\"a\" + 1 + 2);\n    System.out.println(1 + 2 + \"a\");\n    System.out.println('a' + 1);\n    System.out.println(0.1 + 0.2);\n\n    int i = 5;\n    int j = i++ + ++i;\n    System.out.println(j + \" \" + i);\n\n    System.out.println(pick());\n}",
          title: "Tricks.java",
        },
        {
          type: "output",
          text: "true\nfalse\ntrue\ntrue\nfalse\ntrue\na12\n3a\n98\n0.30000000000000004\n12 7\nfinally runs\n1",
        },
        {
          type: "qa",
          items: [
            {
              question: "Walk me through the output above.",
              answer: "`a == b` is true because 127 is inside the Integer cache. `c == d` is false because 128 isn't, so they're two objects; `equals` is true.\n\n`s1 == s2` is true: the same pooled literal. `s1 == s3` is false, since `new String` makes a heap object. `s3.intern()` returns the pooled copy, so that comparison is true.\n\n`\"a\" + 1 + 2` is evaluated left to right; once a string is involved, everything after it is appended, so `a12`. `1 + 2 + \"a\"` adds the numbers first, giving `3a`. `'a' + 1` is char arithmetic, so 97 + 1 = 98.\n\n`0.1 + 0.2` shows binary floating point can't represent 0.1 exactly, which is why money uses `BigDecimal`. `i++ + ++i` is 5 (then i becomes 6) plus 7 (i is incremented first), so 12, and i ends at 7.\n\n`pick()` prints \"finally runs\" and then returns 1: `finally` runs before the method actually returns, but it can't change a primitive value that was already computed.",
            },
            {
              question: "What does `m(null)` call if there's `m(Object)` and `m(String)`?",
              answer: "`m(String)`, because the compiler picks the most specific type that fits, and `String` is more specific than `Object`. With `m(String)` and `m(Integer)` both present, `m(null)` doesn't compile, since neither is more specific: \"reference to m is ambiguous\".",
            },
            {
              question: "Can a static method be called through a null reference?",
              answer: "Yes. `Car car = null; car.staticMethod();` works, because static calls are resolved from the reference type at compile time and the object is never used. It's confusing code, and compilers warn about it, but it doesn't throw.",
            },
            {
              question: "`Parent p = new Child(); p.staticMethod();` calls which version?",
              answer: "The `Parent` version. Static methods are hidden, not overridden, and the choice comes from the reference type `Parent`. For an instance method it would be the `Child` version, because that's chosen from the actual object.",
            },
            {
              question: "What happens with a `switch` without `break`?",
              answer: "It falls through: after the matching case, every case below it runs too, until a `break` or the end. Classic arrow-style `->` cases in Java 14+ never fall through.",
            },
            {
              question: "Does a `HashSet` of my own class remove duplicates?",
              answer: "Only if the class overrides `equals` and `hashCode`. Without them, the defaults compare object identity, so two objects with identical fields are both kept.",
            },
          ],
        },
      ],
    },
    {
      title: "Quick Revision",
      blocks: [
        {
          type: "diagram",
          text: "OOP           Encapsulation | Abstraction | Inheritance | Polymorphism\n              overload = compile time, same name new params\n              override = runtime, same signature, @Override\n              static/private/final methods: NOT overridden (static is hidden)\nPASS          always by value; objects -> copy of the reference\nSTATIC        one per class; static mutable field = shared by all threads\nFINAL         final var / method / class; final ref != immutable object\nIMMUTABLE     final class, private final fields, no setters, copy mutable in/out\nEQUALS        equal -> same hashCode (not the reverse); override BOTH\nSTRING        immutable, pooled, hash cached; StringBuilder in loops\n              new String(\"x\") -> up to 2 objects; intern() -> pooled copy\nEXCEPTIONS    Throwable > Error | Exception > RuntimeException (unchecked)\n              finally almost always runs; return in finally wins (bad)\n              try-with-resources closes in reverse, keeps suppressed\nGENERICS      compile-time only (erasure); PECS: extends = read, super = write\n              List<Integer> is NOT a List<Number>\nENUM          full class; enum = safest singleton\nJAVA 9-21     record | var | switch -> + yield | text blocks \"\"\" |\n              sealed permits | pattern matching | virtual threads (I/O work)\nINTERNALS     Integer cache -128..127 | String switch = hashCode + equals\n              lambda = private method + invokedynamic + LambdaMetafactory\nTRICKS        \"a\"+1+2 = a12 | 1+2+\"a\" = 3a | 'a'+1 = 98 | 0.1+0.2 != 0.3",
          caption: "Core Java in one screen",
        },
      ],
    },
  ],
};
