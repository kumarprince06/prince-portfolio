import type { Phase } from "../types";
import { arrayListAndLinkedList } from "./arraylist-and-linkedlist";
import { choosingTheRightCollection } from "./choosing-the-right-collection";
import { collectionHierarchy } from "./collection-hierarchy";
import { collectionsUtilitiesAndImmutable } from "./collections-utilities-and-immutable";
import { comparableAndComparator } from "./comparable-and-comparator";
import { hashMapInternals } from "./hashmap-internals";
import { hashSetLinkedHashSetTreeSet } from "./hashset-linkedhashset-treeset";
import { iteratorsFailFastFailSafe } from "./iterators-fail-fast-fail-safe";
import { linkedHashMapAndTreeMap } from "./linkedhashmap-and-treemap";
import { queueDequePriorityQueue } from "./queue-deque-priorityqueue";

// Reading order — phases run in sequence, lessons are numbered straight through them.
export const collectionsPhases: Phase[] = [
  {
    title: "The Collection Hierarchy",
    description: "Iterable, Collection, List, Set, Queue and Map: what each interface promises and how to pick one.",
    lessons: [collectionHierarchy],
  },
  {
    title: "List: ArrayList and LinkedList",
    description: "Dynamic arrays vs linked nodes, how ArrayList grows and shifts on remove, and when LinkedList is actually worth it.",
    lessons: [arrayListAndLinkedList],
  },
  {
    title: "Set: HashSet, LinkedHashSet, TreeSet",
    description: "Uniqueness through equals and hashCode, insertion order, and sorted sets backed by red-black trees.",
    lessons: [hashSetLinkedHashSetTreeSet],
  },
  {
    title: "Map and HashMap Internals",
    description: "Buckets, hashing, collisions, resizing and Java 8 treeification, plus LinkedHashMap (LRU) and TreeMap.",
    lessons: [hashMapInternals, linkedHashMapAndTreeMap],
  },
  {
    title: "Queue, Deque and PriorityQueue",
    description: "FIFO queues, ArrayDeque as a stack and queue, and the binary heap behind PriorityQueue.",
    lessons: [queueDequePriorityQueue],
  },
  {
    title: "Comparable and Comparator",
    description: "Natural order vs custom order, comparator chains with comparing and thenComparing.",
    lessons: [comparableAndComparator],
  },
  {
    title: "Iterators: Fail-Fast and Fail-Safe",
    description: "How modCount catches concurrent modification, removeIf, and iterators that never throw.",
    lessons: [iteratorsFailFastFailSafe],
  },
  {
    title: "Utility Classes and Immutable Collections",
    description: "Collections and Arrays helpers, List.of vs Arrays.asList vs unmodifiable views.",
    lessons: [collectionsUtilitiesAndImmutable],
  },
  {
    title: "Choosing the Right Collection",
    description: "A Big-O cheat sheet and real examples of picking the right structure.",
    lessons: [choosingTheRightCollection],
  },
];
