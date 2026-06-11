'use client'

/**
 * UserAvatar - ERP User Avatar Component
 * 
 * Circular avatar with image or initials fallback.
 * Supports multiple sizes, hover tooltips, and status badges.
 * Used in lists, tables, comments, and activity logs.
 * 
 * @example
 * <UserAvatar name="Ahmet Yılmaz" photoUrl="/avatar.jpg" size="md" status="online" />
 * <UserAvatar name="Mehmet Demir" initials="MD" size="sm" />
 * 
 * @see docs/templates/UserAvatar.md
 */

import Image from 'next/image'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away'

interface UserAvatarProps {
  /** User full name for tooltip and initials generation */
  name: string
  /** Profile photo URL (optional) */
  photoUrl?: string | null
  /** Override initials manually (optional) */
  initials?: string
  /** Avatar size - xs:24px, sm:32px, md:40px, lg:48px, xl:64px */
  size?: AvatarSize
  /** Online status indicator */
  status?: AvatarStatus
  /** Hover tooltip with full name */
  showTooltip?: boolean
  /** Click handler */
  onClick?: () => void
  /** Custom className */
  className?: string
}

// Size configuration
const sizeConfig: Record<AvatarSize, {
  container: string
  text: string
  status: string
  statusBorder: string
  pixels: number
}> = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-[10px]',
    status: 'w-1.5 h-1.5',
    statusBorder: 'border-[1.5px]',
    pixels: 24
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-xs',
    status: 'w-2 h-2',
    statusBorder: 'border-2',
    pixels: 32
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-sm',
    status: 'w-2.5 h-2.5',
    statusBorder: 'border-2',
    pixels: 40
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-base',
    status: 'w-3 h-3',
    statusBorder: 'border-[3px]',
    pixels: 48
  },
  xl: {
    container: 'w-16 h-16',
    text: 'text-lg',
    status: 'w-4 h-4',
    statusBorder: 'border-[3px]',
    pixels: 64
  }
}

// Status colors
const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500'
}

// Background colors for initials (based on name hash)
const avatarColors = [
  { bg: 'bg-blue-500', text: 'text-white' },
  { bg: 'bg-green-500', text: 'text-white' },
  { bg: 'bg-purple-500', text: 'text-white' },
  { bg: 'bg-orange-500', text: 'text-white' },
  { bg: 'bg-pink-500', text: 'text-white' },
  { bg: 'bg-indigo-500', text: 'text-white' },
  { bg: 'bg-teal-500', text: 'text-white' },
  { bg: 'bg-red-500', text: 'text-white' },
  { bg: 'bg-cyan-500', text: 'text-white' },
  { bg: 'bg-lime-500', text: 'text-white' },
]

// Generate initials from name
function generateInitials(name: string): string {
  if (!name) return '?'
  
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  
  const first = parts[0][0]?.toUpperCase() || ''
  const last = parts[parts.length - 1][0]?.toUpperCase() || ''
  return first + last
}

// Get color based on name (consistent color for same name)
function getAvatarColor(name: string) {
  if (!name) return avatarColors[0]
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const index = Math.abs(hash) % avatarColors.length
  return avatarColors[index]
}

export function UserAvatar({
  name,
  photoUrl,
  initials: customInitials,
  size = 'md',
  status,
  showTooltip = true,
  onClick,
  className
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [showTooltipState, setShowTooltipState] = useState(false)

  const config = sizeConfig[size]
  const initials = customInitials || generateInitials(name)
  const colorScheme = useMemo(() => getAvatarColor(name), [name])
  
  const hasImage = photoUrl && !imageError
  const clickable = !!onClick

  return (
    <div className="relative inline-block">
      {/* Avatar Container */}
      <div
        className={cn(
          'relative rounded-full overflow-hidden flex items-center justify-center',
          'transition-all duration-200 ease-in-out',
          config.container,
          clickable && 'cursor-pointer hover:scale-105 hover:shadow-md',
          hasImage ? '' : colorScheme.bg,
          className
        )}
        onClick={onClick}
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => setShowTooltipState(false)}
        role={clickable ? 'button' : 'img'}
        aria-label={name}
        tabIndex={clickable ? 0 : -1}
      >
        {hasImage ? (
          // Image Avatar
          <Image
            src={photoUrl}
            alt={name}
            width={config.pixels}
            height={config.pixels}
            unoptimized
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          // Initial Avatar
          <span className={cn(
            'font-semibold select-none',
            colorScheme.text,
            config.text
          )}>
            {initials}
          </span>
        )}
      </div>

      {/* Status Badge */}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full',
            'border-white dark:border-gray-900',
            statusColors[status],
            config.status,
            config.statusBorder
          )}
          aria-label={`Status: ${status}`}
        />
      )}

      {/* Tooltip */}
      {showTooltip && showTooltipState && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
          <div className="flex items-center gap-2">
            {status && (
              <span className={cn('w-2 h-2 rounded-full', statusColors[status])} />
            )}
            <span>{name}</span>
          </div>
          {/* Tooltip Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
        </div>
      )}
    </div>
  )
}

// Avatar Stack Component - Multiple avatars grouped
interface AvatarStackProps {
  /** Array of user data */
  users: Array<{
    name: string
    photoUrl?: string | null
    initials?: string
  }>
  /** Maximum avatars to show before +N indicator */
  maxDisplay?: number
  /** Size of each avatar */
  size?: AvatarSize
  /** Stack direction */
  direction?: 'horizontal' | 'vertical'
  /** Show tooltip on hover */
  showTooltip?: boolean
  /** Custom className */
  className?: string
}

export function AvatarStack({
  users,
  maxDisplay = 3,
  size = 'md',
  direction = 'horizontal',
  showTooltip = true,
  className
}: AvatarStackProps) {
  const displayUsers = users.slice(0, maxDisplay)
  const remainingCount = users.length - maxDisplay
  const overlapClass = direction === 'horizontal' 
    ? '-space-x-2 hover:-space-x-1' 
    : '-space-y-2 hover:-space-y-1 flex-col'

  return (
    <div className={cn(
      'flex items-center',
      overlapClass,
      'transition-all duration-200',
      className
    )}>
      {displayUsers.map((user, index) => (
        <div 
          key={index}
          className="relative z-10 hover:z-20 transition-transform duration-200 hover:scale-110"
        >
          <UserAvatar
            name={user.name}
            photoUrl={user.photoUrl}
            initials={user.initials}
            size={size}
            showTooltip={showTooltip}
          />
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className={cn(
          'relative z-10 flex items-center justify-center',
          'rounded-full bg-gray-200 dark:bg-gray-700',
          'text-gray-600 dark:text-gray-300 font-medium',
          sizeConfig[size].container,
          sizeConfig[size].text
        )}>
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

// Preset sizes for quick access
export const Avatar = {
  XS: (props: Omit<UserAvatarProps, 'size'>) => <UserAvatar {...props} size="xs" />,
  SM: (props: Omit<UserAvatarProps, 'size'>) => <UserAvatar {...props} size="sm" />,
  MD: (props: Omit<UserAvatarProps, 'size'>) => <UserAvatar {...props} size="md" />,
  LG: (props: Omit<UserAvatarProps, 'size'>) => <UserAvatar {...props} size="lg" />,
  XL: (props: Omit<UserAvatarProps, 'size'>) => <UserAvatar {...props} size="xl" />,
}

export default UserAvatar
