export function ShopSignIn({
  storefrontId: _storefrontId,
}: {
  storefrontId: string;
}) {
  return (
    <p>
      You can buy without an account.{' '}
      <a href="/account/sign-in">Access your orders</a>
    </p>
  );
}
