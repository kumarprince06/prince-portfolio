import type { Lesson } from "../types";

export const javaModules: Lesson = {
  slug: "java-modules",
  date: "2026-11-13",
  title: "Java Modules (JPMS)",
  description:
    "What the Java Platform Module System adds on top of packages and access modifiers, from module-info directives (requires, transitive, static, exports, opens, uses and provides), readability and strong encapsulation, the module path versus the classpath and named, automatic and unnamed modules, down to the Module attribute in the class file, the boot layer, InaccessibleObjectException and the escape hatches, ServiceLoader plug-ins, jdeps and jlink, JDK 25's module imports, and a Jackson deserialisation failure fixed with a qualified opens.",
  tags: ["Core Java", "Modules", "JPMS", "Strong Encapsulation"],
  sections: [
    {
      title: "What Java Modules Are",
      blocks: [
        {
          type: "paragraph",
          text: "The Packages lesson grouped classes into namespaces, and the Access Modifiers lesson decided who can see a member. Both stop at the same wall: once a class is `public`, every class on the classpath can use it. A library with a `com.shop.internal` package full of public helper classes has no way to say \"these are mine, don't touch them\". Somebody will import them, and the next release that renames one breaks that somebody.",
        },
        {
          type: "paragraph",
          text: "A **module** is the layer above packages. It's a named group of packages with a descriptor, `module-info.java`, that states two things the classpath never could: which other modules it needs (`requires`), and which of its packages other modules may use (`exports`). Everything else is hidden, including public classes. The JVM enforces it at compile time, at link time and in reflection, which the JDK calls **strong encapsulation**.",
        },
        {
          type: "paragraph",
          text: "The other half is **reliable configuration**. With modules on the module path, a missing dependency or two copies of the same module stop the JVM before `main` runs, instead of surfacing as a `NoClassDefFoundError` an hour into production. I show both failure styles side by side below.",
        },
        {
          type: "paragraph",
          text: "This lesson goes from the directives in `module-info.java`, each with a multi-module project I compiled and ran, through the module path versus the classpath, reflection and `opens`, services, and the JDK's own tools (`jdeps`, `jlink`), down to what's in the class file and how the boot layer is built. It ends with a ride-hailing service where Jackson can't deserialise a fare quote until one `opens` line is added, and a `jlink` image of that service at a fraction of the JDK's size.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "For its first twenty years Java had exactly one way to assemble a program: a flat classpath of directories and JARs, searched in order. That gave three problems that grew with every release.",
        },
        {
          type: "list",
          items: [
            "**Public meant public to everyone.** A class shared between two of a library's own packages had to be `public`, which made it public to the world. There was no \"public inside this library only\".",
            "**Classpath problems were found at run time.** A missing JAR showed up as `NoClassDefFoundError` when a class was first used. Two versions of the same library on the classpath didn't fail at all: the first JAR that contained a class won, class by class, which is how \"JAR hell\" got its name.",
            "**The JDK itself was one block.** The whole class library sat in one `rt.jar`, and nothing stopped applications from calling its internals. Libraries called `sun.misc.Unsafe` and `sun.misc.BASE64Encoder` because they could, which made those internals impossible to change without breaking popular frameworks.",
          ],
        },
        {
          type: "paragraph",
          text: "There were attempts inside the JCP from the Java 7 era, JSR 277 (a module system) and JSR 294 (language support for modularity), and neither shipped. OSGi had offered modules on the JVM for years using class-loader tricks, but it lives outside the language and the JDK. Mark Reinhold started **Project Jigsaw** in 2008. It was meant for Java 7, was deferred to Java 8 in 2010 and then to Java 9 in 2012. Java 8 got an interim step, compact profiles (JEP 161), three fixed subsets of the platform. The specification, JSR 376, was voted down by the JCP Executive Committee in its first public review ballot in May 2017 and passed in a revised form in June, and Java 9 shipped in September 2017 with the module system.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 9 (2017)", "JEP 200 (the modular JDK), JEP 201 (modular source code), JEP 220 (modular run-time images), JEP 260 (encapsulate most internal APIs), JEP 261 (the module system), JEP 282 (`jlink`)", "The JDK became about 70 modules; `rt.jar` was replaced by the `lib/modules` image; `module-info.java`, the module path and `jlink` arrived"],
            ["Java 9 (2017)", "JEP 238 (multi-release JARs)", "One JAR can carry a `module-info.class` under `META-INF/versions/9` and still run on Java 8, which is how Jackson 2.x ships it"],
            ["Java 9 to 15", "`--illegal-access=permit` by default", "Classpath code could still reflect into JDK internals, with a warning on first use"],
            ["Java 11 (2018)", "JEP 320 removed the Java EE and CORBA modules", "`java.xml.bind` (JAXB) and friends became ordinary Maven dependencies"],
            ["Java 16 (2021)", "JEP 396, strong encapsulation of JDK internals by default", "`--illegal-access=deny` became the default"],
            ["Java 17 (2021)", "JEP 403, strong encapsulation without the switch", "`--illegal-access` was removed; only `--add-opens` and `--add-exports` open internals, apart from critical APIs like `sun.misc.Unsafe` in `jdk.unsupported`"],
            ["Java 24 (2025)", "JEP 493, linking run-time images without JMODs", "A JDK built with this option can run `jlink` without its `jmods` directory"],
            ["Java 25 (2025)", "JEP 511, module import declarations (previewed by JEP 476 in 23 and JEP 494 in 24)", "`import module java.sql;` imports every package a module exports"],
          ],
        },
        {
          type: "paragraph",
          text: "The Encapsulation lesson showed the JDK 16 and 17 change from the application side: `setAccessible(true)` on `String.value` throws `InaccessibleObjectException` unless the JVM is started with `--add-opens`. This lesson is about the machinery behind that message, and about using the same machinery for my own code.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The picture I use is an office park with several buildings, one per company, compared with the single open-plan warehouse everyone used to share.",
        },
        {
          type: "list",
          items: [
            "Each **building** is a module. Its name is on the front (the module name), and the board in the lobby is `module-info.java`.",
            "Each **floor** is a package. Offices on a floor can have open doors (public classes), but that only matters if visitors are allowed onto the floor at all.",
            "A floor with a **public reception** is an exported package. A **staff-only floor** is a package that isn't exported: its open office doors are irrelevant, because nobody from outside gets past the lift.",
            "A **visitor agreement** between two companies is `requires`. Staff from building A can only visit building B if A signed with B. That's readability.",
            "A **guest list for one partner** is `exports ... to`. The floor is open to one named company and closed to everybody else.",
            "When B's products always come with C's packaging, B's agreement covers C too, so A's staff can also visit C. That's `requires transitive`.",
            "An **inspector's pass** for one floor is `opens`. The inspector can walk into every office, including the locked ones, but only while the building is running, not while it's being designed. That's deep reflection at run time.",
            "A **staffing agency** that sends whoever is registered for a job is `ServiceLoader` with `uses` and `provides`.",
            "Building **only the buildings you need** on a new site is `jlink`.",
            "The old **warehouse** is the classpath: one big room, no doors, and when two teams put a desk with the same label on the floor, whoever got there first wins.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down. Whoever starts the JVM holds a master key: `--add-opens` and `--add-exports` on the command line override any building's rules, so modules are a design boundary, not a security sandbox against code in the same JVM. And inside one building, nothing changes: `private`, package-private and `protected` work exactly as the Access Modifiers lesson described. Modules only add the walls between buildings.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "What a module is",
        },
        {
          type: "paragraph",
          text: "A module is a named set of packages (plus resources and, optionally, native code) with a **module descriptor**. In source, the descriptor is `module-info.java` at the root of the module's source tree; `javac` compiles it to `module-info.class`. A modular JAR is an ordinary JAR with `module-info.class` at its root. The name is global, so the convention is the reverse-DNS name of the main package: `com.shop.core`, `java.sql`, `com.fasterxml.jackson.databind`.",
        },
        {
          type: "code",
          language: "java",
          code: `module com.shop.core {                       // name, optionally preceded by 'open'
    requires transitive com.shop.money;       // dependencies
    exports com.shop.core;                    // packages others may use
    exports com.shop.internal to com.shop.reports;
}`,
        },
        {
          type: "paragraph",
          text: "The words `module`, `requires`, `exports` and the rest aren't reserved keywords. The JLS calls them contextual keywords: they only mean something inside a module declaration, so old code with a variable named `module` still compiles.",
        },
        {
          type: "heading",
          text: "The directives",
        },
        {
          type: "table",
          headers: ["Directive", "Meaning", "Effect at compile time", "Effect at run time"],
          rows: [
            ["`requires M`", "I depend on M", "My code can use M's exported packages", "M must be present, or startup fails; my module reads M"],
            ["`requires transitive M`", "I depend on M, and so does anyone who reads me", "My readers can use M's exported packages without their own `requires`", "Readers of my module also read M"],
            ["`requires static M`", "I need M to compile, but it's optional at run time", "Same as `requires`", "M is not resolved because of this; if something else resolves it, I read it"],
            ["`exports P`", "Package P is API", "Every module that reads me can use P's public types", "Same, plus public reflection"],
            ["`exports P to M1, M2`", "P is API for these modules only", "Only M1 and M2 can use P", "Same"],
            ["`opens P`", "P allows deep reflection", "Nothing: `opens` alone doesn't make P compilable against", "`setAccessible(true)` works on every member of P, private ones included"],
            ["`opens P to M1, M2`", "Deep reflection for these modules only", "Nothing", "Only M1 and M2 can use `setAccessible(true)` in P"],
            ["`open module X`", "Every package is opened", "Nothing extra", "Like `opens` on every package; `opens` directives are then not allowed"],
            ["`uses S`", "I look up implementations of service S", "S must be accessible", "`ServiceLoader.load(S.class)` is allowed from my code"],
            ["`provides S with C`", "C is an implementation of S", "C must implement S and have a public no-arg constructor or a `public static provider()` method", "`ServiceLoader` finds C even if C's package isn't exported"],
          ],
        },
        {
          type: "paragraph",
          text: "Every module also reads `java.base` without saying so; `javac` records that as a `requires` flagged **mandated**, which `javap` shows below.",
        },
        {
          type: "heading",
          text: "Readability and accessibility",
        },
        {
          type: "paragraph",
          text: "Two words carry the whole system. Module A **reads** module B when A requires B, directly or through someone's `requires transitive`. A type in B is **accessible** to code in A when all three of these hold:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "A reads B.",
            "B exports the type's package, to everyone or to A by name.",
            "The type is `public`, and the member being used is `public` (or `protected`, under the usual subclass rules).",
          ],
        },
        {
          type: "paragraph",
          text: "Inside one module, only the third rule applies, as it always did. So the one-sentence version: since Java 9, `public` means public to the modules that read mine, and only for packages I export.",
        },
        {
          type: "image",
          src: "/images/java/java-modules-readability.svg",
          alt: "Three shop modules in a row. module com.shop.app (requires com.shop.core) has one package, com.shop.app, drawn with a closed door because it exports nothing. A requires arrow goes to module com.shop.core, whose package com.shop.core has an open door (exported to every reader) and whose package com.shop.internal has a closed door (shut to app, exported to reports only). A requires transitive arrow goes from core to module com.shop.money, whose package com.shop.money has an open door. A dashed arrow over the top says app reads money too (implied). Below, module com.shop.inspect, with Inspector.dump(customer) calling getDeclaredField(\"email\").setAccessible(true), sends a dashed deep-reflection arrow, run time only, to a window on package com.shop.customers in module com.shop.customers, which exports and opens the package to com.shop.inspect. A legend explains: an open door is exported, for compile and run time, public members only; a closed door is not exported, invisible even for its public classes; a window is opened, reflection including private members. At the bottom, a dashed box for the unnamed module, everything on the classpath, which reads every module, sees exported packages only, and can't be required by any named module.",
          caption: "Readability is the arrows; accessibility is the doors. A window lets reflection in at run time without making the package part of the API.",
        },
        {
          type: "heading",
          text: "Three kinds of module",
        },
        {
          type: "table",
          headers: ["", "Named (explicit)", "Automatic", "Unnamed"],
          rows: [
            ["What it is", "A JAR or directory with `module-info.class`, on the module path", "A plain JAR (no `module-info`) on the module path", "Everything on the classpath, together"],
            ["Name", "From `module-info`", "`Automatic-Module-Name` in the manifest, else derived from the file name", "None; one per class loader"],
            ["Reads", "Only what it requires (plus `java.base`)", "Every module, including the unnamed module", "Every module"],
            ["Exports and opens", "Only what it declares", "Every package, exported and opened", "Every package"],
            ["Can be required", "Yes", "Yes, by its derived name", "No, a named module can't say `requires` on it"],
            ["`jlink` can include it", "Yes", "No", "No"],
          ],
        },
        {
          type: "heading",
          text: "Module path versus classpath",
        },
        {
          type: "table",
          headers: ["", "Classpath (`-cp`)", "Module path (`-p`, `--module-path`)"],
          rows: [
            ["Unit", "Directories and JARs, flattened into one namespace", "Modules, each with a name and a boundary"],
            ["Missing dependency", "`NoClassDefFoundError` when a class is first used", "`FindException` before `main` runs"],
            ["Two copies of a library", "First JAR wins, class by class, silently", "\"Two versions of module ... found\", startup fails"],
            ["Same package in two JARs", "Allowed, merged", "Not allowed in one layer"],
            ["`module-info.class` in a JAR", "Ignored", "Used"],
            ["Started with", "`java -cp app.jar com.shop.Main`", "`java -p mods -m com.shop.app/com.shop.app.Main`"],
          ],
        },
        {
          type: "paragraph",
          text: "Both can be used at once: modules on the module path, and leftover JARs on the classpath in the unnamed module. That mixed setup is how most migrations go, and the section on automatic modules below shows how the two sides can see each other.",
        },
        {
          type: "heading",
          text: "Rules the module graph must follow",
        },
        {
          type: "list",
          items: [
            "**No cycles** in `requires`. If `com.shop.money` requires `com.shop.core` and `com.shop.core` requires `com.shop.money`, `javac` reports a cyclic dependence. (At run time, readability edges added by reflection or by automatic modules can form cycles; the rule is about declarations.)",
            "**No split packages.** A module can't read two modules that both contain the same package, and two modules in one layer that share a class loader can't contain the same package. On the module path, everything in the boot layer shares the application class loader, so a package may live in only one module.",
            "**Unique names.** Two modules with the same name in one directory on the module path stop the JVM at startup.",
            "**One descriptor per module.** `module-info.java` sits at the root of the module's source tree, not inside a package.",
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The project I'll use throughout",
        },
        {
          type: "paragraph",
          text: "A small shop split into four modules: `com.shop.money` holds a `Money` record, `com.shop.core` has products and orders plus a tax table it wants to keep private, `com.shop.reports` is a friend that may use the tax table, and `com.shop.app` has `main`. The layout is the multi-module one `javac` understands with `--module-source-path`: one directory per module, named after the module.",
        },
        {
          type: "diagram",
          text: `shop/
└── src/
    ├── com.shop.money/
    │   ├── module-info.java
    │   └── com/shop/money/Money.java
    ├── com.shop.core/
    │   ├── module-info.java
    │   ├── com/shop/core/Product.java
    │   ├── com/shop/core/Order.java
    │   └── com/shop/internal/TaxTable.java     (not for app)
    ├── com.shop.reports/
    │   ├── module-info.java
    │   └── com/shop/reports/TaxReport.java
    └── com.shop.app/
        ├── module-info.java
        └── com/shop/app/Main.java`,
          caption: "One directory per module, named exactly like the module.",
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.money/module-info.java",
          code: `module com.shop.money {
    exports com.shop.money;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.money/com/shop/money/Money.java",
          code: `package com.shop.money;

public record Money(long paise) {
    public Money plus(Money other) {
        return new Money(paise + other.paise);
    }

    public Money percent(int p) {
        return new Money(paise * p / 100);
    }

    @Override
    public String toString() {
        return String.format("Rs. %d.%02d", paise / 100, paise % 100);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.core/module-info.java",
          code: `module com.shop.core {
    requires transitive com.shop.money;           // Money is part of this module's API
    exports com.shop.core;                         // to everyone
    exports com.shop.internal to com.shop.reports; // to one named friend only
}`,
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.core/com/shop/core/Product.java",
          code: `package com.shop.core;

import com.shop.money.Money;

public record Product(String name, String category, Money price) { }`,
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.core/com/shop/core/Order.java",
          code: `package com.shop.core;

import com.shop.internal.TaxTable;
import com.shop.money.Money;

import java.util.ArrayList;
import java.util.List;

public class Order {
    private final List<Product> items = new ArrayList<>();

    public Order add(Product p) {
        items.add(p);
        return this;
    }

    public Money total() {
        Money sum = new Money(0);
        for (Product p : items) {
            sum = sum.plus(p.price()).plus(p.price().percent(TaxTable.gstPercent(p.category())));
        }
        return sum;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.core/com/shop/internal/TaxTable.java",
          code: `package com.shop.internal;

public class TaxTable {
    public static int gstPercent(String category) {
        return category.equals("books") ? 0 : 18;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.reports/module-info.java",
          code: `module com.shop.reports {
    requires com.shop.core;
    exports com.shop.reports;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.reports/com/shop/reports/TaxReport.java",
          code: `package com.shop.reports;

import com.shop.internal.TaxTable;   // allowed: exported to this module by name

public class TaxReport {
    public static String line(String category) {
        return category + " -> GST " + TaxTable.gstPercent(category) + "%";
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.app/module-info.java",
          code: `module com.shop.app {
    requires com.shop.core;
    requires com.shop.reports;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.app/com/shop/app/Main.java",
          code: `package com.shop.app;

import com.shop.core.Order;
import com.shop.core.Product;
import com.shop.money.Money;          // readable because core requires transitive money
import com.shop.reports.TaxReport;

public class Main {
    public static void main(String[] args) {
        Order order = new Order()
                .add(new Product("Java book", "books", new Money(45_000)))
                .add(new Product("Headphones", "electronics", new Money(150_000)));
        System.out.println("Total: " + order.total());
        System.out.println(TaxReport.line("books"));
        System.out.println(TaxReport.line("electronics"));

        Module core = Order.class.getModule();
        Module app = Main.class.getModule();
        System.out.println("app reads core:    " + app.canRead(core));
        System.out.println("app reads money:   " + app.canRead(Money.class.getModule()));
        System.out.println("internal to app:   " + core.isExported("com.shop.internal", app));
        System.out.println("internal to reports: "
                + core.isExported("com.shop.internal", TaxReport.class.getModule()));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `cd shop
javac -d out --module-source-path src $(find src -name "*.java")
java -p out -m com.shop.app/com.shop.app.Main`,
        },
        {
          type: "output",
          text: `Total: Rs. 2220.00
books -> GST 0%
electronics -> GST 18%
app reads core:    true
app reads money:   true
internal to app:   false
internal to reports: true`,
        },
        {
          type: "list",
          items: [
            "`--module-source-path src` tells `javac` to treat each directory under `src` as a module, and `-d out` produces the same layout of compiled modules: `out/com.shop.core/module-info.class`, `out/com.shop.core/com/shop/core/Order.class` and so on.",
            "`-p out` puts that directory on the module path (every subdirectory is a module), and `-m com.shop.app/com.shop.app.Main` names the root module and the main class.",
            "The total is 450 for the tax-free book plus 1,500 and 18% GST for the headphones. `TaxTable` did its job inside `com.shop.core`; the last four lines are the module system describing itself, and `internal to app: false` is the encapsulation I wanted.",
          ],
        },
        {
          type: "heading",
          text: "The Module attribute in module-info.class",
        },
        {
          type: "paragraph",
          text: "`module-info.class` is a class file with no fields, no methods and no superclass. Everything the directives say goes into one attribute, `Module` (JVM specification section 4.7.25). Trimmed to the interesting parts:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -v out/com.shop.core/module-info.class`,
        },
        {
          type: "output",
          text: `module com.shop.core
  minor version: 0
  major version: 65
  flags: (0x8000) ACC_MODULE
  this_class: #1                          // "module-info"
  super_class: #0
  interfaces: 0, fields: 0, methods: 0, attributes: 2
Constant pool:
   #1 = Class              #2             // "module-info"
   ...
   #6 = Module             #7             // "com.shop.core"
   ...
  #13 = Package            #14            // com/shop/core
  ...
  #15 = Package            #16            // com/shop/internal
  ...
  #17 = Module             #18            // "com.shop.reports"
  ...
SourceFile: "module-info.java"
Module:
  #6,0                                    // "com.shop.core"
  #0
  2                                       // requires
    #8,8000                                 // "java.base" ACC_MANDATED
    #10                                     // 21.0.13.0.3
    #11,20                                  // "com.shop.money" ACC_TRANSITIVE
    #0
  2                                       // exports
    #13,0                                   // com/shop/core
    #15,0                                   // com/shop/internal to ... 1
      #17                                     // ... to "com.shop.reports"
  0                                       // opens
  0                                       // uses
  0                                       // provides`,
        },
        {
          type: "list",
          items: [
            "`flags: (0x8000) ACC_MODULE` is what marks this as a module descriptor rather than a class. `super_class: #0` means no superclass, which the JVM specification allows only here and in `java/lang/Object.class`.",
            "The constant pool has two entry kinds that only modules use, `CONSTANT_Module` and `CONSTANT_Package`. Packages are stored with slashes, `com/shop/core`.",
            "`requires` has two entries. `java.base` is flagged `0x8000 ACC_MANDATED`: I never wrote it, the language added it. It also records the version I compiled against, `21.0.13.0.3` (whatever `java -version` says on the compiling machine). `com.shop.money` is flagged `0x0020 ACC_TRANSITIVE`.",
            "The qualified export lists its target, `com.shop.reports`, by `CONSTANT_Module` index. The JVM reads this list when it builds the module graph.",
          ],
        },
        {
          type: "paragraph",
          text: "The other flags show up in the other projects in this lesson. `requires static com.shop.audit` became `#11,40 // \"com.shop.audit\" ACC_STATIC_PHASE`, and `open module com.shop.customers` put the flag on the module itself: `#6,20 // \"com.shop.customers\" ACC_OPEN`. When I packaged the app as a modular JAR with `jar --module-version 1.0 --main-class com.shop.app.Main` (the full commands are in the Examples), the tool added two more attributes that `javac` doesn't write: `ModuleMainClass` (the entry point, so `java -m com.shop.app` needs no class name) and `ModulePackages` (the full list of packages, so the JVM doesn't have to scan the JAR):",
        },
        {
          type: "output",
          text: `Module:
  #6,0                                    // "com.shop.app"
  #15                                     // 1.0
  3                                       // requires
    #8,8000                                 // "java.base" ACC_MANDATED
    #10                                     // 21.0.13.0.3
    #11,0                                   // "com.shop.core"
    #0
    #13,0                                   // "com.shop.reports"
    #0
  0                                       // exports
  0                                       // opens
  0                                       // uses
  0                                       // provides
ModuleMainClass: #18                    // com.shop.app.Main
ModulePackages:
  #21                                     // com.shop.app`,
        },
        {
          type: "heading",
          text: "How the boot layer is built",
        },
        {
          type: "paragraph",
          text: "Before `main` runs, the launcher **resolves** the module graph: it starts from the root module named by `-m`, finds each `requires` on the module path or among the JDK's own modules, and repeats until everything is found. Then it adds **service binding**: for every `uses` in a resolved module, it pulls in every observable module that `provides` that service. The result is a `Configuration`, and from it the JVM creates the **boot layer**, a `ModuleLayer` that maps each module to a class loader. `--show-module-resolution` prints the decisions:",
        },
        {
          type: "code",
          language: "bash",
          code: `java --show-module-resolution -p out -m com.shop.app/com.shop.app.Main`,
        },
        {
          type: "output",
          text: `root com.shop.app file:///.../shop/out/com.shop.app/
com.shop.app requires com.shop.core file:///.../shop/out/com.shop.core/
com.shop.app requires com.shop.reports file:///.../shop/out/com.shop.reports/
com.shop.core requires com.shop.money file:///.../shop/out/com.shop.money/
com.shop.reports requires com.shop.core file:///.../shop/out/com.shop.core/
java.base binds jdk.jpackage jrt:/jdk.jpackage
java.base binds jdk.jdeps jrt:/jdk.jdeps
java.base binds jdk.compiler jrt:/jdk.compiler
java.base binds jdk.jlink jrt:/jdk.jlink
...
jdk.security.auth requires java.security.jgss jrt:/java.security.jgss
...`,
        },
        {
          type: "paragraph",
          text: "(I shortened the paths.) The first five lines are my graph. The rest, 105 lines in total with 36 `binds`, is `java.base` binding service providers: `java.base` declares `uses` for things like charsets, file systems and security providers, so every JDK module that provides one gets resolved, plus their own dependencies. `jrt:/` is the URL scheme for the JDK's modules inside `lib/modules`. I counted the result from inside the program: `ModuleLayer.boot().modules().size()` was 49, my four modules and 45 from the JDK. With `--limit-modules com.shop.app`, which shrinks the set of observable modules to what the root needs, it was 5. That gap is what `jlink` exploits later.",
        },
        {
          type: "heading",
          text: "Which class loader loads which module",
        },
        {
          type: "paragraph",
          text: "Since Java 9 there are still three built-in loaders, but the JDK modules are divided between them. I asked a few classes where they came from, from a plain classpath program:",
        },
        {
          type: "code",
          language: "java",
          title: "BootLayer.java",
          code: `import java.util.List;

public class BootLayer {
    public static void main(String[] args) throws Exception {
        ModuleLayer boot = ModuleLayer.boot();
        System.out.println("modules in the boot layer: " + boot.modules().size());

        List<Class<?>> samples = List.of(
                String.class,                                    // java.base
                java.sql.Connection.class,                       // java.sql
                Class.forName("com.sun.source.tree.Tree"),       // jdk.compiler
                BootLayer.class);                                // mine, on the classpath
        for (Class<?> c : samples) {
            Module m = c.getModule();
            ClassLoader loader = m.getClassLoader();
            String loaderName = loader == null ? "bootstrap" : loader.getName();
            System.out.printf("%-26s %-21s %s%n",
                    c.getSimpleName(), m.isNamed() ? m.getName() : "(unnamed)", loaderName);
        }

        Module mine = BootLayer.class.getModule();
        Module base = String.class.getModule();
        System.out.println("my module: " + mine);
        System.out.println("reads java.base: " + mine.canRead(base));
        System.out.println("java.lang exported to me: " + base.isExported("java.lang", mine));
        System.out.println("jdk.internal.misc exported to me: "
                + base.isExported("jdk.internal.misc", mine));
        System.out.println("java.lang opened to me: " + base.isOpen("java.lang", mine));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac BootLayer.java && java BootLayer`,
        },
        {
          type: "output",
          text: `modules in the boot layer: 62
String                     java.base             bootstrap
Connection                 java.sql              platform
Tree                       jdk.compiler          app
BootLayer                  (unnamed)             app
my module: unnamed module @4d7e1886
reads java.base: true
java.lang exported to me: true
jdk.internal.misc exported to me: false
java.lang opened to me: false`,
        },
        {
          type: "list",
          items: [
            "`java.base` and the other core modules are defined to the **bootstrap** loader, which Java represents as `null`.",
            "`java.sql` is defined to the **platform** loader (the old extension loader's replacement). Modules that don't need bootstrap privileges were moved there in Java 9.",
            "`jdk.compiler` and the other tool modules are defined to the **application** loader, the same one that loads my classpath classes and every module on the module path.",
            "My class is in the application loader's **unnamed module**. `@4d7e1886` is its identity hash and changes between runs. It reads `java.base`, sees `java.lang` because it's exported, doesn't see `jdk.internal.misc`, and can't deep-reflect into `java.lang`. Started with `--add-opens java.base/java.lang=ALL-UNNAMED`, the last line printed `true`.",
            "A classpath program got 62 of the JDK's 69 modules in its boot layer. When the main class is on the classpath, the default root modules are, roughly, every system module that exports an API, so classpath code can use any of them without asking.",
          ],
        },
        {
          type: "heading",
          text: "The JVM checks modules again at link time",
        },
        {
          type: "paragraph",
          text: "`javac` enforces readability and exports, but the JVM can't trust that every class file came from a compiler that saw the current descriptors. So the access check that runs when a symbolic reference is resolved (JVM specification section 5.4.4) has module conditions too: a public class in another module is accessible only if the accessing module reads it and the package is exported to it. To see that check fire, I compiled the app against a `com.shop.core` that exported its internal package to everyone, then narrowed the export and recompiled only `com.shop.core`:",
        },
        {
          type: "code",
          language: "java",
          title: "stale/src/com.shop.app/com/shop/app/Main.java",
          code: `package com.shop.app;

import com.shop.internal.TaxTable;

public class Main {
    public static void main(String[] args) {
        System.out.println("GST on books: " + TaxTable.gstPercent("books") + "%");
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "stale/src/com.shop.core/module-info.java (v1)",
          code: `module com.shop.core {
    requires transitive com.shop.money;
    exports com.shop.core;
    exports com.shop.internal;          // v1: exported
}`,
        },
        {
          type: "code",
          language: "java",
          title: "stale/src/com.shop.core/module-info.java (v2)",
          code: `module com.shop.core {
    requires transitive com.shop.money;
    exports com.shop.core;              // v2: com.shop.internal no longer exported
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `cd stale        # the money and core sources from shop, app replaced by this Main
javac -d out --module-source-path src $(find src -name "*.java")
java -p out -m com.shop.app/com.shop.app.Main

# edit com.shop.core/module-info.java to v2, recompile only that module
javac -d out --module-source-path src $(find src/com.shop.core -name "*.java")
java -p out -m com.shop.app/com.shop.app.Main`,
        },
        {
          type: "output",
          text: `GST on books: 0%

Exception in thread "main" java.lang.IllegalAccessError: class com.shop.app.Main (in module com.shop.app) cannot access class com.shop.internal.TaxTable (in module com.shop.core) because module com.shop.core does not export com.shop.internal to module com.shop.app
	at com.shop.app/com.shop.app.Main.main(Main.java:7)`,
        },
        {
          type: "paragraph",
          text: "The class file for `Main` still contains `invokestatic com/shop/internal/TaxTable.gstPercent`. When that instruction first runs, resolution finds `TaxTable`, sees it's public, then checks the module graph and refuses. It's the same `IllegalAccessError` the Encapsulation lesson got from a stale class reading a private field, with the module reason spelled out. Readability is checked the same way: a module that uses a classpath class without reading the unnamed module fails with \"because module com.shop.app does not read unnamed module\", which the section on the classpath shows.",
        },
        {
          type: "callout",
          tone: "note",
          title: "Reflection has its own copy of the rules",
          text: "Core reflection checks exports and opens itself, in `AccessibleObject.checkCanSetAccessible` and the `Method.invoke` and `Field.get` access checks. One rule is relaxed on purpose: reflection doesn't require readability. The Java 9 design assumes every module can reflectively read every other, so a framework doesn't need a `requires` on each application module it inspects. Exports and opens are still enforced, which is where `InaccessibleObjectException` comes from.",
        },
        {
          type: "heading",
          text: "Where the JDK's classes live now",
        },
        {
          type: "paragraph",
          text: "Since JEP 220 there is no `rt.jar`. The JDK's classes for all 69 modules are in one file, `lib/modules`, in a format called jimage that's designed for fast lookup by module and package. On my JDK 21 it's 141,113,413 bytes. The `jrt:/` URLs in the resolution log point into it, and `jlink` writes a smaller one containing only the modules an image needs.",
        },
      ],
    },
    {
      title: "The Directives, One by One",
      blocks: [
        {
          type: "paragraph",
          text: "The shop project already uses four directives. Here's what each one does when it's missing or wrong, because the error messages are the fastest way I found to learn the rules.",
        },
        {
          type: "heading",
          text: "exports: public is no longer enough",
        },
        {
          type: "paragraph",
          text: "`TaxTable` is a public class with a public static method. On the classpath, any class could call it. In `com.shop.app`, I added one import below the existing ones, so it's line 7:",
        },
        {
          type: "code",
          language: "java",
          code: `import com.shop.reports.TaxReport;
import com.shop.internal.TaxTable;`,
        },
        {
          type: "output",
          text: `src/com.shop.app/com/shop/app/Main.java:7: error: package com.shop.internal is not visible
import com.shop.internal.TaxTable;
               ^
  (package com.shop.internal is declared in module com.shop.core, which does not export it to module com.shop.app)
1 error`,
        },
        {
          type: "paragraph",
          text: "The error is on the import, before `javac` even looks at the class. The parenthesised reason names the declaring module and the missing export. When `com.shop.core` had no qualified export at all, the reason ended with \"which does not export it\". Either way, `TaxTable` stays an implementation detail I can rename tomorrow, and `com.shop.reports`, the one module named in `exports ... to`, still compiles against it.",
        },
        {
          type: "callout",
          tone: "note",
          title: "javac -m gives a less helpful message",
          text: "`javac` can also compile by module name: `javac -d out --module-source-path src -m com.shop.app` finds and compiles `com.shop.app` and what it needs. With that form, the same mistake was reported as `package com.shop.internal does not exist`. Passing every source file, as above (which is also what Maven and Gradle do), gave the \"is not visible\" message with the reason. I use the file list everywhere in this lesson.",
        },
        {
          type: "heading",
          text: "requires: readability doesn't travel on its own",
        },
        {
          type: "paragraph",
          text: "`com.shop.reports` requires `com.shop.core`. So if `com.shop.app` requires `com.shop.reports`, can it see `com.shop.core`? I tried it:",
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.app/module-info.java (broken)",
          code: `module com.shop.app {
    requires com.shop.reports;     // reports requires core, so surely I can see core?
}`,
        },
        {
          type: "output",
          text: `src/com.shop.app/com/shop/app/Main.java:3: error: package com.shop.core is not visible
import com.shop.core.Order;
               ^
  (package com.shop.core is declared in module com.shop.core, but module com.shop.app does not read it)
src/com.shop.app/com/shop/app/Main.java:4: error: package com.shop.core is not visible
import com.shop.core.Product;
               ^
  (package com.shop.core is declared in module com.shop.core, but module com.shop.app does not read it)
src/com.shop.app/com/shop/app/Main.java:5: error: package com.shop.money is not visible
import com.shop.money.Money;          // readable because core requires transitive money
               ^
  (package com.shop.money is declared in module com.shop.money, but module com.shop.app does not read it)
3 errors`,
        },
        {
          type: "paragraph",
          text: "No. This time the reason is \"does not read it\", not \"does not export it\": `com.shop.core` exports the package, but there's no readability edge from `com.shop.app` to `com.shop.core`. A plain `requires` is private to the module that writes it. Every module states its own direct dependencies, which is exactly what makes the graph checkable.",
        },
        {
          type: "heading",
          text: "requires transitive: dependencies that are part of my API",
        },
        {
          type: "paragraph",
          text: "There's one case where a dependency should travel: when my exported API mentions its types. `Order.total()` returns a `Money`, and `Product` has a `Money` component, so anyone using `com.shop.core` needs `com.shop.money` too. That's why `com.shop.core` says `requires transitive com.shop.money`. I changed it to a plain `requires` and compiled with `-Xlint:exports`:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac -Xlint:exports -d out --module-source-path src $(find src -name "*.java")`,
        },
        {
          type: "output",
          text: `src/com.shop.app/com/shop/app/Main.java:5: error: package com.shop.money is not visible
import com.shop.money.Money;          // readable because core requires transitive money
               ^
  (package com.shop.money is declared in module com.shop.money, but module com.shop.app does not read it)
src/com.shop.core/com/shop/core/Order.java:17: warning: [exports] record Money in module com.shop.money is not indirectly exported using 'requires transitive'
    public Money total() {
           ^
src/com.shop.core/com/shop/core/Product.java:5: warning: [exports] record Money in module com.shop.money is not indirectly exported using 'requires transitive'
public record Product(String name, String category, Money price) { }
                                                    ^
1 error
2 warnings`,
        },
        {
          type: "list",
          items: [
            "The app lost readability of `com.shop.money` and failed on its import.",
            "With `-Xlint:exports`, `javac` also pointed at the root cause on the other side: two public signatures in an exported package that use `Money` without `requires transitive`. I'd keep that lint on in any library build.",
            "The rule I use: if a type from module M appears in a public signature of a package I export (a parameter, a return type, a superclass, a record component), I write `requires transitive M`. If M is only used inside method bodies, a plain `requires` is right, and making it transitive would leak a dependency my callers never asked for. `java.sql` follows the same rule: it `requires transitive java.logging` and `java.xml`, because its API mentions their types.",
          ],
        },
        {
          type: "heading",
          text: "exports ... to: a friend, not the world",
        },
        {
          type: "paragraph",
          text: "`exports com.shop.internal to com.shop.reports` is a **qualified export**. Only the named modules may use the package, which the program confirmed with `internal to reports: true` and `internal to app: false`. The JDK itself relies on this heavily: `java --describe-module java.base` printed 67 lines like `qualified exports sun.nio.cs to java.desktop jdk.charsets`, which is how JDK modules share internals with each other without sharing them with me. Qualified exports are meant for modules maintained together. Naming a module I don't control couples me to its name.",
        },
        {
          type: "heading",
          text: "requires static: needed to compile, optional to run",
        },
        {
          type: "paragraph",
          text: "Some dependencies are only needed at compile time (annotations processed by a tool) or are optional extras the code can work without. For those there's `requires static`. A separate small project: a billing module that writes to an audit log when the audit module happens to be present.",
        },
        {
          type: "code",
          language: "java",
          title: "optional/src/com.shop.audit/module-info.java",
          code: `module com.shop.audit {
    exports com.shop.audit;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "optional/src/com.shop.audit/com/shop/audit/AuditLog.java",
          code: `package com.shop.audit;

public class AuditLog {
    public static void record(String event) {
        System.out.println("[audit] " + event);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "optional/src/com.shop.billing/module-info.java",
          code: `module com.shop.billing {
    requires static com.shop.audit;   // needed to compile, optional at run time
    exports com.shop.billing;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "optional/src/com.shop.billing/com/shop/billing/Invoice.java",
          code: `package com.shop.billing;

public class Invoice {
    private static final boolean AUDIT =
            ModuleLayer.boot().findModule("com.shop.audit").isPresent();

    public static void issue(String customer, long paise) {
        System.out.println("Invoice for " + customer + ": " + paise + " paise");
        if (AUDIT) {
            com.shop.audit.AuditLog.record("invoice issued to " + customer);
        }
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "optional/src/com.shop.app/module-info.java",
          code: `module com.shop.app {
    requires com.shop.billing;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "optional/src/com.shop.app/com/shop/app/Main.java",
          code: `package com.shop.app;

import com.shop.billing.Invoice;

public class Main {
    public static void main(String[] args) {
        System.out.println("audit resolved: "
                + ModuleLayer.boot().findModule("com.shop.audit").isPresent());
        Invoice.issue("Asha", 120_000);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `cd optional
javac -d out --module-source-path src $(find src -name "*.java")
java -p out -m com.shop.app/com.shop.app.Main
java -p out --add-modules com.shop.audit -m com.shop.app/com.shop.app.Main`,
        },
        {
          type: "output",
          text: `audit resolved: false
Invoice for Asha: 120000 paise

audit resolved: true
Invoice for Asha: 120000 paise
[audit] invoice issued to Asha`,
        },
        {
          type: "list",
          items: [
            "In the first run `out/com.shop.audit` was right there on the module path, and it still wasn't resolved. `requires static` never pulls a module into the graph; something else has to. Here `--add-modules com.shop.audit` did, and then `com.shop.billing` read it, because a static dependency becomes a normal readability edge whenever the module is resolved.",
            "The `AUDIT` check is what makes the dependency safe to be absent. Without it, the first run dies with `java.lang.NoClassDefFoundError: com/shop/audit/AuditLog`, which Common Mistakes shows.",
            "Jackson uses this for its optional integrations: `jackson-databind` declares `requires static java.sql`, `java.desktop` and `java.xml`, so its `java.sql.Date` support is there when `java.sql` is resolved and costs nothing in a `jlink` image without it. The production section relies on that.",
          ],
        },
      ],
    },
    {
      title: "Cycles and Split Packages",
      blocks: [
        {
          type: "paragraph",
          text: "Two structural rules come up as soon as an existing codebase is cut into modules, and both are things the classpath happily allowed.",
        },
        {
          type: "heading",
          text: "No cycles",
        },
        {
          type: "paragraph",
          text: "In the shop project, I made `com.shop.money` require `com.shop.core`, so the two modules depend on each other:",
        },
        {
          type: "code",
          language: "java",
          title: "shop/src/com.shop.money/module-info.java (cycle)",
          code: `module com.shop.money {
    requires com.shop.core;     // Money wants to know about Order?
    exports com.shop.money;
}`,
        },
        {
          type: "output",
          text: `src/com.shop.money/module-info.java:2: error: cyclic dependence involving com.shop.core
    requires com.shop.core;     // Money wants to know about Order?
                     ^
src/com.shop.core/module-info.java:2: error: cyclic dependence involving com.shop.money
    requires transitive com.shop.money;           // Money is part of this module's API
                                ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "On the classpath, two JARs that call each other are normal, and that's usually a sign they're really one component. With modules, the fixes are the usual design ones: merge the two modules, move the shared types down into a third module both can require, or invert the dependency with an interface owned by the lower module, which is what services are for.",
        },
        {
          type: "heading",
          text: "No split packages",
        },
        {
          type: "paragraph",
          text: "A **split package** is one package spread over two modules. Two small libraries that both put helpers into `com.shop.util` are enough:",
        },
        {
          type: "code",
          language: "java",
          title: "split/src/com.shop.strings/module-info.java",
          code: `module com.shop.strings {
    exports com.shop.util;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "split/src/com.shop.strings/com/shop/util/StringUtils.java",
          code: `package com.shop.util;

public class StringUtils {
    public static String shout(String s) { return s.toUpperCase(); }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "split/src/com.shop.dates/module-info.java",
          code: `module com.shop.dates {
    exports com.shop.util;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "split/src/com.shop.dates/com/shop/util/DateUtils.java",
          code: `package com.shop.util;

public class DateUtils {
    public static String today() { return java.time.LocalDate.now().toString(); }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "split/src/com.shop.app/module-info.java",
          code: `module com.shop.app {
    requires com.shop.strings;
    requires com.shop.dates;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "split/src/com.shop.app/com/shop/app/Main.java",
          code: `package com.shop.app;

import com.shop.util.StringUtils;

public class Main {
    public static void main(String[] args) {
        System.out.println(StringUtils.shout("split"));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `cd split
javac -d out --module-source-path src $(find src -name "*.java")`,
        },
        {
          type: "output",
          text: `src/com.shop.app/module-info.java:1: error: module com.shop.app reads package com.shop.util from both com.shop.strings and com.shop.dates
module com.shop.app {
^
1 error`,
        },
        {
          type: "paragraph",
          text: "Interesting detail: compiling just the two library modules together was accepted. The compile-time rule is about a module **reading** the same package from two places. The run-time rule is stricter, so I compiled the modules one at a time, with an app that requires only `com.shop.strings`, and forced the other module into the boot layer:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out/com.shop.strings $(find src/com.shop.strings -name "*.java")
javac -d out/com.shop.dates $(find src/com.shop.dates -name "*.java")
# app's module-info now has only: requires com.shop.strings;
javac -d out/com.shop.app -p out $(find src/com.shop.app -name "*.java")

java -p out -m com.shop.app/com.shop.app.Main
java -p out --add-modules com.shop.dates -m com.shop.app/com.shop.app.Main
java -cp out/com.shop.strings:out/com.shop.dates:out/com.shop.app com.shop.app.Main`,
        },
        {
          type: "output",
          text: `SPLIT

Error occurred during initialization of boot layer
java.lang.LayerInstantiationException: Package com.shop.util in both module com.shop.strings and module com.shop.dates

SPLIT`,
        },
        {
          type: "list",
          items: [
            "Nothing in the app reads `com.shop.dates`, yet the boot layer refused to start. Every module on the module path in the boot layer is defined to the same application class loader, and one class loader can't have one package come from two modules.",
            "The last command put the same three directories on the classpath, where the two halves of `com.shop.util` were simply merged. That's why split packages are the most common blocker when old JARs move to the module path. Classic examples are two JARs that both ship `javax.annotation` classes (a JSR 305 JAR and the `javax.annotation-api` JAR).",
            "The fixes: rename one package, merge the modules, or leave the offending JARs on the classpath, where the unnamed module doesn't have this rule.",
          ],
        },
      ],
    },
    {
      title: "Named, Automatic and Unnamed Modules",
      blocks: [
        {
          type: "heading",
          text: "The same classes, two ways to run them",
        },
        {
          type: "paragraph",
          text: "The compiled shop modules are ordinary class files. `module-info.class` only matters on the module path; on the classpath it's ignored. So I ran exactly the same `out` directories both ways, first with `com.shop.money` missing:",
        },
        {
          type: "code",
          language: "bash",
          code: `cd shop
java -p out/com.shop.app:out/com.shop.core:out/com.shop.reports -m com.shop.app/com.shop.app.Main
java -cp out/com.shop.app:out/com.shop.core:out/com.shop.reports com.shop.app.Main`,
        },
        {
          type: "output",
          text: `Error occurred during initialization of boot layer
java.lang.module.FindException: Module com.shop.money not found, required by com.shop.core

Exception in thread "main" java.lang.NoClassDefFoundError: com/shop/money/Money
	at com.shop.app.Main.main(Main.java:10)
Caused by: java.lang.ClassNotFoundException: com.shop.money.Money
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:641)
	at java.base/jdk.internal.loader.ClassLoaders$AppClassLoader.loadClass(ClassLoaders.java:188)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:526)
	... 1 more`,
        },
        {
          type: "paragraph",
          text: "Same mistake, two very different failures. The module path refused to start and named the missing module and who needed it. The classpath started, ran `main`, and failed at the first line that touched `Money`. In this program that's line 10; in a real service it could be a code path that runs once a day. Then with all four directories on the classpath:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -cp out/com.shop.app:out/com.shop.core:out/com.shop.reports:out/com.shop.money com.shop.app.Main`,
        },
        {
          type: "output",
          text: `Total: Rs. 2220.00
books -> GST 0%
electronics -> GST 18%
app reads core:    true
app reads money:   true
internal to app:   true
internal to reports: true`,
        },
        {
          type: "paragraph",
          text: "`internal to app: true`. All four \"modules\" are now one unnamed module, which exports everything to itself, and my encapsulation is gone. Strong encapsulation is a property of how the code is run, not of how it was compiled.",
        },
        {
          type: "heading",
          text: "The unnamed module",
        },
        {
          type: "list",
          items: [
            "Everything on the classpath belongs to the **unnamed module** of its class loader (for the classpath, the application class loader).",
            "It reads every module in the boot layer, so classpath code can use any exported package of any resolved module, as it always could for public JDK APIs.",
            "It exports and opens all its packages, but no named module can declare `requires` on it, because it has no name. So code on the classpath can call into named modules, while named modules can't call back into the classpath.",
            "It can't see non-exported packages of named modules. That's what the Encapsulation lesson hit with `String.value`, and what `LegacyHex` in the Examples hits with `sun.security.util`.",
          ],
        },
        {
          type: "heading",
          text: "Automatic modules: a plain JAR on the module path",
        },
        {
          type: "paragraph",
          text: "The bridge between the two worlds is the **automatic module**. When a JAR without `module-info.class` is put on the module path, the JVM makes up a module for it: the name comes from the `Automatic-Module-Name` manifest attribute if there is one, otherwise from the file name, with the version and `.jar` dropped and non-alphanumeric characters turned into dots. I built two old-style JARs for this: `text-tools-1.4.2.jar` makes URL slugs and calls into `ascii-legacy-0.9.jar`.",
        },
        {
          type: "code",
          language: "java",
          title: "legacy/ascii/com/acme/legacy/Ascii.java",
          code: `package com.acme.legacy;

public class Ascii {
    public static String fold(String s) {
        return s.replace('é', 'e').replace('ü', 'u');
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "legacy/texttools/com/acme/text/Slugs.java",
          code: `package com.acme.text;

import com.acme.legacy.Ascii;

public class Slugs {
    public static String slug(String title) {
        return Ascii.fold(title).toLowerCase().trim().replaceAll("[^a-z0-9]+", "-");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `cd legacy
mkdir -p libs
javac -d ascii-classes ascii/com/acme/legacy/Ascii.java
jar --create --file libs/ascii-legacy-0.9.jar -C ascii-classes .
javac -cp libs/ascii-legacy-0.9.jar -d texttools-classes texttools/com/acme/text/Slugs.java
jar --create --file libs/text-tools-1.4.2.jar -C texttools-classes .
jar --describe-module --file libs/text-tools-1.4.2.jar`,
        },
        {
          type: "output",
          text: `No module descriptor found. Derived automatic module.

text.tools@1.4.2 automatic
requires java.base mandated
contains com.acme.text`,
        },
        {
          type: "paragraph",
          text: "`text-tools-1.4.2.jar` became `text.tools`, version `1.4.2`. A named module can now require it:",
        },
        {
          type: "code",
          language: "java",
          title: "legacy/src/com.shop.app/module-info.java",
          code: `module com.shop.app {
    requires text.tools;     // automatic module: name derived from text-tools-1.4.2.jar
}`,
        },
        {
          type: "code",
          language: "java",
          title: "legacy/src/com.shop.app/com/shop/app/Main.java",
          code: `package com.shop.app;

import com.acme.text.Slugs;

public class Main {
    public static void main(String[] args) {
        System.out.println(Slugs.slug("  Café Deals, 2026 "));
        Module text = Slugs.class.getModule();
        System.out.println(text + ", automatic: " + text.getDescriptor().isAutomatic());
        System.out.println("reads the unnamed module: "
                + text.canRead(ClassLoader.getSystemClassLoader().getUnnamedModule()));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out -p libs/text-tools-1.4.2.jar --module-source-path src $(find src -name "*.java")
java -p out:libs/text-tools-1.4.2.jar -cp libs/ascii-legacy-0.9.jar -m com.shop.app/com.shop.app.Main`,
        },
        {
          type: "output",
          text: `cafe-deals-2026
module text.tools, automatic: true
reads the unnamed module: true`,
        },
        {
          type: "list",
          items: [
            "`text-tools-1.4.2.jar` is on the module path as `text.tools`, and `ascii-legacy-0.9.jar` is on the classpath. `Slugs` calls `Ascii` successfully because an automatic module reads the unnamed module. That's the one door from the module path back to the classpath, and it's why automatic modules exist: a named module can depend on an old JAR, and the old JAR can still depend on whatever is left on the classpath.",
            "An automatic module exports and opens every package it has, and it reads every other module. It's a module in name only; the point is to be requirable.",
            "When I put `ascii-legacy-0.9.jar` on the module path too, the app could call `Ascii` directly while requiring only `text.tools`. Any module that reads one automatic module reads all the others, and resolving one automatic module resolves every automatic module on the module path.",
            "With a manifest line `Automatic-Module-Name: com.acme.text`, `jar --describe-module` printed `com.acme.text automatic` instead. That's the stable name a library should publish before it ships a real `module-info`; a name derived from a file name changes the day someone renames the JAR. Spring Framework does this: `spring-core-6.2.11.jar` has `Automatic-Module-Name: spring.core`.",
          ],
        },
        {
          type: "heading",
          text: "What a named module can't see",
        },
        {
          type: "paragraph",
          text: "If both old JARs stay on the classpath, the app module can't use them at all. I removed the `requires` line and compiled with the JARs on `-cp`:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out -cp libs/text-tools-1.4.2.jar:libs/ascii-legacy-0.9.jar --module-source-path src $(find src -name "*.java")`,
        },
        {
          type: "output",
          text: `src/com.shop.app/com/shop/app/Main.java:3: error: package com.acme.text does not exist
import com.acme.text.Slugs;
                    ^
src/com.shop.app/com/shop/app/Main.java:7: error: cannot find symbol
        System.out.println(Slugs.slug("  Café Deals, 2026 "));
                           ^
  symbol:   variable Slugs
  location: class Main
src/com.shop.app/com/shop/app/Main.java:8: error: cannot find symbol
        Module text = Slugs.class.getModule();
                      ^
  symbol:   class Slugs
  location: class Main
3 errors`,
        },
        {
          type: "paragraph",
          text: "Not \"not visible\" this time: for a named module, the classpath simply doesn't exist at compile time. The escape hatch is `--add-reads com.shop.app=ALL-UNNAMED`. With it, `javac` accepted the code. Run without it, the JVM's link-time check caught the missing edge:",
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.IllegalAccessError: class com.shop.app.Main (in module com.shop.app) cannot access class com.acme.text.Slugs (in unnamed module @0x76fb509a) because module com.shop.app does not read unnamed module @0x76fb509a
	at com.shop.app/com.shop.app.Main.main(Main.java:7)`,
        },
        {
          type: "paragraph",
          text: "With `--add-reads com.shop.app=ALL-UNNAMED` on the `java` command too, it printed `cafe-deals-2026` and then threw a `NullPointerException` on the next line, because `getDescriptor()` returns `null` for the unnamed module: it has no descriptor to return. `--add-reads` is a migration crutch; the real fix is to move the JAR to the module path as an automatic module.",
        },
      ],
    },
    {
      title: "Reflection: exports, opens and the Escape Hatches",
      blocks: [
        {
          type: "paragraph",
          text: "Frameworks don't call my code the way `Main` does. Jackson finds fields by name, Spring sets private `@Autowired` fields, Hibernate reads and writes entity fields. All of that is reflection, and modules treat reflection with two separate permissions: `exports` for public members, `opens` for everything. To see the difference, I wrote a tiny stand-in for such a framework.",
        },
        {
          type: "code",
          language: "java",
          title: "reflect/src/com.shop.customers/module-info.java",
          code: `module com.shop.customers {
    exports com.shop.customers;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "reflect/src/com.shop.customers/com/shop/customers/Customer.java",
          code: `package com.shop.customers;

public class Customer {
    public final String name;           // public field
    private final String email;         // private field

    public Customer(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public String greeting() {
        return "Hello, " + name;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "reflect/src/com.shop.inspect/module-info.java",
          code: `module com.shop.inspect {
    exports com.shop.inspect;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "reflect/src/com.shop.inspect/com/shop/inspect/Inspector.java",
          code: `package com.shop.inspect;

import java.lang.reflect.Field;

// A tiny stand-in for what Jackson or Hibernate do: read fields by reflection
public class Inspector {
    public static void dump(Object target) throws Exception {
        Class<?> type = target.getClass();
        System.out.println("public method: " + type.getMethod("greeting").invoke(target));
        System.out.println("public field:  " + type.getField("name").get(target));
        Field email = type.getDeclaredField("email");
        try {
            email.setAccessible(true);
            System.out.println("private field: " + email.get(target));
        } catch (RuntimeException e) {
            System.out.println(e.getClass().getName() + ": " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "reflect/src/com.shop.app/module-info.java",
          code: `module com.shop.app {
    requires com.shop.customers;
    requires com.shop.inspect;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "reflect/src/com.shop.app/com/shop/app/Main.java",
          code: `package com.shop.app;

import com.shop.customers.Customer;
import com.shop.inspect.Inspector;

public class Main {
    public static void main(String[] args) throws Exception {
        Inspector.dump(new Customer("Asha", "asha@example.com"));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `cd reflect
javac -d out --module-source-path src $(find src -name "*.java")
java -p out -m com.shop.app/com.shop.app.Main`,
        },
        {
          type: "output",
          text: `public method: Hello, Asha
public field:  Asha
java.lang.reflect.InaccessibleObjectException: Unable to make field private final java.lang.String com.shop.customers.Customer.email accessible: module com.shop.customers does not "opens com.shop.customers" to module com.shop.inspect`,
        },
        {
          type: "list",
          items: [
            "`com.shop.inspect` doesn't require `com.shop.customers`, and it still called `greeting()` and read the public field. Reflection assumes readability, and `exports` covers public members.",
            "`setAccessible(true)` on the private field threw `InaccessibleObjectException`, an unchecked exception added in Java 9. The message names the exact directive that's missing: `opens com.shop.customers` to `com.shop.inspect`.",
            "On the classpath, the same `setAccessible(true)` would have worked, which is why this exception typically appears the day a working application gets a `module-info.java`.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix is one line, and it can be as narrow as the one module that needs it:",
        },
        {
          type: "code",
          language: "java",
          title: "reflect/src/com.shop.customers/module-info.java (fixed)",
          code: `module com.shop.customers {
    exports com.shop.customers;
    opens com.shop.customers to com.shop.inspect;
}`,
        },
        {
          type: "output",
          text: `public method: Hello, Asha
public field:  Asha
private field: asha@example.com`,
        },
        {
          type: "paragraph",
          text: "I ran every combination I could think of. For the last two rows, I moved object creation behind a factory in a second package, `com.shop.customers.api`, which was exported, so `Inspector` received a `Customer` it couldn't name at compile time:",
        },
        {
          type: "table",
          headers: ["What `com.shop.customers` declares", "Public method / public field via reflection", "`setAccessible(true)` on the private field"],
          rows: [
            ["`exports com.shop.customers;`", "Works", "`InaccessibleObjectException`"],
            ["`exports` + `opens com.shop.customers to com.shop.inspect;`", "Works", "Works"],
            ["`exports` + `opens com.shop.customers;` (to everyone)", "Works", "Works"],
            ["`open module` + `exports`", "Works", "Works"],
            ["only `opens com.shop.customers;` (not exported)", "Works", "Works"],
            ["neither exported nor opened", "`IllegalAccessException`: \"module com.shop.customers does not export com.shop.customers to module com.shop.inspect\"", "Not reached"],
          ],
        },
        {
          type: "paragraph",
          text: "So `opens` grants reflective access to **all** members, public and private, at run time, whether or not the package is exported. `exports` grants compile-time access and reflective access to public members. A package that is opened but not exported is the right shape for something like JPA entities that only a framework should touch: no module can compile against it, but the framework can reflect into it.",
        },
        {
          type: "heading",
          text: "open module",
        },
        {
          type: "paragraph",
          text: "`open module com.shop.customers { exports com.shop.customers; }` opens every package in the module at run time. It's the blunt version, convenient for an application module full of framework-managed classes. It doesn't export anything by itself, and `javac` rejects `opens` directives inside it: `error: 'opens' only allowed in strong modules`. Jackson's own `jackson-annotations` JAR is an open module, as `jar --describe-module` shows in the production section.",
        },
        {
          type: "heading",
          text: "The command-line escape hatches",
        },
        {
          type: "paragraph",
          text: "Whoever launches the JVM can change the module graph without touching any `module-info.java`. These are the options I've used, all of which take `ALL-UNNAMED` as a target meaning \"the classpath\":",
        },
        {
          type: "table",
          headers: ["Option", "What it does", "javac", "java"],
          rows: [
            ["`--add-exports M/P=T`", "Module M exports package P to module T", "Yes", "Yes"],
            ["`--add-opens M/P=T`", "Module M opens package P to module T", "No (it warns \"has no effect at compile time\")", "Yes"],
            ["`--add-reads M=T`", "Module M reads module T", "Yes", "Yes"],
            ["`--add-modules M,...`", "Add root modules to resolve; `ALL-MODULE-PATH` adds everything on the module path", "Yes", "Yes"],
            ["`--limit-modules M,...`", "Shrink the set of observable modules", "Yes", "Yes"],
            ["`--patch-module M=path`", "Add or replace classes in module M, mainly for tests", "Yes", "Yes"],
          ],
        },
        {
          type: "paragraph",
          text: "For the reflection project, `java -p out --add-opens com.shop.customers/com.shop.customers=com.shop.inspect -m com.shop.app/com.shop.app.Main` printed `private field: asha@example.com` with the original, exports-only `module-info.java`. For an executable JAR started with `java -jar`, the same two permissions can go in the manifest as `Add-Exports: java.base/sun.security.util` and `Add-Opens: ...`, without a module name on the right because they always target the classpath; I checked `Add-Exports` with the `LegacyHex` example below.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Escape hatches are debts",
          text: "Every `--add-opens` on a command line is a place where some library depends on another module's internals. It works today and is exactly what the JDK maintainers are free to break in the next release. I'd keep each one with a comment saying which library needs it and why, and recheck it on every JDK upgrade.",
        },
      ],
    },
    {
      title: "Services: uses, provides and ServiceLoader",
      blocks: [
        {
          type: "paragraph",
          text: "Modules make one design problem sharper. If `com.shop.checkout` needs a payment processor, it could `requires com.shop.card` and call `new CardProcessor()`. Then checkout depends on every implementation, and adding a new payment method means changing checkout. The module system's answer is the `ServiceLoader` mechanism that has existed since Java 6, now declared in the module descriptor:",
        },
        {
          type: "list",
          items: [
            "An API module exports a **service type**, usually an interface.",
            "Provider modules `requires` the API module and declare `provides Service with Implementation`. They don't need to export anything.",
            "The consumer `requires` only the API module, declares `uses Service`, and asks `ServiceLoader` for whatever providers are present.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "plugins/src/com.shop.payment/module-info.java",
          code: `module com.shop.payment {
    exports com.shop.payment;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "plugins/src/com.shop.payment/com/shop/payment/PaymentProcessor.java",
          code: `package com.shop.payment;

public interface PaymentProcessor {
    String name();

    String pay(long paise);
}`,
        },
        {
          type: "code",
          language: "java",
          title: "plugins/src/com.shop.card/module-info.java",
          code: `module com.shop.card {
    requires com.shop.payment;
    provides com.shop.payment.PaymentProcessor
        with com.shop.card.CardProcessor;
    // no exports: nobody can name CardProcessor at compile time
}`,
        },
        {
          type: "code",
          language: "java",
          title: "plugins/src/com.shop.card/com/shop/card/CardProcessor.java",
          code: `package com.shop.card;

import com.shop.payment.PaymentProcessor;

public class CardProcessor implements PaymentProcessor {
    public String name() { return "card"; }

    public String pay(long paise) {
        return "charged " + paise + " paise to card ending 4242";
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "plugins/src/com.shop.upi/module-info.java",
          code: `module com.shop.upi {
    requires com.shop.payment;
    provides com.shop.payment.PaymentProcessor
        with com.shop.upi.UpiProcessor;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "plugins/src/com.shop.upi/com/shop/upi/UpiProcessor.java",
          code: `package com.shop.upi;

import com.shop.payment.PaymentProcessor;

public class UpiProcessor implements PaymentProcessor {
    private final String handle;

    private UpiProcessor(String handle) {
        this.handle = handle;
    }

    // A provider can be a static provider() method instead of a public no-arg constructor
    public static UpiProcessor provider() {
        return new UpiProcessor("shop@bank");
    }

    public String name() { return "upi"; }

    public String pay(long paise) {
        return "collected " + paise + " paise via " + handle;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "plugins/src/com.shop.checkout/module-info.java",
          code: `module com.shop.checkout {
    requires com.shop.payment;
    uses com.shop.payment.PaymentProcessor;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "plugins/src/com.shop.checkout/com/shop/checkout/Checkout.java",
          code: `package com.shop.checkout;

import com.shop.payment.PaymentProcessor;

import java.util.ServiceLoader;

public class Checkout {
    public static void main(String[] args) {
        ServiceLoader<PaymentProcessor> loader = ServiceLoader.load(PaymentProcessor.class);
        for (PaymentProcessor p : loader) {
            System.out.println(p.name() + ": " + p.pay(49_900)
                    + "  [" + p.getClass().getModule().getName() + "]");
        }
        long count = loader.stream().count();
        System.out.println(count + " payment processor(s) found");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `cd plugins
javac -d out --module-source-path src $(find src -name "*.java")
java -p out -m com.shop.checkout/com.shop.checkout.Checkout

# package each module as a JAR, then start without the UPI one
mkdir -p mods
for m in payment card upi checkout; do jar --create --file mods/com.shop.$m.jar -C out/com.shop.$m .; done
java -p mods/com.shop.payment.jar:mods/com.shop.card.jar:mods/com.shop.checkout.jar -m com.shop.checkout/com.shop.checkout.Checkout`,
        },
        {
          type: "output",
          text: `upi: collected 49900 paise via shop@bank  [com.shop.upi]
card: charged 49900 paise to card ending 4242  [com.shop.card]
2 payment processor(s) found

card: charged 49900 paise to card ending 4242  [com.shop.card]
1 payment processor(s) found`,
        },
        {
          type: "list",
          items: [
            "Checkout never mentions a card or UPI class, and neither provider exports a package. Taking `com.shop.upi.jar` off the module path removed UPI without recompiling anything. That's a plug-in system in four `module-info` files.",
            "Nobody requires `com.shop.card` or `com.shop.upi`, so how did they get into the boot layer? Service binding. `--show-module-resolution` printed `com.shop.checkout binds com.shop.card` and `com.shop.checkout binds com.shop.upi`: the resolver saw `uses` and pulled in every observable provider.",
            "`UpiProcessor` has a private constructor and a `public static provider()` method, which `ServiceLoader` prefers when it exists. Since the class is in a non-exported package, only `ServiceLoader` can create it.",
            "The iteration order came out UPI first. The `ServiceLoader` Javadoc doesn't define the order of providers from different modules in one layer, so I wouldn't rely on it; a consumer that needs one should pick by `name()`.",
            "`loader.stream()` returns `ServiceLoader.Provider` objects, which give the provider's type without instantiating it. That's useful for filtering by an annotation before paying for construction.",
          ],
        },
        {
          type: "paragraph",
          text: "On the classpath the same mechanism uses a text file, `META-INF/services/com.shop.payment.PaymentProcessor`, listing implementation class names. A modular JAR used on the classpath needs that file too, since `provides` only counts on the module path. JDBC drivers (`uses java.sql.Driver` in `java.sql`), the JDK's charsets and file systems, and Jackson's own `uses com.fasterxml.jackson.databind.Module` all work this way.",
        },
      ],
    },
    {
      title: "The JDK's Module Tools",
      blocks: [
        {
          type: "heading",
          text: "Listing and describing modules",
        },
        {
          type: "code",
          language: "bash",
          code: `java --list-modules | head -5
java --list-modules | wc -l
java --describe-module java.sql`,
        },
        {
          type: "output",
          text: `java.base@21.0.13.0.3
java.compiler@21.0.13.0.3
java.datatransfer@21.0.13.0.3
java.desktop@21.0.13.0.3
java.instrument@21.0.13.0.3
69
java.sql@21.0.13.0.3
exports java.sql
exports javax.sql
requires java.base mandated
requires java.transaction.xa transitive
requires java.logging transitive
requires java.xml transitive
uses java.sql.Driver`,
        },
        {
          type: "paragraph",
          text: "69 modules on my JDK 21: 22 `java.*` modules that are part of the Java SE specification, and 47 `jdk.*` modules specific to the JDK. `java.sql` is a good example of a descriptor done right: two exported packages, three transitive dependencies because its API mentions logging, XML and XA types, and a `uses` for JDBC drivers. `jar --describe-module --file x.jar` does the same for a JAR, which is how I checked every library in this lesson.",
        },
        {
          type: "heading",
          text: "jdeps: who depends on what",
        },
        {
          type: "paragraph",
          text: "`jdeps` reads class files and reports their dependencies, at the module, package or class level. On the shop app:",
        },
        {
          type: "code",
          language: "bash",
          code: `jdeps --module-path out -s -m com.shop.app
jdeps --module-path out --print-module-deps -m com.shop.app
jdeps --print-module-deps BootLayer.class`,
        },
        {
          type: "output",
          text: `com.shop.app -> com.shop.core
com.shop.app -> com.shop.money
com.shop.app -> com.shop.reports
com.shop.app -> java.base

com.shop.core,com.shop.reports,java.base

java.base,java.sql`,
        },
        {
          type: "list",
          items: [
            "`-s` (summary) lists module-level edges found in the bytecode. The app uses `com.shop.money` directly (it creates `Money` objects) even though it reads it only through `requires transitive`, and `jdeps` reports the real usage.",
            "`--print-module-deps` prints a comma-separated list meant to be pasted into `jlink --add-modules`. For a classpath application with no `module-info` at all, it's the quickest way to find out which JDK modules a custom runtime needs.",
            "For `BootLayer.class` it printed `java.base,java.sql` and missed `jdk.compiler`, which that program loads with `Class.forName(\"com.sun.source.tree.Tree\")`. `jdeps` only sees what's in the bytecode, so anything reached by reflection, service loading or a class name in a config file has to be added by hand.",
            "`jdeps --module-path out --check com.shop.core` printed the declared descriptor next to a suggested one, which is a quick way to find a `requires` nobody uses anymore.",
          ],
        },
        {
          type: "paragraph",
          text: "The most useful flag before a JDK upgrade is `--jdk-internals`, which lists every use of a JDK-internal API. The `LegacyHex` example below uses `sun.security.util.HexDumpEncoder`:",
        },
        {
          type: "code",
          language: "bash",
          code: `jdeps --jdk-internals LegacyHex.class`,
        },
        {
          type: "output",
          text: `LegacyHex.class -> java.base
   LegacyHex                                          -> sun.security.util.HexDumpEncoder                   JDK internal API (java.base)

Warning: JDK internal APIs are unsupported and private to JDK implementation that are
subject to be removed or changed incompatibly and could break your application.
Please modify your code to eliminate dependence on any JDK internal APIs.
For the most recent update on JDK internal API replacements, please check:
https://wiki.openjdk.org/display/JDK8/Java+Dependency+Analysis+Tool`,
        },
        {
          type: "paragraph",
          text: "For a class using `sun.misc.Unsafe` it printed `JDK internal API (jdk.unsupported)` and a suggested replacement table pointing at JEP 260. `sun.misc.Unsafe` is one of the few internals JEP 260 deliberately left accessible: `java --describe-module jdk.unsupported` shows `exports sun.misc` and `opens sun.misc`. Accessible isn't the same as supported, though; its memory-access methods have been deprecated for removal since JDK 23.",
        },
        {
          type: "heading",
          text: "jlink: a runtime with only the modules I need",
        },
        {
          type: "paragraph",
          text: "`jlink` takes a set of root modules, resolves them against the module path and the JDK's own modules, and writes a complete Java runtime containing just that graph. For the shop app:",
        },
        {
          type: "code",
          language: "bash",
          code: `cd shop
jlink --module-path out --add-modules com.shop.app --output image-plain

jlink --module-path out --add-modules com.shop.app \\
      --strip-debug --no-header-files --no-man-pages --compress zip-6 \\
      --launcher shop=com.shop.app/com.shop.app.Main \\
      --output image

du -sh image-plain image
image/bin/java --list-modules
image/bin/shop | head -1`,
        },
        {
          type: "output",
          text: `57M	image-plain
39M	image
com.shop.app
com.shop.core
com.shop.money
com.shop.reports
java.base@21.0.13.0.3
Total: Rs. 2220.00`,
        },
        {
          type: "list",
          items: [
            "Five modules, because nothing in the shop needs more than `java.base`. No service binding happens unless I ask for it with `--bind-services`.",
            "`--module-path out` didn't mention the JDK's modules. When the module path doesn't contain `java.base`, `jlink` adds the JDK's own `jmods` directory automatically.",
            "`--launcher shop=...` wrote a `bin/shop` script that runs the main class, so the image can be started without knowing any module names.",
            "`--strip-debug` removes debug attributes, line numbers included: a `NumberFormatException` run on this image showed `at java.base/java.lang.Integer.parseInt(Unknown Source)` where the full JDK shows `Integer.java:662`, `--no-header-files` and `--no-man-pages` drop files only developers need, and `--compress zip-6` compresses the class data inside `lib/modules`.",
          ],
        },
        {
          type: "paragraph",
          text: "The sizes, all measured on my machine with the Ubuntu build of OpenJDK 21 (other builds differ by a few megabytes):",
        },
        {
          type: "table",
          headers: ["What", "Size"],
          rows: [
            ["Full JDK 21 directory", "287 MB (206 MB without its `jmods` directory)"],
            ["Its `lib/modules`", "135 MB (141,113,413 bytes)"],
            ["`jlink` image, shop app, no options", "57 MB, `lib/modules` 30,574,581 bytes"],
            ["`jlink` image, shop app, stripped and `zip-6`", "39 MB, `lib/modules` 12,000,602 bytes"],
            ["Same, plus `--generate-cds-archive`", "64 MB"],
            ["`jlink --add-modules java.base` only, on Temurin 25", "61 MB"],
          ],
        },
        {
          type: "paragraph",
          text: "In the 39 MB image, 26 MB is one file, `lib/server/libjvm.so`, the HotSpot VM itself. Past that point, the class library is no longer what costs space. The Temurin 25 build I used ships no `jmods` directory at all, and `jlink` still worked, because JDK 24 added linking from the run-time image itself (JEP 493) as an option for those who build the JDK.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "jlink only takes real modules",
          text: "With the automatic `text.tools` module on the module path, `jlink` stopped with `Error: automatic module cannot be used with jlink: text.tools from file:///.../libs/text-tools-1.4.2.jar`. An automatic module reads the classpath, and an image has no classpath to satisfy that. Every module in an image needs a real `module-info.class`.",
        },
      ],
    },
    {
      title: "Module Import Declarations (JDK 25)",
      blocks: [
        {
          type: "paragraph",
          text: "The Packages lesson covered single-type imports and on-demand `import java.util.*;`. JDK 25 finalized a third kind (JEP 511): `import module M;` imports, on demand, every public top-level type in every package that M exports, plus the packages exported by modules M requires transitively. It needs JDK 25 (JDK 21 stops at `'.' expected`), and the code that uses it doesn't have to be in a module:",
        },
        {
          type: "code",
          language: "java",
          title: "ModuleImports.java",
          code: `import module java.base;      // every package java.base exports
import module java.sql;       // java.sql and javax.sql, plus java.logging and
                              // java.xml, which java.sql requires transitively
import java.sql.Timestamp;    // a single-type import beats both module imports

public class ModuleImports {
    public static void main(String[] args) {
        List<String> cities = List.of("Pune", "Kolkata");                 // java.util
        Path file = Path.of("orders.csv");                                 // java.nio.file
        Timestamp placed = Timestamp.valueOf("2026-11-13 10:15:00");       // java.sql
        Logger log = Logger.getLogger("orders");                           // java.logging
        DocumentBuilderFactory xml = DocumentBuilderFactory.newInstance(); // java.xml
        System.out.println(cities + " " + file + " " + placed);
        System.out.println(log.getName() + " " + xml.getClass().getModule().getName());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# JDK 25
javac ModuleImports.java && java ModuleImports`,
        },
        {
          type: "output",
          text: `[Pune, Kolkata] orders.csv 2026-11-13 10:15:00.0
orders java.xml`,
        },
        {
          type: "paragraph",
          text: "Two module imports, and `List`, `Path`, `Timestamp`, `Logger` and `DocumentBuilderFactory` from five packages in four modules all resolved. The single-type import of `java.sql.Timestamp` isn't decoration. Without it, JDK 25 refused:",
        },
        {
          type: "output",
          text: `ModuleImports.java:9: error: reference to Timestamp is ambiguous
        Timestamp placed = Timestamp.valueOf("2026-11-13 10:15:00");       // java.sql
        ^
  both class java.sql.Timestamp in java.sql and class java.security.Timestamp in java.security match
ModuleImports.java:9: error: reference to Timestamp is ambiguous
        Timestamp placed = Timestamp.valueOf("2026-11-13 10:15:00");       // java.sql
                           ^
  both class java.sql.Timestamp in java.sql and class java.security.Timestamp in java.security match
2 errors`,
        },
        {
          type: "list",
          items: [
            "Module imports are on-demand imports, so they have the same weakness: two imported packages with the same simple name make that name ambiguous, and a single-type import is how to choose. The classic pair is `java.util.Date` and `java.sql.Date`; here it was `java.security.Timestamp` from `java.base`.",
            "It's purely a compile-time convenience. The class file has the same references as with ordinary imports, and the module graph at run time is unchanged.",
            "JDK 25's compact source files (JEP 512) import `java.base` this way implicitly. A `Cart.java` with no class declaration and no import lines, whose `void main()` used `List`, `TreeMap` and `IO.println`, ran on JDK 25 with `java Cart.java`.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Following the shop app from source to `Total: Rs. 2220.00`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`javac --module-source-path src` finds four `module-info.java` files, one per module directory, and builds the module graph: `com.shop.app` requires `com.shop.core` and `com.shop.reports`, `com.shop.core` requires `com.shop.money` transitively, and every module requires `java.base`. A cycle or a module reading one package from two places stops compilation here.",
            "Each class is compiled with module-aware lookup. For `import com.shop.core.Order` in `com.shop.app`, `javac` checks that the app reads `com.shop.core` and that `com.shop.core` exports the package to it. For `Money`, readability comes through the transitive edge.",
            "`javac` writes `out/<module>/module-info.class` with the `Module` attribute (`ACC_MANDATED` for `java.base`, `ACC_TRANSITIVE` for money, the qualified export's target list) and the classes beside it.",
            "`java -p out -m com.shop.app/com.shop.app.Main`: the launcher's module finder scans `out`, treating each subdirectory as a module and reading its `module-info.class`.",
            "**Resolution.** Starting from the root `com.shop.app`, the resolver follows every `requires` through the module path and the JDK's own modules. A missing module is a `FindException` now, before any of my code runs. Then service binding adds the providers of everything in a `uses`, which brought the graph to 49 modules.",
            "**The boot layer.** The JVM checks that no class loader gets one package from two modules, creates the modules, maps them to loaders (my four to the application loader), and records the readability edges, including the implied one from app to money, and the exports.",
            "The application loader loads `com.shop.app.Main` from module `com.shop.app` and `main` starts.",
            "The first `new Order()` resolves the symbolic reference `com/shop/core/Order`. The loader finds the module from the package name, loads the class, and the access check confirms: `Order` is public, `com.shop.app` reads `com.shop.core`, and `com.shop.core` exports `com.shop.core` unconditionally.",
            "`Order.total()` calls `TaxTable.gstPercent`. Both are in `com.shop.core`, so only the ordinary class-level check runs; a module is never a wall to itself.",
            "`TaxReport.line` in `com.shop.reports` calls `TaxTable`: reports reads core, and the qualified export names reports, so access is granted. The same call from `com.shop.app` is what produced `IllegalAccessError` earlier.",
            "The `canRead` and `isExported` calls at the end just query the graph the JVM built in step 6.",
          ],
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "One module that uses every directive at least once, and a `Main` that prints its own descriptor through the `java.lang.module` API:",
        },
        {
          type: "code",
          language: "java",
          title: "glance/src/com.shop.glance/module-info.java",
          code: `module com.shop.glance {
    requires java.sql;                                    // plain dependency
    requires transitive java.logging;                     // my readers read it too
    requires static java.compiler;                        // compile time only

    exports com.shop.glance.api;                          // public API, to everyone
    exports com.shop.glance.internal to com.shop.reports; // qualified export

    opens com.shop.glance.model;                          // deep reflection, to everyone
    opens com.shop.glance.internal to com.shop.reports;   // qualified opens

    uses com.shop.glance.api.Greeter;                     // I look this service up
    provides com.shop.glance.api.Greeter                  // and I offer one implementation
        with com.shop.glance.internal.EnglishGreeter;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "glance/src/com.shop.glance/com/shop/glance/api/Greeter.java",
          code: `package com.shop.glance.api;

public interface Greeter {
    String greet(String name);
}`,
        },
        {
          type: "code",
          language: "java",
          title: "glance/src/com.shop.glance/com/shop/glance/internal/EnglishGreeter.java",
          code: `package com.shop.glance.internal;

import com.shop.glance.api.Greeter;

public class EnglishGreeter implements Greeter {
    public String greet(String name) {
        return "Hello, " + name;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "glance/src/com.shop.glance/com/shop/glance/model/Customer.java",
          code: `package com.shop.glance.model;

public class Customer {
    private String name = "Asha";
}`,
        },
        {
          type: "code",
          language: "java",
          title: "glance/src/com.shop.glance/com/shop/glance/api/Main.java",
          code: `package com.shop.glance.api;

import java.lang.module.ModuleDescriptor;
import java.util.ServiceLoader;
import java.util.TreeSet;

public class Main {
    public static void main(String[] args) {
        ModuleDescriptor d = Main.class.getModule().getDescriptor();
        System.out.println("module   " + d.name());
        System.out.println("requires " + new TreeSet<>(d.requires()));
        System.out.println("exports  " + new TreeSet<>(d.exports()));
        System.out.println("opens    " + new TreeSet<>(d.opens()));
        System.out.println("uses     " + d.uses());
        System.out.println("provides " + d.provides());
        for (Greeter g : ServiceLoader.load(Greeter.class)) {
            System.out.println(g.greet("Ravi"));
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `cd glance
javac -d out --module-source-path src $(find src -name "*.java")
java -p out -m com.shop.glance/com.shop.glance.api.Main`,
        },
        {
          type: "output",
          text: `src/com.shop.glance/module-info.java:7: warning: [module] module not found: com.shop.reports
    exports com.shop.glance.internal to com.shop.reports; // qualified export
                                                ^
src/com.shop.glance/module-info.java:10: warning: [module] module not found: com.shop.reports
    opens com.shop.glance.internal to com.shop.reports;   // qualified opens
                                              ^
2 warnings
module   com.shop.glance
requires [mandated java.base (@21.0.13.0.3), static java.compiler (@21.0.13.0.3), transitive java.logging (@21.0.13.0.3), java.sql (@21.0.13.0.3)]
exports  [com.shop.glance.api, com.shop.glance.internal to [com.shop.reports]]
opens    [com.shop.glance.internal to [com.shop.reports], com.shop.glance.model]
uses     [com.shop.glance.api.Greeter]
provides [com.shop.glance.api.Greeter with [com.shop.glance.internal.EnglishGreeter]]
Hello, Ravi`,
        },
        {
          type: "list",
          items: [
            "Qualified targets don't have to exist: `com.shop.reports` isn't anywhere, and `javac` only warned. That's deliberate, so a library can name a friend module that ships separately.",
            "A package can be both exported and opened (`com.shop.glance.internal`, each to one module), and a module can both use and provide the same service; `ServiceLoader` found the module's own provider.",
            "The `(@21.0.13.0.3)` after each JDK module is the version recorded at compile time, so it shows whatever JDK compiled the module. I sorted the sets with `TreeSet` because their iteration order isn't specified.",
            "Not shown, because they can't be combined with the above: `open module com.shop.glance { ... }`, which would forbid the two `opens` lines.",
          ],
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Reading the module graph from code",
        },
        {
          type: "paragraph",
          text: "The `Module` and `ModuleDescriptor` APIs answer the same questions as `--describe-module`, from inside a running program. A classpath program that inspects `java.sql` and `java.base`:",
        },
        {
          type: "code",
          language: "java",
          title: "ModuleExplorer.java",
          code: `import java.lang.module.ModuleDescriptor;
import java.util.stream.Collectors;

public class ModuleExplorer {
    public static void main(String[] args) {
        Module sql = ModuleLayer.boot().findModule("java.sql").orElseThrow();
        Module base = String.class.getModule();
        Module mine = ModuleExplorer.class.getModule();
        ModuleDescriptor d = sql.getDescriptor();

        System.out.println("exports:  " + d.exports().stream()
                .map(ModuleDescriptor.Exports::source).sorted().toList());
        System.out.println("requires: " + d.requires().stream()
                .map(r -> (r.modifiers().isEmpty() ? "" : r.modifiers().iterator().next()
                        .toString().toLowerCase() + " ") + r.name())
                .sorted().collect(Collectors.joining(", ")));
        System.out.println("uses:     " + d.uses());

        // readability is a directed edge
        System.out.println("java.sql reads java.base:  " + sql.canRead(base));
        System.out.println("java.base reads java.sql:  " + base.canRead(sql));
        System.out.println("unnamed reads java.sql:    " + mine.canRead(sql));

        // how much of java.base is public API?
        long all = base.getPackages().size();
        long exported = base.getPackages().stream().filter(base::isExported).count();
        System.out.println("java.base: " + all + " packages, " + exported + " exported to everyone");
    }
}`,
        },
        {
          type: "output",
          text: `exports:  [java.sql, javax.sql]
requires: mandated java.base, transitive java.logging, transitive java.transaction.xa, transitive java.xml
uses:     [java.sql.Driver]
java.sql reads java.base:  true
java.base reads java.sql:  false
unnamed reads java.sql:    true
java.base: 196 packages, 54 exported to everyone`,
        },
        {
          type: "list",
          items: [
            "Readability is directed: `java.sql` reads `java.base`, never the other way round. The unnamed module reads `java.sql` because it reads everything.",
            "`java.base` has 196 packages on JDK 21 and only 54 are exported to everyone. The other 142 are internals (`jdk.internal.*`, `sun.*`) or qualified exports to other JDK modules. On JDK 25 the same program printed 197 and 58. Before Java 9, every one of them was reachable from the classpath.",
            "I ran it on the `jlink` image of the shop app as well, and the first line threw `NoSuchElementException: No value present`: that image has no `java.sql`, so `findModule` came back empty. A custom runtime really contains only its graph.",
          ],
        },
        {
          type: "heading",
          text: "Packaging and running modular JARs",
        },
        {
          type: "paragraph",
          text: "Directories are fine for experiments, but modules ship as JARs. A modular JAR is built with the normal `jar` tool; the module version and main class become part of the descriptor:",
        },
        {
          type: "code",
          language: "bash",
          code: `cd shop
mkdir -p mods
for m in money core reports; do
  jar --create --file mods/com.shop.$m.jar --module-version 1.0 -C out/com.shop.$m .
done
jar --create --file mods/com.shop.app.jar --module-version 1.0 \\
    --main-class com.shop.app.Main -C out/com.shop.app .

jar --describe-module --file mods/com.shop.core.jar
jar --describe-module --file mods/com.shop.app.jar
java -p mods -m com.shop.app | head -1`,
        },
        {
          type: "output",
          text: `com.shop.core@1.0 jar:file:///.../shop/mods/com.shop.core.jar!/module-info.class
exports com.shop.core
requires com.shop.money transitive
requires java.base mandated
qualified exports com.shop.internal to com.shop.reports

com.shop.app@1.0 jar:file:///.../shop/mods/com.shop.app.jar!/module-info.class
requires com.shop.core
requires com.shop.reports
requires java.base mandated
contains com.shop.app
main-class com.shop.app.Main

Total: Rs. 2220.00`,
        },
        {
          type: "paragraph",
          text: "`java -p mods -m com.shop.app` needed no class name, because `--main-class` stored it in the `ModuleMainClass` attribute. `contains` lists packages that are in the module but not exported. Everything is one directory of JARs, which is also the layout `jlink` and container images are built from.",
        },
        {
          type: "heading",
          text: "Calling a JDK internal, and replacing it",
        },
        {
          type: "paragraph",
          text: "Old code often reached into `sun.*` packages because they were there. This one prints a hex dump with `sun.security.util.HexDumpEncoder`:",
        },
        {
          type: "code",
          language: "java",
          title: "LegacyHex.java",
          code: `import sun.security.util.HexDumpEncoder;

public class LegacyHex {
    public static void main(String[] args) {
        byte[] bytes = "Pune".getBytes();
        System.out.println(new HexDumpEncoder().encode(bytes));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac LegacyHex.java
javac --add-exports java.base/sun.security.util=ALL-UNNAMED LegacyHex.java
java LegacyHex
java --add-exports java.base/sun.security.util=ALL-UNNAMED LegacyHex`,
        },
        {
          type: "output",
          text: `LegacyHex.java:1: error: package sun.security.util is not visible
import sun.security.util.HexDumpEncoder;
                   ^
  (package sun.security.util is declared in module java.base, which does not export it to the unnamed module)
1 error

Exception in thread "main" java.lang.IllegalAccessError: class LegacyHex (in unnamed module @0x2a139a55) cannot access class sun.security.util.HexDumpEncoder (in module java.base) because module java.base does not export sun.security.util to unnamed module @0x2a139a55
	at LegacyHex.main(LegacyHex.java:6)

0000: 50 75 6E 65 `,
        },
        {
          type: "list",
          items: [
            "`javac` refused, with the same \"not visible\" message as `com.shop.internal`, except the reader is \"the unnamed module\". The JDK's internals and my internals are protected by the same mechanism.",
            "`--add-exports` at compile time got it compiled. Run without the flag, the JVM's link-time check threw `IllegalAccessError` (`@0x2a139a55` is the unnamed module's identity and changes per run). With the flag on `java` as well, it worked. A JAR with `Add-Exports: java.base/sun.security.util` in its manifest also worked under `java -jar` with no flags.",
            "`jdeps --jdk-internals LegacyHex.class` flagged exactly this line, as shown in the tools section.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix is the supported API. Java 17 added `java.util.HexFormat`:",
        },
        {
          type: "code",
          language: "java",
          title: "HexNow.java",
          code: `import java.util.HexFormat;

public class HexNow {
    public static void main(String[] args) {
        byte[] bytes = "Pune".getBytes();
        System.out.println(HexFormat.ofDelimiter(" ").withUpperCase().formatHex(bytes));
    }
}`,
        },
        {
          type: "output",
          text: `50 75 6E 65`,
        },
        {
          type: "paragraph",
          text: "No flags, and `jdeps --jdk-internals HexNow.class` printed nothing.",
        },
        {
          type: "heading",
          text: "Two versions of one module, side by side",
        },
        {
          type: "paragraph",
          text: "The boot layer refuses two versions of a module. A program can still create its own **layers** at run time, each with its own class loader, which is how plug-in hosts and application servers load modules dynamically. Two versions of a tiny greeting module:",
        },
        {
          type: "code",
          language: "java",
          title: "layers/v1/src/module-info.java (v2 is identical)",
          code: `module com.shop.greeting {
    exports com.shop.greeting;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "layers/v1/src/com/shop/greeting/Greeting.java",
          code: `package com.shop.greeting;

public class Greeting {
    public static String hello(String name) {
        return "Hello, " + name;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "layers/v2/src/com/shop/greeting/Greeting.java",
          code: `package com.shop.greeting;

public class Greeting {
    public static String hello(String name) {
        return "Namaste, " + name + "!";
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "LayerDemo.java",
          code: `import java.lang.module.Configuration;
import java.lang.module.ModuleFinder;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class LayerDemo {
    public static void main(String[] args) throws Exception {
        ModuleLayer boot = ModuleLayer.boot();
        List<ClassLoader> loaders = new ArrayList<>();
        for (String dir : args) {
            // resolve com.shop.greeting from one directory, on top of the boot layer
            Configuration cf = boot.configuration()
                    .resolve(ModuleFinder.of(Path.of(dir)), ModuleFinder.of(), Set.of("com.shop.greeting"));
            ModuleLayer layer = boot.defineModulesWithOneLoader(cf, ClassLoader.getSystemClassLoader());

            Module m = layer.findModule("com.shop.greeting").orElseThrow();
            Class<?> greeting = m.getClassLoader().loadClass("com.shop.greeting.Greeting");
            Object text = greeting.getMethod("hello", String.class).invoke(null, "Asha");
            System.out.println(m.getDescriptor().toNameAndVersion() + " -> " + text);
            loaders.add(m.getClassLoader());
        }
        System.out.println("in the boot layer: " + boot.findModule("com.shop.greeting").isPresent());
        System.out.println("same class loader: " + (loaders.get(0) == loaders.get(1)));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `cd layers
for v in 1 2; do
  javac -d v$v/out $(find v$v/src -name "*.java")
  mkdir -p lib$v
  jar --create --file lib$v/com.shop.greeting-$v.0.jar --module-version $v.0 -C v$v/out .
done
javac LayerDemo.java && java LayerDemo lib1 lib2`,
        },
        {
          type: "output",
          text: `com.shop.greeting@1.0 -> Hello, Asha
com.shop.greeting@2.0 -> Namaste, Asha!
in the boot layer: false
same class loader: false`,
        },
        {
          type: "list",
          items: [
            "Each `Configuration` is resolved with the boot layer's configuration as its parent, so the new modules can read `java.base` and anything else in the boot layer. `defineModulesWithOneLoader` creates a fresh class loader per layer.",
            "Same module name, same package, same class name, two versions, one JVM. That's legal because they live in different layers with different loaders. Putting both JARs in one directory and resolving that gave `FindException: Two versions of module com.shop.greeting found in both (...)`, the same rule the boot layer applies.",
            "This is the mechanism, not something I'd hand-roll in a typical service. It's what a plug-in host builds on.",
          ],
        },
        {
          type: "heading",
          text: "The whole shop graph",
        },
        {
          type: "diagram",
          text: `                 ┌──────────────┐
                 │ com.shop.app │  exports nothing
                 └──┬────────┬──┘
           requires │        │ requires
                    ▼        ▼
     ┌─────────────────┐  ┌──────────────────┐
     │ com.shop.core   │◄─┤ com.shop.reports │
     │ exports         │  │ exports          │
     │  com.shop.core  │  │  com.shop.reports│
     │ exports to      │  └──────────────────┘
     │  reports:       │      requires core,
     │  com.shop.      │      may use internal
     │  internal       │
     └────────┬────────┘
              │ requires transitive
              ▼               app reads money too,
     ┌─────────────────┐      through core
     │ com.shop.money  │
     └────────┬────────┘
              ▼   (every module) requires mandated
         java.base`,
          caption: "Arrows are requires edges; the transitive one gives app an extra, implied edge to money.",
        },
      ],
    },
    {
      title: "When to Use Modules (and When the Classpath Is Fine)",
      blocks: [
        {
          type: "paragraph",
          text: "Every Java program already runs on a modular JDK. The decision is whether my own code gets `module-info.java` files. The capstone lesson, When to Use What in Java OOP, makes the same kind of call for classes and interfaces; this is the decision one level up, for whole components.",
        },
        {
          type: "table",
          headers: ["Situation", "My choice", "Why"],
          rows: [
            ["A library other teams depend on, with internals I want to change freely", "A real `module-info.java`; export only the API packages", "Strong encapsulation is the only way to make a public class non-API"],
            ["A library not ready for a descriptor", "`Automatic-Module-Name` in the manifest", "Gives modular users a stable name today"],
            ["A large codebase where teams keep reaching into each other's internals", "Modules (or at least build-tool boundaries) per component", "The compiler enforces the boundaries code review keeps missing"],
            ["A small runtime for a container, CLI tool or desktop app", "`jlink`, which needs every module to be explicit", "Tens of megabytes instead of a full JDK"],
            ["A plug-in system", "`uses` / `provides` with `ServiceLoader`, maybe layers", "Providers stay hidden and are found at run time"],
            ["A typical Spring Boot service", "The classpath, no `module-info`", "Spring and most of its dependencies are automatic modules, the Boot launcher runs from the classpath, and the framework needs deep reflection everywhere"],
            ["An application that uses `jlink` without being modular itself", "Classpath app + `jdeps --print-module-deps` + `jlink` of just the JDK modules", "Gets most of the size win with none of the migration"],
          ],
        },
        {
          type: "diagram",
          text: `Do other codebases compile against this code?
│
├─ yes ─► does it have internals that must stay changeable?
│         ├─ yes ─► module-info.java, export only the API
│         └─ no  ─► at least Automatic-Module-Name
│
└─ no ──► is it a framework-heavy app (Spring, JPA)?
          ├─ yes ─► stay on the classpath; to slim the
          │         image, jlink only the JDK modules that
          │         jdeps --print-module-deps reports
          │
          └─ no ──► do you need a small self-contained
                    runtime or enforced component walls?
                    ├─ yes ─► modules + jlink
                    └─ no  ─► the classpath is fine`,
          caption: "The question I ask first is who compiles against the code, not whether modules are modern.",
        },
        {
          type: "list",
          items: [
            "Modules pay for themselves where there's a boundary between people: a library and its users, or teams in one large codebase.",
            "Every `opens` I add for a framework is a sign that the module boundary and the framework are pulling in different directions. If the list of `opens` grows to cover every package, I'm getting little from the descriptor.",
            "Adding `module-info.java` to an application is a one-way door for its dependencies too: every JAR on the module path must have a unique name, no split packages, and no reliance on classpath-only tricks.",
            "Even without my own modules, the JDK's module system affects me: `--add-opens` flags after upgrades, `jdeps --jdk-internals` before them, and `jlink` for small images.",
          ],
        },
        {
          type: "heading",
          text: "A wrong choice and a right choice",
        },
        {
          type: "paragraph",
          text: "**Wrong:** adding a descriptor to a small Spring application just because modules are newer. A service that injects a notifier into an order service, with Spring Framework 6.2.11 on the module path:",
        },
        {
          type: "code",
          language: "java",
          title: "spring/src/com.shop.app/module-info.java",
          code: `module com.shop.app {
    requires spring.context;
    requires spring.beans;
    exports com.shop.app;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "spring/src/com.shop.app/com/shop/app/Main.java",
          code: `package com.shop.app;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.stereotype.Component;

public class Main {
    @Component
    public static class Notifier {
        public String send(String to) { return "sent to " + to; }
    }

    @Component
    public static class OrderService {
        @Autowired
        private Notifier notifier;      // field injection: needs deep reflection

        public String place(String customer) { return "order placed, " + notifier.send(customer); }
    }

    public static void main(String[] args) {
        try (var ctx = new AnnotationConfigApplicationContext(Notifier.class, OrderService.class)) {
            System.out.println(ctx.getBean(OrderService.class).place("Asha"));
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# Maven: org.springframework:spring-context:6.2.11 (brings spring-core, spring-beans,
# spring-aop, spring-expression, spring-jcl and micrometer-observation)
cd spring
javac -d out -p "$SPRING" --module-source-path src $(find src -name "*.java")
java -p "out:$SPRING" -m com.shop.app/com.shop.app.Main`,
        },
        {
          type: "output",
          text: `...
Exception in thread "main" org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'main.OrderService': Injection of autowired dependencies failed
	...
Caused by: java.lang.reflect.InaccessibleObjectException: Unable to make field private com.shop.app.Main$Notifier com.shop.app.Main$OrderService.notifier accessible: module com.shop.app does not "opens com.shop.app" to module spring.core
	...`,
        },
        {
          type: "list",
          items: [
            "The same class on the classpath runs fine. With the descriptor, Spring's field injection hit strong encapsulation: the field is private, the package is only exported, and `spring.core` (where Spring's `ReflectionUtils` lives) wasn't given `opens`.",
            "`opens com.shop.app to spring.core;` fixed it and printed `order placed, sent to Asha`. So did switching to constructor injection with no `opens` at all, because a public constructor of a public class in an exported package only needs `exports`.",
            "But look at what the descriptor bought: every Spring JAR here is an automatic module (`spring.core@6.2.11 automatic`, from its `Automatic-Module-Name`), so `jlink` can't use them, and each new package Spring scans needs another `opens`. For this kind of application, the classpath is the better choice.",
          ],
        },
        {
          type: "paragraph",
          text: "**Right:** the shop's `com.shop.core`. It's a library with one package of API (`com.shop.core`), one package of internals (`com.shop.internal`) that a sister module legitimately needs, and an API type from another module (`Money`). Three lines of descriptor gave me what the classpath can't express: `TaxTable` is invisible to the app at compile time, an old class file that still calls it fails with `IllegalAccessError` instead of silently working, `com.shop.reports` keeps access by name, and the app gets `Money` without having to know which module it lives in. The reason is the first branch of the decision flow: other code compiles against this module, and it has internals that must stay changeable.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Assuming a dependency's dependencies come along",
        },
        {
          type: "paragraph",
          text: "Requiring `com.shop.reports` didn't make `com.shop.core` readable, and the error said \"does not read it\", not \"does not export it\". Readability only travels through `requires transitive`, and that should be the declaring module's decision, made because its API mentions the other module's types. The two words in the message tell me which side to fix: \"does not read\" is the consumer's `requires`, \"does not export\" is the provider's `exports`.",
        },
        {
          type: "heading",
          text: "exports where opens was needed",
        },
        {
          type: "paragraph",
          text: "`exports` is enough for code that compiles against a package. It's not enough for a framework that calls `setAccessible(true)`: `module com.shop.customers does not \"opens com.shop.customers\" to module com.shop.inspect`. The production section has the Jackson version of this, and the Spring version is in When to Use. The fix is a qualified `opens` to the framework's module, not `open module` by reflex.",
        },
        {
          type: "heading",
          text: "Forgetting uses",
        },
        {
          type: "code",
          language: "java",
          title: "plugins/src/com.shop.checkout/module-info.java (broken)",
          code: `module com.shop.checkout {
    requires com.shop.payment;
}`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.util.ServiceConfigurationError: com.shop.payment.PaymentProcessor: module com.shop.checkout does not declare \`uses\`
	at java.base/java.util.ServiceLoader.fail(ServiceLoader.java:593)
	at java.base/java.util.ServiceLoader.checkCaller(ServiceLoader.java:579)
	at java.base/java.util.ServiceLoader.<init>(ServiceLoader.java:507)
	at java.base/java.util.ServiceLoader.load(ServiceLoader.java:1698)
	at com.shop.checkout/com.shop.checkout.Checkout.main(Checkout.java:9)`,
        },
        {
          type: "paragraph",
          text: "It compiled cleanly and failed at the `ServiceLoader.load` call. In a named module, `ServiceLoader` checks that the caller declared `uses`. Without it, the providers wouldn't have been bound into the graph anyway.",
        },
        {
          type: "heading",
          text: "Calling a requires static dependency without checking",
        },
        {
          type: "code",
          language: "java",
          title: "optional/src/com.shop.billing/com/shop/billing/Invoice.java (broken)",
          code: `package com.shop.billing;

public class Invoice {
    public static void issue(String customer, long paise) {
        System.out.println("Invoice for " + customer + ": " + paise + " paise");
        com.shop.audit.AuditLog.record("invoice issued to " + customer);   // no check
    }
}`,
        },
        {
          type: "output",
          text: `audit resolved: false
Invoice for Asha: 120000 paise
Exception in thread "main" java.lang.NoClassDefFoundError: com/shop/audit/AuditLog
	at com.shop.billing/com.shop.billing.Invoice.issue(Invoice.java:6)
	at com.shop.app/com.shop.app.Main.main(Main.java:9)
Caused by: java.lang.ClassNotFoundException: com.shop.audit.AuditLog
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:641)
	at java.base/jdk.internal.loader.ClassLoaders$AppClassLoader.loadClass(ClassLoaders.java:188)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:526)
	... 2 more`,
        },
        {
          type: "paragraph",
          text: "`requires static` makes the compiler happy and promises nothing at run time. Every use of the optional module has to sit behind a check, such as `ModuleLayer.boot().findModule(...)`, or behind a class that's only loaded when the module is present.",
        },
        {
          type: "heading",
          text: "A typo in exports",
        },
        {
          type: "code",
          language: "java",
          title: "reflect/src/com.shop.customers/module-info.java (typo)",
          code: `module com.shop.customers {
    exports com.shop.customer;
}`,
        },
        {
          type: "output",
          text: `src/com.shop.customers/module-info.java:2: error: package is empty or does not exist: com.shop.customer
    exports com.shop.customer;
                    ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The same check applies to `opens`: both name packages that must exist in the module.",
        },
        {
          type: "heading",
          text: "opens inside an open module",
        },
        {
          type: "code",
          language: "java",
          title: "reflect/src/com.shop.customers/module-info.java (redundant)",
          code: `open module com.shop.customers {
    exports com.shop.customers;
    opens com.shop.customers;
}`,
        },
        {
          type: "output",
          text: `src/com.shop.customers/module-info.java:3: error: 'opens' only allowed in strong modules
    opens com.shop.customers;
    ^
1 error`,
        },
        {
          type: "heading",
          text: "Two copies of a library on the module path",
        },
        {
          type: "paragraph",
          text: "On the classpath, an old and a new copy of the same library is a silent bug. On the module path, I copied `text-tools-1.4.2.jar` to `text-tools-1.5.0.jar` in the same `libs` directory:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -p out:libs -cp libs/ascii-legacy-0.9.jar -m com.shop.app/com.shop.app.Main`,
        },
        {
          type: "output",
          text: `Error occurred during initialization of boot layer
java.lang.module.FindException: Two versions of module text.tools found in libs (text-tools-1.5.0.jar and text-tools-1.4.2.jar)`,
        },
        {
          type: "paragraph",
          text: "Loud and early, which is the point. (The order of the two file names follows the directory listing.) If two directories on the module path each contain a module with the same name, the first directory wins without an error, so the module path isn't a substitute for dependency management in the build tool.",
        },
        {
          type: "heading",
          text: "Expecting jdeps to see everything",
        },
        {
          type: "paragraph",
          text: "`jdeps --print-module-deps` missed `jdk.compiler` for `BootLayer`, because the only reference was a string passed to `Class.forName`. A `jlink` image built from that list would have thrown `ClassNotFoundException` at that line. The same goes for JDBC drivers, logging back ends and anything else found by name or by `ServiceLoader`: those modules go into `--add-modules` by hand.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Name modules after their main package in reverse-DNS form (`com.shop.core`), and never after a JAR file. A module name is a public promise, like a package name.",
            "Export only API packages, and keep implementation in packages with `internal` or `impl` in the name so the descriptor reads honestly.",
            "Use `requires transitive` exactly when a dependency's types appear in my exported signatures, and compile libraries with `-Xlint:exports` so `javac` points out the ones I missed.",
            "Prefer qualified `opens ... to framework.module` over `opens P` to everyone, and both over `open module`. Opens exist for frameworks; every one should name the framework.",
            "Prefer constructor injection and records for framework-managed types. They need `exports`, not deep reflection, as the Spring and Jackson experiments showed.",
            "Use `ServiceLoader` with `uses` and `provides` to break dependencies from a consumer to its implementations, instead of a qualified export of an `impl` package.",
            "Publish `Automatic-Module-Name` in every library JAR that doesn't have a descriptor yet.",
            "Run `jdeps --jdk-internals` in the build before every JDK upgrade, and keep every `--add-opens` and `--add-exports` in one documented place with the reason next to it.",
            "When building `jlink` images, keep `--generate-cds-archive` in mind (next section), and think twice about `--strip-debug` for services whose stack traces I'll need to read.",
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
            "Module checks don't add a cost per call. Readability and exports are checked when a symbolic reference is resolved, the same moment the class-level access check runs, and the result is reused for that constant pool entry.",
            "Resolution happens once at startup. For the shop app it built a 49-module graph (5 with `--limit-modules`); this is milliseconds of work, but it isn't free, which shows in the next measurement.",
            "`jlink` images are smaller, not automatically faster. Whether they start faster depends on class data sharing (CDS), not on the module count.",
          ],
        },
        {
          type: "paragraph",
          text: "I timed 40 starts of the shop app in each configuration and repeated that three times. These are averages from my machine on JDK 21 and only the relative differences mean anything:",
        },
        {
          type: "table",
          headers: ["How the shop app was started", "Average start-to-exit, three rounds"],
          rows: [
            ["Full JDK, classpath", "70 / 73 / 77 ms"],
            ["Full JDK, module path (`-p out -m ...`)", "97 / 100 / 104 ms"],
            ["`jlink` image, no options", "100 / 103 / 122 ms"],
            ["`jlink` image, stripped and `zip-6`", "122 / 123 / 126 ms"],
            ["`jlink` image, stripped, `zip-6` and `--generate-cds-archive`", "72 / 70 / 79 ms"],
          ],
        },
        {
          type: "paragraph",
          text: "Two surprises, and `-Xlog:cds` explained both:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xlog:cds -cp out/com.shop.app:out/com.shop.core:out/com.shop.reports:out/com.shop.money com.shop.app.Main
java -Xlog:cds -p out -m com.shop.app/com.shop.app.Main
image/bin/java -Xlog:cds -m com.shop.app/com.shop.app.Main`,
        },
        {
          type: "output",
          text: `[0.013s][info][cds] full module graph: enabled
...
[0.000s][info][cds] optimized module handling: disabled due to incompatible property: jdk.module.path=out
[0.000s][info][cds] optimized module handling: disabled due to incompatible property: jdk.module.main=com.shop.app
[0.012s][info][cds] optimized module handling: disabled
[0.012s][info][cds] full module graph: disabled
...
[0.005s][info][cds] Specified shared archive not found (.../shop/image/lib/server/classes.jsa)
[0.005s][info][cds] Initialize static archive failed.
[0.005s][info][cds] Unable to map shared spaces`,
        },
        {
          type: "list",
          items: [
            "The JDK's default CDS archive includes a pre-built boot layer for the default case. On the classpath it was used (`full module graph: enabled`). With `--module-path`, the module graph is different, so HotSpot resolved it from scratch: about 25 ms more on my machine.",
            "A `jlink` image has no CDS archive unless I ask for one, so every JDK class was loaded and verified the slow way. Compressing `lib/modules` with `zip-6` added decompression on top.",
            "`--generate-cds-archive` (a `jlink` plugin, listed by `jlink --list-plugins`) wrote `classes.jsa` into the image and brought startup back to the classpath numbers, at the cost of 25 MB (39 MB to 64 MB). While generating it, JDK 21 printed a long list of `Preload Warning: Cannot find java/util/logging/...` lines: the default class list mentions `java.logging` classes, and this image doesn't contain `java.logging`. The archive was still created.",
          ],
        },
        {
          type: "paragraph",
          text: "So for a container image, the size win is reliable (287 MB of JDK down to 39 to 64 MB), and the startup effect depends on CDS. For a long-running service, none of these milliseconds matter after the first second; for a CLI tool started thousands of times, they do.",
        },
      ],
    },
    {
      title: "Modules in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend has a fare-quote listener: another service publishes JSON quotes, and this one deserialises them with Jackson into an API class shared by several services. The team has just added `module-info.java` files so they can ship a small `jlink` image. The API lives in its own module, `com.rides.api`.",
        },
        {
          type: "heading",
          text: "Is Jackson a module?",
        },
        {
          type: "paragraph",
          text: "First I checked what Jackson 2.21 actually is on the module path. `jar --describe-module` first answered `No root module descriptor, specify --release`, because the descriptor isn't at the JAR's root:",
        },
        {
          type: "code",
          language: "bash",
          code: `# Maven: com.fasterxml.jackson.core:jackson-databind:2.21.7
# (brings com.fasterxml.jackson.core:jackson-core:2.21.7 and jackson-annotations:2.21)
jar --describe-module --file jackson-databind-2.21.7.jar --release 9
jar --describe-module --file jackson-annotations-2.21.jar`,
        },
        {
          type: "output",
          text: `releases: 9

com.fasterxml.jackson.databind@2.21.7 jar:file:///.../jackson-databind-2.21.7.jar!/META-INF/versions/9/module-info.class
exports com.fasterxml.jackson.databind
exports com.fasterxml.jackson.databind.annotation
...
requires com.fasterxml.jackson.annotation transitive
requires com.fasterxml.jackson.core transitive
requires java.base mandated
requires java.desktop static
requires java.logging
requires java.sql static
requires java.xml static
uses com.fasterxml.jackson.databind.Module
provides com.fasterxml.jackson.core.ObjectCodec with com.fasterxml.jackson.databind.ObjectMapper

com.fasterxml.jackson.annotation@2.21 jar:file:///.../jackson-annotations-2.21.jar!/module-info.class open
exports com.fasterxml.jackson.annotation
requires java.base mandated`,
        },
        {
          type: "list",
          items: [
            "Jackson 2.x ships real descriptors, inside `META-INF/versions/9` of a multi-release JAR (JEP 238), so the same JAR still runs on Java 8. On the module path these are named, explicit modules, not automatic ones, which matters for `jlink`.",
            "`requires java.sql static`, `java.xml static` and `java.desktop static`: Jackson's optional integrations, exactly the `requires static` pattern from earlier.",
            "`jackson-annotations` is an `open module`.",
          ],
        },
        {
          type: "heading",
          text: "The bug",
        },
        {
          type: "code",
          language: "java",
          title: "rides/src/com.rides.api/module-info.java",
          code: `module com.rides.api {
    exports com.rides.api;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "rides/src/com.rides.api/com/rides/api/FareQuote.java",
          code: `package com.rides.api;

public class FareQuote {
    private String rideId;
    private String zone;
    private long farePaise;
    private double surgeMultiplier;

    public String getRideId() { return rideId; }
    public String getZone() { return zone; }
    public long getFarePaise() { return farePaise; }
    public double getSurgeMultiplier() { return surgeMultiplier; }

    @Override
    public String toString() {
        return "FareQuote[" + rideId + ", " + zone + ", " + farePaise + " paise, x" + surgeMultiplier + "]";
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "rides/src/com.rides.service/module-info.java",
          code: `module com.rides.service {
    requires com.rides.api;
    requires com.fasterxml.jackson.databind;
}`,
        },
        {
          type: "code",
          language: "java",
          title: "rides/src/com.rides.service/com/rides/service/QuoteListener.java",
          code: `package com.rides.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rides.api.FareQuote;

public class QuoteListener {
    public static void main(String[] args) throws Exception {
        String json = """
                {"rideId":"R-1042","zone":"KOL-SALTLAKE","farePaise":28750,"surgeMultiplier":1.25}
                """;
        FareQuote quote = new ObjectMapper().readValue(json, FareQuote.class);
        System.out.println("received " + quote);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `cd rides
javac -d out -p "$JACKSON" --module-source-path src $(find src -name "*.java")
java -p "out:$JACKSON" -m com.rides.service/com.rides.service.QuoteListener`,
        },
        {
          type: "output",
          text: `Exception in thread "main" com.fasterxml.jackson.databind.exc.InvalidDefinitionException: Invalid type definition for type \`com.rides.api.FareQuote\`: Failed to call \`setAccess()\` on Field 'rideId' (of class \`com.rides.api.FareQuote\`) due to \`java.lang.reflect.InaccessibleObjectException\`, problem: Unable to make field private java.lang.String com.rides.api.FareQuote.rideId accessible: module com.rides.api does not "opens com.rides.api" to module com.fasterxml.jackson.databind
 at [Source: REDACTED (\`StreamReadFeature.INCLUDE_SOURCE_IN_LOCATION\` disabled); line: 1, column: 1]
	at com.fasterxml.jackson.databind@2.21.7/com.fasterxml.jackson.databind.exc.InvalidDefinitionException.from(InvalidDefinitionException.java:62)
	...
	at com.fasterxml.jackson.databind@2.21.7/com.fasterxml.jackson.databind.ObjectMapper.readValue(ObjectMapper.java:3922)
	at com.rides.service/com.rides.service.QuoteListener.main(QuoteListener.java:11)
Caused by: java.lang.IllegalArgumentException: Failed to call \`setAccess()\` on Field 'rideId' (of class \`com.rides.api.FareQuote\`) due to \`java.lang.reflect.InaccessibleObjectException\`, problem: Unable to make field private java.lang.String com.rides.api.FareQuote.rideId accessible: module com.rides.api does not "opens com.rides.api" to module com.fasterxml.jackson.databind
	at com.fasterxml.jackson.databind@2.21.7/com.fasterxml.jackson.databind.util.ClassUtil.checkAndFixAccess(ClassUtil.java:1052)
	...
Caused by: java.lang.reflect.InaccessibleObjectException: Unable to make field private java.lang.String com.rides.api.FareQuote.rideId accessible: module com.rides.api does not "opens com.rides.api" to module com.fasterxml.jackson.databind
	at java.base/java.lang.reflect.AccessibleObject.throwInaccessibleObjectException(AccessibleObject.java:391)
	...
	at java.base/java.lang.reflect.Field.setAccessible(Field.java:177)
	at com.fasterxml.jackson.databind@2.21.7/com.fasterxml.jackson.databind.util.ClassUtil.checkAndFixAccess(ClassUtil.java:1039)
	... 16 more`,
        },
        {
          type: "paragraph",
          text: "(Trimmed; the full trace is about 40 lines.) Since Java 9, stack frames carry the module, and its version when known: `com.fasterxml.jackson.databind@2.21.7/` before the class name. That alone says the failure is inside Jackson, triggered from `QuoteListener.java:11`.",
        },
        {
          type: "heading",
          text: "The fix",
        },
        {
          type: "code",
          language: "java",
          title: "rides/src/com.rides.api/module-info.java (fixed)",
          code: `module com.rides.api {
    exports com.rides.api;
    opens com.rides.api to com.fasterxml.jackson.databind;   // deep reflection for Jackson only
}`,
        },
        {
          type: "output",
          text: `received FareQuote[R-1042, KOL-SALTLAKE, 28750 paise, x1.25]`,
        },
        {
          type: "list",
          items: [
            "**What happened:** `FareQuote` has private fields and getters but no setters, so Jackson deserialises into the fields directly, which means `setAccessible(true)`. On the classpath that always worked. As soon as `com.rides.api` became a named module with only `exports`, strong encapsulation applied to Jackson exactly as it did to my `Inspector`. Nothing failed at compile time or at startup; it failed on the first message.",
            "**The fix** opens one package to one module. `com.rides.api` doesn't need to require Jackson for this, and no other module gains deep access. The target name has to match the module that actually calls `setAccessible`: `com.fasterxml.jackson.databind`, which the message names.",
            "**An alternative I verified:** turning `FareQuote` into `public record FareQuote(String rideId, String zone, long farePaise, double surgeMultiplier)` worked with `exports` alone. Jackson creates records through the public canonical constructor, which needs no deep reflection.",
            "**What I'd add:** a startup self-test that deserialises one sample of every API type, so a missing `opens` fails the deployment instead of the first real message.",
          ],
        },
        {
          type: "heading",
          text: "Shipping it as a small runtime",
        },
        {
          type: "code",
          language: "bash",
          code: `jlink --module-path "out:$JACKSON" --add-modules com.rides.service \\
      --strip-debug --no-header-files --no-man-pages --compress zip-6 \\
      --launcher quotes=com.rides.service/com.rides.service.QuoteListener \\
      --output rides-image
du -sh rides-image
rides-image/bin/java --list-modules
rides-image/bin/quotes`,
        },
        {
          type: "output",
          text: `41M	rides-image
com.fasterxml.jackson.annotation@2.21 open
com.fasterxml.jackson.core@2.21.7
com.fasterxml.jackson.databind@2.21.7
com.rides.api
com.rides.service
java.base@21.0.13.0.3
java.logging@21.0.13.0.3`,
        },
        {
          type: "output",
          text: `received FareQuote[R-1042, KOL-SALTLAKE, 28750 paise, x1.25]`,
        },
        {
          type: "list",
          items: [
            "41 MB for the whole runtime, against 287 MB for the JDK directory it came from (63 MB without the stripping and compression options). `java.logging` is in because `jackson-databind` requires it; `java.sql`, `java.xml` and `java.desktop` are out because those requires are `static`, and the service still worked.",
            "`jlink` accepted Jackson because its JARs have real descriptors. With the Spring example from When to Use, whose JARs are automatic modules, the same kind of command stopped with `Error: automatic module cannot be used with jlink: spring.core`.",
            "Adding `--generate-cds-archive` would cost about 25 MB and win back the startup time measured in Performance. For a listener that runs for days, I'd skip it; for a job started per message, I'd keep it.",
            "Because of `--strip-debug`, a production stack trace from this image would show `Unknown Source` instead of line numbers. Dropping that one option is the trade I'd make for a service.",
          ],
        },
      ],
    },
  ],
};
