/**
 * Finova Backend API Client
 * Connects React frontend with Fastify + Prisma backend (http://localhost:3000)
 */

const API_BASE_URL = 'http://localhost:3000/api';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

export interface GroupGoalProgress {
  goalId: string;
  goalName: string;
  currency: string;
  targetAmountCents: string;
  collectedAmountCents: string;
  remainingAmountCents: string;
  targetAmountFormatted: string;
  collectedAmountFormatted: string;
  remainingAmountFormatted: string;
  progressPercent: number;
  deadline: string | null;
  totalMemberCount: number;
  paidMemberCount: number;
  unpaidMembers: Array<{
    userId: string;
    displayName: string;
    groupMemberId: string;
  }>;
}

export interface AiActionProposal {
  id: string;
  type: string;
  details: Record<string, unknown>;
  expiresAt: string;
}

export interface AiChatResult {
  message: string;
  conversationId: string;
  requiresConfirmation: boolean;
  pendingAction?: AiActionProposal;
}

class ApiService {
  private token: string | null = null;
  private user: UserProfile | null = null;
  public readonly defaultGroupId = '11111111-1111-1111-1111-111111111111';

  constructor() {
    this.token = localStorage.getItem('finova_jwt_token');
    const storedUser = localStorage.getItem('finova_user_profile');
    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
      } catch {
        this.user = null;
      }
    }
  }

  public async ensureAuthenticated(): Promise<UserProfile> {
    if (this.token && this.user) {
      return this.user;
    }

    // Auto-login with default demo user Abdullah
    return await this.login('abdullah@test.nimiq', 'DevPassword123!');
  }

  public async login(email: string, password: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to authenticate');
    }

    const data = await res.json();
    this.token = data.accessToken;
    this.user = data.user;
    localStorage.setItem('finova_jwt_token', data.accessToken);
    localStorage.setItem('finova_user_profile', JSON.stringify(data.user));
    return data.user;
  }

  private async fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.ensureAuthenticated();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // Refresh login once
      await this.login('abdullah@test.nimiq', 'DevPassword123!');
      headers.Authorization = `Bearer ${this.token}`;
      const retry = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({}));
        throw new Error(err.error?.message || `Request failed with status ${retry.status}`);
      }
      return await retry.json();
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Request failed with status ${res.status}`);
    }

    return await res.json();
  }

  public async getGroup(groupId?: string): Promise<any> {
    const id = groupId || this.defaultGroupId;
    const res = await this.fetchWithAuth<{ group: any }>(`/groups/${id}`);
    return res.group;
  }

  public async addMember(groupId: string, memberData: { email: string; role?: string }) {
    return await this.fetchWithAuth(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  public async getGroupDetails(groupId = this.defaultGroupId) {
    return await this.fetchWithAuth<{ group: any }>(`/groups/${groupId}`);
  }

  public async getGoalProgress(groupId = this.defaultGroupId): Promise<GroupGoalProgress[]> {
    // Goal progress is computed via backend goals
    const groupData = await this.getGroupDetails(groupId);
    return groupData.group?.goals || [];
  }

  public async sendAiChat(
    message: string,
    conversationId?: string,
    groupId = this.defaultGroupId,
  ): Promise<AiChatResult> {
    return await this.fetchWithAuth<AiChatResult>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        groupId,
        message,
        conversationId,
      }),
    });
  }

  public async confirmAiAction(actionId: string, confirmed = true) {
    return await this.fetchWithAuth(`/ai/actions/${actionId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ confirmed }),
    });
  }

  public async createPaymentRequest(params: {
    recipientId: string;
    amount: string;
    currency: string;
    purpose: string;
    groupId?: string;
  }) {
    const groupId = params.groupId || this.defaultGroupId;
    return await this.fetchWithAuth('/payments/requests', {
      method: 'POST',
      headers: {
        'Idempotency-Key': `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      },
      body: JSON.stringify({
        groupId,
        recipientId: params.recipientId,
        amount: params.amount,
        currency: params.currency,
        purpose: params.purpose,
      }),
    });
  }

  public async preparePayment(paymentRequestId: string, senderAddress: string) {
    return await this.fetchWithAuth('/payments/prepare', {
      method: 'POST',
      body: JSON.stringify({
        paymentRequestId,
        senderAddress,
      }),
    });
  }

  public async verifyPayment(paymentIntentId: string, nimiqTxHash: string) {
    return await this.fetchWithAuth('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({
        paymentIntentId,
        nimiqTxHash,
      }),
    });
  }
}

export const api = new ApiService();
