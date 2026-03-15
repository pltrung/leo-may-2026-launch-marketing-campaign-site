import { RouteSetterAuthProvider } from "@/components/route-setter/RouteSetterAuthContext";

export default function RouteSetterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteSetterAuthProvider>{children}</RouteSetterAuthProvider>;
}
