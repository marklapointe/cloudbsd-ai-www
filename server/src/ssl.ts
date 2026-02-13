import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import config from './config.ts';

export function ensureCertificates() {
  if (!config.ssl.enabled) return null;

  const certPath = config.ssl.certPath || '/usr/local/etc/cloudbsd/admin-panel/ssl/cert.pem';
  const keyPath = config.ssl.keyPath || '/usr/local/etc/cloudbsd/admin-panel/ssl/key.pem';

  // Check for certbot certificates (common paths)
  const certbotCert = `/usr/local/etc/letsencrypt/live/${config.servername}/fullchain.pem`;
  const certbotKey = `/usr/local/etc/letsencrypt/live/${config.servername}/privkey.pem`;

  if (fs.existsSync(certbotCert) && fs.existsSync(certbotKey)) {
    console.log('Using Certbot certificates found at:', certbotCert);
    return {
      cert: fs.readFileSync(certbotCert),
      key: fs.readFileSync(certbotKey)
    };
  }

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log('Using certificates found at:', certPath);
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
  }

  console.log('Certificates not found. Generating self-signed certificates...');
  
  const pki = forge.pki;
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [
    { name: 'commonName', value: config.servername },
    { name: 'countryName', value: 'US' },
    { shortName: 'ST', value: 'Virginia' },
    { name: 'localityName', value: 'Blacksburg' },
    { name: 'organizationName', value: 'CloudBSD' },
    { shortName: 'OU', value: 'Admin' }
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey);

  const pemCert = pki.certificateToPem(cert);
  const pemKey = pki.privateKeyToPem(keys.privateKey);

  // Ensure directory exists
  const certDir = path.dirname(certPath);
  if (!fs.existsSync(certDir)) {
    try {
      fs.mkdirSync(certDir, { recursive: true });
    } catch (e) {
      console.warn(`Could not create directory ${certDir}. Storing certificates in memory only.`);
      return { cert: pemCert, key: pemKey };
    }
  }

  try {
    fs.writeFileSync(certPath, pemCert);
    fs.writeFileSync(keyPath, pemKey);
    console.log(`Self-signed certificates generated and saved to ${certPath}`);
  } catch (e) {
    console.warn(`Could not save certificates to ${certPath}. Storing in memory only.`);
  }

  return { cert: pemCert, key: pemKey };
}
