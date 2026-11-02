import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  safeError,
  type AppError,
  type TeamApi,
  type TeamMember,
  type TeamPolicy,
  type TeamInvitation,
  type EmployeeRole,
} from '@market/api';
import type { AdminContext } from '@market/admin-core';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Radio,
  SelectField,
  Spinner,
} from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import { canReadTeam } from './service';
import './team.css';

const label = (value: string) =>
  value
    .replace(
      /^(ReadOwn|ManageOwn|ConfigureOwn|RequestOwn|OperateOwn|Manage)/,
      '$1 ',
    )
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/Own /g, '')
    .replace(/\bCRM\b/g, 'customer relationships')
    .replace(/\bPos\b/g, 'point of sale');
const roleLabel = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);
const group = (value: string) =>
  /Billing|Finance|Refund|Payment|Coupon/.test(value)
    ? 'Payments and billing'
    : /Catalog|Inventory|Orders|Pos/.test(value)
      ? 'Products and orders'
      : /Documents|Communications|Marketing|CRM|Analytics/.test(value)
        ? 'Documents and relationships'
        : /Team|Membership|Identity|Storefront/.test(value)
          ? 'Business and team'
          : 'Market operations';
const date = (value: string) => new Date(value).toLocaleString();

function Permissions({
  policy,
  selected,
  onChange,
  ceiling = false,
  disabled = false,
}: {
  policy: TeamPolicy;
  selected: readonly string[];
  onChange: (values: string[]) => void;
  ceiling?: boolean;
  disabled?: boolean;
}) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const options = [...new Set([...policy.grantablePermissions, ...selected])];
  return (
    <div className="team-permissions">
      {[...new Set(options.map(group))].map((section) => (
        <details
          key={section}
          className={disclosureClassName()}
          open={openSection === section}
        >
          <summary
            onClick={(event) => {
              event.preventDefault();
              setOpenSection(openSection === section ? null : section);
            }}
          >
            {section}
          </summary>
          <div className="ui-disclosure-content">
            {options
              .filter((p) => group(p) === section)
              .map((permission) => (
                <label className="team-permission" key={permission}>
                  <Checkbox
                    checked={selected.includes(permission)}
                    disabled={
                      disabled ||
                      !policy.grantablePermissions.includes(permission) ||
                      (!ceiling && permission === policy.basePermission)
                    }
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...selected, permission]
                          : selected.filter((p) => p !== permission),
                      )
                    }
                  />
                  <span>
                    {label(permission)}
                    {!ceiling && permission === policy.basePermission && (
                      <small>Required workspace access</small>
                    )}
                  </span>
                </label>
              ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function AccessForm({
  policy,
  member,
  busy,
  blocked,
  onSave,
  onCancel,
}: {
  policy: TeamPolicy;
  member?: TeamMember;
  busy: boolean;
  blocked: boolean;
  onSave: (
    role: EmployeeRole,
    permissions: string[],
    ceiling: string[],
    email: string,
  ) => void;
  onCancel: () => void;
}) {
  const initial =
    policy.presets.find((p) => p.role === 'staff') ?? policy.presets[0]!;
  const [role, setRole] = useState<EmployeeRole>(
    (member?.role ?? initial.role) as EmployeeRole,
  );
  const [permissions, setPermissions] = useState<string[]>([
    ...(member?.permissions ?? initial.permissions),
  ]);
  const [ceiling, setCeiling] = useState<string[]>([
    ...(member?.delegationCeiling ?? []),
  ]);
  const [email, setEmail] = useState('');
  const readonly = !!member && !member.canManage;
  const valid = permissions.includes(policy.basePermission);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!busy && !blocked && !readonly && valid)
      onSave(role, permissions, ceiling, email.trim());
  }
  return (
    <form className="team-access-form" onSubmit={submit}>
      {!member && (
        <Field label="Email address" id="team-invite-email">
          <Input
            id="team-invite-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            disabled={busy || blocked}
            onChange={(e) => setEmail(e.target.value)}
          />
          <small>No account yet? They can create one when they accept.</small>
        </Field>
      )}
      {!readonly && (
        <fieldset className="team-roles" disabled={busy || blocked}>
          <legend>Choose a role preset</legend>
          <div>
            {policy.presets.map((preset) => (
              <label key={preset.role} data-selected={role === preset.role}>
                <span>
                  <Radio
                    name={member ? 'employee-role' : 'invitation-role'}
                    value={preset.role}
                    checked={role === preset.role}
                    onChange={() => {
                      setRole(preset.role as EmployeeRole);
                      setPermissions([...preset.permissions]);
                      if (preset.role !== 'administrator') setCeiling([]);
                    }}
                  />
                  {roleLabel(preset.role)}
                </span>
                <small>
                  {preset.role === 'administrator'
                    ? 'Delegable business access'
                    : preset.role === 'lead'
                      ? 'Daily operations'
                      : 'Everyday support'}
                </small>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="team-permission-title">
        <span>
          {readonly ? 'Effective permissions' : 'Fine-tune permissions'}
        </span>
        <small>{permissions.length} selected</small>
      </div>
      {!readonly && (
        <p className="team-muted">
          Presets suggest access. Check or uncheck to customize.
        </p>
      )}
      <Permissions
        policy={policy}
        selected={permissions}
        onChange={setPermissions}
        disabled={readonly || busy || blocked}
      />
      {policy.owner && role === 'administrator' && (
        <details className="ui-disclosure">
          <summary>Administrator delegation ceiling</summary>
          <p>
            Choose what this administrator may grant to Staff and Leads. An
            empty ceiling delegates nothing. Their own permissions also limit
            delegation.
          </p>
          <Permissions
            policy={policy}
            selected={ceiling}
            onChange={setCeiling}
            ceiling
            disabled={readonly || busy || blocked}
          />
        </details>
      )}
      {!readonly && (
        <div className="team-form-footer">
          {!member && (
            <p className="team-muted">
              Invitations expire after seven days. Only acceptance activates
              access.
            </p>
          )}
          {!valid && (
            <Alert severity="warning">
              Your delegation ceiling does not include required workspace
              access. Ask the Owner to update it.
            </Alert>
          )}
          <div className="team-actions">
            <Button variant="secondary" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={blocked || !valid}>
              {member ? 'Save access' : 'Send invitation'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

async function allPages<T>(read: (skip: number) => Promise<readonly T[]>) {
  const rows: T[] = [];
  for (let skip = 0; ; skip += 100) {
    const page = await read(skip);
    rows.push(...page);
    if (page.length < 100) return rows;
  }
}
type Snapshot = {
  policy: TeamPolicy;
  members: readonly TeamMember[];
  invitations: readonly TeamInvitation[];
};
export function TeamWorkspace({
  api,
  context,
}: {
  api?: TeamApi;
  context: AdminContext;
}) {
  if (!canReadTeam(context))
    return (
      <EmptyState title="Team management is restricted">
        <p>Ask your business Owner about access.</p>
      </EmptyState>
    );
  if (!api) return <EmptyState title="Connect to manage your team" />;
  return (
    <TeamContent
      key={`${context.scope}:${JSON.stringify(context.subject)}`}
      api={api}
      context={context}
    />
  );
}
function TeamContent({
  api,
  context,
}: {
  api: TeamApi;
  context: AdminContext;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [error, setError] = useState<AppError>();
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [invite, setInvite] = useState(true);
  const [formKey, setFormKey] = useState(0);
  const [member, setMember] = useState<TeamMember>();
  const [confirm, setConfirm] = useState<{
    member?: TeamMember;
    invitation?: TeamInvitation;
  }>();
  const generation = useRef(0),
    lock = useRef(false),
    alive = useRef(true);
  async function refresh() {
    const request = ++generation.current;
    setLoading(true);
    setMember(undefined);
    setConfirm(undefined);
    setSnapshot(undefined);
    setError(undefined);
    setBlocked(true);
    try {
      const [policy, members, invitations] = await Promise.all([
        api.policy(),
        allPages(api.members),
        allPages(api.invitations),
      ]);
      if (alive.current && request === generation.current) {
        setSnapshot({ policy, members, invitations });
        setBlocked(false);
        setFormKey((k) => k + 1);
      }
    } catch (e) {
      if (alive.current && request === generation.current)
        setError(safeError(e));
    } finally {
      if (alive.current && request === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void refresh();
    });
    return () => {
      cancelled = true;
      alive.current = false;
      // This is a request counter, not a DOM ref. Invalidate every pending read.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++generation.current;
    };
  }, [api]); // eslint-disable-line react-hooks/exhaustive-deps
  async function run(action: () => Promise<unknown>, success: string) {
    if (lock.current) return;
    const request = generation.current;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    setNotice('');
    try {
      await action();
      if (alive.current && request === generation.current) {
        setNotice(success);
        await refresh();
      }
    } catch (e) {
      if (!alive.current || request !== generation.current) return;
      const safe = safeError(e);
      setError(safe);
      if (safe.kind === 'conflict') setBlocked(true);
      if (safe.kind === 'forbidden' || safe.kind === 'authentication') {
        setSnapshot(undefined);
        setMember(undefined);
        setConfirm(undefined);
        setBlocked(true);
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  // Detail reads retain their panel instead of performing mutation refresh.
  async function details(id: string) {
    if (lock.current) return;
    const request = generation.current;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const detail = await api.member(id);
      if (alive.current && request === generation.current && detail) {
        setMember(detail);
        setBlocked(false);
      }
    } catch (e) {
      if (alive.current && request === generation.current) {
        setError(safeError(e));
        setSnapshot(undefined);
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const visible = snapshot?.members.filter(
    (m) =>
      (role === 'all' || m.role === role) &&
      `${m.name} ${m.email ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="team-workspace" aria-label="Team and permissions">
      <header className="team-heading">
        <div>
          <h2>Good markets grow together.</h2>
          <p>Manage your team and give everyone the right tools to help.</p>
        </div>
        <div className="team-actions">
          <Button
            variant="secondary"
            disabled={busy || loading}
            onClick={() => void refresh()}
          >
            Refresh team
          </Button>
          <Button
            disabled={!snapshot || busy}
            onClick={() => {
              setInvite(true);
              requestAnimationFrame(() =>
                document.getElementById('team-invite-email')?.focus(),
              );
            }}
          >
            Invite member
          </Button>
        </div>
      </header>
      {notice && (
        <Alert severity="success">
          <span role="status">{notice}</span>
        </Alert>
      )}
      {error && (
        <>
          <ErrorState error={error} />
          {error.kind === 'conflict' && (
            <Alert severity="warning">
              Employee access changed in another session. Refresh the team to
              load current access before saving.
            </Alert>
          )}
          <Button disabled={busy || loading} onClick={() => void refresh()}>
            Reload team
          </Button>
        </>
      )}
      {loading && <Spinner label="Loading team and invitations" />}
      {snapshot && (
        <div className="team-columns">
          <div className="team-directory">
            <Card padding="none">
              <div className="team-directory-header">
                <div className="team-count">
                  <strong>Your team</strong>
                  <span>{snapshot.members.length} members</span>
                </div>
                <p className="team-muted">The people behind {context.name}.</p>
                <div className="team-filters">
                  <Field label="Search your team" id="team-search">
                    <Input
                      id="team-search"
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </Field>
                  <SelectField
                    label="Role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="all">All roles</option>
                    {['owner', 'administrator', 'lead', 'staff'].map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
              <ul className="team-members">
                {visible?.map((m) => (
                  <li key={m.id} className="team-member">
                    <div className="team-member-top">
                      <span className="team-avatar" aria-hidden="true">
                        {m.name
                          .split(/\s+/)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <div className="team-identity">
                        <Button
                          variant="tertiary"
                          disabled={busy}
                          onClick={() => void details(m.id)}
                        >
                          {m.name}
                        </Button>
                        {m.email && <small>{m.email}</small>}
                        {String(m.id) ===
                          String(snapshot.policy.membershipId) && (
                          <small>Your account</small>
                        )}
                      </div>
                      <span>{roleLabel(m.role)}</span>
                      <Badge
                        tone={m.status === 'active' ? 'success' : 'neutral'}
                      >
                        {roleLabel(m.status)}
                      </Badge>
                    </div>
                    <div className="team-member-bottom">
                      <small>
                        {m.role === 'owner'
                          ? 'Protected business ownership'
                          : `${m.permissions.length} effective permissions`}
                      </small>
                      {m.canManage && (
                        <div className="team-actions">
                          <Button
                            variant="tertiary"
                            size="compact"
                            disabled={busy}
                            onClick={() => void details(m.id)}
                          >
                            Edit permissions
                          </Button>
                          <Button
                            variant="destructive-outline"
                            size="compact"
                            disabled={busy}
                            onClick={() => setConfirm({ member: m })}
                          >
                            Revoke access
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {!visible?.length && (
                <EmptyState title="No matching team members">
                  <p>Try a different name or role.</p>
                </EmptyState>
              )}
            </Card>
            <Card>
              <div className="team-count">
                <strong>Pending invitations</strong>
                <span>{snapshot.invitations.length}</span>
              </div>
              {snapshot.invitations.length === 0 ? (
                <p className="team-muted">
                  No invitations awaiting acceptance.
                </p>
              ) : (
                <ul className="team-invitations">
                  {snapshot.invitations.map((i) => (
                    <li key={i.id}>
                      <div>
                        <strong>{i.email}</strong>
                        <Badge tone="warning">Awaiting acceptance</Badge>
                      </div>
                      <p>
                        {roleLabel(i.role)} · Expires {date(i.expiresAt)}
                      </p>
                      <small>
                        {i.deliveredAt
                          ? `Email delivered ${date(i.deliveredAt)}`
                          : 'Email delivery queued'}
                      </small>
                      {i.canManage && (
                        <div className="team-actions">
                          <Button
                            variant="tertiary"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                () => api.resend(String(i.id)),
                                'Invitation resent. Previous links no longer work.',
                              )
                            }
                          >
                            Resend
                          </Button>
                          <Button
                            variant="destructive-outline"
                            disabled={busy}
                            onClick={() => setConfirm({ invitation: i })}
                          >
                            Cancel invitation
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card surface="embedded">
              <strong>Access that fits each person</strong>
              <p className="team-muted">
                Roles are a starting point. Customize access for the work each
                person does. Business ownership stays protected.
              </p>
            </Card>
          </div>
          {invite && (
            <Card className="team-invite">
              <div className="team-invite-heading">
                <strong>Invite a team member</strong>
                <p className="team-muted">
                  A little help goes a long way. Choose the access they need.
                </p>
              </div>
              <AccessForm
                key={formKey}
                policy={snapshot.policy}
                busy={busy}
                blocked={blocked}
                onCancel={() => setInvite(false)}
                onSave={(role, permissions, _ceiling, email) =>
                  void run(
                    () => api.invite({ role, permissions, email }),
                    'Invitation created. Access begins when the recipient accepts.',
                  )
                }
              />
            </Card>
          )}
        </div>
      )}
      <Dialog
        open={!!member}
        title={
          member
            ? `${member.name} · ${roleLabel(member.role)}`
            : 'Employee access'
        }
        onClose={() => setMember(undefined)}
        busy={busy}
        size="wide"
      >
        {member && error && <ErrorState error={error} />}
        {member && blocked && (
          <Alert severity="warning">
            Reload the team before saving changes.
          </Alert>
        )}
        {member && snapshot && (
          <>
            <p>
              <Badge tone={member.status === 'active' ? 'success' : 'neutral'}>
                {roleLabel(member.status)}
              </Badge>
            </p>
            <AccessForm
              key={`${member.id}:${member.grantRevision}`}
              policy={snapshot.policy}
              member={member}
              busy={busy}
              blocked={blocked}
              onCancel={() => setMember(undefined)}
              onSave={(role, permissions, delegationCeiling) =>
                void run(
                  () =>
                    api.change({
                      id: member.id,
                      role,
                      permissions,
                      delegationCeiling:
                        snapshot.policy.owner && role === 'administrator'
                          ? delegationCeiling
                          : undefined,
                      expectedRevision: member.grantRevision,
                      revoke: false,
                    }),
                  'Employee access updated.',
                )
              }
            />
            {member.canManage && (
              <Button
                variant="destructive-outline"
                disabled={busy}
                onClick={() => setConfirm({ member })}
              >
                Revoke employee access
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Reload current access
            </Button>
          </>
        )}
      </Dialog>
      <Dialog
        open={!!confirm}
        title={
          confirm?.member ? 'Revoke employee access?' : 'Cancel invitation?'
        }
        onClose={() => setConfirm(undefined)}
        busy={busy}
        size="standard"
        actions={
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirm(undefined)}
            >
              Keep access
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              disabled={blocked}
              onClick={() => {
                if (confirm?.member) {
                  const m = confirm.member;
                  void run(
                    () =>
                      api.change({
                        id: m.id,
                        role: m.role as EmployeeRole,
                        permissions: [],
                        delegationCeiling: undefined,
                        expectedRevision: m.grantRevision,
                        revoke: true,
                      }),
                    'Employee access revoked. Other business memberships are preserved.',
                  );
                } else if (confirm?.invitation)
                  void run(
                    () => api.cancel(String(confirm.invitation!.id)),
                    'Invitation canceled. Its link can no longer grant access.',
                  );
              }}
            >
              Confirm {confirm?.member ? 'revocation' : 'cancellation'}
            </Button>
          </>
        }
      >
        <p>
          {confirm?.member
            ? `${confirm.member.name} will lose access to ${context.name}.`
            : `${confirm?.invitation?.email ?? 'This recipient'} will no longer be able to accept this invitation.`}
        </p>
        {confirm && error && <ErrorState error={error} />}
        {confirm && blocked && (
          <Alert severity="warning">Refresh the team before retrying.</Alert>
        )}
      </Dialog>
    </section>
  );
}
