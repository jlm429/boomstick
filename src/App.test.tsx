import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { useAppStore } from './game/store';

vi.mock('./scene/GameViewport', () => ({
  GameViewport: ({ active }: { active: boolean }) => (
    <canvas data-active={active} data-testid="game-viewport" />
  ),
}));

describe('App navigation', () => {
  beforeEach(() => {
    useAppStore.setState({
      screen: 'main',
      gamePhase: 'entry',
      hasPointerLock: false,
      runId: 0,
    });
  });

  it('navigates menu to About and back', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'About the arena' }));
    expect(screen.getByRole('heading', { name: 'Built for velocity.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to main menu' }));
    expect(screen.getByRole('heading', { name: 'Boomstick' })).toBeInTheDocument();
  });

  it('shows a clear entry prompt before play is enabled', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByText('Ready for the arena?')).toBeInTheDocument();
    expect(screen.getByText(/captures your mouse/i)).toBeInTheDocument();
    expect(screen.getByTestId('game-viewport')).toHaveAttribute('data-active', 'false');
  });

  it('pauses on Escape and lets Resume request a new arena entry', () => {
    render(<App />);
    act(() => {
      useAppStore.setState({ screen: 'game', gamePhase: 'playing', hasPointerLock: true });
    });
    fireEvent.keyDown(window, { code: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Catch your breath.' })).toBeInTheDocument();
    expect(screen.getByTestId('game-viewport')).toHaveAttribute('data-active', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.getByText('Ready for the arena?')).toBeInTheDocument();
  });

  it('includes concise controls on the landing page', () => {
    render(<App />);
    expect(screen.getByText('by Pew Pew Labs')).toBeInTheDocument();
    expect(screen.getByText(/WASD/)).toBeInTheDocument();
  });
});
