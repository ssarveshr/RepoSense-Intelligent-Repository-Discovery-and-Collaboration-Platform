import { useState } from 'react';
import ProfileSkeleton from '../components/profile/ProfileSkeleton';
import ProfileSidebar from '../components/profile/ProfileSidebar';
import ProfileGitHubSection from '../components/profile/ProfileGitHubSection';
import EditProfileDialog from '../components/profile/EditProfileDialog';
import { useProfile } from '../hooks/useProfile';
import { useGitHubProfile } from '../hooks/useGitHubProfile';
import { useGitHubConnection } from '../hooks/useGitHubConnection';
import { useProfileAuth } from '../providers/profileAuthContext.js';

export default function Profile() {
  const { user, usernameSetupState } = useProfileAuth();
  const { profile, loading, error, saveProfile, reloadProfile } = useProfile();
  const {
    data: githubProfile,
    loading: githubProfileLoading,
    error: githubProfileError,
    reload: reloadGitHubProfile,
  } = useGitHubProfile();
  const {
    connection: githubConnection,
    connectGitHub,
    disconnect: disconnectGitHub,
    isConnected: isGitHubConnected,
    loading: githubConnectionLoading,
    error: githubConnectionError,
    reloadConnection: reloadGitHubConnection,
  } = useGitHubConnection();
  const [editOpen, setEditOpen] = useState(false);

  const githubSectionLoading =
    (githubProfileLoading || githubConnectionLoading) &&
    !githubProfile &&
    !githubConnection &&
    !githubProfileError &&
    !githubConnectionError;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-8 text-center">
          <p className="font-semibold text-red-800 dark:text-red-200">Couldn&apos;t load your profile.</p>
          <button
            type="button"
            onClick={reloadProfile}
            className="mt-4 text-sm font-semibold text-red-700 dark:text-red-300 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 motion-reduce:animate-none">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 lg:gap-10 items-start">
        <ProfileSidebar
          profile={profile}
          user={user}
          usernameSetupState={usernameSetupState}
          onEditProfile={() => setEditOpen(true)}
        />

        <div className="space-y-6 min-w-0">
          <ProfileGitHubSection
            data={githubProfile}
            loading={githubSectionLoading}
            error={githubProfileError}
            connectionError={githubConnectionError}
            onRetry={reloadGitHubProfile}
            onConnectGitHub={connectGitHub}
            onDisconnectGitHub={disconnectGitHub}
            isOAuthConnected={isGitHubConnected}
            connection={githubConnection}
            onReloadConnection={reloadGitHubConnection}
          />
        </div>
      </div>

      <EditProfileDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSave={saveProfile}
      />
    </div>
  );
}
