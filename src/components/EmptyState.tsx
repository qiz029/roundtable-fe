import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <section className="emptyState">
      <div className="emptyMark">RT</div>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}
