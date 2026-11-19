import {useCallback, useRef} from 'react';

// Returns a function that keeps one identity for the life of the component
// and always calls the newest `callback`. Memoized children that take it as a
// prop then draw again only when their own values change.
export const useLatestCallback = callback => {
  const latest = useRef(callback);
  latest.current = callback;
  return useCallback((...args) => latest.current?.(...args), []);
};

export default useLatestCallback;
