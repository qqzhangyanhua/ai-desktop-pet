#!/bin/bash
# 重置配置，使用新的默认配置（Live2D 已启用）

echo "🔄 正在重置配置..."

# 查找数据库文件位置
DB_PATHS=(
  "$HOME/Library/Application Support/com.ai-desktop-pet.app/ai-desktop-pet.db"
  "$HOME/.local/share/com.ai-desktop-pet.app/ai-desktop-pet.db"
  "./ai-desktop-pet.db"
  "./src-tauri/target/debug/ai-desktop-pet.db"
)

FOUND=false

for DB_PATH in "${DB_PATHS[@]}"; do
  if [ -f "$DB_PATH" ]; then
    echo "✓ 找到数据库: $DB_PATH"
    
    # 备份原数据库
    BACKUP_PATH="${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$DB_PATH" "$BACKUP_PATH"
    echo "✓ 已备份到: $BACKUP_PATH"
    
    # 只删除配置，保留其他数据
    sqlite3 "$DB_PATH" "DELETE FROM config WHERE key = 'app_config';"
    echo "✓ 配置已重置"
    
    FOUND=true
    break
  fi
done

if [ "$FOUND" = false ]; then
  echo "ℹ️  未找到数据库文件（可能是首次运行）"
  echo "   应用启动时会自动创建并使用默认配置（Live2D 已启用）"
fi

echo ""
echo "✨ 完成！现在可以启动应用了："
echo "   pnpm dev:tauri"
echo ""
echo "💡 应用将使用新的默认配置（Live2D 已启用）"
