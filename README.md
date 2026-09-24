# Prince Kumar Sharma — Portfolio

Personal portfolio and engineering notes. Built with Next.js, Tailwind CSS and Motion.

```bash
npm install
npm run dev   # http://localhost:3000 (Node 20.9+)
```

- `data/` — projects, journey, social links
- `content/writing/` — all lessons and notes
- `public/resume.pdf` — résumé linked from the hero and About section

## Visitor alerts

`proxy.ts` emails a short alert (page, city, referrer, device) when a new visitor lands on the site
(once per browser per day) and when someone opens the résumé. Bots and link previews are ignored.

| Variable | Required | Meaning |
|---|---|---|
| `RESEND_API_KEY` | yes | Resend API key. Without it, alerts are only logged to the console. |
| `ALERT_EMAIL` | no | Where alerts go. Defaults to the contact email; on Resend's free plan it must be the address the Resend account was created with. |

Put them in `.env.local` for local runs and in Vercel → Settings → Environment Variables for production.

## Adding writing

Every topic is a category in `content/writing/index.ts`: Java, DSA, Spring & Spring Boot,
System Design, MySQL, Operating Systems and Computer Networks. A category stays hidden until it
has its first lesson.

1. Create the lesson file in the category's folder, e.g. `content/writing/dsa/two-sum.ts`.
2. Export it from that folder's `index.ts` array. Its position there is its number.
3. For a new folder, point the category's `lessons` at that array in `content/writing/index.ts`.

Pages, numbering, previous/next links and the homepage preview update on their own.

Java is split into learning phases in `content/writing/java/index.ts`. Add a lesson to its phase's
`lessons` array; a phase with no lessons yet shows as "Coming soon", and lesson numbers run straight
through the phases.

### Lesson format

A lesson is a list of sections; each section is a title plus ordered blocks — `paragraph`,
`heading`, `list`, `code`, `output`, `diagram`, `table`, `callout`, `image`, `qa` (interview
questions with collapsible answers) and `complexity`. Text supports inline `` `code` `` and
`**bold**`. Section numbers come from their order. All block types are in
`content/writing/types.ts`.

### DSA problem template

Each approach is a section, so the page's contents sidebar reads
Problem → Brute Force → Better → Optimal.

```ts
import type { Lesson } from "../types";

export const twoSum: Lesson = {
  slug: "two-sum",
  date: "2026-10-01", // when I wrote it
  title: "Two Sum",
  description: "Find two indices whose values add up to a target.",
  tags: ["Array", "Hashing"],
  difficulty: "Easy",
  problemUrl: "https://leetcode.com/problems/two-sum/",
  sections: [
    {
      title: "Problem",
      blocks: [
        { type: "paragraph", text: "Given an array `nums` and an integer `target`, ..." },
        { type: "code", language: "text", code: "nums = [2, 7, 11, 15], target = 9" },
        { type: "output", text: "[0, 1]" },
      ],
    },
    {
      title: "Brute Force",
      blocks: [
        { type: "paragraph", text: "**Intuition:** try every pair ..." },
        { type: "code", language: "java", code: "..." },
        { type: "list", ordered: true, items: ["i = 0, j = 1 → 2 + 7 = 9 ✓"] },
        { type: "complexity", time: "O(n²)", space: "O(1)" },
      ],
    },
    { title: "Better", blocks: [/* ... */] },
    { title: "Optimal", blocks: [/* ... */] },
  ],
};
```
