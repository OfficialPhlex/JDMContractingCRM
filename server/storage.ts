import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, lte, gte } from "drizzle-orm";
import {
  contacts,
  interactions,
  payments,
  documents,
  type Contact,
  type InsertContact,
  type Interaction,
  type InsertInteraction,
  type Payment,
  type InsertPayment,
  type Document,
  type InsertDocument,
} from "@shared/schema";

const sqlite = new Database("crm.db");
const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    type TEXT NOT NULL DEFAULT 'prospect',
    pipeline_stage TEXT NOT NULL DEFAULT 'lead',
    job_description TEXT,
    total_contract_value REAL DEFAULT 0,
    total_paid REAL DEFAULT 0,
    follow_up_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_contacted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'note',
    notes TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    paid_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    data TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface IStorage {
  // Contacts
  getContacts(): Contact[];
  getContact(id: number): Contact | undefined;
  createContact(data: InsertContact): Contact;
  updateContact(id: number, data: Partial<InsertContact>): Contact | undefined;
  deleteContact(id: number): void;
  getContactsDueForFollowUp(today: string): Contact[];

  // Interactions
  getInteractionsByContact(contactId: number): Interaction[];
  createInteraction(data: InsertInteraction): Interaction;
  deleteInteraction(id: number): void;

  // Payments
  getPaymentsByContact(contactId: number): Payment[];
  createPayment(data: InsertPayment): Payment;
  deletePayment(id: number): void;

  // Documents
  getDocumentsByContact(contactId: number): Omit<Document, 'data'>[];
  getDocument(id: number): Document | undefined;
  createDocument(data: InsertDocument): Omit<Document, 'data'>;
  deleteDocument(id: number): void;

  // Dashboard stats
  getDashboardStats(): {
    totalContacts: number;
    totalRevenue: number;
    totalOutstanding: number;
    followUpsDue: number;
    pipelineCounts: Record<string, number>;
  };
}

export class Storage implements IStorage {
  // --- Contacts ---
  getContacts(): Contact[] {
    return db.select().from(contacts).orderBy(desc(contacts.createdAt)).all();
  }

  getContact(id: number): Contact | undefined {
    return db.select().from(contacts).where(eq(contacts.id, id)).get();
  }

  createContact(data: InsertContact): Contact {
    return db.insert(contacts).values({ ...data, createdAt: new Date().toISOString() }).returning().get();
  }

  updateContact(id: number, data: Partial<InsertContact>): Contact | undefined {
    return db.update(contacts).set(data).where(eq(contacts.id, id)).returning().get();
  }

  deleteContact(id: number): void {
    db.delete(interactions).where(eq(interactions.contactId, id)).run();
    db.delete(payments).where(eq(payments.contactId, id)).run();
    db.delete(documents).where(eq(documents.contactId, id)).run();
    db.delete(contacts).where(eq(contacts.id, id)).run();
  }

  getContactsDueForFollowUp(today: string): Contact[] {
    return db
      .select()
      .from(contacts)
      .where(lte(contacts.followUpDate, today))
      .all()
      .filter((c) => c.followUpDate !== null && c.followUpDate !== undefined);
  }

  // --- Interactions ---
  getInteractionsByContact(contactId: number): Interaction[] {
    return db
      .select()
      .from(interactions)
      .where(eq(interactions.contactId, contactId))
      .orderBy(desc(interactions.occurredAt))
      .all();
  }

  createInteraction(data: InsertInteraction): Interaction {
    const interaction = db
      .insert(interactions)
      .values({ ...data, createdAt: new Date().toISOString() })
      .returning()
      .get();
    // Update lastContactedAt on contact
    const contact = this.getContact(data.contactId);
    if (contact) {
      const current = contact.lastContactedAt;
      if (!current || data.occurredAt > current) {
        this.updateContact(data.contactId, { lastContactedAt: data.occurredAt });
      }
    }
    return interaction;
  }

  deleteInteraction(id: number): void {
    db.delete(interactions).where(eq(interactions.id, id)).run();
  }

  // --- Payments ---
  getPaymentsByContact(contactId: number): Payment[] {
    return db
      .select()
      .from(payments)
      .where(eq(payments.contactId, contactId))
      .orderBy(desc(payments.paidAt))
      .all();
  }

  createPayment(data: InsertPayment): Payment {
    const payment = db
      .insert(payments)
      .values({ ...data, createdAt: new Date().toISOString() })
      .returning()
      .get();
    // Recompute totalPaid on contact
    const allPayments = this.getPaymentsByContact(data.contactId);
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    this.updateContact(data.contactId, { totalPaid });
    return payment;
  }

  deletePayment(id: number): void {
    const payment = db.select().from(payments).where(eq(payments.id, id)).get();
    db.delete(payments).where(eq(payments.id, id)).run();
    if (payment) {
      const allPayments = this.getPaymentsByContact(payment.contactId);
      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
      this.updateContact(payment.contactId, { totalPaid });
    }
  }

  // --- Documents ---
  getDocumentsByContact(contactId: number): Omit<Document, 'data'>[] {
    // Return metadata only (no base64 data) for listing
    const rows = db
      .select()
      .from(documents)
      .where(eq(documents.contactId, contactId))
      .orderBy(desc(documents.createdAt))
      .all();
    return rows.map(({ data: _data, ...meta }) => meta);
  }

  getDocument(id: number): Document | undefined {
    return db.select().from(documents).where(eq(documents.id, id)).get();
  }

  createDocument(data: InsertDocument): Omit<Document, 'data'> {
    const doc = db
      .insert(documents)
      .values({ ...data, createdAt: new Date().toISOString() })
      .returning()
      .get();
    const { data: _data, ...meta } = doc;
    return meta;
  }

  deleteDocument(id: number): void {
    db.delete(documents).where(eq(documents.id, id)).run();
  }

  // --- Dashboard ---
  getDashboardStats() {
    const allContacts = this.getContacts();
    const today = new Date().toISOString().split("T")[0];
    const followUpsDue = allContacts.filter(
      (c) => c.followUpDate && c.followUpDate <= today
    ).length;
    const totalRevenue = allContacts.reduce((sum, c) => sum + (c.totalPaid ?? 0), 0);
    const totalOutstanding = allContacts.reduce(
      (sum, c) => sum + Math.max(0, (c.totalContractValue ?? 0) - (c.totalPaid ?? 0)),
      0
    );
    const pipelineCounts: Record<string, number> = {};
    for (const c of allContacts) {
      pipelineCounts[c.pipelineStage] = (pipelineCounts[c.pipelineStage] ?? 0) + 1;
    }
    return {
      totalContacts: allContacts.length,
      totalRevenue,
      totalOutstanding,
      followUpsDue,
      pipelineCounts,
    };
  }
}

export const storage = new Storage();
