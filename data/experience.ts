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
      "Built the foundation in computer science, programming, data structures, databases and software engineering, graduating with a GPA of 9.17/10.",
    tags: ["CSE", "Java", "DSA", "DBMS"],
  },

  {
    year: "Jan — Sep 2023",
    role: "Software Engineer Intern",
    company: "ARC Document Solutions",
    description:
      "Built OCR extraction services in C++ and Scala with Tesseract and OpenCV, improving search accuracy and consolidating three overlapping services into one.",
    tags: [
      "C++",
      "Scala",
      "Tesseract",
      "OpenCV",
      "Microservices",
    ],
  },

  {
    year: "Oct 2024 — Present",
    role: "Associate Developer",
    company: "Innofied Solution",
    description:
      "Joined as an Associate Engineer Trainee and was promoted in May 2025. I work on the backend of two multi-tenant SaaS products. On AllRide, a ride-hailing and logistics platform, I built the auto-scheduling engine that replaced three separate dispatch implementations, plus seat management, WebSocket driver offers and driver and customer wallets. On SecureIT I am the lead backend contributor, rebuilding the Microsoft Graph sync to run within rate limits and integrating an OpenAI-powered security assistant.",
    tags: [
      "PHP",
      "Laravel",
      "MySQL",
      "Redis",
      "Elasticsearch",
      "WebSockets",
      "AWS",
      "Azure",
    ],
  },

  {
    year: "Now",
    role: "Deepening Backend Engineering",
    company: "Java · Spring Boot · Distributed Systems",
    description:
      "Building RideX and Smart Dispatch in Java 21 and Spring Boot while going deeper into system design, databases, distributed systems and the architecture behind production-grade backends.",
    tags: [
      "Java",
      "Spring Boot",
      "Kafka",
      "Redis",
      "System Design",
    ],
  },
];