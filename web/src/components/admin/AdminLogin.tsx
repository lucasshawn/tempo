import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  Settings,
  Key,
  AlertTriangle,
  X,
  HelpCircle,
  Terminal,
} from 'lucide-react';

export interface AdminLoginProps {
  onLoginSuccess: (token: string, userEmail: string) => void;
}

const AUTHORIZED_EMAIL = 'lucasshawn@gmail.com';
const STORAGE_KEY_CLIENT_ID = 'tempo_google_client_id';

interface DecodedTokenPayload {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
  exp?: number;
}

function decodeJwtPayload(token: string): DecodedTokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to decode JWT token:', err);
    return null;
  }
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [clientId, setClientId] = useState<string>(() => {
    return (
      localStorage.getItem(STORAGE_KEY_CLIENT_ID) ||
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      ''
    );
  });

  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [configInput, setConfigInput] = useState<string>(clientId);
  const [authError, setAuthError] = useState<string | null>(null);
  const [devKeyInput, setDevKeyInput] = useState<string>(AUTHORIZED_EMAIL);
  const [showDevLogin, setShowDevLogin] = useState<boolean>(false);
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Handle Google Identity Services Credential Callback
  const handleCredentialResponse = useCallback(
    (response: { credential: string }) => {
      setAuthError(null);
      const token = response.credential;
      if (!token) {
        setAuthError('Authentication failed: Received empty credential from Google.');
        return;
      }

      const payload = decodeJwtPayload(token);
      if (!payload || !payload.email) {
        setAuthError('Authentication failed: Could not read email from Google token.');
        return;
      }

      const email = payload.email.toLowerCase().trim();
      if (email !== AUTHORIZED_EMAIL.toLowerCase()) {
        setAuthError(
          `Access Denied: "${payload.email}" is not authorized. Authorized administrator: ${AUTHORIZED_EMAIL}`
        );
        return;
      }

      onLoginSuccess(token, payload.email);
    },
    [onLoginSuccess]
  );

  // Load Google GIS SDK script dynamically
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setScriptLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.warn('Failed to load Google Identity Services SDK script.');
    };
    document.head.appendChild(script);
  }, []);

  // Initialize and render Google Sign-In button
  useEffect(() => {
    if (!scriptLoaded || !clientId.trim() || !window.google?.accounts?.id) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId.trim(),
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 280,
        });
      }
    } catch (err) {
      console.error('Error initializing Google Identity Services:', err);
    }
  }, [scriptLoaded, clientId, handleCredentialResponse]);

  // Save updated Google OAuth Client ID
  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = configInput.trim();
    if (cleanId) {
      localStorage.setItem(STORAGE_KEY_CLIENT_ID, cleanId);
    } else {
      localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
    }
    setClientId(cleanId);
    setIsConfigOpen(false);
    setAuthError(null);
  };

  // Developer Bypass Login
  const handleDevLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const keyEmail = devKeyInput.trim();
    if (!keyEmail) {
      setAuthError('Please enter a valid developer key or email address.');
      return;
    }

    if (keyEmail.toLowerCase() !== AUTHORIZED_EMAIL.toLowerCase()) {
      setAuthError(
        `Access Denied: "${keyEmail}" is not authorized. Authorized administrator: ${AUTHORIZED_EMAIL}`
      );
      return;
    }

    onLoginSuccess(`key:${keyEmail}`, keyEmail);
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#12171c',
        backgroundImage:
          'radial-gradient(circle at 50% 20%, rgba(36, 44, 52, 0.95) 0%, #0d1217 100%)',
        padding: '24px',
        fontFamily: 'var(--font-sans-body, sans-serif)',
        color: '#f5f3eb',
        overflowY: 'auto',
      }}
    >
      {/* Background Decorative Rings */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          border: '1px solid rgba(229, 193, 88, 0.08)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '900px',
          height: '900px',
          border: '1px dashed rgba(229, 193, 88, 0.04)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      {/* Main Login Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'rgba(26, 32, 39, 0.88)',
          border: '1px solid var(--color-glass-border, rgba(212, 175, 55, 0.35))',
          borderRadius: '16px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(229, 193, 88, 0.05)',
          padding: '36px 32px',
          zIndex: 10,
        }}
      >
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(36, 44, 52, 0.8)',
              border: '1.5px solid var(--color-gold-bright, #e5c158)',
              boxShadow: '0 0 16px rgba(229, 193, 88, 0.25)',
              marginBottom: '16px',
            }}
          >
            <ShieldCheck size={28} color="var(--color-gold-bright, #e5c158)" />
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-serif-display, serif)',
              fontSize: '20px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#ffffff',
              fontWeight: 600,
              margin: '0 0 6px 0',
            }}
          >
            TEMPO TELEMETRY
          </h2>
          <p
            style={{
              fontSize: '12px',
              letterSpacing: '0.08em',
              color: 'rgba(255, 255, 255, 0.55)',
              margin: 0,
              textTransform: 'uppercase',
            }}
          >
            Administrator Authentication Gate
          </p>
        </div>

        {/* Error / Access Denied Banner */}
        {authError && (
          <div
            role="alert"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              color: '#fca5a5',
              fontSize: '12px',
              lineHeight: '1.4',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1 }}>{authError}</div>
          </div>
        )}

        {/* Google Sign-In Area */}
        <div style={{ marginBottom: '24px' }}>
          {clientId.trim() ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                ref={googleBtnRef}
                style={{
                  minHeight: '44px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {!scriptLoaded && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      padding: '10px',
                    }}
                  >
                    Loading Google Identity Services...
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  textAlign: 'center',
                }}
              >
                Authorized Account: <span style={{ color: 'var(--color-gold-bright, #e5c158)' }}>{AUTHORIZED_EMAIL}</span>
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'rgba(36, 44, 52, 0.6)',
                border: '1px dashed rgba(229, 193, 88, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <Lock
                size={20}
                style={{ color: 'var(--color-gold-bright, #e5c158)', marginBottom: '8px' }}
              />
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#e5e7eb', marginBottom: '4px' }}>
                Google Client ID Not Configured
              </div>
              <p
                style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: '0 0 12px 0',
                  lineHeight: '1.4',
                }}
              >
                Paste your Google Cloud OAuth 2.0 Web Client ID to enable official Google Sign-In.
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfigInput(clientId);
                  setIsConfigOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(229, 193, 88, 0.15)',
                  border: '1px solid var(--color-gold-bright, #e5c158)',
                  borderRadius: '6px',
                  color: 'var(--color-gold-bright, #e5c158)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <Settings size={14} /> Configure Client ID
              </button>
            </div>
          )}
        </div>

        {/* Divider / Tools */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setConfigInput(clientId);
              setIsConfigOpen(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.55)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: 0,
              fontSize: '11px',
            }}
            title="Configure Google OAuth Client ID"
          >
            <Settings size={13} />
            <span>OAuth Config</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDevLogin(!showDevLogin)}
            style={{
              background: 'none',
              border: 'none',
              color: showDevLogin
                ? 'var(--color-gold-bright, #e5c158)'
                : 'rgba(255, 255, 255, 0.55)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: 0,
              fontSize: '11px',
            }}
            title="Local Developer Key Bypass"
          >
            <Terminal size={13} />
            <span>{showDevLogin ? 'Hide Dev Bypass' : 'Dev Bypass'}</span>
          </button>
        </div>

        {/* Developer Bypass Panel */}
        {showDevLogin && (
          <form
            onSubmit={handleDevLogin}
            style={{
              marginTop: '16px',
              padding: '14px',
              backgroundColor: 'rgba(18, 23, 28, 0.75)',
              border: '1px solid rgba(229, 193, 88, 0.25)',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-gold-bright, #e5c158)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <Key size={13} /> Local Developer Key Login
            </div>
            <p
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.5)',
                margin: '0 0 10px 0',
                lineHeight: '1.3',
              }}
            >
              Direct development bypass sends an authenticated admin key directly for local debugging.
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={devKeyInput}
                onChange={(e) => setDevKeyInput(e.target.value)}
                placeholder="lucasshawn@gmail.com"
                aria-label="Developer Key"
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(36, 44, 52, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  color: '#ffffff',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--color-gold-bright, #e5c158)',
                  color: '#12171c',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0 14px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Client ID Configuration Modal */}
      {isConfigOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#1a2027',
              border: '1px solid var(--color-glass-border, rgba(212, 175, 55, 0.35))',
              borderRadius: '12px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
              padding: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} color="var(--color-gold-bright, #e5c158)" />
                <h3
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#ffffff',
                    fontFamily: 'var(--font-serif-display, serif)',
                    letterSpacing: '0.05em',
                  }}
                >
                  Configure Google Client ID
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClientId}>
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: '1.5',
                  margin: '0 0 14px 0',
                }}
              >
                Enter your Google Cloud OAuth 2.0 Web Client ID. This value is cached locally in your
                browser's <code style={{ color: 'var(--color-gold-bright, #e5c158)' }}>localStorage</code>.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="tempo-client-id-input"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '6px',
                  }}
                >
                  OAuth Client ID
                </label>
                <input
                  id="tempo-client-id-input"
                  type="text"
                  value={configInput}
                  onChange={(e) => setConfigInput(e.target.value)}
                  placeholder="e.g. 1234567890-xxx.apps.googleusercontent.com"
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(36, 44, 52, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Instructions Box */}
              <div
                style={{
                  backgroundColor: 'rgba(36, 44, 52, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '20px',
                  fontSize: '11px',
                  lineHeight: '1.5',
                  color: 'rgba(255, 255, 255, 0.65)',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '4px',
                  }}
                >
                  <HelpCircle size={13} color="var(--color-gold-bright, #e5c158)" />
                  Setup Instructions
                </div>
                <ol style={{ paddingLeft: '18px', margin: 0 }}>
                  <li>Go to Google Cloud Console &gt; APIs &amp; Services &gt; Credentials.</li>
                  <li>Create Credentials &gt; OAuth client ID &gt; Web Application.</li>
                  <li>
                    Add Authorized JavaScript origin:{' '}
                    <code style={{ color: 'var(--color-gold-bright, #e5c158)' }}>{currentOrigin}</code>
                  </li>
                  <li>Paste the generated Client ID above.</li>
                </ol>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--color-gold-bright, #e5c158)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 18px',
                    color: '#12171c',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save &amp; Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
