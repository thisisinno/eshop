import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return <EmptyState title="Not found" action={<ButtonLink href="/">Go home</ButtonLink>}>This page or product is not available.</EmptyState>;
}
