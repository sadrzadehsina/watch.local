import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <section className="rounded-lg border border-dashed p-8 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h2 className="text-base font-medium">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </section>
  );
}
