import { NotificationCenter } from '@market/ui/notifications';
import type { InboxNotification } from '@market/api';
const destination = (n: InboxNotification) =>
  n.destination ? `/api/notifications?id=${encodeURIComponent(n.id)}` : null;
export default function CustomerNotifications({
  view = 'inbox',
}: {
  view?: 'bell' | 'inbox' | 'settings' | 'unsubscribed';
}) {
  return <NotificationCenter customer view={view} destination={destination} />;
}
