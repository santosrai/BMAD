import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Google } from "@convex-dev/auth/providers/Google";
import fs from "fs";
import path from "path";

// Ensure Convex Auth has a JWT private key available. In some environments
// the key path is provided instead of the key contents which causes
// `importPKCS8` to throw "pkcs8 must be PKCS#8 formatted string". To make the
// project work out of the box we load `private_key_pkcs8.pem` if the environment
// variable is missing or appears to reference a file path.
const maybeKey = process.env.JWT_PRIVATE_KEY;
if (!maybeKey || !maybeKey.includes("BEGIN")) {
  const potentialPath = maybeKey && !maybeKey.includes("BEGIN")
    ? path.resolve(__dirname, "..", maybeKey)
    : path.resolve(__dirname, "../private_key_pkcs8.pem");
  try {
    process.env.JWT_PRIVATE_KEY = fs.readFileSync(potentialPath, "utf8");
  } catch (err) {
    console.warn(
      `JWT_PRIVATE_KEY not set or invalid and could not read ${potentialPath}: ${err}`,
    );
  }
}

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      id: "password",
      profile: (params) => ({
        email: String(params.email).toLowerCase(),
        name: String(params.name ?? ""),
      }),
    }),
    Google({
      id: "google",
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
});