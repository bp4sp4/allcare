import styles from './AlertModal.module.css';

interface AlertModalProps {
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function AlertModal({
  message,
  onClose,
  onConfirm,
  confirmLabel = '변경 유지',
  cancelLabel = '취소',
}: AlertModalProps) {
  const isConfirm = !!onConfirm;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.message}>{message}</div>
        {isConfirm ? (
          <div className={styles.buttonRow}>
            <button className={styles.cancelButton} onClick={onClose}>
              {cancelLabel}
            </button>
            <button className={styles.button} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        ) : (
          <button className={styles.button} onClick={onClose}>
            확인
          </button>
        )}
      </div>
    </div>
  );
}
