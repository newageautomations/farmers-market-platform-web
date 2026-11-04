import { mayCommand } from '@market/admin-core';
import { AppError } from '@market/api';
import { disclosureClassName } from '@market/ui/presentation';
import { FarmstandTable } from '@market/ui/farmstand';
import type { OrderView, VendorService } from './service';
import { CommandForm, TextField, Unavailable, integer } from './common';
import { OrderStatus } from './OrderStatus';

export function OrderOperations({
  service,
  id,
  view,
  refresh,
}: {
  service: VendorService;
  id: string;
  view: OrderView;
  refresh: () => void;
}) {
  const query = { data: view, refresh };
  const canFulfill = mayCommand(service.context, 'FulfillOwnOrders');
  const canCancel = mayCommand(service.context, 'CancelOwnOrders');
  return (
    <div className="order-operations">
      {query.data.portion.kind !== 'IN_PERSON' && (
        <p>
          Operational cancellation does not move money. Refunds and payment
          administration are unavailable here.
        </p>
      )}
      {(canFulfill || canCancel) &&
        query.data.portion.kind !== 'IN_PERSON' &&
        [
          'PaymentSettled',
          'PartiallyShipped',
          'Shipped',
          'PartiallyDelivered',
          'Delivered',
        ].includes(query.data.portion.nativeState) &&
        query.data.portion.lines.map((line) => {
          const remaining = line.remainingQuantity;
          return remaining > 0 ? (
            <details
              key={line.operationalLineId}
              className={disclosureClassName()}
            >
              <summary>Manage {line.variantName}</summary>
              <div className="ui-disclosure-content">
                {canFulfill && (
                  <CommandForm
                    embedded
                    submitClassName="farmstand-button"
                    title="Fulfill quantity"
                    validate={(d) => {
                      if (integer(d.get('quantity')) > remaining)
                        throw new AppError('validation');
                    }}
                    run={(d, operationKey) =>
                      service.fulfill({
                        operationKey,
                        orderId: id,
                        orderLineId: line.operationalLineId,
                        quantity: integer(d.get('quantity')),
                        fulfillmentId: null,
                      })
                    }
                    onDone={query.refresh}
                    submitLabel="Fulfill"
                  >
                    <TextField name="quantity" label="Quantity to fulfill" />
                    <p>Remaining operational quantity: {remaining}.</p>
                  </CommandForm>
                )}
                {canCancel &&
                  (line.fulfilledQuantity === 0 ? (
                    <CommandForm
                      embedded
                      submitClassName="farmstand-button"
                      title="Cancel unfulfilled quantity"
                      submitVariant="destructive-outline"
                      confirm="Cancel this unfulfilled operational quantity? The backend restores eligible allocations. Financial attribution and payments do not change."
                      validate={(d) => {
                        if (integer(d.get('quantity')) > remaining)
                          throw new AppError('validation');
                      }}
                      run={(d, operationKey) =>
                        service.cancelQuantity({
                          operationKey,
                          orderId: id,
                          orderLineId: line.operationalLineId,
                          quantity: integer(d.get('quantity')),
                          fulfillmentId: null,
                        })
                      }
                      onDone={query.refresh}
                      submitLabel="Review cancellation"
                    >
                      <TextField name="quantity" label="Quantity to cancel" />
                    </CommandForm>
                  ) : (
                    <Unavailable>
                      Unfulfilled cancellation on a mixed fulfilled line is not
                      supported by the backend. Fulfillment cancellation is a
                      separate command.
                    </Unavailable>
                  ))}
              </div>
            </details>
          ) : null;
        })}
      <FarmstandTable
        label="Existing fulfillments"
        headings={['Fulfillment', 'State', 'Lines', 'Actions']}
      >
        {query.data.portion.fulfillments.map((f) => (
          <tr key={f.id}>
            <th scope="row">Fulfillment {f.id}</th>
            <td>
              <OrderStatus domain="fulfillment" value={f.state} />
            </td>
            <td>{f.lines.map((l) => `${l.quantity} units`).join(', ')}</td>
            <td>
              {(canFulfill || canCancel) &&
                f.state !== 'Cancelled' &&
                f.lines.length === 1 && (
                  <CommandForm
                    embedded
                    submitClassName="farmstand-button"
                    title="Cancel fulfillment"
                    submitSize="compact"
                    hideTitle
                    submitVariant="destructive-outline"
                    confirm="Cancel this existing fulfillment? Eligible sold stock restoration is backend controlled. This is not a financial refund."
                    run={(_d, operationKey) =>
                      service.cancelFulfillment({
                        operationKey,
                        orderId: id,
                        orderLineId: null,
                        quantity: null,
                        fulfillmentId: f.id,
                      })
                    }
                    onDone={query.refresh}
                    submitLabel="Cancel fulfillment"
                  >
                    <span className="sr-only">
                      Cancel the entire selected fulfillment.
                    </span>
                  </CommandForm>
                )}
            </td>
          </tr>
        ))}
      </FarmstandTable>
    </div>
  );
}
