import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/authStore';
import { IS_DEV_MODE } from '../state/authSession';

export function LoginPage() {
  const navigate = useNavigate();
  const { hasActiveSession, isDemoMode, role, loginWithCredentials, enterDemoMode, hospitals } = useAuth();

  const defaultHospitalId = hospitals[0]?.hospital_id ?? '';
  const [hospitalId, setHospitalId] = useState(defaultHospitalId);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (hasActiveSession) {
    if (role === 'admin') {
      return <Navigate to="/upload" replace />;
    }

    return <Navigate to={isDemoMode ? '/landing' : '/dashboard'} replace />;
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await loginWithCredentials(hospitalId, username, password);
    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    setError(null);
    navigate(result.role === 'admin' ? '/upload' : '/dashboard', { replace: true });
  };

  const launchDemoMode = async () => {
    setIsSubmitting(true);
    const result = await enterDemoMode(hospitalId);
    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    setError(null);
    navigate('/landing?demo=true', { replace: true });
  };

  return (
    <main className="page auth-page">
      <header className="topbar fade-in">
        <img src="/PharmaKon.png" alt="PharmaKon Logo" className="wordmark" style={{ height: '42px', objectFit: 'contain' }} />
        <nav>
          <Link to="/landing">Back to Landing</Link>
        </nav>
      </header>

      <section className="auth-panel card fade-in" aria-label="Hospital staff sign in">
        <h1>Hospital Staff Access</h1>
        <p>Closed-system authentication with strict role-based access controls.</p>

        <form className="auth-credential-form" onSubmit={handleLogin}>
          <label className="auth-field">
            <span>Hospital</span>
            <select value={hospitalId} onChange={(event) => setHospitalId(event.target.value)}>
              {hospitals.map((hospital) => (
                <option key={hospital.hospital_id} value={hospital.hospital_id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </label>

          <label className="auth-field">
            <span>Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              type="text"
              autoComplete="username"
              placeholder={IS_DEV_MODE ? 'doc1 / nurse1 / lab1' : 'Enter staff username'}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder={IS_DEV_MODE ? 'pass' : 'Enter staff password'}
            />
          </label>

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-secondary-actions">
          <button type="button" className="auth-demo-button" onClick={launchDemoMode} disabled={isSubmitting}>
            Product Tour (Demo Mode)
          </button>
          <small>
            {IS_DEV_MODE
              ? 'Demo mode is clearly marked and non-clinical. Use pass for seeded users.'
              : 'Production secure sign-in. Product Tour demo mode is active for non-clinical evaluation.'}
          </small>
        </div>

        {error ? <p className="auth-error">{error}</p> : null}
      </section>
    </main>
  );
}
