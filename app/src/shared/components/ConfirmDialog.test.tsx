import { fireEvent, render, screen } from '@testing-library/react';
import { type Confirmation, ConfirmDialog } from './ConfirmDialog.tsx';

function confirmation(onConfirm: () => void): Confirmation {
  return {
    title: 'Apagar a Van 1?',
    description: 'Não dá para desfazer.',
    confirmLabel: 'Apagar van',
    danger: true,
    onConfirm,
  };
}

describe('ConfirmDialog', () => {
  it('não mostra nada quando não há o que confirmar', () => {
    render(<ConfirmDialog confirmation={null} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('explica a ação e só executa depois da confirmação', () => {
    const onConfirm = vi.fn<() => void>();
    const onClose = vi.fn<() => void>();
    render(<ConfirmDialog confirmation={confirmation(onConfirm)} onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Apagar a Van 1?' })).toBeInTheDocument();
    expect(screen.getByText('Não dá para desfazer.')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Apagar van' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('cancelar fecha sem executar a ação', () => {
    const onConfirm = vi.fn<() => void>();
    const onClose = vi.fn<() => void>();
    render(<ConfirmDialog confirmation={confirmation(onConfirm)} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
