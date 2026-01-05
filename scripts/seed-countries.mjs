import { drizzle } from 'drizzle-orm/mysql2';
import { countries } from '../drizzle/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

const worldCountries = [
  { name: 'China', code: 'CHN', cuisineType: 'Chinese', flagEmoji: '🇨🇳', description: 'Diverse regional cuisines with bold flavors' },
  { name: 'Japan', code: 'JPN', cuisineType: 'Japanese', flagEmoji: '🇯🇵', description: 'Refined cuisine emphasizing fresh ingredients' },
  { name: 'Korea', code: 'KOR', cuisineType: 'Korean', flagEmoji: '🇰🇷', description: 'Spicy and fermented flavors' },
  { name: 'Thailand', code: 'THA', cuisineType: 'Thai', flagEmoji: '🇹🇭', description: 'Balance of sweet, sour, salty, and spicy' },
  { name: 'Vietnam', code: 'VNM', cuisineType: 'Vietnamese', flagEmoji: '🇻🇳', description: 'Fresh herbs and light, flavorful broths' },
  { name: 'India', code: 'IND', cuisineType: 'Indian', flagEmoji: '🇮🇳', description: 'Rich spices and diverse regional styles' },
  { name: 'Italy', code: 'ITA', cuisineType: 'Italian', flagEmoji: '🇮🇹', description: 'Pasta, pizza, and Mediterranean flavors' },
  { name: 'France', code: 'FRA', cuisineType: 'French', flagEmoji: '🇫🇷', description: 'Classic techniques and refined dishes' },
  { name: 'Spain', code: 'ESP', cuisineType: 'Spanish', flagEmoji: '🇪🇸', description: 'Tapas and bold Mediterranean flavors' },
  { name: 'Mexico', code: 'MEX', cuisineType: 'Mexican', flagEmoji: '🇲🇽', description: 'Vibrant spices and corn-based dishes' },
  { name: 'USA', code: 'USA', cuisineType: 'American', flagEmoji: '🇺🇸', description: 'Diverse fusion and comfort food' },
  { name: 'Turkey', code: 'TUR', cuisineType: 'Turkish', flagEmoji: '🇹🇷', description: 'Grilled meats and Mediterranean influences' },
  { name: 'Greece', code: 'GRC', cuisineType: 'Greek', flagEmoji: '🇬🇷', description: 'Olive oil, feta, and fresh vegetables' },
  { name: 'Lebanon', code: 'LBN', cuisineType: 'Lebanese', flagEmoji: '🇱🇧', description: 'Mezze and aromatic spices' },
  { name: 'Indonesia', code: 'IDN', cuisineType: 'Indonesian', flagEmoji: '🇮🇩', description: 'Spicy and coconut-rich dishes' },
  { name: 'Malaysia', code: 'MYS', cuisineType: 'Malaysian', flagEmoji: '🇲🇾', description: 'Multicultural fusion of flavors' },
  { name: 'Singapore', code: 'SGP', cuisineType: 'Singaporean', flagEmoji: '🇸🇬', description: 'Hawker culture and diverse cuisines' },
  { name: 'Philippines', code: 'PHL', cuisineType: 'Filipino', flagEmoji: '🇵🇭', description: 'Sweet and savory combinations' },
  { name: 'Brazil', code: 'BRA', cuisineType: 'Brazilian', flagEmoji: '🇧🇷', description: 'Churrasco and tropical flavors' },
  { name: 'Argentina', code: 'ARG', cuisineType: 'Argentinian', flagEmoji: '🇦🇷', description: 'Grilled meats and empanadas' },
  { name: 'Peru', code: 'PER', cuisineType: 'Peruvian', flagEmoji: '🇵🇪', description: 'Ceviche and Andean ingredients' },
  { name: 'Morocco', code: 'MAR', cuisineType: 'Moroccan', flagEmoji: '🇲🇦', description: 'Tagines and aromatic spices' },
  { name: 'Ethiopia', code: 'ETH', cuisineType: 'Ethiopian', flagEmoji: '🇪🇹', description: 'Injera and spicy stews' },
  { name: 'UK', code: 'GBR', cuisineType: 'British', flagEmoji: '🇬🇧', description: 'Traditional pub fare and comfort food' },
  { name: 'Germany', code: 'DEU', cuisineType: 'German', flagEmoji: '🇩🇪', description: 'Sausages and hearty dishes' },
  { name: 'Russia', code: 'RUS', cuisineType: 'Russian', flagEmoji: '🇷🇺', description: 'Borscht and dumplings' },
  { name: 'Australia', code: 'AUS', cuisineType: 'Australian', flagEmoji: '🇦🇺', description: 'Modern fusion and cafe culture' },
  { name: 'Canada', code: 'CAN', cuisineType: 'Canadian', flagEmoji: '🇨🇦', description: 'Poutine and multicultural influences' },
  { name: 'Portugal', code: 'PRT', cuisineType: 'Portuguese', flagEmoji: '🇵🇹', description: 'Seafood and pastries' },
  { name: 'Netherlands', code: 'NLD', cuisineType: 'Dutch', flagEmoji: '🇳🇱', description: 'Cheese and comfort food' },
];

async function seed() {
  console.log('Seeding countries...');
  for (const country of worldCountries) {
    try {
      await db.insert(countries).values(country).onDuplicateKeyUpdate({ set: { name: country.name } });
      console.log(`✓ ${country.name}`);
    } catch (error) {
      console.error(`✗ ${country.name}:`, error.message);
    }
  }
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(console.error);
