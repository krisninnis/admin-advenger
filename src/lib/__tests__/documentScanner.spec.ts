import { describe, it, expect } from 'vitest';
import { detectDocumentFromPixels, orderCornerPoints, validateDocumentQuad } from '../../src/lib/documentScanner';

describe('documentScanner basic tests', () => {
  it('orderCornerPoints orders 4 points into a quad', () => {
    const points = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 300 },
      { x: 100, y: 300 },
    ];

    const quad = orderCornerPoints(points);
    expect(quad.topLeft.x).toBe(100);
    expect(quad.topLeft.y).toBe(100);
    expect(quad.bottomRight.x).toBe(200);
    expect(quad.bottomRight.y).toBe(300);
  });

  it('validateDocumentQuad rejects invalid dimensions', () => {
    const quad = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 10, y: 0 },
      bottomRight: { x: 10, y: 10 },
      bottomLeft: { x: 0, y: 10 },
    };

    const result = validateDocumentQuad(quad as any, 0, 0);
    expect(result.valid).toBe(false);
  });

  it('detectDocumentFromPixels rejects empty image', () => {
    const pixels = new Uint8ClampedArray([]);
    const result = detectDocumentFromPixels(pixels, 0, 0);
    expect(result.status).toBe('rejected');
  });
});
