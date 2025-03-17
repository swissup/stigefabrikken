define([
    'Swissup_Firecheckout/js/utils/move',
    'Magento_Ui/js/lib/view/utils/async'
], function (move,$) {
    'use strict';

    // Move checkout fields to the desired position
    move('.swissup-checkout-fields').after('.block.items-in-cart', 0);

    // DataLayer for email tracking
    $.async('#customer-email', $('#checkout').get(0),
        function (emailInput) {
            var prev = '',
            validateEmail = $.validator.methods['validate-email'];

            $(emailInput).on('blur', function () {
                var email = $(this).val();
                if (email !== prev && validateEmail(email)) {
                    prev = email;
                    window.dataLayer = window.dataLayer || [];
                    dataLayer.push({
                        event: 'email_added',
                        user_data: {
                            email: email,
                        }
                    });
                }
            });
        }
    );
    
    // Address tracking - optimized version
    $.async('.form-shipping-address', $('#checkout').get(0),
        function (addressForm) {
            var addressPushed = false;
            
            function checkAddressComplete() {
                var isComplete = true;
                var requiredFields = $(".form-shipping-address").find('input[aria-required="true"], select[aria-required="true"]');
                
                var userData = {
                    email: $('#customer-email').val(),
                    phone_number: $('[name="telephone"]').val(),
                    address: [{
                        first_name: $('[name="firstname"]').val(),
                        last_name: $('[name="lastname"]').val(),
                        street: $('[name="street[0]"]').val(),
                        city: $('[name="city"]').val(),
                        postal_code: $('[name="postcode"]').val(),
                        country: $('[name="country_id"]').val() ? $('[name="country_id"]').val().toLowerCase() : ''
                    }]
                };
                
                requiredFields.each(function() {
                    var field = $(this);
                    if (field.val() === '' || field.hasClass('mage-error') || 
                        field.closest('.field').hasClass('_error') || 
                        field.attr('aria-invalid') === 'true') {
                        isComplete = false;
                        return false;
                    }
                });
                
                if (isComplete && !addressPushed) {
                    addressPushed = true;
                    window.dataLayer = window.dataLayer || [];
                    dataLayer.push({
                        event: 'address_added',
                        user_data: userData
                    });
                } else if (!isComplete) {
                    addressPushed = false;
                }
            }
            
            $(addressForm).on('change blur', 'input[aria-required="true"], select[aria-required="true"]', function() {
                setTimeout(checkAddressComplete, 300);
            });
        }
    );
    
    // Payment confirmation tracking - optimized for Nordic currencies
    $.async('button.action.primary.checkout', $('#checkout').get(0),
        function (confirmButton) {
            $(confirmButton).on('click', function() {
                var currency = "DKK";
                
                if (window.checkoutConfig && window.checkoutConfig.quoteData && 
                    window.checkoutConfig.quoteData.quote_currency_code) {
                    currency = window.checkoutConfig.quoteData.quote_currency_code;
                } else {
                    var htmlLang = $('html').attr('lang') || '';
                    var urlPath = window.location.pathname;
                    
                    if (htmlLang.includes('sv') || urlPath.includes('/sv/') || urlPath.includes('/se/')) {
                        currency = 'SEK';
                    } else if (htmlLang.includes('no') || urlPath.includes('/no/') || urlPath.includes('/nb/')) {
                        currency = 'NOK';
                    }
                }
                
                var orderTotalText = $('.grand.totals.incl .price').text() || "0";
                var orderTotal = parseFloat(orderTotalText.replace(/[^\d,\.]/g, '').replace(',', '.')) || 0;
                
                var items = [];
                $('.opc-block-summary ol.minicart-items .product-item').each(function() {
                    var $item = $(this);
                    items.push({
                        item_name: $item.find('.product-item-name').text().trim(),
                        item_id: $item.find('.product-item-sku').text().replace('Varenummer:', '').trim(),
                        price: parseFloat($item.find('.price').text().replace(/[^\d,\.]/g, '').replace(',', '.')) / 
                               (parseInt($item.find('.qty').val()) || 1),
                        quantity: parseInt($item.find('.qty').val()) || 1
                    });
                });
                
                var paymentMethod = $('input[name="payment[method]"]:checked').data('method') || '';
                
                window.dataLayer = window.dataLayer || [];
                dataLayer.push({
                    event: "add_payment_info",
                    ecommerce: {
                        currency: currency,
                        value: orderTotal,
                        items: items,
                        payment_type: paymentMethod
                    }
                });
            });
        }
    );
});