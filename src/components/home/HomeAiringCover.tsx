import Image from "next/image";

export default function HomeAiringCover({ src, size = 'small' }: Readonly<{ src: string | null; size?: 'small' | 'medium' }>) {
  return (
    <span aria-hidden="true" className={`relative block shrink-0 overflow-hidden rounded-md border border-border bg-muted ${size === 'medium' ? 'h-20 w-14' : 'h-14 w-10'}`}>
      {src && <Image src={src} alt="" fill sizes={size === 'medium' ? '56px' : '40px'} className="object-cover" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />}
    </span>
  );
}
