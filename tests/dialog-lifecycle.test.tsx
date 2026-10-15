import { StrictMode, useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button, Dialog, Drawer, Input, type DialogProps } from '@market/ui';
import { MarketDialog } from '../apps/admin/src/market/presentation';
import { CommandForm as VendorCommandForm } from '../apps/admin/src/vendor/common';
import { CommandForm as MarketCommandForm } from '../apps/admin/src/market/CommandForm';
import { Inventory } from '../apps/admin/src/vendor/inventory';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
function settleClose() {
  act(() => vi.advanceTimersByTime(150));
}
function Harness({
  onClose,
  ...props
}: Partial<DialogProps> & { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog
        title="Example"
        {...props}
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        {props.children ?? (
          <Input aria-label="Draft" defaultValue="Kept draft" />
        )}
      </Dialog>
    </>
  );
}
function openExample() {
  screen.getByRole('button', { name: 'Open' }).focus();
  fireEvent.click(screen.getByRole('button', { name: 'Open' }));
  return screen.getByRole('dialog') as HTMLDialogElement;
}
function escape(dialog: HTMLDialogElement) {
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
}

describe('shared DLG-02 lifecycle', () => {
  it('opens, animates Close once, restores the trigger and reopens', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} description="Helpful description" />);
    const dialog = openExample();
    expect(screen.getByRole('heading', { name: 'Example' })).toHaveFocus();
    expect(dialog).toHaveAccessibleDescription('Helpful description');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    escape(dialog);
    expect(dialog).toHaveClass('is-closing');
    expect(onClose).not.toHaveBeenCalled();
    settleClose();
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
    expect(openExample().open).toBe(true);
    expect(dialog).not.toHaveClass('is-closing');
    escape(dialog);
    settleClose();
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('programmatic element.close respects the animation and notifies exactly once', () => {
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
      this: HTMLDialogElement,
      value?: string,
    ) {
      this.open = false;
      this.returnValue = value ?? '';
      this.dispatchEvent(new Event('close'));
    });
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const dialog = openExample();
    act(() => {
      dialog.close('dismissed');
      dialog.close();
    });
    settleClose();
    expect(dialog.returnValue).toBe('dismissed');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('synchronizes direct native close and avoids reopening on unrelated renders', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog open title="Native" onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog') as HTMLDialogElement;
    act(() => HTMLDialogElement.prototype.close.call(dialog));
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    rerender(
      <Dialog open title="Native" onClose={onClose}>
        <p>Changed</p>
      </Dialog>,
    );
    expect(dialog.open).toBe(false);
    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('parent close cancels an outstanding exit without echoing onClose', () => {
    const onClose = vi.fn();
    const node = (open: boolean) => (
      <Dialog open={open} title="Controlled" onClose={onClose}>
        Content
      </Dialog>
    );
    const { rerender } = render(node(true));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    rerender(node(false));
    rerender(node(true));
    settleClose();
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('consumes an asynchronous native close event after a rapid reopen', () => {
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
      this: HTMLDialogElement,
    ) {
      this.open = false;
      setTimeout(() => this.dispatchEvent(new Event('close')), 5);
    });
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const dialog = openExample();
    escape(dialog);
    settleClose();
    openExample();
    act(() => vi.advanceTimersByTime(5));
    expect(dialog.open).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
    escape(dialog);
    settleClose();
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('honors focusTitle=false by leaving initial native focus in place', () => {
    vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
      function (this: HTMLDialogElement) {
        this.open = true;
        this.querySelector<HTMLInputElement>('input')?.focus();
      },
    );
    render(<Harness focusTitle={false} onClose={vi.fn()} />);
    openExample();
    expect(screen.getByLabelText('Draft')).toHaveFocus();
  });

  it('protects dirty drafts on explicit, Escape, programmatic and native closure', () => {
    const beforeClose = vi.fn(() => false),
      onClose = vi.fn();
    render(<Harness beforeClose={beforeClose} onClose={onClose} />);
    const dialog = openExample();
    fireEvent.change(screen.getByLabelText('Draft'), {
      target: { value: 'Unsaved' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    escape(dialog);
    act(() => dialog.close());
    act(() => HTMLDialogElement.prototype.close.call(dialog));
    settleClose();
    expect(dialog.open).toBe(true);
    expect(screen.getByLabelText('Draft')).toHaveValue('Unsaved');
    expect(onClose).not.toHaveBeenCalled();
    expect(beforeClose).toHaveBeenCalledTimes(4);
    beforeClose.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    settleClose();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('busy prevents forbidden dismissal, including direct native closure', () => {
    const onClose = vi.fn();
    render(<Harness busy onClose={onClose} />);
    const dialog = openExample();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    escape(dialog);
    act(() => dialog.close());
    act(() => HTMLDialogElement.prototype.close.call(dialog));
    settleClose();
    expect(dialog.open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancels dismissal if a command starts during exit and uses the latest callback', () => {
    const oldClose = vi.fn(),
      newClose = vi.fn();
    const node = (busy: boolean, onClose: () => void) => (
      <Dialog open title="Busy" busy={busy} onClose={onClose}>
        Content
      </Dialog>
    );
    const { rerender } = render(node(false, oldClose));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    rerender(node(true, newClose));
    settleClose();
    expect(screen.getByRole('dialog')).not.toHaveClass('is-closing');
    expect(oldClose).not.toHaveBeenCalled();
    rerender(node(false, newClose));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    settleClose();
    expect(newClose).toHaveBeenCalledOnce();
  });

  it('backdrop is opt-in and requires the interaction to begin and end outside the surface', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Harness onClose={onClose} />);
    const dialog = openExample();
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 20,
      right: 200,
      top: 20,
      bottom: 200,
    } as DOMRect);
    fireEvent(
      dialog,
      new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }),
    );
    fireEvent.click(dialog, { clientX: 0, clientY: 0 });
    settleClose();
    expect(dialog.open).toBe(true);
    rerender(<Harness onClose={onClose} dismissOnBackdrop />);
    fireEvent(
      dialog,
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 30,
        clientY: 30,
      }),
    );
    fireEvent.click(dialog, { clientX: 0, clientY: 0 });
    settleClose();
    expect(dialog.open).toBe(true);
    fireEvent(
      dialog,
      new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }),
    );
    fireEvent.click(dialog, { clientX: 0, clientY: 0 });
    settleClose();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('unmount cancels a pending close without notifying a removed caller', () => {
    const onClose = vi.fn();
    const { unmount } = render(<Harness onClose={onClose} />);
    const dialog = openExample();
    const patchedClose = dialog.close;
    escape(dialog);
    unmount();
    settleClose();
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog.open).toBe(false);
    expect(dialog.close).not.toBe(patchedClose);
  });

  it('unmount restores a surviving external trigger without notifying the caller', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const closed = vi.fn();
    const { unmount } = render(
      <Dialog open title="Unmount" onClose={closed}>
        Content
      </Dialog>,
    );
    await act(async () => unmount());
    expect(trigger).toHaveFocus();
    expect(closed).not.toHaveBeenCalled();
    trigger.remove();
  });

  it.each(['removed', 'hidden', 'disabled'] as const)(
    'does not focus a %s trigger',
    (state) => {
      render(<Harness onClose={vi.fn()} />);
      openExample();
      const trigger = screen.getByRole('button', { name: 'Open' });
      const originalParent = trigger.parentElement!;
      const focus = vi.spyOn(trigger, 'focus');
      if (state === 'removed') trigger.remove();
      if (state === 'hidden') trigger.hidden = true;
      if (state === 'disabled') (trigger as HTMLButtonElement).disabled = true;
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      settleClose();
      expect(focus).not.toHaveBeenCalled();
      if (state === 'removed') originalParent.append(trigger);
    },
  );

  it('uses no exit delay under reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    openExample();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => vi.advanceTimersByTime(0));
    expect(onClose).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('remains usable through StrictMode effect cleanup', () => {
    const onClose = vi.fn();
    render(
      <StrictMode>
        <Harness onClose={onClose} />
      </StrictMode>,
    );
    openExample();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    settleClose();
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('retains the original trigger when StrictMode replays an initially open mount', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const closed = vi.fn();
    render(
      <StrictMode>
        <Dialog open title="Initially open" onClose={closed}>
          Content
        </Dialog>
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    settleClose();
    expect(closed).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('keeps Drawer edge presentation on the same dismissal contract', () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Drawer" onClose={onClose}>
        Scrollable content
      </Drawer>,
    );
    const dialog = screen.getByRole('dialog') as HTMLDialogElement;
    expect(dialog).toHaveClass('ui-dialog', 'ui-dialog-drawer', 'drawer');
    escape(dialog);
    settleClose();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('nested confirmation dismissal leaves the parent dialog and restores its invoking control', () => {
    const parentClosed = vi.fn(),
      childClosed = vi.fn();
    function Nested() {
      const [child, setChild] = useState(false);
      return (
        <Dialog open title="Parent" onClose={parentClosed}>
          <Button onClick={() => setChild(true)}>Open confirmation</Button>
          <Dialog
            open={child}
            title="Confirmation"
            onClose={() => {
              childClosed();
              setChild(false);
            }}
          >
            Confirm a change
          </Dialog>
        </Dialog>
      );
    }
    render(<Nested />);
    const trigger = screen.getByRole('button', { name: 'Open confirmation' });
    trigger.focus();
    fireEvent.click(trigger);
    const child = screen.getByRole('dialog', {
      name: 'Confirmation',
    }) as HTMLDialogElement;
    escape(child);
    settleClose();
    expect(childClosed).toHaveBeenCalledOnce();
    expect(parentClosed).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Parent' })).toHaveAttribute(
      'open',
    );
    expect(trigger).toHaveFocus();
  });

  it('MarketDialog is a compatibility adapter with working title focus and render-prop dismissal', () => {
    const onClose = vi.fn();
    render(
      <MarketDialog
        open
        title="Market"
        focusTitle
        onClose={onClose}
        showClose={false}
      >
        {(dismiss) => (
          <Button variant="secondary" onClick={dismiss}>
            Cancel draft
          </Button>
        )}
      </MarketDialog>,
    );
    expect(screen.getByRole('dialog')).toHaveClass(
      'ui-dialog',
      'ui-dialog-wide',
    );
    expect(screen.getByRole('heading')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel draft' }));
    settleClose();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('dialog actions and affected command forms', () => {
  it('vendor Inventory retains its embedded action pair and uses shared dismissal when cancelled', async () => {
    const service = createFixtureVendorService(fixtureContexts.VENDOR);
    service.restock = vi.fn();
    await act(async () => {
      render(<Inventory service={service} />);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    const restock = screen.getAllByRole('button', { name: 'Restock' })[0]!;
    restock.focus();
    fireEvent.click(restock);
    const dialog = screen.getByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Restock' });
    const close = within(dialog).getByRole('button', { name: 'Close' });
    expect(submit).toHaveAttribute('type', 'submit');
    expect(submit.parentElement).toBe(close.parentElement);
    fireEvent.click(close);
    settleClose();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(restock).toHaveFocus();
    expect(service.restock).not.toHaveBeenCalled();
  });
  it('keeps footer submit association, validation, submitter and secondary non-submit semantics', () => {
    const submitted = vi.fn(),
      closed = vi.fn();
    render(
      <Dialog
        open
        title="Form"
        onClose={closed}
        actions={
          <Button type="submit" form="dialog-form" name="intent" value="save">
            Save
          </Button>
        }
      >
        <form
          id="dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            const submitter = (event.nativeEvent as SubmitEvent)
              .submitter as HTMLButtonElement;
            submitted(new FormData(event.currentTarget, submitter), submitter);
          }}
        >
          <Input aria-label="Name" name="name" required />
        </form>
      </Dialog>,
    );
    const save = screen.getByRole('button', { name: 'Save' }),
      close = screen.getByRole('button', { name: 'Close' });
    expect(save.parentElement).toBe(close.parentElement);
    expect(save.parentElement).toHaveClass('ui-actions', 'ui-modal-actions');
    expect(save).toHaveClass('ui-button');
    expect(save).not.toHaveClass('secondary');
    expect(close).toHaveClass('ui-button', 'secondary');
    expect(close).toHaveAttribute('type', 'button');
    fireEvent.click(save);
    expect(submitted).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Apple' },
    });
    fireEvent.click(save);
    expect(submitted).toHaveBeenCalledOnce();
    expect(Object.fromEntries(submitted.mock.calls[0]![0])).toEqual({
      name: 'Apple',
      intent: 'save',
    });
    fireEvent.click(close);
    settleClose();
    expect(submitted).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledOnce();
  });

  it.each([VendorCommandForm, MarketCommandForm])(
    'retains command confirmation, operation key and pending protections',
    async (CommandForm) => {
      let resolve!: (result: unknown) => void;
      const run = vi.fn<(data: FormData, key: string) => Promise<unknown>>(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      );
      const onDone = vi.fn();
      render(
        <CommandForm
          title="Test command"
          confirm="Confirm intent"
          run={run}
          onDone={onDone}
        >
          <Input aria-label="Quantity" name="quantity" defaultValue="3" />
        </CommandForm>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      const dialog = screen.getByRole('dialog') as HTMLDialogElement;
      const confirm = within(dialog).getByRole('button', {
        name: 'Confirm change',
      });
      const close = within(dialog).getByRole('button', { name: 'Close' });
      expect(confirm.parentElement).toBe(close.parentElement);
      fireEvent.click(confirm);
      fireEvent.click(confirm);
      escape(dialog);
      act(() => dialog.close());
      settleClose();
      expect(dialog.open).toBe(true);
      expect(close).toBeDisabled();
      expect(run).toHaveBeenCalledOnce();
      expect(run.mock.calls[0]![0].get('quantity')).toBe('3');
      expect(run.mock.calls[0]![1]).toEqual(expect.any(String));
      await act(async () => resolve({ id: 1 }));
      expect(dialog.open).toBe(false);
      expect(onDone).toHaveBeenCalledOnce();
    },
  );
});
