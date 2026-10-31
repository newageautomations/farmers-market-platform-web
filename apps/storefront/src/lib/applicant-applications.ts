import type { APIContext } from 'astro';
import {
  createApplicantApplicationsApi,
  type ApplicantApplicationsApi,
} from '@market/api';
import { accountBridge, isCentral } from './account';
import { loyaltyTransport } from './shop';
export function applicantApplicationsApi(
  context: APIContext,
): ApplicantApplicationsApi {
  if (!isCentral(context.url))
    return createApplicantApplicationsApi(loyaltyTransport(context));
  const central = context.cookies.get('platform-unified-account')?.value ?? '';
  return {
    read: <T>(input = {}) =>
      accountBridge<T>({ action: 'applicantApplications', central, input }),
    command: <T>(command: string, input: Record<string, unknown>) =>
      accountBridge<T>({
        action: 'applicantApplicationCommand',
        central,
        command,
        input,
      }),
  };
}
