// Vendure's default bcrypt strategy consumes at most 72 bytes. ASCII only keeps
// the length bound identical in browsers and on the server, without truncation.
export const passwordMaximum = 72;
export const passwordSymbols = `!"#$%&'()*+,-./:;<=>?@[\\]^_\x60{|}~`;
export function passwordChecks(password: string) {
  return {
    length: password.length >= 12 && password.length <= passwordMaximum,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: [...password].some((c) => passwordSymbols.includes(c)),
    supported: /^[\x21-\x7e]+$/.test(password),
  };
}
export function validPassword(password: string) {
  return Object.values(passwordChecks(password)).every(Boolean);
}
