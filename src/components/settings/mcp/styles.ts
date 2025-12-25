// MCP Settings shared styles

import type { CSSProperties } from 'react';

export const STATUS_COLORS: Record<string, string> = {
  connected: '#22c55e',
  connecting: '#f59e0b',
  disconnected: '#94a3b8',
  error: '#ef4444',
};

export const serverCardStyles = {
  container: {
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    marginBottom: '8px',
  } as CSSProperties,

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  } as CSSProperties,

  content: {
    flex: 1,
  } as CSSProperties,

  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  } as CSSProperties,

  statusIndicator: (status: string): CSSProperties => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: STATUS_COLORS[status] || '#94a3b8',
  }),

  title: {
    fontWeight: 'bold',
    fontSize: '13px',
  } as CSSProperties,

  transportBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
    color: '#64748b',
  } as CSSProperties,

  description: {
    fontSize: '11px',
    color: '#64748b',
    margin: '4px 0',
  } as CSSProperties,

  commandText: {
    fontSize: '10px',
    color: '#94a3b8',
    margin: '4px 0',
    fontFamily: 'monospace',
  } as CSSProperties,

  errorText: {
    fontSize: '11px',
    color: '#ef4444',
    margin: '4px 0',
  } as CSSProperties,

  toolsContainer: {
    marginTop: '8px',
  } as CSSProperties,

  toolsLabel: {
    fontSize: '11px',
    color: '#64748b',
  } as CSSProperties,

  toolsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '4px',
  } as CSSProperties,

  toolBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: '#eef2ff',
    borderRadius: '4px',
    color: '#6366f1',
  } as CSSProperties,

  toolsMore: {
    fontSize: '10px',
    color: '#94a3b8',
  } as CSSProperties,

  actions: {
    display: 'flex',
    gap: '4px',
  } as CSSProperties,

  disconnectButton: {
    padding: '4px 8px',
    fontSize: '11px',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    cursor: 'pointer',
  } as CSSProperties,

  connectButton: (disabled: boolean): CSSProperties => ({
    padding: '4px 8px',
    fontSize: '11px',
    border: '1px solid #86efac',
    borderRadius: '4px',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
  }),

  removeButton: {
    padding: '4px 8px',
    fontSize: '11px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    backgroundColor: 'white',
    color: '#64748b',
    cursor: 'pointer',
  } as CSSProperties,
};

export const formStyles = {
  container: {
    padding: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    marginBottom: '12px',
  } as CSSProperties,

  title: {
    margin: '0 0 12px',
    fontSize: '14px',
  } as CSSProperties,

  fieldContainer: {
    marginBottom: '12px',
  } as CSSProperties,

  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '4px',
  } as CSSProperties,

  input: (hasError: boolean): CSSProperties => ({
    width: '100%',
    padding: '8px',
    fontSize: '13px',
    border: hasError ? '1px solid #ef4444' : '1px solid #e2e8f0',
    borderRadius: '6px',
    boxSizing: 'border-box',
  }),

  inputMonospace: (hasError: boolean): CSSProperties => ({
    ...formStyles.input(hasError),
    fontFamily: 'monospace',
  }),

  errorText: {
    fontSize: '11px',
    color: '#ef4444',
  } as CSSProperties,

  transportButtons: {
    display: 'flex',
    gap: '8px',
  } as CSSProperties,

  transportButton: (isActive: boolean): CSSProperties => ({
    padding: '6px 12px',
    fontSize: '12px',
    border: isActive ? '1px solid #6366f1' : '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: isActive ? '#eef2ff' : 'white',
    color: isActive ? '#6366f1' : '#64748b',
    cursor: 'pointer',
  }),

  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  } as CSSProperties,

  cancelButton: {
    padding: '6px 12px',
    fontSize: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
  } as CSSProperties,

  submitButton: {
    padding: '6px 12px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#6366f1',
    color: 'white',
    cursor: 'pointer',
  } as CSSProperties,
};

export const settingsStyles = {
  addButton: {
    width: '100%',
    padding: '8px',
    marginBottom: '12px',
    fontSize: '12px',
    border: '1px dashed #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    color: '#64748b',
  } as CSSProperties,

  emptyState: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '20px',
  } as CSSProperties,

  helpText: {
    fontSize: '11px',
    color: '#94a3b8',
    padding: '8px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    marginTop: '8px',
  } as CSSProperties,
};
