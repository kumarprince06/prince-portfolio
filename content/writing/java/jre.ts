import type { Lesson } from "../types";

export const jre: Lesson = {
  slug: "jre",
  title: "JRE (Java Runtime Environment)",
  description:
    "What the JRE really is (the JVM plus the class libraries it needs), why the standalone JRE download disappeared after Java 10, and how I built a 57 MB runtime with `jlink` that still runs a Java 21 program.",
  tags: ["Core Java", "JRE", "jlink", "Modules", "Fundamentals"],
  sections: [
    {
      title: "What the JRE Is",
      blocks: [
        {
          type: "paragraph",
          text: "After going deep on the JVM, this one is shorter. The way I think about it: the JRE is the JVM plus everything the JVM needs to actually run a real program.",
        },
        {
          type: "paragraph",
          text: "The **Java Runtime Environment** is the set of files needed to run Java applications, not to build them. It bundles a JVM implementation with the Java SE class libraries (`java.lang`, `java.util`, `java.io` and the rest) and the supporting files those libraries read at runtime.",
        },
        {
          type: "paragraph",
          text: "Why is it a separate idea from the JVM? Because an execution engine alone can't run anything useful. Every program calls `System.out.println()`, builds `String`s and fills an `ArrayList`. Those aren't built into the engine. They are ordinary compiled Java classes that have to exist on disk somewhere so the JVM can load them. The JRE is what puts them there.",
        },
        {
          type: "paragraph",
          text: "This distinction is where I used to get mixed up. The **JVM specification** is a document: the class file format, the instruction set, the loading and linking rules. The **JRE** is real software on disk: a JVM implementation (HotSpot, in OpenJDK) plus the actual compiled library classes. One is a set of rules, the other is something you can run.",
        },
      ],
    },
    {
      title: "Where the JRE Came From, and Where It Went",
      blocks: [
        {
          type: "list",
          items: [
            "**Java 1.0 to Java 8:** Sun, and later Oracle, shipped the JRE as its own download next to the JDK. People who only ran Java programs installed the JRE and skipped the compiler and tools. The JDK even carried a full copy of the JRE inside it, in a `jre/` subfolder.",
            "**The applet era (late 1990s to 2000s):** this split mattered most here. Ordinary users needed a JRE and its browser plugin to run applets on web pages, and they had no use for `javac`.",
            "**Java 9 (2017):** the Java Platform Module System (JPMS, Project Jigsaw) split the platform into modules such as `java.base`, `java.sql` and `java.logging`. The monolithic `rt.jar` and `tools.jar` were removed, the `jre/` subfolder inside the JDK disappeared, and the `jlink` tool arrived to build custom runtime images from modules. Oracle still published separate JRE downloads for Java 9 and 10, though.",
            "**Java 11 (2018):** Oracle stopped shipping a standalone JRE. The same release removed the browser plugin and Java Web Start, which were the main reasons end users installed a JRE in the first place. The consumer download on java.com stayed on Java 8.",
            "**Today:** \"the JRE\" is a concept and a packaging choice, not an Oracle product. Several vendors still publish JRE builds for current LTS versions (Eclipse Temurin, Azul Zulu, BellSoft Liberica), Linux distributions still split the packages (on my Ubuntu machine, `openjdk-21-jdk-headless` sits on top of `openjdk-21-jre-headless`), and container images like `eclipse-temurin:21-jre` are common. For a lean runtime, the modern tool is `jlink`.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          text: "A lot of notes say the standalone JRE \"disappeared after Java 8\". That is close but not right. Oracle shipped JREs for 9 and 10. The cut came with Java 11, and only for Oracle's own builds.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I picture a restaurant kitchen.",
        },
        {
          type: "list",
          items: [
            "The **JVM** is the stove and the equipment: the machinery that actually cooks, following fixed rules (the bytecode execution rules).",
            "The **JRE** is the working kitchen: the stove plus a stocked pantry of ready-made ingredients and sauces (the class libraries) that any recipe can use without making them from scratch.",
            "The **JDK** adds the chef's tools: recipe books, knives, training manuals (`javac`, `javap`, `jdb`, `jlink`). Someone who just wants a meal served needs the kitchen, not the chef's toolkit.",
          ],
        },
        {
          type: "paragraph",
          text: "`jlink` fits the analogy nicely too. It builds a kitchen whose pantry holds only the ingredients one specific menu needs.",
        },
      ],
    },
    {
      title: "What's Inside",
      blocks: [
        {
          type: "paragraph",
          text: "JRE = JVM + class libraries + supporting files. Taking that apart:",
        },
        {
          type: "list",
          items: [
            "**JVM:** the execution engine from the previous lesson. In HotSpot it is a native library, `lib/server/libjvm.so` on Linux, started by the `java` launcher.",
            "**Class libraries:** compiled classes for every built-in package: `java.lang` (`String`, `Object`, `System`, `Math`), `java.util` (`ArrayList`, `HashMap`), `java.io`, `java.net`, `java.time` and many more. Up to Java 8 they sat in `jre/lib/rt.jar`. Since Java 9 they are grouped into modules and stored in a single file, `lib/modules`, in the jimage format. Code reads it through the `jrt:/` file system.",
            "**Native libraries:** the Java libraries call into native code for I/O, networking and compression (`libjava.so`, `libnio.so`, `libnet.so`, `libzip.so`).",
            "**Supporting files:** configuration under `conf/` (security policy, `java.security`, logging config), the time-zone database `lib/tzdb.dat`, and the default trusted CA certificates in `lib/security/cacerts`.",
          ],
        },
        {
          type: "paragraph",
          text: "And what's not there: `javac`, `javadoc`, `jdb`, `javap`, `jlink`. The JRE runs already-compiled code. It can't compile anything. When I listed the `bin/` folder of a runtime I built with `jlink`, it held exactly two programs, `java` and `keytool`.",
        },
        {
          type: "table",
          headers: ["", "Java 8 and earlier", "Java 9 and later"],
          rows: [
            ["Core classes live in", "`jre/lib/rt.jar`", "`lib/modules` (jimage), read via `jrt:/`"],
            ["Tool classes (`javac` etc.)", "`lib/tools.jar`", "`jdk.*` modules, e.g. `jdk.compiler`"],
            ["JRE inside the JDK", "Full copy in `jre/`", "No separate folder, one runtime image"],
            ["Trimmed runtime", "Not possible (compact profiles in 8 only)", "`jlink --add-modules ...`"],
          ],
        },
      ],
    },
    {
      title: "How It Works Internally",
      blocks: [
        {
          type: "paragraph",
          text: "Here's what the runtime actually does between `java HelloWorld` and the first line of `main`. I worked this out by reading the file layout of a runtime image and the `-Xlog:class+load` output on JDK 21, where every class the JVM loads is logged in order.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**The launcher starts.** `bin/java` is a small native program. Its real logic lives in `lib/libjli.so` (the Java launcher infrastructure). It parses the command line, reads `lib/jvm.cfg` to decide which VM to use (`-server`, the only real choice on a modern 64-bit JDK), and locates `lib/server/libjvm.so`.",
            "**The JVM is created.** The launcher loads `libjvm.so` and calls `JNI_CreateJavaVM`. HotSpot sets up the heap, Metaspace, the GC and the interpreter. No Java code has run yet.",
            "**`java.base` is bootstrapped.** The **bootstrap class loader**, native code inside the JVM, loads the core classes from `java.base`: `Object` first, then `String`, `System`, `Class`, `Thread`, `Throwable` and a few hundred more. They come from the CDS archive (`lib/server/classes.jsa`) if the image has one, otherwise straight out of `lib/modules`. This happens during startup, not when my code first references `String`.",
            "**`System` is initialized.** The JVM runs `System`'s startup phases. The first one sets up the system properties (`java.home` among them) and `System.in`, `System.out` and `System.err`.",
            "**The module system boots and the class loaders appear.** `jdk.internal.module.ModuleBootstrap` resolves the modules in the image into the **boot layer**. For a class-path application, the roots are the modules that export an API, plus whatever they need. At the same time the Java-level loader objects are created and every module is mapped to one: the **platform class loader** gets modules like `java.sql` and `java.xml`, the **application class loader** gets the class path. Each delegates to its parent first: application, then platform, then bootstrap.",
            "**The main class is loaded.** The launcher's Java side, `sun.launcher.LauncherHelper`, asks the application class loader for `HelloWorld`. It finds `HelloWorld.class` on the class path, the class is linked and verified, the launcher finds `main`, the class is initialized, and `main` runs.",
            "**Everything else loads lazily.** Library classes nobody touched during startup, like `java.sql.Timestamp`, are loaded on first use through the same parent-first chain.",
          ],
        },
        {
          type: "paragraph",
          text: "The class-load log backs up that order. `HelloWorld` was line 430 of the log; these are the milestones on the way there:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:class+load HelloWorld \\
  | grep -nE 'java.lang.Object |ClassLoaders.(Platform|App)ClassLoader |ModuleBootstrap |LauncherHelper |HelloWorld '`,
        },
        {
          type: "output",
          text: `1:[0.017s][info][class,load] java.lang.Object source: shared objects file
117:[0.018s][info][class,load] jdk.internal.loader.ClassLoaders$AppClassLoader source: shared objects file
118:[0.018s][info][class,load] jdk.internal.loader.ClassLoaders$PlatformClassLoader source: shared objects file
335:[0.026s][info][class,load] jdk.internal.module.ModuleBootstrap source: shared objects file
386:[0.029s][info][class,load] sun.launcher.LauncherHelper source: shared objects file
430:[0.031s][info][class,load] HelloWorld source: file:/.../jre/`,
        },
        {
          type: "paragraph",
          text: "The loader classes show up early (line 117) because they are ordinary `java.base` classes. The loader objects are only created when the module system boots, around line 335. On this run, about 30 ms passed before my own class was even read.",
        },
        {
          type: "paragraph",
          text: "Because bootstrap-loaded classes come from native code rather than a Java `ClassLoader` object, `String.class.getClassLoader()` returns `null`. That `null` isn't a bug. It means \"the bootstrap loader\".",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Missing classes fail late",
          text: "If a class the program needs isn't in the runtime, the JVM still starts fine and only fails when the code first reaches that class, with a `NoClassDefFoundError`. There's a real one in the examples below. Only a broken `java.base` stops the JVM from starting at all.",
        },
      ],
    },
    {
      title: "The JRE in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `┌──────────────────────────────────────────────────────┐
│  JRE  (runtime image)                                │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  bin/java          launcher                    │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  JVM  lib/server/libjvm.so                     │  │
│  │  class loaders, runtime data areas,            │  │
│  │  execution engine, GC                          │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  CLASS LIBRARIES  lib/modules                  │  │
│  │  java.base  java.lang, java.util, java.io ...  │  │
│  │  java.sql, java.logging, java.xml ...          │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  SUPPORTING FILES                              │  │
│  │  native libs, conf/, tzdb.dat, cacerts         │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
   No javac, no javap, no jdb, no jlink.
   A JRE runs programs. It doesn't build them.`,
          caption: "File names are from a Java 21 image on Linux. Before Java 9 the class libraries lived in rt.jar.",
        },
      ],
    },
    {
      title: "Execution Flow",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            "I (or a script, or a container entrypoint) run `java HelloWorld`.",
            "The launcher from the runtime starts a JVM in the same process.",
            "The bootstrap class loader loads the core `java.base` classes (`Object`, `String`, `System`...) from the runtime's own `lib/modules`, or from the class data sharing (CDS) archive if the image has one.",
            "The application class loader loads `HelloWorld.class` from my class path. That comes from my build output, not from the runtime.",
            "`main` runs. Other library classes load on first use, again from the runtime image. The interpreter and the JIT execute the code as covered in the JVM lesson.",
            "`main` returns, the JVM shuts down.",
          ],
        },
        {
          type: "paragraph",
          text: "So there are two sources of classes: the runtime's own libraries and my code on the class path. `-Xlog:class+load` shows both and the order. On my JDK 21, the log had 605 lines. `Object` was line 1, `String` line 7, `System` line 16, and `HelloWorld` only showed up at line 430:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:class+load HelloWorld | grep -nE "java.lang.(Object|String|System) |HelloWorld "`,
        },
        {
          type: "output",
          text: `1:[0.021s][info][class,load] java.lang.Object source: shared objects file
7:[0.021s][info][class,load] java.lang.String source: shared objects file
16:[0.021s][info][class,load] java.lang.System source: shared objects file
430:[0.037s][info][class,load] HelloWorld source: file:/.../jre/`,
        },
        {
          type: "paragraph",
          text: "\"shared objects file\" is the CDS archive that ships with the JDK. The same command on a `jlink` image without one says `source: jrt:/java.base` instead, meaning the class was read out of `lib/modules`. That difference comes back in the performance section.",
        },
      ],
    },
    {
      title: "How I Model It in Pseudo-code",
      blocks: [
        {
          type: "paragraph",
          text: "Simplified, but with the order right: core classes first, my class second, everything else lazily.",
        },
        {
          type: "code",
          language: "text",
          title: "runtime pseudo-code",
          code: `run(className):
    image = locateRuntimeImage()       // java.home: bin/, lib/modules, conf/
    jvm   = image.startJVM()           // loads lib/server/libjvm.so

    // JVM startup, before any user code
    jvm.bootstrapLoader.load("java.lang.Object", "java.lang.String",
                             "java.lang.System", ...)   // from java.base

    userClass = jvm.appLoader.load(className)   // from the class path
    jvm.invokeMain(userClass)

    // later, on first use of a class not loaded yet:
    //   appLoader -> platformLoader -> bootstrapLoader
    //   found in the image  -> load it
    //   module not in image -> NoClassDefFoundError`,
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "paragraph",
          text: "All of these were compiled and run with JDK 21. The first three ask the running JVM about its own runtime. The last two build a runtime and then break it.",
        },
        {
          type: "heading",
          text: "Example 1: which runtime am I running on?",
        },
        {
          type: "code",
          language: "java",
          title: "RuntimeInfo.java",
          code: `public class RuntimeInfo {
    public static void main(String[] args) {
        System.out.println("java.home    = " + System.getProperty("java.home"));
        System.out.println("java.version = " + System.getProperty("java.version"));
        System.out.println("java.vendor  = " + System.getProperty("java.vendor"));
        System.out.println("vm.name      = " + System.getProperty("java.vm.name"));
    }
}`,
        },
        {
          type: "output",
          text: `java.home    = /usr/lib/jvm/java-21-openjdk-amd64
java.version = 21.0.12.1
java.vendor  = Ubuntu
vm.name      = OpenJDK 64-Bit Server VM`,
        },
        {
          type: "paragraph",
          text: "`java.home` is the root of the runtime image that is running this code, the folder with `bin/`, `lib/modules` and `conf/`. It isn't read from the `JAVA_HOME` environment variable; the launcher works it out from where `bin/java` lives. When I ran the same class on the `jlink` image from example 4, `java.home` pointed at that image's folder and everything else stayed the same. The vendor says `Ubuntu` because this build comes from Ubuntu's OpenJDK packages.",
        },
        {
          type: "heading",
          text: "Example 2: how many modules does this runtime have?",
        },
        {
          type: "code",
          language: "java",
          title: "BootModules.java",
          code: `import java.util.Optional;

public class BootModules {
    public static void main(String[] args) {
        ModuleLayer boot = ModuleLayer.boot();
        System.out.println("Modules in boot layer: " + boot.modules().size());

        Optional<Module> sql = boot.findModule("java.sql");
        System.out.println("java.sql present:      " + sql.isPresent());
        System.out.println("My class's module:     " + BootModules.class.getModule());
    }
}`,
        },
        {
          type: "paragraph",
          text: "On the full JDK:",
        },
        {
          type: "output",
          text: `Modules in boot layer: 62
java.sql present:      true
My class's module:     unnamed module @61bbe9ba`,
        },
        {
          type: "paragraph",
          text: "On the `java.base`-only runtime from example 4:",
        },
        {
          type: "output",
          text: `Modules in boot layer: 1
java.sql present:      false
My class's module:     unnamed module @3cd1f1c8`,
        },
        {
          type: "paragraph",
          text: "The runtime's library is literally a set of modules, and this shows which ones got resolved at startup. One thing puzzled me at first: `java --list-modules` shows 69 modules in the JDK, but the boot layer has 62. For a class-path app, the roots are only modules that export an API, so modules like the `java.se` aggregator, `jdk.jcmd` and the incubator and JIT-compiler internals are in the image but never resolved. My own class sits in the **unnamed module**, which is what every class-path class belongs to.",
        },
        {
          type: "heading",
          text: "Example 3: who loaded which class?",
        },
        {
          type: "code",
          language: "java",
          title: "WhoLoadedMe.java",
          code: `public class WhoLoadedMe {
    public static void main(String[] args) {
        show(String.class);              // java.base
        show(java.sql.Timestamp.class);  // java.sql
        show(WhoLoadedMe.class);         // my own code

        ClassLoader app = WhoLoadedMe.class.getClassLoader();
        System.out.println("app parent:      " + app.getParent());
        System.out.println("platform parent: " + app.getParent().getParent());
    }

    static void show(Class<?> c) {
        System.out.printf("%-20s %-10s %s%n",
                c.getSimpleName(), c.getModule().getName(), c.getClassLoader());
    }
}`,
        },
        {
          type: "output",
          text: `String               java.base  null
Timestamp            java.sql   jdk.internal.loader.ClassLoaders$PlatformClassLoader@61bbe9ba
WhoLoadedMe          null       jdk.internal.loader.ClassLoaders$AppClassLoader@639fee48
app parent:      jdk.internal.loader.ClassLoaders$PlatformClassLoader@61bbe9ba
platform parent: null`,
        },
        {
          type: "paragraph",
          text: "This is the loader chain from the internal-working section, printed by the program itself. `String` comes from `java.base` through the bootstrap loader, shown as `null`. `Timestamp` is a JDK class too, but `java.sql` is mapped to the platform loader. My class has no named module (`getName()` is `null` for the unnamed module) and comes from the application loader. The parent chain goes app, then platform, then `null`, the bootstrap loader again.",
        },
        {
          type: "heading",
          text: "Example 4: building my own JRE with jlink",
        },
        {
          type: "paragraph",
          text: "This is the demo that made the lesson click for me. A JDK can produce a runtime that contains only the modules you name. `HelloWorld` only needs `java.base`, so:",
        },
        {
          type: "code",
          language: "java",
          title: "HelloWorld.java",
          code: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello from a " + Runtime.version() + " runtime");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac HelloWorld.java
jlink --add-modules java.base --output minimal-jre

minimal-jre/bin/java --list-modules
minimal-jre/bin/java -cp . HelloWorld`,
        },
        {
          type: "output",
          text: `java.base@21.0.12.1
Hello from a 21.0.12.1+1-1-24.04.4-Ubuntu runtime`,
        },
        {
          type: "paragraph",
          text: "One module, and the program runs. Then I compared sizes with `du -sh`:",
        },
        {
          type: "table",
          headers: ["Runtime", "Modules", "Size on disk"],
          rows: [
            ["Full JDK 21 (Ubuntu package)", "69", "286 MB"],
            ["`jlink --add-modules java.base`", "1", "57 MB"],
            ["Same, plus `--strip-debug --no-header-files --no-man-pages --compress=zip-6`", "1", "39 MB"],
            ["`jlink --add-modules java.base,java.sql`", "5", "69 MB"],
          ],
        },
        {
          type: "paragraph",
          text: "A few details I noticed. The JDK's `lib/modules` alone is 135 MB and holds 27,846 class files; the `java.base`-only one is 29 MB with 7,572. Another 82 MB of the JDK is `jmods/`, the raw modules `jlink` builds from, which a runtime never needs. And asking for `java.sql` actually gave me five modules, because `jlink` pulls in what `java.sql` requires: `java.logging`, `java.xml` and `java.transaction.xa`.",
        },
        {
          type: "heading",
          text: "Example 5: running code that needs a missing module",
        },
        {
          type: "paragraph",
          text: "To see the failure mode, I ran a class that uses `java.sql.Timestamp` on the `java.base`-only runtime:",
        },
        {
          type: "code",
          language: "java",
          title: "DbCheck.java",
          code: `import java.sql.Timestamp;

public class DbCheck {
    public static void main(String[] args) {
        Timestamp now = new Timestamp(System.currentTimeMillis());
        System.out.println("Created at " + now);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "minimal-jre/bin/java -cp . DbCheck",
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.NoClassDefFoundError: java/sql/Timestamp
	at DbCheck.main(DbCheck.java:5)
Caused by: java.lang.ClassNotFoundException: java.sql.Timestamp
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:641)
	at java.base/jdk.internal.loader.ClassLoaders$AppClassLoader.loadClass(ClassLoaders.java:188)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:526)
	... 1 more`,
        },
        {
          type: "paragraph",
          text: "The JVM started, `main` began running, and it failed at line 5, the first line that touched the missing class. On the full JDK the same class prints `Created at ...`. The fix isn't guessing modules. `jdeps` tells you:",
        },
        {
          type: "code",
          language: "bash",
          code: "jdeps --print-module-deps DbCheck.class",
        },
        {
          type: "output",
          text: "java.base,java.sql",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "list",
          items: [
            "**Treating JRE and JDK as the same thing.** The JRE runs code. The JDK is a runtime plus the development tools (`javac`, `javap`, `jdb`, `jlink`, `jdeps`). The next lesson covers the JDK in detail.",
            "**Assuming Oracle still offers a standalone JRE for modern Java.** It stopped with Java 11. If you need a JRE-style runtime today, it comes from a vendor build (Temurin, Zulu, Liberica), a distro package, a `-jre` container image, or your own `jlink` image.",
            "**Thinking the JRE contains your application's classes.** It only contains the platform's own libraries. Your classes and JARs come from the class path (or module path), loaded by the application class loader.",
            "**Still looking for `rt.jar` or `tools.jar`.** Both were removed in Java 9. Old build scripts and tutorials that reference them break on anything newer than Java 8.",
            "**Guessing modules for `jlink`.** Leave one out and the app starts fine, then throws `NoClassDefFoundError` the first time a code path hits it, possibly in production. Use `jdeps` and test the image, not just the JAR.",
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
            "For development, install a JDK (through SDKMAN or your OS package manager). It already contains a complete runtime, so there is nothing separate to install.",
            "For production containers, ship a runtime, not the JDK. Either start from a vendor JRE image like `eclipse-temurin:21-jre`, or build a custom image with `jlink` in a multi-stage Docker build. For a Spring Boot service like the ones in RideX and Smart Dispatch, that's what I'd do.",
            "Generate the module list with `jdeps --print-module-deps` instead of maintaining it by hand, and run the real test suite against the final image.",
            "Keep the runtime version equal to or newer than the version you compile for (`--release`), or classes fail to load with `UnsupportedClassVersionError`.",
          ],
        },
        {
          type: "code",
          language: "dockerfile",
          title: "Dockerfile (sketch)",
          code: `FROM eclipse-temurin:21-jdk AS build
RUN jlink --add-modules java.base,java.sql,java.naming,java.management \\
          --strip-debug --no-header-files --no-man-pages \\
          --output /opt/jre

FROM debian:bookworm-slim
COPY --from=build /opt/jre /opt/jre
COPY app.jar /app/app.jar
ENTRYPOINT ["/opt/jre/bin/java", "-jar", "/app/app.jar"]`,
        },
        {
          type: "callout",
          tone: "tip",
          text: "The module list above is only an example. A real Spring Boot app usually needs more than that (`java.desktop` shows up because of `java.beans`, for instance). Run `jdeps` on your actual JAR and its dependencies to get the list.",
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "list",
          items: [
            "**Execution speed doesn't depend on JRE vs JDK.** The same `libjvm.so` runs the code either way. Performance comes from the JVM implementation, its flags and the JIT, not from which package you installed.",
            "**Image size does change.** Smaller runtimes mean smaller container images, faster pulls and faster scale-out on Kubernetes. 57 MB versus 286 MB is a real difference when every node pulls the image.",
            "**Smaller is not automatically faster to start.** This one surprised me. My `java.base`-only image has no CDS archive, so core classes are parsed from `lib/modules` on every start. Averaged over 40 runs of `HelloWorld`, it took about 100 ms, against about 70 ms for the full JDK.",
          ],
        },
        {
          type: "paragraph",
          text: "`jlink` can fix that with `--generate-cds-archive`. With it, the image grew from 57 MB to 84 MB (two CDS archives of 14 MB each, one for compressed oops and one without), and startup dropped back to about 65 ms. It's a trade: disk size against startup time. For a long-running service the 30 ms barely matters. For CLI tools or scale-to-zero workloads it can.",
        },
      ],
    },
    {
      title: "In Production",
      blocks: [
        {
          type: "list",
          items: [
            "Most containerized Java services now run on either a slim vendor runtime image or a custom `jlink` image, not a full JDK. Fewer files means a smaller image and a smaller attack surface: no compiler, no debugger agent tooling, fewer modules to show up in CVE scans.",
            "The catch is observability. A minimal runtime may not include `jcmd`, `jstack` or `jfr` (the `jdk.jcmd` and `jdk.jfr` modules). If the team relies on thread dumps or Flight Recorder in production, add those modules on purpose rather than finding out during an incident.",
            "In my own Java projects, RideX and Smart Dispatch, both Java 21 Spring Boot services, the plan is the same: build with the JDK, run on a runtime-only image.",
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
              question: "What does JRE stand for?",
              answer:
                "Java Runtime Environment. It's everything you need to run compiled Java code, which is basically the JVM plus the standard class libraries.\n\nThe word I'd stress is \"run\". There's no compiler in it.",
            },
            {
              question: "What does the JRE contain?",
              answer:
                "Three things: a JVM, the Java SE class libraries, and supporting files. In a Java 21 image on Linux that's `lib/server/libjvm.so` for the JVM, `lib/modules` for the classes, and things like `conf/`, the time-zone data and the `cacerts` trust store.\n\nWhen I built one with `jlink`, the `bin/` folder had just `java` and `keytool`. That's a good picture of what a runtime is.",
            },
            {
              question: "Can you compile Java code using only the JRE?",
              answer:
                "No. `javac` is a JDK tool, and the compiler classes live in the `jdk.compiler` module, which a runtime image doesn't include.\n\nOn my `java.base`-only runtime there simply isn't a `javac` in `bin/`. Also, `java Main.java` source-file mode won't save you there, because it needs that same compiler module internally.",
            },
            {
              question: "What's the relationship between the JVM and the JRE?",
              answer:
                "The JVM is inside the JRE. The JVM executes bytecode; the JRE is that JVM plus the libraries it needs to run real programs.\n\nA JVM on its own can't even print \"hello\", because `System` and `String` are library classes. The JVM loads them from the runtime's `lib/modules` at startup.",
            },
            {
              question: "Name two core Java packages provided by the JRE's class libraries.",
              answer:
                "`java.lang` and `java.util`. `java.lang` has `String`, `Object`, `System` and `Math`, and it's imported automatically. `java.util` has the collections like `ArrayList` and `HashMap`.\n\nBoth are in the `java.base` module, which is the one module every Java program needs.",
            },
            {
              question: "Does the JRE include a debugger?",
              answer:
                "It doesn't include `jdb`, the command-line debugger, or tools like `jstack` and `jcmd`. Those come with the JDK.\n\nA full vendor JRE can still be debugged remotely, though. The debug agent (JDWP) is a runtime piece, so you can attach an IDE with `-agentlib:jdwp`. In a `jlink` image that only works if you add the `jdk.jdwp.agent` module.",
            },
            {
              question: "Is the JRE still distributed as a separate standalone download today?",
              answer:
                "Not by Oracle for modern Java. Oracle shipped standalone JREs up to Java 10 and stopped with Java 11.\n\nOther vendors still do. Eclipse Temurin, Azul Zulu and BellSoft Liberica publish JRE builds, Ubuntu has `openjdk-21-jre-headless`, and there are Docker images like `eclipse-temurin:21-jre`.",
            },
            {
              question: "What Java feature changed how the runtime is packaged, and in which version?",
              answer:
                "The Java Platform Module System, Project Jigsaw, in Java 9. It split the JDK into modules and replaced `rt.jar` with a `lib/modules` image.\n\nThe practical effect is that a runtime is now just a set of modules, and you can pick which ones go in. That's what `jlink` does.",
            },
            {
              question: "What tool lets you build a custom minimal runtime image?",
              answer:
                "`jlink`, which comes with the JDK since Java 9. You give it modules and it writes a runtime image with only those modules and what they depend on.\n\nMy first try was `jlink --add-modules java.base --output minimal-jre`, and it produced a 57 MB runtime that ran a Java 21 HelloWorld fine. The JDK it came from is 286 MB.",
            },
            {
              question: "What Java system property reveals your installed Java's home directory?",
              answer:
                "`java.home`, so `System.getProperty(\"java.home\")`. It points at the root of the runtime image that's actually running the code.\n\nFrom the command line, `java -XshowSettings:properties -version` shows it too. That's useful on a server where `JAVA_HOME` and the `java` on the `PATH` don't agree.",
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
              question: "Precisely explain the difference between the JVM specification and the JRE.",
              answer:
                "The JVM specification is a document. It defines the class file format, the instruction set, verification, and how loading, linking and initialization work. You can't run a document.\n\nThe JRE is installed software: an implementation of that spec, like HotSpot, plus the compiled Java SE library classes and their native code and config. So the spec says what a JVM must do, and a JRE is a concrete thing on disk that does it and brings `String`, `ArrayList` and the rest along.",
            },
            {
              question: "Why does the JRE need to exist as a concept separate from the JVM?",
              answer:
                "Because executing bytecode isn't enough to run a program. Almost every line of real code calls library classes, and those are ordinary compiled Java classes that have to be shipped with the engine.\n\nKeeping the terms apart also matters in practice. When a trimmed runtime throws `NoClassDefFoundError: java/sql/Timestamp`, nothing is wrong with the JVM. The library just isn't in the runtime.",
            },
            {
              question: "What happens if you run a program that uses a class the runtime doesn't have?",
              answer:
                "The JVM starts normally and the program runs until it first touches that class. Then you get a `NoClassDefFoundError`, with a `ClassNotFoundException` as the cause.\n\nI reproduced it on a `java.base`-only `jlink` image: a class using `java.sql.Timestamp` failed exactly at the line that created the `Timestamp`. `ArrayList` itself is in `java.base`, so you can't really remove it. If `java.base` itself were damaged, the JVM wouldn't get through startup at all.",
            },
            {
              question: "What replaced `rt.jar` in the module system?",
              answer:
                "The platform classes moved into modules, and in a runtime image they're stored in one file, `lib/modules`, in a format called jimage. You read it through the `jrt:/` file system, which is why class-load logs on a plain `jlink` image say `source: jrt:/java.base`.\n\n`tools.jar` went away at the same time. The tool classes became modules like `jdk.compiler`.",
            },
            {
              question: "Why did Oracle stop shipping a standalone JRE?",
              answer:
                "A small correction first: it didn't stop after Java 8. Oracle still shipped JREs for 9 and 10, and stopped with Java 11.\n\nThe reasons fit together. Java 11 removed the browser plugin that ran applets, and Java Web Start, which were the main reasons end users installed a JRE. And with modules and `jlink`, Oracle's position became that applications should ship their own runtime instead of relying on a shared system-wide JRE.",
            },
            {
              question: "How does jlink improve production deployment for containerized applications?",
              answer:
                "It lets the container carry only the modules the app uses. Smaller image, faster pulls, less for security scanners to flag, and no compiler or dev tools sitting in production.\n\nThe numbers I measured on JDK 21: full JDK 286 MB, `java.base` only 57 MB, and 39 MB with `--strip-debug` and compression. The thing to watch is startup. Without `--generate-cds-archive`, my small image actually started slower than the full JDK.",
            },
            {
              question: "Which class loader loads the JRE's own core classes, and why?",
              answer:
                "The bootstrap class loader. It's part of the JVM itself, written in native code, because something has to load `java.lang.Object` and `java.lang.ClassLoader` before any Java-level class loader can exist.\n\nIt loads the core `java.base` classes during JVM startup, before my main class. You can see that in `-Xlog:class+load`: `String` was line 7 of the log and `HelloWorld` was line 430. Other platform modules like `java.sql` are loaded by the platform class loader.",
            },
            {
              question: "What was the practical difference, before Java 9, between installing just the JRE and the full JDK?",
              answer:
                "The JRE let you run Java programs: desktop apps, applets, server apps. The JDK added `javac`, `javadoc`, `jdb`, `tools.jar` and so on, so you could build them, and it was noticeably bigger.\n\nFor a regular user in 2014 the JRE was the right choice, and it's what the \"Get Java\" prompts installed. A developer needed the JDK, which carried its own complete JRE inside a `jre/` folder.",
            },
            {
              question: "Does the JRE affect runtime execution performance compared to the JDK?",
              answer:
                "No. Both contain the same JVM, so the same bytecode runs through the same interpreter, JIT and GC. The extra tools in a JDK just sit on disk.\n\nThe one exception I found is startup, and it's about CDS, not JRE vs JDK. A `jlink` image without a CDS archive took about 100 ms to run HelloWorld versus about 70 ms for the full JDK. Adding `--generate-cds-archive` brought it down to about 65 ms.",
            },
            {
              question: "What is `java.base`, and why is it significant?",
              answer:
                "It's the root module of the platform. It holds `java.lang`, `java.util`, `java.io`, `java.nio`, `java.time`, `java.net` and the core security classes. Every module depends on it implicitly, and it depends on nothing.\n\nThat makes it the smallest possible runtime. `jlink --add-modules java.base` gave me a one-module image, and `--list-modules` printed just `java.base@21.0.12.1`.",
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
              question: "Trace how `System.out.println()` goes from your bytecode to executing library code.",
              answer:
                "It starts before my code runs. During JVM startup the bootstrap loader loads `java.lang.System` from `java.base`, and the JVM initializes it as part of startup, which is when `System.out` gets set up as a `PrintStream`.\n\nThen my `main` executes `getstatic java/lang/System.out`. The JVM resolves that symbolic reference to the already-loaded class and reads the field. `invokevirtual PrintStream.println` resolves the method the same way and runs its bytecode, which is library code from the runtime image. Eventually it reaches native code in `libjava.so` that writes to file descriptor 1. So the only class my application loader contributed was my own.",
            },
            {
              question: "Why does a minimal jlink-built runtime reduce security risk compared to shipping a full JDK?",
              answer:
                "Less code, fewer ways in. A full JDK carries a compiler, `jshell`, the debugger, attach tooling and dozens of modules the app never uses, and every one of them can show up in a CVE report or be abused after a breach.\n\nA `java.base`-only image drops from 69 modules to one. When a vulnerability lands in a module you didn't include, like something in `java.desktop` or `java.xml`, it just doesn't apply. You still need to rebuild the image regularly to pick up JDK patch releases.",
            },
            {
              question: "Explain how JPMS changed the packaging model that previously separated JRE and JDK downloads.",
              answer:
                "Before Java 9 there were two fixed bundles: the JRE, built around one big `rt.jar`, and the JDK, which was that JRE plus tools. You got one or the other.\n\nJPMS turned the platform into about 70 modules with declared dependencies. After that, a JRE is just a runtime image with a certain set of modules, and a JDK is one that also has the tool modules like `jdk.compiler` and `jdk.jlink`. Since you can build any set in between with `jlink`, a fixed JRE download lost most of its reason to exist.",
            },
            {
              question: "Why are `java.lang.String` and similar classes part of the runtime rather than ordinary application dependencies?",
              answer:
                "Because the JVM and the language depend on them directly. The JVM needs `Object`, `Class`, `String`, `Thread` and `Throwable` just to start. String literals, string concatenation, enhanced `for` loops and exceptions are all compiled against specific platform classes.\n\nThey also need to be trusted and consistent. They're loaded by the bootstrap loader, and parent-first delegation means an app can't ship its own `java.lang.String` and replace them. If every app bundled its own copy, you'd have version conflicts in the most basic types.",
            },
            {
              question: "How would you design a Docker image strategy that uses jlink to minimize a Spring Boot application's image?",
              answer:
                "A multi-stage build. The first stage uses a JDK image, runs `jdeps --ignore-missing-deps --print-module-deps` over the app and its libraries, and feeds that list to `jlink` with `--strip-debug --no-header-files --no-man-pages`. The second stage is a slim base image with just the runtime and the JAR copied in.\n\nFor Spring Boot the module list ends up being around a dozen, things like `java.sql`, `java.naming`, `java.management` and `java.desktop` (for `java.beans`). I'd add `jdk.jfr` and `jdk.jcmd` on purpose so we can still take recordings and thread dumps, consider `--generate-cds-archive` if startup matters, and run the integration tests against the final image, because a missing module only fails when that code path runs.",
            },
            {
              question: "If someone says \"the JRE and JVM are the same thing,\" how would you correct them?",
              answer:
                "I'd say the JVM is one part of the JRE. The JVM is the engine: loading, verification, interpreter, JIT, GC. The JRE is that engine plus the class libraries and supporting files that programs need.\n\nThe quickest proof: give a JVM no class libraries and it can't start, because it needs `java.lang.Object` from `java.base`. And a runtime missing only `java.sql` has a perfectly working JVM but still fails with `NoClassDefFoundError` on `java.sql.Timestamp`.",
            },
            {
              question: "What does it mean that bootstrap-loaded classes return `null` from `getClassLoader()`?",
              answer:
                "It means the class was loaded by the bootstrap loader, which is native code in the JVM and has no Java object to return. `String.class.getClassLoader()` printed `null` for me; my own class printed `jdk.internal.loader.ClassLoaders$AppClassLoader`.\n\nArchitecturally it marks those classes as the root of trust. Delegation goes parent-first, so application code can't override them. In code it's a practical gotcha: calling `getClassLoader().getResource(...)` on a core class throws a `NullPointerException`, so library code has to handle that `null`.",
            },
            {
              question: "Why might an organization with strict CVE scanning prefer custom jlink runtimes?",
              answer:
                "Because scanners report on what's in the image, whether the app uses it or not. With a full JDK image, a CVE in a module the service never touches still fails the pipeline and triggers a patch cycle.\n\nWith a `jlink` image, the module list is explicit and short, so the reported surface matches what the app actually runs, and it's easier to argue a finding doesn't apply. The cost is owning the build: rebuilding on every JDK patch release and keeping the module list correct.",
            },
            {
              question: "How do modules relate to and refine the older JRE vs JDK split?",
              answer:
                "The old split was two sizes: runtime or runtime plus tools. Modules make it a spectrum. The Java SE platform is modules like `java.base` and `java.sql`, the tools are `jdk.*` modules like `jdk.compiler`, and any runtime image is some subset of them.\n\nSo \"JRE\" and \"JDK\" become names for two common subsets. A `jlink` image with `java.base` plus `jdk.jfr` is neither of them, and it's a perfectly valid runtime.",
            },
            {
              question: "With dozens of Java microservices, what runtime-image strategy would you recommend?",
              answer:
                "I'd standardize on one Java LTS version and one base runtime image that the platform team owns, and rebuild it on every JDK patch release. For most teams that's either a vendor `-jre` image or a shared `jlink` image with the union of modules the services need, plus diagnostics modules.\n\nA custom per-service `jlink` image gives the smallest images, but it's more to maintain, and a shared base layer gets cached on every node anyway. I'd only go per-service for services where size or startup really matters, like ones that scale to zero.",
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
              question: "You deploy a compiled `.class` file to a server with a very old Java installation. What goes wrong?",
              answer:
                "Most likely it doesn't even load. If the runtime is older than the version you compiled for, you get `UnsupportedClassVersionError`. I compiled with JDK 21 and ran on Java 17 and got \"class file version 65.0\" versus \"only recognizes class file versions up to 61.0\".\n\nIf the version is fine but the runtime lacks a module, say a trimmed image without `java.sql`, it starts and then fails with `NoClassDefFoundError` when the code first uses that class. The fixes are matching `--release` to the target and checking the module list with `jdeps`.",
            },
            {
              question: "Your DevOps team wants to shrink Docker images for a fleet of Java microservices. What do you propose?",
              answer:
                "Stop shipping the JDK to production. Step one is just switching the runtime stage to a `-jre` image like `eclipse-temurin:21-jre`, which is almost free. Step two, where it's worth it, is a multi-stage build with `jdeps` and `jlink` to produce a custom runtime.\n\nOn my machine a `java.base`-only runtime was 57 MB against 286 MB for the JDK, and 39 MB with stripping and compression. I'd keep `jdk.jfr` and `jdk.jcmd` in so we don't lose diagnostics, and test the final image, not just the JAR.",
            },
            {
              question: "A junior developer can't find a standalone JRE download on Oracle's site. How do you explain it?",
              answer:
                "I'd tell them Oracle stopped shipping a separate JRE with Java 11. The browser plugin and Web Start were removed in the same release, so the end-user case was mostly gone, and modules plus `jlink` meant apps could ship their own runtime.\n\nThen the practical bit: for development, install a JDK, since it already contains the runtime. If they really need a JRE, Temurin, Zulu and Liberica still publish them, and so do Linux distributions.",
            },
            {
              question: "Someone asks why `String.class.getModule()` returns `java.base` and not an application module. What's the significance?",
              answer:
                "Because `String` isn't part of their application. It belongs to the platform, specifically `java.base`, the root module every program depends on, and it's loaded by the bootstrap loader. That's also why `getClassLoader()` returns `null` for it.\n\nTheir own classes, if they're on the class path, show up as members of an unnamed module, loaded by the application class loader. So that one line shows where the runtime ends and the application begins.",
            },
            {
              question: "Explain why installing \"Java\" today almost always means installing a JDK, even for someone who only runs programs.",
              answer:
                "Because since Java 11, Oracle's builds and most install guides and package managers give you a JDK, and a JDK already includes a complete runtime. Nothing separate to install, and the tools cost a few hundred MB of disk, which rarely matters on a developer machine.\n\nWhere size really matters, like containers, people don't install a JRE by hand. They use a `-jre` image or build a `jlink` runtime. Desktop apps now usually bundle their own runtime too, with `jlink` or `jpackage`, so users don't install Java at all.",
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
            "Compile and run `RuntimeInfo` and `WhoLoadedMe` from the examples. Note your `java.home`, and which loader each class comes from.",
            "Build a runtime with `jlink --add-modules java.base --output minimal-jre` and run `minimal-jre/bin/java --list-modules`.",
            "Run your `HelloWorld` with `minimal-jre/bin/java -cp . HelloWorld`, then compare `du -sh minimal-jre` with `du -sh` on your JDK.",
            "Write a class that uses `java.sql.Timestamp`, run it on the minimal runtime, and read the `NoClassDefFoundError`. Then run `jdeps --print-module-deps` on it and rebuild the image with the modules it reports.",
            "Bonus: run `-Xlog:class+load` on both runtimes and compare the `source:` of `java.lang.String`.",
          ],
        },
        {
          type: "paragraph",
          text: "Expected output on the minimal runtime, with your own version string:",
        },
        {
          type: "output",
          text: `java.base@21.0.12.1
Hello from a 21.0.12.1+1-1-24.04.4-Ubuntu runtime`,
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `JRE      JVM + class libraries + supporting files
         RUNS programs. No javac, javap, jdb, jlink.

LIBS     up to Java 8: jre/lib/rt.jar (tools in tools.jar)
         Java 9+: modules in lib/modules, read via jrt:/
         java.base = java.lang, java.util, java.io ...

LOADING  core java.base classes: bootstrap loader, at startup
         String.class.getClassLoader() == null
         your classes: app loader, from the class path

HISTORY  Java 9: JPMS + jlink, rt.jar and tools.jar removed
         Java 11: Oracle stops standalone JRE
         Today: vendor JREs (Temurin, Zulu, Liberica),
                -jre images, or your own jlink image

JLINK    jlink --add-modules java.base --output minimal-jre
         JDK 21 286 MB  ->  57 MB  (39 MB stripped)
         jdeps --print-module-deps finds the modules
         --generate-cds-archive keeps startup fast`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "If asked \"what is the JRE\", say JVM plus libraries, and that it can't compile code.",
            "The JVM spec is a set of rules. The JRE is real software on disk: a JVM implementation plus compiled library classes.",
            "The JRE never contains my application's classes. Those come from the class path.",
          ],
        },
      ],
    },
  ],
};
