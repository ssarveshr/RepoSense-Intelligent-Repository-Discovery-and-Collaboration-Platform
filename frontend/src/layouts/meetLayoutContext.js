import { createContext, useContext } from 'react';

export const MeetLayoutContext = createContext({ standalone: false });

export function useMeetLayout() {
  return useContext(MeetLayoutContext);
}
