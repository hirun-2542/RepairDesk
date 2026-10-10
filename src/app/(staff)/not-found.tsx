import { NotFoundCard } from "@/components/not-found-card";

/**
 * Boundary for the staff area: an authenticated staff member denied a page (wrong role or
 * someone else's job) sees this inside the app shell, not a shell-less root 404. It renders
 * no job data — only the role-denial message.
 */
export default function StaffNotFound() {
  return <NotFoundCard />;
}
