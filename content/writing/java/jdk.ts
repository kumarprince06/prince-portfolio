import type { Lesson } from "../types";

export const jdk: Lesson = {
  slug: "jdk",
  date: "2026-08-08",
  title: "JDK (Java Development Kit)",
  description:
    "What the JDK adds on top of the runtime, the tools I actually use from it (javac, jar, javap, jshell, jdb, jlink, jcmd and friends), and how vendors, versions and licensing fit together.",
  tags: ["Core Java", "JDK", "javac", "Tooling", "OpenJDK"],
  sections: [
    {
      title: "What the JDK Is",
      blocks: [
        {
          type: "paragraph",
          text: "This lesson closes the JVM, JRE and JDK chain. For a while I used the three terms loosely, and this is where they finally fit into one picture.",
        },
        {
          type: "paragraph",
          text: "The **JDK (Java Development Kit)** is the full kit for building Java software. It has everything needed to run a program (the JVM, the class libraries, the `java` launcher) plus the tools to write, compile, inspect, debug, document, package and monitor it: `javac`, `jar`, `javap`, `jshell`, `jdb`, `jlink`, `jcmd` and more.",
        },
        {
          type: "paragraph",
          text: "Running a program and building one are different needs. A server that only runs a JAR needs a runtime. I need `javac` to turn source into bytecode, a debugger when something is wrong, and `jar` to ship the result. The JDK is that runtime with the developer tools on top.",
        },
        {
          type: "paragraph",
          text: "I'd been using it in every lesson without saying so. Every `javac` and every `javap -c` came from the JDK. This lesson makes that explicit.",
        },
      ],
    },
    {
      title: "Where the JDK Came From",
      blocks: [
        {
          type: "list",
          items: [
            "**1996:** JDK 1.0 ships. From day one Sun had to give developers a compiler, not just a runtime.",
            "**1996–2017:** Sun, and Oracle after 2010, ship two downloads: the **JDK** for developers and the smaller **JRE** for people who only run Java. The JDK even carried a full JRE inside it, in a `jre/` subfolder.",
            "**2017, Java 9:** the module system (JPMS) arrives, and with it `jlink`, which builds a runtime containing only the modules an app needs. The JDK's own layout changes too: no more nested `jre/` folder.",
            "**2018, Java 11:** Oracle stops shipping a standalone JRE, and its OpenJDK builds don't include one either. Since then \"installing Java\" on a dev machine means installing a JDK. Some vendors (Eclipse Temurin, Azul Zulu, BellSoft Liberica) still publish JRE builds, and `jlink` can produce a custom runtime from any JDK.",
            "**Licensing:** Oracle JDK 11 (September 2018) moved to a license that requires a paid subscription for production use, and Java 8 updates followed from April 2019. That pushed a lot of companies to free OpenJDK builds: Eclipse Temurin, Amazon Corretto, Azul Zulu, Microsoft Build of OpenJDK, BellSoft Liberica, SapMachine, Red Hat's build. Since Java 17 (2021), Oracle JDK is under the **Oracle No-Fee Terms and Conditions (NFTC)**, free for production use again, but only until one year after the next LTS comes out. Updates after that for that version go back to the paid-for license.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          text: "Oracle JDK and the OpenJDK builds all come from the same OpenJDK source code. The differences are the license, how long a vendor ships updates for a version, and support contracts. They are not different Javas.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I carry on with the kitchen picture from the JRE lesson:",
        },
        {
          type: "list",
          items: [
            "**JVM** is the stove, the thing that actually cooks.",
            "**JRE** (the runtime) is a working kitchen: the stove plus a stocked pantry, which is the class libraries. Enough to heat and serve a meal someone else already prepared.",
            "**JDK** is the whole culinary school: that kitchen plus the tools to write recipes (`javac`), taste as you go (`jshell`, `jdb`), look inside a finished dish (`javap`), box meals for delivery (`jar`, `jlink`, `jpackage`) and keep an eye on a kitchen that's already busy (`jcmd`, JFR).",
          ],
        },
      ],
    },
    {
      title: "What's Inside a JDK",
      blocks: [
        {
          type: "paragraph",
          text: "The short version is **JDK = runtime + development tools**. On my machine the JDK 21 `bin/` folder has 28 executables. These are the ones worth knowing:",
        },
        {
          type: "heading",
          text: "Build and run",
        },
        {
          type: "table",
          headers: ["Tool", "What it does"],
          rows: [
            ["`javac`", "The compiler. Turns `.java` source into `.class` bytecode. `--release N` compiles against the API of an older Java version."],
            ["`java`", "The launcher. Starts a JVM and runs a class, a JAR (`-jar`) or, since Java 11, a single source file directly. Also ships in every runtime."],
            ["`jar`", "Packages classes and resources into a `.jar` (a ZIP file with a `META-INF/MANIFEST.MF`)."],
            ["`javadoc`", "Generates HTML API docs from `/** ... */` comments."],
            ["`jshell`", "Java 9+. A REPL for trying expressions and snippets without writing a class."],
          ],
        },
        {
          type: "heading",
          text: "Inspect and debug",
        },
        {
          type: "table",
          headers: ["Tool", "What it does"],
          rows: [
            ["`javap`", "Disassembler. `javap -c` shows the bytecode of a class, `-v` shows the constant pool and class file version."],
            ["`jdb`", "Command-line debugger: breakpoints, stepping, printing locals. IDE debuggers use the same protocol (JDWP) under the hood."],
            ["`jdeps`", "Lists which packages and modules a class or JAR depends on. Handy before running `jlink`."],
          ],
        },
        {
          type: "heading",
          text: "Package and ship",
        },
        {
          type: "table",
          headers: ["Tool", "What it does"],
          rows: [
            ["`jlink`", "Java 9+. Builds a custom runtime image containing only the modules you list."],
            ["`jpackage`", "Java 16+. Wraps an app and a runtime into a native installer (`.deb`, `.rpm`, `.msi`, `.dmg`, `.pkg`)."],
          ],
        },
        {
          type: "heading",
          text: "Monitor and troubleshoot a running JVM",
        },
        {
          type: "table",
          headers: ["Tool", "What it does"],
          rows: [
            ["`jps`", "Lists running JVMs and their process IDs."],
            ["`jcmd`", "The Swiss-army knife: sends diagnostic commands to a running JVM (`VM.version`, `VM.flags`, `Thread.print`, `GC.heap_info`, `GC.heap_dump`, `JFR.start`)."],
            ["`jstat`", "Samples GC and class-loading statistics, e.g. `jstat -gcutil <pid> 1000`."],
            ["`jmap` / `jstack`", "Older tools for heap dumps/histograms and thread dumps. Still shipped; `jcmd` covers both."],
            ["JFR (`jfr`)", "Java Flight Recorder, a low-overhead event recorder built into HotSpot. Start it with `jcmd` or `-XX:StartFlightRecording`, read files with `jfr` or JDK Mission Control."],
            ["`jconsole`", "A small Swing GUI for watching memory, threads and MBeans over JMX. Needs a JDK with GUI libraries."],
          ],
        },
        {
          type: "paragraph",
          text: "So the hierarchy, as a mental model, is **JDK ⊃ JRE ⊃ JVM**: the JDK contains a runtime, and the runtime contains the JVM. It's the right way round to remember it, as long as I keep in mind that since Java 11 the \"JRE\" is no longer a separate product from Oracle or OpenJDK, just the runtime part of a JDK.",
        },
      ],
    },
    {
      title: "How It Works Internally",
      blocks: [
        {
          type: "heading",
          text: "Who does what, from source to output",
        },
        {
          type: "paragraph",
          text: "Here is the path from `HelloWorld.java` to output again, this time naming which layer does each job:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "I write `HelloWorld.java`, a plain text file. No Java needed at all for this part.",
            "I run `javac HelloWorld.java`. That's a JDK-only tool. A runtime-only install has no `javac` binary. The compiler parses the source, checks types and writes bytecode to `HelloWorld.class`.",
            "I run `java HelloWorld`. The launcher exists in every runtime, because running code compiled somewhere else is the whole point of a runtime.",
            "The launcher starts a JVM inside the same process.",
            "The class loaders find `HelloWorld.class` (application class loader) and core classes like `System` (bootstrap class loader, from the runtime's class libraries).",
            "The class is linked (the JVM verifies the bytecode here), initialized, and `main` runs in the execution engine: interpreter first, JIT for hot code.",
          ],
        },
        {
          type: "table",
          headers: ["Layer", "What it provides", "Enough to"],
          rows: [
            ["JVM specification", "The rules: class file format, bytecode semantics, loading, linking, initialization", "Nothing on its own; it's a document"],
            ["JVM implementation (e.g. HotSpot)", "The actual engine: class loading, memory, GC, interpreter, JIT", "Execute bytecode, but it needs class libraries to be useful"],
            ["Runtime (JRE)", "JVM + class libraries (`java.lang`, `java.util`, ...) + `java` launcher", "Run compiled programs"],
            ["JDK", "Runtime + `javac`, `jar`, `javap`, `jdb`, `jshell`, `jlink`, `jcmd`, ...", "Build, inspect, debug, package, monitor and run"],
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "The direction matters",
          text: "Early on I wrote \"the JRE is part of the JDK, which provides the compiler and debugger\" and wasn't sure which one did the providing. It's the JDK. The runtime never had a compiler. The JDK contains the runtime and adds the tools on top.",
        },
        {
          type: "heading",
          text: "The tools are mostly Java programs",
        },
        {
          type: "paragraph",
          text: "This is the part that surprised me. `bin/javac` on my machine is a 14 KB native executable. It links against `libjli.so`, the same small launcher library `java` uses, and all it does is start a JVM and run a Java class: `com.sun.tools.javac.Main` from the `jdk.compiler` module. While a compile was running, `jps -l` listed it as `jdk.compiler/com.sun.tools.javac.Main`. I can skip the wrapper and start the compiler myself:",
        },
        {
          type: "code",
          language: "bash",
          code: "java -m jdk.compiler/com.sun.tools.javac.Main -version",
        },
        {
          type: "output",
          text: "javac 21.0.12.1",
        },
        {
          type: "paragraph",
          text: "Most tools work the same way. `jps` showed `jlink` as `jdk.jlink/jdk.tools.jlink.internal.Main` and itself as `jdk.jcmd/sun.tools.jps.Jps`. `javap` lives in `jdk.jdeps`, `jshell` in `jdk.jshell`, `jar` in `jdk.jartool`. That's the real reason they are JDK-only: a runtime simply doesn't include those modules.",
        },
        {
          type: "diagram",
          text: `      javac Foo.java
             │
             ▼
┌─────────────────────────┐
│  bin/javac  (14 KB, C)  │   same launcher code as java
└────────────┬────────────┘
             │  loads lib/server/libjvm.so
             ▼
┌─────────────────────────┐
│  JVM                    │
│  runs module            │
│  jdk.compiler:          │
│  com.sun.tools.javac.   │
│  Main                   │
└────────────┬────────────┘
             ▼
         Foo.class`,
          caption: "The compiler is Java code running on a JVM, started by a tiny native wrapper.",
        },
        {
          type: "heading",
          text: "javac, phase by phase",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Parse:** read the source into tokens, then into a syntax tree. Syntax errors like a missing `;` stop here.",
            "**Enter:** record every class, method and field in symbol tables, so later phases can look names up. Annotation processors (Lombok, MapStruct) run around this point and can generate more source.",
            "**Attribute:** resolve names and types, pick overloads, infer generics. \"cannot find symbol\" and \"incompatible types\" come from here.",
            "**Flow:** check definite assignment, unreachable code, missing returns and unhandled checked exceptions.",
            "**Desugar:** lower language features to simpler ones: generics are erased, inner classes become separate classes, enhanced `for` loops and autoboxing become plain calls.",
            "**Generate:** emit bytecode and the constant pool, and write one `.class` file per class.",
          ],
        },
        {
          type: "heading",
          text: "The java launcher",
        },
        {
          type: "paragraph",
          text: "`java` is also a small native program. It parses the command line, reads `lib/jvm.cfg` to pick the VM, loads `lib/server/libjvm.so` (HotSpot itself) and calls `JNI_CreateJavaVM`. Then it loads the main class through the system class loader, finds `main`, and calls it through JNI. When `main` returns, it calls `DestroyJavaVM`, which waits for non-daemon threads and runs shutdown hooks. The `jlink` runtime I built still had `lib/server/libjvm.so`, because without it there is no JVM at all.",
        },
        {
          type: "heading",
          text: "jar and javap read ordinary file formats",
        },
        {
          type: "paragraph",
          text: "A JAR is a ZIP file with a `META-INF/MANIFEST.MF` inside. The manifest can name a `Main-Class` for `java -jar` and a `Class-Path` of other JARs. Nothing more magic than that; `unzip -l` works on any JAR. `javap` reads the class file format defined in the JVM specification, in order: the magic number `0xCAFEBABE`, minor and major version, constant pool, access flags, this and super class, interfaces, fields, methods, and attributes such as `Code`. The class file example below reads the first few of those by hand.",
        },
        {
          type: "heading",
          text: "jshell compiles every snippet",
        },
        {
          type: "paragraph",
          text: "`jshell` isn't an interpreter for Java source. It wraps each snippet in a generated class, compiles it with the compiler API, and runs it. By default the code runs in a **second JVM**. With `jshell` open, `jps -l` showed two processes: `jdk.jshell/jdk.internal.jshell.tool.JShellToolProvider` (the shell) and `jdk.jshell.execution.RemoteExecutionControl` (where my snippets execute). That split is why Ctrl+C can stop a runaway loop without killing the shell.",
        },
        {
          type: "heading",
          text: "jdb talks JDWP",
        },
        {
          type: "paragraph",
          text: "`jdb` uses the Java Debug Interface (JDI, module `jdk.jdi`) on its side, and the target JVM runs a JDWP agent that it talks to over a socket. IntelliJ does exactly the same thing. That's why remote debugging a service means starting it with `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005` and pointing the IDE at port 5005.",
        },
        {
          type: "heading",
          text: "jcmd attaches, jstat reads shared memory",
        },
        {
          type: "paragraph",
          text: "`jcmd`, `jstack` and `jmap` use the **attach API**. On Linux the tool creates an `.attach_pid<pid>` file and sends the target `SIGQUIT`. The JVM then starts an `Attach Listener` thread, which opens a UNIX socket at `/tmp/.java_pid<pid>`, and the tool sends its command through it. I could see this happen: the socket file appeared only after my first `jcmd`, and in a thread dump the `Attach Listener` thread was about a second younger than the JVM's other threads.",
        },
        {
          type: "paragraph",
          text: "`jstat` and `jps` don't attach at all. HotSpot writes its performance counters to a memory-mapped file, `/tmp/hsperfdata_<user>/<pid>`, and they just read it. That is also why these tools only see JVMs running as the same user, and why `jps` shows nothing for a JVM started with `-XX:-UsePerfData`.",
        },
        {
          type: "heading",
          text: "jlink links modules into an image",
        },
        {
          type: "paragraph",
          text: "`jlink` reads the `.jmod` files in the JDK's `jmods/` folder (69 of them in JDK 21), resolves the module graph starting from the modules you ask for, and writes a new runtime image. The classes all go into a single `lib/modules` file (the jimage format), next to `lib/server/libjvm.so`, and a `release` file records what's inside. Mine said `MODULES=\"java.base\"`.",
        },
      ],
    },
    {
      title: "The Layers in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `┌──────────────────────────────────────────────────────────┐
│  JDK                                  build + run        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Runtime (the old JRE)                run only     │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  JVM (HotSpot)                               │  │  │
│  │  │  class loaders, runtime data areas,          │  │  │
│  │  │  interpreter + JIT, garbage collector        │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  │  + class libraries: java.base, java.sql, ...       │  │
│  │  + java launcher, keytool, conf/                   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  + build:    javac  jar  javadoc  jshell                 │
│  + inspect:  javap  jdb  jdeps                           │
│  + ship:     jlink  jpackage                             │
│  + monitor:  jps  jcmd  jstat  jmap  jstack  jfr         │
└──────────────────────────────────────────────────────────┘

        JDK  ⊃  runtime (JRE)  ⊃  JVM`,
          caption:
            "Each box contains the one inside it. Since Java 11 the middle box is no longer a separate Oracle/OpenJDK download.",
        },
      ],
    },
    {
      title: "Build Time vs Run Time",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            "Write `HelloWorld.java`. Needs a text editor.",
            "Run `javac HelloWorld.java`. **Needs a JDK.**",
            "`javac` writes `HelloWorld.class`, which is bytecode.",
            "Run `java HelloWorld` on my laptop, a CI runner or a production server. **Needs only a runtime.** A JDK works too, since it contains one, but the compiler is dead weight at this point.",
            "The JVM loads, links, initializes and executes the class, exactly as in the JVM lesson.",
            "`main` returns, and the process exits.",
          ],
        },
        {
          type: "paragraph",
          text: "That's the cleanest way I know to remember the split: compiling needs the JDK, running needs a runtime. It maps directly onto a real deployment, where the build stage has a JDK and the production image usually doesn't.",
        },
        {
          type: "callout",
          tone: "note",
          text: "`java HelloWorld.java` blurs this a little. Source-file mode (Java 11+) compiles in memory with the compiler from the `jdk.compiler` module, so it only works on a JDK or on a runtime that includes that module.",
        },
      ],
    },
    {
      title: "The Layering as Pseudo-code",
      blocks: [
        {
          type: "paragraph",
          text: "A conceptual sketch, not real classes. \"Has a\" describes it better than \"is a\", so I wrote it as composition:",
        },
        {
          type: "code",
          language: "text",
          title: "mental model",
          code: `JVM {
    classLoaders
    runtimeDataAreas      // heap, Metaspace, stacks, code cache
    executionEngine       // interpreter + JIT + GC
}

Runtime /* the "JRE" */ {
    JVM jvm
    classLibraries        // java.base, java.sql, java.net.http, ...
    launcher java
    // can RUN bytecode, cannot compile source
}

JDK {
    Runtime runtime
    compiler      javac
    packagers     jar, jlink, jpackage
    inspectors    javap, jdeps, jdb, jshell, javadoc
    diagnostics   jps, jcmd, jstat, jmap, jstack, jfr
    // can BUILD, DEBUG, PACKAGE, MONITOR and RUN
}`,
        },
      ],
    },
    {
      title: "The Commands I Actually Use",
      blocks: [
        {
          type: "paragraph",
          text: "No new language syntax in this lesson. These are the command lines behind everything so far:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac HelloWorld.java                # compile: .java -> .class
javac --release 17 HelloWorld.java   # compile for a Java 17 runtime
java HelloWorld                      # run a compiled class
java HelloWorld.java                 # Java 11+: compile in memory and run
jar --create --file hello.jar --main-class HelloWorld HelloWorld.class
java -jar hello.jar                  # run the JAR via its Main-Class
javap -c HelloWorld                  # disassemble the bytecode
javadoc -d docs Calc.java            # HTML docs into ./docs
jshell                               # interactive REPL
jcmd <pid> VM.version                # ask a running JVM about itself`,
        },
        {
          type: "paragraph",
          text: "`jar cf hello.jar HelloWorld.class` is the older short form of the same `jar` command. It still works. I prefer the long options because I can read them six months later.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Do I have a JDK, and which one?",
        },
        {
          type: "code",
          language: "bash",
          code: `# If javac exists, this is a JDK, not just a runtime
javac -version

# Which runtime runs my code
java -version

# Everything the JDK ships
ls $JAVA_HOME/bin`,
        },
        {
          type: "paragraph",
          text: "When I ran the first two using the full JDK 21 paths, I got:",
        },
        {
          type: "output",
          text: `javac 21.0.12.1

openjdk version "21.0.12.1" 2026-08-18
OpenJDK Runtime Environment (build 21.0.12.1+1-1-24.04.4-Ubuntu)
OpenJDK 64-Bit Server VM (build 21.0.12.1+1-1-24.04.4-Ubuntu, mixed mode, sharing)`,
        },
        {
          type: "paragraph",
          text: "The build string tells me the vendor: this is Ubuntu's OpenJDK package. The plain `javac -version` on my `PATH`, though, printed `javac 17.0.20.1`. My machine has JDK 17 and 21 installed, and the `java` and `javac` symlinks pointed at different ones. That's exactly the kind of thing that later becomes a confusing build error, and it's why checking both versions is my first step when something odd happens.",
        },
        {
          type: "paragraph",
          text: "Listing `bin/` shows the tools from the tables above:",
        },
        {
          type: "output",
          text: `jar  jarsigner  java  javac  javadoc  javap  jcmd  jdb  jdeprscan
jdeps  jfr  jhsdb  jimage  jinfo  jlink  jmap  jmod  jpackage  jps
jrunscript  jshell  jstack  jstat  jstatd  jwebserver  keytool
rmiregistry  serialver`,
        },
        {
          type: "paragraph",
          text: "No `jconsole`: Ubuntu splits the JDK into a headless package and a GUI one, and I only have the headless one. There's also no `jre/` folder inside the JDK directory, which older tutorials still mention.",
        },
        {
          type: "heading",
          text: "Example 1: calling the compiler from Java",
        },
        {
          type: "paragraph",
          text: "Since `javac` is Java code, a program can call it directly through `javax.tools`. This one writes a source file, compiles it, loads the new class and runs its `main`:",
        },
        {
          type: "code",
          language: "java",
          title: "CompileIt.java",
          code: `import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;

public class CompileIt {
    public static void main(String[] args) throws Exception {
        Path dir = Files.createTempDirectory("gen");
        Path src = dir.resolve("Greeting.java");
        Files.writeString(src, """
                public class Greeting {
                    public static void main(String[] args) {
                        System.out.println("Compiled at runtime, running now");
                    }
                }
                """);

        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        System.out.println("Compiler: " + javac.getClass().getName());
        System.out.println("Module:   " + javac.getClass().getModule().getName());

        int exitCode = javac.run(null, null, null, src.toString());
        System.out.println("javac exit code: " + exitCode);

        try (var loader = new URLClassLoader(new URL[] { dir.toUri().toURL() })) {
            Class<?> cls = loader.loadClass("Greeting");
            cls.getMethod("main", String[].class).invoke(null, (Object) new String[0]);
        }
    }
}`,
        },
        {
          type: "output",
          text: `Compiler: com.sun.tools.javac.api.JavacTool
Module:   jdk.compiler
javac exit code: 0
Compiled at runtime, running now`,
        },
        {
          type: "paragraph",
          text: "The compiler really is a class in `jdk.compiler`, and exit code `0` is the same one the `javac` command returns on success. `Greeting.class` lands next to the source, and a fresh `URLClassLoader` loads it. On a runtime without `jdk.compiler`, `getSystemJavaCompiler()` returns `null`. This API is how build tools, `jshell` and source-file mode compile code without starting a separate `javac` process.",
        },
        {
          type: "heading",
          text: "Example 2: reading a class file header, like javap does",
        },
        {
          type: "code",
          language: "java",
          title: "ClassFileHeader.java",
          code: `import java.io.DataInputStream;
import java.io.FileInputStream;

public class ClassFileHeader {
    public static void main(String[] args) throws Exception {
        try (var in = new DataInputStream(new FileInputStream(args[0]))) {
            int magic = in.readInt();
            int minor = in.readUnsignedShort();
            int major = in.readUnsignedShort();
            int constantPoolCount = in.readUnsignedShort();

            System.out.printf("magic:         0x%X%n", magic);
            System.out.println("version:       " + major + "." + minor
                    + " (Java " + (major - 44) + ")");
            System.out.println("constant pool: " + (constantPoolCount - 1) + " entries");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac HelloWorld.java
java ClassFileHeader HelloWorld.class
javac --release 8 -d j8 HelloWorld.java
java ClassFileHeader j8/HelloWorld.class`,
        },
        {
          type: "output",
          text: `magic:         0xCAFEBABE
version:       65.0 (Java 21)
constant pool: 28 entries

magic:         0xCAFEBABE
version:       52.0 (Java 8)
constant pool: 28 entries`,
        },
        {
          type: "paragraph",
          text: "Every class file starts with `CAFEBABE`, then the version, then the constant pool. The pool count in the file is one more than the number of entries, which is why the code subtracts one. `javap -v HelloWorld` agreed: its last constant pool entry was `#28`. (`javac --release 8` also printed warnings that source and target 8 are obsolete and will be removed. They still work on JDK 21.)",
        },
        {
          type: "paragraph",
          text: "Major version 65 is what bites when the runtime is older. I ran the Java 21 class on a Java 17 runtime:",
        },
        {
          type: "output",
          text: `Error: LinkageError occurred while loading main class HelloWorld
	java.lang.UnsupportedClassVersionError: HelloWorld has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 61.0`,
        },
        {
          type: "heading",
          text: "Example 3: a runnable JAR that reports what it runs on",
        },
        {
          type: "code",
          language: "java",
          title: "WhichJdk.java",
          code: `public class WhichJdk {
    public static void main(String[] args) {
        System.out.println("Version:      " + Runtime.version());
        System.out.println("Vendor:       " + System.getProperty("java.vendor"));
        System.out.println("Home:         " + System.getProperty("java.home"));
        System.out.println("Boot modules: " + ModuleLayer.boot().modules().size());

        boolean hasCompiler = ModuleLayer.boot().findModule("jdk.compiler").isPresent();
        System.out.println("Compiler:     " + (hasCompiler ? "yes, this is a JDK" : "no, runtime only"));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac WhichJdk.java
jar --create --file whichjdk.jar --main-class WhichJdk WhichJdk.class
jar tf whichjdk.jar
java -jar whichjdk.jar`,
        },
        {
          type: "output",
          text: `META-INF/
META-INF/MANIFEST.MF
WhichJdk.class
Version:      21.0.12.1+1-1-24.04.4-Ubuntu
Vendor:       Ubuntu
Home:         /usr/lib/jvm/java-21-openjdk-amd64
Boot modules: 62
Compiler:     yes, this is a JDK`,
        },
        {
          type: "paragraph",
          text: "`--main-class` writes a `Main-Class: WhichJdk` line into the manifest, and that line is how `java -jar` knows where to start. A Spring Boot fat JAR works the same way; its `Main-Class` just points at Spring Boot's own launcher, which then finds my application class. The version and vendor lines are the same information `java -version` prints, read from inside the program.",
        },
        {
          type: "heading",
          text: "jlink: a runtime with only what the app needs",
        },
        {
          type: "code",
          language: "bash",
          code: `jdeps --print-module-deps WhichJdk.class
jlink --add-modules java.base --output rt \\
      --strip-debug --no-header-files --no-man-pages
rt/bin/java --list-modules
rt/bin/java -jar whichjdk.jar`,
        },
        {
          type: "output",
          text: `java.base
java.base@21.0.12.1
Version:      21.0.12.1+1-1-24.04.4-Ubuntu
Vendor:       Ubuntu
Home:         .../rt
Boot modules: 1
Compiler:     no, runtime only`,
        },
        {
          type: "paragraph",
          text: "`jdeps` said the class needs only `java.base`, so that's all I put in. The same JAR now reports one module and no compiler. The image was 52 MB against 287 MB for the full JDK, and `rt/bin` contained just `java` and `keytool`. That's a runtime in the old JRE sense, built from the JDK.",
        },
        {
          type: "heading",
          text: "jshell: trying things without a class",
        },
        {
          type: "code",
          language: "text",
          title: "jshell session",
          code: `int x = 21
var list = java.util.List.of(1, 2, 3)
list.stream().mapToInt(i -> i * 2).sum()
"JDK".repeat(2)
/exit`,
        },
        {
          type: "output",
          text: `|  Welcome to JShell -- Version 21.0.12.1
|  For an introduction type: /help intro

jshell> x ==> 21
jshell> list ==> [1, 2, 3]
jshell> $3 ==> 12
jshell> $4 ==> "JDKJDK"
jshell> |  Goodbye`,
        },
        {
          type: "paragraph",
          text: "No class, no `main`, no semicolons needed. Expressions I don't assign get scratch names like `$3`. I use it to check what an API actually returns before I write code around it.",
        },
        {
          type: "heading",
          text: "jdb: a breakpoint from the terminal",
        },
        {
          type: "code",
          language: "java",
          title: "Fare.java",
          code: `public class Fare {
    public static void main(String[] args) {
        long base = 12000;
        double surge = 1.5;
        long total = (long) (base * surge);
        System.out.println("Total: " + total);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -g Fare.java
jdb Fare
> stop at Fare:6
> run
main[1] locals
main[1] cont`,
        },
        {
          type: "output",
          text: `Breakpoint hit: "thread=main", Fare.main(), line=6 bci=15
6            System.out.println("Total: " + total);

main[1] Method arguments:
args = instance of java.lang.String[0] (id=449)
Local variables:
base = 12000
surge = 1.5
total = 18000
main[1] > Total: 18000

The application exited`,
        },
        {
          type: "paragraph",
          text: "The `-g` matters. Without it, `locals` only said \"Local variable information not available. Compile with -g to generate variable information\". `javac` leaves out the local variable table by default. Maven and Gradle turn debug info on for you, which is why IDE debugging just works.",
        },
        {
          type: "heading",
          text: "jcmd, jstat, jstack: looking at a running JVM",
        },
        {
          type: "paragraph",
          text: "I started a small program that just sleeps for a minute, found it with `jps`, and pointed the diagnostic tools at its PID:",
        },
        {
          type: "code",
          language: "bash",
          code: `jps -l
jcmd <pid> VM.version
jstat -gcutil <pid>
jstack <pid> | grep -A4 '"main"'`,
        },
        {
          type: "output",
          text: `128819 Sleep

128819:
OpenJDK 64-Bit Server VM version 21.0.12.1+1-1-24.04.4-Ubuntu
JDK 21.0.12.1

  S0     S1     E      O      M     CCS    YGC     YGCT     FGC    FGCT     CGC    CGCT       GCT
     -      -   0.00   0.00      -      -      0     0.000     0     0.000     0     0.000     0.000

"main" #1 [128821] prio=5 os_prio=0 cpu=48.58ms elapsed=2.64s tid=0x00007b257c019910 nid=128821 waiting on condition  [0x00007b2582dfe000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.lang.Thread.sleep0(java.base@21.0.12.1/Native Method)
	at java.lang.Thread.sleep(java.base@21.0.12.1/Thread.java:509)
	at Sleep.main(Sleep.java:1)`,
        },
        {
          type: "paragraph",
          text: "Zero young and full GCs, which makes sense for a program that allocates almost nothing. The thread dump shows exactly where `main` is parked. These tools attach to a live process, so they only work when they come from a JDK and run as the same user as the target JVM.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "list",
          items: [
            "**Getting the direction wrong.** The JRE never provided the compiler or debugger. JDK = runtime + tools, not the other way round.",
            "**Thinking you manage three installs.** Today you install one JDK and get all three layers. There's no separate JVM download, and since Java 11 no separate JRE from Oracle or OpenJDK.",
            "**Forgetting that `java` is in both.** Only `javac` and the other dev tools are JDK-only. That matters when you work out the minimum a server needs just to run something.",
            "**Mixing up vendor and version.** Oracle JDK, Temurin, Corretto, Zulu, Liberica and SapMachine are vendors. 8, 11, 17, 21 and 25 are versions. \"Temurin 21\" and \"Corretto 21\" are the same Java version from different builders.",
            "**Letting `java` and `javac` point at different JDKs.** On my own machine `java -version` said 21 and `javac -version` said 17. Compiling with the newer one and running on the older one gives `UnsupportedClassVersionError`.",
            "**Assuming `jconsole` or `jcmd` are always there.** A slim runtime image has neither. If you want to take a thread dump inside a container, the image needs those tools or you need another way in.",
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
            "Pick an OpenJDK build with a license and update schedule you understand. Temurin, Corretto and Zulu are free for production use. Oracle JDK is also free under NFTC for its current LTS, but read the terms before you rely on it long term.",
            "Use a version manager like SDKMAN! (Linux/macOS) to install and switch JDKs, instead of fighting `update-alternatives` or editing `PATH` by hand.",
            "Pin the Java version in the build: `maven.compiler.release` in Maven, a toolchain in Gradle, or `javac --release`. Then the bytecode targets what production runs, whatever JDK happens to be on the build machine.",
            "When a build or run behaves strangely, check `java -version`, `javac -version` and `JAVA_HOME` first. They don't always agree.",
            "Ship the smallest runtime that works: a vendor JRE image or a `jlink` runtime in production, the full JDK only where you build.",
          ],
        },
      ],
    },
    {
      title: "Performance Considerations",
      blocks: [
        {
          type: "list",
          items: [
            "Whether a machine has a JDK or just a runtime makes no difference to how fast the code runs. The same JVM executes it either way.",
            "Vendor builds of the same OpenJDK version run the same HotSpot, so for normal workloads Temurin 21 and Corretto 21 perform about the same. What really changes performance is the JVM implementation (HotSpot, OpenJ9, GraalVM) and its settings: GC choice, heap size, JIT.",
            "A `jlink` runtime has a smaller disk and image footprint, which means faster pulls and smaller containers. It doesn't make steady-state code faster.",
            "**GraalVM Native Image** is the genuinely different option. It compiles the app ahead of time into a native executable that starts in milliseconds and uses less memory at startup. The cost: a closed-world assumption, so reflection, dynamic proxies and class loading need configuration, and peak throughput can be lower than a warmed-up JIT. It fits serverless and scale-to-zero services, where cold start matters.",
          ],
        },
      ],
    },
    {
      title: "In Production",
      blocks: [
        {
          type: "list",
          items: [
            "Teams usually standardize on one vendor and version, say \"Temurin 21\", across all services. One set of CVE patches to track, one license to review, fewer \"works on my machine\" surprises.",
            "CI decides which JDK compiles the code. The deploy image decides which runtime runs it. When those drift apart, you get `UnsupportedClassVersionError` or a `NoSuchMethodError` from an API that only exists in the newer version.",
            "Container images are usually built in two stages: a JDK image to build, a runtime-only image to run.",
          ],
        },
        {
          type: "code",
          language: "text",
          title: "Dockerfile",
          code: `# Build stage: needs javac, so a JDK
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw -q package -DskipTests

# Runtime stage: only needs to run the JAR
FROM eclipse-temurin:21-jre
COPY --from=build /app/target/app.jar /app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]`,
        },
        {
          type: "paragraph",
          text: "That's the shape I'd use for RideX, my Spring Boot project on Java 21. The final image carries no compiler, no source and no Maven cache. Fewer tools in the image also means fewer things an attacker can use if the container is ever compromised.",
        },
        {
          type: "callout",
          tone: "tip",
          text: "In production, `jcmd <pid> Thread.print` and `jcmd <pid> GC.heap_dump /tmp/heap.hprof` are the two commands I'd reach for first when a service hangs or its memory keeps growing. JFR (`jcmd <pid> JFR.start duration=60s filename=rec.jfr`) is cheap enough to run on a live service.",
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
              question: "What does JDK stand for?",
              answer:
                "Java Development Kit. It's what you install to build Java code: a full runtime plus tools like `javac`, `jar`, `javap`, `jdb` and `jshell`.\n\nIn practice it's also what you install just to run Java on a dev machine, since Oracle and OpenJDK stopped shipping a separate JRE with Java 11.",
            },
            {
              question: "What's the relationship between the JDK, JRE and JVM? Which contains which?",
              answer:
                "JDK contains the JRE, and the JRE contains the JVM. The JVM runs bytecode, the JRE adds the class libraries and the `java` launcher so you can actually run programs, and the JDK adds the developer tools on top.\n\nThe one caveat I'd add is that \"JRE\" today mostly means the runtime part of a JDK, not a separate product. When I looked inside my JDK 21 install, there wasn't even a `jre/` folder anymore.",
            },
            {
              question: "Name three tools that are in the JDK but not in a runtime-only install.",
              answer:
                "`javac`, the compiler. `jar`, for packaging. `jdb`, the debugger. I'd also mention `javap`, which I use a lot to read bytecode, and `jcmd` for poking at a running JVM.\n\nI actually checked this with a `jlink` runtime I built from JDK 21. Its `bin/` had only `java` and `keytool`.",
            },
            {
              question: "Can you run a compiled `.class` file with only a runtime (no JDK)?",
              answer:
                "Yes. Running bytecode is exactly what a runtime is for. It has the JVM, the class libraries and the `java` launcher.\n\nThe only condition is the version. The runtime has to be at least as new as the bytecode target. A class compiled for Java 21 won't load on a Java 17 runtime.",
            },
            {
              question: "Can you compile a `.java` file with only a runtime?",
              answer:
                "Not normally. The compiler lives in the JDK, in the `jdk.compiler` module, and a runtime doesn't have a `javac` command. You'd get \"command not found\".\n\nThe edge case is `java HelloWorld.java`, source-file mode, which compiles in memory. That also needs `jdk.compiler`, so it only works on a JDK or on a custom runtime that happens to include that module.",
            },
            {
              question: "What does `javac` do?",
              answer:
                "It compiles `.java` source into `.class` files full of bytecode. Along the way it parses the code, resolves names and does all the type checking, so most errors show up at this point, not when the app runs.\n\nThe flag I use most is `--release`. When I compiled the same class with `--release 17` and without it, `javap -v` showed major version 61 versus 65, so I can target an older runtime from a newer JDK.",
            },
            {
              question: "What does the `jar` tool do?",
              answer:
                "It packages class files and resources into a single `.jar` file, which is a ZIP with a `META-INF/MANIFEST.MF` inside. If the manifest has a `Main-Class` entry, you can run it with `java -jar`.\n\nWhen I built one with `--main-class HelloWorld` and ran `jar tf` on it, it was just `META-INF/`, the manifest and `HelloWorld.class`. In real projects Maven or Gradle does the packaging, but it's the same format underneath.",
            },
            {
              question: "What is `jshell`, and when was it introduced?",
              answer:
                "It's Java's REPL, added in Java 9. You type expressions or statements and see the result right away, without writing a class or a `main`.\n\nI mostly use it to check API behaviour quickly. If I type `\"JDK\".repeat(2)`, it just prints `$4 ==> \"JDKJDK\"`, and I don't need a whole compile and run cycle for that.",
            },
            {
              question: "Is Oracle JDK the only JDK distribution?",
              answer:
                "No, far from it. OpenJDK is the open-source project, and lots of vendors build and ship it: Eclipse Temurin, Amazon Corretto, Azul Zulu, Microsoft Build of OpenJDK, BellSoft Liberica, SapMachine, Red Hat. Oracle JDK is Oracle's own build of the same code.\n\nEven Linux distros build their own. `java -version` on my machine says \"Ubuntu\" in the build string, because it's Ubuntu's OpenJDK package.",
            },
            {
              question: "What environment variable typically points to your JDK installation?",
              answer:
                "`JAVA_HOME`. Maven, Gradle, IDEs and most scripts use it to find the JDK. But the shell uses `PATH` to decide which `java` and `javac` you get when you type them, and the two can disagree.\n\nOn my machine they actually did: `java` resolved to JDK 21 and `javac` to JDK 17. So when something's weird, I check `java -version`, `javac -version` and `echo $JAVA_HOME`, all three.",
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
              question: "What exactly does the JDK add on top of the runtime?",
              answer:
                "The tools for everything except just running code. Compiling with `javac`, packaging with `jar`, `jlink` and `jpackage`, inspecting with `javap` and `jdeps`, debugging with `jdb`, experimenting in `jshell`, generating docs with `javadoc`, and diagnosing live JVMs with `jcmd`, `jstat`, `jmap`, `jstack` and JFR.\n\nIt also adds modules the runtime doesn't need, like `jdk.compiler`, and the `jmods` folder that `jlink` builds custom runtimes from. That's why my JDK directory was 287 MB while a `java.base`-only runtime came out at 52 MB.",
            },
            {
              question: "Why did Oracle's JDK licensing changes push companies toward other OpenJDK builds?",
              answer:
                "Because starting with Oracle JDK 11 in 2018, and Java 8 updates from 2019, using Oracle JDK in production needed a paid subscription. Companies that had been using it for free suddenly had a compliance and cost problem.\n\nThe OpenJDK builds from Temurin, Corretto, Zulu and others are built from the same source and are free for production, so switching was easy. Oracle made JDK 17 and later free again under NFTC, but by then many teams had already standardized on another vendor.",
            },
            {
              question: "Name three OpenJDK-based distributions besides Oracle's.",
              answer:
                "Eclipse Temurin from Adoptium, Amazon Corretto, and Azul Zulu. I'd also add Microsoft Build of OpenJDK, BellSoft Liberica and SapMachine.\n\nThey're all built from OpenJDK and pass the Java SE compatibility tests. What differs is how long they support each version, what platforms and packaging they ship, and whether you can buy a support contract.",
            },
            {
              question: "What's the minimum a production server needs if it only runs pre-compiled Java code?",
              answer:
                "Just a runtime of the right version. That can be a vendor JRE build like `eclipse-temurin:21-jre`, or a custom runtime made with `jlink` that only has the modules the app uses.\n\nOne catch: a runtime-only image has no `jcmd` or `jstack`, so I'd think about how to get thread dumps and heap dumps before an incident, not during one.",
            },
            {
              question: "What's the minimum a developer machine needs to write and compile Java?",
              answer:
                "A JDK, because that's where `javac` is. Nothing else is strictly required. The JDK already includes the runtime, so there's no separate install for running what you compile.\n\nIn practice you also want a build tool like Maven or Gradle and an IDE, but those sit on top of the JDK. It's best if the JDK version matches what production runs, or at least compile with `--release` set to that version.",
            },
            {
              question: "What's the difference between `java HelloWorld` and `java HelloWorld.java`?",
              answer:
                "`java HelloWorld` runs an already compiled class, `HelloWorld.class`, from the class path. `java HelloWorld.java` is source-file mode from Java 11: the launcher compiles the file in memory and runs it, and no `.class` file ever gets written to disk.\n\nI saw that source mode loads the class through an in-memory class loader instead of the normal application class loader. It's great for quick scripts. On Java 21 it's limited to a single file; Java 22 extended it to programs spread over several source files.",
            },
            {
              question: "What is `jlink`, and does it come with the JDK or the runtime?",
              answer:
                "It's a JDK tool from Java 9 that builds a custom runtime image containing only the modules you list. It works from the JDK's `jmods`, so it's only in the JDK.\n\nI tried it with `--add-modules java.base` for a Hello World. The runtime was 52 MB instead of the full 287 MB, and it ran the class fine. `jdeps --print-module-deps` is how I'd figure out which modules a real app needs.",
            },
            {
              question: "Why would a company standardize on one JDK vendor across all its teams?",
              answer:
                "Mostly so there's one thing to manage. One license to check, one security update schedule to follow, one set of base images, and the same JVM behaviour in every service.\n\nIt also cuts down on debugging time. If every service runs \"Temurin 21\", a bug you find in one service is probably the same bug everywhere, and upgrading means changing one base image instead of chasing a dozen different setups.",
            },
            {
              question: "What's the difference between a JDK vendor and a JDK version?",
              answer:
                "They're two separate choices. The version is the Java feature release, like 17, 21 or 25. It decides the language features and APIs. The vendor is who built and supports the binary, like Oracle, Eclipse Temurin, Amazon Corretto or Ubuntu.\n\nSo \"Corretto 21\" and \"Temurin 21\" are the same Java with different builders. My own `java -version` shows both parts: version `21.0.12.1`, and \"Ubuntu\" in the build string.",
            },
            {
              question: "How does GraalVM's AOT compilation differ from the standard JIT model?",
              answer:
                "HotSpot starts by interpreting bytecode and JIT-compiles the hot code while the app runs, using the profiling it collects. GraalVM Native Image compiles the whole app ahead of time into a native executable, so there's no warm-up and startup is in milliseconds.\n\nThe catch is that Native Image assumes it can see all the code at build time. Reflection, dynamic proxies and runtime class loading need extra configuration. Peak throughput can also be lower than a fully warmed-up JIT, although profile-guided builds narrow that gap.",
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
              question: "Trace the toolchain from source code to a running production service, naming which component handles each step.",
              answer:
                "On the build side, `javac` from the JDK compiles the source, usually driven by Maven or Gradle, and `jar` or the build plugin packages it. For Spring Boot that's a fat JAR. A container build copies that JAR into a runtime-only image.\n\nIn production, the `java` launcher from the runtime starts a JVM. The bootstrap, platform and application class loaders load the classes, the JVM links and verifies them, initializes them, and the interpreter and JIT execute them. The runtime's class libraries do the I/O and networking underneath. The JDK's job basically ends at the JAR.",
            },
            {
              question: "Why does the layered JDK ⊃ JRE ⊃ JVM model make sense from a separation-of-concerns point of view?",
              answer:
                "Each layer has one job. The JVM executes bytecode and manages memory, the runtime adds the libraries programs need, and the JDK adds tools that only developers and build machines need.\n\nThat means production doesn't have to carry a compiler it'll never use, and the JVM can evolve its GC or JIT without touching the tools. The module system made the split more concrete. `jlink` can cut a runtime down to only the modules an app actually uses.",
            },
            {
              question: "How do JDK requirements differ between the build stage and the run stage of a CI/CD pipeline?",
              answer:
                "The build stage needs a full JDK. It runs `javac`, tests, often `javadoc` and `jar`. The run stage only needs a runtime of the same version or newer than the bytecode target.\n\nThe thing I'd make sure of is that the two are pinned together. If CI builds with 21 and production runs 17, you get `UnsupportedClassVersionError`. I've reproduced that exact error: \"class file version 65.0\" versus \"up to 61.0\". Setting `--release` in the build makes it explicit.",
            },
            {
              question: "Explain Oracle JDK vs OpenJDK licensing well enough to advise a company on which to use.",
              answer:
                "The code is the same. The license and the update policy are what differ. Oracle JDK 17 and later is under NFTC, so it's free in production, but only until a year after the next LTS. After that, updates for that version need a paid Java SE subscription. Oracle's own OpenJDK builds on jdk.java.net are GPL with the Classpath Exception, but they only get updates for six months.\n\nFor a company that wants free and long-term, I'd suggest a vendor like Temurin or Corretto, which ship LTS updates for years at no cost. If they need a support contract, Oracle, Azul, Red Hat and others sell one. I'd also have legal read the current terms, because they have changed more than once.",
            },
            {
              question: "Why might a team choose GraalVM Native Image for a serverless Java deployment?",
              answer:
                "Because on serverless you pay for cold starts on every scale-up, and a normal JVM spends its first seconds loading classes and running interpreted code. A native image starts in milliseconds with a much smaller memory footprint, so both latency and cost go down.\n\nWhat you give up is peak JIT performance and some flexibility. Every reflective call has to be known at build time, and builds get slower. For a long-running service that stays warm, I'd stay on HotSpot. The JDK 24 and 25 AOT cache work is also worth a look before switching.",
            },
            {
              question: "What security and compliance reasons lead an enterprise to use one JDK vendor and version across hundreds of microservices?",
              answer:
                "Patching is the big one. When a Java CVE comes out, you want one base image to update and a clear answer to \"are we exposed?\". With five vendors and six versions, you're checking a matrix of combinations.\n\nThere's also licensing compliance, so nobody accidentally runs a build that needs a paid subscription. Audits get simpler too: you can point to one supported JDK and its update schedule.",
            },
            {
              question: "How does `jlink` change the old \"ship a full JDK or JRE\" deployment assumption?",
              answer:
                "Before Java 9 you shipped the whole JRE whether your app used Swing, CORBA and XML or not. `jlink` lets you build a runtime with only the modules your app needs, so the runtime becomes part of your build output instead of a fixed download.\n\nThe result is smaller images and less unused code sitting there. My `java.base`-only runtime was 52 MB against 287 MB for the full JDK. The trade-off is that you rebuild the image whenever you add a dependency on a new module, and a trimmed runtime has no diagnostic tools unless you add them.",
            },
            {
              question: "What are the trade-offs of `jshell` versus writing a full `.java` file?",
              answer:
                "`jshell` is great for fast feedback, like checking what an API returns or trying a stream pipeline. There's no class, no `main`, and results print right away with names like `$3`.\n\nIt's not for anything I want to keep. There are no tests, no version control, and it's awkward for multi-class code. For small but real programs I'd use a normal `.java` file, or `java File.java` if it's a one-off script.",
            },
            {
              question: "Why is the `java` launcher in every runtime, while `javac` is only in the JDK?",
              answer:
                "Because a runtime's whole job is running bytecode, and the launcher is how you start a JVM. Without it the runtime isn't usable. Compiling is a separate need. Production servers and end users run code that someone else already compiled, so they don't need `javac`.\n\nUnder the hood `javac` is just a front end to the `jdk.compiler` module. That module is left out of runtimes, and that's what makes it JDK-only.",
            },
            {
              question: "You inherit a legacy production system running an unknown JDK. How would you identify it, and why does it matter?",
              answer:
                "I'd run `java -version` with the same binary the service uses, or `jcmd <pid> VM.version` against the running process. I'd also check `java -XshowSettings:properties -version` for `java.vendor` and `java.home`, and look at the start script or Dockerfile to see which binary actually gets used.\n\nIt matters for three reasons: whether it's still getting security updates, whether its license needs a subscription, and what version you can safely upgrade to. With `javap -v` on the app's classes you can also see which bytecode version it was built for.",
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
              question: "A teammate installs only a JRE on their laptop and runs `javac MyFile.java`. What happens?",
              answer:
                "The shell says `javac` isn't found, because a runtime-only install doesn't have the compiler. If they have some other JDK on the `PATH`, `javac` might run from there instead, which is worse because it's confusing.\n\nThe fix is to install a JDK of the version the project uses, ideally through SDKMAN! or the project's toolchain setup, and then check `javac -version` and `java -version` match.",
            },
            {
              question: "The CI server has a JDK, but the production server only has a runtime. Does that work?",
              answer:
                "Yes, and it's the normal setup. CI needs `javac` to build the JAR, production only needs to run it.\n\nThe condition is versions. Production's runtime has to be the same version as the bytecode target or newer. If CI builds with JDK 21 and no `--release`, a Java 17 production server refuses the classes with `UnsupportedClassVersionError`. So I'd set `--release` in the build and use the same major version on both sides.",
            },
            {
              question: "Legal flags Oracle JDK licensing costs for the production fleet. What do you propose?",
              answer:
                "I'd propose moving to a free OpenJDK build of the same version, like Eclipse Temurin or Amazon Corretto. It's the same codebase, it passes the same compatibility tests, and it's free in production with long-term updates.\n\nI'd roll it out like any infra change: swap the base image on one service, run the tests and a canary, compare latency and GC metrics, then roll out. If they need a support contract, several vendors sell one without Oracle's per-employee pricing.",
            },
            {
              question: "A new hire asks why our Dockerfile uses a JDK image for the build stage but a JRE or `jlink` image for the runtime stage. How do you explain it?",
              answer:
                "The build stage needs `javac` and Maven to produce the JAR. The runtime stage just runs that JAR, so it only needs a runtime. Multi-stage builds let us copy only the JAR into the final image.\n\nThat gives a smaller image that pulls faster, and nothing in production that can compile code or leak the source. The one downside I'd mention: without the JDK, `jcmd` and `jstack` aren't in the container, so we plan how to get thread dumps before we need them.",
            },
            {
              question: "Someone asks whether switching production from Oracle JDK to Temurin, Corretto or SapMachine will break their application. What do you tell them?",
              answer:
                "For the same Java version, almost certainly not. They're all built from OpenJDK and pass the same Java SE compatibility kit, so the same JAR behaves the same way.\n\nWhat I'd still check: any JVM flags that are vendor-specific, fonts or certificates the app relies on, and memory and GC defaults. Then I'd roll it out to one instance first and compare metrics before switching everything. The risky move is changing vendor and major version at the same time, so I'd do those separately.",
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
            "Run `javac -version`, `java -version` and `echo $JAVA_HOME`. Do all three point to the same JDK?",
            "List `$JAVA_HOME/bin` and find `javac`, `jar`, `javap`, `jshell`, `jlink` and `jcmd`.",
            "Compile `HelloWorld.java`, package it with `jar --create --file hello.jar --main-class HelloWorld HelloWorld.class`, and run `java -jar hello.jar`.",
            "Open `jshell` and evaluate `\"JDK\".repeat(2)`.",
            "Build a `java.base`-only runtime with `jlink`, run `HelloWorld` on it, and compare its size with the full JDK. Check that `rt/bin` has no `javac`.",
            "Bonus: start a program that sleeps, find it with `jps -l`, and run `jcmd <pid> VM.version` and `jcmd <pid> Thread.print`.",
          ],
        },
        {
          type: "paragraph",
          text: "Expected: `java -jar hello.jar` prints `Hello, World!`, `jshell` prints `$1 ==> \"JDKJDK\"`, and the `jlink` runtime runs the same class with only `java` and `keytool` in its `bin/`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `JDK      runtime + dev tools              build + run
RUNTIME  JVM + class libraries + java     run only
         (standalone JRE gone since Java 11; jlink builds one)
MODEL    JDK  ⊃  runtime (JRE)  ⊃  JVM

BUILD    javac  jar  javadoc  jshell (9)
INSPECT  javap  jdb  jdeps
SHIP     jlink (9)  jpackage (16)
MONITOR  jps  jcmd  jstat  jmap  jstack  jfr  jconsole
SHARED   java launcher is in every runtime

RULE     compile?        -> JDK
         only run bytecode -> runtime (same version or newer)

VENDOR   Oracle, Temurin, Corretto, Zulu, Microsoft,
         Liberica, SapMachine, distro builds
VERSION  8, 11, 17, 21, 25 (LTS line)
LICENSE  Oracle JDK 17+: NFTC, free until 1 year after
         next LTS; OpenJDK builds free for production`,
          caption: "The one-screen version I'd want the night before an interview.",
        },
        {
          type: "list",
          items: [
            "Always say it in this order: the JDK contains the runtime, the runtime contains the JVM. Never the reverse.",
            "Vendor and version are separate choices. Check both with `java -version`.",
            "Build with a JDK, ship the smallest runtime that works, and pin the version so the two match.",
          ],
        },
      ],
    },
  ],
};
