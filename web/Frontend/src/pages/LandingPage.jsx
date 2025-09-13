import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div style={styles.container}>
      {/* 🔹 Navbar */}
      <nav style={styles.navbar}>
        <h2 style={styles.logo}>ProctorAI</h2>
        <div style={styles.navLinks}>
          <Link to="/" style={styles.link}>Home</Link>
          <Link to="/login" style={styles.link}>Login</Link>
          <Link to="/register" style={styles.link}>Register</Link>
        </div>
      </nav>

      {/* 🔹 Hero Section */}
      <header style={styles.header}>
        <div style={styles.heroContent}>
          <h1 style={styles.title}>AI-Based Online Exam Proctoring System</h1>
          <p style={styles.subtitle}>
            Secure • Smart • Reliable online exam monitoring for schools.
          </p>
          <Link to="/login">
            <button style={styles.button}>Get Started</button>
          </Link>
        </div>
        <div style={styles.heroImage}>
          <img
            src="https://via.placeholder.com/500x350"
            alt="Hero Illustration"
            style={{ width: "100%", borderRadius: "12px" }}
          />
        </div>
      </header>

      {/* 🔹 Features Section */}
      <section style={styles.features}>
        <div style={styles.card}>
          <img
            src="https://via.placeholder.com/300x180"
            alt="AI Monitoring"
            style={styles.img}
          />
          <h3>AI Monitoring</h3>
          <p>
            Face detection, eye tracking, and audio monitoring to prevent cheating.
          </p>
        </div>

        <div style={styles.card}>
          <img
            src="https://via.placeholder.com/300x180"
            alt="Easy Access"
            style={styles.img}
          />
          <h3>Easy Access</h3>
          <p>Students and teachers can log in quickly with ID or email.</p>
        </div>

        <div style={styles.card}>
          <img
            src="https://via.placeholder.com/300x180"
            alt="Reports"
            style={styles.img}
          />
          <h3>Detailed Reports</h3>
          <p>Teachers get instant exam results and suspicious activity logs.</p>
        </div>
      </section>

      {/* 🔹 Footer */}
      <footer style={styles.footer}>
        <p>© {new Date().getFullYear()} ProctorAI | Developed for Capstone Project</p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f9f9f9",
    minHeight: "100vh",
    width: "100%",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
  },
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 40px",
    backgroundColor: "#222",
    color: "#fff",
    flexWrap: "wrap",
  },
  logo: {
    margin: 0,
    fontWeight: "bold",
    fontSize: "1.5rem",
  },
  navLinks: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "1rem",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    alignItems: "center",
    padding: "60px 10%",
    gap: "40px",
  },
  heroContent: {
    textAlign: "left",
  },
  heroImage: {
    textAlign: "center",
  },
  title: {
    fontSize: "2.8rem",
    marginBottom: "15px",
    color: "#222",
  },
  subtitle: {
    fontSize: "1.2rem",
    color: "#555",
    marginBottom: "25px",
  },
  button: {
    background: "#28a745",
    color: "#fff",
    padding: "14px 30px",
    fontSize: "1rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "30px",
    padding: "60px 10%",
  },
  card: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "20px",
    textAlign: "center",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
  },
  img: {
    width: "100%",
    borderRadius: "10px",
    marginBottom: "15px",
  },
  footer: {
    textAlign: "center",
    padding: "20px",
    backgroundColor: "#222",
    color: "#fff",
    marginTop: "40px",
  },
};
