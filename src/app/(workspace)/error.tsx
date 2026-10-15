"use client";
export default function WorkspaceError({ retry }: { retry: () => void }) {
  return (
    <section className="notice error" role="alert">
      <div>
        <h2>This view could not load.</h2>
        <p>Try loading the view again.</p>
        <button className="button" onClick={retry}>
          Try again
        </button>
      </div>
    </section>
  );
}
