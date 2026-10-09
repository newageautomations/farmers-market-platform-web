import { useCallback, useState } from 'react';
import { mayCommand } from '@market/admin-core';
import { Button, Dialog, Pagination } from '@market/ui';
import type { InventoryPage } from '@market/api';
import type { VendorService } from './service';
import {
  CommandForm,
  DataTable,
  ReadState,
  TextField,
  date,
  integer,
  useRead,
} from './common';

export function Inventory({ service }: { service: VendorService }) {
  const [cursor, setCursor] = useState<string | null>(null),
    [previous, setPrevious] = useState<(string | null)[]>([]);
  const [selected, setSelected] = useState<
      InventoryPage['items'][number] | null
    >(null),
    [mode, setMode] = useState<'restock' | 'adjust'>('restock');
  const [pending, setPending] = useState(false);
  const read = useCallback(
    () => service.inventory(service.vendorId, cursor),
    [service, cursor],
  );
  const query = useRead(`inventory:${cursor}`, read);
  const can = mayCommand(service.context, 'ManageOwnInventory');
  return (
    <>
      <p>
        Physical stock and allocations come from the backend. Free stock
        includes live checkout holds.
      </p>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <>
          <p>
            {query.data.totalItems} owned inventory records. Current physical
            inventory as of {date(query.data.asOf)} (UTC).
          </p>
          <DataTable
            label="Current physical inventory"
            headings={[
              'Product and variant',
              'SKU',
              'On hand',
              'Allocated',
              'Physical free',
              'Actions',
            ]}
          >
            {query.data.items.map((row) => (
              <tr key={row.variantId}>
                <th scope="row">
                  {row.productName}
                  <small>{row.variantName}</small>
                </th>
                <td>{row.sku}</td>
                <td>{row.stockOnHand}</td>
                <td>{row.stockAllocated}</td>
                <td>{row.physicalFree}</td>
                <td>
                  {can && (
                    <div className="actions">
                      <Button
                        onClick={() => {
                          setSelected(row);
                          setMode('restock');
                        }}
                      >
                        Restock
                      </Button>
                      <Button
                        className="secondary"
                        onClick={() => {
                          setSelected(row);
                          setMode('adjust');
                        }}
                      >
                        Adjust
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
          {!query.data.items.length && <p>No owned inventory records.</p>}
          <Pagination
            hasPrevious={previous.length > 0}
            hasNext={!!query.data.nextCursor}
            onPrevious={() => {
              setCursor(previous.at(-1) ?? null);
              setPrevious(previous.slice(0, -1));
            }}
            onNext={() => {
              setPrevious([...previous, cursor]);
              setCursor(query.data!.nextCursor);
            }}
          />
        </>
      )}
      <Dialog
        open={selected !== null}
        busy={pending}
        onClose={() => setSelected(null)}
        title={
          mode === 'restock'
            ? 'Restock physical inventory'
            : 'Adjust physical inventory'
        }
      >
        {selected && (
          <CommandForm
            key={`${selected.variantId}:${mode}`}
            title={mode === 'restock' ? 'Restock' : 'Stock adjustment'}
            onPendingChange={setPending}
            submitLabel={mode === 'restock' ? 'Restock' : 'Review adjustment'}
            confirm={
              mode === 'adjust'
                ? 'Apply this signed stock adjustment? Allocations and checkout holds remain backend controlled.'
                : undefined
            }
            validate={(data) => {
              integer(data.get('quantity'), { signed: mode === 'adjust' });
            }}
            run={(data, operationKey) =>
              service[mode]({
                operationKey,
                variantId: selected.variantId,
                quantity: integer(data.get('quantity'), {
                  signed: mode === 'adjust',
                }),
              })
            }
            onDone={() => {
              setSelected(null);
              query.refresh();
            }}
          >
            <p>
              {selected.productName} · {selected.variantName} · {selected.sku}
            </p>
            <TextField
              name="quantity"
              label={
                mode === 'restock'
                  ? 'Restock quantity'
                  : 'Signed adjustment quantity'
              }
            />
            <p>
              {mode === 'restock'
                ? 'Enter a positive whole number.'
                : 'Enter a nonzero whole number. Use a minus sign for a reduction.'}
            </p>
          </CommandForm>
        )}
      </Dialog>
    </>
  );
}
