import type { Lesson } from "../types";

export const dateTimeApi: Lesson = {
  slug: "date-time-api",
  date: "2026-10-29",
  title: "Date and Time API",
  description:
    "Java 8's java.time from the ground up: which type to use for a date, a wall-clock time or an exact moment, Duration versus Period, formatting and parsing, time zones and DST gaps, Clock for testable code, why Date and SimpleDateFormat had to go, and how the new classes are built inside.",
  tags: ["Core Java", "Java 8", "java.time", "Time Zones", "Immutability"],
  sections: [
    {
      title: "In Simple Words",
      blocks: [
        {
          type: "paragraph",
          text: "A school calendar says the exam is on 10 March, and the results come out two weeks later. I don't need a clock or a time zone for that. I just need a date, and a way to add 14 days to it.",
        },
        {
          type: "paragraph",
          text: "`java.time` gives Java a separate, clear type for each of these ideas: `LocalDate` for a calendar date, `LocalTime` for a time on the clock, `ZonedDateTime` for a date and time in a real place like Kolkata, and more. Each value never changes once made. `plusDays` gives me a new date and leaves the old one alone.",
        },
        {
          type: "paragraph",
          text: "I use it for anything with dates: booking times, due dates, how many days are left. It replaced the old `Date` and `Calendar` classes, which were easy to get wrong.",
        },
        {
          type: "code",
          language: "java",
          code: `LocalDate examDay = LocalDate.of(2026, 3, 10);
LocalDate resultDay = examDay.plusDays(14);
System.out.println("Exam: " + examDay);
System.out.println("Result: " + resultDay);
System.out.println("Result day is a " + resultDay.getDayOfWeek());`,
        },
        {
          type: "output",
          text: `Exam: 2026-03-10
Result: 2026-03-24
Result day is a TUESDAY`,
        },
        {
          type: "callout",
          tone: "tip",
          title: "Remember this",
          text: "Pick the type that matches the idea (just a date, just a time, or a time in a place), and remember every value is read-only.",
        },
      ],
    },
    {
      title: "What the Date and Time API Is",
      blocks: [
        {
          type: "paragraph",
          text: "`java.time` is the package Java 8 added for dates and times. It replaced `java.util.Date`, `Calendar` and `SimpleDateFormat`, which had been causing bugs since the 1990s.",
        },
        {
          type: "paragraph",
          text: "The big idea is that \"a date and time\" is actually several different things, and each one gets its own type:",
        },
        {
          type: "table",
          headers: ["Question I'm answering", "Type", "Example"],
          rows: [
            ["What day? (no time, no zone)", "`LocalDate`", "A birthday: `2026-10-29`"],
            ["What time on the clock? (no date, no zone)", "`LocalTime`", "The tea stall opens at `07:30`"],
            ["Date and clock time, but where?", "`LocalDateTime`", "\"Pickup at 7 pm on the 29th\", before I know the city"],
            ["Exactly when, for the whole planet?", "`Instant`", "The payment happened at `2026-10-29T13:30:00Z`"],
            ["Clock time in a real place, with its rules", "`ZonedDateTime`", "`2026-10-29T19:00+05:30[Asia/Kolkata]`"],
            ["Clock time plus a fixed offset", "`OffsetDateTime`", "`2026-10-29T19:00+05:30`, the shape databases and APIs use"],
            ["How long, in exact time?", "`Duration`", "The ride took `PT1H42M`"],
            ["How long, in calendar terms?", "`Period`", "Member for `P2Y8M29D`"],
          ],
        },
        {
          type: "paragraph",
          text: "Every one of these is **immutable**. Methods like `plusDays` never change the object, they return a new one. That single decision fixes a whole family of bugs the old API had, and it makes every class here safe to share between threads.",
        },
      ],
    },
    {
      title: "Where It Came From",
      blocks: [
        {
          type: "paragraph",
          text: "Java 1.0 (1996) shipped `java.util.Date`. Despite the name, it's not a date: it's a wrapper around milliseconds since 1 January 1970 UTC, so it's really an instant. Its constructor counted years from 1900 and months from 0, and most of its methods were deprecated a year later.",
        },
        {
          type: "paragraph",
          text: "Java 1.1 added `Calendar` and `SimpleDateFormat` to fix it. They made things more flexible but not safer: both are mutable, months still start at 0, and `SimpleDateFormat` isn't thread-safe. I ran the classic traps on JDK 21:",
        },
        {
          type: "code",
          language: "java",
          title: "Legacy.java",
          code: `import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.TimeZone;

public class Legacy {
    @SuppressWarnings("deprecation")
    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));   // fixed, so output is repeatable

        Date d = new Date(2026, 10, 29);              // looks like 29 Oct 2026...
        System.out.println(d);                        // year is 1900 + 2026, month 10 is November

        Calendar cal = Calendar.getInstance();
        cal.clear();
        cal.set(2026, Calendar.JANUARY, 31);
        cal.add(Calendar.MONTH, 1);
        System.out.println(cal.getTime());

        Date due = new Date(0);                       // 1 Jan 1970 00:00 UTC
        Date copy = due;
        copy.setTime(86_400_000L);                    // "change my copy"... also changes due
        System.out.println(due);

        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd");
        f.setLenient(true);                           // the default
        System.out.println(f.format(parse(f, "2026-02-30")));
    }

    static Date parse(SimpleDateFormat f, String s) {
        try { return f.parse(s); } catch (Exception e) { throw new RuntimeException(e); }
    }
}`,
        },
        {
          type: "output",
          text: `Mon Nov 29 00:00:00 IST 3926
Sat Feb 28 00:00:00 IST 2026
Fri Jan 02 05:30:00 IST 1970
2026-03-02`,
        },
        {
          type: "list",
          items: [
            "`new Date(2026, 10, 29)` is 29 November **3926**. Years from 1900, months from 0.",
            "`Date.toString()` prints in the JVM's default time zone (`IST` here), even though a `Date` has no zone. That has confused everyone who ever debugged a server in UTC.",
            "`Date` is mutable. `copy` and `due` are the same object, so changing one changed the \"due date\" too.",
            "`SimpleDateFormat` is lenient by default: \"30 February\" quietly became 2 March.",
          ],
        },
        {
          type: "paragraph",
          text: "Meanwhile Stephen Colebourne wrote **Joda-Time** (first released 2005), which became the library everyone used instead. He then led **JSR 310** with Michael Nascimento Santos to put a redesigned version into the JDK, and that became `java.time` in Java 8 (2014). It's not a copy of Joda-Time, it fixes some of Joda's own design mistakes, but the ideas are the same.",
        },
        {
          type: "paragraph",
          text: "Later versions added small things on top: `LocalDate.datesUntil` and `LocalDate.ofInstant` (9), the `toHoursPart`/`toMinutesPart` methods on `Duration` (9), and `InstantSource` (17), a smaller interface than `Clock` for code that only needs \"now\".",
        },
      ],
    },
    {
      title: "An Analogy That Helped Me",
      blocks: [
        {
          type: "paragraph",
          text: "I think of a **cricket match broadcast** watched in three countries.",
        },
        {
          type: "list",
          items: [
            "The first ball is bowled at one single moment for the whole world. That's an `Instant`. It's the same moment in Kolkata, London and New York.",
            "The TV listing in each country shows a different clock time for that same moment: 7:00 pm in Kolkata, 1:30 pm in London. Each listing is a `ZonedDateTime`: the moment, seen through one city's rules.",
            "The match ticket says \"29 Oct, gates open 6 pm\". It's printed with no country, because everyone at the ground already knows where they are. That's a `LocalDateTime`. On its own it doesn't tell you the moment, only when combined with the ground's zone.",
            "\"The match lasted 3 hours 40 minutes\" is a `Duration`: exact stopwatch time. \"The series runs for 2 weeks\" is a `Period`: calendar time, and if the clocks change during those two weeks, one of those days isn't 24 hours long.",
          ],
        },
        {
          type: "paragraph",
          text: "Most date bugs I've seen come from mixing these up: storing a ticket time when you needed a moment, or adding 24 hours when you meant \"tomorrow at the same time\".",
        },
      ],
    },
    {
      title: "The Technical Picture",
      blocks: [
        {
          type: "image",
          src: "/images/java-8/java-time-types.svg",
          alt: "Guide to java.time types: LocalDate for a birthday, LocalTime for a shop opening time, LocalDateTime with no zone, ZonedDateTime with zone and DST rules, Instant as a UTC moment to store, and Duration versus Period for amounts of time",
          caption: "Pick the type by meaning: store moments as `Instant`, show them with `ZonedDateTime`, and use `Duration` for exact time but `Period` for calendar days.",
        },
        {
          type: "heading",
          text: "The local types",
        },
        {
          type: "code",
          language: "java",
          title: "LocalBasics.java",
          code: `import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Month;

public class LocalBasics {
    public static void main(String[] args) {
        LocalDate birthday = LocalDate.of(2026, Month.OCTOBER, 29);   // months start at 1
        LocalTime shopOpens = LocalTime.of(7, 30);
        LocalDateTime pickup = LocalDateTime.of(birthday, LocalTime.of(18, 45));

        System.out.println(birthday + " " + shopOpens + " " + pickup);
        System.out.println(birthday.getDayOfWeek() + ", day " + birthday.getDayOfYear() + " of the year");

        birthday.plusDays(1);                          // returns a NEW date, result ignored
        System.out.println(birthday);
        LocalDate nextDay = birthday.plusDays(1);
        System.out.println(nextDay);

        System.out.println(LocalDate.of(2026, 1, 31).plusMonths(1));  // clamps to month end
        System.out.println(LocalDate.of(2028, 2, 29).isLeapYear());
        System.out.println(shopOpens.minusHours(8));                    // wraps around midnight
        System.out.println(pickup.withHour(9).with(DayOfWeek.MONDAY));
        System.out.println(birthday.isBefore(nextDay));
    }
}`,
        },
        {
          type: "output",
          text: `2026-10-29 07:30 2026-10-29T18:45
THURSDAY, day 302 of the year
2026-10-29
2026-10-30
2026-02-28
true
23:30
2026-10-26T09:45
true`,
        },
        {
          type: "list",
          items: [
            "Months are 1 to 12, and there's a `Month` enum so I don't have to remember.",
            "`toString()` is ISO-8601: `2026-10-29`, `07:30`, `2026-10-29T18:45`. No time zone surprises, because there's no zone.",
            "`birthday.plusDays(1);` on its own line did nothing to `birthday`. Immutability means I must use the returned value.",
            "31 January plus one month is 28 February: the day is clamped to the end of the shorter month. `Calendar` did the same, but here it's documented and predictable.",
            "`LocalTime` wraps around midnight: 07:30 minus 8 hours is 23:30, with no date to roll back.",
            "`with(...)` returns a copy with one field changed. `with(DayOfWeek.MONDAY)` moves to the Monday of the same week.",
          ],
        },
        {
          type: "heading",
          text: "Instant, zones and offsets",
        },
        {
          type: "code",
          language: "java",
          title: "Zones.java",
          code: `import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

public class Zones {
    public static void main(String[] args) {
        Instant kickOff = Instant.parse("2026-10-29T13:30:00Z");      // one moment for everyone

        System.out.println(kickOff.atZone(ZoneId.of("Asia/Kolkata")));
        System.out.println(kickOff.atZone(ZoneId.of("Europe/London")));
        System.out.println(kickOff.atZone(ZoneId.of("America/New_York")));
        System.out.println(kickOff.getEpochSecond());

        OffsetDateTime fixed = kickOff.atOffset(ZoneOffset.ofHoursMinutes(5, 30));
        System.out.println(fixed);

        LocalDateTime wallClock = LocalDateTime.of(2026, 10, 29, 19, 0);
        ZonedDateTime inKolkata = wallClock.atZone(ZoneId.of("Asia/Kolkata"));
        ZonedDateTime sameMomentInDubai = inKolkata.withZoneSameInstant(ZoneId.of("Asia/Dubai"));
        ZonedDateTime sameClockInDubai = inKolkata.withZoneSameLocal(ZoneId.of("Asia/Dubai"));
        System.out.println(sameMomentInDubai);
        System.out.println(sameClockInDubai);
        System.out.println(inKolkata.toInstant() + " vs " + sameClockInDubai.toInstant());
    }
}`,
        },
        {
          type: "output",
          text: `2026-10-29T19:00+05:30[Asia/Kolkata]
2026-10-29T13:30Z[Europe/London]
2026-10-29T09:30-04:00[America/New_York]
1793280600
2026-10-29T19:00+05:30
2026-10-29T17:30+04:00[Asia/Dubai]
2026-10-29T19:00+04:00[Asia/Dubai]
2026-10-29T13:30:00Z vs 2026-10-29T15:00:00Z`,
        },
        {
          type: "list",
          items: [
            "`Instant` is a point on the UTC timeline. The `Z` means UTC. `getEpochSecond()` is seconds since 1970-01-01T00:00Z.",
            "London shows `Z` (offset zero) because on 29 October it's already back on winter time. New York is still on `-04:00` daylight time; it changes a week later. Same zone id, different offset depending on the date. That's why a **zone** is more than an offset.",
            "A `ZoneId` like `Asia/Kolkata` is a region with a history of rules. A `ZoneOffset` like `+05:30` is just a fixed number of seconds. `OffsetDateTime` carries only the offset, so it can't know about future clock changes.",
            "`withZoneSameInstant` keeps the moment and changes the clock reading. `withZoneSameLocal` keeps the clock reading and changes the moment. The last line proves they're 90 minutes apart.",
          ],
        },
        {
          type: "heading",
          text: "Duration versus Period",
        },
        {
          type: "code",
          language: "java",
          title: "Amounts.java",
          code: `import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Period;
import java.time.temporal.ChronoUnit;

public class Amounts {
    public static void main(String[] args) {
        Duration ride = Duration.between(LocalTime.of(18, 5), LocalTime.of(19, 47));
        System.out.println(ride + " = " + ride.toMinutes() + " minutes");
        System.out.println(Duration.ofSeconds(90).plusMillis(250));

        LocalDate joined = LocalDate.of(2024, 1, 31);
        LocalDate today = LocalDate.of(2026, 10, 29);
        Period member = Period.between(joined, today);
        System.out.println(member + " = " + member.getYears() + "y " + member.getMonths() + "m " + member.getDays() + "d");
        System.out.println(member.getDays() + " vs " + ChronoUnit.DAYS.between(joined, today) + " days");

        System.out.println(ChronoUnit.HOURS.between(LocalDateTime.of(2026, 10, 29, 9, 0),
                                                    LocalDateTime.of(2026, 10, 30, 8, 59)));
        System.out.println(LocalDateTime.of(2026, 10, 29, 18, 47, 31).truncatedTo(ChronoUnit.HOURS));
        System.out.println(Period.parse("P1M15D").plusDays(20).normalized());
    }
}`,
        },
        {
          type: "output",
          text: `PT1H42M = 102 minutes
PT1M30.25S
P2Y8M29D = 2y 8m 29d
29 vs 1002 days
23
2026-10-29T18:00
P1M35D`,
        },
        {
          type: "list",
          items: [
            "`Duration` is an exact amount of seconds and nanoseconds. Its ISO form starts with `PT`: `PT1H42M`.",
            "`Period` is years, months and days, kept as three separate numbers: `P2Y8M29D`. It doesn't know how many days \"8 months\" is, because that depends on which months.",
            "`member.getDays()` is only the leftover days part, `29`. The total is `ChronoUnit.DAYS.between`, `1002`. Mixing those two up is a common bug.",
            "`ChronoUnit.X.between` counts **complete** units: 9:00 to 8:59 the next day is 23 hours, not 24.",
            "`normalized()` only folds months into years. It left `35` days alone, because a month has no fixed number of days.",
          ],
        },
        {
          type: "heading",
          text: "TemporalAdjusters",
        },
        {
          type: "paragraph",
          text: "Questions like \"next Monday\" or \"last Friday of the month\" are calendar rules, and `TemporalAdjusters` has them ready-made:",
        },
        {
          type: "code",
          language: "java",
          title: "Adjusters.java",
          code: `import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

public class Adjusters {
    public static void main(String[] args) {
        LocalDate today = LocalDate.of(2026, 10, 29);                         // a Thursday

        System.out.println(today.with(TemporalAdjusters.next(DayOfWeek.MONDAY)));
        System.out.println(today.with(TemporalAdjusters.nextOrSame(DayOfWeek.THURSDAY)));
        System.out.println(today.with(TemporalAdjusters.lastDayOfMonth()));
        System.out.println(today.with(TemporalAdjusters.firstDayOfNextMonth()));
        System.out.println(today.with(TemporalAdjusters.lastInMonth(DayOfWeek.FRIDAY)));
        System.out.println(today.with(TemporalAdjusters.dayOfWeekInMonth(2, DayOfWeek.SATURDAY)));
    }
}`,
        },
        {
          type: "output",
          text: `2026-11-02
2026-10-29
2026-10-31
2026-11-01
2026-10-30
2026-10-10`,
        },
        {
          type: "paragraph",
          text: "`next` always moves forward; `nextOrSame` stays put if today already matches. A `TemporalAdjuster` is a functional interface, so a custom rule like \"next working day\" can be a lambda.",
        },
        {
          type: "heading",
          text: "Formatting and parsing",
        },
        {
          type: "code",
          language: "java",
          title: "Formats.java",
          code: `import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.Locale;

public class Formats {
    static final DateTimeFormatter RECEIPT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a", Locale.ENGLISH);

    public static void main(String[] args) {
        LocalDateTime pickup = LocalDateTime.of(2026, 10, 29, 18, 45);
        System.out.println(RECEIPT.format(pickup));
        System.out.println(pickup.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        System.out.println(pickup.atZone(ZoneId.of("Asia/Kolkata")).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        System.out.println(LocalDateTime.parse("29 Oct 2026, 06:45 PM", RECEIPT));

        LocalDate newYearsWeek = LocalDate.of(2025, 12, 29);
        System.out.println(newYearsWeek.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
        System.out.println(newYearsWeek.format(DateTimeFormatter.ofPattern("YYYY-MM-dd")));

        try {
            LocalDate.parse("2026-02-30");                        // built-in ISO parser
        } catch (DateTimeParseException e) {
            System.out.println(e.getMessage());
        }
        System.out.println(LocalDate.parse("2026-02-30", DateTimeFormatter.ofPattern("yyyy-MM-dd")));
        DateTimeFormatter strict = DateTimeFormatter.ofPattern("uuuu-MM-dd")
                                                    .withResolverStyle(ResolverStyle.STRICT);
        try {
            LocalDate.parse("2026-02-30", strict);
        } catch (DateTimeParseException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `29 Oct 2026, 06:45 PM
2026-10-29T18:45:00
2026-10-29T18:45:00+05:30
2026-10-29T18:45
2025-12-29
2026-12-29
Text '2026-02-30' could not be parsed: Invalid date 'FEBRUARY 30'
2026-02-28
Text '2026-02-30' could not be parsed: Invalid date 'FEBRUARY 30'`,
        },
        {
          type: "list",
          items: [
            "Patterns are case-sensitive and every letter matters: `MM` is month, `mm` is minute, `hh` is 1-12 hours (needs `a` for AM/PM), `HH` is 0-23.",
            "**`YYYY` is not the year.** It's the week-based year. 29 December 2025 belongs to week 1 of 2026, so `YYYY` printed **2026-12-29**, a date a whole year off. Use `yyyy` (year of era) or `uuuu` (proleptic year).",
            "I always pass a `Locale` to `ofPattern`. Month names and AM/PM markers come from the locale, so `MMM` could print something other than `Oct` on a server with a different default.",
            "The built-in `ISO_LOCAL_DATE` parser rejects 30 February. A plain `ofPattern` uses the `SMART` resolver and quietly gave me 28 February. With `ResolverStyle.STRICT` it rejects it, but strict mode needs `uuuu` instead of `yyyy`, because `yyyy` also needs an era field to be strict about.",
          ],
        },
      ],
    },
    {
      title: "Internal Working",
      blocks: [
        {
          type: "heading",
          text: "What's inside each class",
        },
        {
          type: "paragraph",
          text: "My JDK 21 install has no source zip, so I asked `javap -p` for the instance fields of each class (static constants filtered out):",
        },
        {
          type: "output",
          text: `public final class java.time.Instant ...
  private final long seconds;
  private final int nanos;
public final class java.time.LocalDate ...
  private final int year;
  private final short month;
  private final short day;
public final class java.time.LocalTime ...
  private final byte hour;
  private final byte minute;
  private final byte second;
  private final int nano;
public final class java.time.LocalDateTime ...
  private final java.time.LocalDate date;
  private final java.time.LocalTime time;
public final class java.time.ZonedDateTime ...
  private final java.time.LocalDateTime dateTime;
  private final java.time.ZoneOffset offset;
  private final java.time.ZoneId zone;
public final class java.time.OffsetDateTime ...
  private final java.time.LocalDateTime dateTime;
  private final java.time.ZoneOffset offset;
public final class java.time.Duration ...
  private final long seconds;
  private final int nanos;
public final class java.time.Period ...
  private final int years;
  private final int months;
  private final int days;
public final class java.time.ZoneOffset extends java.time.ZoneId ...
  private final int totalSeconds;`,
        },
        {
          type: "paragraph",
          text: "(I cut the long `implements` lists.) This one listing explains most of the API:",
        },
        {
          type: "list",
          items: [
            "**Every class is `final` and every field is `final`.** No setters exist, and nobody can subclass one to add mutability. That's what makes them immutable, and immutable objects are thread-safe without any locking.",
            "`Instant` and `Duration` have the identical layout: a `long` of seconds plus an `int` of nanoseconds (0 to 999,999,999). An instant is literally \"a duration since 1970-01-01T00:00Z\".",
            "`LocalDate` stores the fields people think in (year, month, day), not a day count. `LocalTime` uses bytes for hour, minute and second.",
            "`LocalDateTime` is just a date plus a time. `ZonedDateTime` is a `LocalDateTime` plus the **offset in effect** plus the **zone**. It stores both because the zone alone can be ambiguous during a DST overlap, and the offset alone can't tell you future rules.",
            "`Period` really is three independent ints, which is why it can't normalize days into months.",
          ],
        },
        {
          type: "heading",
          text: "Seconds and nanos, including before 1970",
        },
        {
          type: "code",
          language: "java",
          title: "InsideInstant.java",
          code: `import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

public class InsideInstant {
    public static void main(String[] args) {
        Instant pickup = Instant.parse("2026-10-29T13:30:00.250Z");
        System.out.println(pickup.getEpochSecond() + " s + " + pickup.getNano() + " ns");

        Instant beforeEpoch = Instant.parse("1969-12-31T23:59:59.500Z");
        System.out.println(beforeEpoch.getEpochSecond() + " s + " + beforeEpoch.getNano() + " ns");
        System.out.println(beforeEpoch.toEpochMilli() + " ms");

        System.out.println(Instant.MIN + " .. " + Instant.MAX);
        System.out.println(ZoneOffset.ofHoursMinutes(5, 30) == ZoneOffset.ofHoursMinutes(5, 30));   // cached
        System.out.println(LocalDate.of(2026, 10, 29) == LocalDate.of(2026, 10, 29));             // new objects
        System.out.println(LocalDate.of(2026, 10, 29).equals(LocalDate.of(2026, 10, 29)));
    }
}`,
        },
        {
          type: "output",
          text: `1793280600 s + 250000000 ns
-1 s + 500000000 ns
-500 ms
-1000000000-01-01T00:00:00Z .. +1000000000-12-31T23:59:59.999999999Z
true
false
true`,
        },
        {
          type: "list",
          items: [
            "Half a second before 1970 is stored as `-1` second **plus** 500,000,000 nanos. The nano part is always positive, which keeps comparisons and arithmetic simple.",
            "The range is a billion years each way, far beyond `Date`'s practical range. That's what a `long` of seconds buys.",
            "`ZoneOffset` instances that are a multiple of 15 minutes are cached, so the same object came back. `LocalDate.of` creates a new object each time. Both are **value-based** classes, so neither result is something to rely on. Compare with `equals` or `isEqual`.",
          ],
        },
        {
          type: "paragraph",
          text: "Like `Optional`, the `java.time` classes are marked value-based, and `javac` warns about locking on one:",
        },
        {
          type: "code",
          language: "java",
          title: "SyncDate.java",
          code: `import java.time.LocalDate;

public class SyncDate {
    public static void main(String[] args) {
        LocalDate today = LocalDate.of(2026, 10, 29);
        synchronized (today) { System.out.println(today); }
    }
}`,
        },
        {
          type: "output",
          text: `SyncDate.java:6: warning: [synchronization] attempt to synchronize on an instance of a value-based class
        synchronized (today) { System.out.println(today); }
        ^
1 warning`,
        },
        {
          type: "heading",
          text: "Where the time zone rules live",
        },
        {
          type: "paragraph",
          text: "A `ZoneId` like `Europe/London` is a `ZoneRegion` holding two fields, the id string and a `ZoneRules` object:",
        },
        {
          type: "output",
          text: `  private final java.lang.String id;
  private final transient java.time.zone.ZoneRules rules;`,
        },
        {
          type: "paragraph",
          text: "The rules come from the IANA time zone database, which the JDK ships compiled into `lib/tzdb.dat` (about 100 KB in my install). Governments change their clock rules every year or so, which is why JDK updates include tzdata updates, and why Oracle ships a `tzupdater` tool for old JDKs. I asked the rules about 2026:",
        },
        {
          type: "code",
          language: "java",
          title: "Rules.java",
          code: `import java.time.Instant;
import java.time.ZoneId;
import java.time.zone.ZoneOffsetTransition;
import java.time.zone.ZoneRules;

public class Rules {
    public static void main(String[] args) {
        Instant from = Instant.parse("2026-01-01T00:00:00Z");
        for (String id : new String[] {"Europe/London", "America/New_York", "Asia/Kolkata"}) {
            ZoneRules rules = ZoneId.of(id).getRules();
            ZoneOffsetTransition t = rules.nextTransition(from);
            System.out.println(id + " fixed offset? " + rules.isFixedOffset() + ", next change: " + t);
        }
        System.out.println(ZoneId.of("Europe/London").getRules().getClass().getName());
    }
}`,
        },
        {
          type: "output",
          text: `Europe/London fixed offset? false, next change: Transition[Gap at 2026-03-29T01:00Z to +01:00]
America/New_York fixed offset? false, next change: Transition[Gap at 2026-03-08T02:00-05:00 to -04:00]
Asia/Kolkata fixed offset? false, next change: null
java.time.zone.ZoneRules`,
        },
        {
          type: "list",
          items: [
            "London's next change is a **gap**: at 01:00 UTC on 29 March the clocks jump forward, so local times from 01:00 to 01:59 don't exist that day.",
            "Kolkata has no future transitions (`null`), but it's not a \"fixed offset\" zone either, because its history includes older offsets. That's the difference between `Asia/Kolkata` and a plain `+05:30`: the region remembers its past.",
            "When I create a `ZonedDateTime` from a local date-time, `java.time` asks `ZoneRules` for the valid offsets at that local time: one in normal times, zero in a gap, two in an overlap. The DST examples below show what it does with zero and two.",
          ],
        },
        {
          type: "heading",
          text: "Why SimpleDateFormat isn't thread-safe and DateTimeFormatter is",
        },
        {
          type: "paragraph",
          text: "`javap -p java.text.DateFormat` shows where the problem lives:",
        },
        {
          type: "output",
          text: `  protected java.util.Calendar calendar;
  protected java.text.NumberFormat numberFormat;`,
        },
        {
          type: "paragraph",
          text: "Every `SimpleDateFormat` keeps one mutable `Calendar` as a scratch pad. `format` and `parse` write the fields into it, then read them back. Two threads using the same formatter overwrite each other's half-finished work. `DateTimeFormatter` is immutable and keeps nothing between calls: each parse builds its own temporary state. I shared one of each across 8 threads and checked 10,000 round trips:",
        },
        {
          type: "code",
          language: "java",
          title: "SharedFormatter.java",
          code: `import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class SharedFormatter {
    static final SimpleDateFormat OLD = new SimpleDateFormat("yyyy-MM-dd");      // one shared instance
    static final DateTimeFormatter NEW = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public static void main(String[] args) throws Exception {
        AtomicInteger oldBad = new AtomicInteger(), newBad = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int i = 0; i < 10_000; i++) {
            String text = LocalDate.of(2026, 1, 1).plusDays(i % 365).toString();
            pool.submit(() -> {
                try {
                    if (!OLD.format(OLD.parse(text)).equals(text)) oldBad.incrementAndGet();
                } catch (Exception e) {
                    oldBad.incrementAndGet();                 // NumberFormatException and friends
                }
                if (!LocalDate.parse(text, NEW).format(NEW).equals(text)) newBad.incrementAndGet();
            });
        }
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.MINUTES);
        System.out.println("SimpleDateFormat wrong results: " + oldBad);
        System.out.println("DateTimeFormatter wrong results: " + newBad);
    }
}`,
        },
        {
          type: "output",
          text: `SimpleDateFormat wrong results: 7702
DateTimeFormatter wrong results: 0`,
        },
        {
          type: "paragraph",
          text: "Three runs gave 7,702, 8,269 and 8,360 failures for `SimpleDateFormat`, and 0 every time for `DateTimeFormatter`. The exact count depends on thread timing and will differ on every machine and run. What doesn't change is that one is broken and the other isn't. Most failures weren't even exceptions, they were silently wrong dates, which is the scary part.",
        },
      ],
    },
    {
      title: "Syntax at a Glance",
      blocks: [
        {
          type: "code",
          language: "java",
          title: "the everyday calls",
          code: `// Now (always pass a Clock in real code, see below)
Instant now = Instant.now(clock);
LocalDate today = LocalDate.now(clock);

// Build
LocalDate d = LocalDate.of(2026, 10, 29);
LocalDateTime ldt = d.atTime(19, 0);
ZonedDateTime z = ldt.atZone(ZoneId.of("Asia/Kolkata"));
Instant i = z.toInstant();
Instant parsed = Instant.parse("2026-10-29T13:30:00Z");

// Change (always returns a new object)
d.plusDays(1); d.minusMonths(2); d.withDayOfMonth(1);
d.with(TemporalAdjusters.lastDayOfMonth());
i.plus(Duration.ofMinutes(30));
z.plus(Period.ofDays(1));

// Compare and measure
d.isBefore(other); i.isAfter(other);
Duration.between(start, end);
Period.between(fromDate, toDate);
ChronoUnit.DAYS.between(fromDate, toDate);

// Format and parse
DateTimeFormatter f = DateTimeFormatter.ofPattern("dd MMM uuuu", Locale.ENGLISH);
String s = d.format(f);
LocalDate back = LocalDate.parse(s, f);`,
        },
        {
          type: "paragraph",
          text: "(A fragment, so no output.) The naming is consistent across every class: `of` to build, `parse` from text, `plusX`/`minusX`/`withX` for new copies, `isBefore`/`isAfter`/`isEqual` to compare, `atX` to add information (`date.atTime`, `ldt.atZone`), and `toX` to drop or convert it (`zdt.toInstant`, `ldt.toLocalDate`).",
        },
      ],
    },
    {
      title: "Examples",
      blocks: [
        {
          type: "heading",
          text: "Daylight saving: a gap, an overlap, and \"tomorrow\"",
        },
        {
          type: "paragraph",
          text: "Everyday version: in London, on the last Sunday of March, the clocks jump from 1 am straight to 2 am. An alarm set for 1:30 am that night can't ring at 1:30, because 1:30 never happens. In October the clocks go back, and 1:30 am happens **twice**. India doesn't do this, which is exactly why Indian developers forget about it until a European customer complains.",
        },
        {
          type: "code",
          language: "java",
          title: "Dst.java",
          code: `import java.time.Duration;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.ZoneId;
import java.time.ZonedDateTime;

public class Dst {
    public static void main(String[] args) {
        ZoneId london = ZoneId.of("Europe/London");

        // Spring forward: on 29 Mar 2026 clocks jump from 01:00 to 02:00
        System.out.println(ZonedDateTime.of(LocalDateTime.of(2026, 3, 29, 1, 30), london));

        // Fall back: on 25 Oct 2026 01:00-02:00 happens twice
        ZonedDateTime ambiguous = ZonedDateTime.of(LocalDateTime.of(2026, 10, 25, 1, 30), london);
        System.out.println(ambiguous);
        System.out.println(ambiguous.withLaterOffsetAtOverlap());

        // "Same time tomorrow" vs "24 hours later" across the jump
        ZonedDateTime alarm = ZonedDateTime.of(LocalDateTime.of(2026, 3, 28, 9, 0), london);
        System.out.println(alarm.plus(Period.ofDays(1)));
        System.out.println(alarm.plus(Duration.ofDays(1)));
        System.out.println(Duration.between(alarm, alarm.plusDays(1)));
    }
}`,
        },
        {
          type: "output",
          text: `2026-03-29T02:30+01:00[Europe/London]
2026-10-25T01:30+01:00[Europe/London]
2026-10-25T01:30Z[Europe/London]
2026-03-29T09:00+01:00[Europe/London]
2026-03-29T10:00+01:00[Europe/London]
PT23H`,
        },
        {
          type: "list",
          items: [
            "**Gap:** I asked for 01:30, which doesn't exist. `java.time` didn't throw. It moved the time forward by the length of the gap, to 02:30 BST.",
            "**Overlap:** 01:30 exists twice. By default it picked the **earlier** one (`+01:00`, still summer time). `withLaterOffsetAtOverlap()` gave me the second 01:30 (`Z`, winter time), one real hour later.",
            "**Period vs Duration:** \"one day later\" with `Period.ofDays(1)` kept 9:00 on the clock. \"24 hours later\" with `Duration.ofDays(1)` landed on 10:00, because that Sunday was only 23 hours long, as `PT23H` confirms.",
          ],
        },
        {
          type: "paragraph",
          text: "So the rule is: for things people experience on a wall clock (\"remind me every day at 9\"), add a `Period` to a `ZonedDateTime`. For exact elapsed time (\"session expires in 24 hours\", \"OTP valid for 5 minutes\"), add a `Duration` to an `Instant`.",
        },
        {
          type: "heading",
          text: "Clock: making \"now\" testable",
        },
        {
          type: "paragraph",
          text: "Everyday version: if I want to test \"is the tea stall open?\", I can't wait until 10:30 pm to see if the code says closed. I need to be able to set the clock on the wall to any time I like. That's `java.time.Clock`. Every `now()` method has an overload that takes one:",
        },
        {
          type: "code",
          language: "java",
          title: "ClockDemo.java",
          code: `import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;

public class ClockDemo {
    // The tea stall is open 07:00-22:00 in its own city
    static boolean isOpen(Clock clock) {
        LocalTime now = LocalTime.now(clock);
        return !now.isBefore(LocalTime.of(7, 0)) && now.isBefore(LocalTime.of(22, 0));
    }

    public static void main(String[] args) {
        ZoneId kolkata = ZoneId.of("Asia/Kolkata");
        Clock morning = Clock.fixed(Instant.parse("2026-10-29T03:00:00Z"), kolkata);   // 08:30 IST
        Clock lateNight = Clock.offset(morning, Duration.ofHours(14));                  // 22:30 IST

        System.out.println(LocalTime.now(morning) + " open? " + isOpen(morning));
        System.out.println(LocalTime.now(lateNight) + " open? " + isOpen(lateNight));
        System.out.println(Instant.now(morning).equals(Instant.now(morning)));          // frozen
    }
}`,
        },
        {
          type: "output",
          text: `08:30 open? true
22:30 open? false
true`,
        },
        {
          type: "list",
          items: [
            "`Clock.fixed(instant, zone)` always returns the same moment. Perfect for tests.",
            "`Clock.offset(base, duration)` is another clock shifted by a fixed amount, handy for \"45 minutes later\" in the same test.",
            "In production the app uses `Clock.systemUTC()` (or `systemDefaultZone()`), usually provided once as a Spring `@Bean` and injected wherever \"now\" is needed.",
            "A `Clock` also carries a zone, so `LocalTime.now(morning)` knew to show Kolkata time.",
          ],
        },
        {
          type: "heading",
          text: "Converting to and from the old types",
        },
        {
          type: "paragraph",
          text: "Old libraries, JDBC drivers and some frameworks still hand me `Date`, `Calendar` or `java.sql.Timestamp`. Java 8 added bridge methods to those old classes:",
        },
        {
          type: "code",
          language: "java",
          title: "Convert.java",
          code: `import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.TimeZone;

public class Convert {
    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
        Instant paidAt = Instant.parse("2026-10-29T13:30:00Z");

        Date legacy = Date.from(paidAt);                       // new -> old
        System.out.println(legacy + " | " + legacy.toInstant());   // old -> new

        GregorianCalendar cal = GregorianCalendar.from(paidAt.atZone(ZoneId.of("Europe/London")));
        ZonedDateTime back = cal.toZonedDateTime();
        System.out.println(back);

        Timestamp ts = Timestamp.from(paidAt);
        System.out.println(ts + " | " + ts.toLocalDateTime() + " | " + ts.toInstant());
        System.out.println(Timestamp.valueOf(LocalDateTime.of(2026, 10, 29, 19, 0)).toInstant());
        System.out.println(TimeZone.getTimeZone(ZoneId.of("Asia/Dubai")).getID());
    }
}`,
        },
        {
          type: "output",
          text: `Thu Oct 29 19:00:00 IST 2026 | 2026-10-29T13:30:00Z
2026-10-29T13:30Z[Europe/London]
2026-10-29 19:00:00.0 | 2026-10-29T19:00 | 2026-10-29T13:30:00Z
2026-10-29T13:30:00Z
Asia/Dubai`,
        },
        {
          type: "list",
          items: [
            "`Date.from(instant)` and `date.toInstant()` are exact, because both are moments. Only `Date.toString()` adds the default zone.",
            "`GregorianCalendar.from` and `toZonedDateTime` keep the zone.",
            "Careful with `Timestamp`: `toLocalDateTime()` and `Timestamp.valueOf(LocalDateTime)` both silently use the **JVM default zone**. The same instant gave `19:00` here because the default was Kolkata. On a server set to UTC it would be `13:30`. Prefer `Timestamp.from(instant)` and `toInstant()`, or skip `Timestamp` entirely (see Production).",
          ],
        },
      ],
    },
    {
      title: "Common Mistakes",
      blocks: [
        {
          type: "heading",
          text: "Ignoring the result of plusDays",
        },
        {
          type: "paragraph",
          text: "`birthday.plusDays(1);` on its own did nothing in `LocalBasics`. The object is immutable; the new date is the return value. Write `d = d.plusDays(1);`.",
        },
        {
          type: "heading",
          text: "Using YYYY instead of yyyy",
        },
        {
          type: "paragraph",
          text: "`Formats` printed `2026-12-29` for 29 December 2025. This bug ships every year and appears in the last days of December, when nobody is around to fix it. Code review rule: capital `Y` in a pattern needs a very good reason.",
        },
        {
          type: "heading",
          text: "Parsing user input with a case-sensitive pattern",
        },
        {
          type: "code",
          language: "java",
          title: "CaseTrap.java",
          code: `import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.Locale;

public class CaseTrap {
    public static void main(String[] args) {
        DateTimeFormatter f = DateTimeFormatter.ofPattern("hh:mm a dd/MM/yyyy", Locale.ENGLISH);
        try {
            LocalDateTime.parse("06:45 pm 29/10/2026", f);
        } catch (Exception e) {
            System.out.println(e.getMessage());
        }
        DateTimeFormatter relaxed = new DateTimeFormatterBuilder()
                .parseCaseInsensitive()
                .appendPattern("hh:mm a dd/MM/yyyy")
                .toFormatter(Locale.ENGLISH);
        System.out.println(LocalDateTime.parse("06:45 pm 29/10/2026", relaxed));
    }
}`,
        },
        {
          type: "output",
          text: `Text '06:45 pm 29/10/2026' could not be parsed at index 6
2026-10-29T18:45`,
        },
        {
          type: "paragraph",
          text: "Index 6 is where `pm` starts. The English locale's marker is `PM`, and parsing is case-sensitive by default. `parseCaseInsensitive()` on a builder fixes it.",
        },
        {
          type: "heading",
          text: "Storing LocalDateTime for a moment",
        },
        {
          type: "paragraph",
          text: "A `LocalDateTime` of `2026-10-29T19:00` is 13:30 UTC in Kolkata and 15:00 UTC in Dubai, as `Zones` showed. If a booking table stores only that, the moment is lost the day a second city is added. Moments (\"when was this paid\", \"when should the driver arrive\") are `Instant`, stored as UTC.",
        },
        {
          type: "heading",
          text: "Adding a Duration when you meant a calendar day",
        },
        {
          type: "paragraph",
          text: "`Dst` showed 9:00 plus `Duration.ofDays(1)` landing on 10:00. Daily reminders, subscription renewals and \"same time tomorrow\" are `Period`s on a `ZonedDateTime`, not 24-hour Durations.",
        },
        {
          type: "heading",
          text: "Calling now() without a Clock",
        },
        {
          type: "paragraph",
          text: "`LocalDate.now()` uses the server's default zone and the real time. Tests become flaky around midnight, and a server moved from IST to UTC silently changes what \"today\" means. Pass a `Clock`, and for local dates pass the zone the business actually cares about: `LocalDate.now(clock.withZone(cityZone))`.",
        },
        {
          type: "heading",
          text: "Sharing a SimpleDateFormat",
        },
        {
          type: "paragraph",
          text: "A `static final SimpleDateFormat` gave thousands of wrong dates in `SharedFormatter`. If legacy code must keep it, give each call its own instance (or a `ThreadLocal`), but the real fix is `DateTimeFormatter`, which is safe as a constant.",
        },
        {
          type: "heading",
          text: "Using Period.getDays() as the total",
        },
        {
          type: "paragraph",
          text: "`Period.between(2024-01-31, 2026-10-29).getDays()` is `29`, not `1002`. For a total count, use `ChronoUnit.DAYS.between`.",
        },
      ],
    },
    {
      title: "Best Practices",
      blocks: [
        {
          type: "list",
          items: [
            "Pick the type by the question: `Instant` for moments, `LocalDate` for dates like birthdays and holidays, `LocalTime` for opening hours, `ZonedDateTime` for showing a moment to a person in their city.",
            "Store moments in UTC. In PostgreSQL that's a `TIMESTAMP WITH TIME ZONE` (`timestamptz`) column, which stores UTC internally. In MySQL a `DATETIME` written by a UTC-configured app, or `TIMESTAMP`. Keep servers and JVMs on UTC as well.",
            "Store the user's `ZoneId` (like `Asia/Kolkata`) separately when you need to show local times later or schedule \"every day at 9 in their city\". An offset like `+05:30` isn't enough for zones with DST.",
            "Convert to local time only at the edges: when showing a time to a person, or reading one they typed.",
            "Inject a `Clock` (or Java 17's `InstantSource`) into anything that asks for \"now\". Use `Clock.fixed` in tests.",
            "Keep formatters as `static final` constants with an explicit `Locale`. Use `yyyy` or `uuuu`, never `YYYY` by accident, and `ResolverStyle.STRICT` with `uuuu` when parsing input that must be valid.",
            "For APIs, send ISO-8601 with an offset or `Z` (`2026-10-29T13:30:00Z`). Jackson's `JavaTimeModule` handles this, and Spring Boot registers it automatically.",
            "Don't introduce new code on `Date`, `Calendar` or `SimpleDateFormat`. Convert at the boundary with `Date.from` and `toInstant`.",
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
            "These are small immutable objects. Every `plusDays` allocates a new one, which is cheap and often removed by escape analysis in hot code.",
            "`DateTimeFormatter.ofPattern` parses the pattern into a tree of printer-parsers each time it's called. Build formatters once, as constants. Unlike `SimpleDateFormat`, sharing them costs nothing in safety.",
            "`ZoneId.of(\"Europe/London\")` loads and caches the zone's rules from `tzdb.dat` the first time. Later calls are cheap, but keeping a `ZoneId` constant is still tidy.",
            "Comparing or sorting `Instant`s is comparing two numbers. Sorting `ZonedDateTime`s by `compareTo` also checks the local time and zone id when instants are equal, so if only the moment matters, sort by `toInstant()`.",
            "`Instant.now()` on Linux with JDK 9+ has microsecond precision (Java 8 only gave milliseconds), but its exact value is obviously different each run. That's another reason to inject a `Clock`.",
          ],
        },
      ],
    },
    {
      title: "Date and Time in Production",
      blocks: [
        {
          type: "paragraph",
          text: "Everyday version first. A rider in Kolkata books a cab for \"7 pm today\". The support team sits in London. The rider can cancel for free until one hour before pickup. Three questions: what do we store, what does each person see, and is free cancellation still allowed right now?",
        },
        {
          type: "paragraph",
          text: "This is the kind of scheduling code a ride-booking backend like my RideX project needs. It's one small service, written as plain Java so it runs on its own, with comments where Spring would come in:",
        },
        {
          type: "code",
          language: "java",
          title: "BookingDemo.java",
          code: `import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

// What we save: one UTC instant (a TIMESTAMPTZ column) plus the rider's zone id.
record ScheduledRide(String id, Instant pickupAt, ZoneId riderZone) { }

// @Service
class ScheduledRideService {
    private static final Duration FREE_CANCEL_BEFORE = Duration.ofHours(1);
    private static final DateTimeFormatter SHOW =
            DateTimeFormatter.ofPattern("EEE dd MMM, hh:mm a z", Locale.ENGLISH);

    private final Clock clock;                                 // injected, so tests can freeze time

    ScheduledRideService(Clock clock) { this.clock = clock; }

    ScheduledRide book(String id, LocalDateTime localPickup, ZoneId riderZone) {
        Instant pickupAt = localPickup.atZone(riderZone).toInstant();   // rider's wall clock -> UTC
        if (!pickupAt.isAfter(Instant.now(clock).plus(Duration.ofMinutes(30)))) {
            throw new IllegalArgumentException("Pickup must be at least 30 minutes from now");
        }
        return new ScheduledRide(id, pickupAt, riderZone);
    }

    boolean canCancelForFree(ScheduledRide ride) {
        return Instant.now(clock).isBefore(ride.pickupAt().minus(FREE_CANCEL_BEFORE));
    }

    String confirmationText(ScheduledRide ride, ZoneId viewerZone) {
        return "Pickup " + SHOW.format(ride.pickupAt().atZone(viewerZone));
    }
}

public class BookingDemo {
    public static void main(String[] args) {
        Clock now = Clock.fixed(Instant.parse("2026-10-29T12:00:00Z"), ZoneId.of("UTC"));  // 17:30 IST
        ScheduledRideService service = new ScheduledRideService(now);

        ScheduledRide ride = service.book("R-42", LocalDateTime.of(2026, 10, 29, 19, 0), ZoneId.of("Asia/Kolkata"));
        System.out.println("stored : " + ride.pickupAt());
        System.out.println("rider  : " + service.confirmationText(ride, ride.riderZone()));
        System.out.println("support: " + service.confirmationText(ride, ZoneId.of("Europe/London")));
        System.out.println("free cancel now?        " + service.canCancelForFree(ride));

        ScheduledRideService later = new ScheduledRideService(Clock.offset(now, Duration.ofMinutes(45)));
        System.out.println("free cancel in 45 min?  " + later.canCancelForFree(ride));

        try {
            service.book("R-43", LocalDateTime.of(2026, 10, 29, 17, 45), ZoneId.of("Asia/Kolkata"));
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
        },
        {
          type: "output",
          text: `stored : 2026-10-29T13:30:00Z
rider  : Pickup Thu 29 Oct, 07:00 PM IST
support: Pickup Thu 29 Oct, 01:30 PM GMT
free cancel now?        true
free cancel in 45 min?  false
Pickup must be at least 30 minutes from now`,
        },
        {
          type: "list",
          items: [
            "The rider's \"7 pm\" is a `LocalDateTime`, which only means something with their zone. `atZone(riderZone).toInstant()` turns it into the one moment we store: 13:30 UTC.",
            "Each viewer sees that moment in their own zone. The rider sees 7:00 PM IST, London support sees 1:30 PM GMT. Nothing is stored twice.",
            "The cancellation and \"30 minutes from now\" rules are exact time, so they're `Duration` arithmetic on `Instant`s. No zones involved, so DST can't break them.",
            "Time is frozen with `Clock.fixed` at 12:00 UTC. Free cancellation ends at 12:30 UTC, so \"now\" is `true` and \"45 minutes later\" (`Clock.offset`) is `false`. That test would be impossible with `Instant.now()`.",
            "A 5:45 pm pickup is only 15 minutes after the frozen 5:30 pm IST, so `book` rejects it.",
            "In Spring, the `Clock` is one `@Bean` returning `Clock.systemUTC()`, and tests replace it.",
          ],
        },
        {
          type: "paragraph",
          text: "Saving it is the other half. With plain JDBC 4.2, `java.time` types go straight in and out, no `Timestamp` and no default-zone conversion:",
        },
        {
          type: "code",
          language: "java",
          code: `// pickup_at TIMESTAMPTZ NOT NULL, rider_zone TEXT NOT NULL
ps.setObject(1, ride.pickupAt().atOffset(ZoneOffset.UTC));      // OffsetDateTime in UTC
ps.setString(2, ride.riderZone().getId());

OffsetDateTime stored = rs.getObject("pickup_at", OffsetDateTime.class);
Instant pickupAt = stored.toInstant();`,
        },
        {
          type: "paragraph",
          text: "(A fragment without a database, so no output.) With JPA and Hibernate 6 I map the field as `Instant` and set `hibernate.jdbc.time_zone=UTC`, so the JVM's default zone never sneaks into the conversion. PostgreSQL's `timestamptz` doesn't store a zone at all, it normalizes to UTC, which is exactly why the rider's `ZoneId` is a separate column.",
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
              question: "What was wrong with java.util.Date and Calendar?",
              answer:
                "`Date` is mutable, so any code holding a reference can change it. Its deprecated constructor counts years from 1900 and months from 0, its `toString` uses the JVM default zone even though it has no zone, and its name is misleading: it's an instant, not a date. `Calendar` is also mutable, still has 0-based months, and is clumsy to use.\n\n`SimpleDateFormat` adds a thread-safety problem and lenient parsing. I ran `new Date(2026, 10, 29)` and got 29 November 3926.",
            },
            {
              question: "What is the difference between LocalDate, LocalDateTime, ZonedDateTime and Instant?",
              answer:
                "`LocalDate` is a date with no time or zone, like a birthday. `LocalDateTime` adds a clock time but still no zone, so it isn't a moment. `ZonedDateTime` is a local date-time in a specific zone with its rules, which does pin down a moment. `Instant` is a moment on the UTC timeline with no human calendar attached.\n\nI use `Instant` for storing and comparing moments, `ZonedDateTime` for showing them to people, and the local types for things that genuinely have no zone.",
            },
            {
              question: "What is the difference between Duration and Period?",
              answer:
                "`Duration` is exact time: seconds plus nanos, printed like `PT1H42M`. `Period` is calendar time: separate years, months and days, printed like `P2Y8M29D`.\n\nThey differ across DST. In London, 9:00 on 28 March 2026 plus `Period.ofDays(1)` was 9:00 the next day, but plus `Duration.ofDays(1)` was 10:00, because that day was only 23 hours long.",
            },
            {
              question: "Are java.time classes thread-safe? Why?",
              answer:
                "Yes. Every class is `final` and every field is `final`, with no setters. An object can't change after construction, so sharing it between threads needs no locking. `javap -p` shows this for `Instant`, `LocalDate`, `ZonedDateTime` and the rest.\n\n`DateTimeFormatter` is immutable too, which is why one shared formatter gave 0 errors across 8 threads while a shared `SimpleDateFormat` gave thousands.",
            },
            {
              question: "What is the difference between ZoneId and ZoneOffset?",
              answer:
                "A `ZoneOffset` is a fixed difference from UTC, like `+05:30`. A `ZoneId` such as `Europe/London` is a region with a set of rules that say which offset applies on which date, including DST changes and historical changes. `ZoneOffset` is actually a subclass of `ZoneId` with a single fixed rule.\n\nFor anything in the future in a DST country, the region id is required. London is `+01:00` in summer and `Z` in winter.",
            },
            {
              question: "How do you convert between Date and Instant?",
              answer:
                "`Date.from(instant)` and `date.toInstant()`, both added in Java 8. Since both represent a moment, the conversion is exact. For calendars there's `GregorianCalendar.from(zonedDateTime)` and `toZonedDateTime()`.\n\nFor `java.sql.Timestamp`, use `Timestamp.from(instant)` and `toInstant()`. `toLocalDateTime()` and `valueOf(LocalDateTime)` apply the JVM default zone, which gave me 19:00 instead of 13:30 when the default was Kolkata.",
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
              question: "What does ZonedDateTime do with a local time that doesn't exist, or exists twice?",
              answer:
                "In a DST gap, the time is shifted forward by the length of the gap: 01:30 on 29 March 2026 in London became 02:30 BST. In an overlap, it picks the earlier offset by default: 01:30 on 25 October 2026 became `+01:00`, and `withLaterOffsetAtOverlap()` gave the second one at `Z`.\n\nIt doesn't throw in either case, so code that schedules jobs at local times needs to decide whether that behaviour is acceptable.",
            },
            {
              question: "Why does formatting 29 December 2025 with YYYY-MM-dd print 2026?",
              answer:
                "`Y` is the week-based year, not the calendar year. 29 December 2025 falls in the first week of 2026 under ISO week rules, so `YYYY` gives 2026, while `MM-dd` still gives 12-29. The result, `2026-12-29`, is a year off.\n\n`yyyy` (year of era) or `uuuu` (proleptic year) is what's almost always meant. The same trap exists in `SimpleDateFormat`.",
            },
            {
              question: "What's the difference between yyyy and uuuu, and why does STRICT parsing care?",
              answer:
                "`u` is the proleptic year, which can be zero or negative. `y` is the year of era, always positive, and needs an era (AD/BC) to be fully defined. For modern dates both print the same.\n\nWith `ResolverStyle.STRICT`, a `yyyy` pattern without an era can't be resolved strictly, so parsing fails even for valid dates. The usual strict pattern is `uuuu-MM-dd`, which rejected 30 February in my test, while the default `SMART` resolver quietly turned it into 28 February.",
            },
            {
              question: "Why is LocalDateTime a bad choice for storing an event time?",
              answer:
                "Because it doesn't identify a moment. `2026-10-29T19:00` is 13:30 UTC in Kolkata and 15:00 UTC in Dubai. Store it, and the meaning depends on whatever zone someone assumes later.\n\nStore an `Instant` (a `timestamptz` column) for the moment, and the `ZoneId` separately if you need to show local times or schedule in the user's zone.",
            },
            {
              question: "How do you make code that uses the current time testable?",
              answer:
                "Inject a `java.time.Clock` and call `Instant.now(clock)`, `LocalDate.now(clock)` and so on. Production uses `Clock.systemUTC()`; tests use `Clock.fixed(...)` and `Clock.offset(...)`.\n\nMy booking service tested \"free cancellation now\" and \"45 minutes later\" in one run with no sleeping and no flakiness. Java 17's `InstantSource` is a smaller interface for code that only needs the instant.",
            },
            {
              question: "Period.between(2024-01-31, 2026-10-29).getDays() returns 29. Is that the number of days between them?",
              answer:
                "No. A `Period` is three separate parts, and this one is `P2Y8M29D`, so `getDays()` is only the leftover day part. The total is `ChronoUnit.DAYS.between(start, end)`, which was 1002.\n\nThe same confusion exists with `Duration.toMinutes()` (total) versus `toMinutesPart()` (Java 9, only the minutes component).",
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
              question: "How is an Instant stored internally?",
              answer:
                "As a `long` of seconds since 1970-01-01T00:00Z and an `int` of nanoseconds from 0 to 999,999,999. Moments before 1970 have negative seconds but still a positive nano part: half a second before the epoch is `-1` seconds plus `500000000` nanos.\n\n`Duration` uses exactly the same two fields. The range is roughly a billion years either side of 1970.",
            },
            {
              question: "What fields does ZonedDateTime hold, and why both offset and zone?",
              answer:
                "A `LocalDateTime`, a `ZoneOffset` and a `ZoneId`. The zone gives the rules, and the offset records which offset applies to this particular value.\n\nThe offset is needed because, during an overlap, the same local time and zone can mean two different moments. Storing the offset settles which one. The zone is needed because arithmetic like `plusDays` must re-apply the zone's rules to find the new offset.",
            },
            {
              question: "Where do time zone rules come from in the JDK?",
              answer:
                "From the IANA tz database, compiled into `lib/tzdb.dat` in the JDK. A `ZoneRegion` holds the id and a `ZoneRules` object that knows every past and planned transition. `rules.nextTransition(...)` showed London's 2026 gap and New York's, and `null` for Kolkata.\n\nWhen a country changes its rules, the JDK needs a tzdata update, through a JDK update or Oracle's `tzupdater` tool, or times in that zone will be wrong.",
            },
            {
              question: "Why is SimpleDateFormat not thread-safe?",
              answer:
                "It inherits a mutable `Calendar calendar` field from `DateFormat` (visible with `javap -p`), and uses it as scratch space during every `format` and `parse`. Two threads using the same instance overwrite each other's fields mid-operation, giving exceptions or, worse, wrong dates.\n\nMy test with 8 threads and 10,000 round trips gave around 8,000 bad results per run. `DateTimeFormatter` is immutable and keeps per-call state on the stack, and had 0.",
            },
            {
              question: "What does it mean that LocalDate is value-based?",
              answer:
                "Its instances should be treated as pure values: compared with `equals` or `isEqual`, never with `==`, never used as a lock. The JDK is free to cache some instances and not others.\n\n`ZoneOffset.ofHoursMinutes(5, 30)` returned the same cached object twice, while `LocalDate.of(2026, 10, 29)` returned new objects each time. Neither is guaranteed. `javac` warns when you `synchronized` on a `LocalDate`.",
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
            "Print your age in years, months and days with `Period.between`, and your age in total days with `ChronoUnit.DAYS.between`. Use a fixed \"today\" so the answer doesn't change.",
            "Take the instant `2026-12-31T18:30:00Z` and print it in `Asia/Kolkata`, `Europe/London` and `America/Los_Angeles`. Which of them are already in 2027?",
            "Find the date of the last Friday of every month in 2027 with `TemporalAdjusters.lastInMonth`. Hint: loop over `Month.values()` with `LocalDate.of(2027, m, 1)`.",
            "In `America/New_York`, create 02:30 on 8 March 2026 and print it. Then create 01:30 on 1 November 2026 and print both offsets with `withEarlierOffsetAtOverlap` and `withLaterOffsetAtOverlap`.",
            "Format 30 December 2024 with `yyyy` and with `YYYY`. Predict the second one before running it.",
            "Write a `isHappyHour(Clock clock)` method for a tea stall (16:00 to 18:00, Kolkata time) and test it with three `Clock.fixed` values: one before, one inside, one after.",
            "Write a strict parser for `dd/MM/uuuu` and try `31/04/2026`, `29/02/2028` and `29/02/2027`.",
          ],
        },
        {
          type: "qa",
          items: [
            {
              question: "Solution sketch for exercise 2",
              answer:
                "`Instant i = Instant.parse(\"2026-12-31T18:30:00Z\");` then `i.atZone(ZoneId.of(\"Asia/Kolkata\"))` and so on. 18:30 UTC plus 5:30 is exactly midnight in Kolkata, so it prints `2027-01-01T00:00+05:30[Asia/Kolkata]`. London (UTC+0 in winter) is still 31 December at 18:30, and Los Angeles is 10:30 the same morning.\n\nOne instant, three different dates. That's why \"which day was this order placed\" depends on whose day you mean.",
            },
            {
              question: "Solution sketch for exercise 7",
              answer:
                "`DateTimeFormatter.ofPattern(\"dd/MM/uuuu\").withResolverStyle(ResolverStyle.STRICT)`. `31/04/2026` fails (April has 30 days), `29/02/2028` parses (2028 is a leap year), and `29/02/2027` fails.\n\nWith `yyyy` instead of `uuuu`, all three fail in strict mode, because the year of era can't be resolved without an era field.",
            },
          ],
        },
      ],
    },
    {
      title: "Summary",
      blocks: [
        {
          type: "diagram",
          text: `WHICH TYPE
  LocalDate        2026-10-29              birthday, holiday
  LocalTime        07:30                   opening hours
  LocalDateTime    2026-10-29T19:00        "7 pm", NOT a moment
  Instant          2026-10-29T13:30:00Z    THE moment, store this
  ZonedDateTime    ...+05:30[Asia/Kolkata] show to a person
  OffsetDateTime   ...+05:30               APIs, JDBC
  Duration  PT1H42M   exact seconds        Instant math
  Period    P2Y8M29D  calendar y/m/d       "same time tomorrow"

RULES
  immutable: d = d.plusDays(1)
  months 1-12, ISO toString, all thread-safe
  yyyy / uuuu, never YYYY;  pass a Locale
  DST gap -> shifted forward; overlap -> earlier offset
  inject Clock;  test with Clock.fixed
  store UTC (timestamptz) + user's ZoneId

INSIDE
  Instant / Duration = long seconds + int nanos
  ZonedDateTime = LocalDateTime + ZoneOffset + ZoneId
  rules from lib/tzdb.dat (IANA)
  SimpleDateFormat: shared mutable Calendar -> unsafe

LEGACY  Date.from(i)  date.toInstant()  Timestamp.from(i)`,
          caption: "The java.time map I keep next to me when dates get confusing.",
        },
        {
          type: "list",
          items: [
            "Pick the type by the question: a date, a clock time, a moment, or a moment in a place.",
            "Store moments as UTC instants plus the user's zone id. Convert to local time only when a human reads or types it.",
            "`Duration` for exact time, `Period` for calendar time, and DST is where the difference bites.",
            "Everything is immutable and thread-safe, which is the main reason `Date`, `Calendar` and `SimpleDateFormat` should stay at the edges of old code.",
          ],
        },
      ],
    },
  ],
};
