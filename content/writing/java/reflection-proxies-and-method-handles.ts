import type { Lesson } from "../types";

export const reflectionProxiesAndMethodHandles: Lesson = {
  slug: "reflection-proxies-and-method-handles",
  date: "2026-11-13",
  title: "Dynamic Proxies, MethodHandles and How Frameworks Use Reflection",
  description:
    "Dynamic proxies and java.lang.invoke on JDK 21: a timing proxy around an interface and the jdk.proxy1.$Proxy0 class it generates, dumped and read with javap, why proxies only implement interfaces and why Spring falls back to CGLIB subclasses, a self-call that skipped the handler, equals on a forwarding proxy returning false for itself, invokeDefault for default methods, MethodHandles.Lookup with findVirtual, findStatic, findGetter and privateLookupIn, invokeExact failing with WrongMethodTypeException, VarHandle compareAndSet, lambdas as invokedynamic and LambdaMetafactory, a 55-line dependency injection container, how Spring, Jackson, JUnit and Hibernate use all of it, proxies measured from 0.68 to 17 ns per call, and a @Transactional charge that never opened a transaction in a ride-hailing backend.",
  tags: ["Core Java", "Reflection", "Dynamic Proxy", "MethodHandles"],
  sections: [
    {
      title: "What Dynamic Proxies and Method Handles Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Reflection: Classes, Fields, Methods and Constructors at Run Time, used reflection to **look at** classes and call their members by name. Frameworks need two more things: a way to **put code in front of** an object they didn't write (to time it, retry it, wrap it in a transaction), and a way to call members found at run time **fast**. Java's answers are dynamic proxies and method handles.",
        },
        {
          type: "paragraph",
          text: "A **dynamic proxy** is an object of a class generated at run time that implements interfaces I choose, and sends every call to one `InvocationHandler`: `invoke(proxy, method, args)`. The handler decides what happens: log, start a transaction, check a cache, retry, then usually forward to the real object. A **method handle** (`java.lang.invoke.MethodHandle`) is a typed, directly executable reference to a method, constructor or field, which the JIT can inline like a normal call. It's what `Method.invoke` runs on since JDK 18, what lambdas are built from, and what frameworks use when reflection is too slow.",
        },
        {
          type: "paragraph",
          text: "Together with annotations read at run time, these are the whole toolkit behind Spring's dependency injection and `@Transactional`, Jackson's data binding, JUnit's test discovery and Hibernate's lazy loading. This lesson builds a small version of each, measures what proxies cost, and finishes with the most famous proxy bug: an annotated method called from inside its own class, which the proxy never sees.",
        },
      ],
    },
    {
      title: "Where They Came From",
      blocks: [
        {
          type: "paragraph",
          text: "`java.lang.reflect.Proxy` arrived in Java 1.3 (2000), mainly for RMI and for the \"decorator without writing the decorator\" pattern. It was limited to interfaces, so libraries like CGLIB (2002) generated **subclasses** instead, and Spring 1.0 (2004) built its AOP on both. Java 7's JSR 292 added method handles and `invokedynamic` for dynamic languages on the JVM, and Java 8 reused them to implement lambdas.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.3 (2000)", "`Proxy`, `InvocationHandler`, `UndeclaredThrowableException`", "Interface proxies generated at run time"],
            ["Java 5 (2004)", "Annotations with `@Retention(RUNTIME)`", "`@Test`, `@Autowired`, `@Transactional` become possible"],
            ["Java 6 (2006)", "`java.util.ServiceLoader`", "Standard plugin discovery"],
            ["Java 7 (2011)", "`MethodHandle`, `MethodType`, `MethodHandles.Lookup`, `invokedynamic` (JSR 292)", "Fast, typed, inlinable invocation"],
            ["Java 8 (2014)", "Lambdas compiled to `invokedynamic` + `LambdaMetafactory`", "Every lambda goes through `java.lang.invoke`"],
            ["Java 9 (2017)", "`VarHandle` (JEP 193); `MethodHandles.privateLookupIn`; string concatenation via `invokedynamic` (JEP 280); `ServiceLoader` with modules", "Field access with memory-ordering modes"],
            ["Spring Boot 2.0 (2018)", "`spring.aop.proxy-target-class=true` by default", "CGLIB subclasses even when an interface exists"],
            ["Java 15 (2020)", "Hidden classes (JEP 371)", "Lambda classes become hidden, unloadable classes"],
            ["Java 16 (2021)", "`InvocationHandler.invokeDefault`", "Proxies can run interface default methods"],
            ["Java 18 (2022)", "Core reflection on method handles (JEP 416)", "Handlers calling `Method.invoke` run on handles"],
            ["Spring Boot 3 (2022)", "AOT processing and GraalVM native images", "Reflection must be declared at build time"],
          ],
        },
        {
          type: "paragraph",
          text: "The names of proxy classes changed along the way: on JDK 8 a proxy for a public interface was `com.sun.proxy.$Proxy0`; on JDK 17 and 21 it's `jdk.proxy1.$Proxy0`, in a module the JDK creates for proxies. I checked both 17 and 21 for this lesson. Code that matched proxy classes by the old package name broke on upgrade; `Proxy.isProxyClass(c)` is the stable test.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a manager with a personal assistant who answers her phone.",
        },
        {
          type: "list",
          items: [
            "Callers dial the **manager's published number** (the interface). The assistant answers (the proxy). Callers can't tell the difference: the proxy implements the same interface.",
            "Every call goes through the **assistant's routine** (the `InvocationHandler`): note the time, check the diary, decide whether to put the call through (forward to the target), take a message, or call back later (retry).",
            "The assistant only answers the **published number**. If the manager has no published number (a class with no interface), the agency sends a stand-in who **impersonates** her instead (a CGLIB subclass), but the stand-in can't do anything the manager does in a way that can't be imitated (`final` methods).",
            "When the manager **reminds herself** to do something (a method calling another method on `this`), no call goes through the assistant at all. That's self-invocation, and it's why `@Transactional` on an internal call does nothing.",
            "A **method handle** is the manager's direct line, written down once with exactly the right extension and checked: no assistant, no switchboard, as fast as dialling the number from memory.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real assistant can also overhear the manager's internal thoughts if she talks aloud. A proxy never can: it only exists between callers and the object. Some tools close that gap by changing the manager herself (AspectJ weaving the advice into the class's bytecode), which is a different mechanism from proxies.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "A timing proxy around an interface",
        },
        {
          type: "code",
          language: "java",
          title: "TimingProxy.java",
          code: `import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.Proxy;
import java.util.Arrays;

public class TimingProxy {
    public interface FareService {
        long quote(String zone, int km);
        long cancelFee(String tripId);
    }

    static class RealFareService implements FareService {
        public long quote(String zone, int km) { return 4000 + km * 1200L; }
        public long cancelFee(String tripId) {
            if (tripId.isBlank()) throw new IllegalArgumentException("blank trip id");
            return 5000;
        }
    }

    // Logs every call, times it, and rethrows the target's own exception
    record Timing(Object target) implements InvocationHandler {
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            long t0 = System.nanoTime();
            try {
                Object result = method.invoke(target, args);
                System.out.printf("  %s%s -> %s (%d us)%n", method.getName(), Arrays.toString(args), result,
                        (System.nanoTime() - t0) / 1000);
                return result;
            } catch (InvocationTargetException e) {
                System.out.println("  " + method.getName() + " threw " + e.getCause());
                throw e.getCause();                       // unwrap, or callers see the wrong exception
            }
        }
    }

    @SuppressWarnings("unchecked")
    static <T> T timed(Class<T> iface, T target) {
        return (T) Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[] { iface }, new Timing(target));
    }

    public static void main(String[] args) {
        FareService fares = timed(FareService.class, new RealFareService());
        System.out.println("quote = " + fares.quote("SALT-LAKE", 8));
        System.out.println("quote = " + fares.quote("NEW-TOWN", 12));
        try {
            fares.cancelFee(" ");
        } catch (IllegalArgumentException e) {
            System.out.println("caller caught " + e);
        }

        Class<?> pc = fares.getClass();
        System.out.println("class      " + pc.getName() + " (" + Modifier.toString(pc.getModifiers()) + ")");
        System.out.println("extends    " + pc.getSuperclass().getName());
        System.out.println("implements " + Arrays.toString(pc.getInterfaces()));
        System.out.println("isProxy    " + Proxy.isProxyClass(pc) + ", handler " + Proxy.getInvocationHandler(fares).getClass().getSimpleName());
        System.out.println("instanceof RealFareService? " + (fares instanceof RealFareService));
    }
}`,
        },
        {
          type: "output",
          text: `  quote[SALT-LAKE, 8] -> 13600 (12269 us)
quote = 13600
  quote[NEW-TOWN, 12] -> 18400 (38 us)
quote = 18400
  cancelFee threw java.lang.IllegalArgumentException: blank trip id
caller caught java.lang.IllegalArgumentException: blank trip id
class      jdk.proxy1.$Proxy0 (public final)
extends    java.lang.reflect.Proxy
implements [interface TimingProxy$FareService]
isProxy    true, handler Timing
instanceof RealFareService? false`,
        },
        {
          type: "list",
          items: [
            "`Proxy.newProxyInstance(loader, interfaces, handler)` returned a `FareService` that's a `jdk.proxy1.$Proxy0`: `public final`, a subclass of `java.lang.reflect.Proxy`, implementing exactly the interface I passed. It is **not** a `RealFareService`; the proxy and the target are two objects.",
            "Every call landed in `Timing.invoke` with the `Method` for `FareService.quote` and the arguments boxed into an `Object[]`. The handler forwarded with `method.invoke(target, args)`, the previous lesson's API.",
            "**The first call took 12 ms; the second 38 µs** (most of that is `printf`). The first `Method.invoke` of a method builds its accessor and method handle, and the first in the JVM initialises `java.lang.invoke` infrastructure. Performance below separates startup cost from per-call cost.",
            "**Exceptions need unwrapping.** `cancelFee` threw `IllegalArgumentException`; `Method.invoke` wrapped it in `InvocationTargetException`, and the handler rethrew `e.getCause()`, so the caller caught the original type. Common Mistakes shows what callers see otherwise.",
            "`Proxy.isProxyClass` and `Proxy.getInvocationHandler` let code detect a proxy and reach its handler, which is how Spring's `AopUtils` and Mockito's `mockingDetails` tell proxies apart.",
          ],
        },
        {
          type: "heading",
          text: "The two APIs side by side",
        },
        {
          type: "table",
          headers: ["Want", "java.lang.reflect", "java.lang.invoke"],
          rows: [
            ["Intercept calls on an interface", "`Proxy.newProxyInstance` + `InvocationHandler`", "-"],
            ["Find a method", "`getMethod(name, types...)`", "`lookup.findVirtual(class, name, MethodType)`, `findStatic`, `findSpecial`"],
            ["Find a constructor", "`getDeclaredConstructor(types...)`", "`lookup.findConstructor(class, MethodType)`"],
            ["Read or write a field", "`Field.get` / `set`", "`findGetter`/`findSetter`, or `findVarHandle`"],
            ["Call it", "`invoke(obj, Object...)`, boxes everything", "`invokeExact(...)` with exact static types, or `invoke(...)` with adaptation"],
            ["Access check", "On every call (unless `setAccessible`)", "Once, at lookup time, against the `Lookup`'s class"],
            ["Private members", "`setAccessible(true)`", "`MethodHandles.privateLookupIn(target, lookup)`"],
            ["Combine and adapt", "-", "`bindTo`, `insertArguments`, `filterReturnValue`, `asType`..."],
            ["Atomic field operations", "-", "`VarHandle.compareAndSet`, `getAndAdd`, `getAcquire`..."],
          ],
        },
        {
          type: "paragraph",
          text: "The key design difference: `Method.invoke` checks access and types on every call and takes `Object`s, while a `MethodHandle` is checked once when it's looked up, has a precise `MethodType`, and is called with exactly that type. That's what lets the JIT treat a constant handle like a direct call.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The generated proxy class",
        },
        {
          type: "paragraph",
          text: "The Interfaces lesson dumped one proxy class; here is the part that explains the costs. The JDK writes generated proxies to disk when asked:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Djdk.proxy.ProxyGenerator.saveGeneratedFiles=true TimingProxy > /dev/null
javap -p -c 'jdk/proxy1/$Proxy0.class'`,
        },
        {
          type: "output",
          text: `public final class jdk.proxy1.$Proxy0 extends java.lang.reflect.Proxy implements TimingProxy$FareService {
  private static final java.lang.reflect.Method m0;
  private static final java.lang.reflect.Method m1;
  private static final java.lang.reflect.Method m2;
  private static final java.lang.reflect.Method m3;
  private static final java.lang.reflect.Method m4;
  public jdk.proxy1.$Proxy0(java.lang.reflect.InvocationHandler);
  ...
  public final long quote(java.lang.String, int);
    Code:
       0: aload_0
       1: getfield      #24                 // Field java/lang/reflect/Proxy.h:Ljava/lang/reflect/InvocationHandler;
       4: aload_0
       5: getstatic     #67                 // Field m3:Ljava/lang/reflect/Method;
       8: iconst_2
       9: anewarray     #49                 // class java/lang/Object
      12: dup
      13: iconst_0
      14: aload_1
      15: aastore
      16: dup
      17: iconst_1
      18: iload_2
      19: invokestatic  #71                 // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
      22: aastore
      23: invokeinterface #32,  4           // InterfaceMethod java/lang/reflect/InvocationHandler.invoke:(Ljava/lang/Object;Ljava/lang/reflect/Method;[Ljava/lang/Object;)Ljava/lang/Object;
      28: checkcast     #73                 // class java/lang/Long
      31: invokevirtual #77                 // Method java/lang/Long.longValue:()J
      34: lreturn
      35: athrow
      36: astore_1
      37: new           #39                 // class java/lang/reflect/UndeclaredThrowableException
      40: dup
      41: aload_1
      42: invokespecial #42                 // Method java/lang/reflect/UndeclaredThrowableException."<init>":(Ljava/lang/Throwable;)V
      45: athrow
    Exception table:
       from    to  target type
           0    35    35   Class java/lang/Error
           0    35    35   Class java/lang/RuntimeException
           0    35    36   Class java/lang/Throwable
  ...
  static {};
    Code:
       0: ldc           #2                  // class jdk/proxy1/$Proxy0
       2: invokevirtual #94                 // Method java/lang/Class.getClassLoader:()Ljava/lang/ClassLoader;
       5: astore_0
       6: ldc           #96                 // String java.lang.Object
       8: iconst_0
       9: aload_0
      10: invokestatic  #100                // Method java/lang/Class.forName:(Ljava/lang/String;ZLjava/lang/ClassLoader;)Ljava/lang/Class;
      13: ldc           #101                // String hashCode
      15: iconst_0
      16: anewarray     #90                 // class java/lang/Class
      19: invokevirtual #105                // Method java/lang/Class.getMethod:(Ljava/lang/String;[Ljava/lang/Class;)Ljava/lang/reflect/Method;
      22: putstatic     #26                 // Field m0:Ljava/lang/reflect/Method;
      ...
      73: ldc           #108                // String TimingProxy$FareService
      75: iconst_0
      76: aload_0
      77: invokestatic  #100                // Method java/lang/Class.forName:(Ljava/lang/String;ZLjava/lang/ClassLoader;)Ljava/lang/Class;
      80: ldc           #109                // String quote
      82: iconst_2
      83: anewarray     #90                 // class java/lang/Class
      ...
      98: getstatic     #115                // Field java/lang/Integer.TYPE:Ljava/lang/Class;
     101: aastore
     102: invokevirtual #105                // Method java/lang/Class.getMethod:(Ljava/lang/String;[Ljava/lang/Class;)Ljava/lang/reflect/Method;
     105: putstatic     #67                 // Field m3:Ljava/lang/reflect/Method;`,
        },
        {
          type: "list",
          items: [
            "**The static initializer looks every method up once**, with `Class.forName(name, false, loader)` and `getMethod`, and keeps them in `private static final Method` fields: `m0` to `m2` for `hashCode`, `equals` and `toString`, `m3` and `m4` for `quote` and `cancelFee`. The generated code follows the previous lesson's advice: cache the lookup, in a `static final`.",
            "**Each method has the same body**: load the handler `h` from the `Proxy` superclass, pass `this` (the proxy), the cached `Method`, and a new `Object[]` with every argument boxed (`Integer.valueOf` for the `int`), then `checkcast` the result to `Long` and unbox it. A handler that returns `null` for a primitive method therefore throws `NullPointerException` at the `longValue()`, and one that returns the wrong type throws `ClassCastException` at the `checkcast`.",
            "**The exception table** passes `Error` and `RuntimeException` through untouched and wraps any other `Throwable` in `UndeclaredThrowableException`, because `quote` declares no checked exceptions and the JVM must not let one escape undeclared. A checked exception that the interface method **does** declare is listed in the table too and passed through.",
            "**Only `hashCode`, `equals` and `toString`** from `Object` are routed to the handler. `getClass`, `wait` and `notify` are `final` in `Object` and stay unproxied.",
          ],
        },
        {
          type: "heading",
          text: "How the class is created",
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xlog:class+load ProxyBench proxy-reflect | grep -v 'shared objects file'",
        },
        {
          type: "output",
          text: `ProxyBench$$Lambda/0x00007487b0000400 source: ProxyBench
java.lang.reflect.Proxy source: jrt:/java.base
java.lang.reflect.Proxy$ProxyBuilder source: jrt:/java.base
...
java.lang.reflect.ProxyGenerator source: jrt:/java.base
java.lang.reflect.ProxyGenerator$ProxyMethod source: jrt:/java.base
java.lang.reflect.ProxyGenerator$PrimitiveTypeInfo source: jrt:/java.base
jdk.internal.org.objectweb.asm.Edge source: jrt:/java.base
jdk.proxy1.$Proxy0 source: __dynamic_proxy__
java.lang.reflect.Proxy$ProxyBuilder$1 source: jrt:/java.base
java.lang.invoke.LambdaForm$MH/0x00007487b0001400 source: __JVM_LookupDefineClass__
java.lang.invoke.LambdaForm$MH/0x00007487b0002000 source: __JVM_LookupDefineClass__
java.lang.invoke.LambdaForm$DMH/0x00007487b0002400 source: __JVM_LookupDefineClass__
...
java.lang.invoke.BoundMethodHandle$Species_LI source: __JVM_LookupDefineClass__
...`,
        },
        {
          type: "list",
          items: [
            "`Proxy.newProxyInstance` asks `ProxyBuilder` for a class for this (loader, interfaces) combination. Proxy classes are cached per class loader, so the second proxy for `FareService` reuses `$Proxy0` and only runs its constructor.",
            "On a miss, `ProxyGenerator` writes the class file with the JDK's internal copy of ASM (`jdk.internal.org.objectweb.asm`), and the class is defined from bytes: `source: __dynamic_proxy__`. Its package is `jdk.proxy1`, a dynamic module the JDK created to hold proxies of public interfaces; a proxy for a package-private interface must live in that interface's package instead.",
            "The `LambdaForm$MH` and `LambdaForm$DMH` classes after it are the first `Method.invoke` (inside my handler) creating its method handle: `java.lang.invoke` spins small classes for handle shapes it hasn't needed yet. Most of the JDK's startup classes came from the CDS archive (`shared objects file`, filtered out here); this program loaded 57 classes from elsewhere, against 13 for the same program calling the target directly. That's the startup cost of proxies and reflection, and why frameworks with hundreds of proxies notice it.",
          ],
        },
        {
          type: "heading",
          text: "How lambdas use invokedynamic",
        },
        {
          type: "paragraph",
          text: "Lambdas are the most common user of `java.lang.invoke`, and they explain why method handles exist. The Lambda Expressions lesson in the Java 8 track covers the syntax; this is what the class file contains:",
        },
        {
          type: "code",
          language: "java",
          title: "LambdaIndy.java",
          code: `import java.util.function.LongUnaryOperator;

public class LambdaIndy {
    static LongUnaryOperator surge(long percent) {
        return paise -> paise + paise * percent / 100;
    }

    public static void main(String[] args) {
        LongUnaryOperator night = surge(25), rain = surge(10);
        System.out.println(night.applyAsLong(20_000) + " " + rain.applyAsLong(20_000));
        Class<?> c = night.getClass();
        System.out.println(c.getName().replaceAll("0x[0-9a-f]+", "0x..."));
        System.out.println("hidden " + c.isHidden() + ", one class per call site " + (c == rain.getClass())
                + ", two objects " + (night != rain));
        var f = c.getDeclaredFields()[0];
        System.out.println("captured field: " + java.lang.reflect.Modifier.toString(f.getModifiers()) + " " + f.getType() + " " + f.getName());
    }
}`,
        },
        {
          type: "output",
          text: `25000 22000
LambdaIndy$$Lambda/0x...
hidden true, one class per call site true, two objects true
captured field: private final long arg$1`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p LambdaIndy
javap -v LambdaIndy | sed -n '/^BootstrapMethods/,/^  1:/p'`,
        },
        {
          type: "output",
          text: `  static java.util.function.LongUnaryOperator surge(long);
    Code:
       0: lload_0
       1: invokedynamic #7,  0              // InvokeDynamic #0:applyAsLong:(J)Ljava/util/function/LongUnaryOperator;
       6: areturn

  private static long lambda$surge$0(long, long);
    Code:
       0: lload_2
       1: lload_2
       2: lload_0
       3: lmul
       4: ldc2_w        #82                 // long 100l
       7: ldiv
       8: ladd
       9: lreturn

BootstrapMethods:
  0: #106 REF_invokeStatic java/lang/invoke/LambdaMetafactory.metafactory:(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;Ljava/lang/invoke/MethodType;Ljava/lang/invoke/MethodHandle;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/CallSite;
    Method arguments:
      #96 (J)J
      #97 REF_invokeStatic LambdaIndy.lambda$surge$0:(JJ)J
      #96 (J)J`,
        },
        {
          type: "list",
          items: [
            "**The lambda body became a private static method**, `lambda$surge$0(long percent, long paise)`: the captured `percent` comes first, then the lambda's own parameter.",
            "**Creating the lambda is an `invokedynamic` instruction**, whose type `(J)LongUnaryOperator` reads as \"give me a `LongUnaryOperator`, here is a captured `long`\". The first time it executes, the JVM calls the bootstrap method `LambdaMetafactory.metafactory` with a `Lookup` for `LambdaIndy`, the interface method's type `(J)J`, and a **method handle** to `lambda$surge$0`.",
            "`metafactory` spins a **hidden class** that implements `LongUnaryOperator`, stores the captured value in a `private final long arg$1` field, and implements `applyAsLong` by calling `lambda$surge$0`. It returns a `CallSite` that the JVM links permanently to this instruction.",
            "So there's **one class per call site** (`night` and `rain` share it) and a new object per capture. A non-capturing lambda gets a single cached instance. The hidden class can be unloaded with its defining class and has no name `Class.forName` can find, which is why its name shows an address.",
            "String concatenation uses the same mechanism since Java 9 (`StringConcatFactory.makeConcatWithConstants` was bootstrap method 1 in this class). `invokedynamic` lets the JDK change the implementation strategy without recompiling anyone's code.",
          ],
        },
      ],
    },
    {
      title: "What Proxies Can't Do",
      blocks: [
        {
          type: "heading",
          text: "Classes, identity methods and default methods",
        },
        {
          type: "code",
          language: "java",
          title: "ProxyLimits.java",
          code: `import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.HashSet;
import java.util.Set;

public class ProxyLimits {
    public interface DriverLookup {
        String nameOf(String driverId);
        default String greeting(String driverId) { return "Namaskar, " + nameOf(driverId); }
    }
    static class MapLookup implements DriverLookup {
        public String nameOf(String id) { return id.equals("D7") ? "Ravi" : "unknown"; }
    }
    public static class ConcreteFareService { public long quote(int km) { return 4000 + km * 1200L; } }

    public static void main(String[] args) {
        // 1. Only interfaces
        try {
            Proxy.newProxyInstance(ProxyLimits.class.getClassLoader(), new Class<?>[] { ConcreteFareService.class },
                    (p, m, a) -> null);
        } catch (IllegalArgumentException e) {
            System.out.println("IllegalArgumentException: " + e.getMessage());
        }

        // 2. A naive handler forwards everything, including equals and hashCode
        DriverLookup target = new MapLookup();
        InvocationHandler forwardAll = (p, m, a) -> m.invoke(target, a);
        DriverLookup naive = (DriverLookup) Proxy.newProxyInstance(DriverLookup.class.getClassLoader(),
                new Class<?>[] { DriverLookup.class }, forwardAll);
        System.out.println("naive.equals(naive): " + naive.equals(naive));
        Set<DriverLookup> registry = new HashSet<>();
        registry.add(naive);
        System.out.println("registry.contains(naive): " + registry.contains(naive));
        System.out.println("naive.toString(): " + naive.toString().replaceAll("@[0-9a-f]+", "@..."));

        // 3. A handler that treats Object methods as the proxy's own identity
        InvocationHandler careful = (p, m, a) -> switch (m.getName()) {
            case "equals" -> p == a[0];
            case "hashCode" -> System.identityHashCode(p);
            case "toString" -> "DriverLookupProxy[" + target.getClass().getSimpleName() + "]";
            default -> m.isDefault() ? InvocationHandler.invokeDefault(p, m, a) : m.invoke(target, a);
        };
        DriverLookup good = (DriverLookup) Proxy.newProxyInstance(DriverLookup.class.getClassLoader(),
                new Class<?>[] { DriverLookup.class }, careful);
        System.out.println("good.equals(good): " + good.equals(good) + ", " + good);

        // 4. Default methods: invokeDefault runs the interface body on the proxy,
        //    so its inner nameOf call comes back through the handler
        DriverLookup logging = (DriverLookup) Proxy.newProxyInstance(DriverLookup.class.getClassLoader(),
                new Class<?>[] { DriverLookup.class }, (p, m, a) -> {
                    System.out.println("  handler: " + m.getName());
                    return m.isDefault() ? InvocationHandler.invokeDefault(p, m, a) : m.invoke(target, a);
                });
        System.out.println(logging.greeting("D7"));
        System.out.println("getClass() is final, never reaches the handler: " + logging.getClass().getSimpleName());
    }
}`,
        },
        {
          type: "output",
          text: `IllegalArgumentException: ProxyLimits$ConcreteFareService is not an interface
naive.equals(naive): false
registry.contains(naive): true
naive.toString(): ProxyLimits$MapLookup@...
good.equals(good): true, DriverLookupProxy[MapLookup]
  handler: greeting
  handler: nameOf
Namaskar, Ravi
getClass() is final, never reaches the handler: $Proxy0`,
        },
        {
          type: "list",
          items: [
            "**Interfaces only.** A JDK proxy class extends `java.lang.reflect.Proxy`, and Java has single inheritance, so it can't also extend `ConcreteFareService`. `newProxyInstance` refused: `is not an interface`.",
            "**`equals`, `hashCode` and `toString` go through the handler**, and a handler that forwards everything to the target gets them wrong. `naive.equals(naive)` was `false`: the proxy called `target.equals(proxy)`, and `MapLookup` (using `Object.equals`) compared itself with the proxy, a different object. `toString` showed the target's identity, so logs claimed the object was a `MapLookup`.",
            "`registry.contains(naive)` was still `true`, which surprised me until I remembered that `HashMap` compares keys with `==` **before** calling `equals`. The same proxy found itself by reference; a different proxy for the same target would not have been found, and `List.contains` or `remove`, which use only `equals`, would fail even for the same proxy.",
            "The careful handler gives the proxy its own identity: `equals` by reference, `identityHashCode`, and a descriptive `toString`. That's what Spring's `JdkDynamicAopProxy` does too, except that two proxies are equal when their configurations and targets are.",
            "**Default methods** reach the handler like any other. `InvocationHandler.invokeDefault(proxy, method, args)` (Java 16) runs the interface's default body with `this` being the proxy, so `greeting`'s call to `nameOf` came back through the handler. Before Java 16 this needed `MethodHandles.privateLookupIn` and `unreflectSpecial` tricks.",
          ],
        },
        {
          type: "heading",
          text: "Self-invocation",
        },
        {
          type: "code",
          language: "java",
          title: "InnerCall.java",
          code: `import java.lang.reflect.Proxy;

public class InnerCall {
    public interface Pricing {
        long baseFare(int km);
        long quote(int km);
    }

    static class SimplePricing implements Pricing {
        public long baseFare(int km) { return 4000 + km * 1200L; }
        public long quote(int km) { return baseFare(km) * 120 / 100; }      // this.baseFare(km)
    }

    public static void main(String[] args) {
        Pricing target = new SimplePricing();
        Pricing proxy = (Pricing) Proxy.newProxyInstance(Pricing.class.getClassLoader(), new Class<?>[] { Pricing.class },
                (p, m, a) -> {
                    System.out.println("  intercepted " + m.getName());
                    return m.invoke(target, a);
                });
        System.out.println("proxy.baseFare(8):");
        proxy.baseFare(8);
        System.out.println("proxy.quote(8):");
        System.out.println("  = " + proxy.quote(8));
    }
}`,
        },
        {
          type: "output",
          text: `proxy.baseFare(8):
  intercepted baseFare
proxy.quote(8):
  intercepted quote
  = 16320`,
        },
        {
          type: "paragraph",
          text: "`proxy.quote(8)` was intercepted, but `quote`'s own call to `baseFare` was not. Inside `SimplePricing`, `baseFare(km)` means `this.baseFare(km)`, an ordinary `invokevirtual` on the target object; the proxy is a different object that the target doesn't know exists. Whatever the handler adds (timing, caching, retries, transactions) applies only to calls that arrive **through the proxy**. The production section shows what that does to `@Transactional`.",
        },
        {
          type: "heading",
          text: "Subclass proxies: what Spring uses for classes",
        },
        {
          type: "paragraph",
          text: "To proxy a class with no interface, libraries generate a **subclass** at run time that overrides each method. Spring ships a repackaged CGLIB inside `spring-core` for this (and Hibernate and Mockito use ByteBuddy the same way). I used Spring 6.2.7's copy directly; `$SPRING` is the classpath of `spring-core-6.2.7.jar` and `spring-jcl-6.2.7.jar`:",
        },
        {
          type: "code",
          language: "java",
          title: "SubclassProxy.java",
          code: `import java.lang.reflect.Modifier;

import org.springframework.cglib.proxy.Enhancer;
import org.springframework.cglib.proxy.MethodInterceptor;

public class SubclassProxy {
    public static class PricingService {                       // a class, no interface
        public long baseFare(int km) { return 4000 + km * 1200L; }
        public long quote(int km) { return baseFare(km) * 120 / 100; }
        public final long minimum() { return 4000; }          // final: a subclass can't override it
    }

    public static void main(String[] args) {
        // Style 1: the proxy IS the object (invokeSuper runs the original code on the proxy itself)
        Enhancer e1 = new Enhancer();
        e1.setSuperclass(PricingService.class);
        e1.setCallback((MethodInterceptor) (obj, method, a, methodProxy) -> {
            System.out.println("  intercepted " + method.getName());
            return methodProxy.invokeSuper(obj, a);
        });
        PricingService sameObject = (PricingService) e1.create();
        Class<?> c = sameObject.getClass();
        System.out.println(c.getName() + " extends " + c.getSuperclass().getSimpleName() + ", " + Modifier.toString(c.getModifiers()));
        System.out.println("invokeSuper style, quote(8):");
        sameObject.quote(8);

        // Style 2: Spring AOP's way, the proxy forwards to a separate target bean
        PricingService target = new PricingService();
        Enhancer e2 = new Enhancer();
        e2.setSuperclass(PricingService.class);
        e2.setCallback((MethodInterceptor) (obj, method, a, methodProxy) -> {
            System.out.println("  intercepted " + method.getName());
            return methodProxy.invoke(target, a);
        });
        PricingService delegating = (PricingService) e2.create();
        System.out.println("delegating style, quote(8):");
        delegating.quote(8);
        System.out.println("final minimum(): " + delegating.minimum() + " (no interception line above)");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp $SPRING SubclassProxy.java
java -cp $SPRING:. SubclassProxy`,
        },
        {
          type: "output",
          text: `SubclassProxy$PricingService$$EnhancerByCGLIB$$b44c0584 extends PricingService, public
invokeSuper style, quote(8):
  intercepted quote
  intercepted baseFare
delegating style, quote(8):
  intercepted quote
final minimum(): 4000 (no interception line above)`,
        },
        {
          type: "list",
          items: [
            "The generated class `SubclassProxy$PricingService$$EnhancerByCGLIB$$b44c0584` **extends `PricingService`**, so it can be assigned to a `PricingService` variable with no interface involved. (Spring AOP names its own `PricingService$$SpringCGLIB$$0`.)",
            "**`final` methods can't be overridden, so they can't be intercepted**: `minimum()` ran with no interception line. The same goes for `private` and `static` methods, and a `final` class can't be proxied at all. That's why Kotlin classes need the `all-open` compiler plugin for Spring, and why `@Transactional` on a private method does nothing.",
            "**The two styles answer self-invocation differently.** With `invokeSuper`, the proxy object **is** the service: the original `quote` runs on the proxy, so `this.baseFare()` hits the overriding method and was intercepted. With delegation to a separate target, the original `quote` runs on the target, and the inner call was not intercepted.",
            "**Spring AOP uses the delegating style for both JDK and CGLIB proxies**: the bean is created normally and the proxy forwards to it. So in Spring, self-invocation bypasses advice whichever proxy type is used. Only AspectJ weaving (compile-time or load-time), which changes the class's own bytecode, intercepts internal calls.",
            "Subclass proxies also call the superclass constructor (CGLIB and ByteBuddy can skip it with Objenesis, which Spring does), need a non-`final` class, and on JDK 17+ must define their classes through `MethodHandles.Lookup.defineClass` or similar, because the old trick of calling `ClassLoader.defineClass` reflectively runs into strong encapsulation.",
          ],
        },
      ],
    },
    {
      title: "MethodHandles, MethodType and VarHandle",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Handles.java",
          code: `import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.WrongMethodTypeException;

class Wallet {
    private long balancePaise;
    private final String owner;
    Wallet(String owner, long balancePaise) { this.owner = owner; this.balancePaise = balancePaise; }
    public long debit(long paise) { balancePaise -= paise; return balancePaise; }
    public static long gst(long paise) { return paise * 5 / 100; }
    private String secret() { return owner + " has " + balancePaise; }
}

public class Handles {
    public static void main(String[] args) throws Throwable {
        MethodHandles.Lookup lookup = MethodHandles.lookup();

        // findVirtual: the receiver becomes the first parameter
        MethodHandle debit = lookup.findVirtual(Wallet.class, "debit", MethodType.methodType(long.class, long.class));
        System.out.println("type of debit: " + debit.type());
        Wallet w = new Wallet("Asha", 50_000);
        long left = (long) debit.invokeExact(w, 12_000L);
        System.out.println("invokeExact -> " + left);

        // findStatic
        MethodHandle gst = lookup.findStatic(Wallet.class, "gst", MethodType.methodType(long.class, long.class));
        System.out.println("gst(20000) = " + (long) gst.invokeExact(20_000L));

        // invokeExact demands the exact symbolic type at the call site
        try {
            int wrong = (int) gst.invokeExact(20_000L);          // call site type (long)int
            System.out.println(wrong);
        } catch (WrongMethodTypeException e) {
            System.out.println("WrongMethodTypeException: " + e.getMessage());
        }
        try {
            Object boxed = gst.invokeExact(20_000L);             // (long)Object, still not exact
            System.out.println(boxed);
        } catch (WrongMethodTypeException e) {
            System.out.println("WrongMethodTypeException: " + e.getMessage());
        }
        // invoke adapts with asType: boxing, widening, casting
        Object adapted = gst.invoke(Integer.valueOf(20_000));
        System.out.println("invoke adapts: " + adapted + " (" + adapted.getClass().getSimpleName() + ")");

        // private members need a lookup with private access to Wallet
        try {
            lookup.findVirtual(Wallet.class, "secret", MethodType.methodType(String.class));
        } catch (IllegalAccessException e) {
            System.out.println("IllegalAccessException: " + e.getMessage());
        }
        MethodHandles.Lookup walletLookup = MethodHandles.privateLookupIn(Wallet.class, lookup);
        MethodHandle secret = walletLookup.findVirtual(Wallet.class, "secret", MethodType.methodType(String.class));
        System.out.println("privateLookupIn: " + (String) secret.invokeExact(w));

        // field getters and setters, constructors
        MethodHandle getBalance = walletLookup.findGetter(Wallet.class, "balancePaise", long.class);
        MethodHandle setBalance = walletLookup.findSetter(Wallet.class, "balancePaise", long.class);
        setBalance.invokeExact(w, 99_000L);
        System.out.println("findGetter: " + (long) getBalance.invokeExact(w) + ", type " + getBalance.type());
        MethodHandle ctor = walletLookup.findConstructor(Wallet.class, MethodType.methodType(void.class, String.class, long.class));
        Wallet ravi = (Wallet) ctor.invokeExact("Ravi", 1_000L);
        System.out.println("findConstructor: " + (String) secret.invokeExact(ravi));

        // combinators: bind a receiver, fix an argument
        MethodHandle debitAsha = debit.bindTo(w);
        MethodHandle debitAshaFare = MethodHandles.insertArguments(debitAsha, 0, 7_000L);
        System.out.println("bound + inserted: " + (long) debitAshaFare.invokeExact() + ", type " + debitAshaFare.type());
    }
}`,
        },
        {
          type: "output",
          text: `type of debit: (Wallet,long)long
invokeExact -> 38000
gst(20000) = 1000
WrongMethodTypeException: handle's method type (long)long but found (long)int
WrongMethodTypeException: handle's method type (long)long but found (long)Object
invoke adapts: 1000 (Long)
IllegalAccessException: no such method: Wallet.secret()String/invokeVirtual
privateLookupIn: Asha has 38000
findGetter: 99000, type (Wallet)long
findConstructor: Ravi has 1000
bound + inserted: 92000, type ()long`,
        },
        {
          type: "list",
          items: [
            "**`MethodType`** is a handle's signature: return type first, then parameters. `findVirtual` makes the receiver the first parameter, so `debit` has type `(Wallet,long)long`, and a constructor handle returns the new object.",
            "**`invokeExact` requires the call site's static types to match the handle's type exactly.** The compiler records the call site's type from the argument expressions and the **cast on the result**: `(int) gst.invokeExact(20_000L)` is the type `(long)int`, and `Object boxed = gst.invokeExact(...)` is `(long)Object`. Both threw `WrongMethodTypeException` naming the two types. `MethodHandle.invokeExact` is **signature polymorphic**: `javac` doesn't check it against a declared signature but writes whatever type the call site has into the class file.",
            "**`invoke` adapts** with `asType`: it unboxed the `Integer`, widened to `long`, and boxed the `long` result back to a `Long`. That's convenient and costs adaptation; `invokeExact` is what fast code uses.",
            "**Access is checked once, at lookup**, against the class that created the `Lookup` (`MethodHandles.lookup()` captures its caller). `Handles` can't see `Wallet.secret()`, so `findVirtual` threw `IllegalAccessException`, with an odd message, `no such method: Wallet.secret()String/invokeVirtual`, because the lookup refuses to reveal a member it may not access. `privateLookupIn(Wallet.class, lookup)` produced a lookup with private access to `Wallet` (allowed because both are in the same module; across modules the package must be `opens`), and that found it.",
            "`findGetter`/`findSetter` give handles that read and write fields, and the **combinators** build new handles from old ones: `bindTo` fixed the receiver and `insertArguments` the amount, leaving a `()long` handle. Frameworks build whole call chains this way and the JIT inlines through all of it when the handle is constant.",
          ],
        },
        {
          type: "heading",
          text: "VarHandle: fields with memory-ordering modes",
        },
        {
          type: "code",
          language: "java",
          title: "SeatCounter.java",
          code: `import java.lang.invoke.MethodHandles;
import java.lang.invoke.VarHandle;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SeatCounter {
    private volatile int seatsLeft = 1000;
    private static final VarHandle SEATS;
    static {
        try {
            SEATS = MethodHandles.lookup().findVarHandle(SeatCounter.class, "seatsLeft", int.class);
        } catch (ReflectiveOperationException e) { throw new ExceptionInInitializerError(e); }
    }

    boolean book() {
        int current;
        do {
            current = (int) SEATS.getVolatile(this);
            if (current == 0) return false;
        } while (!SEATS.compareAndSet(this, current, current - 1));
        return true;
    }

    public static void main(String[] args) throws Exception {
        SeatCounter shuttle = new SeatCounter();
        int[] booked = new int[8];
        try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
            for (int t = 0; t < 8; t++) {
                int id = t;
                pool.submit(() -> { for (int i = 0; i < 200; i++) if (shuttle.book()) booked[id]++; });
            }
        }
        int total = 0;
        for (int b : booked) total += b;
        System.out.println("booked " + total + ", left " + shuttle.seatsLeft);
        System.out.println("VarHandle type: " + SEATS.varType() + " on " + SEATS.coordinateTypes());
        System.out.println("getAndAdd -> " + (int) SEATS.getAndAdd(shuttle, 5) + ", now " + shuttle.seatsLeft);
    }
}`,
        },
        {
          type: "output",
          text: `booked 1000, left 0
VarHandle type: int on [class SeatCounter]
getAndAdd -> 0, now 5`,
        },
        {
          type: "paragraph",
          text: "A `VarHandle` (Java 9) is a handle to a variable: a field, an array element or off-heap memory, with access modes from plain reads to `getVolatile`, `compareAndSet` and `getAndAdd`. Eight threads tried to book 1,600 seats from 1,000, and exactly 1,000 succeeded: the compare-and-set loop never lost or doubled a booking. This is how `AtomicInteger`, `ConcurrentHashMap` and `ForkJoinPool` are implemented on modern JDKs (they replaced `sun.misc.Unsafe`). `coordinateTypes` is `[SeatCounter]`: the object whose field to access. In application code I'd use `AtomicInteger`; `VarHandle` is for libraries that need atomics on their own fields without an extra object per field.",
        },
      ],
    },
    {
      title: "How Frameworks Use Reflection",
      blocks: [
        {
          type: "table",
          headers: ["Framework", "What it does", "With what"],
          rows: [
            ["Spring DI", "Finds constructors and `@Autowired` fields, creates beans, injects", "`getDeclaredConstructors`, `Field.set`, annotations, cached metadata"],
            ["Spring AOP (`@Transactional`, `@Async`, `@Cacheable`)", "Wraps beans in proxies that run advice around calls", "JDK proxies or CGLIB subclasses"],
            ["Spring Data repositories", "Implements an interface I only declared", "JDK proxy + method-name parsing"],
            ["Jackson", "Finds getters, setters, fields, creators, record components", "Introspection cached per type, `Method.invoke` or generated accessors (Afterburner/Blackbird modules)"],
            ["JUnit 5", "Finds `@Test` methods, creates a test instance per method", "`getDeclaredMethods`, annotations, `Constructor.newInstance`"],
            ["Hibernate / JPA", "Reads and writes entity fields, lazy-loads relations", "Field access, ByteBuddy proxies and bytecode enhancement"],
            ["Mockito", "Creates mocks and spies of classes and interfaces", "ByteBuddy subclasses or inline instrumentation"],
            ["`ServiceLoader`", "Finds implementations listed in `META-INF/services` or `provides`", "Reflection on a no-arg constructor or `provider()` method"],
          ],
        },
        {
          type: "heading",
          text: "A dependency injection container in 55 lines",
        },
        {
          type: "code",
          language: "java",
          title: "TinyDi.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class TinyDi {
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.TYPE) @interface Component { }
    @Retention(RetentionPolicy.RUNTIME) @Target({ElementType.FIELD, ElementType.CONSTRUCTOR}) @interface Inject { }
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) @interface Init { }

    // ---- the container ----
    static final class Container {
        private final List<Class<?>> components = new ArrayList<>();
        private final Map<Class<?>, Object> singletons = new HashMap<>();
        private final Set<Class<?>> creating = new LinkedHashSet<>();

        Container(Class<?>... classes) {
            for (Class<?> c : classes) {
                if (!c.isAnnotationPresent(Component.class)) throw new IllegalArgumentException(c.getSimpleName() + " is not a @Component");
                components.add(c);
            }
        }

        <T> T get(Class<T> type) {
            Class<?> impl = implementationOf(type);
            Object existing = singletons.get(impl);
            if (existing != null) return type.cast(existing);
            if (!creating.add(impl)) throw new IllegalStateException("cycle: " + creating.stream().map(Class::getSimpleName).toList() + " -> " + impl.getSimpleName());
            try {
                Constructor<?> ctor = pickConstructor(impl);
                Object[] args = new Object[ctor.getParameterCount()];
                for (int i = 0; i < args.length; i++) args[i] = get(ctor.getParameterTypes()[i]);  // constructor injection
                ctor.setAccessible(true);
                Object bean = ctor.newInstance(args);
                for (Field f : impl.getDeclaredFields()) {                                        // field injection
                    if (!f.isAnnotationPresent(Inject.class)) continue;
                    f.setAccessible(true);
                    f.set(bean, get(f.getType()));
                }
                for (Method m : impl.getDeclaredMethods()) {
                    if (m.isAnnotationPresent(Init.class)) { m.setAccessible(true); m.invoke(bean); }
                }
                singletons.put(impl, bean);
                return type.cast(bean);
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException("cannot create " + impl.getSimpleName(), e);
            } finally {
                creating.remove(impl);
            }
        }

        private Class<?> implementationOf(Class<?> type) {
            List<Class<?>> found = components.stream().filter(type::isAssignableFrom).toList();
            if (found.size() != 1) throw new IllegalStateException(found.size() + " components for " + type.getSimpleName() + ": "
                    + found.stream().map(Class::getSimpleName).toList());
            return found.get(0);
        }

        private static Constructor<?> pickConstructor(Class<?> c) throws NoSuchMethodException {
            for (Constructor<?> k : c.getDeclaredConstructors()) if (k.isAnnotationPresent(Inject.class)) return k;
            return c.getDeclaredConstructor();
        }
    }

    // ---- an application wired by it ----
    interface FareRepository { long baseFare(String zone); }

    @Component static class InMemoryFares implements FareRepository {
        private final Map<String, Long> fares = new HashMap<>();
        @Init void load() { fares.put("SALT-LAKE", 4000L); fares.put("NEW-TOWN", 4500L); System.out.println("  InMemoryFares loaded"); }
        public long baseFare(String zone) { return fares.getOrDefault(zone, 5000L); }
    }

    @Component static class SurgeService {
        long apply(long paise) { return paise * 120 / 100; }
    }

    @Component static class QuoteService {
        private final FareRepository fares;
        @Inject private SurgeService surge;                          // field injection
        @Inject QuoteService(FareRepository fares) { this.fares = fares; }   // constructor injection
        long quote(String zone) { return surge.apply(fares.baseFare(zone)); }
    }

    @Component static class A { @Inject B b; }
    @Component static class B { @Inject A a; }

    public static void main(String[] args) {
        Container c = new Container(InMemoryFares.class, SurgeService.class, QuoteService.class);
        QuoteService quotes = c.get(QuoteService.class);
        System.out.println("SALT-LAKE quote " + quotes.quote("SALT-LAKE") + " paise");
        System.out.println("singleton? " + (quotes == c.get(QuoteService.class)) + ", shared SurgeService? "
                + (c.get(SurgeService.class) == quotes.surge));
        try {
            new Container(A.class, B.class).get(A.class);
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage());
        }
        try {
            new Container(SurgeService.class).get(FareRepository.class);
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `  InMemoryFares loaded
SALT-LAKE quote 4800 paise
singleton? true, shared SurgeService? true
cycle: [A, B] -> A
0 components for FareRepository: []`,
        },
        {
          type: "list",
          items: [
            "**Annotations are the contract.** `@Component`, `@Inject` and `@Init` are ordinary annotations with `@Retention(RUNTIME)`, so `isAnnotationPresent` can see them; with the default `CLASS` retention they'd be in the class file but invisible to reflection. The Annotations phase covers retention and targets properly.",
            "**Resolving a type** (`implementationOf`) means finding the one registered component assignable to it: `FareRepository` resolved to `InMemoryFares`. Zero or several candidates is an error naming them, which is Spring's `NoSuchBeanDefinitionException` and `NoUniqueBeanDefinitionException`.",
            "**Constructor injection** recursively resolves each parameter type, then calls `newInstance`. **Field injection** sets `@Inject` fields after construction with `setAccessible(true)`, which is why field-injected dependencies can't be `final` and aren't visible to anyone constructing the class in a test. **`@Init`** runs after injection, like `@PostConstruct`.",
            "**Singletons** are cached per implementation class, so `QuoteService` and the container hand out the same `SurgeService`.",
            "**Cycles** are detected with the `creating` set: `A` needs `B` needs `A`. Spring can resolve field-injection cycles by exposing a half-built bean early, and since Spring Boot 2.6 refuses them by default anyway; constructor-injection cycles are impossible to satisfy.",
            "Real containers add classpath scanning (reading class files to find `@Component` without loading every class), scopes, qualifiers, proxies for AOP, and caching of all this metadata so that the reflection happens once at startup, never per request.",
          ],
        },
        {
          type: "heading",
          text: "ServiceLoader",
        },
        {
          type: "code",
          language: "java",
          title: "Payments.java",
          code: `import java.util.ServiceLoader;

public class Payments {
    public interface PaymentGateway {
        String name();
        boolean supports(String method);
    }

    public static class UpiGateway implements PaymentGateway {
        public String name() { return "upi"; }
        public boolean supports(String m) { return m.equals("UPI"); }
    }

    public static class CardGateway implements PaymentGateway {
        public String name() { return "card"; }
        public boolean supports(String m) { return m.equals("CARD"); }
    }

    public static void main(String[] args) {
        ServiceLoader<PaymentGateway> loader = ServiceLoader.load(PaymentGateway.class);
        for (ServiceLoader.Provider<PaymentGateway> p : loader.stream().toList()) {
            System.out.println("found " + p.type().getName());
        }
        PaymentGateway forUpi = loader.stream().map(ServiceLoader.Provider::get)
                .filter(g -> g.supports("UPI")).findFirst().orElseThrow();
        System.out.println("UPI handled by " + forUpi.name());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `mkdir -p META-INF/services
printf 'Payments$UpiGateway\\nPayments$CardGateway\\n' > 'META-INF/services/Payments$PaymentGateway'
javac Payments.java && java Payments`,
        },
        {
          type: "output",
          text: `found Payments$UpiGateway
found Payments$CardGateway
UPI handled by upi`,
        },
        {
          type: "paragraph",
          text: "`ServiceLoader` is the JDK's built-in plugin mechanism: a text file named after the interface lists implementation classes, and the loader instantiates them reflectively through their public no-arg constructors. `stream()` (Java 9) exposes each `Provider`'s type **without** creating it, so I could list both gateways and only instantiate as needed. In a named module, `provides PaymentGateway with UpiGateway;` in `module-info.java` replaces the text file, and the provider can be a static `provider()` method instead of a constructor. JDBC drivers, `java.nio` file systems and logging backends are found this way.",
        },
        {
          type: "heading",
          text: "Reflection and GraalVM native images",
        },
        {
          type: "paragraph",
          text: "A GraalVM native image compiles the application ahead of time under a closed-world assumption: only code proven reachable is included. A `Class.forName(nameFromConfig)` or `getDeclaredMethods()` can't be proven, so reflective targets must be declared at build time, in `reflect-config.json` (newer GraalVM releases also accept a single `reachability-metadata.json`), with dynamic proxies declared similarly:",
        },
        {
          type: "code",
          language: "json",
          code: `[
  {
    "name": "TinyDi$QuoteService",
    "allDeclaredConstructors": true,
    "allDeclaredFields": true,
    "allDeclaredMethods": true
  }
]`,
        },
        {
          type: "paragraph",
          text: "I haven't built a native image for this lesson; this is the concept. Undeclared reflection fails at run time in the image with `ClassNotFoundException` or `NoSuchMethodException`, even though the JVM version works. Spring Boot 3's AOT processing generates these hints from the bean definitions, and GraalVM's tracing agent (`-agentlib:native-image-agent`) records them from a normal JVM run. It's one more reason frameworks are moving from run-time reflection to build-time code generation (Micronaut, Quarkus, Dagger, MapStruct).",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `fares.quote(\"SALT-LAKE\", 8)` from `TimingProxy.java`, from creation to return:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`Proxy.newProxyInstance`.** Checks that every `Class` passed is an interface visible from the loader, then looks up the proxy class cache for (loader, `[FareService]`). It's empty.",
            "**Generate.** `ProxyGenerator` collects the methods to implement (`hashCode`, `equals`, `toString`, then `quote` and `cancelFee`), writes a class file with ASM, and defines `jdk.proxy1.$Proxy0` in the `jdk.proxy1` dynamic module, which is made to read `FareService`'s module. The class is cached for the loader.",
            "**Instantiate.** The proxy's constructor `$Proxy0(InvocationHandler)` is called reflectively with my `Timing` handler, stored in `Proxy.h`. Initialising `$Proxy0` ran its static block: five `getMethod` lookups into `m0` to `m4`.",
            "**The call.** `fares.quote(\"SALT-LAKE\", 8)` is an `invokeinterface FareService.quote` on an object whose class is `$Proxy0`, so `$Proxy0.quote` runs: it boxes `8` with `Integer.valueOf`, builds `Object[] { \"SALT-LAKE\", 8 }`, and calls `h.invoke(this, m3, args)`.",
            "**The handler.** `Timing.invoke` records `nanoTime`, then calls `m3.invoke(target, args)`. That is the previous lesson's path: access check, first-time creation of a `DirectMethodHandleAccessor` (this is where most of the 12 ms went), unboxing, and `RealFareService.quote` returning `13600L`, boxed to a `Long`.",
            "**Back out.** The handler prints and returns the `Long`. `$Proxy0.quote` does `checkcast Long` and `longValue()`, and returns `13600` to `main`.",
            "**For `cancelFee(\" \")`**, the target throws `IllegalArgumentException`, `Method.invoke` wraps it in `InvocationTargetException`, the handler rethrows the cause, and the proxy's exception table lets the `RuntimeException` pass through unchanged to the caller.",
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
          code: `import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.VarHandle;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.function.Supplier;

public class SyntaxTour {
    @Retention(RetentionPolicy.RUNTIME) @interface Audited { String value(); }

    public interface Greeter { String greet(String name); }

    @Audited("pricing")
    static class Meter { volatile long paise; long add(long p) { return paise += p; } static long gst(long p) { return p / 20; } }

    public static void main(String[] args) throws Throwable {
        // 1. a dynamic proxy
        InvocationHandler h = (proxy, method, a) -> method.getName().equals("greet") ? "Namaskar, " + a[0] : null;
        Greeter g = (Greeter) Proxy.newProxyInstance(Greeter.class.getClassLoader(), new Class<?>[] { Greeter.class }, h);
        System.out.println(g.greet("Asha") + " | " + Proxy.isProxyClass(g.getClass()) + " " + (Proxy.getInvocationHandler(g) == h));

        // 2. method handles
        MethodHandles.Lookup lookup = MethodHandles.lookup();
        MethodHandle add = lookup.findVirtual(Meter.class, "add", MethodType.methodType(long.class, long.class));
        MethodHandle gst = lookup.findStatic(Meter.class, "gst", MethodType.methodType(long.class, long.class));
        Meter meter = new Meter();
        long total = (long) add.invokeExact(meter, 20_000L);
        System.out.println(total + " " + (long) gst.invokeExact(total) + " " + gst.invoke(Integer.valueOf(1000)) + " " + add.type());

        // 3. a field through a VarHandle
        VarHandle paise = lookup.findVarHandle(Meter.class, "paise", long.class);
        System.out.println(paise.compareAndSet(meter, 20_000L, 25_000L) + " " + meter.paise);

        // 4. annotations at run time
        Audited a = Meter.class.getAnnotation(Audited.class);
        System.out.println(a.value() + " " + Meter.class.isAnnotationPresent(Audited.class));

        // 5. a lambda is an invokedynamic call site and a hidden class
        Supplier<String> s = () -> "hi";
        System.out.println(s.getClass().isHidden() + " " + s.get());
    }
}`,
        },
        {
          type: "output",
          text: `Namaskar, Asha | true true
20000 1000 50 (Meter,long)long
true 25000
pricing true
true hi`,
        },
        {
          type: "paragraph",
          text: "`gst.invoke(Integer.valueOf(1000))` returned 50 by adapting `Integer` to `long`, while each `invokeExact` call needed exactly the handle's type, including the `(long)` cast on the result. `Meter.class.getAnnotation(Audited.class)` returned a proxy too: annotation instances at run time are JDK dynamic proxies implementing the annotation interface.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: A test runner in the style of JUnit",
        },
        {
          type: "code",
          language: "java",
          title: "MiniTestRunner.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.Comparator;

public class MiniTestRunner {
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) @interface Test { }
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) @interface BeforeEach { }

    static void check(boolean ok, String message) { if (!ok) throw new AssertionError(message); }

    // The class under test and its tests
    static long fare(int km) {
        if (km < 0) throw new IllegalArgumentException("km < 0");
        return 4000 + km * 1200L;
    }

    public static class FareTests {
        private int setUps;
        @BeforeEach void reset() { setUps++; }
        @Test void minimumFare() { check(fare(0) == 4000, "minimum fare"); }
        @Test void tenKm() { check(fare(10) == 16000, "expected 16000 but was " + fare(10)); }
        @Test void freshInstance() { check(setUps == 1, "instance reused, setUps=" + setUps); }
        @Test void negativeKm() { fare(-1); }
        @Test void wrongExpectation() { check(fare(5) == 9000, "expected 9000 but was " + fare(5)); }
        void helper() { throw new IllegalStateException("not a test, never run"); }
    }

    static void run(Class<?> testClass) throws ReflectiveOperationException {
        Method[] methods = testClass.getDeclaredMethods();
        Arrays.sort(methods, Comparator.comparing(Method::getName));       // getDeclaredMethods has no defined order
        Method before = Arrays.stream(methods).filter(m -> m.isAnnotationPresent(BeforeEach.class)).findFirst().orElse(null);
        int passed = 0, failed = 0;
        for (Method m : methods) {
            if (!m.isAnnotationPresent(Test.class)) continue;
            if (Modifier.isStatic(m.getModifiers()) || m.getParameterCount() != 0) throw new IllegalStateException("bad @Test " + m);
            Object instance = testClass.getDeclaredConstructor().newInstance();    // a new instance per test, like JUnit
            try {
                if (before != null) { before.setAccessible(true); before.invoke(instance); }
                m.setAccessible(true);
                m.invoke(instance);
                passed++;
                System.out.println("  PASS " + m.getName());
            } catch (InvocationTargetException e) {
                failed++;
                Throwable cause = e.getCause();
                System.out.println("  " + (cause instanceof AssertionError ? "FAIL " : "ERROR ") + m.getName() + ": " + cause);
            }
        }
        System.out.println(passed + " passed, " + failed + " failed");
    }

    public static void main(String[] args) throws Exception {
        run(FareTests.class);
    }
}`,
        },
        {
          type: "output",
          text: `  PASS freshInstance
  PASS minimumFare
  ERROR negativeKm: java.lang.IllegalArgumentException: km < 0
  PASS tenKm
  FAIL wrongExpectation: java.lang.AssertionError: expected 9000 but was 10000
3 passed, 2 failed`,
        },
        {
          type: "list",
          items: [
            "Discovery is `getDeclaredMethods` filtered by `@Test`; `helper()` has no annotation and never ran.",
            "**A new instance per test**, as JUnit 5 does by default: `freshInstance` passed because `setUps` was 1, so no state leaked between tests.",
            "**Failures arrive wrapped**: every test failure is an `InvocationTargetException`, and the runner reports the **cause**. An `AssertionError` is a FAIL (the expectation was wrong or the code is), anything else an ERROR, the same distinction JUnit 4 made.",
            "I sorted by name because `getDeclaredMethods` has no defined order. JUnit 5 also uses a deterministic but deliberately non-obvious order, so tests that depend on running in source order are caught.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: A JSON writer that finds getters like Jackson",
        },
        {
          type: "code",
          language: "java",
          title: "MiniJson.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;

public class MiniJson {
    @Retention(RetentionPolicy.RUNTIME) @Target({ElementType.METHOD, ElementType.RECORD_COMPONENT}) @interface JsonIgnore { }

    // property name -> accessor, discovered once per class (Jackson caches the same way)
    static final Map<Class<?>, Map<String, Method>> PROPERTIES = new ConcurrentHashMap<>();

    static Map<String, Method> properties(Class<?> c) {
        return PROPERTIES.computeIfAbsent(c, k -> {
            Map<String, Method> props = new TreeMap<>();
            if (k.isRecord()) {
                for (RecordComponent rc : k.getRecordComponents()) {
                    if (!rc.isAnnotationPresent(JsonIgnore.class)) props.put(rc.getName(), rc.getAccessor());
                }
                return props;
            }
            for (Method m : k.getMethods()) {                       // public getters, inherited ones included
                if (m.getParameterCount() != 0 || Modifier.isStatic(m.getModifiers()) || m.getDeclaringClass() == Object.class) continue;
                if (m.isAnnotationPresent(JsonIgnore.class)) continue;
                String n = m.getName();
                if (n.startsWith("get") && n.length() > 3) props.put(decapitalise(n.substring(3)), m);
                else if (n.startsWith("is") && n.length() > 2 && m.getReturnType() == boolean.class) props.put(decapitalise(n.substring(2)), m);
            }
            return props;
        });
    }

    static String decapitalise(String s) { return Character.toLowerCase(s.charAt(0)) + s.substring(1); }

    static String write(Object o) throws ReflectiveOperationException {
        if (o == null) return "null";
        if (o instanceof String s) return "\\"" + s.replace("\\"", "\\\\\\"") + "\\"";
        if (o instanceof Number || o instanceof Boolean) return o.toString();
        if (o instanceof Enum<?> e) return "\\"" + e.name() + "\\"";
        if (o instanceof Collection<?> c) {
            List<String> parts = new ArrayList<>();
            for (Object item : c) parts.add(write(item));
            return "[" + String.join(",", parts) + "]";
        }
        StringJoiner obj = new StringJoiner(",", "{", "}");
        for (Map.Entry<String, Method> p : properties(o.getClass()).entrySet()) {
            obj.add("\\"" + p.getKey() + "\\":" + write(p.getValue().invoke(o)));
        }
        return obj.toString();
    }

    enum Status { REQUESTED, COMPLETED }
    public record Stop(String zone, @JsonIgnore String internalNote) { }
    public static class Trip {
        public String getId() { return "T-1042"; }
        public Status getStatus() { return Status.COMPLETED; }
        public long getFarePaise() { return 22_500; }
        public boolean isShared() { return false; }
        public List<Stop> getStops() { return List.of(new Stop("SALT-LAKE", "gate 3"), new Stop("NEW-TOWN", "")); }
        @JsonIgnore public String getRiderPhone() { return "9830012345"; }
        public String computeEta() { return "not a getter, ignored"; }
    }

    public static void main(String[] args) throws Exception {
        System.out.println(write(new Trip()));
        System.out.println("cached: " + PROPERTIES.keySet().stream().map(Class::getSimpleName).sorted().toList());
    }
}`,
        },
        {
          type: "output",
          text: `{"farePaise":22500,"id":"T-1042","shared":false,"status":"COMPLETED","stops":[{"zone":"SALT-LAKE"},{"zone":"NEW-TOWN"}]}
cached: [Stop, Trip]`,
        },
        {
          type: "list",
          items: [
            "**Bean rules**: `getX()` and `isX()` (for `boolean` only) with no parameters become property `x`. `computeEta()` isn't a getter and was ignored; `getRiderPhone()` was dropped by `@JsonIgnore`; `getClass()` was excluded by skipping methods declared on `Object`, which Jackson also does.",
            "**Records** use their components and accessors, so `Stop`'s `internalNote`, annotated on the component, was left out. Jackson supports records the same way since 2.12.",
            "**Introspection is cached** per class in a `ConcurrentHashMap`: `Trip` and `Stop` were each analysed once. Jackson's equivalent is its `BeanDescription` and serializer caches, which is why the first serialization of a type is slow and later ones aren't.",
            "Properties are sorted by name (a `TreeMap`) to make output deterministic. Jackson's default order isn't alphabetical and isn't guaranteed either; `@JsonPropertyOrder` or `MapperFeature.SORT_PROPERTIES_ALPHABETICALLY` fix it when it matters (signatures, snapshot tests).",
          ],
        },
        {
          type: "heading",
          text: "Example 3: A @Retry proxy for a payment gateway",
        },
        {
          type: "code",
          language: "java",
          title: "RetryProxy.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RetryProxy {
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD)
    @interface Retry { int attempts() default 3; Class<? extends Exception> on() default RuntimeException.class; }

    static class GatewayTimeout extends RuntimeException { GatewayTimeout(String m) { super(m); } }

    public interface PaymentGateway {
        @Retry(attempts = 3, on = GatewayTimeout.class)
        String charge(String rider, long paise);
        String refund(String paymentId);                      // not retried: refunds must not run twice
        default String chargeTrip(String rider, long paise) { return "trip " + charge(rider, paise); }
    }

    static class FlakyGateway implements PaymentGateway {
        int calls;
        public String charge(String rider, long paise) {
            if (++calls < 3) throw new GatewayTimeout("timeout on call " + calls);
            return "PAY-" + calls + " " + rider + " " + paise;
        }
        public String refund(String id) { throw new GatewayTimeout("refund timeout"); }
    }

    @SuppressWarnings("unchecked")
    static <T> T withRetry(Class<T> iface, T target) {
        Map<Method, Retry> policies = new ConcurrentHashMap<>();
        for (Method m : iface.getMethods()) {                          // read annotations once, not per call
            Retry r = m.getAnnotation(Retry.class);
            if (r != null) policies.put(m, r);
        }
        InvocationHandler h = (proxy, m, args) -> {
            if (m.isDefault()) return InvocationHandler.invokeDefault(proxy, m, args);
            Retry policy = policies.get(m);
            int attempts = policy == null ? 1 : policy.attempts();
            for (int i = 1; ; i++) {
                try {
                    return m.invoke(target, args);
                } catch (InvocationTargetException e) {
                    Throwable cause = e.getCause();
                    boolean retryable = policy != null && policy.on().isInstance(cause);
                    if (!retryable || i == attempts) throw cause;
                    System.out.println("  retry " + m.getName() + " after: " + cause.getMessage());
                }
            }
        };
        return (T) Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[] { iface }, h);
    }

    public static void main(String[] args) {
        PaymentGateway gateway = withRetry(PaymentGateway.class, new FlakyGateway());
        System.out.println(gateway.charge("Asha", 22_500));
        System.out.println(gateway.chargeTrip("Ravi", 18_000));
        try {
            gateway.refund("PAY-3");
        } catch (GatewayTimeout e) {
            System.out.println("refund failed once, not retried: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `  retry charge after: timeout on call 1
  retry charge after: timeout on call 2
PAY-3 Asha 22500
trip PAY-4 Ravi 18000
refund failed once, not retried: refund timeout`,
        },
        {
          type: "list",
          items: [
            "The retry policy is read from annotations **once**, when the proxy is built, into a map keyed by `Method`. The `Method` the handler receives is the proxy's cached `m3`-style object, equal to what `getMethods` returned, so the lookup works.",
            "`charge` failed twice with `GatewayTimeout` and succeeded on the third attempt. `refund` has no `@Retry`, so its timeout went straight to the caller: retrying a refund that may already have gone through could pay the rider twice. Retries belong only on idempotent operations, or on operations protected by an idempotency key.",
            "`chargeTrip` is a default method run with `invokeDefault`, so its internal `charge` call went **through the proxy** (with `this` being the proxy) and would have been retried; here the gateway had already recovered. An implementation-class method calling `charge` on `this` would bypass the retry, as the next sections show.",
            "Production retry libraries (Resilience4j, Spring Retry) add backoff with jitter, a maximum total time, and metrics; the structure is the same.",
          ],
        },
      ],
    },
    {
      title: "When to Use Which",
      blocks: [
        {
          type: "table",
          headers: ["Need", "Use", "Why"],
          rows: [
            ["Cross-cutting behaviour on a few known classes", "A hand-written decorator", "Plain code, no magic, refactor-safe"],
            ["The same behaviour on many interfaces", "JDK `Proxy` + `InvocationHandler`", "Built into the JDK, no dependencies"],
            ["Intercepting classes without interfaces", "ByteBuddy (or a framework that uses it)", "Subclass proxies; JDK proxies can't"],
            ["Intercepting internal calls too", "AspectJ weaving, or restructure the code", "Proxies never see `this.x()`"],
            ["Calling a member found at run time, often", "A cached `MethodHandle` (`static final` if possible)", "Measured as fast as a direct call when constant"],
            ["Calling a member found at run time, rarely", "`Method.invoke`", "Simpler, and cost doesn't matter"],
            ["Atomic updates to your own fields", "`AtomicInteger`, or `VarHandle` in libraries", "No `Unsafe`, defined memory semantics"],
            ["Plugin discovery", "`ServiceLoader`", "Standard, works with modules"],
            ["Wiring an application", "A DI framework, or plain constructors in `main`", "Small apps don't need a container"],
            ["Native images or fast startup", "Build-time generation (Dagger, Micronaut, MapStruct)", "No run-time reflection to declare or pay for"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Not unwrapping InvocationTargetException in a handler",
        },
        {
          type: "code",
          language: "java",
          title: "NoUnwrap.java",
          code: `import java.lang.reflect.Proxy;
import java.util.function.Supplier;

public class NoUnwrap {
    public static void main(String[] args) {
        Supplier<String> real = () -> { throw new IllegalStateException("driver offline"); };
        @SuppressWarnings("unchecked")
        Supplier<String> proxy = (Supplier<String>) Proxy.newProxyInstance(Supplier.class.getClassLoader(),
                new Class<?>[] { Supplier.class }, (p, m, a) -> m.invoke(real, a));     // no unwrapping
        try {
            proxy.get();
        } catch (IllegalStateException e) {
            System.out.println("caught the real exception");
        } catch (RuntimeException e) {
            System.out.println(e.getClass().getName());
            System.out.println("  cause: " + e.getCause().getClass().getName());
            System.out.println("  cause of cause: " + e.getCause().getCause());
        }
    }
}`,
        },
        {
          type: "output",
          text: `java.lang.reflect.UndeclaredThrowableException
  cause: java.lang.reflect.InvocationTargetException
  cause of cause: java.lang.IllegalStateException: driver offline`,
        },
        {
          type: "paragraph",
          text: "The handler let `InvocationTargetException` (a checked exception) escape, and `Supplier.get` declares none, so the proxy's exception table wrapped it in `UndeclaredThrowableException`. The caller's `catch (IllegalStateException e)` never matched: the real exception was two causes deep. Always catch `InvocationTargetException` in a forwarding handler and rethrow `getCause()`.",
        },
        {
          type: "heading",
          text: "Expecting annotations to work on internal calls",
        },
        {
          type: "paragraph",
          text: "`@Transactional`, `@Retry`, `@Cacheable`, `@Async` and `@Timed` on a method called as `this.method()` from the same bean are ignored, because the call never reaches the proxy. The production section shows a lost rollback.",
        },
        {
          type: "heading",
          text: "Annotating private or final methods",
        },
        {
          type: "paragraph",
          text: "JDK proxies only implement interface methods, and subclass proxies can't override `private`, `final` or `static` methods. `SubclassProxy` showed `minimum()` running unintercepted. The annotation compiles and is silently ignored.",
        },
        {
          type: "heading",
          text: "Forwarding equals, hashCode and toString blindly",
        },
        {
          type: "paragraph",
          text: "`naive.equals(naive)` was `false` because the target compared itself with the proxy. Handle the three `Object` methods explicitly, giving the proxy its own identity or a deliberate equality.",
        },
        {
          type: "heading",
          text: "Returning null from a handler for a primitive method",
        },
        {
          type: "paragraph",
          text: "The generated method unboxes the handler's result. A handler that returned `null` for `hashCode()` produced `NullPointerException: Cannot invoke \"java.lang.Integer.intValue()\" because the return value of \"java.lang.reflect.InvocationHandler.invoke(...)\" is null`, thrown from `$Proxy0.hashCode`. Return a value of the right wrapper type for every primitive method.",
        },
        {
          type: "heading",
          text: "Using invokeExact with the wrong static types",
        },
        {
          type: "paragraph",
          text: "`(int) handle.invokeExact(...)` on a handle returning `long`, or assigning the result to `Object`, throws `WrongMethodTypeException`. Cast the result to exactly the return type, pass arguments of exactly the parameter types, or use `invoke`.",
        },
        {
          type: "heading",
          text: "Building proxies or handles per request",
        },
        {
          type: "paragraph",
          text: "The proxy class is cached, but every `newProxyInstance` still runs lookups and a reflective constructor call, and every `findVirtual` performs access checks and may spin classes. Build proxies and handles once, at startup.",
        },
        {
          type: "heading",
          text: "Benchmarking proxies in one JVM, one call site",
        },
        {
          type: "paragraph",
          text: "Running several implementations through the same loop made the call site megamorphic and slowed every case measured after the first two: the JDK proxy went from 0.68 ns in its own JVM to 4.68 ns. Performance below has both numbers.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Prefer a hand-written decorator for one or two classes; reach for proxies when the same behaviour applies to many interfaces.",
            "In every forwarding handler: handle `equals`, `hashCode` and `toString` deliberately, unwrap `InvocationTargetException`, and use `invokeDefault` for default methods.",
            "Read annotations and build per-method policies once, when the proxy is created, not on each call.",
            "Put cross-cutting annotations on public methods that are called from **other** beans; split a class when an internal call needs the behaviour.",
            "Know which proxy type your framework creates (Spring Boot: CGLIB by default) and its limits: no `final`, `private` or `static` methods.",
            "For dynamic invocation on hot paths, use `MethodHandle`s stored in `static final` fields, called with `invokeExact`.",
            "Use `privateLookupIn` and module `opens` instead of `setAccessible` in modular code.",
            "Prefer constructor injection: dependencies can be `final` and tests can construct the class directly.",
            "Keep startup in mind: every proxy class, handle shape and lambda call site costs class loading; for native images or serverless, prefer build-time generation.",
            "Detect proxies with `Proxy.isProxyClass` or framework utilities, never by class-name patterns.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "ProxyBench.java",
          code: `import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;

public class ProxyBench {
    public interface FareService { long quote(int km); }
    static final class RealFareService implements FareService {
        public long quote(int km) { return 4000 + km * 1200L; }
    }

    static final int N = 10_000_000;

    static long loop(FareService s) { long sum = 0; for (int i = 0; i < N; i++) sum += s.quote(i & 63); return sum; }

    static FareService proxy(InvocationHandler h) {
        return (FareService) Proxy.newProxyInstance(FareService.class.getClassLoader(), new Class<?>[] { FareService.class }, h);
    }

    // One case per JVM, so the call site in loop() only ever sees one receiver class
    public static void main(String[] args) {
        RealFareService real = new RealFareService();
        long t0 = System.nanoTime();
        FareService s = switch (args[0]) {
            case "direct" -> real;
            case "lambda" -> km -> real.quote(km);
            case "proxy-direct" -> proxy((p, m, a) -> real.quote((Integer) a[0]));
            case "proxy-reflect" -> proxy((p, m, a) -> m.invoke(real, a));
            default -> throw new IllegalArgumentException(args[0]);
        };
        long t1 = System.nanoTime();
        s.quote(1);
        long t2 = System.nanoTime();

        long best = Long.MAX_VALUE, check = 0;
        for (int round = 0; round < 7; round++) {
            long start = System.nanoTime();
            check = loop(s);
            best = Math.min(best, System.nanoTime() - start);
        }
        System.out.printf("%-14s create %5.1f ms, first call %4.1f ms, then %5.2f ns/call (check %d)%n",
                args[0], (t1 - t0) / 1e6, (t2 - t1) / 1e6, (double) best / N, check);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "for m in direct lambda proxy-direct proxy-reflect; do java ProxyBench $m; done",
        },
        {
          type: "output",
          text: `direct         create   0.0 ms, first call  0.0 ms, then  0.60 ns/call (check 418000000000)
lambda         create   6.5 ms, first call  0.0 ms, then  0.73 ns/call (check 418000000000)
proxy-direct   create  20.0 ms, first call  0.1 ms, then  0.68 ns/call (check 418000000000)
proxy-reflect  create  22.4 ms, first call  9.3 ms, then  2.47 ns/call (check 418000000000)`,
        },
        {
          type: "paragraph",
          text: "Then the same four objects in **one** JVM, through one shared `loop`:",
        },
        {
          type: "code",
          language: "java",
          title: "ProxyBenchMixed.java",
          code: `public class ProxyBenchMixed {
    // Same four FareService objects, but all in one JVM through one loop()
    public static void main(String[] args) {
        ProxyBench.RealFareService real = new ProxyBench.RealFareService();
        ProxyBench.FareService[] cases = {
            real,
            km -> real.quote(km),
            ProxyBench.proxy((p, m, a) -> real.quote((Integer) a[0])),
            ProxyBench.proxy((p, m, a) -> m.invoke(real, a)),
        };
        String[] names = {"direct", "lambda", "proxy-direct", "proxy-reflect"};
        for (int k = 0; k < cases.length; k++) {
            long best = Long.MAX_VALUE;
            for (int round = 0; round < 7; round++) {
                long start = System.nanoTime();
                ProxyBench.loop(cases[k]);
                best = Math.min(best, System.nanoTime() - start);
            }
            System.out.printf("%-14s %5.2f ns/call%n", names[k], (double) best / ProxyBench.N);
        }
    }
}`,
        },
        {
          type: "output",
          text: `direct          0.45 ns/call
lambda          0.54 ns/call
proxy-direct    4.68 ns/call
proxy-reflect  16.93 ns/call`,
        },
        {
          type: "list",
          items: [
            "**In its own JVM, a JDK proxy costs almost nothing in steady state**: 0.68 ns with a handler that calls the target directly, against 0.60 for a direct call. The `loop` call site saw only `$Proxy0`, the JIT inlined `$Proxy0.quote`, the handler lambda and the target, and escape analysis removed the `Object[]` and the boxing.",
            "**With `Method.invoke` in the handler: 2.47 ns.** Much better than the previous lesson's 9.5 ns for a non-constant `Method`, because here the `Method` comes from the proxy's `static final` field `m3`, a constant the JIT can follow into the method handle.",
            "**Shared call site: 4.68 and 16.93 ns.** In one JVM, `loop`'s `s.quote(...)` had seen four receiver classes. HotSpot inlines at most two receiver types at a call site (bimorphic); with more, it falls back to a virtual call, nothing is inlined, and the proxy's argument array and boxing are real again. Direct and lambda were measured before the call site saw the other classes, so they stayed fast. Real services, where one interface call site sees the proxy and several other implementations, look more like the second table, and both tables are honest numbers for different situations.",
            "**Startup is the real cost.** The first proxy took 20 ms to create (generating the class, including the handler lambda's own bootstrap) and its first reflective call 9.3 ms, against 6.5 ms for the first lambda. The class-load log counted 57 classes loaded outside the CDS archive for the proxy program against 13 for the direct one. Multiply by hundreds of beans and that's part of why Spring applications take seconds to start.",
            "Best of 7 rounds of 10 million calls, `System.nanoTime`, one laptop (Intel Core i5-8265U), not JMH; the creation times varied between runs from 18 to 58 ms.",
          ],
        },
      ],
    },
    {
      title: "Proxies in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend's `TripService.completeTrip` marked a trip done and then called `chargeFare`, annotated `@Transactional`, to debit the rider's wallet and insert a ledger row. When NEW-TOWN was added as a zone, its ledger configuration was missing, so the ledger insert failed. The expectation was a rollback: no debit without a ledger row. Instead riders' wallets were debited with no ledger entry, and support tickets from riders like Asha (\"charged 225 rupees, no receipt\") arrived before any alert. I rebuilt it with a JDK proxy that does what Spring's transaction interceptor does:",
        },
        {
          type: "code",
          language: "java",
          title: "SelfInvocation.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SelfInvocation {
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) @interface Transactional { }

    // A toy database: writes outside a transaction commit immediately
    static final class Db {
        final Map<String, Long> wallets = new HashMap<>(Map.of("Asha", 50_000L));
        final List<String> ledger = new ArrayList<>();
        private Map<String, Long> snapshot;
        void begin() { snapshot = new HashMap<>(wallets); System.out.println("    BEGIN"); }
        void commit() { snapshot = null; System.out.println("    COMMIT"); }
        void rollback() { wallets.clear(); wallets.putAll(snapshot); snapshot = null; System.out.println("    ROLLBACK"); }
        void insertLedger(String row) {
            if (row.contains("NEW-TOWN")) throw new IllegalStateException("ledger insert failed: zone not configured");
            ledger.add(row);
        }
    }

    // What a framework does for @Transactional, with a JDK proxy
    @SuppressWarnings("unchecked")
    static <T> T transactional(Class<T> iface, T target, Db db) {
        InvocationHandler h = (proxy, m, args) -> {
            Method impl = target.getClass().getMethod(m.getName(), m.getParameterTypes());
            boolean tx = impl.isAnnotationPresent(Transactional.class);
            System.out.println("  proxy: " + m.getName() + (tx ? " (@Transactional)" : ""));
            if (tx) db.begin();
            try {
                Object result = m.invoke(target, args);
                if (tx) db.commit();
                return result;
            } catch (InvocationTargetException e) {
                if (tx) db.rollback();
                throw e.getCause();
            }
        };
        return (T) Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[] { iface }, h);
    }

    public interface TripOperations {
        void completeTrip(String rider, String zone, long farePaise);
        void chargeFare(String rider, String zone, long farePaise);
    }

    // What shipped: completeTrip calls chargeFare on this
    static class TripService implements TripOperations {
        private final Db db;
        TripService(Db db) { this.db = db; }
        public void completeTrip(String rider, String zone, long farePaise) {
            System.out.println("  completeTrip: marking trip done, charging");
            chargeFare(rider, zone, farePaise);                       // this.chargeFare: no proxy involved
        }
        @Transactional
        public void chargeFare(String rider, String zone, long farePaise) {
            db.wallets.merge(rider, -farePaise, Long::sum);
            db.insertLedger(rider + " " + zone + " " + farePaise);
        }
    }

    // The fix: charging lives in its own bean, called through its proxy
    public interface Payments { void chargeFare(String rider, String zone, long farePaise); }
    static class PaymentService implements Payments {
        private final Db db;
        PaymentService(Db db) { this.db = db; }
        @Transactional
        public void chargeFare(String rider, String zone, long farePaise) {
            db.wallets.merge(rider, -farePaise, Long::sum);
            db.insertLedger(rider + " " + zone + " " + farePaise);
        }
    }
    public interface Trips { void completeTrip(String rider, String zone, long farePaise); }
    static class FixedTripService implements Trips {
        private final Payments payments;                              // the proxy, injected
        FixedTripService(Payments payments) { this.payments = payments; }
        public void completeTrip(String rider, String zone, long farePaise) {
            System.out.println("  completeTrip: marking trip done, charging");
            payments.chargeFare(rider, zone, farePaise);
        }
    }

    static void attempt(Runnable r, Db db) {
        try {
            r.run();
        } catch (IllegalStateException e) {
            System.out.println("  error: " + e.getMessage());
        }
        System.out.println("  Asha's wallet " + db.wallets.get("Asha") + " paise, ledger " + db.ledger);
    }

    public static void main(String[] args) {
        System.out.println("BEFORE (self-invocation):");
        Db db1 = new Db();
        TripOperations trips = transactional(TripOperations.class, new TripService(db1), db1);
        attempt(() -> trips.completeTrip("Asha", "NEW-TOWN", 22_500), db1);

        System.out.println("AFTER (separate bean behind its own proxy):");
        Db db2 = new Db();
        Payments payments = transactional(Payments.class, new PaymentService(db2), db2);
        Trips fixed = transactional(Trips.class, new FixedTripService(payments), db2);
        attempt(() -> fixed.completeTrip("Asha", "NEW-TOWN", 22_500), db2);
        attempt(() -> fixed.completeTrip("Asha", "SALT-LAKE", 18_000), db2);
    }
}`,
        },
        {
          type: "output",
          text: `BEFORE (self-invocation):
  proxy: completeTrip
  completeTrip: marking trip done, charging
  error: ledger insert failed: zone not configured
  Asha's wallet 27500 paise, ledger []
AFTER (separate bean behind its own proxy):
  proxy: completeTrip
  completeTrip: marking trip done, charging
  proxy: chargeFare (@Transactional)
    BEGIN
    ROLLBACK
  error: ledger insert failed: zone not configured
  Asha's wallet 50000 paise, ledger []
  proxy: completeTrip
  completeTrip: marking trip done, charging
  proxy: chargeFare (@Transactional)
    BEGIN
    COMMIT
  Asha's wallet 32000 paise, ledger [Asha SALT-LAKE 18000]`,
        },
        {
          type: "image",
          src: "/images/java/reflection-proxies-and-method-handles-self-invocation.svg",
          alt: "Top: a controller calls trips.completeTrip() on jdk.proxy1.$Proxy0, which implements TripOperations and for every method boxes the arguments and calls h.invoke(this, m4, args). The InvocationHandler begins a transaction only if the method is @Transactional, calls m.invoke(target), then commits or rolls back. The target TripService's completeTrip calls this.chargeFare() directly inside the target, so the @Transactional chargeFare is reached without passing the proxy; this is the target, not the proxy. The log showed proxy: completeTrip with no BEGIN, error: ledger insert failed, and wallet 27500 paise with an empty ledger: the debit was kept and nothing rolled back. Bottom: the fix moves chargeFare into PaymentService; TripService calls payments.chargeFare() on the Payments proxy, which logs BEGIN and ROLLBACK, and the wallet goes back to 50000. A side note: a JDK Proxy implements interfaces only, while CGLIB or ByteBuddy subclass a class and cannot intercept final or private methods. In Spring AOP, with either kind, the proxy forwards to a separate target object, so this.x() is never intercepted; raw CGLIB with invokeSuper runs the original code on the proxy itself, where the inner call was intercepted.",
          caption: "The transaction boundary lives in the proxy, and a call on this never passes through it.",
        },
        {
          type: "list",
          items: [
            "**What happened.** The controller called `completeTrip` through the proxy. It isn't annotated, so the handler started no transaction. Inside the target, `chargeFare(...)` is `this.chargeFare(...)`: a plain call on the `TripService` object, which never passes the proxy, so `@Transactional` was never read. The debit auto-committed, the ledger insert threw, and Asha's wallet stayed at 27,500 paise with no ledger row.",
            "**Why it looked correct.** The annotation was on the right method, the code compiled, and the tests ran without a database transaction to observe. Spring with CGLIB proxies behaves exactly the same: its proxy forwards to a separate target bean, so `this` inside the bean is never the proxy.",
            "**Fix 1, used here: split the bean.** `PaymentService.chargeFare` is called through `payments`, the injected proxy. The handler saw `@Transactional`, began, and rolled back on the failure: the wallet returned to 50,000. A good SALT-LAKE trip committed normally: 32,000 left and one ledger row. The split also gave payments a clear owner, which it should have had anyway.",
            "**Other fixes and their costs.** Annotating the outer `completeTrip` makes the whole method one transaction (often the right boundary). Injecting the bean's own proxy into itself (`@Lazy` self-injection, or `AopContext.currentProxy()` with `exposeProxy = true`) works but hides the problem. AspectJ weaving intercepts internal calls but changes the build. `TransactionTemplate` makes the boundary explicit code.",
            "**How to catch it.** Spring logs transaction begin and commit at `DEBUG` for `org.springframework.transaction`; one look at that log during development shows a missing transaction. An integration test asserting that the wallet is unchanged after a failed ledger insert would have failed on the first run. IntelliJ IDEA Ultimate's Spring inspections also flag `@Transactional` self-invocation.",
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
              question: "What is a dynamic proxy in Java?",
              answer:
                "An object of a class generated at run time by `java.lang.reflect.Proxy.newProxyInstance(loader, interfaces, handler)`. The class implements the given interfaces and routes every call, plus `equals`, `hashCode` and `toString`, to the `InvocationHandler.invoke(proxy, method, args)`. The handler adds behaviour (logging, timing, transactions, retries) and usually forwards to a real object with `method.invoke(target, args)`. Mine was `jdk.proxy1.$Proxy0`, `public final`, extending `java.lang.reflect.Proxy`.",
            },
            {
              question: "Why can a JDK dynamic proxy only implement interfaces?",
              answer:
                "The generated class already extends `java.lang.reflect.Proxy` (which holds the handler in the field `h`), and Java has single inheritance, so it can't extend the target class too. Passing a class throws `IllegalArgumentException: ... is not an interface`. To proxy classes, libraries generate subclasses instead: CGLIB, ByteBuddy.",
            },
            {
              question: "What is the difference between a JDK proxy and a CGLIB proxy?",
              answer:
                "A JDK proxy implements interfaces and is built into the JDK; the proxy is only assignable to those interfaces. A CGLIB (or ByteBuddy) proxy is a generated subclass of the target class, so it works without an interface and is assignable to the class, but it can't intercept `final`, `private` or `static` methods or proxy a `final` class (my `minimum()` ran unintercepted). Spring uses JDK proxies when configured for interfaces, and CGLIB otherwise; Spring Boot defaults to CGLIB (`proxy-target-class=true`).",
            },
            {
              question: "How does Spring use reflection?",
              answer:
                "To read bean metadata (classes, constructors, `@Autowired` fields and methods, annotations), create beans with `Constructor.newInstance`, inject fields with `Field.set` after `setAccessible`, call lifecycle methods like `@PostConstruct`, and wrap beans in JDK or CGLIB proxies for AOP features such as `@Transactional` and `@Cacheable`. It caches the metadata so that reflection happens mainly at startup. My `TinyDi` does a 55-line version of the injection part.",
            },
            {
              question: "What is a MethodHandle?",
              answer:
                "A typed, directly executable reference to a method, constructor or field, from `java.lang.invoke` (Java 7). You get one from a `MethodHandles.Lookup` (`findVirtual`, `findStatic`, `findConstructor`, `findGetter`), described by a `MethodType`, and call it with `invokeExact` or `invoke`. Access is checked once at lookup, and a constant handle is inlined by the JIT: my `static final` handle ran at 0.54 ns, the same as a direct call.",
            },
            {
              question: "What is ServiceLoader?",
              answer:
                "The JDK's plugin discovery mechanism (Java 6). Implementations of an interface are listed in `META-INF/services/<interface binary name>` or declared with `provides ... with ...` in `module-info.java`, and `ServiceLoader.load(Interface.class)` finds and instantiates them reflectively. Since Java 9 `stream()` exposes `Provider`s, so the type is known before instantiation. JDBC drivers are found this way.",
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
              question: "Why doesn't @Transactional work when a method calls another method in the same class?",
              answer:
                "Because the transaction is started by a proxy around the bean, and an internal call `this.chargeFare()` goes straight to the target object, never through the proxy. Spring's proxies, JDK or CGLIB, forward to a separate target bean, so `this` inside is never the proxy. My rebuild showed no BEGIN, a debit committed and the ledger insert failed with nothing rolled back. Fixes: move the method to another bean and call it through its proxy (which rolled back correctly in my rebuild), put the transaction on the outer public method, use `TransactionTemplate`, or AspectJ weaving.",
            },
            {
              question: "What are invokeExact and invoke, and how do they differ?",
              answer:
                "Both call a `MethodHandle`. `invokeExact` requires the call site's static type (argument types and the cast on the result) to match the handle's `MethodType` exactly; `(int) gst.invokeExact(20_000L)` on a `(long)long` handle threw `WrongMethodTypeException: handle's method type (long)long but found (long)int`, and so did assigning the result to `Object`. `invoke` adapts with `asType`, doing boxing, unboxing and widening, so `gst.invoke(Integer.valueOf(20_000))` returned a `Long`. They're signature polymorphic: `javac` records the call site's type rather than checking a declared signature.",
            },
            {
              question: "How do equals, hashCode and toString behave on a JDK proxy?",
              answer:
                "They're routed to the handler like interface methods (`m0` to `m2` in the generated class). A handler that forwards everything to the target makes `proxy.equals(proxy)` false, because the target compares itself with the proxy; mine printed `false`. `HashMap.contains` still found the same proxy because it checks `==` before `equals`, but `List.contains` wouldn't. The handler should handle these three methods explicitly. `getClass()` and the other `final` `Object` methods never reach the handler.",
            },
            {
              question: "How are lambdas implemented? Are they anonymous classes?",
              answer:
                "No. `javac` moves the body into a private static (or instance) method like `lambda$surge$0` and emits an `invokedynamic` instruction whose bootstrap method is `LambdaMetafactory.metafactory`. On first execution it spins a hidden class implementing the functional interface, with captured values as `private final` fields (`arg$1`), and links the call site to a factory for it. There's one class per call site, created at run time, named like `LambdaIndy$$Lambda/0x...`, with `isHidden()` true. Anonymous classes, by contrast, are real `Outer$1.class` files.",
            },
            {
              question: "How does a DI container decide what to inject?",
              answer:
                "It reads metadata reflectively: which classes are components (annotations or configuration), which constructor to use (the annotated one, or the only one), which fields or setters are marked for injection, and the declared types of each parameter or field. For each needed type it finds the one candidate assignable to it, creating it recursively, caching singletons. Zero or several candidates is an error unless qualifiers or a primary choose one. My `TinyDi` does constructor and field injection, `@Init`, singletons and cycle detection.",
            },
            {
              question: "How does a handler call an interface's default method on a proxy?",
              answer:
                "With `InvocationHandler.invokeDefault(proxy, method, args)` (Java 16), which runs the default body with `this` being the proxy, so calls it makes to other interface methods come back through the handler. Calling `method.invoke(proxy, args)` would recurse into the handler forever, and `method.invoke(target, args)` would skip interception of the inner calls. Before Java 16, frameworks used `MethodHandles.privateLookupIn` with `findSpecial`/`unreflectSpecial`.",
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
              question: "What does the JDK generate for a dynamic proxy class?",
              answer:
                "A `public final` class `jdk.proxyN.$ProxyM` extending `Proxy` and implementing the interfaces, written with the JDK's internal ASM and defined in a dynamic module. Its static initializer caches every proxied `Method` in `private static final` fields via `Class.forName` and `getMethod`. Each method boxes its arguments into an `Object[]`, calls `h.invoke(this, mN, args)`, then `checkcast`s and unboxes the result. Its exception table rethrows `Error`, `RuntimeException` and declared checked exceptions, and wraps anything else in `UndeclaredThrowableException`. I read all of this with `-Djdk.proxy.ProxyGenerator.saveGeneratedFiles=true` and `javap`.",
            },
            {
              question: "How fast is a proxied call compared to a direct call?",
              answer:
                "It depends on the call site. In my measurements on JDK 21, in a JVM where the call site saw only the proxy class: direct 0.60 ns, proxy with a handler calling the target directly 0.68 ns, proxy with `Method.invoke` in the handler 2.47 ns, because the JIT inlined everything. With four implementations through one call site: 4.68 and 16.93 ns, because a megamorphic call site isn't inlined and the boxing and arrays become real. The larger cost is startup: about 20 ms to create the first proxy and 9 ms for its first reflective call.",
            },
            {
              question: "Why can a MethodHandle be faster than Method.invoke?",
              answer:
                "A handle is access-checked once at lookup, has a precise type so arguments aren't boxed into an array when called with `invokeExact`, and is built from `LambdaForm`s the JIT can inline. When it's a constant (`static final`), the JIT inlines through it entirely: 0.54 ns in my test. `Method.invoke` checks access per call, takes `Object...`, and since JDK 18 is itself a method handle underneath: constant `Method` 0.58 ns, non-constant 9.48 ns, against 4.92 ns for a non-constant handle.",
            },
            {
              question: "What is privateLookupIn, and how does it relate to modules?",
              answer:
                "`MethodHandles.privateLookupIn(target, callerLookup)` returns a `Lookup` with private access to `target`, the method-handle equivalent of `setAccessible(true)`. It's allowed only if the caller's module reads the target's module and the target's package is open to the caller's module. My `Handles` program couldn't find `Wallet.secret()` with its own lookup (`IllegalAccessException: no such method`), and could with `privateLookupIn`. Frameworks use it to define classes and access members in application packages that are `opens`.",
            },
            {
              question: "What do GraalVM native images require for reflection and proxies?",
              answer:
                "Native images are compiled ahead of time under a closed-world assumption, so classes, methods and fields used reflectively, and dynamic proxy interface lists, must be declared at build time (`reflect-config.json` and proxy configuration, or `reachability-metadata.json` in newer releases), or found by the build's static analysis when names are constants. Undeclared reflection fails at run time. Spring Boot 3 generates these hints during AOT processing, and the tracing agent can record them. I described this conceptually; I didn't build a native image for this lesson.",
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
              question: "Riders are charged but no ledger row exists when the ledger insert fails. chargeFare is @Transactional and is called from completeTrip in the same class. Explain and fix.",
              answer:
                "Self-invocation: `completeTrip` came through the proxy but isn't transactional, and its call to `chargeFare` is on `this`, the raw target, so no transaction was started. The debit committed on its own and the ledger insert failed after it; my rebuild ended with 27,500 paise and an empty ledger. I'd move `chargeFare` to a `PaymentService` called through its proxy (my rebuild then rolled back to 50,000), or make `completeTrip` the transactional boundary. Then add an integration test for the failure path and check `org.springframework.transaction` DEBUG logs for missing BEGINs elsewhere.",
            },
            {
              question: "A @Retry annotation on a service method never retries, though the method fails with retryable exceptions. What do you check?",
              answer:
                "Whether calls go through the proxy at all: an internal `this.method()` call bypasses it. Whether the method is `public` and not `final` (a subclass proxy can't override `final` or `private` methods). Whether the class is a bean created by the framework, not `new`ed manually. Whether the exception type matches the retry policy (my `RetryProxy` retried only `GatewayTimeout`). And whether the handler unwraps `InvocationTargetException` before checking the type; otherwise every exception looks like an `InvocationTargetException` and nothing matches.",
            },
            {
              question: "After adding a logging proxy, a cache keyed by the service object stops finding entries, and a list.remove(service) does nothing. Why?",
              answer:
                "The proxy forwards `equals` and `hashCode` to the target, so `proxy.equals(proxy)` is false (the target compares itself with the proxy) and hash codes come from the target. `HashMap` can still find the identical proxy because it checks `==` first, but a different proxy instance for the same target, or `List.remove`, which uses only `equals`, fails. Fix the handler to implement `equals`/`hashCode`/`toString` for the proxy itself, as my careful handler did, or key caches by something stable like an ID.",
            },
            {
              question: "A service that creates thousands of short-lived proxies per minute shows high CPU in reflection and growing class counts. What would you look at?",
              answer:
                "Creating a proxy instance reuses the cached class, but each `newProxyInstance` call still does lookups and a reflective constructor call, and if a new class loader or a different interface combination is used each time, a new proxy class is generated per combination and kept as long as the loader lives. I'd check `-Xlog:class+load` for repeated `$Proxy` definitions, create proxies once and reuse them (the handler can be stateless with state passed per call), and replace per-request proxies with a plain decorator if the target is fixed.",
            },
            {
              question: "A team wants to replace Method.invoke in their event dispatcher with MethodHandles for speed. Is it worth it?",
              answer:
                "Measure first. On JDK 21, a `Method` held in a `static final` field already runs at direct-call speed (0.58 ns in my test); the slow case is `Method`s stored in maps per event type (9.48 ns). Converting those to `MethodHandle`s halved the cost (4.92 ns) in my measurement, and using `invokeExact` avoids boxing. If dispatch is per event and the handler does real work, neither number matters. If it's a hot path, cache handles at registration and consider generating a `switch` or using `LambdaMetafactory` to make real functional-interface implementations.",
            },
            {
              question: "A Spring app works on the JVM but fails as a GraalVM native image with NoSuchMethodException in a custom mapper. Why?",
              answer:
                "The mapper looks up methods by names computed at run time, which the native-image build's closed-world analysis can't see, so those methods weren't included in the image's reflection metadata. Fix by registering hints (Spring's `RuntimeHintsRegistrar` or `@RegisterReflectionForBinding`), adding `reflect-config.json` entries, or better, replacing the run-time reflection with explicit mapping or a compile-time mapper, which needs no metadata at all.",
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
            "Create a proxy for `Runnable` whose handler prints `method.getName()` and returns `null`. Call `run()`, print `toString()` and `getClass().getName()`, then call `hashCode()`.",
            "Pass a concrete class instead of an interface to `Proxy.newProxyInstance` and read the exception.",
            "Run `TimingProxy` with `-Djdk.proxy.ProxyGenerator.saveGeneratedFiles=true` and disassemble `jdk/proxy1/$Proxy0.class` with `javap -p -c`. Find where `quote`'s `int` is boxed.",
            "Look up `Wallet.gst` with `findStatic` and call it as `int x = (int) gst.invokeExact(20_000L);`, then as `long x = (long) gst.invokeExact(20_000L);`.",
            "Compile a class with one capturing lambda and run `javap -c -p` and `javap -v` on it; find the `invokedynamic` and the `LambdaMetafactory.metafactory` bootstrap method.",
            "In `TinyDi`, add a second `@Component` implementing `FareRepository`, called `DbFares`, register it, and call `get(QuoteService.class)`.",
            "In `InnerCall`, change `SimplePricing.quote` so the inner call is intercepted. (Hint: the target needs a reference to the proxy.)",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `handler: run`, `handler: toString`, `null`, `jdk.proxy1.$Proxy0` (no handler line for `getClass`), then `handler: hashCode` followed by `NullPointerException: Cannot invoke \"java.lang.Integer.intValue()\" because the return value of \"java.lang.reflect.InvocationHandler.invoke(Object, java.lang.reflect.Method, Object[])\" is null`. Step 2 throws `IllegalArgumentException: <your class> is not an interface`. Step 3 shows `iload_2` followed by `invokestatic Integer.valueOf` before `InvocationHandler.invoke`. Step 4 throws `WrongMethodTypeException: handle's method type (long)long but found (long)int`, then returns 1000. Step 5 shows `invokedynamic ... InvokeDynamic #0:applyAsLong` (or your interface's method) and a `BootstrapMethods` entry for `LambdaMetafactory.metafactory`. Step 6 fails with `IllegalStateException: 2 components for FareRepository: [InMemoryFares, DbFares]`. Step 7: one answer is a `Pricing self` field in `SimplePricing`, set to the proxy after it's created, with `quote` calling `self.baseFare(km)`; then `proxy.quote(8)` prints `intercepted quote` and `intercepted baseFare` and still returns 16320. It's the self-injection workaround from the production section, and how awkward it is explains why splitting the bean is usually better.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `PROXY      Proxy.newProxyInstance(loader, interfaces[], handler)
           -> jdk.proxy1.$Proxy0 extends Proxy implements I  (public final)
           every call + equals/hashCode/toString -> h.invoke(proxy, m, args)
           static final Method m0..mN; args boxed; result checkcast + unboxed
           unwrap InvocationTargetException; invokeDefault for defaults

LIMITS     interfaces only -> CGLIB/ByteBuddy subclass for classes
           no final/private/static; this.x() never intercepted
           Spring AOP (JDK or CGLIB) forwards to a separate target

INVOKE     Lookup.findVirtual/findStatic/findConstructor/findGetter
           MethodType (Wallet,long)long; invokeExact = exact types
           wrong type -> WrongMethodTypeException; invoke adapts
           privateLookupIn = setAccessible for handles; VarHandle CAS

LAMBDA     body -> private static lambda$x$0; invokedynamic
           bootstrap LambdaMetafactory -> hidden class per call site

FRAMEWORKS DI: constructors + @Inject fields; Jackson: getters/records
           JUnit: @Test via getDeclaredMethods; ServiceLoader: META-INF
           native image: declare reflection at build time

COST       own JVM: direct 0.60, proxy 0.68, proxy+Method.invoke 2.47 ns
           shared call site: 4.68 / 16.93 ns; first proxy ~20 ms`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A dynamic proxy is a class generated at run time that turns every interface call into `handler.invoke(proxy, method, args)`. That one trick, plus subclass proxies for classes, is how Spring adds transactions, caching and retries to beans; and because it sits between callers and the object, a call on `this` never sees it.",
            "Method handles are the typed, inlinable side of `java.lang.invoke`: checked once, called with exact types, and the engine under `Method.invoke`, lambdas and string concatenation. Constant handles and well-behaved proxies cost almost nothing in steady state; the bills are startup time and megamorphic call sites.",
            "With this lesson the Reflection phase is complete. Next comes Annotations: the metadata that every framework in this lesson reads, how retention and targets decide where it's visible, writing custom annotations, and processing them both at run time and at compile time.",
          ],
        },
      ],
    },
  ],
};
