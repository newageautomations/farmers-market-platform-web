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
export function createVendorContactApi(options: TransportOptions) {
  const execute = transport('admin', options);
  return {
    list: async (skip = 0, status?: ContactStatusFilter) =>
      (
        await execute(
          {
            api: 'admin',
            document: document<
              { vendorContactSubmissions: ContactPage },
              { skip: number; status: ContactStatusFilter | null }
            >(
              // Unfiltered reads omit the argument so older backends still answer.
              status
                ? 'query VendorContactSubmissions($skip:Int!,$status:String){vendorContactSubmissions(skip:$skip,status:$status)}'
                : 'query VendorContactSubmissions($skip:Int!){vendorContactSubmissions(skip:$skip)}',
            ),
          },
          (status ? { skip, status } : { skip }) as {
            skip: number;
            status: ContactStatusFilter | null;
          },
        )
      ).vendorContactSubmissions,
    detail: async (id: string) =>
      (
        await execute(
          {
            api: 'admin',
            document: document<
              { vendorContactSubmission: ContactSubmission },
              { id: string }
            >(
              'query VendorContactSubmission($id:String!){vendorContactSubmission(id:$id)}',
            ),
          },
          { id },
        )
      ).vendorContactSubmission,
    read: async (id: string, read: boolean) =>
      (
        await execute(
          {
            api: 'admin',
            document: document<
              { setVendorContactRead: ContactSubmission },
              { id: string; read: boolean }
            >(
              'mutation SetVendorContactRead($id:String!,$read:Boolean!){setVendorContactRead(id:$id,read:$read)}',
            ),
          },
          { id, read },
        )
      ).setVendorContactRead,
  };
}
export type VendorContactApi = ReturnType<typeof createVendorContactApi>;
