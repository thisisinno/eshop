import { ProductDetailPage } from "@/components/admin/catalog-pages";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ProductDetailPage id={(await params).id} />; }
