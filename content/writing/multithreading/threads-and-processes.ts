import type { Lesson } from "../types";

export const threadsAndProcesses: Lesson = {
  slug: "threads-and-processes",
  date: "2026-11-14",
  title: "Processes, Threads and Creating Threads",
  description:
    "Where concurrency in Java starts, measured on JDK 21 and Linux: a process against a thread (what threads share and what each one keeps to itself), a platform thread as exactly one kernel task (ps -L, /proc/<pid>/task, jcmd Thread.print), the 17 threads a fresh JVM already runs, Thread.start() traced through JVM_StartThread and os::create_thread to pthread_create and clone3 with gdb and strace, every way to create work (extending Thread, Runnable, lambdas, Callable, the Java 21 builders), start() against run(), starting twice, names, priorities that Linux ignores until -XX:ThreadPriorityPolicy=1, uncaught exception handlers, the cost of a thread (85 to 143 microseconds per start and join, about 100 KB resident each, 10 times cheaper than a process), what happens at a pids limit, and a booking service that spawned a thread per request until the acceptor died at 381 threads.",
  tags: ["Multithreading", "Threads", "JVM", "Linux"],
  sections: [
    {
      title: "What Processes and Threads Are",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, JIT Compilation, Profiling and JVM Tuning, closed the Java track inside the execution engine: C1 and C2 compiler threads, GC worker threads, safepoints that stop every thread at once. Threads kept appearing in those measurements as something the JVM had. This track turns them into something the program uses. It starts with the two units an operating system schedules work with, the **process** and the **thread**, and with how a Java program creates and runs threads of its own.",
        },
        {
          type: "paragraph",
          text: "A **process** is a running program with its own address space: its own heap, its own loaded code, its own file descriptors, protected from every other process by the hardware's memory management. A **thread** is a single sequence of execution inside a process: a program counter, a set of CPU registers and a stack. A process starts with one thread and can create more. All threads of a process share its address space, so they can read and write the same objects without copying anything. That sharing is the whole point of threads, and it's also the source of every bug in this track.",
        },
        {
          type: "paragraph",
          text: "In Java, a thread is a `java.lang.Thread` object. On JDK 21 there are two kinds: **platform threads**, each backed one-to-one by an operating system thread, and **virtual threads**, which the JVM multiplexes over a small number of platform threads and which get their own lesson later in the track. This lesson is about platform threads: what they are at the operating system level, the ways to create them, what `start()` really does, and what a thread costs in time and memory, measured rather than assumed.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java was one of the first mainstream languages with threads in the language itself: `Thread`, `Runnable`, `synchronized` and `wait`/`notify` were there in 1.0, at a time when C programs used platform-specific libraries. Early JVMs on Solaris and Linux implemented threads as **green threads**, scheduled by the JVM inside a single OS thread, which meant no use of multiple CPUs. Native threads replaced them, and since the HotSpot era every platform thread has been a real kernel thread. The API has grown in layers since: utilities in Java 5, cleanups and removals afterwards, and builders and virtual threads in Java 21.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`Thread`, `Runnable`, `ThreadGroup`, priorities, `stop`/`suspend`/`resume`", "The API this lesson still uses"],
            ["Java 1.1 to 1.2 (1997 to 1998)", "Green threads on Solaris and Linux; native threads as an option. `ThreadLocal` added, `stop`/`suspend`/`resume` deprecated (1.2)", "Threads that couldn't use more than one CPU"],
            ["Java 1.3 (2000)", "HotSpot, built on native threads, becomes the default VM", "One `Thread`, one kernel thread"],
            ["Linux 2.6 (2003)", "NPTL replaces LinuxThreads in glibc", "Threads become cheap kernel tasks sharing one pid"],
            ["Java 5 (2004)", "`java.util.concurrent`: `Callable`, `ExecutorService`, `ThreadFactory`; `Thread.State`; `UncaughtExceptionHandler`; `getAllStackTraces`", "Most code should use executors, not raw threads"],
            ["Java 11 (2018)", "`Thread.destroy()` and `stop(Throwable)` removed", "The first real removals"],
            ["Java 19 (2022)", "`threadId()` replaces `getId()`, `join(Duration)`, `sleep(Duration)`, `ExecutorService` becomes `AutoCloseable`", "Used throughout these lessons"],
            ["Java 20 (2023)", "By this release, `Thread.stop()`, `suspend()` and `resume()` all throw `UnsupportedOperationException`", "Covered in the next lesson"],
            ["Java 21 (2023)", "Virtual threads final (JEP 444); `Thread.Builder` (`Thread.ofPlatform()`, `Thread.ofVirtual()`)", "The JDK used in this lesson"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Think of the dispatch office of a ride-hailing company in Kolkata.",
        },
        {
          type: "list",
          items: [
            "**A process is the whole office**: the building, its filing cabinets, its phone lines. A second office in another building is a second process: it has its own cabinets, and the only way to share a file with it is to send a copy.",
            "**A thread is one dispatcher at a desk.** Asha handles SALT-LAKE, Ravi handles NEW-TOWN. Each has a personal notepad (the stack) with what they're doing right now, and a place in their current call (the program counter).",
            "**The shared filing cabinet is the heap.** Both dispatchers can open the same driver file and change it. That's why the office works fast (nobody photocopies anything), and why two dispatchers can assign the same driver to two trips if they don't coordinate.",
            "**Hiring a dispatcher is creating a thread**: a desk, a phone, an onboarding. Cheaper than opening a new office, but not free. Hiring one per incoming phone call, and letting them go after the call, is the production bug at the end of this lesson.",
            "**The office already has staff before any dispatcher arrives**: a cleaner (the garbage collector), a trainer who turns frequent procedures into shortcuts (the JIT compiler), a receptionist who takes signals from outside (the Signal Dispatcher). A fresh JVM runs 17 threads before your first line of code.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: dispatchers who read the same file at the same moment see the same thing. Threads don't necessarily: each CPU core has caches, and the compiler and CPU reorder memory operations, so one thread can see a stale or half-updated value of something another thread wrote. The analogy covers sharing; the visibility rules are the subject of the Java Memory Model lesson.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/threads-and-processes-shared-and-private.svg",
          alt: "Left: a JVM process box with one pid and one address space. Inside it, a blue SHARED area containing the heap (every object, array and static field value), Metaspace and code cache (classes, bytecode, JIT-compiled code) and OS resources (file descriptors, sockets, signal handlers, current directory). Below it, a PRIVATE area with one orange box per thread, main and dispatcher-1, each listing a Java stack of frames and locals (1 MB reserved, 16 KB guard), the program counter and CPU registers, a ThreadLocal map and TLAB, and a kernel TID; a grey box lists the 16 other threads the JVM runs itself, such as GC Thread#0, G1 Conc#0, the C2 and C1 compiler threads, the VM Thread, Reference Handler, Finalizer, Signal Dispatcher and Common-Cleaner. Right: the path of t.start() as a vertical chain: Thread.start() (checks the thread is NEW, else throws), start0() calling JVM_StartThread, os::create_thread (waits for the child to initialise), pthread_create (maps a 1 MB stack), clone3 with CLONE_VM and CLONE_THREAD, and a new kernel task that calls run(). Bottom: measured about 100 KB resident per idle thread, because the 80 KB shadow zone is touched at start, and 85 to 143 microseconds per start plus join; two threads doing counter++ on one field lost up to half the increments.",
          caption: "Threads share everything in the process except their stacks, registers and thread-local state, and start() goes all the way down to a kernel task.",
        },
        {
          type: "heading",
          text: "Process against thread",
        },
        {
          type: "table",
          headers: ["Property", "Process", "Thread (platform)"],
          rows: [
            ["Address space", "Its own; isolated by the MMU", "Shares the process's"],
            ["Heap objects, static fields", "Not visible to other processes", "Visible to every thread in the JVM"],
            ["Stack", "One per thread inside it", "Its own, 1 MB reserved by default on Linux x64"],
            ["Identity on Linux", "pid (the thread group id)", "TID, a kernel task in the same thread group"],
            ["Creation on Linux", "`fork`/`posix_spawn` + `exec`", "`pthread_create` → `clone3(CLONE_VM | CLONE_THREAD ...)`"],
            ["Measured creation cost here", "About 1,000 µs (`ProcessBuilder` + `/bin/true`)", "85 to 143 µs (start + join)"],
            ["Communication", "Pipes, sockets, files, shared memory segments", "Ordinary fields and objects, plus synchronization"],
            ["A crash", "Kills that process only", "An uncaught exception ends the thread; a JVM crash kills every thread"],
          ],
        },
        {
          type: "heading",
          text: "What each thread has to itself",
        },
        {
          type: "table",
          headers: ["Per-thread state", "Where it lives", "Notes"],
          rows: [
            ["Java stack: frames, locals, operand stacks", "Native memory, mapped per thread", "`-Xss` / `ThreadStackSize` (1024 KB); `StackOverflowError` when full"],
            ["Program counter, registers", "The CPU while running, the kernel while switched out", "Saved and restored on every context switch"],
            ["`ThreadLocal` values", "A `ThreadLocalMap` referenced from the `Thread` object (on the heap)", "Private by convention: only reachable through the owning thread"],
            ["TLAB (thread-local allocation buffer)", "A chunk of eden owned by the thread", "Why `new` is a pointer bump (Memory Allocation lesson)"],
            ["Interrupt flag, state, name, priority, daemon flag", "Fields of `Thread` and its `FieldHolder`", "Covered here and in the next lesson"],
            ["Kernel TID, scheduling state, signal mask", "The kernel's `task_struct`", "What `ps -L` and `top -H` show"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "A fresh JVM already runs 17 threads",
        },
        {
          type: "paragraph",
          text: "Before creating any thread, I wanted to see what a JVM runs on its own. `Thread.getAllStackTraces()` lists the Java-visible threads:",
        },
        {
          type: "code",
          language: "java",
          title: "FreshJvm.java",
          code: `import java.util.Comparator;
import java.util.Map;

public class FreshJvm {
    public static void main(String[] args) throws Exception {
        long pid = ProcessHandle.current().pid();
        System.out.println("pid " + pid + ", Java threads visible to Thread.getAllStackTraces():");
        Thread.getAllStackTraces().keySet().stream()
                .sorted(Comparator.comparing(Thread::getName))
                .forEach(t -> System.out.printf("  %-22s daemon=%-5b prio=%2d state=%s%n",
                        t.getName(), t.isDaemon(), t.getPriority(), t.getState()));
        Thread.sleep(Long.parseLong(args.length > 0 ? args[0] : "0"));   // time to run jcmd / ps
    }
}`,
        },
        {
          type: "output",
          text: `pid 124493, Java threads visible to Thread.getAllStackTraces():
  Common-Cleaner         daemon=true  prio= 8 state=TIMED_WAITING
  Finalizer              daemon=true  prio= 8 state=WAITING
  Notification Thread    daemon=true  prio= 9 state=RUNNABLE
  Reference Handler      daemon=true  prio=10 state=RUNNABLE
  Signal Dispatcher      daemon=true  prio= 9 state=RUNNABLE
  main                   daemon=false prio= 5 state=RUNNABLE`,
        },
        {
          type: "paragraph",
          text: "Six Java threads. The operating system sees more. On Linux, every thread is a task under `/proc/<pid>/task`, and `ps -L` lists them with their kernel TIDs (the LWP column) and the names the JVM gave them with `pthread_setname_np`, truncated to 15 characters:",
        },
        {
          type: "code",
          language: "bash",
          code: `java FreshJvm 5000 & PID=$!; sleep 1.5
ls /proc/$PID/task | wc -l
ps -L -o pid,lwp,nlwp,comm -p $PID`,
        },
        {
          type: "output",
          text: `18
    PID     LWP NLWP COMMAND
 125302  125302   18 java
 125302  125304   18 java
 125302  125305   18 GC Thread#0
 125302  125306   18 G1 Main Marker
 125302  125307   18 G1 Conc#0
 125302  125308   18 G1 Refine#0
 125302  125309   18 G1 Service
 125302  125310   18 VM Periodic Tas
 125302  125311   18 VM Thread
 125302  125312   18 Reference Handl
 125302  125313   18 Finalizer
 125302  125314   18 Signal Dispatch
 125302  125315   18 Service Thread
 125302  125316   18 Monitor Deflati
 125302  125317   18 C2 CompilerThre
 125302  125318   18 C1 CompilerThre
 125302  125319   18 Notification Th
 125302  125320   18 Common-Cleaner`,
        },
        {
          type: "list",
          items: [
            "**18 kernel tasks, one pid.** The first task has TID = pid (125302): that's the `java` launcher's primordial thread. It doesn't run `main`; it creates a new thread for the JVM (TID 125304, also named `java`) and waits for it. Java's `main` thread is TID 125304.",
            "**Eleven of them are invisible to Java.** `GC Thread#0`, `G1 Main Marker`, `G1 Conc#0`, `G1 Refine#0` and `G1 Service` are the garbage collector; `VM Thread` executes safepoint operations (the stop-the-world pauses of the GC lesson); `C2 CompilerThread0` and `C1 CompilerThread0` are the JIT; `VM Periodic Task Thread`, `Service Thread` and `Monitor Deflation Thread` do housekeeping. They are JVM-internal threads, with no `java.lang.Thread` object.",
            "**Only one GC worker so far.** `ParallelGCThreads` is 8 on this 8-core machine, but with `UseDynamicNumberOfGCThreads` (on by default) G1 starts workers lazily, when a collection needs them.",
            "**`Reference Handler` and `Finalizer`** process cleared references and the deprecated `finalize()` queue; **`Common-Cleaner`** runs `Cleaner` actions; **`Signal Dispatcher`** turns OS signals (SIGQUIT, SIGTERM) into Java actions such as a thread dump or shutdown hooks; **`Notification Thread`** delivers JMX notifications.",
          ],
        },
        {
          type: "paragraph",
          text: "`jcmd <pid> Thread.print` asks the JVM itself for a thread dump. These are the header lines, one per thread:",
        },
        {
          type: "code",
          language: "bash",
          code: `jcmd $PID Thread.print | grep '^"'`,
        },
        {
          type: "output",
          text: `"main" #1 [125304] prio=5 os_prio=0 cpu=63.49ms elapsed=1.88s tid=0x000079ea98019950 nid=125304 waiting on condition  [0x000079ea9c5fe000]
"Reference Handler" #9 [125312] daemon prio=10 os_prio=0 cpu=0.19ms elapsed=1.86s tid=0x000079ea98153ff0 nid=125312 waiting on condition  [0x000079ea7c899000]
"Finalizer" #10 [125313] daemon prio=8 os_prio=0 cpu=0.18ms elapsed=1.86s tid=0x000079ea981554f0 nid=125313 in Object.wait()  [0x000079ea7c799000]
"Signal Dispatcher" #11 [125314] daemon prio=9 os_prio=0 cpu=0.31ms elapsed=1.86s tid=0x000079ea98156ca0 nid=125314 waiting on condition  [0x0000000000000000]
"Service Thread" #12 [125315] daemon prio=9 os_prio=0 cpu=0.16ms elapsed=1.86s tid=0x000079ea981582f0 nid=125315 runnable  [0x0000000000000000]
"Monitor Deflation Thread" #13 [125316] daemon prio=9 os_prio=0 cpu=0.36ms elapsed=1.86s tid=0x000079ea981598a0 nid=125316 runnable  [0x0000000000000000]
"C2 CompilerThread0" #14 [125317] daemon prio=9 os_prio=0 cpu=25.86ms elapsed=1.86s tid=0x000079ea9815b3f0 nid=125317 waiting on condition  [0x0000000000000000]
"C1 CompilerThread0" #17 [125318] daemon prio=9 os_prio=0 cpu=29.62ms elapsed=1.86s tid=0x000079ea9815cac0 nid=125318 waiting on condition  [0x0000000000000000]
"Notification Thread" #18 [125319] daemon prio=9 os_prio=0 cpu=0.10ms elapsed=1.86s tid=0x000079ea98168970 nid=125319 runnable  [0x0000000000000000]
"Common-Cleaner" #19 [125320] daemon prio=8 os_prio=0 cpu=0.32ms elapsed=1.86s tid=0x000079ea9816ba80 nid=125320 waiting on condition  [0x000079ea6defe000]
"Attach Listener" #20 [125373] daemon prio=9 os_prio=0 cpu=0.41ms elapsed=0.11s tid=0x000079ea04000fe0 nid=125373 waiting on condition  [0x0000000000000000]
"VM Thread" os_prio=0 cpu=0.51ms elapsed=1.86s tid=0x000079ea98140df0 nid=125311 runnable
"VM Periodic Task Thread" os_prio=0 cpu=1.82ms elapsed=1.87s tid=0x000079ea9812f790 nid=125310 waiting on condition
"G1 Service" os_prio=0 cpu=0.19ms elapsed=1.88s tid=0x000079ea98114cd0 nid=125309 runnable
"G1 Refine#0" os_prio=0 cpu=0.12ms elapsed=1.88s tid=0x000079ea98113d00 nid=125308 runnable
"G1 Conc#0" os_prio=0 cpu=0.09ms elapsed=1.88s tid=0x000079ea98082680 nid=125307 runnable
"G1 Main Marker" os_prio=0 cpu=0.11ms elapsed=1.88s tid=0x000079ea980816d0 nid=125306 runnable
"GC Thread#0" os_prio=0 cpu=0.08ms elapsed=1.88s tid=0x000079ea98070d60 nid=125305 runnable`,
        },
        {
          type: "table",
          headers: ["Field", "Example", "Meaning"],
          rows: [
            ["Name", "`\"main\"`", "`Thread.getName()`, or the JVM's own name for internal threads"],
            ["`#1`", "`#1`", "The Java thread id (`threadId()`); internal threads have none"],
            ["`[125304]`", "`[125304]`", "The kernel TID, the LWP in `ps -L` (JDK 17 didn't print it)"],
            ["`daemon`", "present or absent", "Daemon status (next lesson)"],
            ["`prio`, `os_prio`", "`prio=5 os_prio=0`", "Java priority, and the OS priority it mapped to (0: nothing changed)"],
            ["`cpu`, `elapsed`", "`cpu=63.49ms elapsed=1.88s`", "CPU time consumed and wall time since start"],
            ["`tid`", "`0x000079ea98019950`", "Address of the JVM's native `JavaThread` structure, not an OS id"],
            ["`nid`", "`nid=125304`", "Kernel TID again. JDK 21 prints it in decimal; JDK 17 printed `nid=0x10adda` in hex"],
            ["State text", "`waiting on condition`", "What the thread is doing; the next lesson maps these to `Thread.State`"],
          ],
        },
        {
          type: "paragraph",
          text: "`Attach Listener` wasn't there before: `jcmd` connects through the attach mechanism, and the JVM starts that thread on demand to serve it. That's why `ps` counted 18 tasks (launcher plus 17) and the dump lists 18 threads (17 plus the new `Attach Listener`, without the launcher, which isn't attached to the JVM).",
        },
        {
          type: "heading",
          text: "Thread.start() in bytecode",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p 'java.lang.Thread$FieldHolder'
javap -c -p java.lang.Thread   # the start() and run() methods`,
        },
        {
          type: "output",
          text: `class java.lang.Thread$FieldHolder {
  final java.lang.ThreadGroup group;
  final java.lang.Runnable task;
  final long stackSize;
  volatile int priority;
  volatile boolean daemon;
  volatile int threadStatus;
  java.lang.Thread$FieldHolder(java.lang.ThreadGroup, java.lang.Runnable, long, int, boolean);
}
  public void start();
    Code:
       0: aload_0
       1: dup
       2: astore_1
       3: monitorenter
       4: aload_0
       5: getfield      #157                // Field holder:Ljava/lang/Thread$FieldHolder;
       8: getfield      #328                // Field java/lang/Thread$FieldHolder.threadStatus:I
      11: ifeq          22
      14: new           #332                // class java/lang/IllegalThreadStateException
      17: dup
      18: invokespecial #334                // Method java/lang/IllegalThreadStateException."<init>":()V
      21: athrow
      22: aload_0
      23: invokevirtual #335                // Method start0:()V
      26: aload_1
      27: monitorexit
...
  public void run();
    Code:
       0: aload_0
       1: getfield      #157                // Field holder:Ljava/lang/Thread$FieldHolder;
       4: getfield      #356                // Field java/lang/Thread$FieldHolder.task:Ljava/lang/Runnable;
       7: astore_1
       8: aload_1
       9: ifnull        22
      12: invokestatic  #360                // Method scopedValueBindings:()Ljava/lang/Object;
      15: astore_2
      16: aload_0
      17: aload_2
      18: aload_1
      19: invokevirtual #361                // Method runWith:(Ljava/lang/Object;Ljava/lang/Runnable;)V
      22: return`,
        },
        {
          type: "list",
          items: [
            "**`start()` is `synchronized (this)`** (the `monitorenter`/`monitorexit` pair), checks `threadStatus`, and throws `IllegalThreadStateException` unless it's 0, which means NEW. Then it calls the native `start0()`. That's the whole Java side: no thread pool, no queue.",
            "**`run()` is an ordinary method.** It reads the `Runnable` task stored in the holder and calls it (through `runWith`, which sets up scoped-value bindings, a Java 21 preview feature). If you subclass `Thread` and override `run()`, the task is `null` and your override runs instead. Calling `run()` yourself just executes it on the calling thread, as the start() vs run() section shows.",
            "**Platform-thread fields live in a `FieldHolder`**: the group, the task, the requested stack size, priority, daemon flag and `threadStatus`. JDK 21 split them out so that virtual threads, which don't need most of them, stay small.",
          ],
        },
        {
          type: "heading",
          text: "From start0() to a kernel task, with gdb and strace",
        },
        {
          type: "paragraph",
          text: "`start0` is bound to `JVM_StartThread` in `libjvm.so`. I put a breakpoint on it in gdb, skipped the three calls the JDK makes for its own threads (Reference Handler, Finalizer and Common-Cleaner are started from Java code), and broke on `pthread_create` inside the fourth call, which is my `ride-matcher` thread from `OneThread.java`:",
        },
        {
          type: "code",
          language: "java",
          title: "OneThread.java",
          code: `public class OneThread {
    public static void main(String[] args) throws Exception {
        Thread t = new Thread(() -> System.out.println("hello from " + Thread.currentThread().getName()), "ride-matcher");
        System.out.println("before start: " + t.getState());
        t.start();
        t.join();
        System.out.println("after join:   " + t.getState());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `gdb -q -batch -ex 'handle SIGSEGV nostop noprint pass' -ex 'set breakpoint pending on' \\
    -ex 'break JVM_StartThread' -ex 'ignore 1 3' -ex run -ex delete \\
    -ex 'break pthread_create' -ex continue -ex 'bt 3' --args java OneThread`,
        },
        {
          type: "output",
          text: `before start: NEW
Thread 2 "java" hit Breakpoint 1, 0x00007ffff7004ca8 in JVM_StartThread () from /usr/lib/jvm/java-21-openjdk-amd64/lib/server/libjvm.so
Thread 2 "java" hit Breakpoint 2, __pthread_create_2_1 (newthread=0x7ffff65fe668, attr=0x7ffff65fe670, start_routine=0x7ffff7311180 <thread_native_entry(Thread*)>, arg=0x7ffff017c930) at ./nptl/pthread_create.c:626
#0  __pthread_create_2_1 (newthread=0x7ffff65fe668, attr=0x7ffff65fe670, start_routine=0x7ffff7311180 <thread_native_entry(Thread*)>, arg=0x7ffff017c930) at ./nptl/pthread_create.c:626
#1  0x00007ffff73120ef in os::create_thread(Thread*, os::ThreadType, unsigned long) () from /usr/lib/jvm/java-21-openjdk-amd64/lib/server/libjvm.so
#2  0x00007ffff7004ef7 in JVM_StartThread () from /usr/lib/jvm/java-21-openjdk-amd64/lib/server/libjvm.so`,
        },
        {
          type: "paragraph",
          text: "The call chain is `Thread.start()` → `start0()` → `JVM_StartThread` → `os::create_thread` → glibc's `pthread_create`, with `thread_native_entry` as the function the new thread will run first. (Note `Thread 2 \"java\"`: gdb confirms the main Java thread is the second task, as `ps` showed.) `JVM_StartThread` creates the native `JavaThread` structure; `os::create_thread` sets the stack size, calls `pthread_create`, and waits until the child has initialised itself before returning, so `start()` doesn't return until the new thread exists. Then `strace` shows what glibc asks of the kernel:",
        },
        {
          type: "code",
          language: "bash",
          code: "strace -f -qq -e trace=clone3,mmap,mprotect -o st.txt java OneThread",
        },
        {
          type: "output",
          text: `126892 mmap(NULL, 1048576, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS|MAP_STACK, -1, 0) = 0x723bdc100000
126892 clone3({flags=CLONE_VM|CLONE_FS|CLONE_FILES|CLONE_SIGHAND|CLONE_THREAD|CLONE_SYSVSEM|CLONE_SETTLS|CLONE_PARENT_SETTID|CLONE_CHILD_CLEARTID, child_tid=0x723bdc1ff990, parent_tid=0x723bdc1ff990, exit_signal=0, stack=0x723bdc100000, stack_size=0xfef80, tls=0x723bdc1ff6c0} => {parent_tid=[126909]}, 88) = 126909
126909 mmap(NULL, 134217728, PROT_NONE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x723b4c000000
126909 mprotect(0x723b4c000000, 135168, PROT_READ|PROT_WRITE) = 0
...
126909 mmap(0x723bdc100000, 16384, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_ANONYMOUS, -1, 0) = 0x723bdc100000
126909 mprotect(0x723bdc100000, 16384, PROT_NONE) = 0`,
        },
        {
          type: "list",
          items: [
            "**`mmap(NULL, 1048576, ... MAP_STACK)`**: glibc maps the new thread's 1 MB stack. It's only address space at this point; pages become resident when touched.",
            "**`clone3` with `CLONE_VM | CLONE_FILES | CLONE_SIGHAND | CLONE_THREAD`**: the kernel creates a new task that shares the address space, the file descriptor table and signal handlers, in the same thread group (so it has the same pid). Without `CLONE_VM` and `CLONE_THREAD` this same system call creates a process. The return value 126909 is the new TID.",
            "**The child's first act (TID 126909)** is to reserve a 128 MB `malloc` arena (`PROT_NONE`) and commit 132 KB of it: glibc gives threads their own arenas so native `malloc` calls don't contend. That 128 MB is virtual, which is part of why `VIRT` in `top` looks enormous for a JVM.",
            "**The last `mprotect(..., 16384, PROT_NONE)`** is HotSpot installing its **guard pages** at the end of the stack: `StackRedPages` (1), `StackYellowPages` (2) and `StackReservedPages` (1), 4 pages of 4 KB. Touching them is how the JVM detects a stack overflow and throws `StackOverflowError` instead of crashing.",
          ],
        },
        {
          type: "paragraph",
          text: "`-Xlog:os+thread` shows the same events from inside the JVM, including the stack size it asked for:",
        },
        {
          type: "code",
          language: "bash",
          code: "java -Xlog:os+thread OneThread",
        },
        {
          type: "output",
          text: `...
before start: NEW
[0.034s][info][os,thread] Thread "Unknown thread" started (pthread id: 130003669018304, attributes: stacksize: 1024k, guardsize: 0k, detached).
[0.034s][info][os,thread] Thread is alive (tid: 126697, pthread id: 130003669018304).
hello from ride-matcher
[0.034s][info][os,thread] JavaThread exiting (tid: 126697).
[0.034s][info][os,thread] Thread finished (tid: 126697, pthread id: 130003669018304).
after join:   TERMINATED`,
        },
        {
          type: "paragraph",
          text: "`guardsize: 0k` because HotSpot turns off glibc's own guard page and installs its own zones. `detached` means nobody calls `pthread_join` on it: `Thread.join()` is implemented in Java on top of the thread's state, not with `pthread_join`. The name is \"Unknown thread\" because the native name is set by the new thread itself, a moment after this log line.",
        },
        {
          type: "heading",
          text: "Stack size and where it comes from",
        },
        {
          type: "code",
          language: "bash",
          code: "java -XX:+PrintFlagsFinal -version | grep -E 'ThreadStackSize|StackShadowPages|Stack(Red|Yellow|Reserved)Pages'",
        },
        {
          type: "output",
          text: `     intx CompilerThreadStackSize                  = 1024                                   {pd product} {default}
     intx StackRedPages                            = 1                                      {pd product} {default}
     intx StackReservedPages                       = 1                                      {pd product} {default}
     intx StackShadowPages                         = 20                                     {pd product} {default}
     intx StackYellowPages                         = 2                                      {pd product} {default}
     intx ThreadStackSize                          = 1024                                   {pd product} {default}
     intx VMThreadStackSize                        = 1024                                   {pd product} {default}`,
        },
        {
          type: "list",
          items: [
            "**`ThreadStackSize` = 1024 KB** for Java threads; `-Xss512k` is shorthand for `-XX:ThreadStackSize=512`. `CompilerThreadStackSize` and `VMThreadStackSize` size the JVM's internal threads. `pd product` means the default is platform-dependent.",
            "**A per-thread size** can be requested with the `Thread(group, task, name, stackSize)` constructor or `Thread.ofPlatform().stackSize(...)`; the JDK documents it as a hint the platform may ignore.",
            "**`StackShadowPages` = 20** (80 KB) is the shadow zone: room the JVM keeps free below the current frame so native code and the JVM runtime can run without overflowing. The thread touches these pages when it starts, which turned out to matter for the memory measurement below.",
          ],
        },
        {
          type: "heading",
          text: "Thread stacks in Native Memory Tracking",
        },
        {
          type: "code",
          language: "java",
          title: "ParkedThreads.java",
          code: `import java.util.concurrent.CountDownLatch;

public class ParkedThreads {
    public static void main(String[] args) throws Exception {
        int n = Integer.parseInt(args[0]);
        CountDownLatch release = new CountDownLatch(1);
        for (int i = 0; i < n; i++) {
            Thread.ofPlatform().name("idle-", i).daemon(true).start(() -> {
                try { release.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            });
        }
        System.out.println("pid " + ProcessHandle.current().pid() + " started " + n + " idle threads");
        Thread.sleep(Long.parseLong(args[1]));                      // time for jcmd and ps
        release.countDown();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:NativeMemoryTracking=summary ParkedThreads 500 4000 &
jcmd <pid> VM.native_memory summary scale=KB | grep -A3 -E '^-\\s+Thread'
grep -E 'VmRSS|Threads' /proc/<pid>/status`,
        },
        {
          type: "table",
          headers: ["Run", "NMT threads", "Stack reserved", "Stack committed", "VmRSS"],
          rows: [
            ["0 extra threads", "18", "18,432 KB", "780 KB", "44,428 KB"],
            ["0 extra, `-Xss256k`", "18", "11,520 KB", "780 KB", "44,732 KB"],
            ["500 extra threads", "519", "531,456 KB", "52,800 KB", "95,304 KB"],
            ["500 extra, `-Xss256k`", "519", "140,544 KB", "52,808 KB", "95,368 KB"],
          ],
        },
        {
          type: "list",
          items: [
            "**Reserved grows by 1 MB per thread, committed by about 104 KB.** 500 threads reserved 513 MB of address space but committed 52 MB, and resident memory grew by 50.9 MB: **about 100 KB per idle thread**. `-Xss256k` cut the reservation to a quarter and changed the resident cost not at all.",
            "**Why 100 KB for a thread that does nothing?** I expected a few KB. The answer is the shadow zone: a starting thread touches its 20 shadow pages (80 KB) so they're mapped before they're needed. With `-XX:StackShadowPages=40` the same 500 threads took 129,020 KB resident instead of 92,652 KB: 73 KB more per thread, almost exactly 20 more pages.",
            "**The rest is per-thread native bookkeeping**: NMT counted 1,129 KB of `malloc` for the 519 `JavaThread` structures, plus each thread's TLAB in the heap once it allocates.",
            "**So `-Xss` controls the ceiling, not the floor.** It limits recursion depth (in my test a 256 KB stack overflowed at a depth of about 2,000 frames, 1 MB at about 25,000) and address space, but an idle thread costs roughly the same resident memory at any `-Xss`.",
          ],
        },
      ],
    },
    {
      title: "Processes and Threads Side by Side",
      blocks: [
        {
          type: "paragraph",
          text: "The difference that matters day to day is sharing. Two threads in one JVM see the same heap; locals and `ThreadLocal` values stay private:",
        },
        {
          type: "code",
          language: "java",
          title: "SharedAndPrivate.java",
          code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SharedAndPrivate {
    static final List<String> ASSIGNED = Collections.synchronizedList(new ArrayList<>());   // heap: shared
    static final ThreadLocal<String> ZONE = new ThreadLocal<>();                           // one value per thread
    static int unsafeCounter = 0;                                                         // heap: shared, unprotected

    static void dispatch(String zone) {
        ZONE.set(zone);
        int local = 0;                                    // on this thread's stack
        for (int i = 0; i < 100_000; i++) {
            local++;
            unsafeCounter++;                               // read-modify-write on shared memory
        }
        ASSIGNED.add(Thread.currentThread().getName() + " zone=" + ZONE.get() + " local=" + local);
    }

    public static void main(String[] args) throws Exception {
        Thread a = new Thread(() -> dispatch("SALT-LAKE"), "dispatcher-1");
        Thread b = new Thread(() -> dispatch("NEW-TOWN"), "dispatcher-2");
        a.start(); b.start();
        a.join(); b.join();
        ASSIGNED.forEach(System.out::println);
        System.out.println("main sees ZONE = " + ZONE.get());
        System.out.println("unsafeCounter = " + unsafeCounter + " (expected 200000)");
    }
}`,
        },
        {
          type: "output",
          text: `dispatcher-1 zone=SALT-LAKE local=100000
dispatcher-2 zone=NEW-TOWN local=100000
main sees ZONE = null
unsafeCounter = 164214 (expected 200000)`,
        },
        {
          type: "list",
          items: [
            "**Each thread's `local` reached exactly 100,000.** Locals live in the thread's own stack frame; nobody else can touch them.",
            "**`ZONE` held a different value in each thread**, and `main` sees `null`: a `ThreadLocal` is one variable with a separate value per thread (the ThreadLocal lesson covers how, and how it leaks in pools).",
            "**`unsafeCounter` lost increments.** `unsafeCounter++` is a read, an add and a write; when both threads read the same value, one write overwrites the other. In 26 runs I got 200,000 only 7 times; the rest ranged from 98,526 to 199,911. This is a **race condition**, and the synchronized lesson is about fixing it.",
            "**The `ASSIGNED` list is shared too**, which is why it's wrapped in `Collections.synchronizedList`: two threads calling `add` on a plain `ArrayList` can lose elements or corrupt its size.",
          ],
        },
        {
          type: "paragraph",
          text: "A child process gets none of this sharing, and costs more to create. I compared starting `/bin/true` as a process against starting and joining a thread:",
        },
        {
          type: "code",
          language: "java",
          title: "ProcessVsThread.java",
          code: `public class ProcessVsThread {
    static volatile int sharedFare = 0;

    public static void main(String[] args) throws Exception {
        int n = 200;
        for (int round = 0; round < 3; round++) {
            long t0 = System.nanoTime();
            for (int i = 0; i < n; i++) {
                Process p = new ProcessBuilder("/bin/true").start();       // fork + exec a new process
                p.waitFor();
            }
            long processUs = (System.nanoTime() - t0) / 1_000 / n;

            t0 = System.nanoTime();
            for (int i = 0; i < n; i++) {
                Thread t = new Thread(() -> sharedFare = 14_500);          // same address space
                t.start();
                t.join();
            }
            long threadUs = (System.nanoTime() - t0) / 1_000 / n;
            System.out.printf("round %d: process %,6d us each, thread %,4d us each (%.0fx)%n",
                    round, processUs, threadUs, (double) processUs / threadUs);
        }
        System.out.println("a thread wrote sharedFare = " + sharedFare + "; a child process could not have");
    }
}`,
        },
        {
          type: "output",
          text: `round 0: process  1,112 us each, thread  111 us each (10x)
round 1: process  1,017 us each, thread  119 us each (9x)
round 2: process  1,097 us each, thread   88 us each (12x)
a thread wrote sharedFare = 14500; a child process could not have`,
        },
        {
          type: "paragraph",
          text: "Across three runs, a process cost 965 to 1,112 µs and a thread 84 to 119 µs: **about 10 times cheaper**. On Linux the JDK launches processes with `posix_spawn` through a small `jspawnhelper` executable, which then `exec`s the target, so the process number includes loading a program twice. Threads skip all of that: no new address space, no new page tables, no program to load. Processes still win where isolation matters (a crash or a memory leak in one can't take down the other), which is why browsers and databases use them.",
        },
      ],
    },
    {
      title: "Ways to Create a Thread",
      blocks: [
        {
          type: "paragraph",
          text: "There's only one way to get a new platform thread: construct a `Thread` and call `start()`. What varies is how the work is handed to it.",
        },
        {
          type: "code",
          language: "java",
          title: "CreatingThreads.java",
          code: `import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadFactory;

public class CreatingThreads {
    // 1. Subclass Thread and override run()
    static class FareAuditThread extends Thread {
        FareAuditThread() { super("fare-audit"); }
        @Override public void run() { report("1. extends Thread"); }
    }

    // 2. Implement Runnable and hand it to a Thread
    static class SurgeRefresher implements Runnable {
        @Override public void run() { report("2. Runnable class"); }
    }

    static void report(String how) {
        Thread t = Thread.currentThread();
        System.out.printf("%-22s on %-20s virtual=%b daemon=%b%n", how, t.getName(), t.isVirtual(), t.isDaemon());
    }

    public static void main(String[] args) throws Exception {
        Thread t1 = new FareAuditThread();
        Thread t2 = new Thread(new SurgeRefresher(), "surge-refresher");
        Thread t3 = new Thread(() -> report("3. lambda"), "eta-lambda");
        t1.start(); t1.join();
        t2.start(); t2.join();
        t3.start(); t3.join();

        // 4. Callable: returns a value and may throw; needs an executor (or a FutureTask)
        Callable<Long> fareFor = () -> { report("4. Callable"); return 14_500L; };
        try (ExecutorService pool = Executors.newSingleThreadExecutor()) {      // AutoCloseable since 19
            Future<Long> fare = pool.submit(fareFor);
            System.out.println("   Callable returned " + fare.get() + " paise");
        }

        // 5. Java 21 builders: platform threads with names, daemon flag, stack size...
        Thread t5 = Thread.ofPlatform().name("dispatch-", 1).daemon(false).start(() -> report("5. ofPlatform()"));
        t5.join();
        ThreadFactory factory = Thread.ofPlatform().name("matcher-", 0).factory();
        Thread a = factory.newThread(() -> report("5. builder factory"));
        Thread b = factory.newThread(() -> report("5. builder factory"));
        a.start(); a.join(); b.start(); b.join();

        // ...and virtual threads (their own lesson later in the track)
        Thread v = Thread.ofVirtual().name("virtual-eta").start(() -> report("6. ofVirtual()"));
        v.join();
    }
}`,
        },
        {
          type: "output",
          text: `1. extends Thread      on fare-audit           virtual=false daemon=false
2. Runnable class      on surge-refresher      virtual=false daemon=false
3. lambda              on eta-lambda           virtual=false daemon=false
4. Callable            on pool-1-thread-1      virtual=false daemon=false
   Callable returned 14500 paise
5. ofPlatform()        on dispatch-1           virtual=false daemon=false
5. builder factory     on matcher-0            virtual=false daemon=false
5. builder factory     on matcher-1            virtual=false daemon=false
6. ofVirtual()         on virtual-eta          virtual=true daemon=true`,
        },
        {
          type: "table",
          headers: ["Way", "Returns a value?", "Checked exceptions?", "When it fits"],
          rows: [
            ["Subclass `Thread`, override `run()`", "No", "No", "Rarely: it mixes the task with the mechanism, and uses up your one superclass"],
            ["`new Thread(Runnable)`", "No", "No", "Long-lived background loops you manage yourself"],
            ["`new Thread(() -> ...)`", "No", "No", "The same, shorter; the usual form today"],
            ["`Callable<V>` + `ExecutorService`", "Yes, through a `Future<V>`", "Yes, wrapped in `ExecutionException`", "Most real work: covered in the ExecutorService lesson"],
            ["`Thread.ofPlatform()...start(task)`", "No", "No", "Named threads with options in one expression (Java 21)"],
            ["`Thread.ofPlatform()...factory()`", "No", "No", "A `ThreadFactory` for executors, with numbered names"],
            ["`Thread.ofVirtual()` / `startVirtualThread`", "No", "No", "Many blocking tasks: the virtual threads lesson"],
          ],
        },
        {
          type: "list",
          items: [
            "**The `Runnable` is the work, the `Thread` is the worker.** Keeping them separate (ways 2 and 3) lets the same task run on a raw thread today and in a pool tomorrow. Extending `Thread` ties them together.",
            "**`Callable` can't be passed to `new Thread`.** A thread has nowhere to put a return value or a checked exception; an executor wraps the `Callable` in a `FutureTask`, which is a `Runnable` that stores the result. `pool-1-thread-1` is the default name `Executors` gives its threads.",
            "**The builder's `name(\"matcher-\", 0)`** numbers threads from the factory: `matcher-0`, `matcher-1`. That one call replaces the custom `ThreadFactory` class that every codebase used to have.",
            "**Virtual threads are always daemon threads** and unnamed unless you name them. Everything else in this lesson is about platform threads.",
          ],
        },
      ],
    },
    {
      title: "start() Against run()",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "StartVsRun.java",
          code: `public class StartVsRun {
    static void slowQuote(String label) {
        String name = Thread.currentThread().getName();
        try {
            Thread.sleep(300);                                       // pretend to call the pricing service
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        System.out.printf("%-8s ran on %-12s at %4d ms%n", label, name, (System.nanoTime() - T0) / 1_000_000);
    }

    static long T0;

    public static void main(String[] args) throws Exception {
        T0 = System.nanoTime();
        Thread a = new Thread(() -> slowQuote("run() A"), "quote-A");
        Thread b = new Thread(() -> slowQuote("run() B"), "quote-B");
        a.run();                                                     // a plain method call on main
        b.run();
        System.out.println("run() total " + (System.nanoTime() - T0) / 1_000_000 + " ms, a is " + a.getState());

        T0 = System.nanoTime();
        Thread c = new Thread(() -> slowQuote("start C"), "quote-C");
        Thread d = new Thread(() -> slowQuote("start D"), "quote-D");
        c.start();                                                   // new OS thread runs run()
        d.start();
        c.join();
        d.join();
        System.out.println("start() total " + (System.nanoTime() - T0) / 1_000_000 + " ms, c is " + c.getState());

        try {
            c.start();                                               // a thread can be started once
        } catch (IllegalThreadStateException e) {
            System.out.println("second start(): " + e);
        }
        try {
            T0 = System.nanoTime();
            a.start();                                               // run() did not "use up" a
            a.join();
            a.start();
        } catch (IllegalThreadStateException e) {
            System.out.println("a after start(): " + e);
        }
    }
}`,
        },
        {
          type: "output",
          text: `run() A  ran on main         at  313 ms
run() B  ran on main         at  707 ms
run() total 716 ms, a is NEW
start C  ran on quote-C      at  304 ms
start D  ran on quote-D      at  306 ms
start() total 307 ms, c is TERMINATED
second start(): java.lang.IllegalThreadStateException
run() A  ran on quote-A      at  301 ms
a after start(): java.lang.IllegalThreadStateException`,
        },
        {
          type: "list",
          items: [
            "**`a.run()` ran on `main`.** It's a plain method call, as the bytecode showed: no thread is created, the calling thread executes the task, and the two 300 ms quotes ran one after the other. The `Thread` object stayed in state NEW. The total was about 700 ms rather than 600 in all three runs: the extra time is one-time start-up work on `main` (the first `printf` alone initialises `Formatter`, about 30 ms in a separate test) plus sleep overshoot on a busy machine.",
            "**`start()` ran each task on its own thread**, so the two 300 ms waits overlapped and the total was about 307 ms.",
            "**A thread can be started once.** The second `c.start()` threw `IllegalThreadStateException`: `threadStatus` was no longer 0. There is no restart; a finished thread is TERMINATED forever. Create a new `Thread`, or submit the task to an executor again.",
            "**`run()` doesn't use up a thread.** `a.run()` had already executed the task on `main`, yet `a.start()` still worked, because `threadStatus` only changes when the thread is really started.",
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: "The bug that passes every test",
          text: "Calling `run()` instead of `start()` compiles, produces the right results and passes unit tests. It only shows up as \"why is this slow?\" or \"why is everything on the request thread?\". Searching a codebase for `.run()` on `Thread` objects is a cheap review check.",
        },
      ],
    },
    {
      title: "Names, Priorities and Uncaught Exceptions",
      blocks: [
        {
          type: "heading",
          text: "Names",
        },
        {
          type: "paragraph",
          text: "A thread's name is the only thing a thread dump, a log line (`%thread` in Logback) or `top -H` shows you about it. `Thread-0`, `Thread-1` and `pool-3-thread-7` say nothing. Every thread a service creates should have a name that says what it's for: `dispatch-3`, `surge-recalc`, `kafka-consumer-trips-0`. The JVM copies the Java name to the kernel task (truncated to 15 characters), which is why `ps -L` showed `Reference Handl`. Renaming with `setName` later updates both.",
        },
        {
          type: "heading",
          text: "Priorities: a hint that Linux ignores",
        },
        {
          type: "code",
          language: "java",
          title: "Priorities.java",
          code: `import java.util.concurrent.atomic.AtomicBoolean;

public class Priorities {
    public static void main(String[] args) throws Exception {
        AtomicBoolean stop = new AtomicBoolean();
        long[] counts = new long[2];
        Thread low = new Thread(() -> { long n = 0; while (!stop.get()) n++; counts[0] = n; }, "low");
        Thread high = new Thread(() -> { long n = 0; while (!stop.get()) n++; counts[1] = n; }, "high");
        low.setPriority(Thread.MIN_PRIORITY);      // 1
        high.setPriority(Thread.MAX_PRIORITY);     // 10
        low.start(); high.start();
        Thread.sleep(2_000);
        stop.set(true);
        low.join(); high.join();
        System.out.printf("low  (prio %2d): %,d spins%n", low.getPriority(), counts[0]);
        System.out.printf("high (prio %2d): %,d spins%n", high.getPriority(), counts[1]);
        System.out.printf("high / low = %.2f%n", (double) counts[1] / counts[0]);
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `taskset -c 3 java Priorities                              # both threads on one CPU
taskset -c 3 java -XX:ThreadPriorityPolicy=1 Priorities`,
        },
        {
          type: "output",
          text: `low  (prio  1): 908,361,799 spins
high (prio 10): 900,641,694 spins
high / low = 0.99

OpenJDK 64-Bit Server VM warning: -XX:ThreadPriorityPolicy=1 may require system level permission, e.g., being the root user. If the necessary permission is not possessed, changes to priority will be silently ignored.
low  (prio  1): 578,450,786 spins
high (prio 10): 1,386,537,213 spins
high / low = 2.40`,
        },
        {
          type: "list",
          items: [
            "**By default, priority did nothing.** With both threads pinned to one CPU, so they had to compete, priority 10 and priority 1 got the same share: 0.99 to 1.00 in three runs. On Linux, HotSpot's default `ThreadPriorityPolicy=0` doesn't pass Java priorities to the OS at all; that's the `os_prio=0` in the thread dump.",
            "**With `ThreadPriorityPolicy=1`, the high thread got 2.4 times the CPU** (2.40, 2.46 and 2.41 in three runs). But `ps -L -o nice` showed **nice 4 for `low` and nice 0 for `high`**: the JVM maps priority 1 to nice 4 and priority 10 to nice -5, and a normal user is allowed to lower its priority but not raise it. So the effect came entirely from slowing the low thread. The Linux scheduler's weights for nice 0 and nice 4 are 1024 and 423, a ratio of 2.42, which is exactly what I measured.",
            "**On an idle multi-core machine priorities change nothing at all**, because both threads get their own core. They only matter under CPU contention, which is also exactly when you can't rely on them. Use them as a hint, never for correctness. To make work less important, give it fewer threads.",
          ],
        },
        {
          type: "heading",
          text: "Uncaught exceptions",
        },
        {
          type: "code",
          language: "java",
          title: "UncaughtHandlers.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class UncaughtHandlers {
    static void settle(String tripId) {
        throw new IllegalStateException("no fare for " + tripId);
    }

    public static void main(String[] args) throws Exception {
        // 1. No handler anywhere: ThreadGroup.uncaughtException prints to System.err; main carries on
        Thread plain = new Thread(() -> settle("T-1"), "settler-1");
        plain.start();
        plain.join();
        System.out.println("main still running, settler-1 is " + plain.getState());

        // 2. A JVM-wide default handler (log it, count it, alert on it)
        Thread.setDefaultUncaughtExceptionHandler((t, e) ->
                System.out.println("[default handler] " + t.getName() + " died: " + e.getMessage()));
        Thread t2 = new Thread(() -> settle("T-2"), "settler-2");
        t2.start();
        t2.join();

        // 3. A per-thread handler wins over the default one
        Thread t3 = Thread.ofPlatform().name("settler-3")
                .uncaughtExceptionHandler((t, e) -> System.out.println("[per-thread handler] " + t.getName() + ": " + e.getMessage()))
                .unstarted(() -> settle("T-3"));
        t3.start();
        t3.join();

        // 4. submit() catches the exception and stores it in the Future: no handler runs
        try (ExecutorService pool = Executors.newSingleThreadExecutor()) {
            Future<?> f = pool.submit(() -> settle("T-4"));
            Thread.sleep(200);
            System.out.println("submit(): nothing printed yet, isDone=" + f.isDone());
            try {
                f.get();
            } catch (java.util.concurrent.ExecutionException e) {
                System.out.println("submit(): only visible through get(): " + e.getCause());
            }
            // 5. execute() lets it escape the worker, so the default handler sees it
            pool.execute(() -> settle("T-5"));
        }
    }
}`,
        },
        {
          type: "output",
          text: `Exception in thread "settler-1" java.lang.IllegalStateException: no fare for T-1
	at UncaughtHandlers.settle(UncaughtHandlers.java:7)
	at UncaughtHandlers.lambda$main$0(UncaughtHandlers.java:12)
	at java.base/java.lang.Thread.run(Thread.java:1583)
main still running, settler-1 is TERMINATED
[default handler] settler-2 died: no fare for T-2
[per-thread handler] settler-3: no fare for T-3
submit(): nothing printed yet, isDone=true
submit(): only visible through get(): java.lang.IllegalStateException: no fare for T-4
[default handler] pool-1-thread-1 died: no fare for T-5`,
        },
        {
          type: "list",
          items: [
            "**An exception that escapes `run()` ends that thread only.** `main` carried on, and the process exited with status 0. Nothing restarts the dead thread; if it was a background worker, its work silently stops.",
            "**The lookup order** when a thread dies: its own handler (`setUncaughtExceptionHandler`, or the builder's `uncaughtExceptionHandler`), otherwise its `ThreadGroup`, which delegates to the JVM-wide `Thread.setDefaultUncaughtExceptionHandler`, and if there's none, prints `Exception in thread \"name\"` and the stack trace to `System.err`. In production, `System.err` may go nowhere, so set a default handler that logs and counts.",
            "**`submit()` swallows it.** The task's exception was stored in the `Future` and nothing was printed: no handler ran, because the worker thread didn't die. It's only visible if someone calls `get()`. A fire-and-forget `submit` that fails is invisible: the ExecutorService lesson comes back to this.",
            "**`execute()` lets it escape**, so the worker thread dies, the default handler sees it, and the pool creates a replacement thread.",
          ],
        },
      ],
    },
    {
      title: "What a Platform Thread Costs",
      blocks: [
        {
          type: "paragraph",
          text: "Memory was measured above: about 100 KB resident and 1 MB of address space per idle thread. Time is the other half. I measured starting and joining 20,000 threads that do almost nothing, against running the same task inline and in a pool of 8:",
        },
        {
          type: "code",
          language: "java",
          title: "ThreadCost.java",
          code: `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.LongAdder;

public class ThreadCost {
    static final LongAdder WORK = new LongAdder();
    static final Runnable TASK = WORK::increment;                 // almost no work: we measure the overhead

    interface Body { void run(int n) throws Exception; }

    static void measure(String label, int n, Body body) throws Exception {
        long best = Long.MAX_VALUE;
        for (int round = 0; round < 5; round++) {
            long t0 = System.nanoTime();
            body.run(n);
            best = Math.min(best, System.nanoTime() - t0);
        }
        System.out.printf("%-34s %,9.2f us per task%n", label, best / 1_000.0 / n);
    }

    public static void main(String[] args) throws Exception {
        int n = 20_000;
        measure("inline call", n, k -> { for (int i = 0; i < k; i++) TASK.run(); });
        measure("new Thread + start + join", n, k -> {
            for (int i = 0; i < k; i++) {
                Thread t = new Thread(TASK);
                t.start();
                t.join();
            }
        });
        measure("new Thread x1000, then join all", n, k -> {
            Thread[] batch = new Thread[1_000];
            for (int done = 0; done < k; done += batch.length) {
                for (int i = 0; i < batch.length; i++) (batch[i] = new Thread(TASK)).start();
                for (Thread t : batch) t.join();
            }
        });
        try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
            measure("pool of 8: submit + get", n, k -> {
                for (int i = 0; i < k; i++) pool.submit(TASK).get();
            });
            measure("pool of 8: submit x1000, get all", n, k -> {
                Future<?>[] batch = new Future<?>[1_000];
                for (int done = 0; done < k; done += batch.length) {
                    for (int i = 0; i < batch.length; i++) batch[i] = pool.submit(TASK);
                    for (Future<?> f : batch) f.get();
                }
            });
        }
        System.out.println("tasks run: " + WORK.sum());
    }
}`,
        },
        {
          type: "output",
          text: `inline call                             0.02 us per task
new Thread + start + join             143.33 us per task
new Thread x1000, then join all        96.16 us per task
pool of 8: submit + get                18.87 us per task
pool of 8: submit x1000, get all        0.73 us per task
tasks run: 500000`,
        },
        {
          type: "list",
          items: [
            "**A thread costs about 100 µs to start and finish here**: 127 to 143 µs one at a time, 85 to 96 µs in batches of 1,000 (best of 5, three runs). That's the `mmap`, the `clone3`, the guard pages, the shadow-zone touching, the `JavaThread` setup and teardown, and the handshake in which `start()` waits for the child.",
            "**A pool reuses threads**: handing a task to an existing thread and waiting for the answer cost 15 to 19 µs (mostly waking a parked thread and being woken back), and batching the hand-offs brought it to 0.63 to 0.73 µs per task, **over 100 times cheaper** than a new thread per task.",
            "**For a task that takes 50 ms (a database query), 100 µs doesn't matter.** Thread creation hurts when tasks are short and frequent, and its real danger isn't speed at all: it's that nothing limits how many threads exist at once, which the next measurement and the production section show.",
            "These are single-machine `System.nanoTime` measurements under load from other processes, not JMH. The absolute numbers moved between runs by about 15%; the ratios didn't.",
          ],
        },
        {
          type: "heading",
          text: "How many threads before trouble",
        },
        {
          type: "paragraph",
          text: "Every platform thread is a kernel task, and kernels limit tasks: `ulimit -u` (max user processes, which counts threads), `/proc/sys/kernel/threads-max`, and in containers the cgroup `pids.max` that Kubernetes sets as the pod pids limit. I didn't want to exhaust the shared machine, so I ran the test inside a systemd scope with a 200-task limit:",
        },
        {
          type: "code",
          language: "java",
          title: "UntilItBreaks.java",
          code: `import java.util.concurrent.CountDownLatch;

public class UntilItBreaks {
    public static void main(String[] args) throws Exception {
        CountDownLatch release = new CountDownLatch(1);
        int started = 0;
        try {
            while (started < 10_000) {                                // hard cap, in case no limit is set
                Thread t = new Thread(() -> {
                    try { release.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                });
                t.setDaemon(true);
                t.start();
                started++;
            }
            System.out.println("no limit hit, stopped at the cap of " + started);
        } catch (OutOfMemoryError e) {
            System.out.println("started " + started + " threads, then: " + e);
            System.out.println("live threads in the JVM: " + Thread.activeCount()
                    + " (plus the JVM's own GC/JIT threads), heap used "
                    + (Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) / (1024 * 1024) + " MB");
        } finally {
            release.countDown();
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "systemd-run --user --scope -q -p TasksMax=200 java UntilItBreaks",
        },
        {
          type: "output",
          text: `[0.206s][warning][os,thread] Failed to start thread "Unknown thread" - pthread_create failed (EAGAIN) for attributes: stacksize: 1024k, guardsize: 0k, detached.
[0.206s][warning][os,thread] Failed to start the native thread for java.lang.Thread "Thread-181"
started 181 threads, then: java.lang.OutOfMemoryError: unable to create native thread: possibly out of memory or process/resource limits reached
live threads in the JVM: 182 (plus the JVM's own GC/JIT threads), heap used 7 MB`,
        },
        {
          type: "list",
          items: [
            "**181 threads, then `OutOfMemoryError`**, with 7 MB of heap used. 181 + main + 17 JVM threads + the launcher = 200 tasks, exactly the limit. With `TasksMax=100` it stopped at 81.",
            "**The name is misleading.** It's an `OutOfMemoryError`, but memory was fine: `pthread_create` returned `EAGAIN` because the kernel refused another task. The message says \"possibly out of memory or process/resource limits reached\", and the `-Xlog` warning above it names the real cause. Heap dumps and `-Xmx` are the wrong place to look.",
            "**It can hit any thread**, not just yours: the JVM's own GC worker and compiler threads are created lazily, and they fail the same way. The production section shows it killing the thread that accepts requests.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing `new Thread(task, \"ride-matcher\").start()` from `OneThread.java` through to `TERMINATED`:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Construct.** `new Thread(task, \"ride-matcher\")` allocates the `Thread` object on the heap and a `FieldHolder` with the task, the caller's `ThreadGroup`, priority and daemon flag inherited from the creating thread, and `threadStatus` 0. No OS resources exist yet; `getState()` is NEW.",
            "**`start()` checks.** It locks the `Thread` object, sees `threadStatus == 0`, and calls the native `start0()`.",
            "**`JVM_StartThread`** creates the native `JavaThread` structure for it and calls `os::create_thread` with the stack size (`ThreadStackSize`, 1 MB, unless one was requested).",
            "**`pthread_create`** maps a 1 MB stack and issues `clone3(CLONE_VM | CLONE_THREAD ...)`. The kernel creates a task in the same thread group with a new TID; the parent thread waits until the child reports that it has initialised.",
            "**The child runs `thread_native_entry`**: it records its stack bounds, installs the 16 KB of guard pages, touches the 80 KB shadow zone, sets its native name and registers with the JVM. The parent is released, `threadStatus` changes from NEW to RUNNABLE, and `start()` returns.",
            "**The child calls `Thread.run()`**, which calls `task.run()`. From here, the OS scheduler decides when it gets a CPU; the JVM doesn't schedule platform threads.",
            "**The task returns (or throws).** If it threw, the uncaught exception handler chain runs on this thread. Then the JVM sets the state to TERMINATED, notifies threads blocked in `join()`, releases the `JavaThread`, and the thread exits; glibc frees the stack because the thread is detached.",
            "**`join()` in `main` returns** because the thread is no longer alive. The `Thread` object stays on the heap as long as something references it, as a record of a finished thread.",
          ],
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "ThreadsTour.java",
          code: `import java.time.Duration;

public class ThreadsTour {
    public static void main(String[] args) throws Exception {
        Thread me = Thread.currentThread();
        System.out.println("1 " + me.getName() + " id=" + me.threadId() + " prio=" + me.getPriority()
                + " daemon=" + me.isDaemon() + " group=" + me.getThreadGroup().getName());

        Runnable job = () -> System.out.println("  hello from \\"" + Thread.currentThread().getName() + "\\"");
        Thread t = new Thread(job, "eta-worker");                 // Runnable + name
        System.out.println("2 alive before start? " + t.isAlive() + ", state " + t.getState());
        t.start();
        t.join();                                                 // wait for it to finish
        System.out.println("3 alive after join? " + t.isAlive() + ", state " + t.getState());

        Thread d = new Thread(job);                               // default name Thread-N
        d.setName("renamed-" + d.getName());
        d.setDaemon(true);                                        // before start()
        d.setPriority(Thread.NORM_PRIORITY + 1);                  // a hint, see below
        d.start();
        d.join(Duration.ofSeconds(1));                            // join with a timeout (Java 19+)

        Thread b = Thread.ofPlatform()                            // Java 21 builder
                .name("pricing-", 7)
                .daemon(true)
                .stackSize(512 * 1024)                            // a request; the OS may round it
                .uncaughtExceptionHandler((th, e) -> System.out.println("4 " + th.getName() + " failed: " + e.getMessage()))
                .start(() -> { throw new IllegalStateException("surge table missing"); });
        b.join();

        Thread v = Thread.startVirtualThread(job);                // virtual: see the virtual threads lesson
        v.join();
        System.out.println("5 cores " + Runtime.getRuntime().availableProcessors()
                + ", live threads in this group " + Thread.activeCount());
    }
}`,
        },
        {
          type: "output",
          text: `1 main id=1 prio=5 daemon=false group=main
2 alive before start? false, state NEW
  hello from "eta-worker"
3 alive after join? false, state TERMINATED
  hello from "renamed-Thread-0"
4 pricing-7 failed: surge table missing
  hello from ""
5 cores 8, live threads in this group 1`,
        },
        {
          type: "paragraph",
          text: "`threadId()` (Java 19) replaces the deprecated `getId()`. `setDaemon` must be called before `start()`. `Thread.activeCount()` counts live threads in the caller's thread group, which excluded the finished threads and the virtual thread (virtual threads belong to a special group); it's an estimate, useful for logging, not for logic. A virtual thread started with `startVirtualThread` has an empty name.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: Three fare quotes in parallel with plain threads",
        },
        {
          type: "code",
          language: "java",
          title: "ParallelQuotes.java",
          code: `import java.util.Arrays;

public class ParallelQuotes {
    // Pretend partner APIs: each answers after a different delay
    static long quote(String partner, long delayMs, long farePaise) throws InterruptedException {
        Thread.sleep(delayMs);
        return farePaise;
    }

    public static void main(String[] args) throws Exception {
        String[] partners = {"auto", "mini", "sedan"};
        long[] delays = {120, 250, 180};
        long[] fares = {9_500, 14_500, 21_000};
        long[] results = new long[partners.length];             // each thread writes only its own slot
        Thread[] workers = new Thread[partners.length];

        long t0 = System.nanoTime();
        for (int i = 0; i < partners.length; i++) {
            int slot = i;                                        // lambdas capture effectively final locals
            workers[i] = new Thread(() -> {
                try {
                    results[slot] = quote(partners[slot], delays[slot], fares[slot]);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    results[slot] = -1;
                }
            }, "quote-" + partners[slot]);
            workers[i].start();
        }
        for (Thread w : workers) w.join();                       // join: wait AND see what the thread wrote
        long elapsed = (System.nanoTime() - t0) / 1_000_000;

        System.out.println("fares " + Arrays.toString(results) + " in " + elapsed + " ms");
        System.out.println("sequential would be about " + Arrays.stream(delays).sum() + " ms");
    }
}`,
        },
        {
          type: "output",
          text: `fares [9500, 14500, 21000] in 258 ms
sequential would be about 550 ms`,
        },
        {
          type: "list",
          items: [
            "Three threads waiting on three partner APIs at once finished in the time of the slowest (250 ms; 258 to 260 ms in three runs), against 550 ms one after another.",
            "**Each thread writes only its own array slot**, so there's no race between the workers. Results come back through shared memory, because `run()` can't return anything.",
            "**`join()` does two jobs.** It waits, and it guarantees that everything the thread wrote is visible to the thread that joined (a happens-before edge, in the terms of the Java Memory Model lesson). Reading `results` without joining could see zeros even after the work was done.",
            "This is the shape that `ExecutorService.invokeAll` and `CompletableFuture.allOf` package up, with timeouts and error handling that this version doesn't have: if one partner hangs, `join()` waits forever.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Finding the thread that burns CPU",
        },
        {
          type: "paragraph",
          text: "A classic production task: the service uses 100% of a core and you need to know which code. `top -H` shows per-thread CPU by kernel TID, and the thread dump maps the TID to a Java thread and its stack:",
        },
        {
          type: "code",
          language: "java",
          title: "HotThread.java",
          code: `import java.util.concurrent.ThreadLocalRandom;

public class HotThread {
    public static void main(String[] args) throws Exception {
        // a background job that burns CPU (a runaway surge recalculation)
        Thread hot = new Thread(() -> {
            long acc = 0;
            while (true) acc += ThreadLocalRandom.current().nextInt(100);
        }, "surge-recalc");
        hot.setDaemon(true);
        hot.start();
        // a few quiet threads, as in any service
        for (int i = 0; i < 3; i++) {
            Thread quiet = new Thread(() -> {
                try { Thread.sleep(60_000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            }, "eta-poller-" + i);
            quiet.setDaemon(true);
            quiet.start();
        }
        System.out.println("pid " + ProcessHandle.current().pid());
        Thread.sleep(Long.parseLong(args[0]));
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java HotThread 6000 & PID=$!; sleep 3
top -H -b -n 1 -p $PID | sed -n '7,11p'
jcmd $PID Thread.print | grep -A3 '"surge-recalc"'`,
        },
        {
          type: "output",
          text: `    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
1081398 kumarpr+  20   0 5095484  44844  24288 R  99.9   0.6   0:03.17 surge-r+
1081379 kumarpr+  20   0 5095484  44844  24288 S   0.0   0.6   0:00.00 java
1081381 kumarpr+  20   0 5095484  44844  24288 S   0.0   0.6   0:00.04 java
1081382 kumarpr+  20   0 5095484  44844  24288 S   0.0   0.6   0:00.00 GC Thre+
"surge-recalc" #20 [1081398] daemon prio=5 os_prio=0 cpu=3375.82ms elapsed=3.38s tid=0x00007a95ec173460 nid=1081398 runnable  [0x00007a95d022c000]
   java.lang.Thread.State: RUNNABLE
	at HotThread.lambda$main$0(HotThread.java:8)
	at HotThread$$Lambda/0x00007a957c000a08.run(Unknown Source)`,
        },
        {
          type: "list",
          items: [
            "With `-H`, `top`'s PID column is the TID. TID 1081398 used 99.9% of a core, and `top` already shows its name because the JVM set it on the kernel task.",
            "The dump line with `[1081398]` (or `nid=1081398`) is the same thread, and its stack points at line 8, the busy loop. On JDK 17 and earlier, `nid` was hex, so the TID had to be converted first (`printf '%x' 1081398`); many runbooks still say to do that.",
            "Take two or three dumps a few seconds apart: a thread that's at the same line every time is where the CPU goes. With unnamed threads, the dump says `Thread-0` and you're left reading stack traces; with names, `top` alone answers the question.",
          ],
        },
        {
          type: "heading",
          text: "Example 3: Who started this thread? JFR knows",
        },
        {
          type: "paragraph",
          text: "When a service has thousands of `Thread-1234` threads, the useful question is which code creates them. Java Flight Recorder records a `jdk.ThreadStart` event with the parent thread and the stack trace of the `start()` call:",
        },
        {
          type: "code",
          language: "bash",
          code: `java -XX:StartFlightRecording:filename=one.jfr,settings=profile OneThread
jfr print --events jdk.ThreadStart one.jfr`,
        },
        {
          type: "output",
          text: `jdk.ThreadStart {
  startTime = 03:58:03.121 (2026-11-14)
  thread = "ride-matcher" (javaThreadId = 24)
  parentThread = "main" (javaThreadId = 1)
  eventThread = "ride-matcher" (javaThreadId = 24)
  stackTrace = [
    OneThread.main(String[]) line: 5
  ]
}
...`,
        },
        {
          type: "paragraph",
          text: "`OneThread.main` line 5 is the `t.start()` call. In a real service, `jfr print --events jdk.ThreadStart` piped through a count of the top stack frame finds the code that spawns threads in a loop within minutes. `jfr summary` shows how many `jdk.ThreadStart` and `jdk.ThreadEnd` events there were, which is a thread churn rate.",
        },
      ],
    },
    {
      title: "When to Use What",
      blocks: [
        {
          type: "table",
          headers: ["Need", "Use", "Avoid"],
          rows: [
            ["A long-lived background loop (a consumer, a poller) you start once", "A named platform `Thread` or a single-thread executor", "An anonymous `new Thread(...)` with no name or handler"],
            ["Many short CPU-bound tasks", "A fixed pool sized near the core count (ExecutorService lessons)", "A thread per task"],
            ["Many tasks that mostly wait on I/O", "Virtual threads, or a bounded pool", "A thread per request with no limit"],
            ["A result or a checked exception back from the work", "`Callable` + `Future`, or `CompletableFuture`", "Shared fields filled in by a raw thread"],
            ["Isolation from crashes and leaks", "A separate process", "Threads (one OOM or JVM crash takes all of them down)"],
            ["Making some work less important", "Fewer threads or a separate pool for it", "Thread priorities"],
            ["Knowing when a thread failed", "A default `UncaughtExceptionHandler` that logs and counts; `Future.get()` for submitted tasks", "Relying on `System.err`"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Calling run() instead of start()",
        },
        {
          type: "paragraph",
          text: "The task runs on the caller, sequentially, and nothing fails. `StartVsRun` showed 700 ms instead of 300. Check that `start()` is called, and look at the thread name in a log line if in doubt.",
        },
        {
          type: "heading",
          text: "Starting a thread twice",
        },
        {
          type: "paragraph",
          text: "`IllegalThreadStateException`, even after the thread has finished. Threads aren't reusable; that's what pools are for.",
        },
        {
          type: "heading",
          text: "Creating a thread per request or per message",
        },
        {
          type: "paragraph",
          text: "Unbounded thread creation turns a traffic spike into thousands of kernel tasks, then into `OutOfMemoryError: unable to create native thread`. The production section below is this mistake.",
        },
        {
          type: "heading",
          text: "Leaving threads unnamed",
        },
        {
          type: "paragraph",
          text: "`Thread-17` in a dump or a log line tells you nothing. Name every thread, and use `Thread.ofPlatform().name(\"prefix-\", 0).factory()` for executors.",
        },
        {
          type: "heading",
          text: "Losing exceptions",
        },
        {
          type: "paragraph",
          text: "An uncaught exception in a raw thread goes to `System.err` and the thread silently disappears; one inside `submit()` is held in a `Future` nobody reads. Set a default handler, and always consume the `Future` of submitted work.",
        },
        {
          type: "heading",
          text: "Using priorities for correctness",
        },
        {
          type: "paragraph",
          text: "On Linux they do nothing by default, and with `ThreadPriorityPolicy=1` they can only lower priority for non-root users. Code that needs one thread to run before another needs coordination (`join`, latches, queues), not priorities.",
        },
        {
          type: "heading",
          text: "Sharing mutable state without coordination",
        },
        {
          type: "paragraph",
          text: "`counter++` from two threads lost up to half its increments. Any field written by one thread and read by another needs `synchronized`, a `volatile` or an atomic, or a hand-off through a thread-safe structure. The next lessons are about exactly that.",
        },
        {
          type: "heading",
          text: "Reading -Xss as the memory cost of a thread",
        },
        {
          type: "paragraph",
          text: "`-Xss` sets the reserved stack (address space and maximum depth). Resident memory per idle thread was about 100 KB at every `-Xss` I tried. Lowering `-Xss` to fit more threads mostly buys earlier `StackOverflowError`s.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Prefer executors (and, for blocking work, virtual threads) to raw `Thread`s; keep raw threads for a few long-lived, named background loops.",
            "Separate the task (`Runnable`/`Callable`) from the thread that runs it. Don't extend `Thread`.",
            "Name every thread for what it does, and give pools a named `ThreadFactory`.",
            "Install a default `UncaughtExceptionHandler` that logs with the thread name and increments a metric; alert on it.",
            "Bound the number of threads. Anything that creates threads in response to input (requests, messages, files) must go through a bounded pool.",
            "Export the live thread count (`ThreadMXBean.getThreadCount()`, `jvm_threads_live` in Micrometer) and the peak, and alert on growth.",
            "Know your kernel and container limits (`ulimit -u`, `pids.max`), and remember the JVM itself needs about 20 threads plus GC and compiler threads that grow with load.",
            "Don't use priorities to express importance; use separate, sized pools.",
            "Read thread dumps with `jcmd <pid> Thread.print`, map hot TIDs with `top -H`, and find thread creators with JFR's `jdk.ThreadStart`.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "paragraph",
          text: "The measurements from this lesson, together. All on one 8-core Linux machine with JDK 21 and other benchmarks running at the same time, so they're ratios to trust and absolute numbers to re-measure on your hardware:",
        },
        {
          type: "table",
          headers: ["Operation", "Measured", "Notes"],
          rows: [
            ["Inline call of a trivial task", "0.02 µs", "Baseline"],
            ["Start + join a platform thread, one at a time", "127 to 143 µs", "Best of 5, three runs"],
            ["Start 1,000 threads, then join them", "85 to 96 µs per thread", "Some overlap between creation and exit"],
            ["Start + join a thread (in `ProcessVsThread`)", "84 to 119 µs", "Same cost, separate test"],
            ["Start and wait for a process (`/bin/true`)", "965 to 1,112 µs", "About 10x a thread"],
            ["Pool of 8, submit + get, one at a time", "15 to 19 µs", "Hand-off latency: unpark, run, unpark back"],
            ["Pool of 8, 1,000 submits then 1,000 gets", "0.63 to 0.73 µs per task", "Over 100x cheaper than a new thread"],
            ["Resident memory per idle thread", "About 100 KB", "Same with `-Xss256k`; 80 KB is the shadow zone"],
            ["Address space per thread", "1 MB stack + a 128 MB glibc arena reservation", "Virtual only; `VIRT` in `top` grows, RSS doesn't"],
          ],
        },
        {
          type: "paragraph",
          text: "The pattern: creating a thread costs about the same as a small network round trip inside a data centre, and holding one costs about 100 KB. Neither matters for tens of threads. Both matter for thousands, and the limit on how many can exist matters more than either.",
        },
      ],
    },
    {
      title: "Threads in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing booking service had a simple handler: for every booking request, it started a new thread that called the maps API for an ETA and the pricing service for a fare, then wrote the response. At normal load, the downstream calls took about 30 ms and a few dozen threads existed at any time. During an evening peak the maps API slowed down to about 300 ms. Requests kept arriving at the same rate, each thread now lived ten times longer, and the number of live threads grew until the pod hit its pids limit. The service didn't crash: it stopped accepting requests, while its health check kept passing.",
        },
        {
          type: "paragraph",
          text: "I rebuilt it with a 1.5 second burst of 3,000 requests (2,000 per second) and a 300 ms downstream wait, which needs about 600 requests in flight. The thread that accepts requests is a separate `acceptor`, as in a real server:",
        },
        {
          type: "code",
          language: "java",
          title: "BookingServer.java",
          code: `import java.lang.management.ManagementFactory;
import java.util.Arrays;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.LockSupport;

public class BookingServer {
    static final AtomicInteger COMPLETED = new AtomicInteger();
    static final AtomicInteger REJECTED = new AtomicInteger();
    static final ConcurrentLinkedQueue<Long> LATENCIES_MS = new ConcurrentLinkedQueue<>();
    static volatile int accepted = 0;

    // One booking request: most of its time is spent waiting on the maps/pricing services
    static void handle(long arrivedAt, long downstreamMs) {
        try {
            Thread.sleep(downstreamMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return;
        }
        LATENCIES_MS.add((System.nanoTime() - arrivedAt) / 1_000_000);
        COMPLETED.incrementAndGet();
    }

    public static void main(String[] args) throws Exception {
        String mode = args[0];                                   // "thread-per-request" or "pool"
        int requests = 3_000, perSecond = 2_000;              // a 1.5 s burst
        long downstreamMs = 300;                                 // maps API slowed down at peak
        ThreadPoolExecutor pool = new ThreadPoolExecutor(300, 300, 0, TimeUnit.SECONDS,       // fits under the pod limit
                new ArrayBlockingQueue<>(300), Thread.ofPlatform().name("booking-", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());

        Thread acceptor = new Thread(() -> {
            long start = System.nanoTime(), gap = 1_000_000_000L / perSecond;
            for (int i = 0; i < requests; i++) {
                long due = start + i * gap;
                while (System.nanoTime() < due) LockSupport.parkNanos(due - System.nanoTime());
                long arrived = due;                                  // latency counts from when the request arrived
                if (mode.equals("pool")) {
                    try {
                        pool.execute(() -> handle(arrived, downstreamMs));
                    } catch (RejectedExecutionException e) {
                        REJECTED.incrementAndGet();               // a fast 503 instead of a dead server
                    }
                } else {
                    new Thread(() -> handle(arrived, downstreamMs)).start();
                }
                accepted = i + 1;
            }
        }, "acceptor");
        acceptor.setUncaughtExceptionHandler((t, e) ->
                System.out.println("acceptor DIED after " + accepted + " requests: " + e.getMessage()));
        acceptor.start();
        acceptor.join();
        pool.shutdown();
        pool.awaitTermination(30, TimeUnit.SECONDS);
        Thread.sleep(500);                                       // let any per-request threads finish

        long[] lat = LATENCIES_MS.stream().mapToLong(Long::longValue).sorted().toArray();
        System.out.printf("%s: accepted %d of %d, completed %d, rejected %d, peak live threads %d%n",
                mode, accepted, requests, COMPLETED.get(), REJECTED.get(),
                ManagementFactory.getThreadMXBean().getPeakThreadCount());
        if (lat.length > 0) {
            System.out.printf("  latency p50 %d ms, p99 %d ms, max %d ms%n",
                    lat[lat.length / 2], lat[(int) (lat.length * 0.99)], lat[lat.length - 1]);
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java BookingServer thread-per-request                                             # no limit
systemd-run --user --scope -q -p TasksMax=400 java BookingServer thread-per-request   # a pod with pids.max 400
systemd-run --user --scope -q -p TasksMax=400 java BookingServer pool`,
        },
        {
          type: "output",
          text: `thread-per-request: accepted 3000 of 3000, completed 3000, rejected 0, peak live threads 621
  latency p50 300 ms, p99 302 ms, max 306 ms

[0.238s][warning][os,thread] Failed to start thread "Unknown thread" - pthread_create failed (EAGAIN) for attributes: stacksize: 1024k, guardsize: 0k, detached.
[0.238s][warning][os,thread] Failed to start the native thread for java.lang.Thread "Thread-381"
acceptor DIED after 381 requests: unable to create native thread: possibly out of memory or process/resource limits reached
thread-per-request: accepted 381 of 3000, completed 381, rejected 0, peak live threads 388
  latency p50 300 ms, p99 301 ms, max 302 ms

pool: accepted 3000 of 3000, completed 1800, rejected 1200, peak live threads 307
  latency p50 591 ms, p99 598 ms, max 600 ms`,
        },
        {
          type: "list",
          items: [
            "**Without a limit, thread-per-request \"worked\" with 621 live threads**, and in two other runs peaked at 771 and 1,014: thread exit lags behind creation, so the peak overshoots the 600 the arithmetic predicts. In earlier runs on the busier machine, creating the threads itself became the bottleneck, and the p50 latency rose to 1.6 and 1.9 seconds while requests waited for the acceptor to finish creating threads.",
            "**Under a 400-task limit, the acceptor died after 381 requests**, in all three runs: 381 handler threads + main + acceptor + 17 JVM threads + the launcher = 400. The `OutOfMemoryError` was thrown in the acceptor, the thread calling `start()`, so the thread that accepts work was the one that died. The 381 requests already accepted completed normally; the other 2,619 were never accepted. In the real service, the process stayed up, with a passing health check, accepting nothing.",
            "**The pool kept the service alive and predictable.** 300 worker threads (sized to fit under the limit) and a queue of 300, with `AbortPolicy`: peak 307 live threads, 1,800 completed, and 1,200 rejected immediately, identically in all three runs. A rejection becomes a fast HTTP 503 or a retry from the app, instead of a dead acceptor.",
            "**The pool didn't create capacity.** 300 workers × (1 / 0.3 s) = 1,000 requests per second, against 2,000 arriving, so half the burst couldn't be served in time either way. The queue added waiting: p50 latency 591 ms, which is 300 ms in the queue plus 300 ms of work. The queue size is a latency budget (here 300 ms of waiting), not a buffer to make as big as possible.",
            "**The real fix had three parts**: a bounded pool with a bounded queue, so the number of threads can't follow the load; a timeout on the maps call (so 300 ms of slowness can't hold a thread indefinitely, the subject of Timeouts, Fallbacks, Fan-out and Choosing Executors); and alerts on the live thread count and on rejections. Sizing the pool and choosing the queue and rejection policy are the ThreadPoolExecutor Internals lesson.",
          ],
        },
        {
          type: "list",
          items: [
            "Thread-per-request ties the number of threads to `arrival rate × latency`. When a dependency slows down, threads multiply even though traffic didn't change.",
            "`OutOfMemoryError: unable to create native thread` is a task limit (`pids.max`, `ulimit -u`), not heap. Check `-Xlog:os+thread` warnings, `/proc/<pid>/status` Threads and the container's `pids.max`.",
            "The thread that fails is the one calling `start()`. If that's your acceptor or consumer loop, the service stops working without stopping.",
            "Bound threads with a pool, bound waiting with a queue sized by latency, and make rejection explicit.",
            "Watch `jvm_threads_live` and `jvm_threads_peak`; a slow climb under constant traffic means a dependency got slower or threads are leaking.",
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
              question: "What is the difference between a process and a thread?",
              answer:
                "A process is a running program with its own address space and OS resources; a thread is one line of execution inside a process, with its own stack, program counter and registers, sharing the process's heap, code and open files with the other threads. Threads are cheaper to create (about 100 µs against about 1,000 µs for a process in my measurements) and communicate through shared memory, which is also why they need synchronization. Processes are isolated: one crashing doesn't take down another.",
            },
            {
              question: "What are the ways to create a thread in Java?",
              answer:
                "There's one way to get a new thread, `new Thread(...)` plus `start()` (or the Java 21 builder `Thread.ofPlatform()`), and several ways to give it work: subclass `Thread` and override `run()`, pass a `Runnable` (a class or a lambda), or submit a `Callable` to an `ExecutorService`, which runs it on a pool thread and returns a `Future` with the result. Virtual threads are created with `Thread.ofVirtual()` or `Thread.startVirtualThread`. Implementing `Runnable` is preferred to extending `Thread` because it separates the task from the mechanism.",
            },
            {
              question: "What is the difference between start() and run()?",
              answer:
                "`start()` creates a new OS thread, which then calls `run()`. Calling `run()` directly is an ordinary method call on the current thread: no new thread, no concurrency. In my test, two 300 ms tasks took about 700 ms with `run()` (both on `main`) and 307 ms with `start()`, and `Thread.currentThread().getName()` inside the task printed `main` for `run()`.",
            },
            {
              question: "What happens if you call start() twice on the same thread?",
              answer:
                "The second call throws `IllegalThreadStateException`. `start()` checks that `threadStatus` is 0 (NEW) and a thread never goes back to NEW, even after it has finished. To run the task again, create a new `Thread` or submit the task to an executor.",
            },
            {
              question: "Runnable or Callable: what's the difference?",
              answer:
                "`Runnable.run()` returns nothing and can't throw checked exceptions. `Callable<V>.call()` returns a `V` and can throw `Exception`. A `Thread` only accepts a `Runnable`; a `Callable` is run by an executor, which returns a `Future<V>` whose `get()` gives the value or throws `ExecutionException` wrapping what `call()` threw.",
            },
            {
              question: "What happens when an exception is thrown in a thread and not caught?",
              answer:
                "That thread ends; other threads, including `main`, keep running, and the process exit status isn't affected. Before it ends, the JVM calls the thread's `UncaughtExceptionHandler`, or its `ThreadGroup`, which uses the default handler if one is set and otherwise prints `Exception in thread \"name\"` with the stack trace to `System.err`.",
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
              question: "What do threads in a JVM share, and what is private to each?",
              answer:
                "Shared: the heap (all objects and static field values), Metaspace and the code cache, and OS resources such as file descriptors and sockets. Private: the stack (frames, locals, operand stacks), program counter and registers, `ThreadLocal` values, the TLAB, and the interrupt flag and other per-thread state. That's why local variables are thread-safe and fields reachable from two threads aren't: two threads incrementing one static field lost up to half the increments in my test.",
            },
            {
              question: "How are Java platform threads mapped to OS threads?",
              answer:
                "One to one. `Thread.start()` calls `JVM_StartThread`, which calls `os::create_thread` and `pthread_create`, which issues `clone3` with `CLONE_VM | CLONE_THREAD`. Each Java thread is a kernel task with its own TID in the same thread group, visible in `ps -L`, `/proc/<pid>/task` and `top -H`, and the OS scheduler, not the JVM, decides when it runs. Virtual threads are the exception: many of them are multiplexed onto a few platform carrier threads.",
            },
            {
              question: "Do thread priorities work in Java?",
              answer:
                "They're hints. On Linux, HotSpot ignores them by default (`ThreadPriorityPolicy=0`, `os_prio=0` in dumps): pinned to one CPU, priority 1 and 10 threads got the same CPU share in my test. With `-XX:ThreadPriorityPolicy=1`, priorities map to nice values, but a non-root user can only lower priority, so priority 1 became nice 4 and priority 10 stayed at nice 0; the high thread then got 2.4x the CPU. They should never be used for correctness.",
            },
            {
              question: "Why is extending Thread considered worse than implementing Runnable?",
              answer:
                "It ties the work to one execution mechanism: an object that is a `Thread` can't be submitted to an executor sensibly, can't be reused, and uses up the class's single superclass. A `Runnable` or `Callable` can run on a raw thread, a pool, a virtual thread or inline in a test. Extending `Thread` is mainly justified when you really are customising the thread itself.",
            },
            {
              question: "What threads exist in a JVM that has only a main method?",
              answer:
                "On JDK 21 with G1 I counted 17 plus the launcher thread: `main`; GC threads (`GC Thread#0`, `G1 Main Marker`, `G1 Conc#0`, `G1 Refine#0`, `G1 Service`); `VM Thread` for safepoint operations; JIT compiler threads `C2 CompilerThread0` and `C1 CompilerThread0`; `Reference Handler`, `Finalizer`, `Common-Cleaner`, `Signal Dispatcher`, `Service Thread`, `Monitor Deflation Thread`, `VM Periodic Task Thread` and `Notification Thread`. `Attach Listener` appears when a tool like `jcmd` connects. Only six are visible to `Thread.getAllStackTraces()`; the rest are JVM-internal.",
            },
            {
              question: "What happens to an exception thrown by a task passed to ExecutorService.submit()?",
              answer:
                "It's caught by the `FutureTask` and stored in the `Future`; nothing is printed and no uncaught exception handler runs. It only surfaces as an `ExecutionException` from `future.get()`. With `execute()`, the exception escapes the worker, the handler runs and the pool replaces the worker thread. Fire-and-forget `submit()` calls therefore lose failures silently.",
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
              question: "Walk through what happens at the OS level when Thread.start() is called.",
              answer:
                "`start()` locks the `Thread`, checks `threadStatus` is NEW and calls the native `start0`, bound to `JVM_StartThread`. That creates the native `JavaThread` and calls `os::create_thread`, which sets the stack size and calls `pthread_create`. glibc maps a 1 MB stack (`mmap ... MAP_STACK`) and calls `clone3(CLONE_VM | CLONE_FS | CLONE_FILES | CLONE_SIGHAND | CLONE_THREAD ...)`. The child starts in `thread_native_entry`, installs HotSpot's guard pages (16 KB `PROT_NONE`), touches the shadow zone, sets its name and signals the parent, which has been waiting; then the state becomes RUNNABLE and the child calls `run()`. I confirmed the chain with a gdb backtrace and `strace`.",
            },
            {
              question: "How much memory does a platform thread use?",
              answer:
                "It reserves `ThreadStackSize` of address space (1 MB on Linux x64) plus a glibc malloc arena reservation (128 MB virtual), but resident memory depends on what's touched. In NMT, 500 idle threads committed about 104 KB each and RSS grew about 100 KB per thread, the same with `-Xss256k`. Most of it is the 80 KB shadow zone (`StackShadowPages=20`), which a new thread touches; with 40 shadow pages, RSS grew another 73 KB per thread. A thread with deep stacks commits more, up to its `-Xss`.",
            },
            {
              question: "What does \"OutOfMemoryError: unable to create native thread\" mean, and how do you diagnose it?",
              answer:
                "`pthread_create` failed, almost always with `EAGAIN` because a task limit was reached: `ulimit -u` (which counts threads), the cgroup `pids.max` of the container, or `kernel.threads-max`; more rarely, address space or memory for the stack really ran out. The heap is usually fine (7 MB used in my reproduction). Check the `-Xlog:os+thread` warning that names `EAGAIN`, `Threads:` in `/proc/<pid>/status`, the container's `pids.max`, and a thread dump to see which threads are piling up.",
            },
            {
              question: "Why does Thread.start() synchronize, and why does run() go through runWith?",
              answer:
                "`start()` is `synchronized (this)` so that the check of `threadStatus` and the call to `start0()` are atomic: two threads racing to start the same `Thread` can't both pass the check. `run()` calls `runWith(bindings, task)` so that scoped-value bindings (a Java 21 preview feature, `ScopedValue`) captured at thread creation are in effect while the task runs. Both are visible with `javap -c -p java.lang.Thread`.",
            },
            {
              question: "How would you find which code is creating thousands of threads in a running service?",
              answer:
                "First confirm it: `/proc/<pid>/status` Threads, or `jvm_threads_live` over time. Then take a thread dump (`jcmd <pid> Thread.print`) and group by name prefix: pool names tell you which pool. If they're anonymous (`Thread-NNNN`), look at the bottom frames of their stacks, which show the `Runnable` they run. To find the creator, record JFR and print `jdk.ThreadStart` events, which include the parent thread and the stack trace of the `start()` call.",
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
              question: "A service in Kubernetes logs \"OutOfMemoryError: unable to create native thread\" but heap usage is at 30%. What do you check, and what do you do?",
              answer:
                "It's a task limit, not the heap. I'd check the pod's `pids.max` (`cat /sys/fs/cgroup/pids.max` inside the container) against `Threads:` in `/proc/1/status`, look for the `-Xlog:os+thread` warning with `EAGAIN`, and take a thread dump to see which threads dominate. In my reproduction with a 400-task limit, 381 handler threads plus 19 JVM and launcher tasks hit exactly 400.\n\nThe fix is to bound whatever creates threads (usually a thread per request or an unbounded `newCachedThreadPool`), not to raise the limit: raising it moves the failure further away and makes it bigger. Then alert on the live thread count.",
            },
            {
              question: "After an incident, the service is up and its health check passes, but it accepts no requests. The logs show one OutOfMemoryError: unable to create native thread an hour earlier. What happened?",
              answer:
                "The `OutOfMemoryError` is thrown in the thread that calls `start()`. If that was the acceptor or a consumer loop, and it didn't catch `Error`, that thread died while every other thread, including the health check endpoint, kept running. `BookingServer` reproduces it: the acceptor died after 381 requests and the other 2,619 were never accepted, while the process stayed alive.\n\nI'd confirm with a thread dump (the acceptor thread is missing) and the uncaught exception log. The fixes: a bounded pool so the error can't happen, a default uncaught exception handler that logs and alerts, and a health check that verifies the critical threads are alive (or a watchdog that exits so Kubernetes restarts the pod).",
            },
            {
              question: "One pod of a payment service sits at 100% of one core with no traffic. How do you find the cause?",
              answer:
                "`top -H -p <pid>` to find the TID using the CPU, then `jcmd <pid> Thread.print` and find the line with `[<tid>]` or `nid=<tid>` (decimal on JDK 21, hex on 17 and older). Two or three dumps a few seconds apart show whether it's stuck in the same place. In `HotThread`, TID 1081398 at 99.9% mapped straight to `surge-recalc` at line 8, a busy loop. If threads are unnamed, that's the first thing I'd fix afterwards, because the name alone would have answered the question from `top`.",
            },
            {
              question: "A teammate wants to give the order-placement thread MAX_PRIORITY and the reporting threads MIN_PRIORITY so that orders stay fast during report generation. What do you say?",
              answer:
                "That on Linux it does nothing by default: HotSpot ignores priorities (`os_prio=0`), and my pinned test gave priority 1 and 10 the same CPU share. Even with `-XX:ThreadPriorityPolicy=1`, a non-root process can only lower priorities. The reliable way to protect orders is to limit reporting: run it in its own small pool (or a separate service), so it can't take more than N threads' worth of CPU, and keep the order pool sized independently. If reporting is CPU-heavy, a separate process with its own CPU limit isolates it completely.",
            },
            {
              question: "A batch job starts a new Thread for each of 2 million records, each doing about 1 ms of work, and takes far longer than expected. Why, and what would you change?",
              answer:
                "Each thread costs about 100 µs to create and destroy (85 to 143 µs in my measurements), so 2 million threads add 3 to 5 minutes of pure overhead for 33 minutes of work at one thread, and if they overlap, thousands of threads compete for 8 cores with constant context switching. A pool of about the number of cores reusing its threads cost under 1 µs per task in my batched test. I'd submit the records (or chunks of them) to a fixed pool sized to the cores, or use a parallel stream, and check that the per-record work is truly CPU-bound.",
            },
            {
              question: "A code review shows a scheduled job that does `Thread worker = new Thread(task); worker.run();` and the author says it works fine. Is there a problem?",
              answer:
                "Yes: `run()` executes the task on the calling thread, so the `Thread` object is just an expensive wrapper and nothing runs in parallel. It \"works\" because the result is the same; it's slow, and if the caller is a scheduler or request thread, that thread is blocked for the whole task. `StartVsRun` showed two 300 ms tasks taking about 700 ms on `main`. If concurrency was intended, use `start()` (or better, submit to the scheduler's executor); if it wasn't, call `task.run()` and drop the `Thread`.",
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
            "Run any Java program that sleeps for a minute (`FreshJvm 60000`) and count its threads with `ls /proc/<pid>/task | wc -l`, then list them with `ps -L -o lwp,comm -p <pid>`.",
            "Create a `Thread` with a task that prints `Thread.currentThread().getName()`, give it a name, and call `run()`, then `start()`.",
            "Call `start()` on the same thread a second time, after `join()`.",
            "Start a thread whose task throws `new IllegalStateException(\"boom\")` with no handler, then print something from `main` afterwards and check the exit code with `echo $?`.",
            "Run `java -XX:+PrintFlagsFinal -version | grep ThreadStackSize`.",
            "Start threads with `Thread.ofPlatform().stackSize(256 * 1024)` and with 4 MB that recurse until `StackOverflowError`, printing the depth.",
            "If your system has systemd, run `UntilItBreaks` with `systemd-run --user --scope -q -p TasksMax=100`.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 shows about 18 tasks (19 if a tool has attached) for a JVM with G1 on an 8-core machine, the first named `java`. Step 2 prints `main` for `run()` and your thread's name for `start()`. Step 3 throws `IllegalThreadStateException`. Step 4 prints `Exception in thread \"Thread-0\" java.lang.IllegalStateException: boom` with a stack trace, then your message, and the exit code is 0. Step 5 shows `ThreadStackSize = 1024` (and `CompilerThreadStackSize` and `VMThreadStackSize`, also 1024). Step 6 overflowed at about 2,000 frames with 256 KB and at 100,000 to 255,000 with 4 MB in my runs; the exact depth varies with how much of the recursion the JIT has compiled. Step 7 starts 81 threads before `OutOfMemoryError: unable to create native thread`: 100 minus `main`, 17 JVM threads and the launcher.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `PROCESS    own address space, pid, fds; isolated; ~1,000 us to spawn
THREAD     shares heap, metaspace, code cache, fds
           private: stack (1 MB reserved), PC, registers, ThreadLocal, TLAB
PLATFORM   1 Java Thread = 1 kernel task (ps -L, /proc/<pid>/task, top -H)
           start() -> start0 -> JVM_StartThread -> os::create_thread
                   -> pthread_create -> clone3(CLONE_VM|CLONE_THREAD)
FRESH JVM  17 threads + launcher: GC, G1 conc/refine, VM Thread, C1, C2,
           Reference Handler, Finalizer, Signal Dispatcher, Common-Cleaner
CREATE     Runnable / lambda -> new Thread(task, name).start()
           Callable -> ExecutorService.submit -> Future.get
           Thread.ofPlatform().name("x-", 0).factory()   (Java 21)
RULES      run() = plain call on the caller; start() twice -> IllegalThreadState
           uncaught: thread dies, others go on; submit() hides it in the Future
           priorities: ignored on Linux (os_prio=0) unless ThreadPriorityPolicy=1
COST       ~100 us start+join; ~100 KB RSS idle (80 KB shadow zone)
           pool hand-off 0.7 us batched; process ~10x a thread
LIMITS     pids.max / ulimit -u -> OOM: unable to create native thread
           (EAGAIN, not heap); kills the thread calling start()
DUMPS      jcmd <pid> Thread.print: "name" #javaId [tid] ... nid=tid (decimal)`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A Java platform thread is a kernel task sharing the JVM's heap with every other thread. That sharing is what makes threads cheap to communicate through, and what makes unsynchronized access to shared fields lose updates.",
            "Creating a thread is one `start()` away, costs about 100 µs and 100 KB, and nothing limits how many you create: name them, handle their exceptions, and bound them with pools, because a task limit fails the thread that calls `start()`.",
            "Next: Thread States, join, sleep, interrupt and Daemon Threads, which follows a thread through its life cycle from NEW to TERMINATED, shows how to stop one cleanly with interrupts, and what daemon threads and shutdown hooks do when the JVM exits.",
          ],
        },
      ],
    },
  ],
};
