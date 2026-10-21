  // ══════════════════════════════════════════════════════════════════
  //  ONEHUB SHELL — shared helpers and the reminder form's state
  //  (KeepOne itself was removed; Budget and Reminders live in Track Recorder,
  //  Departments and Employees in Master Desk → Team Masters)
  // ══════════════════════════════════════════════════════════════════

  // ── Data ──────────────────────────────────────────────────────────
  // (ohDepartments, ohEmployees, ohBudgets, ohReminders are declared at the top of app-shell.js
  // to prevent bootstrapping ReferenceErrors)

  // ── Reminder form state (Track Recorder → Reminders) ──────────────
  let _ohReminderFormOpen   = false;
  let _ohReminderEditIndex  = null;
  let _ohRemindersFilter     = 'upcoming';
  let _ohNewReminderType     = 'One Time';
  let _ohNewReminderDueDate  = '';
  let _ohNewReminderLedgerId = '';
  let _ohNewReminderTitle     = '';
  let _ohNewReminderAmount    = '';
  let _ohNewReminderDrCr      = 'Debit';
  let _ohNewReminderAutoJournal   = false;
  let _ohNewReminderDeptId        = '';
  let _ohNewReminderIsBudget      = false;
  let _ohNewReminderNarration     = '';
  let _ohNewReminderOppEntries    = [];
  let _ohNewReminderShowDaysBefore = 7;
  // Track Recorder's reminder popup: journal lines like the Journal Entry screen
  // [{ id, type: 'By' | 'To', particular, amount }]
  let _ohNewReminderJeRows = [];

  // ── HTML-escape helper ────────────────────────────────────────────
  function ohEsc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Data helpers ──────────────────────────────────────────────────
  function ohGetDeptById(id)     { return ohDepartments.find(d => d.id === id); }

  // "Add Reminder" (Track Recorder): open a blank reminder form, or close it
  function ohToggleNewReminderForm() {
    _ohReminderFormOpen = !_ohReminderFormOpen;
    _ohReminderEditIndex = null;
    if (_ohReminderFormOpen) {
      _ohNewReminderType = 'One Time';
      _ohNewReminderDueDate = new Date().toISOString().split('T')[0];
      const ledgers = coaLedgers.filter(l => l.type === 'ledger');
      _ohNewReminderLedgerId = ledgers.length > 0 ? ledgers[0].id : 'general';
      _ohNewReminderTitle = '';
      _ohNewReminderAmount = '';
      _ohNewReminderDrCr = 'Debit';
      _ohNewReminderAutoJournal = false;
      _ohNewReminderDeptId = '';
      _ohNewReminderIsBudget = false;
      _ohNewReminderNarration = '';
      _ohNewReminderOppEntries = [];
      _ohNewReminderShowDaysBefore = 7;
      _ohNewReminderJeRows = [];
    }
    renderOhRemindersView();
  }
