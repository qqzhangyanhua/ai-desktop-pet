import type { MenuItem, MenuConfig } from '@/types/menu';
import { MENU_REGISTRY } from './menu-config';

/**
 * Create menu items from configuration
 *
 * 设计原则：
 * 1. 单一参数对象 - 消除参数地狱
 * 2. 配置驱动 - 所有菜单项由 MENU_REGISTRY 定义
 * 3. 类型安全 - 使用 discriminated union 确保正确的 handler 绑定
 * 4. 过滤可选项 - 自动过滤未提供的 relaxation handlers
 *
 * @param config - Menu configuration containing handlers and state
 * @returns Array of menu items with handlers bound
 */
export function createMenuItems(config: MenuConfig): MenuItem[] {
  const { handlers, state } = config;

  const createMissingHandlerFallback = (id: string, action: string) => () => {
    console.warn('[Menu] Handler not found, action ignored', { id, action });
  };

  return MENU_REGISTRY.filter((item) => {
    // Filter out relaxation items if handlers not provided
    if (item.type === 'relaxation') {
      const handler = handlers.relaxation?.[item.relaxationAction];
      return handler !== undefined;
    }
    return true;
  }).map((item) => {
    // Resolve label (string or function)
    const label = typeof item.label === 'function' ? item.label(state) : item.label;

    // Bind handler based on item type
    let onSelect: MenuItem['onSelect'];

    switch (item.type) {
      case 'pet':
        onSelect = () => handlers.pet(item.action);
        break;

      case 'assistant':
        onSelect = () => handlers.assistant(item.skill);
        break;

      case 'system':
        onSelect = handlers.system[item.systemAction];
        break;

      case 'relaxation': {
        const handler = handlers.relaxation?.[item.relaxationAction];
        onSelect = handler ?? createMissingHandlerFallback(item.id, item.relaxationAction);
        break;
      }

      default:
        // Exhaustive check - TypeScript will error if we miss a type
        const _exhaustive: never = item;
        throw new Error(`Unknown menu item type: ${(_exhaustive as { type: string }).type}`);
    }

    return {
      id: item.id,
      section: item.section,
      label,
      keywords: item.keywords,
      icon: item.icon,
      danger: item.danger,
      onSelect,
    };
  });
}

// Re-export types for convenience
export type { MenuItem, MenuSection } from '@/types/menu';
