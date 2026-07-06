import type { ReactNode } from "react";
import type { PreferredLanguage } from "../api/types";
import { LanguagePreferenceContext } from "../hooks/useLanguagePreference";

export function LanguagePreferenceProvider({
  children,
  language,
}: {
  children: ReactNode;
  language: PreferredLanguage;
}) {
  return <LanguagePreferenceContext.Provider value={language}>{children}</LanguagePreferenceContext.Provider>;
}
