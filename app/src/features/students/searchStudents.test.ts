import { searchStudents } from './searchStudents.ts';
import type { Student } from './types.ts';

function student(name: string): Student {
  return { id: name, name, city: null, cards: [] };
}

describe('searchStudents', () => {
  const students = [student('João Pedro'), student('Ana Clara'), student('Joana')];

  it('encontra o aluno mesmo sem acento e sem maiúscula', () => {
    expect(searchStudents(students, 'joao').map((s) => s.name)).toEqual(['João Pedro']);
  });

  it('encontra pelo meio do nome', () => {
    expect(searchStudents(students, 'clara').map((s) => s.name)).toEqual(['Ana Clara']);
  });

  it('devolve todos quando a busca está vazia', () => {
    expect(searchStudents(students, '   ')).toEqual(students);
  });

  it('devolve lista vazia quando ninguém tem esse nome', () => {
    expect(searchStudents(students, 'zeca')).toEqual([]);
  });
});
