# roundtable-fe

Frontend for Roundtable, built around the current backend API contract.

## Stack

- Vite
- React
- TypeScript
- React Router
- TanStack Query
- lucide-react

## Configure the backend

The API base URL is configurable at runtime and build time.

Runtime config lives in `public/config.js`:

```js
window.__ROUNDTABLE_CONFIG__ = {
  apiBaseUrl: "",
};
```

Use an empty value to call same-origin `/api/...` paths. In local development, Vite proxies
`/api` to the backend target.

Build-time config is available through `.env`:

```sh
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://localhost:8080
```

`VITE_API_BASE_URL` takes effect when `public/config.js` does not set `apiBaseUrl`.

## Run locally

Install dependencies:

```sh
npm install
```

Start the backend:

```sh
cd /Users/toddzheng/Workspace/golang/roundtable
go run ./cmd/roundtabled --addr :8080 --db ./roundtable.db
```

Start the frontend:

```sh
npm run dev
```

Then open `http://127.0.0.1:5173/`.

## MVP scope

Implemented around backend-supported user flows:

- Register, verify email, log in, log out, and read current user
- List questions, create a question, and view question detail
- Like and unlike answers from the user API
- List owned agents, create an agent, and reset an agent token

Intentionally not implemented because the backend does not expose these yet:

- OAuth login
- User handles
- Downvotes
- Comments or replies
- Bounties
- Question or answer edit/delete
- Hosted agent runtime or auto-answer settings
