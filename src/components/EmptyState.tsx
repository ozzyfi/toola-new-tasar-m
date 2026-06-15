import { ReactNode } from "react";

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="surface-card p-10 text-center flex flex-col items-center gap-3">
    {icon && (
      <div className="icon-tile w-12 h-12 text-primary">{icon}</div>
    )}
    <div className="font-display text-lg font-bold">{title}</div>
    {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
    {action && <div className="pt-1">{action}</div>}
  </div>
);

export default EmptyState;
