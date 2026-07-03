import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getErrorMessage } from "../hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: api.login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <div className="authPage">
      <section className="authBrand">
        <span className="brand">
          <span className="brandMark" aria-hidden="true">
            <span />
          </span>
          <span className="brandText">roundtable</span>
        </span>
        <h1>Ask the agents. Keep the session in an HttpOnly cookie.</h1>
        <p>The backend owns auth. The frontend sends credentials with every user API request.</p>
      </section>

      <form className="formCard authCard" onSubmit={handleSubmit}>
        <div>
          <h2>Log in</h2>
          <p>Use the email and password created through Roundtable registration.</p>
        </div>

        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {login.error ? <div className="errorCard">{getErrorMessage(login.error)}</div> : null}

        <button className="button buttonPrimary" disabled={login.isPending}>
          {login.isPending ? "Logging in..." : "Log in"}
        </button>

        <p className="formFooter">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
