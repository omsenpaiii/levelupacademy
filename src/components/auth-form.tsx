"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth/client";
export function AuthForm({
  mode,
  email: initialEmail = "",
}: {
  mode: string;
  email?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [show, setShow] = useState(false);
  const signup = mode === "sign-up";
  const signin = mode === "sign-in";
  const verify = mode === "verify";
  const reset = mode === "reset-password";
  const title = signup
    ? "Your next chapter begins."
    : signin
      ? "Good to see you again."
      : verify
        ? "Let’s verify your email."
        : reset
          ? "A fresh start."
          : "Forgot your password?";
  return (
    <div className="auth-page">
      <section className="auth-visual">
        <Link href="/students" className="brand">
          <img src="/images/logo.svg" alt="Level Up Academy" />
        </Link>
        <h1>
          A little ambition.
          <br />A world of
          <br />
          possibility.
        </h1>
        <p>
          Your next chapter starts with you. We’re here for every step that
          follows.
        </p>
        <div className="auth-photo">
          <img src="/images/students.jpg" alt="Students at Level Up Academy" />
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-form">
          <Link href="/students" className="auth-mobile-logo">
            <img src="/images/logo.svg" alt="Level Up Academy" />
          </Link>
          <h2>{title}</h2>
          <p>
            {signup
              ? "Create your student account and take the first step."
              : signin
                ? "Sign in to pick up where you left off."
                : verify
                  ? "Enter the code sent to your email. You can request a new code below."
                  : reset
                    ? "Choose a new password for your student account."
                    : "We’ll send you a link to get back into your account."}
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              setMessage("");
              try {
                let result;
                const email = String(f.get("email") || "");
                const password = String(f.get("password") || "");
                if (signup) {
                  result = await authClient.signUp.email({
                    email,
                    password,
                    name: String(f.get("name")),
                  });
                } else if (signin) {
                  result = await authClient.signIn.email({ email, password });
                } else if (verify) {
                  result = await authClient.emailOtp.verifyEmail({
                    email,
                    otp: String(f.get("otp")),
                  });
                } else if (reset) {
                  const token = new URLSearchParams(window.location.search).get(
                    "token",
                  );
                  if (!token)
                    throw Error(
                      "This reset link is missing or expired. Request a new link.",
                    );
                  result = await authClient.resetPassword({
                    newPassword: password,
                    token,
                  });
                } else {
                  result = await authClient.requestPasswordReset({
                    email,
                    redirectTo: window.location.origin + "/auth/reset-password",
                  });
                }
                if (result.error)
                  throw Error(
                    result.error.message ||
                      "Please check your details and try again.",
                  );
                setError(false);
                if (signin || signup || verify) {
                  window.location.href = signup
                    ? `/auth/verify?email=${encodeURIComponent(email)}`
                    : "/auth/continue";
                } else
                  setMessage(
                    reset
                      ? "Your password has been updated. You can sign in now."
                      : "If an account exists for this email, a reset link is on its way.",
                  );
              } catch (e) {
                setError(true);
                setMessage(
                  e instanceof Error ? e.message : "Please try again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {signup && (
              <label className="field">
                <span>Full name</span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                  minLength={2}
                />
              </label>
            )}
            {!reset && (
              <label className="field">
                <span>Email address</span>
                <input
                  name="email"
                  defaultValue={initialEmail}
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
            )}
            {(signin || signup || reset) && (
              <label className="field">
                <span>Password</span>
                <div style={{ position: "relative" }}>
                  <input
                    style={{ paddingRight: 44 }}
                    name="password"
                    required
                    type={show ? "text" : "password"}
                    autoComplete={signin ? "current-password" : "new-password"}
                    minLength={signup || reset ? 12 : 1}
                    placeholder={
                      signup || reset
                        ? "At least 12 characters"
                        : "Enter your password"
                    }
                  />
                  <button
                    className="icon-button"
                    type="button"
                    style={{ position: "absolute", right: 5, top: 4 }}
                    aria-label={show ? "Hide password" : "Show password"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            )}
            {verify && (
              <>
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={async (e) => {
                    const form = e.currentTarget.form;
                    const email = String(
                      new FormData(form!).get("email") || "",
                    );
                    if (!email) {
                      setError(true);
                      setMessage("Enter your email address first.");
                      return;
                    }
                    setBusy(true);
                    const r = await authClient.emailOtp.sendVerificationOtp({
                      email,
                      type: "email-verification",
                    });
                    setError(!!r.error);
                    setMessage(
                      r.error?.message ||
                        "Check your inbox for the verification code.",
                    );
                    setBusy(false);
                  }}
                >
                  Send verification code
                </button>
                <label className="field">
                  <span>Verification code</span>
                  <input
                    name="otp"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter the code from your email"
                  />
                </label>
              </>
            )}
            {message && (
              <div
                role="status"
                className={`notice ${error ? "error" : "success"}`}
              >
                {message}
                {signin && error && /verif/i.test(message) && (
                  <Link className="text-link spaced" href="/auth/verify">
                    Verify your email address
                  </Link>
                )}
              </div>
            )}
            <button className="button" disabled={busy}>
              {busy
                ? "One moment…"
                : signup
                  ? "Create student account"
                  : signin
                    ? "Sign in"
                    : verify
                      ? "Verify email"
                      : reset
                        ? "Save new password"
                        : "Send reset link"}
              <ArrowRight size={15} />
            </button>
          </form>
          {signin && (
            <div className="auth-links">
              <span>Secure student access</span>
              <Link href="/auth/forgot-password">Forgot password?</Link>
            </div>
          )}
          {signin || signup ? (
            <div className="auth-switch">
              {signup ? "Already have an account?" : "New to Level Up?"}{" "}
              <Link href={signup ? "/auth/sign-in" : "/auth/sign-up"}>
                {signup ? "Sign in" : "Create an account"}
              </Link>
            </div>
          ) : (
            <div className="auth-switch">
              <Link href="/auth/sign-in">Back to sign in</Link>
            </div>
          )}
          <div className="auth-divider">Your future starts here</div>
          <Link
            href="/students/catalogue"
            className="text-link"
            style={{ justifyContent: "center", width: "100%" }}
          >
            Explore our courses <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
