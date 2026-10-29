import type { Phase } from "../types";
import { hldPhases, lldPhases } from "../roadmap";
import { architectureStyles } from "./architecture-styles";
import { designPrinciples } from "./design-principles";
import { idempotencyAndWebhooks } from "./idempotency-and-webhooks";
import { multiTenancy } from "./multi-tenancy";
import { reliableOutboundCalls } from "./reliable-outbound-calls";
import { stateMachines } from "./state-machines";
import { transactionsAndLocking } from "./transactions-and-locking";

// Reading order — the fundamentals first, then LLD, then HLD (both coming soon).
export const systemDesignPhases: Phase[] = [
  {
    title: "Backend Design Fundamentals",
    description: "The ideas every real backend leans on: design principles, architecture styles, multi-tenancy, transactions, idempotency, state machines and reliable outbound calls.",
    lessons: [
      designPrinciples,
      architectureStyles,
      multiTenancy,
      transactionsAndLocking,
      idempotencyAndWebhooks,
      stateMachines,
      reliableOutboundCalls,
    ],
  },
  ...lldPhases,
  ...hldPhases,
];
