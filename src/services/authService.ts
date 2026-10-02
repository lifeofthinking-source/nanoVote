import { User } from '../types';
import { mockDb, simulateDelay } from '../mock/mockDatabase';

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  demoOtpCode?: string;
}

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    await simulateDelay(60, 150);
    const userId = mockDb.getCurrentUserId();
    if (!userId) return null;
    return mockDb.getUserById(userId) || null;
  },

  async login(email: string, _password?: string): Promise<AuthResponse> {
    await simulateDelay(200, 400);
    const user = mockDb.getUserByEmail(email.trim());
    if (!user) {
      return {
        success: false,
        error: 'No account found with this email. Please check the spelling or sign up.',
      };
    }
    mockDb.setCurrentUserId(user.id);
    return {
      success: true,
      user,
    };
  },

  async requestDemoOtp(email: string): Promise<AuthResponse> {
    await simulateDelay(200, 350);
    const user = mockDb.getUserByEmail(email.trim());
    if (!user) {
      return {
        success: false,
        error: 'No registered user matches this email address.',
      };
    }
    // Generate simulated 6-digit OTP
    const demoOtpCode = '849201';
    return {
      success: true,
      demoOtpCode,
    };
  },

  async verifyDemoOtp(email: string, otp: string): Promise<AuthResponse> {
    await simulateDelay(250, 450);
    const user = mockDb.getUserByEmail(email.trim());
    if (!user) {
      return {
        success: false,
        error: 'User not found.',
      };
    }
    if (otp !== '849201' && otp !== '123456') {
      return {
        success: false,
        error: 'Invalid Demo OTP code. (Use 849201 or 123456 for demo)',
      };
    }
    mockDb.setCurrentUserId(user.id);
    return {
      success: true,
      user,
    };
  },

  async signup(data: {
    name: string;
    email: string;
    employeeId: string;
    department: string;
    organization: string;
    phone?: string;
  }): Promise<AuthResponse> {
    await simulateDelay(250, 500);
    const existing = mockDb.getUserByEmail(data.email.trim());
    if (existing) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please login.',
      };
    }

    const newUser: User = {
      id: 'user-' + Math.random().toString(36).substring(2, 9),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      employeeId: data.employeeId.trim().toUpperCase(),
      department: data.department.trim(),
      organization: data.organization.trim(),
      phone: data.phone?.trim(),
      createdAt: new Date().toISOString(),
    };

    mockDb.createUser(newUser);
    mockDb.setCurrentUserId(newUser.id);

    return {
      success: true,
      user: newUser,
    };
  },

  async switchUser(userId: string): Promise<User | null> {
    await simulateDelay(100, 200);
    const user = mockDb.getUserById(userId);
    if (!user) return null;
    mockDb.setCurrentUserId(userId);
    return user;
  },

  async logout(): Promise<void> {
    await simulateDelay(80, 160);
    mockDb.setCurrentUserId(null);
  },

  async getAllUsers(): Promise<User[]> {
    await simulateDelay(50, 100);
    return mockDb.getUsers();
  },

  async resetData(): Promise<void> {
    await simulateDelay(200, 400);
    mockDb.resetDemoData();
  }
};
