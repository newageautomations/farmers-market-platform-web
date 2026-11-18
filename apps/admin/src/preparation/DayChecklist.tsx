import { useId } from 'react';
import type { PreparationCommand, PreparationTask } from '@market/api';
import { Checkbox, Field, IconButton, Input } from '@market/ui';
import { FarmstandButton, FarmstandIcon } from '@market/ui/farmstand';
import { SettingsPanel } from '../settings/SettingsPanel';

const display = (title: string) => title.replace(/^\[Closing\] /, '');

/**
 * Market Day Setup/Closing checklist in the Settings panel presentation: a
 * progress meter, task rows with checkbox and icon actions, and an inline add
 * row. Presentation only; `PreparationPage` keeps the commands, revisions and
 * the Phase B `[Closing] ` title convention. The full preparation page keeps
 * its own checklist and template controls.
 */
export function DayChecklist({
  phase,
  tasks,
  allTasks,
  complete,
  timezone,
  disabled,
  editing,
  title,
  setTitle,
  onEdit,
  run,
}: {
  phase: 'Setup' | 'Closing';
  tasks: PreparationTask[];
  allTasks: PreparationTask[];
  complete: number;
  timezone: string;
  disabled: boolean;
  editing?: string;
  title: string;
  setTitle: (title: string) => void;
  onEdit: (task?: PreparationTask) => void;
  run: (command: PreparationCommand) => Promise<boolean>;
}) {
  const id = useId();
  const percent = tasks.length
    ? Math.round((complete / tasks.length) * 100)
    : 0;
  function move(position: number, offset: -1 | 1) {
    const ids = allTasks.map((t) => t.id);
    const from = allTasks.indexOf(tasks[position]!);
    const to = allTasks.indexOf(tasks[position + offset]!);
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run({ action: 'REORDER', taskIds: ids });
  }
  return (
    <SettingsPanel
      icon={phase === 'Closing' ? 'archive' : 'clipboard-list'}
      title={`${phase} checklist`}
      className="day-checklist"
      description={
        tasks.length
          ? complete === tasks.length
            ? 'Every task is complete.'
            : `${complete} of ${tasks.length} tasks complete`
          : `Add the tasks you do at ${phase.toLowerCase()}.`
      }
    >
      {tasks.length > 0 && (
        <div
          className="day-checklist-progress"
          role="progressbar"
          aria-label={`${phase} checklist progress`}
          aria-valuemin={0}
          aria-valuemax={tasks.length}
          aria-valuenow={complete}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
      )}
      <fieldset className="day-checklist-fieldset" disabled={disabled}>
        <legend className="sr-only">{phase} tasks</legend>
        {tasks.length > 0 && (
          <ul className="day-checklist-tasks">
            {tasks.map((task, position) => (
              <li
                key={task.id}
                className={[
                  task.completedAt ? 'is-complete' : '',
                  editing === task.id ? 'is-editing' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <label className="day-checklist-task">
                  <Checkbox
                    checked={!!task.completedAt}
                    onChange={(e) =>
                      void run({
                        action: 'COMPLETE',
                        taskId: task.id,
                        complete: e.target.checked,
                      })
                    }
                  />
                  <span className="day-checklist-title">
                    {display(task.title)}
                  </span>
                </label>
                {task.completedAt && (
                  <small className="day-checklist-done">
                    Done{' '}
                    {new Date(task.completedAt).toLocaleString(undefined, {
                      timeZone: timezone,
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </small>
                )}
                <div className="day-checklist-actions">
                  <IconButton
                    icon="edit"
                    label={`Edit ${display(task.title)}`}
                    variant="tertiary"
                    size="compact"
                    onClick={() => onEdit(task)}
                  />
                  <IconButton
                    icon="arrow-up"
                    label={`Move ${display(task.title)} up`}
                    variant="tertiary"
                    size="compact"
                    disabled={!position}
                    onClick={() => move(position, -1)}
                  />
                  <IconButton
                    icon="arrow-down"
                    label={`Move ${display(task.title)} down`}
                    variant="tertiary"
                    size="compact"
                    disabled={position === tasks.length - 1}
                    onClick={() => move(position, 1)}
                  />
                  <IconButton
                    icon="trash"
                    label={`Delete ${display(task.title)}`}
                    variant="tertiary"
                    size="compact"
                    className="day-checklist-delete"
                    onClick={() =>
                      void run({ action: 'DELETE', taskId: task.id })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <form
          className="day-checklist-add"
          onSubmit={(e) => {
            e.preventDefault();
            const value = title.trim();
            void run({
              action: editing ? 'EDIT' : 'ADD',
              taskId: editing,
              // Closing tasks share the Phase B record, marked by their title.
              title:
                phase === 'Closing' && !value.startsWith('[Closing] ')
                  ? `[Closing] ${value}`
                  : value,
            }).then((ok) => {
              if (ok) onEdit(undefined);
            });
          }}
        >
          <Field
            id={`${id}-task`}
            label={
              <span className="sr-only">
                {editing ? 'Edit task' : 'New task'}
              </span>
            }
          >
            <Input
              id={`${id}-task`}
              value={title}
              placeholder={editing ? 'Task name' : 'Add a task...'}
              maxLength={phase === 'Closing' ? 150 : 160}
              required
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <FarmstandButton type="submit" size="compact">
            <FarmstandIcon name={editing ? 'circle-check' : 'plus'} />
            {editing ? 'Save task' : 'Add task'}
          </FarmstandButton>
          {editing && (
            <FarmstandButton
              variant="secondary"
              size="compact"
              onClick={() => onEdit(undefined)}
            >
              Cancel edit
            </FarmstandButton>
          )}
        </form>
      </fieldset>
    </SettingsPanel>
  );
}
