/** This policy belongs to the standalone fixture server, never an application router. */
export function assertGalleryEnvironment(
  command: string,
  environment: Record<string, string | undefined>,
) {
  if (
    !['dev', 'sync'].includes(command) ||
    environment.NODE_ENV !== 'development' ||
    environment.UI_COMPONENT_GALLERY !== 'local-only'
  ) {
    throw new Error(
      'UI component gallery requires the explicit local development launcher. Build and preview are forbidden.',
    );
  }
}

export const galleryUrl = 'http://127.0.0.1:4343/';
