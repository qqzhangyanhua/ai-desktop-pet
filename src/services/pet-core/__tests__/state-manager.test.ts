// @ts-nocheck
/**
 * StateManager Unit Tests
 * 状态管理器单元测试
 *
 * 测试状态机转换逻辑
 */

import { StateManager, createInitialState } from '../state-manager';
import type { StateTransitionEvent } from '../types';

describe('StateManager', () => {
  let stateManager: StateManager;
  let listenerCalls: Array<{
    oldState: any;
    newState: any;
    event: StateTransitionEvent;
  }> = [];

  beforeEach(() => {
    const initialState = createInitialState();
    stateManager = new StateManager(initialState);
    listenerCalls = [];

    // 订阅状态变更用于测试
    stateManager.subscribe((oldState, newState, event) => {
      listenerCalls.push({ oldState, newState, event });
    });
  });

  afterEach(() => {
    listenerCalls = [];
  });

  test('初始状态应该正确', () => {
    const state = stateManager.getState();

    expect(state.care.mood).toBe(100);
    expect(state.care.energy).toBe(100);
    expect(state.care.intimacy).toBe(20);
    expect(state.visual.emotion).toBe('neutral');
  });

  test('处理pet互动应该更新状态', () => {
    const initialState = stateManager.getState();
    const initialMood = initialState.care.mood;
    const initialEnergy = initialState.care.energy;
    const initialIntimacy = initialState.care.intimacy;

    stateManager.dispatch({
      type: 'INTERACTION',
      payload: { type: 'pet' },
    });

    const newState = stateManager.getState();

    // 验证状态变更
    expect(newState.care.mood).toBe(initialMood + 10);
    expect(newState.care.energy).toBe(initialEnergy); // 无变化
    expect(newState.care.intimacy).toBe(initialIntimacy + 2);
    expect(newState.care.totalInteractions).toBe(initialState.care.totalInteractions + 1);
    expect(newState.timestamps.lastInteraction).toBeGreaterThan(initialState.timestamps.lastInteraction);

    // 验证监听器被调用
    expect(listenerCalls.length).toBe(1);
    expect(listenerCalls[0].event.type).toBe('INTERACTION');
  });

  test('处理feed互动应该更新状态', () => {
    stateManager.dispatch({
      type: 'INTERACTION',
      payload: { type: 'feed' },
    });

    const newState = stateManager.getState();

    expect(newState.care.mood).toBe(108); // 100 + 8
    expect(newState.care.energy).toBe(115); // 100 + 15
    expect(newState.care.intimacy).toBe(21); // 20 + 1
  });

  test('处理play互动应该更新状态', () => {
    stateManager.dispatch({
      type: 'INTERACTION',
      payload: { type: 'play' },
    });

    const newState = stateManager.getState();

    expect(newState.care.mood).toBe(112); // 100 + 12
    expect(newState.care.energy).toBe(95); // 100 - 5
    expect(newState.care.intimacy).toBe(23); // 20 + 3
  });

  test('状态值应该限制在0-100范围内', () => {
    // 设置低状态值
    const lowState = createInitialState();
    lowState.care.mood = 5;
    lowState.care.energy = 3;
    lowState.care.intimacy = 1;

    stateManager = new StateManager(lowState);

    // 应用衰减
    stateManager.dispatch({ type: 'DECAY_APPLY' });

    const newState = stateManager.getState();

    // 验证不会低于0
    expect(newState.care.mood).toBeGreaterThanOrEqual(0);
    expect(newState.care.energy).toBeGreaterThanOrEqual(0);
    expect(newState.care.intimacy).toBeGreaterThanOrEqual(0);

    // 验证不会高于100
    expect(newState.care.mood).toBeLessThanOrEqual(100);
    expect(newState.care.energy).toBeLessThanOrEqual(100);
    expect(newState.care.intimacy).toBeLessThanOrEqual(100);
  });

  test('更新表情应该只影响视觉状态', () => {
    const initialState = stateManager.getState();

    stateManager.dispatch({
      type: 'EMOTION_UPDATE',
      payload: { emotion: 'happy' },
    });

    const newState = stateManager.getState();

    // 验证表情变更
    expect(newState.visual.emotion).toBe('happy');

    // 验证其他状态未变
    expect(newState.care).toEqual(initialState.care);
  });

  test('更新亲密度应该正确处理', () => {
    const initialIntimacy = stateManager.getState().care.intimacy;

    stateManager.dispatch({
      type: 'INTIMACY_UPDATE',
      payload: { intimacy: 50 },
    });

    const newState = stateManager.getState();

    expect(newState.care.intimacy).toBe(50);
    expect(newState.care.intimacy).not.toBe(initialIntimacy);
  });

  test('多次互动应该累积效果', () => {
    const initialState = stateManager.getState();
    const initialMood = initialState.care.mood;

    // 多次pet互动
    stateManager.dispatch({ type: 'INTERACTION', payload: { type: 'pet' } });
    stateManager.dispatch({ type: 'INTERACTION', payload: { type: 'pet' } });
    stateManager.dispatch({ type: 'INTERACTION', payload: { type: 'pet' } });

    const newState = stateManager.getState();

    // 每次pet +10 心情
    expect(newState.care.mood).toBe(initialMood + 30);
    expect(newState.care.totalInteractions).toBe(3);
  });

  test('未处理的事件类型应该被忽略', () => {
    const initialState = stateManager.getState();

    // 发送未知事件（这在TypeScript中不会发生，但运行时测试）
    (stateManager as any).dispatch({ type: 'UNKNOWN' as any });

    const newState = stateManager.getState();

    // 状态应该不变
    expect(newState).toEqual(initialState);
    expect(listenerCalls.length).toBe(0);
  });

  test('衰减系统应该基于时间差计算', () => {
    const initialState = stateManager.getState();
    const initialMood = initialState.care.mood;
    const initialEnergy = initialState.care.energy;

    // 模拟时间流逝（2小时）
    const twoHoursLater = initialState.timestamps.lastDecayApplied + 2 * 60 * 60 * 1000;
    (stateManager as any).state.timestamps.lastDecayApplied = twoHoursLater;

    stateManager.dispatch({ type: 'DECAY_APPLY' });

    const newState = stateManager.getState();

    // 心情每小时衰减2点，2小时就是4点
    // 精力每小时衰减1.5点，2小时就是3点
    expect(newState.care.mood).toBe(initialMood - 4);
    expect(newState.care.energy).toBe(initialEnergy - 3);
  });
});
