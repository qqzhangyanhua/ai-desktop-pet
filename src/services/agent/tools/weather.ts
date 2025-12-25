// Weather Query Tool - Using wttr.in API

import { BaseTool, createSuccessResult, createErrorResult, type ToolExecutionContext, type ToolResult } from '../base-tool';
import type { ToolSchema } from '../../../types';

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
          description: 'City name or location to get weather for (e.g., "Beijing", "New York", "Tokyo")',
        },
        units: {
          type: 'string',
          description: 'Temperature units: "metric" (Celsius) or "imperial" (Fahrenheit)',
          enum: ['metric', 'imperial'],
        },
      },
      required: ['location'],
    },
  };

  async execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult<WeatherData>> {
    this.validateArgs(args);

    const location = args.location as string;
    const units = (args.units as string) ?? 'metric';

    context?.onProgress?.(`Getting weather for: ${location}`);

    try {
      // Use wttr.in JSON API
      const unitParam = units === 'imperial' ? 'u' : 'm';
      const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1&${unitParam}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AI Desktop Pet/1.0',
        },
        signal: context?.signal,
      });

      if (!response.ok) {
        return createErrorResult(`Weather API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.current_condition?.[0]) {
        return createErrorResult(`No weather data found for: ${location}`);
      }

      const current = data.current_condition[0];
      const area = data.nearest_area?.[0];
      const tempKey = units === 'imperial' ? 'temp_F' : 'temp_C';
      const feelsLikeKey = units === 'imperial' ? 'FeelsLikeF' : 'FeelsLikeC';
      const tempUnit = units === 'imperial' ? 'F' : 'C';

      const weatherData: WeatherData = {
        location: area?.areaName?.[0]?.value ?? location,
        temperature: `${current[tempKey]}${tempUnit}`,
        feelsLike: `${current[feelsLikeKey]}${tempUnit}`,
        condition: current.weatherDesc?.[0]?.value ?? 'Unknown',
        humidity: `${current.humidity}%`,
        wind: `${current.windspeedKmph} km/h ${current.winddir16Point}`,
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
