# Prince Kumar Sharma — Portfolio

Personal portfolio and engineering notes. Built with Next.js, Tailwind CSS and Motion.

```bash
npm install
npm run dev   # http://localhost:3000 (Node 20.9+)
```

- `data/` — projects, journey, social links
- `content/writing/` — all lessons and notes
- `public/resume.pdf` — résumé linked from the hero and About section

## Adding writing

Every topic is a category in `content/writing/index.ts`: Java, DSA, Spring & Spring Boot,
System Design, MySQL, Operating Systems and Computer Networks. A category stays hidden until it
has its first lesson.

1. Create the lesson file in the category's folder, e.g. `content/writing/dsa/two-sum.ts`.
2. Export it from that folder's `index.ts` array. Its position there is its number.
3. For a new folder, point the category's `lessons` at that array in `content/writing/index.ts`.

Pages, numbering, previous/next links and the homepage preview update on their own.

### DSA problem template

Each approach is a section, so the page's contents sidebar reads
Problem → Brute Force → Better → Optimal.

```ts
import type { Lesson } from "../types";

export const twoSum: Lesson = {
  slug: "two-sum",
  title: "Two Sum",
  description: "Find two indices whose values add up to a target.",
  tags: ["Array", "Hashing"],
  difficulty: "Easy",
  problemUrl: "https://leetcode.com/problems/two-sum/",
  sections: [
    {
      number: "01",
      title: "Problem",
      paragraphs: ["Given an array nums and an integer target, ..."],
      examples: [{ title: "Example 1", explanation: "nums = [2,7,11,15], target = 9", output: "[0, 1]" }],
    },
    {
      number: "02",
      title: "Brute Force",
      paragraphs: ["Intuition: try every pair ..."],
      code: { language: "java", code: "..." },
      dryRun: ["i = 0, j = 1 → 2 + 7 = 9 ✓"],
      complexity: { time: "O(n²)", space: "O(1)" },
    },
    { number: "03", title: "Better", /* ... */ complexity: { time: "O(n log n)", space: "O(n)" } },
    { number: "04", title: "Optimal", /* ... */ complexity: { time: "O(n)", space: "O(n)" } },
  ],
};
```

Every other lesson uses the same `Lesson` shape without `difficulty` and `problemUrl`.
All section fields are listed in `content/writing/types.ts`.
