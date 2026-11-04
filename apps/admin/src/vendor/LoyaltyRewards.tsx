import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { safeError, type LoyaltyReward, type LoyaltyTerms } from '@market/api';
import { formatMoney } from '@market/config';
import {
  Alert,
  Badge,
  Dialog,
  Dropdown,
  EmptyState,
  Field,
  Pagination,
  UtilityIcon,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { ReadState, useRead } from './common';
import { LoyaltyIcon } from './LoyaltyIcon';
import { LoyaltyRewardWizard } from './LoyaltyRewardWizard';
import type { VendorService } from './service';
import './loyalty-rewards.css';

const statusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Paused',
  ARCHIVED: 'Archived',
  DRAFT: 'Draft',
};
export function rewardDescription(terms: LoyaltyTerms) {
  return (
    terms.description ||
    (terms.kind === 'FREE_PRODUCT'
      ? `Redeem for ${terms.quantity} free product${terms.quantity === 1 ? '' : 's'}.`
      : terms.kind === 'FIXED'
        ? `Get ${formatMoney(terms.value, 'USD')} off eligible products.`
        : `Save ${terms.value}% on eligible products, up to ${formatMoney(terms.maximum, 'USD')}.`)
  );
}

/** Domain composition over the existing native Dropdown and Farmstand actions. */
function RewardActions({
  reward,
  disabled,
  onEdit,
  onStatus,
}: {
  reward: LoyaltyReward;
  disabled: boolean;
  onEdit: () => void;
  onStatus: (status: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({});
  const close = useCallback((restoreFocus = false) => {
    const details = root.current?.querySelector('details');
    if (details?.open) {
      details.open = false;
      if (restoreFocus) root.current?.querySelector('summary')?.focus();
    }
  }, []);
  useEffect(() => {
    const pointer = (event: PointerEvent) => {
      if (
        !(event.target instanceof Node) ||
        !root.current?.contains(event.target)
      )
        close();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    const scroll = (event: Event) => {
      if (
        !(event.target instanceof Node) ||
        !root.current?.contains(event.target)
      )
        close();
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', keyboard);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', scroll);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('keydown', keyboard);
      document.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', scroll);
    };
  }, [close]);
  return (
    <div
      ref={root}
      className="reward-actions"
      style={position}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          close();
      }}
    >
      <Dropdown
        onToggle={(event) => {
          if (!event.currentTarget.open) return;
          const rect = root.current!.getBoundingClientRect();
          const menu = event.currentTarget.querySelector<HTMLElement>(
            '.ui-disclosure-content',
          );
          const width = menu?.offsetWidth ?? 180;
          const height = menu?.offsetHeight ?? 180;
          setPosition({
            '--reward-menu-left': `${Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width))}px`,
            '--reward-menu-top': `${Math.max(8, rect.bottom + 8 + height > window.innerHeight ? rect.top - height - 8 : rect.bottom + 8)}px`,
          } as CSSProperties);
        }}
        label={
          <>
            <span aria-hidden="true">Actions</span>
            <span className="sr-only">Actions for {reward.terms.name}</span>
            <UtilityIcon name="chevron-down" />
          </>
        }
      >
        <FarmstandButton
          variant="tertiary"
          disabled={disabled}
          onClick={() => {
            close(true);
            onEdit();
          }}
        >
          <UtilityIcon name="edit" />
          Edit
        </FarmstandButton>
        <FarmstandButton
          variant="tertiary"
          disabled={disabled}
          onClick={() => {
            close(true);
            onStatus(reward.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
          }}
        >
          {reward.status === 'ACTIVE' ? (
            <LoyaltyIcon name="pause" />
          ) : (
            <UtilityIcon name="check" />
          )}
          {reward.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </FarmstandButton>
        <FarmstandButton
          variant="tertiary"
          disabled={disabled}
          onClick={() => {
            close(true);
            onStatus('ARCHIVED');
          }}
        >
          <FarmstandIcon name="archive" />
          Archive
        </FarmstandButton>
      </Dropdown>
    </div>
  );
}

/** Existing primitives do not provide the reward catalog, filtering or lifecycle controller. */
export function LoyaltyRewards({
  service,
  createRequest = 0,
  initialRewardId,
  onEditorClose,
}: {
  service: VendorService;
  createRequest?: number;
  initialRewardId?: number;
  onEditorClose: () => void;
}) {
  const api = service.loyalty!;
  const read = useCallback(() => api.overview(), [api]);
  const query = useRead(`loyalty-rewards:${service.vendorId}`, read);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(0);
  const [editing, setEditor] = useState<LoyaltyReward | 'new'>();
  const [pending, setPending] = useState<{
    reward: LoyaltyReward;
    status: string;
  }>();
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState('');
  const manage = service.context.permissions.includes('ManageOwnCoupon');
  const editor =
    editing ??
    (manage && createRequest
      ? 'new'
      : manage && initialRewardId
        ? query.data?.rewards.find(
            (row) => row.id === initialRewardId && row.status !== 'ARCHIVED',
          )
        : undefined);
  const rewards = query.data?.rewards ?? [];
  const visible = rewards
    .filter(
      (reward) =>
        (!status || reward.status === status) &&
        (!kind ||
          (kind === 'DISCOUNT'
            ? reward.terms.kind !== 'FREE_PRODUCT'
            : reward.terms.kind === kind)) &&
        `${reward.terms.name} ${rewardDescription(reward.terms)}`
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === 'points'
        ? a.terms.points - b.terms.points || a.id - b.id
        : sort === 'redemptions'
          ? (b.redemptions ?? 0) - (a.redemptions ?? 0) || a.id - b.id
          : a.terms.name.localeCompare(b.terms.name) || a.id - b.id,
    );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(visible.length / 20) - 1),
  );
  const shown = visible.slice(currentPage * 20, (currentPage + 1) * 20);
  function closeEditor() {
    setEditor(undefined);
    onEditorClose();
  }
  async function changeStatus() {
    if (!pending || saving.current || uncertain || !manage) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await api.save(pending.reward.terms, pending.status, pending.reward.id);
      setNotice(
        `${pending.reward.terms.name} ${pending.status === 'ARCHIVED' ? 'archived' : pending.status === 'ACTIVE' ? 'activated' : 'deactivated'}.`,
      );
      setPending(undefined);
      query.refresh();
    } catch (cause) {
      const error = safeError(cause);
      setError(error.message);
      if (['network', 'unavailable', 'graphql', 'unknown'].includes(error.kind))
        setUncertain(true);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="loyalty-rewards" aria-label="Loyalty rewards">
      <ReadState {...query} retry={query.refresh} />
      {notice && (
        <p role="status" className="sr-only">
          {notice}
        </p>
      )}
      {query.data && (
        <>
          <div className="rewards-summary">
            {(['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const).map((state) => (
              <FarmstandPanel
                key={state}
                className="rewards-stat"
                aria-label={`${statusLabels[state]} rewards`}
              >
                <span className="rewards-stat-icon" data-status={state}>
                  {state === 'ARCHIVED' ? (
                    <FarmstandIcon name="archive" />
                  ) : (
                    <LoyaltyIcon name={state === 'ACTIVE' ? 'gift' : 'pause'} />
                  )}
                </span>
                <div>
                  <strong>
                    {rewards
                      .filter((reward) => reward.status === state)
                      .length.toLocaleString()}
                  </strong>
                  <span>{statusLabels[state]} Rewards</span>
                </div>
              </FarmstandPanel>
            ))}
          </div>
          <div className="rewards-toolbar">
            <Field
              id="rewards-search"
              label={<span className="sr-only">Search rewards</span>}
            >
              <FarmstandSearch
                id="rewards-search"
                placeholder="Search rewards..."
                maxLength={120}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
              />
            </Field>
            <Field
              id="rewards-status"
              label={<span className="sr-only">Reward status</span>}
            >
              <FarmstandSelect
                id="rewards-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(0);
                }}
              >
                <option value="">Status: All</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FarmstandSelect>
            </Field>
            <Field
              id="rewards-kind"
              label={<span className="sr-only">Reward type</span>}
            >
              <FarmstandSelect
                id="rewards-kind"
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value);
                  setPage(0);
                }}
              >
                <option value="">Type: All</option>
                <option value="DISCOUNT">Discount</option>
                <option value="FREE_PRODUCT">Free product</option>
              </FarmstandSelect>
            </Field>
            <Field
              id="rewards-sort"
              label={<span className="sr-only">Sort rewards</span>}
            >
              <FarmstandSelect
                id="rewards-sort"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(0);
                }}
              >
                <option value="name">Sort: Name (A–Z)</option>
                <option value="points">Sort: Points cost</option>
                <option value="redemptions">Sort: Most redeemed</option>
              </FarmstandSelect>
            </Field>
          </div>
          {shown.length ? (
            <FarmstandPanel className="rewards-table-panel">
              <FarmstandTable
                label="Loyalty rewards"
                headings={[
                  'Reward',
                  'Points Cost',
                  'Reward Type',
                  'Status',
                  'Redemptions',
                  'Actions',
                ]}
              >
                {shown.map((reward) => (
                  <tr key={reward.id}>
                    <th scope="row">
                      <div className="reward-identity">
                        <span className="reward-thumbnail">
                          <LoyaltyIcon name="gift" />
                          {reward.terms.image ? (
                            <img
                              src={reward.terms.image}
                              alt=""
                              width="48"
                              height="48"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.hidden = true;
                              }}
                            />
                          ) : null}
                        </span>
                        <span>
                          <strong>{reward.terms.name}</strong>
                          <span>{rewardDescription(reward.terms)}</span>
                        </span>
                      </div>
                    </th>
                    <td>{reward.terms.points.toLocaleString()} pts</td>
                    <td>
                      <span className="reward-kind">
                        {reward.terms.kind === 'FREE_PRODUCT' ? (
                          <LoyaltyIcon name="gift" />
                        ) : (
                          <FarmstandIcon name="tag" />
                        )}
                        {reward.terms.kind === 'FREE_PRODUCT'
                          ? 'Free Product'
                          : 'Discount'}
                      </span>
                    </td>
                    <td>
                      <Badge
                        className={`farmstand-stock-badge${reward.status === 'ACTIVE' ? ' farmstand-stock-in' : ''}`}
                        tone={
                          reward.status === 'ACTIVE'
                            ? 'success'
                            : reward.status === 'INACTIVE'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {statusLabels[reward.status] ?? reward.status}
                      </Badge>
                    </td>
                    <td>
                      {reward.redemptions === undefined
                        ? 'Unavailable'
                        : reward.redemptions.toLocaleString()}
                    </td>
                    <td>
                      {manage && reward.status !== 'ARCHIVED' ? (
                        <RewardActions
                          reward={reward}
                          disabled={busy || query.loading || uncertain}
                          onEdit={() => setEditor(reward)}
                          onStatus={(status) => {
                            setError('');
                            setPending({ reward, status });
                          }}
                        />
                      ) : (
                        <span className="rewards-readonly">
                          {reward.status === 'ARCHIVED'
                            ? 'Archived'
                            : 'Read only'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </FarmstandTable>
            </FarmstandPanel>
          ) : (
            <EmptyState
              title={
                rewards.length ? 'No rewards match' : 'Create your first reward'
              }
            >
              <p>
                {rewards.length
                  ? 'Try another search or filter.'
                  : 'Choose a discount or an item from your own catalog.'}
              </p>
              {!!rewards.length && (
                <FarmstandButton
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setStatus('');
                    setKind('');
                    setPage(0);
                  }}
                >
                  Clear filters
                </FarmstandButton>
              )}
            </EmptyState>
          )}
          {visible.length > 20 && (
            <Pagination
              label="Reward pages"
              summary={`${currentPage * 20 + 1}–${Math.min((currentPage + 1) * 20, visible.length)} of ${visible.length} rewards`}
              hasPrevious={currentPage > 0}
              hasNext={(currentPage + 1) * 20 < visible.length}
              onPrevious={() => setPage(currentPage - 1)}
              onNext={() => setPage(currentPage + 1)}
            />
          )}
        </>
      )}
      <Dialog
        open={!!editor && manage}
        title={editor === 'new' ? 'Create reward' : 'Edit reward'}
        size="wide"
        busy={busy}
        onClose={closeEditor}
      >
        {editor && (
          <LoyaltyRewardWizard
            key={editor === 'new' ? 'new' : editor.versionId}
            service={service}
            onCancel={closeEditor}
            onPublished={closeEditor}
            onBusyChange={setBusy}
            initial={editor === 'new' ? undefined : editor}
            onSave={async (terms, status) => {
              await api.save(
                terms,
                status,
                editor === 'new' ? undefined : editor.id,
              );
              if (status === 'DRAFT') closeEditor();
              query.refresh();
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={!!pending}
        title={
          pending?.status === 'ARCHIVED'
            ? 'Archive reward?'
            : pending?.status === 'ACTIVE'
              ? 'Activate reward?'
              : 'Deactivate reward?'
        }
        busy={busy}
        onClose={() => {
          if (!busy) {
            setPending(undefined);
            setError('');
          }
        }}
      >
        <p>{pending?.reward.terms.name}</p>
        <p>
          {pending?.status === 'ARCHIVED'
            ? 'Archived rewards cannot be edited or reactivated.'
            : pending?.status === 'INACTIVE'
              ? 'Pause this reward for new qualifications. You can activate it again later.'
              : 'Make this reward available for new qualifications.'}{' '}
          Existing issued rewards and qualified versions retain their promised
          terms.
        </p>
        {error && <Alert severity="error">{error}</Alert>}
        {uncertain && (
          <Alert severity="warning">
            The save result could not be confirmed. Reload this page and check
            the reward before trying again.
          </Alert>
        )}
        <div className="actions">
          <FarmstandButton
            variant="secondary"
            disabled={busy}
            onClick={() => setPending(undefined)}
          >
            Cancel
          </FarmstandButton>
          <FarmstandButton
            variant={pending?.status === 'ARCHIVED' ? 'destructive' : 'primary'}
            loading={busy}
            disabled={uncertain}
            onClick={() => void changeStatus()}
          >
            {pending?.status === 'ARCHIVED'
              ? 'Archive reward'
              : pending?.status === 'ACTIVE'
                ? 'Activate reward'
                : 'Deactivate reward'}
          </FarmstandButton>
        </div>
      </Dialog>
    </section>
  );
}
