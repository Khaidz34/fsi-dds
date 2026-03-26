import { useMemo } from 'react';
import { TranslationService } from '../services/translation';
import { Language } from '../types';

export interface TranslatedDish {
  id: number;
  name: string;
  originalName: string;
  sort_order: number;
}

export interface TranslatedMenu {
  id?: number;
  date: string;
  imageUrl: string;
  dishes: TranslatedDish[];
}

export const useTranslatedMenu = (menu: any, currentLang: Language) => {
  const translatedMenu = useMemo(() => {
    if (!menu || !menu.dishes) return menu;
    
    // If Vietnamese, return original
    if (currentLang === 'vi') return menu;
    
    // Translate dishes to target language
    const translatedDishes = menu.dishes.map((dish: any) => ({
      ...dish,
      originalName: dish.name,
      name: TranslationService.translateDish(dish.name, currentLang)
    }));
    
    return {
      ...menu,
      dishes: translatedDishes
    };
  }, [menu, currentLang]);
  
  return translatedMenu;
};