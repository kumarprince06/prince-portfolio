import type { LessonSection } from "./what-is-java";

export const classLoading = {
  title: "Class Loading",
  lesson: "Lesson 08",
  category: "Java",
  description:
    "Understanding lazy class loading, parent delegation, class-loader caching, custom loaders, and how frameworks discover and isolate classes.",
  tags: ["Class Loader", "JVM", "Reflection", "Plugins"],
  sections: [
    {
      number: "01",
      title: "What is class loading?",
      paragraphs: [
        "Class loading is the JVM mechanism that locates, reads, verifies, and prepares a .class file for execution. It transforms bytecode stored on disk or in memory into a usable class representation inside the JVM.",
        "Class loading is not only a startup step. Classes are normally loaded lazily, on demand, as they are first actively used. A large application can contain many classes that are never loaded during a particular run.",
      ],
      keyPoints: [
        "The Class Loader locates and reads class bytes",
        "Loading is usually lazy and reference-driven",
        "The full load-link-initialize flow can happen throughout execution",
      ],
    },
    {
      number: "02",
      title: "Why dynamic loading exists",
      paragraphs: [
        "Java's original applet model needed browsers to download classes from remote servers as users visited pages. The runtime could not require every possible class to be installed ahead of time.",
        "The same capability later enabled plugin architectures, application servers, dependency injection frameworks, hot reloading, and modular systems. Spring classpath scanning and Tomcat application isolation are practical examples of class-loading behavior in backend software.",
      ],
      keyPoints: [
        "Dynamic loading supports code that is not known at compile time",
        "Plugins can be discovered and loaded on demand",
        "Frameworks use class loading and reflection for component discovery",
        "Application servers use loaders to isolate deployed applications",
      ],
    },
    {
      number: "03",
      title: "Lazy loading triggers",
      paragraphs: [
        "The JVM does not load every class simply because its name appears in source code. A class is typically loaded when it is actively used, such as when an object is created, a static member is accessed, a subclass is loaded, or reflection requests it.",
        "Once a class has been loaded by a particular class loader, its Class object is cached and reused for future references in that loader context.",
      ],
      keyPoints: [
        "new SomeClass() can trigger loading",
        "Static field or method access can trigger loading",
        "Class.forName can explicitly request loading",
        "Loading a subclass requires its superclass to be available",
        "A loaded class is cached per class-loader context",
      ],
    },
    {
      number: "04",
      title: "The modern class-loader hierarchy",
      paragraphs: [
        "Java 9 and later use a Bootstrap Class Loader, a Platform Class Loader, and an Application or System Class Loader. Custom class loaders can be added for specialized behavior.",
        "The Bootstrap loader loads core platform classes and is implemented in native code, so String.class.getClassLoader() commonly returns null. The Platform loader handles platform modules, while the Application loader normally loads classes from the application classpath.",
      ],
      keyPoints: [
        "Bootstrap: core classes such as String and Object",
        "Platform: platform modules such as java.sql and java.xml",
        "Application/System: classes from the application classpath",
        "Platform Class Loader replaced the older Extension Class Loader",
      ],
    },
    {
      number: "05",
      title: "Parent Delegation Model",
      paragraphs: [
        "When a class loader receives a request, it first asks its parent to load the class. Only if the parent cannot find it does the child try to load it itself.",
        "This hierarchy protects core classes and keeps class identity predictable. Application code cannot simply replace java.lang.String with a class of the same name because the parent loaders get the first opportunity to provide the trusted platform class.",
      ],
      code: {
        language: "text",
        code: `Application Loader receives request
+          |
+          v
+Ask Platform Loader first
+          |
+          v
+Ask Bootstrap Loader first
+          |
+          v
+If parent cannot load it, child searches its own source`,
      },
      keyPoints: [
        "Parents are asked before children",
        "The model protects core platform classes",
        "Delegation occurs when the class is requested",
      ],
    },
    {
      number: "06",
      title: "Class identity and caching",
      paragraphs: [
        "Within one class-loader context, a class is loaded once and its Class object is reused. But the JVM identifies a type by both its fully qualified name and its defining class loader.",
        "If two different class loaders load com.example.Plugin independently, the JVM treats those as different types. An object from one loader's version cannot be cast to the other loader's version, even when the source code and name are identical.",
      ],
      keyPoints: [
        "Same name plus same defining loader means the same type",
        "Same name plus different defining loaders means different types",
        "Class-loader identity explains surprising ClassCastException errors",
        "Caching avoids repeating the full loading process",
      ],
    },
    {
      number: "07",
      title: "Lazy loading in code",
      paragraphs: [
        "The following example makes lazy loading observable. The Helper class is not instantiated because the branch is never entered, so its static initializer does not run during this execution.",
      ],
      code: {
        language: "java",
        code: `public class LazyLoadingDemo {
    public static void main(String[] args) {
        System.out.println("Program started");
+
+        if (false) {
+            new Helper();
+        }
+
+        System.out.println("Program ended");
+    }
+}
+
+class Helper {
+    static {
+        System.out.println("Helper initialized");
+    }
+}`,
      },
      keyPoints: [
        "The entry-point class must load first",
        "Helper is not actively used in this run",
        "The Helper static block does not print",
        "Adding new Helper() to an executed path triggers initialization",
      ],
    },
    {
      number: "08",
      title: "Explicit loading with reflection",
      paragraphs: [
        "Class.forName loads a class by a name held in a String and, by default, initializes it. This was historically common for JDBC driver registration and remains useful for plugin and reflective systems.",
        "The overload that accepts false can load a class without initializing it immediately. This is an advanced tool and should be used only when the initialization timing is understood.",
      ],
      code: {
        language: "java",
        code: `Class<?> loaded = Class.forName("com.example.Plugin");
+
+Class<?> withoutInitialization = Class.forName(
+    "com.example.Plugin",
+    false,
+    ClassLoader.getSystemClassLoader()
+);`,
      },
      keyPoints: [
        "Class.forName loads by fully qualified name",
        "The common overload also initializes the class",
        "A false initialization flag delays initialization",
        "Reflection is common in frameworks and plugin systems",
      ],
    },
    {
      number: "09",
      title: "Custom class loaders",
      paragraphs: [
        "A custom ClassLoader can load classes from a database, network, encrypted source, or special module directory. Application servers can give each deployed application a separate loader so different versions of the same library do not collide.",
        "Custom loading is powerful but introduces security, lifecycle, and memory concerns. A class loader that remains reachable can keep all of its loaded classes and related objects alive, contributing to Metaspace pressure.",
      ],
      keyPoints: [
        "Custom loaders can define specialized class sources",
        "Tomcat-style isolation uses separate loaders for applications",
        "Plugins can be loaded without hardcoding every implementation",
        "Loader lifecycle matters for memory and redeployment",
      ],
    },
    {
      number: "10",
      title: "Class loading in frameworks",
      paragraphs: [
        "Spring scans the classpath and uses reflection to discover components such as classes annotated with @Component or @Service. Application servers use class-loader boundaries to isolate applications, and development tools can use new loader instances for hot reloading.",
        "These features work because class loading is dynamic, lazy, and extensible rather than a one-time static linking step.",
      ],
      keyPoints: [
        "Spring component scanning depends on dynamic discovery",
        "JDBC historically used Class.forName for driver registration",
        "Tomcat isolates web applications with class-loader boundaries",
        "Hot-reloading tools can replace a loader instead of redefining every class",
      ],
    },
    {
      number: "11",
      title: "Class-loading failures",
      paragraphs: [
        "ClassNotFoundException commonly occurs when code explicitly requests a class and the loader cannot find it. NoClassDefFoundError commonly means a class was present during compilation but is unavailable or could not be initialized when needed at runtime.",
        "When debugging, check the classpath or module path, dependency packaging, the active class loader, and whether multiple versions of a library are being loaded by different loaders.",
      ],
      keyPoints: [
        "ClassNotFoundException: explicit lookup failed",
        "NoClassDefFoundError: required class is missing at runtime",
        "ClassCastException can result from the same name loaded by different loaders",
        "Inspect classpath, module path, packaging, and loader identity",
      ],
    },
    {
      number: "12",
      title: "Performance and review",
      paragraphs: [
        "Lazy loading avoids paying the cost of reading, verifying, and initializing classes that a program never uses. The tradeoff is a small cost the first time a class is referenced, which can contribute to cold-start latency alongside JVM and JIT warmup.",
        "Remember the core rule: classes load lazily and are cached per class loader. A strong explanation should also mention parent delegation and the fact that the same class name can represent different types under different loaders.",
      ],
      keyPoints: [
        "Classes are loaded on demand, not all at startup",
        "Loaded Class objects are cached for future references",
        "Parent delegation protects platform classes",
        "Custom loaders enable plugins and application isolation",
        "Same name plus different loader means a different JVM type",
      ],
    },
  ] satisfies LessonSection[],
};
