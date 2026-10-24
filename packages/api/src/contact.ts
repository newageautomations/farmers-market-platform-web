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
}
export interface ContactSubmission extends ContactSummary {
  email: string;
  phone: string;
  subject: string;
  message: string;
  order_number: string;
}
export interface ContactPage {
  items: ContactSummary[];
  totalItems: number;
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
    list: async (skip = 0) =>
      (
        await execute(
          {
            api: 'admin',
            document: document<
              { vendorContactSubmissions: ContactPage },
              { skip: number }
            >(
              'query VendorContactSubmissions($skip:Int!){vendorContactSubmissions(skip:$skip)}',
            ),
          },
          { skip },
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
