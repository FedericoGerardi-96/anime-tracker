interface LoaderProps { label?: string; className?: string; size?: "sm" | "md" | "lg" }

export default function Loader({ label, className = "", size = "md" }: Readonly<LoaderProps>) {
  const sizes = { sm: "size-4 border-2", md: "size-8 border-2", lg: "size-12 border-[3px]" };
  return <div role="status" aria-live="polite" className={`flex items-center justify-center gap-3 text-sm text-muted-foreground ${className}`}>
    <span aria-hidden="true" className={`${sizes[size]} animate-spin rounded-full border-primary/25 border-t-primary`} />
    {label && <span>{label}</span>}
  </div>;
}
