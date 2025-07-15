import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import QRCode from "qrcode";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Add CORS middleware for Vercel
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
    endpoints: {
      "POST /qris": "Generate QRIS payment",
      "GET /status/:donationId": "Check payment status",
      "GET /balance": "Check account balance",
    },
  });
});

/**
 * Generate QRIS payment
 * @param {number} amount - Donation amount in IDR
 * @param {string} userId - Saweria user ID
 * @returns {object} QRIS data including QR code image
 */
async function generateQRIS(amount, userId) {
  const API_URL_QRIS = `https://backend.saweria.co/donations/${userId}`;

  try {
    const response = await fetch(API_URL_QRIS, {
      method: "POST",
      headers: {
        Host: "backend.saweria.co",
        Accept: "*/*",
        "Sec-Fetch-Site": "same-site",
        Origin: "https://saweria.co",
        "Sec-Fetch-Mode": "cors",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1",
        Referer: "https://saweria.co/",
        "Sec-Fetch-Dest": "empty",
        "Accept-Language": "id-ID,id;q=0.9",
        Priority: "u=3, i",
        Connection: "keep-alive",
        "Content-Type": "application/json",
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

    const result = await response.json();
    console.log("QRIS Response:", JSON.stringify(result, null, 2));

    if (result.data?.qr_string) {
      // Generate QR code image as data URL
      const qrImageData = await QRCode.toDataURL(result.data.qr_string, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 300,
      });

      return {
        success: true,
        data: {
          ...result.data,
          qr_image: qrImageData, // Add QR code image to response
        },
      };
    } else {
      throw new Error("Failed to generate QRIS: No QR string in response");
    }
  } catch (error) {
    console.error("Error in generateQRIS:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check payment status by donation ID
 * @param {string} donationId - Donation ID to check
 * @returns {object} Payment status information
 */
async function checkPaymentStatus(donationId) {
  const API_URL_CHECK_STATUS = `https://backend.saweria.co/donations/qris/${donationId}`;

  try {
    const response = await fetch(API_URL_CHECK_STATUS, {
      method: "GET",
      headers: {
        Host: "backend.saweria.co",
        Accept: "*/*",
        "Sec-Fetch-Site": "same-site",
        Origin: "https://saweria.co",
        "Sec-Fetch-Mode": "cors",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1",
        Referer: "https://saweria.co/",
        "Sec-Fetch-Dest": "empty",
        "Accept-Language": "id-ID,id;q=0.9",
        Priority: "u=3, i",
        Connection: "keep-alive",
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();
    console.log("Status Response:", JSON.stringify(result, null, 2));

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
    console.error("Error in checkPaymentStatus:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check account balance using bearer token
 * @param {string} token - Bearer token for authentication
 * @returns {object} Balance information
 */
async function checkAccountBalance(token) {
  const API_URL_BALANCE = "https://backend.saweria.co/donations/balance";

  try {
    const response = await fetch(API_URL_BALANCE, {
      method: "GET",
      headers: {
        Host: "backend.saweria.co",
        Accept: "*/*",
        "Sec-Fetch-Site": "same-site",
        Origin: "https://saweria.co",
        "Sec-Fetch-Mode": "cors",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1",
        Referer: "https://saweria.co/",
        "Sec-Fetch-Dest": "empty",
        "Accept-Language": "id-ID,id;q=0.9",
        Priority: "u=3, i",
        Connection: "keep-alive",
        Authorization: token,
      },
    });

    const result = await response.json();
    console.log("Balance Response:", JSON.stringify(result, null, 2));

    if (result.data) {
      return {
        success: true,
        balance: result.data,
      };
    } else {
      throw new Error("Failed to fetch balance");
    }
  } catch (error) {
    console.error("Error in checkAccountBalance:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// API Endpoints

/**
 * @route POST /qris
 * @description Generate QRIS payment
 * @param {number} amount - Donation amount in IDR
 * @param {string} userId - Saweria user ID
 * @returns {object} QRIS data including QR code image
 */
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

/**
 * @route GET /status/:donationId
 * @description Check payment status by donation ID
 * @param {string} donationId - Donation ID to check
 * @returns {object} Payment status information
 */
app.get("/status/:donationId", async (req, res) => {
  const { donationId } = req.params;
  const result = await checkPaymentStatus(donationId);
  res.status(result.success ? 200 : 400).json(result);
});

/**
 * @route GET /balacne
 * @description Check Balacne With Auth Token
 * @query {string} token - its Bearer Token without (bearer)
 * @returns {object} Payment status information
 */
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
app.listen(port, () => {
  console.log(`Saweria API service running at http://localhost:${port}`);
});

// Export for Vercel
export default app;
