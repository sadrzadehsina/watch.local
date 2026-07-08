"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center pb-20 lg:pb-0">
      <Card className="max-w-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-semibold">Something went sideways</h1>
              <p className="text-sm text-muted-foreground">
                {error.message || "The local app could not render this view."}
              </p>
            </div>
          </div>
          <Button onClick={reset} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      </Card>
    </div>
  );
}
