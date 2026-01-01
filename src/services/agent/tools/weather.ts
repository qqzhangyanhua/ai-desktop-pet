// Weather Query Tool - Using wttr.in API
// Refactored using defineTool to eliminate boilerplate

import { defineTool } from '../define-tool';
import type { ToolExecutionContext } from '../base-tool';
import { fetch } from '@tauri-apps/plugin-http';

// Type definitions for tool results
export interface WeatherData {
  location: string;
  temperature: string;
  feelsLike: string;
  condition: string;
  humidity: string;
  wind: string;
  forecast: string;
}

/**
 * Helper function to format weather forecast
 */
function formatForecast(weather: Array<Record<string, unknown>> | undefined, units: string): string {
  if (!weather || weather.length === 0) return 'No forecast available';

  const tempKey = units === 'imperial' ? 'maxtempF' : 'maxtempC';
  const minTempKey = units === 'imperial' ? 'mintempF' : 'mintempC';
  const tempUnit = units === 'imperial' ? 'F' : 'C';

  return weather.slice(0, 3).map((day) => {
    const date = day.date as string;
    const maxTemp = day[tempKey];
    const minTemp = day[minTempKey];
    return `${date}: ${minTemp}-${maxTemp}${tempUnit}`;
  }).join(', ');
}

/**
 * Get current weather information for a specified location
 * Returns temperature, conditions, humidity, and wind speed
 */
export const weatherTool = defineTool<
  { location?: string; units?: string },
  WeatherData
>({
  name: 'get_weather',
  description: 'Get current weather information for a specified location. Returns temperature, conditions, humidity, and wind speed.',
  parameters: {
    location: {
      type: 'string',
      description: 'City name or location to get weather for. If empty, auto-detect by IP.',
      required: false,
    },
    units: {
      type: 'string',
      description: 'Temperature units: "metric" (Celsius) or "imperial" (Fahrenheit)',
      enum: ['metric', 'imperial'],
      required: false,
    },
  },

  async execute({ location, units = 'metric' }, context) {
    // location 现在可选，为空时 wttr.in 会根据 IP 自动定位
    const cleanLocation = location?.trim() || '';

    context.onProgress?.(cleanLocation ? `Getting weather for: ${cleanLocation}` : 'Getting weather for current location...');

    // Use wttr.in JSON API via Tauri HTTP plugin
    const unitParam = units === 'imperial' ? 'u' : 'm';
    // 如果 location 为空，wttr.in 会根据请求 IP 自动定位
    const locationPart = cleanLocation ? encodeURIComponent(cleanLocation) : '';
    // 添加 lang=zh 参数获取中文结果
    const url = `https://wttr.in/${locationPart}?format=j1&${unitParam}&lang=zh`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'AI Desktop Pet/1.0',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      connectTimeout: 15000,
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.current_condition?.[0]) {
      throw new Error(cleanLocation ? `No weather data found for: ${cleanLocation}` : 'No weather data found for current location');
    }

    const current = data.current_condition[0];
    const area = data.nearest_area?.[0];
    const tempKey = units === 'imperial' ? 'temp_F' : 'temp_C';
    const feelsLikeKey = units === 'imperial' ? 'FeelsLikeF' : 'FeelsLikeC';
    const tempSymbol = units === 'imperial' ? '°F' : '°C';

    // 优先使用用户输入的城市名（保持中文），其次使用 API 返回的名称
    const displayLocation = cleanLocation || area?.areaName?.[0]?.value || '当前位置';

    // lang=zh 时 weatherDesc 会返回中文天气描述
    const weatherCondition = current.lang_zh?.[0]?.value
      || current.weatherDesc?.[0]?.value
      || '未知';

    const weatherData: WeatherData = {
      location: displayLocation,
      temperature: `${current[tempKey]}${tempSymbol}`,
      feelsLike: `${current[feelsLikeKey]}${tempSymbol}`,
      condition: weatherCondition,
      humidity: `${current.humidity}%`,
      wind: `${current.windspeedKmph} 公里/时`,
      forecast: formatForecast(data.weather, units),
    };

    return weatherData;
  },
});

// Legacy class export for backward compatibility (deprecated)
export class WeatherTool {
  private static _instance = weatherTool;

  get name() {
    return WeatherTool._instance.name;
  }
  get description() {
    return WeatherTool._instance.description;
  }
  get schema() {
    return WeatherTool._instance.schema;
  }
  get requiresConfirmation() {
    return WeatherTool._instance.requiresConfirmation;
  }

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext) {
    return WeatherTool._instance.execute(args, context);
  }

  toJSON() {
    return WeatherTool._instance.toJSON();
  }
}
