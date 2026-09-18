import { redirect } from "next/navigation";

export default function ActivityPage() {
  redirect("/progress?tab=log");
}
