<?php
/**
 * Plugin Name: My COD Plugin
 * Plugin URI: https://yourwebsite.com
 * Description: إضافة WooCommerce مخصصة للدفع عند الاستلام مع تكامل مع Firebase Firestore لتخزين الطلبات وإدارتها.
 * Version: 1.4
 * Author: Your Name
 * Author URI: https://yourwebsite.com
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// تسجيل طريقة الدفع عند الاستلام
add_filter('woocommerce_payment_gateways', 'my_cod_add_gateway');
function my_cod_add_gateway($gateways) {
    $gateways[] = 'WC_My_COD_Gateway';
    return $gateways;
}

// إنشاء كلاس الدفع عند الاستلام
add_action('plugins_loaded', 'my_cod_init_gateway');
function my_cod_init_gateway() {
    class WC_My_COD_Gateway extends WC_Payment_Gateway {
        public function __construct() {
            $this->id = 'my_cod';
            $this->method_title = __('الدفع عند الاستلام', 'woocommerce');
            $this->method_description = __('تمكين الدفع عند الاستلام مع تكامل Firebase.', 'woocommerce');
            $this->has_fields = false;

            // تحميل الإعدادات
            $this->init_form_fields();
            $this->init_settings();
            
            $this->title = $this->get_option('title');
            $this->extra_fee = $this->get_option('extra_fee');
            
            // حفظ الإعدادات عند التحديث
            add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
        }

        // إعدادات طريقة الدفع
        public function init_form_fields() {
            $this->form_fields = array(
                'enabled' => array(
                    'title' => __('تفعيل', 'woocommerce'),
                    'type' => 'checkbox',
                    'label' => __('تفعيل الدفع عند الاستلام', 'woocommerce'),
                    'default' => 'yes'
                ),
                'title' => array(
                    'title' => __('عنوان طريقة الدفع', 'woocommerce'),
                    'type' => 'text',
                    'default' => __('الدفع عند الاستلام', 'woocommerce'),
                ),
                'extra_fee' => array(
                    'title' => __('رسوم إضافية', 'woocommerce'),
                    'type' => 'number',
                    'description' => __('رسوم إضافية عند اختيار الدفع عند الاستلام', 'woocommerce'),
                    'default' => '0',
                )
            );
        }

        // معالجة الدفع
        public function process_payment($order_id) {
            $order = wc_get_order($order_id);
            $order->update_status('wc-cod-processing', __('طلب COD قيد التوصيل.', 'woocommerce'));
            $order->reduce_order_stock();
            WC()->cart->empty_cart();

            // إرسال الطلب إلى Firebase Firestore
            my_cod_send_order_to_firebase($order);
            
            return array(
                'result' => 'success',
                'redirect' => $this->get_return_url($order)
            );
        }
    }
}

// تكامل WooCommerce مع Firebase Firestore
function my_cod_send_order_to_firebase($order) {
    $order_data = array(
        'order_id' => $order->get_id(),
        'customer_name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
        'address' => $order->get_billing_address_1(),
        'city' => $order->get_billing_city(),
        'phone' => $order->get_billing_phone(),
        'total' => $order->get_total(),
        'status' => $order->get_status(),
        'tracking_number' => ''
    );

    $firebase_url = 'https://your-firebase-project.firebaseio.com/orders.json';
    $response = wp_remote_post($firebase_url, array(
        'body' => json_encode($order_data),
        'headers' => array('Content-Type' => 'application/json'),
    ));
    
    if (is_wp_error($response)) {
        error_log('Firebase API Error: ' . $response->get_error_message());
    }
}

// تحديث رقم التتبع في Firebase عند تغييره في WooCommerce
add_action('woocommerce_order_status_changed', 'my_cod_update_tracking_in_firebase', 10, 3);
function my_cod_update_tracking_in_firebase($order_id, $old_status, $new_status) {
    $order = wc_get_order($order_id);
    $tracking_number = get_post_meta($order_id, '_tracking_number', true);
    $firebase_url = 'https://your-firebase-project.firebaseio.com/orders/' . $order_id . '.json';
    
    $update_data = array(
        'status' => $new_status,
        'tracking_number' => $tracking_number
    );

    wp_remote_request($firebase_url, array(
        'method' => 'PATCH',
        'body' => json_encode($update_data),
        'headers' => array('Content-Type' => 'application/json'),
    ));
}

// إضافة رقم تتبع للطلب
add_action('woocommerce_admin_order_data_after_order_details', 'my_cod_add_tracking_field');
function my_cod_add_tracking_field($order) {
    echo '<p><strong>رقم التتبع:</strong> ' . get_post_meta($order->get_id(), '_tracking_number', true) . '</p>';
}

// حفظ رقم التتبع عند التحديث
add_action('woocommerce_process_shop_order_meta', 'my_cod_save_tracking_field');
function my_cod_save_tracking_field($order_id) {
    if (isset($_POST['_tracking_number'])) {
        update_post_meta($order_id, '_tracking_number', sanitize_text_field($_POST['_tracking_number']));
        my_cod_update_tracking_in_firebase($order_id, '', 'wc-cod-processing');
    }
}
