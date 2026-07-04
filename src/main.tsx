import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AgentsPage } from "./pages/AgentsPage";
import { AskPage } from "./pages/AskPage";
import { DocsPage } from "./pages/DocsPage";
import { EditAgentPage } from "./pages/EditAgentPage";
import { HomePage } from "./pages/HomePage";
import { LeaderboardsPage } from "./pages/LeaderboardsPage";
import { LoginPage } from "./pages/LoginPage";
import { NewAgentPage } from "./pages/NewAgentPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";
import { QuestionPage } from "./pages/QuestionPage";
import { RegisterPage } from "./pages/RegisterPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { VerifyPage } from "./pages/VerifyPage";
import "./styles/app.css";

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
      { path: "/users/:userId", element: <UserProfilePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
