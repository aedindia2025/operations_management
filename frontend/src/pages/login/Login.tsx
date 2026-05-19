import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function generateCaptcha() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function Login() {
  const [form, setForm]         = useState({ companyCode: "", username: "", password: "", captcha: "" });
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [capCode, setCapCode]   = useState(generateCaptcha);
  const [capError, setCapError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const refresh = () => {
    setCapCode(generateCaptcha());
    setForm(f => ({ ...f, captcha: "" }));
    setCapError("");
  };

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError(""); setCapError("");
    if (form.captcha.trim() !== capCode) {
      setCapError("Incorrect captcha — try again.");
      refresh();
      return;
    }
    setLoading(true);
    const res = await login(form.companyCode, form.username, form.password);
    setLoading(false);
    if (res.success) navigate("/");
    else { setError(res.message); refresh(); }
  };

  return (
    <div className="flex min-h-screen font-body">

      {/* ══════════ LEFT PANEL ══════════ */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col bg-brand-800 relative overflow-hidden">

        {/* Background image — place any OTM-relevant photo at /assets/images/login-bg.jpg */}
        <img
          src="/assets/images/login-bg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />

        {/* dark overlay so text stays readable over image */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/80 via-brand-900/60 to-brand-900/90" />

        {/* LOGO */}
        <div className="relative z-10 p-8">
          <img
            src="/assets/images/ascent-otm-login.svg"
            alt="Ascent OTM"
            className="h-15 object-contain"
            onError={e => {
              e.target.style.display = "none";
              document.getElementById("logo-fb").style.display = "flex";
            }}
          />
        
        </div>

        {/* Centre text */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10">
          <img
            src="/assets/images/login-img.png"
            alt="Ascent OTM"
            className="h-15 object-contain pb-10"
            onError={e => {
              e.target.style.display = "none";
              document.getElementById("logo-fb").style.display = "flex";
            }}
          />
          <h2 className="font-head font-bold text-white text-3xl leading-snug mb-4">
            Operation Team<br/>Management
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Streamline billing, purchase orders<br/>and field operations — all in one place.
          </p>
        </div>

        {/* Dot indicators */}
        <div className="relative z-10 px-10 pb-10 flex gap-1.5">
          <div className="w-6 h-1.5 rounded-full bg-brand-400" />
          <div className="w-2 h-1.5 rounded-full bg-white/20" />
          <div className="w-2 h-1.5 rounded-full bg-white/20" />
        </div>
      </div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <div className="flex-1 bg-white flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-[420px]">

          <p className="text-sm text-ink-muted mb-1">Already have an account?</p>
          <h1 className="font-head font-bold text-[26px] text-ink mb-7">Sign in here</h1>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-danger-light border border-red-200 rounded-lg text-[13px] text-danger flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Company Code */}
            <div>
              <span className="block text-[12.5px] font-semibold text-ink-secondary mb-1.5">
                Company Code
                {/* <span className="ml-1 font-normal text-ink-muted">(company users only)</span> */}
              </span>
              <input name="companyCode"
                type="text"
                value={form.companyCode}
                onChange={set("companyCode")}
                autoFocus
                className="w-full px-3.5 py-2.5 text-[13.5px] border border-line-dark rounded-lg
                  outline-none placeholder-ink-muted text-ink bg-white uppercase
                  focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
                  transition-colors"
              />
            </div>

            {/* Username */}
            <div>
              <span className="block text-[12.5px] font-semibold text-ink-secondary mb-1.5">
                User Name
              </span>
              <input name="username"
                type="text"
                value={form.username}
                onChange={set("username")}
                required
                placeholder="Enter your username"
                className="w-full px-3.5 py-2.5 text-[13.5px] border border-line-dark rounded-lg
                  outline-none placeholder-ink-muted text-ink bg-white
                  focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
                  transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <span className="block text-[12.5px] font-semibold text-ink-secondary mb-1.5">
                Password
              </span>
              <div className="relative">
              <input name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-11 text-[13.5px] border border-line-dark rounded-lg
                  outline-none placeholder-ink-muted text-ink bg-white
                  focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
                  transition-colors"
              />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-muted transition-colors hover:text-brand-600 focus:outline-none focus:text-brand-600"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`fa ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
            </div>

            {/* Captcha */}
            <div>
              <span className="block text-[12.5px] font-semibold text-ink-secondary mb-1.5">
                Captcha Verification
              </span>

              {/* display + refresh */}
              <div className="flex gap-2 mb-2">
                <div className="flex-1 py-3 bg-brand-50 border border-brand-200 rounded-lg
                  text-center text-2xl font-extrabold tracking-[14px] text-brand-700
                  font-mono select-none">
                  {capCode}
                </div>
                <button
                  type="button"
                  onClick={refresh}
                  title="Refresh captcha"
                  className="w-12 flex-shrink-0 border border-line-dark rounded-lg bg-white
                    text-xl text-ink-muted cursor-pointer
                    hover:border-brand-500 hover:text-brand-500
                    transition-colors flex items-center justify-center"
                >
                  ↻
                </button>
              </div>

              {/* input */}
              <input name="captcha"
                type="text"
                value={form.captcha}
                onChange={set("captcha")}
                required
                maxLength={4}
                placeholder="Enter the 4 digits"
                className={`w-full px-3.5 py-2.5 text-base rounded-lg outline-none
                  text-center tracking-[10px] font-bold font-mono text-ink bg-white
                  transition-colors
                  ${capError
                    ? "border border-red-400 focus:ring-2 focus:ring-red-200"
                    : "border border-line-dark focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  }`}
              />
              {capError && (
                <p className="mt-1.5 text-[12px] text-danger flex items-center gap-1">
                  <span>⚠</span> {capError}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 active:bg-brand-700
                text-white font-bold text-[15px] tracking-wide rounded-lg
                transition-colors flex items-center justify-center gap-2
                disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-0"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : "LogIn"}
            </button>

          </form>

          {/* Can't access */}
          <div className="mt-5">
            <a href="#" className="text-brand-500 text-[13px] hover:underline">
              Can't access your account?
            </a>
          </div>

          {/* Footer */}
          <div className="mt-9 pt-5 border-t border-line text-[12.5px] text-ink-muted">
            <a href="#" className="text-brand-500 hover:underline">User Contract</a>
            <span className="mx-2">|</span>
            <a href="#" className="text-brand-500 hover:underline">Privacy Policy</a>
            <p className="mt-1 text-[12px]">© 2026 Ascent IT, Inc. All rights reserved.</p>
          </div>

        </div>
      </div>

    </div>
  );
}
