/* ==================== Reset & Base ==================== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #13131a;
  --bg-card: #1a1a24;
  --bg-card-hover: #22222e;
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
  --text-muted: #6a6a7a;
  --orange: #ff6b1a;
  --orange-light: #ff8c42;
  --orange-dark: #d85e00;
  --orange-glow: rgba(255, 107, 26, 0.4);
  --mint: #10b981;
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 107, 26, 0.4);
  --radius: 16px;
  --radius-lg: 24px;
  --font: 'Cairo', sans-serif;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

html { scroll-behavior: smooth; }

body {
  font-family: var(--font);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  overflow-x: hidden;
  min-height: 100vh;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background: 
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255, 107, 26, 0.15), transparent),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(255, 107, 26, 0.05), transparent);
  pointer-events: none;
}

button { font: inherit; cursor: pointer; border: 0; background: none; color: inherit; }
a { color: inherit; text-decoration: none; }
input { font: inherit; }
img { display: block; max-width: 100%; }

.highlight { color: var(--orange-light); }

/* ==================== Navbar ==================== */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}
.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.3rem;
  font-weight: 900;
}
.brand-icon { font-size: 1.6rem; }
.brand-text {
  background: linear-gradient(135deg, #fff, var(--orange-light));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.nav-links {
  display: flex;
  gap: 32px;
  font-size: 0.95rem;
  font-weight: 700;
}
.nav-links a {
  color: var(--text-secondary);
  transition: var(--transition);
}
.nav-links a:hover { color: var(--orange-light); }

.btn-login {
  background: var(--orange);
  color: white;
  padding: 10px 24px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.95rem;
  transition: var(--transition);
  box-shadow: 0 4px 16px var(--orange-glow);
}
.btn-login:hover {
  background: var(--orange-light);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px var(--orange-glow);
}

/* ==================== Hero ==================== */
.hero {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 24px 60px;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 60px;
  align-items: center;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 107, 26, 0.1);
  border: 1px solid rgba(255, 107, 26, 0.3);
  color: var(--orange-light);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 24px;
}
.hero-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: -1px;
  margin-bottom: 20px;
}
.hero-subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 32px;
  max-width: 500px;
}
.hero-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 40px;
}
.btn-primary {
  background: var(--orange);
  color: white;
  padding: 12px 28px;
  border-radius: 12px;
  font-weight: 800;
  transition: var(--transition);
  box-shadow: 0 8px 24px var(--orange-glow);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn-primary:hover {
  background: var(--orange-light);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px var(--orange-glow);
}
.btn-primary:disabled { opacity: 0.6; cursor: wait; }
.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 12px 28px;
  border-radius: 12px;
  font-weight: 800;
  transition: var(--transition);
}
.btn-secondary:hover {
  border-color: var(--orange);
  background: rgba(255, 107, 26, 0.1);
}
.btn-large { padding: 16px 32px; font-size: 1rem; }
.btn-full { width: 100%; padding: 14px; font-size: 1rem; }
.arrow { font-size: 1.1rem; }

.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
  padding-top: 32px;
  border-top: 1px solid var(--border);
}
.stat-item { display: flex; flex-direction: column; }
.stat-number {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--orange-light);
}
.stat-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 2px;
}
.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--border);
}

/* ==================== Hero Visual ==================== */
.hero-visual {
  position: relative;
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.visual-card {
  position: absolute;
  top: 50px;
  left: 20px;
  width: 320px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  transform: rotate(-3deg);
  transition: var(--transition);
  animation: float 4s ease-in-out infinite;
}
.visual-card-2 {
  position: absolute;
  bottom: 80px;
  right: 20px;
  background: linear-gradient(135deg, var(--orange), var(--orange-dark));
  border-radius: var(--radius-lg);
  padding: 24px;
  text-align: center;
  box-shadow: 0 20px 60px var(--orange-glow);
  transform: rotate(3deg);
  transition: var(--transition);
  animation: float 4s ease-in-out infinite reverse;
}
.progress-circle {
  font-size: 2.5rem;
  font-weight: 900;
  color: white;
}
.progress-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  font-weight: 700;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.card-icon { font-size: 1.8rem; }
.card-title { font-size: 1.1rem; font-weight: 800; }
.card-body { display: flex; flex-direction: column; gap: 10px; }
.mini-subject {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  transition: var(--transition);
}
.mini-subject:hover { background: rgba(255, 107, 26, 0.1); }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-12px) rotate(-3deg); }
}

/* ==================== Sections ==================== */
.section-header {
  text-align: center;
  margin-bottom: 48px;
}
.section-header h2 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-weight: 900;
  margin-bottom: 12px;
}
.section-header p {
  color: var(--text-secondary);
  font-size: 1.05rem;
}

.features-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 24px;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  transition: var(--transition);
}
.feature-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
}
.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 16px;
}
.feature-card h3 {
  font-size: 1.2rem;
  font-weight: 800;
  margin-bottom: 8px;
}
.feature-card p {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.7;
}

.faq-section {
  max-width: 900px;
  margin: 0 auto;
  padding: 80px 24px;
}
.faq-list { display: flex; flex-direction: column; gap: 12px; }
.faq-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 24px;
  transition: var(--transition);
}
.faq-item:hover { border-color: var(--border-hover); }
.faq-item summary {
  cursor: pointer;
  list-style: none;
  padding: 20px 0;
  font-size: 1rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.faq-item summary::-webkit-details-marker { display: none; }
.faq-item summary::after {
  content: '+';
  font-size: 1.5rem;
  color: var(--orange-light);
  transition: var(--transition);
}
.faq-item[open] summary::after {
  content: '−';
  transform: rotate(180deg);
}
.faq-item p {
  color: var(--text-secondary);
  padding: 0 0 20px;
  font-size: 0.95rem;
  line-height: 1.8;
}

/* ==================== Footer ==================== */
.footer {
  border-top: 1px solid var(--border);
  padding: 40px 24px;
  margin-top: 60px;
}
.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}
.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 1.3rem;
  font-weight: 900;
  margin-bottom: 12px;
}
.footer-copy {
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* ==================== Login Modal ==================== */
.login-modal {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.login-modal.show { display: flex; }
.login-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s;
}
.login-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px 32px;
  width: 100%;
  max-width: 420px;
  text-align: center;
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
}
.login-close {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}
.login-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ff8a80;
}
.login-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}
.login-card h2 {
  font-size: 1.8rem;
  font-weight: 900;
  margin-bottom: 8px;
}
.login-subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-bottom: 28px;
}
.code-input {
  width: 100%;
  padding: 16px;
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: 14px;
  color: var(--text-primary);
  font-size: 1.8rem;
  font-weight: 900;
  text-align: center;
  letter-spacing: 8px;
  outline: none;
  transition: var(--transition);
  margin-bottom: 16px;
}
.code-input:focus {
  border-color: var(--orange);
  box-shadow: 0 0 0 4px var(--orange-glow);
}
.code-input::placeholder {
  color: var(--text-muted);
  letter-spacing: 8px;
}
.login-status {
  margin-top: 16px;
  padding: 12px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  display: none;
}
.login-status.loading {
  display: block;
  background: rgba(255, 107, 26, 0.1);
  color: var(--orange-light);
  border: 1px solid rgba(255, 107, 26, 0.2);
}
.login-status.error {
  display: block;
  background: rgba(239, 68, 68, 0.1);
  color: #ff8a80;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.login-status.success {
  display: block;
  background: rgba(16, 185, 129, 0.1);
  color: var(--mint);
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.login-hint {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: 20px;
  line-height: 1.6;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ==================== Responsive ==================== */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    padding: 50px 20px 40px;
    gap: 40px;
    text-align: center;
  }
  .hero-subtitle { margin-left: auto; margin-right: auto; }
  .hero-actions { justify-content: center; }
  .hero-stats { justify-content: center; }
  .hero-visual { height: 400px; }
  .visual-card { width: 280px; left: 0; }
  .visual-card-2 { right: 0; bottom: 60px; padding: 20px; }
  .progress-circle { font-size: 2rem; }
  .nav-links { display: none; }
}
@media (max-width: 600px) {
  .nav-container { padding: 12px 16px; }
  .brand-text { font-size: 1.1rem; }
  .hero-title { font-size: 2rem; }
  .hero-subtitle { font-size: 1rem; }
  .hero-visual { height: 340px; }
  .visual-card { width: 240px; padding: 16px; }
  .card-title { font-size: 0.95rem; }
  .mini-subject { padding: 8px 12px; font-size: 0.85rem; }
  .visual-card-2 { padding: 16px; }
  .progress-circle { font-size: 1.6rem; }
  .features-section, .faq-section { padding: 50px 20px; }
  .feature-card { padding: 24px; }
  .login-card { padding: 32px 24px; }
  .code-input { font-size: 1.5rem; letter-spacing: 6px; }
}
