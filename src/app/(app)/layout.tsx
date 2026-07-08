import { AppShell } from "@/components/layout/app-shell";

export default function AuthenticatedShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
