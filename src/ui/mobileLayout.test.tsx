import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import styles from '../styles.css?raw';

describe('mobile gameplay layering', () => {
  it('anchors one HUD and control surface above the full-viewport Canvas', () => {
    const style = document.createElement('style');
    style.textContent = styles;
    document.head.append(style);
    const { container } = render(
      <main className="game-shell has-touch-controls touch-gameplay-active">
        <canvas className="game-viewport" />
        <div className="hud" />
        <div className="mobile-controls">
          <div className="mobile-movement" />
          <div className="mobile-actions" />
        </div>
      </main>,
    );
    const canvas = container.querySelector('.game-viewport')!;
    const hud = container.querySelector('.hud')!;
    const controls = container.querySelector('.mobile-controls')!;
    const movement = container.querySelector('.mobile-movement')!;
    const actions = container.querySelector('.mobile-actions')!;

    expect(getComputedStyle(canvas)).toMatchObject({ position: 'absolute', zIndex: '0' });
    expect(getComputedStyle(hud)).toMatchObject({ position: 'absolute', zIndex: '2' });
    expect(getComputedStyle(controls)).toMatchObject({ position: 'fixed', zIndex: '3' });
    expect(getComputedStyle(movement).position).toBe('fixed');
    expect(getComputedStyle(actions).position).toBe('fixed');
    expect(container.querySelectorAll('.hud')).toHaveLength(1);
    expect(container.querySelectorAll('.mobile-controls')).toHaveLength(1);

    style.remove();
  });
});
