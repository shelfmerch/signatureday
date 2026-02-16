# Shipping Quote API Setup

This document explains how to set up and use the Delhivery shipping quote API endpoint.

## Installation

### 1. Install axios (if not already installed)

```bash
cd backend
npm install axios
```

### 2. Add Environment Variables

Add your Delhivery API configuration to your `.env` file:

```env
# Delhivery API Token (get from Delhivery Dashboard > Settings > API Setup)
DELHIVERY_TOKEN=your_delhivery_token_here

# Delhivery Environment: 'staging' or 'production'
# staging: https://staging-express.delhivery.com (test data, may return zero rates)
# production: https://track.delhivery.com (real rates, requires production token with API access)
DELHIVERY_ENV=staging
```

**Important Notes:**
- **Staging environment** returns test data and often returns zero rates for many lanes
- **Production environment** requires a production token with invoice/charges API permissions
- If the API returns zero or fails (401/404), the system automatically uses a fallback calculator
- Weights below 100g are automatically adjusted to 100g for more realistic API responses

### 3. Server Configuration

The route is already mounted in `server.js`:

```javascript
import shippingQuoteRoutes from './routes/shippingQuoteRoutes.js';
...
app.use('/api', shippingQuoteRoutes);
```

This creates the endpoint: `POST /api/shipping-quote`

## API Usage

### Request

**Endpoint:** `POST /api/shipping-quote`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "destPincode": "500028",
  "weightGrams": 500
}
```

**Parameters:**
- `destPincode` (required): 6-digit destination pincode (string or number)
- `weightGrams` (required): Weight in grams, must be > 0

### Response Examples

#### Success Response (Serviceable)
```json
{
  "serviceable": true,
  "cod_available": true,
  "city": "Hyderabad",
  "state_code": "TS",
  "district": "Hyderabad",
  "shipping_charge": 123.45
}
```

#### Non-Serviceable Response
```json
{
  "serviceable": false,
  "message": "Pincode not serviceable",
  "cod_available": false,
  "city": null,
  "state_code": null,
  "district": null,
  "shipping_charge": null
}
```

#### Error Response (Invalid Input)
```json
{
  "error": "Invalid pincode. Must be 6 digits"
}
```

#### Error Response (Delhivery Failure)
```json
{
  "error": "Could not fetch rate from Delhivery",
  "details": "Pincode not found in Delhivery database"
}
```

## Frontend Integration (Checkout.tsx)

### Example Usage

```typescript
const fetchShippingQuote = async (pincode: string, weightGrams: number) => {
  try {
    const response = await fetch('/api/shipping-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destPincode: pincode,
        weightGrams: weightGrams,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch shipping quote');
    }

    return data;
  } catch (error) {
    console.error('Shipping quote error:', error);
    throw error;
  }
};

// Usage in component
const handlePincodeChange = async (pincode: string) => {
  if (pincode.length === 6) {
    const weightGrams = 500; // Calculate based on order
    const quote = await fetchShippingQuote(pincode, weightGrams);
    
    if (quote.serviceable) {
      setShippingCharge(quote.shipping_charge);
      setCity(quote.city);
      setState(quote.state_code);
      setDistrict(quote.district);
      setCodAvailable(quote.cod_available);
    } else {
      toast.error(quote.message || 'Cannot deliver to this pincode');
    }
  }
};
```

## Fixed Configuration

- **Origin Pincode:** 110042 (Delhi warehouse)
- **Mode:** S (Surface)
- **Status:** Delivered

These are hardcoded constants in `shippingQuoteRoutes.js`. To change them, modify the constants at the top of the file.

## Error Handling

The API handles the following errors:

- **400 Bad Request:** Invalid input (pincode format, negative weight)
- **500 Internal Server Error:** Missing environment configuration
- **502 Bad Gateway:** Delhivery API failure (serviceability check or rate calculation failed)

All errors include appropriate error messages and in development mode, additional debugging information.

## Security Notes

- The Delhivery API token is stored server-side only and never exposed to the client
- All API calls include a 10-second timeout to prevent hanging requests
- Input validation ensures only valid 6-digit pincodes are accepted
- No secrets are logged in production mode

## Testing

### Test with cURL

```bash
# Test with a valid pincode
curl -X POST http://localhost:4000/api/shipping-quote \
  -H "Content-Type: application/json" \
  -d '{"destPincode": "500028", "weightGrams": 500}'

# Test with invalid pincode
curl -X POST http://localhost:4000/api/shipping-quote \
  -H "Content-Type: application/json" \
  -d '{"destPincode": "12345", "weightGrams": 500}'
```

## Troubleshooting

### Issue: "DELHIVERY_TOKEN not configured"
**Solution:** Add the token to your `.env` file and restart the server

### Issue: API returns 401 (Unauthorized)
**Possible Causes:**
- Token doesn't have access to the environment (staging vs production)
- Token expired or invalid
- Token doesn't have invoice/charges API permissions

**Solution:** 
1. Verify you're using the correct token for the environment (check `DELHIVERY_ENV`)
2. For production, ensure your token has API access enabled in Delhivery Dashboard
3. Contact Delhivery support to enable invoice/charges API access
4. The system will automatically use the fallback calculator if API fails

### Issue: API returns 404 (Not Found)
**Possible Causes:**
- Wrong environment configured
- API endpoint not available for your account

**Solution:**
1. Check your `DELHIVERY_ENV` setting (staging vs production)
2. Try switching between staging and production
3. The system will automatically use the fallback calculator

### Issue: API returns zero shipping charges
**Possible Causes:**
- Using staging environment (returns test data with zero rates)
- Lane/pincode combination not priced in your account
- Weight too low (< 100g)

**Solution:**
1. For real rates, set `DELHIVERY_ENV=production` and use production token
2. The system automatically adjusts weights below 100g to 100g
3. The fallback calculator will be used automatically when zero is returned

### Issue: "Pincode not serviceable"
**Solution:** The pincode exists in Delhivery's database but they don't deliver to it. Consider asking the customer for an alternative address.

### Checking Logs

The backend provides detailed logs for debugging:
- `[Delhivery Rate] Environment:` - Shows which environment is being used
- `[Delhivery Rate] Host:` - Shows the API endpoint being called
- `[Delhivery Rate] Response status:` - Shows HTTP status code
- `[Shipping Quote] rate_source:` - Shows if 'delhivery' or 'fallback' was used

Look for ✓ (success) and ✗ (failure) symbols in logs.
