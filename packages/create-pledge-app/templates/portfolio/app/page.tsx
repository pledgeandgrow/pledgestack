export default function HomePage() {
  return (
    <div>
      <section class="hero container">
        <div class="avatar">AR</div>
        <h1>Alex Rivera</h1>
        <p class="tagline">Full-Stack Developer & Designer — building fast, beautiful web apps with Rust-powered tools.</p>
        <div class="socials">
          <a href="https://github.com/" title="GitHub">GH</a>
          <a href="https://twitter.com/" title="Twitter">TW</a>
          <a href="https://linkedin.com/" title="LinkedIn">LI</a>
          <a href="mailto:alex@example.com" title="Email">@</a>
        </div>
      </section>

      <section class="section container" id="projects">
        <h2><span class="num">01.</span> Featured Projects</h2>
        <div class="projects">
          <div class="project">
            <div class="thumb">🚀</div>
            <div class="body">
              <h3>ShipFaster</h3>
              <p>A SaaS starter kit with auth, payments, and dashboards. Built with PledgeStack and PledgePack.</p>
              <div class="tags">
                <span class="tag">PledgeStack</span>
                <span class="tag">Rust</span>
                <span class="tag">Stripe</span>
              </div>
              <div class="links">
                <a href="/">Live Demo →</a>
                <a href="/">Source →</a>
              </div>
            </div>
          </div>
          <div class="project">
            <div class="thumb">📊</div>
            <div class="body">
              <h3>DataFlow</h3>
              <p>Real-time analytics dashboard with WebSocket updates and chart visualizations.</p>
              <div class="tags">
                <span class="tag">React</span>
                <span class="tag">WebSocket</span>
                <span class="tag">D3</span>
              </div>
              <div class="links">
                <a href="/">Live Demo →</a>
                <a href="/">Source →</a>
              </div>
            </div>
          </div>
          <div class="project">
            <div class="thumb">🎨</div>
            <div class="body">
              <h3>DesignKit</h3>
              <p>An open-source component library with 50+ accessible React components and dark mode.</p>
              <div class="tags">
                <span class="tag">React</span>
                <span class="tag">TypeScript</span>
                <span class="tag">a11y</span>
              </div>
              <div class="links">
                <a href="/">Live Demo →</a>
                <a href="/">Source →</a>
              </div>
            </div>
          </div>
          <div class="project">
            <div class="thumb">🦀</div>
            <div class="body">
              <h3>RustAPI</h3>
              <p>A high-performance REST API framework for Rust with async support and OpenAPI docs.</p>
              <div class="tags">
                <span class="tag">Rust</span>
                <span class="tag">Axum</span>
                <span class="tag">Tokio</span>
              </div>
              <div class="links">
                <a href="/">Docs →</a>
                <a href="/">Source →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section container" id="about">
        <h2><span class="num">02.</span> About Me</h2>
        <div class="about">
          <div>
            <p>I'm a full-stack developer with 8+ years of experience building web applications. I specialize in React, Rust, and performance optimization.</p>
            <p>Currently focused on PledgeStack — a Rust-powered React framework that combines the developer experience of Next.js with the speed of native code.</p>
            <p>When I'm not coding, you'll find me hiking, contributing to open source, or experimenting with new web technologies.</p>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--muted)' }}>Skills & Tools</h3>
            <div class="skills">
              <span class="skill">Rust <span class="level">Expert</span></span>
              <span class="skill">React <span class="level">Expert</span></span>
              <span class="skill">TypeScript <span class="level">Expert</span></span>
              <span class="skill">Node.js <span class="level">Advanced</span></span>
              <span class="skill">PostgreSQL <span class="level">Advanced</span></span>
              <span class="skill">Docker <span class="level">Advanced</span></span>
              <span class="skill">AWS <span class="level">Intermediate</span></span>
              <span class="skill">Figma <span class="level">Intermediate</span></span>
            </div>
          </div>
        </div>
      </section>

      <section class="contact container" id="contact">
        <h2>Let's build something together</h2>
        <p>I'm available for freelance work and collaborations. Drop me a line!</p>
        <a href="mailto:alex@example.com" class="btn">Get in touch →</a>
      </section>
    </div>
  );
}
