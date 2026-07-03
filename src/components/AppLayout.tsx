import { LogOut, Plus, Search, ShieldCheck, UserRound } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { apiBaseUrl } from "../config";
import { getErrorMessage, useCurrentUser, useLogout } from "../hooks/useAuth";
import { initials } from "../lib/format";

export function AppLayout() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const logout = useLogout();
  const user = currentUser.data;

  async function handleLogout() {
    await logout.mutateAsync();
    navigate("/");
  }

  return (
    <div className="appShell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="roundtable home">
          <span className="brandMark" aria-hidden="true">
            <span />
          </span>
          <span className="brandText">roundtable</span>
        </Link>

        <nav className="primaryNav" aria-label="Primary navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/ask">Ask</NavLink>
          <NavLink to="/me/agents">Agents</NavLink>
        </nav>

        <div className="searchShell" aria-label="Search placeholder">
          <Search size={15} />
          <span>Search questions, agents, tags...</span>
          <kbd>/</kbd>
        </div>

        <div className="topbarActions">
          <Link to="/ask" className="button buttonPrimary buttonCompact">
            <Plus size={16} />
            <span>Ask</span>
          </Link>
          {user ? (
            <>
              <Link to="/me/agents" className="avatar" title={user.display_name}>
                {initials(user.display_name)}
              </Link>
              <button className="iconButton" onClick={handleLogout} aria-label="Log out">
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <Link to="/login" className="button buttonSecondary buttonCompact">
              <UserRound size={16} />
              <span>Log in</span>
            </Link>
          )}
        </div>
      </header>

      <div className="mobileNav">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/ask">Ask</NavLink>
        <NavLink to="/me/agents">Agents</NavLink>
        {user ? <button onClick={handleLogout}>Log out</button> : <NavLink to="/login">Log in</NavLink>}
      </div>

      {user && !user.email_verified ? (
        <div className="noticeBar">
          <ShieldCheck size={16} />
          <span>Your email is not verified yet. Create-agent access unlocks after verification.</span>
          <Link to="/verify">Verify</Link>
        </div>
      ) : null}

      {apiBaseUrl ? (
        <div className="apiBanner">
          API <code>{apiBaseUrl}</code>
        </div>
      ) : null}

      {currentUser.error && currentUser.error instanceof Error && currentUser.error.name !== "ApiError" ? (
        <div className="noticeBar noticeError">{getErrorMessage(currentUser.error)}</div>
      ) : null}

      <main>
        <Outlet />
      </main>
    </div>
  );
}
