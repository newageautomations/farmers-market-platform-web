import type { CompanionApi } from '../../core/controller';
import type { NativeSessionProof } from '../../../packages/api/src/native-mobile';
import {
  RequestTimeoutError,
  withRequestTimeout,
} from '../../../packages/api/src/request-timeout';
declare const __DEV__: boolean;

export interface Workspace {
  id: string;
  code: string;
  token: string;
  permissions: string[];
}
export interface NativeRequestOptions {
  signal?: AbortSignal;
}
export class NativePlatformClient implements CompanionApi {
  token = '';
  channel = '';
  constructor(
    readonly endpoint: string,
    private readonly request: typeof fetch = fetch,
  ) {
    const u = new URL(endpoint);
    if (
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      (u.protocol !== 'https:' &&
        !(
          typeof __DEV__ !== 'undefined' &&
          __DEV__ &&
          u.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '10.0.2.2'].includes(u.hostname)
        ))
    )
      throw new Error(
        'Use HTTPS or the Android emulator loopback development endpoint',
      );
  }
  async execute<T>(
    query: string,
    variables: Record<string, unknown> = {},
    options: NativeRequestOptions = {},
  ) {
    const { body, token } = await withRequestTimeout(
      20000,
      async (signal) => {
        const response = await this.request(this.endpoint, {
          method: 'POST',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json',
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            ...(this.channel ? { 'vendure-token': this.channel } : {}),
          },
          body: JSON.stringify({ query, variables }),
          signal,
        });
        const body = await response.json();
        if (!response.ok || body.errors)
          throw new Error(
            'Platform request could not be completed. Keep the original payment and recover its status',
          );
        return { body, token: response.headers.get('vendure-auth-token') };
      },
      options.signal,
    ).catch((error: unknown) => {
      if (error instanceof RequestTimeoutError)
        throw new RequestTimeoutError(
          'Platform request timed out after 20 seconds. Keep the original payment and recover its status before collecting money again',
        );
      throw error;
    });
    // A late response after timeout/cancellation must never update authentication.
    if (token) this.token = token;
    return body.data as T;
  }
  async login(
    username: string,
    password: string,
    options: NativeRequestOptions = {},
  ) {
    const data = await this.execute<{
      login: { __typename: string; channels?: Workspace[] };
    }>(
      'mutation($username:String!,$password:String!){login(username:$username,password:$password,rememberMe:false){__typename ... on CurrentUser{channels{id code token permissions}}}}',
      { username, password },
      options,
    );
    if (data.login.__typename !== 'CurrentUser' || !this.token)
      throw new Error('Platform login was not authorized');
    return (data.login.channels ?? []).filter((c) =>
      c.permissions.includes('OperateOwnPos'),
    );
  }
  async register(
    installationId: string,
    secret: string,
    options: NativeRequestOptions = {},
  ) {
    const data = await this.execute<{
      ownPosNativeAction: { sessionId: string; expiresAt: string };
    }>(
      'mutation($input:JSON!){ownPosNativeAction(input:$input)}',
      {
        input: { action: 'register', installationId, secret },
      },
      options,
    );
    return data.ownPosNativeAction;
  }
  async logout(options: NativeRequestOptions = {}) {
    try {
      await this.execute('mutation { logout { success } }', {}, options);
    } finally {
      this.token = '';
      this.channel = '';
    }
  }
  async action<T>(
    action: string,
    proof: NativeSessionProof,
    handoffId?: string,
    options: NativeRequestOptions = {},
  ): Promise<T> {
    const data = await this.execute<{ ownPosNativeAction: T }>(
      'mutation($input:JSON!){ownPosNativeAction(input:$input)}',
      { input: { action, proof, ...(handoffId ? { handoffId } : {}) } },
      options,
    );
    return data.ownPosNativeAction;
  }
}
