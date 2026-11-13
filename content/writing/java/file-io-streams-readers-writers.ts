import type { Lesson } from "../types";

export const fileIoStreamsReadersWriters: Lesson = {
  slug: "file-io-streams-readers-writers",
  date: "2026-11-13",
  title: "File I/O with java.io: Streams, Readers and Writers",
  description:
    "How java.io really reads and writes files on JDK 21: byte streams against character streams, the decorator stack behind new BufferedReader(new FileReader(file)), a 1 MB file read with 1,048,601 read() system calls unbuffered and 130 buffered (counted with strace), the 8192-char buffer in BufferedReader and the StreamDecoder and StreamEncoder inside every Reader and Writer, JDK 21's FileWriter making 16 times more write() calls than JDK 17's, UTF-8 by default since JEP 400 and the mojibake when it isn't, flush against close and the 15,832 bytes lost by a missing close(), PrintWriter swallowing a full disk, java.io.File returning false instead of throwing, Scanner, DataOutputStream and RandomAccessFile, and rider names like Zoë and অনিতা turned into question marks by a receipts job in a container with no locale.",
  tags: ["Core Java", "File Handling", "java.io", "Charsets"],
  sections: [
    {
      title: "What java.io File Handling Is",
      blocks: [
        {
          type: "paragraph",
          text: "The Wrapper Traps lesson closed the Wrapper Classes phase and said File Handling came next. Everything so far has lived in memory and disappeared when the JVM exited. A file is how a program keeps data after it stops and hands data to other programs: a CSV export for the finance team, a log file, a fare table another service writes. **File I/O** is reading bytes from such a file into the program, and writing bytes from the program into it.",
        },
        {
          type: "paragraph",
          text: "`java.io` is Java's original I/O library, in the JDK since 1.0. It's built on one idea: a **stream** is a sequence of data read or written in order, one piece after another. There are two families. **Byte streams** (`InputStream`, `OutputStream`) move raw bytes and know nothing about text. **Character streams** (`Reader`, `Writer`) move `char`s, and to do that they must turn bytes into characters and back using a **charset** such as UTF-8. Most bugs in file handling come from forgetting which of the two a piece of code is using.",
        },
        {
          type: "paragraph",
          text: "Real code stacks these classes: `new BufferedReader(new FileReader(file, UTF_8))` is three objects, each adding one ability (buffering, decoding, file access). This lesson takes that stack apart with `javap` and `strace`, measures what buffering is worth, shows what a missing `close()` costs, and ends with a charset bug that corrupted rider names in production. The next lesson, java.nio.file: Paths, Files and Large Files, covers the newer API most new code should use, which is built on the same ideas.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 (1996) shipped only byte streams, modelled on Unix file descriptors and C's `stdio`: `FileInputStream`, `FileOutputStream`, `BufferedInputStream`, `DataInputStream`, `RandomAccessFile` and `java.io.File`. Text was handled by casting bytes to `char`, which only works for ASCII. Java 1.1 (1997) added `Reader` and `Writer` because Java's `char` is a 16-bit Unicode unit and text needs a charset to become bytes. Since then the library has grown by addition, never replacement, which is why it has so many overlapping classes.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`InputStream`/`OutputStream`, `File`, `RandomAccessFile`, `Data*Stream`, `PrintStream`", "Byte streams and the boolean-returning `File` API"],
            ["Java 1.1 (1997)", "`Reader`/`Writer`, `InputStreamReader`, `BufferedReader`, `FileReader`, `PrintWriter`", "Character streams and charsets"],
            ["Java 1.4 (2002)", "NIO (JSR 51): channels, buffers, `java.nio.charset`", "`Charset`, `CharsetDecoder`; the `StreamDecoder` inside every `Reader` uses them"],
            ["Java 5 (2004)", "`Scanner`, `printf`/`Formatter`, `Closeable` and `Flushable` interfaces", "Parsing and formatting text files"],
            ["Java 7 (2011)", "try-with-resources, `AutoCloseable`; NIO.2 `java.nio.file` (JSR 203); `StandardCharsets`; `File.toPath()`", "Reliable closing; the next lesson's API"],
            ["Java 9 (2017)", "`InputStream.transferTo`, `readAllBytes`, `readNBytes`", "Copying a stream in one call"],
            ["Java 10 (2018)", "`Charset` overloads for `PrintWriter`, `PrintStream`, `Scanner`; `Reader.transferTo`", "Naming a charset without `String` names and checked exceptions"],
            ["Java 11 (2018)", "`FileReader(File, Charset)`, `FileWriter(File, Charset)`", "Before this, `FileReader` always used the platform default charset"],
            ["Java 18 (2022)", "JEP 400: UTF-8 by default", "`FileReader` without a charset means UTF-8 everywhere, not the OS locale"],
            ["Java 21 (2023)", "Virtual threads final (JEP 444); java.io was reworked for them from Java 19", "On JDK 21, `BufferedWriter` starts at 512 chars on a virtual thread and `StreamEncoder` at 512 bytes"],
          ],
        },
        {
          type: "paragraph",
          text: "Two of these changes matter for code written today. JEP 400 removed most charset surprises between machines, and the Java 21 buffer changes made `FileWriter` without a `BufferedWriter` slower than it was on Java 17, which I measured below. Neither shows up as a compile error or a deprecation warning.",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "I think of water coming into a flat from the municipal supply.",
        },
        {
          type: "list",
          items: [
            "The **file on disk is the municipal reservoir**, and a **system call is a trip by the municipal tanker**: slow and expensive, whatever the amount carried.",
            "**`FileInputStream.read()` with no buffer is asking the tanker to bring one cup at a time.** It works, and it's what I measured at 1,048,601 trips for a 1 MB file.",
            "**A buffer is the overhead tank on the roof.** The tanker fills it with 8 KB at once, and the taps in the flat draw from the tank. `BufferedInputStream` and `BufferedReader` are overhead tanks.",
            "**A `Reader` is a water purifier on the line**: it turns raw bytes into drinkable characters, and it must be set for the right source. Set for the wrong charset, it produces something that looks like water but isn't (mojibake).",
            "**Writing is the same in reverse**, and **`flush()` is opening the outlet valve** so the tank empties to its destination. **`close()` opens the valve and then shuts the connection.** Leave the house without doing either, and whatever is still in the tank never arrives.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a real overhead tank is one object. In Java there can be two tanks in a row (`BufferedWriter`'s char buffer and the `StreamEncoder`'s byte buffer), which is why a missing `close()` lost 15,832 bytes in one test below, not 8 KB.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The four abstract classes and their families",
        },
        {
          type: "code",
          language: "java",
          title: "StreamFamilies.java",
          code: `import java.io.*;
import java.util.ArrayList;
import java.util.List;

public class StreamFamilies {
    static String chain(Class<?> c) {
        List<String> names = new ArrayList<>();
        for (Class<?> k = c; k != Object.class; k = k.getSuperclass()) names.add(k.getSimpleName());
        return String.join(" -> ", names);
    }

    public static void main(String[] args) {
        Class<?>[] classes = {
            FileInputStream.class, BufferedInputStream.class, DataInputStream.class,
            FileOutputStream.class, BufferedOutputStream.class, PrintStream.class,
            FileReader.class, BufferedReader.class, FileWriter.class, BufferedWriter.class, PrintWriter.class,
            RandomAccessFile.class
        };
        for (Class<?> c : classes) System.out.println(chain(c));
        System.out.println("Closeable: " + Closeable.class.isAssignableFrom(Reader.class)
                + ", Flushable: " + Flushable.class.isAssignableFrom(Writer.class)
                + ", Flushable InputStream? " + Flushable.class.isAssignableFrom(InputStream.class));
    }
}`,
        },
        {
          type: "output",
          text: `FileInputStream -> InputStream
BufferedInputStream -> FilterInputStream -> InputStream
DataInputStream -> FilterInputStream -> InputStream
FileOutputStream -> OutputStream
BufferedOutputStream -> FilterOutputStream -> OutputStream
PrintStream -> FilterOutputStream -> OutputStream
FileReader -> InputStreamReader -> Reader
BufferedReader -> Reader
FileWriter -> OutputStreamWriter -> Writer
BufferedWriter -> Writer
PrintWriter -> Writer
RandomAccessFile
Closeable: true, Flushable: true, Flushable InputStream? false`,
        },
        {
          type: "list",
          items: [
            "Every class ends in one of four abstract roots: `InputStream`, `OutputStream` (bytes), `Reader`, `Writer` (chars). The suffix of a class name tells the family: `...Stream` is bytes, `...Reader`/`...Writer` is characters.",
            "**`FileReader` is an `InputStreamReader`**, and `FileWriter` an `OutputStreamWriter`. They're convenience subclasses with only constructors: `javap -p java.io.FileReader` lists five constructors and nothing else. They open a `FileInputStream` and decode it.",
            "`BufferedInputStream`, `DataInputStream` and `PrintStream` extend `FilterInputStream`/`FilterOutputStream`: classes whose whole job is to wrap another stream. That's the decorator pattern, covered in Internal Working.",
            "`RandomAccessFile` belongs to neither family. It extends `Object` and implements `DataInput` and `DataOutput`, because it can move backwards and forwards in a file, which a stream can't.",
            "All of them are `Closeable`; output classes are also `Flushable`. An `InputStream` has nothing to flush.",
          ],
        },
        {
          type: "heading",
          text: "Which class for which job",
        },
        {
          type: "table",
          headers: ["Job", "Bytes", "Characters"],
          rows: [
            ["Read a file", "`FileInputStream`", "`FileReader(file, charset)`"],
            ["Write a file", "`FileOutputStream(file, append)`", "`FileWriter(file, charset, append)`"],
            ["Bridge bytes to chars", "-", "`InputStreamReader(in, charset)`, `OutputStreamWriter(out, charset)`"],
            ["Add a buffer", "`BufferedInputStream`, `BufferedOutputStream`", "`BufferedReader` (adds `readLine`), `BufferedWriter` (adds `newLine`)"],
            ["Formatted output", "`PrintStream` (`System.out`)", "`PrintWriter`"],
            ["Primitives in binary", "`DataInputStream`, `DataOutputStream`", "-"],
            ["Objects", "`ObjectInputStream`, `ObjectOutputStream`", "- (Serialization phase)"],
            ["Jump around in a file", "`RandomAccessFile`", "-"],
            ["Parse tokens and numbers", "-", "`Scanner`"],
            ["In-memory tests", "`ByteArrayInputStream`/`OutputStream`", "`StringReader`, `StringWriter`"],
          ],
        },
        {
          type: "heading",
          text: "The core methods",
        },
        {
          type: "table",
          headers: ["Method", "Returns", "Meaning"],
          rows: [
            ["`InputStream.read()`", "`int` 0 to 255, or -1", "One byte; -1 at end of file. It's an `int` so -1 can't be confused with byte `0xFF`"],
            ["`InputStream.read(byte[] b)`", "`int` count, or -1", "Up to `b.length` bytes; **may return fewer** even before the end"],
            ["`Reader.read()`", "`int` 0 to 65535, or -1", "One UTF-16 `char`"],
            ["`BufferedReader.readLine()`", "`String` or `null`", "A line without its terminator (`\\n`, `\\r` or `\\r\\n`); `null` at the end"],
            ["`write(int)` / `write(byte[])` / `write(String)`", "`void`", "Data goes into a buffer or straight to the OS, depending on the class"],
            ["`flush()`", "`void`", "Push buffered data down the stack and to the OS"],
            ["`close()`", "`void`", "Flush (for output), then release the file descriptor"],
          ],
        },
        {
          type: "paragraph",
          text: "Almost every method throws the checked `IOException`, including `close()`. That's why file code needs try-with-resources or a `throws IOException`, as the Common Mistakes section shows with the exact compiler errors.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "The decorator stack, read from javap",
        },
        {
          type: "paragraph",
          text: "Each class in `new BufferedReader(new FileReader(file, UTF_8))` holds a reference to the one below it and adds one thing. `javap -p` shows the private fields that do the work (output trimmed to the relevant lines):",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -constants java.io.BufferedReader | grep -E "SIZE|char\\[\\] cb"
javap -p java.io.InputStreamReader java.io.OutputStreamWriter | grep -E "StreamDecoder sd|StreamEncoder se"
javap -p -constants sun.nio.cs.StreamDecoder sun.nio.cs.StreamEncoder | grep -E "BUFFER_SIZE|CAPACITY"
javap -p java.io.FileInputStream | grep native`,
        },
        {
          type: "output",
          text: `  private char[] cb;
  private static final int DEFAULT_CHAR_BUFFER_SIZE = 8192;

  private final sun.nio.cs.StreamDecoder sd;
  private final sun.nio.cs.StreamEncoder se;

  private static final int MIN_BYTE_BUFFER_SIZE = 32;
  private static final int DEFAULT_BYTE_BUFFER_SIZE = 8192;
  private static final int INITIAL_BYTE_BUFFER_CAPACITY = 512;
  private static final int MAX_BYTE_BUFFER_CAPACITY = 8192;

  private native void open0(java.lang.String) throws java.io.FileNotFoundException;
  private native int read0() throws java.io.IOException;
  private native int readBytes(byte[], int, int) throws java.io.IOException;
  private native long length0() throws java.io.IOException;
  private native long position0() throws java.io.IOException;
  private native long skip0(long) throws java.io.IOException;
  private native int available0() throws java.io.IOException;
  private static native void initIDs();`,
        },
        {
          type: "image",
          src: "/images/java/file-io-streams-readers-writers-decorator-stack.svg",
          alt: "A vertical stack of four boxes for new BufferedReader(new FileReader(file, UTF_8)) on JDK 21. Top: BufferedReader with char[] cb of 8192 chars; readLine scans it for a newline and refills only when empty. Second: FileReader extends InputStreamReader, holding a StreamDecoder with an 8192-byte ByteBuffer and a UTF-8 CharsetDecoder; bytes become chars here, and the wrong charset gives mojibake or U+FFFD. Third: FileInputStream with no buffer of its own; read() calls native read0 and read(byte[]) calls readBytes, each one a trip into the kernel. Bottom: the kernel read system call with 8192 bytes, served from the page cache or disk. On the right, measurements on a 1,048,600-byte CSV counted with strace: FileInputStream.read() per byte made 1,048,601 read calls; BufferedInputStream per byte, read(byte[8192]), FileReader.read() per char and BufferedReader.readLine() each made 130. On a 10 MB file, best of 5: unbuffered 7,591 ms, BufferedInputStream per byte 158 ms, readLine 22 ms, own byte[8192] loop 5.9 ms. At the bottom: writing mirrors it, BufferedWriter char[8192], then StreamEncoder bytes starting at 512 and growing to 8192, then FileOutputStream; data still in either buffer when the program stops without close never reaches the file.",
          caption: "Each layer adds one job: buffering, decoding, file access. Only the bottom one talks to the kernel.",
        },
        {
          type: "list",
          items: [
            "**`BufferedReader` holds a `char[8192]`.** `readLine()` looks for the line end inside that array and only asks the layer below for more when the array is used up.",
            "**`InputStreamReader` (and so `FileReader`) holds a `StreamDecoder`**, an internal class in `sun.nio.cs`. It keeps an 8192-byte `ByteBuffer` and a `CharsetDecoder`: it reads bytes in 8 KB chunks and decodes them into chars. So a bare `FileReader` is already buffered on the byte side, which `strace` confirms below.",
            "**`OutputStreamWriter` (and `FileWriter`) holds a `StreamEncoder`**, which encodes chars into a byte buffer. On JDK 21 that buffer **starts at 512 bytes** and only grows to 8192 when a single write needs more space, a change I found by measuring before I found it in `javap`.",
            "**`FileInputStream` has no buffer.** Its `read()` calls the native `read0()`, which is one `read(2)` system call for **one byte**. `read(byte[], int, int)` calls `readBytes`, one system call for many bytes.",
          ],
        },
        {
          type: "heading",
          text: "One byte, one system call",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -c java.io.FileInputStream | grep -A11 "public int read() throws"`,
        },
        {
          type: "output",
          text: `  public int read() throws java.io.IOException;
    Code:
       0: invokestatic  #77                 // Method jdk/internal/misc/Blocker.begin:()J
       3: lstore_1
       4: aload_0
       5: invokevirtual #90                 // Method read0:()I
       8: istore_3
       9: lload_1
      10: invokestatic  #86                 // Method jdk/internal/misc/Blocker.end:(J)V
      13: iload_3
      14: ireturn`,
        },
        {
          type: "paragraph",
          text: "`read()` is a thin wrapper around the native `read0()`. The `Blocker.begin`/`end` calls are for virtual threads (Java 21): a file read blocks the OS thread, so the scheduler is told it may need to add a carrier thread while this one waits. Nothing in the Java code batches bytes. To see what that means in practice I wrote a 1 MB trip CSV and read it five ways:",
        },
        {
          type: "code",
          language: "java",
          title: "ReadSpeed.java",
          code: `import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class ReadSpeed {
    // Count '\\n' bytes one read() at a time, straight from the file
    static long unbuffered(String file) throws IOException {
        long lines = 0;
        try (InputStream in = new FileInputStream(file)) {
            int b;
            while ((b = in.read()) != -1) if (b == '\\n') lines++;
        }
        return lines;
    }

    // Same loop, same read() calls, but through an 8 KB buffer
    static long buffered(String file) throws IOException {
        long lines = 0;
        try (InputStream in = new BufferedInputStream(new FileInputStream(file))) {
            int b;
            while ((b = in.read()) != -1) if (b == '\\n') lines++;
        }
        return lines;
    }

    // My own 8 KB array, no BufferedInputStream
    static long chunked(String file) throws IOException {
        long lines = 0;
        byte[] buf = new byte[8192];
        try (InputStream in = new FileInputStream(file)) {
            int n;
            while ((n = in.read(buf)) != -1) {
                for (int i = 0; i < n; i++) if (buf[i] == '\\n') lines++;
            }
        }
        return lines;
    }

    // A Reader, one char at a time, no BufferedReader on top
    static long readerChars(String file) throws IOException {
        long lines = 0;
        try (FileReader in = new FileReader(file, StandardCharsets.UTF_8)) {
            int c;
            while ((c = in.read()) != -1) if (c == '\\n') lines++;
        }
        return lines;
    }

    static long readLines(String file) throws IOException {
        long lines = 0;
        try (BufferedReader in = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            while (in.readLine() != null) lines++;
        }
        return lines;
    }

    interface Reading { long run(String file) throws IOException; }

    public static void main(String[] args) throws IOException {
        String file = args[0];
        String only = args.length > 1 ? args[1] : null;
        String[] names = {"unbuffered", "buffered", "chunked", "readerChars", "readLines"};
        Reading[] ways = {ReadSpeed::unbuffered, ReadSpeed::buffered, ReadSpeed::chunked,
                          ReadSpeed::readerChars, ReadSpeed::readLines};
        for (int k = 0; k < ways.length; k++) {
            if (only != null && !only.equals(names[k])) continue;
            long best = Long.MAX_VALUE, lines = 0;
            for (int run = 0; run < (only == null ? 5 : 1); run++) {
                long t0 = System.nanoTime();
                lines = ways[k].run(file);
                best = Math.min(best, System.nanoTime() - t0);
            }
            System.out.printf("%-12s %,9d lines  %,8.1f ms%n", names[k], lines, best / 1e6);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# one mode per run; -P counts only system calls on that file, -c prints a summary
strace -f -c -e trace=read -P trips-1mb.csv java ReadSpeed trips-1mb.csv unbuffered
strace -f -c -e trace=read -P trips-1mb.csv java ReadSpeed trips-1mb.csv buffered
# ...and the same for chunked, readerChars and readLines`,
        },
        {
          type: "output",
          text: `unbuffered      46,093 lines  25,903.9 ms
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
100.00    2.988442           2   1048601           read

buffered        46,093 lines      32.9 ms
100.00    0.000025           0       130           read

chunked         46,093 lines       7.3 ms
100.00    0.000033           0       130           read

readerChars     46,093 lines      99.4 ms
100.00    0.000801           6       130           read

readLines       46,093 lines      39.7 ms
100.00    0.000571           4       130           read`,
        },
        {
          type: "list",
          items: [
            "**Unbuffered: 1,048,601 `read()` system calls for a 1,048,600-byte file**, one per byte plus the one that returned 0 at the end. Under `strace` it took 26 seconds, because tracing makes every system call far more expensive.",
            "**Every buffered way: 130 calls.** 1,048,600 / 8,192 = 128 full reads, one 24-byte read for the tail, and one that hits the end. Same 8 KB size whether the buffer belongs to `BufferedInputStream`, my own `byte[8192]`, or the `StreamDecoder` inside `FileReader`.",
            "**`FileReader.read()` one char at a time made 130 system calls too**, not a million: the `StreamDecoder` buffers bytes. It's still slow for other reasons, measured in Performance.",
            "On a strace-free run of the 10 MB file (Performance section), unbuffered took 7.6 seconds against 22 ms for `readLine()`: a factor of about 340, almost all of it the cost of entering and leaving the kernel a million times per megabyte.",
          ],
        },
        {
          type: "heading",
          text: "The Java 21 buffer changes",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -c java.io.BufferedWriter | grep -A10 "private static int initialBufferSize"`,
        },
        {
          type: "output",
          text: `  private static int initialBufferSize();
    Code:
       0: invokestatic  #1                  // Method jdk/internal/misc/VM.isBooted:()Z
       3: ifeq          19
       6: invokestatic  #7                  // Method java/lang/Thread.currentThread:()Ljava/lang/Thread;
       9: invokevirtual #13                 // Method java/lang/Thread.isVirtual:()Z
      12: ifeq          19
      15: sipush        512
      18: ireturn
      19: sipush        8192
      22: ireturn`,
        },
        {
          type: "list",
          items: [
            "**`BufferedWriter` and `BufferedOutputStream` start at 512 on a virtual thread**, 8192 on a platform thread, and grow up to `DEFAULT_MAX_BUFFER_SIZE` 8192. With millions of virtual threads, an 8 KB buffer each adds up, so the JDK starts small.",
            "**`StreamEncoder` starts at 512 bytes on every thread** (`sipush 512` in its constructor) and only grows when one `write` call is bigger than the buffer can hold. A `FileWriter` written to in small pieces never grows: on JDK 21 it made **4,688 `write()` system calls for 2.4 MB**, against **293 on JDK 17** for the same class file. Performance has the table.",
            "Since the virtual-thread rework (Java 19 onwards), `BufferedReader`, `BufferedInputStream` and friends use internal locks instead of `synchronized`, so a virtual thread blocked in file I/O doesn't pin its carrier. Each `read()` still takes a lock, which is part of why a per-byte loop over `BufferedInputStream` was 27 times slower than my own array loop.",
          ],
        },
      ],
    },
    {
      title: "Byte Streams and Character Streams",
      blocks: [
        {
          type: "paragraph",
          text: "A file contains bytes, never characters. Whether those bytes are text, and which text, depends on the charset used to write them. A byte stream hands me the bytes as they are; a character stream decodes them first.",
        },
        {
          type: "code",
          language: "java",
          title: "BytesVsChars.java",
          code: `import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

public class BytesVsChars {
    public static void main(String[] args) throws IOException {
        String name = "Zoë";
        byte[] utf8 = name.getBytes(StandardCharsets.UTF_8);
        System.out.println(name + ": " + name.length() + " chars, " + utf8.length + " bytes in UTF-8: "
                + HexFormat.ofDelimiter(" ").formatHex(utf8));

        try (OutputStream out = new FileOutputStream("name.txt")) {
            out.write(utf8);                              // bytes in, bytes out: no charset involved
        }

        try (InputStream in = new FileInputStream("name.txt")) {
            int b;
            StringBuilder seen = new StringBuilder("InputStream.read(): ");
            while ((b = in.read()) != -1) seen.append(b).append(' ');    // 0..255, one byte each
            System.out.println(seen);
        }

        try (Reader in = new FileReader("name.txt", StandardCharsets.UTF_8)) {
            int c;
            StringBuilder seen = new StringBuilder("Reader.read():      ");
            while ((c = in.read()) != -1) seen.append(c).append("='").append((char) c).append("' ");
            System.out.println(seen);                     // 0..65535, one char each
        }
    }
}`,
        },
        {
          type: "output",
          text: `Zoë: 3 chars, 4 bytes in UTF-8: 5a 6f c3 ab
InputStream.read(): 90 111 195 171 
Reader.read():      90='Z' 111='o' 235='ë' `,
        },
        {
          type: "list",
          items: [
            "**\"Zoë\" is 3 chars but 4 bytes** in UTF-8: `Z` and `o` are one byte each (ASCII), `ë` is two bytes, `C3 AB`.",
            "**The `InputStream` returned four values**, 0 to 255 each: it doesn't know or care that 195 and 171 belong together.",
            "**The `Reader` returned three**: its decoder combined `C3 AB` into one `char`, 235, which is U+00EB, `ë`.",
            "Use byte streams for anything that isn't text (images, PDFs, ZIPs, encrypted data, copying a file unchanged) and character streams for text. Reading an image through a `Reader` corrupts it, because byte sequences that aren't valid UTF-8 are replaced with U+FFFD.",
            "Java's `char` is a UTF-16 code unit, so characters outside the Basic Multilingual Plane (most emoji) are **two** `char`s, a surrogate pair. `Reader.read()` returns them one half at a time; `String.codePoints()` puts them back together.",
          ],
        },
      ],
    },
    {
      title: "Charsets and Mojibake",
      blocks: [
        {
          type: "paragraph",
          text: "A charset is the mapping between characters and bytes. Decoding with a different charset than the one used for encoding doesn't fail: it produces different characters. The result has a name, **mojibake** (Japanese for \"character transformation\").",
        },
        {
          type: "code",
          language: "java",
          title: "Mojibake.java",
          code: `import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class Mojibake {
    static String readWith(Path file, Charset cs) throws IOException {
        try (BufferedReader in = new BufferedReader(new InputStreamReader(new FileInputStream(file.toFile()), cs))) {
            return in.readLine();
        }
    }

    // Show invisible control characters (Latin-1 decodes 0x80..0x9F to them) as escapes
    static String visible(String s) {
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (Character.isISOControl(c)) sb.append(String.format("\\\\u%04X", (int) c));
            else sb.append(c);
        }
        return sb.toString();
    }

    public static void main(String[] args) throws IOException {
        Path file = Path.of("riders.txt");
        Files.writeString(file, "Zoë, অনিতা, ₹120\\n", StandardCharsets.UTF_8);
        System.out.println("bytes on disk: " + Files.size(file));

        System.out.println("UTF-8        : " + readWith(file, StandardCharsets.UTF_8));
        System.out.println("ISO-8859-1   : " + visible(readWith(file, StandardCharsets.ISO_8859_1)));
        System.out.println("windows-1252 : " + visible(readWith(file, Charset.forName("windows-1252"))));
        System.out.println("US-ASCII     : " + readWith(file, StandardCharsets.US_ASCII));

        // Decoding with the wrong charset is not always reversible
        String latin = readWith(file, StandardCharsets.ISO_8859_1);
        String repaired = new String(latin.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
        String ascii = readWith(file, StandardCharsets.US_ASCII);
        String lost = new String(ascii.getBytes(StandardCharsets.US_ASCII), StandardCharsets.UTF_8);
        System.out.println("from Latin-1 : " + repaired);
        System.out.println("from ASCII   : " + lost);

        System.out.println("default " + Charset.defaultCharset() + ", file.encoding=" + System.getProperty("file.encoding")
                + ", native.encoding=" + System.getProperty("native.encoding")
                + ", stdout.encoding=" + System.getProperty("stdout.encoding"));
    }
}`,
        },
        {
          type: "output",
          text: `bytes on disk: 30
UTF-8        : Zoë, অনিতা, ₹120
ISO-8859-1   : ZoÃ«, à¦\\u0085à¦¨à¦¿à¦¤à¦¾, â\\u0082¹120
windows-1252 : ZoÃ«, à¦…à¦¨à¦¿à¦¤à¦¾, â‚¹120
US-ASCII     : Zo��, ���������������, ���120
from Latin-1 : Zoë, অনিতা, ₹120
from ASCII   : Zo??, ???????????????, ???120
default UTF-8, file.encoding=UTF-8, native.encoding=UTF-8, stdout.encoding=UTF-8`,
        },
        {
          type: "list",
          items: [
            "**ISO-8859-1 (Latin-1) never fails**: it maps every byte 0 to 255 to the char with the same number. So `C3 AB` becomes two chars, `Ã«`, the classic sign of UTF-8 read as Latin-1. Bytes 0x80 to 0x9F become invisible control characters, which is why `visible()` prints them as `\\u0085` and `\\u0082`.",
            "**windows-1252** maps 0x80 to 0x9F to printable characters (`…`, `‚`, `€`), so the same bytes look slightly different: `à¦…` instead of `à¦\\u0085`. Seeing `â‚¹` in a report is a rupee sign that went through Windows.",
            "**US-ASCII** knows only 0 to 127. Every other byte becomes U+FFFD, the replacement character `�`. The decoder in a `Reader` replaces silently; it doesn't throw.",
            "**Latin-1 mojibake can be undone** because no information was lost: encode back to Latin-1 to get the original bytes, then decode as UTF-8. **ASCII mojibake can't**: once a byte became U+FFFD, the original value is gone, and encoding it back gives `?`. That one-way loss is the production bug at the end of this lesson.",
          ],
        },
        {
          type: "heading",
          text: "The default charset, before and after JEP 400",
        },
        {
          type: "paragraph",
          text: "Constructors without a charset (`new FileReader(file)`, `new FileWriter(file)`, `new Scanner(file)`, `String.getBytes()`) use `Charset.defaultCharset()`. Until Java 17 that came from the operating system's locale: UTF-8 on most Linux desktops and Macs, windows-1252 on many Windows machines, and **US-ASCII in a Docker container with no locale set**. JEP 400 (Java 18) fixed the default to UTF-8 everywhere. The old behaviour is still available with `-Dfile.encoding=COMPAT`:",
        },
        {
          type: "code",
          language: "bash",
          code: `LANG=C LC_ALL=C java -Dfile.encoding=COMPAT Mojibake | tail -1`,
        },
        {
          type: "output",
          text: `default US-ASCII, file.encoding=ANSI_X3.4-1968, native.encoding=ANSI_X3.4-1968, stdout.encoding=ANSI_X3.4-1968`,
        },
        {
          type: "list",
          items: [
            "`file.encoding` is the default for file contents. Since Java 18, it's `UTF-8` unless set to `COMPAT`; any other value is unsupported.",
            "`native.encoding` (Java 17+) reports what the OS locale says, whatever `file.encoding` is. `ANSI_X3.4-1968` is the formal name of ASCII, what the `C`/`POSIX` locale gives.",
            "`stdout.encoding` (Java 19+) is used by `System.out` and still follows the terminal. In a container with `LANG=C`, `System.out.println(\"Zoë\")` printed `Zo?` on JDK 21 in my test, even though files were read and written correctly. Logs that show `?` don't prove the data is broken; check the bytes.",
            "The default being UTF-8 now doesn't make naming the charset optional: a file produced by another system (a bank's settlement file, an old ERP export) may be windows-1252 or UTF-16, and the code has to say so.",
          ],
        },
      ],
    },
    {
      title: "flush, close and What a Missing close Costs",
      blocks: [
        {
          type: "paragraph",
          text: "Output classes buffer to save system calls, which means `write()` returning doesn't mean the data is in the file. `flush()` pushes buffered data down the stack and into the OS; `close()` flushes and then releases the file descriptor. Neither makes the data durable on disk if the machine loses power; that needs `fsync`, `FileChannel.force(true)` in the next lesson.",
        },
        {
          type: "code",
          language: "java",
          title: "LostTail.java",
          code: `import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class LostTail {
    static void export(String file, int rows, boolean close) throws IOException {
        BufferedWriter out = new BufferedWriter(new FileWriter(file, StandardCharsets.UTF_8));
        out.write("trip_id,zone,fare_paise\\n");
        for (int i = 0; i < rows; i++) {
            out.write("T" + (100000 + i) + ",SALT-LAKE," + (12000 + i) + "\\n");
        }
        if (close) out.close();          // flushes BufferedWriter, then the encoder, then closes the fd
    }

    public static void main(String[] args) throws IOException {
        export("closed.csv", 1000, true);
        export("unclosed.csv", 1000, false);
        export("tiny.csv", 10, false);
        for (String f : new String[] {"closed.csv", "unclosed.csv", "tiny.csv"}) {
            Path p = Path.of(f);
            System.out.printf("%-13s %6d bytes, %4d lines%n", f, Files.size(p), Files.readAllLines(p).size());
        }
        System.out.println("last line of unclosed.csv: " + Files.readAllLines(Path.of("unclosed.csv")).getLast());
    }
}`,
        },
        {
          type: "output",
          text: `closed.csv     24024 bytes, 1001 lines
unclosed.csv    8192 bytes,  342 lines
tiny.csv           0 bytes,    0 lines
last line of unclosed.csv: T100340,`,
        },
        {
          type: "list",
          items: [
            "**`unclosed.csv` got 8,192 of 24,024 bytes**, and its last line stops mid-row at `T100340,`. Without `close()` nothing flushes at JVM exit: the JDK doesn't run flush hooks for unreachable writers.",
            "**15,832 bytes were lost, more than one 8 KB buffer**, because there are two buffers. `strace -e trace=write` showed the closed file written as 8192, 8192 and 7640 bytes (the last at `close()`), and the unclosed one as a single 8192. When `BufferedWriter` passed its second full 8192 chars down, the `StreamEncoder` encoded them into its own now-full 8 KB buffer, and only writes that out when the *next* data arrives. So up to about 16 KB can sit in memory.",
            "**`tiny.csv` is 0 bytes**: 10 rows never filled the first buffer. A small job that \"works\" with `close()` forgotten produces empty files; a big one produces files that are almost right, which is worse.",
            "The fix is try-with-resources, from the try-with-resources lesson: `close()` runs on every path, including exceptions. The production section of that lesson was an export job that ran out of file descriptors; this is the other half of the same mistake.",
          ],
        },
        {
          type: "heading",
          text: "Leaked file descriptors",
        },
        {
          type: "code",
          language: "java",
          title: "UnclosedStreams.java",
          code: `import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class UnclosedStreams {
    static long openFds() throws IOException {                   // Linux only
        try (var fds = Files.list(Path.of("/proc/self/fd"))) {
            return fds.count();
        }
    }

    static int firstByte(String file) throws IOException {
        FileInputStream in = new FileInputStream(file);          // never closed
        return in.read();
    }

    public static void main(String[] args) throws IOException {
        long start = openFds();
        int i = 0;
        try {
            for (i = 0; i < 2000; i++) firstByte("trips-1mb.csv");
            System.out.println("2000 calls, " + (openFds() - start) + " descriptors still open");
            System.gc();
            try { Thread.sleep(200); } catch (InterruptedException e) { }
            System.out.println("after System.gc(): " + (openFds() - start) + " still open");
        } catch (IOException e) {
            System.out.println("call " + i + ": " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java UnclosedStreams
(ulimit -n 1024; java UnclosedStreams)`,
        },
        {
          type: "output",
          text: `2000 calls, 2000 descriptors still open
after System.gc(): 0 still open

call 1020: trips-1mb.csv (Too many open files)`,
        },
        {
          type: "paragraph",
          text: "Each unclosed `FileInputStream` keeps an OS file descriptor. `FileDescriptor` registers a `Cleaner`, so a GC that finds the streams unreachable closes them, which the `System.gc()` line shows. But nothing says when a GC will run: with a limit of 1,024 descriptors (a common default), the 1,021st open failed with `FileNotFoundException: ... (Too many open files)` first. The message names the file, not the cause, which sends people looking for a missing file.",
        },
        {
          type: "heading",
          text: "PrintWriter swallows errors",
        },
        {
          type: "code",
          language: "java",
          title: "SilentPrintWriter.java",
          code: `import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;

public class SilentPrintWriter {
    public static void main(String[] args) throws IOException {
        // /dev/full accepts open() and fails every write() with ENOSPC, like a full disk
        PrintWriter pw = new PrintWriter(new BufferedWriter(new FileWriter("/dev/full")));
        for (int i = 0; i < 5000; i++) pw.println("T" + i + ",SALT-LAKE,12000");
        pw.close();
        System.out.println("PrintWriter finished without an exception, checkError() = " + pw.checkError());

        try (BufferedWriter bw = new BufferedWriter(new FileWriter("/dev/full"))) {
            for (int i = 0; i < 5000; i++) bw.write("T" + i + ",SALT-LAKE,12000\\n");
        } catch (IOException e) {
            System.out.println("BufferedWriter threw " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `PrintWriter finished without an exception, checkError() = true
BufferedWriter threw java.io.IOException: No space left on device`,
        },
        {
          type: "paragraph",
          text: "`/dev/full` is a Linux device that fails every write with `ENOSPC`, the error a full disk gives. `PrintWriter` (and `PrintStream`, which is what `System.out` is) **never throw `IOException`** from `print`, `println`, `printf` or `close`: they catch it and set an internal flag that only `checkError()` reveals. 5,000 rows went nowhere without a sign. `BufferedWriter` threw `IOException: No space left on device`. If I use `PrintWriter` for its `printf`, I call `checkError()` before treating the file as written.",
        },
      ],
    },
    {
      title: "The Old java.io.File API",
      blocks: [
        {
          type: "paragraph",
          text: "`java.io.File` is a **path**, not an open file. It also has methods to create, delete, rename and inspect files, and they report failure by returning `false` (or `0`, or `null`) without saying why:",
        },
        {
          type: "code",
          language: "java",
          title: "FileQuirks.java",
          code: `import java.io.File;
import java.io.IOException;
import java.util.Arrays;

public class FileQuirks {
    public static void main(String[] args) throws IOException {
        File dir = new File("quirks");
        File missing = new File(dir, "nope.csv");

        // A File is just a path: creating one touches nothing on disk
        System.out.println("exists=" + missing.exists() + " path=" + missing.getPath() + " length=" + missing.length());

        System.out.println("delete missing      -> " + missing.delete());
        System.out.println("mkdir a/b/c         -> " + new File("quirks/a/b/c").mkdir());
        System.out.println("mkdirs a/b/c        -> " + new File("quirks/a/b/c").mkdirs());
        System.out.println("mkdirs again        -> " + new File("quirks/a/b/c").mkdirs());
        System.out.println("delete non-empty    -> " + new File("quirks/a").delete());
        System.out.println("renameTo into void  -> " + new File("quirks/a").renameTo(new File("no/such/dir/a")));
        System.out.println("createNewFile       -> " + new File(dir, "fares.csv").createNewFile());
        System.out.println("createNewFile again -> " + new File(dir, "fares.csv").createNewFile());
        System.out.println("list() of a file    -> " + Arrays.toString(new File(dir, "fares.csv").list()));
        System.out.println("list() of quirks    -> " + Arrays.toString(dir.list()));
        System.out.println("lastModified missing-> " + missing.lastModified());
        System.out.println("toPath              -> " + dir.toPath().resolve("fares.csv").toAbsolutePath().getFileName());
    }
}`,
        },
        {
          type: "output",
          text: `exists=false path=quirks/nope.csv length=0
delete missing      -> false
mkdir a/b/c         -> false
mkdirs a/b/c        -> true
mkdirs again        -> false
delete non-empty    -> false
renameTo into void  -> false
createNewFile       -> true
createNewFile again -> false
list() of a file    -> null
list() of quirks    -> [fares.csv, a]
lastModified missing-> 0
toPath              -> fares.csv`,
        },
        {
          type: "list",
          items: [
            "`delete()`, `mkdir()` and `renameTo()` return `false` for every kind of failure: missing file, non-empty directory, missing parent, no permission, different file system. Code that ignores the return value (most code) continues as if it worked.",
            "`length()` of a missing file is 0 and `lastModified()` is 0, indistinguishable from an empty file and the epoch.",
            "`list()` returns `null`, not an empty array, for something that isn't a directory, or on an I/O error. A `for` loop over it throws `NullPointerException`. The order of `list()` is whatever the file system returns; here `fares.csv` came before `a`.",
            "`mkdirs()` returns `false` if the directories already exist, so `if (!dir.mkdirs()) throw ...` fails on the second run.",
            "The next lesson's `Files` methods throw specific exceptions instead (`NoSuchFileException`, `DirectoryNotEmptyException`, `AccessDeniedException`), and `file.toPath()` converts in one call. I keep `File` only where an old API demands it.",
          ],
        },
      ],
    },
    {
      title: "Scanner, Data Streams and RandomAccessFile",
      blocks: [
        {
          type: "heading",
          text: "Scanner",
        },
        {
          type: "code",
          language: "java",
          title: "ScanTrips.java",
          code: `import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

public class ScanTrips {
    public static void main(String[] args) throws IOException {
        long total = 0;
        int count = 0;
        try (Scanner sc = new Scanner(new File("trips-1mb.csv"), StandardCharsets.UTF_8)) {
            sc.useDelimiter("[,\\\\n]");
            while (sc.hasNext()) {
                sc.next();                       // trip id
                sc.next();                       // zone
                total += sc.nextInt();           // fare in paise, parsed by a regex
                count++;
            }
        }
        System.out.println(count + " trips, " + total + " paise");

        try (Scanner sc = new Scanner("12000 twelve")) {
            System.out.println(sc.nextInt());
            sc.nextInt();
        } catch (java.util.InputMismatchException e) {
            System.out.println("InputMismatchException: " + e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `46093 trips, 1285617286 paise
12000
InputMismatchException: null`,
        },
        {
          type: "paragraph",
          text: "`Scanner` splits input into tokens with a regex delimiter and parses them (`nextInt`, `nextLong`, `nextLine`). It's convenient for small input and console programs, but every token goes through regex matching, and on the 10 MB file it was **15 times slower** than `BufferedReader` with `Integer.parseInt` (Performance). It also swallows `IOException`s (`ioException()` returns the last one), and its `InputMismatchException` here has a `null` message: it doesn't say which token failed. For files, I use `BufferedReader`.",
        },
        {
          type: "heading",
          text: "DataOutputStream, DataInputStream and RandomAccessFile",
        },
        {
          type: "code",
          language: "java",
          title: "FareRecords.java",
          code: `import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HexFormat;

public class FareRecords {
    static final int RECORD = 8 + 4 + 2;            // long tripId, int farePaise, short zoneCode

    public static void main(String[] args) throws IOException {
        try (DataOutputStream out = new DataOutputStream(
                new BufferedOutputStream(new FileOutputStream("fares.bin")))) {
            for (int i = 0; i < 5; i++) {
                out.writeLong(9_001_000L + i);
                out.writeInt(12_000 + i * 500);
                out.writeShort(i % 2);
            }
        }
        byte[] raw = Files.readAllBytes(Path.of("fares.bin"));
        System.out.println(raw.length + " bytes, first record: " + HexFormat.ofDelimiter(" ").formatHex(raw, 0, RECORD));

        try (DataInputStream in = new DataInputStream(new BufferedInputStream(new FileInputStream("fares.bin")))) {
            while (true) {
                long id = in.readLong();
                int fare = in.readInt();
                short zone = in.readShort();
                System.out.println(id + " " + fare + " zone " + zone);
            }
        } catch (EOFException end) {
            System.out.println("EOFException marks the end");
        }

        // Jump straight to record 3 and change its fare in place
        try (RandomAccessFile raf = new RandomAccessFile("fares.bin", "rw")) {
            raf.seek(3L * RECORD + 8);
            System.out.println("record 3 fare before: " + raf.readInt() + ", pointer now " + raf.getFilePointer());
            raf.seek(3L * RECORD + 8);
            raf.writeInt(99_999);
            raf.seek(3L * RECORD);
            System.out.println("record 3 after: " + raf.readLong() + " " + raf.readInt() + ", file length " + raf.length());
        }
    }
}`,
        },
        {
          type: "output",
          text: `70 bytes, first record: 00 00 00 00 00 89 58 28 00 00 2e e0 00 00
9001000 12000 zone 0
9001001 12500 zone 1
9001002 13000 zone 0
9001003 13500 zone 1
9001004 14000 zone 0
EOFException marks the end
record 3 fare before: 13500, pointer now 54
record 3 after: 9001003 99999, file length 70`,
        },
        {
          type: "list",
          items: [
            "`DataOutputStream` writes primitives in a fixed binary format: big-endian, `long` 8 bytes, `int` 4, `short` 2. The first record is `00 00 00 00 00 89 58 28` (9,001,000), `00 00 2e e0` (12,000), `00 00` (zone 0). The file is exactly 5 × 14 = 70 bytes; no separators, no text.",
            "`DataInputStream` must read the same types in the same order; there's no schema in the file. It signals the end with `EOFException`, so the loop ends in a `catch`.",
            "Fixed-size records make **`RandomAccessFile`** useful: record *n* starts at byte `n × 14`, so `seek` jumps straight there and `writeInt` changes four bytes in place without rewriting the file. Mode `\"r\"` is read-only, `\"rw\"` read-write; `\"rws\"`/`\"rwd\"` also sync every write to disk.",
            "This format is fragile (adding a field breaks every reader) and Java-specific in the details (`writeUTF` uses a modified UTF-8). For data shared between services I'd use CSV, JSON, Protocol Buffers or a database; for Java object graphs there's serialization, the next phase.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `try (BufferedReader in = new BufferedReader(new FileReader(\"trips-1mb.csv\", UTF_8))) { in.readLine(); }`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Open.** `new FileReader(name, UTF_8)` creates a `FileInputStream`, whose constructor calls native `open0`: an `openat(AT_FDCWD, \"trips-1mb.csv\", O_RDONLY)` system call. The kernel returns a file descriptor, say 4, stored in a `FileDescriptor` object with a `Cleaner` registered. If the file is missing, `open0` throws `FileNotFoundException` and nothing else is created.",
            "**Wrap.** `FileReader`'s `InputStreamReader` constructor creates a `StreamDecoder` with an 8192-byte `ByteBuffer` and a fresh UTF-8 `CharsetDecoder` (set to **replace** malformed input). `new BufferedReader(...)` allocates its `char[8192]`. Nothing has been read yet.",
            "**First `readLine()`.** The `char` buffer is empty, so `BufferedReader.fill()` asks the `StreamDecoder` for up to 8192 chars.",
            "**Decode.** The `StreamDecoder`'s byte buffer is empty too, so it calls `FileInputStream.read(byte[], 0, 8192)`, which calls native `readBytes`, which makes one `read(4, buf, 8192)` system call. The kernel copies 8192 bytes from the page cache (reading the disk first if needed).",
            "**Chars.** The `CharsetDecoder` turns those bytes into chars in `BufferedReader`'s array. A multi-byte character split across the 8192-byte boundary stays in the byte buffer until the next read completes it.",
            "**Scan.** `readLine()` scans the `char[]` for `\\n` or `\\r`, builds a `String` from the chars before it, and returns `T100000,SALT-LAKE,8000`. The next ~340 calls are served from the same array with no system call.",
            "**Close.** At the end of the `try`, `BufferedReader.close()` closes the `FileReader`, which closes the `StreamDecoder`, which closes the `FileInputStream`, which makes the `close(4)` system call and unregisters the `Cleaner`. For a writer, each `close()` flushes its own buffer into the layer below first, which is how the data in both buffers reaches the file.",
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
          code: `import java.io.*;
import java.nio.charset.StandardCharsets;

public class SyntaxTour {
    public static void main(String[] args) throws IOException {
        // 1. write text: always name the charset
        try (BufferedWriter out = new BufferedWriter(new FileWriter("zones.txt", StandardCharsets.UTF_8))) {
            out.write("SALT-LAKE");
            out.newLine();                                   // the platform line separator
            out.write("NEW-TOWN\\n");
        }

        // 2. append instead of truncate: the boolean is "append"
        try (FileWriter out = new FileWriter("zones.txt", StandardCharsets.UTF_8, true)) {
            out.write("GARIA\\n");
        }

        // 3. read text line by line
        try (BufferedReader in = new BufferedReader(new FileReader("zones.txt", StandardCharsets.UTF_8))) {
            String line;
            while ((line = in.readLine()) != null) System.out.print(line + " ");
            System.out.println();
        }

        // 4. a bridge from bytes to chars with an explicit charset
        try (Reader in = new InputStreamReader(new FileInputStream("zones.txt"), StandardCharsets.UTF_8)) {
            char[] buf = new char[4];
            int n = in.read(buf);
            System.out.println("first " + n + " chars: " + new String(buf, 0, n));
        }

        // 5. formatted text with PrintWriter (check for errors yourself)
        try (PrintWriter pw = new PrintWriter(new BufferedWriter(new FileWriter("fare.txt", StandardCharsets.UTF_8)))) {
            pw.printf("%s,%d%n", "SALT-LAKE", 18500);
            if (pw.checkError()) throw new IOException("write failed");
        }

        // 6. raw bytes: copy a file through an 8 KB buffer, or let transferTo do it
        try (InputStream in = new BufferedInputStream(new FileInputStream("zones.txt"));
             OutputStream out = new BufferedOutputStream(new FileOutputStream("zones-copy.txt"))) {
            long copied = in.transferTo(out);
            System.out.println("copied " + copied + " bytes");
        }

        // 7. the old File API: metadata and booleans
        File f = new File("zones-copy.txt");
        System.out.println(f.getName() + " exists=" + f.exists() + " length=" + f.length()
                + " deleted=" + f.delete() + " deleted again=" + f.delete());
    }
}`,
        },
        {
          type: "output",
          text: `SALT-LAKE NEW-TOWN GARIA 
first 4 chars: SALT
copied 25 bytes
zones-copy.txt exists=true length=25 deleted=true deleted again=false`,
        },
        {
          type: "paragraph",
          text: "The `true` in `new FileWriter(name, charset, true)` is \"append\"; without it, opening a writer **truncates** the file to zero bytes immediately, before anything is written. `newLine()` writes the platform separator (`\\n` on Linux, `\\r\\n` on Windows); for files read by other systems I write `\\n` explicitly. `transferTo` (Java 9) copies a whole stream in one call.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Totals per zone from a CSV, with bad rows reported",
        },
        {
          type: "code",
          language: "java",
          title: "ZoneTotals.java",
          code: `import java.io.BufferedWriter;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.LineNumberReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.TreeMap;

public class ZoneTotals {
    public static void main(String[] args) throws IOException {
        try (BufferedWriter out = new BufferedWriter(new FileWriter("trips.csv", StandardCharsets.UTF_8))) {
            out.write("""
                trip_id,zone,fare_paise
                T1,SALT-LAKE,18500
                T2,NEW-TOWN,22000
                T3,SALT-LAKE,abc
                T4,GARIA,9000

                T5,NEW-TOWN,15500
                """);
        }

        Map<String, Long> totals = new TreeMap<>();
        try (LineNumberReader in = new LineNumberReader(new FileReader("trips.csv", StandardCharsets.UTF_8))) {
            String header = in.readLine();
            if (!"trip_id,zone,fare_paise".equals(header)) throw new IOException("unexpected header: " + header);
            String line;
            while ((line = in.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] f = line.split(",");
                try {
                    totals.merge(f[1], Long.parseLong(f[2]), Long::sum);
                } catch (NumberFormatException | ArrayIndexOutOfBoundsException e) {
                    System.out.println("skipping line " + in.getLineNumber() + ": " + line);
                }
            }
        }
        totals.forEach((zone, paise) -> System.out.printf("%-10s %,8d paise%n", zone, paise));
    }
}`,
        },
        {
          type: "output",
          text: `skipping line 4: T3,SALT-LAKE,abc
GARIA         9,000 paise
NEW-TOWN     37,500 paise
SALT-LAKE    18,500 paise`,
        },
        {
          type: "paragraph",
          text: "`LineNumberReader` is a `BufferedReader` that counts lines, so an error message can say \"line 4\" instead of making someone search the file. The header is checked rather than skipped blindly: if the column order changes upstream, I want an exception, not totals summed from the wrong column. Blank lines are skipped, bad rows are reported and skipped, and money stays in `long` paise. Splitting on `,` is fine for this file; a CSV with quoted fields (`\"Roy, Asha\"`) needs a real CSV parser.",
        },
        {
          type: "heading",
          text: "Example 2: A spreadsheet CSV whose header doesn't match",
        },
        {
          type: "code",
          language: "java",
          title: "BomHeader.java",
          code: `import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class BomHeader {
    static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    // Skip a UTF-8 byte order mark if the stream starts with one
    static InputStream skipBom(InputStream raw) throws IOException {
        BufferedInputStream in = new BufferedInputStream(raw);
        in.mark(3);
        byte[] first = in.readNBytes(3);
        if (!Arrays.equals(first, UTF8_BOM)) in.reset();
        return in;
    }

    public static void main(String[] args) throws IOException {
        // Spreadsheet tools often save "CSV UTF-8" with a BOM in front
        try (OutputStream out = new FileOutputStream("payouts.csv")) {
            out.write(UTF8_BOM);
            out.write("driver_id,amount_paise\\nD7,250000\\n".getBytes(StandardCharsets.UTF_8));
        }

        try (BufferedReader in = new BufferedReader(
                new InputStreamReader(new FileInputStream("payouts.csv"), StandardCharsets.UTF_8))) {
            String header = in.readLine();
            System.out.println("plain:    \\"" + header.replace("\\uFEFF", "<BOM>") + "\\" length " + header.length()
                    + ", first char U+" + Integer.toHexString(header.charAt(0)).toUpperCase()
                    + ", equals driver_id,...? " + header.equals("driver_id,amount_paise"));
        }

        try (BufferedReader in = new BufferedReader(
                new InputStreamReader(skipBom(new FileInputStream("payouts.csv")), StandardCharsets.UTF_8))) {
            String header = in.readLine();
            System.out.println("skip BOM: \\"" + header + "\\" length " + header.length()
                    + ", equals driver_id,...? " + header.equals("driver_id,amount_paise"));
        }
    }
}`,
        },
        {
          type: "output",
          text: `plain:    "<BOM>driver_id,amount_paise" length 23, first char U+FEFF, equals driver_id,...? false
skip BOM: "driver_id,amount_paise" length 22, equals driver_id,...? true`,
        },
        {
          type: "paragraph",
          text: "Spreadsheet tools often save \"CSV UTF-8\" with a **byte order mark**, the bytes `EF BB BF` (U+FEFF) at the start. Java's UTF-8 decoder keeps it as a character, so the header is 23 chars, the first one invisible, and `header.equals(\"driver_id,amount_paise\")` is `false`. When printed, the header looks perfect, which makes this a frustrating bug. `skipBom` uses `mark`/`reset` on a `BufferedInputStream` to peek at three bytes and push them back if they aren't a BOM.",
        },
        {
          type: "heading",
          text: "Example 3: The last lines of a large log, without reading all of it",
        },
        {
          type: "code",
          language: "java",
          title: "TailLog.java",
          code: `import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;

public class TailLog {
    // Read the last n lines by walking backwards from the end, without reading the whole file
    static Deque<String> tail(String file, int n) throws IOException {
        Deque<String> lines = new ArrayDeque<>();
        try (RandomAccessFile raf = new RandomAccessFile(file, "r")) {
            long pos = raf.length() - 1;
            ByteArrayOutputStream current = new ByteArrayOutputStream();
            int reads = 0;
            byte[] block = new byte[4096];
            while (pos >= 0 && lines.size() < n) {
                int len = (int) Math.min(block.length, pos + 1);
                raf.seek(pos - len + 1);
                raf.readFully(block, 0, len);
                reads++;
                for (int i = len - 1; i >= 0 && lines.size() < n; i--) {
                    if (block[i] == '\\n' && current.size() > 0) {
                        lines.addFirst(reversedUtf8(current));
                        current.reset();
                    } else if (block[i] != '\\n') {
                        current.write(block[i]);
                    }
                }
                pos -= len;
            }
            if (pos < 0 && current.size() > 0 && lines.size() < n) lines.addFirst(reversedUtf8(current));
            System.out.println("file " + raf.length() + " bytes, read " + reads + " block(s) of 4096");
        }
        return lines;
    }

    static String reversedUtf8(ByteArrayOutputStream reversed) {
        byte[] b = reversed.toByteArray();
        for (int i = 0, j = b.length - 1; i < j; i++, j--) { byte t = b[i]; b[i] = b[j]; b[j] = t; }
        return new String(b, StandardCharsets.UTF_8);       // decode only after the bytes are in order
    }

    public static void main(String[] args) throws IOException {
        try (BufferedWriter out = new BufferedWriter(new FileWriter("dispatch.log", StandardCharsets.UTF_8))) {
            for (int i = 1; i <= 200_000; i++) {
                out.write("2026-11-13T09:" + (i % 60) + " trip T" + i + " assigned to " + (i % 3 == 0 ? "Zoë" : "Ravi") + "\\n");
            }
        }
        tail("dispatch.log", 3).forEach(System.out::println);
    }
}`,
        },
        {
          type: "output",
          text: `file 9255556 bytes, read 1 block(s) of 4096
2026-11-13T09:18 trip T199998 assigned to Zoë
2026-11-13T09:19 trip T199999 assigned to Ravi
2026-11-13T09:20 trip T200000 assigned to Ravi`,
        },
        {
          type: "paragraph",
          text: "A `BufferedReader` would read 9 MB to find the last three lines. `RandomAccessFile` seeks to the end and reads 4 KB blocks backwards: here one block was enough. The bytes are collected in reverse and **decoded only after they're back in order**, because decoding UTF-8 a byte at a time would break `ë` (two bytes) into two replacement characters. That's the general rule for binary access to text: find boundaries in bytes, decode whole lines.",
        },
      ],
    },
    {
      title: "When to Use Which java.io Class",
      blocks: [
        {
          type: "table",
          headers: ["Situation", "Use", "Why"],
          rows: [
            ["Read a text file line by line", "`BufferedReader` over `FileReader(file, UTF_8)` (or `Files.newBufferedReader`)", "8 KB buffer, `readLine`, explicit charset"],
            ["Write a text file", "`BufferedWriter` over `FileWriter(file, UTF_8)`", "293 `write()` calls for 2.4 MB, against 4,688 without it on JDK 21"],
            ["Formatted text output", "`PrintWriter` over a `BufferedWriter`, plus `checkError()`", "`printf`, but errors are silent"],
            ["Copy or checksum a file, images, PDFs", "`InputStream`/`OutputStream` with a `byte[]` or `transferTo`", "No decoding, no corruption"],
            ["Text from a socket or process", "`InputStreamReader(in, charset)`", "The bridge class for any byte source"],
            ["Fixed-size binary records, in-place updates", "`RandomAccessFile`", "`seek` to any offset"],
            ["Primitives in Java's binary format", "`DataOutputStream`/`DataInputStream`", "Simple, but no schema and Java-specific"],
            ["Small console input", "`Scanner`", "Easy parsing; slow and swallows I/O errors"],
            ["New code that works with files by path", "`java.nio.file.Files` (next lesson)", "Exceptions instead of booleans, strict decoding, atomic moves"],
          ],
        },
        {
          type: "paragraph",
          text: "My rule: bytes for data that isn't text, a buffered reader or writer with a named charset for text, and `Files` for anything that creates, deletes, moves or inspects files.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Relying on the default charset",
        },
        {
          type: "paragraph",
          text: "`new FileReader(file)` and `new FileWriter(file)` without a charset were platform-dependent until Java 17, and still are with `-Dfile.encoding=COMPAT`. Even on Java 21, the file may come from a system that doesn't use UTF-8. Always pass `StandardCharsets.UTF_8` (or the format's real charset).",
        },
        {
          type: "heading",
          text: "Forgetting close(), or closing only on the happy path",
        },
        {
          type: "paragraph",
          text: "A writer that isn't closed loses its buffered tail (15,832 bytes in `LostTail`), and any stream that isn't closed holds a file descriptor until a GC happens to run. Use try-with-resources for every stream, reader, writer and `RandomAccessFile`.",
        },
        {
          type: "heading",
          text: "Not handling the checked IOException",
        },
        {
          type: "code",
          language: "java",
          title: "CheckedOpen.java",
          code: `import java.io.BufferedReader;
import java.io.FileReader;

public class CheckedOpen {
    static String firstLine(String file) {
        try (BufferedReader in = new BufferedReader(new FileReader(file))) {
            return in.readLine();
        }
    }
}`,
        },
        {
          type: "output",
          text: `CheckedOpen.java:6: error: unreported exception FileNotFoundException; must be caught or declared to be thrown
        try (BufferedReader in = new BufferedReader(new FileReader(file))) {
                                                    ^
CheckedOpen.java:6: error: unreported exception IOException; must be caught or declared to be thrown
        try (BufferedReader in = new BufferedReader(new FileReader(file))) {
                            ^
  exception thrown from implicit call to close() on resource variable 'in'
CheckedOpen.java:7: error: unreported exception IOException; must be caught or declared to be thrown
            return in.readLine();
                              ^
3 errors`,
        },
        {
          type: "paragraph",
          text: "Three errors from one small method: the constructor, the implicit `close()` that try-with-resources generates, and `readLine()`. The fix is `throws IOException` on the method, or a `catch` that does something useful. Catching and printing a stack trace, then returning `null`, turns a clear I/O error into a `NullPointerException` somewhere else.",
        },
        {
          type: "heading",
          text: "Reading or writing one byte at a time without a buffer",
        },
        {
          type: "paragraph",
          text: "`FileInputStream.read()` and `FileOutputStream.write(int)` are one system call each: 1,048,601 calls to read 1 MB, and 2.26 seconds to write 2.4 MB byte by byte. Wrap them in `BufferedInputStream`/`BufferedOutputStream` or use arrays.",
        },
        {
          type: "heading",
          text: "Assuming read(byte[]) fills the array",
        },
        {
          type: "paragraph",
          text: "`read(buf)` returns how many bytes it read, which can be fewer than `buf.length` before the end of the file (always with sockets and pipes, sometimes with files). Use the returned count, as `chunked` does, or `readNBytes`/`readFully` when an exact amount is needed.",
        },
        {
          type: "heading",
          text: "Ignoring File's boolean results",
        },
        {
          type: "paragraph",
          text: "`file.delete();` on its own line silently does nothing when the file is missing, open, or in a read-only directory. Use `Files.delete(path)`, which throws an exception that says why.",
        },
        {
          type: "heading",
          text: "Using PrintWriter without checkError()",
        },
        {
          type: "paragraph",
          text: "A full disk, a closed pipe or a network mount that went away are all invisible through `PrintWriter`. Either call `checkError()` before considering the output complete, or use a `BufferedWriter`.",
        },
        {
          type: "heading",
          text: "Reading binary data through a Reader",
        },
        {
          type: "paragraph",
          text: "Copying a PDF with `FileReader`/`FileWriter` replaces every invalid UTF-8 sequence with U+FFFD and writes it back as `EF BF BD`. The copy has a different size and won't open. Binary data goes through streams.",
        },
        {
          type: "heading",
          text: "Truncating a file by opening it for writing",
        },
        {
          type: "paragraph",
          text: "`new FileWriter(file)` and `new FileOutputStream(file)` empty the file the moment they're constructed. Opening a log or a ledger without `append = true` erases it, even if nothing is written afterwards.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Name the charset on every reader, writer, `Scanner`, `getBytes` and `new String(bytes, ...)`; use `StandardCharsets` constants.",
            "Open every stream in try-with-resources, one resource per layer when a wrapper's constructor can throw (the try-with-resources lesson's `WrapperLeak`).",
            "Buffer everything: `BufferedReader`/`BufferedWriter` for text, `BufferedInputStream`/`BufferedOutputStream` or `byte[]` chunks for bytes. On Java 21, put a `BufferedWriter` on top of `FileWriter` even though `FileWriter` has an encoder buffer.",
            "Use streams for bytes, readers and writers for text, and never cross them without a deliberate charset.",
            "Call `checkError()` on `PrintWriter`/`PrintStream` output that matters, or don't use them for files.",
            "Prefer `java.nio.file.Files` over `java.io.File` for creating, deleting, moving and inspecting files; convert with `file.toPath()`.",
            "Validate structure as you read (headers, field counts, number formats) and report the line number.",
            "Detect and strip a UTF-8 BOM when reading files that come from spreadsheets.",
            "Remember that `close()` puts data in the OS, not on the disk. For data that must survive a crash, `fsync` (`FileChannel.force`, next lesson).",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "All numbers are best of 5 on one machine (Linux, JDK 21, files in the page cache, so no disk reads), from simple `System.nanoTime()` loops, not JMH. They show orders of magnitude, not exact costs.",
        },
        {
          type: "heading",
          text: "Reading a 10 MB file",
        },
        {
          type: "code",
          language: "bash",
          code: `java ReadSpeed trips-10mb.csv`,
        },
        {
          type: "output",
          text: `unbuffered     460,914 lines   7,591.4 ms
buffered       460,914 lines     158.2 ms
chunked        460,914 lines       5.9 ms
readerChars    460,914 lines     398.1 ms
readLines      460,914 lines      22.2 ms`,
        },
        {
          type: "list",
          items: [
            "**Unbuffered byte-by-byte: 7.6 seconds**, about 0.7 µs per byte, almost all of it system-call overhead.",
            "**`BufferedInputStream`, still byte by byte: 158 ms.** System calls were down to 130 per MB, but each `read()` is a method call that takes an internal lock, checks the stream is open and reads a `volatile` buffer field: 10 million times.",
            "**My own `byte[8192]` loop: 5.9 ms**, 27 times faster than `BufferedInputStream.read()`, with the same system calls. The loop over an array is something the JIT compiles into tight, unrolled machine code.",
            "**`FileReader.read()` per char: 398 ms.** Buffered at the byte level, but every char goes through a lock and the decoder one at a time.",
            "**`BufferedReader.readLine()`: 22 ms**, while also decoding UTF-8 and creating 460,914 `String`s. For text, it's the default choice.",
          ],
        },
        {
          type: "heading",
          text: "Writing 2.4 MB",
        },
        {
          type: "code",
          language: "java",
          title: "WriteSpeed.java",
          code: `import java.io.BufferedOutputStream;
import java.io.BufferedWriter;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.OutputStream;
import java.io.Writer;
import java.nio.charset.StandardCharsets;

public class WriteSpeed {
    static final int ROWS = 100_000;
    static final String ROW = "T100000,SALT-LAKE,12000\\n";        // 24 bytes, 2.4 MB in total

    static void bytesUnbuffered(String f) throws IOException {
        try (OutputStream out = new FileOutputStream(f)) {
            for (int i = 0; i < ROWS; i++) for (int j = 0; j < ROW.length(); j++) out.write(ROW.charAt(j));
        }
    }

    static void bytesBuffered(String f) throws IOException {
        try (OutputStream out = new BufferedOutputStream(new FileOutputStream(f))) {
            for (int i = 0; i < ROWS; i++) for (int j = 0; j < ROW.length(); j++) out.write(ROW.charAt(j));
        }
    }

    static void fileWriterChars(String f) throws IOException {
        try (Writer out = new FileWriter(f, StandardCharsets.UTF_8)) {
            for (int i = 0; i < ROWS; i++) for (int j = 0; j < ROW.length(); j++) out.write(ROW.charAt(j));
        }
    }

    static void fileWriterLines(String f) throws IOException {
        try (Writer out = new FileWriter(f, StandardCharsets.UTF_8)) {
            for (int i = 0; i < ROWS; i++) out.write(ROW);
        }
    }

    static void bufferedWriterLines(String f) throws IOException {
        try (Writer out = new BufferedWriter(new FileWriter(f, StandardCharsets.UTF_8))) {
            for (int i = 0; i < ROWS; i++) out.write(ROW);
        }
    }

    interface Writing { void run(String f) throws IOException; }

    public static void main(String[] args) throws IOException {
        String only = args.length > 0 ? args[0] : null;
        String[] names = {"bytesUnbuffered", "bytesBuffered", "fileWriterChars", "fileWriterLines", "bufferedWriterLines"};
        Writing[] ways = {WriteSpeed::bytesUnbuffered, WriteSpeed::bytesBuffered, WriteSpeed::fileWriterChars,
                          WriteSpeed::fileWriterLines, WriteSpeed::bufferedWriterLines};
        for (int k = 0; k < ways.length; k++) {
            if (only != null && !only.equals(names[k])) continue;
            long best = Long.MAX_VALUE;
            for (int run = 0; run < (only == null ? 5 : 1); run++) {
                long t0 = System.nanoTime();
                ways[k].run("out-" + names[k] + ".csv");
                best = Math.min(best, System.nanoTime() - t0);
            }
            System.out.printf("%-20s %,9.1f ms%n", names[k], best / 1e6);
        }
    }
}`,
        },
        {
          type: "output",
          text: `bytesUnbuffered        2,261.3 ms
bytesBuffered             38.0 ms
fileWriterChars           94.4 ms
fileWriterLines           10.5 ms
bufferedWriterLines        5.0 ms`,
        },
        {
          type: "table",
          headers: ["Method", "Time (JDK 21)", "write() system calls (strace -c -P)"],
          rows: [
            ["`FileOutputStream.write(int)` per byte", "2,261 ms", "2,400,000"],
            ["`BufferedOutputStream.write(int)` per byte", "38 ms", "293"],
            ["`FileWriter.write(int)` per char", "94 ms", "4,688"],
            ["`FileWriter.write(String)` per row", "10.5 ms", "4,688"],
            ["`BufferedWriter` over `FileWriter`, per row", "5.0 ms", "293"],
            ["`FileWriter.write(String)` per row, **JDK 17**", "-", "293"],
          ],
        },
        {
          type: "list",
          items: [
            "**The surprise: `FileWriter` alone made 4,688 system calls**, 2,400,000 / 512. On JDK 17 the same class file made 293 (2,400,000 / 8,192). The JDK 21 `StreamEncoder` starts with a 512-byte buffer and grows only when a single write needs more room; a 24-char row needs at most 72 bytes, so it never grows. With a `BufferedWriter` on top, the encoder receives 8192 chars at a time, grows to 8192 bytes once, and the count is back to 293.",
            "So `BufferedWriter` was twice as fast as bare `FileWriter` here, and 16 times fewer system calls. On a network file system, where each `write()` may be a round trip, that difference grows.",
            "Unbuffered `FileOutputStream.write(int)` is the write-side twin of the slow read: one system call per byte.",
          ],
        },
        {
          type: "heading",
          text: "Parsing: Scanner against BufferedReader",
        },
        {
          type: "code",
          language: "java",
          title: "ParseSpeed.java",
          code: `import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

public class ParseSpeed {
    static long scanner(String file) throws IOException {
        long total = 0;
        try (Scanner sc = new Scanner(new File(file), StandardCharsets.UTF_8)) {
            sc.useDelimiter("[,\\\\n]");
            while (sc.hasNext()) { sc.next(); sc.next(); total += sc.nextInt(); }
        }
        return total;
    }

    static long bufferedReader(String file) throws IOException {
        long total = 0;
        try (BufferedReader in = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            String line;
            while ((line = in.readLine()) != null) total += Integer.parseInt(line, line.lastIndexOf(',') + 1, line.length(), 10);
        }
        return total;
    }

    public static void main(String[] args) throws IOException {
        for (int round = 0; round < 2; round++) {
            long bestS = Long.MAX_VALUE, bestB = Long.MAX_VALUE, s = 0, b = 0;
            for (int run = 0; run < 5; run++) {
                long t0 = System.nanoTime(); s = scanner(args[0]); bestS = Math.min(bestS, System.nanoTime() - t0);
                t0 = System.nanoTime(); b = bufferedReader(args[0]); bestB = Math.min(bestB, System.nanoTime() - t0);
            }
            if (round == 1) System.out.printf("Scanner        %,6.0f ms (total %d)%nBufferedReader %,6.0f ms (total %d)%n", bestS / 1e6, s, bestB / 1e6, b);
        }
    }
}`,
        },
        {
          type: "output",
          text: `Scanner           424 ms (total 12900519917)
BufferedReader     28 ms (total 12900519917)`,
        },
        {
          type: "paragraph",
          text: "Same file, same total, 15 times apart. `Scanner` runs regex matching for every token and every `hasNext`; `readLine` plus `Integer.parseInt(line, from, to, 10)` (Java 9, parses part of a string without a `substring`) does the minimum. The output also shows why fares are `long`: the total, 12,900,519,917 paise, doesn't fit in an `int`.",
        },
      ],
    },
    {
      title: "File I/O in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing company generates monthly ride receipts. The CRM exports riders to a UTF-8 CSV, and a small Java 17 job reads it and writes a receipts file that is mailed and also loaded back into the receipts database. It worked on every developer's laptop. In production, riders named Zoë Fernandes and অনিতা দাস (Anita Das, in Bengali) received receipts addressed to `Zo?? Fernandes` and `??????????????? ?????????`, and the database now held the question marks. The CRM data was correct. The job's container image had no locale configured.",
        },
        {
          type: "paragraph",
          text: "I rebuilt it with JDK 17 and JDK 21 side by side. `LANG=C LC_ALL=C` reproduces a container with no locale. To keep the terminal's own encoding from hiding anything, the program prints non-ASCII characters as `\\uXXXX` escapes and compares each name with the CRM's.",
        },
        {
          type: "code",
          language: "java",
          title: "RiderReceipts.java",
          code: `import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class RiderReceipts {
    // What shipped: no charset anywhere, so both sides use the JVM default
    static void buggy(Path riders, Path receipts) throws IOException {
        try (BufferedReader in = new BufferedReader(new FileReader(riders.toFile()));
             BufferedWriter out = new BufferedWriter(new FileWriter(receipts.toFile()))) {
            String line;
            while ((line = in.readLine()) != null) {
                String[] f = line.split(",");
                out.write(f[0] + ",Receipt for " + f[1] + ",18500\\n");
            }
        }
    }

    // The fix: the file format says UTF-8, so the code says UTF-8
    static void fixed(Path riders, Path receipts) throws IOException {
        try (BufferedReader in = Files.newBufferedReader(riders, StandardCharsets.UTF_8);
             BufferedWriter out = Files.newBufferedWriter(receipts, StandardCharsets.UTF_8)) {
            String line;
            while ((line = in.readLine()) != null) {
                String[] f = line.split(",");
                out.write(f[0] + ",Receipt for " + f[1] + ",18500\\n");
            }
        }
    }

    // Print non-ASCII chars as escapes so the terminal can't hide anything
    static String ascii(String s) {
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) sb.append(c < 128 ? String.valueOf(c) : String.format("\\\\u%04X", (int) c));
        return sb.toString();
    }

    public static void main(String[] args) throws IOException {
        Path riders = Path.of("riders.csv"), receipts = Path.of("receipts.csv");
        // The CRM export is UTF-8, always
        Files.write(riders, List.of("R1,Asha Roy", "R2,Zoë Fernandes", "R3,অনিতা দাস"), StandardCharsets.UTF_8);

        if (args[0].equals("buggy")) buggy(riders, receipts); else fixed(riders, receipts);

        System.out.println("java " + System.getProperty("java.version") + ", default charset " + Charset.defaultCharset());
        List<String> in = Files.readAllLines(riders, StandardCharsets.UTF_8);
        List<String> out = Files.readAllLines(receipts, StandardCharsets.UTF_8);
        for (int i = 0; i < in.size(); i++) {
            String expected = in.get(i).split(",")[1];
            String got = out.get(i).split(",")[1].substring("Receipt for ".length());
            System.out.printf("%-50s %s%n", ascii(got), got.equals(expected) ? "ok" : "CORRUPTED");
        }
        System.out.println("receipts.csv: " + Files.size(receipts) + " bytes");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 17 -d j17 RiderReceipts.java
LANG=C LC_ALL=C /usr/lib/jvm/java-17-openjdk-amd64/bin/java -cp j17 RiderReceipts buggy
LANG=C LC_ALL=C java -cp j17 RiderReceipts buggy                          # JDK 21
LANG=C LC_ALL=C java -Dfile.encoding=COMPAT -cp j17 RiderReceipts buggy   # JDK 21, old default`,
        },
        {
          type: "output",
          text: `java 17.0.21.0.3, default charset US-ASCII
Asha Roy                                           ok
Zo?? Fernandes                                     CORRUPTED
??????????????? ?????????                          CORRUPTED
receipts.csv: 113 bytes

java 21.0.13.0.3, default charset UTF-8
Asha Roy                                           ok
Zo\\u00EB Fernandes                                 ok
\\u0985\\u09A8\\u09BF\\u09A4\\u09BE \\u09A6\\u09BE\\u09B8  ok
receipts.csv: 113 bytes

java 21.0.13.0.3, default charset US-ASCII
Asha Roy                                           ok
Zo?? Fernandes                                     CORRUPTED
??????????????? ?????????                          CORRUPTED
receipts.csv: 113 bytes`,
        },
        {
          type: "paragraph",
          text: "After the fix, on JDK 17 in the same locale, and on JDK 21 with the old default forced:",
        },
        {
          type: "output",
          text: `java 17.0.21.0.3, default charset US-ASCII
Asha Roy                                           ok
Zo\\u00EB Fernandes                                 ok
\\u0985\\u09A8\\u09BF\\u09A4\\u09BE \\u09A6\\u09BE\\u09B8  ok
receipts.csv: 113 bytes

java 21.0.13.0.3, default charset US-ASCII
Asha Roy                                           ok
Zo\\u00EB Fernandes                                 ok
\\u0985\\u09A8\\u09BF\\u09A4\\u09BE \\u09A6\\u09BE\\u09B8  ok
receipts.csv: 113 bytes`,
        },
        {
          type: "list",
          items: [
            "**What happened.** With no locale, JDK 17's default charset was US-ASCII. `new FileReader(file)` decoded each non-ASCII byte as U+FFFD (two for `ë`, three for each Bengali letter), and `new FileWriter(file)` encoded each U+FFFD as `?`. The original bytes were gone after the first step; nothing downstream could recover them.",
            "**Why the file size didn't help.** `receipts.csv` is 113 bytes before and after the fix: each lost byte became exactly one `?`. A size or row-count check would have passed. Only comparing content caught it.",
            "**Why it worked on laptops.** Developer machines had `LANG=en_US.UTF-8`, so the default was UTF-8. The bug depended on the environment, not the code, which is exactly what JEP 400 set out to remove.",
            "**JDK 21 hides it, but doesn't fix the code.** The same buggy class on JDK 21 was correct by default and broke again with `-Dfile.encoding=COMPAT`, a flag teams add during migrations precisely to keep old behaviour. And the CRM file being UTF-8 is a fact about the CRM, so the code should say it.",
            "**The fix** names UTF-8 on both sides (`Files.newBufferedReader(path, UTF_8)`, `Files.newBufferedWriter(path, UTF_8)`), and it was correct on JDK 17 even with US-ASCII as the default. I also added a check to the job that fails if a decoded field contains U+FFFD, set `LANG=C.UTF-8` in the image, and repaired the damaged database rows from the CRM export, since the receipts file itself had nothing left to repair from.",
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
              question: "What is the difference between byte streams and character streams?",
              answer:
                "Byte streams (`InputStream`, `OutputStream` and subclasses) read and write raw 8-bit bytes and know nothing about text. Character streams (`Reader`, `Writer`) read and write 16-bit `char`s and convert to and from bytes with a charset. Use byte streams for binary data (images, PDFs, archives, copying files unchanged) and character streams for text. In my test, \"Zoë\" was 4 bytes through an `InputStream` and 3 chars through a `Reader`.",
            },
            {
              question: "What is the difference between FileReader and BufferedReader?",
              answer:
                "`FileReader` opens a file and decodes its bytes into chars; it's an `InputStreamReader` around a `FileInputStream`. `BufferedReader` wraps any `Reader` and adds an 8192-char buffer and `readLine()`. Usually they're combined: `new BufferedReader(new FileReader(file, UTF_8))`. On a 10 MB file, `readLine()` took 22 ms; reading the same `FileReader` one char at a time took 398 ms.",
            },
            {
              question: "Why should streams be closed, and what is the best way to do it?",
              answer:
                "A stream holds an OS file descriptor, which is limited per process, and an output stream may hold buffered data that only reaches the file when it's flushed. Not closing leaks descriptors (I hit \"Too many open files\" after 1,020 opens with a limit of 1,024) and loses data (an unclosed `BufferedWriter` wrote 8,192 of 24,024 bytes). The best way is try-with-resources, which closes on every path, in reverse order of opening.",
            },
            {
              question: "What is the difference between flush() and close()?",
              answer:
                "`flush()` pushes buffered data down through the wrapped streams to the OS and leaves the stream open. `close()` flushes and then releases the underlying resource; the stream can't be used afterwards. Neither guarantees the data is on the physical disk; that needs `fsync` (`FileChannel.force(true)`).",
            },
            {
              question: "How do you append to a file instead of overwriting it?",
              answer:
                "Pass `true` as the append flag: `new FileWriter(file, UTF_8, true)` or `new FileOutputStream(file, true)`. Without it, the constructor truncates the file to zero bytes as soon as it opens it, even if nothing is written. With `Files`, it's `StandardOpenOption.APPEND` (with `CREATE` if the file may not exist).",
            },
            {
              question: "Why does read() return an int instead of a byte?",
              answer:
                "So it can return every byte value 0 to 255 plus a separate end-of-stream marker, -1. If it returned a `byte`, `0xFF` would be -1 and indistinguishable from the end. `Reader.read()` returns 0 to 65535 or -1 for the same reason.",
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
              question: "Why is buffering faster? How much faster?",
              answer:
                "Because each unbuffered `read()` or `write(int)` is a system call, and switching into the kernel costs far more than copying a byte. A buffer turns thousands of small calls into one 8 KB call. With `strace` I counted 1,048,601 `read()` calls to read a 1 MB file byte by byte and 130 with any 8 KB buffer. On a 10 MB file, unbuffered took 7.6 seconds and `BufferedReader.readLine()` 22 ms. Writing 2.4 MB byte by byte took 2.26 seconds unbuffered and 38 ms through `BufferedOutputStream`.",
            },
            {
              question: "What is the decorator pattern, and how does java.io use it?",
              answer:
                "A decorator wraps an object of the same type and adds behaviour while forwarding the rest. In java.io, `BufferedInputStream` extends `FilterInputStream`, which holds another `InputStream`; `DataInputStream` and `PrintStream` work the same way, and readers and writers wrap readers and writers. So `new DataInputStream(new BufferedInputStream(new FileInputStream(f)))` combines file access, buffering and binary decoding without a class for every combination. The cost is many small classes and constructors that must be stacked in the right order.",
            },
            {
              question: "What is InputStreamReader for?",
              answer:
                "It's the bridge from bytes to characters: it wraps any `InputStream` (file, socket, process output, HTTP body) and decodes it with a charset. Internally it holds a `sun.nio.cs.StreamDecoder` with an 8 KB byte buffer and a `CharsetDecoder`. `FileReader` is just an `InputStreamReader` over a `FileInputStream`. `OutputStreamWriter` is the reverse, with a `StreamEncoder`.",
            },
            {
              question: "What is the default charset in Java, and why does it matter?",
              answer:
                "Since Java 18 (JEP 400) it's UTF-8 on every platform, unless `-Dfile.encoding=COMPAT` restores the old behaviour. Before that it came from the OS locale: windows-1252 on many Windows machines and US-ASCII in containers with no locale. Code that relied on it behaved differently per machine; my receipts example turned \"Zoë\" into \"Zo??\" on JDK 17 with `LANG=C`. `System.out` still uses `stdout.encoding`, which follows the terminal. The safe answer is to always pass a charset.",
            },
            {
              question: "What does PrintWriter do when a write fails?",
              answer:
                "Nothing visible: `print`, `println`, `printf` and `close` catch the `IOException` and set an error flag, which only `checkError()` reports. Writing 5,000 rows to `/dev/full` (always \"No space left on device\") completed without an exception, and `checkError()` returned `true`. `BufferedWriter` threw the `IOException`. `System.out` is a `PrintStream` and behaves the same way.",
            },
            {
              question: "What are the problems with java.io.File?",
              answer:
                "It reports failures as `false`, `0` or `null` without a reason: `delete()` is `false` for a missing file and a non-empty directory alike, `length()` of a missing file is 0, `list()` returns `null` for a non-directory, and `renameTo` fails silently across file systems. It also has weak support for symbolic links, attributes and permissions. `java.nio.file.Files` throws specific exceptions (`NoSuchFileException`, `DirectoryNotEmptyException`, `AccessDeniedException`) and covers all of that.",
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
              question: "FileReader.read() is called once per character with no BufferedReader. Is that one system call per character?",
              answer:
                "No. `FileReader`'s `StreamDecoder` reads bytes in 8192-byte chunks, so `strace` showed 130 `read()` calls for a 1 MB file, the same as `BufferedReader`. It's still slow (398 ms for 10 MB against 22 ms for `readLine`) because every `read()` is a method call through a lock and a decoder step for one character. `FileInputStream.read()`, on the other hand, really is one system call per byte: it calls the native `read0()` directly.",
            },
            {
              question: "How much data can be lost if a BufferedWriter over a FileWriter is never closed?",
              answer:
                "More than one buffer: up to about 16 KB. `BufferedWriter` holds up to 8192 chars, and the `StreamEncoder` inside `FileWriter` holds up to 8192 encoded bytes, which it only writes out when more data arrives. In my test, 24,024 bytes were written and 8,192 reached the file; `strace` showed one `write` of 8192, against 8192, 8192 and 7640 when closed. A small file can lose everything: 10 rows gave a 0-byte file.",
            },
            {
              question: "What changed in java.io buffering in Java 21, and why?",
              answer:
                "For virtual threads. `BufferedWriter` and `BufferedOutputStream` start with 512-byte buffers on a virtual thread (8192 on a platform thread) and grow to 8192 as needed, so a million virtual threads don't each hold 8 KB. `StreamEncoder` starts at 512 bytes on every thread and grows only when one write needs it. The side effect I measured: a bare `FileWriter` writing short rows made 4,688 `write()` calls for 2.4 MB on JDK 21 against 293 on JDK 17, fixed by adding a `BufferedWriter`. The java.io classes also moved from `synchronized` to internal locks, so blocking I/O doesn't pin a virtual thread's carrier.",
            },
            {
              question: "Why can mojibake from ISO-8859-1 be repaired, but not from US-ASCII?",
              answer:
                "ISO-8859-1 maps all 256 byte values to chars one-to-one, so decoding loses nothing: encode back to ISO-8859-1 to get the original bytes, then decode correctly. US-ASCII only defines 0 to 127, and a `Reader`'s decoder replaces every other byte with U+FFFD, discarding its value. In my test, the Latin-1 version round-tripped to \"Zoë, অনিতা, ₹120\" and the ASCII version became \"Zo??, ???????????????, ???120\".",
            },
            {
              question: "What happens to an unclosed FileInputStream eventually?",
              answer:
                "Its `FileDescriptor` has a `Cleaner` registered (finalizers were removed from these classes), so when a GC finds the stream unreachable, the Cleaner closes the descriptor. I saw 2,000 leaked descriptors drop to 0 after `System.gc()`. But GC timing depends on heap pressure, not descriptor pressure: with a limit of 1,024, opens failed with \"Too many open files\" long before any GC. The Cleaner is a safety net, not a resource strategy.",
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
              question: "The finance team says the nightly payouts CSV sometimes ends in the middle of a row. The job uses a BufferedWriter. What do you check?",
              answer:
                "Whether the writer is closed on every path. If an exception (a bad row, a timeout) skips `close()`, everything in the `BufferedWriter`'s and the encoder's buffers is lost, and the file ends at an 8 KB boundary, mid-row, exactly as `LostTail` showed. The fix is try-with-resources. Then: write to a temporary file and move it into place only after `close()` succeeds, so finance never sees a half-written file (next lesson), and add a trailer or row count the consumer can verify.",
            },
            {
              question: "Customer names with accents show as \"Ã©\" in a report. Others show as \"?\". What happened in each case?",
              answer:
                "\"Ã©\" is UTF-8 bytes decoded as ISO-8859-1 or windows-1252: `é` is `C3 A9`, and Latin-1 shows those as two characters. It's reversible, if nothing has been saved in that form. \"?\" means the text was decoded or encoded with a charset that can't represent it (often US-ASCII from a missing locale on Java 17 or earlier, or `-Dfile.encoding=COMPAT`); the original bytes are lost and must be restored from the source. In both cases, find where bytes became chars without an explicit charset and add one.",
            },
            {
              question: "A service fails after a few hours with FileNotFoundException \"(Too many open files)\" for a file that definitely exists. What's going on?",
              answer:
                "A descriptor leak: streams, readers, `Files.lines`/`Files.list` streams or sockets opened and never closed. The message names the file being opened when the limit was hit, not the leaking code. I'd check `ls /proc/<pid>/fd | wc -l` against `ulimit -n`, look at what the descriptors point to (`ls -l /proc/<pid>/fd`), find the code that opens those files, and put it in try-with-resources. Raising the limit only delays the failure.",
            },
            {
              question: "A CSV uploaded from Excel fails validation with \"unexpected header\", but the header looks exactly right in the logs. Why?",
              answer:
                "Probably a UTF-8 byte order mark: Excel's \"CSV UTF-8\" starts with `EF BB BF`, Java decodes it as the invisible character U+FEFF, and `\"\\uFEFFdriver_id,...\"` isn't equal to `\"driver_id,...\"`. Printing `header.length()` or the first char's code point shows it (23 instead of 22, U+FEFF). Strip a leading BOM when reading user-supplied files, as `BomHeader` does.",
            },
            {
              question: "An export writes 2 GB with new FileWriter(file) and out.write(row) per row. It's slow on JDK 21 and on NFS especially. What would you change?",
              answer:
                "Add a `BufferedWriter` (or use `Files.newBufferedWriter`). On JDK 21, a bare `FileWriter`'s encoder buffer stays at 512 bytes for short writes: I measured 4,688 `write()` system calls for 2.4 MB against 293 with a `BufferedWriter`, and twice the time even on a local disk. On NFS each write can be a network round trip, so 16 times fewer calls matters much more. I'd also name the charset, use try-with-resources, and consider a larger buffer (`new BufferedWriter(w, 64 * 1024)`) after measuring.",
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
            "Write \"Zoë\" to a file as UTF-8, then read it with an `InputStream` and with a `Reader`, printing every value `read()` returns.",
            "Create a 1 MB file and run `strace -f -c -e trace=read -P <file>` on a program that reads it with `FileInputStream.read()` and then on one using `BufferedReader.readLine()`.",
            "Write 1,000 rows through `new BufferedWriter(new FileWriter(f, UTF_8))` and forget `close()`. Check the file size, then add try-with-resources and check again.",
            "Read a UTF-8 file containing `Zoë, অনিতা, ₹120` with `ISO_8859_1`, `windows-1252` and `US_ASCII`, and try to repair each result by encoding back and decoding as UTF-8.",
            "Create a `PrintWriter` over `new FileWriter(\"/dev/full\")` (Linux), print 5,000 lines, close it, and print `checkError()`.",
            "Call `new File(\"nope.txt\").delete()`, `new File(\"x/y/z\").mkdir()` and `new File(\"build.gradle\").list()` (any regular file), and print each result.",
            "Run `javap -p -constants java.io.BufferedReader` and find the default buffer size.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints `90 111 195 171` from the stream and `90 111 235` from the reader. Step 2 shows about one `read()` per byte (1,048,601 for my 1,048,600-byte file) against about 130. Step 3 gives 8,192 bytes instead of 24,024 for rows like `T100000,SALT-LAKE,12000`, and the full file with the fix. Step 4 shows `ZoÃ«`, `ZoÃ«` with different symbols for the Bengali and rupee bytes, and `Zo��`; the first two repair to the original, the ASCII one gives `Zo??`. Step 5 prints `true`. Step 6 prints `false`, `false` and `null`. Step 7 shows `DEFAULT_CHAR_BUFFER_SIZE = 8192`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `FAMILIES   bytes: InputStream / OutputStream     (images, copies, binary)
           chars: Reader / Writer                 (text, needs a charset)
           bridge: InputStreamReader / OutputStreamWriter (StreamDecoder/Encoder)

STACK      new BufferedReader(new FileReader(f, UTF_8))
           char[8192]  ->  StreamDecoder bytes[8192] + decoder  ->  fd
           FileInputStream.read() = native read0() = 1 syscall per byte

MEASURED   1 MB: 1,048,601 read() unbuffered vs 130 buffered (strace)
           10 MB: 7,591 ms per byte vs 22 ms readLine vs 5.9 ms byte[8192]
           JDK 21 FileWriter alone: 4,688 write() for 2.4 MB (512 B encoder)
           with BufferedWriter: 293

CHARSETS   default UTF-8 since Java 18 (JEP 400); COMPAT = old locale rule
           UTF-8 read as Latin-1 -> "ZoÃ«" (reversible)
           read as ASCII -> U+FFFD -> "?" on write (data lost)

CLOSE      flush = push to OS; close = flush + release fd; fsync = disk
           unclosed BufferedWriter: 8,192 of 24,024 bytes written
           leaked fds: "Too many open files"; Cleaner only on GC
           PrintWriter never throws -> checkError()

OLD File   delete/mkdir/renameTo -> false, length() -> 0, list() -> null`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "java.io is a stack of small decorators: file access at the bottom, decoding in the middle, buffering on top. Knowing which layer does what explains the measurements: a million system calls without a buffer, 130 with one, and up to 16 KB lost in two buffers when `close()` is skipped.",
            "Text is bytes plus a charset. Name the charset every time, buffer every stream, close everything with try-with-resources, and don't trust `PrintWriter` or `java.io.File` to tell you when something failed.",
            "The next lesson, java.nio.file: Paths, Files and Large Files, covers the modern API: `Path` and `Files`, open options, exceptions that explain failures, walking directories, `FileChannel` and memory-mapped files, reading files larger than the heap, and the atomic write-then-rename pattern.",
          ],
        },
      ],
    },
  ],
};
