import type { Lesson } from "../types";

export const threadLifecycleAndControl: Lesson = {
  slug: "thread-lifecycle-and-control",
  date: "2026-11-14",
  title: "Thread States, join, sleep, interrupt and Daemon Threads",
  description:
    "A thread's life from NEW to TERMINATED on JDK 21, captured state by state with getState(), jcmd Thread.print and the kernel's own view (a RUNNABLE thread blocked in accept() is asleep in inet_csk_accept), join() as wait() on the Thread object, join(timeout) and join(Duration), sleep() precision and the locks it keeps, yield() as a sched_yield system call, interrupts in depth (the volatile flag, InterruptedException clearing it, interrupted() against isInterrupted(), restoring the flag, which blocking calls wake up and which don't: synchronized and classic socket reads don't, SocketChannel closes), a volatile flag that took 1.5 s to stop a worker against 0 ms for an interrupt, Thread.stop(), suspend() and resume() throwing UnsupportedOperationException, daemon threads whose finally blocks never run, shutdown hooks on return, System.exit, SIGTERM, SIGINT and SIGKILL, and a trip-reassignment worker that swallowed InterruptedException so every deploy ended in SIGKILL after the grace period.",
  tags: ["Multithreading", "Thread Lifecycle", "Interrupts", "Graceful Shutdown"],
  sections: [
    {
      title: "What the Thread Life Cycle Is",
      blocks: [
        {
          type: "paragraph",
          text: "The previous lesson, Processes, Threads and Creating Threads, followed `start()` all the way down to a kernel task and measured what a thread costs. That's the beginning of a thread's life. This lesson covers the rest: the states a thread passes through, how one thread waits for another (`join`), pauses (`sleep`, `yield`), asks another to stop (`interrupt`), and what happens to running threads when the JVM itself exits (daemon threads and shutdown hooks).",
        },
        {
          type: "paragraph",
          text: "`Thread.getState()` returns one of six values of the `Thread.State` enum: **NEW** (created, not started), **RUNNABLE** (running or able to run, which in Java also includes waiting for I/O), **BLOCKED** (waiting to enter a `synchronized` block), **WAITING** (waiting indefinitely for another thread: `wait()`, `join()`, `park()`), **TIMED_WAITING** (the same with a timeout, or `sleep`) and **TERMINATED**. These are the JVM's states, not the operating system's: the kernel only knows running, runnable and sleeping, and it reports a thread blocked in `accept()` as sleeping while Java says RUNNABLE.",
        },
        {
          type: "paragraph",
          text: "Java has no way to force a thread to stop. Stopping is **cooperative**: one thread sets another's interrupt flag, and the target notices it, either because a blocking method throws `InterruptedException` or because its own code checks the flag. Getting this right is what makes a service shut down in 100 ms instead of being killed after a 30 second grace period, which is the production story at the end.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 had both styles of stopping a thread: `interrupt()` for cooperation and `stop()` for force. `stop()` turned out to be unsafe (it releases every lock the thread holds at an arbitrary point, leaving objects half-updated), and `suspend()` deadlock-prone (a suspended thread keeps its locks), so Java 1.2 deprecated them and the JDK documentation \"Java Thread Primitive Deprecation\" explained why. It took another two decades to remove them. Meanwhile the states became an enum, shutdown hooks arrived for clean exits, and NIO made channel I/O interruptible.",
        },
        {
          type: "table",
          headers: ["Version", "Change", "Why it matters here"],
          rows: [
            ["Java 1.0 (1996)", "`join`, `sleep`, `yield`, `interrupt`, `isInterrupted`, `interrupted`, `setDaemon`, `stop`, `suspend`, `resume`", "The whole control API, good and bad"],
            ["Java 1.2 (1998)", "`stop`, `suspend`, `resume` deprecated", "Cooperative cancellation becomes the only safe way"],
            ["Java 1.3 (2000)", "`Runtime.addShutdownHook`", "Code that runs on SIGTERM and `System.exit`"],
            ["Java 1.4 (2002)", "NIO `InterruptibleChannel`, `ClosedByInterruptException`", "Channel I/O responds to interrupts"],
            ["Java 5 (2004)", "`Thread.State`, `LockSupport.park`, `java.util.concurrent` (whose blocking methods all throw `InterruptedException`)", "States you can query; WAITING (parking)"],
            ["Java 9 (2017)", "`Thread.onSpinWait()`", "A CPU hint for busy-wait loops"],
            ["Java 11 (2018)", "`Thread.destroy()` and `stop(Throwable)` removed", "First removals"],
            ["Java 14 and 18", "`suspend`/`resume` (14) and `stop` (18) deprecated for removal", "Compiler warnings become `[removal]` warnings"],
            ["Java 19 (2022)", "`join(Duration)` returning `boolean`, `sleep(Duration)`", "Timeouts without unit mistakes"],
            ["Java 20 (2023)", "By this release `stop`, `suspend` and `resume` all throw `UnsupportedOperationException`", "Verified on 21 below"],
            ["Java 21 (2023)", "Virtual threads final: always daemon, interrupt works on their socket I/O", "Covered in the virtual threads lesson"],
          ],
        },
      ],
    },
    {
      title: "A Real-Life Analogy",
      blocks: [
        {
          type: "paragraph",
          text: "Back to the dispatch office: a dispatcher's working day.",
        },
        {
          type: "list",
          items: [
            "**NEW** is a dispatcher who has been hired but hasn't come in yet. **TERMINATED** is one who has gone home; you can't call them back for the same shift.",
            "**RUNNABLE** is at the desk, working or ready to work. A dispatcher on hold with a partner's call centre is also RUNNABLE: they're at the desk, phone to ear, and from the office's point of view busy.",
            "**BLOCKED** is waiting outside the only meeting room (a `synchronized` block) while someone else is inside. **WAITING** is waiting for a colleague to say \"done\" (`join`, `wait`). **TIMED_WAITING** is a coffee break with an alarm (`sleep`).",
            "**An interrupt is a note on the desk saying \"please wrap up\".** A dispatcher on a break notices it at once (the break ends with `InterruptedException`); one at work only notices if they look at the desk. One who throws the note in the bin unread keeps working until security (SIGKILL) walks them out.",
            "**Daemon threads are contractors**: when the last employee leaves, the building closes with the contractors still inside, mid-task. **Shutdown hooks** are the closing checklist the last person runs on the way out.",
          ],
        },
        {
          type: "paragraph",
          text: "Where it breaks down: a person waiting outside the meeting room would read a note handed to them. A Java thread BLOCKED on a monitor, or blocked in a classic socket read, doesn't respond to an interrupt at all; only getting the lock or closing the socket releases it. And a contractor who's mid-task when the building closes would at least put the files back; a daemon thread's `finally` block simply never runs.",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/multithreading/thread-lifecycle-and-control-states.svg",
          alt: "A state diagram of Thread.State on JDK 21. NEW (constructed, not started) goes through start() to RUNNABLE, described as running on a CPU or ready to run, and also blocked in socket accept or read or file I/O, which the kernel reports as S, sleeping, in inet_csk_accept. RUNNABLE goes to TERMINATED when run() returns or throws; starting it again throws an exception. Below RUNNABLE, three states connected to it: BLOCKED when a monitor is held (entering synchronized, or re-entering after wait), shown in dumps as BLOCKED (on object monitor) with waiting to lock, and not woken by interrupt; WAITING for a signal (obj.wait(), t.join(), LockSupport.park()), shown as WAITING (on object monitor) or WAITING (parking), woken by interrupt, where park returns quietly; TIMED_WAITING with a timeout (sleep, wait, join with milliseconds, parkNanos), shown as TIMED_WAITING (sleeping), where sleep keeps every lock it holds, woken by interrupt, where sleep throws. A box at the bottom: interrupt() sets a volatile flag, unparks the thread and closes an InterruptibleChannel it is blocked on; throwing InterruptedException clears the flag, so catch it and restore it or stop; not woken are BLOCKED on synchronized, a classic Socket read (close the socket) and a loop that never checks the flag.",
          caption: "Six states, the calls that lead to each, and which of them an interrupt can end.",
        },
        {
          type: "heading",
          text: "The states and how they show up",
        },
        {
          type: "table",
          headers: ["`Thread.State`", "Entered by", "Left by", "`jcmd Thread.print` shows"],
          rows: [
            ["NEW", "`new Thread(...)`", "`start()`", "Not listed (no OS thread yet)"],
            ["RUNNABLE", "`start()`; any wait ending", "Blocking on a monitor, waiting, finishing", "`runnable`, `State: RUNNABLE` (also in `Net.accept`, `read`)"],
            ["BLOCKED", "Entering a `synchronized` block or method someone else holds; re-acquiring after `wait()`", "Getting the monitor", "`waiting for monitor entry`, `BLOCKED (on object monitor)`, `- waiting to lock <0x...>`"],
            ["WAITING", "`Object.wait()`, `Thread.join()`, `LockSupport.park()` (so every `java.util.concurrent` lock and queue)", "`notify`/`notifyAll`, the joined thread ending, `unpark`, interrupt", "`in Object.wait()`, `WAITING (on object monitor)` or `WAITING (parking)`"],
            ["TIMED_WAITING", "`sleep(ms)`, `wait(ms)`, `join(ms)`, `parkNanos`, `parkUntil`", "Timeout, or the same signals as WAITING", "`TIMED_WAITING (sleeping)`, `(on object monitor)` or `(parking)`"],
            ["TERMINATED", "`run()` returned or threw", "Never", "Not listed"],
          ],
        },
        {
          type: "heading",
          text: "The control methods",
        },
        {
          type: "table",
          headers: ["Method", "What it does", "Throws / returns"],
          rows: [
            ["`t.join()`, `t.join(ms)`, `t.join(Duration)`", "Waits for `t` to terminate; implemented as `wait()` on `t`", "`InterruptedException`; `join(Duration)` returns whether `t` terminated"],
            ["`Thread.sleep(ms)`, `sleep(Duration)`", "Pauses the current thread, **keeping all its locks**", "`InterruptedException`; `IllegalArgumentException` for negative times"],
            ["`Thread.yield()`", "Hint: let another runnable thread use this CPU", "Nothing; a `sched_yield` system call on Linux"],
            ["`t.interrupt()`", "Sets `t`'s flag, wakes it from sleep/wait/park, closes an interruptible channel", "Nothing"],
            ["`t.isInterrupted()`", "Reads `t`'s flag", "`boolean`, flag unchanged"],
            ["`Thread.interrupted()`", "Reads **and clears** the current thread's flag", "`boolean`"],
            ["`t.setDaemon(b)`", "Marks a thread as daemon; only before `start()`", "`IllegalThreadStateException` after start"],
            ["`Runtime.addShutdownHook(t)`", "Registers an unstarted thread to run at JVM shutdown", "`IllegalStateException` once shutdown has begun"],
            ["`t.stop()`, `suspend()`, `resume()`", "Nothing any more", "`UnsupportedOperationException` on 21"],
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "Capturing every state",
        },
        {
          type: "paragraph",
          text: "I wanted to see each state from a real thread, not from a diagram. States change asynchronously, so the program polls until the thread reaches the expected one:",
        },
        {
          type: "code",
          language: "java",
          title: "ThreadStates.java",
          code: `import java.io.InputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.locks.LockSupport;

public class ThreadStates {
    static final Object DRIVER_LOCK = new Object();

    static void show(String label, Thread t) {
        System.out.printf("%-34s %s%n", label, t.getState());
    }

    // Poll until the thread reaches the expected state (states change asynchronously)
    static void await(Thread t, Thread.State expected) throws InterruptedException {
        for (int i = 0; i < 200 && t.getState() != expected; i++) Thread.sleep(5);
    }

    public static void main(String[] args) throws Exception {
        Thread spinner = new Thread(() -> { long n = 0; while (!Thread.currentThread().isInterrupted()) n++; }, "spinner");
        show("new Thread(...)", spinner);                          // NEW
        spinner.start();
        show("started, spinning on a CPU", spinner);               // RUNNABLE

        Thread blocked = new Thread(() -> { synchronized (DRIVER_LOCK) { } }, "blocked");
        synchronized (DRIVER_LOCK) {                               // main holds the monitor
            blocked.start();
            await(blocked, Thread.State.BLOCKED);
            show("waiting to enter synchronized", blocked);       // BLOCKED
        }

        Thread waiting = new Thread(() -> {
            synchronized (DRIVER_LOCK) {
                try { DRIVER_LOCK.wait(); } catch (InterruptedException e) { }
            }
        }, "waiting");
        waiting.start();
        await(waiting, Thread.State.WAITING);
        show("in Object.wait()", waiting);                         // WAITING

        Thread parked = new Thread(LockSupport::park, "parked");
        parked.start();
        await(parked, Thread.State.WAITING);
        show("in LockSupport.park()", parked);                     // WAITING

        Thread joiner = new Thread(() -> { try { waiting.join(); } catch (InterruptedException e) { } }, "joiner");
        joiner.start();
        await(joiner, Thread.State.WAITING);
        show("in join() on a live thread", joiner);                // WAITING

        Thread sleeper = new Thread(() -> { try { Thread.sleep(60_000); } catch (InterruptedException e) { } }, "sleeper");
        sleeper.start();
        await(sleeper, Thread.State.TIMED_WAITING);
        show("in sleep(60 s)", sleeper);                           // TIMED_WAITING

        try (ServerSocket server = new ServerSocket(0);
             Socket client = new Socket("localhost", server.getLocalPort());
             Socket accepted = server.accept()) {
            Thread reader = new Thread(() -> {
                try (InputStream in = accepted.getInputStream()) { in.read(); } catch (Exception e) { }
            }, "socket-reader");
            reader.start();
            Thread.sleep(200);
            show("blocked in socket read()", reader);              // RUNNABLE, even though it is waiting
            client.close();                                        // EOF lets it finish
            reader.join();
        }

        Thread done = new Thread(() -> { }, "done");
        done.start();
        done.join();
        show("after run() returned", done);                        // TERMINATED

        spinner.interrupt(); sleeper.interrupt(); waiting.interrupt(); LockSupport.unpark(parked);
    }
}`,
        },
        {
          type: "output",
          text: `new Thread(...)                    NEW
started, spinning on a CPU         RUNNABLE
waiting to enter synchronized      BLOCKED
in Object.wait()                   WAITING
in LockSupport.park()              WAITING
in join() on a live thread         WAITING
in sleep(60 s)                     TIMED_WAITING
blocked in socket read()           RUNNABLE
after run() returned               TERMINATED`,
        },
        {
          type: "paragraph",
          text: "The output was identical in three runs. Three different calls (`wait`, `park`, `join`) give the same WAITING, and a thread that has been waiting 200 ms for bytes from a socket is RUNNABLE. That last one matters in production: a thread dump full of RUNNABLE threads doesn't mean the CPU is busy. They may all be waiting for a slow database.",
        },
        {
          type: "heading",
          text: "The same states in a thread dump",
        },
        {
          type: "code",
          language: "java",
          title: "StatesDump.java",
          code: `import java.net.ServerSocket;
import java.util.concurrent.locks.LockSupport;

public class StatesDump {
    static final Object TRIP_LOCK = new Object();

    public static void main(String[] args) throws Exception {
        Thread holder = new Thread(() -> {
            synchronized (TRIP_LOCK) { sleepQuietly(10_000); }   // holds the monitor while sleeping
        }, "lock-holder");
        holder.start();
        Thread.sleep(100);
        new Thread(() -> { synchronized (TRIP_LOCK) { } }, "lock-waiter").start();
        new Thread(LockSupport::park, "parked").start();
        Object signal = new Object();
        new Thread(() -> {
            synchronized (signal) { try { signal.wait(); } catch (InterruptedException e) { } }
        }, "object-waiter").start();
        ServerSocket server = new ServerSocket(0);
        new Thread(() -> { try { server.accept(); } catch (Exception e) { } }, "acceptor").start();
        System.out.println("pid " + ProcessHandle.current().pid());
        Thread.sleep(5_000);
        System.exit(0);
    }

    static void sleepQuietly(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: "java StatesDump & sleep 1.5; jcmd $! Thread.print",
        },
        {
          type: "output",
          text: `"lock-holder" #20 [1133964] prio=5 os_prio=0 cpu=0.24ms elapsed=1.72s tid=0x000072ec601736e0 nid=1133964 waiting on condition  [0x000072ebee284000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.lang.Thread.sleep0(java.base@21.0.13.0.3/Native Method)
	at java.lang.Thread.sleep(java.base@21.0.13.0.3/Thread.java:509)
	at StatesDump.sleepQuietly(StatesDump.java:27)
	at StatesDump.lambda$main$0(StatesDump.java:9)
	- locked <0x000000008df14918> (a java.lang.Object)
	...

"lock-waiter" #21 [1133965] prio=5 os_prio=0 cpu=0.27ms elapsed=1.62s tid=0x000072ec60175600 nid=1133965 waiting for monitor entry  [0x000072ebee184000]
   java.lang.Thread.State: BLOCKED (on object monitor)
	at StatesDump.lambda$main$1(StatesDump.java:13)
	- waiting to lock <0x000000008df14918> (a java.lang.Object)
	...

"parked" #22 [1133966] prio=5 os_prio=0 cpu=0.18ms elapsed=1.61s tid=0x000072ec60176970 nid=1133966 waiting on condition  [0x000072ebee084000]
   java.lang.Thread.State: WAITING (parking)
	at jdk.internal.misc.Unsafe.park(java.base@21.0.13.0.3/Native Method)
	at java.util.concurrent.locks.LockSupport.park(java.base@21.0.13.0.3/LockSupport.java:371)
	...

"object-waiter" #23 [1133967] prio=5 os_prio=0 cpu=0.17ms elapsed=1.61s tid=0x000072ec60178880 nid=1133967 in Object.wait()  [0x000072ebedf84000]
   java.lang.Thread.State: WAITING (on object monitor)
	at java.lang.Object.wait0(java.base@21.0.13.0.3/Native Method)
	- waiting on <0x000000008df29810> (a java.lang.Object)
	at java.lang.Object.wait(java.base@21.0.13.0.3/Object.java:366)
	at java.lang.Object.wait(java.base@21.0.13.0.3/Object.java:339)
	at StatesDump.lambda$main$2(StatesDump.java:17)
	- locked <0x000000008df29810> (a java.lang.Object)
	...

"acceptor" #24 [1133968] prio=5 os_prio=0 cpu=1.29ms elapsed=1.60s tid=0x000072ec60180160 nid=1133968 runnable  [0x000072ebede84000]
   java.lang.Thread.State: RUNNABLE
	at sun.nio.ch.Net.accept(java.base@21.0.13.0.3/Native Method)
	at sun.nio.ch.NioSocketImpl.accept(java.base@21.0.13.0.3/NioSocketImpl.java:748)
	...
	at StatesDump.lambda$main$3(StatesDump.java:20)`,
        },
        {
          type: "list",
          items: [
            "**`sleep` keeps the lock.** `lock-holder` is TIMED_WAITING (sleeping) and its stack still says `- locked <0x000000008df14918>`; `lock-waiter` is BLOCKED with `- waiting to lock <0x000000008df14918>`, the same address. Sleeping inside a `synchronized` block stalls every thread that needs that lock for the whole sleep.",
            "**`wait()` releases it.** `object-waiter` shows `- waiting on <0x...810>` and `- locked <0x...810>` for the same object: it entered the monitor, then `wait()` released it while waiting (the dump prints the `locked` line from the frame that entered it). That's the difference between `sleep` and `wait`, and `wait`/`notify` are the subject of the next lesson.",
            "**`WAITING (parking)`** is what every `java.util.concurrent` lock, queue, latch and future produces, because they're all built on `LockSupport.park`. A dump full of `parking` threads points at `ReentrantLock`, `BlockingQueue.take` or `Future.get`; the frame below `park` tells you which.",
            "**The header text and the state line say different things on purpose.** `waiting on condition` is HotSpot's description of the OS-level wait (used for both sleep and park), `waiting for monitor entry` means BLOCKED, and `runnable` means the JVM considers the thread to be running Java or native code.",
          ],
        },
        {
          type: "heading",
          text: "What the kernel sees",
        },
        {
          type: "code",
          language: "bash",
          code: "ps -L -o lwp,stat,wchan:22,comm -p <pid>",
        },
        {
          type: "output",
          text: `    LWP STAT WCHAN                  COMMAND
1134383 Sl   futex_do_wait          lock-holder
1134385 Sl   futex_do_wait          lock-waiter
1134386 Sl   futex_do_wait          parked
1134387 Sl   futex_do_wait          object-waiter
1134388 Sl   inet_csk_accept        acceptor`,
        },
        {
          type: "paragraph",
          text: "All five are `S` (interruptible sleep) to the kernel. Four Java states (TIMED_WAITING, BLOCKED, WAITING, WAITING) are the same thing underneath: a `futex` wait, because HotSpot implements sleeping, parking and monitor waits on pthread condition variables and mutexes, which sit on futexes. The \"RUNNABLE\" acceptor is asleep in the kernel's TCP accept code. Java states describe what the program is waiting **for**; the kernel only knows whether the thread wants a CPU.",
        },
        {
          type: "heading",
          text: "join() is wait() on the Thread object",
        },
        {
          type: "code",
          language: "bash",
          code: "javap -c -p java.lang.Thread   # public final void join(long)",
        },
        {
          type: "output",
          text: `  public final void join(long) throws java.lang.InterruptedException;
    Code:
       3: ifge          16
       6: new           #72                 // class java/lang/IllegalArgumentException
      ...
      21: instanceof    #43                 // class java/lang/VirtualThread
      ...
      52: invokevirtual #482                // Method java/lang/VirtualThread.joinNanos:(J)Z
      ...
      60: monitorenter
      ...
      68: invokevirtual #479                // Method isAlive:()Z
      ...
      85: invokevirtual #489                // Method java/lang/Object.wait:(J)V
      ...
     121: invokevirtual #479                // Method isAlive:()Z
      ...
     129: invokevirtual #489                // Method java/lang/Object.wait:(J)V
     132: goto          120
     136: monitorexit`,
        },
        {
          type: "list",
          items: [
            "**For platform threads, `join` is `synchronized (this) { while (isAlive()) wait(...); }`**: the joining thread waits on the `Thread` object's own monitor. When a thread terminates, the JVM calls `notifyAll()` on its `Thread` object, which wakes every joiner. Virtual threads take a different path (`joinNanos`).",
            "**That's why `join` shows up as `in Object.wait()` / `WAITING (on object monitor)`** with `- waiting on <...> (a java.lang.Thread)` in dumps, as the production section shows.",
            "**It's also why you should never use a `Thread` object as a lock or call `wait`/`notify` on it**: the JVM's own `notifyAll` at thread exit would wake your waiters, and your `notify` could wake a joiner that then re-checks `isAlive()`.",
          ],
        },
        {
          type: "heading",
          text: "interrupt() is a flag, an unpark and a channel close",
        },
        {
          type: "code",
          language: "bash",
          code: `javap -p java.lang.Thread | grep -iE 'interrupt|blocker'
javap -c -p java.lang.Thread   # public void interrupt()`,
        },
        {
          type: "output",
          text: `  volatile boolean interrupted;
  final java.lang.Object interruptLock;
  private volatile java.lang.Object parkBlocker;
  volatile sun.nio.ch.Interruptible nioBlocker;
  ...
  public void interrupt();
  public static boolean interrupted();
  public boolean isInterrupted();
  ...
  private native void interrupt0();
  private static native void clearInterruptEvent();
       1: invokestatic  #1                  // Method currentThread:()Ljava/lang/Thread;
       8: invokevirtual #419                // Method checkAccess:()V
      13: putfield      #421                // Field interrupted:Z
      17: invokevirtual #425                // Method interrupt0:()V
      21: invokestatic  #1                  // Method currentThread:()Ljava/lang/Thread;
      28: getfield      #32                 // Field interruptLock:Ljava/lang/Object;
      33: monitorenter
      35: getfield      #35                 // Field nioBlocker:Lsun/nio/ch/Interruptible;
      45: invokeinterface #428,  2          // InterfaceMethod sun/nio/ch/Interruptible.interrupt:(Ljava/lang/Thread;)V
      51: monitorexit`,
        },
        {
          type: "list",
          items: [
            "**Step 1: `interrupted = true`.** On JDK 21 the flag is a plain `volatile boolean` field of `Thread` (older JDKs kept it only inside the JVM). `isInterrupted()` reads it; `Thread.interrupted()` reads it and sets it back to `false`.",
            "**Step 2: `interrupt0()`**, the native `JVM_Interrupt`, which unparks the target's internal events: a thread in `sleep`, `wait` or `park` wakes up, sees the flag and either throws `InterruptedException` (sleep, wait, join) or simply returns (park).",
            "**Step 3: `nioBlocker.interrupt(this)`.** If the thread is blocked in an operation on an `InterruptibleChannel` (NIO `SocketChannel`, `FileChannel`), it registered itself in `nioBlocker`, and interrupting it **closes the channel**. The blocked read then fails with `ClosedByInterruptException`.",
            "**There is no step 4.** Nothing touches a thread that's BLOCKED on a monitor, running a loop, or inside a classic `Socket` read. Those threads only see the flag if their own code reads it.",
          ],
        },
        {
          type: "heading",
          text: "When main returns: DestroyJavaVM",
        },
        {
          type: "code",
          language: "java",
          title: "MainReturns.java",
          code: `public class MainReturns {
    public static void main(String[] args) {
        Thread uploader = new Thread(() -> {
            try { Thread.sleep(3_000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }, "receipt-uploader");                                      // a user (non-daemon) thread
        uploader.start();
        System.out.println("main returns; pid " + ProcessHandle.current().pid());
    }
}`,
        },
        {
          type: "output",
          text: `main returns; pid 1266769
"receipt-uploader" #20 [1266788] prio=5 os_prio=0 cpu=0.27ms elapsed=1.19s tid=0x0000791d141837b0 nid=1266788 waiting on condition  [0x0000791ca2d2d000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
--
"DestroyJavaVM" #21 [1266771] prio=5 os_prio=0 cpu=50.12ms elapsed=1.17s tid=0x0000791d14019920 nid=1266771 waiting on condition  [0x0000000000000000]
   java.lang.Thread.State: RUNNABLE`,
        },
        {
          type: "paragraph",
          text: "A second after `main` returned, there's no `main` thread in the dump but a `DestroyJavaVM` thread whose kernel TID (1266771) and CPU time (50 ms) are main's: the launcher reattaches the same OS thread under a new name and calls `DestroyJavaVM`, which waits until the last **non-daemon** thread has finished. Here that's `receipt-uploader`, sleeping for 3 seconds. Only then does the JVM run shutdown hooks and exit. Daemon threads are not waited for: at the final safepoint they're simply stopped where they are.",
        },
      ],
    },
    {
      title: "join, sleep and yield",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "JoinAndSleep.java",
          code: `import java.time.Duration;

public class JoinAndSleep {
    static long ms(long since) { return (System.nanoTime() - since) / 1_000_000; }

    public static void main(String[] args) throws Exception {
        Thread eta = new Thread(() -> sleep(400), "eta-lookup");
        long start = System.nanoTime();
        eta.start();
        long t0 = System.nanoTime();
        eta.join(100);                                             // gives up after 100 ms
        System.out.println("join(100) waited " + ms(t0) + " ms, alive=" + eta.isAlive());
        t0 = System.nanoTime();
        boolean finished = eta.join(Duration.ofMillis(100));       // Java 19: tells you which happened
        System.out.println("join(Duration.ofMillis(100)) waited " + ms(t0) + " ms, returned " + finished);
        t0 = System.nanoTime();
        eta.join();                                                // waits as long as it takes
        System.out.println("join() waited " + ms(t0) + " ms; thread finished " + ms(start) + " ms after start, alive=" + eta.isAlive());

        Thread neverStarted = new Thread(() -> { });
        t0 = System.nanoTime();
        neverStarted.join();                                       // NEW is not alive: returns at once
        System.out.println("join() on a NEW thread returned after " + ms(t0) + " ms");

        // sleep() precision: ask for 1 ms a thousand times
        long worst = 0, total = 0;
        for (int i = 0; i < 1_000; i++) {
            long s = System.nanoTime();
            Thread.sleep(1);
            long took = System.nanoTime() - s;
            total += took;
            worst = Math.max(worst, took);
        }
        System.out.printf("sleep(1): average %.3f ms, worst %.3f ms%n", total / 1_000 / 1e6, worst / 1e6);

        Thread.sleep(Duration.ofMillis(5));                        // Java 19 overload
        Thread.sleep(0, 500_000);                                  // millis + nanos
        System.out.println("sleep(0) is allowed, sleep(-1) is not:");
        try {
            Thread.sleep(-1);
        } catch (IllegalArgumentException e) {
            System.out.println("  " + e);
        }
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}`,
        },
        {
          type: "output",
          text: `join(100) waited 100 ms, alive=true
join(Duration.ofMillis(100)) waited 100 ms, returned false
join() waited 184 ms; thread finished 402 ms after start, alive=false
join() on a NEW thread returned after 0 ms
sleep(1): average 1.106 ms, worst 4.206 ms
sleep(0) is allowed, sleep(-1) is not:
  java.lang.IllegalArgumentException: timeout value is negative`,
        },
        {
          type: "list",
          items: [
            "**`join(100)` returns after 100 ms whether or not the thread finished**, and returns `void`, so you have to check `isAlive()` afterwards. `join(Duration)` (Java 19) returns `false` on timeout, which is harder to get wrong.",
            "**`join()` on a thread that was never started returns immediately**: NEW isn't alive. Code that joins a list of threads it forgot to start finishes instantly, with no results.",
            "**`sleep(1)` slept 1.09 to 1.12 ms on average and up to 4.2 ms** in three runs. `sleep` guarantees *at least* the time asked, rounded up by the kernel's timer slack and scheduling. It's fine for pacing and backoff; it's useless as a clock. Over many iterations, the 10% overshoot accumulates, which is why scheduled work should compute the next deadline rather than sleep a fixed amount.",
            "**`Thread.yield()` is a system call.** It measured 692 to 869 ns per call, and `strace -c` counted 3,000,002 `sched_yield` calls for 3 million yields. It tells the scheduler \"I can wait\", and if no other thread wants this CPU, it returns at once. The Javadoc says it's rarely appropriate; for spin-waiting, `Thread.onSpinWait()` (a CPU `PAUSE` instruction, not a system call) is the modern hint.",
          ],
        },
        {
          type: "callout",
          tone: "note",
          title: "sleep against wait",
          text: "`sleep` is a static method on `Thread` that pauses the current thread and keeps every lock it holds. `wait` is an instance method on `Object` that must be called while holding that object's monitor, releases it while waiting, and returns when another thread calls `notify` or `notifyAll` (or spuriously). The next lesson, synchronized, Monitors and Race Conditions, covers `wait` and `notify` properly.",
        },
      ],
    },
    {
      title: "Interrupts in Depth",
      blocks: [
        {
          type: "heading",
          text: "The flag, the exception and restoring it",
        },
        {
          type: "code",
          language: "java",
          title: "InterruptBasics.java",
          code: `public class InterruptBasics {
    public static void main(String[] args) throws Exception {
        // 1. Interrupting a running thread only sets a flag
        Thread self = Thread.currentThread();
        self.interrupt();
        System.out.println("1. isInterrupted()        " + self.isInterrupted());   // reads, keeps the flag
        System.out.println("   isInterrupted() again  " + self.isInterrupted());
        System.out.println("   Thread.interrupted()   " + Thread.interrupted());   // reads AND clears
        System.out.println("   Thread.interrupted()   " + Thread.interrupted());

        // 2. A blocking call that sees the flag throws InterruptedException and clears it
        Thread sleeper = new Thread(() -> {
            long t0 = System.nanoTime();
            try {
                Thread.sleep(10_000);
            } catch (InterruptedException e) {
                System.out.printf("2. woke after %d ms with %s, flag now %b%n",
                        (System.nanoTime() - t0) / 1_000_000, e, Thread.currentThread().isInterrupted());
            }
        }, "sleeper");
        sleeper.start();
        Thread.sleep(100);
        sleeper.interrupt();
        sleeper.join();

        // 3. Interrupt BEFORE the blocking call: sleep throws immediately
        Thread early = new Thread(() -> {
            Thread.currentThread().interrupt();
            long t0 = System.nanoTime();
            try {
                Thread.sleep(10_000);
            } catch (InterruptedException e) {
                System.out.println("3. pre-set flag: sleep threw after " + (System.nanoTime() - t0) / 1_000 + " us");
            }
        });
        early.start();
        early.join();

        // 4. Restoring the flag so callers further up can see it
        Thread restorer = new Thread(() -> {
            try {
                Thread.sleep(10_000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();                 // restore: the right default
            }
            System.out.println("4. after restoring, isInterrupted() = " + Thread.currentThread().isInterrupted());
        });
        restorer.start();
        restorer.interrupt();
        restorer.join();

        // 5. A loop that never checks the flag never stops
        Thread deaf = new Thread(() -> {
            long spins = 0;
            while (true) spins++;                                   // no blocking call, no flag check
        }, "deaf");
        deaf.setDaemon(true);                                       // so the demo can exit
        deaf.start();
        deaf.interrupt();
        deaf.join(1_500);
        System.out.println("5. 1.5 s after interrupt(): deaf is " + deaf.getState() + ", isInterrupted=" + deaf.isInterrupted());
    }
}`,
        },
        {
          type: "output",
          text: `1. isInterrupted()        true
   isInterrupted() again  true
   Thread.interrupted()   true
   Thread.interrupted()   false
2. woke after 100 ms with java.lang.InterruptedException: sleep interrupted, flag now false
3. pre-set flag: sleep threw after 61 us
4. after restoring, isInterrupted() = true
5. 1.5 s after interrupt(): deaf is RUNNABLE, isInterrupted=true`,
        },
        {
          type: "list",
          items: [
            "**1. `isInterrupted()` reads, `Thread.interrupted()` reads and clears.** The static one, called twice, gave `true` then `false`. It's static because it only works on the current thread, and it's the one to use when you've consumed the interrupt and are handling it. Mixing them up either loses interrupts or reacts to the same one twice.",
            "**2. A sleeping thread woke 100 ms into a 10 second sleep** with `InterruptedException: sleep interrupted`, and inside the `catch` the flag was **already `false`**. Throwing the exception is how the interrupt is delivered, so the JVM clears the flag. If the `catch` block doesn't stop the thread or set the flag again, the interrupt is gone.",
            "**3. An interrupt that arrives before the blocking call isn't lost**: with the flag already set, `sleep` threw within 26 to 61 µs without sleeping at all. That's why setting the flag (rather than ignoring the exception) works: the next blocking call sees it.",
            "**4. Restoring is one line**, `Thread.currentThread().interrupt()`, and it's the right default for any code that catches `InterruptedException` but doesn't own the thread (library code, a task in a pool). The owner of the thread, further up, can then see the request and stop. The Exception Handling Best Practices lesson showed the same rule from the exceptions side.",
            "**5. A loop that never blocks and never checks the flag can't be interrupted.** 1.5 seconds later, `deaf` was still RUNNABLE with its flag `true`. Interrupts are requests; only the target's code can act on them. Long CPU-bound loops need an explicit `if (Thread.currentThread().isInterrupted())` check.",
          ],
        },
        {
          type: "heading",
          text: "Which blocking calls an interrupt can end",
        },
        {
          type: "code",
          language: "java",
          title: "InterruptBlocking.java",
          code: `import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import java.util.concurrent.LinkedBlockingQueue;

public class InterruptBlocking {
    static final Object LOCK = new Object();

    // Start a thread, interrupt it after 200 ms, and report what happened 300 ms later
    static void probe(String label, Runnable body) throws Exception {
        Thread t = new Thread(() -> {
            try {
                body.run();
                System.out.printf("%-28s returned normally, flag=%b%n", label, Thread.currentThread().isInterrupted());
            } catch (RuntimeException e) {
                Throwable c = e.getCause() != null ? e.getCause() : e;
                System.out.printf("%-28s -> %s, flag=%b%n", label, c.getClass().getSimpleName(), Thread.currentThread().isInterrupted());
            }
        }, label);
        t.setDaemon(true);
        t.start();
        Thread.sleep(200);
        t.interrupt();
        t.join(300);
        if (t.isAlive()) System.out.printf("%-28s still %s 300 ms after interrupt()%n", label, t.getState());
    }

    public static void main(String[] args) throws Exception {
        probe("BlockingQueue.take()", () -> {
            try { new LinkedBlockingQueue<String>().take(); } catch (InterruptedException e) { throw new RuntimeException(e); }
        });

        synchronized (LOCK) {                                        // main holds the monitor throughout
            probe("entering synchronized", () -> { synchronized (LOCK) { } });
        }

        try (ServerSocket server = new ServerSocket(0);
             Socket client = new Socket("localhost", server.getLocalPort());
             Socket peer = server.accept()) {
            probe("Socket InputStream.read()", () -> {
                try (InputStream in = peer.getInputStream()) { in.read(); } catch (Exception e) { throw new RuntimeException(e); }
            });
            peer.close();                                            // the only way to unblock it
            Thread.sleep(100);
        }

        try (ServerSocketChannel server = ServerSocketChannel.open().bind(new InetSocketAddress("localhost", 0));
             SocketChannel client = SocketChannel.open(server.getLocalAddress());
             SocketChannel peer = server.accept()) {
            probe("SocketChannel.read()", () -> {
                try { peer.read(ByteBuffer.allocate(16)); } catch (Exception e) { throw new RuntimeException(e); }
            });
            System.out.println("  channel still open after the interrupt? " + peer.isOpen());
        }
    }
}`,
        },
        {
          type: "output",
          text: `BlockingQueue.take()         -> InterruptedException, flag=false
entering synchronized        still BLOCKED 300 ms after interrupt()
entering synchronized        returned normally, flag=true
Socket InputStream.read()    still RUNNABLE 300 ms after interrupt()
Socket InputStream.read()    -> SocketException, flag=true
SocketChannel.read()         -> ClosedByInterruptException, flag=true
  channel still open after the interrupt? false`,
        },
        {
          type: "table",
          headers: ["Blocked in", "Effect of `interrupt()`", "How to unblock it"],
          rows: [
            ["`sleep`, `wait`, `join`", "Throws `InterruptedException`, flag cleared", "Interrupt"],
            ["`BlockingQueue.take`, `Future.get`, `lockInterruptibly`, `CountDownLatch.await`", "Throws `InterruptedException`, flag cleared", "Interrupt"],
            ["`LockSupport.park`", "Returns normally, flag stays set", "Interrupt (caller must check the flag)"],
            ["Entering `synchronized`", "Nothing; still BLOCKED (flag set for later)", "Release the monitor; or use `ReentrantLock.lockInterruptibly`"],
            ["`ReentrantLock.lock()`", "Nothing; keeps waiting", "Use `lockInterruptibly` or `tryLock(timeout)`"],
            ["Classic `Socket` `InputStream.read`, `ServerSocket.accept`", "Nothing; still RUNNABLE", "Close the socket (`SocketException`), or set `setSoTimeout`"],
            ["NIO `SocketChannel`, `FileChannel`", "Channel **closed**, `ClosedByInterruptException`", "Interrupt (but the channel is gone)"],
            ["A CPU loop", "Nothing", "The loop must check `isInterrupted()`"],
          ],
        },
        {
          type: "list",
          items: [
            "The BLOCKED thread finished normally **with its flag still set** once `main` released the lock: the interrupt wasn't lost, just not acted on. Its next blocking call would throw.",
            "The classic socket read ignored the interrupt for as long as I waited and ended only when I closed the socket, with a `SocketException`. On JDK 21, `Socket` is implemented with NIO internally (`NioSocketImpl`, JEP 353), but for platform threads it keeps the old, uninterruptible behaviour. Socket reads should always have a timeout (`setSoTimeout`), so that a dead peer can't hold a thread forever.",
            "The `SocketChannel` read was ended by **closing the channel**. That's a surprise the first time: an interrupt meant to cancel one read destroys the connection, and in a connection pool it can kill a connection other code was about to use.",
          ],
        },
        {
          type: "heading",
          text: "Cooperative cancellation: a volatile flag or the interrupt",
        },
        {
          type: "code",
          language: "java",
          title: "FlagVsInterrupt.java",
          code: `public class FlagVsInterrupt {
    // Version 1: a volatile flag. Visible to the worker, but it can't wake a sleep.
    static class FlagWorker implements Runnable {
        volatile boolean running = true;
        int rounds;
        public void run() {
            while (running) {
                rounds++;                                            // "reassign stale trips"
                try {
                    Thread.sleep(2_000);                             // wait for the next round
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    // Version 2: the interrupt is the stop signal, and it does wake the sleep.
    static class InterruptWorker implements Runnable {
        int rounds;
        public void run() {
            while (!Thread.currentThread().isInterrupted()) {
                rounds++;
                try {
                    Thread.sleep(2_000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();              // keep the flag set, the loop condition ends it
                }
            }
        }
    }

    public static void main(String[] args) throws Exception {
        FlagWorker fw = new FlagWorker();
        Thread a = new Thread(fw, "flag-worker");
        a.start();
        Thread.sleep(500);
        long t0 = System.nanoTime();
        fw.running = false;
        a.join();
        System.out.printf("volatile flag: stopped after %4d ms (%d round)%n", (System.nanoTime() - t0) / 1_000_000, fw.rounds);

        InterruptWorker iw = new InterruptWorker();
        Thread b = new Thread(iw, "interrupt-worker");
        b.start();
        Thread.sleep(500);
        t0 = System.nanoTime();
        b.interrupt();
        b.join();
        System.out.printf("interrupt():   stopped after %4d ms (%d round)%n", (System.nanoTime() - t0) / 1_000_000, iw.rounds);
    }
}`,
        },
        {
          type: "output",
          text: `volatile flag: stopped after 1500 ms (1 round)
interrupt():   stopped after    0 ms (1 round)`,
        },
        {
          type: "list",
          items: [
            "**The volatile flag stopped the worker 1,500 ms late**, in all three runs: the worker was 500 ms into a 2 second sleep, and nothing woke it. The flag is only read between rounds. With a 30 second poll interval, that's a 30 second shutdown.",
            "**The interrupt stopped it in under a millisecond**, because it woke the sleep. The loop checks `isInterrupted()`, and the `catch` restores the flag so the check sees it.",
            "**The flag must be `volatile`** (or atomic). Without it, the JIT may hoist the read of `running` out of the loop and the worker never sees `false`; the volatile lesson reproduces exactly that hang.",
            "**A custom flag is still useful** when interrupts are unreliable: code that calls libraries which swallow `InterruptedException`, or a stop that must be distinguishable from other interrupts. Then use both: set the flag and interrupt the thread.",
            "Executors use the interrupt: `Future.cancel(true)` and `shutdownNow()` interrupt worker threads, so tasks that swallow interrupts can't be cancelled either.",
          ],
        },
      ],
    },
    {
      title: "Why stop, suspend and resume Are Gone",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "Removed.java",
          code: `public class Removed {
    @SuppressWarnings("removal")
    public static void main(String[] args) throws Exception {
        Thread t = new Thread(() -> {
            try { Thread.sleep(5_000); } catch (InterruptedException e) { System.out.println("worker interrupted"); }
        }, "worker");
        t.start();
        for (String op : new String[] {"stop", "suspend", "resume"}) {
            try {
                switch (op) {
                    case "stop" -> t.stop();
                    case "suspend" -> t.suspend();
                    default -> t.resume();
                }
                System.out.println(op + "() returned normally");
            } catch (UnsupportedOperationException e) {
                System.out.println(op + "() -> " + e);
            }
        }
        System.out.println("worker still " + t.getState());
        t.interrupt();
        t.join();
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `javac Removed.java && java Removed                    # JDK 21
/usr/lib/jvm/java-17-openjdk-amd64/bin/java Removed    # same source compiled with JDK 17`,
        },
        {
          type: "output",
          text: `stop() -> java.lang.UnsupportedOperationException
suspend() -> java.lang.UnsupportedOperationException
resume() -> java.lang.UnsupportedOperationException
worker still TIMED_WAITING
worker interrupted

stop() returned normally
suspend() returned normally
resume() returned normally
worker still TERMINATED`,
        },
        {
          type: "list",
          items: [
            "**On JDK 21 all three throw `UnsupportedOperationException`** and the worker was untouched: still sleeping, and later stopped by the interrupt. Without `@SuppressWarnings(\"removal\")`, `javac` warns `stop() in Thread has been deprecated and marked for removal` for each call.",
            "**On JDK 17, `stop()` still worked**: it threw a `ThreadDeath` error inside the worker at whatever point it was, the worker died (TERMINATED) without running its `catch` for `InterruptedException`, and nothing was printed, because the default handler ignores `ThreadDeath`.",
            "**Why `stop` was unsafe**: `ThreadDeath` unwinds the stack and releases every monitor the thread holds. If the thread was halfway through moving a driver from one zone map to another, the maps are left inconsistent and unlocked, and other threads will use them. There's no safe point to stop arbitrary code from outside.",
            "**Why `suspend` was deadlock-prone**: a suspended thread keeps its locks. If the thread meant to call `resume` needs one of those locks first, both wait forever.",
            "The replacement for all three is the cooperative pattern: interrupts (or a volatile flag) that the target checks at points where its state is consistent.",
          ],
        },
      ],
    },
    {
      title: "Daemon Threads and Shutdown Hooks",
      blocks: [
        {
          type: "heading",
          text: "The JVM doesn't wait for daemons, and their finally blocks don't run",
        },
        {
          type: "code",
          language: "java",
          title: "DaemonFinally.java",
          code: `public class DaemonFinally {
    public static void main(String[] args) throws Exception {
        boolean daemon = args[0].equals("daemon");
        Thread flusher = new Thread(() -> {
            try {
                System.out.println("flusher: writing trip batch...");
                Thread.sleep(1_000);                                 // still working when main ends
                System.out.println("flusher: batch written");
            } catch (InterruptedException e) {
                System.out.println("flusher: interrupted");
            } finally {
                System.out.println("flusher: finally, closing the file");
            }
        }, "flusher");
        flusher.setDaemon(daemon);
        flusher.start();

        Thread child = new Thread(() -> { }, "child");
        System.out.println("main: flusher daemon=" + flusher.isDaemon() + ", child of main daemon=" + child.isDaemon());
        try {
            flusher.setDaemon(!daemon);                              // too late: it has started
        } catch (IllegalThreadStateException e) {
            System.out.println("main: setDaemon after start -> " + e.getClass().getSimpleName());
        }
        System.out.println("main: returning from main");
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `java DaemonFinally user;   echo "exit $?"
java DaemonFinally daemon; echo "exit $?"`,
        },
        {
          type: "output",
          text: `flusher: writing trip batch...
main: flusher daemon=false, child of main daemon=false
main: setDaemon after start -> IllegalThreadStateException
main: returning from main
flusher: batch written
flusher: finally, closing the file
exit 0

flusher: writing trip batch...
main: flusher daemon=true, child of main daemon=false
main: setDaemon after start -> IllegalThreadStateException
main: returning from main
exit 0`,
        },
        {
          type: "list",
          items: [
            "**As a user thread, the flusher kept the JVM alive** after `main` returned (the `DestroyJavaVM` wait shown earlier), finished its batch and ran its `finally`.",
            "**As a daemon, it was abandoned mid-sleep.** The JVM exited as soon as `main` returned: no \"batch written\", **no `finally`**, no exception, exit code 0. A daemon thread holding a half-written file, an open transaction or a buffered log line loses it silently.",
            "**Daemon status is inherited** from the creating thread (`child of main daemon=false`, because `main` is a user thread), and it can only be set before `start()`.",
            "**Use daemons only for work that is safe to lose at any instruction**: caches being refreshed, metrics sampling, heartbeats. The JVM's own background threads (GC, JIT, Reference Handler) are daemons for this reason. Anything that writes, sends or commits should be a user thread with an explicit stop, or be stopped by a shutdown hook.",
          ],
        },
        {
          type: "heading",
          text: "Shutdown hooks: when they run and when they don't",
        },
        {
          type: "code",
          language: "java",
          title: "Hooks.java",
          code: `public class Hooks {
    static void log(String msg) {
        System.out.println(msg + " [" + Thread.currentThread().getName() + "]");
    }

    public static void main(String[] args) throws Exception {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> log("hook: flush metrics"), "metrics-hook"));
        Runtime.getRuntime().addShutdownHook(new Thread(() -> log("hook: deregister from discovery"), "discovery-hook"));
        log("main: running, mode " + args[0]);
        switch (args[0]) {
            case "return" -> log("main: returning");
            case "exit" -> System.exit(3);
            case "halt" -> Runtime.getRuntime().halt(4);
            case "throw" -> throw new IllegalStateException("startup failed");
            default -> Thread.sleep(60_000);                         // wait for a signal
        }
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `for m in return exit halt throw; do java Hooks $m; echo "exit $?"; done
for s in TERM INT KILL; do java Hooks wait & sleep 1; kill -$s $!; wait $!; echo "exit $?"; done`,
        },
        {
          type: "table",
          headers: ["How the JVM ended", "Hooks ran?", "Exit code"],
          rows: [
            ["`main` returned (no other user threads)", "Yes", "0"],
            ["`System.exit(3)`", "Yes", "3"],
            ["`Runtime.getRuntime().halt(4)`", "No", "4"],
            ["Uncaught exception in `main`", "Yes, after the stack trace", "1"],
            ["`kill -TERM` (SIGTERM, what Kubernetes and systemd send)", "Yes", "143 (128 + 15)"],
            ["`kill -INT` (SIGINT, Ctrl+C)", "Yes", "130 (128 + 2)"],
            ["`kill -KILL` (SIGKILL)", "No: the kernel removes the process", "137 (128 + 9)"],
          ],
        },
        {
          type: "output",
          text: `main: running, mode exit [main]
hook: flush metrics [metrics-hook]
hook: deregister from discovery [discovery-hook]
...
main: running, mode wait [main]
hook: flush metrics [metrics-hook]
hook: deregister from discovery [discovery-hook]
[1]+  Exit 143                java Hooks wait`,
        },
        {
          type: "list",
          items: [
            "**Each hook runs on its own thread** (the names in brackets are the hook threads). `ApplicationShutdownHooks` keeps them in an `IdentityHashMap`, calls `start()` on all of them, then `join()`s each one **with no timeout**. They run concurrently, in no guaranteed order: the order was the same in 30 runs here, but nothing promises it, so hooks mustn't depend on each other.",
            "**SIGTERM and SIGINT run hooks** because the `Signal Dispatcher` thread hands them to a Java handler that calls `Shutdown.exit`; the exit code is 128 plus the signal number. SIGKILL can't be caught by any process, so nothing runs, and neither does `halt`, which skips hooks by design.",
            "**Daemon threads keep running while hooks run**, and user threads too: the JVM only stops them after the last hook finishes. A hook that has to stop a worker must signal it (interrupt it) and should wait for it with a bound.",
            "**A hook that never returns blocks the exit forever.** So does a hook that calls `System.exit` (it waits for the shutdown it's part of). Keep hooks short, bounded and independent; the production story is a hook that waited forever.",
          ],
        },
      ],
    },
    {
      title: "Execution Flow, Step by Step",
      blocks: [
        {
          type: "paragraph",
          text: "Tracing the `interrupt-worker` from `FlagVsInterrupt` through its whole life:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**NEW.** `new Thread(iw, \"interrupt-worker\")` creates the object; `interrupted` is `false`, `threadStatus` is NEW, no OS thread exists.",
            "**RUNNABLE.** `b.start()` creates the kernel task (previous lesson). The worker checks `isInterrupted()` (a volatile read of `false`), increments `rounds`.",
            "**TIMED_WAITING.** `Thread.sleep(2_000)` calls the native `sleep0`, which parks the OS thread on its sleep event with a 2 second timeout: a `futex` wait in the kernel, `S` in `ps`.",
            "**Main calls `b.interrupt()` 500 ms later.** It sets `interrupted = true` (volatile write), then `interrupt0()` unparks the worker's sleep event; `nioBlocker` is `null`, so no channel is closed.",
            "**The worker wakes**, sees the flag inside `sleep0`, clears it and throws `InterruptedException`. State: RUNNABLE again.",
            "**The `catch` restores the flag** with `Thread.currentThread().interrupt()`: `interrupted` is `true` again (and since the worker isn't blocked, the unpark does nothing).",
            "**The loop condition reads `isInterrupted()` = `true`**, the loop ends and `run()` returns.",
            "**TERMINATED.** The JVM marks the thread terminated and calls `notifyAll()` on the `Thread` object. `main`, waiting in `b.join()` (WAITING on the `Thread`'s monitor), wakes, sees `isAlive()` is `false`, and returns. The whole stop took under a millisecond (median 16 to 17 µs from `interrupt()` to the `catch` block, measured below).",
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
          title: "LifecycleTour.java",
          code: `import java.time.Duration;

public class LifecycleTour {
    public static void main(String[] args) throws Exception {
        Thread worker = new Thread(() -> {
            try {
                Thread.sleep(Duration.ofSeconds(30));                // TIMED_WAITING
            } catch (InterruptedException e) {
                System.out.println("2 interrupted, flag cleared: " + !Thread.currentThread().isInterrupted());
                Thread.currentThread().interrupt();                  // restore for whoever is above us
            }
        }, "eta-refresher");
        System.out.println("1 " + worker.getState() + " alive=" + worker.isAlive());
        worker.setDaemon(false);                                     // only before start()
        worker.start();
        while (worker.getState() != Thread.State.TIMED_WAITING) Thread.onSpinWait();
        worker.interrupt();                                          // request: please stop
        boolean done = worker.join(Duration.ofSeconds(1));           // wait, with a deadline
        System.out.println("3 joined=" + done + " state=" + worker.getState());

        Thread.currentThread().interrupt();
        System.out.println("4 isInterrupted=" + Thread.currentThread().isInterrupted()
                + " interrupted()=" + Thread.interrupted() + " then " + Thread.interrupted());

        Thread.yield();                                              // a hint to the scheduler, rarely useful
        Thread daemon = Thread.ofPlatform().daemon().name("heartbeat").unstarted(() -> { });
        System.out.println("5 daemon=" + daemon.isDaemon() + ", main daemon=" + Thread.currentThread().isDaemon());

        Thread hook = new Thread(() -> System.out.println("7 shutdown hook ran"));
        Runtime.getRuntime().addShutdownHook(hook);
        System.out.println("6 main returns");
    }
}`,
        },
        {
          type: "output",
          text: `1 NEW alive=false
2 interrupted, flag cleared: true
3 joined=true state=TERMINATED
4 isInterrupted=true interrupted()=true then false
5 daemon=true, main daemon=false
6 main returns
7 shutdown hook ran`,
        },
        {
          type: "paragraph",
          text: "`Thread.ofPlatform().daemon()` is the builder form of `setDaemon(true)`. Polling `getState()` with `Thread.onSpinWait()` is fine in a demo; real code waits for a signal (a latch or a queue) instead of a state. The hook printed `7` after `main` returned, as part of the normal exit.",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Example 1: A queue consumer that stops on interrupt",
        },
        {
          type: "code",
          language: "java",
          title: "RideConsumer.java",
          code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

public class RideConsumer {
    record RideRequest(String id, String zone) { }

    public static void main(String[] args) throws Exception {
        BlockingQueue<RideRequest> queue = new LinkedBlockingQueue<>();
        List<String> handled = new ArrayList<>();

        Thread consumer = new Thread(() -> {
            try {
                while (true) {
                    RideRequest r = queue.take();                    // blocks; responds to interrupt
                    Thread.sleep(50);                                // match a driver
                    synchronized (handled) { handled.add(r.id()); }
                }
            } catch (InterruptedException e) {
                // Interrupt means "stop": we own this thread, so ending run() is the right response
                System.out.println("consumer: stopping, " + queue.size() + " requests left in the queue");
            }
        }, "ride-consumer");
        consumer.start();

        String[] zones = {"SALT-LAKE", "NEW-TOWN"};
        for (int i = 1; i <= 10; i++) queue.put(new RideRequest("R" + i, zones[i % 2]));
        Thread.sleep(220);                                           // let it handle a few
        consumer.interrupt();
        consumer.join();
        synchronized (handled) { System.out.println("handled " + handled); }
    }
}`,
        },
        {
          type: "output",
          text: `consumer: stopping, 5 requests left in the queue
handled [R1, R2, R3, R4]`,
        },
        {
          type: "list",
          items: [
            "`take()` blocks while the queue is empty and throws `InterruptedException` when interrupted, so the consumer needs no flag at all: the interrupt is the stop signal. Because this code owns the thread, ending `run()` is the right response, and restoring the flag isn't needed.",
            "**Count the requests: 4 handled + 5 in the queue = 9 of 10.** R5 had been taken and was being matched (the `sleep(50)`) when the interrupt arrived, so it was dropped. The output was the same in three runs. A real consumer must decide what happens to the item in hand: finish it before checking for the interrupt, or put it back. The Producer-Consumer, Backpressure and Clean Shutdown lesson builds the full version with a poison pill and draining.",
            "`handled` is shared between two threads, so access to it is `synchronized`; `join()` alone would also make the consumer's writes visible to `main`, but the explicit lock keeps the example correct if someone reads it earlier.",
          ],
        },
        {
          type: "heading",
          text: "Example 2: Joining several threads with one deadline",
        },
        {
          type: "code",
          language: "java",
          title: "JoinWithDeadline.java",
          code: `import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public class JoinWithDeadline {
    public static void main(String[] args) throws Exception {
        long[] delays = {100, 300, 5_000};                           // the third partner hangs
        List<Thread> workers = new ArrayList<>();
        for (int i = 0; i < delays.length; i++) {
            long d = delays[i];
            Thread t = new Thread(() -> {
                try {
                    Thread.sleep(d);
                    System.out.println(Thread.currentThread().getName() + " answered");
                } catch (InterruptedException e) {
                    System.out.println(Thread.currentThread().getName() + " cancelled");
                }
            }, "partner-" + i);
            workers.add(t);
            t.start();
        }

        long deadline = System.nanoTime() + Duration.ofMillis(500).toNanos();   // one budget for all
        for (Thread t : workers) {
            long left = deadline - System.nanoTime();
            if (left > 0) t.join(Duration.ofNanos(left));
        }
        for (Thread t : workers) {
            if (t.isAlive()) {
                System.out.println("deadline passed, interrupting " + t.getName());
                t.interrupt();
            }
        }
        for (Thread t : workers) t.join();
        System.out.println("all done");
    }
}`,
        },
        {
          type: "output",
          text: `partner-0 answered
partner-1 answered
deadline passed, interrupting partner-2
partner-2 cancelled
all done`,
        },
        {
          type: "paragraph",
          text: "Joining each thread with `join(500)` would allow up to 1.5 seconds in total. Computing one deadline and joining each thread with **what's left** keeps the total at 500 ms. Then every thread still alive is interrupted, and the final `join()` without a timeout is safe because those threads respond to interrupts. Three runs gave identical output. This is the shape of `ExecutorService.invokeAll(tasks, timeout)`, which cancels unfinished tasks the same way.",
        },
        {
          type: "heading",
          text: "Example 3: Finishing a step first, then handing the interrupt back",
        },
        {
          type: "code",
          language: "java",
          title: "DeferInterrupt.java",
          code: `public class DeferInterrupt {
    // Finish a short critical step even if interrupted, then hand the interrupt back
    static void sleepUninterruptibly(long millis) {
        boolean interrupted = false;
        long end = System.nanoTime() + millis * 1_000_000;
        try {
            while (true) {
                long left = end - System.nanoTime();
                if (left <= 0) return;
                try {
                    Thread.sleep(left / 1_000_000, (int) (left % 1_000_000));
                } catch (InterruptedException e) {
                    interrupted = true;                              // remember, keep waiting
                }
            }
        } finally {
            if (interrupted) Thread.currentThread().interrupt();     // restore on the way out
        }
    }

    public static void main(String[] args) throws Exception {
        Thread payout = new Thread(() -> {
            long t0 = System.nanoTime();
            sleepUninterruptibly(300);                               // e.g. the backoff before a payment retry
            System.out.printf("payout: waited %d ms, interrupted=%b%n",
                    (System.nanoTime() - t0) / 1_000_000, Thread.currentThread().isInterrupted());
        }, "payout");
        payout.start();
        Thread.sleep(50);
        payout.interrupt();
        payout.join();
    }
}`,
        },
        {
          type: "output",
          text: `payout: waited 300 ms, interrupted=true`,
        },
        {
          type: "paragraph",
          text: "Sometimes a short step mustn't be abandoned halfway, such as a backoff that has to complete before a payment retry is recorded. The pattern (Guava calls it `sleepUninterruptibly`) remembers the interrupt, keeps waiting for the **remaining** time, and restores the flag in `finally`. The interrupt arrived 50 ms in, the full 300 ms still passed, and the caller sees the flag set and can stop afterwards. Deferring is fine; discarding is the bug.",
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
            ["Wait for a thread to finish", "`join(Duration)` and check the result", "`join()` with no bound on threads that call out to other services"],
            ["Wait for several threads", "One deadline, join with the remaining time; or `invokeAll(tasks, timeout)`", "`join(timeout)` per thread"],
            ["Pause between rounds of work", "`sleep` (outside locks) or a `ScheduledExecutorService`", "`sleep` inside `synchronized`"],
            ["Ask a thread to stop", "`interrupt()`, plus a volatile flag if libraries may swallow interrupts", "`stop()` (gone), a non-volatile flag"],
            ["Code that catches `InterruptedException` but doesn't own the thread", "Restore the flag, or rethrow", "An empty `catch`, or a log line and carry on"],
            ["Code that owns the thread", "Treat the interrupt as \"stop\": clean up and return from `run()`", "Ignoring it"],
            ["Stop a thread blocked in classic socket I/O", "`setSoTimeout`, or close the socket", "Expecting `interrupt()` to work"],
            ["Background work safe to lose", "Daemon thread", "Daemon threads that write, send or commit"],
            ["Work at JVM exit", "A short shutdown hook that signals and joins with a bound", "Unbounded waits in hooks; `System.exit` in a hook"],
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Swallowing InterruptedException",
        },
        {
          type: "code",
          language: "java",
          code: `try {
    Thread.sleep(200);
} catch (InterruptedException e) {
    log.warn("interrupted");          // the flag is now false: the stop request is lost
}`,
        },
        {
          type: "paragraph",
          text: "The exception cleared the flag, so after this `catch` nothing anywhere knows the thread was asked to stop. Either stop (return, or rethrow) or restore the flag with `Thread.currentThread().interrupt()`. The production section is this exact block.",
        },
        {
          type: "heading",
          text: "Using Thread.interrupted() to check the flag",
        },
        {
          type: "paragraph",
          text: "`Thread.interrupted()` clears the flag as it reads it. Using it in a loop condition that also has other exit paths loses the interrupt for the caller. Use `Thread.currentThread().isInterrupted()` to check, and `interrupted()` only when you're consuming the interrupt on purpose.",
        },
        {
          type: "heading",
          text: "Sleeping while holding a lock",
        },
        {
          type: "paragraph",
          text: "`sleep` inside `synchronized` keeps the monitor: in the dump, `lock-waiter` was BLOCKED for the whole of `lock-holder`'s sleep. Move sleeps, I/O and waiting outside locked sections.",
        },
        {
          type: "heading",
          text: "Expecting interrupt() to stop any thread",
        },
        {
          type: "paragraph",
          text: "It doesn't end a CPU loop that never checks the flag, a thread BLOCKED on a monitor, or a classic socket read. Design threads to check the flag and to block only in interruptible calls or calls with timeouts.",
        },
        {
          type: "heading",
          text: "Calling join() without a timeout on threads that call other systems",
        },
        {
          type: "paragraph",
          text: "If the joined thread hangs on a remote call, the joiner hangs too, and in a shutdown hook that hangs the exit. Use `join(Duration)` and decide what to do when it returns `false`.",
        },
        {
          type: "heading",
          text: "Doing important work in daemon threads",
        },
        {
          type: "paragraph",
          text: "The JVM exits without waiting for them and without running their `finally` blocks, as `DaemonFinally` showed. Flushing, writing and committing belong in user threads that are stopped deliberately.",
        },
        {
          type: "heading",
          text: "Slow or unbounded shutdown hooks",
        },
        {
          type: "paragraph",
          text: "Hooks are joined with no timeout. A hook that waits for a worker that never stops turns SIGTERM into a hang, which the orchestrator ends with SIGKILL after its grace period, losing everything the hook was supposed to save.",
        },
        {
          type: "heading",
          text: "Using a Thread object as a lock",
        },
        {
          type: "paragraph",
          text: "`join()` is `wait()` on the `Thread`, and the JVM calls `notifyAll()` on it when the thread ends. Synchronizing or waiting on `Thread` objects mixes your signals with the JVM's. Use a private lock object.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Treat an interrupt as a request to stop: in code that owns the thread, clean up and return; in code that doesn't, restore the flag or propagate `InterruptedException`.",
            "Declare `throws InterruptedException` on methods that block, instead of catching it deep inside; let the thread's owner decide.",
            "Check `Thread.currentThread().isInterrupted()` in long CPU-bound loops.",
            "Give every blocking call a bound: `join(Duration)`, `poll(timeout)`, `tryLock(timeout)`, `setSoTimeout` on sockets.",
            "Never call `sleep` (or any I/O) while holding a lock.",
            "Use daemon threads only for work that can be lost at any instruction.",
            "Register one shutdown hook that signals workers (interrupt or `shutdownNow`), joins them with a bound shorter than the platform's grace period, then flushes and exits.",
            "Read thread dumps by state: many BLOCKED on one address is lock contention, many WAITING (parking) on one queue is starvation of producers, many RUNNABLE in socket reads is a slow dependency.",
            "Test shutdown: send SIGTERM in an integration test and assert the process exits with 143 within a few seconds.",
          ],
        },
      ],
    },
    {
      title: "Performance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "WakeLatency.java",
          code: `import java.util.Arrays;

public class WakeLatency {
    static volatile long interruptedAt;

    public static void main(String[] args) throws Exception {
        int n = 2_000;
        long[] lat = new long[n];
        for (int i = 0; i < n; i++) {
            int slot = i;
            Thread sleeper = new Thread(() -> {
                try {
                    Thread.sleep(60_000);
                } catch (InterruptedException e) {
                    lat[slot] = System.nanoTime() - interruptedAt;   // interrupt() -> running in catch
                }
            });
            sleeper.start();
            while (sleeper.getState() != Thread.State.TIMED_WAITING) Thread.onSpinWait();
            interruptedAt = System.nanoTime();
            sleeper.interrupt();
            sleeper.join();
        }
        Arrays.sort(lat);
        System.out.printf("interrupt() to wake-up: median %.1f us, p99 %.1f us, max %.1f us%n",
                lat[n / 2] / 1e3, lat[(int) (n * 0.99)] / 1e3, lat[n - 1] / 1e3);
    }
}`,
        },
        {
          type: "output",
          text: `interrupt() to wake-up: median 16.7 us, p99 71.2 us, max 1906.3 us`,
        },
        {
          type: "table",
          headers: ["Operation", "Measured", "Notes"],
          rows: [
            ["`interrupt()` to the sleeping thread running its `catch`", "Median 16.3 to 17.0 µs, p99 57 to 73 µs", "2,000 samples, three runs; max 1.5 to 3.1 ms when the machine was busy"],
            ["Stop a worker with a volatile flag", "1,500 ms", "It noticed only after its 2 s sleep ended"],
            ["Stop the same worker with `interrupt()`", "Under 1 ms", "The interrupt wakes the sleep"],
            ["`sleep(1)`", "1.09 to 1.12 ms average, worst 1.5 to 4.2 ms", "At least the time asked, never exact"],
            ["`Thread.yield()`", "692 to 869 ns per call", "One `sched_yield` system call each"],
            ["`sleep` with the flag already set", "26 to 61 µs to throw", "Doesn't sleep at all"],
            ["`LockSupport.park()` with the flag already set", "3 µs to return", "Returns at once, every time: a busy loop if the flag is never cleared"],
            ["SIGTERM to exit, worker that honours interrupts", "105 to 123 ms in my script", "Mostly the script's 100 ms polling interval"],
          ],
        },
        {
          type: "paragraph",
          text: "Single-machine `System.nanoTime` measurements under load from other processes, not JMH. The point isn't the microseconds: an interrupt is effectively instant, so the time a service takes to stop is decided entirely by whether its threads listen. A worker that only checks a flag between 2 second sleeps takes up to 2 seconds; one that swallows interrupts takes forever.",
        },
      ],
    },
    {
      title: "Thread Control in Production",
      blocks: [
        {
          type: "paragraph",
          text: "A ride-hailing dispatch service runs a background worker that every 200 ms finds trips stuck in `SEARCHING` for too long and reassigns them to other drivers. Someone wrapped its sleep in a `catch` that logs and carries on, \"so that nothing can kill the worker\". The service also has a shutdown hook that interrupts the worker and joins it, so that the last batch is committed before exit. In Kubernetes, every deploy sends SIGTERM to the old pods, waits `terminationGracePeriodSeconds` (30 by default), then sends SIGKILL. Every deploy took 30 extra seconds per pod, every old pod ended with exit code 137, and occasionally a batch of reassignments was half-written when SIGKILL arrived, leaving trips assigned to two drivers.",
        },
        {
          type: "paragraph",
          text: "I rebuilt it with both loops and a script that plays the part of Kubernetes with a 5 second grace period:",
        },
        {
          type: "code",
          language: "java",
          title: "TripReassigner.java",
          code: `import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

public class TripReassigner {
    static int batches = 0;

    static void log(String msg) {
        System.out.println(LocalTime.now().truncatedTo(ChronoUnit.MILLIS) + " " + Thread.currentThread().getName() + ": " + msg);
    }

    static void reassignStaleTrips() {
        batches++;                                                   // stands in for a DB query + updates
        if (batches % 10 == 0) log("batch " + batches + " done");
    }

    // What shipped: the sleep is wrapped so that "nothing can kill the worker"
    static void buggyLoop() {
        while (true) {
            reassignStaleTrips();
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                log("interrupted, ignoring and carrying on");        // swallows the stop signal
            }
        }
    }

    // The fix: treat interrupt as "stop", restore the flag, let the loop condition end it
    static void fixedLoop() {
        while (!Thread.currentThread().isInterrupted()) {
            reassignStaleTrips();
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        log("stopped cleanly after " + batches + " batches");
    }

    public static void main(String[] args) {
        boolean fixed = args[0].equals("fixed");
        Thread worker = new Thread(fixed ? TripReassigner::fixedLoop : TripReassigner::buggyLoop, "trip-reassigner");
        worker.start();

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            log("SIGTERM received, stopping worker");
            worker.interrupt();
            try {
                if (fixed) {
                    worker.join(3_000);                              // bounded: less than the grace period
                    log(worker.isAlive() ? "worker did not stop in 3 s, exiting anyway" : "worker stopped, exiting");
                } else {
                    worker.join();                                   // unbounded
                    log("worker stopped, exiting");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "shutdown-hook"));
        log("started, pid " + ProcessHandle.current().pid());
    }
}`,
        },
        {
          type: "code",
          language: "bash",
          code: `#!/bin/bash
# A Kubernetes rollout in miniature: SIGTERM, then SIGKILL if the pod is still alive
# after terminationGracePeriodSeconds (5 s here, 30 s by default)
java TripReassigner "$1" &
pid=$!
sleep 1
start=$(date +%s%N)
kill -TERM $pid
for i in $(seq 50); do kill -0 $pid 2>/dev/null || break; sleep 0.1; done
if kill -0 $pid 2>/dev/null; then
  echo "still running after the 5 s grace period: SIGKILL"
  kill -KILL $pid
fi
wait $pid 2>/dev/null
code=$?
echo "exit code $code, $(( ($(date +%s%N) - start) / 1000000 )) ms after SIGTERM"`,
        },
        {
          type: "code",
          language: "bash",
          code: `./deploy.sh buggy
./deploy.sh fixed`,
        },
        {
          type: "output",
          text: `08:20:26.652 main: started, pid 1265121
08:20:27.469 shutdown-hook: SIGTERM received, stopping worker
08:20:27.469 trip-reassigner: interrupted, ignoring and carrying on
08:20:28.274 trip-reassigner: batch 10 done
08:20:30.277 trip-reassigner: batch 20 done
08:20:32.279 trip-reassigner: batch 30 done
still running after the 5 s grace period: SIGKILL
exit code 137, 5117 ms after SIGTERM

08:20:32.661 main: started, pid 1265372
08:20:33.583 shutdown-hook: SIGTERM received, stopping worker
08:20:33.588 trip-reassigner: stopped cleanly after 5 batches
08:20:33.588 shutdown-hook: worker stopped, exiting
exit code 143, 105 ms after SIGTERM`,
        },
        {
          type: "paragraph",
          text: "While the buggy version was hanging, a thread dump showed exactly why:",
        },
        {
          type: "code",
          language: "bash",
          code: "kill -TERM <pid>; sleep 1; jcmd <pid> Thread.print",
        },
        {
          type: "output",
          text: `"SIGTERM handler" #23 [1266257] daemon prio=9 os_prio=0 cpu=6.02ms elapsed=1.25s tid=0x00007ee1e4001240 nid=1266257 in Object.wait()  [0x00007ee1faffe000]
   java.lang.Thread.State: WAITING (on object monitor)
	at java.lang.Object.wait0(java.base@21.0.13.0.3/Native Method)
	- waiting on <0x000000008df271d8> (a java.lang.Thread)
	at java.lang.Object.wait(java.base@21.0.13.0.3/Object.java:366)
	at java.lang.Thread.join(java.base@21.0.13.0.3/Thread.java:2079)
	- locked <0x000000008df271d8> (a java.lang.Thread)
	at java.lang.Thread.join(java.base@21.0.13.0.3/Thread.java:2155)
	at java.lang.ApplicationShutdownHooks.runHooks(java.base@21.0.13.0.3/ApplicationShutdownHooks.java:114)
	at java.lang.ApplicationShutdownHooks$1.run(java.base@21.0.13.0.3/ApplicationShutdownHooks.java:47)
	at java.lang.Shutdown.runHooks(java.base@21.0.13.0.3/Shutdown.java:130)
	at java.lang.Shutdown.exit(java.base@21.0.13.0.3/Shutdown.java:167)
	- locked <0x00000000ffe82208> (a java.lang.Class for java.lang.Shutdown)
	at java.lang.Terminator$1.handle(java.base@21.0.13.0.3/Terminator.java:51)
	...

"shutdown-hook" #21 [1266258] prio=5 os_prio=0 cpu=0.43ms elapsed=1.25s tid=0x00007ee1b8003220 nid=1266258 in Object.wait()  [0x00007ee2500fe000]
   java.lang.Thread.State: WAITING (on object monitor)
	at java.lang.Object.wait0(java.base@21.0.13.0.3/Native Method)
	- waiting on <0x000000008df15900> (a java.lang.Thread)
	at java.lang.Object.wait(java.base@21.0.13.0.3/Object.java:366)
	at java.lang.Thread.join(java.base@21.0.13.0.3/Thread.java:2079)
	- locked <0x000000008df15900> (a java.lang.Thread)
	at java.lang.Thread.join(java.base@21.0.13.0.3/Thread.java:2155)
	at TripReassigner.lambda$main$0(TripReassigner.java:54)
	...

"trip-reassigner" #20 [1266254] prio=5 os_prio=0 cpu=12.78ms elapsed=2.21s tid=0x00007ee26c173670 nid=1266254 waiting on condition  [0x00007ee2501fe000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.lang.Thread.sleep0(java.base@21.0.13.0.3/Native Method)
	at java.lang.Thread.sleep(java.base@21.0.13.0.3/Thread.java:509)
	at TripReassigner.buggyLoop(TripReassigner.java:21)
	...`,
        },
        {
          type: "list",
          items: [
            "**A chain of three waits.** The `SIGTERM handler` thread (started by the Signal Dispatcher) is in `Shutdown.exit` → `ApplicationShutdownHooks.runHooks`, joining our `shutdown-hook`. The hook is joining `trip-reassigner` (`waiting on <0x...5900> (a java.lang.Thread)`, which is `join` as `wait`). And the worker is back in its 200 ms sleep, having discarded the interrupt one line after receiving it.",
            "**The worker kept working during shutdown.** Batches 10, 20 and 30 ran after SIGTERM, while in the real service connection pools and Kafka producers were being closed by other hooks. That's where the half-written reassignments came from: SIGKILL arrived in the middle of a batch.",
            "**The fix was in the `catch`, not the hook.** `Thread.currentThread().interrupt()` restores the flag, and the loop condition `!isInterrupted()` ends the loop after the current batch. The worker stopped 5 ms after SIGTERM, the hook logged and returned, and the JVM exited with 143. The 105 ms total is mostly the script polling every 100 ms. Two runs of each version gave the same results.",
            "**The hook got a bound as a second line of defence.** `join(3_000)` is shorter than the grace period, so even if some future code swallows the interrupt again, the JVM exits on its own, with a log line saying the worker didn't stop, instead of being killed mid-batch with no explanation.",
            "**Also fixed in the real service**: the reassignment batch became a single transaction, so that even a SIGKILL can't leave a half-written batch, and the readiness probe was switched off at the start of the hook so no new work was routed to a pod that was stopping.",
          ],
        },
        {
          type: "list",
          items: [
            "An empty or log-only `catch (InterruptedException e)` turns every stop request into a no-op. In a service, that means every deploy ends in SIGKILL.",
            "Exit code 137 on every rollout (and \"terminated after grace period\" in the pod events) is the symptom; a thread dump taken after SIGTERM shows which thread isn't stopping.",
            "Shutdown hooks are joined with no timeout: bound every wait inside them below the orchestrator's grace period.",
            "Make work units atomic (one transaction per batch), because SIGKILL will eventually happen anyway.",
            "Test it: an integration test that sends SIGTERM and asserts exit code 143 within a few seconds catches the regression on the day it's written.",
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
              question: "What are the states of a Java thread?",
              answer:
                "Six, in `Thread.State`: NEW (created, not started), RUNNABLE (running or ready, including blocked in I/O), BLOCKED (waiting to enter a `synchronized` block held by another thread), WAITING (`wait()`, `join()`, `park()` with no timeout), TIMED_WAITING (`sleep`, or those calls with a timeout) and TERMINATED. A thread goes NEW → RUNNABLE once, moves between RUNNABLE and the three waiting states any number of times, and ends TERMINATED. I captured all six from real threads with `getState()`.",
            },
            {
              question: "What does join() do?",
              answer:
                "It makes the calling thread wait until the target thread terminates. `join(ms)` and `join(Duration)` wait at most that long; `join(Duration)` returns `false` if the thread is still alive. It also guarantees the joiner sees everything the finished thread wrote. On a thread that was never started it returns immediately, because a NEW thread isn't alive.",
            },
            {
              question: "What is the difference between sleep() and wait()?",
              answer:
                "`Thread.sleep` is static, pauses the current thread for at least the given time and **keeps all locks** it holds. `Object.wait` must be called while holding that object's monitor, **releases** it while waiting, and returns after `notify`/`notifyAll`, a timeout or spuriously. In my thread dump, a sleeping thread still showed `- locked <0x...918>` while another was BLOCKED waiting for that address.",
            },
            {
              question: "What is a daemon thread?",
              answer:
                "A thread the JVM doesn't wait for: the JVM exits when only daemon threads remain, stopping them wherever they are. Their `finally` blocks don't run; in my test a daemon flusher was abandoned mid-sleep with no output and exit code 0. Daemon status is inherited from the creating thread and must be set before `start()`. They suit background work that's safe to lose, like cache refreshes; GC and JIT threads are daemons.",
            },
            {
              question: "How do you stop a thread in Java?",
              answer:
                "Cooperatively: call `interrupt()` on it (or set a volatile flag it checks), and write the thread so that it stops when it sees the request, either because a blocking call throws `InterruptedException` or because it checks `isInterrupted()`. There's no safe way to force it; `Thread.stop()` was deprecated in 1.2 and throws `UnsupportedOperationException` on JDK 21.",
            },
            {
              question: "What happens if you interrupt a sleeping thread?",
              answer:
                "`sleep` throws `InterruptedException` immediately, and the interrupt flag is cleared as it's thrown. In my test the thread woke 100 ms into a 10 second sleep and `isInterrupted()` was `false` inside the `catch`. If the flag is set before `sleep` is called, `sleep` throws at once without sleeping.",
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
              question: "What's the difference between Thread.interrupted() and isInterrupted()?",
              answer:
                "`isInterrupted()` is an instance method that reads a thread's flag without changing it. `Thread.interrupted()` is static, applies to the current thread, reads the flag and clears it. Called twice in a row after an interrupt, `interrupted()` returns `true` then `false`. Use `isInterrupted()` to check, and `interrupted()` only when you're consuming the interrupt deliberately.",
            },
            {
              question: "What should you do when you catch InterruptedException?",
              answer:
                "Either stop what you're doing and propagate it (declare `throws InterruptedException`, or end `run()` if you own the thread), or restore the flag with `Thread.currentThread().interrupt()` so code further up can see it. Never swallow it: throwing it cleared the flag, so an empty `catch` erases the stop request. If a short step must finish first, remember the interrupt and restore it in `finally`.",
            },
            {
              question: "Why is a thread blocked on socket I/O shown as RUNNABLE?",
              answer:
                "`Thread.State` describes the JVM's view: the thread is executing native code (a `read` or `accept` system call), and the JVM doesn't track why native code is waiting. The kernel shows the same thread as sleeping (`S`, in `inet_csk_accept` for an accept). So RUNNABLE in a dump doesn't mean CPU use; check the top frames for `Net.accept`, `SocketInputStream`/`NioSocketImpl.read` or JDBC driver reads.",
            },
            {
              question: "Can you interrupt a thread blocked in a synchronized block or a socket read?",
              answer:
                "No. A thread BLOCKED entering `synchronized` stays BLOCKED (the flag is set and it sees it later), and a classic `Socket` read on a platform thread ignores the interrupt; I waited 300 ms for both. The fixes: `ReentrantLock.lockInterruptibly` or `tryLock(timeout)` instead of `synchronized`, and `setSoTimeout` or closing the socket for I/O. NIO channels do respond, by closing the channel with `ClosedByInterruptException`.",
            },
            {
              question: "Volatile boolean flag or interrupt: which should a worker use to stop?",
              answer:
                "The interrupt, because it also wakes blocking calls. In my test a worker sleeping 2 seconds between rounds stopped 1,500 ms after a volatile flag was cleared and under 1 ms after an interrupt. A flag (it must be volatile) is useful in addition when the thread calls code that may swallow interrupts, or to distinguish \"stop\" from other interrupts; then set the flag and interrupt.",
            },
            {
              question: "When do shutdown hooks run and when don't they?",
              answer:
                "They run on normal exit (the last user thread ends), on `System.exit`, after an uncaught exception ends `main`, and on SIGTERM and SIGINT (exit codes 143 and 130). They don't run on `Runtime.halt`, on SIGKILL (137), or if the JVM crashes. Each hook is its own thread; all are started together and joined with no timeout, in no guaranteed order.",
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
              question: "How is join() implemented, and what does that imply?",
              answer:
                "For platform threads, `join` is `synchronized (this) { while (isAlive()) wait(remaining); }` on the `Thread` object, as `javap -c` shows, and the JVM calls `notifyAll()` on the `Thread` when it terminates. Implications: a joining thread appears in dumps as WAITING (on object monitor) waiting on a `java.lang.Thread`; and you shouldn't use `Thread` objects as locks or call `wait`/`notify` on them, because the JVM's exit notification and your own signals would mix.",
            },
            {
              question: "What exactly does Thread.interrupt() do in JDK 21?",
              answer:
                "Three things, visible in its bytecode: checks access and sets the `volatile boolean interrupted` field; calls the native `interrupt0` (`JVM_Interrupt`), which unparks the thread's sleep, wait and park events so a blocked thread wakes and checks the flag; and, under `interruptLock`, calls `nioBlocker.interrupt(this)` if the thread is blocked on an `InterruptibleChannel`, which closes the channel. Nothing else: monitor entry, classic socket reads and CPU loops are unaffected.",
            },
            {
              question: "Why were Thread.stop() and suspend() deprecated, and what happens on JDK 21 if you call them?",
              answer:
                "`stop` throws `ThreadDeath` at an arbitrary point in the target, which unwinds and releases every monitor it holds, exposing half-updated objects to other threads. `suspend` freezes a thread with its locks held, so a thread that needs one of those locks before calling `resume` deadlocks. On JDK 21 all three throw `UnsupportedOperationException` and the target is untouched; on JDK 17 the same `stop()` call killed my worker without running its `catch`.",
            },
            {
              question: "What happens to running threads when the JVM exits?",
              answer:
                "When `main` returns, the launcher thread becomes `DestroyJavaVM` and waits for the last non-daemon thread to finish. Then shutdown hooks run concurrently, and the JVM waits for all of them. Finally the VM reaches a last safepoint and stops: daemon threads (and any user threads still running after `System.exit`) are halted where they are, without unwinding, so no `finally` blocks run. With `halt` or SIGKILL, hooks are skipped too.",
            },
            {
              question: "Why can LockSupport.park() return without being unparked, and what does an interrupt do to it?",
              answer:
                "`park` is allowed to return spuriously, and it also returns when the thread is interrupted, without throwing and without clearing the flag. If the flag is already set, `park` returns at once (3 µs in my test), so a loop that parks without checking or clearing the flag spins. That's why `java.util.concurrent` code always re-checks its condition in a loop after `park` and checks the interrupt status, then either throws `InterruptedException` (`lockInterruptibly`, `take`) or remembers it and restores it (`lock`).",
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
              question: "Every deploy of a service ends with the old pods killed after the 30 second grace period (exit code 137). What do you check?",
              answer:
                "Which thread doesn't stop after SIGTERM. I'd reproduce locally with `kill -TERM` and take a thread dump a second later: the `SIGTERM handler` thread will be in `ApplicationShutdownHooks.runHooks` joining a hook, and the hook will be waiting for something. In `TripReassigner`, the hook was joining a worker that had swallowed `InterruptedException` and gone back to sleep; three batches ran after SIGTERM and SIGKILL ended it at 5 seconds.\n\nFix the `catch` (restore the flag or exit the loop), bound every wait in the hook below the grace period, and add a test that sends SIGTERM and expects exit code 143. The fixed version exited about 100 ms after SIGTERM.",
            },
            {
              question: "A thread dump during an incident shows 200 request threads RUNNABLE but CPU is at 5%. What's going on?",
              answer:
                "RUNNABLE includes threads blocked in native I/O, so they're almost certainly waiting on something remote. I'd look at the top frames: `NioSocketImpl.read`/`SocketInputStream` under a JDBC driver means the database is slow, under an HTTP client means a downstream service is. `ps -L -o stat,wchan` would show them sleeping in the kernel. Then check socket and query timeouts: without `setSoTimeout` or a client timeout, a dead peer holds those threads forever, which is the classic route to pool exhaustion.",
            },
            {
              question: "Many threads in a dump are BLOCKED (on object monitor) waiting to lock the same address. How do you find the cause?",
              answer:
                "Search the dump for `- locked <that address>`: exactly one thread holds it, and its stack shows what it's doing while holding the lock. In `StatesDump`, the holder was TIMED_WAITING (sleeping) inside the `synchronized` block. If the holder is sleeping, doing I/O or waiting for another lock, that's the bug: move the slow work outside the lock. If the holder is RUNNABLE doing CPU work, the lock is too coarse. Repeated dumps show whether the same thread keeps the lock.",
            },
            {
              question: "A worker that consumes from a queue loses messages on every restart. The code is `while (true) { msg = queue.take(); process(msg); }` inside a try/catch for InterruptedException. Why?",
              answer:
                "The interrupt can arrive while `process(msg)` is running a blocking call (a sleep, a lock, a queue put), which throws, and the catch ends the loop with the message in hand already taken from the queue. `RideConsumer` reproduced it: 4 handled + 5 left in the queue = 9 of 10; R5 was dropped. Fixes: finish the current message before checking for the interrupt (defer it, as in `DeferInterrupt`), or put it back, or with a broker, acknowledge only after processing so an unacknowledged message is redelivered. The Producer-Consumer, Backpressure and Clean Shutdown lesson builds this properly.",
            },
            {
              question: "A nightly report job leaves a corrupt, half-written CSV about once a week, always when the JVM exits normally. Where would you look?",
              answer:
                "At daemon threads. If the writer runs in a daemon thread (or in a pool whose `ThreadFactory` sets daemon), the JVM exits as soon as the last user thread ends, without waiting for it and without running its `finally` blocks, so the file is never flushed or closed. `DaemonFinally` showed it: as a daemon, neither \"batch written\" nor the `finally` printed. Fix by making the writer a user thread (or `join` it before `main` returns), and write to a temporary file that's renamed only after a successful close.",
            },
            {
              question: "Cancelling a task with future.cancel(true) works in tests, but in production the cancelled tasks keep running and hold connections. What would you check?",
              answer:
                "`cancel(true)` only interrupts the worker thread. If the task swallows `InterruptedException` somewhere (a retry helper with an empty `catch`, a library), or is blocked in something interrupts don't reach (a classic socket read without a timeout, a `synchronized` block, `ReentrantLock.lock()`), it keeps running. I'd take a thread dump of the \"cancelled\" tasks to see where they are, grep the code for `catch (InterruptedException` blocks that don't restore the flag, and make sure every remote call has a timeout. Tests often use fast fakes that never block, which is why they pass.",
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
            "Create a thread that sleeps for 1 second and print its `getState()` before `start()`, 100 ms after `start()`, and after `join()`.",
            "In `main`, call `Thread.currentThread().interrupt()`, then `Thread.sleep(5_000)` inside a try/catch; print how long it took and `isInterrupted()` in the `catch`.",
            "Call `Thread.currentThread().interrupt()` and then print `Thread.interrupted()` twice and `isInterrupted()` once.",
            "Start a daemon thread that sleeps 1 second in a `try` with a `finally` that prints something, and return from `main` immediately. Then make it a user thread.",
            "Add a shutdown hook that prints a line, run `Thread.sleep(60_000)` in `main`, and stop the program with `kill -TERM`, then again with `kill -9`, printing the exit code each time.",
            "Run `StatesDump` and take `jcmd <pid> Thread.print`; find the BLOCKED thread and the thread that holds the lock it wants.",
            "Call `Thread.currentThread().stop()` on JDK 21.",
          ],
        },
        {
          type: "paragraph",
          text: "What to expect: step 1 prints NEW, TIMED_WAITING (it's in `sleep`) and TERMINATED. Step 2 throws immediately (tens of microseconds), and the flag is `false` in the `catch`. Step 3 prints `true`, `false`, `false`. Step 4 prints nothing from the daemon thread and exits 0; as a user thread, the JVM waits a second and the `finally` line appears. Step 5 prints the hook's line and exit code 143 for SIGTERM, and no hook line and 137 for `kill -9`. Step 6: `lock-waiter` is `BLOCKED (on object monitor)` with `- waiting to lock <0x...>`, and `lock-holder` has `- locked <0x...>` with the same address while `TIMED_WAITING (sleeping)`. Step 7 compiles with a `[removal]` warning and throws `java.lang.UnsupportedOperationException`.",
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `STATES     NEW -start()-> RUNNABLE -run() ends-> TERMINATED (no restart)
           RUNNABLE <-> BLOCKED        (entering synchronized)
                    <-> WAITING        (wait, join, park)
                    <-> TIMED_WAITING  (sleep, wait/join(ms), parkNanos)
           RUNNABLE includes socket/file I/O; kernel shows all of them as S
JOIN       synchronized(t) { while (t.isAlive()) t.wait(); }  JVM notifyAll()s at exit
           join(Duration) -> boolean; NEW thread: returns at once
SLEEP      keeps locks; at least the time asked (sleep(1) ~ 1.1 ms)
YIELD      sched_yield syscall, ~0.7 us; rarely useful
INTERRUPT  flag = true; unpark; close InterruptibleChannel. That's all.
           sleep/wait/join/take -> InterruptedException, FLAG CLEARED
           park -> returns quietly; synchronized, Socket.read, loops -> nothing
           catch: restore with Thread.currentThread().interrupt() or stop
           isInterrupted() reads; Thread.interrupted() reads AND clears
STOP       volatile flag: 1,500 ms late (sleeping); interrupt: < 1 ms
           stop/suspend/resume: UnsupportedOperationException on 21
DAEMON     JVM doesn't wait; finally doesn't run; set before start()
HOOKS      run on return, exit, uncaught, SIGTERM (143), SIGINT (130)
           not on halt, SIGKILL (137); concurrent, joined with NO timeout`,
          caption: "The one-screen version I'd want before an interview.",
        },
        {
          type: "list",
          items: [
            "A thread's state is the JVM's account of what it's waiting for: BLOCKED for a monitor, WAITING and TIMED_WAITING for a signal or a timer, and RUNNABLE for anything else, including slow I/O. Reading dumps by state, with the lock addresses, is the fastest way to explain a stuck service.",
            "Stopping a thread is always cooperative. `interrupt()` sets a flag and wakes the interruptible blocking calls; everything else depends on the target's code checking the flag and on every `catch (InterruptedException e)` either stopping or restoring it. Daemon threads and shutdown hooks decide what happens at exit, and both need bounds.",
            "Next: synchronized, Monitors and Race Conditions, which fixes the lost `counter++` updates from the previous lesson, opens up the monitor that BLOCKED threads were waiting for, and covers `wait` and `notify` properly.",
          ],
        },
      ],
    },
  ],
};
