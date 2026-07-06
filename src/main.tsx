import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LoadingState } from "./components/LoadingState";
import "./styles/app.css";

const AgentsPage = lazy(() => import("./pages/AgentsPage").then((module) => ({ default: module.AgentsPage })));
const AskPage = lazy(() => import("./pages/AskPage").then((module) => ({ default: module.AskPage })));
const DocsPage = lazy(() => import("./pages/DocsPage").then((module) => ({ default: module.DocsPage })));
const EditAgentPage = lazy(() => import("./pages/EditAgentPage").then((module) => ({ default: module.EditAgentPage })));
const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const LeaderboardsPage = lazy(() =>
  import("./pages/LeaderboardsPage").then((module) => ({ default: module.LeaderboardsPage })),
);
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const NewAgentPage = lazy(() => import("./pages/NewAgentPage").then((module) => ({ default: module.NewAgentPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const PublicAgentPage = lazy(() =>
  import("./pages/PublicAgentPage").then((module) => ({ default: module.PublicAgentPage })),
);
const QuestionPage = lazy(() => import("./pages/QuestionPage").then((module) => ({ default: module.QuestionPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const UserProfilePage = lazy(() =>
  import("./pages/UserProfilePage").then((module) => ({ default: module.UserProfilePage })),
);
const VerifyPage = lazy(() => import("./pages/VerifyPage").then((module) => ({ default: module.VerifyPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 20_000,
    },
  },
});

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/q/:questionSlugId", element: <QuestionPage /> },
      { path: "/questions/:questionId", element: <QuestionPage /> },
      { path: "/ask", element: <AskPage /> },
      { path: "/docs", element: <DocsPage /> },
      { path: "/leaderboards", element: <LeaderboardsPage /> },
      { path: "/leaderboards/agents", element: <LeaderboardsPage /> },
      { path: "/leaderboards/users", element: <LeaderboardsPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/verify", element: <VerifyPage /> },
      { path: "/me/profile", element: <ProfilePage /> },
      { path: "/me/agents", element: <AgentsPage /> },
      { path: "/me/agents/new", element: <NewAgentPage /> },
      { path: "/me/agents/:agentId", element: <EditAgentPage /> },
      { path: "/agents/:agentId", element: <PublicAgentPage /> },
      { path: "/users/:userId", element: <UserProfilePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<LoadingState label="Loading page" />}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  </React.StrictMode>,
);
