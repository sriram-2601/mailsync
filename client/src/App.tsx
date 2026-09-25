import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { GoogleAccountCard } from './components/GoogleAccountCard';
import { AutomationControl } from './components/AutomationControl';
import { RulesManager } from './components/RulesManager';
import { RuleModal } from './components/RuleModal';
import { NeedsReviewSection } from './components/NeedsReviewSection';
import { ReviewEmailModal } from './components/ReviewEmailModal';
import { ProcessedEmailsTable } from './components/ProcessedEmailsTable';
import { ActivityLogs } from './components/ActivityLogs';
import { TestParserModal } from './components/TestParserModal';
import { SetupGuideModal } from './components/SetupGuideModal';
import type {
  AuthStatus,
  SyncStats,
  MonitoringRule,
  GoogleCalendar,
  AutomationSettings,
  ProcessedEmail,
  ActivityLog
} from './types';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const App: React.FC = () => {
  // State
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [stats, setStats] = useState<SyncStats>({
    totalProcessed: 0,
    eventsCreated: 0,
    needsReview: 0,
    errors: 0,
    activeRules: 0
  });
  const [rules, setRules] = useState<MonitoringRule[]>([]);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [emails, setEmails] = useState<ProcessedEmail[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Modals & UI states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingGmail, setIsCheckingGmail] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<MonitoringRule | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [emailToReview, setEmailToReview] = useState<ProcessedEmail | null>(null);
  const [testParserOpen, setTestParserOpen] = useState(false);
  const [setupGuideOpen, setSetupGuideOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // Fetch Auth & System Status
  const loadAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        setAuthStatus(data);
      }
    } catch {
      // Backend may be starting
    }
  }, []);

  // Fetch Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/emails/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  }, []);

  // Fetch Rules
  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch {}
  }, []);

  // Fetch Calendars
  const loadCalendars = useCallback(async () => {
    try {
      const res = await fetch('/api/calendars');
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars || []);
      }
    } catch {}
  }, []);

  // Fetch Settings
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/status');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || null);
      }
    } catch {}
  }, []);

  // Fetch Processed Emails
  const loadEmails = useCallback(async () => {
    try {
      const res = await fetch('/api/emails?limit=100');
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch {}
  }, []);

  // Fetch Activity Logs
  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs?limit=50');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {}
  }, []);

  // Refresh all dashboard data
  const handleRefreshAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      await Promise.allSettled([
        loadAuthStatus(),
        loadStats(),
        loadRules(),
        loadCalendars(),
        loadSettings(),
        loadEmails(),
        loadLogs()
      ]);
      showToast('Dashboard refreshed with latest data', 'info');
    } finally {
      setIsSyncing(false);
    }
  }, [loadAuthStatus, loadStats, loadRules, loadCalendars, loadSettings, loadEmails, loadLogs, showToast]);

  // Initial load and URL auth param check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      showToast('Google Account successfully connected! Ready to schedule.', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error')) {
      showToast(`Authentication notice: ${decodeURIComponent(params.get('error')!)}`, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    handleRefreshAll();

    // Polling refresh for dashboard updates every 20 seconds
    const interval = setInterval(() => {
      loadStats();
      loadEmails();
      loadLogs();
      loadSettings();
    }, 20000);

    return () => clearInterval(interval);
  }, [handleRefreshAll, loadStats, loadEmails, loadLogs, loadSettings, showToast]);

  // Connect Google Account
  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to get auth URL');
      window.location.href = data.url;
    } catch (err: any) {
      showToast(err.message || 'Failed to start Google sign-in', 'error');
    }
  };

  // Disconnect Google Account
  const handleDisconnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/disconnect', { method: 'POST' });
      if (res.ok) {
        showToast('Google Account disconnected', 'info');
        handleRefreshAll();
      }
    } catch {
      showToast('Failed to disconnect Google Account', 'error');
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      showToast('Logged out of local session', 'info');
      handleRefreshAll();
    } catch {
      showToast('Failed to logout', 'error');
    }
  };

  // Toggle Automation ON / OFF
  const handleToggleAutomation = async (active: boolean) => {
    try {
      const res = await fetch('/api/sync/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAutomationActive: active })
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        showToast(`Automation ${active ? 'Enabled' : 'Paused'}`, active ? 'success' : 'info');
      }
    } catch {
      showToast('Failed to update automation state', 'error');
    }
  };

  // Check Gmail Now manual trigger
  const handleCheckGmailNow = async () => {
    setIsCheckingGmail(true);
    try {
      const res = await fetch('/api/sync/check-now', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sync failed');
      showToast(data.message || 'Gmail sync completed', 'success');
      await Promise.all([loadStats(), loadEmails(), loadLogs(), loadSettings()]);
    } catch (err: any) {
      showToast(err.message || 'Check Gmail failed', 'error');
    } finally {
      setIsCheckingGmail(false);
    }
  };

  // Update default calendar
  const handleUpdateDefaultCalendar = async (calendarId: string) => {
    try {
      const res = await fetch('/api/sync/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultCalendarId: calendarId })
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        showToast('Default target calendar updated', 'success');
      }
    } catch {
      showToast('Failed to update target calendar', 'error');
    }
  };

  // Save Rule (Add or Edit)
  const handleSaveRule = async (ruleData: Partial<MonitoringRule>) => {
    const isEdit = Boolean(ruleData.id);
    const url = isEdit ? `/api/rules/${ruleData.id}` : '/api/rules';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Failed to save rule');

    showToast(isEdit ? 'Rule updated successfully' : 'Monitoring rule created', 'success');
    await loadRules();
    await loadStats();
  };

  // Toggle Rule Active State
  const handleToggleRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/rules/${ruleId}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        await loadRules();
        await loadStats();
      }
    } catch {
      showToast('Failed to toggle rule state', 'error');
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/rules/${ruleId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Rule deleted', 'info');
        await loadRules();
        await loadStats();
      }
    } catch {
      showToast('Failed to delete rule', 'error');
    }
  };

  // Approve & Schedule from Needs Review
  const handleApproveAndSchedule = async (emailId: string, eventData: any) => {
    const res = await fetch(`/api/emails/${emailId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Failed to create event');

    showToast('Calendar event created successfully in Google Calendar!', 'success');
    await Promise.all([loadStats(), loadEmails(), loadLogs()]);
  };

  // Dismiss Email
  const handleDismissEmail = async (emailId: string) => {
    const res = await fetch(`/api/emails/${emailId}/dismiss`, { method: 'POST' });
    if (res.ok) {
      showToast('Email marked as dismissed', 'info');
      await Promise.all([loadStats(), loadEmails()]);
    }
  };

  // Delete Email Record
  const handleDeleteEmail = async (emailId: string) => {
    const res = await fetch(`/api/emails/${emailId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Email record deleted. Can be re-scanned on next check.', 'info');
      await Promise.all([loadStats(), loadEmails()]);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    if (window.confirm('Clear all system activity logs?')) {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      if (res.ok) {
        showToast('Logs cleared', 'info');
        await loadLogs();
      }
    }
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <Header
        authStatus={authStatus}
        isSyncing={isSyncing}
        onRefreshAll={handleRefreshAll}
        onOpenTestParser={() => setTestParserOpen(true)}
        onOpenSetupGuide={() => setSetupGuideOpen(true)}
      />

      {/* Stats Overview */}
      <StatsOverview
        stats={stats}
        onFilterTab={(tab) => setActiveFilter(tab)}
      />

      {/* Top Configuration & Control Grid */}
      <div className="dashboard-top-grid">
        <GoogleAccountCard
          authStatus={authStatus}
          calendars={calendars}
          settings={settings}
          onConnectGoogle={handleConnectGoogle}
          onDisconnectGoogle={handleDisconnectGoogle}
          onLogout={handleLogout}
          onUpdateDefaultCalendar={handleUpdateDefaultCalendar}
          onOpenSetupGuide={() => setSetupGuideOpen(true)}
        />

        <AutomationControl
          settings={settings}
          isChecking={isCheckingGmail}
          onToggleAutomation={handleToggleAutomation}
          onCheckGmailNow={handleCheckGmailNow}
        />
      </div>

      {/* Needs Review Alert Banner Section */}
      <NeedsReviewSection
        emails={emails}
        onReviewEmail={(email) => {
          setEmailToReview(email);
          setReviewModalOpen(true);
        }}
      />

      {/* Sender Monitoring Rules Manager */}
      <RulesManager
        rules={rules}
        onAddNewRule={() => {
          setRuleToEdit(null);
          setRuleModalOpen(true);
        }}
        onEditRule={(rule) => {
          setRuleToEdit(rule);
          setRuleModalOpen(true);
        }}
        onDeleteRule={handleDeleteRule}
        onToggleRule={handleToggleRule}
      />

      {/* Processed Emails History Table */}
      <ProcessedEmailsTable
        emails={emails}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onReviewEmail={(email) => {
          setEmailToReview(email);
          setReviewModalOpen(true);
        }}
        onDeleteEmail={handleDeleteEmail}
      />

      {/* System Activity & Error Logs */}
      <ActivityLogs
        logs={logs}
        onClearLogs={handleClearLogs}
        onRefreshLogs={loadLogs}
      />

      {/* Modals */}
      <RuleModal
        isOpen={ruleModalOpen}
        ruleToEdit={ruleToEdit}
        calendars={calendars}
        onClose={() => setRuleModalOpen(false)}
        onSaveRule={handleSaveRule}
      />

      <ReviewEmailModal
        isOpen={reviewModalOpen}
        email={emailToReview}
        calendars={calendars}
        onClose={() => {
          setReviewModalOpen(false);
          setEmailToReview(null);
        }}
        onApproveAndSchedule={handleApproveAndSchedule}
        onDismiss={handleDismissEmail}
      />

      <TestParserModal
        isOpen={testParserOpen}
        onClose={() => setTestParserOpen(false)}
      />

      <SetupGuideModal
        isOpen={setupGuideOpen}
        onClose={() => setSetupGuideOpen(false)}
      />

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};
export default App;
