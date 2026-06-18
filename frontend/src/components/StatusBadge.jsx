const STYLES = {
  pending: "bg-amber-signal/10 text-amber-signal",
  assigned: "bg-sky-signal/10 text-sky-signal",
  in_progress: "bg-sky-signal/10 text-sky-signal",
  completed: "bg-brand-light text-brand-dark",
  cancelled: "bg-ink/10 text-ink/50",
};

const LABELS = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        STYLES[status] || STYLES.pending
      }`}
    >
      {LABELS[status] || status}
    </span>
  );
}
