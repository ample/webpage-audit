interface Props {
  label?: string;
}

export default function LoadingSpinner({ label }: Props) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
