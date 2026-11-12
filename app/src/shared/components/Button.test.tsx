import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button.tsx';

describe('Button', () => {
  it('enquanto a ação está em andamento, avisa e não aceita outro toque', () => {
    const onClick = vi.fn<() => void>();
    render(
      <Button loading loadingLabel="Salvando..." onClick={onClick}>
        Salvar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Salvando...' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
