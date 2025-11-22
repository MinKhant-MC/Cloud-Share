// Configuration
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby_aM3luY5gR3eUTJsRI2lsU3hMtlNvA2dWNRLaAvF2e3loRd6BKmDXGxsRgGO1fw3I0Q/exec'; // Replace with your deployed web app URL

// DOM Elements
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on
    if (document.getElementById('loginForm')) {
        initLoginPage();
    } else if (document.getElementById('inventoryTable')) {
        initDataManagerPage();
    }
});

// Login Page Functions
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${https://script.google.com/macros/s/AKfycby_aM3luY5gR3eUTJsRI2lsU3hMtlNvA2dWNRLaAvF2e3loRd6BKmDXGxsRgGO1fw3I0Q/exec}?action=login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Store user data in localStorage
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                // Redirect to data manager
                window.location.href = 'data-manager.html';
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('An error occurred during login. Please try again.', 'error');
        }
    });
}

// Data Manager Page Functions
function initDataManagerPage() {
    // Check if user is logged in
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userData);
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
}

// Load inventory data from user's sheet
async function loadInventory() {
    try {
        const response = await fetch(`${https://script.google.com/macros/s/AKfycby_aM3luY5gR3eUTJsRI2lsU3hMtlNvA2dWNRLaAvF2e3loRd6BKmDXGxsRgGO1fw3I0Q/exec}?action=getInventory&username=${encodeURIComponent(currentUser.username)}`);
        const result = await response.json();
        
        if (result.success) {
            displayInventory(result.data);
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        showMessage('Error loading inventory data', 'error');
    }
}

// Display inventory in the table
function displayInventory(items) {
    const tbody = document.getElementById('inventoryBody');
    tbody.innerHTML = '';
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No items found. Add your first item!</td></tr>';
        return;
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
    
    modalTitle.textContent = 'Add New Item';
    form.reset();
    document.getElementById('itemId').value = '';
    modal.style.display = 'block';
}

// Edit item
function editItem(item) {
    const modal = document.getElementById('itemModal');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Edit Item';
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('costPrice').value = item.costPrice;
    document.getElementById('sellPrice').value = item.sellPrice;
    document.getElementById('quantity').value = item.quantity;
    
    modal.style.display = 'block';
}

// Save item (add or update)
async function saveItem(e) {
    e.preventDefault();
    
    const itemId = document.getElementById('itemId').value;
    const itemName = document.getElementById('itemName').value;
    const costPrice = parseFloat(document.getElementById('costPrice').value);
    const sellPrice = parseFloat(document.getElementById('sellPrice').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    
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
        const response = await fetch(`${https://script.google.com/macros/s/AKfycby_aM3luY5gR3eUTJsRI2lsU3hMtlNvA2dWNRLaAvF2e3loRd6BKmDXGxsRgGO1fw3I0Q/exec}?action=${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(itemData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Close modal and refresh inventory
            document.getElementById('itemModal').style.display = 'none';
            loadInventory();
            showMessage(itemId ? 'Item updated successfully' : 'Item added successfully', 'success');
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving item:', error);
        showMessage('Error saving item', 'error');
    }
}

// Delete item
async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    try {
        const response = await fetch(`${https://script.google.com/macros/s/AKfycby_aM3luY5gR3eUTJsRI2lsU3hMtlNvA2dWNRLaAvF2e3loRd6BKmDXGxsRgGO1fw3I0Q/exec}?action=deleteItem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: itemId,
                username: currentUser.username
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadInventory();
            showMessage('Item deleted successfully', 'success');
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showMessage('Error deleting item', 'error');
    }
}

// Calculate total profit
async function calculateTotalProfit() {
    try {
        const response = await fetch(`${https://script.google.com/macros/s/AKfycby_aM3luY5gR3eUTJsRI2lsU3hMtlNvA2dWNRLaAvF2e3loRd6BKmDXGxsRgGO1fw3I0Q/exec}?action=calculateProfit&username=${encodeURIComponent(currentUser.username)}`);
        const result = await response.json();
        
        if (result.success) {
            const profitSummary = document.getElementById('profitSummary');
            profitSummary.innerHTML = `
                <h3>Profit Summary</h3>
                <p>Total Profit: $${result.totalProfit.toFixed(2)}</p>
                <p>Total Items: ${result.totalItems}</p>
            `;
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Error calculating profit:', error);
        showMessage('Error calculating profit', 'error');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Utility function to show messages
function showMessage(message, type) {
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
        alert(message);
    }
}
