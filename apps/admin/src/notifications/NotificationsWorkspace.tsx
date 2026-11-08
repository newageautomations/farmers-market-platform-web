import type { ReactNode } from 'react';
import {
  notificationsHref,
  notificationsView,
  type AdminScope,
  type NotificationsView,
} from '@market/admin-core';
import { WorkspaceFrame, type WorkspaceTab } from '../WorkspaceFrame';

const views: Array<Omit<WorkspaceTab<NotificationsView>, 'href'>> = [
  { value: 'inbox', label: 'Inbox', icon: 'inbox' },
  { value: 'trash', label: 'Trash', icon: 'trash' },
  { value: 'settings', label: 'Settings', icon: 'settings' },
  { value: 'unsubscribed', label: 'Unsubscribed', icon: 'bell-off' },
];

/**
 * Admin heading and segmented menu for the shared notification inbox, matching
 * Settings and Loyalty. Routes live under the role (`/vendor/notifications`,
 * `/market/notifications`, `/platform/notifications`) so a refresh keeps it,
 * and menu changes navigate in-app.
 */
export function NotificationsWorkspace({
  scope,
  path,
  navigate,
  children,
}: {
  scope: AdminScope;
  path: string;
  navigate: (href: string) => void;
  children: (view: NotificationsView) => ReactNode;
}) {
  const view = notificationsView(scope, path) ?? 'inbox';
  return (
    <WorkspaceFrame
      className="notifications-workspace"
      icon="bell"
      title="Notifications"
      description="Updates for every account you can access, in one inbox."
      tabs={views.map((tab) => ({
        ...tab,
        href: notificationsHref(scope, tab.value),
      }))}
      value={view}
      onChange={(next) => navigate(notificationsHref(scope, next))}
    >
      {children(view)}
    </WorkspaceFrame>
  );
}
