const otpForm = document.querySelector<HTMLFormElement>('[data-otp-form]');
if (otpForm) {
  const inputs = [
    ...otpForm.querySelectorAll<HTMLInputElement>('[data-otp-digit]'),
  ];
  const code = otpForm.querySelector<HTMLInputElement>('input[name="code"]')!;
  const sync = () => {
    code.value = inputs.map((input) => input.value).join('');
  };
  function fill(value: string, start: number) {
    if (!/^[0-9\s.-]+$/.test(value)) return;
    const digits = value.replace(/[\s.-]/g, '');
    if (!digits || digits.length > 6) return;
    if (digits.length === 6) start = 0;
    [...digits].forEach((digit, offset) => {
      if (inputs[start + offset]) inputs[start + offset]!.value = digit;
    });
    sync();
    inputs[Math.min(start + digits.length, 5)]!.focus();
  }
  inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      const value = input.value;
      if (value.length > 1) {
        input.value = '';
        fill(value, index);
      } else {
        input.value = /^[0-9]$/.test(value) ? value : '';
        sync();
        if (input.value) inputs[Math.min(index + 1, 5)]!.focus();
      }
    });
    input.addEventListener('paste', (event) => {
      event.preventDefault();
      fill(event.clipboardData?.getData('text') ?? '', index);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        inputs[
          Math.max(0, Math.min(5, index + (event.key === 'ArrowLeft' ? -1 : 1)))
        ]!.focus();
      }
      if (event.key === 'Backspace' && !input.value && index > 0) {
        event.preventDefault();
        inputs[index - 1]!.focus();
      }
    });
    input.addEventListener('focus', () => input.select());
  });
  otpForm.addEventListener('submit', sync);
}
const resendForm =
  document.querySelector<HTMLFormElement>('[data-resend-form]');
if (resendForm) {
  const button = resendForm.querySelector<HTMLButtonElement>('button')!,
    countdown = resendForm.querySelector<HTMLElement>(
      '[data-resend-countdown]',
    )!,
    feedback = resendForm.querySelector<HTMLElement>('[data-resend-status]')!;
  let deadline = 0,
    busy = false;
  function setDeadline(at: string, serverTime: string) {
    deadline =
      performance.now() + Math.max(0, Date.parse(at) - Date.parse(serverTime));
  }
  setDeadline(resendForm.dataset.availableAt!, resendForm.dataset.serverTime!);
  function tick() {
    const seconds = Math.max(
      0,
      Math.ceil((deadline - performance.now()) / 1000),
    );
    button.disabled = busy || seconds > 0;
    button.hidden = seconds > 0;
    countdown.textContent =
      seconds > 0 ? `Resend code in ${seconds} seconds` : '';
  }
  tick();
  const timer = window.setInterval(tick, 250);
  window.addEventListener('pagehide', () => window.clearInterval(timer), {
    once: true,
  });
  document.addEventListener(
    'astro:before-swap',
    () => window.clearInterval(timer),
    { once: true },
  );
  resendForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (button.disabled || busy) return;
    busy = true;
    feedback.textContent = '';
    tick();
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        body: new URLSearchParams({ action: 'resendPhoneRegistration' }),
        headers: { 'x-account-form': 'json' },
        credentials: 'same-origin',
        signal: AbortSignal.timeout(15000),
      });
      const result = (await response.json()) as {
        accepted?: boolean;
        resendAvailableAt?: string;
        serverTime?: string;
        retryAt?: string;
        error?: string;
      };
      if (
        response.ok &&
        result.accepted &&
        result.resendAvailableAt &&
        result.serverTime
      ) {
        setDeadline(result.resendAvailableAt, result.serverTime);
        feedback.textContent = 'A new verification code has been sent.';
        otpForm?.reset();
        otpForm?.querySelector<HTMLInputElement>('[data-otp-digit]')?.focus();
      } else {
        if (result.retryAt && result.serverTime)
          setDeadline(result.retryAt, result.serverTime);
        feedback.textContent =
          result.error ??
          'A new code could not be sent. Please try again later.';
      }
    } catch {
      feedback.textContent =
        'A new code could not be sent. Please try again later.';
    } finally {
      busy = false;
      tick();
    }
  });
}
