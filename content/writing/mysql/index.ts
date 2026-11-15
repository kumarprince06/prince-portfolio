import type { Phase } from "../types";
import { mysqlCrudQueries } from "./mysql-crud-queries";
import { mysqlGroupByAndAggregates } from "./mysql-group-by-and-aggregates";
import { mysqlJoins } from "./mysql-joins";
import { mysqlSetupTablesAndDataTypes } from "./mysql-setup-tables-and-data-types";

export const mysqlPhases: Phase[] = [
  {
    title: "SQL Basics",
    description: "SELECT, WHERE, ORDER BY, INSERT, UPDATE, DELETE and data types.",
    lessons: [mysqlSetupTablesAndDataTypes, mysqlCrudQueries],
  },
  {
    title: "Joins and Aggregation",
    description: "Inner and outer joins, GROUP BY, HAVING and common mistakes.",
    lessons: [mysqlJoins, mysqlGroupByAndAggregates],
  },
  {
    title: "Subqueries, CTEs and Window Functions",
    description: "Correlated subqueries, WITH, ROW_NUMBER, RANK, LAG and running totals.",
    lessons: [],
  },
  {
    title: "Indexes",
    description: "B-tree indexes, the clustered primary key in InnoDB, composite indexes and the leftmost prefix rule.",
    lessons: [],
  },
  {
    title: "Transactions and Isolation Levels",
    description: "ACID, REPEATABLE READ by default, anomalies and MVCC with undo logs.",
    lessons: [],
  },
  {
    title: "Locking in InnoDB",
    description: "Row locks, gap and next-key locks, deadlocks and how to read them.",
    lessons: [],
  },
  {
    title: "Query Optimisation",
    description: "EXPLAIN, the slow query log and rewriting slow queries.",
    lessons: [],
  },
  {
    title: "Replication, Backups and Scaling",
    description: "Binlog replication, read replicas, backups and partitioning.",
    lessons: [],
  },
];
