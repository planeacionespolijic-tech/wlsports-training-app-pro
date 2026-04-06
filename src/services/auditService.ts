import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export enum AuditAction {
  BLOCK_USER = 'BLOCK_USER',
  UNBLOCK_USER = 'UNBLOCK_USER',
  DELETE_USER = 'DELETE_USER',
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  RESTORE_USER = 'RESTORE_USER'
}

export interface AuditLog {
  action: AuditAction;
  performedBy: string;
  performedByRole: string;
  targetUserId: string;
  targetUserName: string;
  timestamp: any;
  details?: string;
}

/**
 * Logs a critical system action to the auditLogs collection.
 */
export const logAuditEvent = async (
  action: AuditAction,
  performedBy: string,
  performedByRole: string,
  targetUserId: string,
  targetUserName: string,
  details?: string
) => {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      action,
      performedBy,
      performedByRole,
      targetUserId,
      targetUserName,
      details: details || '',
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
    // We don't throw here to avoid breaking the main operation if logging fails
    // but in a real enterprise app, you might want more robust handling.
  }
};
