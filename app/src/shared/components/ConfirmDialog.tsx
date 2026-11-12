import { useEffect, useId, useRef } from 'react';
import { Button } from './Button.tsx';

export type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  // Ação que apaga ou desfaz algo: o botão de confirmar fica vermelho
  danger?: boolean;
  onConfirm: () => void;
};

type ConfirmDialogProps = { confirmation: Confirmation | null; onClose: () => void };

// Pergunta antes de uma ação importante. No celular aparece embaixo, perto do polegar.
export function ConfirmDialog({ confirmation, onClose }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const open = confirmation !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    // showModal prende o foco e fecha com Esc; o atributo é a reserva para navegadores antigos
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    return () => {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    };
  }, [open]);

  if (!confirmation) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none rounded-t-3xl bg-white p-5 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] text-slate-900 backdrop:bg-slate-900/60 sm:inset-0 sm:m-auto sm:max-w-md sm:rounded-3xl"
    >
      <h2 id={titleId} className="text-2xl font-bold">
        {confirmation.title}
      </h2>
      <p id={descriptionId} className="mt-2 text-slate-700">
        {confirmation.description}
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <Button
          variant={confirmation.danger ? 'danger' : 'primary'}
          onClick={() => {
            onClose();
            confirmation.onConfirm();
          }}
        >
          {confirmation.confirmLabel}
        </Button>
        {/* O foco começa no "Cancelar": um Enter sem querer nunca apaga nada */}
        <Button variant="secondary" autoFocus onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </dialog>
  );
}
