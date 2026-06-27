// Notification center (phone) — worker surface.
// Server component: reads the signed-in user's notifications + unread count,
// then hands them to the client feed which renders the New / Earlier groups and
// the two-step push-permission soft-ask (primer card → priming sheet).
// Mutations (mark read / mark all read) run via the server actions in lib/notifications.

import { listMyNotifications, unreadCount } from "@/lib/notifications";
import NotificationsClient, { type FeedItem } from "./NotificationsClient";

// Always read fresh data from the database on each request.
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [rows, unread] = await Promise.all([
    listMyNotifications({ take: 50 }),
    unreadCount(),
  ]);

  const items: FeedItem[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? "",
    link: n.link ?? null,
    unread: n.readAt == null,
    createdAt: (n.createdAt instanceof Date ? n.createdAt : new Date(n.createdAt)).toISOString(),
  }));

  return <NotificationsClient items={items} unreadCount={unread} />;
}
