import React, { useState, useEffect } from 'react';
import { X, Sliders, Mail, Tag, Calendar, Clock, Globe } from 'lucide-react';
import type { MonitoringRule, GoogleCalendar } from '../types';

interface RuleModalProps {
  isOpen: boolean;
  ruleToEdit: MonitoringRule | null;
  calendars: GoogleCalendar[];
  onClose: () => void;
  onSaveRule: (ruleData: Partial<MonitoringRule>) => Promise<void>;
}

const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'IST - India Standard Time (Asia/Kolkata)' },
  { value: 'UTC', label: 'UTC - Coordinated Universal Time' },
  { value: 'America/New_York', label: 'EST/EDT - US Eastern Time' },
  { value: 'America/Chicago', label: 'CST/CDT - US Central Time' },
  { value: 'America/Los_Angeles', label: 'PST/PDT - US Pacific Time' },
  { value: 'Europe/London', label: 'GMT/BST - London' },
  { value: 'Europe/Paris', label: 'CET/CEST - Central Europe' },
  { value: 'Asia/Singapore', label: 'SGT - Singapore Time' },
  { value: 'Asia/Tokyo', label: 'JST - Japan Standard Time' }
];

export const RuleModal: React.FC<RuleModalProps> = ({
  isOpen,
  ruleToEdit,
  calendars,
  onClose,
  onSaveRule
}) => {
  const [senderEmail, setSenderEmail] = useState('');
  const [keywords, setKeywords] = useState('');
  const [calendarId, setCalendarId] = useState('primary');
  const [defaultDuration, setDefaultDuration] = useState('45');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ruleToEdit) {
      setSenderEmail(ruleToEdit.senderEmail || '');
      setKeywords(ruleToEdit.keywords || '');
      setCalendarId(ruleToEdit.calendarId || 'primary');
      setDefaultDuration(ruleToEdit.defaultDuration?.toString() || '45');
      setTimezone(ruleToEdit.timezone || 'Asia/Kolkata');
      setIsActive(Boolean(ruleToEdit.isActive));
    } else {
      setSenderEmail('');
      setKeywords('');
      setCalendarId('primary');
      setDefaultDuration('45');
      // detect user local timezone
      try {
        const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (localTz) setTimezone(localTz);
      } catch {
        setTimezone('Asia/Kolkata');
      }
      setIsActive(true);
    }
    setError('');
  }, [ruleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderEmail.trim()) {
      setError('Sender email address is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSaveRule({
        ...(ruleToEdit ? { id: ruleToEdit.id } : {}),
        senderEmail: senderEmail.trim(),
        keywords: keywords.trim(),
        calendarId,
        defaultDuration: parseInt(defaultDuration, 10) || 45,
        timezone,
        isActive
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sliders size={20} color="var(--primary)" />
            {ruleToEdit ? 'Edit Monitoring Rule' : 'New Gmail Monitoring Rule'}
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
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

        <form onSubmit={handleSubmit}>
          {/* Sender Email */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} /> Sender Email Address *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. hr@example.com or @company.com"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              required
            />
            <div className="form-hint">
              The application will automatically watch for new emails arriving from this address or domain.
            </div>
          </div>

          {/* Keywords */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={14} /> Optional Filter Keywords
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Interview, Meeting, Schedule, Demo"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <div className="form-hint">
              Leave blank to process all emails from this sender, or enter keywords that must appear in subject/body.
            </div>
          </div>

          {/* Calendar Selection */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Target Google Calendar
            </label>
            <select
              className="form-select"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
            >
              <option value="primary">Primary Calendar</option>
              {calendars
                .filter(cal => cal.id !== 'primary')
                .map(cal => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary}
                  </option>
                ))}
            </select>
          </div>

          {/* Default Duration & Timezone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Default Duration
              </label>
              <select
                className="form-select"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes (Standard)</option>
                <option value="60">60 minutes (1 hour)</option>
                <option value="90">90 minutes</option>
                <option value="120">2 hours</option>
              </select>
              <div className="form-hint">Used if email doesn't specify end time.</div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={14} /> Default Timezone
              </label>
              <select
                className="form-select"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {COMMON_TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              <div className="form-hint">Fallback timezone for ambiguous times.</div>
            </div>
          </div>

          {/* Rule Active State */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 14px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            margin: '18px 0 24px 0'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>Enable Rule Monitoring</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Inactive rules will not scan Gmail or trigger sync.</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (ruleToEdit ? 'Save Changes' : 'Create Rule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
