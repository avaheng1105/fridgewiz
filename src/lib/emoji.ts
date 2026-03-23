export function getEmoji(category: string, name: string) {
  const str = name.toLowerCase();
  
  // Specific meats
  if (str.includes('chicken') || str.includes('poultry') || str.includes('turkey')) return '🍗';
  if (str.includes('beef') || str.includes('steak') || str.includes('cow')) return '🥩';
  if (str.includes('pork') || str.includes('bacon') || str.includes('ham')) return '🥓';
  
  // Specific fruits
  if (str.includes('apple')) return '🍎';
  if (str.includes('banana')) return '🍌';
  if (str.includes('orange') || str.includes('citrus')) return '🍊';
  if (str.includes('lemon')) return '🍋';
  if (str.includes('grape')) return '🍇';
  if (str.includes('strawberry') || str.includes('berry')) return '🍓';
  if (str.includes('watermelon') || str.includes('melon')) return '🍉';
  if (str.includes('peach')) return '🍑';
  
  // Specific veggies
  if (str.includes('carrot')) return '🥕';
  if (str.includes('tomato')) return '🍅';
  if (str.includes('potato')) return '🥔';
  if (str.includes('onion')) return '🧅';
  if (str.includes('garlic')) return '🧄';
  if (str.includes('broccoli')) return '🥦';
  if (str.includes('corn')) return '🌽';
  if (str.includes('mushroom')) return '🍄';
  if (str.includes('pepper') || str.includes('capsicum')) return '🫑';

  // Dairy & More
  if (str.includes('egg')) return '🥚';
  if (str.includes('milk')) return '🥛';
  if (str.includes('cheese')) return '🧀';
  if (str.includes('butter')) return '🧈';
  if (str.includes('bread') || str.includes('toast') || str.includes('bun')) return '🍞';
  if (str.includes('cake')) return '🍰';
  if (str.includes('fish') || str.includes('salmon')) return '🐟';
  if (str.includes('shrimp') || str.includes('prawn')) return '🦐';
  if (str.includes('rice')) return '🍚';
  if (str.includes('noodle') || str.includes('pasta')) return '🍝';
  if (str.includes('water')) return '💧';
  if (str.includes('juice')) return '🧃';
  if (str.includes('coffee') || str.includes('bean')) return '☕';

  // Fallbacks if nothing matched
  if (str.includes('meat')) return '🥩';
  if (str.includes('fruit')) return '🍎';
  if (str.includes('vege')) return '🥬';
  if (str.includes('drink')) return '🥤';

  // Category fallback
  switch (category) {
    case 'Meat': return '🥩';
    case 'Produce': return '🥬';
    case 'Bakery': return '🥐';
    case 'Pantry': return '🥫';
    case 'Supermarket': return '🛒';
    default: return '🛍️';
  }
}
