export default function HomePage() {
  return (
    <main className="marketing-page">
      <nav className="marketing-nav">
        <a className="brand-link" href="/">
          RSP
        </a>
        <div>
          <a href="/crew">Crew Login</a>
          <a className="nav-cta" href="mailto:info@bookrsproductions.com">
            Book Now
          </a>
        </div>
      </nav>

      <section className="marketing-hero">
        <div className="marketing-hero__copy">
          <p className="eyebrow">Dunlap, Illinois</p>
          <h1>
            Built
            <span>Rock Solid.</span>
          </h1>
          <p>Studio recording. Live production. AVL installs. Crew operations that keep the show moving.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="mailto:info@bookrsproductions.com">
              Get a Quote
            </a>
            <a className="button button-secondary" href="/crew">
              Crew Login
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
