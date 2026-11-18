import { NotificationCenter } from '@market/ui/notifications';
// The shared inbox composes Farmstand panels, search, selects and paging.
import '@market/ui/farmstand.css';
import type { InboxNotification } from '@market/api';
const destination = (n: InboxNotification) =>
  n.destination ? `/api/notifications?id=${encodeURIComponent(n.id)}` : null;
export default function CustomerNotifications({
  view = 'inbox',
  tabs = true,
  compactBell = false,
}: {
  view?: 'bell' | 'inbox' | 'trash' | 'settings' | 'unsubscribed';
  /** False when the page renders the workspace menu (as Admin does). */
  tabs?: boolean;
  /** The compact shell's icon bell with a floating menu. */
  compactBell?: boolean;
}) {
  return (
    <NotificationCenter
      customer
      view={view}
      tabs={tabs}
      compactBell={compactBell}
      destination={destination}
      basePath="/account/notifications"
    />
  );
}
