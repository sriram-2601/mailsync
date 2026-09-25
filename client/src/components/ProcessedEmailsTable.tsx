import React, { useState } from 'react';
import { Mail, CalendarCheck, ExternalLink, Trash2, Eye, Calendar, Clock, Sparkles } from 'lucide-react';
import type { ProcessedEmail } from '../types';

interface ProcessedEmailsTableProps {
  emails: ProcessedEmail[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onReviewEmail: (email: ProcessedEmail) => void;
  onDeleteEmail: (emailId: string) => void;
}

export const ProcessedEmailsTable: React.FC<ProcessedEmailsTableProps> = ({
  emails,
  activeFilter,
  onFilterChange,
  onReviewEmail,
  onDeleteEmail
}) => {
  const [selectedEmail, setSelectedEmail] = useState<ProcessedEmail | null>(null);

  const getStatusBadge = (status: ProcessedEmail['status']) => {
    switch (status) {
      case 'EVENT_CREATED':
        return (
          <span className="badge badge-event_created">
            <span className="badge-dot" style={{ background: '#10b981' }} />
            Event Created
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="badge badge-needs_review">
            <span className="badge-dot" />
            Needs Review
          </span>
        );
      case 'ERROR':
        return (
          <span className="badge badge-error">
            <span className="badge-dot" />
            Error
          </span>
        );
      case 'IGNORED':
      default:
        return (
          <span className="badge badge-ignored">
            <span className="badge-dot" />
            Dismissed
          </span>
        );
    }
  };

  const counts = {
    ALL: emails.length,
    EVENT_CREATED: emails.filter(e => e.status === 'EVENT_CREATED').length,
    NEEDS_REVIEW: emails.filter(e => e.status === 'NEEDS_REVIEW').length,
    ERROR: emails.filter(e => e.status === 'ERROR').length,
  };

  const filtered = activeFilter === 'ALL'
    ? emails
    : emails.filter(e => e.status === activeFilter);

  return (
    <div className="card" style={{ marginBottom: '28px' }}>
      <div className="card-header">
        <div className="card-title">
          <Mail className="card-title-icon" size={20} />
          Processed Emails History
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => onFilterChange('ALL')}
        >
          All Emails
          <span className="tab-badge">{counts.ALL}</span>
        </button>
        <button
          className={`tab-btn ${activeFilter === 'EVENT_CREATED' ? 'active' : ''}`}
          onClick={() => onFilterChange('EVENT_CREATED')}
        >
          Events Created
          <span className="tab-badge">{counts.EVENT_CREATED}</span>
        </button>
        <button
          className={`tab-btn ${activeFilter === 'NEEDS_REVIEW' ? 'active' : ''}`}
          onClick={() => onFilterChange('NEEDS_REVIEW')}
        >
          Needs Review
          <span className="tab-badge" style={{ color: counts.NEEDS_REVIEW > 0 ? '#fbbf24' : undefined }}>
            {counts.NEEDS_REVIEW}
          </span>
        </button>
        <button
          className={`tab-btn ${activeFilter === 'ERROR' ? 'active' : ''}`}
          onClick={() => onFilterChange('ERROR')}
        >
          Errors
          <span className="tab-badge">{counts.ERROR}</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Mail className="empty-state-icon" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '4px' }}>
            No emails in this view
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Matching emails from configured senders will appear here once processed.
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Subject & Sender</th>
                <th>Scheduled Date / Time</th>
                <th>Meeting & Calendar</th>
                <th>Idempotency Key</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const ext = item.extractedData;
                return (
                  <tr key={item.id}>
                    <td>{getStatusBadge(item.status)}</td>
                    <td style={{ maxWidth: '320px' }}>
                      <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9rem', marginBottom: '2px', wordBreak: 'break-word' }}>
                        {item.subject || '(No Subject)'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        From: {item.sender}
                      </div>
                      {item.errorMessage && (
                        <div style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '2px' }}>
                          {item.errorMessage}
                        </div>
                      )}
                    </td>
                    <td>
                      {ext && ext.date ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 500, color: '#e2e8f0' }}>
                            <Calendar size={13} color="var(--primary)" />
                            {ext.date}
                          </div>
                          {ext.startTime && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              <Clock size={12} />
                              {ext.startTime} {ext.endTime ? `- ${ext.endTime}` : ''} {ext.timezone || ''}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.calendarEventUrl ? (
                          <a
                            href={item.calendarEventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#38bdf8',
                              textDecoration: 'none',
                              fontSize: '0.82rem',
                              fontWeight: 500
                            }}
                          >
                            <CalendarCheck size={14} color="#10b981" />
                            Open in Google Calendar
                            <ExternalLink size={12} />
                          </a>
                        ) : ext?.meetingUrl ? (
                          <a
                            href={ext.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#a78bfa',
                              textDecoration: 'none',
                              fontSize: '0.8rem'
                            }}
                          >
                            <ExternalLink size={12} /> Meeting Link
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                            {ext?.location || '—'}
                          </span>
                        )}
                        {ext?.confidence !== undefined && (
                          <span style={{ fontSize: '0.72rem', color: ext.confidence >= 0.7 ? '#34d399' : '#fbbf24' }}>
                            Confidence: {Math.round(ext.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.72rem',
                        color: 'var(--text-dim)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        display: 'inline-block'
                      }}>
                        {item.messageId.substring(0, 14)}...
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => setSelectedEmail(item)}
                          title="View Extracted Details"
                        >
                          <Eye size={14} />
                        </button>

                        {item.status === 'NEEDS_REVIEW' && (
                          <button
                            className="btn-icon"
                            style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)' }}
                            onClick={() => onReviewEmail(item)}
                            title="Review and schedule"
                          >
                            <CalendarCheck size={14} />
                          </button>
                        )}

                        <button
                          className="btn-icon"
                          style={{ color: '#f87171' }}
                          onClick={() => {
                            if (window.confirm('Delete this record? It will allow the email to be re-scanned.')) {
                              onDeleteEmail(item.id);
                            }
                          }}
                          title="Delete record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {selectedEmail && (
        <div className="modal-overlay" onClick={() => setSelectedEmail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Sparkles size={20} color="var(--primary)" />
                Email & Extracted Metadata
              </div>
              <button className="modal-close" onClick={() => setSelectedEmail(null)}>✕</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Subject</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                {selectedEmail.subject}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>From: {selectedEmail.sender}</div>
            </div>

            {selectedEmail.extractedData && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#818cf8', marginBottom: '8px' }}>
                  Extracted JSON Fields
                </div>
                <pre style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  color: '#e2e8f0',
                  overflowX: 'auto',
                  maxHeight: '200px'
                }}>
                  {JSON.stringify(selectedEmail.extractedData, null, 2)}
                </pre>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Original Email Body</div>
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                maxHeight: '180px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                color: '#cbd5e1'
              }}>
                {selectedEmail.body || selectedEmail.snippet || '(No content)'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEmail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
