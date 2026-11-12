import { useState } from 'react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog.tsx';
import { IconLogout } from '@/shared/components/icons.tsx';
import { signOut } from '../services/authService.ts';

// "Sair" sempre pergunta antes: um toque sem querer não tira a pessoa do app
export function SignOutButton({ className = '' }: { className?: string }) {
  const [asking, setAsking] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-3 text-base font-semibold transition-[background-color,transform] duration-150 active:scale-[0.97] ${className}`}
        onClick={() => setAsking(true)}
      >
        <IconLogout className="size-5" />
        Sair
      </button>
      <ConfirmDialog
        confirmation={
          asking
            ? {
                title: 'Sair do BipCheck?',
                description:
                  'Para voltar, você vai precisar digitar seu e-mail e sua senha de novo.',
                confirmLabel: 'Sair',
                onConfirm: () => void signOut(),
              }
            : null
        }
        onClose={() => setAsking(false)}
      />
    </>
  );
}
