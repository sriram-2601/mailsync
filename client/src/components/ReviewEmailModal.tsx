import React, { useState, useEffect } from 'react';
import { X, CalendarCheck, AlertTriangle, Calendar, Clock, MapPin, Link2, FileText, Ban } from 'lucide-react';
import type { ProcessedEmail, GoogleCalendar } from '../types';

interface ReviewEmailModalProps {
  isOpen: boolean;
  email: ProcessedEmail | null;
  calendars: GoogleCalendar[];
  onClose: () => void;
  onApproveAndSchedule: (emailId: string, eventData: any) => Promise<void>;
  onDismiss: (emailId: string) => Promise<void>;
}

export const ReviewEmailModal: React.FC<ReviewEmailModalProps> = ({
  isOpen,
  email,
  calendars,
  onClose,
  onApproveAndSchedule,
  onDismiss
}) => {
  const [eventTitle, setEventTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [description, setDescription] = useState('');
  const [calendarId, setCalendarId] = useState('primary');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (email) {
      const ext = email.extractedData || {} as any;
      setEventTitle(ext.eventTitle || email.subject || '');
      setDate(ext.date || '');
      setStartTime(ext.startTime || '');
      setEndTime(ext.endTime || '');
      setDurationMinutes(ext.durationMinutes || 45);
      setTimezone(ext.timezone || 'Asia/Kolkata');
      setLocation(ext.location || '');
      setMeetingUrl(ext.meetingUrl || '');
      setDescription(ext.description || email.snippet || '');
      setCalendarId('primary');
    }
    setError('');
  }, [email, isOpen]);

  if (!isOpen || !email) return null;

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError('Please specify an event date.');
      return;
    }
    if (!startTime) {
      setError('Please specify a start time.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onApproveAndSchedule(email.id, {
        eventTitle: eventTitle || email.subject,
        date,
        startTime,
        endTime: endTime || startTime,
        durationMinutes,
        timezone,
        location: location || (meetingUrl ? 'Online' : ''),
        meetingUrl,
        description,
        calendarId
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create Google Calendar event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (window.confirm('Dismiss this email? It will be marked as ignored and not scheduled.')) {
      setIsSubmitting(true);
      try {
        await onDismiss(email.id);
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <CalendarCheck size={22} color="#fbbf24" />
            Review & Schedule Calendar Event
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Ambiguity Reason Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#fbbf24',
          fontSize: '0.85rem'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Flagged for Review:</strong> {email.errorMessage || 'Date or time was ambiguous or incomplete.'}
            <div style={{ fontSize: '0.78rem', color: '#fef3c7', marginTop: '2px' }}>
              Confirm or adjust the scheduling details below to create the Google Calendar event.
            </div>
          </div>
        </div>

        {/* Original Email Card Preview */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          marginBottom: '20px',
          fontSize: '0.82rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>From: <strong>{email.sender}</strong></span>
            <span style={{ color: 'var(--text-dim)' }}>{email.receivedAt ? new Date(email.receivedAt).toLocaleDateString() : ''}</span>
          </div>
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
            {email.subject}
          </div>
          <div style={{
            color: 'var(--text-muted)',
            maxHeight: '100px',
            overflowY: 'auto',
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '8px 10px',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-sans)'
          }}>
            {email.body || email.snippet || '(No body content)'}
          </div>
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

        <form onSubmit={handleApprove}>
          <div className="form-group">
            <label className="form-label">Event Title *</label>
            <input
              type="text"
              className="form-input"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} /> Date *
              </label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> Start Time *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 11:00 AM"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> End Time
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 11:45 AM"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Timezone</label>
              <input
                type="text"
                className="form-input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Google Calendar</label>
              <select
                className="form-select"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
              >
                <option value="primary">Primary Calendar</option>
                {calendars.filter(c => c.id !== 'primary').map(c => (
                  <option key={c.id} value={c.id}>{c.summary}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} /> Location
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Online or Conference Room"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Link2 size={13} /> Meeting URL
              </label>
              <input
                type="url"
                className="form-input"
                placeholder="https://meet.google.com/..."
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={13} /> Description / Agenda Notes
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleDismiss}
              disabled={isSubmitting}
            >
              <Ban size={15} />
              Dismiss Email
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
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
                className="btn btn-success"
                disabled={isSubmitting}
              >
                <CalendarCheck size={16} />
                {isSubmitting ? 'Creating Event...' : 'Approve & Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
