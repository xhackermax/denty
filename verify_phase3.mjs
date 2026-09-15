import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const root = new URL('.', import.meta.url);
const app = readFileSync(new URL('./app.js', root), 'utf8');
const css = [
  readFileSync(new URL('./styles.css', root), 'utf8'),
  existsSync(new URL('./phase1.css', root)) ? readFileSync(new URL('./phase1.css', root), 'utf8') : '',
  existsSync(new URL('./phase2.css', root)) ? readFileSync(new URL('./phase2.css', root), 'utf8') : '',
  existsSync(new URL('./phase3.css', root)) ? readFileSync(new URL('./phase3.css', root), 'utf8') : ''
].join('\n');
const checks = [
  ['jobs dashboard renderer exists', app.includes('renderJobsDashboard')],
  ['finances dashboard renderer exists', app.includes('renderFinancesDashboard')],
  ['budget rows calculate paid and pending', app.includes('budgetFinancialRows') && app.includes('paidAmountForBudget')],
  ['lab workflow statuses exist', app.includes('lab-status-flow') && app.includes('data-work-status')],
  ['budget creation uses catalog procedures', app.includes('openBudgetModal') && app.includes('procedure_id')],
  ['payment creation links to budget', app.includes('openPaymentModal') && app.includes('budget_id')],
  ['planning phase summary exists', app.includes('renderPlanPhaseSummary')],
  ['phase 3 CSS loaded', css.includes('.phase3-dashboard')],
  ['CSS styles finance and lab panels', css.includes('.finance-ledger') && css.includes('.lab-kanban')],
];
for (const [name, ok] of checks) assert.ok(ok, name);
console.log(`${checks.length}/${checks.length} phase 3 checks passed`);
