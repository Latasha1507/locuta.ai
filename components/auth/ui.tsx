'use client'

import { useId, useState } from 'react'
import { lc, fontDisplay } from '@/components/landing/tokens'

// Chunky-3D form primitives matching the Locuta design system.
// Every input is properly labelled and keyboard-focusable — this is a
// consumer product and the form is the highest-stakes screen we have.

export function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  minLength,
  hint,
  onFocus,
  onBlur,
  disabled,
}: {
  label: string
  type: 'text' | 'email' | 'password'
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  minLength?: number
  hint?: string
  onFocus?: () => void
  onBlur?: () => void
  disabled?: boolean
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const [focused, setFocused] = useState(false)
  const [reveal, setReveal] = useState(false)
  const isPassword = type === 'password'

  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontFamily: fontDisplay,
          fontWeight: 800,
          fontSize: 13,
          color: lc.ink,
          marginBottom: 7,
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={isPassword && reveal ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setFocused(true)
            onFocus?.()
          }}
          onBlur={() => {
            setFocused(false)
            onBlur?.()
          }}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          disabled={disabled}
          aria-describedby={hint ? hintId : undefined}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: isPassword ? '14px 60px 14px 16px' : '14px 16px',
            borderRadius: 14,
            border: `2px solid ${focused ? lc.green : '#e2ead9'}`,
            background: disabled ? '#f4f7f0' : '#fff',
            boxShadow: `0 4px 0 ${focused ? lc.greenDark : '#e2ead9'}`,
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 700,
            color: lc.ink,
            outline: 'none',
            transition: 'border-color .15s ease, box-shadow .15s ease',
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 0,
              cursor: 'pointer',
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: '0.04em',
              color: '#9aa891',
              padding: 6,
            }}
          >
            {reveal ? 'HIDE' : 'SHOW'}
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} style={{ margin: '7px 0 0', fontSize: 12, color: lc.faint, fontWeight: 700 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

export function PrimaryButton({
  children,
  loading,
  disabled,
  type = 'submit',
  onClick,
}: {
  children: React.ReactNode
  loading?: boolean
  disabled?: boolean
  type?: 'submit' | 'button'
  onClick?: () => void
}) {
  const off = loading || disabled
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={off}
      style={{
        width: '100%',
        background: off ? '#a8ddb9' : lc.green,
        color: '#fff',
        border: 0,
        padding: 15,
        borderRadius: 15,
        fontFamily: fontDisplay,
        fontWeight: 800,
        fontSize: 15,
        letterSpacing: '0.02em',
        cursor: off ? 'not-allowed' : 'pointer',
        boxShadow: `0 5px 0 ${off ? '#8fc9a1' : lc.greenDark}`,
        transition: 'background .15s ease',
      }}
    >
      {loading ? 'ONE SEC…' : children}
    </button>
  )
}

export function GoogleButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        background: '#fff',
        color: '#5f6d58',
        border: '2px solid #e2ead9',
        padding: 14,
        borderRadius: 15,
        fontFamily: fontDisplay,
        fontWeight: 800,
        fontSize: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: '0 4px 0 #e2ead9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      {label}
    </button>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        background: '#fff5f3',
        border: '2px solid #ffdcd6',
        color: '#c0392b',
        borderRadius: 14,
        padding: '12px 14px',
        fontSize: 13.5,
        fontWeight: 700,
        lineHeight: 1.45,
        boxShadow: '0 4px 0 #ffdcd6',
      }}
    >
      {message}
    </div>
  )
}

export function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ flex: 1, height: 2, background: '#e8ece2', borderRadius: 2 }} />
      <span style={{ fontSize: 12, fontWeight: 800, color: '#a8b5a0', whiteSpace: 'nowrap' }}>{children}</span>
      <span style={{ flex: 1, height: 2, background: '#e8ece2', borderRadius: 2 }} />
    </div>
  )
}
