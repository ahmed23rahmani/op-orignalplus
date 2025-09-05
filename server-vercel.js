const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./lib/mongodb');
const Product = require('./models/Product');
const Order = require('./models/Order');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Configuration CORS pour Vercel
app.use(cors({
  origin: [
    'https://full-op.vercel.app',
    'https://*.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  credentials: true
}));

// Augmenter la limite de taille des requêtes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connexion à MongoDB Atlas
connectDB().catch((error) => {
  console.error('❌ Erreur de connexion MongoDB:', error.message);
  console.log('🔄 Utilisation des données de fallback...');
});

// Données en mémoire pour les catégories (statiques)
let categories = [
  { _id: '1', name: 'chaussures', description: 'Chaussures de qualité' },
  { _id: '2', name: 'sacoches', description: 'Sacoches élégantes' }
];

// Base fixe de 5 produits en production pour stabilité globale
const FIXED_PRODUCTS = [
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

if (IS_PROD) {
  products = [...FIXED_PRODUCTS];
}

// Utilitaires: dédoublonnage et plafonnement à 50 produits
function dedupeAndCapProducts(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];
  for (const product of list) {
    const id = product && product._id ? product._id : JSON.stringify(product);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(product);
    if (result.length >= 50) break;
  }
  return result;
}

// Routes API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur Vercel opérationnel' });
});

// Produits - Récupération depuis MongoDB ou fallback
app.get('/api/products', async (req, res) => {
  try {
    // Essayer MongoDB d'abord
    if (mongoose.connection.readyState === 1) {
      const activeProducts = await Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(50);
      return res.json({ success: true, data: activeProducts });
    }
    
    // Fallback vers les données fixes
    console.log('🔄 Utilisation des données de fallback pour les produits');
    const activeProducts = FIXED_PRODUCTS.filter(p => p.isActive).slice(0, 50);
    res.json({ success: true, data: activeProducts });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    // Fallback en cas d'erreur
    const activeProducts = FIXED_PRODUCTS.filter(p => p.isActive).slice(0, 50);
    res.json({ success: true, data: activeProducts });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    if (IS_PROD) return res.status(403).json({ success: false, error: 'Ecriture désactivée en production' });
    
    const newProduct = new Product({
      _id: Date.now().toString(),
      ...req.body
    });
    
    const savedProduct = await newProduct.save();
    res.json({ success: true, data: savedProduct });
  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    if (IS_PROD) return res.status(403).json({ success: false, error: 'Ecriture désactivée en production' });
    
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!updatedProduct) {
      return res.status(404).json({ success: false, error: 'Produit non trouvé' });
    }
    
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    if (IS_PROD) return res.status(403).json({ success: false, error: 'Ecriture désactivée en production' });
    
    const deletedProduct = await Product.findOneAndDelete({ _id: req.params.id });
    
    if (!deletedProduct) {
      return res.status(404).json({ success: false, error: 'Produit non trouvé' });
    }
    
    res.json({ success: true, data: deletedProduct });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Commandes - Récupération depuis MongoDB ou fallback
app.get('/api/orders', async (req, res) => {
  try {
    // Essayer MongoDB d'abord
    if (mongoose.connection.readyState === 1) {
      const allOrders = await Order.find().sort({ createdAt: -1 });
      return res.json({ success: true, data: allOrders });
    }
    
    // Fallback vers les données en mémoire
    console.log('🔄 Utilisation des données de fallback pour les commandes');
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.json({ success: true, data: [] });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      res.json({ success: true, data: order });
    } else {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const newOrder = new Order({
      _id: Date.now().toString(),
      ...req.body,
      status: 'pending'
    });
    
    const savedOrder = await newOrder.save();
    res.json({ success: true, data: savedOrder });
  } catch (error) {
    console.error('Erreur lors de la création de la commande:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: req.params.id },
      { status: req.body.status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!updatedOrder) {
      return res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }
    
    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const deletedOrder = await Order.findOneAndDelete({ _id: req.params.id });
    
    if (!deletedOrder) {
      return res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }
    
    res.json({ success: true, data: deletedOrder });
  } catch (error) {
    console.error('Erreur lors de la suppression de la commande:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Catégories
app.get('/api/categories', (req, res) => {
  res.json({ success: true, data: categories });
});

app.post('/api/categories', (req, res) => {
  try {
    const newCategory = {
      _id: Date.now().toString(),
      ...req.body,
      createdAt: new Date()
    };
    categories.push(newCategory);
    res.json({ success: true, data: newCategory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/categories/:id', (req, res) => {
  try {
    const index = categories.findIndex(c => c._id === req.params.id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...req.body, updatedAt: new Date() };
      res.json({ success: true, data: categories[index] });
    } else {
      res.status(404).json({ success: false, error: 'Catégorie non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    const index = categories.findIndex(c => c._id === req.params.id);
    if (index !== -1) {
      const deletedCategory = categories.splice(index, 1)[0];
      res.json({ success: true, data: deletedCategory });
    } else {
      res.status(404).json({ success: false, error: 'Catégorie non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Statistiques admin - Récupération depuis MongoDB ou fallback
app.get('/api/admin/stats', async (req, res) => {
  try {
    // Essayer MongoDB d'abord
    if (mongoose.connection.readyState === 1) {
      const [totalProducts, totalOrders, ordersByStatus] = await Promise.all([
        Product.countDocuments({ isActive: true }),
        Order.countDocuments(),
        Order.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      const statusCounts = ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      const stats = {
        totalProducts,
        totalOrders,
        totalCategories: categories.length,
        ordersByStatus: {
          pending: statusCounts.pending || 0,
          confirmed: statusCounts.confirmed || 0,
          shipped: statusCounts.shipped || 0,
          delivered: statusCounts.delivered || 0
        }
      };
      
      return res.json({ success: true, data: stats });
    }
    
    // Fallback vers les données fixes
    console.log('🔄 Utilisation des données de fallback pour les statistiques');
    const stats = {
      totalProducts: FIXED_PRODUCTS.filter(p => p.isActive).length,
      totalOrders: 0,
      totalCategories: categories.length,
      ordersByStatus: {
        pending: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0
      }
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    // Fallback en cas d'erreur
    const stats = {
      totalProducts: FIXED_PRODUCTS.filter(p => p.isActive).length,
      totalOrders: 0,
      totalCategories: categories.length,
      ordersByStatus: {
        pending: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0
      }
    };
    res.json({ success: true, data: stats });
  }
});

// Export des commandes - Récupération depuis MongoDB
app.get('/api/admin/export/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    const csvData = orders.map(order => {
      return `${order._id},${order.customer?.name || ''},${order.customer?.email || ''},${order.customer?.phone || ''},${order.total},${order.status},${order.createdAt}`;
    }).join('\n');
    
    const csvHeader = 'ID,Prénom,Nom,Téléphone,Total,Statut,Date\n';
    const fullCsv = csvHeader + csvData;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=commandes.csv');
    res.send(fullCsv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route par défaut pour Vercel
app.get('/', (req, res) => {
  res.json({ 
    message: 'API ORIGINALE PLUS - Serveur Vercel',
    status: 'Opérationnel',
    endpoints: [
      '/api/products',
      '/api/orders', 
      '/api/categories',
      '/api/admin/stats'
    ]
  });
});

// Démarrer le serveur
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur Vercel démarré sur http://localhost:${PORT}`);
    console.log(`📦 Produits chargés: ${products.length}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
  });
}

// Export pour Vercel
module.exports = app;
