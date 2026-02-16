/**
 * Shipping Quote API Route
 * 
 * Purpose: Provides real-time shipping information from Delhivery including:
 * - Serviceability check (whether pincode is deliverable)
 * - COD availability check
 * - Live shipping rate calculation
 * - Location details autofill (city, state, district)
 * 
 * Flow:
 * 1. Validates input (pincode, weight)
 * 2. Checks Delhivery serviceability for the destination pincode
 * 3. Fetches shipping rate based on origin (500081), destination, weight, and mode (Surface)
 * 4. Returns consolidated response with serviceability, COD status, location, and shipping charge
 * 
 * Usage in frontend (Checkout.tsx):
 * POST /api/shipping-quote
 * Body: { "destPincode": "500028", "weightGrams": 500 }
 * Response: { "serviceable": true, "cod_available": true, "city": "Hyderabad", "state_code": "TS", "district": "Hyderabad", "shipping_charge": 123.45 }
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

// Configuration
const ORIGIN_PINCODE = "500081"; // Fixed origin pincode (Delhi warehouse)
const MODE = "S"; // Surface mode
const STATUS = "Delivered"; // Shipment status
const MIN_WEIGHT_GRAMS = 100; // Minimum realistic weight in grams
const MAX_WEIGHT_GRAMS = 30000; // Maximum reasonable weight in grams

// Environment-based host selection
const DELHIVERY_ENV = process.env.DELHIVERY_ENV || 'production'; // 'production' or 'staging'
const getApiHost = () => {
  return DELHIVERY_ENV === 'production' 
    ? 'https://track.delhivery.com'
    : 'https://staging-express.delhivery.com';
};

/**
 * Helper: Fetch serviceability for a destination pincode
 * @param {string} destPincode - 6-digit pincode
 * @returns {Promise<Object>} Serviceability data from Delhivery
 */
const fetchServiceability = async (destPincode) => {
  const token = process.env.DELHIVERY_TOKEN;
  
  if (!token) {
    throw new Error('DELHIVERY_TOKEN not configured in environment');
  }

  const host = getApiHost();
  const url = `${host}/c/api/pin-codes/json/?filter_codes=${destPincode}`;
  
  console.log('[Delhivery Serviceability] Using host:', host);
  console.log('[Delhivery Serviceability] Request URL:', url);
  
  const response = await axios.get(url, {
    headers: {
      'Authorization': `Token ${token}`
    },
    timeout: 10000 // 10 second timeout
  });

  console.log('[Delhivery Serviceability] Response type:', typeof response.data);
  console.log('[Delhivery Serviceability] Is array:', Array.isArray(response.data));
  console.log('[Delhivery Serviceability] Response keys:', Object.keys(response.data || {}));
  
  if (!response.data) {
    console.error('[Delhivery Serviceability] No response data');
    throw new Error('Pincode not found in Delhivery database');
  }

  let pincodeData = null;

  // Delhivery can return either an array or an object with pincode as key
  if (Array.isArray(response.data)) {
    // Array response
    if (response.data.length === 0) {
      throw new Error('Pincode not found in Delhivery database');
    }
    
    // Find the matching pincode
    pincodeData = response.data.find(item => {
      const itemPinCode = item.pinCode || item.pincode || item.pin;
      return itemPinCode === destPincode || itemPinCode === parseInt(destPincode) || String(itemPinCode) === destPincode;
    });
  } else if (typeof response.data === 'object') {
    // Object response - check for delivery_codes key
    const dataKeys = Object.keys(response.data);
    console.log('[Delhivery] Object response keys:', dataKeys.slice(0, 5));
    
    // If delivery_codes exists, it contains the pincode data
    if (response.data.delivery_codes && Array.isArray(response.data.delivery_codes)) {
      console.log('[Delhivery] Found delivery_codes array with length:', response.data.delivery_codes.length);
      const normalizedDest = String(destPincode).trim();
      pincodeData = response.data.delivery_codes.find(item => {
        // Try postal_code.pin first, then fallback to item.pin
        const itemPinCode = item.postal_code?.pin || item.pin || item.pinCode || item.pincode;
        return String(itemPinCode) === normalizedDest;
      });
    }
    
    // Fallback: Try to find pincode directly in the object
    if (!pincodeData) {
      pincodeData = response.data[destPincode] || response.data[parseInt(destPincode)];
    }
    
    // Another fallback: Search in nested arrays
    if (!pincodeData) {
      for (const key in response.data) {
        const value = response.data[key];
        if (Array.isArray(value)) {
          pincodeData = value.find(item => {
            const itemPinCode = item.pinCode || item.pincode || item.pin || key;
            return itemPinCode === destPincode || itemPinCode === parseInt(destPincode) || String(itemPinCode) === destPincode;
          });
          if (pincodeData) break;
        }
      }
    }
  }
  
  if (!pincodeData) {
    console.error('[Delhivery] Pincode not found in response:', destPincode);
    throw new Error('Pincode not found in Delhivery database');
  }

  console.log('[Delhivery Serviceability] Extracted pincode data:', JSON.stringify(pincodeData, null, 2));
  
  // Extract data - serviceability flags are inside postal_code
  const postalCode = pincodeData.postal_code || pincodeData;
  
  return {
    serviceable: postalCode.pre_paid === "Y" || postalCode.pre_paid === "y",
    cod_available: postalCode.cod === "Y" || postalCode.cod === "y",
    is_oda: postalCode.is_oda === "Y" || postalCode.is_oda === "y",
    city: postalCode.city || null,
    state_code: postalCode.state_code || null,
    district: postalCode.district || null,
    state: postalCode.state || null,
    region: postalCode.region || null,
    // Keep raw data for debugging
    raw: pincodeData
  };
};

/**
 * Fallback shipping calculator for when API returns 0 or fails
 */
const calculateFallbackShipping = (destPincode, weightGrams) => {
  const destCode = parseInt(destPincode.substring(0, 2));
  const weightKg = weightGrams / 1000;
  
  // Base charges by zone
  let charge = 99; // Default
  
  // Tier 1 cities (40-76 range typically)
  if (destCode >= 40 && destCode <= 76) {
    charge = 149;
  } 
  // Delhi NCR (11-20)
  else if (destCode >= 11 && destCode <= 20) {
    charge = 50;
  }
  // Nearby states (12-18, 24-34)
  else if ((destCode >= 12 && destCode <= 18) || (destCode >= 24 && destCode <= 34)) {
    charge = 99;
  }
  
  // Weight surcharge for heavier packages
  if (weightKg > 1) {
    charge += Math.ceil((weightKg - 1) / 0.5) * 20;
  }
  
  return Math.round(charge);
};

/**
 * Helper: Fetch shipping rate from Delhivery
 * @param {string} originPincode - Origin pincode
 * @param {string} destPincode - Destination pincode
 * @param {number} weightGrams - Weight in grams
 * @returns {Promise<number>} Shipping charge
 */
const fetchRate = async (originPincode, destPincode, weightGrams) => {
  const token = process.env.DELHIVERY_TOKEN;
  
  if (!token) {
    throw new Error('DELHIVERY_TOKEN not configured in environment');
  }

  // Use environment-based host
  const host = getApiHost();
  const url = `${host}/api/kinko/v1/invoice/charges/.json`;
  
  const params = {
    o_pin: originPincode,
    d_pin: destPincode,
    cgm: weightGrams,
    md: MODE,
    ss: STATUS
  };
  
  console.log('[Delhivery Rate] Environment:', DELHIVERY_ENV);
  console.log('[Delhivery Rate] Host:', host);
  console.log('[Delhivery Rate] Request params:', params);
  
  try {
    const response = await axios.get(url, {
      params,
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });

    console.log('[Delhivery Rate] Response status:', response.status);
    console.log('[Delhivery Rate] Response data:', JSON.stringify(response.data, null, 2));

    // Handle auth errors
    if (response.status === 401) {
      throw new Error(`Delhivery API authentication failed (401). Token may not have access to ${DELHIVERY_ENV} environment.`);
    }

    // Handle not found
    if (response.status === 404) {
      throw new Error(`Delhivery rate endpoint not found (404). Check if ${host} is the correct host.`);
    }

    if (response.status !== 200) {
      throw new Error(`Delhivery API returned status ${response.status}`);
    }

    if (!response.data) {
      throw new Error('Empty response from Delhivery');
    }

    // Parse response - Delhivery sometimes wraps data in an array
    let rateData = response.data;
    
    // If response is an array, extract the first element
    if (Array.isArray(response.data)) {
      console.log('[Delhivery Rate] Response is array, length:', response.data.length);
      if (response.data.length === 0) {
        throw new Error('Delhivery returned empty array');
      }
      rateData = response.data[0];
      console.log('[Delhivery Rate] Extracted rate data:', JSON.stringify(rateData, null, 2));
    }

    // Validate we have an object
    if (!rateData || typeof rateData !== 'object') {
      throw new Error('Invalid rate data structure from Delhivery');
    }

    // Log parsed values
    console.log('[Delhivery Rate] Parsed values:', {
      zone: rateData.zone || 'N/A',
      total_amount: rateData.total_amount,
      gross_amount: rateData.gross_amount,
      charged_weight: rateData.charged_weight
    });

    // Check if total_amount exists and is valid
    if (typeof rateData.total_amount === 'number' && rateData.total_amount > 0) {
      console.log('[Delhivery Rate] ✓ Got valid rate:', rateData.total_amount, `(Zone: ${rateData.zone || 'unknown'})`);
      return rateData.total_amount;
    }

    // Try to calculate from individual charges if total is 0
    if (rateData.total_amount === 0 && rateData.gross_amount && rateData.gross_amount > 0) {
      console.log('[Delhivery Rate] Using gross_amount instead of total_amount:', rateData.gross_amount, `(Zone: ${rateData.zone || 'unknown'})`);
      return rateData.gross_amount;
    }

    // If API returns 0 or invalid amount, throw error to trigger fallback
    console.warn('[Delhivery Rate] ⚠ API returned zero/invalid amount. Zone:', rateData.zone || 'unknown', 'Total:', rateData.total_amount, 'Gross:', rateData.gross_amount);
    throw new Error(`Delhivery returned zero amount (likely ${DELHIVERY_ENV} has no pricing for this lane)`);
    
  } catch (error) {
    // Log detailed error information
    if (error.response) {
      console.error('[Delhivery Rate] API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('[Delhivery Rate] Network Error: No response received');
    } else {
      console.error('[Delhivery Rate] Error:', error.message);
    }
    throw error;
  }
};

/**
 * POST /api/shipping-quote
 * Get real-time shipping quote from Delhivery
 */
router.post('/shipping-quote', async (req, res) => {
  try {
    // Step A: Validate inputs
    const { destPincode, weightGrams } = req.body;

    console.log('[Shipping Quote] Request received:', { destPincode, weightGrams });

    // Validate pincode
    if (!destPincode) {
      return res.status(400).json({ error: 'destPincode is required' });
    }

    const pincodeStr = String(destPincode).trim();
    if (pincodeStr.length !== 6 || !/^\d{6}$/.test(pincodeStr)) {
      return res.status(400).json({ error: 'Invalid pincode. Must be 6 digits' });
    }

    // Validate weight with realistic bounds
    if (!weightGrams || weightGrams <= 0) {
      return res.status(400).json({ error: 'weightGrams must be greater than 0' });
    }

    if (weightGrams < MIN_WEIGHT_GRAMS) {
      console.warn(`[Shipping Quote] Weight ${weightGrams}g below minimum ${MIN_WEIGHT_GRAMS}g, adjusting`);
    }

    if (weightGrams > MAX_WEIGHT_GRAMS) {
      return res.status(400).json({ 
        error: `weightGrams exceeds maximum of ${MAX_WEIGHT_GRAMS}g (${MAX_WEIGHT_GRAMS/1000}kg)` 
      });
    }

    // Use realistic weight (minimum 100g for API calls)
    const effectiveWeight = Math.max(weightGrams, MIN_WEIGHT_GRAMS);

    // Check token is configured
    if (!process.env.DELHIVERY_TOKEN) {
      console.error('DELHIVERY_TOKEN not found in environment');
      return res.status(500).json({ error: 'Shipping service not configured' });
    }

    console.log('[Shipping Quote] Environment:', DELHIVERY_ENV);
    console.log('[Shipping Quote] Using effective weight:', effectiveWeight, 'grams');

    // Step B: Check serviceability
    let serviceabilityData;
    try {
      serviceabilityData = await fetchServiceability(pincodeStr);
    } catch (serviceabilityError) {
      console.error('Serviceability check failed:', serviceabilityError.message);
      return res.status(502).json({
        serviceable: false,
        message: 'Could not check serviceability. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? serviceabilityError.message : undefined
      });
    }

    // If not serviceable, return early
    if (!serviceabilityData.serviceable) {
      return res.status(200).json({
        serviceable: false,
        message: 'Pincode not serviceable',
        cod_available: false,
        city: serviceabilityData.city || null,
        district: serviceabilityData.district || null,
        state_code: serviceabilityData.state_code || null,
        is_oda: serviceabilityData.is_oda || false,
        shipping_charge: null
      });
    }

    // Step C: Get shipping rate
    let shippingCharge = null;
    let usedFallback = false;
    
    try {
      shippingCharge = await fetchRate(ORIGIN_PINCODE, pincodeStr, effectiveWeight);
      console.log('[Shipping Quote] ✓ Delhivery API rate:', shippingCharge);
    } catch (rateError) {
      console.error('[Shipping Quote] ✗ Rate calculation failed:', rateError.message);
      console.log('[Shipping Quote] → Using fallback calculator');
      // Use fallback calculator when API fails
      shippingCharge = calculateFallbackShipping(pincodeStr, effectiveWeight);
      usedFallback = true;
      console.log('[Shipping Quote] ✓ Fallback rate calculated:', shippingCharge);
    }

    // Step D: Final response
    const response = {
      serviceable: true,
      cod_available: serviceabilityData.cod_available || false,
      city: serviceabilityData.city || null,
      district: serviceabilityData.district || null,
      state_code: serviceabilityData.state_code || null,
      is_oda: serviceabilityData.is_oda || false,
      shipping_charge: shippingCharge, // Always returns a valid amount
      rate_source: usedFallback ? 'fallback' : 'delhivery' // Indicate source for debugging
    };

    console.log('[Shipping Quote] ✓ Response:', {
      pincode: pincodeStr,
      serviceable: response.serviceable,
      shipping_charge: response.shipping_charge,
      rate_source: response.rate_source
    });

    res.status(200).json(response);

  } catch (error) {
    console.error('[Shipping Quote] ✗ Unexpected error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
