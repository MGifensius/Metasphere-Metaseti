'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { requestOtp, verifyOtp, isConnected } from '@/lib/sheets';

const USERS = {
  'Metaseti01': { role: 'admin', label: 'Director' },
  'Metaseti02': { role: 'maker', label: 'Finance' },
};
const OFFLINE_PW = { 'Metaseti01': 'MetasetiAdmin$123', 'Metaseti02': 'MetasetiMaker$123' };

export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState('credentials');
  const [f, sF] = useState({ u: '', p: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [err, sE] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [mounted, setMounted] = useState(false);
  const otpRefs = useRef([]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && sessionStorage.getItem('ms_auth') === '1') router.push('/dashboard');
  }, [router]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const showErr = (msg) => { sE(msg); setTimeout(() => sE(''), 3500); };

  const handleCredentials = async (e) => {
    e.preventDefault();
    if (!f.u || !f.p) return showErr('Please enter username and password');
    const user = USERS[f.u];
    if (!user) return showErr('Invalid username');

    setLoading(true);
    const safetyTimeout = setTimeout(() => { setLoading(false); showErr('Request timed out. Check your Apps Script deployment.'); }, 35000);
    try {
      if (isConnected()) {
        console.log('[Metasphere] Requesting OTP for', f.u);
        const res = await requestOtp(f.u, f.p);
        console.log('[Metasphere] OTP response:', JSON.stringify(res));
        if (res?.success) {
          setStep('otp');
          setCountdown(60);
          setOtp(['', '', '', '', '', '']);
          setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } else {
          showErr(res?.error || 'Failed to send OTP. Make sure Apps Script is redeployed.');
        }
      } else {
        if (OFFLINE_PW[f.u] === f.p) {
          sessionStorage.setItem('ms_auth', '1');
          sessionStorage.setItem('ms_role', user.role);
          sessionStorage.setItem('ms_user', f.u);
          sessionStorage.setItem('ms_label', user.label);
          router.push('/dashboard');
        } else {
          showErr('Invalid credentials');
        }
      }
    } catch (err) {
      console.error('[Metasphere] Login error:', err);
      showErr(err.message || 'Connection error. Try again.');
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    if (val.length > 1) val = val.slice(-1);
    if (val && !/^\d$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === 'Enter') { const code = otp.join(''); if (code.length === 6) submitOtp(code); }
  };

  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      otpRefs.current[5]?.focus();
      e.preventDefault();
    }
  };

  const submittingRef = useRef(false);
  const submitOtp = async (code) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    sE('');
    try {
      console.log('[Metasphere] Verifying OTP:', code);
      const res = await verifyOtp(f.u, code);
      console.log('[Metasphere] Verify response:', JSON.stringify(res));
      if (res?.success) {
        const user = USERS[f.u];
        sessionStorage.setItem('ms_auth', '1');
        sessionStorage.setItem('ms_role', user.role);
        sessionStorage.setItem('ms_user', f.u);
        sessionStorage.setItem('ms_label', user.label);
        router.push('/dashboard');
        return;
      } else {
        showErr(res?.error || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } catch (err) { showErr('Verification failed'); }
    setLoading(false);
    submittingRef.current = false;
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const res = await requestOtp(f.u, f.p);
      if (res?.success) { setCountdown(60); setOtp(['', '', '', '', '', '']); otpRefs.current[0]?.focus(); }
    } catch (e) { showErr('Failed to resend'); }
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#0f1117', overflow: 'hidden' }}>
      {/* Left Hero */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <img src="/login-bg.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,17,23,.3) 0%, rgba(15,17,23,.7) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 48, left: 48, right: 48, zIndex: 2 }}>
          <p style={{ fontSize: 13, color: 'rgba(240,241,245,.3)', letterSpacing: 4, textTransform: 'uppercase', fontWeight: 600 }}>Clarity within the complexity.</p>
        </div>
      </div>

      {/* Right Form */}
      <div style={{ width: 480, minWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 50px', background: '#0f1117', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .02, backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <div style={{ width: '100%', maxWidth: 320, position: 'relative', animation: 'fadeUp .5s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <img src="/logo.png" alt="Metaseti" style={{ height: 30, marginBottom: 18 }} />
            <h1 style={{ fontSize: 19, fontWeight: 700, color: '#f0f1f5', margin: 0, letterSpacing: '-0.3px' }}>Welcome to Metasphere</h1>
            <p style={{ fontSize: 11, color: '#5a5e72', marginTop: 5, letterSpacing: .5 }}>by Metaseti Digital</p>
          </div>

          {step === 'credentials' && <div style={{ animation: 'fadeUp .3s ease' }}>
            <label style={lbl}>Username</label>
            <input value={f.u} onChange={e => sF(p => ({ ...p, u: e.target.value }))} placeholder="Enter username" autoFocus style={inp} onFocus={e => e.target.style.borderColor = '#383c4d'} onBlur={e => e.target.style.borderColor = '#2a2d3a'} onKeyDown={e => e.key === 'Enter' && document.getElementById('pw')?.focus()} />
            <label style={{ ...lbl, marginTop: 18 }}>Password</label>
            <input id="pw" type="password" value={f.p} onChange={e => sF(p => ({ ...p, p: e.target.value }))} placeholder="Enter password" style={inp} onFocus={e => e.target.style.borderColor = '#383c4d'} onBlur={e => e.target.style.borderColor = '#2a2d3a'} onKeyDown={e => e.key === 'Enter' && handleCredentials(e)} />
            {err && <div style={errBox}>{err}</div>}
            <button onClick={handleCredentials} disabled={loading} style={{ ...btnP, marginTop: 24, opacity: loading ? .6 : 1 }} onMouseOver={e => { if (!loading) e.target.style.background = '#e0e1e5'; }} onMouseOut={e => e.target.style.background = '#f0f1f5'}>{loading ? 'Verifying...' : 'Login'}</button>
            {!isConnected() && <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 6, background: 'rgba(245,166,35,.06)', border: '1px solid rgba(245,166,35,.15)', fontSize: 10, color: '#f5a623', textAlign: 'center' }}>Offline mode — OTP disabled, direct login.</div>}
          </div>}

          {step === 'otp' && <div style={{ animation: 'fadeUp .3s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#161821', border: '1px solid #2a2d3a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#f0f1f5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/></svg>
              </div>
              <p style={{ fontSize: 12, color: '#8a8ea0', lineHeight: 1.7 }}>Verification code sent to<br/><strong style={{ color: '#f0f1f5' }}>metasetidigital@gmail.com</strong><br/><span style={{ fontSize: 10, color: '#5a5e72' }}>May take up to 30 seconds to arrive</span></p>
            </div>
            <label style={{ ...lbl, textAlign: 'center' }}>Enter OTP Code</label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }} onPaste={handleOtpPaste}>
              {otp.map((d, i) => <input key={i} ref={el => otpRefs.current[i] = el} value={d} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKey(i, e)} maxLength={1} style={{ width: 42, height: 50, textAlign: 'center', fontSize: 20, fontWeight: 700, borderRadius: 8, border: '1px solid ' + (d ? '#383c4d' : '#2a2d3a'), background: d ? '#1c1e2a' : '#161821', color: '#f0f1f5', outline: 'none', fontFamily: "'IBM Plex Mono', monospace", transition: 'border-color .15s' }} onFocus={e => e.target.style.borderColor = '#4a4f63'} onBlur={e => e.target.style.borderColor = d ? '#383c4d' : '#2a2d3a'} autoFocus={i === 0} />)}
            </div>
            {err && <div style={errBox}>{err}</div>}
            <button onClick={() => { const c = otp.join(''); if (c.length === 6) submitOtp(c); }} disabled={loading || otp.some(d => !d)} style={{ ...btnP, opacity: (loading || otp.some(d => !d)) ? .5 : 1 }} onMouseOver={e => e.target.style.background = '#e0e1e5'} onMouseOut={e => e.target.style.background = '#f0f1f5'}>{loading ? 'Verifying...' : 'Verify'}</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button onClick={() => { setStep('credentials'); sE(''); }} style={{ background: 'none', border: 'none', color: '#5a5e72', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }} onMouseOver={e => e.target.style.color = '#8a8ea0'} onMouseOut={e => e.target.style.color = '#5a5e72'}>← Back</button>
              <button onClick={resendOtp} disabled={countdown > 0} style={{ background: 'none', border: 'none', color: countdown > 0 ? '#3a3e50' : '#8a8ea0', fontSize: 11, cursor: countdown > 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}</button>
            </div>
          </div>}

          <p style={{ textAlign: 'center', color: '#2a2d3a', fontSize: 9, marginTop: 36, letterSpacing: 1, textTransform: 'uppercase' }}>© 2026 PT Metaseti Digital Indonesia</p>
        </div>
      </div>
    </div>
  );
}

const lbl = { display: 'block', fontSize: 10, fontWeight: 600, color: '#8a8ea0', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 1.5 };
const inp = { width: '100%', padding: '13px 16px', borderRadius: 8, border: '1px solid #2a2d3a', background: '#161821', color: '#f0f1f5', fontSize: 14, outline: 'none', transition: 'border .15s', fontFamily: 'inherit' };
const btnP = { width: '100%', padding: 14, borderRadius: 8, border: 'none', background: '#f0f1f5', color: '#0f1117', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit' };
const errBox = { marginTop: 14, padding: '10px 14px', borderRadius: 8, fontSize: 12, background: 'rgba(255,71,71,.08)', border: '1px solid rgba(255,71,71,.18)', color: '#ff6b6b', textAlign: 'center', animation: 'fadeUp .2s ease' };
