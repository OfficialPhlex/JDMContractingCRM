import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { InteractionType, PipelineStage, ContactType } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}yr ago`;
}

export function formatDateFull(dateStr: string): string {
  // Handle YYYY-MM-DD date-only strings without timezone conversion
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysSince(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function getPipelineColor(stage: string): string {
  const map: Record<string, string> = {
    lead: "text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600",
    estimate_sent: "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600",
    follow_up: "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600",
    contract_signed: "text-violet-600 dark:text-violet-400 border-violet-300 dark:border-violet-600",
    in_progress: "text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-600",
    completed: "text-green-600 dark:text-green-400 border-green-300 dark:border-green-600",
    lost: "text-red-600 dark:text-red-400 border-red-300 dark:border-red-600",
  };
  return map[stage] ?? "text-slate-600 border-slate-300";
}

export function getPipelineBarColor(stage: string): string {
  const map: Record<string, string> = {
    lead: "bg-slate-400",
    estimate_sent: "bg-blue-500",
    follow_up: "bg-amber-500",
    contract_signed: "bg-violet-500",
    in_progress: "bg-orange-500",
    completed: "bg-green-500",
    lost: "bg-red-500",
  };
  return map[stage] ?? "bg-slate-400";
}

export function getContactTypeColor(type: ContactType): string {
  const map: Record<ContactType, string> = {
    client: "text-green-700 dark:text-green-400 border-green-300 dark:border-green-700",
    prospect: "text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700",
    vendor: "text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700",
    subcontractor: "text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700",
    other: "text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600",
  };
  return map[type] ?? "";
}

export function getInteractionIcon(type: InteractionType): string {
  const map: Record<InteractionType, string> = {
    call: "📞",
    email: "✉️",
    text: "💬",
    meeting: "🤝",
    site_visit: "🏗️",
    note: "📝",
  };
  return map[type] ?? "📝";
}
