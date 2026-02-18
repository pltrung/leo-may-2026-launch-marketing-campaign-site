import { notFound } from "next/navigation";
import { LocaleProvider } from "@/components/LocaleProvider";
import AuthSessionHandler from "@/components/AuthSessionHandler";
import { isValidLocale } from "@/lib/i18n";

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  return (
    <LocaleProvider locale={locale}>
      <AuthSessionHandler>
        {children}
      </AuthSessionHandler>
    </LocaleProvider>
  );
}
