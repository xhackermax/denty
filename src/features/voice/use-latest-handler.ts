import { useCallback, useRef } from "react";

export interface LatestHandler<Args extends unknown[], Result> {
  dispatch: (...args: Args) => Result | undefined;
  bind: (handler: (...args: Args) => Result) => void;
}

// Long-lived callbacks (speech engines, sockets) must reach the current handler,
// not the one from the render in which they were created.
export function useLatestHandler<Args extends unknown[], Result>(): LatestHandler<Args, Result> {
  const handlerRef = useRef<((...args: Args) => Result) | null>(null);
  const dispatch = useCallback((...args: Args) => handlerRef.current?.(...args), []);
  const bind = useCallback((handler: (...args: Args) => Result) => {
    handlerRef.current = handler;
  }, []);
  return { dispatch, bind };
}
