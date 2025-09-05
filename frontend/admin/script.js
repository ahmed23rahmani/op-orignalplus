// Configuration API
        const API_BASE_URL = (window.location.hostname === 'localhost')
            ? 'http://localhost:3000/api'
            : `${window.location.origin}/api`;

        // Fonctions API
        async function apiRequest(endpoint, options = {}) {
            try {
                console.log(`🌐 Appel API Admin: ${API_BASE_URL}${endpoint}`);
                
                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    method: options.method || 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...options.headers
                    },
                    mode: 'cors',
                    credentials: 'omit',
                    ...options
                });
                
                console.log(`📊 Réponse API Admin: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Erreur API Admin:', errorText);
                    throw new Error(`Erreur API: ${response.status} - ${errorText}`);
                }
                
                const data = await response.json();
                console.log('✅ Données reçues Admin:', data);
                return data;
            } catch (error) {
                console.error('❌ Erreur API Admin:', error);
                showToast(`Erreur de connexion: ${error.message}`, 'error');
                throw error;
            }
        }

        // Variables globales
        let products = [];
        let orders = [];
        let categories = [];
        let currentEditingProduct = null;
        let currentEditingCategory = null;

        // Backup produits admin (persistance locale)
        const ADMIN_PRODUCTS_BACKUP_KEY = 'adminProductsBackup';
        const ADMIN_ORDERS_BACKUP_KEY = 'adminOrdersBackup';

        function saveAdminProductsBackup(list) {
            try {
                if (Array.isArray(list)) {
                    localStorage.setItem(ADMIN_PRODUCTS_BACKUP_KEY, JSON.stringify(list));
                }
            } catch (e) {
                console.warn('Impossible de sauvegarder le backup produits:', e);
            }
        }

        function loadAdminProductsBackup() {
            try {
                const raw = localStorage.getItem(ADMIN_PRODUCTS_BACKUP_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                console.warn('Impossible de charger le backup produits:', e);
                return [];
            }
        }

        function saveAdminOrdersBackup(list) {
            try {
                if (Array.isArray(list)) {
                    localStorage.setItem(ADMIN_ORDERS_BACKUP_KEY, JSON.stringify(list));
                }
            } catch (e) {
                console.warn('Impossible de sauvegarder le backup commandes:', e);
            }
        }

        function loadAdminOrdersBackup() {
            try {
                const raw = localStorage.getItem(ADMIN_ORDERS_BACKUP_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                console.warn('Impossible de charger le backup commandes:', e);
                return [];
            }
        }

        // Initialisation
        document.addEventListener('DOMContentLoaded', async function() {
            await initializeAdmin();
            loadDashboard();
            setupNavigation();

            // Auto-refresh périodique commandes et stats
            setInterval(async () => {
                try {
                    await loadOrdersFromAPI();
                    await updateStats();
                    loadRecentOrders();
                    if (document.getElementById('orders-page') && !document.getElementById('orders-page').classList.contains('hidden')) {
                        loadOrders();
                    }
                } catch (e) {
                    // ignorer erreurs ponctuelles
                }
            }, 10000); // 10s
        });

        async function initializeAdmin() {
            try {
                // Charger les données depuis l'API
                await Promise.all([
                    loadProductsFromAPI(),
                    loadOrdersFromAPI(),
                    loadCategoriesFromAPI()
                ]);

                // Re-seed produits si API vide
                if (!products || products.length === 0) {
                    const backup = loadAdminProductsBackup();
                    if (backup && backup.length > 0) {
                        try {
                            await Promise.all(
                                backup.map(p => apiRequest('/products', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        name: p.name,
                                        category: p.category,
                                        price: p.price,
                                        originalPrice: p.originalPrice || null,
                                        description: p.description || '',
                                        colors: p.colors || [],
                                        sizes: p.sizes || [],
                                        badge: p.badge || '',
                                        rating: p.rating || null,
                                        images: p.images || [],
                                        stock: typeof p.stock === 'number' ? p.stock : 100,
                                        isNew: !!p.isNew,
                                        isPromo: !!p.isPromo,
                                        isActive: true
                                    })
                                }))
                            );
                            await loadProductsFromAPI();
                        } catch (seedErr) {
                            console.warn('Re-seed depuis backup produits échoué:', seedErr);
                        }
                    }
                }

                // Re-seed commandes si API vide
                if (!orders || orders.length === 0) {
                    const ordersBackup = loadAdminOrdersBackup();
                    if (ordersBackup && ordersBackup.length > 0) {
                        try {
                            // Recréer seulement les plus récentes pour limiter
                            const toRestore = ordersBackup.slice(-50);
                            for (const o of toRestore) {
                                await apiRequest('/orders', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        customer: o.customer || {},
                                        items: o.items || o.products || [],
                                        delivery: o.delivery || 'standard',
                                        payment: o.payment || 'cod',
                                        notes: o.notes || '',
                                        subtotal: o.subtotal || 0,
                                        deliveryFee: o.deliveryFee || 0,
                                        total: o.total || 0
                                    })
                                });
                            }
                            await loadOrdersFromAPI();
                        } catch (seedErr) {
                            console.warn('Re-seed depuis backup commandes échoué:', seedErr);
                        }
                    }
                }

                // Sauvegarder backups
                if (products && products.length > 0) saveAdminProductsBackup(products);
                if (orders && orders.length > 0) saveAdminOrdersBackup(orders);
            } catch (error) {
                console.error('Erreur lors de l\'initialisation:', error);
                showToast('Erreur lors du chargement des données', 'error');
            }
        }

        // Charger les produits depuis l'API
        async function loadProductsFromAPI() {
            try {
                const response = await apiRequest('/products');
                const raw = response.data || response;
                // Dédupliquer par _id pour stabilité de l'inventaire à l'affichage admin
                if (Array.isArray(raw)) {
                    const seen = new Set();
                    products = raw.filter(p => {
                        const id = p && p._id ? p._id : JSON.stringify(p);
                        if (seen.has(id)) return false;
                        seen.add(id);
                        return true;
                    });
                } else {
                    products = [];
                }
                // Mettre à jour le backup local
                if (Array.isArray(products) && products.length > 0) {
                    saveAdminProductsBackup(products);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des produits:', error);
                products = [];
            }
        }

        // Charger les commandes depuis l'API
        async function loadOrdersFromAPI() {
            try {
                const response = await apiRequest('/orders');
                orders = response.data || response;
                // Sauvegarder backup
                if (Array.isArray(orders) && orders.length > 0) {
                    saveAdminOrdersBackup(orders);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des commandes:', error);
                orders = [];
            }
        }

        // Charger les catégories depuis l'API
        async function loadCategoriesFromAPI() {
            try {
                const response = await apiRequest('/categories');
                categories = response.data || response;
            } catch (error) {
                console.error('Erreur lors du chargement des catégories:', error);
                categories = [];
            }
        }

        // Navigation
        function setupNavigation() {
            document.querySelectorAll('.menu-item').forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    const page = this.dataset.page;
                    showPage(page);
                    
                    // Update active menu item
                    document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        }

        function showPage(pageId) {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
            
            // Show selected page
            document.getElementById(pageId + '-page').classList.remove('hidden');
            
            // Load page content
            switch(pageId) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'products':
                    loadProducts();
                    break;
                case 'orders':
                    loadOrders();
                    break;
                        case 'categories':
            loadCategories();
            break;
            }
        }

        // Dashboard Functions
        async function loadDashboard() {
            await updateStats();
            loadRecentOrders();
        }

        async function updateStats() {
            try {
                const statsResponse = await apiRequest('/admin/stats');
                const stats = statsResponse.data || statsResponse;
                
                document.getElementById('total-products').textContent = stats.totalProducts || products.length;
                document.getElementById('total-orders').textContent = stats.totalOrders || orders.length;
                document.getElementById('total-revenue').textContent = (stats.totalRevenue || 0).toLocaleString() + ' DA';
                document.getElementById('pending-orders').textContent = stats.pendingOrders || 0;
            } catch (error) {
                console.error('Erreur lors du chargement des statistiques:', error);
                // Fallback aux données locales
            document.getElementById('total-products').textContent = products.length;
            document.getElementById('total-orders').textContent = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
            document.getElementById('total-revenue').textContent = totalRevenue.toLocaleString() + ' DA';
            const pendingOrders = orders.filter(order => order.status === 'pending').length;
            document.getElementById('pending-orders').textContent = pendingOrders;
            }
        }

        function loadRecentOrders() {
            const recentOrders = orders.slice(-5).reverse();
            const tbody = document.getElementById('recent-orders');
            
            if (recentOrders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-light);">
                            Aucune commande trouvée
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = recentOrders.map(order => `
                <tr>
                    <td>#${order.orderNumber || order._id}</td>
                    <td>${order.customer.firstName} ${order.customer.lastName}</td>
                    <td>${new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>${order.total.toLocaleString()} DA</td>
                    <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewOrder('${order._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // Products Functions
        function loadProducts() {
            const grid = document.getElementById('products-grid');
            
            if (products.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-light);">
                        <i class="fas fa-box" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <p>Aucun produit trouvé</p>
                        <button class="btn btn-primary" onclick="openProductModal()" style="margin-top: 1rem;">
                            <i class="fas fa-plus"></i> Ajouter le premier produit
                        </button>
                    </div>
                `;
                return;
            }
            
            grid.innerHTML = products.map(product => `
                <div class="product-card">
                    <div class="product-image">
                        ${product.images && product.images.length > 0 ? 
                            `<img src="${product.images[0]}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
                            `<i class="fas fa-image"></i>`
                        }
                    </div>
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-price">
                            ${product.originalPrice ? `<span style="text-decoration: line-through; color: #999; font-size: 1rem;">${product.originalPrice} DA</span> ` : ''}
                            ${product.price} DA
                        </div>
                        <p style="color: var(--text-light); margin-bottom: 1rem; font-size: 0.9rem;">
                            Catégorie: ${product.category} | Stock: ${product.stock || 'En stock'}
                        </p>
                        <div class="product-actions">
                            <button class="btn btn-sm btn-primary" onclick="editProduct('${product._id}')">
                                <i class="fas fa-edit"></i> Modifier
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product._id}')">
                                <i class="fas fa-trash"></i> Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Product Modal Functions
        function openProductModal(productId = null) {
            const modal = document.getElementById('product-modal');
            const form = document.getElementById('product-form');
            const title = document.getElementById('modal-title');
            
            if (productId) {
                const product = products.find(p => p._id === productId);
                if (product) {
                    title.textContent = 'Modifier Produit';
                    fillProductForm(product);
                    currentEditingProduct = product._id;
                }
            } else {
                title.textContent = 'Ajouter Produit';
                form.reset();
                document.getElementById('image-preview').innerHTML = '';
                currentEditingProduct = null;
            }
            
            modal.style.display = 'block';
        }

        function closeProductModal() {
            document.getElementById('product-modal').style.display = 'none';
            currentEditingProduct = null;
            
            // Nettoyer le formulaire et les images
            document.getElementById('product-form').reset();
            document.getElementById('image-preview').innerHTML = '';
        }

        function fillProductForm(product) {
            document.getElementById('product-id').value = product._id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-original-price').value = product.originalPrice || '';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-colors').value = product.colors || '';
            document.getElementById('product-sizes').value = product.sizes || '';
            document.getElementById('product-badge').value = product.badge || '';
            document.getElementById('product-rating').value = product.rating || '';
            document.getElementById('product-stock').value = product.stock || 100;
            
            // Display existing images
            const preview = document.getElementById('image-preview');
            if (product.images && product.images.length > 0) {
                preview.innerHTML = product.images.map((img, index) => `
                    <div class="preview-item">
                        <img src="${img}" alt="Product image">
                        <button type="button" class="preview-remove" onclick="removeExistingImage(${index})">&times;</button>
                    </div>
                `).join('');
            }
        }

        function editProduct(productId) {
            openProductModal(productId);
        }

        async function deleteProduct(productId) {
            if (confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
                try {
                    await apiRequest(`/products/${productId}`, {
                        method: 'DELETE'
                    });
                    
                    products = products.filter(p => p._id !== productId);
                    // Mettre à jour l'UI et le backup
                    loadProducts();
                    updateStats();
                    saveAdminProductsBackup(products);
                    showToast('Produit supprimé avec succès!', 'success');
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    showToast('Erreur lors de la suppression du produit', 'error');
                }
            }
        }

        // File Upload Handler
        document.getElementById('product-images').addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const preview = document.getElementById('image-preview');
            
            // Limiter le nombre d'images
            if (files.length > 5) {
                showToast('⚠️ Maximum 5 images autorisées', 'warning');
                return;
            }
            
            files.forEach((file, index) => {
                if (file.type.startsWith('image/')) {
                    // Vérifier la taille du fichier (max 2MB)
                    if (file.size > 2 * 1024 * 1024) {
                        showToast(`⚠️ Image ${file.name} trop volumineuse (max 2MB)`, 'warning');
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const previewItem = document.createElement('div');
                        previewItem.className = 'preview-item';
                        previewItem.innerHTML = `
                            <img src="${e.target.result}" alt="Preview">
                            <button type="button" class="preview-remove" onclick="removePreviewImage(this)">&times;</button>
                        `;
                        preview.appendChild(previewItem);
                    };
                    reader.readAsDataURL(file);
                } else {
                    showToast(`⚠️ ${file.name} n'est pas une image valide`, 'warning');
                }
            });
        });

        function removePreviewImage(button) {
            button.parentElement.remove();
        }

        function removeExistingImage(index) {
            if (currentEditingProduct) {
                const product = products.find(p => p._id === currentEditingProduct);
                if (product && product.images) {
                    product.images.splice(index, 1);
                    fillProductForm(product);
                }
            }
        }

        // Product Form Submit
        document.getElementById('product-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const imageElements = document.querySelectorAll('#image-preview img');
            
            // Récupérer toutes les images du preview
            const images = Array.from(imageElements).map(img => {
                const src = img.src;
                return src;
            });
            
            console.log('📸 Images à sauvegarder:', images);
            
            const productData = {
                name: formData.get('name'),
                category: formData.get('category'),
                price: parseInt(formData.get('price')),
                originalPrice: formData.get('originalPrice') ? parseInt(formData.get('originalPrice')) : null,
                description: formData.get('description'),
                colors: formData.get('colors') ? formData.get('colors').split(',').map(c => c.trim()) : [],
                sizes: formData.get('sizes') ? formData.get('sizes').split(',').map(s => s.trim()) : [],
                badge: formData.get('badge'),
                rating: formData.get('rating') ? parseFloat(formData.get('rating')) : null,
                images: images,
                stock: parseInt(formData.get('stock')) || 100,
                isNew: formData.get('badge') === 'NOUVEAU',
                isPromo: formData.get('badge') === 'PROMO',
                isActive: true
            };
            
            try {
            if (currentEditingProduct) {
                // Update existing product
                    const response = await apiRequest(`/products/${currentEditingProduct}`, {
                        method: 'PUT',
                        body: JSON.stringify(productData)
                    });
                    
                    if (response.success) {
                    const index = products.findIndex(p => p._id === currentEditingProduct);
                if (index !== -1) {
                    products[index] = { ...products[index], ...productData };
                }
                        showToast('✅ Produit modifié avec succès!', 'success');
                    } else {
                        throw new Error(response.error || 'Erreur lors de la modification');
                    }
            } else {
                // Add new product
                    const response = await apiRequest('/products', {
                        method: 'POST',
                        body: JSON.stringify(productData)
                    });
                    
                    if (response.success && response.data) {
                        const newProduct = response.data;
                    products.push(newProduct);
                        showToast('✅ Produit ajouté avec succès!', 'success');
                        console.log('🆕 Nouveau produit ajouté:', newProduct);
                    } else {
                        throw new Error(response.error || 'Erreur lors de l\'ajout');
                    }
            }
            
            // Mettre à jour backup après ajout/modif
            saveAdminProductsBackup(products);
            
            closeProductModal();
            loadProducts();
            updateStats();
                
            } catch (error) {
                console.error('❌ Erreur lors de la sauvegarde:', error);
                showToast(`❌ Erreur: ${error.message}`, 'error');
            }
        });

        // Orders Functions
        function loadOrders() {
            const tbody = document.getElementById('all-orders');
            
            if (orders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-light);">
                            Aucune commande trouvée
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = orders.map(order => {
                const id = order.orderNumber || order._id || '';
                const customerFirst = order.customer?.firstName || '';
                const customerLast = order.customer?.lastName || '';
                const phone = order.customer?.phone || '';
                const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
                const total = (order.total ?? order.subtotal ?? 0);
                const status = order.status || 'pending';
                return `
                <tr>
                    <td>#${id}</td>
                    <td>${customerFirst} ${customerLast}</td>
                    <td>${phone}</td>
                    <td>${createdAt.toLocaleDateString('fr-FR')}</td>
                    <td>${Number(total).toLocaleString()} DA</td>
                    <td>
                        <select onchange="updateOrderStatus('${order._id}', this.value)" class="form-control" style="padding: 0.25rem; font-size: 0.8rem;">
                            <option value="pending" ${status === 'pending' ? 'selected' : ''}>En attente</option>
                            <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>Confirmée</option>
                            <option value="shipped" ${status === 'shipped' ? 'selected' : ''}>Expédiée</option>
                            <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>Livrée</option>
                            <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Annulée</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewOrder('${order._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            }).join('');
        }

        async function viewOrder(orderId) {
            try {
                console.log('🔍 Consultation de la commande:', orderId);
                
                const response = await apiRequest(`/orders/${orderId}`);
                const order = response.data || response;
            
                if (!order) {
                    throw new Error('Commande non trouvée');
                }
                
                console.log('📋 Détails de la commande:', order);
            
            const modal = document.getElementById('order-modal');
            const content = document.getElementById('order-details');
                
                if (!modal || !content) {
                    throw new Error('Modal non trouvé');
                }

            const cust = order.customer || {};
            const items = (order.products || order.items || []).map(item => ({
                name: item?.name || 'Produit',
                color: item?.color || 'Standard',
                size: item?.size || 'Unique',
                quantity: item?.quantity || 1,
                price: Number(item?.price || 0)
            }));
            
            content.innerHTML = `
                <div style="margin-bottom: 2rem;">
                        <h3>Commande #${order.orderNumber || order._id || ''}</h3>
                        <p style="color: var(--text-light);">${order.createdAt ? `Passée le ${new Date(order.createdAt).toLocaleDateString('fr-FR')} à ${new Date(order.createdAt).toLocaleTimeString('fr-FR')}` : ''}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 10px;">
                        <h4 style="margin-bottom: 1rem; color: var(--primary);">Informations Client</h4>
                        <p><strong>Nom:</strong> ${[cust.firstName, cust.lastName].filter(Boolean).join(' ') || '—'}</p>
                        <p><strong>Téléphone:</strong> ${cust.phone || '—'}</p>
                        <p><strong>Email:</strong> ${cust.email || '—'}</p>
                        <p><strong>Adresse:</strong> ${cust.address || '—'}</p>
                        <p><strong>Ville:</strong> ${cust.city || '—'}</p>
                    </div>
                    
                    <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 10px;">
                        <h4 style="margin-bottom: 1rem; color: var(--primary);">Détails Commande</h4>
                        <p><strong>Statut:</strong> <span class="status-badge status-${order.status || 'pending'}">${getStatusText(order.status || 'pending')}</span></p>
                        <p><strong>Livraison:</strong> ${order.delivery === 'express' ? 'Express (1-2 jours)' : 'Standard (3-5 jours)'}</p>
                        <p><strong>Paiement:</strong> ${order.payment === 'cod' ? 'À la livraison' : 'Virement bancaire'}</p>
                        <p><strong>Total:</strong> <span style="color: var(--accent); font-weight: bold;">${Number(order.total || 0).toLocaleString()} DA</span></p>
                    </div>
                </div>
                
                <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--primary);">Produits Commandés</h4>
                    <div style="overflow-x: auto;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Produit</th>
                                    <th>Couleur</th>
                                    <th>Taille</th>
                                    <th>Quantité</th>
                                    <th>Prix unitaire</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.color}</td>
                                        <td>${item.size}</td>
                                        <td>${item.quantity}</td>
                                        <td>${item.price.toLocaleString()} DA</td>
                                        <td>${(item.price * item.quantity).toLocaleString()} DA</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                ${order.notes ? `
                    <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 10px;">
                        <h4 style="margin-bottom: 1rem; color: var(--primary);">Notes</h4>
                        <p>${order.notes}</p>
                    </div>
                ` : ''}
            `;
            
            modal.style.display = 'block';
                showToast('✅ Détails de la commande chargés', 'success');
                
            } catch (error) {
                console.error('❌ Erreur lors du chargement des détails:', error);
                showToast(`❌ Erreur: ${error.message}`, 'error');
            }
        }

        function closeOrderModal() {
            document.getElementById('order-modal').style.display = 'none';
        }

        async function updateOrderStatus(orderId, newStatus) {
            try {
                console.log('🔄 Mise à jour du statut:', orderId, '→', newStatus);
                
                const response = await apiRequest(`/admin/orders/${orderId}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus })
                });
                
                if (response.success) {
                    // Mettre à jour la commande locale
                const order = orders.find(o => o._id === orderId);
            if (order) {
                order.status = newStatus;
                        console.log('✅ Statut mis à jour localement:', order);
                }
                
                    // Mettre à jour l'interface
                    loadOrders();
                updateStats();
                    showToast(`✅ Statut mis à jour: ${getStatusText(newStatus)}`, 'success');
                } else {
                    throw new Error(response.error || 'Erreur lors de la mise à jour');
                }
                
            } catch (error) {
                console.error('❌ Erreur lors de la mise à jour du statut:', error);
                showToast(`❌ Erreur: ${error.message}`, 'error');
            }
        }

        async function deleteOrder(orderId) {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette commande?')) {
                try {
                    console.log('🗑️ Suppression de la commande:', orderId);
                    
                    const response = await apiRequest(`/orders/${orderId}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.success) {
                        // Supprimer la commande de la liste locale
                    orders = orders.filter(o => o._id !== orderId);
                        saveAdminOrdersBackup(orders);
                        // Mettre à jour l'interface
                loadOrders();
                updateStats();
                        showToast('✅ Commande supprimée avec succès!', 'success');
                        console.log('🗑️ Commande supprimée localement');
                    } else {
                        throw new Error(response.error || 'Erreur lors de la suppression');
                    }
                    
                } catch (error) {
                    console.error('❌ Erreur lors de la suppression:', error);
                    showToast(`❌ Erreur: ${error.message}`, 'error');
                }
            }
        }

        async function exportOrders() {
            try {
                const response = await apiRequest('/admin/export/orders');
                const csvContent = response.data || response;
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `commandes_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Export terminé!', 'success');
            } catch (error) {
                console.error('Erreur lors de l\'export:', error);
                showToast('Erreur lors de l\'export', 'error');
            }
        }

        // Categories Functions
        function loadCategories() {
            const container = document.getElementById('categories-list');
            
            if (categories.length === 0) {
                container.innerHTML = `
                    <p style="text-align: center; color: var(--text-light); padding: 2rem;">
                        Aucune catégorie trouvée. Ajoutez votre première catégorie.
                    </p>
                `;
                return;
            }
            
            container.innerHTML = categories.map(category => `
                <div style="background: var(--white); padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin-bottom: 0.5rem;">${category.name}</h4>
                        <p style="color: var(--text-light); margin: 0;">${category.description || 'Aucune description'}</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-primary" onclick="editCategory('${category._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function editCategory(categoryId) {
            const category = categories.find(c => c._id === categoryId);
            if (category) {
                // Remplir le formulaire avec les données de la catégorie
                document.getElementById('category-name').value = category.name;
                document.getElementById('category-description').value = category.description || '';
                
                // Changer le mode d'édition
                currentEditingCategory = categoryId;
                document.getElementById('category-form').querySelector('button[type="submit"]').textContent = 'Modifier la catégorie';
                
                // Afficher le modal
                document.getElementById('category-modal').style.display = 'block';
            }
        }

        async function deleteCategory(categoryId) {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
                try {
                    await apiRequest(`/categories/${categoryId}`, { method: 'DELETE' });
                    showToast('Catégorie supprimée avec succès!', 'success');
                    await loadCategoriesFromAPI();
                    loadCategories();
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    showToast('Erreur lors de la suppression de la catégorie', 'error');
                }
            }
        }



        // Category Modal Functions
        function openCategoryModal() {
            const modal = document.getElementById('category-modal');
            const title = document.getElementById('category-modal-title');
            const form = document.getElementById('category-form');
            
            // Reset form
            form.reset();
            currentEditingCategory = null;
            title.textContent = 'Ajouter Catégorie';
            form.querySelector('button[type="submit"]').textContent = 'Ajouter la catégorie';
            
            modal.style.display = 'block';
        }

        function closeCategoryModal() {
            document.getElementById('category-modal').style.display = 'none';
        }

        // Category Form Handler
        document.getElementById('category-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const categoryData = {
                name: document.getElementById('category-name').value,
                description: document.getElementById('category-description').value
            };
            
            try {
                if (currentEditingCategory) {
                    // Modifier la catégorie existante
                    await apiRequest(`/categories/${currentEditingCategory}`, {
                        method: 'PUT',
                        body: JSON.stringify(categoryData)
                    });
                    showToast('Catégorie modifiée avec succès!', 'success');
                } else {
                    // Ajouter une nouvelle catégorie
                    await apiRequest('/categories', {
                        method: 'POST',
                        body: JSON.stringify(categoryData)
                    });
                    showToast('Catégorie ajoutée avec succès!', 'success');
                }
                
                closeCategoryModal();
                await loadCategoriesFromAPI();
                loadCategories();
                
            } catch (error) {
                console.error('Erreur lors de la sauvegarde:', error);
                showToast('Erreur lors de la sauvegarde de la catégorie', 'error');
            }
        });

        // Settings Form Handler


        // Utility Functions
        function getStatusText(status) {
            const statusMap = {
                pending: 'En attente',
                confirmed: 'Confirmée',
                shipped: 'Expédiée',
                delivered: 'Livrée',
                cancelled: 'Annulée'
            };
            return statusMap[status] || status;
        }

        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `toast ${type} show`;
            toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}"></i> ${message}`;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        }

        // Toggle Sidebar (mobile)
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        }

        // Modal Click Outside Close
        window.onclick = function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }



        // Configuration pour le déploiement en production
        if (window.location.hostname !== 'localhost') {
            // En production, utiliser l'URL du backend déployé (op-orignalplus)
            window.API_BASE_URL = 'https://op-orignalplus.vercel.app/api';
        }
 
// Configuration API
        const API_BASE_URL = (window.location.hostname === 'localhost')
            ? 'http://localhost:3000/api'
            : `${window.location.origin}/api`;

        // Fonctions API
        async function apiRequest(endpoint, options = {}) {
            try {
                console.log(`🌐 Appel API Admin: ${API_BASE_URL}${endpoint}`);
                
                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    method: options.method || 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...options.headers
                    },
                    mode: 'cors',
                    credentials: 'omit',
                    ...options
                });
                
                console.log(`📊 Réponse API Admin: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Erreur API Admin:', errorText);
                    throw new Error(`Erreur API: ${response.status} - ${errorText}`);
                }
                
                const data = await response.json();
                console.log('✅ Données reçues Admin:', data);
                return data;
            } catch (error) {
                console.error('❌ Erreur API Admin:', error);
                showToast(`Erreur de connexion: ${error.message}`, 'error');
                throw error;
            }
        }

        // Variables globales
        let products = [];
        let orders = [];
        let categories = [];
        let currentEditingProduct = null;
        let currentEditingCategory = null;

        // Backup produits admin (persistance locale)
        const ADMIN_PRODUCTS_BACKUP_KEY = 'adminProductsBackup';
        const ADMIN_ORDERS_BACKUP_KEY = 'adminOrdersBackup';

        function saveAdminProductsBackup(list) {
            try {
                if (Array.isArray(list)) {
                    localStorage.setItem(ADMIN_PRODUCTS_BACKUP_KEY, JSON.stringify(list));
                }
            } catch (e) {
                console.warn('Impossible de sauvegarder le backup produits:', e);
            }
        }

        function loadAdminProductsBackup() {
            try {
                const raw = localStorage.getItem(ADMIN_PRODUCTS_BACKUP_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                console.warn('Impossible de charger le backup produits:', e);
                return [];
            }
        }

        function saveAdminOrdersBackup(list) {
            try {
                if (Array.isArray(list)) {
                    localStorage.setItem(ADMIN_ORDERS_BACKUP_KEY, JSON.stringify(list));
                }
            } catch (e) {
                console.warn('Impossible de sauvegarder le backup commandes:', e);
            }
        }

        function loadAdminOrdersBackup() {
            try {
                const raw = localStorage.getItem(ADMIN_ORDERS_BACKUP_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                console.warn('Impossible de charger le backup commandes:', e);
                return [];
            }
        }

        // Initialisation
        document.addEventListener('DOMContentLoaded', async function() {
            await initializeAdmin();
            loadDashboard();
            setupNavigation();

            // Auto-refresh périodique commandes et stats
            setInterval(async () => {
                try {
                    await loadOrdersFromAPI();
                    await updateStats();
                    loadRecentOrders();
                    if (document.getElementById('orders-page') && !document.getElementById('orders-page').classList.contains('hidden')) {
                        loadOrders();
                    }
                } catch (e) {
                    // ignorer erreurs ponctuelles
                }
            }, 10000); // 10s
        });

        async function initializeAdmin() {
            try {
                // Charger les données depuis l'API
                await Promise.all([
                    loadProductsFromAPI(),
                    loadOrdersFromAPI(),
                    loadCategoriesFromAPI()
                ]);

                // Re-seed produits si API vide
                if (!products || products.length === 0) {
                    const backup = loadAdminProductsBackup();
                    if (backup && backup.length > 0) {
                        try {
                            await Promise.all(
                                backup.map(p => apiRequest('/products', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        name: p.name,
                                        category: p.category,
                                        price: p.price,
                                        originalPrice: p.originalPrice || null,
                                        description: p.description || '',
                                        colors: p.colors || [],
                                        sizes: p.sizes || [],
                                        badge: p.badge || '',
                                        rating: p.rating || null,
                                        images: p.images || [],
                                        stock: typeof p.stock === 'number' ? p.stock : 100,
                                        isNew: !!p.isNew,
                                        isPromo: !!p.isPromo,
                                        isActive: true
                                    })
                                }))
                            );
                            await loadProductsFromAPI();
                        } catch (seedErr) {
                            console.warn('Re-seed depuis backup produits échoué:', seedErr);
                        }
                    }
                }

                // Re-seed commandes si API vide
                if (!orders || orders.length === 0) {
                    const ordersBackup = loadAdminOrdersBackup();
                    if (ordersBackup && ordersBackup.length > 0) {
                        try {
                            // Recréer seulement les plus récentes pour limiter
                            const toRestore = ordersBackup.slice(-50);
                            for (const o of toRestore) {
                                await apiRequest('/orders', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        customer: o.customer || {},
                                        items: o.items || o.products || [],
                                        delivery: o.delivery || 'standard',
                                        payment: o.payment || 'cod',
                                        notes: o.notes || '',
                                        subtotal: o.subtotal || 0,
                                        deliveryFee: o.deliveryFee || 0,
                                        total: o.total || 0
                                    })
                                });
                            }
                            await loadOrdersFromAPI();
                        } catch (seedErr) {
                            console.warn('Re-seed depuis backup commandes échoué:', seedErr);
                        }
                    }
                }

                // Sauvegarder backups
                if (products && products.length > 0) saveAdminProductsBackup(products);
                if (orders && orders.length > 0) saveAdminOrdersBackup(orders);
            } catch (error) {
                console.error('Erreur lors de l\'initialisation:', error);
                showToast('Erreur lors du chargement des données', 'error');
            }
        }

        // Charger les produits depuis l'API
        async function loadProductsFromAPI() {
            try {
                const response = await apiRequest('/products');
                const raw = response.data || response;
                // Dédupliquer par _id pour stabilité de l'inventaire à l'affichage admin
                if (Array.isArray(raw)) {
                    const seen = new Set();
                    products = raw.filter(p => {
                        const id = p && p._id ? p._id : JSON.stringify(p);
                        if (seen.has(id)) return false;
                        seen.add(id);
                        return true;
                    });
                } else {
                    products = [];
                }
                // Mettre à jour le backup local
                if (Array.isArray(products) && products.length > 0) {
                    saveAdminProductsBackup(products);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des produits:', error);
                products = [];
            }
        }

        // Charger les commandes depuis l'API
        async function loadOrdersFromAPI() {
            try {
                const response = await apiRequest('/orders');
                orders = response.data || response;
                // Sauvegarder backup
                if (Array.isArray(orders) && orders.length > 0) {
                    saveAdminOrdersBackup(orders);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des commandes:', error);
                orders = [];
            }
        }

        // Charger les catégories depuis l'API
        async function loadCategoriesFromAPI() {
            try {
                const response = await apiRequest('/categories');
                categories = response.data || response;
            } catch (error) {
                console.error('Erreur lors du chargement des catégories:', error);
                categories = [];
            }
        }

        // Navigation
        function setupNavigation() {
            document.querySelectorAll('.menu-item').forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    const page = this.dataset.page;
                    showPage(page);
                    
                    // Update active menu item
                    document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        }

        function showPage(pageId) {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
            
            // Show selected page
            document.getElementById(pageId + '-page').classList.remove('hidden');
            
            // Load page content
            switch(pageId) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'products':
                    loadProducts();
                    break;
                case 'orders':
                    loadOrders();
                    break;
                        case 'categories':
            loadCategories();
            break;
            }
        }

        // Dashboard Functions
        async function loadDashboard() {
            await updateStats();
            loadRecentOrders();
        }

        async function updateStats() {
            try {
                const statsResponse = await apiRequest('/admin/stats');
                const stats = statsResponse.data || statsResponse;
                
                document.getElementById('total-products').textContent = stats.totalProducts || products.length;
                document.getElementById('total-orders').textContent = stats.totalOrders || orders.length;
                document.getElementById('total-revenue').textContent = (stats.totalRevenue || 0).toLocaleString() + ' DA';
                document.getElementById('pending-orders').textContent = stats.pendingOrders || 0;
            } catch (error) {
                console.error('Erreur lors du chargement des statistiques:', error);
                // Fallback aux données locales
            document.getElementById('total-products').textContent = products.length;
            document.getElementById('total-orders').textContent = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
            document.getElementById('total-revenue').textContent = totalRevenue.toLocaleString() + ' DA';
            const pendingOrders = orders.filter(order => order.status === 'pending').length;
            document.getElementById('pending-orders').textContent = pendingOrders;
            }
        }

        function loadRecentOrders() {
            const recentOrders = orders.slice(-5).reverse();
            const tbody = document.getElementById('recent-orders');
            
            if (recentOrders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-light);">
                            Aucune commande trouvée
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = recentOrders.map(order => `
                <tr>
                    <td>#${order.orderNumber || order._id}</td>
                    <td>${order.customer.firstName} ${order.customer.lastName}</td>
                    <td>${new Date(order.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>${order.total.toLocaleString()} DA</td>
                    <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewOrder('${order._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // Products Functions
        function loadProducts() {
            const grid = document.getElementById('products-grid');
            
            if (products.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-light);">
                        <i class="fas fa-box" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <p>Aucun produit trouvé</p>
                        <button class="btn btn-primary" onclick="openProductModal()" style="margin-top: 1rem;">
                            <i class="fas fa-plus"></i> Ajouter le premier produit
                        </button>
                    </div>
                `;
                return;
            }
            
            grid.innerHTML = products.map(product => `
                <div class="product-card">
                    <div class="product-image">
                        ${product.images && product.images.length > 0 ? 
                            `<img src="${product.images[0]}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
                            `<i class="fas fa-image"></i>`
                        }
                    </div>
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-price">
                            ${product.originalPrice ? `<span style="text-decoration: line-through; color: #999; font-size: 1rem;">${product.originalPrice} DA</span> ` : ''}
                            ${product.price} DA
                        </div>
                        <p style="color: var(--text-light); margin-bottom: 1rem; font-size: 0.9rem;">
                            Catégorie: ${product.category} | Stock: ${product.stock || 'En stock'}
                        </p>
                        <div class="product-actions">
                            <button class="btn btn-sm btn-primary" onclick="editProduct('${product._id}')">
                                <i class="fas fa-edit"></i> Modifier
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product._id}')">
                                <i class="fas fa-trash"></i> Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Product Modal Functions
        function openProductModal(productId = null) {
            const modal = document.getElementById('product-modal');
            const form = document.getElementById('product-form');
            const title = document.getElementById('modal-title');
            
            if (productId) {
                const product = products.find(p => p._id === productId);
                if (product) {
                    title.textContent = 'Modifier Produit';
                    fillProductForm(product);
                    currentEditingProduct = product._id;
                }
            } else {
                title.textContent = 'Ajouter Produit';
                form.reset();
                document.getElementById('image-preview').innerHTML = '';
                currentEditingProduct = null;
            }
            
            modal.style.display = 'block';
        }

        function closeProductModal() {
            document.getElementById('product-modal').style.display = 'none';
            currentEditingProduct = null;
            
            // Nettoyer le formulaire et les images
            document.getElementById('product-form').reset();
            document.getElementById('image-preview').innerHTML = '';
        }

        function fillProductForm(product) {
            document.getElementById('product-id').value = product._id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-original-price').value = product.originalPrice || '';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-colors').value = product.colors || '';
            document.getElementById('product-sizes').value = product.sizes || '';
            document.getElementById('product-badge').value = product.badge || '';
            document.getElementById('product-rating').value = product.rating || '';
            document.getElementById('product-stock').value = product.stock || 100;
            
            // Display existing images
            const preview = document.getElementById('image-preview');
            if (product.images && product.images.length > 0) {
                preview.innerHTML = product.images.map((img, index) => `
                    <div class="preview-item">
                        <img src="${img}" alt="Product image">
                        <button type="button" class="preview-remove" onclick="removeExistingImage(${index})">&times;</button>
                    </div>
                `).join('');
            }
        }

        function editProduct(productId) {
            openProductModal(productId);
        }

        async function deleteProduct(productId) {
            if (confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
                try {
                    await apiRequest(`/products/${productId}`, {
                        method: 'DELETE'
                    });
                    
                    products = products.filter(p => p._id !== productId);
                    // Mettre à jour l'UI et le backup
                    loadProducts();
                    updateStats();
                    saveAdminProductsBackup(products);
                    showToast('Produit supprimé avec succès!', 'success');
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    showToast('Erreur lors de la suppression du produit', 'error');
                }
            }
        }

        // File Upload Handler
        document.getElementById('product-images').addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const preview = document.getElementById('image-preview');
            
            // Limiter le nombre d'images
            if (files.length > 5) {
                showToast('⚠️ Maximum 5 images autorisées', 'warning');
                return;
            }
            
            files.forEach((file, index) => {
                if (file.type.startsWith('image/')) {
                    // Vérifier la taille du fichier (max 2MB)
                    if (file.size > 2 * 1024 * 1024) {
                        showToast(`⚠️ Image ${file.name} trop volumineuse (max 2MB)`, 'warning');
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const previewItem = document.createElement('div');
                        previewItem.className = 'preview-item';
                        previewItem.innerHTML = `
                            <img src="${e.target.result}" alt="Preview">
                            <button type="button" class="preview-remove" onclick="removePreviewImage(this)">&times;</button>
                        `;
                        preview.appendChild(previewItem);
                    };
                    reader.readAsDataURL(file);
                } else {
                    showToast(`⚠️ ${file.name} n'est pas une image valide`, 'warning');
                }
            });
        });

        function removePreviewImage(button) {
            button.parentElement.remove();
        }

        function removeExistingImage(index) {
            if (currentEditingProduct) {
                const product = products.find(p => p._id === currentEditingProduct);
                if (product && product.images) {
                    product.images.splice(index, 1);
                    fillProductForm(product);
                }
            }
        }

        // Product Form Submit
        document.getElementById('product-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const imageElements = document.querySelectorAll('#image-preview img');
            
            // Récupérer toutes les images du preview
            const images = Array.from(imageElements).map(img => {
                const src = img.src;
                return src;
            });
            
            console.log('📸 Images à sauvegarder:', images);
            
            const productData = {
                name: formData.get('name'),
                category: formData.get('category'),
                price: parseInt(formData.get('price')),
                originalPrice: formData.get('originalPrice') ? parseInt(formData.get('originalPrice')) : null,
                description: formData.get('description'),
                colors: formData.get('colors') ? formData.get('colors').split(',').map(c => c.trim()) : [],
                sizes: formData.get('sizes') ? formData.get('sizes').split(',').map(s => s.trim()) : [],
                badge: formData.get('badge'),
                rating: formData.get('rating') ? parseFloat(formData.get('rating')) : null,
                images: images,
                stock: parseInt(formData.get('stock')) || 100,
                isNew: formData.get('badge') === 'NOUVEAU',
                isPromo: formData.get('badge') === 'PROMO',
                isActive: true
            };
            
            try {
            if (currentEditingProduct) {
                // Update existing product
                    const response = await apiRequest(`/products/${currentEditingProduct}`, {
                        method: 'PUT',
                        body: JSON.stringify(productData)
                    });
                    
                    if (response.success) {
                    const index = products.findIndex(p => p._id === currentEditingProduct);
                if (index !== -1) {
                    products[index] = { ...products[index], ...productData };
                }
                        showToast('✅ Produit modifié avec succès!', 'success');
                    } else {
                        throw new Error(response.error || 'Erreur lors de la modification');
                    }
            } else {
                // Add new product
                    const response = await apiRequest('/products', {
                        method: 'POST',
                        body: JSON.stringify(productData)
                    });
                    
                    if (response.success && response.data) {
                        const newProduct = response.data;
                    products.push(newProduct);
                        showToast('✅ Produit ajouté avec succès!', 'success');
                        console.log('🆕 Nouveau produit ajouté:', newProduct);
                    } else {
                        throw new Error(response.error || 'Erreur lors de l\'ajout');
                    }
            }
            
            // Mettre à jour backup après ajout/modif
            saveAdminProductsBackup(products);
            
            closeProductModal();
            loadProducts();
            updateStats();
                
            } catch (error) {
                console.error('❌ Erreur lors de la sauvegarde:', error);
                showToast(`❌ Erreur: ${error.message}`, 'error');
            }
        });

        // Orders Functions
        function loadOrders() {
            const tbody = document.getElementById('all-orders');
            
            if (orders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-light);">
                            Aucune commande trouvée
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = orders.map(order => {
                const id = order.orderNumber || order._id || '';
                const customerFirst = order.customer?.firstName || '';
                const customerLast = order.customer?.lastName || '';
                const phone = order.customer?.phone || '';
                const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
                const total = (order.total ?? order.subtotal ?? 0);
                const status = order.status || 'pending';
                return `
                <tr>
                    <td>#${id}</td>
                    <td>${customerFirst} ${customerLast}</td>
                    <td>${phone}</td>
                    <td>${createdAt.toLocaleDateString('fr-FR')}</td>
                    <td>${Number(total).toLocaleString()} DA</td>
                    <td>
                        <select onchange="updateOrderStatus('${order._id}', this.value)" class="form-control" style="padding: 0.25rem; font-size: 0.8rem;">
                            <option value="pending" ${status === 'pending' ? 'selected' : ''}>En attente</option>
                            <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>Confirmée</option>
                            <option value="shipped" ${status === 'shipped' ? 'selected' : ''}>Expédiée</option>
                            <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>Livrée</option>
                            <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Annulée</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewOrder('${order._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            }).join('');
        }

        async function viewOrder(orderId) {
            try {
                console.log('🔍 Consultation de la commande:', orderId);
                
                const response = await apiRequest(`/orders/${orderId}`);
                const order = response.data || response;
            
                if (!order) {
                    throw new Error('Commande non trouvée');
                }
                
                console.log('📋 Détails de la commande:', order);
            
            const modal = document.getElementById('order-modal');
            const content = document.getElementById('order-details');
                
                if (!modal || !content) {
                    throw new Error('Modal non trouvé');
                }

            const cust = order.customer || {};
            const items = (order.products || order.items || []).map(item => ({
                name: item?.name || 'Produit',
                color: item?.color || 'Standard',
                size: item?.size || 'Unique',
                quantity: item?.quantity || 1,
                price: Number(item?.price || 0)
            }));
            
            content.innerHTML = `
                <div style="margin-bottom: 2rem;">
                        <h3>Commande #${order.orderNumber || order._id || ''}</h3>
                        <p style="color: var(--text-light);">${order.createdAt ? `Passée le ${new Date(order.createdAt).toLocaleDateString('fr-FR')} à ${new Date(order.createdAt).toLocaleTimeString('fr-FR')}` : ''}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 10px;">
                        <h4 style="margin-bottom: 1rem; color: var(--primary);">Informations Client</h4>
                        <p><strong>Nom:</strong> ${[cust.firstName, cust.lastName].filter(Boolean).join(' ') || '—'}</p>
                        <p><strong>Téléphone:</strong> ${cust.phone || '—'}</p>
                        <p><strong>Email:</strong> ${cust.email || '—'}</p>
                        <p><strong>Adresse:</strong> ${cust.address || '—'}</p>
                        <p><strong>Ville:</strong> ${cust.city || '—'}</p>
                    </div>
                    
                    <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 10px;">
                        <h4 style="margin-bottom: 1rem; color: var(--primary);">Détails Commande</h4>
                        <p><strong>Statut:</strong> <span class="status-badge status-${order.status || 'pending'}">${getStatusText(order.status || 'pending')}</span></p>
                        <p><strong>Livraison:</strong> ${order.delivery === 'express' ? 'Express (1-2 jours)' : 'Standard (3-5 jours)'}</p>
                        <p><strong>Paiement:</strong> ${order.payment === 'cod' ? 'À la livraison' : 'Virement bancaire'}</p>
                        <p><strong>Total:</strong> <span style="color: var(--accent); font-weight: bold;">${Number(order.total || 0).toLocaleString()} DA</span></p>
                    </div>
                </div>
                
                <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--primary);">Produits Commandés</h4>
                    <div style="overflow-x: auto;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Produit</th>
                                    <th>Couleur</th>
                                    <th>Taille</th>
                                    <th>Quantité</th>
                                    <th>Prix unitaire</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.color}</td>
                                        <td>${item.size}</td>
                                        <td>${item.quantity}</td>
                                        <td>${item.price.toLocaleString()} DA</td>
                                        <td>${(item.price * item.quantity).toLocaleString()} DA</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                ${order.notes ? `
                    <div style="background: var(--bg-light); padding: 1.5rem; border-radius: 10px;">
                        <h4 style="margin-bottom: 1rem; color: var(--primary);">Notes</h4>
                        <p>${order.notes}</p>
                    </div>
                ` : ''}
            `;
            
            modal.style.display = 'block';
                showToast('✅ Détails de la commande chargés', 'success');
                
            } catch (error) {
                console.error('❌ Erreur lors du chargement des détails:', error);
                showToast(`❌ Erreur: ${error.message}`, 'error');
            }
        }

        function closeOrderModal() {
            document.getElementById('order-modal').style.display = 'none';
        }

        async function updateOrderStatus(orderId, newStatus) {
            try {
                console.log('🔄 Mise à jour du statut:', orderId, '→', newStatus);
                
                const response = await apiRequest(`/admin/orders/${orderId}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus })
                });
                
                if (response.success) {
                    // Mettre à jour la commande locale
                const order = orders.find(o => o._id === orderId);
            if (order) {
                order.status = newStatus;
                        console.log('✅ Statut mis à jour localement:', order);
                }
                
                    // Mettre à jour l'interface
                    loadOrders();
                updateStats();
                    showToast(`✅ Statut mis à jour: ${getStatusText(newStatus)}`, 'success');
                } else {
                    throw new Error(response.error || 'Erreur lors de la mise à jour');
                }
                
            } catch (error) {
                console.error('❌ Erreur lors de la mise à jour du statut:', error);
                showToast(`❌ Erreur: ${error.message}`, 'error');
            }
        }

        async function deleteOrder(orderId) {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette commande?')) {
                try {
                    console.log('🗑️ Suppression de la commande:', orderId);
                    
                    const response = await apiRequest(`/orders/${orderId}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.success) {
                        // Supprimer la commande de la liste locale
                    orders = orders.filter(o => o._id !== orderId);
                        saveAdminOrdersBackup(orders);
                        // Mettre à jour l'interface
                loadOrders();
                updateStats();
                        showToast('✅ Commande supprimée avec succès!', 'success');
                        console.log('🗑️ Commande supprimée localement');
                    } else {
                        throw new Error(response.error || 'Erreur lors de la suppression');
                    }
                    
                } catch (error) {
                    console.error('❌ Erreur lors de la suppression:', error);
                    showToast(`❌ Erreur: ${error.message}`, 'error');
                }
            }
        }

        async function exportOrders() {
            try {
                const response = await apiRequest('/admin/export/orders');
                const csvContent = response.data || response;
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `commandes_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Export terminé!', 'success');
            } catch (error) {
                console.error('Erreur lors de l\'export:', error);
                showToast('Erreur lors de l\'export', 'error');
            }
        }

        // Categories Functions
        function loadCategories() {
            const container = document.getElementById('categories-list');
            
            if (categories.length === 0) {
                container.innerHTML = `
                    <p style="text-align: center; color: var(--text-light); padding: 2rem;">
                        Aucune catégorie trouvée. Ajoutez votre première catégorie.
                    </p>
                `;
                return;
            }
            
            container.innerHTML = categories.map(category => `
                <div style="background: var(--white); padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin-bottom: 0.5rem;">${category.name}</h4>
                        <p style="color: var(--text-light); margin: 0;">${category.description || 'Aucune description'}</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-primary" onclick="editCategory('${category._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function editCategory(categoryId) {
            const category = categories.find(c => c._id === categoryId);
            if (category) {
                // Remplir le formulaire avec les données de la catégorie
                document.getElementById('category-name').value = category.name;
                document.getElementById('category-description').value = category.description || '';
                
                // Changer le mode d'édition
                currentEditingCategory = categoryId;
                document.getElementById('category-form').querySelector('button[type="submit"]').textContent = 'Modifier la catégorie';
                
                // Afficher le modal
                document.getElementById('category-modal').style.display = 'block';
            }
        }

        async function deleteCategory(categoryId) {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
                try {
                    await apiRequest(`/categories/${categoryId}`, { method: 'DELETE' });
                    showToast('Catégorie supprimée avec succès!', 'success');
                    await loadCategoriesFromAPI();
                    loadCategories();
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    showToast('Erreur lors de la suppression de la catégorie', 'error');
                }
            }
        }



        // Category Modal Functions
        function openCategoryModal() {
            const modal = document.getElementById('category-modal');
            const title = document.getElementById('category-modal-title');
            const form = document.getElementById('category-form');
            
            // Reset form
            form.reset();
            currentEditingCategory = null;
            title.textContent = 'Ajouter Catégorie';
            form.querySelector('button[type="submit"]').textContent = 'Ajouter la catégorie';
            
            modal.style.display = 'block';
        }

        function closeCategoryModal() {
            document.getElementById('category-modal').style.display = 'none';
        }

        // Category Form Handler
        document.getElementById('category-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const categoryData = {
                name: document.getElementById('category-name').value,
                description: document.getElementById('category-description').value
            };
            
            try {
                if (currentEditingCategory) {
                    // Modifier la catégorie existante
                    await apiRequest(`/categories/${currentEditingCategory}`, {
                        method: 'PUT',
                        body: JSON.stringify(categoryData)
                    });
                    showToast('Catégorie modifiée avec succès!', 'success');
                } else {
                    // Ajouter une nouvelle catégorie
                    await apiRequest('/categories', {
                        method: 'POST',
                        body: JSON.stringify(categoryData)
                    });
                    showToast('Catégorie ajoutée avec succès!', 'success');
                }
                
                closeCategoryModal();
                await loadCategoriesFromAPI();
                loadCategories();
                
            } catch (error) {
                console.error('Erreur lors de la sauvegarde:', error);
                showToast('Erreur lors de la sauvegarde de la catégorie', 'error');
            }
        });

        // Settings Form Handler


        // Utility Functions
        function getStatusText(status) {
            const statusMap = {
                pending: 'En attente',
                confirmed: 'Confirmée',
                shipped: 'Expédiée',
                delivered: 'Livrée',
                cancelled: 'Annulée'
            };
            return statusMap[status] || status;
        }

        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `toast ${type} show`;
            toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}"></i> ${message}`;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        }

        // Toggle Sidebar (mobile)
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        }

        // Modal Click Outside Close
        window.onclick = function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }



        // Configuration pour le déploiement en production
        if (window.location.hostname !== 'localhost') {
            // En production, utiliser l'URL du backend déployé
            window.API_BASE_URL = 'https://full-op.vercel.app/api';
        }

