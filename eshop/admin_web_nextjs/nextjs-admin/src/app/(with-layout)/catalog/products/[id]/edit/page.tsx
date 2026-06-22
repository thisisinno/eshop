import { ProductFormPage } from "@/components/admin/catalog-pages";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ProductFormPage id={(await params).id} />; }
