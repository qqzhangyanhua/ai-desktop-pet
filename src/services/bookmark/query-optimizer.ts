/**
 * LLM-powered Bookmark Query Optimizer
 * 基于大模型的书签查询优化器
 */

import { generateText } from 'ai';
import { useConfigStore } from '@/stores';
import { createModel } from '@/services/llm/providers';

/**
 * 查询分析结果
 */
export interface QueryAnalysis {
  /** 提取的核心关键词 */
  keywords: string[];
  /** 用户意图类型 */
  intentType: 'list_all' | 'search' | 'category';
  /** 是否需要列出全部 */
  showAll: boolean;
  /** 置信度 0-1 */
  confidence: number;
}

/**
 * 复杂度修饰词列表
 */
const COMPLEXITY_MODIFIERS = /相关|有关|关于|涉及|包含|帮我|查一下|找一下|搜一下/;

/**
 * 判断书签查询是否复杂（需要LLM处理）
 *
 * 简单查询特征：
 * - 短（≤10字符）且直接是关键词
 * - 没有修饰词
 * - 例如："github书签"、"AI书签"、"前端书签"
 *
 * 复杂查询特征：
 * - 长（>15字符）或包含修饰词
 * - 例如："帮我查一下AI相关的书签"、"有没有前端开发的收藏"
 */
export function isComplexBookmarkQuery(userInput: string): boolean {
  const input = userInput.trim();

  // 规则1：包含复杂修饰词 → 复杂
  if (COMPLEXITY_MODIFIERS.test(input)) {
    return true;
  }

  // 规则2：长度>15 → 复杂
  if (input.length > 15) {
    return true;
  }

  // 规则3：短且直接 → 简单
  // 去掉"书签"、"收藏"后看剩余部分
  const core = input.replace(/书签|收藏|bookmark|我的/gi, '').trim();
  if (core.length <= 10 && core.length > 0) {
    return false; // 简单查询
  }

  // 默认：复杂
  return true;
}

/**
 * 快速提取简单查询的关键词（无LLM）
 * 仅用于简单查询的快速路径
 */
export function extractSimpleKeyword(userInput: string): string {
  let keyword = userInput
    .replace(/书签|收藏|bookmark|我的|找找|搜索/gi, '')
    .trim();

  // 移除末尾语气词
  keyword = keyword.replace(/[吗呢啊呀哦嘛？?]$/g, '').trim();

  return keyword;
}

/**
 * 使用LLM分析用户书签查询意图
 */
export async function analyzeBookmarkQuery(userInput: string): Promise<QueryAnalysis> {
  const { config } = useConfigStore.getState();

  try {
    const model = createModel(config.llm);

    const prompt = `你是一个书签搜索助手。请分析用户的查询意图并提取关键词。

用户输入: "${userInput}"

请以JSON格式返回分析结果：
{
  "keywords": ["关键词1", "关键词2"],  // 提取的核心搜索词，去除修饰词
  "intentType": "search",  // list_all(列出全部) | search(搜索) | category(分类)
  "showAll": false,  // 是否想查看全部书签
  "confidence": 0.95  // 置信度 0-1
}

规则：
1. 移除"相关"、"有关"、"关于"等修饰词
2. 移除"的"、"呢"、"吗"等语气词
3. 提取技术名词、网站名称等核心概念
4. 如果用户只是问"有哪些书签"、"我的书签"，设置intentType为list_all, showAll为true
5. 提取多个可能的关键词，按相关性排序

只返回JSON，不要其他解释。`;

    const result = await generateText({
      model,
      prompt,
      temperature: 0.1, // 低温度，保证结果稳定
    });

    // 解析LLM返回的JSON
    const cleaned = result.text.trim().replace(/```json\n?|\n?```/g, '');
    const analysis = JSON.parse(cleaned) as QueryAnalysis;

    console.log('[QueryOptimizer] LLM analysis:', analysis);
    return analysis;

  } catch (error) {
    console.warn('[QueryOptimizer] LLM analysis failed, fallback to rule-based:', error);

    // 降级到规则方案
    return fallbackAnalysis(userInput);
  }
}

/**
 * 优化搜索查询（当搜索失败时）
 */
export async function optimizeFailedQuery(
  originalQuery: string,
  userInput: string
): Promise<string[]> {
  const { config } = useConfigStore.getState();

  try {
    const model = createModel(config.llm);

    const prompt = `用户搜索书签时使用了查询词 "${originalQuery}"，但没有找到结果。

原始输入: "${userInput}"

请生成3个替代搜索词，以JSON数组格式返回：
["替代词1", "替代词2", "替代词3"]

建议策略：
1. 同义词（如：AI → 人工智能）
2. 相关概念（如：React → 前端框架）
3. 更通用的词（如：Vue3 → Vue）
4. 英文/中文互换
5. 缩写展开（如：JS → JavaScript）

只返回JSON数组，不要其他内容。`;

    const result = await generateText({
      model,
      prompt,
      temperature: 0.3,
    });

    const cleaned = result.text.trim().replace(/```json\n?|\n?```/g, '');
    const suggestions = JSON.parse(cleaned) as string[];

    console.log('[QueryOptimizer] LLM suggestions:', suggestions);
    return suggestions.slice(0, 3);

  } catch (error) {
    console.warn('[QueryOptimizer] Query optimization failed:', error);
    return [];
  }
}

/**
 * 生成智能搜索建议（基于用户书签内容）
 */
export async function generateSmartSuggestions(
  userInput: string,
  topDomains: Array<{ domain: string; count: number }>
): Promise<string[]> {
  const { config } = useConfigStore.getState();

  try {
    const model = createModel(config.llm);

    const domainsText = topDomains
      .map(d => `${d.domain} (${d.count}个)`)
      .join(', ');

    const prompt = `用户问: "${userInput}"

用户书签中的热门网站: ${domainsText}

基于用户的书签内容，生成3个实用的搜索建议，以JSON数组格式返回：
["建议1", "建议2", "建议3"]

建议要求：
1. 基于用户已有的书签内容
2. 使用用户可能感兴趣的技术栈
3. 具体且实用

只返回JSON数组。`;

    const result = await generateText({
      model,
      prompt,
      temperature: 0.5,
    });

    const cleaned = result.text.trim().replace(/```json\n?|\n?```/g, '');
    const suggestions = JSON.parse(cleaned) as string[];

    return suggestions.slice(0, 3);

  } catch (error) {
    console.warn('[QueryOptimizer] Smart suggestions failed:', error);
    return [
      '找找我的GitHub书签',
      '搜索前端相关的书签',
      '我有什么开发工具书签',
    ];
  }
}

/**
 * 规则降级方案
 */
function fallbackAnalysis(userInput: string): QueryAnalysis {
  const normalized = userInput.toLowerCase().trim();

  // 检测"列出全部"意图
  if (/^(我有|有)?(什么|哪些|多少)?书签[？?]?$/.test(normalized)) {
    return {
      keywords: [],
      intentType: 'list_all',
      showAll: true,
      confidence: 0.9,
    };
  }

  // 简单提取
  let query = userInput
    .replace(/书签|收藏|bookmark|找找|帮我找|我的|相关|有关|关于|的|呢|吗/g, '')
    .trim();

  return {
    keywords: query ? [query] : [],
    intentType: query ? 'search' : 'list_all',
    showAll: !query,
    confidence: 0.6,
  };
}
