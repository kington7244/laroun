"use client"

interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl"
    showText?: boolean
    className?: string
    variant?: "full" | "icon"
}

// Fixed blue color for logo (matching landing page)
const LOGO_BLUE = "#3b82f6"

export default function Logo({ size = "md", showText = true, className = "", variant = "full" }: LogoProps) {
    const sizeMap = {
        sm: { icon: 24, text: "text-lg", gap: "gap-1.5" },
        md: { icon: 32, text: "text-xl", gap: "gap-2" },
        lg: { icon: 40, text: "text-2xl", gap: "gap-2.5" },
        xl: { icon: 48, text: "text-3xl", gap: "gap-3" },
    }

    const { icon: iconSize, text: textSize, gap } = sizeMap[size]

    // Modern "L" logo design with creative geometric shape
    const LogoIcon = () => (
        <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
        >
            {/* Background rounded square */}
            <rect
                x="2"
                y="2"
                width="44"
                height="44"
                rx="12"
                fill={LOGO_BLUE}
            />
            
            {/* Stylized "L" letter with modern design */}
            <path
                d="M16 12V32H32V28H20V12H16Z"
                fill="white"
                fillOpacity="0.9"
            />
            
            {/* Decorative diagonal line for modern touch */}
            <path
                d="M26 12L36 22"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeOpacity="0.7"
            />
            
            {/* Small accent dot */}
            <circle
                cx="36"
                cy="12"
                r="3"
                fill="white"
                fillOpacity="0.9"
            />
        </svg>
    )

    if (variant === "icon") {
        return <LogoIcon />
    }

    return (
        <div className={`flex items-center ${gap} ${className}`}>
            <LogoIcon />
            {showText && (
                <span 
                    className={`font-black ${textSize} tracking-tight`}
                    style={{ 
                        color: LOGO_BLUE,
                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                        letterSpacing: "-0.02em"
                    }}
                >
                    Laroun
                </span>
            )}
        </div>
    )
}

// Static version without theme context (for places where context isn't available)
export function LogoStatic({ 
    size = "md", 
    showText = true, 
    className = ""
}: LogoProps) {
    const sizeMap = {
        sm: { icon: 24, text: "text-lg", gap: "gap-1.5" },
        md: { icon: 32, text: "text-xl", gap: "gap-2" },
        lg: { icon: 40, text: "text-2xl", gap: "gap-2.5" },
        xl: { icon: 48, text: "text-3xl", gap: "gap-3" },
    }

    const { icon: iconSize, text: textSize, gap } = sizeMap[size]

    return (
        <div className={`flex items-center ${gap} ${className}`}>
            <svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
            >
                <rect x="2" y="2" width="44" height="44" rx="12" fill={LOGO_BLUE} />
                <path d="M16 12V32H32V28H20V12H16Z" fill="white" fillOpacity="0.9" />
                <path d="M26 12L36 22" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7" />
                <circle cx="36" cy="12" r="3" fill="white" fillOpacity="0.9" />
            </svg>
            {showText && (
                <span 
                    className={`font-black ${textSize} tracking-tight`}
                    style={{ 
                        color: LOGO_BLUE,
                        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                        letterSpacing: "-0.02em"
                    }}
                >
                    Laroun
                </span>
            )}
        </div>
    )
}
