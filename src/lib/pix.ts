function cleanString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9 ]/g, "") // Keep only alphanumeric and spaces
    .substring(0, 25);
}

export function generatePixPayload(key: string, name: string, amount: string = "10.00", city: string = "SAO PAULO"): string {
  // 1. Normalize name and city
  const cleanName = cleanString(name).trim() || "RECEBEDOR PIX";
  const cleanCity = cleanString(city).trim() || "SAO PAULO";

  // 2. Normalize PIX key
  let cleanKey = key.trim();
  
  // If it's pure digits and length is 10 or 11, it's likely a phone key.
  // In Brazil, Bacen stores phone keys with +55 prefix.
  if (/^\d{10,11}$/.test(cleanKey)) {
    cleanKey = "+55" + cleanKey;
  } else if (/^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(cleanKey)) {
    // formatted phone format: (61) 98626-7773
    cleanKey = "+55" + cleanKey.replace(/\D/g, "");
  } else {
    // If it has formatting like CNPJ or CPF or email, clean appropriately
    if (!cleanKey.includes("@") && cleanKey.replace(/[^a-zA-Z0-9-]/g, "").length !== 36) {
      // It's not email or random uuid key, clean formatting characters
      cleanKey = cleanKey.replace(/[\s\.\-\/]/g, "");
    }
  }

  // 3. Build merchantAccountInfo (Field 26)
  const gui = "0014br.gov.bcb.pix";
  const keyTag = "01" + String(cleanKey.length).padStart(2, "0") + cleanKey;
  const merchantAccountInfoSubfields = gui + keyTag;
  const merchantAccountInfo = "26" + String(merchantAccountInfoSubfields.length).padStart(2, "0") + merchantAccountInfoSubfields;

  // 4. Other fields
  const payloadFormat = "000201";
  const initiationMethod = "010212";
  const categoryCode = "52040000";
  const currency = "5303986";
  const amountValue = parseFloat(amount.replace(",", ".")).toFixed(2);
  const amountTag = "54" + String(amountValue.length).padStart(2, "0") + amountValue;
  const country = "5802BR";
  const nameTag = "59" + String(cleanName.length).padStart(2, "0") + cleanName;
  const cityTag = "60" + String(cleanCity.length).padStart(2, "0") + cleanCity;
  const additionalData = "62090505BOLAO";

  // Assemble before CRC
  const payloadBeforeCRC = 
    payloadFormat + 
    initiationMethod + 
    merchantAccountInfo + 
    categoryCode + 
    currency + 
    amountTag + 
    country + 
    nameTag + 
    cityTag + 
    additionalData + 
    "6304";

  // Calculate standard CCITT CRC16
  let crc = 0xFFFF;
  for (let i = 0; i < payloadBeforeCRC.length; i++) {
    const charCode = payloadBeforeCRC.charCodeAt(i);
    crc ^= (charCode << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");

  return payloadBeforeCRC + crcHex;
}
