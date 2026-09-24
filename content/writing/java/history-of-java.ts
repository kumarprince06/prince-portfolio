import type { Lesson } from "../types";

export const historyOfJava: Lesson = {
  slug: "history-of-java",
  date: "2026-07-17",
  title: "History of Java",
  description:
    "How Java went from a failed set-top-box project to the default language for enterprise backends, why generics, lambdas and virtual threads arrived when they did, and what the LTS train from 8 to 25 means for the code I ship.",
  tags: ["Core Java", "Java Versions", "LTS", "OpenJDK", "Fundamentals"],
  sections: [
    {
      title: "Why the History Matters",
      blocks: [
        {
          type: "paragraph",
          text: "The first lesson covered what Java is and touched on why it was created. This one follows the timeline properly: from a consumer-electronics project that went nowhere to one of the most widely used backend languages there is, and why specific features landed in specific releases.",
        },
        {
          type: "paragraph",
          text: "I care about this as a backend engineer because most of the \"modern Java\" I write, like generics, lambdas, streams, `var`, records and virtual threads, only exists because of decisions made along this timeline. Knowing when and why something was added explains why it's shaped the way it is. Generics are a good example: they arrived in Java 5, nine years in, and had to stay compatible with all the untyped code already out there. That constraint is why Java generics use type erasure, and interviewers love asking about it.",
        },
      ],
    },
    {
      title: "Where Java Came From",
      blocks: [
        {
          type: "heading",
          text: "The origins (1991–1996)",
        },
        {
          type: "list",
          items: [
            "**1991:** Sun Microsystems starts the **Green Project**, a small team led by James Gosling with Mike Sheridan and Patrick Naughton. The goal was software for interactive television and consumer devices such as set-top boxes.",
            "They started in C++ and hit two walls. Compiled binaries were tied to one chip and OS, which is a nightmare when every device maker uses different hardware. And manual memory management caused crashes on devices that couldn't easily be rebooted or patched.",
            "Gosling designed a new language, **Oak**, named after a tree outside his office.",
            "Interactive TV failed commercially. The cable companies weren't buying, and the project nearly died.",
            "**1994–95:** the team saw that the web had exactly the problem they'd been solving for TVs: code had to run safely on lots of different, unknown machines, in this case visitors' browsers. They pointed Oak at the web.",
            "**1995:** Oak was already a trademark, so the language was renamed **Java** and announced publicly that May. Netscape licensed it, and Netscape Navigator 2.0 could run Java **applets** inside the browser. That is what drove Java's first explosion in popularity.",
            "**January 1996:** JDK 1.0 ships, under the slogan \"Write Once, Run Anywhere\".",
          ],
        },
        {
          type: "heading",
          text: "Growth and the enterprise era (1997–2002)",
        },
        {
          type: "list",
          items: [
            "**JDK 1.1 (1997):** inner classes, JavaBeans, JDBC for database access, RMI for remote method calls, and reflection.",
            "**J2SE 1.2 (1998):** branded \"Java 2\", and a big one. It brought the **Collections Framework** (`List`, `Set`, `Map`), Swing, and a JIT compiler as standard. Before Collections, everyone used `Vector`, `Hashtable` and arrays in their own inconsistent ways. A single framework mattered a lot once codebases got large. Around this time Sun also split the platform into editions: J2SE (standard), J2EE (enterprise) and J2ME (micro).",
            "**J2SE 1.3 (2000):** the HotSpot JVM became the default, which is still the JVM in OpenJDK today.",
            "**J2SE 1.4 (2002):** the `assert` keyword, regular expressions, exception chaining, a logging API and **NIO** (New I/O). The original `java.io` model was blocking and stream-based, with one thread per connection. NIO added buffers, channels and selectors, so one thread could watch many connections. That mattered for high-throughput servers. 1.4 was also the first release developed through the Java Community Process (JSR 59).",
          ],
        },
        {
          type: "heading",
          text: "The big language overhaul: J2SE 5.0 (2004)",
        },
        {
          type: "paragraph",
          text: "Sun changed the version scheme here, calling 1.5 \"5.0\" to signal how large the release was. Internally it was still 1.5. It's arguably the most important release before Java 8:",
        },
        {
          type: "list",
          items: [
            "**Generics:** `List<String>` instead of a raw `List`.",
            "**Enhanced `for` loop:** `for (String s : list)`.",
            "**Autoboxing and unboxing:** automatic conversion between `int` and `Integer`.",
            "**Enums** as a real language feature.",
            "**Varargs:** `format(String pattern, Object... args)`.",
            "**Annotations:** `@Override`, `@Deprecated` and custom ones, which Spring and Hibernate later built everything on.",
            "**Static imports.**",
            "**`java.util.concurrent`:** executors, `ConcurrentHashMap`, locks and atomics, plus a revised Java Memory Model (JSR 133) that finally made `volatile` and `final` semantics precise.",
          ],
        },
        {
          type: "paragraph",
          text: "Generics were the headline. Before Java 5 a `List` held any `Object`, and pulling the wrong type out threw a `ClassCastException` at runtime, sometimes far away from the line that put it in. Generics moved that check to compile time. I show both versions in the examples section, because seeing the same bug go from a runtime crash to a compile error is what made it click for me.",
        },
        {
          type: "heading",
          text: "Renames, open source and Oracle (2006–2011)",
        },
        {
          type: "list",
          items: [
            "**Java SE 6 (2006):** the \"2\" and the \".0\" were dropped, so J2SE became **Java SE**. Mostly performance and tooling work, plus a scripting API (JSR 223).",
            "**2006–2007:** Sun open-sourced Java as **OpenJDK** under the GPL (with the Classpath Exception).",
            "**2009–2010:** Oracle agreed to buy Sun in 2009 and completed the deal in January 2010. Stewardship of Java moved to Oracle, and a lot of the community worried a commercial-first company would slow down Java's open evolution.",
            "**Java SE 7 (2011):** the first release under Oracle. Project Coin added try-with-resources, the diamond operator (`<>`), `switch` on strings and multi-catch. It also brought NIO.2 (`java.nio.file.Path` and `Files`), the fork/join framework, and the `invokedynamic` bytecode instruction that Java 8 lambdas are built on.",
          ],
        },
        {
          type: "heading",
          text: "The functional era: Java 8 (2014)",
        },
        {
          type: "paragraph",
          text: "Java 8 was the second big turning point after Java 5. It added:",
        },
        {
          type: "list",
          items: [
            "**Lambda expressions:** `(a, b) -> a + b`.",
            "**Streams API:** functional-style processing of collections.",
            "**Default methods** in interfaces, which is how `Collection` could gain `stream()` without breaking every existing implementation.",
            "**`java.time`:** a modern, immutable date and time API replacing the mutable, error-prone `Date` and `Calendar`.",
            "**`Optional<T>`.**",
            "Under the hood, HotSpot removed PermGen and replaced it with Metaspace.",
          ],
        },
        {
          type: "paragraph",
          text: "Java had fallen behind languages like Scala, C# and Python that already supported a functional style. Java 8 caught up without breaking backward compatibility, which is impressive given how much enterprise code depended on the old APIs. It also became the version the industry stood still on for years.",
        },
        {
          type: "heading",
          text: "Six-month releases and the LTS train (2017–today)",
        },
        {
          type: "paragraph",
          text: "Before 2017 a release shipped \"when it was ready\", which in practice meant a gap of two to five years, with big features holding everything else hostage. Java 9 slipped more than once while the module system was finished. In September 2017, alongside Java 9, Oracle announced a fixed schedule: a feature release every **March and September**, whatever is ready goes in, and the rest waits six months. **Java 10 (March 2018) was the first release on that cadence.** A **Long-Term Support** (LTS) release was designated every three years at first, then every two years from Java 17 on.",
        },
        {
          type: "table",
          headers: ["Release", "What I remember it for"],
          rows: [
            ["Java 9 (Sept 2017)", "Module system (Project Jigsaw), JShell, G1 as the default GC"],
            ["Java 10 (Mar 2018)", "`var` for local variables; the first six-month release"],
            ["**Java 11 (Sept 2018, LTS)**", "Standard HTTP Client, `var` in lambda parameters, `java File.java` single-file launch, Java EE and CORBA modules removed from the JDK"],
            ["Java 14–16", "Switch expressions (14), text blocks (15), records and pattern matching for `instanceof` (16)"],
            ["**Java 17 (Sept 2021, LTS)**", "Sealed classes; first LTS with records, text blocks and `instanceof` patterns; JDK internals strongly encapsulated"],
            ["**Java 21 (Sept 2023, LTS)**", "Virtual threads (Project Loom), record patterns, pattern matching for `switch`, sequenced collections, generational ZGC"],
            ["Java 24 (Mar 2025)", "Virtual threads no longer pin their carrier inside `synchronized`; Security Manager permanently disabled"],
            ["**Java 25 (Sept 2025, LTS)**", "Compact source files and instance `main` (JEP 512), scoped values (JEP 506), flexible constructor bodies (JEP 513), module import declarations (JEP 511), compact object headers as a product feature (JEP 519)"],
          ],
        },
        {
          type: "paragraph",
          text: "My own Java projects, RideX and Smart Dispatch, are built on Java 21 for the virtual threads and pattern matching. Java 25 is the newest LTS. Java 26 came out in March 2026 as a regular non-LTS release, and on the two-year rhythm the next LTS is planned for Java 29 in September 2027.",
        },
        {
          type: "callout",
          tone: "note",
          title: "Why LTS matters in practice",
          text: "Most companies don't upgrade every six months. They pick an LTS (8, 11, 17, 21 or 25) and stay on it for years, because vendors keep shipping security patches for LTS releases long after the next feature release is out. A non-LTS release gets Oracle updates only until the next one ships.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think about Java's history like the history of smartphones.",
        },
        {
          type: "list",
          items: [
            "**Oak (1991–95)** is the prototype built for a niche that flopped, interactive TV, whose underlying idea turned out to fit a far bigger market, the web. Plenty of successful products started as a failed first product.",
            "**Java 5 (2004)** is like the arrival of the app store. The platform didn't just work, it became structured and dependable enough to build large things on.",
            "**Java 8 (2014)** is like phones getting voice assistants: a new way of using the device, added to a mature platform without throwing away what came before.",
            "**The six-month cadence** is like a yearly phone launch. New models come out constantly, but a company equips its staff with a specific model (an LTS) and keeps it for years.",
          ],
        },
      ],
    },
    {
      title: "The Structural Facts",
      blocks: [
        {
          type: "table",
          headers: ["Concept", "What it means"],
          rows: [
            [
              "Version names",
              "1.0 → 1.1 → 1.2 → 1.3 → 1.4 → \"5.0\" (a rename of 1.5) → 6 → 7 → 8 → 9 and onward. Up to Java 8 the internal version still used the old scheme, so Java 8 reports itself as `1.8.0_xxx`, which is why old `pom.xml` files say `<source>1.8</source>`. Java 9 dropped the `1.` prefix (JEP 223), and Java 10 switched to time-based numbers like `21.0.4` (JEP 322).",
            ],
            [
              "LTS vs non-LTS",
              "LTS releases (8, 11, 17, 21, 25) get years of security and bug-fix updates. Non-LTS releases (9, 10, 12–16, 18–20, 22–24, 26) get Oracle updates for six months, until the next release. They're how new features reach people early, not what I'd run in production for years.",
            ],
            [
              "JCP and JEPs",
              "The Java Community Process (since 1998) governs the Java SE specification through JSRs, with an expert group and an executive committee that includes companies besides Oracle. Today individual features are proposed and built in OpenJDK as **JEPs** (JDK Enhancement Proposals, since 2011). Each release's platform specification is then ratified through one umbrella JSR, for example JSR 396 for Java SE 21.",
            ],
            [
              "OpenJDK",
              "The open-source reference implementation of Java SE, and where Java is actually developed. Oracle JDK is built from it, and so are Eclipse Temurin, Amazon Corretto, Azul Zulu, Microsoft's build, Red Hat's build and others. They all pass the same compatibility test kit (TCK), which is why they're interchangeable in practice.",
            ],
          ],
        },
        {
          type: "callout",
          tone: "tip",
          text: "When someone says \"Java 1.8\" and someone else says \"Java 8\", they mean the same release. From 9 on there is no \"1.\" at all: `java -version` on my machine prints `21.0.12.1`, not `1.21`.",
        },
      ],
    },
    {
      title: "How Java Evolves Under the Hood",
      blocks: [
        {
          type: "paragraph",
          text: "The timeline makes Java look like a list of dates. Underneath there's a fairly mechanical process: how a feature gets into the JDK, how a release is cut every six months, and how each release stamps its own version into the bytecode it produces. That last part is also what lets a 2014 class file run on a 2025 JVM.",
        },
        {
          type: "heading",
          text: "From idea to final feature: JEP, preview, final",
        },
        {
          type: "paragraph",
          text: "A language or JVM feature starts as a **JEP** in OpenJDK: a written proposal with the motivation, the design and the risks. Once it's targeted to a release and merged, it usually doesn't go straight to final. Language and VM features ship first as **preview features** (JEP 12): fully implemented, but switched off unless you pass `--enable-preview`. New APIs can instead ship as **incubator modules** (JEP 11), like `jdk.incubator.vector`. Feedback from real use then decides whether it's finalized, changed and previewed again, or dropped.",
        },
        {
          type: "diagram",
          text: `┌─────────────────────────┐
│ JEP drafted in OpenJDK  │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ targeted to release N   │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ preview in JDK N        │   off unless
│ class minor = 0xFFFF    │   --enable-preview
└────────────┬────────────┘
             │ feedback from real use
   ┌─────────┼──────────────┐
   ▼         ▼              ▼
   final     preview again  withdrawn
   in N+k    with changes`,
          caption:
            "Virtual threads previewed in 19 and 20 and went final in 21. String templates previewed in 21 and 22 and were then withdrawn.",
        },
        {
          type: "paragraph",
          text: "Preview features are enforced in the class file itself. When I compiled a Java 21 program that used unnamed variables (`for (String _ : drivers)`, a preview in 21 and final in 22), plain `javac --release 21` refused it: \"unnamed variables are a preview feature and are disabled by default\". With `--enable-preview` it compiled, and `javap -v` showed why the JVM would notice:",
        },
        {
          type: "output",
          text: `  minor version: 65535
  major version: 65`,
        },
        {
          type: "paragraph",
          text: "A minor version of `65535` (`0xFFFF`) marks a class that depends on preview features of exactly that release. Running it without the flag fails at load time, and `java --enable-preview Unnamed` runs it:",
        },
        {
          type: "output",
          text: `Error: LinkageError occurred while loading main class Unnamed
	java.lang.UnsupportedClassVersionError: Preview features are not enabled for Unnamed (class file version 65.65535). Try running with '--enable-preview'`,
        },
        {
          type: "paragraph",
          text: "That's a deliberate safety net. A preview class compiled for 21 won't even load on 22, because the preview might have changed, so nobody ends up with half-finished features baked into production JARs by accident.",
        },
        {
          type: "heading",
          text: "The release train",
        },
        {
          type: "paragraph",
          text: "Every six months the release follows the same schedule, defined in JEP 3:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Features are merged into the JDK mainline in OpenJDK whenever they're ready, not for a specific date.",
            "**Rampdown Phase One**, roughly three months before release: the release branch is forked from mainline and the feature set is frozen. Anything not merged waits for the next train.",
            "**Rampdown Phase Two**: only important bug fixes go in.",
            "**Release candidates**, then **general availability** in mid-March or mid-September. Java 25 went GA on 16 September 2025.",
            "After GA, the release gets quarterly update releases (January, April, July, October). For an LTS, vendors keep shipping those updates for years; for a non-LTS they stop when the next release ships.",
          ],
        },
        {
          type: "heading",
          text: "Every release stamps its version into the bytecode",
        },
        {
          type: "paragraph",
          text: "Every `.class` file starts with the magic number `0xCAFEBABE`, followed by a minor and a major version. `javac` writes the major version of the release it targets. I compiled the same `HelloVersion` class twice with the JDK 21 compiler, once with `--release 8` and once with `--release 21`:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 8 -Xlint:-options -d out8 HelloVersion.java
javac --release 21 -d out21 HelloVersion.java
javap -v out8/HelloVersion.class | grep -E "minor|major"
javap -v out21/HelloVersion.class | grep -E "minor|major"
xxd -l 8 out8/HelloVersion.class
xxd -l 8 out21/HelloVersion.class`,
        },
        {
          type: "output",
          text: `  minor version: 0
  major version: 52
  minor version: 0
  major version: 65
00000000: cafe babe 0000 0034                      .......4
00000000: cafe babe 0000 0041                      .......A`,
        },
        {
          type: "paragraph",
          text: "The raw bytes say the same thing: `0x34` is 52 and `0x41` is 65. And `java -cp out8 HelloVersion` on the JDK 21 runtime prints `Running on Java 21.0.12.1` without complaint. The Java 8 class runs fine on a Java 21 JVM.",
        },
        {
          type: "heading",
          text: "Why old class files still run",
        },
        {
          type: "paragraph",
          text: "When the JVM loads a class, it parses that header before anything else:",
        },
        {
          type: "list",
          items: [
            "Major version **equal to or lower** than what the JVM supports: the class loads. Every JVM accepts all older class file versions back to 45 (JDK 1.0/1.1). That's backward compatibility.",
            "Major version **higher** than the JVM supports, for example a Java 21 class on a Java 17 runtime: loading fails with `java.lang.UnsupportedClassVersionError`, a subclass of `ClassFormatError`.",
          ],
        },
        {
          type: "table",
          headers: ["Java version", "Class file major version"],
          rows: [
            ["1.0 / 1.1", "45"],
            ["1.4", "48"],
            ["5", "49"],
            ["6", "50"],
            ["7", "51"],
            ["8", "52"],
            ["11", "55"],
            ["17", "61"],
            ["21", "65"],
            ["25", "69"],
          ],
        },
        {
          type: "paragraph",
          text: "From Java 9 on the rule is simply major version = Java version + 44. So \"Write Once, Run Anywhere\" has a footnote: it really means run anywhere **on an equal or newer JVM**. Deploying something built with a newer JDK to a server with an older runtime is one of the most common Java deployment bugs there is.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Newer JVM doesn't always mean \"just works\"",
          text: "The class file will load, but the APIs it calls may be gone. Java 11 removed the Java EE modules, so an old Java 8 app that used `javax.xml.bind` (JAXB) without declaring it as a dependency fails with `NoClassDefFoundError` on 11. Java 17 blocked reflective access to JDK internals, which broke old libraries that relied on it. Bytecode compatibility is very strong; API compatibility is strong but not absolute.",
        },
      ],
    },
    {
      title: "The Timeline in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `1991 ┬ Green Project at Sun, language "Oak"
     │   aimed at set-top boxes; that market never came
1995 ┼ renamed Java, announced; applets in Netscape
1996 ┼ JDK 1.0   "Write Once, Run Anywhere"
     │
1997 ┼ JDK 1.1   inner classes, JDBC, RMI
1998 ┼ J2SE 1.2  Collections, Swing, JIT ("Java 2")
2000 ┼ J2SE 1.3  HotSpot becomes the default JVM
2002 ┼ J2SE 1.4  assert, regex, NIO; first JCP release
     │
2004 ┼ J2SE 5.0  generics, enums, annotations          ★
2006 ┼ Java 6    "J2SE" dropped; OpenJDK announced
2010 ┼ Oracle completes the acquisition of Sun
2011 ┼ Java 7    try-with-resources, diamond, NIO.2
     │
2014 ┼ Java 8    lambdas, streams, java.time           ★ LTS
2017 ┼ Java 9    modules, JShell; new cadence announced
2018 ┼ Java 10   var; first six-month release
2018 ┼ Java 11   HTTP Client, Java EE removed            LTS
2021 ┼ Java 17   sealed classes, records                 LTS
2023 ┼ Java 21   virtual threads, pattern matching     ★ LTS
     │           RideX and Smart Dispatch run here
2025 ┴ Java 25   compact source files, scoped values     LTS`,
          caption: "★ marks the releases that changed how everyday Java code is written.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Seeing a class file version mismatch",
        },
        {
          type: "paragraph",
          text: "To make the class file version concrete, I compiled a tiny class with JDK 21 and ran it on a JDK 17 runtime, which is exactly what happens when CI builds with a newer JDK than production runs.",
        },
        {
          type: "code",
          language: "java",
          title: "HelloVersion.java",
          code: `public class HelloVersion {
    public static void main(String[] args) {
        System.out.println("Running on Java " + System.getProperty("java.version"));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 21 HelloVersion.java    # JDK 21 compiler
javap -v HelloVersion.class | grep major
/usr/lib/jvm/java-17-openjdk-amd64/bin/java HelloVersion`,
        },
        {
          type: "output",
          text: `  major version: 65
Error: LinkageError occurred while loading main class HelloVersion
	java.lang.UnsupportedClassVersionError: HelloVersion has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 61.0`,
        },
        {
          type: "paragraph",
          text: "The two numbers in that message are the whole diagnosis: 65 is Java 21, 61 is Java 17. The fix is either to upgrade the runtime or to compile for the older target. Recompiling with `--release 17` gives major version 61, and the JDK 17 runtime prints `Running on Java 17.0.20.1`. An old Java 8 runtime prints the same error with \"up to 52.0\", after a misleading `Error: A JNI error has occurred` line.",
        },
        {
          type: "callout",
          tone: "tip",
          text: "Use `--release N` rather than `-source N -target N`. `--release` also compiles against the API of Java N, so you can't accidentally call a method that doesn't exist on the older runtime. `-source`/`-target` only set the language level and class file version.",
        },
        {
          type: "heading",
          text: "The same bug before and after generics",
        },
        {
          type: "paragraph",
          text: "Here's the pre-Java 5 style: a raw `List`, an `Iterator` and a cast on every read. Someone adds a `String` by mistake, and the compiler doesn't care.",
        },
        {
          type: "code",
          language: "java",
          title: "FareTotal.java (Java 1.4 style)",
          code: `import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class FareTotal {
    public static void main(String[] args) {
        List fares = new ArrayList();          // raw type: holds any Object
        fares.add(new Integer(120));
        fares.add(new Integer(80));
        fares.add("95");                       // compiles fine

        int total = 0;
        for (Iterator it = fares.iterator(); it.hasNext(); ) {
            Integer fare = (Integer) it.next(); // cast on every read
            total += fare.intValue();
        }
        System.out.println("Total: " + total);
    }
}`,
        },
        {
          type: "paragraph",
          text: "When I compiled it with `javac --release 8 -Xlint:-options`, all I got was a note about unchecked operations. The crash only came at runtime, on the line that reads the value, not the line that added it:",
        },
        {
          type: "output",
          text: `Note: FareTotal.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
Exception in thread "main" java.lang.ClassCastException: class java.lang.String cannot be cast to class java.lang.Integer (java.lang.String and java.lang.Integer are in module java.base of loader 'bootstrap')
	at FareTotal.main(FareTotal.java:14)`,
        },
        {
          type: "paragraph",
          text: "The Java 5 version uses generics, autoboxing and the enhanced `for` loop. The same mistake now fails at compile time, pointing at the exact line:",
        },
        {
          type: "code",
          language: "java",
          title: "FareTotal.java (Java 5 style)",
          code: `import java.util.ArrayList;
import java.util.List;

public class FareTotal {
    public static void main(String[] args) {
        List<Integer> fares = new ArrayList<Integer>();
        fares.add(120);                        // autoboxing
        fares.add(80);
        fares.add("95");                       // now a compile error

        int total = 0;
        for (int fare : fares) {               // enhanced for + unboxing
            total += fare;
        }
        System.out.println("Total: " + total);
    }
}`,
        },
        {
          type: "output",
          text: `FareTotal.java:9: error: incompatible types: String cannot be converted to Integer
        fares.add("95");                       // now a compile error
                  ^
Note: Some messages have been simplified; recompile with -Xdiags:verbose to get full output
1 error`,
        },
        {
          type: "heading",
          text: "One report, written in Java 8 and in Java 21",
        },
        {
          type: "paragraph",
          text: "Revenue per city from completed rides. The Java 8 version uses lambdas and streams. I compiled it with `--release 8` to be sure it runs on a real Java 8 runtime, so there's no `List.of` or `Stream.toList()`, which came in Java 9 and 16. `javap` confirmed major version 52.",
        },
        {
          type: "code",
          language: "java",
          title: "RideReport.java (Java 8)",
          code: `import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

public class RideReport {
    static class Ride {
        final String city;
        final int fare;
        final boolean completed;

        Ride(String city, int fare, boolean completed) {
            this.city = city;
            this.fare = fare;
            this.completed = completed;
        }
    }

    public static void main(String[] args) {
        List<Ride> rides = Arrays.asList(
                new Ride("Kolkata", 120, true),
                new Ride("Pune", 80, false),
                new Ride("Kolkata", 95, true),
                new Ride("Pune", 150, true));

        Map<String, Integer> revenueByCity = rides.stream()
                .filter(r -> r.completed)
                .collect(Collectors.groupingBy(r -> r.city, TreeMap::new,
                        Collectors.summingInt(r -> r.fare)));

        System.out.println(revenueByCity);
    }
}`,
        },
        {
          type: "output",
          text: "{Kolkata=215, Pune=150}",
        },
        {
          type: "paragraph",
          text: "The Java 21 version models a ride as a sealed interface with two records. The `switch` uses a record pattern and a type pattern, and because the interface is sealed, the compiler knows the two cases are exhaustive, so there's no `default`. The boilerplate class with its constructor is gone.",
        },
        {
          type: "code",
          language: "java",
          title: "RideReport.java (Java 21)",
          code: `import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

public class RideReport {
    sealed interface Ride permits Completed, Cancelled {
        String city();
    }
    record Completed(String city, int fare) implements Ride {}
    record Cancelled(String city, String reason) implements Ride {}

    static int revenue(Ride ride) {
        return switch (ride) {                 // exhaustive: no default needed
            case Completed(String city, int fare) -> fare;
            case Cancelled cancelled -> 0;
        };
    }

    public static void main(String[] args) {
        List<Ride> rides = List.of(
                new Completed("Kolkata", 120),
                new Cancelled("Pune", "rider no-show"),
                new Completed("Kolkata", 95),
                new Completed("Pune", 150));

        Map<String, Integer> revenueByCity = rides.stream()
                .collect(Collectors.groupingBy(Ride::city, TreeMap::new,
                        Collectors.summingInt(RideReport::revenue)));

        System.out.println(revenueByCity);
    }
}`,
        },
        {
          type: "output",
          text: "{Kolkata=215, Pune=150}",
        },
        {
          type: "paragraph",
          text: "Same output. Compiling this one with `--release 17` fails with \"patterns in switch statements are not supported in -source 17\", which is a nice reminder that pattern matching for `switch` was only a preview until 21.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "list",
          items: [
            "**Assuming version numbers are a clean sequence.** The jump from 1.4 to 5.0 is a rename of 1.5, not skipped versions, and Java 8 still calls itself `1.8` internally. It confuses newcomers and anyone reading older documentation.",
            "**Mixing up the old and new edition names.** J2SE, J2EE and J2ME became Java SE, Java EE and Java ME. Oracle then handed Java EE to the Eclipse Foundation in 2017, where it was renamed **Jakarta EE**. From Jakarta EE 9 the packages moved from `javax.*` to `jakarta.*`, which is why upgrading to Spring Boot 3 means rewriting imports like `javax.persistence` to `jakarta.persistence`.",
            "**Assuming companies run the newest Java.** Most production systems run an LTS, often one or two behind the latest, and plenty of Java 8 and 11 is still out there.",
            "**Thinking Oracle develops Java alone.** Oracle leads OpenJDK and does most of the work, but Red Hat, SAP, Amazon, Microsoft, Google, Azul, IBM and others contribute code, and the specification goes through the JCP.",
            "**Saying the six-month cadence started with Java 9.** It was announced when Java 9 shipped in September 2017. Java 10, in March 2018, was the first release on the new schedule.",
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
            "For a new production service in 2026 I'd default to a recent LTS: **Java 21** or **Java 25**. Java 25 is the newest, and 21 is the conservative choice if a library or the deployment platform hasn't caught up. **Java 17** is the floor for anything modern, since Spring Boot 3 and Spring Boot 4 both require it.",
            "Check the minimum and supported Java versions of the main frameworks and libraries before picking a JDK. Spring Boot 2.x ran on Java 8, but Spring Boot 3 and 4 need 17+, and the Jakarta namespace change comes along with that upgrade.",
            "Pin the same Java version everywhere: the local JDK, the CI build (`--release` or Maven's `maven.compiler.release`), the Docker base image and production. Mismatches cause the `UnsupportedClassVersionError` shown above.",
            "Pick a distribution deliberately (Temurin, Corretto, Zulu, Oracle JDK and so on) based on who provides updates and support for the LTS you're on, and track its patch releases. An LTS only helps if you actually apply its quarterly security updates.",
          ],
        },
      ],
    },
    {
      title: "Performance Across Versions",
      blocks: [
        {
          type: "list",
          items: [
            "Upgrading the JDK is often free performance. Each release improves the JIT, the garbage collectors and the core libraries, so the same bytecode usually runs better on a newer JVM without code changes.",
            "**Garbage collectors:** G1 became the default in Java 9. ZGC and Shenandoah, both low-pause collectors, arrived as experimental in 11 and 12 and became production-ready in Java 15. Java 21 added generational ZGC, which became ZGC's only mode in Java 24. Java 25 made generational Shenandoah a product feature too.",
            "**Compact object headers** (Java 25, JEP 519, opt-in with `-XX:+UseCompactObjectHeaders`) shrink object headers on 64-bit HotSpot from 12 bytes to 8, which reduces heap usage for services that allocate lots of small objects.",
            "**Virtual threads** (Java 21) are the biggest shift for backend services. They're lightweight threads managed by the JVM, so a blocking call like a database query or HTTP request no longer ties up an OS thread. That lets a server handle far more concurrent blocking requests than a fixed thread pool, while keeping plain, sequential code.",
          ],
        },
        {
          type: "paragraph",
          text: "This small test is what convinced me. It submits 10,000 tasks that each block for one second:",
        },
        {
          type: "code",
          language: "java",
          title: "VirtualThreads.java (Java 21)",
          code: `import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;

public class VirtualThreads {
    public static void main(String[] args) {
        long start = System.nanoTime();
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            IntStream.range(0, 10_000).forEach(i ->
                    executor.submit(() -> {
                        Thread.sleep(Duration.ofSeconds(1)); // simulated blocking I/O call
                        return i;
                    }));
        } // close() waits for all tasks
        long ms = Duration.ofNanos(System.nanoTime() - start).toMillis();
        System.out.println("10,000 blocking tasks finished in about " + (ms / 100) * 100 + " ms");
    }
}`,
        },
        {
          type: "output",
          text: "10,000 blocking tasks finished in about 1000 ms",
        },
        {
          type: "paragraph",
          text: "On my machine it finished in roughly one to 1.1 seconds across runs. The same work on a fixed pool of 200 platform threads needs 50 rounds of one second each, so about 50 seconds. Virtual threads don't make CPU-bound code faster, though. They help when threads spend most of their time waiting.",
        },
      ],
    },
    {
      title: "Where This Shows Up in Production",
      blocks: [
        {
          type: "list",
          items: [
            "Large backends such as banking cores, e-commerce platforms and ride-hailing and dispatch systems run on LTS releases. Java 8, 11 and 17 are all still common, and adoption of 21 has grown quickly because of virtual threads. Upgrades tend to happen when a framework raises its baseline (Spring Boot 3 forcing Java 17 is a big one) or when the old LTS runs out of support.",
            "Netflix has written publicly about moving its services to newer LTS releases for the GC and throughput gains, and about running into a deadlock with virtual threads pinned inside `synchronized` blocks on Java 21. That's exactly the problem Java 24 (JEP 491) fixed, and a good real-world example of why teams test an LTS before rolling it everywhere.",
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
              question: "Who created Java, and when?",
              answer:
                "James Gosling, with a small team at Sun Microsystems. The work started in 1991 as the Green Project. Sun announced Java publicly in 1995 and shipped JDK 1.0 in January 1996, so depending on what you count, 1991 or 1995 are both fair answers. I'd mention both.",
            },
            {
              question: "What was Java originally called?",
              answer:
                "Oak. Gosling named it after an oak tree outside his office. When they went to release it, Oak was already a trademark held by another company, so it was renamed Java, after the coffee.",
            },
            {
              question: "What was the original purpose of the Green Project?",
              answer:
                "Software for consumer electronics, mainly interactive TV and set-top boxes. The team wanted one language that could run on all sorts of different chips without being rewritten, and that wouldn't crash devices through memory bugs. The TV market didn't take off, but those exact goals turned out to be what the web needed.",
            },
            {
              question: "When was Java 1.0 released?",
              answer:
                "JDK 1.0 shipped in January 1996. Java was announced in May 1995, which is why you'll see 1995 in a lot of places, but the first official release was 1996.",
            },
            {
              question: "Which company acquired Sun Microsystems, and when?",
              answer:
                "Oracle. The deal was announced in 2009 and completed in January 2010. Since then Oracle has led Java's development, though the actual work happens in the open in OpenJDK with several other companies contributing.",
            },
            {
              question: "What does LTS mean for Java versions?",
              answer:
                "Long-Term Support. An LTS release gets security and bug-fix updates for years, while a regular feature release is only updated until the next one comes out six months later. The LTS releases so far are 8, 11, 17, 21 and 25. When I pick a version for a real service, it's always one of those.",
            },
            {
              question: "Which Java version introduced generics?",
              answer:
                "J2SE 5.0, released in 2004. Internally it was version 1.5. The same release also brought enums, annotations, autoboxing, varargs, the enhanced `for` loop and `java.util.concurrent`.",
            },
            {
              question: "Which Java version introduced lambdas and streams?",
              answer:
                "Java 8, in March 2014. It also added default methods in interfaces, `java.time` and `Optional`. It was such a big release that a lot of companies stayed on it for close to a decade.",
            },
            {
              question: "What is OpenJDK?",
              answer:
                "It's the open-source reference implementation of the Java SE platform, and the place where Java is actually developed. Oracle JDK, Temurin, Corretto, Zulu and the other distributions are all built from the OpenJDK source. On my machine `java -version` says \"OpenJDK Runtime Environment\", and it's the same HotSpot JVM that's inside Oracle's build.",
            },
            {
              question: "How often are new Java versions released?",
              answer:
                "Every six months, in March and September. An LTS comes out every two years, in September: 17 in 2021, 21 in 2023, 25 in 2025. The latest feature release right now is Java 26 from March 2026.",
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
              question: "Why did Sun pivot Java from embedded devices to the web?",
              answer:
                "Because the TV business failed, and the web turned out to have the same problem they'd designed for. A browser downloads code from a server and has to run it safely on whatever machine the visitor has, which is exactly \"run on unknown hardware without crashing it\". Netscape licensing Java for applets in Navigator gave them instant reach.",
            },
            {
              question: "Why was J2SE 5.0 such a major release?",
              answer:
                "It changed the language itself more than any release before it. Generics, enums, annotations, autoboxing, varargs and the enhanced `for` loop all came at once, plus `java.util.concurrent` and a fixed memory model.\n\nAnnotations alone changed how Java is written, because Spring, Hibernate and JUnit are built on them. Sun even renamed it from 1.5 to 5.0 to signal the scale.",
            },
            {
              question: "What problem did generics solve?",
              answer:
                "Before Java 5 a collection held plain `Object`s, so the compiler couldn't stop you putting a `String` into a list of numbers. You'd find out at runtime with a `ClassCastException`, on the line that read the value, which might be far away from the bug.\n\nWhen I tried it with a raw `List`, `javac` only gave a note about unchecked operations and the program crashed at line 14. With `List<Integer>` the same mistake became a compile error on the `add` line. Generics also got rid of all the manual casts.",
            },
            {
              question: "Why did Java move from multi-year releases to a six-month cadence after Java 9?",
              answer:
                "Because the old model let one big feature hold the whole release hostage. Java 9 slipped more than once waiting for the module system, and finished features just sat there. With a fixed train every six months, whatever is ready ships and the rest catches the next one.\n\nIt was announced in September 2017 when Java 9 shipped. Java 10, in March 2018, was the first release on the new schedule.",
            },
            {
              question: "What's the practical difference between an LTS and a non-LTS release?",
              answer:
                "Support length. A non-LTS release like 22 or 24 gets Oracle updates for six months, and then you're expected to move to the next one. An LTS gets patches for years from Oracle and from vendors like Adoptium, Amazon and Azul.\n\nSo in production you'd run an LTS, and use non-LTS releases to try upcoming features early. Language-wise they're the same kind of release; the difference is how long someone keeps patching it.",
            },
            {
              question: "Why did the name change from J2SE to Java SE?",
              answer:
                "It was a branding cleanup with Java 6 in 2006. \"Java 2\" dated back to 1.2 in 1998 and had stopped meaning anything, so Sun dropped the \"2\" and the \".0\": J2SE 5.0 was followed by Java SE 6, and J2EE and J2ME became Java EE and Java ME.",
            },
            {
              question: "What is the Java Community Process, and why does it matter?",
              answer:
                "The JCP, set up in 1998, is the formal process for evolving the Java specifications through Java Specification Requests. It has an executive committee with members beyond Oracle, and it's what makes Java SE a standard rather than just one company's product.\n\nToday it works together with OpenJDK. Features are proposed and built as JEPs in OpenJDK, and each release's platform spec is ratified through one umbrella JSR, like JSR 396 for Java 21. That split is what lets several vendors ship compatible JDKs.",
            },
            {
              question: "What happened to Java EE, and what is it called now?",
              answer:
                "Oracle transferred Java EE to the Eclipse Foundation in 2017, and it was renamed Jakarta EE because Oracle kept the Java trademark. Starting with Jakarta EE 9 the packages moved from `javax.*` to `jakarta.*`.\n\nThat's the change you actually feel when moving to Spring Boot 3: every `javax.persistence` and `javax.servlet` import becomes `jakarta.persistence` and `jakarta.servlet`.",
            },
            {
              question: "Why do most companies stay on LTS versions?",
              answer:
                "Because upgrading has a cost and patches matter more than new features. Every Java upgrade means checking frameworks, libraries, build plugins and agents, then running the full test and load suite. Doing that every six months isn't worth it for most teams.\n\nAn LTS gives years of security fixes with a stable feature set, so teams move LTS to LTS, usually when a framework raises its baseline or the old version's support is ending.",
            },
            {
              question: "What did Java 21 add that matters for backend concurrency?",
              answer:
                "Virtual threads, from Project Loom (JEP 444). They're threads managed by the JVM instead of the OS, and they're cheap enough that you can create one per request or per task.\n\nWhen I submitted 10,000 tasks that each slept for a second to `Executors.newVirtualThreadPerTaskExecutor()`, the whole thing finished in about a second. A 200-thread pool would take around 50. The code stays plain and blocking, so you get the scalability without writing reactive code.",
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
              question: "How does bytecode versioning enable, and limit, backward compatibility?",
              answer:
                "Every class file carries a major version, 52 for Java 8, 61 for 17, 65 for 21. A JVM loads any class file up to its own version, so old bytecode keeps running on new JVMs. That's the enabling part.\n\nThe limit is the other direction: a newer class file on an older JVM fails at load time with `UnsupportedClassVersionError`. And even going forward, loading isn't everything. The class can load and then fail with `NoClassDefFoundError` because an API it used, like JAXB in Java 11, was removed from the JDK.",
            },
            {
              question: "Why was Java 8 a bigger shift than the releases around it?",
              answer:
                "Because it changed how everyday code is written, not just what the library offers. Lambdas and streams moved Java from pure imperative loops to a functional style, and default methods let the core interfaces evolve without breaking every implementation.\n\nJava 7 before it was mostly quality-of-life syntax, and Java 9 after it was mostly about modules, which most application code didn't touch directly. Java 8 affected every file people wrote.",
            },
            {
              question: "How do multiple OpenJDK distributions affect enterprise decisions?",
              answer:
                "They turn the JDK into a support-and-licensing choice rather than a technical one. Temurin, Corretto, Zulu, Oracle JDK and Microsoft's build all come from the same OpenJDK source and pass the TCK, so the code runs the same on any of them.\n\nWhat differs is the update policy, how long a vendor patches each LTS, and the license. Plenty of companies moved off Oracle JDK when free commercial updates for Oracle JDK 8 ended in 2019. Some pick Corretto because they're on AWS, others buy Azul or Red Hat support for long-tail patches.",
            },
            {
              question: "What challenge does keeping Java backward compatible for 30 years create?",
              answer:
                "Every new feature has to fit around old decisions. Generics are the classic case: they had to work with pre-Java-5 code, so they use type erasure. `List<String>` and `List<Integer>` are the same class at runtime, which is why you can't write `new T()` or check `instanceof List<String>`.\n\nThe same pressure explains why default methods exist and why deprecated APIs like `Thread.stop()` stayed around for decades. The team moves slowly and publishes deprecation warnings well before anything is actually removed.",
            },
            {
              question: "How do virtual threads differ from platform threads, and why does it matter?",
              answer:
                "A platform thread is a thin wrapper around an OS thread. It has a big fixed stack and is expensive to create, so you're limited to a few thousand and have to pool them. A virtual thread is scheduled by the JVM onto a small pool of carrier threads. When it blocks on I/O it unmounts, and its stack is saved on the heap until it can continue.\n\nFor a service that spends most of its time waiting on a database or other HTTP calls, the number of concurrent requests stops being limited by thread count. The catch in Java 21 was pinning: blocking inside `synchronized` held on to the carrier thread. Java 24 fixed that.",
            },
            {
              question: "Why might a company avoid adopting a new LTS right away?",
              answer:
                "Because the ecosystem needs time to catch up. Frameworks, bytecode-manipulating libraries, APM agents, build plugins and base images all need versions that support the new JDK. Early on some of them lag behind, and the first update releases fix real bugs.\n\nSo a common approach is to wait for the first few quarterly updates, run the load tests, and then roll out. The pinning problem with virtual threads on Java 21 is a good example of something teams only found in production.",
            },
            {
              question: "What did Java trade off by staying backward compatible instead of breaking things, like Python 2 to 3?",
              answer:
                "It gained trust. A company can move a large codebase to a new JDK and expect it to mostly just work, which is why banks were comfortable building on Java. Python 3 broke compatibility, and a lot of codebases took a decade to move.\n\nThe cost is that some old mistakes stay around. Erased generics, `null` everywhere, the old `Date` class and checked exceptions are all still in the language, and new features have to be designed around them instead of replacing them.",
            },
            {
              question: "How did Java's governance change from the early single-vendor years?",
              answer:
                "In the early years Sun decided what went into Java. The JCP arrived in 1998 and made the specification a multi-party process. Then open-sourcing Java as OpenJDK in 2006–2007 moved the actual development into the open.\n\nToday anyone can read the JEPs and mailing lists, and companies like Red Hat, SAP, Amazon and Microsoft contribute code. Oracle still does most of the work and leads the project, but it isn't a closed, single-vendor process anymore.",
            },
            {
              question: "Why does `UnsupportedClassVersionError` happen?",
              answer:
                "It happens when the JVM tries to load a class file whose major version is higher than it supports. When I compiled a class with JDK 21 and ran it on a Java 17 runtime, the message said \"class file version 65.0\" and \"only recognizes class file versions up to 61.0\". Those two numbers tell you exactly which JDK built the class and which one is running it.\n\nThe fix is to upgrade the runtime or compile with `--release` set to the runtime's version. For a library in a JAR, you can check with `javap -v` and look at the major version.",
            },
            {
              question: "Why is Project Loom considered as significant as the original JVM thread model?",
              answer:
                "Because it changes a basic assumption Java has had since 1.0, that a Java thread is an OS thread. That assumption is why servers used thread pools, why async frameworks and reactive libraries became popular, and why code ended up full of callbacks and `CompletableFuture` chains to avoid blocking.\n\nWith virtual threads, the simple thread-per-request style scales again. Existing blocking APIs like JDBC and `java.net.http` work as they are, so it's a new concurrency model that doesn't require rewriting code.",
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
              question: "CI compiles with JDK 21, but production runs Java 11. What happens?",
              answer:
                "The app fails to start with `UnsupportedClassVersionError`. The classes have major version 65, and a Java 11 runtime only accepts up to 55, so the launcher can't even load the main class.\n\nI'd fix it one of two ways. Either upgrade production to 21, which is the better long-term answer, or build with `--release 11` so the bytecode and the APIs match Java 11. Either way, I'd also add a check so CI and production can't drift apart again, like building and running from the same Docker base image.",
            },
            {
              question: "Your team is starting a new backend project today. Which Java version do you recommend?",
              answer:
                "Java 25 or Java 21, and I'd lean toward 25 unless something forces 21. Both are LTS, both have virtual threads, records and pattern matching, and Spring Boot 3 and 4 need at least 17 anyway, so there's no reason to start lower than that.\n\nThe things I'd check are whether every library and agent we depend on supports the version, what the hosting platform and base images offer, and which distribution will give us patches. RideX runs on Java 21, and if I started it now I'd seriously consider 25.",
            },
            {
              question: "A teammate says Java hasn't really changed since Java 8. How do you respond?",
              answer:
                "I'd point to the code. `var` came in 10, switch expressions and text blocks in 14 and 15, records in 16, sealed classes in 17, and pattern matching for `switch` plus record patterns in 21. My ride report example went from a class with a constructor and a filter to a sealed interface with two one-line records and an exhaustive `switch`.\n\nOn the runtime side there are virtual threads, generational ZGC and a much faster startup and footprint. Java 25 even lets you write `void main()` without a class. That's a different language from Java 8 in daily use.",
            },
            {
              question: "You maintain a Java 6 system and management wants to modernize it. Why isn't that trivial?",
              answer:
                "Because the risk isn't the language, it's everything around it. Old frameworks and libraries often don't support new JDKs, and upgrading them can pull in the `javax` to `jakarta` rename. Java 11 removed JAXB, JAX-WS and CORBA from the JDK, and Java 17 blocked the reflective access to JDK internals that old libraries relied on.\n\nThe build tools, app server and deployment scripts usually need upgrading too. I'd move in LTS steps, 6 to 8 to 11 to 17 and beyond, with the test suite green at each step, rather than jumping straight to 25.",
            },
            {
              question: "How would you explain to a non-technical manager why we can't always use the newest Java?",
              answer:
                "I'd say that Java works like a car model with long warranty editions. Every six months there's a new version, but only some get years of safety fixes, and those are what you want to run the business on. The others get six months.\n\nEach upgrade also needs time to check that all the tools and libraries still work and to test the whole system. So we upgrade on purpose, to supported versions, when the benefit is worth that testing time.",
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
            "Write `HelloVersion.java` from the examples and compile it with your newest JDK.",
            "Run `javap -v HelloVersion.class | grep major` and match the number to the table in this lesson.",
            "If you have an older JDK installed, run the class with it and read the `UnsupportedClassVersionError`. Then recompile with `--release` set to the older version and run it again.",
            "Compile the raw-type `FareTotal` and the generic one with `--release 8`, and note where each bug is caught.",
            "Bonus: compile the Java 21 `RideReport` with `--release 17` and read the error that tells you which feature is missing.",
          ],
        },
        {
          type: "paragraph",
          text: "Expected result for steps 2 and 3, on a JDK 21 compiler and a JDK 17 runtime:",
        },
        {
          type: "output",
          text: `  major version: 65
Error: LinkageError occurred while loading main class HelloVersion
	java.lang.UnsupportedClassVersionError: ... (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 61.0

(after javac --release 17)
Running on Java 17.0.20.1`,
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `1991  Green Project at Sun, "Oak", set-top boxes: failed
1995  renamed Java; 1996 JDK 1.0, applets, WORA
1998  J2SE 1.2    Collections Framework
2004  J2SE 5.0    generics, enums, annotations     ★
2010  Oracle completes the acquisition of Sun
2014  Java 8      lambdas, streams, java.time  ★  LTS
2017  six-month cadence announced; 10 (2018) first
2018  Java 11  LTS    2021  Java 17  LTS
2023  Java 21  LTS    virtual threads, patterns    ★
2025  Java 25  LTS    compact source, scoped values

TERMS  LTS      8, 11, 17, 21, 25 (every 2 years now)
       JEP      how a feature is proposed in OpenJDK
       JCP/JSR  how each release's spec is ratified
       OpenJDK  open-source reference implementation

BYTECODE  major = Java version + 44 (8 = 52, 21 = 65)
          old class on new JVM: fine
          new class on old JVM: UnsupportedClassVersionError`,
          caption: "The one-screen version I'd want the night before an interview.",
        },
        {
          type: "list",
          items: [
            "1.4 to 5.0 is a rename, not a skip, and Java 8 still reports itself as `1.8`.",
            "Never say Oracle develops Java alone. It leads OpenJDK, other vendors contribute, and the spec goes through the JCP.",
            "For new work in 2026: Java 21 or 25, never below 17.",
          ],
        },
      ],
    },
  ],
};
