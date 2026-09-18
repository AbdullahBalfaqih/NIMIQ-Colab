import React, { useState, useEffect } from 'react';
import {
  Coins,
  HandCoins,
  SendHorizontal,
  QrCode,
  PieChart,
  Radio,
  ScanLine,
  CheckCircle2,
  BadgeCheck,
  Zap,
  CreditCard,
} from 'lucide-react';
import { api } from '../services/api';
import { nimiqService, type NimiqWalletInfo } from '../services/nimiq';
import { NColabLogo } from './NColabLogo';

interface HomeScreenProps {
  onOpenAiOperator: () => void;
  onNavigateToCards: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenAiOperator, onNavigateToCards }) => {
  const [wallet, setWallet] = useState<NimiqWalletInfo>(nimiqService.getWallet());
  const [poolAmount, setPoolAmount] = useState<number>(120);
  const [goalTarget, setGoalTarget] = useState<number>(200);
  const [myContribution, setMyContribution] = useState<number>(40);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentToast, setPaymentToast] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Array<{ name: string; note: string; amount: string }>>([
    { name: 'Sarah Jenkins', note: 'Trip contribution via NIMIQ', amount: '$40.00' },
    { name: 'Michael Chen', note: 'Trip contribution via NIMIQ', amount: '$40.00' },
    { name: 'Abdullah (You)', note: 'Initial deposit', amount: '$40.00' },
  ]);

  useEffect(() => {
    const unsub = nimiqService.subscribe(setWallet);
    // Fetch live group info from backend
    api.getGroupDetails()
      .then((res: any) => {
        if (res.group?.goals?.[0]) {
          const goal = res.group.goals[0];
          const target = Number(goal.targetAmount) / 100;
          setGoalTarget(target || 200);
          const collected = goal.contributions?.reduce(
            (sum: number, c: any) => sum + Number(c.amountCents) / 100,
            0,
          );
          if (collected) setPoolAmount(collected);
        }
      })
      .catch(() => {
        // Fallback default
      });
    return () => unsub();
  }, []);

  const handlePayShareWithNimiq = async () => {
    try {
      setIsProcessingPayment(true);
      const receipt = await nimiqService.sendGroupContribution(40, 'Trip Share Contribution');
      const newPool = poolAmount + 40;
      setPoolAmount(newPool);
      setMyContribution(myContribution + 40);
      setTransactions(prev => [
        {
          name: 'Abdullah (You)',
          note: `NIMIQ Pay (${receipt.amountNim} NIM) · Tx: ${receipt.txHash.slice(0, 10)}...`,
          amount: '$40.00',
        },
        ...prev,
      ]);
      setPaymentToast(`Paid $40.00 (${receipt.amountNim} NIM) to Paris Trip Vault!`);
      setTimeout(() => setPaymentToast(null), 4500);
    } catch {
      setPaymentToast('Payment failed. Please retry.');
      setTimeout(() => setPaymentToast(null), 3000);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const progressPercent = Math.min(100, Math.round((poolAmount / goalTarget) * 100));
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ── Top Header Bar ── */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '67px',
        }}
      >
        {/* NColab Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <NColabLogo height={32} />
        </div>

        {/* Top Right: Nimiq Wallet Pill + Luxury Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '8px 14px',
              borderRadius: '22px',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
            }}
            title={wallet.formattedAddress}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#111111',
                display: 'inline-block',
              }}
            />
            <span>{wallet.balanceNim} NIM</span>
          </div>

          <button
            onClick={onNavigateToCards}
            style={{
              display: 'flex',
              width: '54px',
              height: '54px',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '27px',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              background: 'transparent',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
            title="Cards"
          >
            <ScanLine size={24} strokeWidth={1.8} color="#FFFFFF" />
          </button>
        </div>
      </div>

      {/* ── Optional Floating Toast ── */}
      {paymentToast && (
        <div
          style={{
            position: 'sticky',
            top: '10px',
            zIndex: 50,
            background: '#111111',
            color: '#FFFFFF',
            border: '1px solid #333333',
            padding: '12px 20px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <Zap size={18} fill="#FF5A08" color="#FF5A08" />
          <span>{paymentToast}</span>
        </div>
      )}

      {/* ── Banner Card: Move Payments to Finova (Exact Reference Match) ── */}
      <div
        className="interactive-card"
        style={{
          display: 'flex',
          width: '100%',
          height: '206px',
          borderRadius: '28px',
          background: '#161719',
          position: 'relative',
          overflow: 'hidden',
          padding: '24px 22px',
          boxSizing: 'border-box',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Left Column: Title & Get Started Pill Button */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            zIndex: 2,
            position: 'relative',
            height: '100%',
          }}
        >
          <h2
            style={{
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: 600,
              lineHeight: '30px',
              letterSpacing: '-0.3px',
              margin: 0,
            }}
          >
            Move Payments
            <br />
            to Nimiq Colab
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePayShareWithNimiq}
              disabled={isProcessingPayment}
              style={{
                display: 'inline-flex',
                padding: '10px 18px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '9999px',
                border: 'none',
                background: '#111111',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                cursor: 'pointer',
              }}
            >
              <Zap size={14} fill="#FFFFFF" />
              {isProcessingPayment ? 'Paying...' : 'Pay $40 via NIMIQ'}
            </button>
            <button
              onClick={onOpenAiOperator}
              style={{
                display: 'inline-flex',
                padding: '10px 16px',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: '#232428',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              AI Agent
            </button>
          </div>
        </div>

        {/* Right Column: 3x3 Dark Squircles Matching Exact Reference Screenshot */}
        <div
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 50px)',
            gridTemplateRows: 'repeat(3, 50px)',
            gap: '6px',
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '18px',
                background: 'linear-gradient(145deg, #25262a 0%, #1a1b1e 100%)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {/* Row 2, Col 1: White Credit Card Icon */}
              {i === 3 && (
                <CreditCard size={21} strokeWidth={2} color="#FFFFFF" />
              )}
              {/* Row 2, Col 2: White Circle Dollar Badge */}
              {i === 4 && (
                <div
                  style={{
                    width: '21px',
                    height: '21px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#161719',
                    fontWeight: 700,
                    fontSize: '13px',
                    lineHeight: 1,
                  }}
                >
                  $
                </div>
              )}
              {/* Row 2, Col 3: White Verified Check Badge */}
              {i === 5 && (
                <BadgeCheck size={23} strokeWidth={2} color="#FFFFFF" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Balance Section Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '48px',
          paddingTop: '8px',
        }}
      >
        <span
          style={{
            color: '#111111',
            fontSize: '21px',
            fontWeight: 600,
          }}
        >
          Balance ◉
        </span>
        <button
          style={{
            color: '#111111',
            fontSize: '26px',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          ⋮
        </button>
      </div>

      {/* ── 2 Balance Cards (Trip Pool & My Contribution) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          width: '100%',
        }}
      >
        {/* Card 1: Trip Pool */}
        <div
          className="interactive-card"
          style={{
            display: 'flex',
            height: '208px',
            padding: '24px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderRadius: '30px',
            background: '#FFFFFF',
            boxShadow: '0 6px 15px 0 rgba(221, 221, 221, 0.27)',
            boxSizing: 'border-box',
          }}
        >
          <Coins size={32} strokeWidth={1.8} color="#111111" />

          <div>
            <div
              style={{
                color: '#111111',
                fontSize: '21px',
                fontWeight: 400,
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
              }}
            >
              <span>Trip pool</span>
              <span
                style={{
                  color: '#FF5A08',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#FFF0EA',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {progressPercent}%
              </span>
            </div>
            <div
              style={{
                color: '#111111',
                fontSize: '29px',
                fontWeight: 500,
              }}
            >
              ${poolAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Card 2: My Contribution */}
        <div
          className="interactive-card"
          style={{
            display: 'flex',
            height: '208px',
            padding: '24px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderRadius: '30px',
            background: '#FFFFFF',
            boxShadow: '0 6px 15px 0 rgba(221, 221, 221, 0.27)',
            boxSizing: 'border-box',
          }}
        >
          <HandCoins size={32} strokeWidth={1.8} color="#111111" />

          <div>
            <div
              style={{
                color: '#111111',
                fontSize: '21px',
                fontWeight: 400,
                marginBottom: '4px',
              }}
            >
              My contribution
            </div>
            <div
              style={{
                color: '#111111',
                fontSize: '29px',
                fontWeight: 500,
              }}
            >
              ${myContribution.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Shortcuts Section Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '41px',
          paddingTop: '8px',
        }}
      >
        <span
          style={{
            color: '#111111',
            fontSize: '21px',
            fontWeight: 600,
          }}
        >
          Shortcuts
        </span>
        <button
          style={{
            color: '#111111',
            fontSize: '21px',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          ⋮
        </button>
      </div>

      {/* ── Shortcuts Row (Transfer, Request, Split, Tap & Pay) ── */}
      <div
        style={{
          display: 'flex',
          height: '145px',
          padding: '25px 0',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
          borderRadius: '27px',
          background: '#FFFFFF',
          boxSizing: 'border-box',
        }}
      >
        {/* Shortcut 1: Transfer */}
        <button
          onClick={onOpenAiOperator}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '54px',
              height: '54px',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '27px',
              border: '1px solid #DDDDDD',
              background: '#FAFAFA',
            }}
          >
            <SendHorizontal size={24} strokeWidth={1.8} color="#111111" />
          </div>
          <span style={{ color: '#111111', fontSize: '19px', fontWeight: 400 }}>
            Transfer
          </span>
        </button>

        {/* Shortcut 2: Request */}
        <button
          onClick={onOpenAiOperator}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '54px',
              height: '54px',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '27px',
              border: '1px solid #DDDDDD',
              background: '#FAFAFA',
            }}
          >
            <QrCode size={24} strokeWidth={1.8} color="#111111" />
          </div>
          <span style={{ color: '#111111', fontSize: '19px', fontWeight: 400 }}>
            Request
          </span>
        </button>

        {/* Shortcut 3: Split */}
        <button
          onClick={onOpenAiOperator}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '54px',
              height: '54px',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '27px',
              border: '1px solid #DDDDDD',
              background: '#FAFAFA',
            }}
          >
            <PieChart size={24} strokeWidth={1.8} color="#111111" />
          </div>
          <span style={{ color: '#111111', fontSize: '19px', fontWeight: 400 }}>
            Split
          </span>
        </button>

        {/* Shortcut 4: Tap & Pay */}
        <button
          onClick={onNavigateToCards}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '54px',
              height: '54px',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '27px',
              border: '1px solid #DDDDDD',
              background: '#FAFAFA',
            }}
          >
            <Radio size={24} strokeWidth={1.8} color="#111111" />
          </div>
          <span style={{ color: '#111111', fontSize: '19px', fontWeight: 400 }}>
            Tap & Pay
          </span>
        </button>
      </div>

      {/* ── Last Transactions Section Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '41px',
          paddingTop: '8px',
        }}
      >
        <span
          style={{
            color: '#111111',
            fontSize: '21px',
            fontWeight: 600,
          }}
        >
          Last transactions
        </span>
        <button
          style={{
            color: '#111111',
            fontSize: '21px',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          ⋮
        </button>
      </div>

      {/* ── Transaction Items ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {transactions.map((tx, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              height: '102px',
              padding: '22px',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '30px',
              background: '#FFFFFF',
              boxSizing: 'border-box',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div
                style={{
                  display: 'flex',
                  width: '59px',
                  height: '59px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '29.5px',
                  border: '1px solid #DDDDDD',
                  background: '#FAFAFA',
                }}
              >
                <CheckCircle2 size={26} strokeWidth={1.8} color="#111111" />
              </div>
              <div>
                <div
                  style={{
                    color: '#111111',
                    fontSize: '20px',
                    fontWeight: 700,
                  }}
                >
                  {tx.name}
                </div>
                <div style={{ color: '#666666', fontSize: '14px', marginTop: '2px' }}>
                  {tx.note}
                </div>
              </div>
            </div>

            <div
              style={{
                color: '#111111',
                fontSize: '20px',
                fontWeight: 700,
              }}
            >
              {tx.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
