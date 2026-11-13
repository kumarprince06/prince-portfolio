import type { Lesson } from "../types";

export const serialization: Lesson = {
  slug: "serialization",
  date: "2026-11-13",
  title: "Java Serialization: How Objects Become Bytes",
  description:
    "Java object serialization on JDK 21, byte by byte: the Serializable marker interface, ObjectOutputStream and ObjectInputStream, a 92-byte stream dumped with xxd (ac ed 00 05, TC_OBJECT, the class descriptor, field values), serialVersionUID computed by serialver and an InvalidClassException from adding one field, transient and static fields, shared references and cycles through the handle table, constructors skipped except the first non-serializable superclass's (seen in a stack trace), writeObject and readObject hooks, readResolve, writeReplace and enums by name, Externalizable, NotSerializableException, records deserialized through their canonical constructor, sizes measured against a hand-written format, and a ride-hailing session cache that logged out every rider after a deploy added one field.",
  tags: ["Core Java", "Serialization", "serialVersionUID", "I/O"],
  sections: [
    {
      title: "What Serialization Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, java.nio.file: Paths, Files and Large Files, ended the File Handling phase with bytes moving between memory and disk: `Files.write`, `Files.newOutputStream`, channels and buffers. Everything there was already bytes or text. A Java program's real state isn't: it's a graph of objects on the heap, with references between them, and none of that can be written to a file or a socket as it is, because a reference is an address that means nothing outside this JVM.",
        },
        {
          type: "paragraph",
          text: "**Serialization** turns an object graph into a sequence of bytes; **deserialization** turns those bytes back into a new, equivalent graph. Java has a built-in mechanism for this since JDK 1.1: a class opts in by implementing the **marker interface** `java.io.Serializable` (no methods at all), `ObjectOutputStream.writeObject` writes an object and everything it references, and `ObjectInputStream.readObject` builds a copy. It powers RMI, HTTP session replication in servlet containers, some caches and message queues, and it is how `ArrayList`, `HashMap` and `String` travel between JVMs.",
        },
        {
          type: "paragraph",
          text: "It looks like one method call, but it has its own rules: what gets written (fields, not code; class names, not classes), which constructors run on the way back (almost none), how a class is versioned (`serialVersionUID`), what is skipped (`transient`, `static`), and how a class can take over (`writeObject`, `readResolve`, `Externalizable`). This lesson takes the stream apart byte by byte and rebuilds each rule with a program. The next lesson covers why reading untrusted serialized data is dangerous, how filters defend against it, and what to use instead.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java Object Serialization arrived in JDK 1.1 (February 1997), together with RMI (Remote Method Invocation), which needed to send arguments and return values between JVMs, and JavaBeans, which needed to save configured components. The design goal was transparency: make a class `Serializable` and the runtime handles the rest, using reflection to read and write private fields. That transparency is both why it was easy to adopt and why it is hard to evolve and secure, as these two lessons show.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["JDK 1.1 (1997)", "`Serializable`, `Externalizable`, `ObjectOutputStream`/`ObjectInputStream`, `serialVersionUID`, the `serialver` tool", "Everything in this lesson starts here"],
            ["JDK 1.2 (1998)", "Stream protocol version 2; `writeReplace`/`readResolve`; `serialPersistentFields`, `putFields`/`readFields`", "Singletons and proxies; a wire format separate from field names"],
            ["JDK 1.4 (2002)", "`writeUnshared`/`readUnshared`", "Writing an object without back-references"],
            ["Java 5 (2004)", "Enums serialized by name (`TC_ENUM`)", "Enum constants stay singletons (Enums phase)"],
            ["Java 9 (2017)", "`ObjectInputFilter` (JEP 290), also backported to 8u121", "Next lesson"],
            ["Java 14 (2020)", "`@java.io.Serial` annotation; records preview", "The compiler can check serialization members"],
            ["Java 16 (2021)", "Records final (JEP 395): deserialized through the canonical constructor", "The one kind of class whose constructor runs"],
            ["Java 17 (2021)", "Context-specific filters and a filter factory (JEP 415)", "Next lesson"],
            ["Java 18 (2022)", "`-Xlint:serial` checks more mistakes (wrong hook modifiers, non-serializable field types, hooks in records)", "Shown in Common Mistakes"],
          ],
        },
        {
          type: "paragraph",
          text: "The stream format itself has barely changed since 1998: `STREAM_VERSION` is still 5, and a file written by JDK 1.2 can be read by JDK 21 if the classes still match. That stability is a strength for long-lived data and the root of the versioning problem in the production section.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of moving house with flat-pack furniture.",
        },
        {
          type: "list",
          items: [
            "**Serializing** is taking a built wardrobe apart and packing it into a flat box. What goes in the box are parts and measurements (field values), not the carpentry skill (methods, code). The skill already exists at the destination: the class must be on the other JVM's classpath.",
            "**The label on the box** names the model and its revision: that's the class name and the `serialVersionUID`. If the shop at the destination has a newer revision of the model with different holes drilled, the fitter refuses to assemble it: `InvalidClassException`.",
            "**Parts shared by two pieces of furniture** (one shelf bracket holding two shelves) are packed once, and the second piece says \"see bracket 3\". That's a back-reference: shared objects and cycles survive the trip.",
            "**Things I take out before packing** (batteries, the key in the lock) are `transient` fields: they arrive empty.",
            "**The fitter doesn't go back to the factory**: they assemble from the parts in the box without running the factory process (the constructor). Whatever checks the factory does are skipped unless the instructions in the box (`readObject`) repeat them.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real fitter looks at the box and can tell a wardrobe from something dangerous. `ObjectInputStream` builds **whatever the label says**, as long as that class exists on its classpath, and runs that class's own assembly instructions while doing it. The analogy hides exactly the property that makes deserialization a security problem, which is the next lesson.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "A first round trip",
        },
        {
          type: "code",
          language: "java",
          title: "RoundTrip.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class RoundTrip {
    static class Rider implements Serializable {
        private static final long serialVersionUID = 1L;
        final String name;
        final String zone;
        final List<Long> recentFaresPaise = new ArrayList<>();
        Rider(String name, String zone) { this.name = name; this.zone = zone; }
        public String toString() { return name + "@" + zone + " " + recentFaresPaise; }
    }

    public static void main(String[] args) throws Exception {
        Rider asha = new Rider("Asha", "SALT-LAKE");
        asha.recentFaresPaise.add(14_500L);
        asha.recentFaresPaise.add(8_000L);

        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
            out.writeObject(asha);                       // object -> bytes
        }
        byte[] data = bytes.toByteArray();
        System.out.println("serialized to " + data.length + " bytes");

        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) {
            Rider copy = (Rider) in.readObject();        // bytes -> a NEW object
            System.out.println("read back: " + copy);
            System.out.println("same object? " + (copy == asha) + ", same class? " + (copy.getClass() == asha.getClass()));
        }
        System.out.println("Rider is Serializable: " + (asha instanceof Serializable)
                + ", methods in Serializable: " + Serializable.class.getDeclaredMethods().length);
    }
}`,
        },
        {
          type: "output",
          text: `serialized to 279 bytes
read back: Asha@SALT-LAKE [14500, 8000]
same object? false, same class? true
Rider is Serializable: true, methods in Serializable: 0`,
        },
        {
          type: "list",
          items: [
            "`implements Serializable` is the whole opt-in. The interface has **zero methods** (the program counts them): it's a marker that tells `ObjectOutputStream` \"this class agrees to have its fields written\". Without it, `writeObject` throws `NotSerializableException`.",
            "`writeObject(asha)` wrote the `Rider`, its two `String`s, the `ArrayList` and both `Long`s: the whole reachable graph, 279 bytes.",
            "`readObject` returned a **new object** (`copy == asha` is `false`) of the same class, with equal state. It returns `Object`, so the caller casts; the cast happens after the object has been fully built, which matters in the next lesson.",
            "`ArrayList`, `Long` and `String` are all `Serializable` themselves; if any object in the graph weren't, the whole write would fail.",
          ],
        },
        {
          type: "heading",
          text: "The pieces",
        },
        {
          type: "table",
          headers: ["Piece", "Role"],
          rows: [
            ["`java.io.Serializable`", "Marker interface: the class's non-`static`, non-`transient` fields may be written"],
            ["`ObjectOutputStream`", "`writeObject(o)` writes `o` and its graph; also `writeInt`, `writeUTF`... for primitives"],
            ["`ObjectInputStream`", "`readObject()` reads the next object; reads must mirror writes in order and type"],
            ["`serialVersionUID`", "`private static final long`: the class's version; checked on read"],
            ["`transient`", "Field modifier: not written, comes back as `0`/`false`/`null`"],
            ["`java.io.Externalizable`", "Sub-interface of `Serializable`: the class writes and reads everything itself"],
            ["`ObjectStreamClass`", "The descriptor of a serializable class: name, UID, fields, flags"],
            ["`@java.io.Serial`", "Annotation (Java 14+) for serialization members, so `javac` can check them"],
          ],
        },
        {
          type: "heading",
          text: "Methods a class can declare",
        },
        {
          type: "table",
          headers: ["Member", "Exact form", "Used for"],
          rows: [
            ["`serialVersionUID`", "`private static final long serialVersionUID`", "Version check on read"],
            ["`writeObject`", "`private void writeObject(ObjectOutputStream) throws IOException`", "Custom write of this class's part"],
            ["`readObject`", "`private void readObject(ObjectInputStream) throws IOException, ClassNotFoundException`", "Custom read, validation, rebuilding transient state"],
            ["`readObjectNoData`", "`private void readObjectNoData() throws ObjectStreamException`", "Stream has no data for this class (it was added as a superclass later)"],
            ["`writeReplace`", "`Object writeReplace() throws ObjectStreamException`, any access", "Write a different object instead"],
            ["`readResolve`", "`Object readResolve() throws ObjectStreamException`, any access", "Return a different object after reading"],
            ["`serialPersistentFields`", "`private static final ObjectStreamField[]`", "Declare the serialized fields explicitly"],
            ["`writeExternal`/`readExternal`", "`public`, from `Externalizable`", "Full manual control"],
          ],
        },
        {
          type: "paragraph",
          text: "These are found **by reflection, by exact name and signature**. They aren't inherited interface methods, so a typo or a wrong modifier means the method is silently ignored. The `@Serial` annotation plus `-Xlint:serial` is how to get the compiler to complain, shown in Common Mistakes.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The stream, byte by byte",
        },
        {
          type: "code",
          language: "java",
          title: "StreamDump.java",
          code: `import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HexFormat;

public class StreamDump {
    static class Fare implements Serializable {
        private static final long serialVersionUID = 1L;
        long paise;
        String zone;
        Fare(long paise, String zone) { this.paise = paise; this.zone = zone; }
    }

    static byte[] write(Object... objects) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
            for (Object o : objects) out.writeObject(o);
        }
        return bytes.toByteArray();
    }

    public static void main(String[] args) throws Exception {
        byte[] one = write(new Fare(14_500, "SALT-LAKE"));
        Files.write(Path.of("fare.ser"), one);
        System.out.println("one Fare: " + one.length + " bytes");
        System.out.println(HexFormat.ofDelimiter(" ").formatHex(one));

        byte[] two = write(new Fare(14_500, "SALT-LAKE"), new Fare(9_000, "NEW-TOWN"));
        System.out.println("two Fares: " + two.length + " bytes; the second one is:");
        System.out.println(HexFormat.ofDelimiter(" ").formatHex(two, one.length, two.length));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac StreamDump.java && java StreamDump
xxd fare.ser`,
        },
        {
          type: "output",
          text: `one Fare: 92 bytes
ac ed 00 05 73 72 00 0f 53 74 72 65 61 6d 44 75 6d 70 24 46 61 72 65 00 00 00 00 00 00 00 01 02 00 02 4a 00 05 70 61 69 73 65 4c 00 04 7a 6f 6e 65 74 00 12 4c 6a 61 76 61 2f 6c 61 6e 67 2f 53 74 72 69 6e 67 3b 78 70 00 00 00 00 00 00 38 a4 74 00 09 53 41 4c 54 2d 4c 41 4b 45
two Fares: 117 bytes; the second one is:
73 71 00 7e 00 00 00 00 00 00 00 00 23 28 74 00 08 4e 45 57 2d 54 4f 57 4e

00000000: aced 0005 7372 000f 5374 7265 616d 4475  ....sr..StreamDu
00000010: 6d70 2446 6172 6500 0000 0000 0000 0102  mp$Fare.........
00000020: 0002 4a00 0570 6169 7365 4c00 047a 6f6e  ..J..paiseL..zon
00000030: 6574 0012 4c6a 6176 612f 6c61 6e67 2f53  et..Ljava/lang/S
00000040: 7472 696e 673b 7870 0000 0000 0000 38a4  tring;xp......8.
00000050: 7400 0953 414c 542d 4c41 4b45            t..SALT-LAKE`,
        },
        {
          type: "image",
          src: "/images/java/serialization-stream-bytes.svg",
          alt: "The 92 bytes ObjectOutputStream wrote for new Fare(14500, \"SALT-LAKE\"), split into three groups. Stream header, 5 bytes: ac ed is STREAM_MAGIC, 00 05 is STREAM_VERSION 5, 73 is TC_OBJECT. Class descriptor, 67 bytes, written once per stream and later referenced by handle 0x7e0000: 72 TC_CLASSDESC; 00 0f followed by the 15-byte name StreamDump$Fare; the 8-byte serialVersionUID 00 00 00 00 00 00 00 01; flags 02 meaning SC_SERIALIZABLE (03 would add SC_WRITE_METHOD); 00 02 for two fields; 4a 00 05 paise for a long field named paise; 4c 00 04 zone for an object field named zone, followed by 74 00 12 Ljava/lang/String; as its type signature; 78 TC_ENDBLOCKDATA; 70 TC_NULL meaning no serializable superclass. Field values, 20 bytes, primitives first then objects, each group sorted by name: 00 00 00 00 00 00 38 a4 is paise 14500 big-endian, 74 00 09 SALT-LAKE is the zone string. A note says there are no getters, constructors or code in the stream, only names, types and values, and the reader trusts the stream to tell it which class to create. Total 5 + 67 + 20 = 92 bytes; a second Fare in the same stream is 25 bytes: 73, then a 5-byte back-reference 71 00 7e 00 00 to the descriptor, then its values.",
          caption: "Every serialized object carries its class's name, version and field layout; the values come last.",
        },
        {
          type: "list",
          items: [
            "**`ac ed 00 05`**: every Java serialization stream starts with the magic number `0xACED` and protocol version 5 (`ObjectStreamConstants.STREAM_MAGIC`, `STREAM_VERSION`). Seeing `rO0AB` at the start of a Base64 string is the same four bytes, and is how security scanners spot serialized Java in HTTP traffic and cookies.",
            "**`73 72`**: `TC_OBJECT`, then `TC_CLASSDESC`: a new object whose class is described inline. The descriptor is the class **name** as a string (`00 0f` = 15 bytes, `StreamDump$Fare`), the 8-byte **`serialVersionUID`** (here `1`), a **flags** byte (`02` = `SC_SERIALIZABLE`) and the **field list**: a type code (`4a` = `'J'` for `long`, `4c` = `'L'` for an object), the name, and for object fields the type signature as a string (`Ljava/lang/String;`).",
            "**`78 70`**: `TC_ENDBLOCKDATA` closes the class's annotation block, and `TC_NULL` says \"no serializable superclass\". With one, its whole descriptor would follow here, as `java.lang.Number` does for an `Integer`.",
            "**The values**: `paise` as 8 big-endian bytes (`0x38a4` = 14500), then `zone` as `TC_STRING` (`74`), a 2-byte length and the characters in modified UTF-8. Primitive values come first, then object values, each group sorted by field name, not in declaration order.",
            "**The descriptor costs 67 of the 92 bytes.** It's written once per stream: the second `Fare` was 25 bytes, `73` then `71 00 7e 00 00` (`TC_REFERENCE` to handle `0x7e0000`, the first thing assigned a handle), then its own values. One object per stream, as a cache does, pays the full descriptor every time; the Performance section measures it.",
            "**What's absent** is just as important: no bytecode, no method, no constructor call. The reader looks up the class by name in its own JVM and fills the fields in.",
          ],
        },
        {
          type: "heading",
          text: "The class descriptor, from Java",
        },
        {
          type: "code",
          language: "java",
          title: "Descriptor.java",
          code: `import java.io.ObjectStreamClass;
import java.io.ObjectStreamField;
import java.io.Serializable;
import java.util.ArrayList;

public class Descriptor {
    static class Trip implements Serializable {
        private static final long serialVersionUID = 7L;
        String riderName;
        long farePaise;
        String zone;
        boolean shared;
        int seats;
        transient String debugNote;
        static int created;
    }

    public static void main(String[] args) {
        ObjectStreamClass desc = ObjectStreamClass.lookup(Trip.class);
        System.out.println(desc.getName() + "  serialVersionUID=" + desc.getSerialVersionUID());
        for (ObjectStreamField f : desc.getFields()) {
            System.out.printf("  %c %-10s offset %s%n", f.getTypeCode(), f.getName(),
                    f.isPrimitive() ? String.valueOf(f.getOffset()) : "(object #" + f.getOffset() + ")");
        }
        System.out.println("same descriptor on second lookup? " + (desc == ObjectStreamClass.lookup(Trip.class)));
        System.out.println("ArrayList uid=" + ObjectStreamClass.lookup(ArrayList.class).getSerialVersionUID()
                + " fields=" + ObjectStreamClass.lookup(ArrayList.class).getFields().length);
        System.out.println("Thread: " + ObjectStreamClass.lookup(Thread.class));
    }
}`,
        },
        {
          type: "output",
          text: `Descriptor$Trip  serialVersionUID=7
  J farePaise  offset 0
  I seats      offset 8
  Z shared     offset 12
  L riderName  offset (object #0)
  L zone       offset (object #1)
same descriptor on second lookup? true
ArrayList uid=8683452581122892189 fields=1
Thread: null`,
        },
        {
          type: "list",
          items: [
            "`ObjectStreamClass.lookup` builds the descriptor that both streams use. Its field list is the serializable fields only: `transient debugNote` and `static created` aren't there.",
            "The order is the wire order: **primitives first** (`J`, `I`, `Z`), then objects, each sorted by name. The primitive offsets are positions in a byte buffer: the `long` at 0, the `int` at 8, the `boolean` at 12. `ObjectOutputStream` copies all primitive fields into one buffer through a `FieldReflector` (which uses `Unsafe` field offsets), then writes the object fields one by one, recursing into each.",
            "The descriptor is **cached per class** (the second lookup returned the same object), so reflection over the class's fields and methods happens once per JVM, not once per object.",
            "`Thread` isn't `Serializable`, so `lookup` returns `null`. `ArrayList` has a single serialized field (`size`): its `elementData` array is `transient`, and it writes its elements itself in a private `writeObject`, which the dump in the next section shows.",
          ],
        },
        {
          type: "heading",
          text: "Who builds the object on the way back",
        },
        {
          type: "code",
          language: "java",
          title: "WhoCalls.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class WhoCalls {
    static class Entity {                                       // not Serializable
        Entity() {
            System.out.println("Entity() called on a " + getClass().getSimpleName() + ", stack:");
            StackWalker.getInstance(StackWalker.Option.SHOW_REFLECT_FRAMES)
                    .forEach(f -> System.out.println("  at " + f));
        }
    }

    static class Rider extends Entity implements Serializable {
        private static final long serialVersionUID = 1L;
        String name = "Asha";
    }

    public static void main(String[] args) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(new Rider()); }
        System.out.println("--- reading ---");
        new ObjectInputStream(new ByteArrayInputStream(b.toByteArray())).readObject();
    }
}`,
        },
        {
          type: "output",
          text: `Entity() called on a Rider, stack:
  at WhoCalls$Entity.<init>(WhoCalls.java:12)
  at WhoCalls$Rider.<init>(WhoCalls.java:16)
  at WhoCalls.main(WhoCalls.java:23)
--- reading ---
Entity() called on a Rider, stack:
  at WhoCalls$Entity.<init>(WhoCalls.java:12)
  at jdk.internal.reflect.GeneratedSerializationConstructorAccessor1.newInstance(Unknown Source)
  at java.base/java.lang.reflect.Constructor.newInstanceWithCaller(Constructor.java:502)
  at java.base/java.lang.reflect.Constructor.newInstance(Constructor.java:486)
  at java.base/java.io.ObjectStreamClass.newInstance(ObjectStreamClass.java:1019)
  at java.base/java.io.ObjectInputStream.readOrdinaryObject(ObjectInputStream.java:2263)
  at java.base/java.io.ObjectInputStream.readObject0(ObjectInputStream.java:1762)
  at java.base/java.io.ObjectInputStream.readObject(ObjectInputStream.java:540)
  at java.base/java.io.ObjectInputStream.readObject(ObjectInputStream.java:498)
  at WhoCalls.main(WhoCalls.java:25)`,
        },
        {
          type: "list",
          items: [
            "When `Rider` is created normally, `Rider()` calls `Entity()`: the normal constructor chain.",
            "When it's deserialized, **`Rider`'s constructor never runs**. The JDK asks `ReflectionFactory` for a special **serialization constructor**: a generated accessor (`GeneratedSerializationConstructorAccessor1`) that allocates an object of class `Rider` but invokes the no-arg constructor of the **first non-serializable superclass**, here `Entity()`. That's why `getClass()` inside `Entity()` says `Rider`.",
            "Then `readSerialData` fills the fields of each serializable class in the hierarchy, superclass first, writing directly into the fields (even `final` ones) through `Unsafe`. No setters, no initialisers.",
            "JDK 18 reimplemented core reflection on method handles (JEP 416), but this one path still uses generated bytecode accessors, as the stack shows on JDK 21.",
            "The full read path is `readObject` → `readObject0` (a `switch` on the tag byte) → `readOrdinaryObject` → `readClassDesc` (resolve the class by name with `Class.forName(name, false, loader)`) → `ObjectStreamClass.newInstance` → `readSerialData` (field values or the class's `readObject`) → `readResolve` if present. The write path mirrors it: `writeObject0` → `writeReplace` → handle lookup → `writeOrdinaryObject` → `writeClassDesc` → `writeSerialData`.",
          ],
        },
      ],
    },
    {
      title: "serialVersionUID and Versioning",
      blocks: [
        {
          type: "paragraph",
          text: "Every class descriptor carries a `serialVersionUID`, and `readObject` refuses to read a stream whose UID differs from the local class's. If a class doesn't declare one, the JVM **computes** it from the class's structure. I compiled two versions of a class without a UID, wrote with the first and read with the second:",
        },
        {
          type: "code",
          language: "java",
          title: "v1/Fare.java",
          code: `import java.io.Serializable;

public class Fare implements Serializable {
    long paise;
    String zone;
    public Fare(long paise, String zone) { this.paise = paise; this.zone = zone; }
    public String toString() { return "Fare[" + paise + " paise, " + zone + "]"; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "v2/Fare.java",
          code: `import java.io.Serializable;

public class Fare implements Serializable {
    long paise;
    String zone;
    String couponCode;                           // the only change: one new field
    public Fare(long paise, String zone) { this.paise = paise; this.zone = zone; }
    public String toString() { return "Fare[" + paise + " paise, " + zone + ", coupon " + couponCode + "]"; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "WriteFare.java",
          code: `import java.io.ObjectOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

public class WriteFare {
    public static void main(String[] args) throws Exception {
        try (ObjectOutputStream out = new ObjectOutputStream(Files.newOutputStream(Path.of("fare.ser")))) {
            out.writeObject(new Fare(14_500, "SALT-LAKE"));
        }
        System.out.println("wrote " + Files.size(Path.of("fare.ser")) + " bytes");
    }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "ReadFare.java",
          code: `import java.io.InvalidClassException;
import java.io.ObjectInputStream;
import java.nio.file.Files;
import java.nio.file.Path;

public class ReadFare {
    public static void main(String[] args) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(Files.newInputStream(Path.of("fare.ser")))) {
            System.out.println("read " + in.readObject());
        } catch (InvalidClassException e) {
            System.out.println(e);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d v1 v1/Fare.java WriteFare.java ReadFare.java
javac -d v2 v2/Fare.java ReadFare.java
java -cp v1 WriteFare && java -cp v1 ReadFare
java -cp v2 ReadFare
serialver -classpath v1 Fare
serialver -classpath v2 Fare`,
        },
        {
          type: "output",
          text: `wrote 81 bytes
read Fare[14500 paise, SALT-LAKE]
java.io.InvalidClassException: Fare; local class incompatible: stream classdesc serialVersionUID = 6925918969697765721, local class serialVersionUID = 2205812759625914248
Fare:    private static final long serialVersionUID = 6925918969697765721L;
Fare:    private static final long serialVersionUID = 2205812759625914248L;`,
        },
        {
          type: "list",
          items: [
            "One added field changed the computed UID from `6925918969697765721` to `2205812759625914248`, and reading the old bytes with the new class failed with `InvalidClassException: local class incompatible`. The field was harmless; the check fails anyway, because the UID is a hash of the class's shape.",
            "`serialver` (in the JDK's `bin`) prints the UID that would be computed, in a form ready to paste. It's the tool for rescuing a class that shipped without one.",
          ],
        },
        {
          type: "paragraph",
          text: "The fix is to declare the UID, with the value that the old version computed, so old streams still match:",
        },
        {
          type: "code",
          language: "java",
          title: "v3/Fare.java",
          code: `import java.io.Serializable;

public class Fare implements Serializable {
    private static final long serialVersionUID = 6925918969697765721L;   // v1's computed value
    long paise;
    String zone;
    String couponCode;                           // the only change: one new field
    public Fare(long paise, String zone) { this.paise = paise; this.zone = zone; }
    public String toString() { return "Fare[" + paise + " paise, " + zone + ", coupon " + couponCode + "]"; }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d v3 v3/Fare.java ReadFare.java && java -cp v3 ReadFare`,
        },
        {
          type: "output",
          text: `read Fare[14500 paise, SALT-LAKE, coupon null]`,
        },
        {
          type: "paragraph",
          text: "With matching UIDs, the read is field by field by name: `paise` and `zone` came from the stream, and `couponCode`, which the stream doesn't have, was left at its default, `null`. No constructor or initialiser ran to set it.",
        },
        {
          type: "heading",
          text: "What changes the computed value",
        },
        {
          type: "paragraph",
          text: "The default UID is the first 8 bytes of a SHA-1 hash over the class name, its modifiers, its interfaces, its non-private-static and non-private-transient fields with their modifiers, whether it has a static initialiser, and its non-private constructors and methods. I recompiled `v1/Fare.java` with one change at a time and ran `serialver`:",
        },
        {
          type: "table",
          headers: ["Change to v1 Fare", "Computed serialVersionUID", "Same as v1?"],
          rows: [
            ["None (v1)", "`6925918969697765721`", "-"],
            ["Add a field `String couponCode` (v2)", "`2205812759625914248`", "No"],
            ["Add a `public` method `isAirport()`", "`7911857436534829391`", "No"],
            ["Add the same method as `private`", "`6925918969697765721`", "Yes"],
            ["Add `static final List<String> ZONES = List.of(...)` (adds a static initialiser)", "`-8188156228891843156`", "No"],
            ["Make `paise` `private`", "`3900149775487053686`", "No"],
          ],
        },
        {
          type: "paragraph",
          text: "Adding a public helper method, which can't possibly affect the stored data, breaks every stored object. The serialization specification itself recommends declaring the UID explicitly, partly because the computation also depends on compiler details such as synthetic members. With an explicit UID, compatibility is decided by the actual fields:",
        },
        {
          type: "table",
          headers: ["Change (explicit, unchanged UID)", "Reading an old stream", "Measured"],
          rows: [
            ["Add a field", "Works; the new field gets its default (`0`/`null`)", "`coupon null` above"],
            ["Remove a field", "Works; the stream's value is read and discarded", "`Fare[SALT-LAKE]` with `paise` removed"],
            ["Change a field's type (`long` to `int`)", "`InvalidClassException: Fare; incompatible types for field paise`", "Yes"],
            ["Rename a field", "Old value lost (treated as remove + add) unless `serialPersistentFields` keeps the old name", "Example 3"],
            ["Change the class's package or name", "`ClassNotFoundException`: the name is in the stream", "-"],
            ["Change the superclass chain, or `Serializable` to `Externalizable`", "Incompatible", "-"],
          ],
        },
        {
          type: "paragraph",
          text: "The specification lists removing a field as incompatible even though the read succeeds, because an older version reading a newer stream will see that field at its default, which may break the older code's assumptions. Compatibility in both directions is a design decision, not something the UID gives for free.",
        },
      ],
    },
    {
      title: "transient and static Fields",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "TransientStatic.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class TransientStatic {
    static class DriverSession implements Serializable {
        private static final long serialVersionUID = 1L;
        static int activeSessions = 0;                 // belongs to the class, not the object
        final String driverId;
        transient String otp;                          // never written
        transient int cachedRating = -1;               // initialiser is NOT re-run on read
        transient Thread heartbeat = new Thread(() -> { });
        DriverSession(String driverId, String otp) {
            this.driverId = driverId;
            this.otp = otp;
            this.cachedRating = 47;
            activeSessions++;
        }
    }

    static byte[] write(Object o) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    static Object read(byte[] data) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) { return in.readObject(); }
    }

    public static void main(String[] args) throws Exception {
        DriverSession s = new DriverSession("D-104233", "7731");
        byte[] data = write(s);
        String raw = new String(data, java.nio.charset.StandardCharsets.ISO_8859_1);
        System.out.println(data.length + " bytes; OTP in stream? " + raw.contains("7731")
                + ", field names: driverId " + raw.contains("driverId") + ", otp " + raw.contains("otp")
                + ", activeSessions " + raw.contains("activeSessions"));

        DriverSession.activeSessions = 99;             // change the static after writing
        DriverSession back = (DriverSession) read(data);
        System.out.println("driverId     = " + back.driverId);
        System.out.println("otp          = " + back.otp);
        System.out.println("cachedRating = " + back.cachedRating + "  (not -1, not 47: the default for int)");
        System.out.println("heartbeat    = " + back.heartbeat);
        System.out.println("activeSessions = " + DriverSession.activeSessions + "  (whatever this JVM has)");
    }
}`,
        },
        {
          type: "output",
          text: `93 bytes; OTP in stream? false, field names: driverId true, otp false, activeSessions false
driverId     = D-104233
otp          = null
cachedRating = 0  (not -1, not 47: the default for int)
heartbeat    = null
activeSessions = 99  (whatever this JVM has)`,
        },
        {
          type: "list",
          items: [
            "**`transient` fields are not written at all**: the OTP isn't in the stream (not even the field name `otp`). Use it for secrets, caches, derived values, and anything that isn't data: threads, sockets, connections, locks, loggers.",
            "**They come back as the type's default, not the initialiser's value.** `cachedRating` was declared `= -1` and set to 47; it came back as `0`. Field initialisers and constructors don't run for a serializable class on deserialization, so `-1` is never assigned. If a transient field needs a value, set it in `readObject` (next sections) or compute it lazily.",
            "**`static` fields are never serialized**: they belong to the class, not the object, and there's no field `activeSessions` in the stream. After reading, `DriverSession.activeSessions` is whatever this JVM has (99). A common interview trap: \"I serialized a static counter and it came back right\" usually means it was read in the same JVM.",
            "`serialVersionUID` is the exception that proves the rule: it's `static`, but it's read once per class and written into the descriptor, not per object.",
            "A `transient final` field is a trap: after deserialization it's `null`/`0` and, being `final`, can't be reassigned in `readObject` without reflection. Make such fields non-final, or use `readResolve` to build a fully constructed replacement.",
          ],
        },
      ],
    },
    {
      title: "Object Graphs, Shared References and Cycles",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "ObjectGraph.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

public class ObjectGraph {
    static class Zone implements Serializable {
        private static final long serialVersionUID = 1L;
        String name;
        Zone(String name) { this.name = name; }
    }

    static class Driver implements Serializable {
        private static final long serialVersionUID = 1L;
        String name;
        Zone zone;
        Driver partner;                                   // may point back: a cycle
        Driver(String name, Zone zone) { this.name = name; this.zone = zone; }
    }

    public static void main(String[] args) throws Exception {
        Zone saltLake = new Zone("SALT-LAKE");
        Driver ravi = new Driver("Ravi", saltLake);
        Driver asha = new Driver("Asha", saltLake);       // both share one Zone
        ravi.partner = asha;
        asha.partner = ravi;                              // cycle: ravi -> asha -> ravi

        List<Driver> shift = new ArrayList<>(List.of(ravi, asha));
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(shift); }
        byte[] data = b.toByteArray();
        Files.write(Path.of("shift.ser"), data);

        @SuppressWarnings("unchecked")
        List<Driver> back = (List<Driver>) new ObjectInputStream(new ByteArrayInputStream(data)).readObject();
        Driver r = back.get(0), a = back.get(1);
        System.out.println("bytes: " + data.length);
        System.out.println("zone shared after read?   " + (r.zone == a.zone));
        System.out.println("cycle intact?             " + (r.partner == a && a.partner == r));
        System.out.println("new objects?              " + (r != ravi && r.zone != saltLake));

        String hex = HexFormat.of().formatHex(data);
        System.out.println("back-references (71 00 7e ..): " + (hex.split("71007e", -1).length - 1));

        // The same object written twice into one stream
        ByteArrayOutputStream once = new ByteArrayOutputStream(), twice = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(once)) { out.writeObject(ravi); }
        try (ObjectOutputStream out = new ObjectOutputStream(twice)) { out.writeObject(ravi); out.writeObject(ravi); }
        System.out.println("ravi once: " + once.size() + " bytes, twice: " + twice.size() + " bytes");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac ObjectGraph.java && java ObjectGraph && xxd shift.ser`,
        },
        {
          type: "output",
          text: `bytes: 274
zone shared after read?   true
cycle intact?             true
new objects?              true
back-references (71 00 7e ..): 5
ravi once: 215 bytes, twice: 220 bytes

00000000: aced 0005 7372 0013 6a61 7661 2e75 7469  ....sr..java.uti
00000010: 6c2e 4172 7261 794c 6973 7478 81d2 1d99  l.ArrayListx....
00000020: c761 9d03 0001 4900 0473 697a 6578 7000  .a....I..sizexp.
00000030: 0000 0277 0400 0000 0273 7200 124f 626a  ...w.....sr..Obj
00000040: 6563 7447 7261 7068 2444 7269 7665 7200  ectGraph$Driver.
00000050: 0000 0000 0000 0102 0003 4c00 046e 616d  ..........L..nam
00000060: 6574 0012 4c6a 6176 612f 6c61 6e67 2f53  et..Ljava/lang/S
00000070: 7472 696e 673b 4c00 0770 6172 746e 6572  tring;L..partner
00000080: 7400 144c 4f62 6a65 6374 4772 6170 6824  t..LObjectGraph$
00000090: 4472 6976 6572 3b4c 0004 7a6f 6e65 7400  Driver;L..zonet.
000000a0: 124c 4f62 6a65 6374 4772 6170 6824 5a6f  .LObjectGraph$Zo
000000b0: 6e65 3b78 7074 0004 5261 7669 7371 007e  ne;xpt..Ravisq.~
000000c0: 0002 7400 0441 7368 6171 007e 0006 7372  ..t..Ashaq.~..sr
000000d0: 0010 4f62 6a65 6374 4772 6170 6824 5a6f  ..ObjectGraph$Zo
000000e0: 6e65 0000 0000 0000 0001 0200 014c 0004  ne...........L..
000000f0: 6e61 6d65 7100 7e00 0378 7074 0009 5341  nameq.~..xpt..SA
00000100: 4c54 2d4c 414b 4571 007e 000b 7100 7e00  LT-LAKEq.~..q.~.
00000110: 0878                                     .x`,
        },
        {
          type: "list",
          items: [
            "**Shared objects stay shared**: Ravi and Asha both pointed at one `Zone`, and after reading they still do (`r.zone == a.zone`). **Cycles survive**: Ravi's partner is Asha, whose partner is Ravi. A naive \"write each field recursively\" would duplicate the zone and loop forever on the cycle.",
            "The mechanism is a **handle table**. Every object, class descriptor and string written gets the next handle number, starting at `0x7e0000`. When the writer meets an object it has already written in this stream (by identity, not `equals`), it writes `71` (`TC_REFERENCE`) and the 4-byte handle instead of the object.",
            "In the dump, Ravi is written in full; his `partner` field starts Asha inline (`73 71 00 7e 00 02`: a new object whose class is a reference to handle 2, the `Driver` descriptor); Asha's `partner` is `71 00 7e 00 06`, a back-reference to Ravi (handle 6); the new `Zone` follows; Ravi's own `zone` is `71 00 7e 00 0b`; and the list's second element is `71 00 7e 00 08`, Asha. Even the repeated type string `Ljava/lang/String;` in the `Zone` descriptor is a back-reference (`71 00 7e 00 03`). Five back-references in all.",
            "`ArrayList`'s descriptor has flags `03` (`SC_SERIALIZABLE | SC_WRITE_METHOD`) and is followed by `77 04 00 00 00 02`: `TC_BLOCKDATA` with 4 bytes of raw data (the capacity) written by its own `writeObject`, before the elements.",
            "Writing Ravi twice to one stream cost 215 + 5 bytes: the second write is just a back-reference. Reading gives back the same object twice. That identity-based sharing is also the source of a classic bug, below.",
          ],
        },
        {
          type: "heading",
          text: "Writing a changed object again",
        },
        {
          type: "code",
          language: "java",
          title: "StaleWrite.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class StaleWrite {
    static class Location implements Serializable {
        private static final long serialVersionUID = 1L;
        String zone;
        Location(String zone) { this.zone = zone; }
    }

    public static void main(String[] args) throws Exception {
        Location cab = new Location("SALT-LAKE");
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        ObjectOutputStream out = new ObjectOutputStream(b);
        out.writeObject(cab);
        cab.zone = "NEW-TOWN";
        out.writeObject(cab);                 // same object: only a back-reference is written
        out.reset();                          // forget everything written so far
        out.writeObject(cab);                 // written in full again
        cab.zone = "HOWRAH";
        out.writeUnshared(cab);               // always a fresh copy, never a back-reference
        out.close();

        ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray()));
        Location first = (Location) in.readObject(), second = (Location) in.readObject();
        Location afterReset = (Location) in.readObject(), unshared = (Location) in.readObject();
        System.out.println("first:      " + first.zone);
        System.out.println("second:     " + second.zone + "   same object as first? " + (second == first));
        System.out.println("afterReset: " + afterReset.zone);
        System.out.println("unshared:   " + unshared.zone);
    }
}`,
        },
        {
          type: "output",
          text: `first:      SALT-LAKE
second:     SALT-LAKE   same object as first? true
afterReset: NEW-TOWN
unshared:   HOWRAH`,
        },
        {
          type: "list",
          items: [
            "The cab moved to NEW-TOWN between the two writes, but the reader got SALT-LAKE twice, and the same object both times. The second `writeObject(cab)` found `cab` in the handle table and wrote a 5-byte back-reference; the new state was never written.",
            "This bites long-lived streams: a socket sending position updates with one `ObjectOutputStream`, or a log that keeps a stream open. The handle table also holds a strong reference to every object ever written, so a long-lived stream is a memory leak as well.",
            "**`reset()`** clears the handle table (and writes `TC_RESET` so the reader clears its own); the next write is complete. **`writeUnshared`** writes the object as new without adding it for later back-references. For streams of messages, `reset()` after each message is the usual fix.",
          ],
        },
      ],
    },
    {
      title: "Constructors Are Not Called",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Constructors.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InvalidClassException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class Constructors {
    // Not Serializable: its state is NOT in the stream
    static class Entity {
        long createdAt = 111;
        Entity() { System.out.println("  Entity() no-arg constructor runs"); }
    }

    static class Person extends Entity implements Serializable {
        private static final long serialVersionUID = 1L;
        String name;
        int rides = 5;                                    // field initialiser
        Person(String name) {
            System.out.println("  Person(String) runs");
            this.name = name;
        }
    }

    static class Rider extends Person {
        private static final long serialVersionUID = 1L;
        String zone;
        Rider(String name, String zone) {
            super(name);
            System.out.println("  Rider(String, String) runs");
            this.zone = zone;
        }
    }

    // A non-serializable superclass WITHOUT a no-arg constructor
    static class Account {
        final String id;
        Account(String id) { this.id = id; }
    }

    static class Wallet extends Account implements Serializable {
        private static final long serialVersionUID = 1L;
        Wallet(String id) { super(id); }
    }

    static byte[] write(Object o) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    static Object read(byte[] data) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) { return in.readObject(); }
    }

    public static void main(String[] args) throws Exception {
        System.out.println("new Rider:");
        Rider asha = new Rider("Asha", "NEW-TOWN");
        asha.createdAt = 999;
        asha.rides = 42;
        byte[] data = write(asha);

        System.out.println("readObject:");
        Rider back = (Rider) read(data);
        System.out.println("name=" + back.name + " zone=" + back.zone + " rides=" + back.rides
                + " createdAt=" + back.createdAt + "  (999 was not serialized)");

        try {
            read(write(new Wallet("W-1")));
        } catch (InvalidClassException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `new Rider:
  Entity() no-arg constructor runs
  Person(String) runs
  Rider(String, String) runs
readObject:
  Entity() no-arg constructor runs
name=Asha zone=NEW-TOWN rides=42 createdAt=111  (999 was not serialized)
Constructors$Wallet; no valid constructor`,
        },
        {
          type: "list",
          items: [
            "Creating a `Rider` runs three constructors. Deserializing one runs **only `Entity()`**, the no-arg constructor of the first superclass that isn't `Serializable`, as `WhoCalls` showed in the stack.",
            "`Person` and `Rider` fields came from the stream: `rides=42`, not the initialiser's 5, because neither constructors nor field initialisers of serializable classes run.",
            "`Entity`'s state is **not** in the stream because `Entity` isn't `Serializable`: `createdAt` was set to 999 before writing and came back as 111, the value `Entity()` assigns. A non-serializable superclass's fields are re-initialised by its no-arg constructor, not restored.",
            "If that superclass has **no accessible no-arg constructor**, deserialization fails: `Wallet`'s superclass `Account` only has `Account(String)`, and reading gives `InvalidClassException: Constructors$Wallet; no valid constructor`. Writing it worked fine; the failure only shows up on read, possibly in another service, days later.",
            "The consequence for design: **any validation in a constructor is skipped** by deserialization. A `Fare` constructor that rejects negative amounts doesn't protect a deserialized `Fare`. `readObject` has to repeat the checks, or the class should be a record (below). The next lesson shows how an attacker uses exactly this.",
          ],
        },
      ],
    },
    {
      title: "Custom writeObject and readObject",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "CustomHooks.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.Map;

public class CustomHooks {
    static class Trip implements Serializable {
        private static final long serialVersionUID = 1L;
        String id;
        long farePaise;
        transient String riderPhone;                    // too sensitive to write as is
        transient Map<String, Long> split;              // derived: rebuilt after reading

        Trip(String id, long farePaise, String riderPhone) {
            this.id = id;
            this.farePaise = farePaise;
            this.riderPhone = riderPhone;
            this.split = splitOf(farePaise);
        }

        static Map<String, Long> splitOf(long fare) {
            return Map.of("driver", fare * 80 / 100, "platform", fare - fare * 80 / 100);
        }

        private void writeObject(ObjectOutputStream out) throws IOException {
            System.out.println("  writeObject hook");
            out.defaultWriteObject();                   // id and farePaise, the normal way
            out.writeUTF("******" + riderPhone.substring(riderPhone.length() - 4));   // extra data
        }

        private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
            System.out.println("  readObject hook");
            in.defaultReadObject();
            riderPhone = in.readUTF();                  // read extras in the same order
            split = splitOf(farePaise);                 // rebuild what wasn't written
        }
    }

    static class Wrong implements Serializable {
        private static final long serialVersionUID = 1L;
        public void writeObject(ObjectOutputStream out) throws IOException {   // public: ignored
            System.out.println("  never printed");
            out.defaultWriteObject();
        }
    }

    static Object roundTrip(Object o) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray()))) { return in.readObject(); }
    }

    public static void main(String[] args) throws Exception {
        Trip back = (Trip) roundTrip(new Trip("T-81", 24_000, "9830012345"));
        System.out.println(back.id + " " + back.farePaise + " phone=" + back.riderPhone + " split=" + new java.util.TreeMap<>(back.split));
        System.out.println("Wrong:");
        roundTrip(new Wrong());
        System.out.println("done");
    }
}`,
        },
        {
          type: "output",
          text: `  writeObject hook
  readObject hook
T-81 24000 phone=******2345 split={driver=19200, platform=4800}
Wrong:
done`,
        },
        {
          type: "list",
          items: [
            "A class can declare `private void writeObject(ObjectOutputStream)` and `private void readObject(ObjectInputStream)`. The stream calls them **instead of** the default field handling, but only for this class's part of the object: superclasses and subclasses still get their own.",
            "`defaultWriteObject()` / `defaultReadObject()` do the normal thing for the non-transient fields; call them first so the default fields stay readable by later versions. After them, extra data can be written with the `DataOutput` methods (`writeUTF`, `writeInt`...) and must be read back **in the same order**.",
            "Here the phone number stays `transient` and only a masked version is written; the derived `split` map isn't written at all and is rebuilt in `readObject`. `readObject` is also the place for validation (throw `InvalidObjectException`) and defensive copies, both shown in the next lesson.",
            "`Wrong` declares `writeObject` as `public`. It **never ran**: the stream looks for the exact `private` signature by reflection and silently ignores anything else. `-Xlint:serial` catches it (Common Mistakes).",
            "A class with a `writeObject` method gets the `SC_WRITE_METHOD` flag (`03`) in its descriptor, and its extra data is wrapped in block-data records ended by `TC_ENDBLOCKDATA`, so a reader whose class has no `readObject` can still skip the extra bytes.",
          ],
        },
      ],
    },
    {
      title: "readResolve, writeReplace and Enums",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Replace.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serial;
import java.io.Serializable;
import java.util.Map;

public class Replace {
    // 1. A class singleton, without and with readResolve
    static final class PlainConfig implements Serializable {
        @Serial private static final long serialVersionUID = 1L;
        static final PlainConfig INSTANCE = new PlainConfig();
        private PlainConfig() { }
    }

    static final class SafeConfig implements Serializable {
        @Serial private static final long serialVersionUID = 1L;
        static final SafeConfig INSTANCE = new SafeConfig();
        private SafeConfig() { }
        @Serial private Object readResolve() { return INSTANCE; }    // swap the copy for the real one
    }

    // 2. writeReplace: send a small key instead of a big object, resolve it on arrival
    static final class Zone {                                        // not even Serializable
        final String code;
        final double[] boundary = new double[2_000];                  // big polygon
        Zone(String code) { this.code = code; }
    }
    static final Map<String, Zone> REGISTRY = Map.of("SALT-LAKE", new Zone("SALT-LAKE"), "NEW-TOWN", new Zone("NEW-TOWN"));

    static final class ZoneRef implements Serializable {
        @Serial private static final long serialVersionUID = 1L;
        final transient Zone zone;
        ZoneRef(Zone zone) { this.zone = zone; }
        @Serial private Object writeReplace() { return new Key(zone.code); }
    }
    record Key(String code) implements Serializable {
        @Serial private Object readResolve() { return new ZoneRef(REGISTRY.get(code)); }
    }

    // 3. Enums travel by name
    enum Vehicle {
        AUTO(3), SEDAN(4);
        int seats;
        Vehicle(int seats) { this.seats = seats; }
    }

    static byte[] write(Object o) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    static Object read(byte[] data) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) { return in.readObject(); }
    }

    public static void main(String[] args) throws Exception {
        System.out.println("PlainConfig same instance? " + (read(write(PlainConfig.INSTANCE)) == PlainConfig.INSTANCE));
        System.out.println("SafeConfig  same instance? " + (read(write(SafeConfig.INSTANCE)) == SafeConfig.INSTANCE));

        byte[] ref = write(new ZoneRef(REGISTRY.get("SALT-LAKE")));
        ZoneRef back = (ZoneRef) read(ref);
        System.out.println("ZoneRef: " + ref.length + " bytes, resolved to registry zone? " + (back.zone == REGISTRY.get("SALT-LAKE")));

        Vehicle.SEDAN.seats = 6;                                       // mutate the constant
        byte[] v = write(Vehicle.SEDAN);
        String raw = new String(v, java.nio.charset.StandardCharsets.ISO_8859_1);
        System.out.println("enum: " + v.length + " bytes, has field 'seats'? " + raw.contains("seats")
                + ", same constant? " + (read(v) == Vehicle.SEDAN));
    }
}`,
        },
        {
          type: "output",
          text: `PlainConfig same instance? false
SafeConfig  same instance? true
ZoneRef: 72 bytes, resolved to registry zone? true
enum: 73 bytes, has field 'seats'? false, same constant? true`,
        },
        {
          type: "list",
          items: [
            "**A `Serializable` singleton isn't one**: deserializing `PlainConfig.INSTANCE` built a second instance, because `readObject` always allocates a new object. The EnumSet, EnumMap and Enum Patterns lesson showed the same with its `FareConfig`.",
            "**`readResolve()`** runs after the object is read and its return value replaces it. Returning `INSTANCE` restores identity; the freshly read copy becomes garbage. For a real singleton, all instance fields should also be `transient`, otherwise the stream still carries data into the discarded copy (and the next lesson shows how an attacker can grab a reference to it before it's discarded).",
            "**`writeReplace()`** runs before writing and swaps in a different object. `ZoneRef` holds a `Zone` that isn't even `Serializable` and has a 2,000-point polygon; it writes just a small `Key` record (72 bytes), whose `readResolve` looks the zone up in the receiving JVM's registry. This substitute-and-resolve pair is the basis of the **serialization proxy pattern**, which the next lesson uses to make deserialization go through a constructor.",
            "**Enums are written by name**: `TC_ENUM` (`7e`), the enum's class descriptor (UID `0`, flags `0x12` = `SC_SERIALIZABLE | SC_ENUM`), and the constant's name as a string. `seats` is not in the stream even after I mutated it. On read, the JVM calls `Enum.valueOf`, so the result is the existing constant (`same constant? true`). `serialVersionUID`, `writeObject`, `readObject`, `writeReplace` and `readResolve` are all ignored for enums. As the Enums lessons said, that makes the enum the one singleton the JVM itself protects, and means renaming a constant breaks every stored stream that contains it.",
          ],
        },
      ],
    },
    {
      title: "Externalizable",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "ExternalDemo.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.Externalizable;
import java.io.IOException;
import java.io.InvalidClassException;
import java.io.ObjectInput;
import java.io.ObjectInputStream;
import java.io.ObjectOutput;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class ExternalDemo {
    static class TripS implements Serializable {
        private static final long serialVersionUID = 1L;
        String id; String zone; long farePaise; int distanceMetres;
        TripS(String id, String zone, long fare, int dist) { this.id = id; this.zone = zone; farePaise = fare; distanceMetres = dist; }
    }

    public static class TripE implements Externalizable {
        String id; String zone; long farePaise; int distanceMetres;
        public TripE() { System.out.println("  TripE() public no-arg constructor runs"); }
        TripE(String id, String zone, long fare, int dist) { this.id = id; this.zone = zone; farePaise = fare; distanceMetres = dist; }

        @Override public void writeExternal(ObjectOutput out) throws IOException {
            out.writeUTF(id); out.writeUTF(zone); out.writeLong(farePaise); out.writeInt(distanceMetres);
        }
        @Override public void readExternal(ObjectInput in) throws IOException {
            id = in.readUTF(); zone = in.readUTF(); farePaise = in.readLong(); distanceMetres = in.readInt();
        }
        public String toString() { return id + " " + zone + " " + farePaise + " " + distanceMetres; }
    }

    static class NoPublicCtor implements Externalizable {
        NoPublicCtor() { }                                              // package-private
        public void writeExternal(ObjectOutput out) { }
        public void readExternal(ObjectInput in) { }
    }

    static byte[] write(Object o) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    static Object read(byte[] data) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) { return in.readObject(); }
    }

    public static void main(String[] args) throws Exception {
        byte[] s = write(new TripS("T-81", "SALT-LAKE", 24_000, 7_400));
        byte[] e = write(new TripE("T-81", "SALT-LAKE", 24_000, 7_400));
        System.out.println("Serializable: " + s.length + " bytes, Externalizable: " + e.length + " bytes");
        System.out.println("reading TripE:");
        System.out.println("  " + read(e));
        try {
            read(write(new NoPublicCtor()));
        } catch (InvalidClassException ex) {
            System.out.println(ex.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `Serializable: 137 bytes, Externalizable: 71 bytes
reading TripE:
  TripE() public no-arg constructor runs
  T-81 SALT-LAKE 24000 7400
ExternalDemo$NoPublicCtor; no valid constructor`,
        },
        {
          type: "list",
          items: [
            "An `Externalizable` class writes and reads **everything** itself in `writeExternal`/`readExternal`. The stream writes only its class descriptor (with no field list) and then whatever the methods write.",
            "It was 71 bytes against 137 for the same data as `Serializable`: no field names, no type strings. With one object per stream, the descriptor still dominates.",
            "On read, the stream calls the class's **public no-arg constructor**, then `readExternal`. That's the opposite of `Serializable` (where the class's constructor never runs), and it's mandatory: `NoPublicCtor` has a package-private one, and reading fails with `no valid constructor`.",
            "The costs: fields can't be `final` (they're assigned in `readExternal` after construction), superclass state isn't handled automatically, versioning is entirely manual, and `readExternal` is a `public` method anyone can call on a live object. The next lesson compares the two from a security angle. In practice, `Serializable` with a custom `writeObject`/`readObject` or a proxy gives most of the size benefit with fewer traps.",
          ],
        },
      ],
    },
    {
      title: "NotSerializableException",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "NotSerializable.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.NotSerializableException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.io.WriteAbortedException;
import java.util.ArrayList;
import java.util.List;

public class NotSerializable {
    static class PaymentGateway {                       // a service, not data
        void charge(long paise) { }
    }

    static class Booking implements Serializable {
        private static final long serialVersionUID = 1L;
        String riderName = "Asha";
        List<Object> stops = new ArrayList<>();
        PaymentGateway gateway = new PaymentGateway();  // the problem
    }

    public static void main(String[] args) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) {
            out.writeObject(new Booking());
        } catch (NotSerializableException e) {
            System.out.println(e);
            System.out.println("bytes already in the buffer: " + b.size());
        }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray()))) {
            in.readObject();
        } catch (WriteAbortedException e) {
            System.out.println("reader gets: " + e.getMessage());
        }

        Booking withBadStop = new Booking();
        withBadStop.gateway = null;
        withBadStop.stops.add(new Object());           // hidden deep inside a collection
        try (ObjectOutputStream out = new ObjectOutputStream(new ByteArrayOutputStream())) {
            out.writeObject(withBadStop);
        } catch (NotSerializableException e) {
            System.out.println(e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `java.io.NotSerializableException: NotSerializable$PaymentGateway
bytes already in the buffer: 1233
reader gets: writing aborted; java.io.NotSerializableException: NotSerializable$PaymentGateway
java.io.NotSerializableException: java.lang.Object`,
        },
        {
          type: "list",
          items: [
            "`Booking` is `Serializable`, but its `gateway` field holds a `PaymentGateway`, which isn't. The whole write fails with `NotSerializableException` naming the **class**, not the field.",
            "**The stream isn't empty afterwards**: it had 1,233 bytes. When a write fails, `ObjectOutputStream` writes `TC_EXCEPTION` and then serializes the exception itself into the stream, so a reader of the same bytes gets `WriteAbortedException` with the original exception as its cause. A half-written blob is still a blob; don't store it.",
            "The second case is harder: the culprit is a plain `Object` hidden inside a `List<Object>`. Nothing in `Booking`'s declared types reveals it, and the message names only `java.lang.Object`.",
          ],
        },
        {
          type: "paragraph",
          text: "The JDK has a diagnostic flag that prints the path to the offending object:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -Dsun.io.serialization.extendedDebugInfo=true NotSerializable`,
        },
        {
          type: "output",
          text: `java.io.NotSerializableException: NotSerializable$PaymentGateway
	- field (class "NotSerializable$Booking", name: "gateway", type: "class NotSerializable$PaymentGateway")
	- root object (class "NotSerializable$Booking", NotSerializable$Booking@4a574795)
bytes already in the buffer: 1422
reader gets: writing aborted; java.io.NotSerializableException: NotSerializable$PaymentGateway
	- field (class "NotSerializable$Booking", name: "gateway", type: "class NotSerializable$PaymentGateway")
	- root object (class "NotSerializable$Booking", NotSerializable$Booking@4a574795)
java.io.NotSerializableException: java.lang.Object
	- custom writeObject data (class "java.util.ArrayList")
	- object (class "java.util.ArrayList", [java.lang.Object@61e717c2])
	- field (class "NotSerializable$Booking", name: "stops", type: "interface java.util.List")
	- root object (class "NotSerializable$Booking", NotSerializable$Booking@7e0b37bc)`,
        },
        {
          type: "paragraph",
          text: "Now each failure says where it was: the `gateway` field of the root `Booking`, or element data inside `ArrayList`'s custom `writeObject`, inside the `stops` field. (The `@4a574795`-style identity hashes differ per run.) The usual fixes: mark service references `transient` and re-inject them after reading, or better, keep services out of objects that get serialized at all.",
        },
      ],
    },
    {
      title: "Records Are Deserialized Through Their Constructor",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "RecordSer.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InvalidObjectException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.Arrays;

public class RecordSer {
    static class FareClass implements Serializable {
        private static final long serialVersionUID = 1L;
        final long paise;
        FareClass(long paise) {
            if (paise < 0) throw new IllegalArgumentException("negative fare " + paise);
            System.out.println("  FareClass constructor, paise=" + paise);
            this.paise = paise;
        }
    }

    record FareRecord(long paise) implements Serializable {
        FareRecord {
            if (paise < 0) throw new IllegalArgumentException("negative fare " + paise);
            System.out.println("  FareRecord canonical constructor, paise=" + paise);
        }
    }

    static byte[] write(Object o) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    static Object read(byte[] data) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) { return in.readObject(); }
    }

    // Flip the 8 bytes of the long field to -1: what an attacker or a corrupted cache can do
    static byte[] tamper(byte[] data, long original) {
        byte[] copy = data.clone();
        byte[] needle = java.nio.ByteBuffer.allocate(8).putLong(original).array();
        for (int i = 0; i + 8 <= copy.length; i++) {
            if (Arrays.equals(copy, i, i + 8, needle, 0, 8)) {
                Arrays.fill(copy, i, i + 8, (byte) 0xFF);
                return copy;
            }
        }
        throw new IllegalStateException("field not found");
    }

    public static void main(String[] args) throws Exception {
        System.out.println("writing:");
        byte[] cls = write(new FareClass(14_500));
        byte[] rec = write(new FareRecord(14_500));

        System.out.println("reading the class:");
        System.out.println("  paise = " + ((FareClass) read(cls)).paise);
        System.out.println("reading the record:");
        System.out.println("  paise = " + ((FareRecord) read(rec)).paise());

        System.out.println("tampered class:");
        System.out.println("  paise = " + ((FareClass) read(tamper(cls, 14_500))).paise + "   (invariant broken)");
        System.out.println("tampered record:");
        try {
            read(tamper(rec, 14_500));
        } catch (InvalidObjectException e) {
            System.out.println("  " + e + "  cause: " + e.getCause());
        }
    }
}`,
        },
        {
          type: "output",
          text: `writing:
  FareClass constructor, paise=14500
  FareRecord canonical constructor, paise=14500
reading the class:
  paise = 14500
reading the record:
  FareRecord canonical constructor, paise=14500
  paise = 14500
tampered class:
  paise = -1   (invariant broken)
tampered record:
  java.io.InvalidObjectException: negative fare -1  cause: java.lang.IllegalArgumentException: negative fare -1`,
        },
        {
          type: "list",
          items: [
            "Reading the class printed nothing: its constructor was skipped, as for every serializable class. Reading the record printed `FareRecord canonical constructor`: **records are deserialized by reading the component values from the stream and calling the canonical constructor** with them. The stack trace for a record read goes through `ObjectInputStream.readRecord` and `FieldValues`, then a method handle for the canonical constructor.",
            "I then flipped the 8 bytes of the fare in each stream to `-1`, as a corrupted cache entry or an attacker could. The class came back with `paise = -1`: its constructor check never ran. The record **rejected** it: the compact constructor threw `IllegalArgumentException`, which `ObjectInputStream` wrapped in `InvalidObjectException`.",
            "For records, `writeObject`, `readObject`, `readObjectNoData` and `serialPersistentFields` are ignored (`-Xlint:serial` warns about them); `writeReplace` and `readResolve` still work. A record's default `serialVersionUID` is `0L` (I checked with `ObjectStreamClass.lookup`), and the specification waives the UID match for records: I wrote a `Fare` record with UID 1, read it with a version declaring UID 2 and an extra component, and it worked, with the canonical constructor receiving `null` for the new component.",
            "For data carriers that get serialized, records are the safest Java serialization gets: invariants live in one constructor that every path, including deserialization, goes through.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `out.writeObject(asha)` and `in.readObject()` from `RoundTrip.java`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**`new ObjectOutputStream(bytes)`** writes the header `ac ed 00 05` into its buffer straight away. Over a socket, flush it promptly: the reader's `ObjectInputStream` constructor blocks until it has read those four bytes, and two peers that each wait for the other's header deadlock.",
            "**`writeObject(asha)`** calls `writeObject0`. It checks the handle table (an identity hash table): `asha` is new. It checks for `writeReplace` (none) and gets `ObjectStreamClass.lookup(Rider.class)`, built once and cached: name, `serialVersionUID = 1`, fields in wire order, hooks found by reflection.",
            "**Not `Serializable`?** Here it would throw `NotSerializableException`. `Rider` is, so `writeOrdinaryObject` writes `TC_OBJECT`, the class descriptor (or a back-reference to it), and assigns `asha` the next handle.",
            "**`writeSerialData`** walks the class hierarchy from the top serializable class down. For each class: if it has a private `writeObject`, call it; otherwise `defaultWriteFields`, which copies primitives into a buffer through `Unsafe` offsets and recurses into each object field: `name`, `zone` (strings, `TC_STRING`), and `recentFaresPaise`, an `ArrayList`, whose own `writeObject` writes its size and elements.",
            "**`close()`** flushes the block-data buffer to the `ByteArrayOutputStream`: 279 bytes.",
            "**`new ObjectInputStream(...)`** reads and checks the magic and version. **`readObject()`** reads the tag `73` (`TC_OBJECT`) and calls `readOrdinaryObject`.",
            "**`readClassDesc`** reads the descriptor, resolves the name with `Class.forName(name, false, loader)` (no static initialisation yet), and compares the stream's `serialVersionUID` with the local class's. A mismatch throws `InvalidClassException` here, before any object exists.",
            "**`desc.newInstance()`** allocates a `Rider` through the serialization constructor: only `Object()` runs, since `Rider`'s first non-serializable superclass is `Object`. The new object gets the next handle, so back-references to it inside its own fields can be resolved (cycles).",
            "**`readSerialData`** fills the fields, superclass first, through `Unsafe` (so `final` fields are set too), recursing for each object field, or calls the class's `readObject` if it has one.",
            "**`readResolve`**, if present, replaces the result. Then `readObject` returns an `Object`, and the caller's cast runs, last of all.",
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
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serial;
import java.io.Serializable;
import java.util.List;

public class SyntaxTour {
    // 1. opt in with the marker interface, pin the version
    static class Driver implements Serializable {
        @Serial private static final long serialVersionUID = 1L;
        String name;                                   // written
        List<String> zones;                            // written (List.of is Serializable)
        transient int unreadPings;                     // skipped, back as 0
        static String fleet = "KOL";                   // never written: belongs to the class

        Driver(String name, List<String> zones) { this.name = name; this.zones = zones; this.unreadPings = 3; }

        // 2. optional hooks: exact private signatures
        @Serial private void writeObject(ObjectOutputStream out) throws IOException {
            out.defaultWriteObject();
        }
        @Serial private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
            in.defaultReadObject();
            if (name == null || name.isBlank()) throw new java.io.InvalidObjectException("name required");
        }
    }

    // 3. records: canonical constructor runs on read
    record Fare(long paise, String zone) implements Serializable { }

    // 4. a singleton keeps its identity with readResolve
    static final class Clock implements Serializable {
        @Serial private static final long serialVersionUID = 1L;
        static final Clock INSTANCE = new Clock();
        private Clock() { }
        @Serial private Object readResolve() { return INSTANCE; }
    }

    public static void main(String[] args) throws Exception {
        // 5. write several objects to one stream
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
            out.writeObject(new Driver("Ravi", List.of("SALT-LAKE", "NEW-TOWN")));
            out.writeObject(new Fare(14_500, "SALT-LAKE"));
            out.writeObject(Clock.INSTANCE);
            out.writeInt(42);                          // primitives too
        }

        // 6. read them back in the same order, with the same types
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            Driver d = (Driver) in.readObject();
            Fare f = (Fare) in.readObject();
            Clock c = (Clock) in.readObject();
            int n = in.readInt();
            System.out.println(d.name + " " + d.zones + " pings=" + d.unreadPings + " fleet=" + Driver.fleet);
            System.out.println(f + " " + (c == Clock.INSTANCE) + " " + n);
        }
        System.out.println(bytes.size() + " bytes");
    }
}`,
        },
        {
          type: "output",
          text: `Ravi [SALT-LAKE, NEW-TOWN] pings=0 fleet=KOL
Fare[paise=14500, zone=SALT-LAKE] true 42
279 bytes`,
        },
        {
          type: "paragraph",
          text: "`@Serial` (Java 14+) changes nothing at run time; it tells `javac` that these members are meant for serialization, so `-Xlint:serial` can check their signatures. `List.of(...)` is serializable through a private proxy class (`java.util.CollSer`), which is why the zones survived; a mutable `ArrayList` would too. `out.writeInt(42)` shows that primitives and objects can be mixed in one stream, as long as the reader reads them in the same order.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Deep copy through serialization",
        },
        {
          type: "code",
          language: "java",
          title: "DeepCopy.java",
          code: `import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class DeepCopy {
    static class Stop implements Serializable {
        private static final long serialVersionUID = 1L;
        String zone;
        Stop(String zone) { this.zone = zone; }
        Stop(Stop other) { this.zone = other.zone; }                    // copy constructor
    }

    static class Route implements Serializable {
        private static final long serialVersionUID = 1L;
        List<Stop> stops = new ArrayList<>();
        Route() { }
        Route(Route other) { for (Stop s : other.stops) stops.add(new Stop(s)); }
    }

    @SuppressWarnings("unchecked")
    static <T extends Serializable> T deepCopy(T original) {
        try {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(original); }
            try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(b.toByteArray()))) {
                return (T) in.readObject();
            }
        } catch (IOException | ClassNotFoundException e) {
            throw new IllegalStateException("not deep-copyable", e);
        }
    }

    public static void main(String[] args) {
        Route planned = new Route();
        for (String z : new String[] {"SALT-LAKE", "SECTOR-V", "NEW-TOWN"}) planned.stops.add(new Stop(z));

        Route copy = deepCopy(planned);
        copy.stops.get(1).zone = "HOWRAH";                              // change the copy only
        System.out.println("original: " + planned.stops.get(1).zone + ", copy: " + copy.stops.get(1).zone);

        int n = 20_000;
        long best1 = Long.MAX_VALUE, best2 = Long.MAX_VALUE;
        for (int r = 0; r < 15; r++) {
            long t = System.nanoTime();
            for (int i = 0; i < n; i++) deepCopy(planned);
            best1 = Math.min(best1, System.nanoTime() - t);
            t = System.nanoTime();
            for (int i = 0; i < n; i++) new Route(planned);
            best2 = Math.min(best2, System.nanoTime() - t);
        }
        System.out.printf("per copy: serialization %.2f us, copy constructor %.3f us%n", best1 / 1e3 / n, best2 / 1e3 / n);
    }
}`,
        },
        {
          type: "output",
          text: `original: SECTOR-V, copy: HOWRAH
per copy: serialization 9.71 us, copy constructor 0.024 us`,
        },
        {
          type: "paragraph",
          text: "Serializing and immediately deserializing gives a **deep copy** of any serializable graph, shared references and cycles included, without writing a copy method. It's a well-known trick, and the measurement shows its price: about 9.7 µs per copy of a three-stop route, against 0.024 µs for a copy constructor, roughly 400 times slower (best of 15 runs of 20,000 copies, one machine, not JMH). It also fails for any non-serializable object in the graph and skips constructors. It can be acceptable in tests or for rare, complex graphs; for anything on a hot path, a copy constructor or a static factory is the answer.",
        },
        {
          type: "heading",
          text: "Example 2: Checkpointing a batch job to disk",
        },
        {
          type: "code",
          language: "java",
          title: "Checkpoint.java",
          code: `import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serial;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;

public class Checkpoint {
    // State of a nightly payout job: which drivers are done, and running totals
    static class PayoutState implements Serializable {
        @Serial private static final long serialVersionUID = 1L;
        int nextDriverIndex;
        final Map<String, Long> paidPaise = new HashMap<>();
    }

    static final Path FILE = Path.of("payout.ckpt");

    static void save(PayoutState s) throws IOException {
        Path tmp = FILE.resolveSibling(FILE.getFileName() + ".tmp");
        try (ObjectOutputStream out = new ObjectOutputStream(Files.newOutputStream(tmp))) {
            out.writeObject(s);
        }
        // a crash mid-write leaves the old checkpoint intact
        Files.move(tmp, FILE, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    static PayoutState load() throws IOException, ClassNotFoundException {
        if (Files.notExists(FILE)) return new PayoutState();
        try (ObjectInputStream in = new ObjectInputStream(Files.newInputStream(FILE))) {
            return (PayoutState) in.readObject();
        }
    }

    public static void main(String[] args) throws Exception {
        String[] drivers = {"D-1", "D-2", "D-3", "D-4", "D-5"};
        int crashAfter = args.length > 0 ? Integer.parseInt(args[0]) : Integer.MAX_VALUE;

        PayoutState s = load();
        System.out.println("starting at driver index " + s.nextDriverIndex);
        for (int i = s.nextDriverIndex; i < drivers.length; i++) {
            if (i == crashAfter) { System.out.println("crash!"); return; }
            s.paidPaise.put(drivers[i], 50_000L + i * 1_000);
            s.nextDriverIndex = i + 1;
            save(s);                                       // checkpoint after every driver
            System.out.println("paid " + drivers[i]);
        }
        System.out.println("done, total paise " + s.paidPaise.values().stream().mapToLong(Long::longValue).sum());
        Files.delete(FILE);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Checkpoint.java
java Checkpoint 3      # crash before the 4th driver
java Checkpoint        # restart`,
        },
        {
          type: "output",
          text: `starting at driver index 0
paid D-1
paid D-2
paid D-3
crash!
starting at driver index 3
paid D-4
paid D-5
done, total paise 260000`,
        },
        {
          type: "list",
          items: [
            "A nightly payout job saves its progress after every driver, so a crash resumes where it stopped instead of paying D-1 to D-3 twice.",
            "The write goes to `payout.ckpt.tmp` and is then **atomically moved** over the old checkpoint with `ATOMIC_MOVE` (from the java.nio.file lesson). A crash in the middle of `writeObject` leaves a truncated temp file and the previous checkpoint intact; reading a truncated stream would otherwise fail with `EOFException` or `StreamCorruptedException`.",
            "This is serialization's comfortable case: the same program writes and reads, the file is short-lived, and nobody else can write to it. If the checkpoint must survive a deploy that changes `PayoutState`, the `serialVersionUID` and the compatibility rules above apply; if other systems need to read it, a documented format such as JSON is better (next lesson).",
          ],
        },
        {
          type: "heading",
          text: "Example 3: Renaming a field without breaking stored data",
        },
        {
          type: "code",
          language: "java",
          title: "old/TripFare.java",
          code: `import java.io.Serializable;

public class TripFare implements Serializable {
    private static final long serialVersionUID = 1L;
    long fare;                                   // in paise, but the name doesn't say so
    String zone;
    public TripFare(long fare, String zone) { this.fare = fare; this.zone = zone; }
    public String toString() { return "TripFare[fare=" + fare + ", zone=" + zone + "]"; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "new/TripFare.java",
          code: `import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.ObjectStreamField;
import java.io.Serial;
import java.io.Serializable;

public class TripFare implements Serializable {
    @Serial private static final long serialVersionUID = 1L;

    // The wire format keeps the old names; the Java fields are free to change
    @Serial private static final ObjectStreamField[] serialPersistentFields = {
        new ObjectStreamField("fare", long.class),
        new ObjectStreamField("zone", String.class),
    };

    long farePaise;                              // renamed
    String zone;
    public TripFare(long farePaise, String zone) { this.farePaise = farePaise; this.zone = zone; }

    @Serial private void writeObject(ObjectOutputStream out) throws IOException {
        ObjectOutputStream.PutField f = out.putFields();
        f.put("fare", farePaise);
        f.put("zone", zone);
        out.writeFields();
    }

    @Serial private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
        ObjectInputStream.GetField f = in.readFields();
        farePaise = f.get("fare", 0L);
        zone = (String) f.get("zone", "UNKNOWN");
    }

    public String toString() { return "TripFare[farePaise=" + farePaise + ", zone=" + zone + "]"; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "FareStore.java",
          code: `import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HexFormat;

public class FareStore {
    public static void main(String[] args) throws Exception {
        Path file = Path.of(args[1]);
        if (args[0].equals("write")) {
            try (ObjectOutputStream out = new ObjectOutputStream(Files.newOutputStream(file))) {
                out.writeObject(new TripFare(14_500, "SALT-LAKE"));
            }
            System.out.println(file + ": " + HexFormat.of().formatHex(Files.readAllBytes(file)));
        } else {
            try (ObjectInputStream in = new ObjectInputStream(Files.newInputStream(file))) {
                System.out.println("read " + file + ": " + in.readObject());
            }
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d old old/TripFare.java FareStore.java && javac -d new new/TripFare.java FareStore.java
java -cp old FareStore write old.ser && java -cp new FareStore write new.ser
java -cp new FareStore read old.ser && java -cp old FareStore read new.ser`,
        },
        {
          type: "output",
          text: `old.ser: aced000573720008547269704661726500000000000000010200024a0004666172654c00047a6f6e657400124c6a6176612f6c616e672f537472696e673b787000000000000038a474000953414c542d4c414b45
new.ser: aced000573720008547269704661726500000000000000010300024a0004666172654c00047a6f6e657400124c6a6176612f6c616e672f537472696e673b787000000000000038a474000953414c542d4c414b4578
read old.ser: TripFare[farePaise=14500, zone=SALT-LAKE]
read new.ser: TripFare[fare=14500, zone=SALT-LAKE]`,
        },
        {
          type: "list",
          items: [
            "The field `fare` was renamed to `farePaise`. With default serialization, that's a removed field plus an added one: old streams would load with `farePaise = 0`, silently.",
            "`serialPersistentFields` declares the **serialized** fields independently of the Java fields: the wire still says `fare`. `writeObject` fills them with `putFields()`/`writeFields()`, and `readObject` reads them by name with `readFields()`, with a default for each if the stream lacks it.",
            "The new class read the old file, and the **old** class read the new file, which matters during a rolling deploy when both versions run at once. The two streams differ only in the flags byte (`02` vs `03`, because the new class has a `writeObject`) and a trailing `78`; the field names and values are identical.",
          ],
        },
      ],
    },
    {
      title: "When to Use Java Serialization",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Why"],
          rows: [
            ["Data that leaves the JVM to other services, languages or teams", "JSON, Protobuf, Avro (next lesson)", "Documented schema, language-neutral, no code runs on read"],
            ["Data from any source that isn't fully trusted", "Never Java serialization", "Reading it runs code chosen by the sender (next lesson)"],
            ["Long-term storage (database blobs, files kept for months)", "A documented format", "Every class change becomes a migration problem"],
            ["Caches and sessions shared across deploys", "JSON or another explicit format, or a strict versioning discipline", "The production section is this case"],
            ["Short-lived, same-version, trusted data (a checkpoint, a test fixture)", "Java serialization is acceptable", "Same classes on both ends, nobody else writes the bytes"],
            ["Frameworks that require it (RMI, some servlet session replication, `Serializable` exceptions)", "Implement `Serializable` with an explicit UID and few fields", "Keep it minimal and trusted"],
            ["Deep copies", "Copy constructors or factories", "~400x cheaper, measured above"],
            ["A data carrier that must be serializable", "A `record`", "Canonical constructor validates on read"],
          ],
        },
        {
          type: "paragraph",
          text: "My rule: Java serialization is for bytes that this application wrote and only this application will read, soon, with the same classes. As soon as one of those stops being true, an explicit format is cheaper than the incident.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "No serialVersionUID",
        },
        {
          type: "paragraph",
          text: "The computed UID changes with harmless edits (a new public method, a static constant), and every stored or in-flight object becomes unreadable after the deploy. Declare it from the first version. If a class already shipped without one, declare exactly the value `serialver` prints for the **old** class, not `1L`.",
        },
        {
          type: "heading",
          text: "Hook methods with the wrong signature",
        },
        {
          type: "paragraph",
          text: "`writeObject`, `readObject`, `readObjectNoData` must be `private` with the exact parameter and exception types; `serialVersionUID` must be `static final long`. Anything else is silently ignored. The compiler can catch all of these:",
        },
        {
          type: "code",
          language: "java",
          title: "Lint.java",
          code: `import java.io.IOException;
import java.io.ObjectOutputStream;
import java.io.Serializable;

public class Lint {
    static class NoUid implements Serializable {
        String zone;
    }

    static class WrongHook implements Serializable {
        private static final long serialVersionUID = 1L;
        public void writeObject(ObjectOutputStream out) throws IOException { out.defaultWriteObject(); }
    }

    static class BadUid implements Serializable {
        static final int serialVersionUID = 1;
    }

    record Fare(long paise) implements Serializable {
        private void writeObject(ObjectOutputStream out) { }
    }

    static class HasThread implements Serializable {
        private static final long serialVersionUID = 1L;
        Thread worker;
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac -Xlint:serial Lint.java`,
        },
        {
          type: "output",
          text: `Lint.java:6: warning: [serial] serializable class NoUid has no definition of serialVersionUID
    static class NoUid implements Serializable {
           ^
Lint.java:12: warning: [serial] serialization-related method writeObject not declared private
        public void writeObject(ObjectOutputStream out) throws IOException { out.defaultWriteObject(); }
                    ^
Lint.java:16: warning: [serial] serialVersionUID must be of type long in class BadUid
        static final int serialVersionUID = 1;
                         ^
Lint.java:20: warning: [serial] serialization-related method writeObject is not effective in a record class
        private void writeObject(ObjectOutputStream out) { }
                     ^
Lint.java:25: warning: [serial] non-transient instance field of a serializable class declared with a non-serializable type
        Thread worker;
               ^
5 warnings`,
        },
        {
          type: "paragraph",
          text: "The last warning finds the `NotSerializableException` of a `Thread` field at compile time. It can't see through declared types like `Object` or `List<Object>`, which is where the runtime flag `-Dsun.io.serialization.extendedDebugInfo=true` helps. I'd turn on `-Xlint:serial` with `-Werror` in any module that has serializable classes.",
        },
        {
          type: "heading",
          text: "Expecting constructors or initialisers to run",
        },
        {
          type: "paragraph",
          text: "Validation in a constructor, a field initialiser like `int retries = 3`, or a `transient` field initialised at declaration: none of it runs on deserialization of a `Serializable` class. Put validation and transient setup in `readObject`, or use a record.",
        },
        {
          type: "heading",
          text: "Making a field transient and forgetting it comes back empty",
        },
        {
          type: "paragraph",
          text: "A `transient` cache or logger is `null` after reading, and the first method that uses it throws `NullPointerException`, possibly much later. Re-create it in `readObject`, or initialise it lazily.",
        },
        {
          type: "heading",
          text: "Reusing one ObjectOutputStream for changing objects",
        },
        {
          type: "paragraph",
          text: "The second `writeObject` of the same object writes a back-reference, and the reader gets the stale first state (`StaleWrite.java`). Call `reset()` between messages, or create a stream per message.",
        },
        {
          type: "heading",
          text: "Serializing services and framework objects",
        },
        {
          type: "paragraph",
          text: "A domain object with a reference to a repository, a gateway, a Spring bean or a lambda pulls that into the graph, and usually fails with `NotSerializableException`, or worse, succeeds and drags a huge graph along. Serialize plain data objects; keep services out of them.",
        },
        {
          type: "heading",
          text: "Treating static state as serialized",
        },
        {
          type: "paragraph",
          text: "Static fields aren't written. A test that serializes and deserializes in one JVM sees the static value and \"passes\"; another JVM sees its own.",
        },
        {
          type: "heading",
          text: "Making a singleton Serializable without readResolve",
        },
        {
          type: "paragraph",
          text: "Deserialization creates a second instance. Add `readResolve` returning the instance (and make instance fields `transient`), or use a single-constant enum.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Don't use Java serialization for data that crosses a trust boundary, leaves the application, or lives long; choose an explicit format (next lesson).",
            "When a class must be `Serializable`, declare `private static final long serialVersionUID` from the first version, and mark it and all hooks with `@Serial`.",
            "Compile with `-Xlint:serial` (and fail the build on warnings) so wrong signatures and non-serializable field types are caught.",
            "Prefer records for serializable data carriers: validation in the canonical constructor also runs on read.",
            "For classes, repeat every constructor invariant in `readObject` (after `defaultReadObject()`), and throw `InvalidObjectException` on violation.",
            "Mark caches, derived values, secrets and service references `transient`, and rebuild what's needed in `readObject` or lazily.",
            "Use `readResolve` for singletons and instance-controlled classes; prefer enums where possible.",
            "Keep the serialized form small and deliberate: `serialPersistentFields` or a serialization proxy decouples it from the class's private fields.",
            "Call `reset()` on long-lived `ObjectOutputStream`s, or use one stream per message.",
            "Write checkpoints and files atomically (temp file, then `ATOMIC_MOVE`), and treat any read failure of a cached entry as a miss, not an outage.",
            "Test compatibility explicitly: keep serialized samples from the previous release in the test suite and read them with the new code.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "I measured the serialized size and the time to write and read 10,000 trips with Java serialization and with a hand-written `DataOutputStream` encoding of the same five fields. Times are the best of 50 runs in one process on one machine, not JMH:",
        },
        {
          type: "code",
          language: "java",
          title: "SerialCost.java",
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

public class SerialCost {
    static class Trip implements Serializable {
        private static final long serialVersionUID = 1L;
        String id; String zone; long farePaise; int distanceMetres; long startedAtMillis;
        Trip(String id, String zone, long farePaise, int distanceMetres, long startedAtMillis) {
            this.id = id; this.zone = zone; this.farePaise = farePaise;
            this.distanceMetres = distanceMetres; this.startedAtMillis = startedAtMillis;
        }
    }

    static final String[] ZONES = {"SALT-LAKE", "NEW-TOWN", "HOWRAH", "PARK-STREET"};
    static final int N = 10_000;

    static List<Trip> trips() {
        List<Trip> list = new ArrayList<>();
        for (int i = 0; i < N; i++) {
            list.add(new Trip("T-" + (100_000 + i), ZONES[i % 4], 8_000 + i % 500 * 37, 1_000 + i % 9_000, 1_794_000_000_000L + i * 60_000L));
        }
        return list;
    }

    static byte[] java(Object o) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    static long javaEach(List<Trip> list) throws IOException {        // one stream per object, like one cache entry each
        long total = 0;
        for (Trip t : list) {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(t); }
            total += b.size();
        }
        return total;
    }

    static byte[] manual(List<Trip> list) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (DataOutputStream out = new DataOutputStream(b)) {
            out.writeInt(list.size());
            for (Trip t : list) {
                out.writeUTF(t.id); out.writeUTF(t.zone); out.writeLong(t.farePaise);
                out.writeInt(t.distanceMetres); out.writeLong(t.startedAtMillis);
            }
        }
        return b.toByteArray();
    }

    static List<Trip> readManual(byte[] data) throws IOException {
        DataInputStream in = new DataInputStream(new ByteArrayInputStream(data));
        int n = in.readInt();
        List<Trip> list = new ArrayList<>(n);
        for (int i = 0; i < n; i++) list.add(new Trip(in.readUTF(), in.readUTF(), in.readLong(), in.readInt(), in.readLong()));
        return list;
    }

    @SuppressWarnings("unchecked")
    static List<Trip> readJava(byte[] data) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) { return (List<Trip>) in.readObject(); }
    }

    interface Task { Object run() throws Exception; }

    static double bestMs(Task t) throws Exception {
        long best = Long.MAX_VALUE;
        for (int r = 0; r < 50; r++) {
            long start = System.nanoTime();
            Object o = t.run();
            best = Math.min(best, System.nanoTime() - start);
            if (o == null) System.out.print("");
        }
        return best / 1e6;
    }

    public static void main(String[] args) throws Exception {
        List<Trip> list = trips();
        System.out.printf("one trip: java %d bytes, manual %d bytes (+4 for the count)%n", java(list.get(0)).length, manual(list.subList(0, 1)).length);
        byte[] j = java(list), m = manual(list);
        System.out.printf("%d trips: java %d bytes (%.1f per trip), manual %d bytes (%.1f per trip)%n",
                N, j.length, (double) j.length / N, m.length, (double) m.length / N);
        System.out.printf("%d trips, one stream each: java %d bytes (%.1f per trip)%n", N, javaEach(list), (double) javaEach(list) / N);
        System.out.printf("write: java %.2f ms, manual %.2f ms%n", bestMs(() -> java(list)), bestMs(() -> manual(list)));
        System.out.printf("read:  java %.2f ms, manual %.2f ms%n", bestMs(() -> readJava(j)), bestMs(() -> readManual(m)));
        System.out.printf("write one stream per trip: %.2f ms%n", bestMs(() -> javaEach(list)));
    }
}`,
        },
        {
          type: "output",
          text: `one trip: java 164 bytes, manual 45 bytes (+4 for the count)
10000 trips: java 420195 bytes (42.0 per trip), manual 405004 bytes (40.5 per trip)
10000 trips, one stream each: java 1635000 bytes (163.5 per trip)
write: java 3.20 ms, manual 1.86 ms
read:  java 3.66 ms, manual 1.79 ms
write one stream per trip: 8.53 ms`,
        },
        {
          type: "list",
          items: [
            "**One object, one stream: 164 bytes against 45.** The class descriptor (name, UID, five field names and type strings) is most of it. Caches that store one object per key (Redis, Memcached, a session store) pay this on every entry: 10,000 trips stored separately took 1.6 MB, against 0.4 MB in a single stream.",
            "**Many objects in one stream: 42.0 bytes per trip against 40.5.** The descriptor is written once, and the four zone names are shared `String` objects (they come from one array of literals), so after the first occurrence each zone costs a 5-byte back-reference instead of its characters. Java serialization isn't inherently bloated; it's front-loaded.",
            "**Time**: writing was about 1.7 times slower than the manual format (3.2 ms against 1.9 ms) and reading about 2 times slower (3.7 ms against 1.8 ms). Reflection, handle-table lookups for every object and the descriptor machinery cost something, but for 10,000 objects it's milliseconds. Writing one stream per trip took 8.5 ms, mostly creating 10,000 `ObjectOutputStream`s and writing 10,000 descriptors.",
            "**Deep copy** through serialization was about 400 times slower than a copy constructor (Example 1).",
            "The numbers moved between runs (under load from other processes, the same write took up to 12 ms), but the ratios and the sizes were stable. The sizes are exact and deterministic.",
            "The next lesson compares Java serialization with Jackson JSON and the manual format at 100,000 objects, where the picture changes again.",
          ],
        },
      ],
    },
    {
      title: "Serialization in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing backend keeps rider sessions in a shared cache (Redis in production) so any API instance can serve any rider. Sessions are stored as Java-serialized `RiderSession` objects, valid for 30 days, and the class had no `serialVersionUID` because \"it's only a cache\". Release 42 added one field, `preferredPayment`. Within minutes of the deploy, every request from an existing rider failed session lookup, the API returned 401, and the app logged out every rider in Kolkata at once. Support tickets spiked, and the re-login wave hammered the OTP service. I rebuilt it with two versions of the class compiled separately and a directory standing in for Redis: one serialized blob per key, surviving the deploy.",
        },
        {
          type: "code",
          language: "java",
          title: "v1/RiderSession.java",
          code: `import java.io.Serializable;

// Release 41: what's in the session cache when the deploy starts
public class RiderSession implements Serializable {
    final String riderId;
    final String name;
    final String homeZone;
    final long expiresAtMillis;

    public RiderSession(String riderId, String name, String homeZone, long expiresAtMillis) {
        this.riderId = riderId; this.name = name; this.homeZone = homeZone; this.expiresAtMillis = expiresAtMillis;
    }

    public String toString() { return riderId + " " + name + " " + homeZone; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "v2/RiderSession.java",
          code: `import java.io.Serializable;

// Release 42: one new field, still no serialVersionUID
public class RiderSession implements Serializable {
    final String riderId;
    final String name;
    final String homeZone;
    final long expiresAtMillis;
    String preferredPayment;                       // new: "UPI", "CASH", "CARD"

    public RiderSession(String riderId, String name, String homeZone, long expiresAtMillis) {
        this.riderId = riderId; this.name = name; this.homeZone = homeZone; this.expiresAtMillis = expiresAtMillis;
    }

    public String toString() { return riderId + " " + name + " " + homeZone + " pay=" + preferredPayment; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "v3/RiderSession.java",
          code: `import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.Serial;
import java.io.Serializable;

// Release 42.1: the UID is pinned to release 41's computed value
public class RiderSession implements Serializable {
    @Serial private static final long serialVersionUID = -2775589895762056572L;   // from: serialver RiderSession

    final String riderId;
    final String name;
    final String homeZone;
    final long expiresAtMillis;
    String preferredPayment;

    public RiderSession(String riderId, String name, String homeZone, long expiresAtMillis) {
        this.riderId = riderId; this.name = name; this.homeZone = homeZone; this.expiresAtMillis = expiresAtMillis;
        this.preferredPayment = "UPI";
    }

    @Serial private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
        in.defaultReadObject();
        if (preferredPayment == null) preferredPayment = "UPI";      // old entries: same default as new sessions
    }

    public String toString() { return riderId + " " + name + " " + homeZone + " pay=" + preferredPayment; }
}`,
        },
        {
          type: "code",
          language: "java",
          title: "SessionCache.java",
          code: `import java.io.IOException;
import java.io.InvalidClassException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

// Stands in for Redis: one serialized blob per key, surviving the deploy
public class SessionCache {
    static final Path DIR = Path.of("cache");

    static void put(String key, RiderSession s) throws IOException {
        Files.createDirectories(DIR);
        try (ObjectOutputStream out = new ObjectOutputStream(Files.newOutputStream(DIR.resolve(key)))) {
            out.writeObject(s);
        }
    }

    // What shipped: any failure propagates, the API answers 401 and the app logs the rider out
    static RiderSession get(String key) throws IOException, ClassNotFoundException {
        try (ObjectInputStream in = new ObjectInputStream(Files.newInputStream(DIR.resolve(key)))) {
            return (RiderSession) in.readObject();
        }
    }

    // The fix's second half: an unreadable entry is a cache miss, counted, never an outage
    static int misses = 0;
    static RiderSession getOrMiss(String key) {
        try {
            return get(key);
        } catch (InvalidClassException e) {
            misses++;
            Path p = DIR.resolve(key);
            try { Files.deleteIfExists(p); } catch (IOException ignored) { }
            return null;                               // caller re-authenticates with the refresh token
        } catch (IOException | ClassNotFoundException e) {
            misses++;
            return null;
        }
    }

    public static void main(String[] args) throws Exception {
        List<String> riders = List.of("R-1", "R-2", "R-3");
        if (args[0].equals("login")) {                 // login R-1 R-2 ...: cache fresh sessions
            Map<String, String[]> known = Map.of("R-1", new String[] {"Asha", "SALT-LAKE"},
                    "R-2", new String[] {"Ravi", "NEW-TOWN"}, "R-3", new String[] {"Meera", "HOWRAH"});
            for (int i = 1; i < args.length; i++) {
                String[] r = known.get(args[i]);
                put(args[i], new RiderSession(args[i], r[0], r[1], 1_794_000_000_000L));
            }
            System.out.println("cached sessions: " + (args.length - 1));
        } else if (args[0].equals("serve")) {
            for (String r : riders) {
                try {
                    System.out.println("200 " + get(r));
                } catch (InvalidClassException e) {
                    System.out.println("401 " + r + " logged out: " + e.getMessage());
                }
            }
        } else {
            for (String r : riders) {
                RiderSession s = getOrMiss(r);
                System.out.println(s != null ? "200 " + s : "miss " + r + " -> refresh token flow");
            }
            System.out.println("cache misses: " + misses);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `for v in v1 v2 v3; do javac -d $v $v/RiderSession.java SessionCache.java; done
java -cp v1 SessionCache login R-1 R-2 R-3; java -cp v1 SessionCache serve      # release 41 is live
java -cp v2 SessionCache serve                                                  # release 42 deployed
java -cp v2 SessionCache login R-2                                              # Ravi logs in again on 42
java -cp v3 SessionCache recover                                                # release 42.1`,
        },
        {
          type: "output",
          text: `# release 41 is live
cached sessions: 3
200 R-1 Asha SALT-LAKE
200 R-2 Ravi NEW-TOWN
200 R-3 Meera HOWRAH
# release 42 deployed
401 R-1 logged out: RiderSession; local class incompatible: stream classdesc serialVersionUID = -2775589895762056572, local class serialVersionUID = 5084895147188463806
401 R-2 logged out: RiderSession; local class incompatible: stream classdesc serialVersionUID = -2775589895762056572, local class serialVersionUID = 5084895147188463806
401 R-3 logged out: RiderSession; local class incompatible: stream classdesc serialVersionUID = -2775589895762056572, local class serialVersionUID = 5084895147188463806
# Ravi logs in again on release 42
cached sessions: 1
# release 42.1: pinned UID + miss on failure
200 R-1 Asha SALT-LAKE pay=UPI
miss R-2 -> refresh token flow
200 R-3 Meera HOWRAH pay=UPI
cache misses: 1`,
        },
        {
          type: "list",
          items: [
            "**Why everything failed at once.** Release 41's `RiderSession` had a computed UID of `-2775589895762056572`. Adding a field changed it to `5084895147188463806`, and `readObject` compares the two before reading a single field. Every cached session was written by 41, so every lookup threw `InvalidClassException`, and the code treated any exception as \"not authenticated\".",
            "**Why nobody noticed before the deploy.** Tests create sessions and read them in the same build, so the UIDs always match. The failure needs bytes written by the **previous** release, which only exist in production. Staging had a fresh cache.",
            "**The fix, part one: pin the UID to the old computed value.** `serialver -classpath <release 41 jar> RiderSession` printed `-2775589895762056572L`; release 42.1 declares exactly that. Old sessions now read, and the new field gets its default in `readObject` (`UPI`, the same as a new session) rather than `null`. Declaring `1L` would have been just as broken as no UID.",
            "**The fix, part two: an unreadable cache entry is a miss, not an outage.** During the bad deploy Ravi logged in again on release 42, so his entry has the 42 UID and 42.1 can't read it. `getOrMiss` counts it, deletes the entry and sends him through the refresh-token flow: one silent re-authentication instead of a logout. That miss counter is the metric to alert on after every deploy.",
            "**The real fix: stop storing Java-serialized objects in a shared cache.** A cache outlives deploys and is read by mixed versions during a rolling deploy, which is the worst case for a format tied to class structure. The next lesson moves this session to JSON with explicit DTOs, where adding a field breaks nothing in either direction, and shows the security reason to do it as well.",
            "**Process lessons.** Keep serialized samples from the previous release as test fixtures and read them in CI; turn on `-Xlint:serial` so a `Serializable` class without a UID fails the build; and roll out with a canary that reads existing cache entries before the full deploy.",
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
              question: "What is serialization in Java, and how do you make a class serializable?",
              answer:
                "Converting an object graph into a stream of bytes so it can be stored or sent, and deserialization is rebuilding an equivalent graph from those bytes. A class opts in by implementing `java.io.Serializable`; `ObjectOutputStream.writeObject` writes an object and everything reachable from it, and `ObjectInputStream.readObject` reads it back as a new object. Every object in the graph must be serializable, or the write fails with `NotSerializableException`.",
            },
            {
              question: "Serializable has no methods. Why is it an interface at all?",
              answer:
                "It's a **marker interface**: it carries no behaviour, only the class author's permission. `ObjectOutputStream` checks `instanceof Serializable` before writing an object's fields, because writing private state is a decision the class should make, not the caller. `Serializable.class.getDeclaredMethods().length` is 0. The hooks a class can add (`writeObject`, `readObject`, `readResolve`...) are found by reflection, not declared in the interface.",
            },
            {
              question: "What is serialVersionUID?",
              answer:
                "A `private static final long` that identifies the version of a serializable class. It's written into every stream, and on read it must equal the local class's value, or `readObject` throws `InvalidClassException: local class incompatible`. If the class doesn't declare one, the JVM computes a hash of the class's structure. In my test, adding one field changed the computed value from `6925918969697765721` to `2205812759625914248` and broke reading old data; so always declare it explicitly.",
            },
            {
              question: "What does transient do?",
              answer:
                "It excludes a field from serialization. The value isn't written (not even the field name is in the stream), and after deserialization the field has the type's default: `null`, `0`, `false`, not the value from its initialiser, because initialisers don't run. Use it for passwords and OTPs, caches, derived values, and non-data objects like threads and connections.",
            },
            {
              question: "Are static fields serialized?",
              answer:
                "No. Static fields belong to the class, not the object, so they're not in the stream. After deserializing, a static field has whatever value the reading JVM has. In my test I changed a static to 99 after writing, and the deserialized object's class showed 99. `serialVersionUID` is the special case: it's static, but it's read once per class and written into the class descriptor.",
            },
            {
              question: "What happens if a field's type is not serializable?",
              answer:
                "`writeObject` throws `NotSerializableException` naming that class (for example `NotSerializable$PaymentGateway`), and the stream is left with an aborted write marker: reading it gives `WriteAbortedException`. Fixes: make the field `transient` (and restore it after reading), make its class serializable if it's really data, or keep such references out of serialized objects. `-Xlint:serial` warns about fields with non-serializable declared types.",
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
              question: "Is a constructor called during deserialization?",
              answer:
                "Not the class's own. For a `Serializable` class, the JVM allocates the object and runs only the no-arg constructor of the **first non-serializable superclass** (often `Object()`), then sets the fields directly from the stream. Field initialisers and constructor validation are skipped. In my test, deserializing a `Rider extends Person extends Entity` ran only `Entity()`; `Entity`'s fields were re-initialised by it, not restored. If that superclass has no accessible no-arg constructor, reading fails with `no valid constructor`. Exceptions: `Externalizable` calls its public no-arg constructor, and records call their canonical constructor.",
            },
            {
              question: "What is the difference between Serializable and Externalizable?",
              answer:
                "`Serializable` is automatic: the JVM writes the non-transient fields of each class in the hierarchy, with optional `writeObject`/`readObject` hooks, and doesn't call the class's constructor on read. `Externalizable` makes the class responsible for everything through public `writeExternal`/`readExternal`; the stream writes only the class identity, and on read calls the **public no-arg constructor** first. Externalizable was smaller in my test (71 bytes against 137) but needs non-final fields, manual versioning and superclass handling, and exposes a public `readExternal` that anyone can call on a live object.",
            },
            {
              question: "How do you make a singleton safe from serialization?",
              answer:
                "Add `readResolve()` returning the instance: deserialization still creates a copy, but the stream then replaces it with what `readResolve` returns. Also mark the instance fields `transient`, so no state travels into the discarded copy. My test showed `PlainConfig` coming back as a different instance and `SafeConfig` as the same one. The simplest option is a single-constant enum: enums are serialized by name and resolved with `Enum.valueOf`, so the JVM guarantees one instance.",
            },
            {
              question: "How are enums serialized?",
              answer:
                "By name only: `TC_ENUM`, the enum's class descriptor (with UID 0), and the constant's name. Fields aren't written, and `serialVersionUID`, `writeObject`, `readObject`, `writeReplace` and `readResolve` are ignored. Reading calls `Enum.valueOf`, returning the existing constant. Consequences: enum identity survives, mutable state on a constant isn't transferred, and renaming a constant breaks old streams.",
            },
            {
              question: "What happens when the same object is written twice, or two objects reference the same third object?",
              answer:
                "Each object is written once per stream; later occurrences are 5-byte back-references (`TC_REFERENCE` plus a handle from the handle table). So shared references stay shared and cycles work after reading. The trap is mutation: writing an object, changing it and writing it again sends only a back-reference, and the reader gets the old state. `reset()` clears the table; `writeUnshared` writes a fresh copy.",
            },
            {
              question: "Which class changes are compatible with an explicit serialVersionUID?",
              answer:
                "Adding fields (they get default values), removing fields (their stream values are skipped), adding or removing `writeObject`/`readObject`, changing access modifiers, and adding new serializable classes to the graph. Incompatible: changing a field's type (I got `incompatible types for field paise`), renaming the class or moving its package, changing the class hierarchy, switching between `Serializable` and `Externalizable`, or between enum and non-enum. Renaming a field silently loses its value unless `serialPersistentFields` keeps the old name.",
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
              question: "How is the default serialVersionUID computed, and why is it fragile?",
              answer:
                "It's the first 8 bytes of a SHA-1 over the class name, class modifiers, interface names, field names and modifiers (excluding private static and private transient fields), whether there is a static initialiser, and non-private constructors and methods with their signatures. I measured that adding a public method or a static initialiser changes it, while adding a private method doesn't. Because it reflects code shape rather than data, harmless refactorings break compatibility, and synthetic members can make it differ between compilers. The specification recommends declaring it explicitly.",
            },
            {
              question: "What does the binary stream look like?",
              answer:
                "`ac ed 00 05` (magic, version 5), then tagged records: `73` `TC_OBJECT`, `72` `TC_CLASSDESC` with the class name, UID, flags and field list (type code, name, and a type signature string for object fields), `78` end of block, `70` null superclass, then field values: primitives first, then objects, each group sorted by name, big-endian. Repeated objects and descriptors are `71` `TC_REFERENCE` with a handle starting at `0x7e0000`. My one-`Fare` stream was 92 bytes, 67 of them the descriptor, and a second `Fare` in the same stream was 25.",
            },
            {
              question: "How does deserialization create an object without calling its constructor?",
              answer:
                "`ObjectStreamClass` obtains a serialization constructor from `jdk.internal.reflect.ReflectionFactory`: a generated accessor (`GeneratedSerializationConstructorAccessor1` in my stack trace on JDK 21) that allocates an instance of the target class but invokes the no-arg constructor of its first non-serializable superclass. Then `readSerialData` writes field values directly through `FieldReflector`, which uses `Unsafe` field offsets, so even `final` fields are set without running any of the class's code.",
            },
            {
              question: "How are records serialized differently, and why does it matter?",
              answer:
                "A record's stream contains its component values, and on read `ObjectInputStream` collects them and invokes the canonical constructor (via `readRecord` and a method handle). So the compact constructor's validation runs on every deserialization: my tampered record stream was rejected with `InvalidObjectException` wrapping the constructor's `IllegalArgumentException`, while the equivalent class accepted `-1`. `readObject`/`writeObject`/`serialPersistentFields` are ignored for records, the default UID is 0, and UID mismatches are waived.",
            },
            {
              question: "What are writeReplace and readResolve used for beyond singletons?",
              answer:
                "`writeReplace` substitutes another object before writing; `readResolve` substitutes after reading. Together they implement the serialization proxy pattern: the class writes a small private proxy holding only the logical state, and the proxy's `readResolve` rebuilds the real object through its public constructor or factory, so invariants are checked and the real class's internal representation never appears in the stream. They also canonicalise instances (my `ZoneRef` wrote a 72-byte key and resolved to the receiving JVM's registry object) and handle classes like `List.of`, which serializes through `java.util.CollSer`.",
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
              question: "After a deploy that only added one field to a session class, every user was logged out. What happened and how do you fix it?",
              answer:
                "The class had no explicit `serialVersionUID`, so the JVM computed one from its structure; adding a field changed it, and every session written by the previous release failed with `InvalidClassException` on read, which the code treated as unauthenticated. My rebuild reproduced it: three 401s, UID `-2775589895762056572` in the stream against `5084895147188463806` locally.\n\nImmediate fix: run `serialver` on the previous release's class and declare exactly that value, plus a `readObject` that defaults the new field. Make cache read failures a miss (re-authenticate silently), not a logout. Long-term: store sessions as JSON with explicit DTOs, and keep previous-release samples in CI.",
            },
            {
              question: "A deserialized object has a field that should never be null, but it is. The constructor checks it. How?",
              answer:
                "Constructors of serializable classes don't run on deserialization, so the check never happened. Possible causes: the stream was written by an older version without that field (it got the default `null`), the field is `transient`, or the data was tampered with. Fix by validating in `readObject` after `defaultReadObject()` (throw `InvalidObjectException`), defaulting new fields there, or converting the class to a record so the canonical constructor validates on every read.",
            },
            {
              question: "A service streams location updates over a socket with one long-lived ObjectOutputStream. The receiver keeps seeing the first location, and the sender's memory grows. Why?",
              answer:
                "The handle table: after the first write of a `Location` object, every later `writeObject` of the same instance is just a back-reference, so the receiver gets the original state; and the table keeps a strong reference to every object ever written, so nothing is collected. `StaleWrite` showed SALT-LAKE twice after the cab moved. Fix: call `reset()` after each message, or use `writeUnshared`, or create immutable message objects per update. Better still, use a message format that doesn't track identity.",
            },
            {
              question: "A batch job's object fails to serialize with NotSerializableException: java.lang.Object, but every class in the model implements Serializable. How do you find it?",
              answer:
                "Run with `-Dsun.io.serialization.extendedDebugInfo=true`: the exception message then lists the path, like `custom writeObject data (class \"java.util.ArrayList\")`, `field (class \"Booking\", name: \"stops\")`, `root object`. The culprit is usually a value in a `List<Object>`, `Map<String, Object>` or a lambda captured in a field. Then decide whether it's data (make it serializable) or not (make the field `transient`), and narrow the declared types so `-Xlint:serial` can see it next time.",
            },
            {
              question: "Someone proposes deep-copying domain objects with serialization because it's one line. What do you say?",
              answer:
                "It works for any serializable graph, including cycles, but I measured it at about 400 times slower than a copy constructor (9.7 µs against 0.024 µs for a small route), it fails on any non-serializable field, and it bypasses constructors, so invariants aren't checked on the copy. It's fine for a test helper or a rare operation; on a hot path I'd write copy constructors or use immutable objects, which don't need copying at all.",
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
            "Serialize `Integer.valueOf(5)` to a file and look at it with `xxd`. Count the bytes and find the class names in it.",
            "Write a `Serializable` class with no `serialVersionUID`, run `serialver` on it, add a `private` method and run it again, then add a `public` method and run it again.",
            "Serialize an object of that class, add a field, and read the old file. Then declare the first `serialver` value in the new class and read it again.",
            "Give a `Serializable` class a `transient int` field initialised to `-1` and a field initialiser `int retries = 3` that you change to 7 before writing. Print both after reading.",
            "Make a `Serializable` class extend a non-serializable class that only has a constructor with parameters. Write an instance, then read it.",
            "Write one mutable object twice to the same `ObjectOutputStream`, changing a field in between. Read both and compare them with `==`. Then add `out.reset()` between the writes.",
            "Write a record whose compact constructor prints a line and rejects negative values. Serialize it, deserialize it, and watch for the print.",
            "Compile a `Serializable` class that has a `public void writeObject(ObjectOutputStream)` with `javac -Xlint:serial`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 gives 81 bytes starting `ac ed 00 05 73 72 00 11` and containing both `java.lang.Integer` and `java.lang.Number` (the superclass has its own descriptor), with the value `00 00 00 05` at the very end. Step 2: the private method leaves the value unchanged, the public one changes it. Step 3 fails with `InvalidClassException: ... local class incompatible`, then reads with the new field at its default. Step 4 prints `0` for the transient field and 7 for `retries`: initialisers don't run, the stream's value wins. Step 5 writes fine and fails on read with `InvalidClassException: ...; no valid constructor`. Step 6 gives `true` and the old state for the second read; with `reset()` it gives `false` and the new state. Step 7 prints the constructor line again during `readObject`. Step 8 warns `serialization-related method writeObject not declared private`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHAT       Serializable (marker, 0 methods) -> fields written, not code
           ObjectOutputStream.writeObject: whole reachable graph
           ObjectInputStream.readObject: a NEW object, cast comes last

STREAM     ac ed 00 05 | 73 TC_OBJECT | 72 CLASSDESC name, UID, flags, fields
           values: primitives first, then objects, sorted by name
           descriptor once per stream; repeats = 71 00 7e xx xx (handles)
           1 Fare: 92 B (67 descriptor); 2nd Fare in same stream: 25 B

VERSION    no serialVersionUID -> SHA-1 of class shape
           + field / public method / static init -> new UID -> InvalidClassException
           declare it; rescue with: serialver OldClass
           explicit UID: add field = default, remove = skipped, type change = error

SKIPPED    transient -> default value (initialiser NOT re-run)
           static    -> never written
           constructors of Serializable classes -> NOT called
           first non-serializable superclass's no-arg ctor -> called

HOOKS      private writeObject / readObject (+ defaultWrite/ReadObject)
           readResolve (singletons)  writeReplace (proxies)
           enums: by name, hooks ignored; records: canonical ctor runs
           Externalizable: public no-arg ctor + writeExternal/readExternal

TRAPS      NotSerializableException (extendedDebugInfo=true for the path)
           same object written twice -> stale back-reference (reset())
           -Xlint:serial catches wrong hooks and missing UIDs`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "Java serialization writes field values plus a full description of each class (name, version, field layout), and reads them back by finding the class by name and filling its fields without running its constructors. Shared references and cycles survive through a handle table.",
            "Almost every problem comes from that design: computed `serialVersionUID`s break on harmless changes, constructor validation is skipped, transient and static fields come back empty or local, and long-lived data ties you to old class shapes. Declare the UID, validate in `readObject` or use records, and keep the serialized form small and deliberate.",
            "The next lesson, Serialization Pitfalls, Security and Alternatives, covers the bigger problem: `readObject` runs code from whatever classes the sender names. It shows a harmless gadget doing exactly that, `ObjectInputFilter` allow-lists and limits, deserialization bombs, the serialization proxy pattern, and Java serialization measured against JSON and a hand-written binary format.",
          ],
        },
      ],
    },
  ],
};
