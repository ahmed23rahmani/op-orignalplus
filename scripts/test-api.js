const https = require('https');

const API_BASE = 'https://op-orignalplus.vercel.app/api';

// Données de test pour les produits
const testProducts = [
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

// Fonction pour faire des requêtes HTTPS
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test de l'API
async function testAPI() {
  try {
    console.log('🧪 Test de l\'API Vercel...');
    
    // Test de santé
    console.log('1. Test de santé...');
    const health = await makeRequest(`${API_BASE}/health`);
    console.log('✅ Santé:', health.data);

    // Vérifier les produits existants
    console.log('2. Vérification des produits existants...');
    const products = await makeRequest(`${API_BASE}/products`);
    console.log(`📦 Produits existants: ${products.data.data?.length || 0}`);

    // Vérifier les commandes existantes
    console.log('3. Vérification des commandes existantes...');
    const orders = await makeRequest(`${API_BASE}/orders`);
    console.log(`📋 Commandes existantes: ${orders.data.data?.length || 0}`);

    // Vérifier les statistiques
    console.log('4. Vérification des statistiques...');
    const stats = await makeRequest(`${API_BASE}/admin/stats`);
    console.log('📊 Statistiques:', stats.data.data);

    console.log('\n🎉 Test terminé!');
    console.log('💡 Si les produits sont à 0, vérifiez que MONGODB_URI est configurée dans Vercel');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testAPI();
