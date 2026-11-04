import { AppError, type Customer, type LoyaltyRank } from '@market/api';
import type { VendorService } from './service';
import {
  customerName,
  customerSpend,
  readCustomersWorkspace,
} from './customers-data';

export type LeaderboardRow = LoyaltyRank & { relationship?: Customer };

export async function readLoyaltyRanks(service: VendorService) {
  const ranks: LoyaltyRank[] = [];
  const seen = new Set<number>();
  // Read every backend-ranked page before applying client-side search and sorting.
  const rankings = async () => {
    for (;;) {
      const page = await service.loyalty!.overview({
        skip: ranks.length,
        take: 100,
      });
      for (const row of page.leaderboard) {
        if (seen.has(row.id)) throw new AppError('conflict');
        seen.add(row.id);
        ranks.push(row);
      }
      if (page.leaderboard.length < page.take) break;
    }
    return ranks;
  };
  return rankings();
}

export async function readLoyaltyLeaderboard(service: VendorService) {
  const [rows, customers] = await Promise.all([
    readLoyaltyRanks(service),
    readCustomersWorkspace(service),
  ]);
  const byCustomer = new Map(
    customers.map((customer) => [String(customer.customerId), customer]),
  );
  return rows.map((row, index): LeaderboardRow => {
    // Wallet IDs are never used as customer or relationship IDs.
    const relationship = row.customerId
      ? byCustomer.get(String(row.customerId))
      : undefined;
    return {
      ...row,
      rank: row.rank ?? index + 1,
      customer: relationship ? customerName(relationship) : row.customer,
      relationship,
    };
  });
}

export function filterLeaderboard(
  rows: readonly LeaderboardRow[],
  search: string,
  sort: string,
) {
  const term = search.trim().toLocaleLowerCase();
  return rows
    .filter((row) =>
      `${row.customer} ${row.relationship?.emailAddress ?? ''}`
        .toLocaleLowerCase()
        .includes(term),
    )
    .sort((a, b) => {
      if (sort === 'lowest')
        return Number(a.earned) - Number(b.earned) || a.rank! - b.rank!;
      if (sort === 'orders') return b.orders - a.orders || a.rank! - b.rank!;
      if (sort === 'name')
        return a.customer.localeCompare(b.customer) || a.rank! - b.rank!;
      return a.rank! - b.rank!;
    });
}

export function leaderboardCsv(rows: readonly LeaderboardRow[]) {
  const cell = (value: string | number) =>
    `"${String(value)
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""')}"`;
  return [
    [
      'Rank',
      'Customer',
      'Email',
      'Net lifetime points',
      'Completed orders',
      'Total spent',
    ],
    ...rows.map((row) => [
      row.rank!,
      row.customer,
      row.relationship?.emailAddress ?? '',
      row.earned,
      row.orders,
      row.relationship ? customerSpend(row.relationship) : 'Unavailable',
    ]),
  ]
    .map((row) => row.map(cell).join(','))
    .join('\r\n');
}
