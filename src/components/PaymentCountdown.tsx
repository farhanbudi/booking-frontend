import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PaymentCountdown({
  expiresAt,
  onExpire,
}: {
  expiresAt: string;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    new Date(expiresAt).getTime() - Date.now()
  );

  useEffect(() => {
    const target = new Date(expiresAt).getTime();
    const timer = setInterval(() => {
      const diff = target - Date.now();
      setRemaining(diff);
      if (diff <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const expired = remaining <= 0;
  return (
    <span
      className={
        expired
          ? "text-danger text-xs font-medium"
          : "text-accent text-xs font-medium"
      }
    >
      {expired ? "Kedaluwarsa" : `Sisa waktu: ${formatRemaining(remaining)}`}
    </span>
  );
}
