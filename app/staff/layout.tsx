import { RouteSetterAuthProvider } from "@/components/route-setter/RouteSetterAuthContext";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteSetterAuthProvider>{children}</RouteSetterAuthProvider>;
}
