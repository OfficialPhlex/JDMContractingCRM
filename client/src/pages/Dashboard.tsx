import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Users,
  AlertCircle,
  Bell,
  TrendingUp,
  ArrowRight,
  Phone,
  Mail,
} from "lucide-react";
import type { Contact } from "@shared/schema";
import { PIPELINE_STAGE_LABELS, type PipelineStage, PIPELINE_STAGES } from "@shared/schema";
import { formatCurrency, formatDate, daysSince, getPipelineColor, getPipelineBarColor } from "@/lib/utils";

interface DashboardStats {
  totalContacts: number;
  totalRevenue: number;
  totalOutstanding: number;
  followUpsDue: number;
  pipelineCounts: Record<string, number>;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
    queryFn: () => apiRequest("/api/dashboard"),
  });

  const { data: followUps, isLoading: followUpsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts/follow-up"],
    queryFn: () => apiRequest("/api/contacts/follow-up"),
  });

  const statCards = [
    {
      label: "Total Contacts",
      value: stats?.totalContacts ?? 0,
      icon: Users,
      format: (v: number) => v.toString(),
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Revenue Collected",
      value: stats?.totalRevenue ?? 0,
      icon: DollarSign,
      format: formatCurrency,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Outstanding Balance",
      value: stats?.totalOutstanding ?? 0,
      icon: TrendingUp,
      format: formatCurrency,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Follow-ups Due",
      value: stats?.followUpsDue ?? 0,
      icon: Bell,
      format: (v: number) => v.toString(),
      color: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of JDM Contracting activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, format, color }) => (
          <Card key={label} data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-xl font-bold text-foreground">{format(value)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))
            ) : (
              PIPELINE_STAGES.filter(s => s !== "lost").map((stage) => {
                const count = stats?.pipelineCounts[stage] ?? 0;
                const total = stats?.totalContacts ?? 1;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={stage} className="flex items-center gap-3" data-testid={`pipeline-${stage}`}>
                    <span className="text-xs text-muted-foreground w-28 flex-shrink-0">
                      {PIPELINE_STAGE_LABELS[stage]}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getPipelineBarColor(stage)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-6 text-right">{count}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Follow-up reminders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                Follow-ups Due
              </CardTitle>
              <Link href="/contacts">
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {followUpsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : followUps && followUps.length > 0 ? (
              <div className="space-y-2">
                {followUps.slice(0, 5).map((contact) => (
                  <Link key={contact.id} href={`/contacts/${contact.id}`}>
                    <div
                      className="flex items-start justify-between p-3 rounded-md bg-destructive/5 border border-destructive/15 hover-elevate cursor-pointer"
                      data-testid={`followup-${contact.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.company || contact.phone || contact.email || "No details"}
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-2 text-right">
                        <Badge variant="destructive" className="text-xs">
                          {contact.followUpDate
                            ? daysSince(contact.followUpDate) === 0
                              ? "Today"
                              : `${daysSince(contact.followUpDate)}d overdue`
                            : "Due"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {PIPELINE_STAGE_LABELS[contact.pipelineStage as PipelineStage]}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell className="w-8 h-8 mb-2 text-muted-foreground/40" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs mt-0.5">No follow-ups are due right now.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
