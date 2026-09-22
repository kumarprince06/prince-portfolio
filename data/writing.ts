export interface Article {
  number: string;
  category: string;
  title: string;
  description: string;
  slug: string;
  tags: string[];
  status: "published" | "learning";
  type: "lesson" | "article";
}

export const articles: Article[] = [
  {
    number: "01",
    category: "Java",
    title: "What is Java?",
    description:
      "Understanding Java from the ground up — its history, features, platform independence, JVM, JDK, JRE, bytecode and how a Java program actually runs.",
    slug: "what-is-java",
    tags: ["Core Java", "JVM", "JDK", "JRE"],
    status: "learning",
    type: "lesson",
  },
  {
    number: "02",
    category: "Java",
    title: "History of Java",
    description:
      "How Java evolved from the Green Project and Oak into a platform for enterprise systems, modern language features, and long-term backend development.",
    slug: "history-of-java",
    tags: ["Java History", "OpenJDK", "LTS", "JCP"],
    status: "learning",
    type: "lesson",
  },
  {
    number: "03",
    category: "Java",
    title: "Java Features",
    description:
      "Understanding the major features of Java and how they influence the way Java applications are designed and executed.",
    slug: "java-features",
    tags: ["Core Java", "OOP", "Platform Independence"],
    status: "learning",
    type: "lesson",
  },
  {
    number: "04",
    category: "Java",
    title: "JVM (Java Virtual Machine)",
    description:
      "Understanding the JVM specification, class loading, runtime memory areas, bytecode verification, interpretation, JIT compilation, and garbage collection.",
    slug: "jvm",
    tags: ["JVM", "Class Loader", "Memory", "JIT"],
    status: "learning",
    type: "lesson",
  },
  {
    number: "05",
    category: "Java",
    title: "JRE (Java Runtime Environment)",
    description:
      "Understanding how the JRE combines the JVM, core Java libraries, and runtime support needed to execute Java applications.",
    slug: "jre",
    tags: ["JRE", "Runtime", "Java Libraries", "JPMS"],
    status: "learning",
    type: "lesson",
  },
  {
    number: "06",
    category: "Java",
    title: "JDK (Java Development Kit)",
    description:
      "Understanding the tools and runtime layers developers use to compile, debug, document, package, and run Java applications.",
    slug: "jdk",
    tags: ["JDK", "javac", "Tools", "OpenJDK"],
    status: "learning",
    type: "lesson",
  },
  {
    number: "07",
    category: "Java",
    title: "Compilation Process",
    description:
      "Understanding how javac transforms Java source code through lexical analysis, parsing, semantic analysis, and bytecode generation.",
    slug: "compilation-process",
    tags: ["javac", "Bytecode", "Compiler", "AST"],
    status: "learning",
    type: "lesson",
  },
  {
    number: "08",
    category: "Java",
    title: "Class Loading",
    description:
      "Understanding lazy class loading, parent delegation, class-loader caching, custom loaders, and how frameworks isolate and discover classes.",
    slug: "class-loading",
    tags: ["Class Loader", "JVM", "Reflection", "Plugins"],
    status: "learning",
    type: "lesson",
  },
];