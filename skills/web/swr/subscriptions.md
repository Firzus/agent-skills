# Subscriptions

Use `useSWRSubscription` from `swr/subscription` for realtime sources such as
WebSocket, Firebase, or event streams:

```tsx
import useSWRSubscription from 'swr/subscription'

export function useLivePrice(symbol: string) {
  return useSWRSubscription(['price', symbol], ([, currentSymbol], { next }) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(
      `${protocol}//${window.location.host}/api/prices?symbol=${encodeURIComponent(currentSymbol)}`,
    )

    socket.addEventListener('message', event => {
      next(null, JSON.parse(event.data))
    })

    socket.addEventListener('error', event => {
      next(event instanceof ErrorEvent ? event.error : new Error('Socket error'))
    })

    return () => socket.close()
  })
}
```

Rules:

- The subscribe function must return a cleanup function.
- Multiple mounted hooks with the same key share one subscription; it closes
  after the last consumer unmounts.
