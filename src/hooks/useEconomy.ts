/**
 * Economy System Hook
 * 经济系统 Hook
 *
 * 提供金币、经验值和等级的访问
 */

import { useEffect, useState } from 'react';
import { getCoins, getExperience, getLevelInfo } from '@/services/economy';
import type { LevelInfo } from '@/types';

export function useEconomy() {
  const [coins, setCoins] = useState<number>(0);
  const [experience, setExperience] = useState<number>(0);
  const [levelInfo, setLevelInfo] = useState<LevelInfo>({
    level: 1,
    currentExp: 0,
    requiredExp: 100,
    progress: 0,
    isMaxLevel: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadEconomyData = async () => {
    setIsLoading(true);
    try {
      const [coinData, expData, levelData] = await Promise.all([
        getCoins(),
        getExperience(),
        getLevelInfo(),
      ]);
      setCoins(coinData);
      setExperience(expData);
      setLevelInfo(levelData);
    } catch (error) {
      console.error('[useEconomy] Failed to load economy data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEconomyData();
  }, []);

  return {
    coins,
    experience,
    levelInfo,
    isLoading,
    refresh: loadEconomyData,
  };
}
