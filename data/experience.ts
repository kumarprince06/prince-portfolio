export interface JourneyItem {
  year: string;
  role: string;
  company: string;
  description: string;
  tags: string[];
}

export const journey: JourneyItem[] = [
  {
    year: "2019 — 2023",
    role: "B.Tech · Computer Science & Engineering",
    company:
      "Dr Sudhir Chandra Sur Institute of Technology & Sports Complex",
    description:
      "Built the foundation in computer science, programming, data structures, databases and software engineering while completing a B.Tech in Computer Science & Engineering.",
    tags: ["CSE", "Java", "DSA", "DBMS"],
  },

  {
    year: "2023",
    role: "Software Engineer Intern",
    company: "ARC Document Solutions",
    description:
      "Worked on OCR and document-processing microservices involving image processing, text extraction and backend service optimization.",
    tags: [
      "C++",
      "Scala",
      "Tesseract",
      "OpenCV",
      "Microservices",
    ],
  },

  {
    year: "2024 — Present",
    role: "Associate Developer",
    company: "Innofied Solution",
    description:
      "Working across backend, frontend and application development while building SaaS features, APIs, business workflows, automation and product functionality.",
    tags: [
      "Laravel",
      "React",
      "React Native",
      "SQL",
    ],
  },

  {
    year: "Now",
    role: "Deepening Backend Engineering",
    company: "Java · Spring Boot · Distributed Systems",
    description:
      "Focused on strengthening Java backend engineering, Spring Boot, system design, databases, distributed systems and the architecture required to build production-grade applications.",
    tags: [
      "Java",
      "Spring Boot",
      "Kafka",
      "Redis",
      "System Design",
    ],
  },
];