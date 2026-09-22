import type { LessonSection } from "./what-is-java";

export const compilationProcess = {
  title: "Compilation Process",
  lesson: "Lesson 07",
  category: "Java",
  description:
    "Understanding how javac transforms Java source through lexical analysis, syntax analysis, semantic analysis, and bytecode generation.",
  tags: ["javac", "Bytecode", "Compiler", "AST"],
  sections: [
    {
      number: "01",
      title: "What does compilation mean?",
      paragraphs: [
        "Compilation is the process that transforms human-readable .java source code into .class bytecode that a JVM can execute. javac does not compile directly to one machine's native instructions; it stops at a portable intermediate format.",
        "Compilation is not one atomic action. It is a sequence of phases, and each phase catches a different category of problem before bytecode is written.",
      ],
      keyPoints: [
        "javac transforms source code into JVM bytecode",
        "Bytecode is portable and is not native CPU code",
        "Each compiler phase has a distinct responsibility",
      ],
    },
    {
      number: "02",
      title: "Phase 1: lexical analysis",
      paragraphs: [
        "The lexer or scanner reads source characters and groups them into tokens such as keywords, identifiers, literals, operators, and punctuation. It checks whether the individual pieces are valid Java tokens.",
        "Illegal characters, malformed numeric literals, and unterminated strings can be reported during this phase.",
      ],
      code: {
        language: "text",
        code: `int result = 5 + 3;
+
+KEYWORD(int)
+IDENTIFIER(result)
+OPERATOR(=)
+LITERAL(5)
+OPERATOR(+)
+LITERAL(3)
+SEMICOLON(;)`,
      },
      keyPoints: [
        "Input: characters",
        "Output: tokens",
        "Example error: illegal character",
      ],
    },
    {
      number: "03",
      title: "Phase 2: syntax analysis",
      paragraphs: [
        "The parser checks whether the token sequence follows Java's grammar. It builds an Abstract Syntax Tree, or AST, that represents the structure of the program.",
        "Missing semicolons, mismatched braces, and malformed method declarations are structural errors caught during parsing.",
      ],
      code: {
        language: "text",
        code: `Tokens
+  -> Parser
+  -> Abstract Syntax Tree (AST)
+
+The AST describes structures such as:
+VariableDeclaration
+  -> Type: int
+  -> Name: result
+  -> Initializer: 5 + 3`,
      },
      keyPoints: [
        "Input: token stream",
        "Output: Abstract Syntax Tree",
        "Example error: ';' expected",
      ],
    },
    {
      number: "04",
      title: "Phase 3: semantic analysis",
      paragraphs: [
        "Semantic analysis checks meaning rather than only structure. The compiler checks types, resolves variables and methods, validates scope, and confirms that members are accessible.",
        "A statement can be syntactically valid but semantically wrong. For example, int value = \"hello\"; has valid grammar but violates Java's type system.",
      ],
      keyPoints: [
        "Type checking: are values compatible with their declared types?",
        "Symbol resolution: do referenced names exist?",
        "Scope validation: is a name used where it is visible?",
        "Accessibility: can this code call or access the referenced member?",
      ],
    },
    {
      number: "05",
      title: "Phase 4: bytecode generation",
      paragraphs: [
        "After the AST passes semantic analysis, the compiler walks it and emits JVM bytecode instructions. The .class file also contains metadata such as the constant pool, method signatures, and class information.",
        "The result is a persistent bytecode file that the JVM can later load, link, initialize, interpret, and JIT-compile.",
      ],
      code: {
        language: "text",
        code: `int result = 5 + 3;
+
+iconst_5   // push 5
+iconst_3   // push 3
+iadd       // add the values
+istore_1   // store the result`,
      },
      keyPoints: [
        "Input: verified AST",
        "Output: .class bytecode and class metadata",
        "No bytecode is written when an earlier phase fails",
      ],
    },
    {
      number: "06",
      title: "The complete compilation flow",
      paragraphs: [
        "The four phases run in order. A later phase depends on the previous phase producing a valid result, so a lexical or syntax problem can prevent semantic analysis and bytecode generation from happening.",
      ],
      code: {
        language: "text",
        code: `HelloWorld.java
+      |
+      v
+Lexical analysis: characters -> tokens
+      |
+      v
+Syntax analysis: tokens -> AST
+      |
+      v
+Semantic analysis: types, symbols, scopes
+      |
+      v
+Bytecode generation -> HelloWorld.class
+      |
+      v
+JVM class loading and execution`,
      },
      keyPoints: [
        "Lexical: characters to tokens",
        "Syntax: tokens to AST",
        "Semantic: validate meaning",
        "Generation: AST to bytecode",
      ],
    },
    {
      number: "07",
      title: "javac versus java",
      paragraphs: [
        "The command javac HelloWorld.java runs the compiler phases and writes HelloWorld.class to disk. Later, java HelloWorld loads that existing class; it does not compile the source again.",
        "Java 11 source-launch mode, java HelloWorld.java, compiles and runs a source file in one command. It is different from java HelloWorld because the class is not being loaded from a previously generated class file in the normal way.",
      ],
      code: {
        language: "bash",
        code: `javac HelloWorld.java  # compile and write .class
+java HelloWorld          # load existing bytecode
+java HelloWorld.java     # Java 11+ source-launch mode`,
      },
      keyPoints: [
        "javac is a JDK compiler tool",
        "java ClassName runs existing bytecode",
        "java SourceFile.java is source-launch mode",
      ],
    },
    {
      number: "08",
      title: "Recognize compiler errors",
      paragraphs: [
        "Different error messages often point to different compiler phases. Recognizing the phase helps you decide whether to inspect characters, structure, or program meaning.",
      ],
      code: {
        language: "java",
        code: `// Lexical: illegal character in this context
+int value = 5@3;
+
+// Syntax: missing semicolon
+int count = 10
+
+// Semantic: valid structure, invalid type
+int name = "Java";`,
      },
      keyPoints: [
        "illegal character -> lexical analysis",
        "';' expected or brace mismatch -> syntax analysis",
        "incompatible types or cannot find symbol -> semantic analysis",
        "Runtime exceptions happen after successful compilation",
      ],
    },
    {
      number: "09",
      title: "Production compilation",
      paragraphs: [
        "Maven and Gradle invoke javac under the hood while adding dependency management, output directories, incremental compilation, tests, and packaging. A CI pipeline normally stops at the compile stage if any compiler phase fails because there is no valid bytecode to test.",
        "Real projects may use -d to place generated class files in a build directory and -Xlint to request additional warnings. Treating important warnings as errors can catch problems before they reach production.",
      ],
      code: {
        language: "bash",
        code: `javac -d out HelloWorld.java
+javac -Xlint:all HelloWorld.java`,
      },
      keyPoints: [
        "Compilation is a build-time cost, separate from runtime performance",
        "Maven and Gradle automate javac configuration",
        "CI should compile before tests run",
        "Incremental compilation avoids rebuilding unchanged code",
      ],
    },
    {
      number: "10",
      title: "Review and interview preparation",
      paragraphs: [
        "Remember the four phases in order: lexical analysis, syntax analysis, semantic analysis, and bytecode generation. The specific phase matters when diagnosing a compiler error.",
        "Try answering these questions: Why does javac stop at bytecode? What does an AST represent? Why can syntactically valid code fail semantic analysis? What is the difference between java HelloWorld and java HelloWorld.java?",
      ],
      keyPoints: [
        "Characters -> tokens -> AST -> verified bytecode",
        "Compile-time errors happen before a valid .class file exists",
        "Runtime errors happen after bytecode has been produced",
        "The JVM begins its class-loading process after compilation completes",
      ],
    },
  ] satisfies LessonSection[],
};
