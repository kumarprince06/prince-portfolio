export interface LessonSection {
  number: string;
  title: string;
  paragraphs?: string[];
  keyPoints?: string[];
  code?: {
    language: string;
    code: string;
  };
}

export const whatIsJava = {
  title: "What is Java?",
  lesson: "Lesson 01",
  category: "Java",

  description:
    "A complete introduction to Java, covering its history, philosophy, features, platform independence, JVM, JDK, JRE, bytecode and execution model.",

  tags: ["Core Java", "JVM", "JDK", "JRE"],

  sections: [
    {
      number: "01",
      title: "What is Java?",

      paragraphs: [
        "Java is a high-level, class-based, object-oriented programming language designed to be portable, reliable and suitable for building a wide range of software applications.",

        "Java source code is compiled into bytecode, which can then be executed by a Java Virtual Machine (JVM). This execution model is one of the major reasons Java applications can run across different operating systems.",
      ],

      keyPoints: [
        "High-level programming language",
        "Object-oriented",
        "Class-based",
        "Platform independent through the JVM",
        "Statically typed",
      ],
    },

    {
      number: "02",
      title: "History of Java",

      paragraphs: [
        "Java originated at Sun Microsystems and was designed with portability and reliability in mind.",

        "The language evolved from the Green Project and was initially developed for consumer electronic devices before becoming widely used for web, enterprise and server-side software.",
      ],

      keyPoints: [
        "Developed at Sun Microsystems",
        "Created by James Gosling and the original Java team",
        "Initially targeted portable software",
        "Later became widely used in enterprise and backend development",
      ],
    },

    {
      number: "03",
      title: "Java Features",

      paragraphs: [
        "Java provides a collection of language and platform features that make it suitable for developing maintainable and scalable applications.",
      ],

      keyPoints: [
        "Object-oriented",
        "Platform independent",
        "Robust",
        "Secure",
        "Multithreaded",
        "Portable",
        "Automatic memory management",
      ],
    },

    {
      number: "04",
      title: "Platform Independence",

      paragraphs: [
        "Java follows the principle of writing code once and running it on systems that provide a compatible Java runtime environment.",

        "Java source code is compiled into bytecode. The JVM on the target operating system interprets or compiles that bytecode for the underlying machine.",
      ],

      keyPoints: [
        "Source code is compiled",
        "Bytecode is generated",
        "JVM executes the bytecode",
        "Different operating systems can provide different JVM implementations",
      ],
    },

    {
      number: "05",
      title: "JVM, JDK and JRE",

      paragraphs: [
        "The Java ecosystem contains several important components. The JVM executes Java bytecode, the JRE provides the runtime environment, and the JDK provides tools required to develop Java applications.",
      ],

      keyPoints: [
        "JVM → executes bytecode",
        "JRE → runtime environment",
        "JDK → development kit",
      ],
    },

    {
      number: "06",
      title: "How Java Code Runs",

      paragraphs: [
        "A Java program starts as source code written in a .java file.",

        "The Java compiler converts the source code into bytecode stored in a .class file. The JVM then loads and executes that bytecode.",
      ],

      code: {
        language: "java",
        code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello Java");
    }
}`,
      },

      keyPoints: [
        ".java → source code",
        "javac → compiler",
        ".class → bytecode",
        "JVM → executes bytecode",
      ],
    },
  ],
};