import { CategoryFormPage } from "@/components/admin/catalog-pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <CategoryFormPage id={(await params).id} />; }
