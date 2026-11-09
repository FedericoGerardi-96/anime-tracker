'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddToListModal from '@/components/ui/AddToListModal';
export default function CreateListButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return <><button type="button" onClick={() => setOpen(true)} className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-normal text-primary-foreground"><span aria-hidden="true" className="text-xl leading-none">+</span>Nueva lista</button><AddToListModal isOpen={open} mode="create" onClose={() => setOpen(false)} onListCreated={() => router.refresh()} /></>;
}
