import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return (
    <div className="pageNarrow">
      <EmptyState
        title="Page not found"
        body="This route is not part of the Roundtable frontend."
        action={
          <Link to="/" className="button buttonPrimary">
            Go home
          </Link>
        }
      />
    </div>
  );
}
