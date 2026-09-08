import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Zap,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { PremiumPlanDuration, OrderItem, CDKItem } from '../types';

interface BuyPremiumViewProps {
  onOrderCompleted: (order: OrderItem, cdk?: CDKItem) => void;
  onNavigateToTrack: (orderId: string) => void;
}

export const BuyPremiumView: React.FC<BuyPremiumViewProps> = ({
  onOrderCompleted,
  onNavigateToTrack,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlanDuration>('3_months');
  const [username, setUsername] = useState('');
  const [userVerified, setUserVerified] = useState<{ displayName: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'crypto_ton' | 'crypto_usdt' | 'telegram_stars'>('credit_card');

  // Card form state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState('Alex Morgan');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCryptoAddress, setCopiedCryptoAddress] = useState(false);

  const plans: {
    id: PremiumPlanDuration;
    name: string;
    price: number;
    originalPrice: number;
    badge?: string;
    features: string[];
  }[] = [
    {
      id: '1_month',
      name: '1 Month',
      price: 4.99,
      originalPrice: 5.99,
      features: ['4GB File Uploads', 'Faster Download Speed', 'Voice-to-Text Conversion'],
    },
    {
      id: '3_months',
      name: '3 Months',
      price: 12.99,
      originalPrice: 17.99,
      badge: 'Most Popular',
      features: ['All 1-Mo Features', 'Premium Star Badge', 'Custom Emoji & Reactions', 'Double Limits'],
    },
    {
      id: '6_months',
      name: '6 Months',
      price: 21.99,
      originalPrice: 32.99,
      badge: 'Best Value',
      features: ['All 3-Mo Features', 'Advanced Chat Management', 'Animated Profile Pictures'],
    },
    {
      id: '12_months',
      name: '12 Months',
      price: 36.99,
      originalPrice: 59.99,
      badge: 'VIP Deal',
      features: ['Full 1 Year Access', 'Telegram Business Tools', 'Priority Gift Dispatch', 'Max Savings'],
    },
  ];

  const currentPlanObj = plans.find((p) => p.id === selectedPlan) || plans[1];

  const handleVerifyUsername = async () => {
    if (!username.trim()) return;
    try {
      const res = await fetch('/api/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUserVerified({ displayName: data.data.displayName });
        setErrorMessage(null);
      } else {
        setUserVerified(null);
        setErrorMessage(data.error || 'Username not found');
      }
    } catch {
      // ignore
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Please enter your Telegram @username.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const cleanHandle = username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`;
      const res = await fetch('/api/orders/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          username: cleanHandle,
          paymentMethod,
          paymentDetails: {
            cardLast4: cardNumber.slice(-4),
            cardHolder: cardName,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Payment gateway declined transaction');
        setIsLoading(false);
        return;
      }

      onOrderCompleted(data.order, data.issuedCDK);
      onNavigateToTrack(data.order.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment network error');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* Title */}
      <div className="text-center mb-6 px-2">
        <h1 className="font-display text-4xl sm:text-[44px] text-slate-100 tracking-tight font-normal mb-2 leading-[1.15]">
          Buy Telegram Premium
        </h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Secure payment processing with instant Telegram Gift Subscription API delivery.
        </p>
      </div>

      {/* Plan Selector Grid */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {plans.map((p) => {
          const isSelected = selectedPlan === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`relative cursor-pointer p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#0f2830] border-teal-400 shadow-lg shadow-teal-500/20 ring-1 ring-teal-400'
                  : 'bg-[#0a1b21] border-[#163741] hover:border-[#214f5c]'
              }`}
            >
              {p.badge && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-400 text-slate-950 uppercase tracking-wider shadow">
                  {p.badge}
                </span>
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-200">{p.name}</h3>
                <div className="flex items-baseline gap-1 mt-1 mb-2">
                  <span className="text-xl sm:text-2xl font-black text-slate-100 font-mono-code">
                    ${p.price}
                  </span>
                  <span className="text-xs text-slate-500 line-through">${p.originalPrice}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[#163842] text-[11px] text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-teal-400" />
                <span>Instant Gift Link</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Checkout Box */}
      <div className="w-full bg-[#0a1b21] border border-[#163741] rounded-2xl p-5 sm:p-7 shadow-2xl">
        <form onSubmit={handleCheckout} className="space-y-6">
          {/* Target Telegram Username */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <span>Telegram Recipient</span>
              </label>
              {userVerified && (
                <span className="text-xs text-teal-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified: {userVerified.displayName}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 font-medium pointer-events-none">
                @
              </span>
              <input
                type="text"
                value={username.replace(/^@/, '')}
                onChange={(e) => {
                  setUsername(`@${e.target.value.replace(/[^a-zA-Z0-9_]/g, '')}`);
                  setUserVerified(null);
                  setErrorMessage(null);
                }}
                onBlur={handleVerifyUsername}
                placeholder="username"
                required
                className="w-full pl-9 pr-4 py-3 bg-[#07151a] border border-[#173740] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              The Telegram account that will receive the Premium Gift subscription link.
            </p>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-sm font-semibold text-slate-200 block mb-2.5">
              Select Secure Payment Gateway
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'credit_card'
                    ? 'bg-teal-950/70 border-teal-400 text-teal-300 shadow-md shadow-teal-500/15'
                    : 'bg-[#07151a] border-[#163741] text-slate-300 hover:border-slate-600'
                }`}
              >
                <CreditCard className="w-4 h-4 text-teal-400" />
                <span>Card (Visa/MC)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('crypto_ton')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'crypto_ton'
                    ? 'bg-teal-950/70 border-teal-400 text-teal-300 shadow-md shadow-teal-500/15'
                    : 'bg-[#07151a] border-[#163741] text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-[10px]">
                  💎
                </span>
                <span>TON Crypto</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('crypto_usdt')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'crypto_usdt'
                    ? 'bg-teal-950/70 border-teal-400 text-teal-300 shadow-md shadow-teal-500/15'
                    : 'bg-[#07151a] border-[#163741] text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[10px]">
                  ₮
                </span>
                <span>USDT TRC20</span>
              </button>
            </div>
          </div>

          {/* Payment Form Fields */}
          {paymentMethod === 'credit_card' && (
            <div className="p-4 rounded-xl bg-[#061418] border border-[#14343d] space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-[#122e37]">
                <span className="flex items-center gap-1 text-teal-400 font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  256-Bit SSL Encrypted Processing
                </span>
                <span className="font-mono-code text-[11px] text-slate-400">TEST CHECKOUT ENABLED</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Cardholder Name</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#091b22] border border-[#173740] rounded-lg text-slate-100 text-xs font-medium focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-[#091b22] border border-[#173740] rounded-lg text-slate-100 text-xs font-mono-code focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Expires (MM/YY)</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-3 py-2 bg-[#091b22] border border-[#173740] rounded-lg text-slate-100 text-xs font-mono-code focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">CVC / CVV</label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full px-3 py-2 bg-[#091b22] border border-[#173740] rounded-lg text-slate-100 text-xs font-mono-code focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {(paymentMethod === 'crypto_ton' || paymentMethod === 'crypto_usdt') && (
            <div className="p-4 rounded-xl bg-[#061418] border border-[#14343d] space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-[#122e37]">
                <span className="flex items-center gap-1 text-teal-400 font-medium">
                  <QrCode className="w-3.5 h-3.5" />
                  Direct {paymentMethod === 'crypto_ton' ? 'TON' : 'USDT TRC20'} Gateway
                </span>
                <span className="text-[11px] text-teal-300 font-semibold">Zero Gas Fee</span>
              </div>
              <div className="p-3 bg-[#081b21] rounded-lg text-xs font-mono-code text-slate-300 break-all select-all flex items-center justify-between gap-2">
                <span>
                  {paymentMethod === 'crypto_ton'
                    ? 'EQBvW8Z5huBkMJYdn3059T0Q4wbjTKbM-08hW21_TON'
                    : 'TJv9Q2x5Z7P8a9M1N3L4K6J8H2F4D6S8A0_TRC20'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      paymentMethod === 'crypto_ton'
                        ? 'EQBvW8Z5huBkMJYdn3059T0Q4wbjTKbM-08hW21_TON'
                        : 'TJv9Q2x5Z7P8a9M1N3L4K6J8H2F4D6S8A0_TRC20'
                    );
                    setCopiedCryptoAddress(true);
                    setTimeout(() => setCopiedCryptoAddress(false), 2000);
                  }}
                  className="px-2 py-1 bg-[#0f2830] text-teal-300 rounded border border-teal-500/30 flex-shrink-0"
                >
                  {copiedCryptoAddress ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Payment confirms instantly in 1 block. Click below to simulate instant gateway verification.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Total & Checkout Button */}
          <div className="pt-2 border-t border-[#163842]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-slate-400 block">Total Due</span>
                <span className="text-2xl font-bold text-slate-100 font-mono-code">
                  ${currentPlanObj.price} USD
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-teal-400 font-semibold block">
                  {currentPlanObj.name} Premium
                </span>
                <span className="text-[11px] text-slate-400">Database Order & CDK Saved</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#14b8a6] hover:bg-[#0d9488] text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Processing Secure Payment & Placing Order...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 stroke-[2.4]" />
                  <span>Pay ${currentPlanObj.price} & Receive Gift Link</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
