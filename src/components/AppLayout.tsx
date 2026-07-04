import { useEffect, useMemo, useRef, useState, type FocusEvent, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Plus, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { QuestionSummary } from "../api/types";
import { apiBaseUrl } from "../config";
import { getErrorMessage, useCurrentUser, useLogout } from "../hooks/useAuth";
import { textSnippet } from "../hooks/useSeo";
import { initials } from "../lib/format";
import { pillToneClass } from "../lib/pills";
import { questionPath } from "../lib/routes";
import { buildQuestionSearchHref, normalizeSearchTags, parseSearchInput, rankQuestionSuggestions } from "../lib/search";
import { BrandLogo } from "./BrandLogo";

const TYPEAHEAD_POOL_SIZE = 25;
const TYPEAHEAD_FILTERED_SIZE = 10;
const TYPEAHEAD_LIMIT = 5;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentUser();
  const logout = useLogout();
  const user = currentUser.data;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentSearchState = useMemo(() => {
    if (location.pathname !== "/") {
      return { query: "", tags: [] };
    }

    const params = new URLSearchParams(location.search);
    return {
      query: params.get("q")?.trim() || "",
      tags: normalizeSearchTags(params.getAll("tags")),
    };
  }, [location.pathname, location.search]);
  const currentSearchTagKey = currentSearchState.tags.join("\0");
  const [searchText, setSearchText] = useState(currentSearchState.query);
  const [searchTags, setSearchTags] = useState(currentSearchState.tags);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState(currentSearchState.query);

  useEffect(() => {
    setSearchText(currentSearchState.query);
    setDebouncedSearchText(currentSearchState.query);
    setSearchTags(currentSearchState.tags);
  }, [currentSearchState.query, currentSearchState.tags, currentSearchTagKey]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearchText(searchText), 160);
    return () => window.clearTimeout(timeoutId);
  }, [searchText]);

  const parsedTypeahead = useMemo(() => parseSearchInput(debouncedSearchText), [debouncedSearchText]);
  const typeaheadTags = useMemo(
    () => normalizeSearchTags([...searchTags, ...parsedTypeahead.tags]),
    [parsedTypeahead.tags, searchTags],
  );
  const typeaheadTagKey = typeaheadTags.join("\0");
  const typeaheadQuery = parsedTypeahead.query;
  const typeaheadEnabled = isSearchFocused && Boolean(typeaheadQuery || typeaheadTags.length);
  const suggestions = useQuery({
    queryKey: ["questionTypeahead", typeaheadQuery, typeaheadTagKey],
    queryFn: () => loadQuestionSuggestions(typeaheadQuery, typeaheadTags),
    enabled: typeaheadEnabled,
    staleTime: 10_000,
  });
  const suggestionItems = typeaheadEnabled ? suggestions.data || [] : [];

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

    const parsed = parseSearchInput(searchText);
    const nextTags = normalizeSearchTags([...searchTags, ...parsed.tags]);

    setSearchText(parsed.query);
    setDebouncedSearchText(parsed.query);
    setSearchTags(nextTags);
    recordSearchBehavior(parsed.query, nextTags);
    navigate(buildQuestionSearchHref(parsed.query, nextTags));
  }

  function handleRemoveSearchTag(tag: string) {
    const parsed = parseSearchInput(searchText);
    const nextTags = searchTags.filter((value) => value !== tag);

    setSearchText(parsed.query);
    setDebouncedSearchText(parsed.query);
    setSearchTags(nextTags);
    navigate(buildQuestionSearchHref(parsed.query, nextTags));
    searchInputRef.current?.focus();
  }

  function handleSearchBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsSearchFocused(false);
    }
  }

  function handleSuggestionOpen(question: QuestionSummary) {
    setIsSearchFocused(false);
    if (!user) return;

    void api
      .recordFeedEvent({
        event_type: "open",
        question_id: question.id,
        source: "search",
      })
      .catch(() => {
        // Search navigation should not wait on personalization telemetry.
      });
  }

  function recordSearchBehavior(query: string, tags: string[]) {
    if (!user) return;

    if (query.trim()) {
      void api
        .recordFeedEvent({
          event_type: "search",
          query: query.trim(),
          source: "search",
        })
        .catch(() => {
          // Search navigation should not wait on personalization telemetry.
        });
    }

    if (tags.length) {
      void api
        .recordFeedEvent({
          event_type: "tag_filter",
          source: "search",
          tags,
        })
        .catch(() => {
          // Search navigation should not wait on personalization telemetry.
        });
    }
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

        <div className="searchWrap" onBlur={handleSearchBlur} onFocus={() => setIsSearchFocused(true)}>
          <form className="searchShell" role="search" onSubmit={handleSearchSubmit}>
            <Search size={15} />
            {searchTags.map((tag) => (
              <span className={`pill searchTagPill ${pillToneClass(tag)}`} key={tag}>
                <span>#{tag}</span>
                <button type="button" aria-label={`Remove #${tag} filter`} onClick={() => handleRemoveSearchTag(tag)}>
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              aria-label="Search questions"
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search questions or #tag..."
              ref={searchInputRef}
              type="search"
              value={searchText}
            />
            <kbd>/</kbd>
          </form>

          {suggestionItems.length ? (
            <div className="searchSuggestions" role="listbox" aria-label="Question suggestions">
              {suggestionItems.map((question) => (
                <Link
                  className="searchSuggestion"
                  key={question.id}
                  onClick={() => handleSuggestionOpen(question)}
                  onMouseDown={(event) => event.preventDefault()}
                  role="option"
                  to={questionPath(question)}
                >
                  <span className="searchSuggestionTitle">{question.title}</span>
                  {suggestionExcerpt(question) ? (
                    <span className="searchSuggestionBody">{suggestionExcerpt(question)}</span>
                  ) : null}
                  <span className="searchSuggestionMeta">
                    <span>{question.answer_count} answers</span>
                    {question.tags.slice(0, 3).map((tag) => (
                      <span className="searchSuggestionTag" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

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

async function loadQuestionSuggestions(query: string, tags: string[]) {
  const tagParams = tags.length ? tags : undefined;

  if (!query.trim()) {
    const result = await api.listQuestions({ limit: TYPEAHEAD_LIMIT, tags: tagParams });
    return result.items.slice(0, TYPEAHEAD_LIMIT);
  }

  const [filtered, pool] = await Promise.all([
    api.listQuestions({ limit: TYPEAHEAD_FILTERED_SIZE, q: query, tags: tagParams }),
    api.listQuestions({ limit: TYPEAHEAD_POOL_SIZE, tags: tagParams }),
  ]);

  return rankQuestionSuggestions([...filtered.items, ...pool.items], query, TYPEAHEAD_LIMIT);
}

function suggestionExcerpt(question: QuestionSummary) {
  return textSnippet(question.body, "", 96);
}
