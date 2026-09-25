import React from 'react';
import { AlertTriangle, CalendarCheck } from 'lucide-react';
import type { ProcessedEmail } from '../types';

interface NeedsReviewSectionProps {
  emails: ProcessedEmail[];
  onReviewEmail: (email: ProcessedEmail) => void;
}

export const NeedsReviewSection: React.FC<NeedsReviewSectionProps> = ({
  emails,
  onReviewEmail
}) => {
  const needsReviewList = emails.filter(e => e.status === 'NEEDS_REVIEW');

  if (needsReviewList.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{
      marginBottom: '28px',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(17, 24, 39, 0.8) 100%)'
    }}>
      <div className="card-header">
        <div className="card-title" style={{ color: '#fbbf24' }}>
          <AlertTriangle size={20} color="#fbbf24" />
          Emails Requiring Review ({needsReviewList.length})
        </div>
        <span className="badge badge-needs_review">
          <span className="badge-dot" />
          Action Required
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {needsReviewList.map(item => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-md)',
              gap: '16px'
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.95rem' }}>
                  {item.subject || '(No Subject)'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  {item.errorMessage || 'Ambiguous date/time'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span>From: <strong>{item.sender}</strong></span>
                {item.receivedAt && (
                  <span>Received: {new Date(item.receivedAt).toLocaleDateString()}</span>
                )}
                {item.extractedData?.date && (
                  <span>Tentative Date: {item.extractedData.date}</span>
                )}
              </div>
            </div>

            <button
              className="btn btn-primary btn-sm"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                whiteSpace: 'nowrap'
              }}
              onClick={() => onReviewEmail(item)}
            >
              <CalendarCheck size={15} />
              Review & Schedule
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
