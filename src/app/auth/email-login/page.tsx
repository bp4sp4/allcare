'use client';

import EmailLoginForm from '../EmailLoginForm';
import styles from '../auth.module.css';

export default function EmailLoginPage() {
  return (
    <div className={styles.card}>
      <div className={styles.container}>
        <EmailLoginForm />
      </div>
    </div>
  );
}
