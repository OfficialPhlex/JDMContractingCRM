import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  Phone,
  Mail,
  Trash2,
  ChevronRight,
  Users,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Contact } from "@shared/schema";
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  CONTACT_TYPES,
  type PipelineStage,
  type ContactType,
} from "@shared/schema";
import { formatCurrency, formatDate, getPipelineColor, getContactTypeColor } from "@/lib/utils";
import { ContactFormDialog } from "@/components/ContactFormDialog";

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  client: "Client",
  prospect: "Prospect",
  vendor: "Vendor",
  subcontractor: "Sub",
  other: "Other",
};

export default function Contacts() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: () => apiRequest("/api/contacts"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Contact deleted" });
      setDeleteId(null);
    },
  });

  const filtered = (contacts ?? []).filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === "all" || c.pipelineStage === stageFilter;
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesStage && matchesType;
  });

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {contacts?.length ?? 0} total contacts
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="button-add-contact" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-44" data-testid="select-stage-filter">
            <SelectValue placeholder="Pipeline stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{PIPELINE_STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36" data-testid="select-type-filter">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CONTACT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contact list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="w-10 h-10 mb-3 text-muted-foreground/40" />
          <p className="text-sm font-semibold">
            {contacts?.length === 0 ? "No contacts yet" : "No contacts match your search"}
          </p>
          <p className="text-xs mt-1">
            {contacts?.length === 0
              ? "Add your first contact to get started."
              : "Try adjusting your filters."}
          </p>
          {contacts?.length === 0 && (
            <Button
              className="mt-4 gap-2"
              onClick={() => setShowForm(true)}
              data-testid="button-add-first-contact"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((contact) => {
            const balance = (contact.totalContractValue ?? 0) - (contact.totalPaid ?? 0);
            return (
              <Card
                key={contact.id}
                className="hover-elevate cursor-pointer"
                data-testid={`card-contact-${contact.id}`}
              >
                <CardContent className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/contacts/${contact.id}`}>
                          <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
                            {contact.name}
                          </span>
                        </Link>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getContactTypeColor(contact.type as ContactType)}`}
                        >
                          {CONTACT_TYPE_LABELS[contact.type as ContactType]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPipelineColor(contact.pipelineStage)}`}
                        >
                          {PIPELINE_STAGE_LABELS[contact.pipelineStage as PipelineStage]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {contact.company && (
                          <span className="text-xs text-muted-foreground">{contact.company}</span>
                        )}
                        {contact.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />{contact.phone}
                          </span>
                        )}
                        {contact.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />{contact.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Financial info */}
                    <div className="flex-shrink-0 text-right hidden sm:block">
                      {(contact.totalContractValue ?? 0) > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground">Contract</p>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(contact.totalContractValue ?? 0)}
                          </p>
                          {balance > 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              {formatCurrency(balance)} owed
                            </p>
                          )}
                          {balance <= 0 && (contact.totalPaid ?? 0) > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Paid in full</p>
                          )}
                        </>
                      )}
                      {contact.lastContactedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last: {formatDate(contact.lastContactedAt)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Link href={`/contacts/${contact.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-view-${contact.id}`}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(contact.id)}
                        data-testid={`button-delete-${contact.id}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Contact Dialog */}
      <ContactFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the contact along with all their interactions and
              payment records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
