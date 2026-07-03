type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div className="loadingState" role="status" aria-live="polite">
      <span className="loaderDot" />
      {label}
    </div>
  );
}
