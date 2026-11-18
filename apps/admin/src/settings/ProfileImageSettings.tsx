import { useCallback, useState } from 'react';
import {
  safeError,
  type AppError,
  type BusinessProfileImageApi,
} from '@market/api';
import { IdentityIcon } from '@market/ui/workspace';
import { ErrorState, UtilityIcon } from '@market/ui';
import { FarmstandButton } from '@market/ui/farmstand';
import { CategoryImageField } from '../vendor/categories';
import { ReadState, useRead } from '../vendor/common';

/**
 * The current Market's or Vendor's profile picture, shown beside the business
 * in dashboard tables. It is not storefront content: choosing one never
 * changes a website, and editing a website never changes it.
 *
 * Reuses `CategoryImageField` (upload and My Images library dialog) with the
 * profile-picture media API, and the shared `IdentityIcon` tile for the
 * preview, so the picture looks the same here as in tables.
 */
export function ProfileImageSettings({
  api,
  kind,
  editable,
}: {
  api: BusinessProfileImageApi;
  kind: 'market' | 'vendor';
  /** Owners and Administrators. The backend enforces the same rule. */
  editable: boolean;
}) {
  const read = useCallback(() => api.own(), [api]);
  const current = useRead('business-profile-image', read);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError>();
  const [status, setStatus] = useState('');
  const image = current.data?.url ?? null;
  const choose = async (assetId: string | null) => {
    setBusy(true);
    setError(undefined);
    setStatus('');
    try {
      await api.set(assetId);
      setStatus(
        assetId ? 'Profile picture saved.' : 'Profile picture removed.',
      );
      current.refresh();
    } catch (e) {
      setError(safeError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="profile-image-settings">
      <ReadState {...current} retry={current.refresh} />
      {current.data !== undefined && (
        <>
          <div className="profile-image-row">
            <IdentityIcon
              icon={kind === 'market' ? 'store' : 'user-round'}
              image={image}
              className="markets-identity-icon profile-image-preview"
            />
            {editable ? (
              <div className="profile-image-actions">
                <CategoryImageField
                  api={api}
                  value={current.data?.assetId ?? null}
                  preview={image}
                  label="Profile picture"
                  presentation="library"
                  renderTrigger={(open, disabled) => (
                    <FarmstandButton
                      variant="secondary"
                      aria-label="Choose profile picture"
                      aria-haspopup="dialog"
                      disabled={disabled || busy}
                      onClick={open}
                    >
                      <UtilityIcon name="plus" />
                      {image ? 'Replace picture' : 'Add picture'}
                    </FarmstandButton>
                  )}
                  onImageChange={(chosen) => void choose(chosen?.id ?? null)}
                />
                {image && (
                  <FarmstandButton
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void choose(null)}
                  >
                    Remove
                  </FarmstandButton>
                )}
              </div>
            ) : (
              <p className="settings-note">
                Only an Owner or Administrator can change the profile picture.
              </p>
            )}
          </div>
          {busy && <p role="status">Saving profile picture...</p>}
          {status && !busy && <p role="status">{status}</p>}
          {error && <ErrorState error={error} />}
        </>
      )}
      <p className="settings-note">
        Shown beside your {kind === 'market' ? 'market' : 'business'} in
        dashboard tables and when customers discover{' '}
        {kind === 'market' ? 'markets' : 'vendors'}. It is separate from your
        storefront website. PNG or JPEG, square images look best.
      </p>
    </div>
  );
}
