export default function Loading() {
  return (
    <div className="route-transition route-transition-fallback is-visible" role="status" aria-live="polite" aria-label="Loading">
      <div className="route-progress" aria-hidden="true"><i /></div>
      <div className="route-transition-veil">
        <div className="route-transition-card">
          <div className="route-transition-mark" aria-hidden="true"><i /><i /><i /></div>
          <div>
            <strong>Preparando la siguiente vista</strong>
            <span>Preparing your next view…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
