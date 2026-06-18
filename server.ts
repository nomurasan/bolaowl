import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 receipt uploads (standard is 100kb, receipts can be larger)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Lazy initializer for Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Secure Admin Login API route
app.post("/api/admin-login", (req, res) => {
  const { password } = req.body;
  const securePassword = process.env.ADMIN_PASSWORD || "wl2026";
  
  if (password === securePassword) {
    return res.json({ success: true, token: "wl2026_valid" });
  } else {
    return res.status(401).json({ success: false, error: "Senha incorreta!" });
  }
});


// API receipt verification route
app.post("/api/verify-receipt", async (req, res) => {
  const { imageBase64, mimeType, expectedRecipient, expectedAmount } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ isValid: false, reason: "A imagem do comprovante não foi enviada." });
  }

  try {
    const ai = getGeminiClient();

    // Setup the structured response schema
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        isSuccessfulPixReceipt: {
          type: Type.BOOLEAN,
          description: "True se for um comprovante válido, autêntico e bem-sucedido de transferência/pagamento via PIX ou boleto correspondente no Brasil. False se for outra imagem ou transação falhada/rejeitada."
        },
        amount: {
          type: Type.NUMBER,
          description: "O valor da transação extraído do comprovante (ex: 10.00)."
        },
        beneficiaryName: {
          type: Type.STRING,
          description: "O nome do beneficiário/favorecido/recebedor da transferência PIX."
        },
        date: {
          type: Type.STRING,
          description: "A data e hora do pagamento ou da transferência PIX."
        },
        txId: {
          type: Type.STRING,
          description: "Código da transação ID, ID fim-a-fim ou ID do PIX se estiver visível no comprovante."
        },
        reason: {
          type: Type.STRING,
          description: "Justificativa curta em português sobre a validação, apontando incompatibilidades encontradas."
        }
      },
      required: ["isSuccessfulPixReceipt", "amount", "beneficiaryName", "reason"]
    };

    const promptText = `Analise este comprovante de pagamento ou transferência PIX do Brasil. Extraia o valor pago, o nome do recebedor (beneficiário/favorecido), a data e o ID da transação. Verifique se o pagamento foi confirmado e concluído com sucesso. Retorne as informações seguindo a estrutura JSON especificada.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: imageBase64,
          }
        },
        {
          text: promptText
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ isValid: false, reason: "Gemini não retornou dados para a análise." });
    }

    const result = JSON.parse(text);

    const { isSuccessfulPixReceipt, amount, beneficiaryName, reason, date, txId } = result;

    if (!isSuccessfulPixReceipt) {
      return res.json({
        isValid: false,
        reason: `A imagem enviada não parece ser um comprovante de PIX concluído com sucesso. Motivo: ${reason}`
      });
    }

    // Compare values
    const expectedValValue = expectedAmount ? parseFloat(expectedAmount) : 10.00;
    
    // Check amount allowing slight parsing tolerance (e.g. 10 instead of 10.00)
    const isAmountValid = Math.abs((amount || 0) - expectedValValue) < 0.05;

    if (!isAmountValid) {
      return res.json({
        isValid: false,
        reason: `Divergência no valor. O comprovante indica R$ ${amount || "não identificado"}, mas o valor esperado é R$ ${expectedValValue.toFixed(2).replace(".", ",")}.`
      });
    }

    // Compare beneficiary / recipient name
    const normBeneficiary = (beneficiaryName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // If expectedRecipient is like "Glaucia Leles - Banco Itaú", let's extract keywords "glaucia" or "leles" to check
    const expectedKeywords = (expectedRecipient || "Glaucia Leles")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\s+/);
    
    // We want to see if the beneficiaryName matches any prominent keyword like "glaucia" or "leles" or "glaucia leles"
    const isBeneficiaryValid = expectedKeywords.some(keyword => {
      // ignore short keywords like "de", "da", "do", "e", "-"
      if (keyword.length < 3) return false;
      return normBeneficiary.includes(keyword);
    }) || normBeneficiary.includes("glaucia") || normBeneficiary.includes("leles");

    if (!isBeneficiaryValid) {
      return res.json({
        isValid: false,
        reason: `Favorecido inválido. O comprovante indica uma transferência para "${beneficiaryName || 'desconhecido'}", mas o esperado é "${expectedRecipient}".`
      });
    }

    // All checks passed!
    return res.json({
      isValid: true,
      info: {
        amount,
        beneficiaryName,
        date,
        txId,
        reason: "Comprovante validado com sucesso! " + reason
      }
    });

  } catch (err: any) {
    console.error("Erro completo na validação do comprovante:", err);
    return res.status(500).json({
      isValid: false,
      reason: `Não foi possível processar o comprovante (Imagem ou PDF). Detalhes do modelo: ${err.message || err}`
    });
  }
});

// Setup Vite or Static File Delivery
async function setupWebServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

setupWebServer();
