import type { Lesson } from "../types";

export const packages: Lesson = {
  slug: "packages",
  date: "2026-11-11",
  title: "Packages",
  description:
    "How Java packages give classes a namespace, a folder on disk and a package-private boundary: package declarations and naming, javac -d and java -cp, every kind of import (and proof that imports never reach the class file), the unnamed package, subpackages, the classpath and JARs, package-info.java, runtime packages and sealing, JDK 25 module imports, package-by-feature design, and a Spring bean that component scanning never finds.",
  tags: ["Core Java", "Packages", "Imports", "Classpath"],
  sections: [
    {
      title: "What a Package Is",
      blocks: [
        {
          type: "paragraph",
          text: "Every program in Phase 5 lived in one folder with no `package` line at the top, which is fine for a lesson and hopeless for a real codebase. The When to Use What in Java OOP lesson ended with decisions about classes; this phase is about the level above them: how classes are grouped, named, found and hidden from each other.",
        },
        {
          type: "paragraph",
          text: "A **package** is a named group of related types (classes, interfaces, enums, records and annotation types). The JDK alone has two classes called `Date`: `java.util.Date` and `java.sql.Date`. They coexist because each one's real name includes its package. That's the first job of a package. The second is organisation: the package name is also a folder path, so `com.shop.order.Order` lives in `com/shop/order/Order.class`, and both `javac` and the class loader rely on that. The third job is the one I care about most as a designer: a package is an access boundary. A class or member with no access modifier is **package-private**, visible inside its package and nowhere else.",
        },
        {
          type: "paragraph",
          text: "The Encapsulation lesson used that fourth access level without saying much about where the boundary is. This lesson draws it: what counts as \"the same package\" at compile time, why `com.shop` and `com.shop.billing` are strangers, why the same package name loaded by two class loaders is two packages at run time, and how imports, the classpath and JAR files fit around all of it. The full access rules (`protected` across packages in particular) belong to the next lesson, Access Modifiers, and modules, which put a wall around whole groups of packages, come after that in Java Modules (JPMS).",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Simula 67 and Smalltalk had classes but no packages. Grouping declarations under a name with a hidden inside came from the modular languages: Modula-2 had modules with explicit import lists, and Ada (1983) used the word **package** for a unit with a public specification and a private body. C++ added `namespace` during its standardisation in the 1990s, for the same collision problem. Java 1.0 (1996) shipped with packages built in from day one, and the JDK itself was a handful of them: `java.lang`, `java.io`, `java.util`, `java.net`, `java.awt` and `java.applet` among them.",
        },
        {
          type: "paragraph",
          text: "Java's design choices were specific. A package name is hierarchical (`java.awt.image`), but the hierarchy is only for naming; `java.awt.image` gets no special access to `java.awt`. Package names map to directories so a tool can find a class from its name. To avoid collisions between companies, the JLS recommends building package names from a reversed internet domain. The first edition of the JLS (1996) actually suggested the top-level domain in capitals, as in `COM.JavaSoft.jag.Oak`; later editions switched to all-lowercase, which is what everyone writes today. And `java.lang` is imported into every file automatically, which is why `String` and `System` never need an import.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "Packages, `import`, the `CLASSPATH` variable, `java.util.Date`", "The namespace, the folder layout and the class path all date from here"],
            ["JDK 1.1 (1997)", "JAR files; JDBC with `java.sql.Date`", "One archive instead of a folder tree; the most famous name clash in the JDK"],
            ["Java 1.2 (1998)", "`java -jar` with `Main-Class` and `Class-Path` in the manifest; package sealing; `java.lang.Package` version attributes", "Runnable JARs, and the first tools against split packages"],
            ["Java 5 (2004)", "Static import (JSR 201); `package-info.java` for package annotations (JSR 175)", "`import static`, and a real file for package-level documentation and annotations"],
            ["Java 6 (2006)", "Class path wildcards (`-cp 'lib/*'`)", "Every JAR in a folder without listing each one, in an unspecified order"],
            ["Java 9 (2017)", "Modules (JEP 261); `--class-path`; `Class.getPackageName()`", "Split packages forbidden between named modules; packages can be hidden from other modules"],
            ["Java 21 (2023)", "Unnamed classes and instance main methods, preview (JEP 445)", "The first step towards source files without a class or package"],
            ["Java 25 (2025)", "Module import declarations (JEP 511, previewed by JEPs 476 and 494); compact source files (JEP 512)", "`import module java.base;` imports every package a module exports; compact source files get it implicitly"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a company in an office building, with departments.",
        },
        {
          type: "list",
          items: [
            "The **company's web domain** is the package prefix. Example Shop owns `example.com`, so its packages start with `com.example`. Nobody else should be using that prefix.",
            "A **department** (Accounts, Shipping) is a package. An **employee** is a class.",
            "Two employees called Asha, one in Accounts and one in Shipping, are `java.util.Date` and `java.sql.Date`. Inside a department, \"Asha\" is unambiguous. Across the company, I need \"Asha from Accounts\", the **fully qualified name**.",
            "My **phone contacts** are imports. Saving \"Asha\" as a contact lets me tap a short name, but the phone still dials the full number. If I save two Ashas under the same name, the phone can't decide, which is `reference to Date is ambiguous`. And the contacts list lives on my phone, not in the call: the class file only ever contains full names.",
            "The **emergency numbers** that every phone has without saving them are `java.lang`.",
            "The **staff-only door** of a department is package-private: anyone in the department walks through, nobody else does.",
            "**Accounts** and **Accounts Payroll** are two departments with similar names. Payroll staff don't get a key to Accounts' staff-only door just because their name starts with \"Accounts\". That's a subpackage.",
            "The **reception desk with the building directory** is the class loader with the classpath. Asked for \"Accounts, Asha\", it checks the floors in the order listed and sends the visitor to the first match, even if a newer Asha sits on a higher floor.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down. In a real company, a department name means one department. In the JVM, a package at run time is the pair (class loader, package name), so two class loaders that each load `com.shop.stock` create two departments with the same name in two buildings, and the staff-only door between them is locked; the Runtime Packages section shows the `IllegalAccessError`. And real sub-departments usually report to their parent and share some access. Java subpackages share nothing except the beginning of their name.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The package declaration",
        },
        {
          type: "code",
          language: "java",
          code: `package com.shop.order;          // the package declaration

import java.util.List;            // imports come after it

public class Order { }            // then the type declarations`,
        },
        {
          type: "list",
          items: [
            "A source file (the JLS calls it a **compilation unit**) has at most one `package` declaration, and it must come first: before every import and every type. Only comments, and annotations in `package-info.java`, may come before it.",
            "Every type declared in the file belongs to that package. There's no way to put two classes from one file into different packages.",
            "A file with no `package` declaration belongs to the **unnamed package**. It exists for small experiments; the Unnamed Package section shows why real code avoids it.",
            "A file may declare any number of top-level types, but at most one of them may be `public`, and `javac` insists that the public one lives in a file named after it. A package-private top-level class can share a file with others.",
          ],
        },
        {
          type: "heading",
          text: "Naming conventions",
        },
        {
          type: "table",
          headers: ["Rule", "Example", "Why"],
          rows: [
            ["Start with a reversed domain the team controls", "`com.example.shop`, `org.apache.commons.lang3`", "Globally unique without a registry (JLS 6.1)"],
            ["All lowercase", "`com.example.shop.order`, not `com.example.Shop.Order`", "Avoids clashing with type names, and with case-insensitive file systems"],
            ["Short, singular nouns per level", "`order`, `payment`, `shipping`", "Reads naturally in imports: `com.example.shop.order.Order`"],
            ["Replace characters a name can't use", "`com.example_shop`, `com.example._123name`", "Hyphens, leading digits and keywords aren't legal identifiers"],
            ["Never start with `java` or `javax` for my own code", "-", "Both belong to the platform; the JVM refuses to define classes in `java.*` at all"],
          ],
        },
        {
          type: "paragraph",
          text: "The last rule isn't only style. `javac` happily compiled a class in `package java.shop;`, but running it failed with `java.lang.SecurityException: Prohibited package name: java.shop` from `ClassLoader.preDefineClass`. And `package java.lang;` didn't even compile: `error: package exists in another module: java.base`.",
        },
        {
          type: "heading",
          text: "Five kinds of name for one class",
        },
        {
          type: "table",
          headers: ["Name", "For `Line`, nested in `com.shop.catalog.NestedNames`", "Where I see it"],
          rows: [
            ["Simple name", "`Line`", "Source code, after an import; `getSimpleName()`"],
            ["Fully qualified (canonical) name", "`com.shop.catalog.NestedNames.Line`", "Source code without an import; `getCanonicalName()`"],
            ["Binary name", "`com.shop.catalog.NestedNames$Line`", "`getName()`, `Class.forName`, `java -cp ... com.shop.App`"],
            ["Internal form", "`com/shop/catalog/NestedNames$Line`", "The class file's constant pool, `javap -v`, error messages like `wrong name`"],
            ["File path", "`com/shop/catalog/NestedNames$Line.class`", "The output of `javac -d`, entries in a JAR"],
          ],
        },
        {
          type: "paragraph",
          text: "For a top-level class the first four collapse to two spellings, `com.shop.order.Order` and `com/shop/order/Order`. The `$` only appears for nested classes, and the Examples section shows `Class.forName` failing when given the canonical name instead of the binary one.",
        },
        {
          type: "heading",
          text: "Members of a package, and what subpackage means",
        },
        {
          type: "paragraph",
          text: "The members of a package (JLS 7.1) are the top-level types declared in it and its **subpackages**. So `java.util.function` is a member of `java.util`, in the sense that it's named inside it. That's the only relationship. A wildcard import of `java.util.*` doesn't import `java.util.function.Function`, and a package-private member of `com.shop.Order` is invisible from `com.shop.billing`. To the compiler and the JVM, `com.shop` and `com.shop.billing` are as unrelated as `com.shop` and `org.apache`.",
        },
        {
          type: "heading",
          text: "Imports in one table",
        },
        {
          type: "table",
          headers: ["Kind (JLS)", "Syntax", "Brings into scope"],
          rows: [
            ["Single-type import (7.5.1)", "`import java.util.List;`", "One type, by simple name"],
            ["Type-import-on-demand (7.5.2)", "`import java.util.*;`", "Every public type in that one package, as needed; never subpackages"],
            ["Single-static-import (7.5.3)", "`import static java.lang.Math.max;`", "Every static member named `max` of `Math` (all overloads)"],
            ["Static-import-on-demand (7.5.4)", "`import static java.lang.Math.*;`", "Every accessible static member of `Math`"],
            ["Single-module-import (JDK 25, JEP 511)", "`import module java.base;`", "Every public type in every package the module exports, plus those of modules it `requires transitive`"],
            ["Implicit (7.3)", "nothing to write", "Every public type in `java.lang`, in every file"],
          ],
        },
        {
          type: "paragraph",
          text: "An import never makes anything accessible that wasn't already. It only lets me write a shorter name. `import com.shop.order.OrderRepository;` from another package fails with `OrderRepository is not public in com.shop.order` because the import names a type I'm not allowed to see, and the same type written fully qualified fails the same way.",
        },
        {
          type: "image",
          src: "/images/java/packages-classpath-lookup.svg",
          alt: "Left: a classes directory produced by javac -d, holding two packages drawn as dashed orange boundaries. com/shop/order contains Order.class and OrderService.class (public, blue) and OrderRepository.class (package-private, orange). com/shop/payment contains PaymentService.class (public) and CardGateway.class (package-private). Right: the application class loader's five steps for com.shop.order.Order: loadClass with the binary name of the class the running code refers to; ask the parent loaders first, which own java.* and javax.*; turn dots into slashes and add .class to get com/shop/order/Order.class; try each classpath entry left to right, where entry 1 classes/ has the file and entry 2 lib/shop-util.jar is not searched because the first match wins; defineClass, with the runtime package being the pair app class loader and com.shop.order. An arrow goes from entry 1 back to Order.class. A footer explains that package-private classes are invisible outside their package, with javac's error 'OrderRepository is not public in com.shop.order; cannot be accessed from outside package'.",
          caption: "The ShopApp layout from the Designing Packages section, with a second classpath entry added to show the search order. Each dashed box is a package-private boundary; the right side is what happens the first time running code needs Order.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The package lives in the class name",
        },
        {
          type: "paragraph",
          text: "A class file has no field that says \"package\". I compiled a small packaged class, with a package-private helper class in the same file, to see where the package went:",
        },
        {
          type: "code",
          language: "java",
          title: "Order.java",
          code: `package com.shop.order;

import java.util.ArrayList;
import java.util.List;

public class Order {
    private final List<OrderLine> lines = new ArrayList<>();

    public void add(String sku, int quantity, long pricePaise) {
        lines.add(new OrderLine(sku, quantity, pricePaise));
    }

    public long totalPaise() {
        long total = 0;
        for (OrderLine line : lines) {
            total += line.subtotal();
        }
        return total;
    }

    public static void main(String[] args) {
        Order order = new Order();
        order.add("PEN-01", 3, 2_500);
        order.add("BOOK-7", 1, 45_000);
        System.out.println("total paise: " + order.totalPaise());
    }
}

class OrderLine {                          // package-private, in the same file
    private final String sku;
    private final int quantity;
    private final long pricePaise;

    OrderLine(String sku, int quantity, long pricePaise) {
        this.sku = sku;
        this.quantity = quantity;
        this.pricePaise = pricePaise;
    }

    long subtotal() {
        return quantity * pricePaise;
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out src/com/shop/order/Order.java
find out -type f | sort
java -cp out com.shop.order.Order
javap -v -cp out com.shop.order.Order       # trimmed
javap -v -cp out com.shop.order.OrderLine   # trimmed`,
        },
        {
          type: "output",
          text: `out/com/shop/order/Order.class
out/com/shop/order/OrderLine.class
total paise: 52500

public class com.shop.order.Order
  flags: (0x0021) ACC_PUBLIC, ACC_SUPER
  this_class: #11                         // com/shop/order/Order
  super_class: #2                         // java/lang/Object
   #2 = Class              #4             // java/lang/Object
   #7 = Class              #8             // java/util/ArrayList
  #11 = Class              #13            // com/shop/order/Order
  #16 = Class              #17            // com/shop/order/OrderLine
  #22 = Class              #24            // java/util/List
  #32 = Class              #34            // java/util/Iterator
  ...
SourceFile: "Order.java"

class com.shop.order.OrderLine
  flags: (0x0020) ACC_SUPER
  this_class: #8                          // com/shop/order/OrderLine`,
        },
        {
          type: "list",
          items: [
            "`this_class` points at a `Class` constant holding `com/shop/order/Order`, the internal form of the binary name. The package is simply everything before the last slash. That string is the only record of the package in the class file.",
            "`-d out` made `javac` create `out/com/shop/order/` from the package declaration. The two top-level classes from one source file became two class files in the same folder, and `OrderLine.class` still says `SourceFile: \"Order.java\"`, which is how stack traces find the right file.",
            "`OrderLine` has flags `0x0020`, only `ACC_SUPER`. Package-private is the absence of `ACC_PUBLIC` (`0x0001`), not a flag of its own. The Access Modifiers lesson takes those flags apart for members too.",
            "Every type the class uses is in the constant pool by its full internal name: `java/util/ArrayList`, `java/util/List`, `java/util/Iterator` (from the for-each loop). There's no `import` anywhere in the `javap` output; `grep -ci import` on it printed `0`.",
          ],
        },
        {
          type: "heading",
          text: "Imports don't survive compilation: three files, one class file",
        },
        {
          type: "paragraph",
          text: "To prove that imports are purely a compile-time convenience, I wrote the same class three ways, with a wildcard import, with explicit imports, and with fully qualified names and no imports at all:",
        },
        {
          type: "code",
          language: "java",
          title: "Basket.java",
          code: `import java.util.*;

public class Basket {
    public static void main(String[] args) {
        List<String> items = new ArrayList<>();
        items.add("Pen");
        items.add("Book");
        Map<String, Integer> counts = new HashMap<>();
        for (String item : items) counts.merge(item, 1, Integer::sum);
        System.out.println(items + " " + counts);
    }
}`,
        },
        {
          type: "paragraph",
          text: "The `explicit/` copy replaces the first line with four lines, `import java.util.ArrayList;`, `HashMap`, `List` and `Map`. The `fqn/` copy has no imports and writes `java.util.List<String> items = new java.util.ArrayList<>();` and so on. All three printed `[Pen, Book] {Book=1, Pen=1}`. Then I compared the class files:",
        },
        {
          type: "code",
          language: "bash",
          code: `cmp wild/Basket.class explicit/Basket.class
diff <(javap -v wild/Basket.class) <(javap -v explicit/Basket.class)   # trimmed
# recompile all three with -g:none (no debug attributes)
cmp wild/Basket.class explicit/Basket.class && echo identical
cmp wild/Basket.class fqn/Basket.class && echo identical
sha256sum */Basket.class`,
        },
        {
          type: "output",
          text: `wild/Basket.class explicit/Basket.class differ: byte 1817, line 11
136c136
<         line 3: 0
---
>         line 6: 0
186,192c186,192
<         line 5: 0
<         line 6: 8
...
identical
identical
5de8be51af1ff6fe781116ce4db53dcf9b075cc2dfdcf14ba555b973abe1fac8  explicit/Basket.class
5de8be51af1ff6fe781116ce4db53dcf9b075cc2dfdcf14ba555b973abe1fac8  fqn/Basket.class
5de8be51af1ff6fe781116ce4db53dcf9b075cc2dfdcf14ba555b973abe1fac8  wild/Basket.class`,
        },
        {
          type: "list",
          items: [
            "With default flags the files differed, and `javap` showed why: only the `LineNumberTable` changed, because the explicit version has three more import lines and every statement moved down by three. The bytecode and the constant pool were the same.",
            "With `-g:none`, which leaves out debug attributes, all three files were byte-for-byte identical: same size (1953 bytes), same SHA-256. A wildcard import, explicit imports and no imports at all compile to the same class.",
            "So imports can't cost anything at run time, and a wildcard can't make a program load more classes. The class loader only ever sees fully qualified names, and it loads a class when code first uses it, not when it's imported.",
          ],
        },
        {
          type: "heading",
          text: "How javac resolves a simple name",
        },
        {
          type: "paragraph",
          text: "When `javac` sees a simple type name like `List`, it looks in this order and stops at the first scope that has it (JLS 6.4.1 for shadowing, 6.5 and 7.5 for the details):",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Types in scope at that point: type parameters, nested and inherited member types, local classes, and the top-level types declared in this same file.",
            "Single-type imports of this file. A single-type import that clashes with a type declared in the same file is a compile error; one that matches a type from another file of the same package shadows it.",
            "Top-level types of the current package, from any of its files.",
            "Type-import-on-demand declarations, including the implicit `import java.lang.*;`. If two of them supply the name, it's ambiguous only if the name is actually used.",
            "On JDK 25, module imports, which on-demand imports shadow.",
          ],
        },
        {
          type: "paragraph",
          text: "Rules 2 to 4 are easy to see with a class in my own package that happens to be called `List`:",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/List.java",
          code: `package com.shop;

public class List {                          // a type in my own package called List
    public String toString() { return "com.shop.List"; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/WildcardCart.java",
          code: `package com.shop;

import java.util.*;                          // on-demand: loses to the same package

public class WildcardCart {
    public static void main(String[] args) {
        List items = new List();
        ArrayList<String> names = new ArrayList<>();   // still from java.util
        System.out.println("WildcardCart uses " + items + ", " + names.getClass().getName());
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/ExplicitCart.java",
          code: `package com.shop;

import java.util.List;                       // single-type: beats the same package

public class ExplicitCart {
    public static void main(String[] args) {
        List<String> items = List.of("Pen");
        System.out.println("ExplicitCart uses " + items.getClass().getName());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out src/com/shop/*.java
java -cp out com.shop.WildcardCart
java -cp out com.shop.ExplicitCart`,
        },
        {
          type: "output",
          text: `WildcardCart uses com.shop.List, java.util.ArrayList
ExplicitCart uses java.util.ImmutableCollections$List12`,
        },
        {
          type: "paragraph",
          text: "Same package, same simple name, opposite results. In `WildcardCart`, `com.shop.List` is a member of the current package, which beats `java.util.*`, while `ArrayList` still comes from the wildcard because nothing in `com.shop` is called that. In `ExplicitCart`, the single-type import outranks the package. `javap -v` on `WildcardCart` showed `#7 = Class // com/shop/List` next to `#10 = Class // java/util/ArrayList`: the decision is frozen into the class file.",
        },
        {
          type: "paragraph",
          text: "The nastier version of rule 3: `java.lang` is only an on-demand import, so a class in my package named `String` silently replaces `java.lang.String` in every file of that package. I added an empty `public class String { }` to `com.shop` (in `src/com/shop/String.java`) and compiled a normal-looking `main` next to it:",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/Greeter.java",
          code: `package com.shop;

public class Greeter {
    public static void main(String[] args) {
        System.out.println("Hello from Greeter");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out src/com/shop/String.java src/com/shop/Greeter.java
java -cp out com.shop.Greeter
javap -cp out com.shop.Greeter`,
        },
        {
          type: "output",
          text: `Error: Main method not found in class com.shop.Greeter, please define the main method as:
   public static void main(String[] args)
or a JavaFX application class must extend javafx.application.Application
Compiled from "Greeter.java"
public class com.shop.Greeter {
  public com.shop.Greeter();
  public static void main(com.shop.String[]);
}`,
        },
        {
          type: "paragraph",
          text: "It compiled without a warning. `javap` gives it away: the parameter is `com.shop.String[]`, so as far as the launcher is concerned there's no `main(java.lang.String[])`. JDK 25's launcher, which also accepts the new instance `main` forms, printed the same error.",
        },
        {
          type: "heading",
          text: "How the class loader turns a name into a file",
        },
        {
          type: "paragraph",
          text: "At run time the names come out of constant pools. The first time running code needs `com/shop/order/Order`, the JVM asks the defining loader of the class that refers to it, here the application class loader, to load `com.shop.order.Order`. As the diagram above shows, on JDK 21 that loader first checks whether the package belongs to a named module, then asks its parents (the platform loader, then the bootstrap loader, which own the JDK's packages), and only then searches the classpath: it turns the name into the relative path `com/shop/order/Order.class` and tries each classpath entry in order, a directory or a JAR. **The first entry that has the file wins**, and the rest are never consulted for that class.",
        },
        {
          type: "paragraph",
          text: "To watch the first-match rule, I built two versions of the same class into two JARs. Version 1.0 of `com.shop.tax.TaxRate` returns 12 percent, version 2.0 returns 18:",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/app/Bill.java",
          code: `package com.shop.app;

import com.shop.tax.TaxRate;

public class Bill {
    public static void main(String[] args) {
        long paise = 10_000;
        System.out.println("TaxRate " + TaxRate.version() + ": "
                + paise + " + " + TaxRate.percent() + "% = " + (paise + paise * TaxRate.percent() / 100));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# tax-1.0.jar and tax-2.0.jar each hold com/shop/tax/TaxRate.class
# (version() returns "1.0" or "2.0", percent() returns 12 or 18)
javac -d classes -cp tax-2.0.jar src/com/shop/app/Bill.java
java -cp classes:tax-2.0.jar:tax-1.0.jar com.shop.app.Bill
java -cp classes:tax-1.0.jar:tax-2.0.jar com.shop.app.Bill
java -Xlog:class+load -cp classes:tax-1.0.jar:tax-2.0.jar com.shop.app.Bill | grep com.shop`,
        },
        {
          type: "output",
          text: `TaxRate 2.0: 10000 + 18% = 11800
TaxRate 1.0: 10000 + 12% = 11200
[0.027s][info][class,load] com.shop.app.Bill source: file:/.../classes/
[0.032s][info][class,load] com.shop.tax.TaxRate source: file:/.../tax-1.0.jar`,
        },
        {
          type: "list",
          items: [
            "Same `Bill.class`, same two JARs, different answers. Only the order of the `-cp` entries changed. Nothing warned me that a second `TaxRate` existed.",
            "`-Xlog:class+load` (or the older `-verbose:class`) prints where every class came from. I shortened the scratch-directory paths to `/...`; the timestamps vary per run. It's the fastest way to answer \"which JAR did this class come from?\".",
            "`Bill` was compiled against 2.0 and ran against 1.0 without complaint, because both have the same methods. When the newer API has a method the older class lacks, the same mistake ends in `NoSuchMethodError` instead, which the production section reproduces.",
          ],
        },
      ],
    },
    {
      title: "Declaring a Package and Laying Out the Folders",
      blocks: [
        {
          type: "paragraph",
          text: "The smallest packaged program, and the layout I use for every multi-package demo in this lesson: sources under `src/` in folders that match the package, compiled classes under `out/`.",
        },
        {
          type: "diagram",
          text: `shop/
├── src/
│   └── com/
│       └── shop/
│           └── App.java        package com.shop;
└── out/                        created by  javac -d out
    └── com/
        └── shop/
            └── App.class       binary name com.shop.App`,
          caption: "The source folder layout is a convention; the output layout under -d is not optional.",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/App.java",
          code: `package com.shop;

public class App {
    public static void main(String[] args) {
        System.out.println("Running " + App.class.getName());
        System.out.println("package: " + App.class.getPackageName());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out src/com/shop/App.java
find out -type f
java -cp out com.shop.App`,
        },
        {
          type: "output",
          text: `out/com/shop/App.class
Running com.shop.App
package: com.shop`,
        },
        {
          type: "list",
          items: [
            "`-d out` tells `javac` where the root of the output tree is. It creates `com/shop/` under it from the `package` line, not from where the source file sits.",
            "`-cp out` (or `-classpath out`, or `--class-path out` since JDK 9) says where the root of the class tree is. The argument after it is the **binary name** of the class, `com.shop.App`, not a path.",
            "The launcher is forgiving about one thing: `java -cp out com/shop/App` also worked for me, because it converts slashes to dots. It isn't forgiving about anything else.",
          ],
        },
        {
          type: "heading",
          text: "Three ways to get \"Could not find or load main class\"",
        },
        {
          type: "code",
          language: "bash",
          code: `java -cp out App                    # simple name instead of the binary name
cd out/com/shop && java App         # running from inside the package folder
java -cp out com.shop.App.class     # a file name instead of a class name`,
        },
        {
          type: "output",
          text: `Error: Could not find or load main class App
Caused by: java.lang.ClassNotFoundException: App

Error: Could not find or load main class App
Caused by: java.lang.NoClassDefFoundError: App (wrong name: com/shop/App)

Error: Could not find or load main class com.shop.App.class
Caused by: java.lang.ClassNotFoundException: com.shop.App.class`,
        },
        {
          type: "list",
          items: [
            "The first and third are plain `ClassNotFoundException`s: the loader turned the name into `App.class` or `com/shop/App/class.class`, looked in `out/`, and found nothing.",
            "The second is the interesting one. Inside `out/com/shop`, the default classpath is `.`, so the loader looked for `./App.class` and **found a file**. But when it parsed it, `this_class` said `com/shop/App`, not `App`, and the JVM refuses to define a class under a name that doesn't match the file's contents. Hence `NoClassDefFoundError: App (wrong name: com/shop/App)`.",
            "I got the identical `wrong name` error by compiling `App.java` **without** `-d` in a flat folder (`javac App.java` writes `App.class` right next to the source, package or not) and running `java App` there. The class file is fine; it's in a folder that doesn't match its package.",
          ],
        },
        {
          type: "heading",
          text: "Where the source files have to be",
        },
        {
          type: "paragraph",
          text: "When I name source files on the command line, `javac` doesn't care which folder they're in; the `package` line decides the package. The layout matters as soon as a tool has to **find** a source file from a type name. With `-sourcepath src`, compiling only the entry point pulls in everything it uses:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out -sourcepath src src/com/shop/app/ShopApp.java
find out -name '*.class' | sort`,
        },
        {
          type: "output",
          text: `out/com/shop/app/ShopApp.class
out/com/shop/order/Order.class
out/com/shop/order/OrderRepository.class
out/com/shop/order/OrderService.class
out/com/shop/payment/CardGateway.class
out/com/shop/payment/PaymentService.class`,
        },
        {
          type: "paragraph",
          text: "That's the multi-package `ShopApp` from the Designing Packages section. `javac` saw `import com.shop.order.OrderService;`, looked for `src/com/shop/order/OrderService.java`, and compiled it too, then the same for everything that imported. The source launcher does the same since JDK 22 (JEP 458): on JDK 25, `java src/com/shop/app/ShopApp.java` ran the whole program from source, while JDK 21's launcher, which only handles a single file, failed with `package com.shop.order does not exist`. Maven and Gradle depend on the same convention through `src/main/java`.",
        },
        {
          type: "heading",
          text: "Mistakes in the declaration itself",
        },
        {
          type: "code",
          language: "java",
          title: "Main.java",
          code: `package com.shop;

public class Order {
}`,
        },
        {
          type: "output",
          text: `Main.java:3: error: class Order is public, should be declared in a file named Order.java
public class Order {
       ^
1 error`,
        },
        {
          type: "code",
          language: "java",
          title: "Late.java",
          code: `import java.util.List;
package com.shop;

public class Late {
}`,
        },
        {
          type: "output",
          text: `Late.java:2: error: class, interface, enum, or record expected
package com.shop;
^
1 error`,
        },
        {
          type: "code",
          language: "java",
          title: "Keyword.java",
          code: `package com.example.int;

public class Keyword {
}`,
        },
        {
          type: "output",
          text: `Keyword.java:1: error: <identifier> expected
package com.example.int;
                    ^
1 error`,
        },
        {
          type: "list",
          items: [
            "The public-class rule is enforced by `javac` because the compiler and the class loader find a public class by its name. A package-private `class Order` in `Main.java` compiles fine.",
            "Anything before `package` except comments is an error, and so is a second `package` line: it got the same `class, interface, enum, or record expected` message, because after the first declaration the parser only expects imports and types.",
            "Each segment of a package name has to be a legal identifier, so `int`, `class` or `2024` can't be one. JLS 6.1 suggests an underscore: a keyword gets one appended (`example.int` becomes `int_.example`), a leading digit gets one prepended (`com.example._123name`).",
            "`package Com.Shop;` compiled without a murmur and produced `out/Com/Shop/Upper.class`. Uppercase package names are only a convention violation, but on a case-insensitive file system (macOS and Windows defaults) `Com/Shop` and `com/shop` are the same folder, which is a reason to never mix them.",
          ],
        },
      ],
    },
    {
      title: "Imports in Depth",
      blocks: [
        {
          type: "heading",
          text: "Single-type imports and fully qualified names",
        },
        {
          type: "paragraph",
          text: "Both `Date` classes in one program: one gets the import, the other is written out in full.",
        },
        {
          type: "code",
          language: "java",
          title: "TwoDates.java",
          code: `import java.util.Date;                                   // the simple name Date now means java.util.Date

public class TwoDates {
    public static void main(String[] args) {
        Date created = new Date(0L);                         // java.util.Date, via the import
        java.sql.Date due = java.sql.Date.valueOf("2026-11-20"); // the other one, fully qualified

        System.out.println(created.getClass().getName() + " -> " + created.toInstant());
        System.out.println(due.getClass().getName() + "  -> " + due);
        System.out.println("java.sql.Date extends java.util.Date: " + (due instanceof Date));
    }
}`,
        },
        {
          type: "output",
          text: `java.util.Date -> 1970-01-01T00:00:00Z
java.sql.Date  -> 2026-11-20
java.sql.Date extends java.util.Date: true`,
        },
        {
          type: "paragraph",
          text: "A fully qualified name works anywhere, with or without imports, for any type I'm allowed to access. It's the right tool when a file genuinely needs two types with the same simple name. The last line is a reminder that a name clash says nothing about the types: `java.sql.Date` is a subclass of `java.util.Date`, sharing the simple name on purpose.",
        },
        {
          type: "heading",
          text: "When two wildcards supply the same name",
        },
        {
          type: "code",
          language: "java",
          title: "DateClash.java",
          code: `import java.util.*;
import java.sql.*;

public class DateClash {
    public static void main(String[] args) {
        Date today = new Date(0L);
        System.out.println(today);
    }
}`,
        },
        {
          type: "output",
          text: `DateClash.java:6: error: reference to Date is ambiguous
        Date today = new Date(0L);
        ^
  both class java.sql.Date in java.sql and class java.util.Date in java.util match
DateClash.java:6: error: reference to Date is ambiguous
        Date today = new Date(0L);
                         ^
  both class java.sql.Date in java.sql and class java.util.Date in java.util match
2 errors`,
        },
        {
          type: "paragraph",
          text: "The imports themselves are legal. A file with exactly these two imports that uses `List` and never `Date` compiled and ran for me. The error only appears where `Date` is used, once per use. The fix is a single-type import, which shadows both wildcards:",
        },
        {
          type: "code",
          language: "java",
          title: "SingleWins.java",
          code: `import java.util.*;
import java.sql.*;
import java.util.Date;              // single-type import: wins over both wildcards

public class SingleWins {
    public static void main(String[] args) {
        Date d = new Date(0L);
        List<Date> dates = List.of(d);
        Timestamp ts = new Timestamp(0L);   // from java.sql.*, no clash
        System.out.println(d.getClass().getName() + " " + dates.size() + " " + ts.getClass().getName());
    }
}`,
        },
        {
          type: "output",
          text: `java.util.Date 1 java.sql.Timestamp`,
        },
        {
          type: "paragraph",
          text: "Two single-type imports of the same simple name are not allowed at all, used or not. `import java.util.Date;` followed by `import java.sql.Date;` failed at the second line with `error: a type with the same simple name is already defined by the single-type-import of Date`.",
        },
        {
          type: "heading",
          text: "A wildcard doesn't reach subpackages",
        },
        {
          type: "code",
          language: "java",
          title: "NoSubpackages.java",
          code: `import java.util.*;

public class NoSubpackages {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>();
        Function<String, Integer> length = String::length;
        System.out.println(length.apply("Asha"));
    }
}`,
        },
        {
          type: "output",
          text: `NoSubpackages.java:6: error: cannot find symbol
        Function<String, Integer> length = String::length;
        ^
  symbol:   class Function
  location: class NoSubpackages
1 error`,
        },
        {
          type: "paragraph",
          text: "`Function` lives in `java.util.function`, a different package. `import java.util.*;` means \"the public types of `java.util`\", and there is no syntax for \"this package and everything below it\". The fix is `import java.util.function.Function;`.",
        },
        {
          type: "heading",
          text: "Static imports",
        },
        {
          type: "paragraph",
          text: "A static import brings in static members (fields, methods, nested types) so they can be used without the class name:",
        },
        {
          type: "code",
          language: "java",
          title: "StaticImports.java",
          code: `import static java.lang.Math.PI;
import static java.lang.Math.max;
import static java.lang.Math.*;

public class StaticImports {
    public static void main(String[] args) {
        double radius = 2.0;
        System.out.println(PI * radius * radius);
        System.out.println(max(3, 7) + " " + sqrt(16.0) + " " + abs(-5));
    }
}`,
        },
        {
          type: "output",
          text: `12.566370614359172
7 4.0 5`,
        },
        {
          type: "list",
          items: [
            "`import static java.lang.Math.max;` imports the **name** `max`, so every overload comes along: `max(int, int)`, `max(double, double)` and the rest. Overload resolution then works as usual.",
            "The single and the on-demand form can overlap, as here; it's redundant but legal.",
            "Static imports have the same ambiguity rule as type imports, and they also lose to the class's own members, including inherited ones. Both are traps:",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "StaticClash.java",
          code: `import static java.lang.Integer.*;
import static java.lang.Long.*;

public class StaticClash {
    public static void main(String[] args) {
        System.out.println(MAX_VALUE);
    }
}`,
        },
        {
          type: "output",
          text: `StaticClash.java:6: error: reference to MAX_VALUE is ambiguous
        System.out.println(MAX_VALUE);
                           ^
  both variable MAX_VALUE in Long and variable MAX_VALUE in Integer match
1 error`,
        },
        {
          type: "code",
          language: "java",
          title: "StaticShadow.java",
          code: `import static java.lang.Integer.*;
import static java.lang.Long.*;

public class StaticShadow {
    public static void main(String[] args) {
        System.out.println(parseInt("42") + parseLong("42"));
        System.out.println(toString(42));
    }
}`,
        },
        {
          type: "output",
          text: `StaticShadow.java:7: error: method toString in class Object cannot be applied to given types;
        System.out.println(toString(42));
                           ^
  required: no arguments
  found:    int
  reason: actual and formal argument lists differ in length
1 error`,
        },
        {
          type: "paragraph",
          text: "`parseInt` and `parseLong` resolved fine, each from its own import. But `toString` didn't even get as far as the imports: `StaticShadow` inherits `toString()` from `Object`, a member in scope inside the class body, and a member shadows any static import of the same name (JLS 6.4.1). So `javac` tried `Object.toString()` with an `int` argument. The error message never mentions `Integer`, which is exactly why a static import can make code harder to read: the reader has to know where every bare name comes from.",
        },
      ],
    },
    {
      title: "The Unnamed Package and Subpackages",
      blocks: [
        {
          type: "heading",
          text: "The unnamed package can't be imported",
        },
        {
          type: "paragraph",
          text: "A file without a `package` line belongs to the **unnamed package** (JLS 7.4.2). It's what made every earlier lesson's single-file demos convenient, and I keep using it below for demos that aren't about packages. In real code it's a dead end, because a class in a named package has no way to refer to a class in the unnamed one:",
        },
        {
          type: "code",
          language: "java",
          title: "src/PriceUtil.java",
          code: `public class PriceUtil {
    public static long withTax(long paise) {
        return paise + paise * 18 / 100;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/Checkout.java",
          code: `package com.shop;

import PriceUtil;

public class Checkout {
    public static void main(String[] args) {
        System.out.println(PriceUtil.withTax(10_000));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out src/PriceUtil.java src/com/shop/Checkout.java
# then delete the import line and compile again`,
        },
        {
          type: "output",
          text: `src/com/shop/Checkout.java:3: error: '.' expected
import PriceUtil;
                ^
1 error

src/com/shop/Checkout.java:6: error: cannot find symbol
        System.out.println(PriceUtil.withTax(10_000));
                           ^
  symbol:   variable PriceUtil
  location: class Checkout
1 error`,
        },
        {
          type: "list",
          items: [
            "An import has to name a package, so `import PriceUtil;` doesn't even parse. `javac` up to 1.3 accepted it anyway; JDK 1.4 brought the compiler in line with the JLS and has rejected it ever since.",
            "Without the import, the simple name `PriceUtil` is looked up in `com.shop`, then in the on-demand imports. The unnamed package is in neither place, even though both files were compiled in the same `javac` run into the same `out/`.",
            "Reflection is the only bridge: `Class.forName(\"PriceUtil\")` works, because at run time the class is just `PriceUtil` on the classpath. That's not a design, it's a workaround.",
            "Other reasons to avoid it: a named module can't contain the unnamed package at all, and frameworks that scan \"from the main class's package down\" would scan everything on the classpath if that package is the unnamed one. Spring Boot logs a warning for exactly that case: `Your ApplicationContext is unlikely to start due to a @ComponentScan of the default package.`",
          ],
        },
        {
          type: "heading",
          text: "Subpackages are strangers",
        },
        {
          type: "paragraph",
          text: "`com.shop.Order` has two package-private members. `com.shop.billing.Invoice` sits one folder down and imports `Order` correctly:",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/Order.java",
          code: `package com.shop;

public class Order {
    long totalPaise;                 // package-private: com.shop only

    public Order(long totalPaise) {
        this.totalPaise = totalPaise;
    }

    long discounted(int percent) {   // package-private too
        return totalPaise - totalPaise * percent / 100;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/billing/Invoice.java",
          code: `package com.shop.billing;

import com.shop.Order;

public class Invoice {
    public static void main(String[] args) {
        Order order = new Order(50_000);
        System.out.println("Total: " + order.totalPaise);
        System.out.println("After 10%: " + order.discounted(10));
    }
}`,
        },
        {
          type: "output",
          text: `src/com/shop/billing/Invoice.java:8: error: totalPaise is not public in Order; cannot be accessed from outside package
        System.out.println("Total: " + order.totalPaise);
                                            ^
src/com/shop/billing/Invoice.java:9: error: discounted(int) is not public in Order; cannot be accessed from outside package
        System.out.println("After 10%: " + order.discounted(10));
                                                ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "\"Outside package\" is literal: `com.shop.billing` is outside `com.shop`. The public constructor worked, and the package-private members didn't. This is the single most important consequence of how packages work for design: a package-private helper can only be shared by classes in **exactly** the same package, so a feature split across `com.shop.order` and `com.shop.order.internal` has to make the internal classes public, at which point anyone can use them. The Java Modules lesson shows the module system's answer, exporting `com.shop.order` and not `com.shop.order.internal`.",
        },
      ],
    },
    {
      title: "The Classpath and JAR Files",
      blocks: [
        {
          type: "paragraph",
          text: "The **classpath** is the ordered list of places the application class loader searches for classes and resources: directories (the root of a package tree, like `out/`) and JAR files. If neither `-cp` nor the `CLASSPATH` environment variable is set, it's just `.`, the current directory. Entries are separated by `:` on Linux and macOS and `;` on Windows (`File.pathSeparator`).",
        },
        {
          type: "paragraph",
          text: "My test setup: a tiny library class `com.shop.money.Money` packaged into `money.jar`, and an app in `com.shop.app` that uses it.",
        },
        {
          type: "code",
          language: "java",
          title: "lib-src/com/shop/money/Money.java",
          code: `package com.shop.money;

public final class Money {
    private Money() { }

    public static String format(long paise) {
        return "Rs. " + paise / 100 + "." + String.format("%02d", paise % 100);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "app-src/com/shop/app/App.java",
          code: `package com.shop.app;

import com.shop.money.Money;
import java.nio.file.Path;

public class App {
    public static void main(String[] args) throws Exception {
        System.out.println("Order total: " + Money.format(123_450));
        Path from = Path.of(Money.class.getProtectionDomain().getCodeSource().getLocation().toURI());
        System.out.println("Money loaded from: " + from.getFileName());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d lib-classes lib-src/com/shop/money/Money.java
jar --create --file money.jar -C lib-classes .
jar tf money.jar

javac -d classes -cp money.jar app-src/com/shop/app/App.java
java -cp classes com.shop.app.App                # forgot the JAR
java -cp classes:money.jar com.shop.app.App
CLASSPATH=classes:money.jar java com.shop.app.App`,
        },
        {
          type: "output",
          text: `META-INF/
META-INF/MANIFEST.MF
com/
com/shop/
com/shop/money/
com/shop/money/Money.class

Exception in thread "main" java.lang.NoClassDefFoundError: com/shop/money/Money
	at com.shop.app.App.main(App.java:8)
Caused by: java.lang.ClassNotFoundException: com.shop.money.Money
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:641)
	at java.base/jdk.internal.loader.ClassLoaders$AppClassLoader.loadClass(ClassLoaders.java:188)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:526)
	... 1 more

Order total: Rs. 1234.50
Money loaded from: money.jar

Order total: Rs. 1234.50
Money loaded from: money.jar`,
        },
        {
          type: "list",
          items: [
            "A JAR is a ZIP file with the same folder tree inside. `jar tf` shows `com/shop/money/Money.class` exactly where a directory entry would have it, plus a `META-INF/MANIFEST.MF` that the `jar` tool adds.",
            "The classpath matters twice. Compiling `App` without `-cp money.jar` failed with `error: package com.shop.money does not exist` and two `cannot find symbol` errors; `javac` needs the class files of everything it compiles against. Running without the JAR compiled fine and failed later.",
            "The run-time failure is a `NoClassDefFoundError` caused by a `ClassNotFoundException`, at `App.java:8`, the first line that touched `Money`, not at startup. Classes are loaded lazily, when code first needs them.",
            "`CLASSPATH` works, but it applies to every `java` command in that shell, which makes it a source of confusing behaviour. I only ever use `-cp`. One surprise when it's set: `.` stops being on the classpath. In a folder with `Hi.class`, `java Hi` worked, and `CLASSPATH=../money.jar java Hi` failed with `ClassNotFoundException: Hi` until I added `:.`.",
          ],
        },
        {
          type: "heading",
          text: "Executable JARs: Main-Class, Class-Path, and why -cp is ignored",
        },
        {
          type: "code",
          language: "bash",
          code: `jar --create --file app.jar --main-class com.shop.app.App -C classes .
java -cp money.jar -jar app.jar                  # -cp is ignored with -jar

printf 'Class-Path: money.jar\\n' > cp.txt
jar --create --file app2.jar --main-class com.shop.app.App --manifest cp.txt -C classes .
unzip -p app2.jar META-INF/MANIFEST.MF
java -jar app2.jar`,
        },
        {
          type: "output",
          text: `Exception in thread "main" java.lang.NoClassDefFoundError: com/shop/money/Money
	at com.shop.app.App.main(App.java:8)
Caused by: java.lang.ClassNotFoundException: com.shop.money.Money
...
Manifest-Version: 1.0
Class-Path: money.jar
Created-By: 21.0.13.0.3 (Ubuntu)
Main-Class: com.shop.app.App

Order total: Rs. 1234.50
Money loaded from: money.jar`,
        },
        {
          type: "list",
          items: [
            "`--main-class` writes `Main-Class: com.shop.app.App` into the manifest, so `java -jar app.jar` knows what to run. With `-jar`, the JAR itself **is** the classpath, and both `-cp` and `CLASSPATH` are silently ignored. That's why the first run couldn't find `Money` even though I passed `-cp money.jar`.",
            "The `Class-Path` manifest attribute is how an executable JAR names its dependencies: space-separated URLs, relative to the JAR's own location. With `money.jar` next to `app2.jar`, it ran.",
            "To run a JAR that has a `Main-Class` plus extra JARs from the command line, I skip `-jar` and name the class: `java -cp app.jar:money.jar com.shop.app.App` worked.",
            "Spring Boot's executable JARs work differently: `BOOT-INF/lib/` holds the dependency JARs and Spring Boot's own launcher class is the `Main-Class`. The Spring Boot track covers it.",
          ],
        },
        {
          type: "heading",
          text: "Wildcards and silent typos",
        },
        {
          type: "list",
          items: [
            "`-cp 'libs/*'` (quoted, so the shell doesn't expand it) means every `.jar` in `libs/`, not subfolders and not `.class` files. It worked with `app.jar` and `money.jar` in `libs/`. The JDK documentation says the order in which a wildcard's JARs are enumerated is **not specified**, which matters as soon as two JARs contain the same class.",
            "A classpath entry that doesn't exist is ignored without a warning. `java -cp classes:money.jar:no-such.jar com.shop.app.App` ran normally and exited with 0. A typo in a JAR name shows up only later, as a `NoClassDefFoundError` for whatever was in it.",
          ],
        },
      ],
    },
    {
      title: "package-info.java",
      blocks: [
        {
          type: "paragraph",
          text: "Some things belong to the package rather than to any class in it: the package's documentation, and annotations that apply to the whole package. Since Java 5 they go in a file called `package-info.java` in the package's folder. The hyphen is deliberate: `package-info` isn't a legal class name, so it can't clash with a real class.",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/order/package-info.java",
          code: `/**
 * Orders: placing, pricing and cancelling customer orders.
 * Only {@link com.shop.order.OrderService} is meant to be used from outside.
 */
@Owner("checkout-team")
package com.shop.order;

import com.shop.meta.Owner;`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/meta/Owner.java",
          code: `package com.shop.meta;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.PACKAGE)
public @interface Owner {
    String value();
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/order/OrderService.java",
          code: `package com.shop.order;

import com.shop.meta.Owner;

public class OrderService {
    public static void main(String[] args) {
        Package pkg = OrderService.class.getPackage();
        System.out.println("package: " + pkg.getName());
        System.out.println("owner:   " + pkg.getAnnotation(Owner.class).value());
        System.out.println("annotations: " + java.util.Arrays.toString(pkg.getAnnotations()));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out src/com/shop/meta/Owner.java src/com/shop/order/*.java
find out -type f | sort
java -cp out com.shop.order.OrderService
javap -v -p -cp out com.shop.order.package-info     # trimmed`,
        },
        {
          type: "output",
          text: `out/com/shop/meta/Owner.class
out/com/shop/order/OrderService.class
out/com/shop/order/package-info.class
package: com.shop.order
owner:   checkout-team
annotations: [@com.shop.meta.Owner("checkout-team")]

interface com.shop.order.package-info
  minor version: 0
  major version: 65
  flags: (0x1600) ACC_INTERFACE, ACC_ABSTRACT, ACC_SYNTHETIC
  this_class: #1                          // "com/shop/order/package-info"
  super_class: #3                         // java/lang/Object
  interfaces: 0, fields: 0, methods: 0, attributes: 2
...
{
}
SourceFile: "package-info.java"
RuntimeVisibleAnnotations:
  0: #8(#9=s#10)
    com.shop.meta.Owner(
      value="checkout-team"
    )`,
        },
        {
          type: "list",
          items: [
            "The annotation goes **before** `package`, the Javadoc comment before that, and imports after `package` as usual. Only one file per package may carry package annotations (JLS 7.4.1).",
            "`javac` compiled it into a synthetic interface named `package-info` (`ACC_SYNTHETIC`, no fields, no methods) whose only job is to carry the `RuntimeVisibleAnnotations` attribute. `Package.getAnnotation` reads it from there, which is why `Owner` needs `RetentionPolicy.RUNTIME`.",
            "With only a Javadoc comment and no annotations, `javac` doesn't write `package-info.class` at all; `-Xpkginfo:always` forces it. The Javadoc still matters: the `javadoc` tool turns it into the package's summary page, and it's the preferred successor to the older `package.html` files.",
            "Real uses: package-level nullness defaults like Spring's `@NonNullApi`, and JAXB's `@XmlSchema` for a package's XML namespace. Annotations get their own lesson later in this track.",
          ],
        },
      ],
    },
    {
      title: "Runtime Packages, Sealing and Split Packages",
      blocks: [
        {
          type: "heading",
          text: "A package at run time is (class loader, package name)",
        },
        {
          type: "paragraph",
          text: "At compile time a package is a name. At run time the JVM specification (JVMS 5.3) identifies a class by its binary name **and** its defining class loader, and puts it in a **run-time package** determined by the package name and that loader. Package-private access is checked against run-time packages (JVMS 5.4.4). So two classes that both say `package com.shop.stock;` are in the same package only if the same loader defined them. To see it fail, I put `Inventory` on the normal classpath and `Auditor`, which calls a package-private method of `Inventory`, in a separate folder that only a child class loader knows about:",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/stock/Inventory.java",
          code: `package com.shop.stock;

public class Inventory {
    static int reserved = 3;                    // package-private

    static String peek() {                      // package-private
        return "reserved=" + reserved;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "plugin-src/com/shop/stock/Auditor.java",
          code: `package com.shop.stock;

public class Auditor implements Runnable {
    @Override
    public void run() {
        System.out.println("Auditor sees " + Inventory.peek());
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/app/RuntimePackages.java",
          code: `package com.shop.app;

import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;

public class RuntimePackages {
    public static void main(String[] args) throws Exception {
        URL appDir = Path.of("classes").toUri().toURL();
        URL pluginDir = Path.of("plugin-classes").toUri().toURL();

        // 1. One loader defines both classes: one runtime package
        try (URLClassLoader shared = new URLClassLoader("shared",
                new URL[] {appDir, pluginDir}, ClassLoader.getPlatformClassLoader())) {
            run(shared, "one loader");
        }

        // 2. Auditor from a child loader, Inventory from the application loader
        try (URLClassLoader plugin = new URLClassLoader("plugin",
                new URL[] {pluginDir}, RuntimePackages.class.getClassLoader())) {
            run(plugin, "two loaders");
        }
    }

    static void run(ClassLoader loader, String label) throws Exception {
        Class<?> auditor = loader.loadClass("com.shop.stock.Auditor");
        Class<?> inventory = Class.forName("com.shop.stock.Inventory", false, loader);
        System.out.println(label + ": Auditor via " + auditor.getClassLoader().getName()
                + ", Inventory via " + inventory.getClassLoader().getName()
                + ", same Package? " + (auditor.getPackage() == inventory.getPackage()));
        try {
            ((Runnable) auditor.getDeclaredConstructor().newInstance()).run();
        } catch (IllegalAccessError e) {
            System.out.println("  " + e);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d classes src/com/shop/stock/Inventory.java src/com/shop/app/RuntimePackages.java
javac -d plugin-classes -cp classes plugin-src/com/shop/stock/Auditor.java
java -cp classes com.shop.app.RuntimePackages`,
        },
        {
          type: "output",
          text: `one loader: Auditor via shared, Inventory via shared, same Package? true
Auditor sees reserved=3
two loaders: Auditor via plugin, Inventory via app, same Package? false
  java.lang.IllegalAccessError: class com.shop.stock.Auditor tried to access method 'java.lang.String com.shop.stock.Inventory.peek()' (com.shop.stock.Auditor is in unnamed module of loader 'plugin' @f6f4d33; com.shop.stock.Inventory is in unnamed module of loader 'app')`,
        },
        {
          type: "list",
          items: [
            "`Auditor` compiled against `Inventory` without a problem: same package name, so `javac` allowed the package-private call.",
            "In the first run, the `shared` loader (with the platform loader as parent, so it doesn't delegate to the application loader) defined both classes. One run-time package, one `Package` object, and the call worked.",
            "In the second run, the `plugin` loader defined `Auditor` but delegated `Inventory` to its parent, the application loader, which found it on the classpath. Same package name, two run-time packages, two `Package` objects. When `Auditor.run` first executed `invokestatic Inventory.peek`, resolution checked access and threw `IllegalAccessError`, naming both loaders. The `@f6f4d33` is the plugin loader's identity hash and changes between runs and machines.",
            "This is how application servers, plugin systems and test frameworks with their own class loaders can break code that compiled fine. A test class loaded by a different loader than the class under test can't call its package-private methods, even though both sit in `com.shop.stock`.",
          ],
        },
        {
          type: "heading",
          text: "Package objects and the JAR manifest",
        },
        {
          type: "paragraph",
          text: "Each class loader creates a `java.lang.Package` object per run-time package. When the package came from a JAR, the loader copies version attributes from the JAR's manifest into it. I rebuilt `money.jar` with three manifest lines (`Implementation-Title: shop-money`, `Implementation-Version: 1.4.2`, `Implementation-Vendor: Example Shop`):",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/app/PackageInfoDemo.java",
          code: `package com.shop.app;

import com.shop.money.Money;

public class PackageInfoDemo {
    public static void main(String[] args) {
        Package pkg = Money.class.getPackage();
        System.out.println("name:    " + pkg.getName());
        System.out.println("title:   " + pkg.getImplementationTitle());
        System.out.println("version: " + pkg.getImplementationVersion());
        System.out.println("vendor:  " + pkg.getImplementationVendor());
        System.out.println("sealed:  " + pkg.isSealed());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `jar --create --file money-1.4.2.jar --manifest mf.txt -C lib .
java -cp classes:money-1.4.2.jar com.shop.app.PackageInfoDemo
java -cp classes:lib com.shop.app.PackageInfoDemo     # same class, from a directory`,
        },
        {
          type: "output",
          text: `name:    com.shop.money
title:   shop-money
version: 1.4.2
vendor:  Example Shop
sealed:  false

name:    com.shop.money
title:   null
version: null
vendor:  null
sealed:  false`,
        },
        {
          type: "paragraph",
          text: "From a directory there's no manifest, so everything except the name is `null`. Logging `getImplementationVersion()` of a library's package at startup is a cheap way to record which version actually got loaded, as long as the library's build writes those attributes (Maven's JAR plugin can, through `addDefaultImplementationEntries`).",
        },
        {
          type: "heading",
          text: "Split packages, and sealing against them",
        },
        {
          type: "paragraph",
          text: "On the classpath, nothing stops one package from being spread over several JARs or folders. That's a **split package**. I compiled a second class in `com.shop.money`, `Discount`, into a separate `extra/` folder:",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/app/SealedDemo.java",
          code: `package com.shop.app;

import com.shop.money.Discount;
import com.shop.money.Money;

public class SealedDemo {
    public static void main(String[] args) {
        System.out.println(Money.format(10_000) + ", sealed: " + Money.class.getPackage().isSealed());
        System.out.println(Money.format(Discount.apply(10_000, 10)));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# extra/com/shop/money/Discount.class holds a static apply(paise, percent)
java -cp classes:money-1.4.2.jar:extra com.shop.app.SealedDemo
# money-sealed.jar: the same Money.class, with "Sealed: true" in the manifest
java -cp classes:money-sealed.jar:extra com.shop.app.SealedDemo`,
        },
        {
          type: "output",
          text: `Rs. 100.00, sealed: false
Rs. 90.00

Rs. 100.00, sealed: true
Exception in thread "main" java.lang.SecurityException: sealing violation: package com.shop.money is sealed
	at java.base/jdk.internal.loader.BuiltinClassLoader.getAndVerifyPackage(BuiltinClassLoader.java:906)
	...
	at com.shop.app.SealedDemo.main(SealedDemo.java:9)`,
        },
        {
          type: "list",
          items: [
            "Unsealed, `Money` from the JAR and `Discount` from the folder formed one run-time package, because the same loader defined both. That's legal and occasionally deliberate, but it's also how two versions of one library end up mixed together.",
            "`Sealed: true` in the manifest (Java 1.2) says every class of the packages in this JAR must come from this JAR. The loader enforced it when `Discount` was defined from somewhere else: a `SecurityException` at the first line that used `Discount`.",
            "Sealing is rare today. Modules made the rule the default instead: a package belongs to exactly one module, and on the module path, where every application module shares one class loader, two modules containing the same package fail at startup. The Java Modules lesson shows that error and the usual fixes.",
          ],
        },
      ],
    },
    {
      title: "Module Imports in JDK 25",
      blocks: [
        {
          type: "paragraph",
          text: "JDK 25 finalised **module import declarations** (JEP 511, previewed in JDK 23 by JEP 476 and in JDK 24 by JEP 494). `import module M;` imports, on demand, every public top-level type in every package that module `M` exports, plus the packages of modules `M` requires transitively. The importing code doesn't have to be in a module itself; my test class was in the unnamed package on the classpath.",
        },
        {
          type: "code",
          language: "java",
          title: "ModuleImport.java",
          code: `import module java.base;

public class ModuleImport {
    public static void main(String[] args) {
        List<String> items = new ArrayList<>(List.of("Pen", "Book"));
        Map<String, Integer> stock = new HashMap<>(Map.of("Pen", 4));
        Function<String, Integer> length = String::length;
        Path file = Path.of("orders.csv");
        System.out.println(items + " " + stock + " " + length.apply("Notebook") + " " + file);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `$JDK25/bin/javac ModuleImport.java && $JDK25/bin/java ModuleImport
javac ModuleImport.java                         # JDK 21
$JDK25/bin/javac --release 21 ModuleImport.java`,
        },
        {
          type: "output",
          text: `[Pen, Book] {Pen=4} 8 orders.csv

ModuleImport.java:1: error: '.' expected
import module java.base;
             ^
1 error

ModuleImport.java:1: error: module imports are not supported in -source 21
import module java.base;
       ^
  (use -source 25 or higher to enable module imports)
1 error`,
        },
        {
          type: "list",
          items: [
            "One line replaced imports from four packages: `java.util`, `java.util.function`, `java.nio.file` and, as always, `java.lang`. Unlike `import java.util.*;`, a module import does reach `java.util.function`, because that's a separate package `java.base` exports.",
            "JDK 21's compiler read `import module` as the start of an ordinary import of a package called `module` and wanted a dot. JDK 25 with `--release 21` knows the feature and says so. `--enable-preview` doesn't help on 21; the first preview was in JDK 23.",
            "It's still only an import. `javap -v` on the JDK 25 class file listed `java/util/ArrayList`, `java/util/List` and the rest as ordinary `Class` constants, and nothing about modules.",
          ],
        },
        {
          type: "heading",
          text: "Ambiguity, and what shadows a module import",
        },
        {
          type: "paragraph",
          text: "Importing whole modules makes name clashes far more likely. `java.sql` exports `java.sql`, which has a `Date`, and `java.base` exports `java.util`, which has the other one:",
        },
        {
          type: "code",
          language: "java",
          title: "ModuleClash.java",
          code: `import module java.base;
import module java.sql;

public class ModuleClash {
    public static void main(String[] args) {
        Date today = new Date(0L);
        System.out.println(today.getClass().getName());
    }
}`,
        },
        {
          type: "output",
          text: `ModuleClash.java:6: error: reference to Date is ambiguous
        Date today = new Date(0L);
        ^
  both class java.sql.Date in java.sql and class java.util.Date in java.util match
ModuleClash.java:6: error: reference to Date is ambiguous
        Date today = new Date(0L);
                         ^
  both class java.sql.Date in java.sql and class java.util.Date in java.util match
2 errors`,
        },
        {
          type: "code",
          language: "java",
          title: "ModuleFixed.java",
          code: `import module java.base;
import module java.sql;
import java.util.Date;                 // single-type import: shadows both modules' Date

public class ModuleFixed {
    public static void main(String[] args) {
        Date today = new Date(0L);
        Connection connection = null;  // java.sql.Connection, from the java.sql module
        List<Date> dates = List.of(today);
        System.out.println(today.getClass().getName() + " " + dates.size() + " " + (connection == null));
    }
}`,
        },
        {
          type: "output",
          text: `java.util.Date 1 true`,
        },
        {
          type: "paragraph",
          text: "A type-import-on-demand also shadows a module import, a rule JEP 494 added in the second preview. `java.desktop` exports `java.awt`, which has a class called `List`:",
        },
        {
          type: "code",
          language: "java",
          title: "ModuleOnDemand.java",
          code: `import module java.base;
import module java.desktop;
import java.util.*;                    // on-demand import: shadows module imports (JDK 25)

public class ModuleOnDemand {
    public static void main(String[] args) {
        List<String> names = List.of("Asha", "Ravi");
        System.out.println(names.getClass().getName().startsWith("java.util") + " " + names);
    }
}`,
        },
        {
          type: "output",
          text: `true [Asha, Ravi]`,
        },
        {
          type: "paragraph",
          text: "Without the `import java.util.*;` line, JDK 25 reported `reference to List is ambiguous`, `both class java.awt.List in java.awt and interface java.util.List in java.util match`. So the shadowing order on JDK 25 is: single-type imports, then the current package, then on-demand imports, then module imports.",
        },
        {
          type: "heading",
          text: "Compact source files import java.base for free",
        },
        {
          type: "paragraph",
          text: "JEP 512, also final in JDK 25, lets a source file contain just methods and fields. Such a **compact source file** implicitly declares a class and implicitly imports `module java.base`:",
        },
        {
          type: "code",
          language: "java",
          title: "Compact.java (JDK 25, no class declaration)",
          code: `void main() {
    List<String> items = List.of("Pen", "Book");
    Map<String, Integer> stock = new TreeMap<>(Map.of("Pen", 4, "Book", 2));
    IO.println(items + " " + stock);
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "$JDK25/bin/java Compact.java",
        },
        {
          type: "output",
          text: `[Pen, Book] {Book=2, Pen=4}`,
        },
        {
          type: "paragraph",
          text: "No imports, and `List`, `Map` and `TreeMap` resolved. `IO` is `java.lang.IO`, new in JDK 25. The implicitly declared class is in the unnamed package and can't be referenced by name from other classes, which keeps compact source files where they belong: scripts and first programs.",
        },
      ],
    },
    {
      title: "Designing Packages: by Layer or by Feature",
      blocks: [
        {
          type: "paragraph",
          text: "Everything so far was mechanics. The design question is what goes in a package together. The two common answers organise the same classes very differently:",
        },
        {
          type: "diagram",
          text: `PACKAGE BY LAYER                  PACKAGE BY FEATURE
com.shop                          com.shop
├── controller                    ├── order
│   ├── OrderController           │   ├── OrderController
│   └── PaymentController         │   ├── OrderService      public
├── service                       │   ├── OrderRepository   pkg-private
│   ├── OrderService              │   └── Order             public
│   └── PaymentService            ├── payment
├── repository                    │   ├── PaymentService    public
│   ├── OrderRepository           │   └── CardGateway       pkg-private
│   └── PaymentRepository         └── app
└── model                             └── ShopApp
    ├── Order
    └── Payment
everything public:                most classes package-private:
each layer calls the next         a feature exposes only its
across a package boundary         entry points`,
          caption: "The same shop, two layouts. The difference that matters is the right-hand column of modifiers.",
        },
        {
          type: "paragraph",
          text: "In the layered layout, `OrderService` in `service` calls `OrderRepository` in `repository`, so `OrderRepository` must be public, and so must every class in every layer. Nothing stops `PaymentController` from calling `OrderRepository` directly. In the feature layout, `OrderService` and `OrderRepository` share a package, so the repository can be package-private and the compiler enforces that only the order feature touches order storage. This is the feature version, built and run:",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/order/Order.java",
          code: `package com.shop.order;

public record Order(String id, String customer, long totalPaise) { }`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/order/OrderRepository.java",
          code: `package com.shop.order;

import java.util.HashMap;
import java.util.Map;

class OrderRepository {                          // package-private: an implementation detail
    private final Map<String, Order> orders = new HashMap<>();

    void save(Order order) { orders.put(order.id(), order); }

    Order find(String id) { return orders.get(id); }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/order/OrderService.java (feature version)",
          code: `package com.shop.order;

import com.shop.payment.PaymentService;

public class OrderService {                      // the only public entry point of the feature
    private final OrderRepository repository = new OrderRepository();
    private final PaymentService payments;

    public OrderService(PaymentService payments) {
        this.payments = payments;
    }

    public Order place(String id, String customer, long totalPaise) {
        Order order = new Order(id, customer, totalPaise);
        payments.charge(customer, totalPaise);
        repository.save(order);
        return order;
    }

    public Order find(String id) {
        return repository.find(id);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/payment/PaymentService.java",
          code: `package com.shop.payment;

public class PaymentService {
    private final CardGateway gateway = new CardGateway();

    public void charge(String customer, long paise) {
        gateway.send(customer, paise);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/payment/CardGateway.java",
          code: `package com.shop.payment;

class CardGateway {                              // package-private
    void send(String customer, long paise) {
        System.out.println("charged " + customer + " " + paise + " paise");
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/app/ShopApp.java",
          code: `package com.shop.app;

import com.shop.order.Order;
import com.shop.order.OrderService;
import com.shop.payment.PaymentService;

public class ShopApp {
    public static void main(String[] args) {
        OrderService orders = new OrderService(new PaymentService());
        orders.place("O-1", "Asha", 45_000);
        Order found = orders.find("O-1");
        System.out.println("found " + found);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out $(find src -name '*.java')
java -cp out com.shop.app.ShopApp`,
        },
        {
          type: "output",
          text: `charged Asha 45000 paise
found Order[id=O-1, customer=Asha, totalPaise=45000]`,
        },
        {
          type: "paragraph",
          text: "Then I added the shortcut someone always tries, `src/com/shop/app/Shortcut.java`, which skips the service and uses the repository directly:",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/app/Shortcut.java",
          code: `package com.shop.app;

import com.shop.order.OrderRepository;

public class Shortcut {
    public static void main(String[] args) {
        OrderRepository repository = new OrderRepository();
    }
}`,
        },
        {
          type: "output",
          text: `src/com/shop/app/Shortcut.java:3: error: OrderRepository is not public in com.shop.order; cannot be accessed from outside package
import com.shop.order.OrderRepository;
                     ^
src/com/shop/app/Shortcut.java:7: error: OrderRepository is not public in com.shop.order; cannot be accessed from outside package
        OrderRepository repository = new OrderRepository();
        ^
src/com/shop/app/Shortcut.java:7: error: OrderRepository is not public in com.shop.order; cannot be accessed from outside package
        OrderRepository repository = new OrderRepository();
                                         ^
3 errors`,
        },
        {
          type: "list",
          items: [
            "The compiler, not a code review, rejected the shortcut. Even the import line failed, which confirms that an import doesn't grant access.",
            "Deleting a feature means deleting one folder. Finding everything about orders means opening one folder. In the layered layout, both mean visiting four.",
            "The cost: a package-private class can't be shared with another feature. When two features genuinely need the same helper, it either becomes public (often in a small shared package) or one feature's public API grows to offer it. Both are explicit decisions, which is the point.",
            "Spring doesn't need classes to be public. With Spring 6.2.11, a package-private `@Repository` class with a package-private constructor was still found by component scanning and injected into a public `@Service` in the same package.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing the feature-packaged `ShopApp` from source to output, built with `javac -d out -sourcepath src src/com/shop/app/ShopApp.java` and run with `java -cp out com.shop.app.ShopApp`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`javac` parses `ShopApp.java`. The `package com.shop.app;` line puts `ShopApp` in `com.shop.app`, whatever folder the file is in.",
            "It processes the three single-type imports. For `com.shop.order.OrderService`, it finds no class file on the classpath, so it looks in the source path for `src/com/shop/order/OrderService.java`, and queues that file for compilation. The same happens for `Order` and `PaymentService`, and then, transitively, for `OrderRepository` and `CardGateway`.",
            "It resolves every simple name in `ShopApp`'s body: `OrderService`, `PaymentService` and `Order` through the single-type imports, `String` and `System` through the implicit `java.lang` import.",
            "It checks access at compile time: `OrderService`, its constructor and `place` are public, so `ShopApp` may use them from another package. `ShopApp` never names `OrderRepository`, so its package-private status doesn't matter here.",
            "It writes `out/com/shop/app/ShopApp.class`. `this_class` is `com/shop/app/ShopApp`, and the constant pool holds `com/shop/order/OrderService`, `com/shop/payment/PaymentService` and the rest by full name. The imports are gone.",
            "At run time, the launcher asks the application class loader for `com.shop.app.ShopApp`. The loader asks its parents, which don't have it, turns the name into `com/shop/app/ShopApp.class`, finds it in `out/`, and defines it in the run-time package (app loader, `com.shop.app`). The launcher finds `public static void main(java.lang.String[])` and calls it.",
            "The first `new OrderService(...)` executes. Its `Class` constant `com/shop/order/OrderService` is resolved: loaded the same way from `out/com/shop/order/`, then checked. It's public, so access is granted. `PaymentService` follows the same path.",
            "Inside `OrderService`'s constructor, `new OrderRepository()` resolves a package-private class. The JVM checks that `OrderService` and `OrderRepository` are in the same run-time package. Both were defined by the app loader with package name `com.shop.order`, so the check passes. `PaymentService` reaches `CardGateway` the same way.",
            "The program prints `charged Asha 45000 paise` and `found Order[id=O-1, customer=Asha, totalPaise=45000]`. Every class was loaded on first use, and each symbolic reference was resolved and checked once.",
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
          code: `package com.shop.tour;                       // 1. package declaration: first, at most one

import java.util.List;                       // 2. single-type import
import java.time.*;                          // 3. type-import-on-demand (java.time only)
import static java.lang.Math.max;            // 4. single-static-import
import static java.util.Map.*;               // 5. static-import-on-demand (Map.of, Map.entry...)

public class SyntaxTour {                    // public: file must be SyntaxTour.java
    public static void main(String[] args) { // String: java.lang, imported implicitly
        List<String> items = List.of("Pen", "Book");
        LocalDate due = LocalDate.of(2026, 11, 20);           // from java.time.*
        var stock = of("Pen", 4, "Book", 2);                  // Map.of via static import
        java.util.Set<String> tags = java.util.Set.of("new"); // fully qualified, no import
        Helper helper = new Helper();                         // same package: no import needed

        System.out.println(items + " due " + due + " " + new java.util.TreeMap<>(stock));
        System.out.println(max(3, 7) + " " + tags + " " + helper.where());
        System.out.println(SyntaxTour.class.getName() + " in package " + SyntaxTour.class.getPackageName());
    }
}

class Helper {                               // package-private top-level class, same file
    String where() {
        return getClass().getName();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out SyntaxTour.java
java -cp out com.shop.tour.SyntaxTour
find out -name '*.class' | sort`,
        },
        {
          type: "output",
          text: `[Pen, Book] due 2026-11-20 {Book=2, Pen=4}
7 [new] com.shop.tour.Helper
com.shop.tour.SyntaxTour in package com.shop.tour
out/com/shop/tour/Helper.class
out/com/shop/tour/SyntaxTour.class`,
        },
        {
          type: "paragraph",
          text: "The one form not shown is `import module java.base;`, which needs JDK 25. The order in the file is fixed: package declaration, then imports (any mix of the four kinds, in any order), then type declarations. `of(...)` reads oddly without `Map.` in front of it, which is the honest argument against static on-demand imports of general-purpose names; I'd normally write `Map.of` and keep the static import for something like `Collectors`.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Importing a nested type, and the $ in binary names",
        },
        {
          type: "paragraph",
          text: "A nested class can be imported like a top-level one, using its canonical name. The binary name the JVM uses is different, and `Class.forName` wants the binary one:",
        },
        {
          type: "code",
          language: "java",
          title: "NestedNames.java",
          code: `package com.shop.catalog;

import java.util.Map;
import java.util.Map.Entry;                  // importing a nested type by its canonical name

public class NestedNames {
    public static class Line {               // com.shop.catalog.NestedNames.Line
        final String sku;
        final int quantity;

        Line(String sku, int quantity) {
            this.sku = sku;
            this.quantity = quantity;
        }
    }

    public static void main(String[] args) throws Exception {
        Entry<String, Integer> entry = Map.entry("Pen", 4);
        Line line = new Line(entry.getKey(), entry.getValue());

        System.out.println("canonical: " + Line.class.getCanonicalName());
        System.out.println("binary:    " + Line.class.getName());
        System.out.println("package:   " + Line.class.getPackageName());
        System.out.println("Entry:     " + Entry.class.getName());
        System.out.println("forName binary:    " + Class.forName("com.shop.catalog.NestedNames$Line").getSimpleName());
        try {
            Class.forName("com.shop.catalog.NestedNames.Line");
        } catch (ClassNotFoundException e) {
            System.out.println("forName canonical: " + e);
        }
        System.out.println(line.sku + " x " + line.quantity);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out NestedNames.java
find out -name '*.class' | sort
java -cp out com.shop.catalog.NestedNames`,
        },
        {
          type: "output",
          text: `out/com/shop/catalog/NestedNames$Line.class
out/com/shop/catalog/NestedNames.class
canonical: com.shop.catalog.NestedNames.Line
binary:    com.shop.catalog.NestedNames$Line
package:   com.shop.catalog
Entry:     java.util.Map$Entry
forName binary:    Line
forName canonical: java.lang.ClassNotFoundException: com.shop.catalog.NestedNames.Line
Pen x 4`,
        },
        {
          type: "diagram",
          text: `import java.util.Map.Entry;

canonical  java.util.Map.Entry        source code and imports
binary     java.util.Map$Entry        getName(), Class.forName
internal   java/util/Map$Entry        class file constant pool
path       java/util/Map$Entry.class  in a JAR or a class folder

package of Line:  everything before the top-level class
  com.shop.catalog . NestedNames . Line
  └── package ───┘   └─ top-level ┘  └ nested`,
          caption: "A nested class's package is its top-level class's package; the $ only appears from the binary name down.",
        },
        {
          type: "paragraph",
          text: "From a dotted name alone, nobody can tell where the package ends and the classes begin, because `com.shop.catalog.NestedNames.Line` could be a class `Line` in a package `com.shop.catalog.NestedNames`. `javac` resolves that by trying packages and types in turn; `Class.forName` doesn't try, it takes the binary name literally, turns it into `com/shop/catalog/NestedNames/Line.class`, and finds nothing.",
        },
        {
          type: "heading",
          text: "Where did this class come from?",
        },
        {
          type: "paragraph",
          text: "When I need to know which module, loader and location a class came from, these four calls answer it. I keep a variant of this around for debugging class path problems:",
        },
        {
          type: "code",
          language: "java",
          title: "WhereFrom.java",
          code: `package com.shop.debug;

import java.security.CodeSource;
import java.sql.Timestamp;
import java.util.List;

public class WhereFrom {
    public static void main(String[] args) {
        for (Class<?> type : List.of(String.class, Timestamp.class, WhereFrom.class)) {
            ClassLoader loader = type.getClassLoader();
            Module module = type.getModule();
            CodeSource source = type.getProtectionDomain().getCodeSource();
            System.out.println(type.getName());
            System.out.println("  package " + type.getPackageName()
                    + ", module " + (module.isNamed() ? module.getName() : "(unnamed)")
                    + ", loader " + (loader == null ? "bootstrap" : loader.getName()));
            System.out.println("  from " + (source == null ? "(runtime image)" : shorten(source.getLocation().toString())));
        }
    }

    static String shorten(String url) {                // file:/home/.../out/ -> file:.../out/
        return url.replaceAll("^file:.*/([^/]+/?)$", "file:.../$1");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out WhereFrom.java && java -cp out com.shop.debug.WhereFrom`,
        },
        {
          type: "output",
          text: `java.lang.String
  package java.lang, module java.base, loader bootstrap
  from (runtime image)
java.sql.Timestamp
  package java.sql, module java.sql, loader platform
  from jrt:/java.sql
com.shop.debug.WhereFrom
  package com.shop.debug, module (unnamed), loader app
  from file:.../out/`,
        },
        {
          type: "list",
          items: [
            "Three loaders, three kinds of package. `java.lang` belongs to `java.base`, defined by the bootstrap loader, which Java represents as `null`. `java.sql` is in the `java.sql` module, defined by the platform loader. My class is in the unnamed module of the app loader, like everything on the classpath.",
            "`getCodeSource()` is `null` for bootstrap classes, a `jrt:/` URL for platform classes, and the classpath entry (a directory or a JAR) for mine. When the same class name exists in two JARs, this line tells me which one won.",
          ],
        },
        {
          type: "heading",
          text: "Static imports where they help",
        },
        {
          type: "paragraph",
          text: "The case I'm happy to use static imports for: a family of well-known factory methods whose names are unambiguous in context, here `Collectors` and `Comparator.comparing`:",
        },
        {
          type: "code",
          language: "java",
          title: "DepartmentReport.java",
          code: `package com.shop.hr;

import static java.util.Comparator.comparing;
import static java.util.stream.Collectors.counting;
import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.summingLong;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class DepartmentReport {
    record Employee(String name, String department, long salary) { }

    public static void main(String[] args) {
        List<Employee> staff = List.of(
                new Employee("Asha", "Engineering", 120_000),
                new Employee("Ravi", "Sales", 80_000),
                new Employee("Meera", "Engineering", 135_000),
                new Employee("Kabir", "Sales", 75_000),
                new Employee("Isha", "Finance", 90_000));

        Map<String, Long> headcount = staff.stream()
                .collect(groupingBy(Employee::department, TreeMap::new, counting()));
        Map<String, Long> payroll = staff.stream()
                .collect(groupingBy(Employee::department, TreeMap::new, summingLong(Employee::salary)));
        Employee topEarner = staff.stream().max(comparing(Employee::salary)).orElseThrow();

        System.out.println("headcount: " + headcount);
        System.out.println("payroll:   " + payroll);
        System.out.println("top:       " + topEarner.name());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out DepartmentReport.java && java -cp out com.shop.hr.DepartmentReport`,
        },
        {
          type: "output",
          text: `headcount: {Engineering=2, Finance=1, Sales=2}
payroll:   {Engineering=255000, Finance=90000, Sales=155000}
top:       Meera`,
        },
        {
          type: "paragraph",
          text: "`groupingBy(..., counting())` reads like a sentence, and anyone who knows streams knows where those names come from. I imported each name singly, so a reader can see the source of every bare name at the top of the file. The nested record `Employee` needed no import at all; it's in scope inside `DepartmentReport`.",
        },
        {
          type: "heading",
          text: "Resources follow the package path too",
        },
        {
          type: "paragraph",
          text: "Packages also organise non-class files. `Class.getResource` resolves a relative name against the class's own package folder, and a name starting with `/` against the classpath root:",
        },
        {
          type: "code",
          language: "java",
          title: "ResourcePaths.java",
          code: `package com.shop.config;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

public class ResourcePaths {
    public static void main(String[] args) throws IOException {
        print("shipping.properties");                     // relative: next to this class
        print("/shipping.properties");                    // absolute: from the classpath root
        print("/com/shop/config/shipping.properties");    // absolute, spelled out
        System.out.println("via ClassLoader: "
                + (ResourcePaths.class.getClassLoader().getResource("com/shop/config/shipping.properties") != null));
    }

    static void print(String name) throws IOException {
        try (InputStream in = ResourcePaths.class.getResourceAsStream(name)) {
            if (in == null) {
                System.out.println(name + " -> not found");
                return;
            }
            Properties props = new Properties();
            props.load(in);
            System.out.println(name + " -> " + props);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out ResourcePaths.java
printf 'standard=4000\\nexpress=9900\\n' > out/com/shop/config/shipping.properties
java -cp out com.shop.config.ResourcePaths`,
        },
        {
          type: "output",
          text: `shipping.properties -> {standard=4000, express=9900}
/shipping.properties -> not found
/com/shop/config/shipping.properties -> {standard=4000, express=9900}
via ClassLoader: true`,
        },
        {
          type: "list",
          items: [
            "`ResourcePaths.class.getResourceAsStream(\"shipping.properties\")` became `com/shop/config/shipping.properties`, because the class is in `com.shop.config`. The leading `/` version looked at the root of `out/` and found nothing.",
            "`ClassLoader.getResource` has no notion of a current package: its names are always relative to the root and never start with `/`.",
            "In a Maven project, `src/main/resources/com/shop/config/shipping.properties` ends up in exactly that place in the JAR, which is why resource folders mirror package folders.",
          ],
        },
      ],
    },
    {
      title: "When to Use Which Package Structure (and Which Imports)",
      blocks: [
        {
          type: "paragraph",
          text: "Packages are not optional, so the decisions are how to cut them and how to import from them. This is how I decide. The capstone lesson When to Use What in Java OOP made the same kind of calls for classes; the package-level version of \"start private\" is \"start package-private\".",
        },
        {
          type: "table",
          headers: ["Situation", "What I do", "Why"],
          rows: [
            ["A new application or service", "Package by feature: `com.example.shop.order`, `.payment`, `.shipping`", "Most classes can be package-private; a feature is one folder"],
            ["A class only its own feature uses", "Package-private, no modifier", "The compiler keeps other features out"],
            ["A feature grows to 30+ classes", "Split by sub-feature (`order.pricing`, `order.returns`), each with its own small public API", "Subpackages can't share package-private members, so each split must be a real boundary"],
            ["Code shared by many features (money, time, ids)", "A small, stable, public package, e.g. `com.example.shop.common.money`", "Explicitly public, so it's designed as an API"],
            ["A library others depend on", "Public API packages plus `internal` packages, and a module that exports only the API", "Without modules, `internal` is only a naming convention"],
            ["A throwaway experiment or a single-file demo", "The unnamed package, or a JDK 25 compact source file", "Fine until a second package needs it"],
            ["Imports in production code", "Explicit single-type imports, managed by the IDE", "A dependency upgrade can't create an ambiguity; the reader sees every source"],
            ["Many types from one package in a test or a script", "A wildcard import is acceptable", "Short-lived code, low risk"],
            ["Static imports", "Test assertions, `Collectors`, `Comparator.comparing`, a class's own constants", "Names that are unambiguous where they're used"],
            ["Static imports of generic names (`of`, `max`, `get`)", "Avoid; keep the class name", "A bare `of(...)` hides its source, and members of the class shadow it"],
          ],
        },
        {
          type: "diagram",
          text: `Is the code throwaway (one file, no reuse)?
├─ yes ─► unnamed package or compact source file
└─ no ──► reverse-domain root: com.example.app
          │
          Is it a library other teams depend on?
          ├─ yes ─► api packages + internal packages,
          │         export only the api (Java Modules lesson)
          └─ no ──► one package per feature
                    │
                    Does the class need to be used from
                    another feature?
                    ├─ no ──► package-private (the default)
                    └─ yes ─► public, and part of that
                              feature's small public API`,
          caption: "The decision I make for every new package and every new class in it.",
        },
        {
          type: "list",
          items: [
            "Start every class package-private and make it public when another package needs it, not before. The compiler will tell me exactly when that happens.",
            "If I'm about to make a class public only because I put its caller in a different package, the packages are probably cut wrong.",
            "Name packages after what they're about (`order`, `payment`), not what kind of class they hold (`services`, `utils`, `helpers`). A `util` package tends to grow into public helpers that every feature depends on.",
            "One package per feature works with Spring: component scanning finds package-private beans, and the controller, service and repository of a feature live side by side.",
            "Explicit imports in production code, sorted and pruned by the IDE. Wildcards and static on-demand imports in tests are a reasonable trade.",
          ],
        },
        {
          type: "heading",
          text: "A wrong choice and a right choice: wildcard imports across a dependency upgrade",
        },
        {
          type: "paragraph",
          text: "Two versions of the same invoice class, one with wildcard imports and one with explicit ones. Both compile and run against `money-1.0.jar`, which contains only `com.shop.money.Money`. Then `money-2.0.jar` adds an innocent new enum, `com.shop.money.Currency`:",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/app/WildcardInvoice.java",
          code: `package com.shop.app;

import com.shop.money.*;
import java.util.*;

public class WildcardInvoice {
    public static void main(String[] args) {
        Currency inr = Currency.getInstance("INR");      // meant java.util.Currency
        List<Long> lines = List.of(2_500L, 45_000L);
        long total = lines.stream().mapToLong(Long::longValue).sum();
        System.out.println(Money.format(total) + " " + inr.getCurrencyCode());
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/shop/app/ExplicitInvoice.java",
          code: `package com.shop.app;

import com.shop.money.Money;
import java.util.Currency;
import java.util.List;

public class ExplicitInvoice {
    public static void main(String[] args) {
        Currency inr = Currency.getInstance("INR");
        List<Long> lines = List.of(2_500L, 45_000L);
        long total = lines.stream().mapToLong(Long::longValue).sum();
        System.out.println(Money.format(total) + " " + inr.getCurrencyCode());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out1 -cp money-1.0.jar src/com/shop/app/*.java
java -cp out1:money-1.0.jar com.shop.app.WildcardInvoice
java -cp out1:money-1.0.jar com.shop.app.ExplicitInvoice
# upgrade the dependency and rebuild
javac -d out2 -cp money-2.0.jar src/com/shop/app/*.java`,
        },
        {
          type: "output",
          text: `Rs. 475.00 INR
Rs. 475.00 INR

src/com/shop/app/WildcardInvoice.java:8: error: reference to Currency is ambiguous
        Currency inr = Currency.getInstance("INR");      // meant java.util.Currency
        ^
  both class java.util.Currency in java.util and enum com.shop.money.Currency in com.shop.money match
src/com/shop/app/WildcardInvoice.java:8: error: reference to Currency is ambiguous
        Currency inr = Currency.getInstance("INR");      // meant java.util.Currency
                       ^
  both class java.util.Currency in java.util and enum com.shop.money.Currency in com.shop.money match
2 errors`,
        },
        {
          type: "list",
          items: [
            "**Wrong:** with two wildcards, my code's meaning depended on the full list of classes in two packages I don't control. A library adding a class broke my build, in a file nobody had touched.",
            "**Right:** `ExplicitInvoice` compiled alone against `money-2.0.jar` and printed the same `Rs. 475.00 INR`. Explicit imports pin each simple name to one type, so new classes in an imported package can't change it.",
            "The old `WildcardInvoice.class` from `out1` still ran fine against `money-2.0.jar`, because the class file says `java/util/Currency` in full. The break is purely at compile time, which is the best kind, but it's still a broken build after a routine upgrade.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Running a packaged class by its simple name, or from inside its folder",
        },
        {
          type: "output",
          text: `$ java -cp out App
Error: Could not find or load main class App
Caused by: java.lang.ClassNotFoundException: App

$ cd out/com/shop && java App
Error: Could not find or load main class App
Caused by: java.lang.NoClassDefFoundError: App (wrong name: com/shop/App)`,
        },
        {
          type: "paragraph",
          text: "The fix is always the same shape: `-cp` points at the **root** of the package tree, and the class is named by its binary name, `java -cp out com.shop.App`.",
        },
        {
          type: "heading",
          text: "Expecting a wildcard to import subpackages",
        },
        {
          type: "paragraph",
          text: "`import java.util.*;` and then `Function<String, Integer>` gave `cannot find symbol ... class Function`. Each package needs its own import; `java.util.function` is not inside `java.util` in any way that matters.",
        },
        {
          type: "heading",
          text: "Treating a subpackage as part of its parent",
        },
        {
          type: "paragraph",
          text: "`com.shop.billing.Invoice` couldn't read `com.shop.Order`'s package-private `totalPaise`: `totalPaise is not public in Order; cannot be accessed from outside package`. Moving helper classes into a `.internal` or `.impl` subpackage silently forces them to become public.",
        },
        {
          type: "heading",
          text: "Giving a class the name of a java.lang class",
        },
        {
          type: "paragraph",
          text: "A `com.shop.String` turned `main(String[] args)` into `main(com.shop.String[])` for every class in the package, and the launcher said `Main method not found in class com.shop.Greeter`. The same goes for `Object`, `Integer`, `Record` or `Override`: anything in my package beats `java.lang`.",
        },
        {
          type: "heading",
          text: "Passing -cp together with -jar",
        },
        {
          type: "paragraph",
          text: "`java -cp money.jar -jar app.jar` ignored `-cp` entirely and failed with `NoClassDefFoundError: com/shop/money/Money`. Either list the dependencies in the manifest's `Class-Path`, or drop `-jar` and name the main class.",
        },
        {
          type: "heading",
          text: "Setting CLASSPATH and losing the current directory",
        },
        {
          type: "output",
          text: `$ java Hi
hi from cwd
$ CLASSPATH=../money.jar java Hi
Error: Could not find or load main class Hi
Caused by: java.lang.ClassNotFoundException: Hi
$ CLASSPATH=../money.jar:. java Hi
hi from cwd`,
        },
        {
          type: "paragraph",
          text: "`.` is only the default when nothing else is set. A `CLASSPATH` exported in a shell profile can break every `java` command that relied on it, which is why I never set it globally.",
        },
        {
          type: "heading",
          text: "Using java or javax as a package prefix",
        },
        {
          type: "output",
          text: `$ javac -d out src/java/shop/Hello.java && java -cp out java.shop.Hello
Error: A JNI error has occurred, please check your installation and try again
Exception in thread "main" java.lang.SecurityException: Prohibited package name: java.shop
	at java.base/java.lang.ClassLoader.preDefineClass(ClassLoader.java:910)
	at java.base/java.lang.ClassLoader.defineClass(ClassLoader.java:1025)
	...`,
        },
        {
          type: "paragraph",
          text: "It compiled, and the error message even blames the installation. Only the JDK's own loaders may define classes in `java.*` packages.",
        },
        {
          type: "heading",
          text: "Relying on a static import that a member shadows",
        },
        {
          type: "paragraph",
          text: "`import static java.lang.Integer.*;` and then `toString(42)` inside a class: the inherited `Object.toString()` won, and the error was `method toString in class Object cannot be applied to given types`. Members of the class, including inherited ones, always beat static imports.",
        },
        {
          type: "heading",
          text: "Assuming the classpath has one copy of each class",
        },
        {
          type: "paragraph",
          text: "With `tax-1.0.jar` before `tax-2.0.jar`, a program compiled against 2.0 printed `TaxRate 1.0: 10000 + 12% = 11200`, without any warning. The production section shows the version that throws `NoSuchMethodError`, and a startup check that catches it.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Every class goes in a named package under a reverse domain the team controls, all lowercase: `com.example.shop.order`. The unnamed package is for scratch files only.",
            "Keep the source tree in package layout (`src/main/java/com/example/shop/order/`), so `javac -sourcepath`, IDEs, build tools and the JDK 22+ source launcher can all find files by name.",
            "Package by feature. Make classes package-private by default and public only when another package needs them.",
            "Don't create subpackages for \"internal\" classes unless they really form their own unit; a subpackage can't see its parent's package-private members.",
            "Use explicit single-type imports in production code and let the IDE organise them. Avoid two wildcard imports that could ever supply the same simple name.",
            "Use static imports sparingly, for names that are unambiguous in context (`assertEquals`, `groupingBy`, `comparing`). Prefer single static imports to static wildcards.",
            "Never name a class after a `java.lang` type (`String`, `Object`, `Record`, `Module`, `Process`), and avoid other famous JDK names like `List`, `Date` or `Optional`.",
            "Pass the classpath explicitly with `-cp`; don't rely on a global `CLASSPATH`. In builds, let Maven or Gradle compute it, and check for duplicate classes (Maven's `dependency:tree`, or a duplicate-class check in the build).",
            "Write a `package-info.java` for every package that's part of an API: one paragraph of Javadoc saying what the package is for and which classes are its entry points.",
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
            "Imports have zero run-time cost. Three versions of `Basket` (wildcard, explicit, no imports) compiled with `-g:none` produced byte-for-byte identical class files with the same SHA-256. A wildcard import can't make a program load more classes or run slower.",
            "Choosing package-private over public has no per-call cost; the Access Modifiers lesson measures that.",
            "Classes are loaded lazily, on first use. A large classpath doesn't load more classes; it only makes each lookup potentially longer, because the application loader tries the entries in order.",
            "That lookup cost is measurable with an extreme classpath. I generated 1,000 small JARs and timed `java ... com.shop.app.Hello` three times each (machine-dependent wall-clock numbers): with the class in an entry before all 1,000 JARs, about 0.06 s; with it after all of them, about 0.18 s; with no extra JARs, 0.02 to 0.03 s. The class had to be looked for in 1,000 JARs before it was found, and just having them listed cost a little.",
            "Real applications rarely have 1,000 JARs, but a Spring Boot service can easily have a hundred or more, and every class lookup that misses (`Class.forName` probes, optional-dependency checks) walks the whole list. Fewer, deduplicated dependencies help startup a bit and correctness a lot.",
          ],
        },
      ],
    },
    {
      title: "Packages in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Two package problems I'd expect in a ride-hailing backend, both rebuilt with real libraries and real output.",
        },
        {
          type: "heading",
          text: "A bean in a sibling package that component scanning never finds",
        },
        {
          type: "paragraph",
          text: "In Spring Boot, `@SpringBootApplication` includes `@ComponentScan` with no base package, which means \"scan the package of this class and everything below it\". The trip team's app class sits in `com.rides.app`. The payments team adds `FareCharger` in `com.rides.payments`, a sibling, not a child. To reproduce it without Spring Boot, I used plain Spring Framework 6.2.11 with the same `@ComponentScan` semantics:",
        },
        {
          type: "diagram",
          text: `src/com/rides/
├── app/
│   ├── RidesApplication.java   @Configuration @ComponentScan
│   └── TripController.java     @Component, needs a FareCharger
└── payments/
    └── FareCharger.java        @Service

scan starts at com.rides.app  ──►  com.rides.app.**
com.rides.payments is a sibling, so it is never scanned`,
          caption: "Component scanning works on package prefixes, exactly like the folder tree.",
        },
        {
          type: "code",
          language: "java",
          title: "src/com/rides/app/RidesApplication.java",
          code: `package com.rides.app;

import java.util.Arrays;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan            // no basePackages: scans com.rides.app (this class's package) and below
public class RidesApplication {
    public static void main(String[] args) {
        try (var context = new AnnotationConfigApplicationContext(RidesApplication.class)) {
            System.out.println("beans: " + Arrays.stream(context.getBeanDefinitionNames())
                    .filter(name -> !name.startsWith("org.springframework")).toList());
            TripController trips = context.getBean(TripController.class);
            System.out.println(trips.endTrip("T-1001", 245_00));
        }
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/rides/app/TripController.java",
          code: `package com.rides.app;

import com.rides.payments.FareCharger;
import org.springframework.stereotype.Component;

@Component
public class TripController {
    private final FareCharger fareCharger;

    public TripController(FareCharger fareCharger) {
        this.fareCharger = fareCharger;
    }

    public String endTrip(String tripId, long farePaise) {
        return tripId + " ended, " + fareCharger.charge(tripId, farePaise);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/rides/payments/FareCharger.java",
          code: `package com.rides.payments;

import org.springframework.stereotype.Service;

@Service
public class FareCharger {
    public String charge(String tripId, long farePaise) {
        return "charged " + farePaise + " paise for " + tripId;
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# Maven: org.springframework:spring-context:6.2.11 (plus its dependencies in $SPRING)
javac -cp "$SPRING" -d out $(find src -name '*.java')
java -cp "$SPRING:out" com.rides.app.RidesApplication
# output trimmed: a WARNING log line and most stack frames removed, path shortened`,
        },
        {
          type: "output",
          text: `Exception in thread "main" org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'tripController' defined in file [.../out/com/rides/app/TripController.class]: Unsatisfied dependency expressed through constructor parameter 0: No qualifying bean of type 'com.rides.payments.FareCharger' available: expected at least 1 bean which qualifies as autowire candidate. Dependency annotations: {}
	at org.springframework.beans.factory.support.ConstructorResolver.createArgumentArray(ConstructorResolver.java:804)
	...
	at org.springframework.context.annotation.AnnotationConfigApplicationContext.<init>(AnnotationConfigApplicationContext.java:93)
	at com.rides.app.RidesApplication.main(RidesApplication.java:12)
Caused by: org.springframework.beans.factory.NoSuchBeanDefinitionException: No qualifying bean of type 'com.rides.payments.FareCharger' available: expected at least 1 bean which qualifies as autowire candidate. Dependency annotations: {}
	at org.springframework.beans.factory.support.DefaultListableBeanFactory.raiseNoMatchingBeanFound(DefaultListableBeanFactory.java:2303)
	...`,
        },
        {
          type: "paragraph",
          text: "The fix is to make the scan cover both packages. Either move the application class up to the common parent, `package com.rides;`, and keep the bare `@ComponentScan`, or name the base package explicitly:",
        },
        {
          type: "code",
          language: "java",
          code: `@Configuration
@ComponentScan(basePackages = "com.rides")     // the fix: scan the common parent
public class RidesApplication { ... }

// Spring Boot equivalent, if moving the class isn't an option:
@SpringBootApplication(scanBasePackages = "com.rides")`,
        },
        {
          type: "output",
          text: `beans: [ridesApplication, tripController, fareCharger]
T-1001 ended, charged 24500 paise for T-1001`,
        },
        {
          type: "list",
          items: [
            "**What happened:** `javac` was perfectly happy, because `TripController` imports a public class. Compilation checks that a type exists and is accessible; it knows nothing about Spring. Component scanning is a run-time search over package prefixes: it lists the classpath resources under `com/rides/app/` and registers every annotated class it finds. `com/rides/payments/` was never listed, so `FareCharger` never became a bean.",
            "The context failed at startup, not at the first payment, because `TripController` takes `FareCharger` in its constructor. With field injection marked `required = false`, or an `ObjectProvider` used lazily, the same bug would surface much later, as a `null` or an exception in the middle of ending a trip.",
            "Both fixes printed the same output: three beans, and a charged trip. Moving the class up to `com.rides` is what I'd do; it's the layout Spring Boot's documentation recommends, with the main class in a root package above everything else. `scanBasePackages` is for when the class can't move, for example a shared starter module.",
            "In Spring Boot, the main class's package also sets the default for Spring Data repository scanning and JPA `@Entity` scanning, so the same sibling-package mistake shows up as \"not a managed type\" or a missing repository bean. The Spring Boot track covers those annotations.",
            "Putting the main class in the unnamed package is the opposite failure: the scan would cover every class on the classpath, every library included.",
          ],
        },
        {
          type: "heading",
          text: "An old JAR that wins on the classpath",
        },
        {
          type: "paragraph",
          text: "The pricing team ships `pricing-2.0.jar`, which lowers the surge cap from 3x to 2x and adds a per-zone cap for airports. The fare service is compiled against 2.0, but a transitive dependency still drags in `pricing-1.4.jar`, and in this deployment it lands first on the classpath:",
        },
        {
          type: "code",
          language: "java",
          title: "SurgePolicy.java (v1.4)",
          code: `package com.rides.pricing;

public class SurgePolicy {
    public static String version() { return "1.4"; }

    public static double cap() { return 3.0; }              // old rule: surge up to 3x
}`,
        },
        {
          type: "code",
          language: "java",
          title: "SurgePolicy.java (v2.0)",
          code: `package com.rides.pricing;

public class SurgePolicy {
    public static String version() { return "2.0"; }

    public static double cap() { return 2.0; }              // new rule: surge capped at 2x

    public static double capFor(String zone) {              // added in 2.0
        return zone.startsWith("AIRPORT") ? 1.5 : cap();
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "src/com/rides/app/FareService.java",
          code: `package com.rides.app;

import com.rides.pricing.SurgePolicy;
import java.net.URL;
import java.util.Collections;
import java.util.List;

public class FareService {
    static long cityFare(long basePaise, double demand) {
        return Math.round(basePaise * Math.min(demand, SurgePolicy.cap()));
    }

    static long zoneFare(long basePaise, double demand, String zone) {
        return Math.round(basePaise * Math.min(demand, SurgePolicy.capFor(zone)));   // 2.0 API
    }

    public static void main(String[] args) throws Exception {
        // Startup check: every copy of the class file the class loader can see
        List<URL> copies = Collections.list(FareService.class.getClassLoader()
                .getResources("com/rides/pricing/SurgePolicy.class"));
        System.out.println("copies of SurgePolicy.class on the classpath: " + copies.size());
        copies.forEach(url -> System.out.println("  " + jarName(url.toString())));

        URL used = SurgePolicy.class.getProtectionDomain().getCodeSource().getLocation();
        System.out.println("using SurgePolicy " + SurgePolicy.version() + " from " + jarName(used.toString()));
        System.out.println("city fare:    " + cityFare(200_00, 2.8));
        System.out.println("airport fare: " + zoneFare(200_00, 2.8, "AIRPORT-T2"));
    }

    static String jarName(String url) {
        return url.replaceAll("^.*/([^/]+\\\\.jar).*$", "$1");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d classes -cp pricing-2.0.jar src/com/rides/app/FareService.java
java -cp classes:pricing-1.4.jar:pricing-2.0.jar com.rides.app.FareService   # the bug
java -cp classes:pricing-2.0.jar com.rides.app.FareService                   # the fix`,
        },
        {
          type: "output",
          text: `copies of SurgePolicy.class on the classpath: 2
  pricing-1.4.jar
  pricing-2.0.jar
using SurgePolicy 1.4 from pricing-1.4.jar
city fare:    56000
Exception in thread "main" java.lang.NoSuchMethodError: 'double com.rides.pricing.SurgePolicy.capFor(java.lang.String)'
	at com.rides.app.FareService.zoneFare(FareService.java:14)
	at com.rides.app.FareService.main(FareService.java:27)

copies of SurgePolicy.class on the classpath: 1
  pricing-2.0.jar
using SurgePolicy 2.0 from pricing-2.0.jar
city fare:    40000
airport fare: 30000`,
        },
        {
          type: "list",
          items: [
            "**What happened:** the application loader took `com/rides/pricing/SurgePolicy.class` from the first entry that had it, `pricing-1.4.jar`. `FareService` didn't notice: its constant pool only says `com/rides/pricing/SurgePolicy.cap:()D`, and 1.4 has that method.",
            "So the first symptom was **silent and wrong**: a 2.8x demand surge on a Rs. 200 base fare charged Rs. 560 instead of the 2x-capped Rs. 400. Nothing threw. That's a pricing incident, not a crash.",
            "The second symptom was loud: `capFor` doesn't exist in 1.4, so resolving it threw `NoSuchMethodError` the first time an airport fare was calculated, at line 14. A `LinkageError` like this one, or `NoClassDefFoundError`, `AbstractMethodError` or `IncompatibleClassChangeError`, right after a dependency change almost always means the class that loaded isn't the one the code was compiled against.",
            "The startup check is cheap insurance: `ClassLoader.getResources` returns every copy of a resource on the classpath, in search order, while `getResource` returns only the first. Logging (or failing on) more than one copy of a critical class turns the silent version into a visible one.",
            "The fix is removing the duplicate, not reordering the classpath, because with a wildcard like `-cp 'lib/*'` the order isn't even specified. In Maven that means finding who pulls in 1.4 with `mvn dependency:tree` and excluding it or pinning 2.0 in `dependencyManagement`. Modules make this a startup error instead of a coin toss, because two modules on the module path can't contain the same package; that's in the Java Modules lesson.",
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
              question: "What is a package in Java, and why do we use packages?",
              answer:
                "A package is a named group of related types. It gives them a namespace, so `java.util.Date` and `java.sql.Date` can coexist; it organises them into folders, because `com.shop.order.Order` lives at `com/shop/order/Order.class`; and it's an access boundary, because members with no modifier are visible only inside the package.\n\nThe namespace part is visible in any class file: `javap -v` on my `Order` showed `this_class` as `com/shop/order/Order`. The package isn't stored separately anywhere; it's the prefix of the class's name.",
            },
            {
              question: "What are the naming conventions for packages?",
              answer:
                "All lowercase, starting with the reversed internet domain of the organisation, then the project and the feature: `com.example.shop.order`. Characters that aren't legal in identifiers are replaced, often with an underscore.\n\nThe reversed domain makes names globally unique without a registry. Each segment must be a valid identifier: `package com.example.int;` failed with `<identifier> expected`. Uppercase like `Com.Shop` compiles, but it's against convention and risky on case-insensitive file systems.",
            },
            {
              question: "Where does the package declaration go, and how many can a file have?",
              answer:
                "It's the first statement in the file, before any imports, and a file has at most one. Only comments, and annotations in `package-info.java`, can come before it. All types in the file belong to that package.\n\nWhen I put an import first, `javac` reported `class, interface, enum, or record expected` at the `package` line, and a second `package` line gave the same error.",
            },
            {
              question: "What is the default (unnamed) package, and why should you avoid it?",
              answer:
                "A file with no `package` declaration goes into the unnamed package. It's fine for quick experiments, but classes in named packages can't refer to it: `import PriceUtil;` fails with `'.' expected`, and without the import the name just isn't found.\n\nIn my test, `com.shop.Checkout` got `cannot find symbol ... variable PriceUtil` even though both classes were compiled together. It also can't be part of a named module, and framework scanning that starts from it would scan the whole classpath.",
            },
            {
              question: "What does an import statement do?",
              answer:
                "It lets me refer to a type, or with `import static` a static member, by its simple name instead of its fully qualified name. It doesn't load anything and doesn't grant access to anything.\n\nThe compiler replaces every simple name with the full name, and the import vanishes. My three versions of `Basket`, with a wildcard, explicit imports and no imports, compiled to byte-identical class files with `-g:none`.",
            },
            {
              question: "Do you need to import classes from `java.lang`?",
              answer:
                "No. Every compilation unit implicitly imports `java.lang.*` (JLS 7.3), which is why `String`, `System`, `Math` and `Integer` work everywhere without an import.\n\nIt's an on-demand import, though, so it has the lowest priority. A class called `String` in my own package beat it, and `main(String[] args)` turned into `main(com.shop.String[])`, which the launcher rejected with `Main method not found`.",
            },
            {
              question: "What is the difference between a wildcard import and a single-type import?",
              answer:
                "`import java.util.List;` imports one type. `import java.util.*;` makes every public type in `java.util` available by simple name, as needed. Neither imports subpackages.\n\nSingle-type imports win over wildcards and over types in the current package. In my test, `import java.util.Date;` resolved the clash between `java.util.*` and `java.sql.*`. Both forms compile to exactly the same class file.",
            },
            {
              question: "How do you use two classes with the same simple name in one file?",
              answer:
                "Import one of them and write the other with its fully qualified name. Two single-type imports of the same simple name are a compile error.\n\nIn `TwoDates` I imported `java.util.Date` and wrote `java.sql.Date due = java.sql.Date.valueOf(\"2026-11-20\")`. Importing both gave `a type with the same simple name is already defined by the single-type-import of Date`.",
            },
            {
              question: "What is a static import?",
              answer:
                "An import of static members, like `import static java.lang.Math.max;` or `import static java.lang.Math.*;`, so I can write `max(3, 7)` instead of `Math.max(3, 7)`. It imports the name, so all overloads come along.\n\nIt's useful for assertions, `Collectors` and constants, and harmful when it hides where a name comes from. Members of the class itself beat it: with `import static java.lang.Integer.*;`, `toString(42)` resolved to `Object.toString()` and failed to compile.",
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
              question: "Do imports affect performance or the size of the class file?",
              answer:
                "No. Imports exist only in source code; the class file holds fully qualified names in its constant pool and nothing called an import. Classes are loaded when code first uses them, not when they're imported.\n\nI proved it with three versions of the same class. With default flags they differed only in the `LineNumberTable`, because the explicit imports pushed the code down three lines. With `-g:none` all three were 1953 bytes with the same SHA-256.",
            },
            {
              question: "Is a wildcard import worse than explicit imports, then?",
              answer:
                "Not for performance, only for robustness and readability. With wildcards, the meaning of a simple name depends on the full contents of every imported package, which can change when a dependency is upgraded.\n\nMy `WildcardInvoice` used `java.util.Currency` through `import java.util.*;` next to `import com.shop.money.*;`. It compiled against `money-1.0.jar` and broke against `money-2.0.jar`, which added a `Currency` enum: `reference to Currency is ambiguous`. The explicit version kept compiling.",
            },
            {
              question: "Are subpackages related to their parent package?",
              answer:
                "Only by name. `com.shop.billing` has no special access to `com.shop`, a wildcard import of `com.shop.*` doesn't include it, and the JVM treats them as unrelated run-time packages.\n\n`com.shop.billing.Invoice` failed to read `com.shop.Order`'s package-private field with `totalPaise is not public in Order; cannot be accessed from outside package`, and `import java.util.*;` didn't make `Function` from `java.util.function` visible.",
            },
            {
              question: "How must the directory structure match the package, and what do `-d` and `-cp` do?",
              answer:
                "Compiled classes must sit in folders that match the package below a classpath root: `com.shop.App` must be `<root>/com/shop/App.class`. `javac -d out` creates that tree under `out`, and `java -cp out com.shop.App` names the root and the binary name.\n\nSource files only need the layout when a tool has to find them by name, like `javac -sourcepath src` or JDK 22+'s multi-file source launcher. Running from inside `out/com/shop` gave `NoClassDefFoundError: App (wrong name: com/shop/App)`, because the file was found under the wrong name.",
            },
            {
              question: "What is the classpath, and how do you set it?",
              answer:
                "The ordered list of directories and JARs where the application class loader looks for classes and resources. It's set with `-cp`, `-classpath` or `--class-path`, or the `CLASSPATH` environment variable; with neither, it's the current directory.\n\nOrder matters, because the first entry containing a class wins, and a missing entry is ignored silently: `-cp classes:money.jar:no-such.jar` ran normally. Setting `CLASSPATH` also removes `.` unless I add it back, which broke `java Hi` in my test.",
            },
            {
              question: "What are the common causes of \"Could not find or load main class\"?",
              answer:
                "The class name or the classpath is wrong: using the simple name instead of the binary name (`java -cp out App`), pointing `-cp` at the package folder instead of the root, running from inside the package folder, adding `.class` to the name, forgetting the current directory when `CLASSPATH` is set, or a typo.\n\nThe `Caused by` line tells them apart. `ClassNotFoundException: App` means no file was found; `NoClassDefFoundError: App (wrong name: com/shop/App)` means a file was found, but its `this_class` says it belongs to a package.",
            },
            {
              question: "Why does `java -jar` ignore `-cp`?",
              answer:
                "With `-jar`, the JAR is the whole user classpath; `-cp` and `CLASSPATH` are ignored. Dependencies have to be listed in the manifest's `Class-Path` attribute, relative to the JAR's location.\n\n`java -cp money.jar -jar app.jar` failed with `NoClassDefFoundError: com/shop/money/Money`. An `app2.jar` with `Class-Path: money.jar` in its manifest ran, and so did `java -cp app.jar:money.jar com.shop.app.App` without `-jar`.",
            },
            {
              question: "What is `package-info.java` used for?",
              answer:
                "It holds the package's Javadoc and its package-level annotations, since there's no class to put them on. It can also have imports for those annotations, after the `package` line.\n\n`javac` compiles it into a synthetic interface, `com.shop.order.package-info` with flags `ACC_INTERFACE, ACC_ABSTRACT, ACC_SYNTHETIC`, that carries the `RuntimeVisibleAnnotations` attribute. `Package.getAnnotation(Owner.class).value()` read `checkout-team` from it. With only Javadoc, no class file is written unless I pass `-Xpkginfo:always`.",
            },
            {
              question: "In what order does javac look up a simple type name?",
              answer:
                "Types declared in scope (including the file's own top-level types), then single-type imports, then other types of the current package, then on-demand imports including the implicit `java.lang.*`; on JDK 25 module imports come last. The first match wins, and ambiguity is only an error when two on-demand imports supply a name that's actually used.\n\nIn my test, `WildcardCart` in `com.shop` with `import java.util.*;` used `com.shop.List`, and `ExplicitCart` with `import java.util.List;` got `java.util.ImmutableCollections$List12`.",
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
              question: "What is a run-time package, and how can two classes in the same package fail to access each other?",
              answer:
                "The JVM identifies a run-time package by the package name and the defining class loader (JVMS 5.3), and checks package-private access against it (JVMS 5.4.4). Two classes with the same package name defined by different loaders are in different run-time packages.\n\nIn my demo, `Auditor` from a child loader called package-private `Inventory.peek()` from the app loader and got `IllegalAccessError: class com.shop.stock.Auditor tried to access method ... (... loader 'plugin' ...; ... loader 'app')`. When one loader defined both, the call worked.",
            },
            {
              question: "How does the application class loader find a class on the classpath?",
              answer:
                "It first checks whether the package belongs to a named module, then delegates to its parent, the platform loader, which delegates to the bootstrap loader. If neither has it, it converts the binary name to a path (`com/shop/order/Order.class`) and tries each classpath entry in order. The first hit is defined; later entries are never consulted for that name.\n\nWith `tax-1.0.jar` and `tax-2.0.jar` both on the classpath, swapping their order switched `Bill` between 12% and 18%, and `-Xlog:class+load` printed the JAR each class came from.",
            },
            {
              question: "What happens in the class file to a class's package and its imports?",
              answer:
                "The package becomes the prefix of `this_class`, in internal form with slashes: `com/shop/order/Order`. Imports disappear; every type reference becomes a `Class` constant with a full internal name, like `java/util/ArrayList`.\n\nThere's no package attribute and no import table. Package-private access isn't even a flag: `OrderLine`'s class flags were `0x0020`, just `ACC_SUPER`, while the public `Order` had `0x0021`.",
            },
            {
              question: "What's the difference between a binary name and a canonical name, and why does it matter?",
              answer:
                "For a nested class, the canonical name uses dots (`com.shop.catalog.NestedNames.Line`) and is what source code uses; the binary name uses `$` (`com.shop.catalog.NestedNames$Line`) and is what the class loader, `Class.forName` and `getName()` use. For top-level classes they're the same.\n\n`Class.forName(\"com.shop.catalog.NestedNames.Line\")` threw `ClassNotFoundException`, because the loader takes the name literally and looks for a `Line.class` in a folder called `NestedNames`. The binary name worked.",
            },
            {
              question: "What is a split package, and how do sealing and modules deal with it?",
              answer:
                "A package whose classes come from more than one JAR or directory. On the classpath it's legal: with one loader, they form a single run-time package. A JAR manifest with `Sealed: true` forbids it for that JAR's packages, and the module system forbids it between modules, because each package belongs to exactly one module.\n\nI ran `Money` from a JAR and `Discount` from another folder, both in `com.shop.money`. Unsealed it worked; sealed, it threw `SecurityException: sealing violation: package com.shop.money is sealed` when `Discount` was loaded.",
            },
            {
              question: "What are module import declarations in JDK 25, and how do they interact with other imports?",
              answer:
                "`import module M;` (JEP 511, final in JDK 25) imports on demand every public type in every package `M` exports, plus those of modules it requires transitively. It works from classpath code, and compact source files get `import module java.base;` implicitly.\n\nThey have the lowest priority: single-type imports, the current package and on-demand imports all shadow them. `import module java.base; import module java.sql;` made `Date` ambiguous until I added `import java.util.Date;`. JDK 21 rejected the syntax with `'.' expected`.",
            },
            {
              question: "Why can't you define your own class in the `java.lang` package, or any `java.*` package?",
              answer:
                "Two layers stop it. `javac` refuses `package java.lang;` with `package exists in another module: java.base`, because modules own their packages. For a new `java.*` package that no module owns, `javac` compiles it, but `ClassLoader.preDefineClass` refuses to define it at run time.\n\n`package java.shop;` compiled, and running it threw `SecurityException: Prohibited package name: java.shop`. Without these checks, a classpath class could pose as part of the platform, which mattered most in the days when untrusted applet code ran inside the same JVM.",
            },
            {
              question: "How do static imports interact with the members of the class that uses them?",
              answer:
                "A static import is shadowed by any member of the same name that's in scope, including inherited members (JLS 6.4.1). So a static import can never override `toString`, `equals` or anything the class or its superclasses declare. Two static on-demand imports supplying the same name are ambiguous only when used.\n\n`import static java.lang.Integer.*;` plus `toString(42)` failed with `method toString in class Object cannot be applied to given types`. And `MAX_VALUE` with both `Integer.*` and `Long.*` imported gave `reference to MAX_VALUE is ambiguous`.",
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
              question: "A Spring Boot app fails at startup with `NoSuchBeanDefinitionException` for a service that clearly has `@Service` on it. What do you check first?",
              answer:
                "The packages. `@SpringBootApplication` scans its own package and everything below it, so a bean in a sibling package is never found. I compare the main class's package with the missing bean's package before anything else.\n\nIn my ride-hailing reproduction, `RidesApplication` in `com.rides.app` couldn't see `FareCharger` in `com.rides.payments`, and the context failed with `No qualifying bean of type 'com.rides.payments.FareCharger' available`. Moving the main class to `com.rides`, or `scanBasePackages = \"com.rides\"`, fixed it.",
            },
            {
              question: "A colleague runs `java App` from inside `target/classes/com/shop` and gets `NoClassDefFoundError` with \"wrong name\". Explain and fix.",
              answer:
                "The JVM found `App.class` in the current directory, read it, and saw that its `this_class` is `com/shop/App`. A class must be loaded under its real binary name, so it refused. The file is fine; the command is wrong.\n\nThe fix is to run from the classpath root with the full name: `java -cp target/classes com.shop.App`. I got exactly `NoClassDefFoundError: App (wrong name: com/shop/App)` from inside `out/com/shop`, and the correct command printed `Running com.shop.App`.",
            },
            {
              question: "After a dependency upgrade, a service throws `NoSuchMethodError` on a method that definitely exists in the new version. What's going on?",
              answer:
                "An older copy of the class is winning on the classpath. The code was compiled against the new version, but at run time the loader took the class from the first JAR that had it, an old version without that method.\n\nIn my fare service, `pricing-1.4.jar` before `pricing-2.0.jar` gave a silently wrong fare of 56000 instead of 40000 and then `NoSuchMethodError` for `capFor`. I'd confirm with `-Xlog:class+load` or the class's code source, list duplicates with `ClassLoader.getResources`, and remove the old JAR via `mvn dependency:tree` and an exclusion.",
            },
            {
              question: "A team wants to move all implementation classes into an `.impl` subpackage to \"hide\" them. What's your advice?",
              answer:
                "That hides nothing. A subpackage is a different package, so the public classes in the parent can only use the `impl` classes if those are public too, and then everyone can use them.\n\nI saw the mechanism with `com.shop.billing` failing to reach `com.shop`'s package-private members. Better options: keep the implementation classes package-private in the same package as their public API, or, for a library, use a module that exports only the API package.",
            },
            {
              question: "A build broke after upgrading a library, with \"reference to X is ambiguous\" in a file nobody changed. Why, and how do you prevent it?",
              answer:
                "The file uses two wildcard imports, and the new library version added a class with the same simple name as one the file was using from the other package. On-demand imports are only ambiguous when both supply a name that's used, so it compiled until the library grew.\n\nThat's exactly my `WildcardInvoice`: `money-2.0.jar` added `Currency`, which clashed with `java.util.Currency`. The fix is an explicit import of the intended type; prevention is explicit imports in production code.",
            },
            {
              question: "Package-private methods are called successfully in unit tests, but the same tests fail with `IllegalAccessError` when run inside a plugin-style test harness. Why?",
              answer:
                "The harness probably loads test classes with its own class loader while the class under test comes from the parent loader. Same package name, different defining loaders, so different run-time packages, and package-private access is denied at link time.\n\nMy `RuntimePackages` demo reproduced it: with one loader the call printed `Auditor sees reserved=3`, with two it threw `IllegalAccessError` naming loaders `'plugin'` and `'app'`. The fix is to load both through the same loader, or test through the public API.",
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
            "Create `src/com/example/hello/Hello.java` with `package com.example.hello;` and a `main` that prints `Hello.class.getName()`. Compile with `javac -d out`, run with `java -cp out com.example.hello.Hello`, then `cd out/com/example/hello` and run `java Hello`.",
            "Write a class that imports `java.util.*` and `java.sql.*` and declares a `Date` variable. Compile it. Then add `import java.util.Date;` and compile again.",
            "Create `com.example.Base` with a package-private `static String secret()`, and `com.example.sub.User` that calls `Base.secret()`. Compile both. Then move `User` into `com.example` (and drop the import) and run it.",
            "Write the same small class three times, with a wildcard import, explicit imports and fully qualified names. Compile each with `javac -g:none` in its own folder and compare them with `sha256sum`.",
            "Build `v1.jar` and `v2.jar`, each with a `com.example.Version` whose `get()` returns `\"1\"` or `\"2\"`. Run a class that prints `Version.get()` with `-cp classes:v1.jar:v2.jar`, then with the JARs swapped, then add `-Xlog:class+load` and look for `com.example.Version`.",
            "Write a `package-info.java` with only a Javadoc comment for a package that has one class. Compile with `-d out` and list the files, then compile again with `-Xpkginfo:always -d out2`.",
            "On JDK 25: write a class with `import module java.base;` and `import module java.sql;` that declares a `Date`. Compile it, then add `import java.util.Date;`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `com.example.hello.Hello`, and from inside the folder `Error: Could not find or load main class Hello` with `Caused by: java.lang.NoClassDefFoundError: Hello (wrong name: com/example/hello/Hello)`. Step 2 reports `reference to Date is ambiguous` with both `java.sql.Date` and `java.util.Date` listed, and compiles cleanly after the extra import. Step 3 fails with `secret() is not public in Base; cannot be accessed from outside package`, and prints whatever `secret()` returns once both are in `com.example`. In step 4 all three hashes match. Step 5 prints `1`, then `2`, and with the JARs swapped the log line reads `com.example.Version source:` followed by the path of `v2.jar`. Step 6 shows only the class file the first time and a `package-info.class` the second. Step 7 fails with `reference to Date is ambiguous` and compiles after the single-type import.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `PACKAGE     named group of types: namespace + folder + access
            boundary;  package com.example.shop.order;  first line
NAMES       simple Order | canonical a.b.Outer.Inner
            binary a.b.Outer$Inner | internal a/b/Outer$Inner
LAYOUT      javac -d out  ->  out/com/shop/App.class
            java -cp out com.shop.App   (root + binary name)
            from inside the folder -> "wrong name: com/shop/App"

IMPORTS     single-type > current package > on-demand (java.lang)
            > module import (JDK 25)
            wildcard: one package, never subpackages
            two wildcards, same name, used -> "is ambiguous"
            static import loses to the class's own members
            compile-time only: identical class files

UNNAMED     no package line; can't be imported from a package
SUBPACKAGE  unrelated: no shared package-private access

CLASSPATH   dirs + JARs, searched in order, first match wins
            -jar ignores -cp;  Main-Class, Class-Path in manifest
            CLASSPATH set -> "." no longer included
RUNTIME     package = (class loader, name)
            different loaders -> IllegalAccessError
            Sealed: true -> no split package;  modules: never

DESIGN      package by feature, package-private by default,
            explicit imports in production code`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A package is three things at once: a namespace that lives on in the class name, a folder layout that `javac -d` and the class loader both depend on, and the package-private access boundary.",
            "Imports, wildcards and static imports are compile-time shorthand that never reach the class file. The classpath and class loaders are where packages become real at run time, and where duplicate classes and mismatched loaders cause trouble.",
            "Next comes Access Modifiers, which takes the package boundary from this lesson and adds the rest of the rules: `private`, `protected` across packages, access and overriding, and how the JVM and frameworks check them.",
          ],
        },
      ],
    },
  ],
};
