import { useEffect, useState } from 'react';

import { Navigate, useParams } from 'react-router-dom';

import { resolveMeeting } from '../services/collaborationApi';

import MeetingEndedView from '../components/meeting/MeetingEndedView';



export default function MeetJoinPage() {

  const { code } = useParams();

  const [targetId, setTargetId] = useState(null);

  const [error, setError] = useState(null);



  useEffect(() => {

    document.title = 'Join — RepoSense Meet';

  }, []);



  useEffect(() => {

    if (!code) {

      setError('Enter a valid meeting ID.');

      return;

    }



    let cancelled = false;

    resolveMeeting(code)

      .then((meeting) => {

        if (!cancelled) setTargetId(meeting.id);

      })

      .catch((err) => {

        if (!cancelled) setError(err.message || 'Meeting not found.');

      });



    return () => {

      cancelled = true;

    };

  }, [code]);



  if (targetId) {

    return <Navigate to={`/meetings/${targetId}`} replace />;

  }



  if (error) {

    return (

      <MeetingEndedView

        title={/ended/i.test(error) ? 'Meeting ended' : 'Unable to join meeting'}

        message={error}

        returnHref="/meetings"

      />

    );

  }



  return (

    <div className="flex items-center justify-center h-full min-h-[100dvh] bg-gray-950">

      <div className="flex items-center gap-3 text-gray-300 text-sm font-semibold">

        <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />

        Resolving meeting ID…

      </div>

    </div>

  );

}

