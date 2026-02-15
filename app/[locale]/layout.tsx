import { notFound } from "next/navigation";
import { LocaleProvider } from "@/components/LocaleProvider";
import LanguageSwitch from "@/components/LanguageSwitch";
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
      <div className="fixed top-6 right-6 z-[60] md:top-8 md:right-6 pointer-events-none [&>*]:pointer-events-auto">
        <LanguageSwitch />
      </div>
      {children}
    </LocaleProvider>
  );
}
