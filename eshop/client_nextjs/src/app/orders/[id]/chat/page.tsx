import { notFound } from "next/navigation";
import { OrderChatClient } from "@/components/chat/OrderChatClient";
import { serverGet } from "@/lib/api/django";
import type { ChatMessage, OrderChat, Paginated } from "@/types/storefront";

export default async function OrderChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chat = await serverGet<OrderChat | null>(`/storefront/orders/mine/${id}/chat/`);
  const history = chat ? await serverGet<Paginated<ChatMessage>>(`/storefront/orders/mine/${id}/chat/messages/`) : null;
  if (!Number.isFinite(Number(id))) notFound();
  return <OrderChatClient orderId={Number(id)} initialChat={chat} initialMessages={history?.results ?? []} />;
}
