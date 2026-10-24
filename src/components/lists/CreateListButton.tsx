'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddToListModal from '@/components/ui/AddToListModal';
export default function CreateListButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return <><button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Nueva lista personalizada</button><AddToListModal isOpen={open} mode="create" onClose={() => setOpen(false)} onListCreated={() => router.refresh()} /></>;
}
