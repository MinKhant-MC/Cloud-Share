// Configuration - MAKE SURE TO UPDATE THIS URL
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDfwoONqjyBH4JT1iyZ_5f0hjc0G5dbC1Vk0FkCOiIzp6p-rrdLGFl2LtVj40MKy_ZDg/exec';

// DOM Elements
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing page...');
    
    // Check which page we're on
    if (document.getElementById('loginForm')) {
        console.log('Initializing login page');
        initLoginPage();
    } else if (document.getElementById('inventoryTable')) {
        console.log('Initializing data manager page');
        initDataManagerPage();
    }
    
    // Test web app connection
    testWebAppConnection();
});

// Test if web app is accessible
async function testWebAppConnection() {
    try {
        console.log('Testing web app connection to:', APP_SCRIPT_URL);
        const response = await fetch(`${https://script.google.com/macros/s/AKfycbzDfwoONqjyBH4JT1iyZ_5f0hjc0G5dbC1Vk0FkCOiIzp6p-rrdLGFl2LtVj40MKy_ZDg/exec}?action=test`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Web app test result:', result);
        
        if (result.success) {
            console.log('✅ Web app is working!');
            showMessage('Connected to server successfully!', 'success');
        } else {
            console.error('❌ Web app test failed:', result.message);
            showMessage('Server error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('❌ Cannot connect to web app:', error);
        showMessage('Cannot connect to server. Please check: 1) Web app URL 2) Deployment permissions 3) Internet connection', 'error');
    }
}

// Login Page Functions
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        console.log('Login attempt with:', { username, password });
        
        if (!username || !password) {
            showMessage('Please enter both username and password', 'error');
            return;
        }
        
        try {
            showMessage('Logging in...', 'success');
            
            const response = await fetch(`${https://script.google.com/macros/s/AKfycbzDfwoONqjyBH4JT1iyZ_5f0hjc0G5dbC1Vk0FkCOiIzp6p-rrdLGFl2LtVj40MKy_ZDg/exec}?action=login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            console.log('Login response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Login result:', result);
            
            if (result.success) {
                console.log('✅ Login successful, user:', result.user);
                showMessage('Login successful! Redirecting...', 'success');
                
                // Store user data in localStorage
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                
                // Redirect to data manager after short delay
                setTimeout(() => {
                    window.location.href = 'data-manager.html';
                }, 1000);
            } else {
                console.error('❌ Login failed:', result.message);
                showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            showMessage('Login failed: ' + error.message, 'error');
        }
    });
}

// Data Manager Page Functions
function initDataManagerPage() {
    // Check if user is logged in
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        console.log('No user data, redirecting to login');
        showMessage('Please login first', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    try {
        currentUser = JSON.parse(userData);
        console.log('User logged in:', currentUser);
        
        if (!currentUser.username || !currentUser.customerName) {
            throw new Error('Invalid user data');
        }
        
        document.getElementById('userDisplay').textContent = `Welcome, ${currentUser.customerName}`;
        
        // Set up event listeners
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('addItemBtn').addEventListener('click', showAddItemModal);
        document.getElementById('calculateProfitBtn').addEventListener('click', calculateTotalProfit);
        
        // Modal setup
        const modal = document.getElementById('itemModal');
        const closeBtn = document.querySelector('.close');
        
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        document.getElementById('itemForm').addEventListener('submit', saveItem);
        
        // Load inventory data
        loadInventory();
        
    } catch (error) {
        console.error('Error initializing data manager:', error);
        showMessage('Error loading user data. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
}

// Load inventory data from user's sheet
async function loadInventory() {
    try {
        if (!currentUser || !currentUser.username) {
            throw new Error('No user logged in');
        }
        
        console.log('Loading inventory for user:', currentUser.username);
        const url = `${APP_SCRIPT_URL}?action=getInventory&username=${encodeURIComponent(currentUser.username)}`;
        console.log('Fetching from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Inventory load result:', result);
        
        if (result.success) {
            displayInventory(result.data);
            showMessage('Inventory loaded successfully', 'success');
        } else {
            showMessage('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        showMessage('Failed to load inventory: ' + error.message, 'error');
    }
}

// Display inventory in the table
function displayInventory(items) {
    const tbody = document.getElementById('inventoryBody');
    if (!tbody) {
        console.error('Inventory table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    console.log('Displaying inventory items:', items);
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No items found. Add your first item using the "Add New Item" button!</td></tr>';
        return;
    }
    
    items.forEach((item, index) => {
        const profit = (item.sellPrice - item.costPrice) * item.quantity;
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${escapeHtml(item.name)}</td>
            <td>$${Number(item.costPrice).toFixed(2)}</td>
            <td>$${Number(item.sellPrice).toFixed(2)}</td>
            <td>${Number(item.quantity)}</td>
            <td>$${Number(profit).toFixed(2)}</td>
            <td>
                <button class="btn-secondary edit-btn" data-index="${index}">Edit</button>
                <button class="btn-danger delete-btn" data-index="${index}">Delete</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Add event listeners to edit and delete buttons
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
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('itemForm');
    
    if (!modal || !modalTitle || !form) {
        console.error('Modal elements not found');
        return;
    }
    
    modalTitle.textContent = 'Add New Item';
    form.reset();
    document.getElementById('itemId').value = '';
    modal.style.display = 'block';
}

// Edit item
function editItem(item) {
    const modal = document.getElementById('itemModal');
    const modalTitle = document.getElementById('modalTitle');
    
    if (!modal || !modalTitle) {
        console.error('Modal elements not found');
        return;
    }
    
    modalTitle.textContent = 'Edit Item';
    document.getElementById('itemId').value = item.id || '';
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('costPrice').value = item.costPrice || '';
    document.getElementById('sellPrice').value = item.sellPrice || '';
    document.getElementById('quantity').value = item.quantity || '';
    
    modal.style.display = 'block';
}

// Save item (add or update)
async function saveItem(e) {
    e.preventDefault();
    
    const itemId = document.getElementById('itemId').value;
    const itemName = document.getElementById('itemName').value.trim();
    const costPrice = parseFloat(document.getElementById('costPrice').value);
    const sellPrice = parseFloat(document.getElementById('sellPrice').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    
    // Validation
    if (!itemName) {
        showMessage('Item name is required', 'error');
        return;
    }
    
    if (isNaN(costPrice) || costPrice < 0) {
        showMessage('Valid cost price is required', 'error');
        return;
    }
    
    if (isNaN(sellPrice) || sellPrice < 0) {
        showMessage('Valid sell price is required', 'error');
        return;
    }
    
    if (isNaN(quantity) || quantity < 0) {
        showMessage('Valid quantity is required', 'error');
        return;
    }
    
    const itemData = {
        id: itemId || null,
        name: itemName,
        costPrice: costPrice,
        sellPrice: sellPrice,
        quantity: quantity,
        username: currentUser.username
    };
    
    try {
        const action = itemId ? 'updateItem' : 'addItem';
        console.log('Saving item with action:', action, itemData);
        
        const response = await fetch(`${https://script.google.com/macros/s/AKfycbzDfwoONqjyBH4JT1iyZ_5f0hjc0G5dbC1Vk0FkCOiIzp6p-rrdLGFl2LtVj40MKy_ZDg/exec}?action=${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(itemData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Save item result:', result);
        
        if (result.success) {
            document.getElementById('itemModal').style.display = 'none';
            loadInventory();
            showMessage(itemId ? 'Item updated successfully' : 'Item added successfully', 'success');
        } else {
            showMessage('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving item:', error);
        showMessage('Failed to save item: ' + error.message, 'error');
    }
}

// Delete item
async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('Deleting item ID:', itemId);
        
        const response = await fetch(`${https://script.google.com/macros/s/AKfycbzDfwoONqjyBH4JT1iyZ_5f0hjc0G5dbC1Vk0FkCOiIzp6p-rrdLGFl2LtVj40MKy_ZDg/exec}?action=deleteItem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: itemId,
                username: currentUser.username
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Delete item result:', result);
        
        if (result.success) {
            loadInventory();
            showMessage('Item deleted successfully', 'success');
        } else {
            showMessage('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showMessage('Failed to delete item: ' + error.message, 'error');
    }
}

// Calculate total profit
async function calculateTotalProfit() {
    try {
        if (!currentUser || !currentUser.username) {
            throw new Error('No user logged in');
        }
        
        console.log('Calculating profit for user:', currentUser.username);
        const response = await fetch(`${https://script.google.com/macros/s/AKfycbzDfwoONqjyBH4JT1iyZ_5f0hjc0G5dbC1Vk0FkCOiIzp6p-rrdLGFl2LtVj40MKy_ZDg/exec}?action=calculateProfit&username=${encodeURIComponent(currentUser.username)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Calculate profit result:', result);
        
        if (result.success) {
            const profitSummary = document.getElementById('profitSummary');
            if (profitSummary) {
                profitSummary.innerHTML = `
                    <h3>💰 Profit Summary</h3>
                    <p><strong>Total Profit:</strong> $${Number(result.totalProfit).toFixed(2)}</p>
                    <p><strong>Total Items in Stock:</strong> ${Number(result.totalItems)}</p>
                `;
            }
            showMessage('Profit calculation completed!', 'success');
        } else {
            showMessage('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error calculating profit:', error);
        showMessage('Failed to calculate profit: ' + error.message, 'error');
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        showMessage('Logging out...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// Utility function to show messages
function showMessage(message, type) {
    console.log(`Message [${type}]:`, message);
    
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    } else {
        // Fallback to alert if message div not found
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Utility function to escape HTML (prevent XSS)
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Handle page visibility change (for mobile)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && document.getElementById('inventoryTable')) {
        // Reload inventory when coming back to the page
        loadInventory();
    }
});
