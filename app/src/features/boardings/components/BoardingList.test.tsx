import { render, screen, within } from '@testing-library/react';
import { BoardingList } from './BoardingList.tsx';

describe('BoardingList', () => {
  it('mostra o nome de cada aluno que embarcou, na ordem recebida', () => {
    render(
      <BoardingList
        boardings={[
          {
            id: 2,
            vanId: 'v1',
            studentId: 's2',
            studentName: 'Bruna',
            boardedAt: '2026-10-31T21:05:00Z',
          },
          {
            id: 1,
            vanId: 'v1',
            studentId: 's1',
            studentName: 'Arthur',
            boardedAt: '2026-10-31T21:00:00Z',
          },
        ]}
      />,
    );

    const items = within(screen.getByRole('list', { name: 'Embarques de hoje' })).getAllByRole(
      'listitem',
    );
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Bruna'),
      expect.stringContaining('Arthur'),
    ]);
  });

  it('avisa quando ninguém embarcou ainda', () => {
    render(<BoardingList boardings={[]} />);

    expect(screen.getByText('Ninguém embarcou ainda')).toBeInTheDocument();
  });

  it('marca como novo só o embarque que acabou de chegar', () => {
    render(
      <BoardingList
        highlightId={2}
        boardings={[
          {
            id: 2,
            vanId: 'v1',
            studentId: 's2',
            studentName: 'Bruna',
            boardedAt: '2026-10-31T21:05:00Z',
          },
          {
            id: 1,
            vanId: 'v1',
            studentId: 's1',
            studentName: 'Arthur',
            boardedAt: '2026-10-31T21:00:00Z',
          },
        ]}
      />,
    );

    const [newest, oldest] = screen.getAllByRole('listitem');
    expect(within(newest!).getByText('Novo')).toBeInTheDocument();
    expect(within(oldest!).queryByText('Novo')).not.toBeInTheDocument();
  });
});
