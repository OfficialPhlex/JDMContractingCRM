import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Pipeline stages for a contracting business
export const PIPELINE_STAGES = [
  "lead",
  "estimate_sent",
  "follow_up",
  "contract_signed",
  "in_progress",
  "completed",
  "lost",
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  lead: "Lead",
  estimate_sent: "Estimate Sent",
  follow_up: "Follow Up",
  contract_signed: "Contract Signed",
  in_progress: "In Progress",
  completed: "Completed",
  lost: "Lost",
};

export const CONTACT_TYPES = ["client", "prospect", "vendor", "subcontractor", "other"] as const;
export type ContactType = typeof CONTACT_TYPES[number];

export const INTERACTION_TYPES = ["call", "email", "text", "meeting", "site_visit", "note"] as const;
export type InteractionType = typeof INTERACTION_TYPES[number];

// Contacts table
export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  type: text("type").notNull().default("prospect"),
  pipelineStage: text("pipeline_stage").notNull().default("lead"),
  jobDescription: text("job_description"),
  totalContractValue: real("total_contract_value").default(0),
  totalPaid: real("total_paid").default(0),
  followUpDate: text("follow_up_date"), // ISO date string YYYY-MM-DD
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  lastContactedAt: text("last_contacted_at"),
});

// Interactions / activity log
export const interactions = sqliteTable("interactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contactId: integer("contact_id").notNull(),
  type: text("type").notNull().default("note"),
  notes: text("notes").notNull(),
  occurredAt: text("occurred_at").notNull(), // ISO date string
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// Payments table
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contactId: integer("contact_id").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  paidAt: text("paid_at").notNull(), // ISO date string
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// --- Insert schemas ---
export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true,
});
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof interactions.$inferSelect;

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Document types
export const DOCUMENT_TYPES = ["quote", "receipt", "contract", "invoice", "photo", "other"] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  quote: "Quote",
  receipt: "Receipt",
  contract: "Contract",
  invoice: "Invoice",
  photo: "Photo",
  other: "Other",
};

// Documents table — files stored as base64 blobs in SQLite
export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contactId: integer("contact_id").notNull(),
  type: text("type").notNull().default("other"),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  data: text("data").notNull(), // base64-encoded file contents
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
