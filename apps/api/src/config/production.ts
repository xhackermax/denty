function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`Production configuration missing: ${name}`);return value}
function minSecret(name:string,min:number){const value=required(name);if(value.length<min)throw new Error(`${name} must contain at least ${min} characters in production`);return value}

export function assertProductionConfig(){
  if(process.env.NODE_ENV!=="production")return;
  const [major,minor]=process.versions.node.split(".").map(Number);if(major<24||(major===24&&minor<8))throw new Error("Denty production requires Node.js 24.8 or newer for built-in Argon2id");
  required("DATABASE_URL");
  minSecret("DENTY_BACKUP_KEY",32);
  minSecret("DENTY_AUDIT_HMAC_KEY",32);
  minSecret("DENTY_AUTH_PEPPER",32);
  minSecret("DENTY_VOICE_PLAN_SECRET",32);
  const attachmentKey=required("DENTY_ATTACHMENT_KEY_BASE64");
  const decoded=Buffer.from(attachmentKey,"base64");
  if(decoded.length!==32)throw new Error("DENTY_ATTACHMENT_KEY_BASE64 must decode to exactly 32 bytes");
  if(process.env.DENTY_ALLOW_TEST_ACTOR==="1")throw new Error("DENTY_ALLOW_TEST_ACTOR cannot be enabled in production");
  for(const origin of (process.env.DENTY_ALLOWED_ORIGINS??"").split(",").map(value=>value.trim()).filter(Boolean)){
    let parsed:URL;try{parsed=new URL(origin)}catch{throw new Error(`DENTY_ALLOWED_ORIGINS contains an invalid URL: ${origin}`)}
    if(parsed.protocol!=="https:")throw new Error(`DENTY_ALLOWED_ORIGINS must use https: in production: ${origin}`);
  }
  const paymentProvider=(process.env.DENTY_PAYMENT_PROVIDER??"manual").trim();
  if(paymentProvider!=="manual"){
    const checkout=required("DENTY_PAYMENT_CHECKOUT_ENDPOINT");
    let checkoutUrl:URL;try{checkoutUrl=new URL(checkout)}catch{throw new Error("DENTY_PAYMENT_CHECKOUT_ENDPOINT must be a valid URL")}
    if(checkoutUrl.protocol!=="https:")throw new Error("DENTY_PAYMENT_CHECKOUT_ENDPOINT must use https: in production");
    minSecret("DENTY_PAYMENT_WEBHOOK_SECRET",32);
    minSecret("DENTY_PAYMENT_API_KEY",16);
  }
}
