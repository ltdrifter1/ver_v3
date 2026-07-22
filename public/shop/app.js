// Frontend JavaScript for handling "Add to Cart" buttons
document.addEventListener('DOMContentLoaded', function () {
    // Make sure to bind the event listeners for any 'add-to-cart' button
    const addButtons = document.querySelectorAll('.add-to-cart-btn');

    addButtons.forEach(button => {
        // Ensure button is visible via JS (useful for dynamically loaded content)
        button.style.visibility = 'visible'; 
        button.addEventListener('click', function () {
            const name = button.getAttribute('data-name');
            const price = parseFloat(button.getAttribute('data-price'));
            if (name && !isNaN(price)) {
                addToCart(name, price);
            } else {
                console.error('Invalid product data');
            }
        });
    });
});

// Function to add items to the cart
function addToCart(name, price) {
    // Get the existing cart from localStorage or initialize an empty cart
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // Check if the item already exists in the cart
    const existingItem = cart.find(item => item.name === name);
    
    if (existingItem) {
        // If item exists, update its quantity
        existingItem.quantity += 1;
    } else {
        // Otherwise, add a new item to the cart
        cart.push({ name, price, quantity: 1 });
    }

    // Save the updated cart back to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));

    // Display a confirmation message
    alert(`${name} added to cart!`);

    // Optionally, update cart icon or cart count
    updateCartIcon();
}

// Function to update the cart count in the header/cart icon
function updateCartIcon() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0); // Sum the quantities
    const cartCountElement = document.getElementById('cart-count');

    if (cartCountElement) {
        cartCountElement.textContent = cartCount;
    }
}

// Call updateCartIcon on page load to initialize the cart count
updateCartIcon();
