#!/bin/bash

echo "🔄 Resetting Live2D model configuration..."
echo ""

# Find the app database
DB_PATH=$(find ~/Library/Application\ Support -name "app.db" -type f 2>/dev/null | grep -E "ai-desktop-pet|com.tauri" | head -1)

if [ -z "$DB_PATH" ]; then
    echo "⚠️  Database not found. Possible reasons:"
    echo "   1. App hasn't been run yet"
    echo "   2. Database is in a different location"
    echo ""
    echo "📝 Manual steps:"
    echo "   1. Run the app once"
    echo "   2. Open Settings > Advanced"
    echo "   3. Click 'Reset Model Config'"
    exit 0
fi

echo "📍 Found database: $DB_PATH"
echo ""

# Backup first
BACKUP="${DB_PATH}.backup-$(date +%Y%m%d_%H%M%S)"
cp "$DB_PATH" "$BACKUP"
echo "✅ Backup created: $BACKUP"
echo ""

# Update config using sqlite3
sqlite3 "$DB_PATH" << SQL
UPDATE config
SET value = json_set(
    json_set(value, '\$.live2d.currentModel', 'white-cat'),
    '\$.appearance.skinId', 'white-cat'
),
updated_at = (strftime('%s', 'now') * 1000)
WHERE key = 'app_config';

SELECT 
    '✅ Updated configuration:' as message,
    json_extract(value, '\$.live2d.currentModel') as currentModel,
    json_extract(value, '\$.appearance.skinId') as skinId
FROM config
WHERE key = 'app_config';
SQL

echo ""
echo "🚀 Configuration updated! Please restart the app."
echo ""
