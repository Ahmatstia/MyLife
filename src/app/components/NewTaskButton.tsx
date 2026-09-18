import TaskForm from "@/app/components/TaskForm";

export default function NewTaskButton({ stageId }: { stageId: string }) {
  return <TaskForm stageId={stageId} label="Task baru" />;
}
