import { Button, Select } from '@market/ui';
import { StatusBadge } from '../presentation';
import { useState } from 'react';
import type {
  BoothInvoice,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import { Entry, Control, moneyLabel } from './common';
import { InvoiceTable } from './InvoiceTable';
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
      {data.billingSummary && (
        <div className="ops-summary">
          <dl className="ui-kpi-grid" aria-label="Invoice summary">
            <div>
              <dt>Paid invoices</dt>
              <dd>{data.billingSummary.paid}</dd>
            </div>
            <div>
              <dt>Open invoices</dt>
              <dd>{data.billingSummary.open}</dd>
            </div>
            <div>
              <dt>Past due invoices</dt>
              <dd>{data.billingSummary.pastDue}</dd>
            </div>
            <div>
              <dt>Complimentary invoices</dt>
              <dd>{data.billingSummary.complimentary}</dd>
            </div>
          </dl>
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
      <h2 className="ui-section-title-dashboard">
        Invoice {i.id} · {i.recipientSnapshot.businessName}
      </h2>
      <p>
        <StatusBadge>{i.billingStatus ?? i.status}</StatusBadge>
      </p>
      <InvoiceTable>
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
      </InvoiceTable>
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
          <Button type="submit" variant="primary" size="compact">
            Issue manual invoice
          </Button>
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
                <Select
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
                </Select>
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
            <Entry
              label="Payment note"
              maxLength={2000}
              value={note}
              onChange={setNote}
            />
            <Button type="submit" variant="primary" size="compact">
              Record manual payment
            </Button>
          </form>
          {i.paidMinor === 0 && (
            <Button
              variant="destructive"
              size="compact"
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
            </Button>
          )}
        </>
      )}
    </section>
  );
}
