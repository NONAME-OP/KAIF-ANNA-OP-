/* ═══════════════════════════════════════════════════════════════
   KAIF'S CLOUD KITCHEN — GSAP + LEAFLET MAP + UPI QR + GPS ENGINE
   ═══════════════════════════════════════════════════════════════ */

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import L from 'leaflet';
import QRCode from 'qrcode';
import { auth, googleProvider, signInWithPopup, isFirebaseConfigured } from './firebase.js';

gsap.registerPlugin(ScrollTrigger);

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE = rawApiUrl ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`) : '/api';

// ─── Kitchen Origin Location (Loaded from LocalStorage or Default Mumbai HQ) ───
const DEFAULT_KITCHEN = {
  lat: 19.0596,
  lng: 72.8295,
  name: "Kaif's Cloud Kitchen HQ, Bandra West",
  address: "Plot 14, Pali Naka, Bandra West, Mumbai 400050",
  ownerPhone: "+919876543210"
};
let KITCHEN_HQ = JSON.parse(localStorage.getItem('kaif_kitchen_hq') || 'null') || DEFAULT_KITCHEN;

// ─── State ───────────────────────────────────────────────────
let accessToken = localStorage.getItem('accessToken') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let allProducts = [];
let filteredProducts = [];
let currentFilter = 'all';
let searchQuery = '';
let cart = JSON.parse(localStorage.getItem('kaif_cart') || '[]');

// Delivery & Location State
let customerLocation = {
  lat: 19.0645,
  lng: 72.8335,
  address: "Pali Hill, Bandra West, Mumbai 400050",
  distanceKm: 1.8,
  deliveryFee: 40,
  etaMinutes: 20
};
let merchantUpiId = localStorage.getItem('kaif_merchant_upi') || 'kaif@upi';
let appliedCoupon = JSON.parse(localStorage.getItem('kaif_coupon') || 'null');
let currentTrackingOrder = null;

// Map Instances
let checkoutMap = null;
let checkoutCustomerMarker = null;
let checkoutKitchenMarker = null;
let trackingMap = null;
let trackingDriverMarker = null;
let trackingOriginMarker = null;
let trackingDestMarker = null;
let trackingRouteLine = null;
let driverProgress = 0.25; // 0.0 to 1.0 along route
let driverInterval = null;

// ─── DOM Elements ────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Nav & Scroll
const navbar = $('#navbar');
const scrollProgressBar = $('#scroll-progress-bar');
const navHamburger = $('#nav-hamburger');
const mobileDrawer = $('#mobile-drawer');
const mobileDrawerClose = $('#mobile-drawer-close');
const mobileCartBar = $('#mobile-cart-bar');
const mobileCartQty = $('#mobile-cart-qty');
const mobileCartTotal = $('#mobile-cart-total');
const mobileCartBtn = $('#mobile-cart-btn');

// Cart
const navCartBtn = $('#nav-cart-btn');
const cartBadge = $('#cart-badge');
const cartDrawerOverlay = $('#cart-drawer-overlay');
const cartCloseBtn = $('#cart-close-btn');
const cartItemsList = $('#cart-items-list');
const cartEmptyView = $('#cart-empty-view');
const cartItemsCount = $('#cart-items-count');
const cartSubtotal = $('#cart-subtotal');
const cartDeliveryFee = $('#cart-delivery-fee');
const cartTotal = $('#cart-total');
const deliveryProgressText = $('#delivery-progress-text');
const deliveryProgressBar = $('#delivery-progress-bar');
const btnProceedCheckout = $('#btn-proceed-checkout');
const btnExploreFromCart = $('#btn-explore-from-cart');

// Checkout & Map Modal
const checkoutModal = $('#checkout-modal');
const checkoutCloseBtn = $('#checkout-close-btn');
const checkoutStep1 = $('#checkout-step-1');
const checkoutStep2 = $('#checkout-step-2');
const stepPill1 = $('#step-pill-1');
const stepPill2 = $('#step-pill-2');
const checkoutTitle = $('#checkout-title');
const checkoutSubtitle = $('#checkout-subtitle');
const calcDistance = $('#calc-distance');
const calcFee = $('#calc-fee');
const calcEta = $('#calc-eta');
const inputAddress = $('#input-address');
const btnToPayment = $('#btn-to-payment');
const btnBackToAddress = $('#btn-back-to-address');

// UPI Payment Elements
const upiQrCanvas = $('#upi-qr-canvas');
const upiPayAmount = $('#upi-pay-amount');
const inputMerchantUpi = $('#input-merchant-upi');
const btnCopyUpi = $('#btn-copy-upi');
const upiItemCount = $('#upi-item-count');
const upiSummaryDist = $('#upi-summary-dist');
const upiSummaryFee = $('#upi-summary-fee');
const btnVerifyUpi = $('#btn-verify-upi');
const btnVerifyText = $('#btn-verify-text');
const verifySpinner = $('#verify-spinner');

// Tracking Modal
const trackingModal = $('#tracking-modal');
const trackingCloseBtn = $('#tracking-close-btn');
const trackingEtaPill = $('#tracking-eta-pill');
const btnStepDriver = $('#btn-step-driver');
const pipelineFinalStep = $('#pipeline-final-step');

// Menu
const menuGrid = $('#menu-grid');
const menuLoading = $('#menu-loading');
const menuEmpty = $('#menu-empty');
const menuSearch = $('#menu-search');
const clearSearchBtn = $('#clear-search');
const btnResetFilters = $('#btn-reset-filters');

// Signatures Carousel
const signaturesTrack = $('#signatures-track');
const sigPrev = $('#sig-prev');
const sigNext = $('#sig-next');

// Modals
const productModal = $('#product-modal');
const modalClose = $('#modal-close');
const modalImg = $('#modal-img');
const modalName = $('#modal-name');
const modalDesc = $('#modal-desc');
const modalPrice = $('#modal-price');
const modalAvail = $('#modal-availability');
const modalHeat = $('#modal-heat');
const modalOrderBtn = $('#modal-order-btn');

// Auth
const authModal = $('#auth-modal');
const authModalClose = $('#auth-modal-close');
const authForm = $('#auth-form');
const authTitle = $('#auth-title');
const authSubtitle = $('#auth-subtitle');
const authNameGroup = $('#auth-name-group');
const authName = $('#auth-name');
const authEmail = $('#auth-email');
const authPassword = $('#auth-password');
const authError = $('#auth-error');
const authSuccess = $('#auth-success');
const authSubmitText = $('#auth-submit-text');
const authSpinner = $('#auth-spinner');
const authSwitchLink = $('#auth-switch-link');
const authSwitchText = $('#auth-switch-text');
const btnSignIn = $('#btn-signin');
const btnSignUp = $('#btn-signup');
const btnLogout = $('#btn-logout');
const navUserInfo = $('#nav-user-info');
const userGreeting = $('#user-greeting');
let authMode = 'login';

const toastContainer = $('#toast-container');


// ═══════════════════════════════════════════════════════════════
//  1. LENIS SMOOTH SCROLL & GSAP SYNC
// ═══════════════════════════════════════════════════════════════

let lenis;

function initLenis() {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId && targetId !== '#') {
        const target = $(targetId);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -60 });
          if (mobileDrawer) mobileDrawer.classList.remove('open');
        }
      }
    });
  });
}


// ═══════════════════════════════════════════════════════════════
//  2. KINETIC TYPOGRAPHY & SCROLL PROGRESS REVEALS
// ═══════════════════════════════════════════════════════════════

function initTypographyAnimations() {
  // Top progress bar
  if (scrollProgressBar) {
    gsap.to(scrollProgressBar, {
      width: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.1,
      }
    });
  }

  // Scrolled navbar style
  ScrollTrigger.create({
    start: 'top -50',
    end: 99999,
    toggleClass: {
      className: 'scrolled',
      targets: '#navbar'
    }
  });

  // Kinetic Hero Text Reveal
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

  tl.from('.hero-pill-badge', { y: -25, opacity: 0, duration: 0.8, delay: 0.1 })
    .from('.word-split', {
      yPercent: 120,
      rotateZ: 4,
      opacity: 0,
      stagger: 0.08,
      duration: 0.95,
    }, '-=0.4')
    .from('.text-reveal-lead', { y: 30, opacity: 0, duration: 0.8 }, '-=0.5')
    .from('.hero-cta-group .btn', { y: 20, opacity: 0, stagger: 0.12, duration: 0.7 }, '-=0.5')
    .from('.interactive-stage', { y: 40, opacity: 0, duration: 0.9 }, '-=0.4');

  // Section Headings kinetic scroll trigger
  $$('.text-reveal-heading').forEach(el => {
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
      },
      y: 35,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    });
  });
}


// ═══════════════════════════════════════════════════════════════
//  3. MOBILE NAVIGATION DRAWER & QUICK-CART BAR
// ═══════════════════════════════════════════════════════════════

function initMobileInteractions() {
  if (navHamburger && mobileDrawer) {
    navHamburger.addEventListener('click', () => {
      mobileDrawer.classList.add('open');
    });
  }

  if (mobileDrawerClose && mobileDrawer) {
    mobileDrawerClose.addEventListener('click', () => {
      mobileDrawer.classList.remove('open');
    });
  }

  const mobileBtnSignIn = $('#mobile-btn-signin');
  if (mobileBtnSignIn) {
    mobileBtnSignIn.addEventListener('click', () => {
      if (mobileDrawer) mobileDrawer.classList.remove('open');
      openAuthModal('login');
    });
  }

  if (mobileCartBtn) {
    mobileCartBtn.addEventListener('click', () => {
      openCart();
    });
  }
}


// ═══════════════════════════════════════════════════════════════
//  4. DISTANCE & HAVERSINE CALCULATION
// ═══════════════════════════════════════════════════════════════

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function updateDeliveryCalculations(lat, lng, addressName) {
  customerLocation.lat = lat;
  customerLocation.lng = lng;
  if (addressName) customerLocation.address = addressName;

  const dist = calculateHaversineKm(KITCHEN_HQ.lat, KITCHEN_HQ.lng, lat, lng);
  customerLocation.distanceKm = Math.max(dist, 0.8);

  // Dynamic fee calculation: Base 35 + 8/km
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const isFree = subtotal >= 500;
  const rawFee = 35 + Math.round(customerLocation.distanceKm * 8);
  customerLocation.deliveryFee = isFree ? 0 : Math.round(rawFee / 5) * 5;
  customerLocation.etaMinutes = Math.min(Math.round(15 + customerLocation.distanceKm * 3.5), 45);

  if (calcDistance) calcDistance.textContent = `${customerLocation.distanceKm} km`;
  if (calcFee) calcFee.textContent = isFree ? 'FREE (Feast Pass)' : `₹${customerLocation.deliveryFee}`;
  if (calcEta) calcEta.textContent = `${customerLocation.etaMinutes} mins`;
  if (inputAddress && addressName) inputAddress.value = customerLocation.address;

  // Cart total sync
  updateCartUI();
}


// ═══════════════════════════════════════════════════════════════
//  5. INTERACTIVE LEAFLET DELIVERY MAP (CHECKOUT)
// ═══════════════════════════════════════════════════════════════

function initCheckoutMap() {
  const mapEl = $('#checkout-map');
  if (!mapEl) return;

  if (checkoutMap) {
    checkoutMap.invalidateSize();
    return;
  }

  // Create Leaflet Map centered on Mumbai (Bandra HQ)
  checkoutMap = L.map('checkout-map', {
    center: [customerLocation.lat, customerLocation.lng],
    zoom: 13,
    zoomControl: true,
  });

  // Dark Theme CartoDB Tile Layer (matches #0e100f theme)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(checkoutMap);

  // Cloud Kitchen Origin Icon (Lightning Bolt Marker)
  const kitchenIcon = L.divIcon({
    className: 'leaflet-custom-hq',
    html: `<div style="background:#0ae448;color:#0e100f;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 16px rgba(10,228,72,0.8);font-weight:900;">⚡</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
  checkoutKitchenMarker = L.marker([KITCHEN_HQ.lat, KITCHEN_HQ.lng], { icon: kitchenIcon })
    .addTo(checkoutMap)
    .bindPopup(`<b>${KITCHEN_HQ.name}</b><br>${KITCHEN_HQ.address || 'Dispatch Hub'}`);

  // Customer Delivery Pin Icon (Draggable Neon Pin)
  const customerIcon = L.divIcon({
    className: 'leaflet-custom-customer',
    html: `<div style="background:#fff;color:#0e100f;border:3px solid #0ae448;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 18px rgba(10,228,72,0.6);font-weight:900;">📍</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  checkoutCustomerMarker = L.marker([customerLocation.lat, customerLocation.lng], {
    icon: customerIcon,
    draggable: true
  }).addTo(checkoutMap);

  checkoutCustomerMarker.on('dragend', (e) => {
    const pos = e.target.getLatLng();
    updateDeliveryCalculations(pos.lat, pos.lng, `Near Lat: ${pos.lat.toFixed(4)}, Lng: ${pos.lng.toFixed(4)}`);
  });

  checkoutMap.on('click', (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    checkoutCustomerMarker.setLatLng([lat, lng]);
    updateDeliveryCalculations(lat, lng, `Selected Map Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  });

  // Preset Location Chips
  $$('.loc-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.loc-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const lat = parseFloat(chip.dataset.lat);
      const lng = parseFloat(chip.dataset.lng);
      const name = chip.dataset.name + ", Mumbai";
      checkoutCustomerMarker.setLatLng([lat, lng]);
      checkoutMap.panTo([lat, lng], { animate: true, duration: 0.8 });
      updateDeliveryCalculations(lat, lng, name);
    });
  });

  updateDeliveryCalculations(customerLocation.lat, customerLocation.lng);
}


// ═══════════════════════════════════════════════════════════════
//  6. REAL DYNAMIC UPI QR CODE PAYMENT GENERATOR
// ═══════════════════════════════════════════════════════════════

function generateUpiQrCode() {
  if (!upiQrCanvas) return;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const delivery = customerLocation.deliveryFee;
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'PERCENTAGE') {
      discount = (subtotal * appliedCoupon.discountValue) / 100;
      if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) discount = appliedCoupon.maxDiscount;
    } else if (appliedCoupon.discountType === 'FLAT') {
      discount = appliedCoupon.discountValue;
    } else if (appliedCoupon.discountType === 'FREE_DELIVERY') {
      discount = delivery;
    }
    discount = Math.min(Math.round(discount), subtotal);
  }
  const totalAmount = Math.max(0, subtotal - discount + delivery);

  if (upiPayAmount) upiPayAmount.textContent = `₹${totalAmount}`;
  if (upiItemCount) upiItemCount.textContent = `${cart.reduce((s, i) => s + i.qty, 0)} items`;
  if (upiSummaryDist) upiSummaryDist.textContent = `${customerLocation.distanceKm} km`;
  if (upiSummaryFee) upiSummaryFee.textContent = customerLocation.deliveryFee === 0 ? 'FREE' : `₹${customerLocation.deliveryFee}`;

  const discountRow = $('#upi-discount-row');
  const discountVal = $('#upi-summary-discount');
  if (discountRow && discountVal) {
    if (discount > 0) {
      discountRow.style.display = 'flex';
      discountVal.textContent = `-₹${discount}`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  // Read Merchant UPI ID (from input or state)
  if (inputMerchantUpi) {
    merchantUpiId = inputMerchantUpi.value.trim() || 'kaif@upi';
  }

  // Standard UPI URI Payload Specification
  const upiPayload = `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=Kaif's%20Cloud%20Kitchen&am=${totalAmount}&cu=INR&tn=Gourmet%20Food%20Order`;

  // Render sharp QR on canvas
  QRCode.toCanvas(upiQrCanvas, upiPayload, {
    width: 170,
    margin: 1,
    color: {
      dark: '#0e100f',
      light: '#ffffff'
    }
  }, (err) => {
    if (err) console.error('QR code generation error:', err);
  });
}

// Copy UPI ID button
if (btnCopyUpi && inputMerchantUpi) {
  btnCopyUpi.addEventListener('click', () => {
    navigator.clipboard.writeText(inputMerchantUpi.value.trim()).then(() => {
      showToast(`Copied UPI ID "${inputMerchantUpi.value.trim()}" to clipboard!`);
    }).catch(() => {
      showToast(`UPI ID: ${inputMerchantUpi.value.trim()}`);
    });
  });

  // Re-generate QR when user edits UPI ID
  inputMerchantUpi.addEventListener('input', () => {
    merchantUpiId = inputMerchantUpi.value.trim();
    localStorage.setItem('kaif_merchant_upi', merchantUpiId);
    generateUpiQrCode();
  });
}


// ═══════════════════════════════════════════════════════════════
//  7. CHECKOUT WIZARD WORKFLOW & MODAL
// ═══════════════════════════════════════════════════════════════

function openCheckoutModal() {
  if (cart.length === 0) {
    showToast('Your bag is empty! Add dishes to proceed.');
    return;
  }
  closeCart();

  // Show Step 1: Location & Map
  checkoutStep1.style.display = 'block';
  checkoutStep2.style.display = 'none';
  stepPill1.classList.add('active');
  stepPill2.classList.remove('active');
  if (checkoutTitle) checkoutTitle.textContent = 'Select Delivery Location on Map';
  if (checkoutSubtitle) checkoutSubtitle.textContent = 'Drag marker or tap map to pin your exact address in Mumbai';

  if (checkoutModal) checkoutModal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Initialize Leaflet after modal is rendered in DOM
  setTimeout(() => {
    initCheckoutMap();
    if (checkoutMap) checkoutMap.invalidateSize();
  }, 180);
}

function closeCheckoutModal() {
  if (checkoutModal) checkoutModal.classList.remove('active');
  document.body.style.overflow = '';
}

if (btnProceedCheckout) btnProceedCheckout.addEventListener('click', openCheckoutModal);
if (checkoutCloseBtn) checkoutCloseBtn.addEventListener('click', closeCheckoutModal);

// Transition to Step 2: UPI QR Payment
if (btnToPayment) {
  btnToPayment.addEventListener('click', () => {
    if (inputAddress && !inputAddress.value.trim()) {
      showToast('Please specify a delivery address.');
      return;
    }

    checkoutStep1.style.display = 'none';
    checkoutStep2.style.display = 'block';
    stepPill1.classList.remove('active');
    stepPill2.classList.add('active');
    if (checkoutTitle) checkoutTitle.textContent = 'Scan UPI QR Code to Pay';
    if (checkoutSubtitle) checkoutSubtitle.textContent = 'Scan with GPay, PhonePe, Paytm, or enter your personal UPI ID below';

    generateUpiQrCode();
  });
}

if (btnBackToAddress) {
  btnBackToAddress.addEventListener('click', () => {
    checkoutStep1.style.display = 'block';
    checkoutStep2.style.display = 'none';
    stepPill1.classList.add('active');
    stepPill2.classList.remove('active');
    if (checkoutTitle) checkoutTitle.textContent = 'Select Delivery Location on Map';
  });
}

// Payment Verification & Order Confirmation (Real Database & WhatsApp Integration)
if (btnVerifyUpi) {
  btnVerifyUpi.addEventListener('click', async () => {
    if (cart.length === 0) {
      showToast('Your feast bag is empty! Add dishes to proceed.');
      return;
    }

    if (verifySpinner) verifySpinner.style.display = 'inline-block';
    if (btnVerifyText) btnVerifyText.textContent = 'Transmitting Order to Kitchen Engine...';
    btnVerifyUpi.disabled = true;

    const aptVal = $('#input-apt') ? $('#input-apt').value.trim() : '';
    const rawAddress = inputAddress ? inputAddress.value.trim() : customerLocation.address;
    const fullAddress = aptVal ? `${aptVal}, ${rawAddress}` : rawAddress;
    const custPhone = $('#input-customer-phone') ? $('#input-customer-phone').value.trim() : ($('#input-phone') ? $('#input-phone').value.trim() : '+919876543210');
    const custName = currentUser ? currentUser.name : 'Gourmet Patron';
    const utrInput = $('#input-upi-utr');
    const utrVal = (utrInput && utrInput.value.trim()) ? utrInput.value.trim() : `UPI-${Date.now().toString(36).toUpperCase()}`;

    try {
      // Step 1: Create Order in PostgreSQL via API
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
      let disc = 0;
      if (appliedCoupon) {
        if (appliedCoupon.discountType === 'PERCENTAGE') {
          disc = (subtotal * appliedCoupon.discountValue) / 100;
          if (appliedCoupon.maxDiscount && disc > appliedCoupon.maxDiscount) disc = appliedCoupon.maxDiscount;
        } else if (appliedCoupon.discountType === 'FLAT') {
          disc = appliedCoupon.discountValue;
        } else if (appliedCoupon.discountType === 'FREE_DELIVERY') {
          disc = customerLocation.deliveryFee;
        }
        disc = Math.min(Math.round(disc), subtotal);
      }

      const orderPayload = {
        customerName: custName,
        customerPhone: custPhone,
        customerAddress: fullAddress,
        deliveryLat: customerLocation.lat,
        deliveryLng: customerLocation.lng,
        distanceKm: customerLocation.distanceKm,
        deliveryFee: customerLocation.deliveryFee,
        discountAmount: disc,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        items: cart.map(item => ({
          productId: item.id && item.id.length > 10 ? item.id : null,
          name: item.name,
          price: Number(item.price),
          quantity: item.qty
        }))
      };

      const orderRes = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });
      const createdOrder = orderRes.order;

      // Step 2: Auto-verify UPI Payment on Backend
      if (btnVerifyText) btnVerifyText.textContent = 'Verifying UPI & Generating WhatsApp Receipt...';

      const verifyRes = await apiFetch('/orders/verify-payment', {
        method: 'POST',
        body: JSON.stringify({
          orderId: createdOrder.id,
          transactionId: utrVal
        })
      });

      const verifiedOrder = verifyRes.order;
      const whatsapp = verifyRes.whatsapp;

      if (verifySpinner) verifySpinner.style.display = 'none';
      if (btnVerifyText) btnVerifyText.textContent = '✅ Payment Verified & Received!';
      btnVerifyUpi.disabled = false;

      // Step 3: Show WhatsApp Alert Card inside Checkout Modal
      const alertBox = $('#whatsapp-alert-box');
      const alertBtn = $('#btn-open-whatsapp');
      if (alertBox && alertBtn && whatsapp && whatsapp.url) {
        alertBox.style.display = 'block';
        alertBtn.href = whatsapp.url;
      }

      showToast(`Payment of ₹${verifiedOrder.totalAmount} received! Order #${verifiedOrder.orderNumber} confirmed.`, 'success');

      // Clear the user's cart & coupon
      cart = [];
      appliedCoupon = null;
      localStorage.removeItem('kaif_coupon');
      saveCart();

      // Step 4: Launch Live GPS Tracking Dashboard
      setTimeout(() => {
        closeCheckoutModal();
        openTrackingModal(verifiedOrder, whatsapp ? whatsapp.url : null);

        // Try opening WhatsApp automatically in a new window/tab for the customer
        if (whatsapp && whatsapp.url) {
          try {
            window.open(whatsapp.url, '_blank');
          } catch {}
        }
      }, 1600);

    } catch (err) {
      console.error('Checkout verification error:', err);
      if (verifySpinner) verifySpinner.style.display = 'none';
      if (btnVerifyText) btnVerifyText.textContent = '⚡ Retry Payment Verification';
      btnVerifyUpi.disabled = false;
      showToast(err.message || 'Payment verification failed. Please try again.', 'error');
    }
  });
}


// ═══════════════════════════════════════════════════════════════
//  8. LIVE GPS DRIVER SATELLITE TRACKING DASHBOARD
// ═══════════════════════════════════════════════════════════════

function openTrackingModal(order = null, whatsappUrl = null) {
  if (order) {
    currentTrackingOrder = order;
    if (order.deliveryLat && order.deliveryLng) {
      customerLocation.lat = order.deliveryLat;
      customerLocation.lng = order.deliveryLng;
      customerLocation.address = order.customerAddress || customerLocation.address;
    }

    if ($('#tracking-order-num')) {
      $('#tracking-order-num').textContent = `#${order.orderNumber || 'ORD-LIVE'}`;
    }
    if ($('#tracking-dest-address')) {
      $('#tracking-dest-address').textContent = `To: ${order.customerAddress || customerLocation.address}`;
    }
    if ($('#tracking-order-status')) {
      $('#tracking-order-status').textContent = `${order.paymentStatus || 'PAID'} • ${order.orderStatus || 'IN TRANSIT'}`;
    }
    if ($('#tracking-total-amount')) {
      $('#tracking-total-amount').textContent = `₹${order.totalAmount || 0}`;
    }

    // Render Order Items
    const itemsListEl = $('#tracking-items-list');
    if (itemsListEl && order.items && order.items.length) {
      itemsListEl.innerHTML = order.items.map(item => `
        <div style="display:flex;justify-content:space-between;padding:0.2rem 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span>${item.quantity}x ${item.name}</span>
          <span style="font-family:var(--font-mono);color:#fff;">₹${(Number(item.price) * item.quantity).toFixed(0)}</span>
        </div>
      `).join('');
    }

    // Live WhatsApp Share button in tracking view
    const trackingWaBtn = $('#tracking-whatsapp-btn');
    if (trackingWaBtn) {
      const trackingUrl = `${window.location.origin}/?track=${order.id}`;
      const msg = encodeURIComponent(`*Kaif's Cloud Kitchen Order #${order.orderNumber}*\nTrack Live Driver GPS:\n${trackingUrl}`);
      trackingWaBtn.href = whatsappUrl || `https://wa.me/?text=${msg}`;
    }
  }

  if (trackingModal) trackingModal.classList.add('active');
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    initTrackingMap();
    startDriverSimulation();
  }, 220);
}

function closeTrackingModal() {
  if (trackingModal) trackingModal.classList.remove('active');
  document.body.style.overflow = '';
  if (driverInterval) clearInterval(driverInterval);
}

if (trackingCloseBtn) trackingCloseBtn.addEventListener('click', closeTrackingModal);

function initTrackingMap() {
  const mapEl = $('#tracking-map');
  if (!mapEl) return;

  // Cleanly recreate tracking map to avoid tile/container caching
  if (trackingMap) {
    try {
      trackingMap.remove();
    } catch {}
    trackingMap = null;
  }

  // Centered midway between kitchen HQ and customer location
  const midLat = (KITCHEN_HQ.lat + customerLocation.lat) / 2;
  const midLng = (KITCHEN_HQ.lng + customerLocation.lng) / 2;

  trackingMap = L.map('tracking-map', {
    center: [midLat, midLng],
    zoom: 14,
    zoomControl: false,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(trackingMap);

  // Kitchen Origin Marker
  const originIcon = L.divIcon({
    className: 'tracking-origin-marker',
    html: `<div style="background:#0ae448;color:#0e100f;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;box-shadow:0 0 14px rgba(10,228,72,0.8);">⚡</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
  trackingOriginMarker = L.marker([KITCHEN_HQ.lat, KITCHEN_HQ.lng], { icon: originIcon })
    .addTo(trackingMap)
    .bindPopup(`<b>${KITCHEN_HQ.name}</b><br>Kitchen Dispatch Origin`);

  // Customer Destination Marker
  const destIcon = L.divIcon({
    className: 'tracking-dest-marker',
    html: `<div style="background:#fff;border:3px solid #0ae448;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 14px rgba(10,228,72,0.6);">🏠</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
  trackingDestMarker = L.marker([customerLocation.lat, customerLocation.lng], { icon: destIcon })
    .addTo(trackingMap)
    .bindPopup(`<b>Delivery Doorstep</b><br>${customerLocation.address}`);

  // Route Polyline (Neon Green glow dash line)
  const routePoints = [
    [KITCHEN_HQ.lat, KITCHEN_HQ.lng],
    [KITCHEN_HQ.lat + (customerLocation.lat - KITCHEN_HQ.lat) * 0.35, KITCHEN_HQ.lng + (customerLocation.lng - KITCHEN_HQ.lng) * 0.15],
    [KITCHEN_HQ.lat + (customerLocation.lat - KITCHEN_HQ.lat) * 0.65, KITCHEN_HQ.lng + (customerLocation.lng - KITCHEN_HQ.lng) * 0.85],
    [customerLocation.lat, customerLocation.lng],
  ];

  trackingRouteLine = L.polyline(routePoints, {
    color: '#0ae448',
    weight: 4,
    opacity: 0.9,
    dashArray: '8, 8',
  }).addTo(trackingMap);

  // Animated Rider Marker (Scooter)
  const driverIcon = L.divIcon({
    className: 'tracking-driver-marker',
    html: `<div style="background:#0e100f;border:2px solid #0ae448;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 20px #0ae448;">🛵</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

  const curLat = KITCHEN_HQ.lat + (customerLocation.lat - KITCHEN_HQ.lat) * driverProgress;
  const curLng = KITCHEN_HQ.lng + (customerLocation.lng - KITCHEN_HQ.lng) * driverProgress;
  trackingDriverMarker = L.marker([curLat, curLng], { icon: driverIcon }).addTo(trackingMap);

  trackingMap.fitBounds(trackingRouteLine.getBounds(), { padding: [50, 50] });
}

function updateDriverPosition() {
  if (!trackingDriverMarker) return;

  driverProgress = Math.min(driverProgress + 0.05, 1.0);
  const curLat = KITCHEN_HQ.lat + (customerLocation.lat - KITCHEN_HQ.lat) * driverProgress;
  const curLng = KITCHEN_HQ.lng + (customerLocation.lng - KITCHEN_HQ.lng) * driverProgress;

  trackingDriverMarker.setLatLng([curLat, curLng]);

  // Update Telemetry ETA & Speed
  const remainingMins = Math.max(Math.round(customerLocation.etaMinutes * (1 - driverProgress)), 1);
  const speed = driverProgress >= 1 ? 0 : Math.round(32 + Math.random() * 8);

  if (trackingEtaPill) {
    if (driverProgress >= 1.0) {
      trackingEtaPill.textContent = 'RIDER ARRIVED AT DOORSTEP! • ENJOY YOUR HOT FEAST';
      if (pipelineFinalStep) pipelineFinalStep.classList.add('completed');
    } else {
      trackingEtaPill.textContent = `ETA: ${remainingMins} mins • Speed: ${speed} km/h • Handi: 68°C Core`;
    }
  }

  if (driverProgress >= 1.0 && driverInterval) {
    clearInterval(driverInterval);
    showToast('🛵 Rider has arrived outside with your steaming hot Handi!', 'success');
  }
}

function startDriverSimulation() {
  if (driverInterval) clearInterval(driverInterval);
  driverProgress = 0.25;
  driverInterval = setInterval(updateDriverPosition, 2400);
}

// Manual speed up button
if (btnStepDriver) {
  btnStepDriver.addEventListener('click', () => {
    driverProgress = Math.min(driverProgress + 0.2, 1.0);
    updateDriverPosition();
  });
}


// ═══════════════════════════════════════════════════════════════
//  9. CART / FEAST BAG SYSTEM
// ═══════════════════════════════════════════════════════════════

function saveCart() {
  localStorage.setItem('kaif_cart', JSON.stringify(cart));
  updateCartUI();
  updateMenuCardsAction();
}

function addToCart(item) {
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
      imageUrl: item.imageUrl || '/biryani.jpg',
      qty: 1,
    });
  }
  saveCart();
  showToast(`Added "${item.name}" to bag!`);

  if (cartBadge) {
    gsap.fromTo(cartBadge, { scale: 1 }, { scale: 1.4, duration: 0.15, yoyo: true, repeat: 1 });
  }
}

function updateCartUI() {
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  if (cartBadge) cartBadge.textContent = totalQty;
  if (cartItemsCount) cartItemsCount.textContent = `${totalQty} ${totalQty === 1 ? 'item' : 'items'}`;

  // Mobile Sticky Quick-Cart Bar
  if (mobileCartBar) {
    if (totalQty > 0 && window.innerWidth <= 768) {
      mobileCartBar.style.display = 'flex';
      if (mobileCartQty) mobileCartQty.textContent = `${totalQty} ${totalQty === 1 ? 'ITEM' : 'ITEMS'}`;
    } else {
      mobileCartBar.style.display = 'none';
    }
  }

  if (!cartItemsList || !cartEmptyView) return;

  if (cart.length === 0) {
    cartItemsList.style.display = 'none';
    cartEmptyView.style.display = 'flex';
    $('#cart-drawer-footer').style.display = 'none';
    $('.delivery-bar-wrap').style.display = 'none';
    return;
  }

  cartItemsList.style.display = 'flex';
  cartEmptyView.style.display = 'none';
  $('#cart-drawer-footer').style.display = 'block';
  $('.delivery-bar-wrap').style.display = 'block';

  cartItemsList.innerHTML = cart.map(item => `
    <div class="cart-item-card" data-id="${item.id}">
      <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-img" />
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price} &times; ${item.qty} = ₹${(item.price * item.qty).toFixed(0)}</div>
      </div>
      <div class="cart-qty-ctrls">
        <button class="qty-btn btn-minus" data-id="${item.id}">&minus;</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn btn-plus" data-id="${item.id}">&plus;</button>
      </div>
    </div>
  `).join('');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const freeThreshold = 500;
  const isFree = subtotal >= freeThreshold;
  const delivery = isFree ? 0 : customerLocation.deliveryFee;

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'PERCENTAGE') {
      discount = (subtotal * appliedCoupon.discountValue) / 100;
      if (appliedCoupon.maxDiscount && discount > appliedCoupon.maxDiscount) discount = appliedCoupon.maxDiscount;
    } else if (appliedCoupon.discountType === 'FLAT') {
      discount = appliedCoupon.discountValue;
    } else if (appliedCoupon.discountType === 'FREE_DELIVERY') {
      discount = delivery;
    }
    discount = Math.min(Math.round(discount), subtotal);
  }
  const grandTotal = Math.max(0, subtotal - discount + delivery);

  if (cartSubtotal) cartSubtotal.textContent = `₹${subtotal.toFixed(0)}`;
  if (cartDeliveryFee) cartDeliveryFee.textContent = isFree ? 'FREE' : `₹${delivery}`;
  if (cartTotal) cartTotal.textContent = `₹${grandTotal.toFixed(0)}`;
  if (mobileCartTotal) mobileCartTotal.textContent = `₹${grandTotal.toFixed(0)}`;

  // Coupon UI in Cart
  const cartDiscountRow = $('#cart-discount-row');
  const cartDiscountVal = $('#cart-discount');
  const couponPill = $('#coupon-active-pill');
  const couponPillText = $('#coupon-pill-text');
  const couponFeedback = $('#coupon-feedback');

  if (appliedCoupon && discount > 0) {
    if (cartDiscountRow) cartDiscountRow.style.display = 'flex';
    if (cartDiscountVal) cartDiscountVal.textContent = `-₹${discount}`;
    if (couponPill) couponPill.style.display = 'flex';
    if (couponPillText) couponPillText.textContent = `${appliedCoupon.code} (-₹${discount})`;
    if (couponFeedback) {
      couponFeedback.style.display = 'block';
      couponFeedback.className = 'coupon-feedback';
      couponFeedback.textContent = `🎉 '${appliedCoupon.code}' applied! You saved ₹${discount}.`;
    }
  } else {
    if (cartDiscountRow) cartDiscountRow.style.display = 'none';
    if (couponPill) couponPill.style.display = 'none';
    if (couponFeedback) couponFeedback.style.display = 'none';
  }

  if (deliveryProgressText && deliveryProgressBar) {
    if (isFree) {
      deliveryProgressText.innerHTML = `🎉 <strong>Free Express Delivery</strong> applied!`;
      deliveryProgressBar.style.width = '100%';
    } else {
      const rem = freeThreshold - subtotal;
      const pct = Math.min((subtotal / freeThreshold) * 100, 100);
      deliveryProgressText.innerHTML = `Add <strong>₹${rem.toFixed(0)} more</strong> for Free Delivery`;
      deliveryProgressBar.style.width = `${pct}%`;
    }
  }

  // Bind Qty buttons
  $$('.btn-plus').forEach(b => {
    b.addEventListener('click', () => {
      const item = cart.find(i => i.id === b.dataset.id);
      if (item) { item.qty += 1; saveCart(); }
    });
  });

  $$('.btn-minus').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.dataset.id;
      const item = cart.find(i => i.id === id);
      if (item) {
        item.qty -= 1;
        if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
        saveCart();
      }
    });
  });
}

function openCart() {
  if (cartDrawerOverlay) cartDrawerOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  if (cartDrawerOverlay) cartDrawerOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

if (navCartBtn) navCartBtn.addEventListener('click', openCart);
if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
if (cartDrawerOverlay) {
  cartDrawerOverlay.addEventListener('click', (e) => {
    if (e.target === cartDrawerOverlay) closeCart();
  });
}
if (btnExploreFromCart) {
  btnExploreFromCart.addEventListener('click', () => {
    closeCart();
    lenis?.scrollTo('#menu', { offset: -60 });
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-quick-add');
  if (btn) {
    addToCart({
      id: btn.dataset.id,
      name: btn.dataset.name,
      price: btn.dataset.price,
      imageUrl: btn.dataset.img,
    });
  }
});


// ═══════════════════════════════════════════════════════════════
//  10. INTERACTIVE STAGE & DUM-PUKHT SCRUBBER
// ═══════════════════════════════════════════════════════════════

const stageDishes = {
  biryani: {
    title: "Royal Hyderabadi Dum Biryani",
    desc: "Aged Daawat basmati layered with tender saffron-steeped cuts, sealed with whole wheat dough on babool charcoal embers.",
    img: "/biryani.jpg",
    price: 349,
    recipe: "RECIPE // AWADHI-01",
    metric1: "18h",
    metric2: "100%",
    metric3: "A2",
    stages: [
      "Stage 1/4 • Marination & Whole Spices Infusion",
      "Stage 2/4 • Layering Basmati in Terracotta Deg",
      "Stage 3/4 • Peak Dum Steam Pressure Sealed",
      "Stage 4/4 • Royal Handi Ready for Thermal Dispatch"
    ]
  },
  dal: {
    title: "Dal Makhani Bukhara",
    desc: "Black urad lentils simmered overnight for 18 hours over slow coal fire with fresh white butter and organic tomato puree.",
    img: "/dal_makhani.jpg",
    price: 249,
    recipe: "RECIPE // BUKHARA-04",
    metric1: "18h",
    metric2: "Coal",
    metric3: "Butter",
    stages: [
      "Stage 1/4 • Overnight Soaking of Black Gram",
      "Stage 2/4 • First Simmer with Degi Mirch",
      "Stage 3/4 • Cultured Butter & Cream Reduction",
      "Stage 4/4 • Silky Velvety Bukhara Finished"
    ]
  },
  paneer: {
    title: "Smoked Paneer Tikka Angara",
    desc: "Malai paneer cubes steeped in cold-pressed mustard oil, hung curd, and roasted cumin, char-grilled over live tandoor embers.",
    img: "/paneer_tikka.jpg",
    price: 289,
    recipe: "RECIPE // TANDOOR-07",
    metric1: "450°C",
    metric2: "Charcoal",
    metric3: "Malai",
    stages: [
      "Stage 1/4 • Double Mustard Oil Marination",
      "Stage 2/4 • Skewered in Clay Tandoor Pit",
      "Stage 3/4 • Live Embers Smoking & Char Crust",
      "Stage 4/4 • Lemon Glaze & Hot Handi Plated"
    ]
  }
};

let currentStageDish = 'biryani';

function initInteractiveStage() {
  const tabs = $$('.stage-tab');
  const stageImg = $('#stage-dish-img');
  const stageTitle = $('#stage-dish-title');
  const stageDesc = $('#stage-dish-desc');
  const stagePrice = $('#stage-dish-price');
  const stageAddBtn = $('#stage-add-btn');
  const scrubber = $('#stage-scrubber');
  const scrubVal = $('#stage-scrub-val');
  const statusText = $('#stage-status-text');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const dishKey = tab.dataset.dish;
      currentStageDish = dishKey;
      const data = stageDishes[dishKey];

      gsap.to('.stage-dish-card', {
        opacity: 0.4,
        scale: 0.98,
        duration: 0.2,
        onComplete: () => {
          if (stageImg) stageImg.src = data.img;
          if (stageTitle) stageTitle.textContent = data.title;
          if (stageDesc) stageDesc.textContent = data.desc;
          if (stagePrice) stagePrice.textContent = `₹${data.price}`;
          $('.stage-code-badge').textContent = data.recipe;
          $$('.metric-num')[0].textContent = data.metric1;
          $$('.metric-num')[1].textContent = data.metric2;
          $$('.metric-num')[2].textContent = data.metric3;

          if (stageAddBtn) {
            stageAddBtn.dataset.id = dishKey;
            stageAddBtn.dataset.name = data.title;
            stageAddBtn.dataset.price = data.price;
            stageAddBtn.dataset.img = data.img;
          }

          updateScrubText();
          gsap.to('.stage-dish-card', { opacity: 1, scale: 1, duration: 0.35 });
        }
      });
    });
  });

  function updateScrubText() {
    if (!scrubber || !scrubVal) return;
    const val = parseInt(scrubber.value);
    const data = stageDishes[currentStageDish];
    const stageIdx = Math.min(Math.floor((val / 100) * 4), 3);
    scrubVal.textContent = data.stages[stageIdx];
    
    const temp = 60 + Math.floor((val / 100) * 25);
    if (statusText) statusText.textContent = `Handi Temp: ${temp}°C • Pressure Sealed`;
  }

  if (scrubber) {
    scrubber.addEventListener('input', () => {
      updateScrubText();
      const val = parseInt(scrubber.value);
      if (stageImg) {
        gsap.to(stageImg, {
          scale: 1 + (val / 100) * 0.05,
          duration: 0.15,
        });
      }
    });
  }
}


// ═══════════════════════════════════════════════════════════════
//  11. SIGNATURES CAROUSEL
// ═══════════════════════════════════════════════════════════════

function initSignaturesCarousel() {
  if (!signaturesTrack) return;

  if (sigPrev) {
    sigPrev.addEventListener('click', () => {
      signaturesTrack.scrollBy({ left: -340, behavior: 'smooth' });
    });
  }
  if (sigNext) {
    sigNext.addEventListener('click', () => {
      signaturesTrack.scrollBy({ left: 340, behavior: 'smooth' });
    });
  }
}


// ═══════════════════════════════════════════════════════════════
//  12. MENU API & FILTERS
// ═══════════════════════════════════════════════════════════════

async function apiFetch(endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: 'include',
    ...options,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

async function loadMenu() {
  if (!menuLoading) return;
  menuLoading.style.display = 'block';
  if (menuEmpty) menuEmpty.style.display = 'none';

  try {
    const data = await apiFetch('/products');
    allProducts = data.products || [];
    filterAndRenderMenu();
  } catch (err) {
    console.error('Menu load error:', err);
    if (menuLoading) menuLoading.style.display = 'none';
    if (menuEmpty) {
      menuEmpty.style.display = 'block';
      menuEmpty.querySelector('p').textContent = 'Could not reach backend API. Make sure the backend server is running.';
    }
  }
}

function filterAndRenderMenu() {
  if (menuLoading) menuLoading.style.display = 'none';

  filteredProducts = allProducts.filter(item => {
    const matchesSearch = searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const isVeg = /paneer|dal|dosa|jamun|veg|chaap|rice|roti/i.test(item.name);
    let matchesCategory = true;
    if (currentFilter === 'biryani') {
      matchesCategory = /biryani|rice/i.test(item.name);
    } else if (currentFilter === 'tandoor') {
      matchesCategory = /tikka|tandoor|kebab|starter/i.test(item.name);
    } else if (currentFilter === 'curry') {
      matchesCategory = /dal|makhani|curry|gravy/i.test(item.name);
    } else if (currentFilter === 'dessert') {
      matchesCategory = /jamun|sweet|dessert|halwa/i.test(item.name);
    } else if (currentFilter === 'veg') {
      matchesCategory = isVeg;
    } else if (currentFilter === 'available') {
      matchesCategory = item.isAvailable === true;
    }

    return matchesSearch && matchesCategory;
  });

  renderMenuGrid(filteredProducts);
}

function renderMenuGrid(items) {
  if (!menuGrid) return;

  if (items.length === 0) {
    menuGrid.innerHTML = '';
    if (menuEmpty) menuEmpty.style.display = 'block';
    return;
  }

  if (menuEmpty) menuEmpty.style.display = 'none';

  menuGrid.innerHTML = items.map(product => {
    const price = typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price);
    const isVeg = /paneer|dal|dosa|jamun|veg|chaap|rice|roti/i.test(product.name);
    const inCart = cart.find(i => i.id === product.id);
    const qty = inCart ? inCart.qty : 0;

    const actionHtml = qty === 0 ? `
      <button type="button" class="swiggy-add-btn" data-id="${product.id}" data-name="${product.name}" data-price="${price}" data-img="${product.imageUrl || '/biryani.jpg'}">
        ADD <span class="add-plus">+</span>
      </button>
    ` : `
      <div class="swiggy-qty-btn" data-id="${product.id}">
        <button type="button" class="swiggy-btn-minus" data-id="${product.id}">&minus;</button>
        <span class="swiggy-qty-num">${qty}</span>
        <button type="button" class="swiggy-btn-plus" data-id="${product.id}">&plus;</button>
      </div>
    `;

    return `
      <div class="menu-card" data-id="${product.id}">
        <div class="menu-img-wrap">
          <img src="${product.imageUrl || '/biryani.jpg'}" alt="${product.name}" loading="lazy" />
          <span class="sig-badge ${isVeg ? 'green' : ''}">${isVeg ? 'Pure Veg' : 'Non-Veg'}</span>
        </div>
        <div class="menu-body">
          <div class="dish-swiggy-meta">
            <span class="veg-badge ${isVeg ? 'veg' : 'nonveg'}" title="${isVeg ? 'Pure Vegetarian' : 'Non-Vegetarian'}">
              <span class="veg-dot"></span>
            </span>
            <span class="dish-star-rating">★ 4.8</span>
            <span class="dish-prep-time">&bull; 25-30 mins</span>
          </div>
          <h3>${product.name}</h3>
          <p>${product.description || 'Authentic gourmet delicacy cooked fresh in our cloud kitchen.'}</p>
          <div class="menu-footer">
            <span class="menu-price">₹${price.toFixed(0)}</span>
            <div class="swiggy-dish-action" data-id="${product.id}">
              ${actionHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  gsap.fromTo('.menu-card', 
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, stagger: 0.04, duration: 0.4, ease: 'power2.out' }
  );

  // Card click for detail modal
  $$('.menu-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.swiggy-add-btn') || e.target.closest('.swiggy-qty-btn')) return;
      const id = card.dataset.id;
      const p = allProducts.find(item => item.id === id);
      if (p) openProductModal(p);
    });
  });

  bindSwiggyCardButtons();
}

function bindSwiggyCardButtons() {
  $$('.swiggy-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const imageUrl = btn.dataset.img;
      addToCart({ id, name, price, imageUrl });
      updateMenuCardsAction();
    });
  });

  $$('.swiggy-btn-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const item = cart.find(i => i.id === id);
      if (item) {
        item.qty += 1;
        saveCart();
        updateMenuCardsAction();
      }
    });
  });

  $$('.swiggy-btn-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const item = cart.find(i => i.id === id);
      if (item) {
        item.qty -= 1;
        if (item.qty <= 0) {
          cart = cart.filter(i => i.id !== id);
        }
        saveCart();
        updateMenuCardsAction();
      }
    });
  });
}

function updateMenuCardsAction() {
  $$('.swiggy-dish-action').forEach(container => {
    const id = container.dataset.id;
    const inCart = cart.find(i => i.id === id);
    const p = allProducts.find(i => i.id === id);
    const price = p ? Number(p.price) : 0;
    const name = p ? p.name : '';
    const img = p ? p.imageUrl : '';

    if (!inCart || inCart.qty === 0) {
      container.innerHTML = `
        <button type="button" class="swiggy-add-btn" data-id="${id}" data-name="${name}" data-price="${price}" data-img="${img}">
          ADD <span class="add-plus">+</span>
        </button>
      `;
    } else {
      container.innerHTML = `
        <div class="swiggy-qty-btn" data-id="${id}">
          <button type="button" class="swiggy-btn-minus" data-id="${id}">&minus;</button>
          <span class="swiggy-qty-num">${inCart.qty}</span>
          <button type="button" class="swiggy-btn-plus" data-id="${id}">&plus;</button>
        </div>
      `;
    }
  });

  bindSwiggyCardButtons();
}

// Search
if (menuSearch) {
  menuSearch.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    if (clearSearchBtn) clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    filterAndRenderMenu();
  });
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener('click', () => {
    menuSearch.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    filterAndRenderMenu();
  });
}

if (btnResetFilters) {
  btnResetFilters.addEventListener('click', () => {
    searchQuery = '';
    currentFilter = 'all';
    if (menuSearch) menuSearch.value = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    $$('.filter-pill').forEach(p => p.classList.toggle('active', p.dataset.filter === 'all'));
    filterAndRenderMenu();
  });
}

$$('.filter-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    $$('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.dataset.filter;
    filterAndRenderMenu();
  });
});


// ═══════════════════════════════════════════════════════════════
//  13. PRODUCT DETAIL MODAL
// ═══════════════════════════════════════════════════════════════

let modalProduct = null;

function openProductModal(product) {
  modalProduct = product;
  const price = typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price);

  if (modalImg) modalImg.src = product.imageUrl || '/biryani.jpg';
  if (modalName) modalName.textContent = product.name;
  if (modalDesc) modalDesc.textContent = product.description || 'Authentic Awadhi delicacy cooked fresh in our cloud kitchen.';
  if (modalPrice) modalPrice.textContent = `₹${price.toFixed(0)}`;

  if (productModal) productModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  if (productModal) productModal.classList.remove('active');
  document.body.style.overflow = '';
}

if (modalClose) modalClose.addEventListener('click', closeProductModal);
if (productModal) {
  productModal.addEventListener('click', (e) => {
    if (e.target === productModal) closeProductModal();
  });
}

if (modalOrderBtn) {
  modalOrderBtn.addEventListener('click', () => {
    if (modalProduct) {
      addToCart({
        id: modalProduct.id,
        name: modalProduct.name,
        price: modalProduct.price,
        imageUrl: modalProduct.imageUrl,
      });
      closeProductModal();
    }
  });
}


// ═══════════════════════════════════════════════════════════════
//  14. AUTHENTICATION (SIGN UP & SIGN IN)
// ═══════════════════════════════════════════════════════════════

function openAuthModal(mode = 'login') {
  authMode = mode;
  if (authError) authError.style.display = 'none';
  if (authSuccess) authSuccess.style.display = 'none';
  if (authForm) authForm.reset();

  if (mode === 'signup') {
    if (authTitle) authTitle.textContent = 'Join Kaif\'s Club';
    if (authSubtitle) authSubtitle.textContent = 'Unlock member tastings & priority dispatch';
    if (authNameGroup) authNameGroup.style.display = 'block';
    if (authSubmitText) authSubmitText.textContent = 'Create Account';
    if (authSwitchText) authSwitchText.innerHTML = 'Already a member? <a href="#" id="auth-switch-link">Sign In</a>';
  } else {
    if (authTitle) authTitle.textContent = 'Welcome Back';
    if (authSubtitle) authSubtitle.textContent = 'Sign in to access your culinary orders';
    if (authNameGroup) authNameGroup.style.display = 'none';
    if (authSubmitText) authSubmitText.textContent = 'Sign In';
    if (authSwitchText) authSwitchText.innerHTML = 'Don\'t have an account? <a href="#" id="auth-switch-link">Join Club</a>';
  }

  const switchLink = $('#auth-switch-link');
  if (switchLink) {
    switchLink.addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal(authMode === 'login' ? 'signup' : 'login');
    });
  }

  if (authModal) authModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  if (authModal) authModal.classList.remove('active');
  document.body.style.overflow = '';
}

if (btnSignIn) btnSignIn.addEventListener('click', () => openAuthModal('login'));
if (btnSignUp) btnSignUp.addEventListener('click', () => openAuthModal('signup'));
if (authModalClose) authModalClose.addEventListener('click', closeAuthModal);
if (authModal) {
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
  });
}

if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (authError) authError.style.display = 'none';
    if (authSubmitText) authSubmitText.style.display = 'none';
    if (authSpinner) authSpinner.style.display = 'inline-block';

    const email = authEmail.value.trim();
    const password = authPassword.value;
    const name = authName ? authName.value.trim() : '';

    try {
      if (authMode === 'signup') {
        const data = await apiFetch('/auth/sign-up', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        accessToken = data.accessToken;
        currentUser = data.user;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAuthUI();
        closeAuthModal();
        showToast(`Welcome to the Club, ${currentUser.name}!`);
      } else {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        accessToken = data.accessToken;
        currentUser = data.user;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAuthUI();
        closeAuthModal();
        showToast(`Welcome back, ${currentUser.name}!`);
      }
    } catch (err) {
      if (authError) {
        authError.textContent = err.message;
        authError.style.display = 'block';
      }
    } finally {
      if (authSubmitText) authSubmitText.style.display = 'inline';
      if (authSpinner) authSpinner.style.display = 'none';
    }
  });
}

function updateAuthUI() {
  if (currentUser) {
    if (btnSignIn) btnSignIn.style.display = 'none';
    if (btnSignUp) btnSignUp.style.display = 'none';
    if (navUserInfo) navUserInfo.style.display = 'flex';
    if (userGreeting) userGreeting.textContent = currentUser.name.split(' ')[0];
  } else {
    if (btnSignIn) btnSignIn.style.display = '';
    if (btnSignUp) btnSignUp.style.display = '';
    if (navUserInfo) navUserInfo.style.display = 'none';
  }
}

if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {}
    accessToken = null;
    currentUser = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    updateAuthUI();
    showToast('Signed out successfully.');
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProductModal();
    closeAuthModal();
    closeCart();
    closeCheckoutModal();
    closeTrackingModal();
    closeKitchenSettingsModal();
    closeAdminModal();
  }
});


// ═══════════════════════════════════════════════════════════════
//  14B. RESTAURANT OWNER LOCATION & UPI CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const kitchenSettingsModal = $('#kitchen-settings-modal');
const btnKitchenSettings = $('#btn-kitchen-settings');
const mobileBtnKitchenSettings = $('#mobile-btn-kitchen-settings');
const kitchenSettingsClose = $('#kitchen-settings-close');
const kitchenSettingsForm = $('#kitchen-settings-form');
const btnDetectKitchenGps = $('#btn-detect-kitchen-gps');

function openKitchenSettingsModal() {
  if (kitchenSettingsModal) {
    if ($('#setting-kitchen-name')) $('#setting-kitchen-name').value = KITCHEN_HQ.name || '';
    if ($('#setting-kitchen-address')) $('#setting-kitchen-address').value = KITCHEN_HQ.address || '';
    if ($('#setting-kitchen-lat')) $('#setting-kitchen-lat').value = KITCHEN_HQ.lat;
    if ($('#setting-kitchen-lng')) $('#setting-kitchen-lng').value = KITCHEN_HQ.lng;
    if ($('#setting-merchant-upi')) $('#setting-merchant-upi').value = merchantUpiId;
    if ($('#setting-owner-phone')) $('#setting-owner-phone').value = KITCHEN_HQ.ownerPhone || '+919876543210';
    kitchenSettingsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeKitchenSettingsModal() {
  if (kitchenSettingsModal) {
    kitchenSettingsModal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function initKitchenSettings() {
  if (btnKitchenSettings) btnKitchenSettings.addEventListener('click', openKitchenSettingsModal);
  if (mobileBtnKitchenSettings) {
    mobileBtnKitchenSettings.addEventListener('click', () => {
      if (mobileDrawer) mobileDrawer.classList.remove('open');
      openKitchenSettingsModal();
    });
  }
  if (kitchenSettingsClose) kitchenSettingsClose.addEventListener('click', closeKitchenSettingsModal);
  if (kitchenSettingsModal) {
    kitchenSettingsModal.addEventListener('click', (e) => {
      if (e.target === kitchenSettingsModal) closeKitchenSettingsModal();
    });
  }

  // Detect Device GPS for Restaurant
  if (btnDetectKitchenGps) {
    btnDetectKitchenGps.addEventListener('click', () => {
      if ('geolocation' in navigator) {
        btnDetectKitchenGps.textContent = '📡 Detecting Coordinates...';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            btnDetectKitchenGps.textContent = '🎯 Pin My Device\'s Current GPS as Kitchen Location';
            if ($('#setting-kitchen-lat')) $('#setting-kitchen-lat').value = pos.coords.latitude.toFixed(6);
            if ($('#setting-kitchen-lng')) $('#setting-kitchen-lng').value = pos.coords.longitude.toFixed(6);
            showToast(`GPS pinned: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, 'success');
          },
          (err) => {
            btnDetectKitchenGps.textContent = '🎯 Pin My Device\'s Current GPS as Kitchen Location';
            showToast(`Location error: ${err.message}`, 'error');
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        showToast('Geolocation is not supported by your browser.', 'error');
      }
    });
  }

  // Preset Hubs
  $$('.kitchen-preset').forEach(preset => {
    preset.addEventListener('click', () => {
      $$('.kitchen-preset').forEach(p => p.classList.remove('active'));
      preset.classList.add('active');
      if ($('#setting-kitchen-lat')) $('#setting-kitchen-lat').value = preset.dataset.lat;
      if ($('#setting-kitchen-lng')) $('#setting-kitchen-lng').value = preset.dataset.lng;
      if ($('#setting-kitchen-name')) $('#setting-kitchen-name').value = `Kaif's Cloud Kitchen (${preset.dataset.name})`;
    });
  });

  // Save Settings
  if (kitchenSettingsForm) {
    kitchenSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const lat = parseFloat($('#setting-kitchen-lat').value);
      const lng = parseFloat($('#setting-kitchen-lng').value);
      const name = $('#setting-kitchen-name').value.trim();
      const address = $('#setting-kitchen-address').value.trim();
      const upi = $('#setting-merchant-upi').value.trim();
      const phone = $('#setting-owner-phone').value.trim();

      KITCHEN_HQ = {
        lat: isNaN(lat) ? 19.0596 : lat,
        lng: isNaN(lng) ? 72.8295 : lng,
        name: name || "Kaif's Cloud Kitchen HQ",
        address: address || "Dispatch Hub",
        ownerPhone: phone || "+919876543210"
      };

      merchantUpiId = upi || 'kaif@upi';
      if (inputMerchantUpi) inputMerchantUpi.value = merchantUpiId;

      localStorage.setItem('kaif_kitchen_hq', JSON.stringify(KITCHEN_HQ));
      localStorage.setItem('kaif_merchant_upi', merchantUpiId);

      // Recalculate delivery distances from new Kitchen HQ
      updateDeliveryCalculations(customerLocation.lat, customerLocation.lng);

      if (checkoutKitchenMarker) {
        checkoutKitchenMarker.setLatLng([KITCHEN_HQ.lat, KITCHEN_HQ.lng]);
        checkoutKitchenMarker.setPopupContent(`<b>${KITCHEN_HQ.name}</b><br>${KITCHEN_HQ.address}`);
      }

      closeKitchenSettingsModal();
      showToast(`Kitchen HQ set to "${KITCHEN_HQ.name}". Delivery calculations updated!`, 'success');
    });
  }
}

async function checkUrlTrackingParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('track');
  if (trackId) {
    try {
      showToast('Loading live order satellite telemetry...', 'success');
      const data = await apiFetch(`/orders/${trackId}/track`);
      if (data && data.order) {
        openTrackingModal(data.order);
      }
    } catch (err) {
      console.warn('Track query error:', err);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
//  14C. SWIGGY COUPONS & OFFERS ENGINE
// ═══════════════════════════════════════════════════════════════

async function applyCoupon(code) {
  if (!code || !code.trim()) {
    showToast('Please enter a coupon code', 'error');
    return;
  }
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const delivery = customerLocation.deliveryFee;

  try {
    const res = await apiFetch('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({
        code: code.trim(),
        subtotal,
        deliveryFee: delivery,
      }),
    });

    appliedCoupon = res;
    localStorage.setItem('kaif_coupon', JSON.stringify(appliedCoupon));
    updateCartUI();
    showToast(res.message || `Coupon '${res.code}' applied!`, 'success');
  } catch (err) {
    showToast(err.message || 'Invalid coupon code', 'error');
    const fb = $('#coupon-feedback');
    if (fb) {
      fb.style.display = 'block';
      fb.className = 'coupon-feedback error';
      fb.textContent = err.message;
    }
  }
}

function removeCoupon() {
  appliedCoupon = null;
  localStorage.removeItem('kaif_coupon');
  updateCartUI();
  showToast('Coupon removed.');
}

function initCoupons() {
  const btnApply = $('#btn-apply-coupon');
  const inputCoupon = $('#input-cart-coupon');
  const btnRemove = $('#btn-remove-coupon');

  if (btnApply && inputCoupon) {
    btnApply.addEventListener('click', () => {
      applyCoupon(inputCoupon.value);
    });

    inputCoupon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCoupon(inputCoupon.value);
      }
    });
  }

  if (btnRemove) {
    btnRemove.addEventListener('click', removeCoupon);
  }

  // Swiggy Offers Strip click handlers
  $$('.btn-copy-offer').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = btn.dataset.code;
      applyCoupon(code);
      openCart();
    });
  });
}


// ═══════════════════════════════════════════════════════════════
//  14D. GOOGLE SIGN-IN INTEGRATION
// ═══════════════════════════════════════════════════════════════

function initGoogleAuth() {
  const btnGoogle = $('#btn-google-login');
  if (!btnGoogle) return;

  btnGoogle.addEventListener('click', async () => {
    try {
      let googleUser = null;

      if (isFirebaseConfigured && auth && googleProvider) {
        showToast('Opening Google Sign-In...', 'info');
        const userCred = await signInWithPopup(auth, googleProvider);
        googleUser = {
          email: userCred.user.email,
          name: userCred.user.displayName || userCred.user.email.split('@')[0],
          avatarUrl: userCred.user.photoURL,
        };
      } else {
        // Fallback if Firebase environment variables are not yet configured
        const defaultEmail = currentUser ? currentUser.email : 'kaif@cloudkitchen.com';
        const emailPrompt = prompt(
          'Firebase is not yet configured with API keys in .env.\n\nEnter Google Email to simulate login (or add VITE_FIREBASE_* keys):',
          defaultEmail
        );
        if (!emailPrompt) return;
        const googleName = emailPrompt.split('@')[0].replace(/[._]/g, ' ').toUpperCase();
        googleUser = {
          email: emailPrompt.trim(),
          name: googleName,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(googleName)}`,
        };
      }

      showToast('Authenticating with Cloud Kitchen...', 'info');
      const res = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.avatarUrl,
        }),
      });

      accessToken = res.accessToken;
      currentUser = res.user;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      updateAuthUI();
      closeAuthModal();
      showToast(`Welcome, ${currentUser.name}! Signed in via Google.`);
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        showToast('Google sign-in popup closed', 'warning');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignored duplicate popup requests
      } else {
        showToast(err.message || 'Google authentication failed', 'error');
      }
    }
  });
}


// ═══════════════════════════════════════════════════════════════
//  14E. ADMIN OPERATIONS & MISSION CONTROL PANEL
// ═══════════════════════════════════════════════════════════════

const adminModal = $('#admin-modal');
const btnAdminPanel = $('#btn-admin-panel');
const adminCloseBtn = $('#admin-close-btn');
const btnAdminRefresh = $('#btn-admin-refresh');
const adminCouponForm = $('#admin-coupon-form');

function openAdminModal() {
  if (adminModal) {
    adminModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadAdminData();
  }
}

function closeAdminModal() {
  if (adminModal) {
    adminModal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function initAdminPanel() {
  if (btnAdminPanel) btnAdminPanel.addEventListener('click', openAdminModal);
  if (adminCloseBtn) adminCloseBtn.addEventListener('click', closeAdminModal);
  if (btnAdminRefresh) btnAdminRefresh.addEventListener('click', loadAdminData);

  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) closeAdminModal();
    });
  }

  // Tab switching
  $$('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $$('.admin-tab-content').forEach(c => c.style.display = 'none');
      const activeContent = $(`#admin-tab-${tab}`);
      if (activeContent) activeContent.style.display = 'block';
    });
  });

  // Admin coupon creation
  if (adminCouponForm) {
    adminCouponForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = $('#adm-c-code').value.trim();
      const type = $('#adm-c-type').value;
      const val = parseFloat($('#adm-c-val').value);
      const min = parseFloat($('#adm-c-min').value);

      try {
        await apiFetch('/coupons', {
          method: 'POST',
          body: JSON.stringify({
            code,
            discountType: type,
            discountValue: val,
            minOrderAmount: min,
            description: `${val}${type === 'PERCENTAGE' ? '%' : '₹'} discount deal`,
          }),
        });
        showToast(`Promo code '${code}' created!`, 'success');
        adminCouponForm.reset();
        loadAdminData();
      } catch (err) {
        showToast(err.message || 'Failed to create coupon', 'error');
      }
    });
  }
}

async function loadAdminData() {
  try {
    const [ordersData, productsData, couponsData] = await Promise.all([
      apiFetch('/orders').catch(() => ({ orders: [] })),
      apiFetch('/products').catch(() => ({ products: [] })),
      apiFetch('/coupons').catch(() => ({ coupons: [] })),
    ]);

    const orders = ordersData.orders || [];
    const products = productsData.products || [];
    const coupons = couponsData.coupons || [];

    // Update KPIs
    if ($('#admin-kpi-orders')) $('#admin-kpi-orders').textContent = orders.length;
    const rev = orders.filter(o => o.paymentStatus === 'PAID').reduce((sum, o) => sum + Number(o.totalAmount), 0);
    if ($('#admin-kpi-revenue')) $('#admin-kpi-revenue').textContent = `₹${rev.toFixed(0)}`;
    if ($('#admin-kpi-coupons')) $('#admin-kpi-coupons').textContent = coupons.length;

    renderAdminOrders(orders);
    renderAdminProducts(products);
    renderAdminCoupons(coupons);
  } catch (err) {
    console.error('Admin stream error:', err);
    showToast('Failed to load admin stream', 'error');
  }
}

function renderAdminOrders(orders) {
  const container = $('#admin-orders-list');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--color-surface50);">No orders placed yet.</div>';
    return;
  }

  container.innerHTML = orders.map(o => {
    const isPaid = o.paymentStatus === 'PAID';
    const itemsText = o.items ? o.items.map(i => `${i.quantity}x ${i.name}`).join(', ') : 'Custom Order';

    let nextActionBtn = '';
    if (o.orderStatus === 'PREPARING') {
      nextActionBtn = `<button type="button" class="btn btn-green-outline btn-sm btn-advance-order" data-id="${o.id}" data-next="HANDI_SEALED">🔥 Seal Handi (140°C)</button>`;
    } else if (o.orderStatus === 'HANDI_SEALED') {
      nextActionBtn = `<button type="button" class="btn btn-green-fill btn-sm btn-advance-order" data-id="${o.id}" data-next="OUT_FOR_DELIVERY">🛵 Dispatch Rider</button>`;
    } else if (o.orderStatus === 'OUT_FOR_DELIVERY') {
      nextActionBtn = `<button type="button" class="btn btn-ghost-stroke btn-sm btn-advance-order" data-id="${o.id}" data-next="DELIVERED">✅ Mark Delivered</button>`;
    }

    return `
      <div class="admin-order-card">
        <div class="admin-order-header">
          <span class="admin-order-number">#${o.orderNumber}</span>
          <div>
            <span class="admin-status-badge ${isPaid ? '' : 'pending'}">${o.paymentStatus}</span>
            <span class="admin-status-badge" style="margin-left:0.3rem;">${o.orderStatus}</span>
          </div>
        </div>
        <div style="font-size:0.85rem;color:#fff;font-weight:600;margin-bottom:0.2rem;">
          👤 ${o.customerName} (${o.customerPhone})
        </div>
        <div style="font-size:0.78rem;color:var(--color-surface75);margin-bottom:0.5rem;">
          📍 ${o.customerAddress} (${o.distanceKm} km away)
        </div>
        <div class="admin-order-items">
          <strong>Dishes:</strong> ${itemsText}
        </div>
        <div class="admin-order-actions">
          <span style="font-family:var(--font-heading);font-weight:800;color:var(--color-shockingly-green);margin-right:auto;">
            ₹${Number(o.totalAmount).toFixed(0)}
          </span>
          ${nextActionBtn}
          <a href="/?track=${o.id}" target="_blank" class="btn btn-ghost btn-sm" style="font-size:0.75rem;">🛰️ Live Track</a>
        </div>
      </div>
    `;
  }).join('');

  $$('.btn-advance-order').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const nextStatus = btn.dataset.next;
      try {
        await apiFetch(`/orders/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        });
        showToast(`Order status updated to ${nextStatus}`, 'success');
        loadAdminData();
      } catch (err) {
        showToast(err.message || 'Status update failed', 'error');
      }
    });
  });
}

function renderAdminProducts(products) {
  const container = $('#admin-menu-list');
  if (!container) return;

  container.innerHTML = products.map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.8rem 1rem;background:var(--color-just-black);border:1px solid var(--color-surface25);border-radius:6px;margin-bottom:0.6rem;">
      <div>
        <h4 style="font-size:0.92rem;color:#fff;margin-bottom:0.2rem;">${p.name}</h4>
        <span style="font-family:var(--font-mono);color:var(--color-shockingly-green);">₹${Number(p.price).toFixed(0)}</span>
      </div>
      <div>
        <button type="button" class="btn btn-ghost-stroke btn-sm btn-toggle-stock" data-id="${p.id}">
          ${p.isAvailable ? '🟢 In Stock' : '🔴 Sold Out'}
        </button>
      </div>
    </div>
  `).join('');

  $$('.btn-toggle-stock').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const p = allProducts.find(item => item.id === id);
      if (p) {
        p.isAvailable = !p.isAvailable;
        filterAndRenderMenu();
        loadAdminData();
        showToast(`Stock updated for "${p.name}"`);
      }
    });
  });
}

function renderAdminCoupons(coupons) {
  const container = $('#admin-coupons-table');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0.5rem;">
      ${coupons.map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--color-just-black);border:1px solid var(--color-surface25);padding:0.7rem 1rem;border-radius:6px;">
          <div>
            <span style="font-family:var(--font-mono);font-weight:700;color:var(--color-shockingly-green);">${c.code}</span>
            <span style="font-size:0.75rem;color:var(--color-surface50);margin-left:0.5rem;">(${c.discountType}: ${c.discountValue}${c.discountType === 'PERCENTAGE' ? '%' : '₹'})</span>
            <div style="font-size:0.75rem;color:var(--color-surface75);">${c.description}</div>
          </div>
          <span style="font-size:0.72rem;color:#abff84;background:rgba(10,228,72,0.1);padding:0.2rem 0.5rem;border-radius:12px;">ACTIVE</span>
        </div>
      `).join('')}
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════
//  15. TOASTS
// ═══════════════════════════════════════════════════════════════

function showToast(message, type = 'success') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = (type === 'success' ? '⚡ ' : '⚠️ ') + message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}


// ═══════════════════════════════════════════════════════════════
//  16. INITIALIZATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initLenis();
  initTypographyAnimations();
  initMobileInteractions();
  initInteractiveStage();
  initSignaturesCarousel();
  initKitchenSettings();
  initCoupons();
  initGoogleAuth();
  initAdminPanel();
  updateAuthUI();
  updateCartUI();
  loadMenu();
  checkUrlTrackingParam();
});
