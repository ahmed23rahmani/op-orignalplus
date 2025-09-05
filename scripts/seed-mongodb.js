const connectDB = require('../lib/mongodb');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Données de test pour les produits
const sampleProducts = [
  {
    _id: 'p1',
    name: 'Sneakers Urban Classic',
    category: 'chaussures',
    price: 4500,
    originalPrice: 5500,
    description: 'Sneakers urbaines classiques, confort et style.',
    images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500'],
    colors: ['noir', 'blanc'],
    sizes: ['40', '41', '42', '43'],
    badge: 'NOUVEAU',
    rating: 4.5,
    stock: 25,
    isNew: true,
    isPromo: false,
    isActive: true
  },
  {
    _id: 'p2',
    name: 'Chaussures Derby Modernes',
    category: 'chaussures',
    price: 5800,
    originalPrice: null,
    description: 'Derby modernes, design contemporain.',
    images: ['https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500'],
    colors: ['noir', 'gris'],
    sizes: ['40', '41', '42', '43'],
    badge: '',
    rating: 4.4,
    stock: 16,
    isNew: false,
    isPromo: false,
    isActive: true
  },
  {
    _id: 'p3',
    name: 'Sacoche Homme Business',
    category: 'sacoches',
    price: 8500,
    originalPrice: null,
    description: 'Sacoche business en cuir véritable.',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500'],
    colors: ['noir', 'marron'],
    sizes: ['M', 'L'],
    badge: 'PREMIUM',
    rating: 4.7,
    stock: 15,
    isNew: false,
    isPromo: false,
    isActive: true
  },
  {
    _id: 'p4',
    name: 'Sacoche Femme Élégante',
    category: 'sacoches',
    price: 7200,
    originalPrice: null,
    description: 'Sacoche élégante, design raffiné.',
    images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500'],
    colors: ['noir', 'beige'],
    sizes: ['S', 'M'],
    badge: 'NOUVEAU',
    rating: 4.6,
    stock: 18,
    isNew: true,
    isPromo: false,
    isActive: true
  },
  {
    _id: 'p5',
    name: 'Sneakers Sport Performance',
    category: 'chaussures',
    price: 5200,
    originalPrice: 5900,
    description: 'Sneakers sport performantes.',
    images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500'],
    colors: ['bleu', 'rouge', 'noir'],
    sizes: ['40', '41', '42', '43', '44'],
    badge: 'PROMO',
    rating: 4.3,
    stock: 20,
    isNew: false,
    isPromo: true,
    isActive: true
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Début du seeding MongoDB Atlas...');
    
    // Connexion à MongoDB
    await connectDB();
    
    // Nettoyer les collections existantes
    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log('🧹 Collections nettoyées');
    
    // Insérer les produits
    await Product.insertMany(sampleProducts);
    console.log(`✅ ${sampleProducts.length} produits insérés`);
    
    console.log('🎉 Seeding terminé avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  }
}

// Exécuter le seeding
seedDatabase();
