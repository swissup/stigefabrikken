define([
    'Swissup_Firecheckout/js/utils/move'
], function (move) {
    'use strict';

    // Since "Order Review" is moved after summary title too, we need to use `sortOrder`
    // as a second argument to place "Checkout Fields" before "Order Review":
    move('.swissup-checkout-fields').after('.block.items-in-cart', 0);

    // OR move above order summary:
    // move('.swissup-checkout-fields').before('.opc-block-summary');
});