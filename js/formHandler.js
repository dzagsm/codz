// Form field names
const FIELD_NAMES = {
    phoneNumber: "extra_fields[custom_field_tu2DLh0lAkUbo63f]",
    wilaya: "extra_fields[custom_field_utgP5zvENdO1aOcU]",
    commune: "extra_fields[custom_field_Z61SR11WaVdi4I3x]",
    deliveryOption: "extra_fields[custom_field_pUkUaozcQn7ZauLx]",
    deliveryPrice: "extra_fields[custom_field_fxYCOTcrDrflGANv]",
    address: "extra_fields[custom_field_c725WmqO53XYKywu]"
};

// Initialize form elements
const elements = {
    phoneInput: document.querySelector(`input[name='${FIELD_NAMES.phoneNumber}']`),
    wilayaSelect: document.querySelector(`select[name='${FIELD_NAMES.wilaya}']`),
    communeSelect: document.querySelector(`select[name='${FIELD_NAMES.commune}']`),
    deliveryOptionSelect: document.querySelector(`select[name='${FIELD_NAMES.deliveryOption}']`),
    addressInput: document.querySelector(`input[name='${FIELD_NAMES.address}']`),
    deliveryPriceInput: document.querySelector(`input[name='${FIELD_NAMES.deliveryPrice}']`),
    submitButtons: document.getElementsByClassName("single-submit"),
    checkoutSummary: null
};

// Add checkout summary to form
function addCheckoutSummary() {
    const checkoutForm = document.querySelector(".checkout-form");
    if (checkoutForm) {
        const summaryDiv = document.createElement('div');
        summaryDiv.id = 'checkout-summary';
        summaryDiv.innerHTML = `
            <div class="summary-header" onclick='toggleSummary()'>
                <span>🛒️ ملخص الطلبية ⬇</span>
            </div>
            <div class="summary-content" style="display: none;">
                <div class="summary-item">
                    <span>رقم الهاتف:</span>
                    <span id="summary-phone"></span>
                </div>
                <div class="summary-item">
                    <span>الولاية:</span>
                    <span id="summary-wilaya"></span>
                </div>
                <div class="summary-item">
                    <span>البلدية:</span>
                    <span id="summary-commune"></span>
                </div>
                <div class="summary-item">
                    <span>طريقة التوصيل:</span>
                    <span id="summary-delivery"></span>
                </div>
                <div class="summary-item" id="summary-address-container" style="display: none;">
                    <span>العنوان:</span>
                    <span id="summary-address"></span>
                </div>
                <div class="summary-item">
                    <span>سعر التوصيل:</span>
                    <span id="summary-price"></span>
                </div>
            </div>
        `;
        checkoutForm.appendChild(summaryDiv);
        elements.checkoutSummary = summaryDiv;
    }
}

// Toggle summary visibility
function toggleSummary() {
    const content = elements.checkoutSummary.querySelector('.summary-content');
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
    updateSummary();
}

// Update summary content
function updateSummary() {
    if (elements.checkoutSummary.querySelector('.summary-content').style.display === 'none') return;

    document.getElementById('summary-phone').textContent = elements.phoneInput.value || '-';
    document.getElementById('summary-wilaya').textContent = elements.wilayaSelect.value || '-';
    document.getElementById('summary-commune').textContent = elements.communeSelect.value || '-';
    document.getElementById('summary-delivery').textContent = elements.deliveryOptionSelect.value || '-';
    document.getElementById('summary-price').textContent = elements.deliveryPriceInput.value || '-';

    const addressContainer = document.getElementById('summary-address-container');
    const addressSpan = document.getElementById('summary-address');
    
    if (elements.deliveryOptionSelect.value === "التوصيل للمنزل") {
        addressContainer.style.display = 'block';
        addressSpan.textContent = elements.addressInput.value || '-';
    } else {
        addressContainer.style.display = 'none';
    }
}

// Handle phone number validation
function validatePhoneNumber() {
    const isValid = elements.phoneInput.value.match(/^(05|06|07)[0-9]{8}$/);
    const backgroundColor = isValid ? "white" : "#f8d7da";
    
    elements.phoneInput.style.setProperty("background-color", backgroundColor, "important");
    elements.phoneInput.style.setProperty("color", "black", "important");
    
    Array.from(elements.submitButtons).forEach(button => {
        button.disabled = !isValid;
    });

    updateSummary();
}

// Populate wilaya select
function populateWilayas() {
    elements.wilayaSelect.innerHTML = '<option value="">اختر الولاية</option>';
    window.locationData.wilayas.forEach(wilaya => {
        const option = document.createElement('option');
        option.value = wilaya;
        option.textContent = wilaya;
        elements.wilayaSelect.appendChild(option);
    });
}

// Update communes based on selected wilaya
function updateCommunes() {
    const selectedWilaya = elements.wilayaSelect.value;
    elements.communeSelect.innerHTML = '<option value="">اختر البلدية</option>';
    
    if (selectedWilaya && window.locationData.communes[selectedWilaya]) {
        window.locationData.communes[selectedWilaya].forEach(commune => {
            const option = document.createElement('option');
            option.value = commune;
            option.textContent = commune;
            elements.communeSelect.appendChild(option);
        });
    }
    
    updateDeliveryPrice();
    updateSummary();
}

// Update delivery price based on wilaya and delivery option
function updateDeliveryPrice() {
    const selectedWilaya = elements.wilayaSelect.value;
    const deliveryOption = elements.deliveryOptionSelect.value;
    
    let price = 0;
    if (deliveryOption === "التوصيل للمنزل" && selectedWilaya) {
        price = window.locationData.deliveryPrices[selectedWilaya] || 0;
    }
    
    elements.deliveryPriceInput.value = price ? `${price} دج` : '';
    updateSummary();
}

// Handle address field visibility
function handleAddressVisibility() {
    const isHomeDelivery = elements.deliveryOptionSelect.value === "التوصيل للمنزل";
    elements.addressInput.disabled = !isHomeDelivery;
    elements.addressInput.required = isHomeDelivery;
    
    if (!isHomeDelivery) {
        elements.addressInput.value = "";
    }
    
    updateDeliveryPrice();
    updateSummary();
}

// Initialize form
function initializeForm() {
    // Add phone number validation
    if (elements.phoneInput) {
        elements.phoneInput.setAttribute("id", FIELD_NAMES.phoneNumber);
        elements.phoneInput.setAttribute("pattern", "(05|06|07)[0-9]{8}");
        elements.phoneInput.addEventListener("input", validatePhoneNumber);
    }

    // Initialize address field
    if (elements.addressInput) {
        elements.addressInput.disabled = true;
        elements.addressInput.addEventListener("input", updateSummary);
    }

    // Add event listeners
    elements.wilayaSelect.addEventListener("change", updateCommunes);
    elements.communeSelect.addEventListener("change", updateSummary);
    elements.deliveryOptionSelect.addEventListener("change", handleAddressVisibility);

    // Populate initial data
    populateWilayas();
    addCheckoutSummary();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeForm);

// Make functions available globally
window.toggleSummary = toggleSummary;
