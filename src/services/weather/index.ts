import { WeatherTool } from '../agent/tools/weather';
import type { WeatherData } from '../agent/tools/weather';
import type { ToolResult } from '../agent/base-tool';

const weatherTool = new WeatherTool();

export async function fetchWeather(
  location: string,
  units: 'metric' | 'imperial' = 'metric'
): Promise<WeatherData> {
  const result = (await weatherTool.execute({
    location,
    units,
  })) as ToolResult<WeatherData>;

  if (!result.success || !result.data) {
    throw new Error(result.error || '无法获取天气信息');
  }

  return result.data;
}
