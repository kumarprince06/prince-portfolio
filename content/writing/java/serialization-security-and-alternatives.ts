import type { Lesson } from "../types";

export const serializationSecurityAndAlternatives: Lesson = {
  slug: "serialization-security-and-alternatives",
  date: "2026-11-13",
  title: "Serialization Pitfalls, Security and Alternatives",
  description:
    "Why reading untrusted Java-serialized data is dangerous, shown on JDK 21 with harmless self-written gadgets: readObject runs code chosen by the sender before the caller's cast, and a PriorityQueue-based chain calls into a sink. Then the defences: ObjectInputFilter allow-lists and limits (JEP 290) rejecting a class with filter status: REJECTED before it is instantiated, where the filter is called from inside ObjectInputStream, jdk.serialFilter read only at startup, JDK 17's context-specific filter factory (JEP 415), a 5.7 KB nested HashSet bomb stopped by maxdepth, invariants broken by tampered bytes and rogue back-references and restored with defensive copies and the serialization proxy pattern, Externalizable's public readExternal, schema evolution with Jackson, Java serialization measured against Jackson JSON and a hand-written binary format, and a payout service that accepted Java-serialized queue messages until an allow-list and then JSON DTOs closed the hole.",
  tags: ["Core Java", "Serialization", "Security", "JSON"],
  sections: [
    {
      title: "What Unsafe Deserialization Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Java Serialization: How Objects Become Bytes, showed what `readObject` does: it reads a class **name** from the stream, finds that class on the local classpath, allocates an instance without running its constructors, fills its fields with values from the stream, and calls the class's own `readObject` and `readResolve` methods if it has them. All of that happens before the caller's cast, and all of it is driven by the bytes.",
        },
        {
          type: "paragraph",
          text: "That is fine when the bytes came from my own program. It is a serious vulnerability when they came from anyone else: an HTTP request, a cookie, a message queue that other services publish to, a cache that several systems write. The sender chooses **which classes** get instantiated (any serializable class on the receiver's classpath, including every library JAR) and **every field value**. If some class's `readObject` does something with its fields (calls a method on them, opens a file, compares them, hashes them), the sender can make the receiver run that code with arguments of their choosing. Chains of such classes, called **gadget chains**, have turned deserialization into remote code execution in application servers, CI systems and frameworks.",
        },
        {
          type: "paragraph",
          text: "This lesson shows the mechanism with harmless classes I wrote myself (no real exploit payloads), then the defences: `ObjectInputFilter` allow-lists and limits (JEP 290), JDK 17's filter factory (JEP 415), deserialization bombs and how limits stop them, invariants that deserialization bypasses and the serialization proxy pattern that restores them, and finally the alternatives: JSON with explicit DTOs and hand-written binary formats, measured against Java serialization for size and speed.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "For almost twenty years Java serialization was treated as a convenience with a performance cost. The security problem was understood by a few people but became mainstream in 2015, when researchers showed that ordinary libraries on almost every enterprise classpath contained classes that could be chained into code execution, and that many products deserialized untrusted input without a second thought.",
        },
        {
          type: "table",
          headers: ["Year", "Event", "Why it matters here"],
          rows: [
            ["1997", "Serialization in JDK 1.1, designed for RMI between trusted JVMs", "No notion of an untrusted stream"],
            ["2015 (January)", "Chris Frohoff and Gabriel Lawrence present \"Marshalling Pickles\" and release ysoserial, a gadget-chain catalogue", "Gadget chains in common libraries (Apache Commons Collections and others)"],
            ["2015 (November)", "FoxGlove Security shows exploits against WebLogic, WebSphere, JBoss, Jenkins and OpenNMS", "Industry-wide patching; serialization endpoints become a top finding"],
            ["2015 to 2016", "Commons Collections 3.2.2 and 4.1 stop serializing the dangerous transformer classes by default", "Libraries remove gadgets one at a time (a deny-list race)"],
            ["2017 (Java 9, 8u121)", "JEP 290: `ObjectInputFilter`, `jdk.serialFilter`, built-in filters for RMI", "Allow-lists and limits inside the JDK"],
            ["2018", "Mark Reinhold, the platform's chief architect, publicly calls serialization a \"horrible mistake\" and links a large share of Java vulnerabilities to it", "Official guidance: avoid it for untrusted data"],
            ["2019 (Jackson 2.10)", "`PolymorphicTypeValidator`; `enableDefaultTyping` deprecated", "The same class-name-from-input problem exists in JSON libraries"],
            ["2021 (Java 17)", "JEP 415: context-specific filters, filter factory, `allowFilter`/`rejectFilter`/`merge`", "Different filters for different streams in one JVM"],
          ],
        },
        {
          type: "paragraph",
          text: "Oracle's Secure Coding Guidelines for Java put it plainly: deserialization of untrusted data is inherently dangerous and should be avoided. Filters reduce the risk for code that can't avoid it; they don't make Java serialization a safe interchange format.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a warehouse that receives parcels with assembly instructions inside.",
        },
        {
          type: "list",
          items: [
            "**Java deserialization** is a warehouse that opens every parcel and follows the instructions on the label: \"assemble a CacheWarmer, set its path to X, then run its start-up routine\". The routines belong to machines already on the warehouse floor (classes on the classpath), but the parcel picks which machine and with which settings.",
            "**A gadget** is a machine whose start-up routine does something useful in its normal job, like \"re-create my temp file\" or \"sort my contents with my comparator\". A **gadget chain** is a parcel that sets up several machines so that starting the first one starts the next, and the last one does something nobody intended.",
            "**`ObjectInputFilter`** is a guard at the door with a list of allowed parcel types and size limits. A parcel that isn't on the list is refused before it's opened, so no machine starts.",
            "**A deserialization bomb** is a parcel of a few kilobytes whose instructions say \"for each box inside, check both of its boxes\" a hundred levels deep: small to ship, impossible to finish unpacking.",
            "**JSON with explicit DTOs** is a paper form: the warehouse reads values into its own forms, and nothing in the parcel can name a machine to start.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a guard checks labels, not intentions. If the allow-list includes a type whose start-up routine is dangerous, the guard lets it in. That's why allow-lists must be short and made of my own plain data classes, and why the best guard is not to accept instruction-carrying parcels from strangers at all.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "What can go wrong when reading untrusted bytes",
        },
        {
          type: "table",
          headers: ["Risk", "Mechanism", "Shown in"],
          rows: [
            ["Code execution", "`readObject`/`readResolve`/`hashCode`/`compare` of sender-chosen classes run with sender-chosen fields", "`GadgetDemo`, `ChainDemo`"],
            ["Denial of service", "Tiny streams that expand into huge work (nested `HashSet`s) or huge arrays", "`SetBomb`"],
            ["Broken invariants", "Constructors and their validation never run; tampered fields are accepted", "`ProxyPattern`, previous lesson's `RecordSer`"],
            ["Stolen internal references", "Extra back-references in the stream point at an object's private mutable parts", "`RogueReference`"],
            ["Mutable \"immutable\" objects", "`Externalizable.readExternal` is public and can be called again", "`ExternalizableHole`"],
          ],
        },
        {
          type: "heading",
          text: "The filter API (java.io.ObjectInputFilter)",
        },
        {
          type: "table",
          headers: ["API", "Since", "What it does"],
          rows: [
            ["`ObjectInputFilter.checkInput(FilterInfo)`", "9", "Returns `ALLOWED`, `REJECTED` or `UNDECIDED` for each class, array, reference and depth step"],
            ["`FilterInfo`", "9", "`serialClass()`, `arrayLength()`, `depth()`, `references()`, `streamBytes()`"],
            ["`ObjectInputStream.setObjectInputFilter(f)`", "9", "Filter for one stream; before the first read, and only once"],
            ["`Config.createFilter(\"pattern;...\")`", "9", "Pattern filter: limits, class names, `pkg.*`, `pkg.**`, `module/pkg.*`, `!` to reject"],
            ["`-Djdk.serialFilter=...` / `java.security`", "9", "JVM-wide filter, read once at startup"],
            ["`Config.setSerialFilterFactory(BinaryOperator)`", "17", "Chooses the filter for every new stream; settable once"],
            ["`-Djdk.serialFilterFactory=<class>`", "17", "Factory class named at startup"],
            ["`allowFilter`, `rejectFilter`, `merge`, `rejectUndecidedClass`", "17", "Building blocks for combining filters"],
          ],
        },
        {
          type: "paragraph",
          text: "A pattern filter's limits (`maxdepth`, `maxrefs`, `maxbytes`, `maxarray`) are checked before its class patterns, whatever their order in the string, and exceeding any limit rejects. Class patterns are matched left to right and the first match wins; whitespace is significant. A final `!*` turns an allow-list into \"everything else is rejected\". Without it, unmatched classes are `UNDECIDED`, which the stream treats as allowed.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Code runs before the cast",
        },
        {
          type: "code",
          language: "java",
          title: "BeforeTheCast.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class BeforeTheCast {
    record TripRequest(String riderId) implements Serializable { }

    static class Surprise implements Serializable {
        private static final long serialVersionUID = 1L;
        private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
            in.defaultReadObject();
            StackWalker.getInstance().forEach(f -> System.out.println("  at " + f));
        }
    }

    public static void main(String[] args) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(new Surprise()); }
        ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray()));
        try {
            TripRequest r = (TripRequest) in.readObject();          // the cast comes last
        } catch (ClassCastException e) {
            System.out.println("then: ClassCastException");
        }
    }
}`,
        },
        {
          type: "output",
          text: `  at BeforeTheCast$Surprise.readObject(BeforeTheCast.java:15)
  at java.base/java.io.ObjectStreamClass.invokeReadObject(ObjectStreamClass.java:1102)
  at java.base/java.io.ObjectInputStream.readSerialData(ObjectInputStream.java:2444)
  at java.base/java.io.ObjectInputStream.readOrdinaryObject(ObjectInputStream.java:2284)
  at java.base/java.io.ObjectInputStream.readObject0(ObjectInputStream.java:1762)
  at java.base/java.io.ObjectInputStream.readObject(ObjectInputStream.java:540)
  at java.base/java.io.ObjectInputStream.readObject(ObjectInputStream.java:498)
  at BeforeTheCast.main(BeforeTheCast.java:24)
then: ClassCastException`,
        },
        {
          type: "list",
          items: [
            "The stack inside `Surprise.readObject` is `main` → `ObjectInputStream.readObject` → `readObject0` → `readOrdinaryObject` → `readSerialData` → `ObjectStreamClass.invokeReadObject` → the class's own method. (`StackWalker` hides the reflection frames; with `SHOW_REFLECT_FRAMES` a `DirectMethodHandleAccessor.invoke` and `Method.invoke` appear between the last two.)",
            "The cast `(TripRequest)` is compiled into `main`, after `readObject` returns. By the time it throws `ClassCastException`, the whole graph has been built and every `readObject` in it has run. **The declared type in my code protects nothing.** This is the single most important fact about deserialization security.",
            "Which class is created is decided in `readClassDesc` → `readNonProxyDesc` → `resolveClass`, which calls `Class.forName(name, false, loader)` with the name from the stream. Any serializable class visible to that class loader is a candidate: application classes, every library JAR, and the JDK itself.",
          ],
        },
        {
          type: "image",
          src: "/images/java/serialization-security-and-alternatives-filter-checkpoints.svg",
          alt: "Eight steps of ObjectInputStream.readObject on JDK 21 in two rows. Row one: 1, bytes arrive from an HTTP body, queue message, cache entry or file, and the sender chose every byte; 2, readClassDesc reads the class name from the stream and resolveClass calls Class.forName, so any class on the classpath can be named; 3, highlighted in orange, filterCheck(class) calls ObjectInputFilter.checkInput with the class, array length, depth, references and stream bytes; 4, allocate if allowed, running only the no-arg constructor of the first non-serializable superclass. Row two: 5, readSerialData reads field values superclass first, and nested objects recurse back to step 2 and are filtered again; 6, highlighted, readObject hooks: invokeReadObject runs the class's own code on values the sender chose, which is where gadgets live; 7, readResolve, the optional swap for singletons and serialization proxies, plus validateObject callbacks; 8, your cast, (TripRequest) in.readObject(), where a ClassCastException is too late because step 6 already ran. Bottom left: rejected at step 3 gives java.io.InvalidClassException: filter status: REJECTED, thrown before step 4, so there is no instance, no readObject and no side effect; arrays are also checked (readArray, and checkArray from ArrayList, HashMap and List.of) and back-references (readHandle), but strings are not. Bottom right: which filter is used: Java 9 JEP 290 per-stream setObjectInputFilter and the JVM-wide jdk.serialFilter or java.security; Java 17 JEP 415 filter factory, set once, asked on every new stream and every setObjectInputFilter call, which can merge per-context filters with the JVM-wide one. Footer: allow-list what you expect and end with !*; a deny-list only blocks the gadgets someone already found.",
          caption: "The filter is consulted after the class name is known and before anything is created; readObject code runs only for what it allowed.",
        },
        {
          type: "heading",
          text: "Where the filter is called from",
        },
        {
          type: "code",
          language: "java",
          title: "WhereFiltered.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class WhereFiltered {
    static class Shift implements Serializable {
        private static final long serialVersionUID = 1L;
        String driverId = "D-104233";
        long[] faresPaise = {14_500, 8_000};
        List<String> zones = new ArrayList<>(List.of("SALT-LAKE", "NEW-TOWN"));
        Shift self = this;                                        // a back-reference
    }

    public static void main(String[] args) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(new Shift()); }

        ObjectInputFilter spy = info -> {
            // the two JDK frames just above filterCheck: who asked?
            String callers = StackWalker.getInstance().walk(s -> s
                    .dropWhile(f -> !f.getMethodName().equals("filterCheck")).skip(1).limit(2)
                    .map(f -> f.getClassName().replace("java.io.", "") + "." + f.getMethodName())
                    .collect(Collectors.joining(" <- ")));
            System.out.printf("%-22s len=%-2d depth=%d refs=%d  from %s%n",
                    info.serialClass() == null ? "(no class)" : info.serialClass().getSimpleName(),
                    info.arrayLength(), info.depth(), info.references(), callers);
            return ObjectInputFilter.Status.UNDECIDED;
        };
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray()))) {
            in.setObjectInputFilter(spy);
            in.readObject();
        }
    }
}`,
        },
        {
          type: "output",
          text: `Shift                  len=-1 depth=1 refs=1  from ObjectInputStream.readNonProxyDesc <- ObjectInputStream.readClassDesc
long[]                 len=-1 depth=2 refs=4  from ObjectInputStream.readNonProxyDesc <- ObjectInputStream.readClassDesc
long[]                 len=2  depth=2 refs=5  from ObjectInputStream.readArray <- ObjectInputStream.readObject0
(no class)             len=-1 depth=2 refs=6  from ObjectInputStream.readHandle <- ObjectInputStream.readObject0
ArrayList              len=-1 depth=2 refs=7  from ObjectInputStream.readNonProxyDesc <- ObjectInputStream.readClassDesc
Object[]               len=2  depth=2 refs=8  from ObjectInputStream.checkArray <- java.util.ArrayList.readObject`,
        },
        {
          type: "list",
          items: [
            "**Class descriptors**: `readNonProxyDesc` calls the filter once per new class, right after resolving it and before any instance exists (the `Shift` and `long[]` rows). A rejection here means the object is never allocated.",
            "**Arrays**: `readArray` calls it with the length before allocating (`long[] len=2`). So `maxarray` stops a stream that claims a two-billion-element array before the allocation.",
            "**Back-references**: `readHandle` calls it with no class (`(no class)`, the `self` field pointing back at the `Shift`), so `maxrefs` and `maxdepth` are enforced even for references.",
            "**Collections' internal arrays**: `ArrayList.readObject` calls `checkArray` (through `SharedSecrets`) before allocating its `Object[]`. `HashMap` checks a `Map.Entry[]`, and `List.of` collections (serialized through `java.util.CollSer`) check an `Object[]`. A strict allow-list therefore needs `java.lang.Object` or `java.util.Map$Entry` for those array checks, which surprised me the first time a filter rejected an ordinary `List.of`.",
            "**Strings are never passed to the filter**: there's no row for `D-104233` or the zone names. They can't run code, and they're limited by `maxbytes` like everything else.",
            "`depth` is the nesting of `readObject0` calls, `refs` the number of handles assigned so far, and the stream byte count comes from the underlying stream's position.",
          ],
        },
        {
          type: "heading",
          text: "How the JVM-wide filter is configured",
        },
        {
          type: "code",
          language: "java",
          title: "GlobalFilter.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InvalidClassException;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class GlobalFilter {
    record Fare(long paise, String zone) implements Serializable { }

    static class TempFileJanitor implements Serializable {
        private static final long serialVersionUID = 1L;
        private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
            in.defaultReadObject();
            System.out.println("  !! TempFileJanitor.readObject ran");
        }
    }

    static Object roundTrip(Object o) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        // no setObjectInputFilter here: library code that knows nothing about filters
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray()))) {
            return in.readObject();
        }
    }

    public static void main(String[] args) throws Exception {
        System.out.println("JVM-wide filter: " + ObjectInputFilter.Config.getSerialFilter());
        System.out.println(roundTrip(new Fare(14_500, "SALT-LAKE")));
        try {
            System.out.println(roundTrip(new TempFileJanitor()).getClass().getSimpleName() + " was read");
        } catch (InvalidClassException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac GlobalFilter.java && java GlobalFilter
java '-Djdk.serialFilter=GlobalFilter$Fare;java.base/*;!*' GlobalFilter`,
        },
        {
          type: "output",
          text: `JVM-wide filter: null
Fare[paise=14500, zone=SALT-LAKE]
  !! TempFileJanitor.readObject ran
TempFileJanitor was read

JVM-wide filter: GlobalFilter$Fare;java.base/*;!*
Fare[paise=14500, zone=SALT-LAKE]
filter status: REJECTED`,
        },
        {
          type: "list",
          items: [
            "Without configuration there is **no JVM-wide filter** (`null`), and the unexpected class was read and its `readObject` ran.",
            "With `-Djdk.serialFilter`, every `ObjectInputStream` in the JVM gets the filter, including streams created inside libraries that know nothing about filters. That's its value: it covers code I don't control. `java.base/*` allows classes from the `java.base` module, which is broad (the JDK has had gadgets too); here it's only to show the syntax.",
            "The same pattern can go in `$JAVA_HOME/conf/security/java.security` as `jdk.serialFilter`; the system property wins if both are set.",
            "**It's read once.** I tried `System.setProperty(\"jdk.serialFilter\", \"maxdepth=3\")` as the first line of `main`, before any serialization, and `Config.getSerialFilter()` still returned `null`: the configuration is captured at JVM startup. It has to be on the command line or in `java.security`.",
          ],
        },
        {
          type: "paragraph",
          text: "The JDK logs filter decisions through the `java.io.serialization` system logger, which with `java.util.logging` set to `FINE` shows what was rejected and why:",
        },
        {
          type: "code",
          language: "bash",
          code: `# log.properties: handlers=java.util.logging.ConsoleHandler, ConsoleHandler.level=ALL, java.io.serialization.level=FINE
java -Djava.util.logging.config.file=log.properties '-Djdk.serialFilter=GlobalFilter$Fare;java.base/*;!*' GlobalFilter`,
        },
        {
          type: "output",
          text: `Nov 13, 2026 10:15:21 PM java.io.ObjectInputFilter$Config <clinit>
FINE: Creating deserialization filter from GlobalFilter$Fare;java.base/*;!*
JVM-wide filter: GlobalFilter$Fare;java.base/*;!*
Fare[paise=14500, zone=SALT-LAKE]
Nov 13, 2026 10:15:21 PM java.io.ObjectInputStream filterCheck
FINE: ObjectInputFilter REJECTED: class GlobalFilter$TempFileJanitor, array length: -1, nRefs: 1, depth: 1, bytes: 47, ex: n/a
filter status: REJECTED`,
        },
        {
          type: "paragraph",
          text: "The exception message only says `filter status: REJECTED`; the log line names the class, depth, reference count and bytes. In production I'd route that logger to the normal logging system and alert on it, because a rejection is either a bug in the allow-list or someone probing.",
        },
      ],
    },
    {
      title: "Gadgets: readObject Runs Code",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "GadgetDemo.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;

public class GadgetDemo {
    // What the endpoint expects
    record TripRequest(String riderId, String pickupZone) implements Serializable { }

    // Some other class that happens to be on the classpath, written for a different purpose:
    // after deserialization it "re-creates its temp file". It is harmless here, but it acts on its fields.
    static class TempFileJanitor implements Serializable {
        private static final long serialVersionUID = 1L;
        String path;
        String content;
        private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
            in.defaultReadObject();
            System.out.println("  TempFileJanitor.readObject is running, writing " + path);
            Files.writeString(Path.of(path), content);
        }
    }

    // The vulnerable endpoint: reads whatever arrives, then casts
    static TripRequest handle(byte[] body) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(body))) {
            return (TripRequest) in.readObject();
        }
    }

    static byte[] serialize(Object o) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    public static void main(String[] args) throws Exception {
        System.out.println("honest client: " + handle(serialize(new TripRequest("R-1", "SALT-LAKE"))));

        // The "attacker" picks the class and every field value
        TempFileJanitor evil = new TempFileJanitor();
        evil.path = "attacker-chose-this.txt";
        evil.content = "attacker-chose-this-too";
        try {
            handle(serialize(evil));
        } catch (ClassCastException e) {
            System.out.println("ClassCastException, but too late");
        }
        System.out.println("file exists now? " + Files.exists(Path.of("attacker-chose-this.txt"))
                + ", content: " + Files.readString(Path.of("attacker-chose-this.txt")));
        Files.delete(Path.of("attacker-chose-this.txt"));
    }
}`,
        },
        {
          type: "output",
          text: `honest client: TripRequest[riderId=R-1, pickupZone=SALT-LAKE]
  TempFileJanitor.readObject is running, writing attacker-chose-this.txt
ClassCastException, but too late
file exists now? true, content: attacker-chose-this-too`,
        },
        {
          type: "list",
          items: [
            "`TempFileJanitor` is an ordinary class with a plausible `readObject`: after being restored, re-create my file. Nothing about it is malicious, and it isn't related to `TripRequest` at all; it just happens to be on the classpath.",
            "The endpoint expects a `TripRequest`. The sender sent a `TempFileJanitor` with a path and content of their choice. `readObject` instantiated it and ran its `readObject`, which wrote the file. Then the cast failed. The file exists: the side effect happened on the receiver, chosen by the sender.",
            "Real gadgets are rarely this direct. They're found in widely used libraries, and the dangerous behaviour is usually reached indirectly: a `readObject` that calls `hashCode`, `equals`, `compareTo`, `toString` or an interface method on a field whose type the sender also picks.",
          ],
        },
        {
          type: "heading",
          text: "A harmless chain",
        },
        {
          type: "code",
          language: "java",
          title: "ChainDemo.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.Comparator;
import java.util.PriorityQueue;

public class ChainDemo {
    // Link 2: an innocent-looking Serializable comparator that calls something on its field
    static class ByLabel implements Comparator<Object>, Serializable {
        private static final long serialVersionUID = 1L;
        Labeler labeler;
        public int compare(Object a, Object b) { return labeler.label(a).compareTo(labeler.label(b)); }
    }

    interface Labeler { String label(Object o); }

    // Link 3: the "sink", any Serializable Labeler whose label() has a side effect
    static class AuditLabeler implements Labeler, Serializable {
        private static final long serialVersionUID = 1L;
        public String label(Object o) {
            System.out.println("  AuditLabeler.label(" + o + ") called during readObject");
            return String.valueOf(o);
        }
    }

    public static void main(String[] args) throws Exception {
        ByLabel cmp = new ByLabel();
        cmp.labeler = String::valueOf;                          // harmless while building
        PriorityQueue<Object> queue = new PriorityQueue<>(cmp);
        queue.add("B"); queue.add("A"); queue.add("C");
        cmp.labeler = new AuditLabeler();                       // swap in the sink before sending

        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(queue); }

        System.out.println("receiver calls readObject():");
        // Link 1: PriorityQueue.readObject re-heapifies, which calls comparator.compare
        Object o = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray())).readObject();
        System.out.println("receiver got a " + o.getClass().getSimpleName() + ", but code already ran");
    }
}`,
        },
        {
          type: "output",
          text: `receiver calls readObject():
  AuditLabeler.label(B) called during readObject
  AuditLabeler.label(C) called during readObject
  AuditLabeler.label(A) called during readObject
  AuditLabeler.label(B) called during readObject
receiver got a PriorityQueue, but code already ran`,
        },
        {
          type: "list",
          items: [
            "**Link 1** is a JDK class: `PriorityQueue.readObject` reads its elements and then re-establishes the heap order, which calls its comparator. That's correct behaviour, and it means \"deserializing a `PriorityQueue` calls `compare` on whatever comparator the stream contains\".",
            "**Link 2** is an innocent serializable comparator that calls a method on its own field.",
            "**Link 3**, the sink, is any serializable implementation of that field's interface whose method has a side effect. Mine only prints. In a real chain, the sink is a class that invokes methods by name, loads classes, or evaluates expressions.",
            "None of the three classes is buggy in isolation. The vulnerability is the combination, chosen by the sender, which is why patching individual gadgets (a deny-list) is an endless race, and why the effective defence is not letting arbitrary classes be deserialized at all: an allow-list.",
          ],
        },
      ],
    },
    {
      title: "ObjectInputFilter: Allow-Lists and Limits",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "FilterDemo.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InvalidClassException;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class FilterDemo {
    record TripRequest(String riderId, String pickupZone, List<String> stops) implements Serializable { }

    static class TempFileJanitor implements Serializable {
        private static final long serialVersionUID = 1L;
        String path = "x.txt";
        private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
            in.defaultReadObject();
            System.out.println("  !! TempFileJanitor.readObject ran");
        }
    }

    static byte[] serialize(Object o) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    static Object read(byte[] data, ObjectInputFilter filter) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) {
            in.setObjectInputFilter(filter);
            return in.readObject();
        }
    }

    public static void main(String[] args) throws Exception {
        // Allow exactly what the endpoint needs, reject everything else (!*), plus limits
        ObjectInputFilter allow = ObjectInputFilter.Config.createFilter(
                "maxdepth=5;maxrefs=100;maxbytes=4096;maxarray=64;"
                + "FilterDemo$TripRequest;java.util.ImmutableCollections$*;java.util.CollSer;java.lang.String;java.lang.Object;!*");

        byte[] good = serialize(new TripRequest("R-1", "SALT-LAKE", List.of("SECTOR-V")));
        System.out.println("allowed:  " + read(good, allow));

        try {
            read(serialize(new TempFileJanitor()), allow);
        } catch (InvalidClassException e) {
            System.out.println("rejected: " + e);
        }

        List<String> many = new ArrayList<>();
        for (int i = 0; i < 100; i++) many.add("STOP-" + i);
        try {
            read(serialize(new TripRequest("R-2", "NEW-TOWN", List.copyOf(many))), allow);
        } catch (InvalidClassException e) {
            System.out.println("rejected: " + e);
        }

        // What the filter is asked: one callback per class, array, reference and depth step
        ObjectInputFilter spy = info -> {
            System.out.printf("  class=%-40s array=%-3d depth=%d refs=%-2d bytes=%d%n",
                    info.serialClass() == null ? "-" : info.serialClass().getName(),
                    info.arrayLength(), info.depth(), info.references(), info.streamBytes());
            return allow.checkInput(info);
        };
        System.out.println("spy on the good request:");
        read(good, spy);
    }
}`,
        },
        {
          type: "output",
          text: `allowed:  TripRequest[riderId=R-1, pickupZone=SALT-LAKE, stops=[SECTOR-V]]
rejected: java.io.InvalidClassException: filter status: REJECTED
rejected: java.io.InvalidClassException: filter status: REJECTED
spy on the good request:
  class=-                                        array=-1  depth=1 refs=1  bytes=90
  class=FilterDemo$TripRequest                   array=-1  depth=1 refs=1  bytes=117
  class=java.util.CollSer                        array=-1  depth=2 refs=5  bytes=175
  class=[Ljava.lang.Object;                      array=1   depth=2 refs=6  bytes=187
  class=java.util.ImmutableCollections$List12    array=-1  depth=2 refs=7  bytes=199`,
        },
        {
          type: "list",
          items: [
            "The filter `maxdepth=5;maxrefs=100;maxbytes=4096;maxarray=64;FilterDemo$TripRequest;java.util.ImmutableCollections$*;java.util.CollSer;java.lang.String;java.lang.Object;!*` allows exactly what a trip request contains and ends with `!*`.",
            "The genuine request passed. `TempFileJanitor` was rejected with `InvalidClassException: filter status: REJECTED`, and its `readObject` **did not run**: no `!!` line. The filter is checked when the class descriptor is read, before any instance exists.",
            "The request with 100 stops was rejected too, by `maxarray=64`: `CollSer` asked to allocate an `Object[100]`. The message doesn't say which rule failed; the log line does.",
            "The spy filter shows what the filter sees for the good request: a call with no class first (a back-reference to the repeated type string `Ljava/lang/String;` in `TripRequest`'s descriptor, checked only for limits), then the record class, then `CollSer`, its `Object[]` with length 1, and the actual list class `ImmutableCollections$List12`.",
            "I needed `java.lang.Object` in the list because of that `Object[]` check; without it, the genuine request was rejected. An allow-list has to be tested against real messages, and its rejections logged.",
          ],
        },
        {
          type: "heading",
          text: "Writing the allow-list",
        },
        {
          type: "list",
          items: [
            "**Allow, don't deny.** `!com.example.Bad` blocks one known gadget; `com.ridehail.events.*;!*` blocks everything not explicitly expected, including gadgets nobody has discovered yet.",
            "**Keep it to plain data classes**, ideally records and simple value types, and avoid broad patterns like `java.**` or `java.base/*`. Every allowed class is attack surface.",
            "**Always set limits.** Even allowed classes can be abused for denial of service: `maxbytes` bounds the input, `maxarray` bounds allocations, `maxdepth` and `maxrefs` bound graph shape.",
            "**Set it before the first read.** `setObjectInputFilter` throws `IllegalStateException` after the stream has started reading, and a second call fails with \"filter can not be set more than once\".",
          ],
        },
      ],
    },
    {
      title: "Context-Specific Filters with a Filter Factory (JDK 17)",
      blocks: [
        {
          type: "paragraph",
          text: "A JVM-wide pattern is one size for all streams, but a real application reads different things in different places: session data here, a framework's state there. JEP 415 added a **filter factory**: a `BinaryOperator<ObjectInputFilter>` set once per JVM that decides the filter for **every** stream. It's called with `(null, jvmWideFilter)` when an `ObjectInputStream` is constructed, and again with `(currentFilter, requestedFilter)` whenever code calls `setObjectInputFilter`, so it can combine filters instead of letting the last one win.",
        },
        {
          type: "code",
          language: "java",
          title: "FilterFactory.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InvalidClassException;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.function.BinaryOperator;

public class FilterFactory {
    record Fare(long paise, String zone) implements Serializable { }
    record DriverNote(String text) implements Serializable { }

    // Which filter the current thread wants, set by the code that knows the context
    static final ThreadLocal<ObjectInputFilter> CONTEXT = new ThreadLocal<>();

    static Object roundTrip(Object o) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray()))) {
            return in.readObject();
        }
    }

    static Object readInContext(ObjectInputFilter filter, Object o) throws Exception {
        CONTEXT.set(filter);
        try { return roundTrip(o); } finally { CONTEXT.remove(); }
    }

    public static void main(String[] args) throws Exception {
        ObjectInputFilter baseline = ObjectInputFilter.Config.createFilter("maxdepth=20;maxbytes=65536");

        BinaryOperator<ObjectInputFilter> factory = (current, requested) -> {
            System.out.println("  factory(current=" + current + ", requested=" + requested + ")");
            if (current == null) {
                // From the stream constructor: requested is the JVM-wide filter (jdk.serialFilter), maybe null
                ObjectInputFilter base = requested == null ? baseline : ObjectInputFilter.merge(requested, baseline);
                ObjectInputFilter ctx = CONTEXT.get();
                if (ctx == null) return base;
                // context filter first, then the baseline; a class nobody allowed is rejected
                return ObjectInputFilter.rejectUndecidedClass(ObjectInputFilter.merge(ctx, base));
            }
            return ObjectInputFilter.merge(requested, current);   // from setObjectInputFilter: keep both
        };
        ObjectInputFilter.Config.setSerialFilterFactory(factory);

        ObjectInputFilter faresOnly = ObjectInputFilter.allowFilter(
                c -> c == Fare.class, ObjectInputFilter.Status.UNDECIDED);

        System.out.println("fares context, a Fare:");
        System.out.println("  -> " + readInContext(faresOnly, new Fare(14_500, "SALT-LAKE")));
        System.out.println("fares context, a DriverNote:");
        try {
            readInContext(faresOnly, new DriverNote("call on arrival"));
        } catch (InvalidClassException e) {
            System.out.println("  -> " + e.getMessage());
        }
        System.out.println("no context, a DriverNote:");
        System.out.println("  -> " + roundTrip(new DriverNote("call on arrival")));
        System.out.println("a stream that also calls setObjectInputFilter:");
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(new Fare(9_000, "HOWRAH")); }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray()))) {
            in.setObjectInputFilter(ObjectInputFilter.Config.createFilter("maxrefs=10"));
            System.out.println("  -> " + in.readObject());
        }
        try {
            ObjectInputFilter.Config.setSerialFilterFactory(factory);
        } catch (IllegalStateException e) {
            System.out.println("setting the factory again: " + e.getMessage().substring(0, e.getMessage().indexOf(':')));
        }
    }
}`,
        },
        {
          type: "output",
          text: `fares context, a Fare:
  factory(current=null, requested=null)
  -> Fare[paise=14500, zone=SALT-LAKE]
fares context, a DriverNote:
  factory(current=null, requested=null)
  -> filter status: REJECTED
no context, a DriverNote:
  factory(current=null, requested=null)
  -> DriverNote[text=call on arrival]
a stream that also calls setObjectInputFilter:
  factory(current=null, requested=null)
  factory(current=maxdepth=20;maxbytes=65536, requested=maxrefs=10)
  -> Fare[paise=9000, zone=HOWRAH]
setting the factory again: Cannot replace filter factory`,
        },
        {
          type: "list",
          items: [
            "The factory reads a `ThreadLocal` set by the code that knows the context (here `readInContext`, in a real service maybe a request handler or a message-listener wrapper). In the \"fares\" context it returns `rejectUndecidedClass(merge(faresOnly, baseline))`: the context's allow-list, the baseline limits, and **reject anything nobody explicitly allowed**.",
            "So the `DriverNote` was rejected in the fares context and allowed with no context, where only the baseline limits apply. The same JVM, two policies, chosen per stream.",
            "When code also calls `setObjectInputFilter`, the factory is called a second time with the current filter (`maxdepth=20;maxbytes=65536`) and the requested one (`maxrefs=10`), and mine merges them. With the default built-in factory, `setObjectInputFilter` simply installs the requested filter, and a second call on the same stream fails with `IllegalStateException: filter can not be set more than once` (I checked, with and without a JVM-wide filter).",
            "`merge(a, b)` returns `REJECTED` if either rejects, `ALLOWED` if either allows and neither rejects, otherwise `UNDECIDED`. `rejectUndecidedClass` turns `UNDECIDED` for a class into `REJECTED`, which is what makes an allow-list strict.",
            "The factory can be set only once (`Cannot replace filter factory`), and can also be named at startup with `-Djdk.serialFilterFactory=<class>`. Setting it is a security decision for the whole application, usually done at the very start of `main`.",
          ],
        },
      ],
    },
    {
      title: "Deserialization Bombs",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "SetBomb.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InvalidClassException;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.util.HashSet;
import java.util.Set;

public class SetBomb {
    // Each level holds two sets, and both appear in the next level too
    static Set<Object> bomb(int levels) {
        Set<Object> root = new HashSet<>();
        Set<Object> s1 = root, s2 = new HashSet<>();
        for (int i = 0; i < levels; i++) {
            Set<Object> t1 = new HashSet<>(), t2 = new HashSet<>();
            t1.add("x");                                  // makes t1 and t2 unequal
            s1.add(t1); s1.add(t2);
            s2.add(t1); s2.add(t2);
            s1 = t1; s2 = t2;
        }
        return root;
    }

    static byte[] serialize(Object o) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    static long readMillis(byte[] data, ObjectInputFilter filter) throws Exception {
        long t = System.nanoTime();
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) {
            if (filter != null) in.setObjectInputFilter(filter);
            in.readObject();
        }
        return (System.nanoTime() - t) / 1_000_000;
    }

    public static void main(String[] args) throws Exception {
        for (int levels = 20; levels <= 26; levels += 2) {
            byte[] data = serialize(bomb(levels));
            System.out.printf("levels %d: %,d bytes, read in %,d ms%n", levels, data.length, readMillis(data, null));
        }
        byte[] big = serialize(bomb(100));
        System.out.printf("levels 100: %,d bytes (not read: about 2^100 hashCode calls)%n", big.length);
        long t = System.nanoTime();
        try {
            readMillis(big, ObjectInputFilter.Config.createFilter("maxdepth=20"));
        } catch (InvalidClassException e) {
            System.out.printf("with maxdepth=20: %s after %.2f ms%n", e.getMessage(), (System.nanoTime() - t) / 1e6);
        }
    }
}`,
        },
        {
          type: "output",
          text: `levels 20: 1,182 bytes, read in 159 ms
levels 22: 1,296 bytes, read in 300 ms
levels 24: 1,410 bytes, read in 1,201 ms
levels 26: 1,524 bytes, read in 5,266 ms
levels 100: 5,742 bytes (not read: about 2^100 hashCode calls)
with maxdepth=20: filter status: REJECTED after 3.19 ms`,
        },
        {
          type: "list",
          items: [
            "Each level holds two `HashSet`s, and both sets of the next level are added to both sets of this level. Thanks to back-references, the stream stores each set once: 100 levels are only 5,742 bytes.",
            "Reading is another matter. `HashSet.readObject` re-inserts each element, which calls the element's `hashCode()`; a set's `hashCode` is the sum of its elements' hash codes, and each element is a set with two children, which are shared, but nothing caches set hash codes. So the work doubles per level: 2^n `hashCode` calls. My measurements went from 120 ms at 20 levels to over 4 seconds at 26, about 4 times per 2 levels. At 100 levels the CPU would spin for longer than the universe has existed, and the stream is smaller than this paragraph's HTML.",
            "Nothing in this stream is a gadget: only `HashSet` and `String`, both of which any allow-list would happily accept. That's why limits matter separately from class lists.",
            "`maxdepth=20` rejected the 100-level stream after about 3 ms, as soon as the nesting passed 20. Real object graphs from my own code rarely need more than a depth of 10 to 20; `maxdepth` is the limit that stops this class of attack.",
            "Other bombs abuse `maxarray` (a stream that declares a huge array length, making the reader allocate gigabytes before reading a single element) and `maxrefs`/`maxbytes` (very long streams). The `jdk.serialFilter` limits are worth setting even in applications that don't think they deserialize anything, because some library might.",
          ],
        },
      ],
    },
    {
      title: "Broken Invariants, Defensive Copies and the Serialization Proxy",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson showed that deserialization skips constructors. For an attacker that's a feature: any check a constructor does can be bypassed by editing the bytes. *Effective Java* (items 88 and 90 in the third edition) describes two attacks and two defences, which I rebuilt.",
        },
        {
          type: "heading",
          text: "Stealing references to private parts",
        },
        {
          type: "code",
          language: "java",
          title: "RogueReference.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InvalidObjectException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.Date;

public class RogueReference {
    // Immutable by design: defensive copies in, validation in the constructor
    static final class TripWindow implements Serializable {
        private static final long serialVersionUID = 1L;
        private final Date pickup;
        private final Date dropoff;
        TripWindow(Date pickup, Date dropoff) {
            this.pickup = new Date(pickup.getTime());
            this.dropoff = new Date(dropoff.getTime());
            if (this.pickup.after(this.dropoff)) throw new IllegalArgumentException("pickup after dropoff");
        }
        long minutes() { return (dropoff.getTime() - pickup.getTime()) / 60_000; }
    }

    // Same class with a defensive readObject
    static final class SafeWindow implements Serializable {
        private static final long serialVersionUID = 1L;
        private Date pickup;                     // no longer final: readObject must reassign them
        private Date dropoff;
        SafeWindow(Date pickup, Date dropoff) {
            this.pickup = new Date(pickup.getTime());
            this.dropoff = new Date(dropoff.getTime());
            if (this.pickup.after(this.dropoff)) throw new IllegalArgumentException("pickup after dropoff");
        }
        private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
            in.defaultReadObject();
            pickup = new Date(pickup.getTime());   // copy FIRST, so nobody else holds our objects
            dropoff = new Date(dropoff.getTime());
            if (pickup.after(dropoff)) throw new InvalidObjectException("pickup after dropoff");
        }
        long minutes() { return (dropoff.getTime() - pickup.getTime()) / 60_000; }
    }

    // The attacker serializes a valid object, then appends two back-references (TC_REFERENCE 0x71)
    // pointing at handles 4 and 5: the dropoff and pickup Date objects inside it.
    static byte[] withRogueRefs(Object valid) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        ObjectOutputStream out = new ObjectOutputStream(b);
        out.writeObject(valid);
        out.flush();
        b.write(new byte[] {0x71, 0, 0x7e, 0, 4});
        b.write(new byte[] {0x71, 0, 0x7e, 0, 5});
        return b.toByteArray();
    }

    public static void main(String[] args) throws Exception {
        Date start = new Date(1_794_000_000_000L), end = new Date(1_794_000_000_000L + 25 * 60_000);

        ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(withRogueRefs(new TripWindow(start, end))));
        TripWindow w = (TripWindow) in.readObject();
        Date dropoff = (Date) in.readObject(), pickup = (Date) in.readObject();
        System.out.println("TripWindow minutes before: " + w.minutes());
        dropoff.setTime(pickup.getTime() - 3 * 60 * 60_000);       // mutate the "immutable" object's insides
        System.out.println("TripWindow minutes after:  " + w.minutes() + "   (constructor check bypassed)");

        in = new ObjectInputStream(new ByteArrayInputStream(withRogueRefs(new SafeWindow(start, end))));
        SafeWindow s = (SafeWindow) in.readObject();
        Date d2 = (Date) in.readObject();
        d2.setTime(0);
        System.out.println("SafeWindow minutes after:  " + s.minutes() + "   (attacker holds copies we discarded)");
    }
}`,
        },
        {
          type: "output",
          text: `TripWindow minutes before: 25
TripWindow minutes after:  -180   (constructor check bypassed)
SafeWindow minutes after:  25   (attacker holds copies we discarded)`,
        },
        {
          type: "list",
          items: [
            "`TripWindow` looks immutable: `final` fields, defensive copies in the constructor, a validity check. But its fields are `Date`s, which are mutable, and they're objects in the stream with handles (4 for `dropoff`, 5 for `pickup`, since fields are written in name order).",
            "The attacker appends two 5-byte back-references (`71 00 7e 00 04` and `71 00 7e 00 05`) after a valid object. Reading them returns **the very `Date` objects inside the deserialized `TripWindow`**. Changing `dropoff` made the trip last -180 minutes: an \"immutable\", validated object now violates its own invariant.",
            "The fix is **defensive copying in `readObject`**: after `defaultReadObject()`, replace each mutable component with a copy, then validate the copies. The attacker still gets references, but to objects the `SafeWindow` no longer uses. Copy before validating, or a second thread could change the value between the check and the copy. The fields can no longer be `final`, because `readObject` reassigns them (or use immutable types such as `Instant`, which make the problem disappear).",
          ],
        },
        {
          type: "heading",
          text: "Tampered values and the serialization proxy",
        },
        {
          type: "code",
          language: "java",
          title: "ProxyPattern.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InvalidObjectException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serial;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class ProxyPattern {
    // Plain: the constructor validates, deserialization doesn't call it
    static final class PlainFare implements Serializable {
        @Serial private static final long serialVersionUID = 1L;
        private final long paise;
        PlainFare(long paise) {
            if (paise < 0) throw new IllegalArgumentException("negative fare " + paise);
            this.paise = paise;
        }
        public String toString() { return "PlainFare[" + paise + "]"; }
    }

    // Serialization proxy: the only thing ever written is a small, private Proxy
    static final class ProxyFare implements Serializable {
        @Serial private static final long serialVersionUID = 1L;
        private final long paise;
        ProxyFare(long paise) {
            if (paise < 0) throw new IllegalArgumentException("negative fare " + paise);
            this.paise = paise;
        }
        public String toString() { return "ProxyFare[" + paise + "]"; }

        @Serial private Object writeReplace() { return new Proxy(paise); }
        @Serial private void readObject(ObjectInputStream in) throws InvalidObjectException {
            throw new InvalidObjectException("proxy required");           // forged ProxyFare streams die here
        }

        private record Proxy(long paise) implements Serializable {
            @Serial private Object readResolve() { return new ProxyFare(paise); }   // back through the constructor
        }
    }

    // Same shape and name length as ProxyFare, but no protection: used to forge a stream
    static final class ForgeFare implements Serializable {
        @Serial private static final long serialVersionUID = 1L;
        private final long paise;
        ForgeFare(long paise) { this.paise = paise; }
    }

    static byte[] serialize(Object o) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    static Object read(byte[] data) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) { return in.readObject(); }
    }

    static byte[] patchLong(byte[] data, long original, long value) {     // flip the 8 bytes of the field
        byte[] copy = data.clone();
        byte[] needle = java.nio.ByteBuffer.allocate(8).putLong(original).array();
        for (int i = 0; i + 8 <= copy.length; i++) {
            if (Arrays.equals(copy, i, i + 8, needle, 0, 8)) {
                System.arraycopy(java.nio.ByteBuffer.allocate(8).putLong(value).array(), 0, copy, i, 8);
                return copy;
            }
        }
        throw new IllegalStateException("not found");
    }

    static void attempt(String label, byte[] data) {
        try {
            System.out.println(label + read(data));
        } catch (Exception e) {
            System.out.println(label + e.getClass().getSimpleName() + ": " + e.getMessage());
        }
    }

    public static void main(String[] args) throws Exception {
        attempt("plain, tampered:  ", patchLong(serialize(new PlainFare(14_500)), 14_500, -500));

        byte[] proxied = serialize(new ProxyFare(14_500));
        System.out.println("proxy stream mentions: " + new String(proxied, StandardCharsets.ISO_8859_1).replaceAll("[^A-Za-z$]+", " ").trim());
        attempt("proxy, honest:    ", proxied);
        attempt("proxy, tampered:  ", patchLong(proxied, 14_500, -500));

        // Forge a stream that claims to contain a ProxyFare directly, bypassing the proxy
        byte[] forged = serialize(new ForgeFare(-500));
        byte[] from = "ForgeFare".getBytes(StandardCharsets.UTF_8), to = "ProxyFare".getBytes(StandardCharsets.UTF_8);
        for (int i = 0; i + from.length <= forged.length; i++) {
            if (Arrays.equals(forged, i, i + from.length, from, 0, from.length)) System.arraycopy(to, 0, forged, i, to.length);
        }
        attempt("proxy, forged:    ", forged);
    }
}`,
        },
        {
          type: "output",
          text: `plain, tampered:  PlainFare[-500]
proxy stream mentions: sr ProxyPattern$ProxyFare$Proxy J paisexp
proxy, honest:    ProxyFare[14500]
proxy, tampered:  IllegalArgumentException: negative fare -500
proxy, forged:    InvalidObjectException: proxy required`,
        },
        {
          type: "list",
          items: [
            "`PlainFare` validated `paise >= 0` in its constructor, and a stream with the 8 bytes patched to `-500` produced `PlainFare[-500]`.",
            "**The serialization proxy pattern**: `ProxyFare.writeReplace` writes a small private `Proxy` holding only the logical state (the stream mentions `ProxyFare$Proxy` and `paise`, never `ProxyFare`'s own layout). The proxy's `readResolve` calls the **real constructor**, so the same validation runs on every deserialization: the tampered stream failed with the constructor's own `IllegalArgumentException`. I made the proxy a record, so even its own fields go through a constructor.",
            "`ProxyFare.readObject` throws `InvalidObjectException(\"proxy required\")`. I forged a stream that claims to contain a `ProxyFare` directly (serialized a look-alike class and patched its name), and it was rejected: there's no path into a `ProxyFare` except the constructor.",
            "The costs: the pattern doesn't work for classes meant to be extended, and objects whose graphs contain cycles back to themselves can't be resolved this way (the proxy's `readResolve` runs after its fields are read). For final data classes, it's the most robust way to keep Java serialization from bypassing invariants. Records give the same guarantee automatically.",
          ],
        },
      ],
    },
    {
      title: "Externalizable vs Serializable, Revisited",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "ExternalizableHole.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.Externalizable;
import java.io.IOException;
import java.io.ObjectInput;
import java.io.ObjectInputStream;
import java.io.ObjectOutput;
import java.io.ObjectOutputStream;

public class ExternalizableHole {
    public static class DriverPayout implements Externalizable {
        private String driverId;                  // can't be final: readExternal assigns it later
        private long amountPaise;

        public DriverPayout() { }                 // required, and public
        public DriverPayout(String driverId, long amountPaise) { this.driverId = driverId; this.amountPaise = amountPaise; }

        @Override public void writeExternal(ObjectOutput out) throws IOException {
            out.writeUTF(driverId);
            out.writeLong(amountPaise);
        }
        @Override public void readExternal(ObjectInput in) throws IOException {   // public: anyone can call it
            driverId = in.readUTF();
            amountPaise = in.readLong();
        }
        public String toString() { return driverId + " gets " + amountPaise + " paise"; }
    }

    public static void main(String[] args) throws Exception {
        DriverPayout approved = new DriverPayout("D-104233", 52_000);
        System.out.println("approved: " + approved);

        // Any code holding the object can re-run readExternal on it with bytes of its choosing
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeUTF("D-999999"); out.writeLong(9_900_000); }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray()))) {
            approved.readExternal(in);
        }
        System.out.println("approved: " + approved + "   (same object, overwritten)");
    }
}`,
        },
        {
          type: "output",
          text: `approved: D-104233 gets 52000 paise
approved: D-999999 gets 9900000 paise   (same object, overwritten)`,
        },
        {
          type: "table",
          headers: ["", "`Serializable`", "`Externalizable`"],
          rows: [
            ["Who writes the data", "The JVM (fields by reflection), optionally hooks", "The class: `writeExternal`/`readExternal`"],
            ["Constructor on read", "First non-serializable superclass's no-arg constructor only", "The class's **public** no-arg constructor"],
            ["`final` fields", "Possible (set through `Unsafe`)", "Impossible: assigned after construction"],
            ["Hooks visibility", "`private` `writeObject`/`readObject`", "`public` `writeExternal`/`readExternal`"],
            ["Stream size", "Field names and types in the descriptor", "Smaller: only what the methods write (71 vs 137 bytes last lesson)"],
            ["Versioning", "Automatic by field name, with `serialVersionUID`", "Entirely manual"],
            ["Superclass state", "Each serializable class handled automatically", "The class must write its superclass's state itself"],
            ["Security", "Attack surface in every `readObject`", "Same, plus `readExternal` callable on any live object"],
          ],
        },
        {
          type: "paragraph",
          text: "`readExternal` is part of the public API. Any code holding a `DriverPayout` can call it with bytes of its choice and overwrite an approved payout in place: the same object, new driver, new amount. `Externalizable` buys a smaller stream at the cost of immutability and safety; a `Serializable` record, or a proxy with a compact form, is almost always a better trade. Neither interface helps with untrusted input: both are gadget surfaces.",
        },
      ],
    },
    {
      title: "Alternatives: JSON, Binary Formats and Schemas",
      blocks: [
        {
          type: "paragraph",
          text: "The structural fix is a format in which the **receiver** decides the types. With JSON and an explicit DTO, the bytes carry field names and values; the code says `readValue(bytes, TripV1.class)`, and nothing in the input can name a class to instantiate (as long as polymorphic typing from the input stays off, below). Schema evolution then becomes an explicit, testable policy:",
        },
        {
          type: "code",
          language: "java",
          title: "JsonEvolution.java",
          code: `import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

public class JsonEvolution {
    // The consumer's view of a trip, written months ago
    public record TripV1(String id, String zone, long farePaise) { }

    // Same fields, tolerant of anything new
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TripV1Tolerant(String id, String zone, long farePaise) { }

    // A newer consumer that knows the coupon, with a default when it's missing
    public record TripV2(String id, String zone, long farePaise, String couponCode) {
        public TripV2 {
            if (couponCode == null) couponCode = "NONE";
        }
    }

    static void tryRead(String label, ObjectMapper m, String json, Class<?> type) {
        try {
            System.out.println(label + m.readValue(json, type));
        } catch (Exception e) {
            String msg = e.getMessage();
            System.out.println(label + e.getClass().getSimpleName() + ": " + msg.substring(0, msg.indexOf('\\n')));
        }
    }

    public static void main(String[] args) {
        String oldJson = "{\\"id\\":\\"T-81\\",\\"zone\\":\\"SALT-LAKE\\",\\"farePaise\\":24000}";
        String newJson = "{\\"id\\":\\"T-82\\",\\"zone\\":\\"NEW-TOWN\\",\\"farePaise\\":18000,\\"couponCode\\":\\"PUJA50\\"}";

        ObjectMapper strict = new ObjectMapper();
        ObjectMapper lenient = new ObjectMapper().disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

        tryRead("old consumer, new message, default:   ", strict, newJson, TripV1.class);
        tryRead("old consumer, new message, lenient:   ", lenient, newJson, TripV1.class);
        tryRead("old consumer, new message, annotated: ", strict, newJson, TripV1Tolerant.class);
        tryRead("new consumer, old message:            ", strict, oldJson, TripV2.class);
        tryRead("new consumer, fare missing:           ", strict, "{\\"id\\":\\"T-83\\",\\"zone\\":\\"HOWRAH\\"}", TripV2.class);
        tryRead("fare missing, strict features:        ",
                new ObjectMapper().enable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
                        .enable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES),
                "{\\"id\\":\\"T-83\\",\\"zone\\":\\"HOWRAH\\"}", TripV2.class);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp $JACKSON JsonEvolution.java && java -cp $JACKSON:. JsonEvolution`,
        },
        {
          type: "output",
          text: `old consumer, new message, default:   UnrecognizedPropertyException: Unrecognized field "couponCode" (class JsonEvolution$TripV1), not marked as ignorable (3 known properties: "id", "zone", "farePaise")
old consumer, new message, lenient:   TripV1[id=T-82, zone=NEW-TOWN, farePaise=18000]
old consumer, new message, annotated: TripV1Tolerant[id=T-82, zone=NEW-TOWN, farePaise=18000]
new consumer, old message:            TripV2[id=T-81, zone=SALT-LAKE, farePaise=24000, couponCode=NONE]
new consumer, fare missing:           TripV2[id=T-83, zone=HOWRAH, farePaise=0, couponCode=NONE]
fare missing, strict features:        MismatchedInputException: Missing creator property 'farePaise' (index 2); \`DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES\` enabled`,
        },
        {
          type: "list",
          items: [
            "**New field, old consumer.** Jackson 2.x's default, `FAIL_ON_UNKNOWN_PROPERTIES = true`, rejects a message with a field the DTO doesn't know: `UnrecognizedPropertyException`. For consumers of other teams' events, I want tolerance: disable the feature on the mapper, or annotate the DTO with `@JsonIgnoreProperties(ignoreUnknown = true)`. (Spring Boot's auto-configured `ObjectMapper` already disables it.) Strict mode is still useful for my own API's request bodies, where an unknown field is likely a client typo.",
            "**Old message, new consumer.** A missing field arrives as `null` (or `0` for primitives) in the record's canonical constructor, which can apply a default: `couponCode=NONE`.",
            "**A missing required field is silent by default**: `farePaise=0` for a trip with no fare. `FAIL_ON_MISSING_CREATOR_PROPERTIES` (and `FAIL_ON_NULL_FOR_PRIMITIVES`) turn that into an error naming the property. A fare of zero paise that nobody noticed is a worse bug than a rejected message.",
            "Compare the previous lesson: adding one field without a `serialVersionUID` broke every stored object. Here, adding a field breaks nothing in either direction, and the rules are visible in code.",
          ],
        },
        {
          type: "heading",
          text: "Polymorphic JSON can reopen the hole",
        },
        {
          type: "paragraph",
          text: "Jackson can embed class names in JSON (`enableDefaultTyping`, or `@JsonTypeInfo(use = Id.CLASS)`), and then the input chooses the class again, with gadgets of its own: Jackson had a long series of CVEs for exactly this until 2.10 deprecated `enableDefaultTyping` in favour of `activateDefaultTyping` with a `PolymorphicTypeValidator` allow-list. For polymorphism I use logical type names (`@JsonTypeInfo(use = Id.NAME)` with `@JsonSubTypes`, or a `type` field and a `switch`, as in the production section), never class names from the input.",
        },
        {
          type: "heading",
          text: "Other formats",
        },
        {
          type: "table",
          headers: ["Format", "Schema", "Shape", "Notes"],
          rows: [
            ["JSON (Jackson)", "Implicit, in the DTO classes", "Text, self-describing field names", "Universal, debuggable; largest and slowest of these (measured below)"],
            ["Protocol Buffers", "`.proto` files, code generated", "Binary, numbered fields", "Unknown fields are kept and skipped; never reuse a field number"],
            ["Apache Avro", "JSON schema, often in a registry", "Binary, no field tags", "Reader and writer schemas are resolved at read time; common with Kafka"],
            ["Kryo", "Registered classes", "Binary, Java-specific", "Fast and compact; Kryo 5 requires class registration by default, and turning that off brings back the class-name problem"],
            ["Hand-written `DataOutputStream`", "In my code", "Binary, exactly my fields", "Smallest and fastest here; versioning, tooling and other languages are on me"],
          ],
        },
        {
          type: "paragraph",
          text: "I didn't measure Protobuf, Avro or Kryo here because they aren't available on this machine; the measurements below compare the three I could run. The general shape from published benchmarks is that schema-based binary formats sit near the hand-written format in size and well ahead of JSON in speed, but the reason to choose one is usually the schema and its evolution rules, not the last millisecond.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing the filtered consumer from the production section reading the unexpected `MaintenanceTask` message:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`new ObjectInputStream(bytes)`** reads `ac ed 00 05`. Since Java 17 the constructor asks the filter factory for the stream's initial filter: `factory.apply(null, jvmWideFilter)`. With the built-in factory and no `jdk.serialFilter`, that's `null`.",
            "**`in.setObjectInputFilter(allow)`** asks the factory again, `apply(null, allow)`; the built-in factory returns `allow`. From now on the filter is fixed for this stream.",
            "**`in.readObject()`** reads tag `73` (`TC_OBJECT`) and calls `readOrdinaryObject`, which calls `readClassDesc`: tag `72`, then `readNonProxyDesc` reads the name `PayoutConsumer$MaintenanceTask`, the UID and the fields.",
            "**`resolveClass`** loads the class with `Class.forName(name, false, loader)`, without running its static initialiser. The class exists on the classpath, so this succeeds; the class name check comes next.",
            "**`filterCheck(MaintenanceTask.class, -1)`** builds a `FilterInfo` (class, array length -1, depth 1, references 1, bytes read so far) and calls `allow.checkInput`. The pattern filter checks limits first (all fine), then the class patterns left to right: not `PayoutConsumer$TripCompleted`, then `!*` matches: `REJECTED`.",
            "**`ObjectInputStream` throws `InvalidClassException(\"filter status: REJECTED\")`** and logs the decision to the `java.io.serialization` logger. No instance was allocated, so `MaintenanceTask.readObject` never runs.",
            "**The consumer** catches it, sends the message to the dead-letter queue, and moves on. Messages 1 and 3 pass the same checks (their only class is allowed; their `String` fields aren't filtered) and are paid.",
            "**With JSON**, steps 3 to 6 don't exist: `readTree` builds a tree of plain nodes, the code checks the `type` string against the one it supports, and `treeToValue` fills a record whose class was chosen by my code. The unknown type is just an unknown string.",
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
          title: "FilterTour.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InvalidClassException;
import java.io.ObjectInputFilter;
import java.io.ObjectInputFilter.Status;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class FilterTour {
    record Fare(long paise, String zone) implements Serializable { }
    record Note(String text) implements Serializable { }

    static Object read(byte[] data, ObjectInputFilter f) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) {
            in.setObjectInputFilter(f);                                  // 1. per stream, before the first read
            return in.readObject();
        }
    }

    static String attempt(byte[] data, ObjectInputFilter f) {
        try { return String.valueOf(read(data, f)); }
        catch (InvalidClassException e) { return e.getMessage(); }
        catch (Exception e) { return e.toString(); }
    }

    public static void main(String[] args) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(new Fare(14_500, "SALT-LAKE")); }
        byte[] fare = b.toByteArray();
        b.reset();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(new Note("gate 2")); }
        byte[] note = b.toByteArray();

        // 2. pattern syntax: limits, class names, package.*, module/pkg.*, ! to reject, !* to end
        ObjectInputFilter pattern = ObjectInputFilter.Config.createFilter("maxdepth=5;maxbytes=1024;FilterTour$Fare;!*");
        System.out.println("pattern, Fare: " + attempt(fare, pattern));
        System.out.println("pattern, Note: " + attempt(note, pattern));

        // 3. predicates (Java 17): allowFilter / rejectFilter, merge, rejectUndecidedClass
        ObjectInputFilter onlyFare = ObjectInputFilter.allowFilter(c -> c == Fare.class, Status.UNDECIDED);
        ObjectInputFilter strict = ObjectInputFilter.rejectUndecidedClass(onlyFare);
        System.out.println("allowFilter + rejectUndecided, Note: " + attempt(note, strict));

        // 4. a lambda sees everything: class, array length, depth, references, bytes
        ObjectInputFilter tiny = info -> info.streamBytes() > 60 ? Status.REJECTED : Status.UNDECIDED;
        System.out.println("bytes <= 60, Fare: " + attempt(fare, tiny));

        // 5. JVM-wide: -Djdk.serialFilter=... or java.security; read it back
        System.out.println("JVM-wide filter: " + ObjectInputFilter.Config.getSerialFilter());
    }
}`,
        },
        {
          type: "output",
          text: `pattern, Fare: Fare[paise=14500, zone=SALT-LAKE]
pattern, Note: filter status: REJECTED
allowFilter + rejectUndecided, Note: filter status: REJECTED
bytes <= 60, Fare: filter status: REJECTED
JVM-wide filter: null`,
        },
        {
          type: "paragraph",
          text: "The pattern string covers most needs; lambdas give full control over every `FilterInfo` field; `allowFilter`, `rejectFilter`, `merge` and `rejectUndecidedClass` (Java 17) compose them. The fare stream is 92 bytes, and the first filter call happens only after the whole class descriptor has been read, at byte 70, so the `bytes <= 60` lambda rejected it at its very first check. `maxbytes` works the same way: it's enforced at filter calls, not on every byte.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: A reusable safe reader",
        },
        {
          type: "code",
          language: "java",
          title: "SafeReader.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InvalidClassException;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class SafeReader {
    // Read one object of an expected type, allowing only listed classes, with hard limits
    static <T> T read(byte[] data, Class<T> expected, Set<Class<?>> allowed) throws IOException, ClassNotFoundException {
        ObjectInputFilter limits = ObjectInputFilter.Config.createFilter("maxdepth=10;maxrefs=1000;maxbytes=65536;maxarray=1000");
        ObjectInputFilter classes = info -> {
            Class<?> c = info.serialClass();
            if (c == null) return ObjectInputFilter.Status.UNDECIDED;           // limit checks only
            while (c.isArray()) c = c.getComponentType();
            if (c.isPrimitive() || allowed.contains(c)) return ObjectInputFilter.Status.ALLOWED;
            return ObjectInputFilter.Status.REJECTED;
        };
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) {
            in.setObjectInputFilter(ObjectInputFilter.merge(limits, classes));
            return expected.cast(in.readObject());
        }
    }

    record Fare(long paise, String zone) implements Serializable { }
    static class Shift implements Serializable {
        private static final long serialVersionUID = 1L;
        String driverId = "D-104233";
        Map<String, Object> extras = new HashMap<>();         // Object: anything can hide in here
    }
    static class Unexpected implements Serializable { private static final long serialVersionUID = 1L; }

    static byte[] serialize(Object o) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    public static void main(String[] args) throws Exception {
        Set<Class<?>> allowed = Set.of(Shift.class, HashMap.class, Map.Entry.class,   // HashMap.readObject checks a Map.Entry[]
                Fare.class, Long.class, Number.class);

        Shift ok = new Shift();
        ok.extras.put("lastFare", new Fare(14_500, "SALT-LAKE"));
        ok.extras.put("tips", 2_000L);
        System.out.println("ok: " + read(serialize(ok), Shift.class, allowed).extras.keySet());

        Shift sneaky = new Shift();
        sneaky.extras.put("note", new Unexpected());          // nested deep inside an allowed type
        try {
            read(serialize(sneaky), Shift.class, allowed);
        } catch (InvalidClassException e) {
            System.out.println("sneaky: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `ok: [lastFare, tips]
sneaky: filter status: REJECTED`,
        },
        {
          type: "list",
          items: [
            "`read(bytes, Shift.class, allowed)` merges hard limits with a class allow-list given as `Class` objects (refactoring-safe, unlike pattern strings), unwraps array types to their component, allows primitives, and rejects everything else. The final `expected.cast` gives a clean `ClassCastException` if an allowed but wrong type arrives.",
            "The sneaky message hid an `Unexpected` object inside a `Map<String, Object>` field of an allowed class. The filter checks every object in the graph, not just the root, so it was rejected.",
            "`HashMap.readObject` checks a `Map.Entry[]` before allocating its table, so `Map.Entry.class` has to be allowed for any `HashMap` to load, the same lesson as `Object[]` for `List.of` above.",
            "Fields typed `Object`, `Serializable` or `Map<String, Object>` are where gadgets hide. In classes that might be deserialized, I'd use concrete types.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Validating the whole graph after reading",
        },
        {
          type: "code",
          language: "java",
          title: "GraphValidation.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InvalidObjectException;
import java.io.ObjectInputStream;
import java.io.ObjectInputValidation;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class GraphValidation {
    static class Invoice implements Serializable, ObjectInputValidation {
        private static final long serialVersionUID = 1L;
        final List<Long> tripFaresPaise = new ArrayList<>();
        long totalPaise;

        private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
            in.defaultReadObject();
            System.out.println("  readObject: " + tripFaresPaise.size() + " fares read, validation registered");
            in.registerValidation(this, 0);           // run validateObject once the WHOLE graph is read
        }

        @Override public void validateObject() throws InvalidObjectException {
            long sum = tripFaresPaise.stream().mapToLong(Long::longValue).sum();
            System.out.println("  validateObject: sum " + sum + ", total " + totalPaise);
            if (sum != totalPaise) throw new InvalidObjectException("total " + totalPaise + " != sum of fares " + sum);
        }
    }

    static Object roundTrip(Object o) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray()))) { return in.readObject(); }
    }

    public static void main(String[] args) throws Exception {
        Invoice good = new Invoice();
        good.tripFaresPaise.addAll(List.of(14_500L, 8_000L));
        good.totalPaise = 22_500;
        System.out.println("good:");
        System.out.println("  read total " + ((Invoice) roundTrip(good)).totalPaise);

        Invoice bad = new Invoice();
        bad.tripFaresPaise.addAll(List.of(14_500L, 8_000L));
        bad.totalPaise = 1;
        System.out.println("bad:");
        try {
            roundTrip(bad);
        } catch (InvalidObjectException e) {
            System.out.println("  " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `good:
  readObject: 2 fares read, validation registered
  validateObject: sum 22500, total 22500
  read total 22500
bad:
  readObject: 2 fares read, validation registered
  validateObject: sum 22500, total 1
  java.io.InvalidObjectException: total 1 != sum of fares 22500`,
        },
        {
          type: "paragraph",
          text: "Some invariants span several objects: an invoice's total must equal the sum of its trips. Inside `readObject`, other objects in the graph may not be fully read yet (with cycles, they can be half-built). `ObjectInputStream.registerValidation(obj, priority)` schedules `validateObject()` to run when the **top-level** `readObject` call has finished the whole graph, and an exception there aborts the read. It's the right place for cross-object checks; per-object checks belong in `readObject` itself.",
        },
        {
          type: "heading",
          text: "Example 3: A session cache that survives deploys, in JSON",
        },
        {
          type: "code",
          language: "java",
          title: "JsonSessionCache.java",
          code: `import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

public class JsonSessionCache {
    // Release 41's session, as a JSON DTO
    public record SessionV41(String riderId, String name, String homeZone, long expiresAtMillis) { }

    // Release 42 adds a field; old entries get a default
    public record SessionV42(String riderId, String name, String homeZone, long expiresAtMillis, String preferredPayment) {
        public SessionV42 {
            if (preferredPayment == null) preferredPayment = "UPI";
        }
    }

    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper()
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);    // so a rollback can read newer entries

        byte[] fromV41 = mapper.writeValueAsBytes(new SessionV41("R-1", "Asha", "SALT-LAKE", 1_794_000_000_000L));
        System.out.println("cached by 41 (" + fromV41.length + " bytes): " + new String(fromV41, "UTF-8"));
        System.out.println("read by 42:  " + mapper.readValue(fromV41, SessionV42.class));

        byte[] fromV42 = mapper.writeValueAsBytes(new SessionV42("R-2", "Ravi", "NEW-TOWN", 1_794_000_000_000L, "CARD"));
        System.out.println("cached by 42, read by 41 after a rollback: " + mapper.readValue(fromV42, SessionV41.class));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp $JACKSON JsonSessionCache.java && java -cp $JACKSON:. JsonSessionCache`,
        },
        {
          type: "output",
          text: `cached by 41 (86 bytes): {"riderId":"R-1","name":"Asha","homeZone":"SALT-LAKE","expiresAtMillis":1794000000000}
read by 42:  SessionV42[riderId=R-1, name=Asha, homeZone=SALT-LAKE, expiresAtMillis=1794000000000, preferredPayment=UPI]
cached by 42, read by 41 after a rollback: SessionV41[riderId=R-2, name=Ravi, homeZone=NEW-TOWN, expiresAtMillis=1794000000000]`,
        },
        {
          type: "paragraph",
          text: "This is the previous lesson's production bug, redone with JSON. Release 42 reads release 41's entries and fills the new field with the same default a new session gets; and if 42 is rolled back, 41 reads 42's entries and ignores the field it doesn't know. The entry is 86 bytes against 143 for the Java-serialized `RiderSession` (I checked the cache file), readable in `redis-cli`, and readable by a service in another language. The rules for evolving it are in two lines of code.",
        },
      ],
    },
    {
      title: "When to Use Which",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Why"],
          rows: [
            ["Data from clients, partners, queues or caches others write", "JSON (or Protobuf/Avro) with explicit DTOs", "Input can't choose classes; schema rules are explicit"],
            ["Legacy endpoint that must keep accepting Java serialization", "Per-stream allow-list filter with limits, `!*`, logging; plan the migration", "Reduces gadget and DoS risk; doesn't remove it"],
            ["Any JVM that might deserialize somewhere (libraries, app servers)", "`jdk.serialFilter` with limits, or a filter factory", "Covers streams created by code you don't control"],
            ["Same application, same version, trusted bytes (checkpoints)", "Java serialization is acceptable, records preferred", "No trust boundary"],
            ["Classes that must stay valid after deserialization", "Records, or the serialization proxy pattern", "Constructor runs on every read"],
            ["Mutable components in serializable classes", "Defensive copies in `readObject`, or immutable types", "Back-references can leak internals"],
            ["High-volume internal messaging", "Protobuf or Avro with a schema registry", "Compact, fast, evolvable, multi-language"],
            ["Polymorphic JSON", "Logical type names (`Id.NAME`) or a `type` field", "Never class names from input"],
          ],
        },
        {
          type: "paragraph",
          text: "My rule: never deserialize Java objects from a source I don't control, and treat \"I control it\" sceptically for anything shared (a cache, a queue, a database column). Where Java serialization remains, a filter with limits is mandatory, not optional.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Relying on the cast for safety",
        },
        {
          type: "paragraph",
          text: "`(TripRequest) in.readObject()` checks the type after every `readObject` in the graph has run. `BeforeTheCast` showed the gadget's stack frames completing before `main` reached the cast. Filtering must happen inside the stream.",
        },
        {
          type: "heading",
          text: "Deny-lists instead of allow-lists",
        },
        {
          type: "paragraph",
          text: "A filter like `!org.apache.commons.collections.functors.*` blocks the gadgets from one famous chain and nothing else. New gadget chains keep being found in other libraries. Allow-list the few classes the stream should contain and end with `!*`.",
        },
        {
          type: "heading",
          text: "Allow-lists that are too broad",
        },
        {
          type: "paragraph",
          text: "`java.**`, `java.base/*` or `com.mycompany.**` allow hundreds or thousands of classes, any of which might have a usable `readObject`, `readResolve`, `hashCode` or `compareTo`. Keep allow-lists to the exact message classes, and fix the `Object[]`/`Map.Entry[]` array checks deliberately rather than by widening the list.",
        },
        {
          type: "heading",
          text: "Filters without limits",
        },
        {
          type: "paragraph",
          text: "A class allow-list containing `HashSet` and `String` accepts the 5,742-byte bomb that would never finish. Always add `maxdepth`, `maxbytes`, `maxarray` and `maxrefs`.",
        },
        {
          type: "heading",
          text: "Setting jdk.serialFilter from code",
        },
        {
          type: "paragraph",
          text: "`System.setProperty(\"jdk.serialFilter\", ...)` inside `main` has no effect on JDK 21; I measured `getSerialFilter()` still returning `null`. Set it on the command line or in `java.security`, or use `Config.setSerialFilter`/`setSerialFilterFactory` programmatically at startup.",
        },
        {
          type: "heading",
          text: "Trusting readObject to validate without copying",
        },
        {
          type: "paragraph",
          text: "Validating mutable fields in `readObject` without first copying them leaves the object open to the rogue-reference attack: the attacker holds the same `Date` and changes it after the check. Copy first, then validate, and prefer immutable component types.",
        },
        {
          type: "heading",
          text: "Turning on class names in JSON",
        },
        {
          type: "paragraph",
          text: "`enableDefaultTyping()` or `@JsonTypeInfo(use = Id.CLASS)` on a field typed `Object` recreates the Java deserialization problem in JSON. Use logical type names with a closed set of subtypes, or a `PolymorphicTypeValidator` allow-list if class-based typing is truly needed.",
        },
        {
          type: "heading",
          text: "Leaving FAIL_ON_UNKNOWN_PROPERTIES on for consumers of other teams' events",
        },
        {
          type: "paragraph",
          text: "A producer adding an optional field shouldn't break every consumer. Disable it, or use `@JsonIgnoreProperties(ignoreUnknown = true)`, for consumers; keep strictness where it catches real mistakes (request bodies of my own API), and enable `FAIL_ON_MISSING_CREATOR_PROPERTIES` for required fields.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Don't accept Java-serialized data from any source you don't fully control; use JSON, Protobuf or Avro with explicit DTOs at every trust boundary.",
            "Where Java deserialization remains, set a per-stream filter before the first read: an allow-list of exact classes, `maxdepth`, `maxrefs`, `maxbytes`, `maxarray`, and a final `!*`.",
            "Also set a JVM-wide baseline with `jdk.serialFilter` (limits at least), or a filter factory on Java 17+, so library code is covered.",
            "Log filter rejections (the `java.io.serialization` logger) and alert on them.",
            "Keep serializable classes final, small and made of plain data; prefer records; avoid fields typed `Object`, `Serializable` or `Map<String, Object>`.",
            "For classes that must keep invariants, use the serialization proxy pattern; otherwise validate in `readObject` after defensive copies of mutable components.",
            "Use `registerValidation` for invariants that span several objects.",
            "Prefer `Serializable` (records, proxies) over `Externalizable`; `readExternal` is public and makes immutability impossible.",
            "For JSON: explicit DTO classes, no default typing, logical type names for polymorphism, tolerant of unknown fields for event consumers, strict about missing required fields.",
            "Keep dependencies current and remove unused libraries: fewer classes on the classpath means fewer potential gadgets.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "I compared Java serialization, Jackson 2.21.5 JSON and a hand-written `DataOutputStream` format on the same `Trip` record with six fields: bytes for a list of one trip and for 100,000 trips, and the best of 40 runs of writing and reading the 100,000-trip list, all in one process on one machine (not JMH):",
        },
        {
          type: "code",
          language: "java",
          title: "FormatShootout.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.GZIPOutputStream;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

public class FormatShootout {
    public record Trip(String id, String riderId, String zone, long farePaise, int distanceMetres, long startedAtMillis)
            implements Serializable { }

    static final String[] ZONES = {"SALT-LAKE", "NEW-TOWN", "HOWRAH", "PARK-STREET"};
    static final ObjectMapper JSON = new ObjectMapper();
    static final TypeReference<List<Trip>> LIST = new TypeReference<>() { };

    static List<Trip> trips(int n) {
        List<Trip> list = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            list.add(new Trip("T-" + (100_000 + i), "R-" + (5_000 + i % 997), ZONES[i % 4],
                    8_000 + i % 500 * 37, 1_000 + i % 9_000, 1_794_000_000_000L + i * 60_000L));
        }
        return list;
    }

    static byte[] javaWrite(List<Trip> t) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(t); }
        return b.toByteArray();
    }
    @SuppressWarnings("unchecked")
    static List<Trip> javaRead(byte[] d) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(d))) { return (List<Trip>) in.readObject(); }
    }

    static byte[] jsonWrite(List<Trip> t) throws IOException { return JSON.writeValueAsBytes(t); }
    static List<Trip> jsonRead(byte[] d) throws IOException { return JSON.readValue(d, LIST); }

    static byte[] dataWrite(List<Trip> t) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (DataOutputStream out = new DataOutputStream(b)) {
            out.writeInt(t.size());
            for (Trip x : t) {
                out.writeUTF(x.id()); out.writeUTF(x.riderId()); out.writeUTF(x.zone());
                out.writeLong(x.farePaise()); out.writeInt(x.distanceMetres()); out.writeLong(x.startedAtMillis());
            }
        }
        return b.toByteArray();
    }
    static List<Trip> dataRead(byte[] d) throws IOException {
        DataInputStream in = new DataInputStream(new ByteArrayInputStream(d));
        int n = in.readInt();
        List<Trip> list = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            list.add(new Trip(in.readUTF(), in.readUTF(), in.readUTF(), in.readLong(), in.readInt(), in.readLong()));
        }
        return list;
    }

    interface Job { Object run() throws Exception; }

    static double bestMs(Job j) throws Exception {
        long best = Long.MAX_VALUE;
        for (int r = 0; r < 40; r++) {
            long t = System.nanoTime();
            if (j.run() == null) throw new AssertionError();
            best = Math.min(best, System.nanoTime() - t);
        }
        return best / 1e6;
    }

    public static void main(String[] args) throws Exception {
        List<Trip> one = trips(1), many = trips(100_000);
        System.out.println("one trip as JSON: " + new String(jsonWrite(one), "UTF-8"));
        System.out.printf("%-14s %10s %10s %10s %10s%n", "format", "list of 1", "100k trips", "write ms", "read ms");

        byte[] j = javaWrite(many), s = jsonWrite(many), d = dataWrite(many);
        if (!javaRead(j).equals(many) || !jsonRead(s).equals(many) || !dataRead(d).equals(many)) throw new AssertionError();
        System.out.printf("%-14s %10d %10d %10.1f %10.1f%n", "Java serial.", javaWrite(one).length, j.length,
                bestMs(() -> javaWrite(many)), bestMs(() -> javaRead(j)));
        System.out.printf("%-14s %10d %10d %10.1f %10.1f%n", "Jackson JSON", jsonWrite(one).length, s.length,
                bestMs(() -> jsonWrite(many)), bestMs(() -> jsonRead(s)));
        System.out.printf("%-14s %10d %10d %10.1f %10.1f%n", "DataOutput", dataWrite(one).length, d.length,
                bestMs(() -> dataWrite(many)), bestMs(() -> dataRead(d)));
        System.out.printf("gzipped 100k: Java %d, JSON %d, DataOutput %d%n", gzip(j), gzip(s), gzip(d));
    }

    static int gzip(byte[] data) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (GZIPOutputStream z = new GZIPOutputStream(b)) { z.write(data); }
        return b.size();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp $JACKSON FormatShootout.java && java -cp $JACKSON:. FormatShootout`,
        },
        {
          type: "output",
          text: `one trip as JSON: [{"id":"T-100000","riderId":"R-5000","zone":"SALT-LAKE","farePaise":8000,"distanceMetres":1000,"startedAtMillis":1794000000000}]
format          list of 1 100k trips   write ms    read ms
Java serial.          246    5100214       63.4       43.5
Jackson JSON          128   12739001       31.7       52.2
DataOutput             53    4850004       25.4       25.4
gzipped 100k: Java 1472419, JSON 1560057, DataOutput 1431793`,
        },
        {
          type: "list",
          items: [
            "**Size.** JSON was the largest: 12.7 MB for 100,000 trips, about 127 bytes per trip, because every record repeats all six field names. Java serialization was 5.1 MB (51 bytes per trip; the class descriptor is written once and the four zone strings are back-references), and the hand-written format 4.85 MB (48.5). For a single trip the order flips: Java serialization pays the descriptor, 246 bytes against JSON's 128 and 53 for the manual format.",
            "**Compression erases most of it.** Gzipped, all three were within 10% of each other (1.43 to 1.56 MB): the repeated field names in JSON compress very well. If the data is compressed in transit or at rest, size alone rarely decides the format.",
            "**Writing.** Java serialization was the slowest writer (63 ms), twice JSON (32 ms) and the manual format (25 ms). I checked that it isn't record-specific: an equivalent class took about the same. I didn't pin down where the time goes; the per-object identity lookups in the write handle table are my best guess, since reading needs no such lookups.",
            "**Reading.** JSON was the slowest reader (52 ms, parsing text and matching property names), Java serialization 44 ms, the manual format 25 ms.",
            "**Filters are nearly free.** Reading 100,000 objects with and without a pattern allow-list:",
          ],
        },
        {
          type: "code",
          language: "java",
          title: "FilterCost.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class FilterCost {
    static class Trip implements Serializable {
        private static final long serialVersionUID = 1L;
        String id; long farePaise; int[] waypoints;
        Trip(String id, long farePaise) { this.id = id; this.farePaise = farePaise; waypoints = new int[] {1, 2, 3}; }
    }

    static long readNanos(byte[] data, ObjectInputFilter f) throws Exception {
        long t = System.nanoTime();
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) {
            if (f != null) in.setObjectInputFilter(f);
            in.readObject();
        }
        return System.nanoTime() - t;
    }

    public static void main(String[] args) throws Exception {
        List<Trip> trips = new ArrayList<>();
        for (int i = 0; i < 100_000; i++) trips.add(new Trip("T-" + i, 8_000 + i));
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(trips); }
        byte[] data = b.toByteArray();

        ObjectInputFilter pattern = ObjectInputFilter.Config.createFilter(
                "maxdepth=5;maxarray=200000;maxrefs=1000000;FilterCost$Trip;java.util.ArrayList;java.lang.Object;!*");
        long none = Long.MAX_VALUE, withFilter = Long.MAX_VALUE;
        for (int r = 0; r < 30; r++) {
            none = Math.min(none, readNanos(data, null));
            withFilter = Math.min(withFilter, readNanos(data, pattern));
        }
        System.out.printf("%,d bytes, 100k trips: no filter %.1f ms, pattern filter %.1f ms%n", data.length, none / 1e6, withFilter / 1e6);
    }
}`,
        },
        {
          type: "output",
          text: `4,589,042 bytes, 100k trips: no filter 45.0 ms, pattern filter 46.5 ms`,
        },
        {
          type: "paragraph",
          text: "The filter is called once per class descriptor, array and back-reference, not per field, so 100,000 objects of one class cost a handful of real checks plus cheap limit checks; the difference was within run-to-run noise (a second run gave 43.7 against 46.6 ms). Performance is never a reason to skip a filter. The exponential bomb is the opposite case: one 5-kilobyte stream can take unbounded CPU, and `maxdepth` is what bounds it.",
        },
      ],
    },
    {
      title: "Serialization Pitfalls in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend's payout service consumed `TripCompleted` events from an internal queue. The trip service published them as Java-serialized objects, using a shared JAR of event classes, because \"it's internal\". During a security review, a tester with access to a staging queue published a message containing a different serializable class from an operations library that was on the payout service's classpath. Its `readObject` ran inside the payout service before the `ClassCastException`, and the review flagged the queue as a remote-code-execution path: anyone who could publish to it (another compromised service, a misconfigured producer, an engineer's script) could choose classes to run in the service that moves money. I rebuilt the consumer with a harmless stand-in class that only prints what it would do.",
        },
        {
          type: "code",
          language: "java",
          title: "PayoutConsumer.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InvalidClassException;
import java.io.ObjectInputFilter;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class PayoutConsumer {
    // The event class shared by producer and consumer through a common JAR
    static class TripCompleted implements Serializable {
        private static final long serialVersionUID = 1L;
        String tripId; String driverId; long farePaise;
        TripCompleted(String tripId, String driverId, long farePaise) {
            this.tripId = tripId; this.driverId = driverId; this.farePaise = farePaise;
        }
    }

    // Another Serializable class that happens to be on the consumer's classpath (an ops library).
    // Harmless here: it only prints what it "would" do with a field the sender controls.
    static class MaintenanceTask implements Serializable {
        private static final long serialVersionUID = 1L;
        String command;
        private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
            in.defaultReadObject();
            System.out.println("    !! MaintenanceTask.readObject ran, would execute: " + command);
        }
    }

    static byte[] javaBytes(Object o) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    static final List<String> deadLetters = new ArrayList<>();
    static long paidPaise = 0;

    static void pay(String tripId, String driverId, long farePaise) {
        long share = farePaise * 80 / 100;
        paidPaise += share;
        System.out.println("    paid " + driverId + " " + share + " paise for " + tripId);
    }

    // Release 1: whatever arrives is deserialized, then cast
    static void consumeJava(byte[] msg, ObjectInputFilter filter) {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(msg))) {
            if (filter != null) in.setObjectInputFilter(filter);
            TripCompleted e = (TripCompleted) in.readObject();
            pay(e.tripId, e.driverId, e.farePaise);
        } catch (InvalidClassException | ClassCastException e) {
            deadLetters.add(e.toString());
            System.out.println("    dead-lettered: " + e);
        } catch (IOException | ClassNotFoundException e) {
            deadLetters.add(e.toString());
        }
    }

    // Release 3: JSON with an explicit DTO; the message names a type, never a Java class
    record TripCompletedV1(String tripId, String driverId, long farePaise) { }
    static final ObjectMapper JSON = new ObjectMapper();

    static void consumeJson(byte[] msg) {
        try {
            JsonNode node = JSON.readTree(msg);
            String type = node.path("type").asText();
            if (!type.equals("trip.completed.v1")) throw new IllegalArgumentException("unknown event type '" + type + "'");
            TripCompletedV1 e = JSON.treeToValue(node.get("data"), TripCompletedV1.class);
            if (e.farePaise() < 0 || e.driverId() == null) throw new IllegalArgumentException("invalid " + e);
            pay(e.tripId(), e.driverId(), e.farePaise());
        } catch (Exception e) {
            deadLetters.add(e.getMessage());
            System.out.println("    dead-lettered: " + e.getMessage());
        }
    }

    public static void main(String[] args) throws Exception {
        MaintenanceTask unexpected = new MaintenanceTask();
        unexpected.command = "purge payout ledger";
        List<byte[]> javaQueue = List.of(
                javaBytes(new TripCompleted("T-81", "D-104233", 24_000)),
                javaBytes(unexpected),
                javaBytes(new TripCompleted("T-82", "D-104410", 18_000)));

        String mode = args[0];
        System.out.println("mode " + mode + ":");
        if (mode.equals("java")) {
            for (byte[] m : javaQueue) consumeJava(m, null);
        } else if (mode.equals("filtered")) {
            ObjectInputFilter allow = ObjectInputFilter.Config.createFilter(
                    "maxdepth=3;maxrefs=20;maxbytes=2048;maxarray=0;PayoutConsumer$TripCompleted;!*");
            for (byte[] m : javaQueue) consumeJava(m, allow);
        } else {
            List<String> jsonQueue = List.of(
                    "{\\"type\\":\\"trip.completed.v1\\",\\"data\\":{\\"tripId\\":\\"T-81\\",\\"driverId\\":\\"D-104233\\",\\"farePaise\\":24000}}",
                    "{\\"type\\":\\"maintenance.task\\",\\"data\\":{\\"command\\":\\"purge payout ledger\\"}}",
                    "{\\"type\\":\\"trip.completed.v1\\",\\"data\\":{\\"tripId\\":\\"T-82\\",\\"driverId\\":\\"D-104410\\",\\"farePaise\\":18000}}");
            for (String m : jsonQueue) consumeJson(m.getBytes(StandardCharsets.UTF_8));
        }
        System.out.println("  paid " + paidPaise + " paise, dead letters " + deadLetters.size());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -cp $JACKSON PayoutConsumer.java
for mode in java filtered json; do java -cp $JACKSON:. PayoutConsumer $mode; done`,
        },
        {
          type: "output",
          text: `mode java:
    paid D-104233 19200 paise for T-81
    !! MaintenanceTask.readObject ran, would execute: purge payout ledger
    dead-lettered: java.lang.ClassCastException: class PayoutConsumer$MaintenanceTask cannot be cast to class PayoutConsumer$TripCompleted (PayoutConsumer$MaintenanceTask and PayoutConsumer$TripCompleted are in unnamed module of loader 'app')
    paid D-104410 14400 paise for T-82
  paid 33600 paise, dead letters 1
mode filtered:
    paid D-104233 19200 paise for T-81
    dead-lettered: java.io.InvalidClassException: filter status: REJECTED
    paid D-104410 14400 paise for T-82
  paid 33600 paise, dead letters 1
mode json:
    paid D-104233 19200 paise for T-81
    dead-lettered: unknown event type 'maintenance.task'
    paid D-104410 14400 paise for T-82
  paid 33600 paise, dead letters 1`,
        },
        {
          type: "list",
          items: [
            "**Release 1 (`java`).** The unexpected `MaintenanceTask` was deserialized and its `readObject` ran (`!! ... would execute: purge payout ledger`), then the cast failed and the message was dead-lettered. The log showed a harmless-looking `ClassCastException`; the real event was the line before it. In the incident review, nobody had connected those two until the tester pointed it out.",
            "**Release 2 (`filtered`), the same-day mitigation.** A per-stream filter `maxdepth=3;maxrefs=20;maxbytes=2048;maxarray=0;PayoutConsumer$TripCompleted;!*`: exactly one class, and limits sized to a real event (a serialized `TripCompleted` is 133 bytes, with no arrays). The unexpected message was rejected **before** `MaintenanceTask` was instantiated; the genuine events were paid as before. `String` fields need no entry because strings aren't filtered. We also added `-Djdk.serialFilter` with conservative limits for the whole service, since other libraries in it used `ObjectInputStream` too.",
            "**Release 3 (`json`), the real fix.** Events became JSON envelopes with a logical `type` (`trip.completed.v1`) and a `data` object mapped onto an explicit `TripCompletedV1` record. The consumer handles the types it knows and dead-letters the rest; there's no way for a message to name a Java class. Validation (fare not negative, driver present) moved into explicit checks at the boundary. The producer and consumer could now be deployed independently, and a Go service in the analytics team started consuming the same events without a Java JAR.",
            "**Migration without downtime.** For two weeks the producer published both formats, on separate topics; the consumer read JSON first and the filtered Java stream as a fallback, comparing payouts between them. Once the counts matched, the Java topic and the shared event JAR were deleted.",
            "**What I'd check in any codebase.** Search for `ObjectInputStream`, `readObject(`, `XMLDecoder` and `enableDefaultTyping`; check frameworks that deserialize implicitly (JMX/RMI ports, some session stores, older remoting libraries); look for `rO0AB` (Base64) or `ac ed 00 05` in HTTP traffic and cookies; and set `jdk.serialFilter` limits everywhere as a backstop.",
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
              question: "Why is Java deserialization of untrusted data considered dangerous?",
              answer:
                "Because the bytes decide which classes are instantiated and what their fields contain, and deserialization runs code from those classes: their `readObject`, `readResolve`, and methods like `hashCode` or `compare` that collections call while rebuilding themselves. A sender can combine existing classes on the classpath (gadgets) so that this code does something harmful, up to running commands. My `GadgetDemo` wrote a file chosen by the sender before the receiver's cast failed.",
            },
            {
              question: "Doesn't the cast to the expected type protect me?",
              answer:
                "No. The cast runs after `readObject` returns, and by then the entire object graph has been built and every `readObject` method in it has run. `BeforeTheCast` printed the stack from inside the unexpected class's `readObject`, then threw `ClassCastException`. The check has to happen inside the stream, with an `ObjectInputFilter`.",
            },
            {
              question: "What is a gadget chain?",
              answer:
                "A sequence of ordinary, non-buggy classes that the attacker connects through field values so that deserializing the first triggers the next, ending in a class whose method has a dangerous effect. My harmless chain used `PriorityQueue` (its `readObject` calls the comparator), a serializable comparator that calls a method on its field, and a sink that prints. Real chains used libraries like Apache Commons Collections whose classes could invoke arbitrary methods by name.",
            },
            {
              question: "What is ObjectInputFilter?",
              answer:
                "An interface added in Java 9 (JEP 290) that `ObjectInputStream` consults for every class descriptor, array, back-reference and depth step, before creating anything. It returns `ALLOWED`, `REJECTED` or `UNDECIDED`. Filters are set per stream with `setObjectInputFilter`, JVM-wide with `-Djdk.serialFilter`, and since Java 17 through a filter factory. A rejection throws `InvalidClassException: filter status: REJECTED`.",
            },
            {
              question: "What are safer alternatives to Java serialization?",
              answer:
                "Formats where the receiver decides the types: JSON with explicit DTO classes (Jackson, without default typing), Protocol Buffers or Avro with schemas, or a hand-written binary format for internal use. They also make schema evolution explicit. I measured JSON at about 2.5 times the size of Java serialization for 100,000 trips, but nearly the same once gzipped.",
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
              question: "How do you write a good deserialization filter?",
              answer:
                "As an allow-list: the exact classes the stream should contain, then `!*` so everything else is rejected, plus limits: `maxdepth`, `maxrefs`, `maxbytes`, `maxarray`. Test it with real messages, because JDK collections check internal arrays: `List.of` needed `java.lang.Object` (for its `Object[]`) and `HashMap` needed `Map.Entry`. Set it before the first read, log rejections through the `java.io.serialization` logger, and keep a JVM-wide baseline in `jdk.serialFilter`.",
            },
            {
              question: "What does the JDK 17 filter factory add?",
              answer:
                "JEP 415 lets an application install a `BinaryOperator<ObjectInputFilter>` that is called for every new stream (with the JVM-wide filter) and every `setObjectInputFilter` call (with the current and requested filters). It can pick a filter per context, for example from a `ThreadLocal` set by a message listener, and combine filters with `merge` and `rejectUndecidedClass` instead of the last one winning. It can be set only once, or named with `-Djdk.serialFilterFactory`.",
            },
            {
              question: "What is a deserialization bomb, and how do you stop it?",
              answer:
                "A small stream that makes the reader do enormous work. The classic is nested `HashSet`s where each level shares two child sets: the stream is tiny thanks to back-references, but rebuilding the sets calls `hashCode` 2^n times. My 26-level stream (1,524 bytes) took over 4 seconds and a 100-level one (5,742 bytes) would never finish. Class allow-lists don't help because `HashSet` and `String` are harmless types; `maxdepth=20` rejected it in about 3 ms.",
            },
            {
              question: "How can deserialization break an immutable class's invariants?",
              answer:
                "Two ways. Tampered bytes: constructor validation never runs, so a patched field value is accepted (`PlainFare[-500]`). Rogue references: extra back-references appended to the stream point at the object's private mutable components, so the attacker can change them later (`TripWindow` lasting -180 minutes). Defences: validate in `readObject`, make defensive copies of mutable fields there before validating, use immutable component types, or use the serialization proxy pattern or a record.",
            },
            {
              question: "Explain the serialization proxy pattern.",
              answer:
                "The class's `writeReplace` returns a small private proxy holding only the logical state; the proxy's `readResolve` rebuilds the real object through its public constructor or factory, so all validation runs; and the real class's `readObject` throws `InvalidObjectException`, so a forged stream that names the real class directly is rejected. My tampered proxy stream failed with the constructor's `IllegalArgumentException`, and a forged direct stream with \"proxy required\". It doesn't suit extendable classes or self-referencing graphs.",
            },
            {
              question: "What does FAIL_ON_UNKNOWN_PROPERTIES do in Jackson, and how should you set it?",
              answer:
                "When enabled (the Jackson 2.x default), a JSON property the target class doesn't know fails with `UnrecognizedPropertyException`. For consumers of events from other teams I disable it (or use `@JsonIgnoreProperties(ignoreUnknown = true)`) so producers can add fields without breaking consumers. For required fields I enable `FAIL_ON_MISSING_CREATOR_PROPERTIES`, because otherwise a missing `farePaise` silently becomes 0, which I saw in my test.",
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
              question: "At which points in ObjectInputStream is the filter called?",
              answer:
                "In `readNonProxyDesc` after resolving each new class (before allocation), in `readArray` with the declared length before allocating, in `readHandle` for back-references (no class, limits only), for proxy classes and their interfaces, and through `checkArray` from collections such as `ArrayList`, `HashMap` and `CollSer` before they allocate internal arrays. Strings are never passed to it. My spy filter showed each call with its depth, reference count and byte position.",
            },
            {
              question: "Is a pattern filter's order significant?",
              answer:
                "For class patterns, yes: they're evaluated left to right and the first match decides, so `!*` must be last. Limits are different: they're checked before any class pattern regardless of where they appear, and exceeding any limit rejects. Whitespace is part of the pattern. Unmatched classes are `UNDECIDED`, which a stream treats as allowed unless the filter is wrapped in `rejectUndecidedClass` or ends with `!*`.",
            },
            {
              question: "Why does a `!*` filter still let an int[] or a String through?",
              answer:
                "Strings are written as `TC_STRING` and are never passed to the filter at all. For arrays, a pattern filter matches the element type, and a primitive element type matches no class-name pattern, so it's undecided rather than rejected. I verified both: with `!*`, `\"hello\"` and an `int[]` were read, and an `Integer` was rejected. `maxarray` and `maxbytes` still bound them.",
            },
            {
              question: "Why is Externalizable not more secure than Serializable?",
              answer:
                "It still instantiates whatever class the stream names (it must have a public no-arg constructor) and runs its `readExternal`, so it's equally a gadget surface. Worse, `readExternal` is public: any code holding the object can call it again with chosen bytes, so an `Externalizable` class can't be immutable. My `ExternalizableHole` overwrote an approved payout in place. Fields also can't be `final`.",
            },
            {
              question: "How can JSON libraries become vulnerable in the same way?",
              answer:
                "When they let the input choose the class: Jackson's `enableDefaultTyping` or `@JsonTypeInfo(use = Id.CLASS)` on broad types like `Object` read a class name from the JSON and instantiate it, and setters or constructors of such classes became gadgets, producing many CVEs until Jackson 2.10 introduced `PolymorphicTypeValidator` and deprecated `enableDefaultTyping`. The safe form is logical type names with a closed list of subtypes, or explicit DTOs without polymorphism.",
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
              question: "A security scan finds an internal service that reads Java-serialized messages from a queue. You can't migrate it this week. What do you do today?",
              answer:
                "Add a per-stream allow-list filter with exact message classes, `!*`, and limits sized to real messages (I used `maxdepth=3;maxrefs=20;maxbytes=2048;maxarray=0` for a 133-byte event), set before `readObject`. Add a JVM-wide `jdk.serialFilter` with limits as a backstop for library code. Log and alert on rejections. Restrict who can publish to the queue. In my rebuild, the unexpected class was rejected before its `readObject` ran, while genuine events were still processed. Then plan the move to JSON or Protobuf with explicit DTOs.",
            },
            {
              question: "A request with a 5 KB body pins a CPU core at 100% until the pod is killed. The endpoint deserializes Java objects and has a class allow-list. What's happening?",
              answer:
                "Most likely a deserialization bomb: nested `HashSet`s (or `HashMap`s) sharing children, whose reconstruction calls `hashCode` exponentially many times. The allow-list doesn't help because the classes are ordinary collections. My measurements: 1.5 KB took over 4 seconds; 5.7 KB would never finish. Add `maxdepth` (20 rejected it in about 3 ms), `maxrefs`, `maxbytes` and `maxarray`, and move off Java serialization.",
            },
            {
              question: "Your filter rejects perfectly normal messages after a developer changed a field from ArrayList to List.of. Why?",
              answer:
                "`List.of` serializes through `java.util.CollSer`, and its `readObject` asks the filter to approve an `Object[]` before allocating it; a pattern filter matches arrays by element type, so `java.lang.Object` must be allowed, plus `java.util.CollSer` and the `ImmutableCollections` classes. My `FilterDemo` failed the same way until I added them. Fix the allow-list deliberately, and keep a test that round-trips real messages through the production filter.",
            },
            {
              question: "A deserialized TripWindow has a negative duration, though its constructor rejects that and its fields are final. How is that possible, and how do you fix it?",
              answer:
                "Deserialization doesn't run the constructor, so either the bytes were tampered with, or an attacker appended back-references to the object's internal `Date`s and changed them afterwards (my `RogueReference` produced -180 minutes). Fix: in `readObject`, copy each mutable component and validate the copies (fields become non-final), or switch to immutable types like `Instant`, or use a serialization proxy or a record so the constructor validates every read.",
            },
            {
              question: "Your team wants to migrate a shared cache from Java serialization to JSON. What do you watch out for?",
              answer:
                "Explicit DTOs separate from domain classes; a version or type marker per entry; `FAIL_ON_UNKNOWN_PROPERTIES` disabled so a rollback can read newer entries; defaults for new fields in the DTO's constructor; `FAIL_ON_MISSING_CREATOR_PROPERTIES` for truly required fields; no default typing. During the transition, read JSON first and fall back to the old format (behind a filter), treating any failure as a cache miss. My JSON session example read entries across releases 41 and 42 in both directions; sizes may grow, but gzip narrowed the gap to under 10% in my measurements.",
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
            "Write a `Serializable` class whose `readObject` prints a line, serialize it, and deserialize it in code that casts the result to `String`. Note the order of the print and the exception.",
            "Read a serialized `\"hello\"`, an `Integer.valueOf(5)` and an `int[]` through a stream whose filter is `Config.createFilter(\"!*\")`.",
            "Serialize `List.of(List.of(List.of(1)))` and read it with `java -Djdk.serialFilter=maxdepth=N` for N from 2 upwards. Find the smallest N that works.",
            "Put `System.setProperty(\"jdk.serialFilter\", \"maxdepth=3\")` as the first line of `main` and print `ObjectInputFilter.Config.getSerialFilter()`.",
            "Build the nested `HashSet` bomb with 22 levels, time `readObject`, then read it again with `maxdepth=20`.",
            "Deserialize `{\"id\":\"T-1\",\"extra\":true}` into `record Trip(String id)` with a default `ObjectMapper`, then with `@JsonIgnoreProperties(ignoreUnknown = true)` on the record.",
            "Run any program that gets a filter rejection with `java.io.serialization.level=FINE` in a logging config, and read the log line.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints the line first, then `ClassCastException`. Step 2 reads `hello` and the array, and rejects the `Integer` with `filter status: REJECTED`: strings are never filtered and primitive arrays don't match class patterns. Step 3: on JDK 21, `maxdepth=4` is still rejected and 5 is the first that works, deeper than the three visible levels suggest. Step 4 prints `null`: the property is read at startup. Step 5 takes a few hundred milliseconds (250 to 300 ms on my machine) and is rejected in a few milliseconds with the limit. Step 6 throws `UnrecognizedPropertyException: Unrecognized field \"extra\"` and then succeeds. Step 7 prints `FINE: ObjectInputFilter REJECTED: class ..., array length: -1, nRefs: 1, depth: 1, bytes: ...`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `DANGER     readObject builds WHATEVER class the bytes name (Class.forName)
           and runs its readObject / readResolve / hashCode / compare
           your cast runs LAST -> ClassCastException is too late
           gadget chain = harmless classes wired together by field values

FILTERS    ObjectInputFilter (Java 9, JEP 290): ALLOWED / REJECTED / UNDECIDED
           in.setObjectInputFilter(f)       per stream, before first read
           -Djdk.serialFilter=... / java.security   JVM-wide, read at startup
           setSerialFilterFactory (Java 17, JEP 415)   per-context, set once
           "maxdepth=..;maxrefs=..;maxbytes=..;maxarray=..;my.Cls;!*"
           rejected -> InvalidClassException: filter status: REJECTED
           checked: classes, arrays (incl. List.of/HashMap internals), refs
           not checked: Strings

BOMBS      nested HashSets: 5.7 KB stream, 2^n hashCode calls
           26 levels > 4 s; maxdepth=20 rejects in ~3 ms

INVARIANTS constructors skipped -> tampered values accepted
           rogue back-refs -> defensive copies in readObject
           serialization proxy / records -> constructor validates

ALTERNATIVE JSON + explicit DTOs: input can't choose classes
           FAIL_ON_UNKNOWN_PROPERTIES off for consumers
           FAIL_ON_MISSING_CREATOR_PROPERTIES for required fields
           never default typing / Id.CLASS
           100k trips: Java 5.1 MB, JSON 12.7 MB, manual 4.85 MB; gzip ~1.5 MB each`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Java deserialization lets the input choose classes and runs their code before your cast; that's the root of gadget chains, and no amount of checking the result fixes it.",
            "Where it can't be avoided, an allow-list `ObjectInputFilter` with limits stops unexpected classes before they're instantiated and stops bombs before they explode; records and the serialization proxy keep invariants; defensive copies stop rogue references. Where it can be avoided, JSON or a schema-based format with explicit DTOs removes the problem and makes evolution explicit.",
            "With this lesson the Serialization phase is complete. Next comes Reflection: inspecting and using classes, fields, methods and constructors at runtime, the same machinery serialization used throughout these two lessons, and what frameworks build on it.",
          ],
        },
      ],
    },
  ],
};
