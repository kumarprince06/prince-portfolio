import type { Lesson } from "../types";

export const compilationProcess: Lesson = {
  slug: "compilation-process",
  date: "2026-08-08",
  title: "Compilation Process",
  description:
    "What `javac` actually does between a `.java` file and a `.class` file: tokens, the syntax tree, type checking, flow analysis, desugaring and bytecode, with the real error message each stage produces.",
  tags: ["javac", "Compiler", "Bytecode", "AST", "Core Java"],
  sections: [
    {
      title: "What Compilation Really Means",
      blocks: [
        {
          type: "paragraph",
          text: "I had run `javac` hundreds of times before I ever asked what it does. Source goes in, a `.class` file comes out, and when something is wrong it prints an error. This lesson is me opening that box.",
        },
        {
          type: "paragraph",
          text: "The compilation process is the sequence of steps `javac` goes through to turn human-readable `.java` source into bytecode the JVM can load. It is not one action. It is a pipeline, and each stage catches a different kind of mistake. Once I knew the stages, compiler errors stopped being one scary category. I can usually tell from the wording alone which stage complained, and that tells me what kind of mistake to look for.",
        },
        {
          type: "paragraph",
          text: "It also made one thing permanently clear for me: `javac HelloWorld.java` compiles and writes a file, `java HelloWorld` only runs an already-compiled class, and `java HelloWorld.java` compiles in memory and runs straight away. I trace all three at the end of the internal-working section.",
        },
      ],
    },
    {
      title: "Where This Design Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Compilers are much older than Java. John Backus's team at IBM shipped the first FORTRAN compiler in 1957, and the textbook structure `javac` follows (scan, parse, check, generate) was well established by the 1970s.",
        },
        {
          type: "paragraph",
          text: "What makes Java different from C or C++ is where the compiler stops. A C compiler goes all the way to machine code for one CPU and one OS. `javac` deliberately stops at an intermediate format, bytecode, and leaves the last step to the JVM on each machine. That decision comes straight from the Green Project's goal of running the same program on any device.",
        },
        {
          type: "paragraph",
          text: "Java didn't invent the idea. UCSD Pascal compiled to portable \"p-code\" in the 1970s. But Java made it mainstream, and Microsoft's .NET followed the same model in 2002 with CIL bytecode and the CLR runtime. Today \"compile to an intermediate form, let a runtime finish the job\" is the normal design for managed languages.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "The way I picture it is a legal contract going through a strict review pipeline before it is sent out:",
        },
        {
          type: "list",
          items: [
            "**Lexical analysis** is a proofreader going character by character, checking that every word is a real word. They don't care yet whether the sentences make sense.",
            "**Syntax analysis** is a grammar checker. Are the sentences well-formed, is the punctuation in place? It still doesn't care what they mean.",
            "**Semantic analysis** is the lawyer. Does the clause being referenced actually exist? Is \"Party A\" defined anywhere? Does the obligation make sense for that type of thing (you can't \"sign\" a date)?",
            "**Bytecode generation** is converting the approved contract into a standard template that any court in any country can process the same way.",
          ],
        },
        {
          type: "paragraph",
          text: "The part of the analogy that really holds is that a contract rejected by the grammar checker never reaches the lawyer. `javac` works the same way: if the file doesn't parse, you won't see a single type error, even if there are ten of them. I show that with real output further down.",
        },
      ],
    },
    {
      title: "The Four Phases",
      blocks: [
        {
          type: "paragraph",
          text: "Most notes describe compilation as four phases, and that is a good model for reading errors. I use it below, then show what the real `javac` pipeline adds.",
        },
        {
          type: "heading",
          text: "Phase 1: Lexical analysis (tokenizing)",
        },
        {
          type: "paragraph",
          text: "The scanner reads characters and groups them into **tokens**: keywords (`public`, `class`, `int`), identifiers (`num`, `HelloWorld`), literals (`10`, `\"Hello\"`), operators (`+`, `=`) and separators (`{`, `;`). Whitespace and comments are dropped here. For example, `int num = 10;` becomes five tokens:",
        },
        {
          type: "code",
          language: "text",
          code: `INT   IDENTIFIER(num)   EQ   INTLITERAL(10)   SEMI`,
        },
        {
          type: "paragraph",
          text: "Errors from this stage are about characters that can't form any token: an illegal character like `#`, an unclosed string literal, or a malformed number like `0x` with no hex digits.",
        },
        {
          type: "heading",
          text: "Phase 2: Syntax analysis (parsing)",
        },
        {
          type: "paragraph",
          text: "The parser checks the token stream against Java's grammar and builds an **abstract syntax tree** (AST): a tree that says \"this is a class, it contains a method, the method contains a variable declaration whose initializer is a `+` expression\". Missing semicolons, unbalanced braces and a statement where a declaration should be are all caught here. The parser doesn't know or care what any name refers to.",
        },
        {
          type: "heading",
          text: "Phase 3: Semantic analysis",
        },
        {
          type: "paragraph",
          text: "Now `javac` checks meaning, working on the AST:",
        },
        {
          type: "list",
          items: [
            "**Type checking:** `int x = \"hello\";` parses perfectly well. It fails here, because a `String` can't be assigned to an `int`.",
            "**Symbol resolution:** does every variable, method and class name point at something that exists and is in scope?",
            "**Access checks:** is that `private` field being read from another class?",
            "**Flow analysis:** is every local variable definitely assigned before it is read, does every path of a non-`void` method return, is any statement unreachable?",
          ],
        },
        {
          type: "paragraph",
          text: "The output of this phase is an **attributed** AST: every node now knows its type and every name knows the symbol it refers to. It is type-checked, not \"verified\". Bytecode verification is a separate thing the JVM does later.",
        },
        {
          type: "heading",
          text: "Phase 4: Bytecode generation",
        },
        {
          type: "paragraph",
          text: "Finally the code generator walks the checked tree and emits JVM instructions (`iload`, `iadd`, `invokevirtual`, `ireturn` and so on), then writes them into a `.class` file together with the metadata the JVM needs: the constant pool, field and method descriptors, a `StackMapTable` for the verifier, and a `LineNumberTable` so stack traces can show source line numbers.",
        },
        {
          type: "callout",
          tone: "note",
          title: "The real javac pipeline is longer",
          text: "Four phases is a simplified model. Inside `javac` (the `com.sun.tools.javac` code in the JDK) the steps are roughly: parse (the scanner is called by the parser on demand, token by token), **enter** (register every class and member in symbol tables), **annotation processing** (Lombok, MapStruct and friends run here and can generate new source files, which go back through parsing), **attribute** (type checking, symbol resolution, constant folding), **flow** (definite assignment, reachability, exceptions), **desugar** (rewrite convenient syntax into simpler Java, like the enhanced `for` into an `Iterator` loop), and **generate** bytecode.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "paragraph",
          text: "To see what each stage really does, I followed one line through `javac`: `int result = 5 + 3;`, inside this class.",
        },
        {
          type: "code",
          language: "java",
          title: "Fold.java",
          code: `public class Fold {
    public static void main(String[] args) {
        int result = 5 + 3;
        System.out.println(result);
    }
}`,
        },
        {
          type: "output",
          text: "8",
        },
        {
          type: "heading",
          text: "1. Scanner: characters become tokens",
        },
        {
          type: "paragraph",
          text: "The scanner turns the line into seven tokens. Spaces are gone, and each token remembers its position in the file so errors can point at the right column:",
        },
        {
          type: "code",
          language: "text",
          code: `INT  IDENTIFIER(result)  EQ  INTLITERAL(5)  PLUS  INTLITERAL(3)  SEMI`,
        },
        {
          type: "paragraph",
          text: "In `javac` this isn't a separate pass over the file. The parser asks the scanner for the next token whenever it needs one, so tokenizing and parsing run interleaved. That's why a lexical error like `illegal character` is reported while the file is being parsed.",
        },
        {
          type: "heading",
          text: "2. Parser: tokens become a tree",
        },
        {
          type: "paragraph",
          text: "The parser matches the tokens against the grammar rule for a local variable declaration and builds a small subtree, which hangs off the tree for `main`, which hangs off the tree for `Fold`:",
        },
        {
          type: "diagram",
          text: `VariableDecl
├── type: int
├── name: result
└── init: Binary (+)
          ├── left:  Literal 5
          └── right: Literal 3`,
          caption: "The AST for `int result = 5 + 3;`. The parser only knows the shape, not the types.",
        },
        {
          type: "paragraph",
          text: "Every source file becomes one tree. If any file fails to parse, `javac` reports it and stops here.",
        },
        {
          type: "heading",
          text: "3. Enter: names go into symbol tables",
        },
        {
          type: "paragraph",
          text: "Before checking any method body, `javac` walks the trees once and records every class and its members: there is a class `Fold`, it has a method `main(String[])`. That's why a method can call another method declared further down the file. By the time bodies are checked, every class-level name is already known. Local variables like `result` are different. They are added to the scope one by one as the method body is checked.",
        },
        {
          type: "heading",
          text: "4. Annotation processing",
        },
        {
          type: "paragraph",
          text: "Nothing happens for `Fold`, since there are no processors. In a Spring Boot project with Lombok or MapStruct on the processor path, this is where they run. If a processor generates new source files, those go back through parsing and entering before type checking starts.",
        },
        {
          type: "heading",
          text: "5. Attribution: types, names and constants",
        },
        {
          type: "paragraph",
          text: "This is the heart of semantic analysis. `javac` walks the method body and answers the questions the parser couldn't. `int` is a valid type. `5` and `3` are `int` literals. `+` is defined for two `int`s and gives an `int`. That's assignable to `result`, so the check passes. Then `result` is added to the scope, so the `println(result)` on the next line resolves.",
        },
        {
          type: "paragraph",
          text: "One more thing happens here that I didn't expect. Both operands are compile-time constants, so the `+` node is given the constant value `8` right there. That is **constant folding**, and it's why the bytecode below has no addition in it.",
        },
        {
          type: "heading",
          text: "6. Flow analysis: paths",
        },
        {
          type: "paragraph",
          text: "Flow checks that `result` is definitely assigned before `println` reads it (it is, on the line above), that no statement is unreachable, and that checked exceptions are caught or declared. Nothing to report here. The flow error example further down shows what a failure looks like.",
        },
        {
          type: "heading",
          text: "7. Desugar: simplify the tree",
        },
        {
          type: "paragraph",
          text: "`javac` rewrites convenient syntax into plainer Java before generating code: enhanced `for` loops, inner classes, enums, `switch` on strings, autoboxing. This line has nothing to rewrite. The enhanced `for` example in the Examples section shows what this step does.",
        },
        {
          type: "heading",
          text: "8. Code generation: tree becomes bytecode",
        },
        {
          type: "paragraph",
          text: "Finally `Gen` walks the tree and emits instructions, and the class writer puts them into `Fold.class` with the constant pool and the other attributes. My old notes said this line compiles to `iconst_5`, `iconst_3`, `iadd`, `istore_1`. The real output:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac Fold.java
javap -c Fold`,
        },
        {
          type: "output",
          text: `  public static void main(java.lang.String[]);
    Code:
       0: bipush        8
       2: istore_1
       3: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
       6: iload_1
       7: invokevirtual #13                 // Method java/io/PrintStream.println:(I)V
      10: return`,
        },
        {
          type: "paragraph",
          text: "`bipush 8` pushes the already-computed `8`, and `istore_1` stores it in local slot 1, which is `result` (slot 0 is `args`). No `iadd` anywhere. To make `javac` emit a real addition, the operands have to be values it can't know at compile time. Example 1 below shows that.",
        },
        {
          type: "heading",
          text: "javac X.java, java X and java X.java",
        },
        {
          type: "list",
          items: [
            "`javac HelloWorld.java` runs the whole pipeline and writes `HelloWorld.class` to disk. It's a separate, persistent file.",
            "`java HelloWorld` does no compilation at all. It starts a JVM that loads the existing `HelloWorld.class` from the class path.",
            "`java HelloWorld.java` (source-file mode, JEP 330, Java 11+) makes the launcher run the compiler **in memory** and then execute the result. No `.class` file is ever written.",
          ],
        },
        {
          type: "paragraph",
          text: "I proved the last point to myself by printing the class loader:",
        },
        {
          type: "code",
          language: "java",
          title: "Where.java",
          code: `public class Where {
    public static void main(String[] args) {
        System.out.println(Where.class.getClassLoader());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java Where.java        # source-file mode
javac Where.java && java Where`,
        },
        {
          type: "output",
          text: `com.sun.tools.javac.launcher.Main$MemoryClassLoader@2f490758
jdk.internal.loader.ClassLoaders$AppClassLoader@639fee48`,
        },
        {
          type: "paragraph",
          text: "In source-file mode the class comes from a special in-memory loader, because the bytecode never touched the file system. After a normal `javac`, it's the usual application class loader reading `Where.class` from disk. The directory only had `Where.java` in it after the first command.",
        },
      ],
    },
    {
      title: "The Pipeline in One Picture",
      blocks: [
        {
          type: "diagram",
          text: `HelloWorld.java   (plain text)
        │
        ▼
┌──────────────────────────────────────────────┐
│ 1. Lexical analysis   characters → tokens    │
│ 2. Syntax analysis    tokens → AST           │
├──────────────────────────────────────────────┤
│    Enter: classes and members into symbols   │
│    Annotation processing (if configured)     │
├──────────────────────────────────────────────┤
│ 3. Semantic analysis                         │
│    Attr: types, names, access, folding       │
│    Flow: definite assignment, reachability   │
├──────────────────────────────────────────────┤
│    Desugar: for-each → Iterator, etc.        │
│ 4. Bytecode generation → .class file         │
└──────────────────────┬───────────────────────┘
                       ▼
               HelloWorld.class
                       │  java HelloWorld
                       ▼
      JVM: load → link (verify) → init → run`,
          caption:
            "Numbered rows are the four-phase model. Unnumbered rows are real `javac` steps the model glosses over. Verification happens in the JVM, not in `javac`.",
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            "I run `javac HelloWorld.java`.",
            "The parser pulls tokens from the scanner as it needs them and builds the AST, enforcing Java's grammar. Lexical and syntax errors both come out of this step.",
            "`javac` enters every class and member into its symbol tables, and runs annotation processors if any are on the processor path.",
            "Attribution walks the AST: resolves names, checks types and access, folds constants.",
            "Flow analysis checks definite assignment, reachability and checked exceptions.",
            "If there were no errors, the tree is desugared and the code generator emits bytecode for each method.",
            "`javac` writes the bytecode plus metadata (constant pool, descriptors, stack map frames, line numbers) into `HelloWorld.class`.",
            "Compilation is over. Whenever I later run `java HelloWorld`, the JVM's own process starts: loading, linking (including verification), initialization, execution. That is completely independent of the compile.",
          ],
        },
        {
          type: "paragraph",
          text: "`javac -verbose` shows the outline of this. With the class-path search lines filtered out, a Hello World compile on JDK 21 looks like this:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac -verbose HelloWorld.java`,
        },
        {
          type: "output",
          text: `[parsing started SimpleFileObject[/.../hello/HelloWorld.java]]
[parsing completed 15ms]
[checking HelloWorld]
[wrote HelloWorld.class]
[total 231ms]`,
        },
        {
          type: "paragraph",
          text: "\"Parsing\" covers phases 1 and 2, \"checking\" is attribution and flow, and \"wrote\" is desugaring plus code generation. Most of the 231 ms is `javac` itself starting up and loading JDK classes, not my five-line file.",
        },
      ],
    },
    {
      title: "How javac Is Organized Internally",
      blocks: [
        {
          type: "paragraph",
          text: "This is simplified pseudo-code, but the stage names match the classes in the JDK's `com.sun.tools.javac` packages (`JavacParser`, `Enter`, `Attr`, `Flow`, `Lower`, `Gen`).",
        },
        {
          type: "code",
          language: "text",
          title: "javac pseudo-code",
          code: `compile(files):
    trees = []
    for file in files:
        trees.add(parser.parse(file))    // parser pulls tokens from scanner
    if errors: stop                      // no type errors reported yet

    enter(trees)                         // classes and members -> symbols
    runAnnotationProcessors(trees)       // may add new source files

    for tree in trees:
        attribute(tree)                  // types, names, access, constants
    if errors: stop                      // flow errors not reported yet

    for tree in trees:
        flow(tree)                       // definite assignment, returns
    if errors: stop

    for tree in trees:
        lowered = desugar(tree)          // for-each, inner classes, enums...
        writeClassFile(generate(lowered))`,
        },
        {
          type: "paragraph",
          text: "The `if errors: stop` lines are the part that matters day to day. With the default settings, a parse error means no attribution errors are reported, and an attribution error means no flow errors are reported. Within one stage, `javac` keeps going and reports everything it finds.",
        },
      ],
    },
    {
      title: "javac Command Syntax",
      blocks: [
        {
          type: "paragraph",
          text: "No new language syntax in this lesson, but these are the `javac` options I actually use:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac HelloWorld.java               # compile one file
javac *.java                        # every .java file in this directory
javac -d out HelloWorld.java        # write .class files under out/
javac --release 21 App.java         # compile for Java 21, against its API
javac -Xlint:all App.java           # enable every warning category
javac -Xlint:all -Werror App.java   # and fail the build on any warning`,
        },
        {
          type: "paragraph",
          text: "`-d` exists so compiled output doesn't end up mixed in with the sources. It also creates package directories for you:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac -d out HelloWorld.java
find out
java -cp out HelloWorld`,
        },
        {
          type: "output",
          text: `out
out/HelloWorld.class
Hello, World!`,
        },
        {
          type: "paragraph",
          text: "Maven and Gradle do exactly this for you, writing into `target/classes` or `build/classes/java/main`.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "paragraph",
          text: "Each of these is a small program I compiled with JDK 21 and then read back with `javap`. Every one shows `javac` doing something to my code that the four-phase model doesn't mention.",
        },
        {
          type: "heading",
          text: "Example 1: Constant folding vs real arithmetic",
        },
        {
          type: "code",
          language: "java",
          title: "Pricing.java",
          code: `public class Pricing {
    static final int BASE_FARE = 50;

    static int fare(int km) {
        int minimum = BASE_FARE + 10;
        return minimum + km * 12;
    }

    public static void main(String[] args) {
        System.out.println(fare(5));
    }
}`,
        },
        {
          type: "output",
          text: "120",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c Pricing",
        },
        {
          type: "output",
          text: `  static int fare(int);
    Code:
       0: bipush        60
       2: istore_1
       3: iload_1
       4: iload_0
       5: bipush        12
       7: imul
       8: iadd
       9: ireturn`,
        },
        {
          type: "paragraph",
          text: "`BASE_FARE` is a `static final int` initialized with a constant, so `BASE_FARE + 10` is a compile-time constant too. `javac` folded it to `60` and never even reads the field. The second line depends on `km`, a parameter only known at runtime, so it compiles to real instructions: load `minimum` and `km`, multiply `km` by `12` (`imul`), add (`iadd`), return. Folding only happens when every operand is a constant.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Folded constants are copied into other classes",
          text: "Because the value `60` is baked into `Pricing.class`, the same thing happens to any other class that uses `Pricing.BASE_FARE`. If `BASE_FARE` changes and only `Pricing.java` is recompiled, those other classes keep the old value. Build tools know this, which is one reason a changed constant can trigger a wider recompile.",
        },
        {
          type: "heading",
          text: "Example 2: Enhanced for, desugared into an Iterator",
        },
        {
          type: "code",
          language: "java",
          title: "ForEach.java",
          code: `import java.util.List;

public class ForEach {
    public static void main(String[] args) {
        List<String> cities = List.of("Kolkata", "Pune");
        for (String city : cities) {
            System.out.println(city);
        }
    }
}`,
        },
        {
          type: "output",
          text: `Kolkata
Pune`,
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c ForEach",
        },
        {
          type: "output",
          text: `       8: aload_1
       9: invokeinterface #17,  1           // InterfaceMethod java/util/List.iterator:()Ljava/util/Iterator;
      14: astore_2
      15: aload_2
      16: invokeinterface #21,  1           // InterfaceMethod java/util/Iterator.hasNext:()Z
      21: ifeq          44
      24: aload_2
      25: invokeinterface #27,  1           // InterfaceMethod java/util/Iterator.next:()Ljava/lang/Object;
      30: checkcast     #31                 // class java/lang/String
      33: astore_3
      34: getstatic     #33                 // Field java/lang/System.out:Ljava/io/PrintStream;
      37: aload_3
      38: invokevirtual #39                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      41: goto          15
      44: return`,
        },
        {
          type: "paragraph",
          text: "There is no \"for-each\" instruction in bytecode. The desugaring step rewrote my loop into roughly `Iterator<String> it = cities.iterator(); while (it.hasNext()) { String city = it.next(); ... }`. You can read that straight off the listing: `iterator()` stored in slot 2, `hasNext()` with `ifeq` jumping to the end when it returns false, `next()`, and `goto 15` back to the top. The `checkcast` is generics erasure showing through: `next()` returns `Object` at the bytecode level, so `javac` inserts a cast to `String`. This is also why modifying the list inside a for-each can throw `ConcurrentModificationException`: there's a hidden iterator.",
        },
        {
          type: "heading",
          text: "Example 3: String concatenation via invokedynamic",
        },
        {
          type: "code",
          language: "java",
          title: "Concat.java",
          code: `public class Concat {
    static String label(String rider, int fare) {
        return "Rider " + rider + " pays " + fare;
    }

    public static void main(String[] args) {
        System.out.println(label("Asha", 240));
    }
}`,
        },
        {
          type: "output",
          text: "Rider Asha pays 240",
        },
        {
          type: "code",
          language: "bash",
          code: `javac Concat.java
javap -c Concat`,
        },
        {
          type: "output",
          text: `  static java.lang.String label(java.lang.String, int);
    Code:
       0: aload_0
       1: iload_1
       2: invokedynamic #7,  0              // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;I)Ljava/lang/String;
       7: areturn`,
        },
        {
          type: "paragraph",
          text: "A lot of articles say `+` on strings compiles to a `StringBuilder` chain. On Java 9 and later (JEP 280) it doesn't. `javac` pushes the two variable parts and emits a single `invokedynamic`. The fixed text lives in a recipe in the class file's bootstrap table, which `javap -v Concat` shows:",
        },
        {
          type: "output",
          text: `BootstrapMethods:
  0: #39 REF_invokeStatic java/lang/invoke/StringConcatFactory.makeConcatWithConstants:(...)Ljava/lang/invoke/CallSite;
    Method arguments:
      #37 Rider \\u0001 pays \\u0001`,
        },
        {
          type: "paragraph",
          text: "Each `\\u0001` is a slot for one argument. The first time this line runs, the JVM calls `StringConcatFactory` to build the concatenation code, and later calls reuse it. The strategy lives in the JDK, not in my class file, so a newer JVM can concatenate faster without me recompiling. For comparison, compiling the same file with `--release 8` gives the old shape:",
        },
        {
          type: "code",
          language: "bash",
          code: `javac --release 8 Concat.java
javap -c Concat`,
        },
        {
          type: "output",
          text: `  static java.lang.String label(java.lang.String, int);
    Code:
       0: new           #7                  // class java/lang/StringBuilder
       3: dup
       4: invokespecial #9                  // Method java/lang/StringBuilder."<init>":()V
       7: ldc           #10                 // String Rider
       9: invokevirtual #12                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      12: aload_0
      13: invokevirtual #12                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      16: ldc           #16                 // String  pays
      18: invokevirtual #12                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      21: iload_1
      22: invokevirtual #18                 // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
      25: invokevirtual #21                 // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
      28: areturn`,
        },
        {
          type: "paragraph",
          text: "Same source, same output, different bytecode, all decided by one compiler flag. (`javac` also printed warnings that source and target 8 are obsolete.)",
        },
        {
          type: "heading",
          text: "Example 4: A record's generated members",
        },
        {
          type: "code",
          language: "java",
          title: "Ride.java and Rides.java",
          code: `public record Ride(String id, int fare) {}

public class Rides {
    public static void main(String[] args) {
        Ride ride = new Ride("R-101", 240);
        System.out.println(ride);
        System.out.println(ride.fare());
        System.out.println(ride.equals(new Ride("R-101", 240)));
    }
}`,
        },
        {
          type: "output",
          text: `Ride[id=R-101, fare=240]
240
true`,
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p Ride",
        },
        {
          type: "output",
          text: `public final class Ride extends java.lang.Record {
  private final java.lang.String id;
  private final int fare;
  public Ride(java.lang.String, int);
  public final java.lang.String toString();
  public final int hashCode();
  public final boolean equals(java.lang.Object);
  public java.lang.String id();
  public int fare();
}`,
        },
        {
          type: "paragraph",
          text: "I wrote one line and `javac` produced a `final` class with two `private final` fields, a canonical constructor, two accessors, and `toString`, `hashCode` and `equals`. (The two types are in separate files; I show them together to save space.) Running `javap -c -p Ride` shows the last three are each a single `invokedynamic`, bootstrapped by `java.lang.runtime.ObjectMethods`. Records needed no new JVM feature. It's all compiler work, done between entering and code generation.",
        },
      ],
    },
    {
      title: "Seeing Each Phase Fail",
      blocks: [
        {
          type: "paragraph",
          text: "The fastest way to learn the stages was to break a file in a different way each time and read what JDK 21's `javac` said.",
        },
        {
          type: "heading",
          text: "Lexical: a character that can't be a token",
        },
        {
          type: "code",
          language: "java",
          title: "Lexical.java",
          code: `public class Lexical {
    public static void main(String[] args) {
        int x = 5 # 3;
    }
}`,
        },
        {
          type: "output",
          text: `Lexical.java:3: error: illegal character: '#'
        int x = 5 # 3;
                  ^
1 error`,
        },
        {
          type: "paragraph",
          text: "`#` isn't part of any Java token. Careful picking the example here: `@` looks just as odd in that position, but it's a legal token (it starts an annotation), so it gives a parser error instead. Two other lexical errors I hit: `String s = \"unclosed;` gives `unclosed string literal`, and `int a = 0x;` gives `hexadecimal numbers must contain at least one hexadecimal digit`.",
        },
        {
          type: "heading",
          text: "Syntax: a missing semicolon",
        },
        {
          type: "code",
          language: "java",
          title: "Syntax.java",
          code: `public class Syntax {
    public static void main(String[] args) {
        int x = 5
        System.out.println(x);
    }
}`,
        },
        {
          type: "output",
          text: `Syntax.java:3: error: ';' expected
        int x = 5
                 ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Every token here is fine. The problem is the order: the grammar requires `;` after a local variable declaration.",
        },
        {
          type: "heading",
          text: "Semantic: a type mismatch",
        },
        {
          type: "code",
          language: "java",
          title: "Semantic.java",
          code: `public class Semantic {
    public static void main(String[] args) {
        int x = "hello";
    }
}`,
        },
        {
          type: "output",
          text: `Semantic.java:3: error: incompatible types: String cannot be converted to int
        int x = "hello";
                ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Perfectly valid grammar, invalid meaning.",
        },
        {
          type: "heading",
          text: "Semantic: a name that doesn't resolve",
        },
        {
          type: "code",
          language: "java",
          title: "Symbol.java",
          code: `public class Symbol {
    public static void main(String[] args) {
        System.out.println(total);
        int total = 10;
    }
}`,
        },
        {
          type: "output",
          text: `Symbol.java:3: error: cannot find symbol
        System.out.println(total);
                           ^
  symbol:   variable total
  location: class Symbol
1 error`,
        },
        {
          type: "paragraph",
          text: "`total` is declared, just one line too late. A local variable's scope starts at its declaration, so at line 3 the name doesn't resolve to anything.",
        },
        {
          type: "heading",
          text: "Flow analysis: used before it's assigned",
        },
        {
          type: "code",
          language: "java",
          title: "Flow.java",
          code: `public class Flow {
    static int fare(int km) {
        int total;
        if (km > 0) {
            total = km * 12;
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(fare(5));
    }
}`,
        },
        {
          type: "output",
          text: `Flow.java:7: error: variable total might not have been initialized
        return total;
               ^
1 error`,
        },
        {
          type: "paragraph",
          text: "The types are all correct. What fails is the path analysis: if `km` is `0`, `total` is never assigned.",
        },
        {
          type: "table",
          headers: ["Message starts with", "Stage", "What to look for"],
          rows: [
            ["`illegal character`, `unclosed string literal`", "Lexical", "A stray character or broken literal"],
            ["`';' expected`, `illegal start of expression`", "Syntax", "Missing punctuation, unbalanced braces"],
            ["`incompatible types`, `cannot find symbol`, `has private access`", "Semantic (Attr)", "Wrong type, typo, missing import, scope, visibility"],
            ["`might not have been initialized`, `missing return statement`, `unreachable statement`", "Semantic (Flow)", "A code path you didn't handle"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "list",
          items: [
            "**Treating every compile error as the same thing.** The wording tells you the stage, and the stage tells you whether to look at characters, structure, types or code paths.",
            "**Thinking the parser checks types.** It doesn't. `int x = \"hello\";` parses fine and only fails in attribution.",
            "**Assuming the error list is complete.** If a file has a missing semicolon and a type mismatch, `javac` only reports the semicolon. Fix it, recompile, and the type error appears. That's the stop-between-stages behaviour, not a new bug.",
            "**Mixing up compile-time and runtime errors.** A compile error means `javac` produced no `.class` file at all. A runtime error, like `NoClassDefFoundError` from a JAR missing on the runtime class path, happens to bytecode that compiled fine. Calling that a \"compilation error\" sends you looking in the wrong place.",
            "**Saying `javac` verifies bytecode.** It type-checks source. The bytecode verifier is part of the JVM and runs when a class is linked, because the JVM can't assume a `.class` file came from `javac`.",
            "**Believing old claims about generated code.** `a + b` on constants doesn't compile to `iadd`, and string `+` doesn't compile to `StringBuilder` on Java 9+. When in doubt, `javap -c` settles it in ten seconds.",
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
            "Read errors top to bottom and fix the first one first. Later errors in the same stage can be consequences of the first, and the reported line isn't always where the mistake is. When I deleted a method's closing `}`, `javac` reported `illegal start of expression` on the *next* method's declaration line.",
            "Let the IDE do semantic analysis as you type. IntelliJ flags type mismatches and unresolved names before I ever run a build. Just remember IntelliJ uses its own analysis, so the build tool's `javac` run is still the source of truth.",
            "Know that `mvn compile` and `./gradlew compileJava` are wrappers around the same `javac` (through its `javax.tools` API), with the class path, `--release` and output directory filled in from the build file. Everything in this lesson happens inside those commands.",
            "Pin `--release` to the Java version you deploy on, so the compiler checks against that version's API and writes a class file that version can load.",
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
            "Compile time and run time are separate costs. A slow build doesn't mean slow execution. `javac` does very little optimizing (constant folding is about it), and the JIT does the real work at runtime, so how long the build took says nothing about how fast the code runs.",
            "Large projects do compile slowly, because symbol resolution and type checking scale with the size of the code base and the class path. Annotation processors add to that, and a heavy one can dominate the compile.",
            "That's why incremental compilation matters. Gradle tracks which classes depend on a changed class and recompiles only those. Maven's compiler plugin is coarser and usually recompiles the whole module when any source in it changes. Splitting a large code base into modules limits how much gets recompiled either way.",
          ],
        },
      ],
    },
    {
      title: "Where This Shows Up in Production",
      blocks: [
        {
          type: "list",
          items: [
            "In a CI pipeline, compilation is the first gate. If `javac` fails at any stage, there's no bytecode, so tests don't even start.",
            "Teams with strict quality gates compile with `-Xlint:all -Werror`, so warnings like raw types, unchecked casts and deprecated APIs fail the build instead of piling up.",
          ],
        },
        {
          type: "paragraph",
          text: "Here is the difference those flags make on a small class that uses a raw `List`:",
        },
        {
          type: "code",
          language: "java",
          title: "Legacy.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Legacy {
    public static void main(String[] args) {
        List names = new ArrayList();
        names.add("Prince");
        System.out.println(names);
    }
}`,
        },
        {
          type: "paragraph",
          text: "Plain `javac Legacy.java` exits with `0` and only prints a note:",
        },
        {
          type: "output",
          text: `Note: Legacy.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.`,
        },
        {
          type: "paragraph",
          text: "With `javac -Xlint:all -Werror Legacy.java` it exits with `1` and writes no `.class` file (output trimmed):",
        },
        {
          type: "output",
          text: `Legacy.java:6: warning: [rawtypes] found raw type: List
        List names = new ArrayList();
        ^
Legacy.java:6: warning: [rawtypes] found raw type: ArrayList
        List names = new ArrayList();
                         ^
Legacy.java:7: warning: [unchecked] unchecked call to add(E) as a member of the raw type List
        names.add("Prince");
                 ^
error: warnings found and -Werror specified
1 error
3 warnings`,
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
              question: "What are the four phases of Java compilation, in order?",
              answer:
                "Lexical analysis, syntax analysis, semantic analysis, then bytecode generation. So characters become tokens, tokens become a syntax tree, the tree gets type-checked, and then bytecode is written out.\n\nI'd add that it's a simplified model. Real `javac` also has an enter step, annotation processing, a separate flow-analysis pass, and desugaring before code generation. You can actually see desugaring in `javap`: an enhanced `for` loop comes out as plain `iterator()`, `hasNext()` and `next()` calls.",
            },
            {
              question: "What does the lexical analysis phase produce?",
              answer:
                "A stream of tokens: keywords, identifiers, literals, operators and separators, with whitespace and comments thrown away. `int num = 10;` becomes five tokens, `int`, `num`, `=`, `10` and `;`.\n\nOne detail I found in the `javac` source is that it doesn't tokenize the whole file up front. The parser asks the scanner for the next token when it needs one, so the two phases are separate pieces of code but run interleaved.",
            },
            {
              question: "What does the syntax analysis phase produce?",
              answer:
                "An abstract syntax tree. It's a tree of the program's structure: class, method, variable declaration, the expression inside it and so on.\n\nAt this point nothing is known about types. `int x = \"hello\";` produces a perfectly good tree. It's only in the next phase that `javac` notices a `String` is going into an `int`.",
            },
            {
              question: "What kind of errors does semantic analysis catch that syntax analysis does not?",
              answer:
                "Anything about meaning rather than shape: type mismatches, names that don't resolve, calling a method that doesn't exist, reading a `private` field from another class. Flow problems too, like reading a local variable that might not be assigned, or a method that doesn't return on every path.\n\nThe messages give it away. \"incompatible types\", \"cannot find symbol\" and \"has private access\" are all semantic. \"';' expected\" is syntax.",
            },
            {
              question: "What is bytecode generation's output?",
              answer:
                "A `.class` file per class, containing JVM instructions for each method plus the metadata the JVM needs: the constant pool, field and method descriptors, stack map frames for the verifier and line number tables for stack traces.\n\nIt's also where you see what `javac` did to your code. When I compiled `int result = 5 + 3;` and ran `javap -c`, there was no addition at all, just `bipush 8`. The compiler had folded the constant.",
            },
            {
              question: "Does javac produce native machine code directly? Why or why not?",
              answer:
                "No, it stops at bytecode. That's the whole portability story: one `.class` file runs on any OS with a JVM, and the JVM turns hot code into native code for the actual CPU at runtime.\n\nIt also means the native code can be optimized using real runtime behaviour, like which branches actually get taken. If you really do want native code ahead of time, that's a different tool, like GraalVM Native Image, not `javac`.",
            },
            {
              question: "What is a \"token\" in the context of lexical analysis?",
              answer:
                "The smallest meaningful unit of source code: a keyword like `class`, an identifier like `total`, a literal like `42` or `\"Pune\"`, an operator like `+=`, or a separator like `{`.\n\nThe lexer's only job is to check that the characters form valid tokens. That's why `#` in the middle of an expression gets \"illegal character: '#'\", while `@` in the same spot doesn't, because `@` is a real token (it starts an annotation).",
            },
            {
              question: "What is an Abstract Syntax Tree (AST)?",
              answer:
                "It's the tree the parser builds to represent the program's structure. \"Abstract\" because it drops things that only mattered for parsing, like semicolons and parentheses. The nesting of the tree already captures them.\n\nFor `int result = 5 + 3;` it's a variable-declaration node with a type, a name, and an initializer that's a binary `+` node with two literal children. Every later stage of `javac` works on that tree, not on the text.",
            },
            {
              question: "Give an example of a lexical error.",
              answer:
                "`int x = 5 # 3;`. `#` can't start any Java token, so `javac` says \"illegal character: '#'\" and points a caret at it.\n\nAn unterminated string is another one, which gives \"unclosed string literal\". I'd be careful with `123abc`, which a lot of notes list as a malformed number. When I tried it, `javac` read `123` and `abc` as two valid tokens and reported \"';' expected\", which is a parser error.",
            },
            {
              question: "Give an example of a semantic error.",
              answer:
                "`int x = \"hello\";`. It parses fine, but attribution fails with \"incompatible types: String cannot be converted to int\".\n\nAnother one I hit all the time is using a variable before declaring it, which gives \"cannot find symbol\" with `symbol: variable total` underneath. It's semantic because the grammar is fine. The name just doesn't resolve to anything at that point.",
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
              question: "Why does `int x = \"hello\";` fail compilation, and in which phase specifically?",
              answer:
                "It fails in semantic analysis, in the attribution step where `javac` works out the type of every expression. The initializer's type is `String`, the variable is `int`, and there's no conversion between them, so you get \"incompatible types: String cannot be converted to int\".\n\nThe tokens are fine and the grammar is fine, which is why lexing and parsing both pass. That's the example I use to show that \"it parses\" and \"it compiles\" aren't the same thing.",
            },
            {
              question: "Why does a missing semicolon get caught in syntax analysis rather than lexical analysis?",
              answer:
                "Because nothing is wrong at the character level. Every token that's there is valid. What's wrong is the sequence: the grammar says a declaration ends in `;`, and the parser found another token instead.\n\nThe lexer has no concept of \"expected\". It just produces tokens. Only the parser knows what should come next, which is why the message is \"';' expected\". The caret points right after the last good token.",
            },
            {
              question: "Explain why a syntactically valid statement can still fail to compile.",
              answer:
                "Because syntax only covers shape. Whether the names exist, whether the types match and whether every path assigns a variable are all checked later, on the tree.\n\nMy favourite example is a method where `total` is only assigned inside an `if` and then returned. Grammar and types are both correct, and it still fails with \"variable total might not have been initialized\", from flow analysis.",
            },
            {
              question: "What's the relationship between the AST built in Phase 2 and the type-checking done in Phase 3?",
              answer:
                "Type checking works on the AST. The parser builds the tree with no type information, then attribution walks it and fills things in: every expression gets a type and every name gets linked to the symbol it refers to.\n\nSo it's the same tree, enriched. Code generation later walks that attributed tree, after desugaring, and uses those types to pick instructions, like `iadd` for two `int`s versus `ladd` for `long`s.",
            },
            {
              question: "Why might one early syntax error cause many follow-on error messages?",
              answer:
                "Because after an error the parser has to guess where the code \"really\" continues so it can keep going. If it guesses wrong, perfectly fine code after that point gets reported too.\n\nModern `javac` recovers pretty well, honestly. When I deleted a method's closing brace, I got just one error, but it pointed at the next method's declaration, not the line where the brace was missing. So fix the first error first, and look above the reported line if it doesn't make sense.",
            },
            {
              question: "What's the difference between a compile-time error and a runtime exception, precisely?",
              answer:
                "A compile-time error comes from `javac`, and there's no `.class` file afterwards. A runtime exception is thrown by running code, which means the bytecode compiled and was loaded fine, and something went wrong while executing it.\n\nThe case that confuses people is dependencies. Code can compile against a library and then fail at runtime with `NoClassDefFoundError` because that JAR isn't on the runtime class path. That's not a compilation problem at all, it's a deployment one.",
            },
            {
              question: "Explain the internal difference between `javac HelloWorld.java` (writes a `.class` file) and `java HelloWorld.java` (compiles in memory).",
              answer:
                "`javac` runs the full pipeline and writes `HelloWorld.class` to disk, and later `java HelloWorld` just loads that file. `java HelloWorld.java` is source-file mode from Java 11 (JEP 330): the launcher calls the compiler itself, keeps the bytecode in memory and runs it right away.\n\nI checked by printing `Where.class.getClassLoader()`. In source-file mode it was `com.sun.tools.javac.launcher.Main$MemoryClassLoader`, and after a normal compile it was the regular `AppClassLoader`. No `.class` file showed up in the directory in the first case.",
            },
            {
              question: "Why is compilation considered a \"one-time cost\" with no effect on runtime performance?",
              answer:
                "Because it happens at build time, once, and the output is the same no matter how long it took. The JVM doesn't care whether `javac` took one second or one minute.\n\nIt's also because `javac` barely optimizes. Constant folding is about all it does. The real optimization is the JIT at runtime, so it's the runtime profile that decides performance, not the compiler. A slow build is a developer-productivity problem, not a production one.",
            },
            {
              question: "What does the `-d` flag do in javac, and why do real projects use it?",
              answer:
                "It sets the output directory for `.class` files, and creates package subdirectories under it. Without it, classes land next to the sources, which gets messy fast and makes it easy to run stale classes by accident.\n\nThat's exactly what Maven and Gradle do: sources in `src/main/java`, compiled classes in `target/classes` or `build/classes/java/main`. When I compiled a Hello World with `-d out`, I ran it with `java -cp out HelloWorld`.",
            },
            {
              question: "How do Maven/Gradle relate to javac under the hood?",
              answer:
                "They call the same compiler, usually in-process through the `javax.tools.JavaCompiler` API rather than by starting a `javac` process. The build file supplies the source directories, the class path from resolved dependencies, `--release`, annotation processors and the output directory.\n\nSo a Maven compile failure is a `javac` failure, and the messages are the same ones I get on the command line. Gradle adds incremental compilation on top, working out which classes actually need recompiling.",
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
              question: "Why did Java's compiler design deliberately stop at bytecode rather than compiling straight to native machine code, and how does this trace back to Java's original design goals?",
              answer:
                "Because the Green Project was about running the same program on lots of different devices, and native code ties you to one CPU and OS. Stopping at bytecode means you compile once, and each platform only needs a JVM.\n\nThere were other wins too. Bytecode is compact, which mattered for applets downloaded over slow connections, and it's structured enough for the JVM to verify before running it. Later the JIT turned it into a performance advantage, since it can optimize using how the code actually runs.",
            },
            {
              question: "Explain precisely how symbol resolution during semantic analysis differs from simple syntax checking.",
              answer:
                "Syntax checking is local: does this sequence of tokens match a grammar rule? The parser sees `total` as an identifier and that's it.\n\nSymbol resolution has to answer what `total` actually is. That means looking it up through the scopes: local variables declared so far, then fields, inherited members, imports, and finally the class path. It also checks visibility. That's why a variable used one line before its declaration passes the parser and still fails with \"cannot find symbol\". The scope just doesn't include it yet.",
            },
            {
              question: "Why can incremental compilation significantly speed up large project builds, and what does it actually skip re-doing?",
              answer:
                "Because most changes touch a handful of files, and a full build parses and type-checks everything again, including thousands of files that didn't change.\n\nAn incremental compiler like Gradle's keeps track of which classes depend on which. When one file changes, it recompiles that file plus the classes that could be affected, and skips parsing, attribution and code generation for the rest. A change to a method body usually affects fewer classes than a change to a public signature or a constant. Constants are a special case because their values get inlined into other classes' bytecode.",
            },
            {
              question: "How does the existence of an AST as an intermediate structure benefit compiler design, versus generating bytecode directly from the token stream?",
              answer:
                "It lets every stage work on the whole structure instead of one token at a time. Type checking needs to know about things declared later in the file, like a method called before it's defined, which you can't do in one left-to-right pass over tokens.\n\nIt also keeps the stages separate. Attribution, flow analysis, annotation processors and desugaring all read or rewrite the same tree, and code generation only ever sees the final simplified version. The desugared enhanced `for` I saw in `javap` is a tree rewrite before `Gen` runs.",
            },
            {
              question: "What's the architectural reasoning behind separating lexical and syntax analysis into two distinct phases, rather than combining them?",
              answer:
                "It keeps each piece simple. The lexer deals with characters: Unicode escapes, number formats, string literals, comments. The parser can then think purely in terms of tokens and grammar rules.\n\nIn `javac` they're separate classes but not separate passes. The parser pulls tokens from the scanner one at a time. And sometimes the grammar leaks back into tokenizing: with generics, `>>` has to be treated as two closing `>`s in `List<List<String>>`, which the parser handles by splitting the token.",
            },
            {
              question: "How do `-Xlint:all` and `-Werror` change javac's default error-reporting behaviour?",
              answer:
                "`-Xlint:all` turns on every warning category, like `rawtypes`, `unchecked`, `deprecation` and `cast`. Most of them come out of attribution and flow analysis. By default `javac` just prints a summary note for some of these. `-Werror` then turns any warning into a failed compile.\n\nOn a small class with a raw `List`, plain `javac` exited 0 with a note saying \"uses unchecked or unsafe operations\". With both flags I got three warnings, then \"warnings found and -Werror specified\", exit code 1, and no class file.",
            },
            {
              question: "Why does a `.class` file contain more than just raw bytecode instructions (e.g., constant pool, method metadata)? What's this extra data used for?",
              answer:
                "Because bytecode refers to everything symbolically. An `invokevirtual` doesn't contain an address. It contains an index into the constant pool, which holds the class name, method name and descriptor. The JVM resolves that at link time, which is what allows separate compilation and dynamic loading.\n\nThe rest is there for the JVM and tools. `StackMapTable` lets the verifier check types quickly. `LineNumberTable` is how stack traces show line numbers. `BootstrapMethods` feeds `invokedynamic`, like the `StringConcatFactory` entry I saw in `javap -v` for a string concatenation.",
            },
            {
              question: "How does the compilation process differ (if at all) for code using newer syntax features like `var` (Java 10+) or records (Java 16+)? What extra semantic analysis work does type inference require?",
              answer:
                "The pipeline is the same. These features just mean more work in certain stages. `var` is handled in attribution: `javac` infers the type from the initializer and then treats the variable exactly as if you'd written it. `var fare = 120; fare = \"free\";` fails with the normal \"String cannot be converted to int\", because `fare` is simply an `int`.\n\nFor records, `javac` generates the members. When I ran `javap -p` on `record Ride(String id, int fare)`, I saw private final fields, a canonical constructor, accessors, and `toString`, `hashCode` and `equals`, those last three implemented with `invokedynamic`. Nothing new is needed in the JVM for any of it.",
            },
            {
              question: "Explain how source-launch mode (JEP 330) skips the traditional file-based compilation output while still running the compiler internally.",
              answer:
                "The launcher sees a `.java` file, calls the compiler API in-process, and gives it an in-memory file manager, so the generated bytecode goes into a map instead of onto disk. Then a custom class loader defines classes from that memory and the launcher calls `main`.\n\nEvery stage runs as usual, so you get the same compile errors. It just never writes a file. On JDK 21 the loader showed up as `com.sun.tools.javac.launcher.Main$MemoryClassLoader`. It's handy for scripts, but in real services I always build normally.",
            },
            {
              question: "If you were diagnosing a mysterious javac failure in a CI/CD pipeline that doesn't reproduce locally, what compilation-related environmental factors would you investigate first?",
              answer:
                "First the JDK: the CI image's `javac` version and whether `--release` is set, because a different JDK can accept or reject different code. Then the dependencies actually resolved in CI versus my local cache, and annotation processor versions. Lombok against a newer JDK is a classic.\n\nThen the boring environmental stuff. Case-sensitive file systems on Linux, so a file named with the wrong case works on a Mac and breaks in CI. Source encoding on JDKs before 18, which used the platform default instead of UTF-8. And stale local output, or the IDE's compiler being more lenient than the build's `javac`. A clean build locally with the same JDK usually reproduces it.",
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
              question: "Your code has both a missing semicolon on line 10 and a type mismatch on line 20. Which error appears first, and why?",
              answer:
                "Only the semicolon error shows up at all. The type mismatch isn't reported until the syntax error is fixed.\n\nI tested that exact setup: one file with a missing semicolon and then `int b = \"hello\";`. `javac` printed \"';' expected\" and \"1 error\", nothing about the types. Parsing has to succeed before attribution runs. Same thing one level down: a type error hid a \"might not have been initialized\" error until I fixed it. So the error count isn't how many problems you have left.",
            },
            {
              question: "A teammate says \"my code has no syntax errors, so it must be correct.\" What's wrong with this reasoning, given what you now know about semantic analysis?",
              answer:
                "Syntax is only the first gate. Code with perfect syntax can still fail semantic checks, like a wrong type, an unresolved name or an unassigned variable, and those are compile errors too.\n\nAnd even if it compiles, that only means `javac` found nothing wrong with the types and structure. It says nothing about logic. A method that adds a fee instead of subtracting it compiles perfectly. That's what tests are for.",
            },
            {
              question: "You accidentally reference a variable before declaring it. In which compilation phase does this get caught, and why?",
              answer:
                "In semantic analysis, during attribution, as \"cannot find symbol\" with `symbol: variable total` underneath.\n\nThe grammar is fine, so the parser has no complaint. The problem is scope: a local variable only exists from its declaration onward, so at the earlier line the name doesn't resolve to anything. Fields behave differently. Referring to a field declared lower down in the class is fine inside a method body.",
            },
            {
              question: "Your CI/CD pipeline fails at the \"compile\" stage, before any tests run. Explain to a manager why this happens before test execution, referencing the compilation phases.",
              answer:
                "Tests run against compiled code, and the compile failed, so there's nothing to test yet. It's like a document that can't be printed: you can't proofread the printout.\n\nIf they want a bit more: the compiler checks the code in stages, first that it's well-formed, then that the types and names make sense. One of those checks failed, so no runnable output was produced. The good news is that it's the cheapest kind of failure. It's caught in minutes, before anything reaches a server, and the log says exactly which file and line.",
            },
            {
              question: "Someone asks why Java's compiler catches far more mistakes than a language like JavaScript before the program ever runs. Explain this using the four-phase compilation model versus a purely interpreted language's approach.",
              answer:
                "JavaScript engines still do the first two phases. They tokenize and parse, so a real syntax error fails before anything runs. What JavaScript doesn't have is Java's static semantic analysis. Variables don't have declared types, so there's no \"incompatible types\" check, and many name problems only show up when that line actually runs.\n\nIn Java, attribution and flow analysis run over the whole program at build time, so a typo'd method name or a wrong argument type fails the build instead of failing for a user. That's also why TypeScript exists: it adds a type-checking phase in front of JavaScript.",
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
            "Write a small `Invoice.java` with a method `static int total(int price, int qty)` that returns `price * qty`, and call it from `main`.",
            "Compile and run it, then run `javap -c Invoice` and find the `imul` instruction.",
            "Add `int tax = 18 * 2;` and check in `javap` that it shows up as a single constant (`bipush 36`).",
            "Break the file four ways, one at a time: a `#` in an expression, a missing `;`, assigning a `String` to an `int`, and using a variable before declaring it. Match each message to its stage using the table above.",
            "Put two of those errors in the file at once, one syntax and one type error, and note which ones `javac` reports.",
            "Compile with `-d out` and run it with `java -cp out Invoice`, then run `java Invoice.java` in a clean directory and confirm no `.class` file appears.",
          ],
        },
        {
          type: "paragraph",
          text: "Hint for step 2: `total` should come out as `iload_0`, `iload_1`, `imul`, `ireturn`. Operands that come from parameters can't be folded.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `MODEL    1 Lexical   chars  → tokens      illegal character
         2 Syntax    tokens → AST         ';' expected
         3 Semantic  types, names, flow   incompatible types
                                          cannot find symbol
         4 Codegen   AST → .class

REAL     parse → enter → annotation processing → attribute
javac    → flow → desugar → generate

RULE     Parse errors hide type errors; type errors hide
         flow errors. Fix, recompile, repeat.

javac    folds constants (5 + 3 → bipush 8), rewrites for-each
DOES     into Iterator calls, emits invokedynamic for String +
javac    does NOT verify bytecode. The JVM verifier does
DOESN'T  that at link time.

javac X.java   compile, write X.class to disk
java X         load existing X.class, no compiling
java X.java    compile in memory, run (Java 11+)`,
          caption: "The one-screen version I'd want the night before an interview.",
        },
        {
          type: "list",
          items: [
            "In an interview, name the stage when talking about a compile error. \"It failed attribution with incompatible types\" says a lot more than \"it didn't compile\".",
            "A compile error means no `.class` file exists. A runtime error means the bytecode compiled fine and something went wrong while running it.",
            "When a note claims what bytecode looks like, check it with `javap -c`. Mine were wrong twice in this lesson alone.",
          ],
        },
      ],
    },
  ],
};
