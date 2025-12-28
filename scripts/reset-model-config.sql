-- SQL script to update Live2D model configuration in database
-- Run this in your SQLite database to switch to white-cat model

-- Option 1: Delete all config (will use new defaults on next launch)
-- DELETE FROM config WHERE key = 'app_config';

-- Option 2: Update specific model fields (safer, preserves other settings)
-- First, get the current config:
-- SELECT value FROM config WHERE key = 'app_config';

-- Then use this template to update (replace <current_config_json> with actual JSON):
UPDATE config
SET value = json_set(
    json_set(
        value,
        '$.live2d.currentModel', 'white-cat'
    ),
    '$.appearance.skinId', 'white-cat'
),
updated_at = unixepoch('now') * 1000
WHERE key = 'app_config';

-- Verify the change:
SELECT json_extract(value, '$.live2d.currentModel') as currentModel,
       json_extract(value, '$.appearance.skinId') as skinId
FROM config
WHERE key = 'app_config';
