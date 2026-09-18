import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Flame,
  BatteryCharging,
  DollarSign,
} from 'lucide-react';

const AI_ORB_ICON =
  'https://api.builder.io/api/v1/image/assets/TEMP/2a4a11e007e53740216645412a721ef97d1c88a0?width=64';

interface ProductItem {
  id: string;
  name: string;
  tag: string;
  price: number;
  perPerson: number;
  image: string;
  rotation?: string;
}

const PRODUCTS: ProductItem[] = [
  {
    id: 'nike-air-max',
    name: 'Nike Air Max',
    tag: 'Group choice • 4.9 rating',
    price: 180,
    perPerson: 36,
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/656c13276a9d78a9196a69fea14901d8e81eed4c?width=350',
    rotation: '-5deg',
  },
  {
    id: 'adidas-ultraboost',
    name: 'Adidas Ultraboost',
    tag: 'Best cushion • 4.8 rating',
    price: 145,
    perPerson: 29,
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/70b67fda0d3f8903e01ea987ca83a822f9cbce1e?width=230',
    rotation: '-8deg',
  },
  {
    id: 'puma-velocity',
    name: 'Puma Velocity Nitro',
    tag: 'Lightest weight • 4.7 rating',
    price: 120,
    perPerson: 24,
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/a79a180990f24425936b05d6578cdc273fdca929?width=230',
    rotation: '6deg',
  },
  {
    id: 'nike-pegasus',
    name: 'Nike Pegasus 40',
    tag: 'Daily runner • 4.9 rating',
    price: 130,
    perPerson: 26,
    image:
      'https://api.builder.io/api/v1/image/assets/TEMP/0edf900d9820d8a0ff40dc38223e0914f15a53a3?width=210',
    rotation: '-4deg',
  },
];

interface MarketScreenProps {
  onOpenAiOperator?: () => void;
}

type MarketSubView = 'browse' | 'recommendations' | 'chat';

export const MarketScreen: React.FC<MarketScreenProps> = ({ onOpenAiOperator: _onOpenAiOperator }) => {
  const [subView, setSubView] = useState<MarketSubView>('browse');
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handlePrevProduct = () => {
    setActiveProductIndex((prev) => (prev > 0 ? prev - 1 : PRODUCTS.length - 1));
  };

  const handleNextProduct = () => {
    setActiveProductIndex((prev) => (prev < PRODUCTS.length - 1 ? prev + 1 : 0));
  };

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: 'user' | 'ai'; text: string }>
  >([
    {
      sender: 'user',
      text: 'Find me good running shoes under $150 for our group',
    },
    {
      sender: 'ai',
      text: '3 Products Found matching group budget & top durability ratings',
    },
  ]);
  const [isAddedToCart, setIsAddedToCart] = useState(false);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setChatInput('');
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: userText },
      { sender: 'ai', text: 'Nimiq Colab AI is matching options and calculating split...' },
    ]);

    try {
      const res = await api.sendAiChat(
        `[Shopping Assistant]: The user asked: "${userText}". Provide a helpful, concise shopping advice with price analysis and group split suggestion.`,
      );
      setChatMessages((prev) => [
        ...prev.slice(0, -1),
        { sender: 'ai', text: res.message },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev.slice(0, -1),
        {
          sender: 'ai',
          text: `Nimiq Colab AI matched best options for "${userText}". Voting opened for group members!`,
        },
      ]);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingBottom: '20px',
        flex: 1,
        minHeight: '100%',
      }}
    >
      {/* ── Sleek Minimal Sub-Screen Toggle ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          marginBottom: '2px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            background: '#F1F2F4',
            padding: '4px',
            borderRadius: '24px',
            gap: '4px',
          }}
        >
          <button
            onClick={() => setSubView('browse')}
            style={{
              padding: '6px 16px',
              borderRadius: '18px',
              border: 'none',
              background: subView === 'browse' ? '#111111' : 'transparent',
              color: subView === 'browse' ? '#FFFFFF' : '#666666',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            1. Discovery
          </button>
          <button
            onClick={() => setSubView('recommendations')}
            style={{
              padding: '6px 16px',
              borderRadius: '18px',
              border: 'none',
              background: subView === 'recommendations' ? '#111111' : 'transparent',
              color: subView === 'recommendations' ? '#FFFFFF' : '#666666',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            2. AI Reasons
          </button>
          <button
            onClick={() => setSubView('chat')}
            style={{
              padding: '6px 16px',
              borderRadius: '18px',
              border: 'none',
              background: subView === 'chat' ? '#111111' : 'transparent',
              color: subView === 'chat' ? '#FFFFFF' : '#666666',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            3. Group Chat
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          SCREEN 1: AI SHOPPING ASSISTANT (DISCOVERY)
         ───────────────────────────────────────────────────────────────── */}
      {subView === 'browse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%' }}>
          {/* Top Header: Avatar + Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '48px',
              width: '100%',
            }}
          >
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/94dca3239dfcdf12b17cd8a94dbf11d079469a94?width=90"
              alt="User"
              style={{
                width: '45px',
                height: '45px',
                borderRadius: '22.5px',
                objectFit: 'cover',
                border: 'none',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '43px',
                  height: '43px',
                  borderRadius: '21.5px',
                  background: '#F7F7F7',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#111111',
                  cursor: 'pointer',
                }}
              >
                <SlidersHorizontal size={18} />
              </div>
              <div
                style={{
                  width: '43px',
                  height: '43px',
                  borderRadius: '21.5px',
                  background: '#F7F7F7',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  color: '#111111',
                  cursor: 'pointer',
                }}
              >
                <ShoppingBag size={18} />
                <div
                  style={{
                    position: 'absolute',
                    top: '9px',
                    right: '9px',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#DA2632',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Heading: AI Shopping Assistant */}
          <div style={{ textAlign: 'center', margin: '4px 0' }}>
            <div
              style={{
                color: '#111111',
                fontSize: '27px',
                fontWeight: 400,
                lineHeight: '38px',
              }}
            >
              AI Shopping
            </div>
            <div
              style={{
                color: '#111111',
                fontSize: '36px',
                fontWeight: 600,
                lineHeight: '46px',
                letterSpacing: '-0.5px',
              }}
            >
              Assistant
            </div>
          </div>

          {/* Search Bar */}
          <div
            onClick={() => setSubView('chat')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '54px',
              borderRadius: '28px',
              background: '#F6F6F6',
              padding: '0 20px',
              cursor: 'pointer',
              border: '1px solid #ECECEC',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#7A7A7A' }}>
              <Search size={18} />
              <span style={{ fontSize: '15px' }}>Ask AI to find products...</span>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '18px',
                background: '#161616',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <img
                src={AI_ORB_ICON}
                alt="AI"
                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Carousel Section with Side Peeking Cards */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: '8px',
            }}
          >
            {/* AI Pick for You Orange Header Tab */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                borderRadius: '24px 24px 0 0',
                background: '#FF5A08',
                color: '#FFE7DA',
                fontSize: '14px',
                fontWeight: 500,
                zIndex: 2,
              }}
            >
              <img
                src={AI_ORB_ICON}
                alt="AI"
                style={{ width: '18px', height: '18px', objectFit: 'contain' }}
              />
              AI Pick for you
            </div>

            {/* Carousel Container with Interactive Touch and Click Navigation */}
            <div
              onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchStartX === null) return;
                const delta = e.changedTouches[0].clientX - touchStartX;
                if (delta > 40) handlePrevProduct();
                if (delta < -40) handleNextProduct();
                setTouchStartX(null);
              }}
              style={{
                position: 'relative',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                userSelect: 'none',
              }}
            >
              {/* Left Peeking Card (Clickable to switch left) */}
              <div
                onClick={handlePrevProduct}
                title="Previous product"
                style={{
                  position: 'absolute',
                  left: '-24px',
                  width: '90px',
                  height: '210px',
                  borderRadius: '30px',
                  background: '#F4F4F4',
                  opacity: 0.65,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  zIndex: 2,
                  transition: 'all 0.3s ease',
                }}
              >
                <img
                  src={PRODUCTS[(activeProductIndex - 1 + PRODUCTS.length) % PRODUCTS.length].image}
                  alt="Previous shoe"
                  style={{ width: '90px', height: '110px', objectFit: 'contain' }}
                />
              </div>

              {/* Main Center Card (Active selected product) */}
              <div
                onClick={() => setSubView('recommendations')}
                style={{
                  width: '100%',
                  maxWidth: '380px',
                  borderRadius: '34px',
                  background: 'linear-gradient(147deg, #F8F8F8 0%, #FFFFFF 100%)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #ECECEC',
                  padding: '22px 20px',
                  boxSizing: 'border-box',
                  zIndex: 3,
                  cursor: 'pointer',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color: '#111111',
                        fontSize: '18px',
                        fontWeight: 600,
                      }}
                    >
                      {PRODUCTS[activeProductIndex].name}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#777777', marginTop: '2px' }}>
                      {PRODUCTS[activeProductIndex].tag}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '6px 14px',
                      borderRadius: '16px',
                      background: '#FFC5B3',
                      color: '#111111',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    ${PRODUCTS[activeProductIndex].price}
                  </div>
                </div>

                {/* Main Product Visual */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '16px 0',
                    height: '150px',
                  }}
                >
                  <img
                    key={PRODUCTS[activeProductIndex].id}
                    src={PRODUCTS[activeProductIndex].image}
                    alt={PRODUCTS[activeProductIndex].name}
                    style={{
                      width: '210px',
                      height: '145px',
                      objectFit: 'contain',
                      transform: `rotate(${PRODUCTS[activeProductIndex].rotation || '0deg'})`,
                      transition: 'transform 0.3s ease',
                    }}
                  />
                </div>

                {/* Floating Action Pill */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(235, 235, 235, 0.92)',
                    backdropFilter: 'blur(8px)',
                    padding: '8px 14px',
                    borderRadius: '24px',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '14px',
                      background: '#FFFFFF',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#111111',
                    }}
                  >
                    1
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#111111' }}>
                    Split with group (${PRODUCTS[activeProductIndex].perPerson} / person)
                  </span>
                </div>
              </div>

              {/* Right Peeking Card (Clickable to switch right) */}
              <div
                onClick={handleNextProduct}
                title="Next product"
                style={{
                  position: 'absolute',
                  right: '-24px',
                  width: '90px',
                  height: '210px',
                  borderRadius: '30px',
                  background: '#F4F4F4',
                  opacity: 0.65,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  zIndex: 2,
                  transition: 'all 0.3s ease',
                }}
              >
                <img
                  src={PRODUCTS[(activeProductIndex + 1) % PRODUCTS.length].image}
                  alt="Next shoe"
                  style={{ width: '90px', height: '110px', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Interactive Pagination Indicators */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '16px',
              }}
            >
              {PRODUCTS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveProductIndex(idx)}
                  style={{
                    width: activeProductIndex === idx ? '18px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: activeProductIndex === idx ? '#111111' : '#DDDDDD',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                  }}
                  title={`Product ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Bottom Big CTA */}
          <button
            onClick={() => setSubView('chat')}
            style={{
              display: 'flex',
              width: '100%',
              height: '54px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '28px',
              background: '#FF5B08',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 600,
              boxShadow: '0 6px 18px rgba(255, 91, 8, 0.28)',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            <img
              src={AI_ORB_ICON}
              alt="AI"
              style={{ width: '26px', height: '26px', objectFit: 'contain' }}
            />
            Ask AI Shopping Assistant
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          SCREEN 2: AI RECOMMENDATIONS (PRODUCT REASONS & DETAIL)
         ───────────────────────────────────────────────────────────────── */}
      {subView === 'recommendations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
          {/* Header Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '45px',
              width: '100%',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '19px',
                fontWeight: 600,
                color: '#111111',
              }}
            >
              AI Recommendations
            </h2>
          </div>

          {/* Hero Visual with Left/Right Swipers */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '6px 0',
            }}
          >
            <button
              style={{
                position: 'absolute',
                left: '4px',
                width: '38px',
                height: '38px',
                borderRadius: '19px',
                background: '#F8F8F8',
                border: '1px solid #EBEBEB',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                color: '#111111',
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/b199ee4d837c31cd10af941f8bc2a789e1a9258e?width=480"
              alt="Sony headphones"
              style={{
                width: '220px',
                height: '220px',
                objectFit: 'contain',
              }}
            />

            <button
              style={{
                position: 'absolute',
                right: '4px',
                width: '38px',
                height: '38px',
                borderRadius: '19px',
                background: '#F8F8F8',
                border: '1px solid #EBEBEB',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                color: '#111111',
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* 3 AI Reason Badges (Exactly from Figma screen 2) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              width: '100%',
            }}
          >
            {/* 1. Top rated */}
            <div
              style={{
                background: '#F7F7F7',
                borderRadius: '24px',
                padding: '16px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'center',
                border: '1px solid #EEEEEE',
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  color: '#FF5A08',
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                AI Reason
              </span>
              <Flame size={20} color="#FF5A08" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#111111' }}>
                Top rated
              </span>
            </div>

            {/* 2. Best battery life */}
            <div
              style={{
                background: '#F7F7F7',
                borderRadius: '24px',
                padding: '16px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'center',
                border: '1px solid #EEEEEE',
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  color: '#FF5A08',
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                AI Reason
              </span>
              <BatteryCharging size={20} color="#111111" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#111111' }}>
                Best battery life
              </span>
            </div>

            {/* 3. Fits your budget */}
            <div
              style={{
                background: '#F7F7F7',
                borderRadius: '24px',
                padding: '16px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'center',
                border: '1px solid #EEEEEE',
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  color: '#FF5A08',
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                AI Reason
              </span>
              <DollarSign size={20} color="#111111" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#111111' }}>
                Fits your budget
              </span>
            </div>
          </div>

          {/* Product Detail Card */}
          <div
            style={{
              borderRadius: '32px',
              background: 'linear-gradient(180deg, #F6F6F6 0%, #FAFAFA 100%)',
              padding: '22px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              textAlign: 'center',
              border: '1px solid #ECECEC',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#111111' }}>
              Sony WH-1000XM5
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#666666' }}>
              Best noise cancelling headphones for group commute
            </p>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 600,
                color: '#111111',
                marginTop: '6px',
              }}
            >
              $399
            </div>
            <div style={{ fontSize: '13px', color: '#FF5A08', fontWeight: 600 }}>
              $79.80 per member (5 contributors)
            </div>

            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/76f28fa56775dd4f29b6f0226219df75aa0d09df?width=240"
              alt="Headphones"
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'contain',
                marginTop: '4px',
              }}
            />
          </div>

          {/* Orange Working Action Button (No icon at the end) */}
          <button
            onClick={() => setIsAddedToCart(!isAddedToCart)}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              height: '54px',
              borderRadius: '28px',
              border: 'none',
              background: isAddedToCart ? '#16A34A' : '#FF5B08',
              color: '#FFFFFF',
              boxShadow: isAddedToCart
                ? '0 6px 20px rgba(22, 163, 74, 0.35)'
                : '0 6px 20px rgba(255, 91, 8, 0.35)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: '0 24px',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.25)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '13px',
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              1
            </div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>
              {isAddedToCart ? 'Added to group cart & split' : 'Add to group cart & split'}
            </span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          SCREEN 3: AI SHOPPING CHAT (GROUP BUYING DISCUSSION)
         ───────────────────────────────────────────────────────────────── */}
      {subView === 'chat' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            minHeight: '820px',
            width: '100%',
          }}
        >
          {/* Top Chat Thread Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
            {/* Header Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '45px',
                width: '100%',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '19px',
                  fontWeight: 600,
                  color: '#111111',
                }}
              >
                AI Shopping Chat
              </h2>
            </div>

            {/* User Message Bubble */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  maxWidth: '240px',
                  background: '#FF5A08',
                  borderRadius: '16px 4px 16px 16px',
                  padding: '12px 16px',
                  position: 'relative',
                  boxShadow: '0 4px 14px rgba(255, 90, 8, 0.22)',
                }}
              >
                <img
                  src="https://api.builder.io/api/v1/image/assets/TEMP/dd47e8dff54bc2536963197256a0327832884928?width=66"
                  alt="User"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '16px',
                    border: 'none',
                    position: 'absolute',
                    top: '-14px',
                    right: '-10px',
                  }}
                />
                <span
                  style={{
                    color: '#FFE6DA',
                    fontSize: '14px',
                    lineHeight: '21px',
                    fontWeight: 400,
                  }}
                >
                  Find me good running shoes under $150
                </span>
              </div>
            </div>

            {/* AI Response Bubble Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#E9E9E9',
                  borderRadius: '0 14px 14px 14px',
                  padding: '10px 16px',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '13px',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  }}
                >
                  <img
                    src={AI_ORB_ICON}
                    alt="AI"
                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                  />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111111' }}>
                  3 Products Found
                </span>
              </div>
            </div>

            {/* 3 Fanned Rotated Cards (Exact replica from Figma Screen 3) */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '220px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '6px 0',
              }}
            >
              {/* 1. Puma Velocity (Rotated -16deg) */}
              <div
                style={{
                  position: 'absolute',
                  left: '26px',
                  top: '25px',
                  width: '120px',
                  height: '145px',
                  transform: 'rotate(-16deg)',
                  background: '#FFFFFF',
                  borderRadius: '26px',
                  border: '4px solid #F7F7F7',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  boxSizing: 'border-box',
                  zIndex: 1,
                }}
              >
                <img
                  src="https://api.builder.io/api/v1/image/assets/TEMP/1f1a8f5005a70c833f545737697f0197154fade6?width=210"
                  alt="Puma Velocity"
                  style={{ width: '90px', height: '80px', objectFit: 'contain' }}
                />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#111111', marginTop: '4px' }}>
                  Puma Velocity
                </span>
              </div>

              {/* 2. Adidas Ultraboost (Center, Rotated 4deg) */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  width: '128px',
                  height: '155px',
                  transform: 'rotate(4deg)',
                  background: '#FFFFFF',
                  borderRadius: '26px',
                  border: '4px solid #F7F7F7',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  boxSizing: 'border-box',
                  zIndex: 2,
                }}
              >
                <img
                  src="https://api.builder.io/api/v1/image/assets/TEMP/e5652856cb181ccc92251fb1b5a880a15a911e25?width=210"
                  alt="Adidas Ultraboost"
                  style={{ width: '96px', height: '85px', objectFit: 'contain' }}
                />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#111111', marginTop: '4px' }}>
                  Adidas Ultraboost
                </span>
              </div>

              {/* 3. Nike Pegasus (Rotated 17deg) */}
              <div
                style={{
                  position: 'absolute',
                  right: '26px',
                  top: '25px',
                  width: '120px',
                  height: '145px',
                  transform: 'rotate(17deg)',
                  background: '#FFFFFF',
                  borderRadius: '26px',
                  border: '4px solid #F7F7F7',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  boxSizing: 'border-box',
                  zIndex: 1,
                }}
              >
                <img
                  src="https://api.builder.io/api/v1/image/assets/TEMP/0edf900d9820d8a0ff40dc38223e0914f15a53a3?width=210"
                  alt="Nike Pegasus"
                  style={{ width: '90px', height: '80px', objectFit: 'contain' }}
                />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#111111', marginTop: '4px' }}>
                  Nike Pegasus
                </span>
              </div>
            </div>

            {/* Any newly added messages */}
            {chatMessages.slice(2).map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  background: msg.sender === 'user' ? '#FF5A08' : '#F3F3F3',
                  borderRadius:
                    msg.sender === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  padding: '12px 16px',
                  color: msg.sender === 'user' ? '#FFFFFF' : '#111111',
                  fontSize: '14px',
                  lineHeight: '20px',
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Interactive Chat Input Bar (Pinned at bottom) */}
          <div style={{ width: '100%', marginTop: 'auto', paddingTop: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '52px',
                padding: '0 6px 0 16px',
                borderRadius: '27px',
                background: '#F3F3F3',
                border: '1px solid #EBEBEB',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <img
                  src={AI_ORB_ICON}
                  alt="AI"
                  style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                />
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask anything..."
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '14px',
                    color: '#111111',
                    fontFamily: 'DM Sans',
                  }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '10px 18px',
                  borderRadius: '24px',
                  background: '#FF5B08',
                  border: 'none',
                  color: '#FFEAE0',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
