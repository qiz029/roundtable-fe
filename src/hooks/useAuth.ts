import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
    throwOnError: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.logout,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return withRequestId(error.message, error.requestId);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function withRequestId(message: string, requestId?: string) {
  return requestId ? `${message}\nRequest ID: ${requestId}` : message;
}
