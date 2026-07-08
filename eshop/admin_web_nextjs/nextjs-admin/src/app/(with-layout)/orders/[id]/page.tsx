import { OrderDetailPage } from "@/components/admin/order-pages";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <OrderDetailPage id={id} />;
}
