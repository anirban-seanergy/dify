// TypeScript type definitions for custom JSX elements
// Custom JSX elements for emoji-mart web components

import type * as React from 'react'

declare module 'react' {
  namespace JSX {
    // eslint-disable-next-line ts/consistent-type-definitions
    interface IntrinsicElements {
      'em-emoji': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}
