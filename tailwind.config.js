import {heroui} from "@heroui/theme"

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/constants/**/*.{js,ts,tsx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
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
  				foreground: 'hsl(var(--primary-foreground))'
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
  				foreground: 'hsl(var(--accent-foreground))'
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
  		transitionTimingFunction: {
  			'standard':              'cubic-bezier(0.2, 0, 0, 1)',
  			'standard-accelerate':   'cubic-bezier(0.3, 0, 1, 1)',
  			'standard-decelerate':   'cubic-bezier(0, 0, 0, 1)',
  			// M3 spec uses a compound two-phase curve for 'emphasized'; CSS cubic-bezier()
  			// cannot represent compound curves natively, so we approximate with the standard curve.
  			'emphasized':            'cubic-bezier(0.2, 0, 0, 1)',
  			'emphasized-accelerate': 'cubic-bezier(0.3, 0, 1, 1)',
  			'emphasized-decelerate': 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  		},
  		transitionDuration: {
  			'short1':  '50ms',
  			'short2':  '100ms',
  			'short3':  '150ms',
  			'short4':  '200ms',
  			'medium1': '250ms',
  			'medium2': '300ms',
  			'medium3': '350ms',
  			'medium4': '400ms',
  			'long1':       '450ms',
  			'long2':       '500ms',
  			'long3':       '550ms',
  			'long4':       '600ms',
  			'extra-long1': '700ms',
  			'extra-long2': '800ms',
  			'extra-long3': '900ms',
  			'extra-long4': '1000ms',
  		},
  		boxShadow: {
  			'elevation-0': 'none',
  			'elevation-1': '0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)',
  			'elevation-2': '0px 1px 2px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)',
  			'elevation-3': '0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px rgba(0,0,0,0.3)',
  			'elevation-4': '0px 6px 10px 4px rgba(0,0,0,0.15), 0px 2px 3px rgba(0,0,0,0.3)',
  			'elevation-5': '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px rgba(0,0,0,0.3)',
  		},
  	}
  },
  darkMode: ["class", "class"],
  plugins: [heroui(), import("tailwindcss-animate")],
}
