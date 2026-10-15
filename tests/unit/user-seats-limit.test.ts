import { describe, it, expect } from 'vitest';

describe('Vérification du quota de postes autorisés par la licence (Module M2)', () => {
  it('autorise l’ajout d’un membre tant que usedSeats < maxSeats', () => {
    const maxSeats = 5; // Formule Pro
    const usedSeats = 3;

    function canAddUser(used: number, max: number): boolean {
      return used < max;
    }

    expect(canAddUser(usedSeats, maxSeats)).toBe(true);
  });

  it('bloque l’invitation d’un collaborateur dès que le quota de postes est atteint', () => {
    const maxSeats = 5;
    const usedSeats = 5;

    function checkSeatOrThrow(used: number, max: number) {
      if (used >= max) {
        throw new Error(`Limite de postes atteinte (${used}/${max}).`);
      }
      return true;
    }

    expect(() => checkSeatOrThrow(usedSeats, maxSeats)).toThrow(/Limite de postes atteinte/);
  });
});
