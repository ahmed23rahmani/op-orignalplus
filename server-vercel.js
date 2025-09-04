const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Données en mémoire (comme server-test-local.js)
let products = [];

let orders = [];
let categories = [
  { _id: '1', name: 'chaussures', description: 'Chaussures de qualité' },
  { _id: '2', name: 'sacoches', description: 'Sacoches élégantes' }
];

// Routes API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur Vercel opérationnel' });
});

// Produits
app.get('/api/products', (req, res) => {
  res.json({ success: true, data: products });
});

app.post('/api/products', (req, res) => {
  try {
    const newProduct = {
      _id: Date.now().toString(),
      ...req.body,
      createdAt: new Date()
    };
    products.push(newProduct);
    res.json({ success: true, data: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const index = products.findIndex(p => p._id === req.params.id);
    if (index !== -1) {
      products[index] = { ...products[index], ...req.body, updatedAt: new Date() };
      res.json({ success: true, data: products[index] });
    } else {
      res.status(404).json({ success: false, error: 'Produit non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const index = products.findIndex(p => p._id === req.params.id);
    if (index !== -1) {
      const deletedProduct = products.splice(index, 1)[0];
      res.json({ success: true, data: deletedProduct });
    } else {
      res.status(404).json({ success: false, error: 'Produit non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Commandes
app.get('/api/orders', (req, res) => {
  res.json({ success: true, data: orders });
});

app.get('/api/orders/:id', (req, res) => {
  try {
    const order = orders.find(o => o._id === req.params.id);
    if (order) {
      res.json({ success: true, data: order });
    } else {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const newOrder = {
      _id: Date.now().toString(),
      ...req.body,
      status: 'pending',
      createdAt: new Date()
    };
    orders.push(newOrder);
    res.json({ success: true, data: newOrder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/orders/:id/status', (req, res) => {
  try {
    const order = orders.find(o => o._id === req.params.id);
    if (order) {
      order.status = req.body.status;
      order.updatedAt = new Date();
      res.json({ success: true, data: order });
    } else {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/orders/:id', (req, res) => {
  try {
    const index = orders.findIndex(o => o._id === req.params.id);
    if (index !== -1) {
      const deletedOrder = orders.splice(index, 1)[0];
      res.json({ success: true, data: deletedOrder });
    } else {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }
  } catch (error) {
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

// Statistiques admin
app.get('/api/admin/stats', (req, res) => {
  try {
    const stats = {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalCategories: categories.length,
      ordersByStatus: {
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length
      }
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export des commandes
app.get('/api/admin/export/orders', (req, res) => {
  try {
    const csvData = orders.map(order => {
      return `${order._id},${order.customer?.firstName || ''},${order.customer?.lastName || ''},${order.customer?.phone || ''},${order.total},${order.status},${order.createdAt}`;
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
