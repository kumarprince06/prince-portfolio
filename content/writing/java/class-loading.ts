import type { Lesson } from "../types";

export const classLoading: Lesson = {
  slug: "class-loading",
  date: "2026-09-02",
  title: "Class Loading",
  description:
    "How the JVM turns a class name into a usable class: loading, linking and initialization, the bootstrap, platform and application loaders, parent delegation, and the errors you get when any of it goes wrong.",
  tags: ["Core Java", "JVM", "Class Loader", "Reflection"],
  sections: [
    {
      title: "What Class Loading Is",
      blocks: [
        {
          type: "paragraph",
          text: "I met class loading earlier as one box in the JVM diagram, the thing that reads `.class` files before the execution engine runs them. That box turned out to hide a lot, so this lesson is all about it.",
        },
        {
          type: "paragraph",
          text: "**Class loading** is how the JVM goes from a class name, like `com.example.Report`, to a fully usable class in memory. A class loader finds the bytes (a `.class` file, an entry in a JAR, a module in the JDK image, or bytes generated at runtime), the JVM parses them into its own internal structure, checks them, and prepares them to run. Strictly, the JVM specification splits this into three phases: **loading**, **linking** and **initialization**. People say \"class loading\" for the whole thing, and I'll try to be precise about which phase I mean.",
        },
        {
          type: "paragraph",
          text: "The part that surprised me is that it isn't a startup step. Classes are loaded on demand, while the program runs. A class that no code path touches in a given run is never loaded at all.",
        },
        {
          type: "paragraph",
          text: "Why I care about it as a backend developer: a lot of framework behaviour has a class-loading answer underneath it. Spring's component scanning, JDBC driver discovery, Tomcat running several apps in one JVM, DevTools restarting an app in a second, and errors like `NoClassDefFoundError` or a `ClassCastException` between two classes with the same name. All of those make sense once this lesson clicks.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Loading classes dynamically at runtime, instead of linking everything into one binary at build time like C and C++, was part of Java's design from 1.0. It fit the original applet use case: a browser had to fetch classes from a remote server on demand as the user moved between pages, without the whole application being installed first. The `ClassLoader` class, which lets ordinary Java code decide where class bytes come from, was there from the start.",
        },
        {
          type: "paragraph",
          text: "That same capability is what later made application servers with hot redeploy, plugin systems and classpath-scanning frameworks like Spring possible.",
        },
        {
          type: "paragraph",
          text: "Java 9 changed the built-in loaders. The module system (JPMS, Project Jigsaw) removed the old extension mechanism (`jre/lib/ext` and `java.ext.dirs`), and the **extension class loader** was replaced by the **platform class loader**. Class loading also became module-aware: a class being found is no longer enough, the module asking for it also has to read the module that contains it, and that module has to export the package.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "The way I picture it is a library with a strict request system.",
        },
        {
          type: "list",
          items: [
            "My running program doesn't have every book (class) on its desk from the start. That would be slow and wasteful. When it actually needs a book, it asks a librarian (a class loader).",
            "The librarian first checks whether they already handed out this book. If they did, I get the same copy again. A class loader never defines the same class twice.",
            "If not, the local librarian doesn't go to the shelf straight away. They ask the regional library (the platform loader), which first asks the national library (the bootstrap loader). Only if nobody above has the book does the local librarian look on their own shelf. That is **parent delegation**.",
            "Some sections of the building have their own librarians with their own rules. A web app in Tomcat gets one who checks the app's own shelf first. That's a custom class loader, and two librarians can each hand out a book with the same title that is, to the JVM, a different book.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks: handing over the book is only loading. Nobody reads it until first real use, and that reading (running the static initializers) happens exactly once.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Loading, linking, initialization",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Loading:** a class loader finds the binary representation for a name and the JVM creates the class from it (`defineClass`). The JVM parses the class file, records the class's metadata in Metaspace, and creates the `java.lang.Class` object for it on the heap. The superclass and interfaces get loaded here too, because a class can't exist without them.",
            "**Linking**, in three parts. **Verification** checks the bytecode is well-formed and type-safe (the JVM does this, not `javac`). **Preparation** allocates the static fields and sets them to default values: `0`, `false`, `null`. No user code runs yet. **Resolution** turns symbolic references in the constant pool (\"class `Report`\", \"method `print()V`\") into direct references. HotSpot resolves lazily, the first time each instruction that uses the reference actually runs.",
            "**Initialization:** the JVM runs the class's `<clinit>` method, which is every static field initializer and `static {}` block, in source order. This happens at most once per class per loader, and the JVM makes it thread-safe.",
          ],
        },
        {
          type: "heading",
          text: "What triggers initialization",
        },
        {
          type: "paragraph",
          text: "The JVM has some freedom about when it loads a class. It has none about initialization. A class is initialized right before its first **active use**:",
        },
        {
          type: "list",
          items: [
            "Creating an instance: `new Report()`.",
            "Calling a static method: `Report.print()`.",
            "Reading or writing a static field, unless it is a compile-time constant (`static final int BASE = 50;` gets inlined by `javac`, so the class isn't even touched).",
            "Initializing a subclass. The superclass is initialized first.",
            "Reflection that asks for it, like `Class.forName(\"Report\")` or `Constructor.newInstance()`.",
            "Being the main class the launcher starts.",
          ],
        },
        {
          type: "paragraph",
          text: "Things that load a class but do **not** initialize it: a class literal (`Report.class`), creating an array (`new Report[3]`), `ClassLoader.loadClass(name)` and `Class.forName(name, false, loader)`. I show real output for these below, because this distinction is the one most notes get wrong.",
        },
        {
          type: "heading",
          text: "The built-in class loaders",
        },
        {
          type: "list",
          items: [
            "**Bootstrap class loader:** built into the JVM in native code, with no Java object behind it, which is why `getClassLoader()` returns `null` for its classes. It defines `java.base` (`String`, `Object`, `System`) and several other core modules, including `java.xml`, `java.logging` and `java.desktop`.",
            "**Platform class loader:** a Java object (`ClassLoader.getPlatformClassLoader()`) that defines the remaining standard modules, for example `java.sql`, `java.net.http` and `java.compiler`. It replaced the extension loader in Java 9.",
            "**Application class loader** (also called the system loader, named `app`): loads classes from the class path and the module path. My own code and every JAR I put on the class path come from here.",
            "**Custom class loaders:** any subclass of `ClassLoader`. They can load bytes from anywhere (another directory, a database, the network, bytes generated at runtime) and are the basis of isolation in Tomcat, plugin systems and restart tools.",
          ],
        },
        {
          type: "paragraph",
          text: "I didn't want to trust anybody's list of which module goes where, so I asked the JVM directly:",
        },
        {
          type: "code",
          language: "java",
          title: "WhoLoaded.java",
          code: `public class WhoLoaded {
    public static void main(String[] args) {
        Class<?>[] classes = {
            String.class,                                    // java.base
            javax.xml.parsers.DocumentBuilderFactory.class,  // java.xml
            java.sql.Connection.class,                       // java.sql
            java.net.http.HttpClient.class,                  // java.net.http
            javax.tools.ToolProvider.class,                  // java.compiler
            WhoLoaded.class                                  // my class
        };
        for (Class<?> c : classes) {
            System.out.printf("%-42s %-14s %s%n",
                c.getName(), c.getModule().isNamed() ? c.getModule().getName() : "(unnamed)",
                c.getClassLoader());
        }

        System.out.println();
        ClassLoader loader = WhoLoaded.class.getClassLoader();
        while (loader != null) {
            System.out.println(loader.getName() + " -> parent: " + loader.getParent());
            loader = loader.getParent();
        }
    }
}`,
        },
        {
          type: "output",
          text: `java.lang.String                           java.base      null
javax.xml.parsers.DocumentBuilderFactory   java.xml       null
java.sql.Connection                        java.sql       jdk.internal.loader.ClassLoaders$PlatformClassLoader@61bbe9ba
java.net.http.HttpClient                   java.net.http  jdk.internal.loader.ClassLoaders$PlatformClassLoader@61bbe9ba
javax.tools.ToolProvider                   java.compiler  jdk.internal.loader.ClassLoaders$PlatformClassLoader@61bbe9ba
WhoLoaded                                  (unnamed)      jdk.internal.loader.ClassLoaders$AppClassLoader@639fee48

app -> parent: jdk.internal.loader.ClassLoaders$PlatformClassLoader@61bbe9ba
platform -> parent: null`,
        },
        {
          type: "callout",
          tone: "warning",
          title: "java.xml is not a platform-loader module",
          text: "My old notes listed `java.xml` as an example of the platform loader. On JDK 21 it prints `null`: it's defined to the bootstrap loader. `java.sql`, `java.net.http` and `java.compiler` are real platform-loader examples. The platform loader's parent also prints as `null`, which is how the API represents \"the bootstrap loader\".",
        },
        {
          type: "diagram",
          text: `┌──────────────────────────────┐
│  Bootstrap loader  (native)  │  java.base, java.xml,
│  shows up as null            │  java.logging, ...
└──────────────▲───────────────┘
               │ parent
┌──────────────┴───────────────┐
│  Platform loader             │  java.sql, java.net.http,
│  (extension loader before 9) │  java.compiler, ...
└──────────────▲───────────────┘
               │ parent
┌──────────────┴───────────────┐
│  Application loader  "app"   │  class path, module path
└──────────────▲───────────────┘
               │ parent
┌──────────────┴───────────────┐
│  Custom loaders              │  webapps, plugins, restart
└──────────────────────────────┘`,
          caption:
            "Each loader has a parent. A request goes up the chain first, and only comes back down if nobody above can find the class.",
        },
        {
          type: "heading",
          text: "Parent delegation",
        },
        {
          type: "paragraph",
          text: "The default `ClassLoader.loadClass` does three things in order: return the class if this loader already loaded it, otherwise ask the parent, and only if the parent can't find it call its own `findClass`. The result is that core classes always come from the top. A class loader I write can point at a directory full of class files, and it still returns the JDK's `java.lang.String`:",
        },
        {
          type: "code",
          language: "java",
          title: "Delegation.java",
          code: `import java.nio.file.Path;

public class Delegation {
    public static void main(String[] args) throws Exception {
        ClassLoader app = Delegation.class.getClassLoader();
        DirLoader child = new DirLoader("child", Path.of("out"), app);

        Class<?> g = child.loadClass("Greeter");
        System.out.println("Greeter loaded by: " + g.getClassLoader().getName());

        Class<?> s = child.loadClass("java.lang.String");
        System.out.println("String loaded by:  " + s.getClassLoader());
    }
}`,
        },
        {
          type: "output",
          text: `Greeter loaded by: app
String loaded by:  null`,
        },
        {
          type: "paragraph",
          text: "`DirLoader` is a small custom loader that reads class files from a directory (its code is in the examples section). `Greeter.class` is sitting in its directory, but the parent (`app`) found it first on the class path, so `DirLoader.findClass` was never called. That is delegation doing its job.",
        },
        {
          type: "paragraph",
          text: "Delegation is also a safety rule. Even if a loader tried to define a `java.*` class itself, the JDK refuses before looking at the bytes:",
        },
        {
          type: "output",
          text: "java.lang.SecurityException: Prohibited package name: java.lang",
        },
        {
          type: "heading",
          text: "Where delegation is broken on purpose",
        },
        {
          type: "paragraph",
          text: "Parent-first is a convention of the default `loadClass`, not a JVM rule. A loader can override `loadClass` and look in its own place first. That's called **child-first** (or parent-last) loading, and Tomcat does it for web apps: each web app's loader looks in `WEB-INF/classes` and `WEB-INF/lib` before asking its parent, so an app can ship its own version of a library that Tomcat also has. It still sends JDK classes and the Servlet API to the parent, so no app can replace `java.lang.String` or the servlet interfaces the container passes to it.",
        },
        {
          type: "paragraph",
          text: "The other common break is the **thread context class loader** (`Thread.currentThread().getContextClassLoader()`). Code loaded high up the chain, like `ServiceLoader` or JDBC's `DriverManager` in `java.sql`, can't see application classes through its own loader, so it uses the context loader to reach down.",
        },
        {
          type: "heading",
          text: "One class per loader",
        },
        {
          type: "paragraph",
          text: "Once a loader defines a class, it keeps it. The next `loadClass` for that name returns the exact same `Class` object from the loader's cache (`findLoadedClass`). If a loader tries to define the same name a second time, the JVM refuses:",
        },
        {
          type: "output",
          text: "java.lang.LinkageError: loader Twice @610455d6 attempted duplicate class definition for Greeter. (Greeter is in unnamed module of loader Twice @610455d6, parent loader 'platform')",
        },
        {
          type: "paragraph",
          text: "Classes can be unloaded, but only as a group: when a custom loader, all its classes and all their instances become unreachable, the garbage collector can unload them and free their Metaspace. Classes of the bootstrap, platform and app loaders effectively stay for the life of the JVM.",
        },
        {
          type: "heading",
          text: "Same name, different loader, different type",
        },
        {
          type: "paragraph",
          text: "At runtime a class is identified by its fully qualified name **and** its defining loader. If two loaders each define `com.example.Greeter` from the exact same bytes, the JVM sees two unrelated types. An instance of one can't be cast to the other, and the result is a `ClassCastException` whose message names the same class twice. I built this and show the output in the examples. It's the same property that lets Tomcat run two apps with different versions of one library side by side.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "Under the hood the work is split between Java code (the class loader objects) and the JVM itself. The loaders only answer one question, \"where are the bytes for this name?\". Turning bytes into a class, linking it and initializing it is the JVM's job. My original notes had pseudo-code where `loadClass` also verified, prepared, resolved and initialized the class, and that mixes the two up.",
        },
        {
          type: "heading",
          text: "The Java side: loadClass",
        },
        {
          type: "paragraph",
          text: "The real `java.lang.ClassLoader.loadClass` in JDK 21 is short. Trimmed of timing statistics, it's this:",
        },
        {
          type: "code",
          language: "java",
          title: "java.lang.ClassLoader (JDK 21, trimmed)",
          code: `protected Class<?> loadClass(String name, boolean resolve)
        throws ClassNotFoundException {
    synchronized (getClassLoadingLock(name)) {
        // 1. Already loaded by this loader?
        Class<?> c = findLoadedClass(name);
        if (c == null) {
            try {
                // 2. Ask the parent (null parent means the bootstrap loader)
                if (parent != null) {
                    c = parent.loadClass(name, false);
                } else {
                    c = findBootstrapClassOrNull(name);
                }
            } catch (ClassNotFoundException e) {
                // parent couldn't find it
            }
            if (c == null) {
                // 3. Only now look for it ourselves
                c = findClass(name);
            }
        }
        if (resolve) {
            resolveClass(c);
        }
        return c;
    }
}`,
        },
        {
          type: "list",
          items: [
            "`findClass` is the method a custom loader normally overrides. It gets the bytes from wherever it wants and calls `defineClass`, which hands them to the JVM to parse and create the class.",
            "Verification, preparation and resolution are done by the JVM during linking, not by this method. Initialization isn't done here at all. That's why `loadClass` never runs a static block.",
            "The lock is per class name for parallel-capable loaders, so two threads loading different classes don't block each other.",
            "The JDK's own platform and application loaders override this with a module-aware version: if the requested package belongs to a named module, they go straight to that module's loader. For class-path code the effect is the same as parent-first.",
          ],
        },
        {
          type: "paragraph",
          text: "For one of my own classes on the class path, a lookup through the app loader plays out like this (the built-in loaders use internal `...OrNull` methods instead of `findClass` and exceptions, but the order is the same):",
        },
        {
          type: "diagram",
          text: `app.loadClass("Report")
 │
 ├─ findLoadedClass("Report")          -> null, first time
 │
 ├─ ask the parent: platform loader
 │   ├─ findLoadedClass                -> null
 │   └─ bootstrap lookup               -> null, not in the JDK
 │
 └─ search app's own class path
     ├─ read Report.class
     └─ defineClass("Report", bytes)   -> JVM creates the class`,
          caption:
            "The next app.loadClass(\"Report\") stops at the first line and returns the same Class object.",
        },
        {
          type: "heading",
          text: "The JVM side: define, link, initialize",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`defineClass`:** the JVM parses the bytes and checks the class file format (magic number `0xCAFEBABE`, a version it supports, a well-formed constant pool). It loads the superclass and interfaces through the same loader, stores the metadata in Metaspace, creates the `Class` mirror on the heap, and records the class under (name, loader). A bad file fails here with `ClassFormatError` or `UnsupportedClassVersionError`.",
            "**Verification:** before the class is first initialized, the verifier checks every method's bytecode using the `StackMapTable` frames `javac` wrote: types on the operand stack match, jumps land on real instructions, no uninitialized object is used. Failure is a `VerifyError`. In the log this shows up as `Start class verification for: Report`.",
            "**Preparation:** static fields are allocated inside the mirror and set to `0`, `false` or `null`.",
            "**Resolution:** symbolic references in the constant pool (class `Helper`, method `Report.print()V`) become direct pointers. HotSpot does it lazily, the first time each instruction runs, which is why an untaken `new Helper()` never loads `Helper`. A reference that can't be satisfied now throws `NoClassDefFoundError`, `NoSuchMethodError` or `NoSuchFieldError`.",
            "**Initialization:** on first active use the JVM takes the class's init lock. If another thread is already initializing it, this thread waits. It sets `static final` compile-time constants from their `ConstantValue` attributes, initializes the superclass, runs `<clinit>`, and marks the class initialized. If `<clinit>` throws, the class is marked erroneous forever: the first caller gets `ExceptionInInitializerError`, everyone after gets `NoClassDefFoundError: Could not initialize class`.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          text: "That init lock is why the holder-class idiom (`private static class Holder { static final Service INSTANCE = new Service(); }`) is a thread-safe lazy singleton with no `synchronized` in sight: the JVM guarantees `<clinit>` runs exactly once, and only when `Holder` is first used.",
        },
      ],
    },
    {
      title: "Watching It Happen",
      blocks: [
        {
          type: "paragraph",
          text: "My first version of the lazy-loading demo put `new Helper()` inside `if (false) { ... }` and showed that Helper's static block never printed. The output was right, but the proof wasn't. `javac` removes an `if (false)` branch entirely, so Helper isn't in the bytecode at all:",
        },
        {
          type: "code",
          language: "java",
          title: "Lazy.java (the misleading version)",
          code: `public class Lazy {
    public static void main(String[] args) {
        System.out.println("Program started");
        if (false) {
            Helper h = new Helper();
        }
        System.out.println("Program ended");
    }
}

class Helper {
    static {
        System.out.println("Helper initialized");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c Lazy",
        },
        {
          type: "output",
          text: `  public static void main(java.lang.String[]);
    Code:
       0: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
       3: ldc           #13                 // String Program started
       5: invokevirtual #15                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
       8: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
      11: ldc           #21                 // String Program ended
      13: invokevirtual #15                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      16: return
}`,
        },
        {
          type: "paragraph",
          text: "No `new Helper` anywhere. That demo only proves the compiler deletes dead code. For a fair test, `Helper` has to be in the bytecode but on a branch that isn't taken at runtime. I also added a second class, `Report`, to separate loading from initialization:",
        },
        {
          type: "code",
          language: "java",
          title: "LazyDemo.java",
          code: `public class LazyDemo {
    public static void main(String[] args) {
        System.out.println("main started");

        if (args.length > 0) {
            new Helper();              // in the bytecode, but not run today
        }

        Class<?> c = Report.class;     // loads Report, does not initialize it
        System.out.println("got " + c.getName());

        Report.print();                // first active use: initialization
        Report.print();                // already initialized, nothing extra
        System.out.println("main ended");
    }
}

class Helper {
    static { System.out.println("Helper initialized"); }
}

class Report {
    static { System.out.println("Report initialized"); }

    static void print() { System.out.println("Report.print()"); }
}`,
        },
        {
          type: "paragraph",
          text: "This time `javap -c LazyDemo` does show the reference, guarded by the `args.length` check:",
        },
        {
          type: "output",
          text: `       8: aload_0
       9: arraylength
      10: ifle          21
      13: new           #21                 // class Helper
      16: dup
      17: invokespecial #23                 // Method Helper."<init>":()V
      20: pop
      21: ldc           #24                 // class Report`,
        },
        {
          type: "paragraph",
          text: "Running it plainly shows only initialization, because a static block is the only thing that prints:",
        },
        {
          type: "output",
          text: `main started
got Report
Report initialized
Report.print()
Report.print()
main ended`,
        },
        {
          type: "paragraph",
          text: "To see **loading** and initialization separately, I turned on the JVM's own logs. `-Xlog:class+load` prints a line when a class is loaded (`-verbose:class` is the older spelling of the same thing), and `-Xlog:class+init` prints verification and initialization:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:class+load,class+init LazyDemo`,
        },
        {
          type: "output",
          text: `[0.058s][info][class,load] LazyDemo source: file:/.../lazy/
[0.058s][info][class,init] Start class verification for: LazyDemo
[0.058s][info][class,init] End class verification for: LazyDemo
[0.059s][info][class,init] 312 Initializing 'LazyDemo'(no method) by thread "main"
main started
[0.060s][info][class,load] Report source: file:/.../lazy/
got Report
[0.073s][info][class,init] Start class verification for: Report
[0.073s][info][class,init] End class verification for: Report
[0.073s][info][class,init] 394 Initializing 'Report' by thread "main"
Report initialized
Report.print()
Report.print()
main ended`,
        },
        {
          type: "paragraph",
          text: "Three things I read from this log (trimmed to my classes; the JDK loaded about 500 of its own around them):",
        },
        {
          type: "list",
          items: [
            "`Helper` never appears. It's referenced in the bytecode, but the `new` instruction never ran, so it was never resolved and never loaded.",
            "`Report` was **loaded** at the `ldc` for `Report.class`, before `got Report` printed, but not initialized.",
            "Verification and initialization of `Report` came later, right when `Report.print()` ran. The second call added nothing. `(no method)` for `LazyDemo` just means it has no static initializer to run.",
          ],
        },
        {
          type: "heading",
          text: "Preparation vs initialization",
        },
        {
          type: "paragraph",
          text: "Preparation gives static fields their default values, and initialization assigns the real ones, top to bottom. You can catch the gap if the initializer uses a field before its line has run:",
        },
        {
          type: "code",
          language: "java",
          title: "Preparation.java",
          code: `public class Preparation {
    public static void main(String[] args) {
        System.out.println("after init: count = " + Counter.count);
    }
}

class Counter {
    static final Counter INSTANCE = new Counter();  // runs first, in text order
    static int count = 10;

    Counter() {
        System.out.println("in constructor: count = " + count);
    }
}`,
        },
        {
          type: "output",
          text: `in constructor: count = 0
after init: count = 10`,
        },
        {
          type: "paragraph",
          text: "The constructor runs during `Counter`'s initialization, before `count = 10` has executed, so it sees the `0` that preparation put there.",
        },
      ],
    },
    {
      title: "The Flow in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `      code needs class X  (resolving new X, X.m(), X.class,
      or a Class.forName / loadClass call)
                          │
                          ▼
            ┌────────────────────────────┐
            │ already loaded by this     │
            │ loader?  (findLoadedClass) │
            └──────┬──────────────┬──────┘
               yes │              │ no
                   │              ▼
                   │   ┌────────────────────────────┐
                   │   │ LOAD: parent first, then   │
                   │   │ findClass(), defineClass() │
                   │   └──────────────┬─────────────┘
                   │                  ▼
                   │   ┌────────────────────────────┐
                   │   │ LINK: verify, prepare,     │
                   │   │ resolve refs when used     │
                   │   └──────────────┬─────────────┘
                   ▼                  ▼
            ┌────────────────────────────┐
            │ same Class object for this │
            │ loader from now on         │
            └─────────────┬──────────────┘
                          │ first ACTIVE use only
                          ▼
            ┌────────────────────────────┐
            │ INITIALIZE: run <clinit>   │
            │ once, superclass first     │
            └────────────────────────────┘`,
          caption:
            "A class never referenced on the path that actually runs never enters this picture and costs nothing.",
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
            "The JVM starts and the bootstrap loader brings in the core classes it needs (hundreds of them, most from the class data sharing archive, which is why the log says `source: shared objects file`).",
            "The launcher asks the application loader for the main class. It's loaded, linked (verified), and initialized, then `main` starts.",
            "As `main` runs, the first time an instruction refers to a class that isn't loaded yet, the current class's loader is asked for it. With the default loaders, the request goes up the parent chain first.",
            "If that loader already has the class, the same `Class` object comes back. Nothing is loaded again.",
            "Otherwise the class is loaded and linked. Its superclass and interfaces are loaded first, because a class can't be defined without them.",
            "On the first active use (`new`, a static call, a non-constant static field, reflection that asks for it), `<clinit>` runs. The superclass is initialized before the subclass.",
            "Execution continues, and steps 3 to 6 repeat for every new class the running code touches, until the program ends.",
          ],
        },
      ],
    },
    {
      title: "Where Loaded Classes Live in Memory",
      blocks: [
        {
          type: "diagram",
          text: `┌────────────────────────────────────────────────────────┐
│ METASPACE  (native memory, outside the heap)           │
│   LazyDemo: methods, bytecode, constant pool           │
│   Report:   methods, bytecode, constant pool           │
│   Helper:   never loaded, so nothing here              │
├────────────────────────────────────────────────────────┤
│ HEAP                                                   │
│   Class objects for LazyDemo and Report (mirrors)      │
│   static fields, stored inside those mirrors           │
│   the AppClassLoader object, which keeps a list of     │
│   the classes it defined and keeps them reachable      │
└────────────────────────────────────────────────────────┘`,
          caption: "HotSpot since Java 8: metadata in Metaspace, Class objects and static fields on the heap.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "The Class object is not in Metaspace",
          text: "Older notes say the loaded `Class` object is cached in the method area or Metaspace. In HotSpot, Metaspace holds the class **metadata** (the method area of the spec). The `java.lang.Class` object is a normal heap object, and static fields live inside it. The cache that makes a second lookup return the same class is the loader's record of what it defined.",
        },
        {
          type: "paragraph",
          text: "The practical consequence: startup cost scales with how many classes the early code paths touch, not with how big the codebase is. And Metaspace only shrinks when a whole class loader becomes unreachable. That's why an app server that redeploys a web app but leaks a reference to the old app's loader eventually dies with `java.lang.OutOfMemoryError: Metaspace`.",
        },
      ],
    },
    {
      title: "The Reflection API for Loading",
      blocks: [
        {
          type: "code",
          language: "java",
          code: `// load + link + initialize (runs static initializers)
Class<?> a = Class.forName("com.example.SomeClass");

// load only, using a loader you choose
ClassLoader loader = Thread.currentThread().getContextClassLoader();
Class<?> b = Class.forName("com.example.SomeClass", false, loader);
Class<?> c = loader.loadClass("com.example.SomeClass");

// a class literal also loads without initializing
Class<?> d = String.class;`,
        },
        {
          type: "paragraph",
          text: "This is how code loads a class whose name is only known at runtime, as a `String` from configuration or a scan. Older JDBC code used `Class.forName(\"com.mysql.jdbc.Driver\")` for exactly this reason: initializing the driver class ran its static block, which registered it with `DriverManager`.",
        },
        {
          type: "paragraph",
          text: "Here's the difference between the variants, on one class:",
        },
        {
          type: "code",
          language: "java",
          title: "ForNameDemo.java",
          code: `public class ForNameDemo {
    public static void main(String[] args) throws Exception {
        ClassLoader app = ForNameDemo.class.getClassLoader();

        System.out.println("1. loadClass");
        Class<?> a = app.loadClass("Driver");

        System.out.println("2. forName(name, false, loader)");
        Class<?> b = Class.forName("Driver", false, app);

        System.out.println("3. forName(name)");
        Class<?> c = Class.forName("Driver");

        System.out.println("same Class object? " + (a == b && b == c));
    }
}

class Driver {
    static { System.out.println("   Driver static block ran"); }
}`,
        },
        {
          type: "output",
          text: `1. loadClass
2. forName(name, false, loader)
3. forName(name)
   Driver static block ran
same Class object? true`,
        },
        {
          type: "paragraph",
          text: "The first two calls loaded `Driver` and ran nothing. Only the one-argument `forName` initialized it. All three returned the same `Class` object, because the same loader answered each time.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Static blocks run once, constructors every time",
        },
        {
          type: "paragraph",
          text: "This one also shows the superclass rule, and two cases that load without initializing:",
        },
        {
          type: "code",
          language: "java",
          title: "InitOrder.java",
          code: `public class InitOrder {
    public static void main(String[] args) {
        System.out.println("constant: " + Fare.BASE);        // compile-time constant
        System.out.println("array:    " + new Fare[3].length); // array of Fare
        System.out.println("-- first new --");
        new SurgeFare();
        System.out.println("-- second new --");
        new SurgeFare();
    }
}

class Fare {
    static final int BASE = 50;           // inlined by javac
    static { System.out.println("Fare static block"); }
    Fare() { System.out.println("Fare constructor"); }
}

class SurgeFare extends Fare {
    static { System.out.println("SurgeFare static block"); }
    SurgeFare() { System.out.println("SurgeFare constructor"); }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:class+load InitOrder | grep -E "InitOrder|Fare |^[^[]"`,
        },
        {
          type: "output",
          text: `[0.049s][info][class,load] InitOrder source: file:/.../triggers/
constant: 50
[0.051s][info][class,load] Fare source: file:/.../triggers/
array:    3
-- first new --
[0.069s][info][class,load] SurgeFare source: file:/.../triggers/
Fare static block
SurgeFare static block
Fare constructor
SurgeFare constructor
-- second new --
Fare constructor
SurgeFare constructor`,
        },
        {
          type: "list",
          items: [
            "`Fare.BASE` didn't even load `Fare`. `javap` shows why: `javac` folded the whole expression into one string, `ldc \"constant: 50\"`.",
            "`new Fare[3]` loaded `Fare` (the `anewarray` instruction needs the class) but didn't initialize it. No static block printed.",
            "The first `new SurgeFare()` initialized `Fare` first, then `SurgeFare`, then ran both constructors. The second `new` ran only the constructors.",
          ],
        },
        {
          type: "heading",
          text: "A custom class loader",
        },
        {
          type: "paragraph",
          text: "The normal way to write one is to extend `ClassLoader` and override only `findClass`, so parent delegation keeps working:",
        },
        {
          type: "code",
          language: "java",
          title: "DirLoader.java",
          code: `import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class DirLoader extends ClassLoader {
    private final Path dir;

    public DirLoader(String name, Path dir, ClassLoader parent) {
        super(name, parent);
        this.dir = dir;
    }

    // Called by loadClass() only after the parent chain failed to find the class
    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        Path file = dir.resolve(name.replace('.', '/') + ".class");
        try {
            byte[] bytes = Files.readAllBytes(file);
            return defineClass(name, bytes, 0, bytes.length);
        } catch (IOException e) {
            throw new ClassNotFoundException(name, e);
        }
    }
}`,
        },
        {
          type: "heading",
          text: "Same class, two loaders, ClassCastException",
        },
        {
          type: "paragraph",
          text: "To get two copies of one class, I gave two `DirLoader`s the **platform** loader as parent. That skips the app loader, so delegation can't find `Greeter` and each loader defines its own copy from the same file:",
        },
        {
          type: "code",
          language: "java",
          title: "Greeter.java",
          code: `public class Greeter {
    public String greet() { return "hello from " + getClass().getClassLoader().getName(); }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "TwoLoaders.java",
          code: `import java.nio.file.Path;

public class TwoLoaders {
    public static void main(String[] args) throws Exception {
        Path out = Path.of("out");   // Greeter.class lives here, also on the class path
        ClassLoader platform = ClassLoader.getPlatformClassLoader();

        // Parent is the platform loader, so the app loader is skipped
        ClassLoader pluginA = new DirLoader("plugin-a", out, platform);
        ClassLoader pluginB = new DirLoader("plugin-b", out, platform);

        Class<?> a = pluginA.loadClass("Greeter");
        Class<?> b = pluginB.loadClass("Greeter");

        System.out.println(a.getName() + " == " + b.getName() + " ? " + (a == b));
        System.out.println(a.getClassLoader().getName() + " / "
            + b.getClassLoader().getName() + " / "
            + Greeter.class.getClassLoader().getName());

        Object obj = a.getDeclaredConstructor().newInstance();
        System.out.println(a.getMethod("greet").invoke(obj));

        Greeter g = (Greeter) obj;   // Greeter here means the app loader's Greeter
        System.out.println(g.greet());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out *.java
java -cp out TwoLoaders`,
        },
        {
          type: "output",
          text: `Greeter == Greeter ? false
plugin-a / plugin-b / app
hello from plugin-a
Exception in thread "main" java.lang.ClassCastException: class Greeter cannot be cast to class Greeter (Greeter is in unnamed module of loader 'plugin-a' @70dea4e; Greeter is in unnamed module of loader 'app')
	at TwoLoaders.main(TwoLoaders.java:23)`,
        },
        {
          type: "paragraph",
          text: "Three `Greeter` classes in one JVM, same name, same bytes, three different types. The object works fine through reflection. The cast fails because `Greeter` in `TwoLoaders`'s code resolves through `TwoLoaders`'s own loader, which is `app`. The JVM message is nice here: it names both loaders, and that's the first thing I'd read in a production stack trace like this.",
        },
        {
          type: "heading",
          text: "A child-first loader",
        },
        {
          type: "paragraph",
          text: "To load my own copy first while keeping `java.*` safe, like a web app loader does, I override `loadClass` instead of just `findClass`:",
        },
        {
          type: "code",
          language: "java",
          title: "ChildFirstLoader.java",
          code: `import java.nio.file.Path;

public class ChildFirstLoader extends DirLoader {

    public ChildFirstLoader(String name, Path dir, ClassLoader parent) {
        super(name, dir, parent);
    }

    @Override
    protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
        synchronized (getClassLoadingLock(name)) {
            Class<?> c = findLoadedClass(name);
            if (c == null && !name.startsWith("java.")) {
                try {
                    c = findClass(name);            // look in my own directory first
                } catch (ClassNotFoundException ignored) {
                    // not mine, fall through to the parent
                }
            }
            if (c == null) {
                c = super.loadClass(name, false);   // normal parent-first path
            }
            if (resolve) {
                resolveClass(c);
            }
            return c;
        }
    }

    public static void main(String[] args) throws Exception {
        ClassLoader app = ChildFirstLoader.class.getClassLoader();
        ClassLoader webapp = new ChildFirstLoader("webapp", Path.of("out"), app);

        System.out.println(webapp.loadClass("Greeter").getClassLoader().getName());
        System.out.println(webapp.loadClass("java.lang.String").getClassLoader());
    }
}`,
        },
        {
          type: "output",
          text: `webapp
null`,
        },
        {
          type: "paragraph",
          text: "Compare this with the `Delegation` run earlier: same directory, same parent (`app`), but now `Greeter` comes from the child. `String` still comes from the bootstrap loader.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Thinking every class in the source is loaded at startup",
        },
        {
          type: "paragraph",
          text: "It isn't. Loading follows the code that actually runs, as the `LazyDemo` log shows. The flip side: a missing class doesn't fail at startup either. It fails the first time a code path needs it, which can be hours after a deploy.",
        },
        {
          type: "heading",
          text: "Treating loading and initialization as one thing",
        },
        {
          type: "paragraph",
          text: "A static block printing is proof of **initialization**, not of loading. `Report.class`, `new Fare[3]` and `loadClass` all load a class without a single line of its static code running. If I want to know when a class is loaded, I use `-Xlog:class+load`.",
        },
        {
          type: "heading",
          text: "Mixing up ClassNotFoundException and NoClassDefFoundError",
        },
        {
          type: "paragraph",
          text: "`ClassNotFoundException` is a checked exception from code that asked for a class **by name**: `Class.forName`, `loadClass`, `findClass`. The class simply isn't there:",
        },
        {
          type: "code",
          language: "java",
          title: "Missing.java",
          code: `public class Missing {
    public static void main(String[] args) throws Exception {
        Class.forName("com.example.payments.StripeGateway");
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.ClassNotFoundException: com.example.payments.StripeGateway
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:641)
	at java.base/jdk.internal.loader.ClassLoaders$AppClassLoader.loadClass(ClassLoaders.java:188)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:526)
	at java.base/java.lang.Class.forName0(Native Method)
	at java.base/java.lang.Class.forName(Class.java:423)
	at java.base/java.lang.Class.forName(Class.java:414)
	at Missing.main(Missing.java:3)`,
        },
        {
          type: "paragraph",
          text: "`NoClassDefFoundError` is an `Error` the JVM throws when compiled code refers to a class that existed at compile time but can't be found now. To reproduce it, I compiled an app that uses `PriceCalculator`, ran it once (it printed `194`), then deleted `PriceCalculator.class`:",
        },
        {
          type: "code",
          language: "java",
          title: "App.java",
          code: `public class App {
    public static void main(String[] args) {
        System.out.println("App started");
        PriceCalculator calc = new PriceCalculator();
        System.out.println(calc.fare(12));
    }
}

class PriceCalculator {
    int fare(int km) { return 50 + km * 12; }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac App.java
rm PriceCalculator.class
java App`,
        },
        {
          type: "output",
          text: `App started
Exception in thread "main" java.lang.NoClassDefFoundError: PriceCalculator
	at App.main(App.java:4)
Caused by: java.lang.ClassNotFoundException: PriceCalculator
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:641)
	at java.base/jdk.internal.loader.ClassLoaders$AppClassLoader.loadClass(ClassLoaders.java:188)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:526)
	... 1 more`,
        },
        {
          type: "paragraph",
          text: "Notice `App started` printed first. The error came at line 4, the first time the `new` needed the class. The cause underneath is a `ClassNotFoundException` from the app loader. In real projects this is almost always a JAR that was on the compile class path but not on the runtime one, or two versions of a library fighting.",
        },
        {
          type: "heading",
          text: "Forgetting that a failed static initializer poisons the class",
        },
        {
          type: "code",
          language: "java",
          title: "BadInit.java",
          code: `public class BadInit {
    public static void main(String[] args) {
        for (int i = 1; i <= 2; i++) {
            try {
                System.out.println(Config.TIMEOUT);
            } catch (Throwable t) {
                System.out.println("attempt " + i + ": " + t);
            }
        }
    }
}

class Config {
    static final int TIMEOUT = Integer.parseInt(System.getenv().getOrDefault("TIMEOUT", "abc"));
}`,
        },
        {
          type: "output",
          text: `attempt 1: java.lang.ExceptionInInitializerError
attempt 2: java.lang.NoClassDefFoundError: Could not initialize class Config`,
        },
        {
          type: "paragraph",
          text: "The first failure is an `ExceptionInInitializerError` wrapping the real `NumberFormatException`. After that the class is marked as failed and every later use gets `NoClassDefFoundError: Could not initialize class Config`, which doesn't mention the real cause. When I see \"Could not initialize class\" in a log, I scroll up to find the first `ExceptionInInitializerError`.",
        },
        {
          type: "heading",
          text: "Assuming the same name means the same class",
        },
        {
          type: "paragraph",
          text: "As the `TwoLoaders` run showed, a class is its name plus its loader. \"`X` cannot be cast to `X`\" is not a JVM bug.",
        },
        {
          type: "heading",
          text: "Casting the application loader to URLClassLoader",
        },
        {
          type: "paragraph",
          text: "Pre-Java 9 code often did `(URLClassLoader) ClassLoader.getSystemClassLoader()` to add JARs at runtime. Since Java 9 the app loader is an internal class, and that cast fails:",
        },
        {
          type: "output",
          text: "java.lang.ClassCastException: class jdk.internal.loader.ClassLoaders$AppClassLoader cannot be cast to class java.net.URLClassLoader (jdk.internal.loader.ClassLoaders$AppClassLoader and java.net.URLClassLoader are in module java.base of loader 'bootstrap')",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "When a `ClassCastException` or `LinkageError` makes no sense, print `getClassLoader()` for both sides before anything else. The JDK's message usually names the loaders already.",
            "Use `-Xlog:class+load` (or `-verbose:class`) to answer \"which JAR did this class actually come from?\". Each line shows the `source:`.",
            "Keep static initializers small and safe. Anything that can fail (parsing config, opening connections) belongs in normal startup code where an exception is readable and retryable.",
            "In a custom loader, override `findClass`, not `loadClass`, unless you really need child-first. Keep `java.*` delegated either way.",
            "Don't write `Class.forName(\"...Driver\")` in new code. JDBC 4.0 (Java 6) drivers register themselves through `ServiceLoader` and a `META-INF/services/java.sql.Driver` file. It's still worth recognising the old pattern in legacy code.",
            "Library code that loads classes by name (from config or a scan) should usually go through the thread context class loader, so it works inside containers where the library and the app have different loaders.",
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
            "Lazy loading is a real saving. A Spring Boot app has thousands of classes available across its JARs, but it only pays for the ones a code path actually touches.",
            "The cost is paid on first use. The first request through a new code path loads, verifies and initializes classes, on top of JIT warm-up. That's part of why the first requests after a deploy are slower.",
            "Class data sharing (CDS) cuts the loading cost. The log line `source: shared objects file` means the class came from a pre-parsed archive instead of being parsed from the JDK image. **AppCDS** extends that to application classes.",
            "JDK 24 added the AOT cache (JEP 483, Project Leyden), which records classes loaded and linked during a training run and reuses that work at startup. JDK 25 extended it with method profiles. GraalVM Native Image goes further and does all of it at build time.",
            "Metaspace grows with every loaded class. Apps that generate classes at runtime (proxies, bytecode libraries) or keep creating class loaders should cap it with `-XX:MaxMetaspaceSize` so a leak shows up early instead of eating native memory.",
          ],
        },
      ],
    },
    {
      title: "Class Loading in Production",
      blocks: [
        {
          type: "list",
          items: [
            "**Spring component scanning** (`@ComponentScan`) finds `.class` resources on the class path and reads their annotations with ASM-based metadata readers, **without** loading every class. Only the candidates that turn out to be components are loaded and turned into bean definitions. My notes said it `Class.forName`s everything, which would be very slow on a big class path.",
            "**Spring Boot fat JARs:** `java -jar app.jar` starts Spring Boot's launcher, which creates its own class loader (`LaunchedClassLoader` in current versions) to read the nested JARs under `BOOT-INF/lib`. The standard app loader can't read JARs inside a JAR.",
            "**Tomcat** gives each web app its own class loader under a shared \"common\" loader. The webapp loader is child-first for the app's own classes, so App A and App B can each bring a different version of the same library without colliding.",
            "**Spring Boot DevTools** uses two loaders: a base loader for the JARs that don't change, and a restart loader for my project classes. On a restart it throws the restart loader away and creates a new one, which is much faster than a cold JVM start.",
            "**JRebel** takes a different route. It runs as a Java agent and rewrites classes so they can be reloaded in place, instead of relying on throwaway class loaders.",
            "**JDBC drivers:** `DriverManager` uses `ServiceLoader` to find drivers on the class path. That's why a modern app just needs the driver JAR present.",
          ],
        },
        {
          type: "diagram",
          text: `        Bootstrap
            │
        Platform
            │
     System ("app")      Tomcat's own startup classes
            │
         Common          Tomcat and shared libs in lib/
      ┌─────┴─────┐
  Webapp A     Webapp B  WEB-INF/classes, WEB-INF/lib
                         child-first, except JDK classes
                         and the Servlet API`,
          caption: "Tomcat's loader tree, simplified. Each web app sees its own classes first.",
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
              question: "What is class loading?",
              answer:
                "It's how the JVM goes from a class name to a class it can actually use. A class loader finds the bytes, the JVM defines the class from them, links it, and later initializes it.\n\nIt isn't a one-time startup step, which is what I assumed at first. When I ran a small program with `-Xlog:class+load`, my second class only showed up in the log in the middle of `main`, right at the line that first used it.",
            },
            {
              question: "Are all classes loaded at startup, or only when needed?",
              answer:
                "Only when needed. The JVM loads the core JDK classes it needs to boot, then the main class, and after that classes get loaded as the running code first refers to them.\n\nI tested it with a class that's referenced in the bytecode, inside an `if` that wasn't taken. It never appeared in the `class+load` log. So the cost follows the code path that actually runs, not the size of the project.",
            },
            {
              question: "What triggers a class to load for the first time?",
              answer:
                "Anything that needs the class: `new`, a static method or field, a class literal like `Report.class`, creating an array of it, a subclass being loaded, or reflection like `Class.forName`.\n\nI'd separate that from initialization, though, because interviewers often mean that. Initialization, meaning the static blocks run, only happens on active use: `new`, a static call, a non-constant static field, or a subclass being initialized. A class literal loads the class and runs nothing. I saw that in the log: `Report` loaded at `Report.class`, and was only initialized later at `Report.print()`.",
            },
            {
              question: "If a class is referenced twice, does it load twice?",
              answer:
                "No. The loader checks `findLoadedClass` first, and returns the same `Class` object from then on. In my `forName` demo, `loadClass` and both `forName` calls returned the identical object, `a == b && b == c` was `true`.\n\nA loader actually can't define the same class twice. I tried calling `defineClass` twice on the same loader and got a `LinkageError` saying \"attempted duplicate class definition\". A different loader can load its own copy, though, and that's a different class.",
            },
            {
              question: "Where does the JVM keep loaded classes?",
              answer:
                "In HotSpot the class metadata, like methods, bytecode and the constant pool, goes into Metaspace, which is native memory outside the heap. The `java.lang.Class` object itself is a normal heap object, and static fields live inside it.\n\nThe \"cache\" that makes the second lookup cheap is each loader's record of the classes it defined. A lot of notes say the `Class` object sits in the method area. In HotSpot that hasn't been true for a long time, and since Java 8 there's no PermGen at all.",
            },
            {
              question: "What is `Class.forName()` used for?",
              answer:
                "Loading a class when you only have its name as a string, at runtime, like from a config file or a plugin list. The one-argument version also initializes the class, so its static blocks run.\n\nThe classic example is old JDBC code doing `Class.forName(\"com.mysql.jdbc.Driver\")`. The driver's static block registered it with `DriverManager`. If you want the class without running anything, there's `Class.forName(name, false, loader)`.",
            },
            {
              question: "Name the built-in class loaders in Java 9 and later.",
              answer:
                "Bootstrap, platform and application. Bootstrap is native and loads `java.base` plus some other core modules, and shows up as `null` from `getClassLoader()`. Platform loads the rest of the standard modules, like `java.sql`. Application, named `app`, loads the class path.\n\nOne detail I got wrong in my own notes: `java.xml` is a bootstrap module, not platform. I printed `DocumentBuilderFactory.class.getClassLoader()` on JDK 21 and got `null`.",
            },
            {
              question: "Can developers write their own class loaders?",
              answer:
                "Yes, by extending `ClassLoader`. The usual way is to override `findClass`, get the bytes from wherever you want, and call `defineClass`. That keeps parent delegation working, since `loadClass` only calls `findClass` after the parents have failed.\n\nI wrote one that reads class files from a directory in about fifteen lines. You rarely need one in application code, but Tomcat, plugin systems and Spring Boot's launcher all rely on them.",
            },
            {
              question: "Does a static initializer run every time an object is created?",
              answer:
                "No, once per class, per class loader. Constructors run on every `new`.\n\nIn my `InitOrder` test, the first `new SurgeFare()` printed both static blocks, `Fare`'s then `SurgeFare`'s, and then both constructors. The second `new` printed only the two constructors.",
            },
            {
              question: "What replaced the extension class loader in Java 9?",
              answer:
                "The platform class loader, which you get with `ClassLoader.getPlatformClassLoader()`. Java 9's module system removed the extension mechanism itself, so there's no `jre/lib/ext` folder anymore.\n\nIt's not just a rename. The platform loader loads specific standard modules, and a bunch of modules I'd have guessed were \"extension-like\", `java.xml` and `java.logging` for example, are actually defined to the bootstrap loader.",
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
              question: "Explain what triggers loading and initialization, with examples.",
              answer:
                "Loading happens when the JVM needs the class, for example to resolve `new Report()`, a class literal `Report.class`, or `new Report[3]`. Initialization is stricter: it only happens on active use, meaning `new`, a static method call, a static field that isn't a compile-time constant, a subclass being initialized, or reflection like `Class.forName(name)`.\n\nMy `InitOrder` demo shows the gaps nicely. Reading `Fare.BASE`, a `static final int`, didn't load `Fare` at all, because `javac` inlined it. `new Fare[3]` loaded `Fare` but didn't run its static block. Only `new SurgeFare()` initialized both classes, parent first.",
            },
            {
              question: "Why does lazy loading help large applications?",
              answer:
                "Because you only pay for what you use. Loading means reading and parsing bytes, verifying and initializing, and a Spring Boot app has thousands of classes on its class path, most of which a given run never touches.\n\nThe trade-off is that the cost moves to first use. A code path that's never been hit pays for loading when the first request goes through it, on top of JIT warm-up. That's one reason the first requests after a deploy are slower.",
            },
            {
              question: "How is object construction different from class initialization?",
              answer:
                "Initialization runs once per class: the static field initializers and `static {}` blocks, in `<clinit>`. Construction runs for every `new`: instance initializers and the constructor, in `<init>`.\n\nThe ordering matters too. The superclass is initialized before the subclass, and on each `new` the superclass constructor runs before the subclass one. I saw exactly that order printed: `Fare` static, `SurgeFare` static, `Fare` constructor, `SurgeFare` constructor.",
            },
            {
              question: "Why can two classes with the same name cause a ClassCastException?",
              answer:
                "Because at runtime a class is identified by its name and its defining loader together. If two loaders each define `Greeter`, they're two unrelated types, even from the same bytes.\n\nI reproduced it with two custom loaders whose parent was the platform loader, so they couldn't delegate to `app`. Casting one loader's `Greeter` to the app's `Greeter` gave \"class Greeter cannot be cast to class Greeter\", and the message named both loaders, `plugin-a` and `app`. That's the first thing I'd look at.",
            },
            {
              question: "How does Tomcat use class loaders to isolate web applications?",
              answer:
                "Each web app gets its own webapp class loader, under a common loader that holds Tomcat's shared libraries. The webapp loader looks in `WEB-INF/classes` and `WEB-INF/lib` first, which is child-first, the opposite of the default.\n\nSo App A and App B can ship different versions of the same library and each sees its own. Tomcat still delegates JDK classes and the Servlet API to the parent, because the container and the app have to agree on those types. If each app had its own `HttpServletRequest`, the container couldn't pass one in.",
            },
            {
              question: "What does `Class.forName()` do that a normal reference doesn't?",
              answer:
                "It takes the name as a runtime `String`, so the class doesn't need to exist when you compile. And the one-argument version always initializes the class, right away, even if you never use it after.\n\nA normal reference in code is resolved by the JVM when that instruction first runs, and whether it initializes depends on the instruction. `Report.class` only loads, `Report.print()` initializes. The overload `Class.forName(name, false, loader)` also lets you pick which loader to use, which matters inside containers.",
            },
            {
              question: "Why was `Class.forName(\"com.mysql.jdbc.Driver\")` needed for JDBC, and what replaced it?",
              answer:
                "Before JDBC 4.0, `DriverManager` only knew about drivers that had registered themselves, and a driver registered in its static initializer. So you had to force initialization, and `Class.forName` with one argument did exactly that.\n\nSince JDBC 4.0, in Java 6, `DriverManager` finds drivers with `ServiceLoader` through a `META-INF/services/java.sql.Driver` file in the driver JAR. Having the JAR on the class path is enough. Also, the current MySQL driver class is `com.mysql.cj.jdbc.Driver`, so the old line is outdated twice.",
            },
            {
              question: "How does Spring's `@ComponentScan` relate to class loading?",
              answer:
                "It finds classes at runtime instead of me listing them, but it's smarter than loading everything. It lists `.class` resources under the base package and reads their annotations with ASM-based metadata readers, directly from the bytes, without defining the classes in the JVM.\n\nOnly the candidates that turn out to be `@Component`, `@Service` and so on are then loaded. I used to think it called `Class.forName` on every class in the package. That would load and initialize a lot of classes that aren't beans.",
            },
            {
              question: "If a class is never referenced during a run, does the JVM pay anything for it?",
              answer:
                "Basically nothing in memory or CPU. It isn't read, parsed, verified or initialized, and it takes no Metaspace. The only cost is the bytes sitting in a JAR on disk.\n\nWhat I wouldn't say is \"nothing at all\" for classes that are referenced. The verifier sometimes loads classes just to check types in a method that is running, even if that branch isn't taken. In my `LazyDemo`, though, `Helper` never showed up in the log at all.",
            },
            {
              question: "What is kept in Metaspace for a loaded class, and why does the caching matter?",
              answer:
                "The class's runtime metadata: its methods and bytecode, the runtime constant pool, field layout, and so on. The `Class` object and the static field values are on the heap.\n\nThe caching matters for two reasons. It makes every later use cheap, and it makes identity work, since `==` on `Class` objects is how the JVM knows two types are the same. The flip side is that Metaspace is only freed when a whole loader is garbage collected. A web app redeploy that leaks its old loader keeps every one of its classes around, and after enough redeploys you get `OutOfMemoryError: Metaspace`.",
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
              question: "When would you write a custom ClassLoader, and what would you override?",
              answer:
                "A plugin system is the case I'd give. Each plugin JAR gets its own loader, so plugins can't see each other's classes, can use different versions of a library, and can be unloaded by dropping the loader. For the plain case I'd just use a `URLClassLoader` per plugin rather than writing one.\n\nIf I did write one, I'd override `findClass` and call `defineClass`, and leave `loadClass` alone so delegation works. I'd only override `loadClass` for child-first, and even then I'd keep `java.*` and the shared plugin API going to the parent. Otherwise the host and the plugin end up with two copies of the API interface and every cast fails.",
            },
            {
              question: "How does \"same class, different loader\" enable isolation in a multi-tenant JVM?",
              answer:
                "Since a type is name plus loader, giving each tenant or app its own loader gives it its own copy of every class that loader defines, including its own static fields. Tenant A's `Cache.INSTANCE` and tenant B's are different objects in different classes.\n\nThe catch is the shared boundary. Anything passed between the container and the tenants has to be a type loaded by a common parent, which is why Tomcat never lets web apps override the Servlet API. And it's isolation of types, not security. All tenants still share one heap, one set of threads and one process.",
            },
            {
              question: "How does JPMS add validation beyond traditional class loading, and what errors can it cause?",
              answer:
                "Before Java 9, if a loader could find a class you could use it, as long as it was public. With modules, the reading module must `require` the other module, and that module must `export` the package. Deep reflection also needs the package to be `open`.\n\nThe errors are different from missing classes. At startup, module resolution fails if a required module is missing, or if a module would read the same package from two different modules. At runtime you get `IllegalAccessError` for a non-exported package, and `InaccessibleObjectException` from `setAccessible` on a package that isn't open. Most apps run on the class path in the unnamed module and mainly hit the last one, when a library reflects into JDK internals.",
            },
            {
              question: "What are the trade-offs of lazy versus eager class loading?",
              answer:
                "Lazy gives a faster start and a smaller footprint, because you only load what's used. What you give up is predictability. The cost lands on whichever request first hits a path, and missing classes fail late, at first use in production, instead of at startup.\n\nEager (or ahead-of-time) moves all of that to startup or build time. You pay more upfront, but you know early whether everything is there, and latency is steadier. Java's answer is mixing them: lazy by default, CDS and the JDK 24+ AOT cache to preload what a training run used, and warm-up traffic before an instance takes real load.",
            },
            {
              question: "How would you debug a NoClassDefFoundError versus a ClassNotFoundException?",
              answer:
                "`ClassNotFoundException` means someone asked for a class by name and no loader in the chain had it. I'd check the spelling of the name, which loader was asked (the stack trace shows it), and whether the JAR is on that loader's path.\n\n`NoClassDefFoundError` means compiled code referenced a class that existed at compile time. Two cases. If it says \"Could not initialize class X\", the class is there but its static initializer failed earlier, so I search the log for the first `ExceptionInInitializerError`. Otherwise it's missing at runtime, and the `Caused by: ClassNotFoundException` points to it. Usually a dependency with `provided` or `test` scope, or a version conflict. I've reproduced both: deleting `PriceCalculator.class` gave the second, and a bad `Integer.parseInt` in a static field gave the first.",
            },
            {
              question: "Why do hot-reload tools create a new class loader instead of reloading the class in the old one?",
              answer:
                "Because a loader can't redefine a class it already defined. I tried calling `defineClass` twice and got \"attempted duplicate class definition\". Every object, every resolved reference and every JIT-compiled method is tied to the old class.\n\nSo DevTools puts my project classes in a restart loader and the stable JARs in a base loader. On a change it drops the restart loader and builds a new one, and the old classes get garbage collected once nothing refers to them. The alternative is JVM HotSwap through `Instrumentation.redefineClasses`, but that only lets you change method bodies, not add fields or methods.",
            },
            {
              question: "How does parent delegation interact with the \"already loaded\" check?",
              answer:
                "The check comes first, at every level. `loadClass` calls `findLoadedClass` on its own loader, and only if that's empty does it ask the parent, which does its own `findLoadedClass` first, and so on up.\n\nThere's also a cache above that, in the JVM. Once a class's constant pool entry for `Report` is resolved, the JVM doesn't call `loadClass` again for that reference, it just uses the resolved class. And the JVM remembers which loader it asked (the initiating loader), so resolving the same name through the same loader always gives the same class.",
            },
            {
              question: "What are the security implications of loading classes from arbitrary sources?",
              answer:
                "Loading a class is running code. Once a class from the network or a database is initialized, its static block runs with all the permissions of the JVM process. The verifier only checks that the bytecode is well-formed and type-safe, not that it's harmless.\n\nThe old answer was the Security Manager, but it was deprecated for removal in Java 17 and permanently disabled in Java 24. Today I'd only load code from sources I trust, verify signatures or checksums before `defineClass`, and put real isolation at the process or container level. Log4Shell is a good reminder of how bad remote class loading gets. Its worst variant made the JVM load a class from an attacker's server over JNDI.",
            },
            {
              question: "How does class loading interact with generics and type erasure?",
              answer:
                "Generics mostly don't exist at runtime. `List<String>` and `List<Integer>` are the same `Class`, `java.util.List`, loaded once. There's no class per type argument, which is also why `List<String>.class` doesn't compile.\n\nWhat survives is a `Signature` attribute in the class file, so reflection can still read the declared generic types, and the `checkcast` instructions `javac` inserts. Those casts need the target class, so the erased types are the ones that get loaded when the code runs.",
            },
            {
              question: "What class-loading happens in a Spring Boot service between startup and the first HTTP request?",
              answer:
                "Boot core JDK classes, mostly from the CDS archive. Then `java -jar` loads Spring Boot's launcher, which creates its own class loader for the nested JARs in `BOOT-INF/lib`, and loads my main class through it. Spring then scans the class path, reading class metadata with ASM, and loads and initializes bean classes as it creates the singletons. It also generates CGLIB proxy classes for things like `@Configuration` and `@Transactional`, and those are defined at runtime too.\n\nThen the embedded Tomcat starts and the app reports ready. But the first request still loads more: the classes on that request path that nothing touched during startup, like message converters, the specific controller code paths, and error handling. On a small service, `-Xlog:class+load` shows plenty of new lines during the first request.",
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
              question: "Some Spring beans only seem to be created when first requested from the ApplicationContext. Is that JVM lazy loading?",
              answer:
                "No, and I'd be careful not to mix them. Spring creates singleton beans eagerly at startup by default. If a bean is only created on first request, it's marked `@Lazy`, or `spring.main.lazy-initialization=true` is set, or it has a non-singleton scope like prototype or request.\n\nThat's a Spring container decision about when to create an object. JVM class loading is a separate layer below it. The bean's class gets loaded and initialized when Spring first needs it, whenever that is. They line up in practice, but a lazy bean doesn't mean the JVM did anything special.",
            },
            {
              question: "Two versions of the same utility class have to run in one application server. How does class loader isolation keep them apart?",
              answer:
                "Each application gets its own class loader, and each loader loads its own copy from its own JARs. Since a class is identified by name plus loader, `com.example.Utils` from App A and `com.example.Utils` from App B are two unrelated types, each with its own statics.\n\nIt works as long as the class isn't also on a shared parent's path. If it's in Tomcat's common `lib`, a parent-first loader finds that copy first and both apps get the same one. And the two versions must never be passed between the apps, otherwise the cast fails the way it did in my `TwoLoaders` demo.",
            },
            {
              question: "A static block's print statement never shows up, even though the class name appears all over the source. What do you check first?",
              answer:
                "First, whether the class is actually used on the code path that ran. Mentioning a class isn't using it. A class literal, a variable type, an array, or a `static final` constant don't initialize it, and a constant doesn't even load it, because `javac` inlines the value. I'd run with `-Xlog:class+load,class+init` and see whether it's loaded, initialized, or neither.\n\nIf it's initialized and still silent, I'd check whether output is going somewhere else, like a logger config, and whether the class came from a different JAR than I think. The `source:` in the load log answers that.",
            },
            {
              question: "An object that \"should\" be an instance of a known class fails the cast, intermittently. What would you investigate?",
              answer:
                "Two loaders defining the same class. I'd log `obj.getClass().getClassLoader()` next to `Target.class.getClassLoader()`. Recent JDKs put both loaders in the `ClassCastException` message already, like `loader 'plugin-a'` versus `loader 'app'` in my demo.\n\nThe intermittent part usually points at something that sometimes creates a new loader: a hot redeploy, a DevTools restart where an old instance is held in a static cache or a session, or a library that uses the thread context loader on some threads but not others. The fix is to make sure the shared type is only loaded by a common parent.",
            },
            {
              question: "Why do plugin systems use custom class loaders instead of the application class loader?",
              answer:
                "Because the app loader has one flat class path, fixed at startup. You can't add a JAR to it cleanly since Java 9, it isn't a `URLClassLoader` anymore, and I got a `ClassCastException` trying that cast. You also can't remove anything, and every plugin would see every other plugin's classes and dependencies.\n\nA loader per plugin fixes all of that. Plugins can be added at runtime, each can bring its own dependency versions, and a plugin can be unloaded by dropping its loader so its classes get collected. The host exposes a small API from a shared parent loader, and that's the only thing both sides share. IDEs like IntelliJ and Eclipse work this way.",
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
            "Write `ClassLoaderDemo.java` that prints `getClassLoader()` for `String`, `java.sql.Connection`, `java.util.logging.Logger` and your own class, then walks the `getParent()` chain from your class's loader.",
            "Add a class `Tracker` with a static block. Reference it three ways in `main`: `Tracker.class`, `new Tracker[2]`, then `new Tracker()`. Put a print between each.",
            "Run it with `java -Xlog:class+load,class+init ClassLoaderDemo` and mark where `Tracker` is loaded and where it's initialized.",
            "Bonus: delete `Tracker.class` after compiling and run again. Which error do you get, and at which line?",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: `null`, the platform loader, `null` (`java.logging` is a bootstrap module), and the app loader, whose chain prints `app` then `platform`. `Tracker` is loaded at `Tracker.class`, but its static block only prints at `new Tracker()`. With the class file deleted, you get a `NoClassDefFoundError` at the `Tracker.class` line, with a `ClassNotFoundException` as its cause.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `PHASES    LOAD  find bytes, defineClass, Class on heap
          LINK  verify -> prepare (defaults) -> resolve
          INIT  <clinit> once, superclass first

INIT ON   new X()  X.staticMethod()  X.nonConstField
          Class.forName("X")  subclass init  main class
LOAD ONLY X.class  new X[n]  loader.loadClass("X")
          Class.forName("X", false, loader)
NEITHER   static final compile-time constants (inlined)

LOADERS   Bootstrap (null): java.base, java.xml, ...
          Platform: java.sql, java.net.http, ...
          App: class path     Custom: webapps, plugins

RULES     parent first, then findClass()
          one Class per (name, loader)
          same name + different loader = different type

ERRORS    ClassNotFoundException  lookup by name failed
          NoClassDefFoundError    compiled ref missing now,
                                  or "Could not initialize"

SEE IT    java -Xlog:class+load,class+init Main`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "If someone asks whether all classes load at startup: no. Loading follows the code path that actually runs.",
            "A static block printing proves initialization, not loading. Use `-Xlog:class+load` to see loading.",
            "Parent-first is the default, not a law. Tomcat and plugin systems go child-first on purpose, and keep `java.*` delegated.",
          ],
        },
      ],
    },
  ],
};
