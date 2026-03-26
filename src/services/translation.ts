/**
 * Translation Service for Menu Items
 * Translates Vietnamese dish names to English and Japanese
 */

// Common Vietnamese food terms and their translations
const FOOD_TRANSLATIONS = {
  // Proteins
  'thịt': { en: 'meat', ja: '肉' },
  'thịt bò': { en: 'beef', ja: '牛肉' },
  'thịt heo': { en: 'pork', ja: '豚肉' },
  'thịt gà': { en: 'chicken', ja: '鶏肉' },
  'gà': { en: 'chicken', ja: '鶏' },
  'cá': { en: 'fish', ja: '魚' },
  'tôm': { en: 'shrimp', ja: 'エビ' },
  'mực': { en: 'squid', ja: 'イカ' },
  'đậu phụ': { en: 'tofu', ja: '豆腐' },
  'trứng': { en: 'egg', ja: '卵' },
  
  // Cooking methods
  'chiên': { en: 'fried', ja: '揚げ' },
  'nướng': { en: 'grilled', ja: '焼き' },
  'luộc': { en: 'boiled', ja: '茹で' },
  'xào': { en: 'stir-fried', ja: '炒め' },
  'nấu': { en: 'cooked', ja: '煮' },
  'rang': { en: 'roasted', ja: 'ロースト' },
  'hấp': { en: 'steamed', ja: '蒸し' },
  'kho': { en: 'braised', ja: '煮込み' },
  
  // Vegetables
  'cà chua': { en: 'tomato', ja: 'トマト' },
  'hành': { en: 'onion', ja: '玉ねぎ' },
  'tỏi': { en: 'garlic', ja: 'ニンニク' },
  'ớt': { en: 'chili', ja: '唐辛子' },
  'rau': { en: 'vegetables', ja: '野菜' },
  'cải': { en: 'cabbage', ja: 'キャベツ' },
  'măng': { en: 'bamboo shoots', ja: 'タケノコ' },
  'nấm': { en: 'mushroom', ja: 'キノコ' },
  
  // Sauces and seasonings
  'sốt': { en: 'sauce', ja: 'ソース' },
  'nước mắm': { en: 'fish sauce', ja: 'ヌクマム' },
  'tương': { en: 'soy sauce', ja: '醤油' },
  'muối': { en: 'salt', ja: '塩' },
  'tiêu': { en: 'pepper', ja: 'コショウ' },
  'đường': { en: 'sugar', ja: '砂糖' },
  
  // Common dishes
  'canh': { en: 'soup', ja: 'スープ' },
  'cơm': { en: 'rice', ja: 'ご飯' },
  'phở': { en: 'pho', ja: 'フォー' },
  'bún': { en: 'vermicelli', ja: 'ブン' },
  'nem': { en: 'spring roll', ja: '春巻き' },
  'chả': { en: 'pork roll', ja: 'チャー' },
  'bánh': { en: 'cake/bread', ja: 'バイン' },
  
  // Adjectives
  'chua': { en: 'sour', ja: '酸っぱい' },
  'ngọt': { en: 'sweet', ja: '甘い' },
  'cay': { en: 'spicy', ja: '辛い' },
  'mặn': { en: 'salty', ja: '塩辛い' },
  'đắng': { en: 'bitter', ja: '苦い' },
  'thơm': { en: 'fragrant', ja: '香り' },
  
  // Numbers
  '1': { en: '1', ja: '1' },
  '2': { en: '2', ja: '2' },
  '3': { en: '3', ja: '3' },
  '4': { en: '4', ja: '4' },
  '5': { en: '5', ja: '5' },
  '6': { en: '6', ja: '6' },
  '7': { en: '7', ja: '7' },
  '8': { en: '8', ja: '8' },
  '9': { en: '9', ja: '9' },
  '10': { en: '10', ja: '10' }
};

// Specific dish translations for common Vietnamese dishes
const DISH_TRANSLATIONS = {
  'cá trắm sốt cà chua': {
    en: 'Carp in Tomato Sauce',
    ja: 'コイのトマトソース煮'
  },
  'đậu phụ chiên sốt cà chua': {
    en: 'Fried Tofu in Tomato Sauce', 
    ja: '豆腐の揚げトマトソース'
  },
  'đậu phụ chiên sốt cà chua thịt': {
    en: 'Fried Tofu with Meat in Tomato Sauce',
    ja: '豆腐と肉の揚げトマトソース'
  },
  'thịt viên nấm sốt cà chua': {
    en: 'Meatballs with Mushroom in Tomato Sauce',
    ja: 'ミートボールとキノコのトマトソース'
  },
  'gà rang muối': {
    en: 'Salt-Roasted Chicken',
    ja: '鶏の塩焼き'
  },
  'nem hải sản': {
    en: 'Seafood Spring Rolls',
    ja: 'シーフード春巻き'
  },
  'thịt kho tàu': {
    en: 'Braised Pork Belly',
    ja: '豚バラ肉の煮込み'
  },
  'cá kho tộ': {
    en: 'Braised Fish in Clay Pot',
    ja: '土鍋煮魚'
  },
  'canh chua cá': {
    en: 'Sour Fish Soup',
    ja: '魚の酸っぱいスープ'
  },
  'thịt nướng': {
    en: 'Grilled Pork',
    ja: '焼き豚'
  },
  'gà nướng': {
    en: 'Grilled Chicken',
    ja: '焼き鶏'
  },
  'cơm tấm': {
    en: 'Broken Rice',
    ja: 'ブロークンライス'
  }
};

export class TranslationService {
  /**
   * Translate a Vietnamese dish name to target language
   */
  static translateDish(vietnameseName: string, targetLang: 'en' | 'ja'): string {
    if (!vietnameseName) return '';
    
    const cleanName = vietnameseName.toLowerCase().trim();
    
    // Check for exact dish match first
    if (DISH_TRANSLATIONS[cleanName]) {
      return DISH_TRANSLATIONS[cleanName][targetLang];
    }
    
    // Try word-by-word translation
    return this.translateByWords(vietnameseName, targetLang);
  }
  
  /**
   * Translate by breaking down into words
   */
  private static translateByWords(text: string, targetLang: 'en' | 'ja'): string {
    const words = text.toLowerCase().split(/[\s\-\.]+/);
    const translatedWords: string[] = [];
    
    for (const word of words) {
      // Skip numbers at the beginning (like "1.", "2.")
      if (/^\d+\.?$/.test(word)) {
        continue;
      }
      
      // Look for translation
      if (FOOD_TRANSLATIONS[word]) {
        translatedWords.push(FOOD_TRANSLATIONS[word][targetLang]);
      } else {
        // Keep original word if no translation found
        translatedWords.push(word);
      }
    }
    
    return translatedWords.join(' ').trim() || text;
  }
  
  /**
   * Add new translation to the dictionary
   */
  static addTranslation(vietnamese: string, english: string, japanese: string) {
    FOOD_TRANSLATIONS[vietnamese.toLowerCase()] = {
      en: english,
      ja: japanese
    };
  }
  
  /**
   * Add specific dish translation
   */
  static addDishTranslation(vietnamese: string, english: string, japanese: string) {
    DISH_TRANSLATIONS[vietnamese.toLowerCase()] = {
      en: english,
      ja: japanese
    };
  }
}