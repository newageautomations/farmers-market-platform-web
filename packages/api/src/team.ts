import { transport, type TransportOptions } from './transport';
import {
  TeamPolicyDocument,
  TeamMembersDocument,
  TeamMemberDocument,
  TeamInvitationsDocument,
  TeamInviteDocument,
  TeamResendDocument,
  TeamCancelDocument,
  TeamChangeDocument,
  type TeamMemberFieldsFragment,
  type TeamInvitationFieldsFragment,
  type TeamPolicyQuery,
  type InviteBusinessEmployeeInput,
  type ChangeBusinessEmployeeInput,
} from './generated/admin';
export type TeamMember = TeamMemberFieldsFragment;
export type TeamInvitation = TeamInvitationFieldsFragment;
export type TeamPolicy = TeamPolicyQuery['ownBusinessTeamPolicy'];
export type EmployeeRole = InviteBusinessEmployeeInput['role'];
export function createTeamApi(options: TransportOptions) {
  const run = transport('admin', options);
  return {
    policy: async () =>
      (await run({ api: 'admin', document: TeamPolicyDocument }, {}))
        .ownBusinessTeamPolicy,
    members: async (skip = 0) =>
      (await run({ api: 'admin', document: TeamMembersDocument }, { skip }))
        .ownBusinessTeam,
    member: async (id: string) =>
      (await run({ api: 'admin', document: TeamMemberDocument }, { id }))
        .ownBusinessTeamMember,
    invitations: async (skip = 0) =>
      (await run({ api: 'admin', document: TeamInvitationsDocument }, { skip }))
        .ownBusinessEmployeeInvitations,
    invite: async (input: InviteBusinessEmployeeInput) =>
      (await run({ api: 'admin', document: TeamInviteDocument }, { input }))
        .inviteBusinessEmployee,
    resend: async (id: string) =>
      (await run({ api: 'admin', document: TeamResendDocument }, { id }))
        .resendBusinessEmployeeInvitation,
    cancel: async (id: string) =>
      (await run({ api: 'admin', document: TeamCancelDocument }, { id }))
        .cancelBusinessEmployeeInvitation,
    change: async (input: ChangeBusinessEmployeeInput) =>
      (await run({ api: 'admin', document: TeamChangeDocument }, { input }))
        .changeBusinessEmployee,
  };
}
export type TeamApi = ReturnType<typeof createTeamApi>;
