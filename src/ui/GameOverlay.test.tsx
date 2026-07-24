import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GameHud } from './GameOverlay';

describe('GameHud reload reminder', () => {
  it('shows only for an empty magazine outside reload', () => {
    const { rerender } = render(
      <GameHud
        damageRevision={0}
        emptyFirePulse={0}
        encounterCountdown={null}
        health={100}
        lifeState="alive"
        playing
        weaponState={{ ammunition: 0, isReloading: false }}
      />,
    );
    expect(screen.getByText('R to Reload')).toBeInTheDocument();

    rerender(
      <GameHud
        damageRevision={0}
        emptyFirePulse={0}
        encounterCountdown={null}
        health={100}
        lifeState="alive"
        playing
        weaponState={{ ammunition: 0, isReloading: true }}
      />,
    );
    expect(screen.queryByText('R to Reload')).not.toBeInTheDocument();

    rerender(
      <GameHud
        damageRevision={0}
        emptyFirePulse={0}
        encounterCountdown={null}
        health={100}
        lifeState="alive"
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
        damageRevision={0}
        emptyFirePulse={1}
        encounterCountdown={null}
        health={100}
        lifeState="alive"
        playing
        weaponState={weaponState}
      />,
    );
    const firstReminder = screen.getByText('R to Reload');

    rerender(
      <GameHud
        damageRevision={0}
        emptyFirePulse={2}
        encounterCountdown={null}
        health={100}
        lifeState="alive"
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
        damageRevision={0}
        emptyFirePulse={0}
        encounterCountdown={3}
        health={100}
        lifeState="alive"
        playing
        weaponState={{ ammunition: 10, isReloading: false }}
      />,
    );

    expect(
      screen.getByRole('status', { name: 'Zombie encounter begins in 3' }),
    ).toHaveTextContent('3');

    rerender(
      <GameHud
        damageRevision={0}
        emptyFirePulse={0}
        encounterCountdown={null}
        health={100}
        lifeState="alive"
        playing
        weaponState={{ ammunition: 10, isReloading: false }}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('applies the exact health bands and only pulses critical edges while alive', () => {
    const props = {
      damageRevision: 0,
      emptyFirePulse: 0,
      encounterCountdown: null,
      lifeState: 'alive',
      playing: true,
      weaponState: { ammunition: 10, isReloading: false },
    } as const;
    const { rerender } = render(<GameHud {...props} health={61} />);
    expect(screen.getByTestId('health-module')).toHaveClass('hud-health--healthy');
    expect(screen.queryByTestId('critical-health-effect')).not.toBeInTheDocument();

    rerender(<GameHud {...props} health={31} />);
    expect(screen.getByTestId('health-module')).toHaveClass('hud-health--wounded');

    rerender(<GameHud {...props} health={1} />);
    expect(screen.getByTestId('health-module')).toHaveClass('hud-health--critical');
    expect(screen.getByTestId('critical-health-effect')).toBeInTheDocument();

    rerender(<GameHud {...props} health={0} lifeState="dying" />);
    expect(screen.getByTestId('health-module')).toHaveClass('hud-health--disabled');
    expect(screen.queryByTestId('critical-health-effect')).not.toBeInTheDocument();
  });

  it('restarts the local damage pulse without remounting the bar', () => {
    const props = {
      emptyFirePulse: 0,
      encounterCountdown: null,
      health: 95,
      lifeState: 'alive',
      playing: true,
      weaponState: { ammunition: 10, isReloading: false },
    } as const;
    const { rerender } = render(<GameHud {...props} damageRevision={1} />);
    const module = screen.getByTestId('health-module');
    const firstPulse = screen.getByTestId('health-damage-pulse');

    rerender(<GameHud {...props} damageRevision={2} health={90} />);
    expect(screen.getByTestId('health-module')).toBe(module);
    expect(screen.getByTestId('health-damage-pulse')).not.toBe(firstPulse);
  });
});
