import { WeatherTool } from '../agent/tools/weather';
import type { WeatherData } from '../agent/tools/weather';
import type { ToolResult } from '../agent/base-tool';

const weatherTool = new WeatherTool();

/**
 * 获取天气信息
 * @param location 城市名称，可选。为空时根据 IP 自动定位
 * @param units 温度单位
 */
export async function fetchWeather(
  location?: string,
  units: 'metric' | 'imperial' = 'metric'
): Promise<WeatherData> {
  const result = (await weatherTool.execute({
    location: location ?? '',
    units,
  })) as ToolResult<WeatherData>;

  if (!result.success || !result.data) {
    throw new Error(result.error || '无法获取天气信息');
  }

  return result.data;
}
