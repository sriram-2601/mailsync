import React, { useState } from 'react';
import { X, Sparkles, Play, CalendarCheck, Clock, MapPin, Link2, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { ExtractedMeetingData } from '../types';

interface TestParserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_INTERVIEW = {
  subject: "Interview Scheduled – Software Engineer",
  body: `Hi Sriram,

Your interview has been scheduled for September 30, 2026 at 11:00 AM IST.
Duration: 45 minutes
Location: Online
Google Meet: https://meet.google.com/example

Regards,
HR Team`
};

const SAMPLE_AMBIGUOUS = {
  subject: "Weekly sync meeting discussion",
  body: `Hey Sriram,

Could we catch up sometime next Tuesday or Wednesday afternoon? Let me know which day works best for you and I'll send over an invite.

Thanks,
Alex`
};

export const TestParserModal: React.FC<TestParserModalProps> = ({ isOpen, onClose }) => {
  const [subject, setSubject] = useState(SAMPLE_INTERVIEW.subject);
  const [body, setBody] = useState(SAMPLE_INTERVIEW.body);
  const [defaultDuration, setDefaultDuration] = useState('45');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExtractedMeetingData | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRunParser = async () => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/sync/test-parser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          defaultDuration: parseInt(defaultDuration, 10) || 45,
          timezone
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to parse');
      setResult(data.extracted);
    } catch (err: any) {
      setError(err.message || 'Parser test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSample = (sample: typeof SAMPLE_INTERVIEW) => {
    setSubject(sample.subject);
    setBody(sample.body);
    setResult(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles size={22} color="var(--primary)" />
            AI Email Parser & Extraction Playground
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Test the dual extraction engine on any email text to inspect extracted fields, confidence scores, and calendar previews.
        </p>

        {/* Preset Sample Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadSample(SAMPLE_INTERVIEW)}
          >
            Load HR Interview Sample
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadSample(SAMPLE_AMBIGUOUS)}
          >
            Load Ambiguous Sample (Needs Review)
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">Email Subject</label>
          <input
            type="text"
            className="form-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email Body</label>
          <textarea
            className="form-textarea"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} /> Default Duration
            </label>
            <select
              className="form-select"
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(e.target.value)}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Timezone</label>
            <input
              type="text"
              className="form-input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRunParser}
            disabled={isLoading}
          >
            <Play size={16} />
            {isLoading ? 'Extracting Scheduling Info...' : 'Run Extraction'}
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {/* Results display */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Confidence & Status Card */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              background: result.confidence >= 0.70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${result.confidence >= 0.70 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}>
              <div>
                <div style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: result.confidence >= 0.70 ? '#34d399' : '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {result.confidence >= 0.70 ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                  {result.confidence >= 0.70 ? 'High Confidence — Auto Schedule' : 'Low Confidence — Needs Review'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '2px' }}>
                  {result.isAmbiguous ? (result.ambiguityReason || 'Requires user verification') : 'All required date and time fields identified.'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: result.confidence >= 0.70 ? '#34d399' : '#fbbf24'
                }}>
                  {Math.round(result.confidence * 100)}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Confidence</div>
              </div>
            </div>

            {/* Simulated Google Calendar Preview */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Google Calendar Event Preview
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                {result.eventTitle || 'Untitled Event'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarCheck size={14} color="var(--primary)" />
                  <span><strong>Date:</strong> {result.date || 'Not detected'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="var(--primary)" />
                  <span><strong>Time:</strong> {result.startTime || 'Not detected'} {result.endTime ? `- ${result.endTime}` : ''} ({result.timezone})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="var(--primary)" />
                  <span><strong>Location:</strong> {result.location || 'None'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link2 size={14} color="var(--primary)" />
                  <span><strong>Meeting Link:</strong> {result.meetingUrl ? (
                    <a href={result.meetingUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>{result.meetingUrl}</a>
                  ) : 'None'}</span>
                </div>
              </div>
            </div>

            {/* Raw JSON */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Raw Extracted JSON
              </div>
              <pre style={{
                background: '#090d16',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                color: '#34d399',
                maxHeight: '180px',
                overflowY: 'auto'
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
