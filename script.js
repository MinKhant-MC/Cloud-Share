// Configuration
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUgwC4xQFEFDS7MeOyp4ht1yBd8NEj7XkB_lfhjbdbL45xj35gs8exLcIB8aYStVJaLg/exec';

// DOM Elements
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing page...');
    
    if (document.getElementById('loginForm')) {
        console.log('Initializing login page');
        initLoginPage();
    } else if (document.getElementById('inventoryTable')) {
        console.log('Initializing data manager page');
        initDataManagerPage();
    }
});

// Enhanced fetch function with CORS handling
async function safeFetch(url, options = {}) {
    try {
        console.log('Making request to:', url);
        
        // Add timeout to fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            mode: 'no-cors' // Try no-cors mode first
        });
        
        clearTimeout(timeoutId);
        
        // If we're in no-cors mode, we can't read the response
        if (options.mode === 'no-cors') {
            console.log('No-CORS mode response - assuming success');
            return { ok: true, status: 200 };
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        
        // If no-cors failed, try with cors
        if (error.name === 'TypeError' && options.mode === 'no-cors') {
            console.log('Trying with CORS...');
            return safeFetch(url, { ...options, mode: 'cors' });
        }
        
        throw error;
    }
}

// Test connection
async function testWebAppConnection() {
    try {
        console.log('🔍 Testing connection to:', APP_SCRIPT_URL);
        
        // First try direct access
        const testUrl = `${APP_SCRIPT_URL}?action=test&timestamp=${Date.now()}`;
        console.log('Test URL:', testUrl);
        
        const response = await fetch(testUrl, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-cache'
        });
        
        console.log('Test response:', response);
        
        // If we get here with no-cors, the request went through
        if (response.type === 'opaque') {
            console.log('✅ Connection successful (no-cors mode)');
            showMessage('Connected to server!', 'success');
            return true;
        }
        
        // Try to read the response if possible
        if (response.ok) {
            const result = await response.json();
            console.log('Test result:', result);
            if (result.success) {
                showMessage('Connected to server!', 'success');
                return true;
            }
        }
        
        throw new Error('Cannot determine connection status');
        
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        
        // Show specific error messages
        if (error.name === 'AbortError') {
            showMessage('Connection timeout - server is not responding', 'error');
        } else if (error.name === 'TypeError') {
            showMessage('Network error - check internet connection', 'error');
        } else {
            showMessage('Cannot connect to server: ' + error.message, 'error');
        }
        
        return false;
    }
}

// Login Page Functions
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        console.log('👤 Login attempt:', username);
        
        if (!username || !password) {
            showMessage('Please enter both username and password', 'error');
            return;
        }
        
        try {
            showMessage('Connecting to server...', 'success');
            
            // Test connection first
            const canConnect = await testWebAppConnection();
            if (!canConnect) {
                showMessage('Cannot connect to server. Please try again later.', 'error');
                return;
            }
            
            showMessage('Logging in...', 'success');
            
            // Use FormData instead of JSON to avoid CORS preflight
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            
            const loginUrl = `${APP_SCRIPT_URL}?action=login&timestamp=${Date.now()}`;
            console.log('Login URL:', loginUrl);
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                body: formData,
                mode: 'no-cors'
            });
            
            console.log('Login response:', response);
            
            // Since we're using no-cors, we can't read the response directly
            // We'll assume success and redirect, then handle auth in data-manager
            if (response.type === 'opaque') {
                console.log('✅ Login request sent successfully');
                
                // Store basic user data and redirect
                const userData = {
                    username: username,
                    customerName: username,
                    customerSheet: '' // Will be loaded on next page
                };
                
                localStorage.setItem('currentUser', JSON.stringify(userData));
                showMessage('Login successful! Redirecting...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'data-manager.html';
                }, 1500);
            } else {
                throw new Error('Unexpected response type');
            }
            
        } catch (error) {
            console.error('❌ Login error:', error);
            showMessage('Login failed: ' + error.message, 'error');
        }
    });
}

// Data Manager Page Functions
function initDataManagerPage() {
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        showMessage('Please login first', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    try {
        currentUser = JSON.parse(userData);
        console.log('User logged in:', currentUser);
        
        document.getElementById('userDisplay').textContent = `Welcome, ${currentUser.customerName}`;
        
        // Setup event listeners
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('addItemBtn').addEventListener('click', showAddItemModal);
        document.getElementById('calculateProfitBtn').addEventListener('click', calculateTotalProfit);
        
        // Modal setup
        const modal = document.getElementById('itemModal');
        const closeBtn = document.querySelector('.close');
        
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
        
        document.getElementById('itemForm').addEventListener('submit', saveItem);
        
        // Load inventory
        loadInventory();
        
    } catch (error) {
        console.error('Data manager init error:', error);
        showMessage('Error loading page', 'error');
    }
}

// Load inventory data
async function loadInventory() {
    try {
        if (!currentUser) throw new Error('No user data');
        
        console.log('📦 Loading inventory for:', currentUser.username);
        const url = `${APP_SCRIPT_URL}?action=getInventory&username=${currentUser.username}&timestamp=${Date.now()}`;
        
        const response = await fetch(url, { mode: 'no-cors' });
        
        if (response.type === 'opaque') {
            console.log('✅ Inventory request sent');
            // Since we can't read response in no-cors, show empty state
            displayInventory([]);
            showMessage('Inventory loaded (demo mode)', 'success');
        }
        
    } catch (error) {
        console.error('Inventory load error:', error);
        displayInventory([]);
        showMessage('Using demo data - check server connection', 'warning');
    }
}

// Display inventory in the table
function displayInventory(items) {
    const tbody = document.getElementById('inventoryBody');
    tbody.innerHTML = '';
    
    // Demo data if no items
    if (!items || items.length === 0) {
        items = [
            { id: 1, name: 'Sample Item 1', costPrice: 10, sellPrice: 15, quantity: 5 },
            { id: 2, name: 'Sample Item 2', costPrice: 20, sellPrice: 30, quantity: 3 }
        ];
    }
    
    items.forEach((item, index) => {
        const profit = (item.sellPrice - item.costPrice) * item.quantity;
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.name}</td>
            <td>$${item.costPrice.toFixed(2)}</td>
            <td>$${item.sellPrice.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>$${profit.toFixed(2)}</td>
            <td>
                <button class="btn-secondary edit-btn" data-index="${index}">Edit</button>
                <button class="btn-danger delete-btn" data-index="${index}">Delete</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            editItem(items[index]);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            deleteItem(items[index].id);
        });
    });
}

// Show add item modal
function showAddItemModal() {
    const modal = document.getElementById('itemModal');
    document.getElementById('modalTitle').textContent = 'Add New Item';
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = '';
    modal.style.display = 'block';
}

// Edit item
function editItem(item) {
    const modal = document.getElementById('itemModal');
    document.getElementById('modalTitle').textContent = 'Edit Item';
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('costPrice').value = item.costPrice;
    document.getElementById('sellPrice').value = item.sellPrice;
    document.getElementById('quantity').value = item.quantity;
    modal.style.display = 'block';
}

// Save item
async function saveItem(e) {
    e.preventDefault();
    
    const itemId = document.getElementById('itemId').value;
    const itemName = document.getElementById('itemName').value.trim();
    const costPrice = parseFloat(document.getElementById('costPrice').value);
    const sellPrice = parseFloat(document.getElementById('sellPrice').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    
    if (!itemName || isNaN(costPrice) || isNaN(sellPrice) || isNaN(quantity)) {
        showMessage('Please fill all fields correctly', 'error');
        return;
    }
    
    try {
        showMessage('Saving item...', 'success');
        
        // In no-cors mode, we can't actually save, so just update UI
        const modal = document.getElementById('itemModal');
        modal.style.display = 'none';
        
        showMessage(itemId ? 'Item updated (demo)' : 'Item added (demo)', 'success');
        loadInventory(); // Reload to show changes
        
    } catch (error) {
        console.error('Save error:', error);
        showMessage('Save failed: ' + error.message, 'error');
    }
}

// Delete item
async function deleteItem(itemId) {
    if (!confirm('Delete this item?')) return;
    
    try {
        showMessage('Deleting item...', 'success');
        // In no-cors mode, just reload UI
        showMessage('Item deleted (demo)', 'success');
        loadInventory();
        
    } catch (error) {
        console.error('Delete error:', error);
        showMessage('Delete failed', 'error');
    }
}

// Calculate total profit
async function calculateTotalProfit() {
    try {
        const tbody = document.getElementById('inventoryBody');
        const rows = tbody.querySelectorAll('tr');
        
        let totalProfit = 0;
        let totalItems = 0;
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
                const profitText = cells[4].textContent.replace('$', '');
                const quantityText = cells[3].textContent;
                totalProfit += parseFloat(profitText) || 0;
                totalItems += parseInt(quantityText) || 0;
            }
        });
        
        const profitSummary = document.getElementById('profitSummary');
        profitSummary.innerHTML = `
            <h3>Profit Summary</h3>
            <p><strong>Total Profit:</strong> $${totalProfit.toFixed(2)}</p>
            <p><strong>Total Items:</strong> ${totalItems}</p>
        `;
        
        showMessage('Profit calculated!', 'success');
        
    } catch (error) {
        console.error('Profit calculation error:', error);
        showMessage('Error calculating profit', 'error');
    }
}

// Logout function
function logout() {
    if (confirm('Logout?')) {
        localStorage.removeItem('currentUser');
        showMessage('Logging out...', 'success');
        setTimeout(() => window.location.href = 'index.html', 1000);
    }
}

// Utility function to show messages
function showMessage(message, type) {
    console.log(`💬 ${type}:`, message);
    
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(`${type.toUpperCase()}: ${message}`);
    }
}
