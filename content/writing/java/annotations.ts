import type { Lesson } from "../types";

export const annotations: Lesson = {
  slug: "annotations",
  date: "2026-11-13",
  title: "Annotations: Built-in, Custom and Meta-Annotations",
  description:
    "Java annotations on JDK 21 from the inside: metadata that does nothing by itself, the built-ins (@Override, @Deprecated with since and forRemoval, @SuppressWarnings, @FunctionalInterface, @SafeVarargs) and the compiler messages they produce, declaring custom annotations and the element types javac accepts, the meta-annotations @Retention, @Target, @Documented, @Inherited and @Repeatable, what javap shows in RuntimeVisibleAnnotations and RuntimeInvisibleAnnotations, why an annotation instance is a jdk.proxy class with value-based equals and hashCode, the 212 classes loaded by the first getAnnotation call, how annotations on record components spread to fields, accessors and parameters, and a log-masking annotation without @Retention(RUNTIME) that leaked riders' phone numbers.",
  tags: ["Core Java", "Annotations", "Metadata", "Reflection"],
  sections: [
    {
      title: "What Annotations Are",
      blocks: [
        {
          type: "paragraph",
          text: "The Reflection phase ended with Dynamic Proxies, MethodHandles and How Frameworks Use Reflection: frameworks find your classes and methods at run time and call them for you. What it left open is how a framework knows **which** method handles `GET /trips/{id}`, which field must not be logged, or which method is a test. The answer, almost everywhere in modern Java, is an **annotation**: `@Get(\"/trips/{id}\")`, `@Masked`, `@Test`.",
        },
        {
          type: "paragraph",
          text: "An annotation is **metadata**: a structured note attached to a declaration (a class, method, field, parameter, record component, package, module) or, since Java 8, to a use of a type. It's written with `@`, can carry values (`@Deprecated(since = \"2.3\", forRemoval = true)`), and is declared with `@interface`. The important part is what it **doesn't** do: an annotation has no behaviour of its own. `@Test` doesn't run a test and `@Transactional` doesn't open a transaction. Something else has to read the annotation and act on it: the compiler, an annotation processor during compilation, or code using reflection at run time.",
        },
        {
          type: "paragraph",
          text: "This lesson covers the annotations the JDK ships, how to declare your own, the meta-annotations that control where an annotation may appear and how long it survives, and what javac and the JVM actually do with them (read with `javap` and the JDK's own classes). The next lesson, Processing Annotations at Run Time and Compile Time, builds the readers: a validator, a test runner, a router and a real annotation processor.",
        },
      ],
    },
    {
      title: "Where They Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Before Java 5, metadata lived in comments and side files. Javadoc's `@deprecated` tag was the first piece of metadata the compiler read, out of a **comment**. XDoclet generated EJB deployment descriptors from Javadoc-style tags, and frameworks used XML files and naming conventions (JUnit 3 ran every method whose name started with `test`). C# shipped attributes in 2002, and JSR 175, \"A Metadata Facility for the Java Programming Language\", brought the same idea to Java 5 in 2004.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.1 to 1.4", "Javadoc `@deprecated` tag; XDoclet; XML descriptors", "Metadata in comments and files the compiler couldn't check"],
            ["Java 5 (2004)", "Annotations (JSR 175): `@interface`, `@Override`, `@Deprecated`, `@SuppressWarnings`, `@Retention`, `@Target`, `@Documented`, `@Inherited`; the `apt` tool", "Typed, checked metadata in the source and class file"],
            ["Java 6 (2006)", "Pluggable Annotation Processing API (JSR 269): `javax.annotation.processing`, processors run inside `javac`", "Compile-time processing without a separate tool (next lesson)"],
            ["Java 7 (2011)", "`@SafeVarargs`; `apt` deprecated (removed in Java 8)", "Silencing heap-pollution warnings where it's safe"],
            ["Java 8 (2014)", "Type annotations (JSR 308): `TYPE_USE`, `TYPE_PARAMETER`; `@Repeatable`; `@FunctionalInterface`; `-parameters`", "Annotations on any use of a type; repeating an annotation"],
            ["Java 9 (2017)", "`@Deprecated(since, forRemoval)` (JEP 277); module annotations", "Deprecation that says when and whether it will be removed"],
            ["Java 16 (2021)", "Records (JEP 395): `RECORD_COMPONENT` target, propagation to fields, accessors and parameters", "One annotation on a component ends up in up to four places"],
            ["Java 21 (2023)", "`javac` prints a note when processors are found implicitly on the class path; `-proc:full`", "The default is changing; covered in the next lesson"],
          ],
        },
        {
          type: "paragraph",
          text: "The early Java EE and Spring XML era ended largely because of annotations: `@Entity`, `@Autowired` and `@RequestMapping` replaced most deployment descriptors. The trade-off they brought is the subject of both lessons in this phase: configuration moved next to the code it configures, but the code that acts on it moved out of sight.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of the sticky labels on parcels in a courier's sorting hub.",
        },
        {
          type: "list",
          items: [
            "An **annotation is a label stuck on a parcel**: \"FRAGILE\", \"THIS SIDE UP\", \"DELIVER BEFORE 10:00\". The label doesn't move the parcel or protect it. It's information for whoever handles the parcel next.",
            "The **handlers** are what give labels meaning: the sorting machine reads the barcode, the loader reads FRAGILE. In Java those are the compiler (`@Override`), an annotation processor at build time, or a framework at run time (`@Test`, `@Get`). A label nobody reads has no effect.",
            "**Retention is how long the label stays on.** Some are peeled off at the first desk (`SOURCE`: only the compiler sees them). Some stay on the box but face inward, readable only by someone who opens it with special tools (`CLASS`: in the class file, invisible to reflection). Some stay on the outside all the way to the customer (`RUNTIME`).",
            "**Target is where a label may be stuck**: on the box, on one item inside, on the address field. A label printed for the address field can't go on the lid (`@Target`).",
            "**Label fields are fixed-format**: a date, a weight, one of a few ticked boxes. Nobody writes \"see the attached spreadsheet\" on a label. That's why annotation elements only accept primitives, strings, classes, enums, other annotations and arrays of those.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a parcel's label stays on that parcel. Some Java annotations can be **inherited** by subclasses (`@Inherited`), and an annotation on a record component is copied to up to four places in the class file. And a courier would notice a missing FRAGILE sticker on a box marked fragile in the manifest; Java doesn't notice a label that fell off at the first desk, which is the production bug at the end of this lesson.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Annotations in java.lang",
        },
        {
          type: "table",
          headers: ["Annotation", "Retention", "Read by", "What it does"],
          rows: [
            ["`@Override`", "SOURCE", "`javac`", "Compile error if the method doesn't override or implement anything"],
            ["`@Deprecated(since, forRemoval)`", "RUNTIME", "`javac`, Javadoc, `jdeprscan`", "Warnings at every use from another class; `forRemoval=true` warns even without `-Xlint`"],
            ["`@SuppressWarnings(\"...\")`", "SOURCE", "`javac`", "Silences named lint categories inside the annotated declaration"],
            ["`@FunctionalInterface`", "RUNTIME", "`javac`", "Compile error unless the interface has exactly one abstract method"],
            ["`@SafeVarargs`", "RUNTIME", "`javac`", "Silences heap-pollution warnings for a generic varargs method that can't be overridden"],
          ],
        },
        {
          type: "heading",
          text: "Meta-annotations in java.lang.annotation",
        },
        {
          type: "table",
          headers: ["Meta-annotation", "Goes on", "Default when absent", "Effect"],
          rows: [
            ["`@Retention(SOURCE / CLASS / RUNTIME)`", "An annotation type", "`CLASS`", "How far the annotation survives: source, class file, or reflection"],
            ["`@Target({ElementType...})`", "An annotation type", "All declaration contexts", "Where it may be written; a wrong place is a compile error"],
            ["`@Documented`", "An annotation type", "Not documented", "Javadoc shows the annotation in the annotated element's signature"],
            ["`@Inherited`", "An annotation type", "Not inherited", "A **class** annotation is found on subclasses by `getAnnotation`"],
            ["`@Repeatable(Container.class)`", "An annotation type", "Not repeatable", "The annotation may appear more than once; stored in the container"],
          ],
        },
        {
          type: "heading",
          text: "ElementType: where an annotation can go",
        },
        {
          type: "table",
          headers: ["ElementType", "Example", "Since"],
          rows: [
            ["`TYPE`", "`@Owner(\"asha\") class FareService`", "Java 5 (classes, interfaces, enums, records, annotations)"],
            ["`FIELD`, `METHOD`, `PARAMETER`, `CONSTRUCTOR`, `LOCAL_VARIABLE`", "`@Masked String phone;`", "Java 5"],
            ["`ANNOTATION_TYPE`", "`@Component @interface Service`", "Java 5 (meta-annotations)"],
            ["`PACKAGE`", "In `package-info.java`", "Java 5"],
            ["`TYPE_PARAMETER`", "`class Quote<@Priced T>`", "Java 8"],
            ["`TYPE_USE`", "`List<@NonEmpty String>`, `(@Paise long) x`", "Java 8"],
            ["`MODULE`", "`@Deprecated module legacy.fares`", "Java 9"],
            ["`RECORD_COMPONENT`", "`record Rider(@Masked String phone)`", "Java 16"],
          ],
        },
        {
          type: "heading",
          text: "What an element may return",
        },
        {
          type: "paragraph",
          text: "Annotation elements look like methods with no parameters. Their return type must be one of: a primitive, `String`, `Class` (optionally bounded, like `Class<? extends Surcharge>`), an enum, another annotation type, or a one-dimensional array of any of those. Values must be compile-time constants, and `null` is never allowed, not even as a default. The Declaring Custom Annotations section shows the exact errors.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Three retentions, read back with javap",
        },
        {
          type: "paragraph",
          text: "I declared three annotations that differ only in retention and put all three on one class:",
        },
        {
          type: "code",
          language: "java",
          title: "SourceNote.java",
          code: `import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.SOURCE)
public @interface SourceNote { String value(); }`,
        },
        {
          type: "code",
          language: "java",
          title: "ClassNote.java",
          code: `// No @Retention: the default is RetentionPolicy.CLASS
public @interface ClassNote { String value(); }`,
        },
        {
          type: "code",
          language: "java",
          title: "RuntimeNote.java",
          code: `import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.RUNTIME)
public @interface RuntimeNote { String value(); }`,
        },
        {
          type: "code",
          language: "java",
          title: "Trip.java",
          code: `@SourceNote("only the compiler sees me")
@ClassNote("written to the class file, hidden from reflection")
@RuntimeNote("visible to reflection")
public class Trip { }`,
        },
        {
          type: "code",
          language: "java",
          title: "ReadRetention.java",
          code: `import java.util.Arrays;

public class ReadRetention {
    public static void main(String[] args) {
        System.out.println(Arrays.toString(Trip.class.getAnnotations()));
        System.out.println("SourceNote:  " + Trip.class.isAnnotationPresent(SourceNote.class));
        System.out.println("ClassNote:   " + Trip.class.isAnnotationPresent(ClassNote.class));
        System.out.println("RuntimeNote: " + Trip.class.isAnnotationPresent(RuntimeNote.class));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac *.java && java ReadRetention
javap -v Trip            # the constant pool and the class attributes at the end
grep -c "only the compiler" Trip.class`,
        },
        {
          type: "output",
          text: `[@RuntimeNote("visible to reflection")]
SourceNote:  false
ClassNote:   false
RuntimeNote: true

Constant pool:
   ...
  #13 = Utf8               RuntimeVisibleAnnotations
  #14 = Utf8               LRuntimeNote;
  #15 = Utf8               value
  #16 = Utf8               visible to reflection
  #17 = Utf8               RuntimeInvisibleAnnotations
  #18 = Utf8               LClassNote;
  #19 = Utf8               written to the class file, hidden from reflection
...
SourceFile: "Trip.java"
RuntimeVisibleAnnotations:
  0: #14(#15=s#16)
    RuntimeNote(
      value="visible to reflection"
    )
RuntimeInvisibleAnnotations:
  0: #18(#15=s#19)
    ClassNote(
      value="written to the class file, hidden from reflection"
    )

0`,
        },
        {
          type: "image",
          src: "/images/java/annotations-retention.svg",
          alt: "Three rows, one per retention policy, going from source to class file to run time. @SourceNote with SOURCE retention is discarded after compilation and leaves no trace in Trip.class; only annotation processors see it. @ClassNote with CLASS retention, the default, is written into the RuntimeInvisibleAnnotations attribute, but isAnnotationPresent returns false; only bytecode tools see it. @RuntimeNote with RUNTIME retention is written into RuntimeVisibleAnnotations and Trip.class.getAnnotations() returns it. Below, the path of getAnnotation: HotSpot keeps only the RuntimeVisible bytes unparsed and returns them from Class.getRawAnnotations(), AnnotationParser skips non-RUNTIME types and fills in defaults and element values, and the result is a jdk.proxy2.$Proxy1 instance implementing RuntimeNote, backed by an AnnotationInvocationHandler whose value() reads a map, with equals and hashCode defined by element values and arrays cloned on every call.",
          caption: "Retention decides which attribute an annotation is written to, if any; reflection only ever sees RuntimeVisibleAnnotations.",
        },
        {
          type: "list",
          items: [
            "**`SOURCE`: gone.** There is no trace of `@SourceNote` in `Trip.class`: no attribute, no constant-pool entry, not even the string (the `grep -c` found 0 occurrences). `SourceNote.class` itself still exists, because the annotation **type** is an ordinary compiled type; only its uses are dropped.",
            "**`CLASS`: in the file, hidden at run time.** `@ClassNote` is in a `RuntimeInvisibleAnnotations` attribute with its value. Bytecode tools (ProGuard, ASM-based analysers, the Checker Framework's stub reading) can read it from the file. Reflection can't: HotSpot skips that attribute while parsing the class, and `isAnnotationPresent` returns `false`.",
            "**`RUNTIME`: visible.** `@RuntimeNote` goes into `RuntimeVisibleAnnotations`, and `getAnnotations()` returns it.",
            "**The default is `CLASS`.** An annotation declared without `@Retention`, like `ClassNote`, is compiled into the class file and never seen by reflection. It's the least useful of the three for application code, and it's what you get when you forget the line.",
            "**Annotations are stored compactly**: `#14(#15=s#16)` means \"annotation of type #14 (`LRuntimeNote;`) with element #15 (`value`) of kind `s` (String) set to #16\". Element names and values are constant-pool entries, shared with the rest of the class.",
          ],
        },
        {
          type: "paragraph",
          text: "I also ran `ReadRetention` with `-XX:+PreserveAllAnnotations`, which tells HotSpot to keep the invisible attribute's bytes too. The output was identical: `ClassNote: false`. The JDK's annotation parser checks each annotation **type's** own `@Retention` and skips anything that isn't `RUNTIME`, so the flag is only useful to agents and tools that read the raw bytes.",
        },
        {
          type: "heading",
          text: "An annotation type is an interface",
        },
        {
          type: "code",
          language: "java",
          title: "FareRule.java",
          code: `import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.RUNTIME)
public @interface FareRule {
    String zone();                       // required: no default
    int surgePercent() default 0;
    String[] tags() default {};
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac FareRule.java && javap -v FareRule",
        },
        {
          type: "output",
          text: `public interface FareRule extends java.lang.annotation.Annotation
  minor version: 0
  major version: 65
  flags: (0x2601) ACC_PUBLIC, ACC_INTERFACE, ACC_ABSTRACT, ACC_ANNOTATION
  ...
{
  public abstract java.lang.String zone();
    descriptor: ()Ljava/lang/String;
    flags: (0x0401) ACC_PUBLIC, ACC_ABSTRACT

  public abstract int surgePercent();
    descriptor: ()I
    flags: (0x0401) ACC_PUBLIC, ACC_ABSTRACT
    AnnotationDefault:
      default_value: I#12
        0

  public abstract java.lang.String[] tags();
    descriptor: ()[Ljava/lang/String;
    flags: (0x0401) ACC_PUBLIC, ACC_ABSTRACT
    AnnotationDefault:
      default_value: []
        []
}
SourceFile: "FareRule.java"
RuntimeVisibleAnnotations:
  0: #18(#19=e#20.#21)
    java.lang.annotation.Retention(
      value=Ljava/lang/annotation/RetentionPolicy;.RUNTIME
    )`,
        },
        {
          type: "list",
          items: [
            "**`@interface` compiles to an interface** that extends `java.lang.annotation.Annotation`, with the extra flag `ACC_ANNOTATION`. That's the only difference javac writes; there is no special kind of class file for annotations.",
            "**Each element is an abstract method.** `zone()` has no default, so every use must supply it.",
            "**Defaults live in an `AnnotationDefault` attribute on the method**, not at the use site. `surgePercent` defaults to `I#12` (the int 0), `tags` to an empty array. When a class says `@FareRule(zone = \"NEW-TOWN\")`, its class file contains only `zone`; the default is filled in when the annotation is read. Changing a default and recompiling only the annotation changes the value seen for every class that didn't set it, without recompiling those classes.",
            "**`@Retention` is itself an annotation**, stored in the annotation type's own `RuntimeVisibleAnnotations`. The JDK has to read it (with reflection, from this attribute) before it can decide whether `@FareRule` is visible.",
          ],
        },
        {
          type: "heading",
          text: "What getAnnotation returns: a dynamic proxy",
        },
        {
          type: "paragraph",
          text: "Something has to implement the `FareRule` interface when reflection hands me a `FareRule`. Nobody wrote that class, so the JDK generates one:",
        },
        {
          type: "code",
          language: "java",
          title: "Proxies.java",
          code: `import java.lang.annotation.Annotation;
import java.lang.reflect.Proxy;

public class Proxies {
    @FareRule(zone = "SALT-LAKE", surgePercent = 20)
    static class SaltLakePricing { }

    @FareRule(zone = "SALT-LAKE", surgePercent = 20)
    static class AnotherSaltLakePricing { }

    @FareRule(zone = "NEW-TOWN")
    static class NewTownPricing { }

    public static void main(String[] args) {
        FareRule a = SaltLakePricing.class.getAnnotation(FareRule.class);
        FareRule b = AnotherSaltLakePricing.class.getAnnotation(FareRule.class);
        FareRule c = NewTownPricing.class.getAnnotation(FareRule.class);

        System.out.println("class:          " + a.getClass().getName());
        System.out.println("is a proxy:     " + Proxy.isProxyClass(a.getClass()));
        System.out.println("handler:        " + Proxy.getInvocationHandler(a).getClass().getName());
        System.out.println("interfaces:     " + java.util.Arrays.toString(a.getClass().getInterfaces()));
        System.out.println("annotationType: " + a.annotationType());
        System.out.println("toString:       " + a);
        System.out.println("defaults used:  " + c);
        System.out.println("a.equals(b):    " + a.equals(b) + ", a == b: " + (a == b));
        System.out.println("hashCode:       " + a.hashCode() + " " + b.hashCode() + " " + c.hashCode());
        int manual = (127 * "zone".hashCode() ^ "SALT-LAKE".hashCode())
                + (127 * "surgePercent".hashCode() ^ Integer.hashCode(20))
                + (127 * "tags".hashCode() ^ java.util.Arrays.hashCode(new String[0]));
        System.out.println("by the formula: " + manual);
        System.out.println("same twice:     " + (a == SaltLakePricing.class.getAnnotation(FareRule.class)));
        System.out.println("FareRule is an interface: " + FareRule.class.isInterface()
                + ", isAnnotation: " + FareRule.class.isAnnotation()
                + ", extends Annotation: " + Annotation.class.isAssignableFrom(FareRule.class));
    }
}`,
        },
        {
          type: "output",
          text: `class:          jdk.proxy2.$Proxy1
is a proxy:     true
handler:        sun.reflect.annotation.AnnotationInvocationHandler
interfaces:     [interface FareRule]
annotationType: interface FareRule
toString:       @FareRule(surgePercent=20, tags={}, zone="SALT-LAKE")
defaults used:  @FareRule(surgePercent=0, tags={}, zone="NEW-TOWN")
a.equals(b):    true, a == b: false
hashCode:       -1417098827 -1417098827 1781478298
by the formula: -1417098827
same twice:     true
FareRule is an interface: true, isAnnotation: true, extends Annotation: true`,
        },
        {
          type: "list",
          items: [
            "**The instance is a dynamic proxy**, `jdk.proxy2.$Proxy1`, the same `java.lang.reflect.Proxy` mechanism the last Reflection lesson used. Its `InvocationHandler` is `sun.reflect.annotation.AnnotationInvocationHandler`, which holds a `Map` from element name to value. Calling `a.zone()` goes through the proxy to the handler, which looks up `\"zone\"` in the map.",
            "**The proxy lives in a dynamic module (`jdk.proxy2`)** because `FareRule` is a public interface in the unnamed module. For a package-private annotation, the proxy is generated in the annotation's own package instead, and the name loses its prefix (`$Proxy1`), which I saw in the Performance measurements.",
            "**`equals` compares element values, not identity.** `a` and `b` come from two different classes and are two different objects (`a == b` is `false`), but `equals` is `true` because every element has the same value. This is specified by `java.lang.annotation.Annotation`, not left to the implementation.",
            "**`hashCode` is specified too**: the sum over all elements of `(127 * name.hashCode()) ^ valueHashCode`, with `Arrays.hashCode` for arrays. My hand-computed `-1417098827` matched the proxy exactly. Any hand-written implementation of an annotation interface must follow the same formula (Example 3).",
            "**`toString` order isn't declaration order.** The parser starts from a copy of the map of defaults (`surgePercent`, `tags`) and then adds the values read from the class file (`zone`), so explicit values without a default come last. Nothing should parse `toString` output.",
            "**Reading twice returns the same proxy** (`same twice: true`): the parsed annotations are cached in the `Class` object, in a field called `annotationData` (`javap -p java.lang.Class` shows `private volatile transient java.lang.Class$AnnotationData annotationData`).",
          ],
        },
        {
          type: "heading",
          text: "Array elements are copied on every call",
        },
        {
          type: "code",
          language: "java",
          title: "ArrayElements.java",
          code: `import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.management.ManagementFactory;

public class ArrayElements {
    @Retention(RetentionPolicy.RUNTIME)
    @interface Zones { String[] value(); }

    @Zones({"SALT-LAKE", "NEW-TOWN", "GARIA"}) static class Pricing { }

    static Object sink;

    public static void main(String[] args) {
        Zones z = Pricing.class.getAnnotation(Zones.class);
        String[] first = z.value();
        first[0] = "HACKED";                                         // try to change the annotation
        System.out.println("same array each call? " + (z.value() == z.value()));
        System.out.println("after the write:      " + String.join(",", z.value()));

        var mx = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        for (int i = 0; i < 100_000; i++) sink = z.value();        // warm up
        long before = mx.getCurrentThreadAllocatedBytes();
        for (int i = 0; i < 1_000_000; i++) sink = z.value();
        System.out.printf("1,000,000 calls to value(): %,d bytes allocated%n", mx.getCurrentThreadAllocatedBytes() - before);
    }
}`,
        },
        {
          type: "output",
          text: `same array each call? false
after the write:      SALT-LAKE,NEW-TOWN,GARIA
1,000,000 calls to value(): 32,000,024 bytes allocated`,
        },
        {
          type: "paragraph",
          text: "Annotations are immutable, but arrays aren't, so `AnnotationInvocationHandler` clones an array element before returning it. My write to `first[0]` changed only my copy. The price is a new array per call: 32 bytes (a 16-byte header plus three 4-byte references, padded) on every `value()`, 32 MB for a million calls. Code that reads an array element in a loop should read it once.",
        },
        {
          type: "heading",
          text: "The first read loads 212 classes",
        },
        {
          type: "code",
          language: "java",
          title: "FirstRead.java",
          code: `import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

public class FirstRead {
    @Retention(RetentionPolicy.RUNTIME) @interface FareRule { String zone(); }

    @FareRule(zone = "SALT-LAKE") static class SaltLake { }

    public static void main(String[] args) {
        Class<?> c = SaltLake.class;
        System.out.println("---- before getAnnotation");
        Object a = c.getAnnotation(FareRule.class);
        System.out.println("---- after getAnnotation: " + a);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac FirstRead.java
java -Xlog:class+load FirstRead | sed -n '/---- before/,/---- after/p' | grep -c 'class,load'
java -Xlog:class+load FirstRead | sed -n '/---- before/,/---- after/p' \\
    | grep -E 'AnnotationParser |AnnotationInvocationHandler |ProxyGenerator |asm.ClassWriter |\\$Proxy[0-9]' | cut -d' ' -f2-`,
        },
        {
          type: "output",
          text: `212
sun.reflect.annotation.AnnotationParser source: shared objects file
jdk.internal.org.objectweb.asm.ClassWriter source: shared objects file
sun.reflect.annotation.AnnotationInvocationHandler source: jrt:/java.base
java.lang.reflect.ProxyGenerator source: jrt:/java.base
jdk.proxy1.$Proxy0 source: __dynamic_proxy__
$Proxy1 source: __dynamic_proxy__`,
        },
        {
          type: "list",
          items: [
            "Between the two `println` markers, one `getAnnotation` call loaded **212 classes**: the annotation parser, the generic-signature parser, method-handle infrastructure, and the JDK's internal copy of ASM, which `ProxyGenerator` uses to write the proxy class's bytecode in memory.",
            "**Two proxy classes were generated, not one.** `jdk.proxy1.$Proxy0` implements `java.lang.annotation.Retention`: to know whether `FareRule` is `RUNTIME`, the JDK first reads `FareRule`'s own `@Retention` annotation, which is itself a proxy. Only then is `$Proxy1` generated for `FareRule`.",
            "Nothing happens if nobody asks. The annotation bytes sit unparsed in the class until the first reflective read; a run of the Performance program that used an annotated class without reading its annotations loaded neither `AnnotationParser` nor any proxy class. Annotations cost nothing at run time until something reads them.",
          ],
        },
        {
          type: "heading",
          text: "A missing annotation class is silently ignored",
        },
        {
          type: "code",
          language: "java",
          title: "CountAnnotations.java",
          code: `public class CountAnnotations {
    public static void main(String[] args) {
        System.out.println(java.util.Arrays.toString(Trip.class.getAnnotations()));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac CountAnnotations.java && java CountAnnotations
rm RuntimeNote.class && java CountAnnotations`,
        },
        {
          type: "output",
          text: `[@RuntimeNote("visible to reflection")]
[]`,
        },
        {
          type: "paragraph",
          text: "With `RuntimeNote.class` deleted, `Trip` still loads and runs, and its annotation simply disappears: no exception, no warning. The JLS allows this on purpose, so a class compiled with, say, JPA annotations can run where JPA isn't present. It also means that an annotation library marked `provided` or `compileOnly` in a build, and therefore missing at run time, turns every check based on it into a silent no-op.",
        },
        {
          type: "heading",
          text: "The JVM reads a few annotations itself",
        },
        {
          type: "code",
          language: "java",
          title: "Contended.java",
          code: `import java.lang.reflect.Field;
import sun.misc.Unsafe;

public class Contended {
    static class Counters {
        volatile long requests;
        @jdk.internal.vm.annotation.Contended
        volatile long cancellations;                  // the JVM reads this annotation
    }

    public static void main(String[] args) throws Exception {
        Field f = Unsafe.class.getDeclaredField("theUnsafe");
        f.setAccessible(true);
        Unsafe u = (Unsafe) f.get(null);
        System.out.println("requests at offset      " + u.objectFieldOffset(Counters.class.getDeclaredField("requests")));
        System.out.println("cancellations at offset " + u.objectFieldOffset(Counters.class.getDeclaredField("cancellations")));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac --add-exports java.base/jdk.internal.vm.annotation=ALL-UNNAMED Contended.java 2>/dev/null   # Unsafe warnings
java Contended
java -XX:-RestrictContended Contended`,
        },
        {
          type: "output",
          text: `requests at offset      16
cancellations at offset 24

requests at offset      16
cancellations at offset 152`,
        },
        {
          type: "paragraph",
          text: "Almost all annotations are ignored by the JVM. A handful of JDK-internal ones aren't: HotSpot's class-file parser looks for `@Contended`, `@ForceInline`, `@Stable`, `@IntrinsicCandidate` and a few others in `RuntimeVisibleAnnotations`. `@Contended` asks for padding around a field so that two hot fields don't share a CPU cache line (false sharing). For application classes the JVM ignores it unless `-XX:-RestrictContended` is set: then `cancellations` moved from offset 24 to 152, 128 bytes of padding later. The JDK uses it inside `LongAdder` and `ConcurrentHashMap`'s counters.",
        },
      ],
    },
    {
      title: "Built-in Annotations",
      blocks: [
        {
          type: "heading",
          text: "@Override: let the compiler check the signature",
        },
        {
          type: "code",
          language: "java",
          title: "Fare.java",
          code: `public class Fare {
    private final long paise;

    Fare(long paise) { this.paise = paise; }

    @Override
    public boolean equals(Fare other) {              // overloads equals(Object), doesn't override it
        return other != null && paise == other.paise;
    }

    @Override
    public String toSting() {                        // typo
        return paise + " paise";
    }
}`,
        },
        {
          type: "output",
          text: `Fare.java:6: error: method does not override or implement a method from a supertype
    @Override
    ^
Fare.java:11: error: method does not override or implement a method from a supertype
    @Override
    ^
2 errors`,
        },
        {
          type: "paragraph",
          text: "Both methods look like overrides and neither is. `equals(Fare)` overloads `equals(Object)`, and `toSting` is a typo. Without `@Override` both compile, and the bug shows up at run time:",
        },
        {
          type: "code",
          language: "java",
          title: "FareNoOverride.java",
          code: `import java.util.HashSet;
import java.util.Set;

public class FareNoOverride {
    static class Fare {
        private final long paise;
        Fare(long paise) { this.paise = paise; }

        public boolean equals(Fare other) { return other != null && paise == other.paise; }
        public int hashCode() { return Long.hashCode(paise); }
    }

    public static void main(String[] args) {
        Fare a = new Fare(14_500), b = new Fare(14_500);
        Object asObject = b;
        System.out.println("a.equals(b):        " + a.equals(b));
        System.out.println("a.equals(asObject): " + a.equals(asObject));
        Set<Fare> seen = new HashSet<>();
        seen.add(a);
        System.out.println("set contains b:     " + seen.contains(b));
    }
}`,
        },
        {
          type: "output",
          text: `a.equals(b):        true
a.equals(asObject): false
set contains b:     false`,
        },
        {
          type: "paragraph",
          text: "`a.equals(b)` picks the overload at compile time and works. As soon as the same object is seen as an `Object`, which is how `HashSet`, `HashMap` and `List.contains` see it, `Object.equals` runs and compares identity. `@Override` is `SOURCE`-retention and costs nothing; I put it on every method meant to override, including interface implementations (allowed since Java 6).",
        },
        {
          type: "heading",
          text: "@Deprecated: since, forRemoval and the warnings",
        },
        {
          type: "code",
          language: "java",
          title: "FareApi.java",
          code: `public class FareApi {
    /** @deprecated use {@link #quotePaise(String, int)}; rupees as double lose paise. */
    @Deprecated(since = "2.1")
    public static double quoteRupees(String zone, int km) {
        return quotePaise(zone, km) / 100.0;
    }

    /** @deprecated surge is now applied by the pricing service; will be deleted in 3.0. */
    @Deprecated(since = "2.3", forRemoval = true)
    public static long quoteWithSurge(String zone, int km, int surgePercent) {
        return quotePaise(zone, km) * (100 + surgePercent) / 100;
    }

    public static long quotePaise(String zone, int km) {
        return 5_000 + km * 1_400L;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "Checkout.java",
          code: `public class Checkout {
    public static void main(String[] args) {
        System.out.println(FareApi.quoteRupees("SALT-LAKE", 8));
        System.out.println(FareApi.quoteWithSurge("SALT-LAKE", 8, 20));
        System.out.println(FareApi.quotePaise("SALT-LAKE", 8));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac FareApi.java Checkout.java
javac -Xlint:deprecation FareApi.java Checkout.java
javac -Xlint:-removal Checkout.java`,
        },
        {
          type: "output",
          text: `Checkout.java:4: warning: [removal] quoteWithSurge(String,int,int) in FareApi has been deprecated and marked for removal
        System.out.println(FareApi.quoteWithSurge("SALT-LAKE", 8, 20));
                                  ^
Note: Checkout.java uses or overrides a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
1 warning

Checkout.java:3: warning: [deprecation] quoteRupees(String,int) in FareApi has been deprecated
        System.out.println(FareApi.quoteRupees("SALT-LAKE", 8));
                                  ^
Checkout.java:4: warning: [removal] quoteWithSurge(String,int,int) in FareApi has been deprecated and marked for removal
        System.out.println(FareApi.quoteWithSurge("SALT-LAKE", 8, 20));
                                  ^
2 warnings

Note: Checkout.java uses or overrides a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: Checkout.java uses or overrides a deprecated API that is marked for removal.
Note: Recompile with -Xlint:removal for details.`,
        },
        {
          type: "list",
          items: [
            "**Ordinary deprecation is a summary note by default.** Without `-Xlint:deprecation`, javac only says \"uses or overrides a deprecated API\" and doesn't name the call. With it, every use gets a `[deprecation]` warning with the line.",
            "**`forRemoval = true` is loud by default**: a `[removal]` warning at the call site even with no flags. It means \"this will be deleted\", so ignoring it is a future compile error. `-Xlint:-removal` turns it back into a summary note.",
            "**Uses inside the same outermost class don't warn**: `quoteWithSurge` calls `quotePaise` freely, and a deprecated method calling another deprecated method in its own class is fine. Only `Checkout` was warned.",
            "**`since` is documentation**: no compiler behaviour depends on it, but Javadoc shows it and readers need it to decide how long a migration has been available.",
            "**`@Deprecated` is `RUNTIME`.** `FareApi.class.getDeclaredMethod(\"quoteWithSurge\", ...).getAnnotation(Deprecated.class)` returned `@java.lang.Deprecated(forRemoval=true, since=\"2.3\")`, and `javap -v` shows both the annotation and an older `Deprecated: true` class-file attribute, kept from the days of the Javadoc tag. Tools like `jdeprscan` read them from compiled jars.",
          ],
        },
        {
          type: "paragraph",
          text: "The annotation and the Javadoc `@deprecated` tag do different jobs. The annotation makes the compiler warn; the tag explains **what to use instead**. I always write both, and I always say why, as `FareApi` does: \"rupees as double lose paise\" is the reason a reader needs to stop using it.",
        },
        {
          type: "heading",
          text: "@SuppressWarnings: as narrow as possible",
        },
        {
          type: "code",
          language: "java",
          title: "LegacyBridge.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class LegacyBridge {
    // Stands in for a pre-generics library we can't change
    @SuppressWarnings({"rawtypes", "unchecked"})
    static List legacyZones() {
        List zones = new ArrayList();
        zones.add("SALT-LAKE");
        zones.add("NEW-TOWN");
        return zones;
    }

    static List<String> zones() {
        @SuppressWarnings("unchecked")                 // narrowest scope: one local variable
        List<String> zones = legacyZones();
        return zones;
    }

    @SuppressWarnings({"deprecation", "removal"})    // one method
    static long oldQuote() {
        return (long) (FareApi.quoteRupees("NEW-TOWN", 5) * 100) + FareApi.quoteWithSurge("NEW-TOWN", 5, 10);
    }

    @SuppressWarnings("uncheked")                     // typo: silently ignored
    static List<String> typo() {
        return legacyZones();
    }

    public static void main(String[] args) {
        System.out.println(zones() + " " + oldQuote() + " " + typo());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "javac -Xlint:all LegacyBridge.java && java LegacyBridge",
        },
        {
          type: "output",
          text: `LegacyBridge.java:27: warning: [unchecked] unchecked conversion
        return legacyZones();
                          ^
  required: List<String>
  found:    List
1 warning
[SALT-LAKE, NEW-TOWN] 25200 [SALT-LAKE, NEW-TOWN]`,
        },
        {
          type: "list",
          items: [
            "**Scope is the annotated declaration**: a class, a method, a constructor, a field, a parameter or a **local variable declaration**. `zones()` suppresses `unchecked` for one variable only; anything else that goes wrong in that method still warns.",
            "**The values are javac lint category names**: `unchecked`, `rawtypes`, `deprecation`, `removal`, `serial`, `cast`, `fallthrough`, `static`, `try`, `varargs`, `this-escape` (new in 21) and more (`javac --help-lint` lists them). IDEs and tools add their own; javac ignores names it doesn't know.",
            "**A typo suppresses nothing, silently.** `\"uncheked\"` didn't silence the warning on line 27, and javac said nothing about the unknown name. The only warning in the whole file is the one the typo was meant to hide.",
            "**`deprecation` and `removal` are separate**: suppressing `deprecation` doesn't silence a `[removal]` warning. `oldQuote` needed both.",
          ],
        },
        {
          type: "heading",
          text: "@FunctionalInterface and @SafeVarargs",
        },
        {
          type: "code",
          language: "java",
          title: "FareRules.java",
          code: `import java.util.List;

public class FareRules {
    @FunctionalInterface
    interface FareAdjuster {
        long adjust(long paise);
        default FareAdjuster then(FareAdjuster next) { return p -> next.adjust(adjust(p)); }  // fine: default
        String toString();                                                                // fine: Object's method
    }

    @FunctionalInterface
    interface Pricing {                       // a second abstract method sneaks in
        long base(String zone);
        long perKm(String zone);
    }

    @SafeVarargs
    final void logAll(List<String>... batches) { }      // fine: final instance method

    @SafeVarargs
    void logSome(List<String>... batches) { }           // overridable: not allowed
}`,
        },
        {
          type: "output",
          text: `FareRules.java:11: error: Unexpected @FunctionalInterface annotation
    @FunctionalInterface
    ^
  Pricing is not a functional interface
    multiple non-overriding abstract methods found in interface Pricing
FareRules.java:21: error: Invalid SafeVarargs annotation. Instance method logSome(List<String>...) is neither final nor private.
    void logSome(List<String>... batches) { }           // overridable: not allowed
         ^
2 errors`,
        },
        {
          type: "list",
          items: [
            "**`@FunctionalInterface` doesn't make an interface functional**: any interface with exactly one abstract method can be the target of a lambda, annotated or not. The annotation makes it an **error** to break that later. `FareAdjuster` is fine: default methods don't count, and `String toString()` doesn't count because every object already implements it. `Pricing` has two abstract methods and fails.",
            "**`@SafeVarargs` is a promise from the method's author** that it doesn't store anything in the generic varargs array or let it escape. Because a subclass could break that promise in an override, javac only accepts it on methods that can't be overridden: `static`, `final`, `private` methods and constructors. `logSome` is an overridable instance method, so it's rejected.",
          ],
        },
        {
          type: "paragraph",
          text: "The warning it silences comes from the Generics phase: a varargs parameter of a generic type is really an array, and Generics: Wildcards and Erasure showed that arrays of generic types can't be created safely.",
        },
        {
          type: "code",
          language: "java",
          title: "Zones.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Zones {
    static <T> List<T> concat(List<? extends T>... parts) {          // no @SafeVarargs
        List<T> all = new ArrayList<>();
        for (List<? extends T> p : parts) all.addAll(p);
        return all;
    }

    @SafeVarargs                                                     // I promise: only reads the array
    static <T> List<T> concatSafe(List<? extends T>... parts) {
        List<T> all = new ArrayList<>();
        for (List<? extends T> p : parts) all.addAll(p);
        return all;
    }

    public static void main(String[] args) {
        List<String> north = List.of("SALT-LAKE", "NEW-TOWN");
        List<String> south = List.of("GARIA");
        System.out.println(concat(north, south));
        System.out.println(concatSafe(north, south));
    }
}`,
        },
        {
          type: "output",
          text: `Zones.java:5: warning: [unchecked] Possible heap pollution from parameterized vararg type List<? extends T>
    static <T> List<T> concat(List<? extends T>... parts) {          // no @SafeVarargs
                                                   ^
  where T is a type-variable:
    T extends Object declared in method <T>concat(List<? extends T>...)
Zones.java:21: warning: [unchecked] unchecked generic array creation for varargs parameter of type List<? extends String>[]
        System.out.println(concat(north, south));
                                 ^
2 warnings
[SALT-LAKE, NEW-TOWN, GARIA]
[SALT-LAKE, NEW-TOWN, GARIA]`,
        },
        {
          type: "paragraph",
          text: "Without the annotation, javac warns twice: once at the declaration (\"Possible heap pollution\") and once at **every call site** (\"unchecked generic array creation\"). That second warning lands on code written by callers who can't do anything about it. `concatSafe` only reads the array, so the promise is true, and both warnings disappear. `List.of(E...)` and `Arrays.asList(T...)` carry `@SafeVarargs` for the same reason.",
        },
      ],
    },
    {
      title: "Declaring Custom Annotations",
      blocks: [
        {
          type: "heading",
          text: "Elements, defaults and the value shorthand",
        },
        {
          type: "code",
          language: "java",
          title: "Endpoint.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Endpoint {
    enum Role { RIDER, DRIVER, SUPPORT }

    @Retention(RetentionPolicy.RUNTIME)
    @interface RateLimit { int perMinute(); }

    String value();                                   // String; "value" allows the shorthand
    int timeoutMs() default 2_000;                    // primitive
    double sampleRate() default 1.0;                  // primitive
    Class<?> response() default Void.class;           // Class
    Role[] roles() default { Role.RIDER };            // array of enum
    RateLimit limit() default @RateLimit(perMinute = 60);   // nested annotation
    String[] zones() default {};                      // array of String
}`,
        },
        {
          type: "code",
          language: "java",
          title: "TripApi.java",
          code: `public class TripApi {
    static final int SLOW = 5_000;

    @Endpoint("/trips")                                           // only value: shorthand
    public void list() { }

    @Endpoint(value = "/trips/{id}/cancel", timeoutMs = SLOW,      // a compile-time constant is fine
              roles = {Endpoint.Role.RIDER, Endpoint.Role.SUPPORT},
              limit = @Endpoint.RateLimit(perMinute = 5),
              zones = "SALT-LAKE")                                 // one element: braces optional
    public void cancel() { }

    public static void main(String[] args) throws Exception {
        for (String name : new String[] {"list", "cancel"}) {
            System.out.println(TripApi.class.getMethod(name).getAnnotation(Endpoint.class));
        }
    }
}`,
        },
        {
          type: "output",
          text: `@Endpoint(limit=@Endpoint.RateLimit(perMinute=60), zones={}, sampleRate=1.0, timeoutMs=2000, response=java.lang.Void.class, roles={RIDER}, value="/trips")
@Endpoint(limit=@Endpoint.RateLimit(perMinute=5), zones={"SALT-LAKE"}, sampleRate=1.0, timeoutMs=5000, response=java.lang.Void.class, roles={RIDER, SUPPORT}, value="/trips/{id}/cancel")`,
        },
        {
          type: "list",
          items: [
            "**Every allowed kind of element is here**: `String` (`value`), primitives (`int`, `double`), `Class<?>`, an enum array (`Role[]`), a nested annotation (`RateLimit`) and a `String[]`.",
            "**`value` is special.** When it's the only element being set, the name can be left out: `@Endpoint(\"/trips\")` means `@Endpoint(value = \"/trips\")`. The shorthand works for no other name, and only if every other element has a default.",
            "**One-element arrays don't need braces**: `zones = \"SALT-LAKE\"` is `zones = {\"SALT-LAKE\"}`.",
            "**Values must be compile-time constants**: literals, `static final` constants of primitive or `String` type initialised with constants (`timeoutMs = SLOW`), enum constants, class literals, and annotations.",
            "**A nested annotation as a default** (`@RateLimit(perMinute = 60)`) gives a structured value without a second top-level annotation.",
          ],
        },
        {
          type: "heading",
          text: "What javac refuses",
        },
        {
          type: "code",
          language: "java",
          title: "BadElements.java",
          code: `import java.util.List;

public @interface BadElements {
    Integer maxRiders();                 // wrapper: not allowed
    List<String> zones();                // collection: not allowed
    String city() default null;          // null is never a constant
    int[][] grid();                      // only one-dimensional arrays
    void run();                          // must return something
    String name(String locale);          // no parameters
}`,
        },
        {
          type: "output",
          text: `BadElements.java:6: error: element value must be a constant expression
    String city() default null;          // null is never a constant
                          ^
BadElements.java:4: error: invalid type for annotation interface element
    Integer maxRiders();                 // wrapper: not allowed
    ^
BadElements.java:5: error: invalid type for annotation interface element
    List<String> zones();                // collection: not allowed
        ^
BadElements.java:7: error: invalid type for annotation interface element
    int[][] grid();                      // only one-dimensional arrays
       ^
BadElements.java:8: error: invalid type for annotation interface element
    void run();                          // must return something
    ^
BadElements.java:9: error: elements in annotation interface declarations cannot declare formal parameters
    String name(String locale);          // no parameters
                       ^
6 errors`,
        },
        {
          type: "list",
          items: [
            "**`Integer`, `List<String>` and `int[][]` are invalid element types.** The allowed set is closed so that every value can be written into the class file's constant pool and rebuilt without running any code: no constructors, no collections, no `null`.",
            "**`default null` is \"not a constant expression\"**, and the same message appears for `null` inside an array at a use site. An element that may be absent needs a sentinel default instead: `\"\"`, `-1`, `Void.class`, or an enum constant like `NONE`.",
            "**Elements can't have parameters** (or type parameters, or `throws` clauses). They're values that happen to be written as methods.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "BadUse.java",
          code: `public class BadUse {
    static int timeout = 5_000;                                 // not final: not a constant

    @Endpoint(timeoutMs = 1_000)                               // value() has no default
    void a() { }

    @Endpoint(value = "/b", timeoutMs = timeout)
    void b() { }

    @Endpoint(value = "/c", zones = {"SALT-LAKE", null})
    void c() { }

    @Endpoint("/d")
    int fare;                                                   // @Target(METHOD) only
}`,
        },
        {
          type: "output",
          text: `BadUse.java:7: error: element value must be a constant expression
    @Endpoint(value = "/b", timeoutMs = timeout)
                                        ^
BadUse.java:10: error: element value must be a constant expression
    @Endpoint(value = "/c", zones = {"SALT-LAKE", null})
                                                  ^
BadUse.java:4: error: annotation @Endpoint is missing a default value for the element 'value'
    @Endpoint(timeoutMs = 1_000)                               // value() has no default
    ^
BadUse.java:13: error: annotation interface not applicable to this kind of declaration
    @Endpoint("/d")
    ^
4 errors`,
        },
        {
          type: "paragraph",
          text: "At the use site: a non-`final` field isn't a constant, a required element must be set (\"missing a default value for the element 'value'\"), and an annotation outside its `@Target` is rejected (\"not applicable to this kind of declaration\"). All three are compile errors, which is the main advantage of annotations over XML or string-based configuration: the compiler checks the metadata's shape.",
        },
      ],
    },
    {
      title: "Meta-Annotations",
      blocks: [
        {
          type: "paragraph",
          text: "`@Retention` was covered under Internal Working. The other four control where an annotation can appear, how it's documented, and how it's found.",
        },
        {
          type: "heading",
          text: "@Target, including type annotations",
        },
        {
          type: "code",
          language: "java",
          title: "Targets.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.AnnotatedParameterizedType;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

public class Targets {
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.TYPE_USE)       @interface NonEmpty { }
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.TYPE_PARAMETER) @interface Priced { }
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.PARAMETER)      @interface Trimmed { }

    static class Quote<@Priced T> {
        // TYPE_USE goes on a type wherever a type is written: here the String inside the List
        List<@NonEmpty String> zones(@Trimmed String city) { return List.of(city); }
    }

    public static void main(String[] args) throws Exception {
        System.out.println("type parameter: " + Arrays.toString(Quote.class.getTypeParameters()[0].getAnnotations()));

        Method m = Quote.class.getDeclaredMethod("zones", String.class);
        System.out.println("parameter:      " + Arrays.toString(m.getParameters()[0].getAnnotations()));
        System.out.println("method:         " + Arrays.toString(m.getAnnotations()) + "  (a TYPE_USE annotation isn't a declaration annotation)");

        var ret = (AnnotatedParameterizedType) m.getAnnotatedReturnType();
        var arg = ret.getAnnotatedActualTypeArguments()[0];
        System.out.println("return type:    " + ret.getType() + ", type argument annotations " + Arrays.toString(arg.getAnnotations()));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Targets.java && java Targets
javap -v 'Targets$Quote'`,
        },
        {
          type: "output",
          text: `type parameter: [@Targets.Priced()]
parameter:      [@Targets.Trimmed()]
method:         []  (a TYPE_USE annotation isn't a declaration annotation)
return type:    java.util.List<java.lang.String>, type argument annotations [@Targets.NonEmpty()]

  java.util.List<java.lang.String> zones(java.lang.String);
    ...
    RuntimeVisibleTypeAnnotations:
      0: #22(): METHOD_RETURN, location=[TYPE_ARGUMENT(0)]
        Targets$NonEmpty
    RuntimeVisibleParameterAnnotations:
      parameter 0:
        0: #24()
          Targets$Trimmed
...
RuntimeVisibleTypeAnnotations:
  0: #28(): CLASS_TYPE_PARAMETER, param_index=0
    Targets$Priced`,
        },
        {
          type: "list",
          items: [
            "**Declaration annotations and type annotations live in different attributes.** `@Trimmed` (a `PARAMETER` annotation) is in `RuntimeVisibleParameterAnnotations`; `@NonEmpty` and `@Priced` are in `RuntimeVisibleTypeAnnotations`, each with a **target path**: \"the return type, first type argument\", \"the class's type parameter 0\".",
            "**A `TYPE_USE` annotation isn't an annotation on the method.** `m.getAnnotations()` is empty; it's found through `getAnnotatedReturnType()` and then `getAnnotatedActualTypeArguments()`. Type annotations exist mainly for compile-time checkers like the Checker Framework, NullAway or Error Prone (`@NonNull String`, `List<@Positive Integer>`), which read them in an annotation processor or compiler plugin.",
            "**No `@Target` means \"all declaration contexts\"** (in Java 17 and later): classes, fields, methods, parameters, record components and so on, but not type uses or type parameters. `@Target({})` allows nowhere, which is used for annotations that only appear nested inside others.",
          ],
        },
        {
          type: "heading",
          text: "@Documented",
        },
        {
          type: "code",
          language: "java",
          title: "PublicApi.java",
          code: `import java.lang.annotation.Documented;

/** Marks an API that partner apps may call. */
@Documented
public @interface PublicApi { }`,
        },
        {
          type: "code",
          language: "java",
          title: "InternalOnly.java",
          code: `/** Marks code only our own services may call. */
public @interface InternalOnly { }`,
        },
        {
          type: "code",
          language: "java",
          title: "FareQuotes.java",
          code: `/** Fare quotes for partner apps. */
@PublicApi
@InternalOnly
public class FareQuotes {
    /** Creates the service. */
    public FareQuotes() { }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javadoc -quiet -d out *.java
grep -A2 'class="type-signature"' out/FareQuotes.html | sed 's/<[^>]*>//g'
grep -c InternalOnly out/FareQuotes.html`,
        },
        {
          type: "output",
          text: `@PublicApi
public class FareQuotes
extends Object
0`,
        },
        {
          type: "paragraph",
          text: "The generated page for `FareQuotes` shows `@PublicApi` in the class signature and never mentions `@InternalOnly`. `@Documented` says the annotation is part of the annotated element's public contract, so readers of the docs should see it. `@Deprecated`, `@FunctionalInterface` and all the meta-annotations are `@Documented`; `@SuppressWarnings` and `@Override` aren't, because they're notes to the compiler, not API.",
        },
        {
          type: "heading",
          text: "@Inherited: classes only, through extends only",
        },
        {
          type: "code",
          language: "java",
          title: "InheritedDemo.java",
          code: `import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.util.Arrays;

public class InheritedDemo {
    @Inherited @Retention(RetentionPolicy.RUNTIME) @interface Audited { String team(); }
    @Retention(RetentionPolicy.RUNTIME) @interface Owner { String value(); }      // not @Inherited

    @Audited(team = "payments") @Owner("asha")
    static class BaseFareService {
        @Audited(team = "payments") public long quote() { return 0; }
    }

    static class SurgeFareService extends BaseFareService {                       // extends a class
        @Override public long quote() { return 1; }
    }

    @Audited(team = "dispatch")
    interface Dispatcher { }

    static class KolkataDispatcher implements Dispatcher { }                       // implements an interface

    @Audited(team = "pricing")
    static class NightSurgeService extends SurgeFareService { }                    // its own annotation wins

    public static void main(String[] args) throws Exception {
        System.out.println("SurgeFareService getAnnotations:         " + Arrays.toString(SurgeFareService.class.getAnnotations()));
        System.out.println("SurgeFareService getDeclaredAnnotations: " + Arrays.toString(SurgeFareService.class.getDeclaredAnnotations()));
        System.out.println("KolkataDispatcher @Audited:              " + KolkataDispatcher.class.getAnnotation(Audited.class));
        System.out.println("SurgeFareService.quote() @Audited:       " + SurgeFareService.class.getMethod("quote").getAnnotation(Audited.class));
        System.out.println("NightSurgeService getAnnotations:        " + Arrays.toString(NightSurgeService.class.getAnnotations()));
    }
}`,
        },
        {
          type: "output",
          text: `SurgeFareService getAnnotations:         [@InheritedDemo.Audited(team="payments")]
SurgeFareService getDeclaredAnnotations: []
KolkataDispatcher @Audited:              null
SurgeFareService.quote() @Audited:       null
NightSurgeService getAnnotations:        [@InheritedDemo.Audited(team="pricing")]`,
        },
        {
          type: "list",
          items: [
            "**`@Inherited` works for class annotations through the superclass chain**: `SurgeFareService` has no annotations of its own (`getDeclaredAnnotations()` is empty), but `getAnnotations()` finds `@Audited` on `BaseFareService`. `@Owner` isn't `@Inherited`, so it isn't found.",
            "**Not through interfaces.** `KolkataDispatcher implements Dispatcher`, and `Dispatcher` is `@Audited`, but `getAnnotation` returns `null`. A class can implement many interfaces, so inheriting from them could be ambiguous; the JLS simply doesn't.",
            "**Not on methods.** `quote()` in the superclass is `@Audited`; the overriding `quote()` isn't, and `@Inherited` doesn't change that. `@Inherited` is ignored on anything that isn't a class annotation.",
            "**The subclass's own annotation wins**: `NightSurgeService` declares `@Audited(team = \"pricing\")`, which hides the inherited one.",
            "javac doesn't warn about any of this: putting an `@Inherited` annotation on an interface or a method compiles and silently does nothing. Frameworks that need more (Spring's `AnnotationUtils.findAnnotation`, JUnit's `AnnotationSupport`) walk interfaces and overridden methods themselves, as the next lesson shows.",
          ],
        },
        {
          type: "heading",
          text: "@Repeatable and its container",
        },
        {
          type: "code",
          language: "java",
          title: "SurgeWindow.java",
          code: `import java.lang.annotation.Repeatable;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.RUNTIME)
@Repeatable(SurgeWindows.class)                  // the container type
public @interface SurgeWindow {
    String from();
    String to();
    int percent();
}`,
        },
        {
          type: "code",
          language: "java",
          title: "SurgeWindows.java",
          code: `import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.RUNTIME)
public @interface SurgeWindows {
    SurgeWindow[] value();                       // must be an array of the repeatable type, named value
}`,
        },
        {
          type: "code",
          language: "java",
          title: "NightPricing.java",
          code: `import java.util.Arrays;

public class NightPricing {
    @SurgeWindow(from = "08:00", to = "10:00", percent = 20)
    @SurgeWindow(from = "18:00", to = "21:00", percent = 30)
    static class SaltLake { }

    @SurgeWindow(from = "23:00", to = "05:00", percent = 25)
    static class NewTown { }

    public static void main(String[] args) {
        System.out.println("SaltLake getAnnotation(SurgeWindow):  " + SaltLake.class.getAnnotation(SurgeWindow.class));
        System.out.println("SaltLake getAnnotation(SurgeWindows): " + SaltLake.class.getAnnotation(SurgeWindows.class));
        System.out.println("SaltLake getAnnotationsByType:        " + Arrays.toString(SaltLake.class.getAnnotationsByType(SurgeWindow.class)));
        System.out.println("NewTown  getAnnotation(SurgeWindow):  " + NewTown.class.getAnnotation(SurgeWindow.class));
        System.out.println("NewTown  getAnnotationsByType:        " + Arrays.toString(NewTown.class.getAnnotationsByType(SurgeWindow.class)));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac *.java && java NightPricing
javap -v 'NightPricing$SaltLake'
javap -v 'NightPricing$NewTown'`,
        },
        {
          type: "output",
          text: `SaltLake getAnnotation(SurgeWindow):  null
SaltLake getAnnotation(SurgeWindows): @SurgeWindows({@SurgeWindow(from="08:00", to="10:00", percent=20), @SurgeWindow(from="18:00", to="21:00", percent=30)})
SaltLake getAnnotationsByType:        [@SurgeWindow(from="08:00", to="10:00", percent=20), @SurgeWindow(from="18:00", to="21:00", percent=30)]
NewTown  getAnnotation(SurgeWindow):  @SurgeWindow(from="23:00", to="05:00", percent=25)
NewTown  getAnnotationsByType:        [@SurgeWindow(from="23:00", to="05:00", percent=25)]

RuntimeVisibleAnnotations:
  0: #14(#15=[@#16(#17=s#18,#19=s#20,#21=I#22),@#16(#17=s#23,#19=s#24,#21=I#25)])
    SurgeWindows(
      value=[@SurgeWindow(
        from="08:00"
        to="10:00"
        percent=20
      ),@SurgeWindow(
        from="18:00"
        to="21:00"
        percent=30
      )]
    )

RuntimeVisibleAnnotations:
  0: #14(#15=s#16,#17=s#18,#19=I#20)
    SurgeWindow(
      from="23:00"
      to="05:00"
      percent=25
    )`,
        },
        {
          type: "list",
          items: [
            "**Repeating is a compiler rewrite.** The class file can't hold two annotations of the same type on one element, so javac wraps the two `@SurgeWindow`s in one `@SurgeWindows({...})`. `javap` shows only the container on `SaltLake`.",
            "**So `getAnnotation(SurgeWindow.class)` returns `null` on `SaltLake`**, even though the source clearly has the annotation. It works on `NewTown`, which has only one and isn't wrapped. Code that reads repeatable annotations must use `getAnnotationsByType`, which looks through the container and returns both, in source order.",
            "**The container has rules**, checked by javac: its `value()` must be an array of the repeatable type, its retention must be at least as long, and its targets must be a subset. Repeating an annotation that isn't `@Repeatable` is an error too:",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "RepeatErrors.java",
          code: `import java.lang.annotation.Repeatable;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

public class RepeatErrors {
    @Retention(RetentionPolicy.RUNTIME)
    @interface Zone { String value(); }                       // not @Repeatable

    @Retention(RetentionPolicy.RUNTIME)
    @Repeatable(Tags.class)
    @interface Tag { String value(); }

    @interface Tags { Tag[] value(); }                        // CLASS retention: shorter than Tag's RUNTIME

    @Zone("SALT-LAKE") @Zone("NEW-TOWN")
    static class Pricing { }
}`,
        },
        {
          type: "output",
          text: `RepeatErrors.java:15: error: Zone is not a repeatable annotation interface
    @Zone("SALT-LAKE") @Zone("NEW-TOWN")
                       ^
RepeatErrors.java:10: error: retention of containing annotation interface (Tags) is shorter than the retention of repeatable annotation interface (Tag)
    @Repeatable(Tags.class)
    ^
2 errors`,
        },
      ],
    },
    {
      title: "Annotations on Records",
      blocks: [
        {
          type: "paragraph",
          text: "A record component like `String phone` is shorthand for a private final field, a public accessor, a parameter of the canonical constructor and the component itself. An annotation written on the component is copied to every one of those places **where its `@Target` allows it**:",
        },
        {
          type: "code",
          language: "java",
          title: "RecordPropagation.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.RecordComponent;

public class RecordPropagation {
    @Retention(RetentionPolicy.RUNTIME) @interface Anywhere { }                         // no @Target
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.FIELD) @interface FieldOnly { }
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) @interface MethodOnly { }
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.RECORD_COMPONENT) @interface ComponentOnly { }

    record Rider(@Anywhere @FieldOnly @MethodOnly @ComponentOnly String phone) { }

    static String names(java.lang.reflect.AnnotatedElement e) {
        StringBuilder sb = new StringBuilder();
        for (var a : e.getAnnotations()) sb.append(a.annotationType().getSimpleName()).append(' ');
        return sb.toString().strip();
    }

    public static void main(String[] args) throws Exception {
        RecordComponent rc = Rider.class.getRecordComponents()[0];
        System.out.println("record component : " + names(rc));
        System.out.println("private field    : " + names(Rider.class.getDeclaredField("phone")));
        System.out.println("accessor phone() : " + names(Rider.class.getMethod("phone")));
        System.out.println("constructor param: " + names(Rider.class.getDeclaredConstructor(String.class).getParameters()[0]));
    }
}`,
        },
        {
          type: "output",
          text: `record component : Anywhere ComponentOnly
private field    : Anywhere FieldOnly
accessor phone() : Anywhere MethodOnly
constructor param: Anywhere`,
        },
        {
          type: "list",
          items: [
            "**`@Anywhere`** (no `@Target`, so every declaration context) ended up in all four places.",
            "**`@FieldOnly`** is only on the field, **`@MethodOnly`** only on the accessor, **`@ComponentOnly`** only on the component. Each copy is filtered by the target.",
            "**This decides which framework sees what.** Jackson reads accessors and constructor parameters, Hibernate Validator reads fields and getters, and code that iterates `getRecordComponents()` reads components. An annotation whose `@Target` doesn't include the place the framework reads is silently absent there. The next lesson's production bug is exactly this.",
          ],
        },
        {
          type: "paragraph",
          text: "A second trap: annotations are copied only to the members the compiler **generates**. With an explicit accessor, the annotation doesn't reach it:",
        },
        {
          type: "code",
          language: "java",
          title: "ExplicitAccessor.java",
          code: `import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.util.Arrays;

public class ExplicitAccessor {
    @Retention(RetentionPolicy.RUNTIME) @interface Masked { }

    record Rider(@Masked String phone) {
        public String phone() { return phone.strip(); }       // explicit accessor
    }

    public static void main(String[] args) throws Exception {
        System.out.println("field:    " + Arrays.toString(Rider.class.getDeclaredField("phone").getAnnotations()));
        System.out.println("accessor: " + Arrays.toString(Rider.class.getMethod("phone").getAnnotations()));
        System.out.println("component:" + Arrays.toString(Rider.class.getRecordComponents()[0].getAnnotations()));
    }
}`,
        },
        {
          type: "output",
          text: `field:    [@ExplicitAccessor.Masked()]
accessor: []
component:[@ExplicitAccessor.Masked()]`,
        },
        {
          type: "paragraph",
          text: "Adding `phone()` to strip whitespace quietly removed `@Masked` from the accessor. A serializer that reads accessors would now log the full number. If a record needs an explicit accessor, the annotation has to be repeated on it.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `@FareRule(zone = \"SALT-LAKE\", surgePercent = 20)` on `SaltLakePricing` from `Proxies.java`, from source to `a.zone()`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Parse and attribute.** javac resolves `FareRule` to an annotation type, checks the use against its `@Target` (no target, so any declaration), checks that `zone` is supplied and that every value is a constant of the right type. Errors here are the compile errors shown earlier.",
            "**Run annotation processors** (if any are configured; next lesson). They see all three retentions, including `SOURCE`.",
            "**Write the class file.** `FareRule` is `@Retention(RUNTIME)`, so javac adds a `RuntimeVisibleAnnotations` attribute to `Proxies$SaltLakePricing` containing the type descriptor `LFareRule;` and only the elements written in the source, `zone` and `surgePercent`. The default for `tags` stays in `FareRule.class`'s `AnnotationDefault`.",
            "**Load the class.** When `SaltLakePricing` is loaded, HotSpot's class-file parser keeps the `RuntimeVisibleAnnotations` bytes as an unparsed byte array attached to the class (and drops `RuntimeInvisibleAnnotations` unless `-XX:+PreserveAllAnnotations` is set). No annotation objects exist yet.",
            "**First `getAnnotation(FareRule.class)`.** `Class.annotationData()` finds the cache empty and calls `AnnotationParser.parseAnnotations` with the raw bytes (`getRawAnnotations()`, a native method) and the class's constant pool.",
            "**Check the annotation type.** For `LFareRule;` the parser loads `FareRule` and builds an `AnnotationType` for it: element names and return types, defaults from `AnnotationDefault`, and its retention and `@Inherited` status, which means reading `FareRule`'s own annotations (the first proxy, for `@Retention`). If the type isn't `RUNTIME`, or can't be loaded at all, the annotation is skipped silently.",
            "**Build the values.** A `LinkedHashMap` starts as a copy of the defaults (`surgePercent=0`, `tags={}`), then each element in the class file is decoded and put in (`surgePercent=20`, `zone=\"SALT-LAKE\"`). A `Class` element whose class is missing is stored as an exception proxy, thrown later when the element is called.",
            "**Create the proxy.** `AnnotationParser` wraps the map in an `AnnotationInvocationHandler` and calls `Proxy.newProxyInstance` for the `FareRule` interface. The first time, `ProxyGenerator` writes a `$Proxy` class with ASM and defines it; later annotations of the same type reuse that class.",
            "**Cache.** Declared annotations, plus inherited ones from the superclass when their type is `@Inherited`, go into a new `AnnotationData` stored in the volatile `annotationData` field (with a compare-and-set, so racing threads agree on one). Later calls return the same proxy in nanoseconds.",
            "**Call `a.zone()`.** The proxy calls `handler.invoke(proxy, zoneMethod, null)`. The handler handles `equals`, `hashCode`, `toString` and `annotationType` itself; for elements it looks the name up in the map and returns the value, cloning it first if it's an array.",
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
          code: `import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Repeatable;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.Arrays;
import java.util.List;

public class SyntaxTour {
    // 1. a marker annotation: no elements
    @Retention(RetentionPolicy.RUNTIME) @interface Internal { }

    // 2. a single-element annotation named value: allows @Owner("asha")
    @Documented @Inherited
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.TYPE)
    @interface Owner { String value(); }

    // 3. several elements with defaults
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD)
    @interface Endpoint { String path(); String method() default "GET"; int timeoutMs() default 2_000; }

    // 4. repeatable, with its container
    @Retention(RetentionPolicy.RUNTIME) @Repeatable(Zones.class) @interface Zone { String value(); }
    @Retention(RetentionPolicy.RUNTIME) @interface Zones { Zone[] value(); }

    // 5. a type-use annotation
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.TYPE_USE) @interface Paise { }

    @Owner("asha") @Internal @Zone("SALT-LAKE") @Zone("NEW-TOWN")
    static class TripController {
        @Endpoint(path = "/trips/{id}") public String get() { return "trip"; }
        @Endpoint(path = "/trips", method = "POST", timeoutMs = 5_000) public String create() { return "created"; }
        public @Paise long fare() { return 14_500; }
    }

    static class KolkataTripController extends TripController { }

    // 6. built-ins
    @Deprecated(since = "2.0", forRemoval = true)
    static void oldQuote() { }

    @SuppressWarnings("unchecked")
    static List<String> fromRaw(Object o) { return (List<String>) o; }

    @FunctionalInterface interface Adjuster { long adjust(long paise); }

    public static void main(String[] args) throws Exception {
        Class<TripController> c = TripController.class;
        System.out.println(Arrays.toString(c.getAnnotations()));
        System.out.println(c.getAnnotation(Owner.class).value() + " " + c.isAnnotationPresent(Internal.class)
                + " " + c.getAnnotationsByType(Zone.class).length);
        for (String m : new String[] {"get", "create"}) {
            Endpoint e = c.getMethod(m).getAnnotation(Endpoint.class);
            System.out.println(e.method() + " " + e.path() + " " + e.timeoutMs());
        }
        System.out.println(Arrays.toString(c.getMethod("fare").getAnnotatedReturnType().getAnnotations()));
        System.out.println(KolkataTripController.class.getAnnotation(Owner.class) + " "
                + KolkataTripController.class.getAnnotation(Internal.class));
        Adjuster night = p -> p + p / 4;
        System.out.println(night.adjust(20_000) + " " + fromRaw(List.of("SALT-LAKE")));
    }
}`,
        },
        {
          type: "output",
          text: `[@SyntaxTour.Owner("asha"), @SyntaxTour.Internal(), @SyntaxTour.Zones({@SyntaxTour.Zone("SALT-LAKE"), @SyntaxTour.Zone("NEW-TOWN")})]
asha true 2
GET /trips/{id} 2000
POST /trips 5000
[@SyntaxTour.Paise()]
@SyntaxTour.Owner("asha") null
25000 [SALT-LAKE]`,
        },
        {
          type: "paragraph",
          text: "`getAnnotations()` shows the two `@Zone`s as one `@Zones` container, and `getAnnotationsByType(Zone.class)` unwraps it (length 2). `KolkataTripController` finds `@Owner` because it's `@Inherited`, but not `@Internal`, which isn't. The `@Paise` type annotation is only reachable through `getAnnotatedReturnType()`.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: An ownership report from class annotations",
        },
        {
          type: "code",
          language: "java",
          title: "OwnershipReport.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.List;

public class OwnershipReport {
    enum Tier { CRITICAL, STANDARD, BEST_EFFORT }

    @Inherited
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.TYPE)
    @interface Owner {
        String team();
        String oncall() default "#platform-oncall";
        Tier tier() default Tier.STANDARD;
    }

    @Owner(team = "payments", oncall = "#payments-oncall", tier = Tier.CRITICAL)
    static class FareService { }

    static class SurgeFareService extends FareService { }        // inherits @Owner

    @Owner(team = "dispatch")
    static class DriverMatcher { }

    static class ReceiptMailer { }                                // nobody owns it

    public static void main(String[] args) {
        List<Class<?>> services = List.of(FareService.class, SurgeFareService.class, DriverMatcher.class, ReceiptMailer.class);
        for (Class<?> s : services) {
            Owner o = s.getAnnotation(Owner.class);
            if (o == null) {
                System.out.printf("%-17s UNOWNED: page nobody%n", s.getSimpleName());
            } else {
                boolean inherited = s.getDeclaredAnnotation(Owner.class) == null;
                System.out.printf("%-17s %-9s %-9s %s%s%n", s.getSimpleName(), o.team(), o.tier(), o.oncall(),
                        inherited ? " (inherited)" : "");
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `FareService       payments  CRITICAL  #payments-oncall
SurgeFareService  payments  CRITICAL  #payments-oncall (inherited)
DriverMatcher     dispatch  STANDARD  #platform-oncall
ReceiptMailer     UNOWNED: page nobody`,
        },
        {
          type: "paragraph",
          text: "Ownership metadata on the class itself can't drift away from the code the way a wiki page can. Defaults keep the common case short (`@Owner(team = \"dispatch\")`), an enum element keeps the tier to a fixed set, and `@Inherited` lets a subclass inherit its parent's owner, which `getDeclaredAnnotation` can still tell apart. A build step or startup check can fail when something is `UNOWNED`.",
        },
        {
          type: "heading",
          text: "Example 2: A Class element that names a strategy",
        },
        {
          type: "code",
          language: "java",
          title: "PricingPlugins.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

public class PricingPlugins {
    interface Surcharge { long applyPaise(long farePaise); }

    static class NoSurcharge implements Surcharge {
        public long applyPaise(long f) { return f; }
    }
    static class NightSurcharge implements Surcharge {
        public long applyPaise(long f) { return f + f / 4; }          // +25%
    }
    static class AirportSurcharge implements Surcharge {
        public long applyPaise(long f) { return f + 15_000; }         // flat Rs 150
    }

    // A Class element, bounded so only Surcharge implementations compile (like JUnit's @ExtendWith)
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.TYPE)
    @interface Pricing {
        String zone();
        Class<? extends Surcharge> surcharge() default NoSurcharge.class;
    }

    @Pricing(zone = "SALT-LAKE") static class SaltLakeTrips { }
    @Pricing(zone = "NEW-TOWN", surcharge = NightSurcharge.class) static class NewTownNightTrips { }
    @Pricing(zone = "DUM-DUM", surcharge = AirportSurcharge.class) static class AirportTrips { }

    static long price(Class<?> tripType, long basePaise) throws ReflectiveOperationException {
        Pricing p = tripType.getAnnotation(Pricing.class);
        Surcharge s = p.surcharge().getDeclaredConstructor().newInstance();
        return s.applyPaise(basePaise);
    }

    public static void main(String[] args) throws Exception {
        for (Class<?> t : new Class<?>[] {SaltLakeTrips.class, NewTownNightTrips.class, AirportTrips.class}) {
            Pricing p = t.getAnnotation(Pricing.class);
            System.out.printf("%-9s %-16s Rs %.2f%n", p.zone(), p.surcharge().getSimpleName(), price(t, 20_000) / 100.0);
        }
    }
}`,
        },
        {
          type: "output",
          text: `SALT-LAKE NoSurcharge      Rs 200.00
NEW-TOWN  NightSurcharge   Rs 250.00
DUM-DUM   AirportSurcharge Rs 350.00`,
        },
        {
          type: "paragraph",
          text: "A `Class` element is how annotations refer to code, since they can't hold objects: JUnit's `@ExtendWith(MockitoExtension.class)` and Jackson's `@JsonSerialize(using = ...)` work this way. The bound `Class<? extends Surcharge>` is checked by javac:",
        },
        {
          type: "code",
          language: "java",
          title: "BadPlugin.java",
          code: `public class BadPlugin {
    @PricingPlugins.Pricing(zone = "HOWRAH", surcharge = String.class)
    static class HowrahTrips { }
}`,
        },
        {
          type: "output",
          text: `BadPlugin.java:2: error: incompatible types: Class<String> cannot be converted to Class<? extends Surcharge>
    @PricingPlugins.Pricing(zone = "HOWRAH", surcharge = String.class)
                                                               ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Then I deleted `PricingPlugins$NightSurcharge.class` and ran it again. `getAnnotation` still succeeded; the failure came only when the element was called:",
        },
        {
          type: "output",
          text: `SALT-LAKE NoSurcharge      Rs 200.00
Exception in thread "main" java.lang.TypeNotPresentException: Type PricingPlugins$NightSurcharge not present
	at java.base/sun.reflect.annotation.TypeNotPresentExceptionProxy.generateException(TypeNotPresentExceptionProxy.java:47)
	at java.base/sun.reflect.annotation.AnnotationInvocationHandler.invoke(AnnotationInvocationHandler.java:89)
	at $Proxy1.surcharge(Unknown Source)
	at PricingPlugins.main(PricingPlugins.java:40)
Caused by: java.lang.ClassNotFoundException: PricingPlugins$NightSurcharge`,
        },
        {
          type: "paragraph",
          text: "The parser stored a `TypeNotPresentExceptionProxy` in the value map instead of failing the whole read, and the handler threw it when `surcharge()` was called. That's the opposite of a missing annotation **type**, which vanishes silently. Note `$Proxy1` without a module prefix: `Pricing` is package-private, so its proxy was generated in the same (unnamed) package.",
        },
        {
          type: "heading",
          text: "Example 3: Writing an annotation instance by hand",
        },
        {
          type: "code",
          language: "java",
          title: "AnnotationLiterals.java",
          code: `import java.lang.annotation.Annotation;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

public class AnnotationLiterals {
    @Retention(RetentionPolicy.RUNTIME)
    @interface Zone { String value(); }

    @Zone("SALT-LAKE") static class SaltLakeDispatcher { }

    // Tempting: a record. Its equals/hashCode follow the record rules, not Annotation's.
    record ZoneRecord(String value) implements Zone {
        public Class<? extends Annotation> annotationType() { return Zone.class; }
    }

    // Correct: equals, hashCode and toString as java.lang.annotation.Annotation specifies
    static final class ZoneLiteral implements Zone {
        private final String value;
        ZoneLiteral(String value) { this.value = value; }
        public String value() { return value; }
        public Class<? extends Annotation> annotationType() { return Zone.class; }
        @Override public boolean equals(Object o) {
            return o instanceof Zone z && value.equals(z.value());
        }
        @Override public int hashCode() {
            return (127 * "value".hashCode()) ^ value.hashCode();     // sum over elements; only one here
        }
        @Override public String toString() { return "@" + Zone.class.getCanonicalName() + "(\\"" + value + "\\")"; }
    }

    public static void main(String[] args) {
        Zone real = SaltLakeDispatcher.class.getAnnotation(Zone.class);
        Zone rec = new ZoneRecord("SALT-LAKE");
        Zone lit = new ZoneLiteral("SALT-LAKE");

        System.out.println("real.equals(rec): " + real.equals(rec) + ", rec.equals(real): " + rec.equals(real)
                + ", hashCodes " + real.hashCode() + " / " + rec.hashCode());
        System.out.println("real.equals(lit): " + real.equals(lit) + ", lit.equals(real): " + lit.equals(real)
                + ", hashCodes " + real.hashCode() + " / " + lit.hashCode());
        System.out.println(real + " | " + rec + " | " + lit);

        var bindings = new java.util.HashMap<Zone, String>();
        bindings.put(lit, "kolkata-north-pool");
        System.out.println("lookup with the real annotation: " + bindings.get(real));
    }
}`,
        },
        {
          type: "output",
          text: `real.equals(rec): true, rec.equals(real): false, hashCodes -147415127 / -1196771162
real.equals(lit): true, lit.equals(real): true, hashCodes -147415127 / -147415127
@AnnotationLiterals.Zone("SALT-LAKE") | ZoneRecord[value=SALT-LAKE] | @AnnotationLiterals.Zone("SALT-LAKE")
lookup with the real annotation: kolkata-north-pool`,
        },
        {
          type: "list",
          items: [
            "Frameworks sometimes need an annotation instance that no class carries: Guice's `Names.named(\"x\")`, CDI's `AnnotationLiteral`, a test that looks up a qualified bean. Since an annotation type is an interface, a class can implement it, and javac doesn't even warn (`-Xlint:all` was silent).",
            "**A record gets it wrong.** `real.equals(rec)` is `true` because the proxy compares element values through the interface, but `rec.equals(real)` is `false` because a record's `equals` requires another `ZoneRecord`. The `hashCode`s differ too. That breaks `equals` symmetry and makes `HashMap` lookups depend on which side was the key.",
            "**`ZoneLiteral` follows the contract** from `java.lang.annotation.Annotation`: equal to any `Zone` with the same values, `hashCode` by the `127 * name.hashCode() ^ value.hashCode()` formula, so a map keyed by the hand-made instance is found with the real one.",
          ],
        },
      ],
    },
    {
      title: "When to Use Annotations",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Why"],
          rows: [
            ["A fact about a declaration that tools or frameworks act on (route, test, column, constraint)", "A `RUNTIME` annotation read by the framework", "The metadata sits next to the code and is type-checked"],
            ["A check the compiler or a build step should enforce", "`SOURCE` annotation plus a processor or checker (next lesson)", "Fails the build instead of production"],
            ["A hint only bytecode tools need (shrinkers, instrumentation)", "`CLASS` retention", "In the jar, no run-time cost"],
            ["Behaviour that differs per class or method", "An interface or a strategy object, perhaps chosen by a `Class` element", "Annotations hold data, never logic"],
            ["Values that change per environment (URLs, timeouts, feature flags)", "Configuration files or a config service", "Annotations are fixed at compile time"],
            ["Many related settings, or settings with structure", "A configuration class or record", "Element types are limited; no `null`, no collections"],
            ["A rule that must hold for every subclass or implementation", "A method in the type, or a checker", "`@Inherited` covers only class annotations through `extends`"],
            ["Nullness and units of measure on types", "`TYPE_USE` annotations with a checker (Checker Framework, NullAway)", "Reflection rarely reads them; tools do"],
          ],
        },
        {
          type: "paragraph",
          text: "My rule: an annotation should describe **what** something is (\"this method handles GET /trips/{id}\", \"this field is sensitive\"), and the code that reads it decides **what to do** about it. When I'm tempted to put an expression, a list of rules or environment-specific values into annotation elements, that's configuration or code, not metadata.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Forgetting @Retention(RUNTIME)",
        },
        {
          type: "paragraph",
          text: "The default is `CLASS`, which reflection never sees. The annotation compiles, appears in the source, shows up in the class file with `javap`, and `isAnnotationPresent` is always `false`. Nothing warns. Every annotation meant for a run-time framework needs `@Retention(RetentionPolicy.RUNTIME)`; the production section shows the cost of forgetting it.",
        },
        {
          type: "heading",
          text: "Calling getAnnotation for a repeatable annotation",
        },
        {
          type: "paragraph",
          text: "With two or more occurrences, the class file holds the container, so `getAnnotation(SurgeWindow.class)` returns `null`. With one occurrence it works. Code tested with one annotation breaks the day someone adds a second. Use `getAnnotationsByType` for repeatable types.",
        },
        {
          type: "heading",
          text: "Expecting @Inherited to work for interfaces or methods",
        },
        {
          type: "paragraph",
          text: "It works only for class annotations through the superclass chain. An annotation on an interface, or on an overridden method, isn't found on the implementation by plain reflection. Frameworks that support it do their own search.",
        },
        {
          type: "heading",
          text: "A @Target that doesn't include where the framework reads",
        },
        {
          type: "paragraph",
          text: "On records, an annotation is copied only to the members its `@Target` allows. `@Target(FIELD)` on a record component is invisible to code reading accessors or components. When writing an annotation used on DTOs, include `RECORD_COMPONENT` and every member kind the readers use.",
        },
        {
          type: "heading",
          text: "Typos in @SuppressWarnings, or suppressing too widely",
        },
        {
          type: "paragraph",
          text: "Unknown names are ignored silently, so a typo suppresses nothing. And `@SuppressWarnings(\"unchecked\")` on a class hides every future unchecked warning in it. Suppress on the smallest declaration, usually one local variable, with a comment explaining why it's safe.",
        },
        {
          type: "heading",
          text: "Deprecating without saying what to use instead",
        },
        {
          type: "paragraph",
          text: "`@Deprecated` alone tells callers to stop, not where to go. Add the Javadoc `@deprecated` tag with the replacement and the reason, `since`, and `forRemoval = true` once a removal is planned.",
        },
        {
          type: "heading",
          text: "Mutating or re-reading array elements in a loop",
        },
        {
          type: "paragraph",
          text: "An array element returns a fresh clone on every call (32 bytes each for three strings). Writing to it has no effect, and calling it per iteration allocates per iteration. Read it once into a local.",
        },
        {
          type: "heading",
          text: "Implementing an annotation interface with a record or the default equals",
        },
        {
          type: "paragraph",
          text: "`equals` and `hashCode` must follow the `Annotation` contract, or equality is asymmetric and hash lookups fail, as Example 3 showed.",
        },
        {
          type: "heading",
          text: "Assuming a missing annotation library fails loudly",
        },
        {
          type: "paragraph",
          text: "If the annotation's class isn't on the run-time class path, the annotation disappears without an error. A `provided`/`compileOnly` dependency on an annotations jar is fine for `SOURCE` and `CLASS` annotations and wrong for `RUNTIME` ones that the application reads.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Write `@Retention` and `@Target` explicitly on every custom annotation, even when the default happens to be right. They're the two lines a reader needs most.",
            "Use `RUNTIME` only when something reads the annotation by reflection; prefer `SOURCE` for compile-time checks so nothing ships in the class file.",
            "Keep `@Target` as narrow as the readers need, and include `RECORD_COMPONENT` (plus `FIELD`/`METHOD`/`PARAMETER` as needed) for annotations used on records.",
            "Use `@Override` on every overriding or implementing method, and `@FunctionalInterface` on every interface meant for lambdas.",
            "Deprecate with `since`, a Javadoc `@deprecated` explanation, and `forRemoval = true` once removal is decided.",
            "Suppress warnings on the narrowest declaration, with a comment saying why it's safe; never on a whole class.",
            "Name the main element `value` when there is one obvious element, so the shorthand reads naturally (`@Owner(\"asha\")`).",
            "Give every element a sensible default when one exists, and use sentinels (`\"\"`, `Void.class`, `NONE`) for \"not set\", since `null` is impossible.",
            "Read repeatable annotations with `getAnnotationsByType`, and treat array elements as copies.",
            "Make annotations describe facts, not behaviour; keep logic in the code that reads them.",
            "Add a test or startup check for annotations that guard something important (masking, authorisation), asserting that they're visible where the reader looks.",
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
          title: "AnnotationCost.java",
          code: `import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

public class AnnotationCost {
    @Retention(RetentionPolicy.RUNTIME) @interface FareRule { String zone(); int surgePercent() default 0; }
    @Retention(RetentionPolicy.RUNTIME) @interface Owner { String value(); }

    @FareRule(zone = "SALT-LAKE", surgePercent = 20) @Owner("asha") static class SaltLake { }
    @FareRule(zone = "NEW-TOWN") @Owner("ravi") static class NewTown { }
    static class Plain { }

    static Object sink;

    public static void main(String[] args) {
        if (args.length > 0) {                                     // "java AnnotationCost skip"
            sink = new SaltLake();                                 // use the class, never read its annotations
            return;
        }
        long t0 = System.nanoTime();
        sink = SaltLake.class.getAnnotation(FareRule.class);       // first annotation read in this JVM
        long t1 = System.nanoTime();
        sink = NewTown.class.getAnnotation(FareRule.class);        // same annotation type, another class
        long t2 = System.nanoTime();
        sink = SaltLake.class.getAnnotation(FareRule.class);       // same class again
        long t3 = System.nanoTime();
        System.out.printf("first read, cold JVM     : %,8d ns%n", t1 - t0);
        System.out.printf("second class, same type  : %,8d ns%n", t2 - t1);
        System.out.printf("same class again (cached): %,8d ns%n", t3 - t2);

        int n = 10_000_000;
        long best = Long.MAX_VALUE, bestPlain = Long.MAX_VALUE;
        for (int round = 0; round < 5; round++) {
            long s = System.nanoTime();
            for (int i = 0; i < n; i++) sink = SaltLake.class.getAnnotation(FareRule.class);
            best = Math.min(best, System.nanoTime() - s);
            s = System.nanoTime();
            for (int i = 0; i < n; i++) sink = Plain.class.getAnnotation(FareRule.class);
            bestPlain = Math.min(bestPlain, System.nanoTime() - s);
        }
        System.out.printf("steady state, annotated  : %.1f ns per getAnnotation%n", (double) best / n);
        System.out.printf("steady state, no annos   : %.1f ns per getAnnotation%n", (double) bestPlain / n);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac AnnotationCost.java && java AnnotationCost
java -Xlog:class+load AnnotationCost skip | grep -c -E 'AnnotationParser|\\$Proxy'`,
        },
        {
          type: "output",
          text: `first read, cold JVM     : 21,915,038 ns
second class, same type  :  351,692 ns
same class again (cached):      831 ns
steady state, annotated  : 6.3 ns per getAnnotation
steady state, no annos   : 2.9 ns per getAnnotation

0`,
        },
        {
          type: "list",
          items: [
            "These are single-machine numbers from a laptop (Intel i5-8265U, JDK 21.0.13), not a JMH benchmark; I ran it several times and the shape never changed. The first read ranged from 19 to 38 ms across runs.",
            "**The first read in a JVM is expensive: about 20 ms.** It loads the parser, the method-handle infrastructure and ASM, and generates proxy classes (212 classes, as Internal Working counted). A framework pays this once at startup, not per annotation.",
            "**The next class costs about 0.4 ms**: parsing its bytes and creating proxies, mostly still in the interpreter. Multiplied by thousands of classes, this is part of why reflection-heavy frameworks start slowly, and why Micronaut, Quarkus and Dagger move annotation reading to compile time (next lesson).",
            "**After that, `getAnnotation` is a map lookup**: 5 to 6 ns once the JIT has compiled it. For a class with no annotations it was about 3 ns, probably because the lookup hits an empty map. Reading annotations per request is cheap in time; the costs that hurt are the first parse and allocation (array elements, `getParameterAnnotations`, both measured in this phase).",
            "**Unread annotations cost nothing at run time.** With the `skip` argument, the program used the annotated class but never read its annotations, and the class-load log contained no `AnnotationParser` and no proxy class. The only cost is a few bytes in the class file.",
            "**Class file size**: `Trip.class` was 388 bytes with two retained annotations. Each annotation adds its attribute plus constant-pool entries for the type and element names and values, which are shared with the rest of the class.",
          ],
        },
      ],
    },
    {
      title: "Annotations in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend logs every incoming ride request. Riders' phone numbers are personal data, so the platform team wrote a `@Masked` annotation and a logging helper that masks any record component carrying it: `9830012345` should appear as `******2345`. Code review checked that `RideRequest` had `@Masked` on `phone`. A unit test checked that `maskPhone(\"9830012345\")` returned `******2345`. Six weeks later, a data-protection audit of the log store found full phone numbers for every ride requested since the release.",
        },
        {
          type: "code",
          language: "java",
          title: "LogMasking.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.RecordComponent;

public class LogMasking {
    // What shipped: no @Retention, so the default (CLASS) applies
    @Target(ElementType.RECORD_COMPONENT)
    @interface MaskedV1 { }

    // The fix
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.RECORD_COMPONENT)
    @interface Masked { }

    record RideRequestV1(String rider, @MaskedV1 String phone, String pickupZone) { }
    record RideRequest(String rider, @Masked String phone, String pickupZone) { }

    // The shared logging helper: masks every component that carries the given annotation
    static String toLog(Record r, Class<? extends java.lang.annotation.Annotation> mask) {
        StringBuilder sb = new StringBuilder(r.getClass().getSimpleName()).append('[');
        for (RecordComponent c : r.getClass().getRecordComponents()) {
            Object value;
            try {
                value = c.getAccessor().invoke(r);
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException(e);
            }
            if (c.isAnnotationPresent(mask)) value = maskPhone(String.valueOf(value));
            sb.append(c.getName()).append('=').append(value).append(", ");
        }
        sb.setLength(sb.length() - 2);
        return sb.append(']').toString();
    }

    static String maskPhone(String phone) {
        return "******" + phone.substring(phone.length() - 4);
    }

    // A startup guard: refuse to run if a masking annotation can't be seen at run time
    static void requireRuntime(Class<? extends java.lang.annotation.Annotation> type) {
        Retention r = type.getAnnotation(Retention.class);
        if (r == null || r.value() != RetentionPolicy.RUNTIME) {
            throw new IllegalStateException("@" + type.getSimpleName() + " must be @Retention(RUNTIME), is "
                    + (r == null ? "CLASS (default)" : r.value()));
        }
    }

    public static void main(String[] args) {
        System.out.println("before: " + toLog(new RideRequestV1("Asha", "9830012345", "SALT-LAKE"), MaskedV1.class));
        System.out.println("after:  " + toLog(new RideRequest("Asha", "9830012345", "SALT-LAKE"), Masked.class));
        requireRuntime(Masked.class);
        try {
            requireRuntime(MaskedV1.class);
        } catch (IllegalStateException e) {
            System.out.println("guard:  " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac LogMasking.java && java LogMasking
javap -v 'LogMasking$RideRequestV1'          # the Record attribute`,
        },
        {
          type: "output",
          text: `before: RideRequestV1[rider=Asha, phone=9830012345, pickupZone=SALT-LAKE]
after:  RideRequest[rider=Asha, phone=******2345, pickupZone=SALT-LAKE]
guard:  @MaskedV1 must be @Retention(RUNTIME), is CLASS (default)

Record:
  java.lang.String rider;
    descriptor: Ljava/lang/String;

  java.lang.String phone;
    descriptor: Ljava/lang/String;
    RuntimeInvisibleAnnotations:
      0: #45()
        LogMasking$MaskedV1

  java.lang.String pickupZone;
    descriptor: Ljava/lang/String;`,
        },
        {
          type: "list",
          items: [
            "**What happened.** `MaskedV1` had `@Target` but no `@Retention`, so it got the default, `CLASS`. javac wrote it into the class file as `RuntimeInvisibleAnnotations` (`javap` shows it right there on the `phone` component), and `RecordComponent.isAnnotationPresent` returned `false`. The helper never masked anything.",
            "**Why review and tests missed it.** The annotation was visibly present in the source, which is what reviewers check. The unit test tested `maskPhone` directly, which worked. No test went through the path that matters: \"log a real `RideRequest` and assert the output doesn't contain the number\".",
            "**The fix** is one line, `@Retention(RetentionPolicy.RUNTIME)`, and the `after:` line shows `phone=******2345`.",
            "**The guard.** `requireRuntime` runs at startup and refuses to start if a masking annotation isn't `RUNTIME`. It reads the `@Retention` meta-annotation with reflection, which works because `@Retention` itself is `RUNTIME`. For `MaskedV1` it reported \"is CLASS (default)\". I'd add an end-to-end test too: log a request object and assert the raw number isn't in the output.",
            "**Cleaning up.** Logs already written contain the numbers, so the incident doesn't end with the deploy: the affected log indices have to be purged or rewritten, and access to them reviewed. A missing annotation line became a data-protection incident because nothing failed loudly.",
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
              question: "What is an annotation in Java?",
              answer:
                "Metadata attached to a declaration (class, method, field, parameter, record component, package, module) or, since Java 8, to a use of a type. It's written with `@Name` or `@Name(element = value)` and declared with `@interface`. An annotation has no behaviour by itself: the compiler (`@Override`), an annotation processor at build time, or code using reflection at run time (JUnit, Spring, Jackson) reads it and decides what to do.",
            },
            {
              question: "What does @Override do, and what happens if you leave it out?",
              answer:
                "It asks the compiler to check that the method really overrides or implements a method from a supertype; if not, compilation fails with \"method does not override or implement a method from a supertype\". Without it, a typo (`toSting`) or a wrong parameter type (`equals(Fare)` instead of `equals(Object)`) compiles as a new method. In my test, `equals(Fare)` worked when called directly but `HashSet.contains` returned `false`, because collections call `equals(Object)`.",
            },
            {
              question: "What are the three retention policies?",
              answer:
                "`SOURCE`: discarded by the compiler, so only javac and annotation processors see it (`@Override`, `@SuppressWarnings`). `CLASS`, the default: written to the class file as `RuntimeInvisibleAnnotations` but not visible to reflection. `RUNTIME`: written as `RuntimeVisibleAnnotations` and returned by `getAnnotation`. I verified each with `javap -v` and reflection: only the `RUNTIME` one was returned.",
            },
            {
              question: "How do you create a custom annotation?",
              answer:
                "Declare it with `@interface`, add elements as no-argument methods, optionally with `default` values, and add meta-annotations: `@Retention(RetentionPolicy.RUNTIME)` if it'll be read by reflection and `@Target(...)` for where it may appear. For example `@Retention(RUNTIME) @Target(METHOD) @interface Endpoint { String value(); int timeoutMs() default 2000; }`, used as `@Endpoint(\"/trips\")` or `@Endpoint(value = \"/trips\", timeoutMs = 5000)`.",
            },
            {
              question: "What types can annotation elements have?",
              answer:
                "Primitives, `String`, `Class` (optionally bounded), enums, other annotation types, and one-dimensional arrays of those. Wrappers like `Integer`, collections, multi-dimensional arrays and arbitrary objects are rejected with \"invalid type for annotation interface element\". Values must be compile-time constants and can't be `null`, not even as a default.",
            },
            {
              question: "What is a marker annotation, and what is the value shorthand?",
              answer:
                "A marker annotation has no elements, like `@Override` or `@FunctionalInterface`: its presence is the information. The shorthand: if an element is named `value` and it's the only one being set, the name can be omitted, so `@Owner(\"asha\")` means `@Owner(value = \"asha\")`. It works only for `value`, and only when every other element has a default.",
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
              question: "What are meta-annotations? Name them.",
              answer:
                "Annotations on annotation types. `@Retention` (how long it survives), `@Target` (where it may be used), `@Documented` (shown in Javadoc of annotated elements), `@Inherited` (class annotations inherited by subclasses) and `@Repeatable` (may appear more than once, stored in a container). Frameworks also use their own meta-annotations: Spring's `@Service` is meta-annotated with `@Component`.",
            },
            {
              question: "How does @Inherited behave?",
              answer:
                "It makes `getAnnotation` and `getAnnotations` on a class also find the annotation on its superclasses. Only for annotations on classes, and only through `extends`: in my test, an `@Inherited` annotation on an interface wasn't found on the implementing class, and one on a superclass method wasn't found on the overriding method. `getDeclaredAnnotations` never includes inherited ones, and a subclass's own annotation of the same type hides the inherited one.",
            },
            {
              question: "How do repeatable annotations work?",
              answer:
                "The annotation is marked `@Repeatable(Container.class)`, where the container has a `value()` array of it. When it's repeated, javac stores one container annotation in the class file; `javap` showed `@SurgeWindows({...})` and no `@SurgeWindow`. So `getAnnotation(SurgeWindow.class)` returns `null` when there are two, and `getAnnotationsByType` must be used. With a single occurrence there's no container. The container's retention must be at least as long as the repeatable's, which javac checks.",
            },
            {
              question: "What's the difference between @Deprecated and @Deprecated(forRemoval = true)?",
              answer:
                "Plain `@Deprecated` produces only a summary note (\"uses or overrides a deprecated API\") unless compiled with `-Xlint:deprecation`. With `forRemoval = true`, javac emits a `[removal]` warning at every use by default, because the API is going away. `since` is documentation. Both are `RUNTIME`, so tools like `jdeprscan` and reflection can read them. Uses inside the same outermost class don't warn.",
            },
            {
              question: "What's the difference between a declaration annotation and a type annotation?",
              answer:
                "A declaration annotation applies to a declared thing (a method, field, parameter) and is stored in `RuntimeVisibleAnnotations` or `RuntimeVisibleParameterAnnotations`. A type annotation (`@Target(TYPE_USE)`, Java 8) applies to a use of a type, like `List<@NonEmpty String>`, and is stored in `RuntimeVisibleTypeAnnotations` with a path such as `METHOD_RETURN, TYPE_ARGUMENT(0)`. Reflection finds type annotations through `AnnotatedType` (`getAnnotatedReturnType()`), not `getAnnotations()`. They're mainly used by checkers for nullness and units.",
            },
            {
              question: "What happens to an annotation on a record component?",
              answer:
                "It's propagated to the private field, the generated accessor, the canonical constructor's parameter and the component itself, but only to those its `@Target` allows. With no `@Target` it went to all four in my test; with `@Target(FIELD)` only to the field. An explicitly declared accessor doesn't get it at all. That's why validation or masking annotations need `RECORD_COMPONENT` (and the other targets their readers use) in their `@Target`.",
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
              question: "What object do you get back from getAnnotation()?",
              answer:
                "A dynamic proxy that implements the annotation interface, like `jdk.proxy2.$Proxy1`, with `sun.reflect.annotation.AnnotationInvocationHandler` as its handler. The handler holds a map from element name to value, built from defaults plus the values in the class file. `equals` compares element values (two proxies from different classes were equal), `hashCode` follows the formula in `Annotation`'s Javadoc (I reproduced it exactly), and array elements are cloned on every call. Proxies are cached in the `Class`'s `annotationData`, so repeated reads return the same object.",
            },
            {
              question: "How are annotations represented in the class file and inside the JVM?",
              answer:
                "As attributes: `RuntimeVisibleAnnotations`, `RuntimeInvisibleAnnotations`, the `Parameter` and `Type` variants, and `AnnotationDefault` on the annotation type's methods. Each entry references the type descriptor and element names and values in the constant pool. HotSpot keeps the visible bytes unparsed on the class and drops invisible ones unless `-XX:+PreserveAllAnnotations` is set. Parsing happens in Java code (`AnnotationParser`) on the first reflective read, which in my test loaded 212 classes and took about 20 ms in a cold JVM.",
            },
            {
              question: "Why can't an annotation element be null or a List?",
              answer:
                "Because element values have to be written into the class file and rebuilt without running user code. Primitives, strings, class literals, enum constants and nested annotations all have constant-pool or descriptor encodings; arrays are sequences of those. A `List` would need a constructor call, and `null` has no constant-pool encoding. The practical workaround is a sentinel default (`\"\"`, `-1`, `Void.class`, an enum `NONE`).",
            },
            {
              question: "What happens at run time if an annotation's class, or a class named in a Class element, is missing?",
              answer:
                "A missing annotation type makes the annotation disappear silently: after deleting `RuntimeNote.class`, `getAnnotations()` returned `[]` with no exception. A missing class in a `Class` element is different: the annotation is returned, but calling that element throws `TypeNotPresentException`, because the parser stored an exception proxy in the value map. The first behaviour lets code compiled against optional libraries run without them; it also hides misconfigured dependencies.",
            },
            {
              question: "Does the JVM itself act on any annotations?",
              answer:
                "Almost none; the JVM treats annotations as data. A few JDK-internal ones are read by HotSpot's class-file parser: `@Contended`, `@ForceInline`, `@DontInline`, `@Stable`, `@IntrinsicCandidate` and others in `jdk.internal.vm.annotation`, mostly honoured only for JDK classes. In my test, `@Contended` on an application field did nothing by default and added 128 bytes of padding (offset 24 to 152) with `-XX:-RestrictContended`.",
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
              question: "A custom @Masked annotation is on the phone field of a DTO, the masking helper has unit tests, yet full phone numbers are in the logs. Where do you look?",
              answer:
                "First at the annotation's declaration: without `@Retention(RetentionPolicy.RUNTIME)` it defaults to `CLASS`, and reflection never sees it. `javap -v` on the DTO would show it under `RuntimeInvisibleAnnotations`. My rebuild leaked `9830012345` exactly this way. Then at `@Target` versus where the helper reads (component, field or accessor), and at explicit accessors on records, which don't receive propagated annotations.\n\nFix the retention, add a startup check that the annotation is `RUNTIME`, add an end-to-end test that logs a real DTO and asserts the raw number is absent, and purge the logs already written.",
            },
            {
              question: "Code reads a @Schedule annotation with getAnnotation. It worked for months; after someone added a second @Schedule to a class, that class stopped being scheduled at all. Why?",
              answer:
                "`@Schedule` is `@Repeatable`. With one occurrence, the class file holds a plain `@Schedule`; with two, javac wraps them in the container (`@Schedules`), and `getAnnotation(Schedule.class)` returns `null`, so the class looked unscheduled. I saw exactly this with `@SurgeWindow`. The reader must use `getAnnotationsByType(Schedule.class)`, which unwraps the container and handles one or many.",
            },
            {
              question: "An @Audited annotation is marked @Inherited and placed on a service interface, but the audit aspect doesn't fire for the implementation. What's wrong?",
              answer:
                "`@Inherited` only applies to class annotations through the superclass chain, never through interfaces or methods. `getAnnotation` on the implementation class returns `null` (my `KolkataDispatcher` test). Options: put the annotation on the implementation class, or make the reader search interfaces too, as Spring's `AnnotationUtils.findAnnotation` does. Also check whether the annotation is on interface **methods**, which plain reflection on the implementation's method won't find either.",
            },
            {
              question: "A team migrated DTOs from classes to records, and some framework behaviour driven by annotations silently stopped. What do you check?",
              answer:
                "The `@Target` of each annotation. On a record component, an annotation is copied only to the field, accessor, constructor parameter or component allowed by its target, so a `@Target(FIELD)` annotation is invisible to anything reading accessors, components or constructor parameters. Also check explicit accessors, which get no copy. Fix by adding `RECORD_COMPONENT` and the needed member kinds to the annotation, or annotate the member the framework reads, and add a test that inspects the record with the same API the framework uses.",
            },
            {
              question: "After a dependency clean-up, @Cacheable-style annotations seem to be ignored in production but tests pass. Nothing is logged. What might have happened?",
              answer:
                "If the jar that defines the annotation types is no longer on the run-time class path (for example moved to `provided` or `compileOnly`), the classes still compile and load, but annotations of missing types are silently dropped by reflection: in my test, deleting the annotation's class turned `[@RuntimeNote(...)]` into `[]` without any error. Tests may pass because the test class path still has the jar. I'd compare the run-time class path with the test one, and add a startup check that an annotated class reports its annotation.",
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
            "Declare `public @interface Note { String value(); }` without `@Retention`, put `@Note(\"check surge\")` on a class, and print `getAnnotations()`. Then add `@Retention(RetentionPolicy.RUNTIME)` and run again.",
            "Run `javap -v` on the annotated class after each version and find the attribute that holds `@Note`.",
            "Print `getClass()` of the `Note` instance and `java.lang.reflect.Proxy.isProxyClass(...)` for it.",
            "Write `@Override public boolean equals(Ride other)` in a class and compile it.",
            "Add an element `Integer max();` to `Note` and compile it.",
            "Put an `@Inherited` `RUNTIME` annotation on an interface and on a superclass, then call `getAnnotation` on a class that implements the interface and on one that extends the superclass.",
            "Repeat an annotation that isn't `@Repeatable` on one class. Then make it repeatable with a container, and call `getAnnotation` and `getAnnotationsByType` on a class that has it twice.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `[]`, then `[@Note(\"check surge\")]`. Step 2 shows `RuntimeInvisibleAnnotations` for the first version and `RuntimeVisibleAnnotations` for the second, each with `value=\"check surge\"`. Step 3 prints something like `class jdk.proxy2.$Proxy1 true` (the number can differ; for a package-private annotation there's no `jdk.proxyN.` prefix). Step 4 fails with \"method does not override or implement a method from a supertype\". Step 5 fails with \"invalid type for annotation interface element\". Step 6 finds the annotation through the superclass and returns `null` through the interface. Step 7 first fails with \"is not a repeatable annotation interface\"; after the fix, `getAnnotation` returns `null` and `getAnnotationsByType` returns both.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHAT        metadata on declarations (and type uses); no behaviour
            read by: javac | annotation processors | reflection at run time

BUILT-IN    @Override            error if nothing is overridden
            @Deprecated(since, forRemoval)   [removal] warns by default
            @SuppressWarnings("unchecked")   narrowest scope; typos ignored
            @FunctionalInterface error unless one abstract method
            @SafeVarargs         static/final/private methods, ctors only

DECLARE     @interface X { String value(); int n() default 0; }
            elements: primitive, String, Class, enum, annotation, 1-D arrays
            constants only, never null; value= shorthand

META        @Retention  SOURCE | CLASS (default!) | RUNTIME
            @Target     TYPE METHOD FIELD PARAMETER RECORD_COMPONENT
                        TYPE_USE TYPE_PARAMETER ... (none = all declarations)
            @Documented in Javadoc   @Inherited class + extends only
            @Repeatable(Xs.class)  2+ uses stored as the container

INSIDE      @interface = interface extends Annotation (ACC_ANNOTATION)
            RuntimeVisible/InvisibleAnnotations, AnnotationDefault
            getAnnotation -> jdk.proxyN.$ProxyM + AnnotationInvocationHandler
            equals/hashCode by values, arrays cloned, cached per Class
            first read ~20 ms, 212 classes; then ~5 ns
            missing annotation class -> silently absent

RECORDS     copied to field/accessor/ctor param/component per @Target`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "An annotation is typed, compiler-checked metadata. It does nothing until something reads it, and `@Retention` decides who can: the compiler and processors (`SOURCE`), bytecode tools (`CLASS`, the default), or reflection (`RUNTIME`).",
            "Inside the JVM, annotations are class-file attributes parsed lazily into dynamic proxies with value-based equality. The rules that surprise people (`CLASS` by default, `@Inherited` only through `extends`, repeatables hidden in a container, records filtered by `@Target`, missing classes ignored) all fail silently, so anything important that depends on an annotation deserves a test that reads it the way the framework does.",
            "The next lesson, Processing Annotations at Run Time and Compile Time, writes the readers: a validator, a test runner and a router with reflection, measures what caching reflective lookups saves, and builds a real annotation processor that generates source and fails the build with its own error messages.",
          ],
        },
      ],
    },
  ],
};
