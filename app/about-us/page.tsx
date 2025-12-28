import React from "react";

export const metadata = {
  title: "About Us — BookingBTracker",
  description: "Learn about BookingBTracker: our mission, values, and team.",
};

export default function AboutPage(): JSX.Element {
  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>About BookingBTracker</h1>
        <p style={styles.lead}>
          We build simple, reliable booking tools that help businesses manage
          reservations and customers with less friction.
        </p>
      </header>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Our mission</h2>
        <p style={styles.paragraph}>
          To empower small and medium businesses with intuitive scheduling and
          analytics so they can focus on what matters: delivering great
          experiences to their customers.
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Core values</h2>
        <ul style={styles.valuesList}>
          <li style={styles.valueItem}>
            <strong>Clarity</strong> — simple interfaces and predictable
            behavior.
          </li>
          <li style={styles.valueItem}>
            <strong>Reliability</strong> — robust features you can depend on.
          </li>
          <li style={styles.valueItem}>
            <strong>Privacy</strong> — respecting user data and keeping it safe.
          </li>
        </ul>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Meet the team</h2>
        <div style={styles.teamGrid}>
          <div style={styles.card}>
            <div style={styles.avatar}>RC</div>
            <div>
              <strong>Ronny Christensen</strong>
              <div style={styles.role}>Founder &amp; CEO</div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.avatar}>ML</div>
            <div>
              <strong>Maya Lee</strong>
              <div style={styles.role}>Product</div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.avatar}>AS</div>
            <div>
              <strong>Ashwin S.</strong>
              <div style={styles.role}>Engineering</div>
            </div>
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Want to get in touch? Email us at{" "}
          <a href="mailto:hello@bookingbtracker.com">
            hello@bookingbtracker.com
          </a>
          .
        </p>
      </footer>
    </main>
  );
}

const styles: { [k: string]: React.CSSProperties } = {
  container: {
    maxWidth: 920,
    margin: "40px auto",
    padding: "0 20px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    color: "#111827",
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 36,
    margin: "0 0 8px 0",
  },
  lead: {
    margin: 0,
    color: "#374151",
  },
  section: {
    marginTop: 28,
    paddingTop: 10,
    borderTop: "1px solid #e6e6e6",
  },
  sectionTitle: {
    fontSize: 20,
    margin: "0 0 8px 0",
  },
  paragraph: {
    margin: 0,
    color: "#374151",
  },
  valuesList: {
    listStyle: "none",
    padding: 0,
    margin: "8px 0 0 0",
    display: "grid",
    gap: 8,
  },
  valueItem: {
    background: "#fafafa",
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #f0f0f0",
  },
  teamGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginTop: 8,
  },
  card: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: 12,
    border: "1px solid #eee",
    borderRadius: 8,
    background: "#fff",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    background: "#e6e6e6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    color: "#111827",
  },
  role: {
    fontSize: 13,
    color: "#6b7280",
  },
  footer: {
    marginTop: 36,
    paddingTop: 18,
    borderTop: "1px solid #e6e6e6",
  },
  footerText: {
    margin: 0,
    color: "#374151",
  },
};
