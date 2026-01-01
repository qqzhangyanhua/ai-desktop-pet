// Weather Query Tool - Using wttr.in API

import { BaseTool, createSuccessResult, createErrorResult, type ToolExecutionContext, type ToolResult } from '../base-tool';
import type { ToolSchema } from '../../../types';
import { fetch } from '@tauri-apps/plugin-http';

export interface WeatherData {
  location: string;
  temperature: string;
  feelsLike: string;
  condition: string;
  humidity: string;
  wind: string;
  forecast: string;
}

export class WeatherTool extends BaseTool {
  name = 'get_weather';
  description = 'Get current weather information for a specified location. Returns temperature, conditions, humidity, and wind speed.';

  schema: ToolSchema = {
    name: 'get_weather',
    description: this.description,
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name or location to get weather for. If empty, auto-detect by IP.',
        },
        units: {
          type: 'string',
          description: 'Temperature units: "metric" (Celsius) or "imperial" (Fahrenheit)',
          enum: ['metric', 'imperial'],
        },
      },
      required: [],
    },
  };

  async execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult<WeatherData>> {
    // location 现在可选，为空时 wttr.in 会根据 IP 自动定位
    const location = (args.location as string | undefined)?.trim() || '';
    const units = (args.units as string) ?? 'metric';

    context?.onProgress?.(location ? `Getting weather for: ${location}` : 'Getting weather for current location...');

    try {
      // Use wttr.in JSON API via Tauri HTTP plugin
      const unitParam = units === 'imperial' ? 'u' : 'm';
      // 如果 location 为空，wttr.in 会根据请求 IP 自动定位
      const locationPart = location ? encodeURIComponent(location) : '';
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
        return createErrorResult(`Weather API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.current_condition?.[0]) {
        return createErrorResult(location ? `No weather data found for: ${location}` : 'No weather data found for current location');
      }

      const current = data.current_condition[0];
      const area = data.nearest_area?.[0];
      const tempKey = units === 'imperial' ? 'temp_F' : 'temp_C';
      const feelsLikeKey = units === 'imperial' ? 'FeelsLikeF' : 'FeelsLikeC';
      const tempSymbol = units === 'imperial' ? '°F' : '°C';

      // 优先使用用户输入的城市名（保持中文），其次使用 API 返回的名称
      const displayLocation = location || area?.areaName?.[0]?.value || '当前位置';

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
        forecast: this.formatForecast(data.weather, units),
      };

      return createSuccessResult(weatherData);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return createErrorResult('Weather request cancelled');
      }
      return createErrorResult(
        error instanceof Error ? error.message : 'Failed to get weather data'
      );
    }
  }

  private formatForecast(weather: Array<Record<string, unknown>> | undefined, units: string): string {
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
}
