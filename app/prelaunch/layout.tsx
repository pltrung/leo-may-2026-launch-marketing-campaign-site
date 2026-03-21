import { LocaleProvider } from "@/components/LocaleProvider";
import AuthSessionHandler from "@/components/AuthSessionHandler";
import AuthHashRedirect from "@/components/AuthHashRedirect";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";
import { TransitionOverlayProvider } from "@/context/TransitionOverlayContext";

/** English prelaunch at `/prelaunch` (no locale prefix). */
export default function PrelaunchLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider locale="en">
      <TransitionOverlayProvider>
        <AuthSessionHandler>
          <AuthHashRedirect />
          <ClientErrorBoundary>{children}</ClientErrorBoundary>
        </AuthSessionHandler>
      </TransitionOverlayProvider>
    </LocaleProvider>
  );
}
