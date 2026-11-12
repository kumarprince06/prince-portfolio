import type { Lesson } from "../types";

export const associationAggregationComposition: Lesson = {
  slug: "association-aggregation-composition",
  date: "2026-11-05",
  title: "Association, Aggregation and Composition",
  description:
    "The has-a side of Java OOP: dependency, association, aggregation and composition with real examples, multiplicity and UML notation, how ownership and lifecycle show up in code, in bytecode and on the heap, and the bidirectional, JSON-recursion and cascading-delete traps they cause in production.",
  tags: ["Core Java", "OOP", "Association", "Aggregation", "Composition", "UML"],
  sections: [
    {
      title: "What Association, Aggregation and Composition Are",
      blocks: [
        {
          type: "paragraph",
          text: "The Inheritance lesson was about **is-a**: a `Car` is a `Vehicle`. Most relationships in a real backend aren't like that. An `Order` isn't a kind of `Customer`, it **has** a customer. A `Category` has products. An `Order` has a list of order items and a price breakdown. This lesson is the other half of OOP modelling: how one object refers to another, and what that reference is supposed to mean.",
        },
        {
          type: "paragraph",
          text: "There are four names for the different strengths of has-a, and I keep them in this order, from weakest to strongest:",
        },
        {
          type: "list",
          items: [
            "**Dependency** (uses-a): A needs B only while one method runs. B arrives as a parameter or a local and is forgotten on return.",
            "**Association** (knows-a): A keeps a reference to B in a field, but B has a life of its own. An `Order` knows its `Customer`.",
            "**Aggregation** (has-a): a special association where A is a whole made of parts, and the parts live independently. They exist before the whole, can be shared by several wholes, and survive when the whole is deleted. A `Category` and its `Product`s.",
            "**Composition** (part-of): the strongest form. The whole creates its parts, owns them exclusively and controls every change to them, and the parts mean nothing without it. An `Order` and its `OrderItem`s and `PriceBreakdown`.",
          ],
        },
        {
          type: "diagram",
          text: `weakest ──────────────────────────────────────────────► strongest

dependency      association     aggregation      composition
  uses-a          knows-a         has-a            part-of
  parameter       field to an     field holding    field holding parts
  or local        independent     parts that       the whole created
  only            object          live on their    and alone controls
                                  own, shared`,
          caption: "Inheritance (is-a) and realization (implements) relate types rather than objects, so they sit beside this scale, not on it.",
        },
        {
          type: "paragraph",
          text: "The reason this needs a whole lesson: Java has **no keyword** for any of these. All four compile to the same thing, a reference, which I'll prove with `javap`. The difference lives entirely in the code around the reference: who creates the other object, who else may hold it, and what happens to it when the whole is deleted. Getting that wrong causes real bugs, and I reproduce them below with real output: an order emptied by code that doesn't own it, a discount that leaks into a second order because both shared one price object, a JSON endpoint that recurses until Jackson gives up, and a delete that wipes shared parts that are still in use elsewhere.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Objects pointing at other objects is as old as object orientation. **Simula 67**, designed by Ole-Johan Dahl and Kristen Nygaard at the Norwegian Computing Center, introduced classes, objects and subclasses, and its `ref` variables were references to objects. **Smalltalk-80**, from Alan Kay's group at Xerox PARC, made everything an object, so every instance variable held a reference to another object. Building big objects out of small ones was the normal style from the start.",
        },
        {
          type: "paragraph",
          text: "The vocabulary for counting relationships came from databases. Peter Chen's entity-relationship model (1976) described relationships as 1:1, 1:N or M:N, which UML later called **multiplicity**.",
        },
        {
          type: "paragraph",
          text: "**C++** (Bjarne Stroustrup, from 1979 as \"C with Classes\") made composition a language feature. A member object stored by value lives inside its owner and is destroyed with it, while a pointer member is where association and aggregation live, and ownership becomes a convention:",
        },
        {
          type: "code",
          language: "cpp",
          code: `struct Car {
    Engine engine;      // stored inside the Car: constructed and destroyed with it
    Person* owner;      // points at a Person the Car doesn't own
};`,
        },
        {
          type: "paragraph",
          text: "When I compiled a small program around this struct with `g++ -std=c++17` and let a `Car` go out of scope, the engine's destructor ran at that closing brace, and the person it pointed at carried on untouched.",
        },
        {
          type: "paragraph",
          text: "The early-1990s design methods each drew these relationships: Grady Booch's method, OMT from James Rumbaugh and colleagues (which drew aggregation with a diamond), and Ivar Jacobson's OOSE. The three were merged into **UML**, adopted by the Object Management Group as UML 1.1 in 1997. In UML there is really one relationship, the association, and each end has an aggregation kind: none, **shared** (the hollow diamond) or **composite** (the filled diamond). The UML specification itself says the precise semantics of shared aggregation vary by application area and modeler, which is why the hollow diamond is the vaguest symbol in the notation. Composite is precise: a part belongs to at most one composite at a time, and when the composite is deleted, its parts go with it.",
        },
        {
          type: "paragraph",
          text: "In 1994 the Gang of Four's Design Patterns book put the design advice into one line: \"Favor object composition over class inheritance.\" Joshua Bloch's Effective Java repeats it (Item 18 in the third edition), with the `InstrumentedHashSet` example that the Inheritance lesson walked through.",
        },
        {
          type: "paragraph",
          text: "**Java 1.0** (1996) took the opposite road from C++. There are no value members: every field of a class type is a reference. There are no destructors, and the garbage collector frees an object only when nothing reachable refers to it. That one choice is why this lesson exists. In Java, composition isn't something the language gives me. It's a discipline I keep in code.",
        },
        {
          type: "table",
          headers: ["Version", "What it added that matters here"],
          rows: [
            ["Java 1.2 (1998)", "The Collections framework, including `Collections.unmodifiableList`, and `java.lang.ref.WeakReference`, which I use below to watch lifecycles"],
            ["Java 5 (2004)", "Generics: `List<OrderItem>`, kept in the class file as a `Signature` attribute"],
            ["Java 9 and 10", "`List.of` (JEP 269) and `List.copyOf`: the standard tools for not leaking a composed collection"],
            ["Java 16", "Records (JEP 395): immutable value parts that are safe to hand out"],
            ["Java 21", "Sequenced collections (JEP 431): `items.getLast()` instead of `items.get(items.size() - 1)`"],
            ["Java 25", "Compact object headers as a product option (JEP 519): every small part object gets cheaper. Measured in Performance"],
          ],
        },
        {
          type: "paragraph",
          text: "What Java 25 still doesn't have is a way to store a part inline inside its whole, the way C++ does. That's Project Valhalla's value classes (JEP 401), which weren't part of Java 25. Persistence frameworks brought the same ideas to databases: JPA 1.0 (2006) mapped associations with `@ManyToOne` and `@OneToMany` and cascades, and JPA 2.0 (2009) added `orphanRemoval` and `@ElementCollection`, which are the closest JPA gets to saying \"composition\".",
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "The analogy that sorted these out for me is a house, because one house has all of them at once.",
        },
        {
          type: "list",
          items: [
            "The **plumber** who fixes a leak is a dependency. The house needs them for one job. Then they leave, and nothing in the house remembers them. A different plumber next time changes nothing.",
            "The **neighbours** are an association. The residents know them for years, by name, but neither household owns the other, and either can move away without the other ceasing to exist.",
            "The **furniture** is aggregation. It was bought before the move, a sofa can be lent to a friend, and when the house is demolished, the furniture is carried out first and goes to the next house intact.",
            "The **rooms** are composition. The kitchen was built with this house, it can't be moved into another one, and nobody says \"the kitchen\" without meaning \"the kitchen of this house\". Demolish the house and the kitchen is gone with it.",
            "\"The house **is a** building\" is inheritance, and \"the house **meets** the building code\" is realization. Both are about what the house is, not about what it holds.",
          ],
        },
        {
          type: "paragraph",
          text: "Where the analogy breaks down, and each of these breaks is a section of this lesson:",
        },
        {
          type: "list",
          items: [
            "A real room physically sits inside the house. A Java part is a separate heap object that the whole points to. Nothing physical stops another object from keeping a reference to my kitchen. Only my code does: private fields, no raw getters, copies at the boundary.",
            "Demolition is an event. Java has no delete. A composed part dies when it becomes unreachable, and the garbage collector reclaims it later, on its own schedule.",
            "A sofa can only be in one house at a time. A Java object can sit in two aggregates at once, like one `Product` in both the Electronics and the Sale category, and UML's shared aggregation explicitly allows that.",
          ],
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "heading",
          text: "The scale, weakest to strongest",
        },
        {
          type: "table",
          headers: ["Relationship", "Reads as", "Java shape", "Lifetimes", "Everyday", "In this lesson's code"],
          rows: [
            ["Dependency", "uses-a", "Method parameter, local variable or static call", "Linked only during the call", "Me and the ATM I withdraw cash from", "`Order.checkout(DiscountPolicy, Notifier)`"],
            ["Association", "knows-a", "Field referring to an object that was passed in", "Independent", "A doctor and patients, a teacher and students", "`Order` to its `Customer`"],
            ["Aggregation", "has-a (whole and parts)", "Field, often a collection, holding parts added from outside", "Independent; parts can be shared", "A team and its players, a playlist and its songs", "`Category` to its `Product`s"],
            ["Composition", "part-of, owns", "Field holding parts the whole created itself and never hands out raw", "Parts live and die with the whole", "A house and its rooms, a book and its chapters", "`Order` to its `OrderItem`s and `PriceBreakdown`"],
            ["Inheritance", "is-a", "`extends`", "One object", "A car is a vehicle", "`Laptop extends Product`"],
            ["Realization", "implements, can-do", "`implements`", "One object", "A plug meets a socket standard", "`CardPayment implements PaymentProcessor`"],
          ],
        },
        {
          type: "paragraph",
          text: "Aggregation and composition are both kinds of association: UML draws all three as a line between classes, and the diamond on the whole's end is what makes it aggregation or composition. Dependency is weaker than all of them because nothing is kept. Inheritance and realization are a different axis altogether. A `Laptop` object isn't linked to a separate `Product` object: it's one object whose class extends `Product`. I put them on the scale only because interview questions do.",
        },
        {
          type: "heading",
          text: "UML notation in ASCII",
        },
        {
          type: "diagram",
          text: `Order - - - - - - «use» - - - -> Notifier        dependency
                                                 dashed, open arrow

Order ─────────────────────────> Customer        association
      0..*                    1                  arrow = navigable side

Category ◇────────────────────── Product         aggregation
      0..*                 0..*                  hollow diamond at whole

Order ◆───────────────────────── OrderItem       composition
                           1..*                  filled diamond at whole

Laptop ────────────────────────▷ Product         inheritance (is-a)

CardPayment - - - - - - - - - -▷ PaymentProcessor   realization`,
          caption: "Multiplicities sit at the end they describe: each Order has exactly 1 Customer, each Customer has 0..* Orders.",
        },
        {
          type: "image",
          src: "/images/java/association-aggregation-composition-uml.svg",
          alt: "UML class diagram of an order model. Order has a solid association arrow to Customer (multiplicity 1, with 0..* orders per customer) and a dashed «use» dependency arrow to the Notifier interface. Order has filled-diamond composition lines to PriceBreakdown (1) and OrderItem (1..*). OrderItem has an association arrow to Product (0..* items per product, 1 product per item). Category has a hollow-diamond aggregation line to Product with 0..* at both ends. Laptop extends Product with a hollow triangle, and CardPayment realizes the PaymentProcessor interface with a dashed line and hollow triangle. A legend explains all six notations.",
          caption: "The whole model of this lesson in one diagram. The diamond always sits at the whole's end, and only Order's own parts are orange.",
        },
        {
          type: "heading",
          text: "Multiplicity",
        },
        {
          type: "paragraph",
          text: "Multiplicity says how many objects can sit at one end of a relationship. In Java it decides the field's type and what the constructor checks:",
        },
        {
          type: "table",
          headers: ["UML", "Meaning", "Typical Java shape", "Example"],
          rows: [
            ["`1`", "Exactly one", "Non-null field, checked in the constructor", "An order's customer"],
            ["`0..1`", "Optional", "Nullable field, exposed as `Optional`", "An order's coupon, if one was applied"],
            ["`0..*` or `*`", "Any number", "A collection that may be empty", "A customer's past orders"],
            ["`1..*`", "At least one", "A collection the constructor refuses to leave empty", "An order's items"],
            ["`m..n`", "A range", "A collection with a checked size", "A football team with 11..25 players"],
            ["`*` to `*`", "Many-to-many", "Collections on both sides, or a join object", "Students and the courses they enrol in"],
          ],
        },
        {
          type: "heading",
          text: "Navigability",
        },
        {
          type: "list",
          items: [
            "**Unidirectional**: only one side holds the reference. An `Order` knows its `Customer`, but a `Customer` object has no list of orders. To go the other way, I ask a repository.",
            "**Bidirectional**: both sides hold references. A `Customer` has `orders` and each `Order` has `customer`. Navigation is convenient in both directions, but now there are two references to keep in sync, and a cycle in the object graph. Both costs get their own section below.",
          ],
        },
        {
          type: "heading",
          text: "No keyword: where the difference actually shows up",
        },
        {
          type: "table",
          headers: ["Question", "Association", "Aggregation", "Composition"],
          rows: [
            ["Who creates the other object?", "Someone else", "Someone else", "The whole, in its constructor or its own methods"],
            ["How does it arrive?", "Constructor or setter parameter", "An `add(part)` style method", "It doesn't arrive: `new` runs inside the whole"],
            ["Who else may reference it?", "Anyone", "Anyone; parts are shared", "Nobody: the whole hands out a view, a copy or an immutable part"],
            ["When the whole is deleted?", "The other object is untouched", "The parts stay; only the links go", "The parts go too"],
            ["In `equals`, copies, JSON", "Refer by id; share on copy", "Refer by id; copy the links, not the parts", "Part of the whole's value: compare and copy deeply"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "All of them compile to a reference",
        },
        {
          type: "paragraph",
          text: "To see what the compiler does with each relationship, I put all four into one small model:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderModel.java",
          code: `import java.util.ArrayList;
import java.util.List;

class Customer { final String name; Customer(String name) { this.name = name; } }
class Product  { final String sku;  Product(String sku)   { this.sku = sku; } }

record OrderItem(String sku, int qty, int unitPrice) {}
record PriceBreakdown(int subtotal, int shipping) {}

interface Notifier { void send(String to, String text); }

class Category {                                    // aggregation
    private final List<Product> products = new ArrayList<>();
    void add(Product p) { products.add(p); }        // the part comes from outside
}

class Order {
    private final Customer customer;                // association
    private final PriceBreakdown price;             // composition
    private final List<OrderItem> items = new ArrayList<>();   // composition

    Order(Customer customer, String sku, int qty, int unitPrice) {
        this.customer = customer;                   // stored, not created
        items.add(new OrderItem(sku, qty, unitPrice));          // created here
        int subtotal = qty * unitPrice;
        price = new PriceBreakdown(subtotal, subtotal >= 500 ? 0 : 40);  // created here
    }

    void confirm(Notifier notifier) {               // dependency: a parameter only
        notifier.send(customer.name, "Order total Rs " + (price.subtotal() + price.shipping()));
    }
}

public class OrderModel {
    public static void main(String[] args) {
        Order order = new Order(new Customer("Asha"), "BOOK-42", 1, 450);
        order.confirm((to, text) -> System.out.println(to + ": " + text));
        new Category().add(new Product("BOOK-42"));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac OrderModel.java && java OrderModel
javap -p -s Order Category`,
        },
        {
          type: "output",
          text: `Asha: Order total Rs 490
Compiled from "OrderModel.java"
class Order {
  private final Customer customer;
    descriptor: LCustomer;
  private final PriceBreakdown price;
    descriptor: LPriceBreakdown;
  private final java.util.List<OrderItem> items;
    descriptor: Ljava/util/List;
  Order(Customer, java.lang.String, int, int);
    descriptor: (LCustomer;Ljava/lang/String;II)V

  void confirm(Notifier);
    descriptor: (LNotifier;)V
}
Compiled from "OrderModel.java"
class Category {
  private final java.util.List<Product> products;
    descriptor: Ljava/util/List;
  Category();
    descriptor: ()V

  void add(Product);
    descriptor: (LProduct;)V
}`,
        },
        {
          type: "list",
          items: [
            "The association (`customer`) and the composed part (`price`) are both a field whose descriptor is `L<ClassName>;`, a reference. Nothing in the descriptor says \"owned\" or \"borrowed\".",
            "The composed `items` list in `Order` and the aggregated `products` list in `Category` have the **identical** descriptor, `Ljava/util/List;`. After erasure, a list of parts I own and a list of parts I share are the same type.",
            "The dependency doesn't appear in any field at all. It exists only in a method descriptor, `(LNotifier;)V`, which is exactly what \"uses it for one call\" means.",
          ],
        },
        {
          type: "paragraph",
          text: "The verbose listing has the flags and attributes, so I checked whether anything there marks ownership:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -v -p Order | grep -A3 "List<OrderItem> items;"`,
        },
        {
          type: "output",
          text: `  private final java.util.List<OrderItem> items;
    descriptor: Ljava/util/List;
    flags: (0x0012) ACC_PRIVATE, ACC_FINAL
    Signature: #64                          // Ljava/util/List<LOrderItem;>;`,
        },
        {
          type: "paragraph",
          text: "All three fields in `Order` carry the same flags, `(0x0012) ACC_PRIVATE, ACC_FINAL`, and those are flags I chose, not relationship markers. The only extra is the `Signature` attribute, which keeps the generic type `List<OrderItem>` for reflection. That's how Jackson and JPA find out what's inside a collection, but it still says nothing about who owns the elements. The class file format has no concept of aggregation or composition.",
        },
        {
          type: "heading",
          text: "The difference is in the constructor's bytecode",
        },
        {
          type: "paragraph",
          text: "If the fields are identical, the only place composition can show up is in the code that fills them. I cut the argument loads and the shipping arithmetic out of this listing, where the `...` lines are:",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -c -p Order | sed -n '/Order(Customer/,/return/p'`,
        },
        {
          type: "output",
          text: `  Order(Customer, java.lang.String, int, int);
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: aload_0
       5: new           #7                  // class java/util/ArrayList
       8: dup
       9: invokespecial #9                  // Method java/util/ArrayList."<init>":()V
      12: putfield      #10                 // Field items:Ljava/util/List;
      15: aload_0
      16: aload_1
      17: putfield      #16                 // Field customer:LCustomer;
      20: aload_0
      21: getfield      #10                 // Field items:Ljava/util/List;
      24: new           #20                 // class OrderItem
      ...
      32: invokespecial #22                 // Method OrderItem."<init>":(Ljava/lang/String;II)V
      35: invokeinterface #25,  2           // InterfaceMethod java/util/List.add:(Ljava/lang/Object;)Z
      40: pop
      ...
      48: new           #31                 // class PriceBreakdown
      ...
      68: invokespecial #33                 // Method PriceBreakdown."<init>":(II)V
      71: putfield      #36                 // Field price:LPriceBreakdown;
      74: return`,
        },
        {
          type: "list",
          items: [
            "**Association:** `aload_1` then `putfield customer`. The constructor stores the reference it was handed in local slot 1. It never sees where the `Customer` came from.",
            "**Composition:** `new OrderItem`, `invokespecial OrderItem.<init>`, then `List.add`; and `new PriceBreakdown` straight into `putfield price`. The `new` instruction runs inside `Order`'s own constructor, so at this moment `Order` holds the only reference to each part.",
            "The field initializer `items = new ArrayList<>()` ran first, at offset 5, before the constructor body. That `ArrayList` is a composed part too, of both `Order` and `Category`. Even in an aggregation, the collection object is the whole's own; only its elements are shared.",
            "Nothing here **enforces** anything. A later getter could return `price` or `items`, and then someone else would hold them too. \"Created inside\" is a fact about this bytecode; \"owned exclusively\" is a promise the rest of the class has to keep.",
          ],
        },
        {
          type: "heading",
          text: "On the heap, they're all edges",
        },
        {
          type: "paragraph",
          text: "At runtime there are no relationship kinds at all, only objects and the references between them. The Stack vs Heap lesson showed that an object lives exactly as long as it's reachable from a GC root, and the Memory Allocation lesson showed that a reference field is 4 bytes inside its object. Put together, this is the whole runtime story of has-a:",
        },
        {
          type: "diagram",
          text: ` STACK: main's frame       HEAP
┌───────────────┐
│ books  ●──────┼──► Category ──► ArrayList ──► Object[] ──┐
│ order  ●──────┼──► Order                                 ▼
└───────────────┘     │ └── product ────────────────────► Product
                      └──── price ──► PriceBreakdown

 set order = null:
   Order, PriceBreakdown  no path from a root -> collectable together
   Product                still reachable: books -> list -> Object[]`,
          caption: "The garbage collector doesn't know which edge is \"composition\". It only follows edges from the roots.",
        },
        {
          type: "paragraph",
          text: "So in Java, composition's \"the parts die with the whole\" is not a rule the JVM applies. It's a consequence: if the whole never let a reference to its part escape, then the part becomes unreachable at the same moment the whole does. If the whole did leak it, the part quietly outlives it. I test exactly that with `WeakReference`s in the lifecycle section.",
        },
        {
          type: "heading",
          text: "Everything that walks the graph follows the edges",
        },
        {
          type: "paragraph",
          text: "A handful of operations walk an object graph recursively: `toString` that prints fields, `equals` and `hashCode` that combine fields, deep copies, Java serialization, and JSON mappers like Jackson. None of them can tell an association edge from a composition edge; they just follow references. Two consequences fall out of that:",
        },
        {
          type: "list",
          items: [
            "Which edges count as \"mine\" has to be written into those methods by hand: include composed parts, refer to associated objects by id, and never follow a back-reference.",
            "A bidirectional association is a **cycle** in the graph. A naive recursive walker goes round it until the stack runs out: `StackOverflowError` from `toString` and `hashCode`, and a nesting-depth failure from Jackson, both shown below. `ObjectOutputStream` is the exception. It remembers every object it has already written and writes a back-reference handle instead, so when I serialized a `Department` and an `Employee` pointing at each other, the stream read back with the cycle intact.",
          ],
        },
      ],
    },
    {
      title: "Dependency: Uses-a",
      blocks: [
        {
          type: "paragraph",
          text: "A dependency is the weakest link: A needs B to do one thing, right now, and keeps nothing afterwards. Everyday versions: me and the ATM I withdraw cash from, or a parcel and the courier who delivers it. Neither remembers the other once the job is done.",
        },
        {
          type: "paragraph",
          text: "Checking out an order needs a `DiscountPolicy` to price it and a `Notifier` to tell the customer. The order itself has no business holding on to either:",
        },
        {
          type: "diagram",
          text: `Order - - - - - «use» - - - - -> DiscountPolicy
Order - - - - - «use» - - - - -> Notifier`,
        },
        {
          type: "code",
          language: "java",
          title: "DependencyDemo.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class DependencyDemo {
    interface DiscountPolicy { int apply(int subtotal); }
    interface Notifier { void send(String to, String text); }

    static class Order {
        private final String customer;
        private final int subtotal;
        private int total;

        Order(String customer, int subtotal) {
            this.customer = customer;
            this.subtotal = subtotal;
        }

        // uses-a: both collaborators arrive as parameters and are forgotten on return
        void checkout(DiscountPolicy policy, Notifier notifier) {
            total = policy.apply(subtotal);
            notifier.send(customer, "Your total is Rs " + total);
        }
    }

    public static void main(String[] args) {
        DiscountPolicy none = subtotal -> subtotal;
        DiscountPolicy festive = subtotal -> subtotal - subtotal / 10;      // 10% off
        Notifier email = (to, text) -> System.out.println("Email to " + to + ": " + text);

        List<String> outbox = new ArrayList<>();
        Notifier fake = (to, text) -> outbox.add(to + " | " + text);       // a test double

        new Order("Asha", 1200).checkout(none, email);
        new Order("Ravi", 1200).checkout(festive, email);
        new Order("Meera", 450).checkout(none, fake);
        System.out.println("captured by the fake: " + outbox);
    }
}`,
        },
        {
          type: "output",
          text: `Email to Asha: Your total is Rs 1200
Email to Ravi: Your total is Rs 1080
captured by the fake: [Meera | Your total is Rs 450]`,
        },
        {
          type: "list",
          items: [
            "`Order` has no field for either collaborator. They arrive in `checkout`'s local slots and are gone when its frame pops, which is what uses-a means at the bytecode level: the type shows up in a method descriptor, never in a field.",
            "Because nothing is stored, each call can bring a different implementation: no discount for Asha (Rs 1200), the festive 10% off for Ravi (Rs 1080). No setter, no reconfiguration, no state left over between calls.",
            "The test double is just another lambda. `fake` captured Meera's message in a list instead of sending an email. Collaborators passed as parameters are the easiest thing in a code base to test.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "Dependency injection mostly creates associations",
          text: "In a Spring service, `private final DiscountPolicy policy;` set through the constructor is a field the service keeps for its whole life. In UML terms that's an association from the service to its collaborator, even though the framework calls it a dependency. UML's dependency is narrower: used, not kept. Both are fine. The practical difference is that a collaborator that can vary per call belongs in the method's parameters, and one that's fixed for the object's life gets injected once.",
        },
      ],
    },
    {
      title: "Association: Knows-a",
      blocks: [
        {
          type: "paragraph",
          text: "An association is a lasting reference to an object with a life of its own. Neither side created the other, neither owns the other, and each can exist without the other. Everyday: a doctor and their patients. A doctor has many patients, a patient may see several doctors, and when a patient switches doctors, nobody stops existing. A teacher and students work the same way.",
        },
        {
          type: "paragraph",
          text: "In code, an `Order` knows its `Customer`. The customer signed up long before this order and will place many more:",
        },
        {
          type: "diagram",
          text: `            1        0..*
Customer ◄─────────────────  Order`,
        },
        {
          type: "code",
          language: "java",
          title: "AssociationDemo.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class AssociationDemo {
    static class Customer {
        private final String name;
        private String tier;

        Customer(String name, String tier) {
            this.name = name;
            this.tier = tier;
        }

        void upgrade(String tier) { this.tier = tier; }

        @Override
        public String toString() { return name + " (" + tier + ")"; }
    }

    record Product(String name) {}

    static class Order {
        private final String id;
        private final Customer customer;   // knows-a: created elsewhere, lives elsewhere
        private final Product product;

        Order(String id, Customer customer, Product product) {
            this.id = id;
            this.customer = customer;
            this.product = product;
        }

        Customer customer() { return customer; }

        @Override
        public String toString() { return id + ": " + product.name() + " for " + customer; }
    }

    public static void main(String[] args) {
        Customer asha = new Customer("Asha", "SILVER");     // signed up long before any order
        Product book = new Product("Clean Code");
        Product lamp = new Product("Desk Lamp");

        List<Order> cart = new ArrayList<>();
        cart.add(new Order("O-101", asha, book));
        cart.add(new Order("O-102", asha, lamp));
        cart.forEach(System.out::println);

        asha.upgrade("GOLD");                               // one Customer object...
        cart.forEach(System.out::println);                  // ...seen through both orders
        System.out.println("same object: " + (cart.get(0).customer() == cart.get(1).customer()));

        cart.clear();                                       // the orders are gone
        System.out.println("after clear: " + asha + ", " + book);
    }
}`,
        },
        {
          type: "output",
          text: `O-101: Clean Code for Asha (SILVER)
O-102: Desk Lamp for Asha (SILVER)
O-101: Clean Code for Asha (GOLD)
O-102: Desk Lamp for Asha (GOLD)
same object: true
after clear: Asha (GOLD), Product[name=Clean Code]`,
        },
        {
          type: "list",
          items: [
            "Both orders hold a reference to the **same** `Customer` object, so `same object: true`. When Asha moved to the GOLD tier, both orders showed it, because there is one Asha on the heap and both orders point at her.",
            "`cart.clear()` removed both orders and left Asha and the book untouched. Deleting an order deletes a reference to the customer, not the customer.",
            "That gives me the practical test for association: the order must never create, copy or delete the customer. Each of those would claim an ownership it doesn't have. The When to Use section runs the bug that copying causes.",
          ],
        },
      ],
    },
    {
      title: "Aggregation: Has-a",
      blocks: [
        {
          type: "paragraph",
          text: "Aggregation is an association with a whole-and-parts shape where the parts are independent. I check three things: the parts can exist before the whole, the parts can be shared by several wholes, and the parts survive when the whole is deleted. Everyday: a team and its players. They were players before the team was formed, can play for a club and a national side at once, and keep playing after the team folds. A playlist and its songs: deleting a playlist removes no song from the library, and one song can sit in many playlists.",
        },
        {
          type: "paragraph",
          text: "In a shop's code, that's a `Category` (Electronics, Sale) and its `Product`s. Products go into the catalog before any category exists, one product can be listed in two categories, and deleting a category must not delete a single product:",
        },
        {
          type: "diagram",
          text: `Category ◇────────────────────── Product
         0..*              0..*`,
        },
        {
          type: "code",
          language: "java",
          title: "AggregationDemo.java",
          code: `import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class AggregationDemo {
    record Product(String sku, String name) {}

    static class Category {
        private final String name;
        private final List<Product> products = new ArrayList<>();

        Category(String name) { this.name = name; }

        void add(Product p)    { products.add(p); }          // the part arrives from outside
        void remove(Product p) { products.remove(p); }       // and leaves without being destroyed

        @Override
        public String toString() {
            return name + " " + products.stream().map(Product::sku).toList();
        }
    }

    public static void main(String[] args) {
        // Products go into the catalog first, before any category exists
        Map<String, Product> catalog = new LinkedHashMap<>();
        catalog.put("P-1", new Product("P-1", "Laptop"));
        catalog.put("P-2", new Product("P-2", "Headphones"));
        catalog.put("P-3", new Product("P-3", "Desk Lamp"));

        Map<String, Category> categories = new LinkedHashMap<>();
        Category electronics = new Category("Electronics");
        Category sale = new Category("Sale");
        categories.put("Electronics", electronics);
        categories.put("Sale", sale);

        electronics.add(catalog.get("P-1"));
        electronics.add(catalog.get("P-2"));
        sale.add(catalog.get("P-2"));                       // shared: one product, two categories
        sale.add(catalog.get("P-3"));
        System.out.println(categories.values());

        sale.remove(catalog.get("P-3"));                    // taken off the sale
        categories.remove("Sale");                          // the whole category is deleted
        System.out.println(categories.values());
        System.out.println("catalog: " + catalog.keySet());
    }
}`,
        },
        {
          type: "output",
          text: `[Electronics [P-1, P-2], Sale [P-2, P-3]]
[Electronics [P-1, P-2]]
catalog: [P-1, P-2, P-3]`,
        },
        {
          type: "list",
          items: [
            "The products came from the `catalog` and were handed to the categories through `add`. No category ever ran `new Product`.",
            "P-2, the headphones, sat in both categories at once. That's legal in aggregation and exactly what composition forbids.",
            "Taking a product off the sale and then deleting the whole Sale category left the catalog with all three products. The only things that changed were the categories' own lists.",
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: "The list is composed even when its elements are aggregated",
          text: "`Category` creates its own `ArrayList` and should never share it. The products are shared; the container isn't. Storing a list the caller passed in instead makes the category change whenever the caller's list changes. That's one of the Common Mistakes below, with output.",
        },
      ],
    },
    {
      title: "Composition: Part-of",
      blocks: [
        {
          type: "paragraph",
          text: "Composition is exclusive ownership with a shared lifecycle. The whole creates its parts, nobody else holds them, every change goes through the whole, and when the whole goes, the parts go. Everyday: a book and its chapters. Chapter 3 means nothing outside its book, and pulping the book takes every chapter with it. A house and its rooms, from the analogy.",
        },
        {
          type: "paragraph",
          text: "In code, an `Order` owns its `OrderItem`s and its `PriceBreakdown`. A line like \"1 x BOOK-42 at Rs 450\" only means something as part of one order, and the price breakdown is computed from that order's items and must always match them. Shipping is Rs 40, free from a subtotal of Rs 500:",
        },
        {
          type: "diagram",
          text: `Order ◆───────────────────────── PriceBreakdown
                              1
Order ◆───────────────────────── OrderItem
                           1..*`,
        },
        {
          type: "paragraph",
          text: "The difference between composition on paper and composition that holds is all in the getters, so I wrote both versions:",
        },
        {
          type: "code",
          language: "java",
          title: "CompositionDemo.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class CompositionDemo {
    record OrderItem(String sku, int qty, int unitPrice) {
        int amount() { return qty * unitPrice; }
    }

    record PriceBreakdown(int subtotal, int shipping) {
        int total() { return subtotal + shipping; }
    }

    // Owns its items on paper, but hands the real list to anyone who asks
    static class LeakyOrder {
        private final List<OrderItem> items = new ArrayList<>();

        LeakyOrder(String sku, int qty, int unitPrice) { items.add(new OrderItem(sku, qty, unitPrice)); }

        List<OrderItem> items() { return items; }

        int total() {
            int subtotal = items.stream().mapToInt(OrderItem::amount).sum();
            return subtotal + (subtotal >= 500 ? 0 : 40);
        }
    }

    // Composed properly: the order creates its parts and is the only way to change them
    static class Order {
        private final List<OrderItem> items = new ArrayList<>();
        private PriceBreakdown price;

        Order(String sku, int qty, int unitPrice) {
            items.add(new OrderItem(sku, qty, unitPrice));
            reprice();
        }

        void addItem(String sku, int qty, int unitPrice) {
            items.add(new OrderItem(sku, qty, unitPrice));
            reprice();
        }

        private void reprice() {
            int subtotal = items.stream().mapToInt(OrderItem::amount).sum();
            price = new PriceBreakdown(subtotal, subtotal >= 500 ? 0 : 40);
        }

        List<OrderItem> items()  { return Collections.unmodifiableList(items); }
        OrderItem lastItem()     { return items.getLast(); }      // Java 21: getLast()
        PriceBreakdown price()   { return price; }   // a record: immutable, safe to hand out
    }

    public static void main(String[] args) {
        LeakyOrder leaky = new LeakyOrder("BOOK-42", 1, 450);
        System.out.println("leaky total before: " + leaky.total());
        leaky.items().clear();                                  // an outsider empties the order
        System.out.println("leaky total after:  " + leaky.total() + ", items " + leaky.items());

        Order order = new Order("BOOK-42", 1, 450);
        order.addItem("PEN-7", 3, 20);
        System.out.println(order.items());
        System.out.println(order.price() + " total " + order.price().total());
        System.out.println("last item: " + order.lastItem().sku());
        try {
            order.items().clear();
        } catch (UnsupportedOperationException e) {
            System.out.println("outsider blocked: " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `leaky total before: 490
leaky total after:  40, items []
[OrderItem[sku=BOOK-42, qty=1, unitPrice=450], OrderItem[sku=PEN-7, qty=3, unitPrice=20]]
PriceBreakdown[subtotal=510, shipping=0] total 510
last item: PEN-7
outsider blocked: java.lang.UnsupportedOperationException`,
        },
        {
          type: "list",
          items: [
            "`LeakyOrder` creates its item like a proper whole, then returns the real `ArrayList` from `items()`. One `clear()` from outside and the order had no items and a total of Rs 40, shipping for nothing, a state the order's own code could never produce. The `1..*` rule from the diagram was broken by code that doesn't belong to the order.",
            "`Order` creates every item itself and reprices in the same method, so the price always matches the items: 450 + 3 × 20 = Rs 510, which crossed the Rs 500 line and made shipping free.",
            "Its getter returns `Collections.unmodifiableList(items)`, so outsiders can read but not change: `clear()` threw `UnsupportedOperationException`. `price()` returns the `PriceBreakdown` itself, which is safe because a record of `int`s can't be modified.",
          ],
        },
        {
          type: "heading",
          text: "The rules I follow for composition in Java",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Create the parts inside the whole, in its constructor or its own methods. If a part has to come in from outside, copy it on the way in.",
            "Never return a mutable part. Return an unmodifiable view, a copy, or make the part immutable. The Encapsulation lesson covers why an unmodifiable view and an immutable list are not the same thing.",
            "Route every change through the whole, so its rules (the price matches the items) can't be bypassed.",
            "If nothing outside needs the part's type, make it private. Try It Yourself builds an order whose `Line` is a `private record` that no other class can even instantiate.",
            "A whole may remove a part before it dies itself, like a cancelled item. UML allows that. What composition doesn't allow is one part belonging to two wholes.",
          ],
        },
      ],
    },
    {
      title: "Multiplicity and Navigability in Code",
      blocks: [
        {
          type: "paragraph",
          text: "Multiplicity is easy to draw and easy to forget in code, so I wrote each kind as a constructor check or a field type, plus a many-to-many link that has data of its own:",
        },
        {
          type: "code",
          language: "java",
          title: "Multiplicity.java",
          code: `import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public class Multiplicity {
    record Customer(String name) {}
    record Coupon(String code) {}
    record OrderItem(String sku, int qty) {}
    record Student(String name) {}
    record Course(String title) {}

    static class Order {
        private final Customer customer;        // 1     exactly one, never null
        private Coupon coupon;                  // 0..1  none until one is applied
        private final List<OrderItem> items;    // 1..*  at least one item

        Order(Customer customer, List<OrderItem> items) {
            this.customer = Objects.requireNonNull(customer, "an order needs a customer");
            if (items.isEmpty()) throw new IllegalArgumentException("an order needs at least one item");
            this.items = List.copyOf(items);
        }

        void apply(Coupon coupon) { this.coupon = Objects.requireNonNull(coupon); }
        Optional<Coupon> coupon() { return Optional.ofNullable(coupon); }
    }

    // *..* with data of its own: an association class, the same shape as a join table
    record Enrollment(Student student, Course course, LocalDate enrolledOn) {}

    public static void main(String[] args) {
        Order order = new Order(new Customer("Asha"), List.of(new OrderItem("BOOK-42", 1)));
        System.out.println("before coupon: " + order.coupon());
        order.apply(new Coupon("WELCOME10"));
        System.out.println("after coupon:  " + order.coupon());

        try {
            new Order(null, List.of(new OrderItem("BOOK-42", 1)));
        } catch (NullPointerException e) {
            System.out.println("1 broken:    " + e.getMessage());
        }
        try {
            new Order(new Customer("Asha"), List.of());
        } catch (IllegalArgumentException e) {
            System.out.println("1..* broken: " + e.getMessage());
        }

        Student asha = new Student("Asha"), ravi = new Student("Ravi");
        Course java = new Course("Java"), sql = new Course("SQL");
        List<Enrollment> enrollments = List.of(
            new Enrollment(asha, java, LocalDate.of(2026, 3, 1)),
            new Enrollment(asha, sql, LocalDate.of(2026, 6, 15)),
            new Enrollment(ravi, sql, LocalDate.of(2026, 7, 2)));

        System.out.println("Asha's courses: " + enrollments.stream()
            .filter(e -> e.student().equals(asha)).map(e -> e.course().title()).toList());
        System.out.println("SQL students:   " + enrollments.stream()
            .filter(e -> e.course().equals(sql)).map(e -> e.student().name()).toList());
    }
}`,
        },
        {
          type: "output",
          text: `before coupon: Optional.empty
after coupon:  Optional[Coupon[code=WELCOME10]]
1 broken:    an order needs a customer
1..* broken: an order needs at least one item
Asha's courses: [Java, SQL]
SQL students:   [Asha, Ravi]`,
        },
        {
          type: "list",
          items: [
            "`1`: `Objects.requireNonNull` in the constructor, so an order without a customer can't exist even for a moment.",
            "`0..1`: the field stays `null` until a coupon is applied, and the getter returns `Optional<Coupon>`, so callers can't forget the empty case.",
            "`1..*`: the constructor rejects an empty list and keeps `List.copyOf(items)`, which is also immutable and rejects `null` elements.",
            "`*` to `*`: `Enrollment` is a join object, what UML calls an association class. The enrolment date belongs to the pair, not to the student or the course. Both directions are queries over one list. A relational schema does the same with a join table, and so does JPA when the link has data of its own.",
          ],
        },
        {
          type: "paragraph",
          text: "Every association in that program is one-way. An `Order` knows its customer, and a `Customer` doesn't know its orders. That's my default: a one-way association has one reference to maintain and no cycle in the graph. When I need the other direction, I query for it (`OrderQueries` in the Examples does exactly that). I make an association two-way only when both directions are needed often, in memory, and then I pay for it with the rules in the bidirectional section below.",
        },
      ],
    },
    {
      title: "Lifecycle, Proven with the Garbage Collector",
      blocks: [
        {
          type: "paragraph",
          text: "\"Composed parts die with the whole, aggregated parts don't\" should be testable, not just a sentence. A `WeakReference` lets me watch an object without keeping it alive: its `get()` returns `null` once the collector has cleared the object. I watched an order, its composed price breakdown, and the catalog product the order referred to, which a category also held:",
        },
        {
          type: "code",
          language: "java",
          title: "LifecycleGc.java",
          code: `import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

public class LifecycleGc {
    record Product(String sku) {}
    record PriceBreakdown(int subtotal, int shipping) {}

    static class Category {                               // aggregation
        private final List<Product> products = new ArrayList<>();
        void add(Product p) { products.add(p); }
        int size() { return products.size(); }
    }

    static class Order {
        private final Product product;                    // association, to a catalog product
        private final PriceBreakdown price;               // composition: made here, held only here

        Order(Product product, int qty, int unitPrice) {
            this.product = product;
            int subtotal = qty * unitPrice;
            this.price = new PriceBreakdown(subtotal, subtotal >= 500 ? 0 : 40);
        }

        PriceBreakdown price() { return price; }
    }

    static void collect() throws InterruptedException {
        System.gc();                                      // a request, not a command
        Thread.sleep(100);
    }

    public static void main(String[] args) throws InterruptedException {
        Category books = new Category();
        Product book = new Product("BOOK-42");
        books.add(book);
        Order order = new Order(book, 1, 450);

        WeakReference<Order> orderRef = new WeakReference<>(order);
        WeakReference<PriceBreakdown> priceRef = new WeakReference<>(order.price());
        WeakReference<Product> bookRef = new WeakReference<>(book);

        order = null;                                     // drop the only reference to the order
        book = null;                                      // and main's own handle on the product
        collect();
        System.out.println("order collected:   " + (orderRef.get() == null));
        System.out.println("price collected:   " + (priceRef.get() == null));
        System.out.println("product collected: " + (bookRef.get() == null)
            + " (category size " + books.size() + ")");

        books = null;                                     // now the last whole that held it goes
        collect();
        System.out.println("after the category: product collected: " + (bookRef.get() == null));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx64m LifecycleGc
java -Xmx64m -XX:+UseSerialGC LifecycleGc     # also tried Parallel and ZGC`,
        },
        {
          type: "output",
          text: `order collected:   true
price collected:   true
product collected: false (category size 1)
after the category: product collected: true`,
        },
        {
          type: "list",
          items: [
            "After `order = null`, the `Order` was collected, and so was its `PriceBreakdown`. Nothing else had ever referenced the breakdown, so it became unreachable at the same moment as its whole. That's composition's shared lifecycle, produced by reachability, not by any rule the JVM knows about.",
            "The `Product` survived even though `main` had dropped its own reference and the order that used it was gone. `books -> ArrayList -> Object[] -> Product` was still a path from a root.",
            "Only after the category went too did the product become collectable. In a real service a product repository would still hold it, so it would outlive the category as well. That's what aggregation means on the heap.",
            "`System.gc()` is a request, not a command. It worked on every run here, with the default G1 and also with Serial, Parallel and ZGC, but I'd never build behaviour on it. And `price()` returning the part is only safe because the part is immutable: a caller that keeps that reference makes the part outlive its order, which Try It Yourself shows.",
          ],
        },
        {
          type: "heading",
          text: "Does a cycle keep itself alive?",
        },
        {
          type: "paragraph",
          text: "A bidirectional association means two objects referencing each other. I wanted to know whether that pair keeps itself alive once nothing else points at it:",
        },
        {
          type: "code",
          language: "java",
          title: "CycleGc.java",
          code: `import java.lang.ref.WeakReference;

public class CycleGc {
    static class Department { Employee manager; }
    static class Employee   { Department department; }

    public static void main(String[] args) throws InterruptedException {
        Department sales = new Department();
        Employee asha = new Employee();
        sales.manager = asha;
        asha.department = sales;               // a cycle: each keeps a reference to the other

        WeakReference<Department> deptRef = new WeakReference<>(sales);
        WeakReference<Employee> empRef = new WeakReference<>(asha);
        sales = null;
        asha = null;                           // nothing outside the cycle points in anymore

        System.gc();                           // a request
        Thread.sleep(100);
        System.out.println("department collected: " + (deptRef.get() == null));
        System.out.println("employee collected:   " + (empRef.get() == null));
    }
}`,
        },
        {
          type: "output",
          text: `department collected: true
employee collected:   true`,
        },
        {
          type: "paragraph",
          text: "Both went. HotSpot's collectors trace from the roots instead of counting references, so a cycle that no root reaches is garbage like anything else. Bidirectional associations don't leak memory by themselves. Leaks come from a long-lived root that still reaches a big graph, which the Performance section measures.",
        },
      ],
    },
    {
      title: "Bidirectional Associations and Their Traps",
      blocks: [
        {
          type: "paragraph",
          text: "A two-way association is two references describing one fact. \"O-2 belongs to Asha\" is written once in `order.customer` and once in `asha.orders`, and nothing in Java ties the two together. When code updates one and forgets the other, the object graph contradicts itself. I wrote the setter style that causes it next to the helper style that prevents it:",
        },
        {
          type: "code",
          language: "java",
          title: "CustomerOrders.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class CustomerOrders {
    static class Customer {
        final String name;
        final List<Order> orders = new ArrayList<>();     // package-private, like an entity field
        Customer(String name) { this.name = name; }

        // The safe way to link: one method updates both sides together
        void addOrder(Order order) {
            if (order.customer != null) order.customer.orders.remove(order);   // leave the old customer first
            orders.add(order);
            order.customer = this;
        }

        void removeOrder(Order order) {
            if (orders.remove(order)) order.customer = null;
        }
    }

    static class Order {
        final String id;
        Customer customer;                                // the other side of the same link
        Order(String id) { this.id = id; }
        @Override public String toString() { return id; }
    }

    public static void main(String[] args) {
        Customer asha = new Customer("Asha"), ravi = new Customer("Ravi");
        Order o1 = new Order("O-1");
        o1.customer = asha;                               // one side set, the other forgotten
        System.out.println("by hand: O-1 customer=" + o1.customer.name + ", Asha's orders=" + asha.orders);

        Order o2 = new Order("O-2");
        asha.orders.add(o2);
        o2.customer = asha;                               // both sides, by hand...
        o2.customer = ravi;
        ravi.orders.add(o2);                              // ...then moved, but Asha's list kept it
        System.out.println("by hand: Asha's orders=" + asha.orders + ", Ravi's orders=" + ravi.orders);

        Customer meera = new Customer("Meera"), kabir = new Customer("Kabir");
        Order o3 = new Order("O-3"), o4 = new Order("O-4");
        meera.addOrder(o3);
        meera.addOrder(o4);
        kabir.addOrder(o4);                               // the move updates both customers
        System.out.println("helpers: Meera's orders=" + meera.orders + ", Kabir's orders=" + kabir.orders);
        meera.removeOrder(o3);
        System.out.println("helpers: Meera's orders=" + meera.orders + ", O-3 customer=" + o3.customer);
    }
}`,
        },
        {
          type: "output",
          text: `by hand: O-1 customer=Asha, Asha's orders=[]
by hand: Asha's orders=[O-2], Ravi's orders=[O-2]
helpers: Meera's orders=[O-3], Kabir's orders=[O-4]
helpers: Meera's orders=[], O-3 customer=null`,
        },
        {
          type: "list",
          items: [
            "Set by hand, O-1 says its customer is Asha while Asha's list is empty, so any code that asks Asha for her orders misses one. Moving O-2 to Ravi left it in **both** customers' lists, so the same purchase would show up in two people's order history.",
            "With the helpers, `addOrder` is the one place that links the two sides. It removes the order from its old customer, adds it to the new one and sets the back reference. `removeOrder` clears both sides. Every line of the helper output agrees with every other line.",
            "Both fields are package-private here so `main` can reproduce the bug. In a real code base, the list would be private behind an unmodifiable getter, and only `Customer`'s helpers, in the same package, would touch `Order.customer`. Packages and Access Modifiers, later in this track, covers that.",
          ],
        },
        {
          type: "heading",
          text: "The recursion trap",
        },
        {
          type: "paragraph",
          text: "The cycle also breaks every method that walks the graph. I gave a `Department` and its manager, an `Employee` who points back at the department, the `toString`, `equals` and `hashCode` an IDE generates when every field is ticked:",
        },
        {
          type: "code",
          language: "java",
          title: "CycleTraps.java",
          code: `import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public class CycleTraps {
    static class Department {
        final String name;
        Employee manager;
        Department(String name) { this.name = name; }

        @Override public String toString() {
            return "Department{name=" + name + ", manager=" + manager + "}";
        }
        @Override public int hashCode() { return Objects.hash(name, manager); }
        @Override public boolean equals(Object o) {
            return o instanceof Department d && name.equals(d.name) && Objects.equals(manager, d.manager);
        }
    }

    static class Employee {
        final String name;
        Department department;
        Employee(String name) { this.name = name; }

        @Override public String toString() {
            return "Employee{name=" + name + ", department=" + department + "}";
        }
        @Override public int hashCode() { return Objects.hash(name, department); }
        @Override public boolean equals(Object o) {
            return o instanceof Employee e && name.equals(e.name) && Objects.equals(department, e.department);
        }
    }

    public static void main(String[] args) {
        Department sales = new Department("Sales");
        Employee asha = new Employee("Asha");
        sales.manager = asha;
        asha.department = sales;                    // bidirectional: a cycle in the graph

        try {
            System.out.println(sales);
        } catch (StackOverflowError e) {
            System.out.println("toString: " + e);
        }

        Set<Department> departments = new HashSet<>();
        departments.add(sales);                     // hashCode -> hashCode -> ...
    }
}`,
        },
        {
          type: "output",
          text: `toString: java.lang.StackOverflowError
Exception in thread "main" java.lang.StackOverflowError
\tat java.base/java.util.Objects.hash(Objects.java:133)
\tat CycleTraps$Department.hashCode(CycleTraps.java:14)
\tat java.base/java.util.Arrays.hashCode(Arrays.java:4599)
\tat java.base/java.util.Objects.hash(Objects.java:133)
\tat CycleTraps$Employee.hashCode(CycleTraps.java:28)
\tat java.base/java.util.Arrays.hashCode(Arrays.java:4599)
\tat java.base/java.util.Objects.hash(Objects.java:133)
\tat CycleTraps$Department.hashCode(CycleTraps.java:14)
\t...`,
        },
        {
          type: "list",
          items: [
            "`Department.toString` calls `Employee.toString` through the string concatenation, which calls `Department.toString` again, until the thread's stack is full. I caught that one so the program could go on.",
            "`HashSet.add` calls `hashCode`, which hashes the manager, which hashes the department. The uncaught trace was exactly 1,024 frames long, the JVM's default cap (`MaxJavaStackTraceDepth`), so the frames that started it, `HashSet.add` and `main`, weren't in it at all. Just the same three frames repeating. The very top frame changes between runs (sometimes `Objects.hash`, sometimes `Arrays.hashCode`), because it's simply wherever the stack happened to run out.",
            "`equals` recurses the same way when it compares two distinct but equal graphs. `sales.equals(sales)` returned `true` immediately, because `Objects.equals` checks `==` first. Comparing two separately built Sales-and-Asha pairs overflowed.",
            "The fix is one rule: methods that walk the graph follow composition edges and stop at association edges. `Employee.toString` prints the department's name or id, never the department. `equals` and `hashCode` use identifying fields (an employee id, a department code), never the other side of an association.",
          ],
        },
      ],
    },
    {
      title: "Composition as a Design Tool",
      blocks: [
        {
          type: "heading",
          text: "Delegation instead of inheritance",
        },
        {
          type: "paragraph",
          text: "The Inheritance lesson's `InstrumentedHashSet` extended `HashSet` to count additions and counted 6 for 3 elements, because `HashSet` inherits an `addAll` that calls the overridden `add` for each element. The composition version holds any `Set` in a field and forwards to it, which is called delegation:",
        },
        {
          type: "code",
          language: "java",
          title: "DelegationDemo.java",
          code: `import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class DelegationDemo {
    // has-a Set: every call is forwarded, and additions are counted on the way through
    public static class CountingSet<E> {
        private final Set<E> inner;
        private int added;

        public CountingSet(Set<E> inner) { this.inner = inner; }   // any Set, chosen at runtime

        public boolean add(E e) {
            added++;
            return inner.add(e);
        }

        public boolean addAll(Collection<? extends E> c) {
            added += c.size();
            return inner.addAll(c);          // HashSet's own add() calls stay inside HashSet
        }

        public boolean contains(Object o)  { return inner.contains(o); }
        public int added()                 { return added; }
        @Override public String toString() { return inner.toString(); }
    }

    public static class InheritedSet<E> extends HashSet<E> {}   // only to compare the API

    public static void main(String[] args) {
        CountingSet<String> tags = new CountingSet<>(new HashSet<>());
        tags.addAll(List.of("java", "oop", "uml"));
        System.out.println("added " + tags.added());

        System.out.println("public API via extends HashSet: " + publicNames(InheritedSet.class));
        System.out.println("public API via a Set field:     " + publicNames(CountingSet.class));
    }

    static long publicNames(Class<?> type) {
        return Arrays.stream(type.getMethods())
            .filter(m -> m.getDeclaringClass() != Object.class)
            .map(Method::getName)
            .distinct()
            .count();
    }
}`,
        },
        {
          type: "output",
          text: `added 3
public API via extends HashSet: 22
public API via a Set field:     5`,
        },
        {
          type: "list",
          items: [
            "`added 3`: the wrapper's `addAll` forwards to `inner.addAll`, and `HashSet`'s internal calls to `add` land on the `HashSet`, not on the wrapper. The inner set doesn't know the wrapper exists, so its self-use can't double-count anything.",
            "The wrapper takes any `Set` in its constructor, so a `TreeSet` or `LinkedHashSet` works the same way, chosen at runtime. With inheritance, the parent class is fixed when the code is compiled.",
            "The wrapper's public API is 5 method names. Extending `HashSet` publishes 22 besides `Object`'s, including `clear`, `removeIf` and `retainAll`, all usable to change the set without going through the counting. Composition lets me choose what to expose.",
            "The cost is writing a forwarding method for everything I want to expose. Bloch's version wraps the whole `Set` interface in a reusable forwarding class for exactly that reason.",
          ],
        },
        {
          type: "heading",
          text: "The Law of Demeter",
        },
        {
          type: "paragraph",
          text: "Associations make it tempting to walk them from the outside: `order.getCustomer().getAddress().city()`. The Law of Demeter, from a 1987 project at Northeastern University, says a method should only talk to its immediate friends: its own fields, its parameters and the objects it creates. Every extra dot ties the caller to one more link in the chain, including whether that link can be empty.",
        },
        {
          type: "code",
          language: "java",
          title: "DemeterDemo.java",
          code: `public class DemeterDemo {
    record Address(String city) {}

    static class Customer {
        private Address address;                  // 0..1: sign-up may not ask for it

        Address getAddress() { return address; }

        String cityForLabel() {
            return address == null ? "address pending" : address.city();
        }
    }

    record Order(Customer customer) {
        String shippingLabel() { return "Ship to: " + customer.cityForLabel(); }   // ask a friend
    }

    public static void main(String[] args) {
        Order order = new Order(new Customer());
        System.out.println(order.shippingLabel());
        System.out.println("Ship to: " + order.customer().getAddress().city());   // two hops out
    }
}`,
        },
        {
          type: "output",
          text: `Ship to: address pending
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "DemeterDemo$Address.city()" because the return value of "DemeterDemo$Customer.getAddress()" is null
\tat DemeterDemo.main(DemeterDemo.java:21)`,
        },
        {
          type: "list",
          items: [
            "The customer had signed up but hadn't given an address yet, a legal `0..1` state. `shippingLabel` asked the order, the order asked its customer, and the customer, who knows her own address can be missing, answered sensibly.",
            "The chained call walked two associations from outside and hit the `null`. The helpful NPE message names the exact link that broke: the return value of `Customer.getAddress()`.",
            "Not every chain breaks the law. `orders.stream().filter(...).map(...)` and builders return objects designed for chaining. The law is about reaching through other objects' associations.",
          ],
        },
      ],
    },
    {
      title: "How JPA Maps Them (a Preview)",
      blocks: [
        {
          type: "paragraph",
          text: "The Spring Data JPA and Hibernate track owns this, so there's no Hibernate run here. This is only the shape each relationship takes in a Spring Boot 3 entity, with `jakarta.persistence` annotations:",
        },
        {
          type: "code",
          language: "java",
          code: `@Entity
class Order {
    @ManyToOne(fetch = FetchType.LAZY) Customer customer;     // association: no cascade
    @Embedded Address shippingAddress;                         // composition of a value
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    List<OrderItem> items = new ArrayList<>();                 // composition of entities

    void addItem(OrderItem item) { items.add(item); item.setOrder(this); }   // both sides
}

@Entity
class Category {
    @ManyToMany @JoinTable(name = "category_product")          // aggregation: links only,
    Set<Product> products = new HashSet<>();                   // never REMOVE
}`,
        },
        {
          type: "table",
          headers: ["Relationship", "JPA mapping", "Deleting the whole"],
          rows: [
            ["Association", "`@ManyToOne` or `@OneToOne`, no cascade", "Leaves the other row alone"],
            ["Aggregation", "`@ManyToMany` with a join table, or `@OneToMany` without `REMOVE`", "Deletes the link rows only"],
            ["Composition of values", "`@Embedded`, `@ElementCollection`", "The columns or collection-table rows go with the owner"],
            ["Composition of entities", "`@OneToMany(cascade = ALL, orphanRemoval = true)`", "Deletes the child rows; removing a child from the list deletes it too"],
          ],
        },
        {
          type: "list",
          items: [
            "The **owning side** of a bidirectional association is the one with the foreign key: the `@ManyToOne` side, or the side that declares the `@JoinTable`. The other side says `mappedBy` and is ignored when JPA writes the link. Adding an item only to `order.items`, without `item.setOrder(order)`, stores nothing for that link: the database version of the out-of-sync bug, and the reason `addItem` sets both sides.",
            "`orphanRemoval = true` is the closest JPA gets to saying composition: an item removed from its order's list is deleted, because an order item can't exist without an order.",
            "`CascadeType.REMOVE` (or `ALL`) on a `@ManyToMany` is the aggregation bug from the production section, done by the ORM: deleting a category would also try to delete every product in it, including the ones other categories still list.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `new Order(new Customer(\"Asha\"), \"BOOK-42\", 1, 450)` and `order.confirm(...)` from `OrderModel`, through compilation, the run and the collection afterwards:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "`javac` writes `Order`'s three fields into the class file with descriptors `LCustomer;`, `LPriceBreakdown;` and `Ljava/util/List;`, plus a `Signature` attribute for `List<OrderItem>`. Nothing in the format records ownership.",
            "It compiles the constructor with the field initializer first (`new ArrayList`, `putfield items`), then `aload_1; putfield customer`, then `new OrderItem` with `List.add`, the shipping arithmetic, and `new PriceBreakdown` with `putfield price`.",
            "At run time, `main` evaluates the arguments first. `new Customer(\"Asha\")` is allocated on the heap, and its reference goes onto `main`'s operand stack with the SKU string and the two `int`s.",
            "`new Order` allocates the order with every reference field `null`. `invokespecial Order.<init>` runs with the customer in slot 1, the SKU in slot 2, the quantity in slot 3 and the unit price in slot 4.",
            "The constructor stores the reference it was handed (association) and creates the `ArrayList`, the `OrderItem` and the `PriceBreakdown` itself (composition). At that moment, the order holds the only references to its parts.",
            "`order.confirm(lambda)` receives the `Notifier` in its slot 1, calls it once, and the reference disappears when the frame pops (dependency).",
            "Once `main` no longer uses `order`, nothing reachable points at the `Order`, so its `ArrayList`, the backing `Object[]`, the `OrderItem` and the `PriceBreakdown` become unreachable at the same moment.",
            "The next collection reclaims the whole composed cluster together. The `Customer` goes too in this tiny program, but only because nothing else referenced it. In a service, a repository or cache would keep it alive: it was never the order's to take with it.",
          ],
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "paragraph",
          text: "All six relationships in one compilable program, each marked where it appears:",
        },
        {
          type: "code",
          language: "java",
          title: "HasASyntax.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class HasASyntax {
    interface PaymentProcessor { String pay(int amount); }

    record CardPayment(String last4) implements PaymentProcessor {      // realization
        public String pay(int amount) { return "Rs " + amount + " by card ending " + last4; }
    }

    static class Product { final String sku; Product(String sku) { this.sku = sku; } }
    static class Laptop extends Product { Laptop(String sku) { super(sku); } }   // inheritance

    record Customer(String name) {}
    record OrderItem(String sku, int qty) {}

    static class Category {
        private final List<Product> products = new ArrayList<>();    // aggregation
        void add(Product p) { products.add(p); }
        int size() { return products.size(); }
    }

    static class Order {
        private final Customer customer;                              // association
        private final List<OrderItem> items = new ArrayList<>();     // composition

        Order(Customer customer, String sku, int qty) {
            this.customer = customer;
            items.add(new OrderItem(sku, qty));
        }

        List<OrderItem> items() { return Collections.unmodifiableList(items); }

        String settle(PaymentProcessor processor, int amount) {      // dependency
            return customer.name() + " paid " + processor.pay(amount);
        }
    }

    public static void main(String[] args) {
        Laptop laptop = new Laptop("LAP-15");
        Category electronics = new Category();
        electronics.add(laptop);
        Order order = new Order(new Customer("Asha"), "LAP-15", 1);
        System.out.println(order.items());
        System.out.println(order.settle(new CardPayment("4242"), 55000));
        System.out.println((laptop instanceof Product) + " " + electronics.size());
    }
}`,
        },
        {
          type: "output",
          text: `[OrderItem[sku=LAP-15, qty=1]]
Asha paid Rs 55000 by card ending 4242
true 1`,
        },
        {
          type: "paragraph",
          text: "Only two of the six have syntax of their own, `extends` and `implements`. The other four are a parameter (`settle`'s `processor`), a field set from outside (`customer`, and the products that `add` receives), and a field the class fills itself (`items`). The comments are the only thing that tells them apart, which is why I write them.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "The textbook examples, and why the domain decides",
        },
        {
          type: "paragraph",
          text: "Three examples appear in nearly every OOP book: a university and its departments (composition), a department and its professors (aggregation), and a car and its engine. I ran the first two together:",
        },
        {
          type: "code",
          language: "java",
          title: "UniversityModel.java",
          code: `import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class UniversityModel {
    record Professor(String name) {}               // exists on its own: hired, moves, retires

    static class Department {
        private final String name;
        private final List<Professor> faculty = new ArrayList<>();   // aggregation

        private Department(String name) { this.name = name; }        // only University creates one

        @Override
        public String toString() { return name + faculty.stream().map(Professor::name).toList(); }
    }

    static class University {
        private final Map<String, Department> departments = new LinkedHashMap<>();   // composition

        void openDepartment(String name) { departments.put(name, new Department(name)); }

        void appoint(String department, Professor p) { departments.get(department).faculty.add(p); }

        void close() { departments.clear(); }     // the departments go with it

        @Override
        public String toString() { return departments.values().toString(); }
    }

    public static void main(String[] args) {
        List<Professor> people = List.of(new Professor("Dr. Sen"), new Professor("Dr. Rao"));

        University uni = new University();
        uni.openDepartment("Computer Science");
        uni.openDepartment("Mathematics");
        uni.appoint("Computer Science", people.get(0));
        uni.appoint("Computer Science", people.get(1));
        uni.appoint("Mathematics", people.get(1));    // joint appointment: a shared part
        System.out.println(uni);

        uni.close();
        System.out.println("after close: " + uni + ", professors: " + people);
    }
}`,
        },
        {
          type: "output",
          text: `[Computer Science[Dr. Sen, Dr. Rao], Mathematics[Dr. Rao]]
after close: [], professors: [Professor[name=Dr. Sen], Professor[name=Dr. Rao]]`,
        },
        {
          type: "list",
          items: [
            "`Department`'s constructor is private and only `University.openDepartment` calls it, so no department exists outside a university and none ever leaves one. `close()` cleared the map, and with nothing else referencing them, the departments became garbage: composition.",
            "The professors were created first, on their own, and Dr. Rao holds a joint appointment in two departments, a shared part. After `close()`, both professors are still in `people`: aggregation.",
          ],
        },
        {
          type: "paragraph",
          text: "The car and its engine is where the textbook answer runs out, because it depends on who's asking:",
        },
        {
          type: "code",
          language: "java",
          title: "EngineTwoWays.java",
          code: `public class EngineTwoWays {
    record Engine(String serial) {}

    // Car maker's view: the engine is built for this car, fixed for its life (composition)
    static class ManufacturedCar {
        private final String vin;
        private final Engine engine;

        ManufacturedCar(String vin) {
            this.vin = vin;
            this.engine = new Engine("EN-" + vin);           // created inside, never replaced
        }

        @Override public String toString() { return vin + " built with " + engine.serial(); }
    }

    // Workshop's view: engines come in, go out and outlive any one car (aggregation)
    static class ServicedCar {
        private final String plate;
        private Engine engine;

        ServicedCar(String plate, Engine engine) {           // handed in from outside
            this.plate = plate;
            this.engine = engine;
        }

        Engine swapEngine(Engine replacement) {
            Engine old = engine;
            engine = replacement;
            return old;                                      // the old part lives on
        }

        @Override public String toString() { return plate + " running " + engine.serial(); }
    }

    public static void main(String[] args) {
        System.out.println(new ManufacturedCar("VIN-2026-0042"));

        ServicedCar car = new ServicedCar("KA-01-AB-1234", new Engine("EN-ORIGINAL"));
        System.out.println(car);
        Engine removed = car.swapEngine(new Engine("RECON-77"));
        System.out.println(car + ", back on the shelf: " + removed);
    }
}`,
        },
        {
          type: "output",
          text: `VIN-2026-0042 built with EN-VIN-2026-0042
KA-01-AB-1234 running EN-ORIGINAL
KA-01-AB-1234 running RECON-77, back on the shelf: Engine[serial=EN-ORIGINAL]`,
        },
        {
          type: "list",
          items: [
            "To a car maker, the engine is built for one VIN, fitted on the line and scrapped with the car. `ManufacturedCar` creates it in its constructor and never replaces it: composition.",
            "To a repair workshop, engines arrive, get swapped, sit on a shelf and go into another car. `ServicedCar` receives its engine from outside, and `swapEngine` hands the old one back alive: aggregation.",
            "Same two nouns, opposite classification. The question is never \"is an engine part of a car?\" It's \"in this system, who creates it, who else may hold it, and what happens to it when the car's record is deleted?\"",
          ],
        },
        {
          type: "paragraph",
          text: "The same point in a shop: to the catalog, a product is an aggregated part of its categories, but on an invoice, \"the product as sold\" is a composed snapshot, a name and a price copied at the moment of sale, so a later price change can't rewrite an old invoice. A customer's order history looks like composition until a rule says orders must be kept for tax purposes after the account is closed, and then it can't die with the customer anymore. The lifecycle rules decide, not the nouns.",
        },
        {
          type: "heading",
          text: "Copying follows the relationship",
        },
        {
          type: "paragraph",
          text: "\"Order again\" means copying a past order. What to copy depends on the edge: composed parts get copied, associated objects get shared.",
        },
        {
          type: "code",
          language: "java",
          title: "ReorderCopy.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class ReorderCopy {
    record Customer(String name) {}

    static class OrderItem {                        // a mutable part, so copying really matters
        String sku;
        int qty;
        OrderItem(String sku, int qty) { this.sku = sku; this.qty = qty; }
        OrderItem copy() { return new OrderItem(sku, qty); }
        @Override public String toString() { return qty + " x " + sku; }
    }

    static class Order {
        final String id;
        final Customer customer;                    // association: share it
        final List<OrderItem> items;                // composition: copy it

        Order(String id, Customer customer, List<OrderItem> items) {
            this.id = id;
            this.customer = customer;
            this.items = items;
        }

        Order shallowCopy(String newId) {           // what a careless copy gives
            return new Order(newId, customer, items);
        }

        Order reorder(String newId) {               // copies the parts, shares the association
            List<OrderItem> copied = new ArrayList<>();
            for (OrderItem item : items) copied.add(item.copy());
            return new Order(newId, customer, copied);
        }
    }

    public static void main(String[] args) {
        Order original = new Order("O-1", new Customer("Asha"),
            new ArrayList<>(List.of(new OrderItem("COFFEE-1KG", 1))));

        Order again = original.reorder("O-2");
        again.items.get(0).qty = 2;
        System.out.println("O-1 after editing O-2: " + original.items + ", O-2: " + again.items);
        System.out.println("same customer: " + (again.customer == original.customer)
            + ", same item: " + (again.items.get(0) == original.items.get(0)));

        Order shallow = original.shallowCopy("O-3");
        shallow.items.get(0).qty = 5;               // edit the copy...
        System.out.println("O-1 after editing O-3: " + original.items);   // ...and O-1 changed
    }
}`,
        },
        {
          type: "output",
          text: `O-1 after editing O-2: [1 x COFFEE-1KG], O-2: [2 x COFFEE-1KG]
same customer: true, same item: false
O-1 after editing O-3: [5 x COFFEE-1KG]`,
        },
        {
          type: "diagram",
          text: `              customer           items list         item object
O-1           Customer "Asha"    list #1            item #1
O-2 reorder   same Customer      list #2 (new)      item #2 (copied)
O-3 shallow   same Customer      list #1 (shared!)  item #1 (shared!)

editing O-2's item touches item #2 only;
editing O-3's item edits item #1, which is O-1's item`,
          caption: "A correct copy is deep along composition edges and shallow along association edges.",
        },
        {
          type: "paragraph",
          text: "Sharing the customer is right: copying Asha would create a second Asha. Sharing the items is the bug, and it's what `clone()` or a field-by-field copy constructor gives by default. If `OrderItem` were an immutable record, sharing the item objects would be harmless, and only the list would need copying. That's one more reason I make composed parts immutable when I can.",
        },
        {
          type: "heading",
          text: "A one-way association and a query",
        },
        {
          type: "paragraph",
          text: "Most \"I need a bidirectional association\" moments are really \"I need to find these once in a while\". This keeps `Order -> Customer` one-way and answers the other direction with a query:",
        },
        {
          type: "code",
          language: "java",
          title: "OrderQueries.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class OrderQueries {
    record Customer(String id, String name) {}
    record Order(String id, Customer customer, int total) {}   // Order -> Customer, one direction only

    static class OrderRepository {
        private final List<Order> orders = new ArrayList<>();

        void save(Order order) { orders.add(order); }

        // The other direction is a query, not a second reference to keep in sync
        List<String> orderIdsOf(Customer customer) {
            return orders.stream().filter(o -> o.customer().equals(customer)).map(Order::id).toList();
        }

        int spentBy(Customer customer) {
            return orders.stream().filter(o -> o.customer().equals(customer)).mapToInt(Order::total).sum();
        }
    }

    public static void main(String[] args) {
        Customer asha = new Customer("C-7", "Asha");
        Customer kabir = new Customer("C-9", "Kabir");

        OrderRepository repo = new OrderRepository();
        repo.save(new Order("O-1", asha, 490));
        repo.save(new Order("O-2", kabir, 1200));
        repo.save(new Order("O-3", asha, 1080));

        System.out.println("Asha:  " + repo.orderIdsOf(asha) + ", spent Rs " + repo.spentBy(asha));
        System.out.println("Kabir: " + repo.orderIdsOf(kabir) + ", spent Rs " + repo.spentBy(kabir));
    }
}`,
        },
        {
          type: "output",
          text: `Asha:  [O-1, O-3], spent Rs 1570
Kabir: [O-2], spent Rs 1200`,
        },
        {
          type: "paragraph",
          text: "No `orders` list on `Customer`, so nothing to keep in sync and no cycle for `toString` or Jackson to fall into. In a real service the repository is a database query (`WHERE customer_id = ?`), which is also where the answer belongs once a customer has thousands of orders.",
        },
      ],
    },
    {
      title: "When to Use Which Relationship",
      blocks: [
        {
          type: "paragraph",
          text: "This is the decision I actually walk through when I add a reference from one class to another. The capstone lesson, When to Use What in Java OOP, puts it next to the other OOP choices; this is the has-a part of it.",
        },
        {
          type: "diagram",
          text: `Does A need B only while one method runs?
├─ yes ─► DEPENDENCY: take B as a parameter, keep nothing
└─ no ──► A keeps a reference. Is A a true, substitutable kind of B?
          ├─ yes ─► INHERITANCE (extends) or REALIZATION (implements)
          └─ no ──► Does B have a life of its own? (made elsewhere,
                    outlives A, or shared with other objects)
                    ├─ no ──► COMPOSITION: A creates B, hides it,
                    │         and B goes when A goes
                    └─ yes ─► Is A a whole that groups Bs?
                              ├─ yes ─► AGGREGATION
                              └─ no ──► ASSOCIATION`,
        },
        {
          type: "table",
          headers: ["Question", "If yes", "Example"],
          rows: [
            ["Is B needed only during one call?", "Dependency: a parameter", "`checkout(DiscountPolicy, Notifier)`"],
            ["Must A remember B, which has its own life?", "Association: a field set from outside", "`Order.customer`"],
            ["Is A a whole whose parts exist before it, outlive it or are shared?", "Aggregation: parts added from outside; delete only unlinks", "`Category` and its `Product`s, `Team` and its players"],
            ["Does B mean nothing without A, and must A control every change?", "Composition: created inside, hidden, gone with A", "`Order` and its `OrderItem`s and `PriceBreakdown`"],
            ["Does A need B's value at one moment, not B itself?", "Composition of a snapshot value", "The billing address printed on an invoice"],
            ["Is A truly a kind of B, usable anywhere a B is?", "Inheritance, or `implements` for a contract", "`CardPayment implements PaymentProcessor`"],
          ],
        },
        {
          type: "list",
          items: [
            "Start from the lifecycle, not the nouns: who creates B, who else holds it, and what happens to B when A is deleted. Writing down the delete rule settles most cases, and later decides the cascade settings.",
            "Use the weakest relationship that works: a parameter over a field, a one-way association over a two-way one, an id over an object reference for long-lived links.",
            "Reuse behaviour through composition and delegation. Inherit only for a real is-a; the Inheritance lesson has the substitution rules.",
            "If two objects must change together and one can't exist alone, compose them and give the whole the only way in.",
            "Whenever history matters (receipts, invoices, audit logs), compose a snapshot value instead of following a live association.",
          ],
        },
        {
          type: "paragraph",
          text: "Two wrong choices I can easily imagine in an order model, and the right model next to them:",
        },
        {
          type: "code",
          language: "java",
          title: "RelationshipChoice.java",
          code: `public class RelationshipChoice {
    static class Price {                             // mutable on purpose
        final int subtotal;
        double discount = 0.0;
        Price(int subtotal) { this.subtotal = subtotal; }
        int total() { return (int) Math.round(subtotal * (1 - discount)); }
    }

    static class Customer {
        final String name;
        String address;
        String tier;
        Customer(String name, String address, String tier) {
            this.name = name; this.address = address; this.tier = tier;
        }
    }

    // Wrong 1: a "part" passed in from outside, so two orders end up sharing it
    record SharedPriceOrder(Price price) {}

    // Wrong 2: an independent customer rebuilt inside the order, as if the order owned them
    record CopiedCustomerOrder(Customer customer) {
        CopiedCustomerOrder(String name, String address, String tier) {
            this(new Customer(name, address, tier));
        }
    }

    // Right: own the price, reference the customer, snapshot what the invoice must keep
    record Invoice(String customerName, String address) {}

    static class Order {
        final Price price;                           // composition
        final Customer customer;                     // association
        final Invoice invoice;                       // composition of a value snapshot

        Order(Customer customer, int subtotal) {
            this.price = new Price(subtotal);
            this.customer = customer;
            this.invoice = new Invoice(customer.name, customer.address);
        }
    }

    public static void main(String[] args) {
        Price template = new Price(1000);
        SharedPriceOrder o1 = new SharedPriceOrder(template), o2 = new SharedPriceOrder(template);
        o1.price().discount = 0.2;
        System.out.println("wrong 1: o1 Rs " + o1.price().total() + ", o2 Rs " + o2.price().total());

        Customer asha = new Customer("Asha", "Kolkata", "SILVER");
        CopiedCustomerOrder copied = new CopiedCustomerOrder("Asha", "Kolkata", "SILVER");
        asha.tier = "GOLD";
        System.out.println("wrong 2: Asha is " + asha.tier + ", the order's copy says "
            + copied.customer().tier);

        Order a = new Order(asha, 1000), b = new Order(asha, 1000);
        a.price.discount = 0.2;
        asha.address = "Pune";                       // Asha moves next month
        System.out.println("right:   a Rs " + a.price.total() + ", b Rs " + b.price.total()
            + ", tier " + a.customer.tier + ", " + a.invoice);
    }
}`,
        },
        {
          type: "output",
          text: `wrong 1: o1 Rs 800, o2 Rs 800
wrong 2: Asha is GOLD, the order's copy says SILVER
right:   a Rs 800, b Rs 1000, tier GOLD, Invoice[customerName=Asha, address=Kolkata]`,
        },
        {
          type: "list",
          items: [
            "**Wrong 1** treats a composed part as aggregated: the price came from outside and was shared, so a 20% discount on o1 also discounted o2 (both Rs 800). A price breakdown is part of exactly one order.",
            "**Wrong 2** treats an association as composition: the order built its own `Customer`, so after Asha moved up to GOLD, the order's private copy still said SILVER. There are now two Ashas, and only one is real.",
            "**Right:** each `Order` creates its own `Price` (only `a` was discounted: Rs 800 against Rs 1000), references the one real `Customer` (tier GOLD), and composes an `Invoice` snapshot that kept Kolkata after Asha moved to Pune.",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Returning the composed collection",
        },
        {
          type: "paragraph",
          text: "`LeakyOrder.items()` returned its real list, and one outside `clear()` produced an order with no items and a Rs 40 total. A getter for a composed collection returns `Collections.unmodifiableList(...)`, a `List.copyOf(...)` snapshot, or an immutable list stored once.",
        },
        {
          type: "heading",
          text: "Keeping the caller's collection",
        },
        {
          type: "code",
          language: "java",
          title: "AliasedCategory.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class AliasedCategory {
    record Product(String sku) {}

    static class Category {
        private final List<Product> products;
        Category(List<Product> products) { this.products = products; }        // keeps the caller's list
        int size() { return products.size(); }
    }

    static class SafeCategory {
        private final List<Product> products;
        SafeCategory(List<Product> products) { this.products = new ArrayList<>(products); }  // own list
        int size() { return products.size(); }
    }

    public static void main(String[] args) {
        List<Product> batch = new ArrayList<>(List.of(new Product("P-1"), new Product("P-2")));
        Category category = new Category(batch);
        SafeCategory safe = new SafeCategory(batch);

        batch.clear();                     // the importer reuses its list for the next batch
        System.out.println("category " + category.size() + ", safe category " + safe.size());
    }
}`,
        },
        {
          type: "output",
          text: "category 0, safe category 2",
        },
        {
          type: "paragraph",
          text: "Even in an aggregation, the container belongs to the whole. `Category` aliased the importer's list, so clearing that list emptied the category. `SafeCategory` copied the references into its own list: same shared products, its own container.",
        },
        {
          type: "heading",
          text: "Thinking final protects the part",
        },
        {
          type: "code",
          language: "java",
          title: "FinalItems.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class FinalItems {
    static class Order {
        final List<String> items = new ArrayList<>(List.of("1 x BOOK-42"));
    }

    public static void main(String[] args) {
        Order order = new Order();
        order.items.add("3 x PEN-7");              // compiles: final does not freeze the list
        System.out.println(order.items);
        order.items = new ArrayList<>();           // the only thing final stops
    }
}`,
        },
        {
          type: "output",
          text: `FinalItems.java:13: error: cannot assign a value to final variable items
        order.items = new ArrayList<>();           // the only thing final stops
             ^
1 error`,
        },
        {
          type: "paragraph",
          text: "Without that last line, the program compiles and prints `[1 x BOOK-42, 3 x PEN-7]`: an outsider changed a `final` composed list freely. `final` fixes the reference, not the object, and says nothing about ownership. The ownership comes from `private`, from creating the part inside, and from never handing it out raw.",
        },
        {
          type: "heading",
          text: "Mistakes already reproduced above",
        },
        {
          type: "list",
          items: [
            "**Linking only one side of a two-way association.** `CustomerOrders` showed O-1 claiming Asha while her list was empty, and O-2 sitting in two customers' lists. One helper per link change, updating both sides, fixes it.",
            "**Following back-references in `toString`, `equals` and `hashCode`.** IDE-generated methods with every field ticked, or Lombok's `@Data` on both sides of a two-way link, walk the cycle until `StackOverflowError`, as `CycleTraps` did. Fixing only `toString` isn't enough, as Try It Yourself shows.",
            "**Sharing a part that should be owned.** `RelationshipChoice` showed one discount landing on two orders because they shared a `Price`.",
            "**Cascading deletes across an aggregation.** By hand or through `CascadeType.REMOVE` on a `@ManyToMany`, it deletes shared parts that others still use. The production section reproduces it.",
            "**Reaching through associations.** `order.customer().getAddress().city()` crashed in `DemeterDemo` on a legal `0..1` gap. Asking the nearest object keeps the knowledge of optional links where it belongs.",
          ],
        },
        {
          type: "heading",
          text: "Extending a class to get has-a",
        },
        {
          type: "paragraph",
          text: "`class Category extends ArrayList<Product>` gets the list for free and publishes every list method, `clear()` and `removeIf` included, as part of the category's API. `DelegationDemo` counted 22 public method names for a `HashSet` subclass against 5 for the wrapper. A category has products; it isn't a list.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Decide each relationship's lifecycle before writing the class: who creates the other object, who else may hold it, and what deleting the whole does to it. Then write it down in a comment next to the field.",
            "Composition: create parts inside, keep them private, and hand out unmodifiable views, copies or immutable records. Make the part's type private when nobody else needs it.",
            "Aggregation: accept parts from outside, copy the incoming collection, and make deletes unlink rather than delete.",
            "Association: reference the other object, or just its id, without copying it, mutating its internals or deleting it.",
            "Default to one-way associations and query for the other direction. For a two-way link, choose one side to own it, add helper methods, and keep back-references out of `toString`, `equals` and `hashCode`.",
            "Prefer ids or small summaries over object references for long-lived links, such as caches, sessions or static registries, so one entry doesn't keep a whole graph alive.",
            "Return DTO records from APIs instead of entities with two-way links.",
            "Reuse behaviour with composition and delegation; keep inheritance for genuine is-a.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "In C++ a composed part can live inside its whole. In Java it's always a separate object with its own header, plus a reference in the whole. I measured what that costs with the same `ThreadMXBean` allocation counter the Memory Allocation lesson used:",
        },
        {
          type: "code",
          language: "java",
          title: "PartCost.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class PartCost {
    static final com.sun.management.ThreadMXBean MX =
        (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
    static Object sink;                                   // keeps each result reachable

    record PriceBreakdown(int subtotal, int shipping, int tax) {}
    record FlatOrder(int id, int subtotal, int shipping, int tax) {}       // price fields inline
    record ComposedOrder(int id, PriceBreakdown price) {}                 // price as its own object
    record OrderItem(String sku, int qty) {}

    static final List<OrderItem> ITEMS =
        new ArrayList<>(List.of(new OrderItem("A", 1), new OrderItem("B", 2)));
    static final List<OrderItem> FROZEN = List.copyOf(ITEMS);

    static long bytes(Runnable r) {
        long id = Thread.currentThread().threadId();
        long before = MX.getThreadAllocatedBytes(id);
        r.run();
        return MX.getThreadAllocatedBytes(id) - before;
    }

    public static void main(String[] args) {
        Runnable[] cases = {
            () -> sink = new FlatOrder(1, 450, 40, 81),
            () -> sink = new ComposedOrder(1, new PriceBreakdown(450, 40, 81)),
            () -> sink = Collections.unmodifiableList(ITEMS),
            () -> sink = List.copyOf(ITEMS),
            () -> sink = List.copyOf(FROZEN)
        };
        String[] names = { "FlatOrder", "ComposedOrder + part", "unmodifiableList(items)",
                           "List.copyOf(ArrayList)", "List.copyOf(immutable)" };
        for (int round = 0; round < 3; round++) for (Runnable r : cases) bytes(r);   // warm up
        long base = bytes(() -> {});
        for (int i = 0; i < cases.length; i++) {
            System.out.printf("%-24s %3d bytes%n", names[i], bytes(cases[i]) - base);
        }
        System.out.println("copyOf(immutable) is the same list: " + (List.copyOf(FROZEN) == FROZEN));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java PartCost                                      # JDK 21
$JDK25/bin/java PartCost                           # JDK 25.0.5, same numbers as JDK 21
$JDK25/bin/java -XX:+UseCompactObjectHeaders PartCost`,
        },
        {
          type: "output",
          text: `FlatOrder                 32 bytes
ComposedOrder + part      48 bytes
unmodifiableList(items)   24 bytes
List.copyOf(ArrayList)    48 bytes
List.copyOf(immutable)     0 bytes
copyOf(immutable) is the same list: true`,
        },
        {
          type: "table",
          headers: ["Allocation", "JDK 21 (and 25 default)", "JDK 25, compact headers", "Where the bytes go (JDK 21)"],
          rows: [
            ["`FlatOrder`", "32", "24", "12 header + 4 ints = 28, rounded to 32"],
            ["`ComposedOrder` + its `PriceBreakdown`", "48", "40", "24 for the order (header, int, reference) + 24 for the part"],
            ["`Collections.unmodifiableList(items)`", "24", "16", "A wrapper object on every call"],
            ["`List.copyOf(ArrayList)` of 2 items", "48", "40", "A new immutable list plus a temporary array"],
            ["`List.copyOf(already immutable)`", "0", "0", "Returns the same list"],
          ],
        },
        {
          type: "list",
          items: [
            "Composition cost 16 bytes per order in both header layouts: one more header and one more reference, after rounding. At a million live orders that's about 16 MB, worth knowing and rarely worth denormalizing for. JDK 25's compact headers (JEP 519) shrink each header from 12 to 8 bytes, which after 8-byte rounding saved 8 bytes in every row that allocated something, and the extra object is still there.",
            "Defensive getters allocate. An unmodifiable view is a 24-byte wrapper per call, and `List.copyOf` of a mutable list copies every time. Storing the composed list as `List.copyOf(...)` once and returning that same list costs nothing per call, because `List.copyOf` of an immutable list returned the very same instance. These are single cold calls; in a hot loop the JIT's escape analysis may remove a wrapper that never escapes.",
            "The numbers were identical across runs on my machine, but they depend on the JVM's object layout, so they're specific to 64-bit HotSpot with the default compressed pointers.",
          ],
        },
        {
          type: "heading",
          text: "An association keeps alive everything behind it",
        },
        {
          type: "paragraph",
          text: "The bigger cost is reachability. A long-lived association keeps its target alive, and the target's composed parts with it. I kept 500 recently viewed products, each with an 80 KB composed image, in a static list, once as whole products and once as small summaries:",
        },
        {
          type: "code",
          language: "java",
          title: "RecentlyViewed.java",
          code: `import java.util.ArrayList;
import java.util.List;

public class RecentlyViewed {
    record Image(byte[] pixels) {}                                // composed: ~80 KB per product
    record Product(String sku, int price, Image image) {}
    record ProductSummary(String sku, int price) {}

    static final List<Object> RECENT = new ArrayList<>();         // a long-lived "recently viewed" list

    public static void main(String[] args) throws InterruptedException {
        boolean keepWholeProduct = args.length > 0 && args[0].equals("product");
        for (int i = 1; i <= 500; i++) {
            Product product = new Product("P-" + i, 999, new Image(new byte[80_000]));
            RECENT.add(keepWholeProduct ? product : new ProductSummary(product.sku(), product.price()));
        }
        System.gc();                                              // a request, to measure what is live
        Thread.sleep(200);
        Runtime rt = Runtime.getRuntime();
        long usedMb = (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024);
        System.out.println((keepWholeProduct ? "keeps Product:        " : "keeps ProductSummary: ")
            + RECENT.size() + " entries, heap used after GC ~" + usedMb + " MB");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -Xmx128m RecentlyViewed product
java -Xmx128m RecentlyViewed`,
        },
        {
          type: "output",
          text: `keeps Product:        500 entries, heap used after GC ~40 MB
keeps ProductSummary: 500 entries, heap used after GC ~1 MB`,
        },
        {
          type: "paragraph",
          text: "Same number of entries, forty times the memory, stable across three runs on my machine (the exact MB will differ elsewhere). The list only referenced each `Product`, but the product composed its image, so the image stayed too. Two-way links don't cause this, as `CycleGc` showed; a root that reaches more than it needs does. The same applies to deep graphs at serialization time: Jackson 2.16 and later refuse to nest deeper than 1,000 levels by default, which is what stops the cycle in the production section.",
        },
      ],
    },
    {
      title: "Association, Aggregation and Composition in Production",
      blocks: [
        {
          type: "paragraph",
          text: "For the production scenario I switch to a ride-hailing backend, because it has every relationship in this lesson, and two of them go wrong in ways that are easy to ship. This is how the order model from the rest of the lesson maps onto it:",
        },
        {
          type: "table",
          headers: ["Relationship", "In the ride-hailing backend", "Delete rule"],
          rows: [
            ["Dependency", "`Ride.complete(FareCalculator, NotificationSender)`", "Nothing is kept, so nothing to delete"],
            ["Association", "A `Ride` knows its `Rider` and its `Driver`; a `Driver` knows the `Vehicle` they drive", "Deleting a ride leaves the rider, the driver and the vehicle alone"],
            ["Aggregation", "A `Fleet` (Airport, Corporate) and its `Vehicle`s: registered before any fleet, shared between fleets", "Deleting a fleet only removes its links"],
            ["Composition", "A `Ride` and its `RideLeg`s and `FareBreakdown`: created by the ride, meaningless without it", "Deleting a ride deletes them too"],
            ["Inheritance, realization", "`Cab extends Vehicle`, `UpiPayment implements PaymentMethod`", "One object, nothing to cascade"],
          ],
        },
        {
          type: "paragraph",
          text: "The two production problems I'd expect from this topic are a JSON endpoint that serializes a two-way association, and a delete that treats an aggregation as a composition. Both run here, the first on real Jackson.",
        },
        {
          type: "heading",
          text: "A driver that won't serialize",
        },
        {
          type: "paragraph",
          text: "A Spring Boot controller returning an entity hands it to Jackson. Here's the same thing without the web layer, with a `Driver` and a `Vehicle` that point at each other the way two JPA entities would:",
        },
        {
          type: "code",
          language: "java",
          title: "DriverJson.java",
          code: `import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class DriverJson {
    // Shaped like JPA entities: a two-way Driver <-> Vehicle link
    public static class Driver {
        public String name;
        public Vehicle vehicle;
    }

    public static class Vehicle {
        public String plate;
        public Driver driver;
    }

    // The fix I prefer: response records shaped for the API, built from the domain
    record VehicleDto(String plate) {}
    record DriverDto(String name, VehicleDto vehicle) {
        static DriverDto from(Driver d) {
            return new DriverDto(d.name, new VehicleDto(d.vehicle.plate));
        }
    }
    record VehicleView(String plate, String driverName) {}      // the other direction, flattened

    public static void main(String[] args) throws Exception {
        Driver ravi = new Driver();
        ravi.name = "Ravi";
        ravi.vehicle = new Vehicle();
        ravi.vehicle.plate = "WB-02-AB-1234";
        ravi.vehicle.driver = ravi;                             // both sides set: a cycle

        ObjectMapper mapper = new ObjectMapper();
        try {
            mapper.writeValueAsString(ravi);
        } catch (JsonMappingException e) {
            System.out.println(e.getClass().getSimpleName() + ": " + e.getOriginalMessage());
            System.out.println("cause: " + e.getCause().getClass().getName());
            System.out.println("path: " + e.getPath().size() + " references, e.g. "
                + e.getPath().subList(0, 2));
        }

        System.out.println(mapper.writeValueAsString(DriverDto.from(ravi)));
        System.out.println(mapper.writeValueAsString(new VehicleView(ravi.vehicle.plate, ravi.name)));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `# Maven: com.fasterxml.jackson.core:jackson-databind:2.21.7
# (brings jackson-core and jackson-annotations); $JACKSON is those three jars
javac -cp "$JACKSON" DriverJson.java
java -cp "$JACKSON:." DriverJson
java -cp "$JACKSON_2_15:." DriverJson      # the same class on jackson-databind 2.15.4`,
        },
        {
          type: "output",
          text: `JsonMappingException: Document nesting depth (1001) exceeds the maximum allowed (1000, from \`StreamWriteConstraints.getMaxNestingDepth()\`)
cause: com.fasterxml.jackson.core.exc.StreamConstraintsException
path: 1000 references, e.g. [DriverJson$Vehicle["driver"], DriverJson$Driver["vehicle"]]
{"name":"Ravi","vehicle":{"plate":"WB-02-AB-1234"}}
{"plate":"WB-02-AB-1234","driverName":"Ravi"}

# on 2.15.4
JsonMappingException: Infinite recursion (StackOverflowError)
cause: java.lang.StackOverflowError
path: 1000 references, e.g. [DriverJson$Driver["vehicle"], DriverJson$Vehicle["driver"]]
{"name":"Ravi","vehicle":{"plate":"WB-02-AB-1234"}}
{"plate":"WB-02-AB-1234","driverName":"Ravi"}`,
        },
        {
          type: "list",
          items: [
            "Jackson walks references like any graph walker: `Driver.vehicle`, `Vehicle.driver`, `Driver.vehicle`, and so on. On 2.21 the write-side nesting limit (`StreamWriteConstraints`, 1,000 levels by default) stops it before the thread's stack runs out. That limit arrived in 2.16, and 2.19.2 gave me the same nesting-depth message. On 2.15.4 the same class recursed until the stack overflowed: `Infinite recursion (StackOverflowError)`, the message most older answers online show. Both mean a cycle.",
            "Uncaught, the 2.21 exception printed a reference chain of 1,000 alternating `Vehicle[\"driver\"]` and `Driver[\"vehicle\"]` entries in its message, a 1,024-frame trace, and another 1,024 frames for its cause. In a log, that's a wall of text with the answer in the first line.",
            "The fix I'd reach for first is response records. `DriverDto` follows only the direction the client needs, and `VehicleView` flattens the other direction into a `driverName`. The API contract stops depending on the entity graph, and a new field on an entity can't leak into a response by accident.",
          ],
        },
        {
          type: "paragraph",
          text: "When the entities themselves have to be serialized, Jackson can be told which side is the back-reference:",
        },
        {
          type: "code",
          language: "java",
          title: "DriverJsonRefs.java",
          code: `import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.ObjectMapper;

public class DriverJsonRefs {
    public static class Driver {
        public String name;
        @JsonManagedReference public Vehicle vehicle;     // forward side: written normally
    }

    public static class Vehicle {
        public String plate;
        @JsonBackReference public Driver driver;          // back side: skipped on write, set on read
    }

    public static void main(String[] args) throws Exception {
        Driver ravi = new Driver();
        ravi.name = "Ravi";
        ravi.vehicle = new Vehicle();
        ravi.vehicle.plate = "WB-02-AB-1234";
        ravi.vehicle.driver = ravi;                      // the cycle is still there in memory

        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(ravi);
        System.out.println(json);
        System.out.println(mapper.writeValueAsString(ravi.vehicle));   // the vehicle on its own

        Driver read = mapper.readValue(json, Driver.class);
        System.out.println("back link rebuilt: " + (read.vehicle.driver == read));
    }
}`,
        },
        {
          type: "output",
          text: `{"name":"Ravi","vehicle":{"plate":"WB-02-AB-1234"}}
{"plate":"WB-02-AB-1234"}
back link rebuilt: true`,
        },
        {
          type: "list",
          items: [
            "The forward side was written and the back side skipped, so the cycle never reached the output. Reading the JSON back set `vehicle.driver` to the new driver again: `back link rebuilt: true`.",
            "The catch is the second line: serialized on its own, the vehicle lost its driver completely. The annotations fix one direction for every endpoint, which is why I prefer DTOs. A third option, `@JsonIdentityInfo` keyed on the plate and the name, wrote `{\"name\":\"Ravi\",\"vehicle\":{\"plate\":\"WB-02-AB-1234\",\"driver\":\"Ravi\"}}` when I tried it: the second visit becomes an id, which clients then have to resolve.",
          ],
        },
        {
          type: "heading",
          text: "Deleting a fleet must not delete its vehicles",
        },
        {
          type: "paragraph",
          text: "The second problem is a delete rule. Deleting a ride should take its legs and fare breakdown with it (composition). Deleting a fleet should only remove the fleet and its links, because its vehicles are aggregated. Here are both, with in-memory maps standing in for tables, and a cascading fleet delete next to the correct one:",
        },
        {
          type: "code",
          language: "java",
          title: "FleetCleanup.java",
          code: `import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class FleetCleanup {
    record Vehicle(String plate) {}
    record Ride(String id, String plate) {}                     // refers to its vehicle by id
    record RideLeg(String rideId, String from, String to) {}
    record FareBreakdown(String rideId, int base, int distance) {}

    // In-memory "tables", the way a repository layer sees them
    static class Store {
        final Map<String, Ride> rides = new LinkedHashMap<>();
        final List<RideLeg> legs = new ArrayList<>();           // composed into rides
        final Map<String, FareBreakdown> fares = new LinkedHashMap<>();
        final Map<String, Vehicle> vehicles = new LinkedHashMap<>();
        final Map<String, Set<String>> fleets = new LinkedHashMap<>();   // fleet -> plates

        Store() {
            for (String p : List.of("WB-1111", "WB-2222", "WB-3333")) vehicles.put(p, new Vehicle(p));
            fleets.put("Airport", new LinkedHashSet<>(List.of("WB-1111", "WB-2222")));
            fleets.put("Corporate", new LinkedHashSet<>(List.of("WB-2222", "WB-3333")));
            rides.put("R-1", new Ride("R-1", "WB-1111"));
            legs.add(new RideLeg("R-1", "Howrah", "Salt Lake"));
            fares.put("R-1", new FareBreakdown("R-1", 50, 108));
            rides.put("R-2", new Ride("R-2", "WB-2222"));          // live ride on a shared car
            legs.add(new RideLeg("R-2", "Airport", "New Town"));
            legs.add(new RideLeg("R-2", "New Town", "Sector V"));
            fares.put("R-2", new FareBreakdown("R-2", 50, 150));
        }

        void deleteRide(String id) {                            // composition: the parts go too
            rides.remove(id);
            legs.removeIf(leg -> leg.rideId().equals(id));
            fares.remove(id);
        }

        void deleteFleetCascading(String fleet) {               // BUG: treats vehicles as owned
            for (String plate : fleets.remove(fleet)) vehicles.remove(plate);
        }

        void deleteFleet(String fleet) {                        // aggregation: unlink only
            fleets.remove(fleet);
        }

        void check(String label) {
            String plate = rides.get("R-2").plate();
            System.out.println(label + ": vehicles=" + vehicles.keySet()
                + " Corporate=" + fleets.get("Corporate"));
            System.out.println("  R-2 uses " + plate + ", found: " + vehicles.containsKey(plate));
        }
    }

    public static void main(String[] args) {
        Store bug = new Store();
        bug.deleteRide("R-1");
        System.out.println("deleteRide(R-1): rides=" + bug.rides.keySet()
            + " legs=" + bug.legs.size() + " fares=" + bug.fares.size());
        bug.deleteFleetCascading("Airport");
        bug.check("cascading delete");

        Store fixed = new Store();
        fixed.deleteFleet("Airport");
        fixed.check("unlinking delete");
    }
}`,
        },
        {
          type: "output",
          text: `deleteRide(R-1): rides=[R-2] legs=2 fares=1
cascading delete: vehicles=[WB-3333] Corporate=[WB-2222, WB-3333]
  R-2 uses WB-2222, found: false
unlinking delete: vehicles=[WB-1111, WB-2222, WB-3333] Corporate=[WB-2222, WB-3333]
  R-2 uses WB-2222, found: true`,
        },
        {
          type: "list",
          items: [
            "`deleteRide` is composition done right: R-1's one leg and its fare breakdown went with it, from 3 legs and 2 fares down to 2 and 1. Nothing else in the system can refer to a leg of a deleted ride.",
            "The cascading fleet delete removed WB-1111 and WB-2222 from the vehicles table. WB-2222 was still listed by the Corporate fleet and was carrying live ride R-2, which now points at a vehicle that doesn't exist: `found: false`. In a database, foreign keys would turn this into either a constraint violation or an even wider cascade, depending on how they're declared.",
            "The fix deletes the fleet and its links and nothing else. All three cars stayed, the Corporate fleet was intact, and R-2 found its car. In JPA terms, that's no `CascadeType.REMOVE` (and no `ALL`) on the fleet's `@ManyToMany`.",
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
              question: "What is association in Java?",
              answer:
                "A relationship where one object keeps a lasting reference to another object that has its own life. An `Order` knows its `Customer`: neither created the other, and either can exist alone.\n\nIn code it's a field set from outside, through a constructor or a setter. In my `AssociationDemo`, two orders pointed at the same `Customer` object (`same object: true`), so Asha's upgrade to GOLD showed through both, and clearing the orders left Asha untouched.",
            },
            {
              question: "What is aggregation? Give a real example.",
              answer:
                "A whole-part association where the parts live independently: they can exist before the whole, be shared by several wholes, and survive when the whole is deleted. A team and its players, a playlist and its songs, a `Category` and its `Product`s.\n\nIn my `AggregationDemo`, the products went into the catalog first, P-2 sat in both the Electronics and the Sale category, and deleting the Sale category left all three products in the catalog.",
            },
            {
              question: "What is composition? Give a real example.",
              answer:
                "The strongest has-a: the whole creates its parts, owns them exclusively and controls every change, and the parts don't outlive it. A house and its rooms, a book and its chapters, an `Order` and its `OrderItem`s and `PriceBreakdown`.\n\nIn Java that means the whole runs `new` for its parts and never hands out a mutable one. My `CompositionDemo` returned `Collections.unmodifiableList(items)`, so an outside `clear()` threw `UnsupportedOperationException` instead of emptying the order.",
            },
            {
              question: "What's the difference between is-a and has-a?",
              answer:
                "Is-a is inheritance: a `Laptop` is a `Product` and can be used anywhere a `Product` is expected. Has-a is one object referring to another: an `Order` has a `Customer`. Is-a relates types and still produces one object; has-a links two objects with a reference.\n\nThe test I use is substitution. If every rule for `Product` holds for `Laptop`, it's is-a. An `Order` isn't a kind of `Customer`, so `Order extends Customer` to reuse a name field would be wrong; it needs a `customer` field.",
            },
            {
              question: "What's the difference between aggregation and composition?",
              answer:
                "Ownership and lifecycle. In aggregation the parts come from outside, can be shared, and survive the whole. In composition the whole creates the parts, nobody else holds them, and they go when the whole goes. UML draws a hollow diamond for aggregation and a filled one for composition, both at the whole's end.\n\nIn code, `Category.add(Product)` receives a product that exists elsewhere, while `Order` builds its own items. `LifecycleGc` showed the heap side: after the order was dropped, its `PriceBreakdown` was collected with it, while the category's `Product` stayed reachable.",
            },
            {
              question: "What is a dependency (uses-a), and how is it different from association?",
              answer:
                "A dependency means a class uses another only during a method call, as a parameter or a local, and keeps nothing. An association is kept in a field. `Order.checkout(DiscountPolicy, Notifier)` depends on both; `Order.customer` is an association.\n\n`javap` makes it concrete: a dependency appears only in a method descriptor, `(LNotifier;)V`, never as a field. In `DependencyDemo` each call could pass a different discount policy, and a plain lambda worked as a test double.",
            },
            {
              question: "How are these relationships drawn in UML?",
              answer:
                "Association: a solid line, an open arrowhead for navigability, multiplicities at the ends. Aggregation: a hollow diamond at the whole. Composition: a filled diamond at the whole. Dependency: a dashed line with an open arrow, often labelled «use». Inheritance: a solid line with a hollow triangle at the parent. Realization: a dashed line with a hollow triangle at the interface.\n\nThe diagram in this lesson puts all six on one order model: `Category ◇── Product`, `Order ◆── OrderItem`, `Order - -> Notifier`, `Laptop ──▷ Product` and `CardPayment - -▷ PaymentProcessor`.",
            },
            {
              question: "Does Java have keywords for association, aggregation or composition?",
              answer:
                "No. All three compile to a field holding a reference, and a dependency is just a parameter. `extends` and `implements` are the only relationship keywords, and they're for is-a and realization.\n\n`javap -p -s` showed the composed `items` in `Order` and the aggregated `products` in `Category` with the identical descriptor `Ljava/util/List;`. The difference lives in behaviour: who creates the object, who else may hold it, and what happens on delete.",
            },
            {
              question: "What is multiplicity? Give examples.",
              answer:
                "How many objects can sit at one end of a relationship: `1`, `0..1`, `0..*`, `1..*` or a range. An order has exactly one customer, zero or one coupon, and one or more items.\n\nIn Java it turns into field types and constructor checks. My `Multiplicity` program used `Objects.requireNonNull` for `1`, `Optional<Coupon>` for `0..1`, and rejected an empty item list for `1..*` with \"an order needs at least one item\".",
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
              question: "How do you implement composition properly in Java?",
              answer:
                "Create the parts inside the whole, keep them in private fields, never return a mutable part, and route every change through the whole's methods. If a part has to come from outside, copy it on the way in. Immutable parts, like records of immutable values, can be handed out safely.\n\nMy `LeakyOrder` broke the rule by returning its real list, and one outside `clear()` left it with no items and a Rs 40 total. The proper `Order` created its items in `addItem`, repriced in the same method, and returned an unmodifiable view.",
            },
            {
              question: "How do you implement aggregation, and what tells a reader it isn't composition?",
              answer:
                "Parts come in through something like `add(Product)`, the whole keeps its own collection of references, and removing or deleting only removes links. The tells are in the code: no `new Part` inside the whole, parts that are reachable from elsewhere, and a delete that doesn't touch them.\n\nOne detail people miss: the collection itself is still composed. `Category` must create its own list, not keep the caller's. My `AliasedCategory` kept the caller's list, and when the caller cleared it, the category dropped to 0 products while the copying `SafeCategory` kept 2.",
            },
            {
              question: "Composition or inheritance: which do you prefer, and why?",
              answer:
                "Composition, unless the relationship is a real, substitutable is-a. Composition hides the reused class behind my own API, lets me pick the implementation at runtime, and isn't affected by the reused class's internal self-calls. Inheritance exposes the parent's whole API and ties me to its implementation details.\n\nThe Inheritance lesson's `InstrumentedHashSet` counted 6 for 3 added elements. My `CountingSet`, which holds a `Set` and forwards to it, counted 3, accepts any `Set` implementation, and exposed 5 public method names instead of the 22 a `HashSet` subclass inherits.",
            },
            {
              question: "What is delegation?",
              answer:
                "Implementing a method by forwarding the call to an object held in a field, often with some behaviour added around it. It's how composition reuses code.\n\n`CountingSet.addAll` adds `c.size()` to its counter and then calls `inner.addAll(c)`. `HashSet`'s internal calls to `add` stay inside the `HashSet`, so nothing is counted twice. The price is one forwarding method for each operation I want to expose.",
            },
            {
              question: "What is a bidirectional association, and what problems does it cause?",
              answer:
                "Both objects hold references to each other, like `Customer.orders` and `Order.customer`. Navigation is easy in both directions, but it's two references describing one fact, so they can disagree, and it forms a cycle that recursive methods loop on.\n\nIn `CustomerOrders`, setting only `o1.customer` left Asha's list empty, and moving O-2 by hand left it in both customers' lists. In `CycleTraps`, the IDE-style `toString` and `hashCode` on a `Department` and its manager both ended in `StackOverflowError`.",
            },
            {
              question: "How do you keep both sides of a bidirectional association in sync?",
              answer:
                "Make one method the only way to change the link and have it update both sides: `addOrder` removes the order from its old customer, adds it to the new one and sets the back reference, and `removeOrder` clears both. Keep the collection private behind a read-only view.\n\nWith those helpers, every line of my `CustomerOrders` output agreed, including moving O-4 from Meera to Kabir. JPA entities need the same helpers, because only the owning side is written to the database.",
            },
            {
              question: "What is navigability, and when would you make an association bidirectional?",
              answer:
                "Navigability is which side can reach the other. Unidirectional means only one side holds the reference; bidirectional means both do. I default to one-way, which is one reference to maintain and no cycle, and answer the other direction with a query.\n\n`OrderQueries` keeps only `Order -> Customer` and finds a customer's orders through the repository: `Asha: [O-1, O-3], spent Rs 1570`. I'd go two-way only when both directions are used constantly, in memory, by objects that live together.",
            },
            {
              question: "How do you model a many-to-many relationship in Java?",
              answer:
                "Either collections on both sides, which is a bidirectional association with all its sync rules, or a join object that represents the link itself. When the link has data of its own, the join object is the right model; UML calls it an association class.\n\nIn `Multiplicity`, `Enrollment(student, course, enrolledOn)` held the enrolment date, and both directions were queries over one list: Asha's courses were `[Java, SQL]`, the SQL students `[Asha, Ravi]`. It's the same shape as a join table.",
            },
            {
              question: "Does making a field final make it composition, or make the part safe?",
              answer:
                "No. `final` only stops the field from being reassigned. The object it refers to can still be changed by anyone holding a reference, and the field says nothing about who created that object.\n\n`FinalItems` compiled `order.items.add(...)` on a `final` list without complaint and only rejected `order.items = new ArrayList<>()` with \"cannot assign a value to final variable items\". In `OrderModel`, all three fields, the association and the composed parts alike, had the same `ACC_PRIVATE, ACC_FINAL` flags.",
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
              question: "What do association, aggregation and composition look like at the bytecode level?",
              answer:
                "Identical. Each is a field whose descriptor is a reference type, like `LCustomer;` or `Ljava/util/List;`, with whatever access flags I chose. A generic collection also gets a `Signature` attribute such as `Ljava/util/List<LOrderItem;>;`, but nothing records ownership. A dependency appears only in a method descriptor.\n\nThe one place composition is visible is the code. In `Order`'s constructor, `javap -c` showed `aload_1; putfield customer` for the association, and `new OrderItem ... List.add` and `new PriceBreakdown ... putfield price` for the parts it created. Even that only says where an object came from, not that nobody else gets it later.",
            },
            {
              question: "How does the garbage collector relate to composition and aggregation?",
              answer:
                "It knows nothing about either. It frees an object when no path from a GC root reaches it. Composition's shared lifecycle is a consequence: if the whole never leaked its parts, they become unreachable together with it. Aggregated parts stay alive as long as anything else, another whole or a repository, still reaches them.\n\n`LifecycleGc` watched three objects through `WeakReference`s. After dropping the order, the order and its `PriceBreakdown` were cleared, while the product survived through `books -> ArrayList -> Object[]` until the category was dropped too. G1, Serial, Parallel and ZGC all gave the same result, with `System.gc()` treated as a request.",
            },
            {
              question: "Can a bidirectional association cause a memory leak in Java?",
              answer:
                "Not by itself. HotSpot's collectors trace from roots instead of counting references, so a cycle that no root reaches is collected like anything else. Leaks come from a long-lived root, like a static cache, that still reaches the graph.\n\n`CycleGc` dropped a `Department` and an `Employee` that pointed at each other, and both were collected. The real danger showed in `RecentlyViewed`: 500 whole products, each composing an 80 KB image, held about 40 MB through one static list, against about 1 MB for 500 summaries.",
            },
            {
              question: "Why do toString, equals and hashCode recurse on bidirectional associations, and how should they be written?",
              answer:
                "They walk the graph by following fields, and a two-way association is a cycle, so a naive implementation goes round until the stack overflows. They should follow composition edges and stop at association edges: identify the other side by an id or a name, never include the whole object.\n\nIn `CycleTraps`, `hashCode` overflowed inside `HashSet.add`, and the trace was capped at 1,024 frames, so `main` wasn't even in it. `equals` overflowed only when comparing two distinct but equal graphs, because `Objects.equals` checks `==` first.",
            },
            {
              question: "How does the relationship kind decide what a copy should do?",
              answer:
                "Composed parts belong to the whole's value, so a copy needs its own parts: a deep copy, unless the parts are immutable. Associated objects are independent, so a copy shares them; copying the customer would create a second Asha. Aggregated parts are shared too, but the copy needs its own collection of links.\n\n`ReorderCopy` showed both sides: `reorder` copied the items and shared the customer (`same customer: true, same item: false`), so editing O-2 left O-1 alone. The shallow copy shared the item, so editing O-3 changed O-1 to `5 x COFFEE-1KG`.",
            },
            {
              question: "How does JPA model composition, aggregation and association?",
              answer:
                "Composition of values is `@Embedded` or `@ElementCollection`. Composition of entities is `@OneToMany(cascade = ALL, orphanRemoval = true)`, so removing an item from its order deletes it. Associations and aggregations are `@ManyToOne`, `@OneToOne` or `@ManyToMany` without a remove cascade, so deleting one side only deletes links.\n\nThe classic mistake is `CascadeType.REMOVE` on a `@ManyToMany`. The production section's `FleetCleanup` reproduced it in memory: deleting the Airport fleet deleted WB-2222 while a live ride and the Corporate fleet still used it.",
            },
            {
              question: "What is the owning side of a JPA bidirectional association, and why does it matter?",
              answer:
                "It's the side that holds the foreign key: the `@ManyToOne` side, or the side that declares the `@JoinTable`. The other side is marked `mappedBy` and is ignored when JPA writes the relationship, so updating only the inverse collection saves nothing for that link.\n\nIt's the database version of the `CustomerOrders` bug, where one side said one thing and the other side another. That's why an entity helper like `addItem` does both `items.add(item)` and `item.setOrder(this)`.",
            },
            {
              question: "What does composition cost in memory in Java, and what changed in Java 25?",
              answer:
                "Each composed part is a separate heap object: its own header plus a 4-byte reference in the whole, rounded to 8 bytes. C++ can store a part inline; Java can't yet, since Valhalla's value classes (JEP 401) weren't part of Java 25. What Java 25 did was make compact object headers (JEP 519) a product option, shrinking each header from 12 to 8 bytes.\n\nI measured it with `ThreadMXBean`: a flat order record was 32 bytes and the composed version with its `PriceBreakdown` 48 on JDK 21, and 24 and 40 on JDK 25 with `-XX:+UseCompactObjectHeaders`. Composition still cost 16 bytes per order, which matters only at millions of live objects.",
            },
            {
              question: "What is the Law of Demeter, and how does it relate to associations?",
              answer:
                "A method should only talk to its immediate friends: its fields, its parameters and the objects it creates, not objects reached through them. A chain like `order.getCustomer().getAddress().city()` couples the caller to every association on the path, including whether each link can be empty.\n\nIn `DemeterDemo`, a customer without an address, a legal `0..1` state, made the chained call throw an NPE naming `Customer.getAddress()`. `order.shippingLabel()`, which asked the customer instead, answered \"address pending\".",
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
              question: "A REST endpoint that returns an entity fails with a Jackson error about nesting depth or \"Infinite recursion\". What's happening, and how do you fix it?",
              answer:
                "The entity has a two-way association, and Jackson follows references like any graph walker, so it goes round the cycle. In the production section's `DriverJson`, `Driver.vehicle` and `Vehicle.driver` pointed at each other: Jackson 2.16 and later stopped at \"Document nesting depth (1001) exceeds the maximum allowed (1000...)\", and 2.15 overflowed the stack and reported \"Infinite recursion (StackOverflowError)\". I reproduced both with the same class.\n\nMy fix is response records: `DriverDto(name, VehicleDto(plate))` and `VehicleView(plate, driverName)` serialized cleanly and decouple the API from the entities. If the entities must be serialized, `@JsonManagedReference` with `@JsonBackReference` works but drops the back side everywhere (the vehicle on its own lost its driver), and `@JsonIdentityInfo` writes the repeated object as an id.",
            },
            {
              question: "Model the relationships in the production section's ride-hailing backend: riders, drivers, vehicles, fleets, rides, legs, fares, payments and notifications.",
              answer:
                "Ride to Rider and Ride to Driver are associations, `1` and `0..1`, one-way from the ride, with \"rides of a driver\" as a query. Ride composes its `RideLeg`s (`1..*`) and its `FareBreakdown` (`1`), created inside and never handed out mutable. Fleet aggregates Vehicles, `*` to `*`. Driver to Vehicle is an association, `0..1`. The fare calculator and notification sender are dependencies passed into `complete`. `UpiPayment implements PaymentMethod`, and `Cab extends Vehicle` only if it truly substitutes.\n\nTwo details I'd call out: the receipt stores a snapshot of the driver's name and plate, not the live `Driver`, the same move as the `Invoice` in `RelationshipChoice`; and the delete rules follow the kinds, exactly as `FleetCleanup` ran them: deleting a ride deletes its legs and fare, deleting a fleet only unlinks vehicles. The lesson's order diagram has the same shapes: Ride sits where Order does, Fleet where Category does.",
            },
            {
              question: "In the production section's ride-hailing backend, a teammate added a cascade so that deleting a fleet deletes its vehicles. A day later, live rides can't find their cars. What went wrong?",
              answer:
                "Fleet to Vehicle is aggregation: vehicles exist before fleets, can be in several fleets, and survive them. The cascade treats it as composition. `FleetCleanup` reproduced it: deleting the Airport fleet removed WB-2222, which was still in the Corporate fleet and carrying live ride R-2, so the ride's vehicle lookup came back `found: false`.\n\nThe fix deletes only the fleet and its links, which kept all three vehicles and R-2 working. In JPA terms, no `CascadeType.REMOVE` or `ALL` on that `@ManyToMany`. Even a cascade that deletes only vehicles in no other fleet is wrong, because a car with no fleet is still a registered car.",
            },
            {
              question: "An OrderContext class holds references to the customer, cart, catalog, pricing engine, payment gateway, notifier and a cache, and it's passed everywhere. What's wrong, and how would you break it up?",
              answer:
                "It's a God object. Everything holds an association to it, so everything depends on everything: tests need the whole world, any change ripples, and since associations decide reachability, whoever keeps a context alive keeps the whole graph alive. `RecentlyViewed` showed that side: 500 whole products retained about 40 MB through one long-lived list, against about 1 MB for summaries.\n\nI'd split it by relationship kind. Collaborators used once become parameters, things an order must remember become narrow associations or ids, parts an order owns are composed into the order, and each service gets its own collaborators injected instead of digging them out of the context. Callers then ask their immediate friends instead of reaching through a context, the Law of Demeter point.",
            },
            {
              question: "A customer's old invoice now shows their new address. What design mistake causes that, and what's the fix?",
              answer:
                "The invoice reads the address through a live association, `order.customer.address`, so it shows whatever the customer has today. History needs a snapshot: a value copied when the order was placed and composed into the order.\n\nIn `RelationshipChoice`, the `Order` keeps the live `Customer` for things that should be current (the tier showed GOLD after the upgrade) and an `Invoice(customerName, address)` record created in its constructor. After Asha moved to Pune, the invoice still said Kolkata.",
            },
            {
              question: "Two orders showed the same discounted total after a discount was applied to only one of them. Where do you look?",
              answer:
                "At how the price object got into the orders. If one `Price` was passed in from outside and reused, it's shared, which is aggregation where the domain needs composition, so mutating it for one order changes every order that holds it.\n\n`RelationshipChoice` reproduced it: two orders built from one price template both showed Rs 800 after discounting one. With each `Order` creating its own `Price` in its constructor, the discounted order showed Rs 800 and the other Rs 1000. An immutable price record would have prevented it too.",
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
            "Write `Team` and `Player` as an aggregation in `TeamDemo.java`: create three players first, add two of them to a team kept in a `Map<String, Team>`, then remove the team from the map and print the players.",
            "In the same file, write an `Order` whose lines are a `private record Line(String item, int qty, int unitPrice)` inside it, with `addLine` and `total`. Add two lines and print the total. Then, from `TeamDemo.main`, try `new Order.Line(\"Samosa\", 3, 20)` and read the compiler's answer.",
            "In `CycleTraps`, change `Employee.toString` to print only the department's name (`department == null ? \"none\" : department.name`) and run it again. Predict both lines before you look.",
            "In `LifecycleGc`, add `PriceBreakdown kept = order.price();` just before `order = null;`, and print `kept` on the last line of `main`. Predict which of the four output lines changes.",
            "In the production section's `FleetCleanup`, make the cascade \"smart\": delete a vehicle only if no other fleet still lists it. Run it and decide whether that's a fix.",
            "Run `javap -p -s Team Order` on step 1 and 2's classes and compare the descriptors of the players list and the lines list.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints all three players after the team is gone. Step 2's order totals Rs 120 for 3 samosas at 20 and 2 chais at 30, and `new Order.Line(...)` fails with `Line has private access in Order`: composition enforced by the compiler. Step 3 prints `Department{name=Sales, manager=Employee{name=Asha, department=Sales}}`, and then the program still dies with `StackOverflowError` when `HashSet.add` hashes the department, because `hashCode` follows the back-reference too. In step 4, the order is still collected but `price collected` turns `false`: a part that escaped its whole outlives it. Step 5, on the production code, keeps WB-2222, so R-2 finds its car, but WB-1111 is still deleted although it's a registered vehicle that only left a fleet, so it isn't a fix. Step 6 shows `Ljava/util/List;` for both; only the `Signature` attributes, `List<Player>` and `List<Order$Line>`, differ.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `SCALE      dependency < association < aggregation < composition
           uses-a       knows-a       has-a         part-of
UML        - - ->       ───>          ◇───          ◆───
           is-a: ───▷ (extends)       implements: - - ▷

IN JAVA    no keywords: all are references (javap: LCustomer;)
 depend.   parameter or local, never stored
 assoc.    field set from outside, independent lifecycle
 aggreg.   parts added from outside, shared, survive the whole
 compos.   parts created inside, never handed out raw;
           unreachable with the whole -> collected together

MULTIPL.   1   0..1 (Optional)   0..*   1..*   *..* (join object)
NAVIG.     default one-way + query; two-way needs add/remove helpers

TRAPS      two-way: out-of-sync sides, toString/hashCode recursion,
           Jackson cycle (2.16+: nesting depth 1000)
           cascading deletes across an aggregation
           returning, sharing or aliasing a composed part

COPY       deep along composition, shared along association
JPA        compose: @Embedded, @ElementCollection,
                    @OneToMany(cascade = ALL, orphanRemoval = true)
           link:    @ManyToOne, @ManyToMany, never REMOVE
           mappedBy = inverse side; the owning side has the FK`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "If someone asks for the difference between aggregation and composition: ownership and lifecycle. Who creates the part, who else may hold it, and whether it survives the whole. Java has no keyword for either, so the code has to show it.",
            "Has-a is usually the better tool than is-a: an `Order` has a `Customer`, a `Category` has `Product`s, and a wrapper that delegates beats a subclass that inherits everything.",
            "Every relationship in this lesson was a field of a declared type, like `Customer customer` or `PaymentProcessor processor`. Next comes Polymorphism, where the object behind such a reference can be any subtype, and the JVM picks the method to run at runtime.",
          ],
        },
      ],
    },
  ],
};
