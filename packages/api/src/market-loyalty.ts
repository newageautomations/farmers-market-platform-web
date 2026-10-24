import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
export interface MarketChallengeTerms {
  title: string;
  description: string;
  kind: 'DISCOVERY' | 'VISITS' | 'SPENDING';
  target: number;
  minimum: number;
  occurrenceCount: number | null;
  startOccurrenceId: number | null;
  reward: string;
  instructions: string;
}
export interface MarketChallengeWindow {
  occurrence_id: number;
  label: string;
  starts_at: string;
  ends_at: string;
  skipped: boolean;
}
export interface MarketChallengeProgress {
  confirmed: number;
  pending: number;
  target: number;
  complete: boolean;
  units: number[];
}
export interface MarketChallengeEvent {
  event: string;
  detail: Record<string, unknown>;
  created_at: string;
}
export interface MarketRewardClaim {
  id: number;
  completion_id: number;
  terms: MarketChallengeTerms;
  status: 'CLAIMED' | 'FULFILLED';
  review: 'NONE' | 'REQUIRED' | 'RESOLVED';
  claimed_at: string;
  fulfilled_at: string | null;
  note: string | null;
  customer?: string;
  customer_id?: number;
  challenge_id?: number;
  valid?: boolean;
  evidence?: MarketChallengeProgress;
  earned_at?: string;
  history?: MarketChallengeEvent[];
}
export interface MarketChallenge {
  id: number;
  market_id: number;
  market_name?: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
  availability: string;
  terms: MarketChallengeTerms;
  published_at: string | null;
  closed_at: string | null;
  window: MarketChallengeWindow[];
  programEnabled?: boolean;
  stats: { participants: number; completions: number };
  progress?: MarketChallengeProgress;
  completion?: {
    id: number;
    valid: boolean;
    earned_at: string;
    terms: MarketChallengeTerms;
  };
  claim?: MarketRewardClaim;
  history?: MarketChallengeEvent[];
}
export interface MarketLoyaltyOverview {
  enabled: boolean;
  challenges: MarketChallenge[];
  claims: MarketRewardClaim[];
  metrics: {
    active: number;
    participants: number;
    completed: number;
    claimed: number;
    awaiting: number;
  };
  trend: Array<{
    id: number;
    label: string;
    customers: number;
    orders: number;
    spending: string;
  }>;
  occurrences: Array<{
    id: number;
    label: string;
    startsAt: string;
    endsAt: string;
    status: string;
  }>;
}
export function createMarketLoyaltyApi(
  options: TransportOptions,
  api: 'shop' | 'admin',
) {
  const run = transport(api, options);
  async function execute<T>(
    source: string,
    field: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const document = parse(source) as TypedDocumentNode<
      Record<string, T>,
      Record<string, unknown>
    >;
    return (await run({ api, document }, variables))[field]!;
  }
  return {
    my: () =>
      execute<MarketChallenge[]>(
        'query { myMarketChallenges }',
        'myMarketChallenges',
      ),
    claim: (id: number) =>
      execute<MarketRewardClaim>(
        'mutation($id:Int!){claimMarketChallenge(id:$id)}',
        'claimMarketChallenge',
        { id },
      ),
    overview: () =>
      execute<MarketLoyaltyOverview>(
        'query { ownMarketLoyalty }',
        'ownMarketLoyalty',
      ),
    program: (enabled: boolean) =>
      execute<{ enabled: boolean }>(
        'mutation($enabled:Boolean!){setMarketLoyaltyProgram(enabled:$enabled)}',
        'setMarketLoyaltyProgram',
        { enabled },
      ),
    save: (terms: MarketChallengeTerms, publish: boolean, id?: number) =>
      execute<MarketChallenge>(
        'mutation($terms:JSON!,$publish:Boolean,$id:Int){saveMarketChallenge(terms:$terms,publish:$publish,id:$id)}',
        'saveMarketChallenge',
        { terms, publish, id },
      ),
    status: (id: number, status: string) =>
      execute<MarketChallenge>(
        'mutation($id:Int!,$status:String!){setMarketChallengeStatus(id:$id,status:$status)}',
        'setMarketChallengeStatus',
        { id, status },
      ),
    fulfill: (id: number, note: string, resolution?: string) =>
      execute<MarketRewardClaim>(
        'mutation($id:Int!,$note:String,$resolution:String){fulfillMarketReward(id:$id,note:$note,resolution:$resolution)}',
        'fulfillMarketReward',
        { id, note, resolution },
      ),
  };
}
export type MarketLoyaltyApi = ReturnType<typeof createMarketLoyaltyApi>;
