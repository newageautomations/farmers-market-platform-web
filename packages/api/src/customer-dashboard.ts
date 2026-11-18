import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import * as shop from './generated/shop';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';

/**
 * Saved customer Overview arrangement: reading order, hidden sections and
 * grid cells. Presentation only; each section's data is read separately.
 */
export interface CustomerDashboardLayout {
  order: string[];
  hidden: string[];
  grid?: Array<{ id: string; x: number; y: number; w: number; h: number }>;
}
const layoutRead = parse(
  'query CustomerDashboardLayout { customerDashboardLayout }',
) as TypedDocumentNode<
  { customerDashboardLayout: unknown },
  Record<string, never>
>;
const layoutSave = parse(
  'mutation SaveCustomerDashboardLayout($layout: JSON!) { saveCustomerDashboardLayout(layout: $layout) }',
) as TypedDocumentNode<
  { saveCustomerDashboardLayout: boolean },
  { layout: CustomerDashboardLayout }
>;
export type CustomerDashboard =
  shop.CustomerDashboardQuery['customerDashboard'];
export type CustomerFollow = shop.CustomerFollowFragment;
export type CustomerEvent = shop.CustomerEventFragment;
export type CustomerSubjectPage =
  shop.CustomerFollowSubjectsQuery['customerFollowSubjects'];
export function createCustomerDashboardApi(
  options: TransportOptions & { channelToken: string },
) {
  const execute = transport('shop', options);
  return {
    read: async (section = 'overview', skip = 0, eventSkip = 0) =>
      (
        await execute(
          { api: 'shop', document: shop.CustomerDashboardDocument },
          { section, skip, eventSkip },
        )
      ).customerDashboard,
    subjects: async (kind: string, search = '', skip = 0) =>
      (
        await execute(
          { api: 'shop', document: shop.CustomerFollowSubjectsDocument },
          { kind, search, skip },
        )
      ).customerFollowSubjects,
    follow: async (kind: string, id: string, following: boolean) =>
      (
        await execute(
          { api: 'shop', document: shop.SetCustomerFollowDocument },
          { kind, id, following },
        )
      ).setCustomerFollow,
    layout: async () =>
      (await execute({ api: 'shop', document: layoutRead }, {}))
        .customerDashboardLayout as Partial<CustomerDashboardLayout> | null,
    saveLayout: async (layout: CustomerDashboardLayout) => {
      const result = await execute(
        { api: 'shop', document: layoutSave },
        { layout },
      );
      if (!result.saveCustomerDashboardLayout) throw new AppError('validation');
    },
  };
}
