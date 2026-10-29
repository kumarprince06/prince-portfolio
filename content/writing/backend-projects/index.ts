import type { Phase } from "../types";
import { digitalWalletLedger } from "./digital-wallet-ledger";
import { eventSeatBooking } from "./event-seat-booking";
import { expenseTrackerApi } from "./expense-tracker-api";
import { foodDeliveryMicroservices } from "./food-delivery-microservices";
import { libraryManagementAuth } from "./library-management-auth";
import { notificationPlatform } from "./notification-platform";
import { orderPaymentService } from "./order-payment-service";
import { realtimeChat } from "./realtime-chat";
import { rideHailingBackend } from "./ride-hailing-backend";
import { urlShortener } from "./url-shortener";

// Build order, easy to complex. Start Project 1 after Spring Boot.
export const backendProjectPhases: Phase[] = [
  {
    title: "Foundations",
    description: "A clean REST API, caching and rate limiting, then authentication and authorisation.",
    lessons: [expenseTrackerApi, urlShortener, libraryManagementAuth],
  },
  {
    title: "Correctness and Money",
    description: "No double booking, orders and payments with webhooks, and a ledger where money never goes missing.",
    lessons: [eventSeatBooking, orderPaymentService, digitalWalletLedger],
  },
  {
    title: "Real-Time and Messaging",
    description: "WebSockets across several instances, then a notification platform on Kafka and RabbitMQ.",
    lessons: [realtimeChat, notificationPlatform],
  },
  {
    title: "Capstone",
    description: "A full ride-hailing backend, then a food delivery platform as microservices.",
    lessons: [rideHailingBackend, foodDeliveryMicroservices],
  },
];
