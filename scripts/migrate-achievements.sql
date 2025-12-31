-- Achievement Icons Migration SQL Script
-- 成就图标迁移 SQL 脚本
-- 将 emoji 替换为 Lucide icon 名称

-- 互动类成就
UPDATE achievements SET icon = 'Hand' WHERE id = 'first_pet';
UPDATE achievements SET icon = 'HandHeart' WHERE id = 'pet_10';
UPDATE achievements SET icon = 'Medal' WHERE id = 'pet_100';
UPDATE achievements SET icon = 'Utensils' WHERE id = 'feed_10';
UPDATE achievements SET icon = 'Gamepad2' WHERE id = 'play_10';
UPDATE achievements SET icon = 'MessageSquare' WHERE id = 'chat_10';
UPDATE achievements SET icon = 'Star' WHERE id = 'interaction_100';
UPDATE achievements SET icon = 'Trophy' WHERE id = 'interaction_500';

-- 陪伴类成就
UPDATE achievements SET icon = 'Sprout' WHERE id = 'companion_1';
UPDATE achievements SET icon = 'Leaf' WHERE id = 'companion_7';
UPDATE achievements SET icon = 'TreeDeciduous' WHERE id = 'companion_30';
UPDATE achievements SET icon = 'TreePine' WHERE id = 'companion_100';
UPDATE achievements SET icon = 'Calendar' WHERE id = 'consecutive_7';
UPDATE achievements SET icon = 'Heart' WHERE id = 'consecutive_30';

-- 亲密度类成就
UPDATE achievements SET icon = 'Snowflake' WHERE id = 'intimacy_30';
UPDATE achievements SET icon = 'Users' WHERE id = 'intimacy_50';
UPDATE achievements SET icon = 'HeartHandshake' WHERE id = 'intimacy_70';
UPDATE achievements SET icon = 'Sparkles' WHERE id = 'intimacy_100';

-- 特殊成就
UPDATE achievements SET icon = 'MessagesSquare' WHERE id = 'first_chat';
UPDATE achievements SET icon = 'Target' WHERE id = 'all_interactions';
