import type { LessonSection } from "./what-is-java";

export const historyOfJava = {
  title: "History of Java",
  lesson: "Lesson 02",
  category: "Java",

  description:
    "A timeline of Java's evolution from the Green Project and Oak to the modern LTS releases that power enterprise and backend systems.",

  tags: ["Java History", "OpenJDK", "LTS", "JCP"],

  sections: [
    {
      number: "01",
      title: "Why Java's history matters",
      paragraphs: [
        "Lesson 01 introduced what Java is. This lesson explains why the language looks and behaves the way it does. Features such as generics, lambdas, streams, records, and virtual threads were added in response to real problems that developers and businesses faced at different points in Java's history.",
        "Understanding the timeline helps you connect a language feature to the problem it solves. That makes modern Java easier to learn and gives you better answers to interview questions about design decisions and backward compatibility.",
      ],
      keyPoints: [
        "Java's features were added in response to practical problems",
        "The language evolved without abandoning decades of existing code",
        "History explains why modern Java contains both old and new styles",
      ],
    },

    {
      number: "02",
      title: "The Green Project and Oak",
      paragraphs: [
        "In 1991, Sun Microsystems formed the Green Team: James Gosling, Mike Sheridan, and Patrick Naughton. Their goal was to build software for interactive television and embedded consumer devices such as set-top boxes and smart appliances.",
        "The team initially used C++, but portability, manual memory management, and language complexity made it difficult to build reliable software for many different devices. Gosling began creating a new language that was simpler, safer, and less dependent on a particular machine.",
        "The new language was called Oak, named after an oak tree outside Gosling's office. The original interactive television market did not develop as expected, so the project had to find a new direction.",
      ],
      keyPoints: [
        "1991: the Green Project begins at Sun Microsystems",
        "James Gosling leads the language work with the Green Team",
        "Oak is designed for portable embedded software",
        "The original interactive television plan fails commercially",
      ],
    },

    {
      number: "03",
      title: "From Oak to Java and the web",
      paragraphs: [
        "Between 1994 and 1995, the team saw that the growing World Wide Web had the same portability problem they had been trying to solve for embedded devices. A program downloaded by a browser needed to run safely on many unknown computers.",
        "Oak was adapted for the web and renamed Java in 1995 because the Oak name was already trademarked. Java 1.0 was officially released in 1996 with the promise Write Once, Run Anywhere. Java applets helped the language gain early attention because they could run inside web browsers.",
        "Applets are no longer used in modern browsers, but the portability and safety ideas behind them shaped the Java platform that followed.",
      ],
      keyPoints: [
        "1995: Oak is renamed Java",
        "1996: Java 1.0 is officially released",
        "The web gives Java a much larger audience",
        "Applets introduced Java to many early web users",
      ],
    },

    {
      number: "04",
      title: "The enterprise foundation",
      paragraphs: [
        "Java quickly moved beyond browsers because businesses needed portable server software, database connectivity, and reliable libraries. JDK 1.1 in 1997 introduced important capabilities such as inner classes, JavaBeans, JDBC, and RMI.",
        "J2SE 1.2, released in 1998 and commonly called Java 2, introduced the Collections Framework and Swing. Java 1.3 and 1.4 continued improving performance and added features such as assertions, regular expressions, NIO, and exception chaining.",
        "By the Java 1.4 era, Java had become a serious choice for large production systems rather than only a browser experiment.",
      ],
      keyPoints: [
        "JDBC connected Java applications to databases",
        "The Collections Framework standardized common data structures",
        "JIT compilation improved runtime performance",
        "Java became increasingly important in enterprise software",
      ],
    },

    {
      number: "05",
      title: "The major Java 5 release",
      paragraphs: [
        "Java 5.0, released in 2004, was one of the most important releases in Java's history. Sun changed the public version label from 1.5 to 5.0 to signal the size of the release.",
        "Generics moved many type errors from runtime to compile time. Before generics, a collection could contain unrelated values and a bad cast might fail only when the program was running. Enums, annotations, enhanced for-loops, and autoboxing also made everyday Java code safer and more expressive.",
      ],
      code: {
        language: "java",
        code: `// Before generics: a cast can fail at runtime
List values = new ArrayList();
values.add("Java");
String name = (String) values.get(0);

// With generics: the collection type is checked earlier
List<String> names = new ArrayList<>();
names.add("Java");
String name = names.get(0);`,
      },
      keyPoints: [
        "Java 5.0 was released in 2004",
        "Generics improved compile-time type safety",
        "Enums made fixed sets of values clearer",
        "Annotations enabled metadata used by tools and frameworks",
        "Enhanced for-loops made collection iteration simpler",
      ],
    },

    {
      number: "06",
      title: "Java 6, Oracle, and Java 7",
      paragraphs: [
        "Java SE 6 arrived in 2006 and dropped the older J2SE name. It focused largely on performance, tooling, and runtime improvements. In 2010, Oracle completed its acquisition of Sun Microsystems and became Java's primary corporate steward.",
        "Java SE 7, released in 2011, introduced try-with-resources, the diamond operator, switch statements for strings, and multi-catch exception handling. These features reduced repetitive code while preserving Java's strong type and resource-management model.",
      ],
      code: {
        language: "java",
        code: `// Java 7: resources are closed automatically
try (BufferedReader reader = Files.newBufferedReader(path)) {
    System.out.println(reader.readLine());
}

// Java 7: the compiler can infer the generic type
Map<String, Integer> scores = new HashMap<>();`,
      },
      keyPoints: [
        "2006: Java SE 6 replaces the J2SE naming",
        "2010: Oracle acquires Sun Microsystems",
        "2011: Java SE 7 is released",
        "Try-with-resources helps prevent resource leaks",
      ],
    },

    {
      number: "07",
      title: "Java 8 and the functional era",
      paragraphs: [
        "Java SE 8, released in 2014, was the second major language transformation after Java 5. It introduced lambda expressions, the Streams API, functional interfaces, Optional, and the java.time date and time API.",
        "These additions brought a more functional style to a mature object-oriented language without breaking the large amount of existing enterprise code. Java developers could choose a clearer style for collection transformations and asynchronous or event-driven operations while continuing to use older APIs.",
      ],
      code: {
        language: "java",
        code: `List<String> services = List.of("dispatch", "payments", "notifications");

List<String> longNames = services.stream()
    .filter(service -> service.length() > 8)
    .toList();`,
      },
      keyPoints: [
        "2014: Java 8 is released",
        "Lambdas allow behavior to be passed as a value",
        "Streams express collection transformations",
        "java.time provides a modern date and time API",
      ],
    },

    {
      number: "08",
      title: "The six-month release cycle and LTS",
      paragraphs: [
        "Starting with Java 9 in 2017, Java moved to a six-month release cadence. A new version is released about every six months instead of waiting several years for one large release.",
        "Not every release is intended for long-term production use. Long-Term Support (LTS) releases receive extended updates and are commonly selected by enterprises. Java 8, 11, 17, 21, and 25 are examples of LTS releases.",
        "A company does not need to adopt every release. Teams usually choose an LTS version after considering framework support, security updates, migration effort, and operational stability.",
      ],
      keyPoints: [
        "Java 9 began the six-month release cadence",
        "LTS means Long-Term Support",
        "Enterprises commonly standardize on LTS releases",
        "The newest release is not automatically the best production choice",
      ],
    },

    {
      number: "09",
      title: "The modern Java timeline",
      paragraphs: [
        "The following timeline connects the releases most useful to remember as a backend engineer. It is not a list of every Java release; it highlights the turning points that changed how developers build applications.",
      ],
      code: {
        language: "text",
        code: `1991  Green Project begins; Oak is created
1995  Oak becomes Java
1996  Java 1.0 is released
1998  J2SE 1.2; Collections Framework
2004  Java 5; Generics, enums, annotations, for-each
2010  Oracle acquires Sun Microsystems
2011  Java 7; try-with-resources and diamond operator
2014  Java 8; lambdas, streams, and java.time
2017  Java 9; six-month release cadence begins
2018  Java 11 LTS
2021  Java 17 LTS; records and sealed classes mature
2023  Java 21 LTS; virtual threads and pattern matching`,
      },
      keyPoints: [
        "Java 5 and Java 8 were major language milestones",
        "Java 9 changed the release process",
        "Java 11, 17, 21, and 25 are important LTS reference points",
      ],
    },

    {
      number: "10",
      title: "JCP, OpenJDK, and Java vendors",
      paragraphs: [
        "Java is not evolved by one company acting alone. The Java Community Process (JCP) uses Java Specification Requests, or JSRs, to propose and discuss changes with contributors from organizations such as Oracle, IBM, Red Hat, Amazon, and others.",
        "OpenJDK is the open-source reference implementation of the Java platform. Different vendors can build and support compatible JDK distributions, including Amazon Corretto, Eclipse Temurin, and Azul Zulu.",
        "For a backend engineer, the important point is that a Java application targets the Java platform and its specifications, while a team can choose a vendor distribution based on support, security, licensing, and operations.",
      ],
      keyPoints: [
        "JCP coordinates community-driven Java specifications",
        "JSRs describe proposed Java platform changes",
        "OpenJDK is the open-source reference implementation",
        "Multiple vendors provide compatible JDK distributions",
      ],
    },

    {
      number: "11",
      title: "Bytecode compatibility across versions",
      paragraphs: [
        "Every compiled class file contains a bytecode version number. When a JVM loads a class, it checks whether that bytecode version is supported by the running JVM.",
        "Older bytecode generally runs on a newer compatible JVM. The reverse is not guaranteed. If code is compiled with Java 21 and deployed to a Java 8 runtime, the JVM can throw UnsupportedClassVersionError because the older runtime does not understand the newer class-file version.",
        "This is an important production lesson: keep the JDK used by local development, CI/CD, and deployment explicitly aligned.",
      ],
      code: {
        language: "bash",
        code: `# Compile for a specific Java release
javac --release 21 HelloVersion.java

# Check the runtime used by a server
java -version`,
      },
      keyPoints: [
        "Bytecode carries a target version",
        "A newer JVM can usually run older compatible bytecode",
        "An older JVM cannot run bytecode from a newer release",
        "Mismatched build and deployment JDKs can break production releases",
      ],
    },

    {
      number: "12",
      title: "Practical lessons for backend projects",
      paragraphs: [
        "When starting a production project, select an LTS version supported by your framework and deployment environment. For example, Spring Boot 3 requires Java 17 or newer, so Java 17 or 21 is a practical baseline for many services.",
        "Keep the Java version in your local environment, CI pipeline, container image, and production runtime aligned. Also check the minimum Java version of libraries before upgrading the project JDK.",
        "Modern Java releases continue improving the runtime. Newer LTS versions include improvements such as better garbage collectors, records, sealed classes, pattern matching, and virtual threads.",
      ],
      keyPoints: [
        "Prefer an LTS release for production unless there is a clear reason not to",
        "Check framework and library compatibility before upgrading",
        "Align local, CI, container, and production Java versions",
        "Upgrade deliberately instead of treating version changes as a race",
      ],
    },

    {
      number: "13",
      title: "Common mistakes and interview review",
      paragraphs: [
        "Do not assume Java version numbers are perfectly sequential: the move from 1.4 to 5.0 was a versioning rename. Do not assume the newest Java release is automatically what every company uses; enterprises often choose an LTS version and upgrade on their own schedule.",
        "Before moving on, try answering these questions: Why did Java move from embedded devices to the web? What problem did generics solve? Why did Java 8 matter? What is the difference between OpenJDK and a vendor JDK? Why does UnsupportedClassVersionError happen?",
      ],
      keyPoints: [
        "Java was originally called Oak",
        "Generics arrived in Java 5",
        "Lambdas and streams arrived in Java 8",
        "Java 9 introduced the six-month release cadence",
        "OpenJDK has contributions from multiple vendors and the community",
        "Compile and runtime version mismatches cause UnsupportedClassVersionError",
      ],
    },
  ] satisfies LessonSection[],
};