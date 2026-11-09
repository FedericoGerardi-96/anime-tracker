'use client';

import { useFormStatus } from 'react-dom';
import Button from '@/components/ui/Button';

export default function RecoverySubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="min-h-11 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
    {pending ? 'Procesando…' : children}
  </Button>;
}
