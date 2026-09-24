export interface Project {
  number: string;
  title: string;
  category: string;
  description: string;
  stack: string[];
  featured: boolean;
  slug: string;
  github: string;
  live?: string;
}

export const projects: Project[] = [
  {
    number: "01",
    title: "RideX",
    category: "Mobility · Ride-hailing",
    description:
      "A consumer ride-hailing platform — riders book, drivers accept and complete trips, and operations run the marketplace from one console. A modular monolith with 137 endpoints, 190 tests and ArchUnit-enforced module boundaries, covering the ride lifecycle, shuttle seat booking, Razorpay payments with idempotent webhooks and driver payouts.",
    stack: [
      "Java 21",
      "Spring Boot",
      "PostgreSQL",
      "Redis",
      "Flyway",
      "React Native",
    ],
    featured: true,
    slug: "ridex",
    github: "https://github.com/kumarprince06/ridex-platform",
  },

  {
    number: "02",
    title: "Smart Dispatch",
    category: "Logistics · Delivery",
    description:
      "A delivery dispatch platform with order management, driver assignment, live tracking, geofences, payments and webhooks. Events flow through Kafka with a transactional outbox and a dead-letter queue, backed by separate driver and customer apps and an admin console.",
    stack: [
      "Java 21",
      "Spring Boot",
      "Kafka",
      "PostgreSQL",
      "Redis",
      "WebSockets",
    ],
    featured: false,
    slug: "smart-dispatch",
    github: "https://github.com/kumarprince06/smart-dispatch-backend",
    live: "https://smart-dispatch-admin-frontend.vercel.app",
  },

  {
    number: "03",
    title: "SmartCommerce AI",
    category: "Commerce · Multi-vendor",
    description:
      "A multi-vendor e-commerce platform with customer, vendor and admin portals, vendor approval workflows, commission rules, multi-dimensional product variants and rule-driven pricing recommendations.",
    stack: ["Java", "Spring Boot", "MySQL", "Redis", "React", "TypeScript"],
    featured: false,
    slug: "smartcommerce-ai",
    github: "https://github.com/kumarprince06/SmartCommerce-AI",
  },

  {
    number: "04",
    title: "FreshLink",
    category: "Commerce · Supply Operations",
    description:
      "A fresh-produce storefront and operations console — cart, checkout and order tracking for customers; inventory, suppliers, delivery and analytics for admins. A modular monolith API with JWT security and OpenAPI docs.",
    stack: ["Java", "Spring Boot", "Spring Security", "MySQL", "React"],
    featured: false,
    slug: "freshlink",
    github: "https://github.com/kumarprince06/freshlink",
  },
];
