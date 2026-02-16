import puppeteer from 'puppeteer';
import OrderRenderStatus from '../models/OrderRenderStatus.js';
import Order from '../models/orderModel.js';
import { generateGridVariants } from '../utils/gridVariantGenerator.js';
import fs from 'fs';
import path from 'path';

// Configuration
const RENDER_TIMEOUT_MS = 60000; // 60s per variant (increased)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // Base delay for exponential backoff
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
const DEBUG_SCREENSHOTS = process.env.DEBUG_SCREENSHOTS === 'true';

// Browser instance management
let browserInstance = null;
let browserLaunchPromise = null;

const ensureDebugDir = () => {
    const debugDir = path.join(process.cwd(), 'debug-screenshots');
    if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
    }
    return debugDir;
};

const getBrowser = async () => {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }
    
    // Prevent multiple simultaneous launches
    if (browserLaunchPromise) {
        return browserLaunchPromise;
    }
    
    browserLaunchPromise = (async () => {
        try {
            console.log('[Render] Launching new browser instance...');
            browserInstance = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process', // More stable on Windows
                    '--disable-extensions',
                    '--font-render-hinting=none'
                ],
                defaultViewport: { width: 2550, height: 3300 }
            });
            
            browserInstance.on('disconnected', () => {
                console.log('[Render] Browser disconnected');
                browserInstance = null;
            });
            
            return browserInstance;
        } finally {
            browserLaunchPromise = null;
        }
    })();
    
    return browserLaunchPromise;
};

const closeBrowser = async () => {
    if (browserInstance) {
        try {
            await browserInstance.close();
        } catch (e) {
            console.error('[Render] Error closing browser:', e.message);
        }
        browserInstance = null;
    }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const uploadToCloudinary = async (dataUrl, folder = 'center-variants') => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.CLOUDINARY_UNSIGNED_PRESET || process.env.VITE_CLOUDINARY_UNSIGNED_PRESET;
    
    if (!cloudName || !preset) {
        console.warn('[Render] Cloudinary not configured, using data URL');
        return dataUrl;
    }
    
    const form = new FormData();
    form.append('file', dataUrl);
    form.append('upload_preset', preset);
    if (folder) form.append('folder', folder);
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: form,
    });
    
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
    }
    
    const json = await res.json();
    return json.secure_url;
};

/**
 * Render a single variant with retry logic
 */
const renderVariantWithRetry = async (page, orderId, variantId, attempt = 1) => {
    const renderUrl = `${FRONTEND_URL}/render/canvas/${orderId}/${variantId}?token=${process.env.RENDER_TOKEN}`;
    
    console.log(`[Render] Attempt ${attempt}/${MAX_RETRIES} for variant ${variantId}`);
    
    try {
        // Navigate with network idle wait
        await page.goto(renderUrl, { 
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 30000 
        });
        
        // Wait a moment for React to hydrate
        await sleep(1000);
        
        // Check for error state first
        const errorEl = await page.$('#error');
        if (errorEl) {
            const errorText = await page.$eval('#error', el => el.textContent);
            throw new Error(`Page error: ${errorText}`);
        }
        
        // Poll for render-complete with incremental waits
        let completed = false;
        const startTime = Date.now();
        
        while (!completed && (Date.now() - startTime) < RENDER_TIMEOUT_MS) {
            const completeEl = await page.$('#render-complete');
            if (completeEl) {
                completed = true;
                break;
            }
            
            // Check for error during wait
            const err = await page.$('#error');
            if (err) {
                const errorText = await page.$eval('#error', el => el.textContent);
                throw new Error(`Page error during render: ${errorText}`);
            }
            
            await sleep(500);
        }
        
        if (!completed) {
            // Take debug screenshot
            if (DEBUG_SCREENSHOTS) {
                const debugDir = ensureDebugDir();
                const screenshotPath = path.join(debugDir, `timeout-${orderId}-${variantId}-${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`[Render] Timeout screenshot saved: ${screenshotPath}`);
            }
            
            // Get page content for debugging
            const pageContent = await page.content();
            const bodyText = pageContent.substring(0, 500);
            throw new Error(`Timeout waiting for render-complete. Page state: ${bodyText}`);
        }
        
        // Extract the rendered image
        const imgEl = await page.$('#rendered-image');
        if (!imgEl) {
            throw new Error('Rendered image element not found');
        }
        
        const dataUrl = await page.$eval('#rendered-image', el => el.src);
        
        if (!dataUrl || !dataUrl.startsWith('data:image')) {
            throw new Error(`Invalid image data URL: ${dataUrl?.substring(0, 50)}`);
        }
        
        return dataUrl;
        
    } catch (error) {
        console.error(`[Render] Attempt ${attempt} failed for variant ${variantId}:`, error.message);
        
        if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(`[Render] Retrying in ${delay}ms...`);
            await sleep(delay);
            
            // Refresh the page completely for retry
            try {
                await page.goto('about:blank');
            } catch (e) {
                // Ignore navigation errors
            }
            
            return renderVariantWithRetry(page, orderId, variantId, attempt + 1);
        }
        
        throw error;
    }
};

/**
 * Queue a render job for an order
 */
export const queueOrderRender = async (orderId) => {
    const orderIdStr = String(orderId);
    
    try {
        // Check existing status
        let renderStatus = await OrderRenderStatus.findOne({ orderId: orderIdStr });
        
        if (renderStatus && (renderStatus.status === 'completed' || renderStatus.status === 'processing')) {
            console.log(`[Render] Order ${orderId} already ${renderStatus.status}, skipping`);
            return;
        }
        
        // Create or reset status
        if (!renderStatus) {
            renderStatus = await OrderRenderStatus.create({
                orderId: orderIdStr,
                status: 'queued',
                totalVariants: 0,
                completedVariants: 0,
                variants: []
            });
        } else {
            // Reset failed job
            await OrderRenderStatus.findByIdAndUpdate(renderStatus._id, {
                status: 'queued',
                error: null,
                completedVariants: 0
            });
        }

        // Fetch order
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderIdStr);
        const order = await Order.findOne(
            isObjectId ? { _id: orderIdStr } : { clientOrderId: orderIdStr }
        ).lean();
        
        if (!order) {
            throw new Error('Order not found');
        }

        const effectiveOrderId = order.clientOrderId || String(order._id);

        // Start processing in background
        setImmediate(() => {
            processRenderJob(effectiveOrderId, order, renderStatus._id).catch(err => {
                console.error(`[Render] Background job failed for order ${orderId}:`, err);
            });
        });

    } catch (error) {
        console.error(`[Render] Failed to queue render for order ${orderId}:`, error);
        throw error;
    }
};

/**
 * Process the render job with robust error handling
 */
const processRenderJob = async (orderId, order, statusId) => {
    console.log(`[Render] Starting job for order ${orderId}`);
    let page = null;

    try {
        // Update status to processing
        await OrderRenderStatus.findByIdAndUpdate(statusId, { status: 'processing' });

        // Generate variant list on backend
        const variantsData = generateGridVariants(order);
        
        if (!variantsData || variantsData.length === 0) {
            console.log(`[Render] No variants to generate for order ${orderId}`);
            await OrderRenderStatus.findByIdAndUpdate(statusId, {
                status: 'completed',
                totalVariants: 0,
                completedVariants: 0
            });
            return;
        }
        
        console.log(`[Render] Generated ${variantsData.length} variants to render`);

        // Initialize status with variant list
        await OrderRenderStatus.findByIdAndUpdate(statusId, {
            totalVariants: variantsData.length,
            variants: variantsData.map(v => ({ 
                variantId: v.id, 
                centerMemberId: v.centerMember.id, 
                status: 'pending' 
            }))
        });

        // Get browser and create page
        const browser = await getBrowser();
        page = await browser.newPage();
        
        // Set up console logging from page
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`[Render] Page console error: ${msg.text()}`);
            }
        });
        
        page.on('pageerror', error => {
            console.log(`[Render] Page error: ${error.message}`);
        });

        const results = [];
        const failedVariants = [];

        // Render each variant
        for (let i = 0; i < variantsData.length; i++) {
            const variant = variantsData[i];
            const variantId = variant.id;

            console.log(`[Render] Processing variant ${i + 1}/${variantsData.length}: ${variantId}`);

            try {
                // Render with retry
                const dataUrl = await renderVariantWithRetry(page, orderId, variantId);

                // Upload to Cloudinary
                const imageUrl = await uploadToCloudinary(dataUrl, `center-variants/${orderId}`);

                // Update variant status
                const centerMemberName = variant.centerMember?.name;
                await OrderRenderStatus.updateOne(
                    { _id: statusId, "variants.variantId": variantId },
                    {
                        $set: {
                            "variants.$.status": 'completed',
                            "variants.$.imageUrl": imageUrl,
                            "variants.$.centerMemberName": centerMemberName
                        },
                        $inc: { completedVariants: 1 }
                    }
                );

                results.push({ variantId, imageUrl, centerMemberName });
                console.log(`[Render] Completed variant ${variantId}`);

            } catch (variantError) {
                console.error(`[Render] Failed variant ${variantId}:`, variantError.message);
                failedVariants.push({ variantId, error: variantError.message });
                
                // Update variant as failed but continue with others
                await OrderRenderStatus.updateOne(
                    { _id: statusId, "variants.variantId": variantId },
                    { $set: { "variants.$.status": 'failed', "variants.$.error": variantError.message } }
                );
            }
        }

        // Close page
        if (page) {
            await page.close().catch(() => {});
            page = null;
        }

        // Determine final status
        const allFailed = failedVariants.length === variantsData.length;
        const finalStatus = allFailed ? 'failed' : 'completed';
        
        await OrderRenderStatus.findByIdAndUpdate(statusId, {
            status: finalStatus,
            completedVariants: results.length,
            error: failedVariants.length > 0 ? `${failedVariants.length} variants failed` : null
        });

        // Persist successful results to Order.centerVariantImages
        if (results.length > 0) {
            const centerVariantImages = results.map(r => ({
                variantId: r.variantId,
                imageUrl: r.imageUrl,
                centerMemberName: r.centerMemberName
            }));
            
            await Order.findOneAndUpdate(
                { clientOrderId: orderId },
                { $set: { centerVariantImages } }
            );
        }

        console.log(`[Render] Job ${finalStatus} for order ${orderId}: ${results.length}/${variantsData.length} variants`);

    } catch (error) {
        console.error(`[Render] Job failed for order ${orderId}:`, error);
        
        await OrderRenderStatus.findByIdAndUpdate(statusId, {
            status: 'failed',
            error: error.message
        });
        
    } finally {
        // Clean up page if still open
        if (page) {
            await page.close().catch(() => {});
        }
    }
};

// Cleanup on process exit
process.on('SIGTERM', closeBrowser);
process.on('SIGINT', closeBrowser);
