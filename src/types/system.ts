/**
 * 系统服务类型定义
 * System Services Type Definitions
 */

/**
 * 自启动状态
 */
export interface AutostartStatus {
  /** 是否已启用 */
  enabled: boolean;
  /** 平台特定状态 */
  platform: {
    /** macOS: 是否已授权 */
    macosAuthorized?: boolean;
    /** Windows/Linux: 总是返回 true */
    supported: boolean;
  };
}
