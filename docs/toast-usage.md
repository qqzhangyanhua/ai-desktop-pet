# Toast系统使用指南

## 概述

Toast通知系统提供全局的、非侵入式的用户反馈功能。支持四种类型的通知:info、success、warning、error。

## 基本使用

### 导入

```typescript
import { toast } from '../stores';
```

### 显示通知

```typescript
// 信息提示 (默认3秒)
toast.info('操作完成');

// 成功提示 (默认3秒)
toast.success('数据保存成功');

// 警告提示 (默认3秒)
toast.warning('请检查输入');

// 错误提示 (默认5秒)
toast.error('操作失败');
```

### 自定义持续时间

```typescript
// 显示5秒
toast.info('这条消息会显示5秒', 5000);

// 手动关闭 (duration = 0)
toast.warning('需要手动关闭', 0);
```

## 使用场景

### 1. 错误处理

```typescript
try {
  await someAsyncOperation();
  toast.success('操作成功');
} catch (error) {
  console.error('Error:', error);
  toast.error(`操作失败: ${error.message}`);
}
```

### 2. 表单验证

```typescript
const handleSubmit = () => {
  if (!input.trim()) {
    toast.warning('请输入内容');
    return;
  }
  // Process form
};
```

### 3. 异步操作反馈

```typescript
const saveConfig = async () => {
  try {
    await updateConfig(newConfig);
    toast.success('配置已保存');
  } catch (error) {
    toast.error('保存失败,请重试');
  }
};
```

### 4. API调用结果

```typescript
const fetchData = async () => {
  try {
    const response = await api.getData();
    toast.success('数据加载成功');
    return response;
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      toast.error('网络连接失败');
    } else {
      toast.error('加载数据失败');
    }
  }
};
```

## 已集成位置

当前已在以下位置集成Toast通知:

1. **App.tsx** - 应用初始化失败时显示错误
2. **ChatInput.tsx** - 聊天错误和语音输入错误提示

## UI特性

- **位置**: 屏幕右上角
- **动画**: 从右侧滑入
- **自动消失**: 根据配置的duration自动关闭
- **手动关闭**: 点击右侧×按钮立即关闭
- **层级**: z-index 9999,确保始终可见
- **样式**:
  - Info: 蓝色图标
  - Success: 绿色图标
  - Warning: 橙色图标
  - Error: 红色图标

## API参考

### toast对象

```typescript
interface ToastAPI {
  info: (message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
}
```

### Toast类型

```typescript
type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  timestamp: number;
}
```

## 最佳实践

1. **错误消息要清晰** - 告诉用户发生了什么,而不是技术细节
2. **避免过多通知** - 不要在短时间内显示大量toast
3. **使用合适的类型** - info用于普通信息,success用于成功操作,warning用于需要注意的情况,error用于错误
4. **保留console.error** - Toast是给用户看的,console.error是给开发者调试用的,两者都需要
5. **合理设置持续时间** - 重要的错误可以设置更长时间或手动关闭

## 示例代码

完整的使用示例:

```typescript
import { toast } from '../../stores';

export function MyComponent() {
  const handleAction = async () => {
    try {
      // 开始操作
      const result = await performAction();

      // 成功
      toast.success('操作成功完成');

    } catch (error) {
      // 错误处理
      console.error('[MyComponent] Action failed:', error);

      // 用户友好的错误提示
      if (error instanceof NetworkError) {
        toast.error('网络连接失败,请检查网络');
      } else if (error instanceof ValidationError) {
        toast.warning(error.message);
      } else {
        toast.error('操作失败,请稍后重试');
      }
    }
  };

  return (
    <button onClick={handleAction}>执行操作</button>
  );
}
```
