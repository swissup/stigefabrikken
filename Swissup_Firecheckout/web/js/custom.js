define([
    'Swissup_Firecheckout/js/utils/move',
    'Magento_Ui/js/lib/view/utils/async',
    'Swissup_Firecheckout/js/utils/form-field/validator',
    'Swissup_Firecheckout/js/utils/form-field/manager',
    'mage/translate'], function (move,$,validator,manager,$t) {
    'use strict';

    // Move checkout fields to the desired position
    move('.swissup-checkout-fields').after('.fc-order-summary-copy .table-totals', 0);

    // `Street Address: Line 1` - rename to `Street Address`
    manager('[name="street[0]"]', {
        label: $t('Street Address'),
        placeholder: $t('Street Address'),
    });
        
    // rename multiple Street Address fields
    var streetFields = {
       '[name="street[0]"]': 'Street Address' 
    //    '[name="street[1]"]': 'Street Address 2',
    //    '[name="street[2]"]': 'Street Address 3'
    };
  
    for (var key in streetFields) {         
        manager(key, {
            label: $t(streetFields[key]),
            placeholder: $t(streetFields[key]),
        });
    }  
    
    
    // (Any custom validator should start from `fc-custom-rule` prefix)
    validator('[name="street[0]"]', {
        'lazy': true, // run first validation on `blur` event instead of default instant validation
        'fc-custom-rule-address': {
            handler: function (value) {
                return new RegExp(/^(?=.*[0-9])(?=.*[a-zA-Z]).*$/).test(value);
            },
            message: $t('Please enter both letters and numbers in the street address.')
        }
    });

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
                    var itemName = $item.find('.product-item-name').text().trim();
                    var itemId = $item.find('.product-item-sku').text().replace('Varenummer:', '').trim();
                                    var priceText = $item.find('.price').text();
                                    var price = parseFloat(
                                        priceText
                                            .replace(/[^\d,\.]/g, '') // Remove currency symbols and spaces
                                            .replace(/\./g, '')       // Remove thousand separators (periods)
                                            .replace(',', '.')        // Replace decimal comma with period
                                    ) / (parseInt($item.find('.qty').val()) || 1);
                    var quantity = parseInt($item.find('.qty').val()) || 1;
                    
                    // Get additional product data from data attributes or defaults
                    var $productEl = $item.closest('.product-item');
                    var affiliation = $('meta[name="store"]').attr('content') || "Main Website - Stigefabrikken.dk - Default Store View";
                    var itemBrand = $productEl.data('brand') || itemName.split(' ')[0] || "Jumbo";
                    var category = $productEl.data('category') || "Mærker";
                    var category2 = itemBrand;
                    var listName = category + "/" + category2;
                    var listId = $productEl.data('list-id') || "88";
                    var stockStatus = $productEl.hasClass('out-of-stock') ? "Out of stock" : "In stock";
                    var saleProduct = $productEl.hasClass('on-sale') ? "Yes" : "No";
                    var reviewsCount = $productEl.data('reviews-count') || "0";
                    var reviewsScore = $productEl.data('reviews-score') || "0";
                    
                    items.push({
                        item_name: itemName,
                        affiliation: affiliation,
                        item_id: itemId,
                        price: price,
                        item_brand: itemBrand,
                        item_category: category,
                        item_category2: category2,
                        item_list_name: listName,
                        item_list_id: listId,
                        quantity: quantity,
                        item_stock_status: stockStatus,
                        item_sale_product: saleProduct,
                        item_reviews_count: reviewsCount,
                        item_reviews_score: reviewsScore
                    });
                });
                
                var paymentMethod = $('input[name="payment[method]"]:checked').data('method') || '';
                var paymentMethodText = $('input[name="payment[method]"]:checked').closest('.payment-method').find('.payment-method-title').text().trim() || 
                                       'Faktura - Kun for erhvervskunder (Kredit forudsat positiv kreditvurdering)';
                
                // Create payment data object
                var paymentData = {
                    event: "add_payment_info",
                    ecommerce: {
                        currency: currency,
                        value: orderTotal,
                        items: items,
                        payment_type: paymentMethodText
                    }
                };
                /*
                // Log payment tracking information as a table
                console.group('Payment Tracking Information');
                console.log('Event: add_payment_info');
                console.log('Currency: ' + currency);
                console.log('Total Value: ' + orderTotal);
                console.log('Payment Method: ' + paymentMethodText);
                
                // Log items table
                console.log('Items:');
                console.table(items);
                
                // Log the full data structure
                console.log('Full payment data:');
                console.log(paymentData);
                console.groupEnd();
                */
                // Push data to dataLayer
                window.dataLayer = window.dataLayer || [];
                dataLayer.push(paymentData);
            });
        }
    );

    // Add billing address title
    $.async('.billing-address-form', $('#checkout').get(0),
        function (billingAddressForm) {
            if ($(billingAddressForm).length && !$(billingAddressForm).prev('.step-title[data-role="title"]').length) {
                var titleElement = $('<div/>', {
                    'class': 'step-title',
                    'data-bind': 'i18n: \'Billing Address\'',
                    'data-role': 'title',
                    'data-translate': '[{"shown":"Faktureringsadresse","translated":"Faktureringsadresse","original":"Billing Address","location":"Text"}]',
                    'text': 'Faktureringsadresse'
                });
                
                $(titleElement).insertBefore(billingAddressForm);
            }
        }
    );
});