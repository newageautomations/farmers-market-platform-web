import { NotificationCenter } from '@market/ui/notifications';
// The shared inbox composes Farmstand panels, search, selects and paging.
import '@market/ui/farmstand.css';
import type { InboxNotification } from '@market/api';
const destination = (n: InboxNotification) =>
  n.destination ? `/api/notifications?id=${encodeURIComponent(n.id)}` : null;
export default function CustomerNotifications({
  view = 'inbox',
}: {
  view?: 'bell' | 'inbox' | 'trash' | 'settings' | 'unsubscribed';
}) {
  return (
    <NotificationCenter
      customer
      view={view}
      destination={destination}
      basePath="/account/notifications"
    />
  );
}
