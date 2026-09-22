export interface Project {
  number: string;
  title: string;
  category: string;
  description: string;
  stack: string[];
  featured: boolean;
  slug: string;
}

export const projects: Project[] = [
  {
    number: "01",
    title: "Smart Dispatch",
    category: "Logistics · SaaS",
    description:
      "A delivery management platform designed around dispatch operations, drivers, customers, payments, and real-time logistics workflows.",
    stack: [
      "Java",
      "Spring Boot",
      "PostgreSQL",
      "React Native",
    ],
    featured: true,
    slug: "smart-dispatch",
  },

  {
    number: "02",
    title: "QuickCommerce",
    category: "Commerce · SaaS",
    description:
      "A multi-role commerce platform with manufacturers, retailers, customers, product management, commissions, inventory, and approval workflows.",
    stack: [
      "React",
      "TypeScript",
      "Redux",
      "PostgreSQL",
    ],
    featured: false,
    slug: "quickcommerce",
  },

  {
    number: "03",
    title: "Smart Contact Manager",
    category: "Backend · Web Application",
    description:
      "A contact management application built around authentication, authorization, OTP verification, and secure backend workflows.",
    stack: [
      "Java",
      "Spring Boot",
      "MySQL",
      "Thymeleaf",
    ],
    featured: false,
    slug: "smart-contact-manager",
  },
];