// Data Settings Component - Import/Export/Backup UI

import { useState } from 'react';
import { ExportTab } from './ExportTab';
import { ImportTab } from './ImportTab';
import { BackupTab } from './BackupTab';
import { Button } from '@/components/ui/button';

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

      <div className="tab-switcher">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            className={activeTab === tab.id ? 'bg-indigo-500 hover:bg-indigo-600' : ''}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'export' && <ExportTab />}
      {activeTab === 'import' && <ImportTab />}
      {activeTab === 'backup' && <BackupTab />}
    </div>
  );
}
