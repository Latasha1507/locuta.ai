'use client'

// COMPATIBILITY SHIM — do not add anything new here.
//
// The icon system now lives in `components/ui/icons.tsx`. This file only exists
// so pages that still import from '@/components/landing/icons' keep compiling
// while they're migrated one at a time. Deleting it outright broke the build,
// because several marketing pages still point here.
//
// It forwards everything to the new system and translates the old API:
//   OLD  <Icon id="ic-mic" size={20} color="#3fce6f" />
//   NEW  <Icon name="mic"  size={20} color="#3fce6f" />
//
// TO MIGRATE A PAGE:
//   1. import { Icon } from '@/components/ui/icons'
//   2. change  id="ic-foo"  ->  name="foo"
//   3. delete any <LandingIconSprite /> (the new system needs no sprite)
// When `grep -rn "landing/icons" app components` comes back empty, delete this.

import { Icon as UiIcon, type IconProps } from '@/components/ui/icons'

export { LocutaLogo } from '@/components/ui/LocutaLogo'

/**
 * The old system rendered a hidden <symbol> sprite that <use> referenced. The
 * new icons are self-contained SVGs, so there is nothing to mount — this is a
 * deliberate no-op kept only so existing `<LandingIconSprite />` calls compile.
 */
export function LandingIconSprite() {
  return null
}

type LegacyIconProps = Omit<IconProps, 'name'> & {
  /** Old sprite id, e.g. "ic-mic". Prefer `name` on new code. */
  id?: string
  name?: IconProps['name']
}

/** Accepts the old `id` prop or the new `name` prop. */
export function Icon({ id, name, ...rest }: LegacyIconProps) {
  const resolved = name ?? id
  if (!resolved) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Icon] called with neither `name` nor `id`.')
    }
    return null
  }
  // The new Icon already strips a leading "ic-", so old ids resolve as-is.
  return <UiIcon name={resolved} {...rest} />
}
