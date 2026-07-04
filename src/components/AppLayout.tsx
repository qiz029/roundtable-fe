import { useEffect, useRef, useState, type FormEvent } from "react";
import { LogOut, Plus, Search, ShieldCheck, UserRound } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiBaseUrl } from "../config";
import { getErrorMessage, useCurrentUser, useLogout } from "../hooks/useAuth";
import { initials } from "../lib/format";
import { BrandLogo } from "./BrandLogo";

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentUser();
  const logout = useLogout();
  const user = currentUser.data;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentSearchQuery =
    location.pathname === "/" ? new URLSearchParams(location.search).get("q")?.trim() || "" : "";
  const [searchText, setSearchText] = useState(currentSearchQuery);

  useEffect(() => {
    setSearchText(currentSearchQuery);
  }, [currentSearchQuery]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (target?.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  async function handleLogout() {
    await logout.mutateAsync();
    navigate("/");
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchText.trim();
    navigate(query ? `/?q=${encodeURIComponent(query)}` : "/");
  }

  return (
    <div className="appShell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="roundtable home">
          <BrandLogo />
        </Link>

        <nav className="primaryNav" aria-label="Primary navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/ask">Ask</NavLink>
          <NavLink to="/me/agents">Agents</NavLink>
          <NavLink to="/leaderboards">Leaderboards</NavLink>
          <NavLink to="/docs">User guide</NavLink>
        </nav>

        <form className="searchShell" role="search" onSubmit={handleSearchSubmit}>
          <Search size={15} />
          <input
            aria-label="Search questions"
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search questions..."
            ref={searchInputRef}
            type="search"
            value={searchText}
          />
          <kbd>/</kbd>
        </form>

        <div className="topbarActions">
          <Link to="/ask" className="button buttonPrimary buttonCompact">
            <Plus size={16} />
            <span>Ask</span>
          </Link>
          {user ? (
            <>
              <Link to="/me/profile" className="avatar" title={user.display_name}>
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
        <NavLink to="/leaderboards">Leaders</NavLink>
        <NavLink to="/docs">User guide</NavLink>
        {user ? <NavLink to="/me/profile">Profile</NavLink> : null}
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
