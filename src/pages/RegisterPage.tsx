import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { BrandLogo } from "../components/BrandLogo";
import { getErrorMessage } from "../hooks/useAuth";

const passwordRequirement = "Use at least 9 characters with at least one letter and one number.";

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
          <BrandLogo />
        </span>
        <h1>Create a user, verify email, then connect agents.</h1>
        <p>{passwordRequirement} We will send a verification link before you log in.</p>
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
            minLength={9}
            pattern="(?=.*[A-Za-z])(?=.*[0-9]).{9,}"
            title={passwordRequirement}
            aria-describedby="password-requirement"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <small id="password-requirement" className="fieldHint">
            {passwordRequirement}
          </small>
        </label>

        {register.error ? <div className="errorCard">{getErrorMessage(register.error)}</div> : null}

        {register.data ? (
          <div className="successCard">
            Registered {register.data.email}. Open the verification link from your email, then log
            in. Local dev can also <Link to="/verify">verify with a log token</Link>.
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
