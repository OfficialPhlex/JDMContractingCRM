import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertInteractionSchema, insertPaymentSchema } from "@shared/schema";
import { z } from "zod";

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
}
