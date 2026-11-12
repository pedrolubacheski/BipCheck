import type { Student } from './types.ts';

// Ignora maiúsculas e acentos: "joao" encontra "João"
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function searchStudents(students: Student[], query: string): Student[] {
  const wanted = normalize(query);
  if (!wanted) return students;
  return students.filter((student) => normalize(student.name).includes(wanted));
}
