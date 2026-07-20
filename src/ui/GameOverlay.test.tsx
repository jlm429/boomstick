import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GameHud } from './GameOverlay';

describe('GameHud reload reminder', () => {
  it('shows only for an empty magazine outside reload', () => {
    const { rerender } = render(
      <GameHud
        emptyFirePulse={0}
        encounterCountdown={null}
        playing
        weaponState={{ ammunition: 0, isReloading: false }}
      />,
    );
    expect(screen.getByText('R to Reload')).toBeInTheDocument();

    rerender(
      <GameHud
        emptyFirePulse={0}
        encounterCountdown={null}
        playing
        weaponState={{ ammunition: 0, isReloading: true }}
      />,
    );
    expect(screen.queryByText('R to Reload')).not.toBeInTheDocument();

    rerender(
      <GameHud
        emptyFirePulse={0}
        encounterCountdown={null}
        playing
        weaponState={{ ammunition: 10, isReloading: false }}
      />,
    );
    expect(screen.queryByText('R to Reload')).not.toBeInTheDocument();
  });

  it('restarts one reminder pulse without stacking messages', () => {
    const weaponState = { ammunition: 0, isReloading: false } as const;
    const { rerender } = render(
      <GameHud
        emptyFirePulse={1}
        encounterCountdown={null}
        playing
        weaponState={weaponState}
      />,
    );
    const firstReminder = screen.getByText('R to Reload');

    rerender(
      <GameHud
        emptyFirePulse={2}
        encounterCountdown={null}
        playing
        weaponState={weaponState}
      />,
    );

    expect(screen.getAllByText('R to Reload')).toHaveLength(1);
    expect(screen.getByText('R to Reload')).not.toBe(firstReminder);
  });

  it('shows a full-screen accessible encounter countdown without changing the HUD', () => {
    const { rerender } = render(
      <GameHud
        emptyFirePulse={0}
        encounterCountdown={3}
        playing
        weaponState={{ ammunition: 10, isReloading: false }}
      />,
    );

    expect(
      screen.getByRole('status', { name: 'Zombie encounter begins in 3' }),
    ).toHaveTextContent('3');

    rerender(
      <GameHud
        emptyFirePulse={0}
        encounterCountdown={null}
        playing
        weaponState={{ ammunition: 10, isReloading: false }}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
