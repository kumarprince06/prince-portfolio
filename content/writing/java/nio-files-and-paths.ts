import type { Lesson } from "../types";

export const nioFilesAndPaths: Lesson = {
  slug: "nio-files-and-paths",
  date: "2026-11-13",
  title: "java.nio.file: Paths, Files and Large Files",
  description:
    "The modern file API on JDK 21: Path and its resolve, normalize and relativize rules, Files.readString, readAllLines, lines and write with StandardOpenOption, exceptions like NoSuchFileException and AccessDeniedException instead of File's false, strict UTF-8 decoding, what Files.copy and Files.move become in strace (copy_file_range and rename), Files.lines and Files.list leaking descriptors and directory streams that no GC will ever close, walking trees, attributes and temp files, FileChannel and memory-mapped files measured on a 512 MB file, readAllLines needing 1.5 GB of heap for it while Files.lines ran in 64 MB, WatchService, a FileLock silently released by closing another channel, and a pricing service that quoted a 2-paise cab fare from a half-written fare file until the writer switched to write-temp-and-rename.",
  tags: ["Core Java", "File Handling", "NIO.2", "Large Files"],
  sections: [
    {
      title: "What java.nio.file Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, File I/O with java.io: Streams, Readers and Writers, took apart the original API: decorator stacks, buffers, charsets, and a `java.io.File` class that answers \"it failed\" with `false`. **`java.nio.file`**, added in Java 7 and usually called **NIO.2**, is the replacement for the file-management half of that: naming files, creating, copying, moving and deleting them, reading their attributes, walking directories. It also offers one-call reads and writes for whole files and factory methods that return the same readers, writers and streams as before.",
        },
        {
          type: "paragraph",
          text: "Three types do most of the work. A **`Path`** is a location in a file system, like `/srv/fares/kolkata.csv`; making one touches nothing on disk. **`Files`** is a class of static methods that act on paths: `Files.readString(path)`, `Files.move(tmp, target, ATOMIC_MOVE)`, `Files.walk(dir)`. And a **`FileSystem`** (usually the default one) knows how to turn paths into system calls. Failures are exceptions with names: `NoSuchFileException`, `AccessDeniedException`, `DirectoryNotEmptyException`.",
        },
        {
          type: "paragraph",
          text: "Below `Files` sits the NIO layer from Java 1.4: **`FileChannel`**, **`ByteBuffer`** and **memory-mapped files**, used for random access, very large files, locking and zero-copy transfers. This lesson reads the JDK's implementation through `javap` and `strace`, measures six ways to read a 512 MB file, shows which streams leak when they aren't closed, and ends with a fare file read while it was being rewritten.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.4 (2002) brought \"New I/O\" (JSR 51): buffers, channels, charsets, non-blocking sockets, `FileChannel`, memory mapping and file locks. It didn't touch `java.io.File`, whose problems were well known: boolean results, no symbolic links, no attributes beyond size and dates, no way to watch a directory, and `renameTo` that behaved differently per platform. JSR 203, \"More New I/O APIs\", led by Alan Bateman, fixed that in Java 7 (2011) with `java.nio.file`.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.4 (2002)", "NIO (JSR 51): `ByteBuffer`, `FileChannel`, `MappedByteBuffer`, `FileLock`, `java.nio.charset`", "The layer under `Files`; random access and mapping"],
            ["Java 7 (2011)", "NIO.2 (JSR 203): `Path`, `Paths`, `Files`, `FileSystem`, attribute views, `WatchService`, `walkFileTree`, `File.toPath()`", "Exceptions instead of booleans; atomic moves; symbolic links"],
            ["Java 8 (2014)", "`Files.lines`, `list`, `walk`, `find`; overloads without a charset that use UTF-8", "Lazy streams over files and directories, which must be closed"],
            ["Java 11 (2018)", "`Path.of`, `Files.readString`, `Files.writeString`", "Small text files in one call"],
            ["Java 12 (2019)", "`Files.mismatch`", "Compare two files without reading both into memory"],
            ["Java 14 (2020)", "JEP 352: non-volatile mapped byte buffers", "Mapping persistent memory"],
            ["Java 21 (2023)", "Foreign Function and Memory API in third preview (JEP 442), `FileChannel.map` to a `MemorySegment`", "Mapping more than 2 GB in one piece; final in Java 22"],
          ],
        },
        {
          type: "paragraph",
          text: "One difference from java.io matters on day one: every `Files` method that reads or writes text without a charset argument uses **UTF-8**, and has done since Java 8, years before JEP 400 made UTF-8 the default for `FileReader`. And `Files` decodes **strictly**: invalid input throws `MalformedInputException` instead of becoming U+FFFD, as Internal Working shows.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of shops on a market street.",
        },
        {
          type: "list",
          items: [
            "A **`Path` is an address written on a slip of paper**: \"SALT-LAKE, block CK, shop 12\". Writing it doesn't build the shop, and two slips with different spellings (`a/../b` and `b`) can point to the same place. `normalize` and `resolve` are tidying and combining addresses on paper.",
            "**`Files` is the municipal office** that actually builds, demolishes, copies and moves shops. When something can't be done, it hands back a form with the reason ticked: no such shop, shop not empty, not your shop. `java.io.File` just shook its head.",
            "**A directory stream (`Files.list`, `Files.walk`) is a key to the market gate**, signed out from the office. If nobody returns it, the office runs out of keys. Some keys get collected by a cleaner eventually (`Files.lines`); directory keys never do, which I measured.",
            "**Rewriting a file in place is renovating a shop while it's open.** Customers walk in and find empty shelves or half a price list. **The atomic write pattern** builds the new shop next door, fully stocked, and swaps the signboard overnight in one move: every customer sees either the old shop or the new one.",
            "**A memory-mapped file is a window from the shop into the warehouse**: instead of a porter carrying boxes (`read()` copying bytes), I look straight at the shelves.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: the signboard swap only works if both shops are on the same street. A `rename` across file systems is impossible, so `Files.move(..., ATOMIC_MOVE)` throws instead of quietly copying, and the temp file must be created in the same directory as the target.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The main types",
        },
        {
          type: "table",
          headers: ["Type", "What it is", "Typical use"],
          rows: [
            ["`Path`", "An immutable location: optional root plus a sequence of names", "`Path.of(\"/srv\", \"fares.csv\")`, `dir.resolve(name)`"],
            ["`Paths`", "Old factory (Java 7)", "`Paths.get(...)`, same as `Path.of`"],
            ["`Files`", "Static methods on paths", "Read, write, copy, move, delete, attributes, walk"],
            ["`FileSystem`, `FileSystems`", "A file system and the factory for it", "`FileSystems.getDefault()`; also ZIP file systems"],
            ["`StandardOpenOption`", "How to open: `READ`, `WRITE`, `CREATE`, `CREATE_NEW`, `APPEND`, `TRUNCATE_EXISTING`, `SYNC`, `DSYNC`, `DELETE_ON_CLOSE`", "`Files.write(p, bytes, CREATE, APPEND)`"],
            ["`StandardCopyOption`", "`REPLACE_EXISTING`, `COPY_ATTRIBUTES`, `ATOMIC_MOVE`", "`Files.move(tmp, p, ATOMIC_MOVE)`"],
            ["`LinkOption`", "`NOFOLLOW_LINKS`", "Look at a symlink itself, not its target"],
            ["`FileChannel`", "A channel to an open file, with a position", "Positional reads, `force`, `map`, `lock`, `transferTo`"],
            ["`MappedByteBuffer`", "A file region mapped into memory", "Reading or updating large files without `read()` copies"],
            ["`WatchService`", "Notifications of changes in a directory", "Reload a config file when it's replaced"],
            ["`BasicFileAttributes`, `PosixFileAttributes`", "File metadata in one call", "Size, times, type, owner, permissions"],
          ],
        },
        {
          type: "heading",
          text: "Paths: resolve, normalize, relativize",
        },
        {
          type: "code",
          language: "java",
          title: "PathBasics.java",
          code: `import java.nio.file.Path;
import java.nio.file.Paths;

public class PathBasics {
    public static void main(String[] args) {
        Path base = Path.of("/srv/fares");
        Path rel = Path.of("kolkata", "zones", "..", "salt-lake.csv");

        System.out.println("rel           " + rel + "  absolute? " + rel.isAbsolute() + "  names " + rel.getNameCount());
        System.out.println("normalize     " + rel.normalize());
        System.out.println("resolve       " + base.resolve(rel).normalize());
        System.out.println("resolve abs   " + base.resolve("/etc/passwd"));
        System.out.println("resolveSibling " + Path.of("/srv/fares/today.csv").resolveSibling("today.csv.tmp"));
        System.out.println("relativize    " + base.relativize(Path.of("/srv/fares/kolkata/new-town.csv")));
        System.out.println("relativize up " + base.relativize(Path.of("/srv/logs/app.log")));
        Path f = Path.of("/srv/fares/kolkata/new-town.csv");
        System.out.println("fileName " + f.getFileName() + ", parent " + f.getParent() + ", root " + f.getRoot()
                + ", name(1) " + f.getName(1) + ", subpath(1,3) " + f.subpath(1, 3));
        System.out.println("toAbsolutePath " + Path.of("fares.csv").toAbsolutePath().isAbsolute()
                + ", Paths.get same as Path.of? " + Paths.get("a", "b").equals(Path.of("a/b")));
        System.out.println("startsWith string vs path: " + "/srv/fares-old/x".startsWith("/srv/fares")
                + " " + Path.of("/srv/fares-old/x").startsWith(Path.of("/srv/fares")));

        // A request asks for "../../etc/passwd": resolve, normalize, then check it stayed inside base
        Path asked = base.resolve("../../etc/passwd").normalize();
        System.out.println(asked + " inside base? " + asked.startsWith(base));
        System.out.println("equals is textual: " + Path.of("a/../b").equals(Path.of("b"))
                + ", trailing slash ignored: " + Path.of("/srv/fares/").equals(base));
    }
}`,
        },
        {
          type: "output",
          text: `rel           kolkata/zones/../salt-lake.csv  absolute? false  names 4
normalize     kolkata/salt-lake.csv
resolve       /srv/fares/kolkata/salt-lake.csv
resolve abs   /etc/passwd
resolveSibling /srv/fares/today.csv.tmp
relativize    kolkata/new-town.csv
relativize up ../logs/app.log
fileName new-town.csv, parent /srv/fares/kolkata, root /, name(1) fares, subpath(1,3) fares/kolkata
toAbsolutePath true, Paths.get same as Path.of? true
startsWith string vs path: true false
/etc/passwd inside base? false
equals is textual: false, trailing slash ignored: true`,
        },
        {
          type: "list",
          items: [
            "**A `Path` is just names.** `kolkata/zones/../salt-lake.csv` has 4 names including `..`; no file needs to exist. `toAbsolutePath()` prefixes the working directory; `toRealPath()` (used in Example 2) asks the file system and resolves symbolic links.",
            "**`normalize()` removes `.` and `name/..` pairs textually**, without checking the disk. If `zones` were a symbolic link, the real `zones/..` could be a different directory; `toRealPath()` is the one that knows.",
            "**`resolve` joins, unless the argument is absolute**: `base.resolve(\"/etc/passwd\")` is `/etc/passwd`. Any code that resolves user input against a base directory must normalize and then check `startsWith(base)`, or a request for `../../etc/passwd` walks out of it.",
            "**`relativize` is the inverse of `resolve`**: the path from `base` to the other path, with `..` where needed.",
            "**`Path.startsWith` compares names, `String.startsWith` compares characters**: `/srv/fares-old/x` starts with the string `/srv/fares` but not with the path `/srv/fares`. That difference is a classic security bug in path checks.",
            "**`equals` is textual too**: `a/../b` isn't equal to `b`. `Files.isSameFile(p, q)` asks the file system.",
          ],
        },
        {
          type: "heading",
          text: "Files: which method for which file",
        },
        {
          type: "table",
          headers: ["Job", "Small file (fits in memory)", "Large file"],
          rows: [
            ["Read text", "`Files.readString(p)`, `Files.readAllLines(p)`", "`Files.lines(p)` in try-with-resources, `Files.newBufferedReader(p)`"],
            ["Read bytes", "`Files.readAllBytes(p)`", "`Files.newInputStream(p)`, `FileChannel`, `map`"],
            ["Write text", "`Files.writeString(p, s)`, `Files.write(p, lines)`", "`Files.newBufferedWriter(p)`"],
            ["Write bytes", "`Files.write(p, bytes)`", "`Files.newOutputStream(p)`, `FileChannel`"],
            ["Charset when not given", "UTF-8", "UTF-8"],
            ["Invalid input", "`MalformedInputException`", "`MalformedInputException` (inside `UncheckedIOException` from `lines`)"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "What the default file system is made of",
        },
        {
          type: "code",
          language: "java",
          title: "InsideNio.java",
          code: `import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.channels.FileChannel;
import java.nio.file.DirectoryStream;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.stream.Stream;

public class InsideNio {
    public static void main(String[] args) throws IOException {
        Path p = Path.of("/tmp", "fares.csv");
        Files.writeString(p, "SALT-LAKE,18500\\n");
        System.out.println("Path           -> " + p.getClass().getName());
        System.out.println("FileSystem     -> " + FileSystems.getDefault().getClass().getName());
        System.out.println("provider       -> " + FileSystems.getDefault().provider().getClass().getName());
        try (InputStream in = Files.newInputStream(p)) {
            System.out.println("newInputStream -> " + in.getClass().getName());
        }
        try (OutputStream out = Files.newOutputStream(p, StandardOpenOption.APPEND)) {
            System.out.println("newOutputStream-> " + out.getClass().getName());
        }
        try (FileChannel ch = FileChannel.open(p)) {
            System.out.println("FileChannel    -> " + ch.getClass().getName());
        }
        try (BufferedReader r = Files.newBufferedReader(p)) {
            System.out.println("newBufferedReader -> " + r.getClass().getName());
        }
        try (Stream<String> s = Files.lines(p)) {
            System.out.println("lines spliterator -> " + s.spliterator().getClass().getName());
        }
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(Path.of("/tmp"))) {
            System.out.println("DirectoryStream -> " + ds.getClass().getName());
        }
        Files.delete(p);
    }
}`,
        },
        {
          type: "output",
          text: `Path           -> sun.nio.fs.UnixPath
FileSystem     -> sun.nio.fs.LinuxFileSystem
provider       -> sun.nio.fs.LinuxFileSystemProvider
newInputStream -> sun.nio.ch.ChannelInputStream
newOutputStream-> sun.nio.ch.ChannelOutputStream
FileChannel    -> sun.nio.ch.FileChannelImpl
newBufferedReader -> java.io.BufferedReader
lines spliterator -> java.nio.file.FileChannelLinesSpliterator
DirectoryStream -> sun.nio.fs.UnixSecureDirectoryStream`,
        },
        {
          type: "list",
          items: [
            "**`Path` is an interface.** On Linux, `Path.of` returns a `sun.nio.fs.UnixPath`, which stores the path as bytes (encoded with `sun.jnu.encoding`, the OS encoding for file names), not as a `String`. The provider is `LinuxFileSystemProvider`; Windows and macOS have their own. A ZIP file opened with `FileSystems.newFileSystem` gives paths of a different class, which is why `Path` is an interface.",
            "**`Files.newInputStream` is not a `FileInputStream`**: it's a `ChannelInputStream` over a `FileChannelImpl`. It has no buffer either; wrap it, or read in large arrays.",
            "**`Files.newBufferedReader` is the old stack**, an ordinary `java.io.BufferedReader` over an `InputStreamReader`. The difference is in how it's built, shown next.",
            "**`Files.newDirectoryStream` returns a `UnixSecureDirectoryStream`**, which matters for descriptor counts below.",
          ],
        },
        {
          type: "heading",
          text: "Strict decoding, read from javap",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -c java.nio.file.Files | grep -A12 "BufferedReader newBufferedReader(java.nio.file.Path, java.nio.charset.Charset)" | grep -E "Method|class"`,
        },
        {
          type: "output",
          text: `       1: invokevirtual #522                // Method java/nio/charset/Charset.newDecoder:()Ljava/nio/charset/CharsetDecoder;
       5: new           #528                // class java/io/InputStreamReader
      14: invokestatic  #239                // Method newInputStream:(Ljava/nio/file/Path;[Ljava/nio/file/OpenOption;)Ljava/io/InputStream;
      18: invokespecial #530                // Method java/io/InputStreamReader."<init>":(Ljava/io/InputStream;Ljava/nio/charset/CharsetDecoder;)V
      22: new           #533                // class java/io/BufferedReader
      27: invokespecial #535                // Method java/io/BufferedReader."<init>":(Ljava/io/Reader;)V`,
        },
        {
          type: "paragraph",
          text: "`Files.newBufferedReader` passes `cs.newDecoder()` to `InputStreamReader`: a decoder with the default action for malformed input, which is **REPORT** (throw). `new FileReader(file, cs)` passes the `Charset` instead, and `InputStreamReader` then configures the decoder to **REPLACE**. Same classes, opposite behaviour on bad bytes:",
        },
        {
          type: "code",
          language: "java",
          title: "StrictDecoding.java",
          code: `import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class StrictDecoding {
    public static void main(String[] args) throws IOException {
        Path f = Files.createTempFile("rider", ".txt");
        Files.write(f, "Zoë\\n".getBytes(StandardCharsets.ISO_8859_1));      // 5A 6F EB 0A: not valid UTF-8

        try (BufferedReader in = new BufferedReader(new FileReader(f.toFile(), StandardCharsets.UTF_8))) {
            String s = in.readLine();
            System.out.println("FileReader:        \\"" + s + "\\" last char U+" + Integer.toHexString(s.charAt(2)).toUpperCase());
        }
        try (BufferedReader in = Files.newBufferedReader(f, StandardCharsets.UTF_8)) {
            System.out.println("newBufferedReader: " + in.readLine());
        } catch (IOException e) {
            System.out.println("newBufferedReader: " + e);
        }
        try {
            Files.readString(f);
        } catch (IOException e) {
            System.out.println("readString:        " + e);
        }
        System.out.println("new String(bytes): \\"" + new String(Files.readAllBytes(f), StandardCharsets.UTF_8).strip() + "\\"");
    }
}`,
        },
        {
          type: "output",
          text: `FileReader:        "Zo�" last char U+FFFD
newBufferedReader: java.nio.charset.MalformedInputException: Input length = 1
readString:        java.nio.charset.MalformedInputException: Input length = 2
new String(bytes): "Zo�"`,
        },
        {
          type: "list",
          items: [
            "The file holds `Zoë` in Latin-1: `EB` for `ë`, which isn't valid UTF-8. `FileReader` and `new String(bytes, UTF_8)` turned it into U+FFFD silently. `newBufferedReader` and `readString` threw.",
            "`Files.readString` doesn't use a `Reader` at all: `javap` shows `readAllBytes` followed by `JavaLangAccess.newStringNoRepl`, an internal `String` constructor that throws instead of replacing. That different decoder is why its message says `Input length = 2` where the `Reader` says 1.",
            "I prefer the strict behaviour: a file in the wrong charset fails at the first bad byte, instead of becoming corrupt data in a database, which was the previous lesson's production bug.",
          ],
        },
        {
          type: "heading",
          text: "Files.lines uses a FileChannel",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -c java.nio.file.Files | grep -A30 "Stream<java.lang.String> lines(java.nio.file.Path, java.nio.charset.Charset)" | grep -E "Method|Field"`,
        },
        {
          type: "output",
          text: `       1: invokeinterface #7,  1            // InterfaceMethod java/nio/file/Path.getFileSystem:()Ljava/nio/file/FileSystem;
       6: invokestatic  #793                // Method java/nio/file/FileSystems.getDefault:()Ljava/nio/file/FileSystem;
      12: getstatic     #798                // Field java/nio/file/FileChannelLinesSpliterator.SUPPORTED_CHARSETS:Ljava/util/Set;
      16: invokeinterface #803,  2          // InterfaceMethod java/util/Set.contains:(Ljava/lang/Object;)Z
      31: getstatic     #808                // Field java/nio/file/StandardOpenOption.READ:Ljava/nio/file/StandardOpenOption;
      35: invokestatic  #810                // Method java/nio/channels/FileChannel.open:(Ljava/nio/file/Path;[Ljava/nio/file/OpenOption;)Ljava/nio/channels/FileChannel;
      41: invokestatic  #816                // Method createFileChannelLinesStream:(Ljava/nio/channels/FileChannel;Ljava/nio/charset/Charset;)Ljava/util/stream/Stream;
      52: invokevirtual #820                // Method java/nio/channels/FileChannel.close:()V
      57: invokestatic  #544                // Method newBufferedReader:(Ljava/nio/file/Path;Ljava/nio/charset/Charset;)Ljava/io/BufferedReader;
      60: invokestatic  #821                // Method createBufferedReaderLinesStream:(Ljava/io/BufferedReader;)Ljava/util/stream/Stream;`,
        },
        {
          type: "paragraph",
          text: "For the default file system and a charset in `SUPPORTED_CHARSETS` (UTF-8, ISO-8859-1, US-ASCII: charsets where `\\n` is always the single byte `0x0A`), `Files.lines` opens a `FileChannel` and wraps it in a `FileChannelLinesSpliterator`. Sequentially it reads through a `BufferedReader`; when a parallel stream splits it, it memory-maps the file (`javap -p` shows `getMappedByteBuffer` and `unmap`) and cuts it at newline bytes, so `.parallel()` on `Files.lines` can really divide the work. For other charsets, it falls back to a plain `BufferedReader`, which can't be split well. Either way, the stream owns an open file and must be closed.",
        },
        {
          type: "heading",
          text: "Copy, move and list in system calls",
        },
        {
          type: "code",
          language: "bash",
          code: `strace -f -e trace=openat,rename,copy_file_range,dup -o trace.txt java CopyMove   # program below
grep -E 'cm/|shm|copy_file_range' trace.txt`,
        },
        {
          type: "output",
          text: `openat(AT_FDCWD, "cm/fares.csv", O_WRONLY|O_CREAT|O_TRUNC, 0666) = 4
openat(AT_FDCWD, "cm/fares.csv", O_RDONLY) = 4
openat(AT_FDCWD, "cm/fares.bak", O_WRONLY|O_CREAT|O_EXCL, 0100664) = 5
copy_file_range(4, NULL, 5, NULL, 2147479552, 0) = 31
copy_file_range(4, NULL, 5, NULL, 2147479552, 0) = 0
...
openat(AT_FDCWD, "cm/fares.csv.tmp", O_WRONLY|O_CREAT|O_TRUNC, 0666) = 4
rename("cm/fares.csv.tmp", "cm/fares.csv") = 0
openat(AT_FDCWD, "cm/fares.csv", O_RDONLY) = 4
rename("cm/fares.csv", "/dev/shm/fares.csv") = -1 EXDEV (Invalid cross-device link)`,
        },
        {
          type: "list",
          items: [
            "**`Files.writeString` with no options** opens with `O_WRONLY|O_CREAT|O_TRUNC`: the defaults are `CREATE`, `TRUNCATE_EXISTING`, `WRITE`. The file is empty from the moment of the `openat`, which is the root of the production bug.",
            "**`Files.copy` opens the target with `O_EXCL`** (fail if it exists), which is how it throws `FileAlreadyExistsException` without a check-then-act race, and then copies with **`copy_file_range`**: the kernel moves the bytes from one file to the other without them passing through Java's heap. On file systems that support it (Btrfs, XFS), that can even share the data blocks.",
            "**`Files.move` is `rename(2)`**, one system call. Within one file system a rename is atomic: other processes see the old name or the new one, never a half-moved file. Across file systems the kernel refuses with `EXDEV`; without `ATOMIC_MOVE`, `Files.move` then falls back to copy-and-delete, and with it, it throws `AtomicMoveNotSupportedException`.",
            "**`Files.list` opens the directory and then `dup`s the descriptor**: `openat(AT_FDCWD, \"/tmp\", O_RDONLY) = 4` followed by `dup(4) = 5` in a separate trace. `UnixSecureDirectoryStream` keeps one descriptor for `readdir` and one for `openat`-relative operations, so **every open directory stream costs two file descriptors** on Linux.",
          ],
        },
      ],
    },
    {
      title: "Reading and Writing with Files",
      blocks: [
        {
          type: "heading",
          text: "Open options",
        },
        {
          type: "code",
          language: "java",
          title: "OpenOptions.java",
          code: `import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static java.nio.file.StandardOpenOption.*;

public class OpenOptions {
    static Path dir;

    static void attempt(String label, IOAction a) {
        try {
            a.run();
            System.out.printf("%-31s ok%n", label);
        } catch (IOException | IllegalArgumentException e) {
            System.out.printf("%-31s %s: %s%n", label, e.getClass().getSimpleName(),
                    String.valueOf(e.getMessage()).replace(dir.toString(), "<dir>"));
        }
    }

    interface IOAction { void run() throws IOException; }

    public static void main(String[] args) throws IOException {
        dir = Files.createTempDirectory("opts");
        Path f = dir.resolve("zones.txt");

        attempt("write, defaults", () -> Files.write(f, List.of("SALT-LAKE", "NEW-TOWN")));
        attempt("write again, defaults", () -> Files.writeString(f, "GARIA\\n"));
        System.out.println("  now: " + Files.readAllLines(f));
        attempt("APPEND", () -> Files.writeString(f, "HOWRAH\\n", APPEND));
        System.out.println("  now: " + Files.readAllLines(f));
        attempt("WRITE only (no TRUNCATE)", () -> Files.writeString(f, "XX", WRITE));
        System.out.println("  now: " + Files.readAllLines(f));
        attempt("CREATE_NEW on existing file", () -> Files.writeString(f, "x", CREATE_NEW));
        attempt("APPEND to missing file", () -> Files.writeString(dir.resolve("missing.txt"), "x", APPEND));
        attempt("CREATE, APPEND to missing file", () -> Files.writeString(dir.resolve("log.txt"), "x\\n", CREATE, APPEND));
        attempt("READ option on a write", () -> Files.writeString(f, "x", READ));
        attempt("APPEND with TRUNCATE_EXISTING", () -> Files.newOutputStream(f, APPEND, TRUNCATE_EXISTING).close());
        attempt("write into missing directory", () -> Files.writeString(dir.resolve("no/such/a.txt"), "x"));
        attempt("readString on bad UTF-8", () -> {
            Files.write(dir.resolve("latin1.txt"), "Zoë".getBytes(StandardCharsets.ISO_8859_1));
            Files.readString(dir.resolve("latin1.txt"));
        });
    }
}`,
        },
        {
          type: "output",
          text: `write, defaults                 ok
write again, defaults           ok
  now: [GARIA]
APPEND                          ok
  now: [GARIA, HOWRAH]
WRITE only (no TRUNCATE)        ok
  now: [XXRIA, HOWRAH]
CREATE_NEW on existing file     FileAlreadyExistsException: <dir>/zones.txt
APPEND to missing file          NoSuchFileException: <dir>/missing.txt
CREATE, APPEND to missing file  ok
READ option on a write          IllegalArgumentException: READ not allowed
APPEND with TRUNCATE_EXISTING   IllegalArgumentException: APPEND + TRUNCATE_EXISTING not allowed
write into missing directory    NoSuchFileException: <dir>/no/such/a.txt
readString on bad UTF-8         MalformedInputException: Input length = 1`,
        },
        {
          type: "table",
          headers: ["Options", "File missing", "File exists"],
          rows: [
            ["(none) for `write`/`writeString`/`newBufferedWriter`", "Created", "**Truncated** to 0, then written"],
            ["`CREATE, APPEND`", "Created", "Written at the end"],
            ["`APPEND`", "`NoSuchFileException`", "Written at the end"],
            ["`CREATE_NEW`", "Created", "`FileAlreadyExistsException` (atomic `O_EXCL`)"],
            ["`WRITE` alone", "`NoSuchFileException`", "Overwritten from byte 0, **not truncated**"],
            ["`TRUNCATE_EXISTING` + `APPEND`, or `READ` on a write method", "`IllegalArgumentException`", "`IllegalArgumentException`"],
          ],
        },
        {
          type: "list",
          items: [
            "Passing **any** option replaces the defaults. `WRITE` alone overwrote the first two bytes and left the rest: `GARIA` became `XXRIA`. That's how a shorter config file written with `WRITE` keeps the old file's tail.",
            "`CREATE_NEW` is the safe way to claim a file name (a lock file, an idempotency marker), because existence check and creation are one system call.",
            "`write into missing directory` fails: `Files` never creates parent directories. Call `Files.createDirectories(p.getParent())` first.",
            "`readString` throws `MalformedInputException` for a Latin-1 file, as Internal Working showed.",
            "`Files.readString`, `readAllBytes` and `readAllLines` load the whole file. Fine for config and small CSVs; for anything that grows, use `lines` or a reader (Performance shows the memory cost).",
          ],
        },
        {
          type: "heading",
          text: "Exceptions instead of booleans",
        },
        {
          type: "code",
          language: "java",
          title: "FilesVsFile.java",
          code: `import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;

public class FilesVsFile {
    interface IOAction { Object run() throws IOException; }

    static Path dir;

    static void nio(String label, IOAction a) {
        try {
            System.out.printf("%-26s %s%n", label, a.run());
        } catch (IOException e) {
            System.out.printf("%-26s %s: %s%n", label, e.getClass().getSimpleName(),
                    e.getMessage().replace(dir.toString(), "<dir>"));
        }
    }

    public static void main(String[] args) throws IOException {
        dir = Files.createTempDirectory("fvf");
        Path full = Files.createDirectories(dir.resolve("full/inner"));
        Path locked = Files.createDirectory(dir.resolve("locked"));
        Files.setPosixFilePermissions(locked, PosixFilePermissions.fromString("r-x------"));

        System.out.println("java.io.File:");
        System.out.printf("%-26s %s%n", "delete missing", new File(dir.toFile(), "missing").delete());
        System.out.printf("%-26s %s%n", "delete non-empty dir", dir.resolve("full").toFile().delete());
        System.out.printf("%-26s %s%n", "mkdir, missing parent", new File(dir.toFile(), "a/b").mkdir());
        System.out.printf("%-26s %s%n", "create in read-only dir", tryCreate(new File(locked.toFile(), "x")));

        System.out.println("java.nio.file.Files:");
        nio("delete missing", () -> { Files.delete(dir.resolve("missing")); return "deleted"; });
        nio("deleteIfExists missing", () -> Files.deleteIfExists(dir.resolve("missing")));
        nio("delete non-empty dir", () -> { Files.delete(dir.resolve("full")); return "deleted"; });
        nio("createDirectory, no parent", () -> Files.createDirectory(dir.resolve("a/b")));
        nio("createDirectory, exists", () -> Files.createDirectory(full));
        nio("createDirectories, exists", () -> Files.createDirectories(full).getFileName());
        nio("create in read-only dir", () -> Files.createFile(locked.resolve("x")));
        nio("move into missing dir", () -> Files.move(full, dir.resolve("no/such/inner")));
        nio("size of missing", () -> Files.size(dir.resolve("missing")));
    }

    static String tryCreate(File f) {
        try {
            return String.valueOf(f.createNewFile());
        } catch (IOException e) {
            return "IOException: " + e.getMessage();
        }
    }
}`,
        },
        {
          type: "output",
          text: `java.io.File:
delete missing             false
delete non-empty dir       false
mkdir, missing parent      false
create in read-only dir    IOException: Permission denied
java.nio.file.Files:
delete missing             NoSuchFileException: <dir>/missing
deleteIfExists missing     false
delete non-empty dir       DirectoryNotEmptyException: <dir>/full
createDirectory, no parent NoSuchFileException: <dir>/a/b
createDirectory, exists    FileAlreadyExistsException: <dir>/full/inner
createDirectories, exists  inner
create in read-only dir    AccessDeniedException: <dir>/locked/x
move into missing dir      NoSuchFileException: <dir>/full/inner -> <dir>/no/such/inner
size of missing            NoSuchFileException: <dir>/missing`,
        },
        {
          type: "list",
          items: [
            "The same four failures through `java.io.File` gave three `false`s and one exception that only says \"Permission denied\". Through `Files`, each has its own type and the path in the message: `NoSuchFileException`, `DirectoryNotEmptyException`, `FileAlreadyExistsException`, `AccessDeniedException`, all subclasses of `FileSystemException`, itself an `IOException`.",
            "`createDirectory(\"a/b\")` reports `NoSuchFileException` with the path it was creating, `a/b`, though the cause is the missing parent `a`. `createDirectories` creates the whole chain and succeeds if it already exists, the idempotent version.",
            "`deleteIfExists` is the right call when \"already gone\" is fine (cleanup jobs that may race each other); `delete` when it's a bug.",
            "For a move, the message has both paths (`source -> target`), which helps in logs.",
            "To test for a specific failure, catch the subclass (`catch (NoSuchFileException e)`); to log any of them, `FileSystemException` has `getFile()`, `getOtherFile()` and `getReason()`.",
          ],
        },
      ],
    },
    {
      title: "Streams That Must Be Closed",
      blocks: [
        {
          type: "paragraph",
          text: "`Files.lines`, `Files.list`, `Files.walk` and `Files.find` return a `java.util.stream.Stream` that holds an open file or directory. Consuming the stream to the end doesn't close it; only `close()` does. I counted descriptors through `/proc/self/fd` (Linux only):",
        },
        {
          type: "code",
          language: "java",
          title: "LinesLeak.java",
          code: `import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

public class LinesLeak {
    static long openFds() throws IOException {                 // Linux only
        try (Stream<Path> fds = Files.list(Path.of("/proc/self/fd"))) {
            return fds.count();
        }
    }

    // Looks harmless: a lazy stream that is consumed to the end
    static long countSaltLake(Path file) throws IOException {
        return Files.lines(file).filter(l -> l.contains("SALT-LAKE")).count();
    }

    static long countSaltLakeClosed(Path file) throws IOException {
        try (Stream<String> lines = Files.lines(file)) {
            return lines.filter(l -> l.contains("SALT-LAKE")).count();
        }
    }

    public static void main(String[] args) throws IOException {
        Path file = Files.createTempFile("trips", ".csv");
        Files.write(file, List.of("T1,SALT-LAKE,18500", "T2,NEW-TOWN,22000", "T3,SALT-LAKE,9000"));

        long base = openFds();
        for (int i = 0; i < 500; i++) countSaltLakeClosed(file);
        System.out.println("Files.lines, closed:     " + (openFds() - base) + " extra descriptors after 500 calls");

        for (int i = 0; i < 500; i++) countSaltLake(file);
        System.out.println("Files.lines, not closed: " + (openFds() - base) + " extra descriptors after 500 calls");

        for (int i = 0; i < 500; i++) Files.list(file.getParent()).findFirst();
        System.out.println("Files.list, not closed:  " + (openFds() - base) + " extra descriptors after 500 more calls");

        System.gc();                                   // the Cleaner safety net, not something to rely on
        try { Thread.sleep(200); } catch (InterruptedException e) { }
        System.out.println("after System.gc():       " + (openFds() - base) + " extra descriptors");
    }
}`,
        },
        {
          type: "output",
          text: `Files.lines, closed:     0 extra descriptors after 500 calls
Files.lines, not closed: 175 extra descriptors after 500 calls
Files.list, not closed:  1175 extra descriptors after 500 more calls
after System.gc():       1000 extra descriptors`,
        },
        {
          type: "list",
          items: [
            "**`Files.lines` in try-with-resources: 0 left open.** Without it, `count()` read every line and returned, and the file stayed open.",
            "**175, not 500.** Running with `-Xlog:gc` showed a young GC in the middle of that loop. `FileChannelImpl` registers a `Cleaner` (its `closer` field in `javap -p`), so the channels that were already unreachable got closed by the GC: 325 of them. The rest stayed open until the explicit `System.gc()`. The count depends on when the GC happens to run.",
            "**`Files.list`: 1,000 descriptors for 500 calls**, two each, because of the `dup` shown in Internal Working.",
            "**And `System.gc()` didn't close them.** `javap -p sun.nio.fs.UnixDirectoryStream` shows no `Cleaner` and no finalizer: an unclosed directory stream holds its descriptors until the JVM exits. A scheduled job that calls `Files.list(dir).count()` every minute leaks two descriptors a minute, forever, and eventually fails with \"Too many open files\".",
            "`Files.readAllLines`, `readString` and `readAllBytes` open and close the file inside the call, so they need no try-with-resources. The rule: if a `Files` method returns a `Stream`, a reader, a writer, a channel or a `DirectoryStream`, I close it.",
          ],
        },
      ],
    },
    {
      title: "Copying, Moving, Walking and Attributes",
      blocks: [
        {
          type: "heading",
          text: "Copy and move",
        },
        {
          type: "code",
          language: "java",
          title: "CopyMove.java",
          code: `import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;

import static java.nio.file.StandardCopyOption.ATOMIC_MOVE;
import static java.nio.file.StandardCopyOption.COPY_ATTRIBUTES;
import static java.nio.file.StandardCopyOption.REPLACE_EXISTING;

public class CopyMove {
    public static void main(String[] args) throws IOException {
        Path dir = Path.of("cm");
        Path fares = Files.writeString(dir.resolve("fares.csv"), "SALT-LAKE,18500\\nNEW-TOWN,22000\\n");

        Path backup = Files.copy(fares, dir.resolve("fares.bak"));
        System.out.println("copied " + Files.size(backup) + " bytes");
        try {
            Files.copy(fares, backup);
        } catch (FileAlreadyExistsException e) {
            System.out.println("copy again: FileAlreadyExistsException " + e.getFile());
        }
        Files.copy(fares, backup, REPLACE_EXISTING, COPY_ATTRIBUTES);
        System.out.println("REPLACE_EXISTING ok, mtime " + Files.getLastModifiedTime(fares)
                + " copied as " + Files.getLastModifiedTime(backup));

        Path tmp = Files.writeString(dir.resolve("fares.csv.tmp"), "SALT-LAKE,19000\\nNEW-TOWN,22500\\n");
        Files.move(tmp, fares, ATOMIC_MOVE);
        System.out.println("after ATOMIC_MOVE: " + Files.readAllLines(fares) + ", tmp exists? " + Files.exists(tmp));

        try {
            Files.move(fares, Path.of("/dev/shm/fares.csv"), ATOMIC_MOVE);   // a different file system
        } catch (AtomicMoveNotSupportedException e) {
            System.out.println("AtomicMoveNotSupportedException: " + e.getReason());
        }
    }
}`,
        },
        {
          type: "output",
          text: `copied 31 bytes
copy again: FileAlreadyExistsException cm/fares.bak
REPLACE_EXISTING ok, mtime 2026-11-13T16:45:43.65267385Z copied as 2026-11-13T16:45:43.652673Z
after ATOMIC_MOVE: [SALT-LAKE,19000, NEW-TOWN,22500], tmp exists? false
AtomicMoveNotSupportedException: Invalid cross-device link`,
        },
        {
          type: "list",
          items: [
            "`Files.copy` and `Files.move` refuse to overwrite unless given `REPLACE_EXISTING`, the opposite of `cp` and `mv`.",
            "**`COPY_ATTRIBUTES` copied the modification time to the microsecond, not the nanosecond**: `43.65267385Z` became `43.652673Z`. `strace` showed `utimensat` called with `tv_nsec` values ending in `000`, so the JDK converts through microseconds. Code that compares times to decide \"has this file changed?\" should compare at a coarser precision.",
            "`ATOMIC_MOVE` within one directory became one `rename`: `fares.csv` was replaced and `fares.csv.tmp` no longer existed. With `ATOMIC_MOVE`, other options are ignored and an existing target is replaced on Linux.",
            "Moving to `/dev/shm` (a `tmpfs`, a different file system) with `ATOMIC_MOVE` threw `AtomicMoveNotSupportedException` with the kernel's reason, \"Invalid cross-device link\".",
          ],
        },
        {
          type: "heading",
          text: "Walking a directory tree",
        },
        {
          type: "code",
          language: "java",
          title: "WalkTree.java",
          code: `import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.stream.Stream;

public class WalkTree {
    public static void main(String[] args) throws IOException {
        Path root = Files.createTempDirectory("exports");
        for (String f : new String[] {"2026-11-12/trips.csv", "2026-11-12/payouts.csv",
                                      "2026-11-13/trips.csv", "2026-11-13/raw/trips.json", "README.txt"}) {
            Path p = root.resolve(f);
            Files.createDirectories(p.getParent());
            Files.writeString(p, "x".repeat(f.length()));
        }

        try (Stream<Path> top = Files.list(root)) {                    // one level, not recursive
            System.out.println("list: " + top.map(p -> p.getFileName().toString()).sorted().toList());
        }
        try (Stream<Path> all = Files.walk(root)) {                    // depth-first, includes root
            System.out.println("walk: " + all.map(root::relativize).map(Path::toString).sorted().toList());
        }
        try (Stream<Path> shallow = Files.walk(root, 1)) {
            System.out.println("walk(maxDepth 1): " + shallow.count() + " paths");
        }
        try (Stream<Path> csv = Files.find(root, Integer.MAX_VALUE,
                (p, attrs) -> attrs.isRegularFile() && p.toString().endsWith(".csv"))) {
            System.out.println("find *.csv: " + csv.map(root::relativize).map(Path::toString).sorted().toList());
        }

        // walkFileTree: files are visited before their directory's postVisitDirectory, so delete works bottom-up
        int[] counts = new int[2];
        Files.walkFileTree(root, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                Files.delete(file);
                counts[0]++;
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException e) throws IOException {
                if (e != null) throw e;
                Files.delete(dir);
                counts[1]++;
                return FileVisitResult.CONTINUE;
            }
        });
        System.out.println("deleted " + counts[0] + " files and " + counts[1] + " directories, root exists? " + Files.exists(root));
    }
}`,
        },
        {
          type: "output",
          text: `list: [2026-11-12, 2026-11-13, README.txt]
walk: [, 2026-11-12, 2026-11-12/payouts.csv, 2026-11-12/trips.csv, 2026-11-13, 2026-11-13/raw, 2026-11-13/raw/trips.json, 2026-11-13/trips.csv, README.txt]
walk(maxDepth 1): 4 paths
find *.csv: [2026-11-12/payouts.csv, 2026-11-12/trips.csv, 2026-11-13/trips.csv]
deleted 5 files and 4 directories, root exists? false`,
        },
        {
          type: "list",
          items: [
            "`Files.list` is one level; `Files.walk` is depth-first, includes the start directory (the empty string after `relativize`), and takes a `maxDepth`. Neither guarantees an order, so I sort.",
            "`Files.find` passes each path **with its `BasicFileAttributes`**, already read during the walk, so filtering on type, size or time costs no extra `stat` per file. A `walk(...).filter(Files::isRegularFile)` does a second `stat` for every entry.",
            "`walkFileTree` with a `FileVisitor` gives callbacks before and after each directory and on failures (`visitFileFailed`), and `FileVisitResult` can skip subtrees. Deleting a tree has to be bottom-up, which `postVisitDirectory` gives for free.",
            "By default walks **don't follow symbolic links** (`FileVisitOption.FOLLOW_LINKS` turns it on, with cycle detection that throws `FileSystemLoopException`).",
            "`walk` and `find` hold one directory stream per level of the tree currently open, so they must be closed like `list`.",
          ],
        },
        {
          type: "heading",
          text: "Attributes, permissions and temp files",
        },
        {
          type: "code",
          language: "java",
          title: "Attributes.java",
          code: `import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.FileTime;
import java.nio.file.attribute.PosixFileAttributes;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Instant;
import java.util.Map;

public class Attributes {
    public static void main(String[] args) throws IOException {
        Path dir = Files.createTempDirectory("attrs");
        Path f = Files.createTempFile(dir, "fares-", ".csv");
        Files.writeString(f, "SALT-LAKE,18500\\n");
        System.out.println("temp file name pattern: " + f.getFileName().toString().replaceAll("\\\\d+", "<n>")
                + ", perms " + PosixFilePermissions.toString(Files.getPosixFilePermissions(f)));

        System.out.println("size " + Files.size(f) + ", regular " + Files.isRegularFile(f) + ", dir " + Files.isDirectory(f)
                + ", readable " + Files.isReadable(f) + ", hidden " + Files.isHidden(f)
                + ", type " + Files.probeContentType(f));

        BasicFileAttributes basic = Files.readAttributes(f, BasicFileAttributes.class);   // one stat() call
        System.out.println("basic: size=" + basic.size() + " symlink=" + basic.isSymbolicLink()
                + " fileKey=" + (basic.fileKey() != null ? "(dev,ino)" : "null"));
        PosixFileAttributes posix = Files.readAttributes(f, PosixFileAttributes.class);
        System.out.println("posix: owner=" + (posix.owner().getName().equals(System.getProperty("user.name")) ? "me" : "other")
                + " perms=" + PosixFilePermissions.toString(posix.permissions()));

        Files.setLastModifiedTime(f, FileTime.from(Instant.parse("2026-11-01T00:00:00Z")));
        Files.setPosixFilePermissions(f, PosixFilePermissions.fromString("rw-r-----"));
        Map<String, Object> m = Files.readAttributes(f, "unix:mode,nlink,lastModifiedTime", LinkOption.NOFOLLOW_LINKS);
        System.out.println("unix view: mode=" + Integer.toOctalString((Integer) m.get("mode"))
                + " nlink=" + m.get("nlink") + " mtime=" + m.get("lastModifiedTime"));

        Path link = Files.createSymbolicLink(dir.resolve("current.csv"), f.getFileName());
        System.out.println("symlink: isSymbolicLink " + Files.isSymbolicLink(link) + ", size via link "
                + Files.size(link) + ", target " + Files.readSymbolicLink(link).toString().replaceAll("\\\\d+", "<n>"));
    }
}`,
        },
        {
          type: "output",
          text: `temp file name pattern: fares-<n>.csv, perms rw-------
size 16, regular true, dir false, readable true, hidden false, type text/csv
basic: size=16 symlink=false fileKey=(dev,ino)
posix: owner=me perms=rw-------
unix view: mode=100640 nlink=1 mtime=2026-11-01T00:00:00Z
symlink: isSymbolicLink true, size via link 16, target fares-<n>.csv`,
        },
        {
          type: "list",
          items: [
            "`Files.createTempFile` and `createTempDirectory` pick an unpredictable name and, on POSIX systems, create the file with permissions `rw-------`, so other users can't read it. `File.createTempFile` (java.io) created `rw-rw-r--` in my test, the permissions my umask (`0002`) allows. Neither deletes the file automatically; `deleteOnExit` and `DELETE_ON_CLOSE` exist but are unreliable for long-running services.",
            "`readAttributes(p, BasicFileAttributes.class)` reads everything with **one** `stat` call, where `size`, `isDirectory` and `getLastModifiedTime` separately make three.",
            "`fileKey()` on Linux is the device and inode pair: two paths with the same key are the same file (hard links).",
            "The `\"unix:...\"` string form reaches attributes that have no typed view, like `mode` and `nlink`. Mode `100640` is a regular file (`100`) with permissions `640`.",
            "`Files.size` and most methods follow symbolic links; `isSymbolicLink` and `NOFOLLOW_LINKS` look at the link itself.",
            "`probeContentType` guessed `text/csv` from the extension, not the content.",
          ],
        },
      ],
    },
    {
      title: "FileChannel, Memory-Mapped Files and Large Files",
      blocks: [
        {
          type: "heading",
          text: "FileChannel and MappedByteBuffer",
        },
        {
          type: "code",
          language: "java",
          title: "ChannelBasics.java",
          code: `import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static java.nio.file.StandardOpenOption.*;

public class ChannelBasics {
    public static void main(String[] args) throws IOException {
        Path f = Files.createTempFile("seats", ".bin");

        try (FileChannel ch = FileChannel.open(f, READ, WRITE)) {
            ByteBuffer buf = ByteBuffer.allocate(16);
            buf.putLong(9_001_337L).putInt(18_500).putInt(4);       // trip id, fare paise, seats
            buf.flip();                                              // switch from filling to draining
            int written = ch.write(buf);
            System.out.println("wrote " + written + " bytes, position " + ch.position() + ", size " + ch.size());

            ByteBuffer one = ByteBuffer.allocate(4);
            ch.read(one, 8);                                         // positional read: position unchanged
            System.out.println("fare at offset 8: " + one.flip().getInt() + ", position still " + ch.position());

            ch.force(true);                                          // fsync: data and metadata on disk
        }

        try (FileChannel ch = FileChannel.open(f, READ, WRITE)) {
            MappedByteBuffer map = ch.map(FileChannel.MapMode.READ_WRITE, 0, ch.size());
            map.putInt(12, 3);                                       // a plain memory write, no write() call
            map.force();                                             // msync
        }
        ByteBuffer back = ByteBuffer.wrap(Files.readAllBytes(f));
        System.out.println("after mapped write: trip " + back.getLong() + " fare " + back.getInt() + " seats " + back.getInt());

        Path copy = Files.createTempFile("seats-copy", ".bin");
        try (FileChannel src = FileChannel.open(f, READ); FileChannel dst = FileChannel.open(copy, WRITE)) {
            System.out.println("transferTo moved " + src.transferTo(0, src.size(), dst) + " bytes");
        }
        System.out.println("text through a channel: "
                + StandardCharsets.UTF_8.decode(ByteBuffer.wrap("Zoë".getBytes(StandardCharsets.UTF_8))));
    }
}`,
        },
        {
          type: "output",
          text: `wrote 16 bytes, position 16, size 16
fare at offset 8: 18500, position still 16
after mapped write: trip 9001337 fare 18500 seats 3
transferTo moved 16 bytes
text through a channel: Zoë`,
        },
        {
          type: "list",
          items: [
            "A `FileChannel` reads into and writes from `ByteBuffer`s. A buffer has a **position** and a **limit**: `put` advances the position, and `flip()` sets the limit to the position and the position to 0, switching from \"filling\" to \"draining\". Forgetting `flip()` writes zero bytes, the most common NIO bug.",
            "**Positional `read(buf, 8)`** reads at an offset without moving the channel's position, so several threads can read different parts of one channel safely.",
            "**`force(true)`** is `fsync`: it returns when the data and metadata are on the storage device. `close()` doesn't do that.",
            "**`map`** returns a `MappedByteBuffer` backed by the OS page cache. `map.putInt(12, 3)` is a memory write with no system call; the kernel writes the page back later, or on `force()` (`msync`). `readAllBytes` afterwards saw the new value.",
            "**One map is limited to 2 GB** (`Integer.MAX_VALUE`), because `ByteBuffer` uses `int` indexes. Bigger files need several maps, or the Foreign Function and Memory API (`MemorySegment`, final in Java 22). A mapping stays valid after the channel is closed and is released only when the buffer is garbage collected; on Windows that blocks deleting the file.",
            "`transferTo` between two file channels lets the kernel copy without a Java buffer: `strace` showed a single `copy_file_range(6, [0], 7, NULL, 16, 0) = 16` for the 16-byte transfer.",
          ],
        },
        {
          type: "heading",
          text: "A file bigger than the heap",
        },
        {
          type: "paragraph",
          text: "I generated a 512 MB trip CSV (22,128,119 lines) and summed its fares with `Files.lines`, then loaded it with `readAllLines`, both with a 64 MB heap:",
        },
        {
          type: "code",
          language: "java",
          title: "NoOom.java",
          code: `import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

public class NoOom {
    public static void main(String[] args) throws IOException {
        Path f = Path.of(args[0]);
        System.out.printf("file %,d MB, max heap %,d MB%n", Files.size(f) >> 20, Runtime.getRuntime().maxMemory() >> 20);
        if (args[1].equals("lines")) {
            try (Stream<String> lines = Files.lines(f)) {
                long total = lines.mapToLong(l -> Long.parseLong(l.substring(l.lastIndexOf(',') + 1))).sum();
                System.out.println("Files.lines: total fare " + total + " paise");
            }
        } else {
            List<String> all = Files.readAllLines(f);
            System.out.println("readAllLines: " + all.size() + " lines");
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx64m NoOom trips-512mb.csv lines
java -Xmx64m NoOom trips-512mb.csv all
java -Xmx1g  NoOom trips-512mb.csv all`,
        },
        {
          type: "output",
          text: `file 512 MB, max heap 64 MB
Files.lines: total fare 619570907777 paise

file 512 MB, max heap 64 MB
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at java.base/java.lang.StringUTF16.compress(StringUTF16.java:211)
	at java.base/java.lang.String.<init>(String.java:4760)
	at java.base/java.lang.String.<init>(String.java:303)
	at java.base/java.io.BufferedReader.implReadLine(BufferedReader.java:403)
	at java.base/java.io.BufferedReader.readLine(BufferedReader.java:347)
	at java.base/java.io.BufferedReader.readLine(BufferedReader.java:436)
	...

file 512 MB, max heap 1,024 MB
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	...`,
        },
        {
          type: "paragraph",
          text: "`Files.lines` processed 512 MB in a 64 MB heap, because each line becomes garbage as soon as the next one is read. `readAllLines` failed at 64 MB, and also at **1 GB, twice the file size**. To see why, I measured what the list actually retains:",
        },
        {
          type: "code",
          language: "java",
          title: "HeapOfLines.java",
          code: `import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class HeapOfLines {
    public static void main(String[] args) throws Exception {
        Runtime rt = Runtime.getRuntime();
        List<String> all = Files.readAllLines(Path.of(args[0]));
        System.gc();
        long used = rt.totalMemory() - rt.freeMemory();
        System.out.printf("%,d lines from a %,d MB file retain %,d MB of heap (%.0f bytes per line)%n",
                all.size(), Files.size(Path.of(args[0])) >> 20, used >> 20, (double) used / all.size());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx3g HeapOfLines trips-512mb.csv`,
        },
        {
          type: "output",
          text: `22,128,119 lines from a 512 MB file retain 1,524 MB of heap (72 bytes per line)`,
        },
        {
          type: "paragraph",
          text: "**72 bytes per line for 24-byte lines, 3 times the file size.** Each line is a `String` object (24 bytes with header and fields), its `byte[]` (16-byte header plus the 23 Latin-1 characters, padded to 40), and a 4-byte reference in the `ArrayList`'s array, which grows by half each time, so on average there's spare capacity too. Text with non-Latin-1 characters is stored as UTF-16 and costs more. A rule of thumb from this measurement: `readAllLines` needs about three times the file size in heap for short ASCII lines, so anything that can grow goes through `lines`, a reader, or a channel.",
        },
      ],
    },
    {
      title: "WatchService and FileLock",
      blocks: [
        {
          type: "heading",
          text: "Watching a directory",
        },
        {
          type: "code",
          language: "java",
          title: "WatchFares.java",
          code: `import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.WatchEvent;
import java.nio.file.WatchKey;
import java.nio.file.WatchService;
import java.util.concurrent.TimeUnit;

import static java.nio.file.StandardWatchEventKinds.*;

public class WatchFares {
    public static void main(String[] args) throws IOException, InterruptedException {
        Path dir = Files.createTempDirectory("fares");
        try (WatchService watcher = dir.getFileSystem().newWatchService()) {
            dir.register(watcher, ENTRY_CREATE, ENTRY_MODIFY, ENTRY_DELETE);   // a directory, not a file

            Path tmp = Files.writeString(dir.resolve("fares.csv.tmp"), "SALT-LAKE,19000\\n");
            Files.move(tmp, dir.resolve("fares.csv"), StandardCopyOption.ATOMIC_MOVE);
            Files.writeString(dir.resolve("fares.csv"), "SALT-LAKE,19500\\n");

            WatchKey key;
            while ((key = watcher.poll(500, TimeUnit.MILLISECONDS)) != null) {
                for (WatchEvent<?> e : key.pollEvents()) {
                    System.out.println(e.kind() + " " + e.context() + " (count " + e.count() + ")");
                }
                if (!key.reset()) break;
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `ENTRY_CREATE fares.csv.tmp (count 1)
ENTRY_MODIFY fares.csv.tmp (count 1)
ENTRY_DELETE fares.csv.tmp (count 1)
ENTRY_CREATE fares.csv (count 1)
ENTRY_MODIFY fares.csv (count 1)`,
        },
        {
          type: "list",
          items: [
            "A `WatchService` watches **directories**, not files; on Linux it uses `inotify`. Events name the entry relative to the directory (`context()`).",
            "An atomic replace appears as `ENTRY_DELETE` of the temp name and `ENTRY_CREATE` of the target, not as a modify. Code that only listens for `ENTRY_MODIFY` on `fares.csv` misses every atomic update.",
            "The last write to `fares.csv` produced one `ENTRY_MODIFY` here and two in an earlier run (truncate and write): events can be merged (`count()`), arrive late, or be lost (`OVERFLOW`). I treat an event as \"something changed, re-read the file\", never as a description of the change.",
            "`key.reset()` must be called after handling events, or the key stops receiving them.",
          ],
        },
        {
          type: "heading",
          text: "FileLock, and how one close released it",
        },
        {
          type: "code",
          language: "java",
          title: "PayoutLock.java",
          code: `import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.channels.OverlappingFileLockException;
import java.nio.file.Path;

import static java.nio.file.StandardOpenOption.CREATE;
import static java.nio.file.StandardOpenOption.WRITE;

public class PayoutLock {
    public static void main(String[] args) throws Exception {
        Path lockFile = Path.of("payout.lock");
        if (args.length > 0) {                                     // the second process
            try (FileChannel ch = FileChannel.open(lockFile, CREATE, WRITE); FileLock lock = ch.tryLock()) {
                System.out.println("child: tryLock() returned " + (lock == null ? "null, another process holds it" : "a lock"));
            }
            return;
        }
        try (FileChannel ch = FileChannel.open(lockFile, CREATE, WRITE); FileLock lock = ch.lock()) {
            System.out.println("parent: locked, shared=" + lock.isShared());
            Process child = new ProcessBuilder("java", "PayoutLock", "child").inheritIO().start();
            child.waitFor();

            try (FileChannel again = FileChannel.open(lockFile, WRITE)) {
                again.tryLock();
            } catch (OverlappingFileLockException e) {
                System.out.println("parent: same JVM, second lock -> OverlappingFileLockException");
            }
            // closing "again" released the lock: POSIX locks belong to the process and the file
            System.out.println("parent: lock.isValid() " + lock.isValid());
            Process second = new ProcessBuilder("java", "PayoutLock", "child").inheritIO().start();
            second.waitFor();
        }
    }
}`,
        },
        {
          type: "output",
          text: `parent: locked, shared=false
child: tryLock() returned null, another process holds it
parent: same JVM, second lock -> OverlappingFileLockException
parent: lock.isValid() true
child: tryLock() returned a lock`,
        },
        {
          type: "list",
          items: [
            "`FileChannel.lock()` takes an OS lock on the file (on Linux, a POSIX record lock with `fcntl`). Another **process** calling `tryLock()` got `null`: locks coordinate processes, which is their job (two copies of a payout job on one machine).",
            "Inside one JVM, a second lock on an overlapping region throws `OverlappingFileLockException`. File locks are held by the whole JVM, so they don't coordinate threads; use `java.util.concurrent` locks for that.",
            "**The surprise:** after the parent opened and closed a second channel on the same file, the child got the lock, while the parent's `lock.isValid()` still said `true`. POSIX locks belong to the process and the file, and closing **any** descriptor for that file releases all of the process's locks on it. The `FileLock` Javadoc warns about exactly this (\"On some systems, closing a channel releases all locks held by the Java virtual machine on the underlying file\"). Any code that opens the locked file again, even just to read it, can drop the lock.",
            "File locks are **advisory** on Linux: they only stop other programs that also ask for the lock. A plain `cat` or `Files.readString` ignores them. On network file systems, their behaviour depends on the server. For coordinating services across machines I'd use a database row lock or a lease instead.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing the atomic write from the production section, `atomic(Path.of(\"fares.csv\"), 42)`, with `strace -f -y -e trace=openat,write,fsync,close,rename` (directory and descriptor annotations trimmed):",
        },
        {
          type: "code",
          language: "java",
          title: "OneSwap.java",
          code: `import java.nio.file.Path;

public class OneSwap {
    public static void main(String[] args) throws Exception {
        FareReload.atomic(Path.of("fares.csv"), 42);
    }
}`,
        },
        {
          type: "output",
          text: `openat(AT_FDCWD, "fares.csv.tmp", O_WRONLY|O_CREAT|O_TRUNC, 0666) = 4
write(4, "..", 8192) = 8192
write(4, "..", 8192) = 8192
write(4, "..", 146) = 146
close(4) = 0
openat(AT_FDCWD, "fares.csv.tmp", O_WRONLY) = 4
fsync(4) = 0
close(4) = 0
rename("fares.csv.tmp", "fares.csv") = 0`,
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Name the temp file.** `fares.resolveSibling(\"fares.csv.tmp\")` is pure path arithmetic: same directory, so the same file system, which `rename` requires.",
            "**Open it.** `Files.newBufferedWriter(tmp)` uses the default options, so `UnixFileSystemProvider` opens with `O_WRONLY|O_CREAT|O_TRUNC` and wraps the channel's stream in an `OutputStreamWriter` with a UTF-8 encoder (REPORT on unmappable characters) and a `BufferedWriter`. Readers of `fares.csv` are unaffected: it's a different file.",
            "**Write.** 576 rows go into the `BufferedWriter`; every 8192 chars it hands a full buffer down, which becomes one `write(2)` of 8192 bytes. The rows are ASCII, so chars and bytes match one to one.",
            "**Close.** try-with-resources calls `close()`, which flushes the last 146 bytes and closes descriptor 4. The data is now in the page cache, visible to any process that opens `fares.csv.tmp`, but not necessarily on disk.",
            "**Force.** `FileChannel.open(tmp, WRITE)` and `force(true)` make the `fsync(2)` call, which returns only after the storage device has the data. Without it, a power cut after the rename can leave `fares.csv` pointing at an empty or partial file on some file systems.",
            "**Rename.** `Files.move(tmp, fares, ATOMIC_MOVE, REPLACE_EXISTING)` checks the options and calls `rename(2)`. The kernel switches the directory entry `fares.csv` from the old inode to the new one in a single step. Any process that already had the old file open keeps reading the old, complete inode; anything that opens `fares.csv` from now on gets the new one. The old inode is freed when its last reader closes it.",
            "**(Optional) Sync the directory.** For the rename itself to survive a crash, the directory needs an `fsync` too; on Linux `FileChannel.open(dir, READ).force(true)` does it, which I checked works on JDK 21.",
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
          code: `import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static java.nio.file.StandardCopyOption.ATOMIC_MOVE;
import static java.nio.file.StandardCopyOption.REPLACE_EXISTING;
import static java.nio.file.StandardOpenOption.APPEND;
import static java.nio.file.StandardOpenOption.CREATE;

public class SyntaxTour {
    public static void main(String[] args) throws IOException {
        // 1. paths
        Path dir = Files.createTempDirectory("tour");
        Path zones = dir.resolve("zones.txt");
        System.out.println(zones.getFileName() + ", parent is dir? " + zones.getParent().equals(dir) + ", absolute? " + zones.isAbsolute());

        // 2. small files in one call (UTF-8 by default)
        Files.writeString(zones, "SALT-LAKE\\nNEW-TOWN\\n");
        Files.write(zones, List.of("GARIA"), CREATE, APPEND);
        System.out.println(Files.readString(zones).length() + " chars, lines " + Files.readAllLines(zones));

        // 3. big files: a lazy stream, always closed
        try (Stream<String> lines = Files.lines(zones, StandardCharsets.UTF_8)) {
            System.out.println("with -: " + lines.filter(l -> l.contains("-")).count());
        }

        // 4. buffered reader and writer from Files
        try (BufferedWriter out = Files.newBufferedWriter(dir.resolve("fares.csv"))) {
            out.write("SALT-LAKE,18500");
            out.newLine();
        }
        try (BufferedReader in = Files.newBufferedReader(dir.resolve("fares.csv"))) {
            System.out.println("fare row: " + in.readLine());
        }

        // 5. copy, move, delete
        Files.copy(zones, dir.resolve("zones.bak"), REPLACE_EXISTING);
        Path tmp = Files.writeString(dir.resolve("zones.txt.tmp"), "HOWRAH\\n");
        Files.move(tmp, zones, ATOMIC_MOVE, REPLACE_EXISTING);          // atomic replace
        System.out.println("after move: " + Files.readAllLines(zones) + ", deleted tmp? " + !Files.exists(tmp));

        // 6. metadata
        System.out.println("size " + Files.size(zones) + ", exists " + Files.exists(zones)
                + ", dir " + Files.isDirectory(dir) + ", modified " + (Files.getLastModifiedTime(zones) != null));

        // 7. directories: list and walk are streams too
        try (Stream<Path> files = Files.list(dir)) {
            System.out.println("list: " + files.map(p -> p.getFileName().toString()).sorted().toList());
        }
        try (Stream<Path> all = Files.walk(dir)) {
            all.sorted((a, b) -> b.getNameCount() - a.getNameCount()).forEach(p -> {
                try { Files.delete(p); } catch (IOException e) { throw new RuntimeException(e); }
            });
        }
        System.out.println("cleaned up: " + !Files.exists(dir));
    }
}`,
        },
        {
          type: "output",
          text: `zones.txt, parent is dir? true, absolute? true
25 chars, lines [SALT-LAKE, NEW-TOWN, GARIA]
with -: 2
fare row: SALT-LAKE,18500
after move: [HOWRAH], deleted tmp? true
size 7, exists true, dir true, modified true
list: [fares.csv, zones.bak, zones.txt]
cleaned up: true`,
        },
        {
          type: "paragraph",
          text: "`Files.write(zones, List.of(\"GARIA\"), CREATE, APPEND)` adds a line separator after each element. Deleting a tree with `walk` needs the deepest paths first, hence the sort by name count; `walkFileTree` in `WalkTree` is the more robust way.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Deleting exports older than 30 days",
        },
        {
          type: "code",
          language: "java",
          title: "ExportCleanup.java",
          code: `import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.stream.Stream;

public class ExportCleanup {
    // Delete export files older than the retention period; return what was deleted
    static List<Path> purge(Path root, Duration keep, Instant now) throws IOException {
        FileTime cutoff = FileTime.from(now.minus(keep));
        List<Path> old;
        try (Stream<Path> found = Files.find(root, 3,
                (p, attrs) -> attrs.isRegularFile() && attrs.lastModifiedTime().compareTo(cutoff) < 0)) {
            old = found.sorted().toList();                     // collect first, then delete
        }
        for (Path p : old) Files.deleteIfExists(p);            // another job may have deleted it already
        return old;
    }

    public static void main(String[] args) throws IOException {
        Path root = Files.createTempDirectory("exports");
        Instant now = Instant.parse("2026-11-13T00:00:00Z");
        for (int daysAgo : new int[] {1, 5, 29, 31, 90}) {
            Path f = root.resolve("payouts-" + daysAgo + "d.csv");
            Files.writeString(f, "D7,250000\\n");
            Files.setLastModifiedTime(f, FileTime.from(now.minus(Duration.ofDays(daysAgo))));
        }
        List<Path> deleted = purge(root, Duration.ofDays(30), now);
        System.out.println("deleted " + deleted.stream().map(p -> p.getFileName().toString()).toList());
        try (Stream<Path> left = Files.list(root)) {
            System.out.println("kept    " + left.map(p -> p.getFileName().toString()).sorted().toList());
        }
    }
}`,
        },
        {
          type: "output",
          text: `deleted [payouts-31d.csv, payouts-90d.csv]
kept    [payouts-1d.csv, payouts-29d.csv, payouts-5d.csv]`,
        },
        {
          type: "paragraph",
          text: "`Files.find` filters on attributes it already read, the stream is collected to a list and closed **before** deleting (deleting while a directory stream is open works on Linux, but the iteration order of a changing directory isn't defined), and `deleteIfExists` tolerates another cleanup instance getting there first. `now` is a parameter, so the 30-day boundary is testable without waiting a month: 29 days is kept, 31 is deleted.",
        },
        {
          type: "heading",
          text: "Example 2: Serving a driver's invoice without path traversal",
        },
        {
          type: "code",
          language: "java",
          title: "SafeDownload.java",
          code: `import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;

public class SafeDownload {
    final Path base;

    SafeDownload(Path base) throws IOException {
        this.base = base.toRealPath();                        // resolve symlinks in the base itself
    }

    // A driver asks for one of their invoice files by name
    Path resolve(String requested) throws IOException {
        Path candidate = base.resolve(requested).normalize();
        if (!candidate.startsWith(base)) throw new SecurityException("outside base: " + requested);
        Path real = candidate.toRealPath();                   // follows symlinks, throws if missing
        if (!real.startsWith(base)) throw new SecurityException("symlink escapes base: " + requested);
        return real;
    }

    public static void main(String[] args) throws IOException {
        Path root = Files.createTempDirectory("invoices");
        Files.writeString(root.resolve("D7-2026-11.pdf"), "%PDF-1.7");
        Files.createSymbolicLink(root.resolve("sneaky.pdf"), Path.of("/etc/hostname"));
        SafeDownload d = new SafeDownload(root);

        for (String req : new String[] {"D7-2026-11.pdf", "../../etc/passwd", "/etc/passwd", "sneaky.pdf", "D8.pdf"}) {
            try {
                System.out.printf("%-18s -> %s%n", req, d.base.relativize(d.resolve(req)));
            } catch (SecurityException e) {
                System.out.printf("%-18s -> refused (%s)%n", req, e.getMessage().replaceAll(":.*", ""));
            } catch (NoSuchFileException e) {
                System.out.printf("%-18s -> 404%n", req);
            }
        }
    }
}`,
        },
        {
          type: "output",
          text: `D7-2026-11.pdf     -> D7-2026-11.pdf
../../etc/passwd   -> refused (outside base)
/etc/passwd        -> refused (outside base)
sneaky.pdf         -> refused (symlink escapes base)
D8.pdf             -> 404`,
        },
        {
          type: "list",
          items: [
            "`../../etc/passwd` normalizes to a path outside the base and is refused. `/etc/passwd` is refused because `resolve` with an absolute argument returns the argument.",
            "`sneaky.pdf` is a symbolic link inside the base that points to `/etc/hostname`. The normalized path is inside the base, so the first check passes; `toRealPath()` follows the link, and the second check catches it.",
            "The base itself goes through `toRealPath()` in the constructor, because `/tmp` or `/srv` may themselves be links, and comparing a real path with a non-real one would refuse everything.",
            "`toRealPath` throws `NoSuchFileException` for a missing file, which maps naturally to a 404.",
          ],
        },
        {
          type: "heading",
          text: "Example 3: Importing a large CSV in batches",
        },
        {
          type: "code",
          language: "java",
          title: "BatchImport.java",
          code: `import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Stream;

public class BatchImport {
    static int batches = 0;

    static void insertBatch(List<String> rows) {               // stands in for a JDBC batch insert
        batches++;
    }

    static long importFile(Path file, int batchSize) throws IOException {
        long rows = 0;
        try (Stream<String> lines = Files.lines(file)) {
            Iterator<String> it = lines.skip(1).iterator();     // skip the header
            List<String> batch = new ArrayList<>(batchSize);
            while (it.hasNext()) {
                batch.add(it.next());
                if (batch.size() == batchSize) { insertBatch(batch); rows += batch.size(); batch.clear(); }
            }
            if (!batch.isEmpty()) { insertBatch(batch); rows += batch.size(); }
        }
        return rows;
    }

    public static void main(String[] args) throws IOException {
        Path file = Files.createTempFile("trips", ".csv");
        List<String> content = new ArrayList<>();
        content.add("trip_id,zone,fare_paise");
        for (int i = 0; i < 25_500; i++) content.add("T" + i + ",NEW-TOWN," + (9000 + i % 5000));
        Files.write(file, content);
        System.out.println("imported " + importFile(file, 1000) + " rows in " + batches + " batches");

        // One Latin-1 byte in the middle of a UTF-8 file
        Files.write(file, "T99,Zoë,1000\\n".getBytes(StandardCharsets.ISO_8859_1), java.nio.file.StandardOpenOption.APPEND);
        try {
            importFile(file, 1000);
        } catch (UncheckedIOException e) {
            System.out.println("lines() threw " + e.getClass().getSimpleName() + " caused by " + e.getCause());
        }
    }
}`,
        },
        {
          type: "output",
          text: `imported 25500 rows in 26 batches
lines() threw UncheckedIOException caused by java.nio.charset.MalformedInputException: Input length = 1`,
        },
        {
          type: "paragraph",
          text: "The stream's iterator lets me build fixed-size batches (for a JDBC batch insert) while only one batch is in memory: 25,500 rows became 25 batches of 1,000 and one of 500. A stream's lambdas can't throw checked exceptions, so `Files.lines` reports I/O and decoding errors as `UncheckedIOException` wrapping the real cause, here a `MalformedInputException` from one Latin-1 byte appended to the file. A `catch (IOException e)` around the import wouldn't see it; catch `UncheckedIOException` too, or use `Files.newBufferedReader`, which throws the checked exception directly.",
        },
      ],
    },
    {
      title: "When to Use java.nio.file",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Why"],
          rows: [
            ["Config, templates, small CSVs", "`Files.readString`, `readAllLines`, `writeString`", "One call, UTF-8, strict decoding, closes for you"],
            ["Files that can grow", "`Files.lines` in try-with-resources, or `newBufferedReader`", "Constant memory; 512 MB in a 64 MB heap"],
            ["Creating, deleting, moving, checking files", "`Files.*`", "Exceptions that say why"],
            ["Replacing a file other processes read", "Write temp in the same directory, `force`, `Files.move(..., ATOMIC_MOVE)`", "Readers never see a partial file"],
            ["Claiming a name exactly once", "`CREATE_NEW` or `Files.createFile`", "Atomic `O_EXCL`"],
            ["Appending to a log or ledger", "`CREATE, APPEND`", "`O_APPEND`: each write goes to the end"],
            ["Searching a tree by type, size or date", "`Files.find`", "Attributes come with each path"],
            ["Random access, fixed records, fsync", "`FileChannel`", "Positional reads, `force`"],
            ["Scanning a very large file for bytes", "`MappedByteBuffer` or a large `byte[]` loop", "179 ms and 230 ms for 512 MB, against 974 ms decoding lines"],
            ["Reacting to a file being replaced", "`WatchService` on the directory, then re-read", "Events are hints, not facts"],
            ["Two processes on one machine must not run together", "`FileLock` on a dedicated lock file, never reopened", "Advisory, process-wide"],
          ],
        },
        {
          type: "paragraph",
          text: "My rule: `Path` and `Files` for everything by default, `java.io` classes only when they come from a `Files` factory or an older API requires them, and channels when I need positions, `force`, mapping or locks.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Not closing Files.lines, list, walk or find",
        },
        {
          type: "paragraph",
          text: "They hold descriptors after the stream is consumed. Unclosed `lines` streams are eventually cleaned by GC; unclosed directory streams never are, and each costs two descriptors on Linux. Always try-with-resources.",
        },
        {
          type: "heading",
          text: "readAllLines or readString on files that grow",
        },
        {
          type: "paragraph",
          text: "A 512 MB file needed 1.5 GB of heap as a `List<String>` and failed with 1 GB. The job that read yesterday's 20 MB export fine fails the day the export reaches the heap size. Stream it.",
        },
        {
          type: "heading",
          text: "Rewriting a file in place that others read",
        },
        {
          type: "paragraph",
          text: "`Files.write(live, bytes)` truncates first and writes after, so concurrent readers see an empty or partial file: 37% of reloads in the production test. Write a temp file in the same directory and `ATOMIC_MOVE` it.",
        },
        {
          type: "heading",
          text: "Creating the temp file in a different file system",
        },
        {
          type: "paragraph",
          text: "`Files.createTempFile(\"fares\", \".csv\")` puts it in `java.io.tmpdir`, often a different mount from the target. `ATOMIC_MOVE` then throws `AtomicMoveNotSupportedException`; without it, `move` silently becomes copy-then-delete, which isn't atomic. Use `Files.createTempFile(target.getParent(), ...)` or `resolveSibling`.",
        },
        {
          type: "heading",
          text: "Passing one option and losing the defaults",
        },
        {
          type: "paragraph",
          text: "`Files.write(p, bytes, WRITE)` doesn't truncate, so a shorter new content leaves the old tail behind (`XXRIA`). `Files.write(p, bytes, APPEND)` fails if the file is missing. Spell out the full set: `CREATE, TRUNCATE_EXISTING, WRITE` or `CREATE, APPEND`.",
        },
        {
          type: "heading",
          text: "Checking paths as strings",
        },
        {
          type: "paragraph",
          text: "`requested.startsWith(\"/srv/invoices\")` accepts `/srv/invoices-old/...` and `/srv/invoices/../../etc/passwd`. Resolve, `normalize`, compare with `Path.startsWith`, and use `toRealPath` when symbolic links are possible.",
        },
        {
          type: "heading",
          text: "Check-then-act on files",
        },
        {
          type: "paragraph",
          text: "`if (!Files.exists(p)) Files.createFile(p);` can fail if another process creates `p` in between, and `if (Files.exists(p)) Files.delete(p)` can throw `NoSuchFileException`. Do the action and handle the exception, or use the atomic variants: `CREATE_NEW`, `deleteIfExists`, `createDirectories`.",
        },
        {
          type: "heading",
          text: "Forgetting flip() on a ByteBuffer",
        },
        {
          type: "paragraph",
          text: "After `put`ting data, the position is at the end; `channel.write(buf)` without `flip()` writes the bytes between position and limit, usually none. `flip()` before draining, `clear()` or `compact()` before filling again.",
        },
        {
          type: "heading",
          text: "Reopening a locked file",
        },
        {
          type: "paragraph",
          text: "Closing any channel or stream on a file releases the process's POSIX locks on it, while the `FileLock` object still reports `isValid() == true`. Lock a dedicated `.lock` file that nothing else opens.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Use `Path.of` and `Files` for new code; convert old `File` objects with `toPath()`.",
            "Close every `Stream`, reader, writer, channel and `DirectoryStream` that a `Files` method returns, with try-with-resources.",
            "Use whole-file methods only for files with a known small size; stream everything else.",
            "Replace shared files atomically: temp file in the same directory, write, close, `force`, `Files.move` with `ATOMIC_MOVE`.",
            "Spell out `StandardOpenOption`s whenever you pass any; prefer `CREATE_NEW` for exclusive creation and `CREATE, APPEND` for logs.",
            "Handle the specific exceptions you expect (`NoSuchFileException`, `FileAlreadyExistsException`) and let the others propagate with their paths.",
            "Validate user-supplied paths with `normalize`, `Path.startsWith` and `toRealPath`.",
            "Read attributes in bulk (`readAttributes`, `Files.find`) instead of one `stat` per property.",
            "Keep UTF-8 as the charset and keep strict decoding; catch `UncheckedIOException` around `Files.lines` pipelines.",
            "Use `FileChannel.force` for durability, and on Linux also force the directory after a rename when the rename must survive a crash.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "Six ways to count the lines of the 512 MB file, best of 5 runs each, on one machine (Linux, JDK 21, the file in the page cache, so no disk reads; plain `System.nanoTime()`, not JMH):",
        },
        {
          type: "code",
          language: "java",
          title: "LargeRead.java",
          code: `import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.stream.Stream;

public class LargeRead {
    static long readAllLines(Path f) throws IOException {
        List<String> all = Files.readAllLines(f);                 // every line in memory at once
        return all.size();
    }

    static long lines(Path f) throws IOException {
        try (Stream<String> s = Files.lines(f)) {                 // one line at a time
            return s.count();
        }
    }

    static long bufferedReader(Path f) throws IOException {
        long n = 0;
        try (BufferedReader in = Files.newBufferedReader(f)) {
            while (in.readLine() != null) n++;
        }
        return n;
    }

    static long inputStream(Path f) throws IOException {        // bytes only, no decoding
        long n = 0;
        byte[] buf = new byte[64 * 1024];
        try (InputStream in = Files.newInputStream(f)) {
            int r;
            while ((r = in.read(buf)) != -1) for (int i = 0; i < r; i++) if (buf[i] == '\\n') n++;
        }
        return n;
    }

    static long channel(Path f) throws IOException {
        long n = 0;
        ByteBuffer buf = ByteBuffer.allocateDirect(64 * 1024);
        try (FileChannel ch = FileChannel.open(f, StandardOpenOption.READ)) {
            while (ch.read(buf) != -1) {
                buf.flip();
                while (buf.hasRemaining()) if (buf.get() == '\\n') n++;
                buf.clear();
            }
        }
        return n;
    }

    static long mapped(Path f) throws IOException {
        long n = 0;
        try (FileChannel ch = FileChannel.open(f, StandardOpenOption.READ)) {
            MappedByteBuffer map = ch.map(FileChannel.MapMode.READ_ONLY, 0, ch.size());   // < 2 GB per map
            int limit = map.limit();
            for (int i = 0; i < limit; i++) if (map.get(i) == '\\n') n++;
        }
        return n;
    }

    interface Reading { long run(Path f) throws IOException; }

    public static void main(String[] args) throws IOException {
        Path f = Path.of(args[0]);
        String[] names = {"readAllLines", "lines", "bufferedReader", "inputStream", "channel", "mapped"};
        Reading[] ways = {LargeRead::readAllLines, LargeRead::lines, LargeRead::bufferedReader,
                          LargeRead::inputStream, LargeRead::channel, LargeRead::mapped};
        for (int k = 0; k < ways.length; k++) {
            if (args.length > 1 && !args[1].equals(names[k])) continue;
            long best = Long.MAX_VALUE, result = 0;
            for (int run = 0; run < 5; run++) {
                long t0 = System.nanoTime();
                result = ways[k].run(f);
                best = Math.min(best, System.nanoTime() - t0);
            }
            System.out.printf("%-15s %,11d lines %,8.0f ms%n", names[k], result, best / 1e6);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx3g LargeRead trips-512mb.csv`,
        },
        {
          type: "output",
          text: `readAllLines     22,128,119 lines    2,564 ms
lines            22,128,119 lines    1,012 ms
bufferedReader   22,128,119 lines      974 ms
inputStream      22,128,119 lines      230 ms
channel          22,128,119 lines      445 ms
mapped           22,128,119 lines      179 ms`,
        },
        {
          type: "list",
          items: [
            "**`readAllLines`: 2.6 s and 1.5 GB of heap**, mostly creating and then retaining 22 million `String`s. It needed `-Xmx3g` just to finish.",
            "**`Files.lines` and `BufferedReader`: about 1 s.** Both decode UTF-8 and create a `String` per line, then drop it. For line-oriented text processing this is the realistic baseline.",
            "**Raw bytes with a 64 KB `byte[]`: 230 ms**, four times faster, because nothing is decoded or allocated per line. When the job is \"find records\" or \"count\", scanning bytes and decoding only what's needed pays.",
            "**`FileChannel` with a direct `ByteBuffer` and `get()` per byte: 445 ms**, slower than the array, because each `get()` checks bounds on an off-heap buffer the JIT optimises less well than a plain array loop. Channels pay off for positional I/O and `transferTo`, not for byte-at-a-time scanning.",
            "**Memory-mapped: 179 ms**, the fastest, but it took only 22% less time than the `byte[]` loop here, since the file was already in the page cache and both are memory-bandwidth bound. Mapping avoids copying into the Java heap; with a cold cache, random access, or several processes reading one file, the gap changes, so I'd measure on the real workload before choosing it. Mapping has its own costs: page faults on first touch, the 2 GB limit per map, and an unmap that waits for GC.",
          ],
        },
      ],
    },
    {
      title: "Files in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing pricing service in Kolkata quotes fares from a table of 576 rows: every pair of 12 zones (SALT-LAKE, NEW-TOWN, DUM-DUM, RAJARHAT and others) for four vehicle types, in paise. A sync job regenerates `fares.csv` from the pricing database every few seconds, and the pricing service reloads the file whenever it changes. One evening, support received screenshots of a CAB-XL from DUM-DUM to RAJARHAT quoted at ₹0.02, others of quotes falling back to a default fare, and the pricing service's logs showed occasional \"0 fares loaded\" warnings. The sync job and the service each passed all their tests.",
        },
        {
          type: "paragraph",
          text: "I rebuilt it with a writer thread playing the sync job and the main thread playing the pricing service. Two threads in one JVM behave the same as two processes here, because they only share the file through the operating system. The reader classifies each reload: complete, empty, missing whole rows, or a last row cut off without its newline, and among those, rows that still parse as a fare.",
        },
        {
          type: "code",
          language: "java",
          title: "FareReload.java",
          code: `import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static java.nio.file.StandardCopyOption.ATOMIC_MOVE;
import static java.nio.file.StandardCopyOption.REPLACE_EXISTING;

public class FareReload {
    static final String[] ZONES = {"SALT-LAKE", "NEW-TOWN", "PARK-STREET", "HOWRAH", "GARIA", "DUM-DUM",
                                   "BEHALA", "JADAVPUR", "SEALDAH", "ESPLANADE", "TOLLYGUNGE", "RAJARHAT"};
    static final String[] VEHICLES = {"AUTO", "BIKE", "CAB", "CAB-XL"};
    static final int ROWS = ZONES.length * ZONES.length * VEHICLES.length;    // 576 rows, about 18 KB

    // The sync job: pull fares from the database, write them out
    static void writeFares(BufferedWriter out, int version) throws IOException {
        for (int i = 0; i < ZONES.length; i++)
            for (int j = 0; j < ZONES.length; j++)
                for (int v = 0; v < VEHICLES.length; v++)
                    out.write(ZONES[i] + "," + ZONES[j] + "," + VEHICLES[v] + ","
                            + (4_000 + (i * 31 + j * 17 + v * 7 + version * 13) % 300 * 100) + "\\n");
    }

    // What shipped: rewrite the live file in place
    static void inPlace(Path fares, int version) throws IOException {
        try (BufferedWriter out = Files.newBufferedWriter(fares)) {     // CREATE, TRUNCATE_EXISTING, WRITE
            writeFares(out, version);
        }
    }

    // The fix: write a temp file next to it, fsync, then rename over the live file
    static void atomic(Path fares, int version) throws IOException {
        Path tmp = fares.resolveSibling(fares.getFileName() + ".tmp");
        try (BufferedWriter out = Files.newBufferedWriter(tmp)) {
            writeFares(out, version);
        }
        try (FileChannel ch = FileChannel.open(tmp, StandardOpenOption.WRITE)) {
            ch.force(true);
        }
        Files.move(tmp, fares, ATOMIC_MOVE, REPLACE_EXISTING);
    }

    public static void main(String[] args) throws Exception {
        boolean useAtomic = args[0].equals("atomic");
        Path fares = Path.of("fares.csv");
        inPlace(fares, 0);

        AtomicBoolean running = new AtomicBoolean(true);
        Thread writer = new Thread(() -> {
            int version = 1;
            try {
                while (running.get()) {
                    if (useAtomic) atomic(fares, version++); else inPlace(fares, version++);
                    Thread.sleep(1);
                }
            } catch (IOException | InterruptedException e) {
                throw new RuntimeException(e);
            }
        });
        writer.start();

        // The pricing service: reload the fare table whenever it's asked to
        int reads = 0, complete = 0, empty = 0, missingRows = 0, tornLine = 0, wrongFare = 0;
        String example = null;
        long end = System.nanoTime() + 2_000_000_000L;
        while (System.nanoTime() < end) {
            String text = Files.readString(fares);
            List<String> rows = text.lines().toList();
            reads++;
            if (rows.isEmpty()) empty++;
            else if (!text.endsWith("\\n")) {
                tornLine++;
                String[] last = rows.getLast().split(",");
                if (last.length == 4 && !last[3].isEmpty()) {          // parses fine, but the number is cut short
                    wrongFare++;
                    if (example == null) example = rows.size() + " rows, last row \\"" + rows.getLast() + "\\"";
                }
            }
            else if (rows.size() < ROWS) missingRows++;
            else complete++;
        }
        running.set(false);
        writer.join();

        System.out.printf("%s: %,d reloads: %,d complete, %,d empty, %,d missing rows, %,d torn last line%n",
                args[0], reads, complete, empty, missingRows, tornLine);
        System.out.printf("torn rows that still parse as a fare: %,d%s%n", wrongFare, example == null ? "" : ", e.g. " + example);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java FareReload inplace`,
        },
        {
          type: "output",
          text: `inplace: 62,948 reloads: 37,980 complete, 23,469 empty, 5 missing rows, 1,494 torn last line
torn rows that still parse as a fare: 123, e.g. 288 rows, last row "DUM-DUM,RAJARHAT,CAB-XL,2"`,
        },
        {
          type: "image",
          src: "/images/java/nio-files-and-paths-atomic-write.svg",
          alt: "Two lanes. Top lane, In place with Files.newBufferedWriter(fares.csv): openat with O_TRUNC makes the file 0 bytes, so a reader sees an empty file; then write of 8192 bytes ending mid-row, where a reader sees a torn last row; another write of 8192 ending mid-row; then a write of the tail after which the reader sees the full table. Measured: 62,948 reloads, 37,980 complete, 23,469 empty, 1,494 with a torn last row, and 123 torn rows still parsed as a fare, for example DUM-DUM,RAJARHAT,CAB-XL,2, a 2-paise cab fare from a row whose last digits had not been written yet. Bottom lane, Atomic: write fares.csv.tmp in the same directory, which nobody reads; fsync it with ch.force(true); then rename fares.csv.tmp to fares.csv with Files.move and ATOMIC_MOVE. The directory entry fares.csv points at inode A with the old complete table, and after the rename at inode B with the new complete table, with no moment in between; readers already open on A keep reading A to the end. Measured: 34,890 reloads, all 34,890 complete. Same directory matters: across file systems rename fails with EXDEV and Files.move with ATOMIC_MOVE throws AtomicMoveNotSupportedException instead of copying.",
          caption: "In place, readers can open the file at any point in the rewrite. With rename, there's no such point.",
        },
        {
          type: "paragraph",
          text: "After switching the sync job to `atomic`:",
        },
        {
          type: "code",
          language: "bash",
          code: `java FareReload atomic`,
        },
        {
          type: "output",
          text: `atomic: 34,890 reloads: 34,890 complete, 0 empty, 0 missing rows, 0 torn last line
torn rows that still parse as a fare: 0`,
        },
        {
          type: "list",
          items: [
            "**Why it broke.** `Files.newBufferedWriter(fares)` opens with `O_TRUNC`, so the live file is empty from the first instant, then grows in 8192-byte `write`s as the `BufferedWriter` fills. A reader opening it in that window gets whatever is there: nothing (37% of reloads), or a prefix ending mid-row (1,494 reloads).",
            "**Why it quoted 2 paise.** The cut falls wherever byte 8192 or 16384 lands, and with fares of varying length that's sometimes inside a number: `DUM-DUM,RAJARHAT,CAB-XL,2` is a valid row to a parser that splits on commas. 123 reloads in 2 seconds produced such a row. An empty file gave \"0 fares loaded\", and missing rows gave default fares.",
            "**Why tests passed.** The writer's tests wrote and then read; the reader's tests read a fixed file. Nothing ran both at once. The bug lives only in the overlap.",
            "**The fix** is the atomic pattern traced in Execution Flow: write `fares.csv.tmp` in the same directory, close, `force`, then `Files.move(tmp, fares, ATOMIC_MOVE, REPLACE_EXISTING)`, a single `rename(2)`. 34,890 reloads, all complete. There were fewer reloads in the same 2 seconds because every one now read and split the full 16.5 KB table, where 37% of the in-place reloads had read an empty file; the writer also paid for an `fsync` per version, the price of durability.",
            "**Defence in depth on the reader side.** I'd also make the reader validate before swapping in a new table: expected row count (or a trailer line with a count and checksum), every fare in a sane range (say ₹20 to ₹5,000), and keep the previous table if validation fails. Atomic writes stop torn files; validation stops a sync job that atomically publishes wrong data.",
            "**Other writers.** Anything that edits files others read (config reloaders, `sed -i` in deploy scripts, which also writes a temp file and renames) should be checked for the same pattern. Kubernetes ConfigMap volumes use the same idea, swapping a symbolic link to a new directory atomically.",
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
              question: "What is the difference between java.io.File and java.nio.file.Path?",
              answer:
                "Both represent a location, but `File` mixes the path with file operations that return booleans (`delete()` is `false` for any failure), while `Path` is only the location and `Files` performs operations that throw specific exceptions (`NoSuchFileException`, `DirectoryNotEmptyException`, `AccessDeniedException`). NIO.2 also supports symbolic links, attributes, permissions, atomic moves, directory walking and watching, and other file systems such as ZIP. `file.toPath()` and `path.toFile()` convert between them.",
            },
            {
              question: "How do you read a whole text file in modern Java?",
              answer:
                "`Files.readString(path)` (Java 11) for one `String`, or `Files.readAllLines(path)` for a `List<String>`; both use UTF-8 by default and close the file themselves. They're for files known to be small: a 512 MB file needed 1.5 GB of heap with `readAllLines`. For large files, `Files.lines(path)` in try-with-resources or `Files.newBufferedReader(path)`.",
            },
            {
              question: "What do resolve, normalize and relativize do?",
              answer:
                "`resolve` joins paths: `/srv/fares` resolved with `kolkata.csv` is `/srv/fares/kolkata.csv`, but resolving an absolute path returns that path. `normalize` removes `.` and `name/..` textually: `kolkata/zones/../salt-lake.csv` becomes `kolkata/salt-lake.csv`. `relativize` is the inverse of `resolve`: from `/srv/fares` to `/srv/logs/app.log` is `../logs/app.log`. None of them touch the disk.",
            },
            {
              question: "How do you append to a file with Files?",
              answer:
                "`Files.writeString(p, text, StandardOpenOption.CREATE, StandardOpenOption.APPEND)`. `APPEND` alone throws `NoSuchFileException` if the file doesn't exist, and passing any options replaces the defaults (`CREATE`, `TRUNCATE_EXISTING`, `WRITE`). Combining `APPEND` with `TRUNCATE_EXISTING` throws `IllegalArgumentException`.",
            },
            {
              question: "Why must the stream from Files.lines be closed?",
              answer:
                "It's backed by an open file, and reading it to the end doesn't close it. 500 unclosed `Files.lines` calls left up to 500 descriptors open in my test (175 after a GC happened to run). In try-with-resources, 0. The same applies to `Files.list`, `walk` and `find`, whose directory streams are never cleaned up by GC.",
            },
            {
              question: "How do you copy and move files, and what if the target exists?",
              answer:
                "`Files.copy(source, target)` and `Files.move(source, target)`. If the target exists they throw `FileAlreadyExistsException` unless given `StandardCopyOption.REPLACE_EXISTING`. `COPY_ATTRIBUTES` copies times and permissions, and `ATOMIC_MOVE` makes the move a single `rename`. On Linux, `copy` uses the `copy_file_range` system call and `move` uses `rename`.",
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
              question: "What is the difference between Files.readAllLines and Files.lines?",
              answer:
                "`readAllLines` reads everything into a `List<String>` immediately and closes the file. `lines` returns a lazy `Stream<String>` that reads as it's consumed and must be closed. Memory is the difference: summing fares over a 512 MB file with `lines` worked with `-Xmx64m`, while `readAllLines` failed even with 1 GB and retained 1,524 MB (72 bytes per 24-byte line) when given 3 GB. `lines` reports I/O errors as `UncheckedIOException`.",
            },
            {
              question: "What does Files.move with ATOMIC_MOVE guarantee, and when does it fail?",
              answer:
                "That the move is a single file-system operation (`rename(2)` on Linux): other processes see either the old state or the new one, never a partial file, and an existing target is replaced in the same step. It only works within one file system; across file systems the kernel returns `EXDEV`, and Java throws `AtomicMoveNotSupportedException` (\"Invalid cross-device link\" when I moved to `/dev/shm`). Without `ATOMIC_MOVE`, Java would silently fall back to copy and delete.",
            },
            {
              question: "How do you replace a file safely while other processes read it?",
              answer:
                "Write the new content to a temporary file in the same directory, close it, `fsync` it (`FileChannel.force(true)`), then `Files.move(tmp, target, ATOMIC_MOVE, REPLACE_EXISTING)`. Readers that already opened the old file keep reading the old inode; new readers get the new one. In my test, rewriting in place gave 23,469 empty and 1,494 torn reads out of 62,948; the atomic version gave 34,890 complete reads out of 34,890.",
            },
            {
              question: "Why do Files methods decode strictly, and why does it matter?",
              answer:
                "`Files.newBufferedReader` passes `charset.newDecoder()` to `InputStreamReader`, and a fresh decoder's action for malformed input is REPORT, so invalid bytes throw `MalformedInputException`. `new FileReader(file, cs)` configures REPLACE, turning them into U+FFFD silently. Strict decoding makes a wrong-charset file fail immediately instead of corrupting data. `readString` uses an internal `String` decoder that also throws.",
            },
            {
              question: "What is the difference between Files.walk, Files.find and Files.walkFileTree?",
              answer:
                "`walk` returns a lazy depth-first `Stream<Path>` (optionally limited by `maxDepth`). `find` does the same but passes each entry's `BasicFileAttributes` to a predicate, saving a `stat` per file when filtering on type, size or time. `walkFileTree` is callback-based (`preVisitDirectory`, `visitFile`, `visitFileFailed`, `postVisitDirectory`), can skip subtrees and handle errors per file, and is the natural fit for recursive delete or copy. None follow symbolic links by default, and the two stream versions must be closed.",
            },
            {
              question: "What exceptions can Files.delete throw, and when would you use deleteIfExists?",
              answer:
                "`NoSuchFileException` if the path doesn't exist, `DirectoryNotEmptyException` for a non-empty directory, `AccessDeniedException` without permission, all `FileSystemException`s with the path in the message. `deleteIfExists` returns `false` instead of throwing for a missing file, the right choice when another process may already have deleted it (concurrent cleanup jobs); `delete` is right when a missing file indicates a bug.",
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
              question: "When are memory-mapped files faster, and what are their limits?",
              answer:
                "Mapping avoids copying data from the page cache into a Java buffer; the program reads the pages directly. Counting newlines in a cached 512 MB file took 179 ms mapped against 230 ms with a 64 KB `byte[]` and about 1 s decoding lines, so the gain over a good array loop was modest. It helps more for random access and for large files read repeatedly or shared between processes. Limits: 2 GB per `MappedByteBuffer` (int indexes), page faults on first access, the mapping lives until GC frees the buffer (blocking deletes on Windows), and I/O errors arrive as unpredictable faults. The FFM API (`MemorySegment`, final in Java 22) removes the 2 GB limit and gives deterministic unmapping with an `Arena`.",
            },
            {
              question: "Do unclosed Files.lines and Files.list streams eventually get cleaned up?",
              answer:
                "Partly. `Files.lines` (for UTF-8 and other single-byte-newline charsets) is backed by a `FileChannelImpl`, which registers a `Cleaner`, so a GC eventually closes unreachable ones: 500 leaked became 175 after a young GC and 0 after `System.gc()`. `Files.list`, `walk` and `find` use `UnixDirectoryStream`, which has no Cleaner: 1,000 descriptors (two per stream, an `openat` plus a `dup`) stayed open after `System.gc()`. Either way, relying on GC for descriptors is wrong; close them.",
            },
            {
              question: "What is the difference between close(), flush() and force(true)?",
              answer:
                "`flush()` moves data from Java buffers to the OS; `close()` flushes and releases the descriptor. After either, the data is in the kernel's page cache and visible to other processes, but a power failure can still lose it. `FileChannel.force(true)` calls `fsync`, which waits until the storage device has the data and metadata (`force(false)` is like `fdatasync`, data only). For a rename to be durable, the directory must be synced as well; on Linux, `FileChannel.open(dir, READ).force(true)` works.",
            },
            {
              question: "How do FileLocks behave on Linux, and what is the trap?",
              answer:
                "They're POSIX advisory record locks (`fcntl`), held by the process, not the thread. Another process's `tryLock` returns `null` while the lock is held, a second lock in the same JVM throws `OverlappingFileLockException`, and programs that don't ask for the lock aren't stopped. The trap: closing any descriptor for the file releases all the process's locks on it. In my test, opening and closing a second channel let another process take the lock while `lock.isValid()` still returned `true`. Lock a dedicated file that is never reopened.",
            },
            {
              question: "Why does Files.copy not need to read the file into Java?",
              answer:
                "On Linux, `UnixFileSystemProvider` opens the target with `O_CREAT|O_EXCL` and calls `copy_file_range(2)`, so the kernel copies between the two descriptors directly, without the bytes passing through user space. On copy-on-write file systems it can share extents instead of copying. `strace` showed two calls for a 31-byte file: one copying 31 bytes, one returning 0. `FileChannel.transferTo` gives the same for channels.",
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
              question: "A pricing service occasionally quotes absurd fares (₹0.02) or loads zero fares after a sync job updates the fare file. How do you investigate and fix it?",
              answer:
                "I'd suspect the writer rewriting the file in place: `Files.write` or `newBufferedWriter` truncates on open and writes in 8 KB chunks, so a reader can see an empty file or one cut mid-row, and a row cut inside the number (`DUM-DUM,RAJARHAT,CAB-XL,2`) still parses. I'd confirm with `strace` on the writer (`openat` with `O_TRUNC` on the live file) and by reproducing the overlap, as `FareReload` did (23,469 empty and 123 parseable torn reads in 2 seconds).\n\nFix the writer with write-temp-in-same-directory, `force`, `ATOMIC_MOVE`. Then harden the reader: validate row count and fare ranges and keep the previous table if a new one fails validation.",
            },
            {
              question: "A service fails after running for days with \"Too many open files\". The code uses Files.list(dir).count() in a scheduled task. What's wrong?",
              answer:
                "`Files.list` returns a stream backed by a directory stream; `count()` consumes it but doesn't close it. On Linux each costs two descriptors, and `UnixDirectoryStream` has no Cleaner, so GC never releases them: I measured 1,000 descriptors left after 500 calls and a `System.gc()`. Wrap it in try-with-resources. To confirm in production: `ls -l /proc/<pid>/fd` shows hundreds of entries pointing at the same directory.",
            },
            {
              question: "An import job processing customer CSVs runs out of memory on large files. It uses Files.readAllLines. What do you change?",
              answer:
                "Stream the file: `Files.lines(path)` in try-with-resources or `Files.newBufferedReader`, processing rows in fixed-size batches (as `BatchImport` does with 1,000 rows per JDBC batch). `readAllLines` keeps every line as a `String`: 72 bytes per 24-byte line in my measurement, three times the file size. With streaming, a 512 MB file was processed in a 64 MB heap. I'd also catch `UncheckedIOException` from the stream pipeline, since decoding errors arrive wrapped.",
            },
            {
              question: "A file download endpoint takes a file name from the request. How do you make sure users can't read other files?",
              answer:
                "Resolve the name against the base directory, `normalize()`, and check `Path.startsWith(base)`, comparing paths, not strings (`/srv/invoices-old` passes a string prefix check). Then call `toRealPath()` and check again, to catch symbolic links inside the base that point elsewhere, and make the base itself a real path. Absolute names are caught too, because `resolve` returns an absolute argument unchanged. `SafeDownload` refused `../../etc/passwd`, `/etc/passwd` and a symlink to `/etc/hostname`. Better still, don't use user input as a path: look the file up by an ID.",
            },
            {
              question: "A job that moves processed files to an archive directory started throwing AtomicMoveNotSupportedException after the archive was moved to a new volume. What happened and what are the options?",
              answer:
                "`ATOMIC_MOVE` is a `rename`, which only works within one file system; the archive is now on a different one, so the kernel returns `EXDEV`. Options: drop `ATOMIC_MOVE` and accept copy-then-delete (not atomic, so a crash can leave both copies or a partial target), or make it safe by copying to a temp name on the archive volume, `force`, renaming atomically there, and then deleting the source, with the job tolerating a source that is already archived. If atomicity isn't needed for the archive, the plain move is fine.",
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
            "Print `Path.of(\"a/b/../c\").normalize()`, `Path.of(\"/srv\").relativize(Path.of(\"/srv/x/y\"))`, `Path.of(\"/srv\").resolve(\"/etc\")` and `Path.of(\"../x\").normalize()`.",
            "Call `Files.delete` on a missing file and `new File(...).delete()` on the same path, and compare.",
            "Call `Files.writeString(p, \"x\", StandardOpenOption.CREATE_NEW)` twice on the same path.",
            "In a loop, call `Files.list(dir).findFirst()` 500 times without closing, and count `/proc/self/fd` before and after, then after `System.gc()` (Linux).",
            "Generate a file of a few hundred MB and run `readAllLines` and `Files.lines(...).count()` on it with `-Xmx64m`.",
            "`Files.move` a file from your home directory to `/dev/shm` with `ATOMIC_MOVE`, then without it.",
            "Run a program that calls `Files.copy` and `Files.move` under `strace -f -e trace=copy_file_range,rename`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `a/c`, `x/y`, `/etc` and `../x` (a leading `..` can't be removed). Step 2: `NoSuchFileException` with the path, and `false`. Step 3: the first call succeeds, the second throws `FileAlreadyExistsException`. Step 4: about 1,000 more descriptors (two per stream), still there after `System.gc()`. Step 5: `OutOfMemoryError: Java heap space` from `readAllLines`, a count from `lines`. Step 6: `AtomicMoveNotSupportedException` (\"Invalid cross-device link\") with `ATOMIC_MOVE`, a successful copy-and-delete without it, as long as your home directory and `/dev/shm` are different file systems. Step 7: one or more `copy_file_range` calls for the copy and a `rename` for the move.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `PATH       Path.of("/srv", "fares.csv")   just names, no disk access
           resolve (absolute arg wins)  normalize (textual)  relativize
           Path.startsWith compares names; toRealPath follows links

FILES      readString / readAllLines / readAllBytes   small files, auto-close
           lines / list / walk / find  -> Stream, MUST close
           (directory streams: 2 fds each, no Cleaner, never GC'd)
           UTF-8 default, strict: MalformedInputException, not U+FFFD

OPTIONS    default write = CREATE, TRUNCATE_EXISTING, WRITE (O_TRUNC!)
           CREATE_NEW = O_EXCL   CREATE+APPEND for logs   any option
           replaces the defaults (WRITE alone does not truncate)

ERRORS     NoSuchFile / FileAlreadyExists / DirectoryNotEmpty /
           AccessDenied  (vs java.io.File -> false)

SYSCALLS   copy -> copy_file_range   move ATOMIC_MOVE -> rename (EXDEV
           across file systems)   force(true) -> fsync

ATOMIC     tmp in same dir -> write -> close -> force -> move ATOMIC_MOVE
           in place: 23,469 empty + 1,494 torn of 62,948 reloads
           atomic:   34,890 of 34,890 complete

LARGE      512 MB: readAllLines 1.5 GB heap; lines ok in 64 MB
           lines 1.0 s, byte[] 230 ms, mmap 179 ms (2 GB per map)

LOCKS      FileLock: per process, advisory; closing ANY fd drops it`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "`Path` names a file and `Files` acts on it, with exceptions that explain failures, UTF-8 and strict decoding by default, and system calls I could see in `strace`: `copy_file_range` for copies and a single atomic `rename` for moves.",
            "The habits that matter in production: close every stream a `Files` method returns, stream files that can grow, spell out open options, and replace shared files with write-temp-and-rename in the same directory, so no reader ever sees a half-written file.",
            "With this lesson the File Handling phase is complete. Next comes Serialization: turning Java objects into bytes and back with `ObjectOutputStream` and `ObjectInputStream`, `serialVersionUID`, `transient` fields, and why deserializing untrusted data is dangerous.",
          ],
        },
      ],
    },
  ],
};
