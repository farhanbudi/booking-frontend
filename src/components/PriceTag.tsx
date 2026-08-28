import { formatIDR, isPaidResource } from "../api/client";
import type { Resource } from "../api/client";

export function PriceTag({ resource }: { resource: Resource }) {
  const paid = isPaidResource(resource);
  return (
    <p className="text-sm mt-1">
      {paid ? (
        <span className="text-accent font-medium">
          {formatIDR(resource.pricePerHour as number)}/jam
        </span>
      ) : (
        <span className="text-muted">Gratis</span>
      )}
    </p>
  );
}
