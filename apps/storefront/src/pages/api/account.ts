import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { boundedBody } from '@market/config';
import {
  accountBridge,
  accountOrigin,
  isCentral,
  setUnifiedCentral,
  AccountBridgeError,
  authorizeUnifiedAccount,
  defaultAccountDestination,
  safeAccountReturn,
} from '../../lib/account';
import { validPassword } from '@market/ui';
import { requestCheckout } from '../../lib/shop';
const enhancedActions = new Set([
  'register',
  'requestPersonalPhone',
  'updateProfile',
  'saveOnboarding',
  'requestEmailProof',
  'changePassword',
  'resendPhoneRegistration',
  'verifyPhoneRegistration',
]);
function accountNavigation(callback: string, headers: Headers) {
  const target = callback.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(
    '<!doctype html><html lang="en"><head><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=' +
      target +
      '"><title>Continue to your account</title></head><body><main><h1>Continue to your account</h1><a href="' +
      target +
      '">Continue</a></main></body></html>',
    { status: 200, headers },
  );
}
export const POST: APIRoute = async (context) => {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  let verificationRetry = '';
  let formAction = '';
  let loginRetry = '';
  try {
    if (context.request.headers.get('origin') !== context.url.origin)
      throw new Error('Denied');
    const data = await boundedBody(context.request, 16384);
    const form = new URLSearchParams(data),
      action = form.get('action');
    formAction = action ?? '';
    // URL encoding can triple UTF-8 byte size. Keep the decoded semantic limit
    // aligned with the bridge without rejecting valid international names.
    if (JSON.stringify(Object.fromEntries(form)).length > 4096)
      throw new Error('Denied');
    const boundary = createHash('sha256')
      .update(context.clientAddress)
      .digest('hex');
    const central =
      context.cookies.get('platform-unified-account')?.value ?? '';
    let location = '/account';
    if (isCentral(context.url)) {
      switch (action) {
        case 'register':
        case 'requestPersonalPhone': {
          if (action === 'register') {
            if (form.get('password') !== form.get('confirmPassword'))
              throw new AccountBridgeError('PASSWORD_MISMATCH', 400);
            if (!validPassword(form.get('password') ?? ''))
              throw new AccountBridgeError('PASSWORD_INVALID', 400);
          }
          const r = await accountBridge<{ challenge: string }>({
            action,
            central,
            firstName: form.get('firstName') ?? '',
            lastName: form.get('lastName') ?? '',
            email: form.get('email') ?? '',
            phone: form.get('phone') ?? '',
            identifier: form.get('identifier') ?? '',
            password: form.get('password') ?? '',
            confirmPassword: form.get('confirmPassword') ?? '',
            boundary,
          });
          context.cookies.set('phone-challenge', r.challenge, {
            httpOnly: true,
            secure: context.url.protocol === 'https:',
            sameSite: 'strict',
            path: '/',
            maxAge: 600,
          });
          location =
            action === 'register' ? '/account/verify' : '/account/phone?sent=1';
          break;
        }
        case 'resendPhoneRegistration': {
          verificationRetry = '/account/verify?resendError=1';
          const result = await accountBridge<{
            accepted: boolean;
            resendAvailableAt: string;
            serverTime: string;
          }>({
            action,
            challenge: context.cookies.get('phone-challenge')?.value ?? '',
            boundary,
          });
          headers.set('Content-Type', 'application/json');
          if (context.request.headers.get('x-account-form') === 'json')
            return new Response(JSON.stringify(result), {
              status: 200,
              headers,
            });
          location = '/account/verify?resent=1';
          break;
        }
        case 'verifyPhoneRegistration':
        case 'verifyPersonalPhone': {
          verificationRetry =
            action === 'verifyPhoneRegistration'
              ? '/account/verify?error=1'
              : '/account/phone?sent=1&error=1';
          const verified = await accountBridge<{
            central?: string;
            callback?: string;
          }>({
            action,
            central,
            challenge: context.cookies.get('phone-challenge')?.value ?? '',
            code:
              form.get('code') ||
              Array.from(
                { length: 6 },
                (_, i) => form.get(`digit${i + 1}`) ?? '',
              ).join(''),
            password: form.get('password') ?? '',
            boundary,
          });
          if (verified.central) setUnifiedCentral(context, verified.central);
          context.cookies.delete('phone-challenge', { path: '/' });
          if (verified.callback)
            return accountNavigation(verified.callback, headers);
          if (action === 'verifyPhoneRegistration') {
            const saved = context.cookies.get('account-signup-return')?.value;
            if (saved) {
              const continuation = JSON.parse(saved);
              // Registration verifies the phone but does not create a login session.
              // Retain the validated origin/correlation for the existing password sign-in.
              location =
                '/account/login?verified=1&origin=' +
                encodeURIComponent(continuation.origin) +
                '&correlation=' +
                encodeURIComponent(continuation.correlation) +
                '&destination=' +
                encodeURIComponent(continuation.destination ?? '/');
              context.cookies.delete('account-signup-return', { path: '/' });
              break;
            }
          }
          if (
            action === 'verifyPersonalPhone' &&
            context.cookies.has('account-login-return')
          ) {
            location =
              '/account/login?' +
              (context.cookies.get('account-login-return')?.value ?? '');
            context.cookies.delete('account-login-return', { path: '/' });
            break;
          }
          location =
            action === 'verifyPhoneRegistration'
              ? '/account/login?verified=1'
              : '/account?saved=1';
          break;
        }
        case 'requestEmailProof':
          await accountBridge({ action, central });
          location = '/account/settings?emailSent=1';
          break;
        case 'verifyEmailProof':
          await accountBridge({
            action,
            central,
            token: form.get('token') ?? '',
          });
          location = '/account?saved=1';
          break;
        case 'requestRecovery': {
          const r = await accountBridge<{ deliveryAvailable: boolean }>({
            action,
            email: form.get('email') ?? '',
            boundary,
          });
          location =
            '/account/recover?requested=1' +
            (r.deliveryAvailable ? '' : '&delivery=unavailable');
          break;
        }
        case 'requestRecoveryPhone': {
          const token = context.cookies.get('account-recovery')?.value ?? '';
          const result = await accountBridge<{ challenge: string }>({
            action,
            token,
            boundary,
          });
          context.cookies.set('recovery-phone-challenge', result.challenge, {
            httpOnly: true,
            secure: context.url.protocol === 'https:',
            sameSite: 'strict',
            path: '/',
            maxAge: 300,
          });
          location = '/account/reset?sent=1';
          break;
        }
        case 'verifyRecoveryPhone':
          await accountBridge({
            action,
            token: context.cookies.get('account-recovery')?.value ?? '',
            challenge:
              context.cookies.get('recovery-phone-challenge')?.value ?? '',
            code: form.get('code') ?? '',
            boundary,
          });
          context.cookies.delete('recovery-phone-challenge', { path: '/' });
          location = '/account/reset';
          break;
        case 'resetPassword':
          await accountBridge({
            action,
            token: context.cookies.get('account-recovery')?.value ?? '',
            password: form.get('password') ?? '',
            boundary,
          });
          context.cookies.delete('platform-unified-account', { path: '/' });
          context.cookies.delete('account-recovery', { path: '/' });
          location = '/account/login?security=1';
          break;
        case 'updateProfile':
          await accountBridge({
            action,
            central,
            firstName: form.get('firstName') ?? '',
            lastName: form.get('lastName') ?? '',
            phoneNumber: '',
            ...(form.has('timezone') ? { timezone: form.get('timezone') } : {}),
          });
          location = '/account/settings?saved=1';
          break;
        case 'saveOnboarding': {
          const role = form.get('role');
          const result = await accountBridge<{ state: string }>({
            action,
            central,
            role,
            revision: Number(form.get('revision')),
            submit: form.get('submit') === 'true',
            draft: Object.fromEntries(
              ['name', 'contactName', 'email', 'phone', 'timezone'].map((k) => [
                k,
                form.get(k) ?? '',
              ]),
            ),
          });
          location =
            result.state === 'COMPLETED' &&
            role === 'VENDOR' &&
            context.cookies.has('vendor-application-continuation')
              ? '/account/vendor-applications'
              : result.state === 'COMPLETED'
                ? '/account?onboarded=' +
                  (role === 'VENDOR' ? 'vendor' : 'market')
                : '/account/onboarding/' +
                  (role === 'VENDOR' ? 'vendor' : 'market') +
                  '?saved=1';
          break;
        }
        case 'rolePreference':
          await accountBridge({
            action,
            central,
            role: form.get('role'),
            updates: form.get('updates') === 'true',
          });
          location = '/account/settings?saved=1';
          break;
        case 'withdrawPromotions':
          await accountBridge({ action, central });
          location = '/account/settings?saved=1';
          break;
        case 'changePassword':
          await accountBridge({
            action,
            central,
            currentPassword: form.get('currentPassword') ?? '',
            password: form.get('password') ?? '',
            boundary,
          });
          context.cookies.delete('platform-unified-account', { path: '/' });
          location = '/account/login?security=1';
          break;
        case 'unifiedLogin': {
          const retry = new URLSearchParams({ error: '1' });
          for (const key of [
            'origin',
            'correlation',
            'destination',
            'principal',
            'returnTo',
          ]) {
            const value = form.get(key);
            if (value) retry.set(key, value);
          }
          loginRetry = '/account/login?' + retry.toString();
          const result = await accountBridge<{
            central: string;
            phoneVerificationRequired: boolean;
          }>({
            action: 'unifiedLogin',
            email: form.get('email') ?? '',
            password: form.get('password') ?? '',
            boundary: createHash('sha256')
              .update(context.clientAddress)
              .digest('hex'),
          });
          if (form.get('principal')) {
            const account = await accountBridge<
              import('../../lib/account').CentralAccountData
            >({ action: 'centralProfile', central: result.central });
            if (account.contexts.principalId !== form.get('principal'))
              throw new Error('Account identity does not match');
          }
          if (result.phoneVerificationRequired) {
            setUnifiedCentral(context, result.central);
            context.cookies.set(
              'account-login-return',
              new URLSearchParams({
                origin: form.get('origin') ?? '',
                correlation: form.get('correlation') ?? '',
                destination: form.get('destination') ?? '/',
                principal: form.get('principal') ?? '',
                returnTo: form.get('returnTo') ?? '',
              }).toString(),
              {
                httpOnly: true,
                secure: context.url.protocol === 'https:',
                sameSite: 'lax',
                path: '/',
                maxAge: 1800,
              },
            );
            location = '/account/phone';
            break;
          }
          if (!form.get('origin')) {
            setUnifiedCentral(context, result.central);
            location = context.cookies.has('vendor-application-continuation')
              ? '/account/vendor-applications'
              : context.cookies.has('account-signup-role')
                ? '/account/onboarding/' +
                  context.cookies.get('account-signup-role')!.value
                : form.get('returnTo')
                  ? safeAccountReturn(form.get('returnTo'))
                  : await defaultAccountDestination(result.central);
            context.cookies.delete('account-signup-role', { path: '/' });
            break;
          }
          if (context.cookies.has('account-signup-role')) {
            setUnifiedCentral(context, result.central);
            location =
              '/account/onboarding/' +
              context.cookies.get('account-signup-role')!.value;
            context.cookies.delete('account-signup-role', { path: '/' });
            break;
          }
          const r = await authorizeUnifiedAccount(
            result.central,
            form.get('origin') ?? '',
            form.get('correlation') ?? '',
            form.get('destination') ?? '/',
            form.get('principal') ?? '',
          );
          setUnifiedCentral(context, r.central);
          return accountNavigation(r.callback, headers);
        }
        case 'claim': {
          const r = await accountBridge<{
            central: string;
            callback: string;
            phoneVerificationRequired?: boolean;
          }>({
            action: 'claim',
            token: form.get('token') ?? '',
          });
          if (r.phoneVerificationRequired)
            setUnifiedCentral(context, r.central);
          else if (r.central) setUnifiedCentral(context, r.central);
          return accountNavigation(r.callback, headers);
        }
        case 'logout': {
          const unified = context.cookies.get(
            'platform-unified-account',
          )?.value;
          if (unified)
            await accountBridge({
              action: 'unifiedLogout',
              central: unified,
              everywhere: true,
            });
          context.cookies.delete('platform-unified-account', { path: '/' });
          context.cookies.delete('platform-account', { path: '/' });
          location = '/auth/signed-out';
          break;
        }
        default:
          throw new Error('Denied');
      }
    } else {
      if (action !== 'logout' || !context.locals.storefront)
        throw new Error('Denied');
      await requestCheckout(context, headers).logout(true);
      // Explicit top-level central logout also ends the remembered central session.
      location = new URL('/auth/signed-out', accountOrigin()).toString();
    }
    if (
      context.request.headers.get('x-account-form') === 'json' &&
      enhancedActions.has(formAction)
    ) {
      headers.set('Content-Type', 'application/json');
      return new Response(JSON.stringify({ location }), {
        status: 200,
        headers,
      });
    }
    headers.set('Location', location);
    return new Response(null, { status: 303, headers });
  } catch (caught) {
    if (loginRetry) {
      headers.set('Location', loginRetry);
      return new Response(null, { status: 303, headers });
    }
    if (
      context.request.headers.get('x-account-form') === 'json' &&
      enhancedActions.has(formAction)
    ) {
      const error =
        caught instanceof AccountBridgeError
          ? caught.message
          : formAction === 'saveOnboarding'
            ? 'Check the business name, contact name, email and timezone. If this draft changed elsewhere, reload its latest version. Your entries are still here.'
            : ['register', 'requestPersonalPhone'].includes(formAction)
              ? 'Check your phone number, country and any required credentials. SMS delivery may be unavailable. Your entries are still here.'
              : formAction === 'updateProfile'
                ? 'Enter a first and last name of up to 100 characters. Your entries are still here.'
                : formAction === 'changePassword'
                  ? 'Check your current password and use a new password between 12 and 72 characters with an uppercase letter, a number and a special character. Your entries are still here.'
                  : 'The request could not be completed. Your entries are still here. Please try again.';
      headers.set('Content-Type', 'application/json');
      return new Response(
        JSON.stringify({
          error,
          ...(caught instanceof AccountBridgeError && caught.retryAt
            ? { retryAt: caught.retryAt, serverTime: caught.serverTime }
            : {}),
        }),
        {
          status: caught instanceof AccountBridgeError ? caught.status : 400,
          headers,
        },
      );
    }
    if (
      ['requestRecoveryPhone', 'verifyRecoveryPhone', 'resetPassword'].includes(
        formAction,
      )
    ) {
      headers.set('Location', '/account/reset?error=1');
      return new Response(null, { status: 303, headers });
    }
    if (verificationRetry) {
      headers.set(
        'Location',
        verificationRetry +
          (caught instanceof AccountBridgeError && caught.status >= 500
            ? '&unavailable=1'
            : ''),
      );
      return new Response(null, { status: 303, headers });
    }
    return new Response(
      '<!doctype html><html lang="en"><head><meta name="robots" content="noindex,nofollow"><title>Account request unavailable</title></head><body><main><h1>Account request unavailable</h1><p>Check your details and try again. Verification links expire and can be used once. Reload onboarding to get its current state.</p><p><a href="/account/signup">Request a new SMS code</a> · <a href="/account/login">Sign in</a> · <a href="/account/recover">Account recovery</a> · <a href="/account">Your account</a></p></main></body></html>',
      {
        status: 400,
        headers: {
          ...Object.fromEntries(headers),
          'Content-Type': 'text/html; charset=utf-8',
        },
      },
    );
  }
};
