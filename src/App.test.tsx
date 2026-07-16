import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { useAppStore } from './game/store';

vi.mock('./scene/GameViewport', () => ({
  GameViewport: ({ active }: { active: boolean }) => (
    <div data-active={active} data-testid="game-viewport" />
  ),
}));

describe('App navigation', () => {
  beforeEach(() => {
    useAppStore.setState({ screen: 'main', isPaused: false, hasPointerLock: false, runId: 0 });
  });

  it('navigates menu to About and back', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    expect(screen.getByRole('heading', { name: 'Built for velocity.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to main menu' }));
    expect(screen.getByRole('heading', { name: 'Boomstick' })).toBeInTheDocument();
  });

  it('pauses on Escape and resumes from the dialog', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.keyDown(window, { code: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Catch your breath.' })).toBeInTheDocument();
    expect(screen.getByTestId('game-viewport')).toHaveAttribute('data-active', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('game-viewport')).toHaveAttribute('data-active', 'true');
  });

  it('keeps Settings visibly unavailable', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Settings/ })).toBeDisabled();
  });
});
