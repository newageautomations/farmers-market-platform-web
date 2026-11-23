import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
export interface ContactSubmissionInput {
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  orderNumber: string;
  idempotencyKey: string;
  /** Market forms: answers to the manager's custom fields, by field id. */
  answers?: Array<{ id: string; value: string }>;
}
export interface ContactSummary {
  id: string;
  full_name: string;
  created_at: string;
  read_at: string | null;
  /** Present from backends that list contact summaries with their topic. */
  email?: string;
  subject?: string;
  order_number?: string;
}
export interface ContactSubmission extends ContactSummary {
  email: string;
  phone: string;
  subject: string;
  message: string;
  order_number: string;
  /** Market website messages: the answers to the market's own form fields. */
  answers?: Array<{ label: string; value: string }>;
}
export type ContactStatusFilter = 'read' | 'unread';
export interface ContactPage {
  items: ContactSummary[];
  /** Matching the requested status filter. */
  totalItems: number;
  allItems?: number;
  unreadItems?: number;
  recentItems?: number;
}
const document = <R, V>(s: string) => parse(s) as TypedDocumentNode<R, V>;
export function createPublicContactApi(options: TransportOptions) {
  const execute = transport('shop', options);
  return {
    submit: async (input: ContactSubmissionInput) =>
      (
        await execute(
          {
            api: 'shop',
            document: document<
              { submitStorefrontContact: { accepted: boolean } },
              { input: ContactSubmissionInput }
            >(
              'mutation SubmitStorefrontContact($input:JSON!){submitStorefrontContact(input:$input)}',
            ),
          },
          { input },
        )
      ).submitStorefrontContact,
  };
}
/** A business's own contact inbox: a vendor's, or a market's website messages. */
function createContactInboxApi(
  options: TransportOptions,
  owner: 'vendor' | 'market',
) {
  const Owner = owner === 'vendor' ? 'Vendor' : 'Market';
  const execute = transport('admin', options);
  return {
    list: async (skip = 0, status?: ContactStatusFilter) =>
      (
        await execute(
          {
            api: 'admin',
            document: document<
              Record<string, ContactPage>,
              { skip: number; status: ContactStatusFilter | null }
            >(
              // Unfiltered reads omit the argument so older backends still answer.
              status
                ? `query ${Owner}ContactSubmissions($skip:Int!,$status:String){${owner}ContactSubmissions(skip:$skip,status:$status)}`
                : `query ${Owner}ContactSubmissions($skip:Int!){${owner}ContactSubmissions(skip:$skip)}`,
            ),
          },
          (status ? { skip, status } : { skip }) as {
            skip: number;
            status: ContactStatusFilter | null;
          },
        )
      )[`${owner}ContactSubmissions`]!,
    detail: async (id: string) =>
      (
        await execute(
          {
            api: 'admin',
            document: document<
              Record<string, ContactSubmission>,
              { id: string }
            >(
              `query ${Owner}ContactSubmission($id:String!){${owner}ContactSubmission(id:$id)}`,
            ),
          },
          { id },
        )
      )[`${owner}ContactSubmission`]!,
    read: async (id: string, read: boolean) =>
      (
        await execute(
          {
            api: 'admin',
            document: document<
              Record<string, ContactSubmission>,
              { id: string; read: boolean }
            >(
              `mutation Set${Owner}ContactRead($id:String!,$read:Boolean!){set${Owner}ContactRead(id:$id,read:$read)}`,
            ),
          },
          { id, read },
        )
      )[`set${Owner}ContactRead`]!,
  };
}
export function createVendorContactApi(options: TransportOptions) {
  return createContactInboxApi(options, 'vendor');
}
export function createMarketContactApi(options: TransportOptions) {
  return createContactInboxApi(options, 'market');
}
export type VendorContactApi = ReturnType<typeof createVendorContactApi>;
