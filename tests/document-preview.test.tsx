import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@market/api';
import { DocumentPreview } from '../apps/admin/src/documents/DocumentPreview';

function props() {
  return {
    api: {
      download: vi.fn().mockResolvedValue({
        filename: 'permit.png',
        mime: 'image/png',
        bytesBase64: btoa('image'),
      }),
    },
    fileId: 'submitted-file',
    title: 'Permit',
    onClose: vi.fn(),
    onDownload: vi.fn(),
    downloading: false,
  };
}

describe('Private document preview', () => {
  it('renders an image and retains the explicit download action', async () => {
    const value = props();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:image');
    render(<DocumentPreview {...value} />);
    expect(
      await screen.findByRole('img', { name: 'permit.png' }),
    ).toHaveAttribute('src', 'blob:image');
    expect(value.onDownload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(value.onDownload).toHaveBeenCalledOnce();
  });

  it('does not embed unsupported content', async () => {
    const value = props();
    value.api.download.mockResolvedValue({
      filename: 'file.html',
      mime: 'text/html',
      bytesBase64: btoa('<script>bad()</script>'),
    });
    const create = vi.spyOn(URL, 'createObjectURL');
    render(<DocumentPreview {...value} />);
    expect(await screen.findByText(/cannot be previewed/)).toBeVisible();
    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows access errors without exposing content and retries through the API', async () => {
    const value = props();
    value.api.download.mockRejectedValueOnce(
      new AppError('forbidden', 'Access denied'),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:retry');
    render(<DocumentPreview {...value} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:retry');
    expect(value.api.download).toHaveBeenNthCalledWith(2, 'submitted-file');
  });

  it('ignores a response received after dismissal', async () => {
    const value = props();
    let finish!: (file: {
      filename: string;
      mime: string;
      bytesBase64: string;
    }) => void;
    value.api.download.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const create = vi.spyOn(URL, 'createObjectURL');
    const view = render(<DocumentPreview {...value} />);
    view.unmount();
    finish({
      filename: 'late.pdf',
      mime: 'application/pdf',
      bytesBase64: btoa('%PDF'),
    });
    await waitFor(() => expect(value.api.download).toHaveResolved());
    expect(create).not.toHaveBeenCalled();
  });
});
