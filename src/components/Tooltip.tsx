export default function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 cursor-pointer text-slate-300" title={label} aria-label={label}>
      {children}
    </span>
  );
}
