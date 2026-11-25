# Inscritos — gestão de pessoas inscritas

App web para controlar quem você já conversou, o interesse de cada pessoa, os pacotes escolhidos e os lembretes pelo WhatsApp.

**Stack:** React 19 + Vite, Tailwind CSS 4, Firebase (Authentication + Cloud Firestore + Hosting + App Check), Motion para animações.

## O que o app faz

- **Cadastro de pessoas**: só o nome é obrigatório (o app sugere colocar o sobrenome). Data de nascimento, WhatsApp e observações são opcionais. O WhatsApp aceita qualquer DDD do Brasil, celular ou fixo, e avisa se o número já está cadastrado.
- **CRUD completo**: criar, ver, editar e excluir. A lista fica em ordem alfabética, separada por letra.
- **Status**: *Interessada* (mostra o pacote escolhido, que passa a ser obrigatório), *Comunicada* e *Sem interesse*.
- **Dias no status**: cada pessoa mostra há quantos dias está no status atual. A cor esquenta com o tempo (verde até 2 dias, âmbar de 3 a 6, laranja a partir de 7).
- **Observações prontas** para quem está *Comunicada* (ex.: "Ainda não foi devidamente comunicada"), que aparecem como etiqueta na lista e no painel.
- **Lembrete no WhatsApp** para quem está *Comunicada* e tem número: mensagem editável com `{nome}` e `{dias}`, prévia no estilo do WhatsApp e abertura direta pelo link oficial `wa.me`. O app conta quantos lembretes foram enviados e quando foi o último.
- **Planos**: cadastro de pacotes com valor e forma de cobrança (mensal, trimestral, semestral, anual ou único), opção de deixar indisponível sem apagar e quantas pessoas escolheram cada um.
- **Painel**: fila de quem espera retorno (mais antigos primeiro), situação geral dos cadastros, valores em negociação por período e aniversariantes do mês.
- Busca sem acento por nome ou número, filtros por status, atalho de teclado **N** para nova pessoa, layout de celular com barra inferior e gaveta deslizável.

## Rodando

```bash
npm install
npm run dev
```

Sem o `.env.local` preenchido o app abre em **modo demonstração**, com dados de exemplo salvos só no navegador. Serve para conhecer a interface antes de configurar o Firebase.

## Ligando o Firebase

1. Crie um projeto em <https://console.firebase.google.com> e adicione um **app Web**.
2. Copie `.env.example` para `.env.local` e cole os valores do app.
3. **Authentication**: ative *E-mail/senha* e *Google*.
   - Para que só você (e quem você cadastrar) use o sistema: depois de criar suas contas, vá em *Authentication > Configurações > Ações do usuário* e desmarque **Permitir criação (cadastro)**. Novas contas passam a ser recusadas pelo próprio Firebase.
   - Em *Domínios autorizados*, deixe apenas `localhost` e o seu domínio.
4. **Firestore**: crie o banco no modo de produção, na região `southamerica-east1` (São Paulo).
5. **App Check** (recomendado): registre o app Web com reCAPTCHA v3, coloque a chave do site em `VITE_RECAPTCHA_SITE_KEY` e, depois de testar, ative a *aplicação obrigatória* (enforce) para o Firestore.
6. Publique regras e site:

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc   # e troque pelo ID do seu projeto
npm run deploy
```

## Segurança: o caminho do dado

| Etapa | Proteção |
|---|---|
| **Digitação** | Cada campo passa por sanitização (remove caracteres invisíveis, de controle e `< > { }`) e por validação com zod: nome com letras, data real entre 1900 e hoje (se preenchida), telefone com DDD brasileiro válido (se preenchido). |
| **Antes de enviar** | A camada `src/lib/repo.js` valida de novo. Nenhum componente consegue gravar dado cru no banco. |
| **Transporte** | Todo tráfego com o Firebase é HTTPS/TLS. O Hosting envia HSTS, CSP restritiva (sem scripts de terceiros fora do Google), `X-Frame-Options: DENY`, `nosniff` e `Referrer-Policy`. |
| **Origem** | App Check com reCAPTCHA v3 faz o Firebase aceitar só chamadas vindas do seu site. |
| **Identidade** | Firebase Authentication com e-mail verificado ou Google. Sem verificação, as regras não liberam nada. |
| **Banco (servidor)** | `firestore.rules` valida tudo de novo no servidor: dono dos dados, campos permitidos, tipos, tamanhos, formatos, status válidos, plano existente, datas vindas do relógio do servidor (ninguém consegue forjar os dias no status) e contador de lembretes que só sobe de 1 em 1. Qualquer caminho não listado é negado. |
| **Repouso** | O Firestore criptografa os dados em disco (AES-256) automaticamente. O app usa cache só em memória, então nada dos clientes fica gravado no aparelho depois de fechar a aba. |
| **Exibição** | React escapa todo texto exibido. O app não usa `dangerouslySetInnerHTML`. |
| **Build** | Sem sourcemaps em produção. Fontes servidas pelo próprio site (nenhum CDN externo). |

A configuração do Firebase no `.env` (apiKey etc.) **não é segredo**: ela identifica o projeto e é pública por natureza. Quem protege os dados são as regras, a autenticação e o App Check.

### Testando as regras

Com Java e `firebase-tools` instalados:

```bash
npm run test:regras
```

Os testes em `tests/regras.test.mjs` conferem que um visitante e outra conta não leem nada, que HTML, campos extras e datas forjadas são recusados e que o contador de lembretes não pula.

## Estrutura

```
src/
  lib/
    firebase.js      inicialização, App Check, modo demonstração
    validation.js    sanitização, máscaras e schemas zod
    repo.js          leitura em tempo real e gravações (única porta para o banco)
    demoStore.js     armazenamento local do modo demonstração
    format.js        datas, moeda, dias no status
  context/           sessão (AuthContext) e dados em tempo real (DataContext)
  components/        gavetas, janelas, formulários, lembrete, layout
  pages/             Entrar, Painel, Pessoas, Planos
firestore.rules      regras de segurança do banco
firebase.json        hosting com cabeçalhos de segurança
```

## Estrutura dos dados

```
usuarios/{uid}/pessoas/{id}
  nomeCompleto, dataNascimento (AAAA-MM-DD ou vazio), whatsapp (55 + DDD + número, ou vazio),
  status (interessada | comunicada | sem_interesse), planoId,
  observacoes, statusAlteradoEm, lembretes, ultimoLembreteEm, criadoEm, atualizadoEm

usuarios/{uid}/planos/{id}
  nome, valor, periodicidade, descricao, ativo, criadoEm, atualizadoEm
```
