/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'employee' | 'kitchen' | 'admin';

export type Language = 'vi' | 'en' | 'ja';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  debt: number;
  paid: number;
  walletBalance: number;
}

export interface MenuItem {
  id: string;
  name: {
    vi: string;
    en: string;
    ja: string;
  };
  description: {
    vi: string;
    en: string;
    ja: string;
  };
  price: number;
  category: 'main' | 'side' | 'drink' | 'dessert';
  image: string;
  available: boolean;
  tags: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  itemIds: string[];
  itemNames: string[];
  orderDate: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  notes: {
    moreRice: boolean;
    lessRice: boolean;
    moreSoup: boolean;
    moreChopsticks: boolean;
    moreChili: boolean;
    customNote: string;
  };
  price: number;
}
