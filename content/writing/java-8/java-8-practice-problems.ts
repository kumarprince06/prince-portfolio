import type { Lesson } from "../types";

export const java8PracticeProblems: Lesson = {
  slug: "java-8-practice-problems",
  date: "2026-10-29",
  title: "Java 8 Practice Problems",
  description:
    "60 hands-on Java 8 problems asked in Indian backend interviews and coding rounds, from streams and collectors to Optional, java.time and CompletableFuture, each with a tested solution and its real output.",
  tags: ["Java 8", "Streams", "Practice", "Interview"],
  sections: [
    {
      title: "How to Use This Page",
      blocks: [
        { type: "paragraph", text: "This page is a practice set, not a lesson. There are 60 problems covering every Java 8 feature I get asked about: lambdas, functional interfaces, method references, default and static methods, Streams, Collectors, Optional, the Date/Time API, CompletableFuture, and the small helpers Java 8 added to Map and List." },
        { type: "paragraph", text: "Each problem starts with an everyday picture (a tea stall, a cab ride, a bank queue), then the task. Right after the task comes my solution and the real output from running it." },
        { type: "list", ordered: true, items: ["Read the task and **stop**. Cover the code with your hand or scroll so only the task is visible.", "Write your own answer in an IDE or `jshell`, using the shared data model below.", "Run it, then compare your output with mine. Same output with different code is fine, there's usually more than one good answer.", "Read the key idea line under the output. That's the part worth remembering for interviews."] },
        { type: "callout", tone: "tip", title: "How the levels work", text: "Levels 1 to 3 are the stream questions almost every Java backend interview starts with. Levels 4 to 6 cover the rest of Java 8. Level 7 is mixed favourites, and Level 8 is small tasks of the kind I write at work. Harder problems have a **Hint** box before the solution." },
      ],
    },
    {
      title: "The Data Model",
      blocks: [
        { type: "paragraph", text: "Most problems use the same two lists: 10 employees and 12 cab trips. I wrote them once here so every solution can just say `employees.stream()` or `trips.stream()`." },
        { type: "code", language: "java", title: "Data.java", code: `import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

public class Data {
    record Employee(int id, String name, String dept, double salary,
                    int age, String gender, List<String> skills) {}

    record Trip(String id, String driverId, String city, double fare,
                String status, LocalDate date) {}

    static final List<Employee> employees = Arrays.asList(
        new Employee(1, "Aarav", "Engineering", 120000, 32, "M", Arrays.asList("Java", "Spring", "AWS")),
        new Employee(2, "Priya", "Engineering", 135000, 29, "F", Arrays.asList("Java", "Kafka", "Docker")),
        new Employee(3, "Rohan", "Sales", 60000, 41, "M", Arrays.asList("Negotiation", "Excel")),
        new Employee(4, "Sneha", "HR", 55000, 26, "F", Arrays.asList("Recruiting", "Excel")),
        new Employee(5, "Vikram", "Engineering", 135000, 45, "M", Arrays.asList("Go", "Kubernetes", "AWS")),
        new Employee(6, "Ananya", "Sales", 72000, 35, "F", Arrays.asList("Excel", "CRM")),
        new Employee(7, "Karan", "Finance", 90000, 38, "M", Arrays.asList("Excel", "SQL")),
        new Employee(8, "Meera", "Finance", 98000, 30, "F", Arrays.asList("SQL", "Python")),
        new Employee(9, "Arjun", "HR", 50000, 24, "M", Arrays.asList("Recruiting")),
        new Employee(10, "Divya", "Engineering", 110000, 27, "F", Arrays.asList("Java", "React", "Docker"))
    );

    static final List<Trip> trips = Arrays.asList(
        new Trip("T1", "D1", "Kolkata", 250, "COMPLETED", LocalDate.of(2026, 10, 20)),
        new Trip("T2", "D2", "Kolkata", 180, "CANCELLED", LocalDate.of(2026, 10, 20)),
        new Trip("T3", "D1", "Kolkata", 320, "COMPLETED", LocalDate.of(2026, 10, 20)),
        new Trip("T4", "D3", "Bengaluru", 410, "COMPLETED", LocalDate.of(2026, 10, 20)),
        new Trip("T5", "D2", "Kolkata", 150, "COMPLETED", LocalDate.of(2026, 10, 21)),
        new Trip("T6", "D3", "Bengaluru", 520, "COMPLETED", LocalDate.of(2026, 10, 21)),
        new Trip("T7", "D4", "Mumbai", 600, "CANCELLED", LocalDate.of(2026, 10, 21)),
        new Trip("T8", "D4", "Mumbai", 380, "COMPLETED", LocalDate.of(2026, 10, 21)),
        new Trip("T9", "D1", "Kolkata", 290, "COMPLETED", LocalDate.of(2026, 10, 22)),
        new Trip("T10", "D3", "Bengaluru", 275, "CANCELLED", LocalDate.of(2026, 10, 22)),
        new Trip("T11", "D4", "Mumbai", 450, "COMPLETED", LocalDate.of(2026, 10, 22)),
        new Trip("T12", "D2", "Kolkata", 200, "COMPLETED", LocalDate.of(2026, 10, 22))
    );

    // Pretends to be a slow network call (used in Level 6)
    static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}` },
        { type: "paragraph", text: "Two salaries tie on purpose (Priya and Vikram, 1,35,000) because tie handling is where most \"highest salary\" answers go wrong. Some trips are CANCELLED for the same reason: real data always has rows to filter out." },
        { type: "callout", tone: "note", title: "Records are Java 16, the rest is Java 8", text: "I used `record` to keep the model short. In a real Java 8 codebase, `Employee` would be a class with private final fields, a constructor and getters, and `e.name()` would be `e.getName()`. Everything else on this page is Java 8 unless I say which newer version a line needs." },
        { type: "paragraph", text: "Every solution class extends `Data` and starts with these imports. I left them out of the solutions below to keep them short:" },
        { type: "code", language: "java", code: `import java.time.*;
import java.time.format.*;
import java.time.temporal.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.*;
import java.util.stream.*;` },
        { type: "paragraph", text: "I compiled and ran every solution on JDK 21. The output blocks are copied from those runs." },
      ],
    },
    {
      title: "Level 1: Warm-up",
      blocks: [
        { type: "paragraph", text: "These are the stream basics: filter, map, sort, collect. If I can write these without looking anything up, the rest of the page is just combinations of them." },
        { type: "heading", text: "Problem 1: High earners, sorted by name" },
        { type: "paragraph", text: "Think of a stream as a conveyor belt at a sorting office: items roll past, I throw some away (`filter`), change others (`map`), line them up (`sorted`) and box them at the end (`collect`)." },
        { type: "paragraph", text: "Task: print the names of everyone who earns more than 1,00,000, in alphabetical order." },
        { type: "code", language: "java", code: `List<String> highEarners = employees.stream()
        .filter(e -> e.salary() > 100000)
        .map(Employee::name)
        .sorted()
        .collect(Collectors.toList());

System.out.println(highEarners);` },
        { type: "output", text: `[Aarav, Divya, Priya, Vikram]` },
        { type: "paragraph", text: "**Key idea:** filter, then map, then sort, then collect: this exact chain is the backbone of most stream questions. In Java 16+ I can write `.toList()` instead of `.collect(Collectors.toList())`, but that list is unmodifiable." },
        { type: "heading", text: "Problem 2: Salary count, total, min, max and average" },
        { type: "paragraph", text: "At the end of the day a tea stall owner wants five numbers from the cash book: how many sales, the total, the smallest, the biggest and the average. Walking through the book five times would be silly." },
        { type: "paragraph", text: "Task: get the count, sum, min, max and average salary in one pass." },
        { type: "code", language: "java", code: `DoubleSummaryStatistics stats = employees.stream()
        .mapToDouble(Employee::salary)
        .summaryStatistics();

System.out.println("count = " + stats.getCount());
System.out.println("sum   = " + stats.getSum());
System.out.println("min   = " + stats.getMin());
System.out.println("max   = " + stats.getMax());
System.out.printf("avg   = %.2f%n", stats.getAverage());` },
        { type: "output", text: `count = 10
sum   = 925000.0
min   = 50000.0
max   = 135000.0
avg   = 92500.00` },
        { type: "paragraph", text: "**Key idea:** `mapToDouble` gives a `DoubleStream`, and `summaryStatistics()` collects all five numbers in a single pass. `IntStream` and `LongStream` have the same method." },
        { type: "heading", text: "Problem 3: Join names into one line" },
        { type: "paragraph", text: "When a lift reaches the ground floor, the display shows everyone waiting as one line: \"A, B, C\". That's what `Collectors.joining` does for strings." },
        { type: "paragraph", text: "Task: print the HR and Finance employees' names in uppercase as one string like `[A, B]`." },
        { type: "code", language: "java", code: `String names = employees.stream()
        .filter(e -> e.dept().equals("HR") || e.dept().equals("Finance"))
        .map(e -> e.name().toUpperCase())
        .collect(Collectors.joining(", ", "[", "]"));

System.out.println(names);` },
        { type: "output", text: `[SNEHA, KARAN, MEERA, ARJUN]` },
        { type: "paragraph", text: "**Key idea:** `joining(delimiter, prefix, suffix)` builds the string with a `StringBuilder` inside, so no manual comma handling and no trailing comma bug." },
        { type: "heading", text: "Problem 4: Find duplicates in a list" },
        { type: "paragraph", text: "A bank token machine should never print the same token twice. If I want to catch repeats, I keep a register of tokens I've already seen: the first time a number appears it goes in the register, and the second time it's a duplicate." },
        { type: "paragraph", text: "Task: find the duplicate numbers in `[4, 7, 1, 4, 9, 7, 7, 2]`." },
        { type: "code", language: "java", code: `List<Integer> nums = Arrays.asList(4, 7, 1, 4, 9, 7, 7, 2);

// Way 1: Set.add returns false when the item is already there
Set<Integer> seen = new HashSet<>();
Set<Integer> duplicates = nums.stream()
        .filter(n -> !seen.add(n))
        .collect(Collectors.toCollection(TreeSet::new));
System.out.println(duplicates);

// Way 2: count every number, keep the ones seen more than once
Set<Integer> viaCounting = nums.stream()
        .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
        .entrySet().stream()
        .filter(entry -> entry.getValue() > 1)
        .map(Map.Entry::getKey)
        .collect(Collectors.toCollection(TreeSet::new));
System.out.println(viaCounting);` },
        { type: "output", text: `[4, 7]
[4, 7]` },
        { type: "paragraph", text: "**Key idea:** Way 1 is O(n) and short, but the lambda changes outside state, so it's unsafe with `parallelStream()`. Way 2 is pure and also tells me how many times each number appeared. Interviewers usually ask for both." },
        { type: "heading", text: "Problem 5: First match, any match, all match" },
        { type: "paragraph", text: "At a railway counter, the clerk stops at the first senior citizen in the queue. He doesn't check the whole queue. Streams work the same way: `findFirst` and `anyMatch` stop as soon as they have an answer." },
        { type: "paragraph", text: "Task: find the first employee older than 40, check if anyone works in Marketing, and check that everyone is an adult." },
        { type: "code", language: "java", code: `Optional<Employee> firstSenior = employees.stream()
        .filter(e -> e.age() > 40)
        .findFirst();
System.out.println(firstSenior.map(Employee::name).orElse("none"));

boolean anyMarketing = employees.stream().anyMatch(e -> e.dept().equals("Marketing"));
boolean allAdults = employees.stream().allMatch(e -> e.age() >= 18);
boolean noInterns = employees.stream().noneMatch(e -> e.salary() < 20000);
System.out.println(anyMarketing + " " + allAdults + " " + noInterns);` },
        { type: "output", text: `Rohan
false true true` },
        { type: "paragraph", text: "**Key idea:** These are short-circuiting terminal operations. `findFirst` returns an `Optional` because the stream might have no match at all." },
        { type: "heading", text: "Problem 6: Clean up messy input" },
        { type: "paragraph", text: "A signup form gives me city names typed by real people: extra spaces, empty boxes, nulls and the same city in different cases." },
        { type: "paragraph", text: "Task: from `[\" Kolkata\", null, \"mumbai\", \"\", \"KOLKATA\", \"  \", \"Pune \"]` build a clean, lowercase, duplicate-free list." },
        { type: "code", language: "java", code: `List<String> raw = Arrays.asList(" Kolkata", null, "mumbai", "", "KOLKATA", "  ", "Pune ");

List<String> cities = raw.stream()
        .filter(Objects::nonNull)
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .map(String::toLowerCase)
        .distinct()
        .collect(Collectors.toList());

System.out.println(cities);` },
        { type: "output", text: `[kolkata, mumbai, pune]` },
        { type: "paragraph", text: "**Key idea:** Order matters: drop nulls first, then trim, then drop empties. Java 11 added `String::isBlank` and `String::strip` which would shorten this a bit." },
        { type: "heading", text: "Problem 7: Sort by salary (high to low), then by name" },
        { type: "paragraph", text: "A cricket points table sorts by points first and, when two teams tie, by net run rate. Two-level sorting is the same idea." },
        { type: "paragraph", text: "Task: list the top 4 earners, highest salary first; when salaries tie, sort by name." },
        { type: "code", language: "java", code: `employees.stream()
        .sorted(Comparator.comparingDouble(Employee::salary).reversed()
                .thenComparing(Employee::name))
        .limit(4)
        .forEach(e -> System.out.println(e.name() + " " + e.salary()));` },
        { type: "output", text: `Priya 135000.0
Vikram 135000.0
Aarav 120000.0
Divya 110000.0` },
        { type: "paragraph", text: "**Key idea:** `Comparator.comparing...` builds a comparator from a getter, `reversed()` flips it and `thenComparing` breaks ties. Note that `reversed()` applies to everything before it in the chain, so I put it before `thenComparing`." },
        { type: "heading", text: "Problem 8: Prime numbers up to 30" },
        { type: "paragraph", text: "To check if 29 is prime I only try dividing it by 2, 3, 4 and 5, because any factor bigger than its square root would pair with one smaller than it." },
        { type: "paragraph", text: "Task: print all primes from 2 to 30 using `IntStream`." },
        { type: "code", language: "java", code: `List<Integer> primes = IntStream.rangeClosed(2, 30)
        .filter(n -> IntStream.rangeClosed(2, (int) Math.sqrt(n))
                .noneMatch(d -> n % d == 0))
        .boxed()
        .collect(Collectors.toList());

System.out.println(primes);` },
        { type: "output", text: `[2, 3, 5, 7, 11, 13, 17, 19, 23, 29]` },
        { type: "paragraph", text: "**Key idea:** `IntStream.rangeClosed` replaces the classic for loop, and `noneMatch` stops at the first divisor. `boxed()` turns `int` into `Integer` so I can collect into a `List`." },
      ],
    },
    {
      title: "Level 2: Grouping and Collectors",
      blocks: [
        { type: "paragraph", text: "`groupingBy` is SQL's `GROUP BY` for Java. Almost every \"per department\", \"per city\" or \"per day\" question is a `groupingBy` with a second collector inside it that says what to do with each group." },
        { type: "heading", text: "Problem 9: Count employees per department" },
        { type: "paragraph", text: "A school principal asks: \"How many students in each class?\" The teacher puts children into class groups, then counts each group." },
        { type: "paragraph", text: "Task: count employees per department, with departments in alphabetical order." },
        { type: "code", language: "java", code: `Map<String, Long> countByDept = employees.stream()
        .collect(Collectors.groupingBy(Employee::dept, TreeMap::new, Collectors.counting()));

System.out.println(countByDept);` },
        { type: "output", text: `{Engineering=4, Finance=2, HR=2, Sales=2}` },
        { type: "paragraph", text: "**Key idea:** `groupingBy(key, mapFactory, downstream)`. Plain `groupingBy` gives a `HashMap` with no fixed order, so I pass `TreeMap::new` whenever the output order matters." },
        { type: "heading", text: "Problem 10: Average salary per department" },
        { type: "paragraph", text: "Same grouping as the last problem, but instead of counting heads I want the average pay in each group." },
        { type: "paragraph", text: "Task: print the average salary per department." },
        { type: "code", language: "java", code: `Map<String, Double> avgByDept = employees.stream()
        .collect(Collectors.groupingBy(Employee::dept, TreeMap::new,
                Collectors.averagingDouble(Employee::salary)));

avgByDept.forEach((dept, avg) -> System.out.printf("%-12s %.2f%n", dept, avg));` },
        { type: "output", text: `Engineering  125000.00
Finance      94000.00
HR           52500.00
Sales        66000.00` },
        { type: "paragraph", text: "**Key idea:** Only the downstream collector changed: `counting()` became `averagingDouble(...)`. Others in the same family: `summingDouble`, `minBy`, `maxBy`, `mapping`, `toSet`." },
        { type: "heading", text: "Problem 11: Highest-paid employee in each department" },
        { type: "paragraph", text: "Every class has a topper. Group the class, then pick the student with the highest marks in each group." },
        { type: "paragraph", text: "Task: print the name of the highest-paid employee in each department." },
        { type: "callout", tone: "tip", title: "Hint", text: "`maxBy` returns an `Optional` per group. `collectingAndThen` lets me unwrap it right inside the collector. Or use `toMap` with `BinaryOperator.maxBy` and skip the Optional completely." },
        { type: "code", language: "java", code: `// Way 1: groupingBy + maxBy, then unwrap the Optional
Map<String, String> topByDept = employees.stream()
        .collect(Collectors.groupingBy(Employee::dept, TreeMap::new,
                Collectors.collectingAndThen(
                        Collectors.maxBy(Comparator.comparingDouble(Employee::salary)),
                        best -> best.get().name())));
System.out.println(topByDept);

// Way 2: toMap that keeps the bigger one when two land on the same key
Map<String, Employee> top = employees.stream()
        .collect(Collectors.toMap(Employee::dept, Function.identity(),
                BinaryOperator.maxBy(Comparator.comparingDouble(Employee::salary)),
                TreeMap::new));
top.forEach((dept, e) -> System.out.println(dept + " -> " + e.name()));` },
        { type: "output", text: `{Engineering=Priya, Finance=Meera, HR=Sneha, Sales=Ananya}
Engineering -> Priya
Finance -> Meera
HR -> Sneha
Sales -> Ananya` },
        { type: "paragraph", text: "**Key idea:** Priya and Vikram both earn 1,35,000. On a tie, `maxBy` keeps the one it saw first, so Priya wins. If the interviewer wants all toppers, group by salary instead (see the \"Nth highest salary\" problem in Level 7)." },
        { type: "heading", text: "Problem 12: Split employees into two groups" },
        { type: "paragraph", text: "At a toll plaza there are two lanes: FASTag and cash. Every car goes into exactly one of them. `partitioningBy` is a group-by with only two keys, `true` and `false`." },
        { type: "paragraph", text: "Task: split names into people earning above 1,00,000 and everyone else." },
        { type: "code", language: "java", code: `Map<Boolean, List<String>> split = employees.stream()
        .collect(Collectors.partitioningBy(e -> e.salary() > 100000,
                Collectors.mapping(Employee::name, Collectors.toList())));

System.out.println("Above 1L: " + split.get(true));
System.out.println("Others:   " + split.get(false));` },
        { type: "output", text: `Above 1L: [Aarav, Priya, Vikram, Divya]
Others:   [Rohan, Sneha, Ananya, Karan, Meera, Arjun]` },
        { type: "paragraph", text: "**Key idea:** `partitioningBy` always has both keys, even if one list is empty. `groupingBy` with a boolean key would leave a key out. `mapping` changes each item before it goes into the group's list." },
        { type: "heading", text: "Problem 13: Top 2 earners in each department" },
        { type: "paragraph", text: "In a food delivery app I might show \"top 2 dishes per restaurant\". Group, then sort each group and take the first two." },
        { type: "paragraph", text: "Task: print the top 2 earners per department." },
        { type: "callout", tone: "tip", title: "Hint", text: "Collect each group into a list first, then use `collectingAndThen` to sort that list and cut it to 2." },
        { type: "code", language: "java", code: `Map<String, List<String>> top2 = employees.stream()
        .collect(Collectors.groupingBy(Employee::dept, TreeMap::new,
                Collectors.collectingAndThen(Collectors.toList(), list -> list.stream()
                        .sorted(Comparator.comparingDouble(Employee::salary).reversed())
                        .limit(2)
                        .map(Employee::name)
                        .collect(Collectors.toList()))));

top2.forEach((dept, names) -> System.out.println(dept + " " + names));` },
        { type: "output", text: `Engineering [Priya, Vikram]
Finance [Meera, Karan]
HR [Sneha, Arjun]
Sales [Ananya, Rohan]` },
        { type: "paragraph", text: "**Key idea:** `collectingAndThen(collector, finisher)` runs a last step on each group's result. Sorting each group costs O(k log k) for a group of size k, which is fine for normal data sizes." },
        { type: "heading", text: "Problem 14: Second highest salary" },
        { type: "paragraph", text: "In a race, if two runners finish together they share gold, and the next runner gets silver. So \"second highest salary\" means the second highest distinct value." },
        { type: "paragraph", text: "Task: find the second highest salary and who earns it." },
        { type: "callout", tone: "tip", title: "Hint", text: "`distinct()` before `sorted()`, then `skip(1)`. For the Nth highest, use `skip(n - 1)`." },
        { type: "code", language: "java", code: `Optional<Double> second = employees.stream()
        .map(Employee::salary)
        .distinct()
        .sorted(Comparator.reverseOrder())
        .skip(1)
        .findFirst();
System.out.println(second);

List<String> whoEarnsIt = employees.stream()
        .filter(e -> second.isPresent() && e.salary() == second.get())
        .map(Employee::name)
        .collect(Collectors.toList());
System.out.println(whoEarnsIt);` },
        { type: "output", text: `Optional[120000.0]
[Aarav]` },
        { type: "paragraph", text: "**Key idea:** Without `distinct()` the answer would be 1,35,000 again (Vikram's copy of Priya's salary), which is the classic wrong answer. The result is an `Optional` because a company with one salary has no second highest." },
        { type: "heading", text: "Problem 15: Male and female count in each department" },
        { type: "paragraph", text: "A school report wants boys and girls in each class. That's a group inside a group." },
        { type: "paragraph", text: "Task: count employees by department, then by gender." },
        { type: "code", language: "java", code: `Map<String, Map<String, Long>> byDeptAndGender = employees.stream()
        .collect(Collectors.groupingBy(Employee::dept, TreeMap::new,
                Collectors.groupingBy(Employee::gender, TreeMap::new, Collectors.counting())));

byDeptAndGender.forEach((dept, counts) -> System.out.println(dept + " " + counts));` },
        { type: "output", text: `Engineering {F=2, M=2}
Finance {F=1, M=1}
HR {F=1, M=1}
Sales {F=1, M=1}` },
        { type: "paragraph", text: "**Key idea:** The downstream collector of a `groupingBy` can be another `groupingBy`. Two levels is common in interviews, three levels usually means a small class would read better." },
        { type: "heading", text: "Problem 16: Cheapest and costliest trip in one pass" },
        { type: "paragraph", text: "A cab company wants the cheapest and the most expensive ride of the week. I don't want to loop over the rides twice." },
        { type: "paragraph", text: "Task: find both trips in one collect." },
        { type: "code", language: "java", code: `// Java 12+: teeing sends every item to two collectors and merges the results
String cheapAndCostly = trips.stream().collect(Collectors.teeing(
        Collectors.minBy(Comparator.comparingDouble(Trip::fare)),
        Collectors.maxBy(Comparator.comparingDouble(Trip::fare)),
        (min, max) -> "cheapest " + min.get().id() + ", costliest " + max.get().id()));
System.out.println(cheapAndCostly);

// Java 8: summary statistics gives the values (not the trips) in one pass
DoubleSummaryStatistics fares = trips.stream().mapToDouble(Trip::fare).summaryStatistics();
System.out.println("min fare " + fares.getMin() + ", max fare " + fares.getMax());` },
        { type: "output", text: `cheapest T5, costliest T7
min fare 150.0, max fare 600.0` },
        { type: "paragraph", text: "**Key idea:** `Collectors.teeing` arrived in Java 12. In plain Java 8, `summaryStatistics()` covers the numbers, and for the objects I'd use a simple loop or `reduce` twice." },
        { type: "heading", text: "Problem 17: All distinct skills (flatMap)" },
        { type: "paragraph", text: "Each employee carries a small bag of skills. I want to tip all the bags onto one table and see the unique items. `flatMap` is the \"tip the bags out\" step." },
        { type: "paragraph", text: "Task: print all distinct skills across the company, sorted." },
        { type: "code", language: "java", code: `List<String> allSkills = employees.stream()
        .flatMap(e -> e.skills().stream())
        .distinct()
        .sorted()
        .collect(Collectors.toList());

System.out.println(allSkills);` },
        { type: "output", text: `[AWS, CRM, Docker, Excel, Go, Java, Kafka, Kubernetes, Negotiation, Python, React, Recruiting, SQL, Spring]` },
        { type: "paragraph", text: "**Key idea:** `map` would give me a stream of lists. `flatMap` turns each list into a stream and joins them, so I get one stream of strings." },
        { type: "heading", text: "Problem 18: Most common skill" },
        { type: "paragraph", text: "A shop owner wants to know the best-selling item of the week. Count each item, then pick the biggest count." },
        { type: "paragraph", text: "Task: find the skill that the most employees have." },
        { type: "code", language: "java", code: `Map<String, Long> skillCount = employees.stream()
        .flatMap(e -> e.skills().stream())
        .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

Map.Entry<String, Long> mostCommon = skillCount.entrySet().stream()
        .max(Map.Entry.comparingByValue())
        .get();

System.out.println(mostCommon.getKey() + " (" + mostCommon.getValue() + " people)");` },
        { type: "output", text: `Excel (4 people)` },
        { type: "paragraph", text: "**Key idea:** flatMap, then groupingBy + counting, then max by value. This same three-step shape answers \"most frequent word\", \"most ordered dish\" and \"busiest city\"." },
        { type: "heading", text: "Problem 19: toMap and duplicate keys" },
        { type: "paragraph", text: "A phone contacts list can't have two entries with the same name unless I decide what to do: keep the old number, keep the new one, or combine them. `toMap` has the same rule." },
        { type: "paragraph", text: "Task: build `id -> name`, then try `dept -> name` and see what happens, then fix it by summing salaries per department." },
        { type: "code", language: "java", code: `Map<Integer, String> nameById = employees.stream()
        .collect(Collectors.toMap(Employee::id, Employee::name));
System.out.println(nameById.get(7));

try {
    employees.stream().collect(Collectors.toMap(Employee::dept, Employee::name));
} catch (IllegalStateException ex) {
    System.out.println("Error: " + ex.getMessage());
}

Map<String, Double> payrollByDept = employees.stream()
        .collect(Collectors.toMap(Employee::dept, Employee::salary, Double::sum, TreeMap::new));
System.out.println(payrollByDept);` },
        { type: "output", text: `Karan
Error: Duplicate key Engineering (attempted merging values Aarav and Priya)
{Engineering=500000.0, Finance=188000.0, HR=105000.0, Sales=132000.0}` },
        { type: "paragraph", text: "**Key idea:** Without a merge function, `toMap` throws `IllegalStateException` on the first duplicate key. (This detailed message is from Java 9+. Java 8 only said `Duplicate key Aarav`, which confusingly names the value, not the key.) The third argument says how to combine two values, and the fourth picks the map type." },
      ],
    },
    {
      title: "Level 3: Strings and Maps",
      blocks: [
        { type: "paragraph", text: "String questions are the most common coding-round warm-ups in Indian interviews. The trick for nearly all of them: turn the string into a stream of characters or words, then count or group." },
        { type: "heading", text: "Problem 20: Character frequency" },
        { type: "paragraph", text: "A tailor counting buttons by colour drops each button into a box for its colour, then counts each box. Same thing with letters." },
        { type: "paragraph", text: "Task: count how many times each character appears in `\"programming\"`, in the order the characters first appear." },
        { type: "code", language: "java", code: `String input = "programming";

Map<Character, Long> freq = input.chars()
        .mapToObj(c -> (char) c)
        .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new,
                Collectors.counting()));

System.out.println(freq);` },
        { type: "output", text: `{p=1, r=2, o=1, g=2, a=1, m=2, i=1, n=1}` },
        { type: "paragraph", text: "**Key idea:** `chars()` gives an `IntStream`, so I cast back to `char` with `mapToObj`. `LinkedHashMap::new` keeps the first-seen order, which the next problem depends on." },
        { type: "heading", text: "Problem 21: First non-repeated character" },
        { type: "paragraph", text: "In a class photo, I want the first student (left to right) who has no twin in the class." },
        { type: "paragraph", text: "Task: find the first character that appears only once in `\"swiss\"`." },
        { type: "callout", tone: "tip", title: "Hint", text: "Build the frequency map with `LinkedHashMap` (so order is kept), then walk it and stop at the first count of 1." },
        { type: "code", language: "java", code: `String input = "swiss";

Optional<Character> firstUnique = input.chars()
        .mapToObj(c -> (char) c)
        .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new,
                Collectors.counting()))
        .entrySet().stream()
        .filter(entry -> entry.getValue() == 1)
        .map(Map.Entry::getKey)
        .findFirst();

System.out.println(firstUnique.orElse('-'));` },
        { type: "output", text: `w` },
        { type: "paragraph", text: "**Key idea:** Two passes: one to count, one to find. O(n) time. With a plain `HashMap` the \"first\" would be random, which is the bug interviewers look for." },
        { type: "heading", text: "Problem 22: First repeated character" },
        { type: "paragraph", text: "At a wedding gate, the guard notes every guest. The first person who tries to enter a second time is the first repeat." },
        { type: "paragraph", text: "Task: find the first character that repeats in `\"javaprogram\"`." },
        { type: "code", language: "java", code: `String input = "javaprogram";
Set<Character> seen = new HashSet<>();

Optional<Character> firstRepeat = input.chars()
        .mapToObj(c -> (char) c)
        .filter(c -> !seen.add(c))
        .findFirst();

System.out.println(firstRepeat.orElse('-'));` },
        { type: "output", text: `a` },
        { type: "paragraph", text: "**Key idea:** Same `Set.add` trick as the duplicates problem. It stops at the first repeat, so it's one pass and often faster than counting everything." },
        { type: "heading", text: "Problem 23: Word frequency, most frequent first" },
        { type: "paragraph", text: "After a class election, the teacher counts votes on the board and reads them out from the highest." },
        { type: "paragraph", text: "Task: count the words in a sentence and print them by count (high to low), then alphabetically for ties." },
        { type: "code", language: "java", code: `String sentence = "the cab and the bus and the train";

Map<String, Long> counts = Arrays.stream(sentence.split("\\\\s+"))
        .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

counts.entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue().reversed()
                .thenComparing(Map.Entry.comparingByKey()))
        .forEach(entry -> System.out.println(entry.getKey() + " = " + entry.getValue()));` },
        { type: "output", text: `the = 3
and = 2
bus = 1
cab = 1
train = 1` },
        { type: "paragraph", text: "**Key idea:** Split on whitespace, count, then sort entries by value. The `<String, Long>` type witness is needed because Java can't infer the type before `.reversed()`." },
        { type: "heading", text: "Problem 24: Group anagrams" },
        { type: "paragraph", text: "\"listen\" and \"silent\" use the same letters, like two dishes made from the same ingredients. If I sort the letters of each word, anagrams end up with the same \"recipe\"." },
        { type: "paragraph", text: "Task: group the words `listen, silent, enlist, google, gogole, cat, act, tac` into anagram groups." },
        { type: "callout", tone: "tip", title: "Hint", text: "Use the sorted letters as the `groupingBy` key." },
        { type: "code", language: "java", code: `List<String> words = Arrays.asList("listen", "silent", "enlist", "google", "gogole", "cat", "act", "tac");

Map<String, List<String>> groups = words.stream()
        .collect(Collectors.groupingBy(word -> {
            char[] letters = word.toCharArray();
            Arrays.sort(letters);
            return new String(letters);
        }, TreeMap::new, Collectors.toList()));

groups.values().forEach(System.out::println);` },
        { type: "output", text: `[cat, act, tac]
[google, gogole]
[listen, silent, enlist]` },
        { type: "paragraph", text: "**Key idea:** The key is the sorted letters, O(k log k) per word. For lowercase-only input a 26-slot count array would be a faster key." },
        { type: "heading", text: "Problem 25: Reverse each word, keep the word order" },
        { type: "paragraph", text: "Like reading every shop signboard on a street from right to left, but walking the street in the normal direction." },
        { type: "paragraph", text: "Task: turn `\"Java 8 streams are fun\"` into `\"avaJ 8 smaerts era nuf\"`." },
        { type: "code", language: "java", code: `String sentence = "Java 8 streams are fun";

String result = Arrays.stream(sentence.split(" "))
        .map(word -> new StringBuilder(word).reverse().toString())
        .collect(Collectors.joining(" "));

System.out.println(result);` },
        { type: "output", text: `avaJ 8 smaerts era nuf` },
        { type: "paragraph", text: "**Key idea:** Split, reverse each piece with `StringBuilder`, join back. To reverse the word order instead, I'd reverse the list (`Collections.reverse`) and leave each word alone." },
        { type: "heading", text: "Problem 26: Palindrome check" },
        { type: "paragraph", text: "A palindrome reads the same from both ends, like the word \"malayalam\" or the number 12321. I only need to compare the first half with the second half." },
        { type: "paragraph", text: "Task: check `\"madam\"`, `\"cab\"` and `\"A man, a plan, a canal: Panama\"` (ignoring case and punctuation)." },
        { type: "code", language: "java", code: `static boolean isPalindrome(String text) {
    String clean = text.replaceAll("[^A-Za-z0-9]", "").toLowerCase();
    int n = clean.length();
    return IntStream.range(0, n / 2)
            .allMatch(i -> clean.charAt(i) == clean.charAt(n - 1 - i));
}

System.out.println(isPalindrome("madam"));
System.out.println(isPalindrome("cab"));
System.out.println(isPalindrome("A man, a plan, a canal: Panama"));` },
        { type: "output", text: `true
false
true` },
        { type: "paragraph", text: "**Key idea:** `allMatch` stops at the first mismatch. O(n) time. `new StringBuilder(clean).reverse().toString().equals(clean)` also works and is fine to mention." },
        { type: "heading", text: "Problem 27: Sort a map by value" },
        { type: "paragraph", text: "I have each student's marks in a map and want a merit list: highest marks first." },
        { type: "paragraph", text: "Task: sort `{Riya=82, Aman=95, Zoya=67, Dev=95}` by value (descending) and keep that order in a map." },
        { type: "code", language: "java", code: `Map<String, Integer> marks = new HashMap<>();
marks.put("Riya", 82);
marks.put("Aman", 95);
marks.put("Zoya", 67);
marks.put("Dev", 95);

Map<String, Integer> meritList = marks.entrySet().stream()
        .sorted(Map.Entry.<String, Integer>comparingByValue(Comparator.reverseOrder())
                .thenComparing(Map.Entry.comparingByKey()))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue,
                (a, b) -> a, LinkedHashMap::new));

System.out.println(meritList);` },
        { type: "output", text: `{Aman=95, Dev=95, Riya=82, Zoya=67}` },
        { type: "paragraph", text: "**Key idea:** A `HashMap` has no order and a `TreeMap` sorts by key, so the answer is: sort the entries, then collect into a `LinkedHashMap`. The `(a, b) -> a` merge function is never used here, but `toMap` needs it to accept a map factory." },
        { type: "heading", text: "Problem 28: Merge two maps, adding values" },
        { type: "paragraph", text: "Two branches of a sweet shop send their sales for the day. If both sold rasgulla, the total is the sum." },
        { type: "paragraph", text: "Task: merge two `item -> quantity` maps, adding quantities for common items." },
        { type: "code", language: "java", code: `Map<String, Integer> branchA = new TreeMap<>();
branchA.put("rasgulla", 40);
branchA.put("samosa", 25);
Map<String, Integer> branchB = new TreeMap<>();
branchB.put("rasgulla", 15);
branchB.put("jalebi", 30);

// Way 1: Map.merge
Map<String, Integer> total = new TreeMap<>(branchA);
branchB.forEach((item, qty) -> total.merge(item, qty, Integer::sum));
System.out.println(total);

// Way 2: one stream over both maps
Map<String, Integer> viaStream = Stream.of(branchA, branchB)
        .flatMap(m -> m.entrySet().stream())
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, Integer::sum, TreeMap::new));
System.out.println(viaStream);` },
        { type: "output", text: `{jalebi=30, rasgulla=55, samosa=25}
{jalebi=30, rasgulla=55, samosa=25}` },
        { type: "paragraph", text: "**Key idea:** `merge(key, value, fn)` puts the value if the key is new, otherwise combines old and new with `fn`. It replaces the old `if (map.containsKey(...))` block in one line." },
        { type: "heading", text: "Problem 29: The Java 8 Map and List helpers" },
        { type: "paragraph", text: "Java 8 didn't only add streams. `Map` and `Collection` got small helpers that remove a lot of `if` checks. Think of a parcel counter: create a shelf for a city only when the first parcel for it arrives, and clear out cancelled parcels." },
        { type: "paragraph", text: "Task: build `city -> trip ids` with `computeIfAbsent`, then try `getOrDefault`, `putIfAbsent`, `computeIfPresent`, `replaceAll` and `removeIf`." },
        { type: "code", language: "java", code: `Map<String, List<String>> tripsByCity = new TreeMap<>();
for (Trip t : trips) {
    tripsByCity.computeIfAbsent(t.city(), city -> new ArrayList<>()).add(t.id());
}
System.out.println(tripsByCity);

Map<String, Integer> surge = new TreeMap<>();
surge.put("Kolkata", 1);
surge.putIfAbsent("Kolkata", 5);                       // ignored, key exists
surge.putIfAbsent("Mumbai", 2);                        // added
surge.computeIfPresent("Mumbai", (city, s) -> s + 1);  // 2 -> 3
System.out.println(surge + " Pune=" + surge.getOrDefault("Pune", 1));

surge.replaceAll((city, s) -> s * 10);
System.out.println(surge);

List<Trip> active = new ArrayList<>(trips);
active.removeIf(t -> t.status().equals("CANCELLED"));
System.out.println(active.size() + " of " + trips.size() + " trips completed");` },
        { type: "output", text: `{Bengaluru=[T4, T6, T10], Kolkata=[T1, T2, T3, T5, T9, T12], Mumbai=[T7, T8, T11]}
{Kolkata=1, Mumbai=3} Pune=1
{Kolkata=10, Mumbai=30}
9 of 12 trips completed` },
        { type: "paragraph", text: "**Key idea:** `computeIfAbsent` is the one I use most: it builds a \"multimap\" without checking for null first. `removeIf` is safe to call while iterating, unlike calling `list.remove` inside a for-each loop." },
      ],
    },
    {
      title: "Level 4: Optional and Date/Time",
      blocks: [
        { type: "paragraph", text: "`Optional` is a box that may or may not have something in it, and the `java.time` API replaced the old, mutable `Date` and `Calendar`. To keep outputs repeatable, I fix \"today\" to 29 October 2026 instead of calling `LocalDate.now()`." },
        { type: "heading", text: "Problem 30: Safe lookup with Optional" },
        { type: "paragraph", text: "At a hotel reception I ask for the room of guest 5. If the guest exists I get the room, otherwise the receptionist says \"not found\". No crash either way." },
        { type: "paragraph", text: "Task: build an `id -> Employee` map, then get the department of id 5 and id 99 without any null checks." },
        { type: "code", language: "java", code: `Map<Integer, Employee> byId = employees.stream()
        .collect(Collectors.toMap(Employee::id, Function.identity()));

String dept5 = Optional.ofNullable(byId.get(5)).map(Employee::dept).orElse("UNKNOWN");
String dept99 = Optional.ofNullable(byId.get(99)).map(Employee::dept).orElse("UNKNOWN");

System.out.println(dept5);
System.out.println(dept99);` },
        { type: "output", text: `Engineering
UNKNOWN` },
        { type: "paragraph", text: "**Key idea:** `ofNullable` wraps a value that might be null, `map` only runs when something is inside, and `orElse` gives the fallback. `Optional.of(null)` would throw, so `ofNullable` is the right one for map lookups." },
        { type: "heading", text: "Problem 31: orElse vs orElseGet" },
        { type: "paragraph", text: "Ordering at a restaurant: `orElse` is like cooking a backup dish every time \"just in case\", even if the main dish arrives. `orElseGet` only cooks the backup when it's needed." },
        { type: "paragraph", text: "Task: show that `orElse` always runs its argument, even when the Optional has a value." },
        { type: "code", language: "java", code: `static String loadDefault() {
    System.out.println("  loadDefault() ran");
    return "default";
}

Optional<String> cached = Optional.of("from cache");

System.out.println("orElse:");
String a = cached.orElse(loadDefault());

System.out.println("orElseGet:");
String b = cached.orElseGet(() -> loadDefault());

System.out.println(a + " | " + b);` },
        { type: "output", text: `orElse:
  loadDefault() ran
orElseGet:
from cache | from cache` },
        { type: "paragraph", text: "**Key idea:** Java evaluates method arguments before the call, so `orElse(loadDefault())` runs `loadDefault()` no matter what. If the fallback is costly (a DB call, an API call), always use `orElseGet`." },
        { type: "heading", text: "Problem 32: flatMap, filter and orElseThrow" },
        { type: "paragraph", text: "To book a cab I need a user, then that user's saved home address. Either step can be missing. Chaining Optionals with `flatMap` avoids an `Optional<Optional<...>>` mess." },
        { type: "paragraph", text: "Task: get Priya's first skill, and throw a clear error when looking up an engineer named \"Ghost\"." },
        { type: "code", language: "java", code: `static Optional<Employee> findByName(String name) {
    return employees.stream().filter(e -> e.name().equals(name)).findFirst();
}

static Optional<String> firstSkill(Employee e) {
    return e.skills().isEmpty() ? Optional.empty() : Optional.of(e.skills().get(0));
}

String skill = findByName("Priya")
        .flatMap(e -> firstSkill(e))
        .orElse("none");
System.out.println(skill);

try {
    findByName("Ghost")
            .filter(e -> e.dept().equals("Engineering"))
            .orElseThrow(() -> new IllegalArgumentException("No engineer named Ghost"));
} catch (IllegalArgumentException ex) {
    System.out.println("Error: " + ex.getMessage());
}` },
        { type: "output", text: `Java
Error: No engineer named Ghost` },
        { type: "paragraph", text: "**Key idea:** Use `map` when the function returns a plain value and `flatMap` when it already returns an `Optional`. Java 10 added a no-argument `orElseThrow()` that throws `NoSuchElementException`." },
        { type: "heading", text: "Problem 33: Age and days between two dates" },
        { type: "paragraph", text: "A passport form asks for age in completed years, and a loan app wants the exact number of days since the loan started." },
        { type: "paragraph", text: "Task: for someone born on 15 March 1994, print the age on 29 Oct 2026, and the days, weeks and months from 26 Jan 2026 to that date." },
        { type: "code", language: "java", code: `LocalDate today = LocalDate.of(2026, 10, 29);
LocalDate birthDate = LocalDate.of(1994, 3, 15);

Period age = Period.between(birthDate, today);
System.out.println("Age: " + age.getYears() + " years, " + age.getMonths() + " months, " + age.getDays() + " days");

LocalDate republicDay = LocalDate.of(2026, 1, 26);
System.out.println("Days:   " + ChronoUnit.DAYS.between(republicDay, today));
System.out.println("Weeks:  " + ChronoUnit.WEEKS.between(republicDay, today));
System.out.println("Months: " + ChronoUnit.MONTHS.between(republicDay, today));` },
        { type: "output", text: `Age: 32 years, 7 months, 14 days
Days:   276
Weeks:  39
Months: 9` },
        { type: "paragraph", text: "**Key idea:** `Period` is a human-style difference (years, months, days). `ChronoUnit.X.between` gives one total number in one unit. For time-of-day differences I'd use `Duration` instead." },
        { type: "heading", text: "Problem 34: Next business day" },
        { type: "paragraph", text: "If I order something on a Friday evening, the courier says \"it will ship on the next working day\", which skips the weekend and any public holiday." },
        { type: "paragraph", text: "Task: write `nextBusinessDay(date, holidays)` and try it for Thursday 29 Oct, Friday 30 Oct, and Friday 13 Nov 2026 with Monday 16 Nov as a holiday." },
        { type: "code", language: "java", code: `static LocalDate nextBusinessDay(LocalDate date, Set<LocalDate> holidays) {
    LocalDate next = date.plusDays(1);
    while (next.getDayOfWeek() == DayOfWeek.SATURDAY
            || next.getDayOfWeek() == DayOfWeek.SUNDAY
            || holidays.contains(next)) {
        next = next.plusDays(1);
    }
    return next;
}

Set<LocalDate> holidays = new HashSet<>(Arrays.asList(LocalDate.of(2026, 11, 16)));

LocalDate[] dates = { LocalDate.of(2026, 10, 29), LocalDate.of(2026, 10, 30), LocalDate.of(2026, 11, 13) };
for (LocalDate d : dates) {
    LocalDate next = nextBusinessDay(d, holidays);
    System.out.println(d + " " + d.getDayOfWeek() + " -> " + next + " " + next.getDayOfWeek());
}` },
        { type: "output", text: `2026-10-29 THURSDAY -> 2026-10-30 FRIDAY
2026-10-30 FRIDAY -> 2026-11-02 MONDAY
2026-11-13 FRIDAY -> 2026-11-17 TUESDAY` },
        { type: "paragraph", text: "**Key idea:** `LocalDate` is immutable, so `plusDays` returns a new date and I reassign it. A loop is clearer here than a stream." },
        { type: "heading", text: "Problem 35: First and last day of the month" },
        { type: "paragraph", text: "Salary goes out on the last working day of the month, and a society meeting happens on the first Monday. `TemporalAdjusters` answers these without any calendar maths." },
        { type: "paragraph", text: "Task: for 29 Oct 2026, print the first day, last day, first Monday of the month and the next Friday." },
        { type: "code", language: "java", code: `LocalDate today = LocalDate.of(2026, 10, 29);

System.out.println("First day:    " + today.with(TemporalAdjusters.firstDayOfMonth()));
System.out.println("Last day:     " + today.with(TemporalAdjusters.lastDayOfMonth()));
System.out.println("First Monday: " + today.with(TemporalAdjusters.firstInMonth(DayOfWeek.MONDAY)));
System.out.println("Next Friday:  " + today.with(TemporalAdjusters.next(DayOfWeek.FRIDAY)));
System.out.println("Leap year?    " + today.isLeapYear());` },
        { type: "output", text: `First day:    2026-10-01
Last day:     2026-10-31
First Monday: 2026-10-05
Next Friday:  2026-10-30
Leap year?    false` },
        { type: "paragraph", text: "**Key idea:** `date.with(adjuster)` returns a new adjusted date. Other handy ones: `lastInMonth`, `nextOrSame`, `firstDayOfNextMonth`." },
        { type: "heading", text: "Problem 36: Parse, format and convert time zones" },
        { type: "paragraph", text: "A customer in Kolkata books a call for \"29-10-2026 14:30\". The support team in London and the server (in UTC) need to see the same moment in their own time." },
        { type: "paragraph", text: "Task: parse that text, attach the Asia/Kolkata zone, and print it in UTC and Europe/London." },
        { type: "code", language: "java", code: `DateTimeFormatter input = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
DateTimeFormatter pretty = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a z", Locale.ENGLISH);

LocalDateTime local = LocalDateTime.parse("29-10-2026 14:30", input);
ZonedDateTime kolkata = local.atZone(ZoneId.of("Asia/Kolkata"));

System.out.println(kolkata.format(pretty));
System.out.println(kolkata.withZoneSameInstant(ZoneOffset.UTC).format(pretty));
System.out.println(kolkata.withZoneSameInstant(ZoneId.of("Europe/London")).format(pretty));
System.out.println(kolkata.toInstant());` },
        { type: "output", text: `29 Oct 2026, 02:30 PM IST
29 Oct 2026, 09:00 AM Z
29 Oct 2026, 09:00 AM GMT
2026-10-29T09:00:00Z` },
        { type: "paragraph", text: "**Key idea:** `LocalDateTime` has no zone. `atZone` pins it to a place and `withZoneSameInstant` shows the same moment elsewhere. London shows GMT, not BST, because the UK clocks went back on 25 Oct 2026; the zone rules handle that for me. I store `Instant` (UTC) in the database and convert only for display. `DateTimeFormatter` is immutable and thread-safe, unlike `SimpleDateFormat`." },
        { type: "heading", text: "Problem 37: Trips per day, including days with zero trips" },
        { type: "paragraph", text: "A daily sales chart looks wrong if a holiday with no sales just disappears. The empty day should show 0." },
        { type: "paragraph", text: "Task: count trips per day from 20 Oct to 24 Oct 2026, showing 0 for days with no trips." },
        { type: "code", language: "java", code: `Map<LocalDate, Long> perDay = trips.stream()
        .collect(Collectors.groupingBy(Trip::date, Collectors.counting()));

LocalDate start = LocalDate.of(2026, 10, 20);
LocalDate end = LocalDate.of(2026, 10, 24);
long days = ChronoUnit.DAYS.between(start, end) + 1;

Stream.iterate(start, d -> d.plusDays(1))
        .limit(days)
        .forEach(d -> System.out.println(d + " " + perDay.getOrDefault(d, 0L)));` },
        { type: "output", text: `2026-10-20 4
2026-10-21 4
2026-10-22 4
2026-10-23 0
2026-10-24 0` },
        { type: "paragraph", text: "**Key idea:** Generate every date in the range, then look each one up with `getOrDefault`. Java 9 added `start.datesUntil(end.plusDays(1))`, which replaces the `iterate` + `limit` pair." },
      ],
    },
    {
      title: "Level 5: Functional Interfaces and Method References",
      blocks: [
        { type: "paragraph", text: "A functional interface is any interface with exactly one abstract method. A lambda is just a short way to write an object of that interface. Java 8 ships the common shapes in `java.util.function`: `Function`, `Predicate`, `Supplier`, `Consumer`, `BiFunction`, `UnaryOperator`, `BinaryOperator`." },
        { type: "heading", text: "Problem 38: Write your own functional interface" },
        { type: "paragraph", text: "A cab fare depends on three things: base fare, distance and surge. The built-in `BiFunction` only takes two inputs, so I make my own interface with three." },
        { type: "paragraph", text: "Task: create `FareCalculator` with one method taking base, km and surge, and use it with two different pricing rules." },
        { type: "code", language: "java", code: `@FunctionalInterface
interface FareCalculator {
    double calculate(double baseFare, double km, double surge);
}

FareCalculator normal = (base, km, surge) -> (base + km * 12) * surge;
FareCalculator flatAirport = (base, km, surge) -> 500;

System.out.println("Normal, 10 km, 1.5x surge: " + normal.calculate(50, 10, 1.5));
System.out.println("Airport flat rate:         " + flatAirport.calculate(50, 30, 2.0));` },
        { type: "output", text: `Normal, 10 km, 1.5x surge: 255.0
Airport flat rate:         500.0` },
        { type: "paragraph", text: "**Key idea:** `@FunctionalInterface` is optional, but the compiler then stops anyone from adding a second abstract method and breaking every lambda. Default and static methods are still allowed." },
        { type: "heading", text: "Problem 39: Chain functions with andThen and compose" },
        { type: "paragraph", text: "A food order goes through steps: add GST, then add a delivery fee. Each step is a small function, and I can plug them together like pipes." },
        { type: "paragraph", text: "Task: build `addGst` (5%) and `addDelivery` (+40), and show that `andThen` and `compose` run them in opposite orders." },
        { type: "code", language: "java", code: `Function<Double, Double> addGst = amount -> amount * 1.05;
Function<Double, Double> addDelivery = amount -> amount + 40;

Function<Double, Double> gstThenDelivery = addGst.andThen(addDelivery);
Function<Double, Double> deliveryThenGst = addGst.compose(addDelivery);

System.out.println(gstThenDelivery.apply(200.0));
System.out.println(deliveryThenGst.apply(200.0));` },
        { type: "output", text: `250.0
252.0` },
        { type: "paragraph", text: "**Key idea:** `f.andThen(g)` means \"f first, then g\". `f.compose(g)` means \"g first, then f\". Here: (200 x 1.05) + 40 = 250, and (200 + 40) x 1.05 = 252." },
        { type: "heading", text: "Problem 40: Combine conditions with Predicate" },
        { type: "paragraph", text: "A bank's loan check: \"age between 25 and 40 AND salary over 80,000\", or a separate rule \"works in Finance\". Each rule is a `Predicate` and they combine like Lego bricks." },
        { type: "paragraph", text: "Task: build the rules as predicates and combine them with `and`, `or` and `negate`." },
        { type: "code", language: "java", code: `static List<String> names(Predicate<Employee> rule) {
    return employees.stream().filter(rule).map(Employee::name).collect(Collectors.toList());
}

Predicate<Employee> rightAge = e -> e.age() >= 25 && e.age() <= 40;
Predicate<Employee> goodSalary = e -> e.salary() > 80000;
Predicate<Employee> inFinance = e -> e.dept().equals("Finance");

Predicate<Employee> eligible = rightAge.and(goodSalary).or(inFinance);

System.out.println("Eligible:     " + names(eligible));
System.out.println("Not eligible: " + names(eligible.negate()));` },
        { type: "output", text: `Eligible:     [Aarav, Priya, Karan, Meera, Divya]
Not eligible: [Rohan, Sneha, Vikram, Ananya, Arjun]` },
        { type: "paragraph", text: "**Key idea:** Small named predicates read like the business rule itself. Java 11 added `Predicate.not(...)`, handy inside `filter(Predicate.not(String::isEmpty))`." },
        { type: "heading", text: "Problem 41: The four kinds of method references" },
        { type: "paragraph", text: "A method reference is a shortcut, like saving a number as \"Mom\" instead of typing it each time. When a lambda only calls one existing method, I can point to that method directly." },
        { type: "paragraph", text: "Task: write one example of each kind: static method, method on a specific object, method on any object of a type, and constructor." },
        { type: "code", language: "java", code: `// 1. Static method:              x -> Integer.parseInt(x)
Function<String, Integer> parse = Integer::parseInt;

// 2. Method of a specific object: x -> prefix.concat(x)
String prefix = "Order-";
Function<String, String> label = prefix::concat;

// 3. Method of any object:         s -> s.toUpperCase()
Function<String, String> upper = String::toUpperCase;

// 4. Constructor:                  () -> new ArrayList<>()
Supplier<List<String>> newList = ArrayList::new;

List<String> list = newList.get();
list.add(label.apply("42"));
list.add(upper.apply("delivered"));
System.out.println(list + " total=" + (parse.apply("40") + 2));` },
        { type: "output", text: `[Order-42, DELIVERED] total=42` },
        { type: "paragraph", text: "**Key idea:** The compiler matches the method's shape to the functional interface. Kind 3 is the confusing one: `String::toUpperCase` takes the string as its first (hidden) argument, the object it's called on." },
        { type: "heading", text: "Problem 42: Default and static methods in interfaces" },
        { type: "paragraph", text: "A notification service sends by email by default, but some classes also get an SMS interface with its own default. When two interfaces give the same default method, Java makes me choose, like two parents giving different instructions to a kid." },
        { type: "paragraph", text: "Task: show a default method, a static method, and how to resolve the \"diamond\" clash." },
        { type: "code", language: "java", code: `interface EmailNotifier {
    default String channel() { return "email"; }
    static String footer() { return "-- Sent by QuickCab"; }
}

interface SmsNotifier {
    default String channel() { return "sms"; }
}

static class OtpSender implements EmailNotifier, SmsNotifier {
    @Override
    public String channel() {   // must override: both parents have channel()
        return EmailNotifier.super.channel() + "+" + SmsNotifier.super.channel();
    }
}

OtpSender sender = new OtpSender();
System.out.println("Sending OTP via " + sender.channel());
System.out.println(EmailNotifier.footer());` },
        { type: "output", text: `Sending OTP via email+sms
-- Sent by QuickCab` },
        { type: "paragraph", text: "**Key idea:** Default methods let library authors add methods to interfaces without breaking old code (that's how `List` got `sort` and `Iterable` got `forEach`). Static interface methods are called on the interface name, never on an instance." },
        { type: "heading", text: "Problem 43: Memoize a slow function" },
        { type: "paragraph", text: "A tea stall regular orders the same thing every day, so the owner starts making it the moment he walks in. Caching a function's results works the same way: the second call with the same input is instant." },
        { type: "paragraph", text: "Task: write a generic `memoize(Function)` helper and prove the slow function runs only once per input." },
        { type: "code", language: "java", code: `static <T, R> Function<T, R> memoize(Function<T, R> fn) {
    Map<T, R> cache = new ConcurrentHashMap<>();
    return input -> cache.computeIfAbsent(input, fn);
}

AtomicInteger realCalls = new AtomicInteger();
Function<String, Double> fareFor = city -> {
    realCalls.incrementAndGet();          // pretend this hits a pricing API
    return city.length() * 10.0;
};

Function<String, Double> cachedFare = memoize(fareFor);
System.out.println(cachedFare.apply("Kolkata") + " " + cachedFare.apply("Kolkata") + " " + cachedFare.apply("Pune"));
System.out.println("Real calls: " + realCalls.get());` },
        { type: "output", text: `70.0 70.0 40.0
Real calls: 2` },
        { type: "paragraph", text: "**Key idea:** `computeIfAbsent` only calls the function when the key is missing. Don't use it for recursive functions like Fibonacci, though: changing the same map from inside `computeIfAbsent` throws `ConcurrentModificationException` (`HashMap`) or can hang (`ConcurrentHashMap`) on Java 9+." },
      ],
    },
    {
      title: "Level 6: CompletableFuture",
      blocks: [
        { type: "paragraph", text: "`CompletableFuture` is a token from a food court counter: I place the order, get a token, and do something else until the buzzer goes off. The calls below use `sleep(...)` from the data model to pretend to be slow network calls. For I/O-style work I pass my own thread pool, because the default common pool is small (CPU cores minus one) and meant for CPU work." },
        { type: "heading", text: "Problem 44: Run a task in the background" },
        { type: "paragraph", text: "I order a coffee, get a token, and when the coffee is ready the barista adds sugar before calling my number." },
        { type: "paragraph", text: "Task: fetch a driver's name in the background, change it with `thenApply`, and print it with `thenAccept`." },
        { type: "code", language: "java", code: `CompletableFuture<Void> done = CompletableFuture
        .supplyAsync(() -> { sleep(100); return "ravi"; })
        .thenApply(name -> "Driver " + name.toUpperCase() + " is on the way")
        .thenAccept(System.out::println);

System.out.println("Main thread is free while the call runs...");
done.join();` },
        { type: "output", text: `Main thread is free while the call runs...
Driver RAVI is on the way` },
        { type: "paragraph", text: "**Key idea:** `supplyAsync` starts the work and returns at once, so the main thread prints first. `thenApply` transforms the result, `thenAccept` consumes it, and `join()` waits (like `get()` but without checked exceptions)." },
        { type: "heading", text: "Problem 45: Two independent calls in parallel (thenCombine)" },
        { type: "paragraph", text: "While my cab is being booked, the app fetches the fare and the ETA at the same time. Neither waits for the other, and the screen shows both when both are ready." },
        { type: "paragraph", text: "Task: fetch fare and ETA in parallel and combine them into one message." },
        { type: "code", language: "java", code: `ExecutorService pool = Executors.newFixedThreadPool(2);

CompletableFuture<Double> fare = CompletableFuture.supplyAsync(() -> { sleep(300); return 245.0; }, pool);
CompletableFuture<Integer> eta = CompletableFuture.supplyAsync(() -> { sleep(300); return 6; }, pool);

long start = System.nanoTime();
String screen = fare.thenCombine(eta, (rs, mins) -> "Rs " + rs + ", driver arrives in " + mins + " min").join();
long ms = (System.nanoTime() - start) / 1_000_000;

System.out.println(screen);
System.out.println("Took about 300 ms, not 600: " + (ms < 550));
pool.shutdown();` },
        { type: "output", text: `Rs 245.0, driver arrives in 6 min
Took about 300 ms, not 600: true` },
        { type: "paragraph", text: "**Key idea:** `thenCombine` waits for both futures and merges the two results. Total time is the slower call, not the sum." },
        { type: "heading", text: "Problem 46: N parallel API calls with allOf" },
        { type: "paragraph", text: "A dispatcher wants the live status of four drivers. Calling them one by one takes four times as long, so I call all four at once and wait for everyone." },
        { type: "paragraph", text: "Task: fetch the status of D1 to D4 in parallel and print them in order." },
        { type: "code", language: "java", code: `static CompletableFuture<String> fetchStatus(String driverId, ExecutorService pool) {
    return CompletableFuture.supplyAsync(() -> {
        sleep(200);
        return driverId + ":online";
    }, pool);
}

ExecutorService pool = Executors.newFixedThreadPool(4);
List<String> ids = Arrays.asList("D1", "D2", "D3", "D4");

long start = System.nanoTime();
List<CompletableFuture<String>> calls = ids.stream()
        .map(id -> fetchStatus(id, pool))
        .collect(Collectors.toList());

CompletableFuture.allOf(calls.toArray(new CompletableFuture[0])).join();
List<String> statuses = calls.stream().map(CompletableFuture::join).collect(Collectors.toList());
long ms = (System.nanoTime() - start) / 1_000_000;

System.out.println(statuses);
System.out.println("About 200 ms, not 800: " + (ms < 600));
pool.shutdown();` },
        { type: "output", text: `[D1:online, D2:online, D3:online, D4:online]
About 200 ms, not 800: true` },
        { type: "paragraph", text: "**Key idea:** Start all calls first (the first `collect`), then wait. If I wrote `.map(id -> fetchStatus(id, pool).join())` in one stream, each call would wait for the previous one and I'd be back to sequential. `allOf` returns `CompletableFuture<Void>`, so I read results from the original list, in the original order." },
        { type: "heading", text: "Problem 47: Timeout with a fallback value" },
        { type: "paragraph", text: "If the surge-pricing service doesn't answer within 100 ms, the app should not freeze. It should show the normal fare (surge 1.0) and move on." },
        { type: "paragraph", text: "Task: wrap a slow call so it returns a fallback after a timeout, in Java 8 style and with the Java 9 one-liner." },
        { type: "callout", tone: "tip", title: "Hint", text: "In Java 8, race the real call against a second future that a scheduler completes with the fallback after the timeout. `applyToEither` takes whichever finishes first." },
        { type: "code", language: "java", code: `static final ScheduledExecutorService TIMER = Executors.newSingleThreadScheduledExecutor(r -> {
    Thread t = new Thread(r);
    t.setDaemon(true);
    return t;
});

static <T> CompletableFuture<T> withTimeout(CompletableFuture<T> call, long ms, T fallback) {
    CompletableFuture<T> timeout = new CompletableFuture<>();
    TIMER.schedule(() -> timeout.complete(fallback), ms, TimeUnit.MILLISECONDS);
    return call.applyToEither(timeout, Function.identity());
}

CompletableFuture<Double> slowSurge = CompletableFuture.supplyAsync(() -> { sleep(500); return 1.8; });
CompletableFuture<Double> fastSurge = CompletableFuture.supplyAsync(() -> { sleep(20); return 1.4; });

System.out.println("Java 8, slow: " + withTimeout(slowSurge, 100, 1.0).join());
System.out.println("Java 8, fast: " + withTimeout(fastSurge, 100, 1.0).join());

// Java 9+
CompletableFuture<Double> slowAgain = CompletableFuture.supplyAsync(() -> { sleep(500); return 1.8; });
System.out.println("Java 9, slow: " + slowAgain.completeOnTimeout(1.0, 100, TimeUnit.MILLISECONDS).join());` },
        { type: "output", text: `Java 8, slow: 1.0
Java 8, fast: 1.4
Java 9, slow: 1.0` },
        { type: "paragraph", text: "**Key idea:** Java 9 added `completeOnTimeout` (use a fallback) and `orTimeout` (fail with `TimeoutException`). Neither cancels the slow work underneath, it just stops waiting for it." },
        { type: "heading", text: "Problem 48: Handle failures with exceptionally and handle" },
        { type: "paragraph", text: "If the payment gateway fails, I don't want the whole booking screen to crash. I want \"Payment pending, we'll retry\" instead." },
        { type: "paragraph", text: "Task: make a call that throws, recover with `exceptionally`, and see how `handle` sees both success and failure." },
        { type: "code", language: "java", code: `static CompletableFuture<String> charge(double amount) {
    return CompletableFuture.supplyAsync(() -> {
        if (amount > 1000) throw new IllegalStateException("card limit exceeded");
        return "PAID " + amount;
    });
}

String failed = charge(1500)
        .exceptionally(ex -> "PENDING (" + ex.getCause().getMessage() + ")")
        .join();
System.out.println(failed);

for (double amount : new double[] {300, 1500}) {
    String result = charge(amount)
            .handle((ok, ex) -> ex == null ? ok : "FAILED: " + ex.getCause().getMessage())
            .join();
    System.out.println(result);
}` },
        { type: "output", text: `PENDING (card limit exceeded)
PAID 300.0
FAILED: card limit exceeded` },
        { type: "paragraph", text: "**Key idea:** Inside the callback the exception arrives wrapped in a `CompletionException`, so I read `ex.getCause()`. `exceptionally` only runs on failure, while `handle` always runs and gets `(result, exception)` with one of them null." },
        { type: "heading", text: "Problem 49: One call depends on another (thenCompose)" },
        { type: "paragraph", text: "To show a trip's driver rating I first need the trip (to know the driver), then the driver's rating. The second call needs the first call's answer." },
        { type: "paragraph", text: "Task: chain `findDriverOfTrip` and `ratingOf` with `thenCompose`." },
        { type: "code", language: "java", code: `static CompletableFuture<String> findDriverOfTrip(String tripId) {
    return CompletableFuture.supplyAsync(() -> trips.stream()
            .filter(t -> t.id().equals(tripId)).findFirst().get().driverId());
}

static CompletableFuture<Double> ratingOf(String driverId) {
    return CompletableFuture.supplyAsync(() -> driverId.equals("D3") ? 4.9 : 4.5);
}

double rating = findDriverOfTrip("T6")
        .thenCompose(driverId -> ratingOf(driverId))
        .join();

System.out.println("Driver rating for T6: " + rating);` },
        { type: "output", text: `Driver rating for T6: 4.9` },
        { type: "paragraph", text: "**Key idea:** `thenApply` with a function that returns a future would give `CompletableFuture<CompletableFuture<Double>>`. `thenCompose` flattens it, the same way `flatMap` does for streams and Optional." },
      ],
    },
    {
      title: "Level 7: Interview Favourites (Mixed)",
      blocks: [
        { type: "paragraph", text: "These are the ones I've seen again and again in coding rounds, where the interviewer says \"now do it with streams\"." },
        { type: "heading", text: "Problem 50: Find the missing number" },
        { type: "paragraph", text: "Seats 1 to 10 in a cinema row are booked, but one ticket is missing from the pile. Add up what I have and compare with what the full row should add up to." },
        { type: "paragraph", text: "Task: find the missing number in `[1, 2, 4, 5, 6, 7, 8, 9, 10]`, then find all missing numbers in `[1, 3, 4, 7, 10]` for range 1 to 10." },
        { type: "code", language: "java", code: `List<Integer> seats = Arrays.asList(1, 2, 4, 5, 6, 7, 8, 9, 10);
int n = 10;
int expected = n * (n + 1) / 2;
int actual = seats.stream().mapToInt(Integer::intValue).sum();
System.out.println("Missing: " + (expected - actual));

Set<Integer> booked = new HashSet<>(Arrays.asList(1, 3, 4, 7, 10));
List<Integer> missing = IntStream.rangeClosed(1, 10)
        .filter(seat -> !booked.contains(seat))
        .boxed()
        .collect(Collectors.toList());
System.out.println("All missing: " + missing);` },
        { type: "output", text: `Missing: 3
All missing: [2, 5, 6, 8, 9]` },
        { type: "paragraph", text: "**Key idea:** For one missing number the sum formula is O(n) time and O(1) space. For many, a `HashSet` makes each `contains` O(1). For very large n, XOR avoids the int overflow that the sum can hit." },
        { type: "heading", text: "Problem 51: Fibonacci series with Stream.iterate" },
        { type: "paragraph", text: "Each new rabbit generation is the sum of the previous two. A stream can carry a pair of numbers forward one step at a time." },
        { type: "paragraph", text: "Task: print the first 10 Fibonacci numbers." },
        { type: "code", language: "java", code: `List<Integer> fib = Stream.iterate(new int[] {0, 1}, pair -> new int[] {pair[1], pair[0] + pair[1]})
        .limit(10)
        .map(pair -> pair[0])
        .collect(Collectors.toList());

System.out.println(fib);` },
        { type: "output", text: `[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]` },
        { type: "paragraph", text: "**Key idea:** `Stream.iterate(seed, next)` is infinite, so `limit` is required. The state is a two-element array: `{current, next}`. Java 9 added `Stream.iterate(seed, hasNext, next)`, a for-loop-style version." },
        { type: "heading", text: "Problem 52: Common and combined elements of two lists" },
        { type: "paragraph", text: "Two friends compare their playlists: songs both of them like (intersection), all songs between them (union), and songs only I have (difference)." },
        { type: "paragraph", text: "Task: find the intersection, union and difference of two lists." },
        { type: "code", language: "java", code: `List<String> mine = Arrays.asList("Kesariya", "Tum Hi Ho", "Naatu Naatu", "Jhoome Jo Pathaan");
List<String> yours = Arrays.asList("Naatu Naatu", "Apna Bana Le", "Kesariya");

Set<String> yourSet = new HashSet<>(yours);

List<String> both = mine.stream().filter(yourSet::contains).collect(Collectors.toList());
List<String> onlyMine = mine.stream().filter(song -> !yourSet.contains(song)).collect(Collectors.toList());
List<String> all = Stream.concat(mine.stream(), yours.stream()).distinct().collect(Collectors.toList());

System.out.println("Both:      " + both);
System.out.println("Only mine: " + onlyMine);
System.out.println("All:       " + all);` },
        { type: "output", text: `Both:      [Kesariya, Naatu Naatu]
Only mine: [Tum Hi Ho, Jhoome Jo Pathaan]
All:       [Kesariya, Tum Hi Ho, Naatu Naatu, Jhoome Jo Pathaan, Apna Bana Le]` },
        { type: "paragraph", text: "**Key idea:** Turn the second list into a `HashSet` first. Calling `yours.contains` on a `List` inside the filter would make it O(n x m) instead of O(n + m)." },
        { type: "heading", text: "Problem 53: Running total" },
        { type: "paragraph", text: "A passbook shows the balance after every transaction, not just the final number." },
        { type: "paragraph", text: "Task: turn deposits `[500, -200, 1000, -300, 250]` into running balances." },
        { type: "callout", tone: "tip", title: "Hint", text: "A stream processes each item on its own and has no \"previous item\". Use `Arrays.parallelPrefix` (Java 8), or a stream over indexes that adds into a running counter." },
        { type: "code", language: "java", code: `int[] txns = {500, -200, 1000, -300, 250};

// Way 1: built for exactly this (Java 8)
int[] balances = txns.clone();
Arrays.parallelPrefix(balances, Integer::sum);
System.out.println(Arrays.toString(balances));

// Way 2: stream with a running counter (sequential streams only)
AtomicInteger running = new AtomicInteger();
List<Integer> viaStream = Arrays.stream(txns)
        .map(running::addAndGet)
        .boxed()
        .collect(Collectors.toList());
System.out.println(viaStream);` },
        { type: "output", text: `[500, 300, 1300, 1000, 1250]
[500, 300, 1300, 1000, 1250]` },
        { type: "paragraph", text: "**Key idea:** `parallelPrefix` replaces each element with the sum of everything up to it, in place. Way 2 works but depends on order, so it breaks with `parallel()`. A plain for loop is honestly fine too, and I'd say so in an interview." },
        { type: "heading", text: "Problem 54: Nth highest salary, with everyone who earns it" },
        { type: "paragraph", text: "Rank holders in an exam: if two students share rank 1, both are toppers, and the next mark is rank 2. Grouping by marks in a reverse-sorted map gives ranks directly." },
        { type: "paragraph", text: "Task: find the 1st and 3rd highest salaries and all employees at each." },
        { type: "code", language: "java", code: `TreeMap<Double, List<String>> bySalary = employees.stream()
        .collect(Collectors.groupingBy(Employee::salary,
                () -> new TreeMap<>(Comparator.reverseOrder()),
                Collectors.mapping(Employee::name, Collectors.toList())));

int[] ranks = {1, 3};
for (int rank : ranks) {
    Map.Entry<Double, List<String>> entry = bySalary.entrySet().stream()
            .skip(rank - 1)
            .findFirst()
            .get();
    System.out.println("Rank " + rank + ": " + entry.getKey() + " " + entry.getValue());
}` },
        { type: "output", text: `Rank 1: 135000.0 [Priya, Vikram]
Rank 3: 110000.0 [Divya]` },
        { type: "paragraph", text: "**Key idea:** The map key is the salary (so duplicates merge automatically) and the reverse-order `TreeMap` keeps the highest first. This answers the follow-up \"what if two people tie?\" before it's asked." },
      ],
    },
    {
      title: "Level 8: Production-Style Challenges",
      blocks: [
        { type: "paragraph", text: "Small, real tasks of the kind I actually write at work. Each one is a few lines, but it mixes two or three ideas from the levels above." },
        { type: "heading", text: "Problem 55: Daily earnings report per driver" },
        { type: "paragraph", text: "At the end of each day, a cab company pays drivers for completed rides only. Cancelled rides earn nothing." },
        { type: "paragraph", text: "Task: from `trips`, print each day's earnings per driver, counting only COMPLETED trips, with days and drivers in order." },
        { type: "code", language: "java", code: `Map<LocalDate, Map<String, Double>> report = trips.stream()
        .filter(t -> t.status().equals("COMPLETED"))
        .collect(Collectors.groupingBy(Trip::date, TreeMap::new,
                Collectors.groupingBy(Trip::driverId, TreeMap::new,
                        Collectors.summingDouble(Trip::fare))));

report.forEach((day, perDriver) -> System.out.println(day + " " + perDriver));` },
        { type: "output", text: `2026-10-20 {D1=570.0, D3=410.0}
2026-10-21 {D2=150.0, D3=520.0, D4=380.0}
2026-10-22 {D1=290.0, D2=200.0, D4=450.0}` },
        { type: "paragraph", text: "**Key idea:** Filter first, then a two-level `groupingBy` with `summingDouble`. Real money should use `BigDecimal` (or paise as `long`), because `double` can't store values like 0.1 exactly." },
        { type: "heading", text: "Problem 56: Remove duplicate webhook events, keep the latest" },
        { type: "paragraph", text: "A payment gateway sometimes sends the same webhook twice (retries, network blips). If I process both, the customer might get two \"payment successful\" SMSs. I keep one event per id, the most recent one." },
        { type: "paragraph", text: "Task: dedupe the events by `eventId`, keeping the one with the latest `receivedAt`." },
        { type: "callout", tone: "tip", title: "Hint", text: "`toMap` keyed by event id, with `BinaryOperator.maxBy` on `receivedAt` as the merge function." },
        { type: "code", language: "java", code: `record WebhookEvent(String eventId, String status, Instant receivedAt) {}

List<WebhookEvent> events = Arrays.asList(
        new WebhookEvent("evt_1", "PENDING", Instant.parse("2026-10-29T10:00:00Z")),
        new WebhookEvent("evt_2", "PAID", Instant.parse("2026-10-29T10:00:05Z")),
        new WebhookEvent("evt_1", "PAID", Instant.parse("2026-10-29T10:00:09Z")),
        new WebhookEvent("evt_2", "PAID", Instant.parse("2026-10-29T10:00:02Z")));

Collection<WebhookEvent> unique = events.stream()
        .collect(Collectors.toMap(WebhookEvent::eventId, Function.identity(),
                BinaryOperator.maxBy(Comparator.comparing(WebhookEvent::receivedAt)),
                TreeMap::new))
        .values();

unique.forEach(System.out::println);` },
        { type: "output", text: `WebhookEvent[eventId=evt_1, status=PAID, receivedAt=2026-10-29T10:00:09Z]
WebhookEvent[eventId=evt_2, status=PAID, receivedAt=2026-10-29T10:00:05Z]` },
        { type: "paragraph", text: "**Key idea:** One pass, O(n). In a real system I'd also store processed ids in the database with a unique index, because two copies can arrive in two different requests." },
        { type: "heading", text: "Problem 57: Find late food orders (SLA breach)" },
        { type: "paragraph", text: "A food app promises delivery within 30 minutes. Orders delivered later, or still not delivered when the promise time has passed, are \"late\" and get a coupon." },
        { type: "paragraph", text: "Task: with the clock fixed at 13:00 UTC, list the late orders and how many minutes late they are." },
        { type: "code", language: "java", code: `record FoodOrder(String id, Instant placedAt, Instant deliveredAt) {}

static final Duration PROMISE = Duration.ofMinutes(30);

Clock clock = Clock.fixed(Instant.parse("2026-10-29T13:00:00Z"), ZoneOffset.UTC);
List<FoodOrder> orders = Arrays.asList(
        new FoodOrder("O1", Instant.parse("2026-10-29T12:00:00Z"), Instant.parse("2026-10-29T12:25:00Z")),
        new FoodOrder("O2", Instant.parse("2026-10-29T12:05:00Z"), Instant.parse("2026-10-29T12:50:00Z")),
        new FoodOrder("O3", Instant.parse("2026-10-29T12:20:00Z"), null),
        new FoodOrder("O4", Instant.parse("2026-10-29T12:45:00Z"), null));

Instant now = Instant.now(clock);
orders.forEach(order -> {
    Instant due = order.placedAt().plus(PROMISE);
    Instant doneOrNow = order.deliveredAt() != null ? order.deliveredAt() : now;
    long lateBy = Duration.between(due, doneOrNow).toMinutes();
    if (lateBy > 0) {
        System.out.println(order.id() + " late by " + lateBy + " min" + (order.deliveredAt() == null ? " (still on the way)" : ""));
    }
});` },
        { type: "output", text: `O2 late by 15 min
O3 late by 10 min (still on the way)` },
        { type: "paragraph", text: "**Key idea:** Passing a `Clock` instead of calling `Instant.now()` directly makes the code testable: in tests I use `Clock.fixed`, in production `Clock.systemUTC()`. O4 is not late yet because its 30 minutes end at 13:15." },
        { type: "heading", text: "Problem 58: Retry sending an OTP with backoff" },
        { type: "paragraph", text: "The SMS provider sometimes fails for a moment. Instead of giving up, I try again after a short wait, and double the wait each time (100 ms, 200 ms, ...), like ringing a doorbell again a bit later each time." },
        { type: "paragraph", text: "Task: write `retry(Supplier, maxAttempts, firstDelayMs)` and use it with an OTP sender that fails twice before working." },
        { type: "callout", tone: "tip", title: "Hint", text: "`Supplier<T>` is \"something I can call to get a T\", which is exactly what a retryable action is." },
        { type: "code", language: "java", code: `static <T> T retry(Supplier<T> action, int maxAttempts, long firstDelayMs) {
    long delay = firstDelayMs;
    for (int attempt = 1; ; attempt++) {
        try {
            return action.get();
        } catch (RuntimeException ex) {
            if (attempt == maxAttempts) throw ex;
            System.out.println("Attempt " + attempt + " failed (" + ex.getMessage() + "), retrying in " + delay + " ms");
            sleep(delay);
            delay *= 2;
        }
    }
}

AtomicInteger calls = new AtomicInteger();
Supplier<String> sendOtp = () -> {
    if (calls.incrementAndGet() < 3) throw new IllegalStateException("SMS gateway timeout");
    return "OTP sent to +91-98XXXXXX10";
};

System.out.println(retry(sendOtp, 4, 100));` },
        { type: "output", text: `Attempt 1 failed (SMS gateway timeout), retrying in 100 ms
Attempt 2 failed (SMS gateway timeout), retrying in 200 ms
OTP sent to +91-98XXXXXX10` },
        { type: "paragraph", text: "**Key idea:** Retry only errors that can heal by themselves (timeouts, 503s), never a wrong phone number. In production I'd add a little random jitter to the delay, so a thousand clients don't all retry at the same moment." },
        { type: "heading", text: "Problem 59: Send notifications in batches of N" },
        { type: "paragraph", text: "The SMS provider accepts at most 3 numbers per request. With 8 customers to notify, I need 3 requests: 3, 3 and 2 numbers." },
        { type: "paragraph", text: "Task: split a list into chunks of size N." },
        { type: "code", language: "java", code: `static <T> List<List<T>> chunks(List<T> items, int size) {
    int count = (items.size() + size - 1) / size;   // round up
    return IntStream.range(0, count)
            .mapToObj(i -> items.subList(i * size, Math.min((i + 1) * size, items.size())))
            .collect(Collectors.toList());
}

List<String> phones = Arrays.asList("p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8");

List<List<String>> batches = chunks(phones, 3);
for (int i = 0; i < batches.size(); i++) {
    System.out.println("Request " + (i + 1) + ": " + batches.get(i));
}` },
        { type: "output", text: `Request 1: [p1, p2, p3]
Request 2: [p4, p5, p6]
Request 3: [p7, p8]` },
        { type: "paragraph", text: "**Key idea:** `(size + n - 1) / n` is integer \"round up\". `subList` returns views of the original list, so I wrap a chunk in `new ArrayList<>(...)` if it will outlive or be changed separately from the original." },
        { type: "heading", text: "Problem 60: Today's trips summary by city" },
        { type: "paragraph", text: "The ops team's morning dashboard: for each city, how many trips, how much money from completed trips, and what share got cancelled." },
        { type: "paragraph", text: "Task: print revenue, trip count and cancellation rate per city." },
        { type: "code", language: "java", code: `Map<String, Map<Boolean, List<Trip>>> byCity = trips.stream()
        .collect(Collectors.groupingBy(Trip::city, TreeMap::new,
                Collectors.partitioningBy(t -> t.status().equals("COMPLETED"))));

byCity.forEach((city, split) -> {
    List<Trip> completed = split.get(true);
    int total = completed.size() + split.get(false).size();
    double revenue = completed.stream().mapToDouble(Trip::fare).sum();
    double cancelRate = 100.0 * split.get(false).size() / total;
    System.out.printf("%-10s trips=%d revenue=%.0f cancelled=%.1f%%%n", city, total, revenue, cancelRate);
});` },
        { type: "output", text: `Bengaluru  trips=3 revenue=930 cancelled=33.3%
Kolkata    trips=6 revenue=1210 cancelled=16.7%
Mumbai     trips=3 revenue=830 cancelled=33.3%` },
        { type: "paragraph", text: "**Key idea:** `groupingBy` city, then `partitioningBy` status inside it, gives me both halves of each city in one pass. The small calculations then read like the dashboard itself." },
      ],
    },
    {
      title: "Summary",
      blocks: [
        { type: "paragraph", text: "Sixty problems, but only about twenty patterns. Once these feel natural, most new stream questions are a mix of two of them." },
        { type: "diagram", text: `PATTERN                         USED FOR                          PROBLEMS
------------------------------  --------------------------------  ----------------
filter -> map -> collect        select and reshape                1, 3, 6
summaryStatistics()             count/sum/min/max/avg, one pass   2, 16
sorted(comparing..reversed      multi-level sort                  7, 13
  .thenComparing)
Set.add() returns false         duplicates, first repeat          4, 22
groupingBy + counting           "how many per X", frequency       9, 15, 18, 20, 23
groupingBy + averaging/summing  "total / average per X"           10, 55
groupingBy + maxBy /            "top per group"                   11, 13
  collectingAndThen
partitioningBy                  two buckets (yes / no)            12, 60
distinct + sorted + skip(n-1)   Nth highest                       14, 54
Collectors.teeing (Java 12)     two results in one pass           16
flatMap                         list of lists -> one stream       17, 18, 28
toMap with merge function       duplicate keys, dedupe, sum       19, 27, 28, 56
LinkedHashMap::new              keep insertion / sorted order     20, 21, 27
Map.merge / computeIfAbsent     counters and multimaps            28, 29, 43
Optional map/flatMap/orElseGet  null-safe lookups                 30, 31, 32
Period / ChronoUnit / Duration  date and time differences         33, 37, 57
TemporalAdjusters, ZonedDT      calendar rules, time zones        34, 35, 36
Predicate / Function chaining   composable business rules         39, 40
CompletableFuture               async, parallel, timeout, errors  44 to 49
  thenCombine / allOf /
  thenCompose / exceptionally
Supplier as an action           retry with backoff                58
IntStream.range over indexes    palindromes, chunks               26, 59
Arrays.parallelPrefix           running totals                    53`, caption: "The patterns behind the 60 problems" },
        { type: "paragraph", text: "If I had to keep only three: `groupingBy` with a downstream collector, `toMap` with a merge function, and `flatMap`. Those three alone answer most of Levels 2, 3 and 8." },
      ],
    },
    {
      title: "Try It Yourself",
      blocks: [
        { type: "paragraph", text: "No solutions for these. They reuse the same data model and the same patterns, so if I get stuck, the Summary table points to the problem with a similar trick." },
        { type: "list", ordered: true, items: ["Find the youngest employee in each department, and print only their names.", "Find the department with the highest total salary, using one stream.", "Given a sentence, find the longest word. If two words tie, return the one that comes first.", "Check if two strings are anagrams of each other using `chars()` and `groupingBy`.", "From `trips`, find the driver with the most CANCELLED trips, and the cancellation count.", "Print every date in November 2026 that falls on a Saturday, using `TemporalAdjusters`.", "Convert `List<Employee>` to `Map<String, Set<String>>`: department to the set of all skills in it.", "Count how many working days (Monday to Friday) there are between 1 Nov and 31 Dec 2026, skipping 25 Dec.", "Call three fake services in parallel with `CompletableFuture`, give each its own timeout, and print whatever came back, using a fallback for the ones that timed out.", "Write a `Validator` functional interface that returns a list of error messages, then combine three validators (name not empty, age over 18, valid phone) with a default `and` method."] },
        { type: "paragraph", text: "My rule for practising: write it with streams first, then ask whether a plain loop would be clearer. In interviews, being able to say \"I'd use a loop here because...\" scores as well as a clever one-liner." },
      ],
    },
  ],
};
