import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  applicationConditionIssues,
  applicationScheduleIssue,
  safeError,
  type ApplicationDefinition,
  type ApplicationQuestion,
  type ApplicationVersion,
  type MarketOperationsData,
  type OperationsCommand,
} from '@market/api';
import {
  Alert,
  ApplicationFields,
  Badge,
  Button,
  Checkbox,
  Dialog,
  EmptyState,
  IconButton,
  Input,
  Radio,
  UtilityIcon,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
} from '@market/ui/farmstand';
import { platformName } from '@market/config';
import { go } from '../../vendor/common';
import { Panel } from '../../vendor/application-detail';
import { date } from '../presentation';
import { Check, Control, moneyLabel } from './common';
import {
  ApplicationQuestionEditor,
  protectedField,
  questionTypeLabels,
} from './ApplicationQuestionEditor';
import {
  useReorderAnimation,
  useReorderDrag,
  type DragKind,
} from './application-drag';
import {
  applicationRows,
  plural,
  windowSummary,
  type ApplicationRow,
} from './applications-data';
import { ApplicationStateBadge, sharingLabel } from './application-status';
import '@market/ui/farmstand.css';
import '../../vendor/application-detail.css';
import './applications.css';

type Command = (c: OperationsCommand) => Promise<unknown>;
const AUTOSAVE_DELAY = 800;
const escapeAttribute = (value: string) => value.replace(/["\\]/g, '\\$&');

function inApp(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (
    event.button ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  go(href);
}

/** Problems that would make the save fail, in words a manager can act on. */
export function draftIssues(name: string, definition: ApplicationDefinition) {
  const issues: string[] = [];
  if (!name.trim()) issues.push('Give the application a name.');
  for (const section of definition.sections)
    if (!section.trim()) issues.push('Every section needs a name.');
  definition.questions.forEach((q, index) => {
    const title = q.label.trim() || `Question ${index + 1}`;
    if (!q.label.trim())
      issues.push(`${title} in ${q.section} needs question text.`);
    if (
      ['SINGLE_SELECT', 'MULTI_SELECT', 'DROPDOWN'].includes(q.type) &&
      (!q.options.length ||
        q.options.some((o) => !o.trim()) ||
        new Set(q.options.map((o) => o.trim())).size !== q.options.length)
    )
      issues.push(
        `“${title}” needs answer options that are filled in and different.`,
      );
  });
  return [
    ...issues,
    ...applicationConditionIssues(definition),
    applicationScheduleIssue(definition),
  ].filter((issue): issue is string => !!issue);
}

type SaveStatus =
  'pristine' | 'pending' | 'saving' | 'saved' | 'invalid' | 'error';

/**
 * Autosave for the builder. Nothing is written until the first edit: a new
 * application is created, or a published one gets its draft, only then.
 * Saves are serialized, each carrying the revision the previous one returned.
 */
function useAutosave({
  row,
  name,
  definition,
  issues,
  enabled,
  persist,
}: {
  row?: ApplicationRow;
  name: string;
  definition: ApplicationDefinition;
  issues: string[];
  enabled: boolean;
  persist: Command;
}) {
  const text = JSON.stringify({ name, definition });
  const [savedText, setSavedText] = useState(text);
  const [status, setStatus] = useState<SaveStatus>('pristine');
  const [error, setError] = useState('');
  const latest = useRef({ name, definition, text, valid: !issues.length });
  useLayoutEffect(() => {
    latest.current = { name, definition, text, valid: !issues.length };
  });
  const [hasDraft, setHasDraft] = useState(!!row?.draft);
  const saved = useRef(savedText);
  const target = useRef<{
    templateId?: number;
    draft?: { id: number; revision: number };
    publishedId?: number;
  }>({
    templateId: row?.template.id,
    draft: row?.draft && { id: row.draft.id, revision: row.draft.revision },
    publishedId: row?.published?.id,
  });
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const everSaved = useRef(false);
  const dirty = text !== savedText;

  const save = useCallback(
    (force = false) => {
      const job = queue.current.then(async () => {
        const snapshot = latest.current;
        if (!force && snapshot.text === saved.current) return true;
        if (!snapshot.valid) {
          setStatus('invalid');
          return false;
        }
        setStatus('saving');
        try {
          let draft = target.current.draft;
          if (!draft) {
            const created = (await (target.current.publishedId
              ? persist({
                  action: 'CLONE_APPLICATION',
                  id: target.current.publishedId,
                  data: {},
                })
              : persist({
                  action: 'CREATE_APPLICATION',
                  data: { name: snapshot.name.trim() },
                }))) as ApplicationVersion | undefined;
            if (!created) throw new Error('not created');
            draft = { id: created.id, revision: created.revision };
            target.current = {
              ...target.current,
              templateId: created.templateId,
              draft,
            };
            setHasDraft(true);
            // Keep the address shareable without remounting the builder.
            if (!row)
              window.history.replaceState(
                window.history.state,
                '',
                `/market/applications/${created.templateId}`,
              );
          }
          const result = (await persist({
            action: 'SAVE_APPLICATION',
            id: draft.id,
            expectedRevision: draft.revision,
            data: {
              definition: snapshot.definition,
              name: snapshot.name.trim(),
            },
          })) as ApplicationVersion | undefined;
          if (!result) throw new Error('not saved');
          target.current.draft = { id: result.id, revision: result.revision };
          saved.current = snapshot.text;
          everSaved.current = true;
          setSavedText(snapshot.text);
          setError('');
          setStatus(
            latest.current.text === snapshot.text ? 'saved' : 'pending',
          );
          return true;
        } catch (e) {
          const problem =
            e instanceof Error && /^not /.test(e.message)
              ? undefined
              : safeError(e);
          setError(
            problem?.kind === 'conflict'
              ? 'This application was changed somewhere else. Reload the page to get the latest version.'
              : 'Your latest changes could not be saved.',
          );
          setStatus('error');
          return false;
        }
      });
      queue.current = job;
      return job;
    },
    [persist, row],
  );

  useEffect(() => {
    if (!enabled) return;
    if (!dirty) {
      // Edits undone back to what is saved need no save.
      setStatus((current) =>
        current === 'pending' || current === 'invalid'
          ? everSaved.current
            ? 'saved'
            : 'pristine'
          : current,
      );
      return;
    }
    if (issues.length) {
      setStatus('invalid');
      return;
    }
    setStatus((current) => (current === 'saving' ? current : 'pending'));
    const timer = window.setTimeout(() => void save(), AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [enabled, dirty, text, issues.length, save]);

  // Leaving the builder saves what is left; closing the tab asks first.
  useEffect(() => {
    if (!enabled) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (latest.current.text !== saved.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      if (latest.current.text !== saved.current) void save();
    };
  }, [enabled, save]);

  return {
    status: dirty && status === 'pristine' ? 'pending' : status,
    error,
    dirty,
    save,
    target,
    hasDraft,
  };
}

export function ApplicationBuilder({
  templateId,
  data,
  run,
  persist = run,
  canManage,
}: {
  /** Omitted for a new application that has not been saved yet. */
  templateId?: number;
  data: MarketOperationsData;
  run: Command;
  /** Quiet command path for autosave; defaults to `run`. */
  persist?: Command;
  canManage: boolean;
}) {
  const row = templateId
    ? applicationRows(data).find((r) => r.template.id === templateId)
    : undefined;
  const back = '/market/applications';
  const backLink = (
    <FarmstandLink
      href={back}
      variant="secondary"
      onClick={(event) => inApp(event, back)}
      className="application-detail-back application-detail-arrow"
    >
      <FarmstandIcon name="arrow-left" />
      Back to applications
    </FarmstandLink>
  );
  if (templateId && !row?.current)
    return (
      <div className="application-detail application-builder-page farmstand-controls">
        {backLink}
        <EmptyState title="Application not found">
          <p>It may have been removed, or you may not have access to it.</p>
        </EmptyState>
      </div>
    );
  const base = row?.current?.definition ?? data.applicationDefaults;
  if (!base)
    return (
      <div className="application-detail application-builder-page farmstand-controls">
        {backLink}
        <EmptyState
          title="Start a new application"
          action={
            canManage && (
              <FarmstandButton
                variant="primary"
                onClick={async () => {
                  const created = (await run({
                    action: 'CREATE_APPLICATION',
                    data: { name: 'Untitled application' },
                  })) as ApplicationVersion | undefined;
                  if (created) go(`/market/applications/${created.templateId}`);
                }}
              >
                Create application
              </FarmstandButton>
            )
          }
        >
          <p>
            This Market connection cannot preview a new application before it is
            saved.
          </p>
        </EmptyState>
      </div>
    );
  return (
    <Builder
      row={row}
      base={base}
      data={data}
      persist={persist}
      canManage={canManage}
      backLink={backLink}
      onRestore={
        row?.state === 'ARCHIVED'
          ? () =>
              run({
                action: 'UNARCHIVE_APPLICATION',
                id: row.template.id,
                expectedRevision: row.template.revision,
                data: {},
              })
          : undefined
      }
    />
  );
}

function Builder({
  row,
  base,
  data,
  persist,
  canManage,
  backLink,
  onRestore,
}: {
  row?: ApplicationRow;
  base: ApplicationDefinition;
  data: MarketOperationsData;
  persist: Command;
  canManage: boolean;
  backLink: ReactNode;
  onRestore?: () => void;
}) {
  const editable =
    canManage && (!row || row.state === 'DRAFT' || row.state === 'PUBLISHED');
  const [name, setName] = useState(
    row?.template.name ?? 'Untitled application',
  );
  const [definition, setDefinition] = useState<ApplicationDefinition>(() =>
    structuredClone(base),
  );
  const [selected, setSelected] = useState('');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const issues = useMemo(
    () => draftIssues(name, definition),
    [name, definition],
  );
  const autosave = useAutosave({
    row,
    name,
    definition,
    issues,
    enabled: editable,
    persist,
  });
  const timeZone = definition.schedule?.timeZone ?? data.timeZone;
  const current = useRef(definition);
  useLayoutEffect(() => {
    current.current = definition;
  });

  const edit = (id: string, patch: Partial<ApplicationQuestion>) =>
    setDefinition((d) => ({
      ...d,
      questions: d.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));

  /** Moves a question into `section`, before `beforeId` or to the section's end. */
  function placeQuestion(
    d: ApplicationDefinition,
    id: string,
    section: string,
    beforeId: string | null,
  ) {
    const from = d.questions.findIndex((q) => q.id === id);
    if (from < 0) return d;
    const questions = [...d.questions];
    const item = { ...questions.splice(from, 1)[0]!, section };
    let at = beforeId ? questions.findIndex((q) => q.id === beforeId) : -1;
    if (at < 0) {
      const last = questions.map((q) => q.section).lastIndexOf(section);
      at = last < 0 ? questions.length : last + 1;
    }
    questions.splice(at, 0, item);
    return questions.every((q, i) => q === d.questions[i])
      ? d
      : { ...d, questions };
  }
  function placeSection(
    d: ApplicationDefinition,
    section: string,
    beforeSection: string | null,
  ) {
    const sections = d.sections.filter((s) => s !== section);
    const at = beforeSection ? sections.indexOf(beforeSection) : -1;
    sections.splice(at < 0 ? sections.length : at, 0, section);
    return sections.join('\n') === d.sections.join('\n')
      ? d
      : { ...d, sections };
  }
  function describeQuestion(d: ApplicationDefinition, id: string) {
    const q = d.questions.find((item) => item.id === id);
    if (!q) return '';
    const siblings = d.questions.filter((item) => item.section === q.section);
    return `${q.label} moved to position ${siblings.indexOf(q) + 1} of ${siblings.length} in ${q.section}.`;
  }

  const canvas = useRef<HTMLDivElement>(null);
  const { drag, begin, suppressClick } = useReorderDrag({
    root: canvas,
    onHover(kind, id, _x, y) {
      const root = canvas.current;
      if (!root) return;
      if (kind === 'section') {
        const rows = [
          ...root.querySelectorAll<HTMLElement>('[data-section-row]'),
        ].filter((el) => el.dataset.sectionRow !== id);
        const before = rows.find((el) => {
          const r = el.getBoundingClientRect();
          return y < r.top + r.height / 2;
        });
        setDefinition((d) =>
          placeSection(d, id, before?.dataset.sectionRow ?? null),
        );
        return;
      }
      const sections = [
        ...root.querySelectorAll<HTMLElement>('[data-section-drop]'),
      ];
      if (!sections.length) return;
      // The section under the pointer, or the nearest one.
      const area =
        sections.find((el) => {
          const r = el.getBoundingClientRect();
          return y >= r.top && y <= r.bottom;
        }) ??
        sections.reduce((best, el) => {
          const r = el.getBoundingClientRect(),
            b = best.getBoundingClientRect();
          const distance = (rect: DOMRect) =>
            y < rect.top ? rect.top - y : y - rect.bottom;
          return distance(r) < distance(b) ? el : best;
        });
      const cards = [
        ...area.querySelectorAll<HTMLElement>('[data-question-id]'),
      ].filter((el) => el.dataset.questionId !== id);
      const before = cards.find((el) => {
        const r = el.getBoundingClientRect();
        return y < r.top + r.height / 2;
      });
      setDefinition((d) =>
        placeQuestion(
          d,
          id,
          area.dataset.sectionDrop!,
          before?.dataset.questionId ?? null,
        ),
      );
    },
    onDrop(kind, id) {
      const d = current.current;
      // A question dropped into a collapsed section opens it, so the moved
      // card stays visible.
      const landed =
        kind === 'question'
          ? d.questions.find((q) => q.id === id)?.section
          : undefined;
      if (landed)
        setCollapsed((all) => {
          if (!all.has(landed)) return all;
          const next = new Set(all);
          next.delete(landed);
          return next;
        });
      setAnnouncement(
        kind === 'section'
          ? `Section ${id} moved to position ${d.sections.indexOf(id) + 1} of ${d.sections.length}.`
          : describeQuestion(d, id),
      );
    },
  });
  const orderKey = `${definition.sections.join('|')}#${definition.questions
    .map((q) => `${q.section}:${q.id}`)
    .join('|')}`;
  useReorderAnimation(canvas, orderKey, !!drag);

  // Sections collapse to rows while one is dragged; keep the grabbed row
  // under the pointer when the page shortens.
  const sectionDrag = drag?.kind === 'section' ? drag : undefined;
  const collapsedFor = useRef('');
  useEffect(() => {
    if (!sectionDrag) {
      collapsedFor.current = '';
      return;
    }
    if (collapsedFor.current === sectionDrag.id) return;
    collapsedFor.current = sectionDrag.id;
    const row = canvas.current?.querySelector<HTMLElement>(
      `[data-section-row="${escapeAttribute(sectionDrag.id)}"]`,
    );
    if (!row) return;
    const delta =
      row.getBoundingClientRect().top - (sectionDrag.y - sectionDrag.offsetY);
    if (Math.abs(delta) > 1)
      window.scrollBy({ top: delta, behavior: 'instant' });
  }, [sectionDrag]);

  function startDrag(
    event: ReactPointerEvent<HTMLElement>,
    kind: DragKind,
    id: string,
    threshold?: number,
  ) {
    if (!editable) return;
    const card = (event.currentTarget as HTMLElement).closest<HTMLElement>(
      kind === 'section' ? '[data-section-block]' : '[data-question-id]',
    );
    if (!card) return;
    if (kind === 'question' && selected === id) setSelected('');
    begin(event, kind, id, card, threshold);
  }
  function focusHandle(kind: DragKind, id: string) {
    requestAnimationFrame(() =>
      canvas.current
        ?.querySelector<HTMLElement>(
          `[data-handle="${kind}:${escapeAttribute(id)}"]`,
        )
        ?.focus(),
    );
  }
  function nudgeQuestion(id: string, direction: -1 | 1) {
    {
      const d = current.current;
      const q = d.questions.find((item) => item.id === id);
      if (!q) return;
      const siblings = d.questions.filter((item) => item.section === q.section);
      const index = siblings.indexOf(q);
      const sectionIndex = d.sections.indexOf(q.section);
      let next = d;
      if (direction < 0) {
        if (index > 0)
          next = placeQuestion(d, id, q.section, siblings[index - 1]!.id);
        else if (sectionIndex > 0)
          next = placeQuestion(d, id, d.sections[sectionIndex - 1]!, null);
      } else if (index < siblings.length - 1)
        next = placeQuestion(d, id, q.section, siblings[index + 2]?.id ?? null);
      else if (sectionIndex < d.sections.length - 1) {
        const section = d.sections[sectionIndex + 1]!;
        next = placeQuestion(
          d,
          id,
          section,
          d.questions.find((item) => item.section === section)?.id ?? null,
        );
      }
      if (next !== d) {
        setDefinition(next);
        setAnnouncement(describeQuestion(next, id));
      }
    }
    focusHandle('question', id);
  }
  function nudgeSection(section: string, direction: -1 | 1) {
    const d = current.current;
    const index = d.sections.indexOf(section);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= d.sections.length) return;
    setDefinition(
      placeSection(
        d,
        section,
        direction < 0 ? d.sections[target]! : (d.sections[target + 1] ?? null),
      ),
    );
    setAnnouncement(
      `Section ${section} moved to position ${target + 1} of ${d.sections.length}.`,
    );
    focusHandle('section', section);
  }
  function addQuestion(section: string) {
    const id = crypto.randomUUID();
    setDefinition((d) =>
      placeQuestion(
        {
          ...d,
          questions: [
            ...d.questions,
            {
              id,
              section,
              label: 'Untitled question',
              help: '',
              type: 'SHORT_TEXT',
              required: false,
              hidden: false,
              options: [],
            },
          ],
        },
        id,
        section,
        null,
      ),
    );
    setSelected(id);
  }
  function duplicateQuestion(q: ApplicationQuestion) {
    const id = crypto.randomUUID();
    setDefinition((d) => {
      const at = d.questions.findIndex((item) => item.id === q.id);
      const questions = [...d.questions];
      questions.splice(at + 1, 0, {
        ...structuredClone(q),
        id,
        label: `${q.label} (copy)`.slice(0, 200),
      });
      return { ...d, questions };
    });
    setSelected(id);
  }
  function addSection() {
    let number = definition.sections.length + 1;
    while (definition.sections.includes(`Section ${number}`)) number++;
    const section = `Section ${number}`;
    setDefinition((d) => ({ ...d, sections: [...d.sections, section] }));
    setAnnouncement(`${section} added.`);
  }
  function removeSection(section: string) {
    setDefinition((d) => {
      const index = d.sections.indexOf(section);
      const fallback = d.sections[index === 0 ? 1 : index - 1]!;
      return {
        ...d,
        sections: d.sections.filter((s) => s !== section),
        questions: d.questions.map((q) =>
          q.section === section ? { ...q, section: fallback } : q,
        ),
      };
    });
  }
  function toggleSection(section: string) {
    const closing = !collapsed.has(section);
    setCollapsed((all) => {
      const next = new Set(all);
      if (closing) next.add(section);
      else next.delete(section);
      return next;
    });
    if (
      closing &&
      definition.questions.some(
        (q) => q.id === selected && q.section === section,
      )
    )
      setSelected('');
  }
  function renameSection(section: string, next: string) {
    setCollapsed((all) => {
      if (!all.has(section)) return all;
      const renamed = new Set(all);
      renamed.delete(section);
      renamed.add(next);
      return renamed;
    });
    setDefinition((d) => ({
      ...d,
      sections: d.sections.map((s) => (s === section ? next : s)),
      questions: d.questions.map((q) =>
        q.section === section ? { ...q, section: next } : q,
      ),
    }));
  }

  const state = row?.state ?? 'DRAFT';
  const headingTitle = name.trim() || 'Untitled application';
  const dragged =
    drag?.kind === 'question'
      ? definition.questions.find((q) => q.id === drag.id)
      : undefined;

  return (
    <div
      className="application-detail application-builder-page farmstand-controls"
      data-dragging={drag?.kind}
    >
      {backLink}
      <header className="application-detail-heading">
        <div className="application-detail-title">
          <h1>{headingTitle}</h1>
          <ApplicationStateBadge state={state} />
          {row?.state === 'PUBLISHED' && autosave.hasDraft && (
            <Badge tone="warning">Unpublished changes</Badge>
          )}
        </div>
        <div className="occurrence-detail-actions application-builder-actions">
          {editable && <SaveState status={autosave.status} isNew={!row} />}
          <FarmstandButton
            variant="secondary"
            aria-pressed={preview}
            onClick={() => setPreview((v) => !v)}
          >
            <UtilityIcon name={preview ? 'edit' : 'eye'} />
            {preview ? 'Back to editing' : 'Preview'}
          </FarmstandButton>
          {editable && (
            <FarmstandButton
              variant="primary"
              disabled={issues.length > 0}
              onClick={() => setPublishing(true)}
            >
              {row?.state === 'PUBLISHED' ? 'Publish changes' : 'Publish'}
            </FarmstandButton>
          )}
        </div>
      </header>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {row?.state === 'ARCHIVED' && (
        <Alert severity="neutral" className="application-builder-alert">
          <span>
            This application is archived, so vendors cannot open it. Restore it
            to make changes or accept vendors again.
          </span>
          {canManage && onRestore && (
            <FarmstandButton
              variant="secondary"
              size="compact"
              onClick={onRestore}
            >
              Restore application
            </FarmstandButton>
          )}
        </Alert>
      )}
      {row?.state === 'CLOSED' && (
        <Alert severity="neutral">
          This application is closed and no longer accepts vendors. It is shown
          read-only.
        </Alert>
      )}
      {editable && autosave.status === 'error' && (
        <Alert severity="error" className="application-builder-alert">
          <span>{autosave.error}</span>
          <FarmstandButton
            variant="secondary"
            size="compact"
            onClick={() => void autosave.save()}
          >
            Try again
          </FarmstandButton>
        </Alert>
      )}
      {editable && issues.length > 0 && (
        <Alert severity="warning" role="alert">
          <strong>Fix these to keep saving:</strong>
          <ul className="application-builder-issues">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </Alert>
      )}
      <div className="application-detail-columns application-builder-columns">
        <div className="application-detail-main">
          {preview ? (
            <PreviewPanel definition={definition} />
          ) : (
            <>
              <Panel
                icon={{ farmstand: 'file-text' }}
                title="Application"
                className="application-builder-title"
              >
                <fieldset
                  disabled={!editable}
                  className="application-builder-fieldset"
                >
                  <Control label="Application name">
                    {(id) => (
                      <Input
                        id={id}
                        value={name}
                        maxLength={200}
                        required
                        onChange={(e) => setName(e.target.value)}
                      />
                    )}
                  </Control>
                </fieldset>
                <p className="application-detail-note">
                  Vendors first answer “Do you have an account with{' '}
                  {platformName}?” This question is added for you and always
                  comes first.
                </p>
              </Panel>
              <div
                className="application-builder-canvas"
                ref={canvas}
                aria-label="Questions"
                role="group"
              >
                {editable && (
                  <p
                    className="application-builder-hint"
                    id="application-reorder-help"
                  >
                    Click a question to edit it. Drag a card to move it, or
                    focus its handle and use the arrow keys.
                  </p>
                )}
                {definition.sections.map((section, sectionIndex) => {
                  const questions = definition.questions.filter(
                    (q) => q.section === section,
                  );
                  const placeholder = sectionDrag?.id === section;
                  // A question being dragged keeps its section open.
                  const open =
                    !collapsed.has(section) ||
                    (drag?.kind === 'question' &&
                      questions.some((q) => q.id === drag.id));
                  const bodyId = `application-section-${sectionIndex}`;
                  return (
                    <section
                      key={section}
                      className="application-section-block"
                      data-section-block
                      data-section-row={section}
                      data-section-drop={section}
                      data-flip={`section:${section}`}
                      data-placeholder={placeholder || undefined}
                      data-collapsed={!open || undefined}
                      aria-label={`Section: ${section}`}
                    >
                      <SectionHeader
                        section={section}
                        count={questions.length}
                        index={sectionIndex}
                        total={definition.sections.length}
                        editable={editable}
                        sections={definition.sections}
                        onPointerDown={(event) =>
                          startDrag(event, 'section', section, 2)
                        }
                        onNudge={(direction) =>
                          nudgeSection(section, direction)
                        }
                        onRename={(next) => renameSection(section, next)}
                        onRemove={() => removeSection(section)}
                        open={open}
                        bodyId={bodyId}
                        onToggle={() => toggleSection(section)}
                      />
                      {!sectionDrag && open && (
                        <div id={bodyId} className="application-section-body">
                          <ol
                            className="application-question-list"
                            aria-label={`${section} questions`}
                          >
                            {questions.map((q) =>
                              editable && selected === q.id ? (
                                <li
                                  key={q.id}
                                  className="application-question-card"
                                  data-question-id={q.id}
                                  data-flip={`question:${q.id}`}
                                  data-editing
                                >
                                  <DragHandle
                                    kind="question"
                                    id={q.id}
                                    label={q.label}
                                    onPointerDown={(event) =>
                                      startDrag(event, 'question', q.id, 2)
                                    }
                                    onNudge={(direction) =>
                                      nudgeQuestion(q.id, direction)
                                    }
                                  />
                                  <ApplicationQuestionEditor
                                    question={q}
                                    definition={definition}
                                    edit={(patch) => edit(q.id, patch)}
                                    onDuplicate={() => duplicateQuestion(q)}
                                    onDelete={() => {
                                      setDefinition((d) => ({
                                        ...d,
                                        questions: d.questions.filter(
                                          (item) => item.id !== q.id,
                                        ),
                                      }));
                                      setSelected('');
                                      setAnnouncement(`${q.label} deleted.`);
                                    }}
                                    onDone={() => {
                                      setSelected('');
                                      focusHandle('question', q.id);
                                    }}
                                  />
                                </li>
                              ) : (
                                <li
                                  key={q.id}
                                  className="application-question-card"
                                  data-question-id={q.id}
                                  data-flip={`question:${q.id}`}
                                  data-placeholder={
                                    drag?.id === q.id || undefined
                                  }
                                  onPointerDown={(event) => {
                                    if (
                                      (event.target as HTMLElement).closest(
                                        '[data-handle]',
                                      )
                                    )
                                      return;
                                    startDrag(event, 'question', q.id);
                                  }}
                                >
                                  {editable && (
                                    <DragHandle
                                      kind="question"
                                      id={q.id}
                                      label={q.label}
                                      onPointerDown={(event) =>
                                        startDrag(event, 'question', q.id, 2)
                                      }
                                      onNudge={(direction) =>
                                        nudgeQuestion(q.id, direction)
                                      }
                                    />
                                  )}
                                  <QuestionPreview
                                    question={q}
                                    definition={definition}
                                  />
                                  {editable && (
                                    <button
                                      className="application-question-open"
                                      type="button"
                                      onClick={() => {
                                        if (suppressClick.current) return;
                                        setSelected(q.id);
                                      }}
                                    >
                                      <span className="sr-only">
                                        Edit {q.label}
                                      </span>
                                    </button>
                                  )}
                                </li>
                              ),
                            )}
                          </ol>
                          {!questions.length && (
                            <p className="application-section-empty">
                              {editable
                                ? 'No questions yet. Add one, or drag a question here.'
                                : 'No questions in this section.'}
                            </p>
                          )}
                          {editable && (
                            <Button
                              variant="tertiary"
                              size="compact"
                              type="button"
                              className="application-add-question"
                              onClick={() => addQuestion(section)}
                            >
                              <UtilityIcon name="plus" />
                              Add question to {section}
                            </Button>
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
                {editable && (
                  <Button
                    variant="secondary"
                    type="button"
                    className="application-add-section"
                    onClick={addSection}
                  >
                    <UtilityIcon name="plus" />
                    Add section
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        <div className="application-detail-sidebar application-builder-sidebar">
          <SettingsPanels
            row={row}
            definition={definition}
            setDefinition={setDefinition}
            data={data}
            timeZone={timeZone}
            editable={editable}
          />
        </div>
      </div>
      {drag &&
        createPortal(
          // On the body: the workspace keeps a transform from its entry
          // animation, which would offset a fixed element inside it.
          <div
            className="application-detail application-builder-page farmstand-controls application-drag-ghost"
            aria-hidden="true"
            style={{
              left: drag.x - drag.offsetX,
              top: drag.y - drag.offsetY,
              width: drag.width,
            }}
          >
            {dragged ? (
              <div className="application-question-card" data-ghost>
                <span className="application-drag-handle">
                  <UtilityIcon name="grip" />
                </span>
                <QuestionPreview question={dragged} definition={definition} />
              </div>
            ) : (
              <div className="application-section-block" data-ghost>
                <div className="application-section-header">
                  <span className="application-drag-handle">
                    <UtilityIcon name="grip" />
                  </span>
                  <strong>{drag.id}</strong>
                  <small>
                    {plural(
                      definition.questions.filter((q) => q.section === drag.id)
                        .length,
                      'question',
                    )}
                  </small>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
      {publishing && (
        <PublishDialog
          row={row}
          definition={definition}
          timeZone={timeZone}
          data={data}
          onClose={() => setPublishing(false)}
          onPublish={async (sharing) => {
            if (!(await autosave.save(!autosave.target.current.draft)))
              throw new Error('save');
            const draft = autosave.target.current.draft!;
            const published = (await persist({
              action: 'PUBLISH_APPLICATION',
              id: draft.id,
              expectedRevision: draft.revision,
              data: sharing,
            })) as ApplicationVersion | undefined;
            if (!published) throw new Error('publish');
            go(
              `/market/applications?application=${autosave.target.current.templateId}`,
            );
          }}
        />
      )}
    </div>
  );
}

function SaveState({ status, isNew }: { status: SaveStatus; isNew: boolean }) {
  const label =
    status === 'saving'
      ? 'Saving…'
      : status === 'pending'
        ? 'Unsaved changes'
        : status === 'saved'
          ? 'All changes saved'
          : status === 'invalid'
            ? 'Not saved: fix the issues below'
            : status === 'error'
              ? 'Not saved'
              : isNew
                ? 'Not saved yet'
                : 'No changes';
  return (
    <span className="application-save-state" data-status={status} role="status">
      {status === 'saved' && <UtilityIcon name="check" />}
      {label}
    </span>
  );
}

function DragHandle({
  kind,
  id,
  label,
  onPointerDown,
  onNudge,
}: {
  kind: DragKind;
  id: string;
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onNudge: (direction: -1 | 1) => void;
}) {
  return (
    <button
      type="button"
      className="application-drag-handle"
      data-handle={`${kind}:${id}`}
      aria-label={
        kind === 'section' ? `Move section ${label}` : `Move ${label}`
      }
      aria-describedby="application-reorder-help"
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        onNudge(event.key === 'ArrowUp' ? -1 : 1);
      }}
    >
      <UtilityIcon name="grip" />
    </button>
  );
}

function SectionHeader({
  section,
  count,
  index,
  total,
  editable,
  sections,
  onPointerDown,
  onNudge,
  onRename,
  onRemove,
  open,
  bodyId,
  onToggle,
}: {
  section: string;
  count: number;
  index: number;
  total: number;
  editable: boolean;
  sections: string[];
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onNudge: (direction: -1 | 1) => void;
  onRename: (next: string) => void;
  onRemove: () => void;
  open: boolean;
  bodyId: string;
  onToggle: () => void;
}) {
  return (
    <div className="application-section-header">
      {editable && (
        <DragHandle
          kind="section"
          id={section}
          label={section}
          onPointerDown={onPointerDown}
          onNudge={onNudge}
        />
      )}
      {editable ? (
        <Input
          aria-label={`Section name: ${section}`}
          className="application-section-name"
          defaultValue={section}
          maxLength={200}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (!next || (next !== section && sections.includes(next))) {
              e.target.value = section;
              return;
            }
            if (next !== section) onRename(next);
          }}
        />
      ) : (
        <h3>{section}</h3>
      )}
      <small>
        Section {index + 1} of {total} · {plural(count, 'question')}
      </small>
      {editable && total > 1 && (
        <IconButton
          icon="trash"
          size="compact"
          label={`Remove section ${section}`}
          onClick={onRemove}
        />
      )}
      <IconButton
        icon="chevron-down"
        size="compact"
        className="application-section-toggle"
        label={`${open ? 'Collapse' : 'Expand'} section ${section}`}
        aria-expanded={open}
        aria-controls={open ? bodyId : undefined}
        onClick={onToggle}
      />
    </div>
  );
}

function QuestionPreview({
  question: q,
  definition,
}: {
  question: ApplicationQuestion;
  definition: ApplicationDefinition;
}) {
  const trigger = q.condition
    ? definition.questions.find((p) => p.id === q.condition!.questionId)
    : undefined;
  return (
    <div className="application-question-preview">
      <fieldset disabled>
        <ApplicationFields
          definition={{
            ...definition,
            sections: [q.section],
            questions: [{ ...q, hidden: false, condition: undefined }],
          }}
          answers={{}}
        />
      </fieldset>
      <div className="application-question-tags">
        <span>{questionTypeLabels[q.type]}</span>
        {protectedField(q) && <Badge tone="neutral">Always included</Badge>}
        {q.hidden && <Badge tone="neutral">Hidden from vendors</Badge>}
        {q.condition && (
          <Badge tone="warning">
            {trigger
              ? `Shown when “${trigger.label}” matches`
              : 'Condition incomplete'}
          </Badge>
        )}
      </div>
    </div>
  );
}

function PreviewPanel({ definition }: { definition: ApplicationDefinition }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [checked, setChecked] = useState(false);
  return (
    <Panel
      icon={{ utility: 'eye' }}
      title="Preview"
      className="application-builder-preview"
    >
      <p className="application-detail-note">
        This is what vendors fill in. Try it out: nothing you enter here is
        saved or submitted.
      </p>
      <form
        className="application-builder-preview-form"
        onSubmit={(e) => {
          e.preventDefault();
          setChecked(true);
        }}
      >
        <ApplicationFields
          definition={definition}
          answers={answers}
          onAnswer={(id, v) => {
            setChecked(false);
            setAnswers((a) => ({ ...a, [id]: v }));
          }}
        />
        <Button type="submit" variant="secondary">
          Check preview answers
        </Button>
        {checked && (
          <p role="status">
            Visible required questions are answered. This preview creates no
            application or draft.
          </p>
        )}
      </form>
    </Panel>
  );
}

function SettingsPanels({
  row,
  definition,
  setDefinition,
  data,
  timeZone,
  editable,
}: {
  row?: ApplicationRow;
  definition: ApplicationDefinition;
  setDefinition: (
    update: (d: ApplicationDefinition) => ApplicationDefinition,
  ) => void;
  data: MarketOperationsData;
  timeZone?: string;
  editable: boolean;
}) {
  const dates = data.occurrences.filter(
    (o) =>
      o.status === 'scheduled' &&
      (new Date(o.startsAt) > new Date() ||
        definition.occurrenceIds.includes(o.id)),
  );
  const rentals = (data.rentals ?? []).filter(
    (r) => r.details.enabled || definition.rentalIds.includes(r.id),
  );
  const submissionWindow = windowSummary(definition, timeZone);
  const toggle = (
    key: 'occurrenceIds' | 'rentalIds',
    id: number,
    on: boolean,
  ) =>
    setDefinition((d) => ({
      ...d,
      [key]: on ? [...d[key], id] : d[key].filter((value) => value !== id),
    }));
  return (
    <>
      <Panel icon={{ farmstand: 'circle-check' }} title="Sharing">
        <dl className="market-application-facts application-builder-facts">
          <div>
            <dt>Status</dt>
            <dd>
              <ApplicationStateBadge state={row?.state ?? 'DRAFT'} />
            </dd>
          </div>
          <div>
            <dt>Who can apply</dt>
            <dd>{row ? sharingLabel(row) : 'Not published yet'}</dd>
          </div>
          <div>
            <dt>Submissions</dt>
            <dd>
              {submissionWindow.label} · {submissionWindow.detail}
            </dd>
          </div>
        </dl>
        <p className="application-detail-note">
          You choose who can see it when you publish.
        </p>
      </Panel>
      <Panel icon={{ farmstand: 'calendar-days' }} title="Submission window">
        <fieldset
          className="application-builder-fieldset"
          disabled={!editable || !timeZone}
        >
          {(['opensAt', 'closesAt'] as const).map((key) => (
            <Control
              key={key}
              label={
                key === 'opensAt'
                  ? 'Opening date and time'
                  : 'Closing date and time'
              }
            >
              {(id) => (
                <Input
                  id={id}
                  type="datetime-local"
                  value={definition.schedule?.[key] ?? ''}
                  onChange={(e) =>
                    setDefinition((d) => ({
                      ...d,
                      schedule: {
                        ...d.schedule,
                        timeZone: data.timeZone!,
                        [key]: e.target.value || undefined,
                      },
                    }))
                  }
                />
              )}
            </Control>
          ))}
        </fieldset>
        <p className="application-detail-note">
          {timeZone
            ? `Market time (${timeZone}). Leave blank for no limit. These deadlines are separate from market dates.`
            : 'The market time zone is unavailable. Reload the page.'}
        </p>
      </Panel>
      <Panel
        icon={{ farmstand: 'calendar-days' }}
        title="Market dates"
        aside={
          editable && dates.length > 1 ? (
            <Button
              variant="tertiary"
              size="compact"
              type="button"
              onClick={() =>
                setDefinition((d) => ({
                  ...d,
                  occurrenceIds:
                    d.occurrenceIds.length === dates.length
                      ? []
                      : dates.map((o) => o.id),
                }))
              }
            >
              {definition.occurrenceIds.length === dates.length
                ? 'Clear all'
                : 'Select all'}
            </Button>
          ) : undefined
        }
      >
        {dates.length ? (
          <fieldset
            className="application-builder-fieldset application-builder-choices"
            disabled={!editable}
          >
            <legend className="sr-only">Dates applicants may request</legend>
            {dates.map((o) => (
              <Check
                animated
                key={o.id}
                label={date(o.startsAt)}
                checked={definition.occurrenceIds.includes(o.id)}
                onChange={(v) => toggle('occurrenceIds', o.id, v)}
              />
            ))}
          </fieldset>
        ) : (
          <p className="application-detail-empty">
            No upcoming market dates. Add dates from Market Occurrences so
            vendors can request them.
          </p>
        )}
      </Panel>
      <Panel icon={{ farmstand: 'package' }} title="Rentals and add-ons">
        {rentals.length ? (
          <fieldset
            className="application-builder-fieldset application-builder-choices"
            disabled={!editable}
          >
            <legend className="sr-only">Available rentals and add-ons</legend>
            {rentals.map((r) => (
              <Check
                animated
                key={r.id}
                label={`${r.details.name} · ${moneyLabel(r.details.priceMinor, r.details.currency)}`}
                checked={definition.rentalIds.includes(r.id)}
                onChange={(v) => toggle('rentalIds', r.id, v)}
              />
            ))}
          </fieldset>
        ) : (
          <p className="application-detail-empty">
            No rentals or add-ons are set up for this market.
          </p>
        )}
      </Panel>
    </>
  );
}

function PublishDialog({
  row,
  definition,
  timeZone,
  data,
  onClose,
  onPublish,
}: {
  row?: ApplicationRow;
  definition: ApplicationDefinition;
  timeZone?: string;
  data: MarketOperationsData;
  onClose: () => void;
  onPublish: (sharing: {
    visibility: 'PUBLIC' | 'PRIVATE';
    advertised: boolean;
  }) => Promise<void>;
}) {
  const id = useId();
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>(
    row?.template.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
  );
  const [advertised, setAdvertised] = useState(
    row ? row.template.advertised : true,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const featured = (data.templates ?? []).find(
    (t) => t.advertised && t.id !== row?.template.id,
  );
  const submissionWindow = windowSummary(definition, timeZone);
  return (
    <Dialog
      open
      size="standard"
      title={
        row?.state === 'PUBLISHED' ? 'Publish changes' : 'Publish application'
      }
      description="Choose who can apply. You can change this the next time you publish."
      busy={busy}
      onClose={onClose}
      className="farmstand-controls application-publish-dialog"
      actions={
        <>
          <FarmstandButton
            variant="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </FarmstandButton>
          <FarmstandButton
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await onPublish({
                  visibility,
                  advertised: visibility === 'PUBLIC' && advertised,
                });
              } catch {
                setError(
                  'The application could not be published. Check your changes and try again.',
                );
                setBusy(false);
              }
            }}
          >
            Publish
          </FarmstandButton>
        </>
      }
    >
      {error && <Alert severity="error">{error}</Alert>}
      <fieldset className="application-publish-options">
        <legend>Who can apply</legend>
        <label className="application-publish-option" htmlFor={`${id}-public`}>
          <Radio
            id={`${id}-public`}
            name={`${id}-visibility`}
            checked={visibility === 'PUBLIC'}
            onChange={() => setVisibility('PUBLIC')}
          />
          <span>
            <strong>Public</strong>
            <small>Any vendor can find and open it.</small>
          </span>
        </label>
        {visibility === 'PUBLIC' && (
          <label
            className="application-publish-feature"
            htmlFor={`${id}-advertise`}
          >
            <Checkbox
              id={`${id}-advertise`}
              checked={advertised}
              onChange={(e) => setAdvertised(e.target.checked)}
            />
            <span>
              Advertise on your Market storefront
              {advertised && featured && (
                <small>
                  Replaces “{featured.name}”, which is advertised now.
                </small>
              )}
            </span>
          </label>
        )}
        <label className="application-publish-option" htmlFor={`${id}-private`}>
          <Radio
            id={`${id}-private`}
            name={`${id}-visibility`}
            checked={visibility === 'PRIVATE'}
            onChange={() => setVisibility('PRIVATE')}
          />
          <span>
            <strong>Private link</strong>
            <small>Only vendors you send the link to can apply.</small>
          </span>
        </label>
      </fieldset>
      <dl className="market-application-facts application-publish-summary">
        <div>
          <dt>Questions</dt>
          <dd>
            {plural(definition.questions.length, 'question')} in{' '}
            {plural(definition.sections.length, 'section')}
          </dd>
        </div>
        <div>
          <dt>Market dates</dt>
          <dd>
            {definition.occurrenceIds.length
              ? plural(definition.occurrenceIds.length, 'date')
              : 'None offered'}
          </dd>
        </div>
        <div>
          <dt>Submissions</dt>
          <dd>
            {submissionWindow.label} · {submissionWindow.detail}
          </dd>
        </div>
      </dl>
      {!definition.occurrenceIds.length && (
        <Alert severity="warning">
          No market dates are selected, so vendors cannot request dates with
          this application.
        </Alert>
      )}
    </Dialog>
  );
}
