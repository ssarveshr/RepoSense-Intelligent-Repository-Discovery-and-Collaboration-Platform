import { SignUp } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProfileAuth } from '../providers/profileAuthContext.js';

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useProfileAuth();
  const location = useLocation();
  const redirectTo = location.state?.from || '/meetings';

  if (isLoaded && isSignedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl={redirectTo} />
    </div>
  );
}
