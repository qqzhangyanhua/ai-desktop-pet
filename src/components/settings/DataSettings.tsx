// Data Settings Component - Import/Export/Backup UI

import { useState } from 'react';
import { ExportTab } from './ExportTab';
import { ImportTab } from './ImportTab';
import { BackupTab } from './BackupTab';

type TabType = 'export' | 'import' | 'backup';

export function DataSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('backup');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'backup', label: 'Backup' },
    { id: 'export', label: 'Export' },
    { id: 'import', label: 'Import' },
  ];

  return (
    <div className="settings-section">
      <div className="settings-section-title">Data Management</div>

      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '12px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '8px',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: activeTab === tab.id ? '#6366f1' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'export' && <ExportTab />}
      {activeTab === 'import' && <ImportTab />}
      {activeTab === 'backup' && <BackupTab />}
    </div>
  );
}
