# 🔒 Fit in Box — Upgrade de Segurança (Firestore)

Este pacote conserta os dois buracos críticos das Security Rules **sem quebrar o
app**, em duas fases. Faça a Fase 1 inteira, valide no ar, e só depois a Fase 2.

> **Papéis:** eu (Claude) escrevi os arquivos. **Você** revisa, roda os scripts e
> publica as regras no Firebase Console — eu não tenho acesso ao seu projeto.

---

## O que cada buraco significa

| Buraco | Hoje | Risco | Fecha na |
|--------|------|-------|----------|
| **#1 Dump público** | `allow list: if true` em `users`/`empresas` | Qualquer um, sem login, baixa CNPJ/email/dados de todos os clientes (LGPD) | Fase 2 |
| **#2 Cliente = deus** | catch-all `if request.auth != null` | Qualquer cliente logado lê/edita/apaga TUDO (pedidos alheios, produtos, empresas) | **Fase 1** |

A causa raiz dos dois é a mesma: **não existe papel de admin**. A Fase 1 cria esse
papel (via custom claim) e é o passo de maior impacto.

---

## ✅ FASE 1 — criar o admin e travar escritas (sem mexer no app)

### Passo 1 — Instalar o Admin SDK (dev)
```bash
cd marmitasfinal
npm install --save-dev firebase-admin
```

### Passo 2 — Baixar a chave de service account
No **Firebase Console** → ⚙️ **Configurações do projeto** → **Contas de serviço**
→ **Gerar nova chave privada**. Salve o arquivo como:
```
marmitasfinal/security-upgrade/serviceAccountKey.json
```
> Já está no `.gitignore`. **Nunca** suba essa chave pro Git — ela é acesso total ao projeto.

### Passo 3 — Setar a claim de admin
```bash
node security-upgrade/setAdminClaim.mjs
```
Isso marca a conta do admin (CNPJ `05336475000177`, email `05336475000177@fitinbox.local`)
com `{ admin: true }`.

- Se o admin loga com **email real**, passe o email:
  `node security-upgrade/setAdminClaim.mjs admin@suaempresa.com`
- Saída esperada: `✅ Claim admin=true SETADA ...`

### Passo 4 — Admin sai e loga de novo
A claim só entra no token depois de um **novo login**. Faça logout/login no painel
admin. (Sem isso, o passo 5 vai bloquear as escritas do admin.)

### Passo 5 — Publicar as regras
No **Firebase Console** → **Firestore Database** → aba **Rules**, cole o conteúdo de
[`firestore.rules`](./firestore.rules).

**Antes de clicar em Publicar**, use o botão **Simular** (Rules Playground) e teste:

| Cenário | Location | Auth | Operação | Esperado |
|---------|----------|------|----------|----------|
| Cliente edita produto | `/produtos/x` | logado, **sem** claim admin | `update` | ❌ Negado |
| Admin edita produto | `/produtos/x` | logado, claim `admin:true` | `update` | ✅ Permitido |
| Cliente cria pedido | `/pedidos/x` | logado | `create` | ✅ Permitido |
| Cliente apaga pedido | `/pedidos/x` | logado sem claim | `delete` | ❌ Negado |
| Ler cardápio deslogado | `/produtos/x` | não autenticado | `get` | ✅ Permitido |

Se tudo bater, **Publicar**.

### Passo 6 — Testar no app real (o teste que importa)
- [ ] Login de empresa por CNPJ funciona
- [ ] Reset de senha funciona
- [ ] Checkout completo cria o pedido
- [ ] Painel admin abre, lista pedidos e empresas
- [ ] Admin muda status de pedido e edita produto
- [ ] (Cliente comum) não consegue editar produto pelo DevTools

### 🔙 Rollback da Fase 1
1. Republicar as regras antigas (guarde uma cópia antes de trocar!).
2. Remover a claim: `node security-upgrade/setAdminClaim.mjs --remove`

---

## 🔜 FASE 2 — fechar o dump público (Buraco #1)

Depende de mudar o código de login (por isso vem depois, com a Fase 1 já validada).
Plano — **eu escrevo quando você der o ok**:

1. Criar coleção-índice `cnpj_index/{cnpj}` com só `{ email, uid }`, lida por `get`
   (nunca `list`) → o lookup pré-login para de precisar de `list: if true`.
2. Ajustar `firebaseAuthService.js` (login, signup, reset) pra usar o índice.
3. Script de backfill pra popular o índice a partir dos users/empresas atuais.
4. Regras finais: remover `list: if true` de `users`/`empresas` e isolar `pedidos`
   por dono.

---

## Resumo dos arquivos
| Arquivo | O quê |
|---------|-------|
| `firestore.rules` | Regras da Fase 1 (colar no Console) |
| `setAdminClaim.mjs` | Script que cria/remove o papel de admin |
| `serviceAccountKey.json` | **Você baixa** (não versionar) |
| `README.md` | Este guia |
