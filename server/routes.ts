import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertInteractionSchema, insertPaymentSchema } from "@shared/schema";
import { z } from "zod";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const uploadDocumentSchema = z.object({
  type: z.string().default("other"),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  data: z.string().min(1), // base64
  notes: z.string().optional(),
});

export function registerRoutes(httpServer: Server, app: Express) {
  // --- Dashboard ---
  app.get("/api/dashboard", (_req, res) => {
    try {
      res.json(storage.getDashboardStats());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Contacts ---
  app.get("/api/contacts", (_req, res) => {
    try {
      res.json(storage.getContacts());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/contacts/follow-up", (_req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      res.json(storage.getContactsDueForFollowUp(today));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/contacts/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contact = storage.getContact(id);
      if (!contact) return res.status(404).json({ error: "Contact not found" });
      res.json(contact);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/contacts", (req, res) => {
    try {
      const data = insertContactSchema.parse(req.body);
      const contact = storage.createContact(data);
      res.status(201).json(contact);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/contacts/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertContactSchema.partial().parse(req.body);
      const contact = storage.updateContact(id, data);
      if (!contact) return res.status(404).json({ error: "Contact not found" });
      res.json(contact);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/contacts/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      storage.deleteContact(id);
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Interactions ---
  app.get("/api/contacts/:id/interactions", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      res.json(storage.getInteractionsByContact(id));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/contacts/:id/interactions", (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const data = insertInteractionSchema.parse({ ...req.body, contactId });
      const interaction = storage.createInteraction(data);
      res.status(201).json(interaction);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/interactions/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      storage.deleteInteraction(id);
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Payments ---
  app.get("/api/contacts/:id/payments", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      res.json(storage.getPaymentsByContact(id));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/contacts/:id/payments", (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const data = insertPaymentSchema.parse({ ...req.body, contactId });
      const payment = storage.createPayment(data);
      res.status(201).json(payment);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/payments/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      storage.deletePayment(id);
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Documents ---
  app.get("/api/contacts/:id/documents", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      res.json(storage.getDocumentsByContact(id));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/contacts/:id/documents", (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const body = uploadDocumentSchema.parse(req.body);

      if (!ALLOWED_MIME_TYPES.includes(body.mimeType)) {
        return res.status(400).json({ error: "File type not allowed" });
      }
      if (body.sizeBytes > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({ error: "File too large (max 10 MB)" });
      }

      const doc = storage.createDocument({ ...body, contactId });
      res.status(201).json(doc);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  // Download a document — streams base64 back as the actual file
  app.get("/api/documents/:id/download", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const doc = storage.getDocument(id);
      if (!doc) return res.status(404).json({ error: "Document not found" });

      const buffer = Buffer.from(doc.data, "base64");
      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${doc.filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/documents/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      storage.deleteDocument(id);
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
