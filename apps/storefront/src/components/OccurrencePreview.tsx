import { useState, useSyncExternalStore } from 'react';
import { Button, Dialog } from '@market/ui';
export default function OccurrencePreview() {
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        disabled={!ready}
        onClick={() => setOpen(true)}
        className="secondary"
      >
        About occurrence selection
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Choose a Market occurrence"
      >
        <p>
          Upcoming occurrence data will load from the Market API. A Market cart
          will belong to one Market and one occurrence.
        </p>
        <p>Selection and shopping will be added in a later phase.</p>
      </Dialog>
    </>
  );
}
