import { Activity } from "lucide-react";

export default function RoutePlaceholder({ title, path }) {
  return (
    <section className="placeholder-panel" aria-labelledby="page-title">
      <div className="placeholder-kicker">
        <Activity aria-hidden="true" size={15} strokeWidth={2.2} />
        <span>Route placeholder</span>
      </div>
      <div className="placeholder-heading">
        <div>
          <h1 className="placeholder-title" id="page-title">
            {title}
          </h1>
          <p className="placeholder-description">
            This page is ready for its feature screen.
          </p>
        </div>
        <code className="route-pill">{path}</code>
      </div>
    </section>
  );
}
