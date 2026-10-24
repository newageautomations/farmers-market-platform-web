import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
export type InboxContext = 'customer' | 'vendor' | 'market' | 'account';
export interface MarketDayChecklist {
  occurrenceId: string;
  market: string;
  status: 'today' | 'future' | 'past' | 'canceled' | 'unavailable';
  localDate: string;
  today: string;
  timezone: string;
  generatedAt: string;
  items: Array<{
    title: string;
    status: string;
    count: number;
    explanation: string;
    href: string;
    action: string;
  }>;
}
export function createMarketDayChecklistApi(options: TransportOptions) {
  const run = transport('admin', options);
  const document = parse(
    'query OwnMarketDayChecklist($occurrenceId:String!){ownMarketDayChecklist(occurrenceId:$occurrenceId)}',
  ) as TypedDocumentNode<
    { ownMarketDayChecklist: MarketDayChecklist },
    { occurrenceId: string }
  >;
  return async (occurrenceId: string) =>
    (await run({ api: 'admin', document }, { occurrenceId }))
      .ownMarketDayChecklist;
}
export interface InboxNotification {
  delivery_active?: boolean;
  id: string;
  type: string;
  context: InboxContext;
  workspace_id: number | null;
  source_kind: string;
  source_id: number | null;
  business_name: string;
  sender: string;
  title: string;
  preview: string;
  body: string;
  category: string;
  severity: string;
  mandatory: boolean;
  action_required: boolean;
  destination: string | null;
  action_label?: string | null;
  destination_kind?: string | null;
  created_at: string;
  read_at: string | null;
  starred: boolean;
}
export interface InboxFilter {
  skip?: number;
  take?: number;
  state?: string;
  context?: string;
  workspace?: string;
  category?: string;
  severity?: string;
  actionRequired?: boolean;
  search?: string;
  from?: string;
  through?: string;
}
export interface InboxPage {
  items: InboxNotification[];
  totalItems: number;
  unread: number;
  skip: number;
  take: number;
}
export interface InboxRule {
  delivery_active?: boolean;
  type_name?: string | null;
  source_name?: string | null;
  id: string;
  type: string | null;
  category: string | null;
  context: string | null;
  workspace_id: number | null;
  source_kind: string | null;
  source_id: number | null;
  disabled: boolean;
  muted_until: string | null;
  revision: number;
}
export interface InboxSettings {
  types: Array<{
    id: string;
    name: string;
    contexts: InboxContext[];
    category: string;
    severity: string;
    mandatory: boolean;
    status: string;
    grouping: boolean;
    reminder: boolean;
  }>;
  affiliations: Array<{
    mode: string;
    id: number;
    name: string;
    channelId: string;
  }>;
  rules: InboxRule[];
  truncated: boolean;
}
export type InboxAction = 'read' | 'unread' | 'star' | 'unstar' | 'delete';
export interface InboxApi {
  list(input?: InboxFilter): Promise<InboxPage>;
  detail(id: string): Promise<InboxNotification>;
  settings(): Promise<InboxSettings>;
  mutate(input: { ids: string[]; action: InboxAction }): Promise<unknown>;
  preference(input: Record<string, unknown>): Promise<unknown>;
}
export function createInboxApi(
  options: TransportOptions & { api?: 'admin' | 'shop' },
): InboxApi {
  const api = options.api ?? 'admin',
    run = transport(api, options);
  const execute = async <T>(
    query: string,
    variables: Record<string, unknown>,
    field: string,
  ) => {
    const document = parse(query) as TypedDocumentNode<
      Record<string, T>,
      Record<string, unknown>
    >;
    return (await run({ api, document }, variables))[field]!;
  };
  return {
    list: (input = {}) =>
      execute<InboxPage>(
        'query OwnInbox($input:JSON){ownInbox(input:$input)}',
        { input },
        'ownInbox',
      ),
    detail: (id) =>
      execute<InboxNotification>(
        'query OwnInboxNotification($id:String!){ownInboxNotification(id:$id)}',
        { id },
        'ownInboxNotification',
      ),
    settings: () =>
      execute<InboxSettings>(
        'query OwnInboxSettings{ownInboxSettings}',
        {},
        'ownInboxSettings',
      ),
    mutate: (input) =>
      execute(
        'mutation UpdateOwnInbox($input:JSON!){updateOwnInbox(input:$input)}',
        { input },
        'updateOwnInbox',
      ),
    preference: (input) =>
      execute(
        'mutation SetOwnInboxPreference($input:JSON!){setOwnInboxPreference(input:$input)}',
        { input },
        'setOwnInboxPreference',
      ),
  };
}
/** Customer islands call a same-origin BFF; capability/session cookies stay HttpOnly. */
export function createCustomerInboxApi(
  endpoint = '/api/notifications',
): InboxApi {
  const call = async <T>(
    action: string,
    input: Record<string, unknown> = {},
  ) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...input }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const { AppError } = await import('./errors');
      throw new AppError(
        response.status === 401
          ? 'authentication'
          : response.status === 403
            ? 'forbidden'
            : 'unavailable',
      );
    }
    return response.json() as Promise<T>;
  };
  return {
    list: (input = {}) => call('list', { input }),
    detail: (id) => call('detail', { id }),
    settings: () => call('settings'),
    mutate: (input) => call('mutate', { input }),
    preference: (input) => call('preference', { input }),
  };
}
