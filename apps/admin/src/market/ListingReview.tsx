import { useCallback, useState } from 'react';
import {
  safeError,
  type AppError,
  type MarketListingStatus,
  type MarketOrganizerRelationshipState,
} from '@market/api';
import { Alert, Dialog, ErrorState } from '@market/ui';
import { FarmstandButton, FarmstandIcon } from '@market/ui/farmstand';
import { HarvestProductPreview } from '../vendor/HarvestProductPreview';
import { ReadState, useRead } from './common';
import { StatusBadge } from './presentation';
import type { MarketService } from './service';

type Listing = MarketOrganizerRelationshipState['listings'][number];

/**
 * The Market's review of one listed product: the same read-only Harvest
 * preview the Vendor sees before publishing, with Approve and Deny only.
 * Deny records the existing `withdrawn` listing status.
 */
export function ListingReview({
  service,
  listing,
  canReview,
  membershipApproved,
  onClose,
  onSaved,
}: {
  service: MarketService;
  listing: Listing;
  canReview: boolean;
  membershipApproved: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const read = useCallback(
    () => service.listingPreview(listing.id),
    [service, listing.id],
  );
  const preview = useRead(
    `${service.readKey}:listing-preview:${listing.id}:${listing.version}`,
    read,
  );
  const [busy, setBusy] = useState(false);
  const [confirmDeny, setConfirmDeny] = useState(false);
  const [error, setError] = useState<AppError>();
  const name = listing.variant.product.name;
  async function decide(status: MarketListingStatus) {
    setBusy(true);
    setError(undefined);
    try {
      await service.approveListing(listing.id, listing.version, status);
      onSaved();
    } catch (cause) {
      setError(safeError(cause));
    } finally {
      setBusy(false);
    }
  }
  const data = preview.data;
  return (
    <Dialog
      open
      size="wide"
      title={`Review ${name}`}
      description="This is how the product appears to customers. Approve it to let the Vendor sell it at your market, or deny it."
      busy={busy}
      onClose={onClose}
      actions={
        canReview && (
          <div className="listing-review-actions">
            {confirmDeny ? (
              <>
                <FarmstandButton
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setConfirmDeny(false)}
                >
                  Keep reviewing
                </FarmstandButton>
                <FarmstandButton
                  variant="destructive"
                  loading={busy}
                  onClick={() => decide('withdrawn')}
                >
                  Deny listing
                </FarmstandButton>
              </>
            ) : (
              <>
                <FarmstandButton
                  variant="destructive-outline"
                  disabled={busy || listing.status === 'withdrawn'}
                  onClick={() => setConfirmDeny(true)}
                >
                  Deny
                </FarmstandButton>
                <FarmstandButton
                  loading={busy}
                  disabled={
                    busy || listing.status === 'approved' || !membershipApproved
                  }
                  onClick={() => decide('approved')}
                >
                  <FarmstandIcon name="circle-check" />
                  Approve
                </FarmstandButton>
              </>
            )}
          </div>
        )
      }
    >
      <div className="listing-review farmstand-controls">
        <dl className="listing-review-facts">
          <div>
            <dt>Approval</dt>
            <dd>
              <StatusBadge>
                {listing.status === 'withdrawn' ? 'denied' : listing.status}
              </StatusBadge>
            </dd>
          </div>
          <div>
            <dt>Option</dt>
            <dd>{listing.variant.name}</dd>
          </div>
          <div>
            <dt>SKU</dt>
            <dd>{listing.variant.sku}</dd>
          </div>
          <div>
            <dt>Storefront</dt>
            <dd>
              <StatusBadge>{listing.publication.state}</StatusBadge>
            </dd>
          </div>
        </dl>
        {confirmDeny && (
          <Alert severity="warning">
            Deny this listing? The Vendor cannot sell it at your market until
            you approve it again. This does not delete the product or refund
            any orders.
          </Alert>
        )}
        {canReview && !membershipApproved && (
          <Alert severity="info">
            Approve this Vendor’s membership before approving its products.
          </Alert>
        )}
        {listing.status === 'approved' && canReview && !confirmDeny && (
          <p className="listing-review-note">
            Already approved. Deny it to stop the Vendor selling it at your
            market.
          </p>
        )}
        <ReadState
          loading={preview.loading}
          error={preview.error}
          retry={preview.refresh}
        />
        {data && (
          <HarvestProductPreview
            idPrefix={`listing-${listing.id}`}
            name={data.productName || name}
            variants={[
              {
                id: listing.variantId,
                name: data.variantName || listing.variant.name,
                price: data.price ?? null,
                currency: data.currency ?? null,
                description: data.description,
                productInformation: data.productInformation,
                images: data.images.map((preview, index) => ({
                  id: String(index),
                  preview,
                })),
              },
            ]}
          />
        )}
        {error && <ErrorState error={error} />}
      </div>
    </Dialog>
  );
}
