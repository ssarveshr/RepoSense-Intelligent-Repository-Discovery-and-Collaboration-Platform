import ProfilePhotoEditor from './ProfilePhotoEditor';

import ProfileSkills from './ProfileSkills';

import UsernameDisplay from './UsernameDisplay';



export default function ProfileSidebar({ profile, user, usernameSetupState, onEditProfile }) {

  return (

    <aside className="space-y-4">

      <ProfilePhotoEditor user={user} size="xl" className="mx-auto lg:mx-0" />



      <div className="text-center lg:text-left space-y-1">

        {profile.displayName && (

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.displayName}</h1>

        )}

        <UsernameDisplay

          user={user}

          setupState={usernameSetupState}

          className="text-lg text-gray-500 dark:text-gray-400"

        />

      </div>



      {profile.bio && (

        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-center lg:text-left">

          {profile.bio}

        </p>

      )}



      <ProfileSkills skills={profile.skills} />



      <button

        type="button"

        onClick={onEditProfile}

        className="w-full px-4 py-1.5 text-sm font-semibold rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"

      >

        Edit profile

      </button>

    </aside>

  );

}

