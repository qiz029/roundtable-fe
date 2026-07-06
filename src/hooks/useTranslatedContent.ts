import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { PreferredLanguage, TranslationResourceType } from "../api/types";

type UseTranslatedContentParams = {
  enabled?: boolean;
  originalBody: string;
  originalTitle?: string;
  resourceId: string;
  resourceType: TranslationResourceType;
  targetLanguage: PreferredLanguage;
};

export type TranslatedContent = {
  body: string;
  hasTranslatedDisplay: boolean;
  isShowingOriginal: boolean;
  setShowOriginal: (showOriginal: boolean) => void;
  title?: string;
};

export function useTranslatedContent({
  enabled = true,
  originalBody,
  originalTitle,
  resourceId,
  resourceType,
  targetLanguage,
}: UseTranslatedContentParams): TranslatedContent {
  const [showOriginal, setShowOriginal] = useState(false);
  const queryClient = useQueryClient();
  const sourceFingerprint = useMemo(
    () => fingerprintSource(originalTitle || "", originalBody),
    [originalBody, originalTitle],
  );
  const translation = useQuery({
    queryKey: translationCacheKey(resourceType, resourceId, targetLanguage, sourceFingerprint),
    queryFn: () =>
      api.getTranslation({
        resource_id: resourceId,
        resource_type: resourceType,
        target_language: targetLanguage,
      }),
    enabled: enabled && Boolean(resourceId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setShowOriginal(false);
  }, [resourceId, sourceFingerprint, targetLanguage]);

  useEffect(() => {
    if (!translation.data?.source_hash) return;

    queryClient.setQueryData(
      translationCacheKey(
        translation.data.resource_type,
        translation.data.resource_id,
        translation.data.target_language,
        `${translation.data.source_hash}:${translation.data.translation_version}`,
      ),
      translation.data,
    );
  }, [queryClient, translation.data]);

  const readyTranslation = translation.data?.status === "ready" ? translation.data.translation : undefined;
  const translatedTitle = originalTitle == null ? undefined : readyTranslation ? readyTranslation.title : originalTitle;
  const translatedBody = readyTranslation ? readyTranslation.body : originalBody;
  const hasTranslatedDisplay = Boolean(
    readyTranslation &&
    (translatedBody !== originalBody || (originalTitle != null && translatedTitle !== originalTitle)),
  );

  if (!hasTranslatedDisplay || showOriginal) {
    return {
      body: originalBody,
      hasTranslatedDisplay,
      isShowingOriginal: true,
      setShowOriginal,
      title: originalTitle,
    };
  }

  return {
    body: translatedBody,
    hasTranslatedDisplay,
    isShowingOriginal: false,
    setShowOriginal,
    title: translatedTitle,
  };
}

export function translationToggleLabel(language: PreferredLanguage, isShowingOriginal: boolean) {
  if (isShowingOriginal) {
    return language === "zh-CN" ? "查看译文" : "Show translation";
  }

  return language === "zh-CN" ? "查看原文" : "Show original";
}

function fingerprintSource(title: string, body: string) {
  const value = `${title}\0${body}`;
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return `${value.length}:${(hash >>> 0).toString(36)}`;
}

function translationCacheKey(
  resourceType: TranslationResourceType,
  resourceId: string,
  targetLanguage: PreferredLanguage,
  sourceToken: string,
) {
  return ["translation", resourceType, resourceId, targetLanguage, sourceToken] as const;
}
