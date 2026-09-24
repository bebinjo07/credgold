/**
 * Client-Side API Helper for Gold Loan & Pawn System
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async get(endpoint: string) {
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return await res.json();
    } catch (err: any) {
      console.warn(`API GET ${endpoint} error:`, err.message);
      return { success: false, message: err.message };
    }
  }

  async post(endpoint: string, body: any) {
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (err: any) {
      console.warn(`API POST ${endpoint} error:`, err.message);
      return { success: false, message: err.message };
    }
  }
}

export const api = new ApiClient();
