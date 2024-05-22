define([
    'Magento_Ui/js/lib/view/utils/async',
    'argentoSticky',
    'domReady!'
], function($) {
    $('.layered-filter-block-container').argentoSticky({
        media: '(min-width: 768px) and (min-height: 600px)',
        parent: $('.page-main'),
        offset_top: 180
    });
    // Move the tax
    $(".product-info-price>div.price-box .product-usp-info .price-tax-label").appendTo(".product-info-price .price-container");

});