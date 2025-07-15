import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import QRCode from "qrcode";

const app = express();
const port = process.env.PORT || 3000;
const host = "0.0.0.0"; // Bind to all interfaces

// Middleware
app.use(bodyParser.json());

// Add CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Saweria API is running!",
    version: "1.0.0",
    server_info: {
      host: host,
      port: port,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    },
    endpoints: {
      "POST /qris": "Generate QRIS payment",
      "GET /status/:donationId": "Check payment status",
      "GET /balance": "Check account balance",
    },
    usage_examples: {
      qris: `curl -X POST http://localhost:${port}/qris -H "Content-Type: application/json" -d '{"amount": 10000, "userId": "your-user-id"}'`,
      status: `curl http://localhost:${port}/status/donation-id`,
      balance: `curl "http://localhost:${port}/balance?token=your-token"`,
    },
  });
});

/**
 * Generate QRIS payment
 */
async function generateQRIS(amount, userId) {
  const API_URL_QRIS = `https://backend.saweria.co/donations/${userId}`;

  try {
    console.log(
      `[${new Date().toISOString()}] Attempting to generate QRIS for user: ${userId}, amount: ${amount}`
    );

    const response = await fetch(API_URL_QRIS, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        "Content-Type": "application/json",
        Origin: "https://saweria.co",
        Referer: "https://saweria.co/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        agree: true,
        notUnderage: true,
        message: "Donation via API",
        amount: amount,
        payment_type: "qris",
        vote: "",
        currency: "IDR",
        customer_info: {
          first_name: "Anonymous",
          email: "no-reply@donation.my.id",
          phone: "",
        },
      }),
    });

    console.log(
      `[${new Date().toISOString()}] Response status: ${response.status}`
    );

    // Check if response is actually JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const textResponse = await response.text();
      console.error(
        `[${new Date().toISOString()}] Non-JSON response:`,
        textResponse.substring(0, 500)
      );

      // Check for Cloudflare protection
      if (
        textResponse.includes("cloudflare") ||
        textResponse.includes("cf-ray")
      ) {
        throw new Error(
          "Cloudflare protection detected. Try using VPS with Indonesian IP or wait a few minutes."
        );
      }

      if (textResponse.includes("<!DOCTYPE")) {
        throw new Error(
          "Saweria returned HTML page. User ID might be invalid."
        );
      }

      throw new Error(`API returned non-JSON response: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[${new Date().toISOString()}] Success response received`);

    if (result.data?.qr_string) {
      // Generate QR code image
      const qrImageData = await QRCode.toDataURL(result.data.qr_string, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 300,
      });

      return {
        success: true,
        data: {
          ...result.data,
          qr_image: qrImageData,
        },
      };
    } else {
      throw new Error("No QR string in response");
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check payment status
 */
async function checkPaymentStatus(donationId) {
  const API_URL_CHECK_STATUS = `https://backend.saweria.co/donations/qris/${donationId}`;

  try {
    const response = await fetch(API_URL_CHECK_STATUS, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://saweria.co",
        Referer: "https://saweria.co/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const result = await response.json();

    if (result.data) {
      return {
        success: true,
        status: result.data.qr_string ? "PENDING" : "PAID",
        data: result.data,
      };
    } else {
      throw new Error("Invalid response structure");
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check account balance
 */
async function checkAccountBalance(token) {
  const API_URL_BALANCE = "https://backend.saweria.co/donations/balance";

  try {
    const response = await fetch(API_URL_BALANCE, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Origin: "https://saweria.co",
        Referer: "https://saweria.co/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (result.data) {
      return {
        success: true,
        balance: result.data,
      };
    } else {
      throw new Error("Failed to fetch balance");
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// API Endpoints
app.post("/qris", async (req, res) => {
  const { amount, userId } = req.body;

  if (!amount || !userId) {
    return res.status(400).json({
      success: false,
      error: "Amount and userId are required",
    });
  }

  const result = await generateQRIS(amount, userId);
  res.status(result.success ? 200 : 400).json(result);
});

app.get("/status/:donationId", async (req, res) => {
  const { donationId } = req.params;
  const result = await checkPaymentStatus(donationId);
  res.status(result.success ? 200 : 400).json(result);
});

app.get("/balance", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: "Token is required",
    });
  }

  const result = await checkAccountBalance(token);
  res.status(result.success ? 200 : 400).json(result);
});

// Start server
app.listen(port, host, () => {
  console.log(`\n🚀 Saweria API service running!`);
  console.log(`📍 Host: ${host}:${port}`);
  console.log(`🌐 Access: http://localhost:${port}`);
  console.log(`🌐 Network: http://[YOUR_SERVER_IP]:${port}`);
  console.log(`\n📋 API Endpoints:`);
  console.log(`   GET  /        - Health check`);
  console.log(`   POST /qris    - Generate QRIS`);
  console.log(`   GET  /status/:id - Check status`);
  console.log(`   GET  /balance - Check balance`);
  console.log(`\n⚡ Ready to accept connections!\n`);
});

export default app;
