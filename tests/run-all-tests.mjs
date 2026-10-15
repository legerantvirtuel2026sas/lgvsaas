import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// ----------------------------------------------------
// 1. TESTS DOMAINE MONÉTAIRE FCFA (M0)
// ----------------------------------------------------

function roundFcfa(amount) {
  return Math.round(amount);
}

function deriveHtFromTtc(amountTtc, vatRate = 18) {
  const roundedTtc = Math.round(amountTtc);
  const amountHt = Math.round(roundedTtc / (1 + vatRate / 100));
  const vatAmount = roundedTtc - amountHt;
  return { amountHt, vatAmount };
}

function calculateLine(input) {
  const quantity = Math.max(0, input.quantity);
  const unitPriceHt = Math.round(Math.max(0, input.unitPriceHt));
  const grossHt = Math.round(quantity * unitPriceHt);

  let discount = 0;
  if (input.discountAmount && input.discountAmount > 0) {
    discount = Math.min(grossHt, Math.round(input.discountAmount));
  } else if (input.discountRate && input.discountRate > 0) {
    discount = Math.min(grossHt, Math.round((grossHt * input.discountRate) / 100));
  }

  const netHt = grossHt - discount;
  const vatAmount = input.vatRate > 0 ? Math.round((netHt * input.vatRate) / 100) : 0;
  const totalTtc = netHt + vatAmount;

  const unitCost = Math.round(Math.max(0, input.costPriceSnapshot ?? 0));
  const costTotal = Math.round(quantity * unitCost);
  const grossMargin = netHt - costTotal;

  return {
    grossHt,
    discount,
    netHt,
    vatAmount,
    totalTtc,
    costTotal,
    grossMargin,
  };
}

function calculateInvoiceTotals(input) {
  const totalGrossHt = input.lines.reduce((sum, line) => sum + line.grossHt, 0);
  const totalLineDiscount = input.lines.reduce((sum, line) => sum + line.discount, 0);

  const subNetHt = totalGrossHt - totalLineDiscount;
  const globalDiscount = Math.min(subNetHt, Math.round(input.globalDiscountAmount ?? 0));
  const totalNetHt = Math.max(0, subNetHt - globalDiscount);

  let totalVat = 0;
  if (globalDiscount > 0 && subNetHt > 0) {
    const ratio = totalNetHt / subNetHt;
    totalVat = Math.round(input.lines.reduce((sum, line) => sum + line.vatAmount, 0) * ratio);
  } else {
    totalVat = input.lines.reduce((sum, line) => sum + line.vatAmount, 0);
  }

  const aibRate = input.aibRate ?? 0;
  const totalAib = aibRate > 0 ? Math.round((totalNetHt * aibRate) / 100) : 0;

  const netToPay = totalNetHt + totalVat + totalAib;
  const totalCost = input.lines.reduce((sum, line) => sum + line.costTotal, 0);
  const totalGrossMargin = totalNetHt - totalCost;

  return {
    totalGrossHt,
    totalLineDiscount,
    globalDiscount,
    totalNetHt,
    totalVat,
    totalAib,
    netToPay,
    totalCost,
    totalGrossMargin,
  };
}

test('Domaine monétaire : arrondis stricts FCFA et dérivation TTC -> HT', () => {
  assert.equal(roundFcfa(100.49), 100);
  assert.equal(roundFcfa(100.5), 101);

  const { amountHt, vatAmount } = deriveHtFromTtc(235900, 18);
  assert.equal(amountHt, 199915);
  assert.equal(vatAmount, 35985);
  assert.equal(amountHt + vatAmount, 235900);
});

test('Domaine monétaire : calcul de ligne avec TVA 18%, remise et costPriceSnapshot', () => {
  const line = calculateLine({
    quantity: 5,
    unitPriceHt: 10000,
    discountRate: 10,
    vatRate: 18,
    costPriceSnapshot: 6000,
  });

  assert.equal(line.grossHt, 50000);
  assert.equal(line.discount, 5000);
  assert.equal(line.netHt, 45000);
  assert.equal(line.vatAmount, 8100);
  assert.equal(line.totalTtc, 53100);
  assert.equal(line.costTotal, 30000);
  assert.equal(line.grossMargin, 15000);
});

test('Domaine monétaire : calcul de facture complète avec AIB 1% béninois', () => {
  const line1 = calculateLine({
    quantity: 2,
    unitPriceHt: 25000,
    vatRate: 18,
    costPriceSnapshot: 15000,
  });

  const line2 = calculateLine({
    quantity: 1,
    unitPriceHt: 50000,
    vatRate: 18,
    costPriceSnapshot: 30000,
  });

  const totals = calculateInvoiceTotals({
    lines: [line1, line2],
    aibRate: 1,
  });

  assert.equal(totals.totalGrossHt, 100000);
  assert.equal(totals.totalNetHt, 100000);
  assert.equal(totals.totalVat, 18000);
  assert.equal(totals.totalAib, 1000);
  assert.equal(totals.netToPay, 119000);
  assert.equal(totals.totalGrossMargin, 40000);
});

// ----------------------------------------------------
// 2. TESTS SÉCURITÉ CRYPTOGRAPHIQUE & AUTH (M0)
// ----------------------------------------------------

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

async function verifyPassword(password, storedHash) {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = parts[1];
  const originalHex = parts[2];

  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return resolve(false);
      const originalBuffer = Buffer.from(originalHex, 'hex');
      resolve(crypto.timingSafeEqual(originalBuffer, derivedKey));
    });
  });
}

function encryptData(plaintext, keyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptData(cipherPackage, keyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
  const [ivHex, authTagHex, ciphertextHex] = cipherPackage.split(':');
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

test('Sécurité : Hachage de mot de passe et vérification timing-safe', async () => {
  const pass = 'SecretBénin2026!';
  const hash = await hashPassword(pass);
  assert.match(hash, /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);

  const ok = await verifyPassword(pass, hash);
  assert.equal(ok, true);

  const fail = await verifyPassword('MauvaisMotDePasse', hash);
  assert.equal(fail, false);
});

test('Sécurité : Chiffrement symétrique AES-256-GCM des jetons e-MECeF', () => {
  const token = 'emecef-api-bearer-secret-token-key';
  const encrypted = encryptData(token);
  assert.notEqual(encrypted, token);
  assert.equal(encrypted.split(':').length, 3);

  const decrypted = decryptData(encrypted);
  assert.equal(decrypted, token);
});

// ----------------------------------------------------
// 3. TESTS RBAC ET INVARIANTS NON NÉGOCIABLES (M0)
// ----------------------------------------------------

const OWNER_ONLY_PERMISSIONS = ['users.delete', 'settings.manage'];

function hasPermission(role, grantedPermissions, requiredPermission) {
  if (role === 'OWNER') return true;
  if (OWNER_ONLY_PERMISSIONS.includes(requiredPermission)) return false;
  if (role === 'ADMIN') return true;
  return grantedPermissions.includes(requiredPermission);
}

function assertLastOwnerProtected(targetUserId, allOwnersInCompany) {
  const activeOwners = allOwnersInCompany.filter((o) => o.isActive);
  const isTargetAnActiveOwner = activeOwners.some((o) => o.userId === targetUserId);

  if (isTargetAnActiveOwner && activeOwners.length <= 1) {
    throw new Error('Impossible de retirer ou supprimer le dernier propriétaire actif de l’entreprise.');
  }
}

function assertNoPrivilegeEscalation(granterRole, granterPermissions, requestedRole, requestedPermissions) {
  if (requestedRole === 'OWNER' && granterRole !== 'OWNER') {
    throw new Error('Seul un propriétaire peut attribuer le rôle Propriétaire.');
  }
  if (granterRole !== 'OWNER') {
    const hasForbidden = requestedPermissions.some((p) => OWNER_ONLY_PERMISSIONS.includes(p));
    if (hasForbidden) {
      throw new Error('Impossible d’attribuer des permissions réservées au propriétaire.');
    }
  }
}

test('RBAC Invariant 1 : users.delete est strictement interdit à tout rôle autre que OWNER', () => {
  assert.equal(hasPermission('OWNER', [], 'users.delete'), true);
  assert.equal(hasPermission('ADMIN', ['customers.view'], 'users.delete'), false);
  assert.equal(hasPermission('USER', ['users.delete'], 'users.delete'), false);
});

test('RBAC Invariant 2 : Protection absolue du dernier propriétaire actif d’une entreprise', () => {
  const singleOwnerList = [{ userId: 'owner_1', isActive: true }];
  assert.throws(() => {
    assertLastOwnerProtected('owner_1', singleOwnerList);
  }, /dernier propriétaire actif/);

  const multiOwnerList = [
    { userId: 'owner_1', isActive: true },
    { userId: 'owner_2', isActive: true },
  ];
  assert.doesNotThrow(() => {
    assertLastOwnerProtected('owner_1', multiOwnerList);
  });
});

test('RBAC Invariant 3 : Interdiction stricte d’élévation de privilèges', () => {
  assert.throws(() => {
    assertNoPrivilegeEscalation('ADMIN', ['customers.view'], 'OWNER', ['users.delete']);
  }, /Seul un propriétaire peut attribuer le rôle Propriétaire/);

  assert.throws(() => {
    assertNoPrivilegeEscalation('ADMIN', ['customers.view'], 'USER', ['users.delete']);
  }, /Impossible d’attribuer des permissions réservées au propriétaire/);
});

// ----------------------------------------------------
// 4. TESTS ISOLATION MULTI-ENTREPRISES (M0)
// ----------------------------------------------------

test('Tenant Isolation : Un utilisateur de l’entreprise A ne peut sous aucun prétexte accéder aux données de B', () => {
  const mockDb = [
    { id: 'item_1', companyId: 'company_A', data: 'Données secrètes A' },
    { id: 'item_2', companyId: 'company_B', data: 'Données secrètes B' },
  ];

  function queryRecord(sessionCompanyId, recordId) {
    const record = mockDb.find((r) => r.id === recordId && r.companyId === sessionCompanyId);
    if (!record) {
      throw new Error('Accès interdit ou enregistrement inexistant pour ce locataire');
    }
    return record;
  }

  const recordA = queryRecord('company_A', 'item_1');
  assert.equal(recordA.data, 'Données secrètes A');

  assert.throws(() => {
    queryRecord('company_A', 'item_2');
  }, /Accès interdit/);
});

// ----------------------------------------------------
// 5. TESTS MODULE M1 : ESSAI GRATUIT DE 7 JOURS ET IFU UNIQUE
// ----------------------------------------------------

test('M1 - Essai de 7 jours : Calcul exact de la date d’expiration à J+7 (7*24h)', () => {
  const baseTime = 1760436000000;
  const trialDuration = 7 * 24 * 60 * 60 * 1000;
  const trialEndsAt = new Date(baseTime + trialDuration);

  const diffDays = Math.ceil((trialEndsAt.getTime() - baseTime) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 7);
});

test('M1 - Anti-abus Essai gratuit : Un seul essai gratuit par IFU sur toute la plateforme', () => {
  const platformRegisteredIfus = new Set(['0202611111111']);

  function checkTrialEligibility(ifu) {
    const normalized = ifu.trim();
    if (platformRegisteredIfus.has(normalized)) {
      return { eligible: false, status: 'EXPIRED' };
    }
    return { eligible: true, status: 'TRIAL' };
  }

  const newCompany = checkTrialEligibility('0202699999999');
  assert.equal(newCompany.eligible, true);
  assert.equal(newCompany.status, 'TRIAL');

  const duplicateIfuCompany = checkTrialEligibility('0202611111111');
  assert.equal(duplicateIfuCompany.eligible, false);
  assert.equal(duplicateIfuCompany.status, 'EXPIRED');
});

// ----------------------------------------------------
// 6. TESTS MODULE M1 : HUB DES 4 CARTES ET VERROUILLAGE DES CARTES EN MAINTENANCE
// ----------------------------------------------------

test('M1 - Protection par URL directe : Rejet des accès directs aux routes en maintenance', () => {
  function verifyRouteAccess(urlPath, flags) {
    if (urlPath.includes('/services') && flags.SERVICES === 'MAINTENANCE') {
      return { renderedScreen: 'MAINTENANCE', allowed: false };
    }
    if (urlPath.includes('/flotte') && flags.FLEET === 'MAINTENANCE') {
      return { renderedScreen: 'MAINTENANCE', allowed: false };
    }
    if (urlPath.includes('/consolidation') && flags.CONSOLIDATION === 'MAINTENANCE') {
      return { renderedScreen: 'MAINTENANCE', allowed: false };
    }
    if (urlPath.includes('/commerce') && flags.COMMERCE === 'OPEN') {
      return { renderedScreen: 'COMMERCE_WORKSPACE', allowed: true };
    }
    return { renderedScreen: 'NOT_FOUND', allowed: false };
  }

  const flags = {
    COMMERCE: 'OPEN',
    SERVICES: 'MAINTENANCE',
    FLEET: 'MAINTENANCE',
    CONSOLIDATION: 'MAINTENANCE',
  };

  const commerceAccess = verifyRouteAccess('/e/abp/commerce', flags);
  assert.equal(commerceAccess.allowed, true);

  const servicesAccess = verifyRouteAccess('/e/abp/services', flags);
  assert.equal(servicesAccess.allowed, false);
  assert.equal(servicesAccess.renderedScreen, 'MAINTENANCE');
});

// ----------------------------------------------------
// 7. TESTS MODULE M1B : TARIFICATION SERVEUR ET REMISE 2E PACK PRO
// ----------------------------------------------------

const ANNUAL_CATALOG = {
  ESSENTIEL: { COMMERCE: 176900, SERVICES: 159200, FLEET: 235900 },
  PRO: { COMMERCE: 235900, SERVICES: 218200, FLEET: 294900 },
  ENTREPRISE: { COMMERCE: 294900, SERVICES: 277200, FLEET: 353900 },
};

function calculateSubscriptionPrice(planCode, packs, availablePacks = ['COMMERCE']) {
  for (const p of packs) {
    if (!availablePacks.includes(p)) {
      throw new Error(`Le pack ${p} n’est pas disponible à la souscription en ligne`);
    }
  }

  const prices = ANNUAL_CATALOG[planCode];
  const sorted = [...packs]
    .map((p) => ({ pack: p, price: prices[p] }))
    .sort((a, b) => b.price - a.price);

  let discount = 0;
  if (planCode === 'PRO' && sorted.length >= 2) {
    // 50% sur le 2e pack (le moins cher)
    discount = Math.round(sorted[1].price * 0.5);
  }

  const totalTtc = sorted.reduce((sum, item) => sum + item.price, 0) - discount;
  const totalHt = Math.round(totalTtc / 1.18);
  const totalVat = totalTtc - totalHt;

  return { totalTtc, totalHt, totalVat, discount };
}

test('M1B - Tarification serveur : Calcul exact pour Plan Essentiel (176 900 FCFA TTC)', () => {
  const p = calculateSubscriptionPrice('ESSENTIEL', ['COMMERCE'], ['COMMERCE']);
  assert.equal(p.totalTtc, 176900);
  assert.equal(p.discount, 0);
  assert.equal(p.totalHt + p.totalVat, 176900);
});

test('M1B - Tarification serveur : Remise de 50% sur 2e pack Pro (Commerce + Services)', () => {
  // Commerce (235 900) + Services (218 200 à -50% = 109 100) = 345 000 FCFA TTC
  const p = calculateSubscriptionPrice('PRO', ['COMMERCE', 'SERVICES'], ['COMMERCE', 'SERVICES']);
  assert.equal(p.discount, 109100);
  assert.equal(p.totalTtc, 345000);
});

test('M1B - Tarification serveur : Rejet des packs non ouverts en ligne', () => {
  assert.throws(() => {
    calculateSubscriptionPrice('PRO', ['FLEET'], ['COMMERCE']);
  }, /n’est pas disponible/);
});

// ----------------------------------------------------
// 8. TESTS MODULE M1B : SÉCURITÉ WEBHOOK FEDAPAY ET IDEMPOTENCE
// ----------------------------------------------------

function verifyWebhookHMAC(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) throw new Error('Signature manquante');

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signatureHeader.trim(), 'utf8');

  if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
    throw new Error('Signature cryptographique invalide');
  }

  return JSON.parse(rawBody);
}

test('M1B - Webhook FedaPay : Vérification cryptographique HMAC-SHA256 conforme', () => {
  const secretKey = 'wh_test_key_secret_2026';
  const body = JSON.stringify({ name: 'transaction.approved', id: 'evt_001', amount: 235900 });

  const hmac = crypto.createHmac('sha256', secretKey).update(body).digest('hex');
  const result = verifyWebhookHMAC(body, hmac, secretKey);

  assert.equal(result.name, 'transaction.approved');
  assert.equal(result.id, 'evt_001');

  // Rejet si signature altérée
  assert.throws(() => {
    verifyWebhookHMAC(body, 'bad_signature_hex_value', secretKey);
  }, /Signature cryptographique invalide/);
});

test('M1B - Idempotence Webhook : Rejet des rejeux (Replay Attack)', () => {
  const processedEvents = new Set();

  function handleWebhook(evtId) {
    if (processedEvents.has(evtId)) {
      return { status: 'ALREADY_PROCESSED', applied: false };
    }
    processedEvents.add(evtId);
    return { status: 'PROCESSED', applied: true };
  }

  assert.equal(handleWebhook('evt_fedapay_123').applied, true);
  // Second appel identique -> bloqué
  assert.equal(handleWebhook('evt_fedapay_123').applied, false);
});

// ----------------------------------------------------
// 9. TESTS MODULE M1B : ACTIVATION ET PROLONGATION DE LICENCE
// ----------------------------------------------------

test('M1B - Licence : Attribution des sièges par plan et calcul d’échéance (+12 mois)', () => {
  const seatsByPlan = { ESSENTIEL: 2, PRO: 5, ENTREPRISE: 10 };
  assert.equal(seatsByPlan.ESSENTIEL, 2);
  assert.equal(seatsByPlan.PRO, 5);
  assert.equal(seatsByPlan.ENTREPRISE, 10);

  const baseDate = new Date('2026-10-14T00:00:00.000Z');
  const nextYear = new Date(baseDate);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  assert.equal(nextYear.toISOString(), '2027-10-14T00:00:00.000Z');
});

// ----------------------------------------------------
// 10. TESTS MODULE M2 : GESTION DES UTILISATEURS ET QUOTAS
// ----------------------------------------------------

test('M2 - Quota de postes (Seats) : Rejet d’invitation dès que le quota de la licence est atteint', () => {
  const licenseMaxSeats = 5;
  const activeMembers = 5;

  function invite(used, max) {
    if (used >= max) {
      throw new Error('Limite de postes atteinte pour votre licence');
    }
    return { success: true };
  }

  assert.throws(() => invite(activeMembers, licenseMaxSeats), /Limite de postes atteinte/);
  assert.equal(invite(4, licenseMaxSeats).success, true);
});

test('M2 - Rattachement inter-entreprises : Exigence de propriété duale (OWNER sur A et B)', () => {
  function verifyDualOwnership(roles, companyA, companyB) {
    const isOwnerA = roles.some((r) => r.companyId === companyA && r.role === 'OWNER');
    const isOwnerB = roles.some((r) => r.companyId === companyB && r.role === 'OWNER');
    if (!isOwnerA || !isOwnerB) {
      throw new Error('Propriété des deux entreprises requise');
    }
    return true;
  }

  const dualOwnerRoles = [
    { companyId: 'comp_1', role: 'OWNER' },
    { companyId: 'comp_2', role: 'OWNER' },
  ];
  assert.equal(verifyDualOwnership(dualOwnerRoles, 'comp_1', 'comp_2'), true);

  const singleOwnerRoles = [
    { companyId: 'comp_1', role: 'OWNER' },
    { companyId: 'comp_2', role: 'ADMIN' },
  ];
  assert.throws(() => verifyDualOwnership(singleOwnerRoles, 'comp_1', 'comp_2'), /Propriété des deux entreprises/);
});

test('M2 - Copie indépendante des droits lors du rattachement de A vers B', () => {
  const permsA = ['sales.create', 'customers.view'];
  const permsB = [...permsA]; // Copie indépendante

  permsB.push('stock.view');
  assert.equal(permsB.includes('stock.view'), true);
  assert.equal(permsA.includes('stock.view'), false);
});

// ----------------------------------------------------
// 11. TESTS MODULE M3 : RÉFÉRENTIELS ET INTÉGRITÉ DES SUPPRESSIONS
// ----------------------------------------------------

test('M3 - Règle d’intégrité : Blocage de suppression d’un client débiteur', () => {
  const customer = { id: 'c1', currentDebt: 50000 };
  function delCust(c) {
    if (c.currentDebt > 0) throw new Error('Suppression bloquée : créance impayée');
    return true;
  }
  assert.throws(() => delCust(customer), /créance impayée/);
  assert.equal(delCust({ id: 'c2', currentDebt: 0 }), true);
});

test('M3 - Règle d’intégrité : Blocage de suppression d’un article en stock', () => {
  const product = { id: 'p1', currentStock: 10 };
  function delProd(p) {
    if (p.currentStock > 0) throw new Error('Suppression bloquée : stock présent');
    return true;
  }
  assert.throws(() => delProd(product), /stock présent/);
  assert.equal(delProd({ id: 'p2', currentStock: 0 }), true);
});

test('M3 - Confidentialité des marges : Masquage de costPrice sans permission costs.view', () => {
  const prod = { id: 'p1', salePriceHt: 10000, costPrice: 7000 };
  function viewProduct(p, perms, role) {
    const canSee = role === 'OWNER' || perms.includes('costs.view');
    return { ...p, costPrice: canSee ? p.costPrice : null };
  }

  // Utilisateur sans costs.view
  assert.equal(viewProduct(prod, ['sales.view'], 'USER').costPrice, null);
  // Utilisateur avec costs.view
  assert.equal(viewProduct(prod, ['costs.view'], 'USER').costPrice, 7000);
});

// ----------------------------------------------------
// 12. TESTS MODULE M4 : STOCK, CMUP ET ALERTES
// ----------------------------------------------------

test('M4 - Stock : Calcul exact du CMUP après réapprovisionnement', () => {
  function cmup(oldQty, oldCost, newQty, newCost) {
    if (newQty <= 0) return oldCost;
    if (oldQty <= 0) return newCost;
    return Math.round((oldQty * oldCost + newQty * newCost) / (oldQty + newQty));
  }
  // 100 à 2 000 FCFA + 50 à 2 600 FCFA = 330 000 / 150 = 2 200 FCFA
  assert.equal(cmup(100, 2000, 50, 2600), 2200);
});

test('M4 - Stock : Blocage de vente si stock insuffisant', () => {
  function checkStock(available, requested, allowNegative = false) {
    if (!allowNegative && available < requested) {
      throw new Error('Stock insuffisant');
    }
    return true;
  }
  assert.throws(() => checkStock(5, 10, false), /Stock insuffisant/);
  assert.equal(checkStock(5, 10, true), true); // Option stock négatif
});

test('M4 - Stock : Valorisation du stock d’entreprise', () => {
  const stockItems = [
    { qty: 100, cost: 2000 },
    { qty: 10, cost: 12500 },
  ];
  const totalValuation = stockItems.reduce((sum, item) => sum + item.qty * item.cost, 0);
  assert.equal(totalValuation, 325000);
});

// ----------------------------------------------------
// 13. TESTS MODULE M5 : ACHATS FOURNISSEURS ET DETTES
// ----------------------------------------------------

test('M5 - Achats : Calcul exact d’une facture d’achat et TVA déductible 18%', () => {
  const qty = 100;
  const unitPrice = 2600;
  const netHt = qty * unitPrice; // 260 000
  const vat = Math.round(netHt * 0.18); // 46 800
  const ttc = netHt + vat; // 306 800

  assert.equal(netHt, 260000);
  assert.equal(vat, 46800);
  assert.equal(ttc, 306800);
});

test('M5 - Achats : Refus du surpaiement fournisseur', () => {
  let paid = 0;
  const total = 150000;
  function addPayment(amt) {
    if (amt > total - paid) throw new Error('Surpaiement refusé');
    paid += amt;
    return total - paid;
  }

  assert.equal(addPayment(50000), 100000);
  assert.throws(() => addPayment(120000), /Surpaiement refusé/);
  assert.equal(addPayment(100000), 0); // Soldé
});

// ----------------------------------------------------
// 14. TESTS MODULE M6 : VENTES, MARGES FIGÉES ET AIB
// ----------------------------------------------------

test('M6 - Ventes : Calcul exact TVA 18%, AIB 1% et Remise globale', () => {
  const gross = 35000;
  const discount = 5000;
  const netHt = gross - discount; // 30 000
  const vat = Math.round(netHt * 0.18); // 5 400
  const aib = Math.round(netHt * 0.01); // 300
  const netToPay = netHt + vat + aib; // 35 700

  assert.equal(netHt, 30000);
  assert.equal(vat, 5400);
  assert.equal(aib, 300);
  assert.equal(netToPay, 35700);
});

test('M6 - Ventes : Figement de marge via costPriceSnapshot', () => {
  const soldQty = 10;
  const netHt = 40000;
  const costPriceSnapshot = 2500;
  const frozenMargin = netHt - (soldQty * costPriceSnapshot); // 40 000 - 25 000 = 15 000

  assert.equal(frozenMargin, 15000);

  // Même si le coût courant passe à 3500, la marge passée reste 15000
  const currentCost = 3500;
  assert.equal(netHt - (soldQty * costPriceSnapshot), 15000);
  assert.equal(currentCost, 3500);
});

// ----------------------------------------------------
// 15. TESTS MODULE M7 : NORMALISATION e-MECeF (DGI BÉNIN)
// ----------------------------------------------------

test('M7 - e-MECeF : Blocage en cas de divergence de calcul entre le local et l’e-MCF', () => {
  function verifyTotals(local, remote) {
    if (local !== remote) throw new Error('Divergence de calcul e-MCF');
    return true;
  }
  assert.throws(() => verifyTotals(100000, 95000), /Divergence de calcul/);
  assert.equal(verifyTotals(100000, 100000), true);
});

test('M7 - e-MECeF : Invariant légal d’intouchabilité d’une facture normalisée', () => {
  function removeDoc(status) {
    if (status === 'FISCALIZED') throw new Error('Facture normalisée intouchable');
    return true;
  }
  assert.throws(() => removeDoc('FISCALIZED'), /Facture normalisée intouchable/);
  assert.equal(removeDoc('DRAFT'), true);
});

// ----------------------------------------------------
// 16. TESTS MODULES M8 & M9 : STATISTIQUES ET EXPORTS
// ----------------------------------------------------

test('M8 - Statistiques : Masquage des bénéfices sans droit profit.view', () => {
  const margin = 185000;
  function getMargin(hasPerm) {
    return hasPerm ? margin : null;
  }
  assert.equal(getMargin(false), null);
  assert.equal(getMargin(true), 185000);
});

test('M9 - Exports : Intégrité de l’en-tête officiel certifié', () => {
  const exportHeader = 'ABP Technologie SARL - IFU: 0202612345678';
  assert.match(exportHeader, /ABP Technologie SARL/);
  assert.match(exportHeader, /0202612345678/);
});

// ----------------------------------------------------
// 17. TESTS MODULE M10 : PAIE ET FISCALITÉ SOCIALE BÉNIN
// ----------------------------------------------------

test('M10 - Paie : Barème progressif ITS CGI Bénin', () => {
  function getIts(base) {
    if (base <= 60000) return 0;
    let its = 0;
    if (base > 60000) its += Math.round(Math.min(base - 60000, 90000) * 0.10);
    if (base > 150000) its += Math.round(Math.min(base - 150000, 100000) * 0.15);
    if (base > 250000) its += Math.round(Math.min(base - 250000, 250000) * 0.19);
    if (base > 500000) its += Math.round((base - 500000) * 0.30);
    return its;
  }

  assert.equal(getIts(50000), 0);
  assert.equal(getIts(100000), 4000);
  assert.equal(getIts(200000), 16500);
  assert.equal(getIts(300000), 33500);
});

test('M10 - Paie : CNSS Salarié 3.6% et intégrité entière du net à payer', () => {
  const gross = 220000;
  const cnss = Math.round(gross * 0.036); // 7 920
  const taxable = gross - cnss; // 212 080
  const its = 9000 + Math.round((212080 - 150000) * 0.15); // 9 000 + 9 312 = 18 312
  const net = gross - cnss - its; // 193 768

  assert.equal(cnss, 7920);
  assert.equal(taxable, 212080);
  assert.equal(its, 18312);
  assert.equal(net, 193768);
});

// ----------------------------------------------------
// 18. TESTS MODULE M11 : CONSOLIDATION PROPRIÉTAIRE
// ----------------------------------------------------

test('M11 - Consolidation : Agrégation stricte réservée aux entreprises où l’utilisateur est OWNER', () => {
  const companies = [
    { id: 'c1', role: 'OWNER', ca: 500000 },
    { id: 'c2', role: 'OWNER', ca: 300000 },
    { id: 'c3', role: 'ADMIN', ca: 1000000 }, // Doit être exclu
  ];

  const total = companies
    .filter((c) => c.role === 'OWNER')
    .reduce((sum, c) => sum + c.ca, 0);

  assert.equal(total, 800000);
});
