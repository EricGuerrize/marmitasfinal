// ─────────────────────────────────────────────────────────────────────────────
//  setAdminClaim.mjs — dá (ou remove) a custom claim { admin: true } de uma conta.
//
//  É o que cria o "papel de admin" que as regras da Fase 1 usam. Custom claims só
//  podem ser setadas pelo Admin SDK (privilegiado), nunca pelo app no navegador.
//
//  PRÉ-REQUISITOS
//    1. npm install --save-dev firebase-admin
//    2. Baixar a chave de service account do Firebase Console:
//         Configurações do projeto ▸ Contas de serviço ▸ Gerar nova chave privada
//       Salvar o arquivo como  security-upgrade/serviceAccountKey.json
//       (já está no .gitignore — NUNCA suba essa chave pro Git.)
//
//  USO
//    Dar admin (conta padrão = CNPJ do admin com email sintético):
//      node security-upgrade/setAdminClaim.mjs
//
//    Dar admin pra um email específico (se o admin usa email real):
//      node security-upgrade/setAdminClaim.mjs admin@suaempresa.com
//
//    Remover admin (rollback):
//      node security-upgrade/setAdminClaim.mjs 05336475000177@fitinbox.local --remove
// ─────────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';

// CNPJ do admin do projeto (visto em firebaseAuthService.js). O email sintético
// segue o padrão `${cnpj}@fitinbox.local` usado no login por CNPJ.
const ADMIN_CNPJ = '05336475000177';
const DEFAULT_ADMIN_EMAIL = `${ADMIN_CNPJ}@fitinbox.local`;

const args = process.argv.slice(2);
const remove = args.includes('--remove');
const email = args.find((a) => !a.startsWith('--')) || DEFAULT_ADMIN_EMAIL;

async function main() {
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(
      await readFile(new URL('./serviceAccountKey.json', import.meta.url))
    );
  } catch {
    console.error(
      '❌ Não encontrei security-upgrade/serviceAccountKey.json.\n' +
      '   Baixe a chave no Firebase Console (Contas de serviço ▸ Gerar nova chave privada)\n' +
      '   e salve com esse nome dentro de security-upgrade/.'
    );
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  try {
    const user = await admin.auth().getUserByEmail(email);
    const claims = remove ? { admin: null } : { admin: true };

    await admin.auth().setCustomUserClaims(user.uid, claims);

    const refreshed = await admin.auth().getUser(user.uid);
    console.log(
      `✅ Claim ${remove ? 'REMOVIDA' : 'admin=true SETADA'} para ${email}\n` +
      `   uid: ${user.uid}\n` +
      `   claims atuais: ${JSON.stringify(refreshed.customClaims || {})}\n\n` +
      '⚠️  A conta admin precisa SAIR e LOGAR de novo para o token pegar a claim.'
    );
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.error(
        `❌ Nenhuma conta com o email ${email}.\n` +
        '   Confira o email de login do admin e passe como argumento:\n' +
        '     node security-upgrade/setAdminClaim.mjs EMAIL_DO_ADMIN'
      );
    } else {
      console.error('❌ Erro:', e.message);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
