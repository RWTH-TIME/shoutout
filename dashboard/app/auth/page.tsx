import config from "../lib/config";
import SignInClient from "./SignInClient";

export default function SignInPage() {
  return <SignInClient providerName={config.OIDC_DISPLAYNAME} />;
}
