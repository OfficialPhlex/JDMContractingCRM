import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  DollarSign,
  MessageSquare,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Paperclip,
  Download,
  FileText,
  Image,
  File,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Contact, Interaction, Payment, Document } from "@shared/schema";
import {
  PIPELINE_STAGE_LABELS,
  INTERACTION_TYPES,
  DOCUMENT_TYPE_LABELS,
  type PipelineStage,
  type InteractionType,
  type ContactType,
  type DocumentType,
} from "@shared/schema";
import {
  formatCurrency,
  formatDate,
  formatDateFull,
  getPipelineColor,
  getContactTypeColor,
  getInteractionIcon,
} from "@/lib/utils";
import { ContactFormDialog } from "@/components/ContactFormDialog";
import { InteractionFormDialog } from "@/components/InteractionFormDialog";
import { PaymentFormDialog } from "@/components/PaymentFormDialog";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  client: "Client",
  prospect: "Prospect",
  vendor: "Vendor",
  subcontractor: "Sub",
  other: "Other",
};

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const contactId = parseInt(id);

  const [showEdit, setShowEdit] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteInteractionId, setDeleteInteractionId] = useState<number | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);
  const [deleteDocumentId, setDeleteDocumentId] = useState<number | null>(null);

  const { data: contact, isLoading } = useQuery<Contact>({
    queryKey: ["/api/contacts", contactId],
    queryFn: () => apiRequest(`/api/contacts/${contactId}`),
  });

  const { data: interactions } = useQuery<Interaction[]>({
    queryKey: ["/api/contacts", contactId, "interactions"],
    queryFn: () => apiRequest(`/api/contacts/${contactId}/interactions`),
  });

  const { data: payments } = useQuery<Payment[]>({
    queryKey: ["/api/contacts", contactId, "payments"],
    queryFn: () => apiRequest(`/api/contacts/${contactId}/payments`),
  });

  const { data: documents } = useQuery<Omit<Document, 'data'>[]>({
    queryKey: ["/api/contacts", contactId, "documents"],
    queryFn: () => apiRequest(`/api/contacts/${contactId}/documents`),
  });

  const deleteInteraction = useMutation({
    mutationFn: (iid: number) => apiRequest(`/api/interactions/${iid}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "interactions"] });
      toast({ title: "Interaction deleted" });
      setDeleteInteractionId(null);
    },
  });

  const deletePayment = useMutation({
    mutationFn: (pid: number) => apiRequest(`/api/payments/${pid}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Payment deleted" });
      setDeletePaymentId(null);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: (did: number) => apiRequest(`/api/documents/${did}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "documents"] });
      toast({ title: "Document deleted" });
      setDeleteDocumentId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6 text-muted-foreground">Contact not found.</div>
    );
  }

  const balance = (contact.totalContractValue ?? 0) - (contact.totalPaid ?? 0);
  const isPaidInFull = balance <= 0 && (contact.totalPaid ?? 0) > 0;

  const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
    call: "Call",
    email: "Email",
    text: "Text",
    meeting: "Meeting",
    site_visit: "Site Visit",
    note: "Note",
  };

  function getDocIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (mimeType === "application/pdf") return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/contacts")}
          className="gap-2 text-muted-foreground"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Contacts
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEdit(true)}
            className="gap-2"
            data-testid="button-edit-contact"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Contact header card */}
      <Card>
        <CardContent className="pt-5 pb-4 px-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-primary">
                {contact.name.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-foreground" data-testid="text-contact-name">
                  {contact.name}
                </h1>
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

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {contact.company && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />{contact.company}
                  </span>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-sm text-muted-foreground flex items-center gap-1.5 hover:text-primary transition-colors"
                    data-testid="link-phone"
                  >
                    <Phone className="w-3.5 h-3.5" />{contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm text-muted-foreground flex items-center gap-1.5 hover:text-primary transition-colors"
                    data-testid="link-email"
                  >
                    <Mail className="w-3.5 h-3.5" />{contact.email}
                  </a>
                )}
                {contact.address && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />{contact.address}
                  </span>
                )}
              </div>

              {contact.jobDescription && (
                <p className="text-sm text-muted-foreground mt-2 italic">"{contact.jobDescription}"</p>
              )}
            </div>
          </div>

          {/* Key dates row */}
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-6">
            {contact.lastContactedAt && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Contact</p>
                <p className="text-sm font-medium mt-0.5">{formatDateFull(contact.lastContactedAt)}</p>
              </div>
            )}
            {contact.followUpDate && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Follow-up Date</p>
                <p className={`text-sm font-medium mt-0.5 ${
                  contact.followUpDate <= new Date().toISOString().split("T")[0]
                    ? "text-destructive"
                    : "text-foreground"
                }`}>
                  {formatDateFull(contact.followUpDate)}
                </p>
              </div>
            )}
            {contact.notes && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Notes</p>
                <p className="text-sm text-foreground mt-0.5 line-clamp-2">{contact.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial summary */}
      {(contact.totalContractValue ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Financials
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 h-7 text-xs"
                onClick={() => setShowPayment(true)}
                data-testid="button-add-payment"
              >
                <Plus className="w-3 h-3" />
                Record Payment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Contract Value</p>
                <p className="text-base font-bold mt-0.5" data-testid="text-contract-value">
                  {formatCurrency(contact.totalContractValue ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid</p>
                <p className="text-base font-bold text-green-600 dark:text-green-400 mt-0.5" data-testid="text-total-paid">
                  {formatCurrency(contact.totalPaid ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Balance Owed</p>
                <p className={`text-base font-bold mt-0.5 ${isPaidInFull ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`} data-testid="text-balance">
                  {isPaidInFull ? "Paid in Full" : formatCurrency(balance)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Payment progress</span>
                <span>
                  {(contact.totalContractValue ?? 0) > 0
                    ? Math.min(100, Math.round(((contact.totalPaid ?? 0) / (contact.totalContractValue ?? 1)) * 100))
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
                  style={{
                    width: `${(contact.totalContractValue ?? 0) > 0
                      ? Math.min(100, ((contact.totalPaid ?? 0) / (contact.totalContractValue ?? 1)) * 100)
                      : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Payment history */}
            {payments && payments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment History</p>
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    data-testid={`payment-${payment.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        +{formatCurrency(payment.amount)}
                      </p>
                      {payment.description && (
                        <p className="text-xs text-muted-foreground">{payment.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-muted-foreground">{formatDateFull(payment.paidAt)}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletePaymentId(payment.id)}
                        data-testid={`button-delete-payment-${payment.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add payment if no contract value set yet */}
      {(contact.totalContractValue ?? 0) === 0 && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowPayment(true)}
            data-testid="button-add-payment-empty"
          >
            <DollarSign className="w-4 h-4" />
            Record Payment
          </Button>
        </div>
      )}

      {/* Interaction log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Activity Log
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 h-7 text-xs"
              onClick={() => setShowInteraction(true)}
              data-testid="button-add-interaction"
            >
              <Plus className="w-3 h-3" />
              Log Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!interactions || interactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mb-2 text-muted-foreground/40" />
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-xs mt-0.5">Log your first interaction with this contact.</p>
              <Button
                className="mt-4 gap-2"
                size="sm"
                variant="outline"
                onClick={() => setShowInteraction(true)}
                data-testid="button-log-first-interaction"
              >
                <Plus className="w-3 h-3" />
                Log Activity
              </Button>
            </div>
          ) : (
            <div className="space-y-0">
              {interactions.map((interaction, idx) => (
                <div
                  key={interaction.id}
                  className="flex gap-3 pb-4"
                  data-testid={`interaction-${interaction.id}`}
                >
                  {/* Timeline line */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs flex-shrink-0">
                      {getInteractionIcon(interaction.type as InteractionType)}
                    </div>
                    {idx < interactions.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1 min-h-4" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {INTERACTION_TYPE_LABELS[interaction.type as InteractionType]}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDateFull(interaction.occurredAt)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteInteractionId(interaction.id)}
                          data-testid={`button-delete-interaction-${interaction.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-foreground mt-0.5">{interaction.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-primary" />
              Documents
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 h-7 text-xs"
              onClick={() => setShowUpload(true)}
              data-testid="button-upload-document"
            >
              <Plus className="w-3 h-3" />
              Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Paperclip className="w-8 h-8 mb-2 text-muted-foreground/40" />
              <p className="text-sm font-medium">No documents yet</p>
              <p className="text-xs mt-0.5">Upload quotes, receipts, contracts, and more.</p>
              <Button
                className="mt-4 gap-2"
                size="sm"
                variant="outline"
                onClick={() => setShowUpload(true)}
                data-testid="button-upload-first-document"
              >
                <Plus className="w-3 h-3" />
                Upload Document
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                  data-testid={`document-${doc.id}`}
                >
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {getDocIcon(doc.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.filename}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                        {DOCUMENT_TYPE_LABELS[doc.type as DocumentType]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatBytes(doc.sizeBytes)}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
                    </div>
                    {doc.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => window.open(`/api/documents/${doc.id}/download`, "_blank")}
                      title="Download"
                      data-testid={`button-download-document-${doc.id}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteDocumentId(doc.id)}
                      title="Delete"
                      data-testid={`button-delete-document-${doc.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ContactFormDialog
        open={showEdit}
        onClose={() => setShowEdit(false)}
        contact={contact}
      />

      <InteractionFormDialog
        open={showInteraction}
        onClose={() => setShowInteraction(false)}
        contactId={contactId}
      />

      <PaymentFormDialog
        open={showPayment}
        onClose={() => setShowPayment(false)}
        contactId={contactId}
        currentContractValue={contact.totalContractValue ?? 0}
      />

      <DocumentUploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        contactId={contactId}
      />

      {/* Delete document confirm */}
      <AlertDialog open={deleteDocumentId !== null} onOpenChange={() => setDeleteDocumentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDocumentId && deleteDocument.mutate(deleteDocumentId)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete interaction confirm */}
      <AlertDialog open={deleteInteractionId !== null} onOpenChange={() => setDeleteInteractionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteInteractionId && deleteInteraction.mutate(deleteInteractionId)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete payment confirm */}
      <AlertDialog open={deletePaymentId !== null} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the payment and recalculate the balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePaymentId && deletePayment.mutate(deletePaymentId)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
