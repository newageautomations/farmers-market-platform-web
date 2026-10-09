import { useState } from 'react';
import type {
  BoothInvoice,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import { Entry, Control, moneyLabel } from './common';
export function Billing({
  data,
  run,
  canManage,
}: {
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
}) {
  return (
    <>
      <p>Online invoicing not configured</p>
      <button type="button" disabled>
        Send online invoice
      </button>
      {data.billingSummary && (
        <div className="ops-summary">
          <p>
            {data.billingSummary.paid} paid · {data.billingSummary.open} open ·{' '}
            {data.billingSummary.pastDue} past due ·{' '}
            {data.billingSummary.complimentary} complimentary
          </p>
          {Object.entries(data.billingSummary.byCurrency).map(
            ([currency, s]) => (
              <p key={currency}>
                Expected {moneyLabel(s.expectedMinor, currency)} · Collected{' '}
                {moneyLabel(s.collectedMinor, currency)} · Waived{' '}
                {moneyLabel(s.waivedMinor, currency)} · Outstanding{' '}
                {moneyLabel(s.outstandingMinor, currency)}
              </p>
            ),
          )}
        </div>
      )}
      {data.invoices?.map((invoice) => (
        <Invoice
          key={`${invoice.id}:${invoice.revision}`}
          invoice={invoice}
          run={run}
          canManage={canManage}
        />
      ))}
    </>
  );
}
export function Invoice({
  invoice: i,
  run,
  canManage,
}: {
  invoice: BoothInvoice;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
}) {
  const [method, setMethod] = useState('CASH'),
    [amount, setAmount] = useState(i.totalMinor - i.paidMinor),
    [note, setNote] = useState(''),
    [dueAt, setDueAt] = useState(''),
    [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16)),
    [key] = useState(() => crypto.randomUUID());
  return (
    <section className="ops-invoice" aria-label={`Invoice ${i.id}`}>
      <h2>
        Invoice {i.id} · {i.recipientSnapshot.businessName}
      </h2>
      <p>{(i.billingStatus ?? i.status).toLowerCase().replaceAll('_', ' ')}</p>
      <table>
        <caption>Invoice line items</caption>
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col">Quantity</th>
            <th scope="col">Unit price</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {i.lines.map((line, index) => (
            <tr key={index}>
              <td>{line.description}</td>
              <td>{line.quantity}</td>
              <td>{moneyLabel(line.unitMinor, line.currency)}</td>
              <td>{moneyLabel(line.lineMinor, line.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Total {moneyLabel(i.totalMinor, i.currency)} · Settled{' '}
        {moneyLabel(i.paidMinor, i.currency)} · Outstanding{' '}
        {moneyLabel(i.totalMinor - i.paidMinor, i.currency)}
      </p>
      {canManage && i.status === 'DRAFT' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            return run({
              action: 'ISSUE_INVOICE',
              id: i.id,
              expectedRevision: i.revision,
              data: {
                online: false,
                dueAt: dueAt ? new Date(dueAt).toISOString() : null,
              },
            });
          }}
        >
          <Entry
            label="Due date, optional"
            type="date"
            value={dueAt}
            onChange={setDueAt}
          />
          <button>Issue manual invoice</button>
        </form>
      )}
      {canManage && i.status === 'OPEN' && (
        <>
          <form
            className="ops-payment"
            onSubmit={(e) => {
              e.preventDefault();
              return run({
                action: 'RECORD_PAYMENT',
                id: i.id,
                expectedRevision: i.revision,
                data: {
                  idempotencyKey: key,
                  amountMinor: amount,
                  method,
                  note,
                  paidAt: new Date(paidAt + 'Z').toISOString(),
                },
              });
            }}
          >
            <Control label="Payment method">
              {(id) => (
                <select
                  id={id}
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {[
                    'CASH',
                    'CHECK',
                    'EXTERNAL',
                    'COMPLIMENTARY',
                    'WAIVED',
                    'OTHER',
                  ].map((m) => (
                    <option key={m} value={m}>
                      {m.toLowerCase()}
                    </option>
                  ))}
                </select>
              )}
            </Control>
            <Entry
              label="Amount in minor units"
              type="number"
              min={1}
              max={i.totalMinor - i.paidMinor}
              step={1}
              value={amount}
              onChange={(v) => setAmount(Number(v))}
            />
            <Entry
              label="Payment date and time (UTC)"
              type="datetime-local"
              value={paidAt}
              onChange={setPaidAt}
              required
            />
            <Entry label="Payment note" value={note} onChange={setNote} />
            <button>Record manual payment</button>
          </form>
          {i.paidMinor === 0 && (
            <button
              type="button"
              onClick={() =>
                run({
                  action: 'VOID_REISSUE',
                  id: i.id,
                  expectedRevision: i.revision,
                  data: {},
                })
              }
            >
              Void unpaid invoice and create replacement
            </button>
          )}
        </>
      )}
    </section>
  );
}
