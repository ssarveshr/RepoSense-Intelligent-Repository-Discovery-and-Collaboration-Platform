import { useEffect, useId, useRef, useState } from 'react';
import { sanitizeUsernameInput } from './usernameUtils';

function EditProfileDialogForm({ profile, onClose, onSave }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const [username, setUsername] = useState(profile.clerkUsername || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [skillsInput, setSkillsInput] = useState((profile.skills || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');
    setSaving(true);

    const skills = skillsInput
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    const result = await onSave({
      username: sanitizeUsernameInput(username),
      bio,
      skills,
    });

    setSaving(false);

    if (result?.ok) {
      setSuccessMessage(result.message || 'Profile updated successfully.');
      setTimeout(() => onClose(), 600);
      return;
    }

    setFormError(result?.error || 'Could not save profile changes.');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-6 sm:p-8 outline-none"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Profile
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Update your RepoSense username, bio, and skills.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close edit profile dialog"
          >
            ✕
          </button>
        </div>

        {formError && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {formError}
          </p>
        )}
        {successMessage && (
          <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400" role="status">
            {successMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Username</span>
            <div className="mt-1 flex rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
              <span className="px-3 py-3 text-sm text-gray-400 border-r border-gray-200 dark:border-gray-700">
                @
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
                placeholder="your-username"
                autoComplete="username"
                className="flex-1 px-3 py-3 bg-transparent text-sm outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              4–64 characters. Lowercase letters, numbers, and hyphens. Saved to your Clerk account.
            </p>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Skills</span>
            <input
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Comma-separated</p>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditProfileDialog(props) {
  if (!props.open) return null;
  return (
    <EditProfileDialogForm
      key={`${props.profile.clerkUsername}-${props.profile.bio}-${(props.profile.skills || []).join(',')}`}
      {...props}
    />
  );
}
