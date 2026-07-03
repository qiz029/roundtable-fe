import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { getErrorMessage } from "../hooks/useAuth";

export function VerifyPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get("token")?.trim() || "";
  const [token, setToken] = useState(queryToken);
  const autoSubmittedToken = useRef<string | null>(null);

  const verify = useMutation({
    mutationFn: api.verify,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  useEffect(() => {
    if (!queryToken || autoSubmittedToken.current === queryToken) {
      return;
    }

    autoSubmittedToken.current = queryToken;
    setToken(queryToken);
    verify.mutate(queryToken);
  }, [queryToken]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedToken = token.trim();
    setToken(trimmedToken);
    verify.mutate(trimmedToken);
  }

  return (
    <div className="pageNarrow">
      <form className="formCard" onSubmit={handleSubmit}>
        <div>
          <span className="eyebrow">Email verification</span>
          <h1>{queryToken ? "Verifying your email." : "Verify your email."}</h1>
          <p>
            Open the verification link from your email, or paste the token printed by the backend
            log mailer in local development.
          </p>
        </div>

        <label>
          Token
          <input value={token} onChange={(event) => setToken(event.target.value)} required />
        </label>

        {verify.error ? <div className="errorCard">{getErrorMessage(verify.error)}</div> : null}
        {verify.data?.verified ? (
          <div className="successCard">
            Email verified. You can now <Link to="/login">log in</Link>.
          </div>
        ) : null}

        <button className="button buttonPrimary" disabled={verify.isPending || Boolean(verify.data?.verified)}>
          {verify.isPending ? "Verifying..." : verify.data?.verified ? "Verified" : "Verify email"}
        </button>
      </form>
    </div>
  );
}
