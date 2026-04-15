import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertContactSchema, PIPELINE_STAGES, PIPELINE_STAGE_LABELS, CONTACT_TYPES, type Contact } from "@shared/schema";
import { z } from "zod";

const formSchema = insertContactSchema.extend({
  totalContractValue: z.coerce.number().min(0).optional(),
  totalPaid: z.coerce.number().min(0).optional(),
});

type FormData = z.infer<typeof formSchema>;

const CONTACT_TYPE_LABELS = {
  client: "Client",
  prospect: "Prospect",
  vendor: "Vendor",
  subcontractor: "Subcontractor",
  other: "Other",
};

interface Props {
  open: boolean;
  onClose: () => void;
  contact?: Contact;
}

export function ContactFormDialog({ open, onClose, contact }: Props) {
  const { toast } = useToast();
  const isEditing = !!contact;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      email: "",
      address: "",
      type: "prospect",
      pipelineStage: "lead",
      jobDescription: "",
      totalContractValue: 0,
      totalPaid: 0,
      followUpDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name,
        company: contact.company ?? "",
        phone: contact.phone ?? "",
        email: contact.email ?? "",
        address: contact.address ?? "",
        type: contact.type as any,
        pipelineStage: contact.pipelineStage as any,
        jobDescription: contact.jobDescription ?? "",
        totalContractValue: contact.totalContractValue ?? 0,
        totalPaid: contact.totalPaid ?? 0,
        followUpDate: contact.followUpDate ?? "",
        notes: contact.notes ?? "",
      });
    } else {
      form.reset({
        name: "",
        company: "",
        phone: "",
        email: "",
        address: "",
        type: "prospect",
        pipelineStage: "lead",
        jobDescription: "",
        totalContractValue: 0,
        totalPaid: 0,
        followUpDate: "",
        notes: "",
      });
    }
  }, [contact, open]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("/api/contacts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Contact created" });
      onClose();
      form.reset();
    },
    onError: () => toast({ title: "Failed to save contact", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest(`/api/contacts/${contact!.id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact!.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/follow-up"] });
      toast({ title: "Contact updated" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update contact", variant: "destructive" }),
  });

  const onSubmit = (data: FormData) => {
    // Clean empty strings to null-like for backend
    const cleaned = {
      ...data,
      company: data.company || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      jobDescription: data.jobDescription || undefined,
      followUpDate: data.followUpDate || undefined,
      notes: data.notes || undefined,
    };
    if (isEditing) {
      updateMutation.mutate(cleaned as FormData);
    } else {
      createMutation.mutate(cleaned as FormData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input data-testid="input-contact-name" placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-contact-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTACT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pipelineStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline Stage</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-pipeline-stage">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PIPELINE_STAGES.map((s) => (
                          <SelectItem key={s} value={s}>{PIPELINE_STAGE_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Smith Construction LLC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input data-testid="input-phone" type="tel" placeholder="(432) 555-0100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, Big Spring, TX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="jobDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Roof repair, foundation, framing..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="totalContractValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-contract-value"
                        type="number"
                        min="0"
                        step="100"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="followUpDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up Date</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-followup-date"
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-contact"
              >
                {isPending ? "Saving..." : isEditing ? "Save Changes" : "Add Contact"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
