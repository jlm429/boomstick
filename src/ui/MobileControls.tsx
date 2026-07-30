import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { type GameplayAction, type TouchInputState } from '../game/input';

export const MOBILE_TAP_MOVE_THRESHOLD_PX = 10;
export const MOBILE_TAP_MAX_DURATION_MS = 250;

type LookGesture = {
  pointerId: number;
  startedAtMs: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  maximumDisplacementPx: number;
  cameraMovement: boolean;
  tapEligible: boolean;
  movementPointerIdAtStart: number | null;
};

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
  const activePointers = useRef(new Set<number>());
  const movementPointer = useRef<number | null>(null);
  const movementRegion = useRef<HTMLDivElement | null>(null);
  const lookPointers = useRef(new Set<number>());
  const lookGesture = useRef<LookGesture | null>(null);
  const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });

  const clearPointers = useCallback(() => {
    activePointers.current.clear();
    movementPointer.current = null;
    lookPointers.current.clear();
    lookGesture.current = null;
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
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    lookPointers.current.add(event.pointerId);
    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (lookPointers.current.size > 1) {
      if (lookGesture.current) lookGesture.current.tapEligible = false;
      return;
    }

    lookGesture.current = {
      pointerId: event.pointerId,
      startedAtMs: performance.now(),
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      maximumDisplacementPx: 0,
      cameraMovement: false,
      tapEligible: [...activePointers.current].every(
        (pointerId) => pointerId === event.pointerId || pointerId === movementPointer.current,
      ),
      movementPointerIdAtStart: movementPointer.current,
    };
  };

  const updateLook = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = lookGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const displacementX = event.clientX - gesture.startX;
    const displacementY = event.clientY - gesture.startY;
    gesture.maximumDisplacementPx = Math.max(
      gesture.maximumDisplacementPx,
      Math.hypot(displacementX, displacementY),
    );

    let movementX = 0;
    let movementY = 0;
    if (
      !gesture.cameraMovement &&
      gesture.maximumDisplacementPx >= MOBILE_TAP_MOVE_THRESHOLD_PX
    ) {
      gesture.cameraMovement = true;
      movementX = displacementX;
      movementY = displacementY;
    } else if (gesture.cameraMovement) {
      movementX = event.clientX - gesture.lastX;
      movementY = event.clientY - gesture.lastY;
    }
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
    if (movementX !== 0 || movementY !== 0) input.addLook(movementX, movementY);
  };

  const moveLook = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (lookGesture.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    updateLook(event);
  };

  const finishLook = (event: ReactPointerEvent<HTMLDivElement>, allowTap: boolean) => {
    if (!lookPointers.current.has(event.pointerId)) return;
    event.preventDefault();
    event.stopPropagation();
    lookPointers.current.delete(event.pointerId);

    const gesture = lookGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (allowTap) updateLook(event);
    lookGesture.current = null;

    const durationMs = performance.now() - gesture.startedAtMs;
    if (
      allowTap &&
      gesture.tapEligible &&
      !gesture.cameraMovement &&
      gesture.maximumDisplacementPx < MOBILE_TAP_MOVE_THRESHOLD_PX &&
      durationMs >= 0 &&
      durationMs < MOBILE_TAP_MAX_DURATION_MS
    ) {
      input.requestAction('fire');
    }
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
      onPointerCancelCapture={(event) => activePointers.current.delete(event.pointerId)}
      onPointerDownCapture={(event) => {
        activePointers.current.add(event.pointerId);
        const gesture = lookGesture.current;
        const startsMovement =
          event.button === 0 &&
          movementPointer.current === null &&
          movementRegion.current?.contains(event.target as Node);
        if (
          gesture &&
          event.pointerId !== gesture.pointerId &&
          event.pointerId !== gesture.movementPointerIdAtStart &&
          !startsMovement
        ) {
          gesture.tapEligible = false;
        }
      }}
      onPointerUpCapture={(event) => activePointers.current.delete(event.pointerId)}
    >
      <div
        className="mobile-look-zone"
        role="group"
        aria-label="Tap to shoot or drag to look"
        data-testid="mobile-look-zone"
        onLostPointerCapture={(event) => {
          activePointers.current.delete(event.pointerId);
          finishLook(event, false);
        }}
        onPointerCancel={(event) => finishLook(event, false)}
        onPointerDown={startLook}
        onPointerMove={moveLook}
        onPointerUp={(event) => finishLook(event, true)}
      />
      <div
        ref={movementRegion}
        className="mobile-movement"
        role="group"
        aria-label="Movement stick"
        data-testid="mobile-movement"
        onLostPointerCapture={(event) => {
          activePointers.current.delete(event.pointerId);
          endMovement(event);
        }}
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
