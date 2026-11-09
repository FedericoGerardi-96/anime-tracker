export const CONNECTED_ACCOUNTS_PATH = "/settings/connections";

// Keep the library return and send every other request to the accounts page.
export function oauthReturnPath(value: string | null | undefined) {
  return value === "/favorites" ? "/favorites" : CONNECTED_ACCOUNTS_PATH;
}
