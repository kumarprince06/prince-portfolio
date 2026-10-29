import type { Lesson } from "../types";

export const lambdaExpressions: Lesson = {
  slug: "lambda-expressions",
  date: "2026-10-29",
  title: "Lambda Expressions",
  description:
    "What a Java 8 lambda really is: a short way to pass behaviour around, how it captures variables, what `this` means inside it, and what `javac` and the JVM actually build from it, down to `invokedynamic`, `LambdaMetafactory` and the hidden class behind every lambda.",
  tags: ["Java 8", "Lambdas", "Functional Programming", "JVM", "Bytecode"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "When I book a cab, I don't teach the driver how to drive. I just tell them one small thing: \"drop me at the station\". The driver already knows the rest, and does my bit when the time comes.",
        },
        {
          type: "paragraph",
          text: "A **lambda** is that small instruction written in Java. It's a tiny piece of code, like `city -> System.out.println(city)`, that I hand to a method so the method can run it for me. The part before the arrow `->` is what comes in, and the part after it is what to do with it.",
        },
        {
          type: "paragraph",
          text: "I use lambdas because they save me from writing a whole class just to pass one line of logic. Sorting, looping, filtering and button clicks all become one short line.",
        },
        {
          type: "code",
          language: "java",
          code: `List<String> cities = List.of("Pune", "Delhi", "Kolkata");
cities.forEach(city -> System.out.println("Cab booked to " + city));`,
        },
        {
          type: "output",
          text: `Cab booked to Pune
Cab booked to Delhi
Cab booked to Kolkata`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "A lambda is a small piece of behaviour I pass to a method: input on the left of `->`, what to do on the right.",
        },
      ],
    },
    {
      title: "What Lambda Expressions Are",
      blocks: [
        {
          type: "paragraph",
          text: "Picture a tea stall. I don't walk in and hand the owner a new employee who knows how to make my tea. I just say \"less sugar, extra ginger\". That's an instruction, a little piece of behaviour, and the stall runs it when my turn comes.",
        },
        {
          type: "paragraph",
          text: "Before Java 8, Java had no short way to hand over a piece of behaviour like that. If a method wanted \"how to compare two orders\" or \"what to do when the button is clicked\", I had to write a whole class, usually an anonymous one, just to carry one method. Five lines of ceremony for one line of logic.",
        },
        {
          type: "paragraph",
          text: "A **lambda expression** is that one line on its own: a block of code with parameters, written right where it's needed, that I can pass to a method or store in a variable. `(a, b) -> a.length() - b.length()` means \"given two strings, compare them by length\". No class name, no method name, no `new`.",
        },
        {
          type: "paragraph",
          text: "The catch, and the thing this lesson spends most of its time on, is that Java still has no \"function\" type. A lambda is always converted into an object that implements an interface with exactly one abstract method, a **functional interface**. Where that object comes from is the interesting part, and it's nothing like an anonymous class underneath.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/lambda-before-after.svg",
          alt: "Side by side: a six-line anonymous Runnable class printing Placed, and the same Runnable written as a one-statement lambda",
          caption: "The anonymous class and the lambda do the same thing; the lambda drops the boilerplate because `Runnable` has only one abstract method.",
        },
        {
          type: "paragraph",
          text: "Anonymous inner classes arrived in Java 1.1 (1997), and for seventeen years they were the only way to pass behaviour. Every Swing button listener, every `Comparator`, every `Runnable` for a thread was one. They work, but they're noisy, and each one becomes a separate `.class` file on disk.",
        },
        {
          type: "list",
          items: [
            "**Around 2006 to 2008:** several closure proposals for Java (BGGA, CICE, FCM) argued about how far to go. None made it into Java 7.",
            "**Java 7 (2011):** `invokedynamic` was added to the JVM (JSR 292), mainly for dynamic languages like JRuby. It turned out to be exactly the tool lambdas needed.",
            "**Java 8 (March 2014):** Project Lambda, JSR 335, led by Brian Goetz, shipped lambdas, method references, default methods in interfaces, `java.util.function` and the Streams API, all designed together.",
            "**Java 11:** `var` allowed for lambda parameters, so they can carry annotations: `(@NonNull var name) -> ...`.",
            "**Java 15:** the classes generated for lambdas became **hidden classes** (JEP 371). Before that HotSpot used an internal `Unsafe.defineAnonymousClass`.",
            "**Java 22:** unnamed variables (JEP 456), so a parameter I don't use can be written `_`, as in `(_, value) -> value`.",
          ],
        },
        {
          type: "paragraph",
          text: "Here's the change in one program. Both blocks sort the same list of tea stall orders; one with the Java 7 ceremony, one with a lambda:",
        },
        {
          type: "code",
          language: "java",
          title: "BeforeAfter.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class BeforeAfter {
    public static void main(String[] args) {
        List<String> orders = new ArrayList<>(List.of("masala chai", "samosa", "bun"));

        // Java 7: a whole anonymous class to say "shortest name first"
        Collections.sort(orders, new Comparator<String>() {
            @Override
            public int compare(String a, String b) {
                return a.length() - b.length();
            }
        });
        System.out.println(orders);

        // Java 8: the same idea as a lambda
        orders.sort((a, b) -> b.length() - a.length());   // longest first
        System.out.println(orders);
    }
}`,
        },
        {
          type: "output",
          text: `[bun, samosa, masala chai]
[masala chai, samosa, bun]`,
        },
        {
          type: "paragraph",
          text: "Six lines became one. After compiling, the folder also had a `BeforeAfter$1.class` for the anonymous class. The lambda left no extra file behind, which is the first hint that it's built differently.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a lambda as a **sticky note handed to a cab driver**.",
        },
        {
          type: "list",
          items: [
            "The note says what to do: \"drop me at the second gate, not the first\". That's the lambda body.",
            "The driver already has a slot for such notes: the app has a \"special instructions\" field. That slot is the functional interface. The note only makes sense because there's a slot of the right shape waiting for it.",
            "The note can mention things from where I wrote it, like \"my building is the blue one\". That's **capturing**: the lambda can use local variables from around it. But I wrote it in pen. If I change my mind about the building after handing it over, the note doesn't update. That's why Java insists captured variables don't change.",
            "The driver doesn't read the note the moment I hand it over. He reads it at the gate. A lambda runs when someone calls it, not where it's written.",
          ],
        },
        {
          type: "paragraph",
          text: "The anonymous-class version is hiring a tiny assistant to ride along and say \"second gate\" at the right moment. Same result, but now there's a whole extra person (a class) in the car.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "A lambda needs a target type",
        },
        {
          type: "paragraph",
          text: "A lambda on its own has no type. `() -> \"cab booked\"` could be a `Supplier<String>`, a `Callable<String>`, or any other interface whose single method takes nothing and returns a `String`. The compiler works out which one from where the lambda appears: the variable it's assigned to, the method parameter it's passed to, or a cast. That's called the **target type**.",
        },
        {
          type: "code",
          language: "java",
          title: "TargetType.java",
          code: `import java.util.concurrent.Callable;
import java.util.function.Supplier;

public class TargetType {
    public static void main(String[] args) throws Exception {
        Supplier<String> s = () -> "cab booked";
        Callable<String> c = () -> "cab booked";       // same text, different type
        System.out.println(s.get() + " / " + c.call());
        System.out.println(s.getClass().getInterfaces()[0].getSimpleName());
        System.out.println(c.getClass().getInterfaces()[0].getSimpleName());
    }
}`,
        },
        {
          type: "output",
          text: `cab booked / cab booked
Supplier
Callable`,
        },
        {
          type: "paragraph",
          text: "Exactly the same characters, two different objects implementing two different interfaces. The lambda text is the same; the target decides what it becomes. Without a target, it's a compile error:",
        },
        {
          type: "code",
          language: "java",
          title: "ObjectTarget.java",
          code: `public class ObjectTarget {
    public static void main(String[] args) {
        Object task = () -> System.out.println("ring the bell");
        var other = () -> 42;
    }
}`,
        },
        {
          type: "output",
          text: `ObjectTarget.java:3: error: incompatible types: Object is not a functional interface
        Object task = () -> System.out.println("ring the bell");
                      ^
ObjectTarget.java:4: error: cannot infer type for local variable other
        var other = () -> 42;
            ^
  (lambda expression needs an explicit target-type)
2 errors`,
        },
        {
          type: "paragraph",
          text: "`Object` has no single abstract method to fill, and `var` gives the compiler nothing to infer from. A cast fixes the first one: `Object task = (Runnable) () -> ...`.",
        },
        {
          type: "heading",
          text: "The parameter and return types come from the interface",
        },
        {
          type: "paragraph",
          text: "Once the target is known, the compiler copies the shape of its one abstract method onto the lambda. For `Comparator<String>`, that method is `int compare(String, String)`, so in `(a, b) -> a.length() - b.length()` both `a` and `b` are `String`s and the body must produce an `int`. I almost never write parameter types, because the interface already says them.",
        },
        {
          type: "heading",
          text: "Capturing: effectively final",
        },
        {
          type: "paragraph",
          text: "A lambda can read local variables from the method around it, but only ones that are **final or effectively final**: assigned once and never changed. \"Effectively final\" (new in Java 8) means I don't have to write the `final` keyword; the compiler checks that I could have.",
        },
        {
          type: "code",
          language: "java",
          title: "NotFinal.java",
          code: `public class NotFinal {
    public static void main(String[] args) {
        int cups = 0;
        Runnable pour = () -> cups++;
        pour.run();
    }
}`,
        },
        {
          type: "output",
          text: `NotFinal.java:4: error: local variables referenced from a lambda expression must be final or effectively final
        Runnable pour = () -> cups++;
                              ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Changing the variable after the lambda is written is just as illegal, even though the lambda only reads it:",
        },
        {
          type: "code",
          language: "java",
          title: "NotFinal2.java",
          code: `public class NotFinal2 {
    public static void main(String[] args) {
        String stall = "Ravi's";
        Runnable shout = () -> System.out.println(stall + " tea");
        stall = "Asha's";
        shout.run();
    }
}`,
        },
        {
          type: "output",
          text: `NotFinal2.java:4: error: local variables referenced from a lambda expression must be final or effectively final
        Runnable shout = () -> System.out.println(stall + " tea");
                                                  ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The reason is the sticky note in pen. The lambda gets a **copy** of the value when it's created (I'll show that copy as a field in the generated class below). If the variable could change afterwards, the copy and the original would quietly disagree, and with threads it would be worse. Java avoids the whole question by forbidding the change.",
        },
        {
          type: "callout",
          tone: "note",
          title: "Fields are different",
          text: "The rule is only for local variables and parameters. A lambda can read and write instance fields and static fields freely, because it doesn't copy them. It reaches them through `this` or the class. That's also why fields are where shared-state bugs in lambdas come from.",
        },
        {
          type: "heading",
          text: "this means the enclosing object",
        },
        {
          type: "paragraph",
          text: "A lambda doesn't start a new scope the way a class does. Inside it, `this` and names mean exactly what they mean in the code around it. Inside an anonymous class, `this` is the anonymous object:",
        },
        {
          type: "code",
          language: "java",
          title: "WhoIsThis.java",
          code: `public class WhoIsThis {
    private final String name = "TeaStall";

    void check() {
        Runnable anon = new Runnable() {
            @Override
            public void run() {
                System.out.println("anonymous: " + this.getClass().getName());
            }
        };
        Runnable lambda = () -> System.out.println("lambda:    " + this.name);
        anon.run();
        lambda.run();
    }

    public static void main(String[] args) {
        new WhoIsThis().check();
    }
}`,
        },
        {
          type: "output",
          text: `anonymous: WhoIsThis$1
lambda:    TeaStall`,
        },
        {
          type: "paragraph",
          text: "The same \"no new scope\" rule means a lambda parameter can't reuse the name of a local variable that's already in scope:",
        },
        {
          type: "code",
          language: "java",
          title: "Shadow.java",
          code: `import java.util.function.Function;

public class Shadow {
    public static void main(String[] args) {
        String order = "chai";
        Function<String, String> f = order -> order.toUpperCase();
    }
}`,
        },
        {
          type: "output",
          text: `Shadow.java:6: error: variable order is already defined in method main(String[])
        Function<String, String> f = order -> order.toUpperCase();
                                     ^
1 error`,
        },
        {
          type: "table",
          headers: ["", "Anonymous class", "Lambda"],
          rows: [
            ["What `this` means", "The anonymous object", "The enclosing object"],
            ["Can shadow outer locals", "Yes", "No, compile error"],
            ["Interfaces it can implement", "Any interface, or extend a class", "Only a functional interface"],
            ["Can have fields and state", "Yes", "No, only captured values"],
            ["Extra `.class` file on disk", "Yes, `Outer$1.class`", "No, generated at runtime"],
            ["Object per evaluation", "Always a new one", "Non-capturing: one shared instance on HotSpot"],
          ],
        },
        {
          type: "heading",
          text: "Checked exceptions",
        },
        {
          type: "paragraph",
          text: "A lambda's body can only throw the checked exceptions its interface method declares. `Runnable.run()` and `Consumer.accept()` declare none, so this fails:",
        },
        {
          type: "code",
          language: "java",
          title: "CheckedEx.java",
          code: `import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class CheckedEx {
    public static void main(String[] args) {
        List<String> files = List.of("menu.txt", "prices.txt");
        files.forEach(name -> System.out.println(Files.readString(Path.of(name))));
    }
}`,
        },
        {
          type: "output",
          text: `CheckedEx.java:8: error: unreported exception IOException; must be caught or declared to be thrown
        files.forEach(name -> System.out.println(Files.readString(Path.of(name))));
                                                                 ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`main` already being allowed to throw doesn't help, because the exception would leave `accept`, not `main`. The options are a `try`/`catch` inside the lambda (often rethrowing as `UncheckedIOException`), or an interface whose method declares the exception, like `Callable.call() throws Exception`. The Functional Interfaces lesson builds one.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/lambda-invokedynamic.svg",
          alt: "Flow from Main.java to Main.class with a private lambda$main$0 method and invokedynamic, then on first call LambdaMetafactory.metafactory creates a hidden class implementing Runnable; non-capturing lambdas reuse one instance, capturing lambdas get a new instance with fields like arg$1",
          caption: "javac emits a private `lambda$main$0` and an `invokedynamic`; on the first call `LambdaMetafactory` spins a hidden class, and later calls reuse the linked call site.",
        },
        {
          type: "paragraph",
          text: "My old notes said \"a lambda is just an anonymous class with shorter syntax\". That's how it looks from outside, and it's wrong underneath. I compiled a class with three lambdas, one that captures nothing, one that captures a local, and one that uses `this`:",
        },
        {
          type: "code",
          language: "java",
          title: "LambdaMain.java",
          code: `import java.util.function.IntUnaryOperator;
import java.util.function.Supplier;

public class LambdaMain {
    private final String prefix = "trip-";

    Supplier<String> idMaker(int seq) {
        return () -> prefix + seq;               // uses this.prefix and seq
    }

    public static void main(String[] args) {
        Runnable hello = () -> System.out.println("hello from a lambda");
        hello.run();

        int base = 50;
        IntUnaryOperator fare = km -> base + km * 12;   // captures base
        System.out.println(fare.applyAsInt(10));

        System.out.println(new LambdaMain().idMaker(7).get());
    }
}`,
        },
        {
          type: "output",
          text: `hello from a lambda
170
trip-7`,
        },
        {
          type: "paragraph",
          text: "The first surprise: `javac` produced exactly one file, `LambdaMain.class`. No `LambdaMain$1.class`. So where did the lambdas go?",
        },
        {
          type: "heading",
          text: "Step 1: the body becomes a private method",
        },
        {
          type: "code",
          language: "bash",
          code: "javac LambdaMain.java && javap -c -p LambdaMain",
        },
        {
          type: "output",
          text: `  private static int lambda$main$2(int, int);
    Code:
       0: iload_0
       1: iload_1
       2: bipush        12
       4: imul
       5: iadd
       6: ireturn

  private static void lambda$main$1();
    Code:
       0: getstatic     #31                 // Field java/lang/System.out:Ljava/io/PrintStream;
       3: ldc           #63                 // String hello from a lambda
       5: invokevirtual #60                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
       8: return

  private java.lang.String lambda$idMaker$0(int);
    Code:
       0: iload_1
       1: invokedynamic #65,  0             // InvokeDynamic #3:makeConcatWithConstants:(I)Ljava/lang/String;
       6: areturn`,
        },
        {
          type: "paragraph",
          text: "Each lambda body was moved into a new private method of `LambdaMain`, named `lambda$<enclosing method>$<counter>`. With `javap -v` they're also flagged `ACC_SYNTHETIC`, meaning the compiler made them up. Three details I read from this:",
        },
        {
          type: "list",
          items: [
            "`km -> base + km * 12` became `lambda$main$2(int, int)`. It has **two** parameters, not one. The captured `base` was turned into an extra parameter, placed **first**, and the lambda's own `km` comes after it. That's what `iload_0` (base) and `iload_1` (km) are.",
            "`() -> System.out.println(...)` captures nothing, so `lambda$main$1()` takes nothing.",
            "The lambda in `idMaker` uses `prefix`, a field, so its method is **not** static. It's an instance method, `this` is its slot 0, and `seq` arrives as a normal parameter. A lambda only drags `this` along when its body actually uses it.",
          ],
        },
        {
          type: "paragraph",
          text: "The counter is class-wide, by the way, not per method: `idMaker`'s lambda got `0` and `main`'s got `1` and `2`. Those names show up in stack traces, so it's worth recognising them.",
        },
        {
          type: "heading",
          text: "Step 2: the lambda expression becomes invokedynamic",
        },
        {
          type: "paragraph",
          text: "Where the lambda was written, there's no `new`. There's an `invokedynamic`:",
        },
        {
          type: "output",
          text: `  public static void main(java.lang.String[]);
    Code:
       0: invokedynamic #19,  0             // InvokeDynamic #1:run:()Ljava/lang/Runnable;
       5: astore_1
       6: aload_1
       7: invokeinterface #23,  1           // InterfaceMethod java/lang/Runnable.run:()V
      12: bipush        50
      14: istore_2
      15: iload_2
      16: invokedynamic #27,  0             // InvokeDynamic #2:applyAsInt:(I)Ljava/util/function/IntUnaryOperator;
      21: astore_3
      ...

  java.util.function.Supplier<java.lang.String> idMaker(int);
    Code:
       0: aload_0
       1: iload_1
       2: invokedynamic #15,  0             // InvokeDynamic #0:get:(LLambdaMain;I)Ljava/util/function/Supplier;
       7: areturn`,
        },
        {
          type: "paragraph",
          text: "Read the descriptor on each `invokedynamic` as \"a factory method\": what goes in is what the lambda captures, and what comes out is the interface object.",
        },
        {
          type: "list",
          items: [
            "`run:()Ljava/lang/Runnable;` takes nothing and returns a `Runnable`. Nothing captured.",
            "`applyAsInt:(I)Ljava/util/function/IntUnaryOperator;` takes one `int` (the value of `base`, pushed by `iload_2` just before) and returns an `IntUnaryOperator`. That `iload_2` is the moment the value is copied. Changing `base` afterwards couldn't affect the lambda, which is exactly why the language forbids it.",
            "`get:(LLambdaMain;I)Ljava/util/function/Supplier;` takes `this` (`aload_0`) and `seq` (`iload_1`) and returns a `Supplier`.",
          ],
        },
        {
          type: "heading",
          text: "Step 3: the bootstrap method is LambdaMetafactory",
        },
        {
          type: "paragraph",
          text: "An `invokedynamic` doesn't know what to call on its own. The first time it runs, the JVM calls a **bootstrap method** listed in the class file, and that bootstrap returns a `CallSite` that the instruction stays linked to from then on. `javap -v` shows the table:",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -v -p LambdaMain     # only the end of the output",
        },
        {
          type: "output",
          text: `BootstrapMethods:
  0: #83 REF_invokeStatic java/lang/invoke/LambdaMetafactory.metafactory:(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;Ljava/lang/invoke/MethodType;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/CallSite;
    Method arguments:
      #90 ()Ljava/lang/Object;
      #91 REF_invokeVirtual LambdaMain.lambda$idMaker$0:(I)Ljava/lang/String;
      #94 ()Ljava/lang/String;
  1: #83 REF_invokeStatic java/lang/invoke/LambdaMetafactory.metafactory:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #96 ()V
      #97 REF_invokeStatic LambdaMain.lambda$main$1:()V
      #96 ()V
  2: #83 REF_invokeStatic java/lang/invoke/LambdaMetafactory.metafactory:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #100 (I)I
      #101 REF_invokeStatic LambdaMain.lambda$main$2:(II)I
      #100 (I)I
  3: #104 REF_invokeStatic java/lang/invoke/StringConcatFactory.makeConcatWithConstants:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #110 trip-\\u0001`,
        },
        {
          type: "paragraph",
          text: "(I shortened the repeated `metafactory` descriptor to `(...)`.) For each lambda, `metafactory` gets three extra arguments from the class file:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "The erased shape of the interface method: `()Ljava/lang/Object;` for `Supplier.get`, because after generics are erased `get` returns `Object`.",
            "A **method handle** to the body: `REF_invokeStatic LambdaMain.lambda$main$2`, or `REF_invokeVirtual` for the instance one.",
            "The real, specialised shape: `()Ljava/lang/String;`. The generated code uses this to insert the right casts.",
          ],
        },
        {
          type: "paragraph",
          text: "Bootstrap 3 is unrelated to lambdas: it's the `prefix + seq` string concatenation inside the lambda body, which since Java 9 also goes through `invokedynamic`.",
        },
        {
          type: "heading",
          text: "Step 4: a class is spun at runtime",
        },
        {
          type: "paragraph",
          text: "`LambdaMetafactory` generates a small class at runtime that implements the interface and forwards to the private method. On JDK 21 the JVM can dump those classes to disk with a system property (on Java 8 it was `-Djdk.internal.lambda.dumpProxyClasses=<dir>`). I used a one-lambda program:",
        },
        {
          type: "code",
          language: "java",
          title: "Hello.java",
          code: `public class Hello {
    public static void main(String[] args) {
        Runnable r = () -> System.out.println("hello");
        r.run();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Djdk.invoke.LambdaMetafactory.dumpProxyClassFiles=true Hello
javap -c -p DUMP_LAMBDA_PROXY_CLASS_FILES/*.class`,
        },
        {
          type: "output",
          text: `hello
final class Hello$$Lambda implements java.lang.Runnable {
  private Hello$$Lambda();
    Code:
       0: aload_0
       1: invokespecial #10                 // Method java/lang/Object."<init>":()V
       4: return

  public void run();
    Code:
       0: invokestatic  #16                 // Method Hello.lambda$main$0:()V
       3: return
}`,
        },
        {
          type: "paragraph",
          text: "There it is: a real class, `final`, implementing `Runnable`, whose `run()` is a single `invokestatic` into the private method `javac` made. So a lambda **is** backed by a class, but one generated in memory on first use, not written by `javac`. The capturing one shows where the captured value lives:",
        },
        {
          type: "code",
          language: "java",
          title: "Fare.java",
          code: `import java.util.function.IntUnaryOperator;

public class Fare {
    public static void main(String[] args) {
        int base = 50;
        IntUnaryOperator fare = km -> base + km * 12;
        System.out.println(fare.applyAsInt(10));
    }
}`,
        },
        {
          type: "output",
          text: `170
final class Fare$$Lambda implements java.util.function.IntUnaryOperator {
  private final int arg$1;

  private Fare$$Lambda(int);
    Code:
       0: aload_0
       1: invokespecial #13                 // Method java/lang/Object."<init>":()V
       4: aload_0
       5: iload_1
       6: putfield      #15                 // Field arg$1:I
       9: return

  public int applyAsInt(int);
    Code:
       0: aload_0
       1: getfield      #15                 // Field arg$1:I
       4: iload_1
       5: invokestatic  #23                 // Method Fare.lambda$main$0:(II)I
       8: ireturn
}`,
        },
        {
          type: "paragraph",
          text: "The captured `base` is a `private final int arg$1` field, set once in the constructor. Every `applyAsInt(km)` call loads that field and `km`, and calls `lambda$main$0(base, km)`. The `final` on the field is the runtime half of \"effectively final\": the copy can never change.",
        },
        {
          type: "heading",
          text: "Capturing versus non-capturing at runtime",
        },
        {
          type: "paragraph",
          text: "Because a non-capturing lambda has no fields, every instance would be identical, so HotSpot creates one and hands back the same object every time that line runs. A capturing lambda needs a new object per evaluation, because each one holds its own copy:",
        },
        {
          type: "code",
          language: "java",
          title: "SameInstance.java",
          code: `import java.util.function.Supplier;

public class SameInstance {
    public static void main(String[] args) {
        Supplier<String> first = null, firstAgain = null;
        Supplier<String> mine = null, mineAgain = null;
        for (int i = 0; i < 2; i++) {
            Supplier<String> plain = () -> "tea";            // captures nothing
            int cup = i;
            Supplier<String> withCup = () -> "tea #" + cup;  // captures cup
            if (i == 0) { first = plain; mine = withCup; }
            else        { firstAgain = plain; mineAgain = withCup; }
        }
        System.out.println("non-capturing, same object? " + (first == firstAgain));
        System.out.println("capturing,     same object? " + (mine == mineAgain));
        System.out.println(mine.get() + ", " + mineAgain.get());
        System.out.println("class: " + first.getClass().getName());
        System.out.println("synthetic? " + first.getClass().isSynthetic()
                + ", hidden? " + first.getClass().isHidden());
    }
}`,
        },
        {
          type: "output",
          text: `non-capturing, same object? true
capturing,     same object? false
tea #0, tea #1
class: SameInstance$$Lambda/0x00007eb134000a08
synthetic? true, hidden? true`,
        },
        {
          type: "paragraph",
          text: "The hex part of the class name is an address and changed on every run (the next run printed `0x000076bb18000a08`). The `/` in the name is the giveaway of a **hidden class**: it can't be found by name through a class loader, and it can be unloaded when nothing uses it anymore. On Java 8 the same line printed names like `SameInstance$$Lambda$1/...`.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Don't rely on lambda identity",
          text: "The JLS (15.27.4) deliberately doesn't promise whether evaluating a lambda gives a new object or an existing one. The `true` above is HotSpot behaviour, not a language rule. Never use `==` on lambdas or store them as keys expecting identity to mean anything.",
        },
        {
          type: "heading",
          text: "What happens on the first call, in order",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`javac` moved the body into `private static lambda$main$0(...)` and wrote an `invokedynamic` plus a `BootstrapMethods` entry pointing at `LambdaMetafactory.metafactory`.",
            "The first time that `invokedynamic` runs, the JVM calls `metafactory` with a `Lookup` for the class (so it's allowed to see the private method), the interface method's name and shapes, and a method handle to the body.",
            "`metafactory` (in JDK 21, through `InnerClassLambdaMetafactory`) generates the bytes of a `Hello$$Lambda` class and defines it as a hidden class nested in `Hello`.",
            "It returns a `CallSite`. For a non-capturing lambda, that call site always returns one prebuilt instance; for a capturing one, it calls the generated constructor with the captured values.",
            "The `invokedynamic` is now linked to that call site permanently. Every later run of the same line skips steps 2 to 4.",
          ],
        },
        {
          type: "paragraph",
          text: "Why go to all this trouble instead of generating anonymous classes at compile time? Because the strategy now lives in the JDK, not in every compiled `.class` file. The JDK has changed how it spins lambda classes several times since 2014 (anonymous VM classes, then hidden classes) and not a single library had to be recompiled.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "The shape is always `parameters -> body`. Every form in one place:",
        },
        {
          type: "code",
          language: "java",
          title: "SyntaxTour.java",
          code: `import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.function.Supplier;

public class SyntaxTour {
    public static void main(String[] args) {
        Runnable bell = () -> System.out.println("ding");             // no params
        Function<String, Integer> len = name -> name.length();         // one param, no parens
        BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;   // two params
        BiFunction<Integer, Integer, Integer> mul = (Integer a, Integer b) -> a * b; // typed
        BiFunction<Integer, Integer, Integer> sub = (var a, var b) -> a - b;         // var, Java 11
        Supplier<String> receipt = () -> {                             // block body
            String total = "Rs " + (2 * 15);
            return "Paid " + total;
        };

        bell.run();
        System.out.println(len.apply("samosa"));
        System.out.println(add.apply(2, 3) + " " + mul.apply(2, 3) + " " + sub.apply(2, 3));
        System.out.println(receipt.get());
    }
}`,
        },
        {
          type: "output",
          text: `ding
6
5 6 -1
Paid Rs 30`,
        },
        {
          type: "table",
          headers: ["Form", "Example", "Rule"],
          rows: [
            ["No parameters", "`() -> 42`", "Empty parentheses are required"],
            ["One parameter", "`x -> x * 2`", "Parentheses optional, only when the type is left out"],
            ["Several parameters", "`(a, b) -> a + b`", "Parentheses required"],
            ["Explicit types", "`(String a, String b) -> ...`", "All typed or none typed, no mixing"],
            ["`var` (Java 11)", "`(var a, var b) -> ...`", "All `var` or none; lets me add annotations"],
            ["Expression body", "`x -> x * 2`", "No braces, no `return`, no semicolon"],
            ["Block body", "`x -> { int y = x * 2; return y; }`", "Braces, statements, `return` if non-void"],
          ],
        },
        {
          type: "paragraph",
          text: "One subtle rule: an expression body that's a method call works for both void and non-void targets. `s -> list.add(s)` is fine as a `Consumer<String>` (the `boolean` result is thrown away) and as a `Predicate<String>`. A block body with `return list.add(s);` only fits the second.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "paragraph",
          text: "Most of my lambdas aren't stored in variables at all. They're passed straight into a JDK method that was redesigned for them in Java 8. A cab app's list of fares makes a good playground:",
        },
        {
          type: "code",
          language: "java",
          title: "Examples.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class Examples {
    public static void main(String[] args) throws InterruptedException {
        List<Integer> fares = new ArrayList<>(List.of(120, 45, 300, 80));

        fares.removeIf(f -> f < 100);                       // drop short rides
        System.out.println("long rides: " + fares);

        fares.replaceAll(f -> f + 20);                      // add a night charge
        System.out.println("night fares: " + fares);

        Map<String, List<String>> byCity = new TreeMap<>();
        byCity.computeIfAbsent("Kolkata", city -> new ArrayList<>()).add("ride-1");
        byCity.computeIfAbsent("Kolkata", city -> new ArrayList<>()).add("ride-2");
        byCity.computeIfAbsent("Pune", city -> new ArrayList<>()).add("ride-3");
        byCity.forEach((city, rides) -> System.out.println(city + " -> " + rides));

        Thread worker = new Thread(() -> System.out.println("sending receipt in background"));
        worker.start();
        worker.join();
    }
}`,
        },
        {
          type: "output",
          text: `long rides: [120, 300]
night fares: [140, 320]
Kolkata -> [ride-1, ride-2]
Pune -> [ride-3]
sending receipt in background`,
        },
        {
          type: "list",
          items: [
            "`removeIf` takes a `Predicate`: \"should this one go?\". It replaced the old iterator-and-`remove()` loop.",
            "`replaceAll` takes a `UnaryOperator`: \"what should each element become?\".",
            "`computeIfAbsent` only runs the lambda when the key is missing. The second `\"Kolkata\"` call found the list already there and didn't create a new one. That's the main reason it takes a lambda rather than a ready-made value: the work is skipped when it's not needed.",
            "`Map.forEach` takes a `BiConsumer`, so the lambda gets the key and the value. I used a `TreeMap` so the order is predictable; a `HashMap` would print in hash order.",
            "`new Thread(...)` takes a `Runnable`, the oldest functional interface in Java. It already had exactly one method in 1996, so lambdas worked with it without any change to `Thread`.",
          ],
        },
        {
          type: "paragraph",
          text: "That last point is the one I find neat. Any interface with one abstract method works with lambdas, including ones written long before Java 8: `Runnable`, `Callable`, `Comparator`, `ActionListener`, `FileFilter`.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Expecting return to stop a forEach",
        },
        {
          type: "paragraph",
          text: "A bank queue: I want to stop serving when I reach Ravi. With a lambda, `return` leaves the lambda, which is one customer, not the loop:",
        },
        {
          type: "code",
          language: "java",
          title: "ReturnInForEach.java",
          code: `import java.util.List;

public class ReturnInForEach {
    public static void main(String[] args) {
        List<String> queue = List.of("Asha", "Ravi", "Bo");
        queue.forEach(name -> {
            if (name.equals("Ravi")) {
                return;                      // skips Ravi only, does not stop the loop
            }
            System.out.println("serving " + name);
        });
        System.out.println("queue done");
    }
}`,
        },
        {
          type: "output",
          text: `serving Asha
serving Bo
queue done`,
        },
        {
          type: "paragraph",
          text: "Bo still got served. Given what `javap` showed, it's obvious: the body is a separate method, `lambda$main$0(String)`, and `return` returns from that method. `forEach` simply calls it again for the next element. `break` and `continue` don't even compile inside a lambda. When I need to stop early, I use a plain `for` loop, or a stream with `takeWhile` (Java 9) or `anyMatch`.",
        },
        {
          type: "heading",
          text: "Capturing the classic for-loop counter",
        },
        {
          type: "code",
          language: "java",
          title: "LoopVar.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class LoopVar {
    public static void main(String[] args) {
        List<Runnable> calls = new ArrayList<>();
        for (int token = 1; token <= 3; token++) {
            calls.add(() -> System.out.println("token " + token));
        }
    }
}`,
        },
        {
          type: "output",
          text: `LoopVar.java:8: error: local variables referenced from a lambda expression must be final or effectively final
            calls.add(() -> System.out.println("token " + token));
                                                          ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`token` is one variable that `token++` keeps changing. The fix is a fresh variable inside the body. The enhanced `for` already gives a fresh variable each round, so it works as it is:",
        },
        {
          type: "code",
          language: "java",
          title: "LoopVarFixed.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class LoopVarFixed {
    public static void main(String[] args) {
        List<Runnable> calls = new ArrayList<>();
        for (int token = 1; token <= 3; token++) {
            int myToken = token;                       // a fresh variable each round
            calls.add(() -> System.out.println("token " + myToken));
        }
        for (String name : List.of("Asha", "Ravi")) {  // for-each: fine as it is
            calls.add(() -> System.out.println("name " + name));
        }
        calls.forEach(Runnable::run);
    }
}`,
        },
        {
          type: "output",
          text: `token 1
token 2
token 3
name Asha
name Ravi`,
        },
        {
          type: "paragraph",
          text: "This compile error is actually Java protecting me. In JavaScript before `let`, the same loop famously printed the last value three times.",
        },
        {
          type: "heading",
          text: "The one-element array trick",
        },
        {
          type: "paragraph",
          text: "When the compiler says \"effectively final\", a common workaround is `int[] count = {0};` and then `count[0]++` inside the lambda. It compiles, because the array reference never changes, only its contents. It's fine in a single-threaded test. It's a race the moment the lambda runs on several threads, as in a parallel stream, because `count[0]++` is three separate steps. If I need a counter, `AtomicInteger` or, better, a stream's `count()` or `sum()` says what I mean.",
        },
        {
          type: "heading",
          text: "Overloads that a lambda can't choose between",
        },
        {
          type: "code",
          language: "java",
          title: "Ambig.java",
          code: `import java.util.concurrent.Callable;
import java.util.function.Supplier;

public class Ambig {
    static void run(Supplier<String> job) { System.out.println("Supplier"); }
    static void run(Callable<String> job) { System.out.println("Callable"); }

    public static void main(String[] args) {
        run(() -> "done");
    }
}`,
        },
        {
          type: "output",
          text: `Ambig.java:9: error: reference to run is ambiguous
        run(() -> "done");
        ^
  both method run(Supplier<String>) in Ambig and method run(Callable<String>) in Ambig match
1 error`,
        },
        {
          type: "paragraph",
          text: "Both interfaces take nothing and return a `String`, so the lambda fits both and neither is more specific. A cast picks one: `run((Supplier<String>) () -> \"done\")`. When I design an API, I avoid overloading a method on two functional interfaces of the same shape; I give them different names instead. `ExecutorService.submit` gets away with `Runnable` and `Callable` overloads only because one returns `void` and the other a value.",
        },
        {
          type: "heading",
          text: "Smaller ones",
        },
        {
          type: "list",
          items: [
            "Writing a fifteen-line lambda. If it needs a name to be understood, it should be a private method, passed as a method reference.",
            "Swallowing exceptions to get past the checked-exception error: `catch (IOException e) {}` inside the lambda hides real failures.",
            "Mutating a shared `ArrayList` from inside `parallelStream().forEach(...)`. `ArrayList` isn't thread-safe; collect with `toList()` instead.",
            "Assuming a lambda runs where it's written. It runs when called, maybe later, maybe on another thread, maybe never.",
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
            "Keep lambdas to one or two lines. Short enough that the reader doesn't lose track of the method around it.",
            "Leave out parameter types. The interface already says them, and repeating them is noise. Add them, or `var`, only when they genuinely help a reader or when I need an annotation.",
            "Name parameters for what they are: `fare -> fare > 100`, not `x -> x > 100`. In a two-parameter lambda, good names matter even more.",
            "Prefer a method reference when the lambda only calls one method with the same arguments: `names.forEach(System.out::println)`. The Method References lesson covers when that's clearer and when it isn't.",
            "Keep lambdas free of side effects when they're used in streams or in methods like `computeIfAbsent`. Those methods may call them fewer times, more times, or on other threads than I expect.",
            "Use the standard `java.util.function` interfaces before inventing my own. A custom one is worth it only when the name adds meaning or it needs a `throws` clause.",
            "Don't capture big objects by accident. A lambda that mentions one field captures the whole `this`, which can keep a large object alive as long as the lambda is stored, for example in a long-lived listener list.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The cost of a lambda has two very different parts: linking the call site once, and running it many times.",
        },
        {
          type: "heading",
          text: "The first call is the expensive one",
        },
        {
          type: "paragraph",
          text: "Linking means running the bootstrap, generating bytes for a class and defining it. I counted classes loaded by `Hello` (one lambda) against `HelloAnon` (the same program with an anonymous class), with `-Xlog:class+load`:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:class+load Hello     | grep -c 'class,load'
java -Xlog:class+load HelloAnon | grep -c 'class,load'`,
        },
        {
          type: "table",
          headers: ["Run", "Lambda", "Anonymous class"],
          rows: [
            ["Default (CDS archive on), two runs", "534, 534", "445, 445"],
            ["`-Xshare:off`", "567", "480"],
          ],
        },
        {
          type: "paragraph",
          text: "About 87 to 89 extra classes, just for the first lambda in the program. Among them, from diffing the two logs:",
        },
        {
          type: "output",
          text: `> Hello$$Lambda/0x00007ff4b0000a08
> java.lang.invoke.AbstractValidatingLambdaMetafactory
> java.lang.invoke.BootstrapMethodInvoker
> java.lang.invoke.InnerClassLambdaMetafactory
> java.lang.invoke.InnerClassLambdaMetafactory$ForwardingMethodGenerator
> java.lang.invoke.LambdaMetafactory`,
        },
        {
          type: "paragraph",
          text: "Most of the rest is `java.lang.invoke` machinery (method types, lambda forms) that later lambdas reuse. So the first lambda costs a few milliseconds of startup, and each new lambda call site after that costs much less, once. These counts are from my machine and JDK build; the exact numbers will differ elsewhere.",
        },
        {
          type: "paragraph",
          text: "This is why the JDK itself avoids lambdas in a few classes that run very early during startup, and why tools like CDS archives and, in newer JDKs, AOT caches (Java 24, JEP 483) try to pre-link them.",
        },
        {
          type: "heading",
          text: "After that, it's an interface call",
        },
        {
          type: "list",
          items: [
            "A linked non-capturing lambda costs nothing to evaluate on HotSpot: the call site returns the same instance every time, as `SameInstance` showed.",
            "A capturing lambda allocates one small object per evaluation (a header plus its captured fields). In hot code, escape analysis often removes the allocation entirely when the lambda doesn't escape the method.",
            "Calling the lambda is an `invokeinterface` into a tiny generated method, which calls the `lambda$...` method. Both are trivially small, so the JIT inlines them like any other small method. A lambda in a hot loop usually ends up as fast as the hand-written code.",
            "The real cost to watch for is **boxing**, not lambdas. A `Function<Integer, Integer>` boxes every `int` it touches. The primitive interfaces like `IntUnaryOperator` (used in `Fare` above) avoid it. The Functional Interfaces lesson measures this.",
            "Compared with anonymous classes: fewer files in the JAR, no class loaded until the lambda is first used, and the possibility of a shared instance. The anonymous class wins only on the very first call.",
          ],
        },
      ],
    },
    {
      title: "Lambda Expressions in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A real-life case: sending a login OTP by SMS. SMS gateways fail now and then (a timeout, a busy network), so the send should be retried a few times. The retry logic is the same for every gateway call, only the \"what to try\" changes. That's the shape where a lambda fits perfectly: the retry helper takes the action as a `Supplier`.",
        },
        {
          type: "code",
          language: "java",
          title: "OtpService.java",
          code: `import java.util.function.Supplier;

// In a Spring app this would be a @Service, with SmsGateway injected
public class OtpService {
    private final SmsGateway sms = new SmsGateway();

    public String sendOtp(String phone) {
        String otp = "4821";                       // fixed here so the output is repeatable
        return withRetry(3, () -> sms.send(phone, "Your OTP is " + otp));
    }

    // Runs the job; on failure tries again, up to 'attempts' times
    static <T> T withRetry(int attempts, Supplier<T> job) {
        RuntimeException last = null;
        for (int i = 1; i <= attempts; i++) {
            try {
                return job.get();
            } catch (RuntimeException e) {
                last = e;
                System.out.println("attempt " + i + " failed: " + e.getMessage());
            }
        }
        throw last;
    }

    // A fake gateway that times out twice, then works
    static class SmsGateway {
        private int calls = 0;
        String send(String phone, String text) {
            if (++calls < 3) throw new IllegalStateException("network timeout");
            return "sent to " + phone + ": " + text;
        }
    }

    public static void main(String[] args) {
        System.out.println(new OtpService().sendOtp("+91-98300-00000"));
    }
}`,
        },
        {
          type: "output",
          text: `attempt 1 failed: network timeout
attempt 2 failed: network timeout
sent to +91-98300-00000: Your OTP is 4821`,
        },
        {
          type: "list",
          items: [
            "`() -> sms.send(phone, \"Your OTP is \" + otp)` is the sticky note. It captures `phone` and `otp` (both effectively final) and the `sms` field through `this`. Nothing runs at that line; `withRetry` decides when, and how many times.",
            "`withRetry` knows nothing about SMS. The same helper wraps a payment call (`withRetry(3, () -> gateway.charge(order))`) or a map lookup. That reuse is the whole point of passing behaviour.",
            "It's generic (`<T>`), so the `Supplier<String>` here returns a `String` with no casting.",
            "In a real service the OTP comes from `SecureRandom`, and I'd wait a little between attempts. I fixed the OTP so the output above is the same on every run.",
          ],
        },
        {
          type: "paragraph",
          text: "Libraries like Resilience4j and Spring Retry are built on exactly this idea. In the ride-booking backend I work on (RideX), the same pattern wraps calls to payment and notification providers, and lambdas show up everywhere else too: `@Transactional` work passed to `TransactionTemplate.execute(status -> ...)`, async jobs given to `CompletableFuture.supplyAsync(() -> ...)`, and sorting driver candidates with comparators.",
        },
        {
          type: "callout",
          tone: "tip",
          title: "Reading a stack trace with lambdas in it",
          text: "When something throws inside a lambda, the trace contains a frame like `at OtpService.lambda$sendOtp$0(OtpService.java:9)`. That's the private method from Internal Working. The method name after the first `$` tells me which method the lambda was written in, and the line number points at the lambda itself. The generated `$$Lambda` class between `withRetry` and the lambda isn't printed at all: frames of hidden classes are left out of stack traces by default.",
        },
      ],
    },
    {
      title: "Interview Questions",
      blocks: [
        {
          type: "heading",
          text: "Basics",
        },
        {
          type: "qa",
          items: [
            {
              question: "What is a lambda expression?",
              answer:
                "A short way to write a piece of behaviour, a block of code with parameters, and pass it to a method or store it in a variable. `(a, b) -> a.length() - b.length()` is a comparison rule written in one line.\n\nJava doesn't have function types, so every lambda becomes an object implementing a functional interface, an interface with one abstract method. The compiler decides which interface from the context, the target type.",
            },
            {
              question: "What is a functional interface, and why do lambdas need one?",
              answer:
                "An interface with exactly one abstract method, like `Runnable`, `Comparator` or `Function`. Default and static methods don't count, and neither do methods that are already public in `Object`, like `equals`.\n\nLambdas need one because the lambda's body has to become the implementation of some method. With a single abstract method there's no question which one. The interface also supplies the parameter types and the return type, which is why I can write `(a, b) ->` without types.",
            },
            {
              question: "What does \"effectively final\" mean?",
              answer:
                "A local variable or parameter that's assigned once and never changed, even though it isn't marked `final`. Java 8 added the idea so lambdas (and anonymous classes) could capture locals without the `final` keyword everywhere.\n\nIf I change the variable anywhere, before or after the lambda, I get \"local variables referenced from a lambda expression must be final or effectively final\". The reason is that the lambda captures a copy; the generated class stores it in a `private final` field.",
            },
            {
              question: "What are the different syntax forms of a lambda?",
              answer:
                "`() -> expr` with no parameters, `x -> expr` with one untyped parameter, `(a, b) -> expr` with several, `(String a, String b) -> expr` with explicit types, and since Java 11 `(var a, var b) -> expr`. The body is either a single expression, whose value is returned, or a block in braces with statements and an explicit `return`.\n\nThe rules worth remembering: parentheses can only be dropped for a single untyped parameter, and parameters are all typed or all untyped, never mixed.",
            },
            {
              question: "How is a lambda different from an anonymous class?",
              answer:
                "In the code, `this` inside a lambda is the enclosing object, while in an anonymous class it's the anonymous object. A lambda can't shadow outer local variables, can't hold state, and can only implement a functional interface; an anonymous class can implement any interface or extend a class.\n\nUnderneath it's completely different. An anonymous class is compiled by `javac` into an `Outer$1.class` file and a `new` at the use site. A lambda becomes a private `lambda$...` method plus an `invokedynamic`, and the class is generated at runtime by `LambdaMetafactory`. Non-capturing lambdas even reuse one instance on HotSpot.",
            },
            {
              question: "Can a lambda throw a checked exception?",
              answer:
                "Only if the functional interface method declares it. `Callable.call()` declares `throws Exception`, so a `Callable` lambda can throw anything. `Runnable`, `Consumer`, `Function` and friends declare nothing, so calling `Files.readString` inside a `forEach` lambda gives \"unreported exception IOException\".\n\nThe fixes are to catch inside the lambda and rethrow as an unchecked exception like `UncheckedIOException`, or to use or write an interface whose method has a `throws` clause.",
            },
          ],
        },
        {
          type: "heading",
          text: "Tricky",
        },
        {
          type: "qa",
          items: [
            {
              question: "Why must captured local variables be effectively final, but fields can change freely?",
              answer:
                "A local lives in the method's stack frame, which can be gone by the time the lambda runs, maybe on another thread. So the lambda takes a copy of the value when it's created. If the variable could change later, the copy and the original would silently disagree, so the language forbids the change.\n\nA field isn't copied. The lambda captures `this` (or nothing, for a static field) and reads the field through it each time, so it always sees the current value. That's also why shared mutable state in lambdas almost always involves fields, and needs the usual thread-safety care.",
            },
            {
              question: "What does `this` refer to inside a lambda?",
              answer:
                "The same thing it refers to in the surrounding code: the enclosing instance. A lambda doesn't introduce a new scope for `this`, names or parameters.\n\nIn my test, `this.getClass().getName()` in an anonymous class printed `WhoIsThis$1`, while `this.name` in the lambda read the outer object's field. In bytecode, a lambda that uses `this` becomes an instance method, not a static one, and the outer object is passed to the factory when the lambda is created.",
            },
            {
              question: "What does `return` do inside a lambda passed to forEach?",
              answer:
                "It returns from the lambda, which is one call for one element, so it acts like `continue`, not `break`. `forEach` just moves to the next element.\n\nMy queue example skipped Ravi and still served Bo. It makes sense once you know the body is compiled into its own method. `break` and `continue` don't compile inside a lambda. To stop early, use a plain loop or a short-circuiting stream operation like `anyMatch` or `takeWhile`.",
            },
            {
              question: "Can the same lambda text be assigned to two different interfaces?",
              answer:
                "Yes. A lambda has no type of its own; it takes the type of its target. `() -> \"cab booked\"` assigned to a `Supplier<String>` and to a `Callable<String>` produced two different objects, one implementing each interface.\n\nThe flip side is ambiguity: if a method is overloaded on two interfaces of the same shape, like `run(Supplier<String>)` and `run(Callable<String>)`, the call `run(() -> \"done\")` is \"reference to run is ambiguous\" and needs a cast.",
            },
            {
              question: "Does a lambda create a new object every time the line runs?",
              answer:
                "It depends, and the language deliberately doesn't say. On HotSpot, a non-capturing lambda returns the same instance every time its call site runs, because the instance has no state. A capturing lambda creates a new object each time, holding the captured values.\n\nI checked in a loop: `first == firstAgain` was `true` for a non-capturing lambda and `false` for a capturing one. Code must never depend on either, so no `==` and no identity-based locking on lambdas.",
            },
            {
              question: "Why does `Object o = () -> {};` not compile, and how do you fix it?",
              answer:
                "Because a lambda needs a functional interface as its target type, and `Object` isn't one; there's no single abstract method for the body to implement. The error is \"incompatible types: Object is not a functional interface\". `var r = () -> {};` fails for a similar reason: there's nothing to infer from.\n\nA cast gives it a target: `Object o = (Runnable) () -> {};`.",
            },
            {
              question: "Is a lambda serializable?",
              answer:
                "Only if its target type is serializable, for example by casting to an intersection: `(Runnable & Serializable) () -> ...`. Then `javac` uses `LambdaMetafactory.altMetafactory` and adds a `$deserializeLambda$` method to the class.\n\nIt's fragile, because the serialized form refers to the synthetic `lambda$...` method by name, and those names depend on the order of lambdas in the source. Adding a lambda above it can break deserialization. I avoid it except where a framework requires it.",
            },
          ],
        },
        {
          type: "heading",
          text: "Internals",
        },
        {
          type: "qa",
          items: [
            {
              question: "What bytecode does a lambda compile to?",
              answer:
                "Two pieces. The body is moved into a private synthetic method in the same class, named like `lambda$main$0`; static if it doesn't use `this`, an instance method if it does. Where the lambda was written, there's an `invokedynamic` whose descriptor reads like a factory: captured values in, interface object out, for example `applyAsInt:(I)Ljava/util/function/IntUnaryOperator;`.\n\nThe class file's `BootstrapMethods` table links that `invokedynamic` to `LambdaMetafactory.metafactory`, passing the interface method's shape and a method handle to the private method. No separate class file is generated by `javac`.",
            },
            {
              question: "What is LambdaMetafactory and what does it do?",
              answer:
                "It's the bootstrap method `javac` points every lambda's `invokedynamic` at. The first time the instruction runs, the JVM calls `metafactory` with a lookup for the caller class, the interface method name and types, and a method handle to the lambda body.\n\nIt generates a small class at runtime that implements the interface, with one field per captured value and a method that forwards to the `lambda$...` method, and returns a `CallSite`. I dumped that class with `-Djdk.invoke.LambdaMetafactory.dumpProxyClassFiles=true` and it was literally `final class Hello$$Lambda implements Runnable` whose `run()` is one `invokestatic`.",
            },
            {
              question: "How are captured variables passed to the lambda body?",
              answer:
                "As extra parameters, placed before the lambda's own parameters. `km -> base + km * 12` with `base` captured became `lambda$main$2(int base, int km)`.\n\nAt the use site, the captured values are pushed before the `invokedynamic`, which passes them to the generated class's constructor, where they're stored in `private final` fields named `arg$1`, `arg$2` and so on. Each call loads those fields and passes them along with the real arguments.",
            },
            {
              question: "Why did Java use invokedynamic instead of compiling lambdas to inner classes?",
              answer:
                "To keep the translation strategy out of the class file. With inner classes, every library compiled in 2014 would have frozen that choice forever. With `invokedynamic`, the class file only says \"ask `LambdaMetafactory` for an object of this interface\", and the JDK decides how.\n\nThat paid off: the JDK has changed how lambda classes are created, from VM anonymous classes to hidden classes in Java 15, with no recompilation. It also means no class file per lambda in the JAR, no class loading until first use, and freedom to share instances of non-capturing lambdas.",
            },
            {
              question: "What is a hidden class, and how does it relate to lambdas?",
              answer:
                "A class defined at runtime (since Java 15, JEP 371) that no class loader can find by name, that can't be referenced from other bytecode, and that can be unloaded independently when it's no longer used. They're meant for frameworks that generate code.\n\nLambda proxy classes are hidden classes on JDK 15 and later. That's why `getClass().getName()` printed `SameInstance$$Lambda/0x00007eb134000a08`, with a `/` and an address that changes every run, and `isHidden()` returned `true`.",
            },
            {
              question: "What does the first execution of a lambda cost compared with later ones?",
              answer:
                "The first execution of each lambda call site runs the bootstrap: `LambdaMetafactory` builds and defines a class and links the call site. The very first lambda in a program also loads the `java.lang.invoke` infrastructure; in my test that was about 89 more classes than the same program with an anonymous class.\n\nAfter linking, the call site is fixed. A non-capturing lambda costs nothing more, a capturing one is a small allocation that escape analysis can often remove, and the call is an interface call into tiny methods the JIT inlines.",
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
            "Make a `List<String>` of five food orders. Sort it alphabetically with a lambda, then by length, longest first. Hint: `orders.sort((a, b) -> ...)`, and `b.length() - a.length()` reverses the order.",
            "Remove every order that contains the word \"cold\" with `removeIf`, and print what's left.",
            "Store a `Runnable` that prints \"order ready\" in a variable and call it three times. Then write the same thing as an anonymous class. Compile both and compare the `.class` files in the folder.",
            "Write a lambda that captures a local `int discount`, then add `discount = 5;` on the next line. Read the compile error, then fix it without removing the reassignment (hint: a second variable).",
            "Build a `Map<String, Integer>` of city to ride count with `merge`: for each city in a list, call `counts.merge(city, 1, (old, one) -> old + one)`. Print it with `forEach((city, n) -> ...)`. Use a `TreeMap` so the order is stable.",
            "Compile any class with two lambdas, one capturing and one not, and run `javap -c -p` on it. Find the `lambda$...` methods and check which one has an extra parameter and which `invokedynamic` takes an argument.",
            "Run that same class with `-Djdk.invoke.LambdaMetafactory.dumpProxyClassFiles=true` (JDK 21) and `javap -c -p` the dumped files. Find the `arg$1` field in the capturing one.",
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Hints and answers for 3 and 4",
              answer:
                "For 3, the lambda version leaves only one `.class` file, and the anonymous version leaves an extra `Name$1.class`.\n\nFor 4, the error is \"local variables referenced from a lambda expression must be final or effectively final\", pointing at the use of `discount` inside the lambda, not at the reassignment. The fix is `int fixedDiscount = discount;` before the lambda, and capture `fixedDiscount` instead.",
            },
            {
              question: "Hints and answers for 6 and 7",
              answer:
                "For 6, the capturing lambda's private method has the captured value as its first parameter, and the `invokedynamic` for it has a descriptor with that type in the parentheses, preceded by a load instruction such as `iload_2`. The non-capturing one's descriptor starts with `()`.\n\nFor 7, you'll get one `$$Lambda` class file per lambda in a `DUMP_LAMBDA_PROXY_CLASS_FILES` folder. Only the capturing one has a `private final` field and a constructor that takes an argument.",
            },
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `LAMBDA      (params) -> expression  |  (params) -> { statements; }
            behaviour passed as a value; runs when called

TARGET      needs a functional interface (one abstract method)
            same text -> Supplier or Callable, decided by context
            no target (Object, var) -> compile error

CAPTURE     locals: effectively final, copied at creation
            fields: read live through this
            this = enclosing object (not the lambda)

COMPILES TO body -> private [static] lambda$method$N(captured..., params...)
            site -> invokedynamic  (captured values in, interface out)
            bootstrap -> LambdaMetafactory.metafactory

AT RUNTIME  first run: spin hidden class Outer$$Lambda, link call site
            captured values -> private final fields arg$1, arg$2
            non-capturing -> one shared instance (HotSpot)
            capturing     -> new object per evaluation

GOTCHAS     return in forEach = continue;  no break/continue
            checked exceptions only if the interface declares them
            ambiguous overloads on same-shaped interfaces -> cast`,
          caption: "My one-screen version of lambdas, for revision before an interview.",
        },
        {
          type: "list",
          items: [
            "A lambda is a piece of behaviour, always turned into an object of a functional interface chosen by the context.",
            "Captured locals are copied once, which is why they must be effectively final. `this` is the outer object.",
            "It's not an anonymous class underneath: `javac` writes a private method and an `invokedynamic`, and `LambdaMetafactory` builds a hidden class on first use.",
            "Linking costs something once per call site; after that, lambdas are as cheap as the JIT can make an interface call. Watch boxing, not lambdas.",
          ],
        },
      ],
    },
  ],
};
