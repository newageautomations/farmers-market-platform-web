import { useCallback } from 'react';
import { AppError, type Listing } from '@market/api';
import { mayCommand } from '@market/admin-core';
import { Badge } from '@market/ui';
import { CommandForm, ReadState, useRead } from './common';
import { categoryOptions } from './product-taxonomy';
import type { VendorService } from './service';
import { vendorStatusTone } from './status-presentation';

/** Publication requires a valid leaf primary category; the backend enforces it too. */
export async function hasLeafCategory(
  service: VendorService,
  productId: string,
) {
  if (!service.taxonomy) throw new AppError('unavailable');
  const [nodes, classification] = await Promise.all([
    service.taxonomy.hierarchy(),
    service.taxonomy.classification(productId),
  ]);
  return categoryOptions(nodes).some(
    ({ node }) =>
      node.id === classification.primaryCategory?.id &&
      node.assignable &&
      !node.children.length,
  );
}

/** Publish and unpublish one market listing. */
export function PublicationControls({
  service,
  listing,
  refresh,
}: {
  service: VendorService;
  listing: Listing;
  refresh: () => void;
}) {
  const read = useCallback(
    () => service.publication(listing.id),
    [service, listing.id],
  );
  const query = useRead(`publication:${listing.id}`, read);
  const readClassification = useCallback(async () => {
    if (!query.data) throw new AppError('unavailable');
    return hasLeafCategory(service, query.data.productId);
  }, [service, query.data]);
  const classification = useRead(
    `publication-classification:${listing.id}`,
    readClassification,
    listing.status === 'approved' &&
      !!query.data &&
      mayCommand(service.context, 'ManageCatalogPublication'),
  );
  const done = () => {
    query.refresh();
    classification.refresh();
    refresh();
  };
  return (
    <>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <Badge tone={vendorStatusTone('publication', query.data.state)}>
          {query.data.state.replaceAll('_', ' ').toLowerCase()}
        </Badge>
      )}

      {mayCommand(service.context, 'ManageCatalogPublication') && (
        <>
          {listing.status === 'approved' && (
            <CommandForm
              embedded
              title="Publish listing"
              validate={() => {
                if (!classification.data)
                  throw new AppError('validation', 'PRODUCT_CATEGORY_REQUIRED');
              }}
              run={() => service.publish(listing.id)}
              onDone={done}
              submitLabel="Publish"
            >
              <p>Publish this approved listing to its Market.</p>
              <ReadState {...classification} retry={classification.refresh} />
              {classification.data === false && (
                <p>
                  Select a valid leaf category in the product editor before
                  publishing this listing.
                </p>
              )}
            </CommandForm>
          )}
          <CommandForm
            embedded
            title="Unpublish listing"
            confirm="Unpublish this listing from its Market? Existing orders remain backend managed."
            run={() => service.unpublish(listing.id)}
            onDone={done}
            submitLabel="Review unpublish"
          >
            <p>Remove publication for this listing.</p>
          </CommandForm>
        </>
      )}
    </>
  );
}
