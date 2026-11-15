import type { Phase } from "../types";
import { asyncTimeoutsAndExecutors } from "./async-timeouts-and-executors";
import { atomicsAndCas } from "./atomics-and-cas";
import { blockingQueues } from "./blocking-queues";
import { completableFutureInDepth } from "./completablefuture-in-depth";
import { concurrentHashMapInPractice } from "./concurrent-hashmap-in-practice";
import { concurrentHashMapInternals } from "./concurrent-hashmap-internals";
import { concurrentQueuesAndSkipLists } from "./concurrent-queues-and-skiplists";
import { copyOnWriteCollections } from "./copy-on-write-collections";
import { countDownLatchAndCyclicBarrier } from "./countdownlatch-and-cyclicbarrier";
import { executorServiceBasics } from "./executor-service-basics";
import { producerConsumer } from "./producer-consumer";
import { reentrantAndReadWriteLocks } from "./reentrant-and-read-write-locks";
import { semaphorePhaserExchanger } from "./semaphore-phaser-exchanger";
import { synchronizedAndMonitors } from "./synchronized-and-monitors";
import { threadLifecycleAndControl } from "./thread-lifecycle-and-control";
import { threadLocalLesson } from "./threadlocal";
import { threadPoolExecutorInternals } from "./thread-pool-executor-internals";
import { threadsAndProcesses } from "./threads-and-processes";
import { virtualThreads } from "./virtual-threads";
import { volatileAndJavaMemoryModel } from "./volatile-and-java-memory-model";

export const multithreadingPhases: Phase[] = [
  {
    title: "Threads Basics",
    description: "Process vs thread, creating threads, Runnable vs Callable, thread states, start vs run, join and daemon threads.",
    lessons: [threadsAndProcesses, threadLifecycleAndControl],
  },
  {
    title: "synchronized, volatile and the Java Memory Model",
    description: "Monitors, visibility vs atomicity, happens-before, and why count++ is not thread-safe.",
    lessons: [synchronizedAndMonitors, volatileAndJavaMemoryModel],
  },
  {
    title: "Locks and Atomics",
    description: "ReentrantLock, ReadWriteLock, StampedLock, AQS underneath, CAS, AtomicInteger and LongAdder.",
    lessons: [reentrantAndReadWriteLocks, atomicsAndCas],
  },
  {
    title: "Executors and Thread Pools",
    description: "ExecutorService, ThreadPoolExecutor parameters, bounded queues, rejection policies and sizing pools.",
    lessons: [executorServiceBasics, threadPoolExecutorInternals],
  },
  {
    title: "ConcurrentHashMap",
    description: "CAS on empty bins, per-bin locking, why null keys are banned, and atomic methods like computeIfAbsent and merge.",
    lessons: [concurrentHashMapInternals, concurrentHashMapInPractice],
  },
  {
    title: "BlockingQueue and Producer-Consumer",
    description: "ArrayBlockingQueue, LinkedBlockingQueue, SynchronousQueue, DelayQueue, backpressure and clean shutdown.",
    lessons: [blockingQueues, producerConsumer],
  },
  {
    title: "Other Concurrent Collections",
    description: "CopyOnWriteArrayList, ConcurrentLinkedQueue, ConcurrentSkipListMap and when each fits.",
    lessons: [copyOnWriteCollections, concurrentQueuesAndSkipLists],
  },
  {
    title: "Coordination Utilities",
    description: "CountDownLatch, CyclicBarrier, Semaphore, Phaser and Exchanger with everyday examples.",
    lessons: [countDownLatchAndCyclicBarrier, semaphorePhaserExchanger],
  },
  {
    title: "Asynchronous Programming",
    description: "Future and CompletableFuture patterns, timeouts and fallbacks, and choosing executors.",
    lessons: [completableFutureInDepth, asyncTimeoutsAndExecutors],
  },
  {
    title: "ThreadLocal and Virtual Threads",
    description: "Per-thread data and its leak in pools, Java 21 virtual threads, pinning and structured concurrency.",
    lessons: [threadLocalLesson, virtualThreads],
  },
  {
    title: "Deadlocks, Race Conditions and Testing",
    description: "Spotting and preventing deadlock, livelock and starvation, thread dumps, and testing concurrent code.",
    lessons: [],
  },
  {
    title: "Concurrency Across Servers",
    description: "Why synchronized fails with many instances, database locks, conditional updates, SKIP LOCKED and idempotency.",
    lessons: [],
  },
];
