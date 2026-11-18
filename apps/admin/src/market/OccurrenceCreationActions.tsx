import { FarmstandButton, FarmstandIcon } from '@market/ui/farmstand';

/** Shared occurrence actions; callers retain routing and scheduling authority. */
export function OccurrenceCreationActions({
  onSingle,
  onGenerate,
}: {
  onSingle?: () => void;
  onGenerate?: () => void;
}) {
  return (
    <>
      {onSingle && (
        <FarmstandButton variant="secondary" onClick={onSingle}>
          <FarmstandIcon name="plus" />
          Create single date
        </FarmstandButton>
      )}
      {onGenerate && (
        <FarmstandButton onClick={onGenerate}>
          <FarmstandIcon name="calendar-days" />
          Generate occurrences
        </FarmstandButton>
      )}
    </>
  );
}
