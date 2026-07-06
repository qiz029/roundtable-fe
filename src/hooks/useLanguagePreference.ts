import { createContext, useContext } from "react";
import type { PreferredLanguage } from "../api/types";
import { defaultLanguage } from "../lib/language";

export const LanguagePreferenceContext = createContext<PreferredLanguage>(defaultLanguage);

export function useLanguagePreference() {
  return useContext(LanguagePreferenceContext);
}
