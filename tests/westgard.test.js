import { describe, it, expect } from 'vitest';
import { calculateZScore, evaluateWestgardRules } from '../src/westgard';

describe('Westgard Rules Engine', () => {
  const mean = 100;
  const sd = 5;

  it('calcola correttamente lo z-score', () => {
    expect(calculateZScore(110, 100, 5)).toBe(2);
    expect(calculateZScore(90, 100, 5)).toBe(-2);
    expect(calculateZScore(100, 100, 5)).toBe(0);
  });

  it('identifica la regola 1_2s (warning)', () => {
    const points = [
      { value: 100, batchId: 'B1' },
      { value: 111, batchId: 'B1' } // z = 2.2
    ];
    const violations = evaluateWestgardRules(points, mean, sd);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('1_2s');
    expect(violations[0].status).toBe('giallo');
  });

  it('identifica la regola 1_3s (rejection)', () => {
    const points = [
      { value: 100, batchId: 'B1' },
      { value: 116, batchId: 'B1' } // z = 3.2
    ];
    const violations = evaluateWestgardRules(points, mean, sd);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('1_3s');
    expect(violations[0].status).toBe('rosso');
  });

  it('identifica la regola 2_2s (rejection)', () => {
    const points = [
      { value: 111, batchId: 'B1' }, // z = 2.2
      { value: 112, batchId: 'B2' }  // z = 2.4
    ];
    const violations = evaluateWestgardRules(points, mean, sd);
    // Il primo scatta per 1_2s, il secondo per 2_2s
    expect(violations).toHaveLength(2);
    expect(violations[1].rule).toBe('2_2s');
    expect(violations[1].status).toBe('rosso');
  });

  it('identifica la regola R_4s (rejection nello stesso batch)', () => {
    const points = [
      { value: 111, batchId: 'B1' }, // z = 2.2
      { value: 89, batchId: 'B1' }   // z = -2.2, diff = 4.4
    ];
    const violations = evaluateWestgardRules(points, mean, sd);
    expect(violations[1].rule).toBe('R_4s');
    expect(violations[1].status).toBe('rosso');
  });

  it('NON identifica la regola R_4s (rejection in batch diversi)', () => {
    const points = [
      { value: 111, batchId: 'B1' }, // z = 2.2
      { value: 89, batchId: 'B2' }   // z = -2.2, diff = 4.4
    ];
    const violations = evaluateWestgardRules(points, mean, sd);
    // scatteranno due 1_2s
    expect(violations).toHaveLength(2);
    expect(violations[0].rule).toBe('1_2s');
    expect(violations[1].rule).toBe('1_2s');
  });

  it('identifica la regola 4_1s (rejection)', () => {
    const points = [
      { value: 106, batchId: 'B1' }, // z = 1.2
      { value: 107, batchId: 'B2' }, // z = 1.4
      { value: 108, batchId: 'B3' }, // z = 1.6
      { value: 106, batchId: 'B4' }  // z = 1.2
    ];
    const violations = evaluateWestgardRules(points, mean, sd);
    const lastViolation = violations[violations.length - 1];
    expect(lastViolation.rule).toBe('4_1s');
    expect(lastViolation.status).toBe('rosso');
  });

  it('identifica la regola 10_x (rejection)', () => {
    const points = [
      { value: 101, batchId: 'B1' },
      { value: 102, batchId: 'B2' },
      { value: 101, batchId: 'B3' },
      { value: 103, batchId: 'B4' },
      { value: 102, batchId: 'B5' },
      { value: 101, batchId: 'B6' },
      { value: 104, batchId: 'B7' },
      { value: 101, batchId: 'B8' },
      { value: 102, batchId: 'B9' },
      { value: 101, batchId: 'B10' },
    ];
    const violations = evaluateWestgardRules(points, mean, sd);
    const lastViolation = violations[violations.length - 1];
    expect(lastViolation.rule).toBe('10_x');
    expect(lastViolation.status).toBe('rosso');
  });
});
