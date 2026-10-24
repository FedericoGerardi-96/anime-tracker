// OAuth return destinations are intentionally limited to these two local pages.
export function oauthReturnPath(value: string | null | undefined): "/favorites" | "/profile" {
  return value === "/favorites" ? "/favorites" : "/profile";
}
