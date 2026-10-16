'use client'

import Image from 'next/image'
import { useState } from 'react'

type LogoProps = {
  /** rendered square size in px */
  size?: number
  className?: string
  priority?: boolean
}

/**
 * Central Xmix brand mark.
 * Renders the official logo (/logo.png, transparent background).
 * Falls back to the gradient "X" tile if the image fails to load.
 */
export function Logo({ size = 40, className = '', priority = false }: LogoProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl text-white font-black shadow-lg shadow-violet-900/40 ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.45,
          background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
        }}
        aria-hidden
      >
        X
      </span>
    )
  }

  return (
    <Image
      src="/logo.png"
      alt="Xmix logo"
      width={size}
      height={size}
      priority={priority}
      onError={() => setFailed(true)}
      className={`shrink-0 select-none object-contain ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  )
}
