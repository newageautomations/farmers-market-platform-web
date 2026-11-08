/** Inclusive account-local calendar dates for a finance period preset. */
export function financeDates(
  preset: string,
  now = new Date(),
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const today = new Date(
    part('year') + '-' + part('month') + '-' + part('day') + 'T00:00:00Z',
  );
  let start = new Date(today),
    end = new Date(today);
  if (preset === 'month') start.setUTCDate(1);
  else if (preset === 'last-month') {
    start = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1),
    );
    end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  } else start = new Date(today.getTime() - (Number(preset) - 1) * 86400000);
  return {
    from: start.toISOString().slice(0, 10),
    through: end.toISOString().slice(0, 10),
  };
}

/** Exclusive day after an inclusive finance `through` date, for UTC projection ranges. */
export function dayAfter(date: string) {
  return new Date(Date.parse(date + 'T00:00:00Z') + 86400000)
    .toISOString()
    .slice(0, 10);
}
