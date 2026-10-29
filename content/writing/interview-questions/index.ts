import type { Phase } from "../types";
import { collectionsQuestions } from "./collections-questions";
import { companyQuestionsProduct } from "./company-questions-product";
import { companyQuestionsServices } from "./company-questions-services";
import { concurrencyQuestions } from "./concurrency-questions";
import { coreJavaQuestions } from "./core-java-questions";
import { java8Questions } from "./java-8-questions";
import { jpaHibernateQuestions } from "./jpa-hibernate-questions";
import { jvmQuestions } from "./jvm-questions";
import { microservicesMessagingQuestions } from "./microservices-messaging-questions";
import { restApiSecurityQuestions } from "./rest-api-security-questions";
import { scenarioBehavioralQuestions } from "./scenario-behavioral-questions";
import { springBootQuestions } from "./spring-boot-questions";
import { sqlDatabaseQuestions } from "./sql-database-questions";

// Same order as the learning path, so each set can be revised right after its track.
export const interviewPhases: Phase[] = [
  {
    title: "Java",
    description: "Core Java, Collections, Java 8, concurrency and the JVM.",
    lessons: [coreJavaQuestions, collectionsQuestions, java8Questions, concurrencyQuestions, jvmQuestions],
  },
  {
    title: "Databases and Spring",
    description: "SQL and databases, Spring and Spring Boot, Spring Data JPA and Hibernate.",
    lessons: [sqlDatabaseQuestions, springBootQuestions, jpaHibernateQuestions],
  },
  {
    title: "APIs and Distributed Systems",
    description: "REST design and security, then microservices, Redis and Kafka.",
    lessons: [restApiSecurityQuestions, microservicesMessagingQuestions],
  },
  {
    title: "Company-Wise Questions",
    description: "Questions candidates have publicly reported at specific companies, with sources, to prioritise what to revise.",
    lessons: [companyQuestionsServices, companyQuestionsProduct],
  },
  {
    title: "Interview Rounds",
    description: "Production scenarios, behavioral answers and the hiring-manager round.",
    lessons: [scenarioBehavioralQuestions],
  },
];
