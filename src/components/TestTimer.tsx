import { useEffect, useState } from 'react';

interface Props {
  startTime: Date | null;
}

export default function TestTimer({ startTime }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const updateElapsed = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsed(diff);
    };

    // Update immediately
    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime) return null;

  return (
    <div className="text-sm text-slate-300">
      Test started {elapsed} second{elapsed !== 1 ? 's' : ''} ago
    </div>
  );
}
