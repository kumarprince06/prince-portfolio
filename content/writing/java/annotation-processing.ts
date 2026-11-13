import type { Lesson } from "../types";

export const annotationProcessing: Lesson = {
  slug: "annotation-processing",
  date: "2026-11-13",
  title: "Processing Annotations at Run Time and Compile Time",
  description:
    "Reading annotations on JDK 21 both ways: isAnnotationPresent, getAnnotation, getAnnotationsByType and getDeclaredAnnotations with @Inherited and repeatables, meta-annotation search the way Spring finds @Component, a mini validator with @NotBlank and @Range, a mini @Test runner, a mini router for @Get(\"/trips/{id}\"), what caching reflective lookups saves (getParameterAnnotations re-parses and allocates 1 KB on every call), a real annotation processor with AbstractProcessor, RoundEnvironment, Messager and Filer that fails the build and generates a registry, rounds read with -XprintRounds, META-INF/services and the note JDK 21 prints about implicit processing, how Lombok rewrites a class while MapStruct and Dagger generate new ones, reflective startup measured against generated code, and a fare of -500 paise accepted because a validation annotation never reached the record component.",
  tags: ["Core Java", "Annotations", "Annotation Processing", "Reflection"],
  sections: [
    {
      title: "What Annotation Processing Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Annotations: Built-in, Custom and Meta-Annotations, ended with the main point about annotations: they do nothing by themselves. An annotation is data in the class file until something reads it. This lesson is about the readers, and the Reflection phase (which ended with Dynamic Proxies, MethodHandles and How Frameworks Use Reflection) already gave us most of the tools for one of them.",
        },
        {
          type: "paragraph",
          text: "There are two places to read annotations. **At run time**, code uses reflection (`getAnnotation`, `getAnnotationsByType`) on classes that are already loaded and acts on what it finds: JUnit runs `@Test` methods, Spring MVC maps `@GetMapping` methods to URLs, Hibernate Validator checks `@NotBlank` fields. **At compile time**, an **annotation processor** runs inside `javac`, sees the annotated source code as a model of elements, and can report errors and generate new source files that are compiled in the same build: MapStruct writes mappers, Dagger writes dependency graphs, Lombok (differently) adds methods.",
        },
        {
          type: "paragraph",
          text: "This lesson builds small versions of each: a validator, a test runner and a router with reflection, then a real processor that checks `@Command` classes and generates a registry. Along the way I measured what reflective lookups cost per call, what caching them saves, and how much startup time a reflective scan costs compared with generated code.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Annotations arrived in Java 5 with reflection support from day one (`AnnotatedElement`), and with a separate command-line tool, `apt` (Annotation Processing Tool), for compile-time processing. `apt` had its own API (`com.sun.mirror`), ran as a separate step before `javac`, and was never standardised. JSR 269 replaced it in Java 6 with the Pluggable Annotation Processing API, built into `javac` itself.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 5 (2004)", "`AnnotatedElement`: `getAnnotation`, `isAnnotationPresent`, `getAnnotations`; the `apt` tool", "Run-time reading; compile-time processing as a separate tool"],
            ["Java 6 (2006)", "JSR 269: `javax.annotation.processing` (`AbstractProcessor`, `RoundEnvironment`, `Messager`, `Filer`) and `javax.lang.model`; processors discovered with `ServiceLoader`; JSR 199 `javax.tools` compiler API", "Processors run inside `javac`, in rounds"],
            ["Java 7 (2011)", "`apt` deprecated", "JSR 269 is the only way"],
            ["Java 8 (2014)", "`getAnnotationsByType`, `getDeclaredAnnotationsByType` (for `@Repeatable`); `AnnotatedType`; `-parameters`; `apt` removed", "Repeatables and type annotations readable at run time"],
            ["Java 9 (2017)", "Processors on the module path (`--processor-module-path`); `@Generated` moved to `javax.annotation.processing.Generated`", "Modular processors"],
            ["Java 16 (2021)", "`RecordComponent` with `getAnnotation`; `ElementKind.RECORD_COMPONENT` in the model", "Records in both worlds"],
            ["Java 21 (2023)", "`-proc:full`; a note when processors are found implicitly on the class path", "Preparing for the default to change"],
            ["Java 23 (2024)", "Annotation processing no longer runs by default unless processors are named or a processor path is given (or `-proc:full`)", "Builds relying on class-path discovery need a flag"],
          ],
        },
        {
          type: "paragraph",
          text: "Frameworks followed the same arc. The first generation (Spring 2.5, Hibernate, JUnit 4) read annotations at run time with reflection. A second generation moved the work to compile time to start faster and fail earlier: Dagger 2 (2015) generates its dependency graph, MapStruct generates mappers, and Micronaut and Quarkus process framework annotations during the build, mainly for startup time and GraalVM native images, where run-time reflection must be declared in advance.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of labels on parcels again, and the two kinds of people who read them.",
        },
        {
          type: "list",
          items: [
            "**Run-time processing is the delivery driver** reading each label at the doorstep. The driver handles whatever arrives, labels and all, and can adapt to anything (reflection works on any loaded class). But reading every label of every parcel takes time on every round, which is why a good driver sorts the van once in the morning (caching).",
            "**Compile-time processing is the inspector at the warehouse** checking parcels before they're loaded. A parcel labelled \"FRAGILE\" with no padding gets rejected **before** it leaves (a processor error fails the build). The inspector can also print an extra manifest from the labels (`Filer` generating a source file), so the driver doesn't need to read the labels at all.",
            "**Rounds** are the inspector checking the new manifest too: anything printed in one pass goes through the inspection line again, until a pass produces nothing new.",
            "**Lombok** is an inspector who opens the parcel and adds items to it. Standard inspectors aren't allowed to open parcels, only to print new paperwork; Lombok uses a staff entrance (internal compiler APIs) to do it anyway.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: the inspector only sees parcels packed in this warehouse. An annotation processor sees the sources being compiled, not the jars on the class path (it can look up their types, but `getElementsAnnotatedWith` only returns elements from the current compilation). And unlike a driver, run-time reflection doesn't get tired; its costs are measurable, and mostly in the first read.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "Reading at run time: AnnotatedElement",
        },
        {
          type: "table",
          headers: ["Method", "Includes @Inherited from superclass", "Looks through repeatable containers", "Returns"],
          rows: [
            ["`isAnnotationPresent(A.class)`", "Yes", "No", "`boolean`"],
            ["`getAnnotation(A.class)`", "Yes", "No", "`A` or `null`"],
            ["`getAnnotations()`", "Yes", "No (containers appear as themselves)", "`Annotation[]`, a new array each call"],
            ["`getAnnotationsByType(A.class)`", "Yes, unless the class has its own `A`", "Yes", "`A[]`, never `null`"],
            ["`getDeclaredAnnotation(A.class)`", "No", "No", "`A` or `null`"],
            ["`getDeclaredAnnotations()`", "No", "No", "`Annotation[]`"],
            ["`getDeclaredAnnotationsByType(A.class)`", "No", "Yes", "`A[]`"],
          ],
        },
        {
          type: "paragraph",
          text: "`Class`, `Method`, `Constructor`, `Field`, `Parameter`, `RecordComponent`, `Package` and `Module` all implement `AnnotatedElement`. Only `Class` has anything to inherit. `Method` and `Constructor` add `getParameterAnnotations()`, and `AnnotatedType` (from `getAnnotatedReturnType()` and friends) carries type annotations.",
        },
        {
          type: "heading",
          text: "Processing at compile time: the JSR 269 API",
        },
        {
          type: "table",
          headers: ["Type", "Package", "Role"],
          rows: [
            ["`Processor` / `AbstractProcessor`", "`javax.annotation.processing`", "What you implement: `process(annotations, roundEnv)` per round"],
            ["`@SupportedAnnotationTypes`, `@SupportedSourceVersion`, `@SupportedOptions`", "`javax.annotation.processing`", "Which annotations it claims, which source level, which `-A` options"],
            ["`ProcessingEnvironment`", "`javax.annotation.processing`", "Given to `init`: the `Messager`, `Filer`, `Elements`, `Types`, options"],
            ["`RoundEnvironment`", "`javax.annotation.processing`", "This round's root elements, `getElementsAnnotatedWith`, `processingOver()`"],
            ["`Messager`", "`javax.annotation.processing`", "Report `ERROR` (fails the build), `WARNING`, `NOTE`, attached to an element"],
            ["`Filer`", "`javax.annotation.processing`", "Create new source, class or resource files; never overwrite existing ones"],
            ["`Element`, `TypeElement`, `ExecutableElement`, `ElementKind`", "`javax.lang.model.element`", "The program as declarations: classes, methods, constructors, parameters"],
            ["`TypeMirror`, `Types`, `Elements`", "`javax.lang.model.type` / `util`", "Types (subtyping, erasure) and lookup helpers"],
          ],
        },
        {
          type: "heading",
          text: "javac options for processing",
        },
        {
          type: "table",
          headers: ["Option", "Effect"],
          rows: [
            ["`-processor a.B,c.D`", "Run exactly these processors (no service discovery)"],
            ["`-processorpath path` / `--processor-path`", "Where to find processors; without `-processor`, discover them there through `META-INF/services`"],
            ["`--processor-module-path`", "Processors packaged as modules"],
            ["`-proc:none`", "No annotation processing"],
            ["`-proc:only`", "Only processing, no class files"],
            ["`-proc:full`", "Processing and compilation, explicitly (JDK 21; the default in 21)"],
            ["`-s dir`", "Where generated source files go"],
            ["`-Akey=value`", "Options passed to processors (`processingEnv.getOptions()`)"],
            ["`-XprintRounds`, `-XprintProcessorInfo`", "Debugging: what each round saw, which processor claimed what"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Where reflection caches annotations, and where it doesn't",
        },
        {
          type: "paragraph",
          text: "The previous lesson showed that `Class` caches its parsed annotations in a field called `annotationData`. Methods are more interesting, because `getMethod` returns a **new copy** of the `Method` object on every call. `javap` on the JDK's own classes shows how they share work:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p 'java.lang.Class$AnnotationData'
javap -p java.lang.reflect.Method | grep -E 'annotations|root'
javap -c -p java.lang.reflect.Executable      # declaredAnnotations() and sharedGetParameterAnnotations()`,
        },
        {
          type: "output",
          text: `class java.lang.Class$AnnotationData {
  final java.util.Map<java.lang.Class<? extends java.lang.annotation.Annotation>, java.lang.annotation.Annotation> annotations;
  final java.util.Map<java.lang.Class<? extends java.lang.annotation.Annotation>, java.lang.annotation.Annotation> declaredAnnotations;
  final int redefinedCount;
  ...
}
  private final byte[] annotations;
  private final byte[] parameterAnnotations;
  private java.lang.reflect.Method root;

  private java.util.Map<java.lang.Class<? extends java.lang.annotation.Annotation>, java.lang.annotation.Annotation> declaredAnnotations();
    Code:
       0: aload_0
       1: getfield      #366                // Field declaredAnnotations:Ljava/util/Map;
       ...
      23: invokevirtual #369                // Method getRoot:()Ljava/lang/reflect/AccessibleObject;
       ...
      35: invokevirtual #344                // Method declaredAnnotations:()Ljava/util/Map;
       ...
      62: invokestatic  #376                // Method sun/reflect/annotation/AnnotationParser.parseAnnotations:([BLjdk/internal/reflect/ConstantPool;Ljava/lang/Class;)Ljava/util/Map;
       ...
  java.lang.annotation.Annotation[][] sharedGetParameterAnnotations(java.lang.Class<?>[], byte[]);
    Code:
       ...
      14: aload_0
      15: aload_2
      16: invokevirtual #321                // Method parseParameterAnnotations:([B)[[Ljava/lang/annotation/Annotation;`,
        },
        {
          type: "list",
          items: [
            "**`Class$AnnotationData`** holds two maps (all annotations including inherited ones, and declared ones) plus `redefinedCount`. If a Java agent redefines the class, the count changes and the cache is rebuilt.",
            "**Each `Method` copy points to its `root`**, the one `Method` object the `Class` keeps internally. `declaredAnnotations()` asks the root first (offset 23 to 35) and only parses the raw bytes itself (offset 62) when there is no root. So a fresh `getMethod(...)` copy doesn't re-parse annotations; it still costs the copy itself, measured below.",
            "**`getParameterAnnotations()` has no cache.** `sharedGetParameterAnnotations` calls `parseParameterAnnotations` on the raw bytes (offset 16) on **every** call. I didn't expect that; the measurement below shows it costs about 1 µs and 1 KB per call for a one-parameter method. `Parameter.getAnnotation` is the cached alternative.",
            "Annotations are parsed lazily, in Java code, from bytes that HotSpot kept from the class file. Nothing about them lives in the JIT or the object layout; once parsed they're ordinary objects (proxies) in maps.",
          ],
        },
        {
          type: "heading",
          text: "Inside javac: discovery, rounds and deferred errors",
        },
        {
          type: "paragraph",
          text: "When `javac` starts, its `JavacProcessingEnvironment` decides whether to process at all and which processors to load: the classes named by `-processor`, or every class listed in `META-INF/services/javax.annotation.processing.Processor` files found with `ServiceLoader` on the processor path (or, if no processor path is given, on the class path). Then it runs **rounds**:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Parse and enter** all source files, building symbols for every declared class and member. Method bodies aren't type-checked yet, so a reference to a class that doesn't exist (like a not-yet-generated `CommandRegistry`) isn't an error at this stage.",
            "**Round 1**: find which annotation types appear in the root elements, and call `process` on each processor that claims one of them (or `\"*\"`). A processor that returns `true` claims those annotations, and later processors aren't offered them.",
            "**If any processor created source files**, parse and enter those, and run another round with the new files as root elements. Every processor that has run before is called again in each later round, even with an empty set of annotations.",
            "**When a round creates nothing new**, run a **final round** with `processingOver() == true` (and no root elements), so processors can finish.",
            "**Then compile everything**: attribute, flow analysis, code generation. Errors that were deferred (\"cannot find symbol\") are reported now, if the symbol still doesn't exist. If a processor reported an `ERROR`, javac stops after processing and writes no class files.",
          ],
        },
        {
          type: "paragraph",
          text: "The Writing an Annotation Processor section shows each of these steps in real `javac` output with `-XprintRounds`.",
        },
        {
          type: "image",
          src: "/images/java/annotation-processing-rounds.svg",
          alt: "Top half, compile time: javac -processorpath proc-classes -processor CommandProcessor. Parse and enter reads 4 source files; Main.java uses CommandRegistry, which doesn't exist yet. Round 1 calls process with the Command annotation; the Messager reports an ERROR on a class without a public no-arg constructor, and the Filer writes generated/com/ridehail/cli/CommandRegistry.java, a map from command names like refund to constructor references. Round 2 has CommandRegistry as its input and no annotations. Round 3, the last, has processingOver true; no new files, so javac leaves the loop and goes on to attribute, flow and generate 5 class files with no reflection. A note says a processor can add new files but can't change an existing class (FilerException: Attempt to recreate a file), while Lombok edits javac's tree through internal APIs. Bottom half, run time: a startup scan loads every controller class and calls getMethods and getAnnotation; the first read per class parses bytes, builds proxies and caches them in the Class and the Method root; a route table built once makes each request a HashMap.get at 15 ns and 0 bytes, while scanning getMethods and annotations on every call costs 355 ns and 1,216 bytes. 1,000 routes on 200 classes registered reflectively in about 94 ms versus about 3 ms for the generated table.",
          caption: "A processor works in rounds inside javac and leaves plain code behind; a reflective framework reads the same facts at startup and should cache them.",
        },
      ],
    },
    {
      title: "Reading Annotations with Reflection",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "ReadingApis.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Repeatable;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.Arrays;

public class ReadingApis {
    @Inherited @Retention(RetentionPolicy.RUNTIME) @interface Audited { }
    @Retention(RetentionPolicy.RUNTIME) @interface Owner { String value(); }

    @Inherited @Retention(RetentionPolicy.RUNTIME) @Repeatable(Zones.class) @interface Zone { String value(); }
    @Inherited @Retention(RetentionPolicy.RUNTIME) @interface Zones { Zone[] value(); }

    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.PARAMETER) @interface PathParam { String value(); }

    @Audited @Owner("asha") @Zone("SALT-LAKE") @Zone("NEW-TOWN")
    static class FareService {
        public long quote(@PathParam("zone") String zone, int km) { return 0; }
    }

    @Zone("GARIA")
    static class SouthFareService extends FareService { }

    static String names(java.lang.annotation.Annotation[] as) {
        return Arrays.stream(as).map(a -> "@" + a.annotationType().getSimpleName()).toList().toString();
    }

    static void show(String label, Object value) {
        System.out.printf("%-36s %s%n", label, value);
    }

    public static void main(String[] args) throws Exception {
        Class<?> c = SouthFareService.class;
        show("isAnnotationPresent(Audited)", c.isAnnotationPresent(Audited.class));
        show("getAnnotation(Owner)", c.getAnnotation(Owner.class));
        show("getAnnotations()", names(c.getAnnotations()));
        show("getDeclaredAnnotations()", names(c.getDeclaredAnnotations()));
        show("getAnnotationsByType(Zone)", Arrays.toString(c.getAnnotationsByType(Zone.class)));
        show("getDeclaredAnnotationsByType(Zone)", Arrays.toString(c.getDeclaredAnnotationsByType(Zone.class)));
        show("parent getAnnotationsByType(Zone)", Arrays.toString(FareService.class.getAnnotationsByType(Zone.class)));

        Method quote = c.getMethod("quote", String.class, int.class);
        show("getParameterAnnotations()", Arrays.deepToString(quote.getParameterAnnotations()));
        for (Parameter p : quote.getParameters()) {
            PathParam pp = p.getAnnotation(PathParam.class);
            show("parameter " + p.getName(), pp == null ? "no @PathParam" : pp.value());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac ReadingApis.java && java ReadingApis
javac -parameters ReadingApis.java && java ReadingApis | tail -2`,
        },
        {
          type: "output",
          text: `isAnnotationPresent(Audited)         true
getAnnotation(Owner)                 null
getAnnotations()                     [@Audited, @Zones, @Zone]
getDeclaredAnnotations()             [@Zone]
getAnnotationsByType(Zone)           [@ReadingApis.Zone("GARIA")]
getDeclaredAnnotationsByType(Zone)   [@ReadingApis.Zone("GARIA")]
parent getAnnotationsByType(Zone)    [@ReadingApis.Zone("SALT-LAKE"), @ReadingApis.Zone("NEW-TOWN")]
getParameterAnnotations()            [[@ReadingApis.PathParam("zone")], []]
parameter arg0                       zone
parameter arg1                       no @PathParam

parameter zone                       zone
parameter km                         no @PathParam`,
        },
        {
          type: "list",
          items: [
            "**`getAnnotations()` vs `getDeclaredAnnotations()`**: `SouthFareService` declares only `@Zone(\"GARIA\")`. `getAnnotations()` adds the inherited `@Audited` and also the parent's `@Zones` **container**, because the container type is `@Inherited` too. `@Owner` isn't `@Inherited`, so `getAnnotation(Owner.class)` is `null`.",
            "**`getAnnotationsByType(Zone.class)` returned only `GARIA`**, not the parent's two zones. The rule (in `AnnotatedElement`'s Javadoc) is that inherited repeatable annotations are used only if the class has **no** directly present or container-wrapped annotation of that type. So `getAnnotations()` shows both the parent's container and the child's zone at once, while `getAnnotationsByType` shows only the child's. I found that surprising; code that merges zones from parents has to walk `getSuperclass()` itself.",
            "**`getParameterAnnotations()`** returns one array per parameter, empty for parameters without annotations. `Parameter.getAnnotation` is easier to use and cached.",
            "**Parameter names need `-parameters`.** Without it the class file has no `MethodParameters` attribute and names are `arg0`, `arg1`. That's why Spring MVC and JAX-RS ask for `@PathVariable(\"id\")` with an explicit name, or require compiling with `-parameters` (Spring Boot's build plugins turn it on).",
          ],
        },
        {
          type: "heading",
          text: "How Spring and JUnit find annotations you didn't put there",
        },
        {
          type: "paragraph",
          text: "Plain reflection only finds an annotation where it's written (plus `@Inherited` class annotations). Frameworks need more: Spring treats `@Service` as `@Component` because `@Service` is **meta-annotated** with `@Component`, and finds `@Transactional` on an interface method when the call hits the implementation. Both are searches the framework writes itself:",
        },
        {
          type: "code",
          language: "java",
          title: "MetaAnnotations.java",
          code: `import java.lang.annotation.Annotation;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.HashSet;
import java.util.Set;

public class MetaAnnotations {
    // Like Spring: @Component is a meta-annotation, @Service is "a kind of" @Component
    @Retention(RetentionPolicy.RUNTIME) @Target({ElementType.TYPE, ElementType.ANNOTATION_TYPE})
    @interface Component { }

    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.TYPE)
    @Component
    @interface Service { }

    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.TYPE)
    @Service
    @interface PricingService { }                                   // two levels deep

    @PricingService static class SurgeCalculator { }
    @Service static class ReceiptMailer { }
    static class PlainHelper { }

    // Search the annotation, then the annotations on each annotation, and so on
    static boolean hasMeta(Class<?> type, Class<? extends Annotation> wanted) {
        return search(type.getAnnotations(), wanted, new HashSet<>());
    }

    static boolean search(Annotation[] annotations, Class<? extends Annotation> wanted, Set<Class<?>> seen) {
        for (Annotation a : annotations) {
            Class<? extends Annotation> t = a.annotationType();
            if (t == wanted) return true;
            if (seen.add(t) && search(t.getAnnotations(), wanted, seen)) return true;   // seen: avoids loops
        }
        return false;
    }

    public static void main(String[] args) {
        for (Class<?> c : new Class<?>[] {SurgeCalculator.class, ReceiptMailer.class, PlainHelper.class}) {
            System.out.printf("%-16s getAnnotation(Component)=%-5s meta-search=%s%n", c.getSimpleName(),
                    c.getAnnotation(Component.class) != null, hasMeta(c, Component.class));
        }
        System.out.println("@Documented is annotated with: " + java.util.Arrays.toString(Documented.class.getAnnotations()));
    }
}`,
        },
        {
          type: "output",
          text: `SurgeCalculator  getAnnotation(Component)=false meta-search=true
ReceiptMailer    getAnnotation(Component)=false meta-search=true
PlainHelper      getAnnotation(Component)=false meta-search=false
@Documented is annotated with: [@java.lang.annotation.Documented(), @java.lang.annotation.Retention(RUNTIME), @java.lang.annotation.Target({ANNOTATION_TYPE})]`,
        },
        {
          type: "list",
          items: [
            "`getAnnotation(Component.class)` is `false` for all three: none of them is directly annotated `@Component`. The meta-search follows `@PricingService` to `@Service` to `@Component`. This is what Spring's `MergedAnnotations` and JUnit 5's `AnnotationSupport.findAnnotation` do; it's why `@SpringBootTest` or a custom `@IntegrationTest` can bundle several annotations into one.",
            "**The `seen` set is required.** `@Documented` is annotated with `@Documented`, `@Retention` with `@Retention`: the meta-annotation graph has cycles, and a naive recursion never terminates.",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "InterfaceAnnotations.java",
          code: `import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.reflect.Method;

public class InterfaceAnnotations {
    @Inherited @Retention(RetentionPolicy.RUNTIME) @interface Transactional { }

    interface RefundService {
        @Transactional void refund(String tripId, long paise);
    }

    static class RefundServiceImpl implements RefundService {
        public void refund(String tripId, long paise) { }
    }

    // Roughly what Spring's AnnotationUtils.findAnnotation does: also search interfaces and superclasses
    static <A extends java.lang.annotation.Annotation> A find(Method m, Class<A> type) {
        A direct = m.getAnnotation(type);
        if (direct != null) return direct;
        for (Class<?> i : m.getDeclaringClass().getInterfaces()) {
            try {
                A found = find(i.getMethod(m.getName(), m.getParameterTypes()), type);
                if (found != null) return found;
            } catch (NoSuchMethodException ignored) { }
        }
        return null;
    }

    public static void main(String[] args) throws Exception {
        Method impl = RefundServiceImpl.class.getMethod("refund", String.class, long.class);
        System.out.println("impl.getAnnotation:  " + impl.getAnnotation(Transactional.class));
        System.out.println("search interfaces:   " + find(impl, Transactional.class));
    }
}`,
        },
        {
          type: "output",
          text: `impl.getAnnotation:  null
search interfaces:   @InterfaceAnnotations.Transactional()`,
        },
        {
          type: "paragraph",
          text: "`@Inherited` doesn't apply to methods, so the implementation's `refund` has no `@Transactional` as far as `Method.getAnnotation` is concerned. Spring's `AnnotationUtils.findAnnotation(Method, Class)` searches interfaces and superclass methods, as my `find` does. Code that uses plain `getAnnotation` (a home-grown aspect, an older library) silently treats interface-annotated methods as unannotated.",
        },
      ],
    },
    {
      title: "A Mini Validator and a Mini Test Runner",
      blocks: [
        {
          type: "heading",
          text: "Validation with @NotBlank and @Range",
        },
        {
          type: "code",
          language: "java",
          title: "MiniValidator.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Field;
import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.List;

public class MiniValidator {
    @Retention(RetentionPolicy.RUNTIME)
    @Target({ElementType.RECORD_COMPONENT, ElementType.FIELD})
    @interface NotBlank { String message() default "must not be blank"; }

    @Retention(RetentionPolicy.RUNTIME)
    @Target({ElementType.RECORD_COMPONENT, ElementType.FIELD})
    @interface Range {
        long min() default Long.MIN_VALUE;
        long max() default Long.MAX_VALUE;
    }

    record FareRequest(@NotBlank String riderId,
                       @NotBlank String pickupZone,
                       @Range(min = 1, max = 500_000) long farePaise,
                       @Range(min = 1, max = 6) int seats) { }

    static class DriverSignup {                         // a plain class: annotations on fields
        @NotBlank(message = "name is required") String name = " ";
        @Range(min = 18, max = 70) int age = 17;
    }

    static List<String> validate(Object target) throws ReflectiveOperationException {
        List<String> errors = new ArrayList<>();
        if (target instanceof Record) {
            for (RecordComponent c : target.getClass().getRecordComponents()) {
                check(c.getName(), c.getAccessor().invoke(target), c.getAnnotation(NotBlank.class), c.getAnnotation(Range.class), errors);
            }
        } else {
            for (Field f : target.getClass().getDeclaredFields()) {
                f.setAccessible(true);
                check(f.getName(), f.get(target), f.getAnnotation(NotBlank.class), f.getAnnotation(Range.class), errors);
            }
        }
        return errors;
    }

    static void check(String name, Object value, NotBlank notBlank, Range range, List<String> errors) {
        if (notBlank != null && (value == null || value.toString().isBlank())) {
            errors.add(name + ": " + notBlank.message());
        }
        if (range != null && value instanceof Number n) {
            long v = n.longValue();
            if (v < range.min() || v > range.max()) {
                errors.add(name + ": " + v + " not in [" + range.min() + ", " + range.max() + "]");
            }
        }
    }

    public static void main(String[] args) throws Exception {
        System.out.println(validate(new FareRequest("R-17", "SALT-LAKE", 14_500, 4)));
        System.out.println(validate(new FareRequest("", "  ", -500, 9)));
        System.out.println(validate(new DriverSignup()));
    }
}`,
        },
        {
          type: "output",
          text: `[]
[riderId: must not be blank, pickupZone: must not be blank, farePaise: -500 not in [1, 500000], seats: 9 not in [1, 6]]
[name: name is required, age: 17 not in [18, 70]]`,
        },
        {
          type: "list",
          items: [
            "This is the core of Bean Validation (Hibernate Validator) in 70 lines: find each property, read its constraint annotations, check the value, **collect** errors instead of stopping at the first, so a client gets every problem in one response.",
            "**Records are read through components**, classes through fields. The annotations target both `RECORD_COMPONENT` and `FIELD`, so they're found either way. Leave one out and the validator silently skips that property; the production section is that bug.",
            "Element defaults make the annotation flexible: `@Range(min = 1)` has no upper bound because `max` defaults to `Long.MAX_VALUE`, and `message` has a default that `DriverSignup` overrides.",
            "Real validators add what this one lacks: caching per class (the next section measures why), constraint composition (meta-annotations again), groups, and a way to plug in new constraint types.",
          ],
        },
        {
          type: "heading",
          text: "A test runner with @Test, @BeforeEach and @Disabled",
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
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) @interface Test {
        Class<? extends Throwable> expected() default None.class;
        final class None extends Throwable { private None() { } }
    }
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) @interface BeforeEach { }
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) @interface Disabled { String value(); }

    // ---- the code under test
    static long fareWithSurge(long paise, int percent) {
        if (percent < 0) throw new IllegalArgumentException("negative surge " + percent);
        return paise + paise * percent / 100;
    }

    // ---- a test class, written the way JUnit users write them
    public static class FareTests {
        long base;

        @BeforeEach void setUp() { base = 20_000; }

        @Test void noSurge() { check(fareWithSurge(base, 0) == 20_000, "no surge keeps the fare"); }
        @Test void twentyPercent() { check(fareWithSurge(base, 20) == 24_000, "20% surge"); }
        @Test void roundsDown() { check(fareWithSurge(333, 50) == 500, "333 + 166 should be 500"); }
        @Test(expected = IllegalArgumentException.class) void negativeSurge() { fareWithSurge(base, -10); }
        @Test @Disabled("pricing team is changing caps") void surgeCap() { check(false, "not written yet"); }
        void helper() { throw new AssertionError("not a test, never run"); }

        static void check(boolean ok, String what) { if (!ok) throw new AssertionError(what); }
    }

    // ---- the runner
    static void run(Class<?> testClass) throws ReflectiveOperationException {
        Method[] methods = testClass.getDeclaredMethods();
        Arrays.sort(methods, Comparator.comparing(Method::getName));     // reflection gives no fixed order
        Method before = Arrays.stream(methods).filter(m -> m.isAnnotationPresent(BeforeEach.class)).findFirst().orElse(null);
        int passed = 0, failed = 0, skipped = 0;
        for (Method m : methods) {
            Test test = m.getAnnotation(Test.class);
            if (test == null || Modifier.isStatic(m.getModifiers())) continue;
            Disabled disabled = m.getAnnotation(Disabled.class);
            if (disabled != null) {
                System.out.println("SKIP " + m.getName() + " (" + disabled.value() + ")");
                skipped++;
                continue;
            }
            Object instance = testClass.getDeclaredConstructor().newInstance();   // fresh instance per test, like JUnit
            try {
                if (before != null) before.invoke(instance);
                m.invoke(instance);
                if (test.expected() != Test.None.class) throw new AssertionError("expected " + test.expected().getSimpleName());
                System.out.println("PASS " + m.getName());
                passed++;
            } catch (InvocationTargetException e) {
                Throwable cause = e.getCause();                   // the test's own exception is wrapped
                if (test.expected().isInstance(cause)) {
                    System.out.println("PASS " + m.getName() + " (threw " + cause.getClass().getSimpleName() + ")");
                    passed++;
                } else {
                    System.out.println("FAIL " + m.getName() + ": " + cause);
                    failed++;
                }
            } catch (AssertionError e) {
                System.out.println("FAIL " + m.getName() + ": " + e.getMessage());
                failed++;
            }
        }
        System.out.printf("%d passed, %d failed, %d skipped%n", passed, failed, skipped);
    }

    public static void main(String[] args) throws Exception {
        run(FareTests.class);
    }
}`,
        },
        {
          type: "output",
          text: `PASS negativeSurge (threw IllegalArgumentException)
PASS noSurge
FAIL roundsDown: java.lang.AssertionError: 333 + 166 should be 500
SKIP surgeCap (pricing team is changing caps)
PASS twentyPercent
3 passed, 1 failed, 1 skipped`,
        },
        {
          type: "list",
          items: [
            "**Discovery is `getDeclaredMethods()` plus `getAnnotation(Test.class)`.** `helper()` has no annotation and never runs; JUnit 3's \"methods starting with test\" convention is gone.",
            "**`getDeclaredMethods()` has no defined order**, so I sort by name. JUnit 5 also uses a deterministic but deliberately non-obvious order unless `@TestMethodOrder` says otherwise, so tests can't quietly depend on each other.",
            "**A new instance per test**, as JUnit does by default, so state from one test (`base`) can't leak into another.",
            "**`InvocationTargetException` wraps whatever the test threw** (the Reflection phase covered why). The runner unwraps it with `getCause()` to compare with `expected` and to report the real failure.",
            "`roundsDown` fails on purpose: 333 + 333 * 50 / 100 is 333 + 166 = **499**, not 500, so the test's expectation was wrong. The runner reports it without stopping the other tests.",
            "`expected` uses a private sentinel class, `Test.None`, as its default, because an annotation element can't default to `null`. JUnit 4's `@Test(expected = ...)` used exactly this trick.",
          ],
        },
      ],
    },
    {
      title: "A Mini Router and Caching Reflective Lookups",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "MiniRouter.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MiniRouter {
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) @interface Get { String value(); }
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) @interface Post { String value(); }
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.PARAMETER) @interface PathVar { String value(); }

    public static class TripController {
        @Get("/trips/{id}")
        public String trip(@PathVar("id") String id) { return "trip " + id + " in SALT-LAKE"; }

        @Get("/drivers/{driverId}/trips/{tripId}")
        public String driverTrip(@PathVar("driverId") String driver, @PathVar("tripId") String trip) {
            return "driver " + driver + ", trip " + trip;
        }

        @Post("/trips/{id}/cancel")
        public String cancel(@PathVar("id") String id) { return "cancelled " + id; }
    }

    // One entry per annotated method: built ONCE at startup
    record Route(String httpMethod, Pattern pattern, List<String> varNames, Object target, Method handler) { }

    static final List<Route> ROUTES = new ArrayList<>();

    static void register(Object controller) {
        for (Method m : controller.getClass().getMethods()) {
            String verb = null, path = null;
            if (m.getAnnotation(Get.class) instanceof Get g) { verb = "GET"; path = g.value(); }
            if (m.getAnnotation(Post.class) instanceof Post p) { verb = "POST"; path = p.value(); }
            if (verb == null) continue;
            List<String> vars = new ArrayList<>();
            Matcher vm = Pattern.compile("\\\\{(\\\\w+)}").matcher(path);
            while (vm.find()) vars.add(vm.group(1));
            Pattern regex = Pattern.compile(path.replaceAll("\\\\{\\\\w+}", "([^/]+)"));
            ROUTES.add(new Route(verb, regex, vars, controller, m));
            System.out.println("mapped " + verb + " " + path + " -> " + m.getName());
        }
    }

    static String dispatch(String verb, String path) throws ReflectiveOperationException {
        for (Route r : ROUTES) {
            Matcher m = r.pattern().matcher(path);
            if (!r.httpMethod().equals(verb) || !m.matches()) continue;
            Parameter[] params = r.handler().getParameters();
            Object[] argsForCall = new Object[params.length];
            for (int i = 0; i < params.length; i++) {
                String name = params[i].getAnnotation(PathVar.class).value();
                argsForCall[i] = m.group(r.varNames().indexOf(name) + 1);
            }
            return "200 " + r.handler().invoke(r.target(), argsForCall);
        }
        return "404 no route for " + verb + " " + path;
    }

    public static void main(String[] args) throws Exception {
        register(new TripController());
        System.out.println(dispatch("GET", "/trips/T-1042"));
        System.out.println(dispatch("GET", "/drivers/D-77/trips/T-9"));
        System.out.println(dispatch("POST", "/trips/T-1042/cancel"));
        System.out.println(dispatch("GET", "/trips/T-1042/cancel"));
    }
}`,
        },
        {
          type: "output",
          text: `mapped POST /trips/{id}/cancel -> cancel
mapped GET /trips/{id} -> trip
mapped GET /drivers/{driverId}/trips/{tripId} -> driverTrip
200 trip T-1042 in SALT-LAKE
200 driver D-77, trip T-9
200 cancelled T-1042
404 no route for GET /trips/T-1042/cancel`,
        },
        {
          type: "list",
          items: [
            "**All reflection happens in `register`**, once: methods, annotations, path templates turned into regular expressions. `dispatch` only matches strings and calls `Method.invoke`. This split, scan once and keep a table, is how Spring MVC's `RequestMappingHandlerMapping` and JAX-RS implementations work.",
            "**`getMethods()` order isn't declaration order**: `cancel` was mapped first. Anything that depends on order (two patterns that both match) needs an explicit rule, like Spring's \"most specific pattern wins\".",
            "**`GET /trips/T-1042/cancel` is a 404** because only `POST` is mapped for that path; a real router would answer 405 Method Not Allowed.",
            "The `@PathVar(\"id\")` names are explicit because, without `-parameters`, the parameter names don't exist at run time.",
          ],
        },
        {
          type: "heading",
          text: "What each lookup costs",
        },
        {
          type: "code",
          language: "java",
          title: "LookupCost.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.management.ManagementFactory;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

public class LookupCost {
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD) @interface Get { String value(); }
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.PARAMETER) @interface PathVar { String value(); }

    public static class TripController {
        @Get("/trips/{id}") public String trip(@PathVar("id") String id) { return id; }
        @Get("/drivers/{id}") public String driver(@PathVar("id") String id) { return id; }
        @Get("/zones/{id}") public String zone(@PathVar("id") String id) { return id; }
        public String health() { return "ok"; }
    }

    interface Op { Object run(); }

    static final com.sun.management.ThreadMXBean MX =
            (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;

    static void measure(String name, Op op) {
        int n = 2_000_000;
        long best = Long.MAX_VALUE, bytes = 0;
        for (int round = 0; round < 7; round++) {
            long a0 = MX.getCurrentThreadAllocatedBytes();
            long t0 = System.nanoTime();
            for (int i = 0; i < n; i++) sink = op.run();
            long t = System.nanoTime() - t0;
            bytes = MX.getCurrentThreadAllocatedBytes() - a0;
            best = Math.min(best, t);
        }
        System.out.printf("%-44s %7.1f ns/op %6d bytes/op%n", name, (double) best / n, bytes / n);
    }

    public static void main(String[] args) throws Exception {
        Class<TripController> c = TripController.class;
        Method cached = c.getMethod("trip", String.class);
        Map<String, String> routeTable = new HashMap<>();                    // built once at startup
        for (Method m : c.getMethods()) {
            Get g = m.getAnnotation(Get.class);
            if (g != null) routeTable.put(g.value(), m.getName());
        }

        measure("cached Method, getAnnotation", () -> cached.getAnnotation(Get.class));
        measure("getMethod(...) then getAnnotation", () -> {
            try { return c.getMethod("trip", String.class).getAnnotation(Get.class); }
            catch (NoSuchMethodException e) { throw new IllegalStateException(e); }
        });
        measure("cached Method, getParameterAnnotations", () -> cached.getParameterAnnotations());
        measure("cached Method, getParameters()[0].getAnno..", () -> cached.getParameters()[0].getAnnotation(PathVar.class));
        measure("scan getMethods() for @Get on every call", () -> {
            for (Method m : c.getMethods()) {
                Get g = m.getAnnotation(Get.class);
                if (g != null && g.value().equals("/zones/{id}")) return m;
            }
            return null;
        });
        measure("route table built once: HashMap.get", () -> routeTable.get("/zones/{id}"));
    }
}`,
        },
        {
          type: "output",
          text: `cached Method, getAnnotation                     7.3 ns/op      0 bytes/op
getMethod(...) then getAnnotation               83.9 ns/op    136 bytes/op
cached Method, getParameterAnnotations        1006.3 ns/op   1024 bytes/op
cached Method, getParameters()[0].getAnno..     31.7 ns/op     24 bytes/op
scan getMethods() for @Get on every call       353.4 ns/op   1216 bytes/op
route table built once: HashMap.get             14.4 ns/op      0 bytes/op`,
        },
        {
          type: "list",
          items: [
            "Single-machine numbers (Intel i5-8265U laptop, JDK 21.0.13), best of 7 rounds of 2 million calls, allocation from the thread's allocation counter; not JMH. Repeated runs were within about 20%.",
            "**`getAnnotation` on a cached `Method`: 7 ns, 0 bytes.** A map lookup in the root's cache. Reading annotations isn't slow once parsed.",
            "**`getMethod(...)` first: 63 to 84 ns and 136 bytes**, because every `getMethod` returns a fresh copy of the `Method` (the annotations themselves come from the root's cache). Keep `Method` objects, don't look them up per call.",
            "**`getParameterAnnotations()`: about 1,000 ns and 1,024 bytes per call**, the surprise. It re-parses the raw bytes every time, as the bytecode in Internal Working showed. A framework that called it per request would allocate a kilobyte per request per handler. `getParameters()[0].getAnnotation(...)` is 30 times faster (the `Parameter` caches its annotations; the 24 bytes are the cloned `Parameter[]`).",
            "**Scanning `getMethods()` per call: 355 ns and 1,216 bytes**, against **15 ns and 0 bytes** for the route table built once. That's the whole case for caching: a framework should never discover the same metadata twice.",
          ],
        },
      ],
    },
    {
      title: "Writing an Annotation Processor",
      blocks: [
        {
          type: "paragraph",
          text: "The ops team runs maintenance commands with a small CLI: `cancel-trip`, `surge-report`, `refund`. Each command is a class marked `@Command(\"name\")`, and the CLI needs a map from name to class, created without arguments. Two things used to go wrong at run time: a command without a public no-arg constructor, and two commands with the same name. Both can be checked by the compiler, and the map can be generated instead of scanned for.",
        },
        {
          type: "heading",
          text: "The annotation and the processor",
        },
        {
          type: "code",
          language: "java",
          title: "processor/src/com/ridehail/cli/Command.java",
          code: `package com.ridehail.cli;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// SOURCE is enough: only the annotation processor needs to see it
@Retention(RetentionPolicy.SOURCE)
@Target(ElementType.TYPE)
public @interface Command {
    String value();                 // the command name typed by ops, e.g. "cancel-trip"
}`,
        },
        {
          type: "code",
          language: "java",
          title: "processor/src/com/ridehail/cli/CommandProcessor.java",
          code: `package com.ridehail.cli;

import java.io.IOException;
import java.io.Writer;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import javax.annotation.processing.AbstractProcessor;
import javax.annotation.processing.Messager;
import javax.annotation.processing.RoundEnvironment;
import javax.annotation.processing.SupportedAnnotationTypes;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.Element;
import javax.lang.model.element.ElementKind;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.TypeElement;
import javax.lang.model.util.ElementFilter;
import javax.tools.Diagnostic;
import javax.tools.JavaFileObject;

@SupportedAnnotationTypes("com.ridehail.cli.Command")
public class CommandProcessor extends AbstractProcessor {
    private final Map<String, String> commands = new TreeMap<>();   // name -> class, across rounds
    private int round;
    private boolean generated;

    @Override
    public SourceVersion getSupportedSourceVersion() {
        return SourceVersion.latestSupported();                     // don't warn on newer -release values
    }

    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment env) {
        Messager log = processingEnv.getMessager();
        round++;
        log.printMessage(Diagnostic.Kind.NOTE, "round " + round + ": annotations=" + annotations
                + " roots=" + env.getRootElements().size() + " over=" + env.processingOver());

        for (Element e : env.getElementsAnnotatedWith(Command.class)) {
            if (e.getKind() != ElementKind.CLASS || e.getModifiers().contains(Modifier.ABSTRACT)) {
                log.printMessage(Diagnostic.Kind.ERROR, "@Command must be on a concrete class", e);
                continue;
            }
            boolean hasPublicNoArg = ElementFilter.constructorsIn(e.getEnclosedElements()).stream()
                    .anyMatch(c -> c.getParameters().isEmpty() && c.getModifiers().contains(Modifier.PUBLIC));
            if (!hasPublicNoArg) {
                log.printMessage(Diagnostic.Kind.ERROR,
                        "@Command class " + e.getSimpleName() + " needs a public no-arg constructor", e);
                continue;
            }
            String name = e.getAnnotation(Command.class).value();
            String previous = commands.put(name, ((TypeElement) e).getQualifiedName().toString());
            if (previous != null) {
                log.printMessage(Diagnostic.Kind.ERROR, "command \\"" + name + "\\" is already used by " + previous, e);
            }
        }

        if (!generated && !commands.isEmpty() && !env.processingOver()) {
            writeRegistry();
            generated = true;
        }
        return true;                                                // we own @Command: no other processor needs it
    }

    private void writeRegistry() {
        try {
            JavaFileObject file = processingEnv.getFiler().createSourceFile("com.ridehail.cli.CommandRegistry");
            try (Writer w = file.openWriter()) {
                w.write("package com.ridehail.cli;\\n\\n");
                w.write("import java.util.Map;\\n");
                w.write("import java.util.function.Supplier;\\n\\n");
                w.write("// Generated by CommandProcessor. Do not edit.\\n");
                w.write("public final class CommandRegistry {\\n");
                w.write("    private CommandRegistry() { }\\n\\n");
                w.write("    public static final Map<String, Supplier<Runnable>> COMMANDS = Map.of(\\n");
                int i = 0;
                for (var entry : commands.entrySet()) {
                    w.write("        \\"" + entry.getKey() + "\\", " + entry.getValue() + "::new"
                            + (++i < commands.size() ? ",\\n" : "\\n"));
                }
                w.write("    );\\n}\\n");
            }
        } catch (IOException ex) {
            processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR, "cannot write registry: " + ex);
        }
    }
}`,
        },
        {
          type: "code",
          language: "text",
          title: "processor/src/META-INF/services/javax.annotation.processing.Processor",
          code: `com.ridehail.cli.CommandProcessor`,
        },
        {
          type: "list",
          items: [
            "**`@Retention(SOURCE)` is enough.** Processors see annotations of every retention; this one is never needed at run time, so it doesn't go into the class files at all (`javap -v` on a compiled command shows no annotation attribute).",
            "**The processor sees elements, not classes.** `getElementsAnnotatedWith` returns `Element`s from the source model. `ElementFilter.constructorsIn` lists constructors, including the default one javac adds to a class that declares none, so `CancelTripCommand` passes without writing a constructor.",
            "**`Messager.printMessage(ERROR, message, element)`** reports an error at the element's position in the source file. Any `ERROR` makes the compilation fail.",
            "**State lives in fields** across rounds (`commands`, `generated`): the same processor instance is called once per round.",
            "**The registry is written once**, in the first round that has data, and never in the final round: a file created when `processingOver()` is `true` is still compiled, but no processor ever sees it, and javac warns: \"File for type 'Late' created in the last round will not be subject to annotation processing.\" (I tried it.)",
            "**`getSupportedSourceVersion` returns `latestSupported()`** instead of a fixed `RELEASE_21`, so the processor doesn't print a warning when compiled code targets a newer release.",
            "The services file lists processor class names, one per line. It's what lets javac find the processor without `-processor`, as the end of this section shows.",
          ],
        },
        {
          type: "heading",
          text: "The application",
        },
        {
          type: "code",
          language: "java",
          title: "app/src/com/ridehail/cli/CancelTripCommand.java",
          code: `package com.ridehail.cli;

@Command("cancel-trip")
public class CancelTripCommand implements Runnable {
    public void run() { System.out.println("cancelling stuck trips in SALT-LAKE"); }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "app/src/com/ridehail/cli/SurgeReportCommand.java",
          code: `package com.ridehail.cli;

@Command("surge-report")
public class SurgeReportCommand implements Runnable {
    public void run() { System.out.println("surge in NEW-TOWN: 1.3x"); }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "app/src/com/ridehail/cli/RefundCommand.java",
          code: `package com.ridehail.cli;

@Command("refund")
public class RefundCommand implements Runnable {
    private final long maxPaise;

    public RefundCommand(long maxPaise) { this.maxPaise = maxPaise; }   // no no-arg constructor

    public void run() { System.out.println("refunding up to " + maxPaise + " paise"); }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "app/src/com/ridehail/cli/Main.java",
          code: `package com.ridehail.cli;

public class Main {
    public static void main(String[] args) {
        System.out.println("commands: " + CommandRegistry.COMMANDS.keySet().stream().sorted().toList());
        CommandRegistry.COMMANDS.get(args[0]).get().run();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# 1. compile the annotation and the processor, and register it
javac -d proc-classes processor/src/com/ridehail/cli/*.java
cp -r processor/src/META-INF proc-classes/

# 2. compile the application with the processor
javac -processorpath proc-classes -processor com.ridehail.cli.CommandProcessor \\
      -cp proc-classes -d out -s generated app/src/com/ridehail/cli/*.java`,
        },
        {
          type: "output",
          text: `Note: round 1: annotations=[com.ridehail.cli.Command] roots=4 over=false
app/src/com/ridehail/cli/RefundCommand.java:4: error: @Command class RefundCommand needs a public no-arg constructor
public class RefundCommand implements Runnable {
       ^
Note: round 2: annotations=[] roots=0 over=true
1 error`,
        },
        {
          type: "list",
          items: [
            "**The build fails with my own error message**, pointing at `RefundCommand` in the source, before anything is deployed. Without the processor, this was a `NoSuchMethodException` the first time someone ran `refund` in production.",
            "**`Main.java` uses `CommandRegistry`**, which doesn't exist in any source file, and that isn't reported as an error. javac defers \"cannot find symbol\" until processing is done, because a processor might generate the missing class. Here, after the processor's error, javac skipped the rest: no class files at all were written.",
            "Note `-cp proc-classes`: the annotation type `Command` must be on the **class path** for the application to compile, while `-processorpath` is only where processors are loaded from. Without `-cp` the build fails with \"cannot find symbol: class Command\" and the processor never runs.",
          ],
        },
        {
          type: "paragraph",
          text: "I added a public no-arg constructor that refunds up to the default Rs 500:",
        },
        {
          type: "code",
          language: "java",
          title: "app/src/com/ridehail/cli/RefundCommand.java",
          code: `package com.ridehail.cli;

@Command("refund")
public class RefundCommand implements Runnable {
    private final long maxPaise;

    public RefundCommand() { this(50_000); }                              // the fix: Rs 500 default
    public RefundCommand(long maxPaise) { this.maxPaise = maxPaise; }

    public void run() { System.out.println("refunding up to " + maxPaise + " paise"); }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -processorpath proc-classes -processor com.ridehail.cli.CommandProcessor \\
      -cp proc-classes -d out -s generated app/src/com/ridehail/cli/*.java
java -cp out com.ridehail.cli.Main refund
java -cp out com.ridehail.cli.Main surge-report
cat generated/com/ridehail/cli/CommandRegistry.java`,
        },
        {
          type: "output",
          text: `Note: round 1: annotations=[com.ridehail.cli.Command] roots=4 over=false
Note: round 2: annotations=[] roots=1 over=false
Note: round 3: annotations=[] roots=0 over=true
commands: [cancel-trip, refund, surge-report]
refunding up to 50000 paise
commands: [cancel-trip, refund, surge-report]
surge in NEW-TOWN: 1.3x
package com.ridehail.cli;

import java.util.Map;
import java.util.function.Supplier;

// Generated by CommandProcessor. Do not edit.
public final class CommandRegistry {
    private CommandRegistry() { }

    public static final Map<String, Supplier<Runnable>> COMMANDS = Map.of(
        "cancel-trip", com.ridehail.cli.CancelTripCommand::new,
        "refund", com.ridehail.cli.RefundCommand::new,
        "surge-report", com.ridehail.cli.SurgeReportCommand::new
    );
}`,
        },
        {
          type: "list",
          items: [
            "**Three rounds.** Round 1 saw the four source files and the `Command` annotation, and generated `CommandRegistry.java`. Round 2 processed that one new file (`roots=1`), which has no annotations. Round 3 is the final round (`over=true`), with nothing to process.",
            "**The generated file is ordinary Java**, in `generated/` because of `-s`, compiled with everything else. At run time there is no reflection and no scanning: `CommandRegistry.COMMANDS` is a `Map.of` with constructor references, checked by the compiler. If someone later deletes the no-arg constructor, the build fails twice over: my processor's error, and the generated `RefundCommand::new` no longer compiling.",
          ],
        },
        {
          type: "heading",
          text: "Other errors the processor catches",
        },
        {
          type: "paragraph",
          text: "I added `@Command(\"refund\")` to an interface and to a second class, and compiled again:",
        },
        {
          type: "output",
          text: `Note: round 1: annotations=[com.ridehail.cli.Command] roots=6 over=false
t6/PingCommand.java:4: error: @Command must be on a concrete class
public interface PingCommand extends Runnable { }
       ^
t6/RefundCommand.java:4: error: command "refund" is already used by com.ridehail.cli.DupCommand
public class RefundCommand implements Runnable {
       ^
Note: round 2: annotations=[] roots=0 over=true
2 errors`,
        },
        {
          type: "paragraph",
          text: "Both are reported in one build, each at the right file and line. A duplicate name would otherwise have been a `Map.of` `IllegalArgumentException: duplicate key` at startup, or, with a `HashMap`, one command silently replacing the other.",
        },
        {
          type: "heading",
          text: "Discovery from the class path, and the JDK 21 note",
        },
        {
          type: "code",
          language: "bash",
          code: `jar cf command-processor.jar -C proc-classes .
javac -cp command-processor.jar -d out2 -s gen2 app/src/com/ridehail/cli/*.java
javac -proc:none -cp command-processor.jar -d out3 app/src/com/ridehail/cli/*.java
javac -proc:full -cp command-processor.jar -d out4 -s gen4 app/src/com/ridehail/cli/*.java`,
        },
        {
          type: "output",
          text: `Note: Annotation processing is enabled because one or more processors were found
  on the class path. A future release of javac may disable annotation processing
  unless at least one processor is specified by name (-processor), or a search
  path is specified (--processor-path, --processor-module-path), or annotation
  processing is enabled explicitly (-proc:only, -proc:full).
  Use -Xlint:-options to suppress this message.
  Use -proc:none to disable annotation processing.
Note: round 1: annotations=[com.ridehail.cli.Command] roots=4 over=false
Note: round 2: annotations=[] roots=1 over=false
Note: round 3: annotations=[] roots=0 over=true

app/src/com/ridehail/cli/Main.java:5: error: package CommandRegistry does not exist
        System.out.println("commands: " + CommandRegistry.COMMANDS.keySet().stream().sorted().toList());
                                                         ^
app/src/com/ridehail/cli/Main.java:6: error: package CommandRegistry does not exist
        CommandRegistry.COMMANDS.get(args[0]).get().run();
                       ^
2 errors

Note: round 1: annotations=[com.ridehail.cli.Command] roots=4 over=false
Note: round 2: annotations=[] roots=1 over=false
Note: round 3: annotations=[] roots=0 over=true`,
        },
        {
          type: "list",
          items: [
            "**With only the jar on the class path**, JDK 21's javac found the processor through `META-INF/services`, ran it, and printed the note above. The processor still ran; the note is a warning about the future. I checked the same build with the JDK 17.0.21 compiler on this machine: it ran the processor silently, with no note.",
            "**`-proc:none`** turned processing off, so nothing generated `CommandRegistry` and `Main` failed to compile (javac guessed `CommandRegistry` was a package, hence the odd message).",
            "**`-proc:full`** (new in JDK 21; JDK 17.0.21 accepted it too) enabled processing explicitly, and the note disappeared.",
            "**Since JDK 23, the default changed**: a processor found only on the class path no longer runs unless processing is requested with `-processor`, `--processor-path`, `-proc:only` or `-proc:full`. I only have JDK 17 and 21 installed, so I verified the JDK 21 note, not the JDK 23 behaviour; the JDK 23 release notes describe it. The fix that works everywhere is what Maven and Gradle already do when configured properly: put processors on the processor path (`annotationProcessorPaths` in the Maven compiler plugin, the `annotationProcessor` configuration in Gradle).",
          ],
        },
      ],
    },
    {
      title: "What Processors Can't Do: Lombok vs Code Generators",
      blocks: [
        {
          type: "paragraph",
          text: "The JSR 269 API can read the program and **add new files**. It has no method to change an existing class. I tried the obvious approach, asking the `Filer` for a source file with the same name as the annotated class:",
        },
        {
          type: "code",
          language: "java",
          title: "RewriteProcessor.java",
          code: `import java.io.IOException;
import java.util.Set;
import javax.annotation.processing.AbstractProcessor;
import javax.annotation.processing.RoundEnvironment;
import javax.annotation.processing.SupportedAnnotationTypes;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.Element;
import javax.lang.model.element.TypeElement;
import javax.tools.Diagnostic;

// Tries to do what Lombok does: replace the annotated class with a version that has toString()
@SupportedAnnotationTypes("AddToString")
public class RewriteProcessor extends AbstractProcessor {
    @Override public SourceVersion getSupportedSourceVersion() { return SourceVersion.latestSupported(); }

    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment env) {
        for (Element e : env.getElementsAnnotatedWith(AddToString.class)) {
            String name = ((TypeElement) e).getQualifiedName().toString();
            try {
                processingEnv.getFiler().createSourceFile(name);           // same name as the existing class
            } catch (IOException ex) {
                processingEnv.getMessager().printMessage(Diagnostic.Kind.WARNING, ex.toString(), e);
            }
        }
        return true;
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "AddToString.java",
          code: `import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.SOURCE)
public @interface AddToString { }`,
        },
        {
          type: "code",
          language: "java",
          title: "Trip.java",
          code: `@AddToString
public class Trip {
    String id = "T-1042";
    long farePaise = 14_500;
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d pc AddToString.java RewriteProcessor.java
javac -cp pc -processorpath pc -processor RewriteProcessor -d out Trip.java`,
        },
        {
          type: "output",
          text: `Trip.java:2: warning: javax.annotation.processing.FilerException: Attempt to recreate a file for type Trip
public class Trip {
       ^
1 warning`,
        },
        {
          type: "paragraph",
          text: "The `Filer` refuses to create a file for a type that already exists. That's deliberate: processors must be able to run in any order and in several rounds, so they may only add. Standard processors therefore **generate new types next to yours**: MapStruct generates `TripMapperImpl` for your `TripMapper` interface, Dagger generates `DaggerAppComponent`, AutoValue and record-builder generate `AutoValue_Trip` or `TripBuilder`. You write code against names that don't exist until the build runs, exactly like `CommandRegistry`.",
        },
        {
          type: "heading",
          text: "Lombok does change the class",
        },
        {
          type: "paragraph",
          text: "A Lombok jar (1.18.39) happened to be on this machine, so I compiled a class that has no getters and no `toString` in its source:",
        },
        {
          type: "code",
          language: "java",
          title: "Trip.java",
          code: `import lombok.Getter;
import lombok.ToString;

@Getter
@ToString
public class Trip {
    private final String id;
    private final long farePaise;

    public Trip(String id, long farePaise) { this.id = id; this.farePaise = farePaise; }

    public static void main(String[] args) {
        Trip t = new Trip("T-1042", 14_500);
        System.out.println(t + " " + t.getFarePaise());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `unzip -p lombok.jar META-INF/services/javax.annotation.processing.Processor
javac -cp lombok.jar -processorpath lombok.jar Trip.java && java Trip
javap -p Trip
javap -v Trip | sed -n '/public long getFarePaise/,/^$/p'`,
        },
        {
          type: "output",
          text: `lombok.launch.AnnotationProcessorHider$AnnotationProcessor
lombok.launch.AnnotationProcessorHider$ClaimingProcessor
Trip(id=T-1042, farePaise=14500) 14500
Compiled from "Trip.java"
public class Trip {
  private final java.lang.String id;
  private final long farePaise;
  public Trip(java.lang.String, long);
  public static void main(java.lang.String[]);
  public java.lang.String getId();
  public long getFarePaise();
  public java.lang.String toString();
}
  public long getFarePaise();
    descriptor: ()J
    flags: (0x0001) ACC_PUBLIC
    Code:
      stack=2, locals=1, args_size=1
         0: aload_0
         1: getfield      #13                 // Field farePaise:J
         4: lreturn
      LineNumberTable:
        line 8: 0
    RuntimeInvisibleAnnotations:
      0: #60()
        lombok.Generated`,
        },
        {
          type: "list",
          items: [
            "**Lombok registers as an ordinary annotation processor** through `META-INF/services` (two of them, behind a class loader trick called `AnnotationProcessorHider`). That's how javac lets it in.",
            "**Then it leaves the public API.** Inside `init`, Lombok reaches javac's internal classes (`JavacProcessingEnvironment`, the `JCTree` syntax tree in `jdk.compiler`) and adds method nodes to **your** class's tree before code generation. That's why `Trip.class` has `getId()`, `getFarePaise()` and `toString()` that aren't in `Trip.java`, and why `main` could call `t.getFarePaise()`: with `-proc:none` the same file fails with \"cannot find symbol: method getFarePaise()\".",
            "**The generated methods carry `@lombok.Generated`** with `CLASS` retention (`RuntimeInvisibleAnnotations`): invisible to reflection, but readable by coverage tools like JaCoCo, which skip generated code. A real use of the retention policy the previous lesson called the least useful.",
            "**The cost of using internal APIs**: each new JDK can break Lombok, and since JDK 16's strong encapsulation it has to open `jdk.compiler` internals itself. Lombok releases usually follow JDK releases closely, but a JDK upgrade in a Lombok project means upgrading Lombok first. MapStruct, Dagger and record-builder use only the public API and keep working.",
          ],
        },
        {
          type: "table",
          headers: ["Tool", "How", "What you see", "Risk"],
          rows: [
            ["Lombok", "Edits javac's AST through internal APIs", "Methods appear in your class", "Tied to javac internals; IDE needs a plugin"],
            ["MapStruct", "Filer: generates `XxxMapperImpl`", "A new class in `generated-sources`", "None beyond normal codegen"],
            ["Dagger, Micronaut", "Filer: generates factories and graphs", "New classes; no reflection at run time", "Longer builds"],
            ["AutoValue, record-builder, Immutables", "Filer: generates value classes or builders", "`AutoValue_Trip`, `TripBuilder`", "None beyond normal codegen"],
            ["Error Prone, NullAway, Checker Framework", "Compiler plugin or processor that only reports", "Errors and warnings", "Build time"],
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `javac -processorpath proc-classes -processor com.ridehail.cli.CommandProcessor -cp proc-classes -d out -s generated app/src/com/ridehail/cli/*.java`, with the fixed `RefundCommand`, until `Main refund` prints:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Start.** javac reads its options. `-processor` names the processor, so no service discovery happens; `-processorpath` gives the class loader to load it from. `-proc` defaults to processing plus compilation.",
            "**Parse and enter.** The four source files are parsed into syntax trees, and every class and member gets a symbol. `Command` is resolved from `proc-classes` on the class path. `Main`'s reference to `CommandRegistry` is inside a method body, which isn't attributed yet, so nothing complains.",
            "**Initialise the processor.** javac loads `CommandProcessor` from the processor path, calls its no-arg constructor, then `init(processingEnv)`, which gives it the `Messager`, `Filer`, `Elements` and `Types`.",
            "**Round 1.** javac collects the annotation types present on the root elements (`com.ridehail.cli.Command`), sees that `CommandProcessor` supports it, and calls `process`. The processor checks each annotated class's constructors through the element model, records three commands in its map, and asks the `Filer` for `com.ridehail.cli.CommandRegistry`. The `Filer` creates `generated/com/ridehail/cli/CommandRegistry.java` (because of `-s`) and remembers it. `process` returns `true`, claiming `@Command`.",
            "**Round 2.** Because a new source file was created, javac parses and enters it, and calls `process` again with that file as the only root element and an empty annotation set (the generated file has no annotations). The processor finds nothing new and doesn't generate again (its `generated` flag).",
            "**Round 3, the final round.** No files were generated in round 2, so javac calls `process` once more with `processingOver() == true` and no roots. Nothing is written.",
            "**Compile.** javac attributes every class, now including `CommandRegistry`, so `Main`'s reference resolves. Flow analysis and code generation write five class files to `out/`. `Command` has `SOURCE` retention, so no class file contains it.",
            "**Run.** `java -cp out com.ridehail.cli.Main refund` initialises `CommandRegistry`, whose `Map.of` holds three constructor references (lambdas bootstrapped through `invokedynamic`). `get(\"refund\").get()` calls `new RefundCommand()`, and `run()` prints \"refunding up to 50000 paise\". No reflection anywhere.",
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
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Method;
import java.net.URI;
import java.nio.file.Files;
import java.util.List;
import java.util.Set;
import javax.annotation.processing.AbstractProcessor;
import javax.annotation.processing.RoundEnvironment;
import javax.annotation.processing.SupportedAnnotationTypes;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.Element;
import javax.lang.model.element.ElementKind;
import javax.lang.model.element.TypeElement;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

public class SyntaxTour {
    // ---------- 1. run time: RUNTIME retention + reflection
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD)
    @interface Get { String value(); }

    static class TripController {
        @Get("/trips/{id}") public String trip(String id) { return "trip " + id; }
        public String health() { return "ok"; }
    }

    // ---------- 2. compile time: a processor, run in-process through the javax.tools API
    @SupportedAnnotationTypes("Command")
    static class CommandChecker extends AbstractProcessor {
        @Override public SourceVersion getSupportedSourceVersion() { return SourceVersion.latestSupported(); }

        @Override public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment env) {
            for (TypeElement annotation : annotations) {
                for (Element e : env.getElementsAnnotatedWith(annotation)) {
                    if (e.getKind() == ElementKind.INTERFACE) {
                        processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR, "@Command needs a class", e);
                    } else {
                        processingEnv.getMessager().printMessage(Diagnostic.Kind.NOTE, "found command " + e.getSimpleName(), e);
                    }
                }
            }
            return true;
        }
    }

    static JavaFileObject source(String name, String code) {
        return new SimpleJavaFileObject(URI.create("string:///" + name + ".java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignoreErrors) { return code; }
        };
    }

    public static void main(String[] args) throws Exception {
        for (Method m : TripController.class.getDeclaredMethods()) {
            Get get = m.getAnnotation(Get.class);
            if (get != null) System.out.println("GET " + get.value() + " -> " + m.getName() + "(" + m.invoke(new TripController(), "T-7") + ")");
        }
        System.out.println("health has @Get? " + TripController.class.getMethod("health").isAnnotationPresent(Get.class));

        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        String out = Files.createTempDirectory("tour").toString();
        JavaCompiler.CompilationTask task = javac.getTask(null, null, diagnostics, List.of("-d", out), null, List.of(
                source("Command", "@interface Command { }"),
                source("CancelTrip", "@Command class CancelTrip { }"),
                source("Refund", "@Command interface Refund { }")));
        task.setProcessors(List.of(new CommandChecker()));
        boolean ok = task.call();
        for (var d : diagnostics.getDiagnostics()) {
            System.out.println(d.getKind() + " " + d.getSource().getName() + ":" + d.getLineNumber() + " " + d.getMessage(null));
        }
        System.out.println("compiled? " + ok);
    }
}`,
        },
        {
          type: "output",
          text: `GET /trips/{id} -> trip(trip T-7)
health has @Get? false
NOTE /CancelTrip.java:1 found command CancelTrip
ERROR /Refund.java:1 @Command needs a class
compiled? false`,
        },
        {
          type: "paragraph",
          text: "Both halves in one file: reflection over a `RUNTIME` annotation, and a processor run in-process through the `javax.tools` compiler API (JSR 199) with `task.setProcessors(...)`, compiling sources held in strings. The `@Command` annotation in the compiled sources has default `CLASS` retention; processors see it anyway. The `ERROR` diagnostic made `task.call()` return `false`, exactly as it would fail a command-line build. Test frameworks for processors, like Google's compile-testing, are built on the same API.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: @Retry through a dynamic proxy",
        },
        {
          type: "code",
          language: "java",
          title: "RetryProxy.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class RetryProxy {
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD)
    @interface Retry { int times() default 3; Class<? extends Exception> on() default Exception.class; }

    static class GatewayTimeout extends RuntimeException {
        private static final long serialVersionUID = 1L;
        GatewayTimeout(String m) { super(m); }
    }

    interface PaymentGateway {
        @Retry(times = 3, on = GatewayTimeout.class) String charge(String tripId, long paise);
        String refund(String tripId, long paise);                         // not retried
    }

    static class FlakyGateway implements PaymentGateway {
        int calls;
        public String charge(String tripId, long paise) {
            if (++calls < 3) throw new GatewayTimeout("timeout #" + calls);
            return "charged " + paise + " paise for " + tripId + " on call " + calls;
        }
        public String refund(String tripId, long paise) { throw new GatewayTimeout("refund timeout"); }
    }

    @SuppressWarnings("unchecked")
    static <T> T withRetries(Class<T> type, T target) {
        Map<Method, Optional<Retry>> cache = new ConcurrentHashMap<>();   // read each annotation once
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] {type}, (proxy, method, args) -> {
            Retry retry = cache.computeIfAbsent(method, m -> Optional.ofNullable(m.getAnnotation(Retry.class))).orElse(null);
            for (int attempt = 1; ; attempt++) {
                try {
                    return method.invoke(target, args);
                } catch (InvocationTargetException e) {
                    Throwable cause = e.getCause();
                    if (retry == null || !retry.on().isInstance(cause) || attempt >= retry.times()) throw cause;
                    System.out.println("  " + method.getName() + " attempt " + attempt + " failed: " + cause.getMessage() + ", retrying");
                }
            }
        });
    }

    public static void main(String[] args) {
        PaymentGateway gateway = withRetries(PaymentGateway.class, new FlakyGateway());
        System.out.println(gateway.charge("T-1042", 14_500));
        try {
            gateway.refund("T-1042", 14_500);
        } catch (GatewayTimeout e) {
            System.out.println("refund failed at once: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `  charge attempt 1 failed: timeout #1, retrying
  charge attempt 2 failed: timeout #2, retrying
charged 14500 paise for T-1042 on call 3
refund failed at once: refund timeout`,
        },
        {
          type: "list",
          items: [
            "This is how Spring Retry, `@Transactional` and `@Cacheable` work, in miniature: the caller gets a proxy (from the previous phase's Dynamic Proxies lesson), and the proxy reads an annotation to decide what to do around the real call.",
            "**The annotation is read once per method** and cached in a `ConcurrentHashMap`, wrapped in `Optional` because the map can't hold `null` for \"no annotation\".",
            "`refund` has no `@Retry`, so it fails at once; `charge` succeeds on the third attempt.",
            "**The annotation is on the interface method**, and it works because the proxy receives the **interface's** `Method` object. A class-based proxy (CGLIB, ByteBuddy) receives the implementation's method and must search interfaces, as `InterfaceAnnotations` showed. And a call from inside `FlakyGateway` to its own `charge` would bypass the proxy entirely, which is the self-invocation trap every Spring user meets once.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: CSV export driven by record component annotations",
        },
        {
          type: "code",
          language: "java",
          title: "CsvExport.java",
          code: `import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

public class CsvExport {
    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.RECORD_COMPONENT)
    @interface Column { String value(); int order(); }

    @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.RECORD_COMPONENT)
    @interface Exclude { }

    record TripRow(@Column(value = "fare_paise", order = 3) long farePaise,
                   @Column(value = "trip_id", order = 1) String tripId,
                   @Exclude String riderPhone,
                   @Column(value = "zone", order = 2) String zone) { }

    // Plan built once per record type: which components, in which order, under which header
    record Plan(List<RecordComponent> components, String header) { }

    static Plan plan(Class<? extends Record> type) {
        List<RecordComponent> cols = Arrays.stream(type.getRecordComponents())
                .filter(c -> !c.isAnnotationPresent(Exclude.class))
                .sorted(Comparator.comparingInt((RecordComponent c) -> c.getAnnotation(Column.class).order()))
                .toList();
        String header = cols.stream().map(c -> c.getAnnotation(Column.class).value()).collect(Collectors.joining(","));
        return new Plan(cols, header);
    }

    static String row(Plan plan, Record r) {
        return plan.components().stream().map(c -> {
            try { return String.valueOf(c.getAccessor().invoke(r)); }
            catch (ReflectiveOperationException e) { throw new IllegalStateException(e); }
        }).collect(Collectors.joining(","));
    }

    public static void main(String[] args) {
        Plan p = plan(TripRow.class);
        System.out.println(p.header());
        for (TripRow t : List.of(new TripRow(14_500, "T-1042", "9830012345", "SALT-LAKE"),
                                 new TripRow(23_300, "T-1043", "9830067890", "NEW-TOWN"))) {
            System.out.println(row(p, t));
        }
    }
}`,
        },
        {
          type: "output",
          text: `trip_id,zone,fare_paise
T-1042,SALT-LAKE,14500
T-1043,NEW-TOWN,23300`,
        },
        {
          type: "paragraph",
          text: "The column order and names come from `@Column`, not from the component order, and `@Exclude` keeps the rider's phone number out of the export. All the reflection happens in `plan`, once per record type; `row` just calls the stored accessors. Both annotations target `RECORD_COMPONENT` only, which is right here because nothing else reads them.",
        },
        {
          type: "heading",
          text: "Example 3: Watching the rounds with -XprintRounds",
        },
        {
          type: "code",
          language: "bash",
          code: `javac -XprintRounds -processorpath proc-classes -processor com.ridehail.cli.CommandProcessor \\
      -cp proc-classes -d o5 -s g5 app/src/com/ridehail/cli/*.java
javac -XprintProcessorInfo -processorpath proc-classes -processor com.ridehail.cli.CommandProcessor \\
      -cp proc-classes -d o5 -s g5 app/src/com/ridehail/cli/*.java`,
        },
        {
          type: "output",
          text: `Round 1:
	input files: {com.ridehail.cli.CancelTripCommand, com.ridehail.cli.Main, com.ridehail.cli.RefundCommand, com.ridehail.cli.SurgeReportCommand}
	annotations: [com.ridehail.cli.Command]
	last round: false
Note: round 1: annotations=[com.ridehail.cli.Command] roots=4 over=false
Round 2:
	input files: {com.ridehail.cli.CommandRegistry}
	annotations: []
	last round: false
Note: round 2: annotations=[] roots=1 over=false
Round 3:
	input files: {}
	annotations: []
	last round: true
Note: round 3: annotations=[] roots=0 over=true

Processor com.ridehail.cli.CommandProcessor matches [/com.ridehail.cli.Command] and returns true.
Note: round 1: annotations=[com.ridehail.cli.Command] roots=4 over=false
Processor com.ridehail.cli.CommandProcessor matches [] and returns true.
Note: round 2: annotations=[] roots=1 over=false
Note: round 3: annotations=[] roots=0 over=true`,
        },
        {
          type: "paragraph",
          text: "These two hidden `javac` options are the first thing I reach for when a processor seems not to run, or runs too often. `-XprintRounds` shows javac's view of each round, which matched my processor's own notes exactly. `-XprintProcessorInfo` shows which annotations each processor was offered and whether it claimed them; a processor that returns `true` for `\"*\"` would starve every processor after it.",
        },
      ],
    },
    {
      title: "When to Use Run-Time or Compile-Time Processing",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Why"],
          rows: [
            ["Behaviour decided per call from metadata (routing, retries, transactions)", "Run-time reflection, read once and cached", "Flexible, works on any loaded class, simple to write"],
            ["A rule that can be checked from the source (constructor present, names unique, types match)", "A processor that reports `ERROR`s", "Fails the build, not production"],
            ["Boilerplate derived from declarations (mappers, builders, registries, DI graphs)", "A processor that generates source", "No reflection, no startup scan, readable generated code"],
            ["Fast startup, GraalVM native images, serverless", "Compile-time generation (Micronaut, Quarkus, Dagger)", "Reflection needs configuration in native images and costs startup time"],
            ["Classes that aren't compiled with your build (plugins loaded later, other teams' jars)", "Run-time reflection", "Processors only see the current compilation"],
            ["Adding members to the annotated class itself", "Lombok, or a design that doesn't need it (records)", "Standard processors can only add new files"],
            ["Nullness, units, immutability checks", "Checkers (Error Prone, NullAway, Checker Framework)", "Type annotations are made for compile-time tools"],
          ],
        },
        {
          type: "paragraph",
          text: "My rule: if the answer is known when the code is compiled, compute it at compile time; if it depends on what's loaded or configured at run time, read it at run time, once.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Reading annotations on every call",
        },
        {
          type: "paragraph",
          text: "Looking up methods and annotations per request costs 20 to 70 times more than a prepared table in my measurements, and `getParameterAnnotations()` allocates a kilobyte per call. Read metadata once (at startup or on first use) into a map keyed by `Class` or `Method`.",
        },
        {
          type: "heading",
          text: "Annotation @Target that doesn't match what the reader reads",
        },
        {
          type: "paragraph",
          text: "A constraint with `@Target(FIELD)` on a record component exists only on the field; a validator reading components or accessors never sees it. This is the production bug below.",
        },
        {
          type: "heading",
          text: "Expecting interface or superclass method annotations on the implementation",
        },
        {
          type: "paragraph",
          text: "`Method.getAnnotation` only sees annotations on that exact method. Search interfaces and overridden methods explicitly, or use the framework's utility (`AnnotationUtils.findAnnotation`, `AnnotationSupport.findAnnotation`).",
        },
        {
          type: "heading",
          text: "Using getAnnotation for repeatable annotations",
        },
        {
          type: "paragraph",
          text: "It returns `null` as soon as there are two. Use `getAnnotationsByType`, and remember that it ignores the parent's repeatables when the child has its own.",
        },
        {
          type: "heading",
          text: "Forgetting -parameters, or relying on it",
        },
        {
          type: "paragraph",
          text: "Without it, parameter names are `arg0`, `arg1`. Either always compile with `-parameters` (and make that part of the build), or put explicit names in annotations like `@PathVar(\"id\")`.",
        },
        {
          type: "heading",
          text: "Processor mistakes: generating in the last round, overwriting, claiming everything",
        },
        {
          type: "paragraph",
          text: "Files created when `processingOver()` is `true` are compiled but never processed, with a warning. Creating the same file twice, or a file for an existing type, throws `FilerException`. Returning `true` from a processor that supports `\"*\"` hides every annotation from processors that run after it. And a processor that keeps no state across rounds may generate the same file in round 2 again.",
        },
        {
          type: "heading",
          text: "Depending on implicit processor discovery",
        },
        {
          type: "paragraph",
          text: "A processor that runs only because its jar is on the class path triggers a note on JDK 21 and stops running by default on JDK 23. Put processors on the processor path explicitly.",
        },
        {
          type: "heading",
          text: "Swallowing InvocationTargetException in reflective callers",
        },
        {
          type: "paragraph",
          text: "Exceptions thrown by an invoked method arrive wrapped. A test runner or router that reports the wrapper instead of `getCause()` shows useless messages; one that catches `Exception` broadly may treat a failing test as passing.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Scan once, cache forever: build tables of `Method`s, `RecordComponent`s and their annotations at startup or on first use, keyed by class.",
            "Prefer `Parameter.getAnnotation` to `getParameterAnnotations()` in anything called repeatedly.",
            "Read repeatable annotations with `getAnnotationsByType`, and decide explicitly whether parent annotations should merge.",
            "Search meta-annotations and interfaces deliberately (with a cycle guard) when you need Spring-like behaviour; plain `getAnnotation` doesn't.",
            "Make annotations used on DTOs target `RECORD_COMPONENT` plus every member kind any reader uses, and test with the same API the reader uses.",
            "Move checks that can be done from source into a processor: a failed build is cheaper than a failed deploy.",
            "In processors: report errors with `Messager` on the specific element, keep state across rounds, generate in the first round that has data, never in the last, and return `latestSupported()`.",
            "Register processors in `META-INF/services` and use them through the processor path (`-processorpath`, Maven `annotationProcessorPaths`, Gradle `annotationProcessor`), not the class path.",
            "Test processors in-process with `javax.tools.JavaCompiler` (or compile-testing), asserting on diagnostics and generated sources.",
            "Mark generated code (`@Generated` from `javax.annotation.processing`) so humans and tools know not to edit it.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The per-call costs were measured above. The bigger difference between the two approaches is at startup. I generated 200 controller classes with five `@Get` methods each, and two ways to build a router for them: a reflective scan, and the kind of code a processor would generate.",
        },
        {
          type: "code",
          language: "java",
          title: "ReflectiveStartup.java",
          code: `import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

public class ReflectiveStartup {
    record Handler(Object target, Method method) { }

    public static void main(String[] args) throws Exception {
        long t0 = System.nanoTime();
        Map<String, Handler> routes = new HashMap<>();
        for (String name : ControllerList.NAMES) {                       // what a classpath scan finds
            Class<?> c = Class.forName(name);
            Object instance = c.getDeclaredConstructor().newInstance();
            for (Method m : c.getMethods()) {
                Get g = m.getAnnotation(Get.class);
                if (g != null) routes.put(g.value(), new Handler(instance, m));
            }
        }
        long t1 = System.nanoTime();
        Handler h = routes.get("/c150/m3/{id}");
        Object result = h.method().invoke(h.target(), "T-1042");
        long t2 = System.nanoTime();
        System.out.printf("reflection: %d routes registered in %.1f ms, first request %.1f ms -> %s%n",
                routes.size(), (t1 - t0) / 1e6, (t2 - t1) / 1e6, result);
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "GeneratedStartup.java",
          code: `public class GeneratedStartup {
    public static void main(String[] args) {
        long t0 = System.nanoTime();
        int size = GeneratedRoutes.ROUTES.size();                         // triggers the static initialiser
        long t1 = System.nanoTime();
        String result = GeneratedRoutes.dispatch("/c150/m3/{id}", "T-1042");
        long t2 = System.nanoTime();
        System.out.printf("generated:  %d routes registered in %.1f ms, first request %.1f ms -> %s%n",
                size, (t1 - t0) / 1e6, (t2 - t1) / 1e6, result);
    }
}`,
        },
        {
          type: "paragraph",
          text: "The generated side, written by a small Python script standing in for a processor, is one class per controller plus a table (excerpts):",
        },
        {
          type: "code",
          language: "java",
          code: `public class Controller150 {
    @Get("/c150/m0/{id}") public String m0(String id) { return "c150.m0 " + id; }
    ...
    @Get("/c150/m4/{id}") public String m4(String id) { return "c150.m4 " + id; }
}

// what a processor would generate for Controller150
public final class Controller150$$Routes {
    static final Controller150 c = new Controller150();
    static String call(String route, String id) {
        return switch (route) {
            case "/c150/m0/{id}" -> c.m0(id);
            ...
            case "/c150/m4/{id}" -> c.m4(id);
            default -> null;
        };
    }
}

// What an annotation processor would generate: a plain table, no reflection
public final class GeneratedRoutes {
    static final Map<String, Integer> ROUTES = new HashMap<>();
    static {
        ROUTES.put("/c0/m0/{id}", 0);
        ...                                   // 1,000 entries
    }
    static String dispatch(String route, String id) {
        return switch (ROUTES.get(route)) {
            ...
            case 150 -> Controller150$$Routes.call(route, id);
            ...
        };
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `python3 gen.py                      # writes 200 controllers, ControllerList, and the "generated" router
javac -d out src/*.java
for i in 1 2 3; do java -cp out ReflectiveStartup; java -cp out GeneratedStartup; done`,
        },
        {
          type: "output",
          text: `reflection: 1000 routes registered in 136.0 ms, first request 3.2 ms -> c150.m3 T-1042
generated:  1000 routes registered in 4.1 ms, first request 6.6 ms -> c150.m3 T-1042
reflection: 1000 routes registered in 114.1 ms, first request 1.9 ms -> c150.m3 T-1042
generated:  1000 routes registered in 3.2 ms, first request 6.0 ms -> c150.m3 T-1042
reflection: 1000 routes registered in 114.0 ms, first request 2.6 ms -> c150.m3 T-1042
generated:  1000 routes registered in 2.8 ms, first request 5.5 ms -> c150.m3 T-1042`,
        },
        {
          type: "list",
          items: [
            "Single-machine numbers (laptop, JDK 21.0.13), timed inside the program with `System.nanoTime`; not JMH. Across all my runs, reflective registration took 94 to 167 ms and the generated table 2.8 to 4.7 ms.",
            "**Reflection: about 100 ms for 1,000 routes.** It loads and initialises all 200 controller classes, copies their `Method`s, parses 1,000 annotations and creates their proxies, mostly in the interpreter because startup code hasn't been compiled yet. Spring applications pay this per bean, which is a large part of their startup time.",
            "**Generated: about 3 ms**, filling a `HashMap` from constants. The controller classes aren't even loaded until a request needs one.",
            "**The first request looked slower for the generated version (5 to 7 ms against 2 to 3 ms).** I didn't expect that, so I checked: the controller's `\"c150.m3 \" + id` is the program's first string concatenation, and javac compiles it to an `invokedynamic` whose bootstrap sets up method-handle infrastructure. The reflective version had already paid for that infrastructure during registration (core reflection uses method handles since JDK 18). Compiled with `-XDstringConcat=inline`, which turns concatenation back into `StringBuilder` calls, the generated version's first request dropped to 0.8 to 1.2 ms:",
          ],
        },
        {
          type: "output",
          text: `generated:  1000 routes registered in 3.9 ms, first request 0.9 ms -> c150.m3 T-1042
generated:  1000 routes registered in 4.5 ms, first request 0.8 ms -> c150.m3 T-1042
generated:  1000 routes registered in 4.3 ms, first request 0.9 ms -> c150.m3 T-1042`,
        },
        {
          type: "list",
          items: [
            "**Whole process**: best of 7 wall-clock runs was 141 ms for `ReflectiveStartup` and 54 ms for `GeneratedStartup`; `-Xlog:class+load` counted 1,048 classes loaded against 728.",
            "**The trade-off** is build time and build complexity: a processor runs on every compilation, and generated code must be understood when debugging. For a CLI or a serverless function that starts often, compile time wins; for a long-running service that starts once a week, 100 ms of startup rarely matters, and the flexibility of run-time reading often does.",
          ],
        },
      ],
    },
    {
      title: "Annotation Processing in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend lets support agents adjust a trip's fare after a complaint. The request DTO had `@Positive` on `farePaise`, and a shared in-house validator rejected non-positive fares; that rule had worked for years. During a clean-up, the team converted DTOs from classes to records and updated the validator to read record components. All tests passed. Three weeks later, finance found trips with negative fares: an agent had typed `-500` meaning \"reduce by Rs 5\", and the system had set the fare to minus 500 paise and issued a refund larger than the fare.",
        },
        {
          type: "code",
          language: "java",
          title: "SilentValidation.java",
          code: `import java.lang.annotation.Annotation;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Field;
import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.List;

public class SilentValidation {
    // The shared constraint, written years ago when every DTO was a class with fields
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.FIELD)
    @interface Positive { }

    // The fix: also allowed on record components
    @Retention(RetentionPolicy.RUNTIME)
    @Target({ElementType.FIELD, ElementType.RECORD_COMPONENT})
    @interface PositiveFixed { }

    // Release 1: a class, the validator read fields
    static class FareAdjustmentV1 {
        final String tripId;
        @Positive final long farePaise;
        FareAdjustmentV1(String tripId, long farePaise) { this.tripId = tripId; this.farePaise = farePaise; }
    }

    // Release 2: the DTO became a record; the annotation was carried over unchanged
    record FareAdjustment(String tripId, @Positive long farePaise) { }

    record FareAdjustmentFixed(String tripId, @PositiveFixed long farePaise) { }

    // The validator, updated for records: it now reads record components
    static List<String> validate(Object dto, Class<? extends Annotation> positive) throws ReflectiveOperationException {
        List<String> errors = new ArrayList<>();
        if (dto instanceof Record) {
            for (RecordComponent c : dto.getClass().getRecordComponents()) {
                if (c.isAnnotationPresent(positive) && ((Number) c.getAccessor().invoke(dto)).longValue() <= 0) {
                    errors.add(c.getName() + " must be positive");
                }
            }
        } else {
            for (Field f : dto.getClass().getDeclaredFields()) {
                f.setAccessible(true);
                if (f.isAnnotationPresent(positive) && ((Number) f.get(dto)).longValue() <= 0) {
                    errors.add(f.getName() + " must be positive");
                }
            }
        }
        return errors;
    }

    static void adjust(Object dto, Class<? extends Annotation> positive) throws ReflectiveOperationException {
        List<String> errors = validate(dto, positive);
        System.out.printf("%-20s -> %s%n", dto.getClass().getSimpleName(),
                errors.isEmpty() ? "ACCEPTED, fare set" : "400 " + errors);
    }

    public static void main(String[] args) throws Exception {
        adjust(new FareAdjustmentV1("T-1042", -500), Positive.class);
        adjust(new FareAdjustment("T-1042", -500), Positive.class);
        adjust(new FareAdjustmentFixed("T-1042", -500), PositiveFixed.class);

        // Where did @Positive go on the record?
        RecordComponent c = FareAdjustment.class.getRecordComponents()[1];
        System.out.println("component: " + c.isAnnotationPresent(Positive.class)
                + ", field: " + FareAdjustment.class.getDeclaredField("farePaise").isAnnotationPresent(Positive.class));
    }
}`,
        },
        {
          type: "output",
          text: `FareAdjustmentV1     -> 400 [farePaise must be positive]
FareAdjustment       -> ACCEPTED, fare set
FareAdjustmentFixed  -> 400 [farePaise must be positive]
component: false, field: true`,
        },
        {
          type: "list",
          items: [
            "**What happened.** `@Positive` was declared years earlier with `@Target(ElementType.FIELD)`, when every DTO was a class. On the record, javac copied it only to the private field, because that's the only place its target allows. The updated validator read record **components**, where it doesn't exist (`component: false, field: true`). Nothing was validated, and `-500` was accepted.",
            "**Why nothing warned.** It's legal to put a `FIELD`-only annotation on a record component; javac propagates it to the field and says nothing. The validator found no constraints and treated that as \"valid\", which is the natural default for a validator.",
            "**Why tests passed.** The validation tests were written for the old classes and deleted in the migration as \"duplicates\"; the API tests sent only valid requests. No test sent a negative fare to the record-based DTO.",
            "**The fix.** Add `RECORD_COMPONENT` to the annotation's `@Target` (`PositiveFixed`), so it's present wherever the validator looks; the fixed record is rejected with `400 [farePaise must be positive]`. Hibernate Validator users hit the same shape of bug when the annotation's targets and the property access style (field vs getter) don't match.",
            "**The guards.** A test per DTO that sends an invalid value for every constrained property, and a startup check in the validator: for each record, compare the constraint annotations on its fields with those on its components, and fail if a field has one the component lacks. Both would have caught this on the first build.",
            "**And a domain check.** A fare adjustment that makes a fare negative, or a refund larger than the fare, should be impossible in the service layer too. Annotation-driven validation is a first line of defence, not the only one.",
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
              question: "How do you read an annotation at run time?",
              answer:
                "The annotation must have `@Retention(RetentionPolicy.RUNTIME)`. Then use the `AnnotatedElement` methods on a `Class`, `Method`, `Field`, `Parameter` or `RecordComponent`: `isAnnotationPresent(Get.class)`, `Get g = m.getAnnotation(Get.class)` (or `null`), and `g.value()` to read its elements. For repeatable annotations use `getAnnotationsByType`.",
            },
            {
              question: "What is the difference between compile-time and run-time annotation processing?",
              answer:
                "Run-time processing uses reflection on loaded classes, needs `RUNTIME` retention, and happens every time the application starts (JUnit, Spring MVC, Hibernate Validator). Compile-time processing runs annotation processors inside `javac`; they see annotations of any retention, can report errors that fail the build, and can generate new source files (MapStruct, Dagger, my `CommandProcessor`). Compile time catches mistakes earlier and costs nothing at startup; run time is more flexible.",
            },
            {
              question: "How does JUnit know which methods are tests?",
              answer:
                "It loads the test class, gets its methods with reflection, and keeps those annotated with `@Test` (JUnit 5's `@Test` is `RUNTIME`). For each one it creates a new instance of the class, runs `@BeforeEach` methods, invokes the test with `Method.invoke`, and unwraps `InvocationTargetException` to report failures. My mini runner does exactly that in about 50 lines. JUnit also searches meta-annotations, so a custom annotation meta-annotated with `@Test` counts.",
            },
            {
              question: "What is getAnnotations() vs getDeclaredAnnotations()?",
              answer:
                "`getDeclaredAnnotations()` returns only annotations written directly on the element. `getAnnotations()` also includes annotations inherited from superclasses, for annotation types marked `@Inherited` (only relevant on classes). In my test, a subclass with one `@Zone` returned `[@Zone]` from the declared version and `[@Audited, @Zones, @Zone]` from `getAnnotations()`.",
            },
            {
              question: "What is an annotation processor?",
              answer:
                "A class implementing `javax.annotation.processing.Processor`, usually by extending `AbstractProcessor`, that `javac` calls during compilation. It declares the annotations it handles (`@SupportedAnnotationTypes`), and its `process(annotations, roundEnv)` method receives the annotated elements of each round. It can report errors and warnings through `Messager` and create new files through `Filer`. It's registered in `META-INF/services/javax.annotation.processing.Processor` or named with `-processor`.",
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
              question: "How does Spring find @Service classes and @GetMapping methods?",
              answer:
                "Component scanning reads class files on the class path (with ASM, without loading them) and checks for annotations that are, directly or through meta-annotations, `@Component`; `@Service` is meta-annotated with `@Component`. For web mappings, `RequestMappingHandlerMapping` uses reflection on each controller bean once at startup, merges `@GetMapping` with its meta-annotation `@RequestMapping`, and builds a table of handler methods. Requests are then matched against that table, not against annotations. My `MetaAnnotations` and `MiniRouter` examples are small versions of both steps.",
            },
            {
              question: "What are rounds in annotation processing?",
              answer:
                "javac calls processors repeatedly. Round 1 processes the original sources. If any processor generated new source files, javac parses them and runs another round with them as input. When a round produces nothing new, there's a final round with `processingOver() == true`. `-XprintRounds` showed three rounds for my processor: 4 input files with `@Command`, then the generated `CommandRegistry`, then an empty last round. Processors keep state in fields because the same instance is called each round.",
            },
            {
              question: "How does a processor fail the build?",
              answer:
                "By calling `processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR, message, element)`. javac reports it at the element's source position, finishes processing, and then stops without writing class files. Throwing an exception from `process` also fails the build, but with a stack trace instead of a useful message. My processor reported \"@Command class RefundCommand needs a public no-arg constructor\" at `RefundCommand.java:4`.",
            },
            {
              question: "Why should reflective lookups be cached?",
              answer:
                "Because they repeat work and allocate. I measured `getAnnotation` on a cached `Method` at 7 ns and 0 bytes, but `getMethod` plus `getAnnotation` at about 65 ns and 136 bytes (a new `Method` copy per call), a full `getMethods()` scan at 355 ns and 1,216 bytes, and `getParameterAnnotations()` at about 1 µs and 1,024 bytes because it re-parses the class file bytes on every call. A table built once answered in 15 ns with no allocation.",
            },
            {
              question: "Why are annotations on interface methods not found on the implementation?",
              answer:
                "`@Inherited` only works for class annotations through `extends`, and `Method.getAnnotation` only looks at that exact method. So `@Transactional` on `RefundService.refund` isn't visible on `RefundServiceImpl.refund` (my test returned `null`). Frameworks search interfaces and superclass methods themselves; Spring's `AnnotationUtils.findAnnotation` does. A JDK dynamic proxy happens to receive the interface's `Method`, so annotations there work in that case.",
            },
            {
              question: "Do you need -parameters to read parameter annotations?",
              answer:
                "No. Parameter annotations are stored in `RuntimeVisibleParameterAnnotations` regardless. `-parameters` adds the `MethodParameters` attribute with parameter **names**; without it, `Parameter.getName()` returns `arg0`, `arg1`. That's why frameworks either require `-parameters` or take names in the annotation (`@PathVariable(\"id\")`).",
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
              question: "How does Lombok work, and how is it different from MapStruct?",
              answer:
                "Lombok registers as an annotation processor, then uses javac's internal APIs (`JavacProcessingEnvironment`, the `JCTree` AST) to add methods to the class being compiled. When I compiled a Lombok `@Getter @ToString` class, `javap` showed `getId()`, `getFarePaise()` and `toString()` that weren't in the source, marked `@lombok.Generated` with `CLASS` retention. MapStruct only uses the public API: the `Filer` generates a new `XxxMapperImpl` class. The public API can't modify existing classes (my attempt got `FilerException: Attempt to recreate a file for type Trip`), so Lombok depends on compiler internals and must be upgraded with each JDK, while MapStruct doesn't.",
            },
            {
              question: "What changed about annotation processor discovery in JDK 21 and 23?",
              answer:
                "By default javac has always discovered processors through `META-INF/services` on the class path when no processor path is given. JDK 21 added `-proc:full` and prints a note when processors are found that way (I reproduced it: \"Annotation processing is enabled because one or more processors were found on the class path. A future release of javac may disable annotation processing...\"). JDK 17.0.21 on the same machine ran it silently. From JDK 23 the default no longer runs class-path processors unless processing is requested with `-processor`, a processor path, or `-proc:full`/`-proc:only`. The fix is to put processors on the processor path.",
            },
            {
              question: "Why does getAnnotationsByType sometimes not return the parent's repeatable annotations?",
              answer:
                "For an `@Inherited` repeatable annotation, the inherited ones are used only when the class has no directly present (or container-wrapped) annotation of that type. My `SouthFareService` had its own `@Zone(\"GARIA\")`, so `getAnnotationsByType(Zone.class)` returned only `GARIA`, while `getAnnotations()` showed both the parent's `@Zones` container and the child's `@Zone`. Merging across the hierarchy has to be done by walking `getSuperclass()` explicitly.",
            },
            {
              question: "What exactly does reflection cache, and what doesn't it?",
              answer:
                "`Class` caches parsed annotations in `annotationData` (with `redefinedCount` so a class redefinition invalidates it). `Method`/`Constructor` copies delegate to their `root` object's cached `declaredAnnotations`, so copies don't re-parse but are still allocated per `getMethod` call. `Parameter` caches its annotations. `getParameterAnnotations()` doesn't cache: `javap -c` on `Executable` shows it calling `parseParameterAnnotations` on the raw bytes every time, which I measured at about 1 µs and 1 KB per call.",
            },
            {
              question: "Why do Micronaut, Quarkus and Dagger prefer compile-time processing?",
              answer:
                "Startup time, memory and native images. A reflective container loads every class, parses every annotation and creates proxies at startup; in my measurement, registering 1,000 routes reflectively took about 100 ms against about 3 ms for generated code, and loaded 1,048 classes against 728. Generated code is also visible to the JIT and to GraalVM's closed-world analysis, while reflection in a native image must be declared in configuration. The cost moves to build time.",
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
              question: "After converting DTOs to records, validation silently stopped for some fields, and a fare of -500 paise got through. How do you find and fix it?",
              answer:
                "Check each constraint annotation's `@Target` against where the validator reads. A `@Target(FIELD)` annotation on a record component is copied only to the field; a validator reading components or accessors finds nothing and reports the object as valid. My rebuild printed `component: false, field: true`. Fix by adding `RECORD_COMPONENT` (and `METHOD`/`PARAMETER` if other readers need them) to the targets. Then add tests that send an invalid value for every constrained property, a startup check comparing field and component annotations, and a domain-level guard against negative fares.",
            },
            {
              question: "A service's p99 latency rose after a teammate added an audit feature that reads @Audit annotations on each request. Profiling shows allocation in getParameterAnnotations. What do you do?",
              answer:
                "`getParameterAnnotations()` re-parses the method's parameter annotations on every call: about 1 µs and 1 KB per call in my measurement, per handler, per request. Move all annotation reading to startup or first use: build a `Map<Method, AuditPlan>` (which parameters to audit, under which names) once, using `Parameter.getAnnotation` or a single `getParameterAnnotations()` call per method, and have the request path only look up the plan. My table lookup cost 15 ns and 0 bytes.",
            },
            {
              question: "A build that used MapStruct starts failing after a JDK upgrade with \"cannot find symbol: TripMapperImpl\". Nothing else changed. What do you check?",
              answer:
                "Whether the processor still runs. If MapStruct was only on the class path, it was discovered implicitly; JDK 21 prints a note about it, and from JDK 23 implicit discovery is off by default, so `TripMapperImpl` is never generated and code referring to it fails. Confirm with `-XprintProcessorInfo` or `-XprintRounds`. Fix by configuring the processor path (`annotationProcessorPaths` in Maven, `annotationProcessor` in Gradle) or, as a stopgap, `-proc:full`.",
            },
            {
              question: "Ops says a maintenance command crashed at run time with NoSuchMethodException: <init>(). How would you make this impossible?",
              answer:
                "The command was instantiated reflectively, and the class had no public no-arg constructor. Move the check to compile time: a processor for `@Command` that inspects each annotated class's constructors with `ElementFilter.constructorsIn` and reports an `ERROR` if none is public and parameterless, plus duplicate-name checks. Better still, generate the command registry with constructor references (`RefundCommand::new`), so a missing constructor is also a plain compile error in the generated code. My `CommandProcessor` failed the build with \"needs a public no-arg constructor\" exactly where the bug was.",
            },
            {
              question: "A @Transactional-like annotation works on most service methods but not when one service method calls another in the same class. Why?",
              answer:
                "The annotation is read by a proxy that wraps the service, as in my `RetryProxy` example. Calls from outside go through the proxy, which reads the annotation and starts the transaction. A call from inside the class (`this.other()`) goes straight to the real object and never reaches the proxy, so the annotation isn't consulted. Options: move the method to another bean, call through the proxy (inject self), or use compile-time weaving (AspectJ), which changes the bytecode instead of wrapping the object.",
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
            "Run `ReadingApis` and compare `getAnnotations()`, `getDeclaredAnnotations()` and `getAnnotationsByType(Zone.class)` for `SouthFareService`.",
            "Compile `ReadingApis` with and without `-parameters` and compare the parameter names.",
            "In `MiniValidator`, change `@Range`'s target to `@Target(ElementType.FIELD)` only, and run it again.",
            "Build `CommandProcessor` and compile the application with the broken `RefundCommand`; then fix it and run `Main refund`.",
            "Add `@Command(\"refund\")` to an interface and to a second class, and compile again.",
            "Package the processor in a jar, put it only on the class path, and compile the application without `-processor`; then with `-proc:none`.",
            "Compile with `-XprintRounds` and match each round to your processor's notes.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `[@Audited, @Zones, @Zone]`, `[@Zone]` and only `@Zone(\"GARIA\")`. Step 2 shows `arg0`, `arg1` without the flag and `zone`, `km` with it. Step 3 drops the `farePaise` and `seats` errors for the record (`[riderId: must not be blank, pickupZone: must not be blank]`) while `DriverSignup`, a class, still reports its age. Step 4 fails with \"@Command class RefundCommand needs a public no-arg constructor\", then prints `refunding up to 50000 paise`. Step 5 reports \"@Command must be on a concrete class\" and \"command \"refund\" is already used by\" another class. Step 6 prints JDK 21's note \"Annotation processing is enabled because one or more processors were found on the class path\" and still generates the registry; with `-proc:none`, `Main` fails because `CommandRegistry` doesn't exist. Step 7 shows three rounds: the four sources, then `CommandRegistry`, then an empty last round.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `RUN TIME      needs @Retention(RUNTIME); reflection on loaded classes
              isAnnotationPresent  getAnnotation  getAnnotationsByType (repeatables)
              getAnnotations = declared + @Inherited (classes, extends only)
              meta-annotations, interface methods: search yourself (Spring does)
              -parameters for names; explicit names in annotations otherwise

COST          first read per JVM ~20 ms; cached getAnnotation ~7 ns
              getMethod copy 136 B; getParameterAnnotations ~1 us, 1 KB (no cache!)
              scan per call 355 ns vs table 15 ns -> scan once, cache

COMPILE TIME  class X extends AbstractProcessor, @SupportedAnnotationTypes
              process(annotations, roundEnv) once per ROUND
              Messager ERROR -> build fails at the element
              Filer -> new files only (FilerException on existing types)
              rounds: sources -> generated sources -> ... -> processingOver
              META-INF/services/javax.annotation.processing.Processor
              javac -processorpath P -processor X -s gen; -XprintRounds

JDK 21        implicit class-path discovery prints a NOTE; -proc:full
JDK 23        class-path processors off by default -> use processor path

LOMBOK        edits javac AST via internal APIs (methods appear in YOUR class)
MAPSTRUCT...  generate NEW classes via Filer (public API only)

STARTUP       1,000 routes: reflection ~100 ms, generated ~3 ms`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Annotations are read in one of two places. At run time, reflection is flexible but must be read once and cached, and it only finds annotations exactly where Java puts them (`@Inherited` classes, propagated record members, containers for repeatables); frameworks add their own searches on top. At compile time, a processor sees the source model in rounds, can fail the build with precise errors, and can generate new code but never change existing classes.",
            "The bugs in both lessons came from annotations that were present in the source and absent where the reader looked: a `CLASS` retention, a `FIELD`-only target on a record. Any annotation that guards money or personal data deserves a test that reads it the way production does.",
            "That completes the Annotations phase. Next comes the JVM Deep Dive: back inside the JVM with everything learned since, covering memory areas, garbage collection, the JIT and tuning.",
          ],
        },
      ],
    },
  ],
};
