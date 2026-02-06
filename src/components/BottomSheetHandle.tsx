import styles from './BottomSheetHandle.module.css';
import { useRef } from 'react';

type Props = {
  onClick?: () => void;
  ariaLabel?: string;
  visible?: boolean;
  hint?: string;
  onDragStart?: (clientY: number) => void;
  onDrag?: (clientY: number) => void;
  onDragEnd?: (clientY: number) => void;
};

export default function BottomSheetHandle(props: Props) {
  const { onClick, ariaLabel = 'Open sheet', visible = true, hint = '팝업 열기', onDragStart, onDrag, onDragEnd } = props;
  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);

  if (!visible) return null;

  return (
    <div
      className={styles.wrapper}
      role="button"
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={() => onClick?.()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture(e.pointerId);
        pointerIdRef.current = e.pointerId;
        startYRef.current = e.clientY;
        onDragStart?.(startYRef.current);
      }}
      onPointerMove={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        onDrag?.(e.clientY);
      }}
      onPointerUp={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        pointerIdRef.current = null;
        onDragEnd?.(e.clientY);
      }}
    >
      <div className={styles.handle} />
      <div className={styles.hint}>{hint}</div>
    </div>
  );
}
