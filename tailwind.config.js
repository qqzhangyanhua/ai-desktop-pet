/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		// 使用项目现有的圆角系统
  		borderRadius: {
  			lg: 'var(--radius-lg)',
  			md: 'var(--radius-md)',
  			sm: 'var(--radius-sm)',
  			xl: 'var(--radius-xl)',
  			full: 'var(--radius-full)',
  		},
  		// 整合马卡龙色系
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				// 马卡龙紫色系
  				50: '#f3f0ff',
  				100: '#e9e5ff',
  				200: '#d4cbff',
  				300: '#b8aaff',
  				400: '#9f85ff',
  				500: '#a78bfa',
  				600: '#8b5cf6',
  				700: '#7c3aed',
  				800: '#6d28d9',
  				900: '#5b21b6',
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))',
  				// 马卡龙黄色/金色
  				50: '#fefce8',
  				100: '#fef9c3',
  				200: '#fef08a',
  				300: '#fde047',
  				400: '#facc15',
  				500: '#fbbf24',
  				600: '#f59e0b',
  				700: '#d97706',
  				800: '#b45309',
  			},
  			success: {
  				DEFAULT: '#34d399',
  				foreground: '#064e3b',
  			},
  			danger: {
  				DEFAULT: '#f87171',
  				foreground: '#7f1d1d',
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		// 毛玻璃效果工具类
  		backgroundImage: {
  			'glass-gradient': 'linear-gradient(135deg, var(--color-bg-start) 0%, var(--color-bg-end) 100%)',
  		},
  		backdropBlur: {
  			xs: '4px',
  		},
  		boxShadow: {
  			'glass': 'var(--glass-shadow)',
  			'glass-sm': '0 4px 16px rgba(31, 38, 135, 0.1)',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
