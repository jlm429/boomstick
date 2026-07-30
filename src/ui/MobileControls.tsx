import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { type GameplayAction, type TouchInputState } from '../game/input';

function ActionButton({
  action,
  className,
  label,
  onActivate,
}: {
  action?: GameplayAction;
  className: string;
  label: string;
  onActivate: () => void;
}) {
  const activateFromPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onActivate();
  };

  return (
    <button
      type="button"
      className={`mobile-action ${className}`}
      aria-label={label}
      data-action={action}
      onClick={(event) => {
        if (event.detail === 0) onActivate();
      }}
      onPointerDown={activateFromPointer}
    >
      {label}
    </button>
  );
}

export function MobileControls({
  input,
  onPause,
}: {
  input: TouchInputState;
  onPause: () => void;
}) {
  const movementPointer = useRef<number | null>(null);
  const lookPointer = useRef<number | null>(null);
  const lookPosition = useRef({ x: 0, y: 0 });
  const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });

  const clearPointers = useCallback(() => {
    movementPointer.current = null;
    lookPointer.current = null;
    setStickPosition({ x: 0, y: 0 });
    input.clear();
  }, [input]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') clearPointers();
    };
    window.addEventListener('blur', clearPointers);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', clearPointers);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      input.clear();
    };
  }, [clearPointers, input]);

  const updateMovement = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = Math.max(1, Math.min(bounds.width, bounds.height) * 0.34);
    const x = event.clientX - (bounds.left + bounds.width / 2);
    const y = event.clientY - (bounds.top + bounds.height / 2);
    const length = Math.hypot(x, y);
    const scale = length > radius ? radius / length : 1;
    const boundedX = x * scale;
    const boundedY = y * scale;
    setStickPosition({ x: boundedX, y: boundedY });
    input.setMovement(boundedX / radius, boundedY / radius);
  };

  const startMovement = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || movementPointer.current !== null) return;
    event.preventDefault();
    event.stopPropagation();
    movementPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateMovement(event);
  };

  const moveMovement = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (movementPointer.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    updateMovement(event);
  };

  const endMovement = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (movementPointer.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    movementPointer.current = null;
    setStickPosition({ x: 0, y: 0 });
    input.setMovement(0, 0);
  };

  const startLook = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || lookPointer.current !== null) return;
    event.preventDefault();
    event.stopPropagation();
    lookPointer.current = event.pointerId;
    lookPosition.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveLook = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (lookPointer.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const movementX = event.clientX - lookPosition.current.x;
    const movementY = event.clientY - lookPosition.current.y;
    lookPosition.current = { x: event.clientX, y: event.clientY };
    input.addLook(movementX, movementY);
  };

  const endLook = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (lookPointer.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    lookPointer.current = null;
  };

  const stickStyle = {
    '--stick-x': `${stickPosition.x}px`,
    '--stick-y': `${stickPosition.y}px`,
  } as CSSProperties;

  return (
    <div
      className="mobile-controls"
      role="group"
      aria-label="Touch gameplay controls"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="mobile-look-zone"
        role="group"
        aria-label="Drag to look"
        data-testid="mobile-look-zone"
        onLostPointerCapture={endLook}
        onPointerCancel={endLook}
        onPointerDown={startLook}
        onPointerMove={moveLook}
        onPointerUp={endLook}
      />
      <div
        className="mobile-movement"
        role="group"
        aria-label="Movement stick"
        data-testid="mobile-movement"
        onLostPointerCapture={endMovement}
        onPointerCancel={endMovement}
        onPointerDown={startMovement}
        onPointerMove={moveMovement}
        onPointerUp={endMovement}
      >
        <span className="mobile-movement-ring" aria-hidden />
        <span className="mobile-movement-knob" style={stickStyle} aria-hidden />
      </div>
      <div className="mobile-actions" role="group" aria-label="Weapon and movement actions">
        <ActionButton
          action="reload"
          className="mobile-reload"
          label="Reload"
          onActivate={() => input.requestAction('reload')}
        />
        <ActionButton className="mobile-jump" label="Jump" onActivate={input.requestJump} />
        <ActionButton
          action="fire"
          className="mobile-fire"
          label="Fire"
          onActivate={() => input.requestAction('fire')}
        />
      </div>
      <ActionButton
        className="mobile-pause"
        label="Pause"
        onActivate={() => {
          clearPointers();
          onPause();
        }}
      />
    </div>
  );
}
