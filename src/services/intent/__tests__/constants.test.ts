/**
 * Suggestions Validation Tests
 * 建议验证功能测试
 */

import { describe, it, expect } from 'vitest';
import {
  SUGGESTIONS_CONFIG,
  validateSuggestion,
  normalizeSuggestions,
} from '../constants';

describe('validateSuggestion', () => {
  it('应该接受有效的建议', () => {
    const result = validateSuggestion('查找我的CSS书签');
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('应该拒绝空字符串', () => {
    const result = validateSuggestion('');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('为空');
  });

  it('应该拒绝只有空格的字符串', () => {
    const result = validateSuggestion('   ');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('为空');
  });

  it('应该拒绝过短的建议', () => {
    const result = validateSuggestion('a');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('长度不足');
  });

  it('应该拒绝过长的建议', () => {
    const longText = 'a'.repeat(SUGGESTIONS_CONFIG.MAX_LENGTH + 1);
    const result = validateSuggestion(longText);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('过长');
  });

  it('应该接受中文建议', () => {
    const result = validateSuggestion('搜索网络书签');
    expect(result.valid).toBe(true);
  });

  it('应该接受英文建议', () => {
    const result = validateSuggestion('Search CSS bookmarks');
    expect(result.valid).toBe(true);
  });

  it('应该接受混合中英文建议', () => {
    const result = validateSuggestion('查找CSS书签');
    expect(result.valid).toBe(true);
  });

  it('应该接受常用标点符号', () => {
    const validPunctuation = [
      '查找"CSS"书签',
      '搜索（JavaScript）',
      '找一下React.js',
      '我的前端:学习',
    ];

    validPunctuation.forEach(text => {
      const result = validateSuggestion(text);
      expect(result.valid).toBe(true);
    });
  });

  it('应该拒绝特殊符号', () => {
    const invalidChars = [
      '查找CSS书签@#$',
      'Search<script>',
      '搜索&nbsp;',
      '查找%20CSS',
    ];

    invalidChars.forEach(text => {
      const result = validateSuggestion(text);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('不允许的字符');
    });
  });

  it('应该自动修剪首尾空格', () => {
    const result = validateSuggestion('  查找CSS书签  ');
    expect(result.valid).toBe(true);
  });
});

describe('normalizeSuggestions', () => {
  it('应该限制建议数量为默认值(5)', () => {
    const input = Array.from({ length: 10 }, (_, i) => `建议${i + 1}`);
    const result = normalizeSuggestions(input);

    expect(result).toHaveLength(5);
    expect(result).toEqual([
      '建议1',
      '建议2',
      '建议3',
      '建议4',
      '建议5',
    ]);
  });

  it('应该支持自定义最大数量', () => {
    const input = Array.from({ length: 10 }, (_, i) => `建议${i + 1}`);
    const result = normalizeSuggestions(input, 3);

    expect(result).toHaveLength(3);
    expect(result).toEqual(['建议1', '建议2', '建议3']);
  });

  it('应该过滤掉无效建议', () => {
    const input = [
      '有效建议1',
      '',  // 空字符串
      'a',  // 太短
      '有效建议2',
      'a'.repeat(100),  // 太长
      '有效建议3',
    ];

    const result = normalizeSuggestions(input);

    expect(result).toEqual([
      '有效建议1',
      '有效建议2',
      '有效建议3',
    ]);
  });

  it('应该去除重复建议（忽略大小写）', () => {
    const input = [
      '查找CSS书签',
      'Search bookmarks',
      '查找css书签',  // 重复（忽略大小写）
      'search bookmarks',  // 重复（忽略大小写）
      '查找JavaScript',
    ];

    const result = normalizeSuggestions(input);

    expect(result).toEqual([
      '查找CSS书签',
      'Search bookmarks',
      '查找JavaScript',
    ]);
  });

  it('应该自动修剪空格', () => {
    const input = [
      '  查找CSS  ',
      '  查找JavaScript  ',
    ];

    const result = normalizeSuggestions(input);

    expect(result).toEqual([
      '查找CSS',
      '查找JavaScript',
    ]);
  });

  it('应该处理空数组', () => {
    const result = normalizeSuggestions([]);
    expect(result).toEqual([]);
  });

  it('应该处理全部无效的情况', () => {
    const input = ['', 'a', '  ', 'b'];
    const result = normalizeSuggestions(input);
    expect(result).toEqual([]);
  });

  it('应该保持原始顺序', () => {
    const input = ['建议3', '建议1', '建议2'];
    const result = normalizeSuggestions(input);
    expect(result).toEqual(['建议3', '建议1', '建议2']);
  });

  it('应该同时应用多个过滤条件', () => {
    const input = [
      '有效建议1',
      '有效建议2',
      '有效建议1',  // 重复
      '',  // 空
      'a',  // 太短
      '  有效建议3  ',  // 需要修剪
      '有效建议4',
      '有效建议5',
      '有效建议6',  // 超过限制
      '有效建议7',  // 超过限制
    ];

    const result = normalizeSuggestions(input, 5);

    expect(result).toEqual([
      '有效建议1',
      '有效建议2',
      '有效建议3',
      '有效建议4',
      '有效建议5',
    ]);
  });
});
