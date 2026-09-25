import React from 'react';
import { X, HelpCircle, ExternalLink, Check, Copy } from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState('');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const redirectUri = 'http://localhost:5000/api/auth/callback';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <HelpCircle size={22} color="var(--primary)" />
            Google Cloud Console OAuth 2.0 Setup Guide
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Step 1 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Step 1: Create a Google Cloud Project & Enable APIs
            </div>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>
                Open the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Google Cloud Console <ExternalLink size={12} style={{ display: 'inline' }} /></a>.
              </li>
              <li>Create a new project (e.g. <strong>MailCal-Sync</strong>).</li>
              <li>Go to <strong>APIs & Services &gt; Library</strong>.</li>
              <li>Search and enable both:
                <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                  <li><strong>Gmail API</strong></li>
                  <li><strong>Google Calendar API</strong></li>
                </ul>
              </li>
            </ol>
          </div>

          {/* Step 2 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Step 2: Configure OAuth Consent Screen
            </div>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Go to <strong>APIs & Services &gt; OAuth consent screen</strong>.</li>
              <li>Select <strong>External</strong> user type and click <strong>Create</strong>.</li>
              <li>Fill in App name (e.g. <em>MailCal Sync</em>) and your email.</li>
              <li>Under <strong>Test users</strong>, add your personal Gmail address (e.g. your email address).</li>
              <li>Save and continue.</li>
            </ol>
          </div>

          {/* Step 3 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Step 3: Create OAuth 2.0 Client Credentials
            </div>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Go to <strong>APIs & Services &gt; Credentials</strong>.</li>
              <li>Click <strong>+ Create Credentials &gt; OAuth client ID</strong>.</li>
              <li>Choose Application type: <strong>Web application</strong>.</li>
              <li>Under <strong>Authorized redirect URIs</strong>, click <strong>+ Add URI</strong> and enter:</li>
            </ol>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#090d16',
              padding: '8px 12px',
              borderRadius: '6px',
              margin: '10px 0',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              color: '#34d399'
            }}>
              <span>{redirectUri}</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => copyToClipboard(redirectUri, 'uri')}
              >
                {copied === 'uri' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                {copied === 'uri' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div>
              <li>Click <strong>Create</strong> and copy your <strong>Client ID</strong> and <strong>Client Secret</strong>.</li>
            </div>
          </div>

          {/* Step 4 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Step 4: Save in your <code>.env</code> file
            </div>
            <p style={{ marginBottom: '8px', fontSize: '0.82rem' }}>
              Open or create <code>.env</code> in the project root:
            </p>
            <pre style={{
              background: '#090d16',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: '#cbd5e1'
            }}>
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
            </pre>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Got it, Let's Connect!
          </button>
        </div>
      </div>
    </div>
  );
};
