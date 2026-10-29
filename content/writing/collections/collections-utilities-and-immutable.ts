import type { Lesson } from "../types";

export const collectionsUtilitiesAndImmutable: Lesson = {
  slug: "collections-utilities-and-immutable",
  date: "2026-10-29",
  title: "Collections Utilities and Immutable Collections",
  description:
    "The ready-made helpers in Collections and Arrays (sorting, searching, counting, shuffling, wrapping), the traps in Arrays.asList and synchronizedList, and the real difference between an unmodifiable view and a truly immutable List.of, Set.of or Map.of.",
  tags: ["Core Java", "Collections", "Immutability", "Arrays", "Java 9"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "Think of a kitchen drawer of tools: a peeler, a grater, a can opener. I don't build these myself, I just pick one up. **`Collections`** and **`Arrays`** are Java's tool drawers: ready-made helpers to find the biggest item, sort, shuffle, search or copy, each in one line.",
        },
        {
          type: "paragraph",
          text: "The other half of this lesson is about lists that **can't be changed**, like the laminated menu stuck on a café wall. Nobody can write a new dish onto it. `List.of(...)` gives me a list like that: if any code tries to add or remove something, Java stops it with an error.",
        },
        {
          type: "paragraph",
          text: "I use the tools to save writing code, and the unchangeable lists to make sure data I hand out can't be changed by mistake.",
        },
        {
          type: "code",
          language: "java",
          code: `List<Integer> sales = new ArrayList<>(List.of(40, 95, 60));
System.out.println(Collections.max(sales));      // ready-made helper

List<String> menu = List.of("Tea", "Samosa");
try {
    menu.add("Pizza");                           // printed card, can't add
} catch (UnsupportedOperationException e) {
    System.out.println("menu is fixed");
}`,
        },
        {
          type: "output",
          text: `95
menu is fixed`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "Reach for `Collections` and `Arrays` before writing a helper, and use `List.of` when a list should never change.",
        },
      ],
    },
    {
      title: "What These Utilities Are",
      blocks: [
        {
          type: "paragraph",
          text: "A shopkeeper doesn't build his own weighing scale, calculator and price stamp. He buys them, because everyone needs the same tools and the shop-bought ones are tested. Java gives collections the same kind of toolbox: two classes full of static helpers, **`java.util.Collections`** (for lists, sets and maps) and **`java.util.Arrays`** (for arrays). Find the biggest sale, count how often an item sold, shuffle a quiz, search a sorted list, copy an array: all one line.",
        },
        {
          type: "paragraph",
          text: "The second half of this lesson is about collections that **can't be changed**. A printed menu card in a restaurant is a good picture: once it's printed, nobody can add a dish to it, and every table can share the same card safely.",
        },
        {
          type: "paragraph",
          text: "Java has three different things that look like that and behave differently: unmodifiable **views** (`Collections.unmodifiableList`), truly **immutable** collections (`List.of`, `Set.of`, `Map.of`, `List.copyOf`), and fixed-size lists (`Arrays.asList`). Mixing them up is one of the most common sources of `UnsupportedOperationException` and of \"how did this list change?\" bugs.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "`Collections` and `Arrays` both arrived in Java 1.2 (1998) with the Collections Framework. The design idea was to keep the interfaces (`List`, `Set`, `Map`) small and put the algorithms (sort, search, shuffle, min, max) in one helper class that works on any implementation. The same release added the **wrappers**: `unmodifiableList`, `synchronizedList` and friends, which wrap an existing collection and change its behaviour without copying it.",
        },
        {
          type: "paragraph",
          text: "For years, \"a constant list\" in Java meant `Collections.unmodifiableList(Arrays.asList(...))`, which is long and still not truly immutable. Java 9 (2017, JEP 269) added the **convenience factory methods** `List.of`, `Set.of` and `Map.of`, which create compact, truly immutable collections. Java 10 added `List.copyOf`, `Set.copyOf` and `Map.copyOf`, and `Collectors.toUnmodifiableList`. Java 16 added `Stream.toList()`. Java 21 added sequenced collections, which aren't the topic here.",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "The office notice board helped me keep the three kinds of \"read-only\" apart.",
        },
        {
          type: "list",
          items: [
            "An **unmodifiable view** is a notice board behind a locked glass door. Passers-by can read it but can't pin anything. The office manager, though, still has the key and changes the notices whenever she likes, and everyone looking through the glass sees the new ones. Read-only for me, not frozen.",
            "An **immutable collection** is a printed and laminated notice. Nobody can change it, not even the office. If the office wants a new version, it prints a new sheet.",
            "A **fixed-size list** from `Arrays.asList` is a pigeonhole rack with exactly ten slots. I can swap the letter in a slot, but I can't add an eleventh slot or remove one. And the rack is the array itself, so whoever holds the array sees my swaps.",
          ],
        },
        {
          type: "paragraph",
          text: "And `Collections.synchronizedList` is a register with a single pen tied to it. Only one person can write at a time, but nothing stops two people from both checking \"is my name missing?\" and then both writing it.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The Collections toolbox",
        },
        {
          type: "table",
          headers: ["Helper", "What it does", "Needs"],
          rows: [
            ["`sort(list)`, `sort(list, cmp)`", "Sorts in place (calls `list.sort`)", "Comparable elements or a comparator"],
            ["`binarySearch(list, key)`", "Index of key, or `-(insertionPoint) - 1` if missing", "A list **sorted** in the same order"],
            ["`reverse`, `swap`, `rotate`, `shuffle`", "Rearrange in place", "A modifiable list"],
            ["`max`, `min`", "Largest or smallest element, no sorting", "Non-empty collection"],
            ["`frequency(c, o)`", "How many elements `equals(o)`", "Any collection"],
            ["`nCopies(n, o)`", "Immutable list of the same object n times", "Nothing"],
            ["`emptyList`, `emptySet`, `emptyMap`", "Shared immutable empty instances", "Nothing"],
            ["`singletonList`, `singleton`, `singletonMap`", "Immutable one-element collections", "Nothing"],
            ["`unmodifiableX(c)`", "Read-only **view** over c", "Nothing, no copy"],
            ["`synchronizedX(c)`", "Every method locked on one mutex", "Manual locking for iteration"],
            ["`addAll(c, a, b, ...)`, `disjoint`, `fill`", "Small conveniences", ""],
          ],
        },
        {
          type: "heading",
          text: "The Arrays toolbox",
        },
        {
          type: "table",
          headers: ["Helper", "What it does"],
          rows: [
            ["`asList(a...)`", "A **fixed-size** list backed by the array. `set` works, `add`/`remove` throw"],
            ["`sort(arr)`, `sort(arr, from, to)`, `sort(arr, cmp)`", "Quicksort for primitives, TimSort for objects (see the Comparable lesson)"],
            ["`binarySearch(arr, key)`", "Same contract as the list version"],
            ["`fill(arr, v)`", "Sets every slot to v"],
            ["`copyOf(arr, n)`, `copyOfRange(arr, from, to)`", "New array, padded with zeros/nulls/false if longer"],
            ["`equals`, `deepEquals`", "Element-by-element comparison, flat or nested"],
            ["`toString`, `deepToString`", "Readable text, flat or nested"],
            ["`hashCode`, `deepHashCode`, `stream`, `setAll`, `mismatch`", "The rest of the toolbox"],
          ],
        },
        {
          type: "heading",
          text: "Four kinds of \"can't change it\"",
        },
        {
          type: "table",
          headers: ["", "`unmodifiableList(x)`", "`List.of(...)` / `List.copyOf(x)`", "`Arrays.asList(arr)`", "`Stream.toList()`"],
          rows: [
            ["`add` / `remove`", "Throws", "Throws", "Throws", "Throws"],
            ["`set`", "Throws", "Throws", "**Works**, writes to the array", "Throws"],
            ["Changes if the source changes", "**Yes**, it's a view", "No, it owns its data", "Yes, it is the array", "No"],
            ["`null` elements", "Allowed", "**Rejected** (NPE)", "Allowed", "Allowed"],
            ["Copies the data", "No", "Yes (`copyOf` may skip if already immutable)", "No", "Yes"],
            ["Since", "1.2", "9 / 10", "1.2", "16"],
          ],
        },
        {
          type: "diagram",
          text: `unmodifiableList(menu)              List.copyOf(menu)

 view ──► ┌───────────────┐          copy ──► ┌──────────────┐
 (reads)  │ menu (ArrayList)│◄── owner       │ [Idli, Dosa] │ own array
          │ Idli Dosa Vada │    still edits  └──────────────┘
          └───────────────┘                   nobody can edit it,
 view sees Vada too                           not even the owner`,
          caption: "A view is a window onto someone else's list. A copy is a list of its own.",
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "image",
          src: "/images/collections/immutable-vs-view.svg",
          alt: "Comparison of Collections.unmodifiableList as a read-only view, List.copyOf and List.of as independent immutable copies, and Arrays.asList as a fixed-size view over an array.",
          caption: "`unmodifiableList` is a read-only **view** that still sees changes; `List.copyOf` is a real immutable **copy**.",
        },
        {
          type: "heading",
          text: "Wrappers are thin classes around the original",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p 'java.util.Collections$UnmodifiableCollection' | head -5
javap -p 'java.util.Collections$SynchronizedCollection' | head -8`,
        },
        {
          type: "output",
          text: `class java.util.Collections$UnmodifiableCollection<E> implements java.util.Collection<E>, java.io.Serializable {
  private static final long serialVersionUID;
  final java.util.Collection<? extends E> c;
  java.util.Collections$UnmodifiableCollection(java.util.Collection<? extends E>);
class java.util.Collections$SynchronizedCollection<E> implements java.util.Collection<E>, java.io.Serializable {
  private static final long serialVersionUID;
  final java.util.Collection<E> c;
  final java.lang.Object mutex;
  java.util.Collections$SynchronizedCollection(java.util.Collection<E>);
  java.util.Collections$SynchronizedCollection(java.util.Collection<E>, java.lang.Object);`,
        },
        {
          type: "paragraph",
          text: "Each wrapper holds one field, `c`, the original collection, and forwards calls to it. The unmodifiable one forwards reads and throws `UnsupportedOperationException` from every write. The synchronized one wraps every call in `synchronized (mutex)`. Neither copies anything, which is why the unmodifiable view keeps showing changes made through the original, and why the synchronized one can't protect anything that spans more than one call.",
        },
        {
          type: "heading",
          text: "Arrays.asList is a different ArrayList",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -p 'java.util.Arrays$ArrayList'",
        },
        {
          type: "output",
          text: `class java.util.Arrays$ArrayList<E> extends java.util.AbstractList<E> implements java.util.RandomAccess, java.io.Serializable {
  private static final long serialVersionUID;
  private final E[] a;
  java.util.Arrays$ArrayList(E[]);
  public int size();
  public java.lang.Object[] toArray();
  public <T> T[] toArray(T[]);
  public E get(int);
  public E set(int, E);
  public int indexOf(java.lang.Object);
  public boolean contains(java.lang.Object);
  ...
  public void sort(java.util.Comparator<? super E>);
  public java.util.Iterator<E> iterator();
}`,
        },
        {
          type: "list",
          items: [
            "It's a private nested class, `java.util.Arrays$ArrayList`, not `java.util.ArrayList`. Same simple name, different class.",
            "Its only data is `private final E[] a`: the array I passed in, not a copy. So writes go both ways.",
            "There's `set` but no `add` or `remove`. Those are inherited from `AbstractList`, whose default implementations throw `UnsupportedOperationException`. That's what \"fixed-size\" means mechanically.",
          ],
        },
        {
          type: "heading",
          text: "List.of picks a class by size",
        },
        {
          type: "paragraph",
          text: "`List.of` isn't one class. At the end of `FactoryRules` (shown in the examples) I printed the class names for different sizes:",
        },
        {
          type: "code",
          language: "java",
          code: `System.out.println(List.of().getClass().getSimpleName() + " "
        + List.of(1).getClass().getSimpleName() + " "
        + List.of(1, 2).getClass().getSimpleName() + " "
        + List.of(1, 2, 3).getClass().getSimpleName());
System.out.println(Map.of("a", 1).getClass().getSimpleName() + " "
        + Map.of("a", 1, "b", 2).getClass().getSimpleName());`,
        },
        {
          type: "output",
          text: `ListN List12 List12 ListN
Map1 MapN`,
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p 'java.util.ImmutableCollections$List12' | head -6
javap -p 'java.util.ImmutableCollections$ListN' | head -6`,
        },
        {
          type: "output",
          text: `final class java.util.ImmutableCollections$List12<E> extends java.util.ImmutableCollections$AbstractImmutableList<E> implements java.io.Serializable {
  private final E e0;
  private final java.lang.Object e1;
  java.util.ImmutableCollections$List12(E);
  java.util.ImmutableCollections$List12(E, E);
final class java.util.ImmutableCollections$ListN<E> extends java.util.ImmutableCollections$AbstractImmutableList<E> implements java.io.Serializable {
  private final E[] elements;
  private final boolean allowNulls;
  private java.util.ImmutableCollections$ListN(E[], boolean);`,
        },
        {
          type: "list",
          items: [
            "One or two elements are stored in two plain fields, `e0` and `e1`, with no array at all. Small constant lists are very common, so this saves an object per list.",
            "Three or more go into a `final` array that nothing else references.",
            "`ListN` has an `allowNulls` flag. `List.of` sets it to false. `Stream.toList()` uses the same class with nulls allowed, which is why its result can hold `null` but is still unmodifiable. `javap -p java.util.ImmutableCollections` even shows the two shared empty lists side by side: `EMPTY_LIST` and `EMPTY_LIST_NULLS`.",
            "All fields are `final`, and every mutator throws. That's real immutability of the collection itself.",
          ],
        },
        {
          type: "heading",
          text: "Why Set.of and Map.of change order between runs",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p -constants java.util.ImmutableCollections | head -5
javap -p 'java.util.ImmutableCollections$SetN' | head -12`,
        },
        {
          type: "output",
          text: `class java.util.ImmutableCollections {
  private static final long SALT32L;
  private static final boolean REVERSE;
  ...
final class java.util.ImmutableCollections$SetN<E> extends java.util.ImmutableCollections$AbstractImmutableSet<E> implements java.io.Serializable {
  final E[] elements;
  final int size;
  ...
  private int probe(java.lang.Object);`,
        },
        {
          type: "paragraph",
          text: "`SetN` and `MapN` are small open-addressing hash tables stored in one flat array, found with `probe`. The class holds a `SALT32L` value and a `REVERSE` flag that are chosen randomly when the JVM starts, and they decide where elements land and which direction iteration goes. So the iteration order of `Set.of` and `Map.of` is different from one JVM run to the next, on purpose. I ran the same program four times:",
        },
        {
          type: "code",
          language: "java",
          title: "SaltOrder.java",
          code: `import java.util.Map;
import java.util.Set;

public class SaltOrder {
    public static void main(String[] args) {
        Set<String> modes = Set.of("UPI", "Card", "Cash", "Wallet", "NetBanking");
        Map<String, Integer> prices = Map.of("tea", 10, "coffee", 20, "lassi", 30, "juice", 40);
        System.out.println(modes);
        System.out.println(prices);
    }
}`,
        },
        {
          type: "output",
          text: `[Cash, NetBanking, UPI, Card, Wallet]
{coffee=20, lassi=30, tea=10, juice=40}
[Card, UPI, NetBanking, Cash, Wallet]
{lassi=30, coffee=20, juice=40, tea=10}
[Wallet, Cash, NetBanking, UPI, Card]
{juice=40, coffee=20, lassi=30, tea=10}
[NetBanking, Cash, Wallet, Card, UPI]
{lassi=30, coffee=20, juice=40, tea=10}`,
        },
        {
          type: "paragraph",
          text: "Four runs, four different set orders. This is a deliberate design choice: the JDK authors had seen too much code depend on `HashMap`'s accidental order and break when it changed between versions. Randomizing per run makes that dependency fail in testing instead of after an upgrade. Your output will differ from mine. If order matters, use `List.of`, a `LinkedHashSet`/`LinkedHashMap`, or a sorted collection.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Cheat sheet (fragments)",
          code: `// Collections: algorithms on any List/Collection
Collections.sort(list);                 Collections.reverse(list);
Collections.shuffle(list, new Random(42));
int i = Collections.binarySearch(sortedList, key);
int n = Collections.frequency(list, "tea");
T top = Collections.max(list);          T low = Collections.min(list, cmp);
List<String> dashes = Collections.nCopies(3, "-");

// Small immutable collections
List<String> none = Collections.emptyList();
List<String> one  = Collections.singletonList("only");

// Java 9+: immutable, no nulls
List<String> days = List.of("Mon", "Tue");
Set<String> modes = Set.of("UPI", "Card");
Map<String, Integer> prices = Map.of("tea", 10, "coffee", 20);
Map<String, Integer> many = Map.ofEntries(Map.entry("tea", 10), Map.entry("coffee", 20));
List<String> frozen = List.copyOf(someList);                    // Java 10

// Views and wrappers (no copy)
List<String> readOnly = Collections.unmodifiableList(list);
List<String> locked   = Collections.synchronizedList(new ArrayList<>());

// Arrays
List<String> fixed = Arrays.asList(array);   // fixed size, backed by array
Arrays.sort(arr);  Arrays.fill(arr, 0);  int[] bigger = Arrays.copyOf(arr, 10);
Arrays.toString(arr);  Arrays.deepToString(grid);  Arrays.equals(a, b);`,
        },
        {
          type: "paragraph",
          text: "`Map.of` has overloads for up to ten key-value pairs. Beyond that, `Map.ofEntries` takes any number of `Map.entry(k, v)` pairs. `List.of` and `Set.of` have fixed-argument overloads up to ten and a varargs one after that, which avoids creating an array for the common small cases.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "A shopkeeper's day in Collections helpers",
        },
        {
          type: "paragraph",
          text: "A tea stall writes down each sale amount. At closing time the owner wants the biggest and smallest sale, how many Rs 15 sales there were, the sales in order, and a quick check for whether a Rs 25 or a Rs 30 sale happened:",
        },
        {
          type: "code",
          language: "java",
          title: "ShopHelpers.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public class ShopHelpers {
    public static void main(String[] args) {
        List<Integer> sales = new ArrayList<>(List.of(40, 15, 60, 15, 25, 15));

        System.out.println("max=" + Collections.max(sales) + " min=" + Collections.min(sales));
        System.out.println("frequency of 15: " + Collections.frequency(sales, 15));

        Collections.sort(sales);
        System.out.println("sorted:   " + sales);
        System.out.println("binarySearch 25: " + Collections.binarySearch(sales, 25));
        System.out.println("binarySearch 30: " + Collections.binarySearch(sales, 30));

        Collections.reverse(sales);
        System.out.println("reversed: " + sales);

        Collections.swap(sales, 0, sales.size() - 1);
        System.out.println("swapped:  " + sales);

        Collections.rotate(sales, 2);
        System.out.println("rotated:  " + sales);

        Collections.shuffle(sales, new Random(42));      // same seed, same shuffle
        System.out.println("shuffled: " + sales);

        List<String> blanks = Collections.nCopies(3, "-");
        System.out.println("nCopies:  " + blanks);
    }
}`,
        },
        {
          type: "output",
          text: `max=60 min=15
frequency of 15: 3
sorted:   [15, 15, 15, 25, 40, 60]
binarySearch 25: 3
binarySearch 30: -5
reversed: [60, 40, 25, 15, 15, 15]
swapped:  [15, 40, 25, 15, 15, 60]
rotated:  [15, 60, 15, 40, 25, 15]
shuffled: [60, 15, 25, 15, 40, 15]
nCopies:  [-, -, -]`,
        },
        {
          type: "list",
          items: [
            "`max` and `min` walk the list once, O(n). No need to sort for them.",
            "`binarySearch` for 30 returned `-5`. The rule is `-(insertionPoint) - 1`: 30 would go at index 4 (before 40), so `-4 - 1 = -5`. A negative result always means \"not found\", and it tells me where to insert to keep the list sorted.",
            "`rotate(list, 2)` moves every element two places right, wrapping around the end. A negative distance rotates left.",
            "`shuffle` with `new Random(42)` gave the same order every time I ran it. Without a seed, it's different each run. A seed is what I want in tests and in reproducible demos, and what I must **not** use for anything that should be unpredictable, like a lucky draw.",
          ],
        },
        {
          type: "heading",
          text: "Tiny immutable lists: empty, singleton, nCopies",
        },
        {
          type: "code",
          language: "java",
          title: "SmallLists.java",
          code: `import java.util.Collections;
import java.util.List;

public class SmallLists {
    static void tryAdd(String label, List<String> list) {
        try {
            list.add("x");
            System.out.println(label + ": added");
        } catch (UnsupportedOperationException e) {
            System.out.println(label + ": UnsupportedOperationException");
        }
    }

    public static void main(String[] args) {
        List<String> none = Collections.emptyList();
        List<String> one = Collections.singletonList("only");
        List<String> copies = Collections.nCopies(2, "same");

        System.out.println(none + " " + one + " " + copies);
        System.out.println(none.getClass().getName());
        System.out.println(one.getClass().getName());
        System.out.println(copies.getClass().getName());
        System.out.println("same empty instance: " + ((Object) none == Collections.<Integer>emptyList()));
        tryAdd("emptyList", none);
        tryAdd("singletonList", one);
        tryAdd("nCopies", copies);
    }
}`,
        },
        {
          type: "output",
          text: `[] [only] [same, same]
java.util.Collections$EmptyList
java.util.Collections$SingletonList
java.util.Collections$CopiesList
same empty instance: true
emptyList: UnsupportedOperationException
singletonList: UnsupportedOperationException
nCopies: UnsupportedOperationException`,
        },
        {
          type: "paragraph",
          text: "`emptyList()` returns one shared object for every type, which is safe only because nobody can add to it. `nCopies` doesn't store n references either: `CopiesList` keeps the count and the one element. All three are handy as return values (\"no results\") and all three blow up if the caller tries to add to them.",
        },
        {
          type: "heading",
          text: "View versus copy",
        },
        {
          type: "paragraph",
          text: "A cafe keeps a working menu that the manager edits. The app gets two things: a read-only view and a frozen copy:",
        },
        {
          type: "code",
          language: "java",
          title: "ViewVsCopy.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ViewVsCopy {
    public static void main(String[] args) {
        List<String> menu = new ArrayList<>(List.of("Idli", "Dosa"));

        List<String> view = Collections.unmodifiableList(menu);   // read-only window
        List<String> copy = List.copyOf(menu);                     // frozen snapshot

        menu.add("Vada");                                          // owner still edits
        System.out.println("menu: " + menu);
        System.out.println("view: " + view);
        System.out.println("copy: " + copy);

        try {
            view.add("Upma");
        } catch (UnsupportedOperationException e) {
            System.out.println("view.add -> UnsupportedOperationException");
        }

        List<String> again = List.copyOf(copy);
        System.out.println("copyOf an immutable list returns it: " + (again == copy));
        List<String> wrapped = Collections.unmodifiableList(view);
        System.out.println("unmodifiable of unmodifiable returns it: " + (wrapped == view));
    }
}`,
        },
        {
          type: "output",
          text: `menu: [Idli, Dosa, Vada]
view: [Idli, Dosa, Vada]
copy: [Idli, Dosa]
view.add -> UnsupportedOperationException
copyOf an immutable list returns it: true
unmodifiable of unmodifiable returns it: true`,
        },
        {
          type: "list",
          items: [
            "The view showed `Vada` the moment the manager added it. \"Unmodifiable\" means **I** can't change it through this reference, not that it never changes.",
            "The copy kept `[Idli, Dosa]`. It owns its own data.",
            "`List.copyOf` on a list that's already one of the immutable ones returns the same object, no copy. So calling it defensively costs almost nothing when the input is already immutable.",
            "Wrapping an unmodifiable list again returned the same wrapper on JDK 21, so repeated wrapping doesn't stack layers.",
          ],
        },
        {
          type: "heading",
          text: "Arrays.asList: fixed size and backed by the array",
        },
        {
          type: "paragraph",
          text: "A cinema has three seats in a row, stored as an array. I wrap it as a list:",
        },
        {
          type: "code",
          language: "java",
          title: "AsListDemo.java",
          code: `import java.util.Arrays;
import java.util.List;

public class AsListDemo {
    public static void main(String[] args) {
        String[] seats = {"A1", "A2", "A3"};
        List<String> list = Arrays.asList(seats);         // a list view over the array

        list.set(0, "VIP");                                // writes into the array
        System.out.println("array after list.set: " + Arrays.toString(seats));
        seats[2] = "AISLE";                                // and the other way round
        System.out.println("list after array write: " + list);

        try {
            list.add("A4");
        } catch (UnsupportedOperationException e) {
            System.out.println("add -> UnsupportedOperationException (fixed size)");
        }
        System.out.println(list.getClass().getName());

        int[] counts = {3, 1, 2};
        List<int[]> oops = Arrays.asList(counts);          // ONE element: the int[]
        System.out.println("asList(int[]) size = " + oops.size());
        List<Integer> boxed = Arrays.asList(3, 1, 2);
        System.out.println("asList(3, 1, 2) size = " + boxed.size());
    }
}`,
        },
        {
          type: "output",
          text: `array after list.set: [VIP, A2, A3]
list after array write: [VIP, A2, AISLE]
add -> UnsupportedOperationException (fixed size)
java.util.Arrays$ArrayList
asList(int[]) size = 1
asList(3, 1, 2) size = 3`,
        },
        {
          type: "paragraph",
          text: "The `int[]` case surprises everyone once. `asList` takes `T...`, and `T` can't be a primitive, so the whole `int[]` becomes a single element of type `int[]`. With `Integer` values (or `3, 1, 2` written directly, which autoboxes), I get three elements. To get a real, growable `ArrayList`, I copy: `new ArrayList<>(Arrays.asList(...))`, or just `new ArrayList<>(List.of(...))`.",
        },
        {
          type: "heading",
          text: "The Arrays toolbox on a class's marks",
        },
        {
          type: "code",
          language: "java",
          title: "ArraysTour.java",
          code: `import java.util.Arrays;

public class ArraysTour {
    public static void main(String[] args) {
        int[] marks = {72, 95, 60, 88};
        Arrays.sort(marks);
        System.out.println("sorted:      " + Arrays.toString(marks));
        System.out.println("search 88:   " + Arrays.binarySearch(marks, 88));

        int[] bigger = Arrays.copyOf(marks, 6);           // pads with 0
        int[] middle = Arrays.copyOfRange(marks, 1, 3);   // index 1 and 2
        System.out.println("copyOf 6:    " + Arrays.toString(bigger));
        System.out.println("copyOfRange: " + Arrays.toString(middle));

        boolean[] present = new boolean[4];
        Arrays.fill(present, true);
        System.out.println("fill:        " + Arrays.toString(present));

        int[] same = {60, 72, 88, 95};
        System.out.println("== :         " + (marks == same));
        System.out.println("equals:      " + Arrays.equals(marks, same));

        int[][] seating = {{1, 2}, {3, 4}};
        int[][] seating2 = {{1, 2}, {3, 4}};
        System.out.println("toString:    " + Arrays.toString(seating).replaceAll("@[0-9a-f]+", "@..."));
        System.out.println("deepToString:" + Arrays.deepToString(seating));
        System.out.println("equals 2D:   " + Arrays.equals(seating, seating2));
        System.out.println("deepEquals:  " + Arrays.deepEquals(seating, seating2));
    }
}`,
        },
        {
          type: "output",
          text: `sorted:      [60, 72, 88, 95]
search 88:   2
copyOf 6:    [60, 72, 88, 95, 0, 0]
copyOfRange: [72, 88]
fill:        [true, true, true, true]
== :         false
equals:      true
toString:    [[I@..., [I@...]
deepToString:[[1, 2], [3, 4]]
equals 2D:   false
deepEquals:  true`,
        },
        {
          type: "paragraph",
          text: "`==` on arrays compares references, so two arrays with the same marks aren't `==`. `Arrays.equals` compares contents. For a 2D array, the \"elements\" are inner arrays, so plain `toString` prints their type and hash (`[I@...`, I masked the hash because it changes every run) and plain `equals` compares the inner arrays by reference, giving `false`. The `deep` versions go one level further down, and further, as needed.",
        },
        {
          type: "heading",
          text: "The rules of List.of, Set.of and Map.of",
        },
        {
          type: "code",
          language: "java",
          title: "FactoryRules.java",
          code: `import java.util.List;
import java.util.Map;
import java.util.Set;

public class FactoryRules {
    static void attempt(String label, Runnable action) {
        try {
            action.run();
            System.out.println(label + ": ok");
        } catch (RuntimeException e) {
            System.out.println(label + ": " + e);
        }
    }

    public static void main(String[] args) {
        List<String> days = List.of("Mon", "Tue", "Wed");
        attempt("List.of add", () -> days.add("Thu"));
        attempt("List.of set", () -> days.set(0, "Sun"));
        attempt("List.of with null", () -> List.of("Mon", null));
        attempt("contains(null)", () -> days.contains(null));
        attempt("Set.of duplicate", () -> Set.of("UPI", "Card", "UPI"));
        attempt("Map.of duplicate key", () -> Map.of("tea", 10, "tea", 12));
        attempt("Map.of null value", () -> Map.of("tea", null));

        System.out.println(List.of().getClass().getSimpleName() + " "
                + List.of(1).getClass().getSimpleName() + " "
                + List.of(1, 2).getClass().getSimpleName() + " "
                + List.of(1, 2, 3).getClass().getSimpleName());
        System.out.println(Map.of("a", 1).getClass().getSimpleName() + " "
                + Map.of("a", 1, "b", 2).getClass().getSimpleName());
    }
}`,
        },
        {
          type: "output",
          text: `List.of add: java.lang.UnsupportedOperationException
List.of set: java.lang.UnsupportedOperationException
List.of with null: java.lang.NullPointerException
contains(null): java.lang.NullPointerException
Set.of duplicate: java.lang.IllegalArgumentException: duplicate element: UPI
Map.of duplicate key: java.lang.IllegalArgumentException: duplicate key: tea
Map.of null value: java.lang.NullPointerException
ListN List12 List12 ListN
Map1 MapN`,
        },
        {
          type: "list",
          items: [
            "No changes of any kind, including `set`.",
            "No `null` elements, keys or values. Even **asking** `contains(null)` throws, which surprises people the first time. A `HashSet` would just return false.",
            "`Set.of` and `Map.of` reject duplicates with `IllegalArgumentException` instead of quietly keeping one, because a duplicate in a hard-coded constant is almost certainly a typo. `new HashSet<>(List.of(...))` is the way to de-duplicate on purpose.",
          ],
        },
        {
          type: "heading",
          text: "Stream.toList versus Collectors.toList",
        },
        {
          type: "paragraph",
          text: "Streams belong to the next track, but this difference matters for immutability, so here it is in one program:",
        },
        {
          type: "code",
          language: "java",
          title: "ToListDemo.java",
          code: `import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class ToListDemo {
    public static void main(String[] args) {
        List<String> a = Stream.of("tea", "coffee").collect(Collectors.toList());
        List<String> b = Stream.of("tea", "coffee").toList();               // Java 16
        List<String> c = Stream.of("tea", null).toList();

        a.add("lassi");
        System.out.println("Collectors.toList: " + a + " " + a.getClass().getSimpleName());
        try {
            b.add("lassi");
        } catch (UnsupportedOperationException e) {
            System.out.println("Stream.toList add -> UnsupportedOperationException");
        }
        System.out.println("Stream.toList with null: " + c);
        try {
            List.copyOf(c);
        } catch (NullPointerException e) {
            System.out.println("List.copyOf with null -> NullPointerException");
        }
    }
}`,
        },
        {
          type: "output",
          text: `Collectors.toList: [tea, coffee, lassi] ArrayList
Stream.toList add -> UnsupportedOperationException
Stream.toList with null: [tea, null]
List.copyOf with null -> NullPointerException`,
        },
        {
          type: "paragraph",
          text: "`Collectors.toList()` returns an `ArrayList` today, though the Javadoc doesn't promise any particular type or mutability. `Stream.toList()` returns an unmodifiable list that, unlike `List.of`, accepts `null`. Swapping one for the other in old code can break a caller that was adding to the result.",
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Thinking unmodifiable means frozen",
        },
        {
          type: "paragraph",
          text: "The view in `ViewVsCopy` changed when the owner changed the list behind it. If a class returns `Collections.unmodifiableList(items)` and later modifies `items`, every caller holding that view sees the change, possibly in the middle of iterating it, which brings back `ConcurrentModificationException`. For a stable result, return `List.copyOf(items)`.",
        },
        {
          type: "heading",
          text: "Thinking immutable means deeply immutable",
        },
        {
          type: "paragraph",
          text: "A school's weekly timetable is a list of daily lists. Freezing the outer list doesn't freeze the inner ones:",
        },
        {
          type: "code",
          language: "java",
          title: "ShallowFreeze.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class ShallowFreeze {
    public static void main(String[] args) {
        List<String> monday = new ArrayList<>(List.of("Math"));
        List<List<String>> week = List.of(monday);    // the outer list is frozen

        monday.add("Science");                         // the inner list is not
        week.get(0).add("Art");
        System.out.println(week);
    }
}`,
        },
        {
          type: "output",
          text: "[[Math, Science, Art]]",
        },
        {
          type: "paragraph",
          text: "`List.of` stops me adding or replacing days. It does nothing about the objects stored inside. For real immutability, the elements have to be immutable too: strings, numbers, records with immutable fields, or inner lists that are themselves `List.copyOf`.",
        },
        {
          type: "heading",
          text: "Adding to Arrays.asList",
        },
        {
          type: "paragraph",
          text: "`Arrays.asList(\"a\", \"b\").add(\"c\")` throws `UnsupportedOperationException`. It's the most common source of that exception I've seen, usually in a test helper that builds a list with `asList` and passes it to code that adds to it. Wrap it: `new ArrayList<>(Arrays.asList(...))`.",
        },
        {
          type: "heading",
          text: "Putting null into List.of, or asking about it",
        },
        {
          type: "paragraph",
          text: "`List.of(a, b)` where `b` happens to be `null` from a database row throws `NullPointerException` at creation. `immutableList.contains(null)` throws too. When nulls are possible, filter them out first, or use `Arrays.asList`/`Stream.toList`, which allow them.",
        },
        {
          type: "heading",
          text: "Trusting synchronizedList for compound actions and iteration",
        },
        {
          type: "paragraph",
          text: "Each method of a synchronized list is locked, but nothing locks the gap between two calls. This is a classic race between two threads, and the lock doesn't help:",
        },
        {
          type: "code",
          language: "java",
          title: "Check-then-act (fragment)",
          code: `List<String> waitlist = Collections.synchronizedList(new ArrayList<>());

// Two threads run this at the same time for "Asha":
if (!waitlist.contains("Asha")) {   // both see false...
    waitlist.add("Asha");           // ...and both add. Asha is now in twice.
}

// Fix: hold the list's own lock for the whole check-and-add
synchronized (waitlist) {
    if (!waitlist.contains("Asha")) waitlist.add("Asha");
}`,
        },
        {
          type: "paragraph",
          text: "Iteration has the same gap, and it fails even with one thread. The wrapper's iterator is the underlying `ArrayList`'s fail-fast iterator:",
        },
        {
          type: "code",
          language: "java",
          title: "SyncIteration.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SyncIteration {
    public static void main(String[] args) {
        List<String> orders = Collections.synchronizedList(new ArrayList<>(List.of("O1", "O2", "O3")));
        try {
            for (String o : orders) {           // each call is locked, the loop is not
                if (o.equals("O1")) orders.add("O4");
            }
        } catch (java.util.ConcurrentModificationException e) {
            System.out.println("still fail-fast: " + e.getClass().getSimpleName());
        }

        synchronized (orders) {                 // the documented way to iterate
            for (String o : orders) System.out.print(o + " ");
        }
        System.out.println();
    }
}`,
        },
        {
          type: "output",
          text: `still fail-fast: ConcurrentModificationException
O1 O2 O3 O4 `,
        },
        {
          type: "paragraph",
          text: "The `Collections.synchronizedList` Javadoc says the user **must** manually synchronize on the returned list when iterating it. That's why it's rarely enough in practice: every caller has to remember the lock for every loop and every check-then-act. `CopyOnWriteArrayList` and `ConcurrentHashMap` (Multithreading track) solve those problems inside the collection instead.",
        },
        {
          type: "heading",
          text: "binarySearch on an unsorted list",
        },
        {
          type: "paragraph",
          text: "`Collections.binarySearch` and `Arrays.binarySearch` don't check that the input is sorted, and they can't without an O(n) scan. On unsorted data they return a wrong index or a wrong \"not found\" with no error. The list must be sorted with the same comparator I search with.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "For constants, use `List.of`, `Set.of`, `Map.of`. They're short, truly immutable, compact, and fail loudly on nulls and duplicate keys.",
            "Return `List.copyOf(field)` (or an immutable field directly) from getters, not the internal mutable list. Callers can't change my state, and I can't accidentally change theirs.",
            "Make defensive copies on the way **in** too: in constructors and setters that receive a collection. A record's compact constructor is a neat place for it.",
            "Use `Collections.unmodifiableList` when I deliberately want callers to see live changes but not make them, and say so in the method's Javadoc.",
            "Remember that the factory methods are shallow. Keep elements immutable if the whole thing must be.",
            "Never depend on `Set.of`/`Map.of` (or `HashSet`/`HashMap`) iteration order, in code or in tests. Use `List.of`, `LinkedHashMap`, or sort before printing.",
            "Use `Collections.shuffle(list, new Random(seed))` in tests for repeatable results, and a seedless shuffle (or `SecureRandom`) where unpredictability matters.",
            "Prefer `ConcurrentHashMap` and `CopyOnWriteArrayList` over `synchronizedX` wrappers for shared data. If I do use a wrapper, every loop goes inside `synchronized (list)`.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "list",
          items: [
            "`List.of` with one or two elements stores them in two fields, no array, as `javap` showed. Immutable collections also skip the spare capacity an `ArrayList` keeps for growth, so they're lean for constants.",
            "`Set.of` and `Map.of` are open-addressing tables in a single flat array, with no per-entry node objects. Lookups are O(1) on average, like `HashSet`, with less memory.",
            "`List.copyOf` is O(n), but returns its argument unchanged if it's already an immutable list. Defensive copies of already-immutable data are free.",
            "Wrappers (`unmodifiableList`, `synchronizedList`) are O(1) to create: one small object, no copying. Every call goes through one extra method (and, for synchronized, a lock).",
            "`Collections.max`, `min` and `frequency` are O(n). `binarySearch` is O(log n) on a `RandomAccess` list like `ArrayList`, but on a `LinkedList` it falls back to iterator-based search and does O(n) link traversals.",
            "`Collections.shuffle` and `reverse` are O(n). `Arrays.copyOf` is a fast bulk copy (`System.arraycopy` underneath), much cheaper than copying element by element in a loop.",
            "`CopyOnWriteArrayList` makes every write O(n). Fine for listener lists, terrible for a list that's appended to on every request.",
          ],
        },
      ],
    },
    {
      title: "Immutable Collections in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A food ordering backend has a menu that admins edit occasionally and that thousands of requests read every minute. The simplest correct design: keep the current menu as an immutable list in a `volatile` field. Publishing a new menu builds a fresh immutable list and swaps the reference. Readers never lock, never copy, and can never see a half-edited menu.",
        },
        {
          type: "code",
          language: "java",
          title: "MenuService.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class MenuService {
    record Dish(String name, int price) {}

    private volatile List<Dish> menu = List.of();       // always an immutable list

    // Admin uploads a new menu: build it, then swap it in one step
    void publish(List<Dish> draft) {
        menu = List.copyOf(draft);
    }

    // Every caller gets the same frozen list: no copies, no locks
    List<Dish> currentMenu() {
        return menu;
    }

    public static void main(String[] args) {
        MenuService service = new MenuService();
        List<Dish> draft = new ArrayList<>(List.of(new Dish("Idli", 40), new Dish("Dosa", 70)));
        service.publish(draft);

        List<Dish> seenByApp = service.currentMenu();
        draft.add(new Dish("Vada", 35));                  // admin keeps editing the draft
        service.publish(draft);                           // ...and publishes again

        System.out.println("old reader: " + seenByApp);
        System.out.println("new reader: " + service.currentMenu());
        try {
            service.currentMenu().clear();
        } catch (UnsupportedOperationException e) {
            System.out.println("clear() -> UnsupportedOperationException");
        }
    }
}`,
        },
        {
          type: "output",
          text: `old reader: [Dish[name=Idli, price=40], Dish[name=Dosa, price=70]]
new reader: [Dish[name=Idli, price=40], Dish[name=Dosa, price=70], Dish[name=Vada, price=35]]
clear() -> UnsupportedOperationException`,
        },
        {
          type: "list",
          items: [
            "`List.copyOf(draft)` is the defensive copy on the way in. Editing the draft afterwards didn't change what readers saw until the next `publish`.",
            "A reader that grabbed the old menu kept a consistent old menu. Nobody saw a list with half the new dishes.",
            "`Dish` is a record with a `String` and an `int`, so the elements are immutable too. The whole menu is deeply immutable.",
            "`volatile` makes the new reference visible to other threads; the Multithreading track explains why it's needed. The immutability is what makes it safe to share the list itself without any lock.",
          ],
        },
        {
          type: "heading",
          text: "Defensive copies in a domain class",
        },
        {
          type: "paragraph",
          text: "The same habit at the class level. A teacher hands in her periods for the day; one class stores the list she handed in, the other copies it:",
        },
        {
          type: "code",
          language: "java",
          title: "Timetable.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class Timetable {
    static final class Leaky {
        private final List<String> periods;
        Leaky(List<String> periods) { this.periods = periods; }
        List<String> periods() { return periods; }
    }

    record Safe(List<String> periods) {
        Safe {
            periods = List.copyOf(periods);   // copy in: caller can't change us later
        }
    }

    public static void main(String[] args) {
        List<String> input = new ArrayList<>(List.of("Math", "English"));
        Leaky leaky = new Leaky(input);
        Safe safe = new Safe(input);

        input.add("Games");                              // caller edits its own list
        leaky.periods().clear();                         // or edits through the getter
        System.out.println("leaky: " + leaky.periods());
        System.out.println("safe:  " + safe.periods());
        try {
            safe.periods().add("Games");
        } catch (UnsupportedOperationException e) {
            System.out.println("safe.periods().add -> UnsupportedOperationException");
        }
    }
}`,
        },
        {
          type: "output",
          text: `leaky: []
safe:  [Math, English]
safe.periods().add -> UnsupportedOperationException`,
        },
        {
          type: "paragraph",
          text: "`final` on the field only stopped `Leaky` from pointing at a different list. The list itself was shared with the caller, and a caller wiped it out through the getter. The record copies once in its compact constructor, and because the copy is immutable, its generated accessor can return it directly with no second copy.",
        },
      ],
    },
    {
      title: "Interview Questions",
      blocks: [
        {
          type: "heading",
          text: "Basics",
        },
        {
          type: "qa",
          items: [
            {
              question: "What's the difference between Collection and Collections?",
              answer:
                "`Collection` is the root interface for lists, sets and queues, the thing that has `add`, `remove`, `size` and `iterator`. `Collections` is a utility class of static methods that work on collections: `sort`, `binarySearch`, `max`, `min`, `frequency`, `shuffle`, the empty and singleton factories, and the unmodifiable and synchronized wrappers.\n\nSame pattern as `Arrays` for arrays, and `Objects` for objects.",
            },
            {
              question: "What does Collections.binarySearch return when the key is missing?",
              answer:
                "`-(insertionPoint) - 1`, where the insertion point is the index where the key would go to keep the list sorted. It's always negative when the key isn't found, even if the insertion point is 0.\n\nIn my run, searching `[15, 15, 15, 25, 40, 60]` for 30 returned `-5`: 30 belongs at index 4. The list must already be sorted in the same order, or the result is meaningless.",
            },
            {
              question: "What's the difference between Collections.unmodifiableList and List.of?",
              answer:
                "`unmodifiableList` is a read-only **view** over an existing list. I can't change it through the view, but whoever owns the original can, and the view shows those changes. It allows `null`. `List.of` creates a new, truly immutable list that owns its elements, rejects `null`, and never changes.\n\nIn my test, a view showed a dish the owner added afterwards, and a `List.copyOf` snapshot didn't.",
            },
            {
              question: "What are the restrictions of List.of, Set.of and Map.of?",
              answer:
                "They're immutable, so every mutator, including `set`, throws `UnsupportedOperationException`. They reject `null` elements, keys and values with `NullPointerException`, and even `contains(null)` throws. `Set.of` and `Map.of` throw `IllegalArgumentException` for duplicate elements or keys, with messages like `duplicate element: UPI`.\n\nAnd `Set.of`/`Map.of` iteration order is unspecified and changes from one JVM run to the next, by design.",
            },
            {
              question: "What does Arrays.asList return?",
              answer:
                "A fixed-size list backed by the array: `java.util.Arrays$ArrayList`, not `java.util.ArrayList`. `set` works and writes through to the array, and array writes show up in the list. `add` and `remove` throw `UnsupportedOperationException`, because the class simply doesn't implement them and inherits `AbstractList`'s throwing defaults.\n\nFor a normal growable list: `new ArrayList<>(Arrays.asList(...))`.",
            },
            {
              question: "What's the difference between Arrays.toString and Arrays.deepToString?",
              answer:
                "`toString` prints one level. For an `int[][]` the elements are arrays, so it prints their default `toString`, like `[I@1b6d3586`. `deepToString` recurses into nested arrays and prints `[[1, 2], [3, 4]]`.\n\n`Arrays.equals` versus `deepEquals` is the same story: two identical 2D arrays were `equals` false and `deepEquals` true in my run, because `equals` compares the inner arrays by reference.",
            },
          ],
        },
        {
          type: "heading",
          text: "Tricky",
        },
        {
          type: "qa",
          items: [
            {
              question: "What does Arrays.asList(new int[]{1, 2, 3}).size() return?",
              answer:
                "1. `asList` is generic, `T...`, and `T` can't be a primitive, so the whole `int[]` is treated as one object and the result is a `List<int[]>` with one element.\n\n`Arrays.asList(1, 2, 3)` autoboxes and gives size 3, and so does an `Integer[]`. For an `int[]`, `Arrays.stream(arr).boxed().toList()` gives a real list of numbers.",
            },
            {
              question: "Why does List.of(...).contains(null) throw instead of returning false?",
              answer:
                "Because the immutable collections reject `null` everywhere, including as a query argument, and they check it up front with `Objects.requireNonNull`. The `Collection` interface allows that: `contains` is documented as optionally throwing `NullPointerException` if the collection doesn't permit nulls.\n\nIt matters when code switches from a `HashSet` to `Set.of`: a `contains(maybeNull)` check that used to return false now throws.",
            },
            {
              question: "Is a List.of list deeply immutable?",
              answer:
                "No, it's shallow. The list's structure and references can't change, but the objects it holds are as mutable as they were. My `List.of(monday)` timetable still let me add subjects to `monday`, and `week.get(0).add(...)` worked too.\n\nFor deep immutability, the elements must be immutable: strings, boxed numbers, records with immutable fields, or nested immutable collections.",
            },
            {
              question: "Why is Collections.synchronizedList rarely enough?",
              answer:
                "Because it only makes each single method call atomic. Compound actions like \"if not contains, then add\" can interleave between threads, and iteration is many calls, so the Javadoc requires callers to hold `synchronized (list)` around every loop. My single-threaded test still got `ConcurrentModificationException` from a loop over a synchronized list.\n\nEvery caller has to remember the lock, which is easy to forget. Concurrent collections like `CopyOnWriteArrayList` and `ConcurrentHashMap`, with atomic methods like `putIfAbsent` and `addIfAbsent`, build that safety in.",
            },
            {
              question: "What's the difference between Stream.toList() and Collectors.toList()?",
              answer:
                "`Collectors.toList()` makes no promise about mutability, and in practice returns an `ArrayList` that callers can add to. `Stream.toList()`, Java 16, returns an unmodifiable list, and unlike `List.of` it allows `null` elements.\n\nI saw all three behaviours in one run: adding to the collector's list worked, adding to `toList()`'s threw, and `toList()` happily held `[tea, null]`. There's also `Collectors.toUnmodifiableList()`, which rejects nulls like `List.of`.",
            },
            {
              question: "Why do Set.of and Map.of give a different iteration order on every run?",
              answer:
                "On purpose. `ImmutableCollections` has a `SALT32L` and a `REVERSE` flag chosen randomly at JVM startup, and `SetN`/`MapN` use them to decide where elements land and which way iteration goes. I ran the same program four times and got four orders.\n\nThe reason is defensive: code that silently depended on `HashMap`'s accidental order broke whenever the JDK changed. Randomizing per run makes such a dependency show up in testing right away.",
            },
          ],
        },
        {
          type: "heading",
          text: "Internals",
        },
        {
          type: "qa",
          items: [
            {
              question: "How does Collections.unmodifiableList work internally?",
              answer:
                "It returns a small wrapper object, `Collections$UnmodifiableList` (or the `RandomAccess` variant), that holds a reference to the original list in a final field `c`. Read methods forward to `c`, and write methods throw `UnsupportedOperationException`. Nothing is copied.\n\n`javap -p` on `Collections$UnmodifiableCollection` shows the single `c` field. That's exactly why it's a view: every read goes to the live original. On JDK 21, wrapping an already-unmodifiable list returns the same wrapper.",
            },
            {
              question: "What classes does List.of actually return?",
              answer:
                "Package-private classes in `java.util.ImmutableCollections`. Zero elements and three or more give `ListN`, backed by a final array plus an `allowNulls` flag. One or two elements give `List12`, which stores them in two final fields `e0` and `e1` with no array at all. Maps similarly use `Map1` and `MapN`, and sets `Set12` and `SetN`.\n\nI printed the class names and confirmed the fields with `javap -p`. `Stream.toList()` reuses `ListN` with `allowNulls` true.",
            },
            {
              question: "When does List.copyOf not copy?",
              answer:
                "When its argument is already one of the JDK's immutable lists, like a `List.of` result or an earlier `List.copyOf`. It just returns the same instance. My test printed `true` for `List.copyOf(copy) == copy`.\n\nIt does copy an `unmodifiableList` view, because a view isn't immutable: its owner can still change it. So defensive copying with `copyOf` is cheap when it's unnecessary and correct when it is.",
            },
            {
              question: "How does Collections.shuffle work, and why pass a Random?",
              answer:
                "It's a Fisher-Yates shuffle: walking from the end of the list to the front, it swaps each position with a randomly chosen position at or before it. That's O(n) and gives every permutation equal probability. For large lists that aren't `RandomAccess`, it copies to an array first, shuffles that, and writes back.\n\nPassing a `Random` with a fixed seed makes the result reproducible, which is what I want in tests. `shuffle(list, new Random(42))` gave me the same order every run.",
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
            "Make a list of ten exam marks. Print the max, min, how many times 75 appears, and the position of 90 after sorting. Hint: `binarySearch` only after `sort`.",
            "Shuffle the list three times with `new Random(7)` and three times with `new Random()`. Compare the outputs.",
            "Wrap a list with `Collections.unmodifiableList`, then add to the original and print the view. Then do the same with `List.copyOf`.",
            "Call `Arrays.asList` on a `String[]`, change an element through the list, and print the array. Then try `add` and read the exception.",
            "Try `Set.of(\"a\", \"b\", \"a\")`, `Map.of(\"k\", 1, \"k\", 2)` and `List.of(\"x\", null)`. Write down each exception and its message.",
            "Run a program that prints `Set.of` with six strings five times. Then change it to `new LinkedHashSet<>(List.of(...))` and run it again.",
            "Write a `record Classroom(String name, List<String> students)` with a compact constructor that makes a defensive copy. Prove that changing the input list afterwards doesn't affect the record.",
            "Bonus: run `javap -p 'java.util.ImmutableCollections$List12'` and find the two fields.",
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `COLLECTIONS  sort reverse swap rotate shuffle(list, new Random(seed))
             binarySearch -> index, or -(insertionPoint)-1  (sorted input!)
             max min frequency nCopies emptyList singletonList
ARRAYS       sort fill copyOf copyOfRange equals deepEquals
             toString deepToString binarySearch
             asList -> FIXED SIZE, backed by the array, set writes through
                       asList(int[]) -> one element!

VIEW         Collections.unmodifiableList(x)
             read-only for me, owner can still change x, nulls ok
IMMUTABLE    List.of Set.of Map.of (9)   List.copyOf (10)
             no changes, no nulls (even contains(null) throws)
             Set.of/Map.of: duplicates -> IllegalArgumentException
                            iteration order random per JVM run
             shallow: elements can still be mutable
STREAM       toList() (16): unmodifiable, nulls allowed
             Collectors.toList(): an ArrayList in practice

SYNC WRAPPER every call locked, loops and check-then-act are NOT
             -> synchronized (list) { ... } or concurrent collections

HABIT        copy in (List.copyOf in constructors), return immutable`,
          caption: "The utilities and the four flavours of read-only, on one screen.",
        },
        {
          type: "list",
          items: [
            "`Collections` and `Arrays` already have the everyday algorithms. Reach for them before writing a loop.",
            "Unmodifiable is a view, immutable is a copy, `Arrays.asList` is a fixed-size window onto an array. They throw on different calls and change for different reasons.",
            "Use the Java 9 factories for constants, `List.copyOf` for defensive copies, and never rely on `Set.of`/`Map.of` order.",
          ],
        },
      ],
    },
  ],
};
