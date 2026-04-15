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
import { insertInteractionSchema, INTERACTION_TYPES } from "@shared/schema";
import { z } from "zod";
import { todayISO } from "@/lib/utils";

const formSchema = insertInteractionSchema.omit({ contactId: true }).extend({
  occurredAt: z.string().min(1, "Date is required"),
  notes: z.string().min(1, "Notes are required"),
});

type FormData = z.infer<typeof formSchema>;

const INTERACTION_TYPE_LABELS = {
  call: "📞 Phone Call",
  email: "✉️ Email",
  text: "💬 Text Message",
  meeting: "🤝 Meeting",
  site_visit: "🏗️ Site Visit",
  note: "📝 Note",
};

interface Props {
  open: boolean;
  onClose: () => void;
  contactId: number;
}

export function InteractionFormDialog({ open, onClose, contactId }: Props) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "call",
      notes: "",
      occurredAt: todayISO(),
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest(`/api/contacts/${contactId}/interactions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Activity logged" });
      onClose();
      form.reset({ type: "call", notes: "", occurredAt: todayISO() });
    },
    onError: () => toast({ title: "Failed to log activity", variant: "destructive" }),
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-interaction-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INTERACTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {INTERACTION_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occurredAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        data-testid="input-interaction-date"
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
                  <FormLabel>Notes *</FormLabel>
                  <FormControl>
                    <Textarea
                      data-testid="textarea-interaction-notes"
                      placeholder="What was discussed? Any follow-ups needed?"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-interaction">
                {mutation.isPending ? "Saving..." : "Log Activity"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
