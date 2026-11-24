import { missingConfig, allowedDomain } from "@/lib/setup";
import { getSetting } from "@/lib/secure";
import { setupStudio, login } from "./actions";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  email: "Use your Together Wellness email address.",
  weak: "The studio passcode needs at least 8 characters, your owner password at least 10, and they must be different.",
  passcode: "That studio passcode isn't right.",
  owner: "This is an owner account, so it needs your personal owner password, not the studio passcode.",
  name: "First time here? Add your full name too.",
  locked: "Too many tries. Wait 15 minutes and try again.",
  inactive: "Your access has been switched off. Talk to Caitlin if that's unexpected.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string; email?: string }> }) {
  const { error, email } = await searchParams;
  const missing = missingConfig();
  const ready = missing.length === 0 && Boolean(await getSetting("studio_passcode"));
  const domain = allowedDomain();
  const placeholder = domain ? `name@${domain}` : "name@example.com";
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <main style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 28 }}>
        <span className="mark">Together Wellness</span>
        {missing.length > 0 ? (
          <>
            <h1>Almost ready</h1>
            <div className="card">
              <p style={{ margin: 0 }}>The app is deployed. One thing still needs adding in Vercel:</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{missing.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </>
        ) : !ready ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p className="k">First-time setup</p>
              <h1>Set up the studio</h1>
              <p className="m">You'll be the first owner. Staff use the studio passcode. Your owner password is yours alone.</p>
            </div>
            <form action={setupStudio} className="stack">
              <label><span className="k">Your name</span><input name="name" required autoComplete="name" /></label>
              <label><span className="k">Your work email</span><input name="email" type="email" required placeholder={placeholder} autoComplete="email" /></label>
              <label><span className="k">Studio passcode for staff</span><input name="passcode" type="password" required minLength={8} autoComplete="new-password" /></label>
              <label><span className="k">Your owner password</span><input name="owner" type="password" required minLength={10} autoComplete="new-password" /></label>
              <div><button className="btn" type="submit">Set up and sign in</button></div>
            </form>
          </>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p className="k">Studio OS · staff only</p>
              <h1>Sign in</h1>
            </div>
            <form action={login} className="stack">
              <label><span className="k">Work email</span><input name="email" type="email" required placeholder={placeholder} defaultValue={email} autoComplete="email" /></label>
              <label><span className="k">Full name, first time only</span><input name="name" autoComplete="name" /></label>
              <label><span className="k">Studio passcode</span><input name="secret" type="password" required autoComplete="current-password" /><span className="m small">Owners use their own owner password here.</span></label>
              <div><button className="btn" type="submit">Sign in</button></div>
            </form>
          </>
        )}
        {error && <p className="flag" role="alert">{MESSAGES[error] || "Sign-in didn't work. Try again."}</p>}
        <p className="m small">Staff information here is confidential. Sign-ins and changes are logged.</p>
      </main>
    </div>
  );
}
