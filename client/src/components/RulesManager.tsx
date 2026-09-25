import React from 'react';
import { Sliders, Plus, Edit2, Trash2, Mail, Tag, Calendar, Clock, Globe } from 'lucide-react';
import type { MonitoringRule } from '../types';

interface RulesManagerProps {
  rules: MonitoringRule[];
  onAddNewRule: () => void;
  onEditRule: (rule: MonitoringRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule: (ruleId: string) => void;
}

export const RulesManager: React.FC<RulesManagerProps> = ({
  rules,
  onAddNewRule,
  onEditRule,
  onDeleteRule,
  onToggleRule
}) => {
  return (
    <div className="card" style={{ marginBottom: '28px' }}>
      <div className="card-header">
        <div className="card-title">
          <Sliders className="card-title-icon" size={20} />
          Sender Monitoring Rules ({rules.length})
        </div>
        <button className="btn btn-primary btn-sm" onClick={onAddNewRule}>
          <Plus size={16} />
          Add Sender Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="empty-state">
          <Mail className="empty-state-icon" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '6px' }}>
            No Monitoring Rules Configured
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 18px auto' }}>
            Add a sender rule (e.g. <code>hr@example.com</code>) to tell MailCal which incoming emails to scan and convert into Google Calendar events.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={onAddNewRule}>
            <Plus size={15} /> Create First Rule
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sender to Monitor</th>
                <th>Filter Keywords</th>
                <th>Target Calendar</th>
                <th>Duration</th>
                <th>Timezone</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const isActive = Boolean(rule.isActive);
                return (
                  <tr key={rule.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <Mail size={15} color="var(--primary)" />
                        <span>{rule.senderEmail}</span>
                      </div>
                    </td>
                    <td>
                      {rule.keywords ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          color: '#cbd5e1'
                        }}>
                          <Tag size={12} /> {rule.keywords}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                          Any email
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}>
                        <Calendar size={13} color="var(--text-dim)" />
                        {rule.calendarId === 'primary' ? 'Primary' : rule.calendarId}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}>
                        <Clock size={13} color="var(--text-dim)" />
                        {rule.defaultDuration}m
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}>
                        <Globe size={13} color="var(--text-dim)" />
                        {rule.timezone}
                      </span>
                    </td>
                    <td>
                      <label className="switch" style={{ width: 38, height: 20 }}>
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => onToggleRule(rule.id)}
                        />
                        <span className="slider" style={{ borderRadius: 20 }} />
                      </label>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => onEditRule(rule)}
                          title="Edit rule"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ color: '#f87171' }}
                          onClick={() => {
                            if (window.confirm(`Delete rule for "${rule.senderEmail}"?`)) {
                              onDeleteRule(rule.id);
                            }
                          }}
                          title="Delete rule"
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
    </div>
  );
};
