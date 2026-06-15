import { ReactNode } from "react";

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
    <div className="min-w-0">
      {eyebrow && <div className="label-eyebrow">{eyebrow}</div>}
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
        {title}
      </h1>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
