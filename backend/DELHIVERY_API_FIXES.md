# Delhivery API Fixes - Summary

## Problem Statement

The Delhivery shipping rate API integration had several issues:
1. **Staging returns 0**: Staging environment returned `total_amount: 0` for all requests
2. **Production returns 401**: Production endpoint returned unauthorized errors
3. **No environment switching**: Hardcoded to staging URL
4. **Poor validation**: Accepting unrealistic weights (10g) causing bad API responses
5. **No fallback**: System failed when API returned 0 or errors
6. **Poor logging**: Difficult to debug API issues

## Solutions Implemented

### 1. Environment-Based Host Selection

Added `DELHIVERY_ENV` environment variable to switch between staging and production:

```javascript
const DELHIVERY_ENV = process.env.DELHIVERY_ENV || 'staging';
const getApiHost = () => {
  return DELHIVERY_ENV === 'production' 
    ? 'https://track.delhivery.com'
    : 'https://staging-express.delhivery.com';
};
```

**Configuration:**
```env
# In .env file
DELHIVERY_ENV=staging  # or 'production'
DELHIVERY_TOKEN=your_token_here
```

### 2. Weight Validation

Added realistic weight bounds and automatic adjustment:

```javascript
const MIN_WEIGHT_GRAMS = 100;  // Minimum realistic weight
const MAX_WEIGHT_GRAMS = 30000; // Maximum reasonable weight (30kg)

// Automatically adjust weights below minimum
const effectiveWeight = Math.max(weightGrams, MIN_WEIGHT_GRAMS);
```

**Why:** Delhivery API may return zero or invalid rates for very small weights (< 100g).

### 3. Enhanced Error Handling

Added detailed error handling for common API issues:

```javascript
// Handle 401 errors
if (response.status === 401) {
  throw new Error(`Delhivery API authentication failed (401). Token may not have access to ${DELHIVERY_ENV} environment.`);
}

// Handle 404 errors
if (response.status === 404) {
  throw new Error(`Delhivery rate endpoint not found (404). Check if ${host} is the correct host.`);
}

// Handle zero rates
if (response.data.total_amount === 0) {
  throw new Error(`Delhivery returned zero amount (likely ${DELHIVERY_ENV} has no pricing for this lane)`);
}
```

### 4. Automatic Fallback Calculator

When API returns 0 or fails, automatically uses zone-based calculator:

```javascript
try {
  shippingCharge = await fetchRate(ORIGIN_PINCODE, pincodeStr, effectiveWeight);
} catch (rateError) {
  // Use fallback calculator
  shippingCharge = calculateFallbackShipping(pincodeStr, effectiveWeight);
  usedFallback = true;
}
```

**Fallback Rates:**
- Delhi NCR (11-20): ₹50
- Tier 1 cities (40-76): ₹149
- Nearby states (12-18, 24-34): ₹99
- Other regions: ₹199
- Weight surcharge: ₹20 per 500g above 1kg

### 5. Enhanced Logging

Added comprehensive logging with status symbols:

```javascript
console.log('[Delhivery Rate] Environment:', DELHIVERY_ENV);
console.log('[Delhivery Rate] Host:', host);
console.log('[Delhivery Rate] Request params:', params);
console.log('[Delhivery Rate] ✓ Got valid rate:', response.data.total_amount);
console.error('[Delhivery Rate] ✗ API Error:', error);
```

**Log Symbols:**
- ✓ = Success
- ✗ = Failure  
- → = Action/transition
- ⚠ = Warning

### 6. Rate Source Tracking

Response now includes `rate_source` field:

```json
{
  "serviceable": true,
  "shipping_charge": 149,
  "rate_source": "fallback", // or "delhivery"
  "cod_available": true,
  "city": "Hyderabad"
}
```

This helps debug whether real API rates or fallback rates are being used.

## Usage

### For Development (Staging)

```env
DELHIVERY_ENV=staging
DELHIVERY_TOKEN=your_staging_token
```

**Expected behavior:**
- API likely returns `total_amount: 0`
- System automatically uses fallback calculator
- `rate_source: "fallback"` in response

### For Production (Real Rates)

```env
DELHIVERY_ENV=production
DELHIVERY_TOKEN=your_production_token_with_api_access
```

**Expected behavior:**
- API returns real shipping charges
- `rate_source: "delhivery"` in response
- Falls back to calculator if API fails

## Testing

### Test Staging Environment

```bash
# In backend/.env
DELHIVERY_ENV=staging

# Test request
curl -X POST http://localhost:4000/api/shipping-quote \
  -H "Content-Type: application/json" \
  -d '{"destPincode": "500028", "weightGrams": 200}'
```

**Expected:**
- Logs show: `Environment: staging`
- Logs show: `Host: https://staging-express.delhivery.com`
- Response shows: `rate_source: "fallback"` (since staging returns 0)
- Valid shipping charge calculated

### Test Production Environment

```bash
# In backend/.env
DELHIVERY_ENV=production

# Test request (same as above)
```

**Expected if token has access:**
- Logs show: `Environment: production`
- Logs show: `Host: https://track.delhivery.com`
- Response shows: `rate_source: "delhivery"`
- Real Delhivery rates

**Expected if token lacks access:**
- Logs show: `✗ API Error: 401`
- Falls back to calculator
- Response shows: `rate_source: "fallback"`
- Valid shipping charge calculated

## Common Issues & Solutions

### Issue: "401 Unauthorized" in Production

**Cause:** Production token doesn't have invoice/charges API access

**Solutions:**
1. Contact Delhivery to enable API access for your account
2. Verify token has correct permissions in Delhivery Dashboard
3. Switch to staging temporarily: `DELHIVERY_ENV=staging`
4. System will use fallback calculator automatically

### Issue: All rates are from fallback

**Diagnosis:** Check logs for `rate_source: "fallback"`

**Causes:**
- Using staging (expected - staging returns 0)
- Production token lacks permissions (401 error)
- API endpoint not found (404 error)
- Network issues

**Solutions:**
1. For real rates: use production with proper token
2. Fallback provides reasonable estimates
3. Check backend logs for specific error

### Issue: Rates seem incorrect

**Check:**
1. `rate_source` in response (is it using API or fallback?)
2. Backend logs for actual API response
3. Environment variable (`DELHIVERY_ENV`)
4. Weight being sent (minimum 100g enforced)

## Files Modified

1. `backend/routes/shippingQuoteRoutes.js` - Main API implementation
2. `backend/SHIPPING_QUOTE_SETUP.md` - Updated documentation
3. `backend/DELHIVERY_API_FIXES.md` - This file (summary)

## Next Steps

1. **Get Production Access:**
   - Contact Delhivery support
   - Request invoice/charges API access for production
   - Get production API token

2. **Test Production:**
   - Set `DELHIVERY_ENV=production`
   - Update token to production token
   - Test with real pincodes
   - Verify `rate_source: "delhivery"` in response

3. **Monitor Logs:**
   - Watch for ✓ and ✗ symbols
   - Check `rate_source` in responses
   - Verify rates are reasonable

4. **Fallback is OK:**
   - Fallback calculator provides reasonable estimates
   - Safe to deploy even if production API isn't ready
   - System will automatically switch to real rates when API works

