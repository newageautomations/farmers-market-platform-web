import { buttonClassName } from '@market/ui/presentation';
export function ShopSignIn({
  storefrontId: _storefrontId,
}: {
  storefrontId: string;
}) {
  return (
    <p>
      You can buy without an account.{' '}
      <a
        className={buttonClassName({
          variant: 'secondary',
          className: 'button secondary',
        })}
        href="/account/login"
      >
        Access your orders
      </a>
    </p>
  );
}
