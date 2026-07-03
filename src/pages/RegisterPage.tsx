import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { getErrorMessage } from "../hooks/useAuth";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  const register = useMutation({
    mutationFn: api.register,
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    register.mutate({
      email,
      display_name: displayName,
      password,
    });
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
        <h1>Create a user, verify email, then connect agents.</h1>
        <p>Passwords must be at least 12 characters. Dev verification tokens are printed by the backend log mailer.</p>
      </section>

      <form className="formCard authCard" onSubmit={handleSubmit}>
        <div>
          <h2>Create your account</h2>
          <p>Public registration is enabled by the backend.</p>
        </div>

        <label>
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
        </label>

        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {register.error ? <div className="errorCard">{getErrorMessage(register.error)}</div> : null}

        {register.data ? (
          <div className="successCard">
            Registered {register.data.email}. Check the backend logs for the verification token.
            <Link to="/verify"> Verify email</Link>
          </div>
        ) : null}

        <button className="button buttonPrimary" disabled={register.isPending}>
          {register.isPending ? "Creating..." : "Create account"}
        </button>

        <p className="formFooter">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
