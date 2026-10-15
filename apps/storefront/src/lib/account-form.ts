// Keep values in the current form after rejected requests. Native submission remains
// available without JavaScript. Authentication handoffs retain their normal navigation.
const actions = new Set([
  'register',
  'requestPersonalPhone',
  'requestAdministratorPhone',
  'updateProfile',
  'saveOnboarding',
  'requestEmailProof',
  'changePassword',
  'verifyPhoneRegistration',
]);

for (const form of document.querySelectorAll<HTMLFormElement>(
  'form[action="/api/account"]',
)) {
  const action = form.querySelector<HTMLInputElement>(
    'input[name="action"]',
  )?.value;
  if (!action || !actions.has(action)) continue;
  let pending = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    const submitter = event.submitter;
    const values = new FormData(form, submitter);
    const body = new URLSearchParams();
    for (const [key, value] of values)
      if (typeof value === 'string') body.append(key, value);
    if (action === 'register')
      form.dispatchEvent(new Event('account:submitted'));
    let feedback = form.querySelector<HTMLParagraphElement>(
      '[data-account-error]',
    );
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.dataset.accountError = '';
      feedback.setAttribute('role', 'alert');
      feedback.tabIndex = -1;
      form.append(feedback);
    }
    feedback.textContent = '';
    pending = true;
    form.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        body,
        credentials: 'same-origin',
        headers: { 'x-account-form': 'json' },
        signal: AbortSignal.timeout(15000),
      });
      const result = (await response.json()) as {
        location?: string;
        error?: string;
      };
      if (!response.ok) {
        feedback.textContent =
          result.error ??
          'Check your details and try again. Your entries are still here.';
        feedback.focus();
        return;
      }
      const target = new URL(result.location ?? '', window.location.origin);
      if (
        !result.location ||
        target.origin !== window.location.origin ||
        !/^\/account(?:\/|$)/.test(target.pathname)
      )
        throw new Error('Invalid account continuation');
      window.location.assign(target.href);
    } catch {
      feedback.textContent =
        'The request could not be completed. Your entries are still here. Please try again.';
      feedback.focus();
    } finally {
      pending = false;
      form.removeAttribute('aria-busy');
    }
  });
}
