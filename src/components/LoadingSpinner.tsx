interface Props {
  label?: string;
}

export default function LoadingSpinner({ label }: Props) {
  return (
    <div className="flex items-center gap-3 text-gray-700">
      <svg
        className="h-7 w-7"
        viewBox="0 0 44 44"
        fill="none"
        role="img"
        aria-label={label || 'Loading'}
      >
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0495DF" />
            <stop offset="100%" stopColor="#00A3FF" />
          </linearGradient>
        </defs>
        <circle
          cx="22"
          cy="22"
          r="18"
          stroke="url(#g)"
          strokeWidth="4"
          strokeLinecap="round"
          className="spinner-track"
          style={{ opacity: 0.25 }}
        />
        <path
          d="M40 22a18 18 0 0 0-18-18"
          stroke="url(#g)"
          strokeWidth="4"
          strokeLinecap="round"
          className="spinner-arc"
        />
      </svg>
      {label && <span className="text-white text-base">{label}</span>}

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .spinner-arc {
          transform-origin: 22px 22px;
          animation: spin 0.9s linear infinite;
        }
      `}</style>
    </div>
  );
}
