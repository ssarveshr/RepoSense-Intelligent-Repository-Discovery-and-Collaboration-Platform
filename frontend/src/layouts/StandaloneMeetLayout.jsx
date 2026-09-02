import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { MeetLayoutContext } from './meetLayoutContext.js';

export default function StandaloneMeetLayout() {
  useEffect(() => {
    document.documentElement.classList.add('meet-standalone');
    return () => document.documentElement.classList.remove('meet-standalone');
  }, []);

  return (
    <MeetLayoutContext.Provider value={{ standalone: true }}>
      <div className="meet-root h-[100dvh] w-full overflow-hidden bg-gray-950 text-gray-100">
        <Outlet />
      </div>
    </MeetLayoutContext.Provider>
  );
}
