import Image from "next/image";

export default function HomeAiringCover({ src }: Readonly<{ src: string | null }>) {
  return (
    <span aria-hidden="true" className="relative block h-14 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
      {src && <Image src={src} alt="" fill sizes="40px" className="object-cover" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />}
    </span>
  );
}
