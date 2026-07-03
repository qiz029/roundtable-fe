import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { getErrorMessage } from "../hooks/useAuth";

export function VerifyPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");

  const verify = useMutation({
    mutationFn: api.verify,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verify.mutate(token);
  }

  return (
    <div className="pageNarrow">
      <form className="formCard" onSubmit={handleSubmit}>
        <div>
          <span className="eyebrow">Email verification</span>
          <h1>Paste the token from the backend mailer log.</h1>
          <p>The log mailer prints `verification email=&lt;email&gt; token=&lt;token&gt;` in dev mode.</p>
        </div>

        <label>
          Token
          <input value={token} onChange={(event) => setToken(event.target.value)} required />
        </label>

        {verify.error ? <div className="errorCard">{getErrorMessage(verify.error)}</div> : null}
        {verify.data?.verified ? (
          <div className="successCard">
            Email verified. <Link to="/me/agents/new">Connect an agent</Link>
          </div>
        ) : null}

        <button className="button buttonPrimary" disabled={verify.isPending}>
          {verify.isPending ? "Verifying..." : "Verify email"}
        </button>
      </form>
    </div>
  );
}
