import React, { useState } from 'react';
import {
  UserPlus,
  PlusCircle,
  Users,
  Briefcase,
  Heart,
  X,
  Plus,
  Compass,
  Gift,
} from 'lucide-react';
import { api } from '../services/api';

export type MemberCategory = 'All' | 'Family' | 'Friends' | 'Coworkers';

interface MemberItem {
  id: string;
  name: string;
  role: string;
  category: 'Family' | 'Friends' | 'Coworkers';
  avatar: string;
  paid: boolean;
  amountPaid: number;
}

interface GoalItem {
  id: string;
  title: string;
  category: 'Family' | 'Friends' | 'Coworkers';
  targetAmount: number;
  currentAmount: number;
  type: 'trip' | 'birthday' | 'work';
  deadline: string;
}

export const MembersScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<MemberCategory>('All');

  // Modal / Form toggle states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

  // Add Member inputs
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberCategory, setNewMemberCategory] = useState<'Family' | 'Friends' | 'Coworkers'>('Friends');

  // Add Goal inputs
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<'Family' | 'Friends' | 'Coworkers'>('Friends');

  // Initial Members (matching Screenshot 3 style, no emojis, purely in English)
  const [members, setMembers] = useState<MemberItem[]>([
    {
      id: '1',
      name: 'Abdullah',
      role: 'Admin (You)',
      category: 'Friends',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      paid: true,
      amountPaid: 40,
    },
    {
      id: '2',
      name: 'Sarah',
      role: 'Member',
      category: 'Family',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      paid: true,
      amountPaid: 40,
    },
    {
      id: '3',
      name: 'Michael',
      role: 'Member',
      category: 'Coworkers',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
      paid: true,
      amountPaid: 40,
    },
    {
      id: '4',
      name: 'Alex',
      role: 'Member',
      category: 'Friends',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      paid: false,
      amountPaid: 0,
    },
    {
      id: '5',
      name: 'David',
      role: 'Member',
      category: 'Friends',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      paid: false,
      amountPaid: 0,
    },
    {
      id: '6',
      name: 'Mom',
      role: 'Family',
      category: 'Family',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
      paid: true,
      amountPaid: 50,
    },
    {
      id: '7',
      name: 'Dad',
      role: 'Family',
      category: 'Family',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
      paid: true,
      amountPaid: 50,
    },
  ]);

  // Initial Goals / Steps (Trip to Paris, Birthday Party, etc. - NO EMOJIS, pure English)
  const [goals, setGoals] = useState<GoalItem[]>([
    {
      id: 'g1',
      title: 'Trip to Paris',
      category: 'Friends',
      targetAmount: 200,
      currentAmount: 120,
      type: 'trip',
      deadline: 'Oct 15',
    },
    {
      id: 'g2',
      title: 'Birthday Party',
      category: 'Family',
      targetAmount: 150,
      currentAmount: 90,
      type: 'birthday',
      deadline: 'Oct 28',
    },
    {
      id: 'g3',
      title: 'Team Work Project',
      category: 'Coworkers',
      targetAmount: 100,
      currentAmount: 40,
      type: 'work',
      deadline: 'Nov 5',
    },
  ]);

  const filteredMembers =
    selectedCategory === 'All'
      ? members
      : members.filter((m) => m.category === selectedCategory);

  const filteredGoals =
    selectedCategory === 'All'
      ? goals
      : goals.filter((g) => g.category === selectedCategory);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newM: MemberItem = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      role: 'New Member',
      category: newMemberCategory,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(newMemberName.trim())}`,
      paid: false,
      amountPaid: 0,
    };

    setMembers((prev) => [newM, ...prev]);
    setNewMemberName('');
    setShowAddMemberModal(false);

    try {
      await api.addMember('11111111-1111-1111-1111-111111111111', {
        email: `${newMemberName.trim().toLowerCase()}@colab.local`,
        role: 'MEMBER',
      });
    } catch {
      // offline fallback
    }
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalTarget) return;

    const newG: GoalItem = {
      id: Date.now().toString(),
      title: newGoalTitle.trim(),
      category: newGoalCategory,
      targetAmount: parseFloat(newGoalTarget) || 100,
      currentAmount: 0,
      type: newGoalCategory === 'Family' ? 'birthday' : newGoalCategory === 'Coworkers' ? 'work' : 'trip',
      deadline: 'Soon',
    };

    setGoals((prev) => [newG, ...prev]);
    setNewGoalTitle('');
    setNewGoalTarget('');
    setShowAddGoalModal(false);
  };

  const renderGoalIcon = (type: string) => {
    if (type === 'trip') return <Compass size={20} color="#111111" />;
    if (type === 'birthday') return <Gift size={20} color="#111111" />;
    return <Briefcase size={20} color="#111111" />;
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        paddingBottom: '30px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* ── Top Header (In English, No emojis) ── */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '56px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h1
            style={{
              color: '#FFFFFF',
              fontSize: '26px',
              fontWeight: 700,
              lineHeight: 1,
              margin: 0,
              letterSpacing: '-0.4px',
            }}
          >
            Group & Goals
          </h1>
          <span style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '13px' }}>
            Manage members and vault targets
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '6px 14px',
            borderRadius: '20px',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}
        >
          <Users size={16} />
          <span>{members.length} Members</span>
        </div>
      </div>

      {/* ── Category Filter Pills (All, Family, Friends, Coworkers - NO EMOJIS) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {(['All', 'Family', 'Friends', 'Coworkers'] as MemberCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: selectedCategory === cat ? 'none' : '1px solid rgba(255, 255, 255, 0.25)',
              background: selectedCategory === cat ? '#111111' : 'rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              backdropFilter: 'blur(8px)',
            }}
          >
            {cat === 'Family' && <Heart size={14} />}
            {cat === 'Friends' && <Users size={14} />}
            {cat === 'Coworkers' && <Briefcase size={14} />}
            <span>{cat}</span>
          </button>
        ))}
      </div>

      {/* ── Symmetrical Square Cards: Add Member & Add Goal (In English, No emojis) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          width: '100%',
        }}
      >
        {/* Square Card 1: Add Member Manually */}
        <button
          onClick={() => setShowAddMemberModal(true)}
          className="interactive-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            height: '142px',
            padding: '16px',
            borderRadius: '26px',
            background: '#FFFFFF',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
        >
          <UserPlus size={28} strokeWidth={1.8} color="#111111" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ color: '#111111', fontSize: '15px', fontWeight: 700, lineHeight: 1.2 }}>
              Add Member
            </span>
            <span style={{ color: '#777777', fontSize: '12px', fontWeight: 500 }}>
              Family, Friends, Coworkers
            </span>
          </div>
        </button>

        {/* Square Card 2: Add Goal / Step Manually */}
        <button
          onClick={() => setShowAddGoalModal(true)}
          className="interactive-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            height: '142px',
            padding: '16px',
            borderRadius: '26px',
            background: '#FFFFFF',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
        >
          <PlusCircle size={28} strokeWidth={1.8} color="#111111" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ color: '#111111', fontSize: '15px', fontWeight: 700, lineHeight: 1.2 }}>
              Add Step / Goal
            </span>
            <span style={{ color: '#777777', fontSize: '12px', fontWeight: 500 }}>
              Paris Trip, Birthday...
            </span>
          </div>
        </button>
      </div>

      {/* ── Goals & Steps Section (Trip to Paris, Birthday Party - NO EMOJIS) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#FFFFFF', fontSize: '17px', fontWeight: 700 }}>
            Group Goals & Steps
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
            {filteredGoals.length} Goals
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredGoals.map((g) => {
            const percent = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
            return (
              <div
                key={g.id}
                className="interactive-card"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '22px',
                  padding: '16px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {renderGoalIcon(g.type)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#111111', fontSize: '15px', fontWeight: 700 }}>
                        {g.title}
                      </span>
                      <span style={{ color: '#888888', fontSize: '12px' }}>
                        Category: {g.category} • Deadline: {g.deadline}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#111111', fontSize: '15px', fontWeight: 700 }}>
                      ${g.currentAmount} / ${g.targetAmount}
                    </div>
                    <span style={{ color: percent >= 100 ? '#16A34A' : '#111111', fontSize: '11px', fontWeight: 600 }}>
                      {percent}% completed
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: '7px',
                    borderRadius: '4px',
                    background: '#ECECEC',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: '#111111',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── People & Members Section (Matching Screenshot 3, In English, No Emojis) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#FFFFFF', fontSize: '17px', fontWeight: 700 }}>
            People
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
            Tap member to manage
          </span>
        </div>

        {/* Circular Avatars Grid (Screenshot 3 style) */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '26px',
            padding: '20px',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px 12px',
              justifyItems: 'center',
            }}
          >
            {filteredMembers.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={m.avatar}
                    alt={m.name}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: 'none',
                    }}
                  />
                </div>

                <span style={{ color: '#111111', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                  {m.name}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#666666',
                    background: '#F1F1F1',
                    padding: '1px 6px',
                    borderRadius: '6px',
                    textAlign: 'center',
                  }}
                >
                  {m.category}
                </span>
              </div>
            ))}

            {/* + Add Quick Button */}
            <div
              onClick={() => setShowAddMemberModal(true)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#F4F4F5',
                  color: '#111111',
                }}
              >
                <Plus size={24} strokeWidth={2} />
              </div>
              <span style={{ color: '#111111', fontSize: '13px', fontWeight: 600 }}>Add</span>
              <span style={{ fontSize: '10px', color: '#888888' }}>New</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Add Member Manually (English, Clean) ── */}
      {showAddMemberModal && (
        <div
          className="modal-backdrop-motion"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="modal-content-motion"
            style={{
              width: '100%',
              maxWidth: '380px',
              background: '#FFFFFF',
              borderRadius: '28px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: '#111111' }}>
                Add Member Manually
              </h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                style={{
                  border: 'none',
                  background: '#F0F0F0',
                  width: '32px',
                  height: '32px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333333', marginBottom: '6px' }}>
                  Member Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ahmed, Sarah..."
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    border: '1px solid #E0E0E0',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333333', marginBottom: '6px' }}>
                  Category
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['Family', 'Friends', 'Coworkers'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewMemberCategory(c)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '12px',
                        border: newMemberCategory === c ? '2px solid #111111' : '1px solid #E5E5E5',
                        background: newMemberCategory === c ? '#111111' : '#FAFAFA',
                        color: newMemberCategory === c ? '#FFFFFF' : '#222222',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '8px',
                  padding: '14px',
                  borderRadius: '20px',
                  background: '#111111',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Confirm Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add Goal / Step Manually (English, Clean) ── */}
      {showAddGoalModal && (
        <div
          className="modal-backdrop-motion"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="modal-content-motion"
            style={{
              width: '100%',
              maxWidth: '380px',
              background: '#FFFFFF',
              borderRadius: '28px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: '#111111' }}>
                Add Step or Goal
              </h3>
              <button
                onClick={() => setShowAddGoalModal(false)}
                style={{
                  border: 'none',
                  background: '#F0F0F0',
                  width: '32px',
                  height: '32px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddGoal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333333', marginBottom: '6px' }}>
                  Goal Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paris Trip, Birthday Party..."
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    border: '1px solid #E0E0E0',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333333', marginBottom: '6px' }}>
                  Target Amount ($)
                </label>
                <input
                  type="number"
                  placeholder="200"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  required
                  min="1"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    border: '1px solid #E0E0E0',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333333', marginBottom: '6px' }}>
                  Category
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['Family', 'Friends', 'Coworkers'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewGoalCategory(c)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '12px',
                        border: newGoalCategory === c ? '2px solid #111111' : '1px solid #E5E5E5',
                        background: newGoalCategory === c ? '#111111' : '#FAFAFA',
                        color: newGoalCategory === c ? '#FFFFFF' : '#222222',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '8px',
                  padding: '14px',
                  borderRadius: '20px',
                  background: '#111111',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save Goal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
