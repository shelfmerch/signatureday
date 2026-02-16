// services/totebagClaimService.js

const DEV_CONFIG = {
    // Use relative path to go through Vite proxy (avoids CORS issues)
    apiUrl: import.meta.env.DEV 
      ? '/api/partner/claim'  // Development: use proxy
      : 'http://localhost:5000/api/partner/claim', // Production: direct URL
    apiKey: 'cb_b2b94d0b73a0dce6ef413ead402c299c', // From createTestPartner.ts
    causeId: '6875f471a44264183ce0a462',
    causeTitle: 'save water - from signature day'
  };
  
  export async function claimToteBag(userData) {
    const {
      fullName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      purpose = 'Personal use',
      causeId,
      causeTitle
    } = userData;

    // Validate required fields
    const missingFields = [];
    if (!fullName || fullName.trim() === '') missingFields.push('fullName');
    if (!email || email.trim() === '') missingFields.push('email');
    if (!phone || phone.trim() === '') missingFields.push('phone');
    if (!address || address.trim() === '') missingFields.push('address');
    if (!city || city.trim() === '') missingFields.push('city');
    if (!state || state.trim() === '') missingFields.push('state');
    if (!zipCode || zipCode.trim() === '') missingFields.push('zipCode');

    if (missingFields.length > 0) {
      const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
      console.error('[ToteBag Claim] Validation failed:', errorMsg);
      console.error('[ToteBag Claim] Received data:', { fullName, email, phone, address, city, state, zipCode, purpose });
      return {
        success: false,
        error: errorMsg,
        message: errorMsg
      };
    }

    // Use provided cause or fallback to default
    const finalCauseId = causeId || DEV_CONFIG.causeId;
    const finalCauseTitle = causeTitle || DEV_CONFIG.causeTitle;

    const requestPayload = {
      causeId: finalCauseId,
      causeTitle: finalCauseTitle,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      purpose: purpose.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(), // State is already validated above, so it should not be empty
      zipCode: zipCode.trim()
    };
    
    console.log('[ToteBag Claim] Validated state value:', requestPayload.state);

    console.log('[ToteBag Claim] Starting claim request...');
    console.log('[ToteBag Claim] API URL:', DEV_CONFIG.apiUrl);
    console.log('[ToteBag Claim] Using proxy:', import.meta.env.DEV ? 'Yes (via Vite proxy)' : 'No (direct)');
    console.log('[ToteBag Claim] Request payload:', JSON.stringify(requestPayload, null, 2));
    console.log('[ToteBag Claim] API Key present:', !!DEV_CONFIG.apiKey);

    try {
      const response = await fetch(DEV_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': DEV_CONFIG.apiKey
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('[ToteBag Claim] Response status:', response.status);
      console.log('[ToteBag Claim] Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('[ToteBag Claim] Response data:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        const errorMsg = data.message || `API Error: ${response.status}`;
        console.error('[ToteBag Claim] API error response:', {
          status: response.status,
          statusText: response.statusText,
          message: errorMsg,
          data
        });
        throw new Error(errorMsg);
      }

      console.log('[ToteBag Claim] ✅ Claim successfully created and sent!');
      console.log('[ToteBag Claim] Claim ID:', data.id || data._id || 'N/A');
      console.log('[ToteBag Claim] Full response:', data);

      return {
        success: true,
        claim: data,
        message: 'ToteBag claim submitted successfully!'
      };
    } catch (error) {
      console.error('[ToteBag Claim] ❌ Error occurred:', error);
      console.error('[ToteBag Claim] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Check for network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('[ToteBag Claim] Network error - API endpoint may be unreachable');
      }

      return {
        success: false,
        error: error.message,
        message: error.message || 'Failed to submit totebag claim'
      };
    }
  }