import { useEffect, useId, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import UserAvatar from '../auth/UserAvatar';
import {
  PROFILE_IMAGE_ACCEPT,
  validateProfileImageFile,
} from '../profile/profileUtils';

function ProfilePhotoPreviewDialog({
  previewUrl,
  uploading,
  error,
  onCancel,
  onConfirm,
  onRemove,
  hasExistingImage,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !uploading) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, uploading]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !uploading) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-6 outline-none"
      >
        <h2 id={titleId} className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Update profile picture
        </h2>

        <div className="flex justify-center mb-4">
          <img
            src={previewUrl}
            alt="Profile preview"
            className="w-40 h-40 rounded-full object-cover border border-gray-200 dark:border-gray-700"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={uploading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Save photo'}
          </button>
          {hasExistingImage && (
            <button
              type="button"
              onClick={onRemove}
              disabled={uploading}
              className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {uploading ? 'Removing…' : 'Remove photo'}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="w-full py-2.5 rounded-xl text-gray-600 dark:text-gray-400 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePhotoEditor({ user, size = 'xl', className = '' }) {
  const { user: clerkUser } = useUser();
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const activeUser = clerkUser || user;
  const canEdit = Boolean(clerkUser?.setProfileImage);

  const revokePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  useEffect(() => () => revokePreview(), []);

  const resetPicker = () => {
    revokePreview();
    setPendingFile(null);
    setPreviewUrl(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChooseFile = () => {
    setError('');
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateProfileImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      event.target.value = '';
      return;
    }

    revokePreview();
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setPendingFile(file);
    setPreviewUrl(objectUrl);
    setError('');
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile || !clerkUser?.setProfileImage) return;

    setUploading(true);
    setError('');
    try {
      await clerkUser.setProfileImage({ file: pendingFile });
      await clerkUser.reload();
      resetPicker();
    } catch {
      setError('Could not update profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!clerkUser?.setProfileImage) return;

    setUploading(true);
    setError('');
    try {
      await clerkUser.setProfileImage({ file: null });
      await clerkUser.reload();
      resetPicker();
    } catch {
      setError('Could not remove profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="relative group">
        <UserAvatar user={activeUser} size={size} />

        {canEdit && (
          <>
            <button
              type="button"
              onClick={handleChooseFile}
              aria-label="Change profile picture"
              className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/45 focus:bg-black/45 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
            >
              <span className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex flex-col items-center text-white text-xs font-semibold">
                <svg className="w-6 h-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z" />
                </svg>
                Change photo
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept={PROFILE_IMAGE_ACCEPT}
              onChange={handleFileChange}
              className="sr-only"
              tabIndex={-1}
            />
          </>
        )}
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={handleChooseFile}
          className="mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 mx-auto lg:mx-0 block"
        >
          Change photo
        </button>
      )}

      {error && !previewUrl && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400 text-center lg:text-left" role="alert">
          {error}
        </p>
      )}

      {previewUrl && (
        <ProfilePhotoPreviewDialog
          previewUrl={previewUrl}
          uploading={uploading}
          error={error}
          onCancel={resetPicker}
          onConfirm={handleConfirmUpload}
          onRemove={handleRemovePhoto}
          hasExistingImage={Boolean(activeUser?.imageUrl)}
        />
      )}
    </div>
  );
}
